/**
 * The required items list as `<st-template-form>` leaves it for an empty form (WP-50a review pass
 * 10, M1 and m1). The page renders it in that state, so before the script it shows what the script
 * would, and nothing in it changes when the script runs on a first visit:
 *
 * - an item with a `requiredAbove` amount does not apply at a total of zero, so it is hidden;
 * - an item whose field has a default (or follows one that has) is present, so it is hidden;
 * - the "lines" item is never present on an empty form.
 *
 * The rules are the ones `<st-template-form>` uses (`required-rules.ts`), run on the form's
 * defaults; `templates.spec.ts` compares the two lists on every template. A saved draft or business
 * details can still change the list when the script runs.
 */
import { requiredItems, type TemplateModel } from './placeholders';
import { fieldPresent, requiredApplies } from './required-rules';

export interface EmptyFormRequired {
  /** Names of the items the script would hide. */
  readonly hidden: ReadonlySet<string>;
  readonly present: number;
  /** The items that apply. */
  readonly total: number;
}

export function emptyFormRequired(model: TemplateModel): EmptyFormRequired {
  const fields = new Map(model.fields.map((field) => [field.name, field]));
  const valueOf = (name: string): string => fields.get(name)?.defaultValue ?? '';
  const hidden = new Set<string>();
  let present = 0;
  let total = 0;
  for (const item of requiredItems(model)) {
    // An empty form's total is zero.
    if (!requiredApplies(item.requiredAbove, 0)) {
      hidden.add(item.name);
      continue;
    }
    total++;
    // An empty form has no lines.
    const field = fields.get(item.name);
    const ok =
      item.name !== 'lines' &&
      fieldPresent(
        valueOf(item.name),
        field?.kind,
        field?.follows === undefined ? undefined : valueOf(field.follows),
      );
    if (ok) {
      hidden.add(item.name);
      present++;
    }
  }
  return { hidden, present, total };
}
