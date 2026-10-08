/*
 * <st-my-path>: the My path dashboard (build plan B1, B3 flows 1–2, B6; WP-31).
 *
 * The server renders every piece `hidden`: the reader's answers as chips (all thirteen), every
 * step of every rule as a card (`PathSteps.astro`), the master checklist's parts and each kind of
 * business's own checklist. This element shows the ones that fit the profile, numbers and orders
 * the steps, and keeps everything in step with the stores:
 * - no profile: the empty state ("Find my path");
 * - "Mark as done" marks every page of a step as read (`st.path.v1`); the ring counts steps;
 * - "Remove my answers" asks first, then removes the profile and the marks (ticks stay), says so,
 *   and moves focus to the page heading;
 * - answers in the address (`?entity=…&type=…&stage=…`, sent by the wizard when the device would
 *   not save them) are used when there are no saved answers, and kept in the address so a reload
 *   still shows them;
 * - `?saved=1` (sent by the wizard) says once that the answers are saved on this device only.
 * The personalised checklist is `<st-applies-scope data-mode="always">` (`applies.ts`).
 */
import { interpolate } from '../i18n';
import {
  markStep,
  pathProgress,
  stepDone,
  type PathDone,
  type PathResult,
  type PathStepResult,
} from '../lib/path-engine';
import { profileFromQuery, profileQuery, QUERY, type Profile } from '../lib/profile';
import { pathDone, pathView, profile, resetProfile, storageAvailable } from '../lib/profile-store';
import './applies';
import { announce, askToConfirm } from './confirm-dialog';
import { readerPath, viewOf } from './path-data';
import { currentView } from './path-progress';
import { drawRing } from './ring';
import './storage-notice';

function sameProfile(a: Profile | null, b: Profile | null): boolean {
  return a !== null && b !== null && profileQuery(a) === profileQuery(b);
}

export class StMyPath extends HTMLElement {
  #stops: (() => void)[] = [];
  #path: PathResult | undefined;

  /** Changes the address without a reload. Replaced in tests. */
  replaceUrl: (url: string) => void = (url) => {
    window.history.replaceState(window.history.state, '', url);
  };

