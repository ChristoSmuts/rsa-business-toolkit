import { describe, expect, it } from 'vitest';
import {
  applyApplicability,
  checkUnusedOverrides,
  docAppliesTo,
  formatApplicability,
  mergeApplicability,
} from '../../../scripts/content/applicability';
import { IssueCollector } from '../../../scripts/content/errors';
import { assignTaskIds } from '../../../scripts/content/special/checklist';
import type { Block } from '../../../src/lib/content/schema';
import { codes, parseMd, realConfig, realEntry } from './helpers';

function applied(markdown: string, id: string) {
  const entry = realEntry(id);
  const { parsed } = parseMd(markdown, entry);
  assignTaskIds(parsed.blocks, entry.id);
  const used = new Set<string>();
  const rows = applyApplicability(parsed, realConfig(), used);
  const headings = Object.fromEntries(
    parsed.blocks
      .filter((block): block is Extract<Block, { kind: 'heading' }> => block.kind === 'heading')
      .map((heading) => [heading.id, heading.appliesTo]),
  );
  const tasks = parsed.blocks.flatMap((block) =>
    block.kind === 'tasklist' ? block.items.map((task) => task.when) : [],
  );
  return { rows, headings, tasks, used };
}

describe('merge and format', () => {
  it('lets the later entity and types win and unions tags', () => {
    expect(
      mergeApplicability(
        { entity: 'pty', tags: ['home'] },
        { businessTypes: ['food'], tags: ['import', 'home'] },
      ),
    ).toEqual({
      entity: 'pty',
      businessTypes: ['food'],
      tags: ['home', 'import'],
    });
    expect(mergeApplicability(undefined, undefined)).toBeUndefined();
    expect(
      formatApplicability({ entity: 'pty', businessTypes: ['food', 'beauty'], tags: ['home'] }),
    ).toBe('entity=pty; types=food,beauty; tags=home');
    expect(formatApplicability(docAppliesTo(realEntry('core/register')))).toBe('all');
    expect(docAppliesTo(realEntry('business-types/food'))).toEqual({
      entity: 'all',
      businessTypes: ['food'],
    });
  });
});

describe('heading inference', () => {
  it('infers sole-prop and pty, inherits to H3 and applies overrides', () => {
    const { headings, used } = applied(
      '# T\n\n## If you are a sole proprietor\n\n### Route 1\n\nA.\n\n## If you have a registered company\n\nB.\n\n## What SARS wants from a sole proprietor\n\n### Provisional tax\n\nC.\n\n## Other\n\nD.\n',
      'core/tax-and-sars',
    );
    expect(headings).toEqual({
      'if-you-are-a-sole-proprietor': { entity: 'sole-prop' },
      'route-1': { entity: 'sole-prop' },
      'if-you-have-a-registered-company': { entity: 'pty' },
      'what-sars-wants-from-a-sole-proprietor': { entity: 'sole-prop' },
      'provisional-tax': undefined,
      other: undefined,
    });
    expect([...used].sort()).toEqual([
      'core/tax-and-sars#provisional-tax',
      'core/tax-and-sars#what-sars-wants-from-a-sole-proprietor',
    ]);
  });

  it('maps "If you sell …" headings to business types only in what-you-need-to-sell-things', () => {
    const markdown =
      '# T\n\n## If you sell food\n\nA.\n\n## If you sell second-hand goods\n\nB.\n\n## If you provide professional or regulated services\n\nC.\n';
    expect(applied(markdown, 'core/what-you-need-to-sell-things').headings).toEqual({
      'if-you-sell-food': { businessTypes: ['food'] },
      'if-you-sell-second-hand-goods': { businessTypes: ['vehicle-dealer', 'retail-online'] },
      'if-you-provide-professional-or-regulated-services': {
        businessTypes: ['services-trades', 'professional-creative'],
      },
    });
    expect(applied(markdown, 'core/register').headings['if-you-sell-food']).toBeUndefined();
  });

  it('does not infer outside the configured sections', () => {
    expect(
      applied('# T\n\n## If you have a registered company\n\nA.\n', 'start/how-to-use').headings,
    ).toEqual({ 'if-you-have-a-registered-company': undefined });
  });

  it('tags master checklist groups from pseudo-heading refs and Part A2, and tasks from prefixes', () => {
    const { headings, tasks, rows } = applied(
      '# Master checklist\n\n## Part A: everyone\n\n**Compliance**\n- [ ] If a company: filed beneficial ownership\n- [ ] For a vehicle: licence copy first\n- [ ] If working from home: told my insurer\n- [ ] Plain task\n\n## Part A2: extra, only if you registered a Pty Ltd\n\n**Every year**\n- [ ] ITR14 filed\n\n## Part B\n\n**Food** (`04-business-types/02`)\n- [ ] COA displayed\n',
      'lookup/checklist',
    );
    expect(headings).toEqual({
      'part-a-everyone': undefined,
      compliance: undefined,
      'part-a2-extra-only-if-you-registered-a-pty-ltd': { entity: 'pty' },
      'every-year': { entity: 'pty' },
      'part-b': undefined,
      food: { businessTypes: ['food'] },
    });
    expect(tasks).toEqual([
      { entity: 'pty' },
      { businessTypes: ['vehicle-dealer'] },
      { tags: ['home'] },
      undefined,
      { entity: 'pty' },
      { businessTypes: ['food'] },
    ]);
    expect(rows.filter((row) => row.kind === 'task').map((row) => row.source)).toEqual([
      'prefix',
      'prefix',
      'prefix',
      'heading',
      'heading',
    ]);
  });

  it('gives every task in a business-type doc its type', () => {
    const { tasks } = applied(
      '# T\n\n## Your checklist\n\n1. One\n2. If working from home: two\n',
      'business-types/beauty',
    );
    expect(tasks).toEqual([
      { businessTypes: ['beauty'] },
      { businessTypes: ['beauty'], tags: ['home'] },
    ]);
  });
});

