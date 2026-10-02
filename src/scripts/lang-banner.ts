/*
 * <st-lang-banner>: shows the server-rendered "Continue in Afrikaans" banner while the saved
 * language (`lang`, `st.lang`) is the one it offers (`data-locale`). See `LangBanner.astro`.
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
