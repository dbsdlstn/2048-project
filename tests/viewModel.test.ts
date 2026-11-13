import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS,
  RELIC_IDS,
  listTiles,
  move,
  newGame,
  playTurn,
  runDirections,
  runMove,
  startRun,
  stateFromGrid,
  chooseRelic,
  NO_HAZARDS,
  createBossState,
  type Direction,
  type GameState,
  type TileKind,
  type TileStatus,
} from '../src/core';
import { BoardView, DEFAULT_TIMINGS, type SpriteFrame } from '../src/render';

const T = DEFAULT_TIMINGS;

/** Settled view as id -> {row, col, value}, comparable with the core state. */
function settled(
  view: BoardView,
  now: number,
): Map<number, { row: number; col: number; value: number }> {
  return new Map(view.frame(now).map((f) => [f.id, { row: f.row, col: f.col, value: f.value }]));
}

function expected(state: GameState): Map<number, { row: number; col: number; value: number }> {
  return new Map(listTiles(state).map(({ tile, pos }) => [tile.id, { ...pos, value: tile.value }]));
}

function byId(frames: SpriteFrame[], id: number): SpriteFrame | undefined {
  return frames.find((f) => f.id === id);
}

describe('BoardView', () => {
  it('a new game spawns tiles that scale in from 0', () => {
    const game = newGame({ seed: 'view' });
    const view = new BoardView(4);
    view.apply(game.phases, 1000);
    const atStart = view.frame(1000);
    expect(atStart).toHaveLength(2);
    expect(atStart.every((f) => f.scale === 0)).toBe(true);
    expect(view.isAnimating(1000)).toBe(true);
    view.update(1000 + T.spawn);
    expect(view.isAnimating(1000 + T.spawn)).toBe(false);
    expect(settled(view, 1000 + T.spawn)).toEqual(expected(game.state));
  });

  it('slides a moving tile with easing and lands exactly on its target', () => {
    // [_, _, _, 2] -> left
    const state = stateFromGrid([
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.syncTo(state);
    const result = move(state, 'left');
    view.apply(result.phases, 0);

    const mid = byId(view.frame(T.slide / 2), 1);
    expect(mid?.row).toBe(0);
    // Ease-out: more than half the distance covered at half time.
    expect(mid?.col).toBeLessThan(1.5);
    expect(mid?.col).toBeGreaterThan(0);
    expect(byId(view.frame(T.slide), 1)?.col).toBe(0);
  });

  it('merge: sources slide and vanish, the result appears with an overshooting pop', () => {
    const state = stateFromGrid([
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.syncTo(state);
    const result = move(state, 'left');
    const merge = result.events.find((e) => e.type === 'merge');
    if (merge?.type !== 'merge') throw new Error('expected a merge');
    view.apply(result.phases, 0);

    // During the slide: both sources visible, result hidden.
    const during = view.frame(T.slide / 2);
    expect(byId(during, 1)).toBeDefined();
    expect(byId(during, 2)).toBeDefined();
    expect(byId(during, merge.resultId)).toBeUndefined();

    // After the slide: sources gone, result popping.
    view.update(T.slide);
    expect(byId(view.frame(T.slide), 1)).toBeUndefined();
    const popScales = Array.from({ length: 20 }, (_, i) => {
      const t = T.slide + (T.pop * i) / 19;
      return byId(view.frame(t), merge.resultId)?.scale ?? 0;
    });
    expect(Math.max(...popScales)).toBeGreaterThan(1);
    expect(popScales[popScales.length - 1]).toBe(1);
    expect(byId(view.frame(T.slide + 1), merge.resultId)?.popping).toBe(true);
  });

  it('spawn waits for the slide, then grows', () => {
    const state = stateFromGrid([
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.syncTo(state);
    const result = move(state, 'left');
    const spawn = result.events.find((e) => e.type === 'spawn');
    if (spawn?.type !== 'spawn') throw new Error('expected a spawn');
    view.apply(result.phases, 0);
    expect(byId(view.frame(T.slide / 2), spawn.tileId)).toBeUndefined();
    const end = T.slide + T.spawnDelay + T.spawn;
    expect(byId(view.frame(end), spawn.tileId)?.scale).toBe(1);
    expect(view.isAnimating(end - 1)).toBe(true);
    expect(view.isAnimating(end)).toBe(false);
  });

  it('stays in sync with the core over a long game, even when turns interrupt animation', () => {
    const first = newGame({ seed: 'long-view' });
    let state = first.state;
    const view = new BoardView(4);
    view.apply(first.phases, 0);
    let now = 0;
    for (let i = 0; i < 400 && !state.over; i++) {
      const result = move(state, DIRECTIONS[(i * 7) % 4] as Direction);
      if (!result.moved) continue;
      // Alternate between waiting for animations and interrupting them early.
      now += i % 3 === 0 ? 1000 : 15;
      view.apply(result.phases, now);
      state = result.state;
      view.update(now + 1000);
      expect(settled(view, now + 1000)).toEqual(expected(state));
    }
    // No leaked sprites for tiles that merged away.
    expect(view.spriteCount).toBe(listTiles(state).length);
  });

  it('finish() fast-forwards everything to the end state', () => {
    const game = newGame({ seed: 3 });
    const view = new BoardView(4);
    view.apply(game.phases, 0);
    view.finish();
    expect(view.isAnimating(0)).toBe(false);
    expect(view.frame(0).every((f) => f.scale === 1)).toBe(true);
  });

  it('throws on an event for an unknown tile (the renderer then resyncs)', () => {
    const view = new BoardView(4);
    expect(() => {
      view.apply(
        [
          {
            kind: 'slide',
            events: [
              { type: 'move', tileId: 99, from: { row: 0, col: 0 }, to: { row: 0, col: 1 } },
            ],
          },
        ],
        0,
      );
    }).toThrow(/unknown tile 99/);
  });

  it('plays phases one after another: a stone breaks only after the slide ends', () => {
    // [2, 2, S, _] left: merge, then the stone (id 3) breaks in the resolve phase.
    const board = stateFromGrid([
      [2, 2, { kind: 'stone' }, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const out = playTurn({
      board,
      direction: 'left',
      relics: [],
      rules: {
        fourChance: 0.1,
        chainDepth: 0,
        diagonalBreakFrom: null,
        moveLimitBonus: 0,
        bossPeriodBonus: 0,
      },
      hazards: NO_HAZARDS,
      boss: null,
    });
    const view = new BoardView(4);
    view.syncTo(board);
    view.apply(out.phases, 0);
    const resolveStart = T.slide + T.spawnDelay;
    // Still full size during the slide and right before the resolve phase starts.
    expect(byId(view.frame(T.slide - 1), 3)?.scale).toBe(1);
    expect(byId(view.frame(resolveStart), 3)?.scale).toBe(1);
    // Shrinking during the resolve phase, gone after it.
    expect(byId(view.frame(resolveStart + T.destroy / 2), 3)?.scale).toBeLessThan(1);
    expect(byId(view.frame(resolveStart + T.destroy), 3)).toBeUndefined();
    // The spawn waits for the resolve phase.
    const spawnStart = resolveStart + T.destroy + T.spawnDelay;
    const spawned = out.phases.find((p) => p.kind === 'spawn')?.events[0];
    if (spawned?.type !== 'spawn') throw new Error('expected a spawn');
    expect(byId(view.frame(spawnStart - 1), spawned.tileId)).toBeUndefined();
    expect(byId(view.frame(spawnStart + T.spawn), spawned.tileId)?.scale).toBe(1);
  });

  it('value and status changes take effect when their phase starts', () => {
    const board = stateFromGrid([
      [64, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const out = playTurn({
      board,
      direction: 'right',
      relics: [],
      rules: {
        fourChance: 0.1,
        chainDepth: 0,
        diagonalBreakFrom: null,
        moveLimitBonus: 0,
        bossPeriodBonus: 0,
      },
      hazards: NO_HAZARDS,
      boss: { ...createBossState('corroder'), turnsUntil: 1 },
    });
    const view = new BoardView(4);
    view.syncTo(board);
    view.apply(out.phases, 0);
    expect(byId(view.frame(T.slide), 1)?.value).toBe(64);
    expect(byId(view.frame(T.slide + T.spawnDelay), 1)?.value).toBe(32);
    view.finish();
    expect(byId(view.frame(0), 1)?.value).toBe(32);
  });

  it('a fully replayed view equals the core state on hazard, boss and relic turns', () => {
    const full = (view: BoardView, now: number) =>
      new Map(
        view
          .frame(now)
          .map((f) => [
            f.id,
            { row: f.row, col: f.col, value: f.value, kind: f.kind, status: f.status },
          ]),
      );
    const core = (state: GameState) =>
      new Map<
        number,
        { row: number; col: number; value: number; kind: TileKind; status: TileStatus }
      >(
        listTiles(state).map(({ tile, pos }) => [
          tile.id,
          { ...pos, value: tile.value, kind: tile.kind, status: tile.status },
        ]),
      );
    for (const [mode, stageIndex] of [
      ['run', 1],
      ['run', 3],
      ['run', 7],
      ['run', 11],
      ['endless', 0],
    ] as const) {
      const first = startRun(mode, `view-${mode}-${stageIndex}`, {
        stageIndex,
        relics: [...RELIC_IDS],
      });
      let run = first.run;
      const view = new BoardView(4);
      view.apply(first.phases, 0);
      let now = 0;
      for (let i = 0; i < 300; i++) {
        let step;
        if (run.status === 'offer') step = chooseRelic(run, run.offer[0] ?? null);
        else if (run.status === 'playing') {
          const dirs = runDirections(run);
          if (dirs.length === 0) break;
          step = runMove(run, dirs[(i * 5) % dirs.length] as Direction);
        } else break;
        if (!step.changed) break;
        now += i % 3 === 0 ? 2000 : 25;
        if (step.boardReplaced) view.clear();
        view.apply(step.phases, now);
        run = step.run;
        view.update(now + 2000);
        expect(full(view, now + 2000)).toEqual(core(run.board));
      }
      expect(view.spriteCount).toBe(listTiles(run.board).length);
    }
  });
});
