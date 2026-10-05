import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PathsFileSchema, type Block, type PathsFile } from '../../src/lib/content/schema';
import {
  applies,
  appliesAttributes,
  appliesFromAttributes,
  buildPath,
  conditionMatches,
  hiddenReason,
  markStep,
  pathDocs,
  pathNeighbours,
  pathProgress,
  readerTypes,
  stepDone,
  type PathManifest,
  type PathRules,
} from '../../src/lib/path-engine';
import type { Profile } from '../../src/lib/profile';
import { DATA_DIR, realDoc, realManifest } from './site/data';

const paths: PathsFile = PathsFileSchema.parse(
  JSON.parse(readFileSync(path.join(DATA_DIR, 'paths.json'), 'utf8')),
);
const manifest = realManifest();

/** The documents an item of a "Choose your path" list links to, in order. */
function listDocs(listId: string): string[][] {
  const source = realDoc('start/how-to-use');
  const list = source.blocks.find(
    (block): block is Extract<Block, { kind: 'list' }> => block.id === listId,
  );
  if (!list) throw new Error(`no list ${listId}`);
  return list.items.map((runs) =>
    runs.flatMap((run) => (run.t === 'link' && 'doc' in run ? [run.doc] : [])),
  );
}

const docsOf = (profile: Profile): string[] =>
  pathDocs(buildPath(profile, manifest, paths)).map((item) => item.doc);

