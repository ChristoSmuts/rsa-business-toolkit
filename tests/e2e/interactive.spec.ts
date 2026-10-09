import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { holdModules, holdRequests } from './helpers/network';
import { REPO_ROOT } from './helpers/routes';

/**
 * WP-30: the store and the interactive pieces, on the built site.
 *
 * Checklists (tick, reload, the same tick on `/checklist/` and in Afrikaans, filter, reset),
 * copy buttons (the clipboard holds the prompt byte for byte), scroll-spy, settings and clear my
 * data, storage that throws, keyboard shortcuts and the language banner. The no-JavaScript side of
 * each is in `nojs.spec.ts`, and axe runs with each dialog open in `a11y.spec.ts`.
 */

interface Dictionary {
  checklist: { resetDone: string; storageUnavailable: string; noJs: string };
  about: { settings: { clearDone: string } };
  lang: { continueBanner: { action: string; message: string } };
}
const readJson = <T>(...segments: string[]): T =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, ...segments), 'utf8')) as T;
const en = readJson<Dictionary>('src', 'i18n', 'en.json');
const af = readJson<Dictionary>('src', 'i18n', 'af.json');

interface CodeBlock {
  kind: string;
  variant?: string;
  text?: string;
}
interface TaskList {
  kind: string;
  items?: { id: string }[];
}

/** A document with one short checklist of its own. */
const DOC = 'core/what-you-need-to-sell-things/';
const DOC_ID = 'core/what-you-need-to-sell-things';
const DOC_TASKS = (
  readJson<{ blocks: TaskList[] }>(
    'src',
    'data',
    'en',
    'docs',
    `core__what-you-need-to-sell-things.json`,
  ).blocks.find((block) => block.kind === 'tasklist')?.items ?? []
).map((item) => item.id);

const CHECKLIST = 'checklist/';

/** A document task that repeats a master-checklist task (`content-meta/task-links.json`). */
const LINKED_DOC = 'business-types/services-trades/';
const LINKED = readJson<{ tasks: { id: string; doc: string; sameAs?: string }[] }>(
  'src',
  'data',
  'en',
  'tasks.json',
).tasks.find((task) => task.doc === 'business-types/services-trades' && task.sameAs);
const PROMPTS = 'branding/branding-prompts/';
const FIRST_PROMPT =
  readJson<{ blocks: CodeBlock[] }>(
    'src',
    'data',
    'en',
    'docs',
    'branding__branding-prompts.json',
  ).blocks.find((block) => block.kind === 'code' && block.variant === 'prompt')?.text ?? '';

/** Every `st.` key in the page's storage, sorted. */
async function stKeys(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('st.'))
      .sort(),
  );
}

async function storedChecks(page: Page): Promise<Record<string, string>> {
  return page.evaluate(
    () => JSON.parse(window.localStorage.getItem('st.checks.v1') ?? '{}') as Record<string, string>,
  );
}

