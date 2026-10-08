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
 * - after a result opened this page, loads the dialog's script so it can focus the heading.
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

/** The part of `<st-search>` this module calls, once `./search` has defined (upgraded) it. */
interface Dialog extends HTMLElement {
  open?: (opener: HTMLElement | null) => void;
}

/** The dialog's script, imported once. */
const load = (): Promise<unknown> => import('./search');

/**
 * Open the dialog, importing its script the first time. Returns `false` when the page has no
 * search dialog, so the caller leaves the key or click to the browser. When the script cannot load
 * (offline, or a stale page after a deploy) it goes to the search page (`data-page`), which works
 * without it.
 */
export function openSearch(from: HTMLElement | null, doc: Document = document): boolean {
  const host = doc.querySelector<Dialog>('st-search');
  if (!host) return false;
  if (host.open) host.open(from);
  else
    load().then(
      () => host.open?.(from),
      () => doc.defaultView?.location.assign(host.dataset['page'] ?? ''),
    );
  return true;
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
