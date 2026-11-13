import { describe, expect, it } from 'vitest';
import { RELIC_IDS } from '../src/core';
import {
  RACE_OF,
  momentsBetween,
  offerProgress,
  parseMockFaction,
  raceCounts,
  sceneryFor,
} from '../src/game/factionMock';
import { FactionDirector, REVEAL_MS, type FrameDisplay } from '../src/game/factionView';
import type { Scenery } from '../src/render';
import { journeyMapSvg } from '../src/ui/journey';

describe('faction mock (stage A)', () => {
  it('puts every relic in a race, four per race', () => {
    const per: Record<string, number> = {};
    for (const id of RELIC_IDS) per[RACE_OF[id]] = (per[RACE_OF[id]] ?? 0) + 1;
    expect(per).toEqual({ dwarf: 4, elf: 4, human: 4, orc: 4 });
  });

  it('parses ?mockFaction leniently', () => {
    expect(parseMockFaction('dwarf:2')).toEqual({ dwarf: 2 });
    expect(parseMockFaction('Dwarf:9, elf:1')).toEqual({ dwarf: 4, elf: 1 });
    expect(parseMockFaction('goblin:2,dwarf:x')).toBeNull();
    expect(parseMockFaction(null)).toBeNull();
  });

  it('counts owned relics plus the pretend bonus, capped at a full set', () => {
    const c = raceCounts(['pickaxe', 'bomb', 'chain'], { dwarf: 3 });
    expect(c).toEqual({ dwarf: 4, elf: 1, human: 0, orc: 0 });
    expect(sceneryFor(c)).toEqual({ dwarf: 'rallied', elf: 'none', human: 'none', orc: 'none' });
    expect(sceneryFor(raceCounts(['pickaxe', 'bomb'], null)).dwarf).toBe('companion');
  });

  it('reports the milestone crossed (a jump straight to 4 is a rally only)', () => {
    const zero = raceCounts([], null);
    expect(momentsBetween(zero, raceCounts([], { dwarf: 2 }))).toEqual([
      { kind: 'join', race: 'dwarf' },
    ]);
    expect(momentsBetween(raceCounts([], { dwarf: 1 }), raceCounts([], { dwarf: 4 }))).toEqual([
      { kind: 'rally', race: 'dwarf' },
    ]);
    expect(momentsBetween(raceCounts([], { dwarf: 2 }), raceCounts([], { dwarf: 3 }))).toEqual([]);
  });

  it('writes the offer card progress line', () => {
    expect(offerProgress('pickaxe', raceCounts([], { dwarf: 1 })).text).toBe(
      '드워프 1/4 → 2/4 · 동료 합류!',
    );
    expect(offerProgress('bomb', raceCounts([], { dwarf: 3 })).milestone).toBe('rally');
    expect(offerProgress('chain', raceCounts([], null))).toEqual({
      text: '엘프 0/4 → 1/4',
      milestone: null,
    });
  });
});

function fakeDisplay(): FrameDisplay & {
  calls: { scenery: Scenery; reveal: number }[];
  effects: number;
} {
  const d = {
    calls: [] as { scenery: Scenery; reveal: number }[],
    effects: 0,
    setScenery(scenery: Scenery, revealMs = 0) {
      d.calls.push({ scenery, reveal: revealMs });
    },
    addEffect() {
      d.effects++;
    },
    burst() {
      /* particles are not checked here */
    },
    viewTimeNow: () => 0,
    reducedMotion: false,
    fontFamily: 'serif',
  };
  return d;
}

describe('FactionDirector', () => {
  it('sets the frame without a moment on a new run, celebrates crossings within a run', () => {
    const d = fakeDisplay();
    const f = new FactionDirector(d, { dwarf: 1 });
    expect(f.update([], 7)).toEqual([]);
    expect(d.calls).toEqual([]); // still 'none' everywhere: nothing to redraw
    expect(f.update(['pickaxe'], 7)).toEqual([{ kind: 'join', race: 'dwarf' }]);
    expect(d.calls.at(-1)).toEqual({
      scenery: { elf: 'none', dwarf: 'companion', human: 'none', orc: 'none' },
      reveal: REVEAL_MS,
    });
    expect(d.effects).toBe(1);
    // A different run starts quietly even if it already holds a full set.
    expect(f.update(['pickaxe', 'bomb', 'ignition'], 8)).toEqual([]);
    expect(d.calls.at(-1)?.reveal).toBe(0);
    expect(d.calls.at(-1)?.scenery.dwarf).toBe('rallied');
  });

  it('decorates offers and HUD names, and places the party on the journey map', () => {
    const f = new FactionDirector(fakeDisplay(), null);
    f.update(['pickaxe'], 1);
    const deco = f.decorate('bomb');
    expect(deco.name).toBe('벼락 화약통');
    expect(deco.progress).toBe('드워프 1/4 → 2/4 · 동료 합류!');
    expect(deco.emblemSvg).toContain('<svg');
    expect(f.decorate('chain').emblemSvg).toBeNull();
    expect(f.journey(null)).toEqual({ reached: 0, beaconLit: false, companions: [], rallied: [] });
  });
});

describe('journey map', () => {
  const base = { reached: 2, beaconLit: false, companions: [], rallied: [] } as const;
  it('draws the beacon lit only once it is lit, and the dwarf hold only once they rallied', () => {
    expect(journeyMapSvg(base)).not.toContain('jm-beacon-glow');
    expect(journeyMapSvg({ ...base, reached: 4, beaconLit: true })).toContain('jm-beacon-glow');
    expect(journeyMapSvg(base)).not.toContain('jm-hold');
    expect(journeyMapSvg({ ...base, rallied: ['dwarf'] })).toContain('jm-hold');
    expect(journeyMapSvg({ ...base, companions: ['dwarf'] })).toContain('jm-companion');
  });
});
