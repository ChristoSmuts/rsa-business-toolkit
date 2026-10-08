/**
 * Search entries for one language (build plan A7): every part of every page (from a heading to
 * the next heading), every glossary entry, every "Words used in this file" term, every checklist
 * item and every common question, each with its ranking weight and its applicability facets.
 *
 * Pure: the caller passes the loaded data. `scripts/build-search-index.ts` reads `src/data`, and the
 * unit tests pass fixtures.
 */
import { docrefText } from '../../src/lib/content/manifest';
import { plainText, TERMS_HEADING_ID } from '../../src/lib/content/render';
import type {
  Applicability,
  Block,
  Doc,
  GlossaryFile,
  InlineRun,
  Manifest,
  QuickAnswersFile,
  TasksFile,
} from '../../src/lib/content/schema';
import type { Locale } from '../../src/i18n/locales';
import { foldTerm, KIND_WEIGHT } from '../../src/lib/search/options';
import type { SearchEntry, SearchEntryKind } from '../../src/lib/search/types';

/** Excerpts stop at the last word boundary before this many characters. */
export const EXCERPT_LENGTH = 160;

/** Code fences whose text is searched. Listings and literal examples are layout, not prose. */
const SEARCHED_FENCES: ReadonlySet<string> = new Set(['prompt', 'snippet', 'template-preview']);

/** URLs and bare domains add tokens such as `www` and `gov` to every source entry. */
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/g;

export interface LangData<T> {
  /** The data, in the index language or the English fallback. */
  readonly data: T;
  /** The language the data is in. */
  readonly lang: Locale;
}

export interface IndexInput {
  /** The index language. */
  readonly lang: Locale;
  readonly manifest: Manifest;
  /** Every document, in the index language where it is translated, else in English. */
  readonly docs: readonly Doc[];
  readonly glossary?: LangData<GlossaryFile> | undefined;
  readonly tasks?: LangData<TasksFile> | undefined;
  readonly quickAnswers?: LangData<QuickAnswersFile> | undefined;
  /**
   * Search keywords by document id (`content-meta/search-keywords.json`): indexed with the page's
   * first entry, in its heading field.
   */
  readonly keywords?: ReadonlyMap<string, readonly string[]> | undefined;
}

/** Collapse whitespace; drop URLs. */
export function cleanText(text: string): string {
  return text.replace(URL, ' ').replace(/\s+/g, ' ').trim();
}

/** The first `EXCERPT_LENGTH` characters, cut at a word boundary, with an ellipsis when cut. */
export function excerptOf(text: string, length: number = EXCERPT_LENGTH): string | undefined {
  const clean = cleanText(text);
  if (clean === '') return undefined;
  if (clean.length <= length) return clean;
  const cut = clean.slice(0, length);
  const space = cut.lastIndexOf(' ');
  return `${(space > length / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/u, '')}…`;
}

function runsText(
  manifest: Manifest,
  lang: Locale,
  runs: readonly InlineRun[] | undefined,
): string {
  return plainText(runs, { docref: (run) => docrefText(manifest, run, lang) });
}

/** The searchable text of one block. Headings, terms tables and structural blocks give none. */
export function blockSearchText(manifest: Manifest, lang: Locale, block: Block): string {
  const text = (runs: readonly InlineRun[] | undefined): string => runsText(manifest, lang, runs);
  switch (block.kind) {
    case 'paragraph':
    case 'callout':
    case 'note':
      return text(block.c);
    case 'list':
      return block.items.map((item) => text(item)).join('\n');
    case 'tasklist':
      return [block.group, ...block.items.map((item) => item.c)].map((r) => text(r)).join('\n');
    case 'table':
      return [...block.header, ...block.rows.flat()].map((cell) => text(cell)).join('\n');
    case 'code':
      return SEARCHED_FENCES.has(block.variant) ? block.text : '';
    case 'heading':
    case 'terms':
    case 'hr':
    case 'toc':
    case 'glossary':
      return '';
  }
}

interface Facets {
  readonly entity?: 'sole-prop' | 'pty' | undefined;
  readonly businessTypes?: readonly string[] | undefined;
}

