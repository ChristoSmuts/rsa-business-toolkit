import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pathDone, pathView, profile } from '../../src/lib/profile-store';
import { clearAll, storage } from '../../src/lib/store';
import { StMyPath } from '../../src/scripts/my-path';
import { PATHS } from '../../src/scripts/path-data';
import { mount } from './helpers';

const RING = `<span class="st-ring"><svg role="img" aria-label=""><circle class="st-ring__value" stroke-dashoffset="100"></circle></svg><span class="st-ring__text">0%</span></span>`;

/** Every step card of every rule, as `PathSteps.astro` renders them for My path. */
function cards(): string {
  return PATHS.rules
    .flatMap((rule) =>
      rule.steps.map((step) => {
        const docs = step.docs.flatMap((ref) =>
          ref === '$businessTypes' ? PATHS.businessTypes.map((t) => t.doc) : [ref.split('#')[0]],
        );
        return `<li data-stage="${rule.stage}" data-item="${step.item}" hidden>
          <p><span data-step-label>Step ?</span><span data-done-badge hidden>Done</span></p>
          <ul>${docs.map((doc) => `<li data-doc="${doc}" hidden><h3><a href="#">${doc}</a></h3></li>`).join('')}</ul>
          <p data-why>Why this step: …</p>
          <button type="button" data-mark data-label-done="Mark as done" data-label-undo="Remove the tick"
            data-name-done="Mark as done: {title}" data-name-undo="Remove the tick: {title}"><span class="st-btn__label">Mark as done</span></button>
        </li>`;
      }),
    )
    .join('');
}

const PAGE = `
  <st-my-path data-version="${PATHS.hash}" data-saved-tip="Saved on this device only." data-reset-done="Your answers were removed." data-progress-template="{done} of {total} done">
    <h1 tabindex="-1">My path</h1>
    <p role="status" data-status></p>
    <div data-empty>Find my path</div>
    <div data-dashboard hidden>
      <ul>
        <li data-chip="entity:sole-prop" hidden>Sole</li><li data-chip="entity:pty" hidden>Pty</li>
        <li data-chip="type:food" hidden>Food</li><li data-chip="type:beauty" hidden>Beauty</li>
        <li data-chip="type:general" hidden>General</li>
        <li data-chip="stage:trading" hidden>Trading</li><li data-chip="stage:pty-growing" hidden>Growing</li>
      </ul>
      <p data-progress>${RING}<span data-progress-text></span></p>
      <ol data-steps data-label-template="Step {n}">${cards()}</ol>
      <button type="button" data-reset>Remove my answers</button>
      <dialog><form method="dialog"><button value="cancel">Cancel</button><button value="confirm">Remove</button></form></dialog>
    </div>
  </st-my-path>`;

function setUp(): StMyPath {
  mount(PAGE);
  const element = document.querySelector('st-my-path');
  if (!(element instanceof StMyPath)) throw new Error('st-my-path did not upgrade');
  return element;
}

const shown = (): HTMLElement[] =>
  [...document.querySelectorAll<HTMLElement>('[data-steps] > li')].filter((card) => !card.hidden);

