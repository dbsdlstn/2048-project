import { describe, expect, it } from 'vitest';
import { RELIC_IDS, runDirections, runMove, startRun, type RunState } from '../src/core';
import { dailyLabel, dailySeed, localDateKey } from '../src/game/daily';
import { EMPTY_RECORDS } from '../src/game/runView';
import {
  DAILY_HISTORY,
  DEFAULT_SETTINGS,
  MemoryStorage,
  PROFILE_KEY,
  SaveStore,
  isRunState,
  migrate,
  parseJson,
  runKey,
  type KeyValueStorage,
  type Migration,
  type SaveProblem,
} from '../src/save';

/** A run with some history: moves played, relics owned, an undo snapshot. */
function playedRun(moves = 30): RunState {
  let run = startRun('run', 'save-test', { stageIndex: 3, relics: [...RELIC_IDS] }).run;
  for (let i = 0; i < moves && run.status === 'playing'; i++) {
    const dirs = runDirections(run);
    if (dirs.length === 0) break;
    run = runMove(run, dirs[i % dirs.length] ?? 'left').run;
  }
  return run;
}

function storeWith(entries: Record<string, string>) {
  const storage = new MemoryStorage();
  for (const [k, v] of Object.entries(entries)) storage.setItem(k, v);
  const problems: SaveProblem[] = [];
  const store = new SaveStore(storage, { onProblem: (p) => problems.push(p) });
  return { storage, store, problems };
}

describe('SaveStore: round trips', () => {
  it('a saved run comes back deep-equal, RNG and undo included, and plays on identically', () => {
    const storage = new MemoryStorage();
    const run = playedRun();
    expect(run.undo).not.toBeNull();
    new SaveStore(storage).saveRun({ run, daily: null });

    const loaded = new SaveStore(storage).loadRun('run');
    expect(loaded?.run).toEqual(run);
    expect(loaded?.daily).toBeNull();
    const dirs = runDirections(run);
    for (const d of dirs) expect(runMove(loaded?.run as RunState, d)).toEqual(runMove(run, d));
  });

  it('records, seen hints, settings and daily results survive a new store', () => {
    const storage = new MemoryStorage();
    const a = new SaveStore(storage);
    a.setRecords({ ...EMPTY_RECORDS, runBestStages: 5, runBestScore: 1234 });
    a.markHintSeen('hazard:stone');
    a.markHintSeen('hazard:stone');
    a.updateSettings({ sound: false });
    a.noteDailyAttempt('2026-11-13');
    a.recordDaily('2026-11-13', { stages: 3, score: 900, won: false });

    const b = new SaveStore(storage);
    expect(b.records).toMatchObject({ runBestStages: 5, runBestScore: 1234 });
    expect([...b.seenHints]).toEqual(['hazard:stone']);
    expect(b.settings).toEqual({ sound: false, haptics: true });
    expect(b.dailyRecord('2026-11-13')).toEqual({
      date: '2026-11-13',
      attempts: 1,
      bestStages: 3,
      bestScore: 900,
      won: false,
    });
    b.resetHints();
    expect(new SaveStore(storage).seenHints.size).toBe(0);
  });

  it('daily results keep the best per date and only the most recent days', () => {
    const store = new SaveStore(new MemoryStorage());
    store.recordDaily('2026-01-01', { stages: 4, score: 500, won: false });
    const same = store.recordDaily('2026-01-01', { stages: 2, score: 100, won: false });
    expect(same).toMatchObject({ bestStages: 4, bestScore: 500 });
    store.recordDaily('2026-01-01', { stages: 12, score: 300, won: true });
    expect(store.dailyRecord('2026-01-01')).toMatchObject({
      bestStages: 12,
      bestScore: 500,
      won: true,
    });

    for (let d = 1; d <= DAILY_HISTORY + 5; d++) {
      store.noteDailyAttempt(localDateKey(new Date(2026, 1, d)));
    }
    expect(store.dailyHistory).toHaveLength(DAILY_HISTORY);
    expect(store.dailyHistory[0]?.date).toBe('2026-03-07');
    expect(store.dailyRecord('2026-01-01')).toBeNull();
  });

  it('slots are separate, a finished run is not offered, a daily only counts on its day', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    const run = playedRun(5);
    const endless = startRun('endless', 'e').run;
    store.saveRun({ run, daily: null });
    store.saveRun({ run: endless, daily: null });
    store.saveRun({ run, daily: '2026-11-13' });
    expect(store.loadRun('run')?.run).toEqual(run);
    expect(store.loadRun('endless')?.run).toEqual(endless);
    expect(store.loadRun('daily', '2026-11-13')?.daily).toBe('2026-11-13');
    expect(store.loadRun('daily', '2026-11-14')).toBeNull();
    expect(storage.getItem(runKey('daily'))).toBeNull(); // dropped, not kept forever

    store.saveRun({ run: { ...run, status: 'gameOver', failReason: 'moves' }, daily: null });
    expect(store.loadRun('run')).toBeNull();
    store.clearRun('endless');
    expect(store.hasRun('endless')).toBe(false);
  });
});

