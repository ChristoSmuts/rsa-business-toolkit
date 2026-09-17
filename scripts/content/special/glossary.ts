import type { Block, GlossaryFile, InlineRun, Lang } from '../../../src/lib/content/schema';
import type { IssueCollector } from '../errors';
import { slug } from '../ids';
import { runsToText, trimRuns } from '../text';

export interface GlossaryDraft {
  id: string;
  term: string;
  definition: InlineRun[];
  groupId: string;
  group: string;
  block: string;
}

/** `**Term** — Definition` → term and definition. The em dash (U+2014) with spaces is the separator. */
export function glossaryEntryFromRuns(
  runs: readonly InlineRun[],
): { term: string; definition: InlineRun[] } | undefined {
  const [first, second, ...rest] = runs;
  if (first?.t !== 'strong' || second?.t !== 'text') return undefined;
  const separator = /^\s+—\s+/.exec(second.v);
  if (!separator) return undefined;
  const term = runsToText(first.c).trim();
  const definition = trimRuns([{ t: 'text', v: second.v.slice(separator[0].length) }, ...rest]);
  if (term === '' || definition.length === 0) return undefined;
  return { term, definition };
}

/** English glossary ids are the github slug of the term; a duplicate is an error, never a `-1` suffix. */
export function assignGlossaryIds(
  drafts: GlossaryDraft[],
  docId: string,
  issues: IssueCollector,
): void {
  const seen = new Map<string, string>();
  for (const draft of drafts) {
    const id = slug(draft.term);
    const previous = seen.get(id);
    if (id === '')
      issues.add('glossary-id', `term "${draft.term}" has an empty slug`, docId, draft.block);
    else if (previous !== undefined) {
      issues.add(
        'glossary-id',
        `terms "${previous}" and "${draft.term}" share the id "${id}"`,
        docId,
        draft.block,
      );
    }
    seen.set(id, draft.term);
    draft.id = id;
  }
}

export function buildGlossaryFile(
  lang: Lang,
  docId: string,
  blocks: readonly Block[],
  drafts: readonly GlossaryDraft[],
): GlossaryFile {
  const groupIds = new Set(drafts.map((draft) => draft.groupId));
  const groups = blocks
    .filter(
      (block): block is Extract<Block, { kind: 'heading' }> =>
        block.kind === 'heading' && groupIds.has(block.id),
    )
    .map((heading, index) => ({ id: heading.id, title: heading.text, order: index + 1 }));
  return {
    lang,
    doc: docId,
    groups,
    entries: drafts.map((draft) => ({
      id: draft.id,
      term: draft.term,
      definition: draft.definition,
      group: draft.group,
      groupId: draft.groupId,
    })),
  };
}
