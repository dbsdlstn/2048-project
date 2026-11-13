/**
 * Trauma-based screen shake. Events add "trauma" (0..1); it decays linearly
 * over time; the camera offset is `maxOffset × trauma² × noise(t)`.
 *
 * - Squaring makes small trauma nearly invisible and big trauma strong, so
 *   many small events never add up to a disorienting wobble.
 * - Smooth noise (a sum of sines at unrelated frequencies) instead of random
 *   numbers: the board sways rather than jitters, and the result is a pure
 *   function of time (deterministic in tests and stepped screenshots).
 * - Translation only: rotating a 4×4 grid of numbers hurts readability.
 */

/** Smooth pseudo-noise in [-1, 1]. `seed` picks an independent channel (x vs y). */
export function shakeNoise(t: number, seed: number): number {
  return (
    0.5 * Math.sin(t * 1.0 + seed * 1.31) +
    0.3 * Math.sin(t * 2.17 + seed * 4.07) +
    0.2 * Math.sin(t * 3.91 + seed * 2.53)
  );
}

/** Camera offset for a trauma level at time `t` (ms). */
export function shakeOffset(
  trauma: number,
  t: number,
  maxOffset: number,
  frequency = 0.03,
): { x: number; y: number } {
  const amp = maxOffset * trauma * trauma;
  const phase = t * frequency;
  return { x: amp * shakeNoise(phase, 1), y: amp * shakeNoise(phase, 7) };
}

export interface ShakeOptions {
  /** Offset at trauma 1, in CSS px. */
  readonly maxOffset?: number;
  /** Trauma lost per second. */
  readonly decay?: number;
}

export class TraumaShake {
  private value = 0;
  private readonly decay: number;
  maxOffset: number;
  /** When false, trauma is ignored entirely (reduced motion). */
  enabled = true;

  constructor(options: ShakeOptions = {}) {
    this.maxOffset = options.maxOffset ?? 10;
    this.decay = options.decay ?? 1.8;
  }

  get trauma(): number {
    return this.value;
  }

  get active(): boolean {
    return this.value > 0;
  }

  /** Adds trauma (clamped to 1). Bigger events add more; stacking saturates. */
  add(amount: number): void {
    if (!this.enabled || amount <= 0) return;
    this.value = Math.min(1, this.value + amount);
  }

  update(dt: number): void {
    this.value = Math.max(0, this.value - (this.decay * dt) / 1000);
  }

  offset(t: number): { x: number; y: number } {
    if (this.value <= 0) return { x: 0, y: 0 };
    return shakeOffset(this.value, t, this.maxOffset);
  }

  clear(): void {
    this.value = 0;
  }
}
