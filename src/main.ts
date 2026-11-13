// App entry: builds the screen, then wires input -> controller -> renderer / HUD.
import { DEFAULT_RULES } from './core';
import { GameController } from './game/controller';
import { createDebugApi, readLaunchParams } from './game/debug';
import { attachInput } from './input';
import { BoardRenderer, PausableClock, browserClock } from './render';
import { createGameScreen } from './ui';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app element missing');

const params = readLaunchParams(window.location.search);
// Only debug builds of the page get a clock that can be paused and stepped.
const debugClock = params.debug ? new PausableClock(browserClock) : null;

const screen = createGameScreen(app, {
  // Only reachable by a click, which happens after `controller` is initialised below.
  onNewGame: () => {
    controller.newGame();
  },
});
const renderer = new BoardRenderer(screen.canvas, DEFAULT_RULES.boardSize, {
  clock: debugClock ?? browserClock,
});
const controller = new GameController({ board: renderer, hud: screen.hud });

attachInput({
  surface: screen.surface,
  onDirection: (direction) => {
    controller.handleDirection(direction);
  },
});

if (params.seed === null) controller.newGame();
else controller.newGame(params.seed);

if (debugClock) {
  window.__neonRift = createDebugApi({ controller, board: renderer, clock: debugClock });
  console.info('[neon-rift] debug hook ready: window.__neonRift');
}
