import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { REPO_ROOT } from './helpers/routes';

/**
 * WP-50a: what a 320px phone shows, measured on the built pages.
 *
 * - Item 1: the AI notice starts on the first screen at 320×568 (Stoep rule 9, ADR 0006), with the
 *   header in its final state (after the modules and, with saved answers, the path ring), and
 *   "Words used in this file" is closed below 1024px and open from 1024px, with no layout shift.
 * - Item 5: the "Now reading" pill wraps the longest Afrikaans heading instead of cutting it off.
 * - Item 8: a two-column table fits the screen, and a checkbox keeps its size beside long text.
 *
 * The no-JavaScript side of item 1 is in `nojs.spec.ts`.
 */
const PHONE = { width: 320, height: 568 } as const;

/** Before WP-50a the notice started 625 to 812px down on these pages at 320px. */
const NOTICE_PAGES = [
  'business-types/vehicle-dealer/',
  'core/tax-and-sars/',
  'templates/invoice/',
  'af/business-types/vehicle-dealer/',
  'af/core/tax-and-sars/',
  'af/templates/invoice/',
] as const;

/**
 * The notice's top, in viewport pixels, with the page at the top. Its label row (44px) must be on
 * screen too, so the reader sees what the box is, not just its border.
 */
async function noticeTop(page: Page): Promise<number> {
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await page.locator('.st-ai-notice').boundingBox();
  if (!box) throw new Error('The page has no AI notice.');
  return box.y;
}

test.describe('the AI notice on a 320×568 screen', () => {
  for (const route of NOTICE_PAGES) {
    test(`${route}: starts on the first screen`, async ({ page }) => {
      await page.setViewportSize(PHONE);
      await page.goto(route);
      // The header in its final state: the modules have run.
      await page.waitForLoadState('networkidle');
      expect(await noticeTop(page)).toBeLessThanOrEqual(PHONE.height - 44);
    });
  }

  test('stays on the first screen with saved answers, once the top bar shows the path ring', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['vehicle-dealer'], stage: 'trading' },
    });
    await page.setViewportSize(PHONE);
    // My path stores the path, so the next page's top bar draws its ring.
    await page.goto('my-path/');
    await page.waitForLoadState('networkidle');
    for (const route of ['business-types/vehicle-dealer/', 'af/business-types/vehicle-dealer/']) {
      await page.goto(route);
      await expect(page.locator('st-path-progress.st-topbar__path')).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(await noticeTop(page), route).toBeLessThanOrEqual(PHONE.height - 44);
    }
  });
});

test.describe('"Words used in this file"', () => {
  test('is closed below 1024px, so the page starts with the text', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('business-types/vehicle-dealer/');
    const words = page.locator('details#words-used-in-this-file');
    await expect(words).toHaveCount(1);
    await expect(words).not.toHaveAttribute('open');
    await words.locator('summary').click();
    await expect(words).toHaveAttribute('open', '');
  });

  test('is open from 1024px, set before the first paint, so nothing moves', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A desktop width.');
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.assign(window, { stShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          shifts.push((entry as PerformanceEntry & { value: number }).value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('business-types/vehicle-dealer/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('details#words-used-in-this-file')).toHaveAttribute('open', '');
    const shift = await page.evaluate(() =>
      (window as unknown as { stShifts: number[] }).stShifts.reduce((sum, value) => sum + value, 0),
    );
    expect(shift).toBeLessThanOrEqual(0.01);
  });
});

/** The longest heading in the Afrikaans documents, and its page. */
function longestAfrikaansHeading(): { route: string; id: string; text: string } {
  const dir = path.join(REPO_ROOT, 'src', 'data', 'af', 'docs');
  let best = { route: '', id: '', text: '' };
  // `node:fs` only, no globbing (CLAUDE.md, Windows notes).
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(path.join(dir, name), 'utf8')) as {
      route: string;
      headings: { id: string; text: string; depth: number; pseudo?: boolean; hidden?: boolean }[];
    };
    for (const heading of doc.headings) {
      if (heading.depth > 3 || heading.pseudo || heading.hidden) continue;
      if (heading.text.length > best.text.length) {
        best = { route: `af/${doc.route}`, id: heading.id, text: heading.text };
      }
    }
  }
  return best;
}

