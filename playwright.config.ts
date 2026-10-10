import { defineConfig, devices } from '@playwright/test';
import { normaliseBase } from './scripts/base-path';
import { previewOrigin, previewPort } from './tests/e2e/helpers/preview-url';
import { a11yTimeout } from './tests/e2e/helpers/timeouts';

const BASE = normaliseBase(process.env.BASE_PATH);
// The worker half of the guards runs before any test-scoped option exists, so it reads the preview
// origin from the same helper. The guard fixture fails the test if it and use.baseURL disagree.
const PORT = previewPort();
const ORIGIN = previewOrigin();
const useDev = process.env.PW_DEV === '1';
const isCI = Boolean(process.env.CI);

/**
 * Only `*.spec.ts` files are tests. A `*.test.ts` file under tests/e2e is never run by Playwright
 * (tests/unit/e2e-harness.test.ts also fails when one exists).
 */
export const SPEC_FILES = /\.spec\.ts$/;
const special = /(^|[\\/])(a11y|visual|nojs)\.spec\.ts$/;
/**
 * The 320px reflow sweep runs once, in `chromium`: the layout is the same in the other engines'
 * projects, and creating its 198 tests there only to skip them hid a real skip in the count
 * (WP-50a review pass 3, m5).
 */
const chromiumOnly = /(^|[\\/])reflow\.spec\.ts$/;

/**
 * Fails the run when any executed test did not run the automatic guards (tests/e2e/fixtures.ts).
 * globalTeardown fails the run when a command-line --reporter dropped it.
 */
const GUARD_REPORTER = ['./tests/e2e/helpers/guard-reporter.ts'] as const;

/**
 * Per-test timeout of the a11y project: `PW_A11Y_TIMEOUT` (ms), default 60 s in CI, 90 s locally.
 * The default test timeout is deliberately left at Playwright's 30 s: creating a page no longer
 * spends it (`tests/e2e/helpers/timeouts.ts` explains what that cost is and why it has its own
 * budget), so the 30 s is the budget for what a spec actually does.
 */
const A11Y_TIMEOUT = a11yTimeout();

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: SPEC_FILES,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }], GUARD_REPORTER]
    : [['list'], GUARD_REPORTER],
  globalTeardown: './tests/e2e/helpers/guard-teardown.ts',
  use: {
    baseURL: `${ORIGIN}${BASE}`,
    trace: 'retain-on-failure',
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
  },
  webServer: {
    // The launcher checks dist/ first (webServer starts before globalSetup and before specs load),
    // then runs `astro preview --ignore-lock`. --ignore-lock: Astro 7 otherwise refuses to start
    // while another preview/dev server of this project (for example in a second worktree) holds the
    // lock file.
    command: useDev
      ? `pnpm exec astro dev --host 127.0.0.1 --port ${PORT} --ignore-lock`
      : `pnpm exec tsx tests/e2e/helpers/web-server.ts --host 127.0.0.1 --port ${PORT}`,
    // Astro 7.3 detaches the server into the background when it detects an AI agent
    // (astro/dist/cli/dev/index.js:86, preview/index.js:45). This internal marker, set by Astro on
    // its own background child, keeps it in the foreground. The launcher sets the preview marker;
    // tests/unit/e2e-harness.test.ts fails if an Astro upgrade removes either marker.
    env: useDev ? { ASTRO_DEV_BACKGROUND: '1' } : {},
    url: `${ORIGIN}${BASE}`,
    // Reusing whatever answers on the port can silently test another checkout's build. Opt in with
    // PW_REUSE_SERVER=1 when you run `pnpm preview` yourself.
    reuseExistingServer: !isCI && process.env.PW_REUSE_SERVER === '1',
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    },
  },
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: SPEC_FILES,
      testIgnore: special,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: SPEC_FILES,
      testIgnore: [special, chromiumOnly],
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: SPEC_FILES,
      testIgnore: [special, chromiumOnly],
    },
    {
      name: 'nojs',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
      testMatch: /(^|[\\/])nojs\.spec\.ts$/,
    },
    {
      name: 'a11y',
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
      testMatch: /(^|[\\/])a11y\.spec\.ts$/,
      // `--timeout` on the command line wins.
      timeout: A11Y_TIMEOUT,
    },
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
      testMatch: /(^|[\\/])visual\.spec\.ts$/,
    },
  ],
});
