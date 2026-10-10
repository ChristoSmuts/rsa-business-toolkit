/*
 * <st-template-form>: a fillable template (WP-32, build plan B3 flow 5, C2).
 *
 * `TemplateTool.astro` renders everything: the form grouped like the template, `MAX_LINES` line
 * rows, the A4 preview with a `<span data-field>` per slot, the required items as links, the
 * buttons and the clear dialog. This element binds them and adds no markup of its own, except the
 * `<li>` items of a list in the preview, one per line of the reader's text (a result list).
 *
 * - **Draft.** Every change is saved to `st.template.<slug>.v1` (`templateDraft`), holding only
 *   what differs from the template's defaults; an empty draft removes the key. A value typed (or
 *   restored by the browser) before the module connected is the reader's and is kept. Another tab's
 *   change arrives through the store and is applied.
 * - **Preview.** Each slot shows what was typed, formatted for print (a date in the page's
 *   language, an amount with `formatRand`), or, while empty, the template's own words; an optional
 *   slot shows nothing and a line of only optional slots is hidden.
 * - **Totals.** Line amounts, subtotal, VAT at the template's rate and total, in whole cents
 *   (`src/lib/templates/totals.ts`), in the form's `aria-live` region and in the preview.
 * - **Soft validation.** "12 of 20 required items present" in a status line, and a link to each
 *   item still missing. Nothing blocks printing.
 * - **Actions.** Print (`window.print()`, the sheet-only print stylesheet does the rest), Start next
 *   (keeps business and bank details, increments the number), Clear (asks first).
 * - **Tabs.** Below the width where form and preview fit side by side, "Fill in" and "Preview" are
 *   ARIA tabs (arrow keys, Home, End); above it the tab roles are removed.
 */
import { formatRand, interpolate } from '../i18n';
import type { PersistentStore } from '../lib/store';
import {
  draftFrom,
  dropOutOfRange,
  EMPTY_DRAFT,
  isTemplateSlug,
  MAX_LINES,
  nextDraft,
  prefill,
  templateDraft,
  valuesOf,
  type Draft,
} from '../lib/templates/draft';
import { formatIsoDate } from '../lib/templates/format';
import { lineNames } from '../lib/templates/ids';
import { readBusinessDetails } from '../lib/templates/profile';
import { fieldPresent, requiredApplies } from '../lib/templates/required-rules';
import {
  lineBlocked,
  lineResult,
  nextNumber,
  QUANTITY,
  readCents,
  readNumber,
  toRand,
  totalsOf,
  type LineInput,
  type NumberProblem,
  type Totals,
} from '../lib/templates/totals';
import { announce, askToConfirm } from './confirm-dialog';
import './storage-notice';

type Control = HTMLInputElement | HTMLTextAreaElement;
type View = 'form' | 'preview';

const sameDraft = (a: Draft, b: Draft): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * `formatRand` that never throws. `totals.ts` already keeps every amount far below the limit
 * `formatRand` refuses, so this is the second guard: whatever was saved, render and connect must
 * not throw, or the page stays broken on every load (review WP-32 pass 1, blocker 1).
 */
export function safeRand(locale: 'en' | 'af', cents: number): string {
  try {
    return formatRand(locale, toRand(cents));
  } catch {
    return '';
  }
}

/** A control's value as the draft keeps it: a "Leave this out" box is `1` or empty. */
function valueOf(control: Control): string {
  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    return control.checked ? '1' : '';
  }
  return control.value;
}

function defaultOf(control: Control): string {
  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    return control.defaultChecked ? '1' : '';
  }
  return control.defaultValue;
}

function setValue(control: Control, value: string): void {
  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    control.checked = value === '1';
  } else if (control.value !== value) {
    control.value = value;
  }
}

export class StTemplateForm extends HTMLElement {
  #form: HTMLFormElement | null = null;
  #store: PersistentStore<Draft> | undefined;
  #controls = new Map<string, Control>();
  #defaults: Record<string, string> = {};
  #rows: HTMLElement[] = [];
  /** Line rows the template itself shows; more are revealed by "Add line". */
  #templateRows = 0;
  #shown = 0;
  #lastSaved: Draft = EMPTY_DRAFT;
  #lastStatus = '';
  #unsubscribe: (() => void) | undefined;
  #observer: ResizeObserver | undefined;
  #tabsActive = false;

