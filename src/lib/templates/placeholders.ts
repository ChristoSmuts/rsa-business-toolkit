/**
 * From a template document to the form that fills it (WP-32, build plan C2).
 *
 * Pure: it takes a template `Doc` from `src/data/<lang>/docs/` and returns a `TemplateModel`, with no
 * Astro and no DOM, so `tests/unit/templates/placeholders.test.ts` runs it on all five templates in
 * both languages.
 *
 * A template document has three parts, split at its two `---` rules:
 * - `before`: what the document says about the template (how to use it, the rules to follow);
 * - `sheet`: the template itself, which becomes the form and the A4 preview;
 * - `after`: the guidance under it ("The seven things a full tax invoice must show").
 * `before` and `after` render as the document does. **The required-content rules a reader sees are
 * those blocks, from the markdown.** This module states no rule of its own: it only reads which
 * slots the template has and how the template words them.
 *
 * Every `[PLACEHOLDER]` in the sheet, and every sample value written as plain text (`QUO-0001`,
 * `R 0.00`, `4XXXXXXXXX`), becomes a field. Field names come from block ids and positions, never
 * from words, so the Afrikaans template, which has the same blocks in the same order, yields the
 * same names: a draft typed on one language's page opens on the other.
 *
 * - **Label**: a table row's label; a placeholder that stands alone on its line is its own label
 *   ("Customer name"); one inside a sentence is labelled by the sentence, with "…" where the value
 *   goes ("Deposit of …% before work starts."). Business details carry a `profileKey`, and the page
 *   labels those from the dictionary, because the same field appears in five templates and in the
 *   reader's profile (WP-31).
 * - **Required**: every slot the template asks to fill, except a nested `[If a company: …]` line and
 *   an instruction placeholder in running text (`[Customer VAT number, if they are a vendor — …]`,
 *   `[State your late payment terms here.]`), which the template words as conditional or optional.
 * - **Hint**: the template's own words about a slot: an instruction placeholder, the italic note
 *   next to a list, the text of the nested company line.
 */
import type { Block, Doc, InlineRun, PlaceholderRun } from '../content/schema';

/** Business details the reader's profile can fill (WP-31) and the dictionary labels. */
export const PROFILE_KEYS = [
  'businessName',
  'ownerName',
  'phone',
  'email',
  'address',
  'registeredName',
  'registrationNumber',
  'vatNumber',
] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];

export type FieldKind = 'text' | 'email' | 'tel' | 'date' | 'number' | 'money' | 'list';

export interface TemplateField {
  /** The form control's `name`, the key in the draft, the same in every language. */
  readonly name: string;
  readonly kind: FieldKind;
  /** How the template words this slot. For a `profileKey` field the page uses the dictionary. */
  readonly label: string;
  readonly profileKey?: ProfileKey;
  /**
   * The template names this business detail itself (`Information Officer: [Your full name]`,
   * `VAT Registration Number: 4XXXXXXXXX`), so the page shows `label` and not the dictionary's
   * name for the profile field.
   */
  readonly ownLabel?: true;
  /** The group (`TemplateGroup.id`) the field is filled in under. */
  readonly group: string;
  readonly required: boolean;
  /** The template's own guidance for this slot, shown under the control. */
  readonly hint?: string;
  /** What the template shows in the slot: `[Customer name]`, `QUO-0001`, `R 0.00`. */
  readonly sample: string;
  /** The value before the reader types anything: the template's number, or a list's own lines. */
  readonly defaultValue: string;
  /** Suggestions the template offers (`[EFT / PayShap / Cash / Card]`). */
  readonly options?: readonly string[];
  /** Kept by "Start next": business details and bank details. */
  readonly carry: boolean;
  /** The document's own number, which "Start next" increments. */
  readonly documentNumber?: true;
  /** While this field is empty it shows the value of the named field (the payment reference). */
  readonly follows?: string;
  /**
   * The template's own condition for an optional slot ("If a company: …", "if they are a vendor —
   * required on invoices over R5,000"). The page shows it in place of "(optional)", so the form
   * never says less than the template (review WP-32 pass 1, major 4).
   */
  readonly condition?: string;
  /**
   * The slot is required once the document's total is above this many cents, as the template's
   * condition says ("required on invoices over R5,000").
   */
  readonly requiredAbove?: number;
  /** Printed before the value on the sheet, when the template's slot is all instruction. */
  readonly printLabel?: string;
}

