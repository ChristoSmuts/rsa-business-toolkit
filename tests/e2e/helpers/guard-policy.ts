/**
 * Rules for the automatic e2e guards (see `tests/e2e/fixtures.ts`) that do not need a browser: the
 * opt-out annotation format, the "every test ran the guards" check used by `guard-reporter.ts`, and
 * the settle bound. This module has no Playwright value import, so the unit tests can load it.
 */

export const ALLOW_CONSOLE_ERROR = 'allow-console-error';
export const ALLOW_OTHER_ORIGIN = 'allow-other-origin';
export const OPT_OUT_TYPES: readonly string[] = [ALLOW_CONSOLE_ERROR, ALLOW_OTHER_ORIGIN];

/** Annotation the guard fixture adds to every test it protects. The reporter looks for it. */
export const GUARD_ANNOTATION = 'harness-guards';
export const GUARD_NAMES = 'consoleErrors, sameOriginGuard';

/**
 * First characters of every error the guard fixture throws. The reporter matches it against
 * `result.errors` of every attempt, so a guard violation that a retry hid (CI runs with
 * `retries: 2`) still fails the run. Ordinary retries for infrastructure flakiness keep working.
 */
export const GUARD_FAILURE_MARKER = '[e2e guards]';

/** `Symbol.for()` key the guard reporter sets on `globalThis`; globalTeardown checks it. */
export const GUARD_REPORTER_FLAG = 'sa-business-toolkit.e2e.guard-reporter';

/** Minimum length of the reason in an opt-out annotation. */
export const MIN_OPT_OUT_REASON = 20;

/**
 * Upper bound, per test, for the settle step that runs before the guards evaluate: wait for `load`,
 * then `networkidle`, then for pending `setTimeout` callbacks with a delay up to this bound. Work that
 * is scheduled later than this (or with `setInterval`) is not waited for.
 */
export const SETTLE_CAP_MS = 3_000;

/**
 * Spec files that still import `test` from `@playwright/test` and so run without the guards. Owned
 * by other packages. The list is frozen (unit test): it can only shrink, and a listed file that
 * starts to use the guards fails the run until its entry is removed. The ESLint override in
 * `eslint.config.js` must list the same files.
 *
 * It is **empty**, and that is the goal state: `smoke.spec.ts` (WP-00) and `design-system.spec.ts`
 * (WP-11) were switched over when their packages merged, so every spec now runs the guards. Only a
 * spec that arrives with another package may be added, and only until that package's next round.
 */
export const KNOWN_UNGUARDED_SPECS: readonly string[] = [];

const SEPARATOR = ' | reason: ';

export interface AnnotationLike {
  type: string;
  description?: string | undefined;
  location?: { file: string; line: number; column: number } | undefined;
}

export interface TestLocation {
  file: string;
  line: number;
  column: number;
}

export interface OptOut {
  type: string;
  match: string;
  reason: string;
}

function optOut(
  type: string,
  match: string,
  reason: string,
): { type: string; description: string } {
  return { type, description: `${match}${SEPARATOR}${reason}` };
}

/**
 * Annotation that lets console errors, page errors or CSP violations whose text matches `match`
 * through. Use it only in the details of a single `test(title, { annotation }, body)` call.
 */
export function allowConsoleError(
  match: string,
  reason: string,
): { type: string; description: string } {
  return optOut(ALLOW_CONSOLE_ERROR, match, reason);
}

/** Annotation that lets requests to URLs matching `match` reach another origin. Test level only. */
export function allowOtherOrigin(
  match: string,
  reason: string,
): { type: string; description: string } {
  return optOut(ALLOW_OTHER_ORIGIN, match, reason);
}

const REGEX_MATCH = /^\/(.+)\/([dgimsuy]*)$/s;

/** A matcher for `match`: `/body/flags` (known flags only) is a regex, anything else a substring. */
export function compileMatch(match: string): (text: string) => boolean {
  const regex = REGEX_MATCH.exec(match);
  if (regex?.[1] !== undefined) {
    const compiled = new RegExp(regex[1], (regex[2] ?? '').replace(/[gy]/g, ''));
    return (text) => compiled.test(text);
  }
  return (text) => text.includes(match);
}

