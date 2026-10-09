import { expect, test } from './fixtures';

/**
 * WP-50a: what a 320px phone shows, measured on the built pages.
 *
 * - Item 8: a two-column table fits the screen, and a checkbox keeps its size beside long text.
 */
const PHONE = { width: 320, height: 568 } as const;

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
