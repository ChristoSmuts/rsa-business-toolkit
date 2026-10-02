/*
 * <st-search>: the search dialog's small, eager half (build plan B3 flow 3, C2). It loads on every
 * page that has the site header, so it does only what must be ready before the reader asks:
 *
 * - opens the dialog from the header's search control (an ordinary link to `/search/` without
 *   JavaScript), from `/` and from Ctrl+K (⌘K on a Mac), never while focus is in a field;
 * - returns focus to where it was when the dialog closes;
 * - after a result opened another page, gives the target heading focus and a short highlight.
 *
 * Everything else — the results code, MiniSearch and the index — is imported the first time the
 * dialog opens (`./search-ui`), so a page that never opens search never downloads any of it.
 */
import type { DialogController } from './search-ui';

/** The reader's settings that change search. */
export interface SearchSettings {
  /** Single-key shortcuts (`/`) are on. Ctrl+K is not a single-key shortcut and stays on. */
  readonly shortcuts: boolean;
  /** Low data: never fetch the index before the reader types. */
  readonly lowData: boolean;
}

/**
 * The reader's settings.
 *
 * TODO(WP-30 integration): read `shortcuts` (`st.shortcuts`) and `lowData` (`st.lowData`) from
 * `src/lib/store.ts` once it lands, keeping `prefers-reduced-data` as a second reason for low data.
 * Until then shortcuts are on (WP-30's default) and low data follows the browser's hint only.
 * Recorded in docs/reviews/backlog.md.
 */
export function searchSettings(win: Window = window): SearchSettings {
  return {
    shortcuts: true,
    lowData: win.matchMedia?.('(prefers-reduced-data: reduce)').matches ?? false,
  };
}

/** `true` when a key press belongs to the field the reader is typing in. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return (
    target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !==
    null
  );
}

/**
 * Whether a key press should open search: `/` alone (when single-key shortcuts are on) or Ctrl+K
 * (⌘K on a Mac). Never while the reader types in a field, and never with other modifiers, so
 * Ctrl+Shift+K and Alt+/ keep their browser meaning.
 */
export function isOpenShortcut(event: KeyboardEvent, settings: SearchSettings): boolean {
  if (event.defaultPrevented || event.isComposing || isTypingTarget(event.target)) return false;
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    return settings.shortcuts;
  }
  const key = event.key.toLowerCase();
  return key === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
}

/** Session key that carries "focus this heading" across the page load a result causes. */
export const ARRIVAL_KEY = 'st.search.arrival';
/** How long a heading stays highlighted after a result opens it (B3: "2s highlight"). */
export const HIGHLIGHT_MS = 2000;
export const HIGHLIGHT_CLASS = 'st-search-target';

/** The element a fragment names, or `null`. */
export function fragmentTarget(doc: Document, hash: string): HTMLElement | null {
  if (hash.length < 2) return null;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape: use the fragment as written.
  }
  const element = doc.getElementById(id);
  return element instanceof HTMLElement ? element : null;
}

/**
 * Give a result's target focus and a short highlight. A heading or glossary term is focusable
 * already (`tabindex="-1"`); a `<details>` (the "Words used" list) is opened and its summary
 * focused. The page has already scrolled to the fragment, so focus does not scroll again.
 */
export function focusTarget(target: HTMLElement, win: Window = window): void {
  let focusable: HTMLElement = target;
  if (target instanceof HTMLDetailsElement) {
    target.open = true;
    focusable = target.querySelector<HTMLElement>(':scope > summary') ?? target;
  }
  if (!focusable.hasAttribute('tabindex') && focusable.tabIndex < 0) {
    focusable.setAttribute('tabindex', '-1');
  }
  focusable.focus({ preventScroll: true });
  target.classList.remove(HIGHLIGHT_CLASS);
  // Restart the animation when the same heading is highlighted twice in a row.
  void target.offsetWidth;
  target.classList.add(HIGHLIGHT_CLASS);
  win.setTimeout(() => target.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_MS);
}

