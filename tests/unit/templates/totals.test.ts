import { describe, expect, it } from 'vitest';
import { formatRand, MAX_RAND_AMOUNT } from '../../../src/i18n';
import { formatIsoDate } from '../../../src/lib/templates/format';
import {
  AMOUNT,
  lineBlocked,
  lineResult,
  MAX_AMOUNT_CENTS,
  MAX_QUANTITY,
  nextNumber,
  QUANTITY,
  readCents,
  readNumber,
  toRand,
  totalsOf,
  vatOn,
} from '../../../src/lib/templates/totals';

const line = (quantity: string, unitPrice: string, description = 'Work') => ({
  description,
  quantity,
  unitPrice,
});

const cents = (input: string): number | string | undefined => {
  const read = readCents(input);
  return read.kind === 'ok' ? read.value : read.kind === 'empty' ? undefined : read.problem;
};

describe('readCents: the formats people write amounts in (review WP-32 pass 1, major 3)', () => {
  it.each([
    ['1500', 150_000],
    ['1 500', 150_000],
    ['1 500.50', 150_050],
    ['1,500.50', 150_050],
    ['1 500,50', 150_050],
    ['1.500,50', 150_050],
    ['1,500,000', 150_000_000],
    ['1.500.000', 150_000_000],
    ['R 1 500', 150_000],
    ['1500,5', 150_050],
    ['89,90', 8990],
    ['0.10', 10],
    ['.5', 50],
    ['0.500', 'decimals'],
    ['-250', -25_000],
    // A discount as people write it (review pass 2, nit 1).
    ['-R250', -25_000],
    ['-R 1 500.50', -150_050],
    ['R-250', -25_000],
  ])('%s → %s', (input, expected) => {
    expect(cents(input)).toBe(expected);
  });

  it('refuses one mark followed by exactly three digits, which could mean either', () => {
    expect(cents('1.500')).toBe('ambiguous');
    expect(cents('1,500')).toBe('ambiguous');
    expect(cents('12.500')).toBe('ambiguous');
    // Never fifteen hundred read as R 1.50.
    expect(cents('1.500,50')).toBe(150_050);
  });

  it('refuses more than two decimals in an amount, rather than rounding it', () => {
    expect(cents('0.335')).toBe('decimals');
    expect(cents('1.2345')).toBe('decimals');
  });

  it('refuses text, misplaced marks and bad grouping', () => {
    for (const input of [
      'twelve',
      '1.2.3',
      '1,50,0',
      '1.500.50',
      '1,500,50.5',
      '12,34.5',
      '5.',
      '-',
      'R-',
    ]) {
      expect(cents(input), input).toBe('format');
    }
  });

  it('is empty for nothing', () => {
    expect(readCents('')).toEqual({ kind: 'empty' });
    expect(readCents('   ')).toEqual({ kind: 'empty' });
  });

  it('refuses an amount above R 1 000 000 000.00 (blocker 1)', () => {
    expect(cents('1000000000')).toBe(MAX_AMOUNT_CENTS);
    expect(cents('1000000000.01')).toBe('tooLarge');
    expect(cents('99999999999999999999')).toBe('tooLarge');
    // The limit keeps ten lines with VAT far below what formatRand can show.
    expect((10 * MAX_AMOUNT_CENTS * 1.15) / 100).toBeLessThan(MAX_RAND_AMOUNT);
  });
});

describe('readNumber for quantities', () => {
  it('takes up to three decimals and refuses the ambiguous forms', () => {
    expect(readNumber('2.5', QUANTITY)).toEqual({ kind: 'ok', value: 2.5 });
    expect(readNumber('0.125', QUANTITY)).toEqual({ kind: 'ok', value: 0.125 });
    expect(readNumber('2,5', QUANTITY)).toEqual({ kind: 'ok', value: 2.5 });
    expect(readNumber('1.500', QUANTITY)).toEqual({ kind: 'invalid', problem: 'ambiguous' });
    expect(readNumber('0.1234', QUANTITY)).toEqual({ kind: 'invalid', problem: 'decimals' });
    expect(readNumber('2 hrs', QUANTITY)).toEqual({ kind: 'invalid', problem: 'format' });
    expect(readNumber(String(MAX_QUANTITY + 1), QUANTITY)).toEqual({
      kind: 'invalid',
      problem: 'tooLarge',
    });
    expect(readNumber('-0', AMOUNT)).toEqual({ kind: 'ok', value: 0 });
  });
});

