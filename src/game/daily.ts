/**
 * 오늘의 도전 (daily challenge): a run-mode run whose seed comes from the local
 * date, so everyone who plays on the same day gets the same stage boards and
 * the same first relic offer, with no server. Later offers depend on what was
 * picked (owned relics are never offered again), and boards diverge with the
 * player's moves.
 *
 * The date is passed in (`today()` in the controller is injected), so tests
 * pin it. Results are stored per date by the save module.
 */
import { hashSeed } from '../core';

/** `YYYY-MM-DD` of `date` in the device's local time zone. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The run seed of a day's challenge. */
export function dailySeed(dateKey: string): number {
  return hashSeed(`daily-${dateKey}`);
}

/** "11월 13일" for the menu. */
export function dailyLabel(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return m && d ? `${m}월 ${d}일` : dateKey;
}
