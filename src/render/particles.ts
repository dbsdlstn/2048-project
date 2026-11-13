/**
 * A fixed-size particle pool. Every particle lives in parallel typed arrays
 * (struct of arrays), so emitting, moving and drawing never allocate: no
 * objects per particle, no garbage for the collector to stall a frame on.
 * Live particles are packed at the front ([0, count)); a dead one is replaced
 * by the last live one ("swap remove"), so the loops never skip holes.
 *
 * Drawing is additive (`lighter`): overlapping sparks brighten towards white,
 * which reads as neon light without any blur. Glow dots are one small
 * pre-rendered radial-gradient image per colour, copied with `drawImage`.
 */
import type { CanvasFactory } from './spriteCache';

/**
 * - `spark`: a soft glow dot (pre-rendered sprite), shrinks as it fades.
 * - `bit`: a square that leaves a short trail along its (axis-aligned) motion:
 *   current running along the board's circuit traces.
 * - `shard`: a spinning triangle (stone fragments).
 * - `flake`: a spinning diamond (ice).
 * - `streak`: a line along the velocity (fast sparks, fireworks).
 */
export type ParticleShape = 'spark' | 'bit' | 'shard' | 'flake' | 'streak';

const SHAPES: readonly ParticleShape[] = ['spark', 'bit', 'shard', 'flake', 'streak'];

/** One burst: `count` particles around a point. Ranges are [min, max]. */
export interface BurstSpec {
  readonly x: number;
  readonly y: number;
  readonly count: number;
  readonly shape: ParticleShape;
  /** `#rrggbb` colours, picked at random per particle. */
  readonly colors: readonly string[];
  /** Speed in CSS px per ms. */
  readonly speed: readonly [number, number];
  /** Lifetime in ms. */
  readonly life: readonly [number, number];
  /** Size in CSS px (radius for sparks, edge for bits / shards). */
  readonly size: readonly [number, number];
  /** Downward acceleration in px/ms² (negative rises). Default 0. */
  readonly gravity?: number;
  /** Fraction of velocity kept per 16.7 ms. Default 0.9. */
  readonly drag?: number;
  /** Centre direction in radians (0 = right, π/2 = down). Default 0. */
  readonly angle?: number;
  /** Total angular spread in radians. Default 2π (all around). */
  readonly spread?: number;
  /** Snap each direction to the nearest board axis (circuit traces). */
  readonly axisAligned?: boolean;
  /** Random start offset from the centre, in px. Default 0. */
  readonly jitter?: number;
  /**
   * Start this far (px) from the centre along each particle's own direction:
   * a burst that starts at a tile's edge leaves its number readable.
   */
  readonly radius?: number;
  /** Rotation speed in radians per ms (shards, flakes). Default 0. */
  readonly spin?: number;
  /** Extra random wait before each particle appears, in ms. Default 0. */
  readonly stagger?: number;
}

/** Deterministic PRNG (mulberry32): bursts look the same in every screenshot run. */
export function makeRandom(seed = 0x5eed): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FRAME = 1000 / 60;
const GLOW_PX = 32;

export interface ParticlePoolOptions {
  readonly capacity?: number;
  /** Creates the glow sprites (one per colour). Without it sparks draw as plain dots. */
  readonly createCanvas?: CanvasFactory;
  readonly random?: () => number;
}

export class ParticlePool {
  readonly capacity: number;
  private n = 0;
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly size: Float32Array;
  private readonly rot: Float32Array;
  private readonly spin: Float32Array;
  private readonly gravity: Float32Array;
  private readonly drag: Float32Array;
  private readonly delay: Float32Array;
  private readonly shape: Uint8Array;
  private readonly color: Uint8Array;
  /** Colour registry: index <-> `#rrggbb`. Bounded (256) by the Uint8 index. */
  private readonly colors: string[] = [];
  private readonly colorIndex = new Map<string, number>();
  private readonly glows: (CanvasImageSource | null)[] = [];
  private readonly createCanvas: CanvasFactory | undefined;
  private readonly random: () => number;
  /** Particles refused because the pool was full (for stats / tests). */
  dropped = 0;

  constructor(options: ParticlePoolOptions = {}) {
    const cap = Math.max(1, options.capacity ?? 320);
    this.capacity = cap;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.age = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.rot = new Float32Array(cap);
    this.spin = new Float32Array(cap);
    this.gravity = new Float32Array(cap);
    this.drag = new Float32Array(cap);
    this.delay = new Float32Array(cap);
    this.shape = new Uint8Array(cap);
    this.color = new Uint8Array(cap);
    this.createCanvas = options.createCanvas;
    this.random = options.random ?? makeRandom();
  }