function docFacets(doc: Doc): Facets {
  return {
    entity: doc.appliesTo.entity === 'all' ? undefined : doc.appliesTo.entity,
    businessTypes: doc.appliesTo.businessTypes === 'all' ? undefined : doc.appliesTo.businessTypes,
  };
}

/** The most specific applicability wins: a heading's own, then its parent's, then the page's. */
function narrow(outer: Facets, inner: Applicability | undefined): Facets {
  return {
    entity: inner?.entity ?? outer.entity,
    businessTypes: inner?.businessTypes ?? outer.businessTypes,
  };
}

function entry(
  kind: SearchEntryKind,
  fields: Omit<SearchEntry, 'kind' | 'weight' | 'route'>,
  input: Pick<IndexInput, 'lang' | 'manifest'>,
): SearchEntry {
  const indexLang = input.lang;
  const route = input.manifest.docs[fields.doc]?.route;
  if (route === undefined) throw new Error(`search: ${fields.doc} is not in the manifest`);
  const out: SearchEntry = {
    ...fields,
    route,
    kind,
    weight: KIND_WEIGHT[kind],
    lang: fields.lang === indexLang ? undefined : fields.lang,
  };
  // Leave optional keys out rather than storing `undefined`.
  return Object.fromEntries(
    Object.entries(out).filter(([, value]) => value !== undefined),
  ) as unknown as SearchEntry;
}

function sectionTitleFor(manifest: Manifest, lang: Locale, sectionId: string): string {
  const section = manifest.sections.find((s) => s.id === sectionId);
  return section?.titles[lang] ?? section?.titles.en ?? sectionId;
}

interface OpenSection {
  readonly anchor: string | undefined;
  readonly title: string;
  readonly parents: readonly string[];
  readonly facets: Facets;
  readonly parts: string[];
}

/** One entry per part of the page: the text before the first heading, then each heading's text. */
export function sectionEntries(input: IndexInput, doc: Doc): SearchEntry[] {
  const { manifest, lang } = input;
  const contentLang = doc.lang as Locale;
  const sectionTitle = sectionTitleFor(manifest, lang, doc.section);
  const pageFacets = docFacets(doc);
  const out: SearchEntry[] = [];
  /** Open headings by depth, for the breadcrumb and inherited applicability. */
  const stack: { depth: number; text: string; facets: Facets }[] = [];
  let current: OpenSection | undefined = {
    anchor: undefined,
    title: doc.title,
    parents: [],
    facets: pageFacets,
    parts: [],
  };

  const close = (): void => {
    if (current === undefined) return;
    const text = cleanText(current.parts.join('\n'));
    // A heading with no text of its own (an H2 straight above its H3s) is still found through
    // the breadcrumb of its sub-sections, so it gets no entry of its own.
    if (text !== '') {
      // The page's first entry also carries the H1 the page shows ("AI disclosure"), next to the
      // navigation title every entry's breadcrumb holds, so a query that names the page finds it
      // (review WP-33 pass 10). Not in the boosted title field: there it lifted an overview page
      // above the template asked for (`quote template`, pass 11). A page title lifts a page only
      // through the title rule (`titleCoverage`).
      const first = out.length === 0;
      const h1 = first && doc.h1 !== doc.title ? [doc.h1] : [];
      // The page's keywords: owner words its own titles lack (review WP-33 pass 14).
      const keywords = first ? (input.keywords?.get(doc.id) ?? []) : [];
      out.push(
        entry(
          'section',
          {
            key: current.anchor === undefined ? doc.id : `${doc.id}#${current.anchor}`,
            doc: doc.id,
            anchor: current.anchor,
            title: current.title,
            indexTitle: keywords.length > 0 ? [current.title, ...keywords].join(' · ') : undefined,
            pageTitle: first ? doc.h1 : undefined,
            docTitle: [doc.title, ...current.parents].join(' › '),
            path: [sectionTitle, doc.title, ...h1, ...current.parents].join(' › '),
            text,
            excerpt: excerptOf(text),
            section: doc.section,
            lang: contentLang,
            entity: current.facets.entity,
            businessTypes: current.facets.businessTypes,
          },
          input,
        ),
      );
    }
    current = undefined;
  };

  for (const block of doc.blocks) {
    if (block.kind === 'heading') {
      close();
      while (stack.length > 0 && (stack.at(-1)?.depth ?? 0) >= block.depth) stack.pop();
      const outer = stack.at(-1)?.facets ?? pageFacets;
      const facets = narrow(outer, block.appliesTo);
      const parents = stack.map((open) => open.text);
      stack.push({ depth: block.depth, text: block.text, facets });
      // A hidden section (`hideSections`) and the "Words used" table (indexed as terms) get no entry.
      if (block.hidden === true || block.id === TERMS_HEADING_ID) continue;
      current = { anchor: block.id, title: block.text, parents, facets, parts: [] };
      continue;
    }
    if (block.hidden === true || current === undefined) continue;
    const text = blockSearchText(manifest, contentLang, block);
    if (text !== '') current.parts.push(text);
  }
  close();
  return out;
}

