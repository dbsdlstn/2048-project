import { describe, expect, it } from 'vitest';
import {
  BOSS_TUNING,
  STAGES,
  createBossState,
  runDirections,
  startRun,
  stateFromGrid,
  type GridCell,
  type RunState,
  type RunStep,
  type StartOptions,
} from '../src/core';
import { RunController, type BoardDisplay, type UiDisplay } from '../src/game/runController';
import type {
  BoardMarks,
  Hint,
  HudModel,
  Records,
  ScreenModel,
  StageBanner,
} from '../src/game/runView';

const E = 0;
const empty = (): GridCell[] => [E, E, E, E];
const STUCK_AFTER_RIGHT: GridCell[][] = [
  [2, 4, 2, 4],
  [4, 2, 4, 2],
  [32, 4, 2, 4],
  [8, 16, 8, E],
];

class FakeBoard implements BoardDisplay {
  steps: RunStep[] = [];
  marks: BoardMarks | null = null;
  clears = 0;
  showStep(step: RunStep): void {
    this.steps.push(step);
  }
  setMarks(marks: BoardMarks): void {
    this.marks = marks;
  }
  clear(): void {
    this.clears++;
    this.steps = [];
  }
  get last(): RunStep | undefined {
    return this.steps.at(-1);
  }
}

class FakeUi implements UiDisplay {
  screens: ScreenModel[] = [];
  hud: HudModel | null = null;
  gains: number[] = [];
  hints: (Hint | null)[] = [];
  banners: StageBanner[] = [];
  showScreen(screen: ScreenModel): void {
    this.screens.push(screen);
  }
  updateHud(hud: HudModel): void {
    this.hud = hud;
  }
  scoreGained(amount: number): void {
    this.gains.push(amount);
  }
  showHint(hint: Hint | null): void {
    this.hints.push(hint);
  }
  announceStage(banner: StageBanner): void {
    this.banners.push(banner);
  }
  get screen(): ScreenModel {
    const s = this.screens.at(-1);
    if (!s) throw new Error('no screen shown');
    return s;
  }
  get hint(): Hint | null {
    return this.hints.at(-1) ?? null;
  }
}

function setup(records?: Records) {
  const board = new FakeBoard();
  const ui = new FakeUi();
  const changes: Records[] = [];
  const controller = new RunController({
    board,
    ui,
    seed: () => 'ctl',
    ...(records ? { initialRecords: records } : {}),
    onRecordsChange: (r) => changes.push(r),
  });
  return { board, ui, controller, changes };
}

/** A run at `stageIndex` (or endless) with an exact board. */
function prepared(
  mode: 'run' | 'endless',
  grid: GridCell[][],
  options: StartOptions = {},
  patch: (run: RunState) => RunState = (r) => r,
): RunState {
  const run = startRun(mode, 'prep', options).run;
  return patch({ ...run, board: stateFromGrid(grid, 7) });
}

describe('RunController: menu and start', () => {
  it('shows the menu with the records and an empty board', () => {
    const { board, ui, controller } = setup();
    controller.showMenu();
    expect(ui.screen.kind).toBe('menu');
    expect(board.clears).toBe(1);
    expect(controller.run).toBeNull();
    expect(controller.handleDirection('left')).toBe(false);
  });

  it('starting a run replaces the board, fills the HUD and announces stage 1', () => {
    const { board, ui, controller } = setup();
    controller.start('run');
    expect(controller.screen).toBe('playing');
    expect(board.last?.boardReplaced).toBe(true);
    expect(ui.hud?.stageLabel).toBe('1막 1');
    expect(ui.hud?.movesValue).toBe(STAGES[0]?.moveLimit);
    expect(ui.banners.at(-1)?.title).toBe('1막 1');
    expect(board.marks).toEqual({ lock: null, bossTarget: null, targeting: null });
  });

  it('moves reach the board and the HUD; score pops add up to the score', () => {
    const { board, ui, controller } = setup();
    controller.start('run');
    let played = 0;
    for (let i = 0; i < 40 && controller.screen === 'playing'; i++) {
      const dirs = runDirections(controller.run as RunState);
      if (controller.handleDirection(dirs[i % dirs.length] ?? 'left')) played++;
    }
    expect(board.steps).toHaveLength(played + 1);
    expect(ui.gains.reduce((a, b) => a + b, 0)).toBe(controller.run?.board.score);
    expect(ui.hud?.score).toBe(controller.run?.board.score);
  });

  it('an invalid move changes nothing', () => {
    const { board, controller } = setup();
    controller.load(prepared('run', [[2, E, E, E], empty(), empty(), empty()]));
    const before = board.steps.length;
    expect(controller.handleDirection('left')).toBe(false);
    expect(controller.handleDirection('up')).toBe(false);
    expect(board.steps).toHaveLength(before);
  });
});

