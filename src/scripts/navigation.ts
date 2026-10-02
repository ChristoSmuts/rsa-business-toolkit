/*
 * Two small custom elements that enhance server-rendered navigation. Both are enhancements only:
 * with JavaScript off, the header still reaches every page (the `<details>` menus, shown stacked
 * by `html:not(.js)` below 1024px) and the language
 * switcher is still a pair of ordinary links to the same page in the other language.
 *
 * <st-nav-drawer>  the phone menu. A native <dialog>, so Escape and the backdrop come free and
 *                  the browser handles the focus trap and the return of focus (plan B5).
 * <st-lang-switch> keeps the reader's place when they switch language: the server cannot know the
 *                  fragment, so the hrefs follow the current `location.hash` here (plan B3,
 *                  flow 7). They are recomputed on every change, including back to no fragment,
 *                  so a switch never jumps to a heading the reader has already left.
 */
import { switchLocaleUrl } from '../lib/i18n-routes';
import { isEnabledLocale } from '../i18n/locales';

export class StNavDrawer extends HTMLElement {
  #dialog: HTMLDialogElement | null = null;

  readonly #onOpen = (): void => {
    this.#dialog?.showModal();
  };

  readonly #onClose = (): void => {
    this.#dialog?.close();
  };

  readonly #onClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    // Any link inside the drawer navigates, so the drawer must not stay open behind the new page
    // when the browser restores this one from the back/forward cache.
    if (target.closest('a')) this.#onClose();
    if (target.closest('[data-drawer-close]')) this.#onClose();
  };

  connectedCallback(): void {
    this.#dialog = this.querySelector('dialog');
    this.addEventListener('click', this.#onClick);
    for (const button of document.querySelectorAll(`[data-drawer-open="${this.id}"]`)) {
      button.addEventListener('click', this.#onOpen);
    }
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    for (const button of document.querySelectorAll(`[data-drawer-open="${this.id}"]`)) {
      button.removeEventListener('click', this.#onOpen);
    }
  }
}

export class StLangSwitch extends HTMLElement {
  readonly #apply = (): void => {
    const { hash } = window.location;
    for (const link of this.querySelectorAll<HTMLAnchorElement>('a[data-locale]')) {
      const locale = link.dataset['locale'];
      if (!isEnabledLocale(locale)) continue;
      try {
        link.href = switchLocaleUrl(
          `${window.location.pathname}${window.location.search}${hash}`,
          locale,
        );
      } catch {
        // A path the helper refuses (a traversal segment, a backslash) keeps the server's href.
      }
    }
  };

  connectedCallback(): void {
    this.#apply();
    window.addEventListener('hashchange', this.#apply);
    window.addEventListener('popstate', this.#apply);
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.#apply);
    window.removeEventListener('popstate', this.#apply);
  }
}

/**
 * Publishes the sticky top bar's real height as `--st-topbar-offset` on `<html>`, so the scroll
 * padding in SiteHeader.astro keeps anchor targets and focus below it at every width, however the
 * bar wraps (review WP-20 pass 4). While the bar is not sticky (below 1024px) the offset is 0.
 */
export function trackTopbar(doc: Document = document): void {
  const bar = doc.querySelector<HTMLElement>('.st-topbar');
  if (!bar) return;
  const root = doc.documentElement;
  const update = (): void => {
    const sticky = getComputedStyle(bar).position === 'sticky';
    const height = sticky ? Math.ceil(bar.getBoundingClientRect().height) : 0;
    root.style.setProperty('--st-topbar-offset', `${height}px`);
  };
  new ResizeObserver(update).observe(bar);
  window.addEventListener('resize', update);
  update();
}

trackTopbar();

if (!customElements.get('st-nav-drawer')) customElements.define('st-nav-drawer', StNavDrawer);
if (!customElements.get('st-lang-switch')) customElements.define('st-lang-switch', StLangSwitch);
