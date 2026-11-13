/**
 * URL launch options and the `?debug` console hook.
 *
 * - `?seed=<n or text>` starts the first game with that seed (works without debug).
 * - `?debug` additionally exposes `window.__neonRift` for tests and manual
 *   debugging. Nothing is exposed without the flag.
 */
import { DIRECTIONS, toValueGrid } from '../core';
import type { Direction, GameState } from '../core';
import type { GameController } from './controller';

export interface LaunchParams {
  readonly debug: boolean;
  /** Seed for the first game, or null for a random one. Digit-only seeds become numbers. */
  readonly seed: number | string | null;
}

export function readLaunchParams(search: string): LaunchParams {
  const params = new URLSearchParams(search);
  const raw = params.get('seed')?.trim() ?? '';
  const seed = raw === '' ? null : /^\d+$/.test(raw) ? Number(raw) : raw;
  return { debug: params.has('debug'), seed };
}

/** Clock controls the debug API needs (implemented by `PausableClock`). */
export interface SteppableClock {
  readonly paused: boolean;
  pause(): void;
  resume(): void;
  advance(ms: number): void;
}

/** Renderer controls the debug API needs (implemented by `BoardRenderer`). */
export interface SettleableBoard {
  settle(): void;
  isAnimating(): boolean;
}

export interface DebugApi {
  /** Current core state as plain data (a deep copy), or null before the first game. */
  state(): GameState | null;
  /** Current board as a grid of numbers (0 = empty). */
  grid(): number[][];
  /** Plays a move through the controller, like a swipe. Returns whether the board changed. */
  move(direction: Direction): boolean;
  /** Starts a new game, optionally with a fixed seed. */
  newGame(seed?: number | string): void;
  /** Pauses the real clock and steps animation time forward by `ms`. */
  advance(ms: number): void;
  /** Jumps all running animation to its end. */
  settle(): void;
  isAnimating(): boolean;
  pause(): void;
  /** Returns to the real clock. */
  resume(): void;
}

declare global {
  interface Window {
    __neonRift?: DebugApi;
  }
}

export function createDebugApi(deps: {
  readonly controller: GameController;
  readonly board: SettleableBoard;
  readonly clock: SteppableClock;
}): DebugApi {
  const { controller, board, clock } = deps;
  return {
    state: () => {
      const state = controller.currentState;
      return state ? structuredClone(state) : null;
    },
    grid: () => {
      const state = controller.currentState;
      return state ? toValueGrid(state) : [];
    },
    move: (direction) => {
      if (!DIRECTIONS.includes(direction)) {
        throw new Error(`__neonRift.move: expected one of ${DIRECTIONS.join(', ')}`);
      }
      return controller.handleDirection(direction);
    },
    newGame: (seed) => {
      controller.newGame(seed);
    },
    advance: (ms) => {
      clock.advance(ms);
    },
    settle: () => {
      board.settle();
    },
    isAnimating: () => board.isAnimating(),
    pause: () => {
      clock.pause();
    },
    resume: () => {
      clock.resume();
    },
  };
}
