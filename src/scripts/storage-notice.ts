/*
 * <st-storage-notice>: server-rendered `hidden`, shown while the device does not keep what the
 * guide saves (`storageAvailable` is `false`: storage blocked, private mode, or a write failed).
 * Everything still works for the page view; the notice says it will be lost.
 */
import { storageAvailable } from '../lib/store';

export class StStorageNotice extends HTMLElement {
  #unsubscribe: (() => void) | undefined;

  connectedCallback(): void {
    this.#unsubscribe = storageAvailable.subscribe((available) => {
      this.hidden = available;
    });
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }
}

if (!customElements.get('st-storage-notice')) {
  customElements.define('st-storage-notice', StStorageNotice);
}
