/**
 * The glue between the run core and the screen. It owns the authoritative
 * `RunState` plus a small UI state machine (which screen is up, whether the
 * player is picking a target), turns player intents into core calls, and
 * tells its two displays what to show. Displays are interfaces, so the whole
 * flow is unit-tested with fakes (tests/runController.test.ts).
 *
 *   menu ──start──▶ playing ◀──────────────┐
 *                    │ │ │                  │
 *          pause ◀───┘ │ └──▶ targeting ────┤ (tap a cell / cancel)
 *                      ▼                    │
 *        offer (stage cleared / milestone) ─┘ chooseRelic
 *                      ▼
 *        result (victory / failed / over) ──retry──▶ playing, ──menu──▶ menu
 */
import {
  RELICS,
  canUseActive,
  chooseRelic,
  randomSeed,
  restoreStep,
  runMove,
  startRun,
  useActive,
  type Direction,
  type Position,
  type RelicId,
  type RunMode,
  type RunState,
  type RunStep,
  type StartOptions,
} from '../core';
import {
  EMPTY_RECORDS,
  boardMarks,
  hazardHint,
  hazardsInEvents,
  hudModel,
  offerScreen,
  resultScreen,
  stageBanner,
  stageStartHints,
  targetingPrompt,
  updateRecords,
  type BoardMarks,
  type Hint,
  type HudModel,
  type Records,
  type ScreenKind,
  type ScreenModel,
  type StageBanner,
} from './runView';

/** What the controller needs from the board renderer. */
export interface BoardDisplay {
  /** Plays a step; when `step.boardReplaced` the view clears first. */
  showStep(step: RunStep): void;
  /** Overlays that follow the state (sealed line, boss target, targeting). */
  setMarks(marks: BoardMarks): void;
  /** Empties the board (back to the menu). */
  clear(): void;
}

/** What the controller needs from the DOM UI. */
export interface UiDisplay {
  showScreen(screen: ScreenModel): void;
  updateHud(hud: HudModel): void;
  /** Score added by the last action, for a "+N" pop. */
  scoreGained(amount: number): void;
  /** One dismissible hint at a time; null hides it. */
  showHint(hint: Hint | null): void;
  /** Short "1막 2 · goal" banner when a stage begins. */
  announceStage(banner: StageBanner): void;
}

export interface RunControllerOptions {
  readonly board: BoardDisplay;
  readonly ui: UiDisplay;
  /** Seed source for new runs. Defaults to a random seed. */
  readonly seed?: () => number | string;
  readonly initialRecords?: Records;
  /** Called whenever a record improves (stage 4 persists them here). */
  readonly onRecordsChange?: (records: Records) => void;
  /** Hint keys already seen (stage 4 persists them). */
  readonly seenHints?: Iterable<string>;
  readonly onHintSeen?: (key: string) => void;
}

/** Moves after which an unanswered hint hides itself (the player clearly carries on). */
const HINT_MOVES = 3;

export class RunController {
  private state: RunState | null = null;
  private screenModel: ScreenModel = { kind: 'menu', records: EMPTY_RECORDS };
  private targeting: RelicId | null = null;
  private records: Records;
  private recordsAtStart: Records;
  private lastStart: { mode: RunMode; options: StartOptions } = { mode: 'run', options: {} };
  private readonly seen: Set<string>;
  private readonly hintQueue: Hint[] = [];
  private currentHint: Hint | null = null;
  private hintAge = 0;

  constructor(private readonly options: RunControllerOptions) {
    this.records = options.initialRecords ?? EMPTY_RECORDS;
    this.recordsAtStart = this.records;
    this.seen = new Set(options.seenHints ?? []);
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
    return this.records;
  }

  get hint(): Hint | null {
    return this.currentHint;
  }

  get targetingRelic(): RelicId | null {
    return this.targeting;
  }

  // ---------------------------------------------------------------- navigation

  showMenu(): void {
    this.state = null;
    this.targeting = null;
    this.clearHints();
    this.options.board.clear();
    this.setScreen({ kind: 'menu', records: this.records });
  }

  /** Starts a run or an endless game. */
  start(mode: RunMode, seed?: number | string, options: StartOptions = {}): void {
    this.lastStart = { mode, options };
    this.recordsAtStart = this.records;
    this.targeting = null;
    this.state = null;
    this.clearHints();
    const step = startRun(mode, seed ?? (this.options.seed ?? randomSeed)(), options);
    this.apply(step);
  }

  /** Continues a run from plain data (a saved run in stage 4; tests set up exact boards with it). */
  load(run: RunState): void {
    this.lastStart = { mode: run.mode, options: {} };
    this.recordsAtStart = this.records;
    this.targeting = null;
    this.state = null;
    this.clearHints();
    this.apply(restoreStep(run));
  }

