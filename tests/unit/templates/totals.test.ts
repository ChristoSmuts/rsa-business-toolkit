import { describe, expect, it } from 'vitest';
import { formatRand } from '../../../src/i18n';
import { formatIsoDate } from '../../../src/lib/templates/format';
import {
  lineResult,
  nextNumber,
  parseCents,
  parseNumber,
  toRand,
  totalsOf,
  vatOn,
} from '../../../src/lib/templates/totals';

const line = (quantity: string, unitPrice: string, description = 'Work') => ({
  description,
  quantity,
  unitPrice,
});

describe('parseNumber', () => {
  it.each([
    ['1500', 1500],
    ['1 500.50', 1500.5],
    ['1 500.50', 1500.5],
    ['1,500.50', 1500.5],
    ['R 1 500', 1500],
    ['1500,5', 1500.5],
    ['1500,50', 1500.5],
    ['.5', 0.5],
    ['-20', -20],
  ])('%s → %s', (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it('is undefined for nothing and NaN for words', () => {
    expect(parseNumber('')).toBeUndefined();
    expect(parseNumber('   ')).toBeUndefined();
    expect(parseNumber('twelve')).toBeNaN();
    expect(parseNumber('1.2.3')).toBeNaN();
  });
});

describe('parseCents', () => {
  it('rounds to whole cents, half away from zero', () => {
    expect(parseCents('0.10')).toBe(10);
    expect(parseCents('1.005')).toBe(101);
    expect(parseCents('1.15')).toBe(115);
    expect(parseCents('-1.005')).toBe(-101);
    expect(parseCents('')).toBeUndefined();
    expect(parseCents('abc')).toBeNaN();
  });
});

describe('lineResult', () => {
  it('multiplies quantity by unit price and rounds the line to cents', () => {
    expect(lineResult(line('3', '0.35')).cents).toBe(105);
    expect(lineResult(line('1.5', '0.33')).cents).toBe(50); // 0.495 → 0.50
    expect(lineResult(line('0.1', '0.3')).cents).toBe(3);
  });

  it('counts an empty quantity as 1, the quantity the templates write', () => {
    expect(lineResult(line('', '250')).cents).toBe(25_000);
  });

  it('has no amount without a price, and says which value is not a number', () => {
    expect(lineResult(line('2', ''))).toEqual({
      cents: undefined,
      quantityInvalid: false,
      priceInvalid: false,
      used: true,
    });
    expect(lineResult(line('two', '10'))).toMatchObject({
      cents: undefined,
      quantityInvalid: true,
    });
    expect(lineResult(line('2', 'ten'))).toMatchObject({ cents: undefined, priceInvalid: true });
    expect(lineResult(line('1', '', '')).used).toBe(false);
  });
});

describe('totalsOf', () => {
  it('adds line amounts exactly, with no floating-point drift', () => {
    expect(totalsOf([line('1', '0.10'), line('1', '0.20')])).toEqual({
      subtotal: 30,
      vat: 0,
      total: 30,
    });
  });

  it('charges VAT on the line total, rounded once, not on each unit price', () => {
    // 3 × R 0.35 = R 1.05; 15% of R 1.05 = R 0.1575 → R 0.16 (per unit it would be R 0.15).
    expect(totalsOf([line('3', '0.35')], 15)).toEqual({ subtotal: 105, vat: 16, total: 121 });
    expect(vatOn(105, 15)).toBe(16);
  });

  it('works out a whole invoice', () => {
    const totals = totalsOf([line('3', '0.35'), line('', '450'), line('2', 'oops')], 15);
    expect(totals).toEqual({ subtotal: 45_105, vat: 6766, total: 51_871 });
    expect(formatRand('en', toRand(totals.total))).toBe('R 518.71');
  });

  it('rounds VAT half away from zero', () => {
    // 15% of R 0.10 = R 0.015 → R 0.02
    expect(vatOn(10, 15)).toBe(2);
    expect(vatOn(-10, 15)).toBe(-2);
  });
});

describe('nextNumber', () => {
  it.each([
    ['INV-0001', 'INV-0002'],
    ['INV-0009', 'INV-0010'],
    ['QUO-0099', 'QUO-0100'],
    ['INV-9999', 'INV-10000'],
    ['REC-7a', 'REC-8a'],
    ['Q7', 'Q8'],
    ['Draft', 'Draft1'],
    ['', '1'],
  ])('%s → %s', (current, next) => {
    expect(nextNumber(current)).toBe(next);
  });
});

describe('formatIsoDate', () => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  it('writes a picked date in words', () => {
    expect(formatIsoDate('2026-10-05', months, '{day} {month} {year}')).toBe('5 October 2026');
  });

  it('refuses anything that is not a real date', () => {
    expect(formatIsoDate('2026-02-30', months, '{day} {month} {year}')).toBeUndefined();
    expect(formatIsoDate('5 Oct', months, '{day} {month} {year}')).toBeUndefined();
    expect(formatIsoDate('2026-13-01', months, '{day} {month} {year}')).toBeUndefined();
  });
});
