/**
 * Pure helpers behind `src/components/content/`. Everything here is a plain function over the
 * generated JSON, so the decisions the renderers make are unit-testable without a browser.
 */
import type {
  Block,
  GlossaryEntry,
  GlossaryFile,
  InlineRun,
  PlaceholderRun,
  SourceEntry,
  SourcesFile,
} from './schema';

/** A table with this many columns or more stacks into cards under 640px (`TableScroll wide`). */
export const WIDE_TABLE_COLUMNS = 5;

/**
 * Placeholders are stored without their brackets (`NAME`, not `[NAME]`), because the pipeline
 * strips them. Templates and prompts are written and copied with brackets, and a reader is told
 * to "replace everything in [SQUARE BRACKETS]", so they are put back when a placeholder renders.
 */
export function placeholderLabel(run: Pick<PlaceholderRun, 'v'>): string {
  return `[${run.v}]`;
}

export interface PlainTextOptions {
  /**
   * What a docref shows. The default is the markdown label, which is the source text; pass
   * `docrefText` from `manifest.ts` to get the words the page really renders.
   */
  readonly docref?: (run: Extract<InlineRun, { t: 'docref' }>) => string;
}

/**
 * The text of a run tree: what the document says, with no markup and no added words.
 * Used for `<caption>` text, `aria-label`s and link titles, and by the tests that compare what
 * was rendered with what the data holds.
 *
 * A sigline contributes nothing: it is a blank line to sign on, not text.
 */
export function plainText(
  runs: readonly InlineRun[] | undefined,
  options: PlainTextOptions = {},
): string {
  let out = '';
  for (const run of runs ?? []) {
    switch (run.t) {
      case 'text':
      case 'code':
        out += run.v;
        break;
      case 'strong':
      case 'em':
      case 'link':
        out += plainText(run.c, options);
        break;
      case 'docref':
        out += options.docref ? options.docref(run) : run.label;
        break;
      case 'placeholder':
        out += placeholderLabel(run);
        break;
      case 'br':
        out += '\n';
        break;
      case 'sigline':
        break;
    }
  }
  return out;
}

/** Whitespace-insensitive comparison form, for tests and for `aria-label` de-duplication. */
export function normaliseText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export type CodeSegment =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'placeholder'; readonly run: PlaceholderRun; readonly value: string };

/**
 * Split a fenced block's text into literal text and the placeholders the pipeline recorded, so a
 * prompt or a template preview can mark its blanks without a regular expression guessing which
 * brackets are placeholders.
 *
 * The placeholder list is in document order, so each one is searched for from the end of the
 * previous match. A placeholder the text does not contain is skipped rather than throwing: a
 * renderer must never lose the reader's text because the two drifted apart. `placeholdersFound`
 * lets a caller (a test) check that they did not.
 */
export function splitPlaceholders(
  text: string,
  placeholders: readonly PlaceholderRun[] = [],
): CodeSegment[] {
  const segments: CodeSegment[] = [];
  let cursor = 0;
  for (const run of placeholders) {
    const needle = placeholderLabel(run);
    const at = text.indexOf(needle, cursor);
    if (at === -1) continue;
    if (at > cursor) segments.push({ kind: 'text', value: text.slice(cursor, at) });
    segments.push({ kind: 'placeholder', run, value: needle });
    cursor = at + needle.length;
  }
  if (cursor < text.length) segments.push({ kind: 'text', value: text.slice(cursor) });
  return segments;
}

/** How many of `placeholders` were located in `text`, in order. */
export function placeholdersFound(
  text: string,
  placeholders: readonly PlaceholderRun[] = [],
): number {
  return splitPlaceholders(text, placeholders).filter((segment) => segment.kind === 'placeholder')
    .length;
}

type TableBlock = Extract<Block, { kind: 'table' }>;

export function tableColumnCount(block: TableBlock): number {
  return block.header.length;
}

/** Five columns or more: `TableScroll` stacks these into labelled cards under 640px. */
export function tableIsWide(block: TableBlock): boolean {
  return tableColumnCount(block) >= WIDE_TABLE_COLUMNS;
}

/**
 * A thematic break that sits immediately before a heading says nothing the heading does not
 * already say, and the corpus has 130 of them (one above almost every `##`). They are dropped, so
 * a document is not a ladder of rules; the 14 that separate content inside a section are kept.
 */
export function isRedundantRule(blocks: readonly Block[], index: number): boolean {
  if (blocks[index]?.kind !== 'hr') return false;
  return blocks[index + 1]?.kind === 'heading';
}

/**
 * The text of the nearest heading at or before `index`. A table has no caption of its own in the
 * markdown, so the heading it sits under is what names its scroll region.
 */
export function nearestHeadingText(blocks: readonly Block[], index: number): string | undefined {
  for (let i = Math.min(index, blocks.length - 1); i >= 0; i--) {
    const block = blocks[i];
    if (block?.kind === 'heading') return block.text;
  }
  return undefined;
}

