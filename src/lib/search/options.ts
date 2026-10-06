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
const HYPHEN = /^[-‐‑]$/;
/** One space (plain, no-break or narrow no-break) between the groups of an amount: `R120 000`. */
const GROUP_SPACE = /^[ \u00a0\u202f]$/;
/** An amount so far: `R`, `R120`, `R1200` (before its next group of three digits). */
const RAND_SO_FAR = /^R\d*$/i;
const THREE_DIGITS = /^\d{3}$/;
const YEAR = /^\d{4}$/;
const SHORT_YEAR = /^\d{2}$/;
/** Between the two halves of a tax year: `2026/27`, `2026-27`, `2026–27`. */
const TAX_YEAR_GAP = /^[/\-‐‑–]$/;
/** `R1m`, `R2.3m`, `R2,3m`: an amount in millions, written short. */
const SHORT_MILLIONS = /^R(\d+(?:[.,]\d+)?)m$/i;

/** `R1m` → `R1000000`, as `R1 million` is also indexed; `undefined` when it is not one. */
function inMillions(token: string): string | undefined {
  const match = SHORT_MILLIONS.exec(token);
  if (match?.[1] === undefined) return undefined;
  return `R${String(Math.round(Number(match[1].replace(',', '.')) * 1_000_000))}`;
}
/** `million` / `miljoen` after an amount: `R2.3 million` is also `R2300000`. */
const MILLION = /^(?:million|miljoen)$/i;

interface RawToken {
  readonly text: string;
  /** The characters between the previous token and this one. */
  readonly gap: string;
}

/**
 * Tokens, with the South African ways of writing an amount or a tax year made one token, the same
 * at index time and at query time (the query-kind table, `docs/design-system.md`):
 * - `R120 000`, `R 120 000` (groups of three after a space) → `R120000`, as `R120,000` folds to;
 * - `2026/27` → `2026` and `2027`, as the guide writes `2026/2027`.
 */
function rawTokens(text: string): RawToken[] {
  const out: RawToken[] = [];
  let end = 0;
  for (const match of text.matchAll(TOKEN)) {
    const gap = text.slice(end, match.index);
    end = match.index + match[0].length;
    const previous = out.at(-1);
    let token = match[0];
    if (previous !== undefined && GROUP_SPACE.test(gap) && RAND_SO_FAR.test(previous.text)) {
      const joinable = previous.text.length === 1 ? /^\d+$/.test(token) : THREE_DIGITS.test(token);
      if (joinable) {
        out[out.length - 1] = { text: `${previous.text}${token}`, gap: previous.gap };
        continue;
      }
    }
    // `R2.3m`: the amount and its `m` are one token in millions (`R1m` is matched whole below).
    if (previous !== undefined && gap === '' && /^m$/i.test(token)) {
      const millions = inMillions(`${previous.text}m`);
      if (millions !== undefined) {
        out[out.length - 1] = { text: millions, gap: previous.gap };
        continue;
      }
    }
    token = inMillions(token) ?? token;
    // A tax year: `2026/27` or `2026-27`, only when the short year is the year after.
    if (
      previous !== undefined &&
      TAX_YEAR_GAP.test(gap) &&
      YEAR.test(previous.text) &&
      SHORT_YEAR.test(token) &&
      Number(token) === (Number(previous.text) + 1) % 100
    ) {
      out.push({ text: String(Number(previous.text) + 1), gap: '/' });
      continue;
    }
    out.push({ text: token, gap });
  }
  return out;
}

