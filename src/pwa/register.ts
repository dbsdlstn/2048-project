/**
 * Registers the service worker and runs the update flow:
 *
 *   new build deployed → browser finds a changed sw.js → new worker installs
 *   and waits → `onUpdateReady` (the page shows a small prompt) → the player
 *   taps it → `apply()` tells the waiting worker to take over → the page
 *   reloads once the new worker controls it.
 *
 * The page never reloads on its own: a run in progress is saved after every
 * move anyway, but the player decides when to switch versions.
 *
 * The browser objects are passed in through small interfaces, so the flow is
 * tested with fakes (tests/pwa.test.ts).
 */

/** Must match `SKIP_WAITING` in cachePlan.ts (a test checks it; the worker cannot share a module with the page). */
export const SKIP_WAITING_MESSAGE = 'neon-rift:skip-waiting';

/** At most one update check per this long when the page comes back into view. */
export const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

export interface WorkerLike {
  readonly state: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
}

export interface RegistrationLike {
  readonly installing: WorkerLike | null;
  readonly waiting: WorkerLike | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
  update(): Promise<unknown>;
}

export interface ContainerLike {
  /** The worker controlling this page (null on the very first visit). */
  readonly controller: object | null;
  register(url: string, options: { scope: string }): Promise<RegistrationLike>;
  addEventListener(type: 'controllerchange', listener: () => void): void;
}

export interface UpdateFlowOptions {
  readonly container: ContainerLike;
  readonly url: string;
  readonly scope: string;
  /** A new version is installed and waiting: show the prompt. */
  readonly onUpdateReady: () => void;
  readonly reload: () => void;
  readonly now: () => number;
  readonly onError?: (error: unknown) => void;
}

export class UpdateFlow {
  private registration: RegistrationLike | null = null;
  private applying = false;
  private lastCheck: number;

  constructor(private readonly options: UpdateFlowOptions) {
    this.lastCheck = options.now();
  }

  async start(): Promise<void> {
    const { container } = this.options;
    container.addEventListener('controllerchange', () => {
      // The first install also takes control (clients.claim): only reload when asked to.
      if (this.applying) this.options.reload();
    });
    try {
      const reg = await container.register(this.options.url, { scope: this.options.scope });
      this.registration = reg;
      // A version that finished installing while no page was open is already waiting.
      if (reg.waiting && container.controller) this.options.onUpdateReady();
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          // Without a controller this is the first install, not an update.
          if (next.state === 'installed' && container.controller) this.options.onUpdateReady();
        });
      });
    } catch (error) {
      this.options.onError?.(error);
    }
  }

  /** The player accepted the update: hand over to the waiting worker (the page reloads after). */
  apply(): void {
    const waiting = this.registration?.waiting;
    if (!waiting) {
      this.options.reload();
      return;
    }
    this.applying = true;
    waiting.postMessage(SKIP_WAITING_MESSAGE);
  }

  /** Asks the browser to look for a new sw.js, at most once per `UPDATE_CHECK_INTERVAL`. */
  checkForUpdate(): void {
    const reg = this.registration;
    const now = this.options.now();
    if (!reg || now - this.lastCheck < UPDATE_CHECK_INTERVAL) return;
    this.lastCheck = now;
    reg.update().catch((error: unknown) => this.options.onError?.(error));
  }
}
