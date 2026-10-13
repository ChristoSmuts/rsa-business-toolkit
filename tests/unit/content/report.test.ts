/**
 * `report.ts` on small hand-made build results. The real corpus (`corpus.test.ts`) always has an
 * English build, a register, fences replaced and bare domains, so the report's other branches were
 * never taken there: no English build, empty sections, the per-language lines and the sort of the
 * legacy table (review WP-10 pass 3, m1).
 */
import { describe, expect, it } from 'vitest';
import type { BuildResult, LangBuild } from '../../../scripts/content/build';
import type { ContentConfig } from '../../../scripts/content/config';
import {
  auditDates,
  countContent,
  formatReport,
  formatSourcesTable,
  formatSummary,
  sourcesWithoutSupports,
  unmappedActMentions,
} from '../../../scripts/content/report';

const config = { markers: { en: {} } } as unknown as ContentConfig;

function result(overrides: Partial<BuildResult> = {}): BuildResult {
  return {
    config,
    outDir: '/out',
    files: [],
    managedPrefixes: [],
    langs: [],
    findings: [],
    applicability: [],
    missingRoots: [],
    fences: [],
    legacy: [],
    links: [],
    externalLinks: [],
    bareDomains: [],
    ...overrides,
  };
}

function lang(code: 'en' | 'af', overrides: Partial<LangBuild> = {}): LangBuild {
  return {
    lang: code,
    parsed: [],
    docs: [],
    skipped: [],
    fallback: [],
    tasks: { tasks: [] },
    ...overrides,
  } as LangBuild;
}

const paragraph = (id: string, text: string) => ({
  id,
  kind: 'paragraph',
  c: [{ t: 'text', v: text }],
});

const doc = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  section: id.split('/')[0],
  blocks: [],
  sources: { entries: [], acts: [] },
  ...overrides,
});

describe('the content report with no English build', () => {
  const empty = result({ missingRoots: [{ lang: 'af', root: '/nowhere' }] });

  it('counts nothing', () => {
    expect(countContent(empty)).toEqual({
      docsPerSection: {},
      blocksByKind: {},
      tasks: 0,
      glossaryEntries: 0,
      glossaryGroups: 0,
      sourceEntries: 0,
      sourcesWithUrl: 0,
      sourceCitations: 0,
      sourceSubgroups: 0,
      sourceActs: 0,
      sourcesWithoutSupports: 0,
      placeholders: { inline: 0, fence: 0 },
      fenceVariants: {},
      fencesReplaced: 0,
      legacyRefsResolved: 0,
      internalLinksResolved: 0,
      externalLinks: 0,
      bareDomains: [],
    });
    expect(auditDates(empty)).toEqual([]);
    expect(sourcesWithoutSupports(empty)).toEqual([]);
    expect(unmappedActMentions(empty)).toEqual([]);
  });

  it('says "none" for each empty section and names a missing source tree', () => {
    const summary = formatSummary(empty);
    expect(summary).toContain('Bare domains linked: none');
    expect(summary).toContain('Fence variants: \n');
    expect(summary).not.toContain('replaced by a table of contents');
    expect(summary).toContain('af: no source tree at /nowhere (skipped)');
    const report = formatReport(empty);
    expect(report).toContain(
      '== Register entries without "what it supports" text (en): 0 ==\n(none)',
    );
    expect(report).toContain(
      "== Acts named in a document's text but not in its sources.acts (en): 0 ==\n(none)",
    );
    expect(report).toContain('== Capitalised month names not counted as dates (en): 0 ==\n(none)');
    expect(report).toContain('== Month words in another case, never dates (en) ==\n(none)');
    expect(formatSourcesTable(empty)).toContain('| doc | entries | official | acts | note |');
  });
});

