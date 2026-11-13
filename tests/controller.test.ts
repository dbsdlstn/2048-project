import { describe, expect, it } from 'vitest';
import { DIRECTIONS, type TurnResult } from '../src/core';
import {
  GameController,
  type BoardDisplay,
  type GameOverInfo,
  type HudDisplay,
} from '../src/game/controller';

class FakeBoard implements BoardDisplay {
  started: TurnResult[] = [];
  turns: TurnResult[] = [];
  startGame(result: TurnResult): void {
    this.started.push(result);
  }
  playTurn(result: TurnResult): void {
    this.turns.push(result);
  }
}

class FakeHud implements HudDisplay {
  score = -1;
  gains: number[] = [];
  best = -1;
  gameOver: GameOverInfo | null = null;
  setScore(score: number, gained: number): void {
    this.score = score;
    this.gains.push(gained);
  }
  setBest(best: number): void {
    this.best = best;
  }
  showGameOver(info: GameOverInfo): void {
    this.gameOver = info;
  }
  hideGameOver(): void {
    this.gameOver = null;
  }
}

function setup(initialBest = 0) {
  const board = new FakeBoard();
  const hud = new FakeHud();
  const controller = new GameController({ board, hud, seed: () => 'ctl', initialBest });
  return { board, hud, controller };
}

/** Plays moves in a fixed cycle until the game ends. */
function playToEnd(controller: GameController): void {
  for (let i = 0; i < 5000 && !controller.currentState?.over; i++) {
    for (const d of DIRECTIONS) if (controller.handleDirection(d)) break;
  }
}

describe('GameController', () => {
  it('ignores input before a game starts', () => {
    const { board, controller } = setup();
    expect(controller.handleDirection('left')).toBe(false);
    expect(board.turns).toHaveLength(0);
  });

  it('new game resets the HUD and starts the board', () => {
    const { board, hud, controller } = setup(120);
    controller.newGame();
    expect(board.started).toHaveLength(1);
    expect(hud.score).toBe(0);
    expect(hud.best).toBe(120);
    expect(controller.currentState?.turn).toBe(0);
  });

  it('valid moves reach the board and update score; invalid ones do nothing', () => {
    const { board, hud, controller } = setup();
    controller.newGame();
    let moves = 0;
    for (let i = 0; i < 50; i++) {
      if (controller.handleDirection(DIRECTIONS[i % 4] ?? 'left')) moves++;
    }
    expect(board.turns).toHaveLength(moves);
    expect(hud.score).toBe(controller.currentState?.score);
    expect(hud.gains.reduce((a, b) => a + b, 0)).toBe(controller.currentState?.score);
  });

  it('tracks the best score and reports game over with a new best', () => {
    const { hud, controller } = setup();
    controller.newGame();
    playToEnd(controller);
    const final = controller.currentState;
    expect(final?.over).toBe(true);
    expect(controller.bestScore).toBe(final?.score);
    expect(hud.best).toBe(final?.score);
    expect(hud.gameOver).toEqual({ score: final?.score, best: final?.score, isNewBest: true });
    // No more moves after game over.
    expect(controller.handleDirection('left')).toBe(false);
  });

  it('does not claim a new best when the previous best was higher', () => {
    const { hud, controller } = setup(10_000_000);
    controller.newGame();
    playToEnd(controller);
    expect(hud.gameOver?.isNewBest).toBe(false);
    expect(controller.bestScore).toBe(10_000_000);
  });

  it('starting a new game hides the game-over overlay', () => {
    const { hud, controller } = setup();
    controller.newGame();
    playToEnd(controller);
    expect(hud.gameOver).not.toBeNull();
    controller.newGame();
    expect(hud.gameOver).toBeNull();
    expect(hud.score).toBe(0);
  });
});
