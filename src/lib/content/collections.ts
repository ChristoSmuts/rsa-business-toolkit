/**
 * Thin access to the Astro content collections defined in `src/content.config.ts`.
 *
 * Only this file knows the collection names and the id shapes the loaders generate, so a page
 * asks for "the manifest" or "the English glossary" rather than for `getEntry('glossary', 'en')`.
 * Everything else in `src/lib/content/` is pure and takes the loaded data as an argument.
 */
import { getEntry } from 'astro:content';
import type { Locale } from '../../i18n/locales';
import type { Doc, GlossaryFile, Manifest, SourcesFile, TasksFile } from './schema';

export async function loadManifest(): Promise<Manifest> {
  const entry = await getEntry('manifest', 'manifest');
  if (!entry) throw new Error('src/data/manifest.json is missing. Run `pnpm content:build`.');
  return entry.data;
}

/** The document in a language, or `undefined` when it has not been translated yet. */
export async function loadDoc(lang: Locale, id: string): Promise<Doc | undefined> {
  const entry = await getEntry('docs', `${lang}/${id}`);
  return entry?.data;
}

export async function loadGlossary(lang: Locale): Promise<GlossaryFile | undefined> {
  return (await getEntry('glossary', lang))?.data;
}

export async function loadSources(lang: Locale): Promise<SourcesFile | undefined> {
  return (await getEntry('sources', lang))?.data;
}

export async function loadTasks(lang: Locale): Promise<TasksFile | undefined> {
  return (await getEntry('tasks', lang))?.data;
}
