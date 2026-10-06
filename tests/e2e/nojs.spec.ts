import { expect, test } from './fixtures';
import { routeSameOrigin } from './helpers/network';
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

/**
 * WP-30: every interactive piece is an enhancement. Without JavaScript the checkboxes still tick
 * and say they are not saved, and no control that needs the store is offered.
 */
test.describe('the interactive pieces without JavaScript', () => {
  test('a checklist ticks, says ticks are not saved, and shows no progress or tools', async ({
    page,
  }) => {
    await page.goto('checklist/');
    const notSaved = page.locator('.st-tasklist__no-js');
    await expect(notSaved).toHaveCount(1);
    await expect(notSaved).toBeVisible();
    await expect(notSaved).toHaveText(
      'JavaScript is off. You can tick items, but the ticks are not saved.',
    );
    await expect(page.locator('.st-tasklist__saved')).toBeHidden();
    await expect(page.locator('st-storage-notice:not([data-show])')).toBeHidden();
    await expect(page.locator('st-checklist-progress').first()).toBeHidden();
    await expect(page.locator('.st-checklist-summary')).toBeHidden();
    await expect(page.locator('dialog.st-dialog')).toBeHidden();
    const box = page.locator('st-checklist input[type="checkbox"]').first();
    await box.check();
    await expect(box).toBeChecked();
    // The links to the other checklists work without the counts.
    await expect(page.locator('#st-checklist-elsewhere ~ ul a').first()).toBeVisible();
  });

  test('prompts show no copy button, and the text is all there', async ({ page }) => {
    await page.goto('branding/branding-prompts/');
    const figure = page.locator('figure.st-code[data-variant="prompt"]').first();
    await expect(figure.locator('pre')).toBeVisible();
    await expect(figure.locator('st-copy button')).toBeHidden();
  });

  test('the table of contents is plain links, with no "Now reading" pill', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('core/register/');
    await expect(page.locator('[data-toc-pill]')).toBeHidden();
    await expect(page.locator('[aria-current="location"]')).toHaveCount(0);
  });

  test('settings say they need JavaScript and offer no controls', async ({ page }) => {
    await page.goto('about/');
    await expect(page.locator('#keyboard-shortcuts')).toBeVisible();
    await expect(
      page.getByText('Some tools need JavaScript. You can still read every page.'),
    ).toBeVisible();
    await expect(page.getByRole('switch')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clear all my data' })).toHaveCount(0);
  });

  test('the home page shows no language banner', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('st-lang-banner')).toBeHidden();
  });
});

/**
 * WP-31: Find my path without JavaScript is one GET form that lands on a pre-rendered result page.
 * One kind of business only (radios); 49 result pages per language.
 */
test.describe('Find my path without JavaScript', () => {
  test('the three questions are one form, and it lands on the result page for the answers', async ({
    page,
  }) => {
    await page.goto('find-my-path/');
    for (const n of [1, 2, 3]) {
      await expect(
        page.getByRole('heading', { name: new RegExp(`Question ${n} of 3`) }),
      ).toBeVisible();
    }
    await expect(page.locator('input[name="type"][type="radio"]')).toHaveCount(7);
    await expect(
      page.getByText('Without JavaScript you can choose one kind of business.'),
    ).toBeVisible();
    const submit = page.getByRole('button', { name: 'See my path' });
    await expect(submit).toHaveCount(0);
    await expect(page.locator('.st-wizard__incomplete')).toBeVisible();
    await expect(page.locator('.st-wizard__fallback')).toBeHidden();

    await page.getByRole('radio', { name: /registered company/ }).check();
    await page.getByRole('radio', { name: /Vehicle dealer/ }).check();
    await expect(submit).toHaveCount(0);
    await page.getByRole('radio', { name: /want to grow/ }).check();
    await expect(submit).toHaveCount(1);
    await expect(page.locator('.st-wizard__incomplete')).toBeHidden();
    await submit.click();

    await page.waitForURL(/\/find-my-path\/result\/pty\/vehicle-dealer\/pty-growing\/\?/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your path');
    await expect(page.locator('.st-step')).toHaveCount(10);
    await expect(page.locator('.st-step').first().getByRole('link')).toHaveAttribute(
      'href',
      /\/core\/start-here\/$/,
    );
    await expect(page.getByText(/your answers are not saved/)).toBeVisible();
  });

  test('a browser without :has() gets a list of every result page instead', async ({
    page,
    baseURL,
  }) => {
    // Such a browser drops every rule of the no-JS wizard CSS, as if it were not there (review
    // WP-31 pass 1, major 2).
    await routeSameOrigin(
      page,
      baseURL,
      (url) => url.pathname.endsWith('/find-my-path/'),
      async (route) => {
        const response = await route.fetch();
        const html = (await response.text()).replace(
          /<style>@supports selector\(:has[^<]*<\/style>/,
          '',
        );
        await route.fulfill({ response, body: html });
      },
    );
    await page.goto('find-my-path/');
    await expect(page.locator('.st-wizard__result:visible')).toHaveCount(0);
    await expect(page.locator('.st-wizard__incomplete')).toBeHidden();
    const list = page.locator('.st-wizard__fallback');
    await expect(list).toBeVisible();
    await list.getByText('Or choose your answers from a list').click();
    await list
      .getByRole('region', { name: /registered company/ })
      .getByRole('link', { name: 'Beauty and personal care: Already trading' })
      .click();
    await page.waitForURL(/\/find-my-path\/result\/pty\/beauty\/trading\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your path');
    await expect(page.getByText(/your answers are not saved/)).toBeVisible();
  });

  test('“Pty Ltd, growing” without a Pty Ltd says why there is no path', async ({ page }) => {
    await page.goto('af/find-my-path/');
    await page.locator('input[name="entity"][value="sole-prop"]').check();
    await page.locator('input[name="type"][value="food"]').check();
    await page.locator('input[name="stage"][value="pty-growing"]').check();
    await expect(page.locator('.st-wizard__result:visible')).toHaveCount(0);
    await expect(page.locator('.st-wizard__pty-only')).toBeVisible();
    await page.locator('input[name="stage"][value="not-started"]').check();
    await page.locator('.st-wizard__result:visible').click();
    await page.waitForURL(/\/af\/find-my-path\/result\/sole-prop\/food\/not-started\/\?/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'af-ZA');
    await expect(page.locator('.st-step')).toHaveCount(9);
  });

  test('My path shows the way to Find my path, and nothing that needs the device', async ({
    page,
  }) => {
    await page.goto('my-path/');
    await expect(page.locator('[data-empty]')).toBeVisible();
    await expect(page.locator('[data-dashboard]')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Find my path' }).last()).toBeVisible();
  });

  test('documents offer no switch and hide nothing', async ({ page }) => {
    await page.goto('core/tax-and-sars/');
    await expect(page.getByRole('switch')).toHaveCount(0);
    await expect(page.locator('#what-sars-wants-from-a-company')).toBeVisible();
    await expect(page.locator('.st-hidden-marker:visible')).toHaveCount(0);
    await page.goto('branding/marketing-prompts/');
    await expect(page.locator('st-prompt-fill button:visible')).toHaveCount(0);
  });
});