/** Parse an opt-out description, or return a readable problem. */
export function parseOptOut(annotation: AnnotationLike): OptOut | string {
  const description = annotation.description ?? '';
  const index = description.indexOf(SEPARATOR);
  const match = index === -1 ? description.trim() : description.slice(0, index).trim();
  const reason = index === -1 ? '' : description.slice(index + SEPARATOR.length).trim();
  if (match === '') {
    return `"${annotation.type}" has no match pattern; an empty pattern would allow everything`;
  }
  if (reason.length < MIN_OPT_OUT_REASON) {
    return `"${annotation.type}" for "${match}" needs a reason of at least ${MIN_OPT_OUT_REASON} characters (use allowConsoleError(match, reason) or allowOtherOrigin(match, reason))`;
  }
  try {
    compileMatch(match);
  } catch (error) {
    return `"${annotation.type}" pattern ${match} is not a valid regular expression: ${(error as Error).message}`;
  }
  return { type: annotation.type, match, reason };
}

function sameLocation(a: AnnotationLike['location'], b: TestLocation): boolean {
  return a !== undefined && a.file === b.file && a.line === b.line && a.column === b.column;
}

/**
 * Split the opt-out annotations of a test into accepted ones and problems. An opt-out is accepted
 * only when it was declared in the details of this test's own `test()` call: Playwright stamps those
 * with the test's location. Annotations from `test.describe(..., { annotation })` carry the describe
 * location, and ones pushed at run time (`beforeEach`, `beforeAll`, the test body) carry none.
 */
export function classifyOptOuts(
  annotations: readonly AnnotationLike[],
  test: TestLocation,
): { accepted: OptOut[]; problems: string[] } {
  const accepted: OptOut[] = [];
  const problems: string[] = [];
  for (const annotation of annotations) {
    if (!OPT_OUT_TYPES.includes(annotation.type)) continue;
    if (!annotation.location) {
      problems.push(
        `"${annotation.type}" was added at run time (test.info().annotations.push in a hook or the test body). ` +
          'Opt-outs must be declared in test(title, { annotation: ... }, body).',
      );
      continue;
    }
    if (!sameLocation(annotation.location, test)) {
      problems.push(
        `"${annotation.type}" is declared at ${annotation.location.file}:${annotation.location.line}, not on the test itself ` +
          '(test.describe annotations would opt out a whole block). Declare it on each test.',
      );
      continue;
    }
    const parsed = parseOptOut(annotation);
    if (typeof parsed === 'string') problems.push(parsed);
    else accepted.push(parsed);
  }
  return { accepted, problems };
}

/** True when any accepted opt-out of `type` matches `text`. */
export function optedOut(optOuts: readonly OptOut[], type: string, text: string): boolean {
  return optOuts.some((entry) => entry.type === type && compileMatch(entry.match)(text));
}

/**
 * True when `url` belongs to the preview server. `data:` and `blob:` count as same-origin, and a
 * WebSocket to the preview server is the same origin as its `http(s):` form. Anything unparseable is
 * another origin (fail closed).
 */
export function isSameOrigin(url: string, origin: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  try {
    const parsed = new URL(url);
    const httpOrigin = parsed.origin.replace(/^ws(s?):/, 'http$1:');
    return parsed.origin === origin || httpOrigin === origin;
  } catch {
    return false;
  }
}

/**
 * The absolute URL an `APIRequestContext` call targets. Its first argument is a URL string or a
 * `Request`, and a relative URL resolves against the context's base URL. An unparseable value comes
 * back unchanged, so `isSameOrigin` then treats it as another origin.
 */
export function apiRequestUrl(target: unknown, baseUrl: string): string {
  const raw =
    typeof target === 'string'
      ? target
      : ((target as { url?: () => string } | null)?.url?.() ?? String(target));
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return raw;
  }
}

/**
 * Collector for off-origin traffic. Identical requests share one entry, which then carries `(×N)`,
 * so the message counts distinct requests and says how often each happened.
 *
 * The count is per **request**, not per guard observation. Two guard paths see the same off-origin
 * request: the context `request` event observer (which fires whatever a spec's own route does) and
 * the context route that aborts it. Both report, because either may be the only one that sees a
 * given request, and both pass the Playwright `Request` (or `WebSocket`) object as `token`, so the
 * request is counted once. Before this, a single off-origin image printed `(×2)` while one that a
 * spec's route continued printed nothing — the suffix said more about the spec than about the leak
 * (review WP-22a pass 6, m1). A call with no token is always counted: an `APIRequestContext` call
 * has no Request object, and each call is one request.
 */
