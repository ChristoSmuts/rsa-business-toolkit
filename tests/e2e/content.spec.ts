/**
 * The content renderers, the D5 trust pieces and the navigation, checked against the page that
 * renders them from the real corpus: `/design-system/content/` and its Afrikaans twin.
 *
 * Nothing here is a fixture. The page renders one whole document from `src/data/` and the first
 * real block in the corpus for every block kind, fence variant and inline-run kind, and this spec
 * asserts that each of those really produced the markup its renderer promises.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { SEARCH_AVAILABLE, WIZARD_AVAILABLE } from '../../src/lib/routes';
import { ALL_FEATURES, selectCoverage } from '../../src/lib/content/coverage';
import { docrefText } from '../../src/lib/content/manifest';
import { normaliseText, plainText } from '../../src/lib/content/render';
import { ManifestSchema, type Block, type Doc } from '../../src/lib/content/schema';

const EN = 'design-system/content/';
const AF = 'af/design-system/content/';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEMO_DOC: Doc = JSON.parse(
  readFileSync(
    path.join(
      REPO_ROOT,
      'src',
      'data',
      'en',
      'docs',
      'business-types__pick-your-business-type.json',
    ),
    'utf8',
  ),
) as Doc;

const MANIFEST = ManifestSchema.parse(
  JSON.parse(readFileSync(path.join(REPO_ROOT, 'src', 'data', 'manifest.json'), 'utf8')),
);

/**
 * The same corpus and the same selection the page makes, so the spec knows which real block each
 * demo item on the page is showing. Only the *selection* is shared with the page; what the page
 * rendered from it is what the tests below check.
 */
const DOCS_DIR = path.join(REPO_ROOT, 'src', 'data', 'en', 'docs');
const CORPUS = readdirSync(DOCS_DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(path.join(DOCS_DIR, file), 'utf8')) as Doc)
  .map((doc) => ({ id: doc.id, blocks: doc.blocks }))
  .filter((doc) => doc.id !== DEMO_DOC.id)
  .sort((a, b) => a.id.localeCompare(b.id));
const COVERAGE = selectCoverage(CORPUS);

/**
 * The source text of a block that carries inline runs, as the page should render it. A block the
 * content configuration hid renders no text at all, on purpose, so it has none to compare.
 */
function blockText(block: Block): string | undefined {
  if (block.hidden) return undefined;
  const runs = block.kind === 'terms' ? block.intro : 'c' in block ? block.c : undefined;
  if (!runs) return undefined;
  const text = normaliseText(plainText(runs, { docref: (run) => docrefText(MANIFEST, run, 'en') }));
  return text.length > 0 ? text : undefined;
}

/**
 * What each rendering feature must put on the page, inside the demo item that claims it. A
 * feature with no entry fails the first test, so adding one to `ALL_FEATURES` forces a decision
 * here rather than quietly widening the claim.
 */
const EXPECTED: Readonly<Record<string, string>> = {
  'block:heading': 'h2[id], h3[id], h4[id]',
  'block:paragraph': 'p',
  'block:callout': '.st-callout',
  'block:list': 'li',
  'block:tasklist': 'fieldset.st-tasklist input[type="checkbox"]',
  'block:table': 'st-table-scroll > table > caption',
  'block:code': 'figure.st-code pre > code',
  'block:terms': 'dl.st-terms > dt',
  'block:note': 'p.st-note-line',
  'block:hr': 'hr',
  'block:toc': 'nav.st-contents a[href]',
  'block:glossary': 'dl.st-terms[data-glossary-group] > dt[id]',
  'block:hidden': 'span[hidden][id]',
  'callout:plain': '.st-callout[data-variant="plain-words"]',
  'callout:note': '.st-callout[data-variant="note"]',
  'code:prompt': 'figure.st-code[data-variant="prompt"]',
  'code:template-preview': 'figure.st-code[data-variant="template-preview"]',
  'code:example': 'figure.st-code[data-variant="example"]',
  'code:listing': 'figure.st-code[data-variant="listing"]',
  'code:snippet': 'figure.st-code[data-variant="snippet"]',
  'list:ordered': 'ol > li',
  'list:unordered': 'ul > li',
  'table:wide': 'st-table-scroll[data-wide="true"] th[scope="col"]',
  'table:narrow': 'st-table-scroll:not([data-wide]) tbody td',
  'table:empty': 'st-table-scroll table:not(:has(tbody))',
  'tasklist:grouped': 'fieldset.st-tasklist > legend:not(.st-visually-hidden)',
  'tasklist:ungrouped': 'fieldset.st-tasklist > legend.st-visually-hidden',
  'heading:2': 'h2[id]',
  'heading:3': 'h3[id]',
  'heading:4': ':is(h2, h3, h4).st-pseudo-heading[id]',
  'inline:text': 'p, li, td, dd, h2, h3, h4',
  'inline:strong': 'strong',
  'inline:em': 'em',
  'inline:code': 'code',
  'inline:link-internal': 'a[href^="/business-toolkit/"]',
  'inline:link-external': 'a[rel="noopener noreferrer"][href^="https://"]',
  'inline:docref-doc': 'a[href^="/business-toolkit/"]',
  'inline:docref-section': 'a[href^="/business-toolkit/"]',
  'inline:placeholder': 'mark.st-placeholder',
  // A blank line after its visible label ("Name (print):"): decorative, plus hidden "blank line"
  // text, so it is never announced as a signature it is not (review WP-20 pass 7).
  'inline:sigline': 'span.st-sigline[aria-hidden="true"] + span.st-visually-hidden',
  'inline:br': 'br',
};

