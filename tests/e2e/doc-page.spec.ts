import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WP-50 Phase 3, item 1: the document page to direction A (`docs/work-packages/WP-50-directions.md`,
 * "Layout concepts → Document"; `src/layouts/Doc.astro`).
 *
 * - The top of the page, in order: a one-line breadcrumb with the section's hue dot (no "Section:"
 *   label), the H1, the lead, the read time and the effort meter on one line, the compact AI notice,
 *   the translation notice, then two closed disclosures with a chevron, then the text.
 * - On the vehicle-dealer page the text's first heading is within two phone screens at 360×740.
 * - From 1280px: no left section sidebar, and a quiet contents column of h2 sections on the right.
 * - "Sources for this page" shows its first entries on a phone and keeps the rest in a disclosure;
 *   every entry stays in the HTML, and from 768px all of them show.
 */
const DEALER = 'business-types/vehicle-dealer/';
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
        'article header .st-doc__meta',
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
      // The read time and the effort meter share one paragraph.
      await expect(page.locator('article header .st-doc__meta .st-effort')).toHaveCount(1);
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

  test('vehicle dealer: the first heading of the text is within two screens at 360×740', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DEALER);
    await page.waitForLoadState('networkidle');
    expect(await pageTop(page, 'article .st-blocks h2')).toBeLessThanOrEqual(TWO_SCREENS);
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

  test('the article is wider without the sidebar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A desktop width.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(DEALER);
    const main = await page.locator('.st-doc__main').boundingBox();
    // The old grid gave the article 1280 − 2 gutters − 272 − 240 − 2 × 32 ≈ 640px.
    expect(main?.width ?? 0).toBeGreaterThan(800);
  });
});

test.describe('"Sources for this page"', () => {
  test('on a phone shows the first entries and keeps the rest, in the HTML, in a disclosure', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DEALER);
    const sources = page.locator('section.st-sources');
    const all = sources.locator('li.st-source');
    const total = await all.count();
    expect(total).toBeGreaterThan(10);
    const more = sources.locator('details.st-sources__more');
    await expect(more).not.toHaveAttribute('open');
    const hidden = more.locator('li.st-source');
    expect(await hidden.count()).toBe(total - 3);
    await expect(hidden.first()).toBeHidden();
    await expect(all.first()).toBeVisible();
    await more.locator('summary').click();
    await expect(hidden.first()).toBeVisible();
  });

  test('from 768px shows every entry, with no disclosure to open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A tablet width.');
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(DEALER);
    const more = page.locator('section.st-sources details.st-sources__more');
    await expect(more.locator('summary')).toBeHidden();
    await expect(more.locator('li.st-source').last()).toBeVisible();
  });

  test('prints every entry', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(DEALER);
    await page.emulateMedia({ media: 'print' });
    await expect(
      page.locator('section.st-sources details.st-sources__more li.st-source').last(),
    ).toBeVisible();
  });
});
