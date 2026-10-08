import type { Page, Request } from '@playwright/test';
import { allowConsoleError, expect, test } from './fixtures';
import { routeSameOrigin } from './helpers/network';
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
    await field(page).fill('VAT');
    // One Escape closes the dialog, even with text in the field (review WP-33 pass 1, minor 3).
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

  test('Afrikaans results are Afrikaans and stay under /af/', async ({ page, basePath }) => {
    await open(page, `af/${DOC}`);
    await page.keyboard.press('/');
    await page.getByRole('combobox').fill('omsetbelasting');
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();
    for (const href of await options.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href') ?? ''),
    )) {
      expect(href).toMatch(new RegExp(`^${basePath}af/`));
    }
    // Every document is translated, so no result carries the English mark (the mark itself is
    // tested on a fixture in tests/dom/search.test.ts).
    await expect(page.locator('.st-search-result__lang')).toHaveCount(0);
    await expect(page.locator('.st-search-result [lang="en-ZA"]')).toHaveCount(0);
  });

  // Review WP-33 pass 1, major 1 and major 2, in the browser.
  test('VAT 264 typed with a space, then Enter at once, opens a VAT264 result', async ({
    page,
  }) => {
    await open(page, DOC);
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await expect(page.getByRole('option').first()).toBeVisible();
    await field(page).fill('VAT 264');
    await page.keyboard.press('Enter');
    // Exactly the first result for VAT264 (review WP-33 pass 2, minor 3).
    await expect(page).toHaveURL(/\/glossary\/#vat264$/);
  });

  // Review WP-33 pass 6, major 1: Enter opens the option on screen, also for a code that is only
  // partly typed.
  for (const [typed, target] of [
    ['SAPS 60', /\/business-types\/vehicle-dealer\/#how-to-register$/],
    ['VAT26', /\/glossary\/#vat264$/],
    // Review WP-33 pass 8, major, and pass 9: the page about how the guide was made, asked for
    // by its title, leads with its first section.
    ['how this was made', /\/start\/how-this-was-made\/#this-toolkit-was-generated-by-ai$/],
  ] as const) {
    test(`${typed} typed, then Enter, opens the first option on screen`, async ({ page }) => {
      await open(page, DOC);
      await page.keyboard.press('/');
      await field(page).fill(typed);
      await expect(page.getByRole('option').first()).toHaveAttribute('href', target);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(target);
    });
  }

  // Review WP-33 pass 7, minor 3: "See all" leads to the results it promises, also for a code
  // that is only partly typed.
  test('VAT26, then "See all", lists the same results on the search page', async ({ page }) => {
    await open(page, DOC);
    await page.keyboard.press('/');
    await field(page).fill('VAT26');
    await expect(page.getByRole('option').first()).toHaveAttribute('href', /\/glossary\/#vat264$/);
    const all = page.locator('[data-search-all] a');
    await expect(all).toBeVisible();
    const promised = Number(/\d+/.exec((await all.textContent()) ?? '')?.[0]);
    expect(promised).toBeGreaterThan(0);
    await all.click();
    await expect(page.locator('[data-search-result]').first()).toHaveAttribute(
      'href',
      /\/glossary\/#vat264$/,
    );
    await expect(page.locator('[data-search-result]')).toHaveCount(promised);
  });

  // Review WP-33 pass 6, major 2: all words first, then any word.
  test('EMP201 deadline lists the EMP201 glossary entry in the dialog', async ({ page }) => {
    await open(page, DOC);
    await page.keyboard.press('/');
    await field(page).fill('EMP201 deadline');
    await expect(page.getByRole('option').first()).toBeVisible();
    await expect(page.locator('[role="option"][href$="/glossary/#emp201"]')).toBeVisible();
  });

  /** Hold every index request until `release()` is called. */
  async function holdIndex(page: Page, baseURL: string | undefined): Promise<() => void> {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await routeSameOrigin(
      page,
      baseURL,
      (url) => /\/search\/[a-z]{2,3}\.[0-9a-f]{10}\.json$/.test(url.pathname),
      async (route) => {
        await gate;
        await route.continue();
      },
    );
    return () => release();
  }

  // Review WP-33 pass 2, major 1 and minor 3: Enter while the index is still loading.
  test('Enter while the index loads opens the result for the text when it arrives', async ({
    page,
    baseURL,
  }) => {
    const release = await holdIndex(page, baseURL);
    await open(page, DOC);
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    release();
    await expect(page).toHaveURL(/\/glossary\/#pis$/);
  });

  test('Enter while the index loads, then Escape: nothing opens', async ({ page, baseURL }) => {
    const release = await holdIndex(page, baseURL);
    await open(page, DOC);
    const before = page.url();
    await page.keyboard.press('/');
    await field(page).fill('notional input tax');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    const indexLoaded = page.waitForResponse((response) =>
      /\/search\/[a-z]{2,3}\.[0-9a-f]{10}\.json$/.test(new URL(response.url()).pathname),
    );
    release();
    await indexLoaded;
    // Give the search time to finish and (wrongly) act.
    await page.waitForFunction(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 500)),
    );
    expect(page.url()).toBe(before);
    await expect(page.locator('.st-search-target')).toHaveCount(0);
  });

  test('the status line is in the accessibility tree before any search', async ({ page }) => {
    await open(page, DOC);
    await page.keyboard.press('/');
    await expect(dialog(page).getByRole('status')).toHaveCount(1);
  });

  test(
    'a failed index says so once, with the way to the contents',
    {
      annotation: allowConsoleError(
        '/status of 500/',
        'The test makes the index answer 500 on purpose to show the failed state.',
      ),
    },
    async ({ page, baseURL }) => {
      await routeSameOrigin(
        page,
        baseURL,
        (url) => /\/search\/[a-z]{2,3}\.[0-9a-f]{10}\.json$/.test(url.pathname),
        (route) => route.fulfill({ status: 500, body: '' }),
      );
      await open(page, DOC);
      await page.keyboard.press('/');
      await field(page).fill('PIS');
      await expect(dialog(page).getByRole('status')).toHaveText('Search could not load.');
      const text = (await dialog(page).innerText()).split('Search could not load.').length - 1;
      expect(text, 'the failure sentence appears once').toBe(1);
      await expect(
        dialog(page).getByRole('link', { name: 'Use the contents page instead.' }),
      ).toBeVisible();
    },
  );

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

  // Review WP-33 pass 6, major 2: the code's own entry is on the first screen of results.
  test('?q=EMP201 deadline lists the EMP201 glossary entry in the first results', async ({
    page,
  }) => {
    await open(page, 'search/?q=EMP201%20deadline');
    const results = page.locator('[data-search-result]');
    await expect(results.first()).toBeVisible();
    const first = await results.evaluateAll((list) =>
      list.slice(0, 5).map((result) => result.getAttribute('href') ?? ''),
    );
    expect(first.some((href) => href.endsWith('/glossary/#emp201'))).toBe(true);
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

/**
 * Review WP-33 pass 21, major 1: the dialog's own script loads on demand, so the first open must
 * not wait for it. The keys are typed one by one (`keyboard.type`, not `fill`, which waits for the
 * field), so a key that reaches the page before the field would be lost and fail the test.
 */
test.describe('the first open of the search dialog keeps every key', () => {
  /** The dialog's own script (`_astro/search.<hash>.js`), not `search-ui` or `search-page`. */
  const DIALOG_SCRIPT = (url: URL): boolean => /\/_astro\/search\.[\w-]+\.js$/.test(url.pathname);

  async function holdDialogScript(
    page: Page,
    baseURL: string | undefined,
    ms: number,
    abort = false,
  ): Promise<void> {
    await routeSameOrigin(page, baseURL, DIALOG_SCRIPT, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      if (abort) await route.abort();
      else await route.continue();
    });
  }

  for (const delay of [0, 2000]) {
    const when = delay === 0 ? 'at once' : 'while the dialog script is held 2 s';
    test(`/ then typing ${when}`, async ({ page, baseURL }) => {
      test.setTimeout(30_000);
      if (delay > 0) await holdDialogScript(page, baseURL, delay);
      await open(page, DOC);
      await page.keyboard.press('/');
      await page.keyboard.type('vat');
      await expect(dialog(page)).toBeVisible();
      await expect(field(page)).toHaveValue('vat');
      // When the script arrives it searches what was typed.
      await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
      await expect(field(page)).toHaveValue('vat');
    });

    test(`Ctrl+K then typing ${when}`, async ({ page, baseURL }) => {
      test.setTimeout(30_000);
      if (delay > 0) await holdDialogScript(page, baseURL, delay);
      await open(page, DOC);
      await page.keyboard.press('Control+k');
      await page.keyboard.type('vat');
      await expect(field(page)).toHaveValue('vat');
      await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
    });

    test(`a click on the search control then typing ${when}`, async ({ page, baseURL }) => {
      test.setTimeout(30_000);
      if (delay > 0) await holdDialogScript(page, baseURL, delay);
      await open(page, DOC);
      await page.locator('.st-topbar__search').click();
      // Open and focused before the script could have arrived.
      await expect(dialog(page)).toBeVisible({ timeout: 1000 });
      await expect(field(page)).toBeFocused({ timeout: 1000 });
      await page.keyboard.type('vat');
      await expect(field(page)).toHaveValue('vat');
      await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
    });
  }

  test(
    'when the dialog script cannot load, the search page opens with what was typed',
    {
      annotation: allowConsoleError(
        '/ERR_FAILED|Failed to fetch dynamically imported module|error loading dynamically imported module/',
        'The test makes the dialog script fail on purpose to show the way on.',
      ),
    },
    async ({ page, baseURL, basePath }) => {
      test.setTimeout(30_000);
      await holdDialogScript(page, baseURL, 1000, true);
      await open(page, DOC);
      await page.keyboard.press('/');
      await page.keyboard.type('vat');
      await expect(page).toHaveURL(new RegExp(`${basePath}search/\\?q=vat$`), { timeout: 15_000 });
    },
  );
});
