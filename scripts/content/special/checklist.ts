import type { Block, Doc, Task, TaskRecord } from '../../../src/lib/content/schema';
import type { IssueCollector } from '../errors';
import { TaskIdAllocator, taskIdBase } from '../ids';
import { runsToText } from '../text';

/**
 * Assigns `docId:sha1(normalised English text)[0..8]` ids. Reordering tasks never changes an id.
 * Two tasks with the same text in one document are a build error: their ids would differ only by a `-2`
 * suffix, and removing the first would move a saved tick to the second.
 */
export function assignTaskIds(
  blocks: readonly Block[],
  docId: string,
  issues?: IssueCollector,
): void {
  const allocator = new TaskIdAllocator();
  const firstBlock = new Map<string, string>();
  for (const block of blocks) {
    if (block.kind !== 'tasklist') continue;
    for (const task of block.items) {
      const text = runsToText(task.c);
      task.id = allocator.allocate(docId, text);
      task.doc = docId;
      task.block = block.id;
      const base = taskIdBase(docId, text);
      const previous = firstBlock.get(base);
      if (previous === undefined) firstBlock.set(base, block.id);
      else {
        issues?.add(
          'duplicate-task',
          `the task "${text.trim()}" repeats a task in ${previous}. Task ids come from the text, so reword one of them.`,
          docId,
          block.id,
        );
      }
    }
  }
}

/** The flattened task registry written to `tasks.json`. */
export function collectTaskRecords(docs: readonly Doc[]): TaskRecord[] {
  const records: TaskRecord[] = [];
  let order = 0;
  for (const doc of docs) {
    let heading: string | undefined;
    for (const block of doc.blocks) {
      if (block.kind === 'heading') heading = block.id;
      if (block.kind !== 'tasklist') continue;
      for (const task of block.items) {
        const record: TaskRecord = { id: task.id, c: task.c, doc: doc.id, block: block.id, order };
        if (task.when) record.when = task.when;
        if (task.sameAs) record.sameAs = task.sameAs;
        if (heading) record.heading = heading;
        if (block.group) record.group = block.group;
        records.push(record);
        order += 1;
      }
    }
  }
  return records;
}

/** Where a task lives, for `linkTasks`. */
interface LinkableDoc {
  readonly id: string;
  readonly kind: string;
  readonly blocks: readonly Block[];
}

/**
 * Applies `content-meta/task-links.json`: each document task listed there gets `sameAs`, the id of
 * the master-checklist task it repeats, so both copies share one saved tick. Run on the English
 * documents after `assignTaskIds`; translations copy `sameAs` by position with the task id.
 *
 * Every link between two built documents is checked, and a bad one is a build error:
 * - both ids exist (`task-link-unknown`);
 * - the target is on the master checklist and the source is not (`task-link-target`);
 * - no chains: a target is never itself linked (`task-link-chain`);
 * - one link per master task (`task-link-twice`), so one tick never stands for two different
 *   document tasks.
 */
export function linkTasks(
  docs: readonly LinkableDoc[],
  links: Readonly<Record<string, string>>,
  issues: IssueCollector,
): void {
  const tasks = new Map<string, { task: Task; doc: LinkableDoc }>();
  for (const doc of docs) {
    for (const block of doc.blocks) {
      if (block.kind !== 'tasklist') continue;
      for (const task of block.items) tasks.set(task.id, { task, doc });
    }
  }
  const built = new Set(docs.map((doc) => doc.id));
  const docOf = (taskId: string): string => taskId.split(':')[0] ?? '';
  const targets = new Map<string, string>();
  for (const [from, to] of Object.entries(links)) {
    // A link between documents that are not both in this build is not checked (partial builds).
    if (!built.has(docOf(from)) || !built.has(docOf(to))) continue;
    const source = tasks.get(from);
    const target = tasks.get(to);
    if (!source || !target) {
      issues.add(
        'task-link-unknown',
        `task-links.json links "${from}" to "${to}", and ${source ? `"${to}"` : `"${from}"`} is not a task`,
      );
      continue;
    }
    if (target.doc.kind !== 'checklist' || source.doc.kind === 'checklist') {
      issues.add(
        'task-link-target',
        `task-links.json must link a document task to a master-checklist task: "${from}" -> "${to}"`,
      );
      continue;
    }
    if (to in links) {
      issues.add(
        'task-link-chain',
        `task-links.json links "${from}" to "${to}", which is itself linked`,
      );
      continue;
    }
    const earlier = targets.get(to);
    if (earlier !== undefined) {
      issues.add(
        'task-link-twice',
        `task-links.json links both "${earlier}" and "${from}" to "${to}"; one master task stands for one document task`,
      );
      continue;
    }
    targets.set(to, from);
    source.task.sameAs = to;
  }
}