export interface BlockedRequests {
  /** Record one blocked request or WebSocket. `token` is the object that identifies it. */
  note: (entry: string, token?: object) => void;
  /** The entries collected so far, repeats carrying `(×N)`. */
  entries: () => string[];
  /** Forget everything (called by each drain). Counted tokens stay counted. */
  clear: () => void;
}

export function createBlockedRequests(): BlockedRequests {
  const counts = new Map<string, number>();
  const counted = new WeakSet<object>();
  return {
    note: (entry, token) => {
      if (token !== undefined) {
        if (counted.has(token)) return;
        counted.add(token);
      }
      counts.set(entry, (counts.get(entry) ?? 0) + 1);
    },
    entries: () =>
      [...counts].map(([entry, count]) => (count > 1 ? `${entry} (×${count})` : entry)),
    clear: () => counts.clear(),
  };
}

/** Stand-in URL for a context the guards never saw that never loaded a page. */
export const CONTEXT_WITHOUT_URL = '(a context with no page URL)';

/** One browser context as the cumulative registry in `fixtures.ts` recorded it. */
export interface SeenContext {
  /** True when the guards installed their listeners on it. */
  guarded: boolean;
  /** Site URLs its pages loaded, in order. `about:blank` is never recorded. */
  urls: readonly string[];
}

/**
 * URLs to report from the cumulative context registry. The registry keeps a record for every context
 * the browser ever reported, so a context that was closed inside the test body or inside
 * `test.beforeAll`, or parked on `about:blank` before teardown, is still reported — a snapshot of
 * `browser.contexts()` missed all three (review WP-22a pass 4, M1 probes B, C and D).
 */
export function strayContextUrls(contexts: readonly SeenContext[]): string[] {
  const stray: string[] = [];
  for (const context of contexts) {
    if (context.guarded) continue;
    stray.push(...(context.urls.length > 0 ? context.urls : [CONTEXT_WITHOUT_URL]));
  }
  return stray;
}

/**
 * Problem for URLs that were loaded in a browser context the guards never saw, or `undefined`.
 *
 * `fixtures.ts` patches `browser.newContext` at **worker** scope, so every context a spec creates —
 * in the test body, in `test.beforeAll`, or through a helper function — is guarded. This is the
 * second net: `browser.on('context')` records every context the browser reports, with the URLs its
 * pages loaded, and anything that was never guarded is listed at the next teardown. Because the
 * record is cumulative, a context that was closed or parked on `about:blank` first is still listed
 * (a snapshot of `browser.contexts()` missed exactly those: review WP-22a pass 4, M1).
 */
export function unguardedContextProblem(pageUrls: readonly string[]): string | undefined {
  if (pageUrls.length === 0) return undefined;
  return (
    `${pageUrls.length} page URL(s) were loaded in a browser context that the guards never saw:\n` +
    pageUrls.map((url) => `  - ${url}`).join('\n') +
    '\nNo console, CSP or network check ran on that context, so it cannot be trusted. It was not ' +
    'created through browser.newContext()/browser.newPage() or the context fixture: use one of ' +
    'those (see tests/e2e/fixtures.ts and docs/testing.md).'
  );
}

export interface ExecutedTest {
  /**
   * `TestCase.id`: stable across retries and unique per generated test, so attempts of two tests
   * that share a title and a call site (a `for` loop with a non-injective label) stay apart. Falls
   * back to title plus location when a caller has no id.
   */
  id?: string;
  /** Test title path, for messages. */
  title: string;
  /** Spec file relative to the Playwright test directory, with forward slashes. */
  file: string;
  location: TestLocation;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  /** What Playwright expects: `'failed'` after `test.fail()`, so a failure counts as a pass. */
  expectedStatus?: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  /** Attempt number: 0 is the first run, 1 the first retry. Defaults to 0. */
  retry?: number;
  /** Error of this attempt that carries `GUARD_FAILURE_MARKER`, when the guards reported one. */
  guardFailure?: string | undefined;
  annotations: readonly AnnotationLike[];
}

