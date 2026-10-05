/**
 * The markup `tests/dom/wizard.test.ts` drives is what `Wizard.astro` renders. Astro's container
 * API renders components only in the node project (happy-dom transforms `.astro` for the client),
 * so this test renders the component and compares it with the committed fixture the dom test
 * mounts. After an intended change to the component, refresh the fixture:
 *
 *   pnpm exec cross-env FIXTURE_UPDATE=1 vitest run --project unit tests/unit/components/wizard-markup.test.ts
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import Wizard from '../../../src/components/wizard/Wizard.astro';
import { BusinessTypesFileSchema } from '../../../src/lib/content/schema';
import { REPO_ROOT, realManifest } from '../site/data';

const FIXTURES = path.join(REPO_ROOT, 'tests', 'dom', 'fixtures');

async function render(locale: 'en' | 'af'): Promise<string> {
  const types = BusinessTypesFileSchema.parse(
    JSON.parse(readFileSync(path.join(REPO_ROOT, 'content-meta', 'business-types.json'), 'utf8')),
  ).types;
  const container = await AstroContainer.create();
  const html = await container.renderToString(Wizard, {
    props: { locale, manifest: realManifest(), businessTypes: types },
  });
  const start = html.indexOf('<st-wizard');
  const end = html.indexOf('</st-wizard>') + '</st-wizard>'.length;
  return `${html.slice(start, end)}\n`;
}

describe('the wizard markup fixture', () => {
  for (const locale of ['en', 'af'] as const) {
    it(`matches what Wizard.astro renders (${locale})`, async () => {
      const file = path.join(FIXTURES, `wizard.${locale}.html`);
      const html = await render(locale);
      if (process.env['FIXTURE_UPDATE'] === '1' || !existsSync(file)) writeFileSync(file, html);
      expect(html).toBe(readFileSync(file, 'utf8'));
    });
  }
});
