import { describe, expect, it } from 'vitest';
import type { TileKind } from '../src/core';
import { readLaunchParams } from '../src/game/debug';
import { readFileSync } from 'node:fs';
import {
  NEON_THEME,
  STORYBOOK_THEME,
  THEMES,
  TileSpriteCache,
  cellAtPoint,
  cellCenter,
  computeLayout,
  gridExtent,
  lineRect,
  parseThemeId,
  type CanvasFactory,
  type Theme,
  type TileArt,
} from '../src/render';
import { MATERIALS, materialFor } from '../src/render/storybook/tiles';

function fakeFactory(): CanvasFactory {
  return (width, height) => {
    const ctx = { setTransform: () => undefined };
    return { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  };
}

/** A theme whose tile art only counts paints, tagged with a name. */
function countingTheme(base: Theme, counter: { paints: string[] }, tag: string): Theme {
  const art: TileArt = {
    margin: () => 4,
    paint: () => {
      counter.paints.push(tag);
    },
  };
  const tileArt: Record<TileKind, TileArt> = { number: art, stone: art, prism: art };
  return { ...base, tileArt };
}

describe('?theme parsing', () => {
  it('accepts known themes in any case and falls back to neon', () => {
    expect(parseThemeId('storybook')).toBe('storybook');
    expect(parseThemeId(' StoryBook ')).toBe('storybook');
    expect(parseThemeId('neon')).toBe('neon');
    expect(parseThemeId('')).toBe('neon');
    expect(parseThemeId(null)).toBe('neon');
    expect(parseThemeId('nope')).toBe('neon');
    // Prototype keys are not themes.
    expect(parseThemeId('constructor')).toBe('neon');
    expect(parseThemeId('toString')).toBe('neon');
  });

  it('is part of the launch params, with the storybook proof extras', () => {
    expect(readLaunchParams('').theme).toBe('neon');
    const p = readLaunchParams('?theme=storybook&mockFaction=dwarf:2&journey=3');
    expect(p.theme).toBe('storybook');
    expect(p.mockFaction).toBe('dwarf:2');
    expect(p.journey).toBe(3);
    expect(readLaunchParams('?journey=9').journey).toBeNull();
  });
});

describe('themes provide painters, not only colours', () => {
  it('every theme has art for every tile kind and its own board / particle strategy', () => {
    for (const theme of Object.values(THEMES)) {
      for (const kind of ['number', 'stone', 'prism'] as const) {
        expect(typeof theme.tileArt[kind].paint).toBe('function');
      }
      expect(theme.overlays.length).toBeGreaterThan(0);
    }
    expect(STORYBOOK_THEME.tileArt.number).not.toBe(NEON_THEME.tileArt.number);
    expect(STORYBOOK_THEME.boardArt).not.toBe(NEON_THEME.boardArt);
    expect(STORYBOOK_THEME.overlays).not.toBe(NEON_THEME.overlays);
  });

  it('neon draws light additively; the bright storybook page blends normally', () => {
    expect(NEON_THEME.particles.blend).toBe('lighter');
    expect(STORYBOOK_THEME.particles.blend).toBe('source-over');
  });

  it('the storybook board grows scenery bands from spare height; cells come from the width', () => {
    const style = STORYBOOK_THEME.layout;
    const tall = computeLayout(400, 4, style, 560);
    expect(tall.height).toBe(560);
    expect(tall.cell).toBeCloseTo(400 / (4 + 3 * style.gap + 2 * style.padding), 10);
    const grid = gridExtent(tall);
    expect(tall.padding * 2 + grid).toBeCloseTo(400, 6);
    // The spare height is split into a top and a bottom band.
    const top = tall.originY;
    const bottom = tall.height - tall.originY - grid;
    expect(top).toBeGreaterThan(tall.cell * (style.bands?.min ?? 0));
    expect(top).toBeCloseTo(bottom, 6);
  });

  it('when the height cannot give the minimum bands, cells shrink and the grid is centred', () => {
    const style = STORYBOOK_THEME.layout;
    const min = style.bands?.min ?? 0;
    const l = computeLayout(400, 4, style, 380);
    const grid = gridExtent(l);
    expect(l.originY).toBeCloseTo(l.cell * min, 6);
    expect(l.height - l.originY - grid).toBeCloseTo(l.cell * min, 6);
    expect(l.padding).toBeCloseTo((400 - grid) / 2, 6);
    expect(l.padding).toBeGreaterThan(l.cell * style.padding);
  });

  it('tiles are never smaller than on the old square framed board, and larger with room', () => {
    const style = STORYBOOK_THEME.layout;
    const oldSquare = (side: number) => side / (4 + 3 * 0.09 + 2 * 0.56);
    for (const [w, h] of [
      [358, 520],
      [288, 378],
      [204, 300],
      [520, 707],
    ] as const) {
      // The page CSS gives the board this box (see `--board-*` in style.css).
      const units = 4 + 3 * style.gap + 2 * style.padding;
      const unitsMin = 4 + 3 * style.gap + 2 * (style.bands?.min ?? 0);
      const unitsMax = 4 + 3 * style.gap + 2 * (style.bands?.max ?? 0);
      const c = Math.min(w / units, h / unitsMin);
      const box = { w: c * units, h: Math.min(h, c * unitsMax) };
      const l = computeLayout(box.w, 4, style, box.h);
      expect(l.cell).toBeGreaterThanOrEqual(oldSquare(Math.min(w, h)) - 1e-9);
    }
  });

  it('hit-testing and line marks follow the shifted grid on a tall board', () => {
    const l = computeLayout(400, 4, STORYBOOK_THEME.layout, 560);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const c = cellCenter(l, row, col);
        expect(cellAtPoint(l, c.x, c.y)).toEqual({ row, col });
      }
    }
    expect(cellAtPoint(l, 200, l.originY - l.gap * 2)).toBeNull(); // in the top band
    const col = lineRect(l, 'col', 1);
    expect(col.y).toBeCloseTo(l.originY - l.gap / 2, 6);
    expect(col.h).toBeCloseTo(gridExtent(l) + l.gap, 6);
  });

  it('the page CSS sizes the board box from the same numbers as the layout', () => {
    const css = readFileSync(new URL('../src/ui/style.css', import.meta.url), 'utf8');
    const num = (name: string): number => {
      const m = new RegExp(`--${name}:\\s*([0-9.]+);`).exec(css);
      if (!m) throw new Error(`--${name} missing in style.css`);
      return Number(m[1]);
    };
    const style = STORYBOOK_THEME.layout;
    const span = 4 + 3 * style.gap;
    expect(num('board-w')).toBeCloseTo(span + 2 * style.padding, 2);
    expect(num('board-h-min')).toBeCloseTo(span + 2 * (style.bands?.min ?? 0), 2);
    expect(num('board-h-max')).toBeCloseTo(span + 2 * (style.bands?.max ?? 0), 2);
  });

  it('neon layout is unchanged by the theme plumbing (default style)', () => {
    const l = computeLayout(400, 4);
    expect(l.gap).toBeCloseTo(l.padding, 10);
    expect(l.cell).toBeCloseTo(400 / (4 + 5 * 0.12), 10);
    expect(l.boardRadius).toBeCloseTo(20, 10);
    expect(l.height).toBe(400);
    expect(l.originY).toBe(l.padding);
  });
});

