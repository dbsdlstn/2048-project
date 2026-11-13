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
import { dailySeed } from '../src/game/daily';
import { RunController, type BoardDisplay, type UiDisplay } from '../src/game/runController';
import {
  EMPTY_RECORDS,
  type BoardMarks,
  type Hint,
  type HudModel,
  type Records,
  type ScreenModel,
  type StageBanner,
} from '../src/game/runView';
import { MemoryStorage, SaveStore, type KeyValueStorage } from '../src/save';

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
  /** When true, marks (and the HUD update riding on them) wait for `finish()`, like an animation in flight. */
  animating = false;
  private pending: { marks: BoardMarks; onShown?: (() => void) | undefined } | null = null;
  showStep(step: RunStep): void {
    this.finish();
    this.steps.push(step);
  }
  setMarks(marks: BoardMarks, onShown?: () => void): void {
    this.finish();
    if (this.animating && !marks.targeting) {
      this.pending = { marks, onShown };
      return;
    }
    this.marks = marks;
    onShown?.();
  }
  /** The animation ends: waiting marks show and their callback runs. */
  finish(): void {
    const p = this.pending;
    this.pending = null;
    if (!p) return;
    this.marks = p.marks;
    p.onShown?.();
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
  banners: (StageBanner | null)[] = [];
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
  announceStage(banner: StageBanner | null): void {
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

const TODAY = '2026-11-13';

function setup(
  records?: Records,
  storage: KeyValueStorage = new MemoryStorage(),
  today: () => string = () => TODAY,
) {
  const board = new FakeBoard();
  const ui = new FakeUi();
  const store = new SaveStore(storage);
  if (records) store.setRecords(records);
  let seeds = 0;
  const controller = new RunController({
    board,
    ui,
    store,
    today,
    seed: () => `ctl-${seeds++}`,
  });
  return { board, ui, controller, store, storage };
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
    expect(ui.banners.at(-1)?.detail).toBe(`이동 ${STAGES[0]?.moveLimit}번 안에`);
    expect(board.marks).toEqual({ lock: null, bossTarget: null, targeting: null });
    // First run: a swipe lesson until the first move, which also takes the banner down.
    expect(ui.hint?.key).toBe('lesson:swipe');
    const dirs = runDirections(controller.run as RunState);
    controller.handleDirection(dirs[0] ?? 'left');
    expect(ui.hint).toBeNull();
    expect(ui.banners.at(-1)).toBeNull();
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
      progress: { ...r.progress, score: 99999, bestTile: 4096, stonesBroken: 99 },
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
    expect(offer.tip).not.toBeNull(); // the very first offer explains relics
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
    const { ui, controller } = setup();
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
    expect(controller.bestRecords).toEqual(EMPTY_RECORDS);
    expect(s.record).toBeNull(); // a first run sets records quietly
    expect(controller.handleDirection('left')).toBe(false);
  });

  it('a stuck board ends the run with the stuck reason', () => {
    const { ui, controller } = setup();
    controller.load(prepared('run', STUCK_AFTER_RIGHT));
    controller.handleDirection('right');
    expect(ui.screen.kind === 'result' && ui.screen.reason).toBe('더 이상 움직일 수 없어요');
  });

  it('clearing the last stage shows victory and sets a record', () => {
    const { ui, controller, store } = setup({
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
    expect(s.kind === 'result' && s.record).toBe('새 최고 기록!');
    expect(s.kind === 'result' && s.summary.stagesCleared).toBe(STAGES.length);
    expect(controller.bestRecords.runBestStages).toBe(STAGES.length);
    expect(store.records.runBestStages).toBe(STAGES.length);
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

  it('hints queue up, show once, and go away on a tap or the next move', () => {
    const { ui, controller } = setup();
    controller.start('run', 'hints', { stageIndex: 3 });
    expect(ui.hint?.key).toBe('boss:warden');
    controller.dismissHint();
    expect(ui.hint).toBeNull();
    controller.start('run', 'hints', { stageIndex: 3 });
    expect(ui.hint).toBeNull(); // already seen

    controller.start('run', 'hints2', { stageIndex: 1 });
    expect(ui.hint?.key).toBe('hazard:stone');
    const dirs = runDirections(controller.run as RunState);
    controller.handleDirection(dirs[0] ?? 'left');
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
    // While sealed, the big counter is the time until the line opens, not the next trigger.
    expect(ui.hud?.boss).toMatchObject({
      count: 2,
      countLabel: '봉쇄 해제까지',
      lockText: '3행 봉쇄 중',
      imminent: false,
    });
  });

  it('the HUD changes when the board marks do, after the move has played', () => {
    const { board, ui, controller } = setup();
    controller.load(prepared('run', [[2, 2, E, E], empty(), empty(), empty()]));
    const before = ui.hud;
    board.animating = true;
    controller.handleDirection('left');
    expect(ui.hud).toBe(before); // still animating: numbers wait with the marks
    expect(ui.gains).toEqual([]);
    board.finish();
    expect(ui.hud?.movesValue).toBe((before?.movesValue ?? 0) - 1);
    expect(ui.gains).toEqual([4]);
  });
});

/** Plays `n` moves with a fixed policy (first available direction in a rotating order). */
function playMoves(controller: RunController, n: number, offset = 0): void {
  for (let i = 0; i < n; i++) {
    const run = controller.run;
    if (!run || controller.screen !== 'playing') return;
    const dirs = runDirections(run);
    if (dirs.length === 0) return;
    controller.handleDirection(dirs[(i + offset) % dirs.length] ?? 'left');
  }
}

describe('RunController: saving and resuming', () => {
  it('a reload resumes the identical run, and continues exactly like the uninterrupted one', () => {
    const storage = new MemoryStorage();
    const a = setup(undefined, storage);
    a.controller.start('run', 'resume', { relics: ['undo'] });
    playMoves(a.controller, 25);
    const saved = structuredClone(a.controller.run);

    // A fresh app on the same storage: the menu offers to continue.
    const b = setup(undefined, storage);
    b.controller.showMenu();
    const menu = b.ui.screen;
    expect(menu.kind === 'menu' && menu.continues.map((c) => c.slot)).toEqual(['run']);
    expect(b.controller.continueRun('run')).toBe(true);
    expect(b.controller.run).toEqual(saved);
    expect(b.board.last?.boardReplaced).toBe(true);
    expect(b.ui.hud?.movesValue).toBe(a.ui.hud?.movesValue);
    expect(b.ui.hud?.score).toBe(a.ui.hud?.score);

    // Same moves from here (RNG included) give the same future, undo included.
    playMoves(a.controller, 20, 1);
    playMoves(b.controller, 20, 1);
    expect(b.controller.run).toEqual(a.controller.run);
    expect(a.controller.activateRelic('undo')).toBe(b.controller.activateRelic('undo'));
    expect(b.controller.run).toEqual(a.controller.run);
  });

  it('saves while on the offer screen and resumes into it', () => {
    const storage = new MemoryStorage();
    const a = setup(undefined, storage);
    a.controller.load(
      prepared('run', [[2, 2, E, E], empty(), empty(), empty()], {}, (r) => ({
        ...r,
        progress: { ...r.progress, score: 99999, bestTile: 4096, stonesBroken: 99 },
      })),
    );
    a.controller.handleDirection('left');
    expect(a.controller.screen).toBe('offer');
    const b = setup(undefined, storage);
    expect(b.controller.continueRun('run')).toBe(true);
    expect(b.controller.screen).toBe('offer');
    expect(b.controller.run?.offer).toEqual(a.controller.run?.offer);
  });

  it('a finished run leaves nothing to continue; quitting mid-run keeps it', () => {
    const { controller, store } = setup();
    controller.load(prepared('run', STUCK_AFTER_RIGHT));
    expect(store.hasRun('run')).toBe(true);
    controller.handleDirection('right');
    expect(controller.screen).toBe('result');
    expect(store.hasRun('run')).toBe(false);

    controller.start('endless', 'keep');
    playMoves(controller, 3);
    controller.showMenu();
    expect(store.hasRun('endless')).toBe(true);
  });

  it('starting over a saved game asks first', () => {
    const { ui, controller, store } = setup();
    controller.start('run', 'first');
    playMoves(controller, 5);
    const first = controller.run;
    controller.showMenu();

    controller.requestNew('run');
    expect(ui.screen.kind).toBe('confirm');
    controller.back(); // cancel
    expect(ui.screen.kind).toBe('menu');
    expect(store.loadRun('run')?.run).toEqual(first);

    controller.requestNew('run');
    expect(controller.confirmNew()).toBe(true);
    expect(controller.screen).toBe('playing');
    expect(controller.run?.seed).not.toBe(first?.seed);
    expect(store.loadRun('run')?.run).toEqual(controller.run);

    // No saved endless game: no question.
    controller.showMenu();
    controller.requestNew('endless');
    expect(controller.screen).toBe('playing');
    expect(controller.slot).toBe('endless');
  });

  it('records and seen hints survive a reload; "도움말 다시 보기" shows hints again', () => {
    const storage = new MemoryStorage();
    const a = setup(undefined, storage);
    a.controller.load(prepared('run', STUCK_AFTER_RIGHT, { stageIndex: 2 }));
    a.controller.handleDirection('right');
    expect(a.store.records.runBestStages).toBe(2);
    a.controller.start('run', 'seen', { stageIndex: 1 });
    expect(a.ui.hint?.key).toBe('hazard:stone');

    const b = setup(undefined, storage);
    expect(b.controller.bestRecords.runBestStages).toBe(2);
    b.controller.start('run', 'seen', { stageIndex: 1 });
    expect(b.ui.hint).toBeNull();
    b.controller.showMenu();
    b.controller.openSettings();
    b.controller.resetHints();
    expect(b.ui.screen).toMatchObject({ kind: 'settings', hintsReset: true });
    b.controller.start('run', 'seen', { stageIndex: 1 });
    expect(b.ui.hint?.key).toBe('hazard:stone');
  });

  it('the relic explanation appears on the first offer only, also after a reload', () => {
    const storage = new MemoryStorage();
    const clear = (c: RunController): ScreenModel | null => {
      c.load(
        prepared('run', [[2, 2, E, E], empty(), empty(), empty()], {}, (r) => ({
          ...r,
          progress: { ...r.progress, score: 99999, bestTile: 4096, stonesBroken: 99 },
        })),
      );
      c.handleDirection('left');
      return c.screenState;
    };
    const first = clear(setup(undefined, storage).controller);
    expect(first?.kind === 'offer' && first.tip).toBeTruthy();
    const second = clear(setup(undefined, storage).controller);
    expect(second).toMatchObject({ kind: 'offer', tip: null });
  });

  it('an active relic gets a one-line lesson the first time it is owned', () => {
    const { ui, controller } = setup();
    controller.start('run', 'act', { stageIndex: 2, relics: ['bomb'] });
    expect(ui.hint?.key).toBe('hazard:ice');
    playMoves(controller, 1);
    expect(ui.hint?.key).toBe('lesson:active');
  });

  it('a broken storage never breaks the game', () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    const { ui, controller, store } = setup(undefined, broken);
    controller.showMenu();
    controller.start('run', 'broken');
    playMoves(controller, 10);
    expect(controller.screen).toBe('playing');
    expect(store.writable).toBe(false);
    controller.pause();
    controller.openSettings();
    expect(ui.screen).toMatchObject({ kind: 'settings', storageOk: false, back: 'paused' });
  });
});

describe('RunController: help and settings sheets', () => {
  it('open from the menu or the pause screen and return there', () => {
    const { ui, controller, store } = setup();
    controller.showMenu();
    expect(controller.openHelp()).toBe(true);
    expect(ui.screen).toMatchObject({ kind: 'help', back: 'menu' });
    controller.closeSheet();
    expect(ui.screen.kind).toBe('menu');

    controller.start('run', 'sheets');
    expect(controller.openHelp()).toBe(false); // only from menu / pause
    controller.pause();
    controller.openSettings();
    controller.setSetting('sound', false);
    expect(ui.screen).toMatchObject({ kind: 'settings', settings: { sound: false } });
    expect(store.settings.sound).toBe(false);
    controller.back();
    expect(ui.screen.kind).toBe('paused');
    controller.resume();
    expect(controller.screen).toBe('playing');
  });
});

describe('RunController: daily challenge', () => {
  it('is the same run for everyone on the same date, different on another date', () => {
    const one = setup();
    const two = setup();
    one.controller.startDaily();
    two.controller.startDaily();
    expect(one.controller.run?.seed).toBe(dailySeed(TODAY));
    expect(two.controller.run).toEqual(one.controller.run);
    expect(one.controller.slot).toBe('daily');

    const other = setup(undefined, new MemoryStorage(), () => '2026-11-14');
    other.controller.startDaily();
    expect(other.controller.run?.board.cells).not.toEqual(one.controller.run?.board.cells);
  });

  it('keeps the best result per date and shows it on the menu; retry replays the same day', () => {
    const { ui, controller, store } = setup();
    controller.startDaily();
    playMoves(controller, 15);
    const score = controller.run ? controller.run.board.score : 0;
    expect(store.dailyRecord(TODAY)).toMatchObject({ attempts: 1, bestScore: score });
    controller.retry();
    expect(controller.run?.seed).toBe(dailySeed(TODAY));
    expect(store.dailyRecord(TODAY)?.attempts).toBe(2);
    expect(store.dailyRecord(TODAY)?.bestScore).toBe(score); // a fresh start does not lower it
    // A daily run does not touch the normal run records.
    expect(controller.bestRecords).toEqual(EMPTY_RECORDS);
    controller.showMenu();
    const menu = ui.screen;
    expect(menu.kind === 'menu' && menu.daily).toMatchObject({
      date: TODAY,
      label: '11월 13일',
      attempts: 2,
    });
    expect(menu.kind === 'menu' && menu.continues.map((c) => c.slot)).toEqual(['daily']);
  });

  it("yesterday's unfinished daily is not offered today", () => {
    const storage = new MemoryStorage();
    let today = '2026-11-13';
    const a = setup(undefined, storage, () => today);
    a.controller.startDaily();
    playMoves(a.controller, 3);
    today = '2026-11-14';
    a.controller.showMenu();
    const menu = a.ui.screen;
    expect(menu.kind === 'menu' && menu.continues).toEqual([]);
    expect(a.controller.continueRun('daily')).toBe(false);
    expect(a.store.dailyRecord('2026-11-13')?.attempts).toBe(1); // the record stays
  });
});
