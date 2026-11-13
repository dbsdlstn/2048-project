/**
 * The feedback director: one table that maps what happened in the game to
 * what the player sees, hears and feels. The core stays untouched; this only
 * listens to the renderer's event cues (fired the moment each event lands on
 * screen), plus a few things outside the board (an invalid swipe, the HUD
 * crossing a warning threshold, a relic offer appearing).
 *
 * The rule throughout: **feedback scales with importance.**
 *
 * | event                    | particles                   | shake  | hit-stop | sound                 | vibration  |
 * | ------------------------ | --------------------------- | ------ | -------- | --------------------- | ---------- |
 * | slide                    | –                           | –      | –        | slide (quiet)         | –          |
 * | merge < 64               | small spark burst           | –      | –        | merge, pitched        | ≥ 32 only  |
 * | merge ≥ 64 / ≥ 128       | bigger burst + ring         | light  | new best | merge / mergeBig      | merge(Big) |
 * | 3rd+ merge in one move   | stronger burst, "+N ×k"     | +      | –        | climbs the scale      | –          |
 * | stone shatters           | shards + dust               | light  | –        | stone                 | stone      |
 * | ice breaks / curse spent | flakes / purple smoke       | –      | –        | ice / curse           | –          |
 * | prism merge              | spectrum sparks             | –      | –        | prism                 | –          |
 * | bomb                     | blast                       | medium | –        | bomb                  | bomb       |
 * | boss acts                | sparks from the board edge  | strong | yes      | per boss              | boss       |
 * | line sealed / opened     | current along the line      | –      | –        | lineLock / lineUnlock | –          |
 * | stage cleared            | fireworks                   | medium | yes      | stageClear / victory  | stageClear |
 * | invalid swipe            | –                           | nudge  | –        | invalid               | invalid    |
 *
 * Late cues (the player moved again before the animation ended) get no
 * visuals; the audio engine plays only important ones, once.
 */
import type { Direction, RelicId, RunStep, TileId, TurnPhase } from '../core';
import type { SoundId } from '../audio/sounds';
import type { PlayOptions } from '../audio/engine';
import { comboPitches } from '../audio/synth';
import type { HapticKind } from '../input/haptics';
import { BoardFlash, RingPulse } from '../render/effects';
import type { CellBurst } from '../render/fx';
import type { BoardRenderer } from '../render/renderer';
import type { EventCue } from '../render/viewModel';
import { rampColor, type Theme } from '../render/theme';
import { NEON_THEME } from '../render/themes';
import type { HudModel, ScreenModel } from './runView';

/** What the director needs from the board (implemented over `BoardRenderer`). */
export interface FeedbackBoard {
  burst(spec: CellBurst): void;
  trauma(amount: number): void;
  /** `tag`: labels with the same tag fade the older one when a new one appears. */
  floatText(
    row: number,
    col: number,
    text: string,
    color: string,
    weight: number,
    tag?: string,
  ): void;
  /** Invalid move: a small bump towards the swipe (or, reduced motion, a border flash). */
  nudge(dx: number, dy: number): void;
  ring(row: number, col: number, color: string, reach: number): void;
  hitStop(ms: number): void;
}

export interface FeedbackSound {
  play(id: SoundId, options?: PlayOptions): unknown;
}

export interface FeedbackHaptics {
  play(kind: HapticKind): unknown;
}

/** Combo order of every merge in a step, keyed by the merge's result tile id. */
export interface ComboPlan {
  /** 0-based index across all phases (slide, then each chain pass). */
  readonly order: ReadonlyMap<TileId, number>;
  /** Pitch of its sound in semitones (a combo always climbs, see `comboPitches`). */
  readonly pitch: ReadonlyMap<TileId, number>;
  readonly total: number;
}

/**
 * Numbers the merges of one move in the order they land: slide merges first,
 * then each chain pass. This is the combo count (a chain merge is the 2nd,
 * 3rd ... merge of the same move).
 */
