import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentIndex, StToc } from '../../src/scripts/toc';
import { mount } from './helpers';

describe('currentIndex', () => {
  it('is the last heading whose top has passed the line', () => {
    expect(currentIndex([-500, -10, 40, 900], 50)).toBe(2);
    expect(currentIndex([-500, -10, 51, 900], 50)).toBe(1);
  });

  it('is -1 above the first heading', () => {
    expect(currentIndex([100, 900], 50)).toBe(-1);
    expect(currentIndex([], 50)).toBe(-1);
  });

  it('at the bottom of the page, is the last heading on screen', () => {
    expect(currentIndex([-500, 300, 600], 50, true, 800)).toBe(2);
    expect(currentIndex([-500, 300, 900], 50, true, 800)).toBe(1);
  });
});

/** Gives each heading a fixed position on screen. */
function place(tops: Record<string, number>): void {
  for (const [id, top] of Object.entries(tops)) {
    const element = document.getElementById(id);
    if (!element) continue;
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top,
      bottom: top + 30,
      left: 0,
      right: 100,
      width: 100,
      height: 30,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });
  }
}

const HEADINGS = `
  <h2 id="one">One</h2>
  <h2 id="two">Two</h2>
  <h3 id="two-a">Two A</h3>`;

const DETAILS = `
  <st-toc>
    <details class="st-toc" id="st-on-this-page">
      <summary>On this page (3 sections)</summary>
      <nav><ul class="st-toc__list">
        <li><a href="#one">One</a></li>
        <li><a href="#two">Two</a></li>
        <li><a href="#two-a">Two A</a></li>
        <li><a href="#missing">Missing</a></li>
      </ul></nav>
    </details>
    <div><a href="#st-on-this-page" data-toc-pill data-label-template="Now reading: {title}. Open the list of sections." hidden><span>Now reading</span> <span data-toc-pill-text></span></a></div>
  </st-toc>`;

const current = (): string[] =>
  [...document.querySelectorAll('[aria-current="location"]')].map((a) => a.textContent ?? '');

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('<st-toc>', () => {
  it('marks nothing above the first section, and hides the pill', () => {
    mount(HEADINGS);
    place({ one: 200, two: 900, 'two-a': 1200 });
    mount(DETAILS);
    expect(document.querySelector('st-toc')).toBeInstanceOf(StToc);
    expect(current()).toEqual([]);
    expect(document.querySelector<HTMLElement>('[data-toc-pill]')?.hidden).toBe(true);
  });

  it('marks the section being read with aria-current="location"', () => {
    mount(HEADINGS);
    place({ one: -400, two: 5, 'two-a': 900 });
    mount(DETAILS);
    expect(current()).toEqual(['Two']);
  });

  // WP-50a review pass 1, M3 and pass 2, M3: a tall pill never covers a heading the reader has just
  // reached, but a pill that clears the heading stays up, so it does not blink at every heading.
  it('hides a tall pill over a just-reached heading, and keeps a short one up', () => {
    const pillAt = (bottom: number): void => {
      const pill = document.querySelector<HTMLElement>('[data-toc-pill]');
      if (!pill) throw new Error('no pill');
      vi.spyOn(pill, 'getBoundingClientRect').mockReturnValue({
        top: 8,
        bottom,
        left: 0,
        right: 200,
        width: 200,
        height: bottom - 8,
        x: 0,
        y: 8,
        toJSON: () => ({}),
      });
    };
    mount(HEADINGS);
    place({ one: -400, two: -100, 'two-a': 0 });
    mount(DETAILS);
    place({ 'st-on-this-page': -300 });
    const toc = document.querySelector('st-toc') as StToc;
    const pill = document.querySelector<HTMLElement>('[data-toc-pill]');
    pillAt(150);
    toc.update();
    expect(current()).toEqual(['Two A']);
    expect(pill?.hidden).toBe(true);
    // Scrolled on past the hysteresis: the heading is going under the pill like any text.
    place({ one: -400, two: -100, 'two-a': -20 });
    toc.update();
    expect(pill?.hidden).toBe(false);
    // A short pill that ends above the heading never hides.
    place({ one: -400, two: -100, 'two-a': 0 });
    pillAt(-1);
    toc.update();
    expect(pill?.hidden).toBe(false);
  });

  it('takes the section by its place on the page, not its place in the list', () => {
    mount('<h2 id="two">Two</h2>');
    mount(HEADINGS.replace('<h2 id="two">Two</h2>', ''));
    place({ one: -400, two: -10, 'two-a': -200 });
    mount(DETAILS);
    expect(current()).toEqual(['Two']);
  });

  it('shows the pill once the list and the heading have scrolled away, and the pill opens the list', () => {
    mount(HEADINGS);
    place({ one: -400, two: -100, 'two-a': -40 });
    mount(DETAILS);
    place({ 'st-on-this-page': -300 });
    (document.querySelector('st-toc') as StToc).update();
    const pill = document.querySelector<HTMLAnchorElement>('[data-toc-pill]');
    expect(pill?.hidden).toBe(false);
    expect(document.querySelector('[data-toc-pill-text]')?.textContent).toBe('Two A');
    expect(pill?.getAttribute('aria-label')).toBe('Now reading: Two A. Open the list of sections.');
    pill?.click();
    expect(document.querySelector('details')?.open).toBe(true);
  });

  it('follows scrolling, one update per frame', async () => {
    mount(HEADINGS);
    place({ one: 5, two: 600, 'two-a': 900 });
    mount(DETAILS);
    expect(current()).toEqual(['One']);
    place({ one: -600, two: 5, 'two-a': 300 });
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(current()).toEqual(['Two']);
  });

  it('stops following scrolling when it disconnects', async () => {
    mount(HEADINGS);
    place({ one: 5, two: 600, 'two-a': 900 });
    mount(DETAILS);
    const element = document.querySelector('st-toc') as StToc;
    element.remove();
    place({ one: -600, two: 5, 'two-a': 300 });
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(element.querySelector('[aria-current]')?.textContent).toBe('One');
  });

  it('works for the column, which has no pill', () => {
    mount(HEADINGS);
    place({ one: -10, two: 600, 'two-a': 900 });
    mount(
      `<st-toc><nav><ul class="st-toc__list"><li><a href="#one">One</a></li><li><a href="#two">Two</a></li></ul></nav></st-toc>`,
    );
    expect(current()).toEqual(['One']);
  });
});
