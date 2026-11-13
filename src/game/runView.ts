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
import type { DailyRecord, RunSlot, SavedRun, Settings } from '../save/store';
import { dailyLabel } from './daily';

export type { BoardMarks } from '../render/marks';

const numberFormat = new Intl.NumberFormat('ko-KR');
const fmt = (n: number): string => numberFormat.format(n);

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
  /** A sealed line right now, e.g. "2행 봉쇄 중". */
  readonly lockText: string | null;
  /**
   * The big counter: moves until the sealed line opens while one is sealed,
   * else moves until the next trigger. `countLabel` says which.
   */
  readonly count: number;
  readonly countLabel: string;
  /** The rule fires on the next move (the panel glows). */
  readonly imminent: boolean;
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
  /** Score goals: where the bar would end at the stage's pace so far (null early on / other goals). */
  readonly pace: Pace | null;
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

export interface Pace {
  /** Projected end of the bar, 0..1 of the goal (capped at 1). */
  readonly projectedRatio: number;
  /** Whether the projection reaches the goal. */
  readonly onTrack: boolean;
  /** Screen-reader / tooltip text, e.g. "지금 속도면 약 340점". */
  readonly label: string;
}

/** Moves of a stage before the pace projection shows (too noisy before). */
export const PACE_FROM_MOVE = 4;

/**
 * Score goal pace: the stage's points per move so far, carried over the moves
 * left. Score per move grows as tiles get bigger, so this errs on the safe side.
 */
export function scorePace(run: RunState): Pace | null {
  const spec = currentStage(run);
  if (spec?.goal.type !== 'score' || run.status !== 'playing') return null;
  const { score, movesUsed } = run.progress;
  if (movesUsed < PACE_FROM_MOVE || score >= spec.goal.target) return null;
  const projected = Math.round(score + (score / movesUsed) * (movesLeft(run) ?? 0));
  return {
    projectedRatio: Math.min(1, projected / spec.goal.target),
    onTrack: projected >= spec.goal.target,
    label: `지금 속도면 약 ${projected}점`,
  };
}

