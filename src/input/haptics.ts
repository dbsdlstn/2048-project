/**
 * Vibration as an extra, not as core feedback. `navigator.vibrate` works in
 * Chrome / Samsung Internet on Android; Safari on iOS (and every iOS browser,
 * which all use WebKit) has no vibration API at all, so there this is a
 * silent no-op and the settings sheet hides the switch. Every haptic event is
 * also seen and heard, so nobody misses information without it.
 *
 * Patterns are tiny on purpose: a phone buzzing on every merge gets annoying
 * within a minute. Small merges do not vibrate at all.
 */

export type HapticKind =
  'merge' | 'mergeBig' | 'stone' | 'bomb' | 'boss' | 'invalid' | 'stageClear' | 'failure';

/** Vibration patterns in ms (on, off, on, ...). */
export const HAPTIC_PATTERNS: Readonly<Record<HapticKind, number | readonly number[]>> = {
  merge: 8,
  mergeBig: 18,
  stone: [10, 30, 8],
  bomb: [28, 30, 14],
  boss: [30, 50, 60],
  invalid: 6,
  stageClear: [16, 60, 16, 60, 40],
  failure: [40, 80, 60],
};

/** Importance per kind: within the rate-limit window only a stronger pattern gets through. */
const RANK: Readonly<Record<HapticKind, number>> = {
  invalid: 0,
  merge: 1,
  stone: 2,
  mergeBig: 2,
  bomb: 3,
  boss: 4,
  stageClear: 4,
  failure: 4,
};

/** Minimum time between two vibrations (ms). */
export const HAPTIC_GAP = 90;

export type VibrateFn = (pattern: number | number[]) => boolean;

/** `navigator.vibrate` bound to navigator, or null where it does not exist (iOS). */
export function browserVibrate(): VibrateFn | null {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  if (!nav || typeof nav.vibrate !== 'function') return null;
  return (pattern) => nav.vibrate(pattern);
}

export class Haptics {
  private enabledFlag = true;
  private lastAt = Number.NEGATIVE_INFINITY;
  private lastRank = -1;
  /** What was requested and whether it went through (debug hook, tests). */
  readonly log: { kind: HapticKind; t: number; sent: boolean }[] = [];

  constructor(
    private readonly vibrate: VibrateFn | null,
    private readonly now: () => number,
  ) {}

  /** False where the device / browser cannot vibrate. */
  get supported(): boolean {
    return this.vibrate !== null;
  }

  get enabled(): boolean {
    return this.enabledFlag;
  }

  setEnabled(enabled: boolean): void {
    this.enabledFlag = enabled;
    if (!enabled && this.vibrate) this.vibrate(0);
  }

  /** Vibrates if supported, enabled and not rate-limited. Returns whether it did. */
  play(kind: HapticKind): boolean {
    const t = this.now();
    let sent = false;
    if (this.vibrate && this.enabledFlag) {
      const rank = RANK[kind];
      const free = t - this.lastAt >= HAPTIC_GAP;
      if (free || rank > this.lastRank) {
        const p = HAPTIC_PATTERNS[kind];
        try {
          sent = this.vibrate(typeof p === 'number' ? p : [...p]);
        } catch {
          sent = false;
        }
        if (sent) {
          this.lastAt = t;
          this.lastRank = rank;
        }
      }
    }
    this.log.push({ kind, t, sent });
    if (this.log.length > 100) this.log.shift();
    return sent;
  }
}
