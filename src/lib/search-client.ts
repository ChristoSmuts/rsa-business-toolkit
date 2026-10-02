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
  FIELD_BOOST,
  foldTerm,
  fuzzy,
  INDEX_VERSION,
  indexOptions,
  prefix,
  queryParts,
  type QueryPart,
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

function toResult(hit: MiniSearchResult, locale: Locale, base: string | undefined): SearchResult {
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
  };
}

type Query = Parameters<MiniSearch['search']>[0];

/** A word that says too little to be searched on its own: one character, or only digits. */
function weak(part: QueryPart): boolean {
  return typeof part === 'string' && (part.length < 2 || /^[\d.,]+$/.test(part));
}

/**
 * The MiniSearch query for a list of parts. A pair is "both words, or the joined form", so a
 * spaced code (`VAT 264`) and a joined one (`VAT264`) find the same pages.
 */
export function queryTree(
  parts: readonly QueryPart[],
  combineWith: 'AND' | 'OR',
): Exclude<Query, string> {
  return {
    combineWith,
    queries: parts.map((part) =>
      typeof part === 'string'
        ? part
        : {
            combineWith: 'OR',
            queries: [{ combineWith: 'AND', queries: [...part.pair] }, part.joined],
          },
    ),
  };
}

/**
 * Run a query on a loaded index. Every word must match first (`AND`); when that finds nothing,
 * any word may (`OR`), so a long question still finds the pages that answer part of it. The `OR`
 * pass leaves out lone numbers and single letters: matched alone they would turn a junk query into
 * a list of every "Prompt 1" and "Option 1", where "nothing found" is the honest answer.
 */
export function runSearch(
  index: LoadedIndex,
  query: string,
  locale: Locale,
  options: SearchOptions = {},
  base?: string,
): SearchResult[] {
  const parts = queryParts(query);
  if (parts.length === 0) return [];
  const searchOptions = {
    bm25: BM25,
    prefix,
    fuzzy,
    boost: { ...FIELD_BOOST },
    boostDocument: (_id: unknown, _term: string, stored?: Record<string, unknown>): number =>
      typeof stored?.['w'] === 'number' ? stored['w'] : 1,
    filter: (hit: MiniSearchResult): boolean =>
      matchesFilters(hit as unknown as StoredFields, options),
  };
  let hits = index.search.search(queryTree(parts, 'AND'), searchOptions);
  const strong = parts.filter((part) => !weak(part));
  if (hits.length === 0 && strong.length > 0) {
    hits = index.search.search(queryTree(strong, 'OR'), searchOptions);
  }
  // Two entries can open the same place (a term and the section that explains it): keep the
  // better one, so the list never offers the same destination twice.
  const limit = options.limit ?? DEFAULT_LIMIT;
  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const hit of hits) {
    if (results.length === limit) break;
    const result = toResult(hit, locale, base);
    if (seen.has(result.href)) continue;
    seen.add(result.href);
    results.push(result);
  }
  return results;
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
  };
}
