import { expect, test } from './fixtures';
import { chromiumAxName } from './helpers/ax';
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
 * The drawer is a `<dialog>` and cannot open without JavaScript. Until WP-50 Phase 3, item 5 the
 * header then showed the Read and Tools menus stacked below 1024px (213px, three rows, and on a
 * landscape phone the page started below the screen). Now Menu is a link to the footer's site map,
 * which lists every section and tool, and the header stays one row. From 1024px the header's own
 * `<details>` menus work with no script. This keeps both honest: if Menu went nowhere, or the map
 * lost a link the menus have, a phone with JavaScript off could not reach it from the header.
 */
test.describe('the header navigates without JavaScript', () => {
  if (skipReason) {
    test('route discovery', () => test.skip(true, skipReason));
    return;
  }

  test('below 1024px, Menu is one row away from every section and tool, in the footer', async ({
    page,
  }) => {
    for (const [width, height] of [
      [320, 568],
      [568, 320],
      [768, 1024],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(routeUrl(CONTENT_REFERENCE));
      const bar = await page.locator('header.st-topbar').boundingBox();
      expect(bar?.height ?? Infinity, `the bar at ${width}px`).toBeLessThanOrEqual(62);
      await expect(page.locator('.st-topbar__menus')).toBeHidden();
      await expect(page.locator('.st-topbar__menu-button')).toBeHidden();
      await expect(page.locator('dialog.st-drawer')).toBeHidden();
      // The language link is a plain link, so it works too.
      await expect(page.locator('.st-topbar__lang a')).toHaveCount(1);
      await expect(page.locator('.st-topbar__lang a')).toBeVisible();

      const menu = page.locator('a.st-topbar__menu-link');
      await expect(menu).toBeVisible();
      await expect(menu).toHaveText('Menu');
      const box = await menu.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      await menu.click();
      await expect(page).toHaveURL(/#st-site-map$/);
      const map = page.locator('footer #st-site-map');
      await expect(map).toBeInViewport();
      // Every link the header's menus hold (they are in the HTML, hidden at this width).
      const menuLinks = await page
        .locator('.st-topbar__menus a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      const mapLinks = await map
        .locator('a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      expect(menuLinks.length).toBeGreaterThanOrEqual(10);
      // The Tools menu's "Light or dark" is a jump within the page, to the footer itself.
      for (const href of menuLinks.filter((link) => !link?.startsWith('#'))) {
        expect(mapLinks, `${width}px`).toContain(href);
      }
    }
  });

  // Review pass 1, m4 and m5: both are fragment links, so they work with no script.
  test('"Light or dark" and "Back to top" work with no script', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('af/core/tax-and-sars/');
    const tools = page.locator('.st-topbar__menus .st-menu').nth(1);
    await tools.locator('summary').click();
    await tools.locator('a[href="#st-theme"]').click();
    await expect(page.locator('#st-theme')).toBeFocused();
    // Without a script the footer says the theme follows the device.
    await expect(page.locator('#st-theme .no-js-only')).toBeVisible();
    await page.locator('footer a[href="#top"]').click();
    await expect(page).toHaveURL(/#top$/);
    await expect(page.locator('header.st-topbar')).toBeInViewport();
  });

  test('from 1024px, the Read and Tools menus open with no script', async ({ page }) => {
    for (const width of [1024, 1280]) {
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
      await expect(page.locator('.st-topbar__menu-link')).toBeHidden();
      await expect(page.locator('dialog.st-drawer')).toBeHidden();
      await expect(page.locator('.st-topbar__lang a')).toHaveCount(1);
      const bar = await page.locator('header.st-topbar').boundingBox();
      expect(bar?.height ?? Infinity, `the bar at ${width}px`).toBeLessThanOrEqual(62);
    }
  });
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
 * Search without JavaScript (WP-33, build plan C2): the header control is a plain link to the search
 * page, whose GET form reloads it with `?q=`. The page says search needs JavaScript and answers
 * with every page of the guide; the results region and the dialog stay hidden.
 */
test.describe('search without JavaScript', () => {
  test('the header search control is a link to the search page', async ({ page, basePath }) => {
    await page.goto('core/register/');
    const control = page.locator('.st-topbar__search');
    await expect(control).toHaveAttribute('href', `${basePath}search/`);
    await control.click();
    await expect(page).toHaveURL(new RegExp(`${basePath}search/$`));
    await expect(page.locator('dialog.st-search-dialog')).toBeHidden();
  });

  for (const prefix of ['', 'af/']) {
    test(`/${prefix}search/?q= submits to itself and lists every page`, async ({
      page,
      basePath,
    }) => {
      await page.goto(`${prefix}search/`);
      await page.locator('#st-search-q').fill('VAT264');
      await page.locator('#st-search-q').press('Enter');
      await expect(page).toHaveURL(new RegExp(`${basePath}${prefix}search/\\?q=VAT264$`));
      await expect(page.locator('.no-js-only').getByRole('link').first()).toHaveAttribute(
        'href',
        `${basePath}${prefix}contents/`,
      );
      await expect(page.locator('[data-search-region]')).toBeHidden();
      const pages = page.locator('.st-search__pages a');
      expect(await pages.count(), 'every page of the guide is linked').toBeGreaterThanOrEqual(36);
      await expect(pages.first()).toHaveAttribute('href', new RegExp(`^${basePath}${prefix}`));
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

  test('the stoep and the card set need no script (WP-50 Phase 3)', async ({ page, basePath }) => {
    // The home AI line starts on the first screen of a 320×568 phone without JavaScript too.
    await page.setViewportSize({ width: 320, height: 568 });
    for (const route of ['./', 'af/']) {
      await page.goto(route);
      const box = await page.locator('.st-home__ai-line').boundingBox();
      expect(box?.y ?? Infinity, route).toBeLessThanOrEqual(568 - 44);
    }
    await page.goto('./');
    await expect(page.locator('.st-stoep__steps > li')).toHaveCount(3);
    await page.locator('.st-stoep__link').click();
    await expect(page).toHaveURL(new RegExp(`${basePath}find-my-path/$`));
    await page.goto('paperwork/');
    await page
      .locator('.st-card[data-variant="tool"]')
      .first()
      .getByRole('link', { name: /^Open template: / })
      .click();
    await expect(page).toHaveURL(/\/templates\/quotation\/$/);
  });

  test('a business type’s facts, "Go straight to" and stacked tables need no script (WP-50 Phase 3, item 3)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('af/business-types/food/');
    await expect(page.locator('.st-type-facts .st-effort__value')).toHaveText('Hoog');
    await expect(page.locator('.st-type-facts__reason')).toContainText(
      'Certificate of Acceptability',
    );
    await page.locator('.st-type-jump a[href="#realistic-timing"]').click();
    await expect(page).toHaveURL(/#realistic-timing$/);
    await expect(page.locator('#realistic-timing')).toBeInViewport();
    await page.goto('af/business-types/');
    const regions = page.locator('st-table-scroll[data-stack="rows"]');
    await expect(regions).toHaveCount(2);
    for (const region of await regions.all()) {
      expect(await region.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    }
  });
});

/**
 * WP-32: without JavaScript a template page is a form that prints as the sheet: the fields are
 * there and can be typed in, the preview, tabs, required items and buttons are not, one line says
 * how to print, and print media shows only the form with what was typed.
 */
test.describe('a template without JavaScript', () => {
  test('is a form to type in, with no preview or buttons that need a script', async ({ page }) => {
    await page.goto('templates/quotation/');
    await expect(page.getByText('To print, use your browser’s Print command.')).toBeVisible();
    await expect(page.locator('.st-tool__preview')).toBeHidden();
    await expect(page.locator('.st-tool__tabs')).toBeHidden();
    await expect(page.locator('.st-tool__required')).toBeHidden();
    await expect(page.locator('.st-tool__actions')).toBeHidden();
    await expect(page.locator('[data-add-line]')).toBeHidden();
    // Every line row shows, so a longer quote can still be written.
    await expect(page.locator('.st-tline')).toHaveCount(10);
    await expect(page.locator('.st-tline').last()).toBeVisible();
    await page.getByLabel('Customer name').fill('Thandi');
    await expect(page.getByLabel('Customer name')).toHaveValue('Thandi');
    await expect(page.getByText('Without JavaScript the totals are not worked out.')).toBeVisible();
  });

  test('prints the form as the sheet, with what was typed and the template’s own text', async ({
    page,
  }) => {
    await page.goto('templates/privacy-notice/');
    await page.getByLabel('Business name').fill('Mokoena Repairs');
    await page.emulateMedia({ media: 'print' });
    const form = page.locator('form.st-tform');
    await expect(form).toBeVisible();
    await expect(page.locator('.st-tform__print-title')).toHaveText('PRIVACY NOTICE');
    await expect(page.getByLabel('Business name')).toHaveValue('Mokoena Repairs');
    await expect(form.getByText('We keep records for five years')).toBeVisible();
    for (const hidden of [
      'body > header',
      'body > footer',
      '.st-ai-notice',
      '#sources-for-this-page',
      // Exactly one sheet: the unfilled preview never prints (review WP-32 pass 1, major 1).
      '.st-tool__preview',
      '.st-tsheet',
      '.st-tgroup__omit',
    ]) {
      await expect(page.locator(hidden).first(), hidden).toBeHidden();
    }
    await expect(page.locator('[data-print-sheet]')).toHaveCount(1);
    // No site badge on the document (review pass 2, minor 4).
    expect(await form.innerText()).not.toContain('Official');
    // The sheet uses the page width.
    const width = await form.evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBeGreaterThan((page.viewportSize()?.width ?? 0) * 0.8);
  });

  test('leaving out the only paragraph of a section leaves out its heading (review pass 2, minor 5)', async ({
    page,
  }) => {
    await page.goto('templates/privacy-notice/');
    await page.locator('#marketing').getByRole('checkbox').check();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#marketing')).toBeHidden();
    await expect(page.locator('#your-rights')).toBeVisible();
    await expect(page.locator('#how-long-we-keep-it')).toBeVisible();
  });

  test('a section left out with its list emptied does not print (review pass 3, minor 1)', async ({
    page,
  }) => {
    await page.goto('templates/privacy-notice/');
    const section = page.locator('#who-we-share-it-with');
    await section.getByRole('checkbox').check();
    await section.getByRole('textbox').fill('');
    await page.emulateMedia({ media: 'print' });
    await expect(section).toBeHidden();
    await expect(page.locator('#how-long-we-keep-it')).toBeVisible();
  });

  test('prints an empty receipt slot blank: no sample, no date pattern, no focus ring', async ({
    page,
  }) => {
    await page.goto('templates/receipt/');
    const date = page.getByLabel('Date received');
    // A text field without JavaScript, so an empty one prints blank (pass 1, minor 8).
    await expect(date).toHaveAttribute('type', 'text');
    await page.getByLabel('Business name').fill('Mokoena Repairs');
    await date.focus();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-print-sheet]')).toHaveCount(1);
    await expect(page.locator('.st-tsheet')).toBeHidden();
    const style = await date.evaluate((input) => {
      const placeholder = getComputedStyle(input, '::placeholder');
      const own = getComputedStyle(input);
      return {
        placeholder: placeholder.color,
        outline: own.outlineStyle,
        line: own.borderBottomColor,
        text: getComputedStyle(input.closest('form') ?? input).color,
      };
    });
    expect(style.placeholder).toBe('rgba(0, 0, 0, 0)');
    expect(style.outline).toBe('none');
    // The line under a focused field prints in the text colour, not the focus colour.
    expect(style.line).toBe(style.text);
    // The form shows only what was typed: the samples are not values.
    const values = await page
      .locator('form.st-tform input:not([type="checkbox"])')
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    expect(values.filter((value) => /INV-0001|R 0\.00/.test(value))).toEqual([]);
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
    await expect(page.getByText('Choose your path from this list')).toBeHidden();

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
    // Open from the start, and saying it is the way on (review WP-31 pass 2, minor 5).
    await expect(list).toHaveAttribute('open', '');
    await expect(list.locator('summary')).toHaveText('Choose your path from this list');
    await expect(list.getByText(/Your browser cannot show the button/)).toBeVisible();
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

/**
 * WP-50a, item 1: without JavaScript the AI notice must start on the first screen of a 320×568
 * phone, with its label row in view (Stoep rule 9, ADR 0006). The header carried every menu then
 * (213px); since WP-50 Phase 3, item 5 it is one row (61px) with or without JavaScript. "Words used on this page" is closed (at every width since WP-50 Phase 3).
 */
test.describe('the AI notice on a 320×568 screen without JavaScript', () => {
  for (const route of [
    'business-types/vehicle-dealer/',
    'core/tax-and-sars/',
    'templates/invoice/',
    'af/business-types/vehicle-dealer/',
    'af/core/tax-and-sars/',
    'af/templates/invoice/',
  ]) {
    test(`${route}: starts on the first screen`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(route);
      const box = await page.locator('.st-ai-notice').boundingBox();
      expect(box?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(568 - 44);
    });
  }

  // WP-50 Phase 3 review passes 1 and 2: without JavaScript the header carried every menu (213px
  // below 1024px), and on a landscape phone the notice missed the first screen on every page at
  // 568×320 and 640 to 800×360, and on pages with a two-line H1 up to 915×412. With the one-row
  // header (item 5) the label row is on the first screen at every size here, on the longest-titled
  // pages too (AF start here, AF beauty); see docs/design-system.md, "AI notice".
  for (const [width, height] of [
    [360, 740],
    [412, 915],
    [568, 320],
    [640, 360],
    [800, 360],
    [844, 390],
    [915, 412],
  ] as const) {
    test(`the AI notice is on the first screen at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      for (const route of [
        'business-types/vehicle-dealer/',
        'af/business-types/vehicle-dealer/',
        'af/start/start-here/',
        'af/business-types/beauty/',
      ]) {
        await page.goto(route);
        const box = await page.locator('.st-ai-notice').boundingBox();
        expect(box?.y ?? Number.POSITIVE_INFINITY, route).toBeLessThanOrEqual(height - 44);
      }
    });
  }

  test('"Words used on this page" is closed, and opens with no script', async ({ page }) => {
    await page.goto('business-types/vehicle-dealer/');
    const words = page.locator('details#words-used-in-this-file');
    await expect(words).not.toHaveAttribute('open');
    await words.locator('summary').click();
    await expect(words).toHaveAttribute('open', '');
  });

  // WP-50 Phase 3: on a phone the sources past the first three wait behind a native checkbox.
  test('the rest of "Sources for this page" opens with no script', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('business-types/vehicle-dealer/');
    const sources = page.locator('section.st-sources');
    const rest = sources.locator('.st-sources__rest li.st-source');
    await expect(rest.first()).toBeHidden();
    // A tap on the label row lands on the transparent checkbox that covers it.
    await sources.locator('.st-sources__toggle').click();
    await expect(rest.first()).toBeVisible();
  });

  // Main repair review pass 2, blocker 1: the name in Chromium's own tree is the visible phrase.
  for (const prefix of ['', 'af/']) {
    test(`/${prefix}business-types/vehicle-dealer/: the browser names the sources control with its words`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(`${prefix}business-types/vehicle-dealer/`);
      const label = page.locator('section.st-sources .st-sources__more-label');
      const toggle = page.locator('section.st-sources .st-sources__toggle');
      const visible = ((await label.textContent()) ?? '').trim();
      expect(visible.length).toBeGreaterThan(10);
      expect(await chromiumAxName(page, '.st-sources__toggle')).toBe(visible);
      await toggle.click();
      await expect(toggle).toBeChecked();
      expect(await chromiumAxName(page, '.st-sources__toggle')).toBe(visible);
    });
  }

  test('every source shows at 768px and prints with no script', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('business-types/vehicle-dealer/');
    const rest = page.locator('section.st-sources .st-sources__rest li.st-source');
    await expect(rest.last()).toBeVisible();
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ media: 'print' });
    await expect(rest.last()).toBeVisible();
  });
});

/** WCAG 1.4.10 at 320px without JavaScript (WP-50a review pass 2, M2; with it: `reflow.spec.ts`). */
test.describe('no sideways scrolling at 320px without JavaScript', () => {
  if (skipReason) {
    test('route discovery', () => test.skip(true, skipReason));
    return;
  }
  for (const route of routes) {
    test(routeLabel(route), async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(routeUrl(route));
      const by = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(by).toBeLessThanOrEqual(0);
    });
  }
});
