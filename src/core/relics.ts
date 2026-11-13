/**
 * Relics: data-driven definitions with optional hooks. The turn engine
 * (`turn.ts`) and the run (`run.ts`) call the hooks at fixed points; a relic
 * never knows about any other relic. Hooks only read and change shared numbers
 * (merge value/score, moves, spawn odds, charges, boss period, chain depth)
 * and shared keywords (stone, ice, curse, corner, prism), which is what lets
 * independently designed relics combine.
 *
 * Every hook is a pure function of (context, own instance) returning data:
 * a new counter value and/or a list of effects for the engine to apply.
 */
import { DEFAULT_RULES, OFFER_SIZE, RARITY_WEIGHT, RELIC_TUNING as T } from './balance';
import { nextFloat, type RngState } from './rng';
import type { Keyword } from './stage';
import type { Position } from './types';

export type RelicId =
  | 'chain'
  | 'resonance'
  | 'pickaxe'
  | 'prismCore'
  | 'cornerAnchor'
  | 'spareSpring'
  | 'bomb'
  | 'undo'
  | 'freezePin'
  | 'reverseFilter'
  | 'debrisFuel'
  | 'twinSeed'
  | 'ignition'
  | 'delayVeil'
  | 'leapLens'
  | 'capacitor';

export type Rarity = keyof typeof RARITY_WEIGHT;

/** An owned relic. Plain data: saved with the run. */
export interface RelicInstance {
  readonly id: RelicId;
  /** Charges left (active relics only; 0 otherwise). */
  readonly charges: number;
  /** Free per-relic counter for hooks (moves until prism, merges used this stage…). */
  readonly counter: number;
}

/** Numbers relics may change. Derived fresh every move from the owned relics. */
export interface TurnRules {
  readonly fourChance: number;
  /** Extra merge passes per move (0 = plain 2048). */
  readonly chainDepth: number;
  /** Merges of at least this value also break diagonal stones (null = off). */
  readonly diagonalBreakFrom: number | null;
  readonly moveLimitBonus: number;
  readonly bossPeriodBonus: number;
}

export const BASE_TURN_RULES: TurnRules = {
  fourChance: DEFAULT_RULES.fourChance,
  chainDepth: 0,
  diagonalBreakFrom: null,
  moveLimitBonus: 0,
  bossPeriodBonus: 0,
};

export interface MergeHookContext {
  /** Result value before relic factors and curse. */
  readonly value: number;
  readonly at: Position;
  /** True when the merge landed on a corner cell. */
  readonly corner: boolean;
  /** True when either source tile was frozen or cursed. */
  readonly withStatus: boolean;
}

export interface MergeMod {
  readonly valueFactor?: number;
  readonly scoreFactor?: number;
}

export type RelicEffect =
  | { readonly kind: 'score'; readonly amount: number }
  | { readonly kind: 'bonusMoves'; readonly amount: number }
  /** Adds charges to every owned active relic (up to its maximum). */
  | { readonly kind: 'charge'; readonly amount: number }
  /** Places a number tile on a random empty cell. */
  | { readonly kind: 'placeTile'; readonly value: number }
  /** Turns this move's regular spawn into a prism. */
  | { readonly kind: 'spawnPrism' };

export interface HookOutcome {
  readonly counter?: number;
  readonly effects?: readonly RelicEffect[];
}

export interface TurnEndContext {
  /** Merges made this move (slide + chains). */
  readonly merges: number;
  /** Score those merges produced. */
  readonly mergeScore: number;
}

export type ActiveEffect = 'destroy' | 'undo' | 'freeze';

export interface ActiveSpec {
  readonly effect: ActiveEffect;
  readonly maxCharges: number;
  /** Charges regained at every stage start (endless: every relic pick). */
  readonly rechargePerStage: number;
  /** Whether the player must pick a tile. */
  readonly target: 'tile' | 'none';
}

/** What the offer filter knows: keywords still ahead in this run, plus what owned relics provide. */
export interface OfferContext {
  readonly has: (keyword: Keyword) => boolean;
}

export interface RelicDef {
  readonly id: RelicId;
  /** Korean display name. */
  readonly name: string;
  /** One-line Korean description. */
  readonly description: string;
  readonly rarity: Rarity;
  /** Keywords this relic adds to the run (e.g. a freezing tool provides 'ice'). */
  readonly grants?: readonly Keyword[];
  readonly active?: ActiveSpec;
  /** "No dead picks": offered only when this returns true (default: always). */
  readonly isUseful?: (ctx: OfferContext) => boolean;
  readonly modifyRules?: (rules: TurnRules) => TurnRules;
  readonly onMerge?: (
    ctx: MergeHookContext,
    self: RelicInstance,
  ) => { readonly mod: MergeMod; readonly counter?: number } | null;
  readonly onStoneBreak?: (count: number, self: RelicInstance) => HookOutcome | null;
  /** Called once per move, before the regular spawn. */
  readonly onSpawn?: (self: RelicInstance) => HookOutcome | null;
  readonly onTurnEnd?: (ctx: TurnEndContext, self: RelicInstance) => HookOutcome | null;
  readonly onStageStart?: (self: RelicInstance) => HookOutcome | null;
}

