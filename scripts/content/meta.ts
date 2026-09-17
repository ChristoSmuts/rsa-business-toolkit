import type { Block, Doc, DocHeading, Lang, TranslationStatus } from '../../src/lib/content/schema';
import { docAppliesTo } from './applicability';
import type { ParsedDoc } from './parse';
import type { DocProvenance } from './provenance';
import { blockText, runsToText, wordCount } from './text';

export const SUMMARY_MAX = 200;

/** First sentence(s) up to 200 characters; otherwise cut at a word boundary with an ellipsis. */
export function truncateSummary(text: string, max = SUMMARY_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const window = clean.slice(0, max);
  const sentenceEnd = window.lastIndexOf('. ');
  if (sentenceEnd >= 60) return window.slice(0, sentenceEnd + 1);
  const space = window.lastIndexOf(' ', max - 2);
  return `${window.slice(0, space > 0 ? space : max - 1).replace(/[,;:]$/, '')}…`;
}

export function deriveSummary(blocks: readonly Block[]): string | undefined {
  for (const block of blocks) {
    if (block.hidden) continue;
    if (block.kind === 'paragraph' || block.kind === 'note') {
      const text = runsToText(block.c).replace(/\s+/g, ' ').trim();
      if (text !== '') return truncateSummary(text);
    }
  }
  return undefined;
}

/** Up to five documents this one links to most often, excluding itself and the look-it-up tools. */
export function computeRelated(parsed: ParsedDoc): string[] {
  const counts = new Map<string, { count: number; first: number }>();
  const targets = [
    ...parsed.links.map((link) => link.doc),
    ...parsed.legacy.map((use) => use.target),
  ];
  targets.forEach((target, index) => {
    if (target === parsed.entry.id || target.startsWith('lookup/') || target.startsWith('section:'))
      return;
    const current = counts.get(target);
    if (current) current.count += 1;
    else counts.set(target, { count: 1, first: index });
  });
  return [...counts.entries()]
    .sort(([, a], [, b]) => b.count - a.count || a.first - b.first)
    .slice(0, 5)
    .map(([doc]) => doc);
}

export function readingTime(title: string, blocks: readonly Block[]): number {
  const words =
    wordCount(title) + blocks.reduce((total, block) => total + wordCount(blockText(block)), 0);
  return Math.max(1, Math.round(words / 200));
}

/**
 * Stage 11: turns a parsed document into the `Doc` written to `src/data/<lang>/docs/`. `provenance` supplies
 * the source list, the verification status and the generated-by-AI date for documents without a footer.
 */
export function buildDoc(
  parsed: ParsedDoc,
  translation: { status: TranslationStatus; sourceLang: Lang },
  provenance: DocProvenance,
  fallbackSummary?: string,
): Doc {
  const { entry, lang } = parsed;
  const title = entry.title?.[lang] ?? parsed.h1;
  const summary = entry.summary?.[lang] ?? deriveSummary(parsed.blocks) ?? fallbackSummary ?? title;
  const headings: DocHeading[] = parsed.blocks
    .filter((block): block is Extract<Block, { kind: 'heading' }> => block.kind === 'heading')
    .map((heading) => {
      const item: DocHeading = { id: heading.id, depth: heading.depth, text: heading.text };
      if (heading.appliesTo) item.appliesTo = heading.appliesTo;
      if (heading.pseudo) item.pseudo = true;
      if (heading.hidden) item.hidden = true;
      return item;
    });
  const termsBlock = parsed.blocks.find(
    (block): block is Extract<Block, { kind: 'terms' }> => block.kind === 'terms',
  );
  const doc: Doc = {
    id: entry.id,
    lang,
    slug: entry.id.split('/').at(-1) ?? entry.id,
    route: entry.route,
    section: entry.section,
    order: entry.order,
    kind: entry.kind,
    title,
    h1: parsed.h1,
    summary: truncateSummary(summary),
    readingTime: readingTime(title, parsed.blocks),
    appliesTo: docAppliesTo(entry),
    tags: entry.tags ?? [],
    related: computeRelated(parsed),
    terms: (termsBlock?.items ?? []).map((item) => ({
      term: runsToText(item.term).trim(),
      meaning: runsToText(item.meaning).trim(),
    })),
    headings,
    blocks: parsed.blocks,
    generated: structuredClone(parsed.generated ?? provenance.generated),
    sources: structuredClone(provenance.sources),
    verification: structuredClone(provenance.verification),
    translation,
    sourcePath: parsed.sourcePath,
    contentHash: parsed.contentHash,
  };
  if (provenance.sourceNote) doc.sourceNote = structuredClone(provenance.sourceNote);
  return doc;
}
