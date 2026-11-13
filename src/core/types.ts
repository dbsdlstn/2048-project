import type { BossId } from './bosses';
import type { RelicId } from './relics';
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
 * Tile kinds.
 * - `number`: the ordinary 2048 tile.
 * - `stone`: a hazard. Slides like any tile, never merges, and breaks when a
 *   merge happens orthogonally next to it. Its `value` is 0.
 * - `prism`: merges with any number tile and doubles it. Its `value` is 0.
 */
export type TileKind = 'number' | 'stone' | 'prism';

/**
 * Per-tile status effects applied by hazards / relics.
 * Kept as a plain object so it serializes with the rest of the state.
 */
export interface TileStatus {
  /** Moves remaining during which the tile is pinned in place (0 = not frozen). */
  readonly frozenTurns: number;
  /** A cursed tile halves the result of a merge it takes part in; the curse is consumed. */
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

/** A row or column, e.g. sealed by a boss. */
export type LineAxis = 'row' | 'col';

/** Why a tile was removed from the board. */
export type DestroyCause =
  /** A merge happened orthogonally next to a stone. */
  | 'merge'
  /** A relic widened the merge's reach (e.g. diagonal stones). */
  | 'relic'
  /** The player used an active relic on it. */
  | 'active';

/** Why a tile's status changed. */
export type StatusCause = 'ice' | 'curse' | 'thaw' | 'active';

/** Which relic or boss rule acted (for HUD highlights). */
export type TriggerSource = RelicId | BossId;

/**
 * Everything that can happen during a turn. Events are grouped into phases
 * (see `TurnPhase`): events in one phase happen at the same time, phases play
 * one after another.
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
      /** Kind of the result tile. */
      readonly kind: TileKind;
      readonly value: number;
      readonly scoreGained: number;
      /** True when a curse halved this merge. */
      readonly cursed: boolean;
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
  | {
      readonly type: 'destroy';
      readonly tileId: TileId;
      readonly at: Position;
      readonly cause: DestroyCause;
    }
  | {
      readonly type: 'statusChange';
      readonly tileId: TileId;
      readonly at: Position;
      /** The tile's full status after the change. */
      readonly status: TileStatus;
      readonly cause: StatusCause;
    }
  | {
      /** A tile keeps its id but changes value (e.g. halved by a boss). */
      readonly type: 'valueChange';
      readonly tileId: TileId;
      readonly at: Position;
      readonly from: number;
      readonly to: number;
    }
  | {
      /** Tiles teleport to new cells all at once. */
      readonly type: 'shuffle';
      readonly moves: readonly {
        readonly tileId: TileId;
        readonly from: Position;
        readonly to: Position;
      }[];
    }
  | {
      /** Tiles in this line cannot move, be entered or merge for `turns` moves. */
      readonly type: 'lineLock';
      readonly axis: LineAxis;
      readonly index: number;
      readonly turns: number;
    }
  | { readonly type: 'lineUnlock'; readonly axis: LineAxis; readonly index: number }
  | {
      /** A relic or boss rule did something; `source` is its id. */
      readonly type: 'trigger';
      readonly source: TriggerSource;
      readonly at: Position | null;
    }
  | { readonly type: 'bonusMoves'; readonly amount: number }
  | { readonly type: 'stageCleared' }
  | { readonly type: 'stageFailed'; readonly reason: FailReason }
  | { readonly type: 'gameOver' };

export type TurnEventType = TurnEvent['type'];

/** Why a stage (or an endless game) ended without success. */
export type FailReason = 'moves' | 'stuck';

/**
 * Phases of one turn, in causal order. Only non-empty phases are emitted.
 * - `slide`: tiles slide and merge (move, merge, score).
 * - `resolve`: consequences of the previous slide/chain (stones breaking).
 * - `chain`: an extra merge pass caused by a relic; may repeat, each followed by its own `resolve`.
 * - `boss`: the stage boss acts (line lock, halving, shuffle + stone).
 * - `spawn`: new tiles appear and hazards land (spawn, statusChange).
 * - `end`: bookkeeping visible to the player (ice thaw, unlock, bonus score,
 *   stage cleared / failed, game over).
 */
export type TurnPhaseKind = 'slide' | 'resolve' | 'chain' | 'boss' | 'spawn' | 'end';

export interface TurnPhase {
  readonly kind: TurnPhaseKind;
  readonly events: readonly TurnEvent[];
}

export interface TurnResult {
  readonly state: GameState;
  /** False when the move changed nothing (no spawn, no turn consumed). */
  readonly moved: boolean;
  /** Sequential phases; events inside one phase are simultaneous. */
  readonly phases: readonly TurnPhase[];
  /** All events of all phases, flattened in order. */
  readonly events: readonly TurnEvent[];
}
