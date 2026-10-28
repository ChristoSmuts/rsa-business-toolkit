import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { chromiumAxName } from './helpers/ax';
import { holdRequests } from './helpers/network';

/**
 * WP-50 Phase 3, item 5: the header, footer and navigation (`SiteHeader.astro`, `SiteFooter.astro`,
 * `LanguageSwitcher.astro`; docs/design-system.md, "The header, footer and navigation").
 *
 * - The top bar is one row, 61px, at every width, in both languages: 165px (three rows) on a 320px
 *   phone and 113px on a landscape phone before.
 * - Its height does not change when the web fonts arrive late (the 320px bar changed rows then).
 * - Every page links the same page in the other language from the bar, named in that language.
 * - Each control is a 44px target, named in Chromium's own accessibility tree, and the page the
 *   reader is on is marked `aria-current="page"` in the bar, the drawer and the footer.
 *
 * Without JavaScript (Menu is a link to the footer's site map): `nojs.spec.ts`.
 */

/** 44px of controls plus 8px of padding above and below, and the 1px rule under it. */
const ONE_ROW = 62;

const SIZES = [
  [320, 568],
  [360, 740],
  [568, 320],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1600, 900],
] as const;

interface Bar {
  height: number;
  /** From the top of the highest control to the bottom of the lowest. */
  span: number;
  overflow: number;
}

async function bar(page: Page): Promise<Bar> {
  return page.evaluate(() => {
    const header = document.querySelector('header.st-topbar');
    const inner = header?.querySelector('.st-topbar__inner');
    if (!header || !inner) throw new Error('No top bar.');
    const boxes = [...inner.children]
      .map((child) => child.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0);
    return {
      height: header.getBoundingClientRect().height,
      span: Math.max(...boxes.map((box) => box.bottom)) - Math.min(...boxes.map((box) => box.top)),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

/** A token's computed colour, read from a probe element (as `design-system.spec.ts` does). */
async function tokenColour(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, token);
}

/** The focus ring the tokens define: `--st-focus-width` in `--st-focus`. */
async function focusToken(page: Page): Promise<{ width: string; color: string }> {
  const width = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--st-focus-width').trim(),
  );
  return { width, color: await tokenColour(page, '--st-focus') };
}

/** Pairs of the bar's visible children whose boxes overlap, and the wordmark's width. */
async function overlaps(page: Page): Promise<{ pairs: string[]; home: number }> {
  return page.evaluate(() => {
    const inner = document.querySelector('header.st-topbar .st-topbar__inner');
    if (!inner) throw new Error('No top bar.');
    const boxes = [...inner.children]
      .map((child) => ({
        name: child.className.split(' ')[0] ?? '',
        box: child.getBoundingClientRect(),
      }))
      .filter(({ box }) => box.width > 0 && box.height > 0);
    const pairs: string[] = [];
    for (const [index, a] of boxes.entries()) {
      for (const b of boxes.slice(index + 1)) {
        const x = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
        const y = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
        if (x > 0.5 && y > 0.5) pairs.push(`${a.name} × ${b.name}`);
      }
    }
    // Every child lies within the screen: a row that cannot wrap pushes Menu off it (pass 2, M2).
    for (const { name, box } of boxes) {
      if (box.left < -0.5 || box.right > window.innerWidth + 0.5) {
        pairs.push(
          `${name} outside the screen (${Math.round(box.left)} to ${Math.round(box.right)})`,
        );
      }
    }
    // The wordmark's own content must stay inside its link.
    const home = inner.querySelector('.st-topbar__home');
    const homeBox = home?.getBoundingClientRect();
    const logoBox = home?.querySelector('.st-logo')?.getBoundingClientRect();
    if (homeBox && logoBox && logoBox.right > homeBox.right + 0.5) {
      pairs.push('the wordmark runs out of its link');
    }
    return { pairs, home: homeBox?.width ?? 0 };
  });
}

test.describe('the top bar is one row', () => {
  for (const [width, height] of SIZES) {
    test(`at ${width}×${height}, in English and Afrikaans`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
      await page.setViewportSize({ width, height });
      for (const route of ['', 'af/', 'business-types/vehicle-dealer/', 'af/search/']) {
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);
        const measured = await bar(page);
        expect(measured.height, `/${route}`).toBeLessThanOrEqual(ONE_ROW);
        expect(measured.span, `/${route}`).toBeLessThanOrEqual(45);
        expect(measured.overflow, `/${route}`).toBeLessThanOrEqual(0);
      }
    });
  }

  test('with saved answers too: the ring joins the row from 1024px and stays out of it below', async ({
    page,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.goto('my-path/');
    await page.waitForLoadState('networkidle');
    for (const [width, height] of [
      [320, 568],
      [1024, 768],
      [1280, 800],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const route of ['core/tax-and-sars/', 'af/core/tax-and-sars/']) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const ring = page.locator('header st-path-progress');
        if (width >= 1024) await expect(ring).toBeVisible();
        else await expect(ring).toBeHidden();
        const measured = await bar(page);
        expect(measured.height, `${route} at ${width}px`).toBeLessThanOrEqual(ONE_ROW);
        expect(measured.span, `${route} at ${width}px`).toBeLessThanOrEqual(45);
      }
    }
  });
});

