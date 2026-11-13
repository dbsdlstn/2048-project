import { describe, expect, it } from 'vitest';
import {
  AudioEngine,
  LATE_WINDOW,
  SOUNDS,
  SOUND_IDS,
  comboPitches,
  layerDuration,
  scaleStep,
  soundDuration,
  valueStep,
  type SoundDef,
  type SynthBackend,
} from '../src/audio';
import { HAPTIC_GAP, Haptics } from '../src/input/haptics';

/** Records what would have been scheduled; no Web Audio involved. */
class FakeBackend implements SynthBackend {
  time = 0;
  volume = -1;
  state: 'running' | 'suspended' = 'suspended';
  played: { def: SoundDef; at: number; semitones: number; gain: number; stopped: boolean }[] = [];
  play(def: SoundDef, at: number, semitones: number, gain: number) {
    const entry = { def, at, semitones, gain, stopped: false };
    this.played.push(entry);
    return {
      stop: () => {
        entry.stopped = true;
      },
    };
  }
  setVolume(volume: number): void {
    this.volume = volume;
  }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

function setup(maxVoices = 10) {
  let now = 1000;
  const backend = new FakeBackend();
  let created = 0;
  const engine = new AudioEngine({
    createBackend: () => {
      created++;
      return backend;
    },
    now: () => now,
    maxVoices,
    log: true,
  });
  return {
    engine,
    backend,
    created: () => created,
    tick: (ms: number) => {
      now += ms;
    },
  };
}

describe('sound definitions', () => {
  it('every sound is short, has layers and sane levels', () => {
    for (const id of SOUND_IDS) {
      const def: SoundDef = SOUNDS[id];
      expect(def.layers.length).toBeGreaterThan(0);
      expect(soundDuration(def)).toBeLessThan(2);
      for (const l of def.layers) {
        expect(l[6]).toBeGreaterThan(0);
        expect(l[6]).toBeLessThanOrEqual(0.5);
        expect(layerDuration(l)).toBeGreaterThan(0);
      }
    }
    // Loudness follows importance: frequent sounds are shorter than rare ones.
    expect(soundDuration(SOUNDS.spawn)).toBeLessThan(soundDuration(SOUNDS.merge));
    expect(soundDuration(SOUNDS.merge)).toBeLessThan(soundDuration(SOUNDS.stageClear));
  });

  it('merge pitches sit on a pentatonic scale and a combo always climbs', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(scaleStep)).toEqual([0, 3, 5, 7, 10, 12, 15]);
    expect(valueStep(4)).toBe(0);
    expect(valueStep(8)).toBe(1);
    expect(valueStep(2048)).toBe(9);
    // Values go down, the combo still rises one step at a time.
    expect(comboPitches([64, 8, 4])).toEqual([scaleStep(4), scaleStep(5), scaleStep(6)]);
    // A bigger value jumps ahead.
    expect(comboPitches([4, 256])).toEqual([0, scaleStep(6)]);
    const long = comboPitches(Array.from({ length: 30 }, () => 4));
    for (let i = 1; i < long.length; i++) {
      expect(long[i]).toBeGreaterThanOrEqual(long[i - 1] ?? 0);
    }
    expect(Math.max(...long)).toBeLessThanOrEqual(scaleStep(15));
  });
});

