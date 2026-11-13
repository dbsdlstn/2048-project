/**
 * Storybook tile art in the illuminated-manuscript style: numbered tiles,
 * the boulder, the ember stone, and the frost / brand overlays. Painted once
 * per look into the sprite cache.
 *
 * Readability first: every numeral is large and has at least 4.5:1 contrast
 * against both ends of its ground (a test checks it). Value is told by three
 * things at once, so it survives small screens and colour blindness: the
 * ground (vellum → pale wash → deep pigment → gold → jewelled), the frame
 * (ink rule → painted band → gold leaf → gold with gems) and the numeral
 * itself (ink → coloured → gilded capital).
 */
import { tileLevel } from '../theme';
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
  EMBER,
  EMBER_HOT,
  FROST,
  FROST_LIGHT,
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  INK,
  LAPIS,
  LAPIS_DEEP,
  LAPIS_LIGHT,
  MOSS,
  PARCHMENT_LIGHT,
  SOOT,
  VERDIGRIS,
  VERMILION,
  VERMILION_DEEP,
} from './palette';

type Frame = 'rule' | 'double' | 'band' | 'gold' | 'jewel';
type Ornament = 'none' | 'penwork' | 'filigree' | 'pearls' | 'diaper';

/** One step of the illumination ladder. */
export interface Material {
  readonly name: string;
  /** Ground gradient, lit corner to shaded corner. */
  readonly light: string;
  readonly shade: string;
  readonly frame: Frame;
  /** Colour of rules / bands (gold frames use the gold-leaf gradient). */
  readonly frameColor: string;
  readonly ornament: Ornament;
  /** Numeral colour, and the dark end of its gradient (gilded numerals are graded). */
  readonly text: string;
  readonly textDeep: string;
  /** Gilded capital: gold numeral with an ink outline on a deep ground. */
  readonly gilded: boolean;
}

const LIGHT_VELLUM = PARCHMENT_LIGHT;
const NUM_GOLD = '#fbe9a6';
const NUM_GOLD_DEEP = '#f0cd68';

const tier = (
  name: string,
  light: string,
  shade: string,
  frame: Frame,
  frameColor: string,
  ornament: Ornament,
  text: string,
  textDeep = text,
): Material => ({
  name,
  light,
  shade,
  frame,
  frameColor,
  ornament,
  text,
  textDeep,
  gilded: text === NUM_GOLD,
});

/**
 * The ladder for 2, 4, 8 … 2048, then jewelled tiers cycle. Plain ink on
 * vellum → coloured numerals → coloured grounds with painted frames → gilded
 * capitals on deep pigment grounds in gold frames → a burnished gold tile →
 * jewelled grounds with a gold diaper pattern.
 */
export const MATERIALS: readonly Material[] = [
  tier('vellum, ink', LIGHT_VELLUM, '#ead5a8', 'rule', INK, 'none', INK),
  tier('vellum, rubric', LIGHT_VELLUM, '#ead5a8', 'rule', VERMILION, 'none', '#a52a14'),
  tier('vellum, lapis', LIGHT_VELLUM, '#e9d3a4', 'double', LAPIS, 'penwork', '#22408f'),
  tier('verdigris wash', '#e1eedd', '#bcd8c2', 'band', VERDIGRIS, 'none', INK),
  tier('lapis wash', '#e2e9f7', '#bccbec', 'band', LAPIS, 'penwork', LAPIS_DEEP),
  tier('rose wash', '#f8dfd3', '#ebbca9', 'band', VERMILION, 'penwork', VERMILION_DEEP),
  tier('verdigris, gilded', '#1f5c46', '#123a2c', 'gold', GOLD, 'none', NUM_GOLD, NUM_GOLD_DEEP),
  tier('lapis, gilded', '#26479c', '#172d6b', 'gold', GOLD, 'pearls', NUM_GOLD, NUM_GOLD_DEEP),
  tier(
    'vermilion, gilded',
    '#a52e16',
    '#6e1a0b',
    'gold',
    GOLD,
    'filigree',
    NUM_GOLD,
    NUM_GOLD_DEEP,
  ),
  tier('tyrian, gilded', '#5e2f80', '#381a4f', 'gold', GOLD, 'filigree', NUM_GOLD, NUM_GOLD_DEEP),
  tier('burnished gold', GOLD_LIGHT, GOLD, 'jewel', GOLD_DARK, 'diaper', LAPIS_DEEP),
];