describe('buildPath: the two A5 fixtures', () => {
  it('{pty, [vehicle-dealer], pty-growing} is exactly Path 4’s ten documents, in order', () => {
    const profile: Profile = {
      entity: 'pty',
      businessTypes: ['vehicle-dealer'],
      stage: 'pty-growing',
    };
    const path4 = listDocs(
      'path-4-i-am-a-one-person-pty-ltd-selling-vehicles-and-i-want-to-grow.2',
    );
    expect(path4).toHaveLength(10);
    const result = buildPath(profile, manifest, paths);
    expect(result.steps).toHaveLength(10);
    expect(pathDocs(result).map((item) => item.doc)).toEqual(path4.flat());
    expect(result.steps.map((step) => step.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // The SBC section, not the whole tax page (A5 "tax SBC anchor").
    expect(result.steps[5]?.items[0]?.anchor).toBe(
      'route-4-small-business-corporation-rates-companies-only',
    );
    // Path 4 is written for a dealer, so every "why" fits.
    expect(result.steps.every((step) => step.why)).toBe(true);
  });

  it('{undecided, general, not-started} is Path 1 with three type documents at step 3', () => {
    const profile: Profile = {
      entity: 'undecided',
      businessTypes: ['general'],
      stage: 'not-started',
    };
    const result = buildPath(profile, manifest, paths);
    const path1 = listDocs('path-1-i-have-not-started-yet.2');
    expect(result.steps).toHaveLength(10);
    expect(result.steps[2]?.n).toBe(3);
    expect(result.steps[2]?.items.map((item) => item.doc)).toEqual([
      'business-types/retail-online',
      'business-types/services-trades',
      'business-types/professional-creative',
    ]);
    // Every other step is the list item's own links, in order (step 10 kept: undecided).
    const others = result.steps.filter((step) => step.n !== 3);
    expect(others.map((step) => step.items.map((item) => item.doc))).toEqual(
      path1.filter((_, index) => index !== 2),
    );
  });
});

describe('buildPath: the other rules', () => {
  it('drops the company step for a sole proprietor who has not started', () => {
    const result = buildPath(
      { entity: 'sole-prop', businessTypes: ['food'], stage: 'not-started' },
      manifest,
      paths,
    );
    expect(result.steps).toHaveLength(9);
    expect(pathDocs(result).map((item) => item.doc)).not.toContain('core/running-a-pty-ltd');
    expect(result.steps[2]?.items).toEqual([{ doc: 'business-types/food' }]);
  });

  it('keeps the company step for a Pty Ltd that has not started', () => {
    expect(
      docsOf({ entity: 'pty', businessTypes: ['beauty'], stage: 'not-started' }).slice(-2),
    ).toEqual(['core/running-a-pty-ltd', 'core/paying-yourself']);
  });

  it('follows Path 2 for a trader, with the POPIA section of Register', () => {
    const result = buildPath(
      { entity: 'sole-prop', businessTypes: ['beauty', 'food'], stage: 'trading' },
      manifest,
      paths,
    );
    expect(result.stage).toBe('trading');
    expect(result.steps.map((step) => step.items.map((item) => item.doc))).toEqual([
      ['lookup/checklist'],
      ['core/tax-and-sars'],
      ['business-types/beauty', 'business-types/food'],
      ['core/register'],
    ]);
    expect(result.steps[3]?.items[0]?.anchor).toBe('popia-register-your-information-officer');
  });

  it('generalises Path 4: no vehicles step and no dealer “why” for another kind of business', () => {
    const result = buildPath(
      { entity: 'pty', businessTypes: ['professional-creative'], stage: 'pty-growing' },
      manifest,
      paths,
    );
    expect(pathDocs(result).map((item) => item.doc)).not.toContain('core/vehicles');
    expect(result.steps).toHaveLength(9);
    const byDoc = new Map(result.steps.map((step) => [step.items[0]?.doc, step.why]));
    expect(byDoc.get('core/running-a-pty-ltd')).toBe(true);
    expect(byDoc.get('core/tax-and-sars')).toBe(false);
    expect(byDoc.get('business-types/professional-creative')).toBe(false);
  });

  it('puts the primary type first and expands General in place without repeats', () => {
    const result = buildPath(
      { entity: 'pty', businessTypes: ['food', 'general', 'retail-online'], stage: 'pty-growing' },
      manifest,
      paths,
    );
    expect(result.steps[3]?.items.map((item) => item.doc)).toEqual([
      'business-types/food',
      'business-types/retail-online',
      'business-types/services-trades',
      'business-types/professional-creative',
    ]);
  });

  it('reads “Pty Ltd, growing” without a company as already trading', () => {
    const profile = { entity: 'sole-prop', businessTypes: ['food'], stage: 'pty-growing' } as const;
    expect(buildPath(profile, manifest, paths).stage).toBe('trading');
  });

  it('shows a document only at its first step and skips unknown documents', () => {
    const rules: PathRules = {
      ...paths,
      rules: paths.rules.map((rule) =>
        rule.stage === 'trading'
          ? {
              ...rule,
              steps: [
                { item: 0, docs: ['core/register'] },
                { item: 1, docs: ['core/register', 'core/not-a-doc'] },
                { item: 2, docs: ['core/tax-and-sars'] },
              ],
            }
          : rule,
      ),
    };
    const result = buildPath(
      { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' },
      manifest,
      rules,
    );
    expect(result.steps.map((step) => [step.n, step.item])).toEqual([
      [1, 0],
      [2, 2],
    ]);
  });

  it('throws when the rules have no rule for the stage', () => {
    const rules: PathRules = { ...paths, rules: paths.rules.filter((r) => r.stage !== 'trading') };
    expect(() =>
      buildPath({ entity: 'pty', businessTypes: ['food'], stage: 'trading' }, manifest, rules),
    ).toThrow(/no rule for "trading"/);
  });

  it('works on the documents in paths.json alone, as the browser does', () => {
    const fromPaths: PathManifest = paths;
    for (const stage of ['not-started', 'trading', 'pty-growing'] as const) {
      const profile: Profile = { entity: 'pty', businessTypes: ['general', 'food'], stage };
      expect(buildPath(profile, fromPaths, paths)).toEqual(buildPath(profile, manifest, paths));
    }
  });
});

describe('applies (the A5 matching rule)', () => {
  const sole: Profile = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' };
  const undecided: Profile = { ...sole, entity: 'undecided' };
  const general: Profile = { ...sole, businessTypes: ['general'] };

  it('applies to everyone when nothing is said', () => {
    expect(applies(undefined, sole)).toBe(true);
    expect(applies({ entity: 'all', businessTypes: 'all' }, sole)).toBe(true);
    expect(applies({ tags: ['home'] }, sole)).toBe(true);
  });

  it('matches the entity, and an undecided reader sees both', () => {
    expect(applies({ entity: 'pty' }, sole)).toBe(false);
    expect(applies({ entity: 'sole-prop' }, sole)).toBe(true);
    expect(applies({ entity: 'pty' }, undecided)).toBe(true);
    expect(applies({ entity: 'pty', businessTypes: 'all' }, undecided)).toBe(true);
  });

  it('needs one shared business type, with General expanded', () => {
    expect(applies({ businessTypes: ['beauty'] }, sole)).toBe(false);
    expect(applies({ businessTypes: ['beauty', 'food'] }, sole)).toBe(true);
    expect(applies({ businessTypes: ['retail-online'] }, general)).toBe(true);
    expect(applies({ businessTypes: ['vehicle-dealer'] }, general)).toBe(false);
    expect(applies({ businessTypes: ['vehicle-dealer'] }, general, ['vehicle-dealer'])).toBe(true);
  });

  it('needs both halves', () => {
    expect(applies({ entity: 'pty', businessTypes: ['food'] }, sole)).toBe(false);
    expect(applies({ entity: 'sole-prop', businessTypes: ['beauty'] }, sole)).toBe(false);
  });

  it('readerTypes expands General with the default preset', () => {
    expect(readerTypes(general)).toEqual([
      'retail-online',
      'services-trades',
      'professional-creative',
    ]);
  });
});

describe('hiddenReason', () => {
  const sole: Profile = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' };

  it('names the entity when that is why, otherwise the business types', () => {
    expect(hiddenReason({ entity: 'pty' }, sole)).toBe('pty');
    expect(hiddenReason({ entity: 'sole-prop' }, { ...sole, entity: 'pty' })).toBe('sole-prop');
    expect(hiddenReason({ businessTypes: ['beauty'] }, sole)).toBe('businessTypes');
    expect(hiddenReason({ entity: 'sole-prop', businessTypes: ['beauty'] }, sole)).toBe(
      'businessTypes',
    );
    expect(
      hiddenReason({ entity: 'pty', businessTypes: ['beauty'] }, { ...sole, entity: 'undecided' }),
    ).toBe('businessTypes');
    expect(hiddenReason({ businessTypes: ['food'] }, sole)).toBeUndefined();
  });
});

describe('conditionMatches', () => {
  const pty: Profile = { entity: 'pty', businessTypes: ['general'], stage: 'pty-growing' };

  it('checks every key it is given', () => {
    expect(conditionMatches(undefined, pty)).toBe(true);
    expect(conditionMatches({ entity: ['pty', 'undecided'] }, pty)).toBe(true);
    expect(conditionMatches({ entity: ['sole-prop'] }, pty)).toBe(false);
    expect(conditionMatches({ businessTypes: ['services-trades'] }, pty)).toBe(true);
    expect(conditionMatches({ businessTypes: ['food'] }, pty)).toBe(false);
    expect(conditionMatches({ entity: ['pty'], businessTypes: ['food'] }, pty)).toBe(false);
  });
});

describe('progress and marks', () => {
  const result = buildPath(
    { entity: 'sole-prop', businessTypes: ['general'], stage: 'not-started' },
    manifest,
    paths,
  );
  const now = new Date('2026-10-05T08:00:00Z');

  it('a step is done when every document in it is marked', () => {
    const typeStep = result.steps[2];
    if (!typeStep) throw new Error('no step 3');
    const half = { 'business-types/retail-online': now.toISOString() };
    expect(stepDone(typeStep, half)).toBe(false);
    const all = markStep(half, typeStep, true, now);
    expect(stepDone(typeStep, all)).toBe(true);
    expect(Object.keys(all)).toHaveLength(3);
  });

  it('counts done steps and names the next one', () => {
    expect(pathProgress(result, {})).toMatchObject({ done: 0, total: 9 });
    expect(pathProgress(result, {}).next?.n).toBe(1);
    const first = result.steps[0];
    if (!first) throw new Error('no step 1');
    const done = markStep({}, first, true, now);
    expect(pathProgress(result, done)).toMatchObject({ done: 1, total: 9 });
    expect(pathProgress(result, done).next?.n).toBe(2);
    let everything = {};
    for (const step of result.steps) everything = markStep(everything, step, true, now);
    expect(pathProgress(result, everything)).toEqual({ done: 9, total: 9, next: undefined });
  });

  it('unmarking removes the step’s documents, and an unchanged map is returned as is', () => {
    const first = result.steps[0];
    if (!first) throw new Error('no step 1');
    const done = markStep({}, first, true, now);
    expect(markStep(done, first, true, now)).toBe(done);
    expect(markStep(done, first, false)).toEqual({});
    const empty = {};
    expect(markStep(empty, first, false)).toBe(empty);
  });

  it('pathNeighbours gives the documents either side on the path', () => {
    expect(pathNeighbours(result, 'core/start-here')).toEqual({
      previous: undefined,
      next: { doc: 'business-types/pick-your-business-type' },
      onPath: true,
    });
    expect(pathNeighbours(result, 'business-types/services-trades')).toEqual({
      previous: { doc: 'business-types/retail-online' },
      next: { doc: 'business-types/professional-creative' },
      onPath: true,
    });
    expect(pathNeighbours(result, 'lookup/glossary')).toEqual({
      previous: undefined,
      next: undefined,
      onPath: false,
    });
  });
});

describe('applicability attributes round trip', () => {
  it('writes and reads entity and types', () => {
    const attrs = appliesAttributes({ entity: 'pty', businessTypes: ['food', 'beauty'] });
    expect(attrs).toEqual({ 'data-entity': 'pty', 'data-types': 'food beauty' });
    expect(appliesFromAttributes(attrs['data-entity'], attrs['data-types'])).toEqual({
      entity: 'pty',
      businessTypes: ['food', 'beauty'],
    });
  });

  it('writes nothing for everyone and reads nothing back', () => {
    expect(appliesAttributes(undefined)).toEqual({});
    expect(appliesAttributes({ entity: 'all', businessTypes: 'all' })).toEqual({});
    expect(appliesAttributes({ tags: ['home'] })).toEqual({});
    expect(appliesFromAttributes(undefined, undefined)).toBeUndefined();
    expect(appliesFromAttributes('all', '  ')).toBeUndefined();
  });
});
