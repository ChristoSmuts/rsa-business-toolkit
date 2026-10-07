/**
 * `pnpm search:typos`: how often a one-letter typo still finds what the correct spelling finds
 * (review WP-33 pass 12). For every glossary term and page title in both languages, each word of
 * five letters or more is misspelt once per position: one letter dropped, or two neighbours
 * swapped. Counted, as finished and as typed: typos whose first result is the correct spelling's
 * first result, and typos whose first result is among its first three. Prints both counts; a
 * regression check for ranking changes, not a test.
 */
import { buildEntries } from './search/entries';
import { serialiseIndex } from './search/build';
import { loadIndexInput } from './search/load';
import { loadIndex, runSearch } from '../src/lib/search-client';

/** Every one-letter typo of `word`, after its first letter: a dropped letter, or a swap. */
export function typos(word: string): string[] {
  const out = new Set<string>();
  for (let i = 1; i < word.length; i++) {
    out.add(word.slice(0, i) + word.slice(i + 1));
    if (i + 1 < word.length) out.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }
  out.delete(word);
  return [...out];
}

let same = 0;
let held = 0;
let total = 0;
for (const lang of ['en', 'af'] as const) {
  const input = loadIndexInput(lang);
  const index = loadIndex(JSON.parse(serialiseIndex(lang, [], buildEntries(input)).json), lang);
  const queries = new Set<string>();
  for (const doc of input.docs) queries.add(doc.title.toLowerCase());
  for (const entry of input.glossary?.data.entries ?? []) {
    queries.add(entry.term.replace(/\s*\([^)]*\)/g, '').toLowerCase());
  }
  for (const query of queries) {
    const words = query.split(/\s+/);
    for (const typing of [false, true]) {
      const top3 = runSearch(index, query, lang, { limit: 3, typing }, '/').map((r) => r.href);
      if (top3.length === 0) continue;
      words.forEach((word, at) => {
        if (!/^\p{L}{5,}$/u.test(word)) return;
        for (const typo of typos(word)) {
          const misspelt = [...words.slice(0, at), typo, ...words.slice(at + 1)].join(' ');
          const first = runSearch(index, misspelt, lang, { limit: 1, typing }, '/')[0]?.href;
          total++;
          if (first !== undefined && first === top3[0]) same++;
          if (first !== undefined && top3.includes(first)) held++;
        }
      });
    }
  }
}
console.log(
  `search:typos: of ${String(total)} one-letter typos, ${String(same)} open the correct spelling's first result and ${String(held)} one of its first three.`,
);