const pct = (x: number): number => Math.round(x * 100);

const DEFS: readonly RelicDef[] = [
  {
    id: 'chain',
    name: '연쇄 회로',
    description: `합체로 생긴 타일이 같은 수와 맞닿으면 이어서 합체한다 (최대 ${T.chainDepth}번)`,
    rarity: 'rare',
    modifyRules: (r) => ({ ...r, chainDepth: r.chainDepth + T.chainDepth }),
  },
  {
    id: 'resonance',
    name: '공명 증폭기',
    description: `한 이동에서 합체가 1번 더 날 때마다 그 이동의 합체 점수 +${pct(T.comboBonus)}%`,
    rarity: 'uncommon',
    isUseful: (c) => c.has('scoreGoal'),
    onTurnEnd: (ctx) =>
      ctx.merges >= 2
        ? {
            effects: [
              {
                kind: 'score',
                amount: Math.floor(ctx.mergeScore * T.comboBonus * (ctx.merges - 1)),
              },
            ],
          }
        : null,
  },
  {
    id: 'pickaxe',
    name: '균열 송곳',
    description: `${T.pickaxeMinValue} 이상을 만든 합체는 대각선 이웃의 돌까지 부순다`,
    rarity: 'uncommon',
    isUseful: (c) => c.has('stone'),
    modifyRules: (r) => ({
      ...r,
      diagonalBreakFrom: Math.min(r.diagonalBreakFrom ?? Infinity, T.pickaxeMinValue),
    }),
  },
  {
    id: 'prismCore',
    name: '프리즘 코어',
    description: `${T.prismEvery}번 이동할 때마다 어떤 숫자와도 합쳐지는 프리즘 타일이 나온다`,
    rarity: 'rare',
    onSpawn: (self) =>
      self.counter + 1 >= T.prismEvery
        ? { counter: 0, effects: [{ kind: 'spawnPrism' }] }
        : { counter: self.counter + 1 },
  },
  {
    id: 'cornerAnchor',
    name: '모서리 닻',
    description: `네 구석 칸에서 일어난 합체는 점수 ${T.cornerFactor}배`,
    rarity: 'common',
    isUseful: (c) => c.has('scoreGoal'),
    onMerge: (ctx) => (ctx.corner ? { mod: { scoreFactor: T.cornerFactor } } : null),
  },
  {
    id: 'spareSpring',
    name: '여분 태엽',
    description: `모든 스테이지의 이동 제한 +${T.extraMoves}`,
    rarity: 'common',
    isUseful: (c) => c.has('moveLimit'),
    modifyRules: (r) => ({ ...r, moveLimitBonus: r.moveLimitBonus + T.extraMoves }),
  },
  {
    id: 'bomb',
    name: '분해 펄스',
    description: '[사용] 고른 타일 하나를 없앤다 · 스테이지마다 1회',
    rarity: 'common',
    grants: ['active'],
    active: { effect: 'destroy', maxCharges: 1, rechargePerStage: 1, target: 'tile' },
  },
  {
    id: 'undo',
    name: '역행 코일',
    description: '[사용] 직전 행동을 되돌린다 · 스테이지마다 1회',
    rarity: 'rare',
    grants: ['active'],
    active: { effect: 'undo', maxCharges: 1, rechargePerStage: 1, target: 'none' },
  },
  {
    id: 'freezePin',
    name: '정지 핀',
    description: `[사용] 고른 타일을 ${T.pinTurns}턴 동안 얼려 고정한다 · 최대 2회, 스테이지마다 1회 충전`,
    rarity: 'uncommon',
    grants: ['active', 'ice'],
    active: { effect: 'freeze', maxCharges: 2, rechargePerStage: 1, target: 'tile' },
  },
  {
    id: 'reverseFilter',
    name: '역상 필터',
    description: `얼음이나 저주가 붙은 타일이 낀 합체는 점수 ${T.statusFactor}배`,
    rarity: 'uncommon',
    isUseful: (c) => c.has('scoreGoal') && (c.has('ice') || c.has('curse')),
    onMerge: (ctx) => (ctx.withStatus ? { mod: { scoreFactor: T.statusFactor } } : null),
  },
  {
    id: 'debrisFuel',
    name: '잔해 연료',
    description: `돌이 하나 부서질 때마다 이동 +${T.movesPerStone}`,
    rarity: 'common',
    isUseful: (c) => c.has('stone') && c.has('moveLimit'),
    onStoneBreak: (count) => ({
      effects: [{ kind: 'bonusMoves', amount: count * T.movesPerStone }],
    }),
  },
  {
    id: 'twinSeed',
    name: '쌍둥이 씨앗',
    description: `새로 나오는 타일이 4일 확률 +${pct(T.fourChanceBonus)}%`,
    rarity: 'uncommon',
    modifyRules: (r) => ({ ...r, fourChance: Math.min(1, r.fourChance + T.fourChanceBonus) }),
  },
  {
    id: 'ignition',
    name: '점화 플러그',
    description: `스테이지를 시작할 때 ${T.igniteValue} 타일 하나를 놓는다`,
    rarity: 'common',
    onStageStart: () => ({ effects: [{ kind: 'placeTile', value: T.igniteValue }] }),
  },
  {
    id: 'delayVeil',
    name: '지연 장막',
    description: `보스 규칙의 발동 간격 +${T.bossDelay}턴`,
    rarity: 'uncommon',
    isUseful: (c) => c.has('boss'),
    modifyRules: (r) => ({ ...r, bossPeriodBonus: r.bossPeriodBonus + T.bossDelay }),
  },
  {
    id: 'leapLens',
    name: '도약 렌즈',
    description: `스테이지의 첫 ${T.lensMerges}번 합체는 결과가 2배가 된다`,
    rarity: 'uncommon',
    onStageStart: () => ({ counter: 0 }),
    onMerge: (_ctx, self) =>
      self.counter < T.lensMerges ? { mod: { valueFactor: 2 }, counter: self.counter + 1 } : null,
  },
  {
    id: 'capacitor',
    name: '축전 코일',
    description: `합체 ${T.mergesPerCharge}번마다 사용 유물의 충전 +1`,
    rarity: 'uncommon',
    isUseful: (c) => c.has('active'),
    onTurnEnd: (ctx, self) => {
      const total = self.counter + ctx.merges;
      const charges = Math.floor(total / T.mergesPerCharge);
      return {
        counter: total % T.mergesPerCharge,
        effects: charges > 0 ? [{ kind: 'charge', amount: charges }] : [],
      };
    },
  },
];

