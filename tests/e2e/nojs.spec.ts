import { expect, test } from './fixtures';
import { enforceCheck, mainTextProblems } from './helpers/page-checks';
import { discoverPageRoutes, routeLabel, routeUrl } from './helpers/routes';

/**
 * Runs in the `nojs` project (JavaScript disabled): every built page must be readable without
 * scripts. Pages may skip the text minimum only through `tests/e2e/helpers/exceptions.ts`.
 */

const { routes, skipReason } = discoverPageRoutes();

test.describe('readable without JavaScript', () => {
  if (skipReason) {
    test('route discovery', () => test.skip(true, skipReason));
    return;
  }

  for (const route of routes) {
    test(routeLabel(route), async ({ page }) => {
      const response = await page.goto(routeUrl(route));
      expect(response?.status(), 'HTTP status').toBe(200);

      await expect(page.locator('h1').first(), 'visible <h1>').toBeVisible();

      const main = page.locator('main');
      await expect(main, 'one <main>').toHaveCount(1);
      await expect(main).toBeVisible();
      const text = (await main.innerText()).replace(/\s+/g, ' ').trim();
      expect(text.length, '<main> has no text').toBeGreaterThan(0);
      enforceCheck(route, 'nojs-min-text', mainTextProblems(text));

      const jsOnly = page.locator('.js-only');
      const count = await jsOnly.count();
      for (let index = 0; index < count; index++) {
        await expect(jsOnly.nth(index), `.js-only element ${index + 1} of ${count}`).toBeHidden();
      }
    });
  }
});
