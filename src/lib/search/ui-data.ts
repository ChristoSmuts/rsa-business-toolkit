/**
 * Build time only: what a page hands to the search scripts in `data-*` attributes. The scripts
 * cannot import the dictionaries without bundling them, so they receive the `search` strings, the
 * section names and the URLs they need as JSON (docs/i18n.md, "Client scripts").
 */
import { pick, t, type Dict } from '../../i18n';
import type { Locale } from '../../i18n/locales';
import { orderedSections } from '../content/manifest';
import type { Manifest } from '../content/schema';
import { href } from '../paths';
import { APP_ROUTES } from '../routes';
import { searchIndexUrl } from './files';

/** The strings the search scripts show: the `search` group plus the few they borrow. */
export interface SearchStrings {
  readonly dict: Pick<Dict, 'search'>;
  /** `lang.englishTag`: marks an English result on an Afrikaans page. */
  readonly englishTag: string;
  /** `notFound.suggestion`, used by the 404 page. */
  readonly suggestion: string;
  /** Section id → name in the reader's language, for the result groups. */
  readonly sections: Readonly<Record<string, string>>;
}

export interface SearchElementData {
  readonly locale: Locale;
  /** Same-origin URL of this language's index. */
  readonly index: string;
  /** `/search/` in this language: the form's action and the no-JavaScript answer. */
  readonly page: string;
  readonly contents: string;
  /** `SearchStrings` as JSON, for `data-strings`. */
  readonly strings: string;
}

export function searchStrings(locale: Locale, manifest: Manifest): SearchStrings {
  const sections: Record<string, string> = {};
  for (const section of orderedSections(manifest)) {
    sections[section.id] = section.titles[locale] ?? section.titles.en ?? section.id;
  }
  return {
    dict: pick(locale, ['search']),
    englishTag: t(locale, 'lang.englishTag'),
    // Kept with its placeholder: the script fills `{title}` for each suggestion.
    suggestion: t(locale, 'notFound.suggestion', { title: '{title}' }),
    sections,
  };
}

export function searchElementData(
  locale: Locale,
  manifest: Manifest,
  recordFile?: string,
): SearchElementData {
  return {
    locale,
    index: recordFile === undefined ? searchIndexUrl(locale) : searchIndexUrl(locale, recordFile),
    page: href(locale, APP_ROUTES.search),
    contents: href(locale, APP_ROUTES.contents),
    strings: JSON.stringify(searchStrings(locale, manifest)),
  };
}
