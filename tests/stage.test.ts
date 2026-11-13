import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  STAGES,
  STAGES_PER_ACT,
  describeGoal,
  goalStatus,
  hazardsPresent,
  stageLabel,
  type StageSpec,
} from '../src/core';

function stage(i: number): StageSpec {
  const s = STAGES[i];
  if (!s) throw new Error(`no stage ${i}`);
  return s;
}

describe('goals', () => {
  it('score goal compares points scored in the stage', () => {
    const goal = { type: 'score', target: 500 } as const;
    expect(goalStatus(goal, { ...EMPTY_PROGRESS, score: 499 }).done).toBe(false);
    expect(goalStatus(goal, { ...EMPTY_PROGRESS, score: 500 })).toEqual({
      current: 500,
      target: 500,
      done: true,
    });
  });

  it('tile goal looks at the best tile made during the stage', () => {
    const goal = { type: 'tile', value: 128 } as const;
    expect(goalStatus(goal, { ...EMPTY_PROGRESS, bestTile: 64 }).done).toBe(false);
    expect(goalStatus(goal, { ...EMPTY_PROGRESS, bestTile: 256 })).toEqual({
      current: 128,
      target: 128,
      done: true,
    });
  });

  it('stones goal counts stones broken', () => {
    const goal = { type: 'stones', count: 3 } as const;
    expect(goalStatus(goal, { ...EMPTY_PROGRESS, stonesBroken: 2 }).done).toBe(false);
    expect(goalStatus(goal, { ...EMPTY_PROGRESS, stonesBroken: 3 }).done).toBe(true);
  });

  it('has one-line Korean descriptions', () => {
    expect(describeGoal({ type: 'score', target: 400 })).toBe('점수 400 달성');
    expect(describeGoal({ type: 'tile', value: 64 })).toBe('64 타일 만들기');
    expect(describeGoal({ type: 'stones', count: 3 })).toBe('돌 3개 부수기');
  });
});

describe('stage table', () => {
  it('is 3 acts of 3 normal stages + 1 boss, one boss per act in the order 봉쇄자, 부식자, 혼돈', () => {
    expect(STAGES).toHaveLength(12);
    STAGES.forEach((s, i) => {
      expect(s.act).toBe(Math.floor(i / STAGES_PER_ACT) + 1);
      expect(s.boss !== null).toBe(i % STAGES_PER_ACT === STAGES_PER_ACT - 1);
      expect(s.moveLimit).toBeGreaterThan(0);
    });
    expect(STAGES.filter((s) => s.boss).map((s) => s.boss)).toEqual([
      'warden',
      'corroder',
      'chaos',
    ]);
    expect(stageLabel(0)).toBe('1-1');
    expect(stageLabel(3)).toBe('1-보스');
  });

  it('uses every goal type', () => {
    const types = new Set(STAGES.map((s) => s.goal.type));
    expect(types).toEqual(new Set(['score', 'tile', 'stones']));
  });

  it('onboards one hazard at a time: none, then stone, then ice; curse arrives in act 2', () => {
    expect(hazardsPresent(stage(0).hazards)).toEqual([]);
    expect(hazardsPresent(stage(1).hazards)).toEqual(['stone']);
    expect(hazardsPresent(stage(2).hazards)).toEqual(['stone', 'ice']);
    expect(STAGES.slice(0, 4).every((s) => s.hazards.curseChance === 0)).toBe(true);
    const firstCurse = STAGES.findIndex((s) => s.hazards.curseChance > 0);
    expect(STAGES[firstCurse]?.act).toBe(2);
    expect(STAGES.map((s) => s.introduces).filter(Boolean)).toEqual(['stone', 'ice', 'curse']);
  });

  it('a stage introducing a hazard actually contains it', () => {
    for (const s of STAGES) {
      if (s.introduces) expect(hazardsPresent(s.hazards)).toContain(s.introduces);
    }
  });
});
