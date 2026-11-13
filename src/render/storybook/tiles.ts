/**
 * Storybook tile art: numbered rune stones, the boulder, the ember stone, and
 * the frost / soot overlays. Painted once per look into the sprite cache.
 *
 * Readability first: every number stone keeps a light face and a large dark
 * ink numeral (only the gem tiers flip to a dark face with a cream numeral).
 * Value is told by three things at once, so it survives small screens and
 * colour blindness: the material (pebble → sandstone → bronze → silver →
 * gold → gem), the amount of ornament (none → carved runes → metal band and
 * rivets → filigree → facets) and the number itself.
 */
import { tileLevel, withAlpha } from '../theme';
import {
  numberFontRatio,
  roundRectPath,
  type AnyContext2D,
  type OverlayContext,
  type StatusOverlay,
  type TileArt,
} from '../tilePainter';
import type { TileKind } from '../../core';
import { blobPath, hatch, sealBadge, seeded, speckle, wobblyRoundRect } from './ink';
import {
  CRIMSON_LIGHT,
  EMBER,
  EMBER_HOT,
  FROST,
  FROST_LIGHT,
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  INK,
  MOSS,
  SOOT,
} from './palette';

type Ornament = 'plain' | 'runes' | 'band' | 'rivets' | 'filigree' | 'gem';

/** One step of the material ladder. */
export interface Material {
  readonly name: string;
  /** Face gradient, lit corner to shaded corner. */
  readonly light: string;
  readonly shade: string;
  /** Metal band / bezel colour (bands and up). */
  readonly rim: string;
  readonly ornament: Ornament;
  /** Numeral colour; gems use cream on a dark face. */
  readonly text: string;
  /** Speckle colour for stone faces (none for metal and gems). */
  readonly grain: string | null;
}

const STONE_TEXT = INK;
const GEM_TEXT = '#fff4dc';

/** The ladder for 2, 4, 8 … 2048; values past it cycle through the gem tiers. */
export const MATERIALS: readonly Material[] = [
  {
    name: 'pebble',
    light: '#efe9dd',
    shade: '#c8bdaa',
    rim: '#8b7f6c',
    ornament: 'plain',
    text: STONE_TEXT,
    grain: '#7a6d5a',
  },
  {
    name: 'sand pebble',
    light: '#f5e4c1',
    shade: '#d5b986',
    rim: '#9b7d4c',
    ornament: 'plain',
    text: STONE_TEXT,
    grain: '#8a6a3a',
  },
  {
    name: 'sandstone',
    light: '#f6d6ae',
    shade: '#dba673',
    rim: '#a8703c',
    ornament: 'runes',
    text: STONE_TEXT,
    grain: '#93582a',
  },
  {
    name: 'terracotta',
    light: '#f3bf9c',
    shade: '#d4825a',
    rim: '#9a4a28',
    ornament: 'runes',
    text: STONE_TEXT,
    grain: '#7e3a1c',
  },
  {
    name: 'bronze',
    light: '#f2dcb4',
    shade: '#cfa774',
    rim: '#a3662a',
    ornament: 'band',
    text: STONE_TEXT,
    grain: '#80592c',
  },
  {
    name: 'copper',
    light: '#f6d1b0',
    shade: '#d4946a',
    rim: '#9a4a22',
    ornament: 'rivets',
    text: STONE_TEXT,
    grain: '#7a3c1c',
  },
  {
    name: 'silver',
    light: '#f1f3f4',
    shade: '#bcc5cd',
    rim: '#76838f',
    ornament: 'rivets',
    text: STONE_TEXT,
    grain: null,
  },
  {
    name: 'moonsilver',
    light: '#e8eff8',
    shade: '#a9bfd8',
    rim: '#4f729c',
    ornament: 'rivets',
    text: STONE_TEXT,
    grain: null,
  },
  {
    name: 'gold',
    light: '#fdeeb7',
    shade: '#e3b54a',
    rim: '#a06d12',
    ornament: 'filigree',
    text: STONE_TEXT,
    grain: null,
  },
  {
    name: 'red gold',
    light: '#fbdc95',
    shade: '#dc9a2c',
    rim: '#8a4d0c',
    ornament: 'filigree',
    text: STONE_TEXT,
    grain: null,
  },
  {
    name: 'ember gem',
    light: '#b8402a',
    shade: '#6e1a12',
    rim: GOLD,
    ornament: 'gem',
    text: GEM_TEXT,
    grain: null,
  },
];

