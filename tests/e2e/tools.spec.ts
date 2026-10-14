import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chromiumAxName } from './helpers/ax';

/**
 * WP-50 Phase 3, item 4: the tools (Find my path, My path, the templates, the checklist, the
 * confirm dialogs and the search dialog) on a phone, as one product.
 *
 * - Find my path: below 30rem the stepper is a bar of three segments, its words visually hidden
 *   but still in the accessibility tree; a question already answered is marked done (a tick, not
 *   colour alone); the last question shows "Your answers so far" with a "Change" for each, which
 *   goes back with the answers kept.
 * - My path: the first step not done says "Do this next"; "Edit answers" is a button-shaped link.
 * - The templates: on a phone a group has no frame, the missing required items wrap as one
 *   paragraph of 44px links, and the actions have a heading.
 * - The checklist: every tick row is a 44px target.
 * - A confirm dialog is centred with the page's gutter, its two choices one per row on a phone.
 * - The search dialog: the glossary is a link where the no-results line points at it.
 * - Nothing scrolls sideways at 320px, in either language.
 *
 * The tests that set their own sizes skip the `mobile` project, which has its own.
 */
const PHONE = { width: 320, height: 568 } as const;
const LANGS = ['', 'af/'] as const;

async function noSidewaysScroll(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${label}: sideways scroll`).toBeLessThanOrEqual(0);
}

async function minHeight(locator: Locator): Promise<number> {
  const boxes = await locator.evaluateAll((elements) =>
    elements
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => element.getBoundingClientRect().height),
  );
  return Math.min(...boxes);
}

/** Top of an element in page pixels, after the web fonts. */
async function pageTop(locator: Locator): Promise<number> {
  return locator.evaluate(async (element) => {
    await document.fonts.ready;
    return element.getBoundingClientRect().top + window.scrollY;
  });
}

async function startWizard(page: Page, lang: string): Promise<void> {
  await page.goto(`${lang}find-my-path/`);
  await expect(page.locator('st-wizard[data-ready]')).toHaveCount(1);
}

async function answerTwo(page: Page): Promise<void> {
  await page.locator('input[name="entity"][value="sole-prop"]').check();
  await page.locator('[data-step="entity"] [data-next]').click();
  await page.locator('input[name="type"][value="food"]').check();
  await page.locator('input[name="type"][value="general"]').check();
  await page.locator('[data-step="type"] [data-next]').click();
  await expect(page.locator('[data-stepper="2"]')).toHaveAttribute('aria-current', 'step');
}

test.describe('Find my path on a phone', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize(PHONE);
  });

  for (const lang of LANGS) {
    test(`/${lang}find-my-path/ at 320px: the stepper is one bar and the first answer is higher`, async ({
      page,
    }) => {
      await startWizard(page, lang);
      const stepper = page.locator('.st-wizard__stepper');
      const box = await stepper.boundingBox();
      expect(box?.height ?? 99, 'the stepper is one row of bars').toBeLessThanOrEqual(8);
      const items = await stepper
        .locator(':scope > li')
        .evaluateAll((lis) => lis.map((li) => Math.round(li.getBoundingClientRect().top)));
      expect(new Set(items).size, 'three segments on one row').toBe(1);
      // At `ea15b4a` the first answer started 780px (EN) and 803px (AF) down at 320×568; with the
      // stepper's two rows of words gone and the heading a size smaller it is 635px in both. The
      // rest of the first screen is the header (Phase 3, item 5).
      const first = page.locator('[data-step="entity"] .st-choice').first();
      expect(await pageTop(first)).toBeLessThanOrEqual(650);
      await noSidewaysScroll(page, `${lang}find-my-path/ step 1`);
    });
  }

  test('the stepper keeps its words for assistive technology (Chromium tree)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Reads the tree over CDP, which only Chromium has.');
    await startWizard(page, '');
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Accessibility.enable');
      const { nodes } = await session.send('Accessibility.getFullAXTree');
      const list = nodes.find(
        (node) => node.role?.value === 'list' && node.name?.value === 'Questions',
      );
      expect(list, 'the stepper is a list named "Questions"').toBeDefined();
      const texts = nodes
        .filter((node) => node.role?.value === 'StaticText' && !node.ignored)
        .map((node) => String(node.name?.value ?? ''));
      for (const words of ['Step 1 of 3', 'How you trade', 'Step 2 of 3', 'Kind of business'])
        expect(texts, `"${words}" is in the tree`).toContain(words);
    } finally {
      await session.detach();
    }
    // And the list is not named from anything visually hidden by mistake.
    expect(await chromiumAxName(page, '.st-wizard__stepper')).toBe('Questions');
  });

  for (const lang of LANGS) {
    test(`/${lang}find-my-path/: answers so far, with "Change" that keeps them`, async ({
      page,
    }) => {
      await startWizard(page, lang);
      await answerTwo(page);
      // Done steps: the bar filled and a tick drawn in the padding (not colour alone).
      const tick = await page
        .locator('[data-stepper="0"] .st-wizard__stepper-n')
        .evaluate((element) => getComputedStyle(element, '::before').borderRightWidth);
      expect(tick).toBe('2px');
      const summary = page.locator('[data-step="stage"] [data-summary]');
      await expect(summary).toBeVisible();
      await expect(summary.locator('[data-summary-answer="entity"]')).toHaveText(
        lang ? 'In my eie naam (eenmansaak)' : 'In my own name (sole proprietor)',
      );
      await expect(summary.locator('[data-summary-answer="type"]')).toHaveText(
        lang
          ? 'Kosbesigheid, Algemeen: ek verkoop of doen baie dinge'
          : 'Food business, General: I sell or do many things',
      );
      const change = summary.locator('[data-go]');
      await expect(change).toHaveCount(2);
      expect(await minHeight(change)).toBeGreaterThanOrEqual(44);
      await noSidewaysScroll(page, `${lang}find-my-path/ step 3`);

      await change.nth(1).click();
      await expect(page.locator('#wz-h-type')).toBeFocused();
      await expect(page.locator('input[name="type"][value="food"]')).toBeChecked();
      await expect(page.locator('input[name="type"][value="general"]')).toBeChecked();
      await page.locator('[data-step="type"] [data-next]').click();
      await expect(page.locator('#wz-h-stage')).toBeFocused();
      await expect(summary.locator('[data-summary-answer="type"]')).toContainText(
        lang ? 'Kosbesigheid' : 'Food business',
      );
    });
  }
});

test.describe('My path on a phone', () => {
  const PROFILE = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' };

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize(PHONE);
  });

  for (const lang of LANGS) {
    test(`/${lang}my-path/ at 320px: "Do this next" moves on as steps are done`, async ({
      page,
      seedStorage,
    }) => {
      await seedStorage({ 'st.profile.v1': PROFILE });
      await page.goto(`${lang}my-path/`);
      const steps = page.locator('[data-steps] > li:not([hidden])');
      await expect(steps.first()).toBeVisible();
      const next = page.locator('[data-steps] > li[data-next]');
      await expect(next).toHaveCount(1);
      await expect(next).toHaveAttribute('data-n', '1');
      await expect(next.locator('[data-next-badge]')).toHaveText(
        lang ? 'Doen dit volgende' : 'Do this next',
      );
      await next.locator('[data-mark]').click();
      await expect(page.locator('[data-steps] > li[data-next]')).toHaveAttribute('data-n', '2');
      await expect(page.locator('[data-steps] [data-next-badge]:visible')).toHaveCount(1);

      // The way to change the answers is a button, above the path.
      const edit = page.getByRole('link', { name: lang ? 'Wysig antwoorde' : 'Edit answers' });
      await expect(edit).toHaveClass(/st-btn/);
      expect((await edit.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(await pageTop(edit)).toBeLessThan(await pageTop(page.locator('#my-path-steps')));
      await noSidewaysScroll(page, `${lang}my-path/`);
    });
  }
});

test.describe('the templates on a phone', () => {
  test.skip(({ isMobile }) => isMobile, 'Sets its own widths.');

  for (const lang of LANGS) {
    test(`/${lang}templates/tax-invoice/ at 320px: no frames, wrapped required items, labelled actions`, async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await page.goto(`${lang}templates/tax-invoice/`);
      await expect(page.locator('st-template-form[data-ready]')).toHaveCount(1);
      const frame = await page
        .locator('.st-tgroup')
        .first()
        .evaluate((element) => getComputedStyle(element).borderTopWidth);
      expect(frame, 'a group has no frame on a phone').toBe('0px');
      // A field takes the column's width: 288px at 320px (254px in a frame).
      const field = await page.locator('.st-tgroup input:visible').first().boundingBox();
      expect(field?.width ?? 0).toBeGreaterThanOrEqual(286);

      const links = page.locator('[data-missing] li:not([hidden]) a');
      expect(await links.count()).toBeGreaterThan(4);
      expect(await minHeight(links), 'each missing item is a 44px target').toBeGreaterThanOrEqual(
        44,
      );
      const tops = await links.evaluateAll((all) =>
        all.map((link) => Math.round(link.getBoundingClientRect().top)),
      );
      expect(new Set(tops).size, 'the links share rows').toBeLessThan(tops.length);

      const heading = page.locator('#st-tool-actions-heading');
      await expect(heading).toHaveText(lang ? 'As jy klaar is' : 'When you are done');
      const print = page.locator('[data-print]');
      expect(await pageTop(print)).toBeGreaterThan(await pageTop(heading));
      await noSidewaysScroll(page, `${lang}templates/tax-invoice/`);
    });
  }

  test('the groups keep their frame where form and preview sit side by side', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('templates/tax-invoice/');
    const frame = await page
      .locator('.st-tgroup')
      .first()
      .evaluate((element) => getComputedStyle(element).borderTopWidth);
    expect(frame).toBe('1px');
  });
});

test.describe('the checklist and the confirm dialog on a phone', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize(PHONE);
  });

  for (const lang of LANGS) {
    test(`/${lang}checklist/ at 320px: 44px tick rows and a centred "Remove all ticks?"`, async ({
      page,
    }) => {
      await page.goto(`${lang}checklist/`);
      const rows = page.locator('st-checklist .st-check');
      expect(await minHeight(rows)).toBeGreaterThanOrEqual(44);
      const padding = await page
        .locator('.st-tasklist')
        .first()
        .evaluate((element) => getComputedStyle(element).paddingInlineStart);
      expect(padding).toBe('12px');
      await noSidewaysScroll(page, `${lang}checklist/`);

      await page.locator('st-checklist input[type="checkbox"]').first().check();
      await page.locator('[data-checklist-reset]').click();
      const dialog = page.locator('dialog#st-checklist-reset');
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      const left = box?.x ?? 0;
      const right = PHONE.width - left - (box?.width ?? 0);
      expect(left, 'gutter on the start side').toBeGreaterThanOrEqual(15);
      expect(Math.abs(left - right), 'centred').toBeLessThanOrEqual(1);
      const top = box?.y ?? 0;
      expect(top, 'not against the top edge').toBeGreaterThan(15);
      const buttons = dialog.locator('.st-btn');
      const widths = await buttons.evaluateAll((all) =>
        all.map((button) => Math.round(button.getBoundingClientRect().width)),
      );
      expect(widths[0], 'the two choices are one width').toBe(widths[1]);
      // The safe choice first, and focused.
      await expect(buttons.first()).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(page.locator('st-checklist input[type="checkbox"]').first()).toBeChecked();
    });
  }
});

test.describe('the search dialog on a phone', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize(PHONE);
  });

  for (const lang of LANGS) {
    test(`/${lang}: no results points at the glossary, and the glossary is a link`, async ({
      page,
    }) => {
      await page.goto(`${lang}business-types/food/`);
      await page.waitForLoadState('networkidle');
      await page.keyboard.press('Control+k');
      const dialog = page.locator('dialog.st-search-dialog');
      await expect(dialog).toBeVisible();
      const input = dialog.locator('.st-search-dialog__input');
      expect((await input.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      await input.fill('zzqxv');
      await expect(dialog.locator('[role="status"]')).toContainText('zzqxv');
      const glossary = dialog.locator('[data-search-empty] .st-search-dialog__more a').last();
      await expect(glossary).toHaveText(
        lang ? 'Slaan ’n woord in die woordelys na' : 'Look a word up in the glossary',
      );
      expect(await glossary.getAttribute('href')).toMatch(/\/glossary\/$/);
      const overflow = await dialog.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      );
      expect(overflow, 'nothing in the dialog scrolls sideways').toBeLessThanOrEqual(0);
    });
  }
});