describe('the content report on a small build', () => {
  const en = lang('en', {
    docs: [
      doc('core/a', {
        blocks: [
          paragraph('p1', 'Read the Companies Act first.'),
          {
            id: 'c1',
            kind: 'code',
            variant: 'prompt',
            text: '[NAME]',
            placeholders: [{ t: 'placeholder', v: '[NAME]' }],
          },
        ],
        sources: { entries: ['web-1', 'cite-1'], acts: [] },
      }),
      doc('start/b', {
        blocks: [paragraph('p2', 'The Companies Act is listed here.')],
        sources: { entries: [], acts: ['companies-act'] },
        sourceNote: { see: ['core/a'] },
      }),
    ] as unknown as LangBuild['docs'],
    sources: {
      entries: [
        { id: 'web-1', type: 'web', official: true, supports: 'x' },
        { id: 'cite-1', type: 'citation', official: false },
      ],
      groups: [{ subgroups: [{}, {}] }, { subgroups: [{}] }],
      acts: [{ id: 'companies-act', name: 'Companies Act 71 of 2008' }],
    } as unknown as LangBuild['sources'],
    glossary: { entries: [{}, {}], groups: [{}] } as unknown as LangBuild['glossary'],
  });
  const af = lang('af', {
    docs: [doc('core/a')] as unknown as LangBuild['docs'],
    skipped: ['core/x'],
    fallback: ['start/b'],
  });
  const small = result({
    langs: [en, af],
    fences: [
      { doc: 'core/a', block: 'c1', variant: 'prompt', rule: 'r', lines: 1, firstLine: '[NAME]' },
      { doc: 'core/a', block: 'c2', variant: 'tree', rule: 't', lines: 9, firstLine: 'x/' },
    ] as unknown as BuildResult['fences'],
    legacy: [
      { code: 'B2', target: 'core/b' },
      { code: 'A1', target: 'core/z' },
      { code: 'A1', target: 'core/a' },
      { code: 'A1', target: 'core/a' },
    ] as unknown as BuildResult['legacy'],
    bareDomains: ['sars.gov.za', 'cipc.co.za', 'sars.gov.za'],
  });

  it('counts the blocks, placeholders, register and acts', () => {
    const counts = countContent(small);
    expect(counts.docsPerSection).toEqual({ en: { core: 1, start: 1 }, af: { core: 1 } });
    expect(counts.blocksByKind).toEqual({ code: 1, paragraph: 2 });
    expect(counts.placeholders).toEqual({ inline: 0, fence: 1 });
    expect(counts.sourceEntries).toBe(2);
    expect(counts.sourcesWithUrl).toBe(1);
    expect(counts.sourceCitations).toBe(1);
    expect(counts.sourceSubgroups).toBe(3);
    expect(counts.sourceActs).toBe(1);
    expect(counts.sourcesWithoutSupports).toBe(1);
    expect(counts.glossaryEntries).toBe(2);
    expect(counts.glossaryGroups).toBe(1);
    expect(counts.fencesReplaced).toBe(1);
    expect(counts.bareDomains).toEqual(['cipc.co.za', 'sars.gov.za']);
  });

  it('writes the per-language lines, the replaced fences and the sorted legacy table', () => {
    const summary = formatSummary(small);
    expect(summary).toContain('(+1 replaced by a table of contents)');
    expect(summary).toContain('af: 1 docs built, 1 skipped (no source), 1 English fallbacks');
    expect(summary).toContain('Bare domains linked: cipc.co.za, sars.gov.za');
    const report = formatReport(small);
    const legacy = report.slice(
      report.indexOf('== Legacy refs'),
      report.indexOf('== Applicability'),
    );
    expect(legacy.split('\n').filter((line) => /^\| [AB]\d/.test(line))).toEqual([
      '| A1   | core/a      | 2    |',
      '| A1   | core/z      | 1    |',
      '| B2   | core/b      | 1    |',
    ]);
  });

  it('lists entries without "what it supports" text and acts named but not listed', () => {
    expect(sourcesWithoutSupports(small)).toEqual(['cite-1']);
    // `start/b` lists the act, so only `core/a` is reported, by its short title.
    expect(unmappedActMentions(small)).toEqual([['core/a', 'companies-act', 'Companies Act']]);
    const table = formatSourcesTable(small);
    expect(table).toMatch(/\| core\/a\s+\| 2\s+\| 1\s+\| 0\s+\|\s+\|/);
    expect(table).toMatch(/\| start\/b\s+\| 0\s+\| 0\s+\| 1\s+\| note → core\/a \|/);
    const report = formatReport(small);
    expect(report).toContain('(en): 1 ==\ncite-1');
    expect(report).toMatch(/\| core\/a \| companies-act \| Companies Act \|/);
  });
});
