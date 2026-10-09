import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { PathsFileSchema } from '../../src/lib/content/schema';
import { buildPath, pathDocs } from '../../src/lib/path-engine';
import { profileOf, resultRoute, singleChoices } from '../../src/lib/profile';
import { allowConsoleError, expect, test } from './fixtures';
import { holdModules, routeSameOrigin } from './helpers/network';
import { DEFAULT_DIST_DIR, REPO_ROOT } from './helpers/routes';

/**
 * WP-31: Find my path, My path and the personalisation, with JavaScript, on the built site. The
 * no-JavaScript wizard and its result pages are in `nojs.spec.ts`; axe on each step and with the
 * reset dialog open is in `a11y.spec.ts`.
 */

const readJson = <T>(...segments: string[]): T =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, ...segments), 'utf8')) as T;
const paths = PathsFileSchema.parse(readJson('src', 'data', 'paths.json'));
const manifest = readJson<{ docs: Record<string, { route: string; appliesTo: never }> }>(
  'src',
  'data',
  'manifest.json',
);
const en = readJson<{
  wizard: { savedTip: string };
  myPath: { resetDone: string };
  prompts: { profileValues: Record<string, string> };
}>('src', 'i18n', 'en.json');

async function stored(page: Page, key: string): Promise<unknown> {
  return page.evaluate((name) => {
    const raw = window.localStorage.getItem(name);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  }, key);
}

const visibleSteps = (page: Page) => page.locator('[data-steps] > li:visible');

/** Opens My path once, which stores the reader's path for the top bar, the pager and home. */
async function storePath(page: Page): Promise<void> {
  await page.goto('my-path/');
  await expect(visibleSteps(page).first()).toBeVisible();
  expect(await stored(page, 'st.pathView.v1')).not.toBeNull();
}

