/**
 * The glue between the run core and the screen. It owns the authoritative
 * `RunState` plus a small UI state machine (which screen is up, whether the
 * player is picking a target), turns player intents into core calls, tells
 * its two displays what to show, and saves after every step. Displays and
 * storage are injected, so the whole flow is unit-tested with fakes and an
 * in-memory store (tests/runController.test.ts).
 *
 *            ┌── help / settings ──┐ (back)
 *   menu ────┴─ new / continue ───▶ playing ◀──────────────┐
 *     ▲  └─ confirm (discard save?)  │ │ │                  │
 *     │                     pause ◀──┘ │ └──▶ targeting ────┤ (tap a cell / cancel)
 *     │                                ▼                    │
 *     │                  offer (stage cleared / milestone) ─┘ chooseRelic
 *     │                                ▼
 *     └──── menu ──── result (victory / failed / over) ──retry──▶ playing
 */
import {
  RELICS,
  canUseActive,
  chooseRelic,
  randomSeed,
  restoreStep,
  runMove,
  startRun,
  totalScore,
  useActive,
  type Direction,
  type Position,
  type RelicId,
  type RunMode,
  type RunState,
  type RunStep,
  type StartOptions,
} from '../core';
import { MemoryStorage } from '../save/storage';
import { SaveStore, RUN_SLOTS, type RunSlot, type Settings } from '../save/store';
import { dailySeed, localDateKey } from './daily';
import {
  LESSONS,
  boardMarks,
  confirmNewScreen,
  dailyInfo,
  helpSections,
  hudModel,
  offerScreen,
  resultScreen,
  savedRunLabel,
  stageBanner,
  stageStartHints,
  stagesCleared,
  stepHints,
  targetingPrompt,
  updateRecords,
  type BoardMarks,
  type ContinueInfo,
  type Hint,
  type HudModel,
  type Records,
  type ScreenKind,
  type ScreenModel,
  type SheetOrigin,
  type StageBanner,
} from './runView';

/** What the controller needs from the board renderer. */
export interface BoardDisplay {
  /** Plays a step; when `step.boardReplaced` the view clears first. */
  showStep(step: RunStep): void;
  /**
   * Overlays that follow the state (sealed line, boss target, targeting).
   * They appear when the step in flight has finished animating; `onShown`
   * runs at that same moment, so the HUD changes together with the board.
   */
  setMarks(marks: BoardMarks, onShown?: () => void): void;
  /** Empties the board (back to the menu). */
  clear(): void;
}

/** What the controller needs from the DOM UI. */
export interface UiDisplay {
  showScreen(screen: ScreenModel): void;
  updateHud(hud: HudModel): void;
  /** Score added by the last action, for a "+N" pop. */
  scoreGained(amount: number): void;
  /** One dismissible hint at a time (outside the board); null hides it. */
  showHint(hint: Hint | null): void;
  /** Stage title, goal and move limit when a stage begins; null takes it down. */
  announceStage(banner: StageBanner | null): void;
}

export interface RunControllerOptions {
  readonly board: BoardDisplay;
  readonly ui: UiDisplay;
  /** Seed source for new runs. Defaults to a random seed. */
  readonly seed?: () => number | string;
  /** Records, seen hints, settings, saved runs, daily results. Defaults to an in-memory store. */
  readonly store?: SaveStore;
  /** Today's local date as `YYYY-MM-DD` (the daily challenge). Defaults to the device clock. */
  readonly today?: () => string;
}

/** Which saved game the current run belongs to. */
interface Session {
  readonly slot: RunSlot;
  /** The daily challenge's date, or null. */
  readonly daily: string | null;
  readonly start: { mode: RunMode; options: StartOptions };
}

export class RunController {
  private state: RunState | null = null;
  private screenModel: ScreenModel;
  private targeting: RelicId | null = null;
  private session: Session | null = null;
  private recordsAtStart: Records;
  private dailyBestAtStart = 0;
  private readonly store: SaveStore;
  private readonly today: () => string;
  private readonly seen: Set<string>;
  private readonly hintQueue: Hint[] = [];
  private currentHint: Hint | null = null;
  private bannerUp = false;
  /** "도움말 다시 보기" was pressed since the settings sheet opened. */
  private hintsReset = false;

  constructor(private readonly options: RunControllerOptions) {
    this.store = options.store ?? new SaveStore(new MemoryStorage());
    this.today = options.today ?? (() => localDateKey(new Date()));
    this.recordsAtStart = this.store.records;
    this.seen = new Set(this.store.seenHints);
    this.screenModel = this.menuModel();
  }

  // ---------------------------------------------------------------- queries

  get run(): RunState | null {
    return this.state;
  }

  get screen(): ScreenKind {
    return this.screenModel.kind;
  }

