/**
 * The service worker. It is built as its own file (`sw.js`, see
 * tools/vite-precache.ts), which also replaces `__PRECACHE_MANIFEST__` with the
 * list of built files and a hash of their contents.
 *
 * Lifecycle:
 * - install: download every file of this build into a cache named after the hash.
 * - waiting: if an older version still controls an open page, this one waits;
 *   the page shows "새 버전이 있어요" and the player decides when to reload.
 * - activate: delete the caches of older versions, take control of open pages.
 * - fetch: answer precached files (and every page navigation) from the cache,
 *   falling back to the network; everything else goes straight to the network.
 */
import {
  cacheName,
  cachedPathFor,
  isSkipWaiting,
  staleCaches,
  type PrecacheManifest,
} from './cachePlan';

declare const __PRECACHE_MANIFEST__: PrecacheManifest;

// The page's TypeScript setup has the DOM library, not the worker one; these
// are the few worker types this file needs.
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface WorkerScope {
  readonly registration: { readonly scope: string };
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

const worker = self as unknown as WorkerScope;
const manifest = __PRECACHE_MANIFEST__;
const CACHE = cacheName(manifest.version);
const scope = new URL(worker.registration.scope);
const files = new Set(manifest.files);

worker.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // `reload` skips the HTTP cache, so a stale copy never lands in the new cache.
      cache.addAll(manifest.files.map((f) => new Request(new URL(f, scope), { cache: 'reload' }))),
    ),
  );
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(staleCaches(keys, CACHE).map((k) => caches.delete(k))))
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener('message', (event) => {
  if (isSkipWaiting(event.data)) void worker.skipWaiting();
});

worker.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const path = cachedPathFor(new URL(request.url), scope, files, request.mode === 'navigate');
  if (path === null) return;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(new URL(path, scope).href))
      .then((hit) => hit ?? fetch(request)),
  );
});
