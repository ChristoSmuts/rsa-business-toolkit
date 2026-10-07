/*
 * <st-your-path>: the home page's "Your path" card (build plan B3 flow 2, B6; WP-31): the ring,
 * "Continue: step 4 of 10" (a link to that step's first page), "Open my path" and "Edit answers".
 * It reads the stored path like the top bar's ring (`path-progress.ts`). When that is missing or
 * out of date it loads the rules (`path-data.ts`, lazily) and stores the path again, which redraws
 * every path element on the page. Only the home page has this element, so only the home page (a
 * tool page, with the larger budget) ever loads the rules lazily.
 */
import { viewProgress, viewRoute, type PathView } from '../lib/path-view';
import { href } from '../lib/paths';
import { pathDone, pathView, profile } from '../lib/profile-store';
import { currentView, fill, PathElement } from './path-progress';
import { drawRing, pageLocale } from './ring';

let pending: Promise<typeof import('./path-data')> | undefined;
/** The rules and the engine, loaded once. */
export function loadPathData(): Promise<typeof import('./path-data')> {
  pending ??= import('./path-data');
  return pending;
}

export class StYourPath extends PathElement {
  /** The last rebuild, for tests. */
  rebuilt: Promise<void> = Promise.resolve();

  protected empty(): void {
    this.hidden = true;
    // No answers: give back the space kept for the card before first paint. While the path is
    // only being rebuilt, keep it, so the card appears without moving the page.
    this.toggleAttribute('data-no-path', !profile.get());
  }

  protected override rebuild(version: string): void {
    this.rebuilt = loadPathData().then(
      (data) => {
        this.removeAttribute('data-path-failed');
        const who = profile.get();
        if (who && !currentView(version)) pathView.set(data.viewOf(who, version));
      },
      () => {
        // The rules did not load (a dropped request): give back the space kept for the card, and
        // let the next trigger try again (review WP-31 pass 5, minor 1).
        pending = undefined;
        this.setAttribute('data-path-failed', '');
      },
    );
  }

  protected draw(view: PathView): void {
    const locale = pageLocale(this);
    const { done, total, next } = viewProgress(view, pathDone.get());
    const progress = fill(this.dataset['progress'] ?? '{done}/{total}', { done, total });
    drawRing(this, done, total, progress);
    const text = this.querySelector('[data-progress-text]');
    if (text) text.textContent = progress;
    const resume = this.querySelector<HTMLAnchorElement>('a[data-continue]');
    if (resume) {
      const route = next ? viewRoute(view, next.first) : undefined;
      resume.hidden = !next || !route;
      if (next && route) {
        resume.href = href(locale, route);
        const label = resume.querySelector('.st-btn__label') ?? resume;
        label.textContent = fill(this.dataset['continue'] ?? '{n}', { n: next.n, total });
      }
    }
    this.hidden = false;
  }
}

if (!customElements.get('st-your-path')) customElements.define('st-your-path', StYourPath);
