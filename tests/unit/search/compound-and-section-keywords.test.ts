/**
 * Post-WP-50a review pass 2: "sources for X" in Afrikaans meets X inside a compound heading
 * (minor 3), and keywords can belong to one section of a page (minors 1 and 2).
 */
import { describe, expect, it } from 'vitest';
import { keywordsFor } from '../../../scripts/search/keywords';
import { inCompound } from '../../../src/lib/search-client';

describe('inCompound', () => {
  it('finds a subject at the start of, or inside, a compound heading word', () => {
    expect(inCompound('kos', 'kosbesighede')).toBe(true);
    expect(inCompound('lisensie', 'besigheidslisensiering')).toBe(true);
    expect(inCompound('lisensies', 'besigheidslisensiering')).toBe(true);
  });

  it('never matches a short word in the middle of another, or a word with itself', () => {
    expect(inCompound('kos', 'voorskoste')).toBe(false);
    expect(inCompound('btw', 'btw')).toBe(false);
    expect(inCompound('ek', 'eksamen')).toBe(false);
  });
});

describe('section keywords', () => {
  const manifest = { docs: { 'core/x': {} } } as never;
  const docs = [{ id: 'core/x', headings: [{ id: 'yes' }] }] as never;

  it('refuses keywords for a heading the page does not have', () => {
    const file = { pages: [{ doc: 'core/x', anchor: 'nope', en: ['staff'], af: ['personeel'] }] };
    expect(() => keywordsFor('en', manifest, file, docs)).toThrow(/not a heading/);
  });

  it('keys a section by doc#anchor, apart from the page', () => {
    const file = {
      pages: [
        { doc: 'core/x', en: ['page word'], af: ['bladsywoord'] },
        { doc: 'core/x', anchor: 'yes', en: ['staff'], af: ['personeel'] },
      ],
    };
    const words = keywordsFor('en', manifest, file, docs);
    expect(words.get('core/x')).toEqual(['page word']);
    expect(words.get('core/x#yes')).toEqual(['staff']);
  });
});
