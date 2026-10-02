import { describe, expect, it } from 'vitest';
import { useTranslations } from '../../../src/i18n';
import type { Locale } from '../../../src/i18n/locales';
import type { Manifest } from '../../../src/lib/content/schema';
import {
  assertDocTrust,
  canonicalUrl,
  contentPages,
  contentPageTitle,
  contentStaticPaths,
  docContentLang,
  docLocales,
  docPager,
  effortLevel,
  pageTitle,
  routeParam,
  sectionHue,
  latestCheck,
  splitAroundParam,
} from '../../../src/lib/pages';
import { APP_ROUTES } from '../../../src/lib/routes';
import { realDocs, realManifest } from './data';

const manifest = realManifest();
const en = useTranslations('en');
const af = useTranslations('af');

function clone(): Manifest {
  return structuredClone(manifest);
}

describe('contentPages', () => {
  const pages = contentPages(manifest);

  it('gives every document in the manifest exactly one page', () => {
    const docIds = pages.flatMap((page) => (page.kind === 'doc' ? [page.docId] : []));
    expect([...docIds].sort()).toEqual(Object.keys(manifest.docs).sort());
  });

  it('builds a landing for each section that is not itself a document', () => {
    const landings = pages.filter((page) => page.kind === 'section').map((page) => page.route);
    expect(landings).toEqual(['start/', 'core/', 'branding/', 'paperwork/', 'look-it-up/']);
    // `business-types/` is the "Pick your business type" document, not a second page.
    expect(pages.filter((page) => page.route === 'business-types/')).toEqual([
      expect.objectContaining({ kind: 'doc', docId: 'business-types/pick-your-business-type' }),
    ]);
  });

  it('never shares a route, and never takes an app route', () => {
    const routes = pages.map((page) => page.route);
    expect(new Set(routes).size).toBe(routes.length);
    for (const route of Object.values(APP_ROUTES)) expect(routes).not.toContain(route);
  });

  it('refuses a content route that collides with an app route', () => {
    const broken = clone();
    const entry = broken.docs['paperwork/free-tools'];
    if (entry) entry.route = 'templates/';
    expect(() => contentPages(broken)).toThrow(/app route/);
  });

  it('refuses two content pages on one route', () => {
    const broken = clone();
    const entry = broken.docs['paperwork/free-tools'];
    if (entry) entry.route = 'core/register/';
    expect(() => contentPages(broken)).toThrow(/share the route/);
  });

  it('refuses a document that no section lists', () => {
    const broken = clone();
    const paperwork = broken.sections.find((section) => section.id === 'paperwork');
    if (paperwork) paperwork.docs = paperwork.docs.filter((id) => id !== 'paperwork/free-tools');
    expect(() => contentPages(broken)).toThrow(/paperwork\/free-tools/);
  });
});

describe('contentStaticPaths', () => {
  it('builds every content page in every enabled locale, English unprefixed', () => {
    const paths = contentStaticPaths(manifest);
    const pages = contentPages(manifest);
    expect(paths).toHaveLength(pages.length * 2);
    expect(paths).toContainEqual(
      expect.objectContaining({ params: { locale: undefined, route: 'core/register' } }),
    );
    expect(paths).toContainEqual(
      expect.objectContaining({ params: { locale: 'af', route: 'core/register' } }),
    );
  });

  it('strips the slashes a rest parameter must not carry', () => {
    expect(routeParam('core/register/')).toBe('core/register');
    expect(routeParam('/look-it-up/')).toBe('look-it-up');
  });
});

describe('languages of a document', () => {
  /** The corpus is translated over time, so these build their own state rather than read it. */
  function withLangs(langs: Locale[]): typeof manifest {
    const copy = clone();
    const entry = copy.docs['core/register'];
    if (entry) entry.langs = langs;
    return copy;
  }

  it('offers only the languages a document really exists in', () => {
    expect(docLocales(withLangs(['en']), 'core/register')).toEqual(['en']);
    expect(docLocales(withLangs(['af', 'en']), 'core/register')).toEqual(['en', 'af']);
    expect(docLocales(manifest, 'no/such-doc')).toEqual([]);
  });

  it('falls back to English for an untranslated document', () => {
    expect(docContentLang(withLangs(['en']), 'core/register', 'af')).toBe('en');
    expect(docContentLang(withLangs(['en']), 'core/register', 'en')).toBe('en');
    expect(docContentLang(withLangs(['en', 'af']), 'core/register', 'af')).toBe('af');
  });
});

