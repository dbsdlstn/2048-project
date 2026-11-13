/**
 * Race scenery in the storybook board frame (the band between the board's
 * edge and the wooden tray). Drawn into the cached board background, so it
 * costs nothing per frame; the renderer redraws it when the scenery changes.
 *
 * Stages read from a distance as "more": nothing → one companion in the
 * corner (2 relics) → banners down both sides, crest and mountain halls on
 * top, and the host along the bottom (4 relics). Only the dwarves are drawn
 * in stage A; other races show a neutral crest in their corner.
 */
import type { BoardLayout } from '../layout';
import type { RaceId, Scenery } from '../scenery';
import type { AnyContext2D } from '../tilePainter';
import { DWARF_FIGURE, crest, dwarfTrooper, paintEmblem } from './emblems';
import { blobPath, seeded } from './ink';
import { EMBER, EMBER_HOT, GOLD, GOLD_LIGHT, INK, PARCHMENT_LIGHT, RACE_COLORS } from './palette';

/** Geometry of the frame band. */
export interface Frame {
  readonly size: number;
  /** Distance from the canvas edge to the wooden tray. */
  readonly band: number;
  /** Width of the gold border at the outer edge. */
  readonly border: number;
}

/** Corners where a non-finished race's placeholder crest sits (the dwarves use bottom-left). */
const CORNER: Readonly<Record<RaceId, 'tl' | 'tr' | 'bl' | 'br'>> = {
  elf: 'tl',
  human: 'tr',
  dwarf: 'bl',
  orc: 'br',
};

/** Scenery behind the tray: banners, the top frieze, the host. */
export function paintSceneryBehind(ctx: AnyContext2D, f: Frame, scenery: Scenery): void {
  if (scenery.dwarf === 'rallied') {
    mountainHalls(ctx, f);
    banner(ctx, f.band * 0.5, f, 'dwarf');
    banner(ctx, f.size - f.band * 0.5, f, 'dwarf');
  }
  for (const race of ['elf', 'human', 'orc'] as const) {
    if (scenery[race] !== 'none') placeholderCrest(ctx, f, race);
  }
}

/** Scenery over the tray's rim: the companion and the crest medallion. */
export function paintSceneryFront(
  ctx: AnyContext2D,
  f: Frame,
  layout: BoardLayout,
  scenery: Scenery,
): void {
  if (scenery.dwarf === 'none') {
    beaconCartouche(ctx, f);
    return;
  }
  if (scenery.dwarf === 'rallied') {
    crestMedallion(ctx, f, 'dwarf');
    host(ctx, f);
  } else beaconCartouche(ctx, f);
  // The companion stands in the lower-left corner, feet on the border, leaning on the tray.
  const box = Math.min(layout.cell * 0.78, f.band * 1.75);
  const x = f.border * 0.4;
  const y = f.size - f.border - box * 0.97;
  groundShadow(ctx, x + box * 0.5, f.size - f.border - box * 0.03, box * 0.42);
  paintEmblem(ctx, DWARF_FIGURE, x, y, box);
}

function groundShadow(ctx: AnyContext2D, cx: number, cy: number, rx: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, rx * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(43, 29, 16, 0.3)';
  ctx.fill();
  ctx.restore();
}

/** Default top ornament: a small parchment cartouche holding the beacon flame (the game's own motif). */
function beaconCartouche(ctx: AnyContext2D, f: Frame): void {
  const cx = f.size / 2;
  const cy = f.band * 0.5;
  const rx = f.band * 0.95;
  const ry = f.band * 0.36;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = PARCHMENT_LIGHT;
  ctx.fill();
  ctx.lineWidth = Math.max(1, f.band * 0.06);
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, f.band * 0.035);
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + f.band * 0.06, ry + f.band * 0.06, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Scroll ends.
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s * (rx + f.band * 0.18), cy, f.band * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.stroke();
  }
  flame(ctx, cx, cy + ry * 0.1, ry * 0.8);
  ctx.restore();
}