describe('table rows', () => {
  const partC =
    '# Master checklist\n\n## Part C: recurring calendar\n\n| When | What |\n|---|---|\n| Daily | Photograph slips |\n| Every 2 months | VAT return, if registered |\n| Monthly, if you run payroll | EMP201 by the 7th |\n| Twice a year, if an employer | EMP501 reconciliation |\n| Anniversary of registration | CIPC annual return, if you have a company |\n| Yearly | Beneficial ownership, if a company |\n| Within 12 months of year end | ITR14 company tax return |\n\n## Key to the short words\n\n| Short | Means |\n|---|---|\n| VAT | 15% sales tax, only if registered |\n';

  function table(id: string) {
    const entry = realEntry(id);
    const { parsed } = parseMd(partC, entry);
    const rows = applyApplicability(parsed, realConfig(), new Set());
    const block = parsed.blocks.find((candidate) => candidate.kind === 'table');
    return { rows, block: block?.kind === 'table' ? block : undefined };
  }

  it('gives master checklist Part C rows the condition their text states', () => {
    const { rows, block } = table('lookup/checklist');
    expect(block?.rowWhen).toEqual([
      null,
      { tags: ['vat-registered'] },
      { tags: ['employer'] },
      { tags: ['employer'] },
      { entity: 'pty' },
      { entity: 'pty' },
      { entity: 'pty' },
    ]);
    expect(rows.filter((row) => row.kind === 'row').map((row) => row.target)).toEqual([
      'part-c-recurring-calendar.1[1]',
      'part-c-recurring-calendar.1[2]',
      'part-c-recurring-calendar.1[3]',
      'part-c-recurring-calendar.1[4]',
      'part-c-recurring-calendar.1[5]',
      'part-c-recurring-calendar.1[6]',
    ]);
  });

  it('leaves tables in other documents without row conditions', () => {
    expect(table('core/register').block?.rowWhen).toBeUndefined();
  });
});

describe('override bookkeeping', () => {
  it('reports unused overrides only for documents that were built', () => {
    const config = realConfig();
    const issues = new IssueCollector();
    checkUnusedOverrides(
      {
        ...config,
        applicability: { ...config.applicability, tasks: { 'core/register:00000000': {} } },
      },
      new Set(),
      new Set(['core/tax-and-sars', 'core/register']),
      issues,
    );
    expect(codes(issues)).toEqual([
      'unknown-override',
      'unknown-override',
      'unknown-override',
      'unknown-override',
      'unknown-override',
    ]);
    const none = new IssueCollector();
    checkUnusedOverrides(config, new Set(), new Set(['start/start-here']), none);
    expect(codes(none)).toEqual([]);
  });
});
