/**
 * DOM HUD: score, best score, new-game button and the game-over overlay.
 * Implements the controller's `HudDisplay`; it only displays what it is told.
 */
import type { GameOverInfo, HudDisplay } from '../game/controller';

export interface HudElements {
  readonly score: HTMLElement;
  readonly best: HTMLElement;
  /** Container the floating "+N" score popups are added to. */
  readonly gainLayer: HTMLElement;
  readonly overlay: HTMLElement;
  readonly overlayScore: HTMLElement;
  readonly overlayBest: HTMLElement;
  readonly restartButton: HTMLButtonElement;
}

const numberFormat = new Intl.NumberFormat('ko-KR');

export function formatScore(value: number): string {
  return numberFormat.format(value);
}

export class Hud implements HudDisplay {
  constructor(private readonly el: HudElements) {}

  setScore(score: number, gained: number): void {
    this.el.score.textContent = formatScore(score);
    if (gained > 0) this.popGain(gained);
  }

  setBest(best: number): void {
    this.el.best.textContent = formatScore(best);
  }

  showGameOver(info: GameOverInfo): void {
    this.el.overlayScore.textContent = formatScore(info.score);
    this.el.overlayBest.hidden = !info.isNewBest;
    this.el.overlay.hidden = false;
    // Focus the restart button so Enter / Space restarts on desktop.
    this.el.restartButton.focus({ preventScroll: true });
  }

  hideGameOver(): void {
    this.el.overlay.hidden = true;
  }

  /** Floating "+N" above the score; removes itself when its CSS animation ends. */
  private popGain(gained: number): void {
    const pop = document.createElement('span');
    pop.className = 'score-gain';
    pop.textContent = `+${formatScore(gained)}`;
    pop.addEventListener('animationend', () => {
      pop.remove();
    });
    this.el.gainLayer.append(pop);
  }
}