  /** Starts a new run in the same mode (new seed, same start options). */
  retry(): void {
    this.start(this.lastStart.mode, undefined, this.lastStart.options);
  }

  pause(): boolean {
    if (this.screen !== 'playing' && this.screen !== 'targeting') return false;
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

  /** Escape / back: leaves targeting, else toggles pause. */
  back(): void {
    if (this.screen === 'targeting') this.cancelTargeting();
    else if (this.screen === 'paused') this.resume();
    else this.pause();
  }

  // ---------------------------------------------------------------- play

  /** Plays one move. Returns whether the board changed. */
  handleDirection(direction: Direction): boolean {
    if (!this.state || this.screen !== 'playing') return false;
    const step = runMove(this.state, direction);
    if (!step.changed) return false;
    this.apply(step);
    return true;
  }

  /** Takes an offered relic (or none) and continues. */
  chooseRelic(id: RelicId | null): boolean {
    if (!this.state || this.screen !== 'offer') return false;
    const step = chooseRelic(this.state, id);
    if (!step.changed) return false;
    this.apply(step);
    return true;
  }

  /**
   * The player pressed an active relic's button. Relics without a target fire
   * at once (undo); tile-targeted ones enter targeting mode. Pressing the same
   * button again while targeting cancels.
   */
  activateRelic(id: RelicId): boolean {
    if (!this.state) return false;
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
    const step = useActive(this.state, id, target);
    if (!step.changed) return false;
    this.targeting = null;
    this.apply(step);
    return true;
  }

  dismissHint(): void {
    if (!this.currentHint) return;
    this.currentHint = null;
    this.nextHint();
  }

  // ---------------------------------------------------------------- internals

  private apply(step: RunStep): void {
    const previous = this.state;
    const run = step.run;
    this.state = run;
    const { board, ui } = this.options;

    board.showStep(step);
    board.setMarks(boardMarks(run, this.targeting));
    ui.updateHud(hudModel(run));

    let gained = 0;
    for (const e of step.events) if (e.type === 'score') gained += e.gained;
    if (gained > 0) ui.scoreGained(gained);

    const newStage =
      previous === null ||
      (step.boardReplaced &&
        (previous.stageIndex !== run.stageIndex || previous.status !== 'playing'));
    this.ageHint(newStage);
    if (newStage) {
      ui.announceStage(stageBanner(run));
      for (const hint of stageStartHints(run)) this.queueHint(hint);
    }
    for (const kind of hazardsInEvents(step.events)) this.queueHint(hazardHint(kind));

    this.checkRecords(run);
    this.setScreen(this.screenFor(run));
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
        return offerScreen(run);
      case 'victory':
      case 'gameOver':
        return resultScreen(run, this.isNewRecord(run));
    }
  }

  /** Beat a record that existed before this run (a first run is not celebrated as a "record"). */
  private isNewRecord(run: RunState): boolean {
    const before = this.recordsAtStart;
    const after = this.records;
    return run.mode === 'run'
      ? before.runBestScore > 0 &&
          (after.runBestScore > before.runBestScore || after.runBestStages > before.runBestStages)
      : before.endlessBestScore > 0 && after.endlessBestScore > before.endlessBestScore;
  }

  private checkRecords(run: RunState): void {
    const next = updateRecords(this.records, run);
    if (next === this.records) return;
    this.records = next;
    this.options.onRecordsChange?.(next);
  }

  /** Re-sends HUD and marks (after leaving targeting, for instance). */
  private refresh(): void {
    if (!this.state) return;
    this.options.board.setMarks(boardMarks(this.state, this.targeting));
    this.options.ui.updateHud(hudModel(this.state));
  }

  private setScreen(screen: ScreenModel): void {
    this.screenModel = screen;
    this.options.ui.showScreen(screen);
  }

  private queueHint(hint: Hint): void {
    if (this.seen.has(hint.key)) return;
    this.seen.add(hint.key);
    this.options.onHintSeen?.(hint.key);
    this.hintQueue.push(hint);
    if (!this.currentHint) this.nextHint();
  }

  private nextHint(): void {
    this.currentHint = this.hintQueue.shift() ?? null;
    this.hintAge = 0;
    this.options.ui.showHint(this.currentHint);
  }

  /** Counts moves a hint has been up; it hides itself after a few (or on a new stage). */
  private ageHint(newStage: boolean): void {
    if (!this.currentHint) return;
    this.hintAge++;
    if (newStage || this.hintAge > HINT_MOVES) this.dismissHint();
  }

  private clearHints(): void {
    this.hintQueue.length = 0;
    if (this.currentHint) {
      this.currentHint = null;
      this.options.ui.showHint(null);
    }
  }
}
