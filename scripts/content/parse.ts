import type { List, Node, Paragraph, PhrasingContent, Root, RootContent, Table } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { Block, BlockKind, FenceVariant, InlineRun, Lang } from '../../src/lib/content/schema';
import { markersFor, type ContentConfig, type DocMetaEntry, type LangMarkers } from './config';
import type { IssueCollector, SourceLocation } from './errors';
import { classifyFence, type FenceRule } from './fences';
import { BlockIdAllocator, createSlugger, shortHash } from './ids';
import { transformInline, type InlineContext, type LegacyUse, type LinkUse } from './inline';
import { extractFencePlaceholders } from './placeholders';
import { resolveLegacyRef, type DocIndex } from './refs';
import { stripFooter, type Generated } from './special/footer';
import { glossaryEntryFromRuns, type GlossaryDraft } from './special/glossary';
import { runsToText, trimRuns } from './text';

const processor = unified().use(remarkParse).use(remarkGfm);

export function parseMarkdown(source: string): Root {
  return processor.parse(source);
}

export interface FenceRecord {
  doc: string;
  block: string;
  variant: FenceVariant;
  rule: FenceRule | 'copied';
  lines: number;
  firstLine: string;
}

export interface ParsedDoc {
  entry: DocMetaEntry;
  lang: Lang;
  sourcePath: string;
  contentHash: string;
  h1: string;
  blocks: Block[];
  /** Block kinds before `blockOverrides` (a replaced fence is still `code` here). */
  rawKinds: BlockKind[];
  generated?: Generated | undefined;
  glossary: GlossaryDraft[];
  links: LinkUse[];
  externalLinks: string[];
  /** Hosts of bare domains in prose that became links. */
  bareDomains: string[];
  legacy: LegacyUse[];
  fences: FenceRecord[];
}

export interface ParseInput {
  entry: DocMetaEntry;
  lang: Lang;
  /** Normalised (LF) source with `sourceFixes` already applied. */
  source: string;
  sourcePath: string;
  /** Path shown in error messages (default: `sourcePath`). */
  displayPath?: string | undefined;
  config: ContentConfig;
  index: DocIndex;
  issues: IssueCollector;
  linkifyIgnore: ReadonlySet<string>;
  linkifyAllow: ReadonlySet<string>;
}

function range(source: string, start: Node, end: Node = start): string {
  return source.slice(start.position?.start.offset ?? 0, end.position?.end.offset ?? 0);
}

function meaningful(children: readonly PhrasingContent[]): PhrasingContent[] {
  return children.filter((child) => !(child.type === 'text' && child.value.trim() === ''));
}

/** `**Heading**` or `**Heading** (\`04-business-types/01\`)` on a line of its own. */
export function boldOnly(
  paragraph: Paragraph,
): { strong: PhrasingContent & { type: 'strong' }; code?: string } | undefined {
  const kids = meaningful(paragraph.children);
  const [first, open, code, close] = kids;
  if (first?.type !== 'strong') return undefined;
  if (kids.length === 1) return { strong: first };
  if (
    kids.length === 4 &&
    open?.type === 'text' &&
    /^\s*\(\s*$/.test(open.value) &&
    code?.type === 'inlineCode' &&
    close?.type === 'text' &&
    /^\s*\)\s*$/.test(close.value)
  ) {
    return { strong: first, code: code.value };
  }
  return undefined;
}

function italicOnly(paragraph: Paragraph): (PhrasingContent & { type: 'emphasis' }) | undefined {
  const kids = meaningful(paragraph.children);
  const [first] = kids;
  return kids.length === 1 && first?.type === 'emphasis' ? first : undefined;
}

function isTasklist(list: List, headingText: string, markers: LangMarkers): boolean {
  if (list.children.some((item) => item.checked !== null && item.checked !== undefined))
    return true;
  return list.ordered === true && new RegExp(markers.checklistHeading, 'iu').test(headingText);
}

/** Marks sections hidden and swaps replaced blocks. Keyed by English block ids. */
export function applyStructuralOverrides(
  blocks: Block[],
  entry: DocMetaEntry,
  issues: IssueCollector,
): void {
  for (const [id, override] of Object.entries(entry.blockOverrides ?? {})) {
    const index = blocks.findIndex((block) => block.id === id);
    const target = blocks[index];
    if (!target) {
      issues.add('unknown-override', `blockOverrides refers to missing block "${id}"`, entry.id);
      continue;
    }
    if (override.replaceWith === 'toc') {
      const toc: Block = { id: target.id, hash: target.hash, kind: 'toc' };
      if (target.sourceHash) toc.sourceHash = target.sourceHash;
      blocks[index] = toc;
    }
  }
  for (const headingId of entry.hideSections ?? []) {
    const index = blocks.findIndex((block) => block.kind === 'heading' && block.id === headingId);
    const heading = blocks[index];
    if (heading?.kind !== 'heading') {
      issues.add(
        'unknown-override',
        `hideSections refers to missing heading "${headingId}"`,
        entry.id,
      );
      continue;
    }
    heading.hidden = true;
    for (const block of blocks.slice(index + 1)) {
      if (block.kind === 'heading' && block.depth <= heading.depth) break;
      block.hidden = true;
    }
  }
}