/** A term as it appears in prose: `Register (noun)` → `register`. */
function termWords(term: string): string {
  return foldTerm(term.replace(/\s*\([^)]*\)/g, '')).trim();
}

/**
 * `true` when `text` uses `words` as words, not inside other words: `IP` is not in "municipal",
 * `POP` is not in "popia". A plural (`s` or `es`) still counts.
 */
export function usesWords(text: string, words: string): boolean {
  if (words === '') return false;
  const escaped = words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?:e?s)?(?![\\p{L}\\p{N}])`, 'u').test(
    foldTerm(text),
  );
}

/**
 * "Words used in this file": one entry per term. It opens the first part of the page whose text
 * uses the term, because that is where the term is explained in context; the word list itself
 * (a `<details>`, not a heading) is the fallback when no part uses it.
 */
export function termEntries(
  input: IndexInput,
  doc: Doc,
  sections: readonly SearchEntry[] = sectionEntries(input, doc),
): SearchEntry[] {
  const list = doc.headings.some((heading) => heading.id === TERMS_HEADING_ID)
    ? TERMS_HEADING_ID
    : undefined;
  const sectionTitle = sectionTitleFor(input.manifest, input.lang, doc.section);
  return doc.terms.map((term, index) => {
    const words = termWords(term.term);
    const usedIn = sections.find(
      (section) => section.anchor !== undefined && usesWords(section.text, words),
    );
    return entry(
      'term',
      {
        key: `${doc.id}~term~${String(index)}`,
        doc: doc.id,
        anchor: usedIn?.anchor ?? list,
        title: term.term,
        docTitle: usedIn === undefined ? doc.title : `${usedIn.docTitle} › ${usedIn.title}`,
        path: [sectionTitle, doc.title].join(' › '),
        text: cleanText(term.meaning),
        excerpt: excerptOf(term.meaning),
        section: doc.section,
        lang: doc.lang,
        ...docFacets(doc),
      },
      input,
    );
  });
}

export function glossaryEntries(input: IndexInput): SearchEntry[] {
  const glossary = input.glossary;
  if (glossary === undefined) return [];
  const { manifest } = input;
  const docId = glossary.data.doc;
  const doc = manifest.docs[docId];
  const docTitle = doc?.titles[glossary.lang] ?? doc?.titles.en ?? docId;
  const section = doc?.section ?? 'lookup';
  const sectionTitle = sectionTitleFor(manifest, input.lang, section);
  return glossary.data.entries.map((item) => {
    const definition = runsText(manifest, glossary.lang, item.definition);
    return entry(
      'glossary',
      {
        key: `${docId}#${item.id}`,
        doc: docId,
        anchor: item.id,
        title: item.term,
        // The kind already says "Glossary"; the group says which part of it.
        docTitle: `${docTitle} › ${item.group}`,
        path: [sectionTitle, docTitle, item.group].join(' › '),
        text: cleanText(definition),
        excerpt: excerptOf(definition),
        section,
        lang: glossary.lang,
      },
      input,
    );
  });
}

