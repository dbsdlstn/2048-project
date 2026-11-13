/**
 * Race scenery in the board's top and bottom bands (the page above and below
 * the painted panel). Drawn into the cached board background, so it costs
 * nothing per frame; the renderer redraws it when the scenery changes.
 *
 * - Top band: an arcade of four niches, one per race. Empty niches hold a
 *   dotted gold outline of a shield: they visibly wait to be filled, which
 *   tells the player something can appear there. A companion puts the race's
 *   crest in its niche; a rallied race paints its homeland into every niche
 *   (for the dwarves: snowy mountains and a forge-lit hall door).
 * - Bottom band: a painted landscape (hills, the road, a distant beacon) over
 *   a stone floor, with a pedestal on the left. Empty, a dotted figure waits
 *   on it; with a companion, the dwarf stands there; rallied, the host stands
 *   along the floor between two standards.
 *
 * Everything scales with the band heights, which the layout makes larger
 * when the screen has spare height (small phones get the minimum bands).
 */
import { RACE_IDS, type RaceId, type Scenery } from '../scenery';
import type { AnyContext2D } from '../tilePainter';
import { DWARF_FIGURE, crest, dwarfTrooper, paintEmblem } from './emblems';
import { seeded } from './ink';
import {
  EMBER,
  EMBER_HOT,
  GOLD,
  GOLD_LIGHT,
  INK,
  LAPIS,
  LAPIS_DEEP,
  PARCHMENT_LIGHT,
  RACE_COLORS,
} from './palette';

/** Geometry of the page around the painted panel (CSS px). */
export interface Frame {
  readonly width: number;
  readonly height: number;
  /** Width of the gilded page border. */
  readonly border: number;
  /** Left edge of the panel (the margin is between the border and this). */
  readonly panelX: number;
  readonly panelTop: number;
  readonly panelBottom: number;
  readonly panelSize: number;
  readonly cell: number;
}

/** Niche order in the arcade. */
const NICHES: readonly RaceId[] = ['elf', 'dwarf', 'human', 'orc'];

