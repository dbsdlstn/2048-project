/**
 * The illuminated-manuscript palette. Palette discipline: a handful of
 * named pigments, as a scribe's workshop would have them, used for every
 * painted piece so separately drawn parts read as one page:
 *
 * - vellum (the ground) and iron-gall ink (every outline),
 * - burnished gold leaf for what matters (frames, capitals, high values),
 * - lapis / ultramarine, vermilion and verdigris for coloured grounds,
 * - a little tyrian purple and rose madder for the rarest tiers.
 *
 * Kept warm on purpose: vellum and gold carry most of the area; the deep
 * pigments sit in small fields framed by gold.
 */

export const INK = '#2a1a10';
export const INK_SOFT = '#5b4330';

/** Vellum, the page itself. */
export const PARCHMENT = '#efdcb4';
export const PARCHMENT_LIGHT = '#f8ecd0';
export const PARCHMENT_SHADE = '#e0c38e';
export const PARCHMENT_DEEP = '#b88a4c';

/** Burnished gold leaf (light, body, shadow). */
export const GOLD = '#d4a537';
export const GOLD_LIGHT = '#f6db7e';
export const GOLD_DARK = '#8a6114';

export const LAPIS = '#26479c';
export const LAPIS_DEEP = '#172d6b';
export const LAPIS_LIGHT = '#6f8fd6';
export const VERMILION = '#c4381c';
export const VERMILION_DEEP = '#8c2412';
export const VERDIGRIS = '#3d8a6c';
export const VERDIGRIS_DEEP = '#215a45';
export const TYRIAN = '#5e2f80';
export const ROSE = '#c25a6e';

/** The board ground behind the cells: lapis with a gold diaper pattern. */
export const SOCKET = '#1d3a82';

export const CRIMSON = VERMILION_DEEP;
export const CRIMSON_LIGHT = VERMILION;
export const FROST = '#3b7fc4';
export const FROST_LIGHT = '#e3f1fb';
export const SOOT = '#1f1418';
export const EMBER = '#e2672a';
export const EMBER_HOT = '#ffd36b';
export const MOSS = '#5f8a3e';
export const IRON = '#5c5650';

/** The four races' heraldic colours (field, charge, shadow). */
export const RACE_COLORS = {
  dwarf: { field: VERMILION_DEEP, charge: GOLD_LIGHT, dark: '#5b1a0e' },
  elf: { field: VERDIGRIS, charge: '#efe6c8', dark: VERDIGRIS_DEEP },
  human: { field: LAPIS, charge: '#efe6c8', dark: LAPIS_DEEP },
  orc: { field: '#6d6a2c', charge: '#2b2216', dark: '#43411a' },
} as const;
