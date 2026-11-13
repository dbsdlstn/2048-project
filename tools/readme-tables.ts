/// <reference types="node" />
/**
 * Writes the README's rule tables (relics, hazards, bosses, stages) from the
 * game data, so the README cannot drift from the code. Each table lives
 * between `<!-- generated:NAME -->` and `<!-- /generated:NAME -->`.
 *
 *   npm run readme          # rewrite the tables
 *   npm run readme -- --check   # exit 1 if README.md is stale (also a unit test)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import {
  BOSSES,
  HAZARD_INFO,
  RELIC_IDS,
  RELICS,
  STAGES,
  describeGoal,
  hazardsPresent,
  stageLabel,
  type HazardKind,
} from '../src/core';
import { RARITY_LABEL } from '../src/game/runView';

export const README = join(dirname(fileURLToPath(import.meta.url)), '..', 'README.md');

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]): string =>
    `| ${cells.map((c) => c.replaceAll('|', '\\|')).join(' | ')} |`;
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n');
}

const HAZARD_ORDER: readonly HazardKind[] = ['stone', 'ice', 'curse'];

/** The tables, by marker name. */
export function sections(): Record<string, string> {
  const relics = table(
    ['유물', '등급', '종류', '효과'],
    RELIC_IDS.map((id) => {
      const r = RELICS[id];
      return [
        r.name,
        RARITY_LABEL[r.rarity],
        r.active ? '사용' : '지속',
        r.description.replace(/^\[사용\]\s*/, ''),
      ];
    }),
  );

  const firstSeen = (kind: HazardKind): string => {
    const i = STAGES.findIndex((s) => hazardsPresent(s.hazards).includes(kind));
    return i < 0 ? '—' : stageLabel(i);
  };
  const hazards = table(
    ['방해', '규칙', '처음 나오는 곳'],
    HAZARD_ORDER.map((k) => [HAZARD_INFO[k].name, HAZARD_INFO[k].description, firstSeen(k)]),
  );

  const bosses = table(
    ['보스', '스테이지', '규칙'],
    STAGES.flatMap((s, i) => {
      if (!s.boss) return [];
      const b = BOSSES[s.boss];
      return [[b.name, stageLabel(i), b.description]];
    }),
  );

  const stages = table(
    ['스테이지', '목표', '이동 제한', '방해', '보스'],
    STAGES.map((s, i) => {
      const present = hazardsPresent(s.hazards);
      const names = HAZARD_ORDER.filter((k) => present.includes(k)).map((k) => HAZARD_INFO[k].name);
      return [
        stageLabel(i),
        describeGoal(s.goal),
        String(s.moveLimit),
        names.join(' · ') || '—',
        s.boss ? BOSSES[s.boss].name : '—',
      ];
    }),
  );

  return { relics, hazards, bosses, stages };
}

/** README text with every generated block replaced, formatted like the rest of the repo. */
export async function updatedReadme(text: string): Promise<string> {
  let out = text;
  for (const [name, body] of Object.entries(sections())) {
    const open = `<!-- generated:${name} -->`;
    const close = `<!-- /generated:${name} -->`;
    const start = out.indexOf(open);
    const end = out.indexOf(close);
    if (start < 0 || end < start) throw new Error(`README.md: missing ${open} … ${close}`);
    out = `${out.slice(0, start + open.length)}\n\n${body}\n\n${out.slice(end)}`;
  }
  const config = await resolveConfig(README);
  return format(out, { ...config, filepath: README });
}

async function main(): Promise<void> {
  const current = readFileSync(README, 'utf8');
  const next = await updatedReadme(current);
  if (process.argv.includes('--check')) {
    if (next !== current) {
      console.error('README.md tables are stale: run `npm run readme`');
      process.exit(1);
    }
    console.log('README.md tables are up to date');
    return;
  }
  writeFileSync(README, next);
  console.log(next === current ? 'README.md already up to date' : 'README.md tables updated');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