/**
 * Stage 5 of the pipeline: one markdown document → typed blocks with stable ids.
 * English is classified here; translated documents get ids, fence variants and applicability copied
 * from English afterwards (see `alignTranslation`).
 */
export function parseDocument(input: ParseInput): ParsedDoc {
  const { entry, lang, source, config, issues } = input;
  const markers = markersFor(config, lang);
  const isSourceLang = lang === 'en';
  const file = input.displayPath ?? input.sourcePath;
  const at = (node?: Node): SourceLocation => ({ file, line: node?.position?.start.line });
  const tree = parseMarkdown(source);
  const { children, generated } = stripFooter(tree.children, markers, issues, entry.id, file);

  const slugger = createSlugger();
  const ids = new BlockIdAllocator();
  const blocks: Block[] = [];
  const rawKinds: BlockKind[] = [];
  const glossary: GlossaryDraft[] = [];
  const fences: FenceRecord[] = [];
  const usedFenceOverrides = new Set<string>();
  const ctx: InlineContext = {
    docId: entry.id,
    sourcePath: input.sourcePath,
    lang,
    templateMode: entry.kind === 'template',
    index: input.index,
    legacyRefs: config.legacyRefs,
    markers,
    linkifyIgnore: input.linkifyIgnore,
    linkifyAllow: input.linkifyAllow,
    issues,
    block: 'intro',
    links: [],
    externalLinks: [],
    legacy: [],
    bareDomains: [],
    file,
  };
  const pseudoAllowed =
    entry.kind !== 'template' && entry.kind !== 'sources' && entry.kind !== 'glossary';
  const push = (block: Block): void => {
    blocks.push(block);
    rawKinds.push(block.kind);
  };
  const inline = (nodes: readonly PhrasingContent[]): InlineRun[] => transformInline(nodes, ctx);
  const tableRuns = (table: Table) => {
    const rows = table.children.map((row) => row.children.map((cell) => inline(cell.children)));
    return {
      header: rows[0] ?? [],
      rows: rows.slice(1),
      align: (table.align ?? []).map((value) => value ?? null),
    };
  };

  let h1: string | undefined;
  let headingText = '';
  let termsSeen = false;
  let glossaryGroup:
    | { id: string; title: string; block?: Extract<Block, { kind: 'glossary' }>; start?: Node }
    | undefined;

  for (let i = 0; i < children.length; i += 1) {
    const node = children[i] as RootContent;
    switch (node.type) {
      case 'heading': {
        const text = toString(node).trim();
        if (node.depth === 1) {
          if (i === 0 && h1 === undefined) h1 = text;
          else
            issues.add(
              'extra-h1',
              `unexpected level-1 heading "${text}"`,
              entry.id,
              undefined,
              at(node),
            );
          break;
        }
        if (node.depth > 3) {
          issues.add(
            'unsupported-heading-depth',
            `level-${node.depth} heading "${text}"`,
            entry.id,
            ids.heading,
            at(node),
          );
          break;
        }
        const id = slugger.slug(text);
        ids.setHeading(id);
        ctx.block = id;
        headingText = text;
        push({
          id,
          hash: shortHash(range(source, node)),
          kind: 'heading',
          depth: node.depth === 2 ? 2 : 3,
          text,
          c: inline(node.children),
        });
        glossaryGroup =
          entry.kind === 'glossary' && node.depth === 2 ? { id, title: text } : undefined;
        if (!termsSeen && text === markers.wordsUsedHeading) {
          termsSeen = true;
          const intro = children[i + 1];
          const table = children[i + 2];
          if (intro?.type !== 'paragraph' || table?.type !== 'table') {
            issues.add(
              'terms-structure',
              `"${text}" must be followed by one paragraph and a table`,
              entry.id,
              id,
              at(node),
            );
            break;
          }
          const termsId = ids.next();
          ctx.block = termsId;
          const introRuns = inline(intro.children);
          const { header, rows } = tableRuns(table);
          if (header.length !== 2 || rows.length === 0 || rows.some((row) => row.length !== 2)) {
            issues.add(
              'terms-structure',
              'the words table must have two columns and at least one row',
              entry.id,
              termsId,
              at(table),
            );
          }
          push({
            id: termsId,
            hash: shortHash(range(source, intro, table)),
            kind: 'terms',
            intro: introRuns,
            items: rows.map(([term, meaning]) => ({ term: term ?? [], meaning: meaning ?? [] })),
          });
          i += 2;
        }
        break;
      }
      case 'paragraph': {
        if (range(source, node).trim() === markers.todoMarker) {
          // `<<TODO>>` would otherwise parse as inline HTML; it marks an untranslated block.
          const id = ids.next();
          ctx.block = id;
          push({
            id,
            hash: shortHash(range(source, node)),
            kind: 'paragraph',
            c: [{ t: 'text', v: markers.todoMarker }],
          });
          break;
        }
        if (glossaryGroup) {
          const runs = inline(node.children);
          const parsed = glossaryEntryFromRuns(runs);
          if (!parsed) {
            issues.add(
              'glossary-entry',
              `expected "**Term** — Definition", got "${toString(node).slice(0, 60)}"`,
              entry.id,
              glossaryGroup.id,
              at(node),
            );
            break;
          }
          if (!glossaryGroup.block) {
            const block: Extract<Block, { kind: 'glossary' }> = {
              id: ids.next(),
              hash: '',
              kind: 'glossary',
              group: glossaryGroup.id,
            };
            glossaryGroup.block = block;
            glossaryGroup.start = node;
            push(block);
          }
          glossaryGroup.block.hash = shortHash(range(source, glossaryGroup.start ?? node, node));
          glossary.push({
            id: '',
            ...parsed,
            groupId: glossaryGroup.id,
            group: glossaryGroup.title,
            block: glossaryGroup.block.id,
          });
          break;
        }
        const next = children[i + 1];
        if (
          next?.type === 'list' &&
          isTasklist(next, headingText, markers) &&
          toString(node).trim().endsWith(':') &&
          !(pseudoAllowed && boldOnly(node))
        ) {
          break; // becomes the `group` of the tasklist that follows
        }
        const italic = entry.kind === 'template' ? italicOnly(node) : undefined;
        if (italic) {
          const id = ids.next();
          ctx.block = id;
          push({
            id,
            hash: shortHash(range(source, node)),
            kind: 'note',
            c: inline(italic.children),
          });
          break;
        }
        const bold = pseudoAllowed ? boldOnly(node) : undefined;
        if (bold) {
          const text = toString(bold.strong).trim();
          const id = slugger.slug(text);
          ids.setHeading(id);
          ctx.block = id;
          const heading: Extract<Block, { kind: 'heading' }> = {
            id,
            hash: shortHash(range(source, node)),
            kind: 'heading',
            depth: 4,
            pseudo: true,
            text,
            c: inline(bold.strong.children),
          };
          if (bold.code !== undefined) {
            const resolution = resolveLegacyRef(bold.code, config.legacyRefs);
            if (resolution.kind === 'docref' && 'doc' in resolution.run) {
              heading.ref = resolution.run.doc;
              ctx.legacy.push({
                doc: entry.id,
                block: id,
                code: bold.code,
                target: resolution.run.doc,
              });
            } else {
              issues.add(
                'pseudo-heading-ref',
                `\`${bold.code}\` after "${text}" does not resolve to a document`,
                entry.id,
                id,
                at(node),
              );
            }
          }
          push(heading);
          break;
        }
        const id = ids.next();
        ctx.block = id;
        push({
          id,
          hash: shortHash(range(source, node)),
          kind: 'paragraph',
          c: inline(node.children),
        });
        break;
      }
      case 'list': {
        const id = ids.next();
        ctx.block = id;
        const previous = children[i - 1];
        const task = isTasklist(node, headingText, markers);
        const groupNode =
          task &&
          previous?.type === 'paragraph' &&
          toString(previous).trim().endsWith(':') &&
          !(pseudoAllowed && boldOnly(previous)) &&
          !glossaryGroup
            ? previous
            : undefined;
        const checkedStates = new Set(
          node.children.map((item) => item.checked === null || item.checked === undefined),
        );
        if (checkedStates.size > 1) {
          issues.add(
            'mixed-tasklist',
            'a list mixes "- [ ]" items with plain items',
            entry.id,
            id,
            at(node),
          );
        }
        const items = node.children.map((item) => {
          const [first, ...rest] = item.children;
          if (first?.type !== 'paragraph' || rest.length > 0) {
            issues.add(
              'unsupported-list-item',
              'list items must be a single paragraph',
              entry.id,
              id,
              at(item),
            );
          }
          return first?.type === 'paragraph' ? inline(first.children) : [];
        });
        const hash = shortHash(range(source, groupNode ?? node, node));
        if (task) {
          const block: Extract<Block, { kind: 'tasklist' }> = {
            id,
            hash,
            kind: 'tasklist',
            items: items.map((c) => ({ id: '', c, doc: entry.id, block: id })),
          };
          if (groupNode?.type === 'paragraph') {
            const group = trimRuns(inline(groupNode.children));
            const last = group.at(-1);
            if (last?.t === 'text')
              group[group.length - 1] = { t: 'text', v: last.v.replace(/:\s*$/, '') };
            block.group = trimRuns(group);
          }
          push(block);
        } else {
          const block: Extract<Block, { kind: 'list' }> = {
            id,
            hash,
            kind: 'list',
            ordered: node.ordered === true,
            items,
          };
          if (node.ordered === true && typeof node.start === 'number') block.start = node.start;
          push(block);
        }
        break;
      }
      case 'blockquote': {
        const id = ids.next();
        ctx.block = id;
        const [first, ...rest] = node.children;
        if (first?.type !== 'paragraph' || rest.length > 0) {
          issues.add(
            'unsupported-blockquote',
            'a blockquote must be a single paragraph',
            entry.id,
            id,
            at(node),
          );
          break;
        }
        const runs = inline(first.children);
        const lead = runs[0];
        const plain = lead?.t === 'strong' && runsToText(lead.c).trim() === markers.plainWords;
        const previous = blocks.at(-1);
        const callout: Extract<Block, { kind: 'callout' }> = {
          id,
          hash: shortHash(range(source, node)),
          kind: 'callout',
          style: plain ? 'plain' : 'note',
          c: plain ? trimRuns(runs.slice(1)) : runs,
        };
        if (plain && previous) callout.pairsWith = previous.id;
        push(callout);
        break;
      }
      case 'table': {
        const id = ids.next();
        ctx.block = id;
        push({ id, hash: shortHash(range(source, node)), kind: 'table', ...tableRuns(node) });
        break;
      }
      case 'code': {
        const id = ids.next();
        ctx.block = id;
        const text = node.value;
        const placeholders = extractFencePlaceholders(text, markers);
        let variant: FenceVariant = 'snippet';
        let rule: FenceRule | 'copied' = 'copied';
        if (isSourceLang) {
          const override = entry.fenceOverrides?.[id];
          if (override) usedFenceOverrides.add(id);
          const classified = classifyFence(text, {
            override,
            docDefault: entry.fenceVariant,
            hasPlaceholders: placeholders.length > 0,
          });
          if (classified) {
            variant = classified.variant;
            rule = classified.rule;
          } else {
            issues.add(
              'unclassified-fence',
              `cannot classify the fence starting "${text.split('\n')[0]?.slice(0, 50) ?? ''}"; add fenceOverrides["${id}"]`,
              entry.id,
              id,
              at(node),
            );
          }
        }
        const block: Extract<Block, { kind: 'code' }> = {
          id,
          hash: shortHash(range(source, node)),
          kind: 'code',
          variant,
          text,
        };
        if (
          placeholders.length > 0 &&
          (!isSourceLang || variant === 'prompt' || variant === 'template-preview')
        ) {
          block.placeholders = placeholders;
        }
        push(block);
        fences.push({
          doc: entry.id,
          block: id,
          variant,
          rule,
          lines: text.split('\n').length,
          firstLine: text.split('\n')[0] ?? '',
        });
        break;
      }
      case 'thematicBreak': {
        const id = ids.next();
        push({ id, hash: shortHash(range(source, node)), kind: 'hr' });
        break;
      }
      default:
        issues.add(
          'unsupported-block',
          `unsupported markdown node "${node.type}"`,
          entry.id,
          ids.heading,
          at(node),
        );
    }
  }

  if (h1 === undefined)
    issues.add(
      'missing-h1',
      'the document must start with a level-1 heading',
      entry.id,
      undefined,
      at(),
    );
  if (isSourceLang) {
    for (const id of Object.keys(entry.fenceOverrides ?? {})) {
      if (!usedFenceOverrides.has(id))
        issues.add('unknown-override', `fenceOverrides refers to missing fence "${id}"`, entry.id);
    }
    applyStructuralOverrides(blocks, entry, issues);
  }

  return {
    entry,
    lang,
    sourcePath: input.sourcePath,
    contentHash: shortHash(source),
    h1: h1 ?? entry.id,
    blocks,
    rawKinds,
    generated,
    glossary,
    links: ctx.links,
    externalLinks: ctx.externalLinks,
    bareDomains: ctx.bareDomains,
    legacy: ctx.legacy,
    fences,
  };
}
