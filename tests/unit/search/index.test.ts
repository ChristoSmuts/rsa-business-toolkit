/**
 * The search index built from the real `src/data`, queried with the real client (build plan A7).
 * Nothing here reads `public/search/`: the index is built in memory exactly as
 * `scripts/build-search-index.ts` builds it, so the tests do not depend on a previous build.
 */
import { gzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { INDEX_BUDGET_GZIP, serialiseIndex } from '../../../scripts/search/build';
import { buildEntries } from '../../../scripts/search/entries';
import { loadIndexInput } from '../../../scripts/search/load';
import type { Locale } from '../../../src/i18n/locales';
import {
  loadIndex,
  runSearch,
  runSearchCounted,
  type LoadedIndex,
} from '../../../src/lib/search-client';
import { processTerm, tokenize } from '../../../src/lib/search/options';
import { SEARCH_ENTRY_KINDS, type SearchEntry } from '../../../src/lib/search/types';

const BASE = '/business-toolkit/';

interface Built {
  readonly entries: SearchEntry[];
  readonly json: string;
  readonly index: LoadedIndex;
}

function build(lang: Locale): Built {
  const input = loadIndexInput(lang);
  const entries = buildEntries(input);
  const sections = input.manifest.sections.map((section) => section.id);
  const { json } = serialiseIndex(lang, sections, entries);
  return { entries, json, index: loadIndex(JSON.parse(json), lang) };
}

let en: Built;
let af: Built;

beforeAll(() => {
  en = build('en');
  af = build('af');
});

function top(index: LoadedIndex, query: string, n = 3, locale: Locale = 'en'): string[] {
  return runSearch(index, query, locale, { limit: n }, BASE).map((result) => result.href);
}

describe('A7 ranking cases', () => {
  it('VAT264 puts the vehicle dealer\'s "The conditions you must meet" in the top 3', () => {
    expect(top(en.index, 'VAT264')).toContain(
      `${BASE}business-types/vehicle-dealer/#the-conditions-you-must-meet`,
    );
  });

  it('SAPS 601 and saps601 both find the second-hand goods dealer registration', () => {
    const spaced = runSearch(en.index, 'SAPS 601', 'en', {}, BASE);
    const joined = runSearch(en.index, 'saps601', 'en', {}, BASE);
    const lower = runSearch(en.index, 'saps 601', 'en', {}, BASE);
    const target = `${BASE}business-types/vehicle-dealer/#how-to-register`;
    for (const results of [spaced, joined, lower]) {
      expect(results.length).toBeGreaterThan(0);
      expect(results.map((result) => result.href)).toContain(target);
    }
  });

  // Review WP-33 pass 1, major 1 (a spaced code found 1 result) and pass 2, minor 4 (A7 says top 3).
  it.each(['VAT 264', 'vat 264'])(
    '"%s" ranks exactly as VAT264: the conditions section in the top 3',
    (query) => {
      expect(top(en.index, query)).toContain(
        `${BASE}business-types/vehicle-dealer/#the-conditions-you-must-meet`,
      );
      expect(top(en.index, query, 10)).toEqual(top(en.index, 'VAT264', 10));
    },
  );

  it('"VAT 264 form" still finds the glossary entry and the conditions section', () => {
    const hrefs = runSearch(en.index, 'VAT 264 form', 'en', {}, BASE).map((r) => r.href);
    expect(hrefs).toContain(`${BASE}glossary/#vat264`);
    expect(hrefs).toContain(`${BASE}business-types/vehicle-dealer/#the-conditions-you-must-meet`);
  });

  // Review WP-33 pass 2, minor 1: the joined form of "page 2" fuzzy-matched every "page".
  it.each([
    ['en', 'page 2'],
    ['en', 'route 3'],
    ['en', 'step 1'],
    ['en', 'part 2'],
    ['en', 'prompt 7'],
    ['af', 'stap 1'],
    ['af', 'deel 2'],
  ] as const)('%s "%s" finds only entries that hold the number', (lang, query) => {
    const built = lang === 'en' ? en : af;
    const number = query.split(' ')[1]!;
    const results = runSearch(built.index, query, lang, { limit: 1000 }, BASE);
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(
        result.terms.some((term) => term.includes(number)),
        result.href,
      ).toBe(true);
    }
  });

  it('real codes keep working: SAPS 601 and Tax 2026', () => {
    expect(top(en.index, 'saps 601', 1)).toEqual([
      `${BASE}business-types/vehicle-dealer/#how-to-register`,
    ]);
    const tax = runSearch(en.index, 'Tax 2026', 'en', { limit: 1000 }, BASE);
    expect(tax.length).toBeGreaterThan(0);
    expect(tax.every((r) => r.terms.some((t) => t.includes('2026')))).toBe(true);
  });

  // Review WP-33 pass 3, major 1: a hyphenated query searched only its joined form, exactly.
  it.each([
    ['af', 'BTW-registrasie', 'BTW registrasie'],
    ['af', 'BTW-faktuur', 'BTW faktuur'],
    ['af', 'SARS-registrasie', 'SARS registrasie'],
    ['af', 'BTW-geregistreer', 'BTW geregistreer'],
    ['af', 'KI-opdragte', 'KI opdragte'],
    ['en', 'VAT-registered', 'VAT registered'],
    ['en', 'small-business', 'small business'],
    ['en', 'co-owner', 'co owner'],
  ] as const)('%s "%s" finds at least what "%s" finds', (lang, hyphenated, spaced) => {
    const built = lang === 'en' ? en : af;
    const all = (q: string) =>
      new Set(runSearch(built.index, q, lang, { limit: 5000 }, BASE).map((r) => r.href));
    const withHyphen = all(hyphenated);
    const withSpace = all(spaced);
    expect(withSpace.size).toBeGreaterThan(0);
    for (const href of withSpace) expect(withHyphen.has(href), href).toBe(true);
  });

  it.each([
    ['af', 'BTW-faktuur', 'glossary/#tax-invoice'],
    ['af', 'BTW-geregistreer', 'glossary/#vat'],
    ['en', 'VAT-registered', 'glossary/#vat'],
  ] as const)('%s "%s" brings back the tax invoice template and %s', (lang, query, glossary) => {
    const built = lang === 'en' ? en : af;
    const prefix = lang === 'en' ? BASE : `${BASE}af/`;
    const hrefs = runSearch(built.index, query, lang, { limit: 5000 }, BASE).map((r) => r.href);
    expect(hrefs).toContain(`${prefix}templates/tax-invoice/`);
    expect(hrefs).toContain(`${prefix}${glossary}`);
  });

  it('finishing a hyphenated word keeps every result that holds the whole word', () => {
    const typing = runSearch(af.index, 'BTW-regis', 'af', { limit: 5000 }, BASE);
    const whole = new Set(
      runSearch(af.index, 'BTW-registrasie', 'af', { limit: 5000 }, BASE).map((r) => r.href),
    );
    const holdingWord = typing.filter((r) => r.terms.includes('registrasie'));
    expect(holdingWord.length).toBeGreaterThan(0);
    for (const result of holdingWord) expect(whole.has(result.href), result.href).toBe(true);
  });

  // Review WP-33 pass 4 and 5: the query-kind table in docs/design-system.md ("Search",
  // "Queries"), one row per kind, on both real indexes. Hrefs are after the locale prefix.
  interface Row {
    readonly kind: string;
    readonly lang: 'en' | 'af';
    readonly query: string;
    /** `true`: the reader is still typing the last term (the live dialog); `false`: Enter. */
    readonly typing?: boolean;
    /** The first result's href. */
    readonly first?: string;
    /** Hrefs found in the first three results. */
    readonly top3?: readonly string[];
    /** A term prefix every result holds. */
    readonly every?: string;
    /** A term no result may hold. */
    readonly none?: string;
    /** Every matched term holding a digit is one of these (a number is never prefix-matched). */
    readonly digitTerms?: readonly string[];
    /** Every matched term is one of these. */
    readonly onlyTerms?: readonly string[];
    /** The honest answer is "nothing found". */
    readonly empty?: true;
    /** Exactly the same results, in the same order. */
    readonly sameAs?: string;
    /** The results begin with this query's results, in order (a spaced code: joined first). */
    readonly startsWith?: string;
    /** Finds at least everything this query finds (a spaced code: its two words). */
    readonly atLeast?: string;
    /** A term the first result holds. */
    readonly firstTerm?: string;
  }
  const ROWS: readonly Row[] = [
    { kind: 'word', lang: 'en', query: 'PIS', first: 'glossary/#pis' },
    { kind: 'word', lang: 'af', query: 'omsetbelasting', first: 'glossary/#turnover-tax' },
    { kind: 'partial word', lang: 'en', query: 'notion', first: 'glossary/#notional-input-tax' },
    { kind: 'word with a typo', lang: 'af', query: 'belastng', firstTerm: 'belasting' },
    { kind: 'single letter', lang: 'en', query: 'e', onlyTerms: ['e'] },
    {
      kind: 'code, joined',
      lang: 'en',
      query: 'SAPS604',
      first: 'business-types/vehicle-dealer/#keeping-your-registration-valid',
      every: 'saps604',
    },
    { kind: 'code, joined', lang: 'en', query: 'EMP501 due', every: 'emp501', none: 'emp201' },
    { kind: 'code, joined', lang: 'en', query: 'ITR14 deadline', every: 'itr14', none: 'itr12' },
    { kind: 'code, joined', lang: 'af', query: 'ITR14 sperdatum', every: 'itr14', none: 'itr12' },
    { kind: 'code, being typed', lang: 'en', query: 'VAT26', first: 'glossary/#vat264' },
    // A spaced code: the joined code's results first, then everything its two words find.
    { kind: 'code, spaced', lang: 'en', query: 'VAT 264', sameAs: 'VAT264', atLeast: '264 VAT' },
    { kind: 'code, spaced', lang: 'en', query: 'vat 264', sameAs: 'VAT264', atLeast: '264 vat' },
    {
      kind: 'code, spaced',
      lang: 'en',
      query: 'SAPS 604',
      startsWith: 'SAPS604',
      atLeast: '604 SAPS',
    },
    {
      kind: 'code, spaced',
      lang: 'af',
      query: 'VAT 264',
      startsWith: 'VAT264',
      atLeast: '264 VAT',
    },
    {
      kind: 'code, spaced',
      lang: 'en',
      query: 'VAT 15%',
      startsWith: 'VAT15',
      atLeast: '15% VAT',
      top3: ['templates/tax-invoice/#supply'],
    },
    { kind: 'code, spaced', lang: 'af', query: 'BTW 15%', startsWith: 'BTW15', atLeast: '15% BTW' },
    {
      kind: 'code, spaced',
      lang: 'en',
      query: 'brand 5',
      startsWith: 'brand5',
      atLeast: '5 brand',
    },
    {
      kind: 'code, spaced',
      lang: 'en',
      query: 'under 100',
      startsWith: 'under100',
      atLeast: '100 under',
    },
    { kind: 'code, spaced', lang: 'af', query: 'werk 5', startsWith: 'werk5', atLeast: '5 werk' },
    // The number is still being typed: the joined form is prefix-matched, like `SAPS60`.
    {
      kind: 'code, spaced, being typed',
      lang: 'en',
      query: 'SAPS 60',
      typing: true,
      startsWith: 'SAPS60',
      first: 'business-types/vehicle-dealer/#how-to-register',
    },
    {
      kind: 'code, spaced, being typed',
      lang: 'en',
      query: 'VAT 26',
      typing: true,
      startsWith: 'VAT26',
      first: 'glossary/#vat264',
    },
    {
      kind: 'code, spaced, being typed',
      lang: 'en',
      query: 'EMP 20',
      typing: true,
      startsWith: 'EMP20',
      first: 'glossary/#emp201',
    },
    {
      kind: 'code, spaced, being typed',
      lang: 'af',
      query: 'SAPS 60',
      typing: true,
      startsWith: 'SAPS60',
      first: 'business-types/vehicle-dealer/#how-to-register',
    },
    { kind: 'code with a typo', lang: 'en', query: 'VAT246', empty: true },
    { kind: 'code with a typo', lang: 'en', query: 'EMP502', empty: true },
    { kind: 'rand amount', lang: 'en', query: 'R500,000', every: 'r500000' },
    { kind: 'rand amount', lang: 'en', query: 'R500 000', sameAs: 'R500,000' },
    { kind: 'rand amount', lang: 'en', query: 'R300,000', every: 'r300000' },
    { kind: 'rand amount', lang: 'en', query: 'R120 000', sameAs: 'R120,000', every: 'r120000' },
    { kind: 'rand amount', lang: 'en', query: 'R120000', sameAs: 'R120,000' },
    { kind: 'rand amount', lang: 'en', query: 'R 120 000', sameAs: 'R120,000' },
    { kind: 'rand amount', lang: 'af', query: 'R120 000', sameAs: 'R120,000', every: 'r120000' },
    { kind: 'rand amount', lang: 'en', query: 'R1 million', every: 'r1', none: 'r10' },
    {
      kind: 'rand amount, in millions',
      lang: 'en',
      query: 'R1,000,000',
      atLeast: 'R1 million',
      digitTerms: ['r1000000'],
    },
    {
      kind: 'rand amount, in millions',
      lang: 'en',
      query: 'R2 300 000',
      sameAs: 'R2,300,000',
      atLeast: 'R2.3 million',
    },
    {
      kind: 'rand amount, decimal comma',
      lang: 'en',
      query: 'R2,3',
      sameAs: 'R2.3',
      every: 'r2.3',
    },
    {
      kind: 'rand amount, decimal comma',
      lang: 'af',
      query: 'R2,3 miljoen',
      sameAs: 'R2.3 miljoen',
      top3: ['core/tax-and-sars/#vat-probably-not-yet'],
    },
    { kind: 'rand amount', lang: 'en', query: 'R123,456', empty: true },
    // Finished (Enter, the search page): `R1` is R1, never R146.
    { kind: 'rand amount, finished', lang: 'en', query: 'R1', typing: false, digitTerms: ['r1'] },
    { kind: 'rand amount, being typed', lang: 'en', query: 'R500', typing: true, every: 'r500' },
    { kind: 'year', lang: 'en', query: 'Tax 2026', every: '2026' },
    { kind: 'year', lang: 'af', query: '2027', digitTerms: ['2027'] },
    { kind: 'tax year', lang: 'en', query: '2026/27', sameAs: '2026/2027', every: '2027' },
    { kind: 'tax year', lang: 'af', query: '2026/27', sameAs: '2026/2027', every: '2027' },
    { kind: 'number', lang: 'en', query: '20', digitTerms: ['20'] },
    { kind: 'number', lang: 'en', query: 'page 2', typing: false, digitTerms: ['2', 'page2'] },
    { kind: 'number', lang: 'af', query: 'stap 1', typing: false, digitTerms: ['1', 'stap1'] },
    { kind: 'hyphenated word', lang: 'af', query: 'BTW-registrasie', atLeast: 'BTW registrasie' },
    { kind: 'hyphenated word', lang: 'en', query: 'VAT-registered', atLeast: 'VAT registered' },
    {
      kind: 'hyphenated word, stop-word halves',
      lang: 'en',
      query: 'pay-as-you-earn',
      top3: ['glossary/#paye'],
    },
    { kind: 'hyphenated word, stop-word halves', lang: 'en', query: 'in-house', atLeast: 'house' },
    {
      kind: 'hyphenated word, being typed',
      lang: 'en',
      query: 'e-fil',
      first: 'glossary/#efiling',
    },
    { kind: 'Afrikaans compound', lang: 'af', query: 'kontrolelys', firstTerm: 'kontrolelys' },
    { kind: 'stop words', lang: 'en', query: 'the PIS of a company', first: 'glossary/#pis' },
    {
      kind: 'stop words',
      lang: 'af',
      query: 'die omsetbelasting',
      first: 'glossary/#turnover-tax',
    },
    { kind: 'punctuation', lang: 'en', query: '"PIS"?!', first: 'glossary/#pis' },
    {
      kind: 'mixed',
      lang: 'en',
      query: 'Companies Act 71 of 2008',
      top3: ['sources/#legislation-this-toolkit-relies-on'],
    },
    {
      kind: 'mixed',
      lang: 'en',
      query: 'tax year 2026/27',
      first: 'core/tax-and-sars/#your-tax-year-calendar',
    },
    {
      kind: 'mixed',
      lang: 'en',
      query: 'ITR 14 deadline',
      startsWith: 'ITR14 deadline',
    },
    { kind: 'mixed', lang: 'en', query: 'VAT rate 15%', first: 'glossary/#vat' },
  ];

  it.each(ROWS.map((row) => [row.kind, row.lang, row.query, row] as const))(
    '%s (%s): "%s"',
    (_kind, lang, query, row) => {
      const built = lang === 'en' ? en : af;
      const prefix = lang === 'en' ? BASE : `${BASE}af/`;
      const search = (q: string) =>
        runSearch(built.index, q, lang, { limit: 5000, typing: row.typing }, BASE);
      const results = search(query);
      const hrefs = results.map((r) => r.href);
      if (row.empty) {
        expect(hrefs).toEqual([]);
        return;
      }
      expect(results.length).toBeGreaterThan(0);
      if (row.first !== undefined) expect(hrefs[0]).toBe(`${prefix}${row.first}`);
      for (const href of row.top3 ?? []) expect(hrefs.slice(0, 3)).toContain(`${prefix}${href}`);
      if (row.firstTerm !== undefined) expect(results[0]?.terms).toContain(row.firstTerm);
      if (row.atLeast !== undefined) {
        const found = new Set(hrefs);
        const other = search(row.atLeast);
        expect(other.length).toBeGreaterThan(0);
        for (const result of other) expect(found.has(result.href), result.href).toBe(true);
      }
      if (row.sameAs !== undefined) expect(hrefs).toEqual(search(row.sameAs).map((r) => r.href));
      if (row.startsWith !== undefined) {
        const joined = search(row.startsWith).map((r) => r.href);
        expect(joined.length).toBeGreaterThan(0);
        expect(hrefs.slice(0, joined.length)).toEqual(joined);
      }
      for (const result of results) {
        if (row.every !== undefined) {
          expect(
            result.terms.some((t) => t.startsWith(row.every!)),
            result.href,
          ).toBe(true);
        }
        if (row.none !== undefined) expect(result.terms, result.href).not.toContain(row.none);
        for (const term of result.terms) {
          if (row.digitTerms !== undefined && /\d/.test(term)) {
            expect(row.digitTerms, `${result.href}: ${term}`).toContain(term);
          }
          if (row.onlyTerms !== undefined) {
            expect(row.onlyTerms, `${result.href}: ${term}`).toContain(term);
          }
        }
      }
    },
  );

  // Review WP-33 pass 5, major 1: a spaced pair never finds less than its two words. Every
  // letters-then-digits term in either index, written with a space, against the same two words
  // the other way round (which is never read as a code). Only the results that hold the number
  // count: when no entry holds both words, a query falls back to its words without the number.
  it.each(['en', 'af'] as const)(
    '%s: every spaced code finds at least what its two words find',
    (lang) => {
      const built = lang === 'en' ? en : af;
      const codes = new Set<string>();
      for (const entry of built.entries) {
        for (const token of tokenize(`${entry.title} ${entry.path} ${entry.text}`)) {
          const term = processTerm(token);
          if (term !== null && /^\p{L}{2,6}\d+$/u.test(term)) codes.add(term);
        }
      }
      expect(codes.size).toBeGreaterThan(20);
      const all = (q: string) =>
        runSearch(built.index, q, lang, { limit: 5000, typing: false }, BASE);
      let checked = 0;
      for (const code of codes) {
        const [, letters, digits] = /^(\p{L}+)(\d+)$/u.exec(code)!;
        const spaced = new Set(all(`${letters} ${digits}`).map((r) => r.href));
        const words = all(`${digits} ${letters}`).filter((r) => r.terms.includes(digits!));
        if (words.length > 0) checked++;
        for (const { href } of words) {
          expect(spaced.has(href), `"${letters} ${digits}" lacks ${href}`).toBe(true);
        }
      }
      // Pairs such as `brand 5`, `under 100`, `VAT 15`, `page 2` hold both words apart somewhere.
      expect(checked).toBeGreaterThan(5);
    },
  );

  it('R500,000 has R500,000 in the terms of every top-3 result', () => {
    for (const result of runSearch(en.index, 'R500,000', 'en', { limit: 3 }, BASE)) {
      expect(result.terms).toContain('r500000');
    }
  });

  it('counts every result, however many the cap returns', () => {
    const counted = runSearchCounted(en.index, 'VAT', 'en', {}, BASE);
    expect(counted.results).toHaveLength(30);
    expect(counted.total).toBe(runSearch(en.index, 'VAT', 'en', { limit: 5000 }, BASE).length);
    expect(counted.total).toBeGreaterThan(30);
  });

  it('e-filing, eFiling and efiling find the eFiling glossary entry first', () => {
    for (const query of ['e-filing', 'eFiling', 'efiling']) {
      expect(runSearch(en.index, query, 'en', {}, BASE)[0]?.href, query).toBe(
        `${BASE}glossary/#efiling`,
      );
    }
  });

  it('spaced and joined codes find the same checklist items', () => {
    for (const query of ['VAT 264', 'vat 264', 'VAT264']) {
      expect(
        runSearch(en.index, query, 'en', {}, BASE).map((r) => r.href),
        query,
      ).toContain(`${BASE}checklist/#vehicle-dealer`);
    }
  });

  it('an unknown word with a lone number finds nothing, not every "Prompt 1"', () => {
    expect(runSearch(en.index, 'zzzzqq 1', 'en', {}, BASE)).toEqual([]);
  });

  it('notional prefix-matches "notional input tax"', () => {
    const results = runSearch(en.index, 'notion', 'en', { limit: 5 }, BASE);
    expect(results[0]?.href).toBe(`${BASE}glossary/#notional-input-tax`);
    expect(results.map((result) => result.href)).toContain(
      `${BASE}business-types/vehicle-dealer/#how-notional-input-tax-works`,
    );
  });

  it('PIS ranks the glossary entry first', () => {
    const [first] = runSearch(en.index, 'PIS', 'en', {}, BASE);
    expect(first?.kind).toBe('glossary');
    expect(first?.href).toBe(`${BASE}glossary/#pis`);
  });

  it('the food filter leaves out the vehicle dealer sections', () => {
    const all = runSearch(en.index, 'licence', 'en', { limit: 200 }, BASE);
    const food = runSearch(
      en.index,
      'licence',
      'en',
      { limit: 200, businessTypes: ['food'] },
      BASE,
    );
    const vehicle = (results: typeof all): number =>
      results.filter((result) => result.doc === 'business-types/vehicle-dealer').length;
    expect(vehicle(all)).toBeGreaterThan(0);
    expect(vehicle(food)).toBe(0);
    expect(food.some((result) => result.doc === 'business-types/food')).toBe(true);
  });

  it('a question finds the page that answers it, through the common questions', () => {
    const results = runSearch(en.index, 'Do I need to register a company?', 'en', {}, BASE);
    expect(results[0]?.kind).toBe('answer');
    expect(results[0]?.href).toBe(`${BASE}core/register/`);
  });
});

