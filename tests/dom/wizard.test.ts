/**
 * `<st-wizard>` on the markup `Wizard.astro` really renders: `tests/dom/fixtures/wizard.*.html`,
 * which `tests/unit/components/wizard-markup.test.ts` keeps equal to the component's output. So the
 * contract between the component and `src/scripts/wizard.ts` is what is tested.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pathView, profile } from '../../src/lib/profile-store';
import { PATHS, viewOf } from '../../src/scripts/path-data';
import { clearAll, storage } from '../../src/lib/store';
import { StWizard } from '../../src/scripts/wizard';
import { REPO_ROOT } from '../unit/site/data';
import { mount } from './helpers';

const fixture = (locale: 'en' | 'af'): string =>
  readFileSync(path.join(REPO_ROOT, 'tests', 'dom', 'fixtures', `wizard.${locale}.html`), 'utf8');
const markup = { en: fixture('en'), af: fixture('af') };

beforeEach(() => {
  clearAll();
  localStorage.clear();
  document.documentElement.classList.add('js');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function setUp(locale: 'en' | 'af' = 'en'): StWizard {
  mount(markup[locale]);
  const wizard = document.querySelector('st-wizard');
  if (!(wizard instanceof StWizard)) throw new Error('st-wizard did not upgrade');
  wizard.navigate = vi.fn();
  return wizard;
}

const step = (name: string): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-step="${name}"]`)!;
const input = (name: string, value: string): HTMLInputElement =>
  document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!;
const button = (name: string, selector: string): HTMLButtonElement =>
  step(name).querySelector<HTMLButtonElement>(selector)!;

/** A click on a radio or checkbox, as a pointer or the Space key gives it. */
function choose(target: HTMLInputElement): void {
  target.click();
}

