import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  CONTRAST_PAIRS,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseCssColor,
  type Rgb,
} from '../../src/scripts/color';

const DS = 'design-system/';
const PAGES = [
  ['home', './'],
  ['design system', DS],
] as const;

/** Plan C4, byte for byte. */
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'";

// The panel measures after every stylesheet applies; allow for a loaded machine.
const PANEL = { timeout: 30_000 };

/**
 * This page renders every token and every component, and axe scans all of it, so the 30s
 * default is not enough. `test.describe.configure` overrides the CLI `--timeout`, so the value
 * is configurable instead of hard-coded: set `PW_DS_TIMEOUT` (ms) on a loaded machine or a slow
 * CI runner. The axe tests, by far the slowest in WebKit, also call `test.slow()`, which
 * triples whatever is configured here.
 */
const DESCRIBE_TIMEOUT = Number(process.env['PW_DS_TIMEOUT'] ?? 120_000);

/** The longest real Afrikaans status label the page packages will render (38 characters). */
const LONGEST_LABEL = 'Masjienvertaling, nog nie nagegaan nie';
/** An unbreakable Afrikaans compound, the worst case for grid track sizing. */
const LONGEST_WORD = 'Kernverpligtinge vir alle eenpersoonsondernemings';
/**
 * One word, no spaces: a real `af.json` value (`templates.fields.registrationNumber`, 27
 * characters). A box that is sized by its content can be no narrower than this, unless the
 * component lowers its min-content width, so this is what proves the fix rather than the
 * ability to wrap between words.
 */
const LONGEST_COMPOUND = 'Maatskappyregistrasienommer';
/** The same slot filled with a word no component can be sized by. */
const SHORT_WORD = 'Ja';
/**
 * How much a box's own min-content width may grow when a 2-character word is replaced by a
 * 27-character compound. A box that only wraps at spaces is never narrower than its longest
 * word, so its min-content width grows by the whole difference; a box that lowers its
 * min-content width (`overflow-wrap: anywhere`) breaks the compound anywhere and measures the
 * same either way, give or take the widest single glyph. Comparing the two measurements needs
 * no pixel budget tied to a font, a component or an engine: on this page the five selectors
 * below move 6-9px, and each moves 184-236px the moment its declaration is removed (Chromium
 * and WebKit agree to the pixel on both).
 */
const WORD_LENGTH_TOLERANCE = 24;

interface ShrinkWrapped {
  /** The box whose min-content width is measured. */
  readonly box: string;
  /** The descendant whose text is replaced, or `null` for the box's own first text node. */
  readonly text: string | null;
  /** Kept on the injected string, so the component is measured as it is really written. */
  readonly suffix?: string;
}

/**
 * The selectors docs/design-system.md, "Wrapping and min-content", names as carrying
 * `overflow-wrap: anywhere` because their box is sized by its own content.
 *
 * Deleting the declaration on the first four turns this test red on its own — measured, one at
 * a time, in Chromium and WebKit. `.st-empty__title` is the exception, and knowingly so: it
 * renders a heading, so `base.css`'s `h1`-`h6` safety net supplies the same value and the two
 * rules cover for each other. Removing both together does fail here (min-content 23px on "Ja",
 * 210px on the compound, both engines). No measurement of the rendered page can separate two
 * rules that say the same thing; what this entry guarantees is that the effect survives, not
 * which rule delivers it.
 */
const SHRINK_WRAPPED: readonly ShrinkWrapped[] = [
  { box: '.st-btn', text: '.st-btn__label' },
  { box: 'a.st-link-block', text: null },
  { box: '.st-toast', text: null, suffix: ' gekopieer' },
  { box: '.ds-segmented__option', text: '.ds-segmented__option > span:not([class])' },
  { box: '.st-empty__title', text: null },
];

async function saveTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem('st.theme', value);
    } catch {
      // ignore
    }
  }, theme);
}