interface ShrinkWrapped {
  readonly box: string;
  readonly text: string | null;
  /** Width at which the component is on screen; a hidden box measures 0 and proves nothing. */
  readonly width: number;
}

/** A real `af.json` value, 27 characters and unbreakable: the worst case for a content-sized box. */
const LONGEST_COMPOUND = 'Maatskappyregistrasienommer';
const SHORT_WORD = 'Ja';
const WORD_LENGTH_TOLERANCE = 24;

/**
 * The boxes this package adds that are sized by their own content, and therefore carry
 * `overflow-wrap: anywhere` (docs/design-system.md, "Wrapping and min-content"). Each is measured
 * on its own, because the page-level `scrollWidth` test cannot tell which declaration was deleted.
 */
const SHRINK_WRAPPED: readonly ShrinkWrapped[] = [
  { box: '.st-menu__summary', text: '.st-menu__summary > span', width: 1024 },
  { box: '.st-menu__link', text: '.st-menu__label', width: 1024 },
  { box: '.st-segmented__option', text: '.st-segmented__option > span:not([class])', width: 1024 },
  { box: '.st-toc__summary', text: null, width: 1024 },
  { box: '.st-lang__link', text: null, width: 320 },
  // The header's search link exists only once search is built (`SEARCH_AVAILABLE`, WP-33).
  ...(SEARCH_AVAILABLE
    ? [{ box: '.st-topbar__search', text: '.st-topbar__search > span:not([class])', width: 320 }]
    : []),
  { box: '.st-topbar__menu-button', text: '.st-topbar__menu-button > span', width: 320 },
];

async function open(page: Page, route: string): Promise<void> {
  const response = await page.goto(route);
  expect(response?.status(), `HTTP status of /${route}`).toBe(200);
}

