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
import { checks, countDone, setChecked, type Checks } from '../lib/store';
import { announce, askToConfirm } from './confirm-dialog';
import './storage-notice';

/** `mine` (WP-31, `applies.ts`) hides by profile; for the ticks it is the same as `all`. */
export type ChecklistFilter = 'all' | 'mine' | 'not-done';

function isFilter(value: unknown): value is ChecklistFilter {
  return value === 'all' || value === 'mine' || value === 'not-done';
}
import { FILTER_EVENT } from './checklist-filter';

export { FILTER_EVENT };

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
    if (isFilter(filter)) this.applyFilter(filter);
  };

  connectedCallback(): void {
    this.#boxes = [...this.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-task]')];
    this.addEventListener('change', this.#onChange);
    this.ownerDocument.addEventListener(FILTER_EVENT, this.#onFilter);
    // A box the reader changed before this module ran (it is clickable from first paint, and
    // module scripts are deferred) differs from its server-rendered default: that is the reader's
    // choice, so save it rather than overwrite it from the store (review WP-30 pass 3). A box the
    // browser restored on Back already holds what the store holds, so saving it changes nothing.
    for (const box of this.#boxes) {
      const id = box.dataset['task'];
      if (id && box.checked !== box.defaultChecked) setChecked(id, box.checked);
    }
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
    this.toggleAttribute('data-complete', total > 0 && done === total);
    const progress = this.querySelector('progress');
    if (progress) {
      progress.max = Math.max(total, 1);
      progress.value = done;
    }
    const label = this.querySelector('[data-progress-text]');
    if (label) label.textContent = text;
    // `drawRing()` in ring.ts, inlined: importing it split a shared chunk, 0.2 KB on every document.
    const ring = this.querySelector<HTMLElement>('.st-ring');
    if (ring) {
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      if (percent >= 100) ring.dataset['complete'] = 'true';
      else delete ring.dataset['complete'];
      ring.querySelector('svg')?.setAttribute('aria-label', text);
      const arc = ring.querySelector('.st-ring__value');
      arc?.setAttribute('stroke-dashoffset', String(100 - percent));
      // Only a later tick moves the arc, not the value the page opens with (ProgressRing.astro).
      if (arc && !ring.hasAttribute('data-animate')) {
        void getComputedStyle(arc).strokeDashoffset;
        ring.setAttribute('data-animate', '');
      }
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
    if (!isFilter(filter)) return;
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
    if (chosen && isFilter(chosen.value)) {
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
