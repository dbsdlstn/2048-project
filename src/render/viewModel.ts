/**
 * The renderer's own picture of the board: one sprite per visible tile, keyed by
 * tile id, each carrying tweens for its position and scale.
 *
 * This is deliberately *not* the game state. The core state jumps from turn to
 * turn instantly; the view model replays a turn's events over a few hundred
 * milliseconds. It is pure (time is passed in) so it can be tested in Node.
 */
import { NO_STATUS, listTiles } from '../core';
import type { GameState, TileId, TileKind, TileStatus, TurnEvent } from '../core';
import { easeOutBack, easeOutCubic, endTime, sample, still, tween } from './tween';
import type { Tween } from './tween';

/** Animation timings in milliseconds. */
export interface AnimationTimings {
  readonly slide: number;
  readonly pop: number;
  readonly spawn: number;
  /** Delay after the slide ends before spawned tiles start growing. */
  readonly spawnDelay: number;
}

export const DEFAULT_TIMINGS: AnimationTimings = {
  slide: 110,
  pop: 170,
  spawn: 150,
  spawnDelay: 20,
};

/** Draw order: merged-away tiles under normal tiles, fresh merge results on top. */
const Z_VANISHING = 0;
const Z_NORMAL = 1;
const Z_MERGED = 2;

const popEase = easeOutBack(2.4);
const POP_FROM = 0.75;

export interface TileSprite {
  readonly id: TileId;
  kind: TileKind;
  value: number;
  status: TileStatus;
  // Animation tracks (absolute time).
  row: Tween;
  col: Tween;
  scale: Tween;
  /** Hidden until this time (merge results wait for the slide to finish). */
  appearAt: number;
  /** Removed from the view at this time (merge sources); `Infinity` = stays. */
  removeAt: number;
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
  /** True while this tile's merge pop is playing (painters / effects may emphasise it). */
  readonly popping: boolean;
}

export class BoardView {
  private readonly sprites = new Map<TileId, TileSprite>();
  private gridSize: number;
  /** Time at which every currently scheduled animation has finished. */
  private busyUntil = Number.NEGATIVE_INFINITY;

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
      this.sprites.set(tile.id, {
        id: tile.id,
        kind: tile.kind,
        value: tile.value,
        status: tile.status,
        row: still(pos.row),
        col: still(pos.col),
        scale: still(1),
        appearAt: Number.NEGATIVE_INFINITY,
        removeAt: Number.POSITIVE_INFINITY,
        z: Z_NORMAL,
      });
    }
  }

  /**
   * Schedules a turn's events as animation starting at `now`.
   * Any animation still running is fast-forwarded first, so the view can never
   * drift from the core state no matter how quickly turns arrive.
   */
  apply(events: readonly TurnEvent[], now: number): void {
    this.finish();
    const t = this.timings;
    const slideEnd = now + t.slide;
    let slid = false;

    for (const e of events) {
      switch (e.type) {
        case 'move': {
          const s = this.require(e.tileId);
          s.row = tween(e.from.row, e.to.row, now, t.slide, easeOutCubic);
          s.col = tween(e.from.col, e.to.col, now, t.slide, easeOutCubic);
          slid = true;
          break;
        }
        case 'merge': {
          for (const [i, id] of e.sourceIds.entries()) {
            const s = this.require(id);
            const from = e.from[i] ?? e.to;
            s.row = tween(from.row, e.to.row, now, t.slide, easeOutCubic);
            s.col = tween(from.col, e.to.col, now, t.slide, easeOutCubic);
            s.removeAt = slideEnd;
            s.z = Z_VANISHING;
          }
          this.sprites.set(e.resultId, {
            id: e.resultId,
            kind: 'number',
            value: e.value,
            status: NO_STATUS,
            row: still(e.to.row),
            col: still(e.to.col),
            scale: tween(POP_FROM, 1, slideEnd, t.pop, popEase),
            appearAt: slideEnd,
            removeAt: Number.POSITIVE_INFINITY,
            z: Z_MERGED,
          });
          slid = true;
          break;
        }
        case 'spawn': {
          const start = slid ? slideEnd + t.spawnDelay : now;
          this.sprites.set(e.tileId, {
            id: e.tileId,
            kind: e.kind,
            value: e.value,
            status: NO_STATUS,
            row: still(e.at.row),
            col: still(e.at.col),
            scale: tween(0, 1, start, t.spawn, easeOutCubic),
            appearAt: start,
            removeAt: Number.POSITIVE_INFINITY,
            z: Z_NORMAL,
          });
          break;
        }
        case 'score':
        case 'gameOver':
          // Not board animation; the HUD / effects react to these.
          break;
      }
    }
    this.busyUntil = this.computeBusyUntil();
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
    const end = Number.POSITIVE_INFINITY;
    for (const [id, s] of this.sprites) {
      // Only sprites scheduled for removal go; `removeAt === Infinity` means "stays".
      if (Number.isFinite(s.removeAt)) {
        this.sprites.delete(id);
        continue;
      }
      s.row = still(sample(s.row, end));
      s.col = still(sample(s.col, end));
      s.scale = still(sample(s.scale, end));
      s.appearAt = Number.NEGATIVE_INFINITY;
      s.z = Z_NORMAL;
    }
    this.busyUntil = Number.NEGATIVE_INFINITY;
  }

  /** Visible sprites at `now`, sampled and sorted in draw order (back to front). */
  frame(now: number): SpriteFrame[] {
    const out: { z: number; f: SpriteFrame }[] = [];
    for (const s of this.sprites.values()) {
      if (now < s.appearAt || now >= s.removeAt) continue;
      out.push({
        z: s.z,
        f: {
          id: s.id,
          kind: s.kind,
          value: s.value,
          status: s.status,
          row: sample(s.row, now),
          col: sample(s.col, now),
          scale: sample(s.scale, now),
          popping: s.z === Z_MERGED && now < endTime(s.scale),
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
      until = Math.max(until, endTime(s.row), endTime(s.col), endTime(s.scale));
      if (Number.isFinite(s.removeAt)) until = Math.max(until, s.removeAt);
    }
    return until;
  }
}
