/**
 * `webServer` command for the Playwright suites (see playwright.config.ts).
 *
 * Playwright starts `webServer` before `globalSetup` and before it loads any spec, so the build
 * check lives here: it runs first and stops the run with a `pnpm build` hint when `dist/` is
 * missing or incomplete. Then it runs `astro preview --ignore-lock` in the foreground with the
 * given arguments. `PW_DEV=1` does not use this launcher (the config starts `astro dev` directly).
 *
 * Usage: tsx tests/e2e/helpers/web-server.ts --host 127.0.0.1 --port 4321
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normaliseBase, resolveDistRoot } from '../../../scripts/dist/audit-links';

/** A readable message when `distDir` cannot be served, or null when the build looks complete. */
export function buildOutputProblem(distDir: string, rawBase: string | undefined): string | null {
  const base = normaliseBase(rawBase);
  const hint = `Run \`pnpm build\` first (BASE_PATH=${base}), or \`pnpm test:e2e:dev\` to test against astro dev.`;
  if (!existsSync(distDir)) return `No build output: ${distDir} does not exist. ${hint}`;
  const root = resolveDistRoot(distDir, base);
  if (!existsSync(path.join(root, 'index.html'))) {
    return `The build is incomplete: no index.html in ${root}. ${hint}`;
  }
  return null;
}

/**
 * Astro 7.3 (`astro/dist/cli/preview/index.js`, line 45) moves `astro preview` into the background
 * when it detects an AI agent, and then refuses `--ignore-lock`. This internal marker, which Astro
 * sets on its own background child, keeps the server in the foreground so Playwright owns it.
 * `tests/unit/e2e-harness.test.ts` fails if an Astro upgrade removes the marker.
 */
export const PREVIEW_FOREGROUND_ENV = { ASTRO_PREVIEW_BACKGROUND: '1' } as const;

function main(): void {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const problem = buildOutputProblem(path.join(repoRoot, 'dist'), process.env.BASE_PATH);
  if (problem) {
    process.stderr.write(`\n[e2e] ${problem}\n\n`);
    process.exit(1);
  }
  const astroBin = path.join(repoRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const child = spawn(
    process.execPath,
    [astroBin, 'preview', '--ignore-lock', ...process.argv.slice(2)],
    { cwd: repoRoot, stdio: 'inherit', env: { ...process.env, ...PREVIEW_FOREGROUND_ENV } },
  );
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => child.kill(signal));
  }
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) main();
