/**
 * A visual theme is a strategy object: it supplies colours (the `Palette`)
 * *and* the painters that turn game objects into pixels (tile art, status
 * overlays, the board and its marks, how particles are drawn, how much room
 * the board frame takes). The renderer, the sprite cache, the effects and the
 * feedback director only talk to this interface, so a new look is a new
 * `Theme` object, not edits across the renderer.
 *
 * Page chrome colours live in src/ui/style.css as custom properties, switched
 * by `data-theme` on <html>; keep the two in step. The theme objects
 * themselves are assembled in ./themes.ts (this file holds no painters, so it
 * can be imported from anywhere without import cycles).
 */
import type { TileId, TileKind } from '../core';
import type { BoardLayout } from './layout';
import type { BoardMarks } from './marks';
import type { Scenery } from './scenery';
import type { StatusOverlay, TileArt } from './tilePainter';

export type ThemeId = 'neon' | 'storybook';

/** Colours a theme hands to painters, effects and the feedback director. */
export interface Palette {
  readonly board: string;
  readonly boardEdge: string;
  /** Empty cell (slot / socket). */
  readonly cell: string;
  /** Base the number tile bodies are tinted from (hex). */
  readonly tileBody: string;
  readonly fontFamily: string;
  /** Accent colour per power of two (hex), index = log2(value) - 1: 2 -> 0, 4 -> 1, ... */
  readonly ramp: readonly string[];
  /** Fine detail printed on the board (neon: circuit traces). */
  readonly boardDetail: string;
  /** The board's signature accent (neon: the glowing rift; storybook: gold leaf). */
  readonly boardAccent: string;
  readonly stone: {
    readonly fill: string;
    readonly edge: string;
    readonly crack: string;
    /** Lit faces of the fragments when it shatters. */
    readonly light: string;
  };
  /** The wild tile (merges with any number). */
  readonly wild: string;
  readonly ice: string;
  readonly curse: string;
  /** The warden's sealed line. */
  readonly lock: string;
  /** The corroder's next target. */
  readonly bossTarget: string;
  /** Targeting outline for a destroying relic. */
  readonly targetDestroy: string;
  /** Relic triggers (pulses). */
  readonly relic: string;
  /** The hottest particle colour (neon: white light; storybook: gold). */
  readonly highlight: string;
  /** Combo label ("+64 ×3"). */
  readonly comboText: string;
  /** Outline under floating text. */
  readonly textOutline: string;
  /** Darkest ink; floating text is mixed towards it by `textInk` (0 = keep the accent). */
  readonly ink: string;
  readonly textInk: number;
  /** Veil over cells a targeted relic cannot take. */
  readonly dim: string;
  /** Board flash when a stage is cleared. */
  readonly celebrate: string;
  /** Many-coloured bursts (wild tile merges and spawns). */
  readonly spectrum: readonly string[];
  /** Firework colours: a cleared stage, and the final victory. */
  readonly fireworks: { readonly stage: readonly string[]; readonly victory: readonly string[] };
}

/** Board proportions, as fractions of a cell (radius: of the board size). */
export interface LayoutStyle {
  readonly gap: number;
  /** Room between the board edge and the first cell: the frame. */
  readonly padding: number;
  readonly boardRadius: number;
}

type AnyContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Painters for the board itself: its cached background and the marks drawn every frame. */
export interface BoardArt {
  /** Static board (frame, slots, scenery), cached by the renderer per size / theme / scenery. */
  background(
    ctx: AnyContext2D,
    layout: BoardLayout,
    theme: Theme,
    pixelRatio: number,
    scenery: Scenery,
  ): void;
  /** Under the tiles: the sealed line's band. */
  marksBelow(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    marks: BoardMarks,
    theme: Theme,
  ): void;
  /** Over the tiles: lock rails, boss target, targeting outlines. */
  marksAbove(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    marks: BoardMarks,
    theme: Theme,
    now: number,
    tilePosition: (id: TileId) => { row: number; col: number; scale: number } | null,
  ): void;
}

/** How particles are drawn (the pool's physics never changes). */
export interface ParticleStyle {
  /** `lighter` (additive light) on dark boards, `source-over` on bright ones. */
  readonly blend: GlobalCompositeOperation;
  /** Paints the round "spark" sprite for one colour into a `px`-square canvas. */
  glowSprite(g: AnyContext2D, css: string, px: number): void;
  /** `trail`: a square with a motion trail (current); `fleck`: a spinning flake of gold dust. */
  readonly bit: 'trail' | 'fleck';
  /** `line`: an even stroke; `tapered`: a splash, thick at the head, thin at the tail. */
  readonly streak: 'line' | 'tapered';
  /** Size multiplier: marks drawn without additive light need more area to read. */
  readonly scale: number;
}

