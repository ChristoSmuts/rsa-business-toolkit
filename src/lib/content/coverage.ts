/**
 * Which rendering features a block exercises, and the smallest set of **real** blocks that
 * exercises all of them.
 *
 * This is what `/design-system/content/` renders and what the e2e spec checks. The point is that
 * the corpus renders: the page does not invent a fixture for "a table with five columns" or "a
 * prompt with placeholders", it finds the first real one and shows that. If a future content
 * change removes the last block of some kind, `ALL_FEATURES` stops being covered and
 * `tests/unit/content-coverage.test.ts` says so instead of the page quietly showing one less
 * thing.
 */
import type { Block, InlineRun } from './schema';
import { FenceVariantSchema } from './schema';
import { tableIsWide } from './render';

/** Every feature a renderer has a branch for. The e2e spec asserts each one is on the page. */
export const ALL_FEATURES: readonly string[] = [
  // Block kinds
  'block:heading',
  'block:paragraph',
  'block:callout',
  'block:list',
  'block:tasklist',
  'block:table',
  'block:code',
  'block:terms',
  'block:note',
  'block:hr',
  'block:toc',
  'block:glossary',
  // Variants within a kind
  'callout:plain',
  'callout:note',
  ...FenceVariantSchema.options.map((variant) => `code:${variant}`),
  'list:ordered',
  'list:unordered',
  'table:wide',
  'table:narrow',
  'table:empty',
  'tasklist:grouped',
  'tasklist:ungrouped',
  'heading:2',
  'heading:3',
  'heading:4',
  'block:hidden',
  // Inline run kinds
  'inline:text',
  'inline:strong',
  'inline:em',
  'inline:code',
  'inline:link-internal',
  'inline:link-external',
  'inline:docref-doc',
  'inline:docref-section',
  'inline:placeholder',
  'inline:sigline',
  'inline:br',
];

function inlineFeatures(runs: readonly InlineRun[] | undefined, into: Set<string>): void {
  for (const run of runs ?? []) {
    switch (run.t) {
      case 'text':
        into.add('inline:text');
        break;
      case 'code':
        into.add('inline:code');
        break;
      case 'br':
        into.add('inline:br');
        break;
      case 'sigline':
        into.add('inline:sigline');
        break;
      case 'placeholder':
        into.add('inline:placeholder');
        break;
      case 'strong':
        into.add('inline:strong');
        inlineFeatures(run.c, into);
        break;
      case 'em':
        into.add('inline:em');
        inlineFeatures(run.c, into);
        break;
      case 'link':
        into.add('external' in run ? 'inline:link-external' : 'inline:link-internal');
        inlineFeatures(run.c, into);
        break;
      case 'docref':
        into.add('doc' in run ? 'inline:docref-doc' : 'inline:docref-section');
        break;
    }
  }
}

/** Every feature one block exercises. */
export function blockFeatures(block: Block): Set<string> {
  const features = new Set<string>([`block:${block.kind}`]);
  if (block.hidden) features.add('block:hidden');
  switch (block.kind) {
    case 'heading':
      features.add(`heading:${block.depth}`);
      inlineFeatures(block.c, features);
      break;
    case 'paragraph':
    case 'note':
      inlineFeatures(block.c, features);
      break;
    case 'callout':
      features.add(`callout:${block.style}`);
      inlineFeatures(block.c, features);
      break;
    case 'list':
      features.add(block.ordered ? 'list:ordered' : 'list:unordered');
      for (const item of block.items) inlineFeatures(item, features);
      break;
    case 'tasklist':
      features.add(block.group ? 'tasklist:grouped' : 'tasklist:ungrouped');
      inlineFeatures(block.group, features);
      for (const task of block.items) inlineFeatures(task.c, features);
      break;
    case 'table':
      features.add(tableIsWide(block) ? 'table:wide' : 'table:narrow');
      // Two tables in the corpus are column headings only (a cash book, a logbook): the renderer
      // leaves out the `<tbody>` rather than emitting an empty one.
      if (block.rows.length === 0) features.add('table:empty');
      for (const cell of block.header) inlineFeatures(cell, features);
      for (const row of block.rows) for (const cell of row) inlineFeatures(cell, features);
      break;
    case 'code':
      features.add(`code:${block.variant}`);
      inlineFeatures(block.placeholders, features);
      break;
    case 'terms':
      inlineFeatures(block.intro, features);
      for (const item of block.items) {
        inlineFeatures(item.term, features);
        inlineFeatures(item.meaning, features);
      }
      break;
    case 'hr':
    case 'toc':
    case 'glossary':
      break;
  }
  return features;
}

export interface CoverageDoc {
  readonly id: string;
  readonly blocks: readonly Block[];
}

export interface CoverageItem {
  readonly docId: string;
  readonly block: Block;
  /** The features this block was picked for. */
  readonly features: readonly string[];
}

/**
 * The first real block that introduces each feature, in corpus order. A block that adds nothing
 * new is skipped, so the result is a handful of blocks rather than the whole corpus.
 */
export function selectCoverage(
  docs: readonly CoverageDoc[],
  wanted: readonly string[] = ALL_FEATURES,
): CoverageItem[] {
  const remaining = new Set(wanted);
  const picked: CoverageItem[] = [];
  for (const doc of docs) {
    for (const block of doc.blocks) {
      const features = [...blockFeatures(block)].filter((feature) => remaining.has(feature));
      if (features.length === 0) continue;
      for (const feature of features) remaining.delete(feature);
      picked.push({ docId: doc.id, block, features });
    }
  }
  return picked;
}

/** Features that no block in the corpus exercises. Empty is the expected state. */
export function uncoveredFeatures(
  docs: readonly CoverageDoc[],
  wanted: readonly string[] = ALL_FEATURES,
): string[] {
  const covered = new Set<string>();
  for (const doc of docs) {
    for (const block of doc.blocks) {
      for (const feature of blockFeatures(block)) covered.add(feature);
    }
  }
  return wanted.filter((feature) => !covered.has(feature));
}
