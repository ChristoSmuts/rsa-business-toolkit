/**
 * Language marks the renderers add inside translated text, rendered for real with Astro's container
 * API. No built page shows these states while every document and section has an Afrikaans title, so
 * only a rendered component can keep them under test (review WP-40 integration pass 3, minor 2).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import ContentsBlock from '../../../src/components/content/ContentsBlock.astro';
import Inline from '../../../src/components/content/Inline.astro';
import { createContentContext } from '../../../src/lib/content/context';
import type { Manifest } from '../../../src/lib/content/schema';
import { realManifest } from '../site/data';

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
