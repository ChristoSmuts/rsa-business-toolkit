/*
 * DOM for search results, shared by the dialog (`search-ui.ts`) and the search and 404 pages
 * (`search-page.ts`). Built with `createElement` and `textContent` only: result text comes from the
 * index and is never parsed as HTML, so `<mark>` is the only markup a result can contain.
 */
import {
  interpolate,
  type Dict,
  type KeyIn,
  type Params,
  type PluralForms,
  type Translator,
} from '../i18n';
import { getLocale, isEnabledLocale, type Locale } from '../i18n/locales';
import { lowData, shortcutsEnabled } from '../lib/store';
import type { SearchSettings } from './search-boot';
import { highlight, type SearchResult } from '../lib/search-client';
import type { SearchStrings } from '../lib/search/ui-data';

/**
 * The reader's settings, from WP-30's store (`src/lib/store.ts`): single-key shortcuts
 * (`st.shortcuts`, `shortcutsEnabled()`) and low data (`st.lowData`). The browser's
 * `prefers-reduced-data` is a second reason for low data.
 */
export function searchSettings(win: Window = window): SearchSettings {
  return {
    shortcuts: shortcutsEnabled(),
    lowData: lowData.get() || (win.matchMedia?.('(prefers-reduced-data: reduce)').matches ?? false),
  };
}

export interface SearchContext {
  readonly locale: Locale;
  readonly index: string;
  readonly page: string;
  readonly contents: string;
  readonly strings: SearchStrings;
  readonly tr: Translator<KeyIn<'search'>>;
}

function isStrings(value: unknown): value is SearchStrings {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<SearchStrings>;
  return (
    typeof record.dict === 'object' &&
    typeof record.englishTag === 'string' &&
    typeof record.suggestion === 'string' &&
    typeof record.sections === 'object'
  );
}

/**
 * A translator over the `search` strings a page serialises (`pick()`): it looks a key up, picks the
 * plural form for `count` with `Intl.PluralRules` and fills `{name}` with `interpolate()`, as `t()`
 * and `createTranslator()` do (a test compares it with `t()` for every search string in every
 * language). Not `createTranslator()` itself: the translation core would then share a chunk with
 * the `interpolate()` every page loads and add half a kilobyte to each (the 25 KB budget, WP-33
 * integration). The page has already filled gaps with English (`pick()`), so there is no fallback.
 */
export function searchTranslator(
  locale: Locale,
  dict: Pick<Dict, 'search'>,
): Translator<KeyIn<'search'>> {
  const rules = new Intl.PluralRules(getLocale(locale)?.hreflang ?? locale);
  return (key, ...params) => {
    const values = (params[0] ?? {}) as Params;
    let node: unknown = dict;
    for (const part of key.split('.')) {
      node =
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined;
    }
    if (typeof node === 'string') return interpolate(node, values);
    if (typeof node !== 'object' || node === null) return key;
    const forms = node as PluralForms;
    const form = typeof values.count === 'number' ? forms[rules.select(values.count)] : undefined;
    return interpolate(form ?? forms.other, values);
  };
}

/** Read the `data-*` attributes a page renders from `searchElementData()`. */
export function readContext(element: HTMLElement): SearchContext {
  const { locale, index, page, contents, strings } = element.dataset;
  if (!isEnabledLocale(locale) || !index || !page || !contents || !strings) {
    throw new Error('search: the element is missing its data attributes');
  }
  const parsed: unknown = JSON.parse(strings);
  if (!isStrings(parsed)) throw new Error('search: data-strings is not valid');
  return {
    locale,
    index,
    page,
    contents,
    strings: parsed,
    tr: searchTranslator(locale, parsed.dict as Pick<Dict, 'search'>),
  };
}

/** Append `text` to `parent`, with the matched words in `<mark>`. */
export function appendHighlighted(
  parent: HTMLElement,
  text: string,
  terms: readonly string[],
): void {
  const doc = parent.ownerDocument;
  for (const segment of highlight(text, terms)) {
    if (segment.mark) {
      const mark = doc.createElement('mark');
      mark.textContent = segment.text;
      parent.append(mark);
    } else {
      parent.append(doc.createTextNode(segment.text));
    }
  }
}

function span(doc: Document, className: string, lang?: string): HTMLSpanElement {
  const element = doc.createElement('span');
  element.className = className;
  if (lang !== undefined) element.lang = lang;
  return element;
}

/**
 * The inside of one result: the title with its matches marked, then "page › heading" and the kind,
 * then a short excerpt. An English result on an Afrikaans page carries `lang` on its English text
 * and a visible "English" tag.
 */
export function resultBody(
  doc: Document,
  result: SearchResult,
  context: SearchContext,
): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  const lang =
    result.lang === undefined ? undefined : (getLocale(result.lang)?.hreflang ?? result.lang);

  const title = span(doc, 'st-search-result__title', lang);
  appendHighlighted(title, result.title, result.terms);
  fragment.append(title);

  const meta = span(doc, 'st-search-result__meta');
  const where = span(doc, 'st-search-result__where', lang);
  appendHighlighted(where, result.docTitle, result.terms);
  const kind = span(doc, 'st-search-result__kind');
  kind.textContent = context.tr(`search.kinds.${result.kind}`);
  meta.append(where, doc.createTextNode(' · '), kind);
  if (lang !== undefined) {
    const tag = span(doc, 'st-search-result__lang');
    tag.textContent = context.strings.englishTag;
    meta.append(doc.createTextNode(' · '), tag);
  }
  fragment.append(meta);

  if (result.excerpt !== undefined && result.excerpt !== result.title) {
    const excerpt = span(doc, 'st-search-result__excerpt', lang);
    appendHighlighted(excerpt, result.excerpt, result.terms);
    fragment.append(excerpt);
  }
  return fragment;
}

/** The name of a section in the reader's language. */
export function sectionName(context: SearchContext, section: string): string {
  return context.strings.sections[section] ?? section;
}

/**
 * A result count, with how many results match every word when that is not all of them: "12 of 375
 * results shown (24 match every word)" (review WP-33 pass 7, nit 1).
 */
export function countStatus(
  tr: SearchContext['tr'],
  count: string,
  matchedAll: number,
  total: number,
): string {
  return matchedAll > 0 && matchedAll < total
    ? `${count} (${tr('search.matchedAll', { count: matchedAll })})`
    : count;
}