describe('lineResult', () => {
  it('multiplies quantity by unit price and rounds the line to cents once', () => {
    expect(lineResult(line('3', '0.35')).cents).toBe(105);
    expect(lineResult(line('1.5', '0.33')).cents).toBe(50); // 0.495 → 0.50
    expect(lineResult(line('0.1', '0.3')).cents).toBe(3);
    expect(lineResult(line('0.125', '1')).cents).toBe(13); // 0.125 → 0.13, half away from zero
  });

  it('counts an empty quantity as 1, the quantity the templates write', () => {
    expect(lineResult(line('', '250')).cents).toBe(25_000);
  });

  it('has no amount without a price, and says why a value cannot be used', () => {
    expect(lineResult(line('2', ''))).toEqual({
      cents: undefined,
      quantityProblem: undefined,
      priceProblem: undefined,
      used: true,
    });
    expect(lineResult(line('two', '10'))).toMatchObject({
      cents: undefined,
      quantityProblem: 'format',
    });
    expect(lineResult(line('2', '1.500'))).toMatchObject({
      cents: undefined,
      priceProblem: 'ambiguous',
    });
    expect(lineResult(line('1', '', '')).used).toBe(false);
    expect(lineBlocked(lineResult(line('2 hrs', '400')))).toBe(true);
    expect(lineBlocked(lineResult(line('2', '400')))).toBe(false);
  });

  it('refuses a line whose amount is over the limit, though each value is under it', () => {
    const result = lineResult(line('1000000', '100000'));
    expect(result).toMatchObject({ cents: undefined, priceProblem: 'tooLarge' });
  });
});

describe('totalsOf', () => {
  it('adds line amounts exactly, with no floating-point drift', () => {
    expect(totalsOf([line('1', '0.10'), line('1', '0.20')])).toEqual({
      subtotal: 30,
      vat: 0,
      total: 30,
      blocked: false,
    });
  });

  it('charges VAT on the subtotal, rounded once, not on each line (pass 1, minor 3)', () => {
    // Two lines of R 0.03: 15% of R 0.06 is R 0.009, so R 0.01. Per line it would be R 0.00.
    expect(totalsOf([line('1', '0.03'), line('1', '0.03')], 15)).toMatchObject({
      subtotal: 6,
      vat: 1,
      total: 7,
    });
    expect(totalsOf([line('3', '0.35')], 15)).toMatchObject({ subtotal: 105, vat: 16, total: 121 });
    expect(vatOn(105, 15)).toBe(16);
  });

  it('works out a whole invoice', () => {
    const totals = totalsOf([line('3', '0.35'), line('', '450')], 15);
    expect(totals).toEqual({ subtotal: 45_105, vat: 6766, total: 51_871, blocked: false });
    expect(formatRand('en', toRand(totals.total))).toBe('R 518.71');
  });

  it('says when a used line cannot be read, so the totals would leave it out', () => {
    expect(totalsOf([line('2', '4500'), line('2 hrs', '400')], 15).blocked).toBe(true);
  });

  it('stays within what formatRand can show for ten lines at the limit', () => {
    const lines = Array.from({ length: 10 }, () => line('1', '1000000000'));
    const totals = totalsOf(lines, 15);
    expect(() => formatRand('en', toRand(totals.total))).not.toThrow();
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
    // The last run of three or more digits, so a year after the number stays (pass 1, nit 4).
    ['REC-0001/26', 'REC-0002/26'],
    ['INV-2026-0005', 'INV-2026-0006'],
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