describe('docPager', () => {
  it('runs through the whole guide in section order', () => {
    const last = docPager(manifest, 'start/what-has-changed', 'en');
    expect(last.next?.docId).toBe('core/start-here');
    expect(docPager(manifest, 'core/start-here', 'en').previous?.docId).toBe(
      'start/what-has-changed',
    );
  });

  it('has no previous page at the start and no next page at the end', () => {
    expect(docPager(manifest, 'start/start-here', 'en').previous).toBeUndefined();
    expect(docPager(manifest, 'lookup/sources', 'en').next).toBeUndefined();
  });

  it('links the reader’s language', () => {
    expect(docPager(manifest, 'core/register', 'af').next?.href).toMatch(
      /\/af\/core\/tax-and-sars\/$/,
    );
  });

  it('is empty for an unknown document', () => {
    expect(docPager(manifest, 'no/such-doc', 'en')).toEqual({
      previous: undefined,
      next: undefined,
    });
  });
});

describe('titles', () => {
  it('names the page, its section and the site (build plan B5)', () => {
    expect(pageTitle(en, 'Tax and SARS', 'Core: applies to everyone')).toBe(
      'Tax and SARS · Core: applies to everyone · SA Business Toolkit',
    );
    expect(pageTitle(en, 'Contents')).toBe('Contents · SA Business Toolkit');
    expect(pageTitle(en, 'Same', 'Same')).toBe('Same · SA Business Toolkit');
  });

  it('uses the translated section name on an Afrikaans landing', () => {
    const landing = contentPages(manifest).find((page) => page.route === 'core/');
    if (!landing) throw new Error('no core landing');
    expect(contentPageTitle(manifest, landing, 'af', af)).toContain('Kern: geld vir almal');
  });
});

describe('assertDocTrust (build plan D5)', () => {
  it('passes every document in the corpus', () => {
    for (const doc of realDocs()) expect(() => assertDocTrust(doc), doc.id).not.toThrow();
  });

  it('fails a page with no sources and no note', () => {
    const doc = { id: 'x/y', sources: { entries: [], acts: [] }, sourceNote: undefined };
    expect(() => assertDocTrust(doc)).toThrow(/x\/y/);
  });

  it('fails a note with no reason, and passes one with sources or a real note', () => {
    const empty = { id: 'x/y', sources: { entries: [], acts: [] } };
    expect(() =>
      assertDocTrust({ ...empty, sourceNote: { reason: '  ', see: [] } } as never),
    ).toThrow();
    expect(() =>
      assertDocTrust({ ...empty, sourceNote: { reason: 'A start page.', see: [] } } as never),
    ).not.toThrow();
    expect(() => assertDocTrust({ id: 'x', sources: { entries: ['a'], acts: [] } })).not.toThrow();
  });
});

describe('small mappings', () => {
  it('maps effort words to the meter, lowest first', () => {
    expect(effortLevel('lowest')).toBe(1);
    expect(effortLevel('medium')).toBe(3);
    expect(effortLevel('high')).toBe(5);
  });

  it('maps section ids to the design system’s hues', () => {
    expect(sectionHue('business-types')).toBe('types');
    expect(sectionHue('lookup')).toBe('lookup');
    expect(sectionHue('nope')).toBeUndefined();
  });

  it('makes an absolute canonical URL under the base and locale', () => {
    expect(canonicalUrl('af', 'core/register/', 'https://x.test')).toMatch(
      /^https:\/\/x\.test\/.*af\/core\/register\/$/,
    );
  });
});

describe('splitAroundParam', () => {
  it('splits a translated sentence around its parameter', () => {
    expect(splitAroundParam((title) => af('nav.next', { title }))).toEqual(['Volgende: ', '']);
    expect(splitAroundParam((title) => en('nav.previous', { title }))).toEqual(['Previous: ', '']);
    expect(splitAroundParam(() => 'no marker')).toEqual(['no marker', '']);
  });
});

describe('latestCheck', () => {
  it('is the most recent check date among the documents', () => {
    const checked = (checkedOn: string) => ({
      verification: { status: 'ai-checked' as const, checkedOn },
    });
    expect(latestCheck([checked('2026-09-13'), checked('2026-09-14'), checked('2026-09-01')])).toBe(
      '2026-09-14',
    );
    expect(latestCheck([])).toBeUndefined();
  });

  it('is not the same date for every page in the corpus, which is why pages say "most recently"', () => {
    const dates = new Set(realDocs().map((doc) => doc.verification.checkedOn));
    expect(latestCheck(realDocs())).toBe([...dates].sort().at(-1));
  });
});
