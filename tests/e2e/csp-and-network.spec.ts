import { expect, test } from './fixtures';
import {
  overdueExceptions,
  overdueWarningCommand,
  PAGE_CHECK_EXCEPTIONS,
  validateExceptions,
} from './helpers/exceptions';
import {
  baseElementProblems,
  cspMetaProblems,
  documentUrlProblems,
  enforceCheck,
  inlineScriptProblems,
  referrerMetaProblems,
} from './helpers/page-checks';
import {
  allHtmlRoutes,
  assertRoutesAgree,
  discoverPageRoutes,
  routeLabel,
  routeUrl,
} from './helpers/routes';

/**
 * Page contract for every built page: HTTP 200, language, one h1, title, viewport, the exact ADR 0005
 * meta CSP and referrer meta, no `<base>`, no inline scripts, and URL rules (base path, `#fragment`
 * links resolve to the page, no third-party resources or hints, no other-origin form targets or
 * meta refresh). Console errors, CSP violations and requests to other origins fail every test through
 * the automatic guard in `fixtures.ts`. Pages may skip a named check only through
 * `tests/e2e/helpers/exceptions.ts`.
 */

const { routes, skipReason } = discoverPageRoutes();

test.describe('page contract', () => {
  if (skipReason) {
    test('route discovery', () => test.skip(true, skipReason));
    return;
  }

  test('sitemap and built HTML list the same routes', () => {
    test.skip(
      test.info().project.name !== 'chromium',
      'Build-output check; chromium runs it once.',
    );
    assertRoutesAgree();
  });

  test('page check exceptions are valid and point at built pages', () => {
    test.skip(
      test.info().project.name !== 'chromium',
      'Build-output check; chromium runs it once.',
    );
    const built = new Set(allHtmlRoutes());
    const problems = [
      ...validateExceptions(),
      ...PAGE_CHECK_EXCEPTIONS.filter((entry) => !built.has(entry.route)).map(
        (entry) => `exception for route "${entry.route}": no such page in dist/, remove the entry`,
      ),
    ];
    // An entry whose optional review date has passed is recorded, not failed (see exceptions.ts).
    // The HTML report is only uploaded when the run fails, so in CI the warning also goes out as a
    // workflow command: those show up in the run summary of a green run.
    for (const overdue of overdueExceptions()) {
      test.info().annotations.push({ type: 'exception-overdue', description: overdue });
      process.stdout.write(`[e2e] overdue page check exception: ${overdue}\n`);
      if (process.env.CI) process.stdout.write(`${overdueWarningCommand(overdue)}\n`);
    }
    expect(problems, 'tests/e2e/helpers/exceptions.ts').toEqual([]);
  });

  for (const route of routes) {
    test(routeLabel(route), async ({ page, basePath }) => {
      const response = await page.goto(routeUrl(route));
      expect(response?.status(), 'HTTP status').toBe(200);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('html')).toHaveAttribute('lang', /^(en|af)(-|$)/i);
      await expect(page.locator('h1'), 'exactly one <h1>').toHaveCount(1);
      await expect(page.locator('head > title'), 'one <title> in <head>').toHaveCount(1);
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator('meta[name="viewport"]'), 'viewport meta').toHaveCount(1);

      enforceCheck(route, 'csp-meta', await cspMetaProblems(page));
      enforceCheck(route, 'referrer-meta', await referrerMetaProblems(page));
      enforceCheck(route, 'no-base-element', await baseElementProblems(page));
      enforceCheck(route, 'no-inline-script', await inlineScriptProblems(page));

      expect(await documentUrlProblems(page, basePath), `URL problems on /${route}`).toEqual([]);
    });
  }
});
