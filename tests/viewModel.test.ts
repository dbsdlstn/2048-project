import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS,
  listTiles,
  move,
  newGame,
  stateFromGrid,
  type Direction,
  type GameState,
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
    view.apply(game.events, 1000);
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
    view.apply(result.events, 0);

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
    view.apply(result.events, 0);

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
    view.apply(result.events, 0);
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
    view.apply(first.events, 0);
    let now = 0;
    for (let i = 0; i < 400 && !state.over; i++) {
      const result = move(state, DIRECTIONS[(i * 7) % 4] as Direction);
      if (!result.moved) continue;
      // Alternate between waiting for animations and interrupting them early.
      now += i % 3 === 0 ? 1000 : 15;
      view.apply(result.events, now);
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
    view.apply(game.events, 0);
    view.finish();
    expect(view.isAnimating(0)).toBe(false);
    expect(view.frame(0).every((f) => f.scale === 1)).toBe(true);
  });

  it('throws on an event for an unknown tile (the renderer then resyncs)', () => {
    const view = new BoardView(4);
    expect(() => {
      view.apply(
        [{ type: 'move', tileId: 99, from: { row: 0, col: 0 }, to: { row: 0, col: 1 } }],
        0,
      );
    }).toThrow(/unknown tile 99/);
  });
});