export type GroupRole = 'business' | 'details' | 'section';

/**
 * What a group of the form shows, in the template's order: a field, the template's own text (a
 * paragraph with no slot, such as "We do not sell your information." or the signature lines), or
 * the line items. The text is there so the form, printed without JavaScript, is the whole document.
 */
export type GroupItem =
  | { readonly kind: 'field'; readonly name: string }
  | {
      readonly kind: 'text';
      readonly block: Extract<SheetBlock, { kind: 'paragraph' }>;
      /**
       * The control that leaves this paragraph off the document, when it can be left off: every
       * paragraph of the template's own text except signature lines. The privacy notice asks the
       * reader to "delete any line that is not true for your business" (review pass 1, minor 5).
       */
      readonly omit?: string;
    }
  | { readonly kind: 'lines' };

export interface TemplateGroup {
  /** A heading id for a section of the template, else `business` or `details`. */
  readonly id: string;
  readonly role: GroupRole;
  /** The heading's text, for a `section` group. The page names the other two. */
  readonly label?: string;
  readonly fields: readonly string[];
  readonly items: readonly GroupItem[];
  /** The group holds the line items. */
  readonly lines?: true;
}

export type TotalKind = 'subtotal' | 'vat' | 'total';

export interface TotalRow {
  readonly kind: TotalKind;
  readonly label: readonly InlineRun[];
}

export interface LineItems {
  readonly group: string;
  /** The table's column headings: description, quantity, unit price, amount. */
  readonly header: readonly (readonly InlineRun[])[];
  /** How many item rows the template shows. */
  readonly rows: number;
  /** The description's placeholder text (`Item or service`). */
  readonly sample: string;
  /** The quantity the template writes in each row. */
  readonly quantity: string;
  readonly totals: readonly TotalRow[];
  /** The percentage in the VAT row (`VAT @ 15%`), when the template has one. */
  readonly vatRate?: number;
  /** The label of the required item "at least one line": the group's heading. */
  readonly label: string;
}

/** An inline run of the sheet: the document's runs, with every slot replaced by its field. */
export type SheetRun =
  | InlineRun
  | { readonly t: 'field'; readonly name: string }
  | { readonly t: 'sheet-strong'; readonly c: readonly SheetRun[] };

export interface SheetLine {
  readonly runs: readonly SheetRun[];
  /** Shown only while one of these optional fields has a value. */
  readonly when?: readonly string[];
}

export type SheetBlock =
  | { readonly kind: 'heading'; readonly id: string; readonly c: readonly InlineRun[] }
  | { readonly kind: 'paragraph'; readonly id: string; readonly lines: readonly SheetLine[] }
  | {
      readonly kind: 'details';
      readonly id: string;
      readonly rows: readonly { readonly label: readonly InlineRun[]; readonly value: SheetLine }[];
    }
  | { readonly kind: 'lines'; readonly id: string }
  | {
      readonly kind: 'list';
      readonly id: string;
      readonly name: string;
      readonly ordered: boolean;
    };

export interface TemplateModel {
  /** The document's own title line (`QUOTATION`, `BELASTINGFAKTUUR`), printed at the top. */
  readonly title: string;
  readonly before: readonly Block[];
  readonly sheet: readonly SheetBlock[];
  readonly after: readonly Block[];
  readonly groups: readonly TemplateGroup[];
  readonly fields: readonly TemplateField[];
  readonly lines?: LineItems;
  /** The document number's field name, when the template has one. */
  readonly numberField?: string;
}

