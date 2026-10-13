/**
 * Search keywords (`content-meta/search-keywords.json`, review WP-33 pass 14): owner words that a
 * page's own titles lack ("register business" for "Register: what you actually need"), indexed with
 * the page's first entry, in its heading field, so the ranking finds the page however the owner
 * phrases the rest. A separate file from the best bets, because the two do different jobs: a
 * keyword is ranking input that every query benefits from, a best bet pins one exact phrasing.
 *
 * With `anchor`, the words go to that section's entry instead of the page's first: "Employees,
 * including yourself" also holds `staff` and `hiring`, which its own heading lacks (post-WP-50a
 * review pass 2, minor 2).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Locale } from '../../src/i18n/locales';
import type { Doc, Manifest } from '../../src/lib/content/schema';

export const KEYWORDS_FILE = path.resolve(
  import.meta.dirname,
  '../../content-meta/search-keywords.json',
);

const Words = z.array(z.string().min(1)).min(1).max(6);

export const KeywordsFileSchema = z.object({
  $comment: z.string().optional(),
  pages: z
    .array(
      z
        .object({
          doc: z.string().min(1),
          anchor: z.string().min(1).optional(),
          en: Words,
          af: Words,
        })
        .strict(),
    )
    .min(1),
});

export type KeywordsFile = z.infer<typeof KeywordsFileSchema>;

export function loadKeywordsFile(file: string = KEYWORDS_FILE): KeywordsFile {
  return KeywordsFileSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

/**
 * The keywords of each page in `lang`, by document id, or by `doc#anchor` for a section. Throws
 * when a page is not in the manifest, when a section is not a heading of the page (given `docs`),
 * or when a place is listed twice, so a renamed page or heading fails `pnpm build`.
 */
export function keywordsFor(
  lang: Locale,
  manifest: Manifest,
  file: KeywordsFile = loadKeywordsFile(),
  docs?: readonly Pick<Doc, 'id' | 'headings'>[],
): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, readonly string[]>();
  for (const page of file.pages) {
    if (manifest.docs[page.doc] === undefined) {
      throw new Error(`search: keywords for ${page.doc}, which is not in the manifest`);
    }
    const key = page.anchor === undefined ? page.doc : `${page.doc}#${page.anchor}`;
    if (page.anchor !== undefined && docs !== undefined) {
      const doc = docs.find((candidate) => candidate.id === page.doc);
      if (!doc?.headings.some((heading) => heading.id === page.anchor)) {
        throw new Error(`search: keywords for ${key}, which is not a heading of the page`);
      }
    }
    if (out.has(key)) throw new Error(`search: keywords for ${key} listed twice`);
    out.set(key, page[lang as 'en' | 'af']);
  }
  return out;
}
