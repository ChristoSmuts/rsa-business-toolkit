import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { allHtmlRoutes, htmlFileForRoute, REPO_ROOT } from './helpers/routes';

/**
 * WP-20 milestone 2: the real pages.
 *
 * - Every document page, in both languages, carries the build plan D5 trust pieces: the AI notice
 *   first in the article header, a "Sources for this page" section that is not empty, and a
 *   same-site link to the sources register (the link audit proves it resolves).
 * - Every built page has the head the brief asks for: canonical, hreflang with x-default, Open
 *   Graph and a description. Read straight from dist/, so it costs no browser.
 * - Navigation that only real routes can show: breadcrumbs, the pager, switching language on a
 *   real document with an anchor, and the Afrikaans fallback.
 *
 * The per-route loops run in chromium only: mobile and webkit render the same HTML, and the nojs
 * and a11y projects already visit every route.
 */

interface ManifestDoc {
  route: string;
  kind: string;
  langs: string[];
}
const MANIFEST = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'src', 'data', 'manifest.json'), 'utf8'),
) as { docs: Record<string, ManifestDoc> };
const DOCS = Object.entries(MANIFEST.docs).sort(([a], [b]) => a.localeCompare(b));
const REGISTER_ROUTE = MANIFEST.docs['lookup/sources']?.route ?? 'sources/';

async function open(page: Page, route: string): Promise<void> {
  const response = await page.goto(route);
  expect(response?.status(), `HTTP status of /${route}`).toBe(200);
}

test.describe('the D5 trust pieces on every document page', () => {
  for (const prefix of ['', 'af/']) {
    for (const [id, doc] of DOCS) {
      const route = `${prefix}${doc.route}`;
      test(`/${route}`, async ({ page, basePath }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', 'Same HTML in every project.');
        await open(page, route);
        const header = page.locator('article > header');
        // The AI notice is the first callout in the header, with its link to how this was made.
        const first = header.locator('.st-callout').first();
        await expect(first).toHaveClass(/st-ai-notice/);
        await expect(first.locator('a')).toHaveAttribute(
          'href',
          `${basePath}${prefix}start/how-this-was-made/`,
        );

        const sources = page.locator('#sources-for-this-page').locator('xpath=..');
        await expect(sources).toBeVisible();
        const entries = await sources.locator('.st-source').count();
        const note = (await sources.locator('p.st-hint').first().innerText()).trim();
        expect(entries > 0 || note.length > 10, 'sources listed, or a note saying why not').toBe(
          true,
        );

        if (id !== 'lookup/sources') {
          await expect(
            page.locator(`main a[href="${basePath}${prefix}${REGISTER_ROUTE}"]`).first(),
            'a link to the sources register',
          ).toBeAttached();
        }
      });
    }
  }
});

