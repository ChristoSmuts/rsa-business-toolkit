import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../../scripts/content/config';
import { IssueCollector, formatIssue } from '../../../scripts/content/errors';
import { TaskIdAllocator, normaliseTaskText } from '../../../scripts/content/ids';
import { buildDoc } from '../../../scripts/content/meta';
import { assignTaskIds, collectTaskRecords } from '../../../scripts/content/special/checklist';
import {
  assignGlossaryIds,
  buildGlossaryFile,
  glossaryEntryFromRuns,
} from '../../../scripts/content/special/glossary';
import { buildQuickAnswers } from '../../../scripts/content/special/quick-answers';
import {
  buildSourcesFile,
  splitAtDashes,
  stripPrefix,
  type SourcesContext,
} from '../../../scripts/content/special/sources';
import { runsToText } from '../../../scripts/content/text';
import type { Block } from '../../../src/lib/content/schema';
import {
  codes,
  enMarkers,
  fixtureConfigPaths,
  fixturesDir,
  parseMd,
  readCorpus,
  realConfig,
  realEntry,
} from './helpers';

describe('glossary', () => {
  it('splits "**Term** — Definition" on the em dash', () => {
    expect(
      glossaryEntryFromRuns([
        { t: 'strong', c: [{ t: 'text', v: 'CoR 14.3' }] },
        { t: 'text', v: ' — Your company registration certificate.' },
      ]),
    ).toEqual({
      term: 'CoR 14.3',
      definition: [{ t: 'text', v: 'Your company registration certificate.' }],
    });
    expect(
      glossaryEntryFromRuns([
        { t: 'strong', c: [{ t: 'text', v: 'CIPC' }] },
        { t: 'text', v: ' - hyphen, not an em dash' },
      ]),
    ).toBeUndefined();
    expect(glossaryEntryFromRuns([{ t: 'text', v: 'Plain paragraph' }])).toBeUndefined();
  });

  it('parses the real glossary into 121 entries in 7 groups with unique ids', () => {
    const entry = realEntry('lookup/glossary');
    const { parsed, issues } = parseMd(readCorpus(entry), entry);
    assignGlossaryIds(parsed.glossary, entry.id, issues);
    expect(codes(issues)).toEqual([]);
    const file = buildGlossaryFile('en', entry.id, parsed.blocks, parsed.glossary);
    expect(file.entries).toHaveLength(121);
    expect(file.groups.map((group) => group.id)).toEqual([
      'registration-and-companies',
      'tax',
      'compliance',
      'licensing',
      'vehicles',
      'working-from-home-and-getting-paid',
      'money-and-documents',
    ]);
    expect(new Set(file.entries.map((item) => item.id)).size).toBe(121);
    expect(file.entries.find((item) => item.id === 'rwc--cor')?.term).toBe('RWC / CoR');
    expect(parsed.blocks.filter((block) => block.kind === 'glossary')).toHaveLength(7);
  });

  it('reports a non-entry paragraph and duplicate ids', () => {
    const entry = realEntry('lookup/glossary');
    const { parsed, issues } = parseMd(
      '# Glossary\n\n## Tax\n\n**VAT** — One.\n\nNot an entry.\n\n**vat** — Two.\n',
      entry,
    );
    assignGlossaryIds(parsed.glossary, entry.id, issues);
    expect(codes(issues)).toEqual(['glossary-entry', 'glossary-id']);
  });
});