  readonly #onClick = (event: Event): void => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    if (button.hasAttribute('data-mark')) this.#toggle(button);
    else if (button.hasAttribute('data-reset')) this.#askReset(button);
  };

  connectedCallback(): void {
    this.addEventListener('click', this.#onClick);
    const url = new URL(window.location.href);
    const fromAddress = profileFromQuery(url.searchParams);
    // Answers in the address (sent by the wizard when the device would not save them) are used when
    // there are no saved answers or nothing can be saved. They never replace saved answers: such an
    // address may be someone else's, shared (review WP-31 pass 1, minor 4).
    const saved = profile.get();
    if (fromAddress && !sameProfile(fromAddress, saved) && (!saved || !storageAvailable.get()))
      profile.set(fromAddress);
    if (url.searchParams.has('saved')) {
      url.searchParams.delete('saved');
      this.replaceUrl(url.href);
      announce(this.querySelector('[data-status]'), this.dataset['savedTip'] ?? '', 0);
    }
    this.#stops = [profile.subscribe(() => this.render()), pathDone.subscribe(() => this.render())];
    this.dataset['ready'] = '';
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    for (const stop of this.#stops) stop();
    this.#stops = [];
  }

  render(): void {
    const who = profile.get();
    const empty = this.querySelector<HTMLElement>('[data-empty]');
    const dashboard = this.querySelector<HTMLElement>('[data-dashboard]');
    if (empty) empty.hidden = who !== null;
    if (dashboard) dashboard.hidden = who === null;
    if (!who) {
      this.#path = undefined;
      return;
    }
    this.#path = readerPath(who);
    // Keep the path the top bar and the pager read current (`st.pathView.v1`).
    const version = this.dataset['version'] ?? '';
    if (!currentView(version)) pathView.set(viewOf(who, version));
    const done = pathDone.get();
    this.#renderChips(who);
    this.#renderSteps(this.#path, done);
    const { done: count, total } = pathProgress(this.#path, done);
    const text = interpolate(this.dataset['progressTemplate'] ?? '{done}/{total}', {
      done: count,
      total,
    });
    const progress = this.querySelector<HTMLElement>('[data-progress]');
    if (progress) {
      drawRing(progress, count, total, text);
      const label = progress.querySelector('[data-progress-text]');
      if (label) label.textContent = text;
    }
  }

  #renderChips(who: Profile): void {
    const shown = new Set([
      `${QUERY.entity}:${who.entity}`,
      `${QUERY.stage}:${who.stage}`,
      ...who.businessTypes.map((type) => `${QUERY.type}:${type}`),
    ]);
    const chips = [...this.querySelectorAll<HTMLElement>('[data-chip]')];
    for (const chip of chips) chip.hidden = !shown.has(chip.dataset['chip'] ?? '');
    // Kinds of business in the reader's order: the first is the primary one.
    const list = chips[0]?.parentElement;
    const stageChip = chips.find((chip) => chip.dataset['chip']?.startsWith(`${QUERY.stage}:`));
    for (const type of who.businessTypes) {
      const chip = chips.find((candidate) => candidate.dataset['chip'] === `${QUERY.type}:${type}`);
      if (chip && list) list.insertBefore(chip, stageChip ?? null);
    }
  }

  #renderSteps(path: PathResult, done: PathDone): void {
    const list = this.querySelector<HTMLElement>('[data-steps]');
    if (!list) return;
    const template = list.dataset['labelTemplate'] ?? '{n}';
    const cards = [...list.querySelectorAll<HTMLElement>(':scope > li[data-stage]')];
    for (const card of cards) card.hidden = true;
    for (const step of path.steps) {
      const card = cards.find(
        (candidate) =>
          candidate.dataset['stage'] === path.stage &&
          Number(candidate.dataset['item']) === step.item,
      );
      if (!card) continue;
      card.hidden = false;
      card.dataset['n'] = String(step.n);
      const label = card.querySelector('[data-step-label]');
      if (label) label.textContent = interpolate(template, { n: step.n });
      const docs = card.querySelector('ul');
      const items = [...card.querySelectorAll<HTMLElement>('li[data-doc]')];
      for (const item of items) item.hidden = true;
      for (const entry of step.items) {
        const item = items.find((candidate) => candidate.dataset['doc'] === entry.doc);
        if (!item) continue;
        item.hidden = false;
        docs?.append(item);
      }
      const why = card.querySelector<HTMLElement>('[data-why]');
      if (why) why.hidden = !step.why;
      const titles = [...card.querySelectorAll<HTMLElement>('li[data-doc]:not([hidden]) a')].map(
        (link) => link.textContent?.trim() ?? '',
      );
      this.#renderDone(card, stepDone(step, done), titles.join(', '));
      list.append(card);
    }
  }

  /** Done or not, with the button's label and its name for the pages this step shows. */
  #renderDone(card: HTMLElement, isDone: boolean, title: string): void {
    card.toggleAttribute('data-done', isDone);
    const badge = card.querySelector<HTMLElement>('[data-done-badge]');
    if (badge) badge.hidden = !isDone;
    const button = card.querySelector<HTMLElement>('[data-mark]');
    if (!button) return;
    const label = button.querySelector('.st-btn__label') ?? button;
    label.textContent = (isDone ? button.dataset['labelUndo'] : button.dataset['labelDone']) ?? '';
    const name = isDone ? button.dataset['nameUndo'] : button.dataset['nameDone'];
    if (name) button.setAttribute('aria-label', interpolate(name, { title }));
  }

  #stepOf(card: Element | null): PathStepResult | undefined {
    if (!(card instanceof HTMLElement) || !this.#path) return undefined;
    const n = Number(card.dataset['n']);
    return this.#path.steps.find((step) => step.n === n);
  }

  #toggle(button: Element): void {
    const step = this.#stepOf(button.closest('li[data-stage]'));
    if (!step) return;
    const current = pathDone.get();
    pathDone.set(markStep(current, step, !stepDone(step, current)));
  }

  #askReset(button: HTMLElement): void {
    const dialog = this.querySelector('dialog');
    if (!dialog) return;
    void askToConfirm(dialog, button).then((confirmed) => {
      if (!confirmed) return;
      resetProfile();
      const url = new URL(window.location.href);
      if ([...url.searchParams.keys()].some((key) => Object.values(QUERY).includes(key as never))) {
        url.search = '';
        this.replaceUrl(url.href);
      }
      this.querySelector<HTMLElement>('h1')?.focus();
      announce(this.querySelector('[data-status]'), this.dataset['resetDone'] ?? '');
    });
  }
}

if (!customElements.get('st-my-path')) customElements.define('st-my-path', StMyPath);
