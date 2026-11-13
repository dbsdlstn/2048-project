/**
 * Vector emblems (crests, figures, relic pictures) as layered SVG path data
 * in a 100 × 100 box. The same data is drawn on the canvas (`Path2D`, for the
 * board frame) and as inline SVG (`emblemSvg`, for DOM cards and the journey
 * map), so one picture never has two diverging versions.
 *
 * Layering: each emblem is a list of flat shapes painted back to front —
 * ground, body, detail, highlight — each with an ink outline. Flat fills plus
 * ink lines plus one highlight colour is what makes simple shapes read as
 * "illustration" rather than "icon".
 */
import type { RaceId } from '../scenery';
import {
  CRIMSON,
  EMBER,
  EMBER_HOT,
  FROST,
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  INK,
  IRON,
  PARCHMENT,
  PARCHMENT_LIGHT,
  RACE_COLORS,
} from './palette';

export interface Layer {
  readonly d: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly width?: number;
  readonly opacity?: number;
}

export type Emblem = readonly Layer[];

const SHIELD = 'M14 10 H86 V46 C86 70 70 86 50 95 C30 86 14 70 14 46 Z';
const SHIELD_INNER = 'M21 17 H79 V46 C79 65 66 78 50 87 C34 78 21 65 21 46 Z';

/** A race crest: the dwarves' is finished; the others are neutral placeholders until stage C. */
export function crest(race: RaceId): Emblem {
  const c = RACE_COLORS[race];
  const base: Layer[] = [
    { d: SHIELD, fill: c.field, stroke: INK, width: 5 },
    { d: SHIELD_INNER, stroke: GOLD_LIGHT, width: 2.5 },
  ];
  if (race === 'dwarf') {
    return [
      ...base,
      // Mountain with a snow cap.
      { d: 'M25 58 L38 35 L45 45 L55 25 L75 58 Z', fill: GOLD_LIGHT, stroke: INK, width: 3 },
      { d: 'M50 34 L55 25 L60 34 L57 32 L55 36 L52 32 Z', fill: PARCHMENT_LIGHT },
      // Anvil.
      {
        d: 'M31 62 H69 C69 67 63 69 58 69 V73 H65 V79 H35 V73 H42 V69 C35 69 31 66 31 62 Z',
        fill: '#3b3532',
        stroke: INK,
        width: 2.5,
      },
      { d: 'M33 63 H67', stroke: '#8e8780', width: 1.5 },
    ];
  }
  // Placeholder: a plain band across the field.
  return [...base, { d: 'M21 40 H79 V54 H21 Z', fill: c.charge, opacity: 0.85 }];
}

const BEARD = '#a4532a';
const BEARD_DARK = '#6e3218';
const TUNIC = '#7e2618';
const HELM = '#8d8780';
const SKIN = '#d9a27a';
const LEATHER = '#4a3020';

/**
 * The dwarf companion: iron helm, a great auburn beard, crimson tunic, stout
 * legs, an axe on the shoulder. A few flat colours under ink lines read as a
 * figure; a single dark fill at this size read as a blob.
 */