test.describe('checklists', () => {
  test('a tick on a document survives a reload, is counted on /checklist/ and shows in Afrikaans', async ({
    page,
  }) => {
    expect(DOC_TASKS.length).toBeGreaterThan(1);
    const [first] = DOC_TASKS;
    await page.goto(DOC);
    const box = page.locator(`input[data-task="${first}"]`);
    await box.check();
    const progress = page.locator('st-checklist-progress').first();
    await expect(progress).toHaveText(`1 of ${DOC_TASKS.length} done`);
    expect(Object.keys(await storedChecks(page))).toEqual([first]);

    await page.reload();
    await expect(page.locator(`input[data-task="${first}"]`)).toBeChecked();
    await expect(page.locator('st-checklist-progress').first()).toHaveText(
      `1 of ${DOC_TASKS.length} done`,
    );

    await page.goto(CHECKLIST);
    const elsewhere = page.locator('#st-checklist-elsewhere ~ ul li', {
      has: page.locator(`a[href$="/${DOC}"]`),
    });
    await expect(elsewhere.locator('st-checklist-progress')).toHaveText(
      `1 of ${DOC_TASKS.length} done`,
    );

    await page.goto(`af/${DOC}`);
    await expect(page.locator(`input[data-task="${first}"]`)).toBeChecked();
    expect(DOC_ID).toBe(first?.split(':')[0]);
  });

  test('a linked task ticked on its document is ticked on /checklist/, and the other way round', async ({
    page,
  }) => {
    expect(LINKED?.sameAs, 'services-trades has a task linked to /checklist/').toBeTruthy();
    const docBox = `input[id="${LINKED?.id ?? ''}"]`;
    const masterBox = `input[id="${LINKED?.sameAs ?? ''}"]`;

    await page.goto(LINKED_DOC);
    await page.locator(docBox).check();
    expect(Object.keys(await storedChecks(page))).toEqual([LINKED?.sameAs]);
    await page.goto(CHECKLIST);
    await expect(page.locator(masterBox)).toBeChecked();
    await expect(page.locator('.st-checklist-summary__overall [data-progress-text]')).toHaveText(
      /^1 of \d+ done$/,
    );

    // Unticking on /checklist/ unticks it on the document too.
    await page.locator(masterBox).uncheck();
    await page.goto(LINKED_DOC);
    await expect(page.locator(docBox)).not.toBeChecked();

    // Ticking on /checklist/ ticks it on the document, in either language.
    await page.goto(CHECKLIST);
    await page.locator(masterBox).check();
    await page.goto(LINKED_DOC);
    await expect(page.locator(docBox)).toBeChecked();
    await page.goto(`af/${LINKED_DOC}`);
    await expect(page.locator(docBox)).toBeChecked();
  });

  test('a box ticked before the checklist script runs is kept and saved', async ({
    page,
    baseURL,
  }) => {
    const release = await holdModules(page, baseURL);
    await page.goto(LINKED_DOC, { waitUntil: 'commit' });
    const first = page.locator('st-checklist input[type="checkbox"]').first();
    await first.check();
    expect(await page.evaluate(() => customElements.get('st-checklist') === undefined)).toBe(true);
    release();
    await page.waitForLoadState('load');
    await page.waitForFunction(() => customElements.get('st-checklist') !== undefined);
    await expect(first).toBeChecked();
    await page.reload();
    await expect(page.locator('st-checklist input[type="checkbox"]').first()).toBeChecked();
  });

  test('a switch turned off before the settings script runs stays off and is saved', async ({
    page,
    baseURL,
  }) => {
    const release = await holdModules(page, baseURL);
    await page.goto('about/', { waitUntil: 'commit' });
    const toggle = page.getByRole('switch', { name: 'Single-key shortcuts' });
    await toggle.uncheck();
    release();
    await page.waitForLoadState('load');
    await page.waitForFunction(() => customElements.get('st-setting') !== undefined);
    await expect(toggle).not.toBeChecked();
    expect(await page.evaluate(() => window.localStorage.getItem('st.shortcuts'))).toBe('false');
  });

  test('a tick saved under a key that has since changed moves to the key used now', async ({
    page,
    seedStorage,
  }) => {
    // Saved under the document task's own id, as before it was linked to its master task.
    const when = '2026-10-01T10:00:00.000Z';
    await seedStorage({ 'st.checks.v1': { [LINKED?.id ?? 'x']: when } });
    await page.goto(CHECKLIST);
    await expect(page.locator(`input[id="${LINKED?.sameAs ?? ''}"]`)).toBeChecked();
    expect(await storedChecks(page)).toEqual({ [LINKED?.sameAs ?? '']: when });
  });

  test('/checklist/ counts ticks, filters what is not done yet and removes ticks after asking', async ({
    page,
  }) => {
    await page.goto(CHECKLIST);
    const boxes = page.locator('st-checklist input[type="checkbox"]');
    const total = await boxes.count();
    expect(total).toBeGreaterThan(50);
    const overall = page.locator('.st-checklist-summary__overall');
    await expect(overall.locator('[data-progress-text]')).toHaveText(`0 of ${total} done`);

    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await expect(overall.locator('[data-progress-text]')).toHaveText(`2 of ${total} done`);
    await expect(overall.locator('svg[role="img"]')).toHaveAttribute(
      'aria-label',
      `2 of ${total} done`,
    );
    const firstPart = page.locator('.st-checklist-summary__part').first();
    await expect(firstPart.locator('[data-progress-text]')).toHaveText(/^2 of \d+ done$/);

    // "Not done yet" hides what is ticked; "Everything" brings it back.
    await page.getByRole('radio', { name: 'Not done yet' }).check();
    await expect(boxes.nth(0)).toBeHidden();
    await expect(boxes.nth(2)).toBeVisible();
    await page.getByRole('radio', { name: 'Everything' }).check();
    await expect(boxes.nth(0)).toBeVisible();

    // Escape cancels: nothing is removed, and focus returns to the button.
    const reset = page.getByRole('button', { name: 'Remove ticks' });
    await reset.click();
    const dialog = page.getByRole('dialog', { name: 'Remove all ticks?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Keep my ticks' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(reset).toBeFocused();
    await expect(boxes.nth(0)).toBeChecked();

    await reset.click();
    await dialog.getByRole('button', { name: 'Remove ticks' }).click();
    await expect(dialog).toBeHidden();
    await expect(boxes.nth(0)).not.toBeChecked();
    await expect(overall.locator('[data-progress-text]')).toHaveText(`0 of ${total} done`);
    await expect(page.locator('st-checklist-tools [role="status"]')).toHaveText(
      en.checklist.resetDone,
    );
    expect(await storedChecks(page)).toEqual({});
  });

  test('a "Not done yet" filter the browser restores is applied', async ({ page }) => {
    await page.goto(CHECKLIST);
    const first = page.locator('st-checklist input[type="checkbox"]').first();
    await first.check();
    await page.getByRole('radio', { name: 'Not done yet' }).check();
    await expect(first).toBeHidden();
    // A reload that keeps form state, as Firefox does and Back without the cache does.
    await page.evaluate(() => {
      const radio = document.querySelector<HTMLInputElement>('input[value="not-done"]');
      const tools = radio?.closest('st-checklist-tools');
      if (!radio || !tools) return;
      const parent = tools.parentElement;
      const next = tools.nextSibling;
      tools.remove();
      document.querySelectorAll<HTMLLabelElement>('st-checklist label').forEach((label) => {
        label.hidden = false;
      });
      parent?.insertBefore(tools, next);
    });
    await expect(page.getByRole('radio', { name: 'Not done yet' })).toBeChecked();
    await expect(first).toBeHidden();
  });

  test('ticks still work for the page view when storage throws, and the page says so', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await page.goto(DOC);
    const notice = page.locator('st-storage-notice:not([data-show])');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(en.checklist.storageUnavailable);
    // The "saved on this device" line goes, so the page never says both.
    await expect(page.locator('.st-tasklist__saved')).toBeHidden();
    const box = page.locator('st-checklist input[type="checkbox"]').first();
    await box.check();
    await expect(box).toBeChecked();
    await expect(page.locator('st-checklist-progress').first()).toHaveText(
      `1 of ${DOC_TASKS.length} done`,
    );
  });

  test('the storage notice stays hidden while storage works', async ({ page }) => {
    await page.goto(DOC);
    await expect(page.locator('.st-tasklist__saved')).toBeVisible();
    await expect(page.locator('st-storage-notice:not([data-show])')).toBeHidden();
    await expect(page.locator('.st-tasklist__no-js')).toBeHidden();
  });
});

test.describe('copy buttons', () => {
  test('copy puts the whole prompt on the clipboard, byte for byte', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Clipboard permissions are Chromium-only.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    expect(FIRST_PROMPT.length).toBeGreaterThan(20);
    await page.goto(PROMPTS);
    const figure = page.locator('figure.st-code[data-variant="prompt"]').first();
    const button = figure.locator('st-copy button');
    await expect(button).toBeVisible();
    await expect(button).toHaveAccessibleName(/^Copy prompt: The refine prompt/);
    await button.click();
    await expect(button).toHaveText('Copied');
    await expect(figure.locator('[role="status"]')).toHaveText(/^Copied: The refine prompt/);
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(FIRST_PROMPT);
    const copied = await page.evaluate(
      () => JSON.parse(window.localStorage.getItem('st.prompts.v1') ?? '{}') as object,
    );
    expect(Object.keys(copied)).toHaveLength(1);
    await expect(button).toHaveText('Copy prompt', { timeout: 5000 });
  });

  test('when the clipboard refuses, the prompt is selected and the page says how to copy it', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
      });
    });
    await page.goto(PROMPTS);
    const figure = page.locator('figure.st-code[data-variant="prompt"]').first();
    await figure.locator('st-copy button').click();
    await expect(figure.locator('[role="status"]')).toContainText('Could not copy');
    const selected = await page.evaluate(() => document.getSelection()?.toString() ?? '');
    expect(selected).toBe(FIRST_PROMPT);
  });
});

