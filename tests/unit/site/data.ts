/**
 * The generated content, read straight off disk for the site-side unit tests.
 *
 * The site's own loaders go through `astro:content`, which needs the Astro runtime, so these
 * tests read `src/data/**` with `node:fs` and validate it with the same Zod schemas the content
 * layer uses. A shape the schema rejects therefore fails here too, rather than at build time.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DocSchema,
  GlossaryFileSchema,
  ManifestSchema,
  SourcesFileSchema,
  type Doc,
  type GlossaryFile,
  type Manifest,
  type SourcesFile,
} from '../../../src/lib/content/schema';

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);
export const DATA_DIR = path.join(REPO_ROOT, 'src', 'data');

function readJson(...segments: string[]): unknown {
  return JSON.parse(readFileSync(path.join(DATA_DIR, ...segments), 'utf8'));
}

let manifest: Manifest | undefined;
let docs: Doc[] | undefined;

export function realManifest(): Manifest {
  manifest ??= ManifestSchema.parse(readJson('manifest.json'));
  return manifest;
}

/** Every English document, sorted by id, as the pages see it. */
export function realDocs(): Doc[] {
  docs ??= readdirSync(path.join(DATA_DIR, 'en', 'docs'))
    .filter((file) => file.endsWith('.json'))
    .map((file) => DocSchema.parse(readJson('en', 'docs', file)))
    .sort((a, b) => a.id.localeCompare(b.id));
  return docs;
}

export function realDoc(id: string): Doc {
  const doc = realDocs().find((entry) => entry.id === id);
  if (!doc) throw new Error(`no document ${id} in src/data/en/docs`);
  return doc;
}

export function realSources(lang: 'en' | 'af' = 'en'): SourcesFile {
  return SourcesFileSchema.parse(readJson(lang, 'sources.json'));
}

export function realGlossary(): GlossaryFile {
  return GlossaryFileSchema.parse(readJson('en', 'glossary.json'));
}
