// App entry: builds the screen, then wires input -> controller -> renderer / UI, storage,
// and the feedback layer (particles, shake, sound, vibration).
import { AudioEngine, SOUNDS, WebAudioBackend, audioContextClass, renderOffline } from './audio';
import type { SoundId } from './audio';
import { DEFAULT_RULES, randomSeed } from './core';
import { createDebugApi, readLaunchParams, startOptions } from './game/debug';
import { Feedback, rendererBoard } from './game/feedback';
import { RunController, type BoardDisplay, type UiDisplay } from './game/runController';
import { isRelicId } from './game/runView';
import { attachInput } from './input';
import { Haptics, browserVibrate } from './input/haptics';
import { BoardRenderer, NEON_THEME, PausableClock, browserClock } from './render';
import { SaveStore, browserStorage, motionReduced, type Settings } from './save';
import { createGameScreen } from './ui';

/** The relic offer's sound waits for its sheet to fade in (see `.screen-offer` in style.css). */
const OFFER_SOUND_DELAY = 650;

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
  onChooseRelic: (id) => {
    if (controller.chooseRelic(id)) feedback.relicPicked(id);
  },
  onActivateRelic: (id) => {
    if (controller.activateRelic(id)) feedback.activeUsed(id);
  },
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

// ---- feedback: sound, vibration, motion ----
const audio = new AudioEngine({
  createBackend: () => {
    const Ctx = audioContextClass();
    return Ctx ? new WebAudioBackend(new Ctx()) : null;
  },
  // The renderer's clock: real time normally, stepped time under the debug hook.
  now: () => renderer.clock.now(),
  log: params.debug,
});
const haptics = new Haptics(browserVibrate(), () => renderer.clock.now());
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const feedback = new Feedback({
  board: rendererBoard(renderer, NEON_THEME),
  sound: audio,
  haptics,
  offerDelay: OFFER_SOUND_DELAY,
});
renderer.onCue((cue, late) => {
  feedback.cue(cue, late);
});

/** Debug: renders sounds offline through the real synth (see `__neonRift.feedback`). */
function renderMix(items: readonly { id: string; at?: number; pitch?: number }[]) {
  const unknown = items.find((i) => !(i.id in SOUNDS));
  if (unknown) return Promise.reject(new Error(`unknown sound ${unknown.id}`));
  return renderOffline(
    items.map((i) => ({ def: SOUNDS[i.id as SoundId], at: i.at ?? 0, semitones: i.pitch ?? 0 })),
    controller.settings.volume,
  );
}

function applySettings(settings: Settings): void {
  audio.setEnabled(settings.sound);
  audio.setVolume(settings.volume);
  haptics.setEnabled(settings.haptics);
  const reduced = motionReduced(settings.reduceMotion, reducedQuery.matches);
  renderer.setReducedMotion(reduced);
  screen.surface.dataset.motion = reduced ? 'reduced' : 'full';
}

// Browsers only allow audio after a user gesture: the first touch / key unlocks it.
const unlockAudio = (): void => {
  audio.unlock();
};
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });
document.addEventListener('visibilitychange', () => {
  audio.setHidden(document.hidden);
});
reducedQuery.addEventListener('change', () => {
  applySettings(controller.settings);
});
// Every button click ticks (sheets, HUD, relic buttons).
screen.surface.addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('button')) feedback.uiTap();
});

// The controller talks to the renderer and the UI through these: the feedback
// layer listens in without the controller knowing about it.
const board: BoardDisplay = {
  showStep: (step) => {
    renderer.showStep(step);
    feedback.step(step);
  },
  setMarks: (marks, onShown) => {
    renderer.setMarks(marks, onShown);
  },
  clear: () => {
    renderer.clear();
  },
};
const ui: UiDisplay = {
  showScreen: (model) => {
    screen.ui.showScreen(model);
    feedback.screen(model);
  },
  updateHud: (hud) => {
    screen.ui.updateHud(hud);
    feedback.hud(hud);
  },
  scoreGained: (amount) => {
    screen.ui.scoreGained(amount);
  },
  showHint: (hint) => {
    screen.ui.showHint(hint);
  },
  announceStage: (banner) => {
    screen.ui.announceStage(banner);
  },
};

const controller = new RunController({
  board,
  ui,
  store,
  device: () => ({ haptics: haptics.supported, reducedMotion: reducedQuery.matches }),
  onSettings: applySettings,
  seed: () => {
    const seed = firstSeed ?? randomSeed();
    firstSeed = null;
    return seed;
  },
});

applySettings(controller.settings);

attachInput({
  surface: screen.surface,
  onDirection: (direction) => {
    screen.ui.hud.hideTooltip();
    const playing = controller.screen === 'playing';
    if (!controller.handleDirection(direction) && playing) feedback.invalidMove(direction);
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
  window.__neonRift = createDebugApi({
    controller,
    board: renderer,
    clock: debugClock,
    feedback: {
      sounds: () => audio.log,
      haptics: () => haptics.log,
      renderSound: (id, pitch) => renderMix([{ id, pitch: pitch ?? 0 }]),
      renderMix,
      clearLogs: () => {
        audio.log.length = 0;
        haptics.log.length = 0;
      },
    },
  });
  console.info('[neon-rift] debug hook ready: window.__neonRift');
}