describe('sources register', () => {
  const config = loadConfig(fixtureConfigPaths());
  const entry = config.docsMeta.docs.find((doc) => doc.id === 'lookup/sources');
  if (!entry) throw new Error('fixture sources entry missing');
  const source = readFileSync(
    join(fixturesDir, 'en', '05 Look it up', '03-sources-and-verification-register.md'),
    'utf8',
  );
  const businessTypeDocs = realConfig().businessTypes.types.map((type) => type.doc);
  const SARB = 'south-african-reserve-bank--banknote-security-features';

  function build(markdown: string, overrides: Partial<SourcesContext> = {}) {
    const { parsed, issues } = parseMd(markdown, entry as NonNullable<typeof entry>, 'en', config);
    const file = buildSourcesFile({
      lang: 'en',
      entry: entry as NonNullable<typeof entry>,
      blocks: parsed.blocks,
      markers: enMarkers(),
      businessTypeDocs,
      issues,
      ...overrides,
    });
    return { file, issues };
  }

  it('extracts the check date, acts with expansions, sub-groups and entries', () => {
    const { file, issues } = build(source);
    expect(codes(issues)).toEqual([]);
    expect(file?.checkedOn).toBe('2026-09-13');
    expect(file?.acts).toEqual([
      {
        id: 'income-tax-act-58-of-1962',
        name: 'Income Tax Act 58 of 1962',
        governs: [{ t: 'text', v: 'Income tax' }],
        appearsIn: ['core/tax-fixture'],
      },
      {
        id: 'consumer-protection-act-68-of-2008',
        name: 'Consumer Protection Act 68 of 2008',
        governs: [{ t: 'text', v: 'Consumer rights' }],
        appearsIn: ['core/tax-fixture', ...businessTypeDocs],
      },
      {
        id: 'companies-act-71-of-2008',
        name: 'Companies Act 71 of 2008',
        governs: [{ t: 'text', v: 'Company records' }],
        appearsIn: ['paperwork/which-template-fixture', 'paperwork/templates/quotation-fixture'],
      },
    ]);
    expect(file?.groups).toEqual([
      {
        id: 'tax-and-sars',
        title: 'Tax and SARS',
        order: 1,
        notes: [
          [{ t: 'text', v: 'Secondary, used to cross-check the tables:' }],
          [
            { t: 'strong', c: [{ t: 'text', v: 'Not used:' }] },
            { t: 'text', v: ' an out-of-date article. It was checked and rejected.' },
          ],
        ],
        subgroups: [
          {
            id: SARB,
            title: 'South African Reserve Bank — banknote security features',
            block: 'tax-and-sars.6',
            notes: [],
            entry: SARB,
          },
        ],
      },
    ]);
    const supportsFrom = (id: string): string | undefined =>
      file?.entries.find((item) => item.id === id)?.supportsFrom;
    // An entry whose text is in a note or on the title line still says what it supports, once.
    expect(supportsFrom('cipc--annual-returns-filing-system')).toBe('note');
    expect(supportsFrom('sars--turnover-tax')).toBeUndefined();
    const summary = file?.entries.map((item) => ({
      id: item.id,
      type: item.type,
      official: item.official,
      url: item.url,
      urls: item.urls.length,
      supports: item.supports?.length ?? 0,
      notes: item.notes?.length ?? 0,
      item: item.item,
      subgroupId: item.subgroupId,
    }));
    expect(summary).toEqual([
      {
        id: 'sars--turnover-tax',
        type: 'web',
        official: true,
        url: 'https://www.sars.gov.za/types-of-tax/turnover-tax/',
        urls: 1,
        supports: 1,
        notes: 0,
        item: undefined,
        subgroupId: undefined,
      },
      {
        id: 'sars--budget-2026-faq',
        type: 'citation',
        official: true,
        url: undefined,
        urls: 0,
        supports: 1,
        notes: 0,
        item: undefined,
        subgroupId: undefined,
      },
      {
        id: 'xero-za-sars-tax-tables-20262027',
        type: 'web',
        official: false,
        url: 'https://www.xero.com/za/guides/sars-tax-tables-2026/',
        urls: 1,
        supports: 1,
        notes: 0,
        item: 0,
        subgroupId: undefined,
      },
      {
        id: 'cipc--annual-returns-filing-system',
        type: 'web',
        official: true,
        url: 'https://annualreturns.cipc.co.za',
        urls: 1,
        // The register wrote no `Supports:` line, so its single note became the supporting text.
        supports: 1,
        notes: 0,
        item: undefined,
        subgroupId: undefined,
      },
      {
        id: SARB,
        type: 'web',
        official: true,
        url: 'https://www.resbank.co.za',
        urls: 1,
        supports: 1,
        notes: 1,
        item: undefined,
        subgroupId: undefined,
      },
      {
        id: 'iol',
        type: 'web',
        official: false,
        url: 'https://iol.co.za/mercury/news/fake-notes/',
        urls: 1,
        supports: 0,
        notes: 0,
        item: 0,
        subgroupId: SARB,
      },
    ]);
    expect(file?.entries[1]?.qualifier).toEqual([{ t: 'text', v: '(as above)' }]);
    expect(file?.entries[1]?.noUrlReason).toContain('as above');
    expect(file?.entries[4]?.supports).toEqual([
      { t: 'text', v: 'that counterfeit notes must be reported to SAPS.' },
    ]);
  });

  it('makes bold labels sub-groups, attaches a trailing Supports line and fails when words are lost', () => {
    const { file, issues } = build(
      `${source}\n## Payments\n\n**PayShap limits**\n- TechCentral — https://techcentral.co.za/payshap/ — the system limit.\n- Govchain — [the guide](https://www.govchain.co.za/x) — the R175 total.\n\n**[Official] SABRIC — fraud**\nhttps://www.sabric.co.za\nThe figures are reported by:\n- Zapper — https://www.zapper.com/fraud/\nSupports: fraud reporting.\n`,
    );
    expect(issues.issues.map(formatIssue)).toEqual([
      'lookup/sources:payments.2: sources-text-lost: item 2: words not kept in sources.json: the, guide',
    ]);
    const payments = file?.groups.find((group) => group.id === 'payments');
    expect(payments?.subgroups.map((subgroup) => [subgroup.id, subgroup.entry])).toEqual([
      ['payshap-limits', undefined],
      ['sabric--fraud', 'sabric--fraud'],
    ]);
    expect(file?.entries.some((item) => item.title === 'PayShap limits')).toBe(false);
    const byId = new Map(file?.entries.map((item) => [item.id, item]));
    expect(byId.get('techcentral')?.subgroupId).toBe('payshap-limits');
    expect(runsToText(byId.get('techcentral')?.supports ?? [])).toBe('the system limit.');
    expect(runsToText(byId.get('sabric--fraud')?.supports ?? [])).toBe('fraud reporting.');
    expect(byId.get('zapper')?.supports).toBeUndefined();
  });

  it('requires a reason for a source without a link, and translations reuse it', () => {
    const noReasons = {
      ...entry,
      special: {
        ...entry.special,
        citationsWithoutUrl: { 'not-a-source': 'A reason long enough.' },
      },
    };
    expect(codes(build(source, { entry: noReasons }).issues)).toEqual([
      'source-without-url',
      'unknown-override',
    ]);
    const english = build(source).file;
    const translated = build(source, { lang: 'af', source: english });
    expect(codes(translated.issues)).toEqual([]);
    expect(translated.file?.entries[1]?.noUrlReason).toBe(english?.entries[1]?.noUrlReason);
    expect(codes(build(source, { lang: 'af' }).issues)).toEqual(['source-without-url']);
  });

  it('reports a missing check date, a missing acts table and a folder as an act location', () => {
    const broken = source
      .replace('All sources were checked on 13 September 2026.', 'Checked recently.')
      .replace(
        /^\| Income Tax Act 58 of 1962 .*$/m,
        '| Income Tax Act 58 of 1962 | Income tax | `01-core/` |',
      );
    expect(broken).toContain('| Income Tax Act 58 of 1962 | Income tax | `01-core/` |');
    expect(broken).not.toContain('All sources were checked on');
    const { file, issues } = build(broken);
    expect(file).toBeUndefined();
    expect(codes(issues)).toEqual(['sources-checked-on', 'act-appears-in', 'act-row']);
    expect(codes(build(broken, { entry: { ...entry, special: {} } }).issues)).toContain(
      'sources-acts',
    );
    expect(codes(build(`${source}\n## Odd\n\n> A quote.\n`).issues)).toEqual(['sources-block']);
  });

  it('strips a prefix only at the start and splits at spaced em dashes', () => {
    expect(stripPrefix([{ t: 'text', v: 'Supports: x' }], 'Supports:')).toEqual([
      { t: 'text', v: 'x' },
    ]);
    expect(stripPrefix([{ t: 'strong', c: [] }], 'Supports:')).toBeUndefined();
    expect(
      splitAtDashes([
        { t: 'text', v: 'A — ' },
        { t: 'em', c: [{ t: 'text', v: 'B' }] },
        { t: 'text', v: ' — C—D' },
      ]),
    ).toEqual([
      [{ t: 'text', v: 'A' }],
      [{ t: 'em', c: [{ t: 'text', v: 'B' }] }],
      [{ t: 'text', v: 'C—D' }],
    ]);
  });

  it('parses the real register into complete entries, citations and sub-groups', () => {
    const real = realEntry('lookup/sources');
    const { parsed, issues } = parseMd(readCorpus(real), real);
    const file = buildSourcesFile({
      lang: 'en',
      entry: real,
      blocks: parsed.blocks,
      markers: enMarkers(),
      businessTypeDocs,
      issues,
    });
    expect(codes(issues)).toEqual([]);
    expect(file?.acts).toHaveLength(14);
    // The English source is being corrected ("Business Act" → "Businesses Act"), so match both spellings.
    expect(file?.acts.find((act) => act.id === 'businesses-act-71-of-1991')?.appearsIn).toEqual([
      'core/what-you-need-to-sell-things',
      'business-types/food',
      'business-types/beauty',
    ]);
    expect(
      file?.acts.find((act) => act.id === 'consumer-protection-act-68-of-2008')?.appearsIn,
    ).toHaveLength(7);
    expect(file?.entries).toHaveLength(105);
    const citations = file?.entries.filter((item) => item.type === 'citation') ?? [];
    expect(citations.map((item) => item.id.slice(0, 20))).toEqual([
      'sars--budget-2026-fa',
      'businesses-act-71-of',
      'elliot-a-j-and-maier',
      'labrecque-l-i-and-mi',
    ]);
    expect(
      file?.entries.every((item) =>
        item.type === 'web' ? item.url?.startsWith('https://') : item.noUrlReason !== undefined,
      ),
    ).toBe(true);
    expect(file?.groups.flatMap((group) => group.subgroups.map((subgroup) => subgroup.id))).toEqual(
      [
        SARB,
        'payshap-limits',
        'fake-proof-of-payment-and-marketplace-scams',
        'meeting-buyers-and-test-drives',
        'home-based-business-zoning',
        'colour-psychology',
        'signage-vinyl-and-south-african-uv',
      ],
    );
    const byId = new Map(file?.entries.map((item) => [item.id, item]));
    expect(runsToText(byId.get(SARB)?.supports ?? [])).toBe(
      'that counterfeit notes cannot be exchanged and must be reported to SAPS; that the SARB alone may issue currency under section 14 of the SARB Act.',
    );
    expect(byId.get('the-citizen-local-titles')?.supports).toBeUndefined();
    expect(
      byId.get(
        'elliot-a-j-and-maier-m-a-color-psychology-effects-of-perceiving-color-on-psychological-functioning-in',
      )?.title,
    ).toBe(
      'Elliot, A. J. and Maier, M. A., "Color Psychology: Effects of Perceiving Color on Psychological Functioning in Humans", Annual Review of Psychology (2014)',
    );
    expect(runsToText(byId.get('cipc-trade-mark-search')?.supports ?? [])).toBe(
      'via the CIPC eServices portal at www.cipc.co.za. The toolkit tells readers to search this themselves before committing to a name.',
    );
    expect(file?.entries.some((item) => item.title === 'PayShap limits')).toBe(false);
  });
});

