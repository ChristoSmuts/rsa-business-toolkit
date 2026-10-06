/*
 * Search outside the dialog (build plan B1, B3, C4):
 *
 * <st-search-page>    `/search/?q=`. With JavaScript the page runs the query in place, echoes it
 *                     and shows the results as a list of links grouped by section; a new search
 *                     updates `?q=` so the URL stays shareable. Without JavaScript the GET form
 *                     reloads the same page, which says search needs JavaScript and lists every
 *                     page instead (the element and its results region are then inert).
 * <st-search-suggest> the 404 page: suggests pages for the words in the missing address. The page
 *                     carries one per language; only the one for the address's language runs.
 *
 * Both load the index only when there is something to search for (and on the 404 page, not at all
 * on low data), and build every result with DOM APIs (`search-render.ts`).
 */
import { getLocale } from '../i18n/locales';
import { localeFromPath } from '../lib/paths';
import {
  createSearchClient,
  type CountedResults,
  groupResults,
  type SearchClient,
  type SearchResult,
} from '../lib/search-client';
import { rememberArrival, searchSettings } from './search';
import {
  countStatus,
  readContext,
  resultBody,
  sectionName,
  type SearchContext,
} from './search-render';

/** Results the 404 page suggests at most. */
export const SUGGESTIONS = 5;

/** Remember the target of a plain left click on a result, so its heading takes focus on arrival. */
function onResultClick(event: MouseEvent): void {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
    return;
  const target = event.target;
  const link =
    target instanceof Element ? target.closest<HTMLAnchorElement>('a[data-search-result]') : null;
  if (link) rememberArrival(link.href);
}

function resultLink(
  doc: Document,
  result: SearchResult,
  context: SearchContext,
): HTMLAnchorElement {
  const link = doc.createElement('a');
  link.className = 'st-search-result';
  link.href = result.href;
  link.dataset['searchResult'] = '';
  link.append(resultBody(doc, result, context));
  return link;
}

/** Results as `<h3>` per section and a list of links. */
export function renderResultList(
  container: HTMLElement,
  results: readonly SearchResult[],
  context: SearchContext,
): void {
  const doc = container.ownerDocument;
  const nodes: HTMLElement[] = [];
  for (const group of groupResults(results)) {
    const section = doc.createElement('section');
    section.className = 'st-search-page__group';
    const heading = doc.createElement('h3');
    heading.textContent = sectionName(context, group.section);
    const list = doc.createElement('ul');
    list.className = 'st-search-page__list';
    list.setAttribute('role', 'list');
    for (const result of group.results) {
      const item = doc.createElement('li');
      item.append(resultLink(doc, result, context));
      list.append(item);
    }
    section.append(heading, list);
    nodes.push(section);
  }
  container.replaceChildren(...nodes);
}

/** The query in a URL's `?q=`, trimmed. */
export function queryFrom(url: string): string {
  return (new URL(url, 'https://example.invalid/').searchParams.get('q') ?? '').trim();
}

/**
 * `true` when the URL says its query was still being typed (`&typed=1`, set by the dialog's "See
 * all" link), so the page runs the search the dialog ran. Otherwise a query here is finished.
 */
export function typedFrom(url: string): boolean {
  return new URL(url, 'https://example.invalid/').searchParams.get('typed') === '1';
}

export class StSearchPage extends HTMLElement {
  #context: SearchContext | undefined;
  #client: SearchClient | undefined;
  #input: HTMLInputElement | null = null;
  #region: HTMLElement | null = null;
  #sequence = 0;

