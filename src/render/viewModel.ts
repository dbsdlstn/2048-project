/**
 * The renderer's own picture of the board: one sprite per visible tile, keyed by
 * tile id, each carrying tweens for its position and scale.
 *
 * This is deliberately *not* the game state. The core state jumps from turn to
 * turn instantly; the view model replays a turn's events over a few hundred
 * milliseconds. It is pure (time is passed in) so it can be tested in Node.
 */
import { NO_STATUS, listTiles } from '../core';
import type {
  GameState,
  TileId,
  TileKind,
  TileStatus,
  TurnEvent,
  TurnPhase,
  TurnPhaseKind,
} from '../core';
import {
  easeOutBack,
  easeOutCubic,
  easeOutQuad,
  easeOutSpring,
  endTime,
  linear,
  sample,
  still,
  tween,
} from './tween';
import type { Tween } from './tween';

/** Animation timings in milliseconds. */
export interface AnimationTimings {
  readonly slide: number;
  readonly pop: number;
  readonly spawn: number;
  /** Pause between two consecutive phases (e.g. after the slide, before spawned tiles grow). */
  readonly spawnDelay: number;
  /** Shrink-out of a destroyed tile. */
  readonly destroy: number;
  /** Highlight pulse when a tile's status changes. */
  readonly status: number;
  /** Tiles flying to their new cells on a shuffle. */
  readonly shuffle: number;
  /** Delay between the pops of consecutive merges in one phase, so a combo reads as a sequence. */
  readonly stagger: number;
  /** Wind-up before a big merge pops (the result dips, then springs out). */
  readonly anticipation: number;
  /** Squash-and-stretch recovery after a tile lands. */
  readonly squash: number;
}

export const DEFAULT_TIMINGS: AnimationTimings = {
  slide: 110,
  pop: 170,
  spawn: 150,
  spawnDelay: 20,
  destroy: 140,
  status: 120,
  shuffle: 220,
  stagger: 30,
  anticipation: 60,
  squash: 130,
};

/** Merges producing at least this value get the anticipation wind-up and a bigger pop. */
export const BIG_MERGE = 128;
/** At most this many merges in one phase are staggered; later ones pop with the last. */
const MAX_STAGGER_STEPS = 5;

/** Draw order: merged-away tiles under normal tiles, fresh merge results on top. */
const Z_VANISHING = 0;
const Z_NORMAL = 1;
const Z_MERGED = 2;

const popEase = easeOutBack(2.4);
const bigPopEase = easeOutBack(3.6);
const springEase = easeOutSpring(6, 11);
const POP_FROM = 0.75;
const STATUS_PULSE = 1.12;
/** Anticipation dip of a big merge: appears at WIND_FROM, shrinks to WIND_TO, then pops. */
const WIND_FROM = 0.92;
const WIND_TO = 0.76;
/** Stretch along the motion while sliding (per cell travelled, capped) and squash on landing. */
const SLIDE_STRETCH = 0.035;
const LAND_SQUASH = 0.09;
const MERGE_SQUASH = 0.14;
const BIG_MERGE_SQUASH = 0.2;

/**
 * Sequential tweens of one property. A tile can slide in the slide phase,
 * again in a chain phase, then fly in a shuffle: each phase appends a tween
 * that starts where the previous one ended.
 */
type Track = Tween[];

function sampleTrack(track: Track, now: number): number {
  let value = track[0]?.from ?? 0;
  for (const tw of track) {
    if (now < tw.start) break;
    value = sample(tw, now);
  }
  return value;
}

function trackEnd(track: Track): number {
  return track.reduce((t, tw) => Math.max(t, endTime(tw)), Number.NEGATIVE_INFINITY);
}

function finalValue(track: Track): number {
  return sampleTrack(track, Number.POSITIVE_INFINITY);
}

/** A value or status change scheduled at a point in time (no tween). */
interface Change {
  readonly at: number;
  readonly value?: number;
  readonly status?: TileStatus;
}

/** The screen axis a tile is stretched along (its motion). */
export type StretchAxis = 'x' | 'y';

export interface TileSprite {
  readonly id: TileId;
  kind: TileKind;
  /** Value and status before any scheduled `changes`. */
  value: number;
  status: TileStatus;
  changes: Change[];
  // Animation tracks (absolute time).
  row: Track;
  col: Track;
  scale: Track;
  /** Signed stretch along `axis` (0 = none, >0 longer along the axis, <0 squashed). */
  stretch: Track;
  axis: StretchAxis;
  /** Hidden until this time (merge results wait for the slide to finish). */
  appearAt: number;
  /** Removed from the view at this time (merge sources, destroyed tiles); `Infinity` = stays. */
  removeAt: number;
  /** The merge pop plays until this time. */
  popUntil: number;
  z: number;
}

