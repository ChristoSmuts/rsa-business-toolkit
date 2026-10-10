import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { computeContentHash, displayPath } from '../../../scripts/content/build';
import { defaultConfigPaths, loadConfig, markersFor } from '../../../scripts/content/config';
import { ContentError, IssueCollector, formatIssue } from '../../../scripts/content/errors';
import { docFileName, shortHash, slug } from '../../../scripts/content/ids';
import {
  computeRelated,
  deriveSummary,
  readingTime,
  truncateSummary,
} from '../../../scripts/content/meta';
import { formatTable } from '../../../scripts/content/report';
import {
  assertSafeOutDir,
  byCodeUnit,
  diffOutputs,
  managedFiles,
  stableStringify,
  writeOutputs,
} from '../../../scripts/content/write';
import type { Block } from '../../../src/lib/content/schema';
import { metaDir, parseMd, realConfig, realEntry, removeDir, repoRoot, tempDir } from './helpers';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) removeDir(dir);
});

describe('deterministic writer', () => {
  it('sorts keys, indents by two spaces and ends with one LF', () => {
    expect(stableStringify({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: undefined } })).toBe(
      '{\n  "a": {\n    "d": [\n      3,\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}\n',
    );
    expect(() => stableStringify(undefined)).toThrow();
  });

  it('writes only changed files, removes stale managed files and diffs without writing', () => {
    const out = tempDir('write');
    dirs.push(out);
    mkdirSync(join(out, 'en', 'docs'), { recursive: true });
    writeFileSync(join(out, 'en', 'docs', 'stale.json'), '{}\n');
    writeFileSync(join(out, 'other.json'), '{}\n');
    // An earlier build's manifest marks the folder as this pipeline's to write into.
    writeFileSync(join(out, 'manifest.json'), '{"version":1}\n');
    const files = [
      { path: 'en/docs/a.json', data: { a: 1 } },
      // A real manifest carries `version: 1`, which is what marks the folder as ours to write into.
      { path: 'manifest.json', data: { version: 1 } },
    ];
    expect(diffOutputs(out, files, ['en/', 'manifest.json'])).toEqual({
      changed: ['manifest.json'],
      missing: ['en/docs/a.json'],
      extra: ['en/docs/stale.json'],
    });
    expect(writeOutputs(out, files, ['en/', 'manifest.json'])).toEqual({
      written: ['en/docs/a.json', 'manifest.json'],
      removed: ['en/docs/stale.json'],
    });
    expect(existsSync(join(out, 'other.json'))).toBe(true);
    expect(writeOutputs(out, files, ['en/', 'manifest.json'])).toEqual({
      written: [],
      removed: [],
    });
    writeFileSync(join(out, 'manifest.json'), '{"version":1,"changed":true}');
    expect(diffOutputs(out, files, ['en/', 'manifest.json'])).toEqual({
      changed: ['manifest.json'],
      missing: [],
      extra: [],
    });
    expect(readFileSync(join(out, 'en', 'docs', 'a.json'), 'utf8')).toBe('{\n  "a": 1\n}\n');
  });

  it('refuses to write into a folder that is not a content output folder', () => {
    const out = tempDir('write-guard');
    dirs.push(out);
    const files = [{ path: 'en/docs/a.json', data: { a: 1 } }];
    // Empty is fine: a fresh --out folder.
    expect(() => writeOutputs(out, files, ['en/', 'manifest.json'])).not.toThrow();

    const foreign = tempDir('write-foreign');
    dirs.push(foreign);
    mkdirSync(join(foreign, 'en', 'docs'), { recursive: true });
    writeFileSync(join(foreign, 'en', 'docs', 'precious.json'), '{"keep":true}\n');
    writeFileSync(join(foreign, 'manifest.json'), '{"name":"someone else"}\n');
    expect(() => assertSafeOutDir(foreign)).toThrow(/not a content output folder/);
    expect(() => writeOutputs(foreign, files, ['en/', 'manifest.json'])).toThrow(
      /not a content output folder/,
    );
    expect(existsSync(join(foreign, 'en', 'docs', 'precious.json'))).toBe(true);
  });
});

