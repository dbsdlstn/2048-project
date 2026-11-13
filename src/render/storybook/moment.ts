/**
 * The board half of the "companion joined" / "race rallied" moment: a
 * parchment ribbon unrolls across the board with the race's crest stamped
 * above it (gold rays behind it for a rally). The frame's new scenery is
 * revealed underneath by the renderer (`setScenery(…, revealMs)`) and gold
 * dust comes from the particle layer, so this effect only draws the ribbon.
 */
import type { Effect } from '../effects';
import type { BoardLayout } from '../layout';
import type { RaceId } from '../scenery';
import { clamp, easeOutBack, easeOutCubic } from '../tween';
import { crest, paintEmblem } from './emblems';
import {
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  INK,
  PARCHMENT,
  PARCHMENT_LIGHT,
  PARCHMENT_SHADE,
} from './palette';

export const MOMENT_MS = 2000;
const UNROLL = 320;
const STAMP_AT = 180;
const STAMP = 360;
const FADE = 380;

const stampEase = easeOutBack(2.2);

export class FrameMoment implements Effect {
  constructor(
    private readonly kind: 'join' | 'rally',
    private readonly race: RaceId,
    private readonly text: string,
    private readonly start: number,
    private readonly fontFamily: string,
    private readonly reduced = false,
  ) {}

  update(_dt: number, now: number): boolean {
    return now < this.start + MOMENT_MS;
  }

  draw(ctx: CanvasRenderingContext2D, layout: BoardLayout, now: number): void {
    const t = now - this.start;
    if (t < 0) return;
    const S = layout.size;
    const fade = clamp((MOMENT_MS - t) / FADE, 0, 1);
    const unroll = this.reduced ? 1 : easeOutCubic(clamp(t / UNROLL, 0, 1));
    const cx = S / 2;
    const cy = S * 0.56;
    const h = layout.cell * 0.78;
    const fullW = S * 0.84;
    const w = Math.max(h, fullW * unroll);
    ctx.save();
    ctx.globalAlpha = fade;

    // A soft veil so the ribbon reads over busy tiles.
    ctx.fillStyle = `rgba(43, 26, 12, ${0.28 * Math.min(1, t / 200)})`;
    ctx.fillRect(0, 0, S, S);

    // Gold rays behind the crest for a rally.
    const crestY = cy - h * 1.15;
    if (this.kind === 'rally') {
      const spin = this.reduced ? 0 : t / 2400;
      ctx.save();
      ctx.translate(cx, crestY);
      ctx.rotate(spin);
      ctx.fillStyle = 'rgba(241, 210, 122, 0.55)';
      const R = layout.cell * 1.5 * Math.min(1, t / 400);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - 0.09) * R, Math.sin(a - 0.09) * R);
        ctx.lineTo(Math.cos(a + 0.09) * R, Math.sin(a + 0.09) * R);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Ribbon tails, folded behind.
    const left = cx - w / 2;
    const right = cx + w / 2;
    for (const [x, dir] of [
      [left, -1],
      [right, 1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x - dir * h * 0.1, cy - h * 0.3);
      ctx.lineTo(x + dir * h * 0.75, cy - h * 0.3);
      ctx.lineTo(x + dir * h * 0.45, cy + h * 0.2);
      ctx.lineTo(x + dir * h * 0.75, cy + h * 0.7);
      ctx.lineTo(x - dir * h * 0.1, cy + h * 0.7);
      ctx.closePath();
      ctx.fillStyle = PARCHMENT_SHADE;
      ctx.fill();
      ctx.lineWidth = Math.max(1.2, h * 0.05);
      ctx.strokeStyle = INK;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    // Ribbon body.
    ctx.beginPath();
    ctx.rect(left, cy - h / 2, w, h);
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    g.addColorStop(0, PARCHMENT_LIGHT);
    g.addColorStop(0.6, PARCHMENT);
    g.addColorStop(1, PARCHMENT_SHADE);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1.4, h * 0.06);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left + h * 0.1, cy - h / 2 + h * 0.13);
    ctx.lineTo(right - h * 0.1, cy - h / 2 + h * 0.13);
    ctx.moveTo(left + h * 0.1, cy + h / 2 - h * 0.13);
    ctx.lineTo(right - h * 0.1, cy + h / 2 - h * 0.13);
    ctx.lineWidth = Math.max(1, h * 0.05);
    ctx.strokeStyle = GOLD;
    ctx.stroke();

    // Lettering appears once the ribbon is open.
    if (unroll > 0.7) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, cy - h / 2, w, h);
      ctx.clip();
      ctx.globalAlpha = fade * clamp((unroll - 0.7) / 0.3, 0, 1);
      let font = h * 0.52;
      ctx.font = `800 ${font}px ${this.fontFamily}`;
      const tw = ctx.measureText(this.text).width;
      if (tw > fullW * 0.86) {
        font *= (fullW * 0.86) / tw;
        ctx.font = `800 ${font}px ${this.fontFamily}`;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.kind === 'rally' ? '#7a2a10' : INK;
      ctx.fillText(this.text, cx, cy + h * 0.03);
      ctx.restore();
    }

    // The crest, stamped down from above.
    const st = t - STAMP_AT;
    if (st >= 0) {
      const p = this.reduced ? 1 : clamp(st / STAMP, 0, 1);
      const scale = this.reduced ? 1 : 1.8 - 0.8 * stampEase(p);
      const size = layout.cell * 1.05 * scale;
      ctx.globalAlpha = fade * Math.min(1, p * 2.5);
      // Gold disc behind the shield.
      ctx.beginPath();
      ctx.arc(cx, crestY, size * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = GOLD_LIGHT;
      ctx.fill();
      ctx.lineWidth = Math.max(1.4, size * 0.05);
      ctx.strokeStyle = GOLD_DARK;
      ctx.stroke();
      paintEmblem(ctx, crest(this.race), cx - size * 0.45, crestY - size * 0.45, size * 0.9);
    }
    ctx.restore();
  }
}
