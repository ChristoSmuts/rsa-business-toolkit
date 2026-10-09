/*
 * The part of search every page loads (build plan B3 flow 3, C2). It counts against the 25 KB
 * budget of every document page, so it is as small as it can be and shares no module with the
 * dialog's own script:
 *
 * - opens the search dialog from the header's search control (an ordinary link to `/search/`
 *   without JavaScript); `/` and Ctrl+K reach `openSearch()` through the site's one keyboard
 *   handler (`site.ts`, `matchShortcut`), which already skips fields and open dialogs;
 * - shows the shortcut setting on the openers (`aria-keyshortcuts` and the `/` hint), and follows
 *   it when it changes on `/about/` or in another tab;
 * - after a result opened this page, loads the dialog's script so it can focus the heading;
 * - while the dialog's script loads, says so and keeps the common questions from standing under a
 *   typed query (`waiting()`).
 *
 * The dialog (`./search`, `<st-search>`) is imported the first time the reader asks for it; it then
 * imports the results code, MiniSearch and the index (`./search-ui`).
 */
import { sessionHas } from '../lib/storage/session-flag';
import { shortcuts } from '../lib/store';

/** Session key that carries "focus this heading" across the page load a result causes. */
export const ARRIVAL_KEY = 'st.search.arrival';

/** The reader's settings that change search. */
export interface SearchSettings {
  /** Single-key shortcuts (`/`) are on. Ctrl+K is not a single-key shortcut and stays on. */
  readonly shortcuts: boolean;
  /** Low data: never fetch the index before the reader types. */
  readonly lowData: boolean;
}

/**
 * Show the shortcut setting on the openers: `aria-haspopup`, `aria-keyshortcuts` and the `/` hint,
 * which promises a key only while it works.
 */
export function applySettings(on: boolean, doc: Document = document): void {
  for (const opener of doc.querySelectorAll('[data-search-open]')) {
    opener.setAttribute('aria-haspopup', 'dialog');
    opener.setAttribute('aria-keyshortcuts', on ? '/ Control+K' : 'Control+K');
    for (const hint of opener.querySelectorAll<HTMLElement>('[data-search-key-hint]')) {
      hint.hidden = !on;
    }
  }
}

/**
 * `<st-search>` as this module sees it: `open` once `./search` has defined (upgraded) it, and
 * `opener`, where focus goes back to, for the element to pick up when it takes over a dialog this
 * module opened.
 */
export interface Dialog extends HTMLElement {
  open?: (opener: HTMLElement | null) => void;
  opener?: HTMLElement | null;
}

/**
 * The dialog's script, imported once. A plain `import()`, without Vite's preload wrapper (the
 * `@vite-ignore` comment): the wrapper and its helper chunk cost every document page 0.75 KB, and
 * the chunk's own imports are on the page already or few (review WP-33 pass 21, major 1).
 */
const load = (): Promise<unknown> => import('./search');

/**
 * Open the dialog. Returns `false` when the page has no search dialog, so the caller leaves the key
 * or click to the browser.
 *
 * The first time, before its script has arrived, this opens the server-rendered `<dialog>` itself
 * and focuses its field, so every key the reader types lands there (review WP-33 pass 21, major 1:
 * waiting for the script lost the first letters, and on a slow network the whole query). The
 * script then takes the open dialog over and searches what was typed. When it cannot load (offline,
 * or a stale page after a deploy) the search page (`data-page`) opens with the text typed so far.
 */
export function openSearch(from: HTMLElement | null, doc: Document = document): boolean {
  const host = doc.querySelector<Dialog>('st-search');
  if (!host) return false;
  if (host.open) {
    host.open(from);
    return true;
  }
  const dialog = host.querySelector('dialog');
  const field = host.querySelector('input');
  if (dialog && !dialog.open) {
    host.opener = from;
    dialog.showModal();
    field?.focus();
    if (field) waiting(host, field);
  }
  load().catch(() => {
    const query = field?.value.trim() ?? '';
    doc.defaultView?.location.assign(
      `${host.dataset['page'] ?? ''}${query ? `?q=${encodeURIComponent(query)}` : ''}`,
    );
  });
  return true;
}

/**
 * Until the dialog's script has taken over (`host.open` exists), say "Loading search…" on the
 * status line, and hide the common questions while the field has text: they are not results for it
 * (WP-50 audit, flow 3). The results code (`search-ui.ts`) keeps the same state until the index has
 * arrived.
 */
function waiting(host: Dialog, field: HTMLInputElement): void {
  const status = host.querySelector<HTMLElement>('[role="status"]');
  const common = host.querySelector<HTMLElement>('[data-search-empty]');
  const show = (): void => {
    if (host.open) {
      field.removeEventListener('input', show);
      return;
    }
    if (common) common.hidden = field.value.trim() !== '';
    if (status) status.textContent = status.dataset['loadingText'] ?? '';
  };
  field.addEventListener('input', show);
  show();
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target = event.target;
  const link = target instanceof Element ? target.closest<HTMLElement>('[data-search-open]') : null;
  if (link && openSearch(link)) event.preventDefault();
});

shortcuts.subscribe((on) => applySettings(on));

if (sessionHas(ARRIVAL_KEY)) load().catch(() => undefined);