const GEMS: readonly Material[] = [
  {
    name: 'amethyst',
    light: '#7f52b3',
    shade: '#3f1f66',
    rim: GOLD,
    ornament: 'gem',
    text: GEM_TEXT,
    grain: null,
  },
  {
    name: 'sapphire',
    light: '#3a6fbd',
    shade: '#16336b',
    rim: GOLD,
    ornament: 'gem',
    text: GEM_TEXT,
    grain: null,
  },
  {
    name: 'emerald',
    light: '#2b7a4e',
    shade: '#11472c',
    rim: GOLD,
    ornament: 'gem',
    text: GEM_TEXT,
    grain: null,
  },
  {
    name: 'ember gem',
    light: '#b8402a',
    shade: '#6e1a12',
    rim: GOLD,
    ornament: 'gem',
    text: GEM_TEXT,
    grain: null,
  },
];

export function materialFor(value: number): Material {
  const level = tileLevel(value);
  return MATERIALS[level - 1] ?? (GEMS[(level - 1 - MATERIALS.length) % GEMS.length] as Material);
}

/** Invented rune strokes in a unit box (polylines). Purely decorative, no meaning. */
const RUNES: readonly (readonly (readonly [number, number])[])[][] = [
  [
    [
      [0.2, 0],
      [0.2, 1],
    ],
    [
      [0.2, 0.25],
      [0.8, 0.55],
    ],
  ],
  [
    [
      [0, 1],
      [0.5, 0],
      [1, 1],
    ],
    [
      [0.25, 0.55],
      [0.75, 0.55],
    ],
  ],
  [
    [
      [0.3, 0],
      [0.3, 1],
      [0.8, 0.7],
    ],
  ],
  [
    [
      [0, 0.2],
      [1, 0.2],
    ],
    [
      [0.5, 0.2],
      [0.5, 1],
    ],
    [
      [0.15, 0.7],
      [0.85, 0.7],
    ],
  ],
];

/** A rune cut into the stone: a dark groove with a lit lower lip. */
function engraveRune(
  ctx: AnyContext2D,
  rune: readonly (readonly (readonly [number, number])[])[],
  x: number,
  y: number,
  s: number,
  dark: string,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const stroke = (dx: number, dy: number, color: string, width: number): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const line of rune) {
      line.forEach(([px, py], i) => {
        const X = x + px * s + dx;
        const Y = y + py * s + dy;
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
    }
    ctx.stroke();
  };
  const w = Math.max(1, s * 0.16);
  stroke(0, w * 0.6, 'rgba(255, 250, 235, 0.55)', w);
  stroke(0, 0, dark, w);
  ctx.restore();
}

/** A small curl of gold wire (filigree) at a corner, pointing into the face. */
function filigree(
  ctx: AnyContext2D,
  x: number,
  y: number,
  s: number,
  sx: number,
  sy: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.quadraticCurveTo(0, 0, s, 0);
  ctx.moveTo(s * 0.35, s * 0.95);
  ctx.bezierCurveTo(s * 0.3, s * 0.45, s * 0.9, s * 0.4, s * 0.75, s * 0.75);
  ctx.moveTo(s * 0.95, s * 0.35);
  ctx.bezierCurveTo(s * 0.45, s * 0.3, s * 0.4, s * 0.9, s * 0.75, s * 0.75);
  ctx.stroke();
  ctx.restore();
}

/** A domed rivet. */
function rivet(ctx: AnyContext2D, x: number, y: number, r: number, metal: string): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, metal);
  g.addColorStop(1, INK);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

const EMPHASIS_GLOW = 14;

