/**
 * Tile construction and the merge rule. Keeping "can these two merge?" and
 * "what do they become?" in one place is the seam stage 3 extends for
 * stone / wild tiles and cursed / frozen statuses.
 */
import type { Tile, TileId, TileKind, TileStatus } from './types';

export const NO_STATUS: TileStatus = { frozenTurns: 0, cursed: false };

/** Kinds that merge by matching values. Stage 3 adds wild / stone handling. */
const VALUE_MERGING_KINDS: ReadonlySet<TileKind> = new Set<TileKind>(['number']);

export function createTile(
  id: TileId,
  value: number,
  kind: TileKind = 'number',
  status: TileStatus = NO_STATUS,
): Tile {
  return { id, kind, value, status };
}

/** Whether `follower` sliding into `leader` produces a merge. */
export function canMerge(leader: Tile, follower: Tile): boolean {
  return (
    VALUE_MERGING_KINDS.has(leader.kind) &&
    VALUE_MERGING_KINDS.has(follower.kind) &&
    leader.value === follower.value
  );
}

/** Value of the tile produced by merging two tiles that `canMerge`. */
export function mergedValue(leader: Tile, follower: Tile): number {
  return leader.value + follower.value;
}

/** Score awarded for a merge that produced `value`. */
export function mergeScore(value: number): number {
  return value;
}
