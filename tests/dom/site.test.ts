import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTypingTarget } from '../../src/lib/shortcuts';
import { clearAll, lowData, shortcuts, theme } from '../../src/lib/store';
import { handleShortcut } from '../../src/scripts/site';
import { applyTheme, StThemeToggle } from '../../src/scripts/theme-control';
import { mount, press } from './helpers';

beforeEach(() => {
  clearAll();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  document.head
    .querySelectorAll('link[rel="help"], meta[name="theme-color"]')
    .forEach((n) => n.remove());
  clearAll();
});

describe('isTypingTarget', () => {
  it('is true for text fields, textareas, selects and editable content', () => {
    mount(`
      <input id="text" type="text" /><input id="search" type="search" /><input id="plain" />
      <textarea id="area"></textarea><select id="select"><option>a</option></select>
      <div id="edit" contenteditable="true"><span id="inside">x</span></div>`);
    for (const id of ['text', 'search', 'plain', 'area', 'select', 'edit', 'inside']) {
      expect(isTypingTarget(document.getElementById(id)), id).toBe(true);
    }
  });

  it('is false for checkboxes, radios, buttons, links and the page', () => {
    mount(`
      <input id="box" type="checkbox" /><input id="radio" type="radio" />
      <button id="button">b</button><a id="link" href="#x">l</a>
      <div contenteditable="false"><span id="off">x</span></div>`);
    for (const id of ['box', 'radio', 'button', 'link', 'off']) {
      expect(isTypingTarget(document.getElementById(id)), id).toBe(false);
    }
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
  });
});

