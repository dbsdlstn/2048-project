/**
 * Simple built-in effects played from event cues: a ring pulse at a cell, a
 * flash along a line, a glow around the board. They mark *where* something
 * happened and stay on in reduced-motion mode; particles, shake and sound
 * come on top from the feedback director (src/game/feedback.ts) through the
 * same cue hook (`BoardRenderer.onCue`).
 */
import type { LineAxis, TurnEvent } from '../core';
import { cellCenter, gridExtent, type BoardLayout } from './layout';
import { lineRect } from './marks';
import type { Theme } from './theme';
import { roundRectPath } from './tilePainter';
import { easeOutCubic, progress } from './tween';
import type { EventCue } from './viewModel';

/**
 * Something drawn over the board for a while: particles, floating text, screen
 * shake. The renderer only drives them.
 */
export interface Effect {
  /**
   * Advances by `dt` ms (real time). `now` is the view clock, which a hit-stop
   * holds still. Return false once finished; the effect is then dropped.
   */
  update(dt: number, now: number): boolean;
  /** Draws above the tiles, in board space (CSS px, origin = board top-left). */
  draw?(ctx: CanvasRenderingContext2D, layout: BoardLayout, now: number): void;
  /** Camera displacement in CSS px this frame. Summed over all effects and the fx shake. */
  offset?(now: number): { readonly x: number; readonly y: number };
}

/** Base for effects with a fixed start time and length. */
abstract class TimedEffect implements Effect {
  constructor(
    protected readonly start: number,
    protected readonly duration: number,
  ) {}

  update(_dt: number, now: number): boolean {
    return now < this.start + this.duration;
  }

  protected t(now: number): number {
    return progress(now, this.start, this.duration);
  }
}

/** An expanding, fading ring centred on a cell. */
export class RingPulse extends TimedEffect {
  constructor(
    private readonly row: number,
    private readonly col: number,
    private readonly color: string,
    start: number,
    duration = 380,
    /** Final radius as a multiple of the cell size. */
    private readonly reach = 0.85,
  ) {
    super(start, duration);
  }

  draw(ctx: CanvasRenderingContext2D, layout: BoardLayout, now: number): void {
    if (now < this.start) return;
    const t = easeOutCubic(this.t(now));
    const c = cellCenter(layout, this.row, this.col);
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1.5, layout.cell * 0.06 * (1 - t));
    ctx.beginPath();
    ctx.arc(c.x, c.y, layout.cell * (0.3 + this.reach * 0.5 * t), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** A row or column lights up and fades. */
export class LineFlash extends TimedEffect {
  constructor(
    private readonly axis: LineAxis,
    private readonly index: number,
    private readonly color: string,
    start: number,
    duration = 420,
  ) {
    super(start, duration);
  }

  draw(ctx: CanvasRenderingContext2D, layout: BoardLayout, now: number): void {
    if (now < this.start) return;
    const t = this.t(now);
    const r = lineRect(layout, this.axis, this.index);
    ctx.save();
    ctx.globalAlpha = 0.45 * (1 - t);
    ctx.fillStyle = this.color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }
}

/**
 * A glow around the board's edge (boss rules without a position, shuffles,
 * stage end). A wide faint stroke under a thin bright one fakes the glow: no
 * `shadowBlur` in a per-frame path.
 */
export class BoardFlash extends TimedEffect {
  constructor(
    private readonly color: string,
    start: number,
    duration = 480,
  ) {
    super(start, duration);
  }

  draw(ctx: CanvasRenderingContext2D, layout: BoardLayout, now: number): void {
    if (now < this.start) return;
    const t = this.t(now);
    // Just outside the grid (inside a wide storybook frame, near the edge on neon).
    const out = layout.gap * 0.7;
    const side = gridExtent(layout) + out * 2;
    ctx.save();
    ctx.strokeStyle = this.color;
    roundRectPath(ctx, layout.padding - out, layout.originY - out, side, side, layout.boardRadius);
    ctx.globalAlpha = 0.3 * (1 - t);
    ctx.lineWidth = layout.gap * (1.6 + 1.2 * (1 - t));
    ctx.stroke();
    ctx.globalAlpha = 1 - t;
    ctx.lineWidth = layout.gap * (0.4 + 0.4 * (1 - t));
    ctx.stroke();
    ctx.restore();
  }
}

const BOSS_SOURCES = new Set(['warden', 'corroder', 'chaos']);

/**
 * The default look of each event: a small effect or nothing. Cues that were
 * fast-forwarded (`late`) get no effect: their moment has passed.
 */
export function cueEffect(cue: EventCue, theme: Theme, late: boolean): Effect | null {
  if (late) return null;
  const e: TurnEvent = cue.event;
  const at = cue.hit;
  switch (e.type) {
    case 'trigger': {
      const boss = BOSS_SOURCES.has(e.source);
      const color = boss ? theme.bossTarget : theme.relic;
      if (e.at) return new RingPulse(e.at.row, e.at.col, color, at, 460, 1.1);
      return new BoardFlash(color, at);
    }
    case 'destroy':
      return new RingPulse(e.at.row, e.at.col, theme.stone.edge, at, 320, 0.7);
    case 'statusChange': {
      if (e.cause === 'thaw') return new RingPulse(e.at.row, e.at.col, theme.ice, at, 260, 0.5);
      const color = e.cause === 'curse' ? theme.curse : theme.ice;
      return new RingPulse(e.at.row, e.at.col, color, at, 360, 0.8);
    }
    case 'valueChange':
      return new RingPulse(e.at.row, e.at.col, theme.bossTarget, at, 420, 0.9);
    case 'lineLock':
      return new LineFlash(e.axis, e.index, theme.lock, at, 520);
    case 'lineUnlock':
      return new LineFlash(e.axis, e.index, theme.ice, at, 360);
    case 'shuffle':
      return new BoardFlash(theme.curse, at);
    case 'stageCleared':
      return new BoardFlash(theme.celebrate, at, 700);
    case 'stageFailed':
    case 'gameOver':
      return new BoardFlash(theme.lock, at, 700);
    case 'move':
    case 'merge':
    case 'score':
    case 'spawn':
    case 'bonusMoves':
      return null;
  }
}
