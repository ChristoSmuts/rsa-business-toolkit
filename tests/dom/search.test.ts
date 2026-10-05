/**
 * The search elements in happy-dom: the dialog opens from its link, `/` and Ctrl+K, closes and
 * returns focus; the results listbox handles the keyboard; the search page and the 404 suggestion
 * render results with DOM APIs. The index is a small one built in memory and served by a stubbed
 * `fetch`, so nothing leaves the test.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { serialiseIndex } from '../../scripts/search/build';
import { createSearchClient, type SearchClient } from '../../src/lib/search-client';
import { KIND_WEIGHT } from '../../src/lib/search/options';
import type { SearchEntry } from '../../src/lib/search/types';
import { searchStrings } from '../../src/lib/search/ui-data';
import {
  ARRIVAL_KEY,
  consumeArrival,
  focusTarget,
  fragmentTarget,
  HIGHLIGHT_CLASS,
  isOpenShortcut,
  isTypingTarget,
  openResult,
  searchSettings,
  StSearch,
} from '../../src/scripts/search';
import {
  queryFrom,
  StSearchPage,
  StSearchSuggest,
  suggestionQueries,
  wordsFromPath,
} from '../../src/scripts/search-page';
import { readContext } from '../../src/scripts/search-render';
import { SearchDialogController } from '../../src/scripts/search-ui';
import { realManifest } from '../unit/site/data';

const entries: SearchEntry[] = [
  {
    key: 'a',
    kind: 'glossary',
    doc: 'lookup/glossary',
    route: 'glossary/',
    anchor: 'pis',
    title: 'PIS',
    docTitle: 'Glossary',
    path: 'Look it up › Glossary',
    text: 'Public interest score, a <b>number</b>.',
    excerpt: 'Public interest score, a <b>number</b>.',
    section: 'lookup',
    weight: KIND_WEIGHT.glossary,
  },
  {
    key: 'b',
    kind: 'section',
    doc: 'core/running-a-pty-ltd',
    route: 'core/running-a-pty-ltd/',
    anchor: 'financial-statements',
    title: 'Financial statements',
    docTitle: 'Running a Pty Ltd',
    path: 'Core › Running a Pty Ltd',
    text: 'Your PIS decides whether the statements need an audit.',
    excerpt: 'Your PIS decides whether the statements need an audit.',
    section: 'core',
    lang: 'en',
    weight: KIND_WEIGHT.section,
  },
  {
    key: 'c',
    kind: 'task',
    doc: 'lookup/checklist',
    route: 'checklist/',
    anchor: 'compliance',
    title: 'Work out your PIS every year',
    indexTitle: '',
    docTitle: 'Checklist',
    path: 'Look it up › Checklist',
    text: 'Work out your PIS every year',
    section: 'lookup',
    weight: KIND_WEIGHT.task,
  },
];

const manifest = realManifest();
let indexBody: unknown;

function stubFetch(ok = true): ReturnType<typeof vi.fn> {
  const fetch = vi.fn(() =>
    Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(indexBody) }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function dataAttributes(locale: 'en' | 'af' = 'en'): string {
  const strings = JSON.stringify(searchStrings(locale, manifest)).replaceAll('"', '&quot;');
  const prefix = locale === 'en' ? '' : `${locale}/`;
  return `data-locale="${locale}" data-index="/search/${locale}.test.json" data-page="/${prefix}search/" data-contents="/${prefix}contents/" data-strings="${strings}"`;
}

function dialogMarkup(): string {
  return `
    <header>
      <a id="opener" href="/search/" data-search-open>Search</a>
      <input id="field" type="text" />
    </header>
    <st-search ${dataAttributes()}>
      <dialog aria-labelledby="t">
        <h2 id="t">Search</h2>
        <button type="button" id="close" data-search-close>Close</button>
        <form action="/search/" method="get" role="search">
          <input id="q" type="search" name="q" role="combobox" aria-expanded="false" aria-controls="lb" />
        </form>
        <p role="status" data-failed-text="Search could not load."></p>
        <div id="lb" role="listbox" aria-label="Search results" hidden></div>
        <p data-search-all hidden><a href="/search/">Search</a></p>
        <div data-search-failed hidden><a href="/contents/">Contents</a></div>
        <section data-search-empty><a href="/core/register/">Do I need to register a company?</a></section>
      </dialog>
    </st-search>
    <main><h2 id="financial-statements" tabindex="-1">Financial statements</h2>
      <details id="words"><summary>Words used</summary><p>x</p></details>
      <p id="plain">Plain</p></main>`;
}

/**
 * Put markup in the document the way a browser upgrades a parsed page: each custom element
 * connects with its children already there.
 */
