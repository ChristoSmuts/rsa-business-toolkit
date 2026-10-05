import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocSchema, PathsFileSchema, type Doc } from '../../src/lib/content/schema';
import { buildPath } from '../../src/lib/path-engine';
import {
  allStepCards,
  checklistPartBlocks,
  docHasConditions,
  docTaskLists,
  resultCards,
  resultKey,
  stepWhy,
  wizardInputId,
  wizardNoJsCss,
} from '../../src/lib/path-pages';
import { DATA_DIR, realDoc, realManifest } from './site/data';

const paths = PathsFileSchema.parse(
  JSON.parse(readFileSync(path.join(DATA_DIR, 'paths.json'), 'utf8')),
);
const afDoc = (id: string): Doc =>
  DocSchema.parse(
    JSON.parse(
      readFileSync(path.join(DATA_DIR, 'af', 'docs', `${id.replace(/\//g, '__')}.json`), 'utf8'),
    ),
  );

describe('stepWhy', () => {
  const list = 'path-1-i-have-not-started-yet.2';

  it('is the text after the em dash, in the document’s language', () => {
    expect(stepWhy(realDoc('start/how-to-use'), list, 0)).toBe('the order to do things');
    expect(stepWhy(afDoc('start/how-to-use'), list, 0)).toBe('die volgorde om dinge te doen');
  });

  it('is undefined when the item gives no reason, or does not exist', () => {
    expect(stepWhy(realDoc('start/how-to-use'), list, 2)).toBeUndefined();
    expect(stepWhy(realDoc('start/how-to-use'), list, 99)).toBeUndefined();
    expect(stepWhy(realDoc('start/how-to-use'), 'nope.1', 0)).toBeUndefined();
  });

  it('gives a reason for the same steps in English and Afrikaans', () => {
    const has = (doc: Doc) =>
      paths.rules.flatMap((rule) =>
        rule.steps.map((step) => stepWhy(doc, rule.list, step.item) !== undefined),
      );
    const english = has(realDoc('start/how-to-use'));
    expect(english.filter(Boolean).length).toBeGreaterThan(english.length / 2);
    expect(has(afDoc('start/how-to-use'))).toEqual(english);
  });
});

describe('docHasConditions', () => {
  it('finds headings, tasks and table rows with an entity or a type', () => {
    expect(docHasConditions(realDoc('core/tax-and-sars'))).toBe(true);
    expect(docHasConditions(realDoc('business-types/food'))).toBe(true);
    expect(docHasConditions(realDoc('lookup/checklist'))).toBe(true);
    expect(docHasConditions(realDoc('lookup/glossary'))).toBe(false);
    expect(docHasConditions(realDoc('start/start-here'))).toBe(false);
  });
});

describe('step cards', () => {
  it('My path renders every step of every rule, with every type document for $businessTypes', () => {
    const cards = allStepCards(paths);
    expect(cards).toHaveLength(paths.rules.reduce((sum, rule) => sum + rule.steps.length, 0));
    const typeCard = cards.find((card) => card.stage === 'trading' && card.item === 2);
    expect(typeCard?.docs).toHaveLength(6);
    const popia = cards.find((card) => card.stage === 'trading' && card.item === 3);
    expect(popia?.docs).toEqual([
      { doc: 'core/register', anchor: 'popia-register-your-information-officer' },
    ]);
  });

  it('a result page renders exactly the reader’s path', () => {
    const result = buildPath(
      { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
      realManifest(),
      paths,
    );
    expect(resultCards(result).map((card) => card.docs.map((doc) => doc.doc))).toEqual([
      ['lookup/checklist'],
      ['core/tax-and-sars'],
      ['business-types/food'],
      ['core/register'],
    ]);
  });
});

describe('the checklist on My path', () => {
  it('takes the listed parts of the master checklist, without the key or rules', () => {
    const blocks = checklistPartBlocks(realDoc('lookup/checklist'), [
      'part-a-everyone-in-order',
      'part-c-recurring-calendar',
    ]);
    expect(blocks[0]?.id).toBe('part-a-everyone-in-order');
    expect(
      blocks.some((block) => block.id === 'part-a2-extra-only-if-you-registered-a-pty-ltd'),
    ).toBe(false);
    expect(blocks.some((block) => block.id === 'part-c-recurring-calendar')).toBe(true);
    expect(blocks.some((block) => block.kind === 'hr')).toBe(false);
  });

  it('a type document’s own checklists', () => {
    expect(docTaskLists(realDoc('business-types/food')).map((block) => block.id)).toEqual([
      'your-checklist.1',
    ]);
  });
});

describe('the no-JavaScript wizard CSS', () => {
  const css = wizardNoJsCss();

  it('shows each result button only for its own answers', () => {
    const rule = css
      .split('\n')
      .find((line) =>
        line.includes(
          `[data-result="${resultKey({ entity: 'pty', type: 'food', stage: 'trading' })}"]`,
        ),
      );
    expect(rule).toBe(
      `html:not(.js) .st-wizard__form:has(#${wizardInputId('entity', 'pty')}:checked)` +
        ':has(#wz-type-food:checked):has(#wz-stage-trading:checked)' +
        ' .st-wizard__result[data-result="pty/food/trading"]{display:inline-flex}',
    );
    expect(css.match(/\{display:inline-flex\}/g)).toHaveLength(49);
  });

  it('explains “Pty Ltd, growing” without a Pty Ltd, and only without JavaScript', () => {
    expect(css).toContain(
      'html:not(.js) .st-wizard__form:has(#wz-stage-pty-growing:checked):not(:has(#wz-entity-pty:checked)) .st-wizard__pty-only{display:block}',
    );
    expect(css.split('\n').every((line) => line.startsWith('html:not(.js) '))).toBe(true);
  });
});
