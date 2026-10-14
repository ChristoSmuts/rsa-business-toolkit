import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * WP-50 Phase 3, item 2: the home page, the section hubs and the card set, to direction A
 * (`docs/work-packages/WP-50-directions.md`, "Layout concepts → Home" and "Section hub", "The card
 * set", and decision D4 = A1, the stoep).
 *
 * - Home: the stoep previews Find my path's three questions as three steps widening downward under
 *   the logo's roof, links into the wizard, and fits 320px in Afrikaans.
 * - The card set: a page to read is a row (no box), a tool is a framed panel whose button-shaped
 *   action is its link, a kind of business is a tile, a step on a path is a numbered circle. Each
 *   shape means one thing on every page that shows it.
 * - Hubs: the pages to read in order as rows, the section's tools as tools.
 * - Hover changes colours only, and only for a pointer that can hover; nothing moves.
 */
const RESULT = 'find-my-path/result/pty/vehicle-dealer/pty-growing/';

async function box(locator: Locator): Promise<{ x: number; y: number; w: number; h: number }> {
  const rect = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
  });
  return rect;
}

async function style(locator: Locator, property: string): Promise<string> {
  return locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property);
}

async function noSidewaysScroll(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test.describe('the home page', () => {
  test('the stoep shows the three questions as widening steps under a roof', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    const stoep = page.locator('figure.st-stoep');
    await expect(stoep).toBeVisible();
    await expect(stoep.locator('svg.st-stoep__roof')).toHaveAttribute('aria-hidden', 'true');
    const steps = stoep.locator('.st-stoep__steps > li');
    await expect(steps).toHaveText(['How you trade', 'Kind of business', 'Where you are now']);
    const widths = await steps.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().width),
    );
    expect(widths[0]).toBeLessThan(widths[1] ?? 0);
    expect(widths[1]).toBeLessThan(widths[2] ?? 0);
    await expect(stoep.locator('figcaption')).toHaveText(
      'Three short questions. Then you get the steps that apply to you, in order.',
    );
    // On the wide screen it sits beside the hero's words, not under them.
    const text = await box(page.locator('.st-home__hero-text'));
    const figure = await box(stoep);
    expect(figure.x).toBeGreaterThan(text.x + text.w - 1);
  });

  test('the stoep links into the wizard: a tap on a step opens it', async ({ page, basePath }) => {
    await page.goto('./');
    const link = page.locator('.st-stoep__link');
    await expect(link).toHaveAttribute('href', `${basePath}find-my-path/`);
    // The caption's link covers the figure, so the step is under it: click where the step is.
    await page.locator('.st-stoep__steps > li').nth(1).click({ force: true });
    await expect(page).toHaveURL(/\/find-my-path\/$/);
  });

  test('the stoep fits 320px in Afrikaans, and every step keeps its words', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('af/');
    await noSidewaysScroll(page);
    const steps = page.locator('.st-stoep__steps > li');
    await expect(steps).toHaveText(['Hoe jy handel dryf', 'Soort besigheid', 'Waar jy nou is']);
    for (const clipped of await steps.evaluateAll((items) =>
      items.map((item) => item.scrollWidth > item.clientWidth),
    ))
      expect(clipped).toBe(false);
  });

  test('the stoep keeps its edges in forced colours', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('./');
    const step = page.locator('.st-stoep__steps > li').first();
    expect(await style(step, 'border-top-style')).toBe('solid');
    // The roof is drawn in the system's text colour, like the steps' edges, not the author's green
    // (review pass 1, m4).
    const ink = await style(step, 'border-top-color');
    expect(await style(page.locator('.st-stoep__roof'), 'color')).toBe(ink);
  });

  test('the stoep is named once, by its link, which says where it goes', async ({ page }) => {
    await page.goto('./');
    // The figure takes no name from its caption, so the caption is heard once (review pass 1, n1).
    await expect(page.locator('figure.st-stoep')).not.toHaveAttribute('aria-labelledby', /.*/);
    await expect(page.locator('figure.st-stoep')).not.toHaveAttribute('aria-label', /.*/);
    // The link's name starts with its visible words and names Find my path (n2).
    await expect(page.locator('.st-stoep__link')).toHaveAccessibleName(
      'Three short questions. Then you get the steps that apply to you, in order. Start Find my path',
    );
  });

  test('the stoep is left out of print', async ({ page }) => {
    await page.goto('./');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('figure.st-stoep')).toBeHidden();
  });

  test('where to start: two pages to read and one tool', async ({ page, basePath }) => {
    await page.goto('./');
    const where = page.locator('section[aria-labelledby="home-where"]');
    await expect(where.locator('.st-card[data-variant="page"]')).toHaveCount(2);
    const tool = where.locator('.st-card[data-variant="tool"]');
    await expect(tool).toHaveCount(1);
    await expect(tool.getByRole('link')).toHaveAccessibleName('Open the checklist');
    await expect(tool.getByRole('link')).toHaveAttribute('href', `${basePath}checklist/`);
    await expect(page.locator('.st-type-tiles .st-card[data-variant="type"]')).toHaveCount(7);
    // The three numbers are facts with a rule, and their figures use Fraunces' wght-only settings.
    const value = page.locator('.st-home__number-value').first();
    expect(await style(value, 'font-weight')).toBe('600');
    expect(await style(value, 'font-variation-settings')).toBe('normal');
  });
});

