/**
 * Read the generated content in `src/data` for one search index language. A document, the
 * glossary, the tasks and the common questions each fall back to English until they are
 * translated, and say which language they are in, so the Afrikaans index can mark English
 * results (build plan A6, A7).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import { DEFAULT_LOCALE, type Locale } from '../../src/i18n/locales';
import {
  DocSchema,
  GlossaryFileSchema,
  ManifestSchema,
  QuickAnswersFileSchema,
  TasksFileSchema,
  type Doc,
  type Manifest,
} from '../../src/lib/content/schema';
import type { IndexInput, LangData } from './entries';

export const DATA_DIR = path.resolve(import.meta.dirname, '../../src/data');

function readJson<T>(file: string, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

export function loadManifest(dataDir: string = DATA_DIR): Manifest {
  return readJson(path.join(dataDir, 'manifest.json'), ManifestSchema);
}

/** `core/register` → `core__register.json`, as `scripts/content/write.ts` names it. */
export function docFileName(id: string): string {
  return `${id.replaceAll('/', '__')}.json`;
}

function inLangOrEnglish<T>(
  dataDir: string,
  lang: Locale,
  relative: string,
  schema: z.ZodType<T>,
): LangData<T> | undefined {
  for (const candidate of lang === DEFAULT_LOCALE ? [lang] : [lang, DEFAULT_LOCALE]) {
    const file = path.join(dataDir, candidate, relative);
    if (existsSync(file)) return { data: readJson(file, schema), lang: candidate };
  }
  return undefined;
}

export function loadIndexInput(lang: Locale, dataDir: string = DATA_DIR): IndexInput {
  const manifest = loadManifest(dataDir);
  const docs: Doc[] = [];
  for (const id of Object.keys(manifest.docs).sort()) {
    const loaded = inLangOrEnglish(dataDir, lang, path.join('docs', docFileName(id)), DocSchema);
    if (loaded === undefined) throw new Error(`search: ${id} has no generated JSON in src/data`);
    docs.push(loaded.data);
  }
  return {
    lang,
    manifest,
    docs,
    glossary: inLangOrEnglish(dataDir, lang, 'glossary.json', GlossaryFileSchema),
    tasks: inLangOrEnglish(dataDir, lang, 'tasks.json', TasksFileSchema),
    quickAnswers: inLangOrEnglish(dataDir, lang, 'quick-answers.json', QuickAnswersFileSchema),
  };
}
