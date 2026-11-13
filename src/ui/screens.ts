/**
 * Full-screen DOM overlays: main menu, help, settings, the "discard saved
 * game?" question, relic offer, pause (with the owned relic list) and the run
 * summary. Each builder turns a `ScreenModel` into fresh DOM; the game screen
 * swaps them in and out.
 */
import type { RelicId } from '../core';
import type { HudModel, OfferCard, Records, ScreenModel } from '../game/runView';
import type { RunSlot, Settings } from '../save/store';
import { button, el, formatNumber } from './dom';

export interface ScreenHandlers {
  /** "New game" for a slot (the controller asks first if that discards a save). */
  readonly onNew: (slot: RunSlot) => void;
  readonly onContinue: (slot: RunSlot) => void;
  readonly onConfirmNew: () => void;
  /** Closes help / settings / the confirmation. */
  readonly onCloseSheet: () => void;
  readonly onOpenHelp: () => void;
  readonly onOpenSettings: () => void;
  readonly onSetting: (key: keyof Settings, value: boolean) => void;
  readonly onResetHints: () => void;
  readonly onChooseRelic: (id: RelicId | null) => void;
  readonly onResume: () => void;
  readonly onQuit: () => void;
  readonly onRetry: () => void;
}

type Model<K extends ScreenModel['kind']> = Extract<ScreenModel, { kind: K }>;

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

/**
 * One mode on the menu: a big button that starts it, or, with a saved game,
 * a big "이어하기" button plus a small "새로" one.
 */
function modeCard(
  slot: RunSlot,
  name: string,
  blurb: string,
  saved: string | null,
  primary: boolean,
  h: ScreenHandlers,
): HTMLElement {
  const card = el('div', 'mode-card');
  card.dataset.slot = slot;
  const main = button(`mode-btn${primary ? ' btn-primary' : ''}`, '', () => {
    if (saved !== null) h.onContinue(slot);
    else h.onNew(slot);
  });
  main.append(
    el('strong', '', saved !== null ? `이어하기 · ${name}` : name),
    el('span', '', saved ?? blurb),
  );
  card.append(main);
  if (saved !== null) {
    const fresh = button('btn btn-quiet mode-new', '새로', () => {
      h.onNew(slot);
    });
    fresh.setAttribute('aria-label', `${name} 새로 시작`);
    card.append(fresh);
  }
  return card;
}

export function menuScreen(model: Model<'menu'>, h: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'sheet menu');
  const saved = (slot: RunSlot): string | null =>
    model.continues.find((c) => c.slot === slot)?.label ?? null;
  const d = model.daily;
  const dailyBlurb = d.best ? `오늘 최고 ${d.best}` : '오늘의 시드로 모두가 같은 런';
  const tools = el('div', 'menu-tools');
  tools.append(
    button('btn btn-quiet', '게임 방법', () => {
      h.onOpenHelp();
    }),
    button('btn btn-quiet', '설정', () => {
      h.onOpenSettings();
    }),
  );
  wrap.append(
    logo(),
    el('p', 'tagline', '합쳐서 균열을 닫는 로그라이크 퍼즐'),
    modeCard(
      'run',
      '런 모드',
      '12 스테이지 · 보스 3 · 유물을 모아 균열을 닫으세요',
      saved('run'),
      true,
      h,
    ),
    modeCard('daily', `오늘의 도전 · ${d.label}`, dailyBlurb, saved('daily'), false, h),
    modeCard('endless', '무한 모드', '막힐 때까지 · 큰 타일마다 유물', saved('endless'), false, h),
    records(model.records),
    tools,
    el('p', 'menu-help', '방향키/WASD로도 움직여요 · Esc 일시정지'),
  );
  return wrap;
}

export function helpScreen(model: Model<'help'>, h: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'sheet help');
  wrap.append(el('h2', 'sheet-title', '게임 방법'));
  for (const section of model.sections) {
    const box = el('section', 'help-section');
    const list = el('dl', 'help-list');
    for (const item of section.items) list.append(el('dt', '', item.name), el('dd', '', item.text));
    box.append(el('h3', '', section.title), list);
    wrap.append(box);
  }
  wrap.append(
    button('btn btn-primary', '닫기', () => {
      h.onCloseSheet();
    }),
  );
  return wrap;
}

function toggle(
  label: string,
  key: keyof Settings,
  value: boolean,
  h: ScreenHandlers,
): HTMLButtonElement {
  const b = button('toggle', '', () => {
    h.onSetting(key, !value);
  });
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', String(value));
  b.append(el('span', 'toggle-label', label), el('span', 'toggle-state', value ? '켬' : '끔'));
  return b;
}

export function settingsScreen(model: Model<'settings'>, h: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'sheet settings');
  const reset = button(
    'btn',
    model.hintsReset ? '도움말을 다시 보여 줄게요' : '도움말 다시 보기',
    () => {
      h.onResetHints();
    },
  );
  reset.disabled = model.hintsReset;
  wrap.append(
    el('h2', 'sheet-title', '설정'),
    toggle('효과음', 'sound', model.settings.sound, h),
    toggle('진동', 'haptics', model.settings.haptics, h),
    el('p', 'sheet-note', '효과음과 진동은 다음 업데이트에서 들어와요'),
    reset,
  );
  if (!model.storageOk) {
    wrap.append(
      el('p', 'sheet-warn', '이 브라우저에서는 저장이 안 돼요. 닫으면 기록과 진행이 사라져요'),
    );
  }
  wrap.append(
    button('btn btn-primary', '닫기', () => {
      h.onCloseSheet();
    }),
  );
  return wrap;
}

export function confirmScreen(model: Model<'confirm'>, h: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'sheet confirm');
  const actions = el('div', 'sheet-actions');
  actions.append(
    button('btn btn-danger', '새로 시작', () => {
      h.onConfirmNew();
    }),
    button('btn', '취소', () => {
      h.onCloseSheet();
    }),
  );
  wrap.append(el('h2', 'sheet-title', model.title), el('p', 'sheet-sub', model.text), actions);
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

export function offerScreen(model: Model<'offer'>, h: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'sheet offer');
  const cards = el('div', 'offer-cards');
  cards.append(...model.cards.map((c) => offerCard(c, h)));
  wrap.append(el('h2', 'sheet-title', model.title), el('p', 'sheet-sub', model.subtitle));
  if (model.tip) wrap.append(el('p', 'sheet-tip', model.tip));
  wrap.append(
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
  const tools = el('div', 'sheet-actions');
  tools.append(
    button('btn btn-quiet', '게임 방법', () => {
      h.onOpenHelp();
    }),
    button('btn btn-quiet', '설정', () => {
      h.onOpenSettings();
    }),
  );
  const head = hud ? `${hud.stageLabel} · ${hud.goalText}` : '';
  wrap.append(
    el('h2', 'sheet-title', '일시정지'),
    el('p', 'sheet-sub', head),
    relicList(hud),
    actions,
    tools,
    el('p', 'sheet-note', '메뉴로 나가도 진행은 저장돼요'),
  );
  return wrap;
}

export function resultScreen(model: Model<'result'>, h: ScreenHandlers): HTMLElement {
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
  if (model.record) wrap.append(el('p', 'new-record', model.record));
  wrap.append(stats, actions);
  return wrap;
}
