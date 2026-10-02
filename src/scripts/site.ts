/*
 * Behaviour every page shares, loaded once by `Page.astro`:
 *
 * - **Low data.** Follows the `lowData` store onto `<html data-low-data>` (system fonts, no
 *   decorative pattern; `tokens.css`). `theme-init.js` sets it before paint; this keeps it right
 *   when the setting changes here, in another tab, or is cleared.
 * - **Keyboard shortcuts** (`src/lib/shortcuts.ts`): `?` goes to the shortcuts list on `/about/`
 *   (the page's `<link rel="help">`), Alt+← and Alt+→ follow the pager's `rel="prev"` and
 *   `rel="next"` links, and Escape closes an open "On this page" list. Native `<dialog>`s close on
 *   Escape by themselves, and the top bar menus in `navigation.ts`. Nothing fires while focus is in
 *   a field or while a dialog is open, and `?` only while single-key shortcuts are on. A shortcut
 *   with nothing to do (no pager on the page) leaves the key to the browser.
 */
import { isTypingTarget, matchShortcut, type ShortcutAction } from '../lib/shortcuts';
import { lowData, shortcuts } from '../lib/store';

lowData.subscribe((on) => document.documentElement.toggleAttribute('data-low-data', on));

/** The link a shortcut follows on this page, if any. */
function shortcutLink(
  action: ShortcutAction,
  doc: Document,
): HTMLAnchorElement | HTMLLinkElement | null {
  if (action === 'help') return doc.querySelector<HTMLLinkElement>('link[rel="help"]');
  const rel = action === 'previous' ? 'prev' : 'next';
  return doc.querySelector<HTMLAnchorElement>(`a[rel~="${rel}"][href]`);
}

export function handleShortcut(event: KeyboardEvent, doc: Document = document): void {
  if (isTypingTarget(event.target)) return;
  // A modal dialog owns the keyboard: nothing behind it may act (its own Escape is native).
  if (doc.querySelector('dialog[open]')) return;
  if (event.key === 'Escape') {
    closeOpenToc(doc);
    return;
  }
  const action = matchShortcut(event, shortcuts.get());
  if (!action) return;
  const link = shortcutLink(action, doc);
  if (!link) return;
  event.preventDefault();
  if (link instanceof HTMLAnchorElement) {
    link.click();
    return;
  }
  const target = new URL(link.href, doc.baseURI);
  const here = doc.defaultView?.location;
  if (here && target.pathname === here.pathname && target.hash) {
    // Already on the page: move to the list and put focus on its heading.
    const heading = doc.getElementById(decodeURIComponent(target.hash.slice(1)));
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
      heading.scrollIntoView();
      return;
    }
  }
  doc.defaultView?.location.assign(target.href);
}

/** Escape inside an open "On this page" list closes it and puts focus on its summary. */
function closeOpenToc(doc: Document): void {
  const details = doc.activeElement?.closest('details.st-toc[open]');
  if (!(details instanceof HTMLDetailsElement)) return;
  details.open = false;
  details.querySelector('summary')?.focus();
}

document.addEventListener('keydown', (event) => handleShortcut(event));
