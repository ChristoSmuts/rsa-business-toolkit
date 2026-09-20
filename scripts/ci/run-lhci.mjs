#!/usr/bin/env node
/**
 * Cross-platform launcher for Lighthouse CI (`pnpm lhci`).
 *
 * - Sets CHROME_PATH to the Chromium that @playwright/test uses (scripts/ci/chrome-path.mjs) unless
 *   it is set.
 * - Runs `lhci autorun --config tests/lighthouse/lighthouserc.cjs` once per preset
 *   (LH_PRESETS, default `desktop,mobile`). Every preset runs; the exit code is 1 if any failed.
 * - Prints a summary of every failed assertion at the end, and writes it to the GitHub job summary
 *   and as `::error` annotations when running in GitHub Actions.
 * - Extra arguments are passed to `lhci autorun`.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolveChromePath } from './chrome-path.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const configPath = path.join(repoRoot, 'tests', 'lighthouse', 'lighthouserc.cjs');
const lhciDir = path.join(repoRoot, '.lighthouseci');
const assertionResults = path.join(lhciDir, 'assertion-results.json');
const log = (text) => process.stdout.write(`${text}\n`);
const fail = (text) => process.stderr.write(`${text}\n`);

function lhciBin() {
  const require = createRequire(import.meta.url);
  const packageJson = require.resolve('@lhci/cli/package.json');
  const { bin } = JSON.parse(readFileSync(packageJson, 'utf8'));
  return path.join(path.dirname(packageJson), typeof bin === 'string' ? bin : bin.lhci);
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

const formatValue = (value) =>
  typeof value === 'number' ? String(Math.round(value * 1000) / 1000) : String(value);

/**
 * Failed assertions of the last `lhci assert`, as summary rows. Returns null when lhci wrote no
 * results (collect or the preview server failed). Copies the file into `.lighthouseci/<preset>/`.
 */
function failedAssertions(preset) {
  if (!existsSync(assertionResults)) return null;
  const results = JSON.parse(readFileSync(assertionResults, 'utf8'));
  mkdirSync(path.join(lhciDir, preset), { recursive: true });
  copyFileSync(assertionResults, path.join(lhciDir, preset, 'assertion-results.json'));
  return results
    .filter((result) => !result.passed)
    .map((result) => ({
      preset,
      level: result.level,
      assertion: result.auditProperty
        ? `${result.auditId}.${result.auditProperty}`
        : result.auditId,
      expected: `${result.operator} ${formatValue(result.expected)}`,
      actual: formatValue(result.actual),
      url: result.url,
    }));
}

const env = { ...process.env };
// Astro 7.3 detaches `astro preview` into the background when it detects an AI agent
// (astro/dist/cli/preview/index.js:45) and then refuses --ignore-lock. This internal marker keeps it
// in the foreground; tests/unit/e2e-harness.test.ts fails if an Astro upgrade removes it.
env.ASTRO_PREVIEW_BACKGROUND = '1';
if (!env.CHROME_PATH) {
  const chromePath = resolveChromePath();
  if (chromePath) {
    env.CHROME_PATH = chromePath;
  } else {
    fail(
      'No Playwright Chromium found; falling back to a system Chrome. Run: pnpm exec playwright install chromium',
    );
  }
}
log(`CHROME_PATH=${env.CHROME_PATH ?? '(system Chrome)'}`);

const port = Number(env.LH_PORT ?? 4322);
const presets = (env.LH_PRESETS ?? 'desktop,mobile')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
const bin = lhciBin();
const failed = [];
const rows = [];
const missingResults = [];

for (const preset of presets) {
  if (!(await portIsFree(port))) {
    fail(
      `Port ${port} is already in use. Stop the other server (for example \`pnpm exec astro preview stop\`) or set LH_PORT.`,
    );
    process.exit(1);
  }
  log(`\n==> Lighthouse CI (${preset})`);
  rmSync(assertionResults, { force: true });
  const result = spawnSync(
    process.execPath,
    [bin, 'autorun', `--config=${configPath}`, ...process.argv.slice(2)],
    {
      cwd: repoRoot,
      env: { ...env, LH_PRESET: preset },
      stdio: 'inherit',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) failed.push(`${preset} (exit ${result.status ?? result.signal})`);
  const presetRows = failedAssertions(preset);
  if (presetRows === null) missingResults.push(preset);
  else rows.push(...presetRows);
}

log('\n==> Lighthouse CI summary');
for (const row of rows) {
  log(
    `  [${row.preset}] ${row.level.toUpperCase()} ${row.assertion}: expected ${row.expected}, found ${row.actual}  (${row.url})`,
  );
}
for (const preset of missingResults) {
  log(
    `  [${preset}] lhci failed before assertions (config, collect or preview server), see the log above`,
  );
}
const errors = rows.filter((row) => row.level === 'error');
if (rows.length === 0 && missingResults.length === 0) log('  all assertions passed');

if (process.env.GITHUB_ACTIONS === 'true') {
  for (const row of errors) {
    log(
      `::error title=Lighthouse ${row.preset}: ${row.assertion}::expected ${row.expected}, found ${row.actual} (${row.url})`,
    );
  }
  for (const preset of missingResults) {
    log(
      `::error title=Lighthouse ${preset}::lhci failed before assertions (config, collect or preview server); see the log`,
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ['## Lighthouse CI', ''];
    if (rows.length > 0) {
      lines.push(
        '| Preset | Level | Assertion | Expected | Found | URL |',
        '| --- | --- | --- | --- | --- | --- |',
      );
      for (const row of rows) {
        lines.push(
          `| ${row.preset} | ${row.level} | \`${row.assertion}\` | ${row.expected} | ${row.actual} | ${row.url} |`,
        );
      }
    }
    for (const preset of missingResults)
      lines.push('', `- ${preset}: no assertion results (see the log).`);
    if (rows.length === 0 && missingResults.length === 0) lines.push('All assertions passed.');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
}

if (failed.length > 0) {
  fail(`\nLighthouse CI failed for: ${failed.join(', ')}. Reports: .lighthouseci/<preset>/`);
  process.exitCode = 1;
} else {
  log(`\nLighthouse CI passed for: ${presets.join(', ')}. Reports: .lighthouseci/<preset>/`);
}