/*
 * WP-50a and the Phase 3 plan: at 320px the bar changed rows when the web fonts arrived (217px
 * before, 165px after, a layout shift of about 0.13). The fonts are held here until the page has
 * drawn with the fallback faces.
 */
test.describe('late web fonts', () => {
  for (const width of [320, 360]) {
    for (const route of ['', 'af/', 'business-types/vehicle-dealer/', 'af/business-types/food/']) {
      test(`/${route} at ${width}px: the bar keeps its height and the page moves 0.1 or less`, async ({
        page,
        baseURL,
      }, testInfo) => {
        test.skip(testInfo.project.name !== 'chromium', 'Layout-shift entries are Chromium-only.');
        await page.addInitScript(() => {
          const shifts: number[] = [];
          Object.assign(window, { stShifts: shifts });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              shifts.push((entry as PerformanceEntry & { value: number }).value);
            }
          }).observe({ type: 'layout-shift', buffered: true });
        });
        await page.setViewportSize({ width, height: 740 });
        const release = await holdRequests(page, baseURL, (url) => url.pathname.endsWith('.woff2'));
        await page.goto(route, { waitUntil: 'commit' });
        await page.waitForFunction(
          () =>
            document.readyState !== 'loading' &&
            [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].every(
              (link) => link.sheet !== null,
            ),
        );
        // Drawn in the fallback faces: neither web font has loaded (the fallbacks are `local()`
        // faces, which load at once, so only the two web families, "… Variable", are checked).
        expect(
          await page.evaluate(() =>
            [...document.fonts].some(
              (face) => face.family.endsWith('Variable') && face.status === 'loaded',
            ),
          ),
        ).toBe(false);
        const before = (await bar(page)).height;
        release();
        await page.waitForLoadState('load');
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        const after = (await bar(page)).height;
        expect(after, `bar ${before}px, then ${after}px`).toBe(before);
        expect(after).toBeLessThanOrEqual(ONE_ROW);
        const shift = await page.evaluate(() =>
          (window as unknown as { stShifts: number[] }).stShifts.reduce((sum, v) => sum + v, 0),
        );
        expect(shift).toBeLessThanOrEqual(0.1);
      });
    }
  }
});

/**
 * One route per kind of page that has the site header, each in English and in Afrikaans. The 404
 * page and `/design-system/` have their own shell (`Base.astro` alone): the 404 page's is item 6.
 */
const PAGE_TYPES = [
  '',
  'core/',
  'core/tax-and-sars/',
  'business-types/',
  'business-types/vehicle-dealer/',
  'templates/',
  'templates/invoice/',
  'checklist/',
  'find-my-path/',
  'my-path/',
  'search/',
  'contents/',
  'about/',
] as const;

test.describe('the language link', () => {
  test('is in the bar on every kind of page, names the other language in it, and goes to the same page', async ({
    page,
    basePath,
  }) => {
    test.setTimeout(120_000);
    for (const route of PAGE_TYPES) {
      for (const [prefix, other, name, tag] of [
        ['', 'af', 'Afrikaans', 'af-ZA'],
        ['af/', 'en', 'English', 'en-ZA'],
      ] as const) {
        const response = await page.goto(`${prefix}${route}`);
        expect(response?.status(), `/${prefix}${route}`).toBe(200);
        const links = page.locator('header.st-topbar .st-topbar__lang a');
        await expect(links, `/${prefix}${route}`).toHaveCount(1);
        const link = links.first();
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('data-locale', other);
        await expect(link).toHaveAttribute('hreflang', tag);
        const target = other === 'en' ? route : `af/${route}`;
        await expect(link).toHaveAttribute('href', `${basePath}${target}`);
        await expect(link.locator(`span[lang="${tag}"]`)).toHaveText(name);
      }
    }
  });
});