describe('TileSpriteCache and themes', () => {
  it('paints with the theme it was given', () => {
    const counter = { paints: [] as string[] };
    const cache = new TileSpriteCache({
      createCanvas: fakeFactory(),
      theme: countingTheme(NEON_THEME, counter, 'a'),
    });
    cache.configure(80, 12, 2);
    cache.get({ kind: 'number', value: 2, emphasized: false });
    expect(counter.paints).toEqual(['a']);
  });

  it('a theme change empties the cache and repaints with the new painters', () => {
    const counter = { paints: [] as string[] };
    const a = countingTheme(NEON_THEME, counter, 'a');
    const b = countingTheme(STORYBOOK_THEME, counter, 'b');
    const cache = new TileSpriteCache({ createCanvas: fakeFactory(), theme: a });
    const look = { kind: 'number', value: 8, emphasized: false } as const;
    cache.configure(80, 12, 2);
    cache.get(look);
    cache.get({ kind: 'stone', value: 0, emphasized: false });
    expect(cache.size).toBe(2);
    cache.setTheme(b);
    expect(cache.size).toBe(0);
    expect(cache.theme).toBe(b);
    cache.get(look);
    expect(counter.paints).toEqual(['a', 'a', 'b']);
  });

  it('setting the same theme again keeps the cache', () => {
    const counter = { paints: [] as string[] };
    const a = countingTheme(NEON_THEME, counter, 'a');
    const cache = new TileSpriteCache({ createCanvas: fakeFactory(), theme: a });
    cache.configure(80, 12, 2);
    cache.get({ kind: 'number', value: 2, emphasized: false });
    cache.setTheme(a);
    expect(cache.size).toBe(1);
  });
});

/** WCAG relative luminance of `#rrggbb`. */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('storybook illuminated tiles', () => {
  it('climb a ladder: one look per value up to 2048, then jewelled tiers cycle', () => {
    expect(materialFor(2).frame).toBe('rule');
    expect(materialFor(128).gilded).toBe(true);
    expect(materialFor(2048).frame).toBe('jewel');
    expect(new Set(MATERIALS.map((m) => m.name)).size).toBe(MATERIALS.length);
    expect(materialFor(4096).frame).toBe('jewel');
    expect(materialFor(4096).name).not.toBe(materialFor(8192).name);
  });

  it('keep the numeral readable: at least 4.5:1 for both ends of the numeral against both ends of the ground', () => {
    for (const m of [
      ...MATERIALS,
      materialFor(4096),
      materialFor(8192),
      materialFor(16384),
      materialFor(32768),
    ]) {
      for (const text of [m.text, m.textDeep]) {
        expect(contrast(text, m.light), m.name).toBeGreaterThanOrEqual(4.5);
        expect(contrast(text, m.shade), m.name).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
