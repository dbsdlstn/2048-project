/**
 * The journey map (stage A slice: act 1 only). A storybook map drawn as
 * inline SVG: parchment, sea and coastline, a river, hills, forest, the road
 * with the act's stops and the first beacon tower, the party's marker, fog
 * over what has not been reached, and the dwarf hold once the dwarves have
 * rallied. Everything is generated from a small `JourneyState`, so stage C
 * can show it between stages straight from the run.
 *
 * Texture without assets: SVG filters (`feTurbulence`) make the paper grain,
 * the ragged map edge and the cloudy fog procedurally.
 *
 * All markup is built from static strings and numbers (no user data), so
 * innerHTML is safe here.
 */
import { DWARF_FIGURE, crest, emblemSvg, layerSvg } from '../render/storybook/emblems';
import type { JourneyMoment, JourneyState } from '../game/factionView';
import type { RaceId } from '../render/scenery';
import { button, el } from './dom';

/** Act 1 stops along the road (invented names), in map coordinates (viewBox 300 × 360). */
export const ACT1_STOPS: readonly {
  readonly name: string;
  readonly x: number;
  readonly y: number;
}[] = [
  { name: '갈대 나루', x: 64, y: 300 },
  { name: '돌밭 고개', x: 128, y: 246 },
  { name: '안개 숲', x: 102, y: 168 },
  { name: '여울 다리', x: 170, y: 120 },
  { name: '새벽 봉화대', x: 236, y: 70 },
];

const INK = '#2b1d10';
const GOLD = '#c8952c';
const GOLD_LIGHT = '#f1d27a';
const EMBER = '#e2672a';
const EMBER_HOT = '#ffd36b';

const ROAD =
  'M40 336 C52 320 58 312 64 300 C76 276 112 268 128 246 C142 226 96 196 102 168 C106 146 150 140 170 120 C188 102 210 92 236 70';

