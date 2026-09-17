import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import * as z from 'zod';
import { buildContent } from '../../../scripts/content/build';
import { DocsMetaSchema, ProvenanceSchema, type SourceMap } from '../../../scripts/content/config';
import { ContentError, IssueCollector, formatIssue } from '../../../scripts/content/errors';
import {
  checkProvenanceConfig,
  checkVerificationDates,
  mapDocSources,
  normaliseSourceUrl,
  requiresSources,
  todayInJohannesburg,
  verificationFor,
} from '../../../scripts/content/provenance';
import { formatSourcesTable } from '../../../scripts/content/report';
import { VerificationSchema, isIsoDate, type SourcesFile } from '../../../src/lib/content/schema';
import {
  fixtureConfigPaths,
  fixturesDir,
  parseMd,
  realConfig,
  realEntry,
  removeDir,
  repoRoot,
  tempDir,
} from './helpers';

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) removeDir(dir);
});

const NO_SOURCES =
  'doc-without-sources: no sources: no link to a register entry and no mapping in content-meta/source-map.json (an act\'s "Where it appears" row is not evidence on its own). Map the register entries that support its claims, or give it a note';

describe('normaliseSourceUrl', () => {
  it.each([
    ['https://www.SARS.gov.za/types-of-tax/turnover-tax/', 'sars.gov.za/types-of-tax/turnover-tax'],
    ['http://sars.gov.za/types-of-tax/turnover-tax#top', 'sars.gov.za/types-of-tax/turnover-tax'],
    ['https://www.cipc.co.za/?page_id=11891', 'cipc.co.za?page_id=11891'],
    ['https://inforegulator.org.za/', 'inforegulator.org.za'],
    ['not a url', undefined],
  ])('%s → %s', (href, key) => {
    expect(normaliseSourceUrl(href)).toBe(key);
  });
});

