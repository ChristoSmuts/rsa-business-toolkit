/*
 * <st-storage-notice>: server-rendered `hidden`, shown while the device does not keep what the
 * guide saves (`storageAvailable` is `false`: storage blocked, private mode, or a write failed).
 * Everything still works for the page view; the notice says it will be lost.
 *
 * With `data-show="available"` it is the opposite: shown while storage works and hidden once it
 * fails, for a line such as "Ticks are saved on this device only" that would otherwise contradict
 * the warning beside it.
 */
import { storageAvailable } from '../lib/store';

export class StStorageNotice extends HTMLElement {
  #unsubscribe: (() => void) | undefined;

  connectedCallback(): void {
    this.#unsubscribe = storageAvailable.subscribe((available) => {
      this.hidden = this.dataset['show'] === 'available' ? !available : available;
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
