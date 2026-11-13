/**
 * Pure 2048 board logic: no DOM, no globals, no mutation of inputs.
 * Every function takes a state and returns a new one plus the events that
 * describe what changed, so the same code drives the game, tests, replays
 * and (later) save/restore.
 */
import { DEFAULT_RULES, type CoreRules } from './balance';
import { linesFor, neighbors, toPosition } from './grid';
import { createRng, chance, nextInt, type RngState } from './rng';
import { canMerge, createTile, mergedValue, mergeScore } from './tile';
import type {
  Direction,
  GameState,
  PlacedTile,
  Position,
  Tile,
  TurnEvent,
  TurnResult,
} from './types';
import { DIRECTIONS } from './types';

export interface NewGameOptions {
  /** Numeric or string seed; same seed + same moves = same game. */
  readonly seed: number | string;
  readonly rules?: CoreRules;
}

/** Starts a new game: an empty board plus `rules.startTiles` spawned tiles. */
export function newGame(options: NewGameOptions): TurnResult {
  const rules = options.rules ?? DEFAULT_RULES;
  let state: GameState = {
    size: rules.boardSize,
    cells: new Array<Tile | null>(rules.boardSize * rules.boardSize).fill(null),
    score: 0,
    turn: 0,
    nextTileId: 1,
    rng: createRng(options.seed),
    over: false,
  };
  const events: TurnEvent[] = [];
  for (let i = 0; i < rules.startTiles; i++) {
    const spawned = spawnRandomTile(state, rules);
    state = spawned.state;
    events.push(...spawned.events);
  }
  return { state, moved: false, events };
}

/**
 * Builds a state from a grid of numbers (0 = empty). Handy for tests, tutorials
 * and debugging. Tiles get ids 1..n in row-major order.
 */
export function stateFromGrid(
  grid: readonly (readonly number[])[],
  seed: number | string = 0,
  score = 0,
): GameState {
  const size = grid.length;
  let nextTileId = 1;
  const cells: (Tile | null)[] = [];
  for (const row of grid) {
    if (row.length !== size) throw new Error('stateFromGrid: grid must be square');
    for (const value of row) {
      cells.push(value === 0 ? null : createTile(nextTileId++, value));
    }
  }
  const state: GameState = {
    size,
    cells,
    score,
    turn: 0,
    nextTileId,
    rng: createRng(seed),
    over: false,
  };
  return { ...state, over: !hasAvailableMoves(state) };
}

/** The board as a grid of numbers (0 = empty). Inverse of `stateFromGrid`. */
export function toValueGrid(state: GameState): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < state.size; r++) {
    const row: number[] = [];
    for (let c = 0; c < state.size; c++) {
      row.push(state.cells[r * state.size + c]?.value ?? 0);
    }
    grid.push(row);
  }
  return grid;
}

/** Every tile on the board with its position, in row-major order. */
export function listTiles(state: GameState): PlacedTile[] {
  const out: PlacedTile[] = [];
  state.cells.forEach((tile, index) => {
    if (tile) out.push({ tile, pos: toPosition(index, state.size) });
  });
  return out;
}

export function emptyCellIndices(state: GameState): number[] {
  const out: number[] = [];
  state.cells.forEach((tile, index) => {
    if (!tile) out.push(index);
  });
  return out;
}

/** True if at least one direction would change the board. */
export function hasAvailableMoves(state: GameState): boolean {
  for (let i = 0; i < state.cells.length; i++) {
    const tile = state.cells[i];
    if (!tile) return true;
    for (const n of neighbors(i, state.size)) {
      const other = state.cells[n];
      if (!other || canMerge(tile, other) || canMerge(other, tile)) return true;
    }
  }
  return false;
}

/** Which directions would change the board (useful for hints / AI / tests). */
export function availableDirections(state: GameState): Direction[] {
  return DIRECTIONS.filter((d) => slide(state, d).moved);
}

/**
 * Places one random number tile (2, or 4 with `rules.fourChance`) on a random
 * empty cell. Returns the state unchanged with no events if the board is full.
 */
