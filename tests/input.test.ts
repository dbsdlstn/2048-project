import { describe, expect, it } from 'vitest';
import type { Direction } from '../src/core';
import { SwipeTracker, directionForKey, resolveSwipe } from '../src/input';

describe('resolveSwipe', () => {
  it.each<[number, number, Direction]>([
    [40, 0, 'right'],
    [-40, 0, 'left'],
    [0, 40, 'down'], // screen y grows downward
    [0, -40, 'up'],
    [40, 30, 'right'], // dominant axis wins
    [-10, 35, 'down'],
  ])('(%d, %d) -> %s', (dx, dy, expected) => {
    expect(resolveSwipe(dx, dy, 24)).toBe(expected);
  });

  it('ignores drags shorter than the threshold', () => {
    expect(resolveSwipe(20, 5, 24)).toBeNull();
    expect(resolveSwipe(0, 0, 24)).toBeNull();
  });

  it('ignores exact diagonals', () => {
    expect(resolveSwipe(30, -30, 24)).toBeNull();
  });
});

describe('SwipeTracker', () => {
  it('fires as soon as the threshold is crossed, once per gesture', () => {
    const t = new SwipeTracker(24);
    t.begin(1, 100, 100);
    expect(t.move(1, 110, 100)).toBeNull();
    expect(t.move(1, 130, 104)).toBe('right');
    expect(t.move(1, 200, 104)).toBeNull(); // already fired
    expect(t.end(1, 200, 104)).toBeNull();
    expect(t.tracking).toBe(false);
  });

  it('resolves on release when no move event crossed the threshold', () => {
    const t = new SwipeTracker(24);
    t.begin(1, 0, 0);
    expect(t.end(1, 0, -50)).toBe('up');
  });

  it('a short tap is not a swipe', () => {
    const t = new SwipeTracker(24);
    t.begin(1, 0, 0);
    expect(t.end(1, 3, 2)).toBeNull();
  });

  it('ignores other pointers and cancelled gestures', () => {
    const t = new SwipeTracker(24);
    t.begin(1, 0, 0);
    expect(t.move(2, 100, 0)).toBeNull();
    t.cancel(1);
    expect(t.move(1, 100, 0)).toBeNull();
    expect(t.end(1, 100, 0)).toBeNull();
  });

  it('a new gesture can fire again', () => {
    const t = new SwipeTracker(24);
    t.begin(1, 0, 0);
    expect(t.move(1, -30, 0)).toBe('left');
    t.end(1, -30, 0);
    t.begin(2, 0, 0);
    expect(t.move(2, 0, 30)).toBe('down');
  });
});

describe('directionForKey', () => {
  it.each<[string, Direction]>([
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
    ['KeyW', 'up'],
    ['KeyA', 'left'],
    ['KeyS', 'down'],
    ['KeyD', 'right'],
  ])('%s -> %s', (code, dir) => {
    expect(directionForKey(code)).toBe(dir);
  });

  it('ignores other keys and inherited object properties', () => {
    expect(directionForKey('Space')).toBeNull();
    expect(directionForKey('KeyQ')).toBeNull();
    expect(directionForKey('toString')).toBeNull();
  });
});
