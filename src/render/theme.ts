/**
 * Colours of the dark neon look. Everything is drawn in code, so the whole
 * visual identity lives in this one table. (Page chrome colours are in
 * src/ui/style.css; keep the two palettes in step.)
 */

export interface Theme {
  readonly board: string;
  readonly boardEdge: string;
  readonly cell: string;
  /** Dark base the tile bodies are tinted from (hex). */
  readonly tileBase: string;
  readonly fontFamily: string;
  /** Neon colour per power of two (hex), index = log2(value) - 1: 2 -> 0, 4 -> 1, ... */
  readonly ramp: readonly string[];
}

export const NEON_THEME: Theme = {
  board: '#10101e',
  boardEdge: 'rgba(130, 120, 255, 0.45)',
  cell: '#1a1a33',
  tileBase: '#12122a',
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
};

export interface TileColors {
  /** Neon accent: border, glow and text tint. */
  readonly accent: string;
  /** Tile body fill. */
  readonly fill: string;
  readonly text: string;
  /** Glow blur radius in CSS px. */
  readonly glow: number;
}

/** Colours for a number tile. Values past the ramp reuse it cyclically. */
export function numberTileColors(value: number, theme: Theme = NEON_THEME): TileColors {
  const level = Math.max(1, Math.round(Math.log2(Math.max(2, value))));
  const ramp = theme.ramp;
  const accent = ramp[(level - 1) % ramp.length] ?? '#ffffff';
  // Bodies get brighter as values climb; low tiles stay mostly dark glass.
  const bodyMix = Math.min(0.6, 0.14 + level * 0.04);
  return {
    accent,
    fill: mixHex(theme.tileBase, accent, bodyMix),
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

function parseHex(hex: string): number[] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`mixHex: expected #rrggbb, got ${hex}`);
  return [m[1], m[2], m[3]].map((h) => parseInt(h ?? '0', 16));
}
