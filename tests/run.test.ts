import { describe, expect, it } from 'vitest';
import {
  BOSS_TUNING,
  ENDLESS_TUNING,
  RELIC_IDS,
  STAGES,
  chooseRelic,
  createBossState,
  currentStage,
  restoreStep,
  endlessHazards,
  movesLeft,
  runDirections,
  runMove,
  startRun,
  stateFromGrid,
  totalScore,
  turnsUntilBoss,
  useActive,
  type Direction,
  type GridCell,
  type RunState,
  type TurnPhaseKind,
} from '../src/core';
import { autoplay, ofType, replayPhases, snapshotTiles } from './helpers';

const E = 0;
const empty = (): GridCell[] => [E, E, E, E];
const STUCK_AFTER_RIGHT: GridCell[][] = [
  [2, 4, 2, 4],
  [4, 2, 4, 2],
  [32, 4, 2, 4],
  [8, 16, 8, E],
];

function withBoard(run: RunState, grid: GridCell[][], seed = 1): RunState {
  return { ...run, board: stateFromGrid(grid, seed) };
}

describe('run mode flow', () => {
  it('starts at stage 1 with a fresh board and nothing owned', () => {
    const step = startRun('run', 'flow');
    expect(step.boardReplaced).toBe(true);
    expect(step.phases.map((p) => p.kind)).toEqual(['spawn']);
    const run = step.run;
    expect(run.status).toBe('playing');
    expect(run.stageIndex).toBe(0);
    expect(run.relics).toEqual([]);
    expect(run.board.cells.filter(Boolean)).toHaveLength(2);
    expect(movesLeft(run)).toBe(STAGES[0]?.moveLimit);
    expect(turnsUntilBoss(run)).toBeNull();
  });

  it('clearing the goal ends the stage with an offer of 3 relics', () => {
    let run = startRun('run', 'clear').run;
    run = withBoard(run, [[2, 2, E, E], empty(), empty(), empty()]);
    run = { ...run, progress: { ...run.progress, score: 999 } };
    const step = runMove(run, 'left');
    expect(step.run.status).toBe('offer');
    expect(step.run.offer).toHaveLength(3);
    expect(ofType(step.events, 'stageCleared')).toHaveLength(1);
    expect(step.phases.at(-1)?.kind).toBe('end');
    // No more moves while choosing.
    expect(runMove(step.run, 'right').changed).toBe(false);
  });

  it('choosing a relic starts the next stage on a fresh board; the score is banked', () => {
    let run = startRun('run', 'choose').run;
    run = withBoard(run, [[2, 2, E, E], empty(), empty(), empty()]);
    run = { ...run, progress: { ...run.progress, score: 999 } };
    const offered = runMove(run, 'left').run;
    expect(chooseRelic(offered, 'delayVeil').changed).toBe(offered.offer.includes('delayVeil'));
    const pick = offered.offer[0];
    if (!pick) throw new Error('no offer');
    const next = chooseRelic(offered, pick);
    expect(next.boardReplaced).toBe(true);
    expect(next.run.stageIndex).toBe(1);
    expect(next.run.relics.map((r) => r.id)).toEqual([pick]);
    expect(next.run.progress.movesUsed).toBe(0);
    expect(next.run.bankedScore).toBe(offered.board.score);
    expect(totalScore(next.run)).toBe(offered.board.score);
    expect(currentStage(next.run)).toBe(STAGES[1]);
  });

  it('a stage can be skipped without a relic (null pick)', () => {
    let run = startRun('run', 'skip').run;
    run = withBoard(run, [[2, 2, E, E], empty(), empty(), empty()]);
    run = { ...run, progress: { ...run.progress, score: 999 } };
    const next = chooseRelic(runMove(run, 'left').run, null);
    expect(next.run.relics).toEqual([]);
    expect(next.run.stageIndex).toBe(1);
  });

  it('running out of moves fails the stage', () => {
    let run = startRun('run', 'moves').run;
    run = withBoard(run, [[2, E, E, E], empty(), empty(), empty()]);
    const limit = STAGES[0]?.moveLimit ?? 0;
    run = { ...run, progress: { ...run.progress, movesUsed: limit - 1 } };
    const step = runMove(run, 'right');
    expect(step.run.status).toBe('gameOver');
    expect(step.run.failReason).toBe('moves');
    expect(ofType(step.events, 'stageFailed')).toEqual([{ type: 'stageFailed', reason: 'moves' }]);
  });

  it('a stuck board fails the stage, unless an active relic can still rescue it', () => {
    const run = withBoard(startRun('run', 'stuck').run, STUCK_AFTER_RIGHT);
    const failed = runMove(run, 'right');
    expect(failed.run.status).toBe('gameOver');
    expect(failed.run.failReason).toBe('stuck');

    const armed = withBoard(startRun('run', 'stuck', { relics: ['bomb'] }).run, STUCK_AFTER_RIGHT);
    const rescued = runMove(armed, 'right');
    expect(rescued.run.status).toBe('playing');
    expect(runDirections(rescued.run)).toEqual([]);
    const bombed = useActive(rescued.run, 'bomb', { row: 0, col: 0 });
    expect(bombed.run.status).toBe('playing');
    expect(runDirections(bombed.run).length).toBeGreaterThan(0);
  });

  it('a sealed line alone never makes the board stuck: the seal breaks instead', () => {
    // Only (3,3) is open and column 3 is sealed: no move until the seal goes.
    let run = startRun('run', 'seal', { stageIndex: 3, relics: ['freezePin'] }).run;
    run = withBoard(run, [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, E],
    ]);
    run = {
      ...run,
      boss: { ...createBossState('warden'), lock: { axis: 'col', index: 3, turnsLeft: 2 } },
    };
    expect(runDirections(run)).toEqual([]);
    // Any action re-checks the board; here, pinning a tile.
    const step = useActive(run, 'freezePin', { row: 0, col: 0 });
    expect(step.run.boss?.lock).toBeNull();
    expect(ofType(step.events, 'lineUnlock')).toHaveLength(1);
    expect(step.run.status).toBe('playing');
    expect(runDirections(step.run).length).toBeGreaterThan(0);
  });

  it('clearing the last stage wins the run', () => {
    let run = startRun('run', 'win', { stageIndex: STAGES.length - 1 }).run;
    run = withBoard(run, [[128, 128, E, E], empty(), empty(), empty()]);
    const step = runMove(run, 'left');
    expect(step.run.status).toBe('victory');
  });

  it('boss stages expose the countdown, which matches the boss state', () => {
    const run = startRun('run', 'boss', { stageIndex: 3 }).run;
    expect(turnsUntilBoss(run)).toBe(BOSS_TUNING.warden.period);
    const after = runMove(run, runDirections(run)[0] as Direction).run;
    expect(turnsUntilBoss(after)).toBe(BOSS_TUNING.warden.period - 1);
  });
});

