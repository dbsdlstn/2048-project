import { describe, expect, it } from 'vitest';
import {
  BOSSES,
  HAZARD_INFO,
  RELIC_IDS,
  STAGES,
  createBossState,
  startRun,
  stateFromGrid,
  type GridCell,
  RELIC_TUNING,
  describeGoal,
  type RelicId,
  type RunState,
  type StageSpec,
  type TurnEvent,
} from '../src/core';
import {
  EMPTY_RECORDS,
  LESSONS,
  PACE_FROM_MOVE,
  RELIC_SHORT,
  dailyInfo,
  helpSections,
  savedRunLabel,
  stepHints,
  boardMarks,
  hazardsInEvents,
  hudModel,
  offerScreen,
  relicChips,
  resultScreen,
  stageBanner,
  stageStartHints,
  stageTitle,
  updateRecords,
} from '../src/game/runView';

const E = 0;
const empty = (): GridCell[] => [E, E, E, E];
/** The first stage with a score goal (the table may move it). */
const SCORE_STAGE = STAGES.findIndex((s) => s.goal.type === 'score');

function at(stageIndex: number, grid: GridCell[][], relics: readonly RelicId[] = []): RunState {
  const run = startRun('run', 'view', { stageIndex, relics }).run;
  return { ...run, board: stateFromGrid(grid, 3) };
}

describe('stage titles and banners', () => {
  it('labels stages "N막 k" and bosses "N막 보스"', () => {
    expect(STAGES.map((_, i) => stageTitle(i))).toEqual([
      '1막 1',
      '1막 2',
      '1막 3',
      '1막 보스',
      '2막 1',
      '2막 2',
      '2막 3',
      '2막 보스',
      '3막 1',
      '3막 2',
      '3막 3',
      '3막 보스',
    ]);
  });

  it('the banner names goal, move limit (with relic bonus) and boss', () => {
    const first = STAGES[0] as StageSpec;
    expect(stageBanner(startRun('run', 1).run)).toEqual({
      title: '1막 1',
      goal: describeGoal(first.goal),
      detail: `이동 ${first.moveLimit}번 안에`,
    });
    const spec = STAGES[3] as StageSpec;
    const boss = startRun('run', 1, { stageIndex: 3, relics: ['spareSpring'] }).run;
    expect(stageBanner(boss)).toMatchObject({
      goal: describeGoal(spec.goal),
      detail: `이동 ${spec.moveLimit + RELIC_TUNING.extraMoves}번 안에 · 보스 봉쇄자`,
    });
    expect(stageBanner(startRun('endless', 1).run).title).toBe('무한 모드');
  });

  it('every relic has a short chip label of at most two characters', () => {
    for (const id of RELIC_IDS) expect(RELIC_SHORT[id].length).toBeLessThanOrEqual(2);
  });
});