export const RELICS: Readonly<Record<RelicId, RelicDef>> = Object.fromEntries(
  DEFS.map((d) => [d.id, d]),
) as Record<RelicId, RelicDef>;

export const RELIC_IDS: readonly RelicId[] = DEFS.map((d) => d.id);

export function relicDef(id: RelicId): RelicDef {
  return RELICS[id];
}

export function createRelic(id: RelicId): RelicInstance {
  return { id, charges: 0, counter: 0 };
}

/** Applies every owned relic's rule modifier, in pick order. */
export function deriveRules(
  relics: readonly RelicInstance[],
  base: TurnRules = BASE_TURN_RULES,
): TurnRules {
  return relics.reduce((rules, r) => RELICS[r.id].modifyRules?.(rules) ?? rules, base);
}

/** Keywords provided by owned relics. */
export function grantedKeywords(relics: readonly RelicInstance[]): Set<Keyword> {
  const out = new Set<Keyword>();
  for (const r of relics) for (const k of RELICS[r.id].grants ?? []) out.add(k);
  return out;
}

/**
 * Draws up to `OFFER_SIZE` distinct relics, weighted by rarity, from the ones
 * not owned yet and useful in `ctx`.
 */
export function drawOffer(
  rng: RngState,
  owned: readonly RelicInstance[],
  ctx: OfferContext,
): { offer: RelicId[]; rng: RngState } {
  const ownedIds = new Set(owned.map((r) => r.id));
  const pool = DEFS.filter((d) => !ownedIds.has(d.id) && (d.isUseful?.(ctx) ?? true));
  const offer: RelicId[] = [];
  let next = rng;
  while (offer.length < OFFER_SIZE && pool.length > 0) {
    const total = pool.reduce((s, d) => s + RARITY_WEIGHT[d.rarity], 0);
    const roll = nextFloat(next);
    next = roll.rng;
    let x = roll.value * total;
    let index = pool.length - 1;
    for (const [i, d] of pool.entries()) {
      x -= RARITY_WEIGHT[d.rarity];
      if (x < 0) {
        index = i;
        break;
      }
    }
    const [picked] = pool.splice(index, 1);
    if (picked) offer.push(picked.id);
  }
  return { offer, rng: next };
}
