/**
 * The roguelike turn engine: one move with hazards, a boss and relics.
 *
 * It is the only place that knows *why* things happen, so it is also the
 * place that cuts the turn into phases (see `TurnPhaseKind`):
 *
 *   slide → resolve → (chain → resolve)* → boss → spawn → end
 *
 * Internally it uses a small mutable builder for readability, but it never
 * touches its inputs: callers see a pure function from input to output.
 */
import {
  maxTileValue,
  slide,
  spawnInCorner,
  spawnOnRandomEmpty,
  spawnRandomTile,
  type MergeOutcome,
  type MergeResolver,
  type SlideOptions,
} from './board';
import { advanceBoss, lockedCells, tickLock, type BossState } from './bosses';
import { toPosition } from './grid';
import {
  breakStones,
  frozenIds,
  rollHazards,
  tickIce,
  type HazardParams,
  type MergeSite,
} from './hazards';
import {
  RELICS,
  type MergeHookContext,
  type RelicEffect,
  type RelicInstance,
  type TurnRules,
} from './relics';
import { hasStatus, mergedValue } from './tile';
import type { Direction, GameState, Position, Tile, TileKind, TurnEvent, TurnPhase } from './types';

export interface TurnInput {
  readonly board: GameState;
  readonly direction: Direction;
  readonly relics: readonly RelicInstance[];
  readonly rules: TurnRules;
  readonly hazards: HazardParams;
  readonly boss: BossState | null;
}

/** Numbers the run needs for goals and HUD, summed over the whole turn. */
export interface TurnStats {
  readonly merges: number;
  /** Score from merges only (before end-of-turn bonuses). */
  readonly mergeScore: number;
  /** All score gained this turn. */
  readonly scoreGained: number;
  readonly stonesBroken: number;
  readonly bonusMoves: number;
  /** Largest number tile that existed at any point this turn. */
  readonly bestTile: number;
}

export interface TurnOutput {
  readonly board: GameState;
  readonly boss: BossState | null;
  readonly relics: readonly RelicInstance[];
  readonly moved: boolean;
  /** Phases in order; may contain empty phases (the run filters them). */
  readonly phases: TurnPhase[];
  readonly stats: TurnStats;
}

/** Mutable scratch state for one turn (or one stage-start / active use). */
export class TurnBuilder {
  board: GameState;
  boss: BossState | null;
  relics: RelicInstance[];
  merges = 0;
  mergeScore = 0;
  scoreGained = 0;
  stonesBroken = 0;
  bonusMoves = 0;
  bestTile: number;

  constructor(board: GameState, boss: BossState | null, relics: readonly RelicInstance[]) {
    this.board = board;
    this.boss = boss;
    this.relics = relics.slice();
    this.bestTile = maxTileValue(board);
  }

  get stats(): TurnStats {
    return {
      merges: this.merges,
      mergeScore: this.mergeScore,
      scoreGained: this.scoreGained,
      stonesBroken: this.stonesBroken,
      bonusMoves: this.bonusMoves,
      bestTile: this.bestTile,
    };
  }

  /** Cells of the sealed line, if any. */
  walls(): Set<number> {
    return lockedCells(this.boss?.lock ?? null, this.board.size);
  }

  noteBest(): void {
    this.bestTile = Math.max(this.bestTile, maxTileValue(this.board));
  }

  addScore(amount: number): TurnEvent | null {
    if (amount <= 0) return null;
    this.board = { ...this.board, score: this.board.score + amount };
    this.scoreGained += amount;
    return { type: 'score', gained: amount, total: this.board.score };
  }

  setCounter(index: number, counter: number | undefined): void {
    const r = this.relics[index];
    if (r && counter !== undefined && counter !== r.counter) {
      this.relics[index] = { ...r, counter };
    }
  }