  readonly #onInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (!target.name) return;
    this.#save();
    this.render();
  };

  readonly #onSubmit = (event: Event): void => {
    event.preventDefault();
  };

  readonly #onClick = (event: Event): void => {
    const target = event.target instanceof Element ? event.target : null;
    // A missing item's link: on a phone the form may be the hidden tab, so show it, then focus the
    // field (review pass 1, major 5).
    const link = target?.closest<HTMLAnchorElement>('[data-required-item] a');
    if (link && this.contains(link)) {
      event.preventDefault();
      this.goTo(link.hash.slice(1));
      return;
    }
    const button = target?.closest<HTMLElement>(
      '[data-add-line], [data-remove-line], [data-print], [data-clear], [data-start-next], [data-tab]',
    );
    if (!button || !this.contains(button)) return;
    if (button.hasAttribute('data-add-line')) this.addLine();
    else if (button.hasAttribute('data-remove-line'))
      this.removeLine(Number(button.dataset['removeLine']));
    else if (button.hasAttribute('data-print')) window.print();
    else if (button.hasAttribute('data-clear')) void this.#askToClear(button);
    else if (button.hasAttribute('data-start-next')) this.startNext();
    else if (button.dataset['tab']) this.select(button.dataset['tab'] as View);
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    const tab = event.target instanceof HTMLElement ? event.target.closest('[role="tab"]') : null;
    if (!tab || !this.contains(tab)) return;
    const order: View[] = ['form', 'preview'];
    const current = order.indexOf((tab as HTMLElement).dataset['tab'] as View);
    let next: View | undefined;
    const step = (by: number): View | undefined =>
      order[(current + by + order.length) % order.length];
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = step(1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = step(-1);
    else if (event.key === 'Home') next = 'form';
    else if (event.key === 'End') next = 'preview';
    if (!next) return;
    event.preventDefault();
    this.select(next, true);
  };

  connectedCallback(): void {
    const slug = this.dataset['template'] ?? '';
    this.#form = this.querySelector('form');
    if (!isTemplateSlug(slug) || !this.#form) return;
    this.#store = templateDraft(slug);

    this.#controls.clear();
    this.#defaults = {};
    for (const control of this.#form.querySelectorAll<Control>('input[name], textarea[name]')) {
      if (control.name.startsWith('lines.')) continue;
      this.#controls.set(control.name, control);
      this.#defaults[control.name] = defaultOf(control);
      // A date is a text field without JavaScript; with it, a date picker (pass 1, minor 8).
      if (
        control instanceof HTMLInputElement &&
        control.dataset['type'] === 'date' &&
        (control.value === '' || /^\d{4}-\d{2}-\d{2}$/.test(control.value))
      ) {
        control.type = 'date';
      }
    }
    // Exactly one sheet prints: without JavaScript the form, with it the preview (pass 1, major 1).
    this.#form.removeAttribute('data-print-sheet');
    this.querySelector('[data-sheet]')?.setAttribute('data-print-sheet', '');
    this.#rows = [...this.querySelectorAll<HTMLElement>('.st-tline')];
    this.#templateRows = this.#rows.filter((row) => !row.hasAttribute('data-extra')).length;

    // What the reader typed (or the browser restored) before the module connected wins over the
    // draft, the same rule as the checklist's.
    const typed = new Map<string, string>();
    for (const [name, control] of this.#controls) {
      if (valueOf(control) !== defaultOf(control)) typed.set(name, valueOf(control));
    }
    const typedLines = this.#readLines(this.#rows.length);
    const typedLineCount = lastUsed(typedLines) + 1;

    // An amount over the limits (an older draft, or one edited by hand) is dropped, the rest kept.
    const kinds: Record<string, 'money' | 'number'> = {};
    for (const [name, control] of this.#controls) {
      const kind = control.dataset['kind'];
      if (kind === 'money' || kind === 'number') kinds[name] = kind;
    }
    const { draft, dropped } = dropOutOfRange(this.#store.get(), kinds);
    const values = valuesOf(draft, this.#defaults);
    for (const [name, value] of typed) values[name] = value;
    const lines = typedLineCount > 0 ? typedLines.slice(0, typedLineCount) : draft.lines;

    const details = readBusinessDetails();
    const fields = [...this.#controls.values()].map((control) => ({
      name: control.name,
      profileKey: control.dataset['profileKey'],
    }));
    const filled = prefill(values, fields, details);

    this.#apply(filled.values, lines);
    this.#lastSaved = this.#store.get();
    if (typed.size > 0 || typedLineCount > 0 || filled.filled.length > 0 || dropped.length > 0) {
      this.#save();
    }
    if (filled.filled.length > 0) this.#say(this.dataset['prefilled'] ?? '');

    this.#form.addEventListener('input', this.#onInput);
    this.#form.addEventListener('submit', this.#onSubmit);
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeydown);
    this.#unsubscribe = this.#store.listen((next) => {
      if (sameDraft(next, this.#lastSaved)) return;
      // Another tab, or "Clear all my data": show what is stored now.
      this.#lastSaved = next;
      this.#apply(valuesOf(next, this.#defaults), next.lines);
    });
    if (typeof ResizeObserver === 'function') {
      this.#observer = new ResizeObserver(() => this.#updateTabs());
      this.#observer.observe(this);
    }
    this.#updateTabs();
    // Now the tabs, the preview and the buttons work: show them (`data-enhance`, utilities.css).
    this.dataset['ready'] = '';
  }

  disconnectedCallback(): void {
    delete this.dataset['ready'];
    this.querySelector('[data-sheet]')?.removeAttribute('data-print-sheet');
    this.#form?.setAttribute('data-print-sheet', '');
    this.#form?.removeEventListener('input', this.#onInput);
    this.#form?.removeEventListener('submit', this.#onSubmit);
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeydown);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#store = undefined;
  }

  /** The value of every field now, by name. */
  values(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, control] of this.#controls) out[name] = valueOf(control);
    return out;
  }

  /** Shows the form (the "Fill in" tab on a phone) and moves focus to the element `id`. */
  goTo(id: string): void {
    if (this.#tabsActive) this.select('form');
    const target = id ? this.ownerDocument.getElementById(id) : null;
    if (!target || !this.contains(target)) return;
    target.scrollIntoView?.({ block: 'center' });
    target.focus();
  }

  /** The line rows shown now. */
  lines(): LineInput[] {
    return this.#readLines(this.#shown);
  }

  /** Reveals the next line row and moves focus to its description. */
  addLine(): void {
    if (this.#shown >= Math.min(MAX_LINES, this.#rows.length)) return;
    this.#setShown(this.#shown + 1);
    this.#lineControl(this.#shown - 1, 'description')?.focus();
    this.#save();
    this.render();
  }

  /** Removes line `index`: the lines under it move up, and an extra row goes away. */
  removeLine(index: number): void {
    if (!(index >= 0 && index < this.#shown)) return;
    const lines = this.lines();
    lines.splice(index, 1);
    const shown = Math.max(this.#templateRows, this.#shown - 1);
    this.#writeLines(lines, shown);
    const focus =
      this.#lineControl(Math.min(index, this.#shown - 1), 'description') ??
      this.querySelector<HTMLElement>('[data-add-line]');
    focus?.focus();
    this.#save();
    this.render();
  }

  /** Keeps business and bank details, moves the number on and empties the rest. */
  startNext(): void {
    const numberControl = this.querySelector<Control>('[data-number]');
    if (!numberControl) return;
    const values = this.values();
    const current = values[numberControl.name] || this.#defaults[numberControl.name] || '';
    const number = nextNumber(current);
    const carry = [...this.#controls.values()]
      .filter((control) => control.hasAttribute('data-carry'))
      .map((control) => control.name);
    const draft = nextDraft(values, this.#defaults, carry, numberControl.name, number);
    this.#apply(valuesOf(draft, this.#defaults), []);
    this.#save();
    this.#say(interpolate(this.dataset['startNextDone'] ?? '', { number }));
  }

  /** Empties the form and the draft. */
  clear(): void {
    this.#form?.reset();
    this.#apply({ ...this.#defaults }, []);
    this.#lastSaved = EMPTY_DRAFT;
    this.#store?.reset();
    this.#say(this.dataset['clearDone'] ?? '');
  }

  /** Shows one pane while the tabs are in use. */
  select(view: View, focus = false): void {
    this.dataset['view'] = view;
    for (const tab of this.querySelectorAll<HTMLElement>('[role="tab"]')) {
      const selected = tab.dataset['tab'] === view;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    }
  }

  /** Writes the preview, the totals and the required items from the form. */
  render(): void {
    const values = this.values();
    const lines = this.lines();
    const months = parseList(this.dataset['months']);
    const dateFormat = this.dataset['dateFormat'] ?? '{day} {month} {year}';
    const locale = this.dataset['locale'] === 'af' ? 'af' : 'en';

    for (const control of this.#controls.values()) {
      // At the limit, say that the rest of a paste was not kept (review pass 3, nit 3).
      const tooLong = control
        .closest('[data-field-wrap]')
        ?.querySelector<HTMLElement>('[data-too-long]');
      if (tooLong)
        tooLong.hidden = !(control.maxLength > 0 && control.value.length >= control.maxLength);
      const kind = control.dataset['kind'];
      if (kind === 'money' || kind === 'number') {
        const read =
          kind === 'money' ? readCents(control.value) : readNumber(control.value, QUANTITY);
        setInvalid(control, read.kind === 'invalid' ? read.problem : undefined);
      }
    }
    for (const box of this.querySelectorAll<HTMLInputElement>('[data-omit]')) {
      const block = this.querySelector(`.st-tsheet [data-block="${box.dataset['omit'] ?? ''}"]`);
      block?.toggleAttribute('data-omitted', box.checked);
    }

    for (const slot of this.querySelectorAll<HTMLElement>('.st-tsheet [data-field]')) {
      const name = slot.dataset['field'] ?? '';
      const control = this.#controls.get(name);
      const follows = control?.dataset['follows'];
      const raw = (values[name] ?? '').trim() || (follows ? (values[follows] ?? '').trim() : '');
      const shown =
        raw === '' ? '' : display(raw, control?.dataset['kind'], { months, dateFormat, locale });
      // While empty the slot has no text: the sample is only `data-sample`, shown by CSS on screen
      // and never printed (pass 1, major 2).
      if (slot.textContent !== shown) slot.textContent = shown;
      slot.toggleAttribute('data-empty', shown === '');
    }
    for (const line of this.querySelectorAll<HTMLElement>('.st-tsheet [data-when]')) {
      const names = (line.dataset['when'] ?? '').split(' ').filter(Boolean);
      line.hidden = !names.some((name) => (values[name] ?? '').trim() !== '');
    }
    for (const list of this.querySelectorAll<HTMLElement>('.st-tsheet [data-list]')) {
      const control = this.#controls.get(list.dataset['list'] ?? '');
      if (!control) continue;
      const items = control.value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
      const sample = control.getAttribute('data-sample') ?? '';
      const children = items.map((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        return li;
      });
      if (children.length === 0 && sample) {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'st-tsheet__value';
        span.setAttribute('data-empty', '');
        span.setAttribute('data-sample', sample);
        li.append(span);
        children.push(li);
      }
      list.replaceChildren(...children);
    }

    const rate = this.dataset['vatRate'] ? Number(this.dataset['vatRate']) : undefined;
    const totals = totalsOf(lines, rate);
    this.#renderLines(lines, locale, totals);
    this.#renderRequired(values, lines, totals);
  }

  #renderLines(lines: readonly LineInput[], locale: 'en' | 'af', totals: Totals): void {
    const used = lines.map((line) => lineResult(line));
    const anyUsed = used.some((result) => result.used);
    lines.forEach((line, index) => {
      const result = used[index];
      if (!result) return;
      const amount = this.#rows[index]?.querySelector('[data-line-amount]');
      if (amount)
        amount.textContent = result.cents === undefined ? '' : safeRand(locale, result.cents);
      const quantity = this.#lineControl(index, 'quantity');
      const price = this.#lineControl(index, 'unitPrice');
      if (quantity) setInvalid(quantity, result.quantityProblem);
      if (price) setInvalid(price, result.priceProblem);
      const remove = this.#rows[index]?.querySelector('[data-remove-line]');
      const legend = interpolate(this.dataset['lineLegend'] ?? '{n}', { n: index + 1 });
      remove?.setAttribute(
        'aria-label',
        interpolate(this.dataset['removeLine'] ?? '{description}', {
          description: line.description.trim() || legend,
        }),
      );
    });
    for (const sample of this.querySelectorAll<HTMLElement>('.st-tsheet [data-sample-line]')) {
      sample.hidden = anyUsed;
    }
    for (const row of this.querySelectorAll<HTMLElement>('.st-tsheet [data-line]')) {
      const index = Number(row.dataset['line']);
      const line = lines[index];
      const result = used[index];
      row.hidden = !line || !result?.used;
      if (!line || !result) continue;
      // A value that cannot be read prints blank, not as typed (pass 1, minor 2).
      const price = readCents(line.unitPrice);
      const quantity = readNumber(line.quantity, QUANTITY);
      setCell(row, 'description', line.description.trim());
      setCell(
        row,
        'quantity',
        quantity.kind === 'empty' ? '1' : quantity.kind === 'ok' ? line.quantity.trim() : '',
      );
      setCell(row, 'unitPrice', price.kind === 'ok' ? safeRand(locale, price.value) : '');
      setCell(row, 'amount', result.cents === undefined ? '' : safeRand(locale, result.cents));
    }
    // While a used line cannot be read the totals would leave it out, so they stay blank (to write
    // on paper) and the form says why (pass 1, minor 2).
    const byKind: Record<string, number> = {
      subtotal: totals.subtotal,
      vat: totals.vat,
      total: totals.total,
    };
    for (const output of this.querySelectorAll<HTMLElement>('[data-total]')) {
      const cents = byKind[output.dataset['total'] ?? ''];
      const text = cents === undefined || totals.blocked ? '' : safeRand(locale, cents);
      if (output.textContent !== text) output.textContent = text;
    }
    const blocked = this.querySelector<HTMLElement>('[data-totals-blocked]');
    if (blocked) blocked.hidden = !totals.blocked;
    const add = this.querySelector<HTMLElement>('[data-add-line]');
    if (add) add.hidden = this.#shown >= Math.min(MAX_LINES, this.#rows.length);
  }

  #renderRequired(
    values: Readonly<Record<string, string>>,
    lines: readonly LineInput[],
    totals: Totals,
  ): void {
    // The rules are shared with the list the page renders (`required-rules.ts`; pass 11, m2).
    const items = [...this.querySelectorAll<HTMLElement>('[data-required-item]')].filter((item) => {
      const above = item.dataset['requiredAbove'];
      const applies = requiredApplies(
        above === undefined ? undefined : Number(above),
        totals.total,
      );
      if (!applies) item.hidden = true;
      return applies;
    });
    let present = 0;
    for (const item of items) {
      const name = item.dataset['requiredItem'] ?? '';
      let ok: boolean;
      if (name === 'lines') {
        ok =
          !lines.map(lineResult).some(lineBlocked) &&
          lines.some(
            (line) => line.description.trim() !== '' && lineResult(line).cents !== undefined,
          );
      } else {
        const control = this.#controls.get(name);
        const follows = control?.dataset['follows'];
        ok = fieldPresent(
          values[name] ?? '',
          control?.dataset['kind'],
          follows === undefined ? undefined : (values[follows] ?? ''),
        );
      }
      item.hidden = ok;
      if (ok) present++;
    }
    const status = this.querySelector('[data-required-count]');
    const text =
      present === items.length
        ? (this.dataset['allPresent'] ?? '')
        : interpolate(this.dataset['requiredText'] ?? '', { present, total: items.length });
    // The page renders the empty form's count, so the first run writes nothing (pass 10, m1; the
    // rendered text is compared trimmed, pass 11, m1).
    if (status && text !== this.#lastStatus && text !== status.textContent?.trim()) {
      status.textContent = text;
      this.#lastStatus = text;
    }
  }

  /** Puts values and lines into the form and redraws. */
  #apply(values: Readonly<Record<string, string>>, lines: readonly LineInput[]): void {
    for (const [name, control] of this.#controls) {
      setValue(control, values[name] ?? this.#defaults[name] ?? '');
    }
    this.#writeLines(
      lines,
      Math.max(this.#templateRows, Math.min(lines.length, this.#rows.length)),
    );
    this.render();
  }

  /** Writes `lines` into the first rows, empties the rest, and shows `shown` rows. */
  #writeLines(lines: readonly LineInput[], shown: number): void {
    this.#rows.forEach((_, index) => {
      const line = lines[index];
      for (const part of ['description', 'quantity', 'unitPrice'] as const) {
        const control = this.#lineControl(index, part);
        if (!control) continue;
        const value = line ? line[part] : control.defaultValue;
        if (control.value !== value) control.value = value;
      }
    });
    this.#setShown(shown);
  }

  #setShown(shown: number): void {
    this.#shown = Math.min(shown, this.#rows.length);
    this.#rows.forEach((row, index) => {
      row.toggleAttribute('data-open', index < this.#shown);
    });
  }

  #readLines(count: number): LineInput[] {
    const lines: LineInput[] = [];
    for (let index = 0; index < count; index++) {
      lines.push({
        description: this.#lineControl(index, 'description')?.value ?? '',
        quantity: this.#lineControl(index, 'quantity')?.value ?? '',
        unitPrice: this.#lineControl(index, 'unitPrice')?.value ?? '',
      });
    }
    return lines;
  }

  #lineControl(index: number, part: keyof ReturnType<typeof lineNames>): HTMLInputElement | null {
    const control = this.#form?.elements.namedItem(lineNames(index)[part]);
    return control instanceof HTMLInputElement ? control : null;
  }

  #save(): void {
    if (!this.#store) return;
    const draft = draftFrom(this.values(), this.#defaults, this.lines());
    this.#lastSaved = draft;
    if (Object.keys(draft.values).length === 0 && draft.lines.length === 0) this.#store.reset();
    else this.#store.set(draft);
  }

  async #askToClear(opener: HTMLElement): Promise<void> {
    const dialog = this.querySelector('dialog');
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (await askToConfirm(dialog, opener)) this.clear();
  }

  #say(message: string): void {
    announce(this.querySelector('[data-announce]'), message);
  }

  /** Tab roles only while the tabs are on screen (the narrow layout). */
  #updateTabs(): void {
    const tablist = this.querySelector<HTMLElement>('[role="tablist"]');
    const active = tablist !== null && getComputedStyle(tablist).display !== 'none';
    if (active === this.#tabsActive) return;
    this.#tabsActive = active;
    for (const pane of this.querySelectorAll<HTMLElement>('[data-pane]')) {
      const tab = this.querySelector<HTMLElement>(`[data-tab="${pane.dataset['pane'] ?? ''}"]`);
      if (active && tab) {
        pane.dataset['labelledby'] ??= pane.getAttribute('aria-labelledby') ?? '';
        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('aria-labelledby', tab.id);
      } else {
        pane.removeAttribute('role');
        const own = pane.dataset['labelledby'];
        if (own) pane.setAttribute('aria-labelledby', own);
        else pane.removeAttribute('aria-labelledby');
      }
    }
    if (active) this.select(this.dataset['view'] === 'preview' ? 'preview' : 'form');
  }
}

