/**
 * How each tile looks. Tile art is looked up by tile kind and rasterized once
 * per distinct look into the sprite cache (glow included), so the expensive
 * `shadowBlur` never runs per frame. Status overlays (ice, curse marks) are
 * drawn live on top of any kind. New kinds and statuses are added by
 * registering functions in a theme's tables, not by editing the renderer.
 * This file holds the shared types and helpers plus the neon theme's art;
 * the storybook theme's art is in ./storybook/.
 *
 * Neon motif: tiles are circuit "chips" — squares with cut (chamfered)
 * corners and a short printed trace — sitting in slots on a circuit board
 * with a glowing rift underneath. Hazards break the motif on purpose: a stone
 * is a rough, glowless shard; ice is a frosted pane; a curse is a glitched rim.
 */
import type { TileKind } from '../core';
import { numberTileColors, type Theme } from './theme';
import type { SpriteFrame } from './viewModel';

/** Everything that decides a tile's cached appearance. Equal looks share one cached image. */
export interface TileLook {
  readonly kind: TileKind;
  readonly value: number;
  /** Stronger glow, used while a merge pop is playing. */
  readonly emphasized: boolean;
}

/** Context for rasterizing a look once, at scale 1, into an offscreen canvas. */
export interface TileArtContext {
  readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  /** Centre of the tile in CSS px (within the offscreen canvas). */
  readonly cx: number;
  readonly cy: number;
  /** Cell size and corner radius in CSS px. */
  readonly cell: number;
  readonly radius: number;
  readonly look: TileLook;
  readonly theme: Theme;
  /** Device pixels per CSS px. `shadowBlur` ignores the canvas transform, so multiply by this. */
  readonly pixelRatio: number;
}

export interface TileArt {
  /** Draws the tile (body, rim, label, glow) centred on (cx, cy). */
  paint(d: TileArtContext): void;
  /** How far (CSS px) the glow reaches past the cell edge; sizes the cached image. */
  margin(look: TileLook, theme: Theme): number;
}

/** Context for live overlays, drawn every frame on the main canvas. */
export interface OverlayContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly cx: number;
  readonly cy: number;
  /** Scaled tile size and radius for this frame. */
  readonly size: number;
  readonly radius: number;
  readonly frame: SpriteFrame;
  readonly theme: Theme;
  readonly now: number;
}

export type StatusOverlay = (d: OverlayContext) => void;

