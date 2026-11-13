/**
 * Decides *whether, when and how* a sound plays; the backend (webaudio.ts)
 * only turns a decision into Web Audio nodes. Keeping the decisions here, with
 * the backend and the clock injected, lets the tests run every rule in Node
 * with a fake backend:
 *
 * - nothing plays until the first user gesture unlocks audio (browsers block
 *   it before that), or while sound is off;
 * - the same sound at the same pitch is not restarted within its `minGap`
 *   (stacked copies of one sound only add mud and volume);
 * - at most `maxVoices` sounds overlap; a more important sound takes the slot
 *   of the least important one, a less important one is dropped;
 * - late cues (the player already moved again) are mostly dropped: only
 *   `important` sounds play, and only one per short window, so a fast player
 *   never hears a burst of stacked sounds.
 */
import { soundDuration, type SoundDef } from './synth';
import { SOUNDS, type SoundId } from './sounds';

/** A started sound the engine may cut short to free its slot. */
export interface VoiceHandle {
  stop(): void;
}

/** What the engine needs from an audio output (the Web Audio one, or a fake). */
export interface SynthBackend {
  /** Output clock in seconds. */
  readonly time: number;
  /** Schedules `def` at output time `at` (s), pitch-shifted by `semitones`, scaled by `gain`. */
  play(def: SoundDef, at: number, semitones: number, gain: number): VoiceHandle;
  setVolume(volume: number): void;
  resume(): Promise<void>;
  suspend(): Promise<void>;
}

export interface PlayOptions {
  /** Pitch shift in semitones. */
  readonly pitch?: number;
  /** Extra gain on top of the sound's own levels (0..1). */
  readonly gain?: number;
  /** Start this many ms from now. */
  readonly delay?: number;
  /** The cue was fast-forwarded (see `late` in the renderer's CueListener). */
  readonly late?: boolean;
}

export type PlayResult = 'played' | 'off' | 'locked' | 'throttled' | 'late' | 'capped';

export interface SoundLogEntry {
  readonly id: SoundId;
  /** Engine clock (ms) when it was requested. */
  readonly t: number;
  readonly pitch: number;
  readonly late: boolean;
  readonly result: PlayResult;
}

export interface AudioEngineOptions {
  /**
   * Creates the output on the first gesture. Returns null when Web Audio is
   * unavailable: the game then simply stays silent.
   */
  readonly createBackend: () => SynthBackend | null;
  /** Clock in ms for throttling (any monotonic clock). */
  readonly now: () => number;
  readonly maxVoices?: number;
  /** Keep a log of the last requests (debug hook, tests). */
  readonly log?: boolean;
  readonly sounds?: Readonly<Record<SoundId, SoundDef>>;
}

interface Voice {
  readonly id: SoundId;
  readonly priority: number;
  readonly until: number;
  readonly handle: VoiceHandle;
}

/** Only one late sound per this many ms. */
export const LATE_WINDOW = 150;
/** Scheduling lead (s): a sound set in the past gets clipped by some browsers. */
const LEAD = 0.01;
const LOG_SIZE = 200;

export class AudioEngine {
  private backend: SynthBackend | null = null;
  private tried = false;
  private enabledFlag = true;
  private volumeLevel = 0.8;
  private hidden = false;
  private readonly voices: Voice[] = [];
  /** Last start per sound and pitch: a combo's rising notes are distinct sounds, repeats are not. */
  private readonly lastPlayed = new Map<string, number>();
  private lastLate = Number.NEGATIVE_INFINITY;
  private readonly maxVoices: number;
  private readonly sounds: Readonly<Record<SoundId, SoundDef>>;
  readonly log: SoundLogEntry[] = [];

  constructor(private readonly options: AudioEngineOptions) {
    this.maxVoices = options.maxVoices ?? 10;
    this.sounds = options.sounds ?? SOUNDS;
  }

  /** True once the output exists (after the first gesture, if Web Audio is there). */
  get unlocked(): boolean {
    return this.backend !== null;
  }

