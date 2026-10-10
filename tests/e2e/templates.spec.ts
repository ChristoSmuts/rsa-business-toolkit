import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { allowConsoleError, expect, test } from './fixtures';
import { holdModules, routeSameOrigin } from './helpers/network';
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
/** Pages in a PDF Playwright rendered. */
const pdfPages = (pdf: Buffer): number =>
  (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

/** The `content` of an element's `::before`, as the current media computes it. */
const beforeContent = (locator: ReturnType<Page['locator']>): Promise<string> =>
  locator.evaluate((element) => getComputedStyle(element, '::before').content);

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
    // The buttons show from first paint; wait until the element has connected (it writes the
    // count), as a reader would see the count before pressing Clear on a loaded phone.
    await expect(page.locator('[data-required-count]')).not.toBeEmpty();
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
    await page
      .getByRole('button', { name: en.templates.items['tax-invoice']?.startNext ?? '' })
      .click();
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
    // Exactly one sheet prints (review WP-32 pass 1, major 1).
    await expect(page.locator('[data-print-sheet]')).toHaveCount(1);
    await expect(page.locator('[data-print-sheet]')).toHaveClass(/st-tsheet/);
    // An empty slot prints a blank line, not its sample (major 2).
    const customer = sheet(page).locator('[data-field="to.1:0"]');
    await expect(customer).toHaveText('');
    expect(await beforeContent(customer)).toBe('""');
    expect(await sheet(page).innerText()).not.toContain('[');
    const pdf = await page.pdf({ format: 'A4' }).catch(() => undefined);
    if (pdf) expect(pdf.byteLength).toBeGreaterThan(1000);
  });

  test('a huge amount is refused, never breaks the page, and a reload still works', async ({
    page,
  }) => {
    await page.goto('templates/tax-invoice/');
    await page.getByRole('textbox', { name: 'Description' }).first().fill('Huge');
    await page.getByRole('textbox', { name: 'Qty' }).first().fill('1000000');
    const price = page.getByRole('textbox', { name: 'Unit price' }).first();
    await price.fill('100000');
    await expect(price).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#st-tf-lines-0-unitPrice-error')).toContainText('The most is R');
    await expect(page.locator('[data-totals-blocked]')).toBeVisible();
    // The reason is inside the live totals region, so it is heard (review pass 2, nit 5).
    await expect(page.locator('[data-totals] [data-totals-blocked]')).toBeVisible();
    await page.reload();
    await showForm(page);
    await page.getByLabel('Customer name').fill('Still saved');
    expect(await stored(page)).toContain('Still saved');
    await page.getByRole('button', { name: en.templates.clear }).click();
    await expect(page.getByRole('dialog', { name: en.templates.clearConfirm.title })).toBeVisible();
  });

  test('an ambiguous amount is refused with a message, never read as R 1.50', async ({ page }) => {
    await page.goto('templates/receipt/');
    const amount = page.getByLabel('Amount received');
    await amount.fill('1.500');
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#st-tf-intro-4-r3-error')).toContainText('two different amounts');
    await amount.fill('1.500,50');
    await expect(amount).not.toHaveAttribute('aria-invalid', 'true');
    await showPreview(page);
    await expect(sheet(page).locator('[data-field="intro.4:r3"]')).toHaveText(
      `R${NBSP}1${NBSP}500.50`,
    );
  });

  test('the customer VAT number follows the template rule over R5,000, and prints labelled', async ({
    page,
  }) => {
    await page.goto('templates/tax-invoice/');
    const vatItem = page.locator('[data-required-item="to.1:2"]');
    // The form states the template's condition, not "(optional)".
    const label = page.locator('label[for="st-tf-to-1-2"]');
    await expect(label).not.toContainText('(optional)');
    await expect(page.locator('#st-tf-to-1-2-hint')).toContainText(
      'required on invoices over R5,000',
    );
    await page.getByRole('textbox', { name: 'Description' }).first().fill('Geyser');
    await page.getByRole('textbox', { name: 'Unit price' }).first().fill('100');
    await expect(vatItem).toBeHidden();
    await page.getByRole('textbox', { name: 'Unit price' }).first().fill('9000');
    await expect(vatItem).toContainText('if they are a vendor');
    await expect(page.locator('[data-required-count]')).not.toHaveText(en.templates.allPresent);
    await page.getByLabel('Customer VAT number').fill('4987654321');
    await showPreview(page);
    await expect(sheet(page)).toContainText('Customer VAT number: 4987654321');
  });

  test('on a phone, a missing item link leaves the Preview tab and focuses its field', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('templates/tax-invoice/');
    await page.getByRole('tab', { name: en.templates.preview }).click();
    await expect(page.locator('form.st-tform')).toBeHidden();
    const link = page.locator('[data-missing] li:not([hidden]) a').first();
    await link.click();
    await expect(page.getByRole('tab', { name: en.templates.fillIn })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByLabel('Business name')).toBeFocused();
    // Each link is a full target, however short its text (pass 1, minor 6).
    const widths = await page
      .locator('[data-missing] li:not([hidden]) a')
      .evaluateAll((links) => links.map((a) => a.getBoundingClientRect().width));
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(44);
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

  test('an empty receipt slot prints blank, never its sample value (review pass 1, major 2)', async ({
    page,
  }) => {
    await page.goto('templates/receipt/');
    await page.getByLabel('Business name').fill('Mokoena Repairs');
    await page.getByLabel('Amount received').fill('2500');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-print-sheet]')).toHaveCount(1);
    const printed = await sheet(page).innerText();
    expect(printed).toContain('REC-0001');
    expect(printed).not.toContain('INV-0001');
    expect(printed).not.toContain(`R${NBSP}0.00`);
    expect(printed).not.toContain('[');
    for (const name of ['intro.4:r5', 'intro.4:r6', 'intro.4:r2']) {
      const slot = sheet(page).locator(`[data-field="${name}"]`);
      await expect(slot).toHaveText('');
      expect(await beforeContent(slot), name).toBe('""');
    }
    // On screen the slot still shows the template's words.
    await page.emulateMedia({ media: 'screen' });
    expect(await beforeContent(sheet(page).locator('[data-field="intro.4:r5"]'))).toBe(
      '"INV-0001"',
    );
  });

  test('a quotation prints no stray space after a slot', async ({ page }) => {
    await page.goto('templates/quotation/');
    await page.getByLabel('Deposit of …% before work starts.').fill('50');
    await page.getByLabel('This quote is valid for … days.').fill('30');
    await showPreview(page);
    const text = await sheet(page).innerText();
    expect(text).toContain('Deposit of 50% before work starts.');
    expect(text).toContain('valid for 30 days.');
    // An empty slot is blank text (its sample is CSS only), so only filled slots are checked.
    expect(text).not.toMatch(/50 %|30 days ?\s+\./);
    // Keeping tables together is checked on the printed sections (review pass 2, minor 1).
    // Line amounts are not live regions of their own; the totals region speaks (nit 1).
    await expect(page.locator('.st-tline output, .st-ttotals output')).toHaveCount(0);
  });

  test('a privacy notice paragraph can be left out of the document', async ({ page }) => {
    await page.goto('templates/privacy-notice/');
    const marketing = page.locator('#marketing');
    await marketing.getByRole('checkbox').check();
    await showPreview(page);
    await expect(sheet(page).locator('[data-block="marketing.1"]')).toBeHidden();
    await page.reload();
    await showForm(page);
    await expect(page.locator('#marketing').getByRole('checkbox')).toBeChecked();
    await page.emulateMedia({ media: 'print' });
    const printed = await sheet(page).innerText();
    expect(printed).not.toContain('marketing messages');
    // Its heading goes with it, and the next section follows (review pass 2, minor 5).
    expect(printed).not.toMatch(/^Marketing$/m);
    expect(printed).toContain('Your rights');
  });

  test('a section whose text is left out and whose list is empty does not print (review pass 3, minor 1)', async ({
    page,
  }) => {
    await page.goto('templates/privacy-notice/');
    await expect(page.locator('[data-required-count]')).not.toBeEmpty();
    const section = page.locator('#who-we-share-it-with');
    await section.getByRole('checkbox').check();
    await section.getByRole('textbox').fill('');
    await page.emulateMedia({ media: 'print' });
    const printed = await sheet(page).innerText();
    expect(printed).not.toContain('Who we share it with');
    expect(printed).toContain('How long we keep it');
  });

  test('Start next on an invoice keeps the late-payment terms and the left-out line (review pass 3, nit 5)', async ({
    page,
  }) => {
    await page.goto('templates/invoice/');
    await expect(page.locator('[data-required-count]')).not.toBeEmpty();
    const terms = page.getByLabel('State your late payment terms here');
    await terms.fill('Interest at 2% a month after 30 days.');
    const leaveOut = page.locator('#payment-details').getByRole('checkbox');
    await leaveOut.check();
    await page.getByLabel('Customer name').fill('Thandi');
    await page.getByRole('button', { name: en.templates.items.invoice?.startNext ?? '' }).click();
    await expect(page.getByLabel('Invoice number')).toHaveValue('INV-0002');
    await expect(terms).toHaveValue('Interest at 2% a month after 30 days.');
    await expect(leaveOut).toBeChecked();
    await expect(page.getByLabel('Customer name')).toHaveValue('');
  });

  for (const [lang, word, sentenceEnd] of [
    ['', 'Official', 'at inforegulator.org.za.'],
    ['af/', 'Amptelik', 'by inforegulator.org.za kla.'],
  ] as const) {
    test(`a printed privacy notice carries no site badge (${word}) (review pass 2, minor 4)`, async ({
      page,
    }) => {
      await page.goto(`${lang}templates/privacy-notice/`);
      await page.emulateMedia({ media: 'print' });
      const printed = await sheet(page).innerText();
      expect(printed).toContain('inforegulator.org.za');
      expect(printed).not.toContain(word);
      // The sentence runs on from the link, with no space or hidden text where the badge was
      // (review pass 3, nit 1).
      expect(printed).toContain(sentenceEnd);
    });
  }

  test('a field keeps up to the draft limit and says so when a paste is cut (review pass 2 minor 2, pass 3 nit 3)', async ({
    page,
  }) => {
    await page.goto('templates/quotation/');
    const included = page.getByRole('textbox', { name: 'What is included' });
    await expect(included).toHaveAttribute('maxlength', '5000');
    await expect(page.getByLabel('Customer name')).toHaveAttribute('maxlength', '5000');
    const long = 'Two coats of paint on every wall\n'.repeat(200);
    await included.fill(long);
    const kept = await included.inputValue();
    expect(kept.length).toBe(5000);
    await expect(
      page.locator('[data-field-wrap="what-is-included.1"] [data-too-long]'),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'What is included' })).toHaveValue(kept);
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
    await page.getByRole('button', { name: en.templates.items.receipt?.startNext ?? '' }).click();
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
    await expect(sheet(page).locator('[data-field="intro.5:r1"]')).toHaveAttribute(
      'data-sample',
      '[DD Maand JJJJ]',
    );
  });
});