/** Every visible link, button and summary in the bar is at least 44 by 44 CSS pixels. */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>(
      'header.st-topbar .st-topbar__inner :is(a[href], button, summary)',
    )) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      // An open menu's links are in the list below the bar, measured by the menu's own tests.
      if (element.closest('.st-menu__list')) continue;
      if (box.width < 43.5 || box.height < 43.5) {
        found.push(`${element.className} "${element.textContent?.trim().slice(0, 20)}"`);
      }
    }
    return found;
  });
}

test.describe('the controls', () => {
  test('are 44px targets at 320, 360, 568 and 1280px, in both languages', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    for (const [width, height] of [
      [320, 568],
      [360, 740],
      [568, 320],
      [1280, 800],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const route of ['core/tax-and-sars/', 'af/core/tax-and-sars/']) {
        await page.goto(route);
        expect(await smallTargets(page), `${route} at ${width}px`).toEqual([]);
      }
    }
  });

  test('a phone reaches the wordmark, search, the language link and Menu in that order, and Menu opens the drawer', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'WebKit moves Tab only between form controls by default.');
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('af/core/tax-and-sars/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.st-skip-link')).toBeFocused();
    const order = ['.st-topbar__home', '.st-topbar__search', '.st-topbar__lang a'];
    for (const selector of order) {
      await page.keyboard.press('Tab');
      await expect(page.locator(selector)).toBeFocused();
      // A visible focus ring: the base one, in the focus colour and width (review pass 1, m1).
      const ring = await page.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
      });
      expect(ring, selector).toEqual({ style: 'solid', ...(await focusToken(page)) });
    }
    await page.keyboard.press('Tab');
    const menu = page.locator('.st-topbar__menu-button');
    await expect(menu).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('dialog.st-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.st-drawer')).toBeHidden();
    await expect(menu).toBeFocused();
  });

  test('the drawer has no second language switcher: the bar holds it', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('core/tax-and-sars/');
    await page.locator('.st-topbar__menu-button').click();
    const drawer = page.locator('dialog.st-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('a[hreflang]')).toHaveCount(0);
    await expect(drawer.locator('st-theme-toggle')).toBeVisible();
  });

  test('the browser names each control: the wordmark too, where only its mark shows', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Reads Chromium’s accessibility tree over CDP.');
    for (const [width, route, names] of [
      [
        320,
        'core/tax-and-sars/',
        ['SA Business Toolkit', 'Search', 'Read this page in Afrikaans', 'Menu'],
      ],
      [
        320,
        'af/core/tax-and-sars/',
        ['SA Business Toolkit', 'Soek', 'Lees hierdie bladsy in English', 'Kieslys'],
      ],
      [
        1280,
        'core/tax-and-sars/',
        ['SA Business Toolkit', 'Search', 'Read this page in Afrikaans'],
      ],
    ] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      const selectors = [
        '.st-topbar__home',
        '.st-topbar__search',
        '.st-topbar__lang a',
        '.st-topbar__menu-button',
      ].slice(0, names.length);
      const got: string[] = [];
      for (const selector of selectors) got.push(await chromiumAxName(page, selector));
      expect(got, `${route} at ${width}px`).toEqual(names);
    }
    // The landmarks' names, from the same tree.
    await page.goto('af/core/tax-and-sars/');
    expect(await chromiumAxName(page, 'header .st-topbar__menus')).toBe('Hoof');
    expect(await chromiumAxName(page, 'header .st-topbar__lang nav')).toBe('Taal');
    expect(await chromiumAxName(page, 'footer nav')).toBe('Alle bladsye en nutsgoed');
  });
});

