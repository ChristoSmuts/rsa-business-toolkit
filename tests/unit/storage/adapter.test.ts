import { describe, expect, it } from 'vitest';
import { browserStorage, createStorageAdapter, PROBE_KEY } from '../../../src/lib/storage/adapter';
import { fakeStorage } from './memory-storage';

describe('createStorageAdapter with working storage', () => {
  it('reads, writes, removes and lists keys on the device', () => {
    const backing = fakeStorage({ 'st.a': '1', other: 'x' });
    const adapter = createStorageAdapter(() => backing);
    expect(adapter.available.get()).toBe(true);
    expect(adapter.isBacked()).toBe(true);
    expect(adapter.get('st.a')).toBe('1');
    expect(adapter.get('st.missing')).toBeNull();
    expect(adapter.set('st.b', '2')).toBe(true);
    expect(backing.data.get('st.b')).toBe('2');
    adapter.remove('st.a');
    expect(backing.data.has('st.a')).toBe(false);
    expect(adapter.keys().sort()).toEqual(['other', 'st.b']);
  });

  it('leaves no probe key behind', () => {
    const backing = fakeStorage();
    createStorageAdapter(() => backing);
    expect(backing.data.has(PROBE_KEY)).toBe(false);
  });
});

describe('createStorageAdapter when storage fails', () => {
  it('works in memory when reading localStorage itself throws', () => {
    const adapter = createStorageAdapter(() => {
      throw new Error('SecurityError: access is denied');
    });
    expect(adapter.available.get()).toBe(false);
    expect(adapter.isBacked()).toBe(false);
    expect(adapter.set('st.a', '1')).toBe(false);
    expect(adapter.get('st.a')).toBe('1');
    expect(adapter.keys()).toEqual(['st.a']);
    adapter.remove('st.a');
    expect(adapter.get('st.a')).toBeNull();
  });

  it('works in memory when there is no storage at all (outside a browser)', () => {
    const adapter = createStorageAdapter(() => undefined);
    expect(adapter.available.get()).toBe(false);
    adapter.set('st.a', '1');
    expect(adapter.get('st.a')).toBe('1');
  });

  it('works in memory when the probe write fails (private mode with no quota)', () => {
    const backing = fakeStorage();
    backing.failWrites = true;
    const adapter = createStorageAdapter(() => backing);
    expect(adapter.available.get()).toBe(false);
    adapter.set('st.a', '1');
    expect(adapter.get('st.a')).toBe('1');
    expect(backing.data.size).toBe(0);
  });

  it('keeps earlier values when a later write fails (quota full)', () => {
    const backing = fakeStorage({ 'st.old': 'kept' });
    const adapter = createStorageAdapter(() => backing);
    backing.failWrites = true;
    expect(adapter.set('st.new', 'memory')).toBe(false);
    expect(adapter.available.get()).toBe(false);
    expect(adapter.get('st.old')).toBe('kept');
    expect(adapter.get('st.new')).toBe('memory');
    expect(adapter.keys().sort()).toEqual(['st.new', 'st.old']);
  });

  it('falls back to memory when a read throws mid-session', () => {
    const backing = fakeStorage({ 'st.a': '1' });
    const adapter = createStorageAdapter(() => backing);
    backing.failAll = true;
    expect(adapter.get('st.a')).toBeNull();
    expect(adapter.available.get()).toBe(false);
    adapter.set('st.a', '2');
    expect(adapter.get('st.a')).toBe('2');
  });

  it('falls back to memory when listing or removing throws', () => {
    const backing = fakeStorage({ 'st.a': '1' });
    const adapter = createStorageAdapter(() => backing);
    backing.failAll = true;
    expect(adapter.keys()).toEqual([]);
    expect(adapter.available.get()).toBe(false);

    const second = fakeStorage({ 'st.b': '1' });
    const other = createStorageAdapter(() => second);
    second.failAll = true;
    other.remove('st.b');
    expect(other.get('st.b')).toBeNull();
    expect(other.available.get()).toBe(false);
  });

  it('copies what is still readable when only writes fail, and a later remove is honoured', () => {
    const backing = fakeStorage({ 'st.a': '1', 'st.b': '2' });
    const adapter = createStorageAdapter(() => backing);
    backing.failWrites = true;
    adapter.set('st.c', '3');
    adapter.remove('st.a');
    expect(adapter.get('st.a')).toBeNull();
    expect(adapter.get('st.b')).toBe('2');
  });
});

describe('createStorageAdapter with an odd storage', () => {
  it('skips a key slot that reads null, and a key whose value vanished, when it falls back', () => {
    const backing = fakeStorage({ 'st.a': '1', 'st.gone': 'x', 'st.b': '2' });
    const odd = {
      ...backing,
      get length() {
        return backing.data.size + 1;
      },
      key: (index: number) => backing.key(index),
      getItem: (key: string) => (key === 'st.gone' ? null : backing.getItem(key)),
      setItem: (key: string, value: string) => backing.setItem(key, value),
      removeItem: (key: string) => backing.removeItem(key),
    };
    const adapter = createStorageAdapter(() => odd);
    expect(adapter.keys().sort()).toEqual(['st.a', 'st.b', 'st.gone']);
    backing.failWrites = true;
    adapter.set('st.c', '3');
    expect(adapter.keys().sort()).toEqual(['st.a', 'st.b', 'st.c']);
  });
});

describe('browserStorage', () => {
  it('is undefined outside a browser', () => {
    expect(browserStorage()).toBeUndefined();
  });
});