describe('per-document sources', () => {
  const docs = [
    [
      'core/tax-and-sars',
      'See https://www.sars.gov.za/types-of-tax/turnover-tax/ and www.sars.gov.za.',
    ],
    ['core/register', 'Register a company.'],
    ['core/vehicles', 'Vehicles.'],
    ['core/paying-yourself', 'Pay yourself.'],
    ['core/you-are-the-business', 'Nothing sourced here.'],
    ['start/start-here', 'Start here.'],
    ['lookup/glossary', 'Words.'],
  ] as const;
  const parsed = docs.map(
    ([id, body]) =>
      parseMd(
        `# T\n\n${body}\n`,
        realEntry(id, { kind: id === 'lookup/glossary' ? 'glossary' : 'guide' }),
      ).parsed,
  );
  const entry = (id: string, groupId: string, url?: string) => ({
    id,
    group: groupId,
    groupId,
    title: id,
    official: true,
    block: `${groupId}.1`,
    ...(url
      ? { type: 'web' as const, url, urls: [url] }
      : { type: 'citation' as const, urls: [], noUrlReason: 'A reason that is long enough.' }),
  });
  const sources: SourcesFile = {
    lang: 'en',
    doc: 'lookup/sources',
    checkedOn: '2026-09-13',
    acts: [
      { id: 'income-tax-act', name: 'Income Tax Act', governs: [], appearsIn: [] },
      { id: 'companies-act', name: 'Companies Act', governs: [], appearsIn: ['core/register'] },
    ],
    groups: [],
    entries: [
      entry('turnover', 'tax', 'https://www.sars.gov.za/types-of-tax/turnover-tax/'),
      entry('sars-home', 'tax', 'https://www.sars.gov.za/'),
      entry('budget-faq', 'pay', 'https://www.sars.gov.za/budget/faq/'),
      entry('budget-faq-again', 'pay'),
    ],
  };
  const sourceMap: SourceMap = {
    version: 1,
    notes: {
      see: ['lookup/glossary'],
      docs: { 'start/start-here': 'An orientation page with no claims of its own.' },
    },
    groups: [
      {
        group: 'pay',
        docs: ['core/paying-yourself'],
        reason: 'States the official rate of interest.',
      },
    ],
    entries: [
      {
        entry: 'sars-home',
        docs: ['core/vehicles'],
        reason: 'Points readers to the SARS website.',
      },
    ],
    acts: [
      {
        act: 'income-tax-act',
        docs: ['core/tax-and-sars'],
        reason: 'States how the Income Tax Act taxes a sole proprietor.',
      },
      {
        // An act's "Where it appears" row is not evidence on its own, so core/register needs a
        // deliberate mapping to count as sourced.
        act: 'companies-act',
        docs: ['core/register'],
        reason: 'States how the Companies Act governs registering a private company.',
      },
    ],
  };

  it('combines register links, act locations and the hand map, and adds notes', () => {
    const issues = new IssueCollector();
    const result = mapDocSources({ parsed, sources, sourceMap, issues });
    expect(Object.fromEntries(result)).toEqual({
      'core/tax-and-sars': { sources: { entries: ['turnover'], acts: ['income-tax-act'] } },
      'core/register': { sources: { entries: [], acts: ['companies-act'] } },
      'core/vehicles': { sources: { entries: ['sars-home'], acts: [] } },
      'core/paying-yourself': {
        sources: { entries: ['budget-faq', 'budget-faq-again'], acts: [] },
      },
      'core/you-are-the-business': { sources: { entries: [], acts: [] } },
      'start/start-here': {
        sources: { entries: [], acts: [] },
        sourceNote: {
          reason: 'An orientation page with no claims of its own.',
          see: ['lookup/glossary'],
        },
      },
      'lookup/glossary': { sources: { entries: [], acts: [] } },
    });
    expect(issues.issues.map(formatIssue)).toEqual([`core/you-are-the-business: ${NO_SOURCES}`]);
  });

  it('reports every broken mapping', () => {
    const issues = new IssueCollector();
    mapDocSources({
      parsed,
      sources,
      issues,
      sourceMap: {
        ...sourceMap,
        notes: {
          see: ['start/nowhere'],
          docs: { ...sourceMap.notes.docs, 'core/ghost': 'A ghost document here.' },
        },
        groups: [{ group: 'nope', docs: ['core/register'], reason: 'An unknown group.' }],
        entries: [
          {
            entry: 'turnover',
            docs: ['core/you-are-the-business', 'core/ghost'],
            reason: 'Reason one.',
          },
          {
            entry: 'turnover',
            docs: ['core/you-are-the-business', 'start/start-here'],
            reason: 'Reason two.',
          },
          { entry: 'unknown', docs: ['core/register'], reason: 'An unknown entry.' },
        ],
        acts: [{ act: 'no-act', docs: ['core/register'], reason: 'An unknown act here.' }],
      },
    });
    expect(issues.issues.map(formatIssue)).toEqual([
      'content-meta/source-map.json: source-map: group "nope" is not a group of the sources register',
      'content-meta/source-map.json: source-map: entry "turnover" maps to "core/ghost", which is not a document',
      'content-meta/source-map.json: core/you-are-the-business: source-map: turnover → core/you-are-the-business is listed twice',
      'content-meta/source-map.json: start/start-here: source-map: entry "turnover" maps to "start/start-here", which has a source note instead of sources',
      'content-meta/source-map.json: source-map: entry "unknown" is not in the sources register',
      'content-meta/source-map.json: source-map: act "no-act" is not in the legislation table',
      'content-meta/source-map.json: source-map: note refers to "core/ghost", which is not a document',
      'content-meta/source-map.json: source-map: note refers to "start/nowhere", which is not a document',
      // The acts list is replaced above, so core/register loses its deliberate mapping.
      `core/register: ${NO_SOURCES}`,
      `core/vehicles: ${NO_SOURCES}`,
      `core/paying-yourself: ${NO_SOURCES}`,
    ]);
  });

  it('allows a note on a document that must list sources only with a recorded exemption', () => {
    const withNote: SourceMap = {
      ...sourceMap,
      notes: {
        ...sourceMap.notes,
        docs: { ...sourceMap.notes.docs, 'core/you-are-the-business': 'Prompts only, no claims.' },
      },
    };
    const refused = new IssueCollector();
    mapDocSources({ parsed, sources, sourceMap: withNote, issues: refused });
    expect(refused.issues.map(formatIssue)).toEqual([
      'core/you-are-the-business: source-note-not-allowed: a guide in core must list sources; a note needs a decision recorded in content-meta/provenance.json sourceNoteExemptions',
    ]);
    const allowed = new IssueCollector();
    const result = mapDocSources({
      parsed,
      sources,
      sourceMap: withNote,
      issues: allowed,
      exemptions: { 'core/you-are-the-business': 'Owner decision recorded for this test.' },
    });
    expect(allowed.issues).toEqual([]);
    expect(result.get('core/you-are-the-business')?.sourceNote?.reason).toBe(
      'Prompts only, no claims.',
    );
  });

  /**
   * ADR-0006 decision 3: a note says the page makes no claim the register supports. When the register
   * itself has evidence for the page, that is untrue, and no exemption may excuse it.
   */
  describe('a note is refused for a page the register has evidence for', () => {
    const withNote = (docId: string, note: string): SourceMap => ({
      ...sourceMap,
      notes: { ...sourceMap.notes, docs: { ...sourceMap.notes.docs, [docId]: note } },
      // Drop the mappings for that document, which would otherwise be refused first.
      groups: sourceMap.groups.filter((rule) => !rule.docs.includes(docId)),
      entries: sourceMap.entries.filter((rule) => !rule.docs.includes(docId)),
      acts: sourceMap.acts.filter((rule) => !rule.docs.includes(docId)),
    });
    const run = (docId: string, exempt: boolean) => {
      const issues = new IssueCollector();
      mapDocSources({
        parsed,
        sources,
        sourceMap: withNote(docId, 'This page makes no factual claims from the register.'),
        issues,
        ...(exempt
          ? { exemptions: { [docId]: 'An exemption that may not excuse evidence.' } }
          : {}),
      });
      return issues.issues.filter((issue) => issue.code === 'source-note-with-evidence');
    };

    // The reviewer's case: a tax guide the legislation table lists, given a note and an exemption.
    it.each([true, false])(
      'an act lists the page under "Where it appears" (exempt: %s)',
      (exempt) => {
        const [issue] = run('core/register', exempt);
        expect(issue?.doc).toBe('core/register');
        expect(issue?.message).toContain('act "companies-act"');
        expect(issue?.message).toContain('must list its sources');
      },
    );

    it.each([true, false])('the page links to a register entry (exempt: %s)', (exempt) => {
      const [issue] = run('core/tax-and-sars', exempt);
      expect(issue?.doc).toBe('core/tax-and-sars');
      expect(issue?.message).toContain('register entry "turnover"');
    });

    it('leaves a page the register has no evidence for alone', () => {
      expect(run('core/you-are-the-business', false)).toEqual([]);
    });

    /**
     * The exception belongs to the register document, not to whatever declares `kind: "sources"`.
     * Without that, one word in `docs.meta.json` buys a page a note, an escape from
     * `doc-without-sources` and an escape from this guard, with no diagnostic at all.
     */
    it('does not let a page escape by declaring itself the register', () => {
      const impostor = parsed.map((doc) =>
        doc.entry.id === 'core/tax-and-sars'
          ? { ...doc, entry: { ...doc.entry, kind: 'sources' as const } }
          : doc,
      );
      const noted = withNote('core/tax-and-sars', 'This page makes no factual claims at all.');
      const issues = new IssueCollector();
      mapDocSources({
        parsed: impostor,
        sources,
        sourceMap: noted,
        issues,
        registerDocId: 'lookup/sources',
        exemptions: { 'core/tax-and-sars': 'An exemption that may not excuse evidence.' },
      });
      const [issue] = issues.issues.filter((i) => i.code === 'source-note-with-evidence');
      expect(issue?.doc).toBe('core/tax-and-sars');
      expect(issue?.message).toContain('register entry "turnover"');

      // The document that really is the register keeps its note, because every link on it is an entry.
      const asRegister = new IssueCollector();
      mapDocSources({
        parsed: impostor,
        sources,
        sourceMap: noted,
        issues: asRegister,
        registerDocId: 'core/tax-and-sars',
      });
      expect(asRegister.issues.filter((i) => i.code === 'source-note-with-evidence')).toEqual([]);
    });

    /**
     * The three limits of link-and-"Where it appears" evidence, pinned so that a clean build is never
     * read as proof that no noted page makes a claim. Judging that is the accuracy review's job.
     */
    it('cannot see an unlinked claim, a query-string variant or a front-page link', () => {
      const run = (body: string): string[] => {
        const docs = parsed.map((doc) =>
          doc.entry.id === 'core/you-are-the-business'
            ? parseMd(`# T\n\n${body}\n`, doc.entry).parsed
            : doc,
        );
        const issues = new IssueCollector();
        mapDocSources({
          parsed: docs,
          sources,
          sourceMap: withNote(
            'core/you-are-the-business',
            'This page makes no factual claims from the register.',
          ),
          issues,
          registerDocId: 'lookup/sources',
          exemptions: { 'core/you-are-the-business': 'Recorded for this test only.' },
        });
        return issues.issues.map(formatIssue);
      };
      // A claim resting on a register entry the page never links is invisible.
      expect(run('The Income Tax Act taxes a sole proprietor at the personal rates.')).toEqual([]);
      // A tracking query makes a different key, because the query can change what a page shows.
      expect(
        run('See https://www.sars.gov.za/types-of-tax/turnover-tax/?utm_source=x here.'),
      ).toEqual([]);
      // A link to an entry whose URL is a site front page names the site, not a supporting page.
      expect(run('See https://www.sars.gov.za/ here.')).toEqual([]);
      // The entry's own URL is still caught, so these are limits of the evidence, not a broken check.
      expect(run('See https://www.sars.gov.za/types-of-tax/turnover-tax/ here.')).toHaveLength(1);
    });

    /** And a second one can never exist: `docs.meta.json` is refused, naming both documents. */
    it('refuses a second document that declares kind "sources"', () => {
      const meta = realConfig().docsMeta;
      expect(meta.docs.filter((doc) => doc.kind === 'sources').map((doc) => doc.id)).toEqual([
        'lookup/sources',
      ]);
      const result = DocsMetaSchema.safeParse({
        ...meta,
        docs: meta.docs.map((doc) =>
          doc.id === 'core/tax-and-sars' ? { ...doc, kind: 'sources' } : doc,
        ),
      });
      expect(result.success).toBe(false);
      const message = result.success ? '(accepted)' : z.prettifyError(result.error);
      expect(message).toMatch(/only one document is the sources register/);
      expect(message).toContain('core/tax-and-sars');
      expect(message).toContain('lookup/sources');
    });
  });

  it('knows which documents must list sources', () => {
    expect(requiresSources({ kind: 'guide', section: 'core' })).toBe(true);
    expect(requiresSources({ kind: 'template', section: 'paperwork' })).toBe(true);
    expect(requiresSources({ kind: 'checklist', section: 'lookup' })).toBe(true);
    expect(requiresSources({ kind: 'glossary', section: 'lookup' })).toBe(false);
    expect(requiresSources({ kind: 'sources', section: 'lookup' })).toBe(false);
    expect(requiresSources({ kind: 'guide', section: 'start' })).toBe(false);
  });
});

