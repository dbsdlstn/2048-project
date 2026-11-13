/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { README, updatedReadme } from '../tools/readme-tables';

describe('README', () => {
  it('rule tables match the game data (run `npm run readme` after changing relics or stages)', async () => {
    const current = readFileSync(README, 'utf8');
    expect(await updatedReadme(current)).toBe(current);
  });
});