/**
 * WP-50a, item 9: the copy button and its "Copied" message name a prompt by the heading above it,
 * which carries the guide's own numbering. A count in page order called "Prompt 0" "Prompt 4".
 */
test.describe('prompt names', () => {
  /** Every prompt's copy name and message, with the text of the nearest heading above it. */
  async function promptNames(page: Page) {
    return page.locator('figure.st-code[data-variant="prompt"]').evaluateAll((figures) =>
      figures.map((figure) => {
        const headings = [...document.querySelectorAll('.st-blocks :is(h2, h3, h4, h5)')];
        const above = headings.filter(
          (heading) => heading.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
        return {
          heading: (above.at(-1)?.textContent ?? '').trim(),
          name: figure.querySelector('st-copy button')?.getAttribute('aria-label') ?? '',
          message: figure.querySelector<HTMLElement>('st-copy')?.dataset['copiedMessage'] ?? '',
        };
      }),
    );
  }

  test('"Prompt 0" is copied as "Prompt 0", and every prompt is named by its heading', async ({
    page,
    context,
  }, testInfo) => {
    await page.goto(PROMPTS);
    const names = await promptNames(page);
    expect(names.length).toBeGreaterThan(10);
    for (const { heading, name, message } of names) {
      expect(name).toBe(`Copy prompt: ${heading}`);
      expect(message).toBe(`Copied: ${heading}`);
    }
    const zero = page.locator('figure.st-code[data-variant="prompt"]', {
      has: page.getByRole('button', { name: /^Copy prompt: Prompt 0: / }),
    });
    await expect(zero).toHaveCount(1);
    test.skip(testInfo.project.name !== 'chromium', 'Clipboard permissions are Chromium-only.');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await zero.locator('st-copy button').click();
    await expect(zero.locator('[role="status"]')).toHaveText(
      'Copied: Prompt 0: the business brief',
    );
  });

  test('two prompts under one heading say which of them each one is, in both languages', async ({
    page,
  }) => {
    for (const [route, of] of [
      ['branding/mood-and-materials/', 'prompt'],
      ['af/branding/mood-and-materials/', 'opdrag'],
    ] as const) {
      await page.goto(route);
      const names = await promptNames(page);
      const shared = names.filter(
        (entry, index) => names.findIndex((other) => other.heading === entry.heading) !== index,
      );
      expect(shared.length, route).toBeGreaterThan(0);
      const heading = shared[0]?.heading ?? '';
      const group = names.filter((entry) => entry.heading === heading);
      group.forEach((entry, index) => {
        expect(entry.name).toContain(`${heading} (${of} ${index + 1} `);
        expect(entry.name).toMatch(new RegExp(` ${group.length}\\)$`));
      });
    }
  });
});

test.describe('table of contents', () => {
  test('scroll-spy marks the section a contents link went to', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile',
      'The column needs 1280px; the pill test covers phones.',
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(DOC);
    const links = page.locator('.st-toc--column .st-toc__list a');
    expect(await links.count()).toBeGreaterThan(2);
    const target = links.nth(1);
    await target.click();
    await expect(target).toHaveAttribute('aria-current', 'location');
    await expect(page.locator('.st-toc--column [aria-current="location"]')).toHaveCount(1);
  });

  test('below 1280px a "Now reading" pill names the section and opens the list', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(DOC);
    const pill = page.locator('[data-toc-pill]');
    await expect(pill).toBeHidden();
    const details = page.locator('details.st-toc--details');
    await details.locator('summary').click();
    const link = details.locator('.st-toc__list a').nth(1);
    const title = (await link.textContent())?.trim() ?? '';
    await link.click();
    // The pill never covers the heading the link went to (WP-50a review pass 1, M3): a short pill
    // stays up above it, a tall one hides (review pass 2, M3). Once the heading has scrolled away,
    // the pill names its section.
    const id = (await link.getAttribute('href'))?.slice(1) ?? '';
    await expect
      .poll(() =>
        page.evaluate((target) => {
          const shown = document.querySelector<HTMLElement>('[data-toc-pill]');
          const heading = document.getElementById(target);
          if (!shown || !heading) return 'missing';
          if (shown.hidden) return 'clear';
          const box = shown.getBoundingClientRect();
          return box.bottom <= heading.getBoundingClientRect().top + 1 ? 'clear' : 'covered';
        }, id),
      )
      .toBe('clear');
    await page.evaluate((target) => {
      const heading = document.getElementById(target);
      if (heading) window.scrollBy(0, heading.getBoundingClientRect().bottom + 4);
    }, id);
    await expect(pill).toBeVisible();
    await expect(pill).toContainText(title);
    const box = await pill.boundingBox();
    // Pressed where it is: Playwright's own scroll-into-view would move the page under it.
    if (!box) throw new Error('The pill has no box.');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(details).toHaveAttribute('open', '');
  });
});

