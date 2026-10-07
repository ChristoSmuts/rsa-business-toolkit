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

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
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

async function expectNoBlocking(page: Page, label: string, testInfo: TestInfo): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await testInfo.attach(`axe-${label.replace(/[^a-z0-9]+/gi, '-')}.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''));
  expect(
    blocking.map((violation) => violation.id),
    `${blocking.length} serious/critical axe violation(s) with ${label}:\n` +
      formatViolations(blocking),
  ).toEqual([]);
}

/**
 * WP-30: the states a page load does not show — each confirm dialog open, the language banner, the
 * storage warning — in both themes.
 */
test.describe('axe with the interactive states open', () => {
  for (const theme of THEMES) {
    test(`the "Remove all ticks?" dialog (${theme})`, async ({ page, setTheme }, testInfo) => {
      await setTheme(theme);
      await page.goto('checklist/');
      await page.locator('st-checklist input[type="checkbox"]').first().check();
      await page.getByRole('button', { name: 'Remove ticks' }).click();
      await expect(page.getByRole('dialog', { name: 'Remove all ticks?' })).toBeVisible();
      await expectNoBlocking(page, `checklist reset dialog ${theme}`, testInfo);
    });

    test(`the "Clear all your data?" dialog (${theme})`, async ({ page, setTheme }, testInfo) => {
      await setTheme(theme);
      await page.goto('about/');
      await page.getByRole('button', { name: 'Clear all my data' }).click();
      await expect(page.getByRole('dialog', { name: 'Clear all your data?' })).toBeVisible();
      await expectNoBlocking(page, `clear data dialog ${theme}`, testInfo);
    });

    test(`a filled tax invoice and its "Clear this form?" dialog (${theme})`, async ({
      page,
      setTheme,
    }, testInfo) => {
      await setTheme(theme);
      await page.goto('templates/tax-invoice/');
      await page.getByLabel('Business name').fill('Mokoena Repairs');
      await page.getByRole('textbox', { name: 'Unit price' }).first().fill('ten');
      await page.getByRole('button', { name: 'Add line' }).click();
      await expectNoBlocking(page, `filled tax invoice ${theme}`, testInfo);
      await page.getByRole('button', { name: 'Clear form' }).click();
      await expect(page.getByRole('dialog', { name: 'Clear this form?' })).toBeVisible();
      await expectNoBlocking(page, `clear form dialog ${theme}`, testInfo);
    });

    test(`the Afrikaans quotation on a phone, preview tab (${theme})`, async ({
      page,
      setTheme,
    }, testInfo) => {
      await setTheme(theme);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('af/templates/quotation/');
      await page.getByRole('tab', { name: 'Voorskou' }).click();
      await expect(page.locator('.st-tsheet')).toBeVisible();
      await expectNoBlocking(page, `af quotation preview ${theme}`, testInfo);
    });

    test(`the language banner and the storage warning (${theme})`, async ({
      page,
      setTheme,
      seedStorage,
    }, testInfo) => {
      await setTheme(theme);
      await seedStorage({ 'st.lang': 'af' });
      await page.goto('./');
      await expect(page.locator('st-lang-banner')).toBeVisible();
      await expectNoBlocking(page, `language banner ${theme}`, testInfo);

      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            throw new DOMException('The operation is insecure.', 'SecurityError');
          },
        });
      });
      await page.goto('checklist/');
      await expect(page.locator('st-storage-notice:not([data-show])')).toBeVisible();
      await expectNoBlocking(page, `storage warning ${theme}`, testInfo);
    });
  }
});

/**
 * WP-31: what only answers or JavaScript show — each wizard step, My path with its steps and
 * checklist, the "Remove your answers?" dialog, and a document with "Only what applies to me" on
 * and a section collapsed into its marker — in both themes.
 */
test.describe('axe on Find my path and My path', () => {
  const PROFILE = { entity: 'sole-prop', businessTypes: ['food', 'general'], stage: 'trading' };

  for (const theme of THEMES) {
    test(`every wizard step (${theme})`, async ({ page, setTheme }, testInfo) => {
      await setTheme(theme);
      await page.goto('find-my-path/');
      await expectNoBlocking(page, `wizard step 1 ${theme}`, testInfo);
      await page.getByRole('radio', { name: /sole proprietor/ }).check();
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('heading', { name: /Question 2 of 3/ })).toBeFocused();
      await expectNoBlocking(page, `wizard step 2 ${theme}`, testInfo);
      await page.getByRole('checkbox', { name: /Food business/ }).check();
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('heading', { name: /Question 3 of 3/ })).toBeFocused();
      await expectNoBlocking(page, `wizard step 3 ${theme}`, testInfo);
    });

    test(`My path and the "Remove your answers?" dialog (${theme})`, async ({
      page,
      setTheme,
      seedStorage,
    }, testInfo) => {
      await setTheme(theme);
      await seedStorage({
        'st.profile.v1': PROFILE,
        'st.path.v1': { 'lookup/checklist': '2026-10-01T10:00:00.000Z' },
      });
      await page.goto('my-path/');
      await expect(page.locator('[data-dashboard]')).toBeVisible();
      await expectNoBlocking(page, `my path ${theme}`, testInfo);
      await page.getByRole('button', { name: 'Remove my answers' }).click();
      await expect(page.getByRole('dialog', { name: 'Remove your answers?' })).toBeVisible();
      await expectNoBlocking(page, `my path reset dialog ${theme}`, testInfo);
    });

    test(`a document with "Only what applies to me" on (${theme})`, async ({
      page,
      setTheme,
      seedStorage,
    }, testInfo) => {
      await setTheme(theme);
      await seedStorage({ 'st.profile.v1': PROFILE, 'st.onlyMine': true });
      await page.goto('core/tax-and-sars/');
      await expect(
        page.locator('[data-marker-for="what-sars-wants-from-a-company"]'),
      ).toBeVisible();
      await expectNoBlocking(page, `only what applies ${theme}`, testInfo);
      await page.goto('checklist/');
      await page.getByRole('radio', { name: 'Only what applies to me' }).check();
      await expect(page.locator('.st-tasklist__hidden:visible').first()).toBeVisible();
      await expectNoBlocking(page, `checklist only mine ${theme}`, testInfo);
    });
  }
});

const { routes, skipReason } = discoverPageRoutes();

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
