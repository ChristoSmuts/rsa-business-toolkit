/*
 * <st-save-answers>: on a pre-rendered result page (`find-my-path/result/…`), a reader with
 * JavaScript (who reached it from a shared link or their history) can keep these answers: the
 * button saves the profile and the path, then opens My path (review WP-31 pass 1, minor 2).
 * Without JavaScript the page says instead that the answers are not saved.
 */
import { parseProfile, profileQuery } from '../lib/profile';
import { pathView, profile, storageAvailable } from '../lib/profile-store';
import { viewOf } from './path-data';

export class StSaveAnswers extends HTMLElement {
  /** Leaves the page. Replaced in tests. */
  navigate: (url: string) => void = (url) => {
    window.location.assign(url);
  };

  readonly #onClick = (): void => {
    const answers = parseProfile(JSON.parse(this.dataset['profile'] ?? 'null'));
    if (!answers) return;
    profile.set(answers);
    pathView.set(viewOf(answers, this.dataset['version'] ?? ''));
    const target = new URL(this.dataset['myPath'] ?? '', window.location.href);
    target.search = storageAvailable.get() ? 'saved=1' : profileQuery(answers);
    this.navigate(target.href);
  };

  connectedCallback(): void {
    this.querySelector('button')?.addEventListener('click', this.#onClick);
  }

  disconnectedCallback(): void {
    this.querySelector('button')?.removeEventListener('click', this.#onClick);
  }
}

if (!customElements.get('st-save-answers')) customElements.define('st-save-answers', StSaveAnswers);