/** Deterministic pseudo-random numbers for the map's scatter (trees, waves). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number): string => v.toFixed(1);

function defs(): string {
  return `<defs>
    <filter id="jm-paper" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0 0.16  0 0 0 0.16 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
      <feBlend in2="SourceGraphic" mode="multiply"/>
    </filter>
    <filter id="jm-rough" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="9"/>
      <feDisplacementMap in="SourceGraphic" scale="7"/>
    </filter>
    <filter id="jm-cloud" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="4" seed="3" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 1.6 -0.35" result="c"/>
      <feComposite in="c" in2="SourceGraphic" operator="in"/>
    </filter>
    <radialGradient id="jm-glow">
      <stop offset="0" stop-color="${EMBER_HOT}" stop-opacity="0.95"/>
      <stop offset="0.4" stop-color="${GOLD_LIGHT}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${GOLD_LIGHT}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="jm-hole">
      <stop offset="0.5" stop-color="#000" stop-opacity="1"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="jm-clip"><rect x="12" y="12" width="276" height="336" rx="3"/></clipPath>
    <linearGradient id="jm-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9d3cc"/>
      <stop offset="1" stop-color="#93bab3"/>
    </linearGradient>
  </defs>`;
}

function sea(): string {
  const coast = 'M0 250 C22 246 30 262 26 280 C22 300 40 312 34 330 C30 344 48 352 60 360 L0 360 Z';
  const r = rng(5);
  let waves = '';
  for (let i = 0; i < 9; i++) {
    const x = 4 + r() * 22;
    const y = 270 + r() * 84;
    waves += `M${n(x)} ${n(y)} q3 -3 6 0 q3 3 6 0 `;
  }
  return `<path d="${coast}" fill="url(#jm-sea)"/>
    <path d="M0 250 C22 246 30 262 26 280 C22 300 40 312 34 330 C30 344 48 352 60 360" fill="none" stroke="#7fa9a0" stroke-width="5" opacity="0.6"/>
    <path d="M0 250 C22 246 30 262 26 280 C22 300 40 312 34 330 C30 344 48 352 60 360" fill="none" stroke="${INK}" stroke-width="1.6"/>
    <path d="${waves}" fill="none" stroke="#4f7f78" stroke-width="1" stroke-linecap="round"/>`;
}

function river(): string {
  const d =
    'M300 150 C270 156 252 140 226 150 C200 160 214 186 186 196 C160 206 150 186 132 198 C112 212 120 236 98 252 C80 266 62 262 46 276 C36 284 30 290 26 280';
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="7.5" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#8fbcd0" stroke-width="5" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#d8edf3" stroke-width="1" stroke-dasharray="6 9" stroke-linecap="round"/>`;
}

function mountains(): string {
  const peaks: [number, number, number][] = [
    [214, 46, 30],
    [246, 30, 38],
    [280, 44, 32],
    [196, 62, 22],
    [268, 66, 24],
  ];
  return peaks
    .map(([x, y, w]) => {
      const base = y + w * 0.95;
      return `<path d="M${x - w / 2} ${base} L${x} ${y} L${x + w / 2} ${base} Z" fill="#c2b49b" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M${x} ${y} L${x + w / 2} ${base} L${x + w * 0.1} ${base} Z" fill="#8f7f6a" opacity="0.8"/>
        <path d="M${x - w * 0.16} ${y + w * 0.3} L${x} ${y} L${x + w * 0.18} ${y + w * 0.34} L${x + w * 0.05} ${y + w * 0.26} Z" fill="#fbf4e2" stroke="${INK}" stroke-width="0.8"/>`;
    })
    .join('');
}

function hills(): string {
  const at: [number, number, number][] = [
    [170, 250, 26],
    [200, 236, 20],
    [228, 262, 24],
    [160, 300, 22],
    [260, 214, 22],
    [60, 210, 20],
  ];
  return at
    .map(
      ([x, y, w]) =>
        `<path d="M${x - w} ${y} Q${x} ${y - w * 0.9} ${x + w} ${y}" fill="#d9c58e" stroke="${INK}" stroke-width="1.3"/>
        <path d="M${x + w * 0.2} ${y - w * 0.35} l6 6 M${x + w * 0.45} ${y - w * 0.22} l5 5" stroke="${INK}" stroke-width="0.8" opacity="0.6"/>`,
    )
    .join('');
}

function forest(cx: number, cy: number, count: number, seed: number, spread: number): string {
  const r = rng(seed);
  const trees: [number, number][] = [];
  for (let i = 0; i < count; i++)
    trees.push([cx + (r() - 0.5) * spread * 2, cy + (r() - 0.5) * spread]);
  trees.sort((a, b) => a[1] - b[1]);
  return trees
    .map(
      ([x, y]) =>
        `<path d="M${n(x)} ${n(y + 7)} V${n(y + 2)}" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="${n(x)}" cy="${n(y)}" r="5.2" fill="#6f8a4a" stroke="${INK}" stroke-width="1.2"/>
        <path d="M${n(x - 2.5)} ${n(y - 1.5)} a3 3 0 0 1 3.5 -2" fill="none" stroke="#a9bd78" stroke-width="1.2"/>`,
    )
    .join('');
}

function fields(): string {
  return `<path d="M150 318 L196 300 L222 326 L178 344 Z" fill="#e6d38f" stroke="${INK}" stroke-width="1" opacity="0.9"/>
    <path d="M160 320 L200 305 M166 328 L206 312 M172 336 L212 320" stroke="#a88f45" stroke-width="1" stroke-dasharray="2 3"/>
    <path d="M226 300 L262 292 L276 318 L240 328 Z" fill="#c9d38f" stroke="${INK}" stroke-width="1" opacity="0.9"/>`;
}

function compass(x: number, y: number): string {
  const p = (a: number, r: number): string => `${n(x + Math.cos(a) * r)} ${n(y + Math.sin(a) * r)}`;
  let star = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 18 : 10;
    star += `<path d="M${x} ${y} L${p(a - 0.28, 4)} L${p(a, r)} Z" fill="${i % 2 === 0 ? INK : GOLD}"/>
      <path d="M${x} ${y} L${p(a + 0.28, 4)} L${p(a, r)} Z" fill="${i % 2 === 0 ? GOLD : '#fbf4e2'}" stroke="${INK}" stroke-width="0.6"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${INK}" stroke-width="0.8"/>${star}
    <text x="${x}" y="${y - 21}" text-anchor="middle" class="jm-n">북</text>`;
}

/** The beacon tower, unlit (cold stone, dark brazier) or lit (flame, glow, rays). */
export function beaconTower(x: number, y: number, lit: boolean, scale = 1): string {
  const s = scale;
  const glow = lit
    ? `<circle cx="${x}" cy="${y - 34 * s}" r="${46 * s}" fill="url(#jm-glow)" class="jm-beacon-glow"/>
       <g class="jm-rays" stroke="${GOLD_LIGHT}" stroke-width="${2 * s}" stroke-linecap="round" opacity="0.9">
         ${Array.from({ length: 10 }, (_, i) => {
           const a = (i / 10) * Math.PI * 2;
           const cy = y - 34 * s;
           return `<path d="M${n(x + Math.cos(a) * 16 * s)} ${n(cy + Math.sin(a) * 16 * s)} L${n(x + Math.cos(a) * 26 * s)} ${n(cy + Math.sin(a) * 26 * s)}"/>`;
         }).join('')}
       </g>`
    : '';
  const fire = lit
    ? `<path d="M${x} ${y - 46 * s} C${x + 4 * s} ${y - 38 * s} ${x + 9 * s} ${y - 36 * s} ${x + 6 * s} ${y - 29 * s} L${x - 6 * s} ${y - 29 * s} C${x - 9 * s} ${y - 36 * s} ${x - 3 * s} ${y - 38 * s} ${x} ${y - 46 * s} Z" fill="${EMBER}" stroke="${INK}" stroke-width="${1.2 * s}"/>
       <path d="M${x} ${y - 39 * s} C${x + 2 * s} ${y - 35 * s} ${x + 3 * s} ${y - 33 * s} ${x + 2 * s} ${y - 30 * s} L${x - 2 * s} ${y - 30 * s} C${x - 3 * s} ${y - 33 * s} ${x - 1 * s} ${y - 35 * s} ${x} ${y - 39 * s} Z" fill="${EMBER_HOT}"/>`
    : `<path d="M${x - 4 * s} ${y - 29 * s} q4 -5 8 0" fill="none" stroke="#6b625a" stroke-width="${1.4 * s}"/>`;
  const stone = lit ? '#cdbfa6' : '#a39c92';
  return `${glow}
    <path d="M${x - 9 * s} ${y} L${x - 7 * s} ${y - 24 * s} H${x + 7 * s} L${x + 9 * s} ${y} Z" fill="${stone}" stroke="${INK}" stroke-width="${1.5 * s}" stroke-linejoin="round"/>
    <path d="M${x - 8 * s} ${y - 8 * s} H${x + 8 * s} M${x - 7.5 * s} ${y - 16 * s} H${x + 7.5 * s}" stroke="${INK}" stroke-width="${0.8 * s}" opacity="0.6"/>
    <path d="M${x - 2.5 * s} ${y} V${y - 6 * s} Q${x} ${y - 9 * s} ${x + 2.5 * s} ${y - 6 * s} V${y} Z" fill="${INK}"/>
    <path d="M${x - 10 * s} ${y - 24 * s} H${x + 10 * s} V${y - 29 * s} H${x - 10 * s} Z" fill="${stone}" stroke="${INK}" stroke-width="${1.4 * s}"/>
    <path d="M${x - 10 * s} ${y - 29 * s} v-3 h4 v3 m4 0 v-3 h4 v3 m4 0 v-3 h4 v3" fill="none" stroke="${INK}" stroke-width="${1.2 * s}"/>
    ${fire}`;
}

