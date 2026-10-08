/**
 * The search client (build plan A7). Loads one language's index the first time it is needed and
 * answers queries with typed results whose `href` is built through `href()`, so a result links to
 * the right page under the base path and the locale prefix, with the heading's anchor.
 *
 * No DOM: the custom element (`src/scripts/search.ts`) renders what this returns, and the unit
 * tests run it in node. The network is reached only through the injected `fetch`, and only for the
 * one same-origin URL the page gives it.
 */
import MiniSearch, { type SearchResult as MiniSearchResult } from 'minisearch';
import type { Locale } from './paths';
import { href } from './paths';
import {
  betWords,
  DOC_WEIGHT,
  dropWrittenFiller,
  REFERENCE_WEIGHT,
  SOURCE_WORDS,
  FIELD_BOOST,
  foldTerm,
  fuzzy,
  INDEX_VERSION,
  indexOptions,
  prefix,
  processTerm,
  matchRule,
  queryParts,
  SEARCH_FIELDS,
  type QueryPart,
  tokenize,
} from './search/options';
import type { SearchBestBet, SearchEntryKind, SerialisedIndex, StoredFields } from './search/types';

export type { SearchEntryKind };

/**
 * BM25 parameters. MiniSearch's default length normalisation (`b` 0.7) ranks a one-line checklist
 * item that mentions a word far above the page section that explains it at length. A gentler `b`
 * (0.3) leaves the kind weights of A7 in charge without burying the sections: `VAT264` finds the
 * glossary entry first and then the vehicle dealer's "The conditions you must meet", ahead of the
 * checklist items that only name the form (tests/unit/search/index.test.ts).
 */
export const BM25 = { k: 1.2, b: 0.3, d: 0.5 } as const;

/** Results returned for one query at most. */
export const DEFAULT_LIMIT = 30;

export interface SearchOptions {
  /** Only results in this section (`core`, `lookup`, …). */
  readonly section?: string | undefined;
  /** Only these kinds of result. */
  readonly kinds?: readonly SearchEntryKind[] | undefined;
  /** Only results that apply to this kind of business owner (entries for everyone always do). */
  readonly entity?: 'sole-prop' | 'pty' | undefined;
  /** Only results that apply to at least one of these business types (or to every type). */
  readonly businessTypes?: readonly string[] | undefined;
  readonly limit?: number | undefined;
  /**
   * `true` while the reader is still typing the last term (the live dialog), `false` for a
   * finished query (the search page, the 404 suggestions). Absent: a query that ends inside a word
   * is being typed.
   */
  readonly typing?: boolean | undefined;
}

export interface SearchResult {
  readonly id: number;
  readonly kind: SearchEntryKind;
  readonly doc: string;
  readonly anchor: string | undefined;
  readonly title: string;
  /** The page, and for a sub-section its parent headings: "Vehicle dealer › VAT: register earlier". */
  readonly docTitle: string;
  readonly section: string;
  /** Where the result opens: base path, locale prefix, page route and `#anchor`. */
  readonly href: string;
  /** Language of the result's text when it is not the reader's (an untranslated page). */
  readonly lang: string | undefined;
  readonly excerpt: string | undefined;
  readonly score: number;
  /** The index terms that matched, for highlighting. */
  readonly terms: readonly string[];
  /**
   * It is listed with the results that match every word, which come first; otherwise it matches
   * only some words, or names them only in passing on a page about the guide.
   */
  readonly allWords: boolean;
}

export interface ResultGroup {
  readonly section: string;
  readonly results: readonly SearchResult[];
}

export interface LoadedIndex {
  readonly lang: string;
  readonly sections: readonly string[];
  readonly search: MiniSearch<StoredFields>;
  /** Best bets: phrases that open one entry first (`content-meta/search-best-bets.json`). */
  readonly bets?: readonly SearchBestBet[];
  /** Words a best bet ignores in a query, besides the stop words. */
  readonly filler?: readonly string[];
  /** The sources register's Acts by name (`scripts/search/acts.ts`). */
  readonly acts?: readonly SearchBestBet[];
}

export class SearchIndexError extends Error {
  override readonly name = 'SearchIndexError';
}

function isSerialisedIndex(value: unknown): value is SerialisedIndex {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<SerialisedIndex>;
  return (
    typeof record.v === 'number' &&
    typeof record.lang === 'string' &&
    Array.isArray(record.sections) &&
    typeof record.index === 'object' &&
    record.index !== null
  );
}

/** Check and load a fetched index. Throws `SearchIndexError` for anything this client cannot read. */
export function loadIndex(value: unknown, locale: Locale): LoadedIndex {
  if (!isSerialisedIndex(value)) throw new SearchIndexError('The search index is not valid.');
  if (value.v !== INDEX_VERSION) {
    throw new SearchIndexError(
      `The search index is version ${String(value.v)}, this page reads ${String(INDEX_VERSION)}.`,
    );
  }
  if (value.lang !== locale) {
    throw new SearchIndexError(`The search index is for "${value.lang}", not "${locale}".`);
  }
  try {
    const search = MiniSearch.loadJS<StoredFields>(
      value.index as Parameters<typeof MiniSearch.loadJS>[0],
      indexOptions<StoredFields>(),
    );
    return {
      lang: value.lang,
      sections: value.sections,
      search,
      bets: value.bets ?? [],
      filler: value.filler ?? [],
      acts: value.acts ?? [],
    };
  } catch (error) {
    throw new SearchIndexError(`The search index could not be read: ${String(error)}`);
  }
}

function matchesFilters(stored: StoredFields, options: SearchOptions): boolean {
  if (options.section !== undefined && stored.s !== options.section) return false;
  if (options.kinds !== undefined && !options.kinds.includes(stored.k)) return false;
  if (options.entity !== undefined && stored.e !== undefined && stored.e !== options.entity) {
    return false;
  }
  if (options.businessTypes !== undefined && stored.b !== undefined) {
    const wanted = options.businessTypes;
    if (!stored.b.some((type) => wanted.includes(type))) return false;
  }
  return true;
}

/** The URL a result opens, for the reader's locale. */
export function resultHref(locale: Locale, route: string, anchor?: string, base?: string): string {
  const path = anchor === undefined ? route : `${route}#${anchor}`;
  return base === undefined ? href(locale, path) : href(locale, path, base);
}