test.describe('landmarks and the current page', () => {
  test('one banner, one contentinfo, and every navigation region named', async ({ page }) => {
    for (const route of ['', 'af/core/tax-and-sars/', 'my-path/']) {
      await page.goto(route);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      const unnamed = await page.locator('nav').evaluateAll((navs) =>
        navs
          .filter((nav) => !nav.closest('dialog'))
          .filter((nav) => !nav.getAttribute('aria-label') && !nav.getAttribute('aria-labelledby'))
          .map((nav) => nav.className),
      );
      expect(unnamed, `/${route}`).toEqual([]);
    }
  });

  test('aria-current marks the page in the bar, the menus and the footer', async ({
    page,
    basePath,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('');
    await expect(page.locator('.st-topbar__home')).toHaveAttribute('aria-current', 'page');
    await page.goto('core/');
    await expect(page.locator('.st-topbar__home')).not.toHaveAttribute('aria-current', /.*/);
    const read = page.locator('.st-topbar__menus .st-menu').first();
    await expect(read.locator('a[aria-current="page"]')).toHaveAttribute(
      'href',
      `${basePath}core/`,
    );
    await expect(page.locator('footer a[aria-current="page"]')).toHaveAttribute(
      'href',
      `${basePath}core/`,
    );
    await page.goto('af/contents/');
    await expect(page.locator('footer a[aria-current="page"]')).toHaveAttribute(
      'href',
      `${basePath}af/contents/`,
    );
    await expect(page.locator('footer a[aria-current="page"]')).toHaveCSS('font-weight', '600');
    // The drawer marks it too.
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('checklist/');
    await page.locator('.st-topbar__menu-button').click();
    await expect(
      page.locator('dialog.st-drawer a[aria-current="page"]').filter({ hasText: 'Checklist' }),
    ).toHaveCount(1);
  });
});

test.describe('the footer', () => {
  test('lists every section and tool, the guide’s own pages and the theme control', async ({
    page,
  }) => {
    await page.goto('core/tax-and-sars/');
    const footer = page.locator('footer.st-footer');
    const headerLinks = await page
      .locator('.st-topbar__menus .st-menu a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const mapLinks = await footer
      .locator('#st-site-map a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(headerLinks.length).toBeGreaterThanOrEqual(10);
    for (const href of headerLinks.filter((link) => !link?.startsWith('#'))) {
      expect(mapLinks).toContain(href);
    }
    await expect(footer.locator('h2')).toHaveText(['Read', 'Tools', 'About this guide']);
    await expect(footer.locator('fieldset#st-theme > legend')).toHaveText('Theme');
    await expect(footer.locator('st-theme-toggle')).toBeVisible();
  });

  test('the theme is not in the top bar at any width', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    for (const width of [320, 1024, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('core/tax-and-sars/');
      await expect(page.locator('.st-topbar__inner st-theme-toggle')).toHaveCount(0);
    }
  });
});

test.describe('forced colours and print', () => {
  test('in forced colours the bar keeps one row and its controls keep a border', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('af/core/tax-and-sars/');
    const measured = await bar(page);
    expect(measured.height).toBeLessThanOrEqual(ONE_ROW);
    const canvas = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'Canvas';
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });
    for (const selector of ['.st-topbar__search', '.st-topbar__menu-button', 'header.st-topbar']) {
      const border = await page.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);
        return element.matches('header')
          ? { style: style.borderBottomStyle, color: style.borderBottomColor }
          : { style: style.borderTopStyle, color: style.borderTopColor };
      });
      expect(border.style, selector).toBe('solid');
      expect(border.color, selector).not.toBe(canvas);
      expect(border.color, selector).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('print leaves out the bar and the footer', async ({ page }) => {
    await page.goto('core/tax-and-sars/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('header.st-topbar')).toBeHidden();
    await expect(page.locator('footer.st-footer')).toBeHidden();
  });
});

/*
 * Review pass 1, M1: with text at 200% at 320 and 360px, or at 240px (English) and 160px
 * (Afrikaans) CSS width from browser zoom, the wordmark shrank to 12 to 19px and Search and the
 * language link were drawn over it. Now it keeps its longest word (or, mark only, 44px) and the row
 * wraps instead (WCAG 1.4.4, 1.4.10).
 */
test.describe('large text and zoom', () => {
  const CASES = [
    { width: 320, text: '200%' },
    { width: 360, text: '200%' },
    { width: 240, text: '100%' },
    { width: 160, text: '100%' },
  ] as const;
  for (const { width, text } of CASES) {
    test(`at ${width}px with text at ${text}, nothing in the bar overlaps and the wordmark stays 44px wide`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
      await page.setViewportSize({ width, height: 740 });
      for (const route of ['', 'af/', 'core/tax-and-sars/', 'af/core/tax-and-sars/']) {
        await page.goto(route);
        if (text !== '100%') {
          await page.addStyleTag({ content: `html { font-size: ${text} !important; }` });
        }
        await page.evaluate(() => document.fonts.ready);
        const measured = await overlaps(page);
        expect(measured.pairs, `/${route}`).toEqual([]);
        expect(measured.home, `/${route}`).toBeGreaterThanOrEqual(43.5);
        if (route === '' || route === 'af/') {
          const sideways = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(sideways, `/${route} scrolls sideways`).toBeLessThanOrEqual(0);
        }
      }
    });
  }
});

