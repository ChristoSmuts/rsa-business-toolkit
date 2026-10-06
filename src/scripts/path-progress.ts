/*
 * The path wherever the reader is (build plan B2, B3 flow 2, B6; WP-31). All three elements wrap
 * markup the server rendered, stay hidden or unchanged without a profile, and follow the stores,
 * so a change in another tab or on My path shows at once.
 *
 * <st-path-progress>  the top bar's "My path" link with its ring: "My path: 3 of 10 steps done".
 * <st-your-path>      the home page's card, in `your-path.ts` on the same base class.
 * <st-path-pager>     wraps a document's Previous / Next: when the document is on the reader's
 *                     path, the links follow the path instead of the section order; a side with no
 *                     path neighbour keeps the section order, and the path's last page leads to My
 *                     path.
 *
 * This module is on every page, so it carries no rules and no engine (review WP-31 pass 1, major 1).
 * It reads the path stored on the device (`st.pathView.v1`, `src/lib/path-view.ts`), which the
 * wizard and My path write, and the home page rebuilds lazily (`your-path.ts`) when it was built
 * for other answers or other rules (`data-version`, the hash of `paths.json`). Until then a
 * document page shows no ring and keeps its pager in section order; it never loads the rules.
 */
import {
  viewFor,
  viewNeighbours,
  viewProgress,
  viewRoute,
  viewTitle,
  type PathView,
  type ViewItem,
} from '../lib/path-view';
import { href } from '../lib/paths';
import { profileQuery } from '../lib/profile';
import { pathDone, pathView, profile } from '../lib/profile-store';
import { drawRing, pageLocale } from './ring';

type Stop = () => void;

/** The stored path when it fits the saved answers and this build's rules, else `undefined`. */
export function currentView(version: string): PathView | undefined {
  const who = profile.get();
  return who ? viewFor(pathView.get(), version, profileQuery(who)) : undefined;
}

export abstract class PathElement extends HTMLElement {
  #stops: Stop[] = [];

  protected watch(): Stop[] {
    const update = (): void => this.update();
    return [profile.subscribe(update), pathDone.subscribe(update), pathView.subscribe(update)];
  }

  connectedCallback(): void {
    this.#stops = this.watch();
  }

  disconnectedCallback(): void {
    for (const stop of this.#stops) stop();
    this.#stops = [];
  }

  update(): void {
    const version = this.dataset['version'] ?? '';
    const view = currentView(version);
    if (view) {
      this.draw(view);
      return;
    }
    this.empty();
    if (profile.get()) this.rebuild(version);
  }

  /**
   * The stored path is missing or out of date. Document pages leave it at that (no ring, the
   * pager in section order); the home page, My path and the wizard rebuild it.
   */
  protected rebuild(_version: string): void {}

  /** No profile, or the path is being rebuilt. */
  protected abstract empty(): void;
  protected abstract draw(view: PathView): void;
}

/** `{n}`-style template text with the values filled in (`interpolate`, without the import). */
export function fill(template: string, values: Readonly<Record<string, number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export class StPathProgress extends PathElement {
  protected empty(): void {
    this.hidden = true;
  }

  protected draw(view: PathView): void {
    const { done, total } = viewProgress(view, pathDone.get());
    const text = fill(this.dataset['template'] ?? '{done}/{total}', { done, total });
    drawRing(this, done, total, text);
    const label = this.querySelector('[data-progress-text]');
    if (label) label.textContent = text;
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
    const update = (): void => this.update();
    return [profile.subscribe(update), pathView.subscribe(update)];
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#original.clear();
  }

  protected empty(): void {
    this.removeAttribute('data-on-path');
    for (const [link, original] of this.#original) this.#set(link, original);
  }

  protected draw(view: PathView): void {
    const around = viewNeighbours(view, this.dataset['doc'] ?? '');
    const locale = pageLocale(this);
    this.toggleAttribute('data-on-path', around.onPath);
    for (const [link, original] of this.#original) {
      const page: ViewItem | undefined = link.rel === 'prev' ? around.previous : around.next;
      const route = page ? viewRoute(view, page) : undefined;
      if (page && route) {
        const named = viewTitle(view, page.doc, locale);
        this.#set(link, {
          href: href(locale, route),
          title: named.title,
          lang: named.lang ?? null,
        });
      } else if (link.rel === 'next' && around.last && this.dataset['myPath']) {
        // The end of the path: back to My path rather than on in the section order.
        this.#set(link, {
          href: this.dataset['myPath'],
          title: this.dataset['myPathTitle'] ?? '',
          lang: null,
        });
      } else {
        this.#set(link, original);
      }
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
if (!customElements.get('st-path-pager')) customElements.define('st-path-pager', StPathPager);
