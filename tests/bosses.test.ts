import { describe, expect, it } from 'vitest';
import {
  BOSSES,
  BOSS_TUNING,
  bossPreview,
  countStones,
  createBossState,
  listTiles,
  lockedCells,
  shuffleBoard,
  stateFromGrid,
  type BossState,
  type Direction,
  type GameState,
  type GridCell,
} from '../src/core';
import { flat, gridWithoutSpawns, ofType, turnOn } from './helpers';

const E = 0;
const empty = (): GridCell[] => [E, E, E, E];

/** Plays `n` moves alternating left/right on a board with one free tile, returning the last output. */
function playMoves(board: GameState, boss: BossState, n: number) {
  let b = board;
  let s: BossState | null = boss;
  let out = turnOn(b, 'left', { boss: s });
  for (let i = 0; i < n; i++) {
    const dirs: Direction[] = ['left', 'right', 'up', 'down'];
    for (const d of dirs) {
      out = turnOn(b, d, { boss: s });
      if (out.moved) break;
    }
    b = out.board;
    s = out.boss;
  }
  return out;
}

describe('boss definitions', () => {
  it('every boss has a Korean name, a one-line description and a period', () => {
    for (const boss of Object.values(BOSSES)) {
      expect(boss.name.length).toBeGreaterThan(0);
      expect(boss.description).not.toContain('\n');
      expect(BOSS_TUNING[boss.id].period).toBeGreaterThan(0);
    }
  });

  it('the countdown is plain state: turnsUntil starts at the period and drops each move', () => {
    const boss = createBossState('warden');
    expect(boss.turnsUntil).toBe(BOSS_TUNING.warden.period);
    const board = stateFromGrid([[2, E, E, E], empty(), empty(), empty()]);
    const out = playMoves(board, boss, 2);
    expect(out.boss?.turnsUntil).toBe(BOSS_TUNING.warden.period - 2);
  });

  it('a period bonus delays every trigger', () => {
    expect(createBossState('chaos', 2).period).toBe(BOSS_TUNING.chaos.period + 2);
  });
});

describe('봉쇄자 (warden)', () => {
  it('fires on the move that brings the countdown to 0, in the boss phase, and locks a line', () => {
    const board = stateFromGrid([[2, E, E, E], empty(), empty(), empty()]);
    const out = turnOn(board, 'right', { boss: { ...createBossState('warden'), turnsUntil: 1 } });
    const bossPhase = out.phases.find((p) => p.kind === 'boss');
    expect(bossPhase?.events.map((e) => e.type)).toEqual(['trigger', 'lineLock']);
    expect(out.boss?.lock?.turnsLeft).toBe(BOSS_TUNING.warden.lockTurns);
    expect(out.boss?.turnsUntil).toBe(BOSS_TUNING.warden.period);
    // Order: slide → boss → spawn → end.
    const kinds = out.phases.map((p) => p.kind);
    expect(kinds.indexOf('boss')).toBeLessThan(kinds.indexOf('spawn'));
  });

  it('tiles in a sealed line do not move and nothing enters it', () => {
    const boss: BossState = {
      ...createBossState('warden'),
      lock: { axis: 'row', index: 1, turnsLeft: 2 },
    };
    const out = turnOn([[E, E, E, 2], [E, E, E, 4], empty(), [8, E, E, E]], 'left', { boss });
    const grid = gridWithoutSpawns(out);
    expect(grid[0]).toEqual([2, 0, 0, 0]);
    expect(grid[1]).toEqual([0, 0, 0, 4]);
    // Column 0 sliding up stops below the sealed cell (1,0).
    const up = turnOn([empty(), empty(), empty(), [8, E, E, E]], 'up', { boss });
    expect(gridWithoutSpawns(up)[2]?.[0]).toBe(8);
  });

  it('spawns never land in the sealed line', () => {
    const boss: BossState = {
      ...createBossState('warden'),
      lock: { axis: 'col', index: 2, turnsLeft: 2 },
    };
    const sealed = lockedCells(boss.lock, 4);
    for (let seed = 0; seed < 40; seed++) {
      const out = turnOn([[2, E, E, E], empty(), empty(), empty()], 'down', { boss, seed });
      for (const s of ofType(flat(out.phases), 'spawn')) {
        expect(sealed.has(s.at.row * 4 + s.at.col)).toBe(false);
      }
    }
  });

  it('the seal lasts its turns, then lifts with a lineUnlock in the end phase', () => {
    const boss: BossState = {
      ...createBossState('warden'),
      lock: { axis: 'row', index: 3, turnsLeft: 2 },
    };
    const board = stateFromGrid([[2, E, E, E], empty(), empty(), empty()]);
    const one = turnOn(board, 'right', { boss });
    expect(one.boss?.lock?.turnsLeft).toBe(1);
    const two = turnOn(one.board, 'left', { boss: one.boss });
    expect(two.boss?.lock).toBeNull();
    expect(ofType(two.phases.at(-1)?.events ?? [], 'lineUnlock')).toEqual([
      { type: 'lineUnlock', axis: 'row', index: 3 },
    ]);
  });
});

