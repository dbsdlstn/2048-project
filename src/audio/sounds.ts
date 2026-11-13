/**
 * Every sound of the game, as data (see the layer format in synth.ts).
 *
 * Mixing rules used when tuning these by ear-less maths (peaks checked by
 * rendering them offline through the debug hook, `__neonRift.feedback.renderSound`):
 * - frequent sounds (slide, spawn, merge, UI) are short and quiet; rare ones
 *   (boss, stage end) are long and loud: loudness follows importance;
 * - nothing below ~45 Hz (phone speakers cannot play it, it only eats headroom);
 * - each sound's layers peak below ~0.7 together; the master compressor deals
 *   with stacking.
 */
import { WAVE, type Layer, type SoundDef } from './synth';

const { sine: SIN, triangle: TRI, square: SQR, saw: SAW, noise: NOI } = WAVE;

/** Root of the merge scale (A3). `mergePitch` climbs from here. */
export const MERGE_ROOT = 220;

/** Notes of a rising arpeggio as layers (`ratios` relative to `root`, `gap` s apart). */
function arpeggio(
  wave: Layer[0],
  root: number,
  ratios: readonly number[],
  gap: number,
  gain: number,
  release: number,
  filter = 0,
): Layer[] {
  return ratios.map((r, i): Layer => [
    wave,
    root * r,
    0,
    0.004,
    0.03,
    release,
    gain,
    filter,
    1,
    i * gap,
  ]);
}

// Pentatonic ratios (minor): 1, 6/5, 4/3, 3/2, 9/5, 2 ...
const P = [1, 1.2, 1.335, 1.498, 1.782, 2, 2.4, 2.67, 2.997, 3.564, 4] as const;