/** The dwarf hold: a gate cut into the mountain, lit from within, with the race's banner. */
function dwarfHold(): string {
  const x = 250;
  const y = 200;
  const flag = crest('dwarf').map(layerSvg).join('');
  return `<g class="jm-hold">
    <path d="M${x - 22} ${y + 10} L${x - 14} ${y - 10} L${x + 14} ${y - 10} L${x + 22} ${y + 10} Z" fill="#8f7f6a" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M${x - 8} ${y + 10} V${y - 1} A8 8 0 0 1 ${x + 8} ${y - 1} V${y + 10} Z" fill="${EMBER}" stroke="${INK}" stroke-width="1.4"/>
    <path d="M${x - 5} ${y + 10} V${y} A5 5 0 0 1 ${x + 5} ${y} V${y + 10} Z" fill="${EMBER_HOT}"/>
    <path d="M${x - 14} ${y - 10} H${x + 14}" stroke="${GOLD}" stroke-width="2.2"/>
    <path d="M${x + 16} ${y - 9} V${y - 38}" stroke="${INK}" stroke-width="1.6"/>
    <path d="M${x + 16} ${y - 38} H${x + 34} V${y - 18} L${x + 25} ${y - 22} L${x + 16} ${y - 18} Z" fill="#8e2b1f" stroke="${INK}" stroke-width="1.3"/>
    <g transform="translate(${x + 18} ${y - 37}) scale(0.14)">${flag}</g>
    <text x="${x}" y="${y + 24}" text-anchor="middle" class="jm-label">드워프 산채</text>
  </g>`;
}

