/*
 * <st-lang-banner>: the server-rendered "Continue in Afrikaans" banner, shown while the saved
 * language (`lang`, `st.lang`) is the one it offers (`data-locale`). CSS shows it from the first
 * paint through `<html data-st-lang-offer>`; this element keeps that attribute in step with the store
 * and sets `hidden` when the banner should go. See `LangBanner.astro`.
 *
 * - Following the link needs no script.
 * - "Stay on this page" saves the page's own language (`data-stay-locale`), which hides the
 *   banner here and on later visits.
 * - Close hides it for this page view only.
 *
 * Either way focus moves to `<main>`, so it is not lost with the banner.
 */
import { isEnabledLocale } from '../i18n/locales';
import { lang } from '../lib/store';

export class StLangBanner extends HTMLElement {
  #unsubscribe: (() => void) | undefined;
  #dismissed = false;

  readonly #onClick = (event: Event): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-lang-banner-stay]')) {
      const stay = this.dataset['stayLocale'];
      if (isEnabledLocale(stay)) lang.set(stay);
      this.#leave();
    } else if (target?.closest('[data-lang-banner-dismiss]')) {
      this.#dismissed = true;
      this.#leave();
    }
  };

  connectedCallback(): void {
    this.addEventListener('click', this.#onClick);
    this.#unsubscribe = lang.subscribe((saved) => {
      // The CSS that shows the banner reads this (set before paint by theme-init.js); keep it in
      // step when the choice changes here or in another tab.
      const root = this.ownerDocument.documentElement;
      if (saved === null || saved === this.dataset['stayLocale']) {
        root.removeAttribute('data-st-lang-offer');
      } else root.setAttribute('data-st-lang-offer', saved);
      this.hidden = this.#dismissed || saved === null || saved !== this.dataset['locale'];
    });
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #leave(): void {
    const hadFocus = this.contains(this.ownerDocument.activeElement);
    this.hidden = true;
    if (hadFocus) this.ownerDocument.getElementById('main')?.focus({ preventScroll: true });
  }
}

if (!customElements.get('st-lang-banner')) customElements.define('st-lang-banner', StLangBanner);
