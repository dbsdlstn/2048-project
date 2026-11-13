import { expect, type Page } from '@playwright/test';
import type { Direction } from '../src/core';
// Brings the `window.__neonRift` type into scope.
import type {} from '../src/game/debug';

export const KEY: Readonly<Record<Direction, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

/** Opens the game with the `?debug` hook (and a seed for the first run). */
export async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`./?debug${query}`);
  await page.waitForFunction(() => window.__neonRift !== undefined);
}

/** Jumps every running animation to its end, so the board on screen matches the state. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__neonRift?.settle();
  });
}

export async function grid(page: Page): Promise<number[][]> {
  return page.evaluate(() => window.__neonRift?.grid() ?? []);
}

/** A real swipe with the pointer, across the middle of the board. */
export async function swipe(page: Page, direction: Direction): Promise<void> {
  const box = await page.locator('.board').boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const d = 90;
  const offsets: Record<Direction, readonly [number, number]> = {
    up: [0, -d],
    down: [0, d],
    left: [-d, 0],
    right: [d, 0],
  };
  const [dx, dy] = offsets[direction];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
}
