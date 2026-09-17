import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContent, type BuildResult } from '../../../scripts/content/build';
import { ContentError } from '../../../scripts/content/errors';
import {
  auditDates,
  countContent,
  formatReport,
  formatSummary,
} from '../../../scripts/content/report';
import { stableStringify } from '../../../scripts/content/write';
import type { Doc } from '../../../src/lib/content/schema';
import {
  copyTree,
  corpusDir,
  fixtureConfigPaths,
  fixturesDir,
  removeDir,
  repoRoot,
  tempDir,
} from './helpers';

const dirs: string[] = [];
let first: BuildResult;
/** Afrikaans deliveries add a tree here; the English expectations must not depend on it. */
const afRoot = join(repoRoot, 'docs', 'rsa-business-toolkit-af');

beforeAll(() => {
  first = buildContent({ repoRoot, outDir: tempDir('corpus-out') });
}, 300_000);

afterAll(() => {
  for (const dir of dirs) removeDir(dir);
});

const serialise = (result: BuildResult): string[] =>
  result.files.map((file) => `${file.path}\n${stableStringify(file.data)}`);

/** Structure without prose: ids, kinds, variants, sizes, task ids, applicability and provenance. */
function digest(doc: Doc) {
  return {
    id: doc.id,
    appliesTo: doc.appliesTo,
    generated: doc.generated,
    /** Which register entries and acts the page cites, and how its facts were checked. */
    sources: doc.sources,
    sourceNote: doc.sourceNote ?? null,
    verification: doc.verification,
    related: doc.related,
    terms: doc.terms.map((term) => term.term),
    headings: doc.headings.map((heading) =>
      [
        heading.id,
        heading.depth,
        heading.pseudo ?? false,
        JSON.stringify(heading.appliesTo ?? null),
      ].join(' '),
    ),
    blocks: doc.blocks.map((block) => {
      const size =
        block.kind === 'list' || block.kind === 'tasklist' || block.kind === 'terms'
          ? ` ×${block.items.length}`
          : block.kind === 'table'
            ? ` ${block.rows.length}x${block.header.length}`
            : block.kind === 'code'
              ? ` ${block.variant}`
              : '';
      return `${block.id} ${block.kind}${size}`;
    }),
    tasks: doc.blocks.flatMap((block) =>
      block.kind === 'tasklist'
        ? block.items.map((task) => `${task.id} ${JSON.stringify(task.when ?? null)}`)
        : [],
    ),
  };
}

