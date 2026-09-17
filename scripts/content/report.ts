import type { Block } from '../../src/lib/content/schema';
import type { BuildResult } from './build';
import { markersFor } from './config';
import { emptyDateAudit, type DateAudit } from './facts';
import { blockFacts, glossaryParagraph, placeholderList } from './fidelity';
import { byCodeUnit } from './write';

export function formatTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => (row[column] ?? '').length)),
  );
  const line = (cells: readonly string[]): string =>
    `| ${headers.map((_header, column) => (cells[column] ?? '').padEnd(widths[column] ?? 0)).join(' | ')} |`;
  return [
    line(headers),
    `|${widths.map((width) => '-'.repeat(width + 2)).join('|')}|`,
    ...rows.map(line),
  ].join('\n');
}

export interface ContentCounts {
  docsPerSection: Record<string, Record<string, number>>;
  blocksByKind: Record<string, number>;
  tasks: number;
  glossaryEntries: number;
  glossaryGroups: number;
  sourceEntries: number;
  sourcesWithUrl: number;
  sourceCitations: number;
  sourceSubgroups: number;
  sourceActs: number;
  /** Entries with no "what it supports" text anywhere in the register, so a page omits the label. */
  sourcesWithoutSupports: number;
  placeholders: { inline: number; fence: number };
  /** Variants of the code blocks in the English output (after overrides). */
  fenceVariants: Record<string, number>;
  /** Fences replaced by another block (the stale folder tree became a table of contents). */
  fencesReplaced: number;
  legacyRefsResolved: number;
  internalLinksResolved: number;
  externalLinks: number;
  bareDomains: string[];
}

function tally(values: Iterable<string>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => byCodeUnit(a, b)));
}

export function countContent(result: BuildResult): ContentCounts {
  const en = result.langs.find((build) => build.lang === 'en');
  const blocks: Block[] = en?.docs.flatMap((doc) => doc.blocks) ?? [];
  const docsPerSection: ContentCounts['docsPerSection'] = {};
  for (const build of result.langs)
    docsPerSection[build.lang] = tally(build.docs.map((doc) => doc.section));
  let inline = 0;
  let fence = 0;
  for (const block of blocks) {
    const count = placeholderList(block).length;
    if (block.kind === 'code') fence += count;
    else inline += count;
  }
  const codeBlocks = blocks.flatMap((block) => (block.kind === 'code' ? [block.variant] : []));
  const entries = en?.sources?.entries ?? [];
  return {
    docsPerSection,
    blocksByKind: tally(blocks.map((block) => block.kind)),
    tasks: en?.tasks.tasks.length ?? 0,
    glossaryEntries: en?.glossary?.entries.length ?? 0,
    glossaryGroups: en?.glossary?.groups.length ?? 0,
    sourceEntries: entries.length,
    sourcesWithUrl: entries.filter((entry) => entry.type === 'web').length,
    sourceCitations: entries.filter((entry) => entry.type === 'citation').length,
    sourceSubgroups: (en?.sources?.groups ?? []).reduce(
      (total, group) => total + group.subgroups.length,
      0,
    ),
    sourceActs: en?.sources?.acts.length ?? 0,
    sourcesWithoutSupports: entries.filter((entry) => entry.supports === undefined).length,
    placeholders: { inline, fence },
    fenceVariants: tally(codeBlocks),
    fencesReplaced: result.fences.length - codeBlocks.length,
    legacyRefsResolved: result.legacy.length,
    internalLinksResolved: result.links.length,
    externalLinks: result.externalLinks.length,
    bareDomains: [...new Set(result.bareDomains)].sort(byCodeUnit),
  };
}