test.describe('Find my path', () => {
  test('three steps with the keyboard, focus on each heading, then My path', async ({ page }) => {
    await page.goto('find-my-path/');
    const step1 = page.getByRole('heading', { name: /Question 1 of 3/ });
    await expect(step1).toBeVisible();
    await expect(page.getByRole('heading', { name: /Question 2 of 3/ })).toBeHidden();
    await expect(page.locator('[data-stepper="0"]')).toHaveAttribute('aria-current', 'step');
    const next = page.getByRole('button', { name: 'Next' });
    await expect(next).toHaveAttribute('aria-disabled', 'true');

    // Keyboard only: focus the first answer, choose with Space, go on with Enter.
    await page.getByRole('radio', { name: /registered company/ }).focus();
    await page.keyboard.press('Space');
    await expect(next).not.toHaveAttribute('aria-disabled', /.*/);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Question 2 of 3/ })).toBeFocused();
    await expect(page.locator('[data-stepper="1"]')).toHaveAttribute('aria-current', 'step');

    await page.getByRole('checkbox', { name: /Vehicle dealer/ }).focus();
    await page.keyboard.press('Space');
    await page.getByRole('checkbox', { name: /Food business/ }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: /Question 3 of 3/ })).toBeFocused();

    const growing = page.getByRole('radio', { name: /want to grow/ });
    await expect(growing).toBeEnabled();
    await growing.focus();
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: 'See my path' }).click();

    await page.waitForURL(/\/my-path\/$/);
    expect(await stored(page, 'st.profile.v1')).toEqual({
      entity: 'pty',
      businessTypes: ['vehicle-dealer', 'food'],
      stage: 'pty-growing',
    });
    await expect(page.locator('[data-status]')).toHaveText(en.wizard.savedTip);
    // Path 4, with food beside the vehicle dealer at the type step.
    await expect(visibleSteps(page)).toHaveCount(10);
    await expect(visibleSteps(page).nth(3).locator('li[data-doc]:visible')).toHaveCount(2);
  });

  test('“Pty Ltd, growing” is disabled, with its reason, unless the answer is Pty Ltd', async ({
    page,
  }) => {
    // Each click waits until the step it leads to has focus, so no click lands on a step that is
    // on its way out (review WP-31 pass 1, minor 7).
    const question = (n: number) =>
      page.getByRole('heading', { name: `Question ${n} of 3`, exact: false });
    const go = async (button: 'Next' | 'Back', to: number): Promise<void> => {
      await page.locator('[data-step]:not([hidden])').getByRole('button', { name: button }).click();
      await expect(question(to)).toBeFocused();
    };
    await page.goto('find-my-path/');
    await page.getByRole('radio', { name: /own name/ }).check();
    await go('Next', 2);
    await page.getByRole('checkbox', { name: /Beauty/ }).check();
    await go('Next', 3);
    const growing = page.getByRole('radio', { name: /want to grow/ });
    await expect(growing).toBeDisabled();
    await expect(page.locator('[data-pty-reason]')).toBeVisible();
    await go('Back', 2);
    await go('Back', 1);
    await page.getByRole('radio', { name: /registered company/ }).check();
    await go('Next', 2);
    await expect(page.getByRole('checkbox', { name: /Beauty/ })).toBeChecked();
    await go('Next', 3);
    await expect(growing).toBeEnabled();
    await expect(page.locator('[data-pty-reason]')).toBeHidden();
  });

  test('“Edit answers” starts from the saved answers', async ({ page, seedStorage }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'undecided', businessTypes: ['general'], stage: 'not-started' },
    });
    await page.goto('my-path/');
    await page.getByRole('link', { name: 'Edit answers' }).click();
    await page.waitForURL(/\/find-my-path\/$/);
    await expect(page.getByRole('radio', { name: /not decided/ })).toBeChecked();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('checkbox', { name: /General/ })).toBeChecked();
  });

  test('in Afrikaans the wizard saves the same answers and My path is Afrikaans', async ({
    page,
  }) => {
    await page.goto('af/find-my-path/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'af-ZA');
    await page.locator('input[name="entity"][value="sole-prop"]').check();
    await page.locator('[data-step="entity"] [data-next]').click();
    await page.locator('input[name="type"][value="food"]').check();
    await page.locator('[data-step="type"] [data-next]').click();
    await page.locator('input[name="stage"][value="not-started"]').check();
    await page.locator('[data-finish]').click();
    await page.waitForURL(/\/af\/my-path\/$/);
    expect(await stored(page, 'st.profile.v1')).toEqual({
      entity: 'sole-prop',
      businessTypes: ['food'],
      stage: 'not-started',
    });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My roete');
    await expect(visibleSteps(page)).toHaveCount(9);
    await expect(visibleSteps(page).first().getByRole('link')).toHaveAttribute(
      'href',
      /\/af\/core\/start-here\/$/,
    );
  });

  test('when the device will not save, the answers go along in the address', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await page.goto('find-my-path/');
    await page.getByRole('radio', { name: /own name/ }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('checkbox', { name: /Food business/ }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('radio', { name: /already sell/ }).check();
    await expect(page.locator('st-storage-notice')).toBeVisible();
    await page.getByRole('button', { name: 'See my path' }).click();
    await page.waitForURL(/\/my-path\/\?entity=sole-prop&type=food&stage=trading$/);
    await expect(page.locator('st-my-path header st-storage-notice')).toBeVisible();
    await expect(visibleSteps(page)).toHaveCount(4);
  });
});

