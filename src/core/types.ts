import type { RngState } from './rng';

export type Direction = 'up' | 'down' | 'left' | 'right';

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

export interface Position {
  readonly row: number;
  readonly col: number;
}

/** Stable unique identifier of a tile; the renderer keys animations on it. */
export type TileId = number;

/**
 * Tile kinds. Stage 1 only implements `number`. Planned additions:
 * `stone` (slides, never merges) and `wild` (merges with any number tile).
 */
export type TileKind = 'number';

/**
 * Per-tile status effects applied by hazards / bosses (stage 3).
 * Kept as a plain object so it serializes with the rest of the state.
 */
export interface TileStatus {
  /** Turns remaining during which the tile is pinned in place (0 = not frozen). */
  readonly frozenTurns: number;
  /** A cursed tile halves the result of a merge it takes part in. */
  readonly cursed: boolean;
}

export interface Tile {
  readonly id: TileId;
  readonly kind: TileKind;
  readonly value: number;
  readonly status: TileStatus;
}

/** A tile together with where it sits on the board (derived, for renderers). */
export interface PlacedTile {
  readonly tile: Tile;
  readonly pos: Position;
}

/** Full, serializable state of one board. Never mutated; every turn returns a new one. */
export interface GameState {
  readonly size: number;
  /** Row-major cells: index = row * size + col. `null` = empty. */
  readonly cells: readonly (Tile | null)[];
  readonly score: number;
  /** Number of valid (board-changing) moves made so far. */
  readonly turn: number;
  /** Id that the next created tile will receive. */
  readonly nextTileId: TileId;
  readonly rng: RngState;
  /** True once no move can change the board. */
  readonly over: boolean;
}

/**
 * What happened during a turn, in order. A renderer replays these as animation.
 *
 * Ordering contract: all `move` and `merge` events of a turn come first and
 * happen simultaneously (one slide), then `score`, then `spawn`, then
 * `gameOver` if the board became stuck.
 */
export type TurnEvent =
  | {
      readonly type: 'move';
      readonly tileId: TileId;
      readonly from: Position;
      readonly to: Position;
    }
  | {
      readonly type: 'merge';
      /** The two consumed tiles: [leading tile, follower]. Both slide to `to`, then vanish. */
      readonly sourceIds: readonly [TileId, TileId];
      readonly from: readonly [Position, Position];
      readonly to: Position;
      /** The newly created tile that replaces them at `to`. */
      readonly resultId: TileId;
      readonly value: number;
      readonly scoreGained: number;
    }
  | {
      readonly type: 'score';
      readonly gained: number;
      readonly total: number;
    }
  | {
      readonly type: 'spawn';
      readonly tileId: TileId;
      readonly kind: TileKind;
      readonly value: number;
      readonly at: Position;
    }
  | { readonly type: 'gameOver' };

export type TurnEventType = TurnEvent['type'];

export interface TurnResult {
  readonly state: GameState;
  /** False when the move changed nothing (no spawn, no turn consumed). */
  readonly moved: boolean;
  readonly events: readonly TurnEvent[];
}
