import type {
  Block,
  DocrefRun,
  InlineRun,
  Lang,
  QuickAnswersFile,
} from '../../../src/lib/content/schema';
import type { IssueCollector } from '../errors';
import { createSlugger } from '../ids';
import { runsToText } from '../text';

/** Separator-only leftovers such as `and` or `,` are not worth keeping as a note. */
const CONNECTOR_ONLY = /^(?:[,;]|and|or|en|of)?$/i;

/**
 * Path 3 of `start/how-to-use`: a two-column question table whose second column holds old-scheme refs
 * and links. Each row becomes `{question, targets[], note?}`.
 */
export function buildQuickAnswers(
  lang: Lang,
  docId: string,
  blocks: readonly Block[],
  headingId: string,
  issues: IssueCollector,
): QuickAnswersFile | undefined {
  const headingIndex = blocks.findIndex(
    (block) => block.kind === 'heading' && block.id === headingId,
  );
  const heading = blocks[headingIndex];
  if (heading?.kind !== 'heading') {
    issues.add('quick-answers', `heading "${headingId}" not found`, docId);
    return undefined;
  }
  const table = blocks
    .slice(headingIndex + 1)
    .find(
      (block) =>
        block.kind === 'table' || (block.kind === 'heading' && block.depth <= heading.depth),
    );
  if (table?.kind !== 'table') {
    issues.add('quick-answers', `no table under "${headingId}"`, docId);
    return undefined;
  }
  const ids = createSlugger();
  const items: QuickAnswersFile['items'] = [];
  for (const row of table.rows) {
    const [question, answer] = row;
    if (!question || !answer) continue;
    const targets: DocrefRun[] = [];
    const rest: InlineRun[] = [];
    for (const run of answer) {
      if (run.t === 'docref') targets.push(run);
      else if (run.t === 'link' && 'doc' in run)
        targets.push({ t: 'docref', doc: run.doc, label: runsToText(run.c) });
      else rest.push(run);
    }
    if (targets.length === 0) {
      issues.add(
        'quick-answers',
        `question "${runsToText(question)}" has no target document`,
        docId,
        table.id,
      );
      continue;
    }
    const item: QuickAnswersFile['items'][number] = {
      id: ids.slug(runsToText(question)),
      question,
      targets,
    };
    const note = runsToText(rest)
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[,;]\s*/, '');
    if (!CONNECTOR_ONLY.test(note)) item.note = [{ t: 'text', v: note }];
    items.push(item);
  }
  return { lang, doc: docId, items };
}