/** A sprite's values sampled at one moment: what the painter actually draws. */
export interface SpriteFrame {
  readonly id: TileId;
  readonly kind: TileKind;
  readonly value: number;
  readonly status: TileStatus;
  readonly row: number;
  readonly col: number;
  readonly scale: number;
  /** Extra horizontal / vertical scale from squash and stretch (1 = none). */
  readonly sx: number;
  readonly sy: number;
  /** True while this tile's merge pop is playing (painters / effects may emphasise it). */
  readonly popping: boolean;
}

function newSprite(
  id: TileId,
  kind: TileKind,
  value: number,
  status: TileStatus,
  row: number,
  col: number,
): TileSprite {
  return {
    id,
    kind,
    value,
    status,
    changes: [],
    row: [still(row)],
    col: [still(col)],
    scale: [still(1)],
    stretch: [still(0)],
    axis: 'x',
    appearAt: Number.NEGATIVE_INFINITY,
    removeAt: Number.POSITIVE_INFINITY,
    popUntil: Number.NEGATIVE_INFINITY,
    z: Z_NORMAL,
  };
}

/**
 * When one event plays. `apply` returns one cue per event so effects and
 * sound can fire exactly when the matching animation does.
 */
export interface EventCue {
  readonly event: TurnEvent;
  readonly phase: TurnPhaseKind;
  /** Index of the phase within its step. */
  readonly phaseIndex: number;
  /** Absolute time (view timeline, ms) at which the event's animation starts. */
  readonly at: number;
  /**
   * When the event visibly lands: a merge's pop (after the slide, its stagger
   * and any wind-up); the same as `at` for everything else. Cues fire here.
   */
  readonly hit: number;
  /** Which `apply` call produced the cue (one per played step). */
  readonly step: number;
}

export class BoardView {
  private readonly sprites = new Map<TileId, TileSprite>();
  private gridSize: number;
  /** Time at which every currently scheduled animation has finished. */
  private busyUntil = Number.NEGATIVE_INFINITY;
  private steps = 0;
  /** Squash and stretch on landings and pops (off for reduced motion). */
  squashEnabled = true;

  constructor(
    gridSize: number,
    private readonly timings: AnimationTimings = DEFAULT_TIMINGS,
  ) {
    this.gridSize = gridSize;
  }

  get size(): number {
    return this.gridSize;
  }

  /** Removes every sprite (e.g. before a new game). */
  clear(gridSize: number = this.gridSize): void {
    this.sprites.clear();
    this.gridSize = gridSize;
    this.busyUntil = Number.NEGATIVE_INFINITY;
  }

  /** Snaps the view to a state with no animation (loading a save, debugging). */
  syncTo(state: GameState): void {
    this.clear(state.size);
    for (const { tile, pos } of listTiles(state)) {
      this.sprites.set(
        tile.id,
        newSprite(tile.id, tile.kind, tile.value, tile.status, pos.row, pos.col),
      );
    }
  }

  /**
   * Schedules a turn's phases as animation starting at `now`. Phases play one
   * after another (each starts when the previous one's board motion ends);
   * events inside a phase play together. Any animation still running is
   * fast-forwarded first, so the view can never drift from the core state no
   * matter how quickly turns arrive.
   */
  apply(phases: readonly TurnPhase[], now: number): EventCue[] {
    this.finish();
    const cues: EventCue[] = [];
    const step = ++this.steps;
    let cursor = now;
    let first = true;
    for (const [phaseIndex, phase] of phases.entries()) {
      const start = first ? cursor : cursor + this.timings.spawnDelay;
      const hits = new Map<TurnEvent, number>();
      const duration = this.schedulePhase(phase.events, start, hits);
      for (const event of phase.events) {
        cues.push({
          event,
          phase: phase.kind,
          phaseIndex,
          at: start,
          hit: hits.get(event) ?? start,
          step,
        });
      }
      // Phases with nothing to show (score, triggers…) take no time.
      if (duration <= 0) continue;
      cursor = start + duration;
      first = false;
    }
    this.busyUntil = this.computeBusyUntil();
    return cues;
  }

  /** Time at which everything scheduled so far has finished. */
  get endTime(): number {
    return this.busyUntil;
  }

