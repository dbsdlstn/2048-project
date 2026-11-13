/**
 * Pure "presenter" functions: turn a `RunState` into the plain models the
 * displays draw (HUD numbers, board marks, screen contents, hints). They hold
 * every player-facing Korean string of the run screens, decide nothing about
 * rules (the core does that), and are unit-tested without a DOM.
 */
import {
  BOSSES,
  HAZARD_INFO,
  RELICS,
  RELIC_TUNING,
  STAGES,
  STAGES_PER_ACT,
  bossPreview,
  currentStage,
  describeGoal,
  goalStatus,
  listTiles,
  maxTileValue,
  moveLimit,
  movesLeft,
  runDirections,
  totalScore,
  type BossId,
  type HazardKind,
  type LineAxis,
  type Position,
  type Rarity,
  type RelicId,
  type RunMode,
  type RunState,
  type TurnEvent,
} from '../core';
import type { BoardMarks } from '../render/marks';

export type { BoardMarks } from '../render/marks';

// ------------------------------------------------------------------ labels

/** "1막 2", "1막 보스" for run stages. */
export function stageTitle(index: number): string {
  const spec = STAGES[index];
  if (!spec) return `스테이지 ${index + 1}`;
  return spec.boss ? `${spec.act}막 보스` : `${spec.act}막 ${(index % STAGES_PER_ACT) + 1}`;
}

/** Two-character label drawn on a relic chip (names are too long for 44 px). */
export const RELIC_SHORT: Readonly<Record<RelicId, string>> = {
  chain: '연쇄',
  resonance: '공명',
  pickaxe: '송곳',
  prismCore: '코어',
  cornerAnchor: '닻',
  spareSpring: '태엽',
  bomb: '분해',
  undo: '역행',
  freezePin: '핀',
  reverseFilter: '필터',
  debrisFuel: '연료',
  twinSeed: '씨앗',
  ignition: '점화',
  delayVeil: '장막',
  leapLens: '렌즈',
  capacitor: '축전',
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
};

export function isRelicId(id: string): id is RelicId {
  return id in RELICS;
}

// ------------------------------------------------------------------ HUD

export interface RelicChip {
  readonly id: RelicId;
  readonly short: string;
  readonly name: string;
  readonly description: string;
  readonly rarity: Rarity;
  /** Active relics are used from a button; passive ones only show info. */
  readonly active: boolean;
  readonly charges: number;
  readonly maxCharges: number;
  /** Whether pressing the button would do something now. */
  readonly usable: boolean;
}

export interface BossInfo {
  readonly id: BossId;
  readonly name: string;
  readonly rule: string;
  /** Moves until the rule fires (1 = on the next move). */
  readonly turnsUntil: number;
  /** What the next trigger does, as far as it is computable. */
  readonly preview: string;
  /** A sealed line right now, e.g. "2행 봉쇄 중 · 1턴 남음". */
  readonly lockText: string | null;
}

export interface HudModel {
  readonly mode: RunMode;
  readonly stageLabel: string;
  /** e.g. "점수 360 달성" or "다음 유물: 128 타일". */
  readonly goalText: string;
  readonly goalCurrent: number;
  readonly goalTarget: number;
  /** 0..1 */
  readonly goalRatio: number;
  readonly goalDone: boolean;
  /** "남은 이동" (run) or "이동" (endless). */
  readonly movesLabel: string;
  readonly movesValue: number;
  /** Few moves left: the HUD warns. */
  readonly movesWarn: boolean;
  readonly score: number;
  readonly boss: BossInfo | null;
  readonly relics: readonly RelicChip[];
  /** Still playing, but no swipe moves the board: a relic must be used. */
  readonly stuck: boolean;
}

/** Moves left at or below which the HUD warns. */
export const LOW_MOVES = 5;

function lockText(axis: LineAxis, index: number, turnsLeft: number): string {
  return `${index + 1}${axis === 'row' ? '행' : '열'} 봉쇄 중 · ${turnsLeft}턴 남음`;
}