describe('SaveStore: bad data falls back cleanly', () => {
  it('missing data gives defaults', () => {
    const { store, problems } = storeWith({});
    expect(store.records).toEqual(EMPTY_RECORDS);
    expect(store.settings).toEqual(DEFAULT_SETTINGS);
    expect(store.seenHints.size).toBe(0);
    expect(store.loadRun('run')).toBeNull();
    expect(problems).toEqual([]);
  });

  it('unparsable or foreign values are ignored and later overwritten', () => {
    const { storage, store, problems } = storeWith({
      [PROFILE_KEY]: '{"schema":1,"records":',
      [runKey('run')]: '"hello"',
      [runKey('endless')]: JSON.stringify({ some: 'other app' }),
    });
    expect(store.records).toEqual(EMPTY_RECORDS);
    expect(store.loadRun('run')).toBeNull();
    expect(store.loadRun('endless')).toBeNull();
    expect(problems.map((p) => p.kind)).toEqual(['corrupt', 'corrupt', 'corrupt']);
    store.markHintSeen('x');
    expect(parseJson(storage.getItem(PROFILE_KEY))).toMatchObject({ schema: 1, seenHints: ['x'] });
  });

  it('a damaged field falls back alone; the rest of the profile survives', () => {
    const { store } = storeWith({
      [PROFILE_KEY]: JSON.stringify({
        schema: 1,
        records: { runBestStages: 'lots' },
        seenHints: ['boss:warden', 7, null],
        settings: { sound: false, haptics: 'yes' },
        daily: [
          { date: '2026-11-13', attempts: 2, bestStages: 1, bestScore: 40, won: false },
          { date: 'yesterday' },
        ],
      }),
    });
    expect(store.records).toEqual(EMPTY_RECORDS);
    expect([...store.seenHints]).toEqual(['boss:warden']);
    expect(store.settings).toEqual({ sound: false, haptics: true });
    expect(store.dailyHistory.map((d) => d.date)).toEqual(['2026-11-13']);
  });

  it('a structurally broken run is rejected, never handed to the core', () => {
    const run = playedRun(5);
    const cells = run.board.cells;
    const broken: unknown[] = [
      { ...run, version: 2 },
      { ...run, board: { ...run.board, cells: cells.slice(1) } },
      { ...run, board: { ...run.board, cells: cells.map(() => ({ id: 1 })) } },
      { ...run, relics: [{ id: 'notARelic', charges: 0, counter: 0 }] },
      { ...run, relics: [{ id: 'bomb', charges: 9, counter: 0 }] },
      { ...run, boss: { id: 'warden', period: 5, turnsUntil: 2, lock: { axis: 'diag' } } },
      { ...run, stageIndex: 99 },
      { ...run, rng: { seed: -1, state: 0 } },
      { ...run, undo: { ...run, mode: 'endless' } },
      null,
      [],
    ];
    expect(isRunState(run)).toBe(true);
    for (const value of broken) expect(isRunState(value)).toBe(false);

    const { store, problems } = storeWith({
      [runKey('run')]: JSON.stringify({ schema: 1, daily: null, run: broken[1] }),
    });
    expect(store.loadRun('run')).toBeNull();
    expect(problems).toEqual([{ kind: 'corrupt', key: runKey('run') }]);
  });
});