/** `QUO-0001`, `INV-0001`, `REC-0001`: a document number written as a sample. */
const DOC_NUMBER = /\b\p{Lu}{2,5}-\d{3,}\b/u;
/** `R 0.00`: an amount written as a sample. */
const MONEY = /\bR ?\d[\d ]*\.\d{2}\b/;
/** `4XXXXXXXXX`: a registration number written as a digit and a row of X. */
const ID_NUMBER = /\b\dX{5,}\b/;
const SAMPLE = new RegExp(`${DOC_NUMBER.source}|${MONEY.source}|${ID_NUMBER.source}`, 'u');
const DATE_FORMAT = /\bDD\b/;

/** Text of runs with every placeholder in its brackets: what the template shows. */
export function runsText(runs: readonly InlineRun[]): string {
  return runs
    .map((run) => {
      switch (run.t) {
        case 'text':
        case 'code':
          return run.v;
        case 'strong':
        case 'em':
          return runsText(run.c);
        case 'link':
          return runsText(run.c);
        case 'docref':
          return run.label;
        case 'placeholder':
          return `[${run.v}]`;
        case 'br':
          return '\n';
        case 'sigline':
          return '____';
      }
    })
    .join('');
}

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim();
const capitalise = (text: string): string =>
  text === '' ? text : text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** Splits a document into the text before the template, the template, and the guidance after. */
export function splitTemplate(blocks: readonly Block[]): {
  before: Block[];
  sheet: Block[];
  after: Block[];
} {
  const first = blocks.findIndex((block) => block.kind === 'hr');
  if (first === -1) return { before: [], sheet: [...blocks], after: [] };
  const rest = blocks.slice(first + 1);
  const second = rest.findIndex((block) => block.kind === 'hr');
  return {
    before: blocks.slice(0, first),
    sheet: second === -1 ? rest : rest.slice(0, second),
    after: second === -1 ? [] : rest.slice(second + 1),
  };
}

/** A slot found in a line: a placeholder run, or a sample value inside a text run. */
type Slot =
  | { readonly type: 'placeholder'; readonly run: PlaceholderRun }
  | { readonly type: 'sample'; readonly text: string };

const MARK_OPEN = '';
const MARK_CLOSE = '';
const marker = (index: number): string => `${MARK_OPEN}${index}${MARK_CLOSE}`;
const MARKERS = new RegExp(`${MARK_OPEN}(\\d+)${MARK_CLOSE}`, 'g');

/** Runs of one line with each slot replaced by a numbered stand-in, plus the slots in order. */
function collectSlots(runs: readonly InlineRun[], slots: Slot[]): SheetRun[] {
  const out: SheetRun[] = [];
  for (const run of runs) {
    if (run.t === 'placeholder') {
      slots.push({ type: 'placeholder', run });
      out.push({ t: 'field', name: marker(slots.length - 1) });
    } else if (run.t === 'text') {
      let rest = run.v;
      let match = SAMPLE.exec(rest);
      while (match) {
        if (match.index > 0) out.push({ t: 'text', v: rest.slice(0, match.index) });
        slots.push({ type: 'sample', text: match[0] });
        out.push({ t: 'field', name: marker(slots.length - 1) });
        rest = rest.slice(match.index + match[0].length);
        match = SAMPLE.exec(rest);
      }
      if (rest !== '') out.push({ t: 'text', v: rest });
    } else if (run.t === 'strong') {
      out.push({ t: 'sheet-strong', c: collectSlots(run.c, slots) });
    } else {
      out.push(run);
    }
  }
  return out;
}

/** Plain text of sheet runs, with each slot as its marker. */
function markedText(runs: readonly SheetRun[]): string {
  return runs
    .map((run) => {
      if (run.t === 'field') return run.name;
      if (run.t === 'sheet-strong') return markedText(run.c);
      return runsText([run]);
    })
    .join('');
}

const slotText = (slot: Slot): string =>
  slot.type === 'placeholder' ? `[${slot.run.v}]` : slot.text;

