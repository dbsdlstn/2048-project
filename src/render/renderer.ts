/**
 * Canvas 2D board renderer. Owns the canvas, a `BoardView` (the animated view
 * model), a tile sprite cache, board marks and a list of effects, and drives
 * them from an on-demand `AnimationLoop`. Time comes from an injected
 * `FrameClock`.
 *
 * Hooks for later stages: every event of a played step is announced through
 * `onCue` at the moment its animation starts (or immediately, flagged late, if
 * a newer step fast-forwarded it). Stage 5 hangs particles, shake and sound on
 * that; `addEffect` draws anything over the board.
 */
import type { GameState, Position, RunStep } from '../core';
import { browserClock, type FrameClock } from './clock';
import { cueEffect, type Effect } from './effects';
import { cellAtPoint, cellCenter, computeLayout, type BoardLayout } from './layout';
import { AnimationLoop } from './loop';
import {
  NO_MARKS,
  marksAnimate,
  paintBoardBackground,
  paintMarksAbove,
  paintMarksBelow,
  type BoardMarks,
} from './marks';
import { TileSpriteCache, createDomCanvas, type CanvasFactory } from './spriteCache';
import { NEON_THEME, type Theme } from './theme';
import { STATUS_OVERLAYS } from './tilePainter';
import { BoardView, DEFAULT_TIMINGS, type AnimationTimings, type EventCue } from './viewModel';

/**
 * Called once per event of a played step, when its animation starts. `late`
 * is true when the cue fires early because a newer step (or `settle`)
 * fast-forwarded the animation: sounds may still play, visuals usually skip.
 */
export type CueListener = (cue: EventCue, late: boolean) => void;

export interface BoardRendererOptions {
  readonly theme?: Theme;
  readonly timings?: AnimationTimings;
  /** Time source and frame scheduler. Defaults to `performance.now` + `requestAnimationFrame`. */
  readonly clock?: FrameClock;
  /** Creates the offscreen canvases of the sprite cache and the board background. */
  readonly createCanvas?: CanvasFactory;
  /** Plays the built-in effects for events (pulses, line flashes). Default true. */
  readonly builtInEffects?: boolean;
}

export class BoardRenderer {
  readonly view: BoardView;
  readonly clock: FrameClock;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly theme: Theme;
  private readonly effects: Effect[] = [];
  private readonly sprites: TileSpriteCache;
  private readonly loop: AnimationLoop;
  private readonly resizeObserver: ResizeObserver;
  private readonly createCanvas: CanvasFactory;
  private readonly listeners = new Set<CueListener>();
  /** Cues not fired yet, in time order. */
  private pendingCues: EventCue[] = [];
  private marks: BoardMarks = NO_MARKS;
  /** Marks waiting for the current animation to end before they show. */
  private pendingMarks: { marks: BoardMarks; at: number } | null = null;
  private background: HTMLCanvasElement | OffscreenCanvas | null = null;
  private layout: BoardLayout;
  private pixelRatio = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    gridSize: number,
    options: BoardRendererOptions = {},
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('BoardRenderer: 2D canvas context unavailable');
    this.ctx = ctx;
    this.theme = options.theme ?? NEON_THEME;
    this.clock = options.clock ?? browserClock;
    this.createCanvas = options.createCanvas ?? createDomCanvas;
    this.view = new BoardView(gridSize, options.timings ?? DEFAULT_TIMINGS);
    this.sprites = new TileSpriteCache({ theme: this.theme, createCanvas: this.createCanvas });
    this.loop = new AnimationLoop(this.clock, this.tick);
    this.layout = computeLayout(1, gridSize);
    if (options.builtInEffects ?? true) {
      this.listeners.add((cue, late) => {
        const effect = cueEffect(cue, this.theme, late);
        if (effect) this.addEffect(effect);
      });
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(canvas);
    // DPR changes (browser zoom, moving to another monitor) fire `resize` on window.
    window.addEventListener('resize', this.handleWindowResize);
    this.resize();
  }

  // ---------------------------------------------------------------- BoardDisplay

  /** Animates a run step. Safe to call mid-animation: the previous step is fast-forwarded. */
  showStep(step: RunStep): void {
    this.flushCues(true);
    this.applyPendingMarks(true);
    if (step.boardReplaced) {
      this.view.clear(step.run.board.size);
      this.effects.length = 0;
    }
    this.play(step.phases, step.run.board);
  }

  /**
   * Shows marks once the animation in flight has finished (so a sealed line
   * appears after the move that sealed it, not before). Immediate when idle.
   */
  setMarks(marks: BoardMarks): void {
    const now = this.clock.now();
    const at = Math.max(this.view.endTime, this.pendingCues.at(-1)?.at ?? -Infinity);
    if (at <= now || marks.targeting || this.marks.targeting) {
      this.marks = marks;
      this.pendingMarks = null;
    } else {
      this.pendingMarks = { marks, at };
    }
    this.loop.invalidate();
  }

  /** Empties the board (no tiles, no marks, no effects). */
  clear(): void {
    this.flushCues(true);
    this.view.clear();
    this.effects.length = 0;
    this.marks = NO_MARKS;
    this.pendingMarks = null;
    this.loop.invalidate();
  }

  // ---------------------------------------------------------------- hooks

