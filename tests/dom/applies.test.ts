import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onlyMine, profile } from '../../src/lib/profile-store';
import { clearAll } from '../../src/lib/store';
import {
  clearFilter,
  filterByProfile,
  FILTERED,
  sectionOf,
  StAppliesScope,
  StAppliesSwitch,
} from '../../src/scripts/applies';
import { FILTER_EVENT } from '../../src/scripts/checklist';
import { mount } from './helpers';

/** The block structure `Blocks.astro` renders: siblings, headings with their depth. */
const BLOCKS = `
  <h2 id="intro" data-depth="2">Intro</h2>
  <p>Everyone</p>
  <div class="st-hidden-marker" data-marker-for="sole" hidden>
    <p>Hidden: this part is only for a sole proprietor.</p>
    <button type="button" data-show-hidden="sole">Show</button>
  </div>
  <h2 id="sole" data-depth="2" data-applies data-entity="sole-prop" tabindex="-1">Sole</h2>
  <p id="sole-text">For a sole proprietor</p>
  <h3 id="sole-sub" data-depth="3">More</h3>
  <p>Still sole</p>
  <div class="st-hidden-marker" data-marker-for="pty" hidden>
    <p>Hidden: this part is only for a Pty Ltd.</p>
    <button type="button" data-show-hidden="pty">Show</button>
  </div>
  <h2 id="pty" data-depth="2" data-applies data-entity="pty" tabindex="-1">Company</h2>
  <p id="pty-text">For a company</p>
  <div class="st-hidden-marker" data-marker-for="food" hidden>
    <button type="button" data-show-hidden="food">Show</button>
  </div>
  <h4 id="food" data-depth="4" data-applies data-types="food" tabindex="-1">Food</h4>
  <p id="food-text">Food only</p>
  <h2 id="end" data-depth="2">End</h2>
  <st-checklist>
    <fieldset>
      <label class="st-check" id="t1"><input type="checkbox" data-task="a" /> All</label>
      <label class="st-check" id="t2" data-applies data-entity="pty"><input type="checkbox" data-task="b" /> Company</label>
      <label class="st-check" id="t3" data-applies data-types="beauty"><input type="checkbox" data-task="c" /> Beauty</label>
    </fieldset>
    <p class="st-tasklist__hidden" hidden></p>
  </st-checklist>
  <st-checklist id="all-pty">
    <fieldset>
      <label class="st-check" data-applies data-entity="pty"><input type="checkbox" data-task="d" /> Company</label>
    </fieldset>
  </st-checklist>
  <table><tbody>
    <tr id="row-all"><td>All</td></tr>
    <tr id="row-pty" data-applies data-entity="pty"><td>Company</td></tr>
  </tbody></table>`;