/** Splits a line at top-level `br` runs. */
function splitLines(runs: readonly InlineRun[]): InlineRun[][] {
  const lines: InlineRun[][] = [[]];
  for (const run of runs) {
    if (run.t === 'br') lines.push([]);
    else lines.at(-1)?.push(run);
  }
  return lines;
}

/** Replaces the stand-in names in sheet runs. */
function renameFields(runs: readonly SheetRun[], names: readonly string[]): SheetRun[] {
  return runs.map((run) => {
    if (run.t === 'field') {
      const index = Number(new RegExp(`${MARK_OPEN}(\\d+)${MARK_CLOSE}`).exec(run.name)?.[1]);
      return { t: 'field', name: names[index] ?? run.name };
    }
    if (run.t === 'sheet-strong') return { t: 'sheet-strong', c: renameFields(run.c, names) };
    return run;
  });
}

/**
 * The parts of a nested company line: `[If a company: Trading as a name of [REGISTERED NAME] (Pty)
 * Ltd, Reg. No. [NUMBER] — this is required by law]`. `printed` is what goes on the document,
 * between the condition before the first colon and the note after the last dash.
 */
export function splitNested(value: string): {
  condition: string;
  printed: Array<{ type: 'text'; v: string } | { type: 'slot'; v: string }>;
  note: string;
} {
  const firstBracket = value.indexOf('[');
  const colon = value.indexOf(': ');
  const hasCondition = colon !== -1 && (firstBracket === -1 || colon < firstBracket);
  const condition = hasCondition ? value.slice(0, colon).trim() : '';
  let body = hasCondition ? value.slice(colon + 2) : value;
  const lastBracket = body.lastIndexOf(']');
  const dash = body.indexOf(' — ', lastBracket === -1 ? 0 : lastBracket);
  const note = dash === -1 ? '' : body.slice(dash + 3).trim();
  if (dash !== -1) body = body.slice(0, dash);
  const printed: Array<{ type: 'text'; v: string } | { type: 'slot'; v: string }> = [];
  for (const part of body.split(/(\[[^\]]+\])/)) {
    if (part === '') continue;
    if (part.startsWith('[') && part.endsWith(']'))
      printed.push({ type: 'slot', v: part.slice(1, -1) });
    else printed.push({ type: 'text', v: part });
  }
  return { condition, printed, note };
}

/** `Last updated` for `Last updated: [DD Month YYYY]`: the words before a colon that ends in the slot. */
function colonLabel(sentence: string, mark: string): string | undefined {
  const match = new RegExp(`^(.*?):\\s*${mark}\\s*$`).exec(sentence);
  const label = match?.[1] ? collapse(match[1]) : '';
  return label === '' || label.includes(MARK_OPEN) ? undefined : label;
}

function runsHaveSigline(runs: readonly InlineRun[]): boolean {
  return runs.some(
    (run) =>
      run.t === 'sigline' || ((run.t === 'strong' || run.t === 'em') && runsHaveSigline(run.c)),
  );
}

/** The sentence of `text` that holds `mark`. */
function sentenceAround(text: string, mark: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.find((sentence) => sentence.includes(mark)) ?? text;
}

interface GroupDraft {
  role: GroupRole;
  label?: string;
  fields: string[];
  items: GroupItem[];
  lines?: true;
}

interface Builder {
  readonly fields: TemplateField[];
  readonly groups: Map<string, GroupDraft>;
  numberField?: string;
  numberSample?: string;
}

/** Adds a field to its group, once: a slot the template repeats is one field, filled once. */
function addField(builder: Builder, field: TemplateField): string {
  const existing = builder.fields.find((candidate) => candidate.name === field.name);
  if (!existing) builder.fields.push(field);
  const group = builder.groups.get(existing?.group ?? field.group);
  if (group && !group.fields.includes(field.name)) {
    group.fields.push(field.name);
    group.items.push({ kind: 'field', name: field.name });
  }
  return field.name;
}

function ensureGroup(builder: Builder, id: string, role: GroupRole, label?: string): void {
  if (!builder.groups.has(id)) {
    builder.groups.set(
      id,
      label === undefined
        ? { role, fields: [], items: [] }
        : { role, label, fields: [], items: [] },
    );
  }
}

