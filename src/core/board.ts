/**
 * Pure 2048 board logic: no DOM, no globals, no mutation of inputs.
 * Every function takes a state and returns a new one plus the events that
 * describe what changed, so the same code drives the game, tests, replays
 * and save/restore. The roguelike turn (`turn.ts`) is built from the same
 * pieces (`slide`, `spawnRandomTile`, `placeTile`).
 */
import { DEFAULT_RULES, type CoreRules } from './balance';
import { linesFor, toPosition } from './grid';
import { createRng, chance, nextInt, type RngState } from './rng';
import { canMerge, createTile, isFrozen, mergedValue, mergeScore, NO_STATUS } from './tile';
import type {
  Direction,
  GameState,
  PlacedTile,
  Position,
  Tile,
  TileKind,
  TileStatus,
  TurnEvent,
  TurnPhase,
  TurnResult,
} from './types';
import { DIRECTIONS } from './types';

export interface NewGameOptions {
  /** Numeric or string seed; same seed + same moves = same game. */
  readonly seed: number | string;
  readonly rules?: CoreRules;
}

/** Builds a TurnResult from phases, dropping empty phases and flattening events. */
export function toTurnResult(state: GameState, moved: boolean, phases: TurnPhase[]): TurnResult {
  const kept = phases.filter((p) => p.events.length > 0);
  return { state, moved, phases: kept, events: kept.flatMap((p) => p.events) };
}

/** An empty board with a fresh generator. */
export function emptyBoard(size: number, seed: number | string): GameState {
  return {
    size,
    cells: new Array<Tile | null>(size * size).fill(null),
    score: 0,
    turn: 0,
    nextTileId: 1,
    rng: createRng(seed),
    over: false,
  };
}

/** Starts a new game: an empty board plus `rules.startTiles` spawned tiles. */
export function newGame(options: NewGameOptions): TurnResult {
  const rules = options.rules ?? DEFAULT_RULES;
  let state = emptyBoard(rules.boardSize, options.seed);
  const events: TurnEvent[] = [];
  for (let i = 0; i < rules.startTiles; i++) {
    const spawned = spawnRandomTile(state, rules);
    state = spawned.state;
    events.push(...spawned.events);
  }
  return toTurnResult(state, false, [{ kind: 'spawn', events }]);
}

/** Grid cell shorthand for `stateFromGrid`: a number, or a tile description. */
export type GridCell =
  | number
  | {
      readonly kind?: TileKind;
      readonly value?: number;
      readonly frozen?: number;
      readonly cursed?: boolean;
    };

/**
 * Builds a state from a grid (0 = empty). Handy for tests, tutorials and
 * debugging. Tiles get ids 1..n in row-major order. Cells can also be objects,
 * e.g. `{ kind: 'stone' }` or `{ value: 8, frozen: 2 }`.
 */
