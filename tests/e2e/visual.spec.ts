import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { allowConsoleError, expect, test, type StorageValue, type Theme } from './fixtures';
import { REPO_ROOT, routeUrl } from './helpers/routes';

/**
 * WP-50 Phase 0: baseline screenshots of every page type, project `visual` only.
 *
 * Each page is captured above the fold at 320, 768 and 1280px, in light and dark, in English and
 * Afrikaans. Home and the vehicle-dealer document also get a full-page shot at 320px. Snapshot
 * names read `<page>--<lang>--<theme>--<width>[--full].png`, under the `snapshotPathTemplate` of
 * `playwright.config.ts` (per platform, so Linux and Windows baselines are separate files).
 *
 * Linux baselines come from the "Update visual baselines" workflow, never from a local machine.
 * The `visual` CI job skips the comparison while `tests/e2e/__screenshots__/linux` does not exist.
 *
 * What is frozen before each shot:
 * - the "checked on {date}" dates. They come from the content and move every time a page is
 *   re-checked, so every sentence built from an i18n string with a `{date}` placeholder (except
 *   "From {date}", which is a fact about the law) gets a fixed date of the same shape;
 * - focus: the active element is blurred, so no focus ring is drawn (the search dialog keeps
 *   focus in its field, which is where it always is); the caret is hidden by the config;
 * - motion: the project runs with `reducedMotion: 'reduce'` and the config disables animations;
 * - scroll position: back at the top, after fonts have loaded.
 * The read time is computed from the content at build time, so it does not vary between runs and
 * is left visible.
 */

type Lang = 'en' | 'af';
type Kind =
  | 'home'
  | 'section-hub'
  | 'document'
  | 'business-type'
  | 'find-my-path'
  | 'my-path'
  | 'template'
  | 'checklist'
  | 'search'
  | 'search-dialog'
  | 'not-found'
  | 'design-system';

interface Shot {
  kind: Kind;
  /** Route without the base path and without the language prefix. */
  route: string;
  /** Full-page shot at 320px as well. */
  fullPage?: boolean;
  /** Languages the page is built in. Default: both. */
  langs?: readonly Lang[];
}

const SHOTS: readonly Shot[] = [
  { kind: 'home', route: '', fullPage: true },
  { kind: 'section-hub', route: 'core/' },
  { kind: 'document', route: 'business-types/vehicle-dealer/', fullPage: true },
  { kind: 'business-type', route: 'business-types/food/' },
  { kind: 'find-my-path', route: 'find-my-path/' },
  { kind: 'my-path', route: 'my-path/' },
  { kind: 'template', route: 'templates/tax-invoice/' },
  { kind: 'checklist', route: 'checklist/' },
  { kind: 'search', route: 'search/' },
  { kind: 'search-dialog', route: '' },
  { kind: 'not-found', route: 'visual-baseline-missing-page/' },
  // The style reference is English only (`src/pages/design-system.astro`); `af/design-system/`
  // holds only the content demo.
  { kind: 'design-system', route: 'design-system/', langs: ['en'] },
];

const LANGS: readonly Lang[] = ['en', 'af'];
const THEMES: readonly Theme[] = ['light', 'dark'];
/** Width and a matching above-the-fold height: a small phone, a tablet, a laptop. */
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
] as const;
const FULL_PAGE_WIDTH = 320;

/** The profile `wizard.spec.ts` uses for My path. */
const PROFILE = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' };
const SEARCH_QUERY: Record<Lang, string> = { en: 'VAT', af: 'BTW' };

// --- Date freezing ---------------------------------------------------------------------------

type Messages = { [key: string]: string | Messages };
const readMessages = (lang: Lang): Messages =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, 'src', 'i18n', `${lang}.json`), 'utf8')) as Messages;

function leaves(messages: Messages, prefix = ''): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]): [string, string][] =>
    typeof value === 'string' ? [[`${prefix}${key}`, value]] : leaves(value, `${prefix}${key}.`),
  );
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface DateFreeze {
  /** Regex sources, one per sentence that carries a checked-on date; group 1 is the date. */
  sentences: string[];
  /** The fixed date, in the language's own format. */
  fixed: string;
}

function dateFreeze(lang: Lang): DateFreeze {
  const messages = readMessages(lang);
  const date = messages['date'] as { format: string; months: Record<string, string> };
  const months = Object.values(date.months).map(escapeRegExp).join('|');
  const dateSource = escapeRegExp(date.format)
    .replace('\\{day\\}', '\\d{1,2}')
    .replace('\\{month\\}', `(?:${months})`)
    .replace('\\{year\\}', '\\d{4}');
  const sentences = leaves(messages)
    .filter(([key, value]) => value.includes('{date}') && !key.endsWith('.from'))
    .map(([, value]) =>
      escapeRegExp(value)
        .replace('\\{date\\}', `(${dateSource})`)
        .replace(/\\\{[a-zA-Z]+\\\}/g, '.+?'),
    );
  const fixed = date.format
    .replace('{day}', '1')
    .replace('{month}', date.months['1'] ?? '')
    .replace('{year}', '2000');
  return { sentences, fixed };
}

