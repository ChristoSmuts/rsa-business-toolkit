/**
 * Build time only: where each language's search index was written. `pnpm search:build` writes the
 * record; pages read it to tell `<st-search>` which file to fetch. Never import this from a client
 * script: it reads the file system.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Locale } from '../../i18n/locales';
import { href } from '../paths';
import { INDEX_VERSION } from './options';
import type { SearchIndexRecord } from './types';

/**
 * Gitignored: rewritten by every `pnpm search:build`. Resolved from the working directory, not from
 * this module, because Astro bundles page code into chunks that live elsewhere at build time; pnpm
 * runs every script from the project root.
 */
export const RECORD_FILE = path.resolve(process.cwd(), 'src/generated/search-index.json');

function readRecord(file: string): SearchIndexRecord {
  if (!existsSync(file)) {
    throw new Error(
      `No search index record at ${file}. Run \`pnpm search:build\` (\`pnpm build\` and \`pnpm dev\` run it first).`,
    );
  }
  const record = JSON.parse(readFileSync(file, 'utf8')) as SearchIndexRecord;
  if (record.version !== INDEX_VERSION) {
    throw new Error(
      `The search index record is version ${String(record.version)}; run \`pnpm search:build\`.`,
    );
  }
  return record;
}

/**
 * The URL of a language's index, under the base path (`/business-toolkit/search/en.<hash>.json`).
 * The index is the same file for every page of a language, so it is never under the locale prefix.
 */
export function searchIndexUrl(locale: Locale, file: string = RECORD_FILE, base?: string): string {
  const name = readRecord(file).files[locale];
  if (name === undefined) {
    throw new Error(`The search index record has no ${locale} index; run \`pnpm search:build\`.`);
  }
  const route = `search/${name}`;
  return base === undefined ? href('en', route) : href('en', route, base);
}
