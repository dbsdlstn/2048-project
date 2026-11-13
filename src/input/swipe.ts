/**
 * Swipe gesture recognition, independent of DOM events so it can be tested in
 * Node. The DOM layer (`attachInput`) feeds it pointer coordinates.
 */
import type { Direction } from '../core';

/** Default distance (CSS px) a pointer must travel before it counts as a swipe. */
export const DEFAULT_SWIPE_THRESHOLD = 24;

/**
 * Direction of a drag by its dominant axis, or null if it is shorter than
 * `threshold` or exactly diagonal. Screen y grows downward.
 */
export function resolveSwipe(dx: number, dy: number, threshold: number): Direction | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold || ax === ay) return null;
  if (ax > ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * Tracks one pointer gesture at a time. A swipe fires as soon as the pointer
 * crosses the threshold (no need to wait for the finger to lift), and at most
 * once per gesture.
 */
export class SwipeTracker {
  private active: { id: number; x: number; y: number; fired: boolean } | null = null;

  constructor(private readonly threshold: number = DEFAULT_SWIPE_THRESHOLD) {}

  get tracking(): boolean {
    return this.active !== null;
  }

  begin(pointerId: number, x: number, y: number): void {
    this.active = { id: pointerId, x, y, fired: false };
  }

  /** Returns a direction the first time the gesture crosses the threshold. */
  move(pointerId: number, x: number, y: number): Direction | null {
    const a = this.active;
    if (a?.id !== pointerId || a.fired) return null;
    const dir = resolveSwipe(x - a.x, y - a.y, this.threshold);
    if (dir) a.fired = true;
    return dir;
  }

  /** Ends the gesture; returns a direction if it qualifies and has not fired yet. */
  end(pointerId: number, x: number, y: number): Direction | null {
    if (this.active?.id !== pointerId) return null;
    const dir = this.move(pointerId, x, y);
    this.active = null;
    return dir;
  }

  cancel(pointerId?: number): void {
    if (pointerId === undefined || this.active?.id === pointerId) this.active = null;
  }
}