export function comboPlan(phases: readonly TurnPhase[]): ComboPlan {
  const order = new Map<TileId, number>();
  const values: number[] = [];
  for (const phase of phases) {
    if (phase.kind !== 'slide' && phase.kind !== 'chain') continue;
    for (const e of phase.events) {
      if (e.type !== 'merge') continue;
      order.set(e.resultId, order.size);
      values.push(e.value);
    }
  }
  const pitches = comboPitches(values);
  const pitch = new Map<TileId, number>();
  for (const [id, i] of order) pitch.set(id, pitches[i] ?? 0);
  return { order, pitch, total: order.size };
}

/** Merge values that get extra weight. */
const SHAKE_FROM = 64;
const BIG_FROM = 128;
/** Merges of the same move from which a combo label shows. */
const COMBO_LABEL_FROM = 3;

const HIT_STOP = { boss: 90, stageClear: 80, best: 60 } as const;
const BOSSES = new Set(['warden', 'corroder', 'chaos']);
const BOSS_SOUND: Readonly<Record<string, SoundId>> = {
  warden: 'bossWarden',
  corroder: 'bossCorroder',
  chaos: 'bossChaos',
};
/** Active relics have their own sounds; their trigger is not a passive "relic" chime. */
const ACTIVE_SOUND: Partial<Record<RelicId, SoundId>> = {
  bomb: 'bomb',
  freezePin: 'freeze',
  undo: 'undo',
};

const DIRS: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export interface FeedbackOptions {
  readonly board: FeedbackBoard;
  readonly sound: FeedbackSound;
  readonly haptics: FeedbackHaptics;
  readonly theme?: Theme;
  /** Delay (ms) of the relic-offer sound, matching the sheet's fade-in. */
  readonly offerDelay?: number;
}

export class Feedback {
  private readonly board: FeedbackBoard;
  private readonly sound: FeedbackSound;
  private readonly haptics: FeedbackHaptics;
  private theme: Theme;
  private plan: ComboPlan = { order: new Map(), pitch: new Map(), total: 0 };
  private slid = false;
  private spawned = false;
  /** Prism tile ids before the step being played (a merge using one gets the spectrum burst). */
  private prisms = new Set<TileId>();
  /** Prism tile ids after it (become `prisms` when the next step starts). */
  private boardPrisms = new Set<TileId>();
  /** Biggest tile made so far this game (a new best ≥ 128 earns a hit-stop). */
  private best = 0;
  private seed: number | null = null;
  private victory = false;
  private rebuilt = false;
  private hudPrev: HudModel | null = null;
  private screenPrev: ScreenModel['kind'] | null = null;

  constructor(private readonly options: FeedbackOptions) {
    this.board = options.board;
    this.sound = options.sound;
    this.haptics = options.haptics;
    this.theme = options.theme ?? NEON_THEME;
  }

  /**
   * Call with every step, right after the renderer took it (its late cues of
   * the previous step have fired by then; the new step's cues come later).
   */
  step(step: RunStep): void {
    const run = step.run;
    if (run.seed !== this.seed) {
      this.seed = run.seed;
      this.best = 0;
      this.hudPrev = null;
    }
    this.plan = comboPlan(step.phases);
    this.slid = false;
    this.spawned = false;
    this.victory = run.status === 'victory';
    // A rebuilt board (new stage, undo, continue) replays spawns: not "new tiles".
    this.rebuilt = step.boardReplaced;
    this.prisms = step.boardReplaced ? new Set() : this.boardPrisms;
    this.boardPrisms = new Set();
    for (const t of run.board.cells) if (t?.kind === 'prism') this.boardPrisms.add(t.id);
    if (step.boardReplaced) {
      for (const t of run.board.cells) if (t) this.best = Math.max(this.best, t.value);
    }
  }

  /** Particle colours follow the theme (the renderer's look is switched separately). */
  setTheme(theme: Theme): void {
    this.theme = theme;
  }