export type AnyContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Adds a path for a rounded rectangle (own helper: `ctx.roundRect` is missing on older Safari). */
export function roundRectPath(
  ctx: AnyContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Corner cut of a chip, as a fraction of its size. */
export const CHIP_CUT = 0.17;

/** Adds a path for a chip: a square with chamfered (cut) corners. */
export function chipPath(
  ctx: AnyContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number,
): void {
  const c = Math.max(0, Math.min(cut, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

/** Font size as a fraction of the cell, shrinking for long numbers. */
export function numberFontRatio(value: number): number {
  const digits = String(value).length;
  if (digits <= 2) return 0.46;
  if (digits === 3) return 0.38;
  if (digits === 4) return 0.3;
  return 0.24;
}

const EMPHASIS_GLOW = 1.6;

const numberTileArt: TileArt = {
  margin(look, theme) {
    const glow = numberTileColors(look.value, theme).glow;
    return Math.ceil(glow * (look.emphasized ? EMPHASIS_GLOW : 1)) + 2;
  },
  paint(d) {
    const { ctx, cx, cy, cell, look, pixelRatio } = d;
    const colors = numberTileColors(look.value, d.theme);
    const x = cx - cell / 2;
    const y = cy - cell / 2;
    const cut = cell * CHIP_CUT;

    ctx.save();
    // Body with outer glow.
    chipPath(ctx, x, y, cell, cell, cut);
    ctx.shadowColor = colors.accent;
    ctx.shadowBlur = colors.glow * (look.emphasized ? EMPHASIS_GLOW : 1) * pixelRatio;
    ctx.fillStyle = colors.fill;
    ctx.fill();
    // Neon rim.
    ctx.shadowBlur = 0;
    const line = Math.max(1.5, cell * 0.035);
    ctx.lineWidth = line;
    ctx.strokeStyle = colors.accent;
    ctx.stroke();
    // Printed trace: a short line with a via (dot) in the bottom-right corner.
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1, cell * 0.022);
    ctx.beginPath();
    ctx.moveTo(x + cell - cut * 0.5, y + cell - cut * 1.6);
    ctx.lineTo(x + cell - cut * 1.6, y + cell - cut * 0.5);
    ctx.lineTo(x + cell - cut * 2.6, y + cell - cut * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      x + cell - cut * 2.6,
      y + cell - cut * 0.5,
      Math.max(1.2, cell * 0.025),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Label with a soft glow of its own.
    const fontPx = cell * numberFontRatio(look.value);
    ctx.font = `800 ${fontPx}px ${d.theme.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.text;
    ctx.shadowColor = colors.accent;
    ctx.shadowBlur = fontPx * 0.35 * pixelRatio;
    // Small optical offset: digits sit visually a bit high with 'middle'.
    ctx.fillText(String(look.value), cx, cy + fontPx * 0.04);
    ctx.restore();
  },
};

/** Outline of a stone shard as (x, y) fractions of the cell: deliberately uneven. */
const SHARD: readonly (readonly [number, number])[] = [
  [0.1, 0.04],
  [0.62, 0.0],
  [0.96, 0.14],
  [1.0, 0.58],
  [0.88, 0.97],
  [0.36, 1.0],
  [0.02, 0.84],
  [0.0, 0.3],
];

/** Stone: a rough, glowless shard with a forked crack (told apart by shape, not only colour). */
const stoneTileArt: TileArt = {
  margin: () => 2,
  paint(d) {
    const { ctx, cx, cy, cell } = d;
    const s = d.theme.stone;
    const inset = cell * 0.04;
    const size = cell - inset * 2;
    const x = cx - size / 2;
    const y = cy - size / 2;
    ctx.save();
    ctx.beginPath();
    SHARD.forEach(([px, py], i) => {
      const X = x + px * size;
      const Y = y + py * size;
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.closePath();
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, '#3b3a46');
    grad.addColorStop(1, s.fill);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, cell * 0.035);
    ctx.strokeStyle = s.edge;
    ctx.stroke();
    // Forked crack.
    ctx.lineWidth = Math.max(1.5, cell * 0.045);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = s.crack;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.3, y + size * 0.12);
    ctx.lineTo(x + size * 0.46, y + size * 0.4);
    ctx.lineTo(x + size * 0.38, y + size * 0.6);
    ctx.lineTo(x + size * 0.56, y + size * 0.88);
    ctx.moveTo(x + size * 0.46, y + size * 0.4);
    ctx.lineTo(x + size * 0.74, y + size * 0.5);
    ctx.stroke();
    ctx.restore();
  },
};

/** Prism: a chip holding a faceted diamond with a spectrum rim; merges with any number. */
const prismTileArt: TileArt = {
  margin: () => 16,
  paint(d) {
    const { ctx, cx, cy, cell, pixelRatio } = d;
    const x = cx - cell / 2;
    const y = cy - cell / 2;
    ctx.save();
    chipPath(ctx, x, y, cell, cell, cell * CHIP_CUT);
    ctx.shadowColor = d.theme.wild;
    ctx.shadowBlur = 14 * pixelRatio;
    ctx.fillStyle = d.theme.tileBody;
    ctx.fill();
    ctx.shadowBlur = 0;
    const spectrum = ctx.createLinearGradient(x, y, x + cell, y + cell);
    spectrum.addColorStop(0, '#2de2e6');
    spectrum.addColorStop(0.5, '#ff3cac');
    spectrum.addColorStop(1, '#ffb347');
    ctx.lineWidth = Math.max(2, cell * 0.045);
    ctx.strokeStyle = spectrum;
    ctx.stroke();
    const k = cell * 0.27;
    ctx.beginPath();
    ctx.moveTo(cx, cy - k);
    ctx.lineTo(cx + k, cy);
    ctx.lineTo(cx, cy + k);
    ctx.lineTo(cx - k, cy);
    ctx.closePath();
    ctx.fillStyle = d.theme.wild;
    ctx.fill();
    // Facets.
    ctx.lineWidth = Math.max(1, cell * 0.02);
    ctx.strokeStyle = spectrum;
    ctx.beginPath();
    ctx.moveTo(cx - k, cy);
    ctx.lineTo(cx + k, cy);
    ctx.moveTo(cx, cy - k);
    ctx.lineTo(cx - k * 0.4, cy);
    ctx.lineTo(cx, cy + k);
    ctx.stroke();
    ctx.restore();
  },
};

/** Neon art per tile kind. A new `TileKind` fails to compile until every theme has art for it. */
export const NEON_TILE_ART: Record<TileKind, TileArt> = {
  number: numberTileArt,
  stone: stoneTileArt,
  prism: prismTileArt,
};

/** A filled circular badge with a centred label. */
export function badge(
  d: OverlayContext,
  bx: number,
  by: number,
  r: number,
  fill: string,
  text: string,
  textColor: string,
): void {
  const { ctx } = d;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.strokeStyle = d.theme.board;
  ctx.stroke();
  ctx.font = `800 ${r * 1.25}px ${d.theme.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(text, bx, by + r * 0.06);
}

/**
 * Ice: a frosted pane over the chip (light wash, solid pale rim, crystal
 * shards in two corners) plus a badge with the frozen moves left.
 */
const iceOverlay: StatusOverlay = (d) => {
  const turns = d.frame.status.frozenTurns;
  if (turns <= 0) return;
  const { ctx, cx, cy, size } = d;
  const x = cx - size / 2;
  const y = cy - size / 2;
  const ice = d.theme.ice;
  ctx.save();
  chipPath(ctx, x, y, size, size, size * CHIP_CUT);
  ctx.fillStyle = 'rgba(166, 236, 255, 0.2)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.strokeStyle = ice;
  ctx.stroke();
  // Crystal shards.
  ctx.fillStyle = ice;
  const k = size * 0.2;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(x + size * CHIP_CUT, y + size * 0.06);
  ctx.lineTo(x + size * CHIP_CUT + k, y + size * 0.06);
  ctx.lineTo(x + size * CHIP_CUT + k * 0.25, y + k * 0.9);
  ctx.closePath();
  ctx.moveTo(x + size - size * CHIP_CUT, y + size - size * 0.06);
  ctx.lineTo(x + size - size * CHIP_CUT - k, y + size - size * 0.06);
  ctx.lineTo(x + size - size * CHIP_CUT - k * 0.25, y + size - k * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  const r = size * 0.15;
  badge(d, x + size - r * 0.9, y + r * 0.9, r, ice, String(turns), '#06202a');
  ctx.restore();
};

/** Curse: a glitched (zigzag) violet inner rim and a "½" badge, since a cursed merge yields half. */
const curseOverlay: StatusOverlay = (d) => {
  if (!d.frame.status.cursed) return;
  const { ctx, cx, cy, size } = d;
  const x = cx - size / 2;
  const y = cy - size / 2;
  ctx.save();
  const inset = size * 0.12;
  const w = size - inset * 2;
  const teeth = 6;
  const amp = size * 0.03;
  ctx.beginPath();
  // Zigzag along the four inner edges.
  const edge = (x0: number, y0: number, dx: number, dy: number, nx: number, ny: number) => {
    for (let i = 0; i <= teeth; i++) {
      const t = i / teeth;
      const o = i % 2 === 0 ? 0 : amp;
      const px = x0 + dx * t + nx * o;
      const py = y0 + dy * t + ny * o;
      if (i === 0 && x0 === x + inset && y0 === y + inset) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  };
  edge(x + inset, y + inset, w, 0, 0, 1);
  edge(x + inset + w, y + inset, 0, w, -1, 0);
  edge(x + inset + w, y + inset + w, -w, 0, 0, -1);
  edge(x + inset, y + inset + w, 0, -w, 1, 0);
  ctx.closePath();
  ctx.lineWidth = Math.max(1.5, size * 0.035);
  ctx.strokeStyle = d.theme.curse;
  ctx.stroke();
  const r = size * 0.15;
  badge(d, x + r * 0.9, y + size - r * 0.9, r, d.theme.curse, '½', '#ffffff');
  ctx.restore();
};

/** Neon status overlays, drawn live over a tile of any kind, in order. */
export const NEON_OVERLAYS: readonly StatusOverlay[] = [iceOverlay, curseOverlay];
