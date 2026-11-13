/**
 * Pre-rendered tile images. Glow (`shadowBlur`) is one of the slowest Canvas 2D
 * operations, especially on cheap phones, so each distinct tile look is drawn
 * once into an offscreen canvas at the current cell size x devicePixelRatio and
 * then copied with `drawImage` every frame. Changing the cell size or DPR
 * (resize, zoom, moving to another screen) throws the cache away.
 */
import { NEON_THEME, type Theme } from './theme';
import { TILE_ART, type TileArt, type TileLook } from './tilePainter';
import type { TileKind } from '../core';

export interface CachedTile {
  readonly image: CanvasImageSource;
  /** Width = height of the image in CSS px (cell + glow margin on both sides), centred on the tile. */
  readonly cssSize: number;
}

export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement | OffscreenCanvas;

export const createDomCanvas: CanvasFactory = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export interface TileSpriteCacheOptions {
  readonly theme?: Theme;
  readonly createCanvas?: CanvasFactory;
  readonly art?: Readonly<Record<TileKind, TileArt>>;
  /** The cache is emptied when it grows past this many images (a crude but safe bound). */
  readonly maxEntries?: number;
}

export class TileSpriteCache {
  private readonly entries = new Map<string, CachedTile>();
  private readonly theme: Theme;
  private readonly createCanvas: CanvasFactory;
  private readonly art: Readonly<Record<TileKind, TileArt>>;
  private readonly maxEntries: number;
  private cell = 0;
  private radius = 0;
  private pixelRatio = 1;

  constructor(options: TileSpriteCacheOptions = {}) {
    this.theme = options.theme ?? NEON_THEME;
    this.createCanvas = options.createCanvas ?? createDomCanvas;
    this.art = options.art ?? TILE_ART;
    this.maxEntries = options.maxEntries ?? 64;
  }

  get size(): number {
    return this.entries.size;
  }

  /** Sets the geometry images are drawn at; any change invalidates every cached image. */
  configure(cell: number, radius: number, pixelRatio: number): void {
    if (cell === this.cell && radius === this.radius && pixelRatio === this.pixelRatio) return;
    this.cell = cell;
    this.radius = radius;
    this.pixelRatio = pixelRatio;
    this.entries.clear();
  }

  clear(): void {
    this.entries.clear();
  }

  get(look: TileLook): CachedTile {
    const key = `${look.kind}|${look.value}|${look.emphasized ? 1 : 0}`;
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= this.maxEntries) this.entries.clear();
      entry = this.render(look);
      this.entries.set(key, entry);
    }
    return entry;
  }

  private render(look: TileLook): CachedTile {
    const art = this.art[look.kind];
    const margin = art.margin(look, this.theme);
    const cssSize = this.cell + margin * 2;
    const pixels = Math.max(1, Math.ceil(cssSize * this.pixelRatio));
    const canvas = this.createCanvas(pixels, pixels);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('TileSpriteCache: 2D context unavailable');
    const scale = pixels / cssSize;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    art.paint({
      ctx,
      cx: cssSize / 2,
      cy: cssSize / 2,
      cell: this.cell,
      radius: this.radius,
      look,
      theme: this.theme,
      pixelRatio: scale,
    });
    return { image: canvas, cssSize };
  }
}
