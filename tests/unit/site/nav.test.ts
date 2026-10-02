import { describe, expect, it } from 'vitest';
import { useTranslations } from '../../../src/i18n';
import {
  documentCrumbs,
  footerLinks,
  isCurrent,
  sectionLinks,
  toolLinks,
} from '../../../src/lib/nav';
import { APP_ROUTES, NAV_DOC_IDS, WIZARD_AVAILABLE } from '../../../src/lib/routes';
import { realManifest } from './data';

const manifest = realManifest();
const en = useTranslations('en');
const af = useTranslations('af');

describe('sectionLinks', () => {
  it('lists the six sections of build plan B1, in reading order', () => {
    const links = sectionLinks(manifest, 'en', en);
    expect(links.map((link) => link.id)).toEqual([
      'start',
      'core',
      'branding',
      'paperwork',
      'business-types',
      'lookup',
    ]);
    expect(links.map((link) => link.route)).toContain('look-it-up/');
  });

  it('labels a section with the manifest title and describes it from the dictionary', () => {
    const [start] = sectionLinks(manifest, 'af', af);
    expect(start?.label).toBe(manifest.sections.find((s) => s.id === 'start')?.titles.af);
    expect(start?.description).toBe(af('nav.sections.start.description'));
  });

  it('prefixes every link with the locale', () => {
    for (const link of sectionLinks(manifest, 'af', af)) {
      expect(link.href).toContain('/af/');
    }
  });

  it('drops a section the manifest does not know', () => {
    const empty = { ...manifest, sections: [] };
    expect(sectionLinks(empty, 'en', en)).toEqual([]);
  });
});

describe('toolLinks', () => {
  const links = toolLinks(manifest, 'en', en);

  it('is the Tools menu from build plan B2', () => {
    expect(links.map((link) => link.id)).toEqual([
      ...(WIZARD_AVAILABLE ? ['my-path'] : []),
      NAV_DOC_IDS.checklist,
      'templates',
      NAV_DOC_IDS.glossary,
      NAV_DOC_IDS.sources,
    ]);
  });

  it('takes the document routes from the manifest, not from the document ids', () => {
    expect(links.map((link) => link.route)).toEqual([
      ...(WIZARD_AVAILABLE ? [APP_ROUTES.myPath] : []),
      'checklist/',
      APP_ROUTES.templates,
      'glossary/',
      'sources/',
    ]);
  });

  it('leaves out a tool whose document the manifest does not hold', () => {
    const docs = { ...manifest.docs };
    delete docs[NAV_DOC_IDS.glossary];
    const reduced = { ...manifest, docs };
    expect(toolLinks(reduced, 'en', en).map((link) => link.id)).not.toContain(NAV_DOC_IDS.glossary);
  });
});

describe('footerLinks', () => {
  it('is Contents, About and How this was made', () => {
    expect(footerLinks(manifest, 'en', en).map((link) => link.route)).toEqual([
      APP_ROUTES.contents,
      APP_ROUTES.about,
      'start/how-this-was-made/',
    ]);
  });
});

describe('isCurrent', () => {
  it('marks only the page the reader is on', () => {
    const [first, second] = toolLinks(manifest, 'en', en);
    expect(isCurrent(first!, first!.route)).toBe(true);
    expect(isCurrent(second!, first!.route)).toBe(false);
  });
});

describe('documentCrumbs', () => {
  it('is home, section, page, with the page as plain text', () => {
    const crumbs = documentCrumbs(manifest, 'core/register', 'en', en);
    expect(crumbs).toHaveLength(3);
    expect(crumbs[0]?.label).toBe(en('nav.home'));
    expect(crumbs[1]?.label).toBe(manifest.sections.find((s) => s.id === 'core')?.titles.en);
    expect(crumbs[2]?.label).toBe(manifest.docs['core/register']?.titles.en);
    expect(crumbs[2]?.href).toBeUndefined();
  });

  it('is only home for a document the manifest does not know', () => {
    expect(documentCrumbs(manifest, 'core/nope', 'en', en)).toHaveLength(1);
  });
});
