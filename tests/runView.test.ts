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
  type RelicId,
  type RunState,
  type TurnEvent,
} from '../src/core';
import {
  EMPTY_RECORDS,
  RELIC_SHORT,
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
    expect(stageBanner(startRun('run', 1).run)).toEqual({
      title: '1막 1',
      detail: '점수 360 달성 · 이동 60',
    });
    const boss = startRun('run', 1, { stageIndex: 3, relics: ['spareSpring'] }).run;
    expect(stageBanner(boss).detail).toBe('128 타일 만들기 · 이동 111 · 보스 봉쇄자');
    expect(stageBanner(startRun('endless', 1).run).title).toBe('무한 모드');
  });

  it('every relic has a short chip label of at most two characters', () => {
    for (const id of RELIC_IDS) expect(RELIC_SHORT[id].length).toBeLessThanOrEqual(2);
  });
});

describe('hudModel', () => {
  it('run: goal progress, moves left and the low-moves warning', () => {
    const run = at(0, [[2, E, E, E], empty(), empty(), empty()]);
    const hud = hudModel({ ...run, progress: { ...run.progress, score: 90, movesUsed: 10 } });
    expect(hud).toMatchObject({
      stageLabel: '1막 1',
      goalText: '점수 360 달성',
      goalCurrent: 90,
      goalTarget: 360,
      goalRatio: 0.25,
      movesLabel: '남은 이동',
      movesValue: 50,
      movesWarn: false,
      boss: null,
      stuck: false,
    });
    const low = hudModel({ ...run, progress: { ...run.progress, movesUsed: 56 } });
    expect(low.movesWarn).toBe(true);
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
    });
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
    const s = resultScreen(failed, false);
    expect(s).toMatchObject({ kind: 'result', outcome: 'failed', title: '런 실패' });
    expect(s.kind === 'result' && s.summary).toMatchObject({ reached: '2막 2', stagesCleared: 5 });
  });

  it('records only improve', () => {
    const run = { ...startRun('run', 1, { stageIndex: 4 }).run, bankedScore: 500 };
    const r1 = updateRecords(EMPTY_RECORDS, run);
    expect(r1).toMatchObject({ runBestStages: 4, runBestScore: 500 });
    expect(updateRecords(r1, { ...run, stageIndex: 2, bankedScore: 10 })).toBe(r1);
  });
});

describe('hints', () => {
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
