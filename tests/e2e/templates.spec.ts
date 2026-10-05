import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { REPO_ROOT } from './helpers/routes';

/**
 * WP-32: the fillable templates on the built site (projects chromium, webkit and mobile).
 *
 * Filling binds the preview, totals are worked out in cents with VAT on the line total, a reload
 * keeps the draft, Clear asks first, Start next moves the number on, Print calls `window.print()`
 * and, under print media, only the sheet is laid out. The Afrikaans twin fills the same way. The
 * no-JavaScript side is in `nojs.spec.ts`; axe with the dialog open and a filled form is in
 * `a11y.spec.ts`.
 */

interface Dictionary {
  templates: {
    clearDone: string;
    clearConfirm: { title: string; confirm: string; cancel: string };
    fillIn: string;
    preview: string;
    allPresent: string;
    print: string;
    clear: string;
    addLine: string;
    items: Record<string, { startNext?: string }>;
  };
}
const dictionary = (lang: 'en' | 'af'): Dictionary =>
  JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'src', 'i18n', `${lang}.json`), 'utf8'),
  ) as Dictionary;
const en = dictionary('en');
const af = dictionary('af');
const NBSP = ' ';
const KEY = 'st.template.tax-invoice.v1';

const sheet = (page: Page) => page.locator('.st-tsheet');
const stored = (page: Page, key = KEY) =>
  page.evaluate((name) => window.localStorage.getItem(name), key);

/** On a phone the form and the preview are tabs; on a desktop both show. */
async function showPreview(page: Page, label = en.templates.preview): Promise<void> {
  const tab = page.getByRole('tab', { name: label });
  if (await tab.isVisible()) await tab.click();
}
async function showForm(page: Page, label = en.templates.fillIn): Promise<void> {
  const tab = page.getByRole('tab', { name: label });
  if (await tab.isVisible()) await tab.click();
}

