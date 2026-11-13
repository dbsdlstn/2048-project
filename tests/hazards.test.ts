import { describe, expect, it } from 'vitest';
import {
  NO_HAZARDS,
  countStones,
  hazardsPresent,
  rollHazards,
  stateFromGrid,
  type GridCell,
} from '../src/core';
import { flat, gridWithoutSpawns, ofType, turnOn } from './helpers';

const S: GridCell = { kind: 'stone' };
const P: GridCell = { kind: 'prism' };
const E = 0;
const row = (...cells: GridCell[]): GridCell[] => cells;
const empty = (): GridCell[] => [E, E, E, E];

describe('stone', () => {
  it('slides like any tile', () => {
    const out = turnOn([row(S, E, E, E), empty(), empty(), empty()], 'right');
    expect(gridWithoutSpawns(out)[0]).toEqual([0, 0, 0, -1]);
  });

  it('never merges, not even with another stone', () => {
    const out = turnOn([row(E, S, E, S), row(E, 2, E, E), empty(), empty()], 'left');
    expect(gridWithoutSpawns(out)[0]).toEqual([-1, -1, 0, 0]);
    expect(
      ofType(
        out.phases.flatMap((p) => p.events),
        'merge',
      ),
    ).toHaveLength(0);
  });

  it('breaks when a merge lands orthogonally next to it, in the resolve phase', () => {
    // [2, 2, S, _] left: merge at (0,0), the stone slides to (0,1) and breaks.
    const out = turnOn([row(2, 2, S, E), empty(), empty(), empty()], 'left');
    expect(out.phases.map((p) => p.kind).slice(0, 2)).toEqual(['slide', 'resolve']);
    const destroys = ofType(out.phases[1]?.events ?? [], 'destroy');
    expect(destroys).toEqual([
      { type: 'destroy', tileId: 3, at: { row: 0, col: 1 }, cause: 'merge' },
    ]);
    expect(out.stats.stonesBroken).toBe(1);
    expect(countStones(out.board)).toBe(0);
  });

  it('is not broken by a merge on a diagonal', () => {
    // Merge at (0,3); the stone at (1,2) is held in place by the 4 next to it.
    const out = turnOn([row(E, E, 2, 2), row(E, E, S, 4), empty(), empty()], 'right');
    expect(out.stats.stonesBroken).toBe(0);
  });

  it('breaks once even when two merges touch it', () => {
    const out = turnOn([row(2, 2, E, E), row(S, E, E, E), row(4, 4, E, E), empty()], 'left');
    expect(out.stats.stonesBroken).toBe(1);
    expect(ofType(flat(out.phases), 'destroy')).toHaveLength(1);
  });
});

describe('ice', () => {
  it('a frozen tile stays in place', () => {
    const out = turnOn([row(E, { value: 2, frozen: 2 }, E, E), empty(), empty(), empty()], 'left');
    expect(out.board.cells[1]?.value).toBe(2);
  });

  it('blocks the line like a wall', () => {
    const out = turnOn([row(E, { value: 4, frozen: 2 }, E, 2), empty(), empty(), empty()], 'left');
    expect(gridWithoutSpawns(out)[0]).toEqual([0, 4, 2, 0]);
  });

  it('a matching tile can slide into it and merge; the result is not frozen (the ice breaks)', () => {
    const out = turnOn([row(E, { value: 2, frozen: 2 }, E, 2), empty(), empty(), empty()], 'left');
    const merge = ofType(flat(out.phases), 'merge')[0];
    expect(merge?.to).toEqual({ row: 0, col: 1 });
    expect(merge?.from[0]).toEqual({ row: 0, col: 1 });
    expect(out.board.cells[1]?.value).toBe(4);
    expect(out.board.cells[1]?.status.frozenTurns).toBe(0);
  });

  it('counts down once per move (thaw events in the end phase) until it is free', () => {
    const board = stateFromGrid([
      row(E, { value: 2, frozen: 2 }, E, E),
      row(E, E, E, 4),
      empty(),
      empty(),
    ]);
    const id = board.cells[1]?.id;
    const first = turnOn(board, 'left');
    const thaw = ofType(first.phases.at(-1)?.events ?? [], 'statusChange');
    expect(first.phases.at(-1)?.kind).toBe('end');
    expect(thaw).toEqual([
      {
        type: 'statusChange',
        tileId: id,
        at: { row: 0, col: 1 },
        status: { frozenTurns: 1, cursed: false },
        cause: 'thaw',
      },
    ]);
    const second = turnOn(first.board, 'right');
    const tile = second.board.cells.find((t) => t?.id === id);
    expect(tile?.status.frozenTurns).toBe(0);
    expect(second.board.cells[1]?.id).toBe(id);
  });

  it('ice applied during a turn is not ticked in that same turn', () => {
    const out = turnOn([row(2, E, E, E), empty(), empty(), empty()], 'right', {
      hazards: { ...NO_HAZARDS, iceChance: 1, iceTurns: 3 },
    });
    const frozen = out.board.cells.filter((t) => t && t.status.frozenTurns > 0);
    expect(frozen).toHaveLength(1);
    expect(frozen[0]?.status.frozenTurns).toBe(3);
  });
});

