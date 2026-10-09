import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { useTranslations } from '../../../src/i18n';
import type { Block, Doc } from '../../../src/lib/content/schema';
import { TEMPLATE_SLUGS } from '../../../src/lib/templates/draft';
import { formHowToKey, formIntro } from '../../../src/lib/templates/intro';
import { parseTemplate, runsText } from '../../../src/lib/templates/placeholders';

/**
 * WP-50a, item 4: above the form, a template says how to use the form, never how to copy a file.
 * The markdown's note ("Make a copy, rename it…, then export to PDF") stays in the document itself.
 */
const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const load = (lang: 'en' | 'af', slug: string): Doc =>
  JSON.parse(
    readFileSync(
      path.join(ROOT, 'src', 'data', lang, 'docs', `paperwork__templates__${slug}.json`),
      'utf8',
    ),
  ) as Doc;

/** Words of the file instruction in either language. */
const FILE_WORDS =
  /SQUARE BRACKETS|VIERKANTIGE HAKIES|make a copy|maak ’n afskrif|export to PDF|na PDF uit/i;

const text = (block: Block): string => ('c' in block ? runsText(block.c) : '');

describe('formIntro on the five templates', () => {
  for (const lang of ['en', 'af'] as const) {
    for (const slug of TEMPLATE_SLUGS) {
      it(`${lang} ${slug}: no file instruction above the form, and the form line in its place`, () => {
        const doc = load(lang, slug);
        const { before } = parseTemplate(doc);
        const key = formHowToKey(slug);
        const line = key ? useTranslations(lang)(key) : undefined;
        const intro = formIntro(before, line);
        for (const block of intro) expect(text(block)).not.toMatch(FILE_WORDS);
        const notes = intro.filter((block) => block.kind === 'note');
        if (before.some((block) => block.kind === 'note')) {
          expect(key, `${slug} has a note, so it needs a form line`).toBeDefined();
          expect(notes.map(text)).toEqual([line]);
          // The line takes the note's place: what comes before and after it is unchanged.
          const at = before.findIndex((block) => block.kind === 'note');
          expect(intro.map((block) => block.id)).toEqual(before.map((block) => block.id));
          expect(intro[at]?.id).toBe(before[at]?.id);
        } else {
          expect(notes).toEqual([]);
          expect(intro).toEqual(before);
        }
        // The document itself is not changed: the note is still in the blocks.
        expect(doc.blocks.some((block) => FILE_WORDS.test(text(block)))).toBe(key !== undefined);
      });
    }
  }

  it('leaves later notes out, and every note when there is no line to show', () => {
    const note = (id: string): Block => ({
      id,
      hash: id,
      kind: 'note',
      c: [{ t: 'text', v: 'Make a copy.' }],
    });
    const paragraph: Block = {
      id: 'p',
      hash: 'p',
      kind: 'paragraph',
      c: [{ t: 'text', v: 'Use this one.' }],
    };
    expect(formIntro([paragraph, note('a'), note('b')], 'Fill in the form.').map(text)).toEqual([
      'Use this one.',
      'Fill in the form.',
    ]);
    expect(formIntro([note('a'), paragraph], undefined).map(text)).toEqual(['Use this one.']);
  });
});
