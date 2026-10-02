import type { Page, Request } from '@playwright/test';
import { allowConsoleError, expect, test } from './fixtures';
import { documentUrlProblems } from './helpers/page-checks';

/**
 * WP-33 search, in the `chromium` and `mobile` projects (build plan A7, B3 flow 3). The no-JS half
 * is in `nojs.spec.ts` and axe with the dialog open in `a11y.spec.ts`. The guards fail any test
 * that makes a request to another origin, so every test here also proves search stays on the site.
 */

const DOC = 'business-types/vehicle-dealer/';

/** Requests for a search index (`search/<lang>.<hash>.json`), collected from the moment of the call. */
function indexRequests(page: Page): Request[] {
  const seen: Request[] = [];
  page.on('request', (request) => {
    if (/\/search\/[a-z]{2,3}\.[0-9a-f]{10}\.json$/.test(new URL(request.url()).pathname)) {
      seen.push(request);
    }
  });
  return seen;
}

async function open(page: Page, route: string): Promise<void> {
  const response = await page.goto(route);
  expect(response?.status(), `HTTP status of /${route}`).toBe(200);
}

const dialog = (page: Page) => page.locator('dialog.st-search-dialog');
const field = (page: Page) => page.getByRole('combobox', { name: 'Search the guide' });

test.describe('the search dialog', () => {
  test('/ opens it; SAPS 601 → the first result opens a heading that has focus', async ({
    page,
    basePath,
  }) => {
    const requests = indexRequests(page);
    await open(page, DOC);
    await page.waitForLoadState('networkidle');
    expect(requests, 'the index loads only once search opens').toHaveLength(0);

    await page.keyboard.press('/');
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toBeFocused();
    await field(page).fill('SAPS 601');
    const first = page.getByRole('option').first();
    await expect(first).toBeVisible();
    await expect(first.locator('mark').first()).toHaveText(/SAPS|601/);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0]!.url()).pathname.startsWith(`${basePath}search/`)).toBe(true);

    await page.keyboard.press('ArrowDown');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    const href = (await first.getAttribute('href')) ?? '';
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    const hash = new URL(page.url()).hash;
    expect(hash.length).toBeGreaterThan(1);
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      return { id: active?.id ?? '', tag: active?.tagName.toLowerCase() ?? '' };
    });
    expect(`#${focused.id}`, 'the target of the hash has focus').toBe(hash);
    expect(focused.tag, 'and it is a heading').toMatch(/^h[2-4]$/);
    await expect(page.locator(hash)).toHaveClass(/st-search-target/);
  });

  test('Ctrl+K opens it; Escape closes it and focus goes back', async ({ page }) => {
    await open(page, DOC);
    const skip = page.locator('.st-skip-link');
    await skip.focus();
    await page.keyboard.press('Control+k');
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toBeFocused();
    // The empty state is the common questions, with a way to the contents.
    await expect(dialog(page).getByRole('heading', { name: 'Common questions' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(skip).toBeFocused();
  });

  test('/ does nothing while the reader types in a field', async ({ page }) => {
    await open(page, 'search/');
    const pageField = page.locator('#st-search-q');
    await pageField.focus();
    await page.keyboard.press('/');
    await expect(dialog(page)).toBeHidden();
    await expect(pageField).toHaveValue('/');
  });

  test('the header search control opens it, and a result on the same page moves there', async ({
    page,
  }) => {
    await open(page, DOC);
    await page.locator('.st-topbar__search').click();
    await expect(dialog(page)).toBeVisible();
    await field(page).fill('notional input tax');
    const option = page.locator(`[role="option"][href$="${DOC}#how-notional-input-tax-works"]`);
    await expect(option).toBeVisible();
    await option.click();
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/#how-notional-input-tax-works$/);
    await expect(page.locator('#how-notional-input-tax-works')).toBeFocused();
  });

  test('Afrikaans results stay under /af/ and mark English text', async ({ page, basePath }) => {
    await open(page, `af/${DOC}`);
    await page.keyboard.press('/');
    await page.getByRole('combobox').fill('VAT264');
    const first = page.getByRole('option').first();
    await expect(first).toBeVisible();
    expect(await first.getAttribute('href')).toMatch(new RegExp(`^${basePath}af/`));
    await expect(first.locator('.st-search-result__title')).toHaveAttribute('lang', 'en-ZA');
    await expect(first.locator('.st-search-result__lang')).toHaveText('Engels');
  });

  test('says when nothing matched, with the way to the contents', async ({ page }) => {
    await open(page, '');
    await page.keyboard.press('/');
    await field(page).fill('qqqqzzzz');
    await expect(dialog(page).getByRole('status')).toContainText('Nothing found for “qqqqzzzz”.');
    await expect(dialog(page).getByRole('link', { name: 'Browse all pages' })).toBeVisible();
  });
});

test.describe('the search page', () => {
  test('runs ?q= in place and echoes the query', async ({ page }) => {
    await open(page, 'search/?q=VAT264');
    await expect(page.locator('#st-search-q')).toHaveValue('VAT264');
    await expect(page.getByRole('heading', { name: 'Results for “VAT264”' })).toBeVisible();
    const results = page.locator('[data-search-result]');
    await expect(results.first()).toBeVisible();
    await expect(
      page.locator(`[data-search-result][href$="${DOC}#the-conditions-you-must-meet"]`),
    ).toBeVisible();
  });

  test('a new search updates ?q= without reloading the page', async ({ page }) => {
    await open(page, 'search/');
    const marker = await page.evaluate(() => {
      (window as unknown as { marker: number }).marker = 42;
      return 42;
    });
    await page.locator('#st-search-q').fill('PIS');
    await page.locator('#st-search-q').press('Enter');
    await expect(page).toHaveURL(/\?q=PIS$/);
    await expect(page.locator('[data-search-result]').first()).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(
      marker,
    );
  });
});

test.describe('the 404 page', () => {
  test(
    'suggests pages for the words in the missing address',
    {
      annotation: allowConsoleError(
        '/status of 404/',
        'Browsers log the 404 status of the document itself as a console error.',
      ),
    },
    async ({ page, basePath }) => {
      const response = await page.goto('business-types/vehicle-dealr/');
      expect(response?.status()).toBe(404);
      const suggestion = page.locator('st-search-suggest:not([hidden])');
      await expect(suggestion).toHaveCount(1);
      await expect(suggestion).toHaveAttribute('data-locale', 'en');
      await expect(suggestion.locator('p a')).toHaveAttribute(
        'href',
        new RegExp(`^${basePath}business-types/vehicle-dealer/`),
      );
      expect(await documentUrlProblems(page, basePath), 'URL problems').toEqual([]);
    },
  );
});