export const SOUNDS = {
  /** Tiles slide: a soft breath of filtered noise. */
  slide: {
    layers: [[NOI, 1.4, 0.7, 0.012, 0.01, 0.06, 0.07, -900, 0.7, 0]],
    priority: 0,
    minGap: 70,
  },
  /** Merge: a plucked tone, an octave shimmer and a click. Pitched per value and combo. */
  merge: {
    layers: [
      [TRI, MERGE_ROOT, MERGE_ROOT * 1.02, 0.003, 0.02, 0.2, 0.32, 3200, 1, 0],
      [SIN, MERGE_ROOT * 2, 0, 0.002, 0.0, 0.12, 0.12, 0, 1, 0],
      [NOI, 3, 0, 0.001, 0, 0.018, 0.05, -3000, 1, 0],
    ],
    priority: 1,
    minGap: 18,
  },
  /** A merge of 128 or more: the same pluck with a sub thump and a bright tail. */
  mergeBig: {
    layers: [
      [TRI, MERGE_ROOT, MERGE_ROOT * 1.02, 0.003, 0.04, 0.34, 0.32, 3600, 1, 0],
      [SIN, MERGE_ROOT * 2, 0, 0.002, 0.02, 0.3, 0.14, 0, 1, 0],
      [SQR, MERGE_ROOT * 3, 0, 0.01, 0.02, 0.28, 0.05, 2400, 1, 0.03],
      [SIN, 95, 48, 0.002, 0.03, 0.2, 0.3, 0, 1, 0],
    ],
    priority: 2,
    minGap: 18,
  },
  /** New tiles: barely there. */
  spawn: {
    layers: [[SIN, 1320, 1500, 0.002, 0, 0.035, 0.06, 0, 1, 0]],
    priority: 0,
    minGap: 90,
  },
  /** A stone shatters: noise crack, gritty mid crunch, low knock. */
  stone: {
    layers: [
      [NOI, 1.6, 0.6, 0.001, 0.02, 0.16, 0.34, 2200, 1, 0],
      [NOI, 4, 0, 0.001, 0, 0.05, 0.16, -2500, 1, 0.012],
      [TRI, 140, 55, 0.002, 0.02, 0.14, 0.34, 0, 1, 0],
    ],
    priority: 2,
    minGap: 45,
  },
  /** Ice breaks: glassy high partials and a fizz. */
  ice: {
    layers: [
      [SIN, 2350, 2200, 0.001, 0.0, 0.16, 0.13, 0, 1, 0],
      [SIN, 3530, 3300, 0.001, 0.0, 0.12, 0.08, 0, 1, 0.018],
      [NOI, 5, 0, 0.001, 0.01, 0.09, 0.12, -4500, 1, 0],
    ],
    priority: 1,
    minGap: 60,
  },
  /** A curse lands or is spent: a low, detuned, sinking growl. */
  curse: {
    layers: [
      [SAW, 196, 130, 0.01, 0.05, 0.24, 0.12, 900, 6, 0],
      [SAW, 201, 128, 0.01, 0.05, 0.24, 0.1, 900, 6, 0],
      [SIN, 392, 260, 0.01, 0.02, 0.2, 0.08, 0, 1, 0.04],
    ],
    priority: 1,
    minGap: 80,
  },
  /** A prism merge: a quick sparkling major arpeggio (the one bright, "wrong" key: it is special). */
  prism: {
    layers: [
      ...arpeggio(SIN, 880, [1, 1.26, 1.5, 2], 0.035, 0.12, 0.18),
      [NOI, 6, 0, 0.002, 0.02, 0.15, 0.05, -6000, 1, 0],
    ],
    priority: 2,
    minGap: 60,
  },
  /** A relic acted: a two-note chime. */
  relic: {
    layers: arpeggio(TRI, 659, [1, 1.5], 0.06, 0.15, 0.2, 5000),
    priority: 1,
    minGap: 120,
  },
  /** Bomb (active): a dull boom with a crackle. */
  bomb: {
    layers: [
      [NOI, 1.2, 0.4, 0.002, 0.04, 0.38, 0.4, 1200, 1, 0],
      [SIN, 130, 42, 0.002, 0.05, 0.3, 0.45, 0, 1, 0],
      [NOI, 5, 0, 0.001, 0, 0.06, 0.15, -3000, 1, 0.03],
    ],
    priority: 2,
    minGap: 100,
    important: true,
  },
  /** Undo (active): a reversed sweep, as if rewinding tape. */
  undo: {
    layers: [
      [SAW, 260, 780, 0.12, 0.0, 0.06, 0.11, 1800, 2, 0],
      [SIN, 520, 1560, 0.12, 0.0, 0.06, 0.12, 0, 1, 0],
    ],
    priority: 2,
    minGap: 100,
    important: true,
  },
  /** Freeze pin (active): a rising glassy ping. */
  freeze: {
    layers: [
      [SIN, 1760, 2640, 0.002, 0.03, 0.22, 0.14, 0, 1, 0],
      [TRI, 880, 1320, 0.002, 0.02, 0.16, 0.1, 0, 1, 0],
      [NOI, 6, 0, 0.002, 0.03, 0.12, 0.06, -6000, 1, 0.02],
    ],
    priority: 2,
    minGap: 100,
    important: true,
  },
  /** The boss acts next turn: two low pulses. */
  bossWarn: {
    layers: [
      [SQR, 110, 104, 0.006, 0.07, 0.12, 0.13, 700, 2, 0],
      [SQR, 110, 98, 0.006, 0.07, 0.16, 0.13, 700, 2, 0.2],
      [SIN, 55, 0, 0.006, 0.07, 0.12, 0.2, 0, 1, 0],
    ],
    priority: 3,
    minGap: 400,
  },
  /** Warden seals a line: a heavy metallic slam. */
  bossWarden: {
    layers: [
      [SQR, 82, 62, 0.002, 0.06, 0.4, 0.2, 1100, 3, 0],
      [SIN, 330, 318, 0.002, 0.05, 0.6, 0.12, 0, 1, 0],
      [SIN, 507, 495, 0.002, 0.03, 0.45, 0.07, 0, 1, 0],
      [NOI, 2, 0.5, 0.001, 0.02, 0.18, 0.28, 1600, 1, 0],
    ],
    priority: 3,
    minGap: 300,
    important: true,
  },
  /** Corroder halves a tile: an acid, sinking resonant sweep. */
  bossCorroder: {
    layers: [
      [SAW, 440, 92, 0.01, 0.08, 0.45, 0.16, 1400, 9, 0],
      [SAW, 446, 90, 0.01, 0.08, 0.45, 0.12, 1400, 9, 0],
      [NOI, 3, 0.8, 0.005, 0.1, 0.3, 0.1, 2400, 4, 0.05],
    ],
    priority: 3,
    minGap: 300,
    important: true,
  },
  /** Chaos shuffles the board: a swirling noise sweep over a detuned drone. */
  bossChaos: {
    layers: [
      [NOI, 0.6, 3, 0.08, 0.12, 0.3, 0.24, 1800, 5, 0],
      [SAW, 73, 110, 0.04, 0.2, 0.3, 0.12, 900, 2, 0],
      [SAW, 77.8, 104, 0.04, 0.2, 0.3, 0.12, 900, 2, 0],
      [SIN, 55, 41, 0.01, 0.2, 0.3, 0.22, 0, 1, 0],
    ],
    priority: 3,
    minGap: 300,
    important: true,
  },
  /** A line is sealed: a short low thunk. */
  lineLock: {
    layers: [
      [SQR, 147, 120, 0.002, 0.04, 0.14, 0.12, 900, 2, 0],
      [NOI, 1.5, 0, 0.001, 0.01, 0.06, 0.12, 1500, 1, 0],
    ],
    priority: 2,
    minGap: 120,
  },
  /** A sealed line opens: a soft rising release. */
  lineUnlock: {
    layers: [
      [SIN, 392, 784, 0.01, 0.02, 0.16, 0.12, 0, 1, 0],
      [NOI, 3, 6, 0.02, 0.0, 0.12, 0.04, -2000, 1, 0],
    ],
    priority: 1,
    minGap: 120,
  },
  /** A swipe that changes nothing: a dull, muffled thud. */
  invalid: {
    layers: [
      [SIN, 96, 62, 0.002, 0.01, 0.08, 0.26, 0, 1, 0],
      [NOI, 0.8, 0, 0.001, 0.0, 0.04, 0.12, 500, 1, 0],
    ],
    priority: 1,
    minGap: 140,
  },
  /** Any button. */
  uiTap: {
    layers: [[SIN, 1046, 880, 0.001, 0.0, 0.03, 0.06, 0, 1, 0]],
    priority: 0,
    minGap: 40,
  },
  /** Moves running low: a quiet double blip. */
  warn: {
    layers: [
      [TRI, 659, 0, 0.003, 0.03, 0.06, 0.1, 0, 1, 0],
      [TRI, 659, 0, 0.003, 0.03, 0.08, 0.1, 0, 1, 0.12],
    ],
    priority: 2,
    minGap: 500,
  },
  /** Relic offer appears: three notes rising into a question. */
  offer: {
    layers: arpeggio(TRI, 440, [P[0], P[2], P[4]], 0.08, 0.13, 0.32, 4200),
    priority: 2,
    minGap: 400,
  },
  /** Relic picked: a firm resolution. */
  pick: {
    layers: [
      ...arpeggio(TRI, 440, [P[3], P[5]], 0.06, 0.15, 0.3, 4200),
      [SIN, 110, 0, 0.004, 0.05, 0.22, 0.14, 0, 1, 0.06],
    ],
    priority: 2,
    minGap: 300,
  },
  /** Stage cleared: a quick ascending run and a sustained top note. */
  stageClear: {
    layers: [
      ...arpeggio(TRI, 330, [P[0], P[2], P[3], P[5], P[7]], 0.065, 0.13, 0.26, 5000),
      [SIN, 330 * 4, 0, 0.01, 0.2, 0.5, 0.1, 0, 1, 0.33],
      [SIN, 82.5, 0, 0.01, 0.25, 0.4, 0.18, 0, 1, 0.33],
    ],
    priority: 3,
    minGap: 600,
    important: true,
  },
  /** The whole run won: a longer phrase over a pad. */
  victory: {
    layers: [
      ...arpeggio(TRI, 330, [P[0], P[3], P[5], P[3], P[5], P[8], P[10]], 0.09, 0.13, 0.3, 5000),
      [SAW, 165, 0, 0.12, 0.6, 0.6, 0.06, 1200, 1, 0.1],
      [SAW, 247, 0, 0.12, 0.6, 0.6, 0.05, 1200, 1, 0.1],
      [SIN, 82.5, 0, 0.05, 0.6, 0.6, 0.18, 0, 1, 0.1],
    ],
    priority: 3,
    minGap: 1500,
    important: true,
  },
  /** Stage failed / game over: a falling minor phrase, muffled. */
  failure: {
    layers: [
      ...arpeggio(TRI, 392, [1, 0.84, 0.749, 0.667], 0.14, 0.14, 0.34, 1800),
      [SIN, 98, 73, 0.02, 0.3, 0.4, 0.16, 0, 1, 0.42],
    ],
    priority: 3,
    minGap: 1500,
    important: true,
  },
} satisfies Record<string, SoundDef>;

export type SoundId = keyof typeof SOUNDS;

export const SOUND_IDS = Object.keys(SOUNDS) as SoundId[];
