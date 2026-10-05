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
import { loadIndex, runSearch, type LoadedIndex } from '../../../src/lib/search-client';
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
