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
  DOC_WEIGHT,
  FIELD_BOOST,
  foldTerm,
  fuzzy,
  INDEX_VERSION,
  indexOptions,
  prefix,
  processTerm,
  matchRule,
  queryParts,
  type QueryPart,
  tokenize,
} from './search/options';
import type { SearchEntryKind, SerialisedIndex, StoredFields } from './search/types';

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
    return { lang: value.lang, sections: value.sections, search };
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
      const rule = joinedHyphen ? { prefix: typed, fuzzy: false } : matchRule(word, typed);
      queries.push({ combineWith: 'OR', queries: [word], ...rule });
    });
  });
  return { combineWith: 'OR', queries };
}

/**
 * `true` when a query asks for a page by its title: the title holds every part of the query, each
 * by its own rule, and the query covers more than half of the title's words. `how this was made`
 * asks for "How this was made and how to check it"; `check` does not. Stop words do not count.
 */
export function titleHolds(title: string, parts: readonly QueryPart[], typing: boolean): boolean {
  const page = title.split(' › ')[0] ?? '';
  const terms = tokenize(page)
    .map((token) => processTerm(token))
    .filter((term): term is string => term !== null);
  const holds = (word: string, last: boolean): boolean => {
    const rule = matchRule(word, last);
    return terms.some((term) => term === word || (rule.prefix && term.startsWith(word)));
  };
  // The query must also cover more than half of the title's words: `check` alone is a word in "How
  // this was made and how to check it", not a request for that page (review WP-33 pass 9).
  const covered = terms.filter((term) =>
    parts.some((part, index) => {
      const words =
        typeof part === 'string'
          ? [part]
          : [part.joined, ...('code' in part ? part.code : part.hyphen)];
      const last = typing && index === parts.length - 1;
      return words.some(
        (word) => term === word || (matchRule(word, last).prefix && term.startsWith(word)),
      );
    }),
  );
  return (
    parts.length > 0 &&
    covered.length * 2 > terms.length &&
    parts.every((part, index) => {
      const last = typing && index === parts.length - 1;
      if (typeof part === 'string') return holds(part, last);
      const words = 'code' in part ? part.code : part.hyphen;
      return holds(part.joined, last) || (words.length > 0 && words.every((w) => holds(w, last)));
    })
  );
}

/** One term, with its matching rule (`matchRule`). */
function leaf(term: string, last: boolean): Query {
  return { combineWith: 'OR', queries: [term], ...matchRule(term, last) };
}

/** Words, each by its own rule, all required; the last may be still being typed. */
function allOf(words: readonly string[], last: boolean): Query {
  return {
    combineWith: 'AND',
    queries: words.map((word, index) => leaf(word, last && index === words.length - 1)),
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
 * `typing` is `true` when the last term of the query is still being typed.
 */
export function queryTree(
  parts: readonly QueryPart[],
  typing = true,
  codes: CodeReading = 'joined',
): Exclude<Query, string> {
  return {
    combineWith: 'AND',
    queries: parts.map((part, index): Query => {
      const last = typing && index === parts.length - 1;
      if (typeof part === 'string') return leaf(part, last);
      if ('code' in part) {
        return codes === 'joined' || part.code.length === 0
          ? leaf(part.joined, last)
          : allOf(part.code, last);
      }
      const joined: Query = {
        combineWith: 'OR',
        queries: [part.joined],
        prefix: last,
        fuzzy: false,
      };
      if (part.hyphen.length === 0) return joined;
      return { combineWith: 'OR', queries: [allOf(part.hyphen, last), joined] };
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
  query: string,
  locale: Locale,
  options: SearchOptions = {},
  base?: string,
): CountedResults {
  const raw = queryParts(query);
  if (raw.length === 0) return { results: [], total: 0, matchedAll: 0 };
  const searchOptions = {
    bm25: BM25,
    prefix,
    fuzzy,
    boost: { ...FIELD_BOOST },
    // The kind's weight (stored), times the document's: a page about the guide weighs a quarter
    // (`DOC_WEIGHT`, review WP-33 pass 7 and 9).
    boostDocument: (_id: unknown, _term: string, stored?: Record<string, unknown>): number =>
      (typeof stored?.['w'] === 'number' ? stored['w'] : 1) *
      (DOC_WEIGHT[String(stored?.['d'])] ?? 1),
    filter: (hit: MiniSearchResult): boolean =>
      matchesFilters(hit as unknown as StoredFields, options),
  };
  const parts = raw;
  // The caller says whether the reader is still typing: the live dialog does; the search page and
  // the 404 suggestions do not (a submitted query is finished). Without a say, a query that ends
  // inside a word is being typed.
  const typing = options.typing ?? /[\p{L}\p{N}]$/u.test(query);
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
    const hits = index.search.search(queryTree(parts, typing, 'joined'), settings);
    if (codes.length === 0) return hits;
    const words = index.search.search(queryTree(parts, typing, 'words'), settings);
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
  const any = anyTree(parts, typing);
  const some =
    any.queries.length > 0
      ? index.search.search(any, searchOptions).filter((hit) => !found.has(hit.id))
      : [];
  // Pages about the guide ("How this was made", "What has changed"; `DOC_WEIGHT`) weigh a quarter
  // in every search (`boostDocument`), and (review WP-33 pass 7 to 9):
  // - asked for by the page's own title (every word of the query is in it: `how this was made`,
  //   `wat het verander`), the page's first entry leads;
  // - an entry whose own heading holds every word (`corrections`, `AI generated`) keeps its place
  //   among the all-words results, by its weighted score, and is never forced to the front, so
  //   `register` opens the Register page, not a changelog note that names it;
  // - an entry that holds every word only in its text (the corrections log naming "EMP201" next to
  //   "deadlines") ranks with the any-word results, so `PAYE deadline` opens the PAYE entry.
  const aboutGuide = (hit: MiniSearchResult): boolean => DOC_WEIGHT[String(hit['d'])] !== undefined;
  const guideHits = every.filter(aboutGuide);
  const named = new Set(
    guideHits.length > 0
      ? allWords({
          fields: ['title'],
          filter: (hit: MiniSearchResult) => aboutGuide(hit) && searchOptions.filter(hit),
        }).map((hit) => hit.id)
      : [],
  );
  // The first entry, in reading order, of an about-the-guide page whose title holds every word.
  const titled = guideHits
    .filter((hit) => titleHolds(String(hit['p']), parts, typing))
    .sort((a, b) => Number(a.id) - Number(b.id))[0];
  const demoted = (hit: MiniSearchResult): boolean => aboutGuide(hit) && !named.has(hit.id);
  const listed = every.filter((hit) => !demoted(hit) && hit !== titled);
  const all = titled === undefined ? listed : [titled, ...listed];
  const rest = [...every.filter((hit) => demoted(hit) && hit !== titled), ...some];
  const hits = [...all, ...rest.sort((a, b) => b.score - a.score)];
  const leading = new Set(all.map((hit) => hit.id));
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
