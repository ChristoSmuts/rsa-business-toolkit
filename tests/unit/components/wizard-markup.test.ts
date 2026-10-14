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
import { WIZARD_QUESTIONS } from '../../../src/lib/routes';
import en from '../../../src/i18n/en.json';
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

describe('WIZARD_QUESTIONS', () => {
  // The no-answers line of "Only what applies to me" counts the questions with it (WP-50 Phase 3,
  // item 3, review pass 2, minor 5), so it must be the wizard's own count.
  it('is the number of wizard step titles and of steps the wizard renders', async () => {
    expect(Object.keys(en.wizard.steps)).toHaveLength(WIZARD_QUESTIONS);
    const html = await render('en');
    expect(html.match(/class="st-wizard__stepper-n"/g) ?? []).toHaveLength(WIZARD_QUESTIONS);
  });
});
