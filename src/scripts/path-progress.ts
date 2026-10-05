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
 *
 * This module is on every page (the top bar), so it stays small: the path data and the engine
 * (`path-data.ts`, about 3 KB gzipped) load only once there is a profile, the way search loads its
 * index only when it is opened. A reader who never answered the questions never downloads them.
 */
import { interpolate } from '../i18n';
import type { PathItem } from '../lib/path-engine';
import type { Profile } from '../lib/profile';
import { pathDone, profile } from '../lib/profile-store';

type Stop = () => void;
type PathData = typeof import('./path-data');

let pending: Promise<PathData> | undefined;
/** The path data and engine, loaded once, on first need. */
export function loadPathData(): Promise<PathData> {
  pending ??= import('./path-data');
  return pending;
}

/**
 * Draws after the data has loaded, for the profile current then; a draw that a newer change
 * overtook does nothing. `rendered` is the last one, so tests can wait for it.
 */
abstract class PathElement extends HTMLElement {
  #stops: Stop[] = [];
  #ticket = 0;
  rendered: Promise<void> = Promise.resolve();

  protected watch(): Stop[] {
    return [profile.subscribe(() => this.update()), pathDone.subscribe(() => this.update())];
  }

  connectedCallback(): void {
    this.#stops = this.watch();
  }

  disconnectedCallback(): void {
    for (const stop of this.#stops) stop();
    this.#stops = [];
    this.#ticket++;
  }

  update(): Promise<void> {
    const ticket = ++this.#ticket;
    const who = profile.get();
    if (!who) {
      this.empty();
      this.rendered = Promise.resolve();
      return this.rendered;
    }
    this.rendered = loadPathData().then((data) => {
      if (ticket === this.#ticket) this.draw(data, who);
    });
    return this.rendered;
  }

  /** No profile. */
  protected abstract empty(): void;
  protected abstract draw(data: PathData, who: Profile): void;
}

export class StPathProgress extends PathElement {
  protected empty(): void {
    this.hidden = true;
  }

  protected draw(data: PathData, who: Profile): void {
    const { done, total } = data.pathProgress(data.readerPath(who), pathDone.get());
    const text = interpolate(this.dataset['template'] ?? '{done}/{total}', { done, total });
    data.drawRing(this, done, total, text);
    const label = this.querySelector('[data-progress-text]');
    if (label) label.textContent = text;
    this.hidden = false;
  }
}

export class StYourPath extends PathElement {
  protected empty(): void {
    this.hidden = true;
  }

  protected draw(data: PathData, who: Profile): void {
    const locale = data.pageLocale(this);
    const { done, total, next } = data.pathProgress(data.readerPath(who), pathDone.get());
    const progress = interpolate(this.dataset['progress'] ?? '{done}/{total}', { done, total });
    data.drawRing(this, done, total, progress);
    const text = this.querySelector('[data-progress-text]');
    if (text) text.textContent = progress;
    const resume = this.querySelector<HTMLAnchorElement>('a[data-continue]');
    if (resume) {
      const first = next?.items[0];
      const target = first ? data.pathDocHref(locale, first.doc, first.anchor) : undefined;
      resume.hidden = !next || !target;
      if (next && target) {
        resume.href = target;
        const label = resume.querySelector('.st-btn__label') ?? resume;
        label.textContent = interpolate(this.dataset['continue'] ?? '{n}', { n: next.n, total });
      }
    }
    this.hidden = false;
  }
}

interface Link {
  readonly href: string;
  readonly title: string;
  readonly lang: string | null;
}

export class StPathPager extends PathElement {
  #original = new Map<HTMLAnchorElement, Link>();

  protected override watch(): Stop[] {
    for (const link of this.querySelectorAll<HTMLAnchorElement>('a[rel="prev"], a[rel="next"]')) {
      const title = link.querySelector('[data-pager-title]');
      this.#original.set(link, {
        href: link.getAttribute('href') ?? '',
        title: title?.textContent ?? '',
        lang: title?.getAttribute('lang') ?? null,
      });
    }
    return [profile.subscribe(() => this.update())];
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#original.clear();
  }

  protected empty(): void {
    this.removeAttribute('data-on-path');
    for (const [link, original] of this.#original) this.#set(link, original);
  }

  protected draw(data: PathData, who: Profile): void {
    const around = data.pathNeighbours(data.readerPath(who), this.dataset['doc'] ?? '');
    const locale = data.pageLocale(this);
    this.toggleAttribute('data-on-path', around.onPath);
    for (const [link, original] of this.#original) {
      const item: PathItem | undefined = link.rel === 'prev' ? around.previous : around.next;
      const target = item ? data.pathDocHref(locale, item.doc, item.anchor) : undefined;
      if (!item || !target) {
        this.#set(link, original);
        continue;
      }
      const named = data.pathDocTitle(locale, item.doc);
      this.#set(link, { href: target, title: named.title, lang: named.lang ?? null });
    }
  }

  #set(link: HTMLAnchorElement, value: Link): void {
    link.href = value.href;
    const title = link.querySelector('[data-pager-title]');
    if (!title) return;
    title.textContent = value.title;
    if (value.lang) title.setAttribute('lang', value.lang);
    else title.removeAttribute('lang');
  }
}

if (!customElements.get('st-path-progress'))
  customElements.define('st-path-progress', StPathProgress);
if (!customElements.get('st-your-path')) customElements.define('st-your-path', StYourPath);
if (!customElements.get('st-path-pager')) customElements.define('st-path-pager', StPathPager);
