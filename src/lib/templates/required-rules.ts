/**
 * The rules for a template's required items list, in one place (WP-50a review pass 11, m2): the
 * page renders the list for an empty form with them (`emptyFormRequired()`, `required.ts`), and
 * `<st-template-form>` keeps it up to date with them (`src/scripts/template-form.ts`), so the two
 * cannot drift apart.
 */
import { QUANTITY, readCents, readNumber } from './totals';

/** Text the form can use for a field of `kind`: any text, or a number it can read. */
export function readable(value: string, kind: string | undefined): boolean {
  if (kind === 'money') return readCents(value).kind === 'ok';
  if (kind === 'number') return readNumber(value, QUANTITY).kind === 'ok';
  return true;
}

/**
 * An item the template requires only above an amount ("required on invoices over R5,000") counts
 * once the total is above it (review pass 1, major 4).
 */
export function requiredApplies(above: number | undefined, total: number): boolean {
  return above === undefined || total > above;
}

/**
 * A field's item is present when its value is usable, or, for a field that follows another (the
 * same as above), when that one has a value. A number the form refuses is not filled in: it prints
 * blank (review pass 2, minor 3).
 */
export function fieldPresent(
  value: string,
  kind: string | undefined,
  followed: string | undefined,
): boolean {
  if (value.trim() !== '' && readable(value, kind)) return true;
  return followed !== undefined && followed.trim() !== '';
}