function mountHtml(html: string): void {
  const template = document.createElement('template');
  template.innerHTML = html;
  document.body.replaceChildren(document.importNode(template.content, true));
}

/**
 * Whether the element's own handlers cancelled an event, read by a listener that runs after them
 * and then cancels it, so happy-dom never really follows a link or submits a form (it would fetch
 * from its own fake origin).
 */
function afterOwnHandlers(target: EventTarget, type: string): () => boolean {
  let prevented = false;
  target.addEventListener(
    type,
    (event) => {
      prevented = event.defaultPrevented;
      event.preventDefault();
    },
    { once: true },
  );
  return () => prevented;
}

function key(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

beforeAll(() => {
  indexBody = JSON.parse(serialiseIndex('en', ['core', 'lookup'], entries).json) as unknown;
  if (!customElements.get('st-search')) customElements.define('st-search', StSearch);
  if (!customElements.get('st-search-page')) customElements.define('st-search-page', StSearchPage);
  if (!customElements.get('st-search-suggest')) {
    customElements.define('st-search-suggest', StSearchSuggest);
  }
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

describe('shortcuts', () => {
  const settings = { shortcuts: true, lowData: false };
  const event = (init: KeyboardEventInit, target: EventTarget = document.body) => {
    const e = new KeyboardEvent('keydown', init);
    Object.defineProperty(e, 'target', { value: target });
    return e;
  };

  it('opens on / and Ctrl+K or ⌘K, and on nothing else', () => {
    expect(isOpenShortcut(event({ key: '/' }), settings)).toBe(true);
    expect(isOpenShortcut(event({ key: 'k', ctrlKey: true }), settings)).toBe(true);
    expect(isOpenShortcut(event({ key: 'K', metaKey: true }), settings)).toBe(true);
    expect(isOpenShortcut(event({ key: 'k' }), settings)).toBe(false);
    expect(isOpenShortcut(event({ key: 'k', ctrlKey: true, shiftKey: true }), settings)).toBe(
      false,
    );
    expect(isOpenShortcut(event({ key: '/', altKey: true }), settings)).toBe(false);
  });

  it('never fires while the reader types in a field', () => {
    document.body.innerHTML =
      '<input id="i"><textarea id="t"></textarea><div id="e" contenteditable="true"></div><select id="s"></select>';
    for (const id of ['i', 't', 'e', 's']) {
      const field = document.getElementById(id)!;
      expect(isTypingTarget(field), id).toBe(true);
      expect(isOpenShortcut(event({ key: '/' }, field), settings)).toBe(false);
      expect(isOpenShortcut(event({ key: 'k', ctrlKey: true }, field), settings)).toBe(false);
    }
    expect(isTypingTarget(null)).toBe(false);
  });

  it('turns / off with the single-key shortcuts setting, but not Ctrl+K', () => {
    const off = { shortcuts: false, lowData: false };
    expect(isOpenShortcut(event({ key: '/' }), off)).toBe(false);
    expect(isOpenShortcut(event({ key: 'k', ctrlKey: true }), off)).toBe(true);
  });

  it('reads the settings, with low data from prefers-reduced-data', () => {
    const fake = {
      matchMedia: (q: string) => ({ matches: q.includes('reduced-data') }),
    } as unknown as Window;
    expect(searchSettings(fake)).toEqual({ shortcuts: true, lowData: true });
    expect(searchSettings({} as Window)).toEqual({ shortcuts: true, lowData: false });
  });
});

describe('<st-search>', () => {
  let host: StSearch;

  beforeEach(() => {
    stubFetch();
    mountHtml(dialogMarkup());
    host = document.querySelector<StSearch>('st-search')!;
  });

  // Opening imports the results code and starts loading the index; let that finish while `fetch`
  // is still stubbed.
  afterEach(async () => {
    await host.controller();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const dialog = () => document.querySelector('dialog')!;

  it('marks its openers as dialog openers with their keys', () => {
    const opener = document.getElementById('opener')!;
    expect(opener.getAttribute('aria-haspopup')).toBe('dialog');
    expect(opener.getAttribute('aria-keyshortcuts')).toBe('/ Control+K');
  });

  it('opens from its link, focuses the field, and closes back to the link', async () => {
    const opener = document.getElementById('opener')!;
    opener.focus();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    opener.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(dialog().open).toBe(true);
    expect(document.activeElement?.id).toBe('q');
    document.getElementById('close')!.click();
    expect(dialog().open).toBe(false);
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('opener'));
  });

  it('leaves a modified click to the browser', () => {
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });
    const prevented = afterOwnHandlers(document, 'click');
    document.getElementById('opener')!.dispatchEvent(click);
    expect(prevented()).toBe(false);
    expect(dialog().open).toBe(false);
  });

  it('opens on / and Ctrl+K from the page, but not from a field', () => {
    expect(key(document.body, { key: '/' }).defaultPrevented).toBe(true);
    expect(dialog().open).toBe(true);
    dialog().close();
    key(document.body, { key: 'k', ctrlKey: true });
    expect(dialog().open).toBe(true);
    dialog().close();
    const field = document.getElementById('field')!;
    field.focus();
    expect(key(field, { key: '/' }).defaultPrevented).toBe(false);
    expect(dialog().open).toBe(false);
  });

  it('fetches the index when it opens, not before', async () => {
    const fetch = stubFetch();
    expect(fetch).not.toHaveBeenCalled();
    (document.querySelector('st-search') as StSearch).open();
    await vi.waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/search/en.test.json', { credentials: 'same-origin' }),
    );
  });

  it('closes on a chosen result and leaves focus on the result, not on the opener', async () => {
    const opener = document.getElementById('opener')!;
    opener.focus();
    host.open(opener);
    const controller = (await host.controller()) as SearchDialogController;
    (document.getElementById('q') as HTMLInputElement).value = 'statements';
    await controller.search('statements');
    const option = document.querySelector<HTMLAnchorElement>('[role="option"]')!;
    // Stay on the result's page, so choosing it moves to the heading instead of loading a page.
    window.history.replaceState(null, '', new URL(option.href).pathname);
    key(document.getElementById('q')!, { key: 'Enter' });
    expect(document.querySelector('dialog')!.open).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement?.id).toBe('financial-statements');
    expect(window.location.hash).toBe('#financial-statements');
  });

  it('shows the failed state when the results code cannot load', async () => {
    const failing = Object.assign(host, {
      controller: () => Promise.reject(new Error('offline')),
    });
    failing.open();
    await vi.waitFor(() =>
      expect(document.querySelector<HTMLElement>('[data-search-failed]')!.hidden).toBe(false),
    );
    expect(document.querySelector<HTMLElement>('[data-search-empty]')!.hidden).toBe(true);
    // Review WP-33 pass 2, minor 2: and say why, in the live region.
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Search could not load.');
    // Back to the class's own method for the shared teardown.
    Reflect.deleteProperty(failing, 'controller');
  });

  // Review WP-33 pass 3, minor 1: a later open whose results code loads clears the failed state.
  it('clears the failed state when a later open loads the results code', async () => {
    const failing = Object.assign(host, {
      controller: () => Promise.reject(new Error('offline')),
    });
    failing.open();
    await vi.waitFor(() =>
      expect(document.querySelector('[role="status"]')?.textContent).toBe('Search could not load.'),
    );
    host.close();
    Reflect.deleteProperty(failing, 'controller');
    host.open();
    await host.controller();
    await vi.waitFor(() =>
      expect(document.querySelector<HTMLElement>('[data-search-failed]')!.hidden).toBe(true),
    );
    expect(document.querySelector<HTMLElement>('[data-search-empty]')!.hidden).toBe(false);
    expect(document.querySelector('[role="status"]')?.textContent).toBe('');
  });

  // Review WP-33 pass 2, major 1: a result chosen for a dialog that has closed must do nothing,
  // and must not leave the next close without its focus return.
  it('ignores a result chosen after the dialog closed, and still returns focus next time', async () => {
    const opener = document.getElementById('opener')!;
    host.open(opener);
    const controller = (await host.controller()) as SearchDialogController;
    (document.getElementById('q') as HTMLInputElement).value = 'statements';
    await controller.search('statements');
    const option = document.querySelector<HTMLAnchorElement>('[role="option"]')!;
    const before = window.location.href;
    host.close();
    controller.activate(option);
    expect(window.location.href).toBe(before);
    expect(window.sessionStorage.getItem(ARRIVAL_KEY)).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    host.open(opener);
    host.close();
    await vi.waitFor(() => expect(document.activeElement).toBe(opener));
  });

  // Review WP-33 pass 1, minor 3: Escape in a search field first cleared it.
  it('closes on Escape in the field even with text in it', () => {
    host.open();
    const field = document.getElementById('q') as HTMLInputElement;
    field.value = 'VAT';
    expect(key(field, { key: 'Escape' }).defaultPrevented).toBe(true);
    expect(document.querySelector('dialog')!.open).toBe(false);
  });

  it('shows the shortcut setting on its openers', () => {
    host.applySettings({ shortcuts: false, lowData: false });
    expect(document.getElementById('opener')!.getAttribute('aria-keyshortcuts')).toBe('Control+K');
  });

  it('stops listening when it is removed', () => {
    document.querySelector('st-search')!.remove();
    expect(key(document.body, { key: '/' }).defaultPrevented).toBe(false);
  });
});