function toResult(
  hit: MiniSearchResult,
  locale: Locale,
  base: string | undefined,
  allWords = false,
): SearchResult {
  const stored = hit as unknown as StoredFields & MiniSearchResult;
  return {
    id: Number(hit.id),
    kind: stored.k,
    doc: stored.d,
    anchor: stored.a,
    title: stored.t,
    docTitle: stored.p,
    section: stored.s,
    href: resultHref(locale, stored.r, stored.a, base),
    lang: stored.l,
    excerpt: stored.x,
    score: hit.score,
    terms: hit.terms,
    allWords,
  };
}

type Query = Parameters<MiniSearch['search']>[0];
/** MiniSearch's own search options. */
type SearchOptionsOf = NonNullable<Parameters<MiniSearch['search']>[1]>;

/** A word that says too little to be searched on its own: one character, or only digits. */
function weak(word: string): boolean {
  return word.length < 2 || /^[\d.,]+$/.test(word);
}

/**
 * The any-word query: every word of every part, by its own rule, any of them enough. A spaced code
 * gives its joined form and its words, a hyphenated word its words and the whole chain. Lone
 * numbers and single letters are left out (`weak`): matched alone they would turn a junk query
 * into a list of every "Prompt 1", where "nothing found" is the honest answer.
 */
export function anyTree(
  parts: readonly QueryPart[],
  typing: boolean,
  whole: ReadonlySet<string> = NO_WORDS,
): { combineWith: 'OR'; queries: Query[] } {
  const queries: Query[] = [];
  parts.forEach((part, index) => {
    const last = typing && index === parts.length - 1;
    const words =
      typeof part === 'string'
        ? [part]
        : [part.joined, ...('code' in part ? part.code : part.hyphen)];
    words.forEach((word, position) => {
      if (weak(word)) return;
      // The joined form of a hyphenated word is never fuzzy, as in `queryTree`.
      const joinedHyphen = typeof part !== 'string' && 'hyphen' in part && position === 0;
      // The joined form and the last word are the ones still being typed.
      const typed = last && (position === 0 || position === words.length - 1);
      queries.push(
        joinedHyphen
          ? { combineWith: 'OR', queries: [word], prefix: typed, fuzzy: false }
          : leaf(word, typed, whole),
      );
    });
  });
  return { combineWith: 'OR', queries };
}

/**
 * Words that say nothing about which page is meant, besides `STOP_WORDS`, so the title rule counts
 * the same in both languages: `het` is a stop word, so `has` is one here too ("What has changed",
 * "Wat het verander"; review WP-33 pass 10, minor 1).
 */
const TITLE_STOP_WORDS: ReadonlySet<string> = new Set(['has', 'have', 'had']);

/** The words of a title or a query part that count for the title rule. */
function titleWords(text: string): string[] {
  return tokenize(text)
    .map((token) => processTerm(token))
    .filter((term): term is string => term !== null && !TITLE_STOP_WORDS.has(term));
}

/** Shortest beginning of a word that, still being typed, may stand for a title word. */
const TITLE_PREFIX_MIN = 4;

/**
 * How far a query names a page by one of its titles (the navigation title or the H1 it shows):
 * 0 unless every part of the query is a word of the title, otherwise the share of the title's words
 * the query covers. A word counts whole; only the last word of a query of two or more words, while
 * it is still being typed and at least four letters long, may be the beginning of one (`marketing
 * prom`). `how this was made` covers all of "How this was made and how to check it" but `check`;
 * `change` is not "changed", and `ve` or `ver` (the start of many Afrikaans words) names nothing.
 */
export function titleCoverage(
  title: string,
  parts: readonly QueryPart[],
  typing: boolean,
  tokens = parts.length,
  lastIsWord = false,
): number {
  const terms = titleWords(title);
  if (terms.length === 0) return 0;
  const words = parts
    .map((part, index) => {
      const last = typing && index === parts.length - 1;
      const forms =
        typeof part === 'string'
          ? [part]
          : [part.joined, ...('code' in part ? part.code : part.hyphen)];
      return {
        forms: forms.filter((form) => !TITLE_STOP_WORDS.has(form)),
        prefix: last,
      };
    })
    .filter((word) => word.forms.length > 0);
  if (words.length === 0) return 0;
  // A word still being typed may stand for a title word only after another word: `marketing prom`
  // names "Marketing prompts". After a stop word, only when the word is not itself a whole word of
  // the guide (`lastIsWord`): `wat het verand` names "Wat het verander" (review WP-33 pass 11, nit
  // 1), but `my belasting` is finished, and does not name "Belastingfaktuur" (pass 12, major).
  // `change` or `verande` alone names nothing.
  const typed = words.length > 1 || (tokens > 1 && !lastIsWord);
  const matches = (term: string, form: string, prefix: boolean): boolean =>
    term === form || (typed && prefix && form.length >= TITLE_PREFIX_MIN && term.startsWith(form));
  const named = words.every(({ forms, prefix }) =>
    forms.some((form) => terms.some((term) => matches(term, form, prefix))),
  );
  if (!named) return 0;
  const covered = terms.filter((term) =>
    words.some(({ forms, prefix }) => forms.some((form) => matches(term, form, prefix))),
  );
  return covered.length / terms.length;
}

/**
 * The all-words query for an entry's own heading as written: every word whole, the last one, while
 * it is typed and four letters or more, also as a beginning; never fuzzy.
 */
export function headingTree(parts: readonly QueryPart[], typing: boolean): Exclude<Query, string> {
  // The word, or its plural (`kleinsakekorporasie` holds "Roete 4: koerse vir
  // kleinsakekorporasies"), as `holdsAsWritten` counts "stalls" for `stall` (review WP-33 pass 16).
  const exact = (word: string, last: boolean): Query => ({
    combineWith: 'OR',
    queries: [word, ...plurals(word)],
    prefix: last && word.length >= TITLE_PREFIX_MIN,
    fuzzy: false,
  });
  return {
    combineWith: 'AND',
    queries: parts.map((part, index): Query => {
      const last = typing && index === parts.length - 1;
      if (typeof part === 'string') return exact(part, last);
      const words = 'code' in part ? part.code : part.hyphen;
      const joined = exact(part.joined, last);
      if (words.length === 0) return joined;
      return {
        combineWith: 'OR',
        queries: [
          joined,
          {
            combineWith: 'AND',
            queries: words.map((word, at) => exact(word, last && at === words.length - 1)),
          },
        ],
      };
    }),
  };
}

/** The share of its score a result keeps when it needs a typo match for one of the words. */
export const TYPO_SHARE = 0.5;

