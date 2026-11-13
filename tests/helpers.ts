/** Shared helpers for core tests (not a test file itself). */
import {
  NO_HAZARDS,
  createRelic,
  deriveRules,
  listTiles,
  playTurn,
  runDirections,
  runMove,
  chooseRelic,
  stateFromGrid,
  type BossState,
  type Direction,
  type GameState,
  type GridCell,
  type HazardParams,
  type RelicId,
  type RelicInstance,
  type RunState,
  type TileKind,
  type TileStatus,
  type TurnEvent,
  type TurnOutput,
  type TurnPhase,
} from '../src/core';

export function ofType<K extends TurnEvent['type']>(
  events: readonly TurnEvent[],
  type: K,
): Extract<TurnEvent, { type: K }>[] {
  return events.filter((e): e is Extract<TurnEvent, { type: K }> => e.type === type);
}

export function flat(phases: readonly TurnPhase[]): TurnEvent[] {
  return phases.flatMap((p) => p.events);
}

export interface TurnOptions {
  readonly relics?: readonly (RelicId | RelicInstance)[];
  readonly hazards?: HazardParams;
  readonly boss?: BossState | null;
  readonly seed?: number;
}

/** Plays one roguelike turn on a grid. */
export function turnOn(
  board: GameState | readonly (readonly GridCell[])[],
  direction: Direction,
  options: TurnOptions = {},
): TurnOutput {
  const relics = (options.relics ?? []).map((r) => (typeof r === 'string' ? createRelic(r) : r));
  return playTurn({
    board: Array.isArray(board)
      ? stateFromGrid(board as readonly (readonly GridCell[])[], options.seed ?? 0)
      : (board as GameState),
    direction,
    relics,
    rules: deriveRules(relics),
    hazards: options.hazards ?? NO_HAZARDS,
    boss: options.boss ?? null,
  });
}

/** Value grid with the tiles created by `spawn` events removed (to test slides alone). */
export function gridWithoutSpawns(out: TurnOutput): number[][] {
  const spawned = new Set(ofType(flat(out.phases), 'spawn').map((e) => e.tileId));
  const grid: number[][] = [];
  for (let r = 0; r < out.board.size; r++) {
    const row: number[] = [];
    for (let c = 0; c < out.board.size; c++) {
      const t = out.board.cells[r * out.board.size + c];
      row.push(!t || spawned.has(t.id) ? 0 : t.kind === 'stone' ? -1 : t.value);
    }
    grid.push(row);
  }
  return grid;
}

export interface ViewTile {
  row: number;
  col: number;
  value: number;
  kind: TileKind;
  status: TileStatus;
}

/** The board as id → tile, the way a renderer tracks it. */
export function snapshotTiles(board: GameState): Map<number, ViewTile> {
  return new Map(
    listTiles(board).map(({ tile, pos }) => [
      tile.id,
      { ...pos, value: tile.value, kind: tile.kind, status: tile.status },
    ]),
  );
}

/**
 * Applies phases to a renderer-style map, asserting causality: every event
 * refers only to tiles that exist at that moment. Returns the resulting map.
 */
export function replayPhases(
  start: Map<number, ViewTile>,
  phases: readonly TurnPhase[],
  fail: (message: string) => void,
): Map<number, ViewTile> {
  const view = new Map(start);
  const need = (id: number): ViewTile => {
    const t = view.get(id);
    if (!t) {
      fail(`event refers to missing tile ${id}`);
      throw new Error('unreachable');
    }
    return t;
  };
  for (const phase of phases) {
    for (const e of phase.events) {
      switch (e.type) {
        case 'move':
          view.set(e.tileId, { ...need(e.tileId), ...e.to });
          break;
        case 'merge':
          for (const id of e.sourceIds) {
            need(id);
            view.delete(id);
          }
          view.set(e.resultId, {
            ...e.to,
            value: e.value,
            kind: e.kind,
            status: { frozenTurns: 0, cursed: false },
          });
          break;
        case 'spawn':
          if (view.has(e.tileId)) fail(`spawn reuses id ${e.tileId}`);
          view.set(e.tileId, {
            ...e.at,
            value: e.value,
            kind: e.kind,
            status: { frozenTurns: 0, cursed: false },
          });
          break;
        case 'destroy':
          need(e.tileId);
          view.delete(e.tileId);
          break;
        case 'statusChange':
          view.set(e.tileId, { ...need(e.tileId), status: e.status });
          break;
        case 'valueChange':
          view.set(e.tileId, { ...need(e.tileId), value: e.to });
          break;
        case 'shuffle': {
          const moved = e.moves.map((m) => ({ id: m.tileId, t: need(m.tileId), to: m.to }));
          for (const m of moved) view.set(m.id, { ...m.t, ...m.to });
          break;
        }
        default:
          break;
      }
    }
  }
  return view;
}

/** Plays a run with a simple fixed policy: first available direction in a rotating order, first relic offered. */
export function autoplay(start: RunState, maxSteps: number, offset = 0): RunState {
  let run = start;
  for (let i = 0; i < maxSteps; i++) {
    if (run.status === 'offer') {
      run = chooseRelic(run, run.offer[0] ?? null).run;
      continue;
    }
    if (run.status !== 'playing') break;
    const dirs = runDirections(run);
    if (dirs.length === 0) break;
    run = runMove(run, dirs[(i + offset) % dirs.length] as Direction).run;
  }
  return run;
}
