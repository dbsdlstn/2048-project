import { describe, expect, it } from 'vitest';
import {
  BOSS_TUNING,
  DEFAULT_RULES,
  OFFER_SIZE,
  RELICS,
  RELIC_IDS,
  RELIC_TUNING as T,
  STAGES,
  createRelic,
  createRng,
  deriveRules,
  drawOffer,
  moveLimit,
  runDirections,
  runMove,
  startRun,
  cornerIndices,
  spawnInCorner,
  stateFromGrid,
  useActive,
  type GridCell,
  type Keyword,
  type Direction,
  type RelicId,
} from '../src/core';
import { flat, ofType, turnOn } from './helpers';

const E = 0;
const S: GridCell = { kind: 'stone' };
const empty = (): GridCell[] => [E, E, E, E];
const nonEmpty = <T>(phases: readonly { kind: T; events: readonly unknown[] }[]): T[] =>
  phases.filter((p) => p.events.length > 0).map((p) => p.kind);

describe('relic catalogue', () => {
  it('has about 15 relics with unique ids, Korean names and one-line descriptions', () => {
    expect(RELIC_IDS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(RELIC_IDS).size).toBe(RELIC_IDS.length);
    for (const id of RELIC_IDS) {
      const def = RELICS[id];
      expect(def.id).toBe(id);
      expect(def.name).toMatch(/[가-힣]/);
      expect(def.description).toMatch(/[가-힣]/);
      expect(def.description).not.toContain('\n');
      expect(def.description.length).toBeLessThanOrEqual(48);
    }
  });

  it('has 2–3 active relics, each with charges', () => {
    const actives = RELIC_IDS.filter((id) => RELICS[id].active);
    expect(actives.length).toBeGreaterThanOrEqual(2);
    expect(actives.length).toBeLessThanOrEqual(3);
    for (const id of actives) expect(RELICS[id].active?.maxCharges).toBeGreaterThan(0);
  });

  it('no relic refers to another relic by name', () => {
    for (const a of RELIC_IDS) {
      for (const b of RELIC_IDS) {
        if (a !== b) expect(RELICS[a].description).not.toContain(RELICS[b].name);
      }
    }
  });
});

describe('offers ("no dead picks")', () => {
  const ctxWith = (...keywords: Keyword[]) => ({ has: (k: Keyword) => keywords.includes(k) });

  function everOffered(ctx: ReturnType<typeof ctxWith>, owned: RelicId[] = []): Set<RelicId> {
    const seen = new Set<RelicId>();
    let rng = createRng('offers');
    for (let i = 0; i < 400; i++) {
      const drawn = drawOffer(rng, owned.map(createRelic), ctx);
      rng = drawn.rng;
      drawn.offer.forEach((id) => seen.add(id));
      expect(new Set(drawn.offer).size).toBe(drawn.offer.length);
      expect(drawn.offer.length).toBeLessThanOrEqual(OFFER_SIZE);
      for (const id of owned) expect(drawn.offer).not.toContain(id);
    }
    return seen;
  }

  it('relics tied to something absent from the rest of the run are never offered', () => {
    const seen = everOffered(ctxWith());
    for (const id of [
      'resonance',
      'pickaxe',
      'cornerAnchor',
      'spareSpring',
      'reverseFilter',
      'debrisFuel',
      'delayVeil',
      'capacitor',
    ] as const) {
      expect(seen.has(id)).toBe(false);
    }
    expect(seen.has('chain')).toBe(true);
  });

  it('they are offered once their keyword is ahead', () => {
    const seen = everOffered(ctxWith('stone', 'boss', 'moveLimit', 'scoreGoal', 'ice', 'active'));
    expect(seen.size).toBe(RELIC_IDS.length);
  });

  it('never offers owned relics', () => {
    everOffered(ctxWith('stone'), ['chain', 'bomb']);
  });
});

