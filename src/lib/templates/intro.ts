/**
 * The text above a fillable template's form (WP-50a, item 4).
 *
 * A template's markdown opens with an italic note for the document as a file: "Make a copy, rename
 * it to the invoice number, replace everything in [SQUARE BRACKETS], then export to PDF." That is
 * right for the markdown, and stays in the document view (`TEMPLATES_FILLABLE` off), but above the
 * web form it sends a first-time reader looking for a file to copy (WP-50 audit, flow 5).
 *
 * So on the form page each such note gives way to a short line about the form, from the dictionary
 * (`templates.items.<slug>.formHowTo`). The first note keeps its place and id and takes the new
 * text; any further note before the sheet goes. A template with no note (the tax invoice) is left
 * as it is. Pure, so `tests/unit/templates/intro.test.ts` runs it on all five templates in both
 * languages.
 */
import type { Block } from '../content/schema';
import type { TemplateSlug } from './draft';

/** The templates whose markdown has a "how to use this file" note, with their form line's key. */
export const FORM_HOW_TO_KEYS = {
  quotation: 'templates.items.quotation.formHowTo',
  invoice: 'templates.items.invoice.formHowTo',
  receipt: 'templates.items.receipt.formHowTo',
  'privacy-notice': 'templates.items.privacy-notice.formHowTo',
} as const satisfies Partial<Record<TemplateSlug, string>>;

export type FormHowToKey = (typeof FORM_HOW_TO_KEYS)[keyof typeof FORM_HOW_TO_KEYS];

/** The dictionary key of `slug`'s form line, or `undefined` for a template without a note. */
export function formHowToKey(slug: TemplateSlug): FormHowToKey | undefined {
  return slug in FORM_HOW_TO_KEYS
    ? FORM_HOW_TO_KEYS[slug as keyof typeof FORM_HOW_TO_KEYS]
    : undefined;
}

/**
 * `before` (the blocks above the sheet) for the form page: the first `note` block now says `text`,
 * and every later `note` block is left out. Without a `text`, the notes are left out and nothing
 * takes their place.
 */
export function formIntro(before: readonly Block[], text: string | undefined): Block[] {
  let replaced = false;
  return before.flatMap((block): Block[] => {
    if (block.kind !== 'note') return [block];
    if (replaced || text === undefined) return [];
    replaced = true;
    return [{ ...block, c: [{ t: 'text', v: text }] }];
  });
}
