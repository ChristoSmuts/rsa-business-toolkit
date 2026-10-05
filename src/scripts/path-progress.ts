/*
 * The path wherever the reader is (build plan B2, B3 flow 2, B6; WP-31). All three elements wrap
 * markup the server rendered, stay hidden or unchanged without a profile, and follow the stores,
 * so a change in another tab or on My path shows at once.
 *
 * <st-path-progress>  the top bar's "My path" link with its ring: "My path: 3 of 10 steps done".
 * <st-your-path>      the home page's "Your path" card: "Continue: step 4 of 10" (a link to that
 *                     step's first page), "Open my path" and "Edit answers".
 * <st-path-pager>     wraps a document's Previous / Next: when the document is on the reader's
 *                     path, the links follow the path instead of the section order. A side with
 *                     no path neighbour keeps the section-order link.
 */
import { interpolate } from '../i18n';
import { pathNeighbours, pathProgress, type PathItem } from '../lib/path-engine';
import { pathDone, profile } from '../lib/profile-store';
import { drawRing, pageLocale, pathDocHref, pathDocTitle, readerPath } from './path-data';

type Stop = () => void;

function follow(render: () => void): Stop[] {
  return [profile.subscribe(render), pathDone.subscribe(render)];
}

export class StPathProgress extends HTMLElement {
  #stops: Stop[] = [];

  connectedCallback(): void {
    this.#stops = follow(() => this.render());
  }

  disconnectedCallback(): void {
    for (const stop of this.#stops) stop();
    this.#stops = [];
  }

  render(): void {
    const who = profile.get();
    this.hidden = who === null;
    if (!who) return;
    const { done, total } = pathProgress(readerPath(who), pathDone.get());
    const text = interpolate(this.dataset['template'] ?? '{done}/{total}', { done, total });
    drawRing(this, done, total, text);
    const label = this.querySelector('[data-progress-text]');
    if (label) label.textContent = text;
  }
}

export class StYourPath extends HTMLElement {
  #stops: Stop[] = [];

  connectedCallback(): void {
    this.#stops = follow(() => this.render());
  }

  disconnectedCallback(): void {
    for (const stop of this.#stops) stop();
    this.#stops = [];
  }

  render(): void {
    const who = profile.get();
    this.hidden = who === null;
    if (!who) return;
    const locale = pageLocale(this);
    const path = readerPath(who);
    const { done, total, next } = pathProgress(path, pathDone.get());
    const progress = interpolate(this.dataset['progress'] ?? '{done}/{total}', { done, total });
    drawRing(this, done, total, progress);
    const text = this.querySelector('[data-progress-text]');
    if (text) text.textContent = progress;
    const resume = this.querySelector<HTMLAnchorElement>('a[data-continue]');
    if (!resume) return;
    const first = next?.items[0];
    const target = first ? pathDocHref(locale, first.doc, first.anchor) : undefined;
    resume.hidden = !next || !target;
    if (next && target) {
      resume.href = target;
      const label = resume.querySelector('.st-btn__label') ?? resume;
      label.textContent = interpolate(this.dataset['continue'] ?? '{n}', { n: next.n, total });
    }
  }
}

export class StPathPager extends HTMLElement {
  #original = new Map<HTMLAnchorElement, { href: string; title: string; lang: string | null }>();
  #stops: Stop[] = [];

  connectedCallback(): void {
    for (const link of this.querySelectorAll<HTMLAnchorElement>('a[rel="prev"], a[rel="next"]')) {
      const title = link.querySelector('[data-pager-title]');
      this.#original.set(link, {
        href: link.getAttribute('href') ?? '',
        title: title?.textContent ?? '',
        lang: title?.getAttribute('lang') ?? null,
      });
    }
    this.#stops = [profile.subscribe(() => this.render())];
  }

  disconnectedCallback(): void {
    for (const stop of this.#stops) stop();
    this.#stops = [];
    this.#original.clear();
  }

  render(): void {
    const who = profile.get();
    const doc = this.dataset['doc'] ?? '';
    const around = who ? pathNeighbours(readerPath(who), doc) : undefined;
    const locale = pageLocale(this);
    this.toggleAttribute('data-on-path', around?.onPath === true);
    for (const [link, original] of this.#original) {
      const item: PathItem | undefined =
        link.rel === 'prev' ? around?.previous : link.rel === 'next' ? around?.next : undefined;
      const target = item ? pathDocHref(locale, item.doc, item.anchor) : undefined;
      const title = link.querySelector('[data-pager-title]');
      if (item && target) {
        const named = pathDocTitle(locale, item.doc);
        link.href = target;
        if (title) {
          title.textContent = named.title;
          if (named.lang) title.setAttribute('lang', named.lang);
          else title.removeAttribute('lang');
        }
      } else {
        link.href = original.href;
        if (title) {
          title.textContent = original.title;
          if (original.lang) title.setAttribute('lang', original.lang);
          else title.removeAttribute('lang');
        }
      }
    }
  }
}

if (!customElements.get('st-path-progress'))
  customElements.define('st-path-progress', StPathProgress);
if (!customElements.get('st-your-path')) customElements.define('st-your-path', StYourPath);
if (!customElements.get('st-path-pager')) customElements.define('st-path-pager', StPathPager);
