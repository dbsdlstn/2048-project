/**
 * On-demand frame loop. It only requests frames while the tick says there is
 * still something moving, so an idle board costs no CPU. DOM-free: frames come
 * from an injected `FrameClock`.
 */
import type { FrameClock } from './clock';

/**
 * Called once per frame with the frame time and the time since the previous
 * frame of the same burst (0 on the first). Return true to keep running.
 */
export type TickFunction = (now: number, dt: number) => boolean;

/** Longest step handed to a tick, so a backgrounded tab does not cause a jump. */
export const MAX_DT = 50;

export class AnimationLoop {
  private handle: number | null = null;
  private lastTime: number | null = null;

  constructor(
    private readonly clock: FrameClock,
    private readonly tick: TickFunction,
  ) {}

  /** True while a frame is scheduled. */
  get running(): boolean {
    return this.handle !== null;
  }

  /** Requests a frame (at most one pending request). */
  invalidate(): void {
    this.handle ??= this.clock.requestFrame(this.frame);
  }

  stop(): void {
    if (this.handle !== null) this.clock.cancelFrame(this.handle);
    this.handle = null;
    this.lastTime = null;
  }

  private readonly frame = (now: number): void => {
    this.handle = null;
    const dt = this.lastTime === null ? 0 : Math.min(MAX_DT, Math.max(0, now - this.lastTime));
    this.lastTime = now;
    if (this.tick(now, dt)) {
      this.invalidate();
    } else {
      // Idle: the next burst starts with a fresh dt.
      this.lastTime = null;
    }
  };
}