  /** The renderer's cue listener. */
  cue(cue: EventCue, late: boolean): void {
    const e = cue.event;
    const th = this.theme;
    if (late) {
      // The moment has passed: no visuals; the engine keeps only important sounds.
      const id = this.lateSound(cue);
      if (id) this.sound.play(id, { late: true });
      return;
    }
    switch (e.type) {
      case 'move':
        if (!this.slid) {
          this.slid = true;
          this.sound.play('slide');
        }
        return;
      case 'merge': {
        if (!this.slid) {
          this.slid = true;
          this.sound.play('slide');
        }
        const k = this.plan.order.get(e.resultId) ?? 0;
        const n = k + 1;
        const level = Math.max(1, Math.round(Math.log2(Math.max(2, e.value))));
        const weight = Math.min(1, (level - 1) / 10);
        const accent = rampColor(e.value, th);
        const { row, col } = e.to;
        const prism = e.sourceIds.some((id) => this.prisms.has(id));
        const big = e.value >= BIG_FROM;
        const combo = n >= COMBO_LABEL_FROM;
        // Sparks: grow with the tile's level and the combo.
        this.board.burst({
          row,
          col,
          shape: 'spark',
          count: 4 + level * 1.3 + (combo ? 4 : 0),
          colors: prism ? th.spectrum : [accent, accent, th.highlight],
          speed: [1.2, 2.6 + weight * 2.4],
          life: [260, 420 + weight * 260],
          size: [0.05, 0.09 + weight * 0.05],
          drag: 0.86,
          // From the tile's edge outwards: the new number is never under the sparks.
          radius: 0.45,
          jitter: 0.06,
        });
        // Current running out along the board's traces.
        this.board.burst({
          row,
          col,
          shape: 'bit',
          count: 2 + Math.floor(level / 2) + (combo ? 2 : 0),
          colors: [accent],
          speed: [2.4, 3.6 + weight * 2],
          life: [220, 380 + weight * 200],
          size: [0.035, 0.05],
          axisAligned: true,
          drag: 0.9,
          radius: 0.5,
        });
        if (big) {
          // A big merge throws fast streaks well past its neighbours.
          this.board.burst({
            row,
            col,
            shape: 'streak',
            count: 6 + 3 * (level - 7),
            colors: [accent, th.highlight],
            speed: [3.5, 6],
            life: [220, 380],
            size: [0.025, 0.04],
            drag: 0.87,
            radius: 0.5,
          });
        }
        if (prism) {
          this.board.burst({
            row,
            col,
            shape: 'streak',
            count: 10,
            colors: th.spectrum,
            speed: [2.5, 4.5],
            life: [260, 420],
            size: [0.025, 0.035],
            drag: 0.88,
            radius: 0.45,
          });
          this.board.ring(row, col, th.wild, 1.1);
          this.sound.play('prism');
        }
        if (e.cursed) {
          // The curse is spent: its smoke drifts up out of the tile.
          this.board.burst({
            row,
            col,
            shape: 'spark',
            count: 9,
            colors: [th.curse],
            speed: [0.4, 1.1],
            life: [420, 640],
            size: [0.07, 0.12],
            gravity: -2.2,
            drag: 0.9,
            jitter: 0.3,
          });
          this.sound.play('curse', { pitch: -5, gain: 0.7 });
        }
        if (e.value >= SHAKE_FROM) this.board.ring(row, col, accent, 0.9 + weight * 0.5);
        if (combo) {
          // The combo count rides on the merge that made it: no label over other tiles.
          const gained = e.scoreGained > 0 ? `+${e.scoreGained} ` : '';
          this.board.floatText(
            row,
            col,
            `${gained}×${n}`,
            th.comboText,
            Math.max(weight, 0.5),
            'combo',
          );
        } else if (e.scoreGained > 0) {
          this.board.floatText(row, col, `+${e.scoreGained}`, accent, weight);
        }
        const trauma = (e.value >= SHAKE_FROM ? 0.12 + 0.06 * (level - 6) : 0) + (combo ? 0.05 : 0);
        this.board.trauma(Math.min(0.42, trauma));
        this.sound.play(big ? 'mergeBig' : 'merge', {
          pitch: this.plan.pitch.get(e.resultId) ?? 0,
          gain: 0.75 + 0.25 * weight,
        });
        if (big) this.haptics.play('mergeBig');
        else if (e.value >= 32 || combo) this.haptics.play('merge');
        if (big && e.value > this.best) this.board.hitStop(HIT_STOP.best);
        this.best = Math.max(this.best, e.value);
        return;
      }
      case 'destroy': {
        const { row, col } = e.at;
        if (e.cause === 'active') {
          this.board.burst({
            row,
            col,
            shape: 'streak',
            count: 18,
            colors: [th.targetDestroy, th.boardAccent, th.highlight],
            speed: [3, 6],
            life: [240, 420],
            size: [0.03, 0.05],
            drag: 0.86,
          });
          this.board.burst({
            row,
            col,
            shape: 'shard',
            count: 8,
            colors: [th.stone.edge, th.boardAccent],
            speed: [1.5, 3],
            life: [380, 600],
            size: [0.06, 0.11],
            gravity: 9,
            spin: 0.02,
            drag: 0.94,
          });
          this.board.ring(row, col, th.targetDestroy, 1.2);
          this.board.trauma(0.32);
          this.haptics.play('bomb');
          // The bomb's sound plays from its trigger cue.
          return;
        }
        // A stone shatters.
        this.board.burst({
          row,
          col,
          shape: 'shard',
          count: 9,
          colors: [th.stone.edge, th.stone.edge, th.stone.light, th.stone.fill],
          speed: [1.2, 2.8],
          life: [420, 640],
          size: [0.07, 0.13],
          gravity: 10,
          spin: 0.018,
          drag: 0.95,
          jitter: 0.15,
        });
        this.board.burst({
          row,
          col,
          shape: 'bit',
          count: 4,
          colors: [th.stone.edge],
          speed: [1.6, 2.6],
          life: [200, 320],
          size: [0.03, 0.045],
          axisAligned: true,
          radius: 0.4,
        });
        this.board.trauma(0.1);
        this.sound.play('stone');
        this.haptics.play('stone');
        return;
      }
      case 'statusChange': {
        const { row, col } = e.at;
        if (e.cause === 'thaw') {
          if (e.status.frozenTurns > 0) return;
          // The ice breaks.
          this.board.burst({
            row,
            col,
            shape: 'flake',
            count: 10,
            colors: [th.ice, th.highlight],
            speed: [0.9, 2.2],
            life: [380, 620],
            size: [0.04, 0.08],
            gravity: 5,
            spin: 0.012,
            drag: 0.93,
            jitter: 0.3,
          });
          this.sound.play('ice');
          return;
        }
        if (this.rebuilt) return; // restoring a board, not a new hazard
        if (e.cause === 'curse') {
          this.board.burst({
            row,
            col,
            shape: 'spark',
            count: 6,
            colors: [th.curse],
            speed: [0.3, 0.9],
            life: [360, 560],
            size: [0.06, 0.1],
            gravity: -1.6,
            jitter: 0.3,
          });
          this.sound.play('curse', { gain: 0.8 });
          return;
        }
        // Ice lands (hazard) or the freeze pin: a frost glint.
        this.board.burst({
          row,
          col,
          shape: 'flake',
          count: 6,
          colors: [th.ice, th.highlight],
          speed: [0.5, 1.2],
          life: [300, 480],
          size: [0.03, 0.06],
          spin: 0.01,
          jitter: 0.35,
        });
        if (e.cause === 'ice') this.sound.play('ice', { gain: 0.45, pitch: 5 });
        return;
      }
      case 'valueChange': {
        // Corroder: the tile loses half its value; sparks drain out of it.
        this.board.burst({
          row: e.at.row,
          col: e.at.col,
          shape: 'spark',
          count: 12,
          colors: [th.bossTarget, rampColor(e.from, th)],
          speed: [0.8, 2],
          life: [380, 620],
          size: [0.05, 0.09],
          gravity: 6,
          drag: 0.9,
          jitter: 0.3,
        });
        return;
      }
      case 'shuffle': {
        for (const m of e.moves) {
          this.board.burst({
            row: m.from.row,
            col: m.from.col,
            shape: 'bit',
            count: 2,
            colors: [th.curse],
            speed: [2, 3.5],
            life: [240, 380],
            size: [0.035, 0.05],
            axisAligned: true,
          });
        }
        return;
      }
      case 'lineLock':
      case 'lineUnlock': {
        const lock = e.type === 'lineLock';
        for (let i = 0; i < 4; i++) {
          const row = e.axis === 'row' ? e.index : i;
          const col = e.axis === 'row' ? i : e.index;
          this.board.burst({
            row,
            col,
            shape: 'bit',
            count: lock ? 4 : 2,
            colors: [lock ? th.lock : th.ice],
            speed: [2, 3.5],
            life: [240, 420],
            size: [0.035, 0.05],
            angle: e.axis === 'row' ? 0 : Math.PI / 2,
            spread: lock ? Math.PI : Math.PI / 2,
            axisAligned: true,
            jitter: 0.3,
          });
        }
        if (lock) this.sound.play('lineLock', { delay: 140, gain: 0.7 });
        else this.sound.play('lineUnlock');
        return;
      }
      case 'trigger': {
        if (BOSSES.has(e.source)) {
          this.bossStrike();
          this.sound.play(BOSS_SOUND[e.source] ?? 'bossWarden');
          return;
        }
        const own = ACTIVE_SOUND[e.source as RelicId];
        if (own) {
          this.sound.play(own);
          return;
        }
        if (e.at) {
          this.board.burst({
            row: e.at.row,
            col: e.at.col,
            shape: 'spark',
            count: 6,
            colors: [th.relic],
            speed: [0.8, 1.6],
            life: [300, 460],
            size: [0.05, 0.08],
            jitter: 0.2,
          });
        }
        this.sound.play('relic');
        return;
      }
      case 'spawn':
        if (this.rebuilt || this.spawned) return;
        this.spawned = true;
        if (e.kind === 'prism') {
          this.board.burst({
            row: e.at.row,
            col: e.at.col,
            shape: 'spark',
            count: 6,
            colors: th.spectrum,
            speed: [0.4, 1],
            life: [300, 460],
            size: [0.04, 0.07],
            jitter: 0.3,
          });
        }
        this.sound.play('spawn');
        return;
      case 'stageCleared':
        this.celebrate();
        return;
      case 'stageFailed':
      case 'gameOver':
        this.board.burst({
          row: 1.5,
          col: 1.5,
          shape: 'spark',
          count: 16,
          colors: [th.lock],
          speed: [0.3, 0.9],
          life: [600, 900],
          size: [0.05, 0.09],
          gravity: 3,
          jitter: 2,
        });
        this.sound.play('failure');
        this.haptics.play('failure');
        return;
      case 'score':
      case 'bonusMoves':
        return;
    }
  }

