/// <reference types="node" />
/**
 * Draws the app icons and the social preview image as SVG and rasterises them
 * with Playwright's Chromium. The generated files are committed in `public/`;
 * run this again only when the artwork changes.
 *
 *   npm run icons
 *
 * Motif (the game's own, see docs/STUDY.md D47): a cut-corner circuit chip
 * split by a glowing amber rift. No number tiles, so it does not read as
 * "another 2048".
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { chromiumOptions } from './chromium';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

// Same palette as src/render/theme.ts and src/ui/style.css.
const C = {
  bg: '#08080f',
  panel: '#12122a',
  teal: '#2de2e6',
  violet: '#8b5cf6',
  pink: '#ff3cac',
  amber: '#ffb347',
  text: '#ececff',
  muted: '#9a9ac4',
};

/** Points of a cut-corner square ("chip") centred at (cx, cy). */
function chipPoints(cx: number, cy: number, half: number, cut: number): string {
  const [l, r, t, b] = [cx - half, cx + half, cy - half, cy + half];
  return [
    [l + cut, t],
    [r - cut, t],
    [r, t + cut],
    [r, b - cut],
    [r - cut, b],
    [l + cut, b],
    [l, b - cut],
    [l, t + cut],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
}

/**
 * The emblem in a 512×512 box: chip outline, two circuit traces, and the rift
 * that splits it. `detail` false drops the thin traces (tiny favicon sizes).
 */
function emblem(detail: boolean): string {
  const chip = chipPoints(256, 256, 150, 58);
  const rift = '406,90 350,152 374,178 314,216 338,248 258,284 282,318 200,352 218,378 106,430';
  const traces = detail
    ? `
    <g fill="none" stroke="${C.violet}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
      <polyline points="168,190 168,160 230,160" />
      <polyline points="344,300 344,352 290,352" />
      <polyline points="196,250 152,250" />
    </g>
    <g fill="${C.violet}">
      <circle cx="230" cy="160" r="12" /><circle cx="290" cy="352" r="12" /><circle cx="152" cy="250" r="12" />
    </g>`
    : '';
  return `
    <polygon points="${chip}" fill="${C.panel}" />
    ${traces}
    <polygon points="${chip}" fill="none" stroke="${C.teal}" stroke-width="${detail ? 18 : 26}" stroke-linejoin="round" filter="url(#glow)" />
    <polyline points="${rift}" fill="none" stroke="${C.bg}" stroke-width="${detail ? 46 : 54}" stroke-linejoin="round" stroke-linecap="round" />
    <polyline points="${rift}" fill="none" stroke="${C.amber}" stroke-width="${detail ? 18 : 26}" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)" />
    <polyline points="${rift}" fill="none" stroke="#fff4dc" stroke-width="${detail ? 6 : 9}" stroke-linejoin="round" stroke-linecap="round" />`;
}

const DEFS = `
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#2a1f5c" />
      <stop offset="1" stop-color="${C.bg}" />
    </radialGradient>
    <radialGradient id="haze" cx="50%" cy="45%" r="65%">
      <stop offset="0" stop-color="#2a1f5c" />
      <stop offset="1" stop-color="${C.bg}" />
    </radialGradient>
  </defs>`;

/**
 * A square icon. `scale` shrinks the emblem around the centre (maskable icons
 * keep it inside the central safe circle); `rounded` gives a transparent
 * margin and round corners for the plain "any" icon.
 */
function iconSvg(opts: { scale: number; rounded: boolean; detail?: boolean }): string {
  const bg = opts.rounded
    ? `<rect x="16" y="16" width="480" height="480" rx="104" fill="url(#haze)" />`
    : `<rect width="512" height="512" fill="url(#haze)" />`;
  const t = (1 - opts.scale) * 256;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${DEFS}
  ${bg}
  <g transform="translate(${t} ${t}) scale(${opts.scale})">${emblem(opts.detail ?? true)}</g>
</svg>`;
}

/** The link preview card (1200×630): emblem, name, Korean pitch. */
function socialSvg(): string {
  const grid: string[] = [];
  for (let x = 0; x <= 1200; x += 60) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="630" />`);
  for (let y = 0; y <= 630; y += 60) grid.push(`<line x1="0" y1="${y}" x2="1200" y2="${y}" />`);
  const font = "system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'WenQuanYi Zen Hei', sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">${DEFS}
  <rect width="1200" height="630" fill="${C.bg}" />
  <ellipse cx="300" cy="315" rx="520" ry="460" fill="url(#halo)" />
  <g stroke="rgba(120,140,255,0.08)" stroke-width="1">${grid.join('')}</g>
  <g transform="translate(40 75) scale(0.94)">${emblem(true)}</g>
  <g font-family="${font}">
    <text x="570" y="250" font-size="92" font-weight="800" letter-spacing="6" fill="${C.text}">NEON <tspan fill="${C.amber}">RIFT</tspan></text>
    <text x="574" y="322" font-size="34" font-weight="700" fill="${C.teal}">합쳐서 균열을 닫는 로그라이크 퍼즐</text>
    <text x="574" y="392" font-size="26" fill="${C.muted}">2048 규칙 · 방해 타일 · 보스 규칙 · 유물 빌드</text>
    <text x="574" y="436" font-size="26" fill="${C.muted}">브라우저에서 바로, 설치하면 오프라인으로</text>
  </g>
</svg>`;
}

interface Output {
  readonly file: string;
  readonly svg: string;
  readonly width: number;
  readonly height: number;
  /** Keep transparency outside the drawing (rounded icon, favicon). */
  readonly transparent?: boolean;
}

async function main(): Promise<void> {
  const any = iconSvg({ scale: 1, rounded: true });
  // Maskable: launchers may crop to a circle of 80% of the size; the emblem's
  // chip (300 px of 512 at scale 1) is shrunk to stay well inside it.
  const maskable = iconSvg({ scale: 0.78, rounded: false });
  const full = iconSvg({ scale: 0.92, rounded: false });
  const tiny = iconSvg({ scale: 1.08, rounded: true, detail: false });
  const outputs: Output[] = [
    { file: 'icons/icon-192.png', svg: any, width: 192, height: 192, transparent: true },
    { file: 'icons/icon-512.png', svg: any, width: 512, height: 512, transparent: true },
    { file: 'icons/maskable-512.png', svg: maskable, width: 512, height: 512 },
    // iOS adds its own rounded mask and does not support transparency.
    { file: 'icons/apple-touch-icon.png', svg: full, width: 180, height: 180 },
    { file: 'icons/favicon-32.png', svg: tiny, width: 32, height: 32, transparent: true },
    { file: 'og-image.png', svg: socialSvg(), width: 1200, height: 630 },
  ];

  writeFileSync(join(PUBLIC, 'favicon.svg'), `${tiny.trim()}\n`);
  const browser = await chromium.launch(chromiumOptions());
  try {
    const page = await browser.newPage();
    for (const out of outputs) {
      await page.setViewportSize({ width: out.width, height: out.height });
      const svg = out.svg.replace(
        /width="\d+" height="\d+"/,
        `width="${out.width}" height="${out.height}"`,
      );
      await page.setContent(
        `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`,
      );
      const png = await page.screenshot({
        clip: { x: 0, y: 0, width: out.width, height: out.height },
        omitBackground: out.transparent ?? false,
      });
      const path = join(PUBLIC, out.file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, png);
      console.log(
        `${out.file.padEnd(26)} ${out.width}x${out.height}  ${(png.length / 1024).toFixed(1)} KB`,
      );
    }
  } finally {
    await browser.close();
  }
}

await main();