  get screenState(): ScreenModel {
    return this.screenModel;
  }

  get bestRecords(): Records {
    return this.store.records;
  }

  get hint(): Hint | null {
    return this.currentHint;
  }

  get targetingRelic(): RelicId | null {
    return this.targeting;
  }

  /** The saved-game slot of the current run (null on the menu). */
  get slot(): RunSlot | null {
    return this.session?.slot ?? null;
  }

  get settings(): Settings {
    return this.store.settings;
  }

  // ---------------------------------------------------------------- navigation

  /** Back to the menu. A run in progress stays saved and can be continued. */
  showMenu(): void {
    this.state = null;
    this.session = null;
    this.targeting = null;
    this.clearHints();
    this.hideBanner();
    this.options.board.clear();
    this.setScreen(this.menuModel());
  }

  /**
   * The menu's "new game" for a slot: asks first when that would discard a
   * saved game, else starts right away.
   */
  requestNew(slot: RunSlot): void {
    if (this.store.hasRun(slot, this.today())) {
      this.setScreen(confirmNewScreen(slot));
      return;
    }
    this.startSlot(slot);
  }

  /** "새로 시작" on the confirmation sheet. */
  confirmNew(): boolean {
    if (this.screenModel.kind !== 'confirm') return false;
    this.startSlot(this.screenModel.slot);
    return true;
  }

  /** Continues the saved game of `slot`. Returns false if there is none (or it was unreadable). */
  continueRun(slot: RunSlot): boolean {
    const saved = this.store.loadRun(slot, this.today());
    if (!saved) {
      if (this.screen === 'menu') this.setScreen(this.menuModel());
      return false;
    }
    this.begin(
      { slot, daily: saved.daily, start: { mode: saved.run.mode, options: {} } },
      restoreStep(saved.run),
    );
    return true;
  }

  /** Starts a run or an endless game (a new normal game in that mode's slot). */
  start(mode: RunMode, seed?: number | string, options: StartOptions = {}): void {
    const step = startRun(mode, seed ?? (this.options.seed ?? randomSeed)(), options);
    this.begin({ slot: mode, daily: null, start: { mode, options } }, step);
  }

  /** Starts today's challenge (same seed for everyone today). */
  startDaily(): void {
    const date = this.today();
    this.store.noteDailyAttempt(date);
    this.begin(
      { slot: 'daily', daily: date, start: { mode: 'run', options: {} } },
      startRun('run', dailySeed(date)),
    );
  }

  /** Continues a run from plain data (debug hook; tests set up exact boards with it). */
  load(run: RunState): void {
    this.begin(
      { slot: run.mode, daily: null, start: { mode: run.mode, options: {} } },
      restoreStep(run),
    );
  }

  /** Starts a new game in the same slot (new seed, same options; a daily replays the day). */
  retry(): void {
    const session = this.session;
    if (!session) return;
    if (session.slot === 'daily') this.startDaily();
    else this.start(session.start.mode, undefined, session.start.options);
  }

  pause(): boolean {
    if (this.screen !== 'playing' && this.screen !== 'targeting') return false;
    this.hideBanner();
    this.targeting = null;
    this.refresh();
    this.setScreen({ kind: 'paused' });
    return true;
  }

  resume(): boolean {
    if (this.screen !== 'paused') return false;
    this.setScreen({ kind: 'playing' });
    return true;
  }

  openHelp(): boolean {
    const back = this.sheetOrigin();
    if (!back) return false;
    this.setScreen({ kind: 'help', sections: helpSections(), back });
    return true;
  }

  openSettings(): boolean {
    const back = this.sheetOrigin();
    if (!back) return false;
    this.hintsReset = false;
    this.setScreen(this.settingsModel(back));
    return true;
  }

  /** Leaves help / settings / confirm for the screen it was opened from. */
  closeSheet(): boolean {
    const s = this.screenModel;
    if (s.kind === 'confirm') {
      this.setScreen(this.menuModel());
      return true;
    }
    if (s.kind !== 'help' && s.kind !== 'settings') return false;
    this.setScreen(s.back === 'paused' ? { kind: 'paused' } : this.menuModel());
    return true;
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.store.updateSettings({ [key]: value });
    if (this.screenModel.kind === 'settings') {
      this.setScreen(this.settingsModel(this.screenModel.back));
    }
  }

  /** "도움말 다시 보기": every hint and lesson shows again. */
  resetHints(): void {
    this.store.resetHints();
    this.seen.clear();
    this.hintsReset = true;
    if (this.screenModel.kind === 'settings') {
      this.setScreen(this.settingsModel(this.screenModel.back));
    }
  }

  /** Escape / back: leaves targeting or a sheet, else toggles pause. */
  back(): void {
    if (this.screen === 'targeting') this.cancelTargeting();
    else if (this.screen === 'paused') this.resume();
    else if (!this.closeSheet()) this.pause();
  }