  get enabled(): boolean {
    return this.enabledFlag;
  }

  get volume(): number {
    return this.volumeLevel;
  }

  /** Sounds currently overlapping (after dropping finished ones). */
  activeVoices(): number {
    this.prune(this.options.now());
    return this.voices.length;
  }

  /**
   * Call from a user gesture (pointerdown / keydown): creates or resumes the
   * output. Safe to call on every gesture; only the first one does work,
   * later ones just make sure a suspended context runs again.
   */
  unlock(): void {
    // The output is created even while sound is off: turning it on later
    // happens in a click, but the unlock must come from a gesture anyway.
    if (!this.tried) {
      this.tried = true;
      try {
        this.backend = this.options.createBackend();
      } catch {
        this.backend = null;
      }
      this.backend?.setVolume(this.volumeLevel);
    }
    if (this.backend && this.enabledFlag && !this.hidden) {
      void this.backend.resume().catch(() => undefined);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabledFlag = enabled;
    if (!enabled) {
      this.stopAll();
      void this.backend?.suspend().catch(() => undefined);
    } else if (this.backend && !this.hidden) {
      void this.backend.resume().catch(() => undefined);
    }
  }

  setVolume(volume: number): void {
    this.volumeLevel = Math.max(0, Math.min(1, volume));
    this.backend?.setVolume(this.volumeLevel);
  }

  /** Page hidden: suspend the output (saves battery, and nothing should play in the background). */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (!this.backend) return;
    if (hidden) {
      this.stopAll();
      void this.backend.suspend().catch(() => undefined);
    } else if (this.enabledFlag) {
      void this.backend.resume().catch(() => undefined);
    }
  }

  play(id: SoundId, options: PlayOptions = {}): PlayResult {
    const now = this.options.now();
    const late = options.late ?? false;
    const pitch = options.pitch ?? 0;
    const result = this.decide(id, now, late, pitch);
    if (this.options.log) {
      this.log.push({ id, t: now, pitch, late, result });
      if (this.log.length > LOG_SIZE) this.log.splice(0, this.log.length - LOG_SIZE);
    }
    if (result !== 'played') return result;
    const backend = this.backend as SynthBackend;
    const def = this.sounds[id];
    const at = backend.time + LEAD + Math.max(0, options.delay ?? 0) / 1000;
    const handle = backend.play(def, at, pitch, options.gain ?? 1);
    const length = soundDuration(def) * 1000 + Math.max(0, options.delay ?? 0);
    this.voices.push({ id, priority: def.priority, until: now + length, handle });
    this.lastPlayed.set(`${id}:${pitch}`, now);
    if (late) this.lastLate = now;
    return result;
  }

  private decide(id: SoundId, now: number, late: boolean, pitch: number): PlayResult {
    if (!this.enabledFlag || this.hidden) return 'off';
    if (!this.backend) return 'locked';
    const def = this.sounds[id];
    if (late && (!def.important || now - this.lastLate < LATE_WINDOW)) return 'late';
    const last = this.lastPlayed.get(`${id}:${pitch}`);
    if (last !== undefined && now - last < def.minGap) return 'throttled';
    this.prune(now);
    if (this.voices.length >= this.maxVoices) {
      // Steal the least important (oldest among equals) voice, if this sound outranks it.
      let victim = -1;
      for (let i = 0; i < this.voices.length; i++) {
        const v = this.voices[i] as Voice;
        if (v.priority >= def.priority) continue;
        if (victim < 0 || v.priority < (this.voices[victim] as Voice).priority) victim = i;
      }
      if (victim < 0) return 'capped';
      this.voices[victim]?.handle.stop();
      this.voices.splice(victim, 1);
    }
    return 'played';
  }

  private prune(now: number): void {
    for (let i = this.voices.length - 1; i >= 0; i--) {
      if ((this.voices[i] as Voice).until <= now) this.voices.splice(i, 1);
    }
  }

  private stopAll(): void {
    for (const v of this.voices) v.handle.stop();
    this.voices.length = 0;
  }
}
