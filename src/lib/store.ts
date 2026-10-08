/**
 * Everything the site remembers on the device, as small reactive stores (build plan C2).
 *
 * Nothing leaves the device. Every key starts with `st.`; `clearAll()` removes them all. A visit
 * that saves nothing writes nothing (not even `st.meta.v1`).
 *
 * ## The API other packages use
 *
 * ```ts
 * import * as z from 'zod/mini';
 * import { persistentValue, storageAvailable } from '../lib/store';
 *
 * // WP-31: one module-level store per key. Use `zod/mini` in client code: it is far smaller.
 * export const profile = persistentValue('st.profile.v1', profileSchema, null);
 * profile.get();                       // the value now (the default when unset or invalid)
 * const stop = profile.subscribe((p) => render(p)); // calls back now and on every change
 * profile.set(next);                   // validated by the type, stored as JSON, other tabs follow
 * profile.reset();                     // removes the key; the value goes back to the default
 * storageAvailable.get();              // false: show `storage.wizardUnavailable`
 * ```
 *
 * - `persistentValue(key, schema, fallback, { codec })` returns a `PersistentStore<T>`, a
 *   nanostores atom with `set` and `reset`. `schema` is anything with a Zod-style `safeParse`.
 *   A stored value that is not valid JSON or fails the schema is removed and `fallback` is used
 *   (the per-key reset, `storage/migrate.ts`). Setting `null` removes the key.
 * - Call it once per key, at module level. A second call with the same key and the same schema
 *   returns the same store; with a different schema it throws, because two owners of one key
 *   would overwrite each other's shape.
 * - Values written in another tab arrive through the `storage` event and update the store, so a
 *   subscriber needs no code of its own for that.
 * - `storageAvailable` is `false` when `localStorage` is blocked or a write failed. The stores keep
 *   working in memory for the rest of the page view.
 *
 * ## Keys this module owns
 *
 * | Store           | Key               | Value                                       |
 * | --------------- | ----------------- | ------------------------------------------- |
 * | `checks`        | `st.checks.v1`    | `{ [key]: ISO date-time it was ticked }`    |
 * | `theme`         | `st.theme`        | `system`, `light` or `dark` (bare string)   |
 * | `lang`          | `st.lang`         | an enabled locale code (bare string)        |
 * | `promptsCopied` | `st.prompts.v1`   | `{ [promptId]: ISO date-time last copied }` |
 * | `shortcuts`     | `st.shortcuts`    | `true` / `false`, default `true`            |
 * | `lowData`       | `st.lowData`      | `true` / `false`, default `false`           |
 * | `seenVersion`   | `st.seenVersion`  | the content version last seen (bare string) |
 * | (meta)          | `st.meta.v1`      | `{ schema, createdAt }`                     |
 *
 * `checks` keys are a checkbox's `data-task` (`sameAs ?? id`). When this module loads it moves any
 * tick saved under a key that has since changed (`src/data/task-keys.json`, `renameChecks`), so
 * every reader of `checks` (a checklist, WP-31's My path) sees current keys without doing anything.
 *
 * `st.theme` and `st.lowData` are also read by the blocking `src/scripts/theme-init.js`, before any
 * module loads; that file is the one documented exception to "only the store reads storage".
 */
import { atom, type ReadableAtom, type WritableAtom } from 'nanostores';
import * as z from 'zod/mini';
import taskKeys from '../data/task-keys.json';
import { isEnabledLocale, type Locale } from '../i18n/locales';
import { browserStorage, createStorageAdapter, type StorageAdapter } from './storage/adapter';
import {
  clearAll as clearStoredKeys,
  ensureMeta,
  jsonCodec,
  migrate,
  rawCodec,
  readValue,
  type Codec,
  type Schema,
} from './storage/migrate';

export type { Schema, Codec } from './storage/migrate';

