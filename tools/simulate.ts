/// <reference types="node" />
/**
 * Balance bot simulator: plays the run mode headlessly with a few simple bots
 * over many seeds and prints per-stage clear rates, moves used and the effect
 * of each relic on the win rate. The core is pure, so this is just a loop.
 *
 *   npm run sim                 # 300 runs per bot
 *   npm run sim -- --runs 1000  # more seeds
 */
import {
  RELICS,
  RELIC_IDS,
  STAGES,
  breakStones,
  chooseRelic,
  createRng,
  lockedCells,
  nextInt,
  runDirections,
  runMove,
  slide,
  stageLabel,
  startRun,
  useActive,
  toPosition,
  type Direction,
  type GameState,
  type RelicId,
  type RngState,
  type RunState,
} from '../src/core';

// ---------------------------------------------------------------- bots

interface Bot {
  readonly name: string;
  /** Picks a direction among `dirs` (never empty). */
  choose(
    run: RunState,
    dirs: readonly Direction[],
    rng: RngState,
  ): { dir: Direction; rng: RngState };
  /** Whether the bot uses active relics (bomb when stuck / on stones, undo when stuck). */
  readonly usesActives: boolean;
}

function slideFor(run: RunState, dir: Direction): ReturnType<typeof slide> {
  return slide(run.board, dir, { walls: lockedCells(run.boss?.lock ?? null, run.board.size) });
}

const randomBot: Bot = {
  name: 'random',
  usesActives: false,
  choose(_run, dirs, rng) {
    const roll = nextInt(rng, dirs.length);
    return { dir: dirs[roll.value] as Direction, rng: roll.rng };
  },
};

/** Takes the move with the most immediate merge score; ties go to the first direction in `dirs`. */
const greedyBot: Bot = {
  name: 'greedy',
  usesActives: false,
  choose(run, dirs, rng) {
    let best = dirs[0] as Direction;
    let bestScore = -1;
    for (const d of dirs) {
      const s = slideFor(run, d).scoreGained;
      if (s > bestScore) {
        bestScore = s;
        best = d;
      }
    }
    return { dir: best, rng };
  },
};

/**
 * Score of one row or column for the corner bot. The terms (free cells,
 * neighbouring equal tiles, monotonic order, a penalty on big tiles away from
 * order) follow the common 2048-AI heuristic; weights are hand-tuned.
 */
function lineValue(ranks: readonly number[]): number {
  let empty = 0;
  let merges = 0;
  let sum = 0;
  let prev = 0;
  let counter = 0;
  for (const r of ranks) {
    sum += r ** 3.5;
    if (r === 0) {
      empty++;
      continue;
    }
    if (prev === r) counter++;
    else if (counter > 0) {
      merges += 1 + counter;
      counter = 0;
    }
    prev = r;
  }
  if (counter > 0) merges += 1 + counter;
  let monoLeft = 0;
  let monoRight = 0;
  for (let i = 1; i < ranks.length; i++) {
    const a = ranks[i - 1] ?? 0;
    const b = ranks[i] ?? 0;
    if (a > b) monoLeft += a ** 4 - b ** 4;
    else monoRight += b ** 4 - a ** 4;
  }
  return 270 * empty + 700 * merges - 47 * Math.min(monoLeft, monoRight) - 11 * sum;
}

/** Number ranks (log2) of the board; stones and prisms count as 0 / a wildcard-ish 1. */
function boardValue(board: GameState): number {
  const n = board.size;
  const rank = (i: number): number => {
    const t = board.cells[i];
    if (!t) return 0;
    return t.kind === 'number' ? Math.log2(t.value) : 1;
  };
  let total = 0;
  for (let a = 0; a < n; a++) {
    const row: number[] = [];
    const col: number[] = [];
    for (let b = 0; b < n; b++) {
      row.push(rank(a * n + b));
      col.push(rank(b * n + a));
    }
    total += lineValue(row) + lineValue(col);
  }
  return total;
}