const IDENTITY_KIND: Partial<Record<ProfileKey, FieldKind>> = { email: 'email', phone: 'tel' };

function isProfileKey(key: string | undefined): key is ProfileKey {
  return (PROFILE_KEYS as readonly string[]).includes(key ?? '');
}

/** A field for one slot of a paragraph line. */
function paragraphField(
  slot: Slot,
  context: {
    name: string;
    group: string;
    lineText: string;
    mark: string;
    pure: boolean;
    slots: readonly Slot[];
  },
): TemplateField {
  const { name, group, lineText, mark, pure, slots } = context;
  if (slot.type === 'sample') {
    const vat = ID_NUMBER.test(slot.text);
    return {
      name: vat ? 'vatNumber' : name,
      kind: MONEY.test(slot.text) ? 'money' : 'text',
      label: collapse(sentenceAround(lineText, mark).replace(mark, '').replace(/:\s*$/, '')),
      ...(vat ? { profileKey: 'vatNumber' as const, ownLabel: true as const } : {}),
      group,
      required: true,
      sample: slot.text,
      defaultValue: '',
      carry: vat,
    };
  }
  const run = slot.run;
  if (run.style === 'identity' && isProfileKey(run.key)) {
    const named = pure ? undefined : colonLabel(sentenceAround(lineText, mark), mark);
    return {
      name: run.key,
      kind: IDENTITY_KIND[run.key] ?? 'text',
      label: named ?? capitalise(collapse(run.v)),
      profileKey: run.key,
      ...(named ? { ownLabel: true as const } : {}),
      group,
      required: true,
      sample: `[${run.v}]`,
      defaultValue: '',
      carry: true,
    };
  }
  const kind: FieldKind =
    run.style === 'format' ? (DATE_FORMAT.test(run.v) ? 'date' : 'number') : 'text';
  const instruction = run.style === 'instruction';
  let label: string;
  let hint: string | undefined;
  if (pure) {
    if (instruction) {
      label = collapse(run.v.split(/, | — /)[0] ?? run.v).replace(/[.:]$/, '');
      if (label !== collapse(run.v)) hint = collapse(run.v);
    } else {
      label = capitalise(collapse(run.v));
    }
  } else if (instruction) {
    label = collapse(run.v).replace(/[.:]$/, '');
  } else {
    const sentence = sentenceAround(lineText, mark);
    // Other slots in the sentence show as the template writes them; this one as "…".
    const shown = (text: string): string =>
      text.replace(MARKERS, (found, index: string) => {
        const other = slots[Number(index)];
        return found === mark || !other ? '…' : slotText(other);
      });
    const colon = new RegExp(`^(.*?):\\s*${mark}\\s*$`).exec(sentence);
    label = collapse(shown(colon?.[1] ?? sentence));
  }
  const condition = instruction && hint ? hint : undefined;
  const above = condition ? thresholdCents(condition) : undefined;
  return {
    name,
    kind,
    label,
    group,
    required: !instruction,
    ...(hint ? { hint } : {}),
    ...(condition ? { condition } : {}),
    ...(above === undefined ? {} : { requiredAbove: above }),
    // A slot that is all instruction prints its value under a label from the template's words.
    ...(instruction && pure && hint ? { printLabel: label } : {}),
    sample: `[${run.v}]`,
    defaultValue: '',
    carry: false,
  };
}

/**
 * `R5,000` in a condition, as cents. The templates write thresholds the English way (a comma for
 * thousands), byte-identical in every language, so this does not depend on the page's language.
 */
export function thresholdCents(text: string): number | undefined {
  const match = /\bR ?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?\b/.exec(text);
  if (!match?.[1]) return undefined;
  return Number(match[1].replace(/,/g, '')) * 100 + Number(match[2] ?? 0);
}

