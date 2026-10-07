/**
 * "Only what applies to me" over the real content: for every document in both languages and every
 * one of the 49 single-type answers, nothing that applies to the reader may end up hidden. A part
 * applies when its heading's condition does (the pipeline gives each heading its parent's condition
 * unless `applicability.json` overrides it) and, for a checklist item or a table row, its own
 * condition does too. Review WP-31 pass 3, major 1: "Provisional tax" (for everyone) was folded into
 * "What SARS wants from a sole proprietor" for a Pty Ltd reader.
 *
 * The page structure is what `Blocks.astro` renders: flat siblings, a `HiddenMarker` before every
 * heading with a condition, checklist items as `label.st-check`, table rows as `tr`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { applies, appliesAttributes, type AppliesTo } from '../../src/lib/applicability';
import type { Block, Doc } from '../../src/lib/content/schema';
import { profileOf, singleChoices } from '../../src/lib/profile';
import { filterByProfile, FILTERED } from '../../src/scripts/applies';
import { REPO_ROOT } from '../unit/site/data';

interface Part {
  readonly element: HTMLElement;
  readonly label: string;
  /** The heading's condition (and the item's or row's own), all of which must apply. */
  readonly conditions: readonly AppliesTo[];
}

function attributes(element: HTMLElement, appliesTo: AppliesTo): void {
  const attrs = appliesAttributes(appliesTo);
  if (Object.keys(attrs).length === 0) return;
  element.setAttribute('data-applies', '');
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
}

/** Mounts a document's blocks and lists every part with the conditions it needs. */
function mountDoc(doc: Doc): Part[] {
  document.body.innerHTML = '';
  const parts: Part[] = [];
  let heading: AppliesTo;
  let headingId = '(top)';
  for (const [index, block] of (doc.blocks as Block[]).entries()) {
    if (block.kind === 'heading') {
      if (block.hidden) continue;
      heading = block.appliesTo;
      headingId = block.id;
      const filterable = Object.keys(appliesAttributes(block.appliesTo)).length > 0;
      if (filterable) {
        const marker = document.createElement('div');
        marker.className = 'st-hidden-marker';
        marker.dataset['markerFor'] = block.id;
        marker.hidden = true;
        document.body.append(marker);
      }
      const element = document.createElement(`h${block.depth}`);
      element.id = block.id;
      element.dataset['depth'] = String(block.depth);
      attributes(element, block.appliesTo);
      document.body.append(element);
      parts.push({ element, label: `#${block.id}`, conditions: [heading] });
      continue;
    }
    if (block.kind === 'tasklist') {
      const list = document.createElement('st-checklist');
      const fieldset = document.createElement('fieldset');
      list.append(fieldset);
      block.items.forEach((task, item) => {
        const label = document.createElement('label');
        label.className = 'st-check';
        attributes(label, task.when);
        fieldset.append(label);
        parts.push({
          element: label,
          label: `${headingId} task ${item}`,
          conditions: [heading, task.when],
        });
      });
      const line = document.createElement('div');
      line.className = 'st-tasklist__hidden';
      line.hidden = true;
      list.append(line);
      document.body.append(list);
      continue;
    }
    if (block.kind === 'table') {
      const table = document.createElement('table');
      const body = document.createElement('tbody');
      table.append(body);
      block.rows.forEach((_, row) => {
        const tr = document.createElement('tr');
        const when = block.rowWhen?.[row] ?? undefined;
        attributes(tr, when);
        body.append(tr);
        parts.push({ element: tr, label: `${headingId} row ${row}`, conditions: [heading, when] });
      });
      document.body.append(table);
      continue;
    }
    const element = document.createElement('div');
    element.dataset['block'] = String(index);
    document.body.append(element);
    parts.push({
      element,
      label: `${headingId} block ${index} (${block.kind})`,
      conditions: [heading],
    });
  }
  return parts;
}

const profiles = singleChoices().map(profileOf);
const hiddenItems = (count: number): string => `${count} hidden`;

afterAll(() => {
  document.body.innerHTML = '';
});

describe('“Only what applies to me” on the real content, for all 49 answers', () => {
  it('has 49 answers to check', () => {
    expect(profiles).toHaveLength(49);
  });

  for (const locale of ['en', 'af'] as const) {
    const dir = path.join(REPO_ROOT, 'src', 'data', locale, 'docs');
    const files = readdirSync(dir).filter((name) => name.endsWith('.json'));

    it(`${locale}: hides nothing that applies to the reader`, () => {
      expect(files.length).toBeGreaterThan(30);
      const problems = new Set<string>();
      for (const file of files) {
        const doc = JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as Doc;
        const parts = mountDoc(doc);
        for (const who of profiles) {
          filterByProfile(document.body, who, { markers: true, hiddenItems });
          for (const part of parts) {
            const forReader = part.conditions.every((condition) => applies(condition, who));
            if (forReader && part.element.closest(`.${FILTERED}`))
              problems.add(
                `${doc.id} ${part.label} hidden for ${who.entity}/${who.businessTypes[0]}`,
              );
          }
        }
      }
      expect([...problems]).toEqual([]);
    });
  }
});
