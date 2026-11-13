import { describe, expect, it } from 'vitest';
import type { TileKind } from '../src/core';
import { TileSpriteCache, type CanvasFactory, type TileArt } from '../src/render';

/** Fake canvases with a no-op 2D context: enough to test caching without a DOM. */
function fakeFactory(): { factory: CanvasFactory; created: { width: number; height: number }[] } {
  const created: { width: number; height: number }[] = [];
  const factory: CanvasFactory = (width, height) => {
    created.push({ width, height });
    const ctx = { setTransform: () => undefined };
    return { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  };
  return { factory, created };
}

function countingArt(): { art: Record<TileKind, TileArt>; paints: () => number } {
  let paints = 0;
  return {
    art: {
      number: {
        margin: (look) => (look.emphasized ? 10 : 5),
        paint: () => {
          paints++;
        },
      },
    },
    paints: () => paints,
  };
}

describe('TileSpriteCache', () => {
  it('renders each distinct look once and reuses it', () => {
    const { factory } = fakeFactory();
    const { art, paints } = countingArt();
    const cache = new TileSpriteCache({ createCanvas: factory, art });
    cache.configure(80, 12, 2);
    const a = cache.get({ kind: 'number', value: 2, emphasized: false });
    const b = cache.get({ kind: 'number', value: 2, emphasized: false });
    cache.get({ kind: 'number', value: 4, emphasized: false });
    cache.get({ kind: 'number', value: 4, emphasized: true });
    expect(a).toBe(b);
    expect(paints()).toBe(3);
    expect(cache.size).toBe(3);
  });

  it('sizes images as (cell + 2 x glow margin) x devicePixelRatio', () => {
    const { factory, created } = fakeFactory();
    const { art } = countingArt();
    const cache = new TileSpriteCache({ createCanvas: factory, art });
    cache.configure(80, 12, 3);
    const tile = cache.get({ kind: 'number', value: 8, emphasized: false });
    expect(tile.cssSize).toBe(90);
    expect(created.at(-1)).toEqual({ width: 270, height: 270 });
  });

  it('a resize or DPR change invalidates the cache; the same geometry keeps it', () => {
    const { factory } = fakeFactory();
    const { art, paints } = countingArt();
    const cache = new TileSpriteCache({ createCanvas: factory, art });
    const look = { kind: 'number', value: 2, emphasized: false } as const;
    cache.configure(80, 12, 2);
    cache.get(look);
    cache.configure(80, 12, 2);
    cache.get(look);
    expect(paints()).toBe(1);
    cache.configure(80, 12, 3); // DPR changed
    expect(cache.size).toBe(0);
    cache.get(look);
    cache.configure(90, 13, 3); // resized
    cache.get(look);
    expect(paints()).toBe(3);
  });

  it('stays bounded', () => {
    const { factory } = fakeFactory();
    const { art } = countingArt();
    const cache = new TileSpriteCache({ createCanvas: factory, art, maxEntries: 4 });
    cache.configure(80, 12, 1);
    for (let v = 2; v <= 2 ** 10; v *= 2)
      cache.get({ kind: 'number', value: v, emphasized: false });
    expect(cache.size).toBeLessThanOrEqual(4);
  });
});