describe('quick answers', () => {
  it('turns the Path 3 table into questions with resolved targets', () => {
    const entry = realEntry('start/how-to-use');
    const { parsed, issues } = parseMd(readCorpus(entry), entry);
    const file = buildQuickAnswers(
      'en',
      entry.id,
      parsed.blocks,
      'path-3-i-need-one-specific-answer',
      issues,
    );
    expect(codes(issues)).toEqual([]);
    expect(file?.items).toHaveLength(36);
    expect(
      file?.items.find((item) => item.id === 'which-licences-does-a-new-activity-need')?.targets,
    ).toEqual([
      { t: 'docref', doc: 'core/adding-new-lines', label: '01-core/08' },
      { t: 'docref', section: 'business-types', label: '04-business-types/' },
    ]);
    expect(
      file?.items.find((item) => item.id === 'can-i-use-the-small-claims-court')?.note,
    ).toEqual([{ t: 'text', v: '(only if you are not a company)' }]);
    expect(
      file?.items.find((item) => item.id === 'what-does-this-abbreviation-mean')?.targets,
    ).toEqual([{ t: 'docref', doc: 'lookup/glossary', label: 'Glossary' }]);
  });

  it('reports a missing heading, a missing table and a row without a target', () => {
    const issues = new IssueCollector();
    const blocks: Block[] = [
      { id: 'q', hash: '0000000000000000', kind: 'heading', depth: 2, text: 'Q', c: [] },
      { id: 'q.1', hash: '0000000000000000', kind: 'paragraph', c: [{ t: 'text', v: 'x' }] },
      { id: 'next', hash: '0000000000000000', kind: 'heading', depth: 2, text: 'Next', c: [] },
      {
        id: 'next.1',
        hash: '0000000000000000',
        kind: 'table',
        header: [[], []],
        rows: [[[{ t: 'text', v: 'Question?' }], [{ t: 'text', v: 'nowhere' }]]],
        align: [null, null],
      },
    ];
    expect(buildQuickAnswers('en', 'start/how-to-use', blocks, 'missing', issues)).toBeUndefined();
    expect(buildQuickAnswers('en', 'start/how-to-use', blocks, 'q', issues)).toBeUndefined();
    expect(buildQuickAnswers('en', 'start/how-to-use', blocks, 'next', issues)?.items).toEqual([]);
    expect(codes(issues)).toEqual(['quick-answers', 'quick-answers', 'quick-answers']);
  });
});

