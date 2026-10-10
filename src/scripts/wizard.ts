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
  /** True while the wizard keeps the room of the no-JavaScript form (`#hold`). */
  #held = false;
  /** The wizard has been on screen since it took over (`#hold`). */
  #seen = false;
  #observer: IntersectionObserver | null = null;

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
    // The reader acted: the wizard takes its own height. On question 2 the no-JavaScript line also
    // leaves the slot it shares with "Choose all that fit", whose room it kept (review pass 4, m1).
    // The answer just changed stays under the reader's finger.
    const noJsLine =
      input.name === QUERY.type ? this.querySelector<HTMLElement>('[data-swap="no-js"]') : null;
    this.#release(input, () => {
      if (noJsLine) noJsLine.hidden = true;
    });
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
      this.#release();
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
    // Until now the page was the no-JavaScript form, all three questions (WP-50a). A reader who has
    // scrolled to a later question stays on it, where it is (`#hold`). If a question above it has no
    // answer, the line under its buttons says so, and Next or "See my path" goes there (#advance).
    // Starting on the unanswered question instead swapped the question under the reader's finger, a
    // layout shift of up to 0.78 (WP-50a review pass 2, M1).
    const view = this.ownerDocument.defaultView;
    let start = 0;
    if (view && view.scrollY > 0) {
      this.#steps.forEach((step, index) => {
        if (step.getBoundingClientRect().top < view.innerHeight / 2) start = index;
      });
    }
    const height = this.getBoundingClientRect().height;
    const top = (index: number): number => this.#steps[index]?.getBoundingClientRect().top ?? 0;
    const above = top(start) - top(0);
    // A kind of business that still has focus (ticked, then the reader scrolled on) scrolls itself
    // into view when it becomes a checkbox, and a reader at question 3 was found at question 2
    // (review pass 3, M1): the page goes back to where the reader had it.
    const scrolled = view?.scrollY ?? 0;
    for (const input of this.#inputs(QUERY.type)) input.type = 'checkbox';
    if (view && view.scrollY !== scrolled) view.scrollTo(view.scrollX, scrolled);
    // With checkboxes the question is "choose all that fit", not the no-JavaScript "choose one".
    for (const group of this.querySelectorAll<HTMLElement>('[data-describedby-js]'))
      group.setAttribute('aria-describedby', group.dataset['describedbyJs'] ?? '');
    this.#restore(profile.get());
    this.#form.addEventListener('change', this.#onChange);
    this.#form.addEventListener('click', this.#onClick);
    this.#form.addEventListener('submit', this.#onSubmit);
    this.#form.addEventListener('keydown', this.#onKeydown);
    this.dataset['ready'] = '';
    this.#hold(height, above);
    this.#show(start);
  }

  /**
   * Keeps the room of the no-JavaScript form until the reader acts (WP-50a review pass 4, M1).
   * The steps above the one in view fold away, so the form keeps their height as padding, and the
   * wizard keeps its whole height as `min-block-size`. Nothing on screen moves, below the question
   * either, the document does not get shorter, so the browser has no reason to scroll, and the
   * wizard scrolls nothing itself. Folding only the steps above and scrolling by what they took
   * left the steps below to fold, and the footer jumped into view (0.11 to 0.26).
   */
  #hold(height: number, above: number): void {
    // Set before the steps fold, with no layout in between: a layout that saw them fold would let
    // the browser's scroll anchoring scroll the page instead (review pass 4, M1).
    if (this.#form && above > 0) this.#form.style.paddingBlockStart = `${above}px`;
    this.style.minBlockSize = `${height}px`;
    this.#held = true;
    this.#seen = false;
    if (typeof IntersectionObserver !== 'function') return;
    // Once the reader has scrolled the wizard out of view, it can take its height off screen.
    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.#seen = true;
        else if (this.#seen) this.#release();
      }
    });
    this.#observer.observe(this);
  }

  /**
   * Gives up the room `#hold` kept, runs `also`, and scrolls by what that moved: `anchor` (what the
   * reader touched) or the step shown keeps its place on screen; with the wizard above the screen,
   * what follows it does; with it below, nothing on screen moves anyway.
   */
  #release(anchor?: Element | null, also?: () => void): void {
    if (!this.#held && !also) return;
    const view = this.ownerDocument.defaultView;
    const box = this.getBoundingClientRect();
    const offBelow = view !== null && box.top >= view.innerHeight;
    const edge = (): number | null => {
      if (offBelow) return null;
      if (box.bottom <= 0) return this.getBoundingClientRect().bottom;
      return (anchor ?? this.#steps[this.#current])?.getBoundingClientRect().top ?? null;
    };
    const before = edge();
    if (this.#held) {
      this.#held = false;
      this.style.minBlockSize = '';
      if (this.#form) this.#form.style.paddingBlockStart = '';
      this.#observer?.disconnect();
      this.#observer = null;
    }
    also?.();
    const after = edge();
    if (view && before !== null && after !== null && Math.abs(after - before) > 0.5) {
      view.scrollBy(0, after - before);
    }
  }

  disconnectedCallback(): void {
    // Its controls stop working, so the page goes back to the no-JavaScript form (utilities.css).
    delete this.dataset['ready'];
    this.#held = false;
    this.#observer?.disconnect();
    this.#observer = null;
    this.style.minBlockSize = '';
    if (this.#form) this.#form.style.paddingBlockStart = '';
    for (const step of this.#steps) step.hidden = false;
    for (const line of this.querySelectorAll<HTMLElement>('[data-swap]')) line.hidden = false;
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
    this.#release();
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
      // With an earlier question unanswered the button works: it goes to that question.
      const earlier = this.#firstInvalid(index - 1) >= 0;
      for (const button of step.querySelectorAll<HTMLElement>('[data-next], [data-finish]')) {
        if (valid || earlier) button.removeAttribute('aria-disabled');
        else button.setAttribute('aria-disabled', 'true');
      }
      for (const hint of step.querySelectorAll<HTMLElement>('[data-next-hint]'))
        hint.hidden = valid || earlier;
      for (const hint of step.querySelectorAll<HTMLElement>('[data-earlier-hint]'))
        hint.hidden = !earlier;
      // The button is described by the line under it that shows, and by nothing when none does: a
      // hidden line it pointed at was still read out ("Choose an answer first." on an answered
      // question; WP-50a review pass 3, m2).
      const shown = [...step.querySelectorAll<HTMLElement>('[data-next-hint], [data-earlier-hint]')]
        .filter((hint) => !hint.hidden && hint.id)
        .map((hint) => hint.id)
        .join(' ');
      for (const button of step.querySelectorAll<HTMLElement>('[data-next], [data-finish]')) {
        if (shown) button.setAttribute('aria-describedby', shown);
        else button.removeAttribute('aria-describedby');
      }
    });
  }
}

if (!customElements.get('st-wizard')) customElements.define('st-wizard', StWizard);