/**
 * A competent-player stand-in: one-move lookahead with the heuristic above
 * (big tiles ordered toward an edge/corner, free cells, ready merges), plus
 * stone breaking when the stage asks for it. It looks at the slide only, never
 * at the upcoming random spawn.
 */
const cornerBot: Bot = {
  name: 'corner',
  usesActives: true,
  choose(run, dirs, rng) {
    const spec = STAGES[run.stageIndex];
    const wantsStones = spec?.goal.type === 'stones';
    let best = dirs[0] as Direction;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (const d of dirs) {
      const slid = slideFor(run, d);
      let value = boardValue(slid.state);
      if (wantsStones) {
        const sites = slid.events.flatMap((e) =>
          e.type === 'merge'
            ? [{ index: e.to.row * run.board.size + e.to.col, value: e.value }]
            : [],
        );
        value += breakStones(slid.state, sites, null).broken * 3000;
      }
      if (value > bestValue) {
        bestValue = value;
        best = d;
      }
    }
    return { dir: best, rng };
  },
};

const BOTS: readonly Bot[] = [randomBot, greedyBot, cornerBot];

// ---------------------------------------------------------------- one run

interface RunRecord {
  readonly won: boolean;
  /** Index of the last stage reached. */
  readonly reached: number;
  /** Moves used per cleared stage. */
  readonly movesPerStage: readonly number[];
  readonly offers: readonly { readonly offered: readonly RelicId[]; readonly picked: RelicId }[];
}

/** Uses an active relic to get out of a stuck board: bomb the smallest tile, else undo. */
function tryRescue(run: RunState, bot: Bot): { run: RunState; undid: boolean } | null {
  if (!bot.usesActives) return null;
  const bomb = run.relics.find((r) => RELICS[r.id].active?.effect === 'destroy' && r.charges > 0);
  if (bomb) {
    let target = -1;
    run.board.cells.forEach((t, i) => {
      if (t && (target < 0 || t.value < (run.board.cells[target]?.value ?? Infinity))) target = i;
    });
    if (target >= 0) {
      const step = useActive(run, bomb.id, toPosition(target, run.board.size));
      if (step.changed) return { run: step.run, undid: false };
    }
  }
  const undo = run.relics.find((r) => RELICS[r.id].active?.effect === 'undo' && r.charges > 0);
  if (undo) {
    const step = useActive(run, undo.id);
    if (step.changed) return { run: step.run, undid: true };
  }
  return null;
}

/** In a stones stage, spend a bomb charge on a stone. */
function bombStone(run: RunState, bot: Bot): RunState {
  if (!bot.usesActives || STAGES[run.stageIndex]?.goal.type !== 'stones') return run;
  const bomb = run.relics.find((r) => RELICS[r.id].active?.effect === 'destroy' && r.charges > 0);
  const stone = run.board.cells.findIndex((t) => t?.kind === 'stone');
  if (!bomb || stone < 0) return run;
  return useActive(run, bomb.id, toPosition(stone, run.board.size)).run;
}

/** Plays the current stage until the run leaves `playing` (cleared, failed) or the bot gives up. */
function playStage(start: RunState, bot: Bot, rngIn: RngState): { run: RunState; rng: RngState } {
  let run = start;
  let rng = rngIn;
  let banned: Direction | null = null;
  let lastDir: Direction | null = null;
  for (let guard = 0; guard < 5000 && run.status === 'playing'; guard++) {
    run = bombStone(run, bot);
    if (run.status !== 'playing') break;
    let dirs = runDirections(run);
    if (banned && dirs.length > 1) dirs = dirs.filter((d) => d !== banned);
    banned = null;
    if (dirs.length === 0) {
      const rescued = tryRescue(run, bot);
      if (!rescued) break;
      run = rescued.run;
      // After an undo the same choice would repeat; avoid it once.
      if (rescued.undid) banned = lastDir;
      continue;
    }
    const pick = bot.choose(run, dirs, rng);
    rng = pick.rng;
    lastDir = pick.dir;
    run = runMove(run, pick.dir).run;
  }
  return { run, rng };
}