describe('RunController: stage flow', () => {
  const clearable = (): RunState =>
    prepared('run', [[2, 2, E, E], empty(), empty(), empty()], {}, (r) => ({
      ...r,
      progress: { ...r.progress, score: 999 },
    }));

  it('stage clear → offer → pick → next stage with banner, relic and stone hint', () => {
    const { board, ui, controller } = setup();
    controller.load(clearable());
    expect(controller.handleDirection('left')).toBe(true);
    expect(ui.screen.kind).toBe('offer');
    const offer = ui.screen as Extract<ScreenModel, { kind: 'offer' }>;
    expect(offer.title).toBe('1막 1 클리어');
    expect(offer.cards).toHaveLength(3);
    // Moves are ignored while the offer is up.
    expect(controller.handleDirection('right')).toBe(false);

    const pick = offer.cards[0]?.id ?? 'chain';
    expect(controller.chooseRelic(pick)).toBe(true);
    expect(controller.screen).toBe('playing');
    expect(board.last?.boardReplaced).toBe(true);
    expect(ui.hud?.stageLabel).toBe('1막 2');
    expect(ui.hud?.relics.map((r) => r.id)).toEqual([pick]);
    expect(ui.banners.at(-1)?.title).toBe('1막 2');
    expect(ui.hint?.key).toBe('hazard:stone');
    // Picking again does nothing outside an offer.
    expect(controller.chooseRelic(pick)).toBe(false);
  });

  it('a stage can be skipped without a relic', () => {
    const { ui, controller } = setup();
    controller.load(clearable());
    controller.handleDirection('left');
    expect(controller.chooseRelic(null)).toBe(true);
    expect(ui.hud?.relics).toEqual([]);
    expect(ui.hud?.stageLabel).toBe('1막 2');
  });

  it('running out of moves shows the failed run summary', () => {
    const { ui, controller, changes } = setup();
    const limit = STAGES[0]?.moveLimit ?? 0;
    controller.load(
      prepared('run', [[2, E, E, E], empty(), empty(), empty()], {}, (r) => ({
        ...r,
        progress: { ...r.progress, movesUsed: limit - 1 },
      })),
    );
    controller.handleDirection('right');
    const s = ui.screen;
    expect(s.kind).toBe('result');
    if (s.kind !== 'result') return;
    expect(s.outcome).toBe('failed');
    expect(s.reason).toBe('이동 횟수를 모두 썼어요');
    expect(s.summary.reached).toBe('1막 1');
    expect(s.summary.stagesCleared).toBe(0);
    expect(changes).toHaveLength(0);
    expect(s.newRecord).toBe(false); // a first run sets records quietly
    expect(controller.handleDirection('left')).toBe(false);
  });

  it('a stuck board ends the run with the stuck reason', () => {
    const { ui, controller } = setup();
    controller.load(prepared('run', STUCK_AFTER_RIGHT));
    controller.handleDirection('right');
    expect(ui.screen.kind === 'result' && ui.screen.reason).toBe('더 이상 움직일 수 없어요');
  });

  it('clearing the last stage shows victory and sets a record', () => {
    const { ui, controller, changes } = setup({
      runBestStages: 3,
      runBestScore: 100,
      endlessBestScore: 0,
      endlessBestTile: 0,
    });
    controller.load(
      prepared('run', [[128, 128, E, E], empty(), empty(), empty()], {
        stageIndex: STAGES.length - 1,
      }),
    );
    controller.handleDirection('left');
    const s = ui.screen;
    expect(s.kind === 'result' && s.outcome).toBe('victory');
    expect(s.kind === 'result' && s.newRecord).toBe(true);
    expect(s.kind === 'result' && s.summary.stagesCleared).toBe(STAGES.length);
    expect(controller.bestRecords.runBestStages).toBe(STAGES.length);
    expect(changes.length).toBeGreaterThan(0);
  });

  it('retry starts a fresh run in the same mode; quitting returns to the menu', () => {
    const { ui, controller } = setup();
    controller.load(prepared('run', STUCK_AFTER_RIGHT));
    controller.handleDirection('right');
    controller.retry();
    expect(controller.screen).toBe('playing');
    expect(controller.run?.stageIndex).toBe(0);
    expect(ui.banners.at(-1)?.title).toBe('1막 1');
    controller.showMenu();
    expect(ui.screen.kind).toBe('menu');
  });
});

