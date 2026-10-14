import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chromiumAxName } from './helpers/ax';
import { REPO_ROOT } from './helpers/routes';

/**
 * WP-50 Phase 3, item 1: the document page to direction A (`docs/work-packages/WP-50-directions.md`,
 * "Layout concepts → Document"; `src/layouts/Doc.astro`).
 *
 * - The top of the page, in order: a one-line breadcrumb with the section's hue dot (no "Section:"
 *   label), the H1, the lead, the read time and the effort meter on one line (on a business type,
 *   inside its facts, `tests/e2e/types.spec.ts`), the compact AI notice,
 *   the translation notice, then two closed disclosures with a chevron, then the text.
 * - On the English vehicle-dealer page the text's first heading is within two phone screens at
 *   360×740 in Chromium; other engines may add the height of the "Go straight to" row (at most
 *   48px; WP-50 Phase 3, item 3), which a business type puts above the text. Only English is held to it: the Afrikaans dealer is
 *   already past two screens (1,677px after item 1) and is not tested (docs/reviews/backlog.md).
 * - From 1280px: no left section sidebar, and a quiet contents column of h2 sections on the right.
 * - "Sources for this page" shows its first entries on a phone and keeps the rest in a disclosure;
 *   every entry stays in the HTML, and from 768px all of them show.
 */
const DEALER = 'business-types/vehicle-dealer/';
const MANIFEST = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'src', 'data', 'manifest.json'), 'utf8'),
) as {
  sections: { id: string; route: string; docs: string[] }[];
  docs: Record<string, { route: string }>;
};
const PHONE = { width: 360, height: 740 } as const;
/** Two screens of a 360×740 phone. */
const TWO_SCREENS = 2 * PHONE.height;

/** Top of an element in page pixels, after the web fonts. */
async function pageTop(page: Page, selector: string): Promise<number> {
  return page.evaluate(async (css) => {
    await document.fonts.ready;
    const element = document.querySelector(css);
    if (!element) throw new Error(`No ${css}`);
    return element.getBoundingClientRect().top + window.scrollY;
  }, selector);
}