export function bossInfo(run: RunState): BossInfo | null {
  const boss = run.boss;
  if (!boss) return null;
  const def = BOSSES[boss.id];
  const preview = bossPreview(boss, run.board);
  let text: string;
  switch (preview.kind) {
    case 'lock':
      text = '다음 발동: 무작위 한 줄 봉쇄';
      break;
    case 'halve': {
      const tile = run.board.cells.find((t) => t?.id === preview.tileId);
      text = tile ? `다음 발동: ${tile.value} → ${tile.value / 2}` : '다음 발동: 깎을 타일 없음';
      break;
    }
    case 'shuffle':
      text = '다음 발동: 보드 섞기 + 돌';
      break;
  }
  return {
    id: boss.id,
    name: def.name,
    rule: def.description,
    turnsUntil: boss.turnsUntil,
    preview: text,
    lockText: boss.lock ? lockText(boss.lock.axis, boss.lock.index, boss.lock.turnsLeft) : null,
  };
}

/** Whether pressing an active relic's button would do something (target picked later). */
function activeUsable(run: RunState, id: RelicId, charges: number): boolean {
  const active = RELICS[id].active;
  if (!active || run.status !== 'playing' || charges <= 0) return false;
  if (active.effect === 'undo') return run.undo !== null;
  return run.board.cells.some(
    (t) => t !== null && (active.effect === 'destroy' || t.kind !== 'stone'),
  );
}

export function relicChips(run: RunState): RelicChip[] {
  return run.relics.map((r) => {
    const def = RELICS[r.id];
    return {
      id: r.id,
      short: RELIC_SHORT[r.id],
      name: def.name,
      description: def.description,
      rarity: def.rarity,
      active: def.active !== undefined,
      charges: r.charges,
      maxCharges: def.active?.maxCharges ?? 0,
      usable: activeUsable(run, r.id, r.charges),
    };
  });
}

export function hudModel(run: RunState): HudModel {
  const relics = relicChips(run);
  const stuck = run.status === 'playing' && runDirections(run).length === 0;
  const spec = currentStage(run);
  if (run.mode === 'run' && spec) {
    const goal = goalStatus(spec.goal, run.progress);
    const left = movesLeft(run) ?? 0;
    const limit = moveLimit(run) ?? 1;
    return {
      mode: 'run',
      stageLabel: stageTitle(run.stageIndex),
      goalText: describeGoal(spec.goal),
      goalCurrent: goal.current,
      goalTarget: goal.target,
      goalRatio: goal.target > 0 ? goal.current / goal.target : 1,
      goalDone: goal.done,
      movesLabel: '남은 이동',
      movesValue: left,
      movesWarn: run.status === 'playing' && left <= Math.max(LOW_MOVES, Math.ceil(limit * 0.08)),
      score: totalScore(run),
      boss: bossInfo(run),
      relics,
      stuck,
    };
  }
  const max = maxTileValue(run.board);
  return {
    mode: 'endless',
    stageLabel: '무한',
    goalText: `다음 유물: ${run.nextOfferTile} 타일`,
    goalCurrent: max,
    goalTarget: run.nextOfferTile,
    // Tiles double, so progress is measured in steps of the exponent.
    goalRatio: max > 0 ? Math.min(1, Math.log2(max) / Math.log2(run.nextOfferTile)) : 0,
    goalDone: false,
    movesLabel: '이동',
    movesValue: run.board.turn,
    movesWarn: false,
    score: totalScore(run),
    boss: null,
    relics,
    stuck,
  };
}

// ------------------------------------------------------------------ board marks

/** Cells a tile-targeted relic accepts (same rule as `canUseActive`). */
export function targetCells(run: RunState, relic: RelicId): Position[] {
  const effect = RELICS[relic].active?.effect;
  return listTiles(run.board)
    .filter(({ tile }) => effect === 'destroy' || (effect === 'freeze' && tile.kind !== 'stone'))
    .map(({ pos }) => pos);
}

