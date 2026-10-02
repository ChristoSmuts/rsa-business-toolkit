/*
 * DOM for search results, shared by the dialog (`search-ui.ts`) and the search and 404 pages
 * (`search-page.ts`). Built with `createElement` and `textContent` only: result text comes from the
 * index and is never parsed as HTML, so `<mark>` is the only markup a result can contain.
 */
import { createTranslator, type Dict, type Translator, type KeyIn } from '../i18n';
import { getLocale, isEnabledLocale, type Locale } from '../i18n/locales';
import { highlight, type SearchResult } from '../lib/search-client';
import type { SearchStrings } from '../lib/search/ui-data';

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
    tr: createTranslator(locale, parsed.dict as Pick<Dict, 'search'>),
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
