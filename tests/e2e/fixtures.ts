/**
 * Shared Playwright fixtures. Every spec under `tests/e2e/` must import `test` and `expect` from
 * here. Three layers enforce it: `helpers/guard-reporter.ts` fails the run when any executed test did
 * not run the guards (runtime, primary), ESLint `no-restricted-imports` for `tests/e2e/**`, and the
 * `*.spec.ts`-only `testMatch` in `playwright.config.ts`.
 *
 * The guards come in two halves. `harnessWorkerGuards` is a **worker-scoped** automatic fixture: it
 * patches `browser.newContext` for the whole worker (so `browser.newPage()` too, whatever function
 * calls it) and holds the collectors. `harnessGuards` is the **test-scoped** automatic fixture that
 * needs `testInfo`: it guards the `context` fixture, applies this test's opt-outs and reports.
 * Because the patch lives at worker scope it is installed before `test.beforeAll` runs, so a context
 * a hook creates is guarded like any other. What a `test.beforeAll` hook produced is drained at the
 * **setup** of the next test, before that test's opt-outs exist, so it is attributed to the hook and
 * no opt-out can excuse it; what `test.afterAll` produced fails the worker. `beforeEach`/`afterEach`
 * are different: they run inside the test's own scope, so what they produce is that test's, drained
 * at its teardown and filtered by its opt-outs. `browser.on('context')` additionally
 * records every context the browser ever reports, so a context that reaches none of those paths is
 * listed even after it was closed.
 * - Console errors, uncaught page errors (`weberror`) and CSP violations fail the test.
 * - Every request to an origin other than the preview server fails the test. Requests are observed
 *   with the context `request` event, which fires even when a spec's own `page.route` handler
 *   continues or fulfils the request; a context route also aborts them. WebSockets to other origins
 *   are closed and reported. `data:` and `blob:` are allowed. The context's `APIRequestContext`
 *   (`context.request`, and `page.request`, which is the same object) is wrapped, so it cannot reach
 *   another origin either; Playwright's own `request` fixture is replaced by one that fails.
 * - Before the guards evaluate, a bounded settle step (`SETTLE_CAP_MS`, 3 s per test) waits for
 *   `load`, `networkidle` and pending `setTimeout` callbacks of up to 3 s on every open page, so
 *   errors from deferred work and work that ends after the test body are caught.
 * - Removing the guard listeners (`removeAllListeners`, `off`) fails the test.
 *
 * Opt-outs are per test only, declared in the test's own details, with a reason:
 *
 *     test('x', { annotation: allowConsoleError('/favicon/', 'Reason of at least 20 characters') }, ...)
 *     test('y', { annotation: allowOtherOrigin('https://example.org/', 'Reason ...') }, ...)
 *
 * `test.describe` annotations, annotations pushed at run time (hooks or body), empty patterns and
 * short reasons fail the test and the run (see `helpers/guard-policy.ts`).
 *
 * On-demand fixtures:
 * - `consoleErrors` / `sameOriginGuard`: what the guards collected so far.
 * - `seedStorage(entries)`: writes `st.*` localStorage keys before any page script runs. Each call
 *   seeds once per browser context, so later changes by the app survive reloads.
 * - `setTheme(theme)`: seeds `st.theme`, emulates `prefers-color-scheme` and sets `data-theme` on
 *   `<html>` as soon as it exists (the site's own theme script can still override it later).
 * - `basePath`: the path part of `use.baseURL`, for example `/business-toolkit/`.
 */