describe('endless mode', () => {
  it('has no move limit, no boss and no hazards at first', () => {
    const run = startRun('endless', 'e').run;
    expect(movesLeft(run)).toBeNull();
    expect(run.boss).toBeNull();
    expect(endlessHazards(0)).toMatchObject({ stoneChance: 0, iceChance: 0, curseChance: 0 });
  });

  it('hazards ramp with moves played, up to a cap', () => {
    const mid = endlessHazards(ENDLESS_TUNING.graceTurns + 100);
    expect(mid.stoneChance).toBeGreaterThan(0);
    const late = endlessHazards(100000);
    expect(late.stoneChance).toBe(ENDLESS_TUNING.stoneChanceMax);
    expect(late.curseChance).toBe(ENDLESS_TUNING.curseChanceMax);
  });

  it('offers a relic when the largest tile first reaches 64, then 128', () => {
    let run = startRun('endless', 'e2').run;
    run = withBoard(run, [[32, 32, E, E], empty(), empty(), empty()]);
    const step = runMove(run, 'left');
    expect(step.run.status).toBe('offer');
    expect(step.run.nextOfferTile).toBe(128);
    const pick = step.run.offer[0];
    if (!pick) throw new Error('no offer');
    const back = chooseRelic(step.run, pick);
    expect(back.boardReplaced).toBe(false);
    expect(back.run.status).toBe('playing');
    expect(back.run.board.cells.filter(Boolean)).toHaveLength(
      step.run.board.cells.filter(Boolean).length + (pick === 'ignition' ? 1 : 0),
    );
    // Endless never offers relics that need a move limit or a boss.
    for (const id of step.run.offer)
      expect(['spareSpring', 'debrisFuel', 'delayVeil']).not.toContain(id);
  });

  it('ends when no move is left', () => {
    const run = withBoard(startRun('endless', 'e3').run, STUCK_AFTER_RIGHT);
    const step = runMove(run, 'right');
    expect(step.run.status).toBe('gameOver');
    expect(ofType(step.events, 'gameOver')).toHaveLength(1);
  });
});

