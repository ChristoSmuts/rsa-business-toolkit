/*
 * The reading-path data in the browser (WP-31): `src/data/paths.json`, bundled as a small shared
 * chunk (about 2 KB gzipped), and the reader's path from it. Every script that personalises a page
 * reads the path through `readerPath()`, so they all agree with the server-rendered result pages,
 * which run the same `buildPath` at build time.
 */
import pathsJson from '../data/paths.json';
import type { PathsFile } from '../lib/content/schema';
import { buildPath, type PathResult } from '../lib/path-engine';
import type { Profile } from '../lib/profile';
import { DEFAULT_LOCALE, href, isLocale, type Locale } from '../lib/paths';

/**
 * Validated by the pipeline (`scripts/content/paths.ts`) and by the `paths` content collection at
 * build time; a JSON import is typed by its literal shape, so it is cast once here.
 */
export const PATHS = pathsJson as unknown as PathsFile;

/** The reader's path, from the documents listed in `paths.json`. */
export function readerPath(who: Profile): PathResult {
  return buildPath(who, PATHS, PATHS);
}

/** The page's language, from `<html lang>` (`af-ZA` → `af`). */
export function pageLocale(element: Element): Locale {
  const code = (
    element.closest('[data-locale]')?.getAttribute('data-locale') ??
    element.ownerDocument.documentElement.lang ??
    ''
  ).split('-')[0];
  return isLocale(code) ? code : DEFAULT_LOCALE;
}

/** A path document's link for a language, with its anchor. */
export function pathDocHref(locale: Locale, doc: string, anchor?: string): string | undefined {
  const entry = PATHS.docs[doc];
  if (!entry) return undefined;
  return href(locale, anchor ? `${entry.route}#${anchor}` : entry.route);
}

/** A path document's title in a language, falling back to English (then with `lang`). */
export function pathDocTitle(
  locale: Locale,
  doc: string,
): { title: string; lang: string | undefined } {
  const titles = PATHS.docs[doc]?.titles ?? {};
  const own = titles[locale];
  if (own) return { title: own, lang: undefined };
  return { title: titles.en ?? doc, lang: 'en-ZA' };
}

/**
 * Fills a server-rendered `ProgressRing` inside `root`: the arc, the percentage and the label.
 * The same drawing `<st-checklist-progress>` does for ticks.
 */
export function drawRing(root: ParentNode, done: number, total: number, label: string): void {
  const ring = root.querySelector<HTMLElement>('.st-ring');
  if (!ring) return;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  if (percent >= 100) ring.dataset['complete'] = 'true';
  else delete ring.dataset['complete'];
  ring.querySelector('svg')?.setAttribute('aria-label', label);
  ring.querySelector('.st-ring__value')?.setAttribute('stroke-dashoffset', String(100 - percent));
  const value = ring.querySelector('.st-ring__text');
  if (value) value.textContent = `${percent}%`;
}
