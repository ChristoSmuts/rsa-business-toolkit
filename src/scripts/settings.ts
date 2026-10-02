/*
 * The settings on `/about/` (build plan B1, B5).
 *
 * <st-setting data-setting="shortcuts|lowData">  one on/off switch (a native checkbox with
 *        `role="switch"`) bound to its store. Another tab, or "Clear all my data", moves it too.
 * <st-clear-data>  "Clear all my data": asks in a confirm dialog, then `clearAll()` removes every
 *        `st.` key on the device and puts every store back to its default (theme follows the
 *        system again, low data off, shortcuts on, no ticks), and the status line says it is done.
 */
import { clearAll, lowData, shortcuts, type PersistentStore } from '../lib/store';
import { announce, askToConfirm } from './confirm-dialog';
import './storage-notice';

const SETTINGS: Readonly<Record<string, PersistentStore<boolean>>> = { shortcuts, lowData };

export class StSetting extends HTMLElement {
  #box: HTMLInputElement | null = null;
  #store: PersistentStore<boolean> | undefined;
  #unsubscribe: (() => void) | undefined;

  readonly #onChange = (): void => {
    if (this.#box) this.#store?.set(this.#box.checked);
  };

  connectedCallback(): void {
    this.#store = SETTINGS[this.dataset['setting'] ?? ''];
    this.#box = this.querySelector('input[type="checkbox"]');
    if (!this.#store || !this.#box) return;
    this.#box.addEventListener('change', this.#onChange);
    this.#unsubscribe = this.#store.subscribe((on) => {
      if (this.#box) this.#box.checked = on;
    });
  }

  disconnectedCallback(): void {
    this.#box?.removeEventListener('change', this.#onChange);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }
}

export class StClearData extends HTMLElement {
  #button: HTMLButtonElement | null = null;
  #dialog: HTMLDialogElement | null = null;
  #status: Element | null = null;

  readonly #onClick = (): void => {
    if (!this.#dialog) return;
    void askToConfirm(this.#dialog, this.#button).then((confirmed) => {
      if (!confirmed) return;
      clearAll();
      announce(this.#status, this.dataset['done'] ?? '');
    });
  };

  connectedCallback(): void {
    this.#button = this.querySelector('[data-clear-data]');
    this.#dialog = this.querySelector('dialog');
    this.#status = this.querySelector('[role="status"]');
    this.#button?.addEventListener('click', this.#onClick);
  }

  disconnectedCallback(): void {
    this.#button?.removeEventListener('click', this.#onClick);
  }
}

if (!customElements.get('st-setting')) customElements.define('st-setting', StSetting);
if (!customElements.get('st-clear-data')) customElements.define('st-clear-data', StClearData);
