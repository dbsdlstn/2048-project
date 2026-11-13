import { expect, test } from '@playwright/test';
import {
  runDirections,
  runMove,
  startRun,
  toValueGrid,
  type Direction,
  type RunState,
} from '../src/core';
import { KEY, grid, open, settle, swipe } from './helpers';

const SEED = 42;

/**
 * The reference: the same seed played on the pure core in Node, with a plain
 * "down, left, right, up" priority. The browser must end up in exactly the
 * same states through real input.
 */
function referencePlan(): { dirs: Direction[]; grids: number[][][] } {
  const order: Direction[] = ['down', 'left', 'right', 'up'];
  let run: RunState = startRun('run', SEED).run;
  const dirs: Direction[] = [];
  const grids: number[][][] = [];
  while (run.status === 'playing') {
    const options = runDirections(run);
    const dir = order.find((d) => options.includes(d));
    if (!dir) break;
    run = runMove(run, dir).run;
    dirs.push(dir);
    grids.push(toValueGrid(run.board));
  }
  if (run.status !== 'offer')
    throw new Error(`seed ${SEED}: the reference plan does not clear 1-1`);
  return { dirs, grids };
}

test('menu → swipes → clear 1-1 → relic → reload → continue restores the run', async ({ page }) => {
  const plan = referencePlan();
  await open(page, `&seed=${SEED}`);

  await page.getByRole('button', { name: /^런 모드/ }).click();
  await expect.poll(() => page.evaluate(() => window.__neonRift?.screen().kind)).toBe('playing');
  expect(await grid(page)).toEqual(toValueGrid(startRun('run', SEED).run.board));

  // The first moves are real pointer swipes, the rest arrow keys.
  for (const [i, dir] of plan.dirs.entries()) {
    if (i < 4) await swipe(page, dir);
    else await page.keyboard.press(KEY[dir]);
    await settle(page);
    expect(await grid(page), `after move ${i + 1} (${dir})`).toEqual(plan.grids[i]);
  }

  // Stage cleared: the relic offer appears; take the first card.
  await expect(page.locator('.offer-card').first()).toBeVisible();
  const offered = await page.evaluate(() => window.__neonRift?.run()?.offer ?? []);
  expect(offered.length).toBeGreaterThan(0);
  await page.locator('.offer-card').first().click();
  await expect.poll(() => page.evaluate(() => window.__neonRift?.run()?.stageIndex)).toBe(1);
  await settle(page);
  const before = await page.evaluate(() => window.__neonRift?.run());
  expect(before?.relics.map((r) => r.id)).toEqual([offered[0]]);

  // Reload: the menu offers to continue, and continuing restores the same run.
  await page.reload();
  await page.waitForFunction(() => window.__neonRift !== undefined);
  await page.getByRole('button', { name: /^이어하기 · 런 모드/ }).click();
  await expect.poll(() => page.evaluate(() => window.__neonRift?.screen().kind)).toBe('playing');
  const after = await page.evaluate(() => window.__neonRift?.run());
  expect(after).toEqual(before);
});

test('works offline after the first visit', async ({ page, context }) => {
  await open(page);
  // The service worker has precached the build and controls the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__neonRift !== undefined);
  await page.getByRole('button', { name: /^무한 모드/ }).click();
  await expect.poll(() => page.evaluate(() => window.__neonRift?.screen().kind)).toBe('playing');
  const start = await grid(page);
  // Any move that changes the board proves the game runs from the cache.
  let moved = false;
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    await page.keyboard.press(KEY[dir]);
    await settle(page);
    if (JSON.stringify(await grid(page)) !== JSON.stringify(start)) {
      moved = true;
      break;
    }
  }
  expect(moved).toBe(true);
});