describe('the results listbox', () => {
  let opened: string[];
  let controller: SearchDialogController;
  let client: SearchClient;

  beforeEach(() => {
    stubFetch();
    mountHtml(dialogMarkup());
    opened = [];
    client = createSearchClient({ url: '/search/en.test.json', locale: 'en', base: '/' });
    controller = new SearchDialogController(
      document.querySelector('st-search')!,
      { settings: { shortcuts: true, lowData: true }, openResult: (url) => opened.push(url) },
      client,
    );
    document.querySelector('dialog')!.showModal();
  });

  const input = () => document.getElementById('q') as HTMLInputElement;
  const options = () => [...document.querySelectorAll<HTMLAnchorElement>('[role="option"]')];

  it('groups results by section as options with marked matches, built without HTML parsing', async () => {
    (document.getElementById('q') as HTMLInputElement).value = 'PIS';
    await controller.search('PIS');
    const groups = [...document.querySelectorAll('[role="group"]')];
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual([
      'Results in Look it up',
      'Results in Core: applies to everyone',
    ]);
    expect(options().map((o) => o.getAttribute('href'))).toEqual([
      '/glossary/#pis',
      '/checklist/#compliance',
      '/core/running-a-pty-ltd/#financial-statements',
    ]);
    expect(options()[0]!.querySelector('mark')?.textContent).toBe('PIS');
    // Result text that looks like markup stays text.
    expect(options()[0]!.querySelector('b')).toBeNull();
    expect(options()[0]!.textContent).toContain('<b>number</b>');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[role="status"]')?.textContent).toBe('3 results');
    expect(document.querySelector<HTMLElement>('[data-search-empty]')!.hidden).toBe(true);
  });

  it('marks an English result on an Afrikaans page in its language', async () => {
    (document.getElementById('q') as HTMLInputElement).value = 'statements';
    await controller.search('statements');
    const english = options()[0]!;
    expect(english.querySelector('.st-search-result__title')?.getAttribute('lang')).toBe('en-ZA');
    expect(english.querySelector('.st-search-result__lang')?.textContent).toBe('English');
  });

  it('moves through the options with the arrow keys, wrapping, and opens one with Enter', async () => {
    (document.getElementById('q') as HTMLInputElement).value = 'PIS';
    await controller.search('PIS');
    key(input(), { key: 'ArrowDown' });
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[0]!.id);
    expect(options()[0]!.getAttribute('aria-selected')).toBe('true');
    key(input(), { key: 'ArrowDown' });
    key(input(), { key: 'ArrowDown' });
    key(input(), { key: 'ArrowDown' });
    expect(controller.activeIndex).toBe(0);
    key(input(), { key: 'ArrowUp' });
    expect(controller.activeIndex).toBe(2);
    expect(options()[0]!.getAttribute('aria-selected')).toBe('false');
    const enter = key(input(), { key: 'Enter' });
    expect(enter.defaultPrevented).toBe(true);
    expect(opened).toEqual([options()[2]!.href]);
  });

  // Review WP-33 pass 1, major 2: Enter inside the debounce opened the previous query's result.
  it('opens a result of the current text when Enter comes before the search has run', async () => {
    input().value = 'PIS';
    await controller.search('PIS');
    expect(options()[0]!.getAttribute('href')).toBe('/glossary/#pis');
    input().value = 'statements';
    input().dispatchEvent(new Event('input'));
    expect(key(input(), { key: 'Enter' }).defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(opened).toHaveLength(1));
    expect(opened[0]).toMatch(/\/core\/running-a-pty-ltd\/#financial-statements$/);
  });

  describe('Enter before the index has loaded (review WP-33 pass 2, major 1)', () => {
    let release: () => void;
    let pending: SearchDialogController;

    beforeEach(() => {
      // Fresh markup, so only this controller listens to the field.
      mountHtml(dialogMarkup());
      document.querySelector('dialog')!.showModal();
      const real = createSearchClient({ url: '/search/en.test.json', locale: 'en', base: '/' });
      let loaded = false;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const slow: SearchClient = {
        load: () => real.load(),
        get ready() {
          return loaded;
        },
        async search(query, options) {
          await gate;
          loaded = true;
          return real.search(query, options);
        },
      };
      pending = new SearchDialogController(
        document.querySelector('st-search')!,
        { settings: { shortcuts: true, lowData: true }, openResult: (url) => opened.push(url) },
        slow,
      );
    });

    it('opens the result for the text once the index arrives, if the dialog is still open', async () => {
      input().value = 'statements';
      expect(key(input(), { key: 'Enter' }).defaultPrevented).toBe(true);
      expect(opened).toEqual([]);
      release();
      await vi.waitFor(() => expect(opened).toHaveLength(1));
      expect(opened[0]).toMatch(/\/core\/running-a-pty-ltd\/#financial-statements$/);
      void pending;
    });

    it('does nothing when the dialog closed while the index was loading', async () => {
      input().value = 'statements';
      key(input(), { key: 'Enter' });
      document.querySelector('dialog')!.close();
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(opened).toEqual([]);
    });

    // Review WP-33 pass 3, minor 2: the case the close counter exists for. Re-opening runs the
    // same text again, so the open check and the text check alone would let the old Enter act.
    it('does nothing when the dialog closed and re-opened while the index was loading', async () => {
      input().value = 'statements';
      key(input(), { key: 'Enter' });
      const dialog = document.querySelector('dialog')!;
      dialog.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
      dialog.showModal();
      pending.opened();
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(opened).toEqual([]);
      // The re-opened dialog shows the results for its text, ready for a new Enter.
      await vi.waitFor(() => expect(options().length).toBeGreaterThan(0));
    });

    it('does nothing when the text changed while the index was loading', async () => {
      input().value = 'statements';
      key(input(), { key: 'Enter' });
      input().value = 'PIS';
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(opened).toEqual([]);
    });
  });

  // Review WP-33 pass 2, nit 2: one fast Enter with no results goes to the search page.
  it('submits to the search page when a fast Enter finds nothing', async () => {
    const form = input().form!;
    const submit = vi.fn();
    form.requestSubmit = submit;
    input().value = 'zzzzzz';
    key(input(), { key: 'Enter' });
    await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(opened).toEqual([]);
  });

  it('names each option by its title and describes it with the rest', async () => {
    input().value = 'statements';
    await controller.search('statements');
    const option = options()[0]!;
    const title = document.getElementById(option.getAttribute('aria-labelledby')!);
    expect(title?.textContent).toBe('Financial statements');
    const described = option.getAttribute('aria-describedby')!.split(' ');
    expect(described.length).toBeGreaterThanOrEqual(2);
    expect(described.map((id) => document.getElementById(id)?.textContent).join(' ')).toContain(
      'Running a Pty Ltd',
    );
  });

  it('opens the first result on Enter when none is active, and an option on a click', async () => {
    (document.getElementById('q') as HTMLInputElement).value = 'PIS';
    await controller.search('PIS');
    key(input(), { key: 'Enter' });
    expect(opened).toEqual([options()[0]!.href]);
    options()[1]!
      .querySelector('span')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(opened).toHaveLength(2);
    const middle = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      metaKey: true,
    });
    const prevented = afterOwnHandlers(document, 'click');
    options()[1]!.dispatchEvent(middle);
    expect(prevented()).toBe(false);
    expect(opened).toHaveLength(2);
  });

  it('ignores arrow keys with no results, and lets Enter submit to the search page', () => {
    key(input(), { key: 'ArrowDown' });
    expect(controller.activeIndex).toBe(-1);
    expect(key(input(), { key: 'Enter' }).defaultPrevented).toBe(false);
    const submit = new Event('submit', { cancelable: true });
    input().form!.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
    input().value = 'x';
    const prevented = afterOwnHandlers(input().form!, 'submit');
    input().form!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(prevented()).toBe(false);
  });

  it('shows a few results per section, and links the search page for the rest', async () => {
    const many: SearchEntry[] = Array.from({ length: 5 }, (_, i) => ({
      ...entries[0]!,
      key: `levy-${String(i)}`,
      anchor: `levy-${String(i)}`,
      title: `Levy ${String(i)}`,
      text: 'levy',
    }));
    const saved = indexBody;
    indexBody = JSON.parse(serialiseIndex('en', ['lookup'], many).json) as unknown;
    try {
      (document.getElementById('q') as HTMLInputElement).value = 'levy';
      await controller.search('levy');
    } finally {
      indexBody = saved;
    }
    expect(options()).toHaveLength(3);
    const all = document.querySelector<HTMLElement>('[data-search-all]')!;
    expect(all.hidden).toBe(false);
    expect(all.querySelector('a')?.getAttribute('href')).toBe('/search/?q=levy');
    expect(all.textContent).toBe('See all 5 results on the search page');
    // Review WP-33 pass 1, minor 2: announce what the arrow keys can reach.
    expect(document.querySelector('[role="status"]')?.textContent).toBe('3 of 5 results shown');
    (document.getElementById('q') as HTMLInputElement).value = 'PIS';
    await controller.search('PIS');
    expect(all.hidden).toBe(true);
  });

  it('says when nothing matched and keeps the common questions', async () => {
    (document.getElementById('q') as HTMLInputElement).value = 'zzzzzz';
    await controller.search('zzzzzz');
    expect(options()).toHaveLength(0);
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      'Nothing found for “zzzzzz”.',
    );
    expect(document.querySelector<HTMLElement>('[data-search-empty]')!.hidden).toBe(false);
    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('goes back to the common questions when the field is cleared', async () => {
    (document.getElementById('q') as HTMLInputElement).value = 'PIS';
    await controller.search('PIS');
    (document.getElementById('q') as HTMLInputElement).value = '  ';
    await controller.search('  ');
    expect(options()).toHaveLength(0);
    expect(document.querySelector('[role="status"]')?.textContent).toBe('');
    expect(document.querySelector<HTMLElement>('[data-search-empty]')!.hidden).toBe(false);
  });

  it('shows the failed state, with the contents link, when the index cannot load', async () => {
    stubFetch(false);
    (document.getElementById('q') as HTMLInputElement).value = 'PIS';
    await controller.search('PIS');
    expect(document.querySelector<HTMLElement>('[data-search-failed]')!.hidden).toBe(false);
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Search could not load.');
  });

  it('shows "Loading" while a slow index loads, and drops an answer to an old query', async () => {
    let release: () => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve({ ok: true, status: 200, json: () => Promise.resolve(indexBody) });
          }),
      ),
    );
    vi.useFakeTimers();
    const first = controller.search('PIS');
    const second = controller.search('statements');
    await vi.advanceTimersByTimeAsync(200);
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Loading search…');
    release();
    await Promise.all([first, second]);
    expect(options().map((o) => o.getAttribute('href'))).toEqual([
      '/core/running-a-pty-ltd/#financial-statements',
    ]);
  });

  it('searches as the reader types, after a short pause', async () => {
    vi.useFakeTimers();
    input().value = 'PIS';
    input().dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(130);
    vi.useRealTimers();
    await vi.waitFor(() => expect(options()).toHaveLength(3));
  });

  it('runs the query already typed when it is opened, and loads the index unless low data', async () => {
    const fetch = stubFetch();
    const eager = new SearchDialogController(document.querySelector('st-search')!, {
      settings: { shortcuts: true, lowData: false },
      openResult: () => undefined,
    });
    eager.opened();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    input().value = 'PIS';
    controller.opened();
    await vi.waitFor(() => expect(options()).toHaveLength(3));
  });

  it('refuses markup without its parts', () => {
    mountHtml(`<st-search ${dataAttributes()}></st-search>`);
    expect(
      () =>
        new SearchDialogController(document.querySelector('st-search')!, {
          settings: { shortcuts: true, lowData: false },
          openResult: () => undefined,
        }),
    ).toThrow(/markup is incomplete/);
  });
});