export function spawnRandomTile(
  state: GameState,
  rules: CoreRules = DEFAULT_RULES,
): { state: GameState; events: TurnEvent[] } {
  const empty = emptyCellIndices(state);
  if (empty.length === 0) return { state, events: [] };

  let rng: RngState = state.rng;
  const cellRoll = nextInt(rng, empty.length);
  rng = cellRoll.rng;
  const fourRoll = chance(rng, rules.fourChance);
  rng = fourRoll.rng;

  const index = empty[cellRoll.value] as number;
  const value = fourRoll.value ? 4 : 2;
  const tile = createTile(state.nextTileId, value);
  const cells = state.cells.slice();
  cells[index] = tile;

  return {
    state: { ...state, cells, rng, nextTileId: state.nextTileId + 1 },
    events: [
      {
        type: 'spawn',
        tileId: tile.id,
        kind: tile.kind,
        value,
        at: toPosition(index, state.size),
      },
    ],
  };
}

/**
 * Plays one turn: slide + merge in `direction`, then (only if something moved)
 * award score, spawn a tile, advance the turn counter and check for game over.
 * A move that changes nothing returns the *same* state object and no events.
 */
export function move(
  state: GameState,
  direction: Direction,
  rules: CoreRules = DEFAULT_RULES,
): TurnResult {
  if (state.over) return { state, moved: false, events: [] };

  const slid = slide(state, direction);
  if (!slid.moved) return { state, moved: false, events: [] };

  const events: TurnEvent[] = [...slid.events];
  let next: GameState = {
    ...slid.state,
    score: state.score + slid.scoreGained,
    turn: state.turn + 1,
  };
  if (slid.scoreGained > 0) {
    events.push({ type: 'score', gained: slid.scoreGained, total: next.score });
  }

  const spawned = spawnRandomTile(next, rules);
  next = spawned.state;
  events.push(...spawned.events);

  if (!hasAvailableMoves(next)) {
    next = { ...next, over: true };
    events.push({ type: 'gameOver' });
  }
  return { state: next, moved: true, events };
}

interface SlideResult {
  readonly state: GameState;
  readonly moved: boolean;
  readonly events: TurnEvent[];
  readonly scoreGained: number;
}

/** One entry of a line after compaction: a single tile, or a merged pair. */
type Placement =
  | { readonly kind: 'single'; readonly tile: Tile; readonly fromIndex: number }
  | {
      readonly kind: 'pair';
      readonly leader: Tile;
      readonly leaderIndex: number;
      readonly follower: Tile;
      readonly followerIndex: number;
    };

/**
 * Slide + merge only (no score bookkeeping, no spawn). Each tile merges at most
 * once per slide: a merged pair is never a merge target again.
 */
function slide(state: GameState, direction: Direction): SlideResult {
  const { size } = state;
  const cells: (Tile | null)[] = new Array<Tile | null>(size * size).fill(null);
  const events: TurnEvent[] = [];
  let nextTileId = state.nextTileId;
  let scoreGained = 0;
  let moved = false;

  const pos = (index: number): Position => toPosition(index, size);

  for (const line of linesFor(direction, size)) {
    // 1. Compact the line toward its leading edge, pairing equal neighbours.
    const placements: Placement[] = [];
    for (const index of line) {
      const tile = state.cells[index];
      if (!tile) continue;
      const last = placements[placements.length - 1];
      if (last?.kind === 'single' && canMerge(last.tile, tile)) {
        placements[placements.length - 1] = {
          kind: 'pair',
          leader: last.tile,
          leaderIndex: last.fromIndex,
          follower: tile,
          followerIndex: index,
        };
      } else {
        placements.push({ kind: 'single', tile, fromIndex: index });
      }
    }

    // 2. Write placements back and describe them as events.
    for (const [slot, p] of placements.entries()) {
      const target = line[slot] as number;
      if (p.kind === 'single') {
        cells[target] = p.tile;
        if (p.fromIndex !== target) {
          moved = true;
          events.push({ type: 'move', tileId: p.tile.id, from: pos(p.fromIndex), to: pos(target) });
        }
        continue;
      }
      moved = true;
      const value = mergedValue(p.leader, p.follower);
      const gained = mergeScore(value);
      const result = createTile(nextTileId++, value);
      cells[target] = result;
      scoreGained += gained;
      events.push({
        type: 'merge',
        sourceIds: [p.leader.id, p.follower.id],
        from: [pos(p.leaderIndex), pos(p.followerIndex)],
        to: pos(target),
        resultId: result.id,
        value,
        scoreGained: gained,
      });
    }
  }

  if (!moved) return { state, moved: false, events: [], scoreGained: 0 };
  return { state: { ...state, cells, nextTileId }, moved, events, scoreGained };
}