describe('relic effects', () => {
  it('연쇄 회로: a merged tile merges again with an equal neighbour, as a chain phase', () => {
    const plain = turnOn([[4, 4, 8, E], empty(), empty(), empty()], 'left');
    expect(plain.board.cells[0]?.value).toBe(8);
    expect(plain.board.cells[1]?.value).toBe(8);
    const chained = turnOn([[4, 4, 8, E], empty(), empty(), empty()], 'left', {
      relics: ['chain'],
    });
    expect(chained.board.cells[0]?.value).toBe(16);
    expect(nonEmpty(chained.phases).slice(0, 2)).toEqual(['slide', 'chain']);
    // Only merges involving a fresh tile chain: 8 and 4 never meet here.
    const none = turnOn([[2, 2, 8, 8], empty(), empty(), empty()], 'left', { relics: ['chain'] });
    expect(nonEmpty(none.phases)).not.toContain('chain');
  });

  it('공명 증폭기: extra merges in one move add a share of that move’s merge score', () => {
    const out = turnOn([[2, 2, 4, 4], empty(), empty(), empty()], 'left', {
      relics: ['resonance'],
    });
    const bonus = Math.floor(12 * T.comboBonus * 1);
    expect(out.stats.scoreGained).toBe(12 + bonus);
    const end = out.phases.at(-1);
    expect(end?.kind).toBe('end');
    expect(end?.events.map((e) => e.type)).toEqual(['trigger', 'score']);
  });

  it('균열 송곳: big enough merges also break diagonal stones', () => {
    const out = turnOn([[E, E, 4, 4], [E, E, S, 4], empty(), empty()], 'right', {
      relics: ['pickaxe'],
    });
    expect(ofType(flat(out.phases), 'destroy')).toEqual([
      { type: 'destroy', tileId: 3, at: { row: 1, col: 2 }, cause: 'relic' },
    ]);
    // Too small a merge does not reach.
    const small = turnOn([[E, E, 2, 2], [E, E, S, 4], empty(), empty()], 'right', {
      relics: ['pickaxe'],
    });
    expect(small.stats.stonesBroken).toBe(0);
  });

  it('프리즘 코어: every few moves the regular spawn is a prism', () => {
    const ready = { ...createRelic('prismCore'), counter: T.prismEvery - 1 };
    const out = turnOn([[2, E, E, E], empty(), empty(), empty()], 'right', { relics: [ready] });
    expect(ofType(flat(out.phases), 'spawn')[0]?.kind).toBe('prism');
    expect(out.relics[0]?.counter).toBe(0);
    const early = turnOn([[2, E, E, E], empty(), empty(), empty()], 'right', {
      relics: ['prismCore'],
    });
    expect(ofType(flat(early.phases), 'spawn')[0]?.kind).toBe('number');
    expect(early.relics[0]?.counter).toBe(1);
  });

  it('모서리 닻: merges on a corner score double', () => {
    const corner = turnOn([[2, 2, E, E], empty(), empty(), empty()], 'left', {
      relics: ['cornerAnchor'],
    });
    expect(corner.stats.scoreGained).toBe(4 * T.cornerFactor);
    const edge = turnOn([empty(), [2, 2, E, E], empty(), empty()], 'left', {
      relics: ['cornerAnchor'],
    });
    expect(edge.stats.scoreGained).toBe(4);
  });

  it('여분 태엽: every stage allows more moves', () => {
    const base = startRun('run', 1).run;
    const withSpring = startRun('run', 1, { relics: ['spareSpring'] }).run;
    expect(moveLimit(withSpring)).toBe((moveLimit(base) ?? 0) + T.extraMoves);
  });

  it('분해 펄스: removes one chosen tile, once per stage; a stone counts as broken', () => {
    let run = startRun('run', 2, { relics: ['bomb'] }).run;
    run = { ...run, board: stateFromGrid([[S, 2, E, E], empty(), empty(), empty()], 9) };
    expect(run.relics[0]?.charges).toBe(1);
    const used = useActive(run, 'bomb', { row: 0, col: 0 });
    expect(used.changed).toBe(true);
    expect(used.run.board.cells[0]).toBeNull();
    expect(used.run.progress.stonesBroken).toBe(1);
    expect(used.run.relics[0]?.charges).toBe(0);
    expect(useActive(used.run, 'bomb', { row: 0, col: 1 }).changed).toBe(false);
    expect(used.run.progress.movesUsed).toBe(0);
  });

  it('역행 코일: undoes the last action', () => {
    const start = startRun('run', 3, { relics: ['undo'] }).run;
    const moved = runMove(start, runDirections(start)[0] as Direction).run;
    const undone = useActive(moved, 'undo');
    expect(undone.changed).toBe(true);
    expect(undone.boardReplaced).toBe(true);
    expect(undone.run.board).toEqual(start.board);
    expect(undone.run.relics[0]?.charges).toBe(0);
  });

  it('정지 핀: freezes a chosen tile in place', () => {
    let run = startRun('run', 4, { relics: ['freezePin'] }).run;
    run = { ...run, board: stateFromGrid([[E, E, E, 8], [2, E, E, E], empty(), empty()], 9) };
    const used = useActive(run, 'freezePin', { row: 0, col: 3 });
    expect(used.run.board.cells[3]?.status.frozenTurns).toBe(T.pinTurns);
    expect(ofType(used.events, 'statusChange')[0]?.cause).toBe('active');
    const out = turnOn(used.run.board, 'left');
    expect(out.board.cells[3]?.value).toBe(8);
    // Stones cannot be pinned.
    const stoneRun = { ...run, board: stateFromGrid([[S, 2, E, E], empty(), empty(), empty()]) };
    expect(useActive(stoneRun, 'freezePin', { row: 0, col: 0 }).changed).toBe(false);
  });

  it('역상 필터: merges involving a frozen or cursed tile score triple', () => {
    const out = turnOn([[{ value: 8, cursed: true }, 8, E, E], empty(), empty(), empty()], 'left', {
      relics: ['reverseFilter'],
    });
    expect(out.stats.scoreGained).toBe(8 * T.statusFactor);
  });

  it('잔해 연료: each broken stone gives back moves', () => {
    const out = turnOn([[2, 2, S, E], empty(), empty(), empty()], 'left', {
      relics: ['debrisFuel'],
    });
    expect(out.stats.bonusMoves).toBe(T.movesPerStone);
    const resolve = out.phases.find((p) => p.kind === 'resolve');
    expect(resolve?.events.map((e) => e.type)).toEqual(['destroy', 'trigger', 'bonusMoves']);
  });

  it('쌍둥이 씨앗: raises the chance that a spawn is a 4', () => {
    expect(deriveRules([createRelic('twinSeed')]).fourChance).toBeCloseTo(
      DEFAULT_RULES.fourChance + T.fourChanceBonus,
    );
  });

  it('점화 플러그: every stage starts with an extra tile in an empty corner', () => {
    for (let seed = 0; seed < 20; seed++) {
      const run = startRun('run', seed, { relics: ['ignition'] }).run;
      const at = run.board.cells.findIndex((t) => t?.value === T.igniteValue);
      expect(cornerIndices(run.board.size)).toContain(at);
      expect(run.progress.bestTile).toBeGreaterThanOrEqual(T.igniteValue);
    }
  });

  it('spawnInCorner falls back to any free cell when the corners are taken', () => {
    const full = stateFromGrid([
      [2, E, E, 2],
      [E, E, E, E],
      [E, E, E, E],
      [2, E, E, 2],
    ]);
    const placed = spawnInCorner(full, 'number', 16);
    const at = placed.state.cells.findIndex((t) => t?.value === 16);
    expect(at).toBeGreaterThan(0);
    expect(cornerIndices(4)).not.toContain(at);
    const walls = new Set([0, 3, 12]);
    const sealed = spawnInCorner(
      stateFromGrid([empty(), empty(), empty(), empty()]),
      'number',
      16,
      walls,
    );
    expect(sealed.state.cells[15]?.value).toBe(16);
  });

  it('지연 장막: boss rules fire less often', () => {
    const bossStage = STAGES.findIndex((s) => s.boss !== null);
    const run = startRun('run', 6, { stageIndex: bossStage, relics: ['delayVeil'] }).run;
    expect(run.boss?.period).toBe(BOSS_TUNING.warden.period + T.bossDelay);
    expect(run.boss?.turnsUntil).toBe(BOSS_TUNING.warden.period + T.bossDelay);
  });

  it('도약 렌즈: the first merges of a stage double their result', () => {
    const out = turnOn([[2, 2, 4, 4], [8, 8, E, E], empty(), empty()], 'left', {
      relics: ['leapLens'],
    });
    const values = ofType(flat(out.phases), 'merge').map((m) => m.value);
    // Two doubled merges (2+2 → 8, 4+4 → 16), then a normal one (8+8 → 16).
    expect(values).toEqual([8, 16, 16]);
    expect(out.relics[0]?.counter).toBe(T.lensMerges);
    const run = startRun('run', 7, { relics: ['leapLens'] }).run;
    expect(run.relics[0]?.counter).toBe(0);
  });

  it('축전 코일: merges charge active relics', () => {
    const bomb = { ...createRelic('bomb'), charges: 0 };
    const cap = { ...createRelic('capacitor'), counter: T.mergesPerCharge - 1 };
    const out = turnOn([[2, 2, E, E], empty(), empty(), empty()], 'left', {
      relics: [bomb, cap],
    });
    expect(out.relics.find((r) => r.id === 'bomb')?.charges).toBe(1);
    expect(out.relics.find((r) => r.id === 'capacitor')?.counter).toBe(0);
    expect(ofType(out.phases.at(-1)?.events ?? [], 'trigger')[0]?.source).toBe('capacitor');
  });
});
