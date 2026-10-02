import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
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
  test('a tick on a document survives a reload and shows on /checklist/ and in Afrikaans', async ({
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
    const notice = page.locator('st-storage-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(en.checklist.storageUnavailable);
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
    await expect(page.locator('st-storage-notice')).toBeHidden();
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
    await expect(button).toHaveAccessibleName(/^Copy prompt 1: /);
    await button.click();
    await expect(button).toHaveText('Copied');
    await expect(figure.locator('[role="status"]')).toHaveText('Prompt 1 copied');
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
    await expect(pill).toBeVisible();
    await expect(pill).toContainText(title);
    // The pill sits below the top of the screen, never over the heading it names.
    const heading = await page
      .locator(`[id="${(await link.getAttribute('href'))?.slice(1)}"]`)
      .boundingBox();
    const box = await pill.boundingBox();
    expect(box && heading && box.y + box.height <= heading.y + 1).toBe(true);
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

  test('closing the banner hides it for this page view only', async ({ page, seedStorage }) => {
    await seedStorage({ 'st.lang': 'af' });
    await page.goto('./');
    const banner = page.locator('st-lang-banner');
    await banner.getByRole('button', { name: 'Maak die boodskap oor die taal toe' }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.locator('st-lang-banner')).toBeVisible();
  });
});
