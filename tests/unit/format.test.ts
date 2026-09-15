import { describe, expect, it } from 'vitest';
import { MAX_RAND_AMOUNT, formatDate, formatNumber, formatRand } from '../../src/i18n/index';

/** No-break space, used for thousands grouping and after `R`. */
const S = ' ';

describe('formatDate', () => {
  it('formats a date in English and Afrikaans', () => {
    expect(formatDate('en', '2026-09-13')).toBe('13 September 2026');
    expect(formatDate('af', '2026-09-13')).toBe('13 September 2026');
  });
  it('uses Afrikaans month names', () => {
    const months = Array.from({ length: 12 }, (_, index) =>
      formatDate('af', `2026-${String(index + 1).padStart(2, '0')}-01`),
    );
    expect(months).toEqual([
      '1 Januarie 2026',
      '1 Februarie 2026',
      '1 Maart 2026',
      '1 April 2026',
      '1 Mei 2026',
      '1 Junie 2026',
      '1 Julie 2026',
      '1 Augustus 2026',
      '1 September 2026',
      '1 Oktober 2026',
      '1 November 2026',
      '1 Desember 2026',
    ]);
  });
  it('uses English month names without leading zeros', () => {
    expect(formatDate('en', '2026-04-01')).toBe('1 April 2026');
    expect(formatDate('en', '2026-02-28')).toBe('28 February 2026');
    expect(formatDate('en', '2026-12-31')).toBe('31 December 2026');
  });
  it('accepts leap days only in leap years', () => {
    expect(formatDate('en', '2028-02-29')).toBe('29 February 2028');
    expect(() => formatDate('en', '2026-02-29')).toThrow(RangeError);
  });
  it('rejects impossible and malformed dates', () => {
    for (const bad of [
      '2026-02-30',
      '2026-13-01',
      '2026-00-10',
      '2026-04-31',
      '0026-01-01',
      '13/09/2026',
      '2026-9-13',
      ' 2026-09-13',
      '',
    ]) {
      expect(() => formatDate('en', bad), bad).toThrow(RangeError);
    }
    expect(() => formatDate('en', '2026-02-30')).toThrow('Invalid date: 2026-02-30');
    expect(() => formatDate('en', '13/09/2026')).toThrow('Expected YYYY-MM-DD');
  });
  it('shows timestamps as the calendar day in South Africa', () => {
    expect(formatDate('en', '2026-09-13T21:59:59Z')).toBe('13 September 2026');
    expect(formatDate('en', '2026-09-13T22:00:00Z')).toBe('14 September 2026');
    expect(formatDate('af', '2026-12-31T23:30:00.000Z')).toBe('1 Januarie 2027');
    expect(formatDate('en', '2026-09-14T01:00:00+02:00')).toBe('14 September 2026');
    expect(formatDate('en', '2026-09-14T01:00+0200')).toBe('14 September 2026');
    expect(formatDate('en', '2026-09-13T23:30:00-01:00')).toBe('14 September 2026');
    expect(formatDate('en', '2026-09-13T00:30:00+05:30')).toBe('12 September 2026');
  });
  it('rejects impossible timestamps instead of rolling them over', () => {
    for (const bad of [
      '2026-02-30T10:00:00Z',
      '2026-04-31T00:00:00+02:00',
      '2026-09-13T24:00:00Z',
      '2026-09-13T25:00:00Z',
      '2026-09-13T10:60:00Z',
      '2026-09-13T10:00:60Z',
      '2026-09-13T10:00:00+24:00',
      '2026-09-13T10:00:00z',
    ]) {
      expect(() => formatDate('en', bad), bad).toThrow(RangeError);
    }
    expect(() => formatDate('en', '2026-02-30T10:00:00Z')).toThrow('Invalid date');
  });
  it('accepts real time zone offsets only, up to ±14:00', () => {
    expect(formatDate('en', '2027-01-01T01:00:00+14:00')).toBe('31 December 2026');
    expect(formatDate('en', '2026-09-13T12:00:00-12:00')).toBe('14 September 2026');
    for (const bad of ['2026-09-13T10:00:00+14:01', '2026-09-13T10:00:00-23:59']) {
      expect(() => formatDate('en', bad), bad).toThrow('Invalid time zone offset');
    }
  });
  it('rejects timestamps without a time zone and unparseable timestamps', () => {
    expect(() => formatDate('en', '2026-09-13T10:00:00')).toThrow(RangeError);
    expect(() => formatDate('en', '2026-09-13Tnonsense+02:00')).toThrow(RangeError);
  });
});

