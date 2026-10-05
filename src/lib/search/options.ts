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

/** A hyphen (or a non-breaking hyphen) and nothing else between two tokens: `e-filing`. */
const HYPHEN = /^[-\u2010\u2011]$/;

interface RawToken {
  readonly text: string;
  /** The characters between the previous token and this one. */
  readonly gap: string;
}

function rawTokens(text: string): RawToken[] {
  const out: RawToken[] = [];
  let end = 0;
  for (const match of text.matchAll(TOKEN)) {
    out.push({ text: match[0], gap: text.slice(end, match.index) });
    end = match.index + match[0].length;
  }
  return out;
}

/**
 * Split text into raw tokens, adding a joined alias in two cases:
 * - a form code written with a space: `SAPS 601` gives `SAPS`, `601` and `SAPS601`, so `saps601`
 *   finds it too. Only where the letters are a code (two or more capitals), so ordinary prose
 *   (`page 2`) does not grow the index;
 * - a hyphenated word: `e-filing` gives `e`, `filing` and `efiling`, so `eFiling` and `e-filing`
 *   meet.
 * A query is not tokenised this way: `queryParts` makes each such pair an alternative instead.
 */
export function tokenize(text: string): string[] {
  const tokens = rawTokens(text);
  const out: string[] = [];
  tokens.forEach((token, index) => {
    out.push(token.text);
    const next = tokens[index + 1];
    if (next === undefined) return;
    const code = CODE_PREFIX.test(token.text) && STARTS_WITH_DIGIT.test(next.text);
    if (code || HYPHEN.test(next.gap)) out.push(`${token.text}${next.text}`);
  });
  return out;
}

/** Most query words searched; a pasted paragraph is cut here so a search stays fast. */
export const MAX_QUERY_TERMS = 12;

/**
 * One word of a query; a pair that may also be written joined; or (after the client has checked the
 * index, `resolvePairs`) the joined form to match exactly.
 */
export type QueryPart =
  | string
  | {
      readonly pair: readonly [string, string];
      readonly joined: string;
      /** `true` for a hyphenated word (`BTW-registrasie`), absent for a code (`VAT 264`). */
      readonly hyphen?: true;
    }
  | { readonly exact: string };

const LETTERS = /^\p{L}{2,6}$/u;

/**
 * The words of a query, folded, without stop words, at most `MAX_QUERY_TERMS`. Two neighbours
 * that are one thing written two ways become a pair: letters followed by a number (`vat 264`,
 * `SAPS 601`, in any case) or a hyphenated word (`e-filing`). The client searches a pair as
 * "both words, or the joined form", so `VAT 264` finds every page that writes `VAT264`.
 */
export function queryParts(text: string): QueryPart[] {
  const tokens = rawTokens(text).slice(0, MAX_QUERY_TERMS);
  // A query typed all in capitals (Caps Lock, a copied heading) says nothing by its capitals.
  const shouting = text === text.toUpperCase();
  const out: QueryPart[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    const next = tokens[index + 1];
    const first = processTerm(token.text);
    if (next !== undefined) {
      // A stop word before a number is a date or a count (`on 1 March`, `op 28 Februarie`), not a
      // code, unless it is written in capitals like one (`IT 12`).
      // An all-capitals query (`ON 1 MARCH`) is read as a date too.
      const codeWord = first !== null || (!shouting && token.text === token.text.toUpperCase());
      const isCode = codeWord && LETTERS.test(token.text) && STARTS_WITH_DIGIT.test(next.text);
      const hyphen = HYPHEN.test(next.gap);
      if (isCode || hyphen) {
        const second = processTerm(next.text);
        const joined = processTerm(`${token.text}${next.text}`);
        if (joined !== null) {
          const pair: [string, string] | undefined =
            first !== null && second !== null ? [first, second] : undefined;
          out.push(
            pair === undefined
              ? joined
              : isCode && !hyphen
                ? { pair, joined }
                : { pair, joined, hyphen: true },
          );
          index++;
          continue;
        }
      }
    }
    if (first !== null) out.push(first);
  }
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

/** How one query term is matched against the index terms. */
export interface MatchRule {
  readonly prefix: boolean;
  readonly fuzzy: number | false;
}

const HAS_DIGIT = /\p{N}/u;
const NUMBER_ONLY = /^[\p{N}.,]+$/u;

/**
 * The matching rule for one query term: the one place that says it, for every kind of term
 * (`docs/design-system.md`, "Search", the query-kind table; review WP-33 pass 4).
 *
 * - A bare number or year (`2`, `2026`, `14.3`) is matched whole: a value, not a stem.
 * - Any other term with a digit in it (a joined code `VAT264`, an amount `R500,000`) is never fuzzy: one edit turns `EMP501` into `EMP201` and `R500,000` into
 *   `R200,000`, a different form or a different amount. It is prefix-matched only while the reader
 *   is still typing it (`last`), so `R50` finds `R50,000` but a finished `R1` in `R1 million` does
 *   not match `R10`.
 * - A word of letters is prefix-matched from two letters (A7: prefix matching does the stemming
 *   work in every language) and fuzzy-matched (0.2) when longer than four letters (A7, for typos).
 * - A single letter is matched whole.
 *
 * `last` means the term is the last one in the query and the reader has not typed past it.
 */
export function matchRule(term: string, last: boolean): MatchRule {
  // A bare number or year is a value: `2` is not `20`, `2026` is not `20261`.
  if (NUMBER_ONLY.test(term)) return { prefix: false, fuzzy: false };
  if (HAS_DIGIT.test(term)) return { prefix: last, fuzzy: false };
  return {
    prefix: term.length >= PREFIX_MIN_LENGTH,
    fuzzy: term.length > FUZZY_MIN_LENGTH ? FUZZY : false,
  };
}

/** Per-term fuzzy distance, for a term the query tree has not set a rule for (`matchRule`). */
export function fuzzy(term: string): number | false {
  return matchRule(term, true).fuzzy;
}

/** Per-term prefix matching, for a term the query tree has not set a rule for (`matchRule`). */
export function prefix(term: string): boolean {
  return matchRule(term, true).prefix;
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