import { randomUUID } from 'node:crypto';
import {
  expect,
  test as base,
  type Browser,
  type BrowserContext,
  type ConsoleMessage,
  type Frame,
  type Page,
  type Request,
  type WebError,
  type WebSocket,
} from '@playwright/test';
import {
  ALLOW_CONSOLE_ERROR,
  ALLOW_OTHER_ORIGIN,
  apiRequestUrl,
  classifyOptOuts,
  createBlockedRequests,
  GUARD_ANNOTATION,
  GUARD_FAILURE_MARKER,
  GUARD_NAMES,
  isSameOrigin,
  optedOut,
  SETTLE_CAP_MS,
  strayContextUrls,
  unguardedContextProblem,
  type OptOut,
} from './helpers/guard-policy';
import { previewOrigin } from './helpers/preview-url';
import { pageSetupTimeout } from './helpers/timeouts';

export { expect };
export {
  ALLOW_CONSOLE_ERROR,
  ALLOW_OTHER_ORIGIN,
  allowConsoleError,
  allowOtherOrigin,
} from './helpers/guard-policy';

export type Theme = 'light' | 'dark';
export type StorageValue = string | number | boolean | null | Record<string, unknown> | unknown[];

export interface SameOriginGuard {
  /**
   * Requests seen so far, as `METHOD url (resourceType)` or `WEBSOCKET url`. Identical requests
   * share one entry, which then carries `(×N)`, so the list counts distinct requests.
   */
  readonly blocked: readonly string[];
}

interface HarnessGuards {
  readonly errors: readonly string[];
  readonly blocked: readonly string[];
}

/** What one drain of the worker collectors found. */
interface GuardHarvest {
  errors: string[];
  blocked: string[];
  /** One entry per context the guards never saw, cumulative and reported once. */
  unguarded: string[];
  /** Event names whose guard listener a spec removed. */
  removed: string[];
  /** Problems with the harness itself, for example a Playwright API the guards rely on. */
  harness: string[];
}

interface WorkerGuards {
  /** Install every guard on a context. Calling it twice on the same context does nothing. */
  guard: (target: BrowserContext) => Promise<void>;
  /** Pages of every guarded context that is still open, for the settle step. */
  openPages: () => Page[];
  /** Other-origin traffic this test opted into. The test fixture sets and resets it. */
  setAllowOrigin: (allow: (url: string) => boolean) => void;
  /** `javaScriptEnabled` of the current test, so the worker teardown settles the same way. */
  setScriptsEnabled: (value: boolean) => void;
  /** The preview origin the worker guards against, so the test fixture can compare it to baseURL. */
  readonly origin: string;
  /** Live view for the `consoleErrors` / `sameOriginGuard` fixtures. */
  readonly errors: readonly string[];
  readonly blocked: readonly string[];
  /** Everything collected since the last call, clearing it. */
  take: () => GuardHarvest;
}