export interface PersistentStore<T> extends WritableAtom<T> {
  readonly key: string;
  /** Stores the value and notifies subscribers. `null` removes the key instead. */
  set(value: T): void;
  /** Removes the key; the value goes back to the default. */
  reset(): void;
}

interface Entry {
  readonly schema: Schema<unknown>;
  readonly store: PersistentStore<unknown>;
  /** Reads the key again (another tab changed it, or it was cleared). */
  readonly refresh: () => void;
  /** Back to the default without touching storage (the key is already gone). */
  readonly drop: () => void;
}

/** The adapter every store writes through. Exported for tests and for the storage notice. */
export const storage: StorageAdapter = createStorageAdapter(browserStorage);

/** `false` once values can only be kept in memory for this page view. */
export const storageAvailable: ReadableAtom<boolean> = storage.available;

migrate(storage);

const registry = new Map<string, Entry>();

export interface PersistentOptions {
  /** How the value is stored. Defaults to JSON. */
  readonly codec?: Codec | undefined;
}

/** A typed value kept under one `st.` key. See the module comment. */
export function persistentValue<T>(
  key: string,
  schema: Schema<T>,
  fallback: T,
  options: PersistentOptions = {},
): PersistentStore<T> {
  if (!key.startsWith('st.')) throw new Error(`Storage keys start with "st.": ${key}`);
  const existing = registry.get(key);
  if (existing) {
    if (existing.schema !== schema) throw new Error(`${key} already has a store.`);
    return existing.store as PersistentStore<T>;
  }
  const codec = options.codec ?? jsonCodec;
  const read = (): T => readValue(storage, key, schema, fallback, codec);
  const value = atom<T>(read());
  const notify = value.set.bind(value);
  const store = value as PersistentStore<T>;
  Object.assign(store, {
    key,
    set(next: T): void {
      if (next === null || next === undefined) {
        store.reset();
        return;
      }
      ensureMeta(storage);
      storage.set(key, codec.encode(next));
      notify(next);
    },
    reset(): void {
      storage.remove(key);
      notify(fallback);
    },
  });
  registry.set(key, {
    schema: schema as Schema<unknown>,
    store: store as PersistentStore<unknown>,
    refresh: () => notify(read()),
    drop: () => notify(fallback),
  });
  return store;
}

/** Removes every `st.` key on the device and puts every store back to its default. */
export function clearAll(): string[] {
  const removed = clearStoredKeys(storage);
  for (const entry of registry.values()) entry.drop();
  return removed;
}

/**
 * Another tab wrote, removed or cleared a key. Only meaningful while values come from the device:
 * in memory there is nothing another tab could have changed.
 */
export function handleStorageEvent(key: string | null): void {
  if (!storage.isBacked()) return;
  if (key === null) {
    for (const entry of registry.values()) entry.refresh();
    return;
  }
  registry.get(key)?.refresh();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => handleStorageEvent(event.key));
  // A page restored from the back/forward cache missed the events sent while it was frozen.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) handleStorageEvent(null);
  });
}

/* ---------- The stores this package owns ---------- */

const isoDateTime = z.iso.datetime({ offset: true });

/**
 * A map of independent entries (`{ [taskId]: date }`): an entry that fails `value` is dropped and
 * the rest are kept. A plain record schema would fail the whole map on one bad entry, and the
 * per-key reset would then remove every tick (review WP-30 pass 1). Anything that is not an object
 * is still a corrupt key, reset as a whole.
 */
export function entriesOf<V>(value: Schema<V>): Schema<Readonly<Record<string, V>>> {
  return {
    safeParse(data) {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return { success: false };
      }
      const kept: Record<string, V> = {};
      for (const [key, entry] of Object.entries(data)) {
        const result = value.safeParse(entry);
        if (result.success) kept[key] = result.data;
      }
      return { success: true, data: kept };
    },
  };
}

/** `{ [taskId]: ISO date-time }`. */
export type Checks = Readonly<Record<string, string>>;
const checksSchema: Schema<Checks> = entriesOf(isoDateTime);
export const checks = persistentValue<Checks>('st.checks.v1', checksSchema, {});