test.describe('content rendering', () => {
  test('renders every block kind and every inline run from the real corpus', async ({ page }) => {
    await open(page, EN);

    const all = await page.locator('[data-all-features]').getAttribute('data-all-features');
    expect(all, 'the page did not report which features it rendered').not.toBeNull();
    const rendered = (all ?? '').split(' ').filter(Boolean).sort();
    expect(rendered, 'the corpus no longer exercises every renderer branch').toEqual(
      [...ALL_FEATURES].sort(),
    );

    // Every feature must be described here, so widening ALL_FEATURES cannot widen the claim.
    expect([...ALL_FEATURES].filter((feature) => !(feature in EXPECTED))).toEqual([]);

    const missing: string[] = [];
    for (const feature of rendered) {
      const item = page.locator(`.dsc-item[data-features~="${feature}"]`);
      await expect(item, `no demo item claims ${feature}`).toHaveCount(1);
      const selector = EXPECTED[feature] as string;
      if ((await item.locator(selector).count()) === 0) missing.push(`${feature}: ${selector}`);
      const text = normaliseText((await item.innerText()) || '');
      if (text.length < 5) missing.push(`${feature}: the item rendered no text`);
    }
    expect(missing, 'features whose renderer produced nothing').toEqual([]);
  });

  /*
   * The inline renderer glues runs together inside a sentence, so a stray newline in its template
   * becomes a space the reader sees ("in Glossary ."). Comparing the rendered text of every
   * paragraph with `plainText` of the same runs catches that, and catches a run kind that renders
   * nothing at all. Collapsing whitespace on both sides keeps HTML's own folding out of it.
   */
  test('paragraphs render exactly the text the data holds', async ({ page }) => {
    await open(page, EN);
    const expected = DEMO_DOC.blocks
      .filter((block): block is Extract<Block, { kind: 'paragraph' }> => block.kind === 'paragraph')
      .filter((block) => !block.hidden)
      .map((block) =>
        normaliseText(
          // A docref shows the document's title, not the folder name the markdown wrote, so the
          // expected text resolves it the same way the renderer does.
          plainText(block.c, { docref: (run) => docrefText(MANIFEST, run, 'en') }),
        ),
      )
      .filter((text) => text.length > 0);
    expect(expected.length, 'the demo document has no paragraphs to compare').toBeGreaterThan(3);

    // The renderer adds text the data does not hold and the reader does not see: the hidden
    // "(external link)" after an external link, and the "Official" badge after an official one.
    // Both are deliberate, so they are removed before the comparison rather than excused by it.
    const actual = await page.locator('article .st-blocks > p').evaluateAll((nodes) =>
      nodes.map((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        for (const extra of clone.querySelectorAll('.st-visually-hidden, .st-badge')) {
          extra.remove();
        }
        return clone.textContent ?? '';
      }),
    );
    const normalised = actual.map((text) => normaliseText(text));
    for (const text of expected) {
      expect(normalised, `not rendered as written: "${text}"`).toContain(text);
    }
  });

  /*
   * The same comparison over the coverage items, which is where the constructs that break live:
   * one document's paragraphs happen to hold no emphasis and no docref inside a link, so the test
   * above passed while the formatter's version of `Inline.astro` was rendering "in Glossary ."
   * elsewhere on the page. These items are one real block each, from a different document, chosen
   * precisely because they exercise a construct nothing else does.
   */
  test('every demo block renders exactly the text its data holds', async ({ page }) => {
    await open(page, EN);
    const wanted = COVERAGE.map((item) => ({
      features: item.features,
      text: blockText(item.block),
    })).filter(
      (item): item is { features: readonly string[]; text: string } => item.text !== undefined,
    );
    expect(wanted.length, 'no demo item carries inline runs to compare').toBeGreaterThan(8);

    const problems: string[] = [];
    for (const item of wanted) {
      const rendered = await page
        .locator(`.dsc-item[data-features~="${item.features[0] ?? ''}"] .st-blocks`)
        .evaluate((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          for (const extra of clone.querySelectorAll('.st-visually-hidden, .st-badge')) {
            extra.remove();
          }
          return clone.textContent ?? '';
        });
      if (!normaliseText(rendered).includes(item.text)) {
        problems.push(
          `${item.features.join(' ')}\n  data:     ${item.text}\n  rendered: ${normaliseText(rendered)}`,
        );
      }
    }
    expect(problems.join('\n'), 'blocks not rendered as written').toBe('');
  });

  test('a docref shows the document title, not the folder name the markdown used', async ({
    page,
  }) => {
    await open(page, EN);
    const item = page.locator('.dsc-item[data-features~="inline:docref-section"]');
    const link = item.locator('a[href^="/business-toolkit/"]').first();
    await expect(link).toBeVisible();
    // The labels in the data are folder names such as `01-core/`; none may reach the page.
    await expect(item).not.toContainText(/\b0\d-[a-z-]+\//);
  });

  /*
   * Every table is a named, keyboard-scrollable region: plan B5 allows exactly one thing to
   * scroll sideways at 320px and this is it.
   *
   * The stacked-card mode is asked for from five columns. Both of the corpus's five-column-plus
   * tables are column headings with no rows (a cash book and a vehicle logbook), so `data-label`
   * — which only body cells carry — has no data to be checked against today. That gap is real and
   * is recorded in the report, not papered over here.
   */
  test('a table is a named scroll region, and a wide one asks for the stacked mode', async ({
    page,
  }) => {
    await open(page, EN);
    const narrow = page.locator('.dsc-item[data-features~="table:narrow"] st-table-scroll');
    // `data-labelledby` is the copy the element keeps: it drops `role` and `aria-labelledby`
    // while the table does not overflow, so those two say nothing about the markup here.
    const labelledBy = await narrow.getAttribute('data-labelledby');
    expect(labelledBy).toBeTruthy();
    const caption = page.locator(`#${labelledBy ?? ''}`);
    await expect(caption).toHaveCount(1);
    await expect(caption).toContainText('Scroll sideways');
    await expect(caption).toHaveClass(/st-visually-hidden/);
    await expect(caption.locator('xpath=..')).toHaveJSProperty('tagName', 'TABLE');

    const wide = page.locator('.dsc-item[data-features~="table:wide"] st-table-scroll');
    await expect(wide).toHaveAttribute('data-wide', 'true');
    expect(await wide.locator('thead th[scope="col"]').count()).toBeGreaterThanOrEqual(5);

    // A table with no rows gets no empty <tbody>.
    await expect(page.locator('.dsc-item[data-features~="table:empty"] table tbody')).toHaveCount(
      0,
    );
  });

  test('a checklist uses the task ids the pipeline generated', async ({ page }) => {
    await open(page, EN);
    const boxes = page.locator('.dsc-item[data-features~="block:tasklist"] input[type="checkbox"]');
    await expect(boxes.first()).toBeVisible();
    const ids = await boxes.evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids)
      expect(id, 'not a task id from tasks.json').toMatch(/^[a-z-]+\/.+:[0-9a-f]{8}/);
  });

  test('a prompt is readable and copyable by hand, with no script and no clamp', async ({
    page,
  }) => {
    await open(page, EN);
    const figure = page.locator('.dsc-item[data-features~="code:prompt"] figure.st-code');
    await expect(figure).toBeVisible();
    // The only control is the copy button (WP-30), which the script shows; without JavaScript it
    // stays hidden (`tests/e2e/interactive.spec.ts`, nojs project).
    await expect(figure.locator('button')).toHaveCount(1);
    await expect(figure.locator('st-copy button')).toBeVisible();
    await expect(figure.locator('mark.st-placeholder').first()).toBeVisible();
    // A prompt wraps (it is prose), so it never scrolls and is not a tab stop of its own. Only
    // layouts (template previews, listings) scroll and keep their named region (review WP-20 p4).
    await expect(figure.locator('pre')).not.toHaveAttribute('tabindex', /.*/);
    const clipped = await figure.locator('pre').evaluate((node) => {
      const style = getComputedStyle(node);
      return style.maxHeight !== 'none' || style.overflowY === 'hidden';
    });
    expect(clipped, 'the prompt text is clipped, so it is not readable without JavaScript').toBe(
      false,
    );
  });
});

