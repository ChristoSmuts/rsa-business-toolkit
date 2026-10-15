import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chromiumAxName } from './helpers/ax';

/**
 * WP-50 Phase 3, item 4: the tools (Find my path, My path, the templates, the checklist, the
 * confirm dialogs and the search dialog) on a phone, as one product.
 *
 * - Find my path: below 30rem the stepper is a segmented progress bar (to come a 2px line, done a
 *   6px filled segment, current a 10px one), its words visually hidden but still in the
 *   accessibility tree; from 30rem a done step shows a tick that is really drawn. The last
 *   question shows "Your answers so far", the kinds of business as a list in tick order with the
 *   first marked "(main)", and a "Change" for each, which goes back with the answers kept. The
 *   first answer is on the first screen at 360×740.
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
  // General first, then Food: the server renders Food before General, so the summary shows this
  // order only if the script really reorders the list (review pass 2, m2).
  await page.locator('input[name="type"][value="general"]').check();
  await page.locator('input[name="type"][value="food"]').check();
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
      browserName,
    }) => {
      await startWizard(page, lang);
      const stepper = page.locator('.st-wizard__stepper');
      const box = await stepper.boundingBox();
      expect(box?.height ?? 99, 'the stepper is one row of bars').toBeLessThanOrEqual(12);
      const items = await stepper
        .locator(':scope > li')
        .evaluateAll((lis) => lis.map((li) => Math.round(li.getBoundingClientRect().bottom)));
      expect(new Set(items).size, 'three segments on one bottom line').toBe(1);
      // At `ea15b4a` the first answer started 780px (EN) and 803px (AF) down at 320×568; with the
      // stepper's two rows of words gone and the heading a size smaller it is 635px in both. The
      // rest of the first screen is the header (Phase 3, item 5). Measured in Chromium. Other
      // engines get a line more (48px) for their font metrics: provisional, until the first CI
      // WebKit figure is recorded (review pass 1, m3).
      const first = page.locator('[data-step="entity"] .st-choice').first();
      expect(await pageTop(first)).toBeLessThanOrEqual(browserName === 'chromium' ? 650 : 698);
      await noSidewaysScroll(page, `${lang}find-my-path/ step 1`);
    });

    // Review pass 1, m3: the reader's real gain is the first answer on the first screen of a
    // 360×740 phone (725px EN and 754px AF at `ea15b4a`, below the 740px screen).
    test(`/${lang}find-my-path/ at 360×740: the first answer is on the first screen`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await startWizard(page, lang);
      const first = page.locator('[data-step="entity"] .st-choice').first();
      expect(await pageTop(first)).toBeLessThanOrEqual(740);
    });

    // Review pass 1, M1: on a phone the bar is a segmented progress bar, filled up to and including
    // the current step; to come, done and current differ in height as well as colour.
    test(`/${lang}find-my-path/ at 320px: to come, done and current are three bars`, async ({
      page,
    }) => {
      await startWizard(page, lang);
      const bars = () =>
        page.locator('.st-wizard__stepper > li').evaluateAll((lis) =>
          lis.map((li) => {
            const style = getComputedStyle(li);
            return { width: style.borderTopWidth, colour: style.borderTopColor };
          }),
        );
      let now = await bars();
      expect(now.map((bar) => bar.width)).toEqual(['10px', '2px', '2px']);
      const height = (await page.locator('.st-wizard__stepper').boundingBox())?.height;
      await answerTwo(page);
      now = await bars();
      expect(
        now.map((bar) => bar.width),
        'done, done, current',
      ).toEqual(['6px', '6px', '10px']);
      expect(now[0]?.colour, 'done and current are both filled').toBe(now[2]?.colour);
      expect((await page.locator('.st-wizard__stepper').boundingBox())?.height).toBe(height);
      await page.locator('[data-step="stage"] [data-back]').click();
      now = await bars();
      expect(
        now.map((bar) => bar.width),
        'done, current, to come',
      ).toEqual(['6px', '10px', '2px']);
      expect(now[2]?.colour, 'to come is not filled').not.toBe(now[1]?.colour);
      // No tick on a phone: it would sit inside the visually hidden words.
      const tick = await page
        .locator('[data-stepper="0"] .st-wizard__stepper-n')
        .evaluate((element) => getComputedStyle(element, '::before').content);
      expect(tick).toBe('none');
    });
  }

  // 500px is just above 30rem, where the words come back (review pass 4, m3); 1280px is a desktop.
  for (const width of [500, 1280]) {
    test(`from 30rem a done step shows its tick, drawn and not clipped (${width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await startWizard(page, '');
      await page.locator('input[name="entity"][value="sole-prop"]').check();
      await page.locator('[data-step="entity"] [data-next]').click();
      const drawn = await page
        .locator('[data-stepper="0"] .st-wizard__stepper-n')
        .evaluate((span) => {
          const tick = getComputedStyle(span, '::before');
          const box = span.getBoundingClientRect();
          return {
            content: tick.content,
            right: tick.borderRightWidth,
            width: parseFloat(tick.width),
            height: parseFloat(tick.height),
            spanWidth: box.width,
            spanClip: getComputedStyle(span).clipPath,
          };
        });
      expect(drawn.content).toBe('""');
      expect(drawn.right).toBe('2px');
      expect(drawn.width, 'the tick has a box of its own').toBeGreaterThan(1);
      expect(drawn.height).toBeGreaterThan(1);
      expect(drawn.spanWidth, 'its words are shown, not visually hidden').toBeGreaterThan(1);
      expect(drawn.spanClip).toBe('none');
      // Not on the current step or the one to come.
      for (const n of ['1', '2']) {
        const content = await page
          .locator(`[data-stepper="${n}"] .st-wizard__stepper-n`)
          .evaluate((span) => getComputedStyle(span, '::before').content);
        expect(content).toBe('none');
      }
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
        expect(
          texts.map((text) => text.trim()),
          `"${words}" is in the tree`,
        ).toContain(words);
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
      const summary = page.locator('[data-step="stage"] [data-summary]');
      await expect(summary).toBeVisible();
      await expect(summary.locator('[data-summary-answer="entity"]')).toHaveText(
        lang ? 'In my eie naam (eenmansaak)' : 'In my own name (sole proprietor)',
      );
      // A list in tick order, the first marked as the main one (review pass 1, m5).
      await expect(summary.locator('[data-summary-types] > li:visible')).toHaveText(
        lang
          ? ['Algemeen: ek verkoop of doen baie dinge (hoof)', 'Kosbesigheid']
          : ['General: I sell or do many things (main)', 'Food business'],
        { useInnerText: true },
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
      await expect(summary.locator('[data-summary-types] > li:visible')).toHaveText(
        lang
          ? ['Algemeen: ek verkoop of doen baie dinge (hoof)', 'Kosbesigheid']
          : ['General: I sell or do many things (main)', 'Food business'],
        { useInnerText: true },
      );
      // The first "Change" ("0" is a real index, review pass 4, m2).
      await change.nth(0).click();
      await expect(page.locator('#wz-h-entity')).toBeFocused();
      await expect(page.locator('input[name="entity"][value="sole-prop"]')).toBeChecked();
    });
  }
});

test.describe('Find my path: the names of "Change"', () => {
  test('each "Change" is named after its question, starting with its visible word (Chromium tree)', async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Reads the tree over CDP, which only Chromium has.');
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize(PHONE);
    for (const [lang, names] of [
      ['', ['Change: How you trade', 'Change: Kind of business']],
      ['af/', ['Verander: Hoe jy handel dryf', 'Verander: Soort besigheid']],
    ] as const) {
      await startWizard(page, lang);
      await answerTwo(page);
      for (const [index, name] of names.entries()) {
        const button = page.locator(`[data-step="stage"] [data-go="${index}"]`);
        await expect(button).toHaveText(lang ? 'Verander' : 'Change');
        // WCAG 2.5.3: the name starts with the visible label, with no stray space.
        expect(await chromiumAxName(page, `[data-step="stage"] [data-go="${index}"]`)).toBe(name);
      }
      // The answers so far are a group named by its heading, not a landmark (review pass 2, m4).
      const summary = page.locator('[data-step="stage"] [data-summary]');
      await expect(summary).toHaveAttribute('role', 'group');
      expect(await chromiumAxName(page, '[data-step="stage"] [data-summary]')).toBe(
        lang ? 'Jou antwoorde tot dusver' : 'Your answers so far',
      );
    }
  });

  test('one kind of business is a list with no bullet', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize(PHONE);
    await startWizard(page, '');
    await page.locator('input[name="entity"][value="pty"]').check();
    await page.locator('[data-step="entity"] [data-next]').click();
    await page.locator('input[name="type"][value="food"]').check();
    await page.locator('[data-step="type"] [data-next]').click();
    const list = page.locator('[data-step="stage"] [data-summary-types]');
    await expect(list).toHaveAttribute('role', 'list');
    expect(await list.evaluate((element) => getComputedStyle(element).listStyleType)).toBe('none');
    await page.locator('[data-step="stage"] [data-go="1"]').click();
    await page.locator('input[name="type"][value="beauty"]').check();
    await page.locator('[data-step="type"] [data-next]').click();
    expect(await list.evaluate((element) => getComputedStyle(element).listStyleType)).toBe('disc');
  });
});

/**
 * Forced colours and the "Do this next" ring (review pass 3, m2). A system colour is compared with
 * what the browser resolves it to on a probe element, so the test does not hard-code a palette.
 */
