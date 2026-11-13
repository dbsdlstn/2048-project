/**
 * The run state machine: a pure reducer over plain data.
 *
 *   run mode:     playing ──clear──▶ offer ──chooseRelic──▶ playing (next stage) … ──▶ victory
 *                    └──out of moves / stuck──▶ gameOver
 *   endless mode: playing ──max tile hits 64, 128, …──▶ offer ──chooseRelic──▶ playing
 *                    └──stuck──▶ gameOver
 *
 * Every function takes a `RunState` and returns a `RunStep` (new state +
 * phases to animate); inputs are never mutated, so the state can be saved
 * with JSON at any point and resumed with identical future rolls.
 */
import { DEFAULT_RULES, ENDLESS_TUNING, RELIC_TUNING } from './balance';
import {
  emptyBoard,
  hasAvailableMoves,
  availableDirections,
  listTiles,
  maxTileValue,
  spawnRandomTile,
  toTurnResult,
} from './board';
import { createBossState, lockedCells, type BossState } from './bosses';
import { toIndex } from './grid';
import { destroyTiles, placeStones, setStatus, type HazardParams } from './hazards';
import {
  createRelic,
  deriveRules,
  drawOffer,
  grantedKeywords,
  RELICS,
  type OfferContext,
  type RelicId,
  type RelicInstance,
  type TurnRules,
} from './relics';
import { createRng, nextFloat, type RngState } from './rng';
import {
  EMPTY_PROGRESS,
  STAGES,
  goalStatus,
  stageKeywords,
  type Keyword,
  type StageProgress,
  type StageSpec,
} from './stage';
import { playTurn, TurnBuilder } from './turn';
import type { Direction, FailReason, GameState, Position, TurnEvent, TurnPhase } from './types';

export type RunMode = 'run' | 'endless';

export type RunStatus =
  /** Waiting for a move or an active relic. */
  | 'playing'
  /** Waiting for `chooseRelic`. */
  | 'offer'
  /** Run mode: the last stage was cleared. */
  | 'victory'
  /** Out of moves, or stuck with no rescue left. */
  | 'gameOver';

export interface RunState {
  /** Save format version. */
  readonly version: 1;
  readonly mode: RunMode;
  /** The run's 32-bit seed (for display / sharing). */
  readonly seed: number;
  readonly status: RunStatus;
  readonly failReason: FailReason | null;
  /** Run mode: index into `STAGES`. Endless: number of relic picks so far. */
  readonly stageIndex: number;
  readonly board: GameState;
  readonly progress: StageProgress;
  readonly boss: BossState | null;
  readonly relics: readonly RelicInstance[];
  /** Relics on offer while `status === 'offer'`. */
  readonly offer: readonly RelicId[];
  /** Run mode: score of the stages already finished. */
  readonly bankedScore: number;
  /** Endless: the max-tile value that triggers the next relic offer. */
  readonly nextOfferTile: number;
  /** Run-level stream (stage seeds, relic offers); boards carry their own. */
  readonly rng: RngState;
  /** State before the last action, for the undo relic (one level). */
  readonly undo: RunSnapshot | null;
}

export type RunSnapshot = Omit<RunState, 'undo'>;

export interface RunStep {
  readonly run: RunState;
  /** False when the action was rejected or changed nothing. */
  readonly changed: boolean;
  /**
   * True when `run.board` is a different board (new stage, undo): the view
   * should clear itself, then play `phases`, which rebuild the board from empty.
   */
  readonly boardReplaced: boolean;
  readonly phases: readonly TurnPhase[];
  readonly events: readonly TurnEvent[];
}

// ---------------------------------------------------------------- queries

export function currentStage(run: RunState): StageSpec | null {
  return run.mode === 'run' ? (STAGES[run.stageIndex] ?? null) : null;
}

export function runRules(run: Pick<RunState, 'relics'>): TurnRules {
  return deriveRules(run.relics);
}