describe('SaveStore: schema versions', () => {
  const steps: Partial<Record<number, Migration>> = {
    1: (d) => ({ ...d, best: d.score }),
    2: (d) => ({ ...d, best: { score: d.best } }),
  };

  it('migrates one version at a time up to the current one', () => {
    expect(migrate({ schema: 1, score: 7 }, 3, steps)).toEqual({
      kind: 'ok',
      migrated: true,
      data: { schema: 3, score: 7, best: { score: 7 } },
    });
    expect(migrate({ schema: 3, x: 1 }, 3, steps)).toEqual({
      kind: 'ok',
      migrated: false,
      data: { schema: 3, x: 1 },
    });
  });

  it('rejects values without a version, without a path, or that are not objects', () => {
    expect(migrate({ score: 7 }, 3, steps).kind).toBe('invalid');
    expect(migrate({ schema: 0 }, 3, steps).kind).toBe('invalid');
    expect(migrate({ schema: 1 }, 3, { 2: steps[2] }).kind).toBe('invalid');
    expect(migrate('text', 3, steps).kind).toBe('invalid');
    expect(migrate(parseJson('{oops'), 3, steps).kind).toBe('invalid');
  });

  it('data from a newer build is kept untouched (the store runs from memory)', () => {
    const newer = JSON.stringify({ schema: 99, records: { runBestStages: 12 } });
    const { storage, store, problems } = storeWith({ [PROFILE_KEY]: newer });
    expect(problems).toEqual([{ kind: 'newer', key: PROFILE_KEY }]);
    expect(store.records).toEqual(EMPTY_RECORDS);
    store.markHintSeen('a');
    store.setRecords({ ...EMPTY_RECORDS, runBestScore: 5 });
    expect(storage.getItem(PROFILE_KEY)).toBe(newer);
    expect(store.records.runBestScore).toBe(5);
  });
});

describe('SaveStore: storage failures', () => {
  it('a full or disabled storage never throws; the store keeps working from memory', () => {
    let failing = true;
    const inner = new MemoryStorage();
    const storage: KeyValueStorage = {
      getItem: (k) => inner.getItem(k),
      setItem: (k, v) => {
        if (failing) throw new DOMException('quota', 'QuotaExceededError');
        inner.setItem(k, v);
      },
      removeItem: (k) => {
        inner.removeItem(k);
      },
    };
    const problems: SaveProblem[] = [];
    const store = new SaveStore(storage, { onProblem: (p) => problems.push(p) });
    expect(() => {
      store.saveRun({ run: playedRun(3), daily: null });
    }).not.toThrow();
    store.setRecords({ ...EMPTY_RECORDS, runBestScore: 10 });
    expect(store.writable).toBe(false);
    expect(store.records.runBestScore).toBe(10);
    expect(problems.every((p) => p.kind === 'writeFailed')).toBe(true);

    failing = false;
    store.markHintSeen('ok');
    expect(store.writable).toBe(true);
  });

  it('reading that throws (blocked storage) gives defaults', () => {
    const storage: KeyValueStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const store = new SaveStore(storage);
    expect(store.records).toEqual(EMPTY_RECORDS);
    expect(store.loadRun('run')).toBeNull();
  });
});

describe('daily challenge helpers', () => {
  it('local date keys, a stable seed per date and a Korean label', () => {
    expect(localDateKey(new Date(2026, 10, 3, 23, 59))).toBe('2026-11-03');
    expect(dailySeed('2026-11-13')).toBe(dailySeed('2026-11-13'));
    expect(dailySeed('2026-11-13')).not.toBe(dailySeed('2026-11-14'));
    expect(dailyLabel('2026-11-03')).toBe('11월 3일');
  });

  it('the same date gives the same stage boards and first offer', () => {
    const a = startRun('run', dailySeed('2026-11-13')).run;
    const b = startRun('run', dailySeed('2026-11-13')).run;
    expect(b).toEqual(a);
  });
});