describe('the real corpus', () => {
  it('builds 36 English documents with the expected counts', () => {
    const counts = countContent(first);
    expect(counts.docsPerSection['en']).toEqual({
      branding: 5,
      'business-types': 7,
      core: 10,
      lookup: 3,
      paperwork: 7,
      start: 4,
    });
    for (const [lang, sections] of Object.entries(counts.docsPerSection)) {
      const total = Object.values(sections).reduce((sum, n) => sum + n, 0);
      if (lang !== 'en') expect(total, lang).toBeLessThanOrEqual(36);
    }
    expect(counts.glossaryEntries).toBe(121);
    expect(counts.glossaryGroups).toBe(7);
    expect(counts.sourceActs).toBe(14);
    expect([
      counts.sourceEntries,
      counts.sourcesWithUrl,
      counts.sourceCitations,
      counts.sourceSubgroups,
    ]).toEqual([105, 101, 4, 7]);
    // The register writes no "what it supports" text for these, so a page omits the label.
    expect(counts.sourcesWithoutSupports).toBe(7);
    expect(counts.fenceVariants).toEqual({
      example: 3,
      listing: 2,
      prompt: 36,
      snippet: 8,
      'template-preview': 5,
    });
    expect(counts.fencesReplaced).toBe(1);
    expect(counts.bareDomains).toHaveLength(14);
    expect(counts.blocksByKind['terms']).toBe(19);
    expect(counts.blocksByKind['callout']).toBe(71);
    expect(first.fences).toHaveLength(55);
    expect(first.langs.find((build) => build.lang === 'en')?.tasks.tasks.length).toBe(counts.tasks);
    expect(formatSummary(first)).toContain('Unclassified fences: 0');
  });

  it('matches the structural digest of 04 Your kind of business/01-vehicle-dealer.md', () => {
    const doc = first.langs
      .find((build) => build.lang === 'en')
      ?.docs.find((candidate) => candidate.id === 'business-types/vehicle-dealer');
    expect(doc && digest(doc)).toMatchSnapshot();
  });

  /**
   * Per-document sources, pinned: an act that merely lists a document under "Where it appears" is not
   * evidence, so deleting the tax guide's register mapping must fail the gate rather than leave it
   * showing two Acts and none of its seven SARS sources.
   */
  it('pins the register entries and acts of documents that cite them', () => {
    const en = first.langs.find((build) => build.lang === 'en');
    const byId = new Map((en?.docs ?? []).map((doc) => [doc.id, doc]));
    expect(byId.get('core/tax-and-sars')?.sources).toEqual({
      entries: [
        'sars--turnover-tax',
        'sars--budget-2026-frequently-asked-questions',
        'sars--what-is-the-new-threshold-for-vat-registration',
        'sars--tax-calendar',
        'sars--guide-to-provisional-tax',
        'xero-za-sars-tax-tables-20262027',
        'sait-turnover-tax-vs-sbc',
      ],
      acts: ['income-tax-act-58-of-1962', 'value-added-tax-act-89-of-1991'],
    });
    expect(byId.get('paperwork/templates/privacy-notice')?.sources.acts).toEqual([
      'protection-of-personal-information-act-4-of-2013',
    ]);
    expect(byId.get('paperwork/templates/tax-invoice')?.sources.acts).toEqual([
      'value-added-tax-act-89-of-1991',
    ]);
    expect(byId.get('paperwork/free-tools')?.sources.acts).toEqual([
      'electronic-communications-and-transactions-act-25-of-2002',
    ]);
    expect(byId.get('core/adding-new-lines')?.sources.acts).toEqual([
      'companies-act-71-of-2008',
      'consumer-protection-act-68-of-2008',
    ]);
    expect(byId.get('branding/already-have-your-name')?.sources.acts).toEqual([
      'companies-act-71-of-2008',
    ]);
    // Pages that cite an Act by section list it (pass-3 m2).
    expect(byId.get('core/running-a-pty-ltd')?.sources.acts).toEqual(['companies-act-71-of-2008']);
    expect(byId.get('paperwork/which-template-to-use-when')?.sources.acts).toEqual([
      'value-added-tax-act-89-of-1991',
      'companies-act-71-of-2008',
      'consumer-protection-act-68-of-2008',
      'electronic-communications-and-transactions-act-25-of-2002',
      'protection-of-personal-information-act-4-of-2013',
    ]);
    expect(byId.get('business-types/vehicle-dealer')?.sources.acts).toContain(
      'income-tax-act-58-of-1962',
    );
    expect(byId.get('business-types/services-trades')?.sources.entries).toContain(
      'consumer-goods-and-services-ombud--advisory-note-1-implied-warranty-of-quality',
    );
    const required = (doc: Doc): boolean =>
      ['guide', 'template', 'checklist'].includes(doc.kind) &&
      ['core', 'branding', 'paperwork', 'business-types', 'lookup'].includes(doc.section);
    // Only a deliberate act mapping, with a reason, lets a document list no register entry.
    expect(
      (en?.docs ?? [])
        .filter((doc) => required(doc) && doc.sources.entries.length === 0 && !doc.sourceNote)
        .map((doc) => doc.id),
    ).toEqual(['paperwork/templates/quotation']);
  });

  it('is deterministic: a second build is byte-identical', () => {
    const second = buildContent({ repoRoot, outDir: tempDir('corpus-out-2') });
    expect(serialise(second)).toEqual(serialise(first));
  }, 300_000);

  it('produces identical output from CRLF sources', () => {
    const crlf = copyTree(corpusDir, 'crlf');
    dirs.push(crlf);
    for (const entry of readdirSync(crlf, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const path = join(entry.parentPath, entry.name);
      writeFileSync(path, readFileSync(path, 'utf8').replace(/\n/g, '\r\n'));
    }
    const result = buildContent({
      repoRoot,
      sourceRoots: { en: crlf },
      outDir: tempDir('crlf-out'),
    });
    expect(serialise(result)).toEqual(serialise(first));
  }, 300_000);

  it('prints the fence, legacy-ref, applicability and date reports', () => {
    const report = formatReport(first);
    expect(report).toContain('== Fence classification (55) ==');
    expect(report).toContain('| 02-branding-and-marketing/01a | branding/mood-and-materials');
    expect(report).toMatch(/== Applicability \(\d+\) ==/);
    expect(report).toMatch(/\| lookup\/checklist +\| row +\|/);
    expect(report).toMatch(/== Date tokens \(en\): \d+ in \d+ docs ==/);
    if (existsSync(afRoot)) {
      expect(first.missingRoots).toEqual([]);
      expect(first.langs.map((build) => build.lang)).toContain('af');
    } else {
      expect(first.missingRoots).toEqual([{ lang: 'af', root: afRoot }]);
    }
  });

  it('never counts the verb "may" as a date and lists the months it leaves alone', () => {
    const rows = auditDates(first);
    const tokens = rows.flatMap((row) => row.audit.tokens);
    expect(tokens.some((token) => /^may$/i.test(token.text))).toBe(false);
    expect(tokens.filter((token) => token.value === 'May')).toEqual([]);
    expect(
      rows.flatMap((row) =>
        row.audit.skipped.map((skip) => `${row.doc}:${row.block}:${skip.word}`),
      ),
    ).toEqual([
      'core/register:how-to-register-a-company-yourself.5:February',
      'lookup/sources:tax-and-sars.12:February',
    ]);
    expect(
      rows.flatMap((row) => row.audit.otherCase).filter((word) => word === 'may').length,
    ).toBeGreaterThan(100);
  });
});

describe('discovery errors', () => {
  it('fails on an unlisted markdown file and on a listed file that is missing', () => {
    const copy = copyTree(corpusDir, 'unlisted');
    dirs.push(copy);
    writeFileSync(join(copy, '01 Core - applies to everyone', '11-new-doc.md'), '# New\n');
    writeFileSync(join(copy, 'TRANSLATION-NOTES.md'), '# Notes\n');
    rmSync(join(copy, '05 Look it up', '01-glossary.md'));
    let error: unknown;
    try {
      buildContent({ repoRoot, sourceRoots: { en: copy }, outDir: tempDir('unlisted-out') });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ContentError);
    expect((error as ContentError).issues.map((issue) => issue.code)).toEqual([
      'unlisted-source',
      'missing-source',
    ]);
  }, 300_000);

  it('reports a taxonomy that does not match the corpus', () => {
    // The fixture corpus has none of the six business-type documents and no effort table, so the
    // taxonomy check must say so instead of building a site whose wizard points nowhere.
    let error: unknown;
    try {
      buildContent({
        repoRoot,
        configPaths: fixtureConfigPaths(),
        sourceRoots: { en: join(fixturesDir, 'en'), af: join(fixturesDir, 'af') },
        outDir: tempDir('taxonomy-out'),
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ContentError);
    const issues = (error as ContentError).issues;
    expect(new Set(issues.map((issue) => issue.code))).toEqual(new Set(['taxonomy']));
    expect(issues.map((issue) => issue.message)).toContain(
      'business type vehicle-dealer: doc business-types/vehicle-dealer does not exist',
    );
    expect(issues.map((issue) => issue.message).at(-1)).toMatch(
      /no document has the effort table heading/,
    );
  });

  it('fails without an English source root', () => {
    expect(() =>
      buildContent({ repoRoot, sourceRoots: { en: join(repoRoot, 'no-such-root') } }),
    ).toThrow(/English source root not found/);
  });
});