test.describe('the "Now reading" pill', () => {
  test('wraps the longest Afrikaans heading at 320px instead of cutting it off, and follows the reader', async ({
    page,
  }) => {
    const longest = longestAfrikaansHeading();
    expect(longest.text.length).toBeGreaterThan(60);
    await page.setViewportSize(PHONE);
    await page.goto(longest.route);
    const details = page.locator('details.st-toc--details');
    await details.locator('summary').click();
    await details.locator(`.st-toc__list a[href="#${longest.id}"]`).click();
    const pill = page.locator('[data-toc-pill]');
    await expect(pill).toBeVisible();
    const text = pill.locator('[data-toc-pill-text]');
    await expect(text).toHaveText(longest.text);
    const fit = await pill.evaluate((element) => {
      const title = element.querySelector<HTMLElement>('[data-toc-pill-text]');
      const style = title ? getComputedStyle(title) : null;
      const box = element.getBoundingClientRect();
      return {
        whiteSpace: style?.whiteSpace,
        textOverflow: style?.textOverflow,
        clipped:
          element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
        left: box.left,
        right: box.right,
        height: box.height,
        viewport: document.documentElement.clientWidth,
      };
    });
    expect(fit.whiteSpace).not.toBe('nowrap');
    expect(fit.textOverflow).not.toBe('ellipsis');
    expect(fit.clipped).toBe(false);
    expect(fit.left).toBeGreaterThanOrEqual(0);
    expect(fit.right).toBeLessThanOrEqual(fit.viewport);
    expect(fit.height).toBeGreaterThan(44);
    // Still current: the next section's title replaces it once the reader gets there.
    const after = await page.evaluate((id) => {
      const links = [...document.querySelectorAll<HTMLAnchorElement>('.st-toc--details a')];
      const index = links.findIndex((link) => link.hash === `#${id}`);
      const next = links[index + 1];
      return next ? { id: next.hash.slice(1), text: (next.textContent ?? '').trim() } : null;
    }, longest.id);
    if (!after) throw new Error(`No section after ${longest.id}.`);
    await page.evaluate((id) => {
      const target = document.getElementById(id);
      if (target) window.scrollTo(0, window.scrollY + target.getBoundingClientRect().top - 40);
    }, after.id);
    await expect(text).toHaveText(after.text);
  });
});

test.describe('layout at 320px', () => {
  for (const route of ['checklist/', 'af/checklist/']) {
    test(`${route}: the two-column "Key to the short words" table fits the screen`, async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await page.goto(route);
      const region = page.locator('#key-to-the-short-words ~ .st-table-scroll').first();
      await expect(region).toBeVisible();
      const fit = await region.evaluate((element) => {
        const table = element.querySelector('table');
        const columns = table?.querySelector('tr')?.children.length ?? 0;
        // A short word in the first column ("POPIA") stays whole: one line box.
        const broken = [...element.querySelectorAll('tbody tr > :first-child')]
          .filter((cell) => !/\s/.test((cell.textContent ?? '').trim()))
          .filter((cell) => {
            const range = document.createRange();
            range.selectNodeContents(cell);
            return (
              new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size > 1
            );
          })
          .map((cell) => cell.textContent?.trim());
        return {
          columns,
          broken,
          overflow: element.scrollWidth - element.clientWidth,
          right: table?.getBoundingClientRect().right ?? Number.POSITIVE_INFINITY,
          viewport: document.documentElement.clientWidth,
        };
      });
      expect(fit.columns).toBe(2);
      expect(fit.overflow).toBeLessThanOrEqual(0);
      expect(fit.right).toBeLessThanOrEqual(fit.viewport);
      expect(fit.broken).toEqual([]);
    });
  }

  test('a table of three columns or more still scrolls sideways', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('core/you-are-the-business/');
    const wide = await page
      .locator('.st-table-scroll:not([data-wide="true"])')
      .evaluateAll((regions) =>
        regions
          .map((region) => ({
            columns: region.querySelector('tr')?.children.length ?? 0,
            width: region.querySelector('table')?.getBoundingClientRect().width ?? 0,
          }))
          .filter((entry) => entry.columns >= 3 && entry.columns < 5),
      );
    expect(wide.length).toBeGreaterThan(0);
    for (const entry of wide) expect(entry.width).toBeGreaterThanOrEqual(576);
  });

  test('a checkbox beside long text keeps its size', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('checklist/');
    const boxes = await page.locator('.st-check > input[type="checkbox"]').evaluateAll((inputs) =>
      inputs
        .filter((input) => input.getClientRects().length > 0)
        .map((input) => {
          const label = input.parentElement?.getBoundingClientRect();
          const box = input.getBoundingClientRect();
          return { width: box.width, height: box.height, label: label?.height ?? 0 };
        }),
    );
    const long = boxes.filter((box) => box.label > 70);
    const short = boxes.filter((box) => box.label <= 44);
    expect(long.length).toBeGreaterThan(0);
    expect(short.length).toBeGreaterThan(0);
    const size = short[0]?.width ?? 0;
    expect(size).toBeGreaterThanOrEqual(16);
    for (const box of long) {
      expect(box.width).toBeCloseTo(size, 0);
      expect(box.height).toBeCloseTo(size, 0);
    }
  });
});
