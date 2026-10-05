/**
 * Line items and totals for the quotation and invoices (WP-32, build plan B3 flow 5).
 *
 * All arithmetic is in whole cents, so R 0.10 + R 0.20 is R 0.30 and not 0.30000000000000004.
 * Rounding is half away from zero, as `formatRand` rounds (`src/i18n/index.ts`).
 *
 * - A line's amount is quantity × unit price, rounded to cents.
 * - The subtotal is the sum of the line amounts.
 * - VAT is charged on that total, not on each unit price, and rounded to cents once:
 *   3 × R 0.35 is R 1.05, and 15% of R 1.05 is R 0.1575, so VAT is R 0.16 (per unit it would be
 *   3 × R 0.05 = R 0.15).
 * - The total is the subtotal plus VAT. Without a VAT rate the subtotal is the total.
 *
 * Pure, no DOM: the custom element and `tests/unit/templates/totals.test.ts` both use it.
 */

/** Half away from zero, on a value that is already close to an integer number of cents. */
function roundHalfAway(value: number): number {
  // Remove binary noise first: 1.15 * 100 is 114.99999999999999.
  const cleaned = Number(value.toFixed(6));
  return Math.sign(cleaned) * Math.round(Math.abs(cleaned));
}

/**
 * Reads a number as a person types it: `1500`, `1 500.50`, `1,500.50`, `R 1 500`, `1500,5`.
 * A comma followed by one or two digits at the end is a decimal comma; any other comma groups
 * thousands. Returns `undefined` for empty text and `NaN` for text that is not a number.
 */
export function parseNumber(input: string): number | undefined {
  let text = input.replace(/[\s\u00a0\u202f]/g, '').replace(/^R/i, '');
  if (text === '') return undefined;
  if (/,\d{1,2}$/.test(text) && !text.includes('.')) {
    text = text.replace(/,(?=\d{1,2}$)/, '.');
  }
  text = text.replace(/,/g, '');
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(text)) return Number.NaN;
  return Number(text);
}

/** A rand amount as whole cents, or `undefined`/`NaN` as `parseNumber` gives them. */
export function parseCents(input: string): number | undefined {
  const value = parseNumber(input);
  if (value === undefined || Number.isNaN(value)) return value;
  return roundHalfAway(value * 100);
}

export interface LineInput {
  readonly description: string;
  readonly quantity: string;
  readonly unitPrice: string;
}

/** A line as worked out: its amount in cents, or why it has none. */
export interface LineResult {
  /** `undefined` when the line has no price yet or a value is not a number. */
  readonly cents: number | undefined;
  readonly quantityInvalid: boolean;
  readonly priceInvalid: boolean;
  /** The line has a description or a price, so it belongs on the document. */
  readonly used: boolean;
}

/**
 * An empty quantity counts as 1, the quantity the templates write in every row, so a reader who
 * types only a description and a price gets an amount.
 */
export function lineResult(line: LineInput): LineResult {
  const quantity = parseNumber(line.quantity);
  const price = parseCents(line.unitPrice);
  const quantityInvalid = quantity !== undefined && Number.isNaN(quantity);
  const priceInvalid = price !== undefined && Number.isNaN(price);
  const used = line.description.trim() !== '' || line.unitPrice.trim() !== '';
  if (quantityInvalid || priceInvalid || price === undefined) {
    return { cents: undefined, quantityInvalid, priceInvalid, used };
  }
  return { cents: roundHalfAway((quantity ?? 1) * price), quantityInvalid, priceInvalid, used };
}

export interface Totals {
  readonly subtotal: number;
  readonly vat: number;
  readonly total: number;
}

/** VAT on an amount in cents at `rate` percent, rounded to cents once. */
export function vatOn(cents: number, rate: number): number {
  return roundHalfAway((cents * rate) / 100);
}

/** Subtotal, VAT and total in cents. Lines without an amount add nothing. */
export function totalsOf(lines: readonly LineInput[], vatRate?: number): Totals {
  const subtotal = lines.reduce((sum, line) => sum + (lineResult(line).cents ?? 0), 0);
  const vat = vatRate === undefined ? 0 : vatOn(subtotal, vatRate);
  return { subtotal, vat, total: subtotal + vat };
}

/** Cents to rand, for `formatRand`. */
export const toRand = (cents: number): number => cents / 100;

/**
 * The next document number: the last run of digits plus one, keeping its width (`INV-0009` →
 * `INV-0010`, `Q7` → `Q8`, `INV-9999` → `INV-10000`). Text with no digits gets `1` appended, so
 * "Start next" always changes the number.
 */
export function nextNumber(current: string): string {
  const match = /(\d+)(\D*)$/.exec(current);
  if (!match) return `${current}1`;
  const digits = match[1] ?? '';
  const next = String(Number(digits) + 1).padStart(digits.length, '0');
  return `${current.slice(0, match.index)}${next}${match[2] ?? ''}`;
}
