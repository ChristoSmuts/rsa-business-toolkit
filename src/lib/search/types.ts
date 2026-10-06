/**
 * Shapes shared by the search index build and the browser client (build plan A7).
 *
 * An index entry is stored with one-letter keys, because every stored field is repeated for each
 * of the ~1,000 entries in a language's index. `SearchEntry` is the readable form the builder
 * works with; `StoredFields` is what the serialised index holds.
 */

/** What an entry points at: a part of a page, a glossary word, a "Words used" term, a checklist item, a common question. */
export const SEARCH_ENTRY_KINDS = ['section', 'glossary', 'term', 'task', 'answer'] as const;
export type SearchEntryKind = (typeof SEARCH_ENTRY_KINDS)[number];

/** One searchable entry, as the builder produces it. */
export interface SearchEntry {
  /** Stable within one build: `core/register#popia` (section), `glossary#pis`, … */
  readonly key: string;
  readonly kind: SearchEntryKind;
  /** Document the result opens. */
  readonly doc: string;
  /** Its site-relative route (`core/register/`), so the browser needs no manifest to link it. */
  readonly route: string;
  /** Heading or glossary id on that page, shared by every language. Absent: the top of the page. */
  readonly anchor?: string | undefined;
  /** What the result is called: the heading, the term, the task or the question. */
  readonly title: string;
  /** What is indexed in the boosted `title` field, when it is not `title` (tasks: nothing). */
  readonly indexTitle?: string | undefined;
  /** The page it is on, for "page › heading". */
  readonly docTitle: string;
  /**
   * Set on the first entry of a page only: the H1 the page shows, which can differ from the title
   * in the navigation (`docTitle`). With it, a query that names the page leads with the page.
   */
  readonly pageTitle?: string | undefined;
  /** Searchable breadcrumb: section › page › parent heading. */
  readonly path: string;
  /** Searchable body text. */
  readonly text: string;
  /** Short text shown under the result. */
  readonly excerpt?: string | undefined;
  readonly section: string;
  /**
   * Language of `title`, `text` and `excerpt` when it is not the index's own language: an
   * Afrikaans index holds English entries for documents that are not translated yet.
   */
  readonly lang?: string | undefined;
  /** Applies only to this kind of business owner (`sole-prop`, `pty`). Absent: everyone. */
  readonly entity?: 'sole-prop' | 'pty' | undefined;
  /** Applies only to these business types. Absent: every type. */
  readonly businessTypes?: readonly string[] | undefined;
  /** Ranking weight from the kind (A7). */
  readonly weight: number;
}

/** The stored fields of an entry in the serialised index (see `STORE_FIELDS`). */
export interface StoredFields {
  readonly k: SearchEntryKind;
  readonly d: string;
  readonly r: string;
  readonly a?: string;
  readonly t: string;
  readonly p: string;
  readonly s: string;
  readonly l?: string;
  readonly e?: 'sole-prop' | 'pty';
  readonly b?: readonly string[];
  readonly w: number;
  readonly x?: string;
  /** `pageTitle`: the page's H1, on its first entry. */
  readonly h?: string;
}

/** The file written to `public/search/<lang>.<hash>.json`. */
export interface SerialisedIndex {
  /** `INDEX_VERSION` the file was built with. */
  readonly v: number;
  readonly lang: string;
  /** Section ids in reading order, so result groups follow the site's order on ties. */
  readonly sections: readonly string[];
  /** `MiniSearch#toJSON()`. */
  readonly index: unknown;
}

/** The record the build writes so pages can find each language's index file. */
export interface SearchIndexRecord {
  readonly version: number;
  /** File name under `search/` per language, for example `en.3f9a1c2b7d.json`. */
  readonly files: Readonly<Record<string, string>>;
}
