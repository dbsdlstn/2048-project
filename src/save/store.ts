/**
 * Everything the game keeps between visits, on top of an injected
 * `KeyValueStorage`:
 *
 *   neon-rift/profile      records, seen hints, settings, daily results (small, written on change)
 *   neon-rift/run/<slot>   the run in progress for 'run', 'endless' and 'daily' (written after every step)
 *
 * Separate keys keep a corrupt or oversized value from taking the others with
 * it. Reads validate and fall back field by field; writes never throw (a full
 * or disabled storage just means "this visit is not saved"). The store keeps
 * its own copy in memory, so the game reads from it even when writing fails.
 */
import type { RunMode, RunState } from '../core';
import { EMPTY_RECORDS, type Records } from '../game/runView';
import { migrate, parseJson, type Migration } from './schema';
import type { KeyValueStorage } from './storage';
import { isInt, isObject, isRunState, type Json } from './validate';

export const STORAGE_PREFIX = 'neon-rift/';
export const PROFILE_KEY = `${STORAGE_PREFIX}profile`;

/** Run slots: one saved run each. A daily run is a run-mode run with a fixed seed. */
export type RunSlot = RunMode | 'daily';
export const RUN_SLOTS: readonly RunSlot[] = ['run', 'endless', 'daily'];

export function runKey(slot: RunSlot): string {
  return `${STORAGE_PREFIX}run/${slot}`;
}

/** Current schema versions. Bump and add a migration when a stored shape changes. */
export const PROFILE_SCHEMA = 1;
export const RUN_SCHEMA = 1;
export const PROFILE_MIGRATIONS: Readonly<Partial<Record<number, Migration>>> = {};
export const RUN_MIGRATIONS: Readonly<Partial<Record<number, Migration>>> = {};

/** Player options. Sound and haptics are read by stage 5's audio / vibration. */
export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true };

/** Best result of one day's challenge. */
export interface DailyRecord {
  /** Local date, `YYYY-MM-DD`. */
  readonly date: string;
  readonly attempts: number;
  readonly bestStages: number;
  readonly bestScore: number;
  readonly won: boolean;
}

/** Days of daily results kept (older ones are dropped). */
export const DAILY_HISTORY = 30;

/** A run in progress as stored: the plain run state plus which daily it belongs to. */
export interface SavedRun {
  readonly run: RunState;
  /** The daily challenge's date, or null for a normal run / endless game. */
  readonly daily: string | null;
}

export function slotOf(saved: SavedRun): RunSlot {
  return saved.daily !== null ? 'daily' : saved.run.mode;
}

interface Profile {
  records: Records;
  seenHints: string[];
  settings: Settings;
  daily: DailyRecord[];
}

const MAX_HINTS = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function readRecords(value: unknown): Records {
  if (!isObject(value)) return EMPTY_RECORDS;
  const { runBestStages, runBestScore, endlessBestScore, endlessBestTile } = value;
  if (!isInt(runBestStages) || !isInt(runBestScore)) return EMPTY_RECORDS;
  if (!isInt(endlessBestScore) || !isInt(endlessBestTile)) return EMPTY_RECORDS;
  return { runBestStages, runBestScore, endlessBestScore, endlessBestTile };
}

function readHints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[])
    .filter((k): k is string => typeof k === 'string' && k.length <= 64)
    .slice(0, MAX_HINTS);
}

function readSettings(value: unknown): Settings {
  if (!isObject(value)) return DEFAULT_SETTINGS;
  const pick = (key: keyof Settings): boolean => {
    const v = value[key];
    return typeof v === 'boolean' ? v : DEFAULT_SETTINGS[key];
  };
  return { sound: pick('sound'), haptics: pick('haptics') };
}

function isDailyRecord(value: unknown): value is DailyRecord {
  return (
    isObject(value) &&
    typeof value.date === 'string' &&
    DATE_RE.test(value.date) &&
    isInt(value.attempts) &&
    isInt(value.bestStages) &&
    isInt(value.bestScore) &&
    typeof value.won === 'boolean'
  );
}

function readDaily(value: unknown): DailyRecord[] {
  if (!Array.isArray(value)) return [];
  return trimDaily((value as unknown[]).filter(isDailyRecord));
}

/** Newest first, one entry per date, at most `DAILY_HISTORY`. */
function trimDaily(list: readonly DailyRecord[]): DailyRecord[] {
  const byDate = new Map<string, DailyRecord>();
  for (const r of list) if (!byDate.has(r.date)) byDate.set(r.date, r);
  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, DAILY_HISTORY);
}

function emptyProfile(): Profile {
  return { records: EMPTY_RECORDS, seenHints: [], settings: DEFAULT_SETTINGS, daily: [] };
}

export interface SaveStoreOptions {
  /** Called when a read found bad data or a write failed (logging, tests). */
  readonly onProblem?: (problem: SaveProblem) => void;
}

export type SaveProblem =
  | { readonly kind: 'corrupt'; readonly key: string }
  | { readonly kind: 'newer'; readonly key: string }
  | { readonly kind: 'writeFailed'; readonly key: string; readonly error: unknown };

