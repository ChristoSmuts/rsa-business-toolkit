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
