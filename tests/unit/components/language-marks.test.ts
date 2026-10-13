/**
 * Language marks the renderers add inside translated text, rendered for real with Astro's container
 * API. No built page shows these states while every document and section has an Afrikaans title, so
 * only a rendered component can keep them under test (review WP-40 integration pass 3, minor 2).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ContentsBlock from '../../../src/components/content/ContentsBlock.astro';
import Inline from '../../../src/components/content/Inline.astro';
import Breadcrumb from '../../../src/components/navigation/Breadcrumb.astro';
import SectionSidebar from '../../../src/components/navigation/SectionSidebar.astro';
import SectionLanding from '../../../src/components/pages/SectionLanding.astro';
import { useTranslations } from '../../../src/i18n';
import { createContentContext } from '../../../src/lib/content/context';
import { sectionDocIds } from '../../../src/lib/content/manifest';
import { DocSchema, type Doc, type Manifest } from '../../../src/lib/content/schema';
import { documentCrumbs } from '../../../src/lib/nav';
import { docPager } from '../../../src/lib/pages';
import { DATA_DIR, realManifest, REPO_ROOT } from '../site/data';

/** A document as the Afrikaans pages load it. */
function afrikaansDoc(id: string): Doc {
  const file = path.join(DATA_DIR, 'af', 'docs', `${id.replace('/', '__')}.json`);
  return DocSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

function withoutAfrikaansTitle(docId: string, sectionId?: string): Manifest {
  const copy = structuredClone(realManifest());
  const doc = copy.docs[docId];
  if (doc) delete doc.titles.af;
  const section = copy.sections.find((entry) => entry.id === sectionId);
  if (section) delete section.titles.af;
  return copy;
}

async function render(
  component: Parameters<AstroContainer['renderToString']>[0],
  props: Record<string, unknown>,
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props });
}

describe('a docref inside Afrikaans text', () => {
  const run = { t: 'docref', doc: 'core/register', label: '01-core/02' } as const;

  it('marks the English title of a document that has no Afrikaans title', async () => {
    const manifest = withoutAfrikaansTitle('core/register');
    const context = createContentContext({ locale: 'af', contentLang: 'af', manifest });
    const html = await render(Inline, { runs: [run], context });
    expect(html).toMatch(/<a [^>]*lang="en-ZA"[^>]*>Register: what you actually need<\/a>/);
  });

  it('marks nothing when the document has an Afrikaans title', async () => {
    const context = createContentContext({
      locale: 'af',
      contentLang: 'af',
      manifest: realManifest(),
    });
    const html = await render(Inline, { runs: [run], context });
    expect(html).not.toMatch(/lang=/);
  });
});

describe('the contents block inside Afrikaans text', () => {
  it('marks only the document and section that fall back to English', async () => {
    const manifest = withoutAfrikaansTitle('core/register', 'core');
    const context = createContentContext({ locale: 'af', contentLang: 'af', manifest });
    const html = await render(ContentsBlock, { block: { kind: 'toc', id: 'toc' }, context });
    expect(html).toMatch(/<a [^>]*lang="en-ZA"[^>]*>\s*Register: what you actually need\s*<\/a>/);
    expect(html).toMatch(/<a [^>]*lang="en-ZA"[^>]*>\s*Core[^<]*<\/a>/);
    // Every other title is Afrikaans and unmarked: exactly the two marks above.
    expect(html.match(/lang="en-ZA"/g)).toHaveLength(2);
  });
});

/**
 * The page chrome around a document: the breadcrumb, the section sidebar, the section landing's
 * cards and the pager name a document by its title, which stays English until it is translated
 * (review WP-40 integration pass 4, minor 1: removing any of these marks failed no test).
 */
describe('document titles in the Afrikaans page chrome', () => {
  const missing = 'core/register';
  const title = 'Register: what you actually need';
  const manifest = withoutAfrikaansTitle(missing);
  const marks = (html: string): number => html.match(/lang="en-ZA"/g)?.length ?? 0;

  it('marks the breadcrumb’s English title', async () => {
    const crumbs = documentCrumbs(manifest, missing, 'af', useTranslations('af'));
    const html = await render(Breadcrumb, { crumbs, locale: 'af' });
    expect(html).toMatch(new RegExp(`<span [^>]*lang="en-ZA"[^>]*>\\s*${title}\\s*</span>`));
    expect(marks(html)).toBe(1);
  });

  it('marks only the sidebar’s English title', async () => {
    const html = await render(SectionSidebar, { manifest, sectionId: 'core', locale: 'af' });
    expect(html).toMatch(new RegExp(`<span [^>]*lang="en-ZA"[^>]*>\\s*${title}\\s*</span>`));
    expect(marks(html)).toBe(1);
  });

  it('marks only the landing card’s English title', async () => {
    const docs = sectionDocIds(manifest, 'core').map((id) => afrikaansDoc(id));
    const html = await render(SectionLanding, { locale: 'af', manifest, sectionId: 'core', docs });
    expect(html).toMatch(new RegExp(`<h2 [^>]*lang="en-ZA"[^>]*>\\s*<a [^>]*>\\s*${title}`));
    expect(marks(html)).toBe(1);
  });

  it('marks the pager’s English title, and not the one beside it', () => {
    const order = sectionDocIds(manifest, 'core');
    const index = order.indexOf(missing);
    const before = docPager(manifest, order[index - 1]!, 'af');
    expect(before.next).toMatchObject({ title, lang: 'en-ZA' });
    expect(before.previous?.lang).toBeUndefined();
    const after = docPager(manifest, order[index + 1]!, 'af');
    expect(after.previous).toMatchObject({ title, lang: 'en-ZA' });
  });

  it('puts the pager title’s mark on the span that holds it (Doc.astro)', () => {
    // Doc.astro needs the whole content collection to render, so its two pager spans are pinned on
    // the source: each title sits in a span that carries the link's `lang`.
    const source = readFileSync(path.join(REPO_ROOT, 'src', 'layouts', 'Doc.astro'), 'utf8');
    for (const side of ['previous', 'next'])
      expect(source).toMatch(
        new RegExp(
          `<span lang=\\{pager\\.${side}\\.lang\\} data-pager-title>\\s*\\{pager\\.${side}\\.title\\}`,
        ),
      );
  });
});