export function taskEntries(input: IndexInput, docsById: ReadonlyMap<string, Doc>): SearchEntry[] {
  const tasks = input.tasks;
  if (tasks === undefined) return [];
  const { manifest } = input;
  const out: SearchEntry[] = [];
  for (const task of tasks.data.tasks) {
    const doc = docsById.get(task.doc);
    if (doc === undefined) continue;
    const heading = doc.blocks.find(
      (block): block is Extract<Block, { kind: 'heading' }> =>
        block.kind === 'heading' && block.id === task.heading,
    );
    if (heading?.hidden === true) continue;
    const facets = narrow(narrow(docFacets(doc), heading?.appliesTo), task.when);
    const sectionTitle = sectionTitleFor(manifest, input.lang, doc.section);
    const group = task.group === undefined ? '' : runsText(manifest, tasks.lang, task.group);
    const taskText = cleanText(runsText(manifest, tasks.lang, task.c));
    out.push(
      entry(
        'task',
        {
          key: task.id,
          doc: doc.id,
          anchor: heading?.id,
          title: taskText,
          // A task is a sentence, not a name: searched as text, so a long task that happens to
          // mention a form code does not outrank the section that explains the form.
          indexTitle: '',
          docTitle: heading === undefined ? doc.title : `${doc.title} › ${heading.text}`,
          path: [sectionTitle, doc.title, heading?.text ?? ''].filter(Boolean).join(' › '),
          text: cleanText(`${taskText}\n${group}`),
          section: doc.section,
          lang: tasks.lang,
          entity: facets.entity,
          businessTypes: facets.businessTypes,
        },
        input,
      ),
    );
  }
  return out;
}

export function answerEntries(input: IndexInput): SearchEntry[] {
  const answers = input.quickAnswers;
  if (answers === undefined) return [];
  const { manifest } = input;
  const out: SearchEntry[] = [];
  for (const item of answers.data.items) {
    const target = item.targets.find((run) => 'doc' in run && manifest.docs[run.doc] !== undefined);
    if (target === undefined || !('doc' in target)) continue;
    const targetDoc = manifest.docs[target.doc];
    const targets = item.targets.map((run) => docrefText(manifest, run, answers.lang)).join(', ');
    const note = item.note === undefined ? '' : runsText(manifest, answers.lang, item.note);
    const question = runsText(manifest, answers.lang, item.question);
    // The answer page's lead (its summary), so a question asked in other words still finds the
    // quick answer: "Do I need to register a company?" also holds "one-person business" from the
    // Register page's lead (review WP-33 pass 13, major). In a field of its own with a low boost,
    // so it never lifts an unrelated answer above a better result (pass 14, minor 4).
    const lead = input.docs.find((doc) => doc.id === target.doc)?.summary ?? '';
    out.push(
      entry(
        'answer',
        {
          key: `${answers.data.doc}~answer~${item.id}`,
          doc: target.doc,
          title: cleanText(question),
          docTitle: targets,
          path: targets,
          text: cleanText(`${targets} ${note}`),
          lead: cleanText(lead),
          excerpt: excerptOf(note),
          section: targetDoc?.section ?? 'start',
          lang: answers.lang,
        },
        input,
      ),
    );
  }
  return out;
}

/** Every entry for one language, in a stable order (documents in manifest order). */
export function buildEntries(input: IndexInput): SearchEntry[] {
  const docsById = new Map(input.docs.map((doc) => [doc.id, doc]));
  const ordered: Doc[] = [];
  for (const section of [...input.manifest.sections].sort((a, b) => a.order - b.order)) {
    for (const id of section.docs) {
      const doc = docsById.get(id);
      if (doc !== undefined) ordered.push(doc);
    }
  }
  const glossary = glossaryEntries(input);
  // A "Words used" term that the glossary also defines would be a second result with the same
  // name and nearly the same words, ahead of the page sections that use it.
  const defined = new Set(glossary.map((item) => foldTerm(item.title)));
  return [
    ...answerEntries(input),
    ...glossary,
    ...ordered.flatMap((doc) => {
      const sections = sectionEntries(input, doc);
      return [
        ...sections,
        ...termEntries(input, doc, sections).filter((term) => !defined.has(foldTerm(term.title))),
      ];
    }),
    ...taskEntries(input, docsById),
  ];
}
