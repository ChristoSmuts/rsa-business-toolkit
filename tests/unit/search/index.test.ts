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

  // Review WP-33 pass 1, major 1: a spaced code made the query stricter (1 result), not looser.
  it.each(['VAT 264', 'vat 264', 'VAT 264 form'])(
    '"%s" finds what VAT264 finds: the glossary entry and the conditions section',
    (query) => {
      const hrefs = runSearch(en.index, query, 'en', {}, BASE).map((result) => result.href);
      expect(hrefs).toContain(`${BASE}glossary/#vat264`);
      expect(hrefs).toContain(`${BASE}business-types/vehicle-dealer/#the-conditions-you-must-meet`);
    },
  );

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
