/**
 * A key-value storage that never throws.
 *
 * `localStorage` can fail in three ways: reading `window.localStorage` itself throws (storage
 * disabled, some private modes), a write throws (quota full), or every call throws. The adapter
 * turns all three into one state: **unavailable**. From the first failure on it keeps working in
 * memory for the rest of the page view, so a tick or a setting still applies until the page
 * closes, and `available` tells the UI to show `storage.unavailable` (or a narrower notice).
 *
 * When a write fails, the adapter first copies what the backing storage still holds into memory,
 * so a quota error does not make earlier values disappear for the rest of the session.
 *
 * This is the only module, with `store.ts`, that touches `localStorage` (ESLint enforces it).
 */
import { atom, type ReadableAtom } from 'nanostores';

/** The part of the Web Storage API the adapter uses. `localStorage` satisfies it. */
export interface KeyValueStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageAdapter {
  /** The stored string, or `null` when the key is not set. */
  get(key: string): string | null;
  /** Stores a value. Returns `false` when it could only be kept in memory. */
  set(key: string, value: string): boolean;
  remove(key: string): void;
  /** Every key currently stored, in no particular order. */
  keys(): string[];
  /** `true` while values reach the device's storage; `false` once they live only in memory. */
  readonly available: ReadableAtom<boolean>;
  /**
   * `true` when values come from the device's storage, so another tab's `storage` events
   * describe them. Same value as `available`, as a plain getter for hot paths.
   */
  isBacked(): boolean;
}

/** Written and removed once at start-up to find out whether writes work at all. */
export const PROBE_KEY = 'st.probe';

/**
 * Builds an adapter over the storage `resolve` returns. `resolve` is called once, inside a
 * `try`, because merely reading `window.localStorage` throws when storage is disabled.
 */
export function createStorageAdapter(
  resolve: () => KeyValueStorage | null | undefined,
): StorageAdapter {
  const memory = new Map<string, string>();
  const available = atom(false);
  let backing: KeyValueStorage | undefined;

  try {
    const candidate = resolve() ?? undefined;
    if (candidate) {
      candidate.setItem(PROBE_KEY, '1');
      candidate.removeItem(PROBE_KEY);
      backing = candidate;
      available.set(true);
    }
  } catch {
    backing = undefined;
  }

  /** Moves to memory for the rest of the session, keeping whatever can still be read. */
  const fail = (): void => {
    const old = backing;
    backing = undefined;
    available.set(false);
    if (!old) return;
    try {
      for (let index = 0; index < old.length; index++) {
        const key = old.key(index);
        if (key === null || memory.has(key)) continue;
        const value = old.getItem(key);
        if (value !== null) memory.set(key, value);
      }
    } catch {
      // Nothing more can be read; memory holds what this session wrote.
    }
  };

  return {
    available,
    isBacked: () => backing !== undefined,
    get(key) {
      if (backing) {
        try {
          return backing.getItem(key);
        } catch {
          fail();
        }
      }
      return memory.get(key) ?? null;
    },
    set(key, value) {
      if (backing) {
        try {
          backing.setItem(key, value);
          return true;
        } catch {
          fail();
        }
      }
      memory.set(key, value);
      return false;
    },
    remove(key) {
      memory.delete(key);
      if (!backing) return;
      try {
        backing.removeItem(key);
      } catch {
        fail();
        memory.delete(key);
      }
    },
    keys() {
      if (backing) {
        try {
          const keys: string[] = [];
          for (let index = 0; index < backing.length; index++) {
            const key = backing.key(index);
            if (key !== null) keys.push(key);
          }
          return keys;
        } catch {
          fail();
        }
      }
      return [...memory.keys()];
    },
  };
}

/** The browser's `localStorage`, or `undefined` outside a browser. Reading it may throw. */
export function browserStorage(): KeyValueStorage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}