/** Hazards in effect: the stage's, or the endless ramp at the current move count. */
export function runHazards(run: RunState): HazardParams {
  if (run.mode === 'endless') return endlessHazards(run.board.turn);
  return currentStage(run)?.hazards ?? endlessHazards(0);
}

export function endlessHazards(turn: number): HazardParams {
  const T = ENDLESS_TUNING;
  const t = Math.max(0, turn - T.graceTurns);
  return {
    startStones: 0,
    stoneChance: Math.min(T.stoneChanceMax, t * T.stoneChancePerTurn),
    maxStones: T.maxStones,
    iceChance: Math.min(T.iceChanceMax, t * T.iceChancePerTurn),
    iceTurns: T.iceTurns,
    curseChance: Math.min(T.curseChanceMax, t * T.curseChancePerTurn),
  };
}

/** Move limit of the current stage including relic bonuses (null in endless). */
export function moveLimit(run: RunState): number | null {
  const spec = currentStage(run);
  if (!spec) return null;
  return spec.moveLimit + runRules(run).moveLimitBonus + run.progress.bonusMoves;
}

export function movesLeft(run: RunState): number | null {
  const limit = moveLimit(run);
  return limit === null ? null : Math.max(0, limit - run.progress.movesUsed);
}

export function totalScore(run: RunState): number {
  return run.bankedScore + run.board.score;
}

/** Moves until the boss acts (null without a boss). */
export function turnsUntilBoss(run: RunState): number | null {
  return run.boss?.turnsUntil ?? null;
}

/** Directions that would change the board, respecting a sealed line. */
export function runDirections(run: RunState): Direction[] {
  if (run.status !== 'playing') return [];
  return availableDirections(run.board, {
    walls: lockedCells(run.boss?.lock ?? null, run.board.size),
  });
}

/** Whether an active relic can be used right now (on `target`, if it needs one). */
export function canUseActive(run: RunState, relicId: RelicId, target?: Position): boolean {
  if (run.status !== 'playing') return false;
  const owned = run.relics.find((r) => r.id === relicId);
  const active = RELICS[relicId].active;
  if (!owned || !active || owned.charges <= 0) return false;
  switch (active.effect) {
    case 'undo':
      return run.undo !== null;
    case 'destroy':
      return target !== undefined && tileAt(run.board, target) !== null;
    case 'freeze': {
      const tile = target === undefined ? null : tileAt(run.board, target);
      return tile !== null && tile.kind !== 'stone';
    }
  }
}

// ---------------------------------------------------------------- actions

export interface StartOptions {
  /** Run mode: start at this stage instead of the first (debugging, balance tools). */
  readonly stageIndex?: number;
  /** Relics owned from the start (debugging, balance tools, tests). */
  readonly relics?: readonly RelicId[];
}

/** Starts a run (12 stages) or an endless game. */
export function startRun(
  mode: RunMode,
  seed: number | string,
  options: StartOptions = {},
): RunStep {
  const rng = createRng(seed);
  const base: RunSnapshot = {
    version: 1,
    mode,
    seed: rng.seed,
    status: 'playing',
    failReason: null,
    stageIndex: 0,
    board: emptyBoard(DEFAULT_RULES.boardSize, 0),
    progress: EMPTY_PROGRESS,
    boss: null,
    relics: (options.relics ?? []).map(createRelic),
    offer: [],
    bankedScore: 0,
    nextOfferTile: ENDLESS_TUNING.firstOfferTile,
    rng,
  };
  const index =
    mode === 'run' ? Math.min(Math.max(0, options.stageIndex ?? 0), STAGES.length - 1) : 0;
  return beginStage(base, index);
}

