/**
 * Search best bets (`content-meta/search-best-bets.json`, review WP-33 pass 13): a short table of
 * common owner phrasings, per language, that must open one page (or one section of it) first.
 * Ranking catches most queries; a best bet pins the few that matter most. The index build resolves
 * each target to its entry and fails when a target is missing in any language, so a renamed page or
 * heading fails `pnpm build`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { resolveActs } from './acts';
import type { Locale } from '../../src/i18n/locales';
import { betWords, foldTerm, writtenWord } from '../../src/lib/search/options';
import type { SearchBestBet, SearchEntry } from '../../src/lib/search/types';

export const BEST_BETS_FILE = path.resolve(
  import.meta.dirname,
  '../../content-meta/search-best-bets.json',
);

const Phrases = z.array(z.string().min(1)).min(1);

export const BestBetsFileSchema = z.object({
  $comment: z.string().optional(),
  /** Words a best bet ignores in a query, per language, besides the stop words. */
  filler: z.object({ en: z.array(z.string().min(1)), af: z.array(z.string().min(1)) }).strict(),
  bets: z
    .array(
      z
        .object({
          doc: z.string().min(1),
          anchor: z.string().min(1).optional(),
          en: Phrases,
          af: Phrases,
        })
        .strict(),
    )
    .min(1),
});

export type BestBetsFile = z.infer<typeof BestBetsFileSchema>;

export function loadBestBets(file: string = BEST_BETS_FILE): BestBetsFile {
  return BestBetsFileSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

/** Most phrases per language: the table stays a short list of obvious answers. */
export const MAX_BEST_BETS = 120;

/**
 * Each phrase of `lang`, normalised as a query is (`betWords`), with the index of the entry it
 * opens: the section with `anchor` (or the glossary entry), or the page's first entry. Throws when
 * a target has no entry, when a phrase says nothing after stop words, when two phrases of a
 * language read the same, or when a language has more than `MAX_BEST_BETS` phrases.
 */
export interface ResolvedBestBets {
  readonly bets: readonly SearchBestBet[];
  /** The filler words of the language, read as a query reads them (stop words dropped). */
  readonly filler: readonly string[];
  /** The Acts of the sources register, by name (`resolveActs`). */
  readonly acts: readonly SearchBestBet[];
}

export function resolveBestBets(
  lang: Locale,
  entries: readonly SearchEntry[],
  file: BestBetsFile = loadBestBets(),
): ResolvedBestBets {
  const out: SearchBestBet[] = [];
  const seen = new Map<string, string>();
  for (const bet of file.bets) {
    const key = bet.anchor === undefined ? undefined : `${bet.doc}#${bet.anchor}`;
    const id = entries.findIndex((entry) =>
      key === undefined
        ? entry.doc === bet.doc && entry.kind === 'section'
        : entry.key === key && (entry.kind === 'section' || entry.kind === 'glossary'),
    );
    const target = key ?? bet.doc;
    if (id < 0) throw new Error(`search: best bet target ${target} has no ${lang} entry`);
    for (const phrase of bet[lang as 'en' | 'af']) {
      const words = betWords(phrase);
      if (words.length === 0) {
        throw new Error(`search: best bet "${phrase}" (${lang}) has only stop words`);
      }
      const read = words.join(' ');
      const other = seen.get(read);
      if (other !== undefined) {
        throw new Error(`search: best bets "${other}" and "${phrase}" (${lang}) read the same`);
      }
      seen.set(read, phrase);
      out.push({ w: words, id });
    }
  }
  if (out.length > MAX_BEST_BETS) {
    throw new Error(
      `search: ${String(out.length)} ${lang} best bets, more than ${String(MAX_BEST_BETS)}`,
    );
  }
  return {
    bets: out,
    filler: resolveFiller(file.filler[lang as 'en' | 'af'], entries),
    acts: resolveActs(lang, entries),
  };
}

/**
 * The filler words as a query reads them (`betWords`: folded, stop words dropped). A word written
 * with a diacritic (`sê`, `hê`, `reëls`) is also listed as written, and the client drops it before
 * folding (`dropWrittenFiller`). Its folded form is filler too, so an owner who types `he` for `hê`
 * is understood, unless the guide writes that folded form as a word of its own: `sê` ("say") folds
 * to the possessive `se`, which the guide uses hundreds of times, so only `sê` is filler (review
 * WP-33 pass 19b).
 */
export function resolveFiller(words: readonly string[], entries: readonly SearchEntry[]): string[] {
  const out = new Set<string>();
  let plain: Set<string> | undefined;
  for (const word of words) {
    const written = writtenWord(word);
    if (/^\p{L}+$/u.test(written) && foldTerm(written) !== written) {
      out.add(written);
      plain ??= guideWords(entries);
      if (plain.has(foldTerm(written))) continue;
    }
    for (const read of betWords(word)) out.add(read);
  }
  return [...out];
}

/** Every word of the entries' searchable text as written (`writtenWord`). */
function guideWords(entries: readonly SearchEntry[]): Set<string> {
  const out = new Set<string>();
  for (const entry of entries) {
    const text = [entry.indexTitle ?? entry.title, entry.path, entry.text, entry.lead ?? ''].join(
      ' ',
    );
    for (const match of text.matchAll(/\p{L}+/gu)) out.add(writtenWord(match[0]));
  }
  return out;
}
