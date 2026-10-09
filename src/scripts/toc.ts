/*
 * <st-toc>: scroll-spy for "On this page" (build plan B2, B4: TOC `aria-current="location"`).
 *
 * The section being read is the last listed heading whose top has passed the line just under the
 * top bar (the page's own `scroll-padding-block-start`, which follows the bar's height). That is
 * where a contents link puts its heading, so following a link marks the section it went to. At
 * the very bottom of the page the last heading that is on screen wins, because a short last
 * section can never reach the line.
 *
 * Its link gets `aria-current="location"`; below 1280px the "Now reading" pill shows its title once
 * the list itself and the section's own heading have scrolled away, and links back to the list
 * (opening it). Nothing animates
 * that `prefers-reduced-motion` would object to: the pill's fade uses `--st-duration-base`, which
 * the tokens set to 0 under reduced motion, and nothing scrolls by itself.
 */
import { interpolate } from '../i18n';

/**
 * Index of the current heading: the last one whose top is at or above `line`, or -1 before the
 * first. When the page cannot scroll further (`atBottom`), the last heading above `viewportBottom`.
 */
export function currentIndex(
  tops: readonly number[],
  line: number,
  atBottom = false,
  viewportBottom = Number.POSITIVE_INFINITY,
): number {
  let current = -1;
  for (let index = 0; index < tops.length; index++) {
    const top = tops[index] ?? Number.POSITIVE_INFINITY;
    if (top <= line || (atBottom && top < viewportBottom)) current = index;
  }
  return current;
}

/** A little below the scroll padding, so a heading a link scrolled to counts as passed. */
const LINE_SLACK = 8;

export class StToc extends HTMLElement {
  #links: HTMLAnchorElement[] = [];
  #targets: HTMLElement[] = [];
  #details: HTMLDetailsElement | null = null;
  #pill: HTMLAnchorElement | null = null;
  #pillText: HTMLElement | null = null;
  #frame = 0;
  #current = -2;

  readonly #schedule = (): void => {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.update();
    });
  };

  /**
   * A contents link to a `<details>` ("Words used in this file", closed below 1024px) opens it, on
   * a click and when the page opens at its fragment: the browser does not open a `<details>` that is
   * itself the target (WP-50a review pass 1, m1).
   */
  readonly #openTarget = (event?: Event): void => {
    const link = event?.target instanceof Element ? event.target.closest('a') : null;
    // Heading ids are ASCII slugs, so the fragment needs no decoding.
    const target = this.ownerDocument.getElementById((link ?? window.location).hash.slice(1));
    if (target instanceof HTMLDetailsElement) target.open = true;
  };

  readonly #onPill = (): void => {
    if (this.#details) this.#details.open = true;
  };

  connectedCallback(): void {
    this.#links = [];
    this.#targets = [];
    for (const link of this.querySelectorAll<HTMLAnchorElement>('.st-toc__list a[href^="#"]')) {
      const id = decodeURIComponent(link.hash.slice(1));
      const target = id ? this.ownerDocument.getElementById(id) : null;
      if (!target) continue;
      this.#links.push(link);
      this.#targets.push(target);
    }
    this.#details = this.querySelector('details');
    this.#pill = this.querySelector('[data-toc-pill]');
    this.#pillText = this.querySelector('[data-toc-pill-text]');
    this.#pill?.addEventListener('click', this.#onPill);
    window.addEventListener('scroll', this.#schedule, { passive: true });
    window.addEventListener('resize', this.#schedule);
    window.addEventListener('hashchange', this.#schedule);
    this.addEventListener('click', this.#openTarget);
    window.addEventListener('hashchange', this.#openTarget);
    this.#openTarget();
    this.#current = -2;
    this.update();
  }

  disconnectedCallback(): void {
    this.#pill?.removeEventListener('click', this.#onPill);
    window.removeEventListener('scroll', this.#schedule);
    window.removeEventListener('resize', this.#schedule);
    window.removeEventListener('hashchange', this.#schedule);
    this.removeEventListener('click', this.#openTarget);
    window.removeEventListener('hashchange', this.#openTarget);
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  /** The line a heading's top must pass, in viewport pixels. */
  #line(): number {
    const padding = parseFloat(
      getComputedStyle(this.ownerDocument.documentElement).scrollPaddingBlockStart,
    );
    return (Number.isFinite(padding) ? padding : 0) + LINE_SLACK;
  }

  /** Recomputes the current section and updates the links and the pill. */
  update(): void {
    const doc = this.ownerDocument;
    const view = doc.defaultView;
    const line = this.#line();
    const viewportBottom = view?.innerHeight ?? Number.POSITIVE_INFINITY;
    const scroller = doc.scrollingElement ?? doc.documentElement;
    const atBottom =
      view !== null &&
      view.scrollY > 0 &&
      view.scrollY + view.innerHeight >= scroller.scrollHeight - 2;
    const tops = this.#targets.map((target) => target.getBoundingClientRect().top);
    const index = currentIndex(tops, line, atBottom, viewportBottom);
    if (index !== this.#current) {
      this.#current = index;
      this.#links.forEach((link, position) => {
        if (position === index) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      const title = this.#links[index]?.textContent ?? '';
      if (this.#pillText) this.#pillText.textContent = title;
      // The visible "Now reading <title>" names the section; the name also says where the link
      // goes, the list of sections (WCAG 2.4.4, review WP-30 pass 1).
      const template = this.#pill?.dataset['labelTemplate'];
      if (template) this.#pill?.setAttribute('aria-label', interpolate(template, { title }));
    }
    if (this.#pill) {
      const listGone = this.#details ? this.#details.getBoundingClientRect().bottom < line : true;
      // While the section's own heading is on screen it already says where the reader is, and a
      // pill of three or more lines would cover it: the pill waits until it has scrolled away
      // (WP-50a review pass 1, M3). Right after a contents link, that is always the case.
      const bar = parseFloat(
        getComputedStyle(doc.documentElement).getPropertyValue('--st-topbar-offset'),
      );
      const headingShown = (this.#targets[index]?.getBoundingClientRect().bottom ?? 0) > (bar || 0);
      this.#pill.hidden = !(index >= 0 && listGone && !headingShown);
    }
  }
}

if (!customElements.get('st-toc')) customElements.define('st-toc', StToc);