test.describe('the card set', () => {
  test('each shape looks like what it is', async ({ page }) => {
    await page.goto('./');
    const row = page.locator('.st-card[data-variant="page"]').first();
    const tool = page.locator('.st-card[data-variant="tool"]').first();
    const tile = page.locator('.st-card[data-variant="type"]').first();
    // A page to read has no box: no fill, no shadow, a rule in the section's hue on its start.
    expect(await style(row, 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await style(row, 'box-shadow')).toBe('none');
    expect(await style(row, 'border-left-width')).toBe('4px');
    expect(await style(row, 'border-top-width')).toBe('0px');
    // A tool is framed all round, 2px, with the large radius.
    for (const side of ['top', 'right', 'bottom', 'left'])
      expect(await style(tool, `border-${side}-width`)).toBe('2px');
    expect(await style(tool, 'border-top-left-radius')).toBe('14px');
    // A kind of business is a tile with a hairline.
    expect(await style(tile, 'border-top-width')).toBe('1px');
    expect(await style(tile, 'box-shadow')).toBe('none');
  });

  test('hover changes a colour and moves nothing, only for a pointer that can hover', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'A touch screen has no hover.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./');
    for (const [card, part] of [
      ['.st-card[data-variant="page"]', '.st-card__link'],
      ['.st-card[data-variant="tool"]', '.st-card__action'],
    ] as const) {
      const target = page.locator(card).first();
      const before = await box(target);
      const colour = await style(target.locator(part), 'color');
      await target.hover({ position: { x: 8, y: 8 } });
      await expect.poll(() => style(target.locator(part), 'color')).not.toBe(colour);
      expect(await box(target)).toEqual(before);
      expect(await style(target, 'transform')).toBe('none');
    }
  });

  test('a touch screen gets no hover state', async ({ page }) => {
    await page.emulateMedia({ media: 'screen' });
    await page.goto('./');
    // The hover rules sit inside `(hover: hover)`, so a touch device never matches them.
    const gated = await page.evaluate(() => {
      const found: string[] = [];
      for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        const walk = (list: CSSRuleList, inHover: boolean): void => {
          for (const rule of list) {
            if (rule instanceof CSSMediaRule)
              walk(rule.cssRules, inHover || rule.conditionText.includes('hover: hover'));
            else if (
              rule instanceof CSSStyleRule &&
              /\.st-card|\.st-stoep/.test(rule.selectorText) &&
              rule.selectorText.includes(':hover') &&
              !inHover
            )
              found.push(rule.selectorText);
          }
        };
        walk(rules, false);
      }
      return found;
    });
    expect(gated).toEqual([]);
  });
});