/** Plays one move. Rejected (unchanged) unless the run is `playing` and the board moves. */
export function runMove(run: RunState, direction: Direction): RunStep {
  if (run.status !== 'playing') return unchanged(run);
  const out = playTurn({
    board: run.board,
    direction,
    relics: run.relics,
    rules: runRules(run),
    hazards: runHazards(run),
    boss: run.boss,
  });
  if (!out.moved) return unchanged(run);
  const { stats } = out;
  const progress: StageProgress = {
    movesUsed: run.progress.movesUsed + 1,
    bonusMoves: run.progress.bonusMoves + stats.bonusMoves,
    score: run.progress.score + stats.scoreGained,
    stonesBroken: run.progress.stonesBroken + stats.stonesBroken,
    bestTile: Math.max(run.progress.bestTile, stats.bestTile),
  };
  const next: RunState = {
    ...run,
    board: out.board,
    boss: out.boss,
    relics: out.relics,
    progress,
    undo: snapshot(run),
  };
  const judged = judge(next);
  const phases = out.phases.map((p, i) =>
    i === out.phases.length - 1 ? { ...p, events: [...p.events, ...judged.events] } : p,
  );
  return step(judged.run, phases, false);
}

/** Takes one of the offered relics (or `null` to take none) and continues. */
export function chooseRelic(run: RunState, relicId: RelicId | null): RunStep {
  if (run.status !== 'offer') return unchanged(run);
  if (relicId !== null && !run.offer.includes(relicId)) return unchanged(run);
  const relics = relicId === null ? run.relics : [...run.relics, createRelic(relicId)];
  const base: RunSnapshot = { ...snapshot(run), relics, offer: [] };

  if (run.mode === 'run') {
    return beginStage(
      { ...base, bankedScore: run.bankedScore + run.board.score },
      run.stageIndex + 1,
    );
  }
  // Endless: the board stays; the pick starts a new "stage" for relic purposes.
  const b = new TurnBuilder(base.board, base.boss, base.relics);
  const events = b.stageStart();
  const next: RunState = {
    ...base,
    stageIndex: run.stageIndex + 1,
    status: 'playing',
    board: b.board,
    relics: b.relics,
    progress: { ...base.progress, bestTile: Math.max(base.progress.bestTile, b.bestTile) },
    undo: null,
  };
  const judged = judge(next);
  return step(judged.run, [{ kind: 'spawn', events: [...events, ...judged.events] }], false);
}

/**
 * Uses an active relic. `target` is required for tile-targeted relics.
 * Does not consume a move. Rejected (unchanged) when `canUseActive` is false.
 */
export function useActive(run: RunState, relicId: RelicId, target?: Position): RunStep {
  if (!canUseActive(run, relicId, target)) return unchanged(run);
  const active = RELICS[relicId].active;
  if (!active) return unchanged(run);
  const spend = (relics: readonly RelicInstance[], charges: number): RelicInstance[] =>
    relics.map((r) => (r.id === relicId ? { ...r, charges: charges - 1 } : r));
  const charges = run.relics.find((r) => r.id === relicId)?.charges ?? 0;

  if (active.effect === 'undo') {
    const prev = run.undo as RunSnapshot;
    const restored: RunState = { ...prev, relics: spend(prev.relics, charges), undo: null };
    return step(restored, [{ kind: 'spawn', events: rebuildEvents(restored.board) }], true);
  }

  const at = target as Position;
  const index = toIndex(at, run.board.size);
  const b = new TurnBuilder(run.board, run.boss, spend(run.relics, charges));
  const events: TurnEvent[] = [{ type: 'trigger', source: relicId, at }];
  if (active.effect === 'destroy') {
    const wasStone = run.board.cells[index]?.kind === 'stone';
    const d = destroyTiles(b.board, [index], 'active');
    b.board = d.state;
    events.push(...d.events);
    if (wasStone) events.push(...b.stonesBroke(1));
  } else {
    const tile = run.board.cells[index];
    if (!tile) return unchanged(run);
    const frozenTurns = Math.max(tile.status.frozenTurns, RELIC_TUNING.pinTurns);
    const s = setStatus(b.board, index, { ...tile.status, frozenTurns }, 'active');
    b.board = s.state;
    events.push(...s.events);
  }
  const next: RunState = {
    ...run,
    board: b.board,
    relics: b.relics,
    progress: {
      ...run.progress,
      stonesBroken: run.progress.stonesBroken + b.stonesBroken,
      bonusMoves: run.progress.bonusMoves + b.bonusMoves,
    },
    undo: snapshot(run),
  };
  const judged = judge(next);
  return step(judged.run, [{ kind: 'resolve', events: [...events, ...judged.events] }], false);
}