test.describe('My path', () => {
  const PROFILE = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' };

  test('without answers it shows the way to Find my path', async ({ page }) => {
    await page.goto('my-path/');
    await expect(
      page.getByRole('heading', { name: 'You have not answered the questions yet' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Find my path' }).last()).toHaveAttribute(
      'href',
      /\/find-my-path\/$/,
    );
    await expect(page.locator('[data-dashboard]')).toBeHidden();
  });

  test('marks steps as done, and the rings on My path, the top bar and home follow', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({ 'st.profile.v1': PROFILE });
    await page.goto('my-path/');
    const first = visibleSteps(page).first();
    await expect(first.getByRole('link', { name: 'Master checklist' })).toBeVisible();
    await first
      .getByRole('button', { name: 'Mark as done: Master checklist', exact: true })
      .click();
    await expect(first.locator('[data-done-badge]')).toBeVisible();
    await expect(page.locator('[data-progress] [data-progress-text]')).toHaveText('1 of 4 done');
    expect(Object.keys((await stored(page, 'st.path.v1')) as object)).toEqual(['lookup/checklist']);
    await first
      .getByRole('button', { name: 'Remove the tick: Master checklist', exact: true })
      .click();
    await expect(page.locator('[data-progress] [data-progress-text]')).toHaveText('0 of 4 done');
    await first.getByRole('button', { name: /^Mark as done: / }).click();
    // The kind-of-business step names only the reader's own kind (review WP-31 pass 1, major 4).
    await expect(visibleSteps(page).nth(2).locator('[data-mark]')).toHaveAccessibleName(
      /^Mark as done: Food business/,
    );
    await expect(visibleSteps(page).nth(2).locator('[data-mark]')).not.toHaveAccessibleName(
      /Beauty/,
    );

    const topBar = page.locator('st-path-progress');
    if (await page.locator('.st-topbar__menu-button').isHidden()) {
      await expect(topBar.getByRole('link')).toHaveAccessibleName('My path: 1 of 4 steps done');
    }
    await page.goto('./');
    const card = page.locator('st-your-path');
    await expect(card).toBeVisible();
    await expect(card.getByRole('link', { name: 'Continue: step 2 of 4' })).toHaveAttribute(
      'href',
      /\/core\/tax-and-sars\/$/,
    );
  });

  test(
    'if its module does not run, saved answers still leave a way on',
    {
      annotation: allowConsoleError(
        '/net::ERR_FAILED/',
        "The test blocks My path's module on purpose, and the browser logs the failed request.",
      ),
    },
    async ({ page, seedStorage, baseURL }) => {
      // The empty state is hidden for saved answers until the module draws; when the module
      // fails to load, it shows (review WP-31 pass 1, minor 5; pass 5, minor 2).
      await seedStorage({ 'st.profile.v1': PROFILE });
      await routeSameOrigin(
        page,
        baseURL,
        (url) => url.pathname.endsWith('.js'),
        async (route) => {
          const response = await route.fetch();
          if ((await response.text()).includes('st-my-path')) await route.abort();
          else await route.fulfill({ response });
        },
      );
      await page.goto('my-path/');
      await expect(page.locator('html')).toHaveAttribute('data-st-profile', '');
      await expect(page.locator('[data-empty]')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('link', { name: 'Find my path' }).last()).toBeVisible();
    },
  );

  test('on a slow load, a reader with answers is never told they have none (pass 5, minor 2)', async ({
    page,
    seedStorage,
    baseURL,
  }) => {
    test.setTimeout(30_000);
    await seedStorage({ 'st.profile.v1': PROFILE });
    await routeSameOrigin(
      page,
      baseURL,
      (url) => url.pathname.endsWith('.js') && !url.pathname.includes('theme-init'),
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
      },
    );
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('my-path/', { waitUntil: 'commit' });
    const empty = page.locator('.st-my-path__empty');
    for (const at of [1600, 2400]) {
      await page.waitForTimeout(at === 1600 ? 1600 : 800);
      expect(await empty.isHidden(), `empty state at ${at} ms`).toBe(true);
    }
    await expect(visibleSteps(page).first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThanOrEqual(0.1);
  });

  test('a shared address with answers never replaces saved answers', async ({
    page,
    seedStorage,
  }) => {
    const saved = { entity: 'pty', businessTypes: ['beauty'], stage: 'trading' };
    await seedStorage({ 'st.profile.v1': saved });
    await page.goto('my-path/?entity=sole-prop&type=food&stage=not-started');
    await expect(page.locator('[data-chip="entity:pty"]')).toBeVisible();
    expect(await stored(page, 'st.profile.v1')).toEqual(saved);
  });

  test('the checklist shows only what applies, with ticks shared with /checklist/', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({ 'st.profile.v1': PROFILE });
    await page.goto('my-path/');
    const list = page.locator('st-applies-scope');
    // Part A2 is for a company, Part B's vehicle group for a dealer: hidden, not removed.
    await expect(list.locator('#part-a2-extra-only-if-you-registered-a-pty-ltd')).toBeHidden();
    await expect(list.locator('#part-a2-extra-only-if-you-registered-a-pty-ltd')).toHaveCount(1);
    await expect(list.locator('#vehicle-dealer')).toBeHidden();
    await expect(list.locator('#food')).toBeVisible();
    await expect(list.locator('#my-path-food')).toBeVisible();
    await expect(list.locator('#my-path-beauty')).toBeHidden();
    const box = list.locator('st-checklist input[type="checkbox"]:visible').first();
    const task = await box.getAttribute('data-task');
    await box.check();
    await page.goto('checklist/');
    await expect(page.locator(`input[data-task="${task}"]`).first()).toBeChecked();
  });

  test('“Remove my answers” asks, keeps the ticks, and focuses the heading', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({
      'st.profile.v1': PROFILE,
      'st.checks.v1': { 'lookup/checklist:5cce7722': '2026-10-01T10:00:00.000Z' },
    });
    await page.goto('my-path/');
    const remove = page.getByRole('button', { name: 'Remove my answers' });
    await remove.click();
    const dialog = page.getByRole('dialog', { name: 'Remove your answers?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    expect(await stored(page, 'st.profile.v1')).toEqual(PROFILE);

    await remove.click();
    await dialog.getByRole('button', { name: 'Remove answers' }).click();
    await expect(page.locator('[data-status]')).toHaveText(en.myPath.resetDone);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    expect(await stored(page, 'st.profile.v1')).toBeNull();
    expect(await stored(page, 'st.checks.v1')).toEqual({
      'lookup/checklist:5cce7722': '2026-10-01T10:00:00.000Z',
    });
    await expect(page.locator('[data-empty]')).toBeVisible();
  });
});

test.describe('personalisation elsewhere', () => {
  const FOOD = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' };

  test('the top bar keeps one row with answers from 1024px (review WP-31 pass 2, minor 3)', async ({
    page,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own desktop widths.');
    await seedStorage({ 'st.profile.v1': FOOD });
    await storePath(page);
    for (const width of [1024, 1100, 1180, 1280]) {
      await page.setViewportSize({ width, height: 700 });
      for (const route of ['core/tax-and-sars/', 'af/core/tax-and-sars/']) {
        await page.goto(route);
        const bar = page.locator('.st-topbar');
        await expect(bar.locator('st-path-progress')).toBeVisible();
        await expect(bar.locator('st-path-progress a')).toHaveAccessibleName(
          /(My path|My roete): /,
        );
        const height = await bar.evaluate((element) => element.getBoundingClientRect().height);
        expect(height, `${route} at ${width}px`).toBeLessThan(80);
      }
    }
  });

  test(
    'if the home card’s module fails to load, its kept space goes (pass 3, minor 1)',
    {
      annotation: allowConsoleError(
        '/net::ERR_FAILED/',
        "The test blocks the home card's module on purpose, and the browser logs the failed request.",
      ),
    },
    async ({ page, seedStorage, baseURL }) => {
      await seedStorage({ 'st.profile.v1': FOOD });
      await routeSameOrigin(
        page,
        baseURL,
        (url) => url.pathname.endsWith('.js'),
        async (route) => {
          const response = await route.fetch();
          if ((await response.text()).includes('st-your-path')) await route.abort();
          else await route.fulfill({ response });
        },
      );
      await page.goto('./');
      await expect(page.locator('html')).toHaveAttribute('data-st-profile', '');
      const card = page.locator('st-your-path');
      await expect
        .poll(() => card.evaluate((element) => element.getBoundingClientRect().height), {
          timeout: 5000,
        })
        .toBe(0);
    },
  );

  test(
    'if the path rules fail to load, the home card gives its space back (pass 5, minor 1)',
    {
      annotation: allowConsoleError(
        '/net::ERR_FAILED|Failed to fetch dynamically imported module/',
        'The test blocks the path rules on purpose; the browser logs the failed request and import.',
      ),
    },
    async ({ page, seedStorage, baseURL }) => {
      // No stored path, so the home card must load the rules to draw.
      await seedStorage({ 'st.profile.v1': FOOD });
      await routeSameOrigin(
        page,
        baseURL,
        (url) => url.pathname.includes('/path-data.'),
        (route) => route.abort(),
      );
      await page.goto('./');
      const card = page.locator('st-your-path');
      await expect(card).toHaveAttribute('data-path-failed', '', { timeout: 5000 });
      expect(await card.evaluate((element) => element.getBoundingClientRect().height)).toBe(0);
    },
  );

  test(
    'another script failing leaves the home card’s space alone (pass 5, nit 1)',
    {
      annotation: allowConsoleError(
        '/net::ERR_FAILED/',
        'The test blocks the language switcher on purpose, and the browser logs the failed request.',
      ),
    },
    async ({ page, seedStorage, baseURL }) => {
      await seedStorage({ 'st.profile.v1': FOOD });
      await storePath(page);
      await routeSameOrigin(
        page,
        baseURL,
        (url) => url.pathname.includes('/LanguageSwitcher.'),
        (route) => route.abort(),
      );
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number };
        w.__cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) w.__cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto('./');
      await expect(page.locator('html')).toHaveAttribute(
        'data-st-script-failed',
        /LanguageSwitcher/,
      );
      await expect(page.locator('st-your-path')).toBeVisible();
      await page.waitForTimeout(500);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls).toBeLessThanOrEqual(0.1);
    },
  );

  test('when the home page’s scripts come late, the card moves nothing (pass 4, minor 2)', async ({
    page,
    seedStorage,
    baseURL,
  }) => {
    test.setTimeout(30_000);
    await seedStorage({ 'st.profile.v1': FOOD });
    await routeSameOrigin(
      page,
      baseURL,
      (url) => url.pathname.endsWith('.js') && !url.pathname.includes('theme-init'),
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
      },
    );
    await page.addInitScript(() => {
      const w = window as unknown as { __shifts: number[] };
      w.__shifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput && entry.value > 0.001) w.__shifts.push(entry.value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('./');
    await expect(page.locator('st-your-path')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    const shifts = await page.evaluate(
      () => (window as unknown as { __shifts: number[] }).__shifts,
    );
    // The kept space waits for the card, so only small shifts from other late scripts remain.
    const total = shifts.reduce((sum, value) => sum + value, 0);
    expect(total, `shifts: ${shifts.join(', ')}`).toBeLessThanOrEqual(0.1);
  });

  test('the home card does not move the page when it appears (pass 2, minor 4)', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({ 'st.profile.v1': FOOD });
    await storePath(page);
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('./');
    await expect(page.locator('st-your-path')).toBeVisible();
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThanOrEqual(0.1);
  });

  test('two tabs on different builds do not keep rewriting the stored path (pass 2, minor 1)', async ({
    page,
    context,
    seedStorage,
  }) => {
    await seedStorage({ 'st.profile.v1': FOOD });
    await page.goto('./');
    await expect(page.locator('st-your-path')).toBeVisible();
    const other = await context.newPage();
    await other.goto('./');
    await expect(other.locator('st-your-path')).toBeVisible();
    await other.evaluate(() => {
      const w = window as unknown as { __writes: number };
      w.__writes = 0;
      window.addEventListener('storage', (event) => {
        if (event.key === 'st.pathView.v1') w.__writes++;
      });
    });
    // The first tab behaves as if it were from an older build.
    await page.evaluate(() => {
      const card = document.querySelector<HTMLElement & { update(rebuild: boolean): void }>(
        'st-your-path',
      )!;
      card.dataset['version'] = 'an-older-build';
      card.update(true);
    });
    await page.waitForTimeout(2000);
    const writes = await other.evaluate(() => (window as unknown as { __writes: number }).__writes);
    expect(writes).toBeLessThanOrEqual(2);
    await other.close();
  });

  test('a checklist with nothing left for the reader says so and offers Show (pass 2, minor 2)', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({ 'st.profile.v1': FOOD, 'st.onlyMine': true });
    await page.goto('business-types/beauty/');
    const list = page
      .locator('st-checklist')
      .filter({ has: page.locator('[data-show-list]') })
      .first();
    const line = list.locator('.st-tasklist__hidden');
    await expect(line).toBeVisible();
    await expect(line).toContainText(/items? (is|are) hidden because/);
    await expect(list.locator('fieldset')).toBeHidden();
    await line.getByRole('button', { name: /^Show \d+ hidden items?$/ }).click();
    await expect(list.locator('fieldset')).toBeVisible();
    await expect(list.locator('input[type="checkbox"]').first()).toBeFocused();
  });

  test('a partly hidden checklist offers “Show 1 hidden item” (pass 3, minors 2 and 3)', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({ 'st.profile.v1': FOOD, 'st.onlyMine': true });
    await page.goto('core/you-are-the-business/');
    await expect(page.locator('.st-tasklist__hidden:visible').first()).toContainText(
      '1 item is hidden because it does not apply to you',
    );
    // A stable handle on that list: the line stops matching `:visible` once it is used.
    const index = await page.locator('st-checklist').evaluateAll((lists) =>
      lists.findIndex((list) => {
        const found = list.querySelector<HTMLElement>('.st-tasklist__hidden');
        return found !== null && !found.hidden;
      }),
    );
    const list = page.locator('st-checklist').nth(index);
    const line = list.locator('.st-tasklist__hidden');
    const before = await list.locator('label.st-check:visible').count();
    await line.getByRole('button', { name: 'Show 1 hidden item', exact: true }).click();
    await expect(list.locator('label.st-check:visible')).toHaveCount(before + 1);
    await expect(line).toBeHidden();
  });

  for (const prefix of ['', 'af/']) {
    test(`“Provisional tax” stays for a Pty Ltd reader with the switch on (${prefix || 'en'}; pass 3, major 1)`, async ({
      page,
      seedStorage,
    }) => {
      await seedStorage({
        'st.profile.v1': { entity: 'pty', businessTypes: ['vehicle-dealer'], stage: 'pty-growing' },
        'st.onlyMine': true,
      });
      await page.goto(`${prefix}core/tax-and-sars/`);
      await expect(page.locator('#what-sars-wants-from-a-sole-proprietor')).toBeHidden();
      await expect(
        page.locator('[data-marker-for="what-sars-wants-from-a-sole-proprietor"]'),
      ).toBeVisible();
      await expect(page.locator('#provisional-tax')).toBeVisible();
      await expect(page.locator('#provisional-tax ~ p').first()).toBeVisible();
      await expect(page.locator('#what-sars-wants-from-a-company')).toBeVisible();
    });
  }

  test('saved answers the store rejects do not move the home page (pass 3, minor 1)', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({ 'st.profile.v1': '{"entity":"pty","bad":1}' });
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('./');
    await expect(page.locator('html')).not.toHaveAttribute('data-st-profile', /.*/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThanOrEqual(0.1);
  });

  test('the pager follows the path on a page that is on it', async ({ page, seedStorage }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'pty', businessTypes: ['vehicle-dealer'], stage: 'pty-growing' },
    });
    // A document page reads the path stored on the device and never loads the rules (review
    // WP-31 pass 1, major 1): until a page that can store it has, it keeps the section order.
    await page.goto('core/start-here/');
    await expect(page.locator('a[rel="next"]')).toHaveAttribute('href', /\/core\/register\/$/);
    await page.goto('./');
    await expect(page.locator('st-your-path')).toBeVisible();
    expect(await stored(page, 'st.pathView.v1')).not.toBeNull();
    await page.goto('core/start-here/');
    await expect(page.locator('a[rel="next"]')).toHaveAttribute(
      'href',
      /\/core\/running-a-pty-ltd\/$/,
    );
    await page.goto('core/vehicles/');
    await expect(page.locator('a[rel="next"]')).toHaveAttribute(
      'href',
      /\/core\/tax-and-sars\/#route-4-small-business-corporation-rates-companies-only$/,
    );
    await expect(page.locator('a[rel="prev"]')).toHaveAttribute(
      'href',
      /\/business-types\/vehicle-dealer\/$/,
    );
  });

  test('“Only what applies to me” collapses a section into its marker, and Show brings it back', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.goto('core/tax-and-sars/');
    // Two copies (sidebar from 1024px, above the text below that); one is shown at any width.
    await expect(page.locator('st-applies-switch input[role="switch"]')).toHaveCount(2);
    const shown = page.getByRole('switch', { name: 'Only what applies to me' });
    await expect(shown).toHaveCount(1);
    await shown.check();
    expect(await stored(page, 'st.onlyMine')).toBe(true);
    const heading = page.locator('#what-sars-wants-from-a-company');
    await expect(heading).toBeHidden();
    const marker = page.locator('[data-marker-for="what-sars-wants-from-a-company"]');
    await expect(marker).toContainText(
      'Hidden by “Only what applies to me”: What SARS wants from a company',
    );
    await expect(marker).not.toContainText('only for');
    await marker.getByRole('button', { name: /Show hidden part/ }).click();
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(page.locator('#what-sars-wants-from-a-sole-proprietor')).toBeVisible();

    // The choice is remembered on the next page with parts to hide.
    await page.goto('core/vehicles/');
    await expect(page.locator('#if-you-have-a-registered-company')).toBeHidden();

    // Selling online and importing are things any kind of business may do: never hidden
    // (review WP-31 pass 1, major 3).
    await page.goto('core/what-you-need-to-sell-things/');
    for (const id of [
      'if-you-sell-online',
      'if-you-import-anything',
      'if-you-sell-beauty-or-body-treatments',
      'if-you-sell-second-hand-goods',
    ]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.locator('.st-hidden-marker:visible')).toHaveCount(0);
  });

  test('a link to a hidden section shows it', async ({ page, seedStorage }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
      'st.onlyMine': true,
    });
    await page.goto('core/tax-and-sars/#what-sars-wants-from-a-company');
    await expect(page.locator('#what-sars-wants-from-a-company')).toBeVisible();
    await expect(page.locator('#what-sars-wants-from-a-company')).toBeInViewport();
  });

  test('without answers the switch points at Find my path', async ({ page }) => {
    await page.goto('core/tax-and-sars/');
    await expect(page.getByRole('switch')).toHaveCount(0);
    await expect(
      page.locator('st-applies-switch [data-no-profile]').locator('visible=true'),
    ).toContainText('Answer the questions in Find my path');
  });

  test('/checklist/ offers “Only what applies to me” only with answers', async ({
    page,
    seedStorage,
  }) => {
    await page.goto('checklist/');
    await expect(page.getByRole('radio', { name: 'Only what applies to me' })).toBeHidden();
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.reload();
    await page.getByRole('radio', { name: 'Only what applies to me' }).check();
    await expect(page.locator('#part-a2-extra-only-if-you-registered-a-pty-ltd')).toBeHidden();
    await expect(
      page.locator('[data-marker-for="part-a2-extra-only-if-you-registered-a-pty-ltd"]'),
    ).toBeVisible();
    await expect(page.locator('.st-tasklist__hidden:visible').first()).toHaveText(
      /items? (is|are) hidden because they? do(es)? not apply to you/,
    );
    await page.getByRole('radio', { name: 'Everything' }).check();
    await expect(page.locator('#part-a2-extra-only-if-you-registered-a-pty-ltd')).toBeVisible();
  });

  test('“Fill from my profile” fills the kind of business, says what is left, and undoes', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.goto('branding/marketing-prompts/');
    const figure = page.locator('figure:has(st-prompt-fill)').first();
    const mark = figure.locator('mark[data-key="businessType"]').first();
    await expect(mark).toHaveText('[BUSINESS TYPE]');
    await figure.getByRole('button', { name: /^Fill from my profile: Prompt \d+: / }).click();
    await expect(mark).toHaveText(en.prompts.profileValues['food'] ?? '');
    await expect(figure.locator('st-prompt-fill [role="status"]')).toHaveText(
      /blanks? left to fill in|All blanks are filled in/,
    );
    const undo = figure.getByRole('button', { name: /^Undo filling in: Prompt \d+: / });
    await expect(undo).toBeFocused();
    await undo.click();
    await expect(mark).toHaveText('[BUSINESS TYPE]');
  });
});

