import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAll } from '../../src/lib/store';
import { templateDraft } from '../../src/lib/templates/draft';

const profile = vi.hoisted(() => ({ details: null as Record<string, string> | null }));
vi.mock('../../src/lib/templates/profile', () => ({
  readBusinessDetails: () => profile.details,
}));

const { StTemplateForm } = await import('../../src/scripts/template-form');
const { mount, press } = await import('./helpers');

const NBSP = ' ';

/** One line row as `TemplateLines.astro` renders it. */
const row = (index: number, extra: boolean): string => `
  <li class="st-tline" data-line="${index}" ${extra ? 'data-extra' : ''}>
    <fieldset>
      <legend>Line ${index + 1}</legend>
      <input id="d${index}" name="lines.${index}.description" placeholder="Item or service" />
      <input id="q${index}" name="lines.${index}.quantity" value="1" data-error-id="q${index}-error" />
      <p id="q${index}-error" hidden>Type a number</p>
      <input id="p${index}" name="lines.${index}.unitPrice" placeholder="0.00" data-error-id="p${index}-error" />
      <p id="p${index}-error" hidden>Type a number</p>
      <output data-line-amount></output>
      <button type="button" data-remove-line="${index}" aria-label="Remove line: Line ${index + 1}">Remove line</button>
    </fieldset>
  </li>`;

/** A small tax invoice, shaped like `TemplateTool.astro`'s output. */
const TOOL = `
<st-template-form data-template="tax-invoice" data-locale="en"
  data-months='["January","February","March","April","May","June","July","August","September","October","November","December"]'
  data-date-format="{day} {month} {year}"
  data-required-text="{present} of {total} required items present"
  data-all-present="All required items are present."
  data-clear-done="The form was cleared."
  data-start-next-done="Tax invoice {number} started."
  data-prefilled="Your business details were filled in from your saved answers."
  data-remove-line="Remove line: {description}"
  data-line-legend="Line {n}"
  data-vat-rate="15">
  <div role="tablist">
    <button type="button" role="tab" id="tab-form" data-tab="form" aria-selected="true">Fill in</button>
    <button type="button" role="tab" id="tab-preview" data-tab="preview" aria-selected="false" tabindex="-1">Preview</button>
  </div>
  <div data-pane="form">
    <form novalidate>
      <input name="businessName" data-kind="text" data-required data-carry data-profile-key="businessName" />
      <input name="registeredName" data-kind="text" data-carry data-profile-key="registeredName" />
      <input name="number" data-kind="text" data-required data-number value="INV-0001" />
      <input name="issued" type="date" data-kind="date" data-required />
      <input name="customer" data-kind="text" data-required />
      <input name="bank" data-kind="text" data-required data-carry />
      <input name="reference" data-kind="text" data-required data-follows="number" />
      <input name="paid" data-kind="money" data-error-id="paid-error" />
      <p id="paid-error" hidden>Type a number</p>
      <textarea name="items" data-kind="list" data-sample="[Be specific]"></textarea>
      <ol>${row(0, false)}${row(1, true)}${row(2, true)}</ol>
      <button type="button" data-add-line>Add line</button>
      <div aria-live="polite">
        <output data-total="subtotal"></output><output data-total="vat"></output><output data-total="total"></output>
      </div>
    </form>
  </div>
  <section data-pane="preview" aria-labelledby="preview-heading">
    <h2 id="preview-heading">Page preview</h2>
    <div class="st-tsheet">
      <span data-field="businessName" data-sample="[YOUR BUSINESS NAME]">[YOUR BUSINESS NAME]</span>
      <span class="st-tsheet__line" data-when="registeredName" hidden>Trading as <span data-field="registeredName" data-sample=""></span></span>
      <span data-field="number" data-sample="INV-0001">INV-0001</span>
      <span data-field="issued" data-sample="[DD Month YYYY]">[DD Month YYYY]</span>
      <span data-field="reference" data-sample="INV-0001">INV-0001</span>
      <span data-field="paid" data-sample="R 0.00">R 0.00</span>
      <ul data-list="items"><li>[Be specific]</li></ul>
      <table><tbody>
        <tr data-sample-line><td>[Goods or services supplied]</td></tr>
        ${[0, 1, 2]
          .map(
            (index) =>
              `<tr data-line="${index}" hidden><td data-cell="description"></td><td data-cell="quantity"></td><td data-cell="unitPrice"></td><td data-cell="amount"></td></tr>`,
          )
          .join('')}
      </tbody><tfoot>
        <tr><td data-total="subtotal"></td></tr><tr><td data-total="vat"></td></tr><tr><td data-total="total"></td></tr>
      </tfoot></table>
    </div>
  </section>
  <ul>
    <li data-required-item="businessName"><a href="#">Business name</a></li>
    <li data-required-item="number"><a href="#">Invoice number</a></li>
    <li data-required-item="customer"><a href="#">Customer name</a></li>
    <li data-required-item="reference"><a href="#">Reference</a></li>
    <li data-required-item="lines"><a href="#">Supply</a></li>
  </ul>
  <p role="status" data-required-count></p>
  <button type="button" data-print>Print or save as PDF</button>
  <button type="button" data-start-next>Start next tax invoice</button>
  <button type="button" data-clear>Clear form</button>
  <p role="status" data-announce></p>
  <dialog><form method="dialog"><button value="cancel">Keep</button><button value="confirm">Clear form</button></form></dialog>
</st-template-form>`;