async function openWithTheme(page: Page, theme: 'light' | 'dark', url = DS): Promise<void> {
  await saveTheme(page, theme);
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

test.describe('design system page', () => {
  test.describe.configure({ timeout: DESCRIBE_TIMEOUT });

  test('renders without console errors or CSP violations', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') errors.push(msg.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(DS);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Stoep design system' }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    await expect(page.locator('[data-contrast-summary]')).toHaveAttribute(
      'data-failures',
      '0',
      PANEL,
    );
    await page.evaluate(() => document.fonts.ready);

    expect(errors).toEqual([]);
  });

  for (const [name, url] of PAGES) {
    test(`${name}: no inline scripts, CSP from plan C4 before the first script`, async ({
      page,
    }) => {
      await page.goto(url);
      expect(await page.locator('script:not([src])').count()).toBe(0);
      const head = await page.evaluate(() => {
        const children = [...document.head.children];
        const csp = children.findIndex(
          (el) => el.getAttribute('http-equiv') === 'Content-Security-Policy',
        );
        const firstScript = children.findIndex((el) => el.tagName === 'SCRIPT');
        const init = document.querySelector<HTMLScriptElement>('head > script');
        return {
          csp,
          firstScript,
          content: children[csp]?.getAttribute('content'),
          initBlocking: Boolean(init && !init.defer && !init.async && init.type === ''),
          initSrc: init?.getAttribute('src') ?? '',
        };
      });
      expect(head.content).toBe(CSP);
      expect(head.csp).toBeGreaterThanOrEqual(0);
      expect(head.csp).toBeLessThan(head.firstScript);
      expect(head.initBlocking).toBe(true);
      expect(head.initSrc).toMatch(/theme-init.*\.js$/);
    });

    test(`${name}: a saved dark theme applies before first paint`, async ({ page }) => {
      await saveTheme(page, 'dark');
      await page.addInitScript(() => {
        const observer = new MutationObserver(() => {
          if (document.body) {
            const root = document.documentElement;
            (window as unknown as Record<string, unknown>)['__atBody'] = {
              theme: root.getAttribute('data-theme'),
              js: root.classList.contains('js'),
            };
            observer.disconnect();
          }
        });
        observer.observe(document, { childList: true, subtree: true });
      });
      await page.goto(url);
      const atBody = await page.evaluate(
        () => (window as unknown as Record<string, unknown>)['__atBody'],
      );
      expect(atBody).toEqual({ theme: 'dark', js: true });
      const colours = await page
        .locator('meta[name="theme-color"]')
        .evaluateAll((metas) => metas.map((m) => m.getAttribute('content')));
      expect(colours).toEqual(['#15130f', '#15130f']);
    });

    test(`${name}: reflows at 320px without horizontal scrolling`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(url);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test(`${name}: stand-alone interactive targets are at least 44px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(url);
      const small = await page.evaluate(() => {
        const found: string[] = [];
        const selector =
          'a[href], a[role="link"], button, input, select, textarea, summary, [tabindex="0"]';
        for (const el of document.querySelectorAll<HTMLElement>(selector)) {
          if (el.closest('.st-skip-link')) continue;
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          // Inline links inside a sentence are exempt (WCAG 2.5.5).
          const parentText = el.parentElement?.textContent?.trim() ?? '';
          if (el.tagName === 'A' && parentText !== (el.textContent?.trim() ?? '')) {
            if (!el.classList.contains('st-link-block')) continue;
          }
          // The card title link's ::after overlay makes the whole card the target.
          const target = el.classList.contains('st-card__link')
            ? el.closest('.st-card')
            : el.matches('input[type="checkbox"], input[type="radio"]')
              ? el.closest('label')
              : el;
          const box = (target ?? el).getBoundingClientRect();
          if (box.width === 0 && box.height === 0) continue;
          if (box.width < 43.5 || box.height < 43.5) {
            found.push(
              `${el.tagName.toLowerCase()}.${el.className} "${el.textContent?.trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
            );
          }
        }
        return found;
      });
      expect(small).toEqual([]);
    });
  }

  /*
   * The 320px reflow tests above only prove that today's demo strings fit. This one pushes the
   * longest real Afrikaans labels through every component that renders one and measures the
   * document again, so a component that cannot wrap fails here even if the demos change.
   * Before the Badge fix this measured 336px in Chromium and WebKit against a 320px viewport.
   *
   * Two different strings, and the difference matters. `LONGEST_LABEL` has spaces, so a
   * component only has to wrap between words to pass it: review pass 4 found that the guard
   * therefore missed `Button`, `.st-link-block` and `.st-toast`, which were all still 327-362px
   * wide on one unbreakable compound. Anything whose box is sized by its content — a button, a
   * stand-alone link, a toast, a heading in a shrink-wrapped grid item — gets
   * `LONGEST_COMPOUND` as well, because only that measures the min-content contribution.
   *
   * This assertion is the page-level net, and it cannot be more than that. The same fix round
   * also capped the page grids, so the two mechanisms mask each other here: measured at
   * `b17e7fd`, reverting `.st-btn__label` or `.st-toast` alone still leaves the document at
   * 320px (review pass 5), and reverting any one `minmax(0, 1fr)` cap on its own does too.
   * A guard that only fires when several defects coincide is not a guard for any one of them,
   * so the min-content declarations are measured per component in the test below.
   */
  test('long Afrikaans labels never widen the page at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(DS);
    const measured = await page.evaluate(
      ([label, word, compound]) => {
        /** Replace the first text node, so an element's own icons and markup survive. */
        const setFirstText = (el: Element, text: string): void => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          while (node && !node.nodeValue?.trim()) node = walker.nextNode();
          if (node) node.nodeValue = text;
          else el.textContent = text;
        };
        const setText = (selector: string, text: string): void => {
          const el = document.querySelector(selector);
          if (el) el.textContent = text;
        };
        const setAll = (selector: string, text: string): void => {
          for (const el of document.querySelectorAll(selector)) el.textContent = text;
        };
        const setAllFirstText = (selector: string, text: string): void => {
          for (const el of document.querySelectorAll(selector)) setFirstText(el, text);
        };
        // Every badge on the page, including the one in a Card meta row (the pass-3 repro).
        setAll('.st-badge .st-badge__text', label ?? '');
        setAll('.st-callout__label span', label ?? '');
        setAll('.st-effort__value', label ?? '');
        setAll('thead th', label ?? '');
        setText('.st-card__title a', label ?? '');
        setText('.st-kbd', 'Ctrl+Shift+P');
        // A single unbreakable compound: the min-content contribution case.
        setAll('.st-btn__label', compound ?? '');
        setAllFirstText('a.st-link-block', compound ?? '');
        setAllFirstText('.st-toast', `${compound ?? ''} gekopieer`);
        setAll('.ds-segmented__option > span:not([class])', compound ?? '');
        setAll('.st-section-header__title', word ?? '');
        setText('.st-empty__title', word ?? '');
        const rightEdge = (selector: string): number =>
          [...document.querySelectorAll<HTMLElement>(selector)]
            .map((el) => Math.round(el.getBoundingClientRect().right))
            .reduce((a, b) => Math.max(a, b), 0);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          widest: {
            badge: rightEdge('.st-badge'),
            button: rightEdge('.st-btn'),
            linkBlock: rightEdge('a.st-link-block'),
            toast: rightEdge('.st-toast'),
          },
        };
      },
      [LONGEST_LABEL, LONGEST_WORD, LONGEST_COMPOUND] as const,
    );
    expect(
      measured.scrollWidth,
      `widest right edges: ${JSON.stringify(measured.widest)}`,
    ).toBeLessThanOrEqual(measured.clientWidth);
  });

  /*
   * One assertion per declaration, so deleting any one of them turns this red on its own.
   *
   * The quantity measured is the property the declaration actually buys: the box's own
   * min-content width, the width it is squeezed to when its container offers nothing. That is
   * what sizes a shrink-wrapped box inside a cluster, a grid track or a container a future
   * package forgets to cap — the situation these rules exist for — and it is independent of
   * where the component happens to sit on this page today, which is what made the page-level
   * measurement blind. It is measured in place, not on a clone: `.st-toast` is styled through
   * `.st-toast-region .st-toast`, so a clone in a bare wrapper loses the declaration and
   * measures the same either way, which would be a guard that cannot fail.
   *
   * Asserting the *growth* between a 2-character word and a 27-character compound, rather than
   * an absolute width, keeps the test off any number that legitimate design work moves:
   * padding, font, icon, border and component size all cancel out.
   */
  test('no shrink-wrapped component is sized by its longest word', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(DS);
    const measured = await page.evaluate(
      ([targets, short, compound]) => {
        /** Replace the first text node, so an element's own icons and markup survive. */
        const setFirstText = (el: Element, text: string): void => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          while (node && !node.nodeValue?.trim()) node = walker.nextNode();
          if (node) node.nodeValue = text;
          else el.textContent = text;
        };
        /** The widest min-content width over every instance, or -1 if the selector is gone. */
        const widestMinContent = (target: (typeof targets)[number], word: string): number => {
          let widest = -1;
          for (const box of document.querySelectorAll<HTMLElement>(target.box)) {
            const slot = target.text ? box.querySelector(target.text) : box;
            if (!slot) continue;
            setFirstText(slot, `${word}${target.suffix ?? ''}`);
            const previous = box.getAttribute('style');
            // `hyphens: auto` is a progressive enhancement, never the mechanism: Chromium has a
            // dictionary for this page's language and WebKit on Windows does not. Measuring with
            // it off is what keeps this test about the declaration it is guarding.
            box.style.inlineSize = 'min-content';
            box.style.hyphens = 'manual';
            box.style.setProperty('-webkit-hyphens', 'manual');
            widest = Math.max(widest, Math.ceil(box.getBoundingClientRect().width));
            if (previous === null) box.removeAttribute('style');
            else box.setAttribute('style', previous);
          }
          return widest;
        };
        return targets.map((target) => ({
          box: target.box,
          short: widestMinContent(target, short ?? ''),
          compound: widestMinContent(target, compound ?? ''),
        }));
      },
      [SHRINK_WRAPPED, SHORT_WORD, LONGEST_COMPOUND] as const,
    );

    expect(measured.length).toBe(SHRINK_WRAPPED.length);
    for (const item of measured) {
      // A renamed or removed selector must fail here, not quietly measure nothing.
      expect(item.short, `${item.box}: nothing on the page matches this selector`).toBeGreaterThan(
        -1,
      );
      expect(
        item.compound - item.short,
        `${item.box}: min-content ${item.short}px on "${SHORT_WORD}", ${item.compound}px on "${LONGEST_COMPOUND}" — this box is still sized by its longest word`,
      ).toBeLessThanOrEqual(WORD_LENGTH_TOLERANCE);
    }
  });

  /*
   * `scrollWidth` cannot see content that an `overflow: hidden` ancestor has cut off, and
   * cutting text off is a 1.4.10 failure in its own right ("loss of content or functionality").
   * The section header used to clip: a lead paragraph holding a long URL simply disappeared
   * past the right edge, with no scrollbar and no page-level overflow. Measured before the fix:
   * text right edge 320px (Chromium) / 309px (WebKit) against a 304px / 291px header.
   */
  test('a long URL in a section header lead is wrapped, not clipped', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(DS);
    const measured = await page.evaluate((url) => {
      const header = document.querySelector('.st-section-header');
      if (!header) throw new Error('no section header on the page');
      const lead = header.querySelector('.st-section-header__lead p');
      if (!lead) throw new Error('no section header lead on the page');
      const walker = document.createTreeWalker(lead, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && !node.nodeValue?.trim()) node = walker.nextNode();
      if (node) node.nodeValue = url;
      const box = header.getBoundingClientRect();
      const range = document.createRange();
      const outside: string[] = [];
      const texts = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
      let text = texts.nextNode();
      while (text) {
        if (text.nodeValue?.trim()) {
          range.selectNodeContents(text);
          const r = range.getBoundingClientRect();
          if (r.width > 0 && r.right > box.right + 0.5) {
            outside.push(`"${text.nodeValue.trim().slice(0, 24)}" right=${Math.round(r.right)}`);
          }
        }
        text = texts.nextNode();
      }
      return {
        outside,
        headerRight: Math.round(box.right),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    }, 'https://www.sars.gov.za/types-of-tax/value-added-tax/vat-registration/');
    expect(measured.outside, `header right edge ${measured.headerRight}px`).toEqual([]);
    expect(measured.scrollWidth).toBeLessThanOrEqual(measured.clientWidth);
  });

  /*
   * ADR 0006: a verification status must not look as strong as an official source. The two
   * carry different weight, so they must not share a badge variant — "AI-checked" in the same
   * info-teal chip as "Official source" teaches the opposite at a glance, and in forced colours
   * and in print the tint is all that is left to tell them apart.
   */
  test('verification status badges are neutral, not the official variant', async ({ page }) => {
    await page.goto(DS);
    const status = page.locator('.ds-status .st-badge');
    await expect(status.first()).toBeVisible();
    const variants = await status.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-variant')),
    );
    expect(variants.length).toBeGreaterThan(0);
    expect(variants.every((v) => v === 'status')).toBe(true);
    // Officialness keeps the official variant, so the two stay visibly different.
    await expect(
      page.locator('.ds-source__title .st-badge[data-variant="official"]'),
    ).not.toHaveCount(0);
  });

  test('forced colours: the contrast panel pauses instead of failing every pair', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Playwright emulates forced-colors in Chromium only.');
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(DS);
    const summary = page.locator('[data-contrast-summary]');
    await expect(summary).toHaveAttribute('data-live', 'paused', PANEL);
    await expect(summary).toContainText('paused');
    await expect(page.locator('[data-result="fail"]')).toHaveCount(0);
    await expect(page.locator('[data-result="paused"]')).toHaveCount(CONTRAST_PAIRS.length);
  });

  test('forced colours: the selected theme segment differs by more than its border', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Playwright emulates forced-colors in Chromium only.');
    await page.emulateMedia({ forcedColors: 'active' });
    // Below 560px the tick is hidden, which is where colour used to be the only cue left.
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(DS);
    const options = await page.locator('.ds-segmented__option').evaluateAll((labels) =>
      labels.map((label) => {
        const style = getComputedStyle(label);
        return {
          value: label.querySelector('input')?.value ?? '',
          checked: label.querySelector('input')?.checked === true,
          background: style.backgroundColor,
          color: style.color,
        };
      }),
    );
    const checked = options.find((option) => option.checked);
    expect(checked, 'one segment is checked').toBeDefined();
    for (const other of options.filter((option) => !option.checked)) {
      expect(checked?.background, `fill vs ${other.value}`).not.toBe(other.background);
      expect(checked?.color, `text colour vs ${other.value}`).not.toBe(other.color);
    }
  });

  test('theme control switches data-theme, theme-color and persists across reload', async ({
    page,
  }) => {
    await page.goto(DS);
    const control = page.getByRole('group', { name: 'Colour theme' });
    await expect(control.getByRole('radio', { name: 'System' })).toBeChecked();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);

    await control.getByText('Dark', { exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('st.theme'))).toBe('dark');
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute(
      'content',
      '#15130f',
    );

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(control.getByRole('radio', { name: 'Dark' })).toBeChecked();
    // The page background is painted on <html> from --st-bg (#15130f in dark).
    const bg = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    );
    expect(bg).toBe('rgb(21, 19, 15)');

    // Click the visible label text, as a pointer user would (the radio itself is transparent).
    await control.getByText('Light', { exact: true }).click();
    await expect(control.getByRole('radio', { name: 'Light' })).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Keyboard users: arrow keys move between radios in the group.
    await control.getByRole('radio', { name: 'Light' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(control.getByRole('radio', { name: 'System' })).toBeChecked();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    expect(await page.evaluate(() => localStorage.getItem('st.theme'))).toBe('system');
    const colours = await page
      .locator('meta[name="theme-color"]')
      .evaluateAll((metas) => metas.map((m) => m.getAttribute('content')));
    expect(colours).toEqual(['#fbf8f3', '#15130f']);
  });

  test('theme control keeps equal segments on one row at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(DS);
    const boxes = await page
      .locator('.ds-segmented__option')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
    expect(boxes).toHaveLength(3);
    const [first] = boxes;
    for (const box of boxes) {
      expect(Math.abs(box.top - (first?.top ?? 0))).toBeLessThan(1);
      expect(Math.abs(box.width - (first?.width ?? 0))).toBeLessThan(1);
    }
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`theme control icons are full size and at least 3:1 in every state at 1280px (${scheme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(DS);
      const toggle = page.locator('st-theme-toggle');
      await toggle.scrollIntoViewIfNeeded();

      const measure = async (state: string): Promise<void> => {
        const icons = await toggle.locator('.ds-segmented__option').evaluateAll((labels) =>
          labels.map((label) => {
            const svg = label.querySelector<SVGSVGElement>('.ds-segmented__icon svg');
            const group = label.closest('.ds-segmented');
            if (!svg || !group) throw new Error('theme icon missing');
            const box = svg.getBoundingClientRect();
            return {
              value: label.querySelector('input')?.value ?? '',
              width: box.width,
              height: box.height,
              stroke: getComputedStyle(svg).stroke,
              fill: getComputedStyle(svg).fill,
              labelBg: getComputedStyle(label).backgroundColor,
              groupBg: getComputedStyle(group).backgroundColor,
            };
          }),
        );
        expect(icons.map((icon) => icon.value)).toEqual(['system', 'light', 'dark']);
        for (const icon of icons) {
          const where = `${scheme} / ${state} / ${icon.value}`;
          expect(icon.width, `${where} width`).toBeGreaterThan(18);
          expect(Math.abs(icon.width - icon.height), `${where} square`).toBeLessThan(0.5);
          expect(icon.fill, `${where} fill`).toBe('none');
          const backdrop: Rgb = compositeOver(parseCssColor(icon.groupBg), [255, 255, 255]);
          const segment = compositeOver(parseCssColor(icon.labelBg), backdrop);
          const stroke = compositeOver(parseCssColor(icon.stroke), segment);
          const ratio = contrastRatio(stroke, segment);
          expect(ratio, `${where} stroke ${icon.stroke} on ${icon.labelBg}`).toBeGreaterThanOrEqual(
            3,
          );
        }
      };

      await expect(toggle.getByRole('radio', { name: 'System' })).toBeChecked();
      await page.mouse.move(0, 0);
      await measure('system selected');
      for (const name of ['Light', 'Dark', 'System'] as const) {
        await toggle.getByText(name, { exact: true }).click();
        await expect(toggle.getByRole('radio', { name })).toBeChecked();
        await measure(`${name} selected, hovered`);
        const other = name === 'System' ? 'Light' : 'System';
        await toggle.getByText(other, { exact: true }).hover();
        await measure(`${name} selected, ${other} hovered`);
        await page.mouse.move(0, 0);
      }
      await toggle.getByRole('radio', { name: 'System' }).focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await expect(toggle.getByRole('radio', { name: 'System' })).toBeFocused();
      await measure('system focused');
    });
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`runtime contrast panel shows zero FAIL (${theme})`, async ({ page }) => {
      await openWithTheme(page, theme);
      const summary = page.locator('[data-contrast-summary]');
      await expect(summary).toHaveAttribute('data-failures', '0', PANEL);
      await expect(page.locator('[data-result="fail"]')).toHaveCount(0);
      await expect(page.locator('[data-result="pass"]')).toHaveCount(CONTRAST_PAIRS.length);
      await expect(summary).toContainText(`theme: ${theme}`);
      // "Now" must match the build-time ratio for the active theme (catches default black).
      // Columns: Pair, Sample, Use, Needs, Light, Dark, Now, Result.
      const column = theme === 'light' ? 4 : 5;
      const pairs = await page
        .locator('tr[data-contrast-fg]')
        .evaluateAll(
          (rows, col) =>
            rows.map((row) => [
              row.children[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
              row.children[col]?.textContent?.trim() ?? '',
              row.children[6]?.textContent?.trim() ?? '',
            ]),
          column,
        );
      const mismatches = pairs.filter(
        ([, built = '', now = '']) =>
          Math.abs(Number.parseFloat(built) - Number.parseFloat(now)) > 0.02,
      );
      expect(mismatches).toEqual([]);
    });

    test(`axe reports no serious or critical violations (${theme})`, async ({ page }) => {
      // axe walks ~370 contrast-incomplete nodes here and is slow in WebKit under load.
      test.slow();
      await openWithTheme(page, theme);
      await expect(page.locator('[data-contrast-summary]')).toHaveAttribute(
        'data-failures',
        '0',
        PANEL,
      );
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const blocking = results.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        }));
      expect(blocking).toEqual([]);
    });

    // axe leaves color-contrast "incomplete" on most of this page (tints, gradients, overlays),
    // so measure the rendered text colours of every component ourselves.
    test(`rendered component text meets 4.5:1 (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await openWithTheme(page, theme);
      const selectors = [
        '.ds-intro',
        '.st-hint',
        '.ds-swatch__values',
        '.ds-toc a',
        'thead th',
        'th[scope="row"]',
        '.ds-result[data-result]',
        '.ds-page > .st-section-header .st-section-header__eyebrow',
        '.ds-page > .st-section-header .st-section-header__title',
        '.ds-page > .st-section-header code',
        ...['start', 'core', 'branding', 'paperwork', 'types', 'lookup'].flatMap((s) => [
          `.ds-demo [data-section="${s}"].st-section-header .st-section-header__title`,
          `.ds-demo [data-section="${s}"].st-section-header .st-section-header__lead p`,
          `.ds-illustration[data-section="${s}"] span`,
        ]),
        ...['primary', 'secondary', 'ghost', 'danger'].flatMap((v) => [
          `.st-btn[data-variant="${v}"]:not([aria-disabled])`,
          `.st-btn[data-variant="${v}"][aria-busy="true"]`,
          `.st-btn[data-variant="${v}"][aria-disabled="true"]:not([aria-busy])`,
        ]),
        '.st-card__eyebrow',
        '.st-card__link',
        '.st-card__summary p',
        '.st-card__meta',
        ...['plain-words', 'note', 'warning', 'official', 'info'].flatMap((v) => [
          `.st-callout[data-variant="${v}"] .st-callout__label`,
          `.st-callout[data-variant="${v}"] .st-callout__body p`,
        ]),
        ...['entity', 'type', 'official', 'status', 'effort', 'mt', 'flag'].map(
          (v) => `.st-badge[data-variant="${v}"]`,
        ),
        '.st-effort__label',
        '.st-effort__value',
        '.st-ring__text',
        '.st-empty__title',
        '.st-empty__body p',
        '.st-toast:not([data-variant])',
        ...['success', 'info', 'warning', 'danger'].map((v) => `.st-toast[data-variant="${v}"]`),
        '.ds-segmented__option:has(input:checked)',
        '.ds-segmented__option:not(:has(input:checked))',
        'label[for="ds-name"]',
        '#ds-vat',
        '#ds-disabled',
        '.st-error-text',
        'mark',
        '.ds-footer p',
        '.ds-topbar__tag',
      ];
      const samples = await page.evaluate((list) => {
        return list.map((selector) => {
          const el = document.querySelector(selector);
          if (!el) return { selector, missing: true, color: '', layers: [] as string[] };
          const layers: string[] = [];
          for (let node: Element | null = el; node; node = node.parentElement) {
            layers.push(getComputedStyle(node).backgroundColor);
          }
          return { selector, missing: false, color: getComputedStyle(el).color, layers };
        });
      }, selectors);

      const failures: string[] = [];
      for (const sample of samples) {
        if (sample.missing) {
          failures.push(`${sample.selector}: not found`);
          continue;
        }
        // Composite backgrounds from <html> (opaque --st-bg) inwards, then the text on top.
        let backdrop: Rgb = [255, 255, 255];
        for (const layer of [...sample.layers].reverse()) {
          backdrop = compositeOver(parseCssColor(layer), backdrop);
        }
        const text = compositeOver(parseCssColor(sample.color), backdrop);
        const ratio = contrastRatio(text, backdrop);
        if (ratio < 4.5) failures.push(`${sample.selector}: ${formatRatio(ratio)}`);
      }
      expect(failures).toEqual([]);
    });
  }

  test('system dark preference applies the dark palette without a saved choice', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(DS);
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--st-bg').trim(),
    );
    expect(bg.toLowerCase()).toBe('#15130f');
  });

  test('stacked wide table: labels take their own grid column and never overlap', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(DS);
    const region = page.locator('.st-table-scroll[data-wide="true"]');
    const problems = await region.evaluate((wrapper) => {
      const found: string[] = [];
      for (const row of wrapper.querySelectorAll('tbody tr')) {
        const cells = [...row.querySelectorAll<HTMLElement>('[data-label]')];
        for (const [i, cell] of cells.entries()) {
          const style = getComputedStyle(cell);
          const label = getComputedStyle(cell, '::before');
          if (style.display !== 'grid') found.push(`${cell.dataset['label']}: ${style.display}`);
          if (label.position !== 'static') found.push(`${cell.dataset['label']}: label positioned`);
          const next = cells[i + 1];
          if (
            next &&
            cell.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 0.5
          ) {
            found.push(`${cell.dataset['label']} overlaps ${next.dataset['label']}`);
          }
          const labelHeight = Number.parseFloat(label.height);
          const contentHeight =
            cell.getBoundingClientRect().height -
            Number.parseFloat(style.paddingTop) -
            Number.parseFloat(style.paddingBottom);
          if (!Number.isNaN(labelHeight) && labelHeight > contentHeight + 0.5) {
            found.push(`${cell.dataset['label']}: label taller than its cell`);
          }
        }
      }
      return found;
    });
    expect(problems).toEqual([]);

    // Table semantics survive stacking, and the visual label is not added to the cell name.
    const snapshot = await region.ariaSnapshot();
    expect(snapshot).toContain('table "Business types by effort');
    expect(snapshot).toMatch(/rowheader "Food"/);
    expect(snapshot).toMatch(/cell "High"/);
  });

  test('table regions are tab stops only while they scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(DS);
    const contrast = page.locator('st-table-scroll', { has: page.locator('#contrast-caption') });
    const wide = page.locator('st-table-scroll[data-wide="true"]');
    await expect(contrast).toHaveAttribute('tabindex', '0');
    await expect(contrast).toHaveAttribute('role', 'region');
    await expect(wide).not.toHaveAttribute('tabindex', /.*/);
    await expect(wide).not.toHaveAttribute('role', /.*/);

    // Keyboard scrolling still works on a real scroll region.
    await contrast.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => contrast.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

    await page.setViewportSize({ width: 1280, height: 800 });
    const type = page.locator('st-table-scroll', { has: page.locator('#type-caption') });
    await expect(type).not.toHaveAttribute('tabindex', /.*/);
    await expect(wide).not.toHaveAttribute('tabindex', /.*/);
  });

  test('keyboard focus shows a visible ring on key controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(DS);
    await page.keyboard.press('Tab'); // switch to keyboard modality
    const checks: [string, string][] = [
      ['.st-btn[data-variant="primary"]:not([aria-disabled])', 'self'],
      ['.st-btn[data-variant="secondary"]:not([aria-disabled])', 'self'],
      ['.st-btn[aria-busy="true"]', 'self'],
      ['#ds-name', 'self'],
      ['.st-check input[type="checkbox"]', 'self'],
      ['.ds-toc a', 'self'],
      ['input[name="st-theme"]:checked', 'label'],
      ['.st-card__link', 'card'],
    ];
    for (const [selector, ringOn] of checks) {
      const target = page.locator(selector).first();
      await target.focus();
      const ring = await target.evaluate((el, where) => {
        const host =
          where === 'label' ? el.closest('label') : where === 'card' ? el.closest('.st-card') : el;
        const style = getComputedStyle(host ?? el);
        return {
          focusVisible: el.matches(':focus-visible'),
          style: style.outlineStyle,
          width: Number.parseFloat(style.outlineWidth),
        };
      }, ringOn);
      expect(ring.focusVisible, selector).toBe(true);
      expect(ring.style, selector).not.toBe('none');
      expect(ring.width, selector).toBeGreaterThanOrEqual(2);
    }
  });

  test('disabled and loading buttons ignore activation and announce only the status', async ({
    page,
  }) => {
    await page.goto(DS);
    const loading = page.locator('.st-btn[data-variant="primary"][aria-busy="true"]');
    await expect(loading).toHaveAccessibleName('Saving');
    await expect(loading).toHaveAttribute('type', 'button');
    const disabled = page.locator('.st-btn[data-variant="primary"][aria-disabled="true"]').last();
    const clicked = await disabled.evaluate((button: HTMLElement) => {
      let count = 0;
      button.addEventListener('click', () => (count += 1));
      button.click();
      return count;
    });
    expect(clicked).toBe(0);
  });
});