test.describe('the top of a document page', () => {
  test('is in direction A’s order on a 360×740 phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    for (const route of [DEALER, `af/${DEALER}`]) {
      await page.goto(route);
      const order = [
        '.st-breadcrumb',
        'article h1',
        'article header .st-lead',
        // On a business type the read time and the effort meter are the type's facts (item 3).
        'article header .st-type-facts',
        '.st-ai-notice',
        'details.st-toc--details',
        'details#words-used-in-this-file',
        'article .st-blocks',
      ];
      const tops: number[] = [];
      for (const selector of order) tops.push(await pageTop(page, selector));
      expect(
        tops.every((top, index) => index === 0 || top > (tops[index - 1] ?? 0)),
        `${route}: ${tops.join(', ')}`,
      ).toBe(true);
      // The read time and the effort meter share one line of the type's facts.
      await expect(
        page.locator('article header .st-type-facts__line').filter({
          has: page.locator('.st-effort'),
        }),
      ).toHaveCount(1);
      await expect(page.locator('article header .st-type-facts__line .st-badge')).toHaveCount(1);
      // No "Section:" label: the breadcrumb names the section, with a dot in its hue.
      await expect(page.locator('.st-doc__section')).toHaveCount(0);
      await expect(page.locator('.st-breadcrumb .st-breadcrumb__dot')).toBeVisible();
      await expect(page.locator('.st-breadcrumb .st-breadcrumb__dot')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    }
    // The translation notice sits directly under the AI notice.
    const next = await page.evaluate(
      () => document.querySelector('.st-ai-notice')?.nextElementSibling?.textContent ?? '',
    );
    expect(next).toContain('Masjienvertaling');
  });

  // Review pass 1, minor 5 and minor 2: the notice's label row (44px) ends inside the first screen
  // on tall phones, which keep the HTML order, and on landscape phones, which reorder. Pass 2,
  // minor 1: two pages whose H1 or breadcrumb take an extra line too (AF start here, AF beauty).
  for (const [width, height] of [
    [360, 740],
    [412, 915],
    [800, 360],
    [844, 390],
    [915, 412],
  ] as const) {
    test(`the AI notice is on the first screen at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      for (const route of [
        DEALER,
        `af/${DEALER}`,
        'af/start/start-here/',
        'af/business-types/beauty/',
      ]) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => window.scrollTo(0, 0));
        const box = await page.locator('.st-ai-notice').boundingBox();
        expect(box?.y ?? Number.POSITIVE_INFINITY, route).toBeLessThanOrEqual(height - 44);
      }
    });
  }

  test('vehicle dealer: the first heading of the text is within two screens at 360×740', async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DEALER);
    await page.waitForLoadState('networkidle');
    /*
     * WP-50 Phase 3, item 3 adds the "Go straight to" row (one 44px link to the startup checklist,
     * about 30,000px further down) above the text. Chromium, where the page was measured, keeps
     * the plain limit (1,477px of 1,480). Other engines (WebKit in CI) may also take the row's own
     * height, at most 48px, so a few pixels of their font metrics do not fail the page for the link
     * that saves the longest scroll on it (review pass 2, minor 1).
     */
    const row = await page
      .locator('.st-type-jump')
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(row).toBeLessThanOrEqual(48);
    const limit = browserName === 'chromium' ? TWO_SCREENS : TWO_SCREENS + row;
    expect(await pageTop(page, 'article .st-blocks h2')).toBeLessThanOrEqual(limit);
  });

  test('both disclosures are closed and show a chevron that turns when opened', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DEALER);
    for (const selector of ['details.st-toc--details', 'details#words-used-in-this-file']) {
      const details = page.locator(selector);
      await expect(details).not.toHaveAttribute('open');
      const chevron = (): Promise<string> =>
        details
          .locator('summary')
          .evaluate((summary) => getComputedStyle(summary, '::before').transform);
      const closed = await chevron();
      expect(closed, selector).not.toBe('none');
      await details.locator('summary').click();
      await expect(details).toHaveAttribute('open', '');
      expect(await chevron(), selector).not.toBe(closed);
    }
    await expect(page.locator('details#words-used-in-this-file summary')).toHaveText(
      'Words used on this page',
    );
  });

  test('a business type has no separate "Read Core first" callout: its first line says it', async ({
    page,
  }) => {
    for (const route of [DEALER, `af/${DEALER}`, 'business-types/food/']) {
      await page.goto(route);
      await expect(page.locator('article > .st-callout[data-variant="info"]')).toHaveCount(0);
      const first = page.locator('article .st-blocks > p').first();
      await expect(first.locator('a[href$="/core/"]')).toHaveCount(1);
    }
  });
});

test.describe('the document page at 1280px', () => {
  test('has no section sidebar, and a quiet contents column of h2 sections', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A desktop width with a mouse.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(DEALER);
    await expect(page.locator('nav.st-sidebar')).toHaveCount(0);
    const column = page.locator('.st-toc--column');
    await expect(column).toBeVisible();
    // Only h2 sections.
    const depths = await column
      .locator('.st-toc__list li')
      .evaluateAll((items) => items.map((item) => item.getAttribute('data-depth')));
    expect(depths.length).toBeGreaterThan(5);
    expect(new Set(depths)).toEqual(new Set(['2']));
    // No underline at rest, one on hover; the colour is the muted text colour.
    const link = column.locator('.st-toc__list a').nth(2);
    const style = (): Promise<{ decoration: string; color: string; muted: string }> =>
      link.evaluate((element) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--st-text-muted)';
        document.body.append(probe);
        const muted = getComputedStyle(probe).color;
        probe.remove();
        const css = getComputedStyle(element);
        return { decoration: css.textDecorationColor, color: css.color, muted };
      });
    const rest = await style();
    expect(rest.decoration).toBe('rgba(0, 0, 0, 0)');
    expect(rest.color).toBe(rest.muted);
    await link.hover();
    expect((await style()).decoration).not.toBe('rgba(0, 0, 0, 0)');
    // A link in the running text keeps its underline.
    const prose = page.locator('article .st-blocks p a').first();
    expect(
      await prose.evaluate((element) => getComputedStyle(element).textDecorationLine),
    ).toContain('underline');
  });

  // Review pass 2, minor 2: the column scrolls, and its links' focus ring lost its sides.
  test('a focused contents link shows its whole ring inside the column', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A desktop width with a keyboard.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(DEALER);
    const link = page.locator('.st-toc--column .st-toc__list a').nth(1);
    await link.focus();
    const fit = await link.evaluate((element) => {
      const css = getComputedStyle(element);
      const ring = parseFloat(css.outlineWidth) + parseFloat(css.outlineOffset);
      const box = element.getBoundingClientRect();
      const column = element.closest('.st-toc--column');
      if (!column) throw new Error('No column.');
      const outer = column.getBoundingClientRect();
      return {
        visible: element.matches(':focus-visible'),
        width: parseFloat(css.outlineWidth),
        left: box.left - ring - outer.left,
        // The scroll box ends before a scrollbar, if the column has one.
        right: outer.left + column.clientLeft + column.clientWidth - (box.right + ring),
      };
    });
    expect(fit.visible).toBe(true);
    expect(fit.width).toBeGreaterThanOrEqual(3);
    expect(fit.left).toBeGreaterThanOrEqual(0);
    expect(fit.right).toBeGreaterThanOrEqual(0);
  });

  test('the article is wider without the sidebar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A desktop width.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(DEALER);
    const main = await page.locator('.st-doc__main').boundingBox();
    // The old grid gave the article 1280 − 2 gutters − 272 − 240 − 2 × 32 ≈ 640px.
    expect(main?.width ?? 0).toBeGreaterThan(800);
  });
});

/*
 * Not a <details>: a closed <details> hides its content in WebKit at every width and in print, and
 * revealing it needs `::details-content`, which CI's WebKit does not apply (WP-50 Phase 3 fix after
 * the merge). The rest of the list is hidden only by `screen and (width < 768px)` until a native
 * checkbox is checked, so nothing here depends on an engine's support for `::details-content`.
 */
test.describe('"Sources for this page"', () => {
  test('on a phone shows the first entries and keeps the rest, in the HTML, one tap away', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DEALER);
    const sources = page.locator('section.st-sources');
    await expect(sources.locator('details')).toHaveCount(0);
    const all = sources.locator('li.st-source');
    const total = await all.count();
    expect(total).toBeGreaterThan(10);
    const rest = sources.locator('.st-sources__rest li.st-source');
    expect(await rest.count()).toBe(total - 3);
    await expect(all.first()).toBeVisible();
    await expect(rest.first()).toBeHidden();
    const toggle = sources.getByRole('checkbox');
    await expect(toggle).toHaveCount(1);
    await expect(toggle).not.toBeChecked();
    // The whole 44px label row is the checkbox's hit area (main repair review pass 2, nit 3).
    const row = await sources.locator('.st-sources__more-label').boundingBox();
    const box = await toggle.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual((row?.width ?? 0) - 1);
    // A tap on the label row lands on the transparent checkbox that covers it.
    await sources.locator('.st-sources__toggle').click();
    await expect(toggle).toBeChecked();
    await expect(rest.first()).toBeVisible();
    await expect(rest.last()).toBeVisible();
  });

  /*
   * Main repair review pass 2, blocker 1 and major 1: the name a screen reader gets is the visible
   * phrase, one phrase in both states (checked means shown). Read from Chromium's own accessibility
   * tree over CDP: Playwright's `toHaveAccessibleName` computes a name itself, so it passed while
   * the browser's name was empty.
   */
  for (const [prefix, phrase] of [
    ['', /^Show the other \d+ sources$/],
    ['af/', /^Wys die ander \d+ bronne$/],
  ] as const) {
    test(`/${prefix}${DEALER}: the browser names the control with the visible words, in both states`, async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'Reads the name over CDP, which only Chromium has.');
      await page.setViewportSize(PHONE);
      await page.goto(`${prefix}${DEALER}`);
      const label = page.locator('section.st-sources .st-sources__more-label');
      const toggle = page.locator('section.st-sources .st-sources__toggle');
      const visible = ((await label.textContent()) ?? '').trim();
      expect(visible).toMatch(phrase);
      expect(await chromiumAxName(page, '.st-sources__toggle')).toBe(visible);
      await toggle.click();
      await expect(toggle).toBeChecked();
      expect(((await label.textContent()) ?? '').trim()).toBe(visible);
      expect(await chromiumAxName(page, '.st-sources__toggle')).toBe(visible);
    });
  }

  test('the control works from the keyboard and shows its focus', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A keyboard.');
    await page.setViewportSize(PHONE);
    await page.goto(DEALER);
    const sources = page.locator('section.st-sources');
    const toggle = sources.locator('.st-sources__toggle');
    const label = sources.locator('.st-sources__more-label');
    // Tab to it from the link before it, as a keyboard reader would.
    await sources.locator('ul').first().locator('a').last().focus();
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    expect(await label.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
      'none',
    );
    await page.keyboard.press('Space');
    await expect(toggle).toBeChecked();
    await expect(sources.locator('.st-sources__rest li.st-source').first()).toBeVisible();
  });

  test('from 768px shows every entry, with nothing to open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A tablet width.');
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(DEALER);
    const sources = page.locator('section.st-sources');
    await expect(sources.locator('.st-sources__more-label')).toBeHidden();
    await expect(sources.locator('.st-sources__toggle')).toBeHidden();
    await expect(sources.locator('.st-sources__rest li.st-source').first()).toBeVisible();
    await expect(sources.locator('.st-sources__rest li.st-source').last()).toBeVisible();
  });

  test('prints every entry, and not the control', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DEALER);
    await page.emulateMedia({ media: 'print' });
    const sources = page.locator('section.st-sources');
    await expect(sources.locator('.st-sources__rest li.st-source').first()).toBeVisible();
    await expect(sources.locator('.st-sources__rest li.st-source').last()).toBeVisible();
    await expect(sources.locator('.st-sources__more-label')).toBeHidden();
  });

  /*
   * Main repair review pass 5, minor 1: where the two lists read as one (from 768px, and on paper)
   * the joint between entries 3 and 4 is the same as the space between any other two entries, so
   * entry 4 does not look like part of entry 3.
   */
  for (const [label, setUp] of [
    ['at 1280px', async (page: Page) => page.setViewportSize({ width: 1280, height: 900 })],
    [
      'on paper',
      async (page: Page) => {
        await page.setViewportSize(PHONE);
        await page.emulateMedia({ media: 'print' });
      },
    ],
  ] as const) {
    test(`${label}, entries 3 and 4 sit as far apart as any other two`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name === 'mobile', 'Sets its own width.');
      await page.goto(DEALER);
      await setUp(page);
      const gaps = await page.locator('section.st-sources li.st-source').evaluateAll((items) => {
        const top = (items as HTMLElement[]).filter(
          (item) => item.parentElement?.closest('li.st-source') === null && item.offsetParent,
        );
        return top.slice(1).map((item, index) => {
          const above = top[index]!.getBoundingClientRect();
          return Math.round(item.getBoundingClientRect().top - above.bottom);
        });
      });
      expect(gaps.length).toBeGreaterThan(4);
      // gaps[2] is the joint between the first list's last entry and the rest's first.
      expect(Math.abs(gaps[2]! - gaps[0]!), `gaps ${gaps.join(', ')}`).toBeLessThanOrEqual(1);
    });
  }
});

/*
 * The left sidebar used to list a section's pages from 1024px. "Pick your business type" is both a
 * document and its section's landing (`business-types/`); its "Find your kind of business" cards
 * link every other document of the section, so it needs no second list (main repair review pass 1,
 * major 1). This holds that coverage.
 */
test.describe('the business-types hub', () => {
  const section = MANIFEST.sections.find((entry) => entry.id === 'business-types');
  if (!section) throw new Error('No business-types section in the manifest.');
  for (const prefix of ['', 'af/']) {
    test(`/${prefix}${section.route}: its cards link every document of the section`, async ({
      page,
      basePath,
    }) => {
      await page.goto(`${prefix}${section.route}`);
      const hrefs = await page
        .locator('section[aria-labelledby="st-hub-tiles"] a[href]')
        .evaluateAll((links) =>
          links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
        );
      const others = section.docs
        .map((id) => MANIFEST.docs[id]?.route ?? '')
        .filter((route) => route !== section.route)
        .map((route) => `${basePath}${prefix}${route}`);
      expect(others.length).toBeGreaterThan(5);
      for (const route of others) expect(hrefs, route).toContain(route);
    });
  }
});
