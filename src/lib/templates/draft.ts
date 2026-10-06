/**
 * A template draft on the device: what the reader typed into one template's form (WP-32).
 *
 * One key per template, `st.template.<slug>.v1`, through WP-30's `persistentValue`. A draft holds
 * only what differs from the template's own defaults, so a list the reader never touched still
 * shows the template's lines in the page's language, and a later wording change in the markdown
 * reaches them.
 *
 * Values are kept as typed (`"1 500,50"` stays that string): a draft restores exactly what the
 * reader saw, and the totals are worked out from it each time.
 */
import * as z from 'zod/mini';
import { persistentValue, type PersistentStore, type Schema } from '../store';
import { lineResult, QUANTITY, readCents, readNumber, type LineInput } from './totals';

/** The five template slugs, the last part of each template's route. */
export const TEMPLATE_SLUGS = [
  'quotation',
  'invoice',
  'tax-invoice',
  'receipt',
  'privacy-notice',
] as const;
export type TemplateSlug = (typeof TEMPLATE_SLUGS)[number];

export function isTemplateSlug(value: string): value is TemplateSlug {
  return (TEMPLATE_SLUGS as readonly string[]).includes(value);
}

/** Line rows each form renders. Rows past the template's own are revealed by "Add line". */
export const MAX_LINES = 10;

export interface Draft {
  /** Field name → value, for every field whose value is not its default. */
  readonly values: Readonly<Record<string, string>>;
  /** The line rows shown, in order. */
  readonly lines: readonly LineInput[];
}

export const EMPTY_DRAFT: Draft = { values: {}, lines: [] };

const lineSchema = z.object({
  description: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
});

/** The longest value a draft keeps for one field. */
export const MAX_VALUE_LENGTH = 5000;

/**
 * One schema object for every draft key, so `persistentValue` sees one owner per key.
 *
 * Lenient by entry, like `entriesOf` in the store (review WP-32 pass 1, blocker 1): a value that is
 * not a string, or is too long, and a line that is not three strings, are dropped and the rest of
 * the draft is kept. Only a draft that is not an object at all is reset as a whole.
 */
export const draftSchema: Schema<Draft> = {
  safeParse(data) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { success: false };
    }
    const raw = data as { values?: unknown; lines?: unknown };
    const values: Record<string, string> = {};
    if (typeof raw.values === 'object' && raw.values !== null && !Array.isArray(raw.values)) {
      for (const [name, value] of Object.entries(raw.values)) {
        // Too long: keep what fits rather than lose the whole field (review pass 2, minor 2).
        if (typeof value === 'string') values[name] = value.slice(0, MAX_VALUE_LENGTH);
      }
    }
    const lines: LineInput[] = [];
    if (Array.isArray(raw.lines)) {
      for (const line of raw.lines) {
        const parsed = lineSchema.safeParse(line);
        if (parsed.success && lines.length < MAX_LINES) lines.push(parsed.data);
      }
    }
    return { success: true, data: { values, lines } };
  },
};

/**
 * Removes values a form cannot use from a draft (an amount or quantity over the limits in
 * `totals.ts`, from an older version or edited by hand): the field goes back to its default and
 * everything else is kept. `kinds` names the fields that hold numbers. Returns the names dropped.
 */
export function dropOutOfRange(
  draft: Draft,
  kinds: Readonly<Record<string, 'money' | 'number'>>,
): { draft: Draft; dropped: string[] } {
  const dropped: string[] = [];
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(draft.values)) {
    const kind = kinds[name];
    const read =
      kind === 'money' ? readCents(value) : kind ? readNumber(value, QUANTITY) : undefined;
    if (read?.kind === 'invalid' && read.problem === 'tooLarge') dropped.push(name);
    else values[name] = value;
  }
  const lines = draft.lines.map((line, index) => {
    const result = lineResult(line);
    if (result.quantityProblem !== 'tooLarge' && result.priceProblem !== 'tooLarge') return line;
    dropped.push(`lines.${index}`);
    return {
      description: line.description,
      quantity: result.quantityProblem === 'tooLarge' ? '' : line.quantity,
      unitPrice: '',
    };
  });
  return { draft: { values, lines }, dropped };
}

export const draftKey = (slug: TemplateSlug): string => `st.template.${slug}.v1`;

/** The draft store for one template. Calling it twice returns the same store. */
export function templateDraft(slug: TemplateSlug): PersistentStore<Draft> {
  return persistentValue<Draft>(draftKey(slug), draftSchema, EMPTY_DRAFT);
}

/** A line with nothing typed in it (a quantity alone is not something typed). */
export function isEmptyLine(line: LineInput): boolean {
  return line.description.trim() === '' && line.unitPrice.trim() === '';
}

/**
 * The draft for the values the form holds now: only values that differ from their defaults, and
 * the shown lines without empty ones at the end.
 */
export function draftFrom(
  values: Readonly<Record<string, string>>,
  defaults: Readonly<Record<string, string>>,
  lines: readonly LineInput[],
): Draft {
  const changed: Record<string, string> = {};
  for (const [name, value] of Object.entries(values)) {
    if (value !== (defaults[name] ?? '')) changed[name] = value;
  }
  const kept = [...lines];
  while (kept.length > 0 && isEmptyLine(kept[kept.length - 1] as LineInput)) kept.pop();
  return { values: changed, lines: kept.slice(0, MAX_LINES) };
}

/** The value of each field: the draft's, else the default. */
export function valuesOf(
  draft: Draft,
  defaults: Readonly<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = { ...defaults };
  for (const [name, value] of Object.entries(draft.values)) {
    if (name in defaults) out[name] = value;
  }
  return out;
}

/**
 * The draft for "Start next": the carried fields keep their values, the number moves on, and
 * everything else goes back to its default.
 */
export function nextDraft(
  values: Readonly<Record<string, string>>,
  defaults: Readonly<Record<string, string>>,
  carry: readonly string[],
  numberField: string,
  number: string,
): Draft {
  const next: Record<string, string> = { ...defaults };
  for (const name of carry) {
    const value = values[name];
    if (value !== undefined) next[name] = value;
  }
  next[numberField] = number;
  return draftFrom(next, defaults, []);
}

/**
 * Fills empty fields from business details (the reader's profile, WP-31). Returns the new values and
 * the names it filled; a field that already has a value is never overwritten.
 */
export function prefill(
  values: Readonly<Record<string, string>>,
  fields: readonly { readonly name: string; readonly profileKey?: string | undefined }[],
  details: Readonly<Record<string, string | undefined>> | null,
): { values: Record<string, string>; filled: string[] } {
  const out: Record<string, string> = { ...values };
  const filled: string[] = [];
  if (!details) return { values: out, filled };
  for (const field of fields) {
    if (!field.profileKey) continue;
    const value = details[field.profileKey]?.trim();
    if (!value || (out[field.name] ?? '').trim() !== '') continue;
    out[field.name] = value;
    filled.push(field.name);
  }
  return { values: out, filled };
}
