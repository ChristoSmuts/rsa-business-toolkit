/*
 * "Only what applies to me" (build plan A5, B2, B6; WP-31).
 *
 * The server marks every part with a condition: a heading (`data-applies data-depth
 * data-entity data-types`), a checklist item and a table row (`data-applies data-entity
 * data-types`). This module hides the parts whose condition does not match the reader's profile,
 * with the A5 rule (`applies` in `src/lib/path-engine.ts`). **Nothing is removed from the page**:
 * a hidden part gets the class `.st-filtered` (`display: none`), and a heading's section collapses
 * into the "Hidden by … Show" marker rendered before it (`HiddenMarker.astro`). "Show" brings back
 * that one section and moves focus to its heading.
 *
 * <st-applies-scope data-mode="…">  the part of the page that is filtered:
 *     `switch`     follows the "Only what applies to me" switch (`onlyMine`), on document pages;
 *     `checklist`  follows the "Show: Only what applies to me" choice on `/checklist/`;
 *     `always`     always filters, without markers (My path's personalised checklist).
 *   No profile: nothing is filtered.
 * <st-applies-switch>  the switch (a native checkbox with `role="switch"`) bound to `onlyMine`.
 *   Shown only when there is a profile; otherwise one line points at "Find my path".
 */
import { applies, appliesFromAttributes } from '../lib/applicability';
import type { Profile } from '../lib/profile';
import { onlyMine, profile } from '../lib/profile-store';
import { FILTER_EVENT } from './checklist-filter';

export const FILTERED = 'st-filtered';

function depthOf(element: Element | null): number | undefined {
  if (!(element instanceof HTMLElement)) return undefined;
  const depth = Number(element.dataset['depth']);
  return Number.isInteger(depth) && depth > 0 ? depth : undefined;
}

/**
 * The elements of the section a heading starts: the heading and the siblings after it, up to the
 * next heading of the same or a higher level (and that heading's marker).
 */
export function sectionOf(heading: HTMLElement): HTMLElement[] {
  const depth = depthOf(heading) ?? Number.POSITIVE_INFINITY;
  const out: HTMLElement[] = [heading];
  for (let next = heading.nextElementSibling; next; next = next.nextElementSibling) {
    const own = depthOf(next);
    if (own !== undefined && own <= depth) break;
    if (next.classList.contains('st-hidden-marker')) {
      const after = depthOf(next.nextElementSibling);
      if (after !== undefined && after <= depth) break;
    }
    if (next instanceof HTMLElement) out.push(next);
  }
  return out;
}

/**
 * The part of a heading's section that collapses for `who`: its section, up to the first deeper
 * heading that applies to `who`. A sub-heading the content marks as being for everyone (no
 * `data-applies`: the pipeline gives every heading its parent's condition unless
 * `applicability.json` says otherwise, as for "Provisional tax" under "What SARS wants from a sole
 * proprietor") or for this reader stays visible with everything under it (review WP-31 pass 3,
 * major 1). Later sub-headings that do not apply collapse on their own, behind their own markers.
 */
export function hiddenPart(heading: HTMLElement, who: Profile): HTMLElement[] {
  const depth = depthOf(heading) ?? Number.POSITIVE_INFINITY;
  const out: HTMLElement[] = [];
  for (const element of sectionOf(heading)) {
    const own = element === heading ? undefined : depthOf(element);
    if (
      own !== undefined &&
      own > depth &&
      (!element.hasAttribute('data-applies') || matches(element, who))
    )
      break;
    out.push(element);
  }
  // A marker that stands just before the sub-heading that stays belongs to nothing hidden.
  while (out.length > 1 && out[out.length - 1]?.classList.contains('st-hidden-marker')) out.pop();
  return out;
}

/** The collapsed heading whose section holds `element` (a sibling after it), if any. */
function sectionHeading(element: HTMLElement): HTMLElement | undefined {
  for (
    let before = element.previousElementSibling;
    before;
    before = before.previousElementSibling
  ) {
    if (
      before instanceof HTMLElement &&
      before.matches(`[data-applies][data-depth].${FILTERED}`) &&
      sectionOf(before).includes(element)
    )
      return before;
  }
  return undefined;
}

function markerFor(heading: HTMLElement): HTMLElement | undefined {
  const before = heading.previousElementSibling;
  return before instanceof HTMLElement &&
    before.classList.contains('st-hidden-marker') &&
    before.dataset['markerFor'] === heading.id
    ? before
    : undefined;
}

function matches(element: HTMLElement, who: Profile): boolean {
  return applies(appliesFromAttributes(element.dataset['entity'], element.dataset['types']), who);
}

export interface FilterOptions {
  /** Show the "Hidden by … Show" marker for each collapsed section. */
  readonly markers: boolean;
  /** "{count} items are hidden …", by plural category; the line is left empty without it. */
  readonly hiddenItems?: ((count: number) => string) | undefined;
  /** "Show {count} hidden items", the line's button; with markers only. */
  readonly showItems?: ((count: number) => string) | undefined;
}