/**
 * `true` when `rest` is an ending that leaves `word` the same word: `stall` → "stalls",
 * `register` → "registered", `tax` → "taxes". `es` only after a hissing sound, so a misspelt
 * `compani` is not "companies".
 */
/**
 * The singular forms of a plural query word of five letters or more, which count as the word as
 * written: `expenses` is "expense", `dealers` "dealer", `taxes` "tax" (review WP-33 pass 15, the
 * acceptance set). The other way round, "stalls" holds `stall` (`shortEnding`).
 */
export function singulars(word: string): string[] {
  if (word.length < 5 || !word.endsWith('s') || word.endsWith('ss')) return [];
  const stem = word.slice(0, -2);
  return word.endsWith('es') && /(?:ss|x|z|ch|sh)$/.test(stem)
    ? [word.slice(0, -1), stem]
    : [word.slice(0, -1)];
}

/** The plural forms a heading may hold for a query word: `vehicle` → "vehicles", `tax` → "taxes". */
export function plurals(word: string): string[] {
  if (!/^\p{L}{3,}$/u.test(word)) return [];
  return /(?:s|x|z|ch|sh)$/.test(word) ? [`${word}es`] : [`${word}s`];
}

function shortEnding(word: string, rest: string): boolean {
  if (rest === 's' || rest === 'd' || rest === 'ed') return true;
  return rest === 'es' && /(?:s|x|z|ch|sh)$/.test(word);
}

/**
 * `true` when the matched index terms hold every part of the query as written: the word itself,
 * the word with a short ending (`stall` in "stalls"), or, for the last word while it is still
 * typed, any word it begins (`compani` → "companies"); never only a typo match (`stall` as
 * "small"). A finished word that a dropped letter has turned into the beginning of another word
 * (`registr` → "registration") is a typo, not that word (review WP-33 pass 12, minor 2).
 */
export function holdsAsWritten(
  terms: readonly string[],
  parts: readonly QueryPart[],
  typing = false,
): boolean {
  const has = (word: string, last: boolean): boolean =>
    terms.some(
      (term) =>
        term === word ||
        singulars(word).includes(term) ||
        (term.startsWith(word) && ((last && typing) || shortEnding(word, term.slice(word.length)))),
    );
  return parts.every((part, index) => {
    const last = index === parts.length - 1;
    if (typeof part === 'string') return has(part, last);
    // A code is never matched by a typo (`matchRule`): its words count as written whenever they
    // begin a term, as the search reads them (`EMP 20` → "employee", "20").
    if ('code' in part) {
      const begins = (word: string) => terms.some((term) => term.startsWith(word));
      return has(part.joined, last) || (part.code.length > 0 && part.code.every(begins));
    }
    const words = part.hyphen;
    return (
      has(part.joined, last) ||
      (words.length > 0 && words.every((word, at) => has(word, last && at === words.length - 1)))
    );
  });
}

/** Shortest beginning of a best-bet word that, while it is typed, may stand for the word. */
const BET_PREFIX_MIN = 4;

/** How a typed query may meet a best bet; see `bestBet`. */
export interface BestBetTyping {
  /** The last word is still being typed. */
  readonly typing: boolean;
  /** The last word, as typed, is a whole word of the guide. */
  readonly lastIsWord?: boolean;
  /** Every word of the guide the typed last word begins. */
  readonly completions?: readonly string[];
}

/**
 * The best bet a query asks for, or `undefined` (review WP-33 passes 13 and 14). Every word of the
 * phrase must be a word of the query (`betWords`, in any order), and every other word of the query
 * must be a filler word (`my own`, `a new`, `my small`, `eie`, `nuwe`): `register my own business`
 * is the best bet `register business`, but `tax threshold` is not the best bet `tax`. While the last
 * word is typed, it may also be the beginning of a phrase word, from four letters (`register my
 * busi`), but only when it is not already a whole word of the guide (`besig`) and every word of the
 * guide it begins is that phrase word or one of its forms or compounds: `maatskap` begins
 * "maatskappy" too, so it is not yet `maatskappybelasting`. Never a typo match. When several
 * phrases fit, the first in the file wins.
 */
export function bestBet(
  bets: readonly SearchBestBet[],
  query: string,
  typed: BestBetTyping | boolean,
  filler: readonly string[] = [],
): SearchBestBet | undefined {
  const {
    typing,
    lastIsWord = false,
    completions = [],
  } = typeof typed === 'boolean' ? { typing: typed } : typed;
  const words = betWords(query);
  if (words.length === 0) return undefined;
  const last = words.length - 1;
  const typedWord = words[last]!;
  const beginsOnly = (word: string): boolean =>
    typing &&
    !lastIsWord &&
    typedWord.length >= BET_PREFIX_MIN &&
    word.startsWith(typedWord) &&
    completions.every((term) => term.startsWith(word));
  return bets.find((bet) => {
    const used = new Set<number>();
    for (const word of bet.w) {
      let at = words.findIndex((candidate, index) => !used.has(index) && candidate === word);
      if (at < 0 && !used.has(last) && beginsOnly(word)) at = last;
      if (at < 0) return false;
      used.add(at);
    }
    // A phrase word said twice (`my own name as business name`) says nothing more.
    return words.every(
      (word, index) => used.has(index) || filler.includes(word) || bet.w.includes(word),
    );
  });
}

/** No whole words: every word may be read as a typo (`wordRule`). */
const NO_WORDS: ReadonlySet<string> = new Set();

/**
 * How much a plural query word's singular counts (`expenses` finding "expense"). Enough to find
 * the section that holds only the singular ("Route 2: claim every real expense"), little enough
 * that holding both forms does not outrank holding the word as written: `vehicles` opens
 * "Vehicles for your business", not "Vehicle dealing and vehicles generally" (the acceptance set).
 */
const SINGULAR_WEIGHT = 0.2;

/**
 * One query word, by its matching rule (`matchRule`), except that a word the guide itself uses
 * (`whole`) is never read as a typo of another word: `deregister` is not "register", `deregistreer`
 * is not "registreer" (review WP-33 pass 15, major 2). It still reaches the words it begins, and
 * its singular (`expenses` → "expense", `singulars`), which is not a typo.
 */
function leaf(term: string, last: boolean, whole: ReadonlySet<string> = NO_WORDS): Query {
  const rule = matchRule(term, last);
  if (!whole.has(term)) return { combineWith: 'OR', queries: [term], ...rule };
  return {
    combineWith: 'OR',
    queries: [
      { combineWith: 'OR', queries: [term], ...rule, fuzzy: false },
      ...singulars(term).map((form): Query => ({
        combineWith: 'OR',
        queries: [form],
        prefix: false,
        fuzzy: false,
        boostTerm: () => SINGULAR_WEIGHT,
      })),
    ],
  };
}

