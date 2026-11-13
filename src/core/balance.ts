/**
 * Tunable game numbers live here so balancing never requires touching logic.
 * Later stages add hazard frequencies, stage goals, relic odds, etc.
 */

export interface CoreRules {
  /** Board is `boardSize` x `boardSize`. */
  readonly boardSize: number;
  /** Number of tiles spawned when a new game starts. */
  readonly startTiles: number;
  /** Probability that a spawned number tile is a 4 instead of a 2. */
  readonly fourChance: number;
}

export const DEFAULT_RULES: CoreRules = {
  boardSize: 4,
  startTiles: 2,
  fourChance: 0.1,
};
