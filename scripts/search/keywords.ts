/**
 * Search keywords (`content-meta/search-keywords.json`, review WP-33 pass 14): owner words that a
 * page's own titles lack ("register business" for "Register: what you actually need"), indexed with
 * the page's first entry, in its heading field, so the ranking finds the page however the owner
 * phrases the rest. A separate file from the best bets, because the two do different jobs: a
 * keyword is ranking input that every query benefits from, a best bet pins one exact phrasing.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Locale } from '../../src/i18n/locales';
import type { Manifest } from '../../src/lib/content/schema';

export const KEYWORDS_FILE = path.resolve(
  import.meta.dirname,
  '../../content-meta/search-keywords.json',
);

const Words = z.array(z.string().min(1)).min(1).max(6);

export const KeywordsFileSchema = z.object({
  $comment: z.string().optional(),
  pages: z.array(z.object({ doc: z.string().min(1), en: Words, af: Words }).strict()).min(1),
});

export type KeywordsFile = z.infer<typeof KeywordsFileSchema>;

export function loadKeywordsFile(file: string = KEYWORDS_FILE): KeywordsFile {
  return KeywordsFileSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

/**
 * The keywords of each page in `lang`, by document id. Throws when a page is not in the manifest
 * or is listed twice, so a renamed page fails `pnpm build`.
 */
export function keywordsFor(
  lang: Locale,
  manifest: Manifest,
  file: KeywordsFile = loadKeywordsFile(),
): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, readonly string[]>();
  for (const page of file.pages) {
    if (manifest.docs[page.doc] === undefined) {
      throw new Error(`search: keywords for ${page.doc}, which is not in the manifest`);
    }
    if (out.has(page.doc)) throw new Error(`search: keywords for ${page.doc} listed twice`);
    out.set(page.doc, page[lang as 'en' | 'af']);
  }
  return out;
}