/** Words, each by its own rule, all required; the last may be still being typed. */
function allOf(words: readonly string[], last: boolean, whole: ReadonlySet<string>): Query {
  return {
    combineWith: 'AND',
    queries: words.map((word, index) => leaf(word, last && index === words.length - 1, whole)),
  };
}

/**
 * How a spaced code is read in one pass of `runSearchCounted`: as its joined form (`vat264`, by the
 * code rule) or as its words (`vat`, `264`, each by its own rule).
 */
export type CodeReading = 'joined' | 'words';

/**
 * The all-words query for a list of parts, every part required and every term with its own
 * matching rule (`matchRule`, the query-kind table in `docs/design-system.md`):
 * - a word: `matchRule`, as the last term still being typed or not;
 * - a spaced code: its joined form by the code rule (`codes: 'joined'`), or its words
 *   (`codes: 'words'`); the client runs both (a known code's joined reading first, otherwise
 *   merged by score);
 * - a hyphenated word: its words (stop words left out), or the whole chain joined, which is
 *   prefix-matched while it is being typed (`e-fil` → `efiling`) and never fuzzy-matched.
 *
 * `typing` is `true` when the last term of the query is still being typed. `whole` holds the query
 * words that are words of the guide as written, never read as typos (`wordRule`).
 */
export function queryTree(
  parts: readonly QueryPart[],
  typing = true,
  codes: CodeReading = 'joined',
  whole: ReadonlySet<string> = NO_WORDS,
): Exclude<Query, string> {
  return {
    combineWith: 'AND',
    queries: parts.map((part, index): Query => {
      const last = typing && index === parts.length - 1;
      if (typeof part === 'string') return leaf(part, last, whole);
      if ('code' in part) {
        return codes === 'joined' || part.code.length === 0
          ? leaf(part.joined, last)
          : allOf(part.code, last, whole);
      }
      const joined: Query = {
        combineWith: 'OR',
        queries: [part.joined],
        prefix: last,
        fuzzy: false,
      };
      if (part.hyphen.length === 0) return joined;
      return { combineWith: 'OR', queries: [allOf(part.hyphen, last, whole), joined] };
    }),
  };
}

/**
 * Run a query on a loaded index: all words first, then any word. Results that match every part
 * come first, best first; then, always, results that match some of the parts, best first, so
 * `EMP201 deadline` lists the one page with both words and then the EMP201 entries that give the
 * date in other words. The any-word results leave out lone numbers and single letters: matched
 * alone they would turn a junk query into a list of every "Prompt 1", where "nothing found" is the
 * honest answer.
 */
export function runSearch(
  index: LoadedIndex,
  query: string,
  locale: Locale,
  options: SearchOptions = {},
  base?: string,
): SearchResult[] {
  return runSearchCounted(index, query, locale, options, base).results;
}

/** Results up to the limit, and how many there are in all (review WP-33 pass 4, minor 2). */
export interface CountedResults {
  readonly results: SearchResult[];
  /** Every distinct destination the query matched, however many `results` holds. */
  readonly total: number;
  /** How many of them match every word of the query (`SearchResult.allWords`). */
  readonly matchedAll: number;
}