test.describe('the D5 trust pieces', () => {
  test('the AI notice states who checked the page, in the order the design system fixes', async ({
    page,
  }) => {
    await open(page, EN);
    const notice = page.locator('.st-ai-notice');
    await expect(notice).toHaveCount(1);
    await expect(notice).toHaveAttribute('data-variant', 'info');
    await expect(notice).toHaveAttribute('role', 'note');
    await expect(notice.locator('.st-callout__label')).toHaveText(/About this page/);

    const text = normaliseText(await notice.innerText());
    expect(text).toContain('Written by AI');
    expect(text).toContain('No person has checked it yet');
    expect(text).toContain('Not legal, tax or financial advice');

    // The status is a badge and words, and the neutral chip, never the one that marks officialness.
    const status = notice.locator('.st-badge');
    await expect(status).toHaveCount(1);
    await expect(status).toHaveAttribute('data-variant', 'status');
    await expect(notice.locator('.st-ai-notice__status > span:not(.st-badge)')).toHaveText(
      /An AI compared/,
    );
    await expect(notice.locator('a.st-link-block')).toHaveAttribute(
      'href',
      '/business-toolkit/start/how-this-was-made/',
    );

    // Order on the page: sentence, then status, then the link.
    const order = await notice.evaluate((node) => {
      const children = [...node.querySelectorAll('.st-callout__body > *')];
      return children.map((child) =>
        child.classList.contains('st-ai-notice__status')
          ? 'status'
          : child.querySelector('a')
            ? 'link'
            : 'body',
      );
    });
    expect(order).toEqual(['body', 'status', 'link']);
  });

  test('no page claims a human review, because no document records one', async ({ page }) => {
    for (const route of [EN, AF]) {
      await open(page, route);
      await expect(page.locator('.st-ai-notice')).not.toContainText(/Checked by|Nagegaan deur/);
    }
  });

  test('the sources section lists real register entries with their labels', async ({ page }) => {
    await open(page, EN);
    const sources = page.locator('#dsc-sources').locator('xpath=..');
    await expect(page.locator('#dsc-sources')).toHaveText('Sources for this page');
    const entries = sources.locator('li.st-source');
    expect(await entries.count()).toBeGreaterThan(1);
    await expect(sources.locator('.st-badge[data-variant="official"]').first()).toBeVisible();
    await expect(entries.first().locator('.st-hint')).toContainText('What this source supports');
    const external = sources.locator('a.st-link-block[href^="https://"]').first();
    await expect(external).toHaveAttribute('rel', /noopener/);
    await expect(sources.getByText('Acts and regulations')).toBeVisible();
  });

  test('a page with no sources of its own shows its note and both links', async ({ page }) => {
    await open(page, EN);
    const demo = page.locator('[data-demo="source-note"]');
    await expect(demo).toContainText('makes no factual claim of its own');
    const links = demo.locator('a.st-link-block');
    await expect(links).toHaveCount(2);
    const hrefs = await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href') ?? ''),
    );
    expect(hrefs).toEqual([
      '/business-toolkit/sources/',
      '/business-toolkit/start/how-this-was-made/',
    ]);
  });

  test('the Afrikaans gallery shows the fallback: content not translated yet, marked as English', async ({
    page,
  }) => {
    await open(page, AF);
    await expect(page.locator('html')).toHaveAttribute('lang', 'af-ZA');
    const notice = page.locator('header .st-callout[data-variant="warning"]');
    await expect(notice.first()).toBeVisible();
    await expect(notice.first()).toContainText('Afrikaans');
    await expect(page.locator('article .st-blocks').first()).toHaveAttribute('lang', 'en-ZA');
    // Everything else that is English text is marked as English too (review WP-20 M1 pass 1).
    await expect(page.locator('article h1')).toHaveAttribute('lang', 'en-ZA');
    await expect(page.locator('.st-toc--details .st-toc__list')).toHaveAttribute('lang', 'en-ZA');
    // The breadcrumb is chrome: every document has an Afrikaans navigation title (WP-40), so the
    // crumb is Afrikaans even while the text below it falls back to English.
    await expect(page.locator('.st-breadcrumb [aria-current="page"]')).not.toHaveAttribute(
      'lang',
      /.*/,
    );
    // The link to the English page is in Afrikaans: it names the target's language, not its own.
    const english = notice.first().locator('a');
    await expect(english).toHaveAttribute('hreflang', 'en-ZA');
    await expect(english).not.toHaveAttribute('lang', /.*/);
    // Inside the English blocks, anywhere on the page (the coverage list too), no label or title
    // is Afrikaans: not the fixed labels, and none of the documents' or sections' Afrikaans titles
    // (review WP-40 integration passes 1 and 2).
    const afrikaansTitles = [...Object.values(MANIFEST.docs), ...MANIFEST.sections]
      .map((entry) => entry.titles.af)
      .filter((title): title is string => title !== undefined && title.length > 8);
    const afrikaansInBlocks = await page.evaluate(
      (titles) =>
        [...document.querySelectorAll('.st-blocks')].flatMap((node) =>
          [...titles, 'Kern: geld vir almal', 'Rol sywaarts'].filter((title) =>
            (node.textContent ?? '').includes(title),
          ),
        ),
      afrikaansTitles,
    );
    expect(afrikaansInBlocks).toEqual([]);
    // The English register on an Afrikaans page: its text is marked English, the labels are not.
    const sources = page.locator('#dsc-sources').locator('xpath=..');
    const titles = sources.locator('.st-source__title span[lang]');
    expect(await titles.count()).toBeGreaterThan(0);
    for (const lang of await titles.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('lang')),
    )) {
      expect(lang).toBe('en-ZA');
    }
    await expect(sources.locator('.st-badge').first()).not.toHaveAttribute('lang', /.*/);
    await expect(sources.locator('h2, h3').first()).not.toHaveAttribute('lang', /.*/);
    // The AI notice comes first, the translation notice directly under it (build plan D5).
    const order = await page.evaluate(() => {
      const header = document.querySelector('article > header');
      return [...(header?.querySelectorAll('.st-callout') ?? [])].map(
        (node) => node.getAttribute('data-variant') ?? '',
      );
    });
    expect(order).toEqual(['info', 'warning']);
  });
});