  readonly #onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const query = this.#input?.value.trim() ?? '';
    const url = new URL(window.location.href);
    if (query === '') url.searchParams.delete('q');
    else url.searchParams.set('q', query);
    // A search submitted here is finished.
    url.searchParams.delete('typed');
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    void this.run(query);
  };

  readonly #onPopState = (): void => {
    const query = queryFrom(window.location.href);
    if (this.#input) this.#input.value = query;
    void this.run(query, typedFrom(window.location.href));
  };

  connectedCallback(): void {
    this.#context = readContext(this);
    this.#client = createSearchClient({ url: this.#context.index, locale: this.#context.locale });
    this.#input = this.querySelector<HTMLInputElement>('input[name="q"]');
    this.#region = this.querySelector<HTMLElement>('[data-search-region]');
    this.querySelector('form')?.addEventListener('submit', this.#onSubmit);
    this.addEventListener('click', onResultClick);
    window.addEventListener('popstate', this.#onPopState);
    const query = queryFrom(window.location.href);
    if (this.#input && query !== '') this.#input.value = query;
    void this.run(query, typedFrom(window.location.href));
  }

  disconnectedCallback(): void {
    this.querySelector('form')?.removeEventListener('submit', this.#onSubmit);
    this.removeEventListener('click', onResultClick);
    window.removeEventListener('popstate', this.#onPopState);
  }

  /**
   * Run `query` and show it in place. An empty query hides the heading and empties the list. The
   * region itself is never hidden, so its live status line is always in the accessibility tree.
   */
  async run(query: string, typing = false): Promise<void> {
    const context = this.#context;
    const client = this.#client;
    const region = this.#region;
    if (!context || !client || !region) return;
    const sequence = ++this.#sequence;
    const title = region.querySelector<HTMLElement>('[data-search-title]');
    const status = region.querySelector<HTMLElement>('[role="status"]');
    const list = region.querySelector<HTMLElement>('[data-search-list]');
    const failed = region.querySelector<HTMLElement>('[data-search-failed]');
    if (query === '') {
      if (title) title.hidden = true;
      if (failed) failed.hidden = true;
      list?.replaceChildren();
      if (status) status.textContent = '';
      return;
    }
    if (title) title.hidden = false;
    if (title) title.textContent = context.tr('search.resultsFor', { query });
    if (failed) failed.hidden = true;
    if (status && !client.ready) status.textContent = context.tr('search.loading');
    let counted: CountedResults;
    try {
      // The search page is the full list: every result, so its count is the true total and
      // "See all" in the dialog keeps its promise (review WP-33 pass 4, minor 2). A submitted
      // query is finished (`R1` is R1, not R146; review WP-33 pass 5), unless the dialog's link
      // says it was still being typed (pass 7, minor 3).
      counted = await client.searchCounted(query, {
        limit: Number.POSITIVE_INFINITY,
        typing,
      });
    } catch {
      if (sequence !== this.#sequence) return;
      list?.replaceChildren();
      if (failed) failed.hidden = false;
      if (status) status.textContent = context.tr('search.failed');
      return;
    }
    if (sequence !== this.#sequence) return;
    const { results, matchedAll } = counted;
    if (list) renderResultList(list, results, context);
    if (status) {
      status.textContent =
        results.length === 0
          ? `${context.tr('search.noResults', { query })} ${context.tr('search.suggestions')}`
          : countStatus(
              context.tr,
              context.tr('search.results', { count: results.length }),
              matchedAll,
              results.length,
            );
    }
  }
}

/** The words of a missing address, for a search: `/core/regster/` → `core regster`. */
export function wordsFromPath(pathname: string): string {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Keep the address as typed.
  }
  return path
    .split(/[/\\\-_.+\s]+/)
    .filter((word) => word.length > 1 && !/^(?:html?|php|aspx?|index)$/i.test(word))
    .join(' ');
}

/**
 * What to search for on the 404 page, most specific first: the words of the last part of the
 * address, then of all of it. `business-types/vehicle-dealr/` → `vehicle dealr`, then
 * `business types vehicle dealr` (the section words alone would rank the section's own pages first).
 */
export function suggestionQueries(path: string): string[] {
  const last =
    path
      .split('/')
      .filter((part) => part !== '')
      .at(-1) ?? '';
  return [...new Set([wordsFromPath(last), wordsFromPath(path)])].filter((query) => query !== '');
}

export class StSearchSuggest extends HTMLElement {
  connectedCallback(): void {
    const context = readContext(this);
    const base = new URL(context.page, window.location.href).pathname.replace(/search\/$/, '');
    const pathLocale = localeFromPath(window.location.pathname);
    if (pathLocale !== context.locale) return;
    // The locale prefix and the base are not words the reader typed.
    const rest = window.location.pathname.startsWith(base)
      ? window.location.pathname.slice(base.length)
      : window.location.pathname;
    const queries = suggestionQueries(rest);
    if (queries.length === 0 || searchSettings().lowData) return;
    void this.suggest(queries, context);
  }

  /** Show the results of the first query that finds anything. */
  async suggest(
    queries: readonly string[],
    context: SearchContext,
    client: SearchClient = createSearchClient({ url: context.index, locale: context.locale }),
  ): Promise<void> {
    let results: SearchResult[] = [];
    let words = '';
    try {
      for (const query of queries) {
        words = query;
        results = await client.search(query, { limit: SUGGESTIONS, typing: false });
        if (results.length > 0) break;
      }
    } catch {
      return;
    }
    const [best, ...more] = results;
    if (!best) return;
    const doc = this.ownerDocument;
    const sentence = doc.createElement('p');
    const [before = '', after = ''] = context.strings.suggestion.split('{title}');
    const link = doc.createElement('a');
    link.href = best.href;
    link.dataset['searchResult'] = '';
    link.textContent = best.title;
    if (best.lang !== undefined) link.lang = getLocale(best.lang)?.hreflang ?? best.lang;
    sentence.append(before, link, after);
    const nodes: HTMLElement[] = [sentence];
    if (more.length > 0) {
      const list = doc.createElement('ul');
      list.className = 'st-search-page__list';
      list.setAttribute('role', 'list');
      list.setAttribute('aria-label', context.tr('search.resultsFor', { query: words }));
      for (const result of more) {
        const item = doc.createElement('li');
        item.append(resultLink(doc, result, context));
        list.append(item);
      }
      nodes.push(list);
    }
    this.replaceChildren(...nodes);
    this.hidden = false;
    this.addEventListener('click', onResultClick);
  }
}

if (!customElements.get('st-search-page')) customElements.define('st-search-page', StSearchPage);
if (!customElements.get('st-search-suggest')) {
  customElements.define('st-search-suggest', StSearchSuggest);
}
