/**
 * Turn search entries into a serialised MiniSearch index and a content-hashed file name.
 * Pure apart from the hash: the CLI (`scripts/build-search-index.ts`) does the reading and writing.
 */
import { createHash } from 'node:crypto';
import MiniSearch from 'minisearch';
import { indexOptions, INDEX_VERSION } from '../../src/lib/search/options';
import type {
  SearchBestBet,
  SearchEntry,
  SerialisedIndex,
  StoredFields,
} from '../../src/lib/search/types';

/** ADR 0003: each language's index stays under 400 KB gzipped. */
export const INDEX_BUDGET_GZIP = 400 * 1024;

/** The document MiniSearch indexes: searchable fields plus the stored ones. */
export interface IndexedDocument extends StoredFields {
  readonly id: number;
  readonly title: string;
  readonly path: string;
  readonly text: string;
}

export function toIndexedDocument(entry: SearchEntry, id: number): IndexedDocument {
  const doc: Record<string, unknown> = {
    id,
    title: entry.indexTitle ?? entry.title,
    path: entry.path,
    text: entry.text,
    k: entry.kind,
    d: entry.doc,
    r: entry.route,
    a: entry.anchor,
    t: entry.title,
    p: entry.docTitle,
    s: entry.section,
    l: entry.lang,
    e: entry.entity,
    b: entry.businessTypes,
    w: entry.weight,
    x: entry.excerpt,
    h: entry.pageTitle,
  };
  for (const key of Object.keys(doc)) if (doc[key] === undefined) delete doc[key];
  return doc as unknown as IndexedDocument;
}

export function createIndex(entries: readonly SearchEntry[]): MiniSearch<IndexedDocument> {
  const search = new MiniSearch<IndexedDocument>(indexOptions<IndexedDocument>());
  search.addAll(entries.map((entry, index) => toIndexedDocument(entry, index)));
  return search;
}

export interface BuiltIndex {
  /** File name under `search/`, for example `en.3f9a1c2b7d.json`. */
  readonly file: string;
  /** The file's content. */
  readonly json: string;
  readonly entries: number;
}

/** Ten hex characters of the SHA-256 of the content: changes whenever the index does. */
export function contentHash(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 10);
}

export function serialiseIndex(
  lang: string,
  sections: readonly string[],
  entries: readonly SearchEntry[],
  bets: readonly SearchBestBet[] = [],
): BuiltIndex {
  const payload: SerialisedIndex = {
    v: INDEX_VERSION,
    lang,
    sections,
    index: createIndex(entries).toJSON(),
    ...(bets.length > 0 ? { bets } : {}),
  };
  const json = JSON.stringify(payload);
  return { file: `${lang}.${contentHash(json)}.json`, json, entries: entries.length };
}
