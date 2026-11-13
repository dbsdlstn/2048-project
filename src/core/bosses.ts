/**
 * Boss rules. A boss stage adds one rule that fires on a fixed cadence. The
 * countdown lives in plain state (`BossState.turnsUntil`) so the HUD can always
 * show when the next trigger comes, and what it will hit when that is
 * computable (`bossPreview`).
 */
import { BOSS_TUNING } from './balance';
import { maxTileValue, spawnOnRandomEmpty } from './board';
import { toPosition } from './grid';
import { nextInt, type RngState } from './rng';
import type { GameState, LineAxis, Position, Tile, TileId, TurnEvent } from './types';

export type BossId = 'warden' | 'corroder' | 'chaos';

export interface BossDef {
  readonly id: BossId;
  /** Korean display name. */
  readonly name: string;
  /** One-line Korean rule text (numbers come from the tuning). */
  readonly description: string;
}

export const BOSSES: Readonly<Record<BossId, BossDef>> = {
  warden: {
    id: 'warden',
    name: '봉쇄자',
    description: `${BOSS_TUNING.warden.period}턴마다 한 줄을 ${BOSS_TUNING.warden.lockTurns}턴 동안 봉쇄한다 (드나들기·합체 불가)`,
  },
  corroder: {
    id: 'corroder',
    name: '부식자',
    description: `${BOSS_TUNING.corroder.period}턴마다 가장 큰 타일을 절반으로 깎는다`,
  },
  chaos: {
    id: 'chaos',
    name: '혼돈',
    description: `${BOSS_TUNING.chaos.period}턴마다 보드를 뒤섞고 돌 ${BOSS_TUNING.chaos.stones}개를 놓는다`,
  },
};

export interface LockedLine {
  readonly axis: LineAxis;
  readonly index: number;
  /** Moves this line stays sealed for. */
  readonly turnsLeft: number;
}

export interface BossState {
  readonly id: BossId;
  /** Moves between triggers (base period + relic bonus). */
  readonly period: number;
  /** Moves until the next trigger; it fires on the move that brings this to 0. */
  readonly turnsUntil: number;
  /** The warden's sealed line, if any. */
  readonly lock: LockedLine | null;
}

export function createBossState(id: BossId, periodBonus = 0): BossState {
  const period = BOSS_TUNING[id].period + periodBonus;
  return { id, period, turnsUntil: period, lock: null };
}

/** Cell indices of a sealed line (empty set when nothing is sealed). */
export function lockedCells(lock: LockedLine | null, size: number): Set<number> {
  const out = new Set<number>();
  if (!lock) return out;
  for (let i = 0; i < size; i++) {
    out.add(lock.axis === 'row' ? lock.index * size + i : i * size + lock.index);
  }
  return out;
}

/** What the next trigger will do, for the HUD. */
export type BossPreview =
  | { readonly kind: 'lock' }
  | { readonly kind: 'halve'; readonly tileId: TileId | null }
  | { readonly kind: 'shuffle' };

/** The corroder's target: the largest number tile (≥ min value), first in row-major order on ties. */
export function corroderTarget(state: GameState): number | null {
  const max = maxTileValue(state);
  if (max < BOSS_TUNING.corroder.minValue) return null;
  const index = state.cells.findIndex((t) => t?.kind === 'number' && t.value === max);
  return index < 0 ? null : index;
}

export function bossPreview(boss: BossState, state: GameState): BossPreview {
  switch (boss.id) {
    case 'warden':
      return { kind: 'lock' };
    case 'corroder': {
      const index = corroderTarget(state);
      return { kind: 'halve', tileId: index === null ? null : (state.cells[index]?.id ?? null) };
    }
    case 'chaos':
      return { kind: 'shuffle' };
  }
}

export interface BossStep {
  readonly state: GameState;
  readonly boss: BossState;
  readonly events: TurnEvent[];
  /** True if the boss acted this move (a new lock is not ticked on the move it appears). */
  readonly triggered: boolean;
}

