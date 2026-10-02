import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildContent } from '../../scripts/content/build';
import { ProvenanceSchema } from '../../scripts/content/config';
import { docFileName } from '../../scripts/content/ids';
import { blockRunLists, runsToText, walkRuns } from '../../scripts/content/text';
import { diffOutputs } from '../../scripts/content/write';
import {
  BusinessTypesFileSchema,
  DocSchema,
  GlossaryFileSchema,
  ManifestSchema,
  QuickAnswersFileSchema,
  SECTION_IDS,
  SourcesFileSchema,
  TasksFileSchema,
  type Doc,
  type InlineRun,
} from '../../src/lib/content/schema';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataDir = join(repoRoot, 'src', 'data');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const manifest = ManifestSchema.parse(readJson(join(dataDir, 'manifest.json')));
const langs = Object.keys(manifest.langs) as (keyof typeof manifest.langs)[];
const docsByLang = new Map(
  langs.map((lang) => {
    const dir = join(dataDir, lang, 'docs');
    const docs = readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => DocSchema.parse(readJson(join(dir, name))));
    return [lang, docs] as const;
  }),
);
const enDocs = docsByLang.get('en') ?? [];
const enById = new Map(enDocs.map((doc) => [doc.id, doc]));
const meta = JSON.parse(readFileSync(join(repoRoot, 'content-meta', 'docs.meta.json'), 'utf8')) as {
  docs: { id: string; source: string }[];
};

function allRuns(doc: Doc): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const block of doc.blocks)
    for (const list of blockRunLists(block)) walkRuns(list, (run) => runs.push(run));
  return runs;
}

/** Sentences of visible text. Inline code is excluded (it quotes, it does not state). */
function sentences(doc: Doc): string[] {
  const out: string[] = [];
  const strip = (runs: readonly InlineRun[]): InlineRun[] =>
    runs.flatMap((run): InlineRun[] => {
      if (run.t === 'code') return [];
      if (run.t === 'strong' || run.t === 'em' || run.t === 'link')
        return [{ ...run, c: strip(run.c) }];
      return [run];
    });
  for (const block of doc.blocks) {
    const texts =
      block.kind === 'code'
        ? [block.text]
        : blockRunLists(block).map((runs) => runsToText(strip(runs)));
    for (const text of texts)
      out.push(...text.split(/(?<=[.!?])\s+|\n/).filter((sentence) => sentence.trim() !== ''));
  }
  return out;
}

