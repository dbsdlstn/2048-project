/**
 * In-game HUD (DOM): stage label, goal with progress bar, moves, score,
 * boss panel, active relic buttons and the relic tray with tooltips. It only
 * displays the `HudModel` it is given and reports button presses.
 */
import type { RelicId } from '../core';
import type { HudModel, RelicChip } from '../game/runView';
import { button, el, formatNumber, ref, replayClass } from './dom';

export interface HudHandlers {
  readonly onActivateRelic: (id: RelicId) => void;
  readonly onOpenRelics: () => void;
}

/** How long a relic tooltip stays up (ms). */
const TOOLTIP_MS = 3200;

export class Hud {
  private readonly stage: HTMLElement;
  private readonly score: HTMLElement;
  private readonly gains: HTMLElement;
  private readonly goalText: HTMLElement;
  private readonly goalCount: HTMLElement;
  private readonly goalBar: HTMLElement;
  private readonly goal: HTMLElement;
  private readonly moves: HTMLElement;
  private readonly movesLabel: HTMLElement;
  private readonly movesValue: HTMLElement;
  private readonly boss: HTMLElement;
  private readonly bossName: HTMLElement;
  private readonly bossCount: HTMLElement;
  private readonly bossPreview: HTMLElement;
  private readonly bossRule: HTMLElement;
  private readonly actives: HTMLElement;
  private readonly tray: HTMLElement;
  private readonly tooltip: HTMLElement;
  private readonly stuck: HTMLElement;
  private readonly trayAll: HTMLButtonElement;
  private relicKey = '';
  private readonly relicNodes = new Map<RelicId, HTMLElement>();
  private tooltipTimer: ReturnType<typeof setTimeout> | null = null;
  private tooltipFor: RelicId | null = null;

  constructor(
    root: HTMLElement,
    private readonly handlers: HudHandlers,
  ) {
    this.stage = ref(root, 'stage', HTMLElement);
    this.score = ref(root, 'score', HTMLElement);
    this.gains = ref(root, 'gains', HTMLElement);
    this.goal = ref(root, 'goal', HTMLElement);
    this.goalText = ref(root, 'goalText', HTMLElement);
    this.goalCount = ref(root, 'goalCount', HTMLElement);
    this.goalBar = ref(root, 'goalBar', HTMLElement);
    this.moves = ref(root, 'moves', HTMLElement);
    this.movesLabel = ref(root, 'movesLabel', HTMLElement);
    this.movesValue = ref(root, 'movesValue', HTMLElement);
    this.boss = ref(root, 'boss', HTMLElement);
    this.bossName = ref(root, 'bossName', HTMLElement);
    this.bossCount = ref(root, 'bossCount', HTMLElement);
    this.bossPreview = ref(root, 'bossPreview', HTMLElement);
    this.bossRule = ref(root, 'bossRule', HTMLElement);
    this.actives = ref(root, 'actives', HTMLElement);
    this.tray = ref(root, 'tray', HTMLElement);
    this.tooltip = ref(root, 'tooltip', HTMLElement);
    this.stuck = ref(root, 'stuck', HTMLElement);
    this.trayAll = ref(root, 'trayAll', HTMLButtonElement);
    this.trayAll.addEventListener('click', () => {
      handlers.onOpenRelics();
    });
    // Chips that do not fit wrap onto a hidden second line; the tray counts them.
    new ResizeObserver(() => {
      this.fitTray();
    }).observe(this.tray);
  }

  update(hud: HudModel): void {
    this.stage.textContent = hud.stageLabel;
    this.score.textContent = formatNumber(hud.score);
    this.goalText.textContent = hud.goalText;
    this.goalCount.textContent =
      hud.mode === 'run'
        ? `${formatNumber(hud.goalCurrent)} / ${formatNumber(hud.goalTarget)}`
        : `최고 ${formatNumber(hud.goalCurrent)}`;
    this.goalBar.style.transform = `scaleX(${Math.max(0, Math.min(1, hud.goalRatio))})`;
    this.goal.classList.toggle('done', hud.goalDone);
    this.movesLabel.textContent = hud.movesLabel;
    this.movesValue.textContent = String(hud.movesValue);
    this.moves.classList.toggle('warn', hud.movesWarn);

    const boss = hud.boss;
    this.boss.hidden = boss === null;
    if (boss) {
      this.bossName.textContent = boss.name;
      this.bossCount.textContent = String(boss.turnsUntil);
      this.boss.classList.toggle('imminent', boss.turnsUntil <= 1);
      this.bossPreview.textContent = boss.lockText ?? boss.preview;
      this.bossRule.textContent = boss.rule;
    }

    this.stuck.hidden = !hud.stuck;
    this.renderRelics(hud.relics);
  }

