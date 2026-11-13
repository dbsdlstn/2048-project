/**
 * Hazard tiles and statuses: stone (a kind of tile), ice and curse (statuses
 * on number tiles). Everything here is a pure function of a board; how often
 * hazards appear is decided by `HazardParams`, which come from the stage table
 * (or the endless ramp) in `balance.ts`.
 */
import { spawnOnRandomEmpty } from './board';
import { neighbors, toPosition } from './grid';
import { chance, nextInt } from './rng';
import type { DestroyCause, GameState, StatusCause, Tile, TileStatus, TurnEvent } from './types';

/** Per-stage hazard frequencies. All chances are rolled once per move. */
export interface HazardParams {
  /** Stones placed when the stage begins. */
  readonly startStones: number;
  /** Chance that a stone appears on an empty cell after a move. */
  readonly stoneChance: number;
  /** No new stone appears while this many are on the board. */
  readonly maxStones: number;
  /** Chance that a random number tile freezes after a move. */
  readonly iceChance: number;
  /** How many moves a freshly frozen tile stays pinned. */
  readonly iceTurns: number;
  /** Chance that a random number tile gets cursed after a move. */
  readonly curseChance: number;
}

export const NO_HAZARDS: HazardParams = {
  startStones: 0,
  stoneChance: 0,
  maxStones: 0,
  iceChance: 0,
  iceTurns: 0,
  curseChance: 0,
};

/** Hazard keywords, used for onboarding text and to decide which relics are worth offering. */
export type HazardKind = 'stone' | 'ice' | 'curse';

export function hazardsPresent(params: HazardParams): HazardKind[] {
  const out: HazardKind[] = [];
  if (params.startStones > 0 || (params.stoneChance > 0 && params.maxStones > 0)) out.push('stone');
  if (params.iceChance > 0 && params.iceTurns > 0) out.push('ice');
  if (params.curseChance > 0) out.push('curse');
  return out;
}

export interface BoardStep {
  readonly state: GameState;
  readonly events: TurnEvent[];
}

export function countStones(state: GameState): number {
  return state.cells.reduce((n, t) => (t?.kind === 'stone' ? n + 1 : n), 0);
}

/** Replaces the tile at `index` with a copy carrying `status`, and describes the change. */
export function setStatus(
  state: GameState,
  index: number,
  status: TileStatus,
  cause: StatusCause,
): BoardStep {
  const tile = state.cells[index];
  if (!tile) return { state, events: [] };
  const cells = state.cells.slice();
  cells[index] = { ...tile, status };
  return {
    state: { ...state, cells },
    events: [
      { type: 'statusChange', tileId: tile.id, at: toPosition(index, state.size), status, cause },
    ],
  };
}

/** Removes the tiles at `indices`, describing each as destroyed by `cause`. */
export function destroyTiles(
  state: GameState,
  indices: readonly number[],
  cause: DestroyCause,
): BoardStep {
  if (indices.length === 0) return { state, events: [] };
  const cells = state.cells.slice();
  const events: TurnEvent[] = [];
  for (const index of indices) {
    const tile = cells[index];
    if (!tile) continue;
    cells[index] = null;
    events.push({ type: 'destroy', tileId: tile.id, at: toPosition(index, state.size), cause });
  }
  return { state: { ...state, cells }, events };
}

/** Places `count` stones on random empty cells (stage start). */
export function placeStones(state: GameState, count: number): BoardStep {
  let next = state;
  const events: TurnEvent[] = [];
  for (let i = 0; i < count; i++) {
    const step = spawnOnRandomEmpty(next, 'stone', 0);
    next = step.state;
    events.push(...step.events);
  }
  return { state: next, events };
}

function diagonalNeighbors(index: number, size: number): number[] {
  const { row, col } = toPosition(index, size);
  const out: number[] = [];
  for (const dr of [-1, 1]) {
    for (const dc of [-1, 1]) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < size && c >= 0 && c < size) out.push(r * size + c);
    }
  }
  return out;
}

/** A merge as seen by the stone rule: where it landed and what it made. */
export interface MergeSite {
  readonly index: number;
  readonly value: number;
}

/**
 * Stones orthogonally next to a merge break. With `diagonalFrom` set, merges
 * that produced at least that value also break diagonal stones (cause 'relic').
 * Each stone breaks once even if several merges touch it.
 */
