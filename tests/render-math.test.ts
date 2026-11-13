import { describe, expect, it } from 'vitest';
import {
  clamp,
  computeLayout,
  cellOrigin,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutQuad,
  endTime,
  lerp,
  linear,
  mixHex,
  numberTileColors,
  progress,
  sample,
  still,
  tween,
  type Easing,
} from '../src/render';

describe('easing', () => {
  const curves: [string, Easing][] = [
    ['linear', linear],
    ['easeOutQuad', easeOutQuad],
    ['easeOutCubic', easeOutCubic],
    ['easeInOutCubic', easeInOutCubic],
    ['easeOutBack', easeOutBack()],
  ];

  it.each(curves)('%s starts at 0 and ends at 1', (_name, ease) => {
    expect(ease(0)).toBeCloseTo(0, 10);
    expect(ease(1)).toBeCloseTo(1, 10);
  });

  it('ease-out curves are ahead of linear halfway through', () => {
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(0.5)).toBeGreaterThan(easeOutQuad(0.5));
  });

  it('easeInOutCubic is symmetric around the midpoint', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
    expect(easeInOutCubic(0.2) + easeInOutCubic(0.8)).toBeCloseTo(1, 10);
  });

  it('easeOutBack overshoots past 1 before settling', () => {
    const ease = easeOutBack();
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => ease(i / 100)));
    expect(peak).toBeGreaterThan(1.05);
    expect(peak).toBeLessThan(1.2);
  });
});

describe('tween maths', () => {
  it('clamp and lerp', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('progress is clamped to [0, 1] and handles zero duration', () => {
    expect(progress(50, 100, 100)).toBe(0);
    expect(progress(150, 100, 100)).toBe(0.5);
    expect(progress(500, 100, 100)).toBe(1);
    expect(progress(99, 100, 0)).toBe(0);
    expect(progress(100, 100, 0)).toBe(1);
  });

  it('a tween holds its start value before it begins and its end value after', () => {
    const tw = tween(2, 6, 1000, 200, linear);
    expect(sample(tw, 0)).toBe(2);
    expect(sample(tw, 1100)).toBe(4);
    expect(sample(tw, 1200)).toBe(6);
    expect(sample(tw, Number.POSITIVE_INFINITY)).toBe(6);
    expect(endTime(tw)).toBe(1200);
  });

  it('still() is always its value', () => {
    expect(sample(still(3), Number.NEGATIVE_INFINITY)).toBe(3);
    expect(sample(still(3), 0)).toBe(3);
  });
});

describe('layout', () => {
  it('cells, gaps and padding exactly fill the board', () => {
    const l = computeLayout(400, 4);
    const lastCell = cellOrigin(l, 3, 3);
    expect(lastCell.x + l.cell + l.padding).toBeCloseTo(400, 9);
    expect(lastCell.y + l.cell + l.padding).toBeCloseTo(400, 9);
  });

  it('fractional positions interpolate between cells', () => {
    const l = computeLayout(400, 4);
    const a = cellOrigin(l, 0, 1);
    const b = cellOrigin(l, 0, 2);
    expect(cellOrigin(l, 0, 1.5).x).toBeCloseTo((a.x + b.x) / 2, 9);
  });
});

describe('theme', () => {
  it('mixHex blends channels linearly', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ff8000', 0.5)).toBe('#804000');
  });

  it('every power of two gets a valid colour, including past the ramp', () => {
    for (let v = 2; v <= 2 ** 17; v *= 2) {
      const c = numberTileColors(v);
      expect(c.fill).toMatch(/^#[0-9a-f]{6}$/);
      expect(c.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(numberTileColors(2).accent).not.toBe(numberTileColors(4).accent);
  });
});
