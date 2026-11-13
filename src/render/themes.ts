/**
 * The available themes, assembled from their palettes and painters, and the
 * `?theme=` switch. Neon is the default; the storybook theme is the stage A
 * art proof (see docs/STUDY.md chapter 9).
 */
import { NEON_BOARD_ART } from './marks';
import { NEON_PARTICLES } from './particles';
import { STORYBOOK_THEME } from './storybook';
import { NEON_LAYOUT, NEON_PALETTE, type Theme, type ThemeId } from './theme';
import { NEON_OVERLAYS, NEON_TILE_ART } from './tilePainter';

export const NEON_THEME: Theme = {
  ...NEON_PALETTE,
  id: 'neon',
  tileArt: NEON_TILE_ART,
  overlays: NEON_OVERLAYS,
  boardArt: NEON_BOARD_ART,
  particles: NEON_PARTICLES,
  layout: NEON_LAYOUT,
};

export { STORYBOOK_THEME };

export const THEMES: Readonly<Record<ThemeId, Theme>> = {
  neon: NEON_THEME,
  storybook: STORYBOOK_THEME,
};

/** The theme a `?theme=` value asks for; anything unknown (or missing) is neon. */
export function parseThemeId(value: string | null | undefined): ThemeId {
  const v = (value ?? '').trim().toLowerCase();
  return (Object.keys(THEMES) as ThemeId[]).find((id) => id === v) ?? 'neon';
}

export function themeById(id: ThemeId): Theme {
  return THEMES[id];
}
