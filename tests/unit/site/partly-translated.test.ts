/**
 * The states a partly translated site is in, kept under test now that every document and every
 * navigation title has an Afrikaans text and the built site no longer shows them (review WP-40
 * integration pass 1, major 2). Each test builds its own state from a copy of the real data.
 */
import { describe, expect, it } from 'vitest';
import { createContentContext } from '../../../src/lib/content/context';
import { docrefLang, docTitleLang } from '../../../src/lib/content/manifest';
import { keptInEnglish } from '../../../src/lib/content/render';
import type { Manifest, SourcesFile } from '../../../src/lib/content/schema';
import { realManifest, realSources } from './data';

function withoutAfrikaansTitles(): Manifest {
  const copy = structuredClone(realManifest());
  for (const doc of Object.values(copy.docs)) delete doc.titles.af;
  for (const section of copy.sections) delete section.titles.af;
  return copy;
}

describe('English titles inside Afrikaans text', () => {
  it('marks a document title English when the document has no Afrikaans title', () => {
    expect(docTitleLang(realManifest(), 'core/register', 'af')).toBeUndefined();
    expect(docTitleLang(withoutAfrikaansTitles(), 'core/register', 'af')).toBe('en-ZA');
    expect(docTitleLang(withoutAfrikaansTitles(), 'core/register', 'en')).toBeUndefined();
  });

  it('marks a docref to a document or a section the same way', () => {
    const bare = withoutAfrikaansTitles();
    expect(docrefLang(bare, { doc: 'core/register' }, 'af')).toBe('en-ZA');
    expect(docrefLang(bare, { section: 'core' }, 'af')).toBe('en-ZA');
    expect(docrefLang(realManifest(), { doc: 'core/register' }, 'af')).toBeUndefined();
    expect(docrefLang(bare, { doc: 'no/such-doc' }, 'af')).toBeUndefined();
  });
});

describe('the sources register in another language than the page', () => {
  const english = realSources('en');
  const afrikaans = realSources('af');

  it('defaults the register language to the content language', () => {
    const context = createContentContext({ locale: 'af', manifest: realManifest() });
    expect(context.sourcesLang).toBe('af');
    const fallback = createContentContext({
      locale: 'af',
      contentLang: 'en',
      manifest: realManifest(),
    });
    expect(fallback.sourcesLang).toBe('en');
  });

  it('knows nothing is kept in English while the register itself is English', () => {
    const context = createContentContext({
      locale: 'af',
      contentLang: 'af',
      manifest: realManifest(),
      sources: english,
      sourcesLang: 'en',
      englishSources: english,
    });
    expect(context.keptInEnglish.titles.size).toBe(0);
    expect(context.keptInEnglish.reasons.size).toBe(0);
  });

  it('finds the titles, Acts and no-link reasons a translated register kept in English', () => {
    const kept = keptInEnglish(english, afrikaans);
    const sameTitles = afrikaans.entries.filter(
      (entry) => english.entries.find((twin) => twin.id === entry.id)?.title === entry.title,
    );
    expect(sameTitles.length).toBeGreaterThan(0);
    for (const entry of sameTitles) expect(kept.titles.has(entry.id), entry.id).toBe(true);
    const translated = afrikaans.entries.find(
      (entry) => english.entries.find((twin) => twin.id === entry.id)?.title !== entry.title,
    );
    expect(translated && kept.titles.has(translated.id)).toBe(false);
    for (const act of afrikaans.acts) expect(kept.titles.has(act.id), act.id).toBe(true);
    for (const entry of afrikaans.entries.filter((e) => e.noUrlReason !== undefined)) {
      expect(kept.reasons.has(entry.id), entry.id).toBe(true);
    }
  });

  it('is empty without an English register to compare with', () => {
    const kept = keptInEnglish(undefined, afrikaans as SourcesFile);
    expect(kept.titles.size + kept.reasons.size).toBe(0);
  });
});