describe('<st-wizard>', () => {
  it('shows one question at a time and marks the current step', () => {
    setUp();
    expect(step('entity').hidden).toBe(false);
    expect(step('type').hidden).toBe(true);
    expect(step('stage').hidden).toBe(true);
    const current = document.querySelectorAll('[data-stepper][aria-current="step"]');
    expect(current).toHaveLength(1);
    expect((current[0] as HTMLElement).dataset['stepper']).toBe('0');
  });

  it('makes the kinds of business checkboxes, which the server renders as radios', () => {
    const template = document.createElement('template');
    template.innerHTML = markup.en;
    expect(template.content.querySelector('input[name="type"]')?.getAttribute('type')).toBe(
      'radio',
    );
    setUp();
    const types = [...document.querySelectorAll<HTMLInputElement>('input[name="type"]')];
    expect(types).toHaveLength(7);
    expect(types.every((box) => box.type === 'checkbox')).toBe(true);
  });

  it('keeps Next aria-disabled, with its reason, until the step is answered', () => {
    setUp();
    const next = button('entity', '[data-next]');
    const hint = step('entity').querySelector<HTMLElement>('[data-next-hint]')!;
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(next.getAttribute('aria-describedby')).toBe(hint.id);
    expect(hint.hidden).toBe(false);
    choose(input('entity', 'sole-prop'));
    expect(next.hasAttribute('aria-disabled')).toBe(false);
    expect(hint.hidden).toBe(true);
    // A hidden line it points at is still read out, so an answered step's Next has no description
    // (WP-50a review pass 3, m2).
    expect(next.hasAttribute('aria-describedby')).toBe(false);
  });

  it('holds its height until the reader acts, then drops the hidden no-JS line on question 2', () => {
    const wizard = setUp();
    // happy-dom has no layout, so the held height is 0px; what matters is that one is set and then
    // given up (WP-50a review pass 4, M1 and m1; the sizes are in wizard-shift.spec.ts).
    expect(wizard.style.minBlockSize).not.toBe('');
    choose(input('entity', 'sole-prop'));
    expect(wizard.style.minBlockSize).toBe('');
    const noJsLine = document.querySelector<HTMLElement>('[data-swap="no-js"]')!;
    expect(noJsLine.hidden).toBe(false);
    choose(input('type', 'general'));
    expect(noJsLine.hidden).toBe(true);
    wizard.remove();
    expect(noJsLine.hidden).toBe(false);
  });

  it('describes "See my path" by the line that shows: the earlier question, then nothing', () => {
    setUp();
    choose(input('type', 'general'));
    choose(input('stage', 'not-started'));
    const finish = button('stage', '[data-finish]');
    const earlier = step('stage').querySelector<HTMLElement>('[data-earlier-hint]')!;
    // Question 1 has no answer: the button is described by the line that says so, which shows.
    expect(earlier.hidden).toBe(false);
    expect(earlier.id).not.toBe('');
    expect(finish.getAttribute('aria-describedby')).toBe(earlier.id);
    choose(input('entity', 'sole-prop'));
    expect(earlier.hidden).toBe(true);
    expect(finish.hasAttribute('aria-describedby')).toBe(false);
  });

  it('moves focus to the next step’s heading on Next and back on Back', () => {
    const wizard = setUp();
    choose(input('entity', 'pty'));
    button('entity', '[data-next]').click();
    expect(wizard.current).toBe(1);
    expect(step('entity').hidden).toBe(true);
    expect(document.activeElement).toBe(step('type').querySelector('[data-step-heading]'));
    button('type', '[data-back]').click();
    expect(wizard.current).toBe(0);
    expect(document.activeElement).toBe(step('entity').querySelector('[data-step-heading]'));
  });

  it('does not pass an unanswered step, and Enter in a field goes to the next step', () => {
    const wizard = setUp();
    wizard.go(1);
    expect(wizard.current).toBe(0);
    const form = document.querySelector('form')!;
    form.requestSubmit();
    expect(wizard.current).toBe(0);
    choose(input('entity', 'undecided'));
    input('entity', 'undecided').focus();
    form.requestSubmit();
    expect(wizard.current).toBe(1);
    expect(wizard.navigate).not.toHaveBeenCalled();
  });

  it('disables “Pty Ltd, growing”, with its reason, unless the entity is Pty Ltd', () => {
    setUp();
    const growing = input('stage', 'pty-growing');
    const reason = document.querySelector<HTMLElement>('[data-pty-reason]')!;
    choose(input('entity', 'sole-prop'));
    expect(growing.disabled).toBe(true);
    expect(reason.hidden).toBe(false);
    expect(growing.getAttribute('aria-describedby')).toContain(reason.id);
    choose(input('entity', 'pty'));
    expect(growing.disabled).toBe(false);
    expect(reason.hidden).toBe(true);
    choose(growing);
    expect(growing.checked).toBe(true);
    choose(input('entity', 'undecided'));
    expect(growing.checked).toBe(false);
  });

  it('keeps the types in the order they were ticked, and saves the profile', () => {
    const wizard = setUp();
    choose(input('entity', 'pty'));
    wizard.go(1);
    const next = button('type', '[data-next]');
    expect(next.getAttribute('aria-disabled')).toBe('true');
    choose(input('type', 'food'));
    choose(input('type', 'vehicle-dealer'));
    choose(input('type', 'general'));
    choose(input('type', 'general'));
    expect(next.hasAttribute('aria-disabled')).toBe(false);
    next.click();
    choose(input('stage', 'pty-growing'));
    button('stage', '[data-finish]').click();
    document.querySelector('form')!.requestSubmit();
    expect(profile.get()).toEqual({
      entity: 'pty',
      businessTypes: ['food', 'vehicle-dealer'],
      stage: 'pty-growing',
    });
    expect(JSON.parse(localStorage.getItem('st.profile.v1') ?? 'null')).toEqual(profile.get());
    // The path for these answers, which the top bar and the pager read (review WP-31 pass 1, major 1).
    expect(pathView.get()).toEqual(viewOf(profile.get()!, PATHS.hash));
    expect(wizard.navigate).toHaveBeenCalledWith(expect.stringMatching(/\/my-path\/\?saved=1$/));
  });

  it('sends the answers in the address when the device will not save them', () => {
    vi.spyOn(storage.available, 'get').mockReturnValue(false);
    const wizard = setUp();
    choose(input('entity', 'sole-prop'));
    choose(input('type', 'beauty'));
    choose(input('stage', 'trading'));
    wizard.finish();
    expect(wizard.navigate).toHaveBeenCalledWith(
      expect.stringMatching(/\/my-path\/\?entity=sole-prop&type=beauty&stage=trading$/),
    );
  });

  it('starts from the saved answers (Edit answers)', () => {
    profile.set({ entity: 'pty', businessTypes: ['beauty', 'general'], stage: 'trading' });
    const wizard = setUp();
    expect(input('entity', 'pty').checked).toBe(true);
    expect(input('type', 'beauty').checked).toBe(true);
    expect(input('type', 'general').checked).toBe(true);
    expect(input('stage', 'trading').checked).toBe(true);
    expect(wizard.answers()).toEqual(profile.get());
  });

  it('does nothing once disconnected', () => {
    const wizard = setUp();
    wizard.remove();
    document.body.append(wizard);
    wizard.remove();
    wizard.querySelector<HTMLInputElement>('input[name="entity"][value="pty"]')!.click();
    const next = wizard.querySelector('[data-step="entity"] [data-next]');
    expect(next?.getAttribute('aria-disabled')).toBe('true');
  });

  it('describes the kinds of business for the checkboxes it makes, not the no-JS radios', () => {
    const template = document.createElement('template');
    template.innerHTML = markup.en;
    const described = (root: ParentNode): string[] =>
      (
        root.querySelector('[data-step="type"] fieldset')?.getAttribute('aria-describedby') ?? ''
      ).split(' ');
    // Without JavaScript: the one-type hint, never the hidden "Choose all that fit" (minor 3).
    expect(described(template.content)).toContain('wz-nojs-type');
    expect(described(template.content)).not.toContain('wz-help-type');
    // The two lines share one slot, swapped by visibility, so nothing moves when the script arrives
    // (review pass 3, M1).
    const slot = template.content.querySelector('#wz-nojs-type')?.parentElement;
    expect(slot?.classList.contains('st-wizard__swap')).toBe(true);
    expect(slot?.querySelector('#wz-help-type')).not.toBeNull();
    setUp();
    expect(described(document)).toContain('wz-help-type');
    expect(described(document)).not.toContain('wz-nojs-type');
  });

  it('renders in Afrikaans with the same contract', () => {
    setUp('af');
    expect(document.querySelector('[data-step-heading]')?.textContent).toContain('Vraag 1 van 3');
    expect(document.querySelectorAll('input[name="entity"]')).toHaveLength(3);
  });
});