describe('curse', () => {
  it('a cursed merge yields half the normal result and half the score', () => {
    const out = turnOn(
      [row({ value: 8, cursed: true }, 8, E, E), empty(), empty(), empty()],
      'left',
    );
    const merge = ofType(flat(out.phases), 'merge')[0];
    expect(merge?.value).toBe(8);
    expect(merge?.scoreGained).toBe(8);
    expect(merge?.cursed).toBe(true);
  });

  it('the curse is consumed: the result is clean', () => {
    const out = turnOn(
      [row({ value: 8, cursed: true }, 8, E, E), empty(), empty(), empty()],
      'left',
    );
    expect(out.board.cells[0]?.status.cursed).toBe(false);
  });

  it('a cursed tile that does not merge keeps its curse', () => {
    const out = turnOn(
      [row(E, { value: 8, cursed: true }, E, E), empty(), empty(), empty()],
      'left',
    );
    expect(out.board.cells[0]?.status.cursed).toBe(true);
  });
});

describe('prism', () => {
  it('merges with any number and doubles it', () => {
    const out = turnOn([row(P, 16, E, E), empty(), empty(), empty()], 'left');
    expect(out.board.cells[0]?.value).toBe(32);
    expect(out.board.cells[0]?.kind).toBe('number');
  });

  it('does not merge with another prism or a stone', () => {
    const out = turnOn([row(P, P, S, E), empty(), empty(), empty()], 'right');
    expect(ofType(flat(out.phases), 'merge')).toHaveLength(0);
  });
});

describe('hazard rolls', () => {
  const board = stateFromGrid([row(2, 4, E, E), empty(), empty(), empty()]);

  it('nothing happens with all chances at 0', () => {
    const out = rollHazards(board, NO_HAZARDS);
    expect(out.events).toEqual([]);
    expect(out.state.cells).toEqual(board.cells);
  });

  it('chances of 1 place a stone, freeze a number tile and curse a number tile', () => {
    const out = rollHazards(board, {
      startStones: 0,
      stoneChance: 1,
      maxStones: 2,
      iceChance: 1,
      iceTurns: 2,
      curseChance: 1,
    });
    expect(countStones(out.state)).toBe(1);
    const statuses = ofType(out.events, 'statusChange').map((e) => e.cause);
    expect(statuses).toEqual(['ice', 'curse']);
    for (const t of out.state.cells) {
      if (t?.kind === 'stone') expect(t.status).toEqual({ frozenTurns: 0, cursed: false });
    }
  });

  it('respects the stone cap', () => {
    const capped = stateFromGrid([row(S, S, E, E), empty(), empty(), empty()]);
    const out = rollHazards(capped, { ...NO_HAZARDS, stoneChance: 1, maxStones: 2 });
    expect(countStones(out.state)).toBe(2);
  });

  it('always rolls its three chances, whatever the board', () => {
    const full = stateFromGrid([
      row(2, 4, 8, 16),
      row(32, 64, 2, 4),
      row(8, 16, 32, 64),
      row(2, 4, 8, 16),
    ]);
    const params = { ...NO_HAZARDS, stoneChance: 0.5, maxStones: 4 };
    // Neither board can take a stone here (one is full, the other gets a zero cap)...
    const a = rollHazards(full, params);
    const b = rollHazards(board, { ...params, maxStones: 0 });
    // ...so both advanced their streams by exactly the three chance rolls.
    expect(a.state.rng).toEqual(b.state.rng);
    expect(a.state.rng).not.toEqual(board.rng);
  });

  it('hazardsPresent lists what a parameter set can produce', () => {
    expect(hazardsPresent(NO_HAZARDS)).toEqual([]);
    expect(hazardsPresent({ ...NO_HAZARDS, startStones: 1, curseChance: 0.1 })).toEqual([
      'stone',
      'curse',
    ]);
  });
});