/** The party token: a small pennant on a pole with a lantern. */
function partyMarker(x: number, y: number): string {
  return `<g class="jm-party" transform="translate(${n(x)} ${n(y)})">
    <ellipse cx="0" cy="2" rx="9" ry="3" fill="${INK}" opacity="0.25"/>
    <path d="M0 2 V-30" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M0 -30 H17 L12 -24.5 L17 -19 H0 Z" fill="${GOLD}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="-5" cy="-12" r="4" fill="${EMBER_HOT}" stroke="${INK}" stroke-width="1.2"/>
    <path d="M-5 -16 V-19" stroke="${INK}" stroke-width="1.2"/>
  </g>`;
}

function stopMarker(i: number, reached: boolean, current: boolean): string {
  const s = ACT1_STOPS[i];
  if (!s) return '';
  const fill = reached ? GOLD : '#fbf4e2';
  return `<g class="jm-stop${current ? ' is-current' : ''}">
    <circle cx="${s.x}" cy="${s.y}" r="7.5" fill="${fill}" stroke="${INK}" stroke-width="1.8"/>
    <text x="${s.x}" y="${s.y + 3.4}" text-anchor="middle" class="jm-num">${i + 1}</text>
    <text x="${s.x + 11}" y="${s.y - 8}" class="jm-label">${s.name}</text>
  </g>`;
}

/** Fog over everything past the party's reach; it opens round reached stops and a lit beacon. */
function fog(state: JourneyState): string {
  const holes: string[] = [`<circle cx="44" cy="330" r="70" fill="url(#jm-hole)"/>`];
  const last = Math.min(state.reached, 3);
  for (let i = 0; i <= last; i++) {
    const s = ACT1_STOPS[i];
    if (s) holes.push(`<circle cx="${s.x}" cy="${s.y}" r="64" fill="url(#jm-hole)"/>`);
  }
  if (state.reached >= 4 || state.beaconLit) {
    holes.push('<rect x="0" y="0" width="300" height="360" fill="#000"/>');
  }
  if (state.rallied.includes('dwarf'))
    holes.push('<circle cx="252" cy="190" r="60" fill="url(#jm-hole)"/>');
  return `<mask id="jm-fog-mask"><rect x="0" y="0" width="300" height="360" fill="#fff"/>${holes.join('')}</mask>
    <g mask="url(#jm-fog-mask)" class="jm-fog">
      <rect x="0" y="0" width="300" height="360" fill="#3a2e28" opacity="0.62"/>
      <rect x="0" y="0" width="300" height="360" fill="#fff" filter="url(#jm-cloud)"/>
    </g>`;
}

