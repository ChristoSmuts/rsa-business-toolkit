import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod/mini';
import { createStorageAdapter } from '../../../src/lib/storage/adapter';
import {
  clearAll,
  ensureMeta,
  hasStoredData,
  jsonCodec,
  META_KEY,
  migrate,
  MIGRATIONS,
  rawCodec,
  readMeta,
  readValue,
  SCHEMA_VERSION,
  writeMeta,
} from '../../../src/lib/storage/migrate';
import { fakeStorage } from './memory-storage';

const NOW = new Date('2026-10-02T08:00:00.000Z');
const now = (): Date => NOW;

function adapterWith(entries: Record<string, string> = {}) {
  const backing = fakeStorage(entries);
  return { backing, adapter: createStorageAdapter(() => backing) };
}

describe('the meta key', () => {
  it('is st.meta.v1 and the schema version is a positive integer', () => {
    expect(META_KEY).toBe('st.meta.v1');
    expect(Number.isInteger(SCHEMA_VERSION) && SCHEMA_VERSION >= 1).toBe(true);
  });

  it('has a migration for every version up to the current one', () => {
    for (let version = 1; version <= SCHEMA_VERSION; version++) {
      expect(typeof MIGRATIONS[version], `migration ${version}`).toBe('function');
    }
  });

  it('reads back what was written', () => {
    const { adapter } = adapterWith();
    writeMeta(adapter, { schema: 1, createdAt: NOW.toISOString() });
    expect(readMeta(adapter)).toEqual({ schema: 1, createdAt: NOW.toISOString() });
  });

  it.each([
    ['not JSON', '{'],
    ['an array', '[1]'],
    ['no schema', '{"createdAt":"x"}'],
    ['a fractional schema', '{"schema":1.5,"createdAt":"x"}'],
    ['a negative schema', '{"schema":-1,"createdAt":"x"}'],
    ['no createdAt', '{"schema":1}'],
  ])('treats %s as missing', (_label, raw) => {
    const { adapter } = adapterWith({ [META_KEY]: raw });
    expect(readMeta(adapter)).toBeUndefined();
  });

  it('ensureMeta writes it once and keeps the first createdAt', () => {
    const { adapter, backing } = adapterWith();
    ensureMeta(adapter, now);
    const first = backing.data.get(META_KEY);
    ensureMeta(adapter, () => new Date('2030-01-01T00:00:00.000Z'));
    expect(backing.data.get(META_KEY)).toBe(first);
    expect(JSON.parse(first ?? '')).toEqual({
      schema: SCHEMA_VERSION,
      createdAt: NOW.toISOString(),
    });
  });
});

