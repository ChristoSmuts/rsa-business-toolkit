/**
 * Line items and totals for the quotation and invoices (WP-32, build plan B3 flow 5).
 *
 * All arithmetic is in whole cents, so R 0.10 + R 0.20 is R 0.30 and not 0.30000000000000004.
 * Rounding is half away from zero, as `formatRand` rounds (`src/i18n/index.ts`).
 *
 * - A line's amount is quantity × unit price, rounded to cents once. A price has at most two
 *   decimals, so nothing is rounded before it is multiplied.
 * - The subtotal is the sum of the line amounts.
 * - VAT is charged on the subtotal, not on each line, and rounded to cents once: two lines of
 *   R 0.03 at 15% give VAT of R 0.01 (R 0.009 rounded), where VAT per line would give R 0.00.
 * - The total is the subtotal plus VAT. Without a VAT rate the subtotal is the total.
 *
 * **Limits** (review WP-32 pass 1, blocker 1): an amount, a unit price and a line amount are at
 * most `MAX_AMOUNT_CENTS` (R 1 000 000 000.00), a quantity at most `MAX_QUANTITY` (1 000 000).
 * Anything above is invalid, like text that is not a number, so ten lines with VAT stay far below
 * `MAX_RAND_AMOUNT` and `formatRand` can never throw on what a reader typed.
 *
 * **Reading numbers** (pass 1, major 3): spaces group thousands (`1 500`); so do commas or dots when
 * the other mark is the decimal (`1,500.50`, `1.500,50`) or when they repeat (`1,500,000`). A single
 * comma or dot followed by exactly three digits (`1.500`, `1,500`) could be either, so it is
 * refused with a message rather than guessed. An amount has at most two decimals.
 *
 * Pure, no DOM: the custom element and `tests/unit/templates/totals.test.ts` both use it.
 */

/** R 1 000 000 000.00, in cents: the largest amount, unit price or line amount a form takes. */
export const MAX_AMOUNT_CENTS = 100_000_000_000;
/** The largest quantity a line takes. */
export const MAX_QUANTITY = 1_000_000;

export type NumberProblem = 'format' | 'ambiguous' | 'decimals' | 'tooLarge';

export type ReadNumber =
  | { readonly kind: 'empty' }
  | { readonly kind: 'ok'; readonly value: number }
  | { readonly kind: 'invalid'; readonly problem: NumberProblem };

export interface ReadOptions {
  /** Most decimals allowed. */
  readonly decimals: number;
  /** Largest absolute value allowed. */
  readonly max: number;
}

export const AMOUNT: ReadOptions = { decimals: 2, max: MAX_AMOUNT_CENTS / 100 };
export const QUANTITY: ReadOptions = { decimals: 3, max: MAX_QUANTITY };

/** Half away from zero, on a value that is already close to an integer number of cents. */
function roundHalfAway(value: number): number {
  // Remove binary noise first: 1.15 * 100 is 114.99999999999999.
  const cleaned = Number(value.toFixed(6));
  return Math.sign(cleaned) * Math.round(Math.abs(cleaned));
}

const invalid = (problem: NumberProblem): ReadNumber => ({ kind: 'invalid', problem });

/** `1,500,000` with `,`: groups of three after a first group of one to three digits. */
function grouped(text: string, mark: string): boolean {
  const escaped = mark === '.' ? '\\.' : mark;
  return new RegExp(`^\\d{1,3}(?:${escaped}\\d{3})+$`).test(text);
}

/**
 * Reads a number as a person types it. See the module comment for the rules. Returns `empty` for
 * blank text, and says why when the text is not a number this form can use.
 */
export function readNumber(input: string, options: ReadOptions): ReadNumber {
  let text = input.replace(/\s/g, '').replace(/^R/i, '');
  if (text === '') return { kind: 'empty' };
  let sign = 1;
  if (text.startsWith('-')) {
    sign = -1;
    text = text.slice(1);
  }
  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return invalid('format');
  const dots = text.split('.').length - 1;
  const commas = text.split(',').length - 1;
  let whole: string;
  let fraction = '';
  if (dots > 0 && commas > 0) {
    // The mark that comes last is the decimal; the other only groups thousands, before it.
    const decimal = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    const at = text.lastIndexOf(decimal);
    whole = text.slice(0, at);
    fraction = text.slice(at + 1);
    if (whole.includes(decimal) || fraction.includes(thousands) || !grouped(whole, thousands)) {
      return invalid('format');
    }
    whole = whole.split(thousands).join('');
  } else if (dots + commas >= 2) {
    const mark = dots > 0 ? '.' : ',';
    if (!grouped(text, mark)) return invalid('format');
    whole = text.split(mark).join('');
  } else if (dots + commas === 1) {
    const mark = dots > 0 ? '.' : ',';
    [whole = '', fraction = ''] = text.split(mark);
    if (fraction === '') return invalid('format');
    // `1.500` and `1,500`: fifteen hundred, or one and a half? Ask, do not guess.
    if (fraction.length === 3 && /^[1-9]\d{0,2}$/.test(whole)) return invalid('ambiguous');
    if (whole === '') whole = '0';
  } else {
    whole = text;
  }
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) return invalid('format');
  if (fraction.length > options.decimals) return invalid('decimals');
  const value = sign * Number(`${whole}.${fraction || '0'}`);
  if (Math.abs(value) > options.max) return invalid('tooLarge');
  return { kind: 'ok', value: value === 0 ? 0 : value };
}