describe('locale-independent ordering', () => {
  const paths = [
    'en/docs/core__y.json',
    'en/docs/core__j.json',
    'en/docs/Core__a.json',
    'af/tasks.json',
    'nso/tasks.json',
    'en/docs/core__register-2.json',
    'en/docs/core__register.json',
  ];
  const files = paths.map((path, index) => ({ path, data: { index, Ä: 1, a: 2, Z: 3 } }));

  function observe() {
    const out = tempDir('locale');
    dirs.push(out);
    return {
      hash: computeContentHash(files),
      written: writeOutputs(out, files, ['en/', 'af/', 'nso/']).written,
      managed: managedFiles(out, ['en/', 'af/', 'nso/']),
      diff: diffOutputs(out, files.slice(1), ['en/', 'af/', 'nso/']),
      json: stableStringify(files[0]?.data),
      sorted: [...paths].sort(byCodeUnit),
    };
  }

  it('hashes, writes and lists in the same order when the host collation is Lithuanian', () => {
    const baseline = observe();
    const lithuanian = new Intl.Collator('lt');
    const originalCompare = String.prototype.localeCompare;
    const OriginalCollator = Intl.Collator;
    String.prototype.localeCompare = function (this: string, other: string): number {
      return lithuanian.compare(this, other);
    } as typeof originalCompare;
    Intl.Collator = function () {
      return lithuanian;
    } as unknown as typeof Intl.Collator;
    try {
      // The patch really changes any collation-based sort of these paths.
      expect([...paths].sort((a, b) => a.localeCompare(b))).not.toEqual(baseline.sorted);
      expect(observe()).toEqual(baseline);
    } finally {
      String.prototype.localeCompare = originalCompare;
      Intl.Collator = OriginalCollator;
    }
    expect(baseline.sorted).toEqual([
      'af/tasks.json',
      'en/docs/Core__a.json',
      'en/docs/core__j.json',
      'en/docs/core__register-2.json',
      'en/docs/core__register.json',
      'en/docs/core__y.json',
      'nso/tasks.json',
    ]);
    expect(byCodeUnit('a', 'a')).toBe(0);
  });
});

describe('ids and hashes', () => {
  it('hashes to 16 hex characters and slugs like GitHub', () => {
    expect(shortHash('x')).toMatch(/^[0-9a-f]{16}$/);
    expect(slug('Change 3: missing entry document in the Core folder (fix)')).toBe(
      'change-3-missing-entry-document-in-the-core-folder-fix',
    );
    expect(slug('SARS — Turnover Tax')).toBe('sars--turnover-tax');
    expect(docFileName('paperwork/templates/quotation')).toBe(
      'paperwork__templates__quotation.json',
    );
  });
});

describe('doc metadata', () => {
  it('truncates summaries at a sentence or a word boundary', () => {
    const long = `${'Word '.repeat(30)}ends here. ${'More words follow '.repeat(10)}`;
    expect(truncateSummary(long)).toBe(`${'Word '.repeat(30)}ends here.`);
    const noSentence = 'Alpha, '.repeat(40);
    const cut = truncateSummary(noSentence);
    expect(cut.length).toBeLessThanOrEqual(200);
    expect(cut.endsWith('…')).toBe(true);
    expect(truncateSummary('Short.')).toBe('Short.');
  });

  it('derives the summary from the first visible paragraph or note', () => {
    const blocks: Block[] = [
      { id: 'a', hash: '0000000000000000', kind: 'heading', depth: 2, text: 'A', c: [] },
      {
        id: 'a.1',
        hash: '0000000000000000',
        kind: 'paragraph',
        hidden: true,
        c: [{ t: 'text', v: 'Hidden.' }],
      },
      {
        id: 'a.2',
        hash: '0000000000000000',
        kind: 'note',
        c: [{ t: 'text', v: 'Visible   note.' }],
      },
    ];
    expect(deriveSummary(blocks)).toBe('Visible note.');
    expect(deriveSummary([])).toBeUndefined();
    expect(readingTime('Title', blocks)).toBe(1);
  });

  // WP-50a, item 10: "Lees eers 01-core/. …" was the lead of six Afrikaans business-type pages.
  it('skips a paragraph that points to another document or names a raw folder or file', () => {
    const paragraph = (id: string, c: unknown): Block =>
      ({ id, hash: '0000000000000000', kind: 'paragraph', c }) as Block;
    const blocks: Block[] = [
      paragraph('a.1', [
        { t: 'text', v: 'Lees eers ' },
        { t: 'docref', label: '01-core/', section: 'core' },
        { t: 'text', v: '. Hierdie lêer voeg die reëls by.' },
      ]),
      paragraph('a.2', [{ t: 'text', v: 'See `02-invoice.md` for the layout.' }]),
      paragraph('a.3', [{ t: 'text', v: 'Vehicle dealing is regulated.' }]),
    ];
    expect(deriveSummary(blocks)).toBe('Vehicle dealing is regulated.');
  });

  it('ranks related documents by link count and excludes lookup tools and itself', () => {
    const { parsed } = parseMd(
      '# T\n\nSee [Tax](03-tax-and-sars.md), [Tax again](03-tax-and-sars.md), [Vehicles](05-vehicles.md), [Glossary](../05%20Look%20it%20up/01-glossary.md), [Self](02-register.md), `01-core/` and `01-core/05`.\n',
      realEntry('core/register'),
    );
    expect(computeRelated(parsed)).toEqual(['core/tax-and-sars', 'core/vehicles']);
  });
});