/** The value of a folded amount (`r2.3` → 2.3), or `undefined` when it is not one. */
function randValue(folded: string): number | undefined {
  const match = /^r(\d+(?:\.\d+)?)$/.exec(folded);
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

/**
 * Split text into raw tokens, adding aliases so other spellings of the same thing meet:
 * - a form code written with a space: `SAPS 601` also gives `SAPS601`, only where the letters are a
 *   code (two or more capitals), so ordinary prose (`page 2`) does not grow the index;
 * - a hyphenated word, as one joined chain: `e-filing` also gives `efiling`, `pay-as-you-earn`
 *   also gives `payasyouearn`;
 * - an amount in millions: `R2.3 million` / `R2.3 miljoen` also give `R2300000`, so `R2,300,000`
 *   and `R2 300 000` find it.
 * A query is not tokenised this way: `queryParts` builds alternatives instead.
 */
export function tokenize(text: string): string[] {
  const tokens = rawTokens(text);
  const out: string[] = [];
  let chain = '';
  tokens.forEach((token, index) => {
    out.push(token.text);
    const next = tokens[index + 1];
    if (next !== undefined && CODE_PREFIX.test(token.text) && STARTS_WITH_DIGIT.test(next.text)) {
      out.push(`${token.text}${next.text}`);
    }
    if (next !== undefined && MILLION.test(next.text) && GROUP_SPACE.test(next.gap)) {
      const value = randValue(foldTerm(token.text));
      if (value !== undefined) out.push(`R${String(Math.round(value * 1_000_000))}`);
    }
    // Hyphen chains: the whole chain joined, once it ends.
    if (next !== undefined && HYPHEN.test(next.gap)) {
      chain = chain === '' ? `${token.text}${next.text}` : `${chain}${next.text}`;
    } else if (chain !== '') {
      out.push(chain);
      chain = '';
    }
  });
  return out;
}

/** Most query words searched; a pasted paragraph is cut here so a search stays fast. */
export const MAX_QUERY_TERMS = 12;

/**
 * One part of a query:
 * - a word (folded);
 * - a code written with a space (`VAT 264`, `vat 264`, `SAPS 60` while typing): its words without
 *   stop words, and the joined form;
 * - a hyphenated word (`BTW-registrasie`, `pay-as-you-earn`): its words without stop words, and the
 *   whole chain joined.
 */
export type QueryPart =
  | string
  | { readonly code: readonly string[]; readonly joined: string }
  | { readonly hyphen: readonly string[]; readonly joined: string };

const LETTERS = /^\p{L}{2,6}$/u;

/**
 * The parts of a query, at most `MAX_QUERY_TERMS` tokens. See `QueryPart` and the query-kind table.
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
    // A hyphen chain: every token joined by a hyphen to the one before.
    if (next !== undefined && HYPHEN.test(next.gap)) {
      let last = index + 1;
      while (tokens[last + 1] !== undefined && HYPHEN.test(tokens[last + 1]!.gap)) last++;
      const chain = tokens.slice(index, last + 1);
      const joined = processTerm(chain.map((t) => t.text).join(''));
      const words = chain.map((t) => processTerm(t.text)).filter((w): w is string => w !== null);
      if (joined !== null) out.push({ hyphen: words, joined });
      index = last;
      continue;
    }
    if (next !== undefined) {
      // A stop word before a number is a date or a count (`on 1 March`, `op 28 Februarie`), not a
      // code, unless it is written in capitals like one (`IT 12`) in a query not all in capitals.
      const codeWord = first !== null || (!shouting && token.text === token.text.toUpperCase());
      if (codeWord && LETTERS.test(token.text) && STARTS_WITH_DIGIT.test(next.text)) {
        const joined = processTerm(`${token.text}${next.text}`);
        const second = processTerm(next.text);
        if (joined !== null) {
          const words = [first, second].filter((w): w is string => w !== null);
          out.push({ code: words, joined });
          index++;
          continue;
        }
      }
    }
    if (first !== null) out.push(first);
  }
  return out;
}

/** An amount or a number: an optional `R`, then digits with `.` or `,` between them. */
const NUMBER_LIKE = /^r?\d[\d.,]*$/;

/**
 * One spelling for an amount: thousands separators go (`R120,000` → `r120000`), and a decimal comma
 * becomes a point (`R2,3` → `r2.3`, the Afrikaans way of writing `R2.3`). A comma is a thousands
 * separator when exactly three digits follow it; otherwise, at the end, it is a decimal comma.
 */
export function normaliseNumber(folded: string): string {
  if (!NUMBER_LIKE.test(folded)) return folded;
  return folded.replace(/,(?=\d{3}(?!\d))/g, '').replace(/,(\d{1,2})$/, '.$1');
}

/**
 * Lowercase and strip diacritics (`ê` → `e`, `ë` → `e`), so `sê` and `se` are the same term, and
 * write every amount one way (`normaliseNumber`). Used at index time, at query time and to mark
 * matches, so all three agree.
 */
export function foldTerm(term: string): string {
  return normaliseNumber(
    term
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .toLowerCase(),
  );
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
const AMOUNT = /^r\d[\d.]*$/;

function digits(term: string): number {
  return term.replace(/\D/g, '').length;
}

/**
 * The matching rule for one query term: the one place that says it, for every kind of term
 * (`docs/design-system.md`, "Search", the query-kind table; review WP-33 pass 4).
 *
 * - A bare number or year (`2`, `2026`, `14.3`) is matched whole: a value, not a stem.
 * - Any other term with a digit in it (a joined code `VAT264`, an amount `R500000`) is never
 *   fuzzy: one edit turns `EMP501` into `EMP201` and `R500000` into `R200000`, a different form or
 *   a different amount. It is prefix-matched only while the reader is still typing it (`last`), so
 *   `SAPS60` finds `SAPS601` and `R50` finds `R50000`, but a finished `R1` does not match `R146`.
 *   An amount stops being prefix-matched at four digits: `R500000` must not reach `R50000000`.
 * - A word of letters is prefix-matched from two letters (A7: prefix matching does the stemming
 *   work in every language) and fuzzy-matched (0.2) when longer than four letters (A7, for typos).
 * - A single letter is matched whole.
 *
 * `last` means the term is the last one in the query and the reader has not typed past it.
 */
export function matchRule(term: string, last: boolean): MatchRule {
  // A bare number or year is a value: `2` is not `20`, `2026` is not `20261`.
  if (NUMBER_ONLY.test(term)) return { prefix: false, fuzzy: false };
  // An amount is a value too, once it has four digits or more: `R500000` must not reach
  // `R50000000` (R50 million). While the first digits are typed (`R50`) it reaches its amounts.
  if (AMOUNT.test(term)) return { prefix: last && digits(term) <= 3, fuzzy: false };
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