export const DWARF_FIGURE: Emblem = [
  // Axe behind the arm.
  { d: 'M75 72 L85.5 17 L89.5 17.8 L79 72.8 Z', fill: '#9a6534', stroke: INK, width: 2.2 },
  {
    d: 'M84 11 C74 11 70 21 72.5 31 L86 26.5 Z M88.5 13 C97.5 14.5 100 26 95.5 33 L86.5 27.5 Z',
    fill: '#b7b0a6',
    stroke: INK,
    width: 2.2,
  },
  // Legs and boots.
  { d: 'M30 72 H47 L46 89 H31 Z M53 72 H70 L69 89 H54 Z', fill: LEATHER, stroke: INK, width: 2.2 },
  {
    d: 'M26.5 87 H48 V96 H22.5 C22.5 91.5 24 88.5 26.5 87 Z M52 87 H73.5 C76 88.5 77.5 91.5 77.5 96 H52 Z',
    fill: '#2b1d10',
    stroke: INK,
    width: 2,
  },
  // Body and arms.
  {
    d: 'M25 38 C29 33 37 31 44 31 H56 C63 31 71 33 75 38 L81 64 C81 70 77 73 72 73 H28 C23 73 19 70 19 64 Z',
    fill: TUNIC,
    stroke: INK,
    width: 2.5,
  },
  {
    d: 'M20 62 C20 58 26 57 27 61 C28 66 21 67 20 62 Z M73 60 C73 56 79 55 80 59 C81 64 74 65 73 60 Z',
    fill: SKIN,
    stroke: INK,
    width: 1.6,
  },
  // Belt.
  { d: 'M24 60 H76 V67 H24 Z', fill: LEATHER, stroke: INK, width: 1.6 },
  { d: 'M45 58.5 H55 V68.5 H45 Z', fill: GOLD, stroke: INK, width: 1.6 },
  // Face behind the beard: just a nose and cheeks.
  { d: 'M38 26 H62 V34 H38 Z', fill: SKIN },
  // Beard, with a few strands.
  {
    d: 'M33.5 27 C38 31 44 31 50 30 C56 31 62 31 66.5 27 C69 40 65 55 50 66 C35 55 31 40 33.5 27 Z',
    fill: BEARD,
    stroke: INK,
    width: 2.5,
  },
  {
    d: 'M42 36 C42 44 45 52 49 58 M50 36 V60 M58 36 C58 44 55 52 51 58',
    stroke: BEARD_DARK,
    width: 1.6,
  },
  { d: 'M46.5 26 C46.5 32 53.5 32 53.5 26 Z', fill: '#c98560', stroke: INK, width: 1.4 },
  // Helm.
  { d: 'M35.5 25 C35.5 9 64.5 9 64.5 25 Z', fill: HELM, stroke: INK, width: 2.5 },
  { d: 'M40 15 C43 11.5 47 10.5 50 10.5', stroke: '#e6e1d8', width: 2 },
  { d: 'M33 23 H67 V27.5 H33 Z', fill: GOLD, stroke: INK, width: 1.8 },
  {
    d: 'M50 3.5 C52.5 3.5 54 5 54 7.5 C54 10 52 11 50 11 C48 11 46 10 46 7.5 C46 5 47.5 3.5 50 3.5 Z',
    fill: GOLD,
    stroke: INK,
    width: 1.6,
  },
];

/** A soldier of the rallied host: the companion's colours, simpler, with a spear or a hammer. */
export function dwarfTrooper(tool: 'spear' | 'hammer', tunic: string = TUNIC): Emblem {
  const toolLayers: Layer[] =
    tool === 'spear'
      ? [
          { d: 'M77 96 L80 6 L83.5 6 L80.5 96 Z', fill: '#9a6534', stroke: INK, width: 2 },
          { d: 'M81.5 -2 L87 12 L76.5 12 Z', fill: '#b7b0a6', stroke: INK, width: 2 },
          { d: 'M83 14 H98 L93 19 L98 24 H83 Z', fill: GOLD, stroke: INK, width: 1.6 },
        ]
      : [
          { d: 'M77 92 L79 26 L82.5 26 L80.5 92 Z', fill: '#9a6534', stroke: INK, width: 2 },
          { d: 'M69 13 H93 V28 H69 Z', fill: '#8d8780', stroke: INK, width: 2 },
        ];
  return [
    ...toolLayers,
    { d: 'M29 73 H47 V96 H25 Z M53 73 H71 L75 96 H53 Z', fill: LEATHER, stroke: INK, width: 2 },
    {
      d: 'M24 40 C28 34 37 32 44 32 H56 C63 32 72 34 76 40 L80 67 C80 72 76 74 72 74 H28 C24 74 20 72 20 67 Z',
      fill: tunic,
      stroke: INK,
      width: 2.4,
    },
    {
      d: 'M33.5 27 C38 31 62 31 66.5 27 C69 40 65 55 50 66 C35 55 31 40 33.5 27 Z',
      fill: BEARD,
      stroke: INK,
      width: 2.4,
    },
    { d: 'M35 26 C35 10 65 10 65 26 Z', fill: HELM, stroke: INK, width: 2.4 },
    { d: 'M33 24 H67 V28.5 H33 Z', fill: GOLD, stroke: INK, width: 1.6 },
  ];
}

// ------------------------------------------------------------------ relics

