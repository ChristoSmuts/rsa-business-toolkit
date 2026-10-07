/**
 * Conditions on the real content that review WP-31 pass 4 asked for, in both languages: what the
 * guide says to everyone stays where everyone sees it, and what it says only to a company is
 * marked so.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applies, type AppliesTo } from '../../../src/lib/applicability';
import type { Block, Doc } from '../../../src/lib/content/schema';
import type { Profile } from '../../../src/lib/profile';
import { DATA_DIR } from '../site/data';

const doc = (lang: 'en' | 'af', id: string): Doc =>
  JSON.parse(
    readFileSync(path.join(DATA_DIR, lang, 'docs', `${id.replace(/\//g, '__')}.json`), 'utf8'),
  ) as Doc;

const text = (block: Block): string => JSON.stringify(block);

/** The condition of the heading a block sits under. */
function governing(blocks: readonly Block[], index: number): AppliesTo {
  for (let at = index - 1; at >= 0; at--) {
    const block = blocks[at];
    if (block?.kind === 'heading' && !block.hidden) return block.appliesTo;
  }
  return undefined;
}

const dealer = (entity: Profile['entity']): Profile => ({
  entity,
  businessTypes: ['vehicle-dealer'],
  stage: 'trading',
});

describe('content conditions from review WP-31 pass 4', () => {
  for (const [lang, words] of [
    ['en', 'is worth having. It separates stock vehicles'],
    ['af', 'die moeite werd. Dit skei voorraadvoertuie'],
  ] as const) {
    it(`${lang}: a dealer of either entity sees "a TRN or BRNC is worth having" (nit 1)`, () => {
      const blocks = doc(lang, 'business-types/vehicle-dealer').blocks;
      const index = blocks.findIndex((block) => text(block).includes(words));
      expect(index).toBeGreaterThan(-1);
      const condition = governing(blocks, index);
      expect(applies(condition, dealer('pty'))).toBe(true);
      expect(applies(condition, dealer('sole-prop'))).toBe(true);
      // Both abbreviations spelled out where the dealer first meets them (review WP-31 pass 5, nit 2).
      expect(text(blocks[index]!)).toContain('Traffic Register Number (TRN)');
      expect(text(blocks[index]!)).toContain('Business Register Number Certificate (BRNC)');
    });

    it(`${lang}: the company-only continuity tasks are for a Pty Ltd only (nit 3)`, () => {
      const tasks = doc(lang, 'core/you-are-the-business')
        .blocks.flatMap((block) => (block.kind === 'tasklist' ? block.items : []))
        .filter((task) =>
          [
            'core/you-are-the-business:8e6615a6',
            'core/you-are-the-business:b554cb87',
            'core/you-are-the-business:b5a8d0d2',
          ].includes(task.id),
        );
      expect(tasks).toHaveLength(3);
      for (const task of tasks) expect(task.when).toEqual({ entity: 'pty' });
    });
  }
});