export class SaveStore {
  private profile: Profile;
  /** Keys holding data from a newer build: read-only for this session. */
  private readonly locked = new Set<string>();
  private lastWriteOk = true;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly options: SaveStoreOptions = {},
  ) {
    this.profile = this.readProfile();
  }

  // ---------------------------------------------------------------- profile

  get records(): Records {
    return this.profile.records;
  }

  setRecords(records: Records): void {
    this.profile.records = records;
    this.writeProfile();
  }

  get seenHints(): ReadonlySet<string> {
    return new Set(this.profile.seenHints);
  }

  markHintSeen(key: string): void {
    if (this.profile.seenHints.includes(key)) return;
    this.profile.seenHints = [...this.profile.seenHints, key].slice(-MAX_HINTS);
    this.writeProfile();
  }

  /** "도움말 다시 보기": every hint shows again. */
  resetHints(): void {
    this.profile.seenHints = [];
    this.writeProfile();
  }

  get settings(): Settings {
    return this.profile.settings;
  }

  updateSettings(patch: Partial<Settings>): Settings {
    this.profile.settings = { ...this.profile.settings, ...patch };
    this.writeProfile();
    return this.profile.settings;
  }

  dailyRecord(date: string): DailyRecord | null {
    return this.profile.daily.find((r) => r.date === date) ?? null;
  }

  get dailyHistory(): readonly DailyRecord[] {
    return this.profile.daily;
  }

  /** Counts a new attempt at `date`'s challenge. */
  noteDailyAttempt(date: string): DailyRecord {
    const before = this.dailyRecord(date);
    const next: DailyRecord = before
      ? { ...before, attempts: before.attempts + 1 }
      : { date, attempts: 1, bestStages: 0, bestScore: 0, won: false };
    return this.putDaily(next);
  }

  /** Keeps the best of `date`'s results. Returns the record (the same object if nothing improved). */
  recordDaily(date: string, result: { stages: number; score: number; won: boolean }): DailyRecord {
    const before = this.dailyRecord(date);
    const base = before ?? { date, attempts: 1, bestStages: 0, bestScore: 0, won: false };
    const next: DailyRecord = {
      ...base,
      bestStages: Math.max(base.bestStages, result.stages),
      bestScore: Math.max(base.bestScore, result.score),
      won: base.won || result.won,
    };
    const same =
      before !== null &&
      next.bestStages === before.bestStages &&
      next.bestScore === before.bestScore &&
      next.won === before.won;
    return same ? before : this.putDaily(next);
  }

  // ---------------------------------------------------------------- runs

  /**
   * The saved run of `slot`, if there is a valid one still in progress. A
   * daily run only counts on its own date (`today`); older ones are dropped.
   */
  loadRun(slot: RunSlot, today?: string): SavedRun | null {
    const key = runKey(slot);
    const result = this.read(key, RUN_SCHEMA, RUN_MIGRATIONS);
    if (!result) return null;
    const { run, daily } = result;
    const ok =
      isRunState(run) &&
      (run.status === 'playing' || run.status === 'offer') &&
      (daily === null || (typeof daily === 'string' && DATE_RE.test(daily))) &&
      (slot === 'daily' ? daily !== null && run.mode === 'run' : daily === null) &&
      (slot === 'endless' ? run.mode === 'endless' : run.mode === 'run');
    if (!ok) {
      this.problem({ kind: 'corrupt', key });
      return null;
    }
    if (slot === 'daily' && today !== undefined && daily !== today) {
      this.remove(key);
      return null;
    }
    return { run, daily };
  }

  saveRun(saved: SavedRun): void {
    this.write(runKey(slotOf(saved)), { schema: RUN_SCHEMA, daily: saved.daily, run: saved.run });
  }

  clearRun(slot: RunSlot): void {
    this.remove(runKey(slot));
  }

  hasRun(slot: RunSlot, today?: string): boolean {
    return this.loadRun(slot, today) !== null;
  }

  /** False after a write failed (quota, private mode); true again once one succeeds. */
  get writable(): boolean {
    return this.lastWriteOk;
  }

  // ---------------------------------------------------------------- internals

  private putDaily(record: DailyRecord): DailyRecord {
    this.profile.daily = trimDaily([
      record,
      ...this.profile.daily.filter((r) => r.date !== record.date),
    ]);
    this.writeProfile();
    return record;
  }

  private readProfile(): Profile {
    const data = this.read(PROFILE_KEY, PROFILE_SCHEMA, PROFILE_MIGRATIONS);
    if (!data) return emptyProfile();
    return {
      records: readRecords(data.records),
      seenHints: readHints(data.seenHints),
      settings: readSettings(data.settings),
      daily: readDaily(data.daily),
    };
  }

  private writeProfile(): void {
    const { records, seenHints, settings, daily } = this.profile;
    this.write(PROFILE_KEY, { schema: PROFILE_SCHEMA, records, seenHints, settings, daily });
  }

  /** Reads, parses and migrates one key; null when absent or unusable. */
  private read(
    key: string,
    schema: number,
    migrations: Readonly<Partial<Record<number, Migration>>>,
  ): Json | null {
    let text: string | null;
    try {
      text = this.storage.getItem(key);
    } catch {
      return null;
    }
    if (text === null) return null;
    const result = migrate(parseJson(text), schema, migrations);
    if (result.kind === 'newer') {
      this.locked.add(key);
      this.problem({ kind: 'newer', key });
      return null;
    }
    if (result.kind === 'invalid') {
      this.problem({ kind: 'corrupt', key });
      return null;
    }
    return result.data;
  }

  private write(key: string, value: Json): void {
    if (this.locked.has(key)) return;
    try {
      this.storage.setItem(key, JSON.stringify(value));
      this.lastWriteOk = true;
    } catch (error) {
      this.lastWriteOk = false;
      this.problem({ kind: 'writeFailed', key, error });
    }
  }

  private remove(key: string): void {
    if (this.locked.has(key)) return;
    try {
      this.storage.removeItem(key);
    } catch (error) {
      this.problem({ kind: 'writeFailed', key, error });
    }
  }

  private problem(problem: SaveProblem): void {
    this.options.onProblem?.(problem);
  }
}
