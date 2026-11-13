import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULES,
  DIRECTIONS,
  availableDirections,
  hasAvailableMoves,
  listTiles,
  move,
  newGame,
  stateFromGrid,
  toValueGrid,
  type Direction,
  type GameState,
  type TurnEvent,
} from '../src/core';

const E = 0;

/** Plays a move and returns the resulting grid with the spawned tile removed. */
function slideGrid(grid: number[][], direction: Direction): number[][] {
  const result = move(stateFromGrid(grid), direction);
  const out = toValueGrid(result.state);
  for (const e of result.events) {
    if (e.type === 'spawn') (out[e.at.row] as number[])[e.at.col] = 0;
  }
  return out;
}

/** Recursively freezes an object so any mutation throws in strict mode. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function ofType<K extends TurnEvent['type']>(
  events: readonly TurnEvent[],
  type: K,
): Extract<TurnEvent, { type: K }>[] {
  return events.filter((e): e is Extract<TurnEvent, { type: K }> => e.type === type);
}

describe('newGame', () => {
  it('starts with the configured number of tiles, all 2 or 4', () => {
    const { state, events } = newGame({ seed: 1 });
    const tiles = listTiles(state);
    expect(state.size).toBe(DEFAULT_RULES.boardSize);
    expect(tiles).toHaveLength(DEFAULT_RULES.startTiles);
    for (const { tile } of tiles) expect([2, 4]).toContain(tile.value);
    expect(ofType(events, 'spawn')).toHaveLength(DEFAULT_RULES.startTiles);
    expect(state.score).toBe(0);
    expect(state.turn).toBe(0);
    expect(state.over).toBe(false);
  });

  it('respects custom rules', () => {
    const { state } = newGame({
      seed: 1,
      rules: { boardSize: 5, startTiles: 3, fourChance: 1 },
    });
    expect(state.cells).toHaveLength(25);
    expect(listTiles(state).map((t) => t.tile.value)).toEqual([4, 4, 4]);
  });
});

describe('slide and merge', () => {
  it('slides left', () => {
    expect(
      slideGrid(
        [
          [E, E, E, 2],
          [E, 4, E, E],
          [8, E, E, E],
          [E, E, 16, 32],
        ],
        'left',
      ),
    ).toEqual([
      [2, E, E, E],
      [4, E, E, E],
      [8, E, E, E],
      [16, 32, E, E],
    ]);
  });

  it('slides right', () => {
    expect(
      slideGrid(
        [
          [2, E, E, E],
          [E, 4, 8, E],
          [E, E, E, E],
          [2, 2, E, E],
        ],
        'right',
      ),
    ).toEqual([
      [E, E, E, 2],
      [E, E, 4, 8],
      [E, E, E, E],
      [E, E, E, 4],
    ]);
  });

  it('slides up', () => {
    expect(
      slideGrid(
        [
          [E, E, E, E],
          [2, E, 4, E],
          [E, 2, 4, E],
          [2, E, E, 8],
        ],
        'up',
      ),
    ).toEqual([
      [4, 2, 8, 8],
      [E, E, E, E],
      [E, E, E, E],
      [E, E, E, E],
    ]);
  });

  it('slides down', () => {
    expect(
      slideGrid(
        [
          [2, 4, E, E],
          [2, E, E, E],
          [E, 4, E, E],
          [E, 8, E, E],
        ],
        'down',
      ),
    ).toEqual([
      [E, E, E, E],
      [E, E, E, E],
      [E, 8, E, E],
      [4, 8, E, E],
    ]);
  });

  it.each<[number[], Direction, number[]]>([
    [[2, 2, 2, 2], 'left', [4, 4, E, E]],
    [[2, 2, 2, 0], 'left', [4, 2, E, E]],
    [[2, 2, 2, 0], 'right', [E, E, 2, 4]],
    [[2, 2, 4, 0], 'left', [4, 4, E, E]],
    [[4, 4, 8, 8], 'left', [8, 16, E, E]],
    [[4, 4, 8, 8], 'right', [E, E, 8, 16]],
    [[2, 0, 0, 2], 'left', [4, E, E, E]],
    [[8, 4, 4, 0], 'left', [8, 8, E, E]],
  ])('merges each tile at most once: %j %s -> %j', (row, dir, expected) => {
    const grid = [row, [E, E, E, E], [E, E, E, E], [E, E, E, E]];
    expect(slideGrid(grid, dir)[0]).toEqual(expected);
  });

  it('applies the merge-once rule on columns too', () => {
    const col = slideGrid(
      [
        [2, E, E, E],
        [2, E, E, E],
        [2, E, E, E],
        [2, E, E, E],
      ],
      'down',
    ).map((r) => r[0]);
    expect(col).toEqual([E, E, 4, 4]);
  });
});

describe('turn rules', () => {
  it('a no-op move returns the same state, no events, no spawn', () => {
    const state = stateFromGrid([
      [2, E, E, E],
      [4, E, E, E],
      [E, E, E, E],
      [E, E, E, E],
    ]);
    const result = move(state, 'left');
    expect(result.moved).toBe(false);
    expect(result.events).toEqual([]);
    expect(result.state).toBe(state);
  });

  it('a valid move spawns exactly one 2 or 4 and advances the turn', () => {
    const state = stateFromGrid([
      [E, E, E, 2],
      [E, E, E, E],
      [E, E, E, E],
      [E, E, E, E],
    ]);
    const result = move(state, 'left');
    expect(result.moved).toBe(true);
    expect(result.state.turn).toBe(1);
    const spawns = ofType(result.events, 'spawn');
    expect(spawns).toHaveLength(1);
    expect([2, 4]).toContain(spawns[0]?.value);
    expect(listTiles(result.state)).toHaveLength(2);
    expect(result.state.rng).not.toEqual(state.rng);
  });

  it('adds merged values to the score', () => {
    const state = stateFromGrid(
      [
        [2, 2, 4, 4],
        [8, 8, E, E],
        [E, E, E, E],
        [E, E, E, E],
      ],
      0,
      100,
    );
    const result = move(state, 'left');
    expect(result.state.score).toBe(100 + 4 + 8 + 16);
    expect(ofType(result.events, 'score')).toEqual([{ type: 'score', gained: 28, total: 128 }]);
  });

  it('emits no score event when nothing merged', () => {
    const result = move(
      stateFromGrid([
        [E, 2],
        [E, E],
      ]),
      'left',
    );
    expect(result.moved).toBe(true);
    expect(ofType(result.events, 'score')).toEqual([]);
  });

  it('never mutates the input state', () => {
    const state = deepFreeze(
      stateFromGrid([
        [2, 2, E, 4],
        [E, 4, 4, E],
        [E, E, E, E],
        [8, E, E, 8],
      ]),
    );
    const snapshot = JSON.stringify(state);
    for (const dir of DIRECTIONS) move(state, dir);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('game over', () => {
  it('detects a stuck board', () => {
    const stuck = stateFromGrid([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(hasAvailableMoves(stuck)).toBe(false);
    expect(stuck.over).toBe(true);
    expect(availableDirections(stuck)).toEqual([]);
  });

  it('a full board with a possible merge is not over', () => {
    const state = stateFromGrid([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 8, 8],
    ]);
    expect(hasAvailableMoves(state)).toBe(true);
    expect(availableDirections(state).sort()).toEqual(['left', 'right']);
  });

  it('flags game over and emits a gameOver event when the last move gets stuck', () => {
    const state = stateFromGrid([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [32, 4, 2, 4],
      [8, 16, 8, E],
    ]);
    expect(state.over).toBe(false);
    const result = move(state, 'right');
    expect(result.moved).toBe(true);
    expect(result.state.over).toBe(true);
    expect(result.events.at(-1)).toEqual({ type: 'gameOver' });
    // Once over, further moves are rejected.
    for (const dir of DIRECTIONS) expect(move(result.state, dir).moved).toBe(false);
  });
});

describe('events', () => {
  it('describes moves, merges, score and spawn in order', () => {
    // ids (row-major): 2a=1, 2b=2, 4=3, 8=4
    const state = stateFromGrid([
      [2, 2, E, 4],
      [E, E, E, E],
      [E, E, 8, E],
      [E, E, E, E],
    ]);
    const result = move(state, 'left');
    expect(result.events.slice(0, 4)).toEqual([
      {
        type: 'merge',
        sourceIds: [1, 2],
        from: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        to: { row: 0, col: 0 },
        resultId: 5,
        value: 4,
        scoreGained: 4,
      },
      { type: 'move', tileId: 3, from: { row: 0, col: 3 }, to: { row: 0, col: 1 } },
      { type: 'move', tileId: 4, from: { row: 2, col: 2 }, to: { row: 2, col: 0 } },
      { type: 'score', gained: 4, total: 4 },
    ]);
    const spawn = result.events[4];
    expect(spawn?.type).toBe('spawn');
    if (spawn?.type === 'spawn') {
      expect(spawn.tileId).toBe(6);
      expect(state.cells[spawn.at.row * 4 + spawn.at.col]).toBeNull();
      expect(result.state.cells[spawn.at.row * 4 + spawn.at.col]?.id).toBe(6);
    }
    expect(result.events).toHaveLength(5);
  });

  it('replaying events on the old board reproduces the new board', () => {
    let state = newGame({ seed: 'replay' }).state;
    for (let i = 0; i < 300 && !state.over; i++) {
      const dir = DIRECTIONS[i % 4] as Direction;
      const result = move(state, dir);
      if (!result.moved) continue;

      // Apply events the way a renderer would: id -> {pos, value}.
      const view = new Map<number, { row: number; col: number; value: number }>();
      for (const { tile, pos } of listTiles(state))
        view.set(tile.id, { ...pos, value: tile.value });
      for (const e of result.events) {
        if (e.type === 'move') {
          const t = view.get(e.tileId);
          expect(t).toBeDefined();
          if (t) view.set(e.tileId, { ...t, ...e.to });
        } else if (e.type === 'merge') {
          for (const id of e.sourceIds) expect(view.delete(id)).toBe(true);
          view.set(e.resultId, { ...e.to, value: e.value });
        } else if (e.type === 'spawn') {
          view.set(e.tileId, { ...e.at, value: e.value });
        }
      }
      const expected = new Map(
        listTiles(result.state).map(({ tile, pos }) => [tile.id, { ...pos, value: tile.value }]),
      );
      expect(view).toEqual(expected);
      state = result.state;
    }
  });

  it('tile ids are unique and never reused', () => {
    let state = newGame({ seed: 9 }).state;
    const seen = new Set(listTiles(state).map((t) => t.tile.id));
    for (let i = 0; i < 200 && !state.over; i++) {
      const result = move(state, DIRECTIONS[(i * 3) % 4] as Direction);
      for (const e of result.events) {
        const created = e.type === 'spawn' ? e.tileId : e.type === 'merge' ? e.resultId : null;
        if (created !== null) {
          expect(seen.has(created)).toBe(false);
          seen.add(created);
        }
      }
      state = result.state;
    }
  });
});

describe('seed reproducibility', () => {
  const inputs: Direction[] = Array.from(
    { length: 400 },
    (_, i) => DIRECTIONS[(i * 7 + (i >> 2)) % 4] as Direction,
  );

  function play(seed: string, from?: GameState, moves = inputs) {
    let state = from ?? newGame({ seed }).state;
    const log: TurnEvent[][] = [];
    for (const dir of moves) {
      const result = move(state, dir);
      log.push([...result.events]);
      state = result.state;
    }
    return { state, log };
  }

  it('same seed + same inputs gives identical states and events', () => {
    const a = play('run-1');
    const b = play('run-1');
    expect(a.state).toEqual(b.state);
    expect(a.log).toEqual(b.log);
  });

  it('different seeds diverge', () => {
    expect(play('run-1').state.cells).not.toEqual(play('run-2').state.cells);
  });

  it('a saved (JSON) state resumes with identical future rolls', () => {
    const firstHalf = play('save', undefined, inputs.slice(0, 50));
    const saved = JSON.parse(JSON.stringify(firstHalf.state)) as GameState;
    const resumed = play('save', saved, inputs.slice(50));
    const uninterrupted = play('save');
    expect(resumed.state).toEqual(uninterrupted.state);
  });
});