export function paintScenery(ctx: AnyContext2D, f: Frame, scenery: Scenery): void {
  const top = {
    x: f.border * 2,
    y: f.border * 2,
    w: f.width - f.border * 4,
    h: f.panelTop - f.border * 2.6,
  };
  const bottom = {
    x: f.border * 2,
    y: f.panelBottom + f.border * 0.6,
    w: f.width - f.border * 4,
    h: f.height - f.panelBottom - f.border * 2.6,
  };
  const rallied = RACE_IDS.find((r) => scenery[r] === 'rallied') ?? null;
  if (top.h > 6) arcade(ctx, top, scenery, rallied);
  if (bottom.h > 6) floor(ctx, bottom, scenery);
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The arcade of four niches across the top band. */
function arcade(ctx: AnyContext2D, b: Box, scenery: Scenery, rallied: RaceId | null): void {
  const pillar = Math.max(3, b.w * 0.022);
  const inner = b.w - pillar * 5;
  const nw = inner / 4;
  const base = b.y + b.h;
  const archTop = b.y + b.h * 0.06;
  ctx.save();
  ctx.lineJoin = 'round';
  // Stone wall behind the niches.
  ctx.fillStyle = '#e6d4ad';
  ctx.fillRect(b.x, archTop, b.w, b.h - b.h * 0.06);
  ctx.strokeStyle = 'rgba(91, 67, 48, 0.35)';
  ctx.lineWidth = 1;
  for (let y = archTop + b.h * 0.25; y < base; y += b.h * 0.25) {
    ctx.beginPath();
    ctx.moveTo(b.x, y);
    ctx.lineTo(b.x + b.w, y);
    ctx.stroke();
  }
  NICHES.forEach((race, i) => {
    const x = b.x + pillar + i * (nw + pillar);
    const r = nw / 2;
    const springY = Math.min(base - b.h * 0.25, archTop + r);
    // Niche: an arched opening.
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, springY);
    ctx.arc(x + r, springY, r, Math.PI, 0);
    ctx.lineTo(x + nw, base);
    ctx.closePath();
    const sky = ctx.createLinearGradient(0, archTop, 0, base);
    sky.addColorStop(0, LAPIS_DEEP);
    sky.addColorStop(1, LAPIS);
    ctx.fillStyle = sky;
    ctx.fill();
    ctx.save();
    ctx.clip();
    stars(ctx, x, archTop, nw, base - archTop, i * 13 + 3);
    if (rallied === 'dwarf') homeland(ctx, x, archTop, nw, base - archTop, i === 1);
    const stage = scenery[race];
    const s = Math.min(nw * 0.62, (base - springY + r) * 0.62);
    const cx = x + nw / 2;
    const cy = base - (base - archTop) * 0.46;
    if (stage === 'none') waitingShield(ctx, cx - s / 2, cy - s / 2, s);
    else paintEmblem(ctx, crest(race), cx - s / 2, cy - s / 2, s);
    ctx.restore();
    // Gold arch moulding.
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, springY);
    ctx.arc(x + r, springY, r, Math.PI, 0);
    ctx.lineTo(x + nw, base);
    ctx.lineWidth = Math.max(1.5, nw * 0.05);
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    ctx.lineWidth = Math.max(0.8, nw * 0.018);
    ctx.strokeStyle = INK;
    ctx.stroke();
  });
  // Pillar capitals and the sill.
  for (let i = 0; i <= 4; i++) {
    const px = b.x + i * (nw + pillar) + pillar / 2;
    ctx.beginPath();
    ctx.arc(px, archTop + b.h * 0.18, pillar * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.lineWidth = Math.max(0.6, pillar * 0.2);
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.fillStyle = '#cdb88c';
  ctx.fillRect(b.x, base - Math.max(2, b.h * 0.05), b.w, Math.max(2, b.h * 0.05));
  ctx.lineWidth = Math.max(0.8, b.h * 0.015);
  ctx.strokeStyle = INK;
  ctx.strokeRect(b.x, archTop, b.w, base - archTop);
  ctx.restore();
}

/** Small gold stars in a niche's painted sky. */
function stars(ctx: AnyContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  const rnd = seeded(seed);
  ctx.fillStyle = 'rgba(246, 219, 126, 0.75)';
  for (let i = 0; i < 7; i++) {
    const sx = x + rnd() * w;
    const sy = y + rnd() * h * 0.6;
    const r = Math.max(0.6, w * (0.012 + rnd() * 0.012));
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 2);
    ctx.lineTo(sx + r * 0.6, sy);
    ctx.lineTo(sx, sy + r * 2);
    ctx.lineTo(sx - r * 0.6, sy);
    ctx.closePath();
    ctx.fill();
  }
}

/** The dwarves' homeland painted into a niche: snow-capped peaks, and a forge-lit hall door. */
function homeland(
  ctx: AnyContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hall: boolean,
): void {
  const base = y + h;
  ctx.save();
  ctx.lineJoin = 'round';
  const peaks: [number, number, number][] = [
    [0.15, 0.45, 0.5],
    [0.55, 0.3, 0.6],
    [0.95, 0.5, 0.5],
  ];
  for (const [px, py, pw] of peaks) {
    ctx.beginPath();
    ctx.moveTo(x + (px - pw / 2) * w, base);
    ctx.lineTo(x + px * w, y + py * h);
    ctx.lineTo(x + (px + pw / 2) * w, base);
    ctx.closePath();
    ctx.fillStyle = '#9c8e78';
    ctx.fill();
    ctx.lineWidth = Math.max(0.6, w * 0.015);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + (px - pw * 0.12) * w, y + (py + 0.1) * h);
    ctx.lineTo(x + px * w, y + py * h);
    ctx.lineTo(x + (px + pw * 0.12) * w, y + (py + 0.1) * h);
    ctx.closePath();
    ctx.fillStyle = PARCHMENT_LIGHT;
    ctx.fill();
  }
  if (hall) {
    const dw = w * 0.3;
    const dh = h * 0.36;
    const dx = x + w / 2 - dw / 2;
    ctx.beginPath();
    ctx.moveTo(dx, base);
    ctx.lineTo(dx, base - dh + dw / 2);
    ctx.arc(dx + dw / 2, base - dh + dw / 2, dw / 2, Math.PI, 0);
    ctx.lineTo(dx + dw, base);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - dh, 0, base);
    g.addColorStop(0, EMBER_HOT);
    g.addColorStop(1, EMBER);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, w * 0.03);
    ctx.strokeStyle = '#4a4036';
    ctx.stroke();
  }
  ctx.restore();
}

