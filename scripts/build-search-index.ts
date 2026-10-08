/**
 * `pnpm search:build`: one MiniSearch index per enabled language (build plan A7, ADR 0003).
 *
 * Writes `public/search/<lang>.<hash>.json` (gitignored; Astro copies it to `dist/search/`, under the
 * base path) and records the file names in `src/generated/search-index.json` (also gitignored), where
 * the pages read them at build time (`src/lib/search/files.ts`). Old index files are removed, so a
 * deploy never carries a stale one. Fails when a language's index is over its 400 KB gzip budget.
 *
 * `pnpm build` runs this before `astro build`.
 */
import { gzipSync } from 'node:zlib';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ENABLED_LOCALES } from '../src/i18n/locales';
import { INDEX_VERSION } from '../src/lib/search/options';
import type { SearchIndexRecord } from '../src/lib/search/types';
import { RECORD_FILE } from '../src/lib/search/files';
import { loadBestBets, resolveBestBets } from './search/best-bets';
import { INDEX_BUDGET_GZIP, serialiseIndex } from './search/build';
import { buildEntries } from './search/entries';
import { loadIndexInput } from './search/load';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'search');

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const file of readdirSync(OUT_DIR)) {
    if (file.endsWith('.json')) rmSync(path.join(OUT_DIR, file));
  }
  const files: Record<string, string> = {};
  const bets = loadBestBets();
  let failed = false;
  for (const lang of ENABLED_LOCALES) {
    const input = loadIndexInput(lang);
    const sections = [...input.manifest.sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => section.id);
    const entries = buildEntries(input);
    // Fails the build when a best bet's page or heading is missing in this language.
    const built = serialiseIndex(lang, sections, entries, resolveBestBets(lang, entries, bets));
    writeFileSync(path.join(OUT_DIR, built.file), built.json);
    files[lang] = built.file;
    const gzip = gzipSync(built.json, { level: 9 }).length;
    const over = gzip > INDEX_BUDGET_GZIP;
    failed ||= over;
    console.log(
      `search:build: ${built.file}: ${String(built.entries)} entries, ${kb(Buffer.byteLength(built.json))} raw, ${kb(gzip)} gzip` +
        (over ? ` — OVER the ${kb(INDEX_BUDGET_GZIP)} budget` : ''),
    );
  }
  const record: SearchIndexRecord = { version: INDEX_VERSION, files };
  mkdirSync(path.dirname(RECORD_FILE), { recursive: true });
  writeFileSync(RECORD_FILE, `${JSON.stringify(record, null, 2)}\n`);
  if (failed) {
    console.error('search:build: an index is over budget; split it by section (ADR 0003).');
    process.exit(1);
  }
}

main();