describe('committed content data', () => {
  it('matches a fresh build of the markdown', () => {
    const result = buildContent({ repoRoot });
    expect(diffOutputs(result.outDir, result.files, result.managedPrefixes)).toEqual({
      changed: [],
      missing: [],
      extra: [],
    });
  }, 300_000);

  it('has all 36 English documents, each in the manifest, and every file matches its schema', () => {
    expect(enDocs).toHaveLength(36);
    expect(Object.keys(manifest.docs).sort()).toEqual(enDocs.map((doc) => doc.id).sort());
    expect(meta.docs.map((doc) => doc.id).sort()).toEqual(enDocs.map((doc) => doc.id).sort());
    for (const lang of langs) {
      if (existsSync(join(dataDir, lang, 'glossary.json')))
        GlossaryFileSchema.parse(readJson(join(dataDir, lang, 'glossary.json')));
      if (existsSync(join(dataDir, lang, 'sources.json')))
        SourcesFileSchema.parse(readJson(join(dataDir, lang, 'sources.json')));
      if (existsSync(join(dataDir, lang, 'quick-answers.json')))
        QuickAnswersFileSchema.parse(readJson(join(dataDir, lang, 'quick-answers.json')));
      TasksFileSchema.parse(readJson(join(dataDir, lang, 'tasks.json')));
      expect(manifest.langs[lang]?.docCount).toBe(docsByLang.get(lang)?.length);
      for (const doc of docsByLang.get(lang) ?? []) {
        expect(existsSync(join(dataDir, lang, 'docs', docFileName(doc.id)))).toBe(true);
        expect(doc.lang).toBe(lang);
      }
    }
    BusinessTypesFileSchema.parse(readJson(join(repoRoot, 'content-meta', 'business-types.json')));
  });

  it('resolves every link, docref and anchor', () => {
    const problems: string[] = [];
    for (const [lang, docs] of docsByLang) {
      const headings = new Map(
        docs.map((doc) => [doc.id, new Set(doc.headings.map((heading) => heading.id))]),
      );
      for (const doc of docs) {
        for (const run of allRuns(doc)) {
          if (run.t === 'link' && 'doc' in run) {
            if (!enById.has(run.doc))
              problems.push(`${lang}:${doc.id}: link to missing doc ${run.doc}`);
            else if (
              run.anchor &&
              !(
                headings.get(run.doc) ?? new Set(enById.get(run.doc)?.headings.map((h) => h.id))
              ).has(run.anchor)
            ) {
              problems.push(`${lang}:${doc.id}: link to missing anchor ${run.doc}#${run.anchor}`);
            }
          }
          if (run.t === 'link' && 'href' in run && !/^https?:\/\//.test(run.href))
            problems.push(`${lang}:${doc.id}: bad href ${run.href}`);
          if (run.t === 'docref' && 'doc' in run && !enById.has(run.doc))
            problems.push(`${lang}:${doc.id}: docref to missing doc ${run.doc}`);
          if (run.t === 'docref' && 'section' in run && !SECTION_IDS.includes(run.section))
            problems.push(`${lang}:${doc.id}: docref to missing section`);
        }
        for (const block of doc.blocks) {
          if (block.kind === 'heading' && block.ref && !enById.has(block.ref))
            problems.push(`${lang}:${doc.id}: pseudo-heading ref ${block.ref}`);
          if (
            block.kind === 'callout' &&
            block.pairsWith &&
            !doc.blocks.some((candidate) => candidate.id === block.pairsWith)
          ) {
            problems.push(`${lang}:${doc.id}: callout pairs with missing ${block.pairsWith}`);
          }
        }
        for (const related of doc.related)
          if (!enById.has(related)) problems.push(`${lang}:${doc.id}: related ${related}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('resolves every #anchor in docs/rsa-business-toolkit/INDEX.md to a heading in the right document', () => {
    const index = readFileSync(join(repoRoot, 'docs', 'rsa-business-toolkit', 'INDEX.md'), 'utf8');
    const bySource = new Map(meta.docs.map((doc) => [doc.source, doc.id]));
    const anchors = [...index.matchAll(/\]\(([^)#]+\.md)#([^)]+)\)/g)];
    expect(anchors.length).toBeGreaterThan(250);
    const problems = anchors.flatMap((match) => {
      const docId = bySource.get(decodeURIComponent(match[1] ?? ''));
      const anchor = match[2] ?? '';
      if (!docId) return [`no doc for ${match[1]}`];
      return enById.get(docId)?.headings.some((heading) => heading.id === anchor)
        ? []
        : [`${docId}#${anchor}`];
    });
    expect(problems).toEqual([]);
  });

  it('has unique task ids that match the task lists in the documents, in manifest order', () => {
    for (const [lang, docs] of docsByLang) {
      const tasks = TasksFileSchema.parse(readJson(join(dataDir, lang, 'tasks.json'))).tasks;
      expect(new Set(tasks.map((task) => task.id)).size).toBe(tasks.length);
      expect(tasks.every((task) => !/-\d+$/.test(task.id))).toBe(true);
      const byId = new Map(docs.map((doc) => [doc.id, doc]));
      const ordered = meta.docs.flatMap((entry) => byId.get(entry.id) ?? []);
      const fromDocs = ordered.flatMap((doc) =>
        doc.blocks.flatMap((block) =>
          block.kind === 'tasklist' ? block.items.map((item) => item.id) : [],
        ),
      );
      expect(tasks.map((task) => task.id)).toEqual(fromDocs);
    }
  });

  it('has 121 glossary entries in 7 groups with unique ids', () => {
    const glossary = GlossaryFileSchema.parse(readJson(join(dataDir, 'en', 'glossary.json')));
    expect(glossary.entries).toHaveLength(121);
    expect(glossary.groups).toHaveLength(7);
    expect(new Set(glossary.entries.map((entry) => entry.id)).size).toBe(121);
  });

  it('has sources with existing appearsIn documents, https links, reasons for citations and full titles', () => {
    const sources = SourcesFileSchema.parse(readJson(join(dataDir, 'en', 'sources.json')));
    expect(sources.checkedOn).toBe('2026-09-13');
    for (const act of sources.acts)
      for (const doc of act.appearsIn) expect(enById.has(doc), `${act.id} → ${doc}`).toBe(true);
    const urls = sources.entries.flatMap((entry) => [
      ...entry.urls,
      ...(entry.url ? [entry.url] : []),
    ]);
    expect(urls.length).toBeGreaterThan(100);
    expect(urls.filter((url) => !url.startsWith('https://'))).toEqual([]);
    expect(new Set(sources.entries.map((entry) => entry.id)).size).toBe(sources.entries.length);
    for (const entry of sources.entries) {
      if (entry.type === 'web') expect(entry.url, entry.id).toMatch(/^https:\/\//);
      else expect(entry.noUrlReason, entry.id).toBeTruthy();
      expect(entry.title.endsWith('…'), entry.id).toBe(false);
    }
    const subgroups = new Set(sources.groups.flatMap((group) => group.subgroups.map((s) => s.id)));
    for (const entry of sources.entries)
      if (entry.subgroupId) expect(subgroups.has(entry.subgroupId), entry.id).toBe(true);
  });

  it('gives every document the AI notice, a verification status and its sources', () => {
    const sources = SourcesFileSchema.parse(readJson(join(dataDir, 'en', 'sources.json')));
    const entryIds = new Set(sources.entries.map((entry) => entry.id));
    const actIds = new Set(sources.acts.map((act) => act.id));
    const provenance = ProvenanceSchema.parse(
      readJson(join(repoRoot, 'content-meta', 'provenance.json')),
    );
    const required = (doc: Doc): boolean =>
      ['guide', 'template', 'checklist'].includes(doc.kind) &&
      ['core', 'branding', 'paperwork', 'business-types', 'lookup'].includes(doc.section);
    const problems: string[] = [];
    for (const [lang, docs] of docsByLang) {
      for (const doc of docs) {
        const where = `${lang}:${doc.id}`;
        // A page is ai-checked on the register's date unless provenance.json records its own date.
        const pinned = provenance.verification[doc.id];
        if (
          doc.verification.status === 'ai-checked' &&
          doc.verification.checkedOn !== (pinned?.checkedOn ?? sources.checkedOn)
        )
          problems.push(`${where}: checked on ${doc.verification.checkedOn}`);
        if (doc.verification.checkedOn < doc.generated.date)
          problems.push(`${where}: checked before it was generated`);
        for (const id of doc.sources.entries)
          if (!entryIds.has(id)) problems.push(`${where}: unknown source ${id}`);
        for (const id of doc.sources.acts)
          if (!actIds.has(id)) problems.push(`${where}: unknown act ${id}`);
        if (
          required(doc) &&
          doc.sources.entries.length + doc.sources.acts.length === 0 &&
          !doc.sourceNote
        )
          problems.push(`${where}: no sources and no note`);
        if (doc.verification.status === 'ai-checked' && doc.verification.reviewedBy !== undefined)
          problems.push(`${where}: ai-checked with a reviewer name`);
        if (
          doc.verification.status === 'human-verified' &&
          !/\p{L}/u.test(doc.verification.reviewedBy ?? '')
        )
          problems.push(`${where}: human-verified without a reviewer`);
        const english = enById.get(doc.id);
        if (lang !== 'en' && JSON.stringify(doc.sources) !== JSON.stringify(english?.sources))
          problems.push(`${where}: sources differ from English`);
      }
    }
    expect(problems).toEqual([]);
    expect(
      enDocs
        .filter((doc) => doc.sourceNote)
        .map((doc) => doc.id)
        .sort(),
    ).toEqual([
      'branding/marketing-prompts',
      'lookup/sources',
      'start/how-this-was-made',
      'start/how-to-use',
      'start/start-here',
      'start/what-has-changed',
    ]);
    expect(
      enDocs
        .filter((doc) => !doc.sourceNote && doc.kind !== 'sources')
        .every((doc) => doc.sources.entries.length + doc.sources.acts.length > 0),
    ).toBe(true);
  });

  it('marks the master checklist Part C rows that state a condition', () => {
    const table = enById
      .get('lookup/checklist')
      ?.blocks.find((block) => block.id === 'part-c-recurring-calendar.2');
    const marked =
      table?.kind === 'table'
        ? (table.rowWhen ?? []).flatMap((when, index) =>
            when ? [`${runsToText(table.rows[index]?.[1] ?? [])} → ${JSON.stringify(when)}`] : [],
          )
        : [];
    expect(marked).toEqual([
      'VAT return, if registered → {"tags":["vat-registered"]}',
      'EMP201 by the 7th, or the business day before if the 7th is a weekend → {"tags":["employer"]}',
      'Check and clear the director\'s loan account → {"entity":"pty"}',
      'EMP501 reconciliation → {"tags":["employer"]}',
      'CIPC annual return, within 30 business days, if you have a company → {"entity":"pty"}',
      'Beneficial ownership declaration, or the return is blocked → {"entity":"pty"}',
      'ITR14 company tax return → {"entity":"pty"}',
    ]);
  });

  it('has business types whose documents and master-checklist groups exist', () => {
    const types = BusinessTypesFileSchema.parse(
      readJson(join(repoRoot, 'content-meta', 'business-types.json')),
    );
    const checklist = enById.get('lookup/checklist');
    for (const type of types.types) {
      expect(enById.get(type.doc)?.appliesTo.businessTypes).toEqual([type.id]);
      expect(
        checklist?.headings.some(
          (heading) => heading.id === type.masterChecklistGroup && heading.pseudo,
        ),
      ).toBe(true);
    }
  });

  it('has a sane heading tree in every document', () => {
    for (const doc of enDocs) {
      let previous = 1;
      for (const heading of doc.headings) {
        if (!heading.pseudo)
          expect(heading.depth - previous, `${doc.id}#${heading.id}`).toBeLessThanOrEqual(1);
        if (!heading.pseudo) previous = heading.depth;
      }
    }
  });
});

/** Parts of a sentence; a current figure only excuses an old one in the same part. */
function clauses(sentence: string): string[] {
  // A comma splits only when a space follows, so `R50,000` stays whole.
  return sentence.split(/[;(]\s*|,\s+|\s+(?:and|but|en|maar)\s+/u);
}

/** The old figure is explicitly marked as old or wrong: `not R1 million`, `nie R50,000 nie`, `up from R20,000`. */
function markedOld(clause: string, figure: string): boolean {
  return new RegExp(
    `\\b(?:not|nie|old|ou|previous|vorige|was|up from|verhoog van|replaced(?: the)?|vervang(?: die)?)\\s+${figure}|${figure}\\s+nie\\b|\\b(?:ou|vorige)\\s+[\\p{L}-]+\\s+van\\s+${figure}`,
    'u',
  ).test(clause);
}

const R1_MILLION = 'R1 (?:million|miljoen)';
const OUT_OF_DATE = /\bout of date\b|\bverouderd\b/u;

function onlyWithCurrent(sentence: string, figure: string, current: RegExp): boolean {
  const old = new RegExp(`\\b${figure}\\b`, 'u');
  return clauses(sentence).every(
    (clause) => !old.test(clause) || current.test(clause) || markedOld(clause, figure),
  );
}

const FORBIDDEN = [
  {
    name: 'the VAT registration threshold stated as R1 million',
    matches: (s: string) =>
      new RegExp(`\\b${R1_MILLION}\\b`, 'u').test(s) && /\b(?:VAT|BTW)/u.test(s),
    allowed: (s: string) =>
      OUT_OF_DATE.test(s) || onlyWithCurrent(s, R1_MILLION, /R2\.3 (?:million|miljoen)/u),
  },
  {
    name: 'the turnover tax limit stated as R1 million',
    matches: (s: string) =>
      new RegExp(`\\b${R1_MILLION}\\b`, 'u').test(s) && /turnover tax|omsetbelasting/iu.test(s),
    allowed: (s: string) =>
      OUT_OF_DATE.test(s) || onlyWithCurrent(s, R1_MILLION, /R2\.3 (?:million|miljoen)/u),
  },
  {
    name: 'the voluntary VAT threshold stated as R50,000',
    matches: (s: string) => /\bR50,000\b/u.test(s) && /voluntary|vrywillig/iu.test(s),
    allowed: (s: string) => onlyWithCurrent(s, 'R50,000', /R120,000/u),
  },
  {
    name: 'the Small Claims Court limit stated as R20,000',
    matches: (s: string) => /\bR20,000\b/u.test(s) && /Small Claims|Klein Eise|Kleineise/iu.test(s),
    allowed: (s: string) => onlyWithCurrent(s, 'R20,000', /R30,000/u),
  },
  {
    name: 'unfinished text',
    matches: (s: string) => /\bTODO\b|\{\{|<<TODO>>/.test(s),
    allowed: () => false,
  },
  {
    name: 'a leaked citation tag',
    matches: (s: string) => /cite index=/.test(s),
    allowed: () => false,
  },
];

describe('forbidden stale strings', () => {
  it.each([
    [0, 'You must register for VAT once turnover reaches R1 million.', true],
    [0, 'The VAT threshold is R1 million and the turnover tax limit R2.3 million.', true],
    [0, 'Compulsory VAT registration: R2.3 million, not R1 million, from 1 April 2026', false],
    [0, 'If a website tells you the VAT threshold is R1 million, that site is out of date.', false],
    [0, 'The compulsory VAT registration threshold rose from R1 million to R2.3 million.', false],
    [0, 'Jy moet vir BTW registreer sodra jou omset R1 miljoen bereik.', true],
    [0, 'Verpligte BTW-registrasie: R2.3 miljoen, nie R1 miljoen nie, vanaf 1 April 2026', false],
    // Afrikaans puts the noun between "old" and the figure: "die ou BTW-drempel van R1 miljoen".
    [0, 'Baie webwerwe noem nog die ou BTW-drempel van R1 miljoen.', false],
    [0, 'Die BTW-drempel van R1 miljoen geld nou.', true],
    [1, 'Omsetbelasting geld tot R1 miljoen omset.', true],
    [2, 'Vrywillige BTW-registrasie is moontlik vanaf R50,000.', true],
    [2, 'Voluntary VAT registration: R120,000, not R50,000', false],
    [2, 'Vrywillige BTW-registrasie: R120,000, nie R50,000 nie', false],
    [3, 'Die limiet van die Kleineisehof is R20,000.', true],
    [3, 'Small Claims Court: limit R30,000 from 1 August 2026, up from R20,000.', false],
    [3, 'Die Kleineisehof se limiet is R30,000 vanaf 1 Augustus 2026, verhoog van R20,000.', false],
  ])('rule %i flags %j: %s', (index, sentence, flagged) => {
    const rule = FORBIDDEN[index];
    expect(rule !== undefined && rule.matches(sentence) && !rule.allowed(sentence)).toBe(flagged);
  });

  it.each(FORBIDDEN.map((rule) => [rule.name, rule] as const))(
    'no document contains %s',
    (_name, rule) => {
      const hits = [...docsByLang].flatMap(([lang, docs]) =>
        docs.flatMap((doc) =>
          sentences(doc)
            .filter((s) => rule.matches(s) && !rule.allowed(s))
            .map((s) => `${lang}:${doc.id}: ${s}`),
        ),
      );
      expect(hits).toEqual([]);
    },
  );

  it('states the three numbers that changed in 2026 in core/tax-and-sars', () => {
    const text = sentences(enById.get('core/tax-and-sars') as Doc).join(' ');
    for (const value of ['R2.3 million', 'R120,000', 'R600,000']) expect(text).toContain(value);
  });
});
