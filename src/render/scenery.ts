/**
 * What the board frame shows around the grid: which races have a companion
 * with the expedition and which have rallied. The render layer only knows
 * this small value; the game layer decides it (stage A: a mock driven by URL
 * parameters and owned relics, see src/game/factionMock.ts; stage B: the
 * real faction state).
 */

export type RaceId = 'elf' | 'dwarf' | 'human' | 'orc';

export const RACE_IDS: readonly RaceId[] = ['elf', 'dwarf', 'human', 'orc'];

/** none: no sign of the race; companion: 2 of its relics; rallied: all 4. */
export type RaceStage = 'none' | 'companion' | 'rallied';

export type Scenery = Readonly<Record<RaceId, RaceStage>>;

export const NO_SCENERY: Scenery = { elf: 'none', dwarf: 'none', human: 'none', orc: 'none' };

/** Relics needed for each stage (the plan's set sizes). */
export const COMPANION_AT = 2;
export const RALLY_AT = 4;

export function raceStage(owned: number): RaceStage {
  if (owned >= RALLY_AT) return 'rallied';
  if (owned >= COMPANION_AT) return 'companion';
  return 'none';
}

/** A stable key, so the renderer redraws the cached background only when the scenery changed. */
export function sceneryKey(scenery: Scenery): string {
  return RACE_IDS.map((r) => `${r}:${scenery[r]}`).join('|');
}
