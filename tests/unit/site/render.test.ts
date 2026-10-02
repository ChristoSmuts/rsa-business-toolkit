import { describe, expect, it } from 'vitest';
import {
  actsFor,
  alignClass,
  glossaryGroupEntries,
  glossaryGroupTitle,
  headingTag,
  headingTags,
  isRedundantRule,
  nearestHeadingText,
  normaliseText,
  isOfficialUrl,
  officialUrlKey,
  officialUrls,
  placeholderLabel,
  placeholdersFound,
  plainText,
  sourceEntriesFor,
  splitTermsBlocks,
  TERMS_HEADING_ID,
  splitPlaceholders,
  tableColumnCount,
  tableIsWide,
  WIDE_TABLE_COLUMNS,
} from '../../../src/lib/content/render';
import type { Block, InlineRun, PlaceholderRun } from '../../../src/lib/content/schema';
import { realDocs, realGlossary, realSources } from './data';

const hash = '0123456789abcdef';

function paragraph(id: string, c: InlineRun[]): Block {
  return { id, hash, kind: 'paragraph', c };
}

function heading(id: string, text: string): Block {
  return { id, hash, kind: 'heading', depth: 2, text, c: [{ t: 'text', v: text }] };
}

const placeholder = (v: string): PlaceholderRun => ({ t: 'placeholder', v, style: 'field' });

describe('plainText', () => {
  it('reads every inline kind the schema allows', () => {
    const runs: InlineRun[] = [
      { t: 'text', v: 'Pay ' },
      { t: 'strong', c: [{ t: 'text', v: 'R 2 300 000' }] },
      { t: 'text', v: ' or ' },
      { t: 'em', c: [{ t: 'text', v: 'less' }] },
      { t: 'text', v: ', see ' },
      { t: 'code', v: 'IT14' },
      { t: 'text', v: ' and ' },
      { t: 'link', doc: 'core/register', c: [{ t: 'text', v: 'Register' }] },
      { t: 'text', v: ', ' },
      { t: 'link', href: 'https://sars.gov.za', external: true, c: [{ t: 'text', v: 'SARS' }] },
      { t: 'text', v: '. ' },
      { t: 'docref', doc: 'core/tax-and-sars', label: '01-core/03' },
      { t: 'br' },
      placeholder('NAME'),
      { t: 'sigline' },
    ];
    expect(plainText(runs)).toBe(
      'Pay R 2 300 000 or less, see IT14 and Register, SARS. 01-core/03\n[NAME]',
    );
  });

  it('is empty for no runs', () => {
    expect(plainText(undefined)).toBe('');
    expect(plainText([])).toBe('');
  });
});

describe('normaliseText', () => {
  it('collapses runs of whitespace and trims', () => {
    expect(normaliseText('  a \n  b\t c ')).toBe('a b c');
  });
});

