/**
 * What a business-type page shows in its facts (`TypeFacts`) and "Go straight to" (`TypeJump`)
 * (WP-50 Phase 3, item 3), taken from content that is already in the guide: nothing here adds a
 * fact.
 *
 * - The "Main reason" cell of the hub's effort table ("How much regulation each type carries" in
 *   "Pick your business type"), in the hub's language. The table's rows are found by their English
 *   labels (`pickTable.rows` in `content-meta/business-types.json`, which `content:check` holds
 *   against the table), and the translated table has the same rows in the same order
 *   (`content:fidelity`).
 * - The sections of the type's own document that answer "how long does it take" and "what do I
 *   tick off", by heading id (`BusinessType.glance`), with their headings' words in
 *   the document's language.
 */
import { plainText } from './content/render';
import type { Block, BusinessType, Doc, InlineRun } from './content/schema';

type TableBlock = Extract<Block, { kind: 'table' }>;

/** The first table after the heading `headingId` in `doc`. */
function tableAfter(doc: Pick<Doc, 'blocks'>, headingId: string): TableBlock | undefined {
  const start = doc.blocks.findIndex((block) => block.kind === 'heading' && block.id === headingId);
  if (start < 0) return undefined;
  return doc.blocks.slice(start + 1).find((block): block is TableBlock => block.kind === 'table');
}

export interface PickTable {
  readonly heading: string;
  readonly rows: Readonly<Record<string, string>>;
}

/**
 * The effort table's "Main reason" for `typeId` (its third column), in `hub`'s language, or
 * `undefined` when the table or the row is missing (the panel then shows the meter alone).
 */
export function effortReason(
  pickTable: PickTable,
  englishHub: Pick<Doc, 'blocks'>,
  hub: Pick<Doc, 'blocks'>,
  typeId: string,
): InlineRun[] | undefined {
  const english = tableAfter(englishHub, pickTable.heading);
  const translated = tableAfter(hub, pickTable.heading);
  if (!english || !translated || english.rows.length !== translated.rows.length) return undefined;
  const index = english.rows.findIndex(
    (row) => pickTable.rows[plainText(row[0] ?? []).trim()] === typeId,
  );
  const cell = index < 0 ? undefined : translated.rows[index]?.[2];
  return cell && cell.length > 0 ? cell : undefined;
}

export interface GlanceLink {
  readonly id: string;
  readonly text: string;
  readonly kind: 'timing' | 'checklist';
}

/**
 * The sections "Go straight to" links to: how long it takes (where the page says) and the
 * checklist, which is the end of a long page. The "what you need" sections are left out (review
 * pass 1, minor 5): the first starts right under the disclosures, and the rest are in "On this
 * page" just below.
 */
export function glanceLinks(type: BusinessType, doc: Pick<Doc, 'headings'>): GlanceLink[] {
  const { timing, checklist } = type.glance;
  const wanted: [string, GlanceLink['kind']][] = [
    ...(timing ? [[timing, 'timing'] as [string, GlanceLink['kind']]] : []),
    [checklist, 'checklist'],
  ];
  return wanted.flatMap(([id, kind]) => {
    const heading = doc.headings.find((entry) => entry.id === id && !entry.pseudo);
    return heading ? [{ id, text: heading.text, kind }] : [];
  });
}
