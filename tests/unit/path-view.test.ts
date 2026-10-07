import { describe, expect, it } from 'vitest';
import {
  makePathView,
  pathViewSchema,
  viewFor,
  viewNeighbours,
  viewProgress,
  viewRoute,
  viewTitle,
} from '../../src/lib/path-view';
import { profileQuery } from '../../src/lib/profile';
import { PATHS, readerPath, viewOf } from '../../src/scripts/path-data';

const FOOD = { entity: 'sole-prop', businessTypes: ['food'], stage: 'trading' } as const;
const view = viewOf(FOOD, PATHS.hash);
const AT = '2026-10-01T10:00:00.000Z';

describe('makePathView', () => {
  it('keeps the steps, their anchors, and only the pages on the path', () => {
    expect(view.version).toBe(PATHS.hash);
    expect(view.profile).toBe(profileQuery(FOOD));
    expect(view.steps).toEqual([
      ['lookup/checklist'],
      ['core/tax-and-sars'],
      ['business-types/food'],
      ['core/register#popia-register-your-information-officer'],
    ]);
    expect(Object.keys(view.docs).sort()).toEqual([
      'business-types/food',
      'core/register',
      'core/tax-and-sars',
      'lookup/checklist',
    ]);
    expect(view.docs['core/register']).toEqual({
      route: PATHS.docs['core/register']?.route,
      titles: PATHS.docs['core/register']?.titles,
    });
  });

  it('has the same step count as the engine for every rule', () => {
    const who = {
      entity: 'pty',
      businessTypes: ['vehicle-dealer', 'beauty'],
      stage: 'pty-growing',
    } as const;
    expect(viewOf(who, 'v').steps).toHaveLength(readerPath(who).steps.length);
    expect(makePathView([], {}, 'v', '').steps).toEqual([]);
  });
});

describe('pathViewSchema', () => {
  it('accepts a stored view, as JSON gives it back', () => {
    expect(pathViewSchema.safeParse(JSON.parse(JSON.stringify(view)))).toEqual({
      success: true,
      data: view,
    });
  });

  it.each([
    ['not an object', 'path'],
    ['null', null],
    ['no version', { ...view, version: 1 }],
    ['a step with no pages', { ...view, steps: [[]] }],
    ['a page it has no route for', { ...view, steps: [['core/vehicles']] }],
    ['a title that is not text', { ...view, docs: { x: { route: 'x/', titles: { en: 1 } } } }],
  ])('rejects %s', (_, value) => {
    expect(pathViewSchema.safeParse(value).success).toBe(false);
  });
});

describe('viewFor', () => {
  it('is the view only for the same version and answers', () => {
    expect(viewFor(view, PATHS.hash, profileQuery(FOOD))).toBe(view);
    expect(viewFor(view, 'other', profileQuery(FOOD))).toBeUndefined();
    expect(viewFor(view, PATHS.hash, 'entity=pty')).toBeUndefined();
    expect(viewFor(null, PATHS.hash, profileQuery(FOOD))).toBeUndefined();
  });
});

describe('viewProgress', () => {
  it('counts the steps whose pages are all marked, and finds the first one left', () => {
    expect(viewProgress(view, {})).toEqual({
      done: 0,
      total: 4,
      next: { n: 1, first: { doc: 'lookup/checklist', anchor: undefined } },
    });
    expect(viewProgress(view, { 'lookup/checklist': AT, 'core/tax-and-sars': AT })).toEqual({
      done: 2,
      total: 4,
      next: { n: 3, first: { doc: 'business-types/food', anchor: undefined } },
    });
  });
});

describe('viewNeighbours, viewRoute and viewTitle', () => {
  it('walks the path page by page, and knows its last page', () => {
    expect(viewNeighbours(view, 'core/tax-and-sars')).toEqual({
      previous: { doc: 'lookup/checklist', anchor: undefined },
      next: { doc: 'business-types/food', anchor: undefined },
      onPath: true,
      last: false,
    });
    const end = viewNeighbours(view, 'core/register');
    expect(end).toMatchObject({ next: undefined, onPath: true, last: true });
    expect(viewNeighbours(view, 'lookup/glossary')).toEqual({
      previous: undefined,
      next: undefined,
      onPath: false,
      last: false,
    });
  });

  it('gives the route with its anchor, and the title with an English fallback', () => {
    expect(
      viewRoute(view, { doc: 'core/register', anchor: 'popia-register-your-information-officer' }),
    ).toBe('core/register/#popia-register-your-information-officer');
    expect(viewRoute(view, { doc: 'nope', anchor: undefined })).toBeUndefined();
    expect(viewTitle(view, 'core/register', 'en')).toEqual({
      title: PATHS.docs['core/register']?.titles['en'],
      lang: undefined,
    });
    const english = { ...view, docs: { a: { route: 'a/', titles: { en: 'Only English' } } } };
    expect(viewTitle(english, 'a', 'af')).toEqual({ title: 'Only English', lang: 'en-ZA' });
    expect(viewTitle(english, 'b', 'af')).toEqual({ title: 'b', lang: 'en-ZA' });
  });
});