test.describe('settings and clear my data', () => {
  test('clear my data removes every st. key, and nothing else, after asking', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({
      'st.theme': 'dark',
      'st.lang': 'af',
      'st.checks.v1': { [DOC_TASKS[0] ?? 'x']: '2026-10-01T10:00:00.000Z' },
      'st.shortcuts': false,
      'st.profile.v1': { entity: 'pty' },
    });
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('someone.else', 'keep');
      } catch {
        // No storage on this origin.
      }
    });
    await page.goto('about/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const button = page.getByRole('button', { name: 'Clear all my data' });
    await button.click();
    const dialog = page.getByRole('dialog', { name: 'Clear all your data?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Clear my data' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('st-clear-data [role="status"]')).toHaveText(
      en.about.settings.clearDone,
    );
    expect(await stKeys(page)).toEqual([]);
    expect(await page.evaluate(() => window.localStorage.getItem('someone.else'))).toBe('keep');
    // Every setting is back to its default, on the page and in the controls.
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await expect(page.getByRole('switch', { name: 'Single-key shortcuts' })).toBeChecked();
  });

  test('low data switches to the device fonts and is applied before paint on the next page', async ({
    page,
  }) => {
    await page.goto('about/');
    const toggle = page.getByRole('switch', { name: 'Low data mode' });
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await expect(page.locator('html')).toHaveAttribute('data-low-data', '');
    expect(await page.evaluate(() => window.localStorage.getItem('st.lowData'))).toBe('true');
    await page.goto(DOC);
    await expect(page.locator('html')).toHaveAttribute('data-low-data', '');
    const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(font).not.toMatch(/Instrument Sans Variable/);
  });
});