describe('hudModel', () => {
  it('run: goal progress, moves left and the low-moves warning', () => {
    const index = SCORE_STAGE;
    const spec = STAGES[index] as StageSpec;
    const target = spec.goal.type === 'score' ? spec.goal.target : 0;
    const run = at(index, [[2, E, E, E], empty(), empty(), empty()]);
    const quarter = target / 4;
    const hud = hudModel({ ...run, progress: { ...run.progress, score: quarter, movesUsed: 10 } });
    expect(hud).toMatchObject({
      stageLabel: stageTitle(index),
      goalText: `점수 ${target} 달성`,
      goalCurrent: quarter,
      goalTarget: target,
      goalRatio: 0.25,
      movesLabel: '남은 이동',
      movesValue: spec.moveLimit - 10,
      movesWarn: false,
      stuck: false,
    });
    const low = hudModel({ ...run, progress: { ...run.progress, movesUsed: spec.moveLimit - 4 } });
    expect(low.movesWarn).toBe(true);
  });

  it('score goals project the stage pace onto the bar', () => {
    const spec = STAGES[SCORE_STAGE] as StageSpec;
    const target = spec.goal.type === 'score' ? spec.goal.target : 0;
    const run = at(SCORE_STAGE, [[2, E, E, E], empty(), empty(), empty()]);
    const progress = (score: number, movesUsed: number) =>
      hudModel({ ...run, progress: { ...run.progress, score, movesUsed } }).pace;
    expect(progress(10, PACE_FROM_MOVE - 1)).toBeNull(); // too early to tell
    // Half the moves used for half the target: exactly on pace.
    const half = Math.floor(spec.moveLimit / 2);
    const onPace = progress((target * half) / spec.moveLimit, half);
    expect(onPace?.onTrack).toBe(true);
    expect(onPace?.projectedRatio).toBeCloseTo(1);
    const behind = progress(target / 10, half);
    expect(behind?.onTrack).toBe(false);
    expect(behind?.projectedRatio).toBeCloseTo(0.2, 1);
    expect(behind?.label).toMatch(/^지금 속도면 약 \d+점$/);
    // Other goals have no pace bar.
    expect(hudModel(at(1, [[2, E, E, E], empty(), empty(), empty()])).pace).toBeNull();
  });

  it('endless: next milestone tile and move count', () => {
    const run = startRun('endless', 'e').run;
    const hud = hudModel({
      ...run,
      board: stateFromGrid([[16, E, E, E], empty(), empty(), empty()]),
    });
    expect(hud).toMatchObject({
      stageLabel: '무한',
      goalText: '다음 유물: 64 타일',
      movesLabel: '이동',
    });
    expect(hud.goalRatio).toBeCloseTo(4 / 6);
  });

  it('boss info: rule, countdown and a computable preview', () => {
    const warden = hudModel(at(3, [[2, E, E, E], empty(), empty(), empty()]));
    expect(warden.boss).toMatchObject({
      name: BOSSES.warden.name,
      rule: BOSSES.warden.description,
      turnsUntil: 5,
      preview: '다음 발동: 무작위 한 줄 봉쇄',
      lockText: null,
      count: 5,
      countLabel: '발동까지',
      imminent: false,
    });
    const run = at(3, [[2, E, E, E], empty(), empty(), empty()]);
    const sealed = hudModel({
      ...run,
      boss: {
        ...createBossState('warden'),
        turnsUntil: 4,
        lock: { axis: 'col', index: 0, turnsLeft: 1 },
      },
    });
    expect(sealed.boss).toMatchObject({
      count: 1,
      countLabel: '봉쇄 해제까지',
      lockText: '1열 봉쇄 중',
      imminent: false,
    });
    const soon = hudModel({ ...run, boss: { ...createBossState('warden'), turnsUntil: 1 } });
    expect(soon.boss?.imminent).toBe(true);
    const chaos = hudModel(at(11, [[2, E, E, E], empty(), empty(), empty()]));
    expect(chaos.boss?.preview).toBe('다음 발동: 보드 섞기 + 돌');
    const corroder = at(7, [[2, E, E, E], empty(), empty(), empty()]);
    expect(hudModel(corroder).boss?.preview).toBe('다음 발동: 깎을 타일 없음');
  });

  it('relic chips: actives are usable only with a charge and a valid use', () => {
    const run = at(
      0,
      [[{ kind: 'stone' }, E, E, E], empty(), empty(), empty()],
      ['bomb', 'freezePin', 'undo', 'chain'],
    );
    const chips = relicChips(run);
    expect(chips.map((c) => [c.id, c.active, c.usable])).toEqual([
      ['bomb', true, true],
      ['freezePin', true, false], // only a stone on the board
      ['undo', true, false], // nothing to undo yet
      ['chain', false, false],
    ]);
  });
});

describe('boardMarks', () => {
  it('marks the corroder target and the sealed line; targeting lists valid cells', () => {
    const run = at(
      7,
      [[2, 64, E, E], [{ kind: 'stone' }, E, E, E], empty(), empty()],
      ['freezePin'],
    );
    const marks = boardMarks(run, 'freezePin');
    expect(marks.bossTarget?.tileId).toBe(run.board.cells[1]?.id);
    expect(marks.targeting).toEqual({
      effect: 'freeze',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
    });
    const sealed = {
      ...run,
      boss: {
        ...createBossState('warden'),
        lock: { axis: 'col' as const, index: 1, turnsLeft: 1 },
      },
    };
    expect(boardMarks(sealed, null)).toEqual({
      lock: { axis: 'col', index: 1, turnsLeft: 1 },
      bossTarget: null,
      targeting: null,
    });
  });
});

