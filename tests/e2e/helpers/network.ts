/**
 * The only supported way for a spec to intercept requests. ESLint bans `page.route`,
 * `context.route` and friends in `tests/e2e/**` outside this file and `fixtures.ts`.
 *
 * The handler only ever sees same-origin requests, so it cannot continue or fulfil a request to
 * another origin. The guard in `fixtures.ts` observes every request through the context `request`
 * event anyway, so other-origin requests still fail the test.
 */
import type { BrowserContext, Page, Route } from '@playwright/test';

export async function routeSameOrigin(
  target: Page | BrowserContext,
  baseURL: string | undefined,
  matches: (url: URL) => boolean,
  handler: (route: Route) => Promise<void> | void,
): Promise<void> {
  if (!baseURL) throw new Error('routeSameOrigin needs use.baseURL');
  const origin = new URL(baseURL).origin;
  const predicate = (url: URL): boolean => url.origin === origin && matches(url);
  await target.route(predicate, handler);
}
