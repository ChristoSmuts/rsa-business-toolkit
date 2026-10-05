import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultConfigPaths,
  loadConfig,
  markersFor,
  type ConfigPaths,
  type ContentConfig,
  type DocMetaEntry,
  type LangMarkers,
} from '../../../scripts/content/config';
import { normaliseSource } from '../../../scripts/content/discover';
import { IssueCollector } from '../../../scripts/content/errors';
import { parseDocument, type ParsedDoc } from '../../../scripts/content/parse';
import { createDocIndex } from '../../../scripts/content/refs';
import type { Lang } from '../../../src/lib/content/schema';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const corpusDir = join(repoRoot, 'docs', 'rsa-business-toolkit');
export const fixturesDir = join(repoRoot, 'tests', 'unit', 'content', 'fixtures');
export const metaDir = join(repoRoot, 'content-meta');

let cached: ContentConfig | undefined;

export function realConfig(): ContentConfig {
  cached ??= loadConfig(defaultConfigPaths(metaDir));
  return cached;
}

export function enMarkers(): LangMarkers {
  return markersFor(realConfig(), 'en');
}

export function afMarkers(): LangMarkers {
  return markersFor(realConfig(), 'af');
}

export function fixtureConfigPaths(): ConfigPaths {
  return {
    ...defaultConfigPaths(metaDir),
    docsMeta: join(fixturesDir, 'meta', 'docs.meta.json'),
    legacyRefs: join(fixturesDir, 'meta', 'legacy-refs.json'),
    sourceMap: join(fixturesDir, 'meta', 'source-map.json'),
    provenance: join(fixturesDir, 'meta', 'provenance.json'),
    // The fixtures hold a few documents; links and renames name real ones and would not resolve.
    taskLinks: undefined,
    taskRenames: undefined,
  };
}

export function realEntry(id: string, overrides: Partial<DocMetaEntry> = {}): DocMetaEntry {
  const entry = realConfig().docsMeta.docs.find((doc) => doc.id === id);
  if (!entry) throw new Error(`no doc ${id} in docs.meta.json`);
  return { ...entry, ...overrides };
}

export function readCorpus(entry: DocMetaEntry): string {
  return normaliseSource(readFileSync(join(corpusDir, ...entry.source.split('/')), 'utf8'));
}

export interface ParseResult {
  parsed: ParsedDoc;
  issues: IssueCollector;
}

/** Parses markdown as if it were the document described by `entry`. */
export function parseMd(
  markdown: string,
  entry: DocMetaEntry,
  lang: Lang = 'en',
  config: ContentConfig = realConfig(),
): ParseResult {
  const issues = new IssueCollector();
  const parsed = parseDocument({
    entry,
    lang,
    source: normaliseSource(markdown),
    sourcePath: entry.source,
    config,
    index: createDocIndex(config.docsMeta),
    issues,
    linkifyIgnore: new Set(config.docsMeta.linkify.ignoreDomains),
    linkifyAllow: new Set(config.docsMeta.linkify.allowDomains),
  });
  return { parsed, issues };
}

export function codes(issues: IssueCollector): string[] {
  return issues.issues.map((issue) => issue.code);
}

export function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `st-content-${prefix}-`));
}

export function copyTree(from: string, prefix: string): string {
  const dir = tempDir(prefix);
  cpSync(from, dir, { recursive: true });
  return dir;
}

export function editFile(path: string, find: string, replace: string): void {
  const text = readFileSync(path, 'utf8');
  if (!text.includes(find)) throw new Error(`"${find}" not found in ${path}`);
  writeFileSync(
    path,
    text.replace(find, () => replace),
    'utf8',
  );
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
