/*
 * <st-prompt-fill>: "Fill from my profile" on an AI prompt (build plan B3 flow 6; WP-31).
 *
 * Shown when the reader has answers on the device and the prompt has a blank the answers can fill:
 * today the kind of business (`[BUSINESS TYPE]`, placeholder key `businessType`), from the primary
 * type, in the page's language (`prompts.profileValues`). "Fill from my profile" writes the value
 * into those blanks, in place, so "Copy prompt" copies the filled text; the status line says how
 * many blanks are left to fill by hand. "Undo" puts the brackets back. Focus moves to whichever of
 * the two buttons replaces the one pressed.
 */
import { primaryType, type Profile } from '../lib/profile';
import { profile } from '../lib/profile-store';
import { announce } from './confirm-dialog';

/** Placeholder keys the profile can fill. */
export const FILLABLE_KEYS: readonly string[] = ['businessType'];

export class StPromptFill extends HTMLElement {
  #marks: HTMLElement[] = [];
  #originals = new Map<HTMLElement, string>();
  #fill: HTMLElement | null = null;
  #undo: HTMLElement | null = null;
  #unsubscribe: (() => void) | undefined;

  readonly #onClick = (event: Event): void => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button) return;
    if (button.hasAttribute('data-fill')) this.fill();
    else if (button.hasAttribute('data-undo')) this.undo();
  };

  connectedCallback(): void {
    const figure = this.closest('figure');
    this.#marks = [...(figure?.querySelectorAll<HTMLElement>('pre mark.st-placeholder') ?? [])];
    this.#fill = this.querySelector('[data-fill]');
    this.#undo = this.querySelector('[data-undo]');
    this.addEventListener('click', this.#onClick);
    this.#unsubscribe = profile.subscribe((who) => this.#render(who));
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.#onClick);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  /** The blanks the profile can fill. */
  #known(): HTMLElement[] {
    return this.#marks.filter((mark) => FILLABLE_KEYS.includes(mark.dataset['key'] ?? ''));
  }

  #value(who: Profile | null): string | undefined {
    const type = who ? primaryType(who) : undefined;
    if (!type) return undefined;
    try {
      const values = JSON.parse(this.dataset['values'] ?? '{}') as Record<string, unknown>;
      const value = values[type];
      return typeof value === 'string' && value !== '' ? value : undefined;
    } catch {
      return undefined;
    }
  }

  #render(who: Profile | null): void {
    const usable = this.#value(who) !== undefined && this.#known().length > 0;
    if (!usable && this.#originals.size > 0) this.undo(false);
    this.hidden = !usable;
  }

  /** How many blanks are still in brackets. */
  remaining(): number {
    return this.#marks.filter((mark) => !this.#originals.has(mark)).length;
  }

  fill(): void {
    const value = this.#value(profile.get());
    if (value === undefined) return;
    for (const mark of this.#known()) {
      if (!this.#originals.has(mark)) this.#originals.set(mark, mark.textContent ?? '');
      mark.textContent = value;
      mark.dataset['filled'] = '';
    }
    this.#swap(true);
    this.#say();
  }

  undo(moveFocus = true): void {
    for (const [mark, text] of this.#originals) {
      mark.textContent = text;
      delete mark.dataset['filled'];
    }
    this.#originals.clear();
    this.#swap(false, moveFocus);
    if (moveFocus) this.#say();
  }

  #swap(filled: boolean, moveFocus = true): void {
    if (this.#fill) this.#fill.hidden = filled;
    if (this.#undo) this.#undo.hidden = !filled;
    if (moveFocus) (filled ? this.#undo : this.#fill)?.focus();
  }

  #say(): void {
    const left = this.remaining();
    const rules = new Intl.PluralRules(this.closest('[lang]')?.getAttribute('lang') ?? 'en');
    const template =
      left === 0
        ? (this.dataset['allFilled'] ?? '')
        : ((rules.select(left) === 'one'
            ? this.dataset['remainingOne']
            : this.dataset['remainingOther']) ?? '');
    announce(this.querySelector('[role="status"]'), template.replace('{count}', String(left)), 0);
  }
}

if (!customElements.get('st-prompt-fill')) customElements.define('st-prompt-fill', StPromptFill);
