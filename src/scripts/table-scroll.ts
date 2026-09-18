/*
 * <st-table-scroll>: the server-rendered wrapper is a focusable, labelled region
 * (`role="region"`, `tabindex="0"`), so keyboard users can scroll wide tables without JS.
 * When nothing overflows (narrow tables, stacked cards under 640px) the region is an empty
 * tab stop, so this element removes the stop and the landmark, and restores them on resize.
 */
export class StTableScroll extends HTMLElement {
  #observer: ResizeObserver | undefined;

  /** Re-check once focus leaves: the tab stop may have become removable while focused. */
  readonly #onBlur = (): void => this.#update();

  connectedCallback(): void {
    this.#observer = new ResizeObserver(() => this.#update());
    this.#observer.observe(this);
    const table = this.querySelector('table');
    if (table) this.#observer.observe(table);
    this.addEventListener('blur', this.#onBlur);
    this.#update();
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.removeEventListener('blur', this.#onBlur);
  }

  #update(): void {
    // Compare the table's laid-out width, not scrollWidth: WebKit reports a few pixels of
    // scrollWidth beyond a 100%-wide border-collapse table even though nothing overflows.
    const table = this.querySelector('table');
    const needed = table ? table.getBoundingClientRect().width : this.scrollWidth;
    const scrollable = needed > this.clientWidth + 1;
    const label = this.dataset['labelledby'];
    if (scrollable) {
      this.setAttribute('role', 'region');
      this.setAttribute('tabindex', '0');
      if (label) this.setAttribute('aria-labelledby', label);
    } else if (this.matches(':focus')) {
      // Removing tabindex from the focused element would drop focus back to <body>.
      // The blur listener runs this again once focus has moved on by itself.
      this.dataset['scrollable'] = 'false';
      return;
    } else {
      // aria-labelledby is not allowed on an element without a role, so drop it too.
      this.removeAttribute('role');
      this.removeAttribute('tabindex');
      this.removeAttribute('aria-labelledby');
    }
    this.dataset['scrollable'] = String(scrollable);
  }
}

if (!customElements.get('st-table-scroll')) customElements.define('st-table-scroll', StTableScroll);