/** `runSearch`, with the true total: "12 of 59 results shown", "See all 59 results". */
export function runSearchCounted(
  index: LoadedIndex,
  input: string,
  locale: Locale,
  options: SearchOptions = {},
  base?: string,
): CountedResults {
  // A filler word with a diacritic counts as written (`sê`, "say"), because its folded form can be
  // another word (`se`, the possessive): it goes before the query is read (review WP-33 pass 19b).
  // An Act name keeps its words. When it was the last word, the word before it is finished.
  const actWords = new Set((index.acts ?? []).flatMap((entry) => entry.w));
  const writtenFiller = new Set(
    (index.filler ?? []).filter((word) => foldTerm(word) !== word && !actWords.has(foldTerm(word))),
  );
  const dropped = dropWrittenFiller(input, writtenFiller);
  // A query of filler and stop words only (`die reëls`) searches for them, as before.
  const query = queryParts(dropped).length > 0 ? dropped : input;
  // The caller says whether the reader is still typing: the live dialog does; the search page and
  // the 404 suggestions do not (a submitted query is finished). Without a say, a query that ends
  // inside a word is being typed.
  const typing =
    (options.typing ?? /[\p{L}\p{N}]$/u.test(input)) &&
    (query === input || /[\p{L}\p{N}]$/u.test(query));
  const raw = queryParts(query);
  if (raw.length === 0) return { results: [], total: 0, matchedAll: 0 };
  // A query about sources (`sources`, `companies act`, `waar kom dit vandaan`) keeps the sources
  // register at full weight; any other query weighs it as `REFERENCE_WEIGHT` says (review WP-33
  // pass 17, major 1).
  // Only when the source word ends the query, as a noun (`sources`, `what is the source`, `tax
  // source`, `bron`): followed by what is sourced (`where do i source stock`, `source of income`)
  // it means something else (review WP-33 pass 19, minor 3).
  const lastRaw = raw.at(-1);
  const asksSource = typeof lastRaw === 'string' && SOURCE_WORDS.has(lastRaw);
  const searchOptions = {
    bm25: BM25,
    prefix,
    fuzzy,
    boost: { ...FIELD_BOOST },
    // The kind's weight (stored), times the document's: a page about the guide weighs a quarter
    // (`DOC_WEIGHT`, review WP-33 pass 7 and 9).
    boostDocument: (_id: unknown, _term: string, stored?: Record<string, unknown>): number =>
      (typeof stored?.['w'] === 'number' ? stored['w'] : 1) *
      (DOC_WEIGHT[String(stored?.['d'])] ?? 1) *
      (asksSource ? 1 : (REFERENCE_WEIGHT[String(stored?.['d'])] ?? 1)),
    filter: (hit: MiniSearchResult): boolean =>
      matchesFilters(hit as unknown as StoredFields, options),
  };
  // Filler words (`want`, `need`, `get`, `wil`, `moet`; `index.filler`) never say which page is
  // meant, so the ranking drops them as it drops stop words: `I want to close my business` ranks
  // as `close business` (review WP-33 pass 15, major 1). A filler word of three letters or more
  // still being typed may begin another word (`can` of "cancel") and stays; a two-letter one
  // (`hê`, read "he") is too short to say so (pass 16, major 4). A query of filler words only
  // searches for them.
  /** `true` when the guide holds this word exactly, as written. */
  const inGuide = (word: string): boolean =>
    index.search.search(
      { combineWith: 'OR', queries: [word], prefix: false, fuzzy: false },
      { fields: [...SEARCH_FIELDS] },
    ).length > 0;
  // A typed filler word that is already a whole word of the guide (`law`, `wet`) is read as that
  // word, so it is dropped while typed too: `sars law` ranks as `sars` (review WP-33 pass 19,
  // major 4).
  const fillerWords = new Set((index.filler ?? []).filter((word) => !writtenFiller.has(word)));
  const content = raw.filter(
    (part, at) =>
      typeof part !== 'string' ||
      !fillerWords.has(part) ||
      (typing && at === raw.length - 1 && part.length >= 3 && !inGuide(part)),
  );
  const parts = content.length > 0 ? content : raw;
  // The query's words that are words of the guide: never read as a typo of another word.
  const whole = new Set(
    parts
      .flatMap((part) => (typeof part === 'string' ? [part] : 'hyphen' in part ? part.hyphen : []))
      .filter((word) => matchRule(word, false).fuzzy !== false && inGuide(word)),
  );
  const codes = parts.filter(
    (part): part is Extract<QueryPart, { code: unknown }> =>
      typeof part !== 'string' && 'code' in part,
  );
  // A spaced code whose joined form names a glossary or "Words used" entry (`VAT 264`, `SAPS 60`
  // while typed) is that code: its joined reading ranks first, exactly as the joined spelling.
  // Any other spaced pair (`VAT 15%`, `brand 5`) is two words that happen to sit together.
  const knownCode = codes.some((part) => {
    const last = typing && part === parts.at(-1);
    const named = index.search.search(leaf(part.joined, last), {
      ...searchOptions,
      fields: ['title'],
      filter: (hit: MiniSearchResult) => hit['k'] === 'glossary' || hit['k'] === 'term',
    });
    return named.length > 0;
  });
  /**
   * Every part matched, best first. A spaced code is read both ways, as its joined form (`VAT 264`
   * as `VAT264`; `SAPS 60` reaches `SAPS601` while typed) and as its two words (so `VAT 15%` never
   * finds less than `VAT` and `15`). For a known code the joined reading comes first; otherwise
   * the two readings are merged by score, an entry found both ways keeping its better score.
   */
  const allWords = (only: SearchOptionsOf = {}): MiniSearchResult[] => {
    const settings = { ...searchOptions, ...only };
    const hits = index.search.search(queryTree(parts, typing, 'joined', whole), settings);
    if (codes.length === 0) return hits;
    const words = index.search.search(queryTree(parts, typing, 'words', whole), settings);
    if (knownCode) {
      const ids = new Set(hits.map((hit) => hit.id));
      return [...hits, ...words.filter((hit) => !ids.has(hit.id))];
    }
    const best = new Map(hits.map((hit) => [hit.id, hit]));
    for (const hit of words) {
      const known = best.get(hit.id);
      if (known === undefined || hit.score > known.score) best.set(hit.id, hit);
    }
    return [...best.values()].sort((a, b) => b.score - a.score);
  };
  // All words first, then any word, best first (review WP-33 pass 6, major 2).
  const every = allWords();
  const found = new Set(every.map((hit) => hit.id));
  const any = anyTree(parts, typing, whole);
  const some =
    any.queries.length > 0
      ? index.search.search(any, searchOptions).filter((hit) => !found.has(hit.id))
      : [];
  // A query that names a page leads with that page (review WP-33 pass 10): every word of the query
  // is a word of the page's navigation title or of the H1 it shows, and the query covers more than
  // half of that title (`how this was made`, `AI disclosure`, `marketing prompts`, `wat het
  // verander`). The page's first entry, which carries both titles, leads; when several pages
  // qualify, the one whose title the query covers most, then the first in reading order (`start
  // here`: the guide's own "Start here" before the Core section's).
  // The words as typed, stop words and the halves of a hyphenated word included.
  const tokens = query.split(/[^\p{L}\p{N}]+/u).filter((word) => word !== '').length;
  // The last word, as typed, is a whole word of the guide (`belasting`), not only the beginning of
  // one (`verand`).
  const lastPart = parts.at(-1);
  const lastForm = typeof lastPart === 'string' ? lastPart : lastPart?.joined;
  const lastIsWord =
    lastForm !== undefined &&
    index.search.search(
      { combineWith: 'OR', queries: [lastForm], prefix: false, fuzzy: false },
      searchOptions,
    ).length > 0;
  const titled = every
    .filter((hit) => typeof hit['h'] === 'string')
    .map((hit) => ({
      hit,
      cover: Math.max(
        titleCoverage(String(hit['h']), parts, typing, tokens, lastIsWord),
        titleCoverage(String(hit['p']).split(' › ')[0] ?? '', parts, typing, tokens, lastIsWord),
      ),
    }))
    .filter(({ cover }) => cover > 0.5)
    .sort((a, b) => b.cover - a.cover || Number(a.hit.id) - Number(b.hit.id))[0]?.hit;
  // Within the all-words results, an entry whose own heading holds every word, as written,
  // comes before one that holds them only in its text: `BTW-registrasie` opens "BTW: waarskynlik
  // nog nie" before the tax invoice template (review WP-33 pass 10, minor 3). Only whole words
  // count, or the beginning of the last word while it is typed (four letters or more), never a
  // fuzzy match: `stall` is not "small" (pass 11, minor 1).
  // When no result holds the words as written (the reader misspelt one: `cipc anual return`),
  // the heading lift reads the words as the search does, typos included, so the section asked for
  // still leads (review WP-33 pass 12, minor 1). A typo never lifts a heading above an exact match.
  const misspelt = every.every((hit) => !holdsAsWritten(hit.terms, parts, typing));
  const headed = new Set(
    (misspelt
      ? allWords({ fields: ['title'] })
      : index.search.search(headingTree(parts, typing), { ...searchOptions, fields: ['title'] })
    ).map((hit) => hit.id),
  );
  // Pages about the guide ("How this was made", "What has changed"; `DOC_WEIGHT`) weigh a quarter
  // in every search (`boostDocument`). Named only in an entry's text, not its heading (the
  // corrections log naming "EMP201" next to "deadlines"), such an entry ranks with the any-word
  // results, so `PAYE deadline` opens the PAYE entry (review WP-33 pass 7 to 9).
  const aboutGuide = (hit: MiniSearchResult): boolean => DOC_WEIGHT[String(hit['d'])] !== undefined;
  // A quick answer that holds a word only in its page's lead (`lead`) matches only some words: the
  // lead finds the answer, it does not make it an answer to every query its page's summary
  // touches (`do i need a company` is not "What does a Pty Ltd cost me every year?"; review
  // WP-33 pass 14, minor 4).
  const answers = every.filter((hit) => hit['k'] === 'answer');
  const ownWords = new Set(
    answers.length > 0 ? allWords({ fields: ['title', 'path', 'text'] }).map((hit) => hit.id) : [],
  );
  const leadOnly = (hit: MiniSearchResult): boolean =>
    hit['k'] === 'answer' && !ownWords.has(hit.id);
  const demoted = (hit: MiniSearchResult): boolean =>
    (aboutGuide(hit) && !headed.has(hit.id)) || leadOnly(hit);
  const listed = every.filter((hit) => !demoted(hit) && hit !== titled);
  // A heading on a page about the guide that names a common word ("Change 2: …") is not promoted:
  // those pages keep only their weight.
  // A heading that holds every word of the query as written, filler words included, comes first:
  // the owner's own question ("How to get the BRNC" for `how do i get a brnc`, "Do you need a
  // tagline?" for `do i need a tagline`; review WP-33 pass 16, major 2). A heading that only
  // happens to say "I need" is lifted only when the owner said "I need" too.
  const fully = new Set(
    raw.length > parts.length && !misspelt
      ? index.search
          .search(headingTree(raw, typing), { ...searchOptions, fields: ['title'] })
          .map((hit) => hit.id)
      : [],
  );
  const promoted = (hit: MiniSearchResult): boolean =>
    (headed.has(hit.id) || fully.has(hit.id)) && !aboutGuide(hit);
  // A result that needs a typo match for a word (`stall` as "small") counts half its score
  // against those that hold every word as written: `market stall` lists the retail page's "Do you
  // need a licence" ("market stalls") before Marketing prompts' "small businesses" (review WP-33
  // pass 11, minor 1). The others keep their order.
  const others = listed.filter((hit) => !promoted(hit));
  const written = others.filter((hit) => holdsAsWritten(hit.terms, parts, typing));
  const typo = others
    .filter((hit) => !holdsAsWritten(hit.terms, parts, typing))
    .map((hit) => ({ hit, score: hit.score * TYPO_SHARE }))
    .sort((a, b) => b.score - a.score);
  const merged: MiniSearchResult[] = [];
  for (const hit of written) {
    while (typo.length > 0 && typo[0]!.score > hit.score) merged.push(typo.shift()!.hit);
    merged.push(hit);
  }
  merged.push(...typo.map(({ hit }) => hit));
  // A section whose whole heading, of two words or more, is in the query comes next: the task
  // phrasing of a term opens the section on it (`how do i pay provisional tax` → "Provisional
  // tax", not the "Provisional taxpayer" definition; `home office deduction` → "Home office
  // deduction", not a "Words used" entry that points into another section; review WP-33 pass 17).
  const queryWords = new Set(
    parts.flatMap((part) =>
      typeof part === 'string'
        ? [part]
        : [part.joined, ...('code' in part ? part.code : part.hyphen)],
    ),
  );
  const contained = new Set(
    listed
      .filter((hit) => {
        if (hit['k'] !== 'section' || aboutGuide(hit)) return false;
        // Not the sources register's headings, unless the query asks for sources.
        if (!asksSource && REFERENCE_WEIGHT[String(hit['d'])] !== undefined) return false;
        const words = titleWords(String(hit['t']));
        // A word of one letter (the "b" of "B-BBEE") does not count towards the two.
        return (
          words.filter((word) => word.length > 1).length >= 2 &&
          words.every((word) => queryWords.has(word)) &&
          // The heading names more than half of what the query asks: `sole proprietor bank account`
          // is not "Sole proprietor" (review WP-33 pass 18, minor 1).
          words.length * 2 > parts.length
        );
      })
      .map((hit) => hit.id),
  );
  const lifted = listed.filter(promoted);
  // A heading that is the query word for word, stop words included, comes before the other
  // headings of its own page: `Wat ingesluit is` opens "Wat ingesluit is", not "Wat NIE ingesluit
  // is nie" (pass 18, minor 4). Only a section's own heading counts, not a "Words used" entry's.
  const asTyped = (text: string): string =>
    text
      .split(/[^\p{L}\p{N}]+/u)
      .map((word) => foldTerm(word))
      .filter((word) => word !== '')
      .join(' ');
  const typedQuery = asTyped(query);
  // Several headings wholly in the query: the one that names more of it first (`sole proprietor
  // bank account` → "Business bank account", not "Sole proprietor"; review WP-33 pass 18, minor 1),
  // then in rank order. (Pass 18's preference for a heading off a business-type page put the
  // checklist before the type's own page and was taken out in pass 19.)
  const containedFirst = listed
    .filter((hit) => contained.has(hit.id) && !fully.has(hit.id))
    .map((hit, at) => ({
      hit,
      at,
      words: titleWords(String(hit['t'])).length,
    }))
    .sort((a, b) => b.words - a.words || a.at - b.at)
    .map(({ hit }) => hit);
  const exact = new Set(
    lifted
      .filter((hit) => hit['k'] === 'section' && asTyped(String(hit['t'])) === typedQuery)
      .map((hit) => hit.id),
  );
  const ranked0 = [
    ...lifted.filter((hit) => fully.has(hit.id)),
    ...containedFirst,
    // A "Words used" definition (`term`) opens the section of its page where the word is used,
    // which may be about something else ("Home office deduction" opens "The turnover tax trap"),
    // so a lifted section comes before it (review WP-33 pass 17, major 4).
    ...lifted.filter((hit) => !fully.has(hit.id) && !contained.has(hit.id) && hit['k'] !== 'term'),
    ...lifted.filter((hit) => !fully.has(hit.id) && !contained.has(hit.id) && hit['k'] === 'term'),
    ...merged.filter((hit) => !contained.has(hit.id)),
  ];
  const ordered = [...ranked0];
  for (const id of exact) {
    const from = ordered.findIndex((hit) => hit.id === id);
    const to = ordered.findIndex((hit) => hit['d'] === ordered[from]?.['d']);
    if (from > to && to >= 0) ordered.splice(to, 0, ...ordered.splice(from, 1));
  }
  // A query asked as a question (`do i need an audit`, `how do i name my business`) leads with the
  // quick answer whose question holds every word of the query as written, filler words included
  // (review WP-33 pass 15, the acceptance set). A question has two or more words the ranking
  // drops (stop words and filler words) and two or more it keeps; a term (`small claims court`,
  // `proof of payment`) is not a question and keeps its glossary entry first. When several
  // questions hold the words, the one the query covers most comes first ("How do I name my
  // business?" before "Can I put the car in the business name?").
  // `what is a loan account` names the glossary term "Loan account" with nothing else (stop words
  // aside, filler words counted: `small claims court`): a definition, not a question, so the
  // glossary entry keeps the lead (review WP-33 pass 16, minor 2).
  // The term or its alias in brackets ("Handelsnaam (trading name)") counts.
  const termNames = (title: string): string[] => [
    title.replace(/\s*\([^)]*\)/g, ''),
    ...[...title.matchAll(/\(([^)]*)\)/g)].map((match) => match[1] ?? ''),
  ];
  const named = every.find(
    (hit) =>
      hit['k'] === 'glossary' &&
      termNames(String(hit['t'])).some(
        (name) => titleCoverage(name, raw, typing, tokens, lastIsWord) === 1,
      ),
  );
  const namesTerm = named !== undefined;
  // `what is a pty ltd`, `wat is 'n eenmansaak`: the glossary entry the remaining words name leads,
  // before a page, a section or a best bet on the subject (review WP-33 pass 17, major 5).
  const whatIs = /^\s*(?:what|wat)\s+is\b/iu.test(query) ? named : undefined;
  // Two or more stop words make a question (`do i need`, `how do i`, `what must my`); filler words
  // do not count, so `my besigheid se naam` is not one (review WP-33 pass 18, minor 2).
  const question = raw.length >= 2 && tokens - raw.length >= 2 && !namesTerm;
  const asked = (question ? ordered : [])
    .filter((hit) => hit['k'] === 'answer')
    .map((hit) => ({
      hit,
      cover: titleCoverage(String(hit['t']), raw, typing, tokens, lastIsWord),
    }))
    .filter(({ cover }) => cover > 0)
    .sort((a, b) => b.cover - a.cover)
    .map(({ hit }) => hit);
  const askedIds = new Set(asked.map((hit) => hit.id));
  const ranked = [...asked, ...ordered.filter((hit) => !askedIds.has(hit.id))];
  // The question asked word for word comes before a page named by the words left once filler is
  // dropped (`what must my invoice show`: "What must my invoice show?", not "Invoice").
  // A page named by every word, filler included (`hoe dit gemaak is`), still leads.
  const titledFully =
    titled !== undefined &&
    Math.max(
      titleCoverage(String(titled['h']), raw, typing, tokens, lastIsWord),
      titleCoverage(String(titled['p']).split(' › ')[0] ?? '', raw, typing, tokens, lastIsWord),
    ) > 0;
  const all =
    titled === undefined || askedIds.has(titled.id)
      ? ranked
      : titledFully
        ? [titled, ...ranked]
        : [...asked, titled, ...ranked.slice(asked.length)];
  // A query that is an Act's name (`companies act`, `companies act 71 of 2008`, `maatskappywet`),
  // in whole words, opens the sources register's entry that lists it (`index.acts`, built from
  // the register's own data; review WP-33 pass 18, major 2). A law word alone (`law`, `act`,
  // `regulasies`) is not an Act name and is ranked like any word.
  // The words in order, as typed: a filler word stays when an Act name holds it (`maatskappy wet`),
  // and a trailing number and year (`71 of 2008`) are dropped. An Act name matches only word for
  // word, in order: `can i act as a company` is not "Companies Act" (review WP-33 pass 19, major 3).
  const actVocabulary = actWords;
  const typedWords = raw
    .flatMap((part) =>
      typeof part === 'string' ? [part] : 'code' in part ? part.code : part.hyphen,
    )
    .filter((word) => !fillerWords.has(word) || actVocabulary.has(word));
  while (typedWords.length > 0 && /^\d+$/u.test(typedWords.at(-1) ?? '')) typedWords.pop();
  const sameWords = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && a.every((word, at) => word === b[at]);
  const act = (index.acts ?? []).find(
    (entry) =>
      sameWords(entry.w, typedWords) ||
      // A name given without "act" / "wet" (`ohsa`) may be typed with it (`ohsa act`).
      (['act', 'wet'].includes(typedWords.at(-1) ?? '') &&
        !['act', 'wet'].includes(entry.w.at(-1) ?? '') &&
        sameWords(entry.w, typedWords.slice(0, -1))),
  );
  const actEntry =
    act === undefined
      ? undefined
      : (all.find((hit) => hit.id === act.id) ??
        ({
          ...index.search.getStoredFields(act.id),
          id: act.id,
          score: Number.POSITIVE_INFINITY,
          terms: [],
          queryTerms: [],
          match: {},
        } as MiniSearchResult));
  const lead = whatIs ?? actEntry;
  const allRanked = lead === undefined ? all : [lead, ...all.filter((hit) => hit.id !== lead.id)];
  const rest = [...every.filter((hit) => demoted(hit) && hit !== titled && hit !== lead), ...some];
  // A best bet leads, whatever the ranking (review WP-33 pass 13).
  // A phrase still being typed yields to a page the query names by its title (`jy is die besighe`
  // is "Jy is die besigheid", not yet `besigheidslisensie`).
  const bets = index.bets ?? [];
  const filler = index.filler ?? [];
  /** The words of the guide the typed last word begins (for a typed best bet). */
  const completions = (): string[] => {
    const typedWord = betWords(query).at(-1);
    if (!typing || typedWord === undefined) return [];
    const hits = index.search.search(
      { combineWith: 'OR', queries: [typedWord], prefix: true, fuzzy: false },
      searchOptions,
    );
    return [...new Set(hits.flatMap((hit) => hit.terms))].filter((term) =>
      term.startsWith(typedWord),
    );
  };
  // A question that a quick answer asks in the owner's own words (`what must my invoice show`) is
  // answered by it, not by the best bet for one of its words (`invoice`; review WP-33 pass 16).
  const bet =
    asked.length > 0 || whatIs !== undefined || actEntry !== undefined
      ? undefined
      : (bestBet(bets, query, false, filler) ??
        (titled === undefined
          ? bestBet(bets, query, { typing, lastIsWord, completions: completions() }, filler)
          : undefined));
  const stored = bet === undefined ? undefined : index.search.getStoredFields(bet.id);
  // The entry as the search found it (with its matched terms, for highlighting), or as stored.
  const foundBet = [...every, ...some].find((hit) => hit.id === bet?.id);
  const pinned: MiniSearchResult[] =
    bet === undefined || stored === undefined || !searchOptions.filter({ ...stored } as never)
      ? []
      : [
          foundBet ??
            ({
              ...stored,
              id: bet.id,
              score: Number.POSITIVE_INFINITY,
              terms: [],
              queryTerms: [],
              match: {},
            } as MiniSearchResult),
        ];
  const pinnedIds = new Set(pinned.map((hit) => hit.id));
  const hits = [
    ...pinned,
    ...allRanked.filter((hit) => !pinnedIds.has(hit.id)),
    ...rest.filter((hit) => !pinnedIds.has(hit.id)).sort((a, b) => b.score - a.score),
  ];
  const leading = new Set([...pinned, ...allRanked].map((hit) => hit.id));
  // Two entries can open the same place (a term and the section that explains it): keep the
  // better one, so the list never offers the same destination twice.
  const limit = options.limit ?? DEFAULT_LIMIT;
  const seen = new Set<string>();
  const results: SearchResult[] = [];
  let matchedAll = 0;
  for (const hit of hits) {
    // The count of results that match every word is the block listed first (review WP-33 pass 9,
    // nit): a page about the guide that names the words only in passing is listed, and counted,
    // with the rest.
    const result = toResult(hit, locale, base, leading.has(hit.id));
    if (seen.has(result.href)) continue;
    seen.add(result.href);
    if (result.allWords) matchedAll++;
    if (results.length < limit) results.push(result);
  }
  return { results, total: seen.size, matchedAll };
}