/** Index of the last line with something typed in it, or -1. */
function lastUsed(lines: readonly LineInput[]): number {
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index];
    if (line && (line.description.trim() !== '' || line.unitPrice.trim() !== '')) return index;
  }
  return -1;
}

function parseList(json: string | undefined): string[] {
  try {
    const value: unknown = JSON.parse(json ?? '[]');
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

/** A value as it prints: a date in words, an amount as rand, anything else as typed. */
export function display(
  raw: string,
  kind: string | undefined,
  options: { months: readonly string[]; dateFormat: string; locale: 'en' | 'af' },
): string {
  if (kind === 'date') return formatIsoDate(raw, options.months, options.dateFormat) ?? raw;
  if (kind === 'money') {
    // An amount that cannot be read prints blank, never as a different amount (pass 1, major 3).
    const cents = readCents(raw);
    return cents.kind === 'ok' ? safeRand(options.locale, cents.value) : '';
  }
  if (kind === 'number') return readNumber(raw, QUANTITY).kind === 'ok' ? raw : '';
  return raw;
}

function setCell(row: HTMLElement, cell: string, text: string): void {
  const element = row.querySelector(`[data-cell="${cell}"]`);
  if (element && element.textContent !== text) element.textContent = text;
}

const MESSAGE_KEY: Record<NumberProblem, string> = {
  format: 'messageFormat',
  ambiguous: 'messageAmbiguous',
  decimals: 'messageDecimals',
  tooLarge: 'messageTooLarge',
};

/** Marks a number field that cannot be used, says why, and links the message. */
function setInvalid(control: Control, problem: NumberProblem | undefined): void {
  const invalid = problem !== undefined;
  const errorId = control.dataset['errorId'];
  const error = errorId ? control.ownerDocument.getElementById(errorId) : null;
  if (error) {
    error.hidden = !invalid;
    const message = error.querySelector('[data-error-message]');
    const text = problem ? error.dataset[MESSAGE_KEY[problem]] : undefined;
    if (message && text && message.textContent !== text) message.textContent = text;
  }
  const described = (control.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
  const without = described.filter((id) => id !== errorId);
  if (invalid) {
    control.setAttribute('aria-invalid', 'true');
    if (errorId) without.push(errorId);
  } else {
    control.removeAttribute('aria-invalid');
  }
  if (without.length > 0) control.setAttribute('aria-describedby', without.join(' '));
  else control.removeAttribute('aria-describedby');
}

if (!customElements.get('st-template-form')) {
  customElements.define('st-template-form', StTemplateForm);
}
