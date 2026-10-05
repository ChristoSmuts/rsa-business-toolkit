import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { CHECKLIST_SAVES } from '../../src/lib/routes';
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
/** The two dictionaries, read from disk: Playwright's loader will not import JSON modules. */
type Dictionary = { checklist: { notSaved: string } };
const readDictionary = (lang: string): Dictionary =>
  JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'src', 'i18n', `${lang}.json`), 'utf8'),
  ) as Dictionary;
const af = readDictionary('af');
const en = readDictionary('en');
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
        // Present is not enough: a stray rule could hide it on every page (review WP-20 pass 8).
        await expect(first).toBeVisible();
        // Visible is not enough either: a visually hidden notice is a 1px box (review pass 9).
        expect(
          (await first.boundingBox())?.height ?? 0,
          'the AI notice has real height',
        ).toBeGreaterThan(40);
        await expect(first.locator('a')).toHaveAttribute(
          'href',
          `${basePath}${prefix}start/how-this-was-made/`,
        );

        const sources = page.locator('#sources-for-this-page').locator('xpath=..');
        await expect(sources).toBeVisible();
        const entries = await sources.locator('.st-source').count();
        // Each entry's own title must have text: badges and hidden link text alone do not count
        // (reviews WP-20 passes 8 and 9). The Acts entry has no link, so its heading is the title.
        const emptyEntries = await sources.locator('.st-source').evaluateAll(
          (nodes) =>
            nodes.filter((node) => {
              const title =
                node.querySelector('.st-source__title a > span:first-child, .st-source__name') ??
                node.querySelector('.st-source__title');
              return (title?.textContent ?? '').trim().length < 3;
            }).length,
        );
        expect(emptyEntries, 'a source entry with an empty title').toBe(0);
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

  test('every page with a checklist says, once, that ticks are not saved yet', ({
    basePath: _basePath,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Reads dist/, no browser needed.');
    test.skip(CHECKLIST_SAVES, 'Ticks are saved (WP-30), so there is nothing to warn about.');
    const problems: string[] = [];
    for (const route of allHtmlRoutes().filter((r) => !/^(af\/)?design-system\//.test(r))) {
      const html = readFileSync(htmlFileForRoute(route), 'utf8');
      if (!html.includes('type="checkbox"')) continue;
      const notes = html.split('st-tasklist__not-saved').length - 1;
      if (notes !== 1) problems.push(`/${route}: ${notes} not-saved line(s)`);
      // It is about the site, so it is in the reader's language even on an English fallback page.
      const expected = (route.startsWith('af/') ? af : en).checklist.notSaved;
      if (!html.includes(expected)) problems.push(`/${route}: the line is not "${expected}"`);
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

  // Every width where the bar changes shape: phone, wrapped tablet rows (review WP-20 pass 4), wide.
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [1024, 768],
    [1100, 800],
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

  test('prompts wrap on a phone: only layouts scroll sideways (B5)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await page.setViewportSize({ width: 320, height: 740 });
    await open(page, 'branding/branding-prompts/');
    const overflowing = await page
      .locator('figure.st-code:is([data-variant="prompt"], [data-variant="snippet"]) pre')
      .evaluateAll(
        (nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth + 1).length,
      );
    expect(await page.locator('figure.st-code[data-variant="prompt"]').count()).toBeGreaterThan(5);
    expect(overflowing).toBe(0);
  });

  test('stand-alone targets on real pages are at least 44px (B4, B5)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await page.setViewportSize({ width: 375, height: 800 });
    // The same rule as design-system.spec.ts, on the pages that carry the breadcrumb, the pager,
    // the common-question links and inline checklists (review WP-20 pass 5).
    for (const route of ['core/register/', 'af/business-types/food/', 'search/', 'contents/']) {
      await open(page, route);
      const small = await page.evaluate(() => {
        const found: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(
          'main a[href], main button, main input, main summary, main [tabindex="0"]',
        )) {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          const parentText = el.parentElement?.textContent?.trim() ?? '';
          if (el.tagName === 'A' && parentText !== (el.textContent?.trim() ?? '')) {
            if (!el.classList.contains('st-link-block')) continue;
          }
          const target = el.classList.contains('st-card__link')
            ? el.closest('.st-card')
            : el.matches('input[type="checkbox"], input[type="radio"]')
              ? el.closest('label')
              : el;
          const box = (target ?? el).getBoundingClientRect();
          if (box.width === 0 && box.height === 0) continue;
          if (box.width < 43.5 || box.height < 43.5) {
            found.push(
              `"${el.textContent?.trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
            );
          }
        }
        return found;
      });
      expect(small, `/${route}`).toEqual([]);
    }
  });

  test('the desktop menus close on Escape, outside clicks, focus leaving, scrolling and each other', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page, 'core/register/');
    const menus = page.locator('.st-topbar__menus details');
    const read = menus.nth(0);
    const tools = menus.nth(1);
    const isOpen = (menu: typeof read) =>
      menu.evaluate((node) => (node as HTMLDetailsElement).open);

    // Escape closes and returns focus to the summary.
    await read.locator('summary').focus();
    await page.keyboard.press('Enter');
    expect(await isOpen(read)).toBe(true);
    await read.locator('a').first().focus();
    await page.keyboard.press('Escape');
    expect(await isOpen(read)).toBe(false);
    await expect(read.locator('summary')).toBeFocused();

    // Opening the other closes the first. The shared name does it with no script at all, which
    // is what a reader without JavaScript gets, so it is checked on its own.
    const names = await menus.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('name')),
    );
    expect(names[0]).toBeTruthy();
    expect(new Set(names).size).toBe(1);
    await read.locator('summary').click();
    await tools.locator('summary').click();
    expect(await isOpen(read)).toBe(false);
    expect(await isOpen(tools)).toBe(true);

    // A press inside the open list that misses a link (its padding, the gap between links) must
    // neither close it nor crash the tab: closing it under the pointer killed Chromium (pass 7).
    let crashed = false;
    page.on('crash', () => {
      crashed = true;
    });
    const list = tools.locator('.st-menu__list');
    const box = await list.boundingBox();
    if (!box) throw new Error('the open Tools list has no box');
    await page.mouse.click(box.x + 3, box.y + 3);
    const first = await list.locator('li').nth(0).boundingBox();
    const second = await list.locator('li').nth(1).boundingBox();
    if (first && second) {
      await page.mouse.click(first.x + 10, (first.y + first.height + second.y) / 2);
    }
    expect(crashed).toBe(false);
    expect(await isOpen(tools)).toBe(true);

    // A click in the article closes it, with focus already gone, as after a Safari mouse click
    // (which never focuses the summary): only the pointerdown handler can close it then.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.locator('article h1').click();
    expect(await isOpen(tools)).toBe(false);

    // Escape closes it with nothing focused inside it, too.
    await read.locator('summary').click();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Escape');
    expect(await isOpen(read)).toBe(false);
    await expect(read.locator('summary')).toBeFocused();

    // Scrolling the page closes it, so it does not ride the sticky bar over the article.
    await read.locator('summary').click();
    await page.mouse.wheel(0, 800);
    await expect.poll(() => isOpen(read)).toBe(false);

    // Scrolling from the keyboard inside the open menu closes it without losing focus: focus goes
    // back to the summary, as with Escape (review WP-20 pass 8).
    // Start from a settled page: the site scrolls smoothly, and a test that opens the menu
    // mid-scroll proves nothing either way (review WP-20 pass 9).
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await read.locator('summary').focus();
    await page.keyboard.press('Enter');
    expect(await isOpen(read)).toBe(true);
    await read.locator('a').first().focus();
    await expect(read.locator('a').first()).toBeFocused();
    for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowDown');
    await expect.poll(() => isOpen(read)).toBe(false);
    await expect(read.locator('summary')).toBeFocused();

    // Tabbing past the last link closes it.
    await read.locator('summary').click();
    await read.locator('a').last().focus();
    await page.keyboard.press('Tab');
    expect(await isOpen(read)).toBe(false);
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

  // Every document has an Afrikaans text since WP-40, so these check the translated state. The
  // English-fallback state is shown and tested on the Afrikaans `/design-system/content/` gallery.
  test('an Afrikaans document page is in Afrikaans, with the machine-translation notice', async ({
    page,
  }) => {
    await open(page, 'af/core/register/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'af-ZA');
    await expect(page.locator('article .st-blocks').first()).not.toHaveAttribute('lang', /.*/);
    await expect(page.locator('article h1')).not.toHaveAttribute('lang', /.*/);
    await expect(page.locator('article h1')).toContainText('Registreer');
    const callouts = page.locator('article > header .st-callout');
    await expect(callouts.nth(1)).toContainText('Masjienvertaling');
    await expect(page.locator('.st-topbar')).toContainText('Lees');
    const next = page.locator('.st-pager a[rel="next"]');
    await expect(next).toContainText('Volgende');
    await expect(next.locator('span[lang]')).toHaveCount(0);
  });

  test('register titles the Afrikaans register kept in English are marked English, no others', async ({
    page,
  }) => {
    // Review WP-40 integration pass 2, major: nothing else fails if this marking is removed,
    // because dist:trust excuses exactly these titles as names.
    type Register = {
      entries: { id: string; title: string }[];
      acts: { id: string; name: string }[];
    };
    const read = (lang: string): Register =>
      JSON.parse(
        readFileSync(path.join(REPO_ROOT, 'src', 'data', lang, 'sources.json'), 'utf8'),
      ) as Register;
    const english = read('en');
    const afrikaans = read('af');
    const keptTitles = new Set(
      afrikaans.entries
        .filter(
          (entry) => english.entries.find((twin) => twin.id === entry.id)?.title === entry.title,
        )
        .map((entry) => entry.title),
    );
    const keptActs = new Set(
      afrikaans.acts
        .filter((act) => english.acts.find((twin) => twin.id === act.id)?.name === act.name)
        .map((act) => act.name),
    );
    let kept = 0;
    let translated = 0;
    let acts = 0;
    for (const route of [
      'af/core/register/',
      'af/business-types/vehicle-dealer/',
      'af/business-types/food/',
    ]) {
      await open(page, route);
      const marks = await page.evaluate(() => {
        const sources = document.querySelector('.st-sources');
        const titles = [
          ...(sources?.querySelectorAll(
            '.st-source__title > a > span:first-child, .st-source__title > .st-source__name',
          ) ?? []),
        ];
        const acts = [...(sources?.querySelectorAll('.st-source ul .st-source__name') ?? [])];
        const read = (node: Element): [string, string | null] => [
          (node.textContent ?? '').trim(),
          node.getAttribute('lang'),
        ];
        return { titles: titles.map(read), acts: acts.map(read) };
      });
      for (const [title, lang] of marks.titles) {
        if (keptTitles.has(title)) {
          kept++;
          expect(lang, `${route}: ${title}`).toBe('en-ZA');
        } else {
          translated++;
          expect(lang, `${route}: ${title}`).toBeNull();
        }
      }
      for (const [name, lang] of marks.acts) {
        acts++;
        expect(lang, `${route}: ${name}`).toBe(keptActs.has(name) ? 'en-ZA' : null);
      }
    }
    // Both kinds occur, so the loop really tests something.
    expect(kept).toBeGreaterThan(0);
    expect(translated).toBeGreaterThan(0);
    expect(acts).toBeGreaterThan(0);
  });

  test('document titles on Afrikaans landings and contents are Afrikaans and unmarked', async ({
    page,
  }) => {
    await open(page, 'af/core/');
    await expect(page.locator('.st-card__title').first()).not.toHaveAttribute('lang', /.*/);
    await expect(page.locator('.st-card__title').first()).toContainText('Kern: begin hier');
    await open(page, 'af/contents/');
    await expect(page.locator('.st-contents__doc').first()).not.toHaveAttribute('lang', /.*/);
    // The English landing marks nothing either.
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
