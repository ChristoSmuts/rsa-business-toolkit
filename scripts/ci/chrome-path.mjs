#!/usr/bin/env node
/**
 * Print the Chromium executable that the installed `@playwright/test` uses, for tools that need
 * `CHROME_PATH` (Lighthouse CI), so Lighthouse and the e2e suites run the same browser build.
 *
 * - First choice: `chromium.executablePath()` from `@playwright/test` (honours
 *   `PLAYWRIGHT_BROWSERS_PATH`).
 * - Fallback, with a warning on stderr: the newest `chromium-<revision>` folder in the Playwright
 *   browser cache, when the pinned build is not installed.
 *
 * Usage: `node scripts/ci/chrome-path.mjs` (exit code 1 when no Chromium is installed).
 */
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

/** Executable location inside a `chromium-<revision>` folder, newest layout first. */
const EXECUTABLES = {
  win32: [
    ['chrome-win64', 'chrome.exe'],
    ['chrome-win', 'chrome.exe'],
  ],
  darwin: [
    [
      'chrome-mac-arm64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing',
    ],
    [
      'chrome-mac-x64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing',
    ],
    ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
  ],
  linux: [
    ['chrome-linux64', 'chrome'],
    ['chrome-linux', 'chrome'],
  ],
};

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {NodeJS.Platform} [platform]
 * @param {string} [home]
 * @returns {string}
 */
export function playwrightBrowsersDir(
  env = process.env,
  platform = process.platform,
  home = os.homedir(),
) {
  const custom = env.PLAYWRIGHT_BROWSERS_PATH;
  if (custom === '0') {
    const require = createRequire(import.meta.url);
    return path.join(
      path.dirname(require.resolve('playwright-core/package.json')),
      '.local-browsers',
    );
  }
  if (custom) return path.resolve(custom);
  if (platform === 'win32') {
    return path.join(env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'ms-playwright');
  }
  if (platform === 'darwin') return path.join(home, 'Library', 'Caches', 'ms-playwright');
  return path.join(env.XDG_CACHE_HOME ?? path.join(home, '.cache'), 'ms-playwright');
}

/** @returns {string | null} the executable path `@playwright/test` launches, installed or not */
export function pinnedChromiumPath() {
  try {
    const require = createRequire(import.meta.url);
    const { chromium } = require('@playwright/test');
    return chromium.executablePath() || null;
  } catch {
    return null;
  }
}

/**
 * @param {{ env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform, home?: string }} [options]
 * @returns {string | null} absolute path of the newest installed Chromium executable
 */
export function newestInstalledChromium(options = {}) {
  const platform = options.platform ?? process.platform;
  const dir = playwrightBrowsersDir(options.env, platform, options.home);
  if (!existsSync(dir)) return null;

  const revisions = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => /^chromium-(\d+)$/.exec(entry.name))
    .filter((match) => match !== null)
    .map((match) => ({ name: match[0], revision: Number(match[1]) }))
    .sort((a, b) => b.revision - a.revision);

  const layouts = EXECUTABLES[platform] ?? EXECUTABLES.linux;
  for (const { name } of revisions) {
    for (const parts of layouts) {
      const candidate = path.join(dir, name, ...parts);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * @param {{ pinned?: string | null, warn?: (text: string) => void, env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform, home?: string }} [options]
 * @returns {string | null}
 */
export function resolveChromePath(options = {}) {
  const warn = options.warn ?? ((text) => process.stderr.write(`${text}\n`));
  const pinned = options.pinned !== undefined ? options.pinned : pinnedChromiumPath();
  if (pinned && existsSync(pinned)) return pinned;
  const fallback = newestInstalledChromium(options);
  if (fallback) {
    warn(
      `WARNING: the Chromium that @playwright/test uses (${pinned ?? 'unknown'}) is not installed. ` +
        `Falling back to ${fallback}, so Lighthouse may not run the e2e browser build. ` +
        'Run: pnpm exec playwright install chromium',
    );
  }
  return fallback;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  const chromePath = resolveChromePath();
  if (chromePath) {
    process.stdout.write(`${chromePath}\n`);
  } else {
    process.stderr.write(
      `No Playwright Chromium found under ${playwrightBrowsersDir()}. Run: pnpm exec playwright install chromium\n`,
    );
    process.exitCode = 1;
  }
}