const el = (id: string): HTMLElement => document.getElementById(id)!;
const filtered = (id: string): boolean => el(id).classList.contains(FILTERED);
const marker = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-marker-for="${id}"]`)!;
const hiddenItems = (count: number): string =>
  `${count} ${count === 1 ? 'item is' : 'items are'} hidden`;

beforeEach(() => {
  clearAll();
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('sectionOf', () => {
  it('runs to the next heading of the same or a higher level, without its marker', () => {
    mount(BLOCKS);
    expect(sectionOf(el('sole')).map((e) => e.id || e.tagName)).toEqual([
      'sole',
      'sole-text',
      'sole-sub',
      'P',
    ]);
    expect(sectionOf(el('food')).map((e) => e.id)).toEqual(['food', 'food-text']);
  });
});

describe('filterByProfile', () => {
  const sole = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' } as const;

  it('collapses what does not apply into its marker and removes nothing', () => {
    mount(BLOCKS);
    const before = document.body.querySelectorAll('*').length;
    filterByProfile(document.body, sole, { markers: true, hiddenItems });
    expect(document.body.querySelectorAll('*').length).toBe(before);
    expect(filtered('sole')).toBe(false);
    expect(filtered('pty')).toBe(true);
    expect(filtered('pty-text')).toBe(true);
    expect(marker('pty').hidden).toBe(false);
    expect(marker('sole').hidden).toBe(true);
    // Food sits inside the company section: hidden with it, no marker of its own.
    expect(marker('food').hidden).toBe(true);
    expect(filtered('end')).toBe(false);
    expect(filtered('t1')).toBe(false);
    expect(filtered('t2')).toBe(true);
    expect(filtered('t3')).toBe(true);
    expect(document.querySelector('.st-tasklist__hidden')?.textContent).toBe('2 items are hidden');
    expect(filtered('all-pty')).toBe(true);
    expect(filtered('row-pty')).toBe(true);
    expect(filtered('row-all')).toBe(false);
  });

  it('shows both entities to an undecided reader and filters only by type', () => {
    mount(BLOCKS);
    filterByProfile(
      document.body,
      { entity: 'undecided', businessTypes: ['beauty'], stage: 'not-started' },
      { markers: false },
    );
    expect(filtered('sole')).toBe(false);
    expect(filtered('pty')).toBe(false);
    expect(filtered('food')).toBe(true);
    expect(marker('food').hidden).toBe(true);
    expect(filtered('t3')).toBe(false);
    expect(document.querySelector('.st-tasklist__hidden')?.hasAttribute('hidden')).toBe(true);
  });

  it('clearFilter shows everything again', () => {
    mount(BLOCKS);
    filterByProfile(document.body, sole, { markers: true, hiddenItems });
    clearFilter(document.body);
    expect(document.querySelectorAll(`.${FILTERED}`)).toHaveLength(0);
    expect(
      [...document.querySelectorAll<HTMLElement>('.st-hidden-marker')].every((m) => m.hidden),
    ).toBe(true);
  });
});

describe('<st-applies-scope>', () => {
  const pty = { entity: 'pty', businessTypes: ['general'], stage: 'pty-growing' } as const;

  it('in switch mode follows the profile and the switch', () => {
    mount(`<st-applies-scope data-mode="switch">${BLOCKS}</st-applies-scope>`);
    expect(customElements.get('st-applies-scope')).toBe(StAppliesScope);
    expect(document.querySelectorAll(`.${FILTERED}`)).toHaveLength(0);
    profile.set(pty);
    expect(filtered('sole')).toBe(false);
    onlyMine.set(true);
    expect(filtered('sole')).toBe(true);
    expect(filtered('pty')).toBe(false);
    expect(filtered('food')).toBe(true);
    onlyMine.set(false);
    expect(filtered('sole')).toBe(false);
    onlyMine.set(true);
    profile.reset();
    expect(filtered('sole')).toBe(false);
  });

  it('“Show” brings back one section and moves focus to its heading', () => {
    profile.set(pty);
    onlyMine.set(true);
    mount(`<st-applies-scope data-mode="switch">${BLOCKS}</st-applies-scope>`);
    expect(filtered('sole')).toBe(true);
    marker('sole').querySelector('button')!.click();
    expect(filtered('sole')).toBe(false);
    expect(filtered('sole-text')).toBe(false);
    expect(marker('sole').hidden).toBe(true);
    expect(document.activeElement).toBe(el('sole'));
    expect(filtered('food')).toBe(true);
  });

  it('in checklist mode follows “Only what applies to me” and shows that choice only with a profile', () => {
    mount(`
      <label data-needs-profile hidden><input type="radio" name="st-checklist-filter" value="mine" /></label>
      <label><input type="radio" name="st-checklist-filter" value="all" checked /></label>
      <st-applies-scope data-mode="checklist">${BLOCKS}</st-applies-scope>`);
    const choice = document.querySelector<HTMLElement>('[data-needs-profile]')!;
    expect(choice.hidden).toBe(true);
    profile.set(pty);
    expect(choice.hidden).toBe(false);
    expect(filtered('sole')).toBe(false);
    document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: 'mine' }));
    expect(filtered('sole')).toBe(true);
    document.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: 'not-done' }));
    expect(filtered('sole')).toBe(false);
  });

  it('in checklist mode applies a choice the browser restored', () => {
    profile.set(pty);
    mount(`
      <input type="radio" name="st-checklist-filter" value="mine" checked />
      <st-applies-scope data-mode="checklist">${BLOCKS}</st-applies-scope>`);
    expect(filtered('sole')).toBe(true);
  });

  it('in checklist mode chooses “Everything” when the answers go (review WP-31 pass 1, minor 6)', () => {
    profile.set(pty);
    mount(`
      <label data-needs-profile><input type="radio" name="st-checklist-filter" value="mine" checked /></label>
      <label><input type="radio" name="st-checklist-filter" value="all" /></label>
      <st-applies-scope data-mode="checklist">${BLOCKS}</st-applies-scope>`);
    const all = document.querySelector<HTMLInputElement>('input[value="all"]')!;
    const changed = vi.fn();
    all.addEventListener('change', changed);
    expect(filtered('sole')).toBe(true);
    profile.reset();
    expect(document.querySelector<HTMLElement>('[data-needs-profile]')!.hidden).toBe(true);
    expect(all.checked).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(filtered('sole')).toBe(false);
  });

  it('brings back a hidden section a link points to, on load and on hashchange (minor 1)', () => {
    profile.set(pty);
    onlyMine.set(true);
    window.history.replaceState(null, '', '#sole-text');
    mount(`<st-applies-scope data-mode="switch">${BLOCKS}</st-applies-scope>`);
    expect(filtered('sole')).toBe(false);
    expect(filtered('sole-text')).toBe(false);
    expect(marker('sole').hidden).toBe(true);
    expect(filtered('food')).toBe(true);
    window.history.replaceState(null, '', '#food');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(filtered('food')).toBe(false);
    expect(filtered('food-text')).toBe(false);
    expect(document.activeElement).toBe(el('food'));
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('in always mode filters without markers, and stops after disconnecting', () => {
    profile.set(pty);
    mount(`<st-applies-scope data-mode="always">${BLOCKS}</st-applies-scope>`);
    expect(filtered('sole')).toBe(true);
    expect(marker('sole').hidden).toBe(true);
    const scope = document.querySelector('st-applies-scope')!;
    scope.remove();
    profile.set({ ...pty, entity: 'pty', businessTypes: ['food'] });
    expect(scope.querySelector('#food')?.classList.contains(FILTERED)).toBe(true);
  });
});

describe('<st-applies-switch>', () => {
  const SWITCH = `
    <st-applies-switch>
      <div data-switch hidden><label><input type="checkbox" role="switch" /> Only what applies to me</label></div>
      <p data-no-profile hidden>Answer the questions</p>
    </st-applies-switch>`;

  it('shows the switch only with a profile, and the hint without one', () => {
    mount(SWITCH);
    expect(customElements.get('st-applies-switch')).toBe(StAppliesSwitch);
    const control = document.querySelector<HTMLElement>('[data-switch]')!;
    const hint = document.querySelector<HTMLElement>('[data-no-profile]')!;
    expect(control.hidden).toBe(true);
    expect(hint.hidden).toBe(false);
    profile.set({ entity: 'pty', businessTypes: ['food'], stage: 'trading' });
    expect(control.hidden).toBe(false);
    expect(hint.hidden).toBe(true);
  });

  it('saves the switch with Space, and follows the store', () => {
    mount(SWITCH);
    const box = document.querySelector<HTMLInputElement>('input')!;
    box.click();
    expect(onlyMine.get()).toBe(true);
    expect(localStorage.getItem('st.onlyMine')).toBe('true');
    onlyMine.set(false);
    expect(box.checked).toBe(false);
  });

  it('keeps a switch flipped before it connected', () => {
    const template = document.createElement('template');
    template.innerHTML = SWITCH;
    template.content.querySelector<HTMLInputElement>('input')!.checked = true;
    document.body.append(template.content);
    expect(onlyMine.get()).toBe(true);
  });

  it('does nothing once disconnected', () => {
    mount(SWITCH);
    const element = document.querySelector('st-applies-switch')!;
    element.remove();
    element.querySelector<HTMLInputElement>('input')!.click();
    expect(onlyMine.get()).toBe(false);
  });
});
