/**
 * Minimal tween / easing toolkit. Pure maths, no DOM and no clock: callers pass
 * the current time in, so everything here is deterministic and unit-testable.
 */

/** Maps linear progress t in [0, 1] to eased progress (may overshoot for "back" curves). */
export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;

export const easeOutQuad: Easing = (t) => 1 - (1 - t) * (1 - t);

export const easeOutCubic: Easing = (t) => 1 - (1 - t) ** 3;

export const easeInOutCubic: Easing = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Ease-out with overshoot: goes past 1 and settles back. `overshoot` controls
 * how far (1.70158 is the classic ~10% overshoot).
 */
export function easeOutBack(overshoot = 1.70158): Easing {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return (t) => 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Linear progress of an animation that starts at `start` and lasts `duration`, clamped to [0, 1]. */
export function progress(now: number, start: number, duration: number): number {
  if (duration <= 0) return now >= start ? 1 : 0;
  return clamp((now - start) / duration, 0, 1);
}

/** A single numeric animation from `from` to `to`, defined in absolute time. */
export interface Tween {
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly duration: number;
  readonly ease: Easing;
}

export function tween(
  from: number,
  to: number,
  start: number,
  duration: number,
  ease: Easing = linear,
): Tween {
  return { from, to, start, duration, ease };
}

/** A tween that is already finished and always samples to `value`. */
export function still(value: number): Tween {
  return { from: value, to: value, start: 0, duration: 0, ease: linear };
}

/** Value of `tw` at time `now`. Before start it holds `from`, after the end it holds `to`. */
export function sample(tw: Tween, now: number): number {
  const t = progress(now, tw.start, tw.duration);
  if (t >= 1) return tw.to; // exact end value, no floating point drift
  return lerp(tw.from, tw.to, tw.ease(t));
}

/** Time at which `tw` reaches its final value. */
export function endTime(tw: Tween): number {
  return tw.start + Math.max(0, tw.duration);
}
