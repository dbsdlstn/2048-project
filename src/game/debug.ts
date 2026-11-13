/**
 * URL launch options and the `?debug` console hook.
 *
 * - `?seed=<n or text>` seeds the first run (works without debug).
 * - `?mode=run|endless` skips the menu and starts that mode; `?stage=<index>`
 *   (0-based) and `?relics=a,b` set the start (run mode stage, owned relics).
 * - `?debug` additionally exposes `window.__neonRift` for automated checks,
 *   agent playtests and manual debugging. Nothing is exposed without the flag.
 */
import { DIRECTIONS, RELIC_IDS, toValueGrid } from '../core';
import type {
  Direction,
  GameState,
  Position,
  RelicId,
  RunMode,
  RunState,
  StartOptions,
} from '../core';
import type { SoundLogEntry } from '../audio/engine';
import type { RenderedSound } from '../audio/webaudio';
import type { FrameStats } from '../render/renderer';
import type { RunController } from './runController';
import { hudModel, isRelicId, type HudModel, type Hint, type ScreenModel } from './runView';

export interface LaunchParams {
  readonly debug: boolean;
  /** Seed for the first run, or null for a random one. Digit-only seeds become numbers. */
  readonly seed: number | string | null;
  /** Mode to start right away (skipping the menu), or null for the menu. */
  readonly mode: RunMode | null;
  /** Run mode: 0-based stage to start at. */
  readonly stage: number | null;
  /** Relics owned from the start (unknown ids are dropped). */
  readonly relics: readonly RelicId[];
}

