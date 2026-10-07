/**
 * The page structure "Only what applies to me" relies on, as `Blocks.astro` really renders it:
 * `tests/dom/applies-all-profiles.test.ts` and `tests/dom/applies.test.ts` build that structure
 * themselves, so this keeps their model honest (review WP-31 pass 4, nit 4). Rendered with Astro's
 * container API, parsed with happy-dom.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import Blocks from '../../../src/components/content/Blocks.astro';
import { createContentContext } from '../../../src/lib/content/context';
import { realDoc, realManifest } from '../site/data';

async function rendered(id: string): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const doc = realDoc(id);
  const html = await container.renderToString(Blocks, {
    props: {
      blocks: doc.blocks,
      context: createContentContext({ locale: 'en', contentLang: 'en', manifest: realManifest() }),
      fallbackCaption: doc.title,
    },
  });
  const window = new Window();
  const root = window.document.createElement('div');
  root.innerHTML = html;
  return root as unknown as HTMLElement;
}

describe('the markup "Only what applies to me" reads', () => {
  for (const id of [
    'core/tax-and-sars',
    'core/you-are-the-business',
    'business-types/vehicle-dealer',
  ]) {
    it(`${id}: headings are siblings with data-depth, each condition with its marker before it`, async () => {
      const root = await rendered(id);
      const headings = [...root.querySelectorAll<HTMLElement>('h2[id], h3[id], h4[id]')];
      expect(headings.length).toBeGreaterThan(3);
      const parent = headings[0]?.parentElement;
      for (const heading of headings) {
        expect(heading.dataset['depth'], heading.id).toMatch(/^[234]$/);
        expect(heading.parentElement, heading.id).toBe(parent);
        if (heading.hasAttribute('data-applies')) {
          const marker = heading.previousElementSibling as HTMLElement | null;
          expect(marker?.classList.contains('st-hidden-marker'), heading.id).toBe(true);
          expect(marker?.dataset['markerFor']).toBe(heading.id);
        }
      }
      // Checklist items and table rows carry their own conditions where they have one.
      for (const item of root.querySelectorAll<HTMLElement>('label.st-check[data-applies]'))
        expect(item.dataset['entity'] ?? item.dataset['types']).toBeTruthy();
    });
  }

  it('core/tax-and-sars: “Provisional tax” has no condition of its own, under a sole-proprietor heading', async () => {
    const root = await rendered('core/tax-and-sars');
    expect(
      root.querySelector('#what-sars-wants-from-a-sole-proprietor')?.getAttribute('data-entity'),
    ).toBe('sole-prop');
    expect(root.querySelector('#provisional-tax')?.hasAttribute('data-applies')).toBe(false);
  });
});