  /**
   * Applies a relic's effects; returns the events they produced, led by a
   * `trigger` event when anything observable happened.
   */
  applyEffects(source: RelicInstance, effects: readonly RelicEffect[]): TurnEvent[] {
    const events: TurnEvent[] = [];
    let charged = 0;
    for (const effect of effects) {
      switch (effect.kind) {
        case 'score': {
          const e = this.addScore(effect.amount);
          if (e) events.push(e);
          break;
        }
        case 'bonusMoves':
          if (effect.amount > 0) {
            this.bonusMoves += effect.amount;
            events.push({ type: 'bonusMoves', amount: effect.amount });
          }
          break;
        case 'charge':
          this.relics = this.relics.map((r) => {
            const active = RELICS[r.id].active;
            if (!active) return r;
            const charges = Math.min(active.maxCharges, r.charges + effect.amount);
            if (charges === r.charges) return r;
            charged++;
            return { ...r, charges };
          });
          break;
        case 'placeTile': {
          const place = effect.corner ? spawnInCorner : spawnOnRandomEmpty;
          const step = place(this.board, 'number', effect.value, this.walls());
          this.board = step.state;
          events.push(...step.events);
          this.noteBest();
          break;
        }
        case 'spawnPrism':
          // Read directly by the spawn step.
          break;
      }
    }
    if (events.length === 0 && charged === 0) return [];
    return [{ type: 'trigger', source: source.id, at: null }, ...events];
  }

  /** The merge rule with curse and relic `onMerge` hooks; collects trigger events. */
  mergeResolver(sink: TurnEvent[]): MergeResolver {
    const size = this.board.size;
    return (leader: Tile, follower: Tile, targetIndex: number): MergeOutcome => {
      const at: Position = toPosition(targetIndex, size);
      const base = mergedValue(leader, follower);
      const last = size - 1;
      const ctx: MergeHookContext = {
        value: base,
        at,
        corner: (at.row === 0 || at.row === last) && (at.col === 0 || at.col === last),
        withStatus: hasStatus(leader) || hasStatus(follower),
      };
      let valueFactor = 1;
      let scoreFactor = 1;
      this.relics.forEach((r, i) => {
        const res = RELICS[r.id].onMerge?.(ctx, r);
        if (!res) return;
        valueFactor *= res.mod.valueFactor ?? 1;
        scoreFactor *= res.mod.scoreFactor ?? 1;
        this.setCounter(i, res.counter);
        sink.push({ type: 'trigger', source: r.id, at });
      });
      const cursed = leader.status.cursed || follower.status.cursed;
      const raw = base * valueFactor;
      const value = cursed ? Math.max(2, raw / 2) : raw;
      const kind: TileKind = 'number';
      return { kind, value, score: Math.floor(value * scoreFactor), cursed };
    };
  }

  /** Slides once (optionally as a chain pass). Returns the phase events and merge sites, or null if nothing changed. */
  slidePass(
    direction: Direction,
    fresh: ReadonlySet<number> | null,
  ): { events: TurnEvent[]; sites: MergeSite[]; created: Set<number> } | null {
    const triggers: TurnEvent[] = [];
    const options: SlideOptions = {
      walls: this.walls(),
      resolveMerge: this.mergeResolver(triggers),
      ...(fresh ? { mayMerge: (a: Tile, b: Tile) => fresh.has(a.id) || fresh.has(b.id) } : {}),
    };
    const relicsBefore = this.relics;
    const slid = slide(this.board, direction, options);
    const merges = slid.events.filter((e) => e.type === 'merge');
    // A chain pass only counts if it merged something; plain compaction is not a chain.
    if (!slid.moved || (fresh && merges.length === 0)) {
      this.relics = relicsBefore;
      return null;
    }
    const size = this.board.size;
    this.board = slid.state;
    this.merges += merges.length;
    this.mergeScore += slid.scoreGained;
    const events: TurnEvent[] = [...slid.events, ...triggers];
    const score = this.addScore(slid.scoreGained);
    if (score) events.push(score);
    this.noteBest();
    const sites: MergeSite[] = [];
    const created = new Set<number>();
    for (const m of merges) {
      sites.push({ index: m.to.row * size + m.to.col, value: m.value });
      created.add(m.resultId);
    }
    return { events, sites, created };
  }

  /** Stones next to this pass's merges break; relics react to broken stones. */
  resolve(sites: readonly MergeSite[], rules: TurnRules): TurnEvent[] {
    const broken = breakStones(this.board, sites, rules.diagonalBreakFrom);
    this.board = broken.state;
    const events: TurnEvent[] = [...broken.events];
    if (broken.broken > 0) events.push(...this.stonesBroke(broken.broken));
    return events;
  }

  /** Counts broken stones and runs `onStoneBreak` hooks. */
  stonesBroke(count: number): TurnEvent[] {
    this.stonesBroken += count;
    const events: TurnEvent[] = [];
    this.relics.forEach((r, i) => {
      const out = RELICS[r.id].onStoneBreak?.(count, r);
      if (!out) return;
      this.setCounter(i, out.counter);
      events.push(...this.applyEffects(this.relics[i] as RelicInstance, out.effects ?? []));
    });
    return events;
  }