describe('arriving at a result', () => {
  beforeEach(() => {
    mountHtml(dialogMarkup());
  });

  it('finds the element a fragment names', () => {
    expect(fragmentTarget(document, '#financial-statements')?.id).toBe('financial-statements');
    expect(fragmentTarget(document, '#')).toBeNull();
    expect(fragmentTarget(document, '#%E0%A4%A')).toBeNull();
  });

  it('focuses and briefly highlights a heading, then removes the highlight', () => {
    vi.useFakeTimers();
    const heading = document.getElementById('financial-statements')!;
    focusTarget(heading);
    expect(document.activeElement).toBe(heading);
    expect(heading.classList.contains(HIGHLIGHT_CLASS)).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(heading.classList.contains(HIGHLIGHT_CLASS)).toBe(false);
  });

  it('opens a <details> and focuses its summary; makes a plain element focusable', () => {
    focusTarget(document.getElementById('words')!);
    expect((document.getElementById('words') as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement?.tagName).toBe('SUMMARY');
    focusTarget(document.getElementById('plain')!);
    expect(document.getElementById('plain')!.getAttribute('tabindex')).toBe('-1');
  });

  it('remembers a result on another page and focuses its heading there, once', () => {
    const assign = vi.fn();
    const fake = {
      location: { href: 'http://localhost/core/', assign },
      sessionStorage: window.sessionStorage,
      history: window.history,
      document,
      setTimeout: window.setTimeout.bind(window),
    } as unknown as Window;
    openResult('/core/running-a-pty-ltd/#financial-statements', fake);
    expect(assign).toHaveBeenCalledWith(
      'http://localhost/core/running-a-pty-ltd/#financial-statements',
    );
    expect(window.sessionStorage.getItem(ARRIVAL_KEY)).toBe(
      'http://localhost/core/running-a-pty-ltd/#financial-statements',
    );

    const arrived = {
      ...fake,
      location: { href: 'http://localhost/core/running-a-pty-ltd/#financial-statements' },
    } as unknown as Window;
    expect(consumeArrival(arrived)?.id).toBe('financial-statements');
    expect(document.activeElement?.id).toBe('financial-statements');
    expect(window.sessionStorage.getItem(ARRIVAL_KEY)).toBeNull();
    expect(consumeArrival(arrived)).toBeNull();
  });

  it('ignores a remembered result for another page', () => {
    window.sessionStorage.setItem(ARRIVAL_KEY, 'http://localhost/other/#financial-statements');
    const here = {
      location: { href: 'http://localhost/core/#financial-statements' },
      sessionStorage: window.sessionStorage,
      document,
    } as unknown as Window;
    expect(consumeArrival(here)).toBeNull();
  });

  it('survives blocked storage', () => {
    const blocked = {
      get sessionStorage(): Storage {
        throw new Error('SecurityError');
      },
      location: { href: 'http://localhost/', assign: vi.fn() },
      document,
    } as unknown as Window;
    expect(consumeArrival(blocked)).toBeNull();
    expect(() => openResult('/x/#y', blocked)).not.toThrow();
  });

  it('moves to a heading on the same page without loading it again', () => {
    const assign = vi.fn();
    const pushState = vi.fn();
    const fake = {
      location: { href: 'http://localhost/core/running-a-pty-ltd/', assign },
      history: { pushState },
      sessionStorage: window.sessionStorage,
      document,
      setTimeout: window.setTimeout.bind(window),
    } as unknown as Window;
    openResult('/core/running-a-pty-ltd/#financial-statements', fake);
    expect(assign).not.toHaveBeenCalled();
    expect(pushState).toHaveBeenCalledWith(null, '', '#financial-statements');
    expect(document.activeElement?.id).toBe('financial-statements');
  });
});

describe('<st-search-page>', () => {
  function mount(url: string): void {
    window.history.replaceState(null, '', url);
    mountHtml(`
      <st-search-page ${dataAttributes()}>
        <form action="/search/" method="get"><input name="q" type="search" /><button>Search</button></form>
        <section data-search-region>
          <h2 data-search-title hidden>Search results</h2>
          <p role="status"></p>
          <div data-search-list></div>
          <div data-search-failed hidden></div>
        </section>
      </st-search-page>`);
  }

  const title = () => document.querySelector<HTMLElement>('[data-search-title]')!;

  it('runs ?q= in place and echoes the query', async () => {
    stubFetch();
    mount('/search/?q=PIS');
    expect((document.querySelector('input') as HTMLInputElement).value).toBe('PIS');
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[data-search-result]')).toHaveLength(3),
    );
    expect(title().hidden).toBe(false);
    expect(document.querySelector('[data-search-title]')?.textContent).toBe('Results for “PIS”');
    expect([...document.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'Look it up',
      'Core: applies to everyone',
    ]);
  });

  it('loads nothing without a query, and updates ?q= on a new search', async () => {
    const fetch = stubFetch();
    mount('/search/');
    expect(title().hidden).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    (document.querySelector('input') as HTMLInputElement).value = 'statements';
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(window.location.search).toBe('?q=statements');
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[data-search-result]')).toHaveLength(1),
    );
    window.sessionStorage.clear();
    afterOwnHandlers(document, 'click');
    document
      .querySelector<HTMLElement>('[data-search-result] span')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(window.sessionStorage.getItem(ARRIVAL_KEY)).toContain('#financial-statements');
    (document.querySelector('input') as HTMLInputElement).value = '';
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(title().hidden).toBe(true);
  });

  it('follows the history back to an earlier query', async () => {
    stubFetch();
    mount('/search/?q=statements');
    window.history.pushState(null, '', '/search/?q=PIS');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[data-search-result]')).toHaveLength(3),
    );
    expect((document.querySelector('input') as HTMLInputElement).value).toBe('PIS');
  });

  it('says when nothing matched, and when search failed', async () => {
    stubFetch();
    mount('/search/?q=zzzzzz');
    await vi.waitFor(() =>
      expect(document.querySelector('[role="status"]')?.textContent).toContain('Nothing found'),
    );
    document.body.replaceChildren();
    stubFetch(false);
    mount('/search/?q=PIS');
    await vi.waitFor(() =>
      expect(document.querySelector<HTMLElement>('[data-search-failed]')!.hidden).toBe(false),
    );
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Search could not load.');
  });
});