export function boardMarks(run: RunState, targeting: RelicId | null): BoardMarks {
  const boss = run.boss;
  let bossTarget: BoardMarks['bossTarget'] = null;
  if (boss && run.status === 'playing') {
    const preview = bossPreview(boss, run.board);
    if (preview.kind === 'halve' && preview.tileId !== null) {
      bossTarget = { tileId: preview.tileId, turnsUntil: boss.turnsUntil };
    }
  }
  return {
    lock: boss?.lock
      ? { axis: boss.lock.axis, index: boss.lock.index, turnsLeft: boss.lock.turnsLeft }
      : null,
    bossTarget,
    targeting: targeting
      ? {
          effect: RELICS[targeting].active?.effect === 'freeze' ? 'freeze' : 'destroy',
          cells: targetCells(run, targeting),
        }
      : null,
  };
}

// ------------------------------------------------------------------ screens

export interface OfferCard {
  readonly id: RelicId;
  readonly name: string;
  readonly description: string;
  readonly rarity: Rarity;
  readonly rarityLabel: string;
  readonly active: boolean;
}

export interface RunSummary {
  readonly mode: RunMode;
  /** Run: stage reached ("2막 3"); endless: largest tile. */
  readonly reached: string;
  readonly stagesCleared: number;
  readonly score: number;
  readonly bestTile: number;
  readonly moves: number;
  readonly relics: readonly string[];
}

export interface Records {
  /** Run mode: most stages cleared in one run. */
  readonly runBestStages: number;
  readonly runBestScore: number;
  readonly endlessBestScore: number;
  readonly endlessBestTile: number;
}

export const EMPTY_RECORDS: Records = {
  runBestStages: 0,
  runBestScore: 0,
  endlessBestScore: 0,
  endlessBestTile: 0,
};

export type ScreenModel =
  | { readonly kind: 'menu'; readonly records: Records }
  | { readonly kind: 'playing' }
  | {
      readonly kind: 'targeting';
      readonly relic: RelicId;
      readonly prompt: string;
      /** Set after a tap on a cell the relic cannot take. */
      readonly error: string | null;
    }
  | { readonly kind: 'paused' }
  | {
      readonly kind: 'offer';
      readonly title: string;
      readonly subtitle: string;
      readonly cards: readonly OfferCard[];
    }
  | {
      readonly kind: 'result';
      readonly outcome: 'victory' | 'failed' | 'over';
      readonly title: string;
      readonly reason: string;
      readonly summary: RunSummary;
      readonly newRecord: boolean;
    };

export type ScreenKind = ScreenModel['kind'];

export function offerCards(run: RunState): OfferCard[] {
  return run.offer.map((id) => {
    const def = RELICS[id];
    return {
      id,
      name: def.name,
      description: def.description,
      rarity: def.rarity,
      rarityLabel: RARITY_LABEL[def.rarity],
      active: def.active !== undefined,
    };
  });
}

export function offerScreen(run: RunState): ScreenModel {
  if (run.mode === 'run') {
    return {
      kind: 'offer',
      title: `${stageTitle(run.stageIndex)} 클리어`,
      subtitle: run.offer.length > 0 ? '유물 하나를 고르세요' : '지금 고를 수 있는 유물이 없어요',
      cards: offerCards(run),
    };
  }
  return {
    kind: 'offer',
    title: `${maxTileValue(run.board)} 타일 도달`,
    subtitle: '유물 하나를 고르세요',
    cards: offerCards(run),
  };
}

export function runSummary(run: RunState): RunSummary {
  const relics = run.relics.map((r) => RELICS[r.id].name);
  const bestTile = maxTileValue(run.board);
  if (run.mode === 'run') {
    const cleared = run.status === 'victory' ? STAGES.length : run.stageIndex;
    return {
      mode: 'run',
      reached: stageTitle(run.stageIndex),
      stagesCleared: cleared,
      score: totalScore(run),
      bestTile,
      moves: run.progress.movesUsed,
      relics,
    };
  }
  return {
    mode: 'endless',
    reached: `${bestTile} 타일`,
    stagesCleared: run.stageIndex,
    score: totalScore(run),
    bestTile,
    moves: run.board.turn,
    relics,
  };
}