describe('RunController: endless', () => {
  it('offers a relic at the milestone; the board carries on after the pick', () => {
    const { board, ui, controller } = setup();
    controller.load(prepared('endless', [[32, 32, E, E], empty(), empty(), empty()]));
    expect(ui.hud?.stageLabel).toBe('무한');
    controller.handleDirection('left');
    const s = ui.screen;
    expect(s.kind).toBe('offer');
    if (s.kind !== 'offer') return;
    expect(s.title).toBe('64 타일 도달');
    controller.chooseRelic(s.cards[0]?.id ?? null);
    expect(controller.screen).toBe('playing');
    expect(board.last?.boardReplaced).toBe(false);
    expect(ui.hud?.goalText).toBe('다음 유물: 128 타일');
  });

  it('ends with a game-over summary when stuck', () => {
    const { ui, controller } = setup();
    controller.load(prepared('endless', STUCK_AFTER_RIGHT));
    controller.handleDirection('right');
    const s = ui.screen;
    expect(s.kind === 'result' && s.outcome).toBe('over');
    expect(s.kind === 'result' && s.summary.reached).toBe('32 타일');
  });
});

describe('RunController: active relics', () => {
  const bombRun = (grid: GridCell[][] = [[2, 4, E, E], empty(), empty(), empty()]) =>
    prepared('run', grid, { relics: ['bomb', 'freezePin', 'undo'] });

  it('bomb: enter targeting, moves are blocked, a tap on a tile destroys it', () => {
    const { board, ui, controller } = setup();
    controller.load(bombRun());
    expect(controller.activateRelic('bomb')).toBe(true);
    expect(ui.screen).toMatchObject({ kind: 'targeting', relic: 'bomb', error: null });
    expect(board.marks?.targeting?.effect).toBe('destroy');
    expect(board.marks?.targeting?.cells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(controller.handleDirection('down')).toBe(false);

    expect(controller.handleCellTap({ row: 2, col: 2 })).toBe(false);
    expect(ui.screen).toMatchObject({ kind: 'targeting', error: '빈 칸이에요. 타일을 고르세요' });

    expect(controller.handleCellTap({ row: 0, col: 1 })).toBe(true);
    expect(controller.screen).toBe('playing');
    expect(board.marks?.targeting).toBeNull();
    expect(controller.run?.board.cells.filter(Boolean)).toHaveLength(1);
    expect(ui.hud?.relics.find((r) => r.id === 'bomb')?.charges).toBe(0);
    // Out of charges: the button no longer enters targeting.
    expect(controller.activateRelic('bomb')).toBe(false);
  });

  it('targeting can be cancelled by button, by pressing the relic again, or by Escape', () => {
    const { ui, controller } = setup();
    controller.load(bombRun());
    controller.activateRelic('bomb');
    expect(controller.cancelTargeting()).toBe(true);
    expect(ui.screen.kind).toBe('playing');
    controller.activateRelic('bomb');
    controller.activateRelic('bomb');
    expect(ui.screen.kind).toBe('playing');
    controller.activateRelic('freezePin');
    controller.back();
    expect(ui.screen.kind).toBe('playing');
    expect(controller.run?.relics.find((r) => r.id === 'bomb')?.charges).toBe(1);
  });

  it('switching from one targeted relic to another retargets', () => {
    const { ui, controller } = setup();
    controller.load(bombRun());
    controller.activateRelic('bomb');
    controller.activateRelic('freezePin');
    expect(ui.screen).toMatchObject({ kind: 'targeting', relic: 'freezePin' });
  });

  it('freeze pin refuses stones with a message and pins a number tile', () => {
    const { ui, controller } = setup();
    controller.load(bombRun([[{ kind: 'stone' }, 4, E, E], empty(), empty(), empty()]));
    controller.activateRelic('freezePin');
    expect(controller.handleCellTap({ row: 0, col: 0 })).toBe(false);
    expect(ui.screen).toMatchObject({ kind: 'targeting', error: '돌은 얼릴 수 없어요' });
    expect(controller.handleCellTap({ row: 0, col: 1 })).toBe(true);
    expect(controller.run?.board.cells[1]?.status.frozenTurns).toBe(3);
  });

  it('undo fires at once and rebuilds the previous board', () => {
    const { board, controller } = setup();
    controller.load(bombRun());
    const before = controller.run?.board;
    controller.handleDirection('down');
    expect(controller.activateRelic('undo')).toBe(true);
    expect(controller.screen).toBe('playing');
    expect(board.last?.boardReplaced).toBe(true);
    expect(controller.run?.board).toEqual(before);
    expect(controller.run?.relics.find((r) => r.id === 'undo')?.charges).toBe(0);
  });

  it('a stuck board with a rescue left stays in play and the HUD says so', () => {
    const { ui, controller } = setup();
    controller.load(bombRun(STUCK_AFTER_RIGHT));
    controller.handleDirection('right');
    expect(controller.screen).toBe('playing');
    expect(ui.hud?.stuck).toBe(true);
    controller.activateRelic('bomb');
    controller.handleCellTap({ row: 0, col: 0 });
    expect(ui.hud?.stuck).toBe(false);
  });
});

describe('RunController: pause, hints and boss marks', () => {
  it('pause blocks input; resume and back return to play', () => {
    const { ui, controller } = setup();
    controller.start('run');
    expect(controller.pause()).toBe(true);
    expect(ui.screen.kind).toBe('paused');
    expect(controller.handleDirection('left')).toBe(false);
    expect(controller.handleDirection('right')).toBe(false);
    controller.back();
    expect(ui.screen.kind).toBe('playing');
    controller.back();
    expect(ui.screen.kind).toBe('paused');
    expect(controller.resume()).toBe(true);
  });

  it('hints queue up, show once, and dismiss on tap or after a few moves', () => {
    const { ui, controller } = setup();
    controller.start('run', 'hints', { stageIndex: 3 });
    expect(ui.hint?.key).toBe('boss:warden');
    controller.dismissHint();
    expect(ui.hint).toBeNull();
    controller.start('run', 'hints', { stageIndex: 3 });
    expect(ui.hint).toBeNull(); // already seen

    controller.start('run', 'hints2', { stageIndex: 1 });
    expect(ui.hint?.key).toBe('hazard:stone');
    for (let i = 0; i < 6 && ui.hint; i++) {
      const dirs = runDirections(controller.run as RunState);
      controller.handleDirection(dirs[0] ?? 'left');
    }
    expect(ui.hint).toBeNull();
  });

  it('corroder target and the sealed line reach the board marks; the HUD shows the countdown', () => {
    const { board, ui, controller } = setup();
    controller.load(
      prepared('run', [[2, 64, E, E], [8, E, E, E], empty(), empty()], { stageIndex: 7 }),
    );
    const target = controller.run?.board.cells[1]?.id;
    expect(board.marks?.bossTarget).toEqual({
      tileId: target,
      turnsUntil: BOSS_TUNING.corroder.period,
    });
    expect(ui.hud?.boss?.name).toBe('부식자');
    expect(ui.hud?.boss?.preview).toBe('다음 발동: 64 → 32');

    controller.load(
      prepared('run', [[2, E, E, E], empty(), empty(), empty()], { stageIndex: 3 }, (r) => ({
        ...r,
        boss: { ...createBossState('warden'), lock: { axis: 'row', index: 2, turnsLeft: 2 } },
      })),
    );
    expect(board.marks?.lock).toEqual({ axis: 'row', index: 2, turnsLeft: 2 });
    expect(ui.hud?.boss?.lockText).toBe('3행 봉쇄 중 · 2턴 남음');
  });
});