const el = (): InstanceType<typeof StTemplateForm> =>
  document.querySelector('st-template-form') as InstanceType<typeof StTemplateForm>;
const control = (name: string): HTMLInputElement | HTMLTextAreaElement =>
  document.querySelector(`[name="${name}"]`) as HTMLInputElement;
const slot = (name: string): HTMLElement =>
  document.querySelector(`.st-tsheet [data-field="${name}"]`) as HTMLElement;
const type = (name: string, value: string): void => {
  const input = control(name);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const click = (selector: string): void => {
  (document.querySelector(selector) as HTMLElement).click();
};
const stored = (): unknown =>
  JSON.parse(localStorage.getItem('st.template.tax-invoice.v1') ?? 'null');

beforeEach(() => {
  clearAll();
  profile.details = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  clearAll();
});

describe('<st-template-form>', () => {
  it('connects, writes nothing on a first visit, and shows the template in the preview', () => {
    mount(TOOL);
    expect(el()).toBeInstanceOf(StTemplateForm);
    expect(localStorage.getItem('st.template.tax-invoice.v1')).toBeNull();
    expect(slot('businessName').textContent).toBe('[YOUR BUSINESS NAME]');
    expect(slot('businessName').hasAttribute('data-empty')).toBe(true);
    expect(document.querySelector('[data-required-count]')?.textContent).toBe(
      '2 of 5 required items present',
    );
  });

  it('binds typing to the preview and saves only what differs from the defaults', () => {
    mount(TOOL);
    type('businessName', 'Mokoena Repairs');
    type('issued', '2026-10-05');
    type('paid', '1500');
    expect(slot('businessName').textContent).toBe('Mokoena Repairs');
    expect(slot('businessName').hasAttribute('data-empty')).toBe(false);
    expect(slot('issued').textContent).toBe('5 October 2026');
    expect(slot('paid').textContent).toBe(`R${NBSP}1${NBSP}500.00`);
    expect(stored()).toEqual({
      values: { businessName: 'Mokoena Repairs', issued: '2026-10-05', paid: '1500' },
      lines: [],
    });
  });

  it('shows the payment reference as the invoice number until one is typed', () => {
    mount(TOOL);
    type('number', 'INV-0042');
    expect(slot('reference').textContent).toBe('INV-0042');
    type('reference', 'Thandi');
    expect(slot('reference').textContent).toBe('Thandi');
  });

  it('shows a line of optional fields only once one has a value', () => {
    mount(TOOL);
    const line = document.querySelector<HTMLElement>('[data-when]');
    expect(line?.hidden).toBe(true);
    type('registeredName', 'Mokoena Holdings');
    expect(line?.hidden).toBe(false);
  });

  it('writes a list one item per line, and the template sample while it is empty', () => {
    mount(TOOL);
    type('items', 'Parts\n\n  Labour  ');
    expect([...document.querySelectorAll('[data-list] li')].map((li) => li.textContent)).toEqual([
      'Parts',
      'Labour',
    ]);
    type('items', '');
    expect(document.querySelector('[data-list] li')?.textContent).toBe('[Be specific]');
  });

  it('works out line amounts, VAT on the line total and the total', () => {
    mount(TOOL);
    type('lines.0.description', 'Washers');
    type('lines.0.quantity', '3');
    type('lines.0.unitPrice', '0.35');
    expect(document.querySelector('[data-line-amount]')?.textContent).toBe(`R${NBSP}1.05`);
    const totals = [...document.querySelectorAll('form [data-total]')].map((o) => o.textContent);
    expect(totals).toEqual([`R${NBSP}1.05`, `R${NBSP}0.16`, `R${NBSP}1.21`]);
    // The preview shows the used line instead of the template's sample row.
    expect(document.querySelector<HTMLElement>('[data-sample-line]')?.hidden).toBe(true);
    const previewRow = document.querySelector<HTMLElement>('.st-tsheet tr[data-line="0"]');
    expect(previewRow?.hidden).toBe(false);
    expect(previewRow?.querySelector('[data-cell="unitPrice"]')?.textContent).toBe(`R${NBSP}0.35`);
    expect(document.querySelector('[data-required-item="lines"]')?.hasAttribute('hidden')).toBe(
      true,
    );
    expect(document.querySelector('[data-remove-line="0"]')?.getAttribute('aria-label')).toBe(
      'Remove line: Washers',
    );
  });

  it('marks a price that is not a number, and links the message', () => {
    mount(TOOL);
    type('lines.0.unitPrice', 'ten');
    const price = control('lines.0.unitPrice');
    expect(price.getAttribute('aria-invalid')).toBe('true');
    expect(price.getAttribute('aria-describedby')).toBe('p0-error');
    expect(document.getElementById('p0-error')?.hidden).toBe(false);
    type('lines.0.unitPrice', '10');
    expect(price.hasAttribute('aria-invalid')).toBe(false);
    expect(document.getElementById('p0-error')?.hidden).toBe(true);
  });

  it('adds a line with focus in it, and removing a line moves the next one up', () => {
    mount(TOOL);
    click('[data-add-line]');
    const second = document.querySelector('[data-line="1"].st-tline');
    expect(second?.hasAttribute('data-open')).toBe(true);
    expect(document.activeElement).toBe(control('lines.1.description'));
    type('lines.0.description', 'First');
    type('lines.0.unitPrice', '1');
    type('lines.1.description', 'Second');
    type('lines.1.unitPrice', '2');
    click('[data-remove-line="0"]');
    expect(control('lines.0.description').value).toBe('Second');
    expect(second?.hasAttribute('data-open')).toBe(false);
    expect(document.activeElement).toBe(control('lines.0.description'));
    expect((stored() as { lines: unknown[] }).lines).toEqual([
      { description: 'Second', quantity: '1', unitPrice: '2' },
    ]);
  });

  it('hides "Add line" once every row is open', () => {
    mount(TOOL);
    click('[data-add-line]');
    click('[data-add-line]');
    expect(document.querySelector<HTMLElement>('[data-add-line]')?.hidden).toBe(true);
  });

  it('restores a saved draft, lines included', () => {
    templateDraft('tax-invoice').set({
      values: { customer: 'Thandi', number: 'INV-0007' },
      lines: [
        { description: 'A', quantity: '1', unitPrice: '5' },
        { description: 'B', quantity: '2', unitPrice: '5' },
      ],
    });
    mount(TOOL);
    expect(control('customer').value).toBe('Thandi');
    expect(control('number').value).toBe('INV-0007');
    expect(control('lines.1.description').value).toBe('B');
    expect(document.querySelector('[data-line="1"].st-tline')?.hasAttribute('data-open')).toBe(
      true,
    );
    expect(document.querySelector('form [data-total="total"]')?.textContent).toBe(`R${NBSP}17.25`);
  });

  it('keeps what the reader typed before the script connected', () => {
    templateDraft('tax-invoice').set({ values: { customer: 'Stored' }, lines: [] });
    const template = document.createElement('template');
    template.innerHTML = TOOL;
    (template.content.querySelector('[name="customer"]') as HTMLInputElement).value = 'Typed';
    document.body.append(template.content);
    expect(control('customer').value).toBe('Typed');
    expect(stored()).toEqual({ values: { customer: 'Typed' }, lines: [] });
  });

  it('starts the next invoice: business and bank details stay, the number moves on', () => {
    mount(TOOL);
    type('businessName', 'Mokoena Repairs');
    type('bank', 'FNB');
    type('customer', 'Thandi');
    type('number', 'INV-0009');
    type('lines.0.description', 'Work');
    type('lines.0.unitPrice', '100');
    click('[data-start-next]');
    expect(control('number').value).toBe('INV-0010');
    expect(control('businessName').value).toBe('Mokoena Repairs');
    expect(control('bank').value).toBe('FNB');
    expect(control('customer').value).toBe('');
    expect(control('lines.0.description').value).toBe('');
    expect(document.querySelector('[data-announce]')?.textContent).toBe(
      'Tax invoice INV-0010 started.',
    );
    expect(stored()).toEqual({
      values: { businessName: 'Mokoena Repairs', bank: 'FNB', number: 'INV-0010' },
      lines: [],
    });
  });

  it('clears only after the dialog is confirmed, and removes the draft', async () => {
    mount(TOOL);
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => {
      dialog.open = true;
    });
    type('customer', 'Thandi');
    click('[data-clear]');
    dialog.returnValue = 'cancel';
    dialog.dispatchEvent(new Event('close'));
    await Promise.resolve();
    expect(control('customer').value).toBe('Thandi');

    click('[data-clear]');
    dialog.returnValue = 'confirm';
    dialog.dispatchEvent(new Event('close'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(control('customer').value).toBe('');
    expect(control('number').value).toBe('INV-0001');
    expect(localStorage.getItem('st.template.tax-invoice.v1')).toBeNull();
    expect(document.querySelector('[data-announce]')?.textContent).toBe('The form was cleared.');
  });

  it('prints with the browser print command', () => {
    // happy-dom has no `window.print`; the browser's is stubbed the same way in e2e.
    const original = window.print;
    const print = vi.fn();
    window.print = print;
    try {
      mount(TOOL);
      click('[data-print]');
      expect(print).toHaveBeenCalledTimes(1);
    } finally {
      window.print = original;
    }
  });

  it('never submits the form', () => {
    mount(TOOL);
    const event = new Event('submit', { cancelable: true });
    document.querySelector('form')?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('pre-fills empty business fields from the profile and says so', () => {
    profile.details = { businessName: 'From profile', registeredName: '' };
    mount(TOOL);
    expect(control('businessName').value).toBe('From profile');
    expect(control('registeredName').value).toBe('');
    expect(document.querySelector('[data-announce]')?.textContent).toBe(
      'Your business details were filled in from your saved answers.',
    );
    expect(stored()).toEqual({ values: { businessName: 'From profile' }, lines: [] });
  });

  it('follows a change made in another tab, and "Clear all my data"', () => {
    mount(TOOL);
    templateDraft('tax-invoice').set({ values: { customer: 'Other tab' }, lines: [] });
    expect(control('customer').value).toBe('Other tab');
    clearAll();
    expect(control('customer').value).toBe('');
  });

  it('switches tabs with the arrow keys, Home and End', () => {
    mount(TOOL);
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(document.querySelector('[data-pane="form"]')?.getAttribute('role')).toBe('tabpanel');
    expect(document.querySelector('[data-pane="preview"]')?.getAttribute('aria-labelledby')).toBe(
      'tab-preview',
    );
    tabs[0]?.focus();
    press('ArrowRight');
    expect(el().dataset['view']).toBe('preview');
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]?.tabIndex).toBe(-1);
    press('Home');
    expect(el().dataset['view']).toBe('form');
    press('End');
    expect(el().dataset['view']).toBe('preview');
    tabs[0]?.click();
    expect(el().dataset['view']).toBe('form');
  });

  it('does nothing after it is disconnected', () => {
    mount(TOOL);
    const element = el();
    const form = element.querySelector('form') as HTMLFormElement;
    element.remove();
    const input = form.querySelector('[name="customer"]') as HTMLInputElement;
    input.value = 'After';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(localStorage.getItem('st.template.tax-invoice.v1')).toBeNull();
  });
});
