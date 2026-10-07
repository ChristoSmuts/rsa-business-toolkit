/**
 * The path elements on every page (`path-progress.ts`) and the home card (`your-path.ts`). They draw
 * from the path stored on the device (`st.pathView.v1`) and never load the rules themselves, except
 * the home card, which rebuilds a missing or out-of-date path lazily (review WP-31 pass 1, major 1).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { href } from '../../src/lib/paths';
import type { Profile } from '../../src/lib/profile';
import { pathDone, pathView, profile } from '../../src/lib/profile-store';
import { clearAll } from '../../src/lib/store';
import { PATHS, viewOf } from '../../src/scripts/path-data';
import { StPathPager, StPathProgress } from '../../src/scripts/path-progress';
import { StYourPath } from '../../src/scripts/your-path';
import { mount } from './helpers';

const RING = `<span class="st-ring"><svg role="img" aria-label=""><circle class="st-ring__value" stroke-dashoffset="100"></circle></svg><span class="st-ring__text">0%</span></span>`;
const AT = '2026-10-01T10:00:00.000Z';

const GROWING: Profile = { entity: 'pty', businessTypes: ['vehicle-dealer'], stage: 'pty-growing' };
const FOOD: Profile = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' };

/** Saves the answers and the path for them, as the wizard and My path do. */
function answer(who: Profile): void {
  profile.set(who);
  pathView.set(viewOf(who, PATHS.hash));
}