test.describe('navigation', () => {
  test('the header reaches every section and tool, and marks the current page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, EN);
    const menus = page.locator('.st-topbar__menus .st-menu');
    await expect(menus).toHaveCount(2);
    const sectionHrefs = await menus
      .first()
      .locator('a')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));
    expect(sectionHrefs).toEqual([
      '/business-toolkit/start/',
      '/business-toolkit/core/',
      '/business-toolkit/branding/',
      '/business-toolkit/paperwork/',
      '/business-toolkit/business-types/',
      '/business-toolkit/look-it-up/',
    ]);
    const toolHrefs = await menus
      .nth(1)
      .locator('a')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));
    expect(toolHrefs).toEqual([
      ...(WIZARD_AVAILABLE ? ['/business-toolkit/my-path/'] : []),
      '/business-toolkit/checklist/',
      '/business-toolkit/templates/',
      '/business-toolkit/glossary/',
      '/business-toolkit/sources/',
    ]);
  });

  test('a native details menu opens and closes with the keyboard alone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, EN);
    const menu = page.locator('.st-topbar__menus .st-menu').first();
    await expect(menu).not.toHaveAttribute('open', '');
    await menu.locator('summary').press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await menu.locator('summary').press('Enter');
    await expect(menu).not.toHaveAttribute('open', '');
  });

  test('the drawer opens from the menu button and closes on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await open(page, EN);
    const dialog = page.locator('dialog.st-drawer');
    await expect(dialog).toBeHidden();
    await page.locator('.st-topbar__menu-button').click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('a[href="/business-toolkit/checklist/"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('the breadcrumb ends on the current page and does not link it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, EN);
    const crumbs = page.locator('.st-breadcrumb__item');
    expect(await crumbs.count()).toBe(3);
    await expect(crumbs.last().locator('[aria-current="page"]')).toHaveCount(1);
    await expect(crumbs.last().locator('a')).toHaveCount(0);
  });

  test('the section sidebar appears from 1024px and marks the page it is on', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, EN);
    const sidebar = page.locator('nav.st-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('a[aria-current="page"]')).toHaveCount(1);
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(sidebar).toBeHidden();
  });

  test('exactly one table of contents is shown at any width', async ({ page }) => {
    await open(page, EN);
    for (const width of [320, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const shown = await page
        .locator('.st-toc')
        .evaluateAll(
          (nodes) => nodes.filter((node) => getComputedStyle(node).display !== 'none').length,
        );
      expect(shown, `${width}px`).toBe(1);
    }
  });

  test('the language switcher is plain links to the same page, and keeps the anchor', async ({
    page,
  }) => {
    await open(page, EN);
    const links = page.locator('.st-topbar__lang a');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('aria-current', 'true');
    await expect(links.nth(1)).toHaveAttribute('href', `/business-toolkit/${AF}`);

    await page.goto(`${EN}#how-much-regulation-each-type-carries`);
    await expect(links.nth(1)).toHaveAttribute(
      'href',
      `/business-toolkit/${AF}#how-much-regulation-each-type-carries`,
    );
    await links.nth(1).click();
    await expect(page).toHaveURL(`/business-toolkit/${AF}#how-much-regulation-each-type-carries`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'af-ZA');
  });

  test('the language switcher drops the anchor when the reader goes back to none', async ({
    page,
  }) => {
    await open(page, EN);
    const other = page.locator('.st-topbar__lang a').nth(1);
    await page.goto(`${EN}#how-much-regulation-each-type-carries`);
    await expect(other).toHaveAttribute('href', /#how-much-regulation-each-type-carries$/);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${EN}$`));
    await expect(other).toHaveAttribute('href', `/business-toolkit/${AF}`);
  });

  test('the footer carries the short disclaimer and the standing links', async ({ page }) => {
    await open(page, EN);
    const footer = page.locator('footer.st-footer');
    await expect(footer).toContainText('Not legal, tax or financial advice');
    const hrefs = await footer
      .locator('a')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));
    expect(hrefs).toEqual([
      '/business-toolkit/contents/',
      ...(SEARCH_AVAILABLE ? [] : ['/business-toolkit/search/']),
      '/business-toolkit/about/',
      '/business-toolkit/start/how-this-was-made/',
    ]);
  });
});

