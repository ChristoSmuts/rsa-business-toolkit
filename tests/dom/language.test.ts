import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAll, lang } from '../../src/lib/store';
import { StLangBanner } from '../../src/scripts/lang-banner';
import { StLangSwitch } from '../../src/scripts/navigation';
import { mount } from './helpers';

const BANNER = `
  <main id="main" tabindex="-1">
    <st-lang-banner data-locale="af" data-stay-locale="en" lang="af-ZA" hidden>
      <section aria-labelledby="m"><p id="m">Laas het jy hierdie gids in Afrikaans gelees.</p>
        <a href="/business-toolkit/af/">Gaan voort in Afrikaans</a>
        <button type="button" data-lang-banner-stay>Bly op hierdie bladsy</button>
        <button type="button" data-lang-banner-dismiss aria-label="Maak die boodskap oor die taal toe">x</button>
      </section>
    </st-lang-banner>
    <h1>Home</h1>
  </main>`;

const banner = (): HTMLElement => document.querySelector('st-lang-banner') as HTMLElement;

beforeEach(() => {
  clearAll();
});

afterEach(() => {
  document.body.innerHTML = '';
  clearAll();
});

describe('<st-lang-banner>', () => {
  it('stays hidden with no saved language, or with English saved', () => {
    mount(BANNER);
    expect(banner()).toBeInstanceOf(StLangBanner);
    expect(banner().hidden).toBe(true);
    lang.set('en');
    expect(banner().hidden).toBe(true);
  });

  it('offers Afrikaans when that was the last choice, and never redirects', () => {
    lang.set('af');
    const before = window.location.href;
    mount(BANNER);
    expect(banner().hidden).toBe(false);
    expect(window.location.href).toBe(before);
  });

  it('"Stay on this page" saves English and moves focus to the page', () => {
    lang.set('af');
    mount(BANNER);
    const stay = document.querySelector<HTMLButtonElement>('[data-lang-banner-stay]');
    stay?.focus();
    stay?.click();
    expect(lang.get()).toBe('en');
    expect(localStorage.getItem('st.lang')).toBe('en');
    expect(banner().hidden).toBe(true);
    expect(document.activeElement?.id).toBe('main');
  });

  it('Close hides it for this page view only', () => {
    lang.set('af');
    mount(BANNER);
    document.querySelector<HTMLButtonElement>('[data-lang-banner-dismiss]')?.click();
    expect(banner().hidden).toBe(true);
    expect(lang.get()).toBe('af');
    // A later change in another tab does not bring it back on this page.
    lang.set('af');
    expect(banner().hidden).toBe(true);
  });

  it('ignores clicks elsewhere and stops listening when it disconnects', () => {
    lang.set('af');
    mount(BANNER);
    document.querySelector('p')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(banner().hidden).toBe(false);
    const element = banner();
    element.remove();
    lang.set(null);
    expect(element.hidden).toBe(false);
  });
});

describe('<st-lang-switch> saves the choice', () => {
  const SWITCH = `
    <st-lang-switch><nav><ul>
      <li><a href="/business-toolkit/core/" data-locale="en" aria-current="true">English</a></li>
      <li><a href="/business-toolkit/af/core/" data-locale="af"><span>Afrikaans</span></a></li>
    </ul></nav></st-lang-switch>`;

  it('stores the language that was followed', () => {
    mount(SWITCH);
    expect(document.querySelector('st-lang-switch')).toBeInstanceOf(StLangSwitch);
    const link = document.querySelector('a[data-locale="af"] span') as HTMLElement;
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(lang.get()).toBe('af');
  });

  it('ignores clicks that are not on a language link, and stops after disconnecting', () => {
    mount(SWITCH);
    document.querySelector('nav')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(lang.get()).toBeNull();
    const element = document.querySelector('st-lang-switch') as HTMLElement;
    const link = element.querySelector('a[data-locale="af"]') as HTMLElement;
    element.remove();
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(lang.get()).toBeNull();
  });
});