describe('undo', () => {
  it('restores the board and the random stream: replaying the same move gives the same result', () => {
    const start = startRun('run', 'undo', { relics: ['undo'] }).run;
    const dir = runDirections(start)[0] as Direction;
    const first = runMove(start, dir);
    const undone = useActive(first.run, 'undo').run;
    expect(undone.board.rng).toEqual(start.board.rng);
    const again = runMove(undone, dir);
    expect(again.run.board).toEqual(first.run.board);
    expect(again.events).toEqual(first.events);
  });

  it('is one level deep and spends its charge', () => {
    const start = startRun('run', 'undo2', { relics: ['undo'] }).run;
    const moved = runMove(start, runDirections(start)[0] as Direction).run;
    const undone = useActive(moved, 'undo').run;
    expect(undone.undo).toBeNull();
    expect(useActive(undone, 'undo').changed).toBe(false);
  });

  it('undoing a bomb gives the bomb charge back', () => {
    let run = startRun('run', 'undo3', { relics: ['undo', 'bomb'] }).run;
    run = withBoard(run, [[2, 4, E, E], empty(), empty(), empty()]);
    const bombed = useActive(run, 'bomb', { row: 0, col: 0 }).run;
    expect(bombed.relics.find((r) => r.id === 'bomb')?.charges).toBe(0);
    const undone = useActive(bombed, 'undo').run;
    expect(undone.relics.find((r) => r.id === 'bomb')?.charges).toBe(1);
    expect(undone.relics.find((r) => r.id === 'undo')?.charges).toBe(0);
    expect(undone.board.cells[0]?.value).toBe(2);
  });
});

describe('determinism and saving', () => {
  const all = RELIC_IDS.filter((id) => id !== 'undo');

  it('same seed + same inputs → same run and same events', () => {
    const a = autoplay(startRun('run', 'det', { relics: all }).run, 400);
    const b = autoplay(startRun('run', 'det', { relics: all }).run, 400);
    expect(a).toEqual(b);
    expect(autoplay(startRun('run', 'det2', { relics: all }).run, 400)).not.toEqual(a);
  });

  it('a run saved with JSON mid-stage resumes with identical future', () => {
    for (const mode of ['run', 'endless'] as const) {
      const start = startRun(mode, 'save', { relics: all, stageIndex: 3 }).run;
      const half = autoplay(start, 60);
      const saved = JSON.parse(JSON.stringify(half)) as RunState;
      expect(saved).toEqual(half);
      expect(autoplay(saved, 200, 60)).toEqual(autoplay(half, 200, 60));
    }
  });
});

describe('phases', () => {
  const ORDER: TurnPhaseKind[] = ['slide', 'resolve', 'chain', 'boss', 'spawn', 'end'];

  it('are emitted in causal order and never empty; events only touch tiles that exist', () => {
    let checked = 0;
    const seen = new Set<TurnPhaseKind>();
    for (const stageIndex of [1, 3, 7, 11]) {
      let run = startRun('run', `phases-${stageIndex}`, { stageIndex, relics: [...RELIC_IDS] }).run;
      for (let i = 0; i < 150 && run.status === 'playing'; i++) {
        const dirs = runDirections(run);
        if (dirs.length === 0) break;
        const before = snapshotTiles(run.board);
        const step = runMove(run, dirs[i % dirs.length] as Direction);
        let last = -1;
        let afterChain = false;
        for (const p of step.phases) {
          seen.add(p.kind);
          expect(p.events.length).toBeGreaterThan(0);
          const rank = ORDER.indexOf(p.kind);
          // resolve may follow a chain; chain/resolve may repeat; everything else moves forward.
          if (p.kind === 'resolve' || p.kind === 'chain') {
            expect(rank).toBeGreaterThanOrEqual(afterChain ? 1 : 0);
            if (p.kind === 'chain') afterChain = true;
          } else {
            expect(rank).toBeGreaterThan(last);
          }
          last = Math.max(last, rank);
        }
        expect(step.events).toEqual(step.phases.flatMap((p) => p.events));
        const replayed = replayPhases(before, step.phases, (m) => {
          throw new Error(m);
        });
        expect(replayed).toEqual(snapshotTiles(step.run.board));
        run = step.run;
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect([...seen].sort()).toEqual([...ORDER].sort());
  });
});

describe('restoreStep', () => {
  it('rebuilds the board (statuses included) in an empty view without changing the run', () => {
    let run = startRun('run', 'restore', { stageIndex: 2 }).run;
    run = withBoard(run, [
      [2, { kind: 'stone' }, E, E],
      [E, { value: 8, frozen: 2 }, E, E],
      [E, E, { value: 4, cursed: true }, E],
      empty(),
    ]);
    const step = restoreStep(run);
    expect(step.run).toBe(run);
    expect(step.boardReplaced).toBe(true);
    const fail = (m: string): void => {
      throw new Error(m);
    };
    expect(replayPhases(new Map(), step.phases, fail)).toEqual(snapshotTiles(run.board));
  });
});
