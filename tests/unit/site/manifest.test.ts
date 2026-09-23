import { describe, expect, it } from 'vitest';
import {
  docHref,
  docNeighbours,
  docrefText,
  docRoute,
  docTitle,
  hasTranslation,
  orderedSections,
  sectionDocIds,
  sectionHref,
  sectionRoute,
  sectionTitle,
} from '../../../src/lib/content/manifest';
import { realDocs, realManifest } from './data';

const manifest = realManifest();
/** The deployed base path, passed explicitly so the test does not depend on the runner's env. */
const base = '/business-toolkit/';

describe('routes', () => {
  it('serves the sources register at its route, not at its document id', () => {
    expect(docRoute(manifest, 'lookup/sources')).toBe('sources/');
    expect(docHref(manifest, 'lookup/sources', 'en', undefined, base)).toBe(
      '/business-toolkit/sources/',
    );
    expect(docHref(manifest, 'lookup/sources', 'af', undefined, base)).toBe(
      '/business-toolkit/af/sources/',
    );
  });

  it('adds an anchor without touching it, because heading ids are English in every language', () => {
    expect(docHref(manifest, 'core/register', 'af', 'what-you-need', base)).toBe(
      '/business-toolkit/af/core/register/#what-you-need',
    );
  });

  it('returns undefined for an id the manifest does not know', () => {
    expect(docRoute(manifest, 'core/nope')).toBeUndefined();
    expect(docHref(manifest, 'core/nope', 'en', undefined, base)).toBeUndefined();
    expect(sectionRoute(manifest, 'nope')).toBeUndefined();
    expect(sectionHref(manifest, 'nope', 'en', base)).toBeUndefined();
  });

  it('gives the "look it up" section its own route', () => {
    expect(sectionRoute(manifest, 'lookup')).toBe('look-it-up/');
    expect(sectionHref(manifest, 'lookup', 'en', base)).toBe('/business-toolkit/look-it-up/');
  });

  it('has a route for every document in the corpus', () => {
    const missing = realDocs()
      .map((doc) => doc.id)
      .filter((id) => docRoute(manifest, id) === undefined);
    expect(missing).toEqual([]);
  });
});

describe('titles', () => {
  it('uses the language asked for', () => {
    expect(docTitle(manifest, 'core/register', 'en')).toBe(
      manifest.docs['core/register']?.titles.en,
    );
    expect(sectionTitle(manifest, 'core', 'af')).toBe(
      manifest.sections.find((section) => section.id === 'core')?.titles.af,
    );
  });

  it('falls back to English, then to the id, so a link is never empty', () => {
    const noAf = {
      ...manifest,
      docs: {
        ...manifest.docs,
        'core/register': { ...manifest.docs['core/register']!, titles: { en: 'Register' } },
      },
    };
    expect(docTitle(noAf, 'core/register', 'af')).toBe('Register');
    expect(docTitle(manifest, 'core/nope', 'en')).toBe('core/nope');
    expect(sectionTitle(manifest, 'nope', 'en')).toBe('nope');
  });
});

describe('docrefText', () => {
  it('shows the title, not the folder name the markdown wrote', () => {
    expect(docrefText(manifest, { doc: 'core/register', label: '01-core/02' }, 'en')).toBe(
      manifest.docs['core/register']?.titles.en,
    );
    expect(docrefText(manifest, { section: 'core', label: '01-core/' }, 'af')).toBe(
      manifest.sections.find((section) => section.id === 'core')?.titles.af,
    );
  });

  it('falls back to the label when the manifest does not know the id', () => {
    expect(docrefText(manifest, { doc: 'core/nope', label: '01-core/99' }, 'en')).toBe(
      '01-core/99',
    );
    expect(docrefText(manifest, { section: 'nope', label: '99-nope/' }, 'en')).toBe('99-nope/');
  });

  it('never leaves a folder name on a page for any docref in the corpus', () => {
    const problems: string[] = [];
    const walk = (runs: readonly unknown[]): void => {
      for (const run of runs as { t?: string; c?: unknown[]; label?: string }[]) {
        if (run.t === 'docref') {
          const text = docrefText(manifest, run as unknown as { doc: string; label: string }, 'en');
          if (/^\d/.test(text)) problems.push(`${run.label ?? ''} -> ${text}`);
        }
        if (Array.isArray(run.c)) walk(run.c);
      }
    };
    for (const doc of realDocs()) {
      for (const block of doc.blocks) {
        if ('c' in block && Array.isArray(block.c)) walk(block.c);
        if (block.kind === 'list') for (const item of block.items) walk(item);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('order and neighbours', () => {
  it('sorts sections by their order field', () => {
    const orders = orderedSections(manifest).map((section) => section.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('lists a section’s documents', () => {
    expect(sectionDocIds(manifest, 'lookup')).toContain('lookup/glossary');
    expect(sectionDocIds(manifest, 'nope')).toEqual([]);
  });

  it('finds the previous and next document inside the section', () => {
    const ids = sectionDocIds(manifest, 'core');
    expect(ids.length).toBeGreaterThan(2);
    const middle = ids[1]!;
    expect(docNeighbours(manifest, middle)).toEqual({ previous: ids[0], next: ids[2] });
  });

  it('has no previous before the first and no next after the last', () => {
    const ids = sectionDocIds(manifest, 'core');
    expect(docNeighbours(manifest, ids[0]!).previous).toBeUndefined();
    expect(docNeighbours(manifest, ids.at(-1)!).next).toBeUndefined();
  });

  it('has neither for an unknown document', () => {
    expect(docNeighbours(manifest, 'core/nope')).toEqual({ previous: undefined, next: undefined });
  });
});

describe('hasTranslation', () => {
  it('is true for English and false for a language with no generated document yet', () => {
    expect(hasTranslation(manifest, 'core/register', 'en')).toBe(true);
    expect(hasTranslation(manifest, 'core/register', 'af')).toBe(
      manifest.docs['core/register']?.langs.includes('af') ?? false,
    );
    expect(hasTranslation(manifest, 'core/nope', 'en')).toBe(false);
  });
});
