// App entry: builds the screen, then wires input -> controller -> renderer / UI, storage,
// and the feedback layer (particles, shake, sound, vibration).
import { AudioEngine, SOUNDS, WebAudioBackend, audioContextClass, renderOffline } from './audio';
import type { SoundId } from './audio';
import { DEFAULT_RULES, randomSeed } from './core';
import { createDebugApi, readLaunchParams, startOptions, type DebugStorybook } from './game/debug';
import { parseMockFaction } from './game/factionMock';
import {
  FactionDirector,
  factionArt,
  type JourneyMoment,
  type JourneyState,
} from './game/factionView';
import { Feedback, rendererBoard } from './game/feedback';
import { RunController, type BoardDisplay, type UiDisplay } from './game/runController';
import { isRelicId } from './game/runView';
import { attachInput } from './input';
import { Haptics, browserVibrate } from './input/haptics';
import { BoardRenderer, PausableClock, browserClock, themeById } from './render';
import { SaveStore, browserStorage, motionReduced, type Settings } from './save';
import { UpdateFlow } from './pwa/register';
import { createGameScreen, createUpdateToast } from './ui';
import { journeyScreen } from './ui/journey';
import { STORYBOOK_BRAND, paperTexture } from './ui/storybookBrand';

/** The relic offer's sound waits for its sheet to fade in (see `.screen-offer` in style.css). */
const OFFER_SOUND_DELAY = 650;

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app element missing');

const params = readLaunchParams(window.location.search);
// The look: canvas painters come from the theme object, page chrome from CSS
// custom properties switched by `data-theme` (see style.css).
const theme = themeById(params.theme);
document.documentElement.dataset.theme = theme.id;
const storybook = theme.id === 'storybook';
if (storybook) {
  const paper = paperTexture();
  if (paper) document.documentElement.style.setProperty('--paper', `url(${paper})`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ead9b4');
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'light');
}
// Storybook proof: the mocked faction state behind the board frame, offer cards and map.
let factions: FactionDirector | null = null;
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
const screen = createGameScreen(
  app,
  {
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
  },
  storybook
    ? { brand: STORYBOOK_BRAND, decorateOffer: (id) => factions?.decorate(id) ?? null }
    : {},
);

const renderer = new BoardRenderer(screen.canvas, DEFAULT_RULES.boardSize, {
  clock: debugClock ?? browserClock,
  theme,
});
if (storybook) {
  factions = new FactionDirector(
    {
      setScenery: (scenery, revealMs) => {
        renderer.setScenery(scenery, revealMs);
      },
      addEffect: (effect) => {
        renderer.addEffect(effect);
      },
      burst: (spec) => {
        renderer.fx.burst(spec);
        renderer.wake();
      },
      viewTimeNow: () => renderer.viewTimeNow(),
      get reducedMotion() {
        return renderer.motionReduced;
      },
      fontFamily: theme.fontFamily,
    },
    parseMockFaction(params.mockFaction),
  );
}

/** Storybook proof: the act 1 journey map as an overlay (stage C puts it between stages). */
function showJourney(state: Partial<JourneyState> | null, moment: JourneyMoment = null): void {
  if (state === null || !factions) {
    screen.ui.showOverlay(null);
    return;
  }
  const full: JourneyState = { ...factions.journey(controller.run), ...state };
  screen.ui.showOverlay(
    journeyScreen(
      full,
      () => {
        screen.ui.showOverlay(null);
      },
      moment,
    ),
    'journey',
  );
}

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
  board: rendererBoard(renderer),
  theme,
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
    screen.ui.updateHud(factions ? factions.decorateHud(hud) : hud);
    feedback.hud(hud);
    if (factions) {
      const played = factions.update(
        hud.relics.map((r) => r.id),
        controller.run?.seed ?? null,
      );
      // The ribbon takes the board's centre: the stage banner steps aside (the HUD has the goal).
      if (played.length > 0) screen.ui.announceStage(null);
    }
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
    if (screen.ui.overlayOpen) return;
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
    if (screen.ui.overlayOpen) screen.ui.showOverlay(null);
    else controller.back();
  },
});

if (params.mode) controller.start(params.mode, undefined, startOptions(params));
else controller.showMenu();
if (storybook && params.journey !== null) showJourney({ reached: params.journey });

// Offline play and installs (production builds only; the dev server has no worker).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL;
  const updates = new UpdateFlow({
    container: navigator.serviceWorker,
    url: `${base}sw.js`,
    scope: base,
    onUpdateReady: () => {
      toast.show();
    },
    reload: () => {
      window.location.reload();
    },
    now: () => Date.now(),
    onError: (error) => {
      console.warn('[neon-rift] service worker:', error);
    },
  });
  const toast = createUpdateToast(screen.surface, () => {
    updates.apply();
  });
  void updates.start();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updates.checkForUpdate();
  });
}

if (debugClock) {
  const storybookDebug: DebugStorybook | undefined = factions
    ? {
        moment: (kind, race = 'dwarf') => {
          factions.celebrate(kind, race);
          screen.ui.announceStage(null);
        },
        setMock: (spec) => {
          factions.setBonus(parseMockFaction(spec));
        },
        journey: (state, moment) => {
          showJourney(state === undefined ? {} : state, moment ?? null);
        },
        scenery: () => renderer.currentScenery,
        art: () => factionArt(),
      }
    : undefined;
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
    ...(storybookDebug ? { storybook: storybookDebug } : {}),
  });
  console.info('[neon-rift] debug hook ready: window.__neonRift');
}