test.describe('review pass 1: tokens, the key hint, the theme and back to top', () => {
  test('search and Menu are drawn with the strong border, and footer links in the text colour', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('af/core/tax-and-sars/');
    const border = await tokenColour(page, '--st-border-strong');
    for (const selector of ['.st-topbar__search', '.st-topbar__menu-button']) {
      await expect(page.locator(selector), selector).toHaveCSS('border-top-color', border);
    }
    const text = await tokenColour(page, '--st-text');
    const colours = await page
      .locator('footer .st-footer__link')
      .evaluateAll((links) => [...new Set(links.map((link) => getComputedStyle(link).color))]);
    expect(colours).toEqual([text]);
    // Review pass 2, m5: the language link, the wordmark, the footer's headings, the footer's
    // ground and the bar's rule.
    for (const selector of [
      '.st-topbar__lang a',
      '.st-topbar__home',
      'footer .st-footer__heading',
    ]) {
      await expect(page.locator(selector).first(), selector).toHaveCSS('color', text);
    }
    await expect(page.locator('footer.st-footer')).toHaveCSS(
      'background-color',
      await tokenColour(page, '--st-surface-2'),
    );
    await expect(page.locator('header.st-topbar')).toHaveCSS(
      'border-bottom-color',
      await tokenColour(page, '--st-border'),
    );
  });

  test('the "/" hint is hidden below 1024px and shown from 1024px', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'A mouse screen; touch screens never show it.');
    const hint = page.locator('.st-topbar__kbd');
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('core/tax-and-sars/');
    await expect(hint).toBeHidden();
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(hint).toBeVisible();
  });

  test('from 1024px, "Light or dark" in Tools goes to the footer’s theme control and focuses it', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const [route, label] of [
      ['core/tax-and-sars/', 'Light or dark'],
      ['af/core/tax-and-sars/', 'Lig of donker'],
    ] as const) {
      await page.goto(route);
      const tools = page.locator('.st-topbar__menus .st-menu').nth(1);
      await tools.locator('summary').click();
      const link = tools.locator('a').last();
      await expect(link).toHaveText(label);
      await expect(link).toHaveAttribute('href', '#st-theme');
      await link.click();
      await expect(page).toHaveURL(/#st-theme$/);
      // Focus lands on the Theme group itself, a <fieldset> named by its legend (pass 2, m6).
      await expect(page.locator('fieldset#st-theme')).toBeFocused();
      await expect(page.locator('#st-theme st-theme-toggle')).toBeInViewport();
      // Last in Tools, after a rule (pass 2, m2 and m8).
      const rule = await link
        .locator('xpath=..')
        .evaluate((item) => getComputedStyle(item).borderTopStyle);
      expect(rule).toBe('solid');
    }
  });

  test('the theme group is announced by its name in Chromium’s own tree', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Reads Chromium’s accessibility tree over CDP.');
    await page.goto('af/core/tax-and-sars/');
    expect(await chromiumAxName(page, 'fieldset#st-theme')).toBe('Tema');
  });

  test('/about/ Settings says where light or dark is, and links it', async ({ page }) => {
    for (const [route, words] of [
      ['about/', 'Light or dark is under Theme at the end of every page.'],
      ['af/about/', 'Lig of donker is onder Tema aan die einde van elke bladsy.'],
    ] as const) {
      await page.goto(route);
      await expect(page.locator('#st-setting-theme-help')).toHaveJSProperty('innerText', words);
      const link = page.locator('main a[href="#st-theme"]');
      await expect(link).toBeVisible();
      // Beside low data mode: after its switch, before "Clear all my data" (pass 2, m7).
      const order = await page.evaluate(() => {
        const low = document.querySelector('st-setting[data-setting="lowData"]');
        const theme = document.querySelector('#st-setting-theme-help');
        const clear = document.querySelector('st-clear-data');
        const before = (a: Node | null, b: Node | null): boolean =>
          Boolean(a && b && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        return before(low, theme) && before(theme, clear);
      });
      expect(order).toBe(true);
      await link.click();
      await expect(page.locator('#st-theme')).toBeFocused();
    }
  });

  test('"Back to top" ends the footer, is 44px tall and goes to the top of the page', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('af/core/tax-and-sars/');
    const back = page.locator('footer a[href="#top"]');
    await expect(back).toHaveText('Terug na bo');
    const box = await back.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await back.click();
    await expect(page).toHaveURL(/#top$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  // Review pass 2, M1: `#top` naming no element scrolled but left focus at the foot of the page.
  test('"Back to top" from the keyboard moves focus to the top, and Tab goes on to the wordmark', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'WebKit moves Tab only between form controls by default.');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('core/tax-and-sars/');
      const back = page.locator('footer a[href="#top"]');
      await back.focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(page.locator('#top')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('.st-topbar__home')).toBeFocused();
    }
  });
});