/** A dotted gold outline of a shield: a place that waits for a crest. */
function waitingShield(ctx: AnyContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.beginPath();
  ctx.moveTo(14, 10);
  ctx.lineTo(86, 10);
  ctx.lineTo(86, 46);
  ctx.bezierCurveTo(86, 70, 70, 86, 50, 95);
  ctx.bezierCurveTo(30, 86, 14, 70, 14, 46);
  ctx.closePath();
  ctx.setLineDash([7, 7]);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(246, 219, 126, 0.75)';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** The stone floor, the pedestal and whoever stands there. */
function floor(ctx: AnyContext2D, b: Box, scenery: Scenery): void {
  const ground = b.y + b.h * 0.93;
  ctx.save();
  ctx.lineJoin = 'round';
  frieze(ctx, b, ground);
  // Floor: a strip of chequered stone.
  const fh = Math.max(3, b.h * 0.1);
  const tiles = Math.max(8, Math.round(b.w / (fh * 2.2)));
  for (let i = 0; i < tiles; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d6c197' : '#b99f70';
    ctx.fillRect(b.x + (b.w * i) / tiles, ground, b.w / tiles + 0.5, fh);
  }
  ctx.lineWidth = Math.max(0.8, fh * 0.15);
  ctx.strokeStyle = INK;
  ctx.strokeRect(b.x, ground, b.w, fh);
  // The pedestal on the left.
  const fig = Math.min(b.h * 0.86, b.w * 0.3);
  const pw = fig * 0.72;
  const ph = Math.max(3, b.h * 0.1);
  const px = b.x + b.w * 0.03;
  const pTop = ground - ph;
  ctx.fillStyle = '#c9b48a';
  ctx.fillRect(px, pTop, pw, ph);
  ctx.fillStyle = GOLD;
  ctx.fillRect(px, pTop, pw, Math.max(1.5, ph * 0.25));
  ctx.strokeRect(px, pTop, pw, ph);
  const dwarf = scenery.dwarf;
  if (dwarf === 'none') {
    waitingFigure(ctx, px + pw / 2, pTop, fig * 0.9);
  } else {
    shadow(ctx, px + pw / 2, pTop, fig * 0.32);
    paintEmblem(ctx, DWARF_FIGURE, px + pw / 2 - fig * 0.55, pTop - fig, fig);
  }
  if (dwarf === 'rallied') host(ctx, b, ground, fig);
  ctx.restore();
}

/** Behind the floor: rolling hills, the road and a distant beacon tower (unlit). */
function frieze(ctx: AnyContext2D, b: Box, ground: number): void {
  const h = ground - b.y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, h);
  ctx.clip();
  const hill = (
    color: string,
    base: number,
    amp: number,
    phase: number,
    outline: boolean,
  ): void => {
    ctx.beginPath();
    ctx.moveTo(b.x, ground);
    for (let x = 0; x <= b.w; x += 4) {
      ctx.lineTo(b.x + x, base - amp * (0.5 + 0.5 * Math.sin(phase + (x / b.w) * Math.PI * 3)));
    }
    ctx.lineTo(b.x + b.w, ground);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (outline) {
      ctx.lineWidth = Math.max(0.6, h * 0.012);
      ctx.strokeStyle = 'rgba(42, 26, 16, 0.5)';
      ctx.stroke();
    }
  };
  hill('rgba(111, 143, 214, 0.28)', ground - h * 0.35, h * 0.3, 1.2, false);
  hill('rgba(61, 138, 108, 0.35)', ground - h * 0.12, h * 0.22, 0.2, true);
  // The road winding to the beacon.
  ctx.beginPath();
  ctx.moveTo(b.x + b.w * 0.25, ground);
  ctx.quadraticCurveTo(b.x + b.w * 0.6, ground - h * 0.05, b.x + b.w * 0.86, ground - h * 0.32);
  ctx.setLineDash([Math.max(2, h * 0.05), Math.max(2, h * 0.04)]);
  ctx.lineWidth = Math.max(1, h * 0.02);
  ctx.strokeStyle = 'rgba(140, 36, 18, 0.55)';
  ctx.stroke();
  ctx.setLineDash([]);
  // A small beacon tower, cold until its act is cleared.
  const tx = b.x + b.w * 0.9;
  const tw = h * 0.12;
  const th = h * 0.42;
  const tb = ground - h * 0.28;
  ctx.fillStyle = '#b3aa9c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.6, h * 0.012);
  ctx.beginPath();
  ctx.moveTo(tx - tw, tb);
  ctx.lineTo(tx - tw * 0.8, tb - th);
  ctx.lineTo(tx + tw * 0.8, tb - th);
  ctx.lineTo(tx + tw, tb);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(tx - tw * 1.1, tb - th - tw * 0.5, tw * 2.2, tw * 0.5);
  ctx.strokeRect(tx - tw * 1.1, tb - th - tw * 0.5, tw * 2.2, tw * 0.5);
  ctx.restore();
}