const JEWELLED: readonly Material[] = [
  tier('jewelled lapis', '#26479c', '#132558', 'jewel', GOLD, 'diaper', NUM_GOLD, NUM_GOLD_DEEP),
  tier(
    'jewelled vermilion',
    '#a52e16',
    '#5e1509',
    'jewel',
    GOLD,
    'diaper',
    NUM_GOLD,
    NUM_GOLD_DEEP,
  ),
  tier(
    'jewelled verdigris',
    '#1f5c46',
    '#0f3326',
    'jewel',
    GOLD,
    'diaper',
    NUM_GOLD,
    NUM_GOLD_DEEP,
  ),
  tier('jewelled tyrian', '#5e2f80', '#2e1442', 'jewel', GOLD, 'diaper', NUM_GOLD, NUM_GOLD_DEEP),
];

export function materialFor(value: number): Material {
  const level = tileLevel(value);
  return (
    MATERIALS[level - 1] ?? (JEWELLED[(level - 1 - MATERIALS.length) % JEWELLED.length] as Material)
  );
}

/** A small pen-flourish curl (penwork) or gold wire (filigree) at a corner, pointing inwards. */
function curl(ctx: AnyContext2D, x: number, y: number, s: number, sx: number, sy: number): void {
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

/** A domed stud: a pearl, a gem or a rivet. */
function stud(ctx: AnyContext2D, x: number, y: number, r: number, color: string): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, color);
  g.addColorStop(1, INK);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

/** A burnished gold-leaf gradient across a square: bright band, body, shadow. */
export function goldLeaf(ctx: AnyContext2D, x: number, y: number, s: number): CanvasGradient {
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, GOLD_LIGHT);
  g.addColorStop(0.35, GOLD);
  g.addColorStop(0.5, '#fff0b8');
  g.addColorStop(0.65, GOLD);
  g.addColorStop(1, GOLD_DARK);
  return g;
}

const EMPHASIS_GLOW = 14;

/** The face path of a tile, shared by the art and the overlays. */
function tilePath(ctx: AnyContext2D, cx: number, cy: number, size: number, seed: number): void {
  const inset = size * 0.035;
  const s = size - inset * 2;
  wobblyRoundRect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.1, s * 0.006, seeded(seed), s * 0.1);
}

