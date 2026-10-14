import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { effortReason, glanceLinks } from '../../src/lib/business-types';
import { plainText } from '../../src/lib/content/render';
import { BusinessTypesFileSchema, DocSchema, type Doc } from '../../src/lib/content/schema';
import { DATA_DIR, realDoc } from './site/data';

/** WP-50 Phase 3, item 3: what a business type's facts and "Go straight to" take from the guide. */
const file = BusinessTypesFileSchema.parse(
  JSON.parse(
    readFileSync(path.join(DATA_DIR, '..', '..', 'content-meta', 'business-types.json'), 'utf8'),
  ),
);
const afDoc = (id: string): Doc =>
  DocSchema.parse(
    JSON.parse(
      readFileSync(path.join(DATA_DIR, 'af', 'docs', `${id.replace(/\//g, '__')}.json`), 'utf8'),
    ),
  );
const HUB = 'business-types/pick-your-business-type';
const type = (id: string) => {
  const found = file.types.find((entry) => entry.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('effortReason', () => {
  it('is the effort table’s "Main reason" for each type, in the hub’s language', () => {
    const en = realDoc(HUB);
    const reason = (id: string, hub: Doc) =>
      plainText(effortReason(file.pickTable, en, hub, id) ?? []);
    expect(reason('food', en)).toBe('Certificate of Acceptability, training, inspections');
    expect(reason('professional-creative', en)).toBe('Usually no licence at all');
    expect(reason('vehicle-dealer', afDoc(HUB))).toBe('Drie aparte lae van registrasie');
    for (const entry of file.types) expect(reason(entry.id, afDoc(HUB))).not.toBe('');
  });

  it('gives nothing when the table is missing or its rows do not line up', () => {
    const en = realDoc(HUB);
    expect(effortReason({ ...file.pickTable, heading: 'nope' }, en, en, 'food')).toBeUndefined();
    const short = { ...en, blocks: en.blocks.filter((block) => block.kind !== 'table') };
    expect(effortReason(file.pickTable, en, short, 'food')).toBeUndefined();
  });
});

describe('glanceLinks', () => {
  it('names every section by its heading, in order, without the text’s first section', () => {
    const food = glanceLinks(type('food'), realDoc('business-types/food'));
    expect(food.map((link) => [link.id, link.kind])).toEqual([
      ['everything-else-you-may-need', 'need'],
      ['realistic-timing', 'timing'],
      ['your-checklist', 'checklist'],
    ]);
    expect(food[1]?.text).toBe('Realistic timing');
    const dealer = glanceLinks(type('vehicle-dealer'), afDoc('business-types/vehicle-dealer'));
    expect(dealer.map((link) => link.id)).toEqual(['your-startup-checklist']);
    for (const entry of file.types) {
      const links = glanceLinks(entry, realDoc(entry.doc));
      expect(links.at(-1)?.kind, entry.id).toBe('checklist');
    }
  });
});