/** A small flame glyph (ember and hot core), height ~2h. */
export function flame(ctx: AnyContext2D, cx: number, cy: number, h: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.bezierCurveTo(
    cx + h * 0.2,
    cy - h * 0.4,
    cx + h * 0.7,
    cy - h * 0.1,
    cx + h * 0.5,
    cy + h * 0.5,
  );
  ctx.bezierCurveTo(
    cx + h * 0.35,
    cy + h * 0.85,
    cx - h * 0.35,
    cy + h * 0.85,
    cx - h * 0.5,
    cy + h * 0.5,
  );
  ctx.bezierCurveTo(cx - h * 0.7, cy, cx - h * 0.3, cy - h * 0.2, cx - h * 0.12, cy - h * 0.55);
  ctx.bezierCurveTo(cx - h * 0.04, cy - h * 0.2, cx + h * 0.04, cy - h * 0.5, cx, cy - h);
  ctx.closePath();
  ctx.fillStyle = EMBER;
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, h * 0.1);
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.35, h * 0.22, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = EMBER_HOT;
  ctx.fill();
  ctx.restore();
}

/** A tall hanging banner in a side band, the race's crest near the top, swallow-tailed. */
function banner(ctx: AnyContext2D, cx: number, f: Frame, race: RaceId): void {
  const c = RACE_COLORS[race];
  const w = f.band * 0.84;
  const top = f.band * 1.05;
  const len = f.size * 0.42;
  const x = cx - w / 2;
  ctx.save();
  // Pole with finials.
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, w * 0.18);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.18, top);
  ctx.lineTo(x + w * 1.18, top);
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1, w * 0.1);
  ctx.stroke();
  // Cloth.
  const notch = w * 0.42;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x + w, top);
  ctx.lineTo(x + w, top + len);
  ctx.lineTo(cx, top + len - notch);
  ctx.lineTo(x, top + len);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, c.dark);
  g.addColorStop(0.35, c.field);
  g.addColorStop(0.7, c.field);
  g.addColorStop(1, c.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, w * 0.08);
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Gold edging inside.
  const e = w * 0.16;
  ctx.beginPath();
  ctx.moveTo(x + e, top + e * 0.6);
  ctx.lineTo(x + e, top + len - e * 1.2);
  ctx.moveTo(x + w - e, top + e * 0.6);
  ctx.lineTo(x + w - e, top + len - e * 1.2);
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.lineWidth = Math.max(0.8, w * 0.05);
  ctx.stroke();
  // Crest near the top.
  const cs = w * 0.92;
  paintEmblem(ctx, crest(race), cx - cs / 2, top + w * 0.3, cs);
  // A stitched chevron lower down.
  ctx.beginPath();
  ctx.moveTo(x + e, top + len * 0.62);
  ctx.lineTo(cx, top + len * 0.62 + w * 0.3);
  ctx.lineTo(x + w - e, top + len * 0.62);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1, w * 0.1);
  ctx.stroke();
  ctx.restore();
}

/** The crest on a gold medallion, top centre, over the tray rim. */
function crestMedallion(ctx: AnyContext2D, f: Frame, race: RaceId): void {
  const cx = f.size / 2;
  const r = f.band * 0.62;
  const cy = f.band * 0.62;
  ctx.save();
  // Laurel-like gold leaves on both sides.
  ctx.fillStyle = GOLD;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(0.8, r * 0.06);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 2 + s * (0.55 + i * 0.32);
      const lx = cx + Math.cos(a) * r * 1.25;
      const ly = cy + Math.sin(a) * r * 1.0 - r * 0.15;
      ctx.beginPath();
      ctx.ellipse(lx, ly, r * 0.32, r * 0.13, a + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
  ctx.fillStyle = PARCHMENT_LIGHT;
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, r * 0.05);
  ctx.stroke();
  const s = r * 1.5;
  paintEmblem(ctx, crest(race), cx - s / 2, cy - s / 2 + r * 0.04, s);
  ctx.restore();
}