/** Roundel behind a relic picture: parchment and a gold ring; evolved: dark field, double ring, rays. */
function roundel(evolved: boolean): Layer[] {
  if (!evolved) {
    return [
      { d: circle(50, 50, 46), fill: PARCHMENT, stroke: INK, width: 3 },
      { d: circle(50, 50, 41), stroke: GOLD, width: 2.5 },
    ];
  }
  const rays: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const b = a + Math.PI / 32;
    const c = a - Math.PI / 32;
    rays.push(
      `M${f(50 + Math.cos(c) * 18)} ${f(50 + Math.sin(c) * 18)} L${f(50 + Math.cos(a) * 44)} ${f(50 + Math.sin(a) * 44)} L${f(50 + Math.cos(b) * 18)} ${f(50 + Math.sin(b) * 18)} Z`,
    );
  }
  return [
    { d: circle(50, 50, 47), fill: '#3d1d14', stroke: INK, width: 3 },
    { d: rays.join(' '), fill: GOLD, opacity: 0.35 },
    { d: circle(50, 50, 43), stroke: GOLD_LIGHT, width: 2.5 },
    { d: circle(50, 50, 39), stroke: GOLD, width: 1.5 },
  ];
}

const WOOD_FILL = '#9a6534';
const IRON_LIGHT = '#a7a29b';

const PICK_HEAD = 'M48 16 Q88 16 92 60 Q79 30 48 16 Z';

const PICKAXE: Emblem = [
  { d: 'M22 85 L67 40 L73 46 L28 91 Z', fill: WOOD_FILL, stroke: INK, width: 2.5 },
  { d: 'M25 86 L68 43', stroke: '#c48d55', width: 1.2 },
  { d: PICK_HEAD, fill: IRON, stroke: INK, width: 2.5 },
  { d: 'M53 18 Q83 19 88 52', stroke: IRON_LIGHT, width: 1.8 },
  // Socket binding the head to the handle.
  { d: 'M62 37 L70 29 L78 37 L70 45 Z', fill: '#4a4540', stroke: INK, width: 2 },
];

const PICKAXE_EVOLVED: Emblem = [
  ...PICKAXE.slice(0, 2),
  { d: 'M45 13 Q91 12 95 64 Q80 29 45 13 Z', fill: '#9a968f', stroke: INK, width: 2.5 },
  { d: 'M50 15 Q87 16 91 58', stroke: GOLD_LIGHT, width: 2.4 },
  { d: 'M61 37 L70 28 L79 37 L70 46 Z', fill: GOLD, stroke: INK, width: 2 },
  // A frost-blue rune gem in the socket.
  { d: 'M70 31.5 L75.5 37 L70 42.5 L64.5 37 Z', fill: FROST, stroke: INK, width: 1.6 },
  { d: 'M70 33.5 L72.5 37 L70 40.5', stroke: '#dff2fb', width: 1.2 },
  // Gold bands on the handle and chips flying off.
  { d: 'M36 72 L42 78 M44 64 L50 70', stroke: GOLD, width: 3 },
  {
    d: 'M16 36 L23 33 L22 41 Z M28 22 L34 23 L31 29 Z M86 78 L92 76 L90 83 Z',
    fill: '#c9bfae',
    stroke: INK,
    width: 1.2,
  },
];

const BELLOWS: Emblem = [
  // Handles.
  {
    d: 'M8 38 L24 42 L23 47 L7 44 Z M8 62 L23 56 L24 61 L9 67 Z',
    fill: WOOD_FILL,
    stroke: INK,
    width: 2,
  },
  // Leather body between two boards.
  {
    d: 'M22 50 C22 34 38 26 56 30 L78 46 V54 L56 70 C38 74 22 66 22 50 Z',
    fill: '#a8743f',
    stroke: INK,
    width: 2.5,
  },
  {
    d: 'M30 40 C40 46 40 54 30 60 M40 35 C50 44 50 56 40 65 M50 32 C60 42 60 58 50 68',
    stroke: '#6b4520',
    width: 1.6,
  },
  // Nozzle.
  { d: 'M77 45 H90 L92 48 V52 L90 55 H77 Z', fill: IRON, stroke: INK, width: 2 },
  // Pebbles fed in.
  {
    d: 'M14 78 C14 74 20 73 22 76 C24 80 18 83 14 78 Z M27 82 C28 78 34 78 34 82 C34 86 28 86 27 82 Z',
    fill: '#bdb3a2',
    stroke: INK,
    width: 1.5,
  },
];

