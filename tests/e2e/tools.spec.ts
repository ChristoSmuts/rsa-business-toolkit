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

/**
 * What `value` resolves to for `property` on a probe element in the page, so a test compares a
 * colour or a size with the token the design names, not with a number or "something different".
 */
async function resolved(page: Page, property: string, value: string): Promise<string> {
  return page.evaluate(
    ([name, css]) => {
      const probe = document.createElement('div');
      probe.style.setProperty(name, css);
      document.body.append(probe);
      const out = getComputedStyle(probe).getPropertyValue(name);
      probe.remove();
      return out;
    },
    [property, value] as const,
  );
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
    // 360×740 phone (725px EN and 754px AF at `ea15b4a`, below the 740px screen). Review pass 7,
    // the audit: "within 740px" still passed with the stepper's words shown again (about 100px
    // more), so the bound is the measured 554px (EN) and 608px (AF) with 16px to spare, and a line
    // more (48px) outside Chromium, as at 320px.
    test(`/${lang}find-my-path/ at 360×740: the first answer is on the first screen`, async ({
      page,
      browserName,
    }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await startWizard(page, lang);
      const first = page.locator('[data-step="entity"] .st-choice').first();
      const top = await pageTop(first);
      const measured = lang ? 608 : 554;
      expect(top).toBeLessThanOrEqual(measured + 16 + (browserName === 'chromium' ? 0 : 48));
      expect(top + 44, 'at least its first 44px row is on the first screen').toBeLessThanOrEqual(
        740,
      );
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
      // The colours are the tokens the design names (review pass 7, m1): filled in
      // --st-primary, to come in --st-border-strong (3:1 or more on the page).
      const primary = await resolved(page, 'border-top-color', 'var(--st-primary)');
      const strong = await resolved(page, 'border-top-color', 'var(--st-border-strong)');
      expect(now.map((bar) => bar.colour)).toEqual([primary, strong, strong]);
      // The bars share a bottom edge: each bar is its item's top border.
      const barBottoms = () =>
        page
          .locator('.st-wizard__stepper > li')
          .evaluateAll((lis) =>
            lis.map((li) =>
              Math.round(
                li.getBoundingClientRect().top + parseFloat(getComputedStyle(li).borderTopWidth),
              ),
            ),
          );
      expect(new Set(await barBottoms()).size, 'one bottom edge').toBe(1);
      // The step's heading is one size down on a phone.
      expect(
        await page.locator('#wz-h-entity').evaluate((h2) => getComputedStyle(h2).fontSize),
      ).toBe(await resolved(page, 'font-size', 'var(--st-text-xl)'));
      const height = (await page.locator('.st-wizard__stepper').boundingBox())?.height;
      await answerTwo(page);
      now = await bars();
      expect(
        now.map((bar) => bar.width),
        'done, done, current',
      ).toEqual(['6px', '6px', '10px']);
      expect(now.map((bar) => bar.colour)).toEqual([primary, primary, primary]);
      expect(new Set(await barBottoms()).size, 'one bottom edge').toBe(1);
      expect((await page.locator('.st-wizard__stepper').boundingBox())?.height).toBe(height);
      await page.locator('[data-step="stage"] [data-back]').click();
      now = await bars();
      expect(
        now.map((bar) => bar.width),
        'done, current, to come',
      ).toEqual(['6px', '10px', '2px']);
      expect(now.map((bar) => bar.colour)).toEqual([primary, primary, strong]);
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
      // Where it is (review pass 7, M1): positioned against its own item, inside the item's start
      // padding and its height. Without the item's `position: relative` it was drawn at the page's
      // origin, and a negative inset put it outside the item, and both passed before.
      const place = await page
        .locator('[data-stepper="0"] .st-wizard__stepper-n')
        .evaluate((span) => {
          const li = span.closest('li')!;
          const tick = getComputedStyle(span, '::before');
          const item = getComputedStyle(li);
          return {
            offsetParentIsItem: (span as HTMLElement).offsetParent === li,
            left: parseFloat(tick.left),
            top: parseFloat(tick.top),
            width: parseFloat(tick.width),
            height: parseFloat(tick.height),
            padding: parseFloat(item.paddingLeft),
            itemHeight: li.clientHeight,
            textLeft: span.getBoundingClientRect().left - li.getBoundingClientRect().left,
          };
        });
      expect(place.offsetParentIsItem, 'the tick is positioned against its item').toBe(true);
      expect(place.left).toBeGreaterThanOrEqual(0);
      expect(place.left + place.width, 'inside the start padding').toBeLessThanOrEqual(
        place.padding,
      );
      expect(place.left + place.width, 'before the words').toBeLessThanOrEqual(place.textLeft);
      expect(place.top).toBeGreaterThanOrEqual(0);
      expect(place.top + place.height).toBeLessThanOrEqual(place.itemHeight);
      // The current step's words are semibold; the others are not.
      const weights = await page
        .locator('.st-wizard__stepper > li')
        .evaluateAll((lis) => lis.map((li) => getComputedStyle(li).fontWeight));
      expect(weights[1]).toBe('600');
      expect(weights[2]).not.toBe('600');
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
      // A ghost button, as the design record says (review pass 7, the audit).
      for (const n of [0, 1]) await expect(change.nth(n)).toHaveAttribute('data-variant', 'ghost');
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
      // Words and an arrow icon (review pass 7, the audit).
      await expect(next.locator('[data-next-badge] svg')).toHaveCount(1);
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
 *
 * Review pass 5: what a press changed is said in a visually hidden polite region of its own
 * (`[data-step-status]`), never in the visible line under the heading, which keeps "Saved on this
 * device only" and takes no line on a press.
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
        const said = page.locator('st-my-path [data-step-status]');
        const mark = (n: number) =>
          page.locator(`[data-steps] > li:not([hidden])[data-n="${n}"] [data-mark]`);
        // Up: earlier steps stay marked, so the count runs 1, 2, 3, 4 (review pass 5, M2).
        for (let n = 1; n <= total; n++) {
          await mark(n).focus();
          await page.keyboard.press('Enter');
          await expect(mark(n), `step ${n}: "Mark as done" keeps focus`).toBeFocused();
          await expect(mark(n)).toHaveText(lang ? 'Haal die merkie af' : 'Remove the tick');
          await expect(said).toHaveText(
            lang
              ? `Stap ${n} klaar. ${n} van ${total} klaar.`
              : `Step ${n} done. ${n} of ${total} done.`,
          );
        }
        // And back down.
        for (let n = total; n >= 1; n--) {
          await mark(n).focus();
          await page.keyboard.press('Space');
          await expect(mark(n), `step ${n}: "Remove the tick" keeps focus`).toBeFocused();
          await expect(said).toHaveText(
            lang
              ? `Stap ${n} nie klaar nie. ${n - 1} van ${total} klaar.`
              : `Step ${n} not done. ${n - 1} of ${total} done.`,
          );
        }
        // A click keeps focus too, on every step.
        for (let n = 1; n <= total; n++) {
          await mark(n).click();
          await expect(mark(n), `step ${n}: a click keeps focus`).toBeFocused();
          await mark(n).click();
          await expect(mark(n)).toBeFocused();
        }
        const order = await cards.evaluateAll((all) =>
          all.map((card) => Number(card.dataset['n'])),
        );
        expect(order).toEqual([...Array(total).keys()].map((index) => index + 1));
      });
    }
  }

  test("the two status regions are polite statuses in Chromium's own tree", async ({
    page,
    seedStorage,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Reads the tree over CDP, which only Chromium has.');
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await seedStorage({ 'st.profile.v1': LONG });
    await page.setViewportSize(PHONE);
    await page.goto('my-path/');
    await expect(page.locator('[data-steps] > li:not([hidden])').first()).toBeVisible();
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('DOM.enable');
      await session.send('Accessibility.enable');
      const { root } = await session.send('DOM.getDocument', { depth: 0 });
      // The hidden step region, and the visible line for the saved and removed messages (review
      // pass 6, m3): each a polite status.
      for (const selector of ['st-my-path [data-step-status]', 'st-my-path [data-status]']) {
        const { nodeId } = await session.send('DOM.querySelector', {
          nodeId: root.nodeId,
          selector,
        });
        const { nodes } = await session.send('Accessibility.getPartialAXTree', {
          nodeId,
          fetchRelatives: false,
        });
        const node = nodes[0];
        expect(node?.role?.value, selector).toBe('status');
        const live = node?.properties?.find((property) => property.name === 'live');
        expect(live?.value.value, selector).toBe('polite');
        const focusable = node?.properties?.find((property) => property.name === 'focusable');
        expect(focusable?.value.value ?? false, `${selector} is not focusable`).toBe(false);
      }
    } finally {
      await session.detach();
    }
    // Never a tab stop (review pass 6, m4).
    expect(await page.locator('st-my-path [data-step-status]').getAttribute('tabindex')).toBeNull();
  });

  test('the step region is silent on load and with ?saved=1, and speaks once per press', async ({
    page,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await seedStorage({ 'st.profile.v1': LONG });
    // Every text the step region ever holds, from before the page's scripts run (review pass 6, m1).
    await page.addInitScript(() => {
      const said: string[] = [];
      Object.assign(window, { stStepSaid: said });
      new MutationObserver((records) => {
        const region = document.querySelector('[data-step-status]');
        if (!region) return;
        if (records.some((record) => region.contains(record.target) || record.target === region))
          said.push(region.textContent ?? '');
      }).observe(document, { childList: true, characterData: true, subtree: true });
    });
    const writes = () =>
      page.evaluate(() =>
        (window as unknown as { stStepSaid: string[] }).stStepSaid.filter(
          (text) => text.trim() !== '',
        ),
      );
    await page.setViewportSize(PHONE);
    for (const route of ['my-path/', 'my-path/?saved=1']) {
      await page.goto(route);
      await expect(page.locator('[data-steps] > li:not([hidden])').first()).toBeVisible();
      if (route.includes('saved'))
        await expect(page.locator('st-my-path [data-status]')).not.toBeEmpty();
      expect(await writes(), `${route}: nothing said on load`).toEqual([]);
      await page.locator('[data-steps] > li:not([hidden])[data-n="1"] [data-mark]').click();
      await expect(page.locator('st-my-path [data-step-status]')).not.toBeEmpty();
      expect(await writes(), `${route}: one message for one press`).toHaveLength(1);
      // Put the step back for the next route.
      await page.locator('[data-steps] > li:not([hidden])[data-n="1"] [data-mark]').click();
    }
  });

  for (const width of [320, 1280]) {
    test(`"Do this next" sits above the step's first page at ${width}px`, async ({
      page,
      seedStorage,
    }, testInfo) => {
      test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
      await seedStorage({ 'st.profile.v1': LONG });
      await page.setViewportSize({ width, height: 800 });
      await page.goto('my-path/');
      const card = page.locator('[data-steps] > li[data-next]');
      await expect(card).toHaveCount(1);
      // Review pass 6, m2: the badge takes its own line, never over the page link.
      const badge = await card.locator('[data-next-badge]').boundingBox();
      const link = await card.locator('li[data-doc]:not([hidden]) a').first().boundingBox();
      expect(badge, 'the badge shows').not.toBeNull();
      expect((badge?.y ?? 0) + (badge?.height ?? 0)).toBeLessThanOrEqual((link?.y ?? 0) + 0.5);
    });
  }

  test('a press moves the button no more than at ea15b4a, and the message going moves nothing', async ({
    page,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await seedStorage({ 'st.profile.v1': LONG });
    await page.setViewportSize(PHONE);
    await page.goto('my-path/?saved=1');
    // No scroll anchoring, as in Safari: a line added or removed above would move the button.
    await page.addStyleTag({ content: 'html { overflow-anchor: none; }' });
    const visible = page.locator('st-my-path [data-status]');
    await expect(visible).not.toBeEmpty();
    const saved = (await visible.textContent()) ?? '';
    const mark = page.locator('[data-steps] > li:not([hidden])[data-n="1"] [data-mark]');
    const top = async (): Promise<number> => (await mark.boundingBox())?.y ?? 0;
    const before = await top();
    await mark.click();
    const region = page.locator('st-my-path [data-step-status]');
    await expect(region).not.toBeEmpty();
    // The message is said, not shown: the region is a 1×1 clipped box (review pass 7, the audit).
    const regionBox = await region.boundingBox();
    expect(regionBox?.width ?? 99).toBeLessThanOrEqual(1);
    expect(regionBox?.height ?? 99).toBeLessThanOrEqual(1);
    // At ea15b4a the press moved the button 30px (270 → 300 at 320px): the "Done" badge's line.
    expect((await top()) - before).toBeLessThanOrEqual(31);
    const afterPress = await top();
    await page.evaluate(() => {
      const shifts: number[] = [];
      Object.assign(window, { stShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          shifts.push((entry as PerformanceEntry & { value: number }).value);
      }).observe({ type: 'layout-shift' });
    });
    // The message is cleared after 6 s; nothing on the page moves when it goes.
    await expect(page.locator('st-my-path [data-step-status]')).toBeEmpty({ timeout: 9000 });
    expect(await top()).toBe(afterPress);
    expect(
      await page.evaluate(() => (window as unknown as { stShifts: number[] }).stShifts),
    ).toEqual([]);
    // The visible line still says the answers are saved on this device.
    await expect(visible).toHaveText(saved);
  });

  test('answers reordered in a second page redraw the path in order, and focus holds', async ({
    page,
    context,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food', 'beauty'], stage: 'trading' },
    });
    await page.setViewportSize(PHONE);
    await page.goto('my-path/');
    const cards = page.locator('[data-steps] > li:not([hidden])');
    await expect(cards.first()).toBeVisible();
    /** The kinds of business' pages, in the order the step that holds them lists them. */
    const typePages = () =>
      page
        .locator('[data-steps] > li:not([hidden]) li[data-doc^="business-types/"]:not([hidden])')
        .evaluateAll((all) => all.map((item) => item.dataset['doc'] ?? ''));
    expect(await typePages()).toEqual(['business-types/food', 'business-types/beauty']);
    const mark = page.locator('[data-steps] > li:not([hidden])[data-n="1"] [data-mark]');
    await mark.focus();
    await mark.evaluate((button) => button.setAttribute('data-test-focused', ''));
    // Everything written to the step region from now on (a 6 s timer could clear it again before
    // the test looks, so the region's state at the end is not enough).
    await page.evaluate(() => {
      const region = document.querySelector('st-my-path [data-step-status]');
      const said: string[] = [];
      Object.assign(window, { stSaid: said });
      if (region)
        new MutationObserver(() => said.push(region.textContent ?? '')).observe(region, {
          childList: true,
          characterData: true,
          subtree: true,
        });
    });

    // A second tab opens Find my path with the saved answers and ticks Beauty before Food.
    const other = await context.newPage();
    await other.goto('find-my-path/');
    await expect(other.locator('st-wizard[data-ready]')).toHaveCount(1);
    await other.locator('[data-step="entity"] [data-next]').click();
    await other.locator('input[name="type"][value="food"]').uncheck();
    await other.locator('input[name="type"][value="food"]').check();
    await other.locator('[data-step="type"] [data-next]').click();
    await other.locator('[data-finish]').click();
    await expect(other).toHaveURL(/my-path\/$/);

    // The first page follows: Beauty's page now first in its step (review pass 5, m3), the steps
    // numbered in order, the same button still focused, and nothing said for a press nobody made.
    await expect.poll(typePages).toEqual(['business-types/beauty', 'business-types/food']);
    const order = await cards.evaluateAll((all) => all.map((card) => Number(card.dataset['n'])));
    expect(order).toEqual([...Array(order.length).keys()].map((index) => index + 1));
    expect(
      await page.evaluate(() => document.activeElement?.hasAttribute('data-test-focused') ?? false),
    ).toBe(true);
    await expect(page.locator('st-my-path [data-step-status]')).toBeEmpty();
    const said = await page.evaluate(() =>
      (window as unknown as { stSaid: string[] }).stSaid.filter((text) => text.trim() !== ''),
    );
    expect(said, 'nothing is said for answers changed elsewhere').toEqual([]);
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
      // A heading by role and name, not only words (review pass 7, m2).
      await expect(
        page.getByRole('heading', { name: lang ? 'As jy klaar is' : 'When you are done' }),
      ).toBeVisible();
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
      // Either rule alone keeps the words in the column, so the outcome above fails only without
      // both (review pass 7, the audit); the rules the design record names are checked here.
      const rules = await page
        .locator('.st-tgroup__legend')
        .first()
        .evaluate((legend) => {
          const css = getComputedStyle(legend);
          return { cap: css.maxInlineSize, wrap: css.overflowWrap };
        });
      expect(rules).toEqual({ cap: '100%', wrap: 'anywhere' });
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

      // Centred at a tablet and a desktop width too (review pass 5, m1).
      for (const size of [
        { width: 768, height: 1024 },
        { width: 1280, height: 800 },
      ]) {
        await page.setViewportSize(size);
        await page.locator('[data-checklist-reset]').click();
        await expect(dialog).toBeVisible();
        const wide = await dialog.boundingBox();
        const start = wide?.x ?? 0;
        const end = size.width - start - (wide?.width ?? 0);
        expect(Math.abs(start - end), `centred across at ${size.width}px`).toBeLessThanOrEqual(1);
        const above = wide?.y ?? 0;
        const below = size.height - above - (wide?.height ?? 0);
        expect(Math.abs(above - below), `centred down at ${size.width}px`).toBeLessThanOrEqual(1);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      }
      await page.setViewportSize(PHONE);
    });
  }
});