describe('migrate', () => {
  it('writes nothing on a first visit', () => {
    const { adapter, backing } = adapterWith({ 'other.app': 'x' });
    expect(migrate(adapter, { now })).toEqual({ from: null, to: null, ran: [] });
    expect([...backing.data.keys()]).toEqual(['other.app']);
  });

  it('drops a corrupt meta key that has no data beside it', () => {
    const { adapter, backing } = adapterWith({ [META_KEY]: 'garbage' });
    migrate(adapter, { now });
    expect(backing.data.has(META_KEY)).toBe(false);
  });

  it('stamps data from before the meta key as version 0 and runs every migration', () => {
    const { adapter, backing } = adapterWith({ 'st.theme': 'dark' });
    const result = migrate(adapter, { now });
    expect(result.from).toBe(0);
    expect(result.to).toBe(SCHEMA_VERSION);
    expect(result.ran).toEqual(Array.from({ length: SCHEMA_VERSION }, (_, i) => i + 1));
    expect(readMeta(adapter)).toEqual({ schema: SCHEMA_VERSION, createdAt: NOW.toISOString() });
    // Version 1 keeps WP-20's bare-string theme as it is.
    expect(backing.data.get('st.theme')).toBe('dark');
  });

  it('runs forward migrations in order from the stored version, keeping createdAt', () => {
    const order: number[] = [];
    const migrations = {
      1: () => order.push(1),
      2: (storage: Parameters<(typeof MIGRATIONS)[1]>[0]) => {
        order.push(2);
        const old = storage.get('st.old');
        if (old !== null) {
          storage.set('st.new', old.toUpperCase());
          storage.remove('st.old');
        }
      },
      3: () => order.push(3),
    };
    const { adapter, backing } = adapterWith({
      [META_KEY]: JSON.stringify({ schema: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
      'st.old': 'value',
    });
    const result = migrate(adapter, { now, migrations, target: 3 });
    expect(order).toEqual([2, 3]);
    expect(result).toEqual({ from: 1, to: 3, ran: [2, 3] });
    expect(backing.data.get('st.new')).toBe('VALUE');
    expect(backing.data.has('st.old')).toBe(false);
    expect(readMeta(adapter)).toEqual({ schema: 3, createdAt: '2026-01-01T00:00:00.000Z' });
  });

  it('stops at a migration that throws and records the last one that completed', () => {
    const third = vi.fn();
    const migrations = {
      1: () => {},
      2: () => {
        throw new Error('broken');
      },
      3: third,
    };
    const { adapter } = adapterWith({ 'st.x': '1' });
    const result = migrate(adapter, { now, migrations, target: 3 });
    expect(result).toEqual({ from: 0, to: 1, ran: [1] });
    expect(third).not.toHaveBeenCalled();
    expect(readMeta(adapter)?.schema).toBe(1);
  });

  it('leaves data from a newer version of the site alone', () => {
    const meta = JSON.stringify({ schema: SCHEMA_VERSION + 5, createdAt: 'then' });
    const { adapter, backing } = adapterWith({ [META_KEY]: meta, 'st.x': '1' });
    const result = migrate(adapter, { now });
    expect(result).toEqual({ from: SCHEMA_VERSION + 5, to: SCHEMA_VERSION + 5, ran: [] });
    expect(backing.data.get(META_KEY)).toBe(meta);
  });

  it('is a no-op at the current version', () => {
    const meta = JSON.stringify({ schema: SCHEMA_VERSION, createdAt: 'then' });
    const { adapter, backing } = adapterWith({ [META_KEY]: meta });
    expect(migrate(adapter, { now }).ran).toEqual([]);
    expect(backing.data.get(META_KEY)).toBe(meta);
  });

  it('re-stamps a corrupt meta key when there is data', () => {
    const { adapter } = adapterWith({ [META_KEY]: '{', 'st.x': '1' });
    migrate(adapter, { now });
    expect(readMeta(adapter)?.schema).toBe(SCHEMA_VERSION);
  });

  it('re-stamps a missing meta key on data that is already at a newer target', () => {
    const { adapter } = adapterWith({ 'st.x': '1' });
    const result = migrate(adapter, { now, migrations: {}, target: 0 });
    expect(result).toEqual({ from: 0, to: 0, ran: [] });
    expect(readMeta(adapter)).toEqual({ schema: 0, createdAt: NOW.toISOString() });
  });

  it('uses the real clock by default', () => {
    const { adapter } = adapterWith({ 'st.x': '1' });
    migrate(adapter);
    expect(Number.isNaN(Date.parse(readMeta(adapter)?.createdAt ?? ''))).toBe(false);
  });
});

describe('readValue (the per-key reset)', () => {
  const schema = z.object({ count: z.number() });
  const fallback = { count: 0 };

  it('returns the default for a missing key', () => {
    const { adapter } = adapterWith();
    expect(readValue(adapter, 'st.k', schema, fallback)).toBe(fallback);
  });

  it('returns a valid stored value', () => {
    const { adapter } = adapterWith({ 'st.k': '{"count":3}' });
    expect(readValue(adapter, 'st.k', schema, fallback)).toEqual({ count: 3 });
  });

  it('removes a value that is not JSON, and only that key', () => {
    const { adapter, backing } = adapterWith({ 'st.k': '{not json', 'st.other': '{"count":1}' });
    expect(readValue(adapter, 'st.k', schema, fallback)).toBe(fallback);
    expect(backing.data.has('st.k')).toBe(false);
    expect(backing.data.get('st.other')).toBe('{"count":1}');
  });

  it('removes a value that fails its schema', () => {
    const { adapter, backing } = adapterWith({ 'st.k': '{"count":"three"}' });
    expect(readValue(adapter, 'st.k', schema, fallback)).toBe(fallback);
    expect(backing.data.has('st.k')).toBe(false);
  });

  it('reads bare strings through the raw codec', () => {
    const { adapter, backing } = adapterWith({ 'st.theme': 'dark', 'st.bad': 'purple' });
    const theme = z.enum(['system', 'light', 'dark']);
    expect(readValue(adapter, 'st.theme', theme, 'system', rawCodec)).toBe('dark');
    expect(readValue(adapter, 'st.bad', theme, 'system', rawCodec)).toBe('system');
    expect(backing.data.has('st.bad')).toBe(false);
  });

  it('encodes with the codecs', () => {
    expect(jsonCodec.encode({ a: 1 })).toBe('{"a":1}');
    expect(rawCodec.encode('dark')).toBe('dark');
    expect(rawCodec.decode('dark')).toBe('dark');
  });
});

describe('clearAll', () => {
  it('removes every st. key and nothing else', () => {
    const { adapter, backing } = adapterWith({
      'st.a': '1',
      'st.meta.v1': '{}',
      'st.template.invoice.v1': '{}',
      'other.app': 'keep',
      stx: 'keep',
    });
    expect(clearAll(adapter)).toEqual(['st.a', 'st.meta.v1', 'st.template.invoice.v1']);
    expect([...backing.data.keys()].sort()).toEqual(['other.app', 'stx']);
    expect(hasStoredData(adapter)).toBe(false);
  });

  it('clears memory too when storage is unavailable', () => {
    const adapter = createStorageAdapter(() => undefined);
    adapter.set('st.a', '1');
    adapter.set('keep', '1');
    clearAll(adapter);
    expect(adapter.keys()).toEqual(['keep']);
  });
});