function sessionStore(win: Window): Storage | undefined {
  try {
    return win.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Remember, for the next page load, that a result opened `url`. */
export function rememberArrival(url: string, win: Window = window): void {
  try {
    sessionStore(win)?.setItem(ARRIVAL_KEY, url);
  } catch {
    // Storage blocked: the page still opens at the heading, it just does not take focus.
  }
}

/**
 * On a page a result opened, focus and highlight the target. Only for the page the result named:
 * the key is removed on any page load, so a later visit to the same URL is left alone.
 */
export function consumeArrival(win: Window = window): HTMLElement | null {
  const store = sessionStore(win);
  let expected: string | null;
  try {
    expected = store?.getItem(ARRIVAL_KEY) ?? null;
    store?.removeItem(ARRIVAL_KEY);
  } catch {
    return null;
  }
  if (expected === null) return null;
  const here = new URL(win.location.href);
  const wanted = new URL(expected, here);
  if (wanted.pathname !== here.pathname || wanted.hash !== here.hash) return null;
  const target = fragmentTarget(win.document, here.hash);
  if (target) focusTarget(target, win);
  return target;
}

/** Open a result: on this page, move to the heading; on another, go there and focus it on arrival. */
export function openResult(url: string, win: Window = window): void {
  const target = new URL(url, win.location.href);
  const here = new URL(win.location.href);
  if (target.pathname === here.pathname && target.search === here.search && target.hash !== '') {
    if (target.hash !== here.hash) win.history.pushState(null, '', target.hash);
    const element = fragmentTarget(win.document, target.hash);
    if (element) {
      element.scrollIntoView({ block: 'start' });
      focusTarget(element, win);
    }
    return;
  }
  rememberArrival(target.href, win);
  win.location.assign(target.href);
}

export class StSearch extends HTMLElement {
  #dialog: HTMLDialogElement | null = null;
  #returnFocus: HTMLElement | null = null;
  #controller: Promise<DialogController> | undefined;

  readonly #onDocumentClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const opener = target.closest<HTMLElement>('[data-search-open]');
    if (!opener) return;
    event.preventDefault();
    this.open(opener);
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (this.#dialog?.open || document.querySelector('dialog[open]')) return;
    if (!isOpenShortcut(event, searchSettings())) return;
    event.preventDefault();
    this.open(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  };

  readonly #onClick = (event: Event): void => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-search-close]')) this.close();
  };

  readonly #onClose = (): void => {
    const back = this.#returnFocus;
    this.#returnFocus = null;
    // The opener may have been inside the phone menu, which closed when it was used.
    const visible = back?.isConnected === true && back.getClientRects().length > 0;
    const fallback = document.querySelector<HTMLElement>('[data-drawer-open]');
    const next = visible
      ? back
      : fallback && fallback.getClientRects().length > 0
        ? fallback
        : null;
    next?.focus();
  };

  connectedCallback(): void {
    this.#dialog = this.querySelector('dialog');
    this.addEventListener('click', this.#onClick);
    this.#dialog?.addEventListener('close', this.#onClose);
    document.addEventListener('click', this.#onDocumentClick);
    document.addEventListener('keydown', this.#onKeydown);
    const keys = searchSettings().shortcuts ? '/ Control+K' : 'Control+K';
    for (const opener of document.querySelectorAll('[data-search-open]')) {
      opener.setAttribute('aria-haspopup', 'dialog');
      opener.setAttribute('aria-keyshortcuts', keys);
    }
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.#dialog?.removeEventListener('close', this.#onClose);
    document.removeEventListener('click', this.#onDocumentClick);
    document.removeEventListener('keydown', this.#onKeydown);
  }

  /** The results half, imported once. */
  controller(): Promise<DialogController> {
    this.#controller ??= import('./search-ui').then(({ createDialogController }) =>
      createDialogController(this, { settings: searchSettings(), openResult }),
    );
    return this.#controller;
  }

  open(opener: HTMLElement | null = null): void {
    const dialog = this.#dialog;
    if (!dialog || dialog.open) return;
    this.#returnFocus = opener;
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    void this.controller().then((controller) => controller.opened());
  }

  close(): void {
    this.#dialog?.close();
  }
}

if (!customElements.get('st-search')) customElements.define('st-search', StSearch);

consumeArrival();