function playRun(bot: Bot, seed: number): RunRecord {
  let run = startRun('run', seed).run;
  let rng = createRng(seed ^ 0x5bd1e995);
  const movesPerStage: number[] = [];
  const offers: { offered: RelicId[]; picked: RelicId }[] = [];

  while (run.status === 'playing') {
    const played = playStage(run, bot, rng);
    run = played.run;
    rng = played.rng;
    if (run.status === 'victory') movesPerStage.push(run.progress.movesUsed);
    if (run.status !== 'offer') break;
    movesPerStage.push(run.progress.movesUsed);
    let picked: RelicId | null = null;
    if (run.offer.length > 0) {
      const roll = nextInt(rng, run.offer.length);
      rng = roll.rng;
      picked = run.offer[roll.value] as RelicId;
      offers.push({ offered: [...run.offer], picked });
    }
    run = chooseRelic(run, picked).run;
  }
  return { won: run.status === 'victory', reached: run.stageIndex, movesPerStage, offers };
}

interface StageRecord {
  readonly cleared: boolean;
  readonly moves: number;
  readonly reason: 'moves' | 'stuck' | null;
}

/** One stage in isolation, without relics. */
function playIsolated(bot: Bot, stageIndex: number, seed: number): StageRecord {
  const run = startRun('run', seed, { stageIndex }).run;
  const played = playStage(run, bot, createRng(seed ^ 0x2545f491)).run;
  const cleared = played.status === 'offer' || played.status === 'victory';
  return {
    cleared,
    moves: played.progress.movesUsed,
    reason: cleared ? null : (played.failReason ?? 'stuck'),
  };
}

// ---------------------------------------------------------------- report

function pct(n: number, d: number): string {
  return d === 0 ? '   -' : `${((100 * n) / d).toFixed(0).padStart(3)}%`;
}

function pad(text: string, width: number): string {
  // Korean characters are double width in most terminals.
  let w = 0;
  for (let i = 0; i < text.length; i++) w += text.charCodeAt(i) > 0x1100 ? 2 : 1;
  return text + ' '.repeat(Math.max(0, width - w));
}

function describe(index: number): string {
  const spec = STAGES[index];
  if (!spec) return '';
  const g = spec.goal;
  const goal =
    g.type === 'score'
      ? `score ${g.target}`
      : g.type === 'tile'
        ? `tile ${g.value}`
        : `stones ${g.count}`;
  return `${goal} / ${spec.moveLimit}${spec.boss ? ` [${spec.boss}]` : ''}`;
}

