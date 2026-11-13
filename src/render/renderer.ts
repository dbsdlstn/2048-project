/**
 * Canvas 2D board renderer. Owns the canvas, a `BoardView` (the animated view
 * model), a tile sprite cache and a list of effects, and drives them from an
 * on-demand `AnimationLoop`. Time comes from an injected `FrameClock`.
 */
import type { GameState, TurnResult } from '../core';
import { browserClock, type FrameClock } from './clock';
import { computeLayout, cellCenter, type BoardLayout } from './layout';
import { AnimationLoop } from './loop';
import { TileSpriteCache, type CanvasFactory } from './spriteCache';
import { NEON_THEME, type Theme } from './theme';
import { STATUS_OVERLAYS, roundRectPath } from './tilePainter';
import { BoardView, DEFAULT_TIMINGS, type AnimationTimings } from './viewModel';

/**
 * Something drawn over the board for a while: particles, floating text, screen
 * shake. Stage 5 adds implementations; the renderer only drives them.
 */
export interface Effect {
  /** Advances by `dt` ms. Return false once finished; the effect is then dropped. */
  update(dt: number, now: number): boolean;
  /** Draws above the tiles, in board space (CSS px, origin = board top-left). */
  draw?(ctx: CanvasRenderingContext2D, layout: BoardLayout, now: number): void;
  /** Camera displacement in CSS px this frame (screen shake). Summed over all effects. */
  offset?(now: number): { readonly x: number; readonly y: number };
}

export interface BoardRendererOptions {
  readonly theme?: Theme;
  readonly timings?: AnimationTimings;
  /** Time source and frame scheduler. Defaults to `performance.now` + `requestAnimationFrame`. */
  readonly clock?: FrameClock;
  /** Creates the offscreen canvases of the sprite cache. */
  readonly createCanvas?: CanvasFactory;
}

/** Board corner radius as a fraction of its size. Keep in sync with `.board` in style.css. */
export const BOARD_RADIUS_RATIO = 0.05;

export class BoardRenderer {
  readonly view: BoardView;
  readonly clock: FrameClock;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly theme: Theme;
  private readonly effects: Effect[] = [];
  private readonly sprites: TileSpriteCache;
  private readonly loop: AnimationLoop;
  private readonly resizeObserver: ResizeObserver;
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
    this.view = new BoardView(gridSize, options.timings ?? DEFAULT_TIMINGS);
    this.sprites = new TileSpriteCache(
      options.createCanvas
        ? { theme: this.theme, createCanvas: options.createCanvas }
        : { theme: this.theme },
    );
    this.loop = new AnimationLoop(this.clock, this.tick);
    this.layout = computeLayout(1, gridSize);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(canvas);
    // DPR changes (browser zoom, moving to another monitor) fire `resize` on window.
    window.addEventListener('resize', this.handleWindowResize);
    this.resize();
  }

  /** Clears the board and animates a new game's initial spawns. */
  startGame(result: TurnResult): void {
    this.view.clear(result.state.size);
    this.playTurn(result);
  }

  /** Animates one turn. Safe to call mid-animation: the previous turn is fast-forwarded. */
  playTurn(result: TurnResult): void {
    try {
      this.view.apply(result.phases, this.clock.now());
    } catch (error) {
      // The view lost track of a tile; never let a display bug break the game.
      console.error(error);
      this.view.syncTo(result.state);
    }
    this.loop.invalidate();
  }

  /** Shows a state instantly, with no animation (e.g. a restored save). */
  syncTo(state: GameState): void {
    this.view.syncTo(state);
    this.loop.invalidate();
  }

  /** Jumps every running animation to its end and redraws. */
  settle(): void {
    this.view.finish();
    this.draw(this.clock.now());
    this.loop.invalidate();
  }

  addEffect(effect: Effect): void {
    this.effects.push(effect);
    this.loop.invalidate();
  }

  isAnimating(): boolean {
    return this.view.isAnimating(this.clock.now()) || this.effects.length > 0;
  }

  get boardLayout(): BoardLayout {
    return this.layout;
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

  private readonly handleWindowResize = (): void => {
    this.resize();
  };

  private readonly tick = (now: number, dt: number): boolean => {
    const viewBusy = this.view.update(now);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.effects[i]?.update(dt, now)) this.effects.splice(i, 1);
    }
    this.draw(now);
    return viewBusy || this.effects.length > 0;
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
    // Draw synchronously: resizing clears the canvas, and waiting a frame would flash.
    this.draw(this.clock.now());
  }

  private draw(now: number): void {
    const { ctx, layout, theme } = this;
    const pr = this.pixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // From here on, draw in CSS pixels; the transform maps them to device pixels.
    ctx.setTransform(pr, 0, 0, pr, 0, 0);

    let shakeX = 0;
    let shakeY = 0;
    for (const e of this.effects) {
      const o = e.offset?.(now);
      if (o) {
        shakeX += o.x;
        shakeY += o.y;
      }
    }

    this.drawBoard();
    ctx.save();
    ctx.translate(shakeX, shakeY);
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
    for (const e of this.effects) e.draw?.(ctx, layout, now);
    ctx.restore();
  }

  private drawBoard(): void {
    const { ctx, layout, theme } = this;
    roundRectPath(ctx, 0, 0, layout.size, layout.size, layout.size * BOARD_RADIUS_RATIO);
    ctx.fillStyle = theme.board;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = theme.boardEdge;
    ctx.stroke();

    ctx.fillStyle = theme.cell;
    const half = layout.cell / 2;
    for (let row = 0; row < layout.gridSize; row++) {
      for (let col = 0; col < layout.gridSize; col++) {
        const c = cellCenter(layout, row, col);
        roundRectPath(ctx, c.x - half, c.y - half, layout.cell, layout.cell, layout.radius);
        ctx.fill();
      }
    }
  }
}
