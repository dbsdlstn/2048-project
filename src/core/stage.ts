/**
 * Stage goals and the run's stage list. The numbers live in `balance.ts`
 * (`STAGE_TABLE`); this module defines what they mean and how progress is
 * measured. Korean strings for goals and hazard introductions live here.
 */
import { STAGE_TABLE } from './balance';
import type { BossId } from './bosses';
import { hazardsPresent, type HazardKind, type HazardParams } from './hazards';

export type StageGoal =
  /** Score at least `target` points within this stage. */
  | { readonly type: 'score'; readonly target: number }
  /** Make a number tile of at least `value`. */
  | { readonly type: 'tile'; readonly value: number }
  /** Break `count` stones. */
  | { readonly type: 'stones'; readonly count: number };

export interface StageSpec {
  /** 1-based act number. */
  readonly act: number;
  readonly goal: StageGoal;
  /** Moves allowed before relic bonuses. */
  readonly moveLimit: number;
  readonly hazards: HazardParams;
  readonly boss: BossId | null;
  /** A hazard shown for the first time here (onboarding hint), or null. */
  readonly introduces: HazardKind | null;
}

/** What the player has done so far in the current stage. Plain data. */
export interface StageProgress {
  readonly movesUsed: number;
  /** Moves gained from relics during this stage (on top of limit + static bonus). */
  readonly bonusMoves: number;
  /** Points scored in this stage. */
  readonly score: number;
  readonly stonesBroken: number;
  /** Largest number tile that existed on the board during this stage. */
  readonly bestTile: number;
}

export const EMPTY_PROGRESS: StageProgress = {
  movesUsed: 0,
  bonusMoves: 0,
  score: 0,
  stonesBroken: 0,
  bestTile: 0,
};

export const STAGES: readonly StageSpec[] = STAGE_TABLE;

/** Number of normal + boss stages per act. */
export const STAGES_PER_ACT = 4;

/** Display label like "1-2" or "1-보스". */
export function stageLabel(index: number): string {
  const spec = STAGES[index];
  if (!spec) return `${index + 1}`;
  const within = (index % STAGES_PER_ACT) + 1;
  return spec.boss ? `${spec.act}-보스` : `${spec.act}-${within}`;
}

export interface GoalStatus {
  readonly current: number;
  readonly target: number;
  readonly done: boolean;
}

export function goalStatus(goal: StageGoal, progress: StageProgress): GoalStatus {
  const [current, target] =
    goal.type === 'score'
      ? [progress.score, goal.target]
      : goal.type === 'tile'
        ? [progress.bestTile, goal.value]
        : [progress.stonesBroken, goal.count];
  return { current: Math.min(current, target), target, done: current >= target };
}

/** One-line Korean goal text. */
export function describeGoal(goal: StageGoal): string {
  switch (goal.type) {
    case 'score':
      return `점수 ${goal.target} 달성`;
    case 'tile':
      return `${goal.value} 타일 만들기`;
    case 'stones':
      return `돌 ${goal.count}개 부수기`;
  }
}

/** Korean name and one-line rule for each hazard (onboarding hints, tooltips). */
export const HAZARD_INFO: Readonly<Record<HazardKind, { name: string; description: string }>> = {
  stone: {
    name: '돌',
    description: '밀리지만 합쳐지지 않는다. 바로 옆에서 합체가 일어나면 부서진다',
  },
  ice: {
    name: '얼음',
    description: '얼어붙은 타일은 몇 턴 동안 제자리에 고정된다. 같은 수를 밀어 넣으면 깨진다',
  },
  curse: { name: '저주', description: '저주받은 타일이 끼는 합체는 결과가 절반이 된다 (한 번)' },
};

/**
 * Shared keywords: things a stage contains or a relic provides. Relics decide
 * whether they are worth offering by looking at keywords, never at each other.
 */
export type Keyword = HazardKind | 'boss' | 'scoreGoal' | 'moveLimit' | 'active';

/** Keywords that appear in a stage: its hazards, its boss, its goal type, its move limit. */
export function stageKeywords(spec: StageSpec): Set<Keyword> {
  const out = new Set<Keyword>(hazardsPresent(spec.hazards));
  if (spec.boss) out.add('boss');
  if (spec.boss === 'chaos') out.add('stone');
  if (spec.goal.type === 'score') out.add('scoreGoal');
  out.add('moveLimit');
  return out;
}