const FREEZE: Record<Lang, DateFreeze> = { en: dateFreeze('en'), af: dateFreeze('af') };

// --- Page preparation ------------------------------------------------------------------------

function localRoute(lang: Lang, route: string): string {
  return routeUrl(lang === 'en' ? route : `af/${route}`);
}

/** Waits for what JavaScript renders on each page type, so the shot shows the finished page. */
async function waitForPage(page: Page, kind: Kind, lang: Lang): Promise<void> {
  switch (kind) {
    case 'find-my-path':
      await expect(page.locator('[data-stepper="0"]')).toHaveAttribute('aria-current', 'step');
      break;
    case 'my-path':
      await expect(page.locator('[data-dashboard]')).toBeVisible();
      break;
    case 'design-system':
      await expect(page.locator('[data-contrast-summary]')).toHaveAttribute('data-live', 'on', {
        timeout: 30_000,
      });
      break;
    case 'search-dialog': {
      await page.waitForLoadState('networkidle');
      await page.keyboard.press('Control+k');
      const dialog = page.locator('dialog.st-search-dialog');
      await expect(dialog).toBeVisible();
      const field = dialog.getByRole('combobox');
      await expect(field).toBeFocused();
      await field.fill(SEARCH_QUERY[lang]);
      await expect(dialog.getByRole('option').first()).toBeVisible();
      break;
    }
    default:
      break;
  }
}

/** Fonts loaded, dates frozen, focus dropped (except in the search dialog), scrolled to the top. */
async function freeze(page: Page, kind: Kind, lang: Lang): Promise<void> {
  await page.evaluate(
    async ({ sentences, fixed, keepFocus }) => {
      await document.fonts.ready;
      const patterns = sentences.map((source) => new RegExp(source, 'gu'));
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const before = node.nodeValue ?? '';
        let after = before;
        for (const pattern of patterns) {
          after = after.replace(pattern, (match: string, date: string) =>
            match.replace(date, fixed),
          );
        }
        if (after !== before) node.nodeValue = after;
      }
      if (!keepFocus && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    },
    { ...FREEZE[lang], keepFocus: kind === 'search-dialog' },
  );
}

async function open(
  page: Page,
  shot: Shot,
  lang: Lang,
  viewport: { width: number; height: number },
  seed: (entries: Record<string, StorageValue>) => Promise<void>,
): Promise<void> {
  await page.setViewportSize(viewport);
  // A reader on an Afrikaans page chose it; with the choice saved the language banner stays away.
  await seed(
    shot.kind === 'my-path' ? { 'st.lang': lang, 'st.profile.v1': PROFILE } : { 'st.lang': lang },
  );
  const response = await page.goto(localRoute(lang, shot.route));
  expect(response?.status(), `HTTP status of ${shot.route}`).toBe(
    shot.kind === 'not-found' ? 404 : 200,
  );
  await waitForPage(page, shot.kind, lang);
  await freeze(page, shot.kind, lang);
}

const name = (shot: Shot, lang: Lang, theme: Theme, width: number, full = false): string =>
  `${shot.kind}--${lang}--${theme}--${width}${full ? '--full' : ''}.png`;

/** Only the 404 page logs an error: the browser reports the document's own 404 status. */
const details = (shot: Shot) =>
  shot.kind === 'not-found'
    ? {
        annotation: allowConsoleError(
          '/status of 404/',
          'Browsers log the 404 status of the document itself as a console error.',
        ),
      }
    : {};

// --- Tests -----------------------------------------------------------------------------------

test.describe.configure({ timeout: 90_000 });

for (const shot of SHOTS) {
  test.describe(shot.kind, () => {
    for (const lang of shot.langs ?? LANGS) {
      for (const theme of THEMES) {
        for (const viewport of VIEWPORTS) {
          test(
            `${lang} ${theme} ${viewport.width}`,
            details(shot),
            async ({ page, setTheme, seedStorage }) => {
              await setTheme(theme);
              await open(page, shot, lang, viewport, seedStorage);
              await expect(page).toHaveScreenshot(name(shot, lang, theme, viewport.width));
            },
          );
        }

        if (shot.fullPage) {
          test(
            `${lang} ${theme} ${FULL_PAGE_WIDTH} full page`,
            details(shot),
            async ({ page, setTheme, seedStorage }) => {
              await setTheme(theme);
              const viewport = VIEWPORTS.find((v) => v.width === FULL_PAGE_WIDTH) ?? VIEWPORTS[0];
              await open(page, shot, lang, viewport, seedStorage);
              await expect(page).toHaveScreenshot(name(shot, lang, theme, FULL_PAGE_WIDTH, true), {
                fullPage: true,
                timeout: 30_000,
              });
            },
          );
        }
      }
    }
  });
}
