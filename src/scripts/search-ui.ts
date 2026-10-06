/*
 * The search dialog's results (build plan B3 flow 3), imported the first time the dialog opens.
 *
 * The input is a combobox that owns a listbox (ARIA 1.2 combobox pattern): focus stays in the
 * input, the arrow keys move `aria-activedescendant` through the options, Enter opens the active
 * option (or the first one), and Escape closes the dialog (native `<dialog>`). Results are grouped
 * by section, each group a labelled `role="group"`, and each option is a real link
 * (`<a role="option">`), so a pointer, a middle click and "open in new tab" all still work.
 *
 * States: empty (the common questions), loading, results, no results and failed. The failed and
 * no-results states keep a link to the contents page. A polite live region says what happened.
 */
import {
  createSearchClient,
  type CountedResults,
  groupResults,
  type SearchClient,
} from '../lib/search-client';
import type { SearchSettings } from './search';
import {
  countStatus,
  readContext,
  resultBody,
  sectionName,
  type SearchContext,
} from './search-render';

export interface DialogController {
  /** The dialog has just opened. */
  opened(): void;
  /** Enter, pressed before this code had loaded: open the first result for the text. */
  enterCurrent(): Promise<void>;
}

export interface DialogDeps {
  readonly settings: SearchSettings;
  /** Close the dialog and open a result. */
  readonly openResult: (url: string) => void;
}

/**
 * Results shown per section in the dialog. Groups follow the order of their best result, so one
 * busy section (the glossary, the checklist and the register are all "Look it up") would otherwise
 * push the second-best result of another section far down. The rest are one link away, on the
 * search page.
 */
export const PER_GROUP = 3;

/** Wait this long after the last key press before searching. */
export const DEBOUNCE_MS = 120;
/** Show "Loading search…" only if loading takes longer than this, to avoid a flash. */
export const LOADING_DELAY_MS = 150;
const OPTION_PREFIX = 'st-search-option-';

export class SearchDialogController implements DialogController {
  readonly #host: HTMLElement;
  readonly #deps: DialogDeps;
  readonly #context: SearchContext;
  readonly #client: SearchClient;
  readonly #input: HTMLInputElement;
  readonly #listbox: HTMLElement;
  readonly #status: HTMLElement;
  readonly #empty: HTMLElement | null;
  readonly #failed: HTMLElement | null;
  readonly #all: HTMLElement | null;
  readonly #dialog: HTMLDialogElement | null;
  #options: HTMLAnchorElement[] = [];
  #active = -1;
  #timer: ReturnType<typeof setTimeout> | undefined;
  /** Increases with every query, so a slow answer to an old query is dropped. */
  #sequence = 0;
  /** The query the options on screen belong to; Enter never opens an option of another one. */
  #shownQuery = '';