  /** Where a tile is drawn at `now` (fractional row / column), or null if not visible. */
  tilePosition(id: TileId, now: number): { row: number; col: number; scale: number } | null {
    const s = this.sprites.get(id);
    if (!s || now < s.appearAt || now >= s.removeAt) return null;
    return {
      row: sampleTrack(s.row, now),
      col: sampleTrack(s.col, now),
      scale: sampleTrack(s.scale, now),
    };
  }

  /**
   * Schedules one phase's events from `start`; returns how long its board
   * motion lasts. Impact times that differ from `start` go into `hits`.
   */
  private schedulePhase(
    events: readonly TurnEvent[],
    start: number,
    hits: Map<TurnEvent, number>,
  ): number {
    const t = this.timings;
    let duration = 0;
    let merges = 0;
    for (const e of events) {
      switch (e.type) {
        case 'move': {
          const s = this.require(e.tileId);
          s.row.push(tween(e.from.row, e.to.row, start, t.slide, easeOutCubic));
          s.col.push(tween(e.from.col, e.to.col, start, t.slide, easeOutCubic));
          this.slideStretch(s, e.from, e.to, start, LAND_SQUASH);
          duration = Math.max(duration, t.slide);
          break;
        }
        case 'merge': {
          // Pops follow each other in the order the core merged them.
          const delay = Math.min(merges, MAX_STAGGER_STEPS) * t.stagger;
          merges++;
          const slideEnd = start + t.slide;
          const land = slideEnd + delay;
          for (const [i, id] of e.sourceIds.entries()) {
            const s = this.require(id);
            const from = e.from[i] ?? e.to;
            s.row.push(tween(from.row, e.to.row, start, t.slide, easeOutCubic));
            s.col.push(tween(from.col, e.to.col, start, t.slide, easeOutCubic));
            this.slideStretch(s, from, e.to, start, 0);
            s.removeAt = land;
            s.z = Z_VANISHING;
          }
          const big = e.value >= BIG_MERGE && this.squashEnabled;
          const wind = big ? t.anticipation : 0;
          const pop = land + wind;
          const result = newSprite(e.resultId, e.kind, e.value, NO_STATUS, e.to.row, e.to.col);
          result.scale = big
            ? [
                tween(WIND_FROM, WIND_TO, land, wind, easeOutQuad),
                tween(WIND_TO, 1, pop, t.pop * 1.3, bigPopEase),
              ]
            : [tween(POP_FROM, 1, land, t.pop, popEase)];
          if (this.squashEnabled) {
            const other = e.from[1];
            result.axis = other.col !== e.to.col ? 'x' : 'y';
            const amount = big ? BIG_MERGE_SQUASH : MERGE_SQUASH;
            result.stretch.push(tween(-amount, 0, pop, t.squash, springEase));
          }
          result.appearAt = land;
          result.popUntil = pop + t.pop;
          result.z = Z_MERGED;
          this.sprites.set(e.resultId, result);
          hits.set(e, pop);
          duration = Math.max(duration, t.slide + delay + wind);
          break;
        }
        case 'spawn': {
          const s = newSprite(e.tileId, e.kind, e.value, NO_STATUS, e.at.row, e.at.col);
          s.scale = [tween(0, 1, start, t.spawn, easeOutCubic)];
          s.appearAt = start;
          this.sprites.set(e.tileId, s);
          duration = Math.max(duration, t.spawn);
          break;
        }
        case 'destroy': {
          const s = this.require(e.tileId);
          s.scale.push(tween(1, 0, start, t.destroy, easeOutCubic));
          s.removeAt = start + t.destroy;
          s.z = Z_VANISHING;
          duration = Math.max(duration, t.destroy);
          break;
        }
        case 'statusChange': {
          const s = this.require(e.tileId);
          s.changes.push({ at: start, status: e.status });
          s.scale.push(tween(STATUS_PULSE, 1, start, t.status, easeOutCubic));
          duration = Math.max(duration, t.status);
          break;
        }
        case 'valueChange': {
          const s = this.require(e.tileId);
          s.changes.push({ at: start, value: e.to });
          s.scale.push(tween(POP_FROM, 1, start, t.pop, popEase));
          duration = Math.max(duration, t.pop);
          break;
        }
        case 'shuffle': {
          for (const m of e.moves) {
            const s = this.require(m.tileId);
            s.row.push(tween(m.from.row, m.to.row, start, t.shuffle, easeOutCubic));
            s.col.push(tween(m.from.col, m.to.col, start, t.shuffle, easeOutCubic));
          }
          if (e.moves.length > 0) duration = Math.max(duration, t.shuffle);
          break;
        }
        case 'score':
        case 'trigger':
        case 'lineLock':
        case 'lineUnlock':
        case 'bonusMoves':
        case 'stageCleared':
        case 'stageFailed':
        case 'gameOver':
          // Not tile animation; the HUD / effects react to these.
          break;
      }
    }
    return duration;
  }

