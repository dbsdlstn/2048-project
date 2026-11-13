/**
 * Pure decisions of the service worker (`sw.ts`): cache names, which old
 * caches to drop, and which cached file answers a request. Kept apart from the
 * worker's event wiring so they can be unit tested in Node.
 *
 * Only `sw.ts` may import this module: the worker must stay one self-contained
 * file, so it cannot share a chunk with the page (the build checks this).
 */

/** What the build hands the worker: a content hash and the files to keep offline. */
export interface PrecacheManifest {
  /** Changes whenever any precached file changes (it names the cache). */
  readonly version: string;
  /** Paths relative to the worker's scope, e.g. `index.html`, `assets/index-abc.js`. */
  readonly files: readonly string[];
}

const CACHE_PREFIX = 'neon-rift-';

/** The page asks a waiting worker to take over with this message (see `register.ts`). */
export const SKIP_WAITING = 'neon-rift:skip-waiting';

export function cacheName(version: string): string {
  return `${CACHE_PREFIX}${version}`;
}

/** Our caches from earlier versions. Caches of other apps on the same origin are left alone. */
export function staleCaches(keys: readonly string[], current: string): string[] {
  return keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== current);
}

/**
 * The precached file that answers a GET request, or null to let the network
 * handle it. Every page navigation inside the scope gets the app shell
 * (`index.html`): the game is one page, and `?seed=` / `?debug` are read by
 * the script, so they must not miss the cache.
 */
export function cachedPathFor(
  url: URL,
  scope: URL,
  files: ReadonlySet<string>,
  navigate: boolean,
): string | null {
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return null;
  const path = url.pathname.slice(scope.pathname.length);
  if (navigate || path === '') return files.has('index.html') ? 'index.html' : null;
  return files.has(path) ? path : null;
}

export function isSkipWaiting(data: unknown): boolean {
  return data === SKIP_WAITING;
}