/*
 * Review pass 2, m1: the language link carries the reader's place in the text to the other
 * language, and nothing else: not the footer's theme control, its site map or the top.
 */
test.describe('the language link and fragments', () => {
  test('carries a heading id, never a fragment of the page’s chrome', async ({
    page,
    basePath,
  }) => {
    const link = page.locator('.st-topbar__lang a');
    for (const hash of ['#st-theme', '#st-site-map', '#top']) {
      await page.goto(`core/tax-and-sars/${hash}`);
      await expect(link, hash).toHaveAttribute('href', `${basePath}af/core/tax-and-sars/`);
    }
    const heading = await page.locator('article .st-blocks h2[id]').first().getAttribute('id');
    await page.goto(`core/tax-and-sars/#${heading ?? ''}`);
    await expect(link).toHaveAttribute('href', `${basePath}af/core/tax-and-sars/#${heading ?? ''}`);
  });
});

/** The bar's items from left to right, by their left edge. */
async function barOrder(page: Page, selectors: readonly string[]): Promise<string[]> {
  const shown: { selector: string; left: number }[] = [];
  for (const selector of selectors) {
    const box = await page.locator(selector).first().boundingBox();
    if (box && box.width > 0) shown.push({ selector, left: box.x });
  }
  return shown.sort((a, b) => a.left - b.left).map((item) => item.selector);
}

// Review pass 2, m3 and m4: the order the reader sees, and where the bar is pinned.
test.describe('order and position', () => {
  test('left to right: wordmark, Search, language, Menu on a phone; wordmark, Read, Tools, search, ring, language from 1024px', async ({
    page,
    seedStorage,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    await seedStorage({
      'st.profile.v1': { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
    });
    await page.goto('my-path/');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('af/core/tax-and-sars/');
    const phone = [
      '.st-topbar__home',
      '.st-topbar__search',
      '.st-topbar__lang',
      '.st-topbar__menu-button',
    ];
    expect(await barOrder(page, phone)).toEqual(phone);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('af/core/tax-and-sars/');
    await expect(page.locator('header st-path-progress')).toBeVisible();
    const wide = [
      '.st-topbar__home',
      '.st-topbar__menus .st-menu >> nth=0',
      '.st-topbar__menus .st-menu >> nth=1',
      '.st-topbar__search',
      'header st-path-progress',
      '.st-topbar__lang',
    ];
    expect(await barOrder(page, wide)).toEqual(wide);
  });

  test('the bar scrolls away below 1024px and is pinned from 1024px', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Sets its own viewport.');
    for (const [width, position] of [
      [320, 'static'],
      [768, 'static'],
      [1023, 'static'],
      [1024, 'sticky'],
    ] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('core/tax-and-sars/');
      await expect(page.locator('header.st-topbar'), `${width}px`).toHaveCSS('position', position);
    }
  });
});