/** A rand amount as whole cents. */
export function readCents(input: string): ReadNumber {
  const read = readNumber(input, AMOUNT);
  return read.kind === 'ok' ? { kind: 'ok', value: roundHalfAway(read.value * 100) } : read;
}

export interface LineInput {
  readonly description: string;
  readonly quantity: string;
  readonly unitPrice: string;
}

/** A line as worked out: its amount in cents, or why it has none. */
export interface LineResult {
  /** `undefined` when the line has no price yet or a value cannot be used. */
  readonly cents: number | undefined;
  /** Why the quantity cannot be used, if it cannot. */
  readonly quantityProblem: NumberProblem | undefined;
  /** Why the unit price (or the line amount it gives) cannot be used, if it cannot. */
  readonly priceProblem: NumberProblem | undefined;
  /** The line has a description or a price, so it belongs on the document. */
  readonly used: boolean;
}

/**
 * An empty quantity counts as 1, the quantity the templates write in every row, so a reader who
 * types only a description and a price gets an amount.
 */
export function lineResult(line: LineInput): LineResult {
  const quantity = readNumber(line.quantity, QUANTITY);
  const price = readCents(line.unitPrice);
  const used = line.description.trim() !== '' || line.unitPrice.trim() !== '';
  const quantityProblem = quantity.kind === 'invalid' ? quantity.problem : undefined;
  let priceProblem = price.kind === 'invalid' ? price.problem : undefined;
  if (quantity.kind === 'invalid' || price.kind !== 'ok') {
    return { cents: undefined, quantityProblem, priceProblem, used };
  }
  const cents = roundHalfAway((quantity.kind === 'ok' ? quantity.value : 1) * price.value);
  if (Math.abs(cents) > MAX_AMOUNT_CENTS) {
    priceProblem = 'tooLarge';
    return { cents: undefined, quantityProblem, priceProblem, used };
  }
  return { cents, quantityProblem, priceProblem, used };
}

/** The line is on the document but its amount cannot be worked out from what was typed. */
export function lineBlocked(result: LineResult): boolean {
  return result.quantityProblem !== undefined || result.priceProblem !== undefined;
}

export interface Totals {
  readonly subtotal: number;
  readonly vat: number;
  readonly total: number;
  /** A used line has a value that is not a number: the totals would leave it out. */
  readonly blocked: boolean;
}

/** VAT on an amount in cents at `rate` percent, rounded to cents once. */
export function vatOn(cents: number, rate: number): number {
  return roundHalfAway((cents * rate) / 100);
}

/** Subtotal, VAT and total in cents. Lines without an amount add nothing. */
export function totalsOf(lines: readonly LineInput[], vatRate?: number): Totals {
  const results = lines.map(lineResult);
  const subtotal = results.reduce((sum, result) => sum + (result.cents ?? 0), 0);
  const vat = vatRate === undefined ? 0 : vatOn(subtotal, vatRate);
  return { subtotal, vat, total: subtotal + vat, blocked: results.some(lineBlocked) };
}

/** Cents to rand, for `formatRand`. */
export const toRand = (cents: number): number => cents / 100;

/**
 * The next document number: the last run of three or more digits plus one, keeping its width
 * (`INV-0009` → `INV-0010`, `INV-9999` → `INV-10000`, `REC-0001/26` → `REC-0002/26`, so a year
 * after the number is left alone). With no such run, the last run of digits (`Q7` → `Q8`). Text
 * with no digits gets `1` appended, so "Start next" always changes the number.
 */
export function nextNumber(current: string): string {
  const runs = [...current.matchAll(/\d+/g)];
  const run = runs.filter((match) => match[0].length >= 3).at(-1) ?? runs.at(-1);
  if (!run) return `${current}1`;
  const digits = run[0];
  const next = String(Number(digits) + 1).padStart(digits.length, '0');
  return `${current.slice(0, run.index)}${next}${current.slice(run.index + digits.length)}`;
}
