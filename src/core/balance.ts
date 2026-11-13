/**
 * Tunable game numbers live here so balancing never requires touching logic.
 * The stage table and relic numbers were tuned with the bot simulator
 * (`npm run sim`, see docs/STUDY.md "시뮬레이션으로 밸런스 잡기").
 */
import type { BossId } from './bosses';
import type { HazardParams } from './hazards';
import type { StageSpec } from './stage';

export interface CoreRules {
  /** Board is `boardSize` x `boardSize`. */
  readonly boardSize: number;
  /** Number of tiles spawned when a new game starts. */
  readonly startTiles: number;
  /** Probability that a spawned number tile is a 4 instead of a 2. */
  readonly fourChance: number;
}

export const DEFAULT_RULES: CoreRules = {
  boardSize: 4,
  startTiles: 2,
  fourChance: 0.1,
};

export const BOSS_TUNING: Readonly<
  Record<
    BossId,
    {
      readonly period: number;
      readonly lockTurns: number;
      readonly minValue: number;
      readonly stones: number;
    }
  >
> = {
  /** 봉쇄자: seals one random row or column. */
  warden: { period: 5, lockTurns: 2, minValue: 0, stones: 0 },
  /** 부식자: halves the largest tile (only if it is at least `minValue`). */
  corroder: { period: 4, lockTurns: 0, minValue: 8, stones: 0 },
  /** 혼돈: shuffles the board and drops `stones` stones. */
  chaos: { period: 5, lockTurns: 0, minValue: 0, stones: 1 },
};

/** Hazard presets used by the stage table (spread and overridden per stage). */
const H = {
  none: {
    startStones: 0,
    stoneChance: 0,
    maxStones: 0,
    iceChance: 0,
    iceTurns: 0,
    curseChance: 0,
  },
} satisfies Record<string, HazardParams>;

/**
 * The run: 3 acts × (3 normal stages + 1 boss). Act 1 doubles as the tutorial:
 * stage 1 has no hazards, stage 2 introduces stone, stage 3 ice; curse arrives
 * in act 2. The board resets at every stage; relics carry over.
 *
 * Tuned in two passes (docs/STUDY.md 6.5 and 9.4): shorter stages, more stones
 * (board pressure makes 'stuck' a real way to lose), a stone stage that needs ten
 * deliberate breaks; the first score goal is reachable without relics, the later
 * ones (2-보스, 3-3) expect a build, since a run holds 7–10 relics by then.
 */