  // ---------------------------------------------------------------- play

  /** Plays one move. Returns whether the board changed. */
  handleDirection(direction: Direction): boolean {
    if (!this.state || this.screen !== 'playing') return false;
    this.hideBanner();
    const step = runMove(this.state, direction);
    if (!step.changed) return false;
    this.apply(step, true);
    return true;
  }

  /** Takes an offered relic (or none) and continues. */
  chooseRelic(id: RelicId | null): boolean {
    if (!this.state || this.screen !== 'offer') return false;
    const step = chooseRelic(this.state, id);
    if (!step.changed) return false;
    this.apply(step, false);
    return true;
  }

  /**
   * The player pressed an active relic's button. Relics without a target fire
   * at once (undo); tile-targeted ones enter targeting mode. Pressing the same
   * button again while targeting cancels.
   */
  activateRelic(id: RelicId): boolean {
    if (!this.state) return false;
    this.hideBanner();
    if (this.screen === 'targeting') {
      const same = this.targeting === id;
      this.cancelTargeting();
      if (same) return true;
    }
    if (this.screen !== 'playing') return false;
    const active = RELICS[id].active;
    if (!active || !this.state.relics.some((r) => r.id === id)) return false;
    if (active.target === 'none') return this.useActiveAt(id);
    if ((this.state.relics.find((r) => r.id === id)?.charges ?? 0) <= 0) return false;
    this.targeting = id;
    this.options.board.setMarks(boardMarks(this.state, id));
    this.setScreen({ kind: 'targeting', relic: id, prompt: targetingPrompt(id), error: null });
    return true;
  }

  cancelTargeting(): boolean {
    if (this.screen !== 'targeting' || !this.state) return false;
    this.targeting = null;
    this.options.board.setMarks(boardMarks(this.state, null));
    this.setScreen({ kind: 'playing' });
    return true;
  }

  /** A tap on a board cell. Only meaningful while targeting. */
  handleCellTap(pos: Position): boolean {
    if (this.screen !== 'targeting' || !this.state || !this.targeting) return false;
    const relic = this.targeting;
    if (!canUseActive(this.state, relic, pos)) {
      const occupied = this.state.board.cells[pos.row * this.state.board.size + pos.col];
      const error = !occupied ? '빈 칸이에요. 타일을 고르세요' : '돌은 얼릴 수 없어요';
      this.setScreen({ kind: 'targeting', relic, prompt: targetingPrompt(relic), error });
      return false;
    }
    this.targeting = null;
    return this.useActiveAt(relic, pos);
  }

  /** Uses an active relic directly (debug hook, and the path every use ends in). */
  useActiveAt(id: RelicId, target?: Position): boolean {
    if (!this.state || (this.screen !== 'playing' && this.screen !== 'targeting')) return false;
    this.hideBanner();
    const step = useActive(this.state, id, target);
    if (!step.changed) return false;
    this.targeting = null;
    this.apply(step, true);
    return true;
  }

  /** Hides the current hint (its button, or a tap anywhere); the next queued one shows. */
  dismissHint(): void {
    if (!this.currentHint) return;
    this.currentHint = null;
    this.nextHint();
  }

  // ---------------------------------------------------------------- internals

  private startSlot(slot: RunSlot): void {
    if (slot === 'daily') this.startDaily();
    else this.start(slot);
  }

  /** Common start of every game: fresh session, then the first step. */
  private begin(session: Session, step: RunStep): void {
    this.session = session;
    this.recordsAtStart = this.store.records;
    this.dailyBestAtStart = session.daily
      ? (this.store.dailyRecord(session.daily)?.bestScore ?? 0)
      : 0;
    this.targeting = null;
    this.state = null;
    this.clearHints();
    this.apply(step, false);
  }

  /**
   * Shows a step and saves. `action` is true for the player's own moves and
   * relic uses: they also dismiss the hint that was up before the step.
   */
  private apply(step: RunStep, action: boolean): void {
    const previous = this.state;
    const run = step.run;
    this.state = run;
    const { board, ui } = this.options;

    let gained = 0;
    for (const e of step.events) if (e.type === 'score') gained += e.gained;
    const hud = hudModel(run);
    board.showStep(step);
    // HUD, score pop and board marks change together, when the step has played.
    board.setMarks(boardMarks(run, this.targeting), () => {
      ui.updateHud(hud);
      if (gained > 0) ui.scoreGained(gained);
    });

    if (action) this.dismissHint();
    const newStage =
      previous === null ||
      (step.boardReplaced &&
        (previous.stageIndex !== run.stageIndex || previous.status !== 'playing'));
    if (newStage) {
      this.clearHints();
      ui.announceStage(stageBanner(run));
      this.bannerUp = true;
      for (const hint of stageStartHints(run)) this.queueHint(hint);
    }
    for (const hint of stepHints(run, step.events)) this.queueHint(hint);

    this.persist(run);
    this.setScreen(this.screenFor(run));
  }