/**
 * Group results by section, keeping the ranking: groups appear in the order of their best result,
 * and results keep their order inside a group. So the first result is always the first option.
 */
export function groupResults(results: readonly SearchResult[]): ResultGroup[] {
  const groups = new Map<string, SearchResult[]>();
  for (const result of results) {
    const group = groups.get(result.section);
    if (group) group.push(result);
    else groups.set(result.section, [result]);
  }
  return [...groups].map(([section, items]) => ({ section, results: items }));
}

/* ------------------------------------------------------------------ highlighting */

export interface TextSegment {
  readonly text: string;
  readonly mark: boolean;
}

const WORD = /[\p{L}\p{N}]+(?:[.,]\p{N}+)*/gu;
const CODE_ALIAS = /^(\p{L}{2,6})(\p{N}[\p{N}.,]*)$/u;
/** A whole amount of a million rand or more: `r2300000`. */
const MILLIONS = /^r(\d{7,})$/;

/**
 * The words to mark for a set of matched index terms. A joined form-code alias (`saps601`) is also
 * matched as its two written halves, because the text says `SAPS 601`.
 */
export function markTerms(terms: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const term of terms) {
    const folded = foldTerm(term);
    out.add(folded);
    const alias = CODE_ALIAS.exec(folded);
    if (alias?.[1] !== undefined && alias[2] !== undefined) {
      out.add(alias[1]);
      out.add(alias[2]);
    }
    // `r2300000` also matches the text "R2.3 million" through its index alias (review WP-33
    // pass 6, minor 3): mark the amount as written and its word.
    const millions = MILLIONS.exec(folded);
    if (millions?.[1] !== undefined) {
      out.add(`r${String(Number(millions[1]) / 1_000_000)}`);
      out.add('million');
      out.add('miljoen');
    }
  }
  return out;
}