describe('configuration', () => {
  it('loads the committed content-meta files', () => {
    const config = realConfig();
    expect(config.docsMeta.docs).toHaveLength(36);
    expect(config.docsMeta.ignore).toContain('TRANSLATION-NOTES.md');
    expect(markersFor(config, 'af').plainWords).toBe('In gewone taal:');
    expect(() => markersFor(config, 'zu')).toThrow('markers.json has no entry for language "zu"');
  });

  it('explains unreadable and invalid files', () => {
    const dir = tempDir('config');
    dirs.push(dir);
    const broken = join(dir, 'docs.meta.json');
    writeFileSync(broken, '{ not json');
    expect(() => loadConfig({ ...defaultConfigPaths(metaDir), docsMeta: broken })).toThrow(
      /cannot read JSON/,
    );
    const meta = JSON.parse(readFileSync(join(metaDir, 'docs.meta.json'), 'utf8')) as {
      docs: { id: string; section: string; sourceFixes?: unknown[] }[];
    };
    const first = meta.docs[0];
    if (first) meta.docs.push({ ...first });
    const second = meta.docs[1];
    if (second) {
      second.section = 'lookup';
      second.sourceFixes = [
        { lang: 'en', replace: 'x', reason: 'neither find nor pattern' },
        { lang: 'af', pattern: '(', replace: 'x', reason: 'a pattern that does not compile' },
      ];
    }
    writeFileSync(broken, JSON.stringify(meta));
    expect(() => loadConfig({ ...defaultConfigPaths(metaDir), docsMeta: broken })).toThrow(
      /duplicate doc id: start\/start-here[\s\S]*id must start with its section[\s\S]*exactly one of find or pattern[\s\S]*invalid pattern/,
    );
  });
});

describe('errors, paths and tables', () => {
  it('formats issues with their document, block, file and line', () => {
    const issues = new IssueCollector();
    issues.add('code-a', 'message a', 'core/register', 'intro.1');
    issues.add('code-b', 'message b');
    issues.add('code-c', 'message c', 'core/register', 'intro.2', { file: 'docs/x.md', line: 17 });
    issues.add('code-d', 'message d', undefined, undefined, { file: 'docs/y.md' });
    expect(issues.size).toBe(4);
    expect(() => issues.throwIfAny()).toThrow(ContentError);
    expect(issues.issues.map(formatIssue)).toEqual([
      'core/register:intro.1: code-a: message a',
      'code-b: message b',
      'docs/x.md:17: core/register:intro.2: code-c: message c',
      'docs/y.md: code-d: message d',
    ]);
    expect(new IssueCollector().throwIfAny()).toBeUndefined();
  });

  it('shows repository files relative to the repository and other files in full', () => {
    expect(displayPath(repoRoot, join(repoRoot, 'docs', 'a b', 'c.md'))).toBe('docs/a b/c.md');
    const outside = resolve(repoRoot, '..', 'scratch', 'c.md');
    expect(displayPath(repoRoot, outside)).toBe(outside.split('\\').join('/'));
  });

  it('pads report tables', () => {
    expect(formatTable(['a', 'bb'], [['1', '2'], ['333']])).toBe(
      '| a   | bb |\n|-----|----|\n| 1   | 2  |\n| 333 |    |',
    );
  });
});
