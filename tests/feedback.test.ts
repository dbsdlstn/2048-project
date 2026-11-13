import { describe, expect, it } from 'vitest';
import {
  createRelic,
  runMove,
  startRun,
  stateFromGrid,
  type RunState,
  type RunStep,
} from '../src/core';
import type { PlayOptions, SoundId } from '../src/audio';
import { scaleStep } from '../src/audio';
import { Feedback, comboPlan, type FeedbackBoard } from '../src/game/feedback';
import { RunController, type BoardDisplay, type UiDisplay } from '../src/game/runController';
import { hudModel, type HudModel, type ScreenModel } from '../src/game/runView';
import type { HapticKind } from '../src/input/haptics';
import { BoardView, type CellBurst, type EventCue } from '../src/render';
import {
  DEFAULT_SETTINGS,
  MemoryStorage,
  PROFILE_KEY,
  SaveStore,
  motionReduced,
  type Settings,
} from '../src/save';
import { turnOn } from './helpers';

class FakeFxBoard implements FeedbackBoard {
  bursts: CellBurst[] = [];
  traumas: number[] = [];
  texts: string[] = [];
  nudges: [number, number][] = [];
  rings = 0;
  stops: number[] = [];
  burst(spec: CellBurst): void {
    this.bursts.push(spec);
  }
  trauma(amount: number): void {
    this.traumas.push(amount);
  }
  floatText(_r: number, _c: number, text: string): void {
    this.texts.push(text);
  }
  nudge(dx: number, dy: number): void {
    this.nudges.push([dx, dy]);
  }
  ring(): void {
    this.rings++;
  }
  hitStop(ms: number): void {
    this.stops.push(ms);
  }
}

function setup() {
  const board = new FakeFxBoard();
  const sounds: { id: SoundId; options: PlayOptions }[] = [];
  const haptics: HapticKind[] = [];
  const feedback = new Feedback({
    board,
    sound: { play: (id, options = {}) => sounds.push({ id, options }) },
    haptics: { play: (kind) => haptics.push(kind) },
  });
  return { board, sounds, haptics, feedback };
}

/** A run whose board is `grid`, plus the relics given. */
function runOn(grid: number[][], relics: RunState['relics'] = []): RunState {
  const run = startRun('run', 'fb', { stageIndex: 4 }).run;
  return { ...run, relics, board: stateFromGrid(grid, 3) };
}

/** Plays a step through a view model and the director, firing every cue on time. */
function play(feedback: Feedback, view: BoardView, step: RunStep): EventCue[] {
  const cues = view.apply(step.phases, 0).sort((a, b) => a.hit - b.hit);
  feedback.step(step);
  for (const c of cues) feedback.cue(c, false);
  return cues;
}

