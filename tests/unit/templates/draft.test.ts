import { describe, expect, it } from 'vitest';
import {
  draftFrom,
  draftKey,
  draftSchema,
  EMPTY_DRAFT,
  isTemplateSlug,
  MAX_LINES,
  nextDraft,
  prefill,
  templateDraft,
  valuesOf,
} from '../../../src/lib/templates/draft';
import { readBusinessDetails } from '../../../src/lib/templates/profile';

const defaults = { number: 'INV-0001', businessName: '', customer: '', bank: '' };

describe('draft keys and schema', () => {
  it('uses one st.template key per template', () => {
    expect(draftKey('tax-invoice')).toBe('st.template.tax-invoice.v1');
    expect(templateDraft('quotation').key).toBe('st.template.quotation.v1');
    expect(templateDraft('quotation')).toBe(templateDraft('quotation'));
    expect(isTemplateSlug('receipt')).toBe(true);
    expect(isTemplateSlug('cv')).toBe(false);
  });

  it('accepts a draft and refuses anything else', () => {
    expect(draftSchema.safeParse({ values: { a: 'b' }, lines: [] }).success).toBe(true);
    expect(draftSchema.safeParse({ values: { a: 1 }, lines: [] }).success).toBe(false);
    expect(draftSchema.safeParse({ values: {}, lines: [{ description: 'x' }] }).success).toBe(
      false,
    );
    const tooMany = Array.from({ length: MAX_LINES + 1 }, () => ({
      description: 'x',
      quantity: '1',
      unitPrice: '1',
    }));
    expect(draftSchema.safeParse({ values: {}, lines: tooMany }).success).toBe(false);
  });
});

describe('draftFrom and valuesOf', () => {
  it('keeps only what differs from the defaults, and drops empty lines at the end', () => {
    const draft = draftFrom({ ...defaults, businessName: 'Mokoena Repairs' }, defaults, [
      { description: 'Geyser', quantity: '1', unitPrice: '900' },
      { description: '', quantity: '1', unitPrice: '' },
    ]);
    expect(draft).toEqual({
      values: { businessName: 'Mokoena Repairs' },
      lines: [{ description: 'Geyser', quantity: '1', unitPrice: '900' }],
    });
  });

  it('keeps a default the reader emptied', () => {
    expect(draftFrom({ ...defaults, number: '' }, defaults, []).values).toEqual({ number: '' });
  });

  it('restores defaults under the draft, ignoring names the template no longer has', () => {
    expect(valuesOf({ values: { customer: 'Thandi', gone: 'x' }, lines: [] }, defaults)).toEqual({
      ...defaults,
      customer: 'Thandi',
    });
    expect(valuesOf(EMPTY_DRAFT, defaults)).toEqual(defaults);
  });
});

describe('nextDraft', () => {
  it('keeps carried fields, moves the number on and empties the rest', () => {
    const draft = nextDraft(
      { number: 'INV-0007', businessName: 'Mokoena Repairs', customer: 'Thandi', bank: 'FNB' },
      defaults,
      ['businessName', 'bank'],
      'number',
      'INV-0008',
    );
    expect(draft).toEqual({
      values: { number: 'INV-0008', businessName: 'Mokoena Repairs', bank: 'FNB' },
      lines: [],
    });
  });
});

describe('prefill', () => {
  const fields = [
    { name: 'businessName', profileKey: 'businessName' },
    { name: 'phone', profileKey: 'phone' },
    { name: 'customer' },
  ];

  it('fills empty business fields and never overwrites one', () => {
    const result = prefill({ businessName: 'Typed Ltd', phone: '', customer: '' }, fields, {
      businessName: 'Profile Ltd',
      phone: ' 082 000 0000 ',
    });
    expect(result.values).toEqual({
      businessName: 'Typed Ltd',
      phone: '082 000 0000',
      customer: '',
    });
    expect(result.filled).toEqual(['phone']);
  });

  it('does nothing without a profile', () => {
    expect(prefill({ phone: '' }, fields, null)).toEqual({ values: { phone: '' }, filled: [] });
  });

  it('reads no profile until WP-31 gives it business details (the hook)', () => {
    expect(readBusinessDetails()).toBeNull();
  });
});