/** Attempts of one test, oldest first. */
function attemptsByTest(tests: readonly ExecutedTest[]): ExecutedTest[][] {
  const groups = new Map<string, ExecutedTest[]>();
  for (const test of tests) {
    const key =
      test.id ?? `${test.file}:${test.location.line}:${test.location.column}:${test.title}`;
    const group = groups.get(key);
    if (group) group.push(test);
    else groups.set(key, [test]);
  }
  return [...groups.values()].map((group) =>
    [...group].sort((a, b) => (a.retry ?? 0) - (b.retry ?? 0)),
  );
}

function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
}

/**
 * Problem for a guard violation that would not fail the run, or `undefined`. Two ways to lose one:
 *
 * - a **retry** (CI runs with `retries: 2`): guard problems are exactly the kind that show up on one
 *   attempt only (a late timer, a race, an occasional third-party request), and such an attempt is
 *   otherwise recorded as `flaky` while the run exits 0;
 * - **`test.fail()`** (or `test.fixme()`): the test is expected to fail, so a failure that is only
 *   the guards' is reported as a pass. ESLint bans both in `tests/e2e/**`; this is the runtime half.
 *
 * When the last attempt reports the guard failure and the test is expected to pass, the run already
 * fails on it and nothing is added.
 */
export function hiddenGuardFailure(attempts: readonly ExecutedTest[]): string | undefined {
  const last = attempts[attempts.length - 1];
  const first = attempts.find((attempt) => attempt.guardFailure !== undefined);
  const reported = first?.guardFailure;
  if (!first || !last || reported === undefined) return undefined;
  const where = `${first.file}:${first.location.line} "${first.title}"`;
  if (last.guardFailure === undefined) {
    return (
      `guard violation on attempt ${(first.retry ?? 0) + 1} of ${where} was retried away (the run ` +
      `ended "${last.status}"). Guard violations are not flaky infrastructure: fix the page, or ` +
      `declare an opt-out on the test. The attempt reported:\n${quote(reported)}`
    );
  }
  if (last.expectedStatus === 'failed') {
    return (
      `guard violation in ${where} is hidden by test.fail()/test.fixme(): the failure counts as ` +
      `expected and the run would pass. Fix the page, or declare an opt-out on the test. The test ` +
      `reported:\n${quote(last.guardFailure)}`
    );
  }
  return undefined;
}

/**
 * Problems for the whole run: tests that passed without the guard fixture, invalid opt-outs, stale
 * entries in `KNOWN_UNGUARDED_SPECS`, and guard violations that a retry or `test.fail()` hid.
 *
 * Only a test that **passed** has to carry the guard stamp. That is the property worth protecting: a
 * green test must have run the guards. A test that failed, timed out, was interrupted or was skipped
 * already fails the run (or ran no body), so it cannot hide an unguarded defect. Requiring the stamp
 * there would also misreport infrastructure failures: when a browser times out while setting up
 * `page`, the fixture never runs, and the report would tell the author to fix an import that is
 * already correct.
 */
export function guardRunProblems(
  tests: readonly ExecutedTest[],
  knownUnguarded: readonly string[] = KNOWN_UNGUARDED_SPECS,
): string[] {
  const problems: string[] = [];
  const staleKnown = new Set<string>();
  for (const test of tests) {
    const guarded = test.annotations.some((a) => a.type === GUARD_ANNOTATION);
    const known = knownUnguarded.includes(test.file);
    if (guarded && known) staleKnown.add(test.file);
    if (!guarded && !known && test.status === 'passed') {
      problems.push(
        `unguarded test: ${test.file}:${test.location.line} "${test.title}" (${test.status}). ` +
          "Import test from tests/e2e/fixtures.ts (not '@playwright/test', a re-export or test.extend of it).",
      );
    }
    for (const problem of classifyOptOuts(test.annotations, test.location).problems) {
      problems.push(
        `invalid opt-out in ${test.file}:${test.location.line} "${test.title}": ${problem}`,
      );
    }
  }
  for (const attempts of attemptsByTest(tests)) {
    const hidden = hiddenGuardFailure(attempts);
    if (hidden) problems.push(hidden);
  }
  for (const file of staleKnown) {
    problems.push(
      `${file} now runs the guards: remove it from KNOWN_UNGUARDED_SPECS (tests/e2e/helpers/guard-policy.ts) and eslint.config.js.`,
    );
  }
  return [...new Set(problems)];
}
