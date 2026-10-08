/**
 * Versioning, validation and clearing of everything the site stores on the device.
 *
 * - Every key starts with `st.` (CLAUDE.md). `clearAll()` removes those keys and nothing else, so
 *   another app on the same origin (GitHub Pages serves every project of an owner from one origin)
 *   keeps its data.
 * - `st.meta.v1` holds `{ schema, createdAt }`. `schema` is the `SCHEMA_VERSION` the stored data
 *   was last migrated to. It is written the first time the site stores anything, not on a visit
 *   that saves nothing.
 * - `migrate()` runs the forward migrations from the stored version up to `SCHEMA_VERSION`, in
 *   order, then stamps the meta key. Data written by a newer version of the site (a stored schema
 *   above ours) is left alone: each key is still validated when it is read, so a value this
 *   version cannot understand is reset on its own instead of all data being thrown away.
 * - `readValue()` is the per-key reset: a value that is not valid JSON (or not decodable) or that
 *   fails its schema is removed and the default is used. One corrupt key never costs the others.
 */
import type { StorageAdapter } from './adapter';

export const ST_PREFIX = 'st.';
export const META_KEY = 'st.meta.v1';

/**
 * The version of the stored data's shape. Raise it when a stored shape changes, and add a
 * migration under the new number to `MIGRATIONS`.
 */
export const SCHEMA_VERSION = 1;

/** The stored meta record. */
export interface Meta {
  readonly schema: number;
  /** ISO date-time of the first write. */
  readonly createdAt: string;
}

/**
 * Anything with a Zod-style `safeParse`. Both `zod` and `zod/mini` schemas fit, so a caller is free
 * to use either (client code should prefer `zod/mini`, which is much smaller).
 */
export interface Schema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

/** How a value is turned into the stored string and back. */
export interface Codec {
  encode(value: unknown): string;
  /** May throw; a throw counts as a corrupt value. */
  decode(raw: string): unknown;
}

/** JSON, the default. */
export const jsonCodec: Codec = {
  encode: (value) => JSON.stringify(value),
  decode: (raw) => JSON.parse(raw) as unknown,
};

/**
 * The string as it is. For keys that something without a JSON parser reads: `st.theme` is read
 * by the blocking `theme-init.js` before any module loads, and `st.lang` follows it.
 */
export const rawCodec: Codec = {
  encode: (value) => String(value),
  decode: (raw) => raw,
};

/** One forward migration: changes the stored data from the previous version to this one. */
export type Migration = (storage: StorageAdapter) => void;

/**
 * `MIGRATIONS[n]` moves stored data from version `n - 1` to `n`. Version 0 is data from before
 * the meta key existed (WP-20 wrote `st.theme` as a bare string, which version 1 keeps), so
 * migration 1 has nothing to change.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: () => {},
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The stored meta, or `undefined` when it is missing or unreadable. */
export function readMeta(storage: StorageAdapter): Meta | undefined {
  const raw = storage.get(META_KEY);
  if (raw === null) return undefined;
  try {
    const value = JSON.parse(raw) as unknown;
    if (
      isRecord(value) &&
      typeof value['schema'] === 'number' &&
      Number.isInteger(value['schema']) &&
      value['schema'] >= 0 &&
      typeof value['createdAt'] === 'string'
    ) {
      return { schema: value['schema'], createdAt: value['createdAt'] };
    }
  } catch {
    // Corrupt: treated as missing.
  }
  return undefined;
}

export function writeMeta(storage: StorageAdapter, meta: Meta): void {
  storage.set(META_KEY, JSON.stringify(meta));
}

/** `true` when any `st.` key other than the meta key is stored. */
export function hasStoredData(storage: StorageAdapter): boolean {
  return storage.keys().some((key) => key.startsWith(ST_PREFIX) && key !== META_KEY);
}

export interface MigrateOptions {
  /** Used for `createdAt` when the meta key is written for the first time. */
  readonly now?: () => Date;
  readonly migrations?: Readonly<Record<number, Migration>>;
  readonly target?: number;
}

export interface MigrateResult {
  /** The version found (0 for data without a meta key), or `null` when nothing was stored. */
  readonly from: number | null;
  /** The version the data is at now (`from` again when the stored data is newer). */
  readonly to: number | null;
  /** The migrations that ran, in order. */
  readonly ran: readonly number[];
}

/**
 * Brings stored data up to `target`. Does nothing when nothing is stored, so a first visit leaves
 * no trace. A migration that throws stops the run; the meta stays at the last version that
 * completed, and the next page load tries again.
 */
export function migrate(storage: StorageAdapter, options: MigrateOptions = {}): MigrateResult {
  const { now = () => new Date(), migrations = MIGRATIONS, target = SCHEMA_VERSION } = options;
  const meta = readMeta(storage);
  if (!meta && !hasStoredData(storage)) {
    // A corrupt meta key with nothing beside it: drop it rather than keep a broken record.
    if (storage.get(META_KEY) !== null) storage.remove(META_KEY);
    return { from: null, to: null, ran: [] };
  }
  const from = meta?.schema ?? 0;
  const createdAt = meta?.createdAt ?? now().toISOString();
  if (from >= target) {
    if (!meta) writeMeta(storage, { schema: from, createdAt });
    return { from, to: from, ran: [] };
  }
  const ran: number[] = [];
  let version = from;
  for (let next = from + 1; next <= target; next++) {
    const step = migrations[next];
    try {
      step?.(storage);
    } catch {
      break;
    }
    version = next;
    ran.push(next);
  }
  writeMeta(storage, { schema: version, createdAt });
  return { from, to: version, ran };
}

/**
 * Writes the meta key when it is missing, so the first stored value carries a version. Called by
 * the store before every write; cheap after the first time.
 */
export function ensureMeta(storage: StorageAdapter, now: () => Date = () => new Date()): void {
  if (readMeta(storage)) return;
  writeMeta(storage, { schema: SCHEMA_VERSION, createdAt: now().toISOString() });
}

/**
 * Reads one key through its codec and schema. A missing key gives `fallback`; a corrupt or
 * invalid one is **removed** and gives `fallback` (the per-key reset).
 */
export function readValue<T>(
  storage: StorageAdapter,
  key: string,
  schema: Schema<T>,
  fallback: T,
  codec: Codec = jsonCodec,
): T {
  const raw = storage.get(key);
  if (raw === null) return fallback;
  let decoded: unknown;
  try {
    decoded = codec.decode(raw);
  } catch {
    storage.remove(key);
    return fallback;
  }
  const result = schema.safeParse(decoded);
  if (result.success) return result.data;
  storage.remove(key);
  return fallback;
}

/** Removes every `st.` key, and nothing else. Returns the keys it removed, sorted. */
export function clearAll(storage: StorageAdapter): string[] {
  const keys = storage
    .keys()
    .filter((key) => key.startsWith(ST_PREFIX))
    .sort();
  for (const key of keys) storage.remove(key);
  return keys;
}
