/**
 * Manifest lookups: document and section ids to routes, titles and neighbours.
 *
 * Every internal URL the content renderers build goes through here and then through `href()`
 * from `src/lib/paths.ts`, so a document id in the content JSON becomes the same URL everywhere
 * and no page has to know that `lookup/sources` is served at `sources/`.
 *
 * Pure: the manifest is passed in, never imported, so these functions are unit-testable without
 * Astro's content layer.
 */
import type { Locale } from '../../i18n/locales';
import { DEFAULT_LOCALE } from '../../i18n/locales';
import type { Manifest, SectionId } from './schema';
import { href } from '../paths';

type ManifestDoc = Manifest['docs'][string];
type ManifestSection = Manifest['sections'][number];

export function docEntry(manifest: Manifest, id: string): ManifestDoc | undefined {
  return manifest.docs[id];
}

export function sectionEntry(manifest: Manifest, id: string): ManifestSection | undefined {
  return manifest.sections.find((section) => section.id === id);
}

/** Site-relative route of a document (`core/register/`), or `undefined` when the id is unknown. */
export function docRoute(manifest: Manifest, id: string): string | undefined {
  return manifest.docs[id]?.route;
}

/** Site-relative route of a section (`look-it-up/`), or `undefined` when the id is unknown. */
export function sectionRoute(manifest: Manifest, id: string): string | undefined {
  return sectionEntry(manifest, id)?.route;
}

/**
 * A title from a `titles` record, in the reader's language, falling back to English and then to
 * the id itself. A missing translation must never render an empty link.
 */
function pickTitle(
  titles: Partial<Record<string, string>> | undefined,
  locale: Locale,
  fallback: string,
): string {
  return titles?.[locale] ?? titles?.[DEFAULT_LOCALE] ?? fallback;
}

export function docTitle(manifest: Manifest, id: string, locale: Locale): string {
  return pickTitle(manifest.docs[id]?.titles, locale, id);
}

export function sectionTitle(manifest: Manifest, id: string, locale: Locale): string {
  return pickTitle(sectionEntry(manifest, id)?.titles, locale, id);
}

/**
 * URL of a document for a locale, with an optional heading anchor. Heading ids are English slugs
 * in every language (CLAUDE.md), so the anchor is passed through unchanged.
 * Returns `undefined` for an unknown id, so a caller can decide between omitting the link and
 * failing the build; nothing renders a dead `href`.
 */
export function docHref(
  manifest: Manifest,
  id: string,
  locale: Locale,
  anchor?: string | undefined,
  base?: string,
): string | undefined {
  const route = docRoute(manifest, id);
  if (route === undefined) return undefined;
  const path = anchor ? `${route}#${anchor}` : route;
  return base === undefined ? href(locale, path) : href(locale, path, base);
}

export function sectionHref(
  manifest: Manifest,
  id: string,
  locale: Locale,
  base?: string,
): string | undefined {
  const route = sectionRoute(manifest, id);
  if (route === undefined) return undefined;
  return base === undefined ? href(locale, route) : href(locale, route, base);
}

/**
 * The visible text of a docref.
 *
 * A docref carries the label the markdown used, which is a folder name (`01-core/02`,
 * `04-business-types/`). That is not readable, so the document's or section's own title is shown
 * and the label is kept only as a fallback for an id the manifest does not know — which is also
 * the only case in which a docref renders as plain text rather than as a link.
 */
export function docrefText(
  manifest: Manifest,
  run: { doc: string; label: string } | { section: string; label: string },
  locale: Locale,
): string {
  if ('doc' in run) {
    const title = docTitle(manifest, run.doc, locale);
    return title === run.doc ? run.label : title;
  }
  const title = sectionTitle(manifest, run.section, locale);
  return title === run.section ? run.label : title;
}

/** Document ids of a section, in the manifest's order. */
export function sectionDocIds(manifest: Manifest, id: string): readonly string[] {
  return sectionEntry(manifest, id)?.docs ?? [];
}

/** Sections in reading order. */
export function orderedSections(manifest: Manifest): readonly ManifestSection[] {
  return [...manifest.sections].sort((a, b) => a.order - b.order);
}

export interface DocNeighbours {
  previous: string | undefined;
  next: string | undefined;
}

/** Previous and next document ids inside the same section. */
export function docNeighbours(manifest: Manifest, id: string): DocNeighbours {
  const section = manifest.docs[id]?.section;
  const ids = section === undefined ? [] : sectionDocIds(manifest, section);
  const index = ids.indexOf(id);
  if (index === -1) return { previous: undefined, next: undefined };
  return { previous: ids[index - 1], next: ids[index + 1] };
}

/** True when the locale has a generated document for this id. */
export function hasTranslation(manifest: Manifest, id: string, locale: Locale): boolean {
  return manifest.docs[id]?.langs.includes(locale) ?? false;
}

export type { ManifestDoc, ManifestSection, SectionId };