/**
 * Split text into plain and marked segments: a word is marked when its folded form is one of the
 * matched terms. The caller renders marked segments as `<mark>` with DOM APIs; nothing here is
 * HTML, so result text can never inject markup.
 */
export function highlight(text: string, terms: readonly string[]): TextSegment[] {
  const marks = markTerms(terms);
  const out: TextSegment[] = [];
  let last = 0;
  const push = (segment: string, mark: boolean): void => {
    if (segment === '') return;
    const previous = out.at(-1);
    if (previous && previous.mark === mark)
      out[out.length - 1] = { text: previous.text + segment, mark };
    else out.push({ text: segment, mark });
  };
  if (marks.size > 0) {
    for (const match of text.matchAll(WORD)) {
      if (!marks.has(foldTerm(match[0]))) continue;
      push(text.slice(last, match.index), false);
      push(match[0], true);
      last = match.index + match[0].length;
    }
  }
  push(text.slice(last), false);
  return out;
}

/* ------------------------------------------------------------------ the client */

export type FetchLike = (url: string) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}>;

export interface SearchClientOptions {
  /** Same-origin URL of this language's index, from the page (`data-index`). */
  readonly url: string;
  readonly locale: Locale;
  /** Base path; defaults to the build's own. */
  readonly base?: string | undefined;
  readonly fetch?: FetchLike | undefined;
}