test.describe('the head of every built page', () => {
  test('canonical, hreflang with x-default, Open Graph and a description', ({
    basePath: _basePath,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Reads dist/, no browser needed.');
    const problems: string[] = [];
    const routes = allHtmlRoutes().filter(
      (route) => !route.endsWith('.html') && !/^(af\/)?design-system\//.test(route),
    );
    expect(routes.length).toBeGreaterThan(90);
    for (const route of routes) {
      const html = readFileSync(htmlFileForRoute(route), 'utf8');
      const has = (pattern: RegExp, what: string): void => {
        if (!pattern.test(html)) problems.push(`/${route}: no ${what}`);
      };
      const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? '';
      if (!canonical.endsWith(`/${route}`)) problems.push(`/${route}: canonical is ${canonical}`);
      has(/<link rel="alternate" hreflang="x-default" href="https?:\/\/[^"]+"/, 'x-default');
      has(/<link rel="alternate" hreflang="en-ZA"/, 'hreflang en-ZA');
      has(/<meta name="description" content="[^"]{20,}"/, 'description');
      for (const property of ['og:title', 'og:description', 'og:url', 'og:locale', 'og:type']) {
        has(new RegExp(`<meta property="${property}" content="[^"]+"`), property);
      }
      has(/<meta name="theme-color"/, 'theme-color');
    }
    expect(problems).toEqual([]);
  });

  test('the head and the sitemap name the same language versions of every page', ({
    basePath: _basePath,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Reads dist/, no browser needed.');
    const sitemap = readFileSync(htmlFileForRoute('sitemap-0.xml'), 'utf8');
    const problems: string[] = [];
    let checked = 0;
    for (const entry of sitemap.split('<url>').slice(1)) {
      const loc = /<loc>([^<]+)<\/loc>/.exec(entry)?.[1] ?? '';
      const route = new URL(loc).pathname.replace(/^\/[^/]+\//, '');
      const inSitemap = [...entry.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)]
        .map((match) => `${match[1] ?? ''} ${match[2] ?? ''}`)
        .sort();
      const html = readFileSync(htmlFileForRoute(route), 'utf8');
      const inHead = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
        .map((match) => `${match[1] ?? ''} ${match[2] ?? ''}`)
        .filter((pair) => !pair.startsWith('x-default '))
        .sort();
      if (inSitemap.join('|') !== inHead.join('|')) {
        problems.push(`/${route}: sitemap ${inSitemap.join(', ')} | head ${inHead.join(', ')}`);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(90);
    expect(problems).toEqual([]);
    // The fallback page is the Afrikaans page for its URL, with its own canonical.
    const fallback = readFileSync(htmlFileForRoute('af/core/register/'), 'utf8');
    expect(fallback).toMatch(/<html lang="af-ZA"/);
    expect(fallback).toMatch(/<link rel="canonical" href="[^"]*\/af\/core\/register\/"/);
    expect(fallback).toMatch(/<meta property="og:locale" content="af_ZA"/);
  });
});

test.describe('navigation between real pages', () => {
  test('a document page has a breadcrumb through its section', async ({ page, basePath }) => {
    await open(page, 'core/tax-and-sars/');
    const crumbs = page.locator('.st-breadcrumb li');
    await expect(crumbs).toHaveCount(3);
    await expect(crumbs.nth(1).locator('a')).toHaveAttribute('href', `${basePath}core/`);
    await expect(crumbs.nth(2).locator('[aria-current="page"]')).toHaveText('Tax and SARS');
  });

  test('the pager leads through the guide, across sections', async ({ page, basePath }) => {
    await open(page, 'start/what-has-changed/');
    const next = page.locator('.st-pager a[rel="next"]');
    await expect(next).toHaveAttribute('href', `${basePath}core/start-here/`);
    // As rendered, not as markup: the label and the title read as one sentence with one space.
    expect(await next.evaluate((node) => (node as HTMLElement).innerText.trim())).toBe(
      'Next: Core: start here',
    );
    await next.click();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.st-pager a[rel="prev"]')).toHaveAttribute(
      'href',
      `${basePath}start/what-has-changed/`,
    );
  });

  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [1280, 800],
  ] as const) {
    test(`a heading reached by a link is not hidden under the top bar at ${width}px`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewports.');
      await page.setViewportSize({ width, height });
      // Smooth scrolling would let the check run mid-scroll; a reader's end position is the same.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const prefix of ['', 'af/']) {
        await open(page, `${prefix}core/register/`);
        // Follow a real in-page link, the way a reader does, from the contents.
        const toc = page.locator(width >= 1280 ? '.st-toc--column' : '.st-toc--details');
        if (width < 1280) await toc.locator('summary').click();
        const link = toc.locator('a[href="#how-to-register-a-company-yourself"]');
        await link.click();
        await expect(page).toHaveURL(/#how-to-register-a-company-yourself$/);
        // Wait for the scroll position to settle: two animation frames with no movement.
        await page.waitForFunction(
          () =>
            new Promise<boolean>((resolve) => {
              const before = window.scrollY;
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve(window.scrollY === before && before > 0)),
              );
            }),
        );
        const { barBottom, targetTop } = await page.evaluate(() => ({
          barBottom: document.querySelector('.st-topbar')?.getBoundingClientRect().bottom ?? 0,
          targetTop:
            document.getElementById('how-to-register-a-company-yourself')?.getBoundingClientRect()
              .top ?? -1,
        }));
        expect(
          targetTop,
          `/${prefix}: heading top vs bar bottom ${barBottom}`,
        ).toBeGreaterThanOrEqual(Math.max(0, barBottom));
      }
    });
  }

  test('the language switcher names each language in its own language, inside a sentence in the page language', async ({
    page,
  }) => {
    for (const [route, other, name, tag] of [
      ['core/register/', 'af', 'Read this page in Afrikaans', 'af-ZA'],
      ['af/core/register/', 'en', 'Lees hierdie bladsy in English', 'en-ZA'],
    ] as const) {
      await open(page, route);
      const link = page.locator(`.st-topbar__lang a[data-locale="${other}"]`);
      await expect(link).toHaveAccessibleName(name);
      await expect(link).not.toHaveAttribute('lang', /.*/);
      await expect(link).not.toHaveAttribute('aria-label', /.*/);
      await expect(link.locator(`span[lang="${tag}"]`)).toHaveCount(1);
    }
  });

  test('a section landing lists its documents in order', async ({ page, basePath }) => {
    await open(page, 'core/');
    const cards = page.locator('.st-section-page__list > li');
    await expect(cards).toHaveCount(10);
    await expect(cards.first().locator('a').first()).toHaveAttribute(
      'href',
      `${basePath}core/start-here/`,
    );
  });

  test('switching language on a document keeps the anchor, and the anchor exists', async ({
    page,
    basePath,
  }) => {
    await open(page, 'core/tax-and-sars/');
    const anchor = await page.locator('article .st-blocks h2[id]').first().getAttribute('id');
    expect(anchor).toBeTruthy();
    await page.goto(`core/tax-and-sars/#${anchor ?? ''}`);
    const af = page.locator('.st-topbar__lang a').nth(1);
    await expect(af).toHaveAttribute('href', `${basePath}af/core/tax-and-sars/#${anchor ?? ''}`);
    await af.click();
    await expect(page).toHaveURL(new RegExp(`/af/core/tax-and-sars/#${anchor ?? ''}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'af-ZA');
    await expect(page.locator(`[id="${anchor ?? ''}"]`)).toHaveCount(1);
  });

  test('an Afrikaans document page shows English with the fallback notice', async ({ page }) => {
    await open(page, 'af/core/register/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'af-ZA');
    await expect(page.locator('article .st-blocks')).toHaveAttribute('lang', 'en-ZA');
    await expect(page.locator('article h1')).toHaveAttribute('lang', 'en-ZA');
    const callouts = page.locator('article > header .st-callout');
    await expect(callouts.nth(1)).toContainText('Afrikaans');
    // The chrome around the content is Afrikaans.
    await expect(page.locator('.st-topbar')).toContainText('Lees');
    // English titles in Afrikaans sentences carry their own lang (review WP-20 pass 2).
    await expect(page.locator('.st-pager a[rel="next"] span[lang]')).toHaveAttribute(
      'lang',
      'en-ZA',
    );
    await expect(page.locator('.st-pager a[rel="next"]')).toContainText('Volgende');
  });

  test('English document titles on Afrikaans landings and contents are marked', async ({
    page,
  }) => {
    await open(page, 'af/core/');
    await expect(page.locator('.st-card__title').first()).toHaveAttribute('lang', 'en-ZA');
    await open(page, 'af/contents/');
    const doc = page.locator('.st-contents__doc').first();
    await expect(doc).toHaveAttribute('lang', 'en-ZA');
    const list = page.locator('.st-contents__headings').first();
    await expect(list).not.toHaveAttribute('lang', /.*/);
    await expect(list.locator('a').first()).toHaveAttribute('lang', 'en-ZA');
    // The English landing marks nothing: every title is in the page's language.
    await open(page, 'core/');
    await expect(page.locator('.st-card__title').first()).not.toHaveAttribute('lang', /.*/);
  });

  test('home links each kind of business and states its figures with a source', async ({
    page,
  }) => {
    await open(page, '');
    for (const id of ['vat-compulsory', 'vat-voluntary', 'turnover-tax']) {
      const figure = page.locator(`[data-number="${id}"]`);
      await expect(figure.locator('a[href^="https://www.sars.gov.za/"]')).toHaveCount(1);
      await expect(figure).toContainText(/checked/i);
    }
    await expect(page.locator('a[href$="/business-types/food/"]').first()).toBeVisible();
  });
});