describe('screens and records', () => {
  it('offer cards carry rarity and the active tag', () => {
    const run: RunState = { ...startRun('run', 1).run, status: 'offer', offer: ['bomb', 'chain'] };
    const s = offerScreen(run);
    expect(s.kind === 'offer' && s.cards.map((c) => [c.id, c.active, c.rarityLabel])).toEqual([
      ['bomb', true, '일반'],
      ['chain', false, '희귀'],
    ]);
  });

  it('result screens summarise the run', () => {
    const failed: RunState = {
      ...startRun('run', 1, { stageIndex: 5 }).run,
      status: 'gameOver',
      failReason: 'stuck',
    };
    const s = resultScreen(failed, null);
    expect(s).toMatchObject({ kind: 'result', outcome: 'failed', title: '런 실패' });
    expect(s.kind === 'result' && s.summary).toMatchObject({ reached: '2막 2', stagesCleared: 5 });
  });

  it('menu labels for saved runs and the daily entry', () => {
    const run = { ...startRun('run', 1, { stageIndex: 2 }).run, bankedScore: 1200 };
    expect(savedRunLabel({ run, daily: null })).toBe(
      `1막 3 · ${(1200 + run.board.score).toLocaleString('ko-KR')}점`,
    );
    expect(dailyInfo('2026-11-13', null)).toEqual({
      date: '2026-11-13',
      label: '11월 13일',
      best: null,
      attempts: 0,
    });
    expect(
      dailyInfo('2026-11-13', {
        date: '2026-11-13',
        attempts: 2,
        bestStages: 3,
        bestScore: 1500,
        won: false,
      }).best,
    ).toBe('3스테이지 · 1,500점');
  });

  it('records only improve', () => {
    const run = { ...startRun('run', 1, { stageIndex: 4 }).run, bankedScore: 500 };
    const r1 = updateRecords(EMPTY_RECORDS, run);
    expect(r1).toMatchObject({ runBestStages: 4, runBestScore: 500 });
    expect(updateRecords(r1, { ...run, stageIndex: 2, bankedScore: 10 })).toBe(r1);
  });
});

describe('hints', () => {
  it('the first stage teaches the swipe before anything else', () => {
    expect(stageStartHints(startRun('run', 1).run)).toEqual([LESSONS.swipe]);
    expect(stageStartHints(startRun('endless', 1).run)).toEqual([LESSONS.swipe]);
  });

  it('owning an active relic brings its lesson; hazards in events bring theirs', () => {
    const run = startRun('run', 1, { stageIndex: 1, relics: ['bomb'] }).run;
    expect(stepHints(run, []).map((h) => h.key)).toEqual(['lesson:active']);
    const spawn: TurnEvent = {
      type: 'spawn',
      tileId: 9,
      kind: 'stone',
      value: 0,
      at: { row: 0, col: 0 },
    };
    expect(stepHints(startRun('endless', 1).run, [spawn]).map((h) => h.key)).toEqual([
      'hazard:stone',
    ]);
  });

  it('the help sheet is built from the same texts as the hints', () => {
    const texts = helpSections().flatMap((s) => s.items.map((i) => i.text));
    for (const info of Object.values(HAZARD_INFO)) expect(texts).toContain(info.description);
    for (const boss of Object.values(BOSSES)) expect(texts).toContain(boss.description);
    expect(texts).toContain(LESSONS.offer.text);
    expect(texts).toContain(LESSONS.activeRelic.text);
    expect(helpSections().map((s) => s.title)).toEqual([
      '기본',
      '방해 타일',
      '보스',
      '유물',
      '모드',
    ]);
  });

  it('a stage announces its new hazard and its boss', () => {
    expect(stageStartHints(startRun('run', 1, { stageIndex: 1 }).run)).toEqual([
      { key: 'hazard:stone', title: '새 방해: 돌', text: HAZARD_INFO.stone.description },
    ]);
    expect(stageStartHints(startRun('run', 1, { stageIndex: 3 }).run).map((h) => h.key)).toEqual([
      'boss:warden',
    ]);
  });

  it('hazards are found in events (endless ramps them in)', () => {
    const status = { frozenTurns: 0, cursed: true };
    const events: TurnEvent[] = [
      { type: 'spawn', tileId: 1, kind: 'stone', value: 0, at: { row: 0, col: 0 } },
      { type: 'statusChange', tileId: 2, at: { row: 0, col: 1 }, status, cause: 'curse' },
      { type: 'statusChange', tileId: 3, at: { row: 0, col: 2 }, status, cause: 'active' },
    ];
    expect(hazardsInEvents(events)).toEqual(['stone', 'curse']);
  });
});