  /** A swipe that changed nothing. */
  invalidMove(direction: Direction): void {
    const [dx, dy] = DIRS[direction];
    this.board.nudge(dx, dy);
    this.sound.play('invalid');
    this.haptics.play('invalid');
  }

  /** HUD changes: warnings that just switched on get a sound. */
  hud(hud: HudModel): void {
    const prev = this.hudPrev;
    this.hudPrev = hud;
    if (!prev) return;
    if (hud.boss?.imminent && !prev.boss?.imminent) this.sound.play('bossWarn');
    if (hud.movesWarn && !prev.movesWarn) this.sound.play('warn');
    if (hud.stuck && !prev.stuck) this.sound.play('warn', { pitch: -7 });
  }

  /** Screen changes: a relic offer appearing gets its sound. */
  screen(screen: ScreenModel): void {
    const prev = this.screenPrev;
    this.screenPrev = screen.kind;
    if (screen.kind === 'offer' && prev !== 'offer') {
      this.sound.play('offer', { delay: this.options.offerDelay ?? 0 });
    }
  }

  /** The player took an offered relic (null = skipped). */
  relicPicked(id: RelicId | null): void {
    if (id !== null) this.sound.play('pick');
  }

  /** An active relic without a target was used (undo: its step has no trigger event). */
  activeUsed(id: RelicId): void {
    if (id === 'undo') this.sound.play('undo');
  }