function main(): void {
  const args = process.argv.slice(2);
  const runsArg = args.indexOf('--runs');
  const runs = runsArg >= 0 ? Number(args[runsArg + 1]) : 300;
  const started = Date.now();

  const records = new Map<string, RunRecord[]>();
  for (const bot of BOTS) {
    const list: RunRecord[] = [];
    for (let i = 0; i < runs; i++) list.push(playRun(bot, 1000 + i));
    records.set(bot.name, list);
  }

  console.log(`Neon Rift balance sim: ${runs} runs per bot, seeds 1000..${1000 + runs - 1}\n`);
  console.log(
    'Per-stage clear rate (of runs that reached the stage) and avg moves used when cleared',
  );
  const header =
    pad('stage', 8) + pad('goal / moves', 26) + BOTS.map((b) => pad(b.name, 20)).join('');
  console.log(header);
  for (let s = 0; s < STAGES.length; s++) {
    let line = pad(stageLabel(s), 8) + pad(describe(s), 26);
    for (const bot of BOTS) {
      const list = records.get(bot.name) ?? [];
      const reached = list.filter((r) => r.reached >= s).length;
      const cleared = list.filter((r) => r.reached > s || (r.reached === s && r.won)).length;
      const moves = list.flatMap((r) => {
        const m = r.movesPerStage[s];
        return m === undefined ? [] : [m];
      });
      const avg = moves.length ? (moves.reduce((a, b) => a + b, 0) / moves.length).toFixed(0) : '-';
      line += pad(
        `${pct(cleared, reached)} ${String(reached).padStart(4)}r ${avg.padStart(4)}m`,
        20,
      );
    }
    console.log(line);
  }

  console.log(
    '\nEach stage alone, no relics: clear rate, avg moves when cleared, failures by moves/stuck',
  );
  console.log(
    pad('stage', 8) + pad('goal / moves', 26) + BOTS.map((b) => pad(b.name, 24)).join(''),
  );
  for (let s = 0; s < STAGES.length; s++) {
    let line = pad(stageLabel(s), 8) + pad(describe(s), 26);
    for (const bot of BOTS) {
      const list = Array.from({ length: runs }, (_, i) => playIsolated(bot, s, 5000 + i));
      const cleared = list.filter((r) => r.cleared);
      const avg = cleared.length
        ? (cleared.reduce((a, r) => a + r.moves, 0) / cleared.length).toFixed(0)
        : '-';
      const byMoves = list.filter((r) => r.reason === 'moves').length;
      const stuck = list.filter((r) => r.reason === 'stuck').length;
      line += pad(
        `${pct(cleared.length, list.length)} ${avg.padStart(4)}m ${byMoves}/${stuck}`,
        24,
      );
    }
    console.log(line);
  }

  console.log('\nOutcome');
  for (const bot of BOTS) {
    const list = records.get(bot.name) ?? [];
    const wins = list.filter((r) => r.won).length;
    const pastAct1 = list.filter((r) => r.reached >= 4).length;
    const act3Boss = list.filter((r) => r.reached >= 11).length;
    console.log(
      `${pad(bot.name, 8)} win ${pct(wins, list.length)}  past act 1 ${pct(pastAct1, list.length)}  reached act 3 boss ${pct(act3Boss, list.length)}  boss win ${pct(wins, act3Boss)}`,
    );
  }

  // Relic effect: take the first offer in each run that contained X, and compare
  // the win rate of runs that picked X there with runs that picked something
  // else. Picks are random, so this is a small randomized experiment per relic
  // (and avoids the survival bias of "ever owned X": long runs see more offers).
  console.log(
    '\nRelic win-rate delta (corner bot): first offer containing X → picked X vs picked another',
  );
  const corner = records.get('corner') ?? [];
  const rows: {
    id: RelicId;
    picked: number;
    pickedWins: number;
    other: number;
    otherWins: number;
  }[] = [];
  for (const id of RELIC_IDS) {
    let picked = 0;
    let pickedWins = 0;
    let other = 0;
    let otherWins = 0;
    for (const r of corner) {
      const first = r.offers.find((o) => o.offered.includes(id));
      if (!first) continue;
      if (first.picked === id) {
        picked++;
        if (r.won) pickedWins++;
      } else {
        other++;
        if (r.won) otherWins++;
      }
    }
    rows.push({ id, picked, pickedWins, other, otherWins });
  }
  rows.sort(
    (a, b) =>
      b.pickedWins / Math.max(1, b.picked) -
      b.otherWins / Math.max(1, b.other) -
      (a.pickedWins / Math.max(1, a.picked) - a.otherWins / Math.max(1, a.other)),
  );
  for (const r of rows) {
    const a = r.picked ? r.pickedWins / r.picked : 0;
    const b = r.other ? r.otherWins / r.other : 0;
    const delta = ((a - b) * 100).toFixed(1);
    console.log(
      `${pad(RELICS[r.id].name, 14)} ${pad(r.id, 14)} picked ${pct(r.pickedWins, r.picked)} (n=${String(r.picked).padStart(3)})  not ${pct(r.otherWins, r.other)} (n=${String(r.other).padStart(3)})  delta ${delta.padStart(6)} pts`,
    );
  }
  console.log(`\n(${((Date.now() - started) / 1000).toFixed(1)} s)`);
}

main();
