/*
 * <st-theme-toggle>: wraps Astro-rendered segmented radios (system | light | dark), plan C2.
 *
 * The choice lives in the `theme` store (`st.theme`, `src/lib/store.ts`). `system` is stored
 * deliberately — it is the reader's explicit choice — and both `system` and a missing key leave
 * `data-theme` unset, so `prefers-color-scheme` applies; `theme-init.js` reads the same key before
 * paint with the same rule.
 *
 * The module applies the store to the document once, whatever changes it: a toggle on this page,
 * another tab (the `storage` event), or "Clear all my data" putting it back to `system`. Every
 * toggle on the page follows the store, including ones connected later (drawers, dialogs).
 */
import { theme, type ThemeChoice } from '../lib/store';

function isChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Point every theme-color meta at the chosen theme, or back at its own scheme for `system`. */
function applyThemeColor(choice: ThemeChoice): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  const chosen = [...metas].find((meta) => meta.dataset['stScheme'] === choice);
  for (const meta of metas) {
    const colour = chosen?.dataset['stColour'] ?? meta.dataset['stColour'];
    if (colour) meta.content = colour;
  }
}

/** Puts a choice on the document: `data-theme` and the theme-color metas. */
export function applyTheme(
  choice: ThemeChoice,
  root: HTMLElement = document.documentElement,
): void {
  if (choice === 'system') delete root.dataset['theme'];
  else root.dataset['theme'] = choice;
  applyThemeColor(choice);
}

theme.subscribe((choice) => applyTheme(choice));

export class StThemeToggle extends HTMLElement {
  #unsubscribe: (() => void) | undefined;

  readonly #onChange = (event: Event): void => {
    const radio = event.target;
    if (radio instanceof HTMLInputElement && radio.checked && isChoice(radio.value)) {
      theme.set(radio.value);
    }
  };

  connectedCallback(): void {
    this.addEventListener('change', this.#onChange);
    this.#unsubscribe = theme.subscribe((choice) => this.#check(choice));
  }

  disconnectedCallback(): void {
    this.removeEventListener('change', this.#onChange);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #check(choice: ThemeChoice): void {
    for (const radio of this.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      radio.checked = radio.value === choice;
    }
  }
}

if (!customElements.get('st-theme-toggle')) customElements.define('st-theme-toggle', StThemeToggle);
