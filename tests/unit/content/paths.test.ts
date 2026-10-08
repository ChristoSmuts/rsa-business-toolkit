import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../../scripts/content/config';
import { IssueCollector } from '../../../scripts/content/errors';
import { buildPathsFile, checkPaths, splitRef } from '../../../scripts/content/paths';
import { PathsFileSchema, type PathsConfig } from '../../../src/lib/content/schema';
import { realDocs } from '../site/data';
import { fixtureConfigPaths, realConfig, repoRoot } from './helpers';

const config = realConfig();
const docs = realDocs();
const rules = (): PathsConfig => structuredClone(config.paths!);

function problems(paths: PathsConfig): string[] {
  const issues = new IssueCollector();
  checkPaths(paths, config, docs, issues);
  expect(issues.issues.every((issue) => issue.code === 'paths')).toBe(true);
  return issues.issues.map((issue) => issue.message);
}

function stepOf(paths: PathsConfig, stage: string, item: number) {
  const step = paths.rules.find((rule) => rule.stage === stage)?.steps.find((s) => s.item === item);
  if (!step) throw new Error(`no step ${stage} ${item}`);
  return step;
}

describe('content-meta/paths.json', () => {
  it('is loaded, and absent from the fixture config', () => {
    expect(config.paths?.rules.map((rule) => rule.stage)).toEqual([
      'not-started',
      'trading',
      'pty-growing',
    ]);
    expect(loadConfig(fixtureConfigPaths()).paths).toBeUndefined();
  });

  it('matches the lists in “How to use this toolkit”', () => {
    expect(problems(rules())).toEqual([]);
  });

  it('fails on a document or anchor that does not exist', () => {
    const paths = rules();
    stepOf(paths, 'not-started', 0).docs = ['core/start-there'];
    stepOf(paths, 'trading', 3).docs = ['core/register#nope'];
    expect(problems(paths)).toEqual(
      expect.arrayContaining([
        'paths.json not-started item 0: core/start-there does not exist',
        'paths.json trading item 3: #nope is not a heading in core/register',
        'paths.json not-started item 0: the list item links to core/start-here, which the step leaves out',
      ]),
    );
  });

  it('fails when a step’s documents are not the ones its list item links to', () => {
    const paths = rules();
    stepOf(paths, 'not-started', 5).docs = ['core/register'];
    expect(problems(paths)).toEqual([
      'paths.json not-started item 5: the list item does not link to core/register',
      'paths.json not-started item 5: the list item links to paperwork/free-tools, which the step leaves out',
    ]);
  });

  it('fails when $businessTypes sits on an item that names no business type', () => {
    const paths = rules();
    stepOf(paths, 'trading', 1).docs = ['$businessTypes'];
    expect(problems(paths)).toEqual(
      expect.arrayContaining([
        'paths.json trading item 1: $businessTypes but the item names no business type',
      ]),
    );
  });

  it('fails on a missing list, item, source or checklist part', () => {
    const paths = rules();
    paths.rules[0]!.list = 'path-1-i-have-not-started-yet.9';
    paths.rules[1]!.steps.push({ item: 7, docs: ['core/register'] });
    paths.rules[1]!.steps.push({ item: 0, docs: ['lookup/checklist'] });
    paths.checklist.parts.push({ heading: 'part-z' });
    expect(problems(paths)).toEqual(
      expect.arrayContaining([
        'paths.json not-started: path-1-i-have-not-started-yet.9 is not a list in start/how-to-use',
        'paths.json trading item 7: path-2-i-am-already-trading-and-want-to-get-compliant.1 has 4 items',
        'paths.json trading item 0: used by two steps',
        'paths.json checklist: #part-z is not a heading in lookup/checklist',
      ]),
    );
    const noSource = rules();
    noSource.source = 'start/nothing-here';
    expect(problems(noSource)).toEqual([
      'paths.json: source document start/nothing-here does not exist',
    ]);
    const noChecklist = rules();
    noChecklist.checklist.doc = 'lookup/nothing';
    expect(problems(noChecklist)).toEqual(['paths.json checklist: lookup/nothing does not exist']);
  });

  it('fails when a rule skips an item or follows a bulleted list', () => {
    const paths = rules();
    paths.rules[1]!.steps.pop();
    paths.rules[2]!.list = 'before-you-act-on-a-number.2';
    paths.rules[2]!.steps = [{ item: 0, docs: ['core/start-here'] }];
    expect(problems(paths)).toEqual(
      expect.arrayContaining([
        'paths.json trading: path-2-i-am-already-trading-and-want-to-get-compliant.1 has 4 items, the rule covers 3',
        'paths.json pty-growing: before-you-act-on-a-number.2 is not a numbered list',
      ]),
    );
  });
});

describe('src/data/paths.json', () => {
  it('is what buildPathsFile makes, and lists every document a path can name', () => {
    const committed = PathsFileSchema.parse(
      JSON.parse(readFileSync(join(repoRoot, 'src', 'data', 'paths.json'), 'utf8')),
    );
    const built = buildPathsFile(config.paths!, config, [{ lang: 'en', docs }]);
    expect(built.rules).toEqual(committed.rules);
    expect(built.general).toEqual(['retail-online', 'services-trades', 'professional-creative']);
    expect(Object.keys(committed.docs).sort()).toEqual(Object.keys(built.docs).sort());
    for (const type of committed.businessTypes) expect(committed.docs[type.doc]).toBeDefined();
    expect(committed.docs['core/register']?.titles.af).toBeTruthy();
    expect(committed.docs['core/running-a-pty-ltd']?.appliesTo.entity).toBe('pty');
  });

  it('splitRef reads a document and an optional anchor', () => {
    expect(splitRef('core/register')).toEqual({ doc: 'core/register', anchor: undefined });
    expect(splitRef('core/register#popia')).toEqual({ doc: 'core/register', anchor: 'popia' });
  });
});
