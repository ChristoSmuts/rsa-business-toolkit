import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { defaultConfigPaths, loadConfig } from '../../../scripts/content/config';
import { IssueCollector } from '../../../scripts/content/errors';
import { linkTasks, taskKeyRenames } from '../../../scripts/content/special/checklist';
import type { Block } from '../../../src/lib/content/schema';
import { fixtureConfigPaths } from './helpers';

function list(docId: string, ...hashes: string[]): Block {
  return {
    kind: 'tasklist',
    id: 'list.1',
    hash: '0000000000000000',
    items: hashes.map((hash) => ({
      id: `${docId}:${hash}`,
      c: [{ t: 'text', v: hash }],
      doc: docId,
      block: 'list.1',
    })),
  } as unknown as Block;
}

function docs() {
  return [
    { id: 'core/register', kind: 'guide', blocks: [list('core/register', 'aaaaaaaa', 'bbbbbbbb')] },
    { id: 'business-types/food', kind: 'guide', blocks: [list('business-types/food', 'cccccccc')] },
    {
      id: 'lookup/checklist',
      kind: 'checklist',
      blocks: [list('lookup/checklist', '11111111', '22222222')],
    },
  ];
}

const sameAs = (built: ReturnType<typeof docs>, id: string): string | undefined => {
  for (const doc of built)
    for (const block of doc.blocks)
      if (block.kind === 'tasklist')
        for (const task of block.items) if (task.id === id) return task.sameAs;
  return undefined;
};

describe('linkTasks', () => {
  it('gives a linked document task the master task id as sameAs, and nothing else changes', () => {
    const built = docs();
    const issues = new IssueCollector();
    linkTasks(built, { 'core/register:aaaaaaaa': 'lookup/checklist:11111111' }, issues);
    expect(issues.issues).toEqual([]);
    expect(sameAs(built, 'core/register:aaaaaaaa')).toBe('lookup/checklist:11111111');
    expect(sameAs(built, 'core/register:bbbbbbbb')).toBeUndefined();
    expect(sameAs(built, 'lookup/checklist:11111111')).toBeUndefined();
  });

  it.each([
    [
      'an unknown source',
      { 'core/register:ffffffff': 'lookup/checklist:11111111' },
      'task-link-unknown',
    ],
    [
      'an unknown target',
      { 'core/register:aaaaaaaa': 'lookup/checklist:ffffffff' },
      'task-link-unknown',
    ],
    [
      'a target that is not on the master checklist',
      { 'core/register:aaaaaaaa': 'business-types/food:cccccccc' },
      'task-link-target',
    ],
    [
      'a source on the master checklist',
      { 'lookup/checklist:11111111': 'lookup/checklist:22222222' },
      'task-link-target',
    ],
  ])('rejects %s', (_label, links, code) => {
    const issues = new IssueCollector();
    linkTasks(docs(), links, issues);
    expect(issues.issues.map((issue) => issue.code)).toEqual([code]);
  });

  it('rejects a chain', () => {
    const issues = new IssueCollector();
    linkTasks(
      docs(),
      {
        'core/register:aaaaaaaa': 'lookup/checklist:11111111',
        'lookup/checklist:11111111': 'lookup/checklist:22222222',
      },
      issues,
    );
    expect(issues.issues.map((issue) => issue.code).sort()).toEqual([
      'task-link-chain',
      'task-link-target',
    ]);
  });

  it('rejects a master task linked twice, and keeps the first link', () => {
    const built = docs();
    const issues = new IssueCollector();
    linkTasks(
      built,
      {
        'core/register:aaaaaaaa': 'lookup/checklist:11111111',
        'business-types/food:cccccccc': 'lookup/checklist:11111111',
      },
      issues,
    );
    expect(issues.issues.map((issue) => issue.code)).toEqual(['task-link-twice']);
    expect(sameAs(built, 'core/register:aaaaaaaa')).toBe('lookup/checklist:11111111');
    expect(sameAs(built, 'business-types/food:cccccccc')).toBeUndefined();
  });

  it('rejects a link into a document that does not exist (a typo), rather than skipping it', () => {
    const issues = new IssueCollector();
    linkTasks(docs(), { 'core/vehicles:aaaaaaaa': 'lookup/checklist:11111111' }, issues);
    linkTasks(docs(), { 'core/register:aaaaaaaa': 'lookup/checklst:11111111' }, issues);
    expect(issues.issues.map((issue) => issue.code)).toEqual([
      'task-link-unknown',
      'task-link-unknown',
    ]);
  });
});

describe('taskKeyRenames', () => {
  function linked() {
    const built = docs();
    linkTasks(
      built,
      { 'core/register:aaaaaaaa': 'lookup/checklist:11111111' },
      new IssueCollector(),
    );
    return built;
  }

  it("maps every linked task's own id to its master task, and an old id to the current key", () => {
    const issues = new IssueCollector();
    const renames = taskKeyRenames(
      linked(),
      {
        'core/register:00000000': 'core/register:aaaaaaaa',
        'core/register:99999999': 'core/register:bbbbbbbb',
      },
      issues,
    );
    expect(issues.issues).toEqual([]);
    expect(renames).toEqual({
      // The renamed task is linked, so its old id goes straight to the master key.
      'core/register:00000000': 'lookup/checklist:11111111',
      'core/register:99999999': 'core/register:bbbbbbbb',
      'core/register:aaaaaaaa': 'lookup/checklist:11111111',
    });
  });

  it.each([
    [
      'a new id that is not a task',
      { 'core/register:00000000': 'core/register:ffffffff' },
      'task-rename-unknown',
    ],
    [
      'an old id that is still a task',
      { 'core/register:bbbbbbbb': 'core/register:aaaaaaaa' },
      'task-rename-current',
    ],
    [
      'a chain',
      {
        'core/register:00000000': 'core/register:bbbbbbbb',
        'core/register:bbbbbbbb': 'core/register:aaaaaaaa',
      },
      'task-rename-chain',
    ],
  ])('rejects %s', (_label, renames, code) => {
    const issues = new IssueCollector();
    taskKeyRenames(linked(), renames, issues);
    expect(issues.issues.map((issue) => issue.code)).toContain(code);
  });
});

describe('content-meta/task-links.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'task-links-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('is read when present and empty when absent', () => {
    expect(
      Object.keys(
        loadConfig(defaultConfigPaths(join(process.cwd(), 'content-meta'))).taskLinks.links,
      ).length,
    ).toBeGreaterThan(0);
    const missing = { ...fixtureConfigPaths(), taskLinks: join(dir, 'none.json') };
    expect(loadConfig(missing).taskLinks).toEqual({ version: 1, links: {} });
    const noPath = { ...fixtureConfigPaths(), taskLinks: undefined };
    expect(loadConfig(noPath).taskLinks.links).toEqual({});
    expect(loadConfig(noPath).taskRenames).toEqual({ version: 1, renames: {} });
    const renames = join(dir, 'renames.json');
    writeFileSync(renames, JSON.stringify({ version: 1, renames: {} }));
    expect(
      loadConfig({ ...fixtureConfigPaths(), taskRenames: renames }).taskRenames.renames,
    ).toEqual({});
  });

  it('refuses a link that is not a task id', () => {
    const bad = join(dir, 'bad.json');
    writeFileSync(
      bad,
      JSON.stringify({ version: 1, links: { nope: 'lookup/checklist:11111111' } }),
    );
    expect(() => loadConfig({ ...fixtureConfigPaths(), taskLinks: bad })).toThrow(/invalid/);
  });
});
