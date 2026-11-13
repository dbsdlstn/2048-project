import { describe, expect, it } from 'vitest';
import { move, newGame, toValueGrid, type TurnResult } from '../src/core';
import { GameController, type BoardDisplay, type HudDisplay } from '../src/game/controller';
import { createDebugApi, readLaunchParams } from '../src/game/debug';
import { BoardView, ManualClock, PausableClock } from '../src/render';

describe('readLaunchParams', () => {
  it.each<[string, boolean, number | string | null]>([
    ['', false, null],
    ['?debug', true, null],
    ['?seed=42', false, 42],
    ['?debug&seed=42', true, 42],
    ['?seed=neon', false, 'neon'],
    ['?seed=', false, null],
    ['?debug=0&seed=7', true, 7],
  ])('%j -> debug %s, seed %j', (search, debug, seed) => {
    expect(readLaunchParams(search)).toEqual({ debug, seed });
  });
});

/** A board display backed by a real BoardView on an injected clock (no canvas). */
class ViewBoard implements BoardDisplay {
  readonly view = new BoardView(4);
  constructor(private readonly clock: PausableClock) {}
  startGame(result: TurnResult): void {
    this.view.clear(result.state.size);
    this.view.apply(result.events, this.clock.now());
  }
  playTurn(result: TurnResult): void {
    this.view.apply(result.events, this.clock.now());
  }
  settle(): void {
    this.view.finish();
  }
  isAnimating(): boolean {
    return this.view.isAnimating(this.clock.now());
  }
}

const nullHud: HudDisplay = {
  setScore: () => undefined,
  setBest: () => undefined,
  showGameOver: () => undefined,
  hideGameOver: () => undefined,
};

function setup() {
  const clock = new PausableClock(new ManualClock(0));
  const board = new ViewBoard(clock);
  const controller = new GameController({ board, hud: nullHud });
  const api = createDebugApi({ controller, board, clock });
  return { clock, board, controller, api };
}

describe('debug API', () => {
  it('reproduces a seeded game exactly', () => {
    const { api } = setup();
    api.newGame(42);
    let expected = newGame({ seed: 42 }).state;
    expect(api.grid()).toEqual(toValueGrid(expected));
    for (const dir of ['left', 'up', 'right', 'down'] as const) {
      const r = move(expected, dir);
      expect(api.move(dir)).toBe(r.moved);
      expected = r.state;
    }
    expect(api.grid()).toEqual(toValueGrid(expected));
    expect(api.state()).toEqual(expected);
  });

  it('state() is a detached copy', () => {
    const { api, controller } = setup();
    api.newGame(1);
    expect(api.state()).not.toBe(controller.currentState);
  });

  it('advance() steps animation on a paused clock; settle() finishes it', () => {
    const { api } = setup();
    api.newGame(3);
    expect(api.isAnimating()).toBe(true);
    api.advance(50);
    expect(api.isAnimating()).toBe(true); // spawn takes 150 ms
    api.advance(200);
    expect(api.isAnimating()).toBe(false);

    for (const d of ['left', 'right', 'up', 'down'] as const) if (api.move(d)) break;
    expect(api.isAnimating()).toBe(true);
    api.settle();
    expect(api.isAnimating()).toBe(false);
  });

  it('rejects unknown directions', () => {
    const { api } = setup();
    api.newGame(1);
    expect(() => api.move('sideways' as 'left')).toThrow(/expected one of/);
  });
});