const BELLOWS_EVOLVED: Emblem = [
  ...BELLOWS.slice(0, 3),
  { d: 'M24 48 C24 36 36 29 52 31', stroke: GOLD_LIGHT, width: 2 },
  {
    d: 'M8 38 L24 42 L23 47 L7 44 Z M8 62 L23 56 L24 61 L9 67 Z',
    fill: GOLD,
    stroke: INK,
    width: 2,
  },
  { d: 'M77 45 H90 L92 48 V52 L90 55 H77 Z', fill: GOLD, stroke: INK, width: 2 },
  // A roaring tongue of flame from the nozzle.
  {
    d: 'M90 50 C96 42 92 34 98 28 C98 38 102 44 96 52 C100 54 99 62 94 64 C95 58 92 56 90 50 Z',
    fill: EMBER,
    stroke: '#7a2a10',
    width: 1.5,
  },
  { d: 'M92 50 C95 46 94 42 97 38 C97 44 98 48 95 52 Z', fill: EMBER_HOT },
  ...BELLOWS.slice(4),
];

const KEG: Emblem = [
  {
    d: 'M28 32 C23 46 23 66 28 82 H70 C75 66 75 46 70 32 Z',
    fill: '#8c5a2b',
    stroke: INK,
    width: 2.5,
  },
  {
    d: 'M38 33 C35 48 35 66 38 81 M49 33 V81 M60 33 C63 48 63 66 60 81',
    stroke: '#5e3a18',
    width: 1.4,
  },
  { d: 'M26 40 H72 M25 74 H73', stroke: IRON, width: 4 },
  { d: 'M27 32 H71 C72 36 26 36 27 32 Z', fill: '#6b4520', stroke: INK, width: 2 },
  // Fuse and spark.
  { d: 'M50 32 C50 22 58 18 66 14', stroke: INK, width: 2.5 },
  {
    d: 'M70 4 L72 11 L79 12 L73 16 L75 23 L69 18 L63 22 L65 15 L59 11 L66 10 Z',
    fill: EMBER_HOT,
    stroke: EMBER,
    width: 1.5,
  },
];

const KEG_EVOLVED: Emblem = [
  {
    d: 'M26 30 C21 46 21 68 26 84 H72 C77 68 77 46 72 30 Z',
    fill: '#7a4a22',
    stroke: INK,
    width: 2.5,
  },
  {
    d: 'M37 31 C34 48 34 68 37 83 M49 31 V83 M61 31 C64 48 64 68 61 83',
    stroke: '#4e2f12',
    width: 1.4,
  },
  { d: 'M24 39 H74 M23 57 H75 M24 76 H74', stroke: GOLD, width: 4 },
  // A carved rune on the middle band.
  { d: 'M44 50 L49 44 L54 50 M49 44 V64', stroke: EMBER_HOT, width: 2.5 },
  { d: 'M50 30 C50 20 58 16 66 12', stroke: INK, width: 2.5 },
  {
    d: 'M70 0 L73 9 L82 8 L75 14 L80 22 L71 18 L65 25 L66 16 L57 13 L66 9 Z',
    fill: EMBER_HOT,
    stroke: EMBER,
    width: 1.5,
  },
  { d: 'M84 24 L90 20 M86 30 L94 30 M58 4 L54 0', stroke: EMBER_HOT, width: 2 },
];

const FLINT: Emblem = [
  // Flint stone.
  { d: 'M16 70 L30 46 L52 40 L64 54 L58 78 L32 84 Z', fill: '#77736f', stroke: INK, width: 2.5 },
  { d: 'M30 48 L38 62 L56 56 M38 62 L36 80', stroke: '#4d4a47', width: 1.5 },
  { d: 'M31 47 L51 41.5', stroke: '#b9b4ae', width: 1.5 },
  // Striker steel.
  { d: 'M58 30 C58 20 82 20 82 30 L80 34 C80 26 60 26 60 34 Z', fill: IRON, stroke: INK, width: 2 },
  { d: 'M60 34 H80 V38 H60 Z', fill: '#4a4540', stroke: INK, width: 1.5 },
  // Sparks between them and a small flame.
  { d: 'M64 46 L67 42 M70 48 L75 45 M60 44 L60 39', stroke: EMBER_HOT, width: 2 },
  {
    d: 'M74 70 C70 64 74 58 78 54 C78 60 84 62 82 70 C81 75 75 76 74 70 Z',
    fill: EMBER,
    stroke: '#7a2a10',
    width: 1.5,
  },
  { d: 'M77 70 C76 66 78 63 79 61 C80 65 81 67 80 70 Z', fill: EMBER_HOT },
];