test.describe('what fits on a printed page (review pass 2, minor 1)', () => {
  test('a quotation with three lines prints on one A4 sheet', async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName !== 'chromium' || testInfo.project.name !== 'chromium',
      'page.pdf is Chromium desktop only',
    );
    await page.goto('templates/quotation/');
    await expect(page.locator('[data-required-count]')).not.toBeEmpty();
    await page.getByLabel('Business name').fill('Mokoena Repairs');
    for (let index = 0; index < 3; index++) {
      await page
        .getByRole('textbox', { name: 'Description' })
        .nth(index)
        .fill(`Room ${index + 1}`);
      await page.getByRole('textbox', { name: 'Unit price' }).nth(index).fill('1 200');
    }
    await page
      .getByRole('textbox', { name: 'What is included' })
      .fill('Two coats\nPrimer\nCleaning');
    await page
      .getByRole('textbox', { name: 'What is NOT included' })
      .fill('Ceilings\nDoors\nMoving furniture');
    await page.emulateMedia({ media: 'print' });
    expect(pdfPages(await page.pdf({ format: 'A4' }))).toBe(1);
  });

  test('each section of the sheet keeps together when printed', async ({ page }) => {
    await page.goto('templates/tax-invoice/');
    await page.emulateMedia({ media: 'print' });
    const sections = sheet(page).locator('.st-tsheet__section');
    expect(await sections.count()).toBeGreaterThan(3);
    const breaks = await sections.evaluateAll((all) =>
      all.map((section) => [
        getComputedStyle(section).display,
        getComputedStyle(section).breakInside,
      ]),
    );
    expect(new Set(breaks.map((pair) => pair.join(' ')))).toEqual(new Set(['block avoid']));
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

/**
 * WP-50a, item 4: above the form the page says how to use the form. The markdown's "make a copy,
 * rename it… replace everything in [SQUARE BRACKETS], then export to PDF" is for the file, and a
 * first-time reader looked for a file to copy (WP-50 audit, flow 5).
 */
test.describe('the line above the form', () => {
  const FILE_WORDS =
    /SQUARE BRACKETS|VIERKANTIGE HAKIES|make a copy|maak ’n afskrif|export to PDF|na PDF uit/i;
  const howTo = (lang: 'en' | 'af') =>
    JSON.parse(readFileSync(path.join(REPO_ROOT, 'src', 'i18n', `${lang}.json`), 'utf8')) as {
      templates: { items: Record<string, { formHowTo?: string }> };
    };
  for (const lang of ['en', 'af'] as const) {
    for (const slug of ['quotation', 'invoice', 'tax-invoice', 'receipt', 'privacy-notice']) {
      test(`${lang} ${slug}: no instruction about a file, and the form's own line`, async ({
        page,
      }) => {
        await page.goto(`${lang === 'en' ? '' : 'af/'}templates/${slug}/`);
        const article = page.locator('article[data-kind="template"]');
        const above = await article.evaluate((element) => {
          const tool = element.querySelector('st-template-form');
          const texts: string[] = [];
          for (const block of element.querySelectorAll('.st-blocks > *')) {
            if (tool && tool.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_PRECEDING) {
              texts.push(block.textContent ?? '');
            }
          }
          return texts.join('\n');
        });
        expect(above).not.toMatch(FILE_WORDS);
        // The lead and the meta description too (review pass 1, M4).
        const lead = (await article.locator('.st-lead').first().textContent()) ?? '';
        const meta = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
        for (const text of [lead, meta]) {
          expect(text).not.toMatch(FILE_WORDS);
          expect(text).not.toContain('[');
        }
        const line = howTo(lang).templates.items[slug]?.formHowTo;
        if (line) {
          await expect(article.locator('.st-note-line', { hasText: line })).toBeVisible();
          // The summary just above does not say its first sentence again (review pass 2, m4).
          const first = lead.trim().split(/(?<=[.!?])\s/)[0] ?? '';
          if (first) expect(line, 'repeats the summary').not.toContain(first);
        } else {
          await expect(article.locator('.st-note-line')).toHaveCount(0);
        }
      });
    }
  }
});

/**
 * WP-50a, item 2: the Fill in / Preview tabs showed about 8 s before the form's script on a slow
 * phone, and a tap on Preview was lost (WP-50 audit, flow 5). Until `<st-template-form>` is ready
 * the page is the no-JavaScript form, and the tabs keep their room without showing.
 */
test.describe('a template before its script runs', () => {
  test('shows no tabs while the module is held, then the tabs take their room with nothing moving', async ({
    page,
    baseURL,
  }) => {
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.assign(window, { stShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          shifts.push((entry as PerformanceEntry & { value: number }).value);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.setViewportSize({ width: 412, height: 900 });
    const release = await holdModules(page, baseURL);
    await page.goto('templates/invoice/', { waitUntil: 'commit' });
    const form = page.locator('form.st-tform');
    await expect(form).toBeVisible();
    await page.waitForTimeout(3000);
    expect(await page.evaluate(() => customElements.get('st-template-form') === undefined)).toBe(
      true,
    );
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.locator('.st-tool__tabs')).toBeHidden();
    await expect(page.locator('.st-tool__preview')).toBeHidden();
    // The buttons are not there to tap; their room says they are coming (review pass 10, M1).
    await expect(page.locator('.st-tool__actions [data-print]')).toBeHidden();
    await expect(page.getByText('Loading the form tools…')).toBeVisible();
    await expect(page.locator('.st-tool__required')).toBeVisible();
    await expect(page.getByText('To print, use your browser’s Print command.')).toBeVisible();
    const name = page.getByLabel('Customer name');
    await name.fill('Thandi');
    // Scrolled to the form, where a jump would be seen.
    await form.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    const before = await form.boundingBox();

    release();
    await expect(page.locator('st-template-form')).toHaveAttribute('data-ready', '');
    await expect(page.getByRole('tab', { name: en.templates.preview })).toBeVisible();
    await expect(page.getByText('Loading the form tools…')).toBeHidden();
    await expect(name).toHaveValue('Thandi');
    const after = await form.boundingBox();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThanOrEqual(1);
    const shift = await page.evaluate(() =>
      (window as unknown as { stShifts: number[] }).stShifts.reduce((sum, value) => sum + value, 0),
    );
    expect(shift).toBeLessThanOrEqual(0.1);
    await page.getByRole('tab', { name: en.templates.preview }).click();
    await expect(page.locator('.st-tool__preview')).toBeVisible();
    await expect(sheet(page)).toContainText('Thandi');
  });

  // Review pass 10, M1: the rooms kept for the required items and the actions left 727 to 1,542px
  // of blank page under the form before the script. Before the script, no vertical run inside the
  // template tool is without something to see for more than 120px.
  for (const lang of ['en', 'af'] as const) {
    for (const slug of ['quotation', 'invoice', 'tax-invoice', 'receipt', 'privacy-notice']) {
      test(`${lang} ${slug}: before the script, no blank run over 120px in the tool`, async ({
        page,
        baseURL,
      }) => {
        await holdModules(page, baseURL);
        const runs: string[] = [];
        for (const size of [
          { width: 360, height: 740 },
          { width: 320, height: 568 },
          { width: 1280, height: 900 },
        ]) {
          await page.setViewportSize(size);
          await page.goto(`${lang === 'en' ? '' : 'af/'}templates/${slug}/`, {
            waitUntil: 'commit',
          });
          await expect(page.locator('footer.st-footer')).toBeAttached();
          await page.evaluate(() => document.fonts.ready);
          const gap = await page.locator('st-template-form').evaluate((tool) => {
            // What can be seen: text, form controls, icons, and the edges of a bordered box.
            const spans: [number, number][] = [];
            for (const element of tool.querySelectorAll<HTMLElement>('*')) {
              const style = getComputedStyle(element);
              if (style.visibility !== 'visible') continue;
              const box = element.getBoundingClientRect();
              if (box.height === 0 || box.width === 0) continue;
              const text = [...element.childNodes].some(
                (node) =>
                  node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
              );
              const control = /^(INPUT|TEXTAREA|SELECT|BUTTON|SVG|IMG)$/i.test(element.tagName);
              if (text || control) spans.push([box.top, box.bottom]);
              if (parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== 'none')
                spans.push([box.top, box.top + 1]);
              if (parseFloat(style.borderBottomWidth) > 0 && style.borderBottomStyle !== 'none')
                spans.push([box.bottom - 1, box.bottom]);
            }
            const area = tool.getBoundingClientRect();
            spans.sort((a, b) => a[0] - b[0]);
            let reach = area.top;
            let widest = 0;
            for (const [top, bottom] of spans) {
              widest = Math.max(widest, top - reach);
              reach = Math.max(reach, bottom);
            }
            return Math.round(Math.max(widest, area.bottom - reach));
          });
          runs.push(`${size.width}px: ${gap}px`);
          expect(gap, `widest blank run at ${size.width}px`).toBeLessThanOrEqual(120);
        }
        console.log(`template blank runs ${lang} ${slug}: ${runs.join(', ')}`);
      });
    }
  }

  // Review pass 10, m2: a slot kept the unseen no-JavaScript line's room when its partner was
  // hidden too: above the storage warning, and between the last of ten lines and the totals.
  test('a slot keeps no room once both its lines are hidden', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await page.goto('templates/invoice/');
    await expect(page.locator('st-template-form')).toHaveAttribute('data-ready', '');
    const slots = page.locator('st-template-form .st-tslot');
    // Storage blocked: "saved on this device only" is hidden, and its slot takes no room.
    await expect(page.locator('st-storage-notice[data-show="available"]')).toBeHidden();
    expect((await slots.nth(0).boundingBox())?.height ?? -1).toBe(0);
    // "Add line" until all ten lines show; then it is hidden and its slot takes no room.
    const add = page.locator('[data-add-line]');
    for (let pressed = 0; pressed < 10 && (await add.isVisible()); pressed++) await add.click();
    await expect(add).toBeHidden();
    expect((await slots.nth(1).boundingBox())?.height ?? -1).toBe(0);
  });

  // Review pass 9, m2: when the template's module failed to load, the unseen tab strip left a blank
  // 46px band, and with pass 9's rooms every script control would have too.
  test(
    'if the template script fails to load, no room is left for what it would have shown',
    {
      annotation: allowConsoleError(
        '/net::ERR_FAILED/',
        "The test blocks the template's module on purpose, and the browser logs the failed request.",
      ),
    },
    async ({ page, baseURL }) => {
      await routeSameOrigin(
        page,
        baseURL,
        (url) => /\/_astro\/TemplateTool\.astro_astro_type_script[^/]*\.js$/.test(url.pathname),
        (route) => route.abort(),
      );
      // A phone: from 52rem the tabs are not shown anyway.
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto('templates/invoice/');
      await expect(page.locator('html')).toHaveAttribute(
        'data-st-script-failed',
        /\bTemplateTool\b/,
      );
      const rooms = await page
        .locator('st-template-form .st-tool__tabs, st-template-form .js-only')
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().height),
        );
      expect(rooms.length).toBeGreaterThan(2);
      expect(rooms.filter((height) => height > 0)).toEqual([]);
      await expect(page.getByText('To print, use your browser’s Print command.')).toBeVisible();
      await expect(
        page.getByText('Without JavaScript the totals are not worked out.'),
      ).toBeVisible();
    },
  );
});
