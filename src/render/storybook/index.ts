/**
 * The storybook theme: a warm, hand-inked fantasy map. Bright parchment
 * page, walnut board, rune-stone tiles, normal (not additive) blending.
 */
import type { LayoutStyle, Palette, ParticleStyle, Theme } from '../theme';
import { STORYBOOK_BOARD_ART } from './board';
import { CRIMSON, EMBER, EMBER_HOT, FROST, GOLD, GOLD_LIGHT, INK, SOCKET, WOOD } from './palette';
import { STORYBOOK_OVERLAYS, STORYBOOK_TILE_ART } from './tiles';

export const STORYBOOK_PALETTE: Palette = {
  board: WOOD,
  boardEdge: INK,
  cell: SOCKET,
  tileBody: '#efe9dd',
  // Lining figures first (Charter, Palatino, Noto Serif); Korean falls back to a myeongjo / system font.
  fontFamily:
    "Charter, 'Bitstream Charter', 'Palatino Linotype', Palatino, 'Book Antiqua', 'Noto Serif', 'DejaVu Serif', 'Apple SD Gothic Neo', 'Noto Sans KR', serif",
  // Accent per value: the material's metal or pigment (sparks, rings, score text).
  ramp: [
    '#9a8f7e', // 2     pebble
    '#b8955e', // 4     sand
    '#c88a52', // 8     sandstone
    '#c0643a', // 16    terracotta
    '#a3662a', // 32    bronze
    '#9a4a22', // 64    copper
    '#76838f', // 128   silver
    '#4f729c', // 256   moonsilver
    '#c8952c', // 512   gold
    '#b8741a', // 1024  red gold
    '#c9452c', // 2048  ember gem
    '#7b4bb0', // 4096  amethyst
    '#2f5fae', // 8192  sapphire
    '#2f8a5a', // 16384 emerald
  ],
  boardDetail: 'rgba(40, 22, 8, 0.28)',
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
  spectrum: [EMBER_HOT, '#f0a43a', EMBER, '#c94a2a', GOLD_LIGHT],
  fireworks: {
    stage: [GOLD_LIGHT, GOLD, EMBER_HOT, EMBER, '#f7e3a0'],
    victory: [GOLD_LIGHT, EMBER_HOT, EMBER, '#c9452c', '#7b4bb0', '#2f8a5a'],
  },
};

/** The frame band holds the race scenery, so the padding is several times neon's (tiles ~15% smaller). */
export const STORYBOOK_LAYOUT: LayoutStyle = { gap: 0.09, padding: 0.56, boardRadius: 0.02 };

/**
 * Normal blending on a bright page. Sparks become embers (a hot core with a
 * soft warm edge that still reads on parchment and on the walnut tray),
 * bits become gold dust, streaks become ink splashes.
 */
export const STORYBOOK_PARTICLES: ParticleStyle = {
  blend: 'source-over',
  glowSprite(g, css, px) {
    const h = px / 2;
    const grad = g.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0, '#fff6d8');
    grad.addColorStop(0.22, css);
    grad.addColorStop(0.5, `${css}99`);
    grad.addColorStop(1, `${css}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, px, px);
  },
  bit: 'fleck',
  streak: 'tapered',
  scale: 1.6,
};

export const STORYBOOK_THEME: Theme = {
  ...STORYBOOK_PALETTE,
  id: 'storybook',
  tileArt: STORYBOOK_TILE_ART,
  overlays: STORYBOOK_OVERLAYS,
  boardArt: STORYBOOK_BOARD_ART,
  particles: STORYBOOK_PARTICLES,
  layout: STORYBOOK_LAYOUT,
};