describe('the no-JavaScript form', () => {
  it('has one result button per single-type answer, each a GET submit to its page', () => {
    const template = document.createElement('template');
    template.innerHTML = markup.en;
    const form = template.content.querySelector('form')!;
    expect(form.getAttribute('method')).toBe('get');
    const results = [...template.content.querySelectorAll<HTMLButtonElement>('[data-result]')];
    expect(results).toHaveLength(49);
    for (const result of results) {
      expect(result.type).toBe('submit');
      const [entity, type, stage] = (result.dataset['result'] ?? '').split('/');
      expect(result.getAttribute('formaction')).toBe(
        `/find-my-path/result/${entity}/${type}/${stage}/`,
      );
    }
  });

  it('also lists every result page as a link, for a browser without :has()', () => {
    for (const locale of ['en', 'af'] as const) {
      const template = document.createElement('template');
      template.innerHTML = markup[locale];
      const list = template.content.querySelector('details.st-wizard__fallback')!;
      expect(list.classList.contains('no-js-only')).toBe(true);
      // Where it shows, it is the only way on: open, and telling the reader to use it (pass 2,
      // minor 5).
      expect(list.hasAttribute('open')).toBe(true);
      expect(list.querySelector('summary')?.textContent).not.toMatch(/^(Or|Of) /);
      expect(list.querySelector('summary + .st-hint')?.textContent).toBeTruthy();
      const links = [...list.querySelectorAll<HTMLAnchorElement>('a')].map((link) =>
        link.getAttribute('href'),
      );
      const buttons = [
        ...template.content.querySelectorAll<HTMLButtonElement>('[data-result]'),
      ].map((result) => result.getAttribute('formaction'));
      expect(links).toHaveLength(49);
      expect(new Set(links)).toEqual(new Set(buttons));
    }
  });
});
