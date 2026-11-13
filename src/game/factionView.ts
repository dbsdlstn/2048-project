/**
 * Shows the (stage A: mocked) faction state in the storybook look: the board
 * frame's scenery, the join / rally moment, offer-card decorations and the
 * journey map's state. The controller and the core know nothing about it;
 * main.ts feeds it the owned relics on every HUD update.
 *
 * Stage B: `raceCounts` will come from the core's faction state instead of
 * `factionMock.ts`; this class stays as the presentation layer.
 */
import { RELICS, type RelicId, type RunState } from '../core';
import type { HudModel } from './runView';
import type { Effect } from '../render/effects';
import type { CellBurst } from '../render/fx';
import { NO_SCENERY, RACE_IDS, sceneryKey, type RaceId, type Scenery } from '../render/scenery';
import { DWARF_FIGURE, RELIC_EMBLEMS, crest, emblemSvg } from '../render/storybook/emblems';
import { FrameMoment } from '../render/storybook/moment';
import {
  DWARF_RELIC_LOOKS,
  RACE_LABEL,
  RACE_OF,
  momentsBetween,
  offerProgress,
  raceCounts,
  sceneryFor,
  type FactionMoment,
  type RaceCounts,
} from './factionMock';

/** Where the party stands on the act 1 journey map (view model of src/ui/journey.ts). */
export interface JourneyState {
  /** Stops reached in act 1: 0 = at the start, 1–3 = after stage 1-1 … 1-3, 4 = beacon reached. */
  readonly reached: number;
  /** Whether the act's beacon burns (its boss was beaten). */
  readonly beaconLit: boolean;
  readonly companions: readonly RaceId[];
  readonly rallied: readonly RaceId[];
}

export type JourneyMoment = FactionMoment | null;

/**
 * Extra presentation for an offered relic (storybook proof): picture, new
 * name and line, race crest and set progress.
 */
export interface OfferDecoration {
  readonly name: string;
  readonly line: string;
  /** Inline SVG markup (static, code-drawn), or null when the relic has no picture yet. */
  readonly emblemSvg: string | null;
  readonly crestSvg: string;
  /** e.g. "드워프 1/4 → 2/4 · 동료 합류!" */
  readonly progress: string;
  readonly milestone: 'join' | 'rally' | null;
}

/** What the director needs from the board (implemented over `BoardRenderer` in main.ts). */
export interface FrameDisplay {
  setScenery(scenery: Scenery, revealMs?: number): void;
  addEffect(effect: Effect): void;
  burst(spec: CellBurst): void;
  viewTimeNow(): number;
  readonly reducedMotion: boolean;
  readonly fontFamily: string;
}

/** How long the new frame takes to unroll during a moment. */
export const REVEAL_MS = 900;

const GOLD_DUST = ['#f1d27a', '#c8952c', '#ffd36b'];

export class FactionDirector {
  private countsValue: RaceCounts = { elf: 0, dwarf: 0, human: 0, orc: 0 };
  private scenery: Scenery = NO_SCENERY;
  private owned: readonly RelicId[] = [];
  private runKey: number | null = null;

  constructor(
    private readonly display: FrameDisplay,
    private bonus: Partial<RaceCounts> | null,
  ) {}

  get counts(): RaceCounts {
    return this.countsValue;
  }

  get currentScenery(): Scenery {
    return this.scenery;
  }

  /**
   * New relic list (every HUD update). Within the same run, crossing 2 or 4
   * relics of a race plays its moment; a different run (or the first call)
   * just sets the frame. Returns the moments played.
   */
  update(owned: readonly RelicId[], runKey: number | null): FactionMoment[] {
    this.owned = owned;
    const next = raceCounts(owned, this.bonus);
    const sameRun = runKey !== null && runKey === this.runKey;
    const moments = sameRun ? momentsBetween(this.countsValue, next) : [];
    this.runKey = runKey;
    this.countsValue = next;
    const moment = moments.at(-1);
    if (moment) this.play(moment);
    else this.applyScenery(sceneryFor(next), 0);
    return moments;
  }

  /** Debug: changes the pretend-owned bonus and redraws the frame (no moment). */
  setBonus(bonus: Partial<RaceCounts> | null): void {
    this.bonus = bonus;
    this.countsValue = raceCounts(this.owned, bonus);
    this.applyScenery(sceneryFor(this.countsValue), 0);
  }

  /**
   * Debug: makes the race hold exactly enough relics for the milestone (by
   * adjusting the pretend bonus) and plays its moment.
   */
  celebrate(kind: FactionMoment['kind'], race: RaceId): void {
    const need = kind === 'rally' ? 4 : 2;
    const real = raceCounts(this.owned, null)[race];
    this.bonus = { ...this.bonus, [race]: Math.max(0, need - real) };
    this.countsValue = raceCounts(this.owned, this.bonus);
    this.play({ kind, race });
  }