/** Mountains with lit hall doorways along the top band. */
function mountainHalls(ctx: AnyContext2D, f: Frame): void {
  const S = f.size;
  const base = f.band * 0.98;
  const top = f.border + f.band * 0.08;
  const rnd = seeded(77);
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.border, f.border, S - f.border * 2, base - f.border);
  ctx.clip();
  // Far range, pale.
  const range = (color: string, heightK: number, step: number, outline: boolean): void => {
    ctx.beginPath();
    ctx.moveTo(f.border, base);
    for (let x = f.border; x <= S - f.border + step; x += step) {
      const h = (0.45 + rnd() * 0.55) * heightK;
      ctx.lineTo(x + step * 0.5, base - (base - top) * h);
      ctx.lineTo(x + step, base - (base - top) * h * (0.35 + rnd() * 0.3));
    }
    ctx.lineTo(S, base);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (outline) {
      ctx.lineWidth = Math.max(0.8, f.band * 0.04);
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  };
  range('#b9b6ad', 1.05, f.band * 1.1, false);
  range('#8f7f6a', 0.75, f.band * 0.8, true);
  // Hall doorways with forge light.
  for (const k of [0.27, 0.73]) {
    const dx = S * k;
    const dw = f.band * 0.42;
    const dh = f.band * 0.5;
    ctx.beginPath();
    ctx.moveTo(dx - dw / 2, base);
    ctx.lineTo(dx - dw / 2, base - dh + dw / 2);
    ctx.arc(dx, base - dh + dw / 2, dw / 2, Math.PI, 0);
    ctx.lineTo(dx + dw / 2, base);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - dh, 0, base);
    g.addColorStop(0, EMBER_HOT);
    g.addColorStop(1, EMBER);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, f.band * 0.07);
    ctx.strokeStyle = '#4a4036';
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The rallied host along the bottom band: a handful of soldiers, staggered
 * and varied (spears with pennants, hammers, two tunic colours). Fewer and
 * larger reads as "an army arrived"; a long even row read as a fence.
 */
function host(ctx: AnyContext2D, f: Frame): void {
  const S = f.size;
  const h = f.band * 1.15;
  const floor = S - f.border * 1.05;
  const slots = [0.3, 0.41, 0.5, 0.62, 0.72, 0.84];
  const rnd = seeded(41);
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.border, S - f.band * 1.5, S - f.border * 2, f.band * 1.5 - f.border);
  ctx.clip();
  slots.forEach((k, i) => {
    const s = h * (0.86 + rnd() * 0.14);
    const tool = i % 3 === 1 ? 'hammer' : 'spear';
    const tunic = i % 2 === 0 ? '#7e2618' : '#5b4a2a';
    groundShadow(ctx, S * k, floor - s * 0.03, s * 0.36);
    paintEmblem(ctx, dwarfTrooper(tool, tunic), S * k - s / 2, floor - s, s, i % 2 === 1);
  });
  ctx.restore();
}

/** A small neutral crest in a corner for a race that is not drawn yet. */
function placeholderCrest(ctx: AnyContext2D, f: Frame, race: RaceId): void {
  const s = f.band * 0.9;
  const corner = CORNER[race];
  const x = corner.endsWith('l') ? f.band * 0.08 : f.size - f.band * 0.08 - s;
  const y = corner.startsWith('t') ? f.band * 0.08 : f.size - f.band * 0.08 - s;
  paintEmblem(ctx, crest(race), x, y, s);
}

/** A soft patch of darker pigment (watercolour bloom) for the frame's paper. */
export function bloom(
  ctx: AnyContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  seed: number,
): void {
  const rnd = seeded(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const radii = Array.from({ length: 9 }, () => 0.75 + rnd() * 0.4);
    blobPath(
      ctx,
      x + (rnd() - 0.5) * r * 0.4,
      y + (rnd() - 0.5) * r * 0.4,
      r,
      r * (0.7 + rnd() * 0.3),
      radii,
      rnd() * 6,
    );
    ctx.fill();
  }
  ctx.restore();
}
