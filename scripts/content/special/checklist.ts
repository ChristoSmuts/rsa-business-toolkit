import type { Block, Doc, TaskRecord } from '../../../src/lib/content/schema';
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
        if (heading) record.heading = heading;
        if (block.group) record.group = block.group;
        records.push(record);
        order += 1;
      }
    }
  }
  return records;
}
