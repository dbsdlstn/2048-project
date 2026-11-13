/**
 * The board's "juice" layer: particles, trauma shake, floating score / combo
 * text and the invalid-move nudge. The renderer owns one `BoardFx`,
 * updates it every animated frame and draws it above the tiles. Everything is
 * addressed in cells (row / col) and converted with the current layout, so
 * callers (the feedback director) never deal with pixels.
 *
 * Time here runs on the frame's `dt`, not on the view clock: during a
 * hit-stop the tiles hold still while sparks keep flying, which is what sells
 * the impact.
 */
import { cellCenter, computeLayout, type BoardLayout } from './layout';
import { ParticlePool, type BurstSpec } from './particles';
import { TraumaShake } from './shake';
import type { CanvasFactory } from './spriteCache';
import { mixHex, type Theme } from './theme';
import { easeOutCubic, easeOutQuad, easeOutSpring, clamp } from './tween';

/** A burst described in cells; sizes and speeds are fractions of a cell. */
export interface CellBurst extends Omit<
  BurstSpec,
  'x' | 'y' | 'speed' | 'size' | 'jitter' | 'radius'
> {
  readonly row: number;
  readonly col: number;
  /** Speed in cells per second. */
  readonly speed: readonly [number, number];
  /** Size as a fraction of a cell. */
  readonly size: readonly [number, number];
  /** Random start offset as a fraction of a cell. */
  readonly jitter?: number;
  /** Start distance from the centre along each particle's direction, as a fraction of a cell. */
  readonly radius?: number;
  /** Downward acceleration in cells per second² (negative rises). */
  readonly gravity?: number;
}

interface FloatText {
  active: boolean;
  text: string;
  color: string;
  x: number;
  y: number;
  /** Centre of the cell it belongs to. */
  anchorY: number;
  tag: string;
  /** Font size in px. */
  size: number;
  age: number;
  life: number;
  /** Rise over the lifetime, in px. */
  rise: number;
}

const TEXT_SLOTS = 10;
/** Floating text holds until this fraction of its life, then fades. */
const FADE_FROM = 0.6;
const NUDGE_OUT = 45;
const NUDGE_BACK = 190;
const nudgeSpring = easeOutSpring(5, 12);

export interface BoardFxOptions {
  readonly createCanvas?: CanvasFactory;
  readonly capacity?: number;
  readonly random?: () => number;
  readonly fontFamily?: string;
}

export class BoardFx {
  readonly particles: ParticlePool;
  readonly shake = new TraumaShake();
  private layout: BoardLayout = computeLayout(1, 4);
  private readonly texts: FloatText[] = [];
  private nudgeX = 0;
  private nudgeY = 0;
  private nudgeAge = Infinity;
  private font: string;
  private textOutline = 'rgba(6, 6, 16, 0.9)';
  private ink = '#000000';
  private textInk = 0;
  /** Multiplies every burst's particle count: frame budget × motion setting. */
  density = 1;
  /** Reduced motion: no shake, no nudge, texts fade in place. */
  reduced = false;
  /** Free-running time (ms) for the shake noise. */
  private time = 0;

  constructor(options: BoardFxOptions = {}) {
    this.particles = new ParticlePool({
      ...(options.createCanvas ? { createCanvas: options.createCanvas } : {}),
      ...(options.random ? { random: options.random } : {}),
      capacity: options.capacity ?? 320,
    });
    this.font = options.fontFamily ?? 'system-ui, sans-serif';
    for (let i = 0; i < TEXT_SLOTS; i++) this.texts.push(blankText());
  }

  /** Takes the theme's particle style and text colours. */
  applyTheme(theme: Theme): void {
    this.font = theme.fontFamily;
    this.textOutline = theme.textOutline;
    this.ink = theme.ink;
    this.textInk = theme.textInk;
    this.particles.style = theme.particles;
  }

  setLayout(layout: BoardLayout): void {
    // Shake strength follows the board size: ~2.2% of the board at full trauma.
    this.shake.maxOffset = Math.max(4, layout.size * 0.022);
    this.layout = layout;
  }

  get active(): boolean {
    return (
      this.particles.count > 0 ||
      this.shake.active ||
      this.nudgeAge < NUDGE_OUT + NUDGE_BACK ||
      this.texts.some((t) => t.active)
    );
  }

  /** Emits a burst at a cell (fractional cells allowed). Returns the particles added. */
  burst(spec: CellBurst): number {
    const { row, col, speed, size, jitter, radius, ...rest } = spec;
    const c = cellCenter(this.layout, row, col);
    const cell = this.layout.cell;
    const count = Math.round(spec.count * this.density);
    if (count <= 0) return 0;
    return this.particles.emit({
      ...rest,
      count,
      x: c.x,
      y: c.y,
      speed: [(speed[0] * cell) / 1000, (speed[1] * cell) / 1000],
      size: [size[0] * cell, size[1] * cell],
      jitter: (jitter ?? 0) * cell,
      radius: (radius ?? 0) * cell,
      ...(spec.gravity !== undefined ? { gravity: (spec.gravity * cell) / 1e6 } : {}),
    });
  }

