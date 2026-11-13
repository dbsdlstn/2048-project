/**
 * The storybook-map palette. Palette discipline: a small set of named inks
 * and pigments, used for everything on the board and in the art, so many
 * separately drawn pieces still read as one picture. Warm parchment and
 * walnut carry the page; ink outlines hold every shape; gold leaf marks what
 * matters; the saturated pigments (crimson, frost blue, ember) are kept for
 * hazards and gems so they stand out.
 */

export const INK = '#2b1d10';
export const INK_SOFT = '#5a4430';

export const PARCHMENT = '#f2e3c2';
export const PARCHMENT_LIGHT = '#f9f0da';
export const PARCHMENT_SHADE = '#dfc896';
export const PARCHMENT_DEEP = '#b98e52';

export const GOLD = '#c8952c';
export const GOLD_LIGHT = '#f1d27a';
export const GOLD_DARK = '#87590f';

export const WOOD = '#6a4527';
export const WOOD_LIGHT = '#87603a';
export const WOOD_DARK = '#432a15';
export const SOCKET = '#3e2714';

export const CRIMSON = '#9b2a22';
export const CRIMSON_LIGHT = '#c8473a';
export const FROST = '#3f8fc2';
export const FROST_LIGHT = '#dff2fb';
export const SOOT = '#241a17';
export const EMBER = '#e2672a';
export const EMBER_HOT = '#ffd36b';
export const MOSS = '#6f8338';
export const IRON = '#5c5650';

/** The four races' heraldic colours (field, charge). */
export const RACE_COLORS = {
  dwarf: { field: '#8e2b1f', charge: GOLD_LIGHT, dark: '#5b1a12' },
  elf: { field: '#3d6b3a', charge: '#e9e2c4', dark: '#24421f' },
  human: { field: '#2f5687', charge: '#efe6cc', dark: '#1c3557' },
  orc: { field: '#6d6a2c', charge: '#2b2216', dark: '#43411a' },
} as const;