/** A standard: a tall pole with the race's banner and crest, planted at the end of the host. */
function standard(ctx: AnyContext2D, x: number, ground: number, h: number, race: RaceId): void {
  const c = RACE_COLORS[race];
  const w = h * 0.34;
  const top = ground - h;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, h * 0.035);
  ctx.beginPath();
  ctx.moveTo(x, ground);
  ctx.lineTo(x, top);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x, top, h * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cross bar and the hanging banner.
  const bx = x - w / 2;
  const by = top + h * 0.06;
  const len = h * 0.55;
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.1, by);
  ctx.lineTo(bx + w * 1.1, by);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + w, by);
  ctx.lineTo(bx + w, by + len);
  ctx.lineTo(x, by + len - w * 0.4);
  ctx.lineTo(bx, by + len);
  ctx.closePath();
  const g = ctx.createLinearGradient(bx, 0, bx + w, 0);
  g.addColorStop(0, c.dark);
  g.addColorStop(0.4, c.field);
  g.addColorStop(1, c.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1, w * 0.06);
  ctx.stroke();
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = Math.max(0.8, w * 0.05);
  ctx.strokeRect(bx + w * 0.14, by + w * 0.12, w * 0.72, len - w * 0.7);
  const cs = w * 0.8;
  paintEmblem(ctx, crest(race), x - cs / 2, by + w * 0.2, cs);
  ctx.restore();
}

/** A dotted outline of a standing figure on the empty pedestal: someone will stand here. */
function waitingFigure(ctx: AnyContext2D, cx: number, feet: number, h: number): void {
  ctx.save();
  ctx.setLineDash([Math.max(2, h * 0.05), Math.max(2, h * 0.05)]);
  ctx.lineWidth = Math.max(1, h * 0.025);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(138, 97, 20, 0.8)';
  ctx.beginPath();
  ctx.arc(cx, feet - h * 0.8, h * 0.13, 0, Math.PI * 2);
  ctx.moveTo(cx - h * 0.3, feet);
  ctx.quadraticCurveTo(cx - h * 0.3, feet - h * 0.62, cx, feet - h * 0.64);
  ctx.quadraticCurveTo(cx + h * 0.3, feet - h * 0.62, cx + h * 0.3, feet);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function shadow(ctx: AnyContext2D, cx: number, cy: number, rx: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, rx * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(43, 29, 16, 0.3)';
  ctx.fill();
}

/** The rallied host along the floor: a handful of soldiers, staggered and varied. */
function host(ctx: AnyContext2D, b: Box, ground: number, companion: number): void {
  const h = companion * 0.82;
  const first = b.x + b.w * 0.03 + companion * 0.95;
  const last = b.x + b.w - companion * 0.25;
  standard(ctx, first, ground, companion * 1.05, 'dwarf');
  standard(ctx, last, ground, companion * 1.05, 'dwarf');
  const start = first + h * 0.25;
  const end = last - h * 0.25;
  const count = Math.max(3, Math.min(7, Math.floor((end - start) / (h * 0.62))));
  const step = (end - start) / count;
  const rnd = seeded(41);
  for (let i = 0; i < count; i++) {
    const s = h * (0.86 + rnd() * 0.14);
    const x = start + step * (i + 0.5);
    const tool = i % 3 === 1 ? 'hammer' : 'spear';
    const tunic = i % 2 === 0 ? '#7e2618' : '#22406f';
    shadow(ctx, x, ground, s * 0.3);
    paintEmblem(ctx, dwarfTrooper(tool, tunic), x - s / 2, ground - s, s, i % 2 === 1);
  }
}