  /**
   * Stretch along the motion while a tile slides, then (`land` > 0) a squash
   * that springs back when it stops. Short hops barely deform.
   */
  private slideStretch(
    s: TileSprite,
    from: { row: number; col: number },
    to: { row: number; col: number },
    start: number,
    land: number,
  ): void {
    if (!this.squashEnabled) return;
    const dist = Math.abs(to.row - from.row) + Math.abs(to.col - from.col);
    if (dist === 0) return;
    const t = this.timings;
    s.axis = to.col !== from.col ? 'x' : 'y';
    const k = SLIDE_STRETCH * Math.min(dist, 3);
    s.stretch.push(tween(k, k * 0.3, start, t.slide, linear));
    const end = start + t.slide;
    if (land > 0) {
      const amount = land * (0.6 + 0.2 * Math.min(dist, 3));
      s.stretch.push(tween(-amount, 0, end, t.squash, springEase));
    } else {
      s.stretch.push(tween(0, 0, end, 0, linear));
    }
  }

  /** True while any scheduled animation has not reached its end at `now`. */
  isAnimating(now: number): boolean {
    return now < this.busyUntil;
  }

  /**
   * Drops sprites whose removal time has passed. Call once per frame before
   * drawing; returns whether animation is still in progress.
   */
  update(now: number): boolean {
    for (const [id, s] of this.sprites) {
      if (Number.isFinite(s.removeAt) && s.removeAt <= now) this.sprites.delete(id);
    }
    return this.isAnimating(now);
  }

  /** Jumps every animation to its end state. */
  finish(): void {
    for (const [id, s] of this.sprites) {
      // Only sprites scheduled for removal go; `removeAt === Infinity` means "stays".
      if (Number.isFinite(s.removeAt)) {
        this.sprites.delete(id);
        continue;
      }
      s.row = [still(finalValue(s.row))];
      s.col = [still(finalValue(s.col))];
      s.scale = [still(finalValue(s.scale))];
      s.stretch = [still(0)];
      for (const c of s.changes) {
        if (c.value !== undefined) s.value = c.value;
        if (c.status !== undefined) s.status = c.status;
      }
      s.changes = [];
      s.appearAt = Number.NEGATIVE_INFINITY;
      s.popUntil = Number.NEGATIVE_INFINITY;
      s.z = Z_NORMAL;
    }
    this.busyUntil = Number.NEGATIVE_INFINITY;
  }

  /** Visible sprites at `now`, sampled and sorted in draw order (back to front). */
  frame(now: number): SpriteFrame[] {
    const out: { z: number; f: SpriteFrame }[] = [];
    for (const s of this.sprites.values()) {
      if (now < s.appearAt || now >= s.removeAt) continue;
      let value = s.value;
      let status = s.status;
      for (const c of s.changes) {
        if (c.at > now) continue;
        if (c.value !== undefined) value = c.value;
        if (c.status !== undefined) status = c.status;
      }
      const k = sampleTrack(s.stretch, now);
      out.push({
        z: s.z,
        f: {
          id: s.id,
          kind: s.kind,
          value,
          status,
          row: sampleTrack(s.row, now),
          col: sampleTrack(s.col, now),
          scale: sampleTrack(s.scale, now),
          sx: s.axis === 'x' ? 1 + k : 1 - k,
          sy: s.axis === 'x' ? 1 - k : 1 + k,
          popping: now < s.popUntil,
        },
      });
    }
    out.sort((a, b) => a.z - b.z);
    return out.map((o) => o.f);
  }

  /** Number of sprites currently held (including ones not yet visible). */
  get spriteCount(): number {
    return this.sprites.size;
  }

  private require(id: TileId): TileSprite {
    const s = this.sprites.get(id);
    if (!s) throw new Error(`BoardView: event refers to unknown tile ${id}`);
    return s;
  }

  private computeBusyUntil(): number {
    let until = Number.NEGATIVE_INFINITY;
    for (const s of this.sprites.values()) {
      until = Math.max(
        until,
        trackEnd(s.row),
        trackEnd(s.col),
        trackEnd(s.scale),
        trackEnd(s.stretch),
      );
      if (Number.isFinite(s.removeAt)) until = Math.max(until, s.removeAt);
      for (const c of s.changes) until = Math.max(until, c.at);
    }
    return until;
  }
}
