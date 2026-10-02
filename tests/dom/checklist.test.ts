import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checks, clearAll, setChecked } from '../../src/lib/store';
import {
  FILTER_EVENT,
  StChecklist,
  StChecklistProgress,
  taskIds,
} from '../../src/scripts/checklist';

const TEMPLATE = '{done} of {total} done';

function group(ids: string[]): string {
  return `
    <st-checklist>
      <fieldset class="st-tasklist">
        <legend>Before you trade</legend>
        ${ids
          .map(
            (id) =>
              `<label class="st-check"><input type="checkbox" id="${id}" data-task="${id}" /><span>${id}</span></label>`,
          )
          .join('')}
      </fieldset>
      <st-checklist-progress data-tasks="${ids.join(' ')}" data-template="${TEMPLATE}">
        <progress max="${ids.length}" value="0" aria-hidden="true"></progress>
        <span data-progress-text>0 of ${ids.length} done</span>
      </st-checklist-progress>
    </st-checklist>`;
}

/**
 * Parses the markup off the page, then connects it, as a browser does when the module runs after
 * the document is parsed. (happy-dom connects elements set through `innerHTML` before their
 * children are parsed, which a real page never does.)
 */
function mount(html: string, parent: HTMLElement = document.body): void {
  const template = document.createElement('template');
  template.innerHTML = html;
  parent.append(template.content);
}

const box = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement;
const text = (selector = '[data-progress-text]'): string =>
  document.querySelector(selector)?.textContent ?? '';

beforeEach(() => {
  clearAll();
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('<st-checklist>', () => {
  it('is defined once and does nothing in its constructor', () => {
    expect(customElements.get('st-checklist')).toBe(StChecklist);
    const element = document.createElement('st-checklist');
    expect(element.childElementCount).toBe(0);
  });

  it('shows saved ticks when it connects', () => {
    setChecked('t:2', true);
    mount(group(['t:1', 't:2']));
    expect(box('t:1').checked).toBe(false);
    expect(box('t:2').checked).toBe(true);
    expect(text()).toBe('1 of 2 done');
    expect(document.querySelector('progress')?.value).toBe(1);
  });

  it('saves a tick made with the keyboard or the pointer, and takes it back', () => {
    mount(group(['t:1', 't:2']));
    box('t:1').focus();
    box('t:1').click();
    expect(checks.get()).toHaveProperty('t:1');
    expect(JSON.parse(localStorage.getItem('st.checks.v1') ?? '{}')).toHaveProperty('t:1');
    expect(text()).toBe('1 of 2 done');
    box('t:1').click();
    expect(checks.get()).not.toHaveProperty('t:1');
    expect(text()).toBe('0 of 2 done');
  });

  it('keeps two copies of the same task in step (another page, another tab)', () => {
    mount(`<div id="a">${group(['t:1'])}</div><div id="b">${group(['t:1'])}</div>`);
    const [first, second] = [...document.querySelectorAll<HTMLInputElement>('[data-task="t:1"]')];
    first?.click();
    expect(second?.checked).toBe(true);
    // A tick written by another tab arrives through the store.
    localStorage.setItem('st.checks.v1', JSON.stringify({}));
    window.dispatchEvent(new StorageEvent('storage', { key: 'st.checks.v1' }));
    expect(first?.checked).toBe(false);
    expect(second?.checked).toBe(false);
  });

  it('stops listening when it disconnects', () => {
    mount(group(['t:1']));
    const element = document.querySelector('st-checklist');
    const input = box('t:1');
    element?.remove();
    document.body.append(input);
    input.click();
    expect(checks.get()).toEqual({});
    setChecked('t:1', true);
    // The detached copy no longer follows the store.
    expect(element?.querySelector('input')).toBeNull();
  });

  it('ignores changes that are not task checkboxes', () => {
    mount(group(['t:1']));
    const other = document.createElement('input');
    other.type = 'text';
    document.querySelector('fieldset')?.append(other);
    other.dispatchEvent(new Event('change', { bubbles: true }));
    expect(checks.get()).toEqual({});
  });

  it('hides ticked items for "Not done yet", but never the one just ticked', () => {
    setChecked('t:1', true);
    mount(group(['t:1', 't:2']));
    document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: 'not-done' }));
    expect(box('t:1').closest('label')?.hidden).toBe(true);
    expect(box('t:2').closest('label')?.hidden).toBe(false);
    box('t:2').click();
    expect(box('t:2').closest('label')?.hidden).toBe(false);
    document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: 'not-done' }));
    expect(document.querySelector('fieldset')?.hidden).toBe(true);
    document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: 'all' }));
    expect(box('t:1').closest('label')?.hidden).toBe(false);
    expect(document.querySelector('fieldset')?.hidden).toBe(false);
    document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: 'nonsense' }));
    expect(document.querySelector('fieldset')?.hidden).toBe(false);
  });
});