function parseParagraph(
  builder: Builder,
  block: Extract<Block, { kind: 'paragraph' }>,
  group: () => string,
): Extract<SheetBlock, { kind: 'paragraph' }> {
  const lines: SheetLine[] = [];
  let slotIndex = 0;
  splitLines(block.c).forEach((lineRuns) => {
    const slots: Slot[] = [];
    const marked = collectSlots(lineRuns, slots);
    const lineText = markedText(marked);
    const pure = !/\p{L}/u.test(lineText.replace(MARKERS, ''));
    const names: string[] = [];
    const optional: string[] = [];
    let required = false;
    const nestedRuns: SheetRun[] = [];
    slots.forEach((slot, index) => {
      const base = `${block.id}:${slotIndex++}`;
      if (slot.type === 'placeholder' && slot.run.nested) {
        const nested = splitNested(slot.run.v);
        const keys: ProfileKey[] = ['registeredName', 'registrationNumber'];
        const slotsInside = nested.printed.filter((part) => part.type === 'slot');
        const hint = collapse(slot.run.v);
        let inner = 0;
        for (const part of nested.printed) {
          if (part.type === 'text') {
            nestedRuns.push({ t: 'text', v: part.v });
            continue;
          }
          const key = slotsInside.length === keys.length ? keys[inner] : undefined;
          const name = key ?? `${base}.${inner}`;
          inner++;
          addField(builder, {
            name,
            kind: 'text',
            label: capitalise(collapse(part.v.toLocaleLowerCase())),
            ...(key ? { profileKey: key } : {}),
            group: group(),
            required: false,
            hint,
            condition: hint,
            sample: `[${part.v}]`,
            defaultValue: '',
            carry: true,
          });
          optional.push(name);
          nestedRuns.push({ t: 'field', name });
        }
        names.push('');
        return;
      }
      const field = paragraphField(slot, {
        name: base,
        group: group(),
        lineText,
        mark: marker(index),
        pure,
        slots,
      });
      names.push(addField(builder, field));
      const stored = builder.fields.find((candidate) => candidate.name === field.name);
      if (stored?.required) required = true;
      else optional.push(field.name);
    });
    // A nested company line prints only its middle part, with its own fields.
    const printLabel =
      slots.length === 1 && names[0]
        ? builder.fields.find((candidate) => candidate.name === names[0])?.printLabel
        : undefined;
    const runs: SheetRun[] =
      nestedRuns.length > 0 && slots.length === 1
        ? nestedRuns
        : printLabel
          ? [{ t: 'text', v: `${printLabel}: ` }, ...renameFields(marked, names)]
          : renameFields(marked, names);
    const hasRequired = required;
    lines.push(!hasRequired && optional.length > 0 ? { runs, when: optional } : { runs });
  });
  return { kind: 'paragraph', id: block.id, lines };
}

function isLineItems(block: Extract<Block, { kind: 'table' }>): boolean {
  if (block.header.length < 3) return false;
  return block.rows.some(
    (row) =>
      MONEY.test(runsText(row.at(-1) ?? [])) &&
      (row[0] ?? []).some((run) => run.t === 'placeholder'),
  );
}

function parseLineItems(
  builder: Builder,
  block: Extract<Block, { kind: 'table' }>,
  group: string,
  label: string,
): LineItems {
  const items = block.rows.filter((row) => (row[0] ?? []).some((run) => run.t === 'placeholder'));
  const totalRows = block.rows.filter((row) => !items.includes(row));
  const kinds: TotalKind[] =
    totalRows.length >= 3
      ? ['subtotal', 'vat', 'total']
      : totalRows.length === 2
        ? ['subtotal', 'total']
        : ['total'];
  const totals = totalRows.map((row, index) => ({
    kind: kinds[index] ?? 'total',
    label: row[0] ?? [],
  }));
  const vatRow = totals.find((row) => row.kind === 'vat');
  const rate = vatRow ? /(\d+(?:\.\d+)?)\s*%/.exec(runsText(vatRow.label))?.[1] : undefined;
  const firstItem = items[0] ?? [];
  const placeholder = firstItem[0]?.find((run): run is PlaceholderRun => run.t === 'placeholder');
  const entry = builder.groups.get(group);
  if (entry) {
    entry.lines = true;
    entry.items.push({ kind: 'lines' });
  }
  return {
    group,
    header: block.header,
    rows: items.length,
    sample: placeholder?.v ?? '',
    quantity: collapse(runsText(firstItem[1] ?? [])),
    totals,
    ...(rate ? { vatRate: Number(rate) } : {}),
    label,
  };
}

