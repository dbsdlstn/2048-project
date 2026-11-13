/**
 * How each tile looks. Tile art is looked up by tile kind and rasterized once
 * per distinct look into the sprite cache (glow included), so the expensive
 * `shadowBlur` never runs per frame. Status overlays (ice, curse marks) are
 * drawn live on top of any kind. New kinds and statuses are added by
 * registering functions here, not by editing the renderer.
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

type AnyContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

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

    ctx.save();
    // Body with outer glow.
    roundRectPath(ctx, x, y, cell, cell, d.radius);
    ctx.shadowColor = colors.accent;
    ctx.shadowBlur = colors.glow * (look.emphasized ? EMPHASIS_GLOW : 1) * pixelRatio;
    ctx.fillStyle = colors.fill;
    ctx.fill();
    // Neon rim.
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.5, cell * 0.035);
    ctx.strokeStyle = colors.accent;
    ctx.stroke();
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

/** Art per tile kind. A new `TileKind` fails to compile until it gets art here. */
export const TILE_ART: Record<TileKind, TileArt> = {
  number: numberTileArt,
};

/** Drawn live over a tile of any kind, in order (e.g. ice, curse marks). */
export const STATUS_OVERLAYS: StatusOverlay[] = [];
