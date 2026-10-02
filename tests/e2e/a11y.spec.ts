import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test, type Theme } from './fixtures';
import { discoverPageRoutes, routeLabel, routeUrl } from './helpers/routes';

/**
 * axe on every page route (sitemap plus noindex pages) in light and dark themes.
 * Serious and critical violations fail the test; moderate and minor ones become annotations.
 * The full axe JSON is attached to every test (see docs/testing.md).
 */

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
type Violation = AxeResults['violations'][number];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const BLOCKING_IMPACTS: ReadonlySet<string> = new Set(['serious', 'critical']);
const THEMES: readonly Theme[] = ['light', 'dark'];
const MAX_TARGETS = 3;

function formatTarget(target: unknown): string {
  if (!Array.isArray(target)) return String(target);
  return target
    .map((part) => (Array.isArray(part) ? part.join(' >>> ') : String(part)))
    .join(' | ');
}

function formatViolations(violations: readonly Violation[]): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, MAX_TARGETS)
        .map((node) => `      ${formatTarget(node.target)}`);
      const more = violation.nodes.length - MAX_TARGETS;
      if (more > 0) targets.push(`      ... and ${more} more`);
      return [
        `  - ${violation.id} [${violation.impact ?? 'unknown'}] ${violation.help}`,
        `    ${violation.helpUrl}`,
        ...targets,
      ].join('\n');
    })
    .join('\n');
}

function attachmentName(route: string, theme: Theme): string {
  const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
  return `axe-${theme}-${slug}.json`;
}

const { routes, skipReason } = discoverPageRoutes();

async function analyse(page: Page, testInfo: TestInfo, name: string, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await testInfo.attach(name, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''));
  for (const violation of results.violations.filter((v) => !blocking.includes(v))) {
    testInfo.annotations.push({
      type: `a11y-${violation.impact ?? 'unknown'}`,
      description: `${violation.id}: ${violation.help} (${violation.nodes.length} node(s)) ${violation.helpUrl}`,
    });
  }
  expect(
    blocking.map((violation) => violation.id),
    `${blocking.length} serious/critical axe violation(s) on ${label}:\n` +
      formatViolations(blocking),
  ).toEqual([]);
}

/**
 * The search dialog (WP-33), open, in both states a reader sees: the common questions, and a list
 * of results with one active. In both themes and both languages.
 */
test.describe('axe with the search dialog open', () => {
  for (const theme of THEMES) {
    for (const route of ['core/register/', 'af/business-types/vehicle-dealer/']) {
      test(`${theme} theme: /${route}`, async ({ page, setTheme }, testInfo) => {
        await setTheme(theme);
        const response = await page.goto(routeUrl(route));
        expect(response?.status(), 'HTTP status').toBe(200);
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        await page.keyboard.press('/');
        const dialog = page.locator('dialog.st-search-dialog');
        await expect(dialog).toBeVisible();
        await analyse(page, testInfo, attachmentName(`${route}-empty`, theme), `/${route} (empty)`);

        await page.getByRole('combobox').fill('VAT264');
        await expect(page.getByRole('option').first()).toBeVisible();
        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
        await analyse(
          page,
          testInfo,
          attachmentName(`${route}-results`, theme),
          `/${route} (results)`,
        );
      });
    }
  }
});

// The per-test timeout comes from the a11y project in playwright.config.ts (PW_A11Y_TIMEOUT).
test.describe('axe WCAG 2.1 A/AA', () => {
  if (skipReason) {
    test('route discovery', () => test.skip(true, skipReason));
    return;
  }

  for (const theme of THEMES) {
    test.describe(`${theme} theme`, () => {
      for (const route of routes) {
        test(routeLabel(route), async ({ page, setTheme }, testInfo) => {
          await setTheme(theme);
          const response = await page.goto(routeUrl(route));
          expect(response?.status(), 'HTTP status').toBe(200);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
          // The site's theme script may run after the first check; contrast depends on the theme.
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

          const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
          await testInfo.attach(attachmentName(route, theme), {
            body: JSON.stringify(results, null, 2),
            contentType: 'application/json',
          });

          const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''));
          for (const violation of results.violations.filter((v) => !blocking.includes(v))) {
            testInfo.annotations.push({
              type: `a11y-${violation.impact ?? 'unknown'}`,
              description: `${violation.id}: ${violation.help} (${violation.nodes.length} node(s)) ${violation.helpUrl}`,
            });
          }

          expect(
            blocking.map((violation) => violation.id),
            `${blocking.length} serious/critical axe violation(s) on ${routeLabel(route)} (${theme}):\n` +
              formatViolations(blocking),
          ).toEqual([]);
        });
      }
    });
  }
});