export const STAGE_TABLE: readonly StageSpec[] = [
  // Act 1: the tutorial. Merge (1), break stones on purpose (2), work around ice (3), seal (boss).
  {
    act: 1,
    goal: { type: 'tile', value: 64 },
    moveLimit: 70,
    hazards: H.none,
    boss: null,
    introduces: null,
  },
  {
    act: 1,
    goal: { type: 'stones', count: 10 },
    moveLimit: 55,
    hazards: { ...H.none, startStones: 2, stoneChance: 0.3, maxStones: 2 },
    boss: null,
    introduces: 'stone',
  },
  {
    act: 1,
    goal: { type: 'tile', value: 64 },
    moveLimit: 65,
    hazards: { ...H.none, stoneChance: 0.2, maxStones: 5, iceChance: 0.1, iceTurns: 3 },
    boss: null,
    introduces: 'ice',
  },
  {
    act: 1,
    goal: { type: 'tile', value: 128 },
    moveLimit: 120,
    hazards: { ...H.none, stoneChance: 0.2, maxStones: 5, iceChance: 0.06, iceTurns: 3 },
    boss: 'warden',
    introduces: null,
  },
  // Act 2
  {
    act: 2,
    goal: { type: 'score', target: 700 },
    moveLimit: 90,
    hazards: {
      ...H.none,
      stoneChance: 0.08,
      maxStones: 3,
      iceChance: 0.06,
      iceTurns: 3,
      curseChance: 0.1,
    },
    boss: null,
    introduces: 'curse',
  },
  {
    act: 2,
    goal: { type: 'stones', count: 10 },
    moveLimit: 60,
    hazards: {
      ...H.none,
      startStones: 3,
      stoneChance: 0.3,
      maxStones: 3,
      iceChance: 0.05,
      iceTurns: 3,
      curseChance: 0.05,
    },
    boss: null,
    introduces: null,
  },
  {
    act: 2,
    goal: { type: 'tile', value: 128 },
    moveLimit: 105,
    hazards: {
      ...H.none,
      stoneChance: 0.28,
      maxStones: 7,
      iceChance: 0.06,
      iceTurns: 3,
      curseChance: 0.05,
    },
    boss: null,
    introduces: null,
  },
  {
    act: 2,
    goal: { type: 'score', target: 1050 },
    moveLimit: 110,
    hazards: {
      ...H.none,
      stoneChance: 0.22,
      maxStones: 6,
      iceChance: 0.05,
      iceTurns: 3,
      curseChance: 0.08,
    },
    boss: 'corroder',
    introduces: null,
  },
  // Act 3
  {
    act: 3,
    goal: { type: 'tile', value: 128 },
    moveLimit: 105,
    hazards: {
      ...H.none,
      stoneChance: 0.28,
      maxStones: 7,
      iceChance: 0.12,
      iceTurns: 3,
      curseChance: 0.06,
    },
    boss: null,
    introduces: null,
  },
  {
    act: 3,
    goal: { type: 'stones', count: 16 },
    moveLimit: 80,
    hazards: {
      ...H.none,
      startStones: 4,
      stoneChance: 0.3,
      maxStones: 4,
      iceChance: 0.07,
      iceTurns: 3,
      curseChance: 0.07,
    },
    boss: null,
    introduces: null,
  },
  {
    act: 3,
    goal: { type: 'score', target: 1500 },
    moveLimit: 110,
    hazards: {
      ...H.none,
      stoneChance: 0.2,
      maxStones: 6,
      iceChance: 0.08,
      iceTurns: 4,
      curseChance: 0.1,
    },
    boss: null,
    introduces: null,
  },
  {
    act: 3,
    goal: { type: 'tile', value: 256 },
    moveLimit: 170,
    hazards: {
      ...H.none,
      stoneChance: 0.08,
      maxStones: 4,
      iceChance: 0.06,
      iceTurns: 3,
      curseChance: 0.06,
    },
    boss: 'chaos',
    introduces: null,
  },
];

/** Endless mode: hazard chances grow linearly with moves played, up to a cap. */
export const ENDLESS_TUNING = {
  /** The first relic offer comes when the largest tile first reaches this. */
  firstOfferTile: 64,
  /** Hazards start after this many moves. */
  graceTurns: 30,
  stoneChancePerTurn: 0.0004,
  stoneChanceMax: 0.12,
  maxStones: 4,
  iceChancePerTurn: 0.0003,
  iceChanceMax: 0.08,
  iceTurns: 3,
  curseChancePerTurn: 0.0003,
  curseChanceMax: 0.08,
} as const;

/** Numbers that relic descriptions and hooks share. */
export const RELIC_TUNING = {
  /** 연쇄 회로: extra merge passes per move. */
  chainDepth: 2,
  /** 공명 증폭기: bonus per extra merge in one move, as a fraction of that move's merge score. */
  comboBonus: 0.3,
  /** 균열 송곳: merges of at least this value also break diagonal stones. */
  pickaxeMinValue: 8,
  /** 프리즘 코어: a prism replaces the regular spawn every this many moves. */
  prismEvery: 12,
  /** 모서리 닻: score multiplier for merges on a corner cell. */
  cornerFactor: 1.5,
  /** 여분 태엽: extra moves per stage. */
  extraMoves: 6,
  /** 역상 필터: score multiplier for merges involving a frozen or cursed tile. */
  statusFactor: 3,
  /** 잔해 연료: one move back for every this-many stones broken (the rest carries over within a stage). */
  stonesPerMove: 2,
  /** 쌍둥이 씨앗: added chance that a spawn is a 4. */
  fourChanceBonus: 0.1,
  /** 점화 플러그: value of the tile placed at stage start. */
  igniteValue: 32,
  /** 지연 장막: added moves between boss triggers. */
  bossDelay: 2,
  /** 도약 렌즈: the first this-many merges of a stage double their result. */
  lensMerges: 3,
  /** 축전 코일: merges needed per charge. */
  mergesPerCharge: 8,
  /** 정지 핀: moves a pinned tile stays frozen. */
  pinTurns: 3,
} as const;

/** Offer weight per rarity (3 relics are drawn without replacement). */
export const RARITY_WEIGHT = { common: 3, uncommon: 2, rare: 1 } as const;

/** Relics offered after each cleared stage (or endless milestone). */
export const OFFER_SIZE = 3;
