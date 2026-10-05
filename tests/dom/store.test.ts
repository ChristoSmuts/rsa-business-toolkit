import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';

type Store = typeof import('../../src/lib/store');

/** A fresh copy of the store module over the current `localStorage`. */
async function loadStore(): Promise<Store> {
  vi.resetModules();
  return import('../../src/lib/store');
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('the store over working localStorage', () => {
  it('writes nothing on load, not even the meta key', async () => {
    const store = await loadStore();
    expect(store.storageAvailable.get()).toBe(true);
    expect(store.checks.get()).toEqual({});
    expect(store.theme.get()).toBe('system');
    expect(store.lang.get()).toBeNull();
    expect(store.shortcuts.get()).toBe(true);
    expect(store.lowData.get()).toBe(false);
    expect(store.seenVersion.get()).toBeNull();
    expect(store.promptsCopied.get()).toEqual({});
    expect(localStorage.length).toBe(0);
  });

  it('stamps st.meta.v1 on the first write', async () => {
    const store = await loadStore();
    store.shortcuts.set(false);
    expect(localStorage.getItem('st.shortcuts')).toBe('false');
    const meta = JSON.parse(localStorage.getItem('st.meta.v1') ?? '{}') as Record<string, unknown>;
    expect(meta['schema']).toBe(1);
    expect(typeof meta['createdAt']).toBe('string');
  });

  it('stores theme and language as bare strings, the way theme-init reads them', async () => {
    const store = await loadStore();
    store.theme.set('dark');
    store.lang.set('af');
    store.seenVersion.set('2026-09-14');
    expect(localStorage.getItem('st.theme')).toBe('dark');
    expect(localStorage.getItem('st.lang')).toBe('af');
    expect(localStorage.getItem('st.seenVersion')).toBe('2026-09-14');
    store.lowData.set(true);
    expect(localStorage.getItem('st.lowData')).toBe('true');
  });

  it('reads what an earlier page view stored', async () => {
    localStorage.setItem('st.theme', 'light');
    localStorage.setItem('st.lang', 'af');
    localStorage.setItem('st.checks.v1', JSON.stringify({ 'a:1': '2026-10-01T10:00:00.000Z' }));
    const store = await loadStore();
    expect(store.theme.get()).toBe('light');
    expect(store.lang.get()).toBe('af');
    expect(store.checks.get()).toEqual({ 'a:1': '2026-10-01T10:00:00.000Z' });
    // Data from before the meta key is stamped by the migration.
    expect(localStorage.getItem('st.meta.v1')).not.toBeNull();
  });

  it('resets a corrupt key on its own and keeps the others', async () => {
    localStorage.setItem('st.checks.v1', '{"a:1": 12');
    localStorage.setItem('st.prompts.v1', JSON.stringify(['not', 'a', 'map']));
    localStorage.setItem('st.lang', 'xx');
    localStorage.setItem('st.theme', 'dark');
    const store = await loadStore();
    expect(store.checks.get()).toEqual({});
    expect(store.promptsCopied.get()).toEqual({});
    expect(store.lang.get()).toBeNull();
    expect(store.theme.get()).toBe('dark');
    expect(localStorage.getItem('st.checks.v1')).toBeNull();
    expect(localStorage.getItem('st.prompts.v1')).toBeNull();
    expect(localStorage.getItem('st.lang')).toBeNull();
  });

  it('drops one bad tick and keeps every good one', async () => {
    const good = '2026-10-01T10:00:00.000Z';
    localStorage.setItem(
      'st.checks.v1',
      JSON.stringify({ 'a:1': good, 'a:2': 'yesterday', 'a:3': good, 'a:4': 7 }),
    );
    localStorage.setItem('st.prompts.v1', JSON.stringify({ p1: good, p2: null }));
    const store = await loadStore();
    expect(store.checks.get()).toEqual({ 'a:1': good, 'a:3': good });
    expect(store.promptsCopied.get()).toEqual({ p1: good });
    // The next write stores the cleaned map.
    store.setChecked('a:5', true, new Date(good));
    expect(Object.keys(JSON.parse(localStorage.getItem('st.checks.v1') ?? '{}'))).toEqual([
      'a:1',
      'a:3',
      'a:5',
    ]);
  });

  it('setting null removes the key; reset returns to the default', async () => {
    const store = await loadStore();
    store.lang.set('af');
    store.lang.set(null);
    expect(localStorage.getItem('st.lang')).toBeNull();
    expect(store.lang.get()).toBeNull();
    store.theme.set('dark');
    store.theme.reset();
    expect(localStorage.getItem('st.theme')).toBeNull();
    expect(store.theme.get()).toBe('system');
  });

  it('ticks and unticks tasks with the time they were ticked', async () => {
    const store = await loadStore();
    const when = new Date('2026-10-02T09:30:00.000Z');
    store.setChecked('core/register:1', true, when);
    store.setChecked('core/register:2', true, when);
    store.setChecked('core/register:1', true);
    expect(store.checks.get()).toEqual({
      'core/register:1': when.toISOString(),
      'core/register:2': when.toISOString(),
    });
    store.setChecked('core/register:1', false);
    store.setChecked('core/register:9', false);
    expect(Object.keys(store.checks.get())).toEqual(['core/register:2']);
    expect(store.countDone(store.checks.get(), ['core/register:1', 'core/register:2'])).toBe(1);
    expect(JSON.parse(localStorage.getItem('st.checks.v1') ?? '{}')).toEqual(store.checks.get());
  });

  it('moves ticks whose key changed, and keeps a tick already under the new key', async () => {
    const store = await loadStore();
    const a = new Date('2026-10-01T10:00:00.000Z');
    const b = new Date('2026-10-02T10:00:00.000Z');
    store.setChecked('old:1', true, a);
    store.setChecked('old:2', true, a);
    store.setChecked('new:2', true, b);
    store.setChecked('other:3', true, a);
    const moved = store.renameChecks({ 'old:1': 'new:1', 'old:2': 'new:2', 'gone:9': 'new:9' });
    expect(moved).toBe(2);
    expect(store.checks.get()).toEqual({
      'new:1': a.toISOString(),
      'new:2': b.toISOString(),
      'other:3': a.toISOString(),
    });
    const before = localStorage.getItem('st.checks.v1');
    expect(store.renameChecks({ 'old:1': 'new:1' })).toBe(0);
    expect(localStorage.getItem('st.checks.v1')).toBe(before);
  });

  it('records copied prompts', async () => {
    const store = await loadStore();
    store.markPromptCopied('branding/x#b1', new Date('2026-10-02T09:30:00.000Z'));
    expect(store.promptsCopied.get()).toEqual({ 'branding/x#b1': '2026-10-02T09:30:00.000Z' });
  });

  it('tells search whether single-key shortcuts are on', async () => {
    const store = await loadStore();
    expect(store.shortcutsEnabled()).toBe(true);
    store.shortcuts.set(false);
    expect(store.shortcutsEnabled()).toBe(false);
  });

  it('notifies subscribers', async () => {
    const store = await loadStore();
    const seen: string[] = [];
    const stop = store.theme.subscribe((value) => seen.push(value));
    store.theme.set('dark');
    store.theme.set('light');
    stop();
    store.theme.set('system');
    expect(seen).toEqual(['system', 'dark', 'light']);
  });
});

describe('persistentValue', () => {
  it('gives WP-31 and WP-32 a typed JSON value with its own default', async () => {
    const store = await loadStore();
    const schema = z.object({ entity: z.enum(['sole', 'pty']) });
    const profile = store.persistentValue<{ entity: 'sole' | 'pty' } | null>(
      'st.profile.v1',
      schema,
      null,
    );
    expect(profile.key).toBe('st.profile.v1');
    expect(profile.get()).toBeNull();
    profile.set({ entity: 'pty' });
    expect(localStorage.getItem('st.profile.v1')).toBe('{"entity":"pty"}');
    expect(store.persistentValue('st.profile.v1', schema, null)).toBe(profile);
  });

  it('refuses a key outside st. and a second owner with another schema', async () => {
    const store = await loadStore();
    expect(() => store.persistentValue('profile', z.string(), '')).toThrow(/st\./);
    store.persistentValue('st.template.invoice.v1', z.string(), '');
    expect(() => store.persistentValue('st.template.invoice.v1', z.number(), 0)).toThrow(/already/);
  });
});

describe('clearAll', () => {
  it('removes every st. key, keeps other keys and puts every store back', async () => {
    const store = await loadStore();
    localStorage.setItem('someone.else', 'keep');
    store.theme.set('dark');
    store.setChecked('a:1', true);
    store.shortcuts.set(false);
    store.lowData.set(true);
    store.lang.set('af');
    const draft = store.persistentValue('st.template.receipt.v1', z.string(), 'empty');
    draft.set('typed');
    const removed = store.clearAll();
    expect(removed).toContain('st.meta.v1');
    expect(removed).toContain('st.template.receipt.v1');
    const left = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    expect(left).toEqual(['someone.else']);
    expect(store.theme.get()).toBe('system');
    expect(store.checks.get()).toEqual({});
    expect(store.shortcuts.get()).toBe(true);
    expect(store.lowData.get()).toBe(false);
    expect(store.lang.get()).toBeNull();
    expect(draft.get()).toBe('empty');
  });
});

describe('another tab', () => {
  it('follows a key another tab wrote or removed', async () => {
    const store = await loadStore();
    localStorage.setItem('st.theme', 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: 'st.theme', newValue: 'dark' }));
    expect(store.theme.get()).toBe('dark');
    localStorage.removeItem('st.theme');
    window.dispatchEvent(new StorageEvent('storage', { key: 'st.theme', newValue: null }));
    expect(store.theme.get()).toBe('system');
  });

  it('re-reads everything when another tab cleared storage', async () => {
    const store = await loadStore();
    store.setChecked('a:1', true);
    store.lowData.set(true);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(store.checks.get()).toEqual({});
    expect(store.lowData.get()).toBe(false);
  });

  it('ignores keys it does not own', async () => {
    const store = await loadStore();
    expect(() => store.handleStorageEvent('someone.else')).not.toThrow();
  });

  it('re-reads everything when the page comes back from the back/forward cache', async () => {
    const store = await loadStore();
    localStorage.setItem('st.lowData', 'true');
    const event = new Event('pageshow') as Event & { persisted: boolean };
    Object.defineProperty(event, 'persisted', { value: true });
    window.dispatchEvent(event);
    expect(store.lowData.get()).toBe(true);
    const fresh = new Event('pageshow') as Event & { persisted: boolean };
    Object.defineProperty(fresh, 'persisted', { value: false });
    localStorage.setItem('st.lowData', 'false');
    window.dispatchEvent(fresh);
    expect(store.lowData.get()).toBe(true);
  });
});

describe('the store when localStorage throws', () => {
  it('keeps working in memory and says storage is unavailable', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError: the operation is insecure');
    });
    const store = await loadStore();
    expect(store.storageAvailable.get()).toBe(false);
    store.setChecked('a:1', true);
    expect(store.checks.get()).toHaveProperty('a:1');
    store.theme.set('dark');
    expect(store.theme.get()).toBe('dark');
    // Nothing another tab does can be seen, so storage events change nothing.
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(store.theme.get()).toBe('dark');
    expect(store.clearAll()).toContain('st.theme');
    expect(store.theme.get()).toBe('system');
  });

  it('turns unavailable when a write fails part-way through the session', async () => {
    const store = await loadStore();
    store.setChecked('a:1', true);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    store.setChecked('a:2', true);
    expect(store.storageAvailable.get()).toBe(false);
    expect(Object.keys(store.checks.get()).sort()).toEqual(['a:1', 'a:2']);
  });
});
