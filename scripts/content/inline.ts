import type { PhrasingContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { InlineRun, InternalLinkRun, Lang } from '../../src/lib/content/schema';
import type { LangMarkers, LegacyRefs } from './config';
import type { IssueCollector, SourceLocation } from './errors';
import { linkifyText, normaliseExternalHref } from './linkify';
import { applyPlaceholders, applySiglines } from './placeholders';
import { resolveInternalLink, resolveLegacyRef, type DocIndex } from './refs';
import { mergeTextRuns, runsToText } from './text';

export interface LinkUse {
  from: string;
  block: string;
  doc: string;
  anchor?: string | undefined;
}

export interface LegacyUse {
  doc: string;
  block: string;
  code: string;
  target: string;
}

export interface InlineContext {
  docId: string;
  sourcePath: string;
  lang: Lang;
  /** Template documents: `[SQUARE BRACKETS]` become placeholder runs. */
  templateMode: boolean;
  index: DocIndex;
  legacyRefs: LegacyRefs;
  markers: LangMarkers;
  linkifyIgnore: ReadonlySet<string>;
  /** Hosts that a bare domain in prose may link to. */
  linkifyAllow: ReadonlySet<string>;
  issues: IssueCollector;
  /** Id of the block being transformed, for error locations and link records. */
  block: string;
  links: LinkUse[];
  externalLinks: string[];
  legacy: LegacyUse[];
  /** Hosts of bare domains that became links. */
  bareDomains: string[];
  /** Markdown path shown in error messages. */
  file?: string | undefined;
}

interface State {
  inLink: boolean;
  lastFolder: string | undefined;
}

function locate(ctx: InlineContext, node: PhrasingContent): SourceLocation | undefined {
  return ctx.file === undefined ? undefined : { file: ctx.file, line: node.position?.start.line };
}

function transformNodes(
  nodes: readonly PhrasingContent[],
  ctx: InlineContext,
  state: State,
): InlineRun[] {
  const out: InlineRun[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'text': {
        if (/\p{L}/u.test(node.value)) state.lastFolder = undefined;
        node.value.split('\n').forEach((part, index) => {
          if (index > 0) out.push({ t: 'br' });
          if (part === '') return;
          if (state.inLink) {
            out.push({ t: 'text', v: part });
            return;
          }
          for (const run of linkifyText(part, ctx.linkifyIgnore)) {
            if (run.t === 'link' && 'href' in run) {
              const host = new URL(run.href).hostname;
              /*
               * Known limits of the allow list, both acceptable for authors who already edit
               * content-meta: a token that looks like a host (`ASP.NET`) trips this check and needs an
               * entry in linkify.ignoreDomains, and an address written in full (`https://…`, `www.…`)
               * is a link by markdown's own rules, so it never reaches the list at all.
               */
              if (!ctx.linkifyAllow.has(host)) {
                ctx.issues.add(
                  'unknown-bare-domain',
                  `"${runsToText(run.c)}" would become a link to ${host}. Add a real host to linkify.allowDomains, or an example name to linkify.ignoreDomains, in docs.meta.json`,
                  ctx.docId,
                  ctx.block,
                  locate(ctx, node),
                );
              }
              ctx.bareDomains.push(host);
              ctx.externalLinks.push(run.href);
            }
            out.push(run);
          }
        });
        break;
      }
      case 'strong':
      case 'emphasis': {
        const c = transformNodes(node.children, ctx, state);
        if (c.length > 0) out.push({ t: node.type === 'strong' ? 'strong' : 'em', c });
        break;
      }
      case 'inlineCode': {
        const resolution = resolveLegacyRef(node.value, ctx.legacyRefs, state.lastFolder);
        if (resolution.kind === 'docref') {
          out.push(resolution.run);
          state.lastFolder = resolution.folder;
          const target =
            'doc' in resolution.run ? resolution.run.doc : `section:${resolution.run.section}`;
          ctx.legacy.push({ doc: ctx.docId, block: ctx.block, code: node.value, target });
        } else {
          if (resolution.kind === 'error') {
            ctx.issues.add(
              'unresolved-legacy-ref',
              resolution.message,
              ctx.docId,
              ctx.block,
              locate(ctx, node),
            );
          }
          out.push({ t: 'code', v: node.value });
        }
        break;
      }
      case 'link': {
        const c = transformNodes(node.children, ctx, { inLink: true, lastFolder: undefined });
        if (/^https?:\/\//i.test(node.url)) {
          const href = normaliseExternalHref(node.url, toString(node));
          ctx.externalLinks.push(href);
          out.push({ t: 'link', href, external: true, c });
          break;
        }
        if (/^mailto:/i.test(node.url)) {
          const address = node.url.slice('mailto:'.length);
          if (toString(node) === address) {
            // GFM turns a bare address such as info@example.co.za into a mailto link: keep it as text.
            out.push({ t: 'text', v: address });
          } else {
            ctx.issues.add(
              'unsupported-link',
              `email links are not supported ("${node.url}"); write the address as plain text`,
              ctx.docId,
              ctx.block,
              locate(ctx, node),
            );
            out.push(...c);
          }
          break;
        }
        const resolved = resolveInternalLink(node.url, ctx.sourcePath, ctx.index);
        if ('error' in resolved) {
          ctx.issues.add(
            'unresolved-link',
            resolved.error,
            ctx.docId,
            ctx.block,
            locate(ctx, node),
          );
          out.push(...c);
          break;
        }
        const run: InternalLinkRun = { t: 'link', doc: resolved.doc, c };
        if (resolved.anchor !== undefined) run.anchor = resolved.anchor;
        out.push(run);
        ctx.links.push({
          from: ctx.docId,
          block: ctx.block,
          doc: resolved.doc,
          anchor: resolved.anchor,
        });
        break;
      }
      case 'break':
        out.push({ t: 'br' });
        break;
      default: {
        ctx.issues.add(
          'unsupported-inline',
          `unsupported inline node "${node.type}"`,
          ctx.docId,
          ctx.block,
          locate(ctx, node),
        );
        const text = toString(node);
        if (text !== '') out.push({ t: 'text', v: text });
      }
    }
  }
  return out;
}

/**
 * mdast phrasing content → InlineRun[]: soft line breaks become `br`, internal links resolve to doc ids,
 * old-scheme inline code becomes `docref`, bare domains on the allow list become external links, bare email
 * addresses stay text, 10+ underscores become `sigline`, and in templates `[SQUARE BRACKETS]` become
 * placeholders.
 */
export function transformInline(
  nodes: readonly PhrasingContent[],
  ctx: InlineContext,
): InlineRun[] {
  let runs = mergeTextRuns(transformNodes(nodes, ctx, { inLink: false, lastFolder: undefined }));
  runs = applySiglines(runs);
  if (ctx.templateMode) runs = applyPlaceholders(runs, ctx.markers);
  return mergeTextRuns(runs);
}