describe('the index content', () => {
  it('has an entry of every kind', () => {
    const kinds = new Set(en.entries.map((entry) => entry.kind));
    expect([...kinds].sort()).toEqual([...SEARCH_ENTRY_KINDS].sort());
  });

  it('never indexes a hidden section or the "Words used" table as a section', () => {
    const keys = en.entries.map((entry) => entry.key);
    expect(keys).not.toContain('start/how-to-use#making-the-files-easier-to-use');
    expect(keys.some((key) => key.endsWith('#words-used-in-this-file'))).toBe(false);
  });

  it('keeps every key unique', () => {
    const keys = en.entries.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('points every anchor at a heading or glossary entry of its page', () => {
    const input = loadIndexInput('en');
    const anchors = new Map<string, Set<string>>();
    for (const doc of input.docs) anchors.set(doc.id, new Set(doc.headings.map((h) => h.id)));
    const glossaryIds = new Set(input.glossary?.data.entries.map((entry) => entry.id));
    for (const entry of en.entries) {
      if (entry.anchor === undefined) continue;
      const known =
        entry.kind === 'glossary'
          ? glossaryIds.has(entry.anchor)
          : (anchors.get(entry.doc)?.has(entry.anchor) ?? false);
      expect(known, `${entry.key} → #${entry.anchor}`).toBe(true);
    }
  });

  it('marks no entry as English: every document, glossary entry, task and question is translated', () => {
    expect(en.entries.every((entry) => entry.lang === undefined)).toBe(true);
    // WP-40 translated all 36 documents. The English-fallback mark is tested on fixtures
    // (tests/unit/search/entries.test.ts and client.test.ts, tests/dom/search.test.ts).
    expect(af.entries.filter((entry) => entry.lang !== undefined)).toEqual([]);
  });

  it('finds an Afrikaans typo on the real data (A7: belastng → belasting)', () => {
    const results = runSearch(af.index, 'belastng', 'af', { limit: 10 }, BASE);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => /belasting/i.test(result.title))).toBe(true);
    expect(results.every((result) => result.href.startsWith(`${BASE}af/`))).toBe(true);
  });

  it('finds Afrikaans words: omsetbelasting and BTW', () => {
    expect(runSearch(af.index, 'omsetbelasting', 'af', {}, BASE)[0]?.href).toBe(
      `${BASE}af/glossary/#turnover-tax`,
    );
    expect(runSearch(af.index, 'BTW', 'af', {}, BASE).length).toBeGreaterThan(0);
  });

  it('links Afrikaans results under /af/ with the shared English anchors', () => {
    expect(top(af.index, 'VAT264', 3, 'af')).toContain(
      `${BASE}af/business-types/vehicle-dealer/#the-conditions-you-must-meet`,
    );
  });

  it.each(['en', 'af'] as const)('keeps the %s index under the 400 KB gzip budget', (lang) => {
    const built = lang === 'en' ? en : af;
    const size = gzipSync(built.json, { level: 9 }).length;
    expect(size).toBeLessThan(INDEX_BUDGET_GZIP);
  });
});