test.describe('keyboard shortcuts', () => {
  test('? opens the shortcuts list, unless single-key shortcuts are off', async ({ page }) => {
    await page.goto(DOC);
    await page.locator('body').press('?');
    await expect(page).toHaveURL(/\/about\/#keyboard-shortcuts$/);
    await expect(page.locator('#keyboard-shortcuts')).toBeVisible();

    // Switch only once its element is defined, as a reader would after the page settles.
    await page.waitForFunction(() => customElements.get('st-setting') !== undefined);
    await page.getByRole('switch', { name: 'Single-key shortcuts' }).uncheck();
    await page.goto(DOC);
    await page.locator('body').press('?');
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(new RegExp(`/${DOC}$`));
  });

  test('Alt+→ and Alt+← follow the pager', async ({ page }) => {
    await page.goto(DOC);
    const next = await page.locator('a[rel="next"]').getAttribute('href');
    await page.locator('body').press('Alt+ArrowRight');
    await expect(page).toHaveURL(new RegExp(`${next ?? 'missing'}$`));
    // The next page's modules run before its load event; press only once they can listen.
    await page.waitForLoadState('load');
    await page.locator('body').press('Alt+ArrowLeft');
    await expect(page).toHaveURL(new RegExp(`/${DOC}$`));
  });
});

test.describe('language', () => {
  test('the switcher saves the choice, and the English home page offers it without redirecting', async ({
    page,
  }) => {
    await page.goto('./');
    await expect(page.locator('st-lang-banner')).toBeHidden();
    await page.locator('st-lang-switch a[data-locale="af"]').first().click();
    await expect(page).toHaveURL(/\/af\/$/);
    expect(await page.evaluate(() => window.localStorage.getItem('st.lang'))).toBe('af');

    await page.goto('./');
    await expect(page).toHaveURL(/\/business-toolkit\/$/);
    const banner = page.locator('st-lang-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('lang', 'af-ZA');
    const action = af.lang.continueBanner.action.replace('{language}', 'Afrikaans');
    await expect(banner.getByRole('link', { name: action })).toHaveAttribute('href', /\/af\/$/);
    await expect(banner).toContainText(
      af.lang.continueBanner.message.replace('{language}', 'Afrikaans'),
    );

    await banner.getByRole('button', { name: 'Bly op hierdie bladsy' }).click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => window.localStorage.getItem('st.lang'))).toBe('en');
    await page.reload();
    await expect(page.locator('st-lang-banner')).toBeHidden();
  });

  test('the banner shows before any module runs, so it never pushes the page down', async ({
    page,
    seedStorage,
    baseURL,
  }) => {
    await seedStorage({ 'st.lang': 'af' });
    const release = await holdModules(page, baseURL);
    await page.goto('./', { waitUntil: 'commit' });
    const banner = page.locator('st-lang-banner');
    await expect(banner).toBeVisible();
    expect(await page.evaluate(() => customElements.get('st-lang-banner') === undefined)).toBe(
      true,
    );
    release();
    await expect(banner).toBeVisible();
    await page.waitForLoadState('load');
  });

  test('a saved value that is not an enabled language shows no banner, even before the modules run', async ({
    page,
    seedStorage,
    baseURL,
  }) => {
    await seedStorage({ 'st.lang': 'fr' });
    const release = await holdModules(page, baseURL);
    await page.goto('./', { waitUntil: 'commit' });
    const banner = page.locator('st-lang-banner');
    // Parsed and styled, with no module to hide it: only the first-paint CSS decides.
    await expect(banner).toBeAttached();
    await expect(page.locator('html')).toHaveAttribute('data-st-lang-offer', 'fr');
    await expect(banner).toBeHidden();
    release();
    await page.waitForLoadState('load');
    await expect(banner).toBeHidden();
  });

  test('closing the banner hides it for this page view only', async ({ page, seedStorage }) => {
    await seedStorage({ 'st.lang': 'af' });
    await page.goto('./');
    const banner = page.locator('st-lang-banner');
    await banner.getByRole('button', { name: 'Maak die boodskap oor die taal toe' }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.locator('st-lang-banner')).toBeVisible();
  });

  /*
   * WP-50a, item 6: the banner is set in the device font, so the web font arriving cannot change
   * its size. In the web font its buttons moved to another line when the font swapped in, and the
   * page jumped (layout shift 0.144 at 360px, WP-50 audit, flow 7). The fonts are held here until
   * the page has drawn with the device fonts.
   *
   * At 320px the top bar itself also changes rows when the web font arrives (about 0.13, with or
   * without the banner). That shift is the header's, left to the Phase 1 header work, so it is
   * counted apart (`header`), and the total is bounded only where it does not occur.
   */
  for (const width of [320, 360, 1024]) {
    test(`the banner is as tall before the web fonts as after, and moves nothing, at ${width}px`, async ({
      page,
      seedStorage,
      baseURL,
    }, testInfo) => {
      test.skip(testInfo.project.name === 'webkit', 'Layout-shift entries are Chromium-only.');
      await seedStorage({ 'st.lang': 'af' });
      await page.addInitScript(() => {
        const shifts: { value: number; header: boolean }[] = [];
        Object.assign(window, { stShifts: shifts });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & {
              value: number;
              sources: { node: Node | null }[];
            };
            const header = shift.sources.some(
              (source) =>
                source.node instanceof Element && source.node.closest('.st-topbar') !== null,
            );
            shifts.push({ value: shift.value, header });
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.setViewportSize({ width, height: 740 });
      const release = await holdRequests(page, baseURL, (url) => url.pathname.endsWith('.woff2'));
      await page.goto('./', { waitUntil: 'commit' });
      const banner = page.locator('st-lang-banner[data-locale="af"]');
      await expect(banner).toBeVisible();
      const before = (await banner.boundingBox())?.height ?? 0;
      release();
      await page.waitForLoadState('load');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const after = (await banner.boundingBox())?.height ?? 0;
      expect(Math.abs(after - before), `banner ${before}px, then ${after}px`).toBeLessThanOrEqual(
        1,
      );
      const shifts = await page.evaluate(
        () => (window as unknown as { stShifts: { value: number; header: boolean }[] }).stShifts,
      );
      const sum = (list: { value: number }[]): number =>
        list.reduce((total, entry) => total + entry.value, 0);
      // The page's other text also reflows when the web font arrives (0.05 at 1024px; 0.13 at
      // 1024px without the banner), so the total is bounded, not zero.
      if (width === 320) {
        expect(sum(shifts.filter((entry) => !entry.header))).toBeLessThanOrEqual(0.1);
      } else {
        expect(sum(shifts)).toBeLessThanOrEqual(0.1);
      }
    });
  }
});

/**
 * WP-50a, item 7 (`review-animations` verdict Block in the WP-50 audit): nothing moves when a page
 * opens, and nothing scrolls smoothly on Tab. A ring moves only when its value changes on the page.
 */
test.describe('motion', () => {
  const PROFILE = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' };

  /** The CSS animations and transitions running on rings (`.st-ring__value`). */
  async function ringMotion(page: Page): Promise<string[]> {
    return page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          return target instanceof Element && target.matches('.st-ring__value');
        })
        .map((animation) =>
          animation instanceof CSSTransition
            ? `transition:${animation.transitionProperty}`
            : `animation:${(animation as CSSAnimation).animationName}`,
        ),
    );
  }

  test('the top bar ring does not move when a page opens', async ({ page, seedStorage }) => {
    await seedStorage({ 'st.profile.v1': PROFILE });
    // My path stores the path, so the next page's top bar draws its ring.
    await page.goto('my-path/');
    await page.waitForLoadState('networkidle');
    await page.goto('core/tax-and-sars/');
    const ring = page.locator('st-path-progress .st-ring');
    await page.waitForFunction(() => {
      const host = document.querySelector('st-path-progress');
      return host instanceof HTMLElement && !host.hidden;
    });
    await expect(ring).toHaveAttribute('data-animate', '');
    expect(await ringMotion(page)).toEqual([]);
  });

  test('a ring moves when its value changes on the page, and not under reduced motion', async ({
    page,
    seedStorage,
  }) => {
    await seedStorage({ 'st.profile.v1': PROFILE });
    await page.goto('my-path/');
    const mark = page.locator('[data-steps] > li:visible').first().locator('[data-mark]');
    await expect(mark).toBeVisible();
    expect(await ringMotion(page)).toEqual([]);
    await mark.click();
    await expect.poll(() => ringMotion(page)).toContain('transition:stroke-dashoffset');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    const again = page.locator('[data-steps] > li:visible').nth(1).locator('[data-mark]');
    await expect(again).toBeVisible();
    await again.click();
    const duration = await page
      .locator('[data-progress] .st-ring__value')
      .evaluate((arc) => parseFloat(getComputedStyle(arc).transitionDuration));
    expect(duration).toBeLessThanOrEqual(0.001);
  });

  test('a tick moves the checklist ring, and opening the page does not', async ({ page }) => {
    await page.goto(CHECKLIST);
    await page.waitForLoadState('networkidle');
    expect(await ringMotion(page)).toEqual([]);
    await page.locator('st-checklist input[type="checkbox"]').first().check();
    await expect.poll(() => ringMotion(page)).toContain('transition:stroke-dashoffset');
  });

  test('Tab does not scroll smoothly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Keyboard focus.');
    await page.goto(DOC);
    await page.keyboard.press('Tab');
    const behaviour = await page.evaluate(() => ({
      focusWithin: document.documentElement.matches(':focus-within'),
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
    }));
    expect(behaviour.focusWithin).toBe(true);
    expect(behaviour.scroll).toBe('auto');
  });
});