describe('<st-search-suggest>', () => {
  it('turns a missing address into words', () => {
    expect(wordsFromPath('/core/financial-statemnts/')).toBe('core financial statemnts');
    expect(wordsFromPath('/a/index.html')).toBe('');
    expect(wordsFromPath('/%E0%A4%A/x-y')).toBe('%E0%A4%A');
    expect(queryFrom('/search/?q=%20VAT264%20')).toBe('VAT264');
    expect(suggestionQueries('business-types/vehicle-dealr/')).toEqual([
      'vehicle dealr',
      'business types vehicle dealr',
    ]);
    expect(suggestionQueries('vat-guide/')).toEqual(['vat guide']);
    expect(suggestionQueries('/')).toEqual([]);
    expect(queryFrom('/search/')).toBe('');
  });

  it("suggests pages for the words in the address, only in the address's language", async () => {
    stubFetch();
    window.history.replaceState(null, '', '/financial-statemnts/');
    mountHtml(`
      <st-search-suggest id="en" ${dataAttributes('en')} hidden></st-search-suggest>
      <st-search-suggest id="af" ${dataAttributes('af')} hidden></st-search-suggest>`);
    const en = document.getElementById('en')!;
    await vi.waitFor(() => expect(en.hidden).toBe(false));
    expect(en.querySelector('p')?.textContent).toBe(
      'Maybe you were looking for: Financial statements',
    );
    expect(en.querySelector('p a')?.getAttribute('href')).toBe(
      '/core/running-a-pty-ltd/#financial-statements',
    );
    expect(en.querySelector('p a')?.getAttribute('lang')).toBe('en-ZA');
    expect(document.getElementById('af')!.hidden).toBe(true);
  });

  it('lists further suggestions, and stays hidden when nothing matches or the index fails', async () => {
    stubFetch();
    mountHtml(`<st-search-suggest ${dataAttributes()} hidden></st-search-suggest>`);
    const element = document.querySelector<StSearchSuggest>('st-search-suggest')!;
    const context = readContext(element);
    await element.suggest(['zzzzzz', 'PIS'], context);
    expect(element.querySelectorAll('li')).toHaveLength(2);
    element.replaceChildren();
    element.hidden = true;
    await element.suggest(['zzzzzz'], context);
    expect(element.hidden).toBe(true);
    stubFetch(false);
    await element.suggest(['PIS'], context, createSearchClient({ url: '/x.json', locale: 'en' }));
    expect(element.hidden).toBe(true);
  });
});