// ---------------------------------------------------------------- internals

function unchanged(run: RunState): RunStep {
  return { run, changed: false, boardReplaced: false, phases: [], events: [] };
}

function step(run: RunState, phases: TurnPhase[], boardReplaced: boolean): RunStep {
  const result = toTurnResult(run.board, true, phases);
  return { run, changed: true, boardReplaced, phases: result.phases, events: result.events };
}

/** The run without its undo slot (so snapshots never nest). */
function snapshot(run: RunState): RunSnapshot {
  return {
    version: run.version,
    mode: run.mode,
    seed: run.seed,
    status: run.status,
    failReason: run.failReason,
    stageIndex: run.stageIndex,
    board: run.board,
    progress: run.progress,
    boss: run.boss,
    relics: run.relics,
    offer: run.offer,
    bankedScore: run.bankedScore,
    nextOfferTile: run.nextOfferTile,
    rng: run.rng,
  };
}

function tileAt(board: GameState, pos: Position) {
  if (pos.row < 0 || pos.col < 0 || pos.row >= board.size || pos.col >= board.size) return null;
  return board.cells[toIndex(pos, board.size)] ?? null;
}

/** Spawn (and status) events that build `board` from an empty view. */
function rebuildEvents(board: GameState): TurnEvent[] {
  const events: TurnEvent[] = [];
  for (const { tile, pos } of listTiles(board)) {
    events.push({ type: 'spawn', tileId: tile.id, kind: tile.kind, value: tile.value, at: pos });
    if (tile.status.cursed || tile.status.frozenTurns > 0) {
      events.push({
        type: 'statusChange',
        tileId: tile.id,
        at: pos,
        status: tile.status,
        cause: tile.status.frozenTurns > 0 ? 'ice' : 'curse',
      });
    }
  }
  return events;
}

/** Sets up stage `index` (run) or the endless board, and runs stage-start relic hooks. */
function beginStage(base: RunSnapshot, index: number): RunStep {
  const spec = base.mode === 'run' ? STAGES[index] : undefined;
  const rules = runRules(base);
  const seedRoll = nextFloat(base.rng);
  let board = emptyBoard(DEFAULT_RULES.boardSize, Math.floor(seedRoll.value * 4294967296));
  const events: TurnEvent[] = [];
  for (let i = 0; i < DEFAULT_RULES.startTiles; i++) {
    const s = spawnRandomTile(board, { fourChance: rules.fourChance });
    board = s.state;
    events.push(...s.events);
  }
  if (spec) {
    const stones = placeStones(board, spec.hazards.startStones);
    board = stones.state;
    events.push(...stones.events);
  }
  const boss = spec?.boss ? createBossState(spec.boss, rules.bossPeriodBonus) : null;
  const b = new TurnBuilder(board, boss, base.relics);
  events.push(...b.stageStart());
  const run: RunState = {
    ...base,
    status: 'playing',
    failReason: null,
    stageIndex: index,
    board: b.board,
    boss: b.boss,
    relics: b.relics,
    progress: { ...EMPTY_PROGRESS, bestTile: b.bestTile },
    offer: [],
    rng: seedRoll.rng,
    undo: null,
  };
  return step(run, [{ kind: 'spawn', events }], true);
}

const ENDLESS_KEYWORDS: readonly Keyword[] = ['stone', 'ice', 'curse', 'scoreGoal'];