beforeEach(() => {
  clearAll();
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('<st-path-progress>', () => {
  const BAR = `<st-path-progress data-version="${PATHS.hash}" data-template="My path: {done} of {total} steps done" hidden>
    <a href="#">${RING}<span data-progress-text>My path</span></a></st-path-progress>`;
  const bar = (): StPathProgress => document.querySelector('st-path-progress') as StPathProgress;

  it('shows only with answers and their stored path, and counts the steps done', () => {
    mount(BAR);
    expect(bar()).toBeInstanceOf(StPathProgress);
    expect(bar().hidden).toBe(true);
    answer(GROWING);
    expect(bar().hidden).toBe(false);
    expect(bar().querySelector('[data-progress-text]')?.textContent).toBe(
      'My path: 0 of 10 steps done',
    );
    pathDone.set({ 'core/start-here': AT });
    expect(bar().querySelector('[data-progress-text]')?.textContent).toBe(
      'My path: 1 of 10 steps done',
    );
    expect(bar().querySelector('.st-ring__text')?.textContent).toBe('10%');
    profile.reset();
    expect(bar().hidden).toBe(true);
  });

  it('stays hidden while the stored path is for other answers or other rules', () => {
    profile.set(FOOD);
    pathView.set(viewOf(GROWING, PATHS.hash));
    mount(BAR);
    expect(bar().hidden).toBe(true);
    pathView.set(viewOf(FOOD, 'an-older-version'));
    expect(bar().hidden).toBe(true);
    pathView.set(viewOf(FOOD, PATHS.hash));
    expect(bar().hidden).toBe(false);
  });

  it('draws nothing after disconnecting', () => {
    mount(BAR);
    const element = bar();
    element.remove();
    answer(GROWING);
    expect(element.hidden).toBe(true);
  });
});

describe('<st-your-path>', () => {
  const CARD = `<st-your-path data-version="${PATHS.hash}" data-locale="af" data-progress="{done} van {total} klaar" data-continue="Gaan voort: stap {n} van {total}" hidden>
    ${RING}<p data-progress-text></p>
    <a href="/business-toolkit/af/my-path/" data-continue><span class="st-btn__label">Maak my roete oop</span></a></st-your-path>`;
  const card = (): StYourPath => document.querySelector('st-your-path') as StYourPath;

  it('links the next step’s first page in the page’s language', () => {
    answer(FOOD);
    pathDone.set({ 'lookup/checklist': AT });
    mount(CARD);
    expect(card().hidden).toBe(false);
    const link = card().querySelector<HTMLAnchorElement>('a[data-continue]')!;
    expect(link.getAttribute('href')).toBe(href('af', 'core/tax-and-sars/'));
    expect(link.textContent).toBe('Gaan voort: stap 2 van 4');
    expect(card().querySelector('[data-progress-text]')?.textContent).toBe('1 van 4 klaar');
  });

  it('rebuilds and stores a missing or out-of-date path, which the top bar then draws', async () => {
    profile.set(FOOD);
    pathView.set(viewOf(FOOD, 'an-older-version'));
    mount(
      `<st-path-progress data-version="${PATHS.hash}" data-template="{done}/{total}" hidden><span data-progress-text></span></st-path-progress>${CARD}`,
    );
    expect(card().hidden).toBe(true);
    await card().rebuilt;
    expect(pathView.get()).toEqual(viewOf(FOOD, PATHS.hash));
    expect(card().hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('st-path-progress')!.hidden).toBe(false);
  });

  it('never writes back a path another tab stored (review WP-31 pass 2, minor 1)', async () => {
    answer(FOOD);
    mount(CARD);
    await card().rebuilt;
    const set = vi.spyOn(pathView, 'set');
    // A tab on another build stores its own path; this tab hears it as a store change.
    pathView.set(viewOf(FOOD, 'another-build'));
    await card().rebuilt;
    await Promise.resolve();
    expect(set).toHaveBeenCalledTimes(1);
    expect(pathView.get()?.version).toBe('another-build');
    expect(card().hidden).toBe(true);
    // New answers in this tab are its own trigger: it stores the path for them.
    set.mockClear();
    const beauty = { ...FOOD, businessTypes: ['beauty'] } as Profile;
    profile.set(beauty);
    await card().rebuilt;
    expect(pathView.get()).toEqual(viewOf(beauty, PATHS.hash));
    expect(card().hidden).toBe(false);
  });

  it('hides “Continue” when every step is done, and the card without answers', () => {
    answer(FOOD);
    pathDone.set(
      Object.fromEntries(
        ['lookup/checklist', 'core/tax-and-sars', 'business-types/food', 'core/register'].map(
          (doc) => [doc, AT],
        ),
      ),
    );
    mount(CARD);
    expect(card().querySelector<HTMLElement>('a[data-continue]')!.hidden).toBe(true);
    profile.reset();
    expect(card().hidden).toBe(true);
  });
});

describe('<st-path-pager>', () => {
  const PAGER = (
    doc: string,
  ) => `<st-path-pager data-version="${PATHS.hash}" data-doc="${doc}" data-locale="en"
      data-my-path="/business-toolkit/my-path/" data-my-path-title="My path"><nav>
    <a rel="prev" href="/business-toolkit/start/what-has-changed/"><span>Previous: <span data-pager-title>What has changed</span></span></a>
    <a rel="next" href="/business-toolkit/core/register/"><span>Next: <span data-pager-title lang="en-ZA">Register</span></span></a>
  </nav></st-path-pager>`;
  const link = (rel: string): HTMLAnchorElement =>
    document.querySelector<HTMLAnchorElement>(`a[rel="${rel}"]`)!;
  const title = (rel: string): Element | null => link(rel).querySelector('[data-pager-title]');

  it('follows the path when the document is on it, and the section order otherwise', () => {
    mount(PAGER('core/start-here'));
    expect(document.querySelector('st-path-pager')).toBeInstanceOf(StPathPager);
    expect(link('next').getAttribute('href')).toBe('/business-toolkit/core/register/');
    answer(GROWING);
    expect(link('next').getAttribute('href')).toBe(href('en', 'core/running-a-pty-ltd/'));
    expect(title('next')?.textContent).toBe('Running a Pty Ltd');
    expect(title('next')?.hasAttribute('lang')).toBe(false);
    // The first step has no path neighbour before it: the section order stays.
    expect(link('prev').getAttribute('href')).toBe('/business-toolkit/start/what-has-changed/');
    expect(document.querySelector('st-path-pager')?.hasAttribute('data-on-path')).toBe(true);
    profile.reset();
    expect(link('next').getAttribute('href')).toBe('/business-toolkit/core/register/');
    expect(title('next')?.getAttribute('lang')).toBe('en-ZA');
    expect(document.querySelector('st-path-pager')?.hasAttribute('data-on-path')).toBe(false);
  });

  it('keeps the section order while the stored path is out of date', () => {
    profile.set(GROWING);
    pathView.set(viewOf(GROWING, 'an-older-version'));
    mount(PAGER('core/start-here'));
    expect(link('next').getAttribute('href')).toBe('/business-toolkit/core/register/');
  });

  it('leaves a document that is not on the path alone', () => {
    answer(GROWING);
    mount(PAGER('lookup/glossary'));
    expect(link('next').getAttribute('href')).toBe('/business-toolkit/core/register/');
    expect(document.querySelector('st-path-pager')?.hasAttribute('data-on-path')).toBe(false);
  });

  it('uses the anchor a path step names', () => {
    answer(GROWING);
    mount(PAGER('core/vehicles'));
    expect(link('next').getAttribute('href')).toBe(
      href('en', 'core/tax-and-sars/#route-4-small-business-corporation-rates-companies-only'),
    );
  });

  it('leads back to My path from the path’s last page (review WP-31 pass 1, nit 3)', () => {
    answer(FOOD);
    mount(PAGER('core/register'));
    expect(link('next').getAttribute('href')).toBe('/business-toolkit/my-path/');
    expect(title('next')?.textContent).toBe('My path');
    expect(title('next')?.hasAttribute('lang')).toBe(false);
    expect(link('prev').getAttribute('href')).toBe(href('en', 'business-types/food/'));
  });
});