export function readLaunchParams(search: string): LaunchParams {
  const params = new URLSearchParams(search);
  const raw = params.get('seed')?.trim() ?? '';
  const seed = raw === '' ? null : /^\d+$/.test(raw) ? Number(raw) : raw;
  const modeRaw = params.get('mode');
  const mode = modeRaw === 'run' || modeRaw === 'endless' ? modeRaw : null;
  const stageRaw = params.get('stage') ?? '';
  const stage = /^\d+$/.test(stageRaw) ? Number(stageRaw) : null;
  const relics = (params.get('relics') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(isRelicId);
  return { debug: params.has('debug'), seed, mode, stage, relics };
}

/** Start options from launch params (only what was given). */
export function startOptions(params: LaunchParams): StartOptions {
  return {
    ...(params.stage !== null ? { stageIndex: params.stage } : {}),
    ...(params.relics.length > 0 ? { relics: params.relics } : {}),
  };
}

/** Clock controls the debug API needs (implemented by `PausableClock`). */
export interface SteppableClock {
  readonly paused: boolean;
  pause(): void;
  resume(): void;
  advance(ms: number): void;
}

/** Renderer controls the debug API needs (implemented by `BoardRenderer`). */
export interface DebugBoard {
  settle(): void;
  isAnimating(): boolean;
  /** Viewport coordinates of a cell's centre, for real pointer taps. */
  cellClientCenter?(row: number, col: number): { x: number; y: number };
  frameStats?(): FrameStats;
  resetFrameStats?(): void;
}

/** Feedback internals the debug API can inspect (stage 5). */
export interface DebugFeedback {
  /** Every sound request with its outcome (played, throttled, late, capped…). */
  sounds(): readonly SoundLogEntry[];
  /** Every vibration request and whether it was sent. */
  haptics(): readonly { kind: string; t: number; sent: boolean }[];
  /** Renders one sound offline and measures it (peak, RMS). */
  renderSound(id: string, pitch?: number): Promise<RenderedSound>;
  /** Renders several sounds together (`at` in s) to check stacking. */
  renderMix(items: readonly { id: string; at?: number; pitch?: number }[]): Promise<RenderedSound>;
  clearLogs(): void;
}

export interface DebugApi {
  /** The whole run as plain data (a deep copy), or null on the menu. */
  run(): RunState | null;
  /** Current board as plain data, or null on the menu. */
  state(): GameState | null;
  /** Current board as a grid of numbers (0 = empty, stones and prisms are 0 too). */
  grid(): number[][];
  /** What the HUD shows right now (goal, moves, boss countdown, relics…). */
  hud(): HudModel | null;
  /** The screen model on display (menu, playing, targeting, offer, result…). */
  screen(): ScreenModel;
  /** The hint on display, if any. */
  hint(): Hint | null;
  /** Starts a run or an endless game, like the menu (optionally seeded, at a stage, with relics). */
  start(mode: RunMode, seed?: number | string, options?: StartOptions): void;
  /** Continues from plain run data (e.g. an edited `run()` dump) to set up exact situations. */
  load(run: RunState): void;
  /** Plays a move like a swipe. Returns whether the board changed. */
  move(direction: Direction): boolean;
  /** Picks an offered relic (or null to skip). */
  chooseRelic(id: RelicId | null): boolean;
  /** Uses an active relic directly, bypassing targeting (`target` for bomb / pin). */
  useActive(id: RelicId, target?: Position): boolean;
  /** Presses an active relic's button (undo fires, bomb / pin enter targeting). */
  activate(id: RelicId): boolean;
  /** Taps a cell through the controller (no pointer event). */
  tapCell(row: number, col: number): boolean;
  /** Viewport point of a cell's centre, for real pointer taps in browser tests. */
  cellPoint(row: number, col: number): { x: number; y: number } | null;
  menu(): void;
  /** Pauses the real clock and steps animation time forward by `ms`. */
  advance(ms: number): void;
  /** Jumps all running animation to its end. */
  settle(): void;
  isAnimating(): boolean;
  pause(): void;
  /** Returns to the real clock. */
  resume(): void;
  /** Frame-time statistics of the last animated frames, or null. */
  frameStats(): FrameStats | null;
  resetFrameStats(): void;
  /** Sound / vibration logs and offline sound rendering, when wired. */
  readonly feedback: DebugFeedback | null;
}

declare global {
  interface Window {
    __neonRift?: DebugApi;
  }
}

export function createDebugApi(deps: {
  readonly controller: RunController;
  readonly board: DebugBoard;
  readonly clock: SteppableClock;
  readonly feedback?: DebugFeedback;
}): DebugApi {
  const { controller, board, clock } = deps;
  const requireRelic = (id: RelicId): void => {
    if (!RELIC_IDS.includes(id)) {
      throw new Error(`__neonRift: unknown relic ${id} (${RELIC_IDS.join(', ')})`);
    }
  };
  return {
    run: () => {
      const run = controller.run;
      return run ? structuredClone(run) : null;
    },
    state: () => {
      const run = controller.run;
      return run ? structuredClone(run.board) : null;
    },
    grid: () => {
      const run = controller.run;
      return run ? toValueGrid(run.board) : [];
    },
    hud: () => {
      const run = controller.run;
      return run ? hudModel(run) : null;
    },
    screen: () => controller.screenState,
    hint: () => controller.hint,
    start: (mode, seed, options) => {
      if (!['run', 'endless'].includes(mode)) {
        throw new Error("__neonRift.start: mode must be 'run' or 'endless'");
      }
      controller.start(mode, seed, options);
    },
    load: (run) => {
      controller.load(structuredClone(run));
    },
    move: (direction) => {
      if (!DIRECTIONS.includes(direction)) {
        throw new Error(`__neonRift.move: expected one of ${DIRECTIONS.join(', ')}`);
      }
      return controller.handleDirection(direction);
    },
    chooseRelic: (id) => {
      if (id !== null) requireRelic(id);
      return controller.chooseRelic(id);
    },
    useActive: (id, target) => {
      requireRelic(id);
      return controller.useActiveAt(id, target);
    },
    activate: (id) => {
      requireRelic(id);
      return controller.activateRelic(id);
    },
    tapCell: (row, col) => controller.handleCellTap({ row, col }),
    cellPoint: (row, col) => board.cellClientCenter?.(row, col) ?? null,
    menu: () => {
      controller.showMenu();
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
    frameStats: () => board.frameStats?.() ?? null,
    resetFrameStats: () => {
      board.resetFrameStats?.();
    },
    feedback: deps.feedback ?? null,
  };
}