test.describe('the pre-rendered result pages', () => {
  const choices = singleChoices();

  test('with JavaScript, one saves its answers and opens My path', async ({ page }) => {
    await page.goto('find-my-path/result/pty/beauty/trading/');
    await expect(page.getByText(/your answers are not saved/)).toBeHidden();
    await page.getByRole('button', { name: 'Save these answers' }).click();
    await page.waitForURL(/\/my-path\/$/);
    expect(await stored(page, 'st.profile.v1')).toEqual({
      entity: 'pty',
      businessTypes: ['beauty'],
      stage: 'trading',
    });
    await expect(page.locator('[data-status]')).toHaveText(en.wizard.savedTip);
  });

  test('every one lists exactly the steps buildPath gives, in both languages', ({
    basePath,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Reads dist/ only; one project is enough.');
    for (const locale of ['', 'af/']) {
      for (const choice of choices) {
        const route = `${locale}${resultRoute('find-my-path/', choice)}`;
        const html = readFileSync(path.join(DEFAULT_DIST_DIR, route, 'index.html'), 'utf8');
        const expected = pathDocs(buildPath(profileOf(choice), manifest as never, paths)).map(
          (item) =>
            `${locale}${manifest.docs[item.doc]?.route ?? '?'}${item.anchor ? `#${item.anchor}` : ''}`,
        );
        const links = [
          ...html.matchAll(/<h3 class="st-step__title"[^>]*>\s*<a href="([^"]+)"/g),
        ].map((match) => (match[1] ?? '').slice(basePath.length));
        expect(links, route).toEqual(expected);
        expect(html, route).toContain('<meta name="robots" content="noindex');
      }
    }
    expect(choices).toHaveLength(49);
  });
});

