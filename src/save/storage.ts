/**
 * The storage the save module writes to, as a small interface (the part of
 * the Web Storage API we use). Tests inject `MemoryStorage`; the browser gets
 * `browserStorage()`, which never throws even where `localStorage` itself is
 * unavailable (private mode, blocked cookies, sandboxed iframes).
 */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  /** May throw (quota exceeded, storage disabled); callers must catch. */
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** An in-memory storage: tests, and the fallback when the browser has none. */
export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  get size(): number {
    return this.data.size;
  }

  keys(): string[] {
    return [...this.data.keys()];
  }
}

/**
 * `window.localStorage` if it can be read and written, else a memory storage
 * (the game still works; nothing survives a reload). Even reading the
 * `localStorage` property throws a SecurityError in some browsers.
 */
export function browserStorage(): { storage: KeyValueStorage; persistent: boolean } {
  try {
    const storage = window.localStorage;
    const probe = '__neon-rift-probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return { storage, persistent: true };
  } catch {
    return { storage: new MemoryStorage(), persistent: false };
  }
}
