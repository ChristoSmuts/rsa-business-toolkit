import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Doc } from '../../../src/lib/content/schema';
import { TEMPLATE_SLUGS } from '../../../src/lib/templates/draft';
import {
  parseTemplate,
  requiredItems,
  runsText,
  splitNested,
  splitTemplate,
  thresholdCents,
  type TemplateField,
  type TemplateModel,
} from '../../../src/lib/templates/placeholders';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const load = (lang: 'en' | 'af', slug: string): Doc =>
  JSON.parse(
    readFileSync(
      path.join(ROOT, 'src', 'data', lang, 'docs', `paperwork__templates__${slug}.json`),
      'utf8',
    ),
  ) as Doc;
const model = (lang: 'en' | 'af', slug: string): TemplateModel => parseTemplate(load(lang, slug));
const field = (m: TemplateModel, name: string): TemplateField => {
  const found = m.fields.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`no field ${name}`);
  return found;
};

describe('splitTemplate', () => {
  it('splits a template at its two rules', () => {
    const doc = load('en', 'quotation');
    const { before, sheet, after } = splitTemplate(doc.blocks);
    expect(before.map((block) => block.id)).toEqual(['intro.1']);
    expect(sheet[0]?.id).toBe('intro.3');
    expect(after[0]?.id).toBe('three-rules-that-save-you-money');
  });

  it('keeps everything as the sheet when there is no rule', () => {
    const blocks = load('en', 'quotation').blocks.filter((block) => block.kind !== 'hr');
    expect(splitTemplate(blocks)).toEqual({ before: [], sheet: blocks, after: [] });
  });
});

describe('splitNested', () => {
  it('separates the condition, the printed words with their slots, and the note', () => {
    const parts = splitNested(
      'If a company: Trading as a name of [REGISTERED NAME] (Pty) Ltd, Reg. No. [NUMBER] — this is required by law',
    );
    expect(parts.condition).toBe('If a company');
    expect(parts.note).toBe('this is required by law');
    expect(parts.printed).toEqual([
      { type: 'text', v: 'Trading as a name of ' },
      { type: 'slot', v: 'REGISTERED NAME' },
      { type: 'text', v: ' (Pty) Ltd, Reg. No. ' },
      { type: 'slot', v: 'NUMBER' },
    ]);
  });

  it('reads a line with no condition and no note', () => {
    expect(splitNested('Paid by [NAME]')).toEqual({
      condition: '',
      printed: [
        { type: 'text', v: 'Paid by ' },
        { type: 'slot', v: 'NAME' },
      ],
      note: '',
    });
  });
});