/**
 * Review pass 7, the audit: claims in docs/design-system.md, "The tools", that no test held. Each
 * is checked against the token or the role the design names, so a mutation of the real CSS or
 * markup fails here (the table is in docs/reviews/WP-50-phase3-tools-pass7.md).
 */
test.describe('the tools as the design record describes them', () => {
  test.skip(({ isMobile }) => isMobile, 'Sets its own widths.');

  test('My path: the answers strip is a small muted heading, the chips, a button, a hairline', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.setViewportSize(PHONE);
    await page.goto('my-path/');
    await expect(page.locator('[data-steps] > li:not([hidden])').first()).toBeVisible();
    const strip = page.locator('.st-my-path__answers');
    const heading = page.getByRole('heading', { name: 'Your answers', exact: true });
    await expect(heading).toBeVisible();
    const style = await heading.evaluate((h2) => {
      const css = getComputedStyle(h2);
      return { size: css.fontSize, colour: css.color, family: css.fontFamily };
    });
    expect(style.size).toBe(await resolved(page, 'font-size', 'var(--st-text-sm)'));
    expect(style.colour).toBe(await resolved(page, 'color', 'var(--st-text-muted)'));
    expect(style.family).toBe(await resolved(page, 'font-family', 'var(--st-font-body)'));
    const rule = await strip.evaluate((element) => {
      const css = getComputedStyle(element);
      return {
        width: css.borderBottomWidth,
        style: css.borderBottomStyle,
        colour: css.borderBottomColor,
      };
    });
    expect(rule.style).toBe('solid');
    expect(rule.width).toBe('1px');
    expect(rule.colour).toBe(await resolved(page, 'border-bottom-color', 'var(--st-border)'));
    expect(
      await strip.evaluate((element) => getComputedStyle(element).borderTopStyle),
      'no hairline above',
    ).toBe('none');
    await expect(strip.locator('li[data-chip]:not([hidden])')).toHaveCount(3);
    const edit = strip.getByRole('link', { name: 'Edit answers' });
    await expect(edit).toHaveAttribute('data-variant', 'secondary');
    await expect(edit.locator('svg')).toHaveCount(1);
  });

  test('My path on paper: no "Edit answers", but "Do this next" and its ring', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.setViewportSize(PHONE);
    await page.goto('my-path/');
    await expect(page.locator('[data-steps] > li[data-next]')).toHaveCount(1);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('link', { name: 'Edit answers' })).toBeHidden();
    await expect(page.locator('[data-steps] > li[data-next] [data-next-badge]')).toBeVisible();
    expect(
      await page
        .locator('[data-steps] > li[data-next]')
        .evaluate((card) => getComputedStyle(card, '::before').boxShadow),
    ).not.toBe('none');
    await expect(page.locator('.st-my-path__answers h2')).toBeVisible();
  });

  test('a template group on a phone: its legend is the heading, in the display face at xl', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto('templates/tax-invoice/');
    const legend = page.locator('.st-tgroup__legend').first();
    const style = await legend.evaluate((element) => {
      const css = getComputedStyle(element);
      return { family: css.fontFamily, size: css.fontSize, weight: css.fontWeight };
    });
    expect(style.family).toBe(await resolved(page, 'font-family', 'var(--st-font-display)'));
    expect(style.size).toBe(await resolved(page, 'font-size', 'var(--st-text-xl)'));
    expect(style.weight).toBe('600');
  });

  test('the template actions heading is not printed', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('templates/tax-invoice/');
    await expect(page.locator('st-template-form[data-ready]')).toHaveCount(1);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#st-tool-actions-heading')).toBeHidden();
  });

  test('a confirm dialog on a phone: each choice takes the full row, safe one first', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto('checklist/');
    await page.locator('st-checklist input[type="checkbox"]').first().check();
    await page.locator('[data-checklist-reset]').click();
    const dialog = page.locator('dialog#st-checklist-reset');
    await expect(dialog).toBeVisible();
    const rows = await dialog.locator('.st-dialog__actions').evaluate((actions) => {
      const inner = actions.getBoundingClientRect();
      return [...actions.querySelectorAll('.st-btn')].map((button) => {
        const box = button.getBoundingClientRect();
        return { width: Math.round(box.width), full: Math.round(inner.width), top: box.top };
      });
    });
    for (const row of rows) expect(row.width, 'a full row').toBe(row.full);
    expect(rows[0]!.top).toBeLessThan(rows[1]!.top);
    await expect(dialog.getByRole('button').first()).toBeFocused();
    await expect(dialog.getByRole('button').first()).toHaveAttribute('value', 'cancel');
  });

  test('the search dialog: "Browse all pages" and the glossary are 44px link rows', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto('business-types/food/');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Control+k');
    const more = page.locator(
      'dialog.st-search-dialog [data-search-empty] .st-search-dialog__more',
    );
    await expect(more.getByRole('link', { name: 'Browse all pages' })).toBeVisible();
    await expect(more.getByRole('link', { name: 'Look a word up in the glossary' })).toBeVisible();
    const heights = await more
      .locator('a')
      .evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('the search dialog on a phone', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize(PHONE);
  });

  for (const lang of LANGS) {
    test(`/${lang}: no results points at the glossary, and the glossary is a link`, async ({
      page,
      basePath,
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
      const glossaryHref = (await glossary.getAttribute('href')) ?? '';
      expect(glossaryHref).toMatch(/\/glossary\/$/);
      // The glossary in the page's language (review pass 5, m2).
      expect(glossaryHref.startsWith(`${basePath}${lang}`)).toBe(true);
      if (!lang) expect(glossaryHref.startsWith(`${basePath}af/`)).toBe(false);
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
