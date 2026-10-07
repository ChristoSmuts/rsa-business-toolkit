/**
 * Astro content-layer collections over the generated JSON in `src/data` (Part A8).
 *
 * Schemas come from `src/lib/content/schema.ts`, which imports `z` from `zod`. `astro/zod` re-exports the
 * same installed zod 4 package, so the pipeline and Astro validate with one Zod instance.
 */
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import {
  BusinessTypeSchema,
  DocSchema,
  GlossaryFileSchema,
  ManifestSchema,
  PathsFileSchema,
  QuickAnswersFileSchema,
  SourcesFileSchema,
  TasksFileSchema,
} from './lib/content/schema';

const DATA = './src/data';

/** `en/glossary.json` → `en`. */
const langId = ({ entry }: { entry: string }): string => entry.split('/')[0] ?? entry;

export const collections = {
  docs: defineCollection({
    loader: glob({
      pattern: '*/docs/*.json',
      base: DATA,
      generateId: ({ data }) => `${String(data['lang'])}/${String(data['id'])}`,
    }),
    schema: DocSchema,
  }),
  glossary: defineCollection({
    loader: glob({ pattern: '*/glossary.json', base: DATA, generateId: langId }),
    schema: GlossaryFileSchema,
  }),
  sources: defineCollection({
    loader: glob({ pattern: '*/sources.json', base: DATA, generateId: langId }),
    schema: SourcesFileSchema,
  }),
  tasks: defineCollection({
    loader: glob({ pattern: '*/tasks.json', base: DATA, generateId: langId }),
    schema: TasksFileSchema,
  }),
  quickAnswers: defineCollection({
    loader: glob({ pattern: '*/quick-answers.json', base: DATA, generateId: langId }),
    schema: QuickAnswersFileSchema,
  }),
  manifest: defineCollection({
    loader: glob({ pattern: 'manifest.json', base: DATA, generateId: () => 'manifest' }),
    schema: ManifestSchema,
  }),
  /** The reading-path rules (A5, WP-31); `scripts/content/paths.ts` checks their references. */
  paths: defineCollection({
    loader: glob({ pattern: 'paths.json', base: DATA, generateId: () => 'paths' }),
    schema: PathsFileSchema,
  }),
  businessTypes: defineCollection({
    loader: file('content-meta/business-types.json', {
      parser: (text) => (JSON.parse(text) as { types: Record<string, unknown>[] }).types,
    }),
    schema: BusinessTypeSchema,
  }),
};
