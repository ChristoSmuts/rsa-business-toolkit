/*
 * <st-search>: the search dialog (build plan B3 flow 3, C2), imported by `./search-boot` the first
 * time the reader opens search, or when a result has just opened this page:
 *
 * - opens and closes the dialog, and returns focus to where it was when the dialog closes;
 * - after a result opened another page, gives the target heading focus and a short highlight.
 *
 * `./search-boot`, which every page loads, owns the openers (the header's search control, `/` and
 * Ctrl+K) so that this module costs a document page nothing (WP-33 integration with WP-30 and
 * WP-31: the 25 KB budget). The results code, MiniSearch and the index are imported the first time
 * the dialog opens (`./search-ui`).
 */
import { sessionValue } from '../lib/storage/session';
import type { DialogController } from './search-ui';

/**
 * Session key that carries "focus this heading" across the page load a result causes. The same
 * string as `ARRIVAL_KEY` in `./search-boot`, which only asks whether a value is waiting; a test
 * keeps the two equal (importing it would make the boot module a shared chunk).
 */
export const ARRIVAL_KEY = 'st.search.arrival';

/**
 * The one place search keeps anything in browser storage: a one-page-load value under
 * `ARRIVAL_KEY`, through `src/lib/storage/session.ts`. Blocked storage (private mode, disabled site
 * data) only costs the focus: the result still opens at its heading.
 */
export const arrivalStore = sessionValue(ARRIVAL_KEY);

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
  /**
   * Set by `./search-boot` when it opened the dialog before this script arrived: where focus goes
   * back to. `declare`, so no class field overwrites it when the element upgrades.
   */
  declare opener?: HTMLElement | null;

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
    // `./search-boot` opened the dialog while this script loaded, and the reader may have typed:
    // take it over and search what is in the field (review WP-33 pass 21, major 1).
    if (this.#dialog?.open) {
      this.#returnFocus = this.opener ?? null;
      this.opener = null;
      this.#start();
    }
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.#dialog?.removeEventListener('close', this.#onClose);
    this.#field()?.removeEventListener('keydown', this.#onFieldKeydown);
    this.#field()?.form?.removeEventListener('submit', this.#onSubmit);
  }

  #field(): HTMLInputElement | null {
    return this.#dialog?.querySelector<HTMLInputElement>('input[type="search"]') ?? null;
  }

  /** The results half, imported once. */
  controller(): Promise<DialogController> {
    this.#controller ??= import('./search-ui').then(({ createDialogController }) => {
      const controller = createDialogController(this, {
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
    this.#start();
  }

  /** Load the results code into the open dialog: it shows the common questions or searches. */
  #start(): void {
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
