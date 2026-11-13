/**
 * Small drawing helpers for the storybook look: hand-drawn (wobbly) outlines,
 * paper speckle, ink hatching and wax-seal badges. "Texture without assets":
 * everything is many cheap marks placed by a seeded random source, painted
 * once into a cached image (tile sprites, board background), never per frame.
 */
import { makeRandom } from '../particles';
import type { AnyContext2D } from '../tilePainter';
import { INK } from './palette';

export type Random = () => number;

/** A seeded random source; the same seed draws the same texture in every run. */
export function seeded(seed: number): Random {
  return makeRandom(seed);
}

/**
 * Adds a rounded-rectangle path whose edges wander by up to `wobble` px, like
 * a shape cut by hand. Points are spaced about every `step` px.
 */
export function wobblyRoundRect(
  ctx: AnyContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  wobble: number,
  rnd: Random,
  step = 6,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const pts: [number, number][] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number): void => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const j = (rnd() - 0.5) * 2 * wobble;
      pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
    }
  };
  const corner = (cx: number, cy: number, a0: number): void => {
    const n = Math.max(2, Math.round((rr * Math.PI) / 2 / step));
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      const j = 1 + ((rnd() - 0.5) * wobble) / Math.max(1, rr);
      pts.push([cx + Math.cos(a) * rr * j, cy + Math.sin(a) * rr * j]);
    }
  };
  edge(x + rr, y, x + w - rr, y, 0, 1);
  corner(x + w - rr, y + rr, -Math.PI / 2);
  edge(x + w, y + rr, x + w, y + h - rr, 1, 0);
  corner(x + w - rr, y + h - rr, 0);
  edge(x + w - rr, y + h, x + rr, y + h, 0, 1);
  corner(x + rr, y + h - rr, Math.PI / 2);
  edge(x, y + h - rr, x, y + rr, 1, 0);
  corner(x + rr, y + rr, Math.PI);
  ctx.beginPath();
  // Smooth through the midpoints so the wobble reads as a soft hand line, not as noise.
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const first = pts[0] as [number, number];
  const last = pts[pts.length - 1] as [number, number];
  const start = mid(last, first);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i] as [number, number];
    const q = pts[(i + 1) % pts.length] as [number, number];
    const m = mid(p, q);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

/** Adds a closed, smoothed blob path through points around (cx, cy) at radii `radii` (fractions of r). */
export function blobPath(
  ctx: AnyContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  radii: readonly number[],
  rotation = 0,
): void {
  const n = radii.length;
  const pts = radii.map((k, i): [number, number] => {
    const a = rotation + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  const first = pts[0] as [number, number];
  const last = pts[n - 1] as [number, number];
  ctx.beginPath();
  ctx.moveTo((first[0] + last[0]) / 2, (first[1] + last[1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i] as [number, number];
    const q = pts[(i + 1) % n] as [number, number];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

/** Scatters `count` tiny dots (paper grain, stone speckle) over a rectangle. */
export function speckle(
  ctx: AnyContext2D,
  rnd: Random,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  colors: readonly string[],
  size: readonly [number, number],
  alpha: readonly [number, number],
): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha[0] + (alpha[1] - alpha[0]) * rnd();
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)] ?? INK;
    const s = size[0] + (size[1] - size[0]) * rnd();
    ctx.beginPath();
    ctx.arc(x + rnd() * w, y + rnd() * h, s / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Parallel ink strokes across a rectangle at `angle` (radians): engraved shading. Clip first. */
export function hatch(
  ctx: AnyContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  spacing: number,
  angle: number,
): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const reach = Math.hypot(w, h) / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  ctx.beginPath();
  for (let d = -reach; d <= reach; d += spacing) {
    const px = cx - dy * d;
    const py = cy + dx * d;
    ctx.moveTo(px - dx * reach, py - dy * reach);
    ctx.lineTo(px + dx * reach, py + dy * reach);
  }
  ctx.stroke();
}

/**
 * A wax seal with a label: the storybook badge (frozen turns, ½, sealed
 * turns). A scalloped disc, a darker rim, a highlight, then the text.
 */
export function sealBadge(
  ctx: AnyContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  rim: string,
  text: string,
  textColor: string,
  font: string,
): void {
  ctx.save();
  const bumps = 9;
  ctx.beginPath();
  for (let i = 0; i <= bumps * 2; i++) {
    const a = (i / (bumps * 2)) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 : 0.88;
    const px = x + Math.cos(a) * r * k;
    const py = y + Math.sin(a) * r * k;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.66, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.strokeStyle = rim;
  ctx.stroke();
  ctx.font = `800 ${r * 1.15}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y + r * 0.07);
  ctx.restore();
}
