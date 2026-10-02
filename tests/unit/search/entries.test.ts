/**
 * `scripts/search/entries.ts` and friends on small fixtures: what becomes an entry, with which
 * title, breadcrumb, anchor, language and applicability.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { contentHash, serialiseIndex, toIndexedDocument } from '../../../scripts/search/build';
import {
  answerEntries,
  blockSearchText,
  buildEntries,
  cleanText,
  excerptOf,
  glossaryEntries,
  sectionEntries,
  taskEntries,
  termEntries,
  type IndexInput,
} from '../../../scripts/search/entries';
import { docFileName, loadIndexInput } from '../../../scripts/search/load';
import type { Block, Doc, Manifest } from '../../../src/lib/content/schema';
import { searchIndexUrl } from '../../../src/lib/search/files';
import { INDEX_VERSION } from '../../../src/lib/search/options';
import { searchElementData, searchStrings } from '../../../src/lib/search/ui-data';
import { realManifest } from '../site/data';

const text = (v: string) => [{ t: 'text' as const, v }];
let n = 0;
const base = () => ({ id: `b-${String(n++)}`, hash: '0000000000000000' });

function heading(id: string, depth: 2 | 3 | 4, extra: Partial<Block> = {}): Block {
  return { ...base(), id, kind: 'heading', depth, text: id, c: text(id), ...extra } as Block;
}

function para(v: string, extra: Partial<Block> = {}): Block {
  return { ...base(), kind: 'paragraph', c: text(v), ...extra } as Block;
}

const manifest = {
  version: 1,
  contentHash: '0000000000000000',
  langs: {},
  sections: [
    {
      id: 'core',
      order: 1,
      route: 'core/',
      titles: { en: 'Core', af: 'Kern' },
      docs: ['core/tax'],
    },
    {
      id: 'lookup',
      order: 2,
      route: 'look-it-up/',
      titles: { en: 'Look it up' },
      docs: ['lookup/glossary'],
    },
  ],
  docs: {
    'core/tax': {
      slug: 'tax',
      route: 'core/tax/',
      section: 'core',
      order: 1,
      kind: 'guide',
      titles: { en: 'Tax' },
      langs: ['en'],
      appliesTo: { entity: 'all', businessTypes: 'all' },
    },
    'lookup/glossary': {
      slug: 'glossary',
      route: 'glossary/',
      section: 'lookup',
      order: 1,
      kind: 'glossary',
      titles: { en: 'Glossary', af: 'Woordelys' },
      langs: ['en'],
      appliesTo: { entity: 'all', businessTypes: 'all' },
    },
  },
} as unknown as Manifest;

const doc = {
  id: 'core/tax',
  lang: 'en',
  section: 'core',
  title: 'Tax',
  appliesTo: { entity: 'all', businessTypes: 'all' },
  terms: [
    { term: 'Turnover', meaning: 'Money in.' },
    { term: 'SBC', meaning: 'Small business corporation.' },
    { term: 'Detail (noun)', meaning: 'A small part.' },
  ],
  headings: [{ id: 'words-used-in-this-file', depth: 2, text: 'Words used' }],
  blocks: [
    para('Intro text with https://www.sars.gov.za in it.'),
    heading('words-used-in-this-file', 2),
    {
      ...base(),
      kind: 'terms',
      intro: text('x'),
      items: [{ term: text('a'), meaning: text('b') }],
    },
    heading('vat', 2, { appliesTo: { entity: 'pty' } }),
    para('VAT text.'),
    heading('vat-detail', 3, { appliesTo: { businessTypes: ['food'] } }),
    para('Detail text.'),
    heading('empty', 2),
    heading('hidden', 2, { hidden: true }),
    para('Hidden text.', { hidden: true }),
    heading('code', 2),
    { ...base(), kind: 'code', variant: 'prompt', text: 'Prompt words' },
    { ...base(), kind: 'code', variant: 'listing', text: 'Listing words' },
    { ...base(), kind: 'list', ordered: false, items: [text('one'), text('two')] },
    { ...base(), kind: 'table', header: [text('H')], rows: [[text('cell')]], align: [null] },
    {
      ...base(),
      kind: 'tasklist',
      group: text('Group'),
      items: [{ id: 'core/tax:00000000', c: text('Task'), doc: 'core/tax', block: 'x' }],
    },
    { ...base(), kind: 'hr' },
  ],
} as unknown as Doc;

const input: IndexInput = {
  lang: 'af',
  manifest,
  docs: [doc],
  glossary: {
    lang: 'en',
    data: {
      lang: 'en',
      doc: 'lookup/glossary',
      groups: [],
      entries: [
        {
          id: 'sbc',
          term: 'SBC',
          definition: text('Small business corporation.'),
          group: 'Tax',
          groupId: 'tax',
        },
      ],
    },
  },
  tasks: {
    lang: 'en',
    data: {
      lang: 'en',
      tasks: [
        {
          id: 'core/tax:00000001',
          c: text('Register for VAT'),
          doc: 'core/tax',
          block: 'x',
          heading: 'vat',
          order: 0,
          group: text('Before you trade'),
          when: { businessTypes: ['beauty'] },
        },
        {
          id: 'core/tax:00000002',
          c: text('Hidden task'),
          doc: 'core/tax',
          block: 'x',
          heading: 'hidden',
          order: 1,
        },
        { id: 'core/tax:00000003', c: text('No heading'), doc: 'core/tax', block: 'x', order: 2 },
        {
          id: 'core/other:00000004',
          c: text('Unknown doc'),
          doc: 'core/other',
          block: 'x',
          order: 3,
        },
      ],
    },
  },
  quickAnswers: {
    lang: 'en',
    data: {
      lang: 'en',
      doc: 'core/tax',
      items: [
        {
          id: 'q1',
          question: text('Do I pay VAT?'),
          targets: [{ t: 'docref', doc: 'core/tax', label: '01-core/03' }],
          note: text('and the glossary'),
        },
        {
          id: 'q2',
          question: text('Only a section?'),
          targets: [{ t: 'docref', section: 'core', label: '01-core/' }],
        },
      ],
    },
  },
};

describe('text helpers', () => {
  it('drops URLs and collapses whitespace', () => {
    expect(cleanText(' a  https://x.org/y \n www.sars.gov.za b ')).toBe('a b');
  });

  it('cuts an excerpt at a word boundary with an ellipsis', () => {
    expect(excerptOf('short')).toBe('short');
    expect(excerptOf('   ')).toBeUndefined();
    expect(excerptOf('one two three four five', 12)).toBe('one two…');
    expect(excerptOf('abcdefghijklmnop', 8)).toBe('abcdefgh…');
  });

  it('searches prose, prompts and tables, not listings or structure', () => {
    const blocks = doc.blocks;
    const textOf = (kind: string, variant?: string) =>
      blockSearchText(
        manifest,
        'en',
        blocks.find(
          (b) =>
            b.kind === kind && (variant === undefined || ('variant' in b && b.variant === variant)),
        )!,
      );
    expect(textOf('code', 'prompt')).toBe('Prompt words');
    expect(textOf('code', 'listing')).toBe('');
    expect(textOf('list')).toBe('one\ntwo');
    expect(textOf('table')).toBe('H\ncell');
    expect(textOf('tasklist')).toBe('Group\nTask');
    expect(textOf('hr')).toBe('');
  });
});

describe('sectionEntries', () => {
  const entries = sectionEntries(input, doc);

  it('makes one entry per part of the page that has text', () => {
    expect(entries.map((e) => e.key)).toEqual([
      'core/tax',
      'core/tax#vat',
      'core/tax#vat-detail',
      'core/tax#code',
    ]);
  });

  it('gives the intro the page title and no anchor, and drops URLs from its text', () => {
    expect(entries[0]).toMatchObject({
      title: 'Tax',
      text: 'Intro text with in it.',
      route: 'core/tax/',
    });
    expect(entries[0]?.anchor).toBeUndefined();
  });

  it('builds the breadcrumb and inherits applicability from the parent heading', () => {
    expect(entries[2]).toMatchObject({
      title: 'vat-detail',
      docTitle: 'Tax › vat',
      path: 'Kern › Tax › vat',
      entity: 'pty',
      businessTypes: ['food'],
      lang: 'en',
      weight: 1,
    });
  });
});

describe('the other kinds', () => {
  it('opens a "Words used" term where the page uses it, else at the word list', () => {
    expect(termEntries(input, doc).map((e) => [e.title, e.anchor, e.docTitle])).toEqual([
      ['Turnover', 'words-used-in-this-file', 'Tax'],
      ['SBC', 'words-used-in-this-file', 'Tax'],
      ['Detail (noun)', 'vat-detail', 'Tax › vat › vat-detail'],
    ]);
    const noList = { ...doc, headings: [] } as unknown as Doc;
    expect(termEntries(input, noList)[0]?.anchor).toBeUndefined();
  });

  it('indexes glossary entries under the glossary page', () => {
    expect(glossaryEntries(input)).toEqual([
      expect.objectContaining({
        key: 'lookup/glossary#sbc',
        route: 'glossary/',
        docTitle: 'Glossary › Tax',
        path: 'Look it up › Glossary › Tax',
        weight: 3,
        lang: 'en',
      }),
    ]);
    expect(glossaryEntries({ ...input, glossary: undefined })).toEqual([]);
  });

  it('indexes checklist items by their heading, with the narrowest applicability', () => {
    const tasks = taskEntries(input, new Map([[doc.id, doc]]));
    expect(tasks.map((t) => t.title)).toEqual(['Register for VAT', 'No heading']);
    expect(tasks[0]).toMatchObject({
      anchor: 'vat',
      docTitle: 'Tax › vat',
      entity: 'pty',
      businessTypes: ['beauty'],
      indexTitle: '',
      text: 'Register for VAT Before you trade',
    });
    expect(tasks[1]?.anchor).toBeUndefined();
    expect(taskEntries({ ...input, tasks: undefined }, new Map())).toEqual([]);
  });

  it('indexes the common questions that point at a page', () => {
    const answers = answerEntries(input);
    expect(answers.map((a) => [a.title, a.doc, a.excerpt])).toEqual([
      ['Do I pay VAT?', 'core/tax', 'and the glossary'],
    ]);
    expect(answerEntries({ ...input, quickAnswers: undefined })).toEqual([]);
  });

  it('leaves out a "Words used" term the glossary already defines', () => {
    const keys = buildEntries(input).map((e) => `${e.kind}:${e.title}`);
    expect(keys).toContain('term:Turnover');
    expect(keys).not.toContain('term:SBC');
    expect(keys).toContain('glossary:SBC');
  });

  it('refuses an entry for a page the manifest does not know', () => {
    const stray = { ...doc, id: 'core/nowhere' } as unknown as Doc;
    expect(() => sectionEntries(input, stray)).toThrow(/core\/nowhere is not in the manifest/);
  });
});

describe('build and load', () => {
  it('names the index file after a hash of its content', () => {
    const built = serialiseIndex('af', ['core'], buildEntries(input));
    expect(built.file).toBe(`af.${contentHash(built.json)}.json`);
    expect(built.file).toMatch(/^af\.[0-9a-f]{10}\.json$/);
    expect(JSON.parse(built.json)).toMatchObject({
      v: INDEX_VERSION,
      lang: 'af',
      sections: ['core'],
    });
  });

  it('stores only the fields an entry has', () => {
    const stored = toIndexedDocument(buildEntries(input)[0]!, 7);
    expect(stored.id).toBe(7);
    expect(Object.values(stored)).not.toContain(undefined);
  });

  it('names a document file as the content build does', () => {
    expect(docFileName('paperwork/templates/invoice')).toBe('paperwork__templates__invoice.json');
  });

  it('loads the Afrikaans input with English fallbacks from a data directory', () => {
    const real = loadIndexInput('af');
    expect(real.docs.length).toBe(Object.keys(real.manifest.docs).length);
    expect(real.glossary?.lang).toBe('en');
  });

  it('fails when a document has no JSON at all', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'st-search-'));
    try {
      writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(realManifest()));
      expect(() => loadIndexInput('en', dir)).toThrow(/has no generated JSON/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('page data', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'st-search-record-'));
  const record = path.join(dir, 'search-index.json');
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("finds a language's index file under the base path, outside the locale prefix", () => {
    writeFileSync(
      record,
      JSON.stringify({ version: INDEX_VERSION, files: { en: 'en.abc.json', af: 'af.def.json' } }),
    );
    expect(searchIndexUrl('af', record, '/business-toolkit/')).toBe(
      '/business-toolkit/search/af.def.json',
    );
    expect(searchIndexUrl('en', record)).toBe('/search/en.abc.json');
  });

  it('says how to fix a missing, stale or incomplete record', () => {
    expect(() => searchIndexUrl('en', path.join(dir, 'missing.json'))).toThrow(/pnpm search:build/);
    writeFileSync(record, JSON.stringify({ version: INDEX_VERSION + 1, files: {} }));
    expect(() => searchIndexUrl('en', record)).toThrow(/version/);
    writeFileSync(record, JSON.stringify({ version: INDEX_VERSION, files: {} }));
    expect(() => searchIndexUrl('en', record)).toThrow(/no en index/);
  });

  it('hands the scripts the search strings, the section names and the URLs', () => {
    writeFileSync(
      record,
      JSON.stringify({ version: INDEX_VERSION, files: { en: 'en.abc.json', af: 'af.def.json' } }),
    );
    const strings = searchStrings('af', realManifest());
    expect(strings.dict.search.dialogTitle).toBe('Soek');
    expect(strings.englishTag).toBe('Engels');
    expect(strings.suggestion).toContain('{title}');
    expect(strings.sections['start']).toBe('Begin hier');
    const data = searchElementData('af', realManifest(), record);
    expect(data).toMatchObject({
      locale: 'af',
      index: '/search/af.def.json',
      page: '/af/search/',
      contents: '/af/contents/',
    });
    expect(JSON.parse(data.strings)).toEqual(JSON.parse(JSON.stringify(strings)));
  });
});
