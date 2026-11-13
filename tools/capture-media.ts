/// <reference types="node" />
/**
 * Captures the README screenshots from the production build with Playwright,
 * using the `?debug` hook to reach exact, seeded situations:
 *
 *   npm run build && npm run media
 *
 * Writes docs/media/*.jpg and a frame strip of one combo (combo-strip.png).
 */
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices, type Page } from '@playwright/test';
import { preview } from 'vite';
import type { Direction, RunState, Tile } from '../src/core';
import type {} from '../src/game/debug';
import { chromiumOptions } from './chromium';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'media');
const PHONE = { ...devices['iPhone 13'], deviceScaleFactor: 2 };

async function open(page: Page, base: string, query: string): Promise<void> {
  await page.goto(`${base}?debug${query}`);
  await page.waitForFunction(() => window.__neonRift !== undefined);
}

async function dismissHint(page: Page): Promise<void> {
  const close = page.locator('.hint-close');
  if (await close.isVisible()) await close.click();
}

/** Plays moves with a fixed priority, settling after each; stops early when `until` holds. */
async function play(
  page: Page,
  moves: number,
  order: readonly Direction[] = ['down', 'left', 'right', 'up'],
): Promise<void> {
  await page.evaluate(
    ({ moves, order }) => {
      const api = window.__neonRift;
      if (!api) return;
      for (let i = 0; i < moves; i++) {
        if (api.screen().kind !== 'playing') break;
        if (!order.some((d) => api.move(d))) break;
        api.settle();
      }
    },
    { moves, order },
  );
}

async function shot(page: Page, name: string): Promise<void> {
  const path = join(OUT, name);
  await page.screenshot({ path, type: 'jpeg', quality: 82 });
  console.log(`${name.padEnd(22)} ${(statSync(path).size / 1024).toFixed(0)} KB`);
}

/** A number tile for hand-built boards. */
function tile(id: number, value: number): Tile {
  return { id, kind: 'number', value, status: { frozenTurns: 0, cursed: false } };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const server = await preview({ preview: { port: 4175, strictPort: true }, logLevel: 'warn' });
  const base = server.resolvedUrls?.local[0];
  if (!base) throw new Error('preview server has no URL');
  const browser = await chromium.launch(chromiumOptions());
  try {
    const context = await browser.newContext(PHONE);
    const page = await context.newPage();

    // 1. Menu.
    await open(page, base, '');
    await page.waitForTimeout(400);
    await shot(page, 'menu.jpg');

    // 2. Mid-run in act 2: stones, ice and curse on the board, a few relics.
    await open(page, base, '&mode=run&stage=6&seed=31&relics=pickaxe,bomb,cornerAnchor');
    // Play until stone, ice and curse are all on the board at once.
    await page.evaluate(() => {
      const api = window.__neonRift;
      if (!api) return;
      // (No named helper functions in here: the code runs in the page as written.)
      for (let i = 0; i < 80; i++) {
        const cells = api.state()?.cells ?? [];
        if (
          cells.some((t) => t?.kind === 'stone') &&
          cells.some((t) => (t?.status.frozenTurns ?? 0) > 0) &&
          cells.some((t) => t?.status.cursed === true)
        ) {
          break;
        }
        if (!(['down', 'left', 'right', 'up'] as const).some((d) => api.move(d))) break;
        api.settle();
      }
    });
    await dismissHint(page);
    await page.waitForTimeout(1500);
    await shot(page, 'hazards.jpg');

    // 3. Boss: the warden has sealed a line; the HUD counts down to the next seal.
    await open(page, base, '&mode=run&stage=3&seed=12&relics=delayVeil,chain');
    await page.evaluate(() => {
      const api = window.__neonRift;
      if (!api) return;
      for (let i = 0; i < 60 && !api.run()?.boss?.lock; i++) {
        if (!['down', 'left', 'right', 'up'].some((d) => api.move(d as Direction))) break;
        api.settle();
      }
    });
    await dismissHint(page);
    await page.waitForTimeout(1500);
    await shot(page, 'boss.jpg');

    // 4. Relic offer after clearing the first stage.
    await open(page, base, '&mode=run&seed=42');
    await play(page, 200);
    await page.locator('.offer-card').first().waitFor();
    await page.waitForTimeout(900);
    await shot(page, 'offer.jpg');

    // 5. Effects: a chained combo (8+8 → 16 → 32 → 64) caught mid-animation, and a strip of it.
    // Stage 2-1 (a score goal), so making a 64 does not end the stage mid-strip.
    await open(page, base, '&mode=run&stage=4&seed=5&relics=chain,resonance');
    await dismissHint(page);
    await page.evaluate((cells) => {
      const api = window.__neonRift;
      const run = api?.run();
      if (!api || !run) return;
      const next: RunState = {
        ...run,
        board: { ...run.board, cells, nextTileId: 100 },
      };
      api.load(next);
      api.settle();
    }, comboBoard());
    // Let the stage banner and hints play out, then freeze time.
    await page.waitForTimeout(3200);
    await dismissHint(page);
    await page.evaluate(() => window.__neonRift?.pause());
    const board = page.locator('.board');
    await page.keyboard.press('ArrowLeft');
    const frames: Buffer[] = [];
    for (const [i, step] of [0, 80, 90, 90, 110, 250].entries()) {
      await page.evaluate((ms) => window.__neonRift?.advance(ms), step);
      frames.push(await board.screenshot({ type: 'png' }));
      if (i === 4) await shot(page, 'effects.jpg');
    }
    await stripOf(page, frames, join(OUT, 'combo-strip.png'));
    await context.close();
  } finally {
    await browser.close();
    await server.close();
  }
}

/** A board where one swipe left chains 8+8 → 16 → 32 → 64 in the top row. */
function comboBoard(): (Tile | null)[] {
  const cells: (Tile | null)[] = Array.from({ length: 16 }, () => null);
  [8, 8, 16, 32].forEach((v, i) => (cells[i] = tile(10 + i, v)));
  cells[4] = tile(20, 4);
  cells[5] = tile(21, 4);
  cells[9] = tile(22, 2);
  cells[13] = tile(23, 128);
  return cells;
}

/** Puts frames side by side (scaled down) into one PNG, using the browser's canvas. */
async function stripOf(page: Page, frames: readonly Buffer[], path: string): Promise<void> {
  const urls = frames.map((f) => `data:image/png;base64,${f.toString('base64')}`);
  const strip = await page.evaluate(async (sources) => {
    const images = await Promise.all(
      sources.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              resolve(img);
            };
            img.onerror = reject;
            img.src = src;
          }),
      ),
    );
    const first = images[0];
    if (!first) return '';
    const h = 260;
    const w = Math.round((first.width / first.height) * h);
    const gap = 8;
    const canvas = document.createElement('canvas');
    canvas.width = images.length * w + (images.length - 1) * gap;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((img, i) => {
      ctx.drawImage(img, i * (w + gap), 0, w, h);
    });
    return canvas.toDataURL('image/png');
  }, urls);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(path, Buffer.from(strip.replace(/^data:image\/png;base64,/, ''), 'base64'));
  console.log(`combo-strip.png        ${(statSync(path).size / 1024).toFixed(0)} KB`);
}

await main();