describe('parseTemplate on the five templates', () => {
  it.each(TEMPLATE_SLUGS)(
    '%s: the Afrikaans text gives the same fields, groups and rules',
    (slug) => {
      const en = model('en', slug);
      const af = model('af', slug);
      const shape = (m: TemplateModel) => ({
        fields: m.fields.map((f) => [
          f.name,
          f.kind,
          f.required,
          f.carry,
          f.profileKey ?? '',
          f.follows ?? '',
          f.documentNumber ?? false,
          f.options?.length ?? 0,
          f.ownLabel ?? false,
        ]),
        groups: m.groups.map((g) => [g.id, g.role, g.items.map((item) => item.kind)]),
        lines: m.lines
          ? [m.lines.rows, m.lines.quantity, m.lines.vatRate, m.lines.totals.map((t) => t.kind)]
          : undefined,
        number: m.numberField,
        sheet: m.sheet.map((block) => [block.kind, block.id]),
      });
      expect(shape(af)).toEqual(shape(en));
      // Numbers, amounts and sample values are byte-identical in both languages.
      expect(af.fields.map((f) => (f.sample.startsWith('[') ? '' : f.sample))).toEqual(
        en.fields.map((f) => (f.sample.startsWith('[') ? '' : f.sample)),
      );
    },
  );

  it.each(TEMPLATE_SLUGS)(
    '%s: every heading of the template is a group, with its anchor id',
    (slug) => {
      const m = model('en', slug);
      const headings = m.sheet.filter((block) => block.kind === 'heading').map((block) => block.id);
      const sections = m.groups.filter((g) => g.role === 'section').map((g) => g.id);
      expect(sections).toEqual(headings);
    },
  );

  it('quotation: fields, labels and kinds come from the markdown', () => {
    const m = model('en', 'quotation');
    expect(m.title).toBe('QUOTATION');
    expect(m.numberField).toBe('intro.4:r0');
    expect(field(m, 'intro.4:r0')).toMatchObject({
      label: 'Quote number',
      defaultValue: 'QUO-0001',
      documentNumber: true,
      required: true,
    });
    expect(field(m, 'intro.4:r1')).toMatchObject({ kind: 'date', label: 'Date' });
    expect(field(m, 'intro.4:r2')).toMatchObject({ kind: 'date', label: 'Valid until' });
    expect(field(m, 'to.1:0')).toMatchObject({ label: 'Customer name', sample: '[Customer name]' });
    // A slot inside a sentence is labelled by the sentence.
    expect(field(m, 'payment.1:0')).toMatchObject({
      kind: 'number',
      label: 'Deposit of …% before work starts.',
    });
    expect(field(m, 'timing.1:0').label).toBe(
      'Work starts … and takes approximately [how long] once the deposit is received.',
    );
    // Business details carry a profile key.
    expect(field(m, 'email')).toMatchObject({ kind: 'email', profileKey: 'email', carry: true });
    expect(field(m, 'phone')).toMatchObject({ kind: 'tel', profileKey: 'phone' });
    // The nested company line: optional, with the template's own sentence as the hint.
    expect(field(m, 'registeredName')).toMatchObject({
      required: false,
      profileKey: 'registeredName',
      hint: 'If a company: Trading as a name of [REGISTERED NAME] (Pty) Ltd, Reg. No. [NUMBER] — this is required by law',
    });
    expect(field(m, 'registrationNumber').required).toBe(false);
    // Lists: the italic note next to the list is its hint.
    expect(field(m, 'what-is-not-included.2')).toMatchObject({
      kind: 'list',
      label: 'What is NOT included',
      defaultValue: '',
    });
    expect(field(m, 'what-is-not-included.2').hint).toContain('Fill this in.');
    expect(m.lines).toMatchObject({
      rows: 3,
      quantity: '1',
      sample: 'Item or service',
      label: 'What I will do',
    });
    expect(m.lines?.totals.map((row) => row.kind)).toEqual(['total']);
    expect(m.lines?.vatRate).toBeUndefined();
  });

  it('quotation: the signature lines are text in the Acceptance group', () => {
    const acceptance = model('en', 'quotation').groups.find((g) => g.id === 'acceptance');
    expect(acceptance?.fields).toEqual([]);
    expect(acceptance?.items.map((item) => item.kind)).toEqual(['text', 'text', 'text']);
  });

  it('invoice: the payment reference follows the invoice number and bank details carry over', () => {
    const m = model('en', 'invoice');
    expect(field(m, 'payment-details.1:r4')).toMatchObject({
      label: 'Reference',
      follows: 'intro.6:r0',
      carry: false,
      defaultValue: '',
    });
    expect(field(m, 'payment-details.1:r0')).toMatchObject({ label: 'Bank', carry: true });
    expect(field(m, 'payment-details.1:r1').hint).toBe('Exactly as it appears on the account');
    // An instruction in running text is optional.
    // An instruction with no condition is a slot to fill, not "(optional)" (review pass 2, nit 3).
    expect(field(m, 'payment-details.3:1')).toMatchObject({
      required: true,
      label: 'State your late payment terms here',
    });
    expect(field(m, 'payment-details.3:0')).toMatchObject({
      required: true,
      label: 'Payment is due by ….',
    });
    expect(m.fields.some((f) => f.profileKey === 'vatNumber')).toBe(false);
  });

  it('tax invoice: VAT row, rate and the VAT number from the markdown', () => {
    const m = model('en', 'tax-invoice');
    expect(m.lines?.vatRate).toBe(15);
    expect(m.lines?.totals.map((row) => [row.kind, runsText(row.label)])).toEqual([
      ['subtotal', 'Subtotal (excl. VAT)'],
      ['vat', 'VAT @ 15%'],
      ['total', 'TOTAL (incl. VAT)'],
    ]);
    expect(field(m, 'vatNumber')).toMatchObject({
      sample: '4XXXXXXXXX',
      required: true,
      ownLabel: true,
      label: 'VAT Registration Number',
    });
    // The customer's VAT number is conditional in the template, so optional here.
    expect(field(m, 'to.1:2')).toMatchObject({ required: false, label: 'Customer VAT number' });
    expect(model('af', 'tax-invoice').title).toBe('BELASTINGFAKTUUR');
    expect(field(model('af', 'tax-invoice'), 'vatNumber').label).toBe('BTW-registrasienommer');
  });

  it('receipt: amounts, the payment method choices and a second document number', () => {
    const m = model('en', 'receipt');
    expect(m.lines).toBeUndefined();
    expect(field(m, 'intro.4:r3')).toMatchObject({ kind: 'money', label: 'Amount received' });
    expect(field(m, 'intro.4:r4').options).toEqual(['EFT', 'PayShap', 'Cash', 'Card']);
    expect(field(model('af', 'receipt'), 'intro.4:r4').options).toEqual([
      'EFT',
      'PayShap',
      'Kontant',
      'Kaart',
    ]);
    // INV-0001 is another document's number: neither the receipt's own nor a follower.
    expect(field(m, 'intro.4:r5')).toMatchObject({ sample: 'INV-0001', defaultValue: '' });
    expect(field(m, 'intro.4:r5').follows).toBeUndefined();
    expect(m.groups.find((g) => g.id === 'details')?.items.at(-1)?.kind).toBe('text');
  });

  it('privacy notice: lists keep the template lines in the page language, and a field repeats once', () => {
    const en = model('en', 'privacy-notice');
    const af = model('af', 'privacy-notice');
    expect(en.numberField).toBeUndefined();
    expect(field(en, 'what-we-collect.1').defaultValue.split('\n')[0]).toBe('Your name');
    expect(field(af, 'what-we-collect.1').defaultValue.split('\n')[0]).toBe('Jou naam');
    expect(en.fields.filter((f) => f.name === 'businessName')).toHaveLength(1);
    expect(field(en, 'ownerName')).toMatchObject({ label: 'Information Officer', ownLabel: true });
    expect(field(en, 'your-rights.3:0')).toMatchObject({ kind: 'date', label: 'Last updated' });
    expect(en.groups.find((g) => g.id === 'marketing')?.items.map((i) => i.kind)).toEqual(['text']);
  });
});