/** The face path of a stone, shared by the tile art and the overlays (stable per cell size). */
function stonePath(ctx: AnyContext2D, cx: number, cy: number, size: number, seed: number): void {
  const inset = size * 0.035;
  const s = size - inset * 2;
  wobblyRoundRect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.2, s * 0.012, seeded(seed), s * 0.08);
}

const runeStoneArt: TileArt = {
  margin: (look) => (look.emphasized ? EMPHASIS_GLOW + 2 : 6),
  paint(d) {
    const { ctx, cx, cy, cell, look, pixelRatio } = d;
    const m = materialFor(look.value);
    const level = tileLevel(look.value);
    const inset = cell * 0.035;
    const s = cell - inset * 2;
    const x = cx - s / 2;
    const y = cy - s / 2;
    const seed = 101 + level * 7;
    ctx.save();

    // Cast shadow on the board (soft, baked into the sprite).
    stonePath(ctx, cx + cell * 0.02, cy + cell * 0.045, cell, seed);
    ctx.fillStyle = 'rgba(26, 14, 4, 0.45)';
    ctx.shadowColor = 'rgba(26, 14, 4, 0.5)';
    ctx.shadowBlur = cell * 0.05 * pixelRatio;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Emphasis (merge pop): a warm gold halo behind the stone.
    if (look.emphasized) {
      stonePath(ctx, cx, cy, cell, seed);
      ctx.shadowColor = 'rgba(255, 196, 80, 0.95)';
      ctx.shadowBlur = EMPHASIS_GLOW * pixelRatio;
      ctx.fillStyle = GOLD_LIGHT;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Face.
    stonePath(ctx, cx, cy, cell, seed);
    const face = ctx.createLinearGradient(x, y, x + s * 0.7, y + s);
    face.addColorStop(0, m.light);
    face.addColorStop(1, m.shade);
    ctx.fillStyle = face;
    ctx.fill();

    ctx.save();
    ctx.clip();
    const rnd = seeded(seed * 3);
    if (m.grain) {
      speckle(ctx, rnd, x, y, s, s, Math.round(s * 0.9), [m.grain], [0.6, s * 0.03], [0.12, 0.3]);
      speckle(ctx, rnd, x, y, s, s, Math.round(s * 0.3), ['#ffffff'], [0.6, s * 0.025], [0.2, 0.4]);
    } else if (m.ornament !== 'gem') {
      // Brushed metal: faint diagonal streaks.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = Math.max(0.6, s * 0.01);
      hatch(ctx, x, y, s, s, s * 0.07, Math.PI * 0.82);
    }
    if (m.ornament === 'gem') paintFacets(ctx, cx, cy, s, m);
    ctx.restore();

    // Ornament grows with the value.
    const band = s * 0.085;
    if (m.ornament === 'runes') {
      const rs = s * 0.15;
      engraveRune(ctx, RUNES[level % RUNES.length] ?? [], x + s * 0.1, y + s * 0.1, rs, m.rim);
      engraveRune(
        ctx,
        RUNES[(level + 2) % RUNES.length] ?? [],
        x + s - s * 0.1 - rs,
        y + s - s * 0.1 - rs,
        rs,
        m.rim,
      );
    }
    if (m.ornament === 'band' || m.ornament === 'rivets' || m.ornament === 'filigree') {
      // A metal band set into the stone, just inside its edge.
      roundRectPath(ctx, x + band, y + band, s - band * 2, s - band * 2, s * 0.13);
      ctx.lineWidth = band * 0.62;
      ctx.strokeStyle = m.rim;
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, band * 0.16);
      ctx.strokeStyle = 'rgba(255, 248, 230, 0.6)';
      roundRectPath(
        ctx,
        x + band * 0.78,
        y + band * 0.78,
        s - band * 1.56,
        s - band * 1.56,
        s * 0.14,
      );
      ctx.stroke();
    }
    if (m.ornament === 'rivets' || m.ornament === 'filigree') {
      const k = band * 1.05;
      const r = s * 0.038;
      for (const [px, py] of [
        [x + k, y + k],
        [x + s - k, y + k],
        [x + k, y + s - k],
        [x + s - k, y + s - k],
      ] as const) {
        rivet(ctx, px, py, r, m.ornament === 'filigree' ? GOLD_LIGHT : m.rim);
      }
    }
    if (m.ornament === 'filigree') {
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = Math.max(0.9, s * 0.018);
      const f = s * 0.16;
      const k = band * 1.7;
      filigree(ctx, x + k, y + k, f, 1, 1);
      filigree(ctx, x + s - k, y + k, f, -1, 1);
      filigree(ctx, x + k, y + s - k, f, 1, -1);
      filigree(ctx, x + s - k, y + s - k, f, -1, -1);
      if (level >= 10) {
        // Red gold carries small ember studs on the band.
        for (const [px, py] of [
          [cx, y + band],
          [cx, y + s - band],
          [x + band, cy],
          [x + s - band, cy],
        ] as const) {
          rivet(ctx, px, py, s * 0.032, CRIMSON_LIGHT);
        }
      }
    }

    // Lit upper-left lip, then the ink outline that holds the shape.
    ctx.save();
    stonePath(ctx, cx, cy, cell, seed);
    ctx.clip();
    stonePath(ctx, cx + s * 0.03, cy + s * 0.04, cell, seed);
    ctx.lineWidth = s * 0.05;
    ctx.strokeStyle =
      m.ornament === 'gem' ? 'rgba(255, 220, 190, 0.45)' : 'rgba(255, 255, 255, 0.55)';
    ctx.stroke();
    ctx.restore();
    stonePath(ctx, cx, cy, cell, seed);
    ctx.lineWidth = Math.max(1.4, s * 0.035);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.stroke();

    // The numeral: large, ink-dark, cut into the face (lit lower lip).
    // Serif numerals are wider than the neon sans: shrink long numbers to fit inside the band.
    const label = String(look.value);
    let fontPx = cell * numberFontRatio(look.value) * 1.05;
    ctx.font = `800 ${fontPx}px ${d.theme.fontFamily}`;
    const room = s * (m.ornament === 'plain' || m.ornament === 'runes' ? 0.84 : 0.74);
    const width = ctx.measureText(label).width;
    if (width > room) {
      fontPx *= room / width;
      ctx.font = `800 ${fontPx}px ${d.theme.fontFamily}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ty = cy + fontPx * 0.05;
    if (m.ornament === 'gem') {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, fontPx * 0.16);
      ctx.strokeStyle = INK;
      ctx.strokeText(label, cx, ty);
      ctx.fillStyle = m.text;
      ctx.fillText(label, cx, ty);
    } else {
      ctx.fillStyle = 'rgba(255, 252, 240, 0.7)';
      ctx.fillText(label, cx, ty + Math.max(1, fontPx * 0.045));
      ctx.fillStyle = m.text;
      ctx.fillText(label, cx, ty);
    }
    ctx.restore();
  },
};

/** Gem tiers: a table facet, crown facets to the corners, and a glint. */
function paintFacets(ctx: AnyContext2D, cx: number, cy: number, s: number, m: Material): void {
  const t = s * 0.27;
  const o = s * 0.5;
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy - s * 0.05, 0, cx, cy, s * 0.6);
  glow.addColorStop(0, withAlpha(m.light, 1));
  glow.addColorStop(0.5, withAlpha(m.light, 0.35));
  glow.addColorStop(1, withAlpha(m.shade, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - o, cy - o, s, s);
  ctx.strokeStyle = 'rgba(255, 240, 220, 0.35)';
  ctx.lineWidth = Math.max(0.8, s * 0.014);
  ctx.beginPath();
  ctx.rect(cx - t, cy - t, t * 2, t * 2);
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    ctx.moveTo(cx + sx * t, cy + sy * t);
    ctx.lineTo(cx + sx * o, cy + sy * o);
  }
  ctx.moveTo(cx - t, cy);
  ctx.lineTo(cx - o, cy);
  ctx.moveTo(cx + t, cy);
  ctx.lineTo(cx + o, cy);
  ctx.moveTo(cx, cy - t);
  ctx.lineTo(cx, cy - o);
  ctx.moveTo(cx, cy + t);
  ctx.lineTo(cx, cy + o);
  ctx.stroke();
  // Gold bezel.
  roundRectPath(ctx, cx - o + s * 0.04, cy - o + s * 0.04, s - s * 0.08, s - s * 0.08, s * 0.17);
  ctx.lineWidth = s * 0.06;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, s * 0.015);
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.stroke();
  // Four-point glint, upper left.
  const gx = cx - s * 0.28;
  const gy = cy - s * 0.3;
  const g = s * 0.09;
  ctx.fillStyle = 'rgba(255, 255, 240, 0.9)';
  ctx.beginPath();
  ctx.moveTo(gx, gy - g);
  ctx.quadraticCurveTo(gx, gy, gx + g * 0.6, gy);
  ctx.quadraticCurveTo(gx, gy, gx, gy + g);
  ctx.quadraticCurveTo(gx, gy, gx - g * 0.6, gy);
  ctx.quadraticCurveTo(gx, gy, gx, gy - g);
  ctx.fill();
  ctx.restore();
}

/** Radii (fractions) of the boulder's lumpy outline, going round from the right. */
const BOULDER = [1, 0.93, 0.98, 1.02, 0.9, 0.97, 1.04, 0.95, 0.99, 1.03, 0.92, 0.97];

/** Boulder: a heavy, lumpy, hatched rock with moss and a crack; no number. */
const boulderArt: TileArt = {
  margin: () => 6,
  paint(d) {
    const { ctx, cx, cy, cell, pixelRatio } = d;
    const st = d.theme.stone;
    const r = cell * 0.47;
    ctx.save();
    blobPath(ctx, cx + cell * 0.025, cy + cell * 0.05, r, r * 0.95, BOULDER, 0.2);
    ctx.fillStyle = 'rgba(26, 14, 4, 0.5)';
    ctx.shadowColor = 'rgba(26, 14, 4, 0.5)';
    ctx.shadowBlur = cell * 0.05 * pixelRatio;
    ctx.fill();
    ctx.shadowBlur = 0;

    blobPath(ctx, cx, cy, r, r * 0.95, BOULDER, 0.2);
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
    g.addColorStop(0, '#b9ad99');
    g.addColorStop(0.55, st.fill);
    g.addColorStop(1, '#4f463c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Hatched shadow side.
    ctx.strokeStyle = 'rgba(43, 29, 16, 0.45)';
    ctx.lineWidth = Math.max(0.8, cell * 0.014);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + r * 0.55, cy + r * 0.55, r * 1.05, 0, Math.PI * 2);
    ctx.clip();
    hatch(ctx, cx - r, cy - r, r * 2, r * 2, cell * 0.055, -Math.PI / 4);
    ctx.restore();
    speckle(
      ctx,
      seeded(7),
      cx - r,
      cy - r,
      r * 2,
      r * 2,
      Math.round(cell * 0.8),
      ['#3d342b', '#d8cdb8'],
      [0.6, cell * 0.03],
      [0.2, 0.45],
    );
    // Moss on the top.
    ctx.fillStyle = MOSS;
    blobPath(
      ctx,
      cx - r * 0.25,
      cy - r * 0.86,
      r * 0.42,
      r * 0.2,
      [1, 0.8, 1.1, 0.9, 1, 0.85, 1.05, 0.95],
      0,
    );
    ctx.fill();
    ctx.fillStyle = '#93a64f';
    blobPath(ctx, cx - r * 0.32, cy - r * 0.9, r * 0.22, r * 0.09, [1, 0.8, 1.1, 0.9, 1, 0.85], 0);
    ctx.fill();
    ctx.restore();

    blobPath(ctx, cx, cy, r, r * 0.95, BOULDER, 0.2);
    ctx.lineWidth = Math.max(1.6, cell * 0.04);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.stroke();
    // A crack with a fork.
    ctx.lineWidth = Math.max(1.4, cell * 0.032);
    ctx.lineCap = 'round';
    ctx.strokeStyle = st.crack;
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.1, cy - r * 0.55);
    ctx.lineTo(cx - r * 0.08, cy - r * 0.12);
    ctx.lineTo(cx + r * 0.12, cy + r * 0.2);
    ctx.lineTo(cx - r * 0.02, cy + r * 0.62);
    ctx.moveTo(cx + r * 0.12, cy + r * 0.2);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.3);
    ctx.stroke();
    ctx.restore();
  },
};

/** Ember stone (merges with any number): a charred stone with glowing veins and a flame rune. */
const emberStoneArt: TileArt = {
  margin: () => 12,
  paint(d) {
    const { ctx, cx, cy, cell, pixelRatio } = d;
    const s = cell * 0.93;
    const x = cx - s / 2;
    const y = cy - s / 2;
    ctx.save();
    stonePath(ctx, cx + cell * 0.02, cy + cell * 0.045, cell, 999);
    ctx.fillStyle = 'rgba(26, 14, 4, 0.45)';
    ctx.fill();
    // Warm light spilling round the stone.
    stonePath(ctx, cx, cy, cell, 999);
    ctx.shadowColor = 'rgba(255, 140, 40, 0.9)';
    ctx.shadowBlur = 10 * pixelRatio;
    const g = ctx.createRadialGradient(cx, cy + s * 0.05, s * 0.05, cx, cy, s * 0.75);
    g.addColorStop(0, '#5a2c1a');
    g.addColorStop(1, SOOT);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.clip();
    speckle(
      ctx,
      seeded(31),
      x,
      y,
      s,
      s,
      Math.round(s * 0.5),
      ['#000000', '#5b4639'],
      [0.6, s * 0.03],
      [0.3, 0.6],
    );
    // Glowing veins.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const veins: readonly (readonly [number, number])[][] = [
      [
        [0.05, 0.3],
        [0.22, 0.36],
        [0.3, 0.52],
      ],
      [
        [0.95, 0.68],
        [0.78, 0.66],
        [0.7, 0.5],
      ],
      [
        [0.4, 0.98],
        [0.44, 0.8],
      ],
    ];
    for (const [color, width] of [
      [EMBER, s * 0.06],
      [EMBER_HOT, s * 0.025],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (const v of veins) {
        v.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(x + px * s, y + py * s);
          else ctx.lineTo(x + px * s, y + py * s);
        });
      }
      ctx.stroke();
    }
    ctx.restore();
    stonePath(ctx, cx, cy, cell, 999);
    ctx.lineWidth = Math.max(1.4, s * 0.035);
    ctx.strokeStyle = INK;
    ctx.stroke();
    // Flame rune in the middle, glowing.
    const f = s * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - f);
    ctx.bezierCurveTo(
      cx + f * 0.25,
      cy - f * 0.45,
      cx + f * 0.75,
      cy - f * 0.1,
      cx + f * 0.55,
      cy + f * 0.45,
    );
    ctx.bezierCurveTo(
      cx + f * 0.42,
      cy + f * 0.85,
      cx - f * 0.42,
      cy + f * 0.85,
      cx - f * 0.55,
      cy + f * 0.45,
    );
    ctx.bezierCurveTo(cx - f * 0.72, cy, cx - f * 0.3, cy - f * 0.2, cx - f * 0.15, cy - f * 0.55);
    ctx.bezierCurveTo(cx - f * 0.05, cy - f * 0.2, cx + f * 0.05, cy - f * 0.5, cx, cy - f);
    ctx.closePath();
    ctx.shadowColor = 'rgba(255, 170, 60, 1)';
    ctx.shadowBlur = 8 * pixelRatio;
    const fl = ctx.createLinearGradient(cx, cy - f, cx, cy + f);
    fl.addColorStop(0, EMBER_HOT);
    fl.addColorStop(1, EMBER);
    ctx.fillStyle = fl;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.strokeStyle = '#7a2a10';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy + f * 0.4, f * 0.2, f * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3c4';
    ctx.fill();
    ctx.restore();
  },
};

export const STORYBOOK_TILE_ART: Record<TileKind, TileArt> = {
  number: runeStoneArt,
  stone: boulderArt,
  prism: emberStoneArt,
};

/** Rime: jagged crystals along the top and left edges, a clump in the lower right corner. */
function rime(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const spikes = 7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= spikes; i++) {
    const t = i / spikes;
    const depth = (i % 2 === 0 ? 0.1 : 0.2) * (1 - t * 0.5);
    ctx.lineTo(x + s * t, y + s * (i % 2 === 0 ? 0.02 : depth));
  }
  ctx.lineTo(x + s, y);
  ctx.closePath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= spikes; i++) {
    const t = i / spikes;
    const depth = (i % 2 === 0 ? 0.1 : 0.2) * (1 - t * 0.5);
    ctx.lineTo(x + s * (i % 2 === 0 ? 0.02 : depth), y + s * t);
  }
  ctx.lineTo(x, y + s);
  ctx.closePath();
  ctx.moveTo(x + s, y + s);
  ctx.lineTo(x + s * 0.68, y + s);
  ctx.lineTo(x + s * 0.8, y + s * 0.9);
  ctx.lineTo(x + s * 0.83, y + s * 0.78);
  ctx.lineTo(x + s * 0.9, y + s * 0.84);
  ctx.lineTo(x + s, y + s * 0.68);
  ctx.closePath();
}

/** Frost: a pale frosted wash, rime crystals at the edges and a blue seal with the turns left. */
const frostOverlay: StatusOverlay = (d: OverlayContext) => {
  const turns = d.frame.status.frozenTurns;
  if (turns <= 0) return;
  const { ctx, cx, cy, size } = d;
  const inset = size * 0.035;
  const s = size - inset * 2;
  const x = cx - s / 2;
  const y = cy - s / 2;
  ctx.save();
  roundRectPath(ctx, x, y, s, s, s * 0.2);
  ctx.fillStyle = 'rgba(214, 240, 252, 0.38)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.strokeStyle = FROST;
  ctx.stroke();
  ctx.clip();
  rime(ctx, x, y, s);
  ctx.fillStyle = FROST_LIGHT;
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, s * 0.014);
  ctx.strokeStyle = FROST;
  ctx.stroke();
  ctx.restore();
  const r = size * 0.16;
  sealBadge(
    ctx,
    x + s - r * 0.75,
    y + r * 0.75,
    r,
    FROST,
    FROST_LIGHT,
    String(turns),
    '#ffffff',
    d.theme.fontFamily,
  );
};

/** Soot: charred, smoky edges (an inner burn) and a dark seal with ½. */
const sootOverlay: StatusOverlay = (d: OverlayContext) => {
  if (!d.frame.status.cursed) return;
  const { ctx, cx, cy, size } = d;
  const inset = size * 0.035;
  const s = size - inset * 2;
  const x = cx - s / 2;
  const y = cy - s / 2;
  ctx.save();
  roundRectPath(ctx, x, y, s, s, s * 0.2);
  ctx.clip();
  // Burn creeping in from the edge: wide dark strokes, fading inwards.
  for (const [w, a] of [
    [s * 0.36, 0.22],
    [s * 0.22, 0.35],
    [s * 0.1, 0.6],
  ] as const) {
    roundRectPath(ctx, x, y, s, s, s * 0.2);
    ctx.lineWidth = w;
    ctx.strokeStyle = `rgba(36, 26, 23, ${a})`;
    ctx.stroke();
  }
  // Smudges.
  ctx.fillStyle = 'rgba(36, 26, 23, 0.55)';
  blobPath(ctx, x + s * 0.86, y + s * 0.12, s * 0.2, s * 0.13, [1, 0.8, 1.1, 0.9, 1, 0.85], 0.4);
  ctx.fill();
  blobPath(ctx, x + s * 0.15, y + s * 0.9, s * 0.2, s * 0.12, [1, 0.9, 1.1, 0.8, 1, 0.9], 0.1);
  ctx.fill();
  ctx.restore();
  const r = size * 0.16;
  sealBadge(
    ctx,
    x + r * 0.75,
    y + s - r * 0.75,
    r,
    SOOT,
    EMBER,
    '½',
    EMBER_HOT,
    d.theme.fontFamily,
  );
};

export const STORYBOOK_OVERLAYS: readonly StatusOverlay[] = [frostOverlay, sootOverlay];
