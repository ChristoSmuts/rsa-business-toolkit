/**
 * `src/lib/search-client.ts` and `src/lib/search/options.ts` on small hand-made indexes: loading,
 * the network contract, querying, filters, URLs under the base path, grouping and highlighting.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { serialiseIndex } from '../../../scripts/search/build';
import {
  createSearchClient,
  groupResults,
  highlight,
  loadIndex,
  markTerms,
  resultHref,
  runSearch,
  SearchIndexError,
  type FetchLike,
  type SearchResult,
} from '../../../src/lib/search-client';
import {
  foldTerm,
  fuzzy,
  INDEX_VERSION,
  KIND_WEIGHT,
  prefix,
  processTerm,
  tokenize,
} from '../../../src/lib/search/options';
import type { SearchEntry } from '../../../src/lib/search/types';

const BASE = '/business-toolkit/';

function entry(fields: Partial<SearchEntry> & Pick<SearchEntry, 'key' | 'title'>): SearchEntry {
  return {
    kind: 'section',
    doc: 'core/tax-and-sars',
    route: 'core/tax-and-sars/',
    docTitle: 'Tax and SARS',
    path: 'Core › Tax and SARS',
    text: '',
    section: 'core',
    weight: KIND_WEIGHT.section,
    ...fields,
  };
}

const ENTRIES: SearchEntry[] = [
  entry({
    key: 'core/tax-and-sars#belasting',
    anchor: 'belasting',
    title: 'Voorlopige belasting',
    text: 'Jy betaal voorlopige belasting twee keer per jaar by SARS.',
    excerpt: 'Jy betaal voorlopige belasting twee keer per jaar.',
  }),
  entry({
    key: 'core/register#popia',
    doc: 'core/register',
    route: 'core/register/',
    docTitle: 'Register',
    anchor: 'popia-register-your-information-officer',
    title: 'POPIA: register your information officer',
    text: 'Register with the Information Regulator.',
    entity: 'pty',
  }),
  entry({
    key: 'business-types/vehicle-dealer#saps',
    doc: 'business-types/vehicle-dealer',
    route: 'business-types/vehicle-dealer/',
    docTitle: 'Vehicle dealer',
    section: 'business-types',
    anchor: 'how-to-register',
    title: 'How to register',
    text: 'Fill in form SAPS 601 at your police station. Registration is free.',
    businessTypes: ['vehicle-dealer'],
  }),
  entry({
    key: 'lookup/glossary#pis',
    kind: 'glossary',
    doc: 'lookup/glossary',
    route: 'glossary/',
    docTitle: 'Glossary',
    section: 'lookup',
    anchor: 'pis',
    title: 'PIS',
    text: 'Public interest score.',
    weight: KIND_WEIGHT.glossary,
  }),
  entry({
    key: 'business-types/food~task',
    kind: 'task',
    doc: 'business-types/food',
    route: 'business-types/food/',
    docTitle: 'Food',
    section: 'business-types',
    title: 'Get a certificate of acceptability',
    indexTitle: '',
    text: 'Get a certificate of acceptability before you sell food.',
    businessTypes: ['food'],
    lang: 'en',
    weight: KIND_WEIGHT.task,
  }),
];

function index(lang: 'en' | 'af' = 'af', entries: SearchEntry[] = ENTRIES) {
  return loadIndex(
    JSON.parse(serialiseIndex(lang, ['core', 'business-types', 'lookup'], entries).json),
    lang,
  );
}

describe('options', () => {
  it('keeps form codes whole and joins a spaced code into an alias', () => {
    expect(tokenize('Form VAT264 and SAPS 601, CoR 14.3 and R120,000.')).toEqual([
      'Form',
      'VAT264',
      'and',
      'SAPS',
      'SAPS601',
      '601',
      'CoR',
      'CoR14.3',
      '14.3',
      'and',
      'R120,000',
    ]);
  });

  it('adds no alias to ordinary words followed by a number', () => {
    expect(tokenize('page 2 of Section 12')).toEqual(['page', '2', 'of', 'Section', '12']);
  });

  it('folds case and diacritics and drops stop words', () => {
    expect(foldTerm('Sê Ëlke Ôp')).toBe('se elke op');
    expect(processTerm('VAT264')).toBe('vat264');
    expect(processTerm('the')).toBeNull();
    expect(processTerm('die')).toBeNull();
    expect(processTerm('')).toBeNull();
  });

  it('is fuzzy only above four characters and prefix-matches from two', () => {
    expect(fuzzy('vat')).toBe(false);
    expect(fuzzy('belasting')).toBe(0.2);
    expect(prefix('a')).toBe(false);
    expect(prefix('no')).toBe(true);
  });
});

describe('loadIndex', () => {
  it('loads a serialised index for its own language', () => {
    expect(index('af').lang).toBe('af');
    expect(index('af').sections).toEqual(['core', 'business-types', 'lookup']);
  });

  it.each([
    ['not an object', 'nope'],
    ['null', null],
    ['missing fields', { v: INDEX_VERSION }],
  ])('refuses %s', (_name, value) => {
    expect(() => loadIndex(value, 'en')).toThrow(SearchIndexError);
  });

  it('refuses another version or language', () => {
    const good = JSON.parse(serialiseIndex('en', [], ENTRIES).json) as Record<string, unknown>;
    expect(() => loadIndex({ ...good, v: INDEX_VERSION + 1 }, 'en')).toThrow(/version/);
    expect(() => loadIndex(good, 'af')).toThrow(/"en", not "af"/);
  });

  it('refuses an index MiniSearch cannot read', () => {
    expect(() =>
      loadIndex({ v: INDEX_VERSION, lang: 'en', sections: [], index: { broken: true } }, 'en'),
    ).toThrow(/could not be read/);
  });
});

describe('runSearch', () => {
  const af = index('af');

  it('returns nothing for an empty query', () => {
    expect(runSearch(af, '   ', 'af')).toEqual([]);
  });

  it('finds an Afrikaans typo through fuzzy matching (A7: belastng → belasting)', () => {
    const [first] = runSearch(af, 'belastng', 'af', {}, BASE);
    expect(first?.title).toBe('Voorlopige belasting');
    expect(first?.terms).toContain('belasting');
  });

  it('returns typed results with the href under the base path and the locale prefix', () => {
    const [first] = runSearch(af, 'belasting', 'af', {}, BASE);
    expect(first).toMatchObject({
      kind: 'section',
      doc: 'core/tax-and-sars',
      anchor: 'belasting',
      section: 'core',
      href: '/business-toolkit/af/core/tax-and-sars/#belasting',
      lang: undefined,
    });
    const en = index('en');
    expect(runSearch(en, 'belasting', 'en', {}, BASE)[0]?.href).toBe(
      '/business-toolkit/core/tax-and-sars/#belasting',
    );
  });

  it("reports the language of an entry that is not in the reader's", () => {
    expect(runSearch(af, 'acceptability', 'af', {}, BASE)[0]?.lang).toBe('en');
  });

  it('matches every word first, then any word', () => {
    expect(runSearch(af, 'SAPS station', 'af').map((r) => r.anchor)).toEqual(['how-to-register']);
    // No entry has both words: the OR pass still finds both entries.
    expect(runSearch(af, 'acceptability police', 'af')).toHaveLength(2);
  });

  it('filters by section, kind, entity and business type', () => {
    expect(runSearch(af, 'register', 'af', { section: 'core' }).map((r) => r.doc)).toEqual([
      'core/register',
    ]);
    expect(runSearch(af, 'PIS', 'af', { kinds: ['section'] })).toEqual([]);
    expect(runSearch(af, 'information', 'af', { entity: 'sole-prop' })).toEqual([]);
    expect(runSearch(af, 'information', 'af', { entity: 'pty' })).toHaveLength(1);
    expect(runSearch(af, 'register', 'af', { businessTypes: ['food'] }).map((r) => r.doc)).toEqual([
      'core/register',
    ]);
    expect(runSearch(af, 'register', 'af', { businessTypes: ['vehicle-dealer'] })).toHaveLength(2);
  });

  it('ranks by kind weight: the glossary entry first', () => {
    const results = runSearch(
      index('en', [...ENTRIES, entry({ key: 'x', title: 'PIS forms', text: 'PIS' })]),
      'PIS',
      'en',
    );
    expect(results[0]?.kind).toBe('glossary');
  });

  it('stops at the limit', () => {
    expect(runSearch(af, 'register', 'af', { limit: 1 })).toHaveLength(1);
  });

  it('builds the href with the build base when none is given', () => {
    expect(runSearch(af, 'PIS', 'af')[0]?.href).toBe('/af/glossary/#pis');
  });
});

describe('resultHref', () => {
  it('links the page, or the anchor on it, in both locales', () => {
    expect(resultHref('en', 'core/register/', undefined, BASE)).toBe(
      '/business-toolkit/core/register/',
    );
    expect(resultHref('af', 'core/register/', 'popia', BASE)).toBe(
      '/business-toolkit/af/core/register/#popia',
    );
    expect(resultHref('en', 'glossary/', 'pis', '/')).toBe('/glossary/#pis');
    expect(resultHref('en', 'glossary/', 'pis')).toBe('/glossary/#pis');
  });
});

describe('groupResults', () => {
  it("groups by section in the order of each section's best result", () => {
    const r = (id: number, section: string) => ({ id, section }) as unknown as SearchResult;
    const groups = groupResults([r(1, 'lookup'), r(2, 'core'), r(3, 'lookup')]);
    expect(groups.map((group) => [group.section, group.results.map((x) => x.id)])).toEqual([
      ['lookup', [1, 3]],
      ['core', [2]],
    ]);
  });
});

describe('highlight', () => {
  it('marks the matched words and keeps the rest as text', () => {
    expect(highlight('Voorlopige belasting is due.', ['belasting'])).toEqual([
      { text: 'Voorlopige ', mark: false },
      { text: 'belasting', mark: true },
      { text: ' is due.', mark: false },
    ]);
  });

  it('marks the two written halves of a joined form-code alias', () => {
    expect(highlight('Form SAPS 601 now', ['saps601'])).toEqual([
      { text: 'Form ', mark: false },
      { text: 'SAPS', mark: true },
      { text: ' ', mark: false },
      { text: '601', mark: true },
      { text: ' now', mark: false },
    ]);
    expect([...markTerms(['VAT264'])]).toEqual(['vat264', 'vat', '264']);
  });

  it('matches regardless of case and diacritics, and merges neighbouring plain text', () => {
    expect(highlight('Wat Sê jy', ['se'])).toEqual([
      { text: 'Wat ', mark: false },
      { text: 'Sê', mark: true },
      { text: ' jy', mark: false },
    ]);
    expect(highlight('<b>not markup</b>', [])).toEqual([
      { text: '<b>not markup</b>', mark: false },
    ]);
    expect(highlight('', ['x'])).toEqual([]);
  });
});

describe('createSearchClient', () => {
  const body = JSON.parse(serialiseIndex('en', ['core'], ENTRIES).json) as unknown;
  const ok: FetchLike = () =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches nothing until it is used, then loads once', async () => {
    const fetch = vi.fn(ok);
    const client = createSearchClient({
      url: '/business-toolkit/search/en.x.json',
      locale: 'en',
      base: BASE,
      fetch,
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(client.ready).toBe(false);
    const [a, b] = await Promise.all([client.load(), client.load()]);
    expect(a).toBe(b);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/business-toolkit/search/en.x.json');
    expect(client.ready).toBe(true);
    const results = await client.search('PIS');
    expect(results[0]?.href).toBe('/business-toolkit/glossary/#pis');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('fails with a SearchIndexError on an HTTP error, and can try again', async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve(null) })
      .mockImplementation(ok);
    const client = createSearchClient({ url: '/i.json', locale: 'en', fetch });
    await expect(client.search('PIS')).rejects.toThrow(/answered 404/);
    expect(client.ready).toBe(false);
    await expect(client.search('PIS')).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('wraps a network failure and a wrong index in SearchIndexError', async () => {
    const offline = createSearchClient({
      url: '/i.json',
      locale: 'en',
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
    });
    await expect(offline.load()).rejects.toBeInstanceOf(SearchIndexError);
    const wrong = createSearchClient({ url: '/i.json', locale: 'af', fetch: ok });
    await expect(wrong.load()).rejects.toThrow(/not "af"/);
  });

  it('uses the global fetch, same-origin, when none is given', async () => {
    const fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) }),
    );
    vi.stubGlobal('fetch', fetch);
    const client = createSearchClient({ url: '/search/en.json', locale: 'en' });
    await client.load();
    expect(fetch).toHaveBeenCalledWith('/search/en.json', { credentials: 'same-origin' });
  });
});
