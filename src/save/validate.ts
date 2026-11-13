/**
 * Structural validation of data read back from storage. Anything that came
 * from outside the program (an old version, another app's key, a hand edit, a
 * half-written value) is `unknown` until one of these guards accepts it, so a
 * corrupt save can never reach the core as a broken `RunState`.
 *
 * The checks are deliberately strict about shape (types, ranges, known ids,
 * cell counts, unique tile ids) and say nothing about game balance: a valid
 * run from an older stage table still loads.
 */
import {
  BOSSES,
  RELICS,
  STAGES,
  type BossState,
  type GameState,
  type RelicInstance,
  type RngState,
  type RunSnapshot,
  type RunState,
  type StageProgress,
  type Tile,
} from '../core';

export type Json = Record<string, unknown>;

export function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A finite integer in [min, max]. */
export function isInt(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

const UINT32 = 0xffffffff;

function isRng(value: unknown): value is RngState {
  return isObject(value) && isInt(value.seed, 0, UINT32) && isInt(value.state, 0, UINT32);
}

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

function isTile(value: unknown): value is Tile {
  if (!isObject(value) || !isInt(value.id, 1)) return false;
  const status = value.status;
  if (!isObject(status) || !isInt(status.frozenTurns, 0, 99)) return false;
  if (typeof status.cursed !== 'boolean') return false;
  switch (value.kind) {
    case 'number':
      return isInt(value.value, 2, 2 ** 30) && isPowerOfTwo(value.value);
    case 'stone':
    case 'prism':
      return value.value === 0;
    default:
      return false;
  }
}

function isBoard(value: unknown): value is GameState {
  if (!isObject(value) || !isInt(value.size, 2, 8)) return false;
  const size = value.size;
  const cells = value.cells;
  if (!Array.isArray(cells) || cells.length !== size * size) return false;
  if (!isInt(value.score) || !isInt(value.turn) || !isInt(value.nextTileId, 1)) return false;
  if (!isRng(value.rng) || typeof value.over !== 'boolean') return false;
  const nextTileId = value.nextTileId;
  const ids = new Set<number>();
  for (const cell of cells as unknown[]) {
    if (cell === null) continue;
    if (!isTile(cell) || ids.has(cell.id) || cell.id >= nextTileId) return false;
    ids.add(cell.id);
  }
  return true;
}

function isProgress(value: unknown): value is StageProgress {
  return (
    isObject(value) &&
    isInt(value.movesUsed) &&
    isInt(value.bonusMoves) &&
    isInt(value.score) &&
    isInt(value.stonesBroken) &&
    isInt(value.bestTile)
  );
}

function isBoss(value: unknown, size: number): value is BossState | null {
  if (value === null) return true;
  if (!isObject(value) || typeof value.id !== 'string' || !(value.id in BOSSES)) return false;
  if (!isInt(value.period, 1, 99) || !isInt(value.turnsUntil, 0, 99)) return false;
  const lock = value.lock;
  if (lock === null) return true;
  return (
    isObject(lock) &&
    (lock.axis === 'row' || lock.axis === 'col') &&
    isInt(lock.index, 0, size - 1) &&
    isInt(lock.turnsLeft, 1, 99)
  );
}

function isRelicId(value: unknown): value is keyof typeof RELICS {
  return typeof value === 'string' && Object.hasOwn(RELICS, value);
}

function isRelics(value: unknown): value is RelicInstance[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  for (const r of value as unknown[]) {
    if (!isObject(r) || !isRelicId(r.id) || seen.has(r.id)) return false;
    const max = RELICS[r.id].active?.maxCharges ?? 0;
    if (!isInt(r.charges, 0, max) || !isInt(r.counter)) return false;
    seen.add(r.id);
  }
  return true;
}

const STATUSES = ['playing', 'offer', 'victory', 'gameOver'];

/** Every field of a run except its undo slot. */
function isSnapshot(value: unknown): value is RunSnapshot {
  if (!isObject(value) || value.version !== 1) return false;
  if (value.mode !== 'run' && value.mode !== 'endless') return false;
  if (!isInt(value.seed, 0, UINT32) || !STATUSES.includes(value.status as string)) return false;
  if (value.failReason !== null && value.failReason !== 'moves' && value.failReason !== 'stuck') {
    return false;
  }
  const maxStage = value.mode === 'run' ? STAGES.length - 1 : Number.MAX_SAFE_INTEGER;
  if (!isInt(value.stageIndex, 0, maxStage)) return false;
  if (!isBoard(value.board) || !isProgress(value.progress)) return false;
  if (!isBoss(value.boss, value.board.size) || !isRelics(value.relics)) return false;
  if (!Array.isArray(value.offer) || !(value.offer as unknown[]).every(isRelicId)) return false;
  return isInt(value.bankedScore) && isInt(value.nextOfferTile, 2) && isRng(value.rng);
}

/** Whether `value` is a complete, well-formed `RunState` (including its undo snapshot). */
export function isRunState(value: unknown): value is RunState {
  if (!isSnapshot(value)) return false;
  const undo = (value as Json).undo;
  return undo === null || (isSnapshot(undo) && (undo as Json).mode === value.mode);
}