/** The whole act 1 map as an SVG string. */
export function journeyMapSvg(state: JourneyState): string {
  const reached = Math.max(0, Math.min(4, state.reached));
  const at = ACT1_STOPS[Math.min(reached, ACT1_STOPS.length - 1)] ?? { x: 64, y: 300 };
  const stops = ACT1_STOPS.slice(0, 4)
    .map((_, i) => stopMarker(i, i < reached, i === reached))
    .join('');
  const tower = ACT1_STOPS[4] ?? { x: 236, y: 70 };
  // At the beacon the party waits at its foot rather than on top of the tower.
  const px = reached >= 4 ? at.x - 24 : at.x - 2;
  const py = reached >= 4 ? at.y + 16 : at.y - 6;
  const companion = state.companions.includes('dwarf') || state.rallied.includes('dwarf');
  return `<svg class="journey-map" viewBox="0 0 300 360" role="img" aria-label="1막 여정 지도">
    ${defs()}
    <g filter="url(#jm-rough)">
      <rect x="4" y="4" width="292" height="352" rx="6" fill="#f2e3c2"/>
    </g>
    <g clip-path="url(#jm-clip)">
    <g class="jm-land">
      ${sea()}
      ${fields()}
      ${hills()}
      ${river()}
      ${forest(96, 176, 16, 11, 26)}
      ${forest(190, 156, 9, 23, 18)}
      ${forest(60, 232, 6, 31, 12)}
      ${mountains()}
    </g>
    <path d="${ROAD}" fill="none" stroke="#fbf4e2" stroke-width="5" stroke-linecap="round"/>
    <path d="${ROAD}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linecap="round"/>
    ${stops}
    ${beaconTower(tower.x, tower.y + 8, state.beaconLit)}
    <text x="${tower.x - 6}" y="${tower.y + 22}" text-anchor="middle" class="jm-label jm-label-major">새벽 봉화대</text>
    ${state.rallied.includes('dwarf') ? dwarfHold() : ''}
    ${fog(state)}
    ${compass(262, 318)}
    ${partyMarker(px, py)}
    ${companion ? `<g class="jm-companion" transform="translate(${n(px - 28)} ${n(py - 24)}) scale(0.24)">${DWARF_FIGURE.map(layerSvg).join('')}</g>` : ''}
    </g>
    <rect x="4" y="4" width="292" height="352" rx="6" fill="#f2e3c2" filter="url(#jm-paper)" opacity="0.55" style="mix-blend-mode:multiply" pointer-events="none"/>
    <rect x="9" y="9" width="282" height="342" rx="4" fill="none" stroke="${GOLD}" stroke-width="2.5"/>
    <rect x="12.5" y="12.5" width="275" height="335" rx="3" fill="none" stroke="${INK}" stroke-width="1"/>
  </svg>`;
}

/** Caption under the map: where the party is and what is next. */
export function journeyCaption(state: JourneyState): string {
  if (state.beaconLit) return '새벽 봉화대에 불이 붙었어요 · 어둠이 물러갑니다';
  const next = ACT1_STOPS[Math.min(state.reached, 4)];
  return next ? `다음 목적지 · ${next.name}` : '';
}

/**
 * The journey sheet: title cartouche, the map, a caption and a continue
 * button. `moment` plays the join / rally celebration on the map.
 */
export function journeyScreen(
  state: JourneyState,
  onContinue: () => void,
  moment: JourneyMoment = null,
): HTMLElement {
  const wrap = el('div', 'sheet journey');
  const title = el('h2', 'sheet-title', '1막 · 갈대강 들판');
  const map = el('div', 'journey-frame');
  map.innerHTML = journeyMapSvg(state);
  wrap.append(title, map, el('p', 'journey-caption', journeyCaption(state)));
  if (moment) {
    map.classList.add(`is-moment-${moment.kind}`);
    map.append(momentOverlay(moment));
  }
  wrap.append(
    button('btn btn-primary', '계속', () => {
      onContinue();
    }),
  );
  return wrap;
}

const RACE_NAME: Readonly<Record<RaceId, string>> = {
  elf: '엘프',
  dwarf: '드워프',
  human: '인간',
  orc: '오크',
};

/** The celebration over the map: rays, the crest stamped down, a ribbon with the news. */
function momentOverlay(moment: NonNullable<JourneyMoment>): HTMLElement {
  const box = el('div', `journey-moment moment-${moment.kind}`);
  const text =
    moment.kind === 'rally'
      ? `${RACE_NAME[moment.race]} 결집!`
      : `${RACE_NAME[moment.race]} 동료 합류!`;
  const sub =
    moment.kind === 'rally'
      ? '산채의 문이 열리고 깃발이 올랐어요'
      : '도끼를 멘 길동무가 원정대에 들어왔어요';
  box.innerHTML = `<div class="jmo-rays" aria-hidden="true"></div>
    <div class="jmo-crest">${emblemSvg(crest(moment.race), 76)}</div>
    <div class="jmo-ribbon"><strong>${text}</strong><span>${sub}</span></div>`;
  box.setAttribute('role', 'status');
  return box;
}