test.describe('the tools in forced colours', () => {
  async function systemColour(page: Page, name: string): Promise<string> {
    return page.evaluate((colour) => {
      const probe = document.createElement('div');
      probe.style.borderTop = `1px solid ${colour}`;
      document.body.append(probe);
      const value = getComputedStyle(probe).borderTopColor;
      probe.remove();
      return value;
    }, name);
  }

  test('the phone stepper: done and current Highlight, to come GrayText', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize(PHONE);
    await page.emulateMedia({ forcedColors: 'active' });
    await startWizard(page, '');
    await page.locator('input[name="entity"][value="sole-prop"]').check();
    await page.locator('[data-step="entity"] [data-next]').click();
    const colours = await page
      .locator('.st-wizard__stepper > li')
      .evaluateAll((lis) => lis.map((li) => getComputedStyle(li).borderTopColor));
    const highlight = await systemColour(page, 'Highlight');
    const grey = await systemColour(page, 'GrayText');
    expect(highlight).not.toBe(grey);
    expect(colours).toEqual([highlight, highlight, grey]);
  });

  test('"Do this next" has a second ring, and an outline in forced colours', async ({
    page,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.setViewportSize(PHONE);
    await page.goto('my-path/');
    const ring = (selector: string) =>
      page.locator(selector).evaluate((card) => {
        const circle = getComputedStyle(card, '::before');
        return { shadow: circle.boxShadow, outline: circle.outlineStyle };
      });
    const next = await ring('[data-steps] > li[data-next]');
    // Two shadows: the page colour, then the primary ring round it.
    expect(next.shadow.match(/rgb/g) ?? []).toHaveLength(2);
    const other = await ring('[data-steps] > li:not([hidden]):not([data-next]) >> nth=0');
    expect(other.shadow).toBe('none');
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await ring('[data-steps] > li[data-next]');
    expect(forced.outline, 'the ring is an outline in forced colours').toBe('solid');
  });
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
      // By keyboard: the button keeps focus when the steps are drawn again (review pass 3, m1).
      // Step 1's own button (the "next" marker moves on to step 2 when it is pressed).
      const mark = page.locator('[data-steps] > li:not([hidden])[data-n="1"] [data-mark]');
      await mark.focus();
      await page.keyboard.press('Enter');
      await expect(mark, '"Mark as done" keeps focus').toBeFocused();
      await expect(mark).toHaveText(lang ? 'Haal die merkie af' : 'Remove the tick');
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

/**
 * Review pass 4, M1: focus on every step, not only the first. Chromium removes and re-inserts a
 * node put back where it already is, which drops focus, so this runs in a real browser on a path
 * with a first, a middle and a last step.
 */
test.describe('My path keeps focus on every step', () => {
  const LONG = { entity: 'pty', businessTypes: ['food', 'general'], stage: 'trading' };

  for (const width of [320, 1280]) {
    for (const lang of LANGS) {
      test(`/${lang}my-path/ at ${width}px: Mark as done and Remove the tick on every step`, async ({
        page,
        seedStorage,
      }, testInfo) => {
        test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
        await seedStorage({ 'st.profile.v1': LONG });
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${lang}my-path/`);
        const cards = page.locator('[data-steps] > li:not([hidden])');
        await expect(cards.first()).toBeVisible();
        const total = await cards.count();
        expect(total, 'a first, a middle and a last step').toBeGreaterThanOrEqual(4);
        const status = page.locator('st-my-path [data-status]');
        for (let n = 1; n <= total; n++) {
          const mark = page.locator(`[data-steps] > li:not([hidden])[data-n="${n}"] [data-mark]`);
          await mark.focus();
          await page.keyboard.press('Enter');
          await expect(mark, `step ${n}: "Mark as done" keeps focus`).toBeFocused();
          await expect(mark).toHaveText(lang ? 'Haal die merkie af' : 'Remove the tick');
          await expect(status).toHaveText(
            lang ? `Stap ${n} klaar. 1 van ${total} klaar.` : `Step ${n} done. 1 of ${total} done.`,
          );
          await page.keyboard.press('Space');
          await expect(mark, `step ${n}: "Remove the tick" keeps focus`).toBeFocused();
          await expect(status).toHaveText(
            lang
              ? `Stap ${n} nie klaar nie. 0 van ${total} klaar.`
              : `Step ${n} not done. 0 of ${total} done.`,
          );
          await mark.click();
          await expect(mark, `step ${n}: a click keeps focus`).toBeFocused();
          await mark.click();
        }
        const order = await cards.evaluateAll((all) =>
          all.map((card) => Number(card.dataset['n'])),
        );
        expect(order).toEqual([...Array(total).keys()].map((index) => index + 1));
      });
    }
  }

  test('new answers saved from a second page redraw the path in order, and focus holds', async ({
    page,
    context,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.setViewportSize(PHONE);
    await page.goto('my-path/');
    const cards = page.locator('[data-steps] > li:not([hidden])');
    await expect(cards.first()).toBeVisible();
    const pages = () =>
      page
        .locator('[data-steps] > li:not([hidden]) li[data-doc]:not([hidden])')
        .evaluateAll((all) => all.map((item) => item.dataset['doc']).join(' '));
    const before = await pages();
    const mark = page.locator('[data-steps] > li:not([hidden])[data-n="1"] [data-mark]');
    await mark.focus();
    await mark.evaluate((button) => button.setAttribute('data-test-focused', ''));

    // A second tab answers Find my path the normal way and saves new answers.
    const other = await context.newPage();
    await other.goto('find-my-path/');
    await expect(other.locator('st-wizard[data-ready]')).toHaveCount(1);
    await other.locator('input[name="entity"][value="pty"]').check();
    await other.locator('[data-step="entity"] [data-next]').click();
    await other.locator('input[name="type"][value="food"]').check();
    await other.locator('input[name="type"][value="general"]').check();
    await other.locator('[data-step="type"] [data-next]').click();
    await other.locator('input[name="stage"][value="trading"]').check();
    await other.locator('[data-finish]').click();
    await expect(other).toHaveURL(/my-path\/$/);

    // The first page follows: other pages on the path, numbered in order, and the focused button
    // kept focus.
    await expect.poll(pages).not.toBe(before);
    const order = await cards.evaluateAll((all) => all.map((card) => Number(card.dataset['n'])));
    expect(order).toEqual([...Array(order.length).keys()].map((index) => index + 1));
    // The same button element, not only one at the same place.
    expect(
      await page.evaluate(() => document.activeElement?.hasAttribute('data-test-focused') ?? false),
    ).toBe(true);
    await other.close();
  });
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
      // And wrap onto more than one row, every link inside the list (review pass 3, m3).
      expect(new Set(tops).size, 'more than one row').toBeGreaterThan(1);
      const listRight = await page
        .locator('[data-missing]')
        .evaluate((list) => list.getBoundingClientRect().right);
      const rights = await links.evaluateAll((all) =>
        all.map((link) => link.getBoundingClientRect().right),
      );
      for (const right of rights) expect(right).toBeLessThanOrEqual(listRight + 0.5);

      const heading = page.locator('#st-tool-actions-heading');
      await expect(heading).toHaveText(lang ? 'As jy klaar is' : 'When you are done');
      await expect(heading, 'shown, not only in the markup (review pass 3, M1)').toBeVisible();
      const print = page.locator('[data-print]');
      expect(await pageTop(print)).toBeGreaterThan(await pageTop(heading));
      await noSidewaysScroll(page, `${lang}templates/tax-invoice/`);
    });
  }

  // Review pass 3, m5: "Dokumentbesonderhede" ended at 555px with text at 200%.
  test('with text at 200% at 320px every legend stays inside the column', async ({ page }) => {
    await page.setViewportSize(PHONE);
    for (const lang of LANGS) {
      await page.goto(`${lang}templates/tax-invoice/`);
      await expect(page.locator('st-template-form[data-ready]')).toHaveCount(1);
      const outside = await page.evaluate(async () => {
        document.documentElement.style.fontSize = '200%';
        await document.fonts.ready;
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        return [...document.querySelectorAll('.st-tgroup')].flatMap((group) => {
          const legend = group.querySelector('.st-tgroup__legend');
          if (!legend) return [];
          // The words, not only the legend's box: a capped box can still overflow its text.
          const words = document.createRange();
          words.selectNodeContents(legend);
          const right = Math.max(
            legend.getBoundingClientRect().right,
            ...[...words.getClientRects()].map((rect) => rect.right),
          );
          // Against the tool's column: a fieldset grows to its legend's longest word.
          const column = document.querySelector('st-template-form')!.getBoundingClientRect().right;
          return right > Math.min(column, group.getBoundingClientRect().right) + 0.5
            ? [`${legend.textContent?.trim()}: ${Math.round(right)}`]
            : [];
        });
      });
      expect(outside, `${lang}templates/tax-invoice/`).toEqual([]);
    }
  });

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
      // And the wider padding is back on a desktop (review pass 4, m4).
      await page.setViewportSize({ width: 1280, height: 800 });
      expect(
        await page
          .locator('.st-tasklist')
          .first()
          .evaluate((element) => getComputedStyle(element).paddingInlineStart),
      ).toBe('24px');
      await page.setViewportSize(PHONE);

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
      // The safe choice first, and focused; on a phone first means above (review pass 3, m2).
      await expect(buttons.first()).toBeFocused();
      const tops = await buttons.evaluateAll((all) =>
        all.map((button) => button.getBoundingClientRect().top),
      );
      expect(tops[0] ?? 0, 'the safe choice is above the other').toBeLessThan(tops[1] ?? 0);
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
      // Shown, not only in the markup, on a 44px row (review pass 3, M1).
      await expect(glossary).toBeVisible();
      expect((await glossary.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      const overflow = await dialog.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      );
      expect(overflow, 'nothing in the dialog scrolls sideways').toBeLessThanOrEqual(0);
    });
  }
});
