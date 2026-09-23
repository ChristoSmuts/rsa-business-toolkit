/**
 * Timeout policy for the browser suites, in one place.
 *
 * Playwright charges **test-scoped fixture setup to the test timeout**: unless a fixture declares a
 * timeout of its own it shares the test's budget, and a slow one is reported as
 * `Test timeout of 30000ms exceeded while setting up "page"` against whatever test happened to run
 * first (`workerProcessEntry.js`: a registration with `timeout` gets its own slot, otherwise
 * test-scoped fixtures fall through to the default slot). Worker-scoped fixtures already have their
 * own slot, which is why a 16-19 s `browser` launch never failed anything.
 *
 * That default is wrong for this harness, because creating a Chromium page is not test work and its
 * cost is set by the host, not by the site. Measured on the Windows dev machine this package is
 * gated on (16 logical cores), with nothing else running:
 *
 *   | what                          | alone   | 4 in parallel | 8 in parallel |
 *   | ----------------------------- | ------- | ------------- | ------------- |
 *   | `chromium.launch()`           | 5.7 s   | 38.0 s        | 94.8 s        |
 *   | `browser.newContext()`        | 0.01 s  | 0.02 s        | 0.02 s        |
 *   | `context.newPage()`           | 22.6 s  | up to 36.1 s  | up to 44.2 s  |
 *   | `context.newPage()` (WebKit)  |  -      | 4.6 s         |  -            |
 *
 * A single Chromium page, with the machine otherwise idle, spends 22.6 s of a 30 s test budget
 * before the test body starts: spawning the renderer process is what costs, `newContext` does not
 * spawn one and is free. So the serialised runs this package was reviewed on were green by about
 * 7 s of margin, and anything that ate that margin — a second project, more workers, any other load
 * — turned into a "failure" of `/` or `/design-system/` in which no assertion ever ran. Those are
 * simply the first two tests in file order, which is why the failing set moved from run to run.
 *
 * The fix is to give page setup its own budget rather than to enlarge the test's. The test timeout
 * still covers everything a spec actually does, unchanged; a genuinely hung browser still fails,
 * within `PAGE_SETUP_TIMEOUT` rather than never.
 *
 * This module has no Playwright import, so the unit tests can load it.
 */

/** Parses a positive-integer millisecond env var, or returns `fallback` when it is unset. */
export function timeoutFromEnv(
  name: string,
  fallback: number,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer (milliseconds), got "${raw}".`);
  }
  return value;
}

/**
 * Budget for creating the `page` fixture, separate from the test timeout: `PW_PAGE_SETUP_TIMEOUT`
 * (ms), default 120 s. That is ~2.7x the worst `context.newPage()` measured above (44.2 s, eight
 * Chromium browsers starting at once) and ~5x the cost with the machine idle, so it absorbs host
 * contention and still fails a browser that never produces a page. Lowering it is how
 * `tests/unit/e2e-harness.test.ts` and the probe in `docs/testing.md` prove the budget can fail.
 */
export function pageSetupTimeout(env: NodeJS.ProcessEnv = process.env): number {
  return timeoutFromEnv('PW_PAGE_SETUP_TIMEOUT', 120_000, env);
}

/**
 * Per-test timeout of the a11y project: `PW_A11Y_TIMEOUT` (ms), default 60 s in CI, 90 s locally.
 * Each analysis also opens a page for axe's report step.
 */
export function a11yTimeout(env: NodeJS.ProcessEnv = process.env): number {
  return timeoutFromEnv('PW_A11Y_TIMEOUT', env.CI ? 60_000 : 90_000, env);
}
