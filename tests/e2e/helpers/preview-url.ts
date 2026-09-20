/**
 * The preview server URL the e2e suites run against, in one place.
 *
 * `playwright.config.ts` builds `use.baseURL` and the `webServer` URL from these, and the
 * worker-scoped half of the guards (`tests/e2e/fixtures.ts`) needs the same origin *before* any
 * test-scoped fixture exists: `baseURL` is a test-scoped option, so a worker fixture cannot read it,
 * and `test.beforeAll` runs before every test-scoped fixture. The guard fixture compares the two and
 * fails the test if they ever disagree, so this module cannot drift from `use.baseURL`.
 *
 * This module has no Playwright import, so the unit tests can load it.
 */
import { normaliseBase } from '../../../scripts/base-path';

export const DEFAULT_PREVIEW_PORT = 4321;

/** Port of the preview server: `PW_PORT`, default 4321. */
export function previewPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PW_PORT?.trim();
  if (!raw) return DEFAULT_PREVIEW_PORT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 65535) {
    throw new Error(`PW_PORT must be a TCP port number, got "${raw}".`);
  }
  return value;
}

/** Origin of the preview server, for example `http://127.0.0.1:4321`. */
export function previewOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return `http://127.0.0.1:${previewPort(env)}`;
}

/** Origin plus base path, for example `http://127.0.0.1:4321/business-toolkit/`. */
export function previewBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return `${previewOrigin(env)}${normaliseBase(env.BASE_PATH)}`;
}
