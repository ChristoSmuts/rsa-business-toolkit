import { defineConfig, devices } from '@playwright/test';

const rawBase = process.env.BASE_PATH ?? '/business-toolkit/';
const BASE = rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`;
const PORT = Number(process.env.PW_PORT ?? 4321);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const useDev = process.env.PW_DEV === '1';
const isCI = Boolean(process.env.CI);

const special = /(a11y|visual|nojs)\.spec\.ts/;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `${ORIGIN}${BASE}`,
    trace: 'retain-on-failure',
    locale: 'en-ZA',
    timezoneId: 'Africa/Johannesburg',
  },
  webServer: {
    command: useDev
      ? `pnpm exec astro dev --host 127.0.0.1 --port ${PORT}`
      : `pnpm exec astro preview --host 127.0.0.1 --port ${PORT}`,
    url: `${ORIGIN}${BASE}`,
    reuseExistingServer: !isCI,
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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: special },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: special },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: special },
    {
      name: 'nojs',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
      testMatch: /nojs\.spec\.ts/,
    },
    { name: 'a11y', use: { ...devices['Desktop Chrome'] }, testMatch: /a11y\.spec\.ts/ },
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
      testMatch: /visual\.spec\.ts/,
    },
  ],
});