describe('<st-checklist-progress>', () => {
  it('counts only its own tasks and marks itself complete', () => {
    mount(`
      <st-checklist-progress data-tasks="a b" data-template="${TEMPLATE}">
        <span data-progress-text></span>
      </st-checklist-progress>`);
    const element = document.querySelector('st-checklist-progress');
    expect(element).toBeInstanceOf(StChecklistProgress);
    setChecked('zzz', true);
    expect(text()).toBe('0 of 2 done');
    setChecked('a', true);
    setChecked('b', true);
    expect(text()).toBe('2 of 2 done');
    expect(element?.hasAttribute('data-complete')).toBe(true);
    element?.remove();
    setChecked('a', false);
    expect(element?.textContent?.trim()).toBe('2 of 2 done');
  });

  it('draws a progress ring and names it', () => {
    mount(`
      <st-checklist-progress data-tasks="a b c d" data-template="${TEMPLATE}">
        <span class="st-ring"><svg role="img" aria-label=""><circle class="st-ring__value"></circle></svg><span class="st-ring__text">0%</span></span>
      </st-checklist-progress>`);
    setChecked('a', true);
    const ring = document.querySelector<HTMLElement>('.st-ring');
    expect(ring?.querySelector('svg')?.getAttribute('aria-label')).toBe('1 of 4 done');
    expect(ring?.querySelector('.st-ring__value')?.getAttribute('stroke-dashoffset')).toBe('75');
    expect(ring?.querySelector('.st-ring__text')?.textContent).toBe('25%');
    expect(ring?.dataset['complete']).toBeUndefined();
    for (const id of ['b', 'c', 'd']) setChecked(id, true);
    expect(ring?.dataset['complete']).toBe('true');
  });

  it('copes with no tasks and no template', () => {
    mount(`<st-checklist-progress><span data-progress-text></span></st-checklist-progress>`);
    expect(text()).toBe('0/0');
  });
});

describe('<st-checklist-tools>', () => {
  function tools(): string {
    return `
      ${group(['t:1', 't:2'])}
      <st-checklist-tools data-reset-done="All ticks were removed.">
        <fieldset>
          <legend>Show</legend>
          <label><input type="radio" name="f" value="all" checked />Everything</label>
          <label><input type="radio" name="f" value="not-done" />Not done yet</label>
        </fieldset>
        <button type="button" data-checklist-reset>Remove ticks</button>
        <p role="status"></p>
        <dialog>
          <form method="dialog">
            <button value="cancel" id="cancel">Keep my ticks</button>
            <button value="confirm" id="confirm">Remove ticks</button>
          </form>
        </dialog>
      </st-checklist-tools>`;
  }

  it('filters every checklist on the page from the radios', () => {
    setChecked('t:1', true);
    mount(tools());
    const notDone = document.querySelector<HTMLInputElement>('input[value="not-done"]');
    notDone?.click();
    expect(box('t:1').closest('label')?.hidden).toBe(true);
    document.querySelector<HTMLInputElement>('input[value="all"]')?.click();
    expect(box('t:1').closest('label')?.hidden).toBe(false);
  });

  it('a checklist connected later starts with the filter in force', () => {
    setChecked('t:3', true);
    mount(tools());
    document.querySelector<HTMLInputElement>('input[value="not-done"]')?.click();
    const later = document.createElement('div');
    mount(group(['t:3']), later);
    document.body.append(later);
    expect(box('t:3').closest('label')?.hidden).toBe(true);
    document.querySelector<HTMLInputElement>('input[value="all"]')?.click();
  });

  it('removes every tick only after the dialog is confirmed, and says so', async () => {
    setChecked('t:1', true);
    mount(tools());
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    const reset = document.querySelector<HTMLButtonElement>('[data-checklist-reset]');

    reset?.click();
    expect(dialog.open).toBe(true);
    dialog.close('cancel');
    await Promise.resolve();
    expect(checks.get()).toHaveProperty('t:1');
    expect(document.activeElement).toBe(reset);

    reset?.click();
    dialog.close('confirm');
    await Promise.resolve();
    expect(checks.get()).toEqual({});
    expect(box('t:1').checked).toBe(false);
    expect(document.querySelector('[role="status"]')?.textContent).toBe('All ticks were removed.');
  });

  it('treats Escape (no return value) as cancel', async () => {
    setChecked('t:1', true);
    mount(tools());
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    document.querySelector<HTMLButtonElement>('[data-checklist-reset]')?.click();
    dialog.close();
    await Promise.resolve();
    expect(checks.get()).toHaveProperty('t:1');
  });

  it('stops listening when it disconnects', () => {
    mount(tools());
    const element = document.querySelector('st-checklist-tools');
    const reset = element?.querySelector<HTMLButtonElement>('[data-checklist-reset]');
    element?.remove();
    reset?.click();
    expect(element?.querySelector('dialog')?.open).toBe(false);
  });
});

describe('taskIds', () => {
  it('splits on any whitespace and drops empties', () => {
    expect(taskIds(' a  b\nc ')).toEqual(['a', 'b', 'c']);
    expect(taskIds(undefined)).toEqual([]);
  });
});
