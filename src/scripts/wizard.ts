/*
 * <st-wizard>: "Find my path" (build plan B3 flow 1, B5, C2; WP-31).
 *
 * The server renders one GET form with three questions, which works without JavaScript (see
 * `Wizard.astro`). This element turns it into three steps:
 * - one question at a time, with Back and Next, and a stepper with `aria-current="step"`;
 * - focus moves to the step's heading on Next and Back;
 * - the kinds of business become checkboxes (the server renders radios, one choice without
 *   JavaScript), in the order the reader ticks them: the first is the primary type;
 * - "Pty Ltd, growing" is disabled, with its reason shown, unless the answer to step 1 is Pty Ltd;
 * - Next and "See my path" stay `aria-disabled` until the step is answered, and say so;
 * - Enter in an answer goes to the next step (the form's first, disabled submit button stops the
 *   browser submitting it);
 * - "See my path" saves the profile (`st.profile.v1`) and opens My path. If the device will not
 *   keep it, the answers go along in the address instead, so My path can still show them.
 * Answers saved earlier are filled in, so "Edit answers" starts from them.
 */
import {
  parseProfile,
  profileQuery,
  QUERY,
  stageAllowed,
  type EntityChoice,
  type Profile,
  type StageChoice,
  type TypeChoice,
} from '../lib/profile';
import { pathView, profile, storageAvailable } from '../lib/profile-store';
import { viewOf } from './path-data';
import './storage-notice';

export class StWizard extends HTMLElement {
  #form: HTMLFormElement | null = null;
  #steps: HTMLElement[] = [];
  #current = 0;
  /** The kinds of business in the order they were ticked. */
  #order: TypeChoice[] = [];

  /** Leaves the page. Replaced in tests. */
  navigate: (url: string) => void = (url) => {
    window.location.assign(url);
  };

