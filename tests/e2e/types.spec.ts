import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WP-50 Phase 3, item 3: the business-type pages and "Pick your business type"
 * (`src/components/pages/TypeFacts.astro`, `TypeJump.astro`, `TableScroll` `stack="rows"`).
 *
 * - A type's facts sit in its header: the read time and the effort meter on one line, the hub's
 *   "Main reason" under them, on the first screen of a 360×740 phone in both languages; the art
 *   square only from 480px.
 * - "Go straight to" links to the type's other "what you need" sections, its timing and its
 *   checklist, each a 44px target that lands on its heading.
 * - "Only what applies to me" is offered only where it can hide something besides the page's own
 *   kind of business (the vehicle dealer's "If you trade as a company").
 * - The hub's two tables stack as cards in a narrow column, with nothing scrolling sideways and
 *   every cell shown, and stay tables in a wide one.
 */
const TYPES = [
  'vehicle-dealer',
  'food',
  'beauty',
  'retail-online',
  'services-trades',
  'professional-creative',
] as const;
const PHONE = { width: 360, height: 740 } as const;

/** Bottom of an element in page pixels, after the web fonts. */
async function pageBottom(page: Page, selector: string): Promise<number> {
  return page.evaluate(async (css) => {
    await document.fonts.ready;
    const element = document.querySelector(css);
    if (!element) throw new Error(`No ${css}`);
    return element.getBoundingClientRect().bottom + window.scrollY;
  }, selector);
}

test.describe('a business type’s facts', () => {
  test('are on the first screen of a 360×740 phone, with the effort and its reason', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    for (const lang of ['', 'af/']) {
      for (const type of TYPES) {
        const route = `${lang}business-types/${type}/`;
        await page.goto(route);
        const facts = page.locator('article header .st-type-facts');
        await expect(facts, route).toHaveCount(1);
        await expect(facts.locator('.st-type-facts__line .st-effort'), route).toHaveCount(1);
        await expect(facts.locator('.st-type-facts__line .st-badge'), route).toHaveCount(1);
        await expect(facts.locator('.st-type-facts__reason'), route).not.toBeEmpty();
        expect(await pageBottom(page, '.st-type-facts'), route).toBeLessThanOrEqual(PHONE.height);
      }
    }
  });

  test('quote the hub’s "Main reason" in the page’s language', async ({ page }) => {
    await page.goto('business-types/food/');
    await expect(page.locator('.st-type-facts__reason')).toHaveText(
      'Certificate of Acceptability, training, inspections',
    );
    await expect(page.locator('.st-type-facts .st-effort__value')).toHaveText('High');
    await page.goto('business-types/professional-creative/');
    await expect(page.locator('.st-type-facts__reason')).toHaveText('Usually no licence at all');
    await page.goto('af/business-types/vehicle-dealer/');
    await expect(page.locator('.st-type-facts__reason')).toHaveText(
      'Drie aparte lae van registrasie',
    );
    await expect(page.locator('.st-type-facts__reason')).not.toHaveAttribute('lang');
  });

  test('show the type’s illustration from 480px, and not on a narrower phone', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.goto('business-types/food/');
    const art = page.locator('.st-type-facts__art');
    await page.setViewportSize({ width: 768, height: 900 });
    await expect(art).toBeVisible();
    await expect(art.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await page.setViewportSize({ width: 479, height: 900 });
    await expect(art).toBeHidden();
  });
});

test.describe('"Go straight to"', () => {
  test('links to the other sections a reader looks for, and each lands on its heading', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto('business-types/food/');
    const links = page.locator('.st-type-jump a');
    await expect(links).toHaveText([
      'Everything else you may need',
      'Realistic timing',
      'Your checklist',
    ]);
    await expect(page.getByRole('list', { name: 'Go straight to' })).toBeVisible();
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await links.filter({ hasText: 'Your checklist' }).click();
    await expect(page).toHaveURL(/#your-checklist$/);
    await expect(page.locator('#your-checklist')).toBeInViewport();
    // The text's first section starts under the disclosures, so it has no link of its own.
    await page.goto('business-types/vehicle-dealer/');
    await expect(page.locator('.st-type-jump a')).toHaveCount(1);
    await expect(page.locator('.st-type-jump a')).toHaveAttribute(
      'href',
      '#your-startup-checklist',
    );
    await page.goto('af/business-types/food/');
    await expect(page.locator('.st-type-jump a')).toHaveText([
      'Alles anders wat jy dalk nodig het',
      'Realistiese tydsberekening',
      'Jou kontrolelys',
    ]);
  });

  test('comes after the AI notice, and the facts before it on a tall phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('af/business-types/food/');
    const order = await page.evaluate(() =>
      ['.st-type-facts', '.st-ai-notice', '.st-type-jump', 'details.st-toc--details'].map(
        (css) => document.querySelector(css)?.getBoundingClientRect().top ?? -1,
      ),
    );
    expect(
      order.every((top, i) => i === 0 || top > (order[i - 1] ?? 0)),
      order.join(),
    ).toBe(true);
  });
});

