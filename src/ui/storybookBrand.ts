/**
 * Storybook proof: the menu's title block (working title from the plan) and
 * the page's paper grain, both drawn in code.
 */
import { beaconTower } from './journey';
import { el } from './dom';
import type { Brand } from './screens';

export const STORYBOOK_BRAND: Brand = {
  logo: () => {
    const box = el('div', 'brand');
    const art = el('div', 'brand-art');
    // Static, code-drawn SVG (no user data).
    art.innerHTML = `<svg viewBox="0 0 120 84" width="132" height="92" aria-hidden="true">
      <defs><radialGradient id="jm-glow"><stop offset="0" stop-color="#ffd36b" stop-opacity="0.95"/>
      <stop offset="0.4" stop-color="#f1d27a" stop-opacity="0.5"/><stop offset="1" stop-color="#f1d27a" stop-opacity="0"/></radialGradient></defs>
      <path d="M6 80 Q30 64 60 70 Q90 64 114 80 Z" fill="#c9b27a" stroke="#2b1d10" stroke-width="1.5"/>
      ${beaconTower(60, 74, true, 1.15)}
    </svg>`;
    const title = el('h1', 'brand-title', '봉화 원정대');
    box.append(art, title, el('span', 'brand-sub', '— 꺼진 봉화를 다시 밝혀라 —'));
    return box;
  },
  tagline: '룬석을 합쳐 불씨를 키우는 로그라이크 퍼즐',
  runBlurb: '12 스테이지 · 봉화 3 · 유물을 모아 동료를 모으세요',
};

/**
 * A tileable paper-grain texture as a data URL: fibres and speckle on a
 * transparent canvas, laid over the page colour by CSS (`--paper`).
 * Returns null where a canvas is unavailable.
 */
export function paperTexture(size = 192): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return null;
  let seed = 0x9e3779b9;
  const rnd = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < size * 6; i++) {
    g.fillStyle = rnd() < 0.7 ? 'rgba(110, 78, 40, 0.09)' : 'rgba(255, 255, 255, 0.25)';
    const s = 0.6 + rnd() * 1.4;
    g.fillRect(rnd() * size, rnd() * size, s, s);
  }
  g.strokeStyle = 'rgba(110, 78, 40, 0.07)';
  g.lineWidth = 0.8;
  for (let i = 0; i < size / 6; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const a = rnd() * Math.PI;
    const l = 6 + rnd() * 18;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(
      x + Math.cos(a) * l * 0.5 + 2,
      y + Math.sin(a) * l * 0.5 - 2,
      x + Math.cos(a) * l,
      y + Math.sin(a) * l,
    );
    g.stroke();
  }
  return canvas.toDataURL('image/png');
}
