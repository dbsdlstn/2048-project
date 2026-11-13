/**
 * "새 버전이 있어요" prompt for the service worker update flow (src/pwa/register.ts).
 * It sits above everything at the top edge, never reloads by itself, and can be
 * put away until the next launch.
 */
import { button, el } from './dom';

export interface UpdateToast {
  show(): void;
  hide(): void;
}

export function createUpdateToast(parent: HTMLElement, onReload: () => void): UpdateToast {
  const box = el('div', 'update-toast');
  box.setAttribute('role', 'status');
  box.hidden = true;
  const later = button('btn btn-quiet btn-compact', '나중에', () => {
    box.hidden = true;
  });
  const reload = button('btn btn-primary btn-compact', '새로고침', () => {
    reload.disabled = true;
    onReload();
  });
  box.append(el('span', 'update-text', '새 버전이 있어요'), later, reload);
  parent.append(box);
  return {
    show: () => {
      box.hidden = false;
    },
    hide: () => {
      box.hidden = true;
    },
  };
}
