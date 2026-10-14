import type { Page, Request } from '@playwright/test';
import { allowConsoleError, expect, test } from './fixtures';
import { holdRequests, routeSameOrigin } from './helpers/network';
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

  /**
   * Hold every index request until `release()` is called. `requested` settles once the dialog has
   * asked for the index: only from then on is the index what the dialog waits for. Before it, the
   * dialog's own script may still be on its way, and keys typed then are another case (the tests
   * under "the search dialog while it loads").
   */
  async function holdIndex(
    page: Page,
    baseURL: string | undefined,
  ): Promise<{ release: () => void; requested: Promise<void> }> {
    let release: () => void = () => undefined;
    let asked: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      asked = resolve;
    });
    await routeSameOrigin(
      page,
      baseURL,
      (url) => /\/search\/[a-z]{2,3}\.[0-9a-f]{10}\.json$/.test(url.pathname),
      async (route) => {
        asked();
        await gate;
        await route.continue();
      },
    );
    return { release: () => release(), requested };
  }

  // Review WP-33 pass 2, major 1 and minor 3: Enter while the index is still loading.
  test('Enter while the index loads opens the result for the text when it arrives', async ({
    page,
    baseURL,
  }) => {
    const { release, requested } = await holdIndex(page, baseURL);
    await open(page, DOC);
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await requested;
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    release();
    await expect(page).toHaveURL(/\/glossary\/#pis$/);
  });

  test('Enter while the index loads, then Escape: nothing opens', async ({ page, baseURL }) => {
    const { release, requested } = await holdIndex(page, baseURL);
    await open(page, DOC);
    const before = page.url();
    await page.keyboard.press('/');
    await field(page).fill('notional input tax');
    await requested;
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

/**
 * WP-50a, item 3: on a slow phone the index took 8 to 11 s, and the dialog said nothing meanwhile,
 * with the common questions standing under the typed words as if they were the results (WP-50
 * audit, flow 3). The index and the dialog's script are held here, then released.
 */
test.describe('the search dialog while it loads', () => {
  const INDEX = /\/search\/[a-z]{2,3}\.[0-9a-f]{10}\.json$/;
  const status = (page: Page) => dialog(page).getByRole('status');
  const common = (page: Page) => dialog(page).locator('[data-search-empty]');

  test('fetches the index when it opens, and says "Loading search…" until it is there', async ({
    page,
    baseURL,
  }) => {
    const requests = indexRequests(page);
    const release = await holdRequests(page, baseURL, (url) => INDEX.test(url.pathname));
    await open(page, DOC);
    await page.waitForLoadState('networkidle');
    await page.locator('a.st-topbar__search').click();
    await expect(dialog(page)).toBeVisible();
    await expect(status(page)).toHaveText('Loading search…');
    // Fetched on opening, before a single key: the field is still empty.
    await expect.poll(() => requests.length).toBe(1);
    await expect(field(page)).toHaveValue('');
    // With nothing typed, the common questions are the way on while it loads.
    await expect(common(page)).toBeVisible();
    release();
    await expect(status(page)).toHaveText('');
    await expect(common(page)).toBeVisible();
  });

  test('a query typed before the script and the index arrive shows no common questions under it', async ({
    page,
    baseURL,
  }) => {
    const release = await holdRequests(
      page,
      baseURL,
      (url) => INDEX.test(url.pathname) || /\/_astro\/search(-ui)?\.[^/]+\.js$/.test(url.pathname),
    );
    await open(page, DOC);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => document.documentElement.classList.contains('js'));
    await page.locator('a.st-topbar__search').click();
    await expect(dialog(page)).toBeVisible();
    await expect(status(page)).toHaveText('Loading search…');
    // The live region is written once, not again on every key (review pass 1, m2).
    await status(page).evaluate((element) => {
      const writes: number[] = [];
      Object.assign(window, { stStatusWrites: writes });
      new MutationObserver((records) => writes.push(records.length)).observe(element, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
    await field(page).pressSequentially('vat');
    await expect(common(page)).toBeHidden();
    expect(
      await page.evaluate(() => (window as unknown as { stStatusWrites: number[] }).stStatusWrites),
    ).toEqual([]);
    await expect(status(page)).toHaveText('Loading search…');
    await page.waitForTimeout(3000);
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(common(page)).toBeHidden();
    await expect(status(page)).toHaveText('Loading search…');
    release();
    await expect(page.getByRole('option').first()).toBeVisible();
    await expect(status(page)).toContainText(/result/);
    await expect(common(page)).toBeHidden();
  });

  /*
   * Enter, Escape and the close button before the dialog's own script has arrived. Enter submitted
   * the form to the search page, Escape with text in the field only cleared the text, and a tap on
   * Close did nothing: on a slow phone a reader quicker than the script lost them all (and the e2e
   * tests above sometimes did, under CPU load). A held Enter is cancelled as the script cancels an
   * Enter waiting for the index (`search-ui.ts`, `enterCurrent()`): by closing the dialog or by
   * changing the text.
   */
  // The dialog's script (`search.<hash>.js`), not the search page's (`search.astro_….js`).
  const SCRIPT = /\/_astro\/search\.[\w-]{8}\.js$/;
  const holdScript = (page: Page, baseURL: string | undefined) =>
    holdRequests(page, baseURL, (url) => SCRIPT.test(url.pathname));
  /**
   * Resolves once the script has run. Whatever it does with a held Enter it does in the same turn
   * (`openSearch()`'s `then`), before this polling function can run again.
   */
  const scriptArrived = (page: Page) =>
    page.waitForFunction(() => customElements.get('st-search') !== undefined);
  /** From now on, count the submits of the dialog's form: a replayed Enter is one. */
  const countSubmits = (page: Page) =>
    page.evaluate(() => {
      const counter = { submits: 0 };
      Object.assign(window, { stSubmits: counter });
      document.addEventListener('submit', () => (counter.submits += 1), true);
    });
  const submits = (page: Page) =>
    page.evaluate(
      () => (window as unknown as { stSubmits: { submits: number } }).stSubmits.submits,
    );

  test('Enter before the script arrives opens the result for the text once it does', async ({
    page,
    baseURL,
  }) => {
    const release = await holdScript(page, baseURL);
    await open(page, DOC);
    const before = page.url();
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await page.keyboard.press('Enter');
    await expect(status(page)).toHaveText('Loading search…');
    await expect(dialog(page)).toBeVisible();
    expect(page.url()).toBe(before);
    release();
    await expect(page).toHaveURL(/\/glossary\/#pis$/);
  });

  test('Enter, then Escape, before the script arrives: nothing opens', async ({
    page,
    baseURL,
  }) => {
    const requests = indexRequests(page);
    const release = await holdScript(page, baseURL);
    await open(page, DOC);
    const before = page.url();
    await page.keyboard.press('/');
    await field(page).fill('notional input tax');
    await page.keyboard.press('Enter');
    await countSubmits(page);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    release();
    await scriptArrived(page);
    expect(await submits(page), 'the Enter is not replayed').toBe(0);
    expect(page.url()).toBe(before);
    await expect(dialog(page)).toBeHidden();
    expect(requests, 'a closed dialog fetches no index').toHaveLength(0);
  });

  test('Enter, then the close button, before the script arrives: it closes, and nothing opens', async ({
    page,
    baseURL,
  }) => {
    const release = await holdScript(page, baseURL);
    await open(page, DOC);
    const before = page.url();
    await page.locator('a.st-topbar__search').click();
    await field(page).fill('PIS');
    await page.keyboard.press('Enter');
    await countSubmits(page);
    await dialog(page).locator('[data-search-close]').click();
    await expect(dialog(page)).toBeHidden();
    release();
    await scriptArrived(page);
    expect(await submits(page), 'the Enter is not replayed').toBe(0);
    expect(page.url()).toBe(before);
    await expect(dialog(page)).toBeHidden();
  });

  test('Enter, then other text, before the script arrives: the script searches it and opens nothing', async ({
    page,
    baseURL,
  }) => {
    const release = await holdScript(page, baseURL);
    await open(page, DOC);
    const before = page.url();
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await page.keyboard.press('Enter');
    await countSubmits(page);
    await field(page).fill('EMP201');
    release();
    await scriptArrived(page);
    // The script took over and searched the new text: it is past any replay.
    await expect(page.locator('[role="option"][href$="/glossary/#emp201"]')).toBeVisible();
    expect(await submits(page), 'the Enter is not replayed').toBe(0);
    expect(page.url()).toBe(before);
    await expect(dialog(page)).toBeVisible();
  });

  /*
   * A script that stalls (neither loads nor fails): a held Enter goes to the search page
   * `HELD_ENTER_MS` (8 s, search-boot.ts) after the latest Enter, once. The page's clock is
   * Playwright's: installed before the page loads, so the page loads with time flowing, then
   * paused, so that only the test moves it, instead of waiting 8 s.
   */
  const HELD_ENTER_MS = 8000;
  const SEARCH_PAGE = /\/search\/\?q=PIS$/;
  const START = new Date('2026-01-05T08:00:00+02:00');
  const installClock = (page: Page) => page.clock.install({ time: START });
  const pauseClock = (page: Page) => page.clock.pauseAt(START.getTime() + 3_600_000);

  test('Enter while the script never arrives goes to the search page 8 s later', async ({
    page,
    baseURL,
  }) => {
    await installClock(page);
    // Held for the whole test: a stalled connection neither loads the script nor fails it.
    await holdScript(page, baseURL);
    await open(page, DOC);
    await pauseClock(page);
    const before = page.url();
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await page.keyboard.press('Enter');
    await page.clock.runFor(HELD_ENTER_MS - 100);
    await expect(dialog(page)).toBeVisible();
    expect(page.url()).toBe(before);
    await page.clock.runFor(100);
    await expect(page).toHaveURL(SEARCH_PAGE);
  });

  test('an Enter cancelled by Escape does not cut the wait of the next Enter short', async ({
    page,
    baseURL,
  }) => {
    await installClock(page);
    await holdScript(page, baseURL);
    await open(page, DOC);
    await pauseClock(page);
    const before = page.url();
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await page.clock.runFor(6000);
    await page.keyboard.press('/');
    await expect(field(page)).toHaveValue('PIS');
    await page.keyboard.press('Enter');
    // The first Enter's timer would have fired 2 s after this one.
    await page.clock.runFor(HELD_ENTER_MS - 100);
    await expect(dialog(page)).toBeVisible();
    expect(page.url()).toBe(before);
    await page.clock.runFor(100);
    await expect(page).toHaveURL(SEARCH_PAGE);
  });

  test('a second Enter replaces the first: the wait counts from the second', async ({
    page,
    baseURL,
  }) => {
    await installClock(page);
    await holdScript(page, baseURL);
    await open(page, DOC);
    await pauseClock(page);
    const before = page.url();
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await page.keyboard.press('Enter');
    await page.clock.runFor(3000);
    await page.keyboard.press('Enter');
    await page.clock.runFor(HELD_ENTER_MS - 100);
    await expect(dialog(page)).toBeVisible();
    expect(page.url()).toBe(before);
    await page.clock.runFor(100);
    await expect(page).toHaveURL(SEARCH_PAGE);
  });

  test('a script that arrives after the 8 s fallback does not replay the Enter', async ({
    page,
    baseURL,
  }) => {
    await installClock(page);
    const releaseScript = await holdScript(page, baseURL);
    await open(page, DOC);
    await pauseClock(page);
    // Held from now on: the search page loads as slowly as the script did.
    const releasePage = await holdRequests(page, baseURL, (url) =>
      url.pathname.endsWith('/search/'),
    );
    await page.keyboard.press('/');
    await field(page).fill('PIS');
    await page.keyboard.press('Enter');
    // While the search page is on its way the page cannot be asked (page.evaluate waits for the
    // next document), so it reports each submit on the console.
    const replays: string[] = [];
    page.on('console', (message) => {
      if (message.text() === 'st-submit') replays.push(message.text());
    });
    await page.evaluate(() => {
      document.addEventListener('submit', () => console.log('st-submit'), true);
    });
    const leaving = page.waitForRequest(
      (request) => request.isNavigationRequest() && SEARCH_PAGE.test(request.url()),
    );
    await page.clock.runFor(HELD_ENTER_MS);
    await leaving;
    // The script arrives on the page that is still shown. It replays a held Enter in the turn it
    // runs in; it asks for the index only after loading the results code, a round trip later.
    const indexAsked = page.waitForRequest((request) =>
      /\/search\/[a-z]{2,3}\.[0-9a-f]{10}\.json$/.test(new URL(request.url()).pathname),
    );
    releaseScript();
    await indexAsked;
    expect(replays, 'the Enter is not replayed').toEqual([]);
    releasePage();
    await expect(page).toHaveURL(SEARCH_PAGE);
    await expect(page.locator('#st-search-q')).toHaveValue('PIS');
  });

  test(
    'a script that fails after a held Enter goes to the search page once, not again at 8 s',
    {
      annotation: allowConsoleError(
        '/ERR_FAILED|Failed to fetch dynamically imported module|error loading dynamically imported module/',
        'The test makes the dialog script fail on purpose.',
      ),
    },
    async ({ page, baseURL }) => {
      // Main repair review pass 3, minor 1: the failure handler went to the search page but left
      // the held Enter's timer running, so the form was sent a second time at 8 s.
      await installClock(page);
      let fail: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        fail = resolve;
      });
      await routeSameOrigin(
        page,
        baseURL,
        (url) => SCRIPT.test(url.pathname),
        async (route) => {
          await gate;
          await route.abort();
        },
      );
      await open(page, DOC);
      await pauseClock(page);
      // Each trip to the search page is counted and then cancelled, so the page that sent the
      // Enter stays and its timer could still fire (the clock cannot run while a page loads).
      const counting = await page.evaluate(() => {
        const api = (window as unknown as { navigation?: EventTarget }).navigation;
        const counter = { trips: 0 };
        Object.assign(window, { stTrips: counter });
        api?.addEventListener('navigate', (event) => {
          const navigate = event as Event & { destination: { url: string } };
          if (!new URL(navigate.destination.url).pathname.endsWith('/search/')) return;
          counter.trips += 1;
          navigate.preventDefault();
        });
        return api !== undefined;
      });
      test.skip(!counting, 'Counts trips with the Navigation API, which this browser lacks.');
      const trips = () =>
        page.evaluate(() => (window as unknown as { stTrips: { trips: number } }).stTrips.trips);
      await page.keyboard.press('/');
      await field(page).fill('PIS');
      await page.keyboard.press('Enter');
      await page.clock.runFor(5000);
      expect(await trips()).toBe(0);
      fail();
      await expect.poll(trips).toBe(1);
      await page.clock.runFor(HELD_ENTER_MS);
      expect(await trips(), 'one trip to the search page').toBe(1);
    },
  );

  test(
    'a dialog closed before its script fails to load stays closed, on the same page',
    {
      annotation: allowConsoleError(
        '/ERR_FAILED|Failed to fetch dynamically imported module|error loading dynamically imported module/',
        'The test makes the dialog script fail on purpose.',
      ),
    },
    async ({ page, baseURL }) => {
      let fail: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        fail = resolve;
      });
      let scriptUrl = '';
      await routeSameOrigin(
        page,
        baseURL,
        (url) => SCRIPT.test(url.pathname),
        async (route) => {
          scriptUrl = route.request().url();
          await gate;
          await route.abort();
        },
      );
      const navigations: string[] = [];
      page.on('request', (request) => {
        if (request.isNavigationRequest()) navigations.push(request.url());
      });
      await open(page, DOC);
      const before = page.url();
      navigations.length = 0;
      await page.locator('a.st-topbar__search').click();
      await field(page).fill('VAT');
      await dialog(page).locator('[data-search-close]').click();
      await expect(dialog(page)).toBeHidden();
      // Count the navigations the page starts (the Navigation API, where there is one).
      const counted = await page.evaluate(() => {
        const api = (window as unknown as { navigation?: EventTarget }).navigation;
        const counter = { starts: 0 };
        Object.assign(window, { stNavigations: counter });
        api?.addEventListener('navigate', () => (counter.starts += 1));
        return api !== undefined;
      });
      fail();
      // A module script for the same URL, added after the page's own import, hears of the failure
      // after it: by then the page's handler has run.
      expect(
        await page.evaluate(
          (url) =>
            new Promise<string>((resolve) => {
              const script = document.createElement('script');
              script.type = 'module';
              script.src = url;
              script.addEventListener('load', () => resolve('loaded'));
              script.addEventListener('error', () => resolve('failed'));
              document.head.append(script);
            }),
          scriptUrl,
        ),
      ).toBe('failed');
      if (counted) {
        expect(
          await page.evaluate(
            () => (window as unknown as { stNavigations: { starts: number } }).stNavigations.starts,
          ),
          'no navigation started',
        ).toBe(0);
      }
      expect(navigations).toEqual([]);
      expect(page.url()).toBe(before);
      await expect(dialog(page)).toBeHidden();
    },
  );

  test('one Escape before the script arrives closes the dialog, also with text in the field', async ({
    page,
    baseURL,
  }) => {
    const release = await holdScript(page, baseURL);
    await open(page, DOC);
    const skip = page.locator('.st-skip-link');
    await skip.focus();
    await page.keyboard.press('Control+k');
    await field(page).fill('VAT');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(skip).toBeFocused();
    release();
    await scriptArrived(page);
    await expect(dialog(page)).toBeHidden();
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

/**
 * WP-33 review pass 21, minor 1: for a reader with saved answers, the "My business types" chip
 * appeared only when the results code arrived and pushed the common questions down 64px. Its row
 * is now kept from the start; and no e2e test pressed the chip.
 */
test.describe('the "My business types" chip', () => {
  test('keeps its row while the results code loads, then filters when pressed', async ({
    page,
    baseURL,
    seedStorage,
  }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    const release = await holdRequests(page, baseURL, (url) =>
      /\/_astro\/search-ui\.[^/]+\.js$/.test(url.pathname),
    );
    // The index too: when it lands the "Loading search…" line clears, which is not the chip.
    const releaseIndex = await holdRequests(page, baseURL, (url) =>
      /\/search\/[a-z]{2,3}\.[0-9a-f]{10}\.json$/.test(url.pathname),
    );
    await open(page, DOC);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-st-profile'));
    await page.locator('a.st-topbar__search').click();
    await expect(dialog(page)).toBeVisible();
    const chip = dialog(page).getByRole('button', { name: 'My business types' });
    const question = dialog(page).locator('[data-search-empty] a').first();
    await expect(question).toBeVisible();
    await expect(chip).toBeHidden();
    const before = (await question.boundingBox())?.y ?? Number.NaN;
    release();
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect((await question.boundingBox())?.y ?? Number.NaN).toBeCloseTo(before, 0);
    releaseIndex();

    // Another kind of business's page among the results, then none once the chip is pressed.
    const hrefs = () =>
      page
        .getByRole('option')
        .evaluateAll((options) => options.map((option) => option.getAttribute('href') ?? ''));
    const otherType = (href: string): boolean =>
      /\/business-types\/(?!food\/|pick-your-business-type\/)[^/]+\//.test(href);
    await field(page).fill('stock');
    await expect(page.getByRole('option').first()).toBeVisible();
    expect((await hrefs()).some(otherType), (await hrefs()).join('\n')).toBe(true);
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await hrefs()).filter(otherType)).toEqual([]);
    await expect(page.getByRole('option').first()).toBeVisible();
    await expect(dialog(page).getByRole('status')).toContainText(/result/);
  });
});
