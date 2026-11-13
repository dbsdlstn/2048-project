/**
 * Tile construction and the merge rule. Keeping "can these two merge?" and
 * "what do they become?" in one place keeps the slide algorithm in `board.ts`
 * free of tile-kind details.
 */
import type { Tile, TileId, TileKind, TileStatus } from './types';

export const NO_STATUS: TileStatus = { frozenTurns: 0, cursed: false };

export function createTile(
  id: TileId,
  value: number,
  kind: TileKind = 'number',
  status: TileStatus = NO_STATUS,
): Tile {
  return { id, kind, value, status };
}

export function isFrozen(tile: Tile): boolean {
  return tile.status.frozenTurns > 0;
}

export function hasStatus(tile: Tile): boolean {
  return tile.status.cursed || tile.status.frozenTurns > 0;
}

/**
 * Whether `follower` sliding into `leader` produces a merge.
 * Numbers merge with equal numbers; a prism merges with any number (but not
 * with another prism); stones never merge.
 */
export function canMerge(leader: Tile, follower: Tile): boolean {
  if (leader.kind === 'number' && follower.kind === 'number') {
    return leader.value === follower.value;
  }
  return (
    (leader.kind === 'prism' && follower.kind === 'number') ||
    (leader.kind === 'number' && follower.kind === 'prism')
  );
}

/**
 * Value of the tile produced by merging two tiles that `canMerge`, before any
 * curse or relic adjustments. A prism doubles the number it meets.
 */
export function mergedValue(leader: Tile, follower: Tile): number {
  if (leader.kind === 'prism') return follower.value * 2;
  if (follower.kind === 'prism') return leader.value * 2;
  return leader.value + follower.value;
}

/** Score awarded for a merge that produced `value`, before relic multipliers. */
export function mergeScore(value: number): number {
  return value;
}