export function formatSummary(result: BuildResult): string {
  const counts = countContent(result);
  const lines = [
    `Docs per section: ${Object.entries(counts.docsPerSection)
      .map(
        ([lang, sections]) =>
          `${lang} {${Object.entries(sections)
            .map(([section, n]) => `${section}: ${n}`)
            .join(', ')}}`,
      )
      .join('; ')}`,
    `Blocks by kind (en): ${Object.entries(counts.blocksByKind)
      .map(([kind, n]) => `${kind} ${n}`)
      .join(', ')}`,
    `Tasks: ${counts.tasks} · Glossary: ${counts.glossaryEntries} entries in ${counts.glossaryGroups} groups · Sources: ${counts.sourceEntries} entries (${counts.sourcesWithUrl} with a URL, ${counts.sourceCitations} citations without a URL), ${counts.sourceSubgroups} sub-groups, ${counts.sourceActs} acts`,
    `Placeholders: ${counts.placeholders.inline} inline, ${counts.placeholders.fence} in fences`,
    `Fence variants: ${Object.entries(counts.fenceVariants)
      .map(([variant, n]) => `${variant} ${n}`)
      .join(
        ', ',
      )}${counts.fencesReplaced > 0 ? ` (+${counts.fencesReplaced} replaced by a table of contents)` : ''}`,
    `Legacy refs resolved: ${counts.legacyRefsResolved} · Internal links resolved: ${counts.internalLinksResolved} · External links: ${counts.externalLinks}`,
    `Bare domains linked: ${counts.bareDomains.join(', ') || 'none'}`,
    'Unsupported nodes: 0 · Unresolved links/refs/anchors: 0 · Unclassified fences: 0',
  ];
  for (const build of result.langs.filter((candidate) => candidate.lang !== 'en')) {
    lines.push(
      `${build.lang}: ${build.docs.length} docs built, ${build.skipped.length} skipped (no source), ${build.fallback.length} English fallbacks`,
    );
  }
  for (const missing of result.missingRoots)
    lines.push(`${missing.lang}: no source tree at ${missing.root} (skipped)`);
  return lines.join('\n');
}

/** code → target → number of uses. */
function legacyTally(result: BuildResult): string[][] {
  const byCode = new Map<string, Map<string, number>>();
  for (const use of result.legacy) {
    const targets = byCode.get(use.code) ?? new Map<string, number>();
    targets.set(use.target, (targets.get(use.target) ?? 0) + 1);
    byCode.set(use.code, targets);
  }
  return [...byCode.entries()]
    .flatMap(([code, targets]) =>
      [...targets.entries()].map(([target, uses]) => [code, target, String(uses)]),
    )
    .sort((a, b) => byCodeUnit(a[0] ?? '', b[0] ?? '') || byCodeUnit(a[1] ?? '', b[1] ?? ''));
}

export interface DateAuditRow {
  doc: string;
  block: string;
  audit: DateAudit;
}

/** Runs the English date extraction over every block and glossary entry, keeping what it saw. */
export function auditDates(result: BuildResult): DateAuditRow[] {
  const en = result.langs.find((build) => build.lang === 'en');
  const markers = markersFor(result.config, 'en');
  const rows: DateAuditRow[] = [];
  for (const parsed of en?.parsed ?? []) {
    const units: Block[] = [
      ...parsed.blocks,
      ...parsed.glossary.map((draft) => glossaryParagraph(draft)),
    ];
    for (const block of units) {
      const audit = emptyDateAudit();
      blockFacts(block, markers, audit);
      if (audit.tokens.length > 0 || audit.skipped.length > 0 || audit.otherCase.length > 0)
        rows.push({ doc: parsed.entry.id, block: block.id, audit });
    }
  }
  return rows;
}

export function formatDateAudit(result: BuildResult): string {
  const rows = auditDates(result);
  const tokens = rows.flatMap((row) =>
    row.audit.tokens.map((token) => [row.doc, row.block, token.value, token.text]),
  );
  const skipped = rows.flatMap((row) =>
    row.audit.skipped.map((skip) => [row.doc, row.block, skip.word, skip.text]),
  );
  const otherCase = new Map<string, { count: number; docs: Set<string> }>();
  for (const row of rows) {
    for (const word of row.audit.otherCase) {
      const entry = otherCase.get(word) ?? { count: 0, docs: new Set<string>() };
      entry.count += 1;
      entry.docs.add(row.doc);
      otherCase.set(word, entry);
    }
  }
  const docs = new Set(tokens.map((row) => row[0]));
  return [
    `== Date tokens (en): ${tokens.length} in ${docs.size} docs ==`,
    formatTable(['doc', 'block', 'value', 'text'], tokens),
    '',
    `== Capitalised month names not counted as dates (en): ${skipped.length} ==`,
    skipped.length > 0 ? formatTable(['doc', 'block', 'word', 'text'], skipped) : '(none)',
    '',
    `== Month words in another case, never dates (en) ==`,
    [...otherCase.entries()]
      .sort(([a], [b]) => byCodeUnit(a, b))
      .map(([word, entry]) => `${word}: ${entry.count} in ${entry.docs.size} docs`)
      .join('\n') || '(none)',
  ].join('\n');
}