export function resultScreen(run: RunState, newRecord: boolean): ScreenModel {
  const summary = runSummary(run);
  if (run.status === 'victory') {
    return {
      kind: 'result',
      outcome: 'victory',
      title: '균열 봉인 완료',
      reason: `${STAGES.length}개 스테이지를 모두 클리어했어요`,
      summary,
      newRecord,
    };
  }
  const reason =
    run.failReason === 'moves' ? '이동 횟수를 모두 썼어요' : '더 이상 움직일 수 없어요';
  return {
    kind: 'result',
    outcome: run.mode === 'run' ? 'failed' : 'over',
    title: run.mode === 'run' ? '런 실패' : '게임 종료',
    reason,
    summary,
    newRecord,
  };
}

/** Records after a finished (or ongoing) run; returns the same object if nothing improved. */
export function updateRecords(records: Records, run: RunState): Records {
  const score = totalScore(run);
  if (run.mode === 'run') {
    const cleared = run.status === 'victory' ? STAGES.length : run.stageIndex;
    if (cleared <= records.runBestStages && score <= records.runBestScore) return records;
    return {
      ...records,
      runBestStages: Math.max(records.runBestStages, cleared),
      runBestScore: Math.max(records.runBestScore, score),
    };
  }
  const tile = maxTileValue(run.board);
  if (score <= records.endlessBestScore && tile <= records.endlessBestTile) return records;
  return {
    ...records,
    endlessBestScore: Math.max(records.endlessBestScore, score),
    endlessBestTile: Math.max(records.endlessBestTile, tile),
  };
}

export function targetingPrompt(relic: RelicId): string {
  const effect = RELICS[relic].active?.effect;
  return effect === 'freeze'
    ? `얼릴 타일을 누르세요 (${RELIC_TUNING.pinTurns}턴 고정)`
    : '없앨 타일을 누르세요';
}

// ------------------------------------------------------------------ hints and banners

export interface Hint {
  /** Stable key; each hint is shown once (stage 4 persists the seen set). */
  readonly key: string;
  readonly title: string;
  readonly text: string;
}

export function hazardHint(kind: HazardKind): Hint {
  const info = HAZARD_INFO[kind];
  return { key: `hazard:${kind}`, title: `새 방해: ${info.name}`, text: info.description };
}

export function bossHint(id: BossId): Hint {
  const def = BOSSES[id];
  return { key: `boss:${id}`, title: `보스: ${def.name}`, text: def.description };
}

/** Hints due when a stage begins: its new hazard and its boss. */
export function stageStartHints(run: RunState): Hint[] {
  const spec = currentStage(run);
  const out: Hint[] = [];
  if (spec?.introduces) out.push(hazardHint(spec.introduces));
  if (spec?.boss) out.push(bossHint(spec.boss));
  return out;
}

/** Hazards that show up in a step's events (endless ramps them in over time). */
export function hazardsInEvents(events: readonly TurnEvent[]): HazardKind[] {
  const out = new Set<HazardKind>();
  for (const e of events) {
    if (e.type === 'spawn' && e.kind === 'stone') out.add('stone');
    else if (e.type === 'statusChange' && e.cause === 'ice') out.add('ice');
    else if (e.type === 'statusChange' && e.cause === 'curse') out.add('curse');
  }
  return [...out];
}

export interface StageBanner {
  readonly title: string;
  readonly detail: string;
}

export function stageBanner(run: RunState): StageBanner {
  const spec = currentStage(run);
  if (run.mode === 'endless' || !spec) {
    return { title: '무한 모드', detail: '움직일 수 없을 때까지 · 큰 타일마다 유물' };
  }
  const limit = moveLimit(run) ?? spec.moveLimit;
  const boss = spec.boss ? ` · 보스 ${BOSSES[spec.boss].name}` : '';
  return {
    title: stageTitle(run.stageIndex),
    detail: `${describeGoal(spec.goal)} · 이동 ${limit}${boss}`,
  };
}
