/**
 * Adapts effect density to the device by measuring, not guessing. The
 * renderer reports the length of every animated frame; an exponential moving
 * average smooths out single hiccups (GC, a slow layout). When frames run
 * long, `quality` drops quickly (fewer particles per burst); when they are
 * comfortably on time again it climbs back slowly, so it does not oscillate.
 * Pure: no clock, no DOM.
 */

export interface FrameBudgetOptions {
  /** Average frame length (ms) above which quality is cut. ~45 fps by default. */
  readonly slowMs?: number;
  /** Average frame length (ms) below which quality may recover. ~55 fps by default. */
  readonly fastMs?: number;
  readonly minQuality?: number;
  /** Weight of the newest frame in the moving average. */
  readonly smoothing?: number;
  /** Frames to wait between two adjustments. */
  readonly settleFrames?: number;
}

export class FrameBudget {
  private ema = 0;
  private frames = 0;
  private sinceChange = 0;
  private q = 1;
  private readonly slowMs: number;
  private readonly fastMs: number;
  private readonly minQuality: number;
  private readonly smoothing: number;
  private readonly settleFrames: number;

  constructor(options: FrameBudgetOptions = {}) {
    this.slowMs = options.slowMs ?? 22;
    this.fastMs = options.fastMs ?? 18;
    this.minQuality = options.minQuality ?? 0.25;
    this.smoothing = options.smoothing ?? 0.15;
    this.settleFrames = options.settleFrames ?? 12;
  }

  /** 1 = full effects; down to `minQuality` on a struggling device. */
  get quality(): number {
    return this.q;
  }

  /** Smoothed frame length (ms); 0 before any frame was recorded. */
  get average(): number {
    return this.ema;
  }

  /** Records one animated frame's length. Zero or absurd values (tab switches) are ignored. */
  record(frameMs: number): void {
    if (!(frameMs > 0) || frameMs > 250) return;
    this.ema = this.frames === 0 ? frameMs : this.ema + (frameMs - this.ema) * this.smoothing;
    this.frames++;
    this.sinceChange++;
    if (this.frames < 4 || this.sinceChange < this.settleFrames) return;
    if (this.ema > this.slowMs && this.q > this.minQuality) {
      // Cut in proportion to how far over budget we are.
      const over = this.ema / this.slowMs;
      this.q = Math.max(this.minQuality, this.q / Math.min(2, over));
      this.sinceChange = 0;
    } else if (this.ema < this.fastMs && this.q < 1) {
      this.q = Math.min(1, this.q + 0.1);
      this.sinceChange = 0;
    }
  }
}
