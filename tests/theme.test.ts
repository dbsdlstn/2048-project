import { describe, expect, it } from 'vitest';
import type { TileKind } from '../src/core';
import { readLaunchParams } from '../src/game/debug';
import {
  NEON_THEME,
  STORYBOOK_THEME,
  THEMES,
  TileSpriteCache,
  computeLayout,
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

  it('the storybook frame is wider, so its cells are smaller but still fill the board exactly', () => {
    const neon = computeLayout(400, 4, NEON_THEME.layout);
    const book = computeLayout(400, 4, STORYBOOK_THEME.layout);
    expect(book.padding).toBeGreaterThan(neon.padding * 3);
    expect(book.cell).toBeLessThan(neon.cell);
    expect(book.cell).toBeGreaterThan(neon.cell * 0.8);
    for (const l of [neon, book]) {
      expect(l.padding * 2 + l.cell * 4 + l.gap * 3).toBeCloseTo(400, 6);
    }
  });

  it('neon layout is unchanged by the theme plumbing (default style)', () => {
    const l = computeLayout(400, 4);
    expect(l.gap).toBeCloseTo(l.padding, 10);
    expect(l.cell).toBeCloseTo(400 / (4 + 5 * 0.12), 10);
    expect(l.boardRadius).toBeCloseTo(20, 10);
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

describe('storybook rune stones', () => {
  it('climb a material ladder: one material per value up to 2048, then gems cycle', () => {
    expect(materialFor(2).name).toBe('pebble');
    expect(materialFor(2048).ornament).toBe('gem');
    expect(new Set(MATERIALS.map((m) => m.name)).size).toBe(MATERIALS.length);
    expect(materialFor(4096).ornament).toBe('gem');
    expect(materialFor(4096).name).not.toBe(materialFor(8192).name);
  });

  it('keep the numeral readable: at least 4.5:1 against both ends of every face gradient', () => {
    for (const m of [...MATERIALS, materialFor(4096), materialFor(8192), materialFor(16384)]) {
      expect(contrast(m.text, m.light), m.name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(m.text, m.shade), m.name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
