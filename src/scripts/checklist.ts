/*
 * Checklists (build plan B3 flow 8, B6, C2). Ticks live in the `checks` store (`st.checks.v1`,
 * `{ [key]: ISO date-time }`). The key is each checkbox's `data-task`: the task id, or for a task
 * that repeats one on `/checklist/` the master task's id (`sameAs`, `TaskListBlock.astro`). So a
 * task shows the same tick wherever it appears (its document and `/checklist/`, either language,
 * every open tab); a task that is not linked has its own.
 *
 * <st-checklist>          wraps one server-rendered `<fieldset>` of native checkboxes
 *                         (`data-task`). Ticking writes the store; the store sets the boxes.
 *                         Without JavaScript the boxes still tick; they are just not saved.
 * <st-checklist-progress> "3 of 7 done" for the ids in `data-tasks`, from `data-template`. Fills
 *                         a `<progress>`, a `[data-progress-text]` and a `ProgressRing` inside it.
 * <st-checklist-tools>    on `/checklist/`: the "Show" filter (Everything / Not done yet) and
 *                         "Remove ticks" with its confirm dialog.
 *
 * Filtering hides the items that are ticked **when the filter is chosen**. An item ticked while
 * "Not done yet" is showing stays where it is until the filter is chosen again, so the checkbox
 * that has focus never vanishes from under the keyboard.
 */
import { interpolate } from '../i18n';
import taskKeys from '../data/task-keys.json';
import { checks, countDone, renameChecks, setChecked, type Checks } from '../lib/store';
import { announce, askToConfirm } from './confirm-dialog';
import './storage-notice';

// A tick saved under a key that has since changed (a reworded task, a task linked after it was
// ticked) moves to the key used now, before any list reads the store.
renameChecks(taskKeys.renames);

export type ChecklistFilter = 'all' | 'not-done';
export const FILTER_EVENT = 'st-checklist-filter';

let currentFilter: ChecklistFilter = 'all';

/** Space-separated ids in an attribute, as a list. */
export function taskIds(value: string | undefined): string[] {
  return (value ?? '').split(/\s+/).filter(Boolean);
}

export class StChecklist extends HTMLElement {
  #boxes: HTMLInputElement[] = [];
  #unsubscribe: (() => void) | undefined;

  readonly #onChange = (event: Event): void => {
    const box = event.target;
    if (!(box instanceof HTMLInputElement) || box.type !== 'checkbox') return;
    const id = box.dataset['task'];
    if (id) setChecked(id, box.checked);
  };

  readonly #onFilter = (event: Event): void => {
    const filter = (event as CustomEvent<unknown>).detail;
    if (filter === 'all' || filter === 'not-done') this.applyFilter(filter);
  };

  connectedCallback(): void {
    this.#boxes = [...this.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-task]')];
    this.addEventListener('change', this.#onChange);
    this.ownerDocument.addEventListener(FILTER_EVENT, this.#onFilter);
    this.#unsubscribe = checks.subscribe((map) => this.#render(map));
    this.applyFilter(currentFilter);
  }

  disconnectedCallback(): void {
    this.removeEventListener('change', this.#onChange);
    this.ownerDocument.removeEventListener(FILTER_EVENT, this.#onFilter);
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #render(map: Checks): void {
    for (const box of this.#boxes) {
      const id = box.dataset['task'];
      if (id) box.checked = id in map;
    }
  }

  /** Hides the items ticked now (`not-done`), or shows every item (`all`). */
  applyFilter(filter: ChecklistFilter): void {
    let shown = 0;
    for (const box of this.#boxes) {
      const item = box.closest('label') ?? box;
      const hide = filter === 'not-done' && box.checked;
      item.hidden = hide;
      if (!hide) shown++;
    }
    const fieldset = this.querySelector('fieldset');
    if (fieldset) fieldset.hidden = shown === 0;
  }
}

export class StChecklistProgress extends HTMLElement {
  #unsubscribe: (() => void) | undefined;

  connectedCallback(): void {
    const ids = taskIds(this.dataset['tasks']);
    this.#unsubscribe = checks.subscribe((map) => this.#render(countDone(map, ids), ids.length));
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #render(done: number, total: number): void {
    const text = interpolate(this.dataset['template'] ?? '{done}/{total}', { done, total });
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    this.toggleAttribute('data-complete', total > 0 && done === total);
    const progress = this.querySelector('progress');
    if (progress) {
      progress.max = Math.max(total, 1);
      progress.value = done;
    }
    const label = this.querySelector('[data-progress-text]');
    if (label) label.textContent = text;
    const ring = this.querySelector<HTMLElement>('.st-ring');
    if (ring) {
      if (percent >= 100) ring.dataset['complete'] = 'true';
      else delete ring.dataset['complete'];
      ring.querySelector('svg')?.setAttribute('aria-label', text);
      ring
        .querySelector('.st-ring__value')
        ?.setAttribute('stroke-dashoffset', String(100 - percent));
      const value = ring.querySelector('.st-ring__text');
      if (value) value.textContent = `${percent}%`;
    }
  }
}

export class StChecklistTools extends HTMLElement {
  #reset: HTMLButtonElement | null = null;
  #dialog: HTMLDialogElement | null = null;
  #status: Element | null = null;

  readonly #onFilter = (event: Event): void => {
    const radio = event.target;
    if (!(radio instanceof HTMLInputElement) || radio.type !== 'radio' || !radio.checked) return;
    const filter = radio.value;
    if (filter !== 'all' && filter !== 'not-done') return;
    currentFilter = filter;
    this.ownerDocument.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: filter }));
  };

  readonly #onReset = (): void => {
    if (!this.#dialog) return;
    void askToConfirm(this.#dialog, this.#reset).then((confirmed) => {
      if (!confirmed) return;
      checks.reset();
      announce(this.#status, this.dataset['resetDone'] ?? '');
    });
  };

  connectedCallback(): void {
    this.#reset = this.querySelector('[data-checklist-reset]');
    this.#dialog = this.querySelector('dialog');
    this.#status = this.querySelector('[role="status"]');
    this.addEventListener('change', this.#onFilter);
    this.#reset?.addEventListener('click', this.#onReset);
    // The browser may restore the radios (Back without the back/forward cache, a Firefox
    // reload); the lists connected first and applied "all", so apply what the radios now say.
    const chosen = this.querySelector<HTMLInputElement>('input[type="radio"]:checked');
    if (chosen && (chosen.value === 'all' || chosen.value === 'not-done')) {
      currentFilter = chosen.value;
      this.ownerDocument.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: chosen.value }));
    }
  }

  disconnectedCallback(): void {
    this.removeEventListener('change', this.#onFilter);
    this.#reset?.removeEventListener('click', this.#onReset);
  }
}

if (!customElements.get('st-checklist')) customElements.define('st-checklist', StChecklist);
if (!customElements.get('st-checklist-progress')) {
  customElements.define('st-checklist-progress', StChecklistProgress);
}
if (!customElements.get('st-checklist-tools')) {
  customElements.define('st-checklist-tools', StChecklistTools);
}