test.describe('reflow', () => {
  for (const [name, route] of [
    ['English', EN],
    ['Afrikaans', AF],
  ] as const) {
    test(`${name}: no horizontal scrolling at 320px`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, route);
      const measured = await page.evaluate(() => {
        const client = document.documentElement.clientWidth;
        /*
         * When the page does scroll sideways, name the element responsible, deepest first: hide
         * one element at a time and see whether the document stops scrolling. A bounding box
         * cannot answer this on its own — content inside a scroll region reports a right edge
         * past the viewport and is not the cause, while the element that really widens the page
         * can be 1px wide. The first cause found here was exactly that: a visually hidden
         * "(external link)" span, absolutely positioned, escaping an unpositioned scroll region.
         */
        const over: string[] = [];
        if (document.documentElement.scrollWidth > client) {
          for (const el of [...document.querySelectorAll<HTMLElement>('body *')].reverse()) {
            const previous = el.style.display;
            el.style.display = 'none';
            const fixed = document.documentElement.scrollWidth <= client;
            el.style.display = previous;
            if (!fixed) continue;
            const chain: string[] = [];
            for (let node: Element | null = el; node && node !== document.body;) {
              chain.push(`${node.tagName.toLowerCase()}.${node.className || '-'}`);
              node = node.parentElement;
            }
            over.push(chain.join(' < '));
            if (over.length >= 3) break;
          }
        }
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: client,
          over,
        };
      });
      expect(
        measured.scrollWidth,
        `element(s) that widen the page: ${measured.over.join(' | ')}`,
      ).toBeLessThanOrEqual(measured.clientWidth);
    });
  }

  /*
   * One assertion per declaration. The quantity measured is the box's own min-content width: the
   * width it is squeezed to when its container offers nothing, which is what the declaration
   * buys. Asserting the growth between a two-character word and a 27-character compound keeps the
   * test off any number that legitimate design work moves.
   *
   * Each box is measured at a width where it is on screen, and a box that measures zero fails:
   * a component hidden by a media query would otherwise satisfy this test without being tested.
   */
  test('no component this package adds is sized by its longest word', async ({ page }) => {
    await open(page, EN);
    const measured: { box: string; short: number; compound: number }[] = [];
    for (const target of SHRINK_WRAPPED) {
      await page.setViewportSize({ width: target.width, height: 900 });
      const result = await page.evaluate(
        ([item, short, compound]) => {
          // A menu inside a closed <details> renders nothing, and a box that renders nothing
          // measures the same on both words: open them, so the measurement is real.
          for (const details of document.querySelectorAll('details')) details.open = true;
          const setFirstText = (el: Element, text: string): void => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let node = walker.nextNode();
            while (node && !node.nodeValue?.trim()) node = walker.nextNode();
            if (node) node.nodeValue = text;
            else el.textContent = text;
          };
          const widest = (word: string): number => {
            let width = -1;
            for (const box of document.querySelectorAll<HTMLElement>(item.box)) {
              if (box.offsetParent === null && getComputedStyle(box).position !== 'fixed') continue;
              const slot = item.text ? box.querySelector(item.text) : box;
              if (!slot) continue;
              setFirstText(slot, word);
              const previous = box.getAttribute('style');
              box.style.inlineSize = 'min-content';
              box.style.hyphens = 'manual';
              box.style.setProperty('-webkit-hyphens', 'manual');
              width = Math.max(width, Math.ceil(box.getBoundingClientRect().width));
              if (previous === null) box.removeAttribute('style');
              else box.setAttribute('style', previous);
            }
            return width;
          };
          return { box: item.box, short: widest(short), compound: widest(compound) };
        },
        [target, SHORT_WORD, LONGEST_COMPOUND] as const,
      );
      measured.push(result);
    }

    expect(measured).toHaveLength(SHRINK_WRAPPED.length);
    for (const item of measured) {
      expect(
        item.short,
        `${item.box}: nothing visible on the page matches this selector, so nothing was measured`,
      ).toBeGreaterThan(0);
      expect(
        item.compound - item.short,
        `${item.box}: min-content ${item.short}px on "${SHORT_WORD}", ${item.compound}px on "${LONGEST_COMPOUND}" — this box is still sized by its longest word`,
      ).toBeLessThanOrEqual(WORD_LENGTH_TOLERANCE);
    }
  });
});