  scoreGained(amount: number): void {
    const pop = el('span', 'score-gain', `+${formatNumber(amount)}`);
    pop.addEventListener('animationend', () => {
      pop.remove();
    });
    this.gains.append(pop);
  }

  /** Flashes a relic's chip / button (a relic just did something). */
  pulseRelic(id: RelicId): void {
    const node = this.relicNodes.get(id);
    if (node) replayClass(node, 'pulse');
  }

  /** Marks the active relic currently picking a target. */
  setTargeting(id: RelicId | null): void {
    for (const [relic, node] of this.relicNodes) {
      node.classList.toggle('targeting', relic === id);
    }
  }

  hideTooltip(): void {
    this.tooltip.hidden = true;
    this.tooltipFor = null;
    if (this.tooltipTimer !== null) clearTimeout(this.tooltipTimer);
    this.tooltipTimer = null;
  }

  private showTooltip(chip: RelicChip): void {
    if (this.tooltipFor === chip.id) {
      this.hideTooltip();
      return;
    }
    this.tooltip.replaceChildren(
      el('strong', `rarity-${chip.rarity}`, chip.name),
      el('span', '', chip.description),
    );
    this.tooltip.hidden = false;
    this.tooltipFor = chip.id;
    if (this.tooltipTimer !== null) clearTimeout(this.tooltipTimer);
    this.tooltipTimer = setTimeout(() => {
      this.hideTooltip();
    }, TOOLTIP_MS);
  }

  /** Rebuilds relic buttons only when ownership, charges or usability changed. */
  private renderRelics(relics: readonly RelicChip[]): void {
    const key = relics.map((r) => `${r.id}:${r.charges}:${r.usable ? 1 : 0}`).join('|');
    if (key === this.relicKey) return;
    this.relicKey = key;
    this.relicNodes.clear();
    const actives: HTMLElement[] = [];
    const chips: HTMLElement[] = [];
    for (const r of relics) {
      if (r.active) {
        const b = button(`active-btn rarity-${r.rarity}`, '', () => {
          this.handlers.onActivateRelic(r.id);
        });
        b.disabled = !r.usable;
        b.title = `${r.name}: ${r.description}`;
        b.setAttribute('aria-label', `${r.name} 사용 (남은 횟수 ${r.charges})`);
        const pips = el('span', 'pips');
        for (let i = 0; i < r.maxCharges; i++) {
          pips.append(el('i', i < r.charges ? 'on' : ''));
        }
        b.append(el('span', 'active-name', r.name), pips);
        actives.push(b);
        this.relicNodes.set(r.id, b);
      } else {
        const chip = button(`relic-chip rarity-${r.rarity}`, r.short, () => {
          this.showTooltip(r);
        });
        chip.setAttribute('aria-label', `${r.name}: ${r.description}`);
        chips.push(chip);
        this.relicNodes.set(r.id, chip);
      }
    }
    this.actives.replaceChildren(...actives);
    this.actives.hidden = actives.length === 0;
    this.tray.replaceChildren(...chips);
    if (chips.length === 0) this.tray.append(el('span', 'tray-empty', '유물 없음'));
    this.fitTray();
  }

  /** Hides chips that wrapped past the first line and shows "+N" on the list button. */
  private fitTray(): void {
    const chips = [...this.tray.querySelectorAll<HTMLElement>('.relic-chip')];
    const top = chips[0]?.offsetTop ?? 0;
    let hidden = 0;
    for (const chip of chips) {
      const over = chip.offsetTop > top;
      chip.classList.toggle('is-overflow', over);
      if (over) hidden++;
    }
    this.trayAll.textContent = hidden > 0 ? `유물 +${hidden}` : '유물';
  }
}
