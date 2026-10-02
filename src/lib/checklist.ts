/**
 * Pure helpers for the master checklist page (`/checklist/`, build plan B6): its parts and the
 * checklists that live on other pages. Rendered by `ChecklistSummary.astro` and
 * `ChecklistElsewhere.astro`; the live counts come from `<st-checklist-progress>`.
 */
import { sectionDocIds, orderedSections } from './content/manifest';
import type { Block, Manifest, TasksFile } from './content/schema';

export interface ChecklistPart {
  /** The id of the `##` heading the part starts at. */
  readonly id: string;
  /** The heading's text, in the document's language. */
  readonly title: string;
  /** Every task id in the part, in page order. */
  readonly taskIds: readonly string[];
}

/**
 * The document's tasks grouped under the `##` heading above them ("Part A: everyone, in order").
 * Parts with no tasks (Part C is a table, Part D a list) are left out. Tasks before the first `##`
 * fall under a part with an empty id and title, which callers can show without a label.
 */
export function checklistParts(blocks: readonly Block[]): ChecklistPart[] {
  const parts: { id: string; title: string; taskIds: string[] }[] = [];
  let current: { id: string; title: string; taskIds: string[] } | undefined;
  for (const block of blocks) {
    if (block.kind === 'heading' && block.depth === 2 && !block.pseudo) {
      current = { id: block.id, title: block.text, taskIds: [] };
      parts.push(current);
    } else if (block.kind === 'tasklist') {
      if (!current) {
        current = { id: '', title: '', taskIds: [] };
        parts.push(current);
      }
      current.taskIds.push(...block.items.map((task) => task.id));
    }
  }
  return parts.filter((part) => part.taskIds.length > 0);
}

export interface DocChecklist {
  readonly docId: string;
  readonly taskIds: readonly string[];
}

/**
 * The checklists on every page except `exclude`, in reading order (sections, then documents in
 * their section). Task ids are the same in every language, so the English task list serves all.
 */
export function checklistsByDoc(
  manifest: Manifest,
  tasks: TasksFile,
  exclude: string,
): DocChecklist[] {
  const byDoc = new Map<string, string[]>();
  for (const task of tasks.tasks) {
    if (task.doc === exclude) continue;
    const list = byDoc.get(task.doc) ?? [];
    list.push(task.id);
    byDoc.set(task.doc, list);
  }
  const ordered: DocChecklist[] = [];
  for (const section of orderedSections(manifest)) {
    for (const docId of sectionDocIds(manifest, section.id)) {
      const taskIds = byDoc.get(docId);
      if (taskIds) ordered.push({ docId, taskIds });
      byDoc.delete(docId);
    }
  }
  // A document the manifest does not order still counts; keep it, sorted by id.
  for (const [docId, taskIds] of [...byDoc].sort(([a], [b]) => a.localeCompare(b))) {
    ordered.push({ docId, taskIds });
  }
  return ordered;
}
