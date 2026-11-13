/**
 * Builds the app's DOM (HUD, board canvas with its DOM overlays, full-screen
 * sheets) and implements the controller's `UiDisplay`.
 *
 * What lives where: the board and everything tied to cells (tiles, sealed
 * line, boss target, targeting outlines) is drawn on the canvas; text, buttons
 * and anything the player reads or taps outside a cell is DOM, which gives us
 * fonts, layout, focus and accessibility for free.
 *
 * The template is static (no user data), so innerHTML is safe here.
 */
import type { RelicId } from '../core';
import type { UiDisplay } from '../game/runController';
import type { Hint, HudModel, ScreenModel, StageBanner } from '../game/runView';
import { ref, replayClass } from './dom';
import { Hud } from './hud';
import {
  confirmScreen,
  helpScreen,
  menuScreen,
  offerScreen,
  pauseScreen,
  resultScreen,
  settingsScreen,
  type ScreenHandlers,
} from './screens';

/** Length of the stage banner animation (keep in sync with `.banner.show` in style.css). */
const BANNER_MS = 2800;

export interface GameScreenHandlers extends ScreenHandlers {
  readonly onActivateRelic: (id: RelicId) => void;
  readonly onCancelTargeting: () => void;
  readonly onPause: () => void;
  readonly onDismissHint: () => void;
}

const TEMPLATE = `
  <div class="game" data-ref="game">
    <header class="topbar">
      <div class="stage-pill" data-ref="stage">1막 1</div>
      <div class="score-box">
        <span class="score-label">점수</span>
        <span class="score-value" data-ref="score">0</span>
        <span class="score-gains" data-ref="gains" aria-hidden="true"></span>
      </div>
      <button type="button" class="icon-btn" data-ref="pause" aria-label="일시정지">
        <span class="pause-glyph" aria-hidden="true"></span>
      </button>
    </header>
    <section class="goal" data-ref="goal">
      <div class="goal-main">
        <div class="goal-line">
          <span class="goal-text" data-ref="goalText"></span>
          <span class="goal-count" data-ref="goalCount"></span>
        </div>
        <div class="bar">
          <div class="bar-pace" data-ref="goalPace" hidden></div>
          <div class="bar-fill" data-ref="goalBar"></div>
        </div>
      </div>
      <div class="moves" data-ref="moves">
        <span class="moves-label" data-ref="movesLabel">남은 이동</span>
        <span class="moves-value" data-ref="movesValue">0</span>
      </div>
    </section>
    <section class="boss" data-ref="boss" hidden>
      <div class="boss-line">
        <span class="boss-name" data-ref="bossName"></span>
        <span class="boss-preview" data-ref="bossPreview"></span>
        <span class="boss-count"><small data-ref="bossCountLabel">발동까지</small><b data-ref="bossCount">0</b>턴</span>
      </div>
      <p class="boss-rule" data-ref="bossRule"></p>
    </section>
    <div class="board-area">
      <div class="board" data-ref="board">
        <canvas class="board-canvas" role="img" aria-label="게임 보드"></canvas>
        <div class="banner" data-ref="banner" aria-live="polite"></div>
      </div>
    </div>
    <section class="actives" data-ref="actives" hidden></section>
    <section class="tray" data-ref="trayBox">
      <!-- Hints live here, below the board: they never cover a cell they talk about. -->
      <div class="hint" data-ref="hint" role="status" hidden>
        <p><strong data-ref="hintTitle"></strong><span data-ref="hintText"></span></p>
        <button type="button" class="hint-close" data-ref="hintClose">확인</button>
      </div>
      <div class="tray-chips" data-ref="tray"></div>
      <button type="button" class="tray-all" data-ref="trayAll" aria-label="가진 유물 전체 보기">유물</button>
      <div class="tooltip" data-ref="tooltip" role="tooltip" hidden></div>
      <!-- Status bars sit over the tray, never over the board the player must see and tap. -->
      <div class="board-msg" data-ref="stuck" role="status" hidden>움직일 수 없어요 · 유물을 사용하세요</div>
      <div class="target-bar" data-ref="targetBar" hidden>
        <p><span data-ref="targetPrompt"></span><span class="target-error" data-ref="targetError"></span></p>
        <button type="button" class="btn btn-small" data-ref="targetCancel">취소</button>
      </div>
    </section>
  </div>
  <div class="screen" data-ref="sheet" role="dialog" aria-modal="true" hidden></div>
`;

export interface GameScreen {
  /** Full-screen element that receives swipes and taps. */
  readonly surface: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly ui: GameUi;
}

export class GameUi implements UiDisplay {
  readonly hud: Hud;
  private readonly game: HTMLElement;
  private readonly sheet: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly hintBox: HTMLElement;
  private readonly trayBox: HTMLElement;
  private readonly hintTitle: HTMLElement;
  private readonly hintText: HTMLElement;
  private readonly targetBar: HTMLElement;
  private readonly targetPrompt: HTMLElement;
  private readonly targetError: HTMLElement;
  private lastHud: HudModel | null = null;
  private screen: ScreenModel['kind'] = 'menu';
  /** Until when (performance.now) the stage banner is on screen. */
  private bannerUntil = 0;
  /** Whether the last input came from a keyboard (then sheets move focus to their first button). */
  private keyboard = false;

