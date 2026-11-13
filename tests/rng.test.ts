import { describe, expect, it } from 'vitest';
import { chance, createRng, hashSeed, nextFloat, nextInt, pick, type RngState } from '../src/core';

function draw(rng: RngState, n: number): { values: number[]; rng: RngState } {
  const values: number[] = [];
  let r = rng;
  for (let i = 0; i < n; i++) {
    const step = nextFloat(r);
    values.push(step.value);
    r = step.rng;
  }
  return { values, rng: r };
}

describe('rng', () => {
  it('same seed produces the same sequence', () => {
    expect(draw(createRng(42), 50).values).toEqual(draw(createRng(42), 50).values);
  });

  it('different seeds produce different sequences', () => {
    expect(draw(createRng(1), 10).values).not.toEqual(draw(createRng(2), 10).values);
  });

  it('string seeds are hashed deterministically', () => {
    expect(hashSeed('neon')).toBe(hashSeed('neon'));
    expect(hashSeed('neon')).not.toBe(hashSeed('rift'));
    expect(createRng('neon')).toEqual(createRng('neon'));
  });

  it('never mutates the input state', () => {
    const rng = Object.freeze(createRng(7));
    const before = { ...rng };
    nextFloat(rng);
    expect(rng).toEqual(before);
  });

  it('resumes identically after a JSON round trip', () => {
    const half = draw(createRng('save-me'), 25);
    const restored = JSON.parse(JSON.stringify(half.rng)) as RngState;
    expect(draw(restored, 25).values).toEqual(draw(half.rng, 25).values);
  });

  it('floats stay in [0, 1) and ints stay in range', () => {
    let rng = createRng(123);
    for (let i = 0; i < 5000; i++) {
      const f = nextFloat(rng);
      expect(f.value).toBeGreaterThanOrEqual(0);
      expect(f.value).toBeLessThan(1);
      const n = nextInt(f.rng, 7);
      expect(Number.isInteger(n.value)).toBe(true);
      expect(n.value).toBeGreaterThanOrEqual(0);
      expect(n.value).toBeLessThan(7);
      rng = n.rng;
    }
  });

  it('nextInt rejects invalid bounds', () => {
    expect(() => nextInt(createRng(1), 0)).toThrow(RangeError);
    expect(() => nextInt(createRng(1), 2.5)).toThrow(RangeError);
  });

  it('chance roughly matches its probability', () => {
    let rng = createRng('odds');
    let hits = 0;
    const trials = 20000;
    for (let i = 0; i < trials; i++) {
      const step = chance(rng, 0.1);
      if (step.value) hits++;
      rng = step.rng;
    }
    expect(hits / trials).toBeGreaterThan(0.09);
    expect(hits / trials).toBeLessThan(0.11);
  });

  it('pick returns an element and throws on empty input', () => {
    const items = ['a', 'b', 'c'] as const;
    expect(items).toContain(pick(createRng(5), items).value);
    expect(() => pick(createRng(5), [])).toThrow(RangeError);
  });
});