function lockText(axis: LineAxis, index: number): string {
  return `${index + 1}${axis === 'row' ? '행' : '열'} 봉쇄 중`;
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
  const lock = boss.lock;
  return {
    id: boss.id,
    name: def.name,
    rule: def.description,
    turnsUntil: boss.turnsUntil,
    preview: text,
    lockText: lock ? lockText(lock.axis, lock.index) : null,
    count: lock ? lock.turnsLeft : boss.turnsUntil,
    countLabel: lock ? '봉쇄 해제까지' : '발동까지',
    imminent: !lock && boss.turnsUntil <= 1,
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
      pace: scorePace(run),
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
    pace: null,
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

/** A saved run the menu offers to continue. */
export interface ContinueInfo {
  readonly slot: RunSlot;
  /** e.g. "1막 3 · 1,234점" */
  readonly label: string;
}

/** The daily challenge entry on the menu. */
export interface DailyInfo {
  /** `YYYY-MM-DD` */
  readonly date: string;
  /** "11월 13일" */
  readonly label: string;
  /** Today's best, e.g. "2스테이지 · 1,234점", or null before the first attempt. */
  readonly best: string | null;
  readonly attempts: number;
}

/** Where a help / settings sheet returns to. */
export type SheetOrigin = 'menu' | 'paused';

export interface HelpItem {
  readonly name: string;
  readonly text: string;
}

export interface HelpSection {
  readonly title: string;
  readonly items: readonly HelpItem[];
}

export type ScreenModel =
  | {
      readonly kind: 'menu';
      readonly records: Records;
      readonly continues: readonly ContinueInfo[];
      readonly daily: DailyInfo;
    }
  | { readonly kind: 'help'; readonly sections: readonly HelpSection[]; readonly back: SheetOrigin }
  | {
      readonly kind: 'settings';
      readonly settings: Settings;
      readonly back: SheetOrigin;
      /** "도움말 다시 보기" was just pressed (the button confirms it). */
      readonly hintsReset: boolean;
      /** False when the browser refused to save (private mode, full storage). */
      readonly storageOk: boolean;
      /** Whether this device can vibrate (the switch is hidden otherwise, e.g. on iOS). */
      readonly hapticsAvailable: boolean;
      /** The device asks for reduced motion (what "자동" follows). */
      readonly systemReducedMotion: boolean;
    }
  | {
      /** Starting a new game would discard the saved one in `slot`. */
      readonly kind: 'confirm';
      readonly slot: RunSlot;
      readonly title: string;
      readonly text: string;
    }
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
      /** First offer of a player's life: what relics are (shown once). */
      readonly tip: string | null;
    }
  | {
      readonly kind: 'result';
      readonly outcome: 'victory' | 'failed' | 'over';
      readonly title: string;
      readonly reason: string;
      readonly summary: RunSummary;
      /** "새 최고 기록!" / "오늘의 최고 기록!", or null. */
      readonly record: string | null;
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

export function offerScreen(run: RunState, tip: string | null = null): ScreenModel {
  if (run.mode === 'run') {
    return {
      kind: 'offer',
      title: `${stageTitle(run.stageIndex)} 클리어`,
      subtitle: run.offer.length > 0 ? '유물 하나를 고르세요' : '지금 고를 수 있는 유물이 없어요',
      cards: offerCards(run),
      tip,
    };
  }
  return {
    kind: 'offer',
    title: `${maxTileValue(run.board)} 타일 도달`,
    subtitle: '유물 하나를 고르세요',
    cards: offerCards(run),
    tip,
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

export function resultScreen(run: RunState, record: string | null): ScreenModel {
  const summary = runSummary(run);
  if (run.status === 'victory') {
    return {
      kind: 'result',
      outcome: 'victory',
      title: '균열 봉인 완료',
      reason: `${STAGES.length}개 스테이지를 모두 클리어했어요`,
      summary,
      record,
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
    record,
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

/** Stages cleared in a run-mode run so far. */
export function stagesCleared(run: RunState): number {
  return run.status === 'victory' ? STAGES.length : run.stageIndex;
}

/** Menu label of a saved run: "1막 3 · 1,234점" or "512 타일 · 3,456점". */
export function savedRunLabel(saved: SavedRun): string {
  const run = saved.run;
  const where = run.mode === 'run' ? stageTitle(run.stageIndex) : `${maxTileValue(run.board)} 타일`;
  return `${where} · ${fmt(totalScore(run))}점`;
}

export function dailyInfo(date: string, record: DailyRecord | null): DailyInfo {
  const best =
    record && record.attempts > 0 && (record.bestScore > 0 || record.bestStages > 0)
      ? record.won
        ? `클리어 · ${fmt(record.bestScore)}점`
        : `${record.bestStages}스테이지 · ${fmt(record.bestScore)}점`
      : null;
  return { date, label: dailyLabel(date), best, attempts: record?.attempts ?? 0 };
}

const SLOT_NAME: Readonly<Record<RunSlot, string>> = {
  run: '런',
  endless: '무한 모드',
  daily: '오늘의 도전',
};

export function confirmNewScreen(slot: RunSlot): ScreenModel {
  return {
    kind: 'confirm',
    slot,
    title: '새로 시작할까요?',
    text: `진행 중이던 ${SLOT_NAME[slot]} 판은 지워져요`,
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
  /** Stable key; each hint is shown once (the seen set is saved). */
  readonly key: string;
  readonly title: string;
  readonly text: string;
}

/** First-run lessons that are not about a hazard or boss. Shared with the help sheet. */
export const LESSONS = {
  swipe: {
    key: 'lesson:swipe',
    title: '밀어서 합치기',
    text: '화면 어디서나 밀면 타일이 움직이고, 같은 수끼리 합쳐져요',
  },
  activeRelic: {
    key: 'lesson:active',
    title: '사용 유물',
    text: '아래 버튼으로 직접 써요. 스테이지가 시작할 때마다 충전돼요',
  },
  offer: {
    key: 'lesson:offer',
    title: '유물',
    text: "고른 유물은 런이 끝날 때까지 유지돼요. '사용' 표시는 직접 눌러 쓰는 유물이에요",
  },
} as const satisfies Record<string, Hint>;

export function hazardHint(kind: HazardKind): Hint {
  const info = HAZARD_INFO[kind];
  return { key: `hazard:${kind}`, title: `새 방해: ${info.name}`, text: info.description };
}

export function bossHint(id: BossId): Hint {
  const def = BOSSES[id];
  return { key: `boss:${id}`, title: `보스: ${def.name}`, text: def.description };
}

/** Hints due when a stage begins: how to move (first stage only), its new hazard and its boss. */
export function stageStartHints(run: RunState): Hint[] {
  const spec = currentStage(run);
  const out: Hint[] = [];
  if (run.stageIndex === 0 && run.progress.movesUsed === 0) out.push(LESSONS.swipe);
  if (spec?.introduces) out.push(hazardHint(spec.introduces));
  if (spec?.boss) out.push(bossHint(spec.boss));
  return out;
}

/** Hints due after any step: hazards that showed up (endless ramps them in), owned active relics. */
export function stepHints(run: RunState, events: readonly TurnEvent[]): Hint[] {
  const out = hazardsInEvents(events).map(hazardHint);
  if (run.status === 'playing' && run.relics.some((r) => RELICS[r.id].active)) {
    out.push(LESSONS.activeRelic);
  }
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
  /** The goal, large: "64 타일 만들기". */
  readonly goal: string;
  /** Move limit and boss: "이동 65번 안에 · 보스 봉쇄자". */
  readonly detail: string;
}

export function stageBanner(run: RunState): StageBanner {
  const spec = currentStage(run);
  if (run.mode === 'endless' || !spec) {
    return { title: '무한 모드', goal: '움직일 수 없을 때까지', detail: '큰 타일마다 유물' };
  }
  const limit = moveLimit(run) ?? spec.moveLimit;
  const boss = spec.boss ? ` · 보스 ${BOSSES[spec.boss].name}` : '';
  return {
    title: stageTitle(run.stageIndex),
    goal: describeGoal(spec.goal),
    detail: `이동 ${limit}번 안에${boss}`,
  };
}

// ------------------------------------------------------------------ help sheet

/**
 * The "게임 방법" sheet. Built from the same sources as the in-game hints
 * (`HAZARD_INFO`, `BOSSES`, `LESSONS`, the tuning numbers), so the two cannot drift.
 */
export function helpSections(): HelpSection[] {
  const acts = Math.ceil(STAGES.length / STAGES_PER_ACT);
  return [
    {
      title: '기본',
      items: [
        { name: LESSONS.swipe.title, text: `${LESSONS.swipe.text}. 밀 때마다 2나 4가 하나 나와요` },
        {
          name: '목표',
          text: '스테이지마다 목표(점수, 타일, 돌 부수기)를 이동 횟수 안에 채우면 클리어. 이동을 다 쓰거나 더 움직일 수 없으면 런이 끝나요',
        },
        {
          name: '런',
          text: `${acts}막 × ${STAGES_PER_ACT}스테이지, 막의 마지막은 보스예요. 스테이지마다 보드는 새로 시작하고 유물과 점수는 이어져요`,
        },
        {
          name: '예상 막대',
          text: '점수 목표의 옅은 막대는 지금 속도로 남은 이동을 다 썼을 때의 예상 점수예요',
        },
      ],
    },
    {
      title: '방해 타일',
      items: (Object.keys(HAZARD_INFO) as HazardKind[]).map((k) => ({
        name: HAZARD_INFO[k].name,
        text: HAZARD_INFO[k].description,
      })),
    },
    {
      title: '보스',
      items: (Object.keys(BOSSES) as BossId[]).map((id) => ({
        name: BOSSES[id].name,
        text: BOSSES[id].description,
      })),
    },
    {
      title: '유물',
      items: [
        { name: LESSONS.offer.title, text: LESSONS.offer.text },
        { name: LESSONS.activeRelic.title, text: LESSONS.activeRelic.text },
        {
          name: '희귀도',
          text: `${RARITY_LABEL.common} · ${RARITY_LABEL.uncommon} · ${RARITY_LABEL.rare} 순으로 드물게 나와요`,
        },
      ],
    },
    {
      title: '모드',
      items: [
        {
          name: '무한 모드',
          text: '움직일 수 없을 때까지. 가장 큰 타일이 64, 128…에 닿을 때마다 유물을 골라요',
        },
        {
          name: '오늘의 도전',
          text: '날짜로 정해진 런. 그날은 모두가 같은 보드와 첫 유물로 시작하고, 하루 최고 기록이 남아요',
        },
      ],
    },
  ];
}
