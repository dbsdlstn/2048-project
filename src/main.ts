// App entry: builds the screen, then wires input -> controller -> renderer / UI, and storage.
import { DEFAULT_RULES, randomSeed } from './core';
import { createDebugApi, readLaunchParams, startOptions } from './game/debug';
import { RunController } from './game/runController';
import { isRelicId } from './game/runView';
import { attachInput } from './input';
import { BoardRenderer, PausableClock, browserClock } from './render';
import { SaveStore, browserStorage } from './save';
import { createGameScreen } from './ui';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app element missing');

const params = readLaunchParams(window.location.search);
// Only debug builds of the page get a clock that can be paused and stepped.
const debugClock = params.debug ? new PausableClock(browserClock) : null;
// `?seed=` applies to the first run only; later runs are random.
let firstSeed = params.seed;

// Saving never breaks the game: without storage (private mode) it runs from memory.
const { storage, persistent } = browserStorage();
const store = new SaveStore(storage, {
  onProblem: (problem) => {
    console.warn(`[neon-rift] save: ${problem.kind} (${problem.key})`);
  },
});
if (!persistent) console.warn('[neon-rift] storage unavailable: progress will not be kept');

// Handlers only fire on user input, which happens after `controller` exists.
const screen = createGameScreen(app, {
  onNew: (slot) => {
    controller.requestNew(slot);
  },
  onContinue: (slot) => controller.continueRun(slot),
  onConfirmNew: () => controller.confirmNew(),
  onCloseSheet: () => controller.closeSheet(),
  onOpenHelp: () => controller.openHelp(),
  onOpenSettings: () => controller.openSettings(),
  onSetting: (key, value) => {
    controller.setSetting(key, value);
  },
  onResetHints: () => {
    controller.resetHints();
  },
  onChooseRelic: (id) => controller.chooseRelic(id),
  onActivateRelic: (id) => controller.activateRelic(id),
  onCancelTargeting: () => controller.cancelTargeting(),
  onPause: () => controller.pause(),
  onResume: () => controller.resume(),
  onQuit: () => {
    controller.showMenu();
  },
  onRetry: () => {
    controller.retry();
  },
  onDismissHint: () => {
    controller.dismissHint();
  },
});

const renderer = new BoardRenderer(screen.canvas, DEFAULT_RULES.boardSize, {
  clock: debugClock ?? browserClock,
});
// A relic that just acted flashes its HUD icon, in sync with the board animation.
renderer.onCue((cue, late) => {
  if (!late && cue.event.type === 'trigger' && isRelicId(cue.event.source)) {
    screen.ui.pulseRelic(cue.event.source);
  }
});

const controller = new RunController({
  board: renderer,
  ui: screen.ui,
  store,
  seed: () => {
    const seed = firstSeed ?? randomSeed();
    firstSeed = null;
    return seed;
  },
});

attachInput({
  surface: screen.surface,
  onDirection: (direction) => {
    screen.ui.hud.hideTooltip();
    controller.handleDirection(direction);
  },
  onTap: (x, y) => {
    if (controller.screen === 'targeting') {
      const cell = renderer.cellAt(x, y);
      if (cell) controller.handleCellTap(cell);
      return;
    }
    // A tap anywhere (outside buttons) puts the hint away.
    if (controller.screen === 'playing') controller.dismissHint();
  },
  onBack: () => {
    controller.back();
  },
});

if (params.mode) controller.start(params.mode, undefined, startOptions(params));
else controller.showMenu();

if (debugClock) {
  window.__neonRift = createDebugApi({ controller, board: renderer, clock: debugClock });
  console.info('[neon-rift] debug hook ready: window.__neonRift');
}