describe('task ids', () => {
  it('are stable under reordering and suffixed on collision', () => {
    const first = new TaskIdAllocator();
    const a = first.allocate('lookup/checklist', 'Opened a separate bank account');
    const b = first.allocate('lookup/checklist', 'Registered as a provisional taxpayer');
    const reordered = new TaskIdAllocator();
    expect(reordered.allocate('lookup/checklist', 'Registered as a provisional taxpayer')).toBe(b);
    expect(reordered.allocate('lookup/checklist', 'opened a  separate bank account.')).toBe(a);
    expect(reordered.allocate('lookup/checklist', 'Opened a separate bank account')).toBe(`${a}-2`);
    expect(a).toMatch(/^lookup\/checklist:[0-9a-f]{8}$/);
    expect(normaliseTaskText('  Two  IRP6 returns filed. ')).toBe('two irp6 returns filed');
  });

  it('report two tasks with the same text in one document', () => {
    const entry = realEntry('core/running-a-pty-ltd');
    const { parsed } = parseMd(
      '# T\n\n## Your Pty Ltd annual checklist\n\n- [ ] Filed the annual return\n- [ ] Paid the fee\n- [ ] filed the  annual return.\n',
      entry,
    );
    const issues = new IssueCollector();
    assignTaskIds(parsed.blocks, entry.id, issues);
    expect(issues.issues.map(formatIssue)).toEqual([
      'core/running-a-pty-ltd:your-pty-ltd-annual-checklist.1: duplicate-task: the task "filed the  annual return." repeats a task in your-pty-ltd-annual-checklist.1. Task ids come from the text, so reword one of them.',
    ]);
  });

  it('are assigned per doc and flattened into the registry with heading, group and when', () => {
    const entry = realEntry('core/running-a-pty-ltd');
    const { parsed } = parseMd(
      '# T\n\n## Your Pty Ltd annual checklist\n\nEvery year:\n\n- [ ] A\n- [ ] B\n',
      entry,
    );
    assignTaskIds(parsed.blocks, entry.id);
    const provenance = {
      sources: { entries: [], acts: [] },
      generated: { date: '2026-09-13', tool: 'Claude (Anthropic)' },
      verification: { status: 'ai-checked' as const, checkedOn: '2026-09-13' },
    };
    const doc = buildDoc(parsed, { status: 'source', sourceLang: 'en' }, provenance);
    const records = collectTaskRecords([doc]);
    expect(records.map((record) => ({ ...record, id: record.id.split(':')[0] }))).toEqual([
      {
        id: 'core/running-a-pty-ltd',
        c: [{ t: 'text', v: 'A' }],
        doc: entry.id,
        block: 'your-pty-ltd-annual-checklist.1',
        heading: 'your-pty-ltd-annual-checklist',
        group: [{ t: 'text', v: 'Every year' }],
        order: 0,
      },
      {
        id: 'core/running-a-pty-ltd',
        c: [{ t: 'text', v: 'B' }],
        doc: entry.id,
        block: 'your-pty-ltd-annual-checklist.1',
        heading: 'your-pty-ltd-annual-checklist',
        group: [{ t: 'text', v: 'Every year' }],
        order: 1,
      },
    ]);
  });
});
