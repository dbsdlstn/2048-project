/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SKIP_WAITING,
  cacheName,
  cachedPathFor,
  isSkipWaiting,
  staleCaches,
} from '../src/pwa/cachePlan';
import {
  SKIP_WAITING_MESSAGE,
  UPDATE_CHECK_INTERVAL,
  UpdateFlow,
  type ContainerLike,
  type RegistrationLike,
  type WorkerLike,
} from '../src/pwa/register';

describe('service worker cache plan', () => {
  const scope = new URL('https://example.test/2048-project/');
  const files = new Set(['index.html', 'assets/index-abc.js', 'icons/icon-192.png']);
  const at = (path: string): URL => new URL(path, 'https://example.test');

  it('names caches by version and drops only our older ones', () => {
    const current = cacheName('v2');
    expect(staleCaches([cacheName('v1'), current, 'other-app'], current)).toEqual([
      cacheName('v1'),
    ]);
  });

  it('serves precached files and leaves everything else to the network', () => {
    expect(cachedPathFor(at('/2048-project/assets/index-abc.js'), scope, files, false)).toBe(
      'assets/index-abc.js',
    );
    expect(cachedPathFor(at('/2048-project/assets/unknown.js'), scope, files, false)).toBeNull();
    expect(cachedPathFor(at('/elsewhere/index.html'), scope, files, false)).toBeNull();
    expect(
      cachedPathFor(new URL('https://cdn.test/2048-project/index.html'), scope, files, false),
    ).toBeNull();
  });

  it('answers every navigation in scope with the app shell, query strings included', () => {
    expect(cachedPathFor(at('/2048-project/'), scope, files, true)).toBe('index.html');
    expect(cachedPathFor(at('/2048-project/?debug&seed=7'), scope, files, true)).toBe('index.html');
    expect(cachedPathFor(at('/2048-project/'), scope, files, false)).toBe('index.html');
  });

  it('page and worker agree on the skip-waiting message', () => {
    expect(SKIP_WAITING_MESSAGE).toBe(SKIP_WAITING);
    expect(isSkipWaiting(SKIP_WAITING_MESSAGE)).toBe(true);
    expect(isSkipWaiting({ type: 'SKIP_WAITING' })).toBe(false);
  });
});

// ---------------------------------------------------------------- update flow fakes

class FakeWorker implements WorkerLike {
  state = 'installing';
  readonly messages: unknown[] = [];
  private readonly listeners: (() => void)[] = [];
  postMessage(message: unknown): void {
    this.messages.push(message);
  }
  addEventListener(_type: 'statechange', listener: () => void): void {
    this.listeners.push(listener);
  }
  setState(state: string): void {
    this.state = state;
    for (const l of this.listeners) l();
  }
}

class FakeRegistration implements RegistrationLike {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
  updates = 0;
  private readonly listeners: (() => void)[] = [];
  addEventListener(_type: 'updatefound', listener: () => void): void {
    this.listeners.push(listener);
  }
  update(): Promise<unknown> {
    this.updates++;
    return Promise.resolve();
  }
  /** A new version starts installing, then finishes. */
  deliver(): FakeWorker {
    const next = new FakeWorker();
    this.installing = next;
    for (const l of this.listeners) l();
    this.installing = null;
    this.waiting = next;
    next.setState('installed');
    return next;
  }
}

class FakeContainer implements ContainerLike {
  readonly reg = new FakeRegistration();
  private readonly listeners: (() => void)[] = [];
  constructor(public controller: object | null) {}
  register(): Promise<RegistrationLike> {
    return Promise.resolve(this.reg);
  }
  addEventListener(_type: 'controllerchange', listener: () => void): void {
    this.listeners.push(listener);
  }
  takeOver(): void {
    this.controller = {};
    for (const l of this.listeners) l();
  }
}

function setup(controller: object | null) {
  const container = new FakeContainer(controller);
  const log = { ready: 0, reloads: 0 };
  let time = 0;
  const flow = new UpdateFlow({
    container,
    url: '/2048-project/sw.js',
    scope: '/2048-project/',
    onUpdateReady: () => log.ready++,
    reload: () => log.reloads++,
    now: () => time,
  });
  const advance = (ms: number): void => {
    time += ms;
  };
  return { container, flow, log, advance };
}

describe('update flow', () => {
  it('the first install is not an update and never reloads the page', async () => {
    const { container, flow, log } = setup(null);
    await flow.start();
    container.reg.deliver();
    container.takeOver(); // clients.claim() on first activation
    expect(log).toEqual({ ready: 0, reloads: 0 });
  });

  it('a new version waits for the player, then takes over and reloads once', async () => {
    const { container, flow, log } = setup({});
    await flow.start();
    const next = container.reg.deliver();
    expect(log.ready).toBe(1);
    expect(log.reloads).toBe(0);
    flow.apply();
    expect(next.messages).toEqual([SKIP_WAITING_MESSAGE]);
    expect(log.reloads).toBe(0); // not until the new worker controls the page
    container.takeOver();
    expect(log.reloads).toBe(1);
  });

  it('a version that installed while the game was closed is offered at start', async () => {
    const { container, flow, log } = setup({});
    container.reg.waiting = new FakeWorker();
    await flow.start();
    expect(log.ready).toBe(1);
  });

  it('checks for updates at most once per interval', async () => {
    const { container, flow, advance } = setup({});
    await flow.start();
    flow.checkForUpdate();
    expect(container.reg.updates).toBe(0);
    advance(UPDATE_CHECK_INTERVAL);
    flow.checkForUpdate();
    flow.checkForUpdate();
    expect(container.reg.updates).toBe(1);
  });
});

describe('web app manifest', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
    start_url: string;
    scope: string;
    display: string;
    lang: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };

  it('is installable from the project path and stays inside it', () => {
    const base = new URL('https://dbsdlstn.github.io/2048-project/manifest.webmanifest');
    expect(new URL(manifest.start_url, base).pathname).toBe('/2048-project/');
    expect(new URL(manifest.scope, base).pathname).toBe('/2048-project/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('ko');
  });

  it('lists icons that exist, including a maskable one', () => {
    for (const icon of manifest.icons) expect(existsSync(`public/${icon.src}`)).toBe(true);
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    expect(manifest.icons.map((i) => i.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
  });
});
