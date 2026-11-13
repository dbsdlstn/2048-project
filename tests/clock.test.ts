import { describe, expect, it } from 'vitest';
import { move, stateFromGrid } from '../src/core';
import {
  AnimationLoop,
  BoardView,
  DEFAULT_TIMINGS,
  MAX_DT,
  ManualClock,
  PausableClock,
} from '../src/render';

describe('ManualClock', () => {
  it('only moves when advanced, running queued frames each step', () => {
    const clock = new ManualClock(100);
    const seen: number[] = [];
    const again = (t: number): void => {
      seen.push(t);
      if (t < 150) clock.requestFrame(again);
    };
    clock.requestFrame(again);
    expect(clock.now()).toBe(100);
    clock.advance(100, 20);
    expect(seen).toEqual([120, 140, 160]);
    expect(clock.now()).toBe(200);
    expect(clock.pendingFrames).toBe(0);
  });

  it('cancelled frames do not run', () => {
    const clock = new ManualClock();
    let ran = false;
    const h = clock.requestFrame(() => {
      ran = true;
    });
    clock.cancelFrame(h);
    clock.advance(50);
    expect(ran).toBe(false);
  });
});

describe('PausableClock', () => {
  it('follows the real clock until paused, then only moves through advance', () => {
    const real = new ManualClock(1000);
    const clock = new PausableClock(real);
    const frames: number[] = [];
    clock.requestFrame((t) => frames.push(t));
    real.advance(16, 16);
    expect(frames).toEqual([1016]);

    clock.pause();
    clock.requestFrame((t) => frames.push(t));
    real.advance(500); // real time passes, but paused frames do not run
    expect(frames).toEqual([1016]);
    expect(clock.now()).toBe(1016);

    clock.advance(10, 10);
    expect(frames).toEqual([1016, 1026]);
    expect(clock.now()).toBe(1026);

    clock.resume();
    expect(clock.now()).toBe(real.now());
  });
});

describe('AnimationLoop with an injected clock', () => {
  it('runs only while the tick asks for more frames, and passes clamped dt', () => {
    const clock = new ManualClock();
    const dts: number[] = [];
    let framesLeft = 3;
    const loop = new AnimationLoop(clock, (_now, dt) => {
      dts.push(dt);
      return --framesLeft > 0;
    });
    loop.invalidate();
    loop.invalidate(); // still one pending request
    expect(clock.pendingFrames).toBe(1);
    clock.advance(16, 16);
    clock.advance(200, 200); // long gap: dt is clamped
    clock.advance(16, 16);
    expect(dts).toEqual([0, MAX_DT, 16]);
    expect(loop.running).toBe(false);
    expect(clock.pendingFrames).toBe(0);
  });

  it('drives a BoardView turn deterministically from start to idle', () => {
    const T = DEFAULT_TIMINGS;
    const state = stateFromGrid([
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const clock = new ManualClock(5000);
    const view = new BoardView(4);
    view.syncTo(state);
    const frames: { now: number; tiles: number }[] = [];
    const loop = new AnimationLoop(clock, (now) => {
      const busy = view.update(now);
      frames.push({ now, tiles: view.frame(now).length });
      return busy;
    });

    view.apply(move(state, 'left').events, clock.now());
    loop.invalidate();

    // Half way through the slide: both sources still drawn (the spawn has not appeared).
    clock.advance(T.slide / 2, T.slide / 2);
    expect(frames.at(-1)).toEqual({ now: 5000 + T.slide / 2, tiles: 2 });
    // After everything: the merge result plus the spawned tile, and the loop has gone idle.
    clock.advance(1000, 10);
    expect(view.isAnimating(clock.now())).toBe(false);
    expect(frames.at(-1)?.tiles).toBe(2);
    expect(loop.running).toBe(false);
    const lastFrameTime = frames.at(-1)?.now ?? 0;
    expect(lastFrameTime).toBeLessThanOrEqual(5000 + T.slide + T.spawnDelay + T.spawn + 10);
  });
});
