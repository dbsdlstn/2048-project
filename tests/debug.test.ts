import { describe, expect, it } from 'vitest';
import { runMove, startRun, toValueGrid, type RunStep } from '../src/core';
import { RunController, type BoardDisplay, type UiDisplay } from '../src/game/runController';
import { createDebugApi, readLaunchParams, startOptions } from '../src/game/debug';
import { BoardView, ManualClock, PausableClock } from '../src/render';

describe('readLaunchParams', () => {
  it.each<[string, boolean, number | string | null]>([
    ['', false, null],
    ['?debug', true, null],
    ['?seed=42', false, 42],
    ['?debug&seed=42', true, 42],
    ['?seed=neon', false, 'neon'],
    ['?seed=', false, null],
    ['?debug=0&seed=7', true, 7],
  ])('%j -> debug %s, seed %j', (search, debug, seed) => {
    expect(readLaunchParams(search)).toMatchObject({ debug, seed });
  });

  it('reads mode, stage and relics; drops unknown values', () => {
    expect(readLaunchParams('?mode=run&stage=3&relics=bomb,undo')).toMatchObject({
      mode: 'run',
      stage: 3,
      relics: ['bomb', 'undo'],
    });
    expect(readLaunchParams('?mode=endless')).toMatchObject({
      mode: 'endless',
      stage: null,
      relics: [],
    });
    expect(readLaunchParams('?mode=story&stage=x&relics=nope,bomb')).toMatchObject({
      mode: null,
      stage: null,
      relics: ['bomb'],
    });
    expect(startOptions(readLaunchParams('?stage=2&relics=chain'))).toEqual({
      stageIndex: 2,
      relics: ['chain'],
    });
    expect(startOptions(readLaunchParams(''))).toEqual({});
  });
});

/** A board display backed by a real BoardView on an injected clock (no canvas). */
class ViewBoard implements BoardDisplay {
  readonly view = new BoardView(4);
  constructor(private readonly clock: PausableClock) {}
  showStep(step: RunStep): void {
    if (step.boardReplaced) this.view.clear(step.run.board.size);
    this.view.apply(step.phases, this.clock.now());
  }
  setMarks(): void {
    // Marks are not tested here.
  }
  clear(): void {
    this.view.clear();
  }
  settle(): void {
    this.view.finish();
  }
  isAnimating(): boolean {
    return this.view.isAnimating(this.clock.now());
  }
}

const nullUi: UiDisplay = {
  showScreen: () => undefined,
  updateHud: () => undefined,
  scoreGained: () => undefined,
  showHint: () => undefined,
  announceStage: () => undefined,
};

function setup() {
  const clock = new PausableClock(new ManualClock(0));
  const board = new ViewBoard(clock);
  const controller = new RunController({ board, ui: nullUi });
  const api = createDebugApi({ controller, board, clock });
  return { clock, board, controller, api };
}

describe('debug API', () => {
  it('reproduces a seeded run exactly', () => {
    const { api } = setup();
    api.start('run', 42);
    let expected = startRun('run', 42).run;
    expect(api.grid()).toEqual(toValueGrid(expected.board));
    for (const dir of ['left', 'up', 'right', 'down'] as const) {
      const r = runMove(expected, dir);
      expect(api.move(dir)).toBe(r.changed);
      expected = r.run;
    }
    expect(api.run()).toEqual(expected);
    expect(api.state()).toEqual(expected.board);
    expect(api.hud()?.stageLabel).toBe('1막 1');
    expect(api.screen().kind).toBe('playing');
  });

  it('run() is a detached copy; null on the menu', () => {
    const { api, controller } = setup();
    expect(api.run()).toBeNull();
    api.start('endless', 1);
    expect(api.run()).not.toBe(controller.run);
    api.menu();
    expect(api.run()).toBeNull();
    expect(api.screen().kind).toBe('menu');
  });

  it('starts at a stage with relics and uses actives directly or through targeting', () => {
    const { api } = setup();
    api.start('run', 5, { stageIndex: 1, relics: ['bomb', 'freezePin'] });
    expect(api.hud()?.stageLabel).toBe('1막 2');
    expect(api.hint()?.key).toBe('hazard:stone');
    const run = api.run();
    const index = run?.board.cells.findIndex((t) => t?.kind === 'number') ?? -1;
    const at = { row: Math.floor(index / 4), col: index % 4 };
    expect(api.activate('freezePin')).toBe(true);
    expect(api.screen().kind).toBe('targeting');
    expect(api.tapCell(at.row, at.col)).toBe(true);
    expect(api.useActive('bomb', at)).toBe(true);
    expect(api.run()?.board.cells[index]).toBeNull();
    expect(() => api.useActive('nope' as 'bomb')).toThrow(/unknown relic/);
  });

  it('advance() steps animation on a paused clock; settle() finishes it', () => {
    const { api } = setup();
    api.start('run', 3);
    expect(api.isAnimating()).toBe(true);
    api.advance(50);
    expect(api.isAnimating()).toBe(true); // spawn takes 150 ms
    api.advance(200);
    expect(api.isAnimating()).toBe(false);

    for (const d of ['left', 'right', 'up', 'down'] as const) if (api.move(d)) break;
    expect(api.isAnimating()).toBe(true);
    api.settle();
    expect(api.isAnimating()).toBe(false);
  });

  it('rejects unknown directions and modes', () => {
    const { api } = setup();
    api.start('run', 1);
    expect(() => api.move('sideways' as 'left')).toThrow(/expected one of/);
    expect(() => {
      api.start('story' as 'run');
    }).toThrow(/mode must be/);
  });
});

describe('debug API load', () => {
  it('continues from an edited dump', () => {
    const { api } = setup();
    api.start('run', 9);
    const run = api.run();
    if (!run) throw new Error('no run');
    api.load({ ...run, progress: { ...run.progress, movesUsed: 50 } });
    expect(api.hud()?.movesValue).toBe(10);
    expect(api.screen().kind).toBe('playing');
  });
});