describe('formatRand', () => {
  it('uses R, a no-break space, space-grouped thousands and a decimal point', () => {
    expect(formatRand('en', 1234.56)).toBe(`R${S}1${S}234.56`);
    expect(formatRand('en', 1234567.8)).toBe(`R${S}1${S}234${S}567.80`);
  });
  it('is byte-identical in every locale', () => {
    for (const amount of [0, 5, 999.999, 120000, 2300000]) {
      expect(formatRand('af', amount)).toBe(formatRand('en', amount));
    }
  });
  it('always shows two decimals', () => {
    expect(formatRand('en', 0)).toBe(`R${S}0.00`);
    expect(formatRand('en', 50)).toBe(`R${S}50.00`);
    expect(formatRand('en', 999)).toBe(`R${S}999.00`);
    expect(formatRand('en', 1000)).toBe(`R${S}1${S}000.00`);
  });
  it('rounds half away from zero to cents, without float drift', () => {
    expect(formatRand('en', 1.005)).toBe(`R${S}1.01`);
    expect(formatRand('en', 2.675)).toBe(`R${S}2.68`);
    expect(formatRand('en', 0.1 + 0.2)).toBe(`R${S}0.30`);
    expect(formatRand('en', 999.995)).toBe(`R${S}1${S}000.00`);
    expect(formatRand('en', -1.005)).toBe(`-R${S}1.01`);
  });
  it('puts the minus sign before R and never shows minus zero', () => {
    expect(formatRand('en', -50)).toBe(`-R${S}50.00`);
    expect(formatRand('en', -1234.5)).toBe(`-R${S}1${S}234.50`);
    expect(formatRand('en', -0)).toBe(`R${S}0.00`);
    expect(formatRand('en', -0.001)).toBe(`R${S}0.00`);
  });
  it('handles very large and very small magnitudes', () => {
    expect(formatRand('en', 123456789012.345)).toBe(`R${S}123${S}456${S}789${S}012.35`);
    expect(formatRand('en', 1e-7)).toBe(`R${S}0.00`);
    expect(formatRand('en', 90_000_000_000_000)).toBe(`R${S}90${S}000${S}000${S}000${S}000.00`);
  });
  it('throws above the amount where cents stop being exact', () => {
    expect(MAX_RAND_AMOUNT).toBe(Number.MAX_SAFE_INTEGER / 100);
    expect(() => formatRand('en', 1e14)).toThrow(RangeError);
    expect(() => formatRand('en', -1e21)).toThrow('too large');
  });
  it('throws for values that are not finite numbers', () => {
    expect(() => formatRand('en', Number.NaN)).toThrow(RangeError);
    expect(() => formatRand('en', Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('formatNumber', () => {
  it('groups thousands with a no-break space and keeps the decimal point', () => {
    expect(formatNumber('en', 1234)).toBe(`1${S}234`);
    expect(formatNumber('en', 1234.5)).toBe(`1${S}234.5`);
    expect(formatNumber('en', 2300000)).toBe(`2${S}300${S}000`);
    expect(formatNumber('en', 999)).toBe('999');
  });
  it('is byte-identical in every locale', () => {
    expect(formatNumber('af', 120000.25)).toBe(formatNumber('en', 120000.25));
  });
  it('respects fraction digit options', () => {
    expect(formatNumber('en', 0.5, { minimumFractionDigits: 2 })).toBe('0.50');
    expect(formatNumber('en', 1.23456, { maximumFractionDigits: 1 })).toBe('1.2');
    expect(formatNumber('en', 7, { minimumFractionDigits: 1, maximumFractionDigits: 1 })).toBe(
      '7.0',
    );
  });
  it('shows negatives with a hyphen-minus and hides minus zero', () => {
    expect(formatNumber('en', -1234)).toBe(`-1${S}234`);
    expect(formatNumber('en', -0)).toBe('0');
    expect(formatNumber('en', -0.0001)).toBe('0');
  });
  it('throws for values that are not finite numbers', () => {
    expect(() => formatNumber('en', Number.NaN)).toThrow(RangeError);
    expect(() => formatNumber('af', Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });
});
