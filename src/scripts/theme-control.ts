/*
 * <st-theme-toggle>: wraps Astro-rendered segmented radios (system | light | dark), plan C2.
 * Writes `st.theme`; `system` removes data-theme so prefers-color-scheme applies.
 * Every toggle on the page stays in sync, including ones connected later (drawers, dialogs).
 * Loaded as a normal Astro-processed module script (see design-system.astro).
 *
 * WP-30, please reclaim this. `src/scripts/**` is on the ESLint `localStorage` allow-list only
 * because `theme-init.js` has to run before any module loads; this file is an ordinary module
 * and should read and write `st.theme` through `src/lib/store.ts` once that exists, so the key
 * has one owner. It stores `system` deliberately — that is the reader's explicit choice, not
 * the absence of one — and `theme-init` treats `system`, a missing key and blocked storage the
 * same way, by leaving `data-theme` unset. Keep that contract when you move it.
 */
type Choice = 'system' | 'light' | 'dark';

const KEY = 'st.theme';
const EVENT = 'st-theme-change';

function isChoice(value: unknown): value is Choice {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readChoice(): Choice {
  try {
    const saved = localStorage.getItem(KEY);
    return isChoice(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

/** Point every theme-color meta at the chosen theme, or back at its own scheme for `system`. */
function applyThemeColor(choice: Choice): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  const chosen = [...metas].find((meta) => meta.dataset['stScheme'] === choice);
  for (const meta of metas) {
    const colour = chosen?.dataset['stColour'] ?? meta.dataset['stColour'];
    if (colour) meta.content = colour;
  }
}

function apply(choice: Choice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset['theme'];
  else root.dataset['theme'] = choice;
  applyThemeColor(choice);
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Storage unavailable: the choice still applies for this page view.
  }
  document.dispatchEvent(new CustomEvent<Choice>(EVENT, { detail: choice }));
}

export class StThemeToggle extends HTMLElement {
  readonly #onChange = (event: Event): void => {
    const radio = event.target;
    if (radio instanceof HTMLInputElement && radio.checked && isChoice(radio.value)) {
      apply(radio.value);
    }
  };

  readonly #onSync = (event: Event): void => {
    const choice = (event as CustomEvent<unknown>).detail;
    if (isChoice(choice)) this.#check(choice);
  };

  connectedCallback(): void {
    this.#check(readChoice());
    this.addEventListener('change', this.#onChange);
    document.addEventListener(EVENT, this.#onSync);
  }

  disconnectedCallback(): void {
    this.removeEventListener('change', this.#onChange);
    document.removeEventListener(EVENT, this.#onSync);
  }

  #check(choice: Choice): void {
    for (const radio of this.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      radio.checked = radio.value === choice;
    }
  }
}

if (!customElements.get('st-theme-toggle')) customElements.define('st-theme-toggle', StThemeToggle);