  constructor(host: HTMLElement, deps: DialogDeps, client?: SearchClient) {
    this.#host = host;
    this.#deps = deps;
    this.#context = readContext(host);
    this.#client =
      client ?? createSearchClient({ url: this.#context.index, locale: this.#context.locale });
    const input = host.querySelector<HTMLInputElement>('input[role="combobox"]');
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]');
    const status = host.querySelector<HTMLElement>('[role="status"]');
    if (!input || !listbox || !status) throw new Error('search: the dialog markup is incomplete');
    this.#input = input;
    this.#listbox = listbox;
    this.#status = status;
    this.#empty = host.querySelector('[data-search-empty]');
    this.#failed = host.querySelector('[data-search-failed]');
    this.#all = host.querySelector('[data-search-all]');
    input.addEventListener('input', this.#onInput);
    input.addEventListener('keydown', this.#onKeydown);
    input.form?.addEventListener('submit', this.#onSubmit);
    listbox.addEventListener('click', this.#onOptionClick);
    this.#dialog = host.querySelector('dialog');
    this.#dialog?.addEventListener('close', this.#onDialogClose);
  }

  opened(): void {
    // Low data: the index is fetched when the reader types, not when the dialog opens.
    if (!this.#deps.settings.lowData) void this.#client.load().catch(() => undefined);
    if (this.#input.value.trim() !== '') this.search(this.#input.value);
    // An empty field shows the common questions, and clears a failed state left by an earlier
    // open whose results code did not load (review WP-33 pass 3, minor 1).
    else this.#showEmpty();
  }

  readonly #onInput = (): void => {
    clearTimeout(this.#timer);
    const query = this.#input.value;
    // The options on screen now belong to an older query: none of them is active any more.
    if (query.trim() !== this.#shownQuery) this.setActive(-1);
    this.#timer = setTimeout(() => void this.search(query), DEBOUNCE_MS);
  };

  /**
   * Enter while the options on screen belong to an older query (the reader typed and pressed
   * Enter within the debounce, or before the answer came): search the current text now, exactly
   * as the live list would, and open its first result. Enter never searches anything else: what
   * it opens is what the list shows, or would show, for the text in the field (review WP-33
   * pass 6, major 1).
   */
  async enterCurrent(): Promise<void> {
    clearTimeout(this.#timer);
    const text = this.#input.value;
    const query = text.trim();
    const closes = this.#closes;
    await this.search(text);
    // The first search can wait for the whole index. If the reader closed the dialog meanwhile
    // (Escape, the close button, the backdrop), or changed the text, the Enter is cancelled
    // (review WP-33 pass 2, major 1).
    if (closes !== this.#closes || !this.#dialog?.open) return;
    if (this.#shownQuery !== query || this.#input.value.trim() !== query) return;
    const first = this.#options[0];
    if (first) {
      this.activate(first);
    } else if (this.#failed?.hidden !== false) {
      // Nothing found: one Enter goes to the search page, as it does when the results are
      // already on screen (review WP-33 pass 2, nit 2).
      this.#input.form?.requestSubmit();
    }
  }

  /** Counts the times the dialog closed, so work started before a close is dropped. */
  #closes = 0;

  readonly #onDialogClose = (): void => {
    this.#closes++;
    // Drop any search still waiting for the index: its answer must not fill the dialog when it
    // opens again, perhaps with an empty field (review WP-33 pass 4, minor 1).
    this.#sequence++;
    clearTimeout(this.#timer);
  };

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Enter': {
        // The ARIA combobox pattern: Enter opens the active option, or the first one. An option
        // the reader highlighted always wins, even in a list from before the last key press
        // (review WP-33 pass 7, nit 2). Only with no option highlighted, and a list that does not
        // yet belong to the text in the field, does it wait for that text's list.
        const active = this.#options[this.#active];
        if (!active && this.#input.value.trim() !== this.#shownQuery) {
          event.preventDefault();
          void this.enterCurrent();
          break;
        }
        const option = active ?? this.#options[0];
        if (option) {
          event.preventDefault();
          this.activate(option);
        }
        // Without an option, the form submits to `/search/?q=`, which shows the same query.
        break;
      }
    }
  };

  readonly #onSubmit = (event: SubmitEvent): void => {
    // Only reached with no results to open; an empty query goes nowhere.
    if (this.#input.value.trim() === '') event.preventDefault();
  };

  readonly #onOptionClick = (event: MouseEvent): void => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    const target = event.target;
    const option =
      target instanceof Element ? target.closest<HTMLAnchorElement>('a[role="option"]') : null;
    if (!option) return;
    event.preventDefault();
    this.activate(option);
  };

  /** Open a result. The element closes the dialog and goes to the heading (`DialogDeps`). */
  activate(option: HTMLAnchorElement): void {
    this.#deps.openResult(option.href);
  }

  /** Move the active option by `step`, wrapping at both ends. */
  move(step: number): void {
    const count = this.#options.length;
    if (count === 0) return;
    const next =
      this.#active < 0 ? (step > 0 ? 0 : count - 1) : (this.#active + step + count) % count;
    this.setActive(next);
  }

  setActive(index: number): void {
    this.#options[this.#active]?.setAttribute('aria-selected', 'false');
    this.#active = index;
    const option = this.#options[index];
    if (!option) {
      this.#input.removeAttribute('aria-activedescendant');
      return;
    }
    option.setAttribute('aria-selected', 'true');
    this.#input.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView?.({ block: 'nearest' });
  }

  get activeIndex(): number {
    return this.#active;
  }

  /**
   * Run a query and show its state. Returns when the results (or the failure) are shown. The last
   * word is still being typed when the text as typed (before trimming) ends inside a word: `R1`
   * reaches `R146`, `R1 ` with a space after it does not.
   */
  async search(query: string): Promise<void> {
    const typing = /[\p{L}\p{N}]$/u.test(query);
    const sequence = ++this.#sequence;
    const q = query.trim();
    if (q === '') {
      this.#showEmpty();
      return;
    }
    const { tr } = this.#context;
    const loading = this.#client.ready
      ? undefined
      : setTimeout(() => {
          if (sequence === this.#sequence) this.#setStatus(tr('search.loading'));
        }, LOADING_DELAY_MS);
    let counted: CountedResults;
    try {
      counted = await this.#client.searchCounted(q, { typing });
    } catch {
      clearTimeout(loading);
      if (sequence === this.#sequence) this.#showFailed();
      return;
    } finally {
      clearTimeout(loading);
    }
    if (sequence !== this.#sequence) return;
    this.#render(counted, q, typing);
  }

  #setStatus(text: string): void {
    this.#status.textContent = text;
  }

  #clearOptions(): void {
    if (this.#all) this.#all.hidden = true;
    this.#listbox.replaceChildren();
    this.#listbox.hidden = true;
    this.#options = [];
    this.#active = -1;
    this.#input.setAttribute('aria-expanded', 'false');
    this.#input.removeAttribute('aria-activedescendant');
  }

  #showEmpty(): void {
    // An answer to an older query must not replace the common questions.
    this.#sequence++;
    this.#shownQuery = '';
    this.#clearOptions();
    this.#setStatus('');
    if (this.#failed) this.#failed.hidden = true;
    if (this.#empty) this.#empty.hidden = false;
  }

  #showFailed(): void {
    this.#shownQuery = this.#input.value.trim();
    this.#clearOptions();
    if (this.#empty) this.#empty.hidden = true;
    if (this.#failed) this.#failed.hidden = false;
    this.#setStatus(this.#context.tr('search.failed'));
  }

  /**
   * `counted.total` is every result the query matched, `counted.matchedAll` how many of them match
   * every word, and `counted.results` the first of them (the client's cap). `typing`: the list was
   * found while the last word was still being typed, which the "See all" link passes on.
   */
  #render(counted: CountedResults, query: string, typing: boolean): void {
    const { results, total, matchedAll } = counted;
    const { tr } = this.#context;
    const doc = this.#host.ownerDocument;
    this.#shownQuery = query;
    this.#clearOptions();
    if (this.#failed) this.#failed.hidden = true;
    if (results.length === 0) {
      // No results: the common questions and the contents link stay as the way on.
      if (this.#empty) this.#empty.hidden = false;
      this.#setStatus(`${tr('search.noResults', { query })} ${tr('search.suggestions')}`);
      return;
    }
    if (this.#empty) this.#empty.hidden = true;
    let n = 0;
    let shown = 0;
    for (const full of groupResults(results)) {
      const group = { ...full, results: full.results.slice(0, PER_GROUP) };
      shown += group.results.length;
      const name = sectionName(this.#context, group.section);
      const element = doc.createElement('div');
      element.className = 'st-search-results__group';
      element.setAttribute('role', 'group');
      element.setAttribute('aria-label', tr('search.groupLabel', { section: name }));
      const heading = doc.createElement('div');
      heading.className = 'st-search-results__heading';
      heading.setAttribute('aria-hidden', 'true');
      heading.textContent = name;
      element.append(heading);
      for (const result of group.results) {
        const option = doc.createElement('a');
        option.className = 'st-search-result';
        option.id = `${OPTION_PREFIX}${String(n++)}`;
        option.href = result.href;
        option.tabIndex = -1;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.append(resultBody(doc, result, this.#context));
        // The name is the title alone; the page, kind and excerpt are the description, so arrowing
        // through the list reads one short name per option.
        const title = option.querySelector<HTMLElement>('.st-search-result__title');
        const details = [
          ...option.querySelectorAll<HTMLElement>(':scope > span:not(.st-search-result__title)'),
        ];
        if (title) {
          title.id = `${option.id}-title`;
          option.setAttribute('aria-labelledby', title.id);
        }
        details.forEach((detail, index) => {
          detail.id = `${option.id}-detail-${String(index)}`;
        });
        if (details.length > 0) {
          option.setAttribute('aria-describedby', details.map((detail) => detail.id).join(' '));
        }
        element.append(option);
        this.#options.push(option);
      }
      this.#listbox.append(element);
    }
    this.#listbox.hidden = false;
    this.#input.setAttribute('aria-expanded', 'true');
    this.#setStatus(
      countStatus(
        tr,
        shown < total
          ? tr('search.resultsShown', { shown, count: total })
          : tr('search.results', { count: total }),
        matchedAll,
        total,
      ),
    );
    const link = this.#all?.querySelector('a');
    if (this.#all && link && shown < total) {
      const url = new URL(this.#context.page, this.#host.ownerDocument.baseURI);
      url.searchParams.set('q', query);
      // The search page then runs the same search, so it lists the results the link promises:
      // `VAT26` while typed reaches VAT264 there too (review WP-33 pass 7, minor 3).
      if (typing) url.searchParams.set('typed', '1');
      link.href = `${url.pathname}${url.search}`;
      link.textContent = tr('search.seeAll', { count: total });
      this.#all.hidden = false;
    }
  }
}

export function createDialogController(host: HTMLElement, deps: DialogDeps): DialogController {
  return new SearchDialogController(host, deps);
}