describe('placeholders', () => {
  it('puts the brackets back, because that is how a template is written and copied', () => {
    expect(placeholderLabel({ v: 'YOUR BUSINESS NAME' })).toBe('[YOUR BUSINESS NAME]');
  });

  it('splits a fenced block into text and its recorded placeholders', () => {
    const segments = splitPlaceholders('Hello [NAME], from [TOWN].', [
      placeholder('NAME'),
      placeholder('TOWN'),
    ]);
    expect(segments).toEqual([
      { kind: 'text', value: 'Hello ' },
      { kind: 'placeholder', run: placeholder('NAME'), value: '[NAME]' },
      { kind: 'text', value: ', from ' },
      { kind: 'placeholder', run: placeholder('TOWN'), value: '[TOWN]' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('matches each placeholder after the previous one, so a repeated blank is not doubled up', () => {
    const segments = splitPlaceholders('[X] then [X]', [placeholder('X'), placeholder('X')]);
    expect(segments.filter((segment) => segment.kind === 'placeholder')).toHaveLength(2);
    expect(segments.map((segment) => segment.value).join('')).toBe('[X] then [X]');
  });

  it('keeps the text when a recorded placeholder is not in it', () => {
    const segments = splitPlaceholders('No blanks here.', [placeholder('GONE')]);
    expect(segments).toEqual([{ kind: 'text', value: 'No blanks here.' }]);
    expect(placeholdersFound('No blanks here.', [placeholder('GONE')])).toBe(0);
  });

  it('has no placeholders when none were recorded', () => {
    expect(splitPlaceholders('plain text')).toEqual([{ kind: 'text', value: 'plain text' }]);
  });

  it('finds every placeholder of every fenced block in the corpus, losing no text', () => {
    const problems: string[] = [];
    for (const doc of realDocs()) {
      for (const block of doc.blocks) {
        if (block.kind !== 'code' || !block.placeholders) continue;
        const segments = splitPlaceholders(block.text, block.placeholders);
        const found = segments.filter((segment) => segment.kind === 'placeholder').length;
        if (found !== block.placeholders.length) {
          problems.push(`${doc.id} ${block.id}: found ${found} of ${block.placeholders.length}`);
        }
        const rejoined = segments.map((segment) => segment.value).join('');
        if (rejoined !== block.text) problems.push(`${doc.id} ${block.id}: text changed`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('tables', () => {
  const table = (columns: number): Block => ({
    id: 't',
    hash,
    kind: 'table',
    header: Array.from({ length: columns }, (_, i) => [{ t: 'text', v: `h${i}` }] as InlineRun[]),
    rows: [],
    align: Array.from({ length: columns }, () => null),
  });

  it('counts columns', () => {
    expect(tableColumnCount(table(3) as Extract<Block, { kind: 'table' }>)).toBe(3);
  });

  it('stacks from five columns, which is the design system rule', () => {
    expect(WIDE_TABLE_COLUMNS).toBe(5);
    expect(tableIsWide(table(4) as Extract<Block, { kind: 'table' }>)).toBe(false);
    expect(tableIsWide(table(5) as Extract<Block, { kind: 'table' }>)).toBe(true);
  });

  it('maps alignment to a cell class, with no class for the default', () => {
    expect(alignClass('left')).toBeUndefined();
    expect(alignClass(null)).toBeUndefined();
    expect(alignClass(undefined)).toBeUndefined();
    expect(alignClass('center')).toBe('st-cell-center');
    expect(alignClass('right')).toBe('st-cell-end');
  });
});

describe('thematic breaks', () => {
  const blocks: Block[] = [
    paragraph('a.1', [{ t: 'text', v: 'a' }]),
    { id: 'a.2', hash, kind: 'hr' },
    heading('b', 'B'),
    paragraph('b.1', [{ t: 'text', v: 'b' }]),
    { id: 'b.2', hash, kind: 'hr' },
    paragraph('b.3', [{ t: 'text', v: 'c' }]),
  ];

  it('drops a rule that only repeats the heading below it', () => {
    expect(isRedundantRule(blocks, 1)).toBe(true);
  });

  it('keeps a rule that separates content inside a section', () => {
    expect(isRedundantRule(blocks, 4)).toBe(false);
  });

  it('is false for anything that is not a rule, and at the end of a document', () => {
    expect(isRedundantRule(blocks, 0)).toBe(false);
    expect(isRedundantRule([{ id: 'x', hash, kind: 'hr' }], 0)).toBe(false);
    expect(isRedundantRule(blocks, 99)).toBe(false);
  });

  it('leaves most of the corpus rules out, and keeps the ones between paragraphs', () => {
    let dropped = 0;
    let kept = 0;
    for (const doc of realDocs()) {
      doc.blocks.forEach((block, index) => {
        if (block.kind !== 'hr') return;
        if (isRedundantRule(doc.blocks, index)) dropped += 1;
        else kept += 1;
      });
    }
    expect(dropped).toBeGreaterThan(kept);
    expect(kept).toBeGreaterThan(0);
  });
});

describe('nearestHeadingText', () => {
  const blocks: Block[] = [
    paragraph('intro.1', [{ t: 'text', v: 'x' }]),
    heading('what-you-need', 'What you need'),
    paragraph('what-you-need.1', [{ t: 'text', v: 'y' }]),
  ];

  it('finds the heading a block sits under', () => {
    expect(nearestHeadingText(blocks, 2)).toBe('What you need');
    expect(nearestHeadingText(blocks, 1)).toBe('What you need');
  });

  it('is undefined before the first heading', () => {
    expect(nearestHeadingText(blocks, 0)).toBeUndefined();
  });

  it('clamps an index past the end instead of reading undefined', () => {
    expect(nearestHeadingText(blocks, 99)).toBe('What you need');
  });
});

describe('headingTag', () => {
  it('keeps the level of a real heading', () => {
    expect(headingTag(2)).toBe('h2');
    expect(headingTag(3)).toBe('h3');
    expect(headingTag(3, 1)).toBe('h3');
  });

  it('places a pseudo heading one level under the heading above it, never skipping', () => {
    expect(headingTag(4, 3)).toBe('h4');
    expect(headingTag(4, 2)).toBe('h3');
    expect(headingTag(4, 1)).toBe('h2');
  });
});

describe('headingTags', () => {
  const pseudo = (id: string): Block => ({
    id,
    hash,
    kind: 'heading',
    depth: 4,
    pseudo: true,
    c: [],
    text: id,
  });
  const real = (id: string, depth: 2 | 3): Block => ({
    id,
    hash,
    kind: 'heading',
    depth,
    c: [],
    text: id,
  });

  it('makes pseudo headings siblings under the last real heading', () => {
    const blocks = [
      real('a', 2),
      pseudo('b'),
      pseudo('c'),
      real('d', 3),
      pseudo('e'),
      paragraph('p', []),
    ];
    expect(headingTags(blocks)).toEqual(['h2', 'h3', 'h3', 'h3', 'h4', undefined]);
  });

  it('never skips a heading level anywhere in the corpus', () => {
    const skips: string[] = [];
    for (const doc of realDocs()) {
      let level = 1;
      headingTags(doc.blocks).forEach((tag, index) => {
        if (tag === undefined) return;
        const next = Number(tag.slice(1));
        if (next > level + 1)
          skips.push(`${doc.id}#${doc.blocks[index]?.id ?? ''}: h${level} to ${tag}`);
        level = next;
      });
    }
    expect(skips).toEqual([]);
  });
});

describe('sources and glossary lookups', () => {
  const sources = realSources();

  it('collects every official URL and no unofficial one', () => {
    const urls = officialUrls(sources);
    const official = sources.entries.filter((entry) => entry.official);
    for (const entry of official) {
      for (const url of entry.urls) expect(isOfficialUrl(urls, url)).toBe(true);
    }
    for (const entry of sources.entries) {
      if (entry.official || entry.url === undefined) continue;
      const key = officialUrlKey(entry.url);
      const alsoOfficial = official.some((other) =>
        other.urls.some((url) => officialUrlKey(url) === key),
      );
      if (!alsoOfficial) expect(isOfficialUrl(urls, entry.url)).toBe(false);
    }
  });

  it('matches an official URL however the guide spells its host and trailing slash', () => {
    const urls = officialUrls(sources);
    // The three spellings review pass 1 found in the corpus without their badge.
    expect(isOfficialUrl(urls, 'https://inforegulator.org.za')).toBe(true);
    expect(isOfficialUrl(urls, 'https://www.gov.za')).toBe(true);
    expect(isOfficialUrl(urls, 'https://www.cipc.co.za')).toBe(true);
    expect(officialUrlKey('https://WWW.Example.org/a/b/?q=1')).toBe('example.org/a/b?q=1');
    expect(isOfficialUrl(urls, 'https://www.cipc.co.za.evil.example/')).toBe(false);
  });

  it('is empty without a register', () => {
    expect(officialUrls(undefined).size).toBe(0);
    expect(sourceEntriesFor(undefined, ['x'])).toEqual([]);
    expect(actsFor(undefined, ['x'])).toEqual([]);
    expect(glossaryGroupEntries(undefined, 'x')).toEqual([]);
    expect(glossaryGroupTitle(undefined, 'x')).toBeUndefined();
  });

  it('returns entries in register order and drops ids it does not know', () => {
    const ids = sources.entries.slice(0, 3).map((entry) => entry.id);
    const picked = sourceEntriesFor(sources, [...ids].reverse().concat('not-a-source'));
    expect(picked.map((entry) => entry.id)).toEqual(ids);
  });

  it('returns the acts a document maps to', () => {
    const act = sources.acts[0];
    expect(act).toBeDefined();
    expect(actsFor(sources, [act?.id ?? '']).map((entry) => entry.id)).toEqual([act?.id]);
  });

  it('groups glossary entries by their group id', () => {
    const glossary = realGlossary();
    const group = glossary.groups[0];
    expect(group).toBeDefined();
    const entries = glossaryGroupEntries(glossary, group?.id ?? '');
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(entry.groupId).toBe(group?.id);
    expect(glossaryGroupTitle(glossary, group?.id ?? '')).toBe(group?.title);
  });
});

describe('splitTermsBlocks', () => {
  it('lifts "Words used in this file" out of the flow exactly once, keeping every other block', () => {
    for (const doc of realDocs()) {
      const { terms, rest } = splitTermsBlocks(doc.blocks);
      const termsInFlow = doc.blocks.filter((block) => block.kind === 'terms');
      if (terms === undefined) {
        expect(rest, doc.id).toBe(doc.blocks);
        continue;
      }
      expect(rest.some((block) => block.kind === 'heading' && block.id === TERMS_HEADING_ID)).toBe(
        false,
      );
      expect(rest.filter((block) => block.kind === 'terms')).toHaveLength(termsInFlow.length - 1);
      expect(doc.blocks.length - rest.length, doc.id).toBeGreaterThanOrEqual(2);
      expect(doc.blocks.length - rest.length, doc.id).toBeLessThanOrEqual(3);
    }
  });

  it('leaves a document without that heading unchanged', () => {
    const blocks = [paragraph('a', [])];
    expect(splitTermsBlocks(blocks)).toEqual({ terms: undefined, rest: blocks });
  });
});