export interface SearchClient {
  /** Fetch and load the index once; later calls return the same promise. A failure can be retried. */
  load(): Promise<LoadedIndex>;
  /** `true` once the index is loaded. */
  readonly ready: boolean;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  /** `search`, with how many results there are in all. */
  searchCounted(query: string, options?: SearchOptions): Promise<CountedResults>;
}

/**
 * A client for one language's index. Nothing is fetched until `load()` or `search()` is called:
 * the page decides when, so the index is never downloaded before the reader opens search.
 */
export function createSearchClient(options: SearchClientOptions): SearchClient {
  const fetchIndex: FetchLike =
    options.fetch ?? ((url: string) => globalThis.fetch(url, { credentials: 'same-origin' }));
  let pending: Promise<LoadedIndex> | undefined;
  let loaded: LoadedIndex | undefined;

  const load = (): Promise<LoadedIndex> => {
    pending ??= (async () => {
      const response = await fetchIndex(options.url);
      if (!response.ok) {
        throw new SearchIndexError(`The search index answered ${String(response.status)}.`);
      }
      loaded = loadIndex(await response.json(), options.locale);
      return loaded;
    })().catch((error: unknown) => {
      // Let the reader try again (for example after a dropped connection).
      pending = undefined;
      throw error instanceof SearchIndexError ? error : new SearchIndexError(String(error));
    });
    return pending;
  };

  return {
    load,
    get ready() {
      return loaded !== undefined;
    },
    async search(query, searchOptions) {
      const index = await load();
      return runSearch(index, query, options.locale, searchOptions, options.base);
    },
    async searchCounted(query, searchOptions) {
      const index = await load();
      return runSearchCounted(index, query, options.locale, searchOptions, options.base);
    },
  };
}