  constructor(
    private readonly surface: HTMLElement,
    private readonly handlers: GameScreenHandlers,
  ) {
    this.game = ref(surface, 'game', HTMLElement);
    this.sheet = ref(surface, 'sheet', HTMLElement);
    this.banner = ref(surface, 'banner', HTMLElement);
    this.hintBox = ref(surface, 'hint', HTMLElement);
    this.trayBox = ref(surface, 'trayBox', HTMLElement);
    this.hintTitle = ref(surface, 'hintTitle', HTMLElement);
    this.hintText = ref(surface, 'hintText', HTMLElement);
    this.targetBar = ref(surface, 'targetBar', HTMLElement);
    this.targetPrompt = ref(surface, 'targetPrompt', HTMLElement);
    this.targetError = ref(surface, 'targetError', HTMLElement);
    this.hud = new Hud(surface, {
      onActivateRelic: (id) => {
        handlers.onActivateRelic(id);
      },
      onOpenRelics: () => {
        handlers.onPause();
      },
    });
    window.addEventListener('keydown', () => {
      this.keyboard = true;
    });
    window.addEventListener('pointerdown', () => {
      this.keyboard = false;
    });
    ref(surface, 'pause', HTMLButtonElement).addEventListener('click', () => {
      handlers.onPause();
    });
    ref(surface, 'hintClose', HTMLButtonElement).addEventListener('click', () => {
      handlers.onDismissHint();
    });
    ref(surface, 'targetCancel', HTMLButtonElement).addEventListener('click', () => {
      handlers.onCancelTargeting();
    });
  }

  /** Current screen kind (the surface uses it to route taps). */
  get screenKind(): ScreenModel['kind'] {
    return this.screen;
  }

  showScreen(screen: ScreenModel): void {
    this.screen = screen.kind;
    this.surface.dataset.screen = screen.kind;
    // The game stays visible behind sheets opened from the pause screen only.
    this.game.hidden =
      screen.kind === 'menu' ||
      screen.kind === 'confirm' ||
      ((screen.kind === 'help' || screen.kind === 'settings') && screen.back === 'menu');
    const targeting = screen.kind === 'targeting';
    this.targetBar.hidden = !targeting;
    this.hud.setTargeting(targeting ? screen.relic : null);
    if (targeting) {
      this.targetPrompt.textContent = screen.prompt;
      this.targetError.textContent = screen.error ?? '';
    }
    this.hud.hideTooltip();

    const h = this.handlers;
    let content: HTMLElement | null = null;
    switch (screen.kind) {
      case 'menu':
        content = menuScreen(screen, h);
        break;
      case 'help':
        content = helpScreen(screen, h);
        break;
      case 'settings':
        content = settingsScreen(screen, h);
        break;
      case 'confirm':
        content = confirmScreen(screen, h);
        break;
      case 'offer':
        content = offerScreen(screen, h);
        break;
      case 'paused':
        content = pauseScreen(this.lastHud, h);
        break;
      case 'result':
        content = resultScreen(screen, h);
        break;
      case 'playing':
      case 'targeting':
        break;
    }
    this.sheet.replaceChildren(...(content ? [content] : []));
    this.sheet.hidden = content === null;
    this.sheet.className = `screen screen-${screen.kind}`;
    // Keyboard users land on the first action (touch users get no focus ring).
    if (this.keyboard) {
      content?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
  }

  updateHud(hud: HudModel): void {
    this.lastHud = hud;
    this.hud.update(hud);
  }

  scoreGained(amount: number): void {
    this.hud.scoreGained(amount);
  }

  showHint(hint: Hint | null): void {
    this.hintBox.hidden = hint === null;
    this.trayBox.classList.toggle('has-hint', hint !== null);
    if (hint) {
      this.hintTitle.textContent = hint.title;
      this.hintText.textContent = hint.text;
      replayClass(this.hintBox, 'show');
    }
  }

  /** Shows the stage banner (it fades by itself, or on the first input); null takes it down. */
  announceStage(banner: StageBanner | null): void {
    if (!banner) {
      // Only a banner still on screen fades out (re-animating a faded one would flash it).
      if (performance.now() < this.bannerUntil) this.banner.classList.add('leave');
      this.bannerUntil = 0;
      return;
    }
    const title = document.createElement('strong');
    title.textContent = banner.title;
    const goal = document.createElement('b');
    goal.textContent = banner.goal;
    const detail = document.createElement('span');
    detail.textContent = banner.detail;
    this.banner.replaceChildren(title, goal, detail);
    this.banner.classList.remove('leave');
    replayClass(this.banner, 'show');
    this.bannerUntil = performance.now() + BANNER_MS;
    this.hud.introduce();
  }

  pulseRelic(id: RelicId): void {
    this.hud.pulseRelic(id);
  }
}

export function createGameScreen(root: HTMLElement, handlers: GameScreenHandlers): GameScreen {
  const surface = document.createElement('main');
  surface.className = 'app';
  surface.innerHTML = TEMPLATE;
  root.replaceChildren(surface);
  const canvas = surface.querySelector('canvas');
  if (!canvas) throw new Error('gameScreen: missing canvas');
  return { surface, canvas, ui: new GameUi(surface, handlers) };
}