export function breakStones(
  state: GameState,
  merges: readonly MergeSite[],
  diagonalFrom: number | null,
): BoardStep & { readonly broken: number } {
  const byMerge = new Set<number>();
  const byRelic = new Set<number>();
  const isStone = (i: number): boolean => state.cells[i]?.kind === 'stone';
  for (const m of merges) {
    for (const n of neighbors(m.index, state.size)) if (isStone(n)) byMerge.add(n);
  }
  if (diagonalFrom !== null) {
    for (const m of merges) {
      if (m.value < diagonalFrom) continue;
      for (const n of diagonalNeighbors(m.index, state.size)) {
        if (isStone(n) && !byMerge.has(n)) byRelic.add(n);
      }
    }
  }
  const a = destroyTiles(
    state,
    [...byMerge].sort((x, y) => x - y),
    'merge',
  );
  const b = destroyTiles(
    a.state,
    [...byRelic].sort((x, y) => x - y),
    'relic',
  );
  return {
    state: b.state,
    events: [...a.events, ...b.events],
    broken: byMerge.size + byRelic.size,
  };
}

/** Number tiles eligible for a status (not stones or prisms), optionally filtered. */
function eligibleIndices(state: GameState, ok: (tile: Tile) => boolean): number[] {
  const out: number[] = [];
  state.cells.forEach((tile, i) => {
    if (tile?.kind === 'number' && ok(tile)) out.push(i);
  });
  return out;
}

/**
 * Rolls this move's hazards, in a fixed order (stone, ice, curse). Each chance
 * is rolled every move even when it cannot apply (extra rolls are drawn only
 * to pick a cell or tile for a hazard that lands), which keeps the random
 * stream easy to reason about. `blocked` cells (a sealed line) never receive a stone.
 */
export function rollHazards(
  state: GameState,
  params: HazardParams,
  blocked?: ReadonlySet<number>,
): BoardStep {
  let next = state;
  const events: TurnEvent[] = [];

  const stoneRoll = chance(next.rng, params.stoneChance);
  next = { ...next, rng: stoneRoll.rng };
  if (stoneRoll.value && countStones(next) < params.maxStones) {
    const step = spawnOnRandomEmpty(next, 'stone', 0, blocked);
    next = step.state;
    events.push(...step.events);
  }

  const iceRoll = chance(next.rng, params.iceChance);
  next = { ...next, rng: iceRoll.rng };
  if (iceRoll.value && params.iceTurns > 0) {
    const targets = eligibleIndices(next, (t) => t.status.frozenTurns === 0);
    if (targets.length > 0) {
      const pickRoll = nextInt(next.rng, targets.length);
      next = { ...next, rng: pickRoll.rng };
      const index = targets[pickRoll.value] as number;
      const tile = next.cells[index] as Tile;
      const step = setStatus(next, index, { ...tile.status, frozenTurns: params.iceTurns }, 'ice');
      next = step.state;
      events.push(...step.events);
    }
  }

  const curseRoll = chance(next.rng, params.curseChance);
  next = { ...next, rng: curseRoll.rng };
  if (curseRoll.value) {
    const targets = eligibleIndices(next, (t) => !t.status.cursed);
    if (targets.length > 0) {
      const pickRoll = nextInt(next.rng, targets.length);
      next = { ...next, rng: pickRoll.rng };
      const index = targets[pickRoll.value] as number;
      const tile = next.cells[index] as Tile;
      const step = setStatus(next, index, { ...tile.status, cursed: true }, 'curse');
      next = step.state;
      events.push(...step.events);
    }
  }
  return { state: next, events };
}

/**
 * Counts down ice on the tiles in `ids` (the ones that were frozen during this
 * move's slide; ice applied later in the same turn is not ticked yet). Emits a
 * statusChange for every tick so the remaining count is always visible.
 */
export function tickIce(state: GameState, ids: ReadonlySet<number>): BoardStep {
  let next = state;
  const events: TurnEvent[] = [];
  state.cells.forEach((tile, index) => {
    if (!tile || !ids.has(tile.id) || tile.status.frozenTurns <= 0) return;
    const step = setStatus(
      next,
      index,
      { ...tile.status, frozenTurns: tile.status.frozenTurns - 1 },
      'thaw',
    );
    next = step.state;
    events.push(...step.events);
  });
  return { state: next, events };
}

/** Ids of all currently frozen tiles. */
export function frozenIds(state: GameState): Set<number> {
  const out = new Set<number>();
  for (const tile of state.cells) if (tile && tile.status.frozenTurns > 0) out.add(tile.id);
  return out;
}
