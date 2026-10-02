/*
 * <st-code-scroll>: the server renders a fenced block's <pre> as a named, focusable region
 * (`role="region"`, `tabindex="0"`, `aria-label`), so a keyboard can scroll a wide template
 * preview with no JavaScript (WCAG 2.1.1). Most blocks fit and do not scroll, and then that
 * region is a silent tab stop, so this element removes the stop and the role while nothing
 * overflows and restores them when the viewport makes the block scroll. Same rule as
 * <st-table-scroll>, applied to the <pre> itself.
 */
export class StCodeScroll extends HTMLElement {
  #observer: ResizeObserver | undefined;
  #pre: HTMLPreElement | null = null;

  readonly #onBlur = (): void => this.#update();

  connectedCallback(): void {
    this.#pre = this.querySelector('pre');
    if (!this.#pre) return;
    this.#observer = new ResizeObserver(() => this.#update());
    this.#observer.observe(this.#pre);
    this.#pre.addEventListener('blur', this.#onBlur);
    this.#update();
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#pre?.removeEventListener('blur', this.#onBlur);
  }

  #update(): void {
    const pre = this.#pre;
    if (!pre) return;
    const scrollable = pre.scrollWidth > pre.clientWidth + 1;
    const label = pre.dataset['label'];
    if (scrollable) {
      pre.setAttribute('role', 'region');
      pre.setAttribute('tabindex', '0');
      if (label) pre.setAttribute('aria-label', label);
    } else if (pre.matches(':focus')) {
      // Removing tabindex from the focused element would drop focus to <body>; retry on blur.
      return;
    } else {
      pre.removeAttribute('role');
      pre.removeAttribute('tabindex');
      pre.removeAttribute('aria-label');
    }
    pre.dataset['scrollable'] = String(scrollable);
  }
}

if (!customElements.get('st-code-scroll')) customElements.define('st-code-scroll', StCodeScroll);
