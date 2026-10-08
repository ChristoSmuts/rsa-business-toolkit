import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { profile } from '../../src/lib/profile-store';
import { clearAll } from '../../src/lib/store';
import { StPromptFill } from '../../src/scripts/prompt-fill';
import { mount } from './helpers';

const VALUES = JSON.stringify({
  'vehicle-dealer': 'vehicle dealer',
  food: 'food business',
  beauty: 'beauty and personal care business',
  'retail-online': 'retail and online shop',
  'services-trades': 'services and trades business',
  'professional-creative': 'professional and creative business',
});

const PROMPT = `
  <figure lang="en-ZA">
    <pre><code>I am a <mark class="st-placeholder" data-placeholder="identity" data-key="businessType">[BUSINESS TYPE]</mark> in <mark class="st-placeholder" data-placeholder="identity" data-key="town">[TOWN/CITY]</mark>, South Africa. I sell <mark class="st-placeholder" data-placeholder="field">[WHAT]</mark>.</code></pre>
    <st-prompt-fill data-values='${VALUES}' data-remaining-one="{count} blank left to fill in"
      data-remaining-other="{count} blanks left to fill in" data-all-filled="All blanks are filled in." hidden>
      <button type="button" data-fill>Fill from my profile</button>
      <button type="button" data-undo hidden>Undo</button>
      <p role="status"></p>
    </st-prompt-fill>
  </figure>`;

const code = (): string => document.querySelector('code')?.textContent ?? '';
const status = (): string => document.querySelector('[role="status"]')?.textContent ?? '';
const fill = (): HTMLButtonElement => document.querySelector('[data-fill]')!;
const undo = (): HTMLButtonElement => document.querySelector('[data-undo]')!;

beforeEach(() => {
  clearAll();
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('<st-prompt-fill>', () => {
  it('stays hidden without answers, or when the first kind of business is General', () => {
    mount(PROMPT);
    const element = document.querySelector('st-prompt-fill') as StPromptFill;
    expect(element).toBeInstanceOf(StPromptFill);
    expect(element.hidden).toBe(true);
    profile.set({ entity: 'pty', businessTypes: ['general', 'food'], stage: 'trading' });
    expect(element.hidden).toBe(true);
    profile.set({ entity: 'pty', businessTypes: ['food', 'general'], stage: 'trading' });
    expect(element.hidden).toBe(false);
  });

  it('fills the known blank, says how many remain, and undoes it', () => {
    profile.set({ entity: 'sole-prop', businessTypes: ['vehicle-dealer'], stage: 'trading' });
    mount(PROMPT);
    fill().click();
    expect(code()).toBe('I am a vehicle dealer in [TOWN/CITY], South Africa. I sell [WHAT].');
    expect(status()).toBe('2 blanks left to fill in');
    expect(fill().hidden).toBe(true);
    expect(undo().hidden).toBe(false);
    expect(document.activeElement).toBe(undo());
    undo().click();
    expect(code()).toBe('I am a [BUSINESS TYPE] in [TOWN/CITY], South Africa. I sell [WHAT].');
    expect(status()).toBe('3 blanks left to fill in');
    expect(document.activeElement).toBe(fill());
  });

  it('says when every blank is filled, and uses the singular for one', () => {
    profile.set({ entity: 'pty', businessTypes: ['food'], stage: 'trading' });
    mount(PROMPT.replace(/ in <mark[^]*?<\/mark>, South Africa\. I sell <mark[^]*?<\/mark>/, ''));
    fill().click();
    expect(code()).toBe('I am a food business.');
    expect(status()).toBe('All blanks are filled in.');
    document.body.innerHTML = '';
    mount(PROMPT.replace(/ I sell <mark[^]*?<\/mark>\./, ''));
    fill().click();
    expect(status()).toBe('1 blank left to fill in');
  });

  it('puts the brackets back when the answers go', () => {
    profile.set({ entity: 'pty', businessTypes: ['beauty'], stage: 'trading' });
    mount(PROMPT);
    fill().click();
    profile.reset();
    expect(code()).toContain('[BUSINESS TYPE]');
    expect((document.querySelector('st-prompt-fill') as HTMLElement).hidden).toBe(true);
  });

  it('ignores values it cannot read, and does nothing once disconnected', () => {
    profile.set({ entity: 'pty', businessTypes: ['beauty'], stage: 'trading' });
    mount(PROMPT.replace(`data-values='${VALUES}'`, "data-values='not json'"));
    const element = document.querySelector('st-prompt-fill') as StPromptFill;
    expect(element.hidden).toBe(true);
    element.fill();
    expect(code()).toContain('[BUSINESS TYPE]');
    element.remove();
    element.querySelector<HTMLButtonElement>('[data-fill]')!.click();
    expect(element.querySelector('code')).toBeNull();
  });
});
