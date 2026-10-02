/**
 * The MiniSearch options shared by the index build (`scripts/build-search-index.ts`) and the
 * browser (`src/lib/search-client.ts`). A serialised MiniSearch index does not carry its
 * functions, so both sides must tokenise and normalise exactly alike: this module is the one place
 * that says how. Pure and dependency-free, so the client bundle stays small.
 *
 * Build plan A7: a tokenizer that keeps form codes (`VAT264` is one term, `SAPS 601` is also
 * `saps601`), lowercase and diacritic stripping, prefix matching, and fuzzy matching (0.2) for
 * terms longer than four characters. No stemming: none of the South African languages except
 * English has a stemmer, so prefix and fuzzy matching do that work in every language (ADR 0003).
 */
import type { Options } from 'minisearch';
import type { SearchEntryKind } from './types';

/**
 * Bump when the index format or these options change in a way an old index cannot be read with.
 * The client refuses an index with another version and shows the failed state, rather than
 * returning wrong results.
 */
export const INDEX_VERSION = 1;

/** Fields that are searched. `text` is the body; `title` and `path` are boosted. */
export const SEARCH_FIELDS = ['title', 'path', 'text'] as const;

/** Fields stored with each entry and returned with a result (short keys keep the index small). */
export const STORE_FIELDS = ['k', 'd', 'r', 'a', 't', 'p', 's', 'l', 'e', 'b', 'w', 'x'] as const;

/** Field boosts (A7): a match in a title counts three times, in the breadcrumb path 1.5 times. */
export const FIELD_BOOST: Readonly<Record<(typeof SEARCH_FIELDS)[number], number>> = {
  title: 3,
  path: 1.5,
  text: 1,
};

/**
 * Ranking weight of each kind of entry. Multiplies the score of every entry of that kind.
 *
 * A7 gives checklist items 1.5. They are one line long, so BM25 already favours them over the
 * sections they sit in, and at 1.5 two checklist items that merely name `VAT264` pushed the section
 * that explains it out of the top three (A7's own test). They weigh the same as a section instead.
 */
export const KIND_WEIGHT: Readonly<Record<SearchEntryKind, number>> = {
  section: 1,
  glossary: 3,
  term: 2,
  task: 1,
  answer: 2,
};

/** Fuzzy distance as a fraction of the term length, for terms longer than `FUZZY_MIN_LENGTH`. */
export const FUZZY = 0.2;
export const FUZZY_MIN_LENGTH = 4;
/** Shorter query terms match whole words only: `a` or `ek` as a prefix matches almost everything. */
export const PREFIX_MIN_LENGTH = 2;

/**
 * Very common words in English and Afrikaans that carry no meaning for search. Dropped at index
 * time and at query time, in every language: the Afrikaans index holds English fallback text until
 * a document is translated, and a reader may type either language. Kept short on purpose; a word
 * that can be the point of a question (`not`, `nie`, `before`, `voor`) stays.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  // English
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'so',
  'that',
  'the',
  'this',
  'to',
  'what',
  'with',
  'you',
  'your',
  // Afrikaans
  'die',
  'en',
  'ek',
  'het',
  'hoe',
  'jou',
  'jy',
  'met',
  'n',
  'om',
  'op',
  'te',
  'van',
  'vir',
  'wat',
]);

/**
 * A token: letters and digits, with `.` or `,` allowed between digits so that `14.3`, `R2.3` and
 * `R120,000` stay whole. Everything else (spaces, punctuation, `›`, dashes) separates tokens.
 */
const TOKEN = /[\p{L}\p{N}]+(?:[.,]\p{N}+)*/gu;
/** A form-code prefix: two to six letters, at least two of them capitals (`SAPS`, `CoR`, `VAT`). */
const CODE_PREFIX = /^(?=(?:[^A-Z]*[A-Z]){2})[A-Za-z]{2,6}$/;
const STARTS_WITH_DIGIT = /^\p{N}/u;

/**
 * Split text into raw tokens, adding a joined alias for a form code written with a space:
 * `SAPS 601` gives `SAPS`, `601` and `SAPS601`, so `saps601` finds it too. The alias is added
 * only where the letters are a code (two or more capitals), so ordinary prose (`page 2`) does not
 * grow the index. A query is tokenised the same way, so `SAPS 601` typed in capitals carries the
 * alias as well, and a lower-case `saps 601` still finds both words.
 */
export function tokenize(text: string): string[] {
  const tokens = text.match(TOKEN) ?? [];
  const out: string[] = [];
  tokens.forEach((token, index) => {
    out.push(token);
    const next = tokens[index + 1];
    if (next !== undefined && CODE_PREFIX.test(token) && STARTS_WITH_DIGIT.test(next)) {
      out.push(`${token}${next}`);
    }
  });
  return out;
}

/** Lowercase and strip diacritics (`ê` → `e`, `ë` → `e`), so `sê` and `se` are the same term. */
export function foldTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

/**
 * MiniSearch `processTerm`: fold the term and drop stop words. Returning `null` drops a term, both
 * from the index and from a query.
 */
export function processTerm(term: string): string | null {
  const folded = foldTerm(term);
  if (folded === '' || STOP_WORDS.has(folded)) return null;
  return folded;
}

/** Per-term fuzzy distance: 0.2 for terms longer than four characters, otherwise exact. */
export function fuzzy(term: string): number | false {
  return term.length > FUZZY_MIN_LENGTH ? FUZZY : false;
}

/** Per-term prefix matching: on for terms of two characters or more. */
export function prefix(term: string): boolean {
  return term.length >= PREFIX_MIN_LENGTH;
}

/** The options a MiniSearch instance is created and loaded with, on both sides. */
export function indexOptions<T>(): Options<T> {
  return {
    fields: [...SEARCH_FIELDS],
    storeFields: [...STORE_FIELDS],
    tokenize,
    processTerm,
  };
}
