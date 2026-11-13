/**
 * Seeded, deterministic pseudo random number generator (mulberry32).
 *
 * The generator is purely functional: its whole state is a small plain object,
 * and every draw returns the value together with the *next* state. Nothing is
 * mutated, so a game state that embeds an `RngState` can be serialized with
 * JSON and resumed later with exactly the same future rolls.
 */

export interface RngState {
  /** The original 32-bit seed (kept for display / sharing a run). */
  readonly seed: number;
  /** Current internal 32-bit state. */
  readonly state: number;
}

/** A drawn value plus the advanced generator state. */
export interface RngStep<T> {
  readonly value: T;
  readonly rng: RngState;
}

/** Hashes an arbitrary string into a 32-bit unsigned seed (FNV-1a + avalanche). */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Creates a generator from a numeric or string seed. */
export function createRng(seed: number | string): RngState {
  const s = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  return { seed: s, state: s };
}

/** Returns a float in [0, 1). */
export function nextFloat(rng: RngState): RngStep<number> {
  const state = (rng.state + 0x6d2b79f5) | 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, rng: { seed: rng.seed, state: state >>> 0 } };
}

/** Returns an integer in [0, maxExclusive). */
export function nextInt(rng: RngState, maxExclusive: number): RngStep<number> {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`maxExclusive must be a positive integer, got ${maxExclusive}`);
  }
  const step = nextFloat(rng);
  return { value: Math.floor(step.value * maxExclusive), rng: step.rng };
}

/** Returns true with probability `p`. */
export function chance(rng: RngState, p: number): RngStep<boolean> {
  const step = nextFloat(rng);
  return { value: step.value < p, rng: step.rng };
}

/** Picks one element uniformly. Throws on an empty array. */
export function pick<T>(rng: RngState, items: readonly T[]): RngStep<T> {
  const step = nextInt(rng, items.length);
  const value = items[step.value];
  if (value === undefined) throw new RangeError('pick() on an empty array');
  return { value, rng: step.rng };
}

/**
 * A fresh non-deterministic seed for starting a new run. This is the only
 * impure function in this module; call it at the edge (UI), never in core rules.
 */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
