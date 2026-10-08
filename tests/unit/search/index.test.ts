/**
 * The search index built from the real `src/data`, queried with the real client (build plan A7).
 * Nothing here reads `public/search/`: the index is built in memory exactly as
 * `scripts/build-search-index.ts` builds it, so the tests do not depend on a previous build.
 */
import { gzipSync } from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { INDEX_BUDGET_GZIP, serialiseIndex } from '../../../scripts/search/build';
import { actShortName, loadActNames, registerActs } from '../../../scripts/search/acts';
import { loadBestBets, MAX_BEST_BETS, resolveBestBets } from '../../../scripts/search/best-bets';
import { buildEntries } from '../../../scripts/search/entries';
import { loadIndexInput } from '../../../scripts/search/load';
import type { Locale } from '../../../src/i18n/locales';
import {
  loadIndex,
  runSearch,
  runSearchCounted,
  type LoadedIndex,
  type SearchResult,
} from '../../../src/lib/search-client';
import { DOC_WEIGHT, processTerm, tokenize } from '../../../src/lib/search/options';
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
  const { json } = serialiseIndex(lang, sections, entries, resolveBestBets(lang, entries));
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

/** The results that match every word of the query (all words first, then any word). */
function allWords(index: LoadedIndex, query: string, locale: Locale = 'en'): SearchResult[] {
  return runSearch(index, query, locale, { limit: 5000 }, BASE).filter((r) => r.allWords);
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
      const hrefs = (list: SearchResult[]) => list.map((result) => result.href);
      expect(hrefs(allWords(en.index, query))).toEqual(hrefs(allWords(en.index, 'VAT264')));
      expect(top(en.index, query, 8)).toEqual(top(en.index, 'VAT264', 8));
    },
  );

  it('"VAT 264 form" still finds the glossary entry and the conditions section', () => {
    const hrefs = runSearch(en.index, 'VAT 264 form', 'en', {}, BASE).map((r) => r.href);
    expect(hrefs).toContain(`${BASE}glossary/#vat264`);
    expect(hrefs).toContain(`${BASE}business-types/vehicle-dealer/#the-conditions-you-must-meet`);
  });

  // Review WP-33 pass 2, minor 1: the joined form of "page 2" fuzzy-matched every "page". Every
  // result that matches all words holds the number, and they come before the any-word results.
  it.each([
    ['en', 'page 2'],
    ['en', 'route 3'],
    ['en', 'step 1'],
    ['en', 'part 2'],
    ['en', 'prompt 7'],
    ['af', 'stap 1'],
    ['af', 'deel 2'],
  ] as const)('%s "%s" finds the entries that hold the number first', (lang, query) => {
    const built = lang === 'en' ? en : af;
    const number = query.split(' ')[1]!;
    const results = allWords(built.index, query, lang);
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
    const tax = allWords(en.index, 'Tax 2026');
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
    /** A term prefix every result that matches all words holds. */
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
    /** The results begin with this query's all-words results, in order (a known code). */
    readonly startsWith?: string;
    /** Finds at least everything this query finds (a spaced code: its two words). */
    readonly atLeast?: string;
    /** Finds at least everything this query finds with all its words. */
    readonly atLeastAll?: string;
    /** A term the first result holds. */
    readonly firstTerm?: string;
    /** The document the first result is on. */
    readonly firstDoc?: string;
    /** Hrefs found in the first ten results. */
    readonly top10?: readonly string[];
    /** None of this many first results is on a page about the guide (`DOC_WEIGHT`). */
    readonly noGuideIn?: number;
    /** The first result is this query's first result (as finished, unless `typing` says). */
    readonly firstAs?: string;
    /** A route the first result must not be on. */
    readonly notFirst?: string;
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
    {
      kind: 'code, spaced',
      lang: 'en',
      query: 'VAT 264',
      startsWith: 'VAT264',
      atLeast: '264 VAT',
    },
    {
      kind: 'code, spaced',
      lang: 'en',
      query: 'vat 264',
      startsWith: 'VAT264',
      atLeast: '264 vat',
    },
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
      atLeast: '15% VAT',
      // `VAT15` is an incidental pair, not a code: the readings are merged by score (pass 6).
      first: 'glossary/#vat',
    },
    {
      kind: 'code, spaced',
      lang: 'af',
      query: 'BTW 15%',
      first: 'glossary/#vat',
      atLeast: '15% BTW',
    },
    {
      kind: 'code, spaced',
      lang: 'en',
      query: 'brand 5',
      atLeast: '5 brand',
    },
    {
      kind: 'code, spaced',
      lang: 'en',
      query: 'under 100',
      atLeast: '100 under',
    },
    { kind: 'code, spaced', lang: 'af', query: 'werk 5', atLeast: '5 werk' },
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
      atLeastAll: 'R1 million',
      digitTerms: ['r1000000'],
    },
    {
      kind: 'rand amount, in millions',
      lang: 'en',
      query: 'R2 300 000',
      sameAs: 'R2,300,000',
      atLeastAll: 'R2.3 million',
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
    // Review WP-33 pass 6, minor 2: amounts in millions written short.
    {
      kind: 'rand amount, in millions, short',
      lang: 'en',
      query: 'R1m',
      atLeastAll: 'R1 million',
      digitTerms: ['r1000000'],
    },
    {
      kind: 'rand amount, in millions, short',
      lang: 'af',
      query: 'R1m',
      atLeastAll: 'R1 miljoen',
      digitTerms: ['r1000000'],
    },
    {
      kind: 'rand amount, in millions, short',
      lang: 'en',
      query: 'R10m',
      top3: ['glossary/#qse'],
      digitTerms: ['r10000000'],
    },
    { kind: 'rand amount, in millions, short', lang: 'en', query: 'R2.3m', sameAs: 'R2 300 000' },
    {
      kind: 'rand amount, in millions, short',
      lang: 'af',
      query: 'R2,3m',
      sameAs: 'R2 300 000',
      atLeastAll: 'R2.3 miljoen',
    },
    // Finished (Enter, the search page): `R1` is R1, never R146.
    { kind: 'rand amount, finished', lang: 'en', query: 'R1', typing: false, digitTerms: ['r1'] },
    { kind: 'rand amount, being typed', lang: 'en', query: 'R500', typing: true, every: 'r500' },
    { kind: 'year', lang: 'en', query: 'Tax 2026', every: '2026' },
    { kind: 'year', lang: 'af', query: '2027', digitTerms: ['2027'] },
    { kind: 'tax year', lang: 'en', query: '2026/27', sameAs: '2026/2027', every: '2027' },
    { kind: 'tax year', lang: 'af', query: '2026/27', sameAs: '2026/2027', every: '2027' },
    { kind: 'tax year', lang: 'en', query: '2026-27', sameAs: '2026/27' },
    { kind: 'tax year', lang: 'af', query: '2026-27', sameAs: '2026/27' },
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
    // Pass 13: `kontrolelys` is a best bet for the Master checklist ("Hoofkontrolelys"), which the end
    // of a compound cannot reach by prefix.
    { kind: 'Afrikaans compound', lang: 'af', query: 'kontrolelys', first: 'checklist/' },
    { kind: 'Afrikaans compound', lang: 'af', query: 'belastingjaar', firstTerm: 'belastingjaar' },
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
      // Pass 13: the quick answers carry their page's lead, and Tax and SARS's lead is "Numbers
      // here are for the tax year 1 March 2026 to 28 February 2027": the page leads, its calendar
      // follows.
      firstDoc: 'core/tax-and-sars',
      top3: ['core/tax-and-sars/#your-tax-year-calendar'],
    },
    {
      kind: 'mixed',
      lang: 'en',
      query: 'ITR 14 deadline',
      top3: ['glossary/#itr14'],
    },
    // Review WP-33 pass 6, major 2 and pass 7, minor 1: a topic and "deadline". The corrections
    // log names both in passing, but it is about the guide: the topic's own entry comes first.
    { kind: 'topic + deadline', lang: 'en', query: 'PAYE deadline', first: 'glossary/#paye' },
    // Review WP-33 pass 8, major: the pages about the guide, asked for by name, come first.
    {
      kind: 'page about the guide, by name',
      lang: 'en',
      query: 'how this was made',
      // Pass 9: asked for by its title, the page leads with its first section.
      firstDoc: 'start/how-this-was-made',
    },
    {
      kind: 'page about the guide, by name',
      lang: 'af',
      query: 'hoe dit gemaak is',
      firstDoc: 'start/how-this-was-made',
    },
    {
      kind: 'page about the guide, by name',
      lang: 'en',
      query: 'what has changed',
      first: 'start/what-has-changed/',
    },
    {
      kind: 'page about the guide, by name',
      lang: 'af',
      query: 'wat het verander',
      first: 'start/what-has-changed/',
    },
    {
      kind: 'page about the guide, by name',
      lang: 'en',
      query: 'AI generated',
      // Pass 9: not the page's title, and also a branding question ("Ownership of what the AI
      // makes" leads): the disclosure keeps its weighted place, in the first ten.
      top10: ['start/how-this-was-made/#this-toolkit-was-generated-by-ai'],
    },
    {
      kind: 'page about the guide, by name',
      lang: 'af',
      query: 'KI gegenereer',
      top10: ['start/how-this-was-made/#this-toolkit-was-generated-by-ai'],
    },
    {
      kind: 'page about the guide, by name',
      lang: 'af',
      query: 'regstellings',
      first: 'start/how-this-was-made/#corrections-log',
    },
    {
      kind: 'page about the guide, by name',
      lang: 'en',
      query: 'corrections',
      first: 'start/how-this-was-made/#corrections-log',
    },
    // Review WP-33 pass 9, major: a common word that a heading on a page about the guide names
    // (the changelog's notes name other pages) opens the topic, never that page.
    { kind: 'common word', lang: 'en', query: 'register', first: 'core/register/', noGuideIn: 3 },
    {
      kind: 'common word',
      lang: 'en',
      query: 'name',
      first: 'glossary/#trading-name',
      noGuideIn: 3,
    },
    {
      kind: 'common word',
      lang: 'en',
      query: 'branding',
      first: 'branding/branding-prompts/',
      noGuideIn: 3,
    },
    { kind: 'common word', lang: 'en', query: 'business', noGuideIn: 3 },
    { kind: 'common word', lang: 'en', query: 'business', typing: true, noGuideIn: 3 },
    // The quarter weight decides this one: "How to check anything in this toolkit" scores more
    // than "Other things to check" before it is weighed.
    {
      kind: 'common word',
      lang: 'en',
      query: 'check',
      first: 'core/vehicles/#other-things-to-check',
      noGuideIn: 3,
    },
    { kind: 'common word', lang: 'en', query: 'change', noGuideIn: 3 },
    {
      kind: 'common word',
      lang: 'en',
      query: 'start here',
      first: 'start/start-here/',
      noGuideIn: 3,
    },
    // A changelog note is titled "… paste under the heading "Choosing the name"": it holds both
    // words in its heading, so it keeps its weighted place (3rd), after the section itself.
    {
      kind: 'common word',
      lang: 'en',
      query: 'choosing the name',
      first: 'core/register/#choosing-the-name',
      noGuideIn: 2,
    },
    {
      kind: 'common word',
      lang: 'en',
      query: 'materials',
      first: 'branding/mood-and-materials/#prompt-b-materials-and-finishes',
      noGuideIn: 3,
    },
    {
      kind: 'common word, being typed',
      lang: 'en',
      query: 'regist',
      typing: true,
      first: 'glossary/#registered-name',
      noGuideIn: 3,
    },
    {
      kind: 'common word, being typed',
      lang: 'en',
      query: 'nam',
      typing: true,
      first: 'glossary/#trading-name',
      noGuideIn: 3,
    },
    {
      kind: 'common word, being typed',
      lang: 'en',
      query: 'brand',
      typing: true,
      first: 'branding/brand-applications-and-polish/',
      noGuideIn: 3,
    },
    { kind: 'common word', lang: 'af', query: 'registreer', first: 'core/register/', noGuideIn: 3 },
    {
      kind: 'common word, being typed',
      lang: 'af',
      query: 'registreer',
      typing: true,
      first: 'core/register/',
      noGuideIn: 3,
    },
    {
      kind: 'common word',
      lang: 'af',
      query: 'naam',
      first: 'glossary/#registered-name',
      noGuideIn: 3,
    },
    { kind: 'common word', lang: 'af', query: 'besigheid', noGuideIn: 3 },
    {
      kind: 'common word',
      lang: 'af',
      query: 'materiale',
      first: 'branding/mood-and-materials/#prompt-b-materials-and-finishes',
      noGuideIn: 3,
    },
    { kind: 'common word', lang: 'af', query: 'register', noGuideIn: 3 },
    // The Afrikaans guide says "handelsmerk"; one prompt holds "branding". Since pass 15 a word of
    // the guide is never read as a typo, so `branding` no longer finds "Handelsnaam (trading
    // name)" and the prompt leads, ahead of the changelog's quoted English titles.
    {
      kind: 'common word',
      lang: 'af',
      query: 'branding',
      first: 'branding/marketing-prompts/#prompt-1-content-pillars',
      noGuideIn: 1,
    },
    // Review WP-33 pass 10, major: a page is named by its navigation title or by the H1 it shows.
    {
      kind: 'page title (H1)',
      lang: 'en',
      query: 'AI disclosure',
      firstDoc: 'start/how-this-was-made',
    },
    {
      kind: 'page title (H1)',
      lang: 'af',
      query: 'KI-openbaarmaking',
      firstDoc: 'start/how-this-was-made',
    },
    {
      kind: 'page title (H1)',
      lang: 'af',
      query: 'KI openbaarmaking',
      firstDoc: 'start/how-this-was-made',
    },
    { kind: 'page title (H1)', lang: 'en', query: 'changelog', first: 'start/what-has-changed/' },
    {
      kind: 'page title (H1)',
      lang: 'af',
      query: 'veranderingslys',
      first: 'start/what-has-changed/',
    },
    { kind: 'page title (H1)', lang: 'en', query: 'redline', first: 'start/what-has-changed/' },
    // One word of a two-word title does not name the page.
    { kind: 'page title, one word of it', lang: 'en', query: 'disclosure', noGuideIn: 1 },
    { kind: 'page title, one word of it', lang: 'en', query: 'AI', noGuideIn: 1 },
    // Review WP-33 pass 10, minor 1: `has` counts as `het` does.
    { kind: 'page title', lang: 'en', query: 'what changed', first: 'start/what-has-changed/' },
    { kind: 'page title', lang: 'en', query: 'changed', first: 'start/what-has-changed/' },
    // `verander` is the whole of "Wat het verander" after stop words, as `changed` is of "What has
    // changed": it names the page. Its beginnings while typed do not.
    { kind: 'page title', lang: 'af', query: 'verander', first: 'start/what-has-changed/' },
    { kind: 'page title, being typed', lang: 'af', query: 've', typing: true, noGuideIn: 3 },
    { kind: 'page title, being typed', lang: 'af', query: 'ver', typing: true, noGuideIn: 3 },
    { kind: 'page title, being typed', lang: 'af', query: 'verande', typing: true, noGuideIn: 3 },
    // Review WP-33 pass 10, minor 2, and nit 3 (a title word still being typed).
    {
      kind: 'page title',
      lang: 'en',
      query: 'marketing prompts',
      firstDoc: 'branding/marketing-prompts',
    },
    {
      kind: 'page title, being typed',
      lang: 'en',
      query: 'marketing prom',
      typing: true,
      firstDoc: 'branding/marketing-prompts',
    },
    { kind: 'page title', lang: 'en', query: 'tax and sars', first: 'core/tax-and-sars/' },
    { kind: 'page title', lang: 'af', query: 'Belasting en SARS', first: 'core/tax-and-sars/' },
    {
      kind: 'page title',
      lang: 'en',
      query: 'you are the business',
      first: 'core/you-are-the-business/',
    },
    {
      kind: 'page title',
      lang: 'af',
      query: 'Jy is die besigheid',
      first: 'core/you-are-the-business/',
    },
    // Review WP-33 pass 11, nit 1: a one-word title leads while that word is typed, after another
    // word (stop words count); alone, its beginning names nothing (`verande` above).
    {
      kind: 'page title, being typed',
      lang: 'en',
      query: 'you are the busine',
      typing: true,
      first: 'core/you-are-the-business/',
    },
    {
      kind: 'page title, being typed',
      lang: 'af',
      query: 'jy is die besighe',
      typing: true,
      first: 'core/you-are-the-business/',
    },
    {
      kind: 'page title, being typed',
      lang: 'af',
      query: 'wat het verand',
      typing: true,
      first: 'start/what-has-changed/',
    },
    {
      kind: 'page title, being typed',
      lang: 'af',
      query: 'KI-openb',
      typing: true,
      firstDoc: 'start/how-this-was-made',
    },
    // Review WP-33 pass 12, major: a stop word and a whole word is a finished query, not a typed
    // one, so `my belasting` does not name "Belastingfaktuur" (the VAT tax invoice template).
    ...[
      'my belasting',
      'die belasting',
      'jou belasting',
      'van belasting',
      'wat is belasting',
      'wat is die belasting',
    ].map((query): Row => ({
      kind: 'stop word and a word, being typed',
      lang: 'af',
      query,
      typing: true,
      firstDoc: 'core/tax-and-sars',
      notFirst: 'templates/',
    })),
    ...['my tax', 'the tax', 'your tax', 'what is tax'].map((query): Row => ({
      kind: 'stop word and a word, being typed',
      lang: 'en',
      query,
      typing: true,
      firstAs: 'tax',
      notFirst: 'templates/',
    })),
    // Review WP-33 pass 12, minor 1: a misspelt word keeps the heading lift.
    {
      kind: 'typo, heading',
      lang: 'en',
      query: 'cipc anual return',
      first: 'core/running-a-pty-ltd/#1-cipc-annual-return',
    },
    {
      kind: 'typo, heading',
      lang: 'en',
      query: 'cipc anual return',
      typing: false,
      first: 'core/running-a-pty-ltd/#1-cipc-annual-return',
    },
    {
      kind: 'typo, heading',
      lang: 'af',
      query: 'cipc jarlikse opgawe',
      first: 'core/running-a-pty-ltd/#1-cipc-annual-return',
    },
    {
      kind: 'typo, heading',
      lang: 'af',
      query: 'voorlopige belastnig',
      first: 'core/tax-and-sars/#provisional-tax',
    },
    {
      kind: 'typo, heading',
      lang: 'af',
      query: 'voorlopige belastnig',
      typing: false,
      first: 'core/tax-and-sars/#provisional-tax',
    },
    // Review WP-33 pass 12, minor 2: a dropped letter that leaves the beginning of another word
    // ("registration", "companies") is a typo, not that word.
    {
      kind: 'typo, beginning of another word',
      lang: 'en',
      query: 'registr for vat',
      first: 'core/tax-and-sars/',
      notFirst: 'templates/',
    },
    {
      kind: 'typo, beginning of another word',
      lang: 'en',
      query: 'registr for vat',
      typing: false,
      first: 'core/tax-and-sars/',
    },
    {
      kind: 'typo, beginning of another word',
      lang: 'en',
      query: 'register a compani',
      typing: false,
      first: 'core/register/',
    },
    // Review WP-33 pass 11, minor 2: a page's title is not in its first entry's heading field, so
    // the overview page does not beat the template asked for.
    { kind: 'template', lang: 'en', query: 'quote template', first: 'templates/quotation/' },
    { kind: 'template', lang: 'af', query: 'kwotasie sjabloon', first: 'templates/quotation/' },
    // Review WP-33 pass 10, minor 3: an entry whose heading holds every word before one that
    // holds them only in its text.
    {
      kind: 'heading before text',
      lang: 'af',
      query: 'BTW-registrasie',
      typing: false,
      first: 'core/tax-and-sars/#vat-probably-not-yet',
    },
    { kind: 'topic + deadline', lang: 'en', query: 'EMP201 deadline', first: 'glossary/#emp201' },
    { kind: 'topic + deadline', lang: 'en', query: 'UIF deadline', first: 'glossary/#uif' },
    { kind: 'topic + deadline', lang: 'en', query: 'ITR14 deadline', first: 'glossary/#itr14' },
    {
      kind: 'topic + deadline, being typed',
      lang: 'en',
      query: 'EMP201 dead',
      typing: true,
      first: 'glossary/#emp201',
    },
    {
      kind: 'topic + deadline',
      lang: 'af',
      query: 'EMP201 sperdatum',
      first: 'glossary/#emp201',
    },
    { kind: 'topic + deadline', lang: 'af', query: 'ITR14 sperdatum', first: 'glossary/#itr14' },
    {
      kind: 'all words, then any word',
      lang: 'en',
      query: 'sell second hand cars',
      first: 'core/what-you-need-to-sell-things/#if-you-sell-second-hand-goods',
    },
    { kind: 'mixed', lang: 'en', query: 'VAT rate 15%', top3: ['glossary/#vat'] },
  ];

  it.each(ROWS.map((row) => [row.kind, row.lang, row.query, row] as const))(
    '%s (%s): "%s"',
    (_kind, lang, query, row) => {
      const built = lang === 'en' ? en : af;
      const prefix = lang === 'en' ? BASE : `${BASE}af/`;
      const counted = (q: string) =>
        runSearchCounted(built.index, q, lang, { limit: 5000, typing: row.typing }, BASE);
      const search = (q: string) => counted(q).results;
      const allWords = (q: string) => {
        return counted(q).results.filter((r) => r.allWords);
      };
      const results = search(query);
      const matched = allWords(query);
      const hrefs = results.map((r) => r.href);
      if (row.empty) {
        expect(hrefs).toEqual([]);
        return;
      }
      expect(results.length).toBeGreaterThan(0);
      if (row.first !== undefined) expect(hrefs[0]).toBe(`${prefix}${row.first}`);
      for (const href of row.top3 ?? []) expect(hrefs.slice(0, 3)).toContain(`${prefix}${href}`);
      if (row.firstTerm !== undefined) expect(results[0]?.terms).toContain(row.firstTerm);
      if (row.firstDoc !== undefined) expect(results[0]?.doc).toBe(row.firstDoc);
      if (row.firstAs !== undefined) expect(hrefs[0]).toBe(search(row.firstAs)[0]?.href);
      if (row.notFirst !== undefined) expect(hrefs[0]).not.toContain(`/${row.notFirst}`);
      for (const href of row.top10 ?? []) expect(hrefs.slice(0, 10)).toContain(`${prefix}${href}`);
      for (const result of results.slice(0, row.noGuideIn ?? 0)) {
        expect(DOC_WEIGHT[result.doc], result.href).toBeUndefined();
      }
      if (row.atLeast !== undefined) {
        const found = new Set(hrefs);
        const other = search(row.atLeast);
        expect(other.length).toBeGreaterThan(0);
        for (const result of other) expect(found.has(result.href), result.href).toBe(true);
      }
      if (row.atLeastAll !== undefined) {
        const found = new Set(hrefs);
        const other = allWords(row.atLeastAll);
        expect(other.length).toBeGreaterThan(0);
        for (const result of other) expect(found.has(result.href), result.href).toBe(true);
      }
      if (row.sameAs !== undefined) expect(hrefs).toEqual(search(row.sameAs).map((r) => r.href));
      if (row.startsWith !== undefined) {
        // The leading run of all-words results (a page about the guide that names the code in
        // passing ranks later).
        const list = search(row.startsWith);
        const lead = list.findIndex((r) => !r.allWords);
        const joined = list
          .slice(0, lead < 0 ? list.length : lead)
          .filter((r) => DOC_WEIGHT[r.doc] === undefined)
          .map((r) => r.href);
        expect(joined.length).toBeGreaterThan(0);
        expect(hrefs.slice(0, joined.length)).toEqual(joined);
      }
      for (const result of matched) {
        if (row.every !== undefined) {
          expect(
            result.terms.some((t) => t.startsWith(row.every!)),
            result.href,
          ).toBe(true);
        }
      }
      for (const result of results) {
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

  // Review WP-33 pass 6, major 2: any word after all words, always, not only when all words find
  // nothing.
  it('lists the any-word results after the all-words results', () => {
    const counted = runSearchCounted(en.index, 'turnover tax', 'en', { limit: 5000 }, BASE);
    expect(counted.matchedAll).toBeGreaterThan(0);
    expect(counted.total).toBeGreaterThan(counted.matchedAll);
    const holdsBoth = (r: SearchResult) =>
      r.terms.some((t) => t.startsWith('turnover')) && r.terms.some((t) => t.startsWith('tax'));
    const first = counted.results.slice(
      0,
      counted.results.findIndex((r) => !r.allWords),
    );
    expect(first.length).toBeGreaterThan(0);
    expect(first.every(holdsBoth)).toBe(true);
    // Every result listed as matching all words holds both, and only pages about the guide that
    // name them in passing hold both but are listed with the rest.
    for (const result of counted.results) {
      if (result.allWords) expect(holdsBoth(result), result.href).toBe(true);
      else if (holdsBoth(result)) expect(DOC_WEIGHT[result.doc], result.href).toBeDefined();
    }
    // After the first any-word result, only pages about the guide still match all words (they
    // name the topic in passing: see the next test).
    const later = counted.results.slice(first.length).filter((r) => r.allWords);
    expect(later.every((r) => r.doc.startsWith('start/'))).toBe(true);
  });

  // Review WP-33 pass 7, minor 1: a page about the guide that names the topic in passing ranks
  // with the any-word results, by a quarter of its score. Pass 9, nit: the count of results that
  // match every word is the block listed first, so it leaves the log out.
  it('ranks the corrections log with the any-word results when the query is about a topic', () => {
    const counted = runSearchCounted(en.index, 'EMP201 deadline', 'en', { limit: 5000 }, BASE);
    const hrefs = counted.results.map((r) => r.href);
    const log = hrefs.indexOf(`${BASE}start/how-this-was-made/#corrections-log`);
    expect(log).toBeGreaterThan(hrefs.indexOf(`${BASE}glossary/#emp201`));
    expect(log).toBeGreaterThan(1);
    expect(counted.results[log]?.allWords).toBe(false);
    expect(counted.matchedAll).toBe(0);
  });

  // Review WP-33 pass 10, major: every page's navigation title and H1, in both languages, as
  // typed and as finished, opens that page. Generated from the data, so a new page is covered.
  // Two pages share a title ("Start here", "Begin hier"): both then open first and second.
  it.each(['en', 'af'] as const)('%s: every page title and H1 opens its page', (lang) => {
    const built = lang === 'en' ? en : af;
    const input = loadIndexInput(lang);
    const byTitle = new Map<string, Set<string>>();
    for (const doc of input.docs) {
      for (const title of [doc.title, doc.h1]) {
        const docs = byTitle.get(title) ?? new Set<string>();
        docs.add(doc.id);
        byTitle.set(title, docs);
      }
    }
    expect(byTitle.size).toBeGreaterThan(input.docs.length);
    for (const [title, docs] of byTitle) {
      for (const typing of [false, true]) {
        const results = runSearch(built.index, title, lang, { limit: 10, typing }, BASE);
        const first = results.slice(0, docs.size).map((r) => r.doc);
        expect(new Set(first), `${title} (typing: ${String(typing)})`).toEqual(docs);
      }
    }
  });

  // Review WP-33 pass 11, minor 1: a heading lifts an entry only when it holds the words as
  // written. "Where South African small businesses actually get customers" (Marketing prompts)
  // holds `market` and `stall` only as "marketing" and "small"; the retail page's "Do you need a
  // licence", which says market stalls need a trading permit, ranks above it.
  it('does not lift a heading that only resembles the words: market stall', () => {
    for (const typing of [false, true]) {
      const hrefs = runSearch(en.index, 'market stall', 'en', { limit: 5000, typing }, BASE).map(
        (r) => r.href,
      );
      const licence = hrefs.indexOf(`${BASE}business-types/retail-online/#do-you-need-a-licence`);
      const marketing = hrefs.indexOf(
        `${BASE}branding/marketing-prompts/#where-south-african-small-businesses-actually-get-customers`,
      );
      expect(licence).toBeGreaterThanOrEqual(0);
      expect(marketing === -1 || licence < marketing, `typing: ${String(typing)}`).toBe(true);
      expect(hrefs[0]).not.toMatch(/\/branding\//);
    }
  });

  // Review WP-33 pass 13: every best-bet phrase (`content-meta/search-best-bets.json`), finished
  // and typed, opens its target first, in both languages. Generated from the file.
  it.each(['en', 'af'] as const)('%s: every best bet opens its target first', (lang) => {
    const built = lang === 'en' ? en : af;
    const prefix = lang === 'en' ? BASE : `${BASE}af/`;
    const file = loadBestBets();
    let phrases = 0;
    for (const bet of file.bets) {
      const route = built.entries.find((e) => e.doc === bet.doc)?.route;
      const target = `${prefix}${route ?? ''}${bet.anchor === undefined ? '' : `#${bet.anchor}`}`;
      for (const phrase of bet[lang]) {
        phrases++;
        for (const typing of [false, true]) {
          const first = runSearch(built.index, phrase, lang, { limit: 3, typing }, BASE)[0];
          expect(first?.href, `${phrase} (typing: ${String(typing)})`).toBe(target);
        }
      }
    }
    expect(phrases).toBeGreaterThan(20);
    expect(phrases).toBeLessThanOrEqual(MAX_BEST_BETS);
  });

  // Review WP-33 pass 13, major: registering the business opens the Register page, typed and
  // finished, in both languages; never a vehicle dealer section.
  it.each([
    ['en', 'register my business'],
    ['en', 'register a business'],
    ['en', 'register business'],
    ['en', 'how do i register my business'],
    ['af', 'registreer my besigheid'],
    ['af', 'registreer besigheid'],
    ['af', 'hoe registreer ek my besigheid'],
  ] as const)('%s "%s" opens the Register page', (lang, query) => {
    const built = lang === 'en' ? en : af;
    for (const typing of [false, true]) {
      const first = runSearch(built.index, query, lang, { limit: 1, typing }, BASE)[0];
      expect(first?.doc, `typing: ${String(typing)}`).toBe('core/register');
      expect(first?.anchor).toBeUndefined();
    }
  });

  // Review WP-33 pass 14, major: the owner's own words around "register business" are filler, so
  // every phrasing opens the Register page, typed and finished.
  it.each([
    ['en', 'register my own business'],
    ['en', 'register a new business'],
    ['en', 'register new business'],
    ['en', 'register my small business'],
    ['en', 'register small business'],
    ['en', 'how do i register my small business'],
    ['af', 'registreer my eie besigheid'],
    ['af', "registreer 'n nuwe besigheid"],
  ] as const)('%s "%s" opens the Register page', (lang, query) => {
    const built = lang === 'en' ? en : af;
    for (const typing of [false, true]) {
      const first = runSearch(built.index, query, lang, { limit: 1, typing }, BASE)[0];
      expect(first?.doc, `typing: ${String(typing)}`).toBe('core/register');
      expect(first?.anchor).toBeUndefined();
    }
  });

  // Review WP-33 pass 14: an extra word that is not filler blocks a best bet; the related
  // sections keep their own queries.
  it.each([
    ['en', 'tax threshold', 'glossary/#tax-threshold'],
    [
      'en',
      'small business corporation',
      'core/tax-and-sars/#route-4-small-business-corporation-rates-companies-only',
    ],
    ['en', 'new lines of business', 'core/adding-new-lines/'],
  ] as const)('%s "%s" is not a best bet: it opens %s', (lang, query, first) => {
    const built = lang === 'en' ? en : af;
    expect(runSearch(built.index, query, lang, { limit: 1, typing: false }, BASE)[0]?.href).toBe(
      `${BASE}${first}`,
    );
  });

  // Review WP-33 pass 14, minors 1 to 3.
  it.each([
    ['en', 'annual return', 'glossary/#annual-return'],
    ['af', 'jaarlikse opgawe', 'glossary/#annual-return'],
    ['af', 'BTW-registrasie', 'core/tax-and-sars/#vat-probably-not-yet'],
    ['af', 'BTW-drempel', 'core/tax-and-sars/#vat-probably-not-yet'],
    ['en', 'do i need to register for vat', 'core/tax-and-sars/#vat-probably-not-yet'],
    ['en', 'tax return', 'core/tax-and-sars/'],
    ['af', 'belastingopgawe', 'core/tax-and-sars/'],
  ] as const)('%s "%s" opens %s, typed and finished', (lang, query, first) => {
    const built = lang === 'en' ? en : af;
    const prefix = lang === 'en' ? BASE : `${BASE}af/`;
    for (const typing of [false, true]) {
      expect(
        runSearch(built.index, query, lang, { limit: 1, typing }, BASE)[0]?.href,
        `typing: ${String(typing)}`,
      ).toBe(`${prefix}${first}`);
    }
  });

  // Review WP-33 pass 14, minor 4: a quick answer that matches only through its page's lead
  // ranks with the any-word results. Since pass 15 "need" is a filler word, so the Register page
  // leads through its best bet, and the lead-only answers stay out of the first three.
  it.each([
    [
      'en',
      'do i need a company',
      ['What does a Pty Ltd cost me every year?', 'Do I need an audit?'],
    ],
    [
      'af',
      "het ek 'n maatskappy nodig",
      ['Wat kos ’n Pty Ltd my elke jaar?', 'Het ek ’n oudit nodig?'],
    ],
  ] as const)(
    '%s "%s" lists no lead-only quick answer before the Register sections',
    (lang, query, leadOnly) => {
      const built = lang === 'en' ? en : af;
      const prefix = lang === 'en' ? BASE : `${BASE}af/`;
      const top3 = runSearch(built.index, query, lang, { limit: 3, typing: false }, BASE);
      expect(top3[0]?.href).toBe(`${prefix}core/register/`);
      for (const title of leadOnly) expect(top3.map((r) => r.title)).not.toContain(title);
    },
  );

  // Review WP-33 pass 14, nit 1: a typed beginning that also begins another word of the guide is
  // not yet a best bet.
  it.each([
    ['af', 'maatskap', 'core/running-a-pty-ltd/#4-sars-company-tax'],
    ['af', 'maatskapp', 'core/running-a-pty-ltd/#4-sars-company-tax'],
    ['af', 'handels', 'core/what-you-need-to-sell-things/'],
  ] as const)('%s "%s", typed, does not open the best bet %s', (lang, query, bet) => {
    expect(runSearch(af.index, query, lang, { limit: 1, typing: true }, BASE)[0]?.href).not.toBe(
      `${BASE}af/${bet}`,
    );
  });

  // Review WP-33 pass 19, major 2: every Act in the register opens "Legislation this toolkit
  // relies on" by its English name and every alias, in both indexes (Afrikaans aliases in the
  // Afrikaans one), finished and typed, also with its number and year.
  it.each(['en', 'af'] as const)(
    '%s: every register Act opens the Legislation entry by name',
    (lang) => {
      const built = lang === 'en' ? en : af;
      const names = loadActNames();
      const target = `${BASE}${lang === 'en' ? '' : 'af/'}sources/#legislation-this-toolkit-relies-on`;
      const misses: string[] = [];
      let asked = 0;
      for (const act of registerActs(lang)) {
        const extra = names.acts.find((entry) => entry.id === act.id);
        const queries = [
          actShortName(act.name),
          act.name,
          ...(extra?.en ?? []),
          ...(lang === 'af' ? (extra?.af ?? []) : []),
        ];
        for (const query of queries) {
          for (const typing of [false, true]) {
            asked++;
            const first = runSearch(built.index, query, lang, { limit: 1, typing }, BASE)[0];
            if (first?.href !== target)
              misses.push(`${query} (typing: ${String(typing)}) -> ${first?.href ?? 'none'}`);
          }
        }
      }
      expect(asked).toBeGreaterThan(40);
      expect(misses).toEqual([]);
    },
  );

  // Review WP-33 pass 17, major 5: "what is" / "wat is" plus a glossary term, or the alias in its
  // brackets, opens that glossary entry first, finished and typed, for every term in both languages.
  it.each(['en', 'af'] as const)(
    '%s: "what is" plus every glossary term opens its entry',
    (lang) => {
      const built = lang === 'en' ? en : af;
      const ask = lang === 'en' ? 'what is' : 'wat is';
      const misses: string[] = [];
      let asked = 0;
      for (const entry of built.entries.filter((e) => e.kind === 'glossary')) {
        const names = [
          entry.title.replace(/\s*\([^)]*\)/g, ''),
          ...[...entry.title.matchAll(/\(([^)]*)\)/g)].map((match) => match[1] ?? ''),
        ].filter((name) => name.trim() !== '');
        for (const name of names) {
          for (const typing of [false, true]) {
            asked++;
            const first = runSearch(
              built.index,
              `${ask} ${name}`,
              lang,
              { limit: 1, typing },
              BASE,
            )[0];
            if (first?.doc !== entry.doc || first.anchor !== entry.anchor) {
              misses.push(`${ask} ${name} (typing: ${String(typing)}) -> ${first?.href ?? 'none'}`);
            }
          }
        }
      }
      expect(asked).toBeGreaterThan(200);
      expect(misses).toEqual([]);
    },
  );

  // Review WP-33 pass 15, major 2, the ranking half: without the best bets, `deregister` and
  // `deregistreer` are words of the guide, never read as typos of "register" and "registreer", so
  // the ranking alone does not open the Register page (finished and typed).
  it.each([
    ['en', 'deregister my business'],
    ['en', 'deregister business'],
    ['af', 'deregistreer my besigheid'],
    ['af', 'deregistreer besigheid'],
  ] as const)('%s "%s" does not open Register by ranking alone', (lang, query) => {
    const entries = buildEntries(loadIndexInput(lang));
    const plain = loadIndex(JSON.parse(serialiseIndex(lang, [], entries).json), lang);
    const prefix = lang === 'en' ? BASE : `${BASE}af/`;
    for (const typing of [false, true]) {
      const top3 = runSearch(plain, query, lang, { limit: 3, typing }, BASE).map((r) => r.href);
      expect(top3, `typing: ${String(typing)}`).not.toContain(`${prefix}core/register/`);
    }
  });

  // Review WP-33 pass 13, major, the ranking half: without the best bets, a quick answer carries
  // its page's lead, so "Do I need to register a company?" ("…for a one-person business…")
  // answers `register my business` in English. (The Afrikaans lead says "eenpersoonbesigheid", a
  // compound the word `besigheid` cannot reach: there the best bet does the work.)
  it('finds the Register page for "register my business" by ranking alone', () => {
    const input = loadIndexInput('en');
    const entries = buildEntries(input);
    const plain = loadIndex(JSON.parse(serialiseIndex('en', [], entries).json), 'en');
    const first = runSearch(plain, 'register my business', 'en', { typing: false }, BASE)[0];
    expect(first?.href).toBe(`${BASE}core/register/`);
  });

  // Review WP-33 pass 13, minor: `tax` and `my tax` open Tax and SARS, not "Dividends tax".
  it.each(['tax', 'my tax'])('"%s" opens Tax and SARS', (query) => {
    for (const typing of [false, true]) {
      expect(runSearch(en.index, query, 'en', { limit: 1, typing }, BASE)[0]?.doc).toBe(
        'core/tax-and-sars',
      );
    }
  });

  // Review WP-33 pass 13: a best bet is the whole query, or its typed beginning; never a typo or a
  // longer query.
  it('pins a best bet only for its own words', () => {
    const first = (query: string, typing = false) =>
      runSearch(en.index, query, 'en', { limit: 1, typing }, BASE)[0]?.href;
    expect(first('How do I register my business?')).toBe(`${BASE}core/register/`);
    expect(first('register my busi', true)).toBe(`${BASE}core/register/`);
    // Not a best bet: a longer query, a typo, a typed beginning shorter than four letters.
    expect(first('tax threshold')).not.toBe(`${BASE}core/tax-and-sars/`);
    expect(first('quotte')).not.toBe(first('quote'));
    expect(first('che', true)).not.toBe(`${BASE}checklist/`);
  });

  // Review WP-33 pass 9, nit: the count is the block listed first, whatever the pages.
  it('counts exactly the results listed first as matching every word', () => {
    for (const query of ['corrections', 'EMP201 deadline', 'how this was made', 'register']) {
      const counted = runSearchCounted(en.index, query, 'en', { limit: 5000 }, BASE);
      const lead = counted.results.findIndex((r) => !r.allWords);
      expect(counted.matchedAll, query).toBe(lead < 0 ? counted.results.length : lead);
      expect(
        counted.results.filter((r) => r.allWords),
        query,
      ).toHaveLength(counted.matchedAll);
    }
  });

  // Review WP-33 pass 9, minor: the quarter weight is applied to every result from a page about
  // the guide, so it can never climb over a topic on its raw score.
  it('weighs a result from a page about the guide a quarter', () => {
    const scoreOf = (query: string, href: string) =>
      runSearch(en.index, query, 'en', { limit: 5000, typing: false }, BASE).find(
        (r) => r.href === `${BASE}${href}`,
      )?.score;
    const check = scoreOf(
      'check',
      'start/how-this-was-made/#how-to-check-anything-in-this-toolkit',
    );
    const vehicles = scoreOf('check', 'core/vehicles/#other-things-to-check');
    expect(check).toBeDefined();
    expect(vehicles).toBeDefined();
    expect(check!).toBeLessThan(vehicles!);
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
