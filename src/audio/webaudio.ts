/**
 * The Web Audio side of the synth: turns layers (synth.ts) into oscillator /
 * noise sources, a filter and an envelope, and mixes everything through a
 * master gain and a compressor so that stacked sounds duck instead of clip.
 *
 *   layer: source (oscillator | noise buffer) → [biquad filter] → envelope gain ┐
 *   layer: …                                                                      ├→ master gain → compressor → destination
 *
 * Works on any `BaseAudioContext`, so the very same code renders sounds into
 * an `OfflineAudioContext` for the debug check (peak / loudness of a sound).
 */
import type { SynthBackend, VoiceHandle } from './engine';
import { semitoneRatio, soundDuration, type Layer, type SoundDef } from './synth';

const OSC_TYPES: readonly OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];
/** Exponential ramps cannot reach 0. */
const SILENT = 0.0001;

/** The browser's AudioContext constructor (with the old WebKit prefix), or null. */
export function audioContextClass(): (new () => AudioContext) | null {
  const w = globalThis as {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export class WebAudioBackend implements SynthBackend {
  private readonly master: GainNode;
  private noise: AudioBuffer | null = null;

  constructor(private readonly ctx: BaseAudioContext) {
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    // A gentle bus compressor working as a soft limiter: loud stacks are pulled down.
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    this.master.connect(comp);
    comp.connect(ctx.destination);
  }

  get time(): number {
    return this.ctx.currentTime;
  }

  setVolume(volume: number): void {
    // Perceived loudness is roughly logarithmic: square the slider for an even feel.
    this.master.gain.value = volume * volume * 1.4;
  }

  resume(): Promise<void> {
    const ctx = this.ctx as Partial<AudioContext>;
    return ctx.resume ? ctx.resume() : Promise.resolve();
  }

  suspend(): Promise<void> {
    const ctx = this.ctx as Partial<AudioContext>;
    return ctx.suspend ? ctx.suspend() : Promise.resolve();
  }

  play(def: SoundDef, at: number, semitones: number, gain: number): VoiceHandle {
    const ratio = semitoneRatio(semitones);
    const sources: AudioScheduledSourceNode[] = [];
    for (const layer of def.layers) {
      const src = this.layer(layer, at, ratio, gain);
      if (src) sources.push(src);
    }
    return {
      stop: () => {
        const now = this.ctx.currentTime;
        for (const s of sources) {
          try {
            s.stop(now + 0.01);
          } catch {
            // Already stopped.
          }
        }
      },
    };
  }

  private layer(
    l: Layer,
    at: number,
    ratio: number,
    gain: number,
  ): AudioScheduledSourceNode | null {
    const [wave, freq, freqEnd, attack, hold, release, level, filter, q, delay] = l;
    const ctx = this.ctx;
    const t0 = at + delay;
    const peak = level * gain;
    const end = t0 + attack + hold + release;
    if (peak <= 0) return null;

    let src: AudioScheduledSourceNode;
    let param: AudioParam;
    if (wave === 4) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer();
      n.loop = true;
      param = n.playbackRate; // for noise, `freq` is the playback rate (1 = as generated)
      src = n;
    } else {
      const o = ctx.createOscillator();
      o.type = OSC_TYPES[wave] ?? 'sine';
      param = o.frequency;
      src = o;
    }
    param.setValueAtTime(Math.max(0.01, freq * ratio), t0);
    if (freqEnd > 0) param.exponentialRampToValueAtTime(Math.max(0.01, freqEnd * ratio), end);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(peak, t0 + Math.max(0.001, attack));
    env.gain.setValueAtTime(peak, t0 + attack + hold);
    env.gain.exponentialRampToValueAtTime(SILENT, end);

    let head: AudioNode = src;
    if (filter !== 0) {
      const f = ctx.createBiquadFilter();
      f.type = filter > 0 ? 'lowpass' : 'highpass';
      f.frequency.value = Math.abs(filter);
      f.Q.value = q;
      src.connect(f);
      head = f;
    }
    head.connect(env);
    env.connect(this.master);
    // Noise starts at a random point of its buffer, so repeats do not sound identical.
    if (src instanceof AudioBufferSourceNode) src.start(t0, Math.random() * 0.5);
    else src.start(t0);
    src.stop(end + 0.02);
    src.onended = () => {
      env.disconnect();
      head.disconnect();
    };
    return src;
  }

  /** One second of white noise, made once per context. */
  private noiseBuffer(): AudioBuffer {
    if (this.noise) return this.noise;
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, rate, rate);
    const data = buffer.getChannelData(0);
    let seed = 0x9e3779b9;
    for (let i = 0; i < data.length; i++) {
      // xorshift: the same noise every time (keeps offline renders comparable).
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      data[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
    }
    this.noise = buffer;
    return buffer;
  }
}

/** Peak and RMS of a rendered sound (debug check: not silent, not clipping). */
export interface RenderedSound {
  readonly duration: number;
  readonly peak: number;
  readonly rms: number;
}

/** One sound of an offline render: what, when (s) and at which pitch. */
export interface RenderItem {
  readonly def: SoundDef;
  readonly at?: number;
  readonly semitones?: number;
}

/**
 * Renders sounds through the real backend (master gain and compressor
 * included) into an OfflineAudioContext — no speakers, faster than real time —
 * and measures the result. Several items at once check what stacking does.
 * Browser only.
 */
export async function renderOffline(
  items: readonly RenderItem[],
  volume = 0.8,
  sampleRate = 44100,
): Promise<RenderedSound> {
  const seconds = items.reduce((d, i) => Math.max(d, (i.at ?? 0) + soundDuration(i.def)), 0) + 0.1;
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate);
  const backend = new WebAudioBackend(ctx);
  backend.setVolume(volume);
  for (const i of items) backend.play(i.def, 0.005 + (i.at ?? 0), i.semitones ?? 0, 1);
  const buffer = await ctx.startRendering();
  const data = buffer.getChannelData(0);
  let peak = 0;
  let sum = 0;
  for (const v of data) {
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sum += v * v;
  }
  return { duration: seconds, peak, rms: Math.sqrt(sum / Math.max(1, data.length)) };
}
