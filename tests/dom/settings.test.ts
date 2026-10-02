import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checks,
  clearAll,
  lang,
  lowData,
  setChecked,
  shortcuts,
  storage,
  theme,
} from '../../src/lib/store';
import { StClearData, StSetting } from '../../src/scripts/settings';
import { StStorageNotice } from '../../src/scripts/storage-notice';
import { mount } from './helpers';

const SETTINGS = `
  <st-setting data-setting="shortcuts"><label><input type="checkbox" role="switch" checked />Single-key shortcuts</label></st-setting>
  <st-setting data-setting="lowData"><label><input type="checkbox" role="switch" />Low data mode</label></st-setting>
  <st-clear-data data-done="All your data was removed from this device.">
    <button type="button" data-clear-data>Clear all my data</button>
    <p role="status"></p>
    <dialog><form method="dialog"><button value="cancel">Cancel</button><button value="confirm">Clear my data</button></form></dialog>
  </st-clear-data>`;

const switchFor = (setting: string): HTMLInputElement =>
  document.querySelector(`[data-setting="${setting}"] input`) as HTMLInputElement;

beforeEach(() => {
  clearAll();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  clearAll();
});

describe('<st-setting>', () => {
  it('shows the stored value when it connects', () => {
    shortcuts.set(false);
    lowData.set(true);
    mount(SETTINGS);
    expect(document.querySelector('st-setting')).toBeInstanceOf(StSetting);
    expect(switchFor('shortcuts').checked).toBe(false);
    expect(switchFor('lowData').checked).toBe(true);
  });

  it('saves the switch, from the pointer or the keyboard (Space toggles a checkbox)', () => {
    mount(SETTINGS);
    switchFor('shortcuts').click();
    expect(shortcuts.get()).toBe(false);
    expect(localStorage.getItem('st.shortcuts')).toBe('false');
    switchFor('lowData').click();
    expect(lowData.get()).toBe(true);
  });

  it('follows the store when it changes elsewhere', () => {
    mount(SETTINGS);
    lowData.set(true);
    expect(switchFor('lowData').checked).toBe(true);
  });

  it('ignores an unknown setting and stops listening when it disconnects', () => {
    mount('<st-setting data-setting="nope"><input type="checkbox" /></st-setting>');
    mount(SETTINGS);
    const element = document.querySelector('[data-setting="lowData"]');
    const box = switchFor('lowData');
    element?.remove();
    box.click();
    expect(lowData.get()).toBe(false);
    lowData.set(true);
    expect(box.checked).toBe(true);
    lowData.set(false);
    expect(box.checked).toBe(true);
  });
});

describe('<st-clear-data>', () => {
  it('clears every st. key and every store after the confirm, and says so', async () => {
    localStorage.setItem('other.app', 'keep');
    theme.set('dark');
    lang.set('af');
    setChecked('a:1', true);
    shortcuts.set(false);
    mount(SETTINGS);
    expect(document.querySelector('st-clear-data')).toBeInstanceOf(StClearData);
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    const button = document.querySelector<HTMLButtonElement>('[data-clear-data]');
    button?.click();
    expect(dialog.open).toBe(true);
    dialog.close('confirm');
    await Promise.resolve();
    expect(storage.keys().filter((key) => key.startsWith('st.'))).toEqual([]);
    expect(localStorage.getItem('other.app')).toBe('keep');
    expect(theme.get()).toBe('system');
    expect(lang.get()).toBeNull();
    expect(checks.get()).toEqual({});
    expect(switchFor('shortcuts').checked).toBe(true);
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      'All your data was removed from this device.',
    );
    expect(document.activeElement).toBe(button);
    localStorage.removeItem('other.app');
  });

  it('keeps everything when cancelled or closed with Escape', async () => {
    theme.set('dark');
    mount(SETTINGS);
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    document.querySelector<HTMLButtonElement>('[data-clear-data]')?.click();
    dialog.close('cancel');
    await Promise.resolve();
    document.querySelector<HTMLButtonElement>('[data-clear-data]')?.click();
    dialog.close();
    await Promise.resolve();
    expect(theme.get()).toBe('dark');
  });

  it('stops listening when it disconnects', () => {
    mount(SETTINGS);
    const element = document.querySelector('st-clear-data');
    const button = element?.querySelector<HTMLButtonElement>('[data-clear-data]');
    element?.remove();
    button?.click();
    expect(element?.querySelector('dialog')?.open).toBe(false);
  });
});

describe('<st-storage-notice>', () => {
  it('stays hidden while storage works', () => {
    mount('<st-storage-notice hidden><p>Not saved</p></st-storage-notice>');
    const notice = document.querySelector('st-storage-notice') as StStorageNotice;
    expect(notice).toBeInstanceOf(StStorageNotice);
    expect(notice.hidden).toBe(true);
    notice.remove();
  });

  it('shows once a write fails, and still lets the setting work for the page view', () => {
    mount('<st-storage-notice hidden><p>Not saved</p></st-storage-notice>');
    mount('<st-storage-notice data-show="available" id="saved"><p>Saved</p></st-storage-notice>');
    expect((document.getElementById('saved') as HTMLElement).hidden).toBe(false);
    mount(SETTINGS);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    switchFor('lowData').click();
    expect(lowData.get()).toBe(true);
    expect((document.querySelector('st-storage-notice') as HTMLElement).hidden).toBe(false);
    // The "saved on this device" line goes, so it never contradicts the warning.
    expect((document.getElementById('saved') as HTMLElement).hidden).toBe(true);
  });
});