  uiTap(): void {
    this.sound.play('uiTap');
  }

  /** Which sound a late cue would still deserve (the engine decides if it plays). */
  private lateSound(cue: EventCue): SoundId | null {
    const e = cue.event;
    switch (e.type) {
      case 'trigger':
        return BOSSES.has(e.source) ? (BOSS_SOUND[e.source] ?? null) : null;
      case 'stageCleared':
        return this.victory ? 'victory' : 'stageClear';
      case 'stageFailed':
      case 'gameOver':
        return 'failure';
      default:
        return null;
    }
  }

  private bossStrike(): void {
    const th = this.theme;
    // Sparks thrown in from all four edges: the whole board is hit.
    const edges: readonly [number, number, number][] = [
      [-0.55, 0.5, Math.PI / 2],
      [-0.55, 2.5, Math.PI / 2],
      [3.55, 0.5, -Math.PI / 2],
      [3.55, 2.5, -Math.PI / 2],
      [0.5, -0.55, 0],
      [2.5, -0.55, 0],
      [0.5, 3.55, Math.PI],
      [2.5, 3.55, Math.PI],
    ];
    for (const [row, col, angle] of edges) {
      this.board.burst({
        row,
        col,
        shape: 'streak',
        count: 4,
        colors: [th.bossTarget, th.lock],
        speed: [2.5, 4.5],
        life: [260, 420],
        size: [0.025, 0.04],
        angle,
        spread: Math.PI / 2.5,
        drag: 0.87,
      });
    }
    this.board.trauma(0.48);
    this.board.hitStop(HIT_STOP.boss);
    this.haptics.play('boss');
  }