describe('conditions from the template (review pass 1, major 4 and minor 7)', () => {
  it('keeps the template condition on a conditional slot, and its threshold', () => {
    const vat = field(model('en', 'tax-invoice'), 'to.1:2');
    expect(vat).toMatchObject({
      required: false,
      condition: 'Customer VAT number, if they are a vendor — required on invoices over R5,000',
      requiredAbove: 500_000,
      printLabel: 'Customer VAT number',
    });
    expect(field(model('af', 'tax-invoice'), 'to.1:2')).toMatchObject({
      requiredAbove: 500_000,
      printLabel: 'Kliënt se BTW-nommer',
    });
    expect(field(model('en', 'quotation'), 'registeredName').condition).toContain(
      'this is required by law',
    );
    // An instruction with no condition stays plainly optional.
    expect(field(model('en', 'invoice'), 'payment-details.3:1').condition).toBeUndefined();
  });

  it('prints a label before a slot that is all instruction', () => {
    const sheet = model('en', 'tax-invoice').sheet.find((block) => block.id === 'to.1');
    expect(sheet?.kind === 'paragraph' && sheet.lines[2]?.runs[0]).toEqual({
      t: 'text',
      v: 'Customer VAT number: ',
    });
  });

  it('reads thresholds written the English way, in any language', () => {
    expect(thresholdCents('required on invoices over R5,000')).toBe(500_000);
    expect(thresholdCents('bo R50')).toBe(5000);
    expect(thresholdCents('over R1,234.50')).toBe(123_450);
    expect(thresholdCents('no amount here')).toBeUndefined();
  });

  it('lets every paragraph of template text be left out, except signature lines', () => {
    const quotation = model('en', 'quotation');
    const acceptance = quotation.groups.find((g) => g.id === 'acceptance');
    expect(acceptance?.items.every((item) => item.kind === 'text' && !item.omit)).toBe(true);
    const marketing = model('en', 'privacy-notice').groups.find((g) => g.id === 'marketing');
    expect(marketing?.items[0]).toMatchObject({ kind: 'text', omit: 'omit:marketing.1' });
  });
});

