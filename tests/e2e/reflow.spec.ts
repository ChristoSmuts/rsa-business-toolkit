import { expect, test } from './fixtures';
import { discoverPageRoutes, routeLabel, routeUrl } from './helpers/routes';

/**
 * WCAG 1.4.10 reflow, on every built page at 320px (WP-50a review pass 2, M2): the document never
 * scrolls sideways. A wide table scrolls inside its own labelled region, which is allowed and does
 * not widen the document. The same check without JavaScript is in `nojs.spec.ts`.
 *
 * Chromium only: the layout is the same in the mobile project, and WebKit is not run here.
 */
const { routes, skipReason } = discoverPageRoutes();

test.describe('no sideways scrolling at 320px', () => {
  if (skipReason) {
    test('route discovery', () => test.skip(true, skipReason));
    return;
  }

  for (const route of routes) {
    test(routeLabel(route), async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'One engine is enough for this sweep.');
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(routeUrl(route));
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const wide = [...document.querySelectorAll('body *')]
          .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 0.5)
          .filter((element) => !element.closest('.st-table-scroll, .st-code, pre'))
          .slice(0, 3)
          .map((element) => `${element.tagName}.${element.className}`);
        return { by: root.scrollWidth - root.clientWidth, wide };
      });
      expect(overflow.by, `wider than the screen: ${overflow.wide.join(', ')}`).toBeLessThanOrEqual(
        0,
      );
    });
  }
});