  private celebrate(): void {
    const th = this.theme;
    const points: readonly [number, number][] = [
      [1.5, 1.5],
      [0.4, 0.4],
      [0.4, 2.6],
      [2.6, 0.4],
      [2.6, 2.6],
    ];
    const colors = this.victory ? th.fireworks.victory : th.fireworks.stage;
    for (const [i, [row, col]] of points.entries()) {
      this.board.burst({
        row,
        col,
        shape: 'streak',
        count: i === 0 ? 26 : 14,
        colors,
        speed: [2.6, 5.6],
        life: [460, 760],
        size: [0.035, 0.055],
        gravity: 3,
        drag: 0.9,
        stagger: i * 70,
      });
      this.board.burst({
        row,
        col,
        shape: 'spark',
        count: i === 0 ? 14 : 8,
        colors,
        speed: [0.8, 2.6],
        life: [560, 860],
        size: [0.08, 0.13],
        gravity: 2,
        drag: 0.9,
        stagger: i * 70,
      });
    }
    this.board.trauma(0.28);
    this.board.hitStop(HIT_STOP.stageClear);
    this.sound.play(this.victory ? 'victory' : 'stageClear');
    this.haptics.play('stageClear');
  }
}

/** `FeedbackBoard` over the real renderer (its current theme colours the reduced-motion flash). */
export function rendererBoard(renderer: BoardRenderer): FeedbackBoard {
  const fx = renderer.fx;
  return {
    burst: (spec) => {
      fx.burst(spec);
      renderer.wake();
    },
    trauma: (amount) => {
      fx.addTrauma(amount);
      renderer.wake();
    },
    floatText: (row, col, text, color, weight, tag) => {
      fx.floatText(row, col, text, color, weight, tag);
      renderer.wake();
    },
    nudge: (dx, dy) => {
      // Reduced motion: the board does not move; a brief red edge says the same thing.
      if (renderer.motionReduced) {
        renderer.addEffect(new BoardFlash(renderer.currentTheme.lock, renderer.viewTimeNow(), 260));
      } else {
        fx.nudge(dx, dy);
        renderer.wake();
      }
    },
    ring: (row, col, color, reach) => {
      const now = renderer.viewTimeNow();
      const custom = renderer.currentTheme.ring;
      renderer.addEffect(
        custom
          ? custom(row, col, color, now, reach)
          : new RingPulse(row, col, color, now, 420, reach),
      );
    },
    hitStop: (ms) => {
      renderer.hitStop(ms);
    },
  };
}
