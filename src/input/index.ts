/**
 * Turns pointer swipes (touch, pen, mouse) and arrow / WASD keys into
 * `Direction`s. This is the only module that knows about pointer coordinates
 * and key codes; everything downstream just receives a direction.
 */
import type { Direction } from '../core';
import { directionForKey } from './keys';
import { DEFAULT_SWIPE_THRESHOLD, SwipeTracker, isTap } from './swipe';

export * from './keys';
export * from './swipe';

export interface InputOptions {
  /** Element that receives swipes. It gets `touch-action: none` via CSS. */
  readonly surface: HTMLElement;
  readonly onDirection: (direction: Direction) => void;
  /** A short press without movement (viewport coordinates), e.g. to pick a board cell. */
  readonly onTap?: (clientX: number, clientY: number) => void;
  /** Escape key (cancel / pause). */
  readonly onBack?: () => void;
  /** Swipe distance threshold in CSS px. */
  readonly threshold?: number;
}

/** Elements that keep their own pointer behaviour (taps on buttons are not swipes). */
const INTERACTIVE = 'button, a, input, select, textarea, [data-no-swipe]';

/** Wires up input listeners and returns a function that removes them all. */
export function attachInput(options: InputOptions): () => void {
  const { surface, onDirection } = options;
  const threshold = options.threshold ?? DEFAULT_SWIPE_THRESHOLD;
  const tracker = new SwipeTracker(threshold);
  /** Start of the current gesture and whether it already fired a swipe. */
  let gesture: { id: number; x: number; y: number; swiped: boolean } | null = null;
  const fire = (dir: Direction | null): void => {
    if (!dir) return;
    if (gesture) gesture.swiped = true;
    onDirection(dir);
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
    tracker.begin(e.pointerId, e.clientX, e.clientY);
    gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
    // Keep receiving moves even if the finger leaves the surface.
    try {
      surface.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; tracking still works.
    }
    // Stops mouse drags from selecting text.
    e.preventDefault();
  };
  const onPointerMove = (e: PointerEvent): void => {
    fire(tracker.move(e.pointerId, e.clientX, e.clientY));
  };
  const onPointerUp = (e: PointerEvent): void => {
    fire(tracker.end(e.pointerId, e.clientX, e.clientY));
    const g = gesture;
    gesture = null;
    if (g?.id === e.pointerId && !g.swiped && isTap(e.clientX - g.x, e.clientY - g.y, threshold)) {
      options.onTap?.(e.clientX, e.clientY);
    }
  };
  const onPointerCancel = (e: PointerEvent): void => {
    tracker.cancel(e.pointerId);
    gesture = null;
  };
  // Belt and braces for browsers that only partly honour `touch-action`
  // (pull-to-refresh, rubber-band scroll, pinch zoom on iOS Safari).
  const preventTouchScroll = (e: TouchEvent): void => {
    if (e.cancelable) e.preventDefault();
  };
  const preventGesture = (e: Event): void => {
    e.preventDefault();
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
    if (e.code === 'Escape') {
      options.onBack?.();
      return;
    }
    const dir = directionForKey(e.code);
    if (!dir) return;
    e.preventDefault(); // arrows would otherwise scroll the page
    onDirection(dir);
  };

  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointermove', onPointerMove);
  surface.addEventListener('pointerup', onPointerUp);
  surface.addEventListener('pointercancel', onPointerCancel);
  surface.addEventListener('touchmove', preventTouchScroll, { passive: false });
  document.addEventListener('gesturestart', preventGesture);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    surface.removeEventListener('pointerdown', onPointerDown);
    surface.removeEventListener('pointermove', onPointerMove);
    surface.removeEventListener('pointerup', onPointerUp);
    surface.removeEventListener('pointercancel', onPointerCancel);
    surface.removeEventListener('touchmove', preventTouchScroll);
    document.removeEventListener('gesturestart', preventGesture);
    window.removeEventListener('keydown', onKeyDown);
  };
}
