/**
 * Canvas 2D board renderer. Owns the canvas, a `BoardView` (the animated view
 * model), a tile sprite cache, board marks, a list of effects and the "juice"
 * layer (`fx`: particles, shake, floating text), and drives them from an
 * on-demand `AnimationLoop`. Time comes from an injected `FrameClock`.
 *
 * Every event of a played step is announced through `onCue` at the moment it
 * visibly lands (or immediately, flagged late, if a newer step fast-forwarded
 * it). The feedback director hangs particles, shake, sound and vibration on
 * that; `addEffect` draws anything else over the board.
 *
 * Two clocks: the real clock (frames, particles, shake) and the view clock
 * (tile animation, cues, marks). They are the same except during a hit-stop,
 * when the view clock holds still for a few dozen ms. A new step always
 * releases the hold first, so input is never delayed by it.
 */
import type { GameState, Position, RunStep } from '../core';
import { FrameBudget } from './budget';
import { browserClock, type FrameClock } from './clock';
import { cueEffect, type Effect } from './effects';
import { cellAtPoint, cellCenter, computeLayout, type BoardLayout } from './layout';
import { BoardFx } from './fx';
import { AnimationLoop } from './loop';
import { NO_MARKS, marksAnimate, type BoardMarks } from './marks';
import { NO_SCENERY, sceneryKey, type Scenery } from './scenery';
import { TileSpriteCache, createDomCanvas, type CanvasFactory } from './spriteCache';
import type { Theme } from './theme';
import { NEON_THEME } from './themes';
import { BoardView, DEFAULT_TIMINGS, type AnimationTimings, type EventCue } from './viewModel';

/**
 * Called once per event of a played step, when it visibly lands (`cue.hit`).
 * `late` is true when the cue fires early because a newer step (or `settle`)
 * fast-forwarded the animation: its moment has passed, so visuals skip and
 * only important sounds may still play.
 */
export type CueListener = (cue: EventCue, late: boolean) => void;

export interface BoardRendererOptions {
  /** The look: colours and painters (default neon). `setTheme` switches it later. */
  readonly theme?: Theme;
  readonly timings?: AnimationTimings;
  /** Time source and frame scheduler. Defaults to `performance.now` + `requestAnimationFrame`. */
  readonly clock?: FrameClock;
  /** Creates the offscreen canvases of the sprite cache and the board background. */
  readonly createCanvas?: CanvasFactory;
  /** Plays the built-in effects for events (pulses, line flashes). Default true. */
  readonly builtInEffects?: boolean;
  /** High-resolution timer for frame-cost statistics. Defaults to `performance.now`. */
  readonly perfNow?: () => number;
  /** Random source of the particles (seeded by default, so screenshots repeat). */
  readonly random?: () => number;
}

/** Frame statistics over the last animated frames (debug hook, performance checks). */
export interface FrameStats {
  readonly frames: number;
  /** Frame interval (ms): what the player sees. */
  readonly avg: number;
  readonly p95: number;
  readonly worst: number;
  /** Time spent inside the renderer's tick (ms). */
  readonly costAvg: number;
  readonly costWorst: number;
  /** Current effect density chosen by the frame budget (1 = full). */
  readonly quality: number;
  readonly particles: number;
  readonly particlesDropped: number;
}

const STATS_FRAMES = 600;
/** Longest hit-stop allowed, whatever the caller asks for. */
export const MAX_HIT_STOP = 120;