function parseDetails(
  builder: Builder,
  block: Extract<Block, { kind: 'table' }>,
  group: string,
  inIntro: boolean,
): SheetBlock {
  const rows = block.rows.map((row, rowIndex) => {
    const label = row[0] ?? [];
    const labelText = collapse(runsText(label));
    const slots: Slot[] = [];
    const marked = collectSlots(row[1] ?? [], slots);
    const names = slots.map((slot, index) => {
      const name = `${block.id}:r${rowIndex}${slots.length > 1 ? `.${index}` : ''}`;
      if (slot.type === 'sample') {
        const isNumber = DOC_NUMBER.test(slot.text) && MONEY.exec(slot.text) === null;
        if (isNumber && builder.numberField === undefined) {
          builder.numberField = name;
          builder.numberSample = slot.text;
          return addField(builder, {
            name,
            kind: 'text',
            label: labelText,
            group,
            required: true,
            sample: slot.text,
            defaultValue: slot.text,
            carry: false,
            documentNumber: true,
          });
        }
        const follows =
          isNumber && slot.text === builder.numberSample ? builder.numberField : undefined;
        return addField(builder, {
          name,
          kind: MONEY.test(slot.text) ? 'money' : 'text',
          label: labelText,
          group,
          required: true,
          sample: slot.text,
          defaultValue: '',
          carry: false,
          ...(follows ? { follows } : {}),
        });
      }
      const run = slot.run;
      const instruction = run.style === 'instruction';
      const choice = run.style === 'choice';
      return addField(builder, {
        name,
        kind: run.style === 'format' ? (DATE_FORMAT.test(run.v) ? 'date' : 'number') : 'text',
        label: labelText,
        group,
        required: true,
        ...(instruction ? { hint: collapse(run.v) } : {}),
        sample: `[${run.v}]`,
        defaultValue: '',
        ...(choice ? { options: run.v.split(' / ').map(collapse) } : {}),
        carry: !inIntro,
      });
    });
    return { label, value: { runs: renameFields(marked, names) } };
  });
  return { kind: 'details', id: block.id, rows };
}

function parseList(
  builder: Builder,
  block: Extract<Block, { kind: 'list' }>,
  group: string,
  label: string,
  note: string | undefined,
): SheetBlock {
  const placeholders = block.items.flatMap((item) =>
    item.filter((run): run is PlaceholderRun => run.t === 'placeholder'),
  );
  const filled = placeholders.length === 0;
  const hints = [...new Set(placeholders.map((run) => collapse(run.v)))];
  const hint = [note, ...(filled ? [] : hints.slice(0, 1))].filter(Boolean).join(' ');
  addField(builder, {
    name: block.id,
    kind: 'list',
    label,
    group,
    required: true,
    ...(hint ? { hint } : {}),
    sample: placeholders[0] ? `[${placeholders[0].v}]` : '',
    defaultValue: filled ? block.items.map((item) => collapse(runsText(item))).join('\n') : '',
    carry: false,
  });
  return { kind: 'list', id: block.id, name: block.id, ordered: block.ordered };
}