interface Fixtures {
  basePath: string;
  harnessGuards: HarnessGuards;
  consoleErrors: readonly string[];
  sameOriginGuard: SameOriginGuard;
  seedStorage: (entries: Record<string, StorageValue>) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

interface WorkerFixtures {
  harnessWorkerGuards: WorkerGuards;
}

/** Methods of `APIRequestContext` that send a request. */
const API_REQUEST_METHODS = ['fetch', 'get', 'post', 'put', 'patch', 'delete', 'head'] as const;

const CSP_BINDING = '__stReportCspViolation';
const SETTLE_KEY = '__stSettle';

/** Page init script: report CSP violations and count pending short `setTimeout` callbacks. */
function pageInitScript({
  binding,
  settleKey,
  cap,
}: {
  binding: string;
  settleKey: string;
  cap: number;
}): void {
  const w = window as unknown as Record<string, unknown>;
  if (w[settleKey]) return;
  document.addEventListener('securitypolicyviolation', (event) => {
    const report = w[binding] as ((detail: string) => void) | undefined;
    report?.(
      `${event.effectiveDirective} blocked ${event.blockedURI || 'inline code'} ` +
        `(${event.sourceFile || document.URL}:${event.lineNumber})`,
    );
  });
  const pending = new Set<number>();
  const nativeSet = window.setTimeout.bind(window);
  const nativeClear = window.clearTimeout.bind(window);
  const tracked = (handler: TimerHandler, delay?: number, ...args: unknown[]): number => {
    if (typeof handler !== 'function' || Number(delay ?? 0) > cap) {
      return nativeSet(handler, delay, ...args);
    }
    const id: number = nativeSet(
      (...callArgs: unknown[]) => {
        pending.delete(id);
        (handler as (...a: unknown[]) => void)(...callArgs);
      },
      delay,
      ...args,
    );
    pending.add(id);
    return id;
  };
  window.setTimeout = tracked as typeof window.setTimeout;
  window.clearTimeout = ((id?: number) => {
    if (id !== undefined) pending.delete(id);
    nativeClear(id);
  }) as typeof window.clearTimeout;
  Object.defineProperty(w, settleKey, {
    value: {
      pending: () => pending.size,
      wait: (ms: number) => new Promise((r) => nativeSet(r, ms)),
    },
  });
}

async function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    promise.catch(() => undefined),
    new Promise((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  clearTimeout(timer);
}

/** Bounded settle: `load`, `networkidle`, then pending short timers, for all pages together. */
async function settle(pages: readonly Page[], scriptsEnabled: boolean): Promise<void> {
  const deadline = Date.now() + SETTLE_CAP_MS;
  const left = (): number => deadline - Date.now();
  for (const page of pages) {
    if (page.isClosed() || page.url() === 'about:blank') continue;
    for (const state of ['load', 'networkidle'] as const) {
      if (left() <= 0) return;
      await page.waitForLoadState(state, { timeout: left() }).catch(() => undefined);
    }
    if (!scriptsEnabled || left() <= 0) continue;
    await withTimeout(
      page.evaluate(
        async ({ key, budget }) => {
          const tracker = (window as unknown as Record<string, unknown>)[key] as
            { pending: () => number; wait: (ms: number) => Promise<void> } | undefined;
          if (!tracker) return;
          const end = performance.now() + budget;
          while (tracker.pending() > 0 && performance.now() < end) await tracker.wait(20);
          await tracker.wait(0);
        },
        { key: SETTLE_KEY, budget: left() },
      ),
      left() + 500,
    );
  }
}

type Listening = { listeners?: (event: string) => unknown[] };

/** Anything the guards attach a listener to. The browser carries the second net's `context` one. */
type GuardTarget = Browser | BrowserContext | Page;

interface GuardListener {
  target: GuardTarget;
  event: string;
  fn: (...args: never[]) => void;
}

/** Between tests, and while `test.beforeAll` runs, no other origin is allowed. */
const DENY_OTHER_ORIGINS = (): boolean => false;

/**
 * The guard problems in one harvest, as readable blocks. Shared by the test-scoped teardown (which
 * applies the test's opt-outs) and the two hook-scoped drains — the test-scoped setup and the worker
 * teardown — which pass none, because a hook is not a test and cannot borrow a test's opt-outs.
 */
function guardProblems(
  harvest: GuardHarvest,
  accepted: readonly OptOut[],
  origin: string,
  extra: readonly string[] = [],
): string[] {
  const problems: string[] = [];
  const stray = unguardedContextProblem(harvest.unguarded);
  if (stray) problems.push(stray);
  problems.push(...harvest.harness);
  if (harvest.removed.length > 0) {
    problems.push(
      `Guard listener(s) were removed (${harvest.removed.join(', ')}). ` +
        'Specs must not call removeAllListeners/off on a page or context.',
    );
  }
  problems.push(...extra);
  const unexpected = harvest.errors.filter((m) => !optedOut(accepted, ALLOW_CONSOLE_ERROR, m));
  if (unexpected.length > 0) {
    problems.push(
      `${unexpected.length} unexpected console error(s), page error(s) or CSP violation(s):\n` +
        unexpected.map((m) => `  - ${m}`).join('\n') +
        `\nIf one is expected, declare allowConsoleError(match, reason) on the test (tests/e2e/fixtures.ts).`,
    );
  }
  if (harvest.blocked.length > 0) {
    problems.push(
      `${harvest.blocked.length} distinct request(s) left the preview origin ${origin} (only same-origin, data: and blob: are allowed):\n` +
        harvest.blocked.map((entry) => `  - ${entry}`).join('\n') +
        `\nIf one is intended, declare allowOtherOrigin(match, reason) on the test (tests/e2e/fixtures.ts).`,
    );
  }
  return problems;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  basePath: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('use.baseURL is not set in playwright.config.ts');
    await use(new URL(baseURL).pathname);
  },

  /**
   * Worker half of the guards. It exists so that the `browser.newContext` patch (and with it
   * `browser.newPage()`, which calls it) is installed **before** `test.beforeAll` runs, whatever
   * function makes the call: a review found that a test-scoped patch plus an ESLint rule left a page
   * opened in a hook, or through a one-line helper, completely unguarded (WP-22a pass 4, M1).
   *
   * It only collects. Deciding what counts as a problem needs `testInfo` (the per-test opt-outs), so
   * that stays in the test-scoped `harnessGuards` fixture, which drains this one at every setup and
   * every teardown: the setup drain carries what a hook produced, with no opt-outs applied.
   */
  harnessWorkerGuards: [
    async ({ browser }, use) => {
      const origin = previewOrigin();
      const errors: string[] = [];
      /** Off-origin traffic since the last drain, counted once per request (see guard-policy). */
      const blocked = createBlockedRequests();
      const guarded = new Set<BrowserContext>();
      /** Contexts guarded since the last drain, for the `browser.on('context')` liveness check. */
      let guardedSinceTake: BrowserContext[] = [];
      const listeners: GuardListener[] = [];
      const closed = new WeakSet<GuardTarget>();
      const closeTracked = new WeakSet<BrowserContext | Page>();
      const watched = new WeakSet<Page>();
      /** Every context the browser reported, with the site URLs its pages visited. */
      const seen = new Map<BrowserContext, Set<string>>();
      let allowOrigin: (url: string) => boolean = DENY_OTHER_ORIGINS;
      /** `javaScriptEnabled` of the last test, so the worker teardown settles the same way. */
      let scriptsEnabled = true;
      const shouldBlock = (url: string): boolean => !isSameOrigin(url, origin) && !allowOrigin(url);
      /**
       * `token` is the Playwright object that identifies the request or socket, so the two guard
       * paths that can both see one request (the `request` observer and the aborting context route)
       * count it once (WP-22a pass 6, m1).
       */
      const noteBlocked = (entry: string, token?: object): void => blocked.note(entry, token);
      const blockedEntries = (): string[] => blocked.entries();
      const openPages = (): Page[] =>
        [...guarded].flatMap((target) => (closed.has(target) ? [] : target.pages()));

      const trackClose = (target: BrowserContext | Page): void => {
        if (closeTracked.has(target)) return;
        closeTracked.add(target);
        (target as unknown as { once: (e: string, f: () => void) => void }).once('close', () => {
          closed.add(target);
        });
      };
      const listen = <T>(target: GuardTarget, event: string, fn: (arg: T) => void): void => {
        (target as unknown as { on: (e: string, f: (arg: T) => void) => void }).on(event, fn);
        listeners.push({ target, event, fn: fn as (...args: never[]) => void });
      };
      const watchPage = (target: Page): void => {
        if (watched.has(target)) return;
        watched.add(target);
        trackClose(target);
        listen<WebSocket>(target, 'websocket', (socket) => {
          if (shouldBlock(socket.url())) noteBlocked(`WEBSOCKET ${socket.url()}`, socket);
        });
      };

      /**
       * `context.request` is an `APIRequestContext`: it raises no context `request` event and skips
       * context routes, so the observers above cannot see it. `page.request` is the very same object.
       * Wrapping its sending methods on the instance (they live on the shared prototype, which must
       * stay untouched) turns the documented, lint-only limit into a runtime one (WP-22a pass 4, m1).
       */
      const guardApiRequest = (target: BrowserContext): void => {
        const api = target.request as unknown as Record<string, unknown>;
        for (const method of API_REQUEST_METHODS) {
          const original = api[method];
          if (typeof original !== 'function') continue;
          const send = original as (...args: unknown[]) => Promise<unknown>;
          Object.defineProperty(api, method, {
            configurable: true,
            writable: true,
            value: async (first: unknown, ...rest: unknown[]): Promise<unknown> => {
              const url = apiRequestUrl(first, `${origin}/`);
              if (!shouldBlock(url)) return send.call(api, first, ...rest);
              noteBlocked(`${method.toUpperCase()} ${url} (apirequest)`);
              throw new Error(
                `${GUARD_FAILURE_MARKER} APIRequestContext (page.request, context.request) may not ` +
                  `reach another origin: ${method.toUpperCase()} ${url}. Drive the request through ` +
                  `the page, or declare allowOtherOrigin(match, reason) on the test.`,
              );
            },
          });
        }
      };

      const guard = async (target: BrowserContext): Promise<void> => {
        if (guarded.has(target)) return;
        guarded.add(target);
        guardedSinceTake.push(target);
        trackClose(target);
        listen<ConsoleMessage>(target, 'console', (message) => {
          if (message.type() !== 'error') return;
          const { url, lineNumber } = message.location();
          errors.push(`console.error: ${message.text()}${url ? ` (${url}:${lineNumber})` : ''}`);
        });
        listen<WebError>(target, 'weberror', (webError) => {
          errors.push(`pageerror: ${webError.error().message}`);
        });
        // Observer, not a route: page-level routes cannot hide a request from it.
        listen<Request>(target, 'request', (request) => {
          if (shouldBlock(request.url())) {
            noteBlocked(
              `${request.method()} ${request.url()} (${request.resourceType()})`,
              request,
            );
          }
        });
        listen<Page>(target, 'page', watchPage);
        for (const existing of target.pages()) watchPage(existing);
        guardApiRequest(target);
        await target.exposeBinding(CSP_BINDING, (_source, detail: string) => {
          errors.push(`CSP violation: ${detail}`);
        });
        await target.addInitScript(pageInitScript, {
          binding: CSP_BINDING,
          settleKey: SETTLE_KEY,
          cap: SETTLE_CAP_MS,
        });
        // Abort other-origin requests that reach the context (no page route took them).
        await target.route(
          (url) => shouldBlock(url.href),
          async (route) => {
            const request = route.request();
            // The observer above normally saw this request already; `request` is the same object
            // either way, so it is counted once. The call stays, so a request that reaches only
            // this path is still reported.
            noteBlocked(
              `${request.method()} ${request.url()} (${request.resourceType()})`,
              request,
            );
            await route.abort('blockedbyclient');
          },
        );
        // context.route does not see WebSockets; without connectToServer() no connection is made.
        await target.routeWebSocket(
          (url) => shouldBlock(url.href),
          async (socket) => {
            noteBlocked(`WEBSOCKET ${socket.url()}`, socket);
            await socket.close({ code: 1008, reason: 'Blocked by sameOriginGuard' });
          },
        );
      };

      /**
       * Second net: record every context the browser reports, with the URLs its pages loaded, so a
       * context that reached none of the guarded paths is listed at the next teardown **even after it
       * was closed or navigated to about:blank**. A snapshot of `browser.contexts()` missed exactly
       * those (WP-22a pass 4, M1 probes B and D).
       */
      const trackContext = (created: BrowserContext): void => {
        if (seen.has(created)) return;
        const urls = new Set<string>();
        seen.set(created, urls);
        const note = (url: string): void => {
          if (url && url !== 'about:blank') urls.add(url);
        };
        const watchUrls = (target: Page): void => {
          note(target.url());
          (target as unknown as { on: (e: string, f: (frame: Frame) => void) => void }).on(
            'framenavigated',
            (frame) => {
              if (frame === target.mainFrame()) note(frame.url());
            },
          );
        };
        (created as unknown as { on: (e: string, f: (p: Page) => void) => void }).on(
          'page',
          watchUrls,
        );
        for (const existing of created.pages()) watchUrls(existing);
      };
      // Registered through `listen`, so the removal check below covers it: a bare `browser.on` left
      // the second net's only listener outside the registry, and `browser.removeAllListeners`
      // ('context') then disabled it silently (WP-22a pass 5, m2).
      listen<BrowserContext>(browser, 'context', trackContext);

      const take = (): GuardHarvest => {
        const harvest: GuardHarvest = {
          errors: [...errors],
          blocked: blockedEntries(),
          unguarded: [],
          removed: [],
          harness: [],
        };
        errors.length = 0;
        blocked.clear();
        const stray = [...seen.keys()].filter((context) => !guarded.has(context));
        harvest.unguarded = strayContextUrls(
          stray.map((context) => ({ guarded: false, urls: [...(seen.get(context) ?? [])] })),
        );
        for (const context of stray) seen.delete(context);
        // `browser.on('context')` is not in the public typings. If a Playwright upgrade stops
        // emitting it the second net dies silently, so say so instead. The check is per drain, over
        // the contexts guarded since the last one, so an event that *stops* firing mid-run is caught
        // too, not only one that never fires (WP-22a pass 5, m2). Every test creates a context, so
        // every test's drain has something to check; a drain with none skips it.
        if (guardedSinceTake.length > 0 && !guardedSinceTake.some((context) => seen.has(context))) {
          harvest.harness.push(
            "The browser reported no 'context' event for any context the guards installed since the " +
              'last check, so the cumulative check for unguarded contexts in tests/e2e/fixtures.ts ' +
              'is dead. Playwright probably renamed the event, or a spec removed the listener: fix ' +
              'the check before trusting a green run.',
          );
        }
        guardedSinceTake = [];
        const removed = new Set<string>();
        for (const entry of listeners) {
          if (closed.has(entry.target)) continue;
          const current = (entry.target as unknown as Listening).listeners?.(entry.event);
          if (current !== undefined && !current.includes(entry.fn)) removed.add(entry.event);
        }
        harvest.removed = [...removed];
        // Housekeeping (WP-22a pass 6, n1): a closed context or page can produce nothing more, so
        // drop what the worker held for it. This runs **after** the two checks above, because both
        // read those registries: deleting a context's `seen` record at its `close` event would make
        // the liveness check report the event as dead for a context the test closed itself.
        for (const context of [...guarded]) {
          if (!closed.has(context)) continue;
          guarded.delete(context);
          seen.delete(context);
        }
        const live = listeners.filter((entry) => !closed.has(entry.target));
        if (live.length !== listeners.length) listeners.splice(0, listeners.length, ...live);
        return harvest;
      };

      const hadOwnNewContext = Object.prototype.hasOwnProperty.call(browser, 'newContext');
      const originalNewContext = browser.newContext;
      (browser as { newContext: Browser['newContext'] }).newContext = async (...args) => {
        const created = await originalNewContext.apply(browser, args);
        await guard(created);
        return created;
      };

      try {
        await use({
          guard,
          openPages,
          setAllowOrigin: (allow) => {
            allowOrigin = allow;
          },
          setScriptsEnabled: (value) => {
            scriptsEnabled = value;
          },
          origin,
          get errors() {
            return [...errors];
          },
          get blocked() {
            return blockedEntries();
          },
          take,
        });
      } finally {
        if (hadOwnNewContext)
          (browser as { newContext: Browser['newContext'] }).newContext = originalNewContext;
        else delete (browser as { newContext?: Browser['newContext'] }).newContext;
      }

      // Whatever is left arrived after the last test's teardown drained the collectors: a
      // test.afterAll hook, or work that outlived a test which timed out. No test can carry it, and
      // a worker fixture that throws here fails the run. Settle first, exactly as the test-scoped
      // teardown does, so deferred work an `afterAll` hook started is waited for too (pass 5, n1).
      await settle(openPages(), scriptsEnabled);
      const leftover = guardProblems(take(), [], origin);
      if (leftover.length > 0) {
        throw new Error(
          `${GUARD_FAILURE_MARKER} after the last test in this worker (a test.afterAll hook, or ` +
            `work that outlived a test):\n\n${leftover.join('\n\n')}`,
        );
      }
    },
    { scope: 'worker', auto: true },
  ],

  /**
   * Playwright's own `page` fixture, with a setup budget of its own.
   *
   * The body is what Playwright does (`playwright/lib/index.js`: `await use(await
   * context.newPage())`, reusing an existing page when one is there, which only happens under
   * `PW_TEST_REUSE_CONTEXT` in UI mode). The `timeout` is the change: without it this fixture shares
   * the test's 30 s, and spawning a Chromium renderer costs 22-44 s on the machine this package is
   * gated on, so the run reported page-contract failures in which no assertion had run. See
   * `helpers/timeouts.ts` for the measurements. The test timeout is untouched and still covers
   * everything a spec does.
   */
  page: [
    async ({ context }, use) => {
      const [existing] = context.pages();
      await use(existing ?? (await context.newPage()));
    },
    { scope: 'test', timeout: pageSetupTimeout() },
  ],

  /**
   * Playwright's `request` fixture is an `APIRequestContext` of its own, created outside any browser
   * context, so nothing wraps or observes it. Replacing it with one that fails is the runtime half of
   * the ESLint rule that bans it (WP-22a pass 4, m1).
   */
  // eslint-disable-next-line no-empty-pattern -- Playwright requires an object pattern here.
  request: async ({}, _use) => {
    throw new Error(
      `${GUARD_FAILURE_MARKER} the \`request\` fixture is an APIRequestContext that no guard can ` +
        'observe, so a spec could reach any origin through it. Drive the request through the page, ' +
        'or use page.request, which the guards wrap (same-origin only).',
    );
  },

  harnessGuards: [
    async ({ harnessWorkerGuards, context, baseURL, javaScriptEnabled }, use, testInfo) => {
      if (!baseURL) throw new Error('harnessGuards needs use.baseURL');
      const guards = harnessWorkerGuards;
      const origin = new URL(baseURL).origin;
      if (origin !== guards.origin) {
        throw new Error(
          `${GUARD_FAILURE_MARKER} use.baseURL is on ${origin}, but the worker guards watch ` +
            `${guards.origin} (tests/e2e/helpers/preview-url.ts). They must agree, or traffic to ` +
            'the real preview server would count as another origin. Change PW_PORT, not use.baseURL.',
        );
      }
      const testLocation = { file: testInfo.file, line: testInfo.line, column: testInfo.column };
      // Only opt-outs present at setup can allow anything; teardown re-checks, so ones pushed later
      // by a hook or the body are reported too.
      const { accepted } = classifyOptOuts(testInfo.annotations, testLocation);
      testInfo.annotations.push({
        type: GUARD_ANNOTATION,
        description:
          accepted.length === 0
            ? GUARD_NAMES
            : `${GUARD_NAMES}; opt-outs: ${accepted.map((o: OptOut) => `${o.type} ${o.match} (${o.reason})`).join('; ')}`,
      });

      guards.setScriptsEnabled(javaScriptEnabled !== false);
      /**
       * Anything already in the collectors was produced before this test started: by a
       * `test.beforeAll` hook, or by work that outlived an earlier test. Drain and report it **here**,
       * where this test's opt-outs are not in scope yet, instead of letting it fall into this test's
       * teardown. Otherwise an unrelated `allowConsoleError` on the first test after a dirty hook
       * excuses a real defect and the run goes green, which breaks the documented "opt-outs apply to
       * their own test only" invariant (WP-22a pass 5, m1). Off-origin traffic was never affected:
       * `blocked` is decided at collection time, and outside a test no origin is allowed.
       */
      await settle(guards.openPages(), javaScriptEnabled !== false);
      const beforeTest = guardProblems(guards.take(), [], origin);
      if (beforeTest.length > 0) {
        throw new Error(
          `${GUARD_FAILURE_MARKER} raised before this test started (a test.beforeAll hook, or work ` +
            `that outlived an earlier test), so no opt-out on this test applies:\n\n` +
            beforeTest.join('\n\n'),
        );
      }

      guards.setAllowOrigin((url) => optedOut(accepted, ALLOW_OTHER_ORIGIN, url));
      // The context fixture is normally created through the patched browser.newContext and so is
      // already guarded; this covers a Playwright version that builds it some other way.
      await guards.guard(context);

      try {
        await use({
          get errors() {
            return guards.errors;
          },
          get blocked() {
            return guards.blocked;
          },
        });

        await settle(guards.openPages(), javaScriptEnabled !== false);
      } finally {
        guards.setAllowOrigin(DENY_OTHER_ORIGINS);
      }

      const optOutProblems = classifyOptOuts(testInfo.annotations, testLocation).problems;
      const problems = guardProblems(
        guards.take(),
        accepted,
        origin,
        optOutProblems.length === 0
          ? []
          : [
              `${optOutProblems.length} invalid opt-out annotation(s):\n` +
                optOutProblems.map((p) => `  - ${p}`).join('\n'),
            ],
      );
      // The marker lets guard-reporter.ts recognise this failure on any attempt, so a retry cannot
      // turn a guard violation into `flaky` and a green run.
      if (problems.length > 0) {
        throw new Error(`${GUARD_FAILURE_MARKER} ${problems.join('\n\n')}`);
      }
    },
    { auto: true },
  ],

  consoleErrors: async ({ harnessGuards }, use) => {
    await use(harnessGuards.errors);
  },

  sameOriginGuard: async ({ harnessGuards }, use) => {
    await use({
      get blocked() {
        return harnessGuards.blocked;
      },
    });
  },

  seedStorage: async ({ context }, use) => {
    await use(async (entries) => {
      const pairs = Object.entries(entries).map(([key, value]): [string, string] => {
        if (!key.startsWith('st.')) {
          throw new Error(`seedStorage: key "${key}" must start with "st." (see CLAUDE.md).`);
        }
        return [key, typeof value === 'string' ? value : JSON.stringify(value)];
      });
      const marker = `__playwright.seeded.${randomUUID()}`;
      await context.addInitScript(
        ({ pairs: seeded, marker: flag }) => {
          try {
            const storage = window.localStorage;
            if (storage.getItem(flag) !== null) return;
            for (const [key, value] of seeded) storage.setItem(key, value);
            storage.setItem(flag, '1');
          } catch {
            // Opaque origins (about:blank, data:) have no localStorage.
          }
        },
        { pairs, marker },
      );
    });
  },

  setTheme: async ({ page, seedStorage }, use) => {
    await use(async (theme) => {
      await page.emulateMedia({ colorScheme: theme });
      await seedStorage({ 'st.theme': theme });
      await page.addInitScript((value) => {
        const apply = (): boolean => {
          const root = document.documentElement;
          if (!root) return false;
          root.setAttribute('data-theme', value);
          return true;
        };
        if (!apply()) {
          const observer = new MutationObserver(() => {
            if (apply()) observer.disconnect();
          });
          observer.observe(document, { childList: true });
        }
      }, theme);
      if (page.url() !== 'about:blank') {
        await page.evaluate(
          (value) => document.documentElement.setAttribute('data-theme', value),
          theme,
        );
      }
    });
  },
});