  /** Runs every owned relic's `onStageStart` hook and recharges active relics. */
  stageStart(): TurnEvent[] {
    const events: TurnEvent[] = [];
    this.relics = this.relics.map((r) => {
      const active = RELICS[r.id].active;
      if (!active) return r;
      return { ...r, charges: Math.min(active.maxCharges, r.charges + active.rechargePerStage) };
    });
    this.relics.forEach((r, i) => {
      const out = RELICS[r.id].onStageStart?.(r);
      if (!out) return;
      this.setCounter(i, out.counter);
      events.push(...this.applyEffects(this.relics[i] as RelicInstance, out.effects ?? []));
    });
    this.noteBest();
    return events;
  }
}

/** Plays one move of the roguelike game. An unmoved result returns the inputs unchanged. */
export function playTurn(input: TurnInput): TurnOutput {
  const { direction, rules } = input;
  const b = new TurnBuilder(input.board, input.boss, input.relics);
  const frozenBefore = frozenIds(input.board);

  // 1. slide
  const first = b.slidePass(direction, null);
  if (!first) {
    return {
      board: input.board,
      boss: input.boss,
      relics: input.relics,
      moved: false,
      phases: [],
      stats: b.stats,
    };
  }
  const phases: TurnPhase[] = [{ kind: 'slide', events: first.events }];
  phases.push({ kind: 'resolve', events: b.resolve(first.sites, rules) });

  // 2. chain passes: only merges involving a tile created by the previous pass.
  let fresh = first.created;
  for (let depth = 0; depth < rules.chainDepth; depth++) {
    const pass = b.slidePass(direction, fresh);
    if (!pass) break;
    phases.push({ kind: 'chain', events: pass.events });
    phases.push({ kind: 'resolve', events: b.resolve(pass.sites, rules) });
    fresh = pass.created;
  }
  b.board = { ...b.board, turn: b.board.turn + 1 };

  // 3. boss
  let lockCreated = false;
  if (b.boss) {
    const step = advanceBoss(b.board, b.boss);
    b.board = step.state;
    b.boss = step.boss;
    lockCreated = step.triggered && step.boss.lock !== null;
    phases.push({ kind: 'boss', events: step.events });
  }

  // 4. spawn: relic spawn hooks, the regular spawn, then hazards.
  const spawnEvents: TurnEvent[] = [];
  let spawnKind: TileKind = 'number';
  b.relics.forEach((r, i) => {
    const out = RELICS[r.id].onSpawn?.(r);
    if (!out) return;
    b.setCounter(i, out.counter);
    if (out.effects?.some((e) => e.kind === 'spawnPrism')) {
      spawnKind = 'prism';
      spawnEvents.push({ type: 'trigger', source: r.id, at: null });
    }
  });
  const blocked = b.walls();
  const spawned = spawnRandomTile(b.board, { fourChance: rules.fourChance }, blocked, spawnKind);
  b.board = spawned.state;
  spawnEvents.push(...spawned.events);
  const hazards = rollHazards(b.board, input.hazards, blocked);
  b.board = hazards.state;
  spawnEvents.push(...hazards.events);
  phases.push({ kind: 'spawn', events: spawnEvents });

  // 5. end: ice thaws, sealed line counts down, end-of-turn relics.
  const endEvents: TurnEvent[] = [];
  const thaw = tickIce(b.board, frozenBefore);
  b.board = thaw.state;
  endEvents.push(...thaw.events);
  if (b.boss) {
    const lock = tickLock(b.boss, lockCreated);
    b.boss = lock.boss;
    endEvents.push(...lock.events);
  }
  const ctx = { merges: b.merges, mergeScore: b.mergeScore };
  b.relics.forEach((r, i) => {
    const out = RELICS[r.id].onTurnEnd?.(ctx, r);
    if (!out) return;
    b.setCounter(i, out.counter);
    endEvents.push(...b.applyEffects(b.relics[i] as RelicInstance, out.effects ?? []));
  });
  phases.push({ kind: 'end', events: endEvents });

  return { board: b.board, boss: b.boss, relics: b.relics, moved: true, phases, stats: b.stats };
}