/** Shows everything again. */
export function clearFilter(root: ParentNode): void {
  for (const element of root.querySelectorAll(`.${FILTERED}`)) element.classList.remove(FILTERED);
  for (const marker of root.querySelectorAll<HTMLElement>('.st-hidden-marker'))
    marker.hidden = true;
  for (const line of root.querySelectorAll<HTMLElement>('.st-tasklist__hidden')) {
    line.hidden = true;
    hiddenLine(line, '', undefined);
  }
}

/**
 * Sets the "{count} items are hidden" line's text and its "Show {count} hidden items" button
 * (`showText`; no button when it is `undefined`). The button's name is its visible text.
 */
function hiddenLine(line: HTMLElement, text: string, showText: string | undefined): void {
  const target = line.querySelector('[data-hidden-text]');
  if (target) target.textContent = text;
  else line.textContent = text;
  const show = line.querySelector<HTMLElement>('[data-show-list]');
  if (!show) return;
  show.hidden = showText === undefined;
  if (showText !== undefined) (show.querySelector('.st-btn__label') ?? show).textContent = showText;
}

/**
 * Brings back every hidden item of a checklist and focuses the first box that was hidden, so the
 * reader lands on what came back (review WP-31 pass 4, nit 2); the list's first box otherwise.
 */
export function showList(list: HTMLElement): void {
  const back = list.querySelector<HTMLInputElement>(
    `label.st-check.${FILTERED} input[type="checkbox"]`,
  );
  for (const element of list.querySelectorAll(`.${FILTERED}`)) element.classList.remove(FILTERED);
  const line = list.querySelector<HTMLElement>('.st-tasklist__hidden');
  if (line) {
    line.hidden = true;
    hiddenLine(line, '', undefined);
  }
  (back ?? list.querySelector<HTMLInputElement>('input[type="checkbox"]'))?.focus();
}

/** Hides what does not apply to `who` inside `root`. Returns how many parts were hidden. */
export function filterByProfile(root: ParentNode, who: Profile, options: FilterOptions): number {
  clearFilter(root);
  let hidden = 0;
  for (const heading of root.querySelectorAll<HTMLElement>('[data-applies][data-depth]')) {
    if (heading.closest(`.${FILTERED}`) || matches(heading, who)) continue;
    for (const element of hiddenPart(heading, who)) element.classList.add(FILTERED);
    hidden++;
    const marker = options.markers ? markerFor(heading) : undefined;
    if (marker) marker.hidden = false;
  }
  for (const part of root.querySelectorAll<HTMLElement>('[data-applies]:not([data-depth])')) {
    if (part.closest(`.${FILTERED}`) || matches(part, who)) continue;
    part.classList.add(FILTERED);
    hidden++;
  }
  for (const list of root.querySelectorAll<HTMLElement>('st-checklist')) {
    if (list.closest(`.${FILTERED}`)) continue;
    const items = [...list.querySelectorAll<HTMLElement>('label.st-check')];
    const out = items.filter((item) => item.classList.contains(FILTERED)).length;
    const line = list.querySelector<HTMLElement>('.st-tasklist__hidden');
    const all = items.length > 0 && out === items.length;
    // A list with every item hidden: without markers (My path) it goes; with them it collapses to
    // its line, which says so and offers "Show", never an empty "Your checklist" (review WP-31
    // pass 2, minor 2).
    if (all && (!options.markers || !line || !options.hiddenItems || !options.showItems)) {
      list.classList.add(FILTERED);
      continue;
    }
    if (all) list.querySelector('fieldset')?.classList.add(FILTERED);
    // Hidden items are always one button away, whether some or all of the list went (review
    // WP-31 pass 3, minor 2).
    if (line && out > 0 && options.hiddenItems) {
      const show = options.markers ? options.showItems?.(out) : undefined;
      hiddenLine(line, options.hiddenItems(out), show);
      line.hidden = false;
    }
  }
  return hidden;
}

