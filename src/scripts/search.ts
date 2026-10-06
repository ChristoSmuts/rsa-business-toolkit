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

/**
 * The one place search touches browser storage: a single `sessionStorage` value under the `st.`
 * key `ARRIVAL_KEY`, living for one page load. Every access survives blocked storage (private
 * mode, disabled site data): the result then still opens at its heading, only without the focus.
 * TODO(WP-30 integration): move behind `src/lib/storage/` if it gains a session adapter, so
 * `clearAll()` sees it (docs/reviews/backlog.md).
 */
export const arrivalStore = {
  read(win: Window = window): string | null {
    try {
      const value = win.sessionStorage.getItem(ARRIVAL_KEY);
      win.sessionStorage.removeItem(ARRIVAL_KEY);
      return value;
    } catch {
      return null;
    }
  },
  write(url: string, win: Window = window): void {
    try {
      win.sessionStorage.setItem(ARRIVAL_KEY, url);
    } catch {
      // Blocked: see above.
    }
  },
};

/** Remember, for the next page load, that a result opened `url`. */
export function rememberArrival(url: string, win: Window = window): void {
  arrivalStore.write(url, win);
}

/**
 * On a page a result opened, focus and highlight the target. Only for the page the result named:
 * the key is removed on any page load, so a later visit to the same URL is left alone.
 */
export function consumeArrival(win: Window = window): HTMLElement | null {
  const expected = arrivalStore.read(win);
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

  /**
   * Escape in the field closes the dialog straight away. A search field's own Escape would
   * first clear the text and leave the dialog open, while the instructions promise "Press Escape
   * to close search" (B5).
   */
  readonly #onFieldKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.isComposing) return;
    event.preventDefault();
    this.close();
  };

  /** Set once the results code has loaded; until then Enter is this element's to handle. */
  #uiReady = false;
  /**
   * Set once loading the results code has failed (offline, or a stale page after a deploy whose
   * old chunk is gone). Enter then submits to `/search/?q=`, a fresh page that works.
   */
  #uiFailed = false;

  /**
   * Enter before the results code has loaded. An empty query goes nowhere: the reader stays on
   * their page (review WP-33 pass 4, nit 1). Any other query in the open dialog waits for the
   * results code and then does what Enter does there (open the first result for the text), instead
   * of leaving for the search page because the reader typed faster than the code loaded. Once the
   * results code runs, it has its own guards, and a submit reaches `/search/?q=` only when the
   * dialog found nothing.
   */
  readonly #onSubmit = (event: Event): void => {
    if ((this.#field()?.value.trim() ?? '') === '') {
      event.preventDefault();
      return;
    }
    if (this.#uiReady || this.#uiFailed || !this.#dialog?.open) return;
    event.preventDefault();
    const form = this.#field()?.form;
    this.controller().then(
      (controller) => controller.enterCurrent(),
      () => {
        // The results code did not load: the search page is the way on (review WP-33 pass 7,
        // minor 2).
        this.#uiFailed = true;
        form?.requestSubmit();
      },
    );
  };

  readonly #onClick = (event: Event): void => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-search-close]')) this.close();
  };

  /** Set while a chosen result closes the dialog: focus then goes to the result, not back. */
  #leaving = false;

  /** Open a chosen result: close the dialog without returning focus, then go to the result. */
  readonly #choose = (url: string): void => {
    // Never act for a dialog that is no longer open (review WP-33 pass 2, major 1); and only mark
    // the close as "leaving" when there is a close to come, or the flag would outlive it.
    if (!this.#dialog?.open) return;
    this.#leaving = true;
    this.close();
    openResult(url);
  };

  readonly #onClose = (): void => {
    if (this.#leaving) {
      this.#leaving = false;
      this.#returnFocus = null;
      return;
    }
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
    this.#field()?.addEventListener('keydown', this.#onFieldKeydown);
    this.#field()?.form?.addEventListener('submit', this.#onSubmit);
    document.addEventListener('click', this.#onDocumentClick);
    document.addEventListener('keydown', this.#onKeydown);
    this.applySettings();
  }

  /**
   * Show the shortcut setting on the openers: `aria-keyshortcuts` and the `/` hint. Called on
   * connect. TODO(WP-30 integration): also call it when the store's `shortcuts` changes, so
   * switching it on `/about/` updates the header without a reload (docs/reviews/backlog.md).
   */
  applySettings(settings: SearchSettings = searchSettings()): void {
    const keys = settings.shortcuts ? '/ Control+K' : 'Control+K';
    for (const opener of document.querySelectorAll('[data-search-open]')) {
      opener.setAttribute('aria-haspopup', 'dialog');
      opener.setAttribute('aria-keyshortcuts', keys);
      // The `/` hint promises a key that is switched off.
      for (const hint of opener.querySelectorAll<HTMLElement>('[data-search-key-hint]')) {
        hint.hidden = !settings.shortcuts;
      }
    }
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.#dialog?.removeEventListener('close', this.#onClose);
    this.#field()?.removeEventListener('keydown', this.#onFieldKeydown);
    this.#field()?.form?.removeEventListener('submit', this.#onSubmit);
    document.removeEventListener('click', this.#onDocumentClick);
    document.removeEventListener('keydown', this.#onKeydown);
  }

  #field(): HTMLInputElement | null {
    return this.#dialog?.querySelector<HTMLInputElement>('input[type="search"]') ?? null;
  }

  /** The results half, imported once. */
  controller(): Promise<DialogController> {
    this.#controller ??= import('./search-ui').then(({ createDialogController }) => {
      const controller = createDialogController(this, {
        settings: searchSettings(),
        openResult: this.#choose,
      });
      this.#uiReady = true;
      return controller;
    });
    return this.#controller;
  }

  open(opener: HTMLElement | null = null): void {
    const dialog = this.#dialog;
    if (!dialog || dialog.open) return;
    this.#returnFocus = opener;
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    this.controller().then(
      (controller) => controller.opened(),
      () => {
        this.#uiFailed = true;
        // The results code could not load (offline, a stale page after a deploy): show the
        // failed state the page rendered, with its link to the contents.
        this.#controller = undefined;
        const failed = this.querySelector<HTMLElement>('[data-search-failed]');
        const empty = this.querySelector<HTMLElement>('[data-search-empty]');
        if (failed) failed.hidden = false;
        if (empty) empty.hidden = true;
        // Say why, in the live region: this script has no translator, so the page renders the
        // sentence on the status line (review WP-33 pass 2, minor 2).
        const status = this.querySelector<HTMLElement>('[role="status"]');
        if (status) status.textContent = status.dataset['failedText'] ?? '';
      },
    );
  }

  close(): void {
    this.#dialog?.close();
  }
}

if (!customElements.get('st-search')) customElements.define('st-search', StSearch);

consumeArrival();