  /** Live particles (including ones still waiting out their stagger). */
  get count(): number {
    return this.n;
  }

  get free(): number {
    return this.capacity - this.n;
  }

  clear(): void {
    this.n = 0;
  }

  /**
   * Adds up to `spec.count` particles; fewer when the pool is nearly full (a
   * full pool refuses new particles rather than killing visible ones).
   * Returns how many were added.
   */
  emit(spec: BurstSpec): number {
    const want = Math.max(0, Math.floor(spec.count));
    const count = Math.min(want, this.free);
    this.dropped += want - count;
    if (count === 0 || spec.colors.length === 0) return 0;
    const rnd = this.random;
    const shape = SHAPES.indexOf(spec.shape);
    const spread = spec.spread ?? Math.PI * 2;
    const base = spec.angle ?? 0;
    const jitter = spec.jitter ?? 0;
    const drag = spec.drag ?? 0.9;
    for (let k = 0; k < count; k++) {
      const i = this.n++;
      let a = base + (spread >= Math.PI * 2 ? rnd() * spread : (rnd() - 0.5) * spread);
      if (spec.axisAligned) a = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
      const speed = range(spec.speed, rnd());
      const ja = rnd() * Math.PI * 2;
      const jr = jitter * rnd();
      const r0 = spec.radius ?? 0;
      this.x[i] = spec.x + Math.cos(ja) * jr + Math.cos(a) * r0;
      this.y[i] = spec.y + Math.sin(ja) * jr + Math.sin(a) * r0;
      this.vx[i] = Math.cos(a) * speed;
      this.vy[i] = Math.sin(a) * speed;
      this.age[i] = 0;
      this.life[i] = Math.max(1, range(spec.life, rnd()));
      this.size[i] = range(spec.size, rnd());
      this.rot[i] = rnd() * Math.PI * 2;
      this.spin[i] = (spec.spin ?? 0) * (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd());
      this.gravity[i] = spec.gravity ?? 0;
      this.drag[i] = drag;
      this.delay[i] = (spec.stagger ?? 0) * rnd();
      this.shape[i] = shape;
      const c = spec.colors[Math.floor(rnd() * spec.colors.length)] ?? spec.colors[0] ?? '#ffffff';
      this.color[i] = this.colorId(c);
    }
    return count;
  }

  /** Moves every particle by `dt` ms and drops the dead ones. */
  update(dt: number): void {
    let i = 0;
    while (i < this.n) {
      const wait = this.delay[i] ?? 0;
      if (wait > 0) {
        this.delay[i] = wait - dt;
        i++;
        continue;
      }
      const age = (this.age[i] ?? 0) + dt;
      if (age >= (this.life[i] ?? 0)) {
        this.kill(i);
        continue; // the particle swapped into slot i is processed next
      }
      this.age[i] = age;
      const keep = Math.pow(this.drag[i] ?? 1, dt / FRAME);
      const vx = (this.vx[i] ?? 0) * keep;
      const vy = (this.vy[i] ?? 0) * keep + (this.gravity[i] ?? 0) * dt;
      this.vx[i] = vx;
      this.vy[i] = vy;
      this.x[i] = (this.x[i] ?? 0) + vx * dt;
      this.y[i] = (this.y[i] ?? 0) + vy * dt;
      this.rot[i] = (this.rot[i] ?? 0) + (this.spin[i] ?? 0) * dt;
      i++;
    }
  }

