/**
 * The storybook ring for big merges: an ink ring that bursts outwards and
 * thins as it goes, with a gold rule inside it and drops of ink flung past
 * it. On a bright page a light ring would vanish; ink reads.
 */
import type { Effect } from '../effects';
import { cellCenter, type BoardLayout } from '../layout';
import { clamp, easeOutCubic } from '../tween';
import { GOLD_LIGHT, INK } from './palette';

const DURATION = 460;
const DROPS = 9;

export class InkRing implements Effect {
  constructor(
    private readonly row: number,
    private readonly col: number,
    private readonly color: string,
    private readonly start: number,
    private readonly reach: number,
  ) {}

  update(_dt: number, now: number): boolean {
    return now < this.start + DURATION;
  }

  draw(ctx: CanvasRenderingContext2D, layout: BoardLayout, now: number): void {
    const t = clamp((now - this.start) / DURATION, 0, 1);
    if (now < this.start) return;
    const e = easeOutCubic(t);
    const c = cellCenter(layout, this.row, this.col);
    const r = layout.cell * (0.42 + this.reach * 0.55 * e);
    const fade = 1 - t * t;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, layout.cell * 0.11 * (1 - e));
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(0.8, layout.cell * 0.05 * (1 - e));
    ctx.stroke();
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = Math.max(0.6, layout.cell * 0.025 * (1 - e));
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 0.86, 0, Math.PI * 2);
    ctx.stroke();
    // Ink drops, flung a little further than the ring, shrinking as they fly.
    ctx.fillStyle = INK;
    for (let i = 0; i < DROPS; i++) {
      const a = (i / DROPS) * Math.PI * 2 + this.row * 0.7 + this.col * 1.3;
      const d = r * (1.08 + 0.18 * ((i * 7) % 3));
      const s = layout.cell * 0.045 * (1 - e) * (1 + ((i * 5) % 3) * 0.3);
      if (s <= 0.2) continue;
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