describe('AudioEngine', () => {
  it('stays silent until a gesture unlocks it, then schedules on the output clock', () => {
    const { engine, backend, created } = setup();
    expect(engine.play('merge')).toBe('locked');
    expect(created()).toBe(0);
    engine.unlock();
    engine.unlock();
    expect(created()).toBe(1);
    expect(backend.state).toBe('running');
    backend.time = 5;
    expect(engine.play('merge', { pitch: 7, delay: 100 })).toBe('played');
    const p = backend.played[0];
    expect(p?.semitones).toBe(7);
    expect(p?.at).toBeGreaterThan(5.1);
    expect(p?.at).toBeLessThan(5.12);
  });

  it('honours the sound setting and the volume', () => {
    const { engine, backend } = setup();
    engine.setVolume(0.4);
    engine.unlock();
    expect(backend.volume).toBe(0.4);
    engine.setEnabled(false);
    expect(engine.play('stone')).toBe('off');
    expect(backend.state).toBe('suspended');
    engine.setEnabled(true);
    expect(engine.play('stone')).toBe('played');
    engine.setVolume(3);
    expect(engine.volume).toBe(1);
  });

  it('suspends while the page is hidden', () => {
    const { engine, backend } = setup();
    engine.unlock();
    engine.setHidden(true);
    expect(backend.state).toBe('suspended');
    expect(engine.play('merge')).toBe('off');
    engine.setHidden(false);
    expect(backend.state).toBe('running');
  });

  it('does not restart the same sound at the same pitch within its minimum gap', () => {
    const { engine, tick } = setup();
    engine.unlock();
    expect(engine.play('stone')).toBe('played');
    expect(engine.play('stone')).toBe('throttled');
    // A combo's next note is a different pitch: it plays.
    expect(engine.play('merge', { pitch: 0 })).toBe('played');
    expect(engine.play('merge', { pitch: 3 })).toBe('played');
    tick(SOUNDS.stone.minGap);
    expect(engine.play('stone')).toBe('played');
  });

  it('caps overlapping voices; important sounds steal from cosmetic ones', () => {
    const { engine, backend, tick } = setup(3);
    engine.unlock();
    engine.play('slide'); // priority 0
    tick(1);
    engine.play('merge', { pitch: 1 }); // 1
    tick(1);
    engine.play('merge', { pitch: 2 }); // 1
    tick(1);
    expect(engine.activeVoices()).toBe(3);
    expect(engine.play('uiTap')).toBe('capped'); // priority 0 cannot steal
    expect(engine.play('bossWarden')).toBe('played'); // priority 3 steals the slide
    expect(backend.played[0]?.stopped).toBe(true);
    expect(engine.activeVoices()).toBe(3);
    tick(5000);
    expect(engine.activeVoices()).toBe(0);
  });

  it('late cues: unimportant sounds are dropped, important ones play once per window', () => {
    const { engine, tick } = setup();
    engine.unlock();
    expect(engine.play('merge', { late: true })).toBe('late');
    expect(engine.play('stone', { late: true })).toBe('late');
    expect(engine.play('bossChaos', { late: true })).toBe('played');
    expect(engine.play('stageClear', { late: true })).toBe('late'); // same window
    tick(LATE_WINDOW);
    expect(engine.play('stageClear', { late: true })).toBe('played');
    expect(engine.log.map((e) => e.result)).toEqual(['late', 'late', 'played', 'late', 'played']);
  });

  it('a missing Web Audio means silence, not an error', () => {
    const engine = new AudioEngine({ createBackend: () => null, now: () => 0 });
    engine.unlock();
    expect(engine.unlocked).toBe(false);
    expect(engine.play('merge')).toBe('locked');
    const throwing = new AudioEngine({
      createBackend: () => {
        throw new Error('no audio');
      },
      now: () => 0,
    });
    expect(() => {
      throwing.unlock();
    }).not.toThrow();
  });
});

describe('Haptics', () => {
  function setupHaptics(supported = true) {
    let now = 0;
    const calls: (number | number[])[] = [];
    const haptics = new Haptics(
      supported
        ? (p) => {
            calls.push(p);
            return true;
          }
        : null,
      () => now,
    );
    return { haptics, calls, tick: (ms: number) => (now += ms) };
  }

  it('is a silent no-op where vibration does not exist (iOS)', () => {
    const { haptics } = setupHaptics(false);
    expect(haptics.supported).toBe(false);
    expect(haptics.play('boss')).toBe(false);
    expect(haptics.log.at(-1)).toMatchObject({ kind: 'boss', sent: false });
  });

  it('honours the setting', () => {
    const { haptics, calls } = setupHaptics();
    haptics.setEnabled(false);
    expect(haptics.play('stone')).toBe(false);
    expect(calls).toEqual([0]); // turning it off cancels a running vibration
    haptics.setEnabled(true);
    expect(haptics.play('stone')).toBe(true);
  });

  it('is rate-limited; only a stronger pattern gets through inside the gap', () => {
    const { haptics, calls, tick } = setupHaptics();
    expect(haptics.play('merge')).toBe(true);
    expect(haptics.play('merge')).toBe(false);
    expect(haptics.play('invalid')).toBe(false);
    expect(haptics.play('boss')).toBe(true);
    expect(haptics.play('stone')).toBe(false);
    tick(HAPTIC_GAP);
    expect(haptics.play('stone')).toBe(true);
    expect(calls.length).toBe(3);
  });
});