const illuminatedArt: TileArt = {
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
    ctx.lineJoin = 'round';

    // Cast shadow on the board.
    tilePath(ctx, cx + cell * 0.02, cy + cell * 0.045, cell, seed);
    ctx.fillStyle = 'rgba(10, 8, 30, 0.5)';
    ctx.shadowColor = 'rgba(10, 8, 30, 0.5)';
    ctx.shadowBlur = cell * 0.05 * pixelRatio;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (look.emphasized) {
      tilePath(ctx, cx, cy, cell, seed);
      ctx.shadowColor = 'rgba(255, 214, 110, 0.95)';
      ctx.shadowBlur = EMPHASIS_GLOW * pixelRatio;
      ctx.fillStyle = GOLD_LIGHT;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Ground.
    tilePath(ctx, cx, cy, cell, seed);
    const ground = ctx.createLinearGradient(x, y, x + s * 0.7, y + s);
    ground.addColorStop(0, m.light);
    ground.addColorStop(1, m.shade);
    ctx.fillStyle = ground;
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (!m.gilded && m.frame !== 'jewel') {
      // Vellum grain.
      speckle(
        ctx,
        seeded(seed * 3),
        x,
        y,
        s,
        s,
        Math.round(s * 0.6),
        ['#8a6a3e', '#ffffff'],
        [0.5, s * 0.022],
        [0.08, 0.22],
      );
    }
    if (m.ornament === 'diaper')
      diaper(
        ctx,
        x,
        y,
        s,
        m.frame === 'jewel' && !m.gilded ? 'rgba(138, 97, 20, 0.35)' : 'rgba(246, 219, 126, 0.28)',
      );
    ctx.restore();

    // Frame grows with the value.
    const k = s * 0.075;
    if (m.frame === 'rule' || m.frame === 'double') {
      ctx.strokeStyle = m.frameColor;
      ctx.lineWidth = Math.max(0.8, s * 0.018);
      roundRectPath(ctx, x + k, y + k, s - k * 2, s - k * 2, s * 0.05);
      ctx.stroke();
      if (m.frame === 'double') {
        roundRectPath(ctx, x + k * 1.6, y + k * 1.6, s - k * 3.2, s - k * 3.2, s * 0.04);
        ctx.stroke();
      }
    } else if (m.frame === 'band') {
      roundRectPath(ctx, x + k, y + k, s - k * 2, s - k * 2, s * 0.06);
      ctx.lineWidth = s * 0.06;
      ctx.strokeStyle = m.frameColor;
      ctx.stroke();
      // White penwork dots along the band.
      ctx.fillStyle = 'rgba(255, 252, 240, 0.9)';
      const n = 6;
      for (let i = 0; i <= n; i++) {
        const t = k + ((s - k * 2) * i) / n;
        for (const [px, py] of [
          [x + t, y + k],
          [x + t, y + s - k],
          [x + k, y + t],
          [x + s - k, y + t],
        ] as const) {
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.6, s * 0.011), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Gold-leaf frame (gold and jewel tiers).
      roundRectPath(ctx, x + k, y + k, s - k * 2, s - k * 2, s * 0.06);
      ctx.lineWidth = s * (m.frame === 'jewel' ? 0.085 : 0.065);
      ctx.strokeStyle = m.gilded || m.frame === 'gold' ? goldLeaf(ctx, x, y, s) : m.frameColor;
      ctx.stroke();
      ctx.lineWidth = Math.max(0.7, s * 0.012);
      ctx.strokeStyle = INK;
      roundRectPath(ctx, x + k * 1.5, y + k * 1.5, s - k * 3, s - k * 3, s * 0.05);
      ctx.stroke();
    }

    if (m.ornament === 'penwork') {
      ctx.strokeStyle = m.frameColor === LAPIS ? VERMILION : LAPIS;
      ctx.lineWidth = Math.max(0.8, s * 0.016);
      const f = s * 0.13;
      const j = k * 2.1;
      curl(ctx, x + j, y + j, f, 1, 1);
      curl(ctx, x + s - j, y + s - j, f, -1, -1);
    }
    if (m.ornament === 'filigree') {
      ctx.strokeStyle = GOLD_LIGHT;
      ctx.lineWidth = Math.max(0.9, s * 0.018);
      const f = s * 0.15;
      const j = k * 2.2;
      curl(ctx, x + j, y + j, f, 1, 1);
      curl(ctx, x + s - j, y + j, f, -1, 1);
      curl(ctx, x + j, y + s - j, f, 1, -1);
      curl(ctx, x + s - j, y + s - j, f, -1, -1);
      if (level >= 10) {
        for (const [px, py] of [
          [cx, y + k],
          [cx, y + s - k],
          [x + k, cy],
          [x + s - k, cy],
        ] as const) {
          stud(ctx, px, py, s * 0.032, '#fff8ea');
        }
      }
    }
    if (m.ornament === 'pearls') {
      for (const [px, py] of [
        [x + k, y + k],
        [x + s - k, y + k],
        [x + k, y + s - k],
        [x + s - k, y + s - k],
      ] as const) {
        stud(ctx, px, py, s * 0.034, '#fff8ea');
      }
    }
    if (m.frame === 'jewel') {
      const gems = [VERMILION, LAPIS_LIGHT, VERDIGRIS, VERMILION];
      [
        [x + k, y + k],
        [x + s - k, y + k],
        [x + s - k, y + s - k],
        [x + k, y + s - k],
      ].forEach(([px, py], i) => {
        stud(ctx, px ?? 0, py ?? 0, s * 0.05, gems[i] ?? VERMILION);
      });
      for (const [px, py] of [
        [cx, y + k],
        [cx, y + s - k],
        [x + k, cy],
        [x + s - k, cy],
      ] as const) {
        stud(ctx, px, py, s * 0.03, '#fff8ea');
      }
    }

    // Ink outline that holds the tile.
    tilePath(ctx, cx, cy, cell, seed);
    ctx.lineWidth = Math.max(1.4, s * 0.032);
    ctx.strokeStyle = INK;
    ctx.stroke();

    // The numeral: a painted or gilded capital, always large.
    const label = String(look.value);
    let fontPx = cell * numberFontRatio(look.value) * 1.08;
    ctx.font = `800 ${fontPx}px ${d.theme.fontFamily}`;
    const room = s * (m.frame === 'rule' ? 0.84 : 0.72);
    const width = ctx.measureText(label).width;
    if (width > room) {
      fontPx *= room / width;
      ctx.font = `800 ${fontPx}px ${d.theme.fontFamily}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ty = cy + fontPx * 0.05;
    if (m.gilded) {
      ctx.lineWidth = Math.max(2, fontPx * 0.15);
      ctx.strokeStyle = INK;
      ctx.strokeText(label, cx, ty);
      const g = ctx.createLinearGradient(cx, ty - fontPx / 2, cx, ty + fontPx / 2);
      g.addColorStop(0, m.text);
      g.addColorStop(1, m.textDeep);
      ctx.fillStyle = g;
      ctx.fillText(label, cx, ty);
    } else {
      ctx.fillStyle =
        m.frame === 'jewel' ? 'rgba(255, 246, 210, 0.75)' : 'rgba(255, 252, 240, 0.75)';
      ctx.fillText(label, cx, ty + Math.max(1, fontPx * 0.045));
      ctx.fillStyle = m.text;
      ctx.fillText(label, cx, ty);
    }
    ctx.restore();
  },
};

/** A gold diaper: a lattice of small diamonds with dots, the classic patterned ground. */
function diaper(ctx: AnyContext2D, x: number, y: number, s: number, color: string): void {
  const step = s / 6;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(0.6, s * 0.01);
  ctx.beginPath();
  for (let i = -6; i <= 12; i++) {
    ctx.moveTo(x + i * step, y);
    ctx.lineTo(x + i * step + s, y + s);
    ctx.moveTo(x + i * step + s, y);
    ctx.lineTo(x + i * step, y + s);
  }
  ctx.stroke();
  for (let r = 0; r <= 6; r++) {
    for (let c = 0; c <= 6; c++) {
      ctx.beginPath();
      ctx.arc(x + c * step, y + r * step + step / 2, s * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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
    tilePath(ctx, cx + cell * 0.02, cy + cell * 0.045, cell, 999);
    ctx.fillStyle = 'rgba(26, 14, 4, 0.45)';
    ctx.fill();
    // Warm light spilling round the stone.
    tilePath(ctx, cx, cy, cell, 999);
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
    tilePath(ctx, cx, cy, cell, 999);
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
  number: illuminatedArt,
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
  ctx.fillStyle = 'rgba(214, 236, 252, 0.42)';
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

/**
 * Curse: a brand. A ring of dark iron thorns pointing into the tile and a
 * smouldering vermilion line under them, plus a black seal with ½. It frames
 * the numeral instead of covering it, and reads as a mark put on the tile.
 */
const brandOverlay: StatusOverlay = (d: OverlayContext) => {
  if (!d.frame.status.cursed) return;
  const { ctx, cx, cy, size } = d;
  const inset = size * 0.035;
  const s = size - inset * 2;
  const x = cx - s / 2;
  const y = cy - s / 2;
  const k = s * 0.07;
  ctx.save();
  ctx.lineJoin = 'round';
  // Smouldering line just inside the frame.
  roundRectPath(ctx, x + k, y + k, s - k * 2, s - k * 2, s * 0.06);
  ctx.lineWidth = s * 0.05;
  ctx.strokeStyle = 'rgba(196, 56, 28, 0.55)';
  ctx.stroke();
  // Thorns along the four edges, pointing inwards.
  const n = 5;
  const len = s * 0.11;
  ctx.beginPath();
  const edge = (x0: number, y0: number, dx: number, dy: number, nx: number, ny: number): void => {
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.15) / n;
      const t1 = (i + 0.85) / n;
      const tm = (i + 0.5) / n;
      ctx.moveTo(x0 + dx * t0, y0 + dy * t0);
      ctx.lineTo(x0 + dx * tm + nx * len, y0 + dy * tm + ny * len);
      ctx.lineTo(x0 + dx * t1, y0 + dy * t1);
    }
  };
  edge(x + k * 0.6, y + k * 0.6, s - k * 1.2, 0, 0, 1);
  edge(x + k * 0.6, y + s - k * 0.6, s - k * 1.2, 0, 0, -1);
  edge(x + k * 0.6, y + k * 0.6, 0, s - k * 1.2, 1, 0);
  edge(x + s - k * 0.6, y + k * 0.6, 0, s - k * 1.2, -1, 0);
  ctx.fillStyle = SOOT;
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, s * 0.012);
  ctx.strokeStyle = VERMILION_DEEP;
  ctx.stroke();
  // Iron rim.
  roundRectPath(ctx, x + k * 0.6, y + k * 0.6, s - k * 1.2, s - k * 1.2, s * 0.07);
  ctx.lineWidth = s * 0.045;
  ctx.strokeStyle = SOOT;
  ctx.stroke();
  ctx.restore();
  const r = size * 0.16;
  sealBadge(
    ctx,
    x + r * 0.75,
    y + s - r * 0.75,
    r,
    SOOT,
    VERMILION,
    '½',
    EMBER_HOT,
    d.theme.fontFamily,
  );
};

export const STORYBOOK_OVERLAYS: readonly StatusOverlay[] = [frostOverlay, brandOverlay];