describe('keyboard shortcuts', () => {
  const PAGER = `
    <nav><a href="#prev" rel="prev" id="prev">Previous</a><a href="#next" rel="next" id="next">Next</a></nav>
    <input id="field" type="text" />`;

  it('Alt+← and Alt+→ follow the pager', () => {
    mount(PAGER);
    const previous = vi.fn((event: Event) => event.preventDefault());
    const next = vi.fn((event: Event) => event.preventDefault());
    document.getElementById('prev')?.addEventListener('click', previous);
    document.getElementById('next')?.addEventListener('click', next);
    const left = press('ArrowLeft', { altKey: true }, document.body);
    expect(previous).toHaveBeenCalledTimes(1);
    expect(left.defaultPrevented).toBe(true);
    press('ArrowRight', { altKey: true }, document.body);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does nothing behind an open dialog', () => {
    mount(`${PAGER}<dialog open><button>Cancel</button></dialog>`);
    const previous = vi.fn((event: Event) => event.preventDefault());
    document.getElementById('prev')?.addEventListener('click', previous);
    const event = press('ArrowLeft', { altKey: true }, document.body);
    expect(previous).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('leaves Alt+← to the browser when the page has no pager', () => {
    const event = press('ArrowLeft', { altKey: true }, document.body);
    expect(event.defaultPrevented).toBe(false);
  });

  it('never fires while typing in a field', () => {
    mount(PAGER);
    const previous = vi.fn((event: Event) => event.preventDefault());
    document.getElementById('prev')?.addEventListener('click', previous);
    document.getElementById('field')?.focus();
    const event = press('ArrowLeft', { altKey: true });
    expect(previous).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('? goes to the shortcuts list, and does nothing once single-key shortcuts are off', () => {
    const link = document.createElement('link');
    link.rel = 'help';
    link.href = '/business-toolkit/about/#keyboard-shortcuts';
    document.head.append(link);
    const assign = vi.fn();
    const fakeWindow = { location: { pathname: '/business-toolkit/core/', assign } };
    const doc = new Proxy(document, {
      get(target, property) {
        if (property === 'defaultView') return fakeWindow;
        const value = Reflect.get(target, property, target) as unknown;
        return typeof value === 'function' ? (value as () => unknown).bind(target) : value;
      },
    });
    const event = new KeyboardEvent('keydown', { key: '?', shiftKey: true, cancelable: true });
    handleShortcut(event, doc);
    expect(event.defaultPrevented).toBe(true);
    expect(assign).toHaveBeenCalledWith(new URL(link.href, document.baseURI).href);

    shortcuts.set(false);
    const off = new KeyboardEvent('keydown', { key: '?', shiftKey: true, cancelable: true });
    handleShortcut(off, doc);
    expect(off.defaultPrevented).toBe(false);
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('? on the about page moves focus to the shortcuts heading', () => {
    mount('<h2 id="keyboard-shortcuts">Keyboard shortcuts</h2>');
    const link = document.createElement('link');
    link.rel = 'help';
    link.href = `${window.location.pathname}#keyboard-shortcuts`;
    document.head.append(link);
    press('?', { shiftKey: true }, document.body);
    expect(document.activeElement?.id).toBe('keyboard-shortcuts');
  });

  it('Escape closes an open "On this page" list and returns focus to its summary', () => {
    mount(
      `<details class="st-toc" open><summary>On this page</summary><a href="#a" id="a">A</a></details>`,
    );
    document.getElementById('a')?.focus();
    press('Escape');
    expect(document.querySelector('details')?.open).toBe(false);
    expect(document.activeElement?.tagName).toBe('SUMMARY');
    // With nothing open, Escape does nothing.
    expect(() => press('Escape', {}, document.body)).not.toThrow();
  });
});

describe('low data', () => {
  it('follows the store onto <html data-low-data>', () => {
    lowData.set(true);
    expect(document.documentElement.hasAttribute('data-low-data')).toBe(true);
    lowData.set(false);
    expect(document.documentElement.hasAttribute('data-low-data')).toBe(false);
  });
});

describe('<st-theme-toggle> on the store', () => {
  const TOGGLE = `
    <st-theme-toggle><fieldset>
      <label><input type="radio" name="t" value="system" />System</label>
      <label><input type="radio" name="t" value="light" />Light</label>
      <label><input type="radio" name="t" value="dark" />Dark</label>
    </fieldset></st-theme-toggle>`;
  const radio = (value: string, scope: ParentNode = document): HTMLInputElement =>
    scope.querySelector(`input[value="${value}"]`) as HTMLInputElement;

  function metas(): void {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<meta name="theme-color" content="#fbf8f3" data-st-scheme="light" data-st-colour="#fbf8f3" />' +
        '<meta name="theme-color" content="#15130f" data-st-scheme="dark" data-st-colour="#15130f" />',
    );
  }

  it('saves a choice, applies it, and keeps every toggle in step', () => {
    metas();
    mount(
      `<div id="a">${TOGGLE}</div><div id="b">${TOGGLE.replaceAll('name="t"', 'name="u"')}</div>`,
    );
    expect(document.querySelector('st-theme-toggle')).toBeInstanceOf(StThemeToggle);
    expect(radio('system').checked).toBe(true);
    radio('dark', document.getElementById('a') as HTMLElement).click();
    expect(theme.get()).toBe('dark');
    expect(localStorage.getItem('st.theme')).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(radio('dark', document.getElementById('b') as HTMLElement).checked).toBe(true);
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      expect(meta.content).toBe('#15130f');
    }
  });

  it('goes back to the system theme when the data is cleared', () => {
    metas();
    theme.set('light');
    mount(TOGGLE);
    expect(radio('light').checked).toBe(true);
    clearAll();
    expect(radio('system').checked).toBe(true);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    const contents = [
      ...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    ].map((meta) => meta.content);
    expect(contents).toEqual(['#fbf8f3', '#15130f']);
  });

  it('stops following the store when it disconnects', () => {
    mount(TOGGLE);
    const element = document.querySelector('st-theme-toggle') as HTMLElement;
    element.remove();
    theme.set('dark');
    expect(radio('dark', element).checked).toBe(false);
    radio('light', element).click();
    expect(theme.get()).toBe('dark');
  });

  it('applyTheme sets and clears data-theme on any root', () => {
    const root = document.createElement('div');
    applyTheme('light', root);
    expect(root.dataset['theme']).toBe('light');
    applyTheme('system', root);
    expect(root.dataset['theme']).toBeUndefined();
  });
});