export function stateFromGrid(
  grid: readonly (readonly GridCell[])[],
  seed: number | string = 0,
  score = 0,
): GameState {
  const size = grid.length;
  let nextTileId = 1;
  const cells: (Tile | null)[] = [];
  for (const row of grid) {
    if (row.length !== size) throw new Error('stateFromGrid: grid must be square');
    for (const cell of row) {
      if (typeof cell === 'number') {
        cells.push(cell === 0 ? null : createTile(nextTileId++, cell));
        continue;
      }
      const kind = cell.kind ?? 'number';
      const status: TileStatus = { frozenTurns: cell.frozen ?? 0, cursed: cell.cursed ?? false };
      cells.push(createTile(nextTileId++, kind === 'number' ? (cell.value ?? 2) : 0, kind, status));
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

/** The board as a grid of numbers (0 = empty, stone/prism also 0). Inverse of `stateFromGrid` for plain boards. */
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

export function emptyCellIndices(state: GameState, blocked?: ReadonlySet<number>): number[] {
  const out: number[] = [];
  state.cells.forEach((tile, index) => {
    if (!tile && !blocked?.has(index)) out.push(index);
  });
  return out;
}

/** Largest number-tile value on the board (0 if none). */
export function maxTileValue(state: GameState): number {
  let max = 0;
  for (const tile of state.cells) {
    if (tile?.kind === 'number' && tile.value > max) max = tile.value;
  }
  return max;
}

/** True if at least one direction would change the board. */
export function hasAvailableMoves(state: GameState, options: SlideOptions = {}): boolean {
  return DIRECTIONS.some((d) => slide(state, d, options).moved);
}

/** Which directions would change the board (useful for hints / AI / tests). */
export function availableDirections(state: GameState, options: SlideOptions = {}): Direction[] {
  return DIRECTIONS.filter((d) => slide(state, d, options).moved);
}

/** Puts a new tile on cell `index` (which must be empty) and describes it as a spawn. */
export function placeTile(
  state: GameState,
  index: number,
  kind: TileKind,
  value: number,
): { state: GameState; events: TurnEvent[] } {
  const tile = createTile(state.nextTileId, value, kind);
  const cells = state.cells.slice();
  cells[index] = tile;
  return {
    state: { ...state, cells, nextTileId: state.nextTileId + 1 },
    events: [{ type: 'spawn', tileId: tile.id, kind, value, at: toPosition(index, state.size) }],
  };
}

/**
 * Places a tile of `kind` on a random empty cell (not in `blocked`). Returns
 * the state unchanged with no events if there is no room.
 */
export function spawnOnRandomEmpty(
  state: GameState,
  kind: TileKind,
  value: number,
  blocked?: ReadonlySet<number>,
): { state: GameState; events: TurnEvent[] } {
  const empty = emptyCellIndices(state, blocked);
  if (empty.length === 0) return { state, events: [] };
  const roll = nextInt(state.rng, empty.length);
  return placeTile({ ...state, rng: roll.rng }, empty[roll.value] as number, kind, value);
}

/** Indices of the four corner cells, in row-major order. */
export function cornerIndices(size: number): number[] {
  const last = size - 1;
  return [0, last, last * size, last * size + last];
}

/**
 * Places a tile on a random empty corner (not in `blocked`); falls back to any
 * random empty cell when every corner is taken. Unchanged if the board is full.
 */
export function spawnInCorner(
  state: GameState,
  kind: TileKind,
  value: number,
  blocked?: ReadonlySet<number>,
): { state: GameState; events: TurnEvent[] } {
  const corners = cornerIndices(state.size).filter((i) => !state.cells[i] && !blocked?.has(i));
  if (corners.length === 0) return spawnOnRandomEmpty(state, kind, value, blocked);
  const roll = nextInt(state.rng, corners.length);
  return placeTile({ ...state, rng: roll.rng }, corners[roll.value] as number, kind, value);
}

/**
 * Places one random number tile (2, or 4 with `rules.fourChance`) on a random
 * empty cell. Returns the state unchanged with no events if the board is full.
 * `asKind` turns the spawn into another kind (e.g. a prism) using the same rolls.
 */
export function spawnRandomTile(
  state: GameState,
  rules: Pick<CoreRules, 'fourChance'> = DEFAULT_RULES,
  blocked?: ReadonlySet<number>,
  asKind: TileKind = 'number',
): { state: GameState; events: TurnEvent[] } {
  const empty = emptyCellIndices(state, blocked);
  if (empty.length === 0) return { state, events: [] };

  let rng: RngState = state.rng;
  const cellRoll = nextInt(rng, empty.length);
  rng = cellRoll.rng;
  const fourRoll = chance(rng, rules.fourChance);
  rng = fourRoll.rng;

  const value = asKind === 'number' ? (fourRoll.value ? 4 : 2) : 0;
  return placeTile({ ...state, rng }, empty[cellRoll.value] as number, asKind, value);
}

/**
 * Plays one plain-2048 turn: slide + merge in `direction`, then (only if
 * something moved) award score, spawn a tile, advance the turn counter and
 * check for game over. A move that changes nothing returns the *same* state
 * object and no events. Phases: slide → spawn → end.
 */
export function move(
  state: GameState,
  direction: Direction,
  rules: CoreRules = DEFAULT_RULES,
): TurnResult {
  if (state.over) return toTurnResult(state, false, []);

  const slid = slide(state, direction);
  if (!slid.moved) return toTurnResult(state, false, []);

  const slideEvents: TurnEvent[] = [...slid.events];
  let next: GameState = {
    ...slid.state,
    score: state.score + slid.scoreGained,
    turn: state.turn + 1,
  };
  if (slid.scoreGained > 0) {
    slideEvents.push({ type: 'score', gained: slid.scoreGained, total: next.score });
  }

  const spawned = spawnRandomTile(next, rules);
  next = spawned.state;

  const endEvents: TurnEvent[] = [];
  if (!hasAvailableMoves(next)) {
    next = { ...next, over: true };
    endEvents.push({ type: 'gameOver' });
  }
  return toTurnResult(next, true, [
    { kind: 'slide', events: slideEvents },
    { kind: 'spawn', events: spawned.events },
    { kind: 'end', events: endEvents },
  ]);
}

/** The outcome of one merge, as decided by the merge rule (and relics, in `turn.ts`). */
export interface MergeOutcome {
  readonly kind: TileKind;
  readonly value: number;
  readonly score: number;
  readonly cursed: boolean;
}

export interface SlideOptions {
  /** Cells tiles can neither enter, leave nor merge into (e.g. a sealed line). */
  readonly walls?: ReadonlySet<number>;
  /** Extra veto on merges (chain passes only allow merges involving a fresh tile). */
  readonly mayMerge?: (leader: Tile, follower: Tile) => boolean;
  /** Decides what a merge produces; defaults to `defaultMergeOutcome`. */
  readonly resolveMerge?: MergeResolver;
}

export type MergeResolver = (leader: Tile, follower: Tile, targetIndex: number) => MergeOutcome;

/** The base merge rule: sum (prism doubles), halved once if either tile is cursed. */
export function defaultMergeOutcome(leader: Tile, follower: Tile): MergeOutcome {
  const cursed = leader.status.cursed || follower.status.cursed;
  const base = mergedValue(leader, follower);
  const value = cursed ? Math.max(2, base / 2) : base;
  return { kind: 'number', value, score: mergeScore(value), cursed };
}

export interface SlideResult {
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
 * Slide + merge only (no score bookkeeping, no spawn, no turn counter). Each
 * tile merges at most once per slide: a merged pair is never a merge target
 * again.
 *
 * Obstacles split a line into segments:
 * - a wall cell (sealed line) stays exactly as it is and nothing passes it;
 * - a frozen tile stays in place and acts as the leading edge of the segment
 *   behind it, but a matching tile *can* slide into it and merge (the ice
 *   breaks: the result is a new, unfrozen tile on the frozen tile's cell).
 */
export function slide(
  state: GameState,
  direction: Direction,
  options: SlideOptions = {},
): SlideResult {
  const { size } = state;
  const walls = options.walls;
  const mayMerge = options.mayMerge;
  const resolveMerge = options.resolveMerge ?? defaultMergeOutcome;
  const cells: (Tile | null)[] = new Array<Tile | null>(size * size).fill(null);
  const events: TurnEvent[] = [];
  let nextTileId = state.nextTileId;
  let scoreGained = 0;
  // Written from inside `flush`, so kept in an object (closures defeat narrowing).
  const changed = { any: false };

  const pos = (index: number): Position => toPosition(index, size);

  for (const line of linesFor(direction, size)) {
    let segStart = 0;
    let placements: Placement[] = [];

    // Writes the current segment's placements from `segStart` and describes them.
    const flush = (): void => {
      for (const [slot, p] of placements.entries()) {
        const target = line[segStart + slot] as number;
        if (p.kind === 'single') {
          cells[target] = p.tile;
          if (p.fromIndex !== target) {
            changed.any = true;
            events.push({
              type: 'move',
              tileId: p.tile.id,
              from: pos(p.fromIndex),
              to: pos(target),
            });
          }
          continue;
        }
        changed.any = true;
        const outcome = resolveMerge(p.leader, p.follower, target);
        const result = createTile(nextTileId++, outcome.value, outcome.kind, NO_STATUS);
        cells[target] = result;
        scoreGained += outcome.score;
        events.push({
          type: 'merge',
          sourceIds: [p.leader.id, p.follower.id],
          from: [pos(p.leaderIndex), pos(p.followerIndex)],
          to: pos(target),
          resultId: result.id,
          kind: outcome.kind,
          value: outcome.value,
          scoreGained: outcome.score,
          cursed: outcome.cursed,
        });
      }
      placements = [];
    };

    for (const [k, index] of line.entries()) {
      const tile = state.cells[index] ?? null;
      if (walls?.has(index)) {
        flush();
        cells[index] = tile;
        segStart = k + 1;
        continue;
      }
      if (!tile) continue;
      if (isFrozen(tile)) {
        flush();
        segStart = k;
        placements = [{ kind: 'single', tile, fromIndex: index }];
        continue;
      }
      const last = placements[placements.length - 1];
      if (
        last?.kind === 'single' &&
        canMerge(last.tile, tile) &&
        (mayMerge?.(last.tile, tile) ?? true)
      ) {
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
    flush();
  }

  if (!changed.any) return { state, moved: false, events: [], scoreGained: 0 };
  return { state: { ...state, cells, nextTileId }, moved: true, events, scoreGained };
}
