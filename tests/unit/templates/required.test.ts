/**
 * The required items list as the page renders it before the script: the state the script leaves
 * it in for an empty form (WP-50a review pass 10, M1 and m1). The counts are the ones the reviewer
 * measured after the script ran on each template.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Doc } from '../../../src/lib/content/schema';
import { parseTemplate, requiredItems } from '../../../src/lib/templates/placeholders';
import { emptyFormRequired } from '../../../src/lib/templates/required';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const model = (lang: 'en' | 'af', slug: string) =>
  parseTemplate(
    JSON.parse(
      readFileSync(
        path.join(ROOT, 'src', 'data', lang, 'docs', `paperwork__templates__${slug}.json`),
        'utf8',
      ),
    ) as Doc,
  );

describe('the required items list for an empty form', () => {
  // Items shown after the script on an empty form (review pass 10, m1, `wp50a-review10-probe-req`).
  const shown: Record<string, number> = {
    invoice: 16,
    'tax-invoice': 13,
    'privacy-notice': 6,
    receipt: 9,
    quotation: 19,
  };
  for (const lang of ['en', 'af'] as const) {
    for (const [slug, count] of Object.entries(shown)) {
      it(`${lang} ${slug}: ${count} items shown, the rest hidden as the script hides them`, () => {
        const m = model(lang, slug);
        const state = emptyFormRequired(m);
        const items = requiredItems(m);
        expect(items.length - state.hidden.size).toBe(count);
        // Every item that applies but is not present is shown, and counted.
        expect(state.total - state.present).toBe(count);
        // A below-threshold item never counts.
        for (const item of items.filter((entry) => entry.requiredAbove !== undefined))
          expect(state.hidden.has(item.name)).toBe(true);
        // The lines are never present on an empty form.
        if (items.some((item) => item.name === 'lines'))
          expect(state.hidden.has('lines')).toBe(false);
      });
    }
  }
});