  /** Saves the run after every step; a finished one is removed from its slot. */
  private persist(run: RunState): void {
    const session = this.session;
    if (!session) return;
    const records = updateRecords(this.store.records, run);
    if (session.daily === null && records !== this.store.records) this.store.setRecords(records);
    if (session.daily !== null && run.mode === 'run') {
      this.store.recordDaily(session.daily, {
        stages: stagesCleared(run),
        score: totalScore(run),
        won: run.status === 'victory',
      });
    }
    if (run.status === 'playing' || run.status === 'offer') {
      this.store.saveRun({ run, daily: session.daily });
    } else {
      this.store.clearRun(session.slot);
    }
  }

  private screenFor(run: RunState): ScreenModel {
    switch (run.status) {
      case 'playing':
        return this.targeting
          ? {
              kind: 'targeting',
              relic: this.targeting,
              prompt: targetingPrompt(this.targeting),
              error: null,
            }
          : { kind: 'playing' };
      case 'offer':
        return offerScreen(run, this.takeLesson(LESSONS.offer));
      case 'victory':
      case 'gameOver':
        return resultScreen(run, this.recordText(run));
    }
  }

  /** The once-only line of a lesson shown inside a sheet (marked seen now), or null. */
  private takeLesson(hint: Hint): string | null {
    if (this.seen.has(hint.key)) return null;
    this.markSeen(hint.key);
    return hint.text;
  }

  /** Beat a record that existed before this run (a first run is not celebrated as a "record"). */
  private recordText(run: RunState): string | null {
    const daily = this.session?.daily ?? null;
    if (daily !== null) {
      const now = this.store.dailyRecord(daily)?.bestScore ?? 0;
      return this.dailyBestAtStart > 0 && now > this.dailyBestAtStart ? '오늘의 최고 기록!' : null;
    }
    const before = this.recordsAtStart;
    const after = this.store.records;
    const beat =
      run.mode === 'run'
        ? before.runBestScore > 0 &&
          (after.runBestScore > before.runBestScore || after.runBestStages > before.runBestStages)
        : before.endlessBestScore > 0 && after.endlessBestScore > before.endlessBestScore;
    return beat ? '새 최고 기록!' : null;
  }

  private menuModel(): ScreenModel {
    const today = this.today();
    const continues: ContinueInfo[] = [];
    for (const slot of RUN_SLOTS) {
      const saved = this.store.loadRun(slot, today);
      if (saved) continues.push({ slot, label: savedRunLabel(saved) });
    }
    return {
      kind: 'menu',
      records: this.store.records,
      continues,
      daily: dailyInfo(today, this.store.dailyRecord(today)),
    };
  }

  private settingsModel(back: SheetOrigin): ScreenModel {
    return {
      kind: 'settings',
      settings: this.store.settings,
      back,
      hintsReset: this.hintsReset,
      storageOk: this.store.writable,
    };
  }

  private sheetOrigin(): SheetOrigin | null {
    if (this.screen === 'menu') return 'menu';
    if (this.screen === 'paused') return 'paused';
    return null;
  }

  /** Re-sends HUD and marks (after leaving targeting, for instance). */
  private refresh(): void {
    const run = this.state;
    if (!run) return;
    this.options.board.setMarks(boardMarks(run, this.targeting), () => {
      this.options.ui.updateHud(hudModel(run));
    });
  }

  private setScreen(screen: ScreenModel): void {
    this.screenModel = screen;
    this.options.ui.showScreen(screen);
  }

  private hideBanner(): void {
    if (!this.bannerUp) return;
    this.bannerUp = false;
    this.options.ui.announceStage(null);
  }

  private markSeen(key: string): void {
    this.seen.add(key);
    this.store.markHintSeen(key);
  }

  private queueHint(hint: Hint): void {
    if (this.seen.has(hint.key)) return;
    if (this.currentHint?.key === hint.key || this.hintQueue.some((h) => h.key === hint.key)) {
      return;
    }
    this.hintQueue.push(hint);
    if (!this.currentHint) this.nextHint();
  }

  /** Shows the next queued hint; a hint counts as seen once it is on screen. */
  private nextHint(): void {
    this.currentHint = this.hintQueue.shift() ?? null;
    if (this.currentHint) this.markSeen(this.currentHint.key);
    this.options.ui.showHint(this.currentHint);
  }

  private clearHints(): void {
    this.hintQueue.length = 0;
    if (this.currentHint) {
      this.currentHint = null;
      this.options.ui.showHint(null);
    }
  }
}