const FORGE_HEART: Emblem = [
  // Gold cradle.
  { d: 'M24 70 C30 84 70 84 76 70 L70 66 C64 76 36 76 30 66 Z', fill: GOLD, stroke: INK, width: 2 },
  { d: 'M30 66 L22 58 M70 66 L78 58 M50 78 V88', stroke: GOLD_DARK, width: 3 },
  // Flames rising behind the crystal.
  {
    d: 'M30 60 C24 44 34 36 34 24 C42 34 44 26 50 12 C56 26 58 34 66 24 C66 36 76 44 70 60 Z',
    fill: EMBER,
    stroke: '#7a2a10',
    width: 1.8,
  },
  // The heart-shaped ember crystal.
  {
    d: 'M50 70 L34 52 C30 46 34 38 41 38 C45 38 48 41 50 44 C52 41 55 38 59 38 C66 38 70 46 66 52 Z',
    fill: CRIMSON,
    stroke: INK,
    width: 2.5,
  },
  { d: 'M50 66 L38 52 C36 49 38 44 42 44 M50 44 V66', stroke: EMBER_HOT, width: 1.6 },
  { d: 'M58 43 C61 43 63 45 63 48', stroke: '#ffe9c4', width: 2 },
];

/** Relic pictures for the dwarf set: base and evolved (stage A covers the dwarves only). */
export const RELIC_EMBLEMS: Readonly<
  Record<string, { readonly base: Emblem; readonly evolved: Emblem }>
> = {
  pickaxe: {
    base: [...roundel(false), ...PICKAXE],
    evolved: [...roundel(true), ...PICKAXE_EVOLVED],
  },
  debrisFuel: {
    base: [...roundel(false), ...BELLOWS],
    evolved: [...roundel(true), ...BELLOWS_EVOLVED],
  },
  bomb: { base: [...roundel(false), ...KEG], evolved: [...roundel(true), ...KEG_EVOLVED] },
  ignition: { base: [...roundel(false), ...FLINT], evolved: [...roundel(true), ...FORGE_HEART] },
};

// ------------------------------------------------------------------ output

function f(n: number): string {
  return n.toFixed(1);
}

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

/** Inline SVG markup for an emblem (static data only, safe for innerHTML). */
export function emblemSvg(emblem: Emblem, size: number, className = ''): string {
  const body = emblem.map(layerSvg).join('');
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}

/** One layer as an SVG <path>. */
export function layerSvg(l: Layer): string {
  const attrs = [
    `d="${l.d}"`,
    `fill="${l.fill ?? 'none'}"`,
    l.stroke ? `stroke="${l.stroke}" stroke-width="${l.width ?? 2}"` : '',
    'stroke-linejoin="round" stroke-linecap="round"',
    l.opacity !== undefined ? `opacity="${l.opacity}"` : '',
  ];
  return `<path ${attrs.filter(Boolean).join(' ')}/>`;
}

const pathCache = new Map<string, Path2D>();

/** Paints an emblem on a canvas into the square (x, y, size). `mirror` flips it horizontally. */
export function paintEmblem(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  emblem: Emblem,
  x: number,
  y: number,
  size: number,
  mirror = false,
): void {
  ctx.save();
  ctx.translate(mirror ? x + size : x, y);
  ctx.scale((mirror ? -size : size) / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const l of emblem) {
    let p = pathCache.get(l.d);
    if (!p) {
      p = new Path2D(l.d);
      pathCache.set(l.d, p);
    }
    ctx.globalAlpha = l.opacity ?? 1;
    if (l.fill) {
      ctx.fillStyle = l.fill;
      ctx.fill(p);
    }
    if (l.stroke) {
      ctx.strokeStyle = l.stroke;
      ctx.lineWidth = l.width ?? 2;
      ctx.stroke(p);
    }
  }
  ctx.restore();
}
