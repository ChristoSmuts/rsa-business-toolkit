import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checklistParts, checklistsByDoc } from '../../../src/lib/checklist';
import { TasksFileSchema, type Block, type TasksFile } from '../../../src/lib/content/schema';
import { DATA_DIR, realDoc, realManifest } from './data';

const manifest = realManifest();
const tasks: TasksFile = TasksFileSchema.parse(
  JSON.parse(readFileSync(path.join(DATA_DIR, 'en', 'tasks.json'), 'utf8')),
);

describe('checklistParts on the real master checklist', () => {
  const doc = realDoc('lookup/checklist');
  const parts = checklistParts(doc.blocks);

  it('groups the tasks under Parts A, A2 and B, and leaves out the parts with none', () => {
    expect(parts.map((part) => part.id)).toEqual([
      'part-a-everyone-in-order',
      'part-a2-extra-only-if-you-registered-a-pty-ltd',
      'part-b-additions-by-business-type',
    ]);
    expect(parts[0]?.title).toBe('Part A: everyone, in order');
  });

  it('counts every task on the page exactly once', () => {
    const onPage = doc.blocks.flatMap((block) =>
      block.kind === 'tasklist' ? block.items.map((task) => task.id) : [],
    );
    expect(parts.flatMap((part) => part.taskIds)).toEqual(onPage);
  });
});

describe('checklistParts edge cases', () => {
  const heading = (id: string, depth: 2 | 3 | 4, pseudo?: true): Block =>
    ({
      kind: 'heading',
      id,
      hash: 'h',
      depth,
      text: id,
      c: [{ t: 'text', v: id }],
      ...(pseudo ? { pseudo } : {}),
    }) as unknown as Block;
  const list = (...ids: string[]): Block =>
    ({
      kind: 'tasklist',
      id: `list-${ids.join('-')}`,
      hash: 'h',
      items: ids.map((id) => ({ id, c: [{ t: 'text', v: id }], doc: 'd', block: 'b' })),
    }) as unknown as Block;

  it('puts tasks before the first ## under an unnamed part', () => {
    expect(checklistParts([list('x'), heading('two', 2), list('y')])).toEqual([
      { id: '', title: '', taskIds: ['x'] },
      { id: 'two', title: 'two', taskIds: ['y'] },
    ]);
  });

  it('keeps ### and pseudo headings inside the part above them', () => {
    const blocks = [
      heading('a', 2),
      heading('sub', 3),
      list('x'),
      heading('lead', 4, true),
      list('y'),
    ];
    expect(checklistParts(blocks)).toEqual([{ id: 'a', title: 'a', taskIds: ['x', 'y'] }]);
  });
});

describe('checklistsByDoc', () => {
  const docs = checklistsByDoc(manifest, tasks, 'lookup/checklist');

  it('lists every other document that has a checklist, in reading order', () => {
    const ids = docs.map((entry) => entry.docId);
    expect(ids).not.toContain('lookup/checklist');
    expect(ids).toContain('core/what-you-need-to-sell-things');
    expect(ids).toContain('business-types/vehicle-dealer');
    const order = ids.map((id) =>
      manifest.sections.findIndex((s) => s.id === manifest.docs[id]?.section),
    );
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('carries every task of those documents', () => {
    const expected = tasks.tasks.filter((task) => task.doc !== 'lookup/checklist').length;
    expect(docs.reduce((sum, entry) => sum + entry.taskIds.length, 0)).toBe(expected);
  });

  it('keeps a document the manifest does not order, after the others', () => {
    const extra: TasksFile = {
      ...tasks,
      tasks: [...tasks.tasks, { ...tasks.tasks[0]!, id: 'zz/unknown:00000000', doc: 'zz/unknown' }],
    };
    const result = checklistsByDoc(manifest, extra, 'lookup/checklist');
    expect(result.at(-1)).toEqual({ docId: 'zz/unknown', taskIds: ['zz/unknown:00000000'] });
  });
});