/** Counts the boss down by one move and fires its rule when the count reaches 0. */
export function advanceBoss(state: GameState, boss: BossState): BossStep {
  const turnsUntil = boss.turnsUntil - 1;
  if (turnsUntil > 0) return { state, boss: { ...boss, turnsUntil }, events: [], triggered: false };
  const fired = fireBoss(state, { ...boss, turnsUntil: boss.period });
  return { ...fired, triggered: true };
}

function fireBoss(state: GameState, boss: BossState): Omit<BossStep, 'triggered'> {
  const trigger: TurnEvent = { type: 'trigger', source: boss.id, at: null };
  switch (boss.id) {
    case 'warden': {
      let rng: RngState = state.rng;
      const axisRoll = nextInt(rng, 2);
      rng = axisRoll.rng;
      const indexRoll = nextInt(rng, state.size);
      rng = indexRoll.rng;
      const axis: LineAxis = axisRoll.value === 0 ? 'row' : 'col';
      const turns = BOSS_TUNING.warden.lockTurns;
      return {
        state: { ...state, rng },
        boss: { ...boss, lock: { axis, index: indexRoll.value, turnsLeft: turns } },
        events: [trigger, { type: 'lineLock', axis, index: indexRoll.value, turns }],
      };
    }
    case 'corroder': {
      const index = corroderTarget(state);
      if (index === null) return { state, boss, events: [trigger] };
      const tile = state.cells[index] as Tile;
      const cells = state.cells.slice();
      const to = tile.value / 2;
      cells[index] = { ...tile, value: to };
      const at = toPosition(index, state.size);
      return {
        state: { ...state, cells },
        boss,
        events: [
          { ...trigger, at },
          { type: 'valueChange', tileId: tile.id, at, from: tile.value, to },
        ],
      };
    }
    case 'chaos': {
      const shuffled = shuffleBoard(state);
      let next = shuffled.state;
      const events: TurnEvent[] = [trigger, ...shuffled.events];
      for (let i = 0; i < BOSS_TUNING.chaos.stones; i++) {
        const step = spawnOnRandomEmpty(next, 'stone', 0);
        next = step.state;
        events.push(...step.events);
      }
      return { state: next, boss, events };
    }
  }
}

/**
 * Moves every non-frozen tile to a random cell among the cells not held by
 * frozen tiles (ice pins a tile even against chaos). Emits one `shuffle` event
 * listing the tiles that changed cell.
 */
export function shuffleBoard(state: GameState): { state: GameState; events: TurnEvent[] } {
  const movable: { tile: Tile; from: number }[] = [];
  const freeCells: number[] = [];
  state.cells.forEach((tile, index) => {
    if (tile && tile.status.frozenTurns > 0) return;
    freeCells.push(index);
    if (tile) movable.push({ tile, from: index });
  });
  // Fisher–Yates over the free cells; the first `movable.length` become destinations.
  let rng = state.rng;
  const order = freeCells.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const roll = nextInt(rng, i + 1);
    rng = roll.rng;
    const j = roll.value;
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }
  const cells = state.cells.slice();
  for (const index of freeCells) cells[index] = null;
  const moves: { tileId: TileId; from: Position; to: Position }[] = [];
  movable.forEach(({ tile, from }, k) => {
    const to = order[k] as number;
    cells[to] = tile;
    if (to !== from) {
      moves.push({
        tileId: tile.id,
        from: toPosition(from, state.size),
        to: toPosition(to, state.size),
      });
    }
  });
  const events: TurnEvent[] = moves.length > 0 ? [{ type: 'shuffle', moves }] : [];
  return { state: { ...state, cells, rng }, events };
}

/**
 * End-of-move bookkeeping for a sealed line: counts it down unless it was
 * created this move, and releases it at 0.
 */
export function tickLock(
  boss: BossState,
  createdThisMove: boolean,
): { boss: BossState; events: TurnEvent[] } {
  const lock = boss.lock;
  if (!lock || createdThisMove) return { boss, events: [] };
  const turnsLeft = lock.turnsLeft - 1;
  if (turnsLeft > 0) return { boss: { ...boss, lock: { ...lock, turnsLeft } }, events: [] };
  return {
    boss: { ...boss, lock: null },
    events: [{ type: 'lineUnlock', axis: lock.axis, index: lock.index }],
  };
}
