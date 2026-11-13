/**
 * Time and frame scheduling as an injectable dependency. Animation code never
 * calls `performance.now()` or `requestAnimationFrame` directly, so tests and
 * debug tools can step time by hand and get exactly the same frames every run.
 */

export type FrameCallback = (time: number) => void;

export interface FrameClock {
  /** Current time in ms, on the same timeline as the times passed to frame callbacks. */
  now(): number;
  /** Runs `callback` once before the next frame. Returns a handle for `cancelFrame`. */
  requestFrame(callback: FrameCallback): number;
  cancelFrame(handle: number): void;
}

/** The real browser clock: `performance.now()` + `requestAnimationFrame`. */
export const browserClock: FrameClock = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => {
    cancelAnimationFrame(handle);
  },
};

/** Default frame length for manual stepping (60 Hz). */
export const FRAME_MS = 1000 / 60;

/**
 * A clock that only moves when told to. Pending frame callbacks run on every
 * simulated frame inside `advance`.
 */
export class ManualClock implements FrameClock {
  private time: number;
  private readonly queue = new Map<number, FrameCallback>();
  private nextHandle = 1;

  constructor(startTime = 0) {
    this.time = startTime;
  }

  now(): number {
    return this.time;
  }

  requestFrame(callback: FrameCallback): number {
    const handle = this.nextHandle++;
    this.queue.set(handle, callback);
    return handle;
  }

  cancelFrame(handle: number): void {
    this.queue.delete(handle);
  }

  /** Number of callbacks waiting for the next frame. */
  get pendingFrames(): number {
    return this.queue.size;
  }

  /**
   * Moves time forward by `ms`, running a frame every `frameMs` (and one at the
   * end). `advance(0)` runs one frame without moving time.
   */
  advance(ms: number, frameMs: number = FRAME_MS): void {
    const end = this.time + Math.max(0, ms);
    do {
      this.time = Math.min(end, this.time + frameMs);
      this.flush();
    } while (this.time < end);
  }

  /** Runs the callbacks queued so far (callbacks they queue wait for the next frame). */
  flush(): void {
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    for (const callback of callbacks) callback(this.time);
  }
}

/**
 * Runs on a real clock until paused; while paused, time only moves through
 * `advance`. Used by the `?debug` hook to freeze the game and step it exactly.
 */
export class PausableClock implements FrameClock {
  private readonly queue = new Map<number, FrameCallback>();
  private nextHandle = 1;
  private realHandle: number | null = null;
  private pausedAt: number | null = null;

  constructor(private readonly real: FrameClock = browserClock) {}

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  now(): number {
    return this.pausedAt ?? this.real.now();
  }

  requestFrame(callback: FrameCallback): number {
    const handle = this.nextHandle++;
    this.queue.set(handle, callback);
    this.scheduleReal();
    return handle;
  }

  cancelFrame(handle: number): void {
    this.queue.delete(handle);
  }

  pause(): void {
    this.pausedAt ??= this.real.now();
  }

  /** Returns to real time. Animations scheduled in paused time simply count as finished. */
  resume(): void {
    this.pausedAt = null;
    this.scheduleReal();
  }

  /** Pauses (if needed) and steps time forward by `ms`, one frame every `frameMs`. */
  advance(ms: number, frameMs: number = FRAME_MS): void {
    this.pause();
    let time = this.now();
    const end = time + Math.max(0, ms);
    do {
      time = Math.min(end, time + frameMs);
      this.pausedAt = time;
      this.flush(time);
    } while (time < end);
  }

  private scheduleReal(): void {
    if (this.paused || this.realHandle !== null || this.queue.size === 0) return;
    this.realHandle = this.real.requestFrame((time) => {
      this.realHandle = null;
      if (!this.paused) this.flush(time);
    });
  }

  private flush(time: number): void {
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    for (const callback of callbacks) callback(time);
  }
}