  /** Subscribes to event cues (see `CueListener`). Returns an unsubscribe function. */
  onCue(listener: CueListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  addEffect(effect: Effect): void {
    this.effects.push(effect);
    this.loop.invalidate();
  }

  /** The board cell under a viewport point (e.g. a pointer event), or null. */
  cellAt(clientX: number, clientY: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const scale = this.layout.size / rect.width;
    return cellAtPoint(this.layout, (clientX - rect.left) * scale, (clientY - rect.top) * scale);
  }

  /** Viewport coordinates of a cell's centre (debug hook, automated taps). */
  cellClientCenter(row: number, col: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scale = rect.width / this.layout.size;
    const c = cellCenter(this.layout, row, col);
    return { x: rect.left + c.x * scale, y: rect.top + c.y * scale };
  }

  // ---------------------------------------------------------------- control

  /** Shows a state instantly, with no animation (e.g. a restored save). */
  syncTo(state: GameState): void {
    this.flushCues(true);
    this.view.syncTo(state);
    this.applyPendingMarks(true);
    this.loop.invalidate();
  }

  /** Jumps every running animation to its end and redraws. */
  settle(): void {
    this.view.finish();
    this.flushCues(true);
    this.applyPendingMarks(true);
    this.effects.length = 0;
    this.draw(this.clock.now());
    this.loop.invalidate();
  }

  isAnimating(): boolean {
    return (
      this.view.isAnimating(this.clock.now()) ||
      this.effects.length > 0 ||
      this.pendingCues.length > 0 ||
      this.pendingMarks !== null
    );
  }

  get boardLayout(): BoardLayout {
    return this.layout;
  }

  get currentMarks(): BoardMarks {
    return this.marks;
  }

  /** Number of tile images currently in the sprite cache (for debugging / tests). */
  get cachedSprites(): number {
    return this.sprites.size;
  }

  /** Requests a redraw on the next frame. */
  invalidate(): void {
    this.loop.invalidate();
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.handleWindowResize);
    this.loop.stop();
  }

  // ---------------------------------------------------------------- internals

  private play(phases: RunStep['phases'], board: GameState): void {
    try {
      this.pendingCues = this.view.apply(phases, this.clock.now());
    } catch (error) {
      // The view lost track of a tile; never let a display bug break the game.
      console.error(error);
      this.view.syncTo(board);
      this.pendingCues = [];
    }
    this.loop.invalidate();
  }

  /** Fires due cues (all of them when `all`, flagged late). */
  private flushCues(all: boolean, now = this.clock.now()): void {
    let fired = 0;
    for (const cue of this.pendingCues) {
      if (!all && cue.at > now) break;
      fired++;
      for (const listener of this.listeners) listener(cue, all);
    }
    this.pendingCues = this.pendingCues.slice(fired);
  }

  private applyPendingMarks(force: boolean, now = this.clock.now()): void {
    if (this.pendingMarks && (force || this.pendingMarks.at <= now)) {
      this.marks = this.pendingMarks.marks;
      this.pendingMarks = null;
    }
  }

  private readonly handleWindowResize = (): void => {
    this.resize();
  };

  private readonly tick = (now: number, dt: number): boolean => {
    this.flushCues(false, now);
    this.applyPendingMarks(false, now);
    const viewBusy = this.view.update(now);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.effects[i]?.update(dt, now)) this.effects.splice(i, 1);
    }
    this.draw(now);
    return (
      viewBusy ||
      this.effects.length > 0 ||
      this.pendingCues.length > 0 ||
      this.pendingMarks !== null ||
      marksAnimate(this.marks)
    );
  };

  /** Matches the backing store to the CSS size times devicePixelRatio. */
  private resize(): void {
    const cssSize = Math.min(this.canvas.clientWidth, this.canvas.clientHeight);
    if (cssSize <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const pixels = Math.round(cssSize * dpr);
    if (this.canvas.width !== pixels || this.canvas.height !== pixels) {
      this.canvas.width = pixels;
      this.canvas.height = pixels;
    }
    this.pixelRatio = pixels / cssSize;
    this.layout = computeLayout(cssSize, this.view.size);
    this.sprites.configure(this.layout.cell, this.layout.radius, this.pixelRatio);
    this.background = this.renderBackground(pixels);
    // Draw synchronously: resizing clears the canvas, and waiting a frame would flash.
    this.draw(this.clock.now());
  }

  /** The static board (plate, traces, rift, slots) is drawn once per size, like tile sprites. */
  private renderBackground(pixels: number): HTMLCanvasElement | OffscreenCanvas | null {
    const canvas = this.createCanvas(pixels, pixels);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    paintBoardBackground(ctx, this.layout, this.theme, this.pixelRatio);
    return canvas;
  }

  private draw(now: number): void {
    const { ctx, layout, theme } = this;
    const pr = this.pixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.background) ctx.drawImage(this.background, 0, 0);
    // From here on, draw in CSS pixels; the transform maps them to device pixels.
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
    if (!this.background) paintBoardBackground(ctx, layout, theme, pr);

    let shakeX = 0;
    let shakeY = 0;
    for (const e of this.effects) {
      const o = e.offset?.(now);
      if (o) {
        shakeX += o.x;
        shakeY += o.y;
      }
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    paintMarksBelow(ctx, layout, this.marks);
    for (const frame of this.view.frame(now)) {
      if (frame.scale <= 0) continue;
      const c = cellCenter(layout, frame.row, frame.col);
      // Cached image (glow baked in); scale is applied by drawImage, not by re-rendering.
      const sprite = this.sprites.get({
        kind: frame.kind,
        value: frame.value,
        emphasized: frame.popping,
      });
      const size = sprite.cssSize * frame.scale;
      ctx.drawImage(sprite.image, c.x - size / 2, c.y - size / 2, size, size);
      for (const overlay of STATUS_OVERLAYS) {
        overlay({
          ctx,
          cx: c.x,
          cy: c.y,
          size: layout.cell * frame.scale,
          radius: layout.radius * frame.scale,
          frame,
          theme,
          now,
        });
      }
    }
    paintMarksAbove(ctx, layout, this.marks, theme, now, (id) => this.view.tilePosition(id, now));
    for (const e of this.effects) e.draw?.(ctx, layout, now);
    ctx.restore();
  }
}