beforeEach(() => {
  clearAll();
  localStorage.clear();
  window.history.replaceState(null, '', '/business-toolkit/my-path/');
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('<st-my-path>', () => {
  it('shows the empty state without answers', () => {
    setUp();
    expect(document.querySelector<HTMLElement>('[data-empty]')!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('[data-dashboard]')!.hidden).toBe(true);
  });

  it('shows the answers, and the steps numbered and in order', () => {
    profile.set({ entity: 'pty', businessTypes: ['beauty', 'food'], stage: 'pty-growing' });
    setUp();
    expect(document.querySelector<HTMLElement>('[data-empty]')!.hidden).toBe(true);
    const chips = [...document.querySelectorAll<HTMLElement>('[data-chip]')]
      .filter((chip) => !chip.hidden)
      .map((chip) => chip.dataset['chip']);
    expect(chips).toEqual(['entity:pty', 'type:beauty', 'type:food', 'stage:pty-growing']);
    const steps = shown();
    expect(steps).toHaveLength(9);
    expect(steps.map((card) => card.querySelector('[data-step-label]')?.textContent)).toEqual(
      Array.from({ length: 9 }, (_, index) => `Step ${index + 1}`),
    );
    const types = [...steps[3]!.querySelectorAll<HTMLElement>('li[data-doc]')]
      .filter((item) => !item.hidden)
      .map((item) => item.dataset['doc']);
    expect(types).toEqual(['business-types/beauty', 'business-types/food']);
    // Path 4's "why" is a dealer's: hidden for a beauty business.
    expect(steps[3]!.querySelector<HTMLElement>('[data-why]')!.hidden).toBe(true);
    expect(steps[1]!.querySelector<HTMLElement>('[data-why]')!.hidden).toBe(false);
    expect(document.querySelector('[data-progress-text]')?.textContent).toBe('0 of 9 done');
  });

  it('names a step’s button after the pages it shows, starting with its label', () => {
    profile.set({ entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' });
    setUp();
    // Step 3 is rendered with all six type pages; the reader has one (review WP-31 pass 1, major 4).
    const mark = shown()[2]!.querySelector<HTMLButtonElement>('[data-mark]')!;
    expect(mark.getAttribute('aria-label')).toBe('Mark as done: business-types/food');
    expect(mark.getAttribute('aria-label')).toContain(mark.textContent ?? '?');
  });

  it('stores the path the top bar and the pager read', () => {
    profile.set({ entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' });
    setUp();
    expect(pathView.get()?.version).toBe(PATHS.hash);
    expect(pathView.get()?.steps).toEqual([
      ['lookup/checklist'],
      ['core/tax-and-sars'],
      ['business-types/food'],
      ['core/register#popia-register-your-information-officer'],
    ]);
  });

  it('marks a step as done and back, and the ring follows', () => {
    profile.set({ entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' });
    setUp();
    const first = shown()[0]!;
    const mark = first.querySelector<HTMLButtonElement>('[data-mark]')!;
    mark.click();
    expect(pathDone.get()).toHaveProperty(['lookup/checklist']);
    expect(first.hasAttribute('data-done')).toBe(true);
    expect(first.querySelector<HTMLElement>('[data-done-badge]')!.hidden).toBe(false);
    expect(mark.textContent).toBe('Remove the tick');
    expect(mark.getAttribute('aria-label')).toBe('Remove the tick: lookup/checklist');
    expect(document.querySelector('[data-progress-text]')?.textContent).toBe('1 of 4 done');
    expect(document.querySelector('.st-ring svg')?.getAttribute('aria-label')).toBe('1 of 4 done');
    mark.click();
    expect(pathDone.get()).toEqual({});
    expect(mark.textContent).toBe('Mark as done');
  });

  it('says once that the answers were saved, and drops ?saved from the address', () => {
    window.history.replaceState(null, '', '/business-toolkit/my-path/?saved=1');
    profile.set({ entity: 'pty', businessTypes: ['food'], stage: 'trading' });
    setUp();
    expect(document.querySelector('[data-status]')?.textContent).toBe('Saved on this device only.');
    expect(window.location.search).toBe('');
  });

  it('uses answers sent in the address', () => {
    vi.spyOn(storage.available, 'get').mockReturnValue(false);
    window.history.replaceState(
      null,
      '',
      '/business-toolkit/my-path/?entity=sole-prop&type=food&stage=not-started',
    );
    setUp();
    expect(profile.get()).toEqual({
      entity: 'sole-prop',
      businessTypes: ['food'],
      stage: 'not-started',
    });
    expect(shown()).toHaveLength(9);
  });

  it('never replaces saved answers with answers from the address', () => {
    const saved = { entity: 'pty', businessTypes: ['beauty'], stage: 'trading' } as const;
    profile.set(saved);
    window.history.replaceState(
      null,
      '',
      '/business-toolkit/my-path/?entity=sole-prop&type=food&stage=not-started',
    );
    setUp();
    expect(profile.get()).toEqual(saved);
  });

  it('removes the answers after confirming, keeps the ticks and focuses the heading', async () => {
    window.history.replaceState(
      null,
      '',
      '/business-toolkit/my-path/?entity=sole-prop&type=food&stage=trading',
    );
    setUp();
    localStorage.setItem(
      'st.checks.v1',
      JSON.stringify({ 'core/register:1a2b3c4d': '2026-10-01T10:00:00.000Z' }),
    );
    const dialog = document.querySelector('dialog')!;
    document.querySelector<HTMLButtonElement>('[data-reset]')!.click();
    expect(dialog.open).toBe(true);
    dialog.returnValue = 'confirm';
    dialog.dispatchEvent(new Event('close'));
    await Promise.resolve();
    await Promise.resolve();
    expect(profile.get()).toBeNull();
    expect(localStorage.getItem('st.profile.v1')).toBeNull();
    expect(localStorage.getItem('st.checks.v1')).not.toBeNull();
    expect(window.location.search).toBe('');
    expect(document.activeElement).toBe(document.querySelector('h1'));
    expect(document.querySelector('[data-status]')?.textContent).toBe('Your answers were removed.');
    expect(document.querySelector<HTMLElement>('[data-empty]')!.hidden).toBe(false);
  });

  it('keeps the answers when the dialog is cancelled', async () => {
    profile.set({ entity: 'pty', businessTypes: ['food'], stage: 'trading' });
    setUp();
    const dialog = document.querySelector('dialog')!;
    document.querySelector<HTMLButtonElement>('[data-reset]')!.click();
    dialog.returnValue = '';
    dialog.dispatchEvent(new Event('close'));
    await Promise.resolve();
    expect(profile.get()).not.toBeNull();
  });

  it('does nothing once disconnected', () => {
    profile.set({ entity: 'pty', businessTypes: ['food'], stage: 'trading' });
    const element = setUp();
    element.remove();
    element.querySelector<HTMLButtonElement>('[data-mark]')!.click();
    expect(pathDone.get()).toEqual({});
  });
});
