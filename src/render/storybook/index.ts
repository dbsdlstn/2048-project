/**
 * The storybook theme, painted as an illuminated manuscript: a vellum page
 * with gilded borders, a lapis panel with a gold diaper pattern, illuminated
 * number tiles, scenery bands for the races, and normal (not additive)
 * blending for effects.
 */
import type { LayoutStyle, Palette, ParticleStyle, Theme } from '../theme';
import { STORYBOOK_BOARD_ART } from './board';
import { InkRing } from './inkRing';
import {
  CRIMSON,
  EMBER,
  EMBER_HOT,
  FROST,
  GOLD,
  GOLD_LIGHT,
  INK,
  LAPIS,
  SOCKET,
  VERDIGRIS,
  VERMILION,
} from './palette';
import { STORYBOOK_OVERLAYS, STORYBOOK_TILE_ART } from './tiles';

export const STORYBOOK_PALETTE: Palette = {
  board: LAPIS,
  boardEdge: INK,
  cell: SOCKET,
  tileBody: '#efe9dd',
  // Lining figures first (Charter, Palatino, Noto Serif); Korean falls back to a myeongjo / system font.
  fontFamily:
    "Charter, 'Bitstream Charter', 'Palatino Linotype', Palatino, 'Book Antiqua', 'Noto Serif', 'DejaVu Serif', 'Apple SD Gothic Neo', 'Noto Sans KR', serif",
  // Accent per value: the material's metal or pigment (sparks, rings, score text).
  // Accent per value: the tile's pigment (sparks, rings, score text).
  ramp: [
    '#8a7a62', // 2     vellum, ink
    '#c4381c', // 4     rubric
    '#26479c', // 8     lapis
    '#3d8a6c', // 16    verdigris wash
    '#4a6cc0', // 32    lapis wash
    '#c25a6e', // 64    rose wash
    '#2f7a5e', // 128   verdigris, gilded
    '#26479c', // 256   lapis, gilded
    '#c4381c', // 512   vermilion, gilded
    '#5e2f80', // 1024  tyrian, gilded
    '#d4a537', // 2048  burnished gold
    '#26479c', // 4096  jewelled lapis
    '#c4381c', // 8192  jewelled vermilion
    '#3d8a6c', // 16384 jewelled verdigris
  ],
  boardDetail: 'rgba(246, 219, 126, 0.22)',
  boardAccent: GOLD,
  stone: { fill: '#8a8073', edge: '#4a4036', crack: INK, light: '#cfc5b3' },
  wild: EMBER,
  ice: FROST,
  curse: '#3a2a2a',
  lock: CRIMSON,
  bossTarget: '#b4441c',
  targetDestroy: CRIMSON,
  relic: GOLD,
  highlight: GOLD_LIGHT,
  comboText: '#7a2a10',
  textOutline: 'rgba(250, 242, 222, 0.96)',
  ink: INK,
  textInk: 0.45,
  dim: 'rgba(43, 26, 12, 0.6)',
  celebrate: GOLD,
  spectrum: [EMBER_HOT, '#f0a43a', EMBER, VERMILION, GOLD_LIGHT],
  fireworks: {
    stage: [GOLD_LIGHT, GOLD, VERMILION, LAPIS, VERDIGRIS],
    victory: [GOLD_LIGHT, GOLD, VERMILION, LAPIS, VERDIGRIS, '#5e2f80'],
  },
};

/**
 * Narrow side margins; the race scenery lives in top and bottom bands that
 * grow with the spare height (0.56 to 1.35 cells each). Keep in step with
 * `--board-*` in style.css, which sizes the board box from the same numbers.
 */
export const STORYBOOK_LAYOUT: LayoutStyle = {
  gap: 0.09,
  padding: 0.3,
  boardRadius: 0.012,
  bands: { min: 0.56, max: 1.35, topShare: 0.5 },
};

/**
 * Normal blending on a bright page. Sparks become embers (a hot core with a
 * soft warm edge that still reads on parchment and on the walnut tray),
 * bits become gold dust, streaks become ink splashes.
 */
export const STORYBOOK_PARTICLES: ParticleStyle = {
  blend: 'source-over',
  // A gold-leaf glint: a small warm core with four thin rays.
  glowSprite(g, css, px) {
    const h = px / 2;
    const grad = g.createRadialGradient(h, h, 0, h, h, h * 0.55);
    grad.addColorStop(0, '#fff6d8');
    grad.addColorStop(0.35, css);
    grad.addColorStop(1, `${css}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, px, px);
    g.fillStyle = css;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const w = px * 0.06;
      g.moveTo(h + Math.cos(a) * h, h + Math.sin(a) * h);
      g.lineTo(h + Math.cos(a + Math.PI / 2) * w, h + Math.sin(a + Math.PI / 2) * w);
      g.lineTo(h - Math.cos(a) * w, h - Math.sin(a) * w);
      g.lineTo(h + Math.cos(a - Math.PI / 2) * w, h + Math.sin(a - Math.PI / 2) * w);
      g.closePath();
    }
    g.fill();
    g.fillStyle = '#fffbea';
    g.beginPath();
    g.arc(h, h, px * 0.07, 0, Math.PI * 2);
    g.fill();
  },
  bit: 'fleck',
  streak: 'tapered',
  scale: 1.6,
};

export const STORYBOOK_THEME: Theme = {
  ...STORYBOOK_PALETTE,
  ring: (row, col, color, start, reach) => new InkRing(row, col, color, start, reach),
  id: 'storybook',
  tileArt: STORYBOOK_TILE_ART,
  overlays: STORYBOOK_OVERLAYS,
  boardArt: STORYBOOK_BOARD_ART,
  particles: STORYBOOK_PARTICLES,
  layout: STORYBOOK_LAYOUT,
};