/** Keywords still ahead (stages from `fromIndex` on, or endless), plus what owned relics grant. */
function offerContext(run: RunState, fromIndex: number): OfferContext {
  const keywords = grantedKeywords(run.relics);
  if (run.mode === 'endless') {
    for (const k of ENDLESS_KEYWORDS) keywords.add(k);
  } else {
    for (const spec of STAGES.slice(fromIndex))
      for (const k of stageKeywords(spec)) keywords.add(k);
  }
  return { has: (k) => keywords.has(k) };
}

/** Whether an active relic could still get the player out of a stuck board. */
function hasRescue(run: RunState): boolean {
  return run.relics.some((r) => {
    const effect = RELICS[r.id].active?.effect;
    if (r.charges <= 0) return false;
    return effect === 'destroy' || (effect === 'undo' && run.undo !== null);
  });
}

function isStuck(run: RunState): boolean {
  return !hasAvailableMoves(run.board, {
    walls: lockedCells(run.boss?.lock ?? null, run.board.size),
  });
}

/**
 * A sealed line may never be the only reason the board is stuck: if lifting
 * it would make a move possible, it breaks right away.
 */
function releaseLockIfStuck(run: RunState): { run: RunState; events: TurnEvent[] } {
  const lock = run.boss?.lock;
  if (!run.boss || !lock || !isStuck(run) || !hasAvailableMoves(run.board)) {
    return { run, events: [] };
  }
  return {
    run: { ...run, boss: { ...run.boss, lock: null } },
    events: [{ type: 'lineUnlock', axis: lock.axis, index: lock.index }],
  };
}

/** Decides what happens after an action: clear, offer, fail, or keep playing. */
function judge(input: RunState): { run: RunState; events: TurnEvent[] } {
  const released = releaseLockIfStuck(input);
  const decided = decide(released.run);
  return { run: decided.run, events: [...released.events, ...decided.events] };
}

function decide(run: RunState): { run: RunState; events: TurnEvent[] } {
  if (run.mode === 'run') {
    const spec = STAGES[run.stageIndex];
    if (!spec) return { run, events: [] };
    if (goalStatus(spec.goal, run.progress).done) {
      const events: TurnEvent[] = [{ type: 'stageCleared' }];
      if (run.stageIndex >= STAGES.length - 1) {
        return { run: { ...run, status: 'victory', undo: null }, events };
      }
      const drawn = drawOffer(run.rng, run.relics, offerContext(run, run.stageIndex + 1));
      return {
        run: { ...run, status: 'offer', offer: drawn.offer, rng: drawn.rng, undo: null },
        events,
      };
    }
    if ((movesLeft(run) ?? 1) <= 0) return fail(run, 'moves', 'stageFailed');
    if (isStuck(run) && !hasRescue(run)) return fail(run, 'stuck', 'stageFailed');
    return { run, events: [] };
  }

  // Endless.
  const max = maxTileValue(run.board);
  if (max >= run.nextOfferTile) {
    let nextOfferTile = run.nextOfferTile;
    while (nextOfferTile <= max) nextOfferTile *= 2;
    const drawn = drawOffer(run.rng, run.relics, offerContext(run, 0));
    if (drawn.offer.length > 0) {
      return {
        run: {
          ...run,
          status: 'offer',
          offer: drawn.offer,
          rng: drawn.rng,
          nextOfferTile,
          undo: null,
        },
        events: [],
      };
    }
    run = { ...run, nextOfferTile, rng: drawn.rng };
  }
  if (isStuck(run) && !hasRescue(run)) return fail(run, 'stuck', 'gameOver');
  return { run, events: [] };
}

function fail(
  run: RunState,
  reason: FailReason,
  type: 'stageFailed' | 'gameOver',
): { run: RunState; events: TurnEvent[] } {
  const event: TurnEvent = type === 'stageFailed' ? { type, reason } : { type };
  return { run: { ...run, status: 'gameOver', failReason: reason, undo: null }, events: [event] };
}
