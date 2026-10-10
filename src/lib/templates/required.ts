/**
 * The required items list as `<st-template-form>` leaves it for an empty form (WP-50a review pass
 * 10, M1 and m1). The page renders it in that state, so before the script it shows what the script
 * would, and nothing in it changes when the script runs on a first visit:
 *
 * - an item with a `requiredAbove` amount does not apply at a total of zero, so it is hidden;
 * - an item whose field has a default (or follows one that has) is present, so it is hidden;
 * - the "lines" item is never present on an empty form.
 *
 * The rules are `#renderRequired` in `src/scripts/template-form.ts`, run on the form's defaults;
 * `tests/unit/templates/required.test.ts` and `template-shift.spec.ts` hold the two together. A
 * saved draft or business details can still change the list when the script runs.
 */
import { requiredItems, type TemplateModel } from './placeholders';
import { QUANTITY, readCents, readNumber } from './totals';

export interface EmptyFormRequired {
  /** Names of the items the script would hide. */
  readonly hidden: ReadonlySet<string>;
  readonly present: number;
  /** The items that apply. */
  readonly total: number;
}

function readable(value: string, kind: string | undefined): boolean {
  if (kind === 'money') return readCents(value).kind === 'ok';
  if (kind === 'number') return readNumber(value, QUANTITY).kind === 'ok';
  return true;
}

export function emptyFormRequired(model: TemplateModel): EmptyFormRequired {
  const fields = new Map(model.fields.map((field) => [field.name, field]));
  const valueOf = (name: string): string => fields.get(name)?.defaultValue ?? '';
  const hidden = new Set<string>();
  let present = 0;
  let total = 0;
  for (const item of requiredItems(model)) {
    if (item.requiredAbove !== undefined && !(0 > item.requiredAbove)) {
      hidden.add(item.name);
      continue;
    }
    total++;
    let ok = false;
    if (item.name !== 'lines') {
      const field = fields.get(item.name);
      const value = valueOf(item.name);
      ok = value.trim() !== '' && readable(value, field?.kind);
      if (!ok && field?.follows !== undefined) ok = valueOf(field.follows).trim() !== '';
    }
    if (ok) {
      hidden.add(item.name);
      present++;
    }
  }
  return { hidden, present, total };
}
