/**
 * The sound format: a sound is a short list of layers, and a layer is one
 * array of numbers (in the spirit of ZzFX: a whole sound effect fits on a
 * line, can be tweaked by hand and costs no asset file). This module only
 * defines the format and the maths around it; `webaudio.ts` turns layers into
 * Web Audio nodes, `sounds.ts` holds the game's sound table.
 *
 * Layer = [wave, freq, freqEnd, attack, hold, release, gain, filter, q, delay]
 *
 * | #   | field   | unit | meaning                                                         |
 * | --- | ------- | ---- | --------------------------------------------------------------- |
 * | 0   | wave    | –    | 0 sine, 1 triangle, 2 square, 3 sawtooth, 4 white noise         |
 * | 1   | freq    | Hz   | start pitch (noise: playback rate, 1 = as generated)            |
 * | 2   | freqEnd | Hz   | pitch at the end of the release (exponential glide); 0 = steady |
 * | 3   | attack  | s    | rise from silence to `gain`                                     |
 * | 4   | hold    | s    | time at full level                                              |
 * | 5   | release | s    | exponential fall to silence                                     |
 * | 6   | gain    | 0..1 | peak level of the layer                                         |
 * | 7   | filter  | Hz   | >0 low-pass cutoff, <0 high-pass cutoff (abs), 0 none           |
 * | 8   | q       | –    | filter resonance (1 = gentle)                                   |
 * | 9   | delay   | s    | start offset inside the sound (arpeggios, echoes)               |
 */

export const WAVE = { sine: 0, triangle: 1, square: 2, saw: 3, noise: 4 } as const;
export type Wave = (typeof WAVE)[keyof typeof WAVE];

export type Layer = readonly [
  wave: Wave,
  freq: number,
  freqEnd: number,
  attack: number,
  hold: number,
  release: number,
  gain: number,
  filter: number,
  q: number,
  delay: number,
];

export interface SoundDef {
  readonly layers: readonly Layer[];
  /** Higher survives the voice cap; 0 = cosmetic (UI ticks), 3 = must be heard (boss, stage end). */
  readonly priority: 0 | 1 | 2 | 3;
  /** The same sound is not restarted within this many ms (stacked copies only add mud). */
  readonly minGap: number;
  /**
   * Still played (once) when its cue comes late, i.e. the player skipped the
   * animation with a quick next move. Everything else is dropped then.
   */
  readonly important?: boolean;
}

/** Length of a layer in seconds, delay included. */
export function layerDuration(layer: Layer): number {
  return layer[9] + layer[3] + layer[4] + layer[5];
}

/** Length of a sound in seconds (its longest layer). */
export function soundDuration(def: SoundDef): number {
  return def.layers.reduce((d, l) => Math.max(d, layerDuration(l)), 0);
}

/** Frequency ratio of `semitones` (12 = one octave up). */
export function semitoneRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/** Minor pentatonic steps within an octave: any sequence of them sounds consonant. */
const PENTATONIC = [0, 3, 5, 7, 10] as const;

/**
 * Semitone offset of the `step`-th note of a minor pentatonic scale climbing
 * from the root (0 → 0, 1 → 3, …, 5 → 12). Combos step up this scale, so a
 * chain of merges plays a rising, always-in-tune phrase instead of random
 * pitches or a chromatic smear.
 */
export function scaleStep(step: number): number {
  const n = Math.max(0, Math.floor(step));
  const octave = Math.floor(n / PENTATONIC.length);
  return octave * 12 + (PENTATONIC[n % PENTATONIC.length] ?? 0);
}

/** Highest scale step merges use (about three octaves over the root). */
export const MAX_MERGE_STEP = 15;

/** Scale step of a merge producing `value` on its own: 4 -> 0, 8 -> 1, ... */
export function valueStep(value: number): number {
  const level = Math.max(1, Math.round(Math.log2(Math.max(2, value)))); // 2 -> 1, 4 -> 2 ...
  return Math.min(MAX_MERGE_STEP, Math.max(0, level - 2));
}

/**
 * Pitches (semitones over the merge sound's root) of the merges of one move,
 * in the order they land. Each merge sits at its value's step, but never
 * lower than one step above the merge before it: a combo always climbs, so
 * three merges in a row sound like a rising phrase whatever their values.
 */
export function comboPitches(values: readonly number[]): number[] {
  let prev = -1;
  return values.map((v) => {
    const step = Math.min(MAX_MERGE_STEP, Math.max(valueStep(v), prev + 1));
    prev = step;
    return scaleStep(step);
  });
}