  /** Draws every visible particle additively. The caller sets the transform. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.n === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    let lastColor = -1;
    for (let i = 0; i < this.n; i++) {
      if ((this.delay[i] ?? 0) > 0) continue;
      const t = (this.age[i] ?? 0) / (this.life[i] ?? 1);
      const fade = 1 - t;
      const alpha = fade * fade * (3 - 2 * fade); // smoothstep: holds, then falls off
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      const c = this.color[i] ?? 0;
      const x = this.x[i] ?? 0;
      const y = this.y[i] ?? 0;
      const s = this.size[i] ?? 1;
      const shape = SHAPES[this.shape[i] ?? 0];
      if (shape === 'spark') {
        const glow = this.glow(c);
        const r = s * (0.5 + 0.5 * fade);
        if (glow) ctx.drawImage(glow, x - r * 2, y - r * 2, r * 4, r * 4);
        else {
          if (c !== lastColor) {
            ctx.fillStyle = this.colors[c] ?? '#fff';
            ctx.strokeStyle = ctx.fillStyle;
            lastColor = c;
          }
          ctx.fillRect(x - r / 2, y - r / 2, r, r);
        }
        continue;
      }
      if (c !== lastColor) {
        const css = this.colors[c] ?? '#fff';
        ctx.fillStyle = css;
        ctx.strokeStyle = css;
        lastColor = c;
      }
      const vx = this.vx[i] ?? 0;
      const vy = this.vy[i] ?? 0;
      if (shape === 'bit') {
        // A square head with a trail behind it along the dominant axis.
        const trail = Math.min(s * 6, (Math.abs(vx) + Math.abs(vy)) * 40);
        if (Math.abs(vx) >= Math.abs(vy)) {
          const back = vx >= 0 ? -trail : 0;
          ctx.fillRect(x - s / 2 + back, y - s / 2, s + trail, s);
        } else {
          const back = vy >= 0 ? -trail : 0;
          ctx.fillRect(x - s / 2, y - s / 2 + back, s, s + trail);
        }
      } else if (shape === 'streak') {
        ctx.lineWidth = s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - vx * 28, y - vy * 28);
        ctx.stroke();
      } else {
        const r = this.rot[i] ?? 0;
        const cos = Math.cos(r) * s;
        const sin = Math.sin(r) * s;
        ctx.beginPath();
        if (shape === 'shard') {
          // An uneven triangle: reads as a broken fragment, not a confetti piece.
          ctx.moveTo(x + cos, y + sin);
          ctx.lineTo(x - cos * 0.6 - sin * 0.8, y - sin * 0.6 + cos * 0.8);
          ctx.lineTo(x - cos * 0.4 + sin * 0.5, y - sin * 0.4 - cos * 0.5);
        } else {
          ctx.moveTo(x + cos, y + sin);
          ctx.lineTo(x - sin * 0.5, y + cos * 0.5);
          ctx.lineTo(x - cos, y - sin);
          ctx.lineTo(x + sin * 0.5, y - cos * 0.5);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private kill(i: number): void {
    const last = --this.n;
    if (i === last) return;
    this.x[i] = this.x[last] ?? 0;
    this.y[i] = this.y[last] ?? 0;
    this.vx[i] = this.vx[last] ?? 0;
    this.vy[i] = this.vy[last] ?? 0;
    this.age[i] = this.age[last] ?? 0;
    this.life[i] = this.life[last] ?? 0;
    this.size[i] = this.size[last] ?? 0;
    this.rot[i] = this.rot[last] ?? 0;
    this.spin[i] = this.spin[last] ?? 0;
    this.gravity[i] = this.gravity[last] ?? 0;
    this.drag[i] = this.drag[last] ?? 0;
    this.delay[i] = this.delay[last] ?? 0;
    this.shape[i] = this.shape[last] ?? 0;
    this.color[i] = this.color[last] ?? 0;
  }

  private colorId(css: string): number {
    let id = this.colorIndex.get(css);
    if (id === undefined) {
      // 256 colours is far more than any theme uses; past that, reuse the first.
      if (this.colors.length >= 256) return 0;
      id = this.colors.length;
      this.colors.push(css);
      this.colorIndex.set(css, id);
    }
    return id;
  }

  /** The glow image of colour `c`, drawn once on first use. */
  private glow(c: number): CanvasImageSource | null {
    const cached = this.glows[c];
    if (cached !== undefined) return cached;
    let image: CanvasImageSource | null = null;
    const css = this.colors[c];
    if (this.createCanvas && css) {
      const canvas = this.createCanvas(GLOW_PX, GLOW_PX);
      const g = canvas.getContext('2d');
      if (g) {
        const h = GLOW_PX / 2;
        const grad = g.createRadialGradient(h, h, 0, h, h, h);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.18, css);
        grad.addColorStop(0.45, `${css}55`);
        grad.addColorStop(1, `${css}00`);
        g.fillStyle = grad;
        g.fillRect(0, 0, GLOW_PX, GLOW_PX);
        image = canvas;
      }
    }
    this.glows[c] = image;
    return image;
  }
}

function range(r: readonly [number, number], u: number): number {
  return r[0] + (r[1] - r[0]) * u;
}