test.describe('the tax invoice', () => {
  test('fills the preview, works out VAT on the line total, and keeps the draft on reload', async ({
    page,
  }) => {
    await page.goto('templates/tax-invoice/');
    await expect(page.locator('st-template-form')).toBeVisible();
    // Nothing is written by a visit alone.
    expect(await stored(page)).toBeNull();

    await page.getByLabel('Business name').fill('Mokoena Repairs');
    await page.getByLabel('VAT Registration Number').fill('4123456789');
    await page.getByLabel('Date of issue').fill('2026-10-05');
    await page.getByRole('textbox', { name: 'Description' }).first().fill('Washers');
    await page.getByRole('textbox', { name: 'Qty' }).first().fill('3');
    await page.getByRole('textbox', { name: 'Unit price' }).first().fill('0.35');
    await page.getByRole('button', { name: en.templates.addLine }).click();
    await expect(page.getByRole('textbox', { name: 'Description' }).nth(1)).toBeFocused();
    await page.getByRole('textbox', { name: 'Description' }).nth(1).fill('Call-out');
    await page.getByRole('textbox', { name: 'Unit price' }).nth(1).fill('450');

    const totals = page.locator('[data-totals]');
    await expect(totals.locator('[data-total="subtotal"]')).toHaveText(`R${NBSP}451.05`);
    await expect(totals.locator('[data-total="vat"]')).toHaveText(`R${NBSP}67.66`);
    await expect(totals.locator('[data-total="total"]')).toHaveText(`R${NBSP}518.71`);
    await expect(totals).toHaveAttribute('aria-live', 'polite');

    await showPreview(page);
    await expect(sheet(page).locator('[data-field="businessName"]')).toHaveText('Mokoena Repairs');
    await expect(sheet(page).locator('[data-field="vatNumber"]')).toHaveText('4123456789');
    await expect(sheet(page).locator('[data-field="intro.5:r1"]')).toHaveText('5 October 2026');
    await expect(sheet(page).locator('tfoot [data-total="total"]')).toHaveText(`R${NBSP}518.71`);
    await expect(sheet(page).locator('.st-tsheet__lines tbody tr:not([hidden])')).toHaveCount(2);
    await expect(sheet(page).locator('.st-tsheet__title')).toHaveText('TAX INVOICE');

    await page.reload();
    await showForm(page);
    await expect(page.getByLabel('Business name')).toHaveValue('Mokoena Repairs');
    await expect(page.getByRole('textbox', { name: 'Description' }).nth(1)).toHaveValue('Call-out');
    await expect(page.locator('[data-totals] [data-total="total"]')).toHaveText(`R${NBSP}518.71`);
    const draft = JSON.parse((await stored(page)) ?? '{}') as { lines: unknown[] };
    expect(draft.lines).toHaveLength(2);
  });

  test('counts required items softly and links each missing one', async ({ page }) => {
    await page.goto('templates/tax-invoice/');
    const count = page.locator('[data-required-count]');
    // The invoice number has a default, and the payment reference follows it.
    await expect(count).toHaveText('2 of 15 required items present');
    await page.getByLabel('Business name').fill('Mokoena Repairs');
    await expect(count).toHaveText('3 of 15 required items present');
    const missing = page.locator('[data-missing] li:not([hidden]) a');
    await expect(missing.first()).toHaveText('Physical address');
    await missing.first().click();
    await expect(page.getByLabel('Physical address', { exact: true })).toBeFocused();
    // Soft: printing is never blocked.
    await expect(page.getByRole('button', { name: en.templates.print })).toBeEnabled();
  });

  test('Clear asks first, then empties the form and the draft', async ({ page }) => {
    await page.goto('templates/tax-invoice/');
    await page.getByLabel('Customer name').fill('Thandi');
    const clear = page.getByRole('button', { name: en.templates.clear });
    await clear.click();
    const dialog = page.getByRole('dialog', { name: en.templates.clearConfirm.title });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: en.templates.clearConfirm.cancel }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(clear).toBeFocused();
    await expect(page.getByLabel('Customer name')).toHaveValue('Thandi');

    await clear.click();
    await dialog.getByRole('button', { name: en.templates.clearConfirm.confirm }).click();
    await expect(page.getByLabel('Customer name')).toHaveValue('');
    await expect(page.getByLabel('Invoice number')).toHaveValue('INV-0001');
    await expect(page.locator('[data-announce]')).toHaveText(en.templates.clearDone);
    expect(await stored(page)).toBeNull();
  });

  test('Start next keeps business and bank details and uses the next number', async ({ page }) => {
    await page.goto('templates/tax-invoice/');
    await page.getByLabel('Business name').fill('Mokoena Repairs');
    await page.getByLabel('Bank', { exact: true }).fill('FNB');
    await page.getByLabel('Customer name').fill('Thandi');
    await page.getByLabel('Invoice number').fill('INV-0041');
    await page.getByRole('button', { name: en.templates.items['tax-invoice']?.startNext }).click();
    await expect(page.getByLabel('Invoice number')).toHaveValue('INV-0042');
    await expect(page.getByLabel('Business name')).toHaveValue('Mokoena Repairs');
    await expect(page.getByLabel('Bank', { exact: true })).toHaveValue('FNB');
    await expect(page.getByLabel('Customer name')).toHaveValue('');
    await expect(page.locator('[data-announce]')).toHaveText('Tax invoice INV-0042 started.');
    // The payment reference follows the new number.
    await showPreview(page);
    await expect(sheet(page).locator('[data-field="payment-details.1:r4"]')).toHaveText('INV-0042');
  });

  test('Print calls window.print, and print media lays out only the sheet', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { printed: number }).printed = 0;
      window.print = () => {
        (window as unknown as { printed: number }).printed++;
      };
    });
    await page.goto('templates/tax-invoice/');
    await page.getByLabel('Business name').fill('Mokoena Repairs');
    await page.getByRole('button', { name: en.templates.print }).click();
    expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);

    // The preview tab is not chosen: on a phone the sheet must still print.
    await page.emulateMedia({ media: 'print' });
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).locator('[data-field="businessName"]')).toHaveText('Mokoena Repairs');
    for (const hidden of [
      'body > header',
      'body > footer',
      '.st-ai-notice',
      'form.st-tform',
      '.st-tool__actions',
      '.st-tool__required',
      '#sources-for-this-page',
      '.st-tool__heading',
    ]) {
      await expect(page.locator(hidden).first(), hidden).toBeHidden();
    }
    // The sheet uses the page width, not a column of the screen layout.
    const width = await sheet(page).evaluate((element) => element.getBoundingClientRect().width);
    const viewport = page.viewportSize()?.width ?? 0;
    expect(width).toBeGreaterThan(viewport * 0.8);
    const pdf = await page.pdf({ format: 'A4' }).catch(() => undefined);
    if (pdf) expect(pdf.byteLength).toBeGreaterThan(1000);
  });

  test('a price that is not a number is marked and explained', async ({ page }) => {
    await page.goto('templates/tax-invoice/');
    const price = page.getByRole('textbox', { name: 'Unit price' }).first();
    await price.fill('ten');
    await expect(price).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#st-tf-lines-0-unitPrice-error')).toBeVisible();
    await price.fill('10');
    await expect(price).not.toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('the other templates', () => {
  test('a quotation adds no VAT, and its lists print one item per line', async ({ page }) => {
    await page.goto('templates/quotation/');
    await page.getByRole('textbox', { name: 'Description' }).first().fill('Paint the stoep');
    await page.getByRole('textbox', { name: 'Unit price' }).first().fill('1 200,50');
    await expect(page.locator('[data-totals] [data-total-row]')).toHaveCount(1);
    await expect(page.locator('[data-totals] [data-total="total"]')).toHaveText(
      `R${NBSP}1${NBSP}200.50`,
    );
    await page.getByRole('textbox', { name: 'What is included' }).fill('Two coats\nPrimer');
    await showPreview(page);
    await expect(sheet(page).locator('[data-list="what-is-included.1"] li')).toHaveText([
      'Two coats',
      'Primer',
    ]);
  });

  test('a receipt formats an amount and keeps its own number', async ({ page }) => {
    await page.goto('templates/receipt/');
    await page.getByLabel('Amount received').fill('2500');
    await page.getByLabel('Receipt number').fill('REC-0003');
    await showPreview(page);
    await expect(sheet(page).locator('[data-field="intro.4:r3"]')).toHaveText(
      `R${NBSP}2${NBSP}500.00`,
    );
    await showForm(page);
    await page.getByRole('button', { name: en.templates.items.receipt?.startNext }).click();
    await expect(page.getByLabel('Receipt number')).toHaveValue('REC-0004');
    expect(await stored(page, 'st.template.receipt.v1')).toContain('REC-0004');
  });

  test('the privacy notice starts with the template lines and has no Start next', async ({
    page,
  }) => {
    await page.goto('templates/privacy-notice/');
    await expect(page.getByRole('textbox', { name: 'What we collect' })).toHaveValue(
      /^Your name\n/,
    );
    await expect(page.locator('[data-start-next]')).toHaveCount(0);
    expect(await stored(page, 'st.template.privacy-notice.v1')).toBeNull();
  });

  test('the Afrikaans tax invoice fills the same draft, in Afrikaans', async ({ page }) => {
    await page.goto('templates/tax-invoice/');
    await page.getByLabel('Business name').fill('Mokoena Herstelwerk');
    await page.goto('af/templates/tax-invoice/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'af-ZA');
    await expect(page.getByLabel('Besigheidsnaam')).toHaveValue('Mokoena Herstelwerk');
    await page.getByRole('textbox', { name: 'Beskrywing' }).first().fill('Werk');
    await page.getByRole('textbox', { name: 'Eenheidsprys' }).first().fill('100');
    await expect(page.locator('[data-totals] [data-total="total"]')).toHaveText(`R${NBSP}115.00`);
    await showPreview(page, af.templates.preview);
    // The heading is whatever the Afrikaans template says (docs/reviews/WP-40-owner-items.md).
    await expect(sheet(page).locator('.st-tsheet__title')).toHaveText('BELASTINGFAKTUUR');
    await expect(sheet(page).locator('[data-field="intro.5:r1"]')).toHaveText('[DD Maand JJJJ]');
  });
});

test.describe('the templates index', () => {
  test('says the templates can be filled in and links each one', async ({ page }) => {
    await page.goto('templates/');
    await expect(page.locator('.st-lead')).toHaveText(
      'Fill in a form, check the page, then print it or save it as a PDF.',
    );
    await page.getByRole('link', { name: 'Tax invoice' }).click();
    await expect(page.locator('st-template-form')).toBeVisible();
  });
});