describe('comboPlan', () => {
  it('numbers merges across the slide and chain phases, with a rising pitch', () => {
    const out = turnOn(
      [
        [2, 2, 4, 8],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      'left',
      { relics: ['chain'] },
    );
    expect(out.phases.map((p) => p.kind)).toContain('chain');
    const plan = comboPlan(out.phases);
    expect(plan.total).toBe(3);
    expect([...plan.order.values()]).toEqual([0, 1, 2]);
    const pitches = [...plan.pitch.values()];
    expect(pitches).toEqual([scaleStep(0), scaleStep(1), scaleStep(2)]);
  });

  it('no merges, no combo', () => {
    const out = turnOn(
      [
        [0, 0, 0, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      'left',
    );
    expect(comboPlan(out.phases).total).toBe(0);
  });
});

describe('Feedback director', () => {
  it('a small merge: sparks, pitched merge sound, no shake, no vibration', () => {
    const { board, sounds, haptics, feedback } = setup();
    const run = runOn([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.syncTo(run.board);
    play(feedback, view, runMove(run, 'left'));
    expect(sounds.map((s) => s.id)).toEqual(['slide', 'merge', 'spawn']);
    expect(board.bursts.length).toBeGreaterThan(0);
    expect(Math.max(0, ...board.traumas)).toBe(0);
    expect(board.texts).toEqual(['+4']);
    expect(haptics).toEqual([]);
    expect(board.stops).toEqual([]);
  });

  it('bigger merges get more particles, shake, a vibration and (new best) a hit-stop', () => {
    const small = setup();
    const big = setup();
    for (const [s, v] of [
      [small, 4],
      [big, 256],
    ] as const) {
      const run = runOn([
        [v, v, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);
      const view = new BoardView(4);
      view.syncTo(run.board);
      play(s.feedback, view, runMove(run, 'left'));
    }
    const count = (b: FakeFxBoard): number => b.bursts.reduce((n, x) => n + x.count, 0);
    expect(count(big.board)).toBeGreaterThan(count(small.board) * 2);
    expect(Math.max(...big.board.traumas)).toBeGreaterThan(0.2);
    expect(big.haptics).toContain('mergeBig');
    expect(big.board.stops.length).toBe(1);
    expect(big.sounds.map((s) => s.id)).toContain('mergeBig');
  });

  it('a combo of three or more shows ×N and its notes climb', () => {
    const { board, sounds, feedback } = setup();
    const run = runOn(
      [
        [2, 2, 4, 8],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [createRelic('chain')],
    );
    const view = new BoardView(4);
    view.syncTo(run.board);
    play(feedback, view, runMove(run, 'left'));
    const merges = sounds.filter((s) => s.id === 'merge').map((s) => s.options.pitch ?? 0);
    expect(merges.length).toBe(3);
    expect(merges[0]).toBeLessThan(merges[1] ?? 0);
    expect(merges[1]).toBeLessThan(merges[2] ?? 0);
    expect(board.texts.at(-1)).toBe('+16 ×3');
  });

  it('stones shatter into shards with sound and vibration', () => {
    const { board, sounds, haptics, feedback } = setup();
    const run = startRun('run', 'fb', { stageIndex: 1 }).run;
    const grid = stateFromGrid(
      [
        [0, 8, 8, { kind: 'stone' }],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      3,
    );
    const step = runMove({ ...run, board: grid }, 'right');
    const view = new BoardView(4);
    view.syncTo(grid);
    play(feedback, view, step);
    expect(board.bursts.some((b) => b.shape === 'shard')).toBe(true);
    expect(sounds.map((s) => s.id)).toContain('stone');
    expect(haptics).toContain('stone');
  });

  it('late cues: no visuals, and only the important sounds are even requested', () => {
    const { board, sounds, feedback } = setup();
    const run = runOn([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const view = new BoardView(4);
    view.syncTo(run.board);
    const step = runMove(run, 'left');
    const cues = view.apply(step.phases, 0);
    feedback.step(step);
    for (const c of cues) feedback.cue(c, true);
    expect(board.bursts).toEqual([]);
    expect(sounds).toEqual([]);
    feedback.cue(
      {
        event: { type: 'trigger', source: 'chaos', at: null },
        phase: 'boss',
        phaseIndex: 0,
        at: 0,
        hit: 0,
        step: 1,
      },
      true,
    );
    expect(sounds).toEqual([{ id: 'bossChaos', options: { late: true } }]);
  });

  it('boss trigger: strong shake, hit-stop, boss sound and vibration', () => {
    const { board, sounds, haptics, feedback } = setup();
    feedback.cue(
      {
        event: { type: 'trigger', source: 'warden', at: null },
        phase: 'boss',
        phaseIndex: 2,
        at: 0,
        hit: 0,
        step: 1,
      },
      false,
    );
    expect(Math.max(...board.traumas)).toBeGreaterThan(0.4);
    expect(board.stops.length).toBe(1);
    expect(sounds[0]?.id).toBe('bossWarden');
    expect(haptics).toEqual(['boss']);
  });

  it('invalid move: nudge in the swipe direction, thud, short vibration', () => {
    const { board, sounds, haptics, feedback } = setup();
    feedback.invalidMove('up');
    expect(board.nudges).toEqual([[0, -1]]);
    expect(sounds[0]?.id).toBe('invalid');
    expect(haptics).toEqual(['invalid']);
  });

  it('HUD warnings sound once, when they switch on', () => {
    const { sounds, feedback } = setup();
    const run = startRun('run', 'hud', { stageIndex: 3 }).run;
    const base = hudModel(run);
    const boss = base.boss;
    if (!boss) throw new Error('expected a boss');
    const warn: HudModel = { ...base, movesWarn: true, boss: { ...boss, imminent: true } };
    feedback.hud(base);
    feedback.hud(warn);
    feedback.hud(warn);
    expect(sounds.map((s) => s.id)).toEqual(['bossWarn', 'warn']);
  });
});

describe('settings: sound, volume, haptics, reduced motion', () => {
  it('stores and validates the new fields; bad values fall back one by one', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    expect(store.settings).toEqual(DEFAULT_SETTINGS);
    store.updateSettings({ volume: 0.4, reduceMotion: 'on' });
    expect(new SaveStore(storage).settings).toMatchObject({ volume: 0.4, reduceMotion: 'on' });
    storage.setItem(
      PROFILE_KEY,
      JSON.stringify({ schema: 1, settings: { sound: false, volume: 7, reduceMotion: 'maybe' } }),
    );
    expect(new SaveStore(storage).settings).toEqual({ ...DEFAULT_SETTINGS, sound: false });
  });

  it('reduced motion follows the device in "auto", else the choice', () => {
    expect(motionReduced('auto', true)).toBe(true);
    expect(motionReduced('auto', false)).toBe(false);
    expect(motionReduced('on', false)).toBe(true);
    expect(motionReduced('off', true)).toBe(false);
  });

  it('the controller reports changes and tells the sheet what the device supports', () => {
    const changes: Settings[] = [];
    const screens: ScreenModel[] = [];
    const calls: string[] = [];
    const ui: UiDisplay = {
      showScreen: (screen) => screens.push(screen),
      updateHud: () => calls.push('hud'),
      scoreGained: () => calls.push('gain'),
      showHint: () => calls.push('hint'),
      announceStage: () => calls.push('banner'),
    };
    const board: BoardDisplay = {
      showStep: () => calls.push('step'),
      setMarks: () => calls.push('marks'),
      clear: () => calls.push('clear'),
    };
    const controller = new RunController({
      board,
      ui,
      device: () => ({ haptics: false, reducedMotion: true }),
      onSettings: (s) => changes.push(s),
    });
    controller.showMenu();
    controller.openSettings();
    expect(screens.at(-1)).toMatchObject({
      kind: 'settings',
      hapticsAvailable: false,
      systemReducedMotion: true,
    });
    controller.setSetting('volume', 1);
    controller.setSetting('reduceMotion', 'off');
    expect(changes.at(-1)).toMatchObject({ volume: 1, reduceMotion: 'off' });
    expect(screens.at(-1)).toMatchObject({ settings: { volume: 1, reduceMotion: 'off' } });
  });
});