test.describe('"Only what applies to me" on business types', () => {
  test('is offered only where it can hide more than the page’s own kind of business', async ({
    page,
  }) => {
    for (const type of TYPES.filter((id) => id !== 'vehicle-dealer')) {
      await page.goto(`business-types/${type}/`);
      await expect(page.locator('st-applies-switch'), type).toHaveCount(0);
      await expect(page.locator('st-applies-scope'), type).toHaveCount(0);
    }
    await page.goto('business-types/vehicle-dealer/');
    await expect(page.locator('st-applies-switch')).toHaveCount(1);
    // The dealer's own checklist carries no condition on its own page, so the switch never hides
    // it; "If you trade as a company" keeps its entity.
    await expect(page.locator('article [data-types]')).toHaveCount(0);
    await expect(page.locator('#if-you-trade-as-a-company')).toHaveAttribute('data-entity', 'pty');
    // Without answers the line says what the switch is for before pointing at Find my path.
    await expect(page.locator('st-applies-switch [data-no-profile]')).toContainText(
      'To see only the parts of this page that apply to you',
    );
  });
});

test.describe('the tables on "Pick your business type"', () => {
  test('stack as cards at 320px in Afrikaans, with every cell shown and nothing sideways', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Sets its own widths.');
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('af/business-types/');
    const regions = page.locator('st-table-scroll[data-stack="rows"]');
    await expect(regions).toHaveCount(2);
    for (const region of await regions.all()) {
      const shape = await region.evaluate((el) => ({
        over: el.scrollWidth - el.clientWidth,
        rowDisplay: getComputedStyle(el.querySelector('tbody tr') as Element).display,
        cells: [...el.querySelectorAll('tbody td')].map((cell) => {
          const box = cell.getBoundingClientRect();
          const label = getComputedStyle(cell, '::before').content;
          return { width: box.width, right: box.right, label, text: cell.textContent ?? '' };
        }),
        right: el.getBoundingClientRect().right,
      }));
      expect(shape.over).toBeLessThanOrEqual(0);
      expect(shape.rowDisplay).toBe('block');
      for (const cell of shape.cells) {
        expect(cell.text.trim().length, cell.text).toBeGreaterThan(0);
        expect(cell.right, cell.text).toBeLessThanOrEqual(shape.right + 0.5);
        // Each cell shows its column's heading above its words.
        expect(cell.label, cell.text).not.toBe('none');
      }
    }
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 320);
  });

  test('stay tables in a wide column', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A desktop width.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('business-types/');
    const displays = await page
      .locator('st-table-scroll[data-stack="rows"] tbody tr')
      .evaluateAll((rows) => rows.map((row) => getComputedStyle(row).display));
    expect(displays.length).toBeGreaterThan(0);
    for (const display of displays) expect(display).toBe('table-row');
  });

  test('keep their table semantics when stacked (Chromium’s own tree)', async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Reads the tree over CDP, which only Chromium has.');
    test.skip(testInfo.project.name === 'mobile', 'Sets its own width.');
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('af/business-types/');
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Accessibility.enable');
      const { nodes } = await session.send('Accessibility.getFullAXTree');
      const roles = nodes.map((node) => node.role?.value);
      const tables = roles.filter((role) => role === 'table').length;
      expect(tables).toBeGreaterThanOrEqual(2);
      // 6 rows of 2 cells and 6 rows of 3: 30 body cells, and the column headers.
      expect(roles.filter((role) => role === 'cell').length).toBeGreaterThanOrEqual(30);
      expect(roles.filter((role) => role === 'columnheader').length).toBeGreaterThanOrEqual(5);
    } finally {
      await session.detach();
    }
  });
});
