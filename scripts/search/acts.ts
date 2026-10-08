/**
 * Act names for search (review WP-33 pass 18, major 2). The Acts come from the sources register's
 * own data (`src/data/<lang>/sources.json`, `acts`); `content-meta/search-act-names.json` adds the
 * short names and Afrikaans compounds owners type (`popia act`, `maatskappywet`). A query that is
 * exactly one of these names, optionally with the Act's number and year, opens the register's
 * "Legislation this toolkit relies on", the entry that lists every Act. A bare law word (`law`,
 * `act`, `regulasies`) is not an Act name and gets ordinary ranking.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Locale } from '../../src/i18n/locales';
import { betWords } from '../../src/lib/search/options';
import type { SearchBestBet, SearchEntry } from '../../src/lib/search/types';
import { DATA_DIR } from './load';

export const ACT_NAMES_FILE = path.resolve(
  import.meta.dirname,
  '../../content-meta/search-act-names.json',
);

/** The register entry an Act name opens. */
export const ACT_TARGET = 'lookup/sources#legislation-this-toolkit-relies-on';

const Names = z.array(z.string().min(1));

export const ActNamesFileSchema = z.object({
  $comment: z.string().optional(),
  acts: z.array(z.object({ id: z.string().min(1), en: Names, af: Names }).strict()),
});

export type ActNamesFile = z.infer<typeof ActNamesFileSchema>;

const SourcesActsSchema = z.object({
  acts: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
});

export function loadActNames(file: string = ACT_NAMES_FILE): ActNamesFile {
  return ActNamesFileSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

/** The Acts the register lists in `lang`: id and name. */
export function registerActs(
  lang: Locale,
  dataDir: string = DATA_DIR,
): { id: string; name: string }[] {
  const file = path.join(dataDir, lang, 'sources.json');
  return SourcesActsSchema.parse(JSON.parse(readFileSync(file, 'utf8'))).acts;
}

/** "Companies Act 71 of 2008" → "Companies Act": the name an owner types. */
export function actShortName(name: string): string {
  return name.replace(/\s+\d+\s+of\s+\d{4}\s*$/u, '').trim();
}

/**
 * Every Act name of `lang` as query words (`betWords`), each with the entry it opens. Throws when
 * the register entry is missing, when a name in the names file is for an Act the register does
 * not list, or when two Acts share a name.
 */
export function resolveActs(
  lang: Locale,
  entries: readonly SearchEntry[],
  names: ActNamesFile = loadActNames(),
  acts: readonly { id: string; name: string }[] = registerActs(lang),
): SearchBestBet[] {
  const id = entries.findIndex((entry) => entry.key === ACT_TARGET && entry.kind === 'section');
  if (id < 0) throw new Error(`search: act target ${ACT_TARGET} has no ${lang} entry`);
  const known = new Set(acts.map((act) => act.id));
  for (const extra of names.acts) {
    if (!known.has(extra.id)) throw new Error(`search: act names for unknown Act ${extra.id}`);
  }
  const out: SearchBestBet[] = [];
  const seen = new Map<string, string>();
  for (const act of acts) {
    const extra = names.acts.find((entry) => entry.id === act.id);
    // The English short names hold in Afrikaans too: the Afrikaans register keeps them.
    const phrases = [
      actShortName(act.name),
      ...(extra?.en ?? []),
      ...(lang === 'af' ? (extra?.af ?? []) : []),
    ];
    for (const phrase of phrases) {
      const words = betWords(phrase);
      const read = words.join(' ');
      const other = seen.get(read);
      if (other === act.id) continue;
      if (other !== undefined) {
        throw new Error(`search: Acts ${other} and ${act.id} share the name "${phrase}" (${lang})`);
      }
      seen.set(read, act.id);
      out.push({ w: words, id });
    }
  }
  return out;
}