/** Ticks or unticks one task. */
export function setChecked(taskId: string, done: boolean, now: Date = new Date()): void {
  const current = checks.get();
  if (done === taskId in current) return;
  const next: Record<string, string> = { ...current };
  if (done) next[taskId] = now.toISOString();
  else delete next[taskId];
  checks.set(next);
}

/**
 * Moves saved ticks whose key changed (`src/data/task-keys.json`: a reworded task's old id, or a
 * task that was linked to a master task after it was ticked) to the key used now. A tick already
 * saved under the new key wins. Returns how many were moved; writes only when one was.
 */
export function renameChecks(renames: Readonly<Record<string, string>>): number {
  const next: Record<string, string> = { ...checks.get() };
  let moved = 0;
  for (const [from, to] of Object.entries(renames)) {
    const when = next[from];
    if (when === undefined) continue;
    if (!(to in next)) next[to] = when;
    delete next[from];
    moved++;
  }
  if (moved > 0) checks.set(next);
  return moved;
}

// Every reader of `checks` gets the current keys: a tick saved under a key that has since changed
// (a reworded task, a task linked after it was ticked; `src/data/task-keys.json`) moves when the
// store loads, once per page. It writes only when a tick moved, so a first visit still writes
// nothing (review WP-30 pass 3).
renameChecks(taskKeys.renames);

/** How many of `ids` are ticked in `map`. */
export function countDone(map: Checks, ids: readonly string[]): number {
  let done = 0;
  for (const id of ids) if (id in map) done++;
  return done;
}

export type ThemeChoice = 'system' | 'light' | 'dark';
const themeSchema: Schema<ThemeChoice> = z.enum(['system', 'light', 'dark']);
/**
 * `system` is stored deliberately: it is the reader's explicit choice, and `theme-init.js`
 * treats it, a missing key and blocked storage alike, by leaving `data-theme` unset.
 */
export const theme = persistentValue<ThemeChoice>('st.theme', themeSchema, 'system', {
  codec: rawCodec,
});

const localeSchema: Schema<Locale> = {
  safeParse: (data) =>
    typeof data === 'string' && isEnabledLocale(data)
      ? { success: true, data }
      : { success: false },
};
/** The language the reader last chose in the switcher. Only offers a banner; never redirects. */
export const lang = persistentValue<Locale | null>('st.lang', localeSchema, null, {
  codec: rawCodec,
});

/** `{ [promptId]: ISO date-time last copied }`. */
export type PromptsCopied = Readonly<Record<string, string>>;
const promptsSchema: Schema<PromptsCopied> = entriesOf(isoDateTime);
export const promptsCopied = persistentValue<PromptsCopied>('st.prompts.v1', promptsSchema, {});

export function markPromptCopied(promptId: string, now: Date = new Date()): void {
  promptsCopied.set({ ...promptsCopied.get(), [promptId]: now.toISOString() });
}

const booleanSchema: Schema<boolean> = z.boolean();
/** Single-key shortcuts (`?`, and WP-33's `/`). On by default. */
export const shortcuts = persistentValue<boolean>('st.shortcuts', booleanSchema, true);
/** Low data: system fonts instead of web fonts (`<html data-low-data>`). */
export const lowData = persistentValue<boolean>('st.lowData', booleanSchema, false);

const versionSchema: Schema<string> = z.string().check(z.minLength(1));
/** The content version the reader last saw, for the "what has changed" notice. */
export const seenVersion = persistentValue<string | null>('st.seenVersion', versionSchema, null, {
  codec: rawCodec,
});

/**
 * Whether single-key shortcuts may fire. WP-33 checks this before handling `/` (Ctrl+K is not a
 * single key, so it ignores the setting), and `isTypingTarget()` from `src/lib/shortcuts.ts` before
 * handling any key.
 */
export function shortcutsEnabled(): boolean {
  return shortcuts.get();
}