describe('verification', () => {
  const config = {
    ...realConfig(),
    provenance: {
      version: 1 as const,
      generated: { date: '2026-09-13', tool: 'Claude, Anthropic' },
      sourceNoteExemptions: {
        'core/register': 'Not a document with a source note in the real map.',
      },
      verification: {
        'core/register': {
          status: 'human-verified' as const,
          checkedOn: '2026-10-01',
          reviewedBy: 'A. Reviewer',
        },
        'core/ghost': {
          status: 'ai-checked' as const,
          checkedOn: '2026-09-13',
          reason: 'A pinned date for a document that does not exist.',
        },
      },
    },
  };

  it('defaults to ai-checked on the register date and applies reviews', () => {
    expect(verificationFor('core/register', config, '2026-09-13')).toEqual({
      status: 'human-verified',
      checkedOn: '2026-10-01',
      reviewedBy: 'A. Reviewer',
    });
    expect(verificationFor('core/vehicles', config, '2026-09-13')).toEqual({
      status: 'ai-checked',
      checkedOn: '2026-09-13',
    });
    expect(verificationFor('core/vehicles', config, undefined).checkedOn).toBe('2026-09-13');
    const issues = new IssueCollector();
    checkProvenanceConfig(config, new Set(['core/register']), issues, '2026-12-31');
    expect(issues.issues.map(formatIssue)).toEqual([
      'content-meta/provenance.json: unknown-override: provenance.json verification lists "core/ghost", which is not a document',
      'content-meta/provenance.json: unknown-override: provenance.json sourceNoteExemptions lists "core/register", which is not a document with a source note',
    ]);
  });

  it('judges "future" by the Johannesburg date, not the UTC date', () => {
    // 23:30 UTC on 16 September is 01:30 on 17 September in Johannesburg (UTC+2).
    const lateNight = new Date('2026-09-16T23:30:00Z');
    expect(todayInJohannesburg(lateNight)).toBe('2026-09-17');
    expect(lateNight.toISOString().slice(0, 10)).toBe('2026-09-16');
    const reviewed = (checkedOn: string) => ({
      ...config,
      provenance: {
        ...config.provenance,
        sourceNoteExemptions: {},
        verification: {
          'core/register': {
            status: 'human-verified' as const,
            checkedOn,
            reviewedBy: 'A. Reviewer',
          },
        },
      },
    });
    const sameDay = reviewed('2026-09-17');
    const issues = new IssueCollector();
    checkProvenanceConfig(
      sameDay,
      new Set(['core/register']),
      issues,
      todayInJohannesburg(lateNight),
    );
    expect(issues.issues).toEqual([]);
    // The UTC date would have refused that review as being in the future.
    const utc = new IssueCollector();
    checkProvenanceConfig(sameDay, new Set(['core/register']), utc, '2026-09-16');
    expect(utc.issues.map((issue) => issue.code)).toEqual(['verification-date']);
    // The default `today` is the Johannesburg date, so a review recorded today is accepted.
    const today = new IssueCollector();
    checkProvenanceConfig(reviewed(todayInJohannesburg()), new Set(['core/register']), today);
    expect(today.issues).toEqual([]);
  });

  it('flags an exemption for a page that may carry a note without one', () => {
    const notNeeded = {
      ...config,
      sourceMap: {
        ...config.sourceMap,
        notes: {
          ...config.sourceMap.notes,
          docs: { ...config.sourceMap.notes.docs, 'start/how-to-use': 'No claims of its own.' },
        },
      },
      provenance: {
        ...config.provenance,
        sourceNoteExemptions: { 'start/how-to-use': 'An exemption that is not needed.' },
        verification: {},
      },
    };
    const issues = new IssueCollector();
    checkProvenanceConfig(notNeeded, new Set(['start/how-to-use']), issues, '2026-09-17');
    expect(issues.issues.map(formatIssue)).toEqual([
      'content-meta/provenance.json: start/how-to-use: unknown-override: provenance.json sourceNoteExemptions lists "start/how-to-use", which does not need one: a guide in start may carry a source note without an exemption',
    ]);
  });

  it('never lets a page say it was checked before it was written', () => {
    const doc = (checkedOn: string, date: string) => ({
      id: 'core/you-are-the-business',
      lang: 'en' as const,
      generated: { date, tool: 'Claude, Anthropic' },
      verification: { status: 'ai-checked' as const, checkedOn },
    });
    const issues = new IssueCollector();
    checkVerificationDates(
      [doc('2026-09-13', '2026-09-14'), doc('2026-09-14', '2026-09-14')],
      issues,
    );
    expect(issues.issues.map(formatIssue)).toEqual([
      'core/you-are-the-business: verification-date: en: checked on 2026-09-13, before it was generated on 2026-09-14. A page cannot be checked before it is written: record the date its facts were really checked, and the evidence for that date, in content-meta/provenance.json verification',
    ]);
  });

  it('refuses a review dated after the day of the build', () => {
    const issues = new IssueCollector();
    checkProvenanceConfig(config, new Set(['core/register']), issues, '2026-09-16');
    expect(issues.issues.map(formatIssue)).toContain(
      'content-meta/provenance.json: core/register: verification-date: provenance.json verification "core/register": checkedOn 2026-10-01 is in the future (today is 2026-09-16); a review cannot be recorded before it happens',
    );
  });

  /**
   * ADR-0006 decision 5: a page may never credit a review that did not happen. Each of these was
   * accepted before, and each would have put a named reviewer or an impossible date on a page.
   */
  describe('a recorded review needs a real name and a real date', () => {
    const provenance = (verification: unknown) => ({
      version: 1,
      generated: { date: '2026-09-13', tool: 'Claude, Anthropic' },
      sourceNoteExemptions: {},
      verification,
    });
    const message = (verification: unknown): string => {
      const result = ProvenanceSchema.safeParse(provenance(verification));
      return result.success ? '(accepted)' : z.prettifyError(result.error);
    };

    it('rejects human-verified without a check date', () => {
      expect(
        message({ 'core/tax-and-sars': { status: 'human-verified', reviewedBy: 'Jane Expert' } }),
      ).toMatch(/checkedOn/);
    });

    it('rejects a blank, whitespace-only, invisible or punctuation-only reviewer', () => {
      // A zero-width space survives trim, and "-" is not a name: both would show an empty "Checked by".
      for (const name of ['', ' ', '\t ', ' ', '​', '-', '—', '.', '???', '123']) {
        expect(
          message({
            'core/tax-and-sars': {
              status: 'human-verified',
              checkedOn: '2026-09-13',
              reviewedBy: name,
            },
          }),
          name,
        ).toMatch(/reviewedBy names the person who checked the document/);
      }
    });

    it('rejects a reviewer on an ai-checked document', () => {
      expect(
        message({
          'core/tax-and-sars': {
            status: 'ai-checked',
            checkedOn: '2026-09-13',
            reviewedBy: 'Some Person',
          },
        }),
      ).toMatch(/reviewedBy/);
    });

    it.each(['2026-13-45', '2026-02-30', '2025-02-29', '2026-00-10', '13 September 2026'])(
      'rejects %s, which is not a real calendar date',
      (date) => {
        expect(message({ 'core/tax-and-sars': { status: 'ai-checked', checkedOn: date } })).toMatch(
          /ISO date|calendar date/,
        );
        expect(isIsoDate(date)).toBe(false);
      },
    );

    it('accepts a complete review and a real leap day', () => {
      expect(
        message({
          'core/tax-and-sars': {
            status: 'human-verified',
            checkedOn: '2024-02-29',
            reviewedBy: 'Jane Expert CA(SA)',
          },
        }),
      ).toBe('(accepted)');
      expect(isIsoDate('2024-02-29')).toBe(true);
    });

    it('never lets a built document carry a reviewer without the review', () => {
      const doc = {
        status: 'human-verified' as const,
        checkedOn: '2026-09-13',
        reviewedBy: '   ',
      };
      expect(VerificationSchema.safeParse(doc).success).toBe(false);
      expect(
        VerificationSchema.safeParse({
          status: 'ai-checked',
          checkedOn: '2026-09-13',
          reviewedBy: 'Someone',
        }).success,
      ).toBe(false);
      expect(
        VerificationSchema.safeParse({ status: 'ai-checked', checkedOn: '2026-09-13' }).success,
      ).toBe(true);
    });
  });
});

