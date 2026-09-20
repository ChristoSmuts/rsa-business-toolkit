/**
 * Lighthouse CI configuration. Run through `pnpm lhci` (scripts/ci/run-lhci.mjs), which sets
 * CHROME_PATH to the Playwright Chromium, keeps `astro preview` in the foreground and runs this
 * config once per preset.
 *
 * URLs: the committed list in `tests/lighthouse/urls.json` (site-relative paths, `/` is the home
 * page). Each listed page must exist in `dist/`, otherwise the config stops with a message.
 *
 * Environment:
 * - LH_PRESET: `desktop` (default) or `mobile` (Lighthouse's default mobile emulation).
 * - LH_URLS: override the list; site-relative paths separated by spaces or commas. Absolute http(s)
 *   URLs are used as given.
 * - LH_PORT: preview port (default 4322).
 * - BASE_PATH: same normalisation as astro.config.ts.
 *
 * Variables deliberately avoid the LHCI_ prefix: lhci reads LHCI_<NAME> as the --<name> option of
 * every command (LHCI_PRESET would become `lhci assert --preset`).
 *
 * Budgets follow docs/build-plan.md C4.
 */
/* global module, process, require, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- lhci loads this file as CommonJS. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function normaliseBase(raw) {
  const value = (raw ?? '/business-toolkit/').trim();
  if (value === '' || value === '/') return '/';
  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

const PRESETS = ['desktop', 'mobile'];
const preset = process.env.LH_PRESET ?? 'desktop';
if (!PRESETS.includes(preset)) {
  throw new Error(`LH_PRESET must be one of ${PRESETS.join(', ')}, got "${preset}".`);
}

const port = Number(process.env.LH_PORT ?? 4322);
const origin = `http://127.0.0.1:${port}`;
const base = normaliseBase(process.env.BASE_PATH);
const repoRoot = path.resolve(__dirname, '..', '..');
const URL_LIST = path.join(__dirname, 'urls.json');

function pathsFromFile() {
  const data = JSON.parse(fs.readFileSync(URL_LIST, 'utf8'));
  const paths = data && data.paths;
  if (!Array.isArray(paths) || paths.length === 0 || !paths.every((p) => typeof p === 'string')) {
    throw new Error(`${URL_LIST}: "paths" must be a non-empty array of strings.`);
  }
  return paths;
}

/** Stop early when a listed page is not in the build, instead of auditing an error page. */
function assertBuilt(paths) {
  const distDir = path.join(repoRoot, 'dist');
  const nested = path.join(distDir, ...base.split('/').filter(Boolean));
  const root = fs.existsSync(path.join(distDir, 'index.html')) ? distDir : nested;
  const missing = paths.filter((entry) => {
    const rel = entry.replace(/^\/+/, '');
    const file = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel;
    return !fs.existsSync(path.join(root, ...decodeURI(file).split('/')));
  });
  if (missing.length > 0) {
    throw new Error(
      `tests/lighthouse/urls.json lists page(s) that are not in ${root}: ${missing.join(', ')}. ` +
        'Run `pnpm build` (same BASE_PATH), or remove the path.',
    );
  }
}

function urls() {
  const override = (process.env.LH_URLS ?? '').split(/[\s,]+/).filter(Boolean);
  const entries = override.length > 0 ? override : pathsFromFile();
  assertBuilt(entries.filter((entry) => !/^https?:\/\//i.test(entry)));
  return entries.map((entry) =>
    /^https?:\/\//i.test(entry) ? entry : `${origin}${base}${entry.replace(/^\/+/, '')}`,
  );
}

const median = (minScore) => ['error', { minScore, aggregationMethod: 'median-run' }];
const atMost = (maxNumericValue) => ['error', { maxNumericValue, aggregationMethod: 'median' }];

module.exports = {
  ci: {
    collect: {
      // run-lhci.mjs sets ASTRO_PREVIEW_BACKGROUND=1 so Astro 7 keeps this server in the foreground;
      // --ignore-lock allows a preview in another worktree to run at the same time.
      startServerCommand: `pnpm exec astro preview --host 127.0.0.1 --port ${port} --ignore-lock`,
      startServerReadyPattern: 'ready in',
      startServerReadyTimeout: 60_000,
      url: urls(),
      numberOfRuns: 3,
      settings: {
        ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
        // Playwright's Chromium cannot use the Linux sandbox on GitHub runners.
        ...(process.platform === 'linux' ? { chromeFlags: '--no-sandbox' } : {}),
      },
    },
    assert: {
      assertions: {
        'categories:performance': median(0.9),
        'categories:accessibility': median(0.95),
        'categories:best-practices': median(0.95),
        'categories:seo': median(0.95),
        'cumulative-layout-shift': atMost(0.01),
        'resource-summary:script:size': atMost(60 * 1024),
        'resource-summary:stylesheet:size': atMost(30 * 1024),
        'resource-summary:font:size': atMost(200 * 1024),
        'resource-summary:total:size': atMost(600 * 1024),
        'resource-summary:third-party:count': atMost(0),
      },
    },
    upload: {
      target: 'filesystem',
      // One folder per preset: each upload writes its own manifest.json.
      outputDir: `.lighthouseci/${preset}`,
      reportFilenamePattern: `%%PATHNAME%%-%%DATETIME%%-${preset}.report.%%EXTENSION%%`,
    },
  },
};
