import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Lang } from '../../src/lib/content/schema';
import type { DocMetaEntry, DocsMeta } from './config';
import type { IssueCollector } from './errors';
import { FACT_KINDS, extractFacts, type FactMarkers } from './facts';

/** Every `.md` file under a source root, as posix paths relative to that root. */
export function listMarkdown(root: string): string[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
}

export interface DiscoveredDoc {
  entry: DocMetaEntry;
  path: string;
  exists: boolean;
}

/**
 * Matches the files on disk with `docs.meta.json`. A markdown file that is neither listed nor in `ignore`
 * is a build error, so a new document can never be silently dropped.
 */
export function discover(
  root: string,
  meta: DocsMeta,
  lang: Lang,
  issues: IssueCollector,
): DiscoveredDoc[] {
  const files = new Set(existsSync(root) ? listMarkdown(root) : []);
  const listed = new Set(meta.docs.map((doc) => doc.source));
  const ignored = new Set(meta.ignore);
  for (const file of files) {
    if (!listed.has(file) && !ignored.has(file)) {
      issues.add(
        'unlisted-source',
        `${lang}: "${file}" is not listed in docs.meta.json and not in "ignore"`,
      );
    }
  }
  return meta.docs.map((entry) => ({
    entry,
    path: join(root, ...entry.source.split('/')),
    exists: files.has(entry.source),
  }));
}

const BYTE_ORDER_MARK = 0xfeff;

/** CRLF/CR → LF and a leading BOM removed. Nothing else is changed before parsing. */
export function normaliseSource(input: string): string {
  const raw = input.charCodeAt(0) === BYTE_ORDER_MARK ? input.slice(1) : input;
  return raw.replace(/\r\n?/g, '\n');
}

export function readSource(path: string): string {
  return normaliseSource(readFileSync(path, 'utf8'));
}

/**
 * Every fact in a piece of markdown, sorted, as one comparable string. The same extractor runs over both
 * sides of a `sourceFix`, so only a real change of a number, amount, date, code or section shows up.
 */
function factsDigest(text: string, markers: FactMarkers): string {
  const facts = extractFacts(text, markers);
  return FACT_KINDS.map((kind) => `${kind}:${[...facts[kind]].sort().join(',')}`).join('|');
}

/**
 * Applies the audited `sourceFixes` for one language, reading facts with that language's markers (so an
 * Afrikaans fix that changes `7de` or `Augustus` is seen as a fact change). A fix must match exactly
 * once; an `optional` fix may also match nothing, because a translation can already contain the
 * corrected markdown.
 *
 * A fix may only repair markdown structure. One that changes a fact is refused and reported, because a
 * wrong fact is corrected in the English source (ADR-0006 decision 1), never silently in memory.
 */
export function applySourceFixes(
  source: string,
  entry: DocMetaEntry,
  lang: Lang,
  markers: FactMarkers,
  issues: IssueCollector,
  file?: string,
): string {
  let fixed = source;
  const at = file === undefined ? undefined : { file };
  for (const fix of entry.sourceFixes ?? []) {
    if (fix.lang !== lang && !(fix.lang === 'translations' && lang !== 'en')) continue;
    const pattern = fix.pattern === undefined ? undefined : new RegExp(fix.pattern, 'gmu');
    const find = fix.find ?? '';
    const count = pattern ? [...fixed.matchAll(pattern)].length : fixed.split(find).length - 1;
    if (count === 0 && fix.optional === true) continue;
    if (count !== 1) {
      const what = pattern
        ? `the sourceFixes pattern ${JSON.stringify(fix.pattern)}`
        : 'a sourceFixes "find"';
      issues.add(
        'source-fix',
        `expected ${fix.optional === true ? 'at most one match' : 'exactly one match'} for ${what}, found ${count}`,
        entry.id,
        undefined,
        at,
      );
      continue;
    }
    const next = pattern
      ? fixed.replace(new RegExp(fix.pattern ?? '', 'mu'), fix.replace)
      : fixed.replace(find, () => fix.replace);
    if (factsDigest(next, markers) !== factsDigest(fixed, markers)) {
      issues.add(
        'source-fix-facts',
        `a sourceFix changed a fact, which a fix may never do (it repairs markdown structure only). Correct the fact in the English source instead`,
        entry.id,
        undefined,
        at,
      );
      continue;
    }
    fixed = next;
  }
  return fixed;
}