export interface Theme extends Palette {
  readonly id: ThemeId;
  readonly tileArt: Readonly<Record<TileKind, TileArt>>;
  /** Drawn live over a tile of any kind, in order. */
  readonly overlays: readonly StatusOverlay[];
  readonly boardArt: BoardArt;
  readonly particles: ParticleStyle;
  readonly layout: LayoutStyle;
}

export const NEON_PALETTE: Palette = {
  board: '#10101e',
  boardEdge: 'rgba(130, 120, 255, 0.45)',
  cell: '#1a1a33',
  tileBody: '#12122a',
  fontFamily: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  ramp: [
    '#2de2e6', // 2     cyan
    '#3a86ff', // 4     blue
    '#8b5cf6', // 8     violet
    '#ff3cac', // 16    pink
    '#ff5e5b', // 32    coral
    '#ff9f1c', // 64    orange
    '#ffe74c', // 128   yellow
    '#9ef01a', // 256   lime
    '#00f5d4', // 512   aqua
    '#f72585', // 1024  magenta
    '#fdfdff', // 2048  white hot
  ],
  boardDetail: 'rgba(120, 140, 255, 0.16)',
  boardAccent: '#ffb347',
  stone: { fill: '#2b2a33', edge: '#9a98a8', crack: '#14131a', light: '#c9c7d6' },
  wild: '#ffffff',
  ice: '#a6ecff',
  curse: '#b45cff',
  lock: '#ff4d6d',
  bossTarget: '#ff8a3d',
  targetDestroy: '#ff4d6d',
  relic: '#ffb347',
  highlight: '#ffffff',
  comboText: '#ffffff',
  textOutline: 'rgba(6, 6, 16, 0.9)',
  ink: '#06060e',
  textInk: 0,
  dim: 'rgba(6, 6, 14, 0.62)',
  celebrate: '#2de2e6',
  spectrum: [
    '#2de2e6',
    '#3a86ff',
    '#8b5cf6',
    '#ff3cac',
    '#ff5e5b',
    '#ff9f1c',
    '#ffe74c',
    '#9ef01a',
    '#00f5d4',
  ],
  fireworks: {
    stage: ['#2de2e6', '#3a86ff', '#8b5cf6', '#ff3cac', '#ff5e5b', '#ff9f1c', '#ffe74c'],
    victory: ['#ff9f1c', '#ffe74c', '#9ef01a', '#00f5d4', '#f72585', '#fdfdff'],
  },
};

export const NEON_LAYOUT: LayoutStyle = { gap: 0.12, padding: 0.12, boardRadius: 0.05 };

export interface TileColors {
  /** Neon accent: border, glow and text tint. */
  readonly accent: string;
  /** Tile body fill. */
  readonly fill: string;
  readonly text: string;
  /** Glow blur radius in CSS px. */
  readonly glow: number;
}

/** 1 for 2, 2 for 4, ... (values below 2 count as 2). */
export function tileLevel(value: number): number {
  return Math.max(1, Math.round(Math.log2(Math.max(2, value))));
}

/** The palette's accent colour for a value. Values past the ramp reuse it cyclically. */
export function rampColor(value: number, palette: Palette = NEON_PALETTE): string {
  const ramp = palette.ramp;
  return ramp[(tileLevel(value) - 1) % ramp.length] ?? '#ffffff';
}

/** Colours for a neon number tile. */
export function numberTileColors(value: number, palette: Palette = NEON_PALETTE): TileColors {
  const level = tileLevel(value);
  const accent = rampColor(value, palette);
  // Bodies get brighter as values climb; low tiles stay mostly dark glass.
  const bodyMix = Math.min(0.6, 0.14 + level * 0.04);
  return {
    accent,
    fill: mixHex(palette.tileBody, accent, bodyMix),
    text: level >= 7 ? '#ffffff' : mixHex(accent, '#ffffff', 0.25),
    glow: Math.min(22, 6 + level * 1.6),
  };
}

/** Linear mix of two `#rrggbb` colours; `t` = 0 gives `a`, 1 gives `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const out = ca.map((v, i) => Math.round(v + ((cb[i] ?? v) - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** `#rrggbb` with an alpha, as `rgba()`. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r ?? 0}, ${g ?? 0}, ${b ?? 0}, ${alpha})`;
}

function parseHex(hex: string): number[] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`mixHex: expected #rrggbb, got ${hex}`);
  return [m[1], m[2], m[3]].map((h) => parseInt(h ?? '0', 16));
}
