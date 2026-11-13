/**
 * The glue between core, renderer and HUD for one game. It owns the
 * authoritative `GameState`, sends every turn to the core, and forwards the
 * result to its displays. It talks to them through small interfaces so it can
 * be unit-tested with fakes, and so later modes (stage run, endless) can reuse
 * or wrap it.
 */
import { DEFAULT_RULES, move, newGame, randomSeed } from '../core';
import type { CoreRules, Direction, GameState, TurnResult } from '../core';

/** What the controller needs from the board renderer. */
export interface BoardDisplay {
  startGame(result: TurnResult): void;
  playTurn(result: TurnResult): void;
}

export interface GameOverInfo {
  readonly score: number;
  readonly best: number;
  readonly isNewBest: boolean;
}

/** What the controller needs from the HUD. */
export interface HudDisplay {
  /** `gained` is the score added this turn (0 on reset), for a "+N" pop. */
  setScore(score: number, gained: number): void;
  setBest(best: number): void;
  showGameOver(info: GameOverInfo): void;
  hideGameOver(): void;
}

export interface GameControllerOptions {
  readonly board: BoardDisplay;
  readonly hud: HudDisplay;
  readonly rules?: CoreRules;
  /** Seed source for new games. Defaults to a random seed. */
  readonly seed?: () => number | string;
  readonly initialBest?: number;
  /** Called whenever the best score rises (stage 4 persists it here). */
  readonly onBestChange?: (best: number) => void;
}

export class GameController {
  private state: GameState | null = null;
  private best: number;
  /** Best score when the current game started, to tell whether it was beaten. */
  private bestAtStart: number;
  private readonly rules: CoreRules;

  constructor(private readonly options: GameControllerOptions) {
    this.rules = options.rules ?? DEFAULT_RULES;
    this.best = options.initialBest ?? 0;
    this.bestAtStart = this.best;
  }

  get currentState(): GameState | null {
    return this.state;
  }

  get bestScore(): number {
    return this.best;
  }

  newGame(seed: number | string = (this.options.seed ?? randomSeed)()): void {
    const result = newGame({ seed, rules: this.rules });
    this.state = result.state;
    this.bestAtStart = this.best;
    const { board, hud } = this.options;
    hud.hideGameOver();
    hud.setScore(result.state.score, 0);
    hud.setBest(this.best);
    board.startGame(result);
  }

  /** Plays one move. Returns whether the board changed. Ignored before a game starts or after it ends. */
  handleDirection(direction: Direction): boolean {
    if (!this.state || this.state.over) return false;
    const result = move(this.state, direction, this.rules);
    if (!result.moved) return false;
    this.state = result.state;

    const { board, hud } = this.options;
    board.playTurn(result);

    let gained = 0;
    let over = false;
    for (const e of result.events) {
      if (e.type === 'score') gained += e.gained;
      else if (e.type === 'gameOver') over = true;
    }
    hud.setScore(result.state.score, gained);
    if (result.state.score > this.best) {
      this.best = result.state.score;
      hud.setBest(this.best);
      this.options.onBestChange?.(this.best);
    }
    if (over) {
      hud.showGameOver({
        score: result.state.score,
        best: this.best,
        isNewBest: result.state.score > this.bestAtStart,
      });
    }
    return true;
  }
}
