import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pathDone, profile } from '../../src/lib/profile-store';
import { clearAll, storage } from '../../src/lib/store';
import { href } from '../../src/lib/paths';
import { StMyPath } from '../../src/scripts/my-path';
import { PATHS } from '../../src/scripts/path-data';
import { StPathPager, StPathProgress, StYourPath } from '../../src/scripts/path-progress';
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
          <ul>${docs.map((doc) => `<li data-doc="${doc}"><h3><a href="#">${doc}</a></h3></li>`).join('')}</ul>
          <p data-why>Why this step: …</p>
          <button type="button" data-mark data-label-done="Mark as done" data-label-undo="Remove the tick"
            data-name-done="Mark it as done" data-name-undo="Remove the tick from it"><span class="st-btn__label">Mark as done</span></button>
        </li>`;
      }),
    )
    .join('');
}

const PAGE = `
  <st-my-path data-saved-tip="Saved on this device only." data-reset-done="Your answers were removed." data-progress-template="{done} of {total} done">
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
    expect(mark.getAttribute('aria-label')).toBe('Remove the tick from it');
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

describe('<st-path-progress>', () => {
  const BAR = `<st-path-progress data-template="My path: {done} of {total} steps done" hidden>
    <a href="#">${RING}<span data-progress-text>My path</span></a></st-path-progress>`;

  it('shows only with answers and counts the steps done', () => {
    mount(BAR);
    const element = document.querySelector('st-path-progress')!;
    expect(element).toBeInstanceOf(StPathProgress);
    expect((element as HTMLElement).hidden).toBe(true);
    profile.set({ entity: 'pty', businessTypes: ['vehicle-dealer'], stage: 'pty-growing' });
    expect((element as HTMLElement).hidden).toBe(false);
    expect(element.querySelector('[data-progress-text]')?.textContent).toBe(
      'My path: 0 of 10 steps done',
    );
    pathDone.set({ 'core/start-here': '2026-10-01T10:00:00.000Z' });
    expect(element.querySelector('[data-progress-text]')?.textContent).toBe(
      'My path: 1 of 10 steps done',
    );
    expect(element.querySelector('.st-ring__text')?.textContent).toBe('10%');
  });
});

describe('<st-your-path>', () => {
  const CARD = `<st-your-path data-locale="af" data-progress="{done} van {total} klaar" data-continue="Gaan voort: stap {n} van {total}" hidden>
    ${RING}<p data-progress-text></p>
    <a href="/business-toolkit/af/my-path/" data-continue><span class="st-btn__label">Maak my roete oop</span></a></st-your-path>`;

  it('links the next step’s first page in the page’s language', () => {
    profile.set({ entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' });
    pathDone.set({ 'lookup/checklist': '2026-10-01T10:00:00.000Z' });
    mount(CARD);
    const element = document.querySelector('st-your-path') as StYourPath;
    expect(element.hidden).toBe(false);
    const link = element.querySelector<HTMLAnchorElement>('a[data-continue]')!;
    expect(link.getAttribute('href')).toBe(href('af', 'core/tax-and-sars/'));
    expect(link.textContent).toBe('Gaan voort: stap 2 van 4');
    expect(element.querySelector('[data-progress-text]')?.textContent).toBe('1 van 4 klaar');
  });

  it('hides “Continue” when every step is done, and the card without answers', () => {
    profile.set({ entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' });
    pathDone.set(
      Object.fromEntries(
        ['lookup/checklist', 'core/tax-and-sars', 'business-types/food', 'core/register'].map(
          (doc) => [doc, '2026-10-01T10:00:00.000Z'],
        ),
      ),
    );
    mount(CARD);
    const element = document.querySelector('st-your-path') as StYourPath;
    expect(element.querySelector<HTMLElement>('a[data-continue]')!.hidden).toBe(true);
    profile.reset();
    expect(element.hidden).toBe(true);
  });
});

describe('<st-path-pager>', () => {
  const PAGER = (doc: string) => `<st-path-pager data-doc="${doc}" data-locale="en"><nav>
    <a rel="prev" href="/business-toolkit/start/what-has-changed/"><span>Previous: <span data-pager-title>What has changed</span></span></a>
    <a rel="next" href="/business-toolkit/core/register/"><span>Next: <span data-pager-title lang="en-ZA">Register</span></span></a>
  </nav></st-path-pager>`;
  const link = (rel: string): HTMLAnchorElement =>
    document.querySelector<HTMLAnchorElement>(`a[rel="${rel}"]`)!;

  it('follows the path when the document is on it, and the section order otherwise', () => {
    mount(PAGER('core/start-here'));
    expect(document.querySelector('st-path-pager')).toBeInstanceOf(StPathPager);
    expect(link('next').getAttribute('href')).toBe('/business-toolkit/core/register/');
    profile.set({ entity: 'pty', businessTypes: ['vehicle-dealer'], stage: 'pty-growing' });
    expect(link('next').getAttribute('href')).toBe(href('en', 'core/running-a-pty-ltd/'));
    expect(link('next').querySelector('[data-pager-title]')?.textContent).toBe('Running a Pty Ltd');
    expect(link('next').querySelector('[data-pager-title]')?.hasAttribute('lang')).toBe(false);
    // The first step has no path neighbour before it: the section order stays.
    expect(link('prev').getAttribute('href')).toBe('/business-toolkit/start/what-has-changed/');
    expect(document.querySelector('st-path-pager')?.hasAttribute('data-on-path')).toBe(true);
    profile.reset();
    expect(link('next').getAttribute('href')).toBe('/business-toolkit/core/register/');
    expect(link('next').querySelector('[data-pager-title]')?.getAttribute('lang')).toBe('en-ZA');
  });

  it('leaves a document that is not on the path alone', () => {
    profile.set({ entity: 'pty', businessTypes: ['vehicle-dealer'], stage: 'pty-growing' });
    mount(PAGER('lookup/glossary'));
    expect(link('next').getAttribute('href')).toBe('/business-toolkit/core/register/');
    expect(document.querySelector('st-path-pager')?.hasAttribute('data-on-path')).toBe(false);
  });

  it('uses the anchor a path step names', () => {
    profile.set({ entity: 'pty', businessTypes: ['vehicle-dealer'], stage: 'pty-growing' });
    mount(PAGER('core/vehicles'));
    expect(link('next').getAttribute('href')).toBe(
      href('en', 'core/tax-and-sars/#route-4-small-business-corporation-rates-companies-only'),
    );
  });
});