  readonly #onChange = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === QUERY.type) {
      const value = input.value as TypeChoice;
      this.#order = this.#order.filter((type) => type !== value);
      if (input.checked) this.#order.push(value);
    }
    this.#update();
  };

  readonly #onClick = (event: Event): void => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || button.getAttribute('aria-disabled') === 'true') return;
    if (button.hasAttribute('data-next')) this.#advance();
    else if (button.hasAttribute('data-back')) this.go(this.#current - 1);
  };

  readonly #onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    this.#advance();
  };

  /** Enter in an answer: the form's disabled default button blocks submitting, so go on here. */
  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    this.#advance();
  };

  /**
   * Next, or "See my path" on the last step; an unanswered step keeps focus on its answers. If a
   * question before this one has no answer (the reader started further down before the script ran,
   * WP-50a review pass 1, M1), the button takes them to it and its heading gets focus, so a tap is
   * never lost: `finish()` could not save without it.
   */
  #advance(): void {
    const missing = this.#firstInvalid(this.#current);
    if (missing >= 0 && missing < this.#current) {
      this.#show(missing);
      this.#steps[missing]?.querySelector<HTMLElement>('[data-step-heading]')?.focus();
      return;
    }
    if (!this.#stepValid(this.#current)) {
      this.#firstInput(this.#current)?.focus();
      return;
    }
    if (this.#current < this.#steps.length - 1) this.go(this.#current + 1);
    else this.finish();
  }

  connectedCallback(): void {
    this.#form = this.querySelector('form');
    this.#steps = [...this.querySelectorAll<HTMLElement>('[data-step]')];
    if (!this.#form || this.#steps.length === 0) return;
    for (const input of this.#inputs(QUERY.type)) input.type = 'checkbox';
    // With checkboxes the question is "choose all that fit", not the no-JavaScript "choose one".
    for (const group of this.querySelectorAll<HTMLElement>('[data-describedby-js]'))
      group.setAttribute('aria-describedby', group.dataset['describedbyJs'] ?? '');
    this.#restore(profile.get());
    this.#form.addEventListener('change', this.#onChange);
    this.#form.addEventListener('click', this.#onClick);
    this.#form.addEventListener('submit', this.#onSubmit);
    this.#form.addEventListener('keydown', this.#onKeydown);
    // Until now the page was the no-JavaScript form, all three questions (WP-50a). A reader who has
    // scrolled to a later question stays on it, where it is: the steps above it fold away, and the
    // page scrolls by what they took, so nothing on screen moves. If a question above it has no
    // answer, the wizard starts on that one instead, in the same place on screen (review pass 1, M1).
    const view = this.ownerDocument.defaultView;
    let inView = 0;
    if (view && view.scrollY > 0) {
      this.#steps.forEach((step, index) => {
        if (step.getBoundingClientRect().top < view.innerHeight / 2) inView = index;
      });
    }
    const missing = this.#firstInvalid(inView - 1);
    const start = missing >= 0 ? missing : inView;
    const before = this.#steps[inView]?.getBoundingClientRect().top ?? 0;
    this.dataset['ready'] = '';
    this.#show(start);
    const after = this.#steps[start]?.getBoundingClientRect().top ?? 0;
    if (inView > 0 && after !== before) view?.scrollBy(0, after - before);
  }

  disconnectedCallback(): void {
    // Its controls stop working, so the page goes back to the no-JavaScript form (utilities.css).
    delete this.dataset['ready'];
    for (const step of this.#steps) step.hidden = false;
    this.#form?.removeEventListener('change', this.#onChange);
    this.#form?.removeEventListener('click', this.#onClick);
    this.#form?.removeEventListener('submit', this.#onSubmit);
    this.#form?.removeEventListener('keydown', this.#onKeydown);
  }

  /** The step shown now (0-based). */
  get current(): number {
    return this.#current;
  }

  /** Shows step `index` and moves focus to its heading. Refuses to pass an unanswered step. */
  go(index: number): void {
    if (index < 0 || index >= this.#steps.length || index === this.#current) return;
    if (index > this.#current && !this.#stepValid(this.#current)) return;
    this.#show(index);
    this.#steps[index]?.querySelector<HTMLElement>('[data-step-heading]')?.focus();
  }

  /** The answers as a profile, or `null` while one is missing. */
  answers(): Profile | null {
    return parseProfile({
      entity: this.#checked(QUERY.entity)[0],
      businessTypes: this.#order,
      stage: this.#checked(QUERY.stage)[0],
    });
  }

  /** Saves the answers and opens My path. */
  finish(): void {
    const answers = this.answers();
    if (!answers) return;
    profile.set(answers);
    // Store the path too, so the next page's top bar and pager need no rules of their own.
    pathView.set(viewOf(answers, this.dataset['version'] ?? ''));
    const target = new URL(this.dataset['myPath'] ?? '', window.location.href);
    if (storageAvailable.get()) target.search = 'saved=1';
    else target.search = profileQuery(answers);
    this.navigate(target.href);
  }

  #inputs(name: string): HTMLInputElement[] {
    return [...(this.#form?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`) ?? [])];
  }

  #checked(name: string): string[] {
    return this.#inputs(name)
      .filter((input) => input.checked && !input.disabled)
      .map((input) => input.value);
  }

  #firstInput(index: number): HTMLInputElement | null {
    return this.#steps[index]?.querySelector('input:not([disabled])') ?? null;
  }

  #restore(saved: Profile | null): void {
    if (saved) {
      for (const input of this.#inputs(QUERY.entity)) input.checked = input.value === saved.entity;
      for (const input of this.#inputs(QUERY.type))
        input.checked = saved.businessTypes.includes(input.value as TypeChoice);
      for (const input of this.#inputs(QUERY.stage)) input.checked = input.value === saved.stage;
      this.#order = [...saved.businessTypes];
    } else {
      // A form the browser restored (Back) keeps its ticks; take them in page order.
      this.#order = this.#checked(QUERY.type) as TypeChoice[];
    }
  }

  /** The first step up to `last` (inclusive) that has no valid answer, or -1. */
  #firstInvalid(last: number): number {
    for (let index = 0; index <= last; index++) if (!this.#stepValid(index)) return index;
    return -1;
  }

  #stepValid(index: number): boolean {
    const name = this.#steps[index]?.dataset['step'];
    if (name === QUERY.entity) return this.#checked(QUERY.entity).length === 1;
    if (name === QUERY.type) return this.#order.length > 0;
    if (name === QUERY.stage) {
      const stage = this.#checked(QUERY.stage)[0] as StageChoice | undefined;
      const entity = this.#checked(QUERY.entity)[0] as EntityChoice | undefined;
      return stage !== undefined && stageAllowed(stage, entity);
    }
    return true;
  }

  #show(index: number): void {
    this.#current = index;
    this.#steps.forEach((step, position) => {
      step.hidden = position !== index;
    });
    for (const item of this.querySelectorAll<HTMLElement>('[data-stepper]')) {
      if (Number(item.dataset['stepper']) === index) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    }
    this.#update();
  }

  /** Keeps "Pty Ltd, growing", the hints and the buttons in step with the answers. */
  #update(): void {
    const entity = this.#checked(QUERY.entity)[0] as EntityChoice | undefined;
    for (const input of this.#inputs(QUERY.stage)) {
      const allowed = stageAllowed(input.value as StageChoice, entity);
      input.disabled = !allowed;
      if (!allowed) input.checked = false;
    }
    for (const reason of this.querySelectorAll<HTMLElement>('[data-pty-reason]'))
      reason.hidden = stageAllowed('pty-growing', entity);
    this.#steps.forEach((step, index) => {
      const valid = this.#stepValid(index);
      for (const button of step.querySelectorAll<HTMLElement>('[data-next], [data-finish]')) {
        if (valid) button.removeAttribute('aria-disabled');
        else button.setAttribute('aria-disabled', 'true');
      }
      for (const hint of step.querySelectorAll<HTMLElement>('[data-next-hint]'))
        hint.hidden = valid;
      const earlier = valid && this.#firstInvalid(index - 1) >= 0;
      for (const hint of step.querySelectorAll<HTMLElement>('[data-earlier-hint]'))
        hint.hidden = !earlier;
    });
  }
}

if (!customElements.get('st-wizard')) customElements.define('st-wizard', StWizard);