/** doc → number of register entries, how many are official, acts, and the note for docs without a list. */
export function formatSourcesTable(result: BuildResult): string {
  const en = result.langs.find((build) => build.lang === 'en');
  const official = new Set(
    (en?.sources?.entries ?? []).filter((entry) => entry.official).map((entry) => entry.id),
  );
  const rows = (en?.docs ?? []).map((doc) => [
    doc.id,
    String(doc.sources.entries.length),
    String(doc.sources.entries.filter((id) => official.has(id)).length),
    String(doc.sources.acts.length),
    doc.sourceNote ? `note → ${doc.sourceNote.see.join(', ')}` : '',
  ]);
  return [
    `== Sources per document (en) ==`,
    formatTable(['doc', 'entries', 'official', 'acts', 'note'], rows),
  ].join('\n');
}

/**
 * Register entries with no "what it supports" text anywhere: no `Supports:` line, no qualifier and no
 * single note. A page omits the label for these, and the register can be repaired against this list.
 */
export function sourcesWithoutSupports(result: BuildResult): string[] {
  const en = result.langs.find((build) => build.lang === 'en');
  return (en?.sources?.entries ?? [])
    .filter((entry) => entry.supports === undefined)
    .map((entry) => entry.id);
}

/**
 * Acts a document names in its own text but does not list in `sources.acts`. Informational: it shows a
 * reviewer where a citation may still need a mapping in `content-meta/source-map.json`.
 */
export function unmappedActMentions(result: BuildResult): string[][] {
  const en = result.langs.find((build) => build.lang === 'en');
  const acts = (en?.sources?.acts ?? []).map((act) => ({
    id: act.id,
    /** `Companies Act 71 of 2008` → `Companies Act`: prose cites the short title. */
    short: act.name.replace(/,?\s+\d+\s+of\s+\d{4}$/u, ''),
  }));
  const rows: string[][] = [];
  for (const doc of en?.docs ?? []) {
    const text = JSON.stringify(doc.blocks);
    for (const act of acts) {
      if (doc.sources.acts.includes(act.id) || !text.includes(act.short)) continue;
      rows.push([doc.id, act.id, act.short]);
    }
  }
  return rows;
}

export function formatReport(result: BuildResult): string {
  const fenceRows = result.fences.map((record) => [
    record.doc,
    record.block,
    record.variant,
    record.rule,
    String(record.lines),
    record.firstLine.slice(0, 48),
  ]);
  const applicabilityRows = result.applicability.map((row) => [
    row.doc,
    row.kind,
    row.target,
    row.appliesTo,
    row.source,
    row.text,
  ]);
  const withoutSupports = sourcesWithoutSupports(result);
  const actMentions = unmappedActMentions(result);
  return [
    '== Summary ==',
    formatSummary(result),
    '',
    `== Fence classification (${fenceRows.length}) ==`,
    formatTable(['doc', 'block', 'variant', 'rule', 'lines', 'first line'], fenceRows),
    '',
    `== Legacy refs (${result.legacy.length} uses) ==`,
    formatTable(['code', 'resolves to', 'uses'], legacyTally(result)),
    '',
    `== Applicability (${applicabilityRows.length}) ==`,
    formatTable(['doc', 'kind', 'target', 'applies to', 'source', 'text'], applicabilityRows),
    '',
    formatSourcesTable(result),
    '',
    `== Register entries without "what it supports" text (en): ${withoutSupports.length} ==`,
    withoutSupports.join('\n') || '(none)',
    '',
    `== Acts named in a document's text but not in its sources.acts (en): ${actMentions.length} ==`,
    actMentions.length > 0 ? formatTable(['doc', 'act', 'named as'], actMentions) : '(none)',
    '',
    formatDateAudit(result),
  ].join('\n');
}
