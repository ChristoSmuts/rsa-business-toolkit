/**
 * `src/lib/search-client.ts` and `src/lib/search/options.ts` on small hand-made indexes: loading,
 * the network contract, querying, filters, URLs under the base path, grouping and highlighting.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { serialiseIndex } from '../../../scripts/search/build';
import {
  anyTree,
  createSearchClient,
  groupResults,
  highlight,
  loadIndex,
  markTerms,
  queryTree,
  resultHref,
  runSearch,
  runSearchCounted,
  SearchIndexError,
  titleCoverage,
  type FetchLike,
  type SearchResult,
} from '../../../src/lib/search-client';
import {
  foldTerm,
  fuzzy,
  INDEX_VERSION,
  KIND_WEIGHT,
  matchRule,
  MAX_QUERY_TERMS,
  normaliseNumber,
  prefix,
  processTerm,
  queryParts,
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
    // `R120,000` is folded to `r120000` by processTerm, not here.
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

  it('joins a hyphen chain as one alias, after the chain', () => {
    expect(tokenize('Use e-filing and pay-as-you-earn')).toEqual([
      'Use',
      'e',
      'filing',
      'efiling',
      'and',
      'pay',
      'as',
      'you',
      'earn',
      'payasyouearn',
    ]);
  });

  // Review WP-33 pass 5, major 3: South African ways of writing amounts and tax years.
  it('writes every amount one way and expands a short tax year', () => {
    expect(foldTerm('R120,000')).toBe('r120000');
    expect(foldTerm('R2,300,000')).toBe('r2300000');
    expect(foldTerm('R2,3')).toBe('r2.3');
    expect(foldTerm('R2.3')).toBe('r2.3');
    expect(foldTerm('14.3')).toBe('14.3');
    expect(normaliseNumber('vat264')).toBe('vat264');
    expect(tokenize('R120 000 or R 120 000 or R1 200 000')).toEqual([
      'R120000',
      'or',
      'R120000',
      'or',
      'R1200000',
    ]);
    expect(tokenize('R2.3 million and R1 miljoen')).toEqual([
      'R2.3',
      'R2300000',
      'million',
      'and',
      'R1',
      'R1000000',
      'miljoen',
    ]);
    // The guide and copied text use no-break and narrow no-break spaces between the groups.
    expect(tokenize('R120 000 and R1 200 000')).toEqual(['R120000', 'and', 'R1200000']);
    expect(tokenize('2026/27 and 2026/2027')).toEqual(['2026', '2027', 'and', '2026', '2027']);
    // Review WP-33 pass 6: `2026-27` is the same tax year; `2026/03` (a year and a month, or a
    // path) is not one, because 03 is not the year after 2026.
    expect(tokenize('2026-27 or 2026–27')).toEqual(['2026', '2027', 'or', '2026', '2027']);
    expect(tokenize('2026/03 and 2026/28')).toEqual(['2026', '03', 'and', '2026', '28']);
    expect(tokenize('1999/00')).toEqual(['1999', '2000']);
    // Review WP-33 pass 6, minor 2: millions written short.
    expect(tokenize('R1m, R10m, R2.3m and R2,3m')).toEqual([
      'R1000000',
      'R10000000',
      'R2300000',
      'and',
      'R2300000',
    ]);
    expect(queryParts('R1m turnover')).toEqual(['r1000000', 'turnover']);
    expect(queryParts('2026-27')).toEqual(['2026', '2027']);
    // Only groups of three after an amount join: a year and a count stay apart.
    expect(tokenize('In 2026 100 people paid R50 each')).toEqual([
      'In',
      '2026',
      '100',
      'people',
      'paid',
      'R50',
      'each',
    ]);
  });

  it('turns a spaced code or a hyphenated word in a query into one part, in any case', () => {
    expect(queryParts('VAT 264 form')).toEqual([
      { code: ['vat', '264'], joined: 'vat264' },
      'form',
    ]);
    expect(queryParts('saps 601')).toEqual([{ code: ['saps', '601'], joined: 'saps601' }]);
    expect(queryParts('the e-filing')).toEqual([{ hyphen: ['e', 'filing'], joined: 'efiling' }]);
    expect(queryParts('page 2 of the guide')).toEqual([
      { code: ['page', '2'], joined: 'page2' },
      'guide',
    ]);
    // Review WP-33 pass 5, minor: a stop-word half leaves the other words, and the whole chain.
    expect(queryParts('pay-as-you-earn')).toEqual([
      { hyphen: ['pay', 'earn'], joined: 'payasyouearn' },
    ]);
    expect(queryParts('in-house')).toEqual([{ hyphen: ['house'], joined: 'inhouse' }]);
    expect(queryParts('the-end')).toEqual([{ hyphen: ['end'], joined: 'theend' }]);
    expect(queryParts('VAT264')).toEqual(['vat264']);
    expect(queryParts('R120 000')).toEqual(['r120000']);
    expect(queryParts('   ')).toEqual([]);
  });

  it('cuts a pasted paragraph to the first twelve words', () => {
    const words = Array.from(
      { length: 40 },
      (_, i) => `word${String.fromCharCode(97 + (i % 26))}x`,
    );
    expect(queryParts(words.join(' '))).toHaveLength(MAX_QUERY_TERMS);
  });

  it('reads a spaced code as its joined form or as its words', () => {
    const parts = [{ code: ['vat', '264'], joined: 'vat264' }, 'form'] as const;
    expect(queryTree(parts, false, 'joined')).toEqual({
      combineWith: 'AND',
      queries: [
        { combineWith: 'OR', queries: ['vat264'], prefix: false, fuzzy: false },
        { combineWith: 'OR', queries: ['form'], prefix: true, fuzzy: false },
      ],
    });
    expect(queryTree(parts, false, 'words')).toEqual({
      combineWith: 'AND',
      queries: [
        {
          combineWith: 'AND',
          queries: [
            { combineWith: 'OR', queries: ['vat'], prefix: true, fuzzy: false },
            { combineWith: 'OR', queries: ['264'], prefix: false, fuzzy: false },
          ],
        },
        { combineWith: 'OR', queries: ['form'], prefix: true, fuzzy: false },
      ],
    });
  });

  // Review WP-33 pass 4: one rule per kind of term (the query-kind table in design-system.md).
  it.each([
    ['notional', true, { prefix: true, fuzzy: 0.2 }],
    ['vat', true, { prefix: true, fuzzy: false }],
    ['e', true, { prefix: false, fuzzy: false }],
    ['vat264', true, { prefix: true, fuzzy: false }],
    ['vat264', false, { prefix: false, fuzzy: false }],
    ['r500000', false, { prefix: false, fuzzy: false }],
    ['r500000', true, { prefix: false, fuzzy: false }],
    ['r50', true, { prefix: true, fuzzy: false }],
    ['r2.3', true, { prefix: true, fuzzy: false }],
    ['2026', true, { prefix: false, fuzzy: false }],
    ['14.3', true, { prefix: false, fuzzy: false }],
  ] as const)('matchRule(%s, last=%s)', (term, last, rule) => {
    expect(matchRule(term, last)).toEqual(rule);
  });

  // Review WP-33 pass 3, minor 3: the exact branch, by behaviour rather than by shape.
  it('matches a code, spaced or joined, never by fuzzy matching, and by prefix only while typed', () => {
    const idx = index('en', [
      entry({ key: 'code', anchor: 'code', title: 'Form VAT264', text: 'VAT264' }),
      entry({ key: 'longer', anchor: 'longer', title: 'Form VAT2640', text: 'VAT2640' }),
      entry({ key: 'near', anchor: 'near', title: 'Form VAT265', text: 'VAT265' }),
    ]);
    // The results that match every word (the any-word results after them also hold `form`).
    const anchors = (q: string) => {
      return runSearchCounted(idx, q, 'en')
        .results.filter((r) => r.allWords)
        .map((r) => r.anchor);
    };
    // A finished code (followed by more text) matches itself only.
    expect(anchors('VAT 264 form')).toEqual(['code']);
    expect(anchors('VAT 264 ')).toEqual(['code']);
    expect(anchors('VAT264 ')).toEqual(['code']);
    // While typed, the code is a prefix of longer codes, spaced and joined alike, but never one
    // edit away from a neighbour (VAT265).
    expect(anchors('VAT 264').sort()).toEqual(['code', 'longer']);
    expect(anchors('VAT264').sort()).toEqual(['code', 'longer']);
  });

  // Review WP-33 pass 10, minor 3: within the all-words results, an entry whose own heading holds
  // every word comes before one that only mentions them, however often.
  it('lists an entry whose heading holds every word before one whose text does', () => {
    const idx = index('en', [
      entry({
        key: 'mention',
        anchor: 'mention',
        kind: 'glossary',
        title: 'Company tax',
        text: 'The company tax rate applies. The rate is the company tax rate.',
      }),
      entry({
        key: 'answer',
        anchor: 'answer',
        kind: 'task',
        title: 'Company tax rate',
        text: 'Twenty-seven percent of taxable income, paid in two provisional payments a year, then a top-up with the return after the year ends, as SARS sets out each year.',
      }),
    ]);
    const anchors = runSearch(idx, 'company tax rate', 'en', { typing: false }).map(
      (r) => r.anchor,
    );
    expect(anchors).toEqual(['answer', 'mention']);
  });

  // Review WP-33 pass 10: how far a query names a page by its title.
  it('measures how much of a page title a query names', () => {
    const cover = (title: string, query: string, typing = false) =>
      titleCoverage(title, queryParts(query), typing);
    expect(cover('How this was made and how to check it', 'how this was made')).toBeCloseTo(2 / 3);
    expect(cover('How this was made and how to check it', 'check')).toBeCloseTo(1 / 3);
    // `has` counts as `het` does: "What has changed" is one word, as "Wat het verander" is.
    expect(cover('What has changed', 'what changed')).toBe(1);
    expect(cover('Wat het verander', 'verander')).toBe(1);
    // A word counts whole: `change` is not "changed", and a query word outside the title is 0.
    expect(cover('What has changed', 'change')).toBe(0);
    expect(cover('What has changed', 'change', true)).toBe(0);
    expect(cover('Marketing prompts', 'marketing tips')).toBe(0);
    // While typed, the last word may begin a title word, beside a whole word, from four letters.
    expect(cover('Marketing prompts', 'marketing prom', true)).toBe(1);
    expect(cover('Marketing prompts', 'marketing prom', false)).toBe(0);
    expect(cover('Marketing prompts', 'marketing pr', true)).toBe(0);
    expect(cover('Wat het verander', 'ver', true)).toBe(0);
    expect(cover('', 'anything')).toBe(0);
  });

  // Review WP-33 pass 6, major 2: the any-word query takes every word of every part.
  it('builds the any-word query from every word, leaving out lone numbers and single letters', () => {
    const parts = [
      'deadline',
      { code: ['saps', '60'], joined: 'saps60' },
      { hyphen: ['e', 'filing'], joined: 'efiling' },
    ] as const;
    expect(anyTree(parts, false)).toEqual({
      combineWith: 'OR',
      queries: [
        { combineWith: 'OR', queries: ['deadline'], prefix: true, fuzzy: 0.2 },
        { combineWith: 'OR', queries: ['saps60'], prefix: false, fuzzy: false },
        { combineWith: 'OR', queries: ['saps'], prefix: true, fuzzy: false },
        { combineWith: 'OR', queries: ['efiling'], prefix: false, fuzzy: false },
        { combineWith: 'OR', queries: ['filing'], prefix: true, fuzzy: 0.2 },
      ],
    });
    // While typed, the last part's joined form is prefix-matched.
    expect(anyTree([{ code: ['saps', '60'], joined: 'saps60' }], true).queries[0]).toEqual({
      combineWith: 'OR',
      queries: ['saps60'],
      prefix: true,
      fuzzy: false,
    });
    expect(anyTree(['1', 'e'], false).queries).toEqual([]);
  });

  it('lists all-words results first, then any-word results, best first', () => {
    const idx = index('en', [
      entry({ key: 'both', anchor: 'both', title: 'Corrections', text: 'EMP201 deadline' }),
      entry({ key: 'code', anchor: 'code', title: 'EMP201', text: 'Paid by the 7th' }),
      entry({ key: 'word', anchor: 'word', title: 'Other', text: 'a deadline' }),
      entry({ key: 'none', anchor: 'none', title: 'Unrelated', text: 'nothing here' }),
    ]);
    const counted = runSearchCounted(idx, 'EMP201 deadline', 'en', { typing: false });
    expect(counted.results.map((r) => r.anchor)).toEqual(['both', 'code', 'word']);
    expect(counted.matchedAll).toBe(1);
    expect(counted.total).toBe(3);
    // A junk word with a lone number still finds nothing.
    expect(runSearch(idx, 'zzzzqq 1', 'en')).toEqual([]);
  });

  it('searches a hyphenated word as its words or the whole chain joined', () => {
    const part = { hyphen: ['e', 'filing'], joined: 'efiling' } as const;
    const tree = (typing: boolean) => ({
      combineWith: 'AND',
      queries: [
        {
          combineWith: 'OR',
          queries: [
            {
              combineWith: 'AND',
              queries: [
                { combineWith: 'OR', queries: ['e'], prefix: false, fuzzy: false },
                { combineWith: 'OR', queries: ['filing'], prefix: typing, fuzzy: 0.2 },
              ],
            },
            // Prefix-matched while typed (`e-fil` → `efiling`), never fuzzy.
            { combineWith: 'OR', queries: ['efiling'], prefix: typing, fuzzy: false },
          ],
        },
      ],
    });
    expect(queryTree([part])).toEqual(tree(true));
    // `filing` keeps its own word rule (prefix from two letters) whether typed or not.
    expect(queryTree([part], false)).toEqual({
      ...tree(false),
      queries: [
        {
          combineWith: 'OR',
          queries: [
            {
              combineWith: 'AND',
              queries: [
                { combineWith: 'OR', queries: ['e'], prefix: false, fuzzy: false },
                { combineWith: 'OR', queries: ['filing'], prefix: true, fuzzy: 0.2 },
              ],
            },
            { combineWith: 'OR', queries: ['efiling'], prefix: false, fuzzy: false },
          ],
        },
      ],
    });
    // Only stop words left: the whole chain alone.
    expect(queryTree([{ hyphen: [], joined: 'theend' }], false)).toEqual({
      combineWith: 'AND',
      queries: [{ combineWith: 'OR', queries: ['theend'], prefix: false, fuzzy: false }],
    });
  });

  // Review WP-33 pass 2, nit 3: "on 1 March" paired the stop word with the date.
  it('keeps the number of a date apart from a stop word, but pairs a capitalised code', () => {
    expect(queryParts('on 1 March')).toEqual(['1', 'march']);
    expect(queryParts('op 28 Februarie')).toEqual(['28', 'februarie']);
    expect(queryParts('IT 12 form')).toEqual([{ code: ['12'], joined: 'it12' }, 'form']);
    // Review WP-33 pass 3, nit 1: a query all in capitals says nothing by its capitals.
    expect(queryParts('ON 1 MARCH')).toEqual(['1', 'march']);
    expect(queryParts('OP 28 FEBRUARIE')).toEqual(['28', 'februarie']);
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

  it('offers each destination once, keeping the better result', () => {
    const twin = entry({
      key: 'twin',
      anchor: 'belasting',
      title: 'Belasting twin',
      text: 'belasting',
    });
    const results = runSearch(index('af', [...ENTRIES, twin]), 'belasting', 'af');
    expect(results.filter((r) => r.anchor === 'belasting')).toHaveLength(1);
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

  // Review WP-33 pass 6, minor 3: a match through the "in millions" alias marks what is written.
  it('marks an amount in millions through its alias', () => {
    expect(highlight('Below R2.3 million a year', ['r2300000'])).toEqual([
      { text: 'Below ', mark: false },
      { text: 'R2.3', mark: true },
      { text: ' ', mark: false },
      { text: 'million', mark: true },
      { text: ' a year', mark: false },
    ]);
    expect(highlight('Onder R1 miljoen', ['r1000000']).filter((s) => s.mark)).toEqual([
      { text: 'R1', mark: true },
      { text: 'miljoen', mark: true },
    ]);
    expect(markTerms(['r120000']).has('million')).toBe(false);
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
