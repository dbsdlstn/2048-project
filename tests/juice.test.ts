import { describe, expect, it } from 'vitest';
import { move, stateFromGrid } from '../src/core';
import {
  BIG_MERGE,
  BoardFx,
  BoardView,
  DEFAULT_TIMINGS,
  FrameBudget,
  ParticlePool,
  TraumaShake,
  computeLayout,
  makeRandom,
  nudgeAmount,
  shakeOffset,
  type BurstSpec,
  type SpriteFrame,
} from '../src/render';
import { turnOn } from './helpers';

const T = DEFAULT_TIMINGS;

const spec = (count: number, extra: Partial<BurstSpec> = {}): BurstSpec => ({
  x: 100,
  y: 100,
  count,
  shape: 'spark',
  colors: ['#ff0000'],
  speed: [0.1, 0.2],
  life: [100, 100],
  size: [2, 2],
  ...extra,
});

describe('ParticlePool', () => {
  it('never holds more than its capacity; extra particles are refused and counted', () => {
    const pool = new ParticlePool({ capacity: 50 });
    expect(pool.emit(spec(30))).toBe(30);
    expect(pool.emit(spec(30))).toBe(20);
    expect(pool.count).toBe(50);
    expect(pool.free).toBe(0);
    expect(pool.dropped).toBe(10);
    expect(pool.emit(spec(5))).toBe(0);
  });

  it('particles die at the end of their life and their slots are reused', () => {
    const pool = new ParticlePool({ capacity: 20 });
    pool.emit(spec(10, { life: [100, 100] }));
    pool.emit(spec(5, { life: [300, 300] }));
    pool.update(50);
    expect(pool.count).toBe(15);
    pool.update(60); // the 100 ms ones are gone, the long ones survive (swap-remove keeps them)
    expect(pool.count).toBe(5);
    expect(pool.emit(spec(15))).toBe(15);
    pool.update(1000);
    expect(pool.count).toBe(0);
  });

  it('staggered particles wait before ageing', () => {
    const pool = new ParticlePool({ capacity: 10, random: () => 0.999 });
    pool.emit(spec(3, { stagger: 200, life: [100, 100] }));
    pool.update(150); // still waiting (delay ~200)
    expect(pool.count).toBe(3);
    pool.update(60);
    pool.update(99);
    expect(pool.count).toBe(3);
    pool.update(10);
    expect(pool.count).toBe(0);
  });

  it('is deterministic with the default seeded random source', () => {
    const run = (): number => {
      const pool = new ParticlePool({ capacity: 10 });
      pool.emit(spec(1, { life: [100, 900] }));
      let alive = 0;
      for (let t = 0; t < 1000; t += 50) {
        pool.update(50);
        if (pool.count) alive += 50;
      }
      return alive;
    };
    expect(run()).toBe(run());
    const a = makeRandom(1);
    const b = makeRandom(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('update and emit do not allocate per particle (typed arrays, fixed size)', () => {
    const pool = new ParticlePool({ capacity: 300 });
    const internals = pool as unknown as Record<string, unknown>;
    const arrays = Object.values(internals).filter((v) => ArrayBuffer.isView(v));
    expect(arrays.length).toBeGreaterThanOrEqual(10);
    expect(arrays.every((a) => (a as Float32Array).length === 300)).toBe(true);
    for (let i = 0; i < 20; i++) {
      pool.emit(spec(40));
      pool.update(16);
    }
    // Same array objects after heavy use: nothing was reallocated.
    expect(Object.values(internals).filter((v) => ArrayBuffer.isView(v))).toEqual(arrays);
  });
});

describe('BoardFx', () => {
  const layout = computeLayout(400, 4);

  it('scales burst sizes by density (frame budget / reduced motion)', () => {
    const fx = new BoardFx({ capacity: 500 });
    fx.setLayout(layout);
    const burst = {
      row: 1,
      col: 1,
      shape: 'spark' as const,
      count: 40,
      colors: ['#00ff00'],
      speed: [1, 2] as const,
      life: [200, 300] as const,
      size: [0.05, 0.1] as const,
    };
    expect(fx.burst(burst)).toBe(40);
    fx.density = 0.25;
    expect(fx.burst(burst)).toBe(10);
    fx.density = 0;
    expect(fx.burst(burst)).toBe(0);
  });

  it('reduced motion: no shake, no nudge; the layer goes idle when everything ends', () => {
    const fx = new BoardFx();
    fx.setLayout(layout);
    fx.reduced = true;
    fx.shake.enabled = false;
    fx.addTrauma(1);
    fx.nudge(1, 0);
    expect(fx.offset()).toEqual({ x: 0, y: 0 });
    expect(fx.active).toBe(false);

    fx.reduced = false;
    fx.shake.enabled = true;
    fx.nudge(1, 0);
    fx.update(40);
    expect(fx.offset().x).toBeGreaterThan(0);
    fx.floatText(0, 0, '+4', '#fff', 0);
    expect(fx.active).toBe(true);
    for (let i = 0; i < 100; i++) fx.update(16);
    expect(fx.active).toBe(false);
  });

  it('the invalid-move nudge goes out, springs back past rest, and settles at 0', () => {
    expect(nudgeAmount(0)).toBe(0);
    expect(nudgeAmount(45)).toBeCloseTo(1, 5);
    const samples = Array.from({ length: 60 }, (_, i) => nudgeAmount(45 + i * 3));
    expect(Math.min(...samples)).toBeLessThan(0);
    expect(nudgeAmount(1000)).toBe(0);
  });
});

describe('TraumaShake', () => {
  it('trauma accumulates, saturates at 1 and decays linearly', () => {
    const s = new TraumaShake({ decay: 2 });
    s.add(0.3);
    s.add(0.3);
    expect(s.trauma).toBeCloseTo(0.6);
    s.add(5);
    expect(s.trauma).toBe(1);
    s.update(250);
    expect(s.trauma).toBeCloseTo(0.5);
    s.update(1000);
    expect(s.trauma).toBe(0);
    expect(s.active).toBe(false);
  });

  it('offset grows with trauma squared, so small events barely move the board', () => {
    const peak = (trauma: number): number => {
      let m = 0;
      for (let t = 0; t < 2000; t += 7) {
        const o = shakeOffset(trauma, t, 10);
        m = Math.max(m, Math.abs(o.x), Math.abs(o.y));
      }
      return m;
    };
    expect(peak(0)).toBe(0);
    expect(peak(0.5) / peak(1)).toBeCloseTo(0.25, 1);
    expect(peak(0.1)).toBeLessThan(0.11); // a 64-merge's trauma: well under a pixel
    expect(peak(1)).toBeLessThanOrEqual(10);
  });

  it('noise is smooth: consecutive frames move only a little', () => {
    let worst = 0;
    for (let t = 0; t < 1000; t += 16) {
      const a = shakeOffset(1, t, 10);
      const b = shakeOffset(1, t + 16, 10);
      worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y));
    }
    expect(worst).toBeLessThan(10); // random jitter could jump up to 2 × 10√2 ≈ 28 px
  });

  it('ignores trauma while disabled', () => {
    const s = new TraumaShake();
    s.enabled = false;
    s.add(1);
    expect(s.trauma).toBe(0);
  });
});

describe('FrameBudget', () => {
  it('stays at full quality on time, cuts it on slow frames and recovers slowly', () => {
    const b = new FrameBudget();
    for (let i = 0; i < 60; i++) b.record(16.7);
    expect(b.quality).toBe(1);
    for (let i = 0; i < 60; i++) b.record(50);
    expect(b.quality).toBe(0.25);
    for (let i = 0; i < 24; i++) b.record(16.7);
    const partial = b.quality;
    expect(partial).toBeGreaterThan(0.25);
    expect(partial).toBeLessThan(1);
    for (let i = 0; i < 400; i++) b.record(16.7);
    expect(b.quality).toBe(1);
  });

  it('ignores zero and absurd frame lengths (first frame, tab switch)', () => {
    const b = new FrameBudget();
    for (let i = 0; i < 50; i++) {
      b.record(0);
      b.record(5000);
    }
    expect(b.average).toBe(0);
    expect(b.quality).toBe(1);
  });
});

describe('BoardView juice timing', () => {
  const byId = (frames: SpriteFrame[], id: number): SpriteFrame | undefined =>
    frames.find((f) => f.id === id);

  it('staggers the pops of several merges in one move and reports when each lands', () => {
    const state = stateFromGrid([
      [2, 2, 0, 0],
      [4, 4, 0, 0],
      [8, 8, 0, 0],
      [0, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.syncTo(state);
    const result = move(state, 'left');
    const cues = view.apply(result.phases, 0);
    const merges = cues.filter((c) => c.event.type === 'merge');
    expect(merges.map((c) => c.hit)).toEqual([
      T.slide,
      T.slide + T.stagger,
      T.slide + 2 * T.stagger,
    ]);
    expect(merges.every((c) => c.at === 0)).toBe(true);
    // Every cue of the same apply shares a step id; the next apply gets a new one.
    expect(new Set(cues.map((c) => c.step)).size).toBe(1);
    const next = view.apply(move(result.state, 'right').phases, 1000);
    expect(next[0]?.step).toBe((cues[0]?.step ?? 0) + 1);
  });

  it('a big merge winds up (dips) before its pop', () => {
    const state = stateFromGrid([
      [BIG_MERGE / 2, BIG_MERGE / 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.syncTo(state);
    const result = move(state, 'left');
    const cue = view.apply(result.phases, 0).find((c) => c.event.type === 'merge');
    if (cue?.event.type !== 'merge') throw new Error('expected a merge');
    expect(cue.hit).toBe(T.slide + T.anticipation);
    const id = cue.event.resultId;
    const dip = byId(view.frame(T.slide + T.anticipation - 1), id)?.scale ?? 1;
    expect(dip).toBeLessThan(0.8);
    const pops = Array.from(
      { length: 20 },
      (_, i) => byId(view.frame(cue.hit + i * 12), id)?.scale ?? 0,
    );
    expect(Math.max(...pops)).toBeGreaterThan(1.05);
  });

  it('squashes a tile when it lands and springs back to 1×1', () => {
    const state = stateFromGrid([
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.syncTo(state);
    view.apply(move(state, 'left').phases, 0);
    const moving = byId(view.frame(T.slide / 2), 1);
    expect(moving?.sx).toBeGreaterThan(1); // stretched along the motion
    const landed = byId(view.frame(T.slide + 1), 1);
    expect(landed?.sx).toBeLessThan(1); // squashed against the wall
    expect(landed?.sy).toBeGreaterThan(1);
    const rest = byId(view.frame(T.slide + T.squash), 1);
    expect(rest?.sx).toBe(1);
    expect(rest?.sy).toBe(1);
  });

  it('reduced motion: no squash, no wind-up; positions and pops are unchanged', () => {
    const state = stateFromGrid([
      [BIG_MERGE / 2, BIG_MERGE / 2, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.squashEnabled = false;
    view.syncTo(state);
    const cues = view.apply(move(state, 'left').phases, 0);
    const merge = cues.find((c) => c.event.type === 'merge');
    expect(merge?.hit).toBe(T.slide);
    for (let t = 0; t < 400; t += 10) {
      for (const f of view.frame(t)) {
        expect(f.sx).toBe(1);
        expect(f.sy).toBe(1);
      }
    }
  });

  it('chain merges land after the slide merges (a combo plays as a sequence)', () => {
    const out = turnOn(
      [
        [2, 2, 4, 8],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      'left',
      { relics: ['chain'] },
    );
    const view = new BoardView(4);
    view.syncTo(
      stateFromGrid([
        [2, 2, 4, 8],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
    );
    const hits = view
      .apply(out.phases, 0)
      .filter((c) => c.event.type === 'merge')
      .map((c) => c.hit);
    expect(hits.length).toBe(3);
    expect([...hits].sort((a, b) => a - b)).toEqual(hits);
    expect(new Set(hits).size).toBe(3);
  });
});
