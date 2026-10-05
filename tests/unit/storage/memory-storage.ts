/**
 * A `localStorage` stand-in for node tests, with switches for the ways real storage fails.
 */
import type { KeyValueStorage } from '../../../src/lib/storage/adapter';

export interface FakeStorage extends KeyValueStorage {
  readonly data: Map<string, string>;
  /** Every call throws (storage disabled after start-up). */
  failAll: boolean;
  /** Writes throw (quota exceeded); reads still work. */
  failWrites: boolean;
}

export function fakeStorage(entries: Record<string, string> = {}): FakeStorage {
  const data = new Map(Object.entries(entries));
  const storage: FakeStorage = {
    data,
    failAll: false,
    failWrites: false,
    get length() {
      if (storage.failAll) throw new Error('SecurityError');
      return data.size;
    },
    key(index) {
      if (storage.failAll) throw new Error('SecurityError');
      return [...data.keys()][index] ?? null;
    },
    getItem(key) {
      if (storage.failAll) throw new Error('SecurityError');
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      if (storage.failAll || storage.failWrites) throw new Error('QuotaExceededError');
      data.set(key, value);
    },
    removeItem(key) {
      if (storage.failAll) throw new Error('SecurityError');
      data.delete(key);
    },
  };
  return storage;
}
