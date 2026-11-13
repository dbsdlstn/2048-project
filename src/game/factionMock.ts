/**
 * STAGE A MOCK of the faction mechanic (races, set progress, companions,
 * rallies). It exists only so the storybook art proof can show these states
 * on top of the real game; no rule reads it.
 *
 * - Which relic belongs to which race: `RACE_OF` (the plan's table).
 *   Stage B: replace with a `race` field on `RelicDef` in src/core.
 * - How many relics of a race the player holds: the run's real relics plus
 *   a debug bonus from `?mockFaction=dwarf:2,elf:1` (pretend-owned extras).
 *   Stage B: drop the bonus; the count comes from the run.
 * - Names, effect lines and pictures of the dwarf relics in the new world:
 *   `DWARF_RELIC_LOOKS`. Stage B/C: move into the relic definitions.
 *
 * Everything below is pure, so the plumbing is unit-tested.
 */
import { RELIC_TUNING, type RelicId } from '../core';
import {
  COMPANION_AT,
  RACE_IDS,
  RALLY_AT,
  raceStage,
  type RaceId,
  type Scenery,
} from '../render/scenery';

export const RACE_OF: Readonly<Record<RelicId, RaceId>> = {
  pickaxe: 'dwarf',
  debrisFuel: 'dwarf',
  bomb: 'dwarf',
  ignition: 'dwarf',
  chain: 'elf',
  prismCore: 'elf',
  twinSeed: 'elf',
  leapLens: 'elf',
  cornerAnchor: 'human',
  spareSpring: 'human',
  undo: 'human',
  delayVeil: 'human',
  resonance: 'orc',
  reverseFilter: 'orc',
  freezePin: 'orc',
  capacitor: 'orc',
};

export const RACE_LABEL: Readonly<Record<RaceId, string>> = {
  elf: '엘프',
  dwarf: '드워프',
  human: '인간',
  orc: '오크',
};

/** Relics per race (a full set). */
export const SET_SIZE = RALLY_AT;

export type RaceCounts = Readonly<Record<RaceId, number>>;

const ZERO: RaceCounts = { elf: 0, dwarf: 0, human: 0, orc: 0 };

/**
 * Parses `?mockFaction=dwarf:2,elf:1` (extra pretend-owned relics per race,
 * 0–4). Unknown races and bad numbers are ignored; nothing valid gives null.
 */
export function parseMockFaction(value: string | null | undefined): Partial<RaceCounts> | null {
  if (!value) return null;
  const out: Partial<Record<RaceId, number>> = {};
  for (const part of value.split(',')) {
    const [name, raw] = part.split(':').map((s) => s.trim().toLowerCase());
    const race = RACE_IDS.find((r) => r === name);
    const n = Number(raw ?? '');
    if (race && Number.isInteger(n) && n >= 0) out[race] = Math.min(SET_SIZE, n);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Relics held per race: owned relics plus the mock bonus, capped at a full set. */
export function raceCounts(
  owned: readonly RelicId[],
  bonus: Partial<RaceCounts> | null,
): RaceCounts {
  const counts: Record<RaceId, number> = { ...ZERO };
  for (const id of owned) counts[RACE_OF[id]]++;
  for (const race of RACE_IDS)
    counts[race] = Math.min(SET_SIZE, counts[race] + (bonus?.[race] ?? 0));
  return counts;
}

export function sceneryFor(counts: RaceCounts): Scenery {
  return {
    elf: raceStage(counts.elf),
    dwarf: raceStage(counts.dwarf),
    human: raceStage(counts.human),
    orc: raceStage(counts.orc),
  };
}

export interface FactionMoment {
  readonly kind: 'join' | 'rally';
  readonly race: RaceId;
}

/** The milestones crossed between two counts (a jump from 1 to 4 is a rally only). */
export function momentsBetween(before: RaceCounts, after: RaceCounts): FactionMoment[] {
  const out: FactionMoment[] = [];
  for (const race of RACE_IDS) {
    const a = before[race];
    const b = after[race];
    if (a < RALLY_AT && b >= RALLY_AT) out.push({ kind: 'rally', race });
    else if (a < COMPANION_AT && b >= COMPANION_AT) out.push({ kind: 'join', race });
  }
  return out;
}

/** "드워프 1/4 → 2/4 · 동료 합류!" for an offered relic, given the current counts. */
export function offerProgress(
  id: RelicId,
  counts: RaceCounts,
): {
  readonly text: string;
  readonly milestone: FactionMoment['kind'] | null;
} {
  const race = RACE_OF[id];
  const now = counts[race];
  const next = Math.min(SET_SIZE, now + 1);
  const milestone =
    next === RALLY_AT && now < RALLY_AT
      ? 'rally'
      : next === COMPANION_AT && now < COMPANION_AT
        ? 'join'
        : null;
  const tail =
    milestone === 'rally' ? ' · 종족 결집!' : milestone === 'join' ? ' · 동료 합류!' : '';
  return {
    text: `${RACE_LABEL[race]} ${now}/${SET_SIZE} → ${next}/${SET_SIZE}${tail}`,
    milestone,
  };
}

export interface RelicLook {
  readonly name: string;
  readonly evolvedName: string;
  /** One-line effect in the new world's words (same rule as the relic's real description). */
  readonly line: string;
}

const T = RELIC_TUNING;

/** The dwarf set as it will be presented (names invented for this world). */
export const DWARF_RELIC_LOOKS: Readonly<Partial<Record<RelicId, RelicLook>>> = {
  pickaxe: {
    name: '룬 곡괭이',
    evolvedName: '산심장 곡괭이',
    line: `${T.pickaxeMinValue} 이상을 만든 합체는 대각선 이웃의 바위까지 부순다`,
  },
  debrisFuel: {
    name: '잔돌 풀무',
    evolvedName: '용광 풀무',
    line: `바위를 ${T.stonesPerMove}개 부술 때마다 이동 +1`,
  },
  bomb: {
    name: '벼락 화약통',
    evolvedName: '산울림 화약통',
    line: '[사용] 고른 룬석 하나를 없앤다 · 스테이지마다 1회',
  },
  ignition: {
    name: '불씨 부싯돌',
    evolvedName: '대장간 심장불',
    line: `스테이지를 시작할 때 빈 구석 칸에 ${T.igniteValue} 룬석 하나를 놓는다`,
  },
};