/** The form and preview for one template document. */
export function parseTemplate(doc: Pick<Doc, 'h1' | 'blocks'>): TemplateModel {
  const { before, sheet, after } = splitTemplate(doc.blocks);
  const builder: Builder = { fields: [], groups: new Map() };
  const out: SheetBlock[] = [];
  let heading: { id: string; text: string } | undefined;
  let lines: LineItems | undefined;
  /** The group the last block went into: where a paragraph with no slot belongs. */
  let current: string | undefined;

  const groupFor = (role: 'business' | 'details'): string => {
    if (heading) {
      ensureGroup(builder, heading.id, 'section', heading.text);
      current = heading.id;
      return heading.id;
    }
    ensureGroup(builder, role, role);
    current = role;
    return role;
  };

  sheet.forEach((block, index) => {
    switch (block.kind) {
      case 'heading': {
        heading = { id: block.id, text: collapse(runsText(block.c)) };
        ensureGroup(builder, block.id, 'section', heading.text);
        current = block.id;
        out.push({ kind: 'heading', id: block.id, c: block.c });
        return;
      }
      case 'paragraph': {
        const hasSlot = splitLines(block.c).some((line) => {
          const slots: Slot[] = [];
          collectSlots(line, slots);
          return slots.length > 0;
        });
        const parsed = parseParagraph(builder, block, () => groupFor('business'));
        out.push(parsed);
        if (!hasSlot && parsed.kind === 'paragraph') {
          builder.groups
            .get(current ?? groupFor('business'))
            ?.items.push(
              runsHaveSigline(block.c)
                ? { kind: 'text', block: parsed }
                : { kind: 'text', block: parsed, omit: `omit:${block.id}` },
            );
        }
        return;
      }
      case 'table': {
        if (isLineItems(block)) {
          const group = groupFor('details');
          lines = parseLineItems(builder, block, group, heading?.text ?? '');
          out.push({ kind: 'lines', id: block.id });
          return;
        }
        out.push(parseDetails(builder, block, groupFor('details'), heading === undefined));
        return;
      }
      case 'list': {
        const previous = sheet[index - 1];
        const next = sheet[index + 1];
        const noteOf = (candidate: Block | undefined): string | undefined =>
          candidate?.kind === 'note' ? collapse(runsText(candidate.c)) : undefined;
        const note = noteOf(previous) ?? noteOf(next);
        out.push(parseList(builder, block, groupFor('details'), heading?.text ?? '', note));
        return;
      }
      default:
        // Notes in the sheet are instructions to the reader (shown as hints), not printed text.
        return;
    }
  });

  // Every heading of the template is a group, even one with only text (the signature lines,
  // "Marketing"), so its anchor exists on the page.
  const groups: TemplateGroup[] = [...builder.groups.entries()]
    .filter(([, group]) => group.role === 'section' || group.items.length > 0)
    .map(([id, group]) => ({
      id,
      role: group.role,
      ...(group.label === undefined ? {} : { label: group.label }),
      fields: group.fields,
      items: group.items,
      ...(group.lines ? { lines: true as const } : {}),
    }));
  return {
    title: doc.h1,
    before,
    sheet: out,
    after,
    groups,
    fields: builder.fields,
    ...(lines ? { lines } : {}),
    ...(builder.numberField ? { numberField: builder.numberField } : {}),
  };
}

/** The required items a reader is told about: every required field, plus "at least one line". */
export interface RequiredItem {
  readonly name: string;
  readonly label: string;
  /** Counted only once the total is above this many cents (`TemplateField.requiredAbove`). */
  readonly requiredAbove?: number;
  /** Set when the page names the item from the dictionary (`templates.fields.<key>`). */
  readonly profileKey?: ProfileKey;
}

export function requiredItems(model: TemplateModel): RequiredItem[] {
  const items: RequiredItem[] = [];
  for (const group of model.groups) {
    for (const name of group.fields) {
      const field = model.fields.find((candidate) => candidate.name === name);
      if (!field || (!field.required && field.requiredAbove === undefined)) continue;
      items.push({
        name,
        label: field.label,
        ...(field.profileKey && !field.ownLabel ? { profileKey: field.profileKey } : {}),
        ...(field.requiredAbove === undefined ? {} : { requiredAbove: field.requiredAbove }),
      });
    }
    if (group.lines && model.lines) items.push({ name: 'lines', label: model.lines.label });
  }
  return items;
}
