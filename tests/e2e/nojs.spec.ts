import { expect, test } from './fixtures';
import { enforceCheck, mainTextProblems } from './helpers/page-checks';
import { discoverPageRoutes, routeLabel, routeUrl } from './helpers/routes';

const CONTENT_REFERENCE = 'design-system/content/';

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

/**
 * The drawer is a `<dialog>` and cannot open without JavaScript, so on a phone the header shows
 * the same `<details>` menus instead. This is the test that keeps that arrangement honest: if the
 * menus were hidden below 1024px unconditionally, a phone with JavaScript off could reach no
 * section and no tool from the header at all.
 */
test.describe('the header navigates without JavaScript', () => {
  if (skipReason) {
    test('route discovery', () => test.skip(true, skipReason));
    return;
  }

  for (const width of [320, 1280]) {
    test(`sections and tools are reachable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(routeUrl(CONTENT_REFERENCE));

      const menus = page.locator('.st-topbar__menus .st-menu');
      await expect(menus, 'the Read and Tools menus').toHaveCount(2);
      await expect(menus.first(), 'the Read menu is not shown without JavaScript').toBeVisible();
      await expect(menus.nth(1), 'the Tools menu is not shown without JavaScript').toBeVisible();

      // A native <details> opens with no script, so the links are reachable.
      await menus.first().locator('summary').click();
      await expect(menus.first().locator('a').first()).toBeVisible();

      await expect(page.locator('.st-topbar__menu-button')).toBeHidden();
      await expect(page.locator('dialog.st-drawer')).toBeHidden();
      // The language switcher is plain links, so it works too.
      await expect(page.locator('.st-topbar__lang a')).toHaveCount(2);
    });
  }
});

test.describe('anchors without JavaScript', () => {
  // Without JavaScript nothing can measure the bar, so it must never be sticky (review WP-20 pass 4).
  for (const width of [375, 1024, 1280]) {
    test(`a heading reached by a link is not hidden under the top bar at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const prefix of ['', 'af/']) {
        const response = await page.goto(`${prefix}core/register/`);
        expect(response?.status()).toBe(200);
        const toc = page.locator(width >= 1280 ? '.st-toc--column' : '.st-toc--details');
        if (width < 1280) await toc.locator('summary').click();
        await toc.locator('a[href="#how-to-register-a-company-yourself"]').click();
        await expect(page).toHaveURL(/#how-to-register-a-company-yourself$/);
        const { barBottom, targetTop } = await page.evaluate(() => ({
          barBottom: document.querySelector('.st-topbar')?.getBoundingClientRect().bottom ?? 0,
          targetTop:
            document.getElementById('how-to-register-a-company-yourself')?.getBoundingClientRect()
              .top ?? -1,
        }));
        expect(
          targetTop,
          `/${prefix} at ${width}px: bar ends at ${barBottom}`,
        ).toBeGreaterThanOrEqual(Math.max(0, barBottom));
      }
    });
  }
});
