import type { Direction } from '../core';

/**
 * Keyboard bindings by `KeyboardEvent.code` (physical key), not `key`: with a
 * Korean IME active, the W key reports `key === 'ㅈ'` but `code === 'KeyW'`.
 */
const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

export function directionForKey(code: string): Direction | null {
  return Object.hasOwn(KEY_DIRECTIONS, code) ? (KEY_DIRECTIONS[code] ?? null) : null;
}
