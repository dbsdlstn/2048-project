/**
 * Builds the game screen's DOM: HUD on top, the board canvas, a hint line.
 * The template is static (no user data), so innerHTML is safe here.
 */
import { Hud } from './hud';

export interface GameScreen {
  /** Full-screen element that receives swipes. */
  readonly surface: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly hud: Hud;
}

export interface GameScreenHandlers {
  readonly onNewGame: () => void;
}

const TEMPLATE = `
  <div class="column">
    <header class="hud">
      <div class="hud-row">
        <h1 class="logo">NEON<span>RIFT</span></h1>
        <button type="button" class="btn" data-ref="newGame">새 게임</button>
      </div>
      <div class="hud-row scores">
        <div class="score-box">
          <span class="score-label">점수</span>
          <span class="score-value" data-ref="score">0</span>
          <span class="score-gains" data-ref="gains" aria-hidden="true"></span>
        </div>
        <div class="score-box">
          <span class="score-label">최고 기록</span>
          <span class="score-value" data-ref="best">0</span>
        </div>
      </div>
    </header>
    <div class="board">
      <canvas class="board-canvas" role="img" aria-label="게임 보드"></canvas>
      <div class="overlay" data-ref="overlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title" hidden>
        <p class="overlay-title" id="game-over-title">게임 오버</p>
        <p class="overlay-score">점수 <strong data-ref="overlayScore">0</strong></p>
        <p class="overlay-best" data-ref="overlayBest" hidden>새 최고 기록!</p>
        <button type="button" class="btn btn-primary" data-ref="restart">다시 하기</button>
      </div>
    </div>
    <p class="hint">화면을 밀거나 방향키(WASD)로 타일을 움직여 같은 숫자를 합치세요</p>
  </div>
`;

function ref<T extends HTMLElement>(root: HTMLElement, name: string, type: new () => T): T {
  const el = root.querySelector(`[data-ref="${name}"]`);
  if (!(el instanceof type)) throw new Error(`gameScreen: missing element ${name}`);
  return el;
}

export function createGameScreen(root: HTMLElement, handlers: GameScreenHandlers): GameScreen {
  const surface = document.createElement('main');
  surface.className = 'game';
  surface.innerHTML = TEMPLATE;
  root.replaceChildren(surface);

  const canvas = surface.querySelector('canvas');
  if (!canvas) throw new Error('gameScreen: missing canvas');

  const restartButton = ref(surface, 'restart', HTMLButtonElement);
  const hud = new Hud({
    score: ref(surface, 'score', HTMLElement),
    best: ref(surface, 'best', HTMLElement),
    gainLayer: ref(surface, 'gains', HTMLElement),
    overlay: ref(surface, 'overlay', HTMLElement),
    overlayScore: ref(surface, 'overlayScore', HTMLElement),
    overlayBest: ref(surface, 'overlayBest', HTMLElement),
    restartButton,
  });

  const newGame = (): void => {
    handlers.onNewGame();
  };
  ref(surface, 'newGame', HTMLButtonElement).addEventListener('click', newGame);
  restartButton.addEventListener('click', newGame);

  return { surface, canvas, hud };
}