describe('sources, AI notice and verification in the built documents', () => {
  const outDir = tempDir('provenance-out');
  dirs.push(outDir);
  const result = buildContent({
    repoRoot,
    configPaths: fixtureConfigPaths(),
    sourceRoots: { en: join(fixturesDir, 'en'), af: join(fixturesDir, 'af') },
    outDir,
    strictTaxonomy: false,
  });
  const en = new Map(result.langs[0]?.docs.map((doc) => [doc.id, doc]));
  const af = new Map(result.langs[1]?.docs.map((doc) => [doc.id, doc]));

  it('lists sources, keeps the generated notice and marks every document ai-checked', () => {
    expect(en.get('core/tax-fixture')?.sources).toEqual({
      entries: ['sars--turnover-tax'],
      acts: ['income-tax-act-58-of-1962', 'consumer-protection-act-68-of-2008'],
    });
    expect(en.get('lookup/sources')?.sourceNote).toEqual({
      reason: 'This is the register itself: every source is listed on this page.',
      see: [],
    });
    expect(en.get('core/tax-fixture')?.generated).toEqual({
      date: '2026-09-13',
      tool: 'Claude, Anthropic',
    });
    // Documents without a footer take the project default, which matches the corpus footers.
    expect(en.get('paperwork/templates/quotation-fixture')?.generated).toEqual({
      date: '2026-09-13',
      tool: 'Claude, Anthropic',
    });
    for (const doc of en.values())
      expect(doc.verification, doc.id).toEqual({ status: 'ai-checked', checkedOn: '2026-09-13' });
    expect(af.get('core/tax-fixture')?.sources).toEqual(en.get('core/tax-fixture')?.sources);
    expect(af.get('paperwork/templates/quotation-fixture')?.generated.tool).toBe(
      'Claude, Anthropic',
    );
    const table = formatSourcesTable(result);
    expect(table).toMatch(/\| core\/tax-fixture +\| 1 +\| 1 +\| 2 +\| +\|/);
    expect(table).toMatch(/\| lookup\/sources +\| 0 +\| 0 +\| 0 +\| note → +\|/);
  });

  it('fails the build on a broken source map', () => {
    // Start from the valid fixture map and add one broken entry, so the only thing wrong is the
    // broken entry itself rather than every document losing its mapping at once.
    const valid = JSON.parse(readFileSync(fixtureConfigPaths().sourceMap, 'utf8')) as SourceMap;
    const broken = join(outDir, 'source-map.json');
    writeFileSync(
      broken,
      JSON.stringify({
        ...valid,
        entries: [
          ...valid.entries,
          { entry: 'not-in-register', docs: ['core/tax-fixture'], reason: 'No such entry.' },
        ],
      }),
    );
    let error: unknown;
    try {
      buildContent({
        repoRoot,
        configPaths: { ...fixtureConfigPaths(), sourceMap: broken },
        sourceRoots: { en: join(fixturesDir, 'en'), af: join(fixturesDir, 'af') },
        outDir,
        strictTaxonomy: false,
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ContentError);
    expect((error as ContentError).issues.map((issue) => issue.code)).toEqual(['source-map']);
  });
});