  /** Adds screen-shake trauma (ignored in reduced motion). */
  addTrauma(amount: number): void {
    this.shake.add(amount);
  }

  /**
   * A floating label rising from a cell ("+128", "+32 ×3" for a combo).
   * `weight` 0..1 scales size, lift and how long it stays.
   */
  floatText(
    row: number,
    col: number,
    text: string,
    color: string,
    weight: number,
    /** Labels sharing a tag do not pile up: an older one fades out when a newer one appears. */
    tag = '',
  ): void {
    const c = cellCenter(this.layout, row, col);
    const w = clamp(weight, 0, 1);
    const cell = this.layout.cell;
    // A newer label from the same cell (a chain merging on the spot) replaces the old one.
    for (const t of this.texts) {
      if (!t.active) continue;
      if (Math.abs(t.x - c.x) < cell / 2 && Math.abs(t.anchorY - c.y) < cell / 2) {
        t.active = false;
      } else if (tag !== '' && t.tag === tag) {
        t.age = Math.max(t.age, t.life * 0.85);
      }
    }
    const slot = this.texts.find((t) => !t.active) ?? oldest(this.texts);
    slot.active = true;
    slot.text = text;
    slot.color = color;
    slot.x = c.x;
    slot.anchorY = c.y;
    slot.tag = tag;
    // Starts at the tile's top edge and rises off it: the tile's own number stays readable.
    slot.y = c.y - cell * 0.4;
    slot.size = cell * (0.2 + 0.14 * w);
    slot.age = 0;
    slot.life = 620 + 260 * w;
    slot.rise = this.reduced ? 0 : cell * (0.42 + 0.25 * w);
  }

  /** Bumps the board a few px towards `(dx, dy)` and springs it back (invalid move). */
  nudge(dx: number, dy: number): void {
    if (this.reduced) return;
    const amp = this.layout.size * 0.018;
    this.nudgeX = dx * amp;
    this.nudgeY = dy * amp;
    this.nudgeAge = 0;
  }

  update(dt: number): void {
    this.time += dt;
    this.particles.update(dt);
    this.shake.update(dt);
    this.nudgeAge += dt;
    for (const t of this.texts) advance(t, dt);
  }

  /** Camera offset this frame (shake + nudge), in CSS px. */
  offset(): { x: number; y: number } {
    const s = this.shake.offset(this.time);
    const n = nudgeAmount(this.nudgeAge);
    return { x: s.x + this.nudgeX * n, y: s.y + this.nudgeY * n };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.particles.draw(ctx);
    if (!this.texts.some((t) => t.active)) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const t of this.texts) if (t.active) this.drawText(ctx, t);
    ctx.restore();
  }

  clear(): void {
    this.particles.clear();
    this.shake.clear();
    this.nudgeAge = Infinity;
    for (const t of this.texts) t.active = false;
  }

  private drawText(ctx: CanvasRenderingContext2D, t: FloatText): void {
    const p = t.age / t.life;
    // Quick fade-in, hold, fade out over the last 40 %.
    const alpha =
      Math.min(1, p / 0.08) * (p < FADE_FROM ? 1 : 1 - (p - FADE_FROM) / (1 - FADE_FROM));
    if (alpha <= 0) return;
    const pop = this.reduced ? 1 : 1 + 0.25 * (1 - easeOutCubic(Math.min(1, p / 0.18)));
    const size = t.size * pop;
    // Never above the canvas edge (top-row labels would be cut off).
    const y = Math.max(size * 0.62, t.y - t.rise * easeOutQuad(p));
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${size.toFixed(1)}px ${this.font}`;
    ctx.strokeStyle = this.textOutline;
    ctx.lineWidth = Math.max(2, size * 0.22);
    ctx.strokeText(t.text, t.x, y);
    // On a bright page a pale accent would vanish: it is inked down towards dark.
    ctx.fillStyle = this.textInk > 0 ? mixHex(t.color, this.ink, this.textInk) : t.color;
    ctx.fillText(t.text, t.x, y);
  }
}

/** Nudge displacement (0..1, briefly negative on the rebound) at `age` ms. */
export function nudgeAmount(age: number): number {
  if (age < 0 || age >= NUDGE_OUT + NUDGE_BACK) return 0;
  if (age < NUDGE_OUT) return easeOutQuad(age / NUDGE_OUT);
  return 1 - nudgeSpring((age - NUDGE_OUT) / NUDGE_BACK);
}

function blankText(): FloatText {
  return {
    active: false,
    text: '',
    color: '#fff',
    x: 0,
    y: 0,
    anchorY: 0,
    tag: '',
    size: 10,
    age: 0,
    life: 1,
    rise: 0,
  };
}

function advance(t: FloatText, dt: number): void {
  if (!t.active) return;
  t.age += dt;
  if (t.age >= t.life) t.active = false;
}

function oldest(texts: FloatText[]): FloatText {
  let best = texts[0] as FloatText;
  for (const t of texts) if (t.age / t.life > best.age / best.life) best = t;
  return best;
}