describe('requiredItems', () => {
  it('lists every required field once, in form order, and "at least one line" where lines are', () => {
    const items = requiredItems(model('en', 'tax-invoice'));
    expect(items.map((item) => item.name)).toEqual([
      'businessName',
      'address',
      'vatNumber',
      'phone',
      'email',
      'intro.5:r0',
      'intro.5:r1',
      'to.1:0',
      'to.1:1',
      'to.1:2',
      'lines',
      'payment-details.1:r0',
      'payment-details.1:r1',
      'payment-details.1:r2',
      'payment-details.1:r3',
      'payment-details.1:r4',
    ]);
    // The customer's VAT number counts above the template's own threshold (pass 1, major 4).
    expect(items.find((item) => item.name === 'to.1:2')?.requiredAbove).toBe(500_000);
    // Named by the dictionary unless the template names the slot itself.
    expect(items.find((item) => item.name === 'phone')?.profileKey).toBe('phone');
    expect(items.find((item) => item.name === 'vatNumber')?.profileKey).toBeUndefined();
    expect(items.find((item) => item.name === 'lines')?.label).toBe('Supply');
  });

  it.each(TEMPLATE_SLUGS)('%s: optional fields are never required items', (slug) => {
    const m = model('en', slug);
    const optional = new Set(
      m.fields.filter((f) => !f.required && f.requiredAbove === undefined).map((f) => f.name),
    );
    expect(requiredItems(m).filter((item) => optional.has(item.name))).toEqual([]);
  });
});

describe('parseTemplate on shapes the five templates do not have', () => {
  const doc = (blocks: unknown[]): Pick<Doc, 'h1' | 'blocks'> =>
    ({ h1: 'SHEET', blocks }) as Pick<Doc, 'h1' | 'blocks'>;
  const text = (v: string) => ({ t: 'text', v });
  const slot = (v: string, style = 'field', nested = false) => ({
    t: 'placeholder',
    v,
    style,
    ...(nested ? { nested: true } : {}),
  });
  const hash = '0000000000000000';

  it('names the slots of a nested line generically when it has not two of them', () => {
    const m = parseTemplate(
      doc([
        { id: 'a.1', hash, kind: 'hr' },
        {
          id: 'a.2',
          hash,
          kind: 'paragraph',
          c: [slot('If paid: by [A], [B] and [C]', 'instruction', true)],
        },
      ]),
    );
    expect(m.fields.map((f) => f.name)).toEqual(['a.2:0.0', 'a.2:0.1', 'a.2:0.2']);
    expect(m.fields.every((f) => !f.required && f.profileKey === undefined)).toBe(true);
  });

  it('reads an amount written as text in a sentence, and two slots in one table cell', () => {
    const m = parseTemplate(
      doc([
        { id: 'a.1', hash, kind: 'paragraph', c: [text('Deposit paid: R 0.00')] },
        {
          id: 'a.2',
          hash,
          kind: 'table',
          align: [null, null],
          header: [[text('Field')], [text('Detail')]],
          rows: [[[text('Between')], [slot('From'), text(' and '), slot('To')]]],
        },
      ]),
    );
    expect(m.fields.find((f) => f.name === 'a.1:0')).toMatchObject({
      kind: 'money',
      label: 'Deposit paid',
      required: true,
    });
    expect(m.fields.map((f) => f.name)).toContain('a.2:r0.1');
    expect(m.lines).toBeUndefined();
    expect(m.numberField).toBeUndefined();
  });
});