/** Brings back one collapsed section and moves focus to its heading. */
export function showSection(root: ParentNode, headingId: string): void {
  const heading = root.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`);
  if (!heading) return;
  for (const element of sectionOf(heading)) {
    element.classList.remove(FILTERED);
    for (const inner of element.querySelectorAll(`.${FILTERED}`)) inner.classList.remove(FILTERED);
    // Everything in the section is back, so a sub-section's own marker goes too.
    if (element.classList.contains('st-hidden-marker')) element.hidden = true;
  }
  const marker = markerFor(heading);
  if (marker) marker.hidden = true;
  heading.focus();
}

type Mode = 'switch' | 'checklist' | 'always';

function pluralLine(
  element: HTMLElement,
  name: 'hidden' | 'show',
): ((count: number) => string) | undefined {
  const one = element.dataset[`${name}One`];
  const other = element.dataset[`${name}Other`];
  if (!one || !other) return undefined;
  const rules = new Intl.PluralRules(element.closest('[lang]')?.getAttribute('lang') ?? 'en');
  return (count) => (rules.select(count) === 'one' ? one : other).replace('{count}', String(count));
}

export class StAppliesScope extends HTMLElement {
  #mine = false;
  #unsubscribe: (() => void)[] = [];

  readonly #onFilter = (event: Event): void => {
    const filter = (event as CustomEvent<unknown>).detail;
    this.#mine = filter === 'mine';
    this.apply();
  };

  readonly #onHash = (): void => {
    this.revealHash();
  };

  readonly #onClick = (event: Event): void => {
    const list =
      event.target instanceof Element
        ? event.target.closest('[data-show-list]')?.closest('st-checklist')
        : null;
    if (list instanceof HTMLElement) {
      showList(list);
      return;
    }
    const target =
      event.target instanceof Element ? event.target.closest('[data-show-hidden]') : null;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset['showHidden'];
    if (id) showSection(this, id);
  };

  get mode(): Mode {
    const mode = this.dataset['mode'];
    return mode === 'checklist' || mode === 'always' ? mode : 'switch';
  }

  connectedCallback(): void {
    this.addEventListener('click', this.#onClick);
    if (this.mode === 'checklist') {
      this.ownerDocument.addEventListener(FILTER_EVENT, this.#onFilter);
      const chosen = this.ownerDocument.querySelector<HTMLInputElement>(
        'input[name="st-checklist-filter"]:checked',
      );
      this.#mine = chosen?.value === 'mine';
    }
    this.#unsubscribe = [profile.subscribe(() => this.apply())];
    if (this.mode === 'switch') this.#unsubscribe.push(onlyMine.subscribe(() => this.apply()));
    window.addEventListener('hashchange', this.#onHash);
    this.revealHash();
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.ownerDocument.removeEventListener(FILTER_EVENT, this.#onFilter);
    window.removeEventListener('hashchange', this.#onHash);
    for (const stop of this.#unsubscribe) stop();
    this.#unsubscribe = [];
  }

  /**
   * A link to something the filter hid (the table of contents, a search result, a shared address
   * with a `#hash`) brings it back, with its section, and goes to it, rather than scrolling to an
   * element that is not displayed (review WP-31 pass 1, minor 1).
   */
  revealHash(): void {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? this.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null;
    if (!target?.closest(`.${FILTERED}`)) return;
    for (let hidden = target.closest<HTMLElement>(`.${FILTERED}`); hidden;) {
      const heading = hidden.matches('[data-applies][data-depth]')
        ? hidden
        : sectionHeading(hidden);
      if (heading) showSection(this, heading.id);
      hidden.classList.remove(FILTERED);
      hidden = target.closest<HTMLElement>(`.${FILTERED}`);
    }
    target.scrollIntoView();
    if (target.hasAttribute('tabindex')) target.focus();
  }

  /** Filters, or shows everything, for the current profile and choice. */
  apply(): void {
    const who = profile.get();
    for (const element of this.ownerDocument.querySelectorAll<HTMLElement>('[data-needs-profile]'))
      element.hidden = who === null;
    // The answers went (another tab, "Remove my answers") while "Only what applies to me" was the
    // chosen Show: choose "Everything", so the group never has a hidden choice checked (minor 6).
    if (!who && this.mode === 'checklist' && this.#mine) {
      const all = this.ownerDocument.querySelector<HTMLInputElement>(
        'input[name="st-checklist-filter"][value="all"]',
      );
      if (all) {
        all.checked = true;
        all.dispatchEvent(new Event('change', { bubbles: true }));
      }
      this.#mine = false;
    }
    const on =
      this.mode === 'always' ||
      (this.mode === 'switch' && onlyMine.get()) ||
      (this.mode === 'checklist' && this.#mine);
    if (who && on) {
      filterByProfile(this, who, {
        markers: this.mode !== 'always',
        hiddenItems: pluralLine(this, 'hidden'),
        showItems: pluralLine(this, 'show'),
      });
    } else {
      clearFilter(this);
    }
  }
}

export class StAppliesSwitch extends HTMLElement {
  #box: HTMLInputElement | null = null;
  #unsubscribe: (() => void)[] = [];

  readonly #onChange = (): void => {
    if (this.#box) onlyMine.set(this.#box.checked);
  };

  connectedCallback(): void {
    this.#box = this.querySelector('input[type="checkbox"]');
    const control = this.querySelector<HTMLElement>('[data-switch]');
    const hint = this.querySelector<HTMLElement>('[data-no-profile]');
    this.#box?.addEventListener('change', this.#onChange);
    if (this.#box && this.#box.checked !== this.#box.defaultChecked)
      onlyMine.set(this.#box.checked);
    this.#unsubscribe = [
      onlyMine.subscribe((on) => {
        if (this.#box) this.#box.checked = on;
      }),
      profile.subscribe((who) => {
        if (control) control.hidden = who === null;
        if (hint) hint.hidden = who !== null;
      }),
    ];
  }

  disconnectedCallback(): void {
    this.#box?.removeEventListener('change', this.#onChange);
    for (const stop of this.#unsubscribe) stop();
    this.#unsubscribe = [];
  }
}

if (!customElements.get('st-applies-scope'))
  customElements.define('st-applies-scope', StAppliesScope);
if (!customElements.get('st-applies-switch')) {
  customElements.define('st-applies-switch', StAppliesSwitch);
}