/**
 * Heading level for a block depth. Document headings are `##`/`###` (depth 2 and 3) under the
 * page `<h1>` and keep their level. Depth 4 is a pseudo heading (a bold lead-in line); build plan
 * B4 gives it heading semantics "only where the outline allows", so it sits one level under the
 * last real heading before it (`previousDepth`, 1 for the page `<h1>`) and never skips a level:
 * under an `<h2>` it is an `<h3>`, under an `<h3>` an `<h4>`.
 */
export function headingTag(depth: 2 | 3 | 4, previousDepth = 3): 'h2' | 'h3' | 'h4' {
  if (depth !== 4) return `h${depth}`;
  const level = Math.min(4, Math.max(2, previousDepth + 1));
  return `h${level}` as 'h2' | 'h3' | 'h4';
}

/**
 * The tag of every heading block in a list, in order (`undefined` for other blocks). A pseudo
 * heading is placed by the last *real* heading above it, so two pseudo headings in a row are
 * siblings rather than a staircase. Hidden headings render no heading element and are skipped.
 */
export function headingTags(blocks: readonly Block[]): ('h2' | 'h3' | 'h4' | undefined)[] {
  let previous = 1;
  return blocks.map((block) => {
    if (block.kind !== 'heading' || block.hidden) return undefined;
    const tag = headingTag(block.depth, previous);
    if (!block.pseudo && block.depth !== 4) previous = block.depth;
    return tag;
  });
}

/** Cell alignment class for a column, or `undefined` for the default (start). */
export function alignClass(
  align: 'left' | 'center' | 'right' | null | undefined,
): string | undefined {
  if (align === 'center') return 'st-cell-center';
  if (align === 'right') return 'st-cell-end';
  return undefined;
}

/**
 * Every URL the sources register marks as official. An external link whose href is one of them
 * gets the "Official" badge (design system, Link), so officialness is shown where the reader
 * clicks and not only in the sources section.
 */
/**
 * The form of a URL the Official lookup compares: scheme, a leading `www.` and trailing slashes
 * dropped, host lower-cased. The register writes `https://www.cipc.co.za/` where the guide links
 * `https://www.cipc.co.za`, and `https://gov.za/` where it links `https://www.gov.za`; those are
 * the same official page, and an exact string match left them without their badge.
 */
export function officialUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${host}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

/** Every URL the register marks as official, as `officialUrlKey` keys. */
export function officialUrls(sources: SourcesFile | undefined): ReadonlySet<string> {
  const urls = new Set<string>();
  for (const entry of sources?.entries ?? []) {
    if (!entry.official) continue;
    for (const url of entry.urls) urls.add(officialUrlKey(url));
    if (entry.url !== undefined) urls.add(officialUrlKey(entry.url));
  }
  return urls;
}

/** True when the register marks this URL, in any of its spellings, as official. */
export function isOfficialUrl(official: ReadonlySet<string>, url: string): boolean {
  return official.has(officialUrlKey(url));
}

/** Source register entries for a document, in the register's own order. Unknown ids are dropped. */
export function sourceEntriesFor(
  sources: SourcesFile | undefined,
  ids: readonly string[],
): SourceEntry[] {
  const wanted = new Set(ids);
  return (sources?.entries ?? []).filter((entry) => wanted.has(entry.id));
}

/** Acts for a document, in the register's own order. */
export function actsFor(
  sources: SourcesFile | undefined,
  ids: readonly string[],
): SourcesFile['acts'] {
  const wanted = new Set(ids);
  return (sources?.acts ?? []).filter((act) => wanted.has(act.id));
}

/** Glossary entries of one group, in file order. */
export function glossaryGroupEntries(
  glossary: GlossaryFile | undefined,
  groupId: string,
): GlossaryEntry[] {
  return (glossary?.entries ?? []).filter((entry) => entry.groupId === groupId);
}

export function glossaryGroupTitle(
  glossary: GlossaryFile | undefined,
  groupId: string,
): string | undefined {
  return glossary?.groups.find((group) => group.id === groupId)?.title;
}

/** The id the pipeline gives the "Words used in this file" heading in every language. */
export const TERMS_HEADING_ID = 'words-used-in-this-file';

export interface SplitBlocks {
  /** The `terms` block that sat under the "Words used in this file" heading, if any. */
  readonly terms: Extract<Block, { kind: 'terms' }> | undefined;
  /** Every other block, in order, without that heading, its terms block and a rule right after. */
  readonly rest: readonly Block[];
}

/**
 * Build plan B6 puts "Words used in this file" in a `<details>` under the article header. The
 * pipeline emits it in the flow as a heading, the `terms` block, and usually a rule, so those are
 * lifted out here and the page renders them once, in the `<details>` that keeps the heading's id.
 * A document without that exact shape is returned unchanged.
 */
export function splitTermsBlocks(blocks: readonly Block[]): SplitBlocks {
  const index = blocks.findIndex(
    (block) => block.kind === 'heading' && block.id === TERMS_HEADING_ID,
  );
  const terms = index === -1 ? undefined : blocks[index + 1];
  if (terms === undefined || terms.kind !== 'terms') return { terms: undefined, rest: blocks };
  const after = blocks[index + 2];
  const drop = after?.kind === 'hr' ? 3 : 2;
  return { terms, rest: [...blocks.slice(0, index), ...blocks.slice(index + drop)] };
}