test.describe('section hubs', () => {
  test('the pages to read are rows in order, the templates are tools', async ({
    page,
    basePath,
  }) => {
    await page.goto('paperwork/');
    await expect(page.locator('.st-section-header')).toBeVisible();
    const rows = page.locator('.st-section-page__list > li');
    await expect(rows).toHaveCount(2);
    await expect(rows.first().locator('a').first()).toHaveAttribute(
      'href',
      `${basePath}paperwork/which-template-to-use-when/`,
    );
    await expect(page.getByText(/^Page \d+ of \d+$/)).toHaveCount(0);
    const tools = page.locator('.st-section-page__tools .st-card[data-variant="tool"]');
    await expect(tools).toHaveCount(5);
    const action = tools.first().getByRole('link');
    await expect(action).toHaveText('Open template');
    // The short name, as on /templates/: "(template)" would repeat the action (review pass 2, n3).
    await expect(action).toHaveAccessibleName('Open template: Quotation');
    // The count is of pages to read; the tools have their own heading (review pass 2).
    await expect(page.locator('.st-section-page > .st-hint').first()).toHaveText('2 pages');
    await expect(page.locator('#st-section-tools')).toHaveText('Tools on this site');
  });

  test('the checklist is a tool on Look it up', async ({ page, basePath }) => {
    await page.goto('look-it-up/');
    await expect(page.locator('.st-section-page__list > li')).toHaveCount(2);
    const tool = page.locator('.st-card[data-variant="tool"]');
    await expect(tool).toHaveCount(1);
    await expect(tool.getByRole('link')).toHaveAttribute('href', `${basePath}checklist/`);
    // A tool keeps its read time, as plain words, like a page row (review pass 1, m2).
    const time = tool.locator('.st-card__meta .st-badge[data-variant="status"]');
    await expect(time).toHaveText(/\d+ min read/);
    expect(await style(time, 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // A tap on the read time opens the tool too: the meta row lets it through (pass 2, n4).
    // `force`: the words take no pointer events themselves; the click lands on the overlay below.
    await time.click({ force: true });
    await expect(page).toHaveURL(/\/checklist\/$/);
  });

  test('a read time is plain words in forced colours too, on rows and tools', async ({ page }) => {
    // Forced colours repaint a transparent border; a bare badge has none (review pass 2, m1).
    await page.emulateMedia({ forcedColors: 'active' });
    for (const [route, card] of [
      ['core/', '.st-card[data-variant="page"]'],
      ['look-it-up/', '.st-card[data-variant="tool"]'],
    ] as const) {
      await page.goto(route);
      const time = page.locator(`${card} .st-card__meta .st-badge`).first();
      expect(await style(time, 'border-top-style'), route).toBe('none');
    }
  });

  test('on paper a tool’s action is a link and a panel is never split', async ({ page }) => {
    await page.goto('paperwork/');
    await page.emulateMedia({ media: 'print' });
    const tool = page.locator('.st-card[data-variant="tool"]').first();
    expect(await style(tool, 'break-inside')).toBe('avoid');
    const action = tool.locator('.st-card__action');
    expect(await style(action, 'border-top-style')).toBe('none');
    expect(await style(action, 'text-decoration-line')).toBe('underline');
  });

  test('tools in one row share a height, with their actions on one line', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'One tool per row on a phone.');
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const route of ['paperwork/', 'templates/']) {
      await page.goto(route);
      const tools = page.locator('.st-card[data-variant="tool"]');
      const boxes = await tools.evaluateAll((cards) =>
        cards.map((card) => {
          const panel = card.getBoundingClientRect();
          const action = card.querySelector('.st-card__action')?.getBoundingClientRect();
          return { top: panel.top, height: panel.height, action: action?.top ?? -1 };
        }),
      );
      const firstRow = boxes.filter((item) => Math.abs(item.top - (boxes[0]?.top ?? 0)) < 1);
      expect(firstRow.length, route).toBeGreaterThan(1);
      for (const item of firstRow) {
        expect(Math.abs(item.height - (firstRow[0]?.height ?? 0)), route).toBeLessThan(1);
        expect(Math.abs(item.action - (firstRow[0]?.action ?? 0)), route).toBeLessThan(1);
      }
    }
  });

  test('the templates index shows the templates as tools', async ({ page }) => {
    await page.goto('templates/');
    await expect(page.locator('.st-templates__list .st-card[data-variant="tool"]')).toHaveCount(5);
  });
});

test.describe('a step on a path', () => {
  test('is a numbered circle on a rail, the number from the step', async ({ page }) => {
    await page.goto(`${RESULT}?entity=pty&type=vehicle-dealer&stage=pty-growing`);
    const steps = page.locator('.st-step');
    const count = await steps.count();
    expect(count).toBeGreaterThan(2);
    for (let index = 0; index < count; index++) {
      const step = steps.nth(index);
      await expect(step).toHaveAttribute('data-n', String(index + 1));
      const number = await step.evaluate((el) => getComputedStyle(el, '::before').content);
      expect(number).toContain(`"${index + 1}"`);
      // "Step 3" is still there for assistive technology.
      await expect(step.locator('[data-step-label]')).toHaveText(`Step ${index + 1}`);
    }
    // The last step has no rail below it.
    const last = await steps.last().evaluate((el) => getComputedStyle(el, '::after').display);
    expect(last).toBe('none');
  });
});