export class BoardRenderer {
  readonly view: BoardView;
  readonly clock: FrameClock;
  /** Particles, shake, floating text: the feedback director drives it. */
  readonly fx: BoardFx;
  private readonly budget = new FrameBudget();
  private readonly perfNow: () => number;
  private readonly statDt = new Float32Array(STATS_FRAMES);
  private readonly statCost = new Float32Array(STATS_FRAMES);
  private statCount = 0;
  /** Real-time start / end of the running hit-stop (view clock frozen), or null. */
  private holdStart: number | null = null;
  private holdEnd = 0;
  /** Total hit-stop time so far: view time = real time - viewOffset (outside a hold). */
  private viewOffset = 0;
  private reducedMotion = false;
  private readonly ctx: CanvasRenderingContext2D;
  private theme: Theme;
  private scenery: Scenery = NO_SCENERY;
  private readonly effects: Effect[] = [];
  private readonly sprites: TileSpriteCache;
  private readonly loop: AnimationLoop;
  private readonly resizeObserver: ResizeObserver;
  private readonly createCanvas: CanvasFactory;
  private readonly listeners = new Set<CueListener>();
  /** Cues not fired yet, in time order. */
  private pendingCues: EventCue[] = [];
  private marks: BoardMarks = NO_MARKS;
  /** Marks waiting for the current animation to end before they show (with the HUD update). */
  private pendingMarks: { marks: BoardMarks; at: number; onShown?: () => void } | null = null;
  private background: HTMLCanvasElement | OffscreenCanvas | null = null;
  /** The background before an animated scenery change, wiped away top to bottom. */
  private reveal: {
    image: HTMLCanvasElement | OffscreenCanvas;
    start: number;
    duration: number;
  } | null = null;
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
    this.layout = computeLayout(1, gridSize, this.theme.layout);
    this.perfNow = options.perfNow ?? (() => performance.now());
    this.fx = new BoardFx({
      createCanvas: this.createCanvas,
      fontFamily: this.theme.fontFamily,
      ...(options.random ? { random: options.random } : {}),
    });
    this.fx.applyTheme(this.theme);
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
    this.releaseHold();
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
   * appears after the move that sealed it, not before). Immediate when idle,
   * and for targeting. `onShown` runs at the moment the marks appear, which is
   * how the HUD numbers change together with the board.
   */
  setMarks(marks: BoardMarks, onShown?: () => void): void {
    const now = this.viewTimeNow();
    let at = this.view.endTime;
    for (const cue of this.pendingCues) at = Math.max(at, cue.hit);
    // A newer state replaces a waiting one; its callback still runs, so no HUD update is lost.
    this.applyPendingMarks(true);
    if (at <= now || marks.targeting || this.marks.targeting) {
      this.marks = marks;
      onShown?.();
    } else {
      this.pendingMarks = onShown ? { marks, at, onShown } : { marks, at };
    }
    this.loop.invalidate();
  }

  /**
   * Switches the look: tile images, particle style, layout (the frame width
   * may differ) and the cached background are all rebuilt.
   */
  setTheme(theme: Theme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.sprites.setTheme(theme);
    this.fx.applyTheme(theme);
    this.effects.length = 0;
    this.resize();
    this.loop.invalidate();
  }

  get currentTheme(): Theme {
    return this.theme;
  }

  /**
   * What the board frame shows (race companions, rallies). Redraws the cached
   * background on change; with `revealMs` the old frame is wiped away from
   * the top down, so new banners seem to unroll (none with reduced motion).
   */
  setScenery(scenery: Scenery, revealMs = 0): void {
    if (sceneryKey(scenery) === sceneryKey(this.scenery)) return;
    this.scenery = scenery;
    const { width, height } = this.canvas;
    if (width <= 0 || this.layout.size <= 1) return;
    const old = this.background;
    this.background = this.renderBackground(width, height);
    this.reveal =
      old && revealMs > 0 && !this.reducedMotion
        ? { image: old, start: this.viewTimeNow(), duration: revealMs }
        : null;
    this.loop.invalidate();
  }

  get currentScenery(): Scenery {
    return this.scenery;
  }

  /** Empties the board (no tiles, no marks, no effects). */
  clear(): void {
    this.releaseHold();
    this.flushCues(true);
    this.view.clear();
    this.effects.length = 0;
    this.fx.clear();
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

  /** Wakes the loop after something was added to `fx` outside a frame. */
  wake(): void {
    this.loop.invalidate();
  }

  /**
   * Freezes the tile animation for `ms` (capped) while particles and shake
   * keep running: weight for a rare, big moment. Ignored with reduced motion.
   * The next step releases it at once, so input is never held back.
   */
  hitStop(ms: number): void {
    if (this.reducedMotion || ms <= 0) return;
    const now = this.clock.now();
    const end = now + Math.min(ms, MAX_HIT_STOP);
    this.holdStart ??= now;
    this.holdEnd = Math.max(this.holdEnd, end);
    this.loop.invalidate();
  }

  /** True while a hit-stop holds the view clock. */
  get holding(): boolean {
    return this.holdStart !== null && this.clock.now() < this.holdEnd;
  }

  /**
   * Reduced motion: no squash and stretch, no wind-up, no shake, no nudge, no
   * hit-stop, a quarter of the particles. Information (what merged, what
   * broke, which line is sealed) is still shown.
   */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.view.squashEnabled = !reduced;
    this.fx.reduced = reduced;
    this.fx.shake.enabled = !reduced;
    if (reduced) {
      this.fx.shake.clear();
      this.releaseHold();
    }
  }

  get motionReduced(): boolean {
    return this.reducedMotion;
  }

  /** Statistics of the last animated frames (see `FrameStats`). */
  frameStats(): FrameStats {
    const n = Math.min(this.statCount, STATS_FRAMES);
    const dts = Array.from(this.statDt.subarray(0, n)).sort((a, b) => a - b);
    const costs = Array.from(this.statCost.subarray(0, n));
    const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
    return {
      frames: n,
      avg: n ? sum(dts) / n : 0,
      p95: n ? (dts[Math.min(n - 1, Math.floor(n * 0.95))] ?? 0) : 0,
      worst: n ? (dts[n - 1] ?? 0) : 0,
      costAvg: n ? sum(costs) / n : 0,
      costWorst: n ? Math.max(...costs) : 0,
      quality: this.budget.quality,
      particles: this.fx.particles.count,
      particlesDropped: this.fx.particles.dropped,
    };
  }

  resetFrameStats(): void {
    this.statCount = 0;
    this.fx.particles.dropped = 0;
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
    this.releaseHold();
    this.flushCues(true);
    this.view.syncTo(state);
    this.applyPendingMarks(true);
    this.loop.invalidate();
  }

  /** Jumps every running animation to its end and redraws. */
  settle(): void {
    this.releaseHold();
    this.view.finish();
    this.flushCues(true);
    this.applyPendingMarks(true);
    this.effects.length = 0;
    this.fx.clear();
    this.draw(this.clock.now());
    this.loop.invalidate();
  }

  isAnimating(): boolean {
    return (
      this.view.isAnimating(this.viewTimeNow()) ||
      this.holding ||
      this.fx.active ||
      this.effects.length > 0 ||
      this.pendingCues.length > 0 ||
      this.pendingMarks !== null ||
      this.reveal !== null
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

  /** View-clock time at real time `now` (behind real time by every hit-stop so far). */
  private viewTime(now: number): number {
    let t = now - this.viewOffset;
    if (this.holdStart !== null) t -= Math.max(0, Math.min(now, this.holdEnd) - this.holdStart);
    return t;
  }

  /** The view clock now (behind the real clock by every hit-stop so far). */
  viewTimeNow(): number {
    return this.viewTime(this.clock.now());
  }

  /** Ends a hit-stop (early or on time); the view clock carries on from where it held. */
  private releaseHold(now = this.clock.now()): void {
    if (this.holdStart === null) return;
    this.viewOffset += Math.max(0, Math.min(now, this.holdEnd) - this.holdStart);
    this.holdStart = null;
    this.holdEnd = 0;
  }

  private play(phases: RunStep['phases'], board: GameState): void {
    try {
      // Cues fire in the order their effects land (merge pops are staggered).
      this.pendingCues = this.view.apply(phases, this.viewTimeNow()).sort((a, b) => a.hit - b.hit);
    } catch (error) {
      // The view lost track of a tile; never let a display bug break the game.
      console.error(error);
      this.view.syncTo(board);
      this.pendingCues = [];
    }
    this.loop.invalidate();
  }

  /** Fires due cues (all of them when `all`, flagged late). `now` is view time. */
  private flushCues(all: boolean, now = this.viewTimeNow()): void {
    if (this.pendingCues.length === 0) return;
    const cues = this.pendingCues;
    let fired = 0;
    // A listener may start a hit-stop: cues after it wait for the view clock again.
    while (fired < cues.length) {
      const cue = cues[fired] as EventCue;
      if (!all && (cue.hit > now || this.holding)) break;
      fired++;
      for (const listener of this.listeners) listener(cue, all);
    }
    this.pendingCues = cues === this.pendingCues ? cues.slice(fired) : this.pendingCues;
  }

  private applyPendingMarks(force: boolean, now = this.viewTimeNow()): void {
    const pending = this.pendingMarks;
    if (pending && (force || pending.at <= now)) {
      this.marks = pending.marks;
      this.pendingMarks = null;
      pending.onShown?.();
    }
  }

  private readonly handleWindowResize = (): void => {
    this.resize();
  };

  private readonly tick = (now: number, dt: number): boolean => {
    const t0 = this.perfNow();
    if (this.holdStart !== null && now >= this.holdEnd) this.releaseHold(now);
    const vt = this.viewTime(now);
    this.flushCues(false, vt);
    this.applyPendingMarks(false, vt);
    const viewBusy = this.view.update(vt);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.effects[i]?.update(dt, vt)) this.effects.splice(i, 1);
    }
    // Particle density follows measured frame times (see FrameBudget).
    this.budget.record(dt);
    this.fx.density = this.budget.quality * (this.reducedMotion ? 0.25 : 1);
    this.fx.update(dt);
    this.draw(now);
    const busy =
      viewBusy ||
      this.holdStart !== null ||
      this.fx.active ||
      this.effects.length > 0 ||
      this.pendingCues.length > 0 ||
      this.pendingMarks !== null ||
      this.reveal !== null;
    if (dt > 0 && busy) {
      const i = this.statCount++ % STATS_FRAMES;
      this.statDt[i] = dt;
      this.statCost[i] = this.perfNow() - t0;
    }
    return busy || marksAnimate(this.marks);
  };

  /**
   * Matches the backing store to the CSS size times devicePixelRatio. A square
   * theme uses the largest square that fits; a theme with scenery bands takes
   * the box the page CSS gave it (taller than wide when there is room).
   */
  private resize(): void {
    const banded = this.theme.layout.bands !== undefined;
    const cssW = banded
      ? this.canvas.clientWidth
      : Math.min(this.canvas.clientWidth, this.canvas.clientHeight);
    const cssH = banded ? this.canvas.clientHeight : cssW;
    if (cssW <= 0 || cssH <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(cssW * dpr);
    const ph = Math.round(cssH * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.pixelRatio = pw / cssW;
    this.layout = computeLayout(cssW, this.view.size, this.theme.layout, ph / this.pixelRatio);
    this.fx.setLayout(this.layout);
    this.sprites.configure(this.layout.cell, this.layout.radius, this.pixelRatio);
    this.background = this.renderBackground(pw, ph);
    this.reveal = null;
    // Draw synchronously: resizing clears the canvas, and waiting a frame would flash.
    this.draw(this.clock.now());
  }

  /**
   * The static board (plate, slots, frame and its scenery) is drawn once per
   * size / theme / scenery, like tile sprites.
   */
  private renderBackground(
    pw: number,
    ph: number = pw,
  ): HTMLCanvasElement | OffscreenCanvas | null {
    const canvas = this.createCanvas(pw, ph);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.theme.boardArt.background(ctx, this.layout, this.theme, this.pixelRatio, this.scenery);
    return canvas;
  }

  /** Draws the frame at real time `now` (tiles and effects at the matching view time). */
  private draw(realNow: number): void {
    const { ctx, layout, theme } = this;
    const now = this.viewTime(realNow);
    const pr = this.pixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.background) ctx.drawImage(this.background, 0, 0);
    const reveal = this.reveal;
    if (reveal) {
      const t = (now - reveal.start) / reveal.duration;
      if (t >= 1) this.reveal = null;
      else {
        // The old frame still covers everything below the wipe line.
        const h = this.canvas.height;
        const y = Math.round(h * Math.max(0, t) * (2 - Math.max(0, t)));
        ctx.drawImage(reveal.image, 0, y, this.canvas.width, h - y, 0, y, this.canvas.width, h - y);
      }
    }
    // From here on, draw in CSS pixels; the transform maps them to device pixels.
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
    if (!this.background) theme.boardArt.background(ctx, layout, theme, pr, this.scenery);

    const camera = this.fx.offset();
    let shakeX = camera.x;
    let shakeY = camera.y;
    for (const e of this.effects) {
      const o = e.offset?.(now);
      if (o) {
        shakeX += o.x;
        shakeY += o.y;
      }
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    theme.boardArt.marksBelow(ctx, layout, this.marks, theme);
    for (const frame of this.view.frame(now)) {
      if (frame.scale <= 0) continue;
      const c = cellCenter(layout, frame.row, frame.col);
      // Cached image (glow baked in); scale is applied by drawImage, not by re-rendering.
      const sprite = this.sprites.get({
        kind: frame.kind,
        value: frame.value,
        emphasized: frame.popping,
      });
      // Squash and stretch: the cached image is simply drawn non-uniformly.
      const w = sprite.cssSize * frame.scale * frame.sx;
      const h = sprite.cssSize * frame.scale * frame.sy;
      ctx.drawImage(sprite.image, c.x - w / 2, c.y - h / 2, w, h);
      for (const overlay of theme.overlays) {
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
    theme.boardArt.marksAbove(ctx, layout, this.marks, theme, now, (id) =>
      this.view.tilePosition(id, now),
    );
    for (const e of this.effects) e.draw?.(ctx, layout, now);
    this.fx.draw(ctx);
    ctx.restore();
  }
}