/**
 * WP-50a, item 2: on a slow phone the wizard's Next showed about 8 s before its script ran, and a
 * tap on it was lost (WP-50 audit, flow 1). Until `<st-wizard>` is ready the page is the
 * no-JavaScript form: no Next, all three questions, and the result button for the answers.
 */
test.describe('Find my path before its script runs', () => {
  const layoutShifts = async (page: Page): Promise<number> =>
    page.evaluate(() =>
      (window as unknown as { stShifts: number[] }).stShifts.reduce((sum, value) => sum + value, 0),
    );
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.assign(window, { stShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          shifts.push((entry as PerformanceEntry & { value: number }).value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
  });

  test('shows no Next while the module is held, and the no-JavaScript form still gets there', async ({
    page,
    baseURL,
  }) => {
    const release = await holdModules(page, baseURL);
    await page.goto('find-my-path/', { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: /Question 1 of 3/ })).toBeVisible();
    await page.waitForTimeout(3000);
    expect(await page.evaluate(() => customElements.get('st-wizard') === undefined)).toBe(true);
    await expect(page.locator('[data-next]:visible, [data-back]:visible')).toHaveCount(0);
    for (const n of [2, 3]) {
      await expect(
        page.getByRole('heading', { name: new RegExp(`Question ${n} of 3`) }),
      ).toBeVisible();
    }
    await page.getByRole('radio', { name: /registered company/ }).check();
    await page.getByRole('radio', { name: /Vehicle dealer/ }).check();
    await page.getByRole('radio', { name: /want to grow/ }).check();
    const submit = page.locator('.st-wizard__result:visible');
    await expect(submit).toHaveCount(1);
    await submit.click();
    await page.waitForURL(/\/find-my-path\/result\/pty\/vehicle-dealer\/pty-growing\/\?/, {
      waitUntil: 'commit',
    });
    release();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your path');
  });

  test('when the script arrives, the steps take over in place, keeping the answer', async ({
    page,
    baseURL,
  }) => {
    const release = await holdModules(page, baseURL);
    await page.goto('find-my-path/', { waitUntil: 'commit' });
    const company = page.getByRole('radio', { name: /registered company/ });
    await company.check();
    const heading = page.getByRole('heading', { name: /Question 1 of 3/ });
    const before = await heading.boundingBox();
    await page.waitForTimeout(3000);
    release();
    await expect(page.locator('st-wizard')).toHaveAttribute('data-ready', '');
    const next = page.getByRole('button', { name: 'Next' });
    await expect(next).toBeVisible();
    await expect(next).not.toHaveAttribute('aria-disabled', /.*/);
    await expect(company).toBeChecked();
    await expect(page.getByRole('heading', { name: /Question 2 of 3/ })).toBeHidden();
    expect((await heading.boundingBox())?.y).toBeCloseTo(before?.y ?? -1, 0);
    expect(await layoutShifts(page)).toBeLessThanOrEqual(0.1);
    await next.click();
    await expect(page.getByRole('heading', { name: /Question 2 of 3/ })).toBeFocused();
  });

  test('a reader already at question 2 stays on it, where it is, when the script arrives', async ({
    page,
    baseURL,
  }) => {
    const release = await holdModules(page, baseURL);
    await page.goto('find-my-path/', { waitUntil: 'commit' });
    await page.getByRole('radio', { name: /registered company/ }).check();
    const second = page.getByRole('heading', { name: /Question 2 of 3/ });
    await second.evaluate((heading) =>
      window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 80),
    );
    const before = await second.boundingBox();
    await page.waitForTimeout(3000);
    release();
    await expect(page.locator('st-wizard')).toHaveAttribute('data-ready', '');
    await expect(second).toBeVisible();
    await expect(page.getByRole('heading', { name: /Question 1 of 3/ })).toBeHidden();
    expect(Math.abs(((await second.boundingBox())?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(
      1,
    );
    expect(await layoutShifts(page)).toBeLessThanOrEqual(0.1);
    await expect(page.locator('[data-stepper="1"]')).toHaveAttribute('aria-current', 'step');
  });

  // Review pass 1, M1: starting on question 3 with question 1 unanswered left "See my path" doing
  // nothing. The wizard starts on the first unanswered question, where question 3 was on screen.
  test('a reader at question 3 with question 1 unanswered is taken to question 1 when the script arrives', async ({
    page,
    baseURL,
  }) => {
    const release = await holdModules(page, baseURL);
    await page.goto('find-my-path/', { waitUntil: 'commit' });
    const third = page.locator('[data-step="stage"]');
    await third.evaluate((step) =>
      window.scrollTo(0, step.getBoundingClientRect().top + window.scrollY - 80),
    );
    await page.getByRole('radio', { name: /not started/ }).check();
    const before = await third.boundingBox();
    await page.waitForTimeout(3000);
    release();
    await expect(page.locator('st-wizard')).toHaveAttribute('data-ready', '');
    const first = page.locator('[data-step="entity"]');
    await expect(page.getByRole('heading', { name: /Question 1 of 3/ })).toBeInViewport();
    await expect(page.getByRole('heading', { name: /Question 3 of 3/ })).toBeHidden();
    await expect(page.locator('[data-stepper="0"]')).toHaveAttribute('aria-current', 'step');
    expect(Math.abs(((await first.boundingBox())?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(
      1,
    );
    expect(await layoutShifts(page)).toBeLessThanOrEqual(0.1);
    // From there the steps work as usual and "See my path" opens My path.
    await page.getByRole('radio', { name: /registered company/ }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('checkbox', { name: /Vehicle dealer/ }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('radio', { name: /want to grow/ }).check();
    await page.getByRole('button', { name: 'See my path' }).click();
    await page.waitForURL(/\/my-path\//);
  });
});
