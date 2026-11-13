/**
 * Full-screen DOM overlays: main menu, relic offer, pause (with the owned
 * relic list) and the run summary. Each builder turns a `ScreenModel` into
 * fresh DOM; the game screen swaps them in and out.
 */
import type { RelicId, RunMode } from '../core';
import type { HudModel, OfferCard, Records, ScreenModel } from '../game/runView';
import { button, el, formatNumber } from './dom';

export interface ScreenHandlers {
  readonly onStart: (mode: RunMode) => void;
  readonly onChooseRelic: (id: RelicId | null) => void;
  readonly onResume: () => void;
  readonly onQuit: () => void;
  readonly onRetry: () => void;
}

function logo(): HTMLElement {
  const h = el('h1', 'logo', 'NEON');
  h.append(el('span', '', 'RIFT'));
  return h;
}

function records(r: Records): HTMLElement {
  const box = el('dl', 'records');
  const row = (label: string, value: string): void => {
    box.append(el('dt', '', label), el('dd', '', value));
  };
  row(
    '런 최고',
    r.runBestStages > 0 ? `${r.runBestStages}스테이지 · ${formatNumber(r.runBestScore)}점` : '—',
  );
  row(
    '무한 최고',
    r.endlessBestScore > 0
      ? `${formatNumber(r.endlessBestScore)}점 · ${r.endlessBestTile} 타일`
      : '—',
  );
  return box;
}

export function menuScreen(r: Records, h: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'sheet menu');
  const runBtn = button('mode-btn btn-primary', '', () => {
    h.onStart('run');
  });
  runBtn.append(
    el('strong', '', '런 모드'),
    el('span', '', '12 스테이지 · 보스 3 · 유물을 모아 균열을 닫으세요'),
  );
  const endlessBtn = button('mode-btn', '', () => {
    h.onStart('endless');
  });
  endlessBtn.append(
    el('strong', '', '무한 모드'),
    el('span', '', '막힐 때까지 · 큰 타일마다 유물'),
  );
  wrap.append(
    logo(),
    el('p', 'tagline', '합쳐서 균열을 닫는 로그라이크 퍼즐'),
    runBtn,
    endlessBtn,
    records(r),
    el('p', 'menu-help', '밀어서 같은 숫자를 합치세요 · 방향키/WASD · Esc 일시정지'),
  );
  return wrap;
}

function offerCard(card: OfferCard, h: ScreenHandlers): HTMLButtonElement {
  const b = button(`offer-card rarity-${card.rarity}`, '', () => {
    h.onChooseRelic(card.id);
  });
  const head = el('span', 'offer-head');
  head.append(el('strong', 'offer-name', card.name));
  if (card.active) head.append(el('span', 'tag tag-active', '사용'));
  head.append(el('span', 'tag', card.rarityLabel));
  b.append(head, el('span', 'offer-desc', card.description));
  return b;
}

export function offerScreen(
  model: Extract<ScreenModel, { kind: 'offer' }>,
  h: ScreenHandlers,
): HTMLElement {
  const wrap = el('div', 'sheet offer');
  const cards = el('div', 'offer-cards');
  cards.append(...model.cards.map((c) => offerCard(c, h)));
  wrap.append(
    el('h2', 'sheet-title', model.title),
    el('p', 'sheet-sub', model.subtitle),
    cards,
    button('btn btn-quiet', model.cards.length > 0 ? '건너뛰기' : '계속하기', () => {
      h.onChooseRelic(null);
    }),
  );
  return wrap;
}

function relicList(hud: HudModel | null): HTMLElement {
  const list = el('ul', 'relic-list');
  const relics = hud?.relics ?? [];
  if (relics.length === 0) list.append(el('li', 'relic-none', '아직 가진 유물이 없어요'));
  for (const r of relics) {
    const li = el('li', `rarity-${r.rarity}`);
    const head = el('span', 'relic-head');
    head.append(el('strong', '', r.name));
    if (r.active) head.append(el('span', 'tag tag-active', `사용 ${r.charges}/${r.maxCharges}`));
    li.append(head, el('span', 'relic-desc', r.description));
    list.append(li);
  }
  return list;
}

export function pauseScreen(hud: HudModel | null, h: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'sheet pause');
  const actions = el('div', 'sheet-actions');
  actions.append(
    button('btn btn-primary', '계속하기', () => {
      h.onResume();
    }),
    button('btn', '메뉴로', () => {
      h.onQuit();
    }),
  );
  const head = hud ? `${hud.stageLabel} · ${hud.goalText}` : '';
  wrap.append(
    el('h2', 'sheet-title', '일시정지'),
    el('p', 'sheet-sub', head),
    relicList(hud),
    actions,
  );
  return wrap;
}

export function resultScreen(
  model: Extract<ScreenModel, { kind: 'result' }>,
  h: ScreenHandlers,
): HTMLElement {
  const s = model.summary;
  const wrap = el('div', `sheet result result-${model.outcome}`);
  const stats = el('dl', 'records');
  const row = (label: string, value: string): void => {
    stats.append(el('dt', '', label), el('dd', '', value));
  };
  if (s.mode === 'run') {
    row('도달', `${s.reached} (${s.stagesCleared}/12 클리어)`);
  } else {
    row('최고 타일', s.reached);
    row('이동', String(s.moves));
  }
  row('점수', formatNumber(s.score));
  row('유물', s.relics.length > 0 ? s.relics.join(', ') : '없음');
  const actions = el('div', 'sheet-actions');
  actions.append(
    button('btn btn-primary', '다시 하기', () => {
      h.onRetry();
    }),
    button('btn', '메뉴로', () => {
      h.onQuit();
    }),
  );
  wrap.append(el('h2', 'sheet-title', model.title), el('p', 'sheet-sub', model.reason));
  if (model.newRecord) wrap.append(el('p', 'new-record', '새 최고 기록!'));
  wrap.append(stats, actions);
  return wrap;
}