describe('부식자 (corroder)', () => {
  const boss = { ...createBossState('corroder'), turnsUntil: 1 };

  it('halves the largest tile, keeping its id (valueChange)', () => {
    const out = turnOn([[64, 2, E, E], [E, 4, E, E], empty(), empty()], 'down', { boss });
    const change = ofType(flat(out.phases), 'valueChange');
    expect(change).toHaveLength(1);
    expect(change[0]).toMatchObject({ from: 64, to: 32, tileId: 1 });
    expect(out.board.cells.find((t) => t?.id === 1)?.value).toBe(32);
  });

  it('on ties picks the first in row-major order, and the preview names that tile in advance', () => {
    const board = stateFromGrid([[E, E, 2, 16], [16, E, E, E], empty(), empty()]);
    expect(bossPreview(boss, board)).toEqual({ kind: 'halve', tileId: 2 });
  });

  it('does nothing to a board whose largest tile is a 2', () => {
    const out = turnOn([[2, E, E, E], empty(), empty(), empty()], 'right', { boss });
    expect(ofType(flat(out.phases), 'valueChange')).toEqual([]);
    expect(ofType(flat(out.phases), 'trigger')).toHaveLength(1);
  });
});

describe('혼돈 (chaos)', () => {
  const boss = { ...createBossState('chaos'), turnsUntil: 1 };

  it('shuffles the board and drops a stone', () => {
    const grid = [[2, 4, 8, 16], [32, E, E, E], empty(), empty()];
    const board = stateFromGrid(grid, 7);
    const out = turnOn(board, 'down', { boss });
    const bossPhase = out.phases.find((p) => p.kind === 'boss');
    expect(bossPhase?.events.map((e) => e.type)).toEqual(['trigger', 'shuffle', 'spawn']);
    expect(countStones(out.board)).toBe(BOSS_TUNING.chaos.stones);
  });

  it('a shuffle keeps every tile (same ids and values) and leaves frozen tiles in place', () => {
    const board = stateFromGrid(
      [[2, 4, { value: 8, frozen: 2 }, 16], [32, 64, E, E], empty(), [E, E, E, 128]],
      3,
    );
    const shuffled = shuffleBoard(board);
    const ids = (b: GameState) =>
      listTiles(b)
        .map((t) => `${t.tile.id}:${t.tile.value}`)
        .sort();
    expect(ids(shuffled.state)).toEqual(ids(board));
    expect(shuffled.state.cells[2]?.value).toBe(8);
    const ev = shuffled.events[0];
    expect(ev?.type).toBe('shuffle');
    if (ev?.type === 'shuffle') expect(ev.moves.every((m) => m.tileId !== 3)).toBe(true);
  });
});