  /** Plays a join / rally moment on the board and moves the frame to the matching scenery. */
  play(moment: FactionMoment): void {
    const target: Scenery = {
      ...sceneryFor(this.countsValue),
      [moment.race]: moment.kind === 'rally' ? 'rallied' : 'companion',
    };
    const d = this.display;
    this.applyScenery(target, REVEAL_MS);
    const label = RACE_LABEL[moment.race];
    const text = moment.kind === 'rally' ? `${label} 결집!` : `${label} 동료 합류!`;
    d.addEffect(
      new FrameMoment(
        moment.kind,
        moment.race,
        text,
        d.viewTimeNow(),
        d.fontFamily,
        d.reducedMotion,
      ),
    );
    // Gold dust rains from the frame; a rally adds embers rising from the halls.
    const rally = moment.kind === 'rally';
    for (let i = 0; i < 4; i++) {
      for (const [row, col] of [
        [-0.62, i],
        [3.62, i],
        [i, -0.62],
        [i, 3.62],
      ] as const) {
        d.burst({
          row,
          col,
          shape: 'bit',
          count: rally ? 6 : 3,
          colors: GOLD_DUST,
          speed: [0.3, 1.2],
          life: [700, 1300],
          size: [0.04, 0.07],
          gravity: 1.2,
          spin: 0.02,
          drag: 0.94,
          jitter: 0.4,
          stagger: 400,
        });
      }
    }
    d.burst({
      row: 1.5,
      col: 1.5,
      shape: 'spark',
      count: rally ? 28 : 14,
      colors: ['#ffd36b', '#e2672a', '#f1d27a'],
      speed: [0.6, 2.2],
      life: [700, 1200],
      size: [0.05, 0.1],
      gravity: -0.8,
      drag: 0.92,
      jitter: 1.4,
      stagger: 300,
    });
  }

  /** Storybook offer card: picture, new name and line, crest and set progress. */
  decorate(id: RelicId): OfferDecoration {
    const race = RACE_OF[id];
    const look = DWARF_RELIC_LOOKS[id];
    const art = RELIC_EMBLEMS[id];
    const progress = offerProgress(id, this.countsValue);
    return {
      name: look?.name ?? RELICS[id].name,
      line: look?.line ?? RELICS[id].description,
      emblemSvg: art ? emblemSvg(art.base, 54) : null,
      crestSvg: emblemSvg(crest(race), 18),
      progress: progress.text,
      milestone: progress.milestone,
    };
  }

  /** The HUD with the new world's relic names (dwarf set only in stage A). */
  decorateHud(hud: HudModel): HudModel {
    if (!hud.relics.some((r) => DWARF_RELIC_LOOKS[r.id])) return hud;
    return {
      ...hud,
      relics: hud.relics.map((r) => {
        const look = DWARF_RELIC_LOOKS[r.id];
        return look
          ? { ...r, name: look.name, short: look.name.slice(0, 2), description: look.line }
          : r;
      }),
    };
  }

  /** Where the party stands on the act 1 map. */
  journey(run: RunState | null): JourneyState {
    const cleared =
      run === null
        ? 0
        : run.status === 'offer' || run.status === 'victory'
          ? run.stageIndex + 1
          : run.stageIndex;
    const reached = run?.mode === 'run' ? Math.min(4, cleared) : 0;
    const c = this.countsValue;
    const companions: RaceId[] = RACE_IDS.filter((r) => c[r] >= 2 && c[r] < 4);
    const rallied: RaceId[] = RACE_IDS.filter((r) => c[r] >= 4);
    return { reached, beaconLit: reached >= 4, companions, rallied };
  }

  private applyScenery(scenery: Scenery, revealMs: number): void {
    if (sceneryKey(scenery) === sceneryKey(this.scenery)) return;
    this.scenery = scenery;
    this.display.setScenery(scenery, revealMs);
  }
}

/** SVG markup of the stage A pictures (debug hook → proof sheets). */
export interface FactionArt {
  readonly relics: readonly {
    readonly id: RelicId;
    readonly name: string;
    readonly evolvedName: string;
    readonly line: string;
    readonly base: string;
    readonly evolved: string;
  }[];
  readonly crests: Readonly<Record<RaceId, string>>;
  readonly companion: string;
}

export function factionArt(size = 160): FactionArt {
  const relics = (['pickaxe', 'debrisFuel', 'bomb', 'ignition'] as const).map((id) => {
    const look = DWARF_RELIC_LOOKS[id];
    const art = RELIC_EMBLEMS[id];
    return {
      id,
      name: look?.name ?? id,
      evolvedName: look?.evolvedName ?? id,
      line: look?.line ?? '',
      base: art ? emblemSvg(art.base, size) : '',
      evolved: art ? emblemSvg(art.evolved, size) : '',
    };
  });
  const crests = Object.fromEntries(RACE_IDS.map((r) => [r, emblemSvg(crest(r), size)])) as Record<
    RaceId,
    string
  >;
  return { relics, crests, companion: emblemSvg(DWARF_FIGURE, size) };
}
