/** Tiny DOM helpers shared by the UI modules. Text always goes in via `textContent`. */

/** Finds `[data-ref="name"]` under `root` and checks its type. */
export function ref<T extends HTMLElement>(
  root: ParentNode,
  name: string,
  type: abstract new () => T,
): T {
  const el = root.querySelector(`[data-ref="${name}"]`);
  if (!(el instanceof type)) throw new Error(`ui: missing element ${name}`);
  return el;
}

/** Creates an element with a class list and optional text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A `<button type="button">` that calls `onClick`. */
export function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** Restarts a CSS animation by toggling its class (forces a reflow in between). */
export function replayClass(node: HTMLElement, className: string): void {
  node.classList.remove(className);
  // Reading layout forces a reflow, so the re-added class starts the animation again.
  node.getBoundingClientRect();
  node.classList.add(className);
}

const numberFormat = new Intl.NumberFormat('ko-KR');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}
