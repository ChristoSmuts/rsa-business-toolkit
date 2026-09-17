import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildContent, type BuildOptions } from '../../../scripts/content/build';
import { ContentError } from '../../../scripts/content/errors';
import {
  alignQuickAnswers,
  alignSources,
  compareBlocks,
  compareStructure,
  formatFinding,
  glossaryParagraph,
} from '../../../scripts/content/fidelity';
import { writeOutputs } from '../../../scripts/content/write';
import type { Block, QuickAnswersFile, SourcesFile } from '../../../src/lib/content/schema';
import {
  afMarkers,
  copyTree,
  editFile,
  enMarkers,
  fixtureConfigPaths,
  fixturesDir,
  removeDir,
  repoRoot,
  tempDir,
} from './helpers';

const TAX = join('01 Core - applies to everyone', '03-tax-and-sars.md');
const TEMPLATES = join('03 Paperwork and templates', '01-which-template-to-use-when.md');
const QUOTE = join('03 Paperwork and templates', 'templates-to-fill-in', '01-quotation.md');
const GLOSSARY = join('05 Look it up', '01-glossary.md');

const AF_GLOSSARY = `# Woordelys

Kort woorde, in gewone taal.

## Belasting

**SARS** — South African Revenue Service (Suid-Afrikaanse Inkomstediens). Die belastingowerheid. www.sars.gov.za

**BTW (VAT)** — Belasting op toegevoegde waarde (Value-Added Tax), 15%. Net geregistreerde ondernemers hef dit.

**Omsetbelasting (turnover tax)** — ’n Vereenvoudigde belasting vir mikrobesighede. 0% op die eerste R600,000.

**VAT264** — Die vorm wat die koper en die verkoper albei teken sodat ’n eis vir nosionele insetbelasting geldig is.

**Belastingfaktuur (tax invoice)** — ’n Faktuur wat ’n BTW-ondernemer uitreik, met spesifieke verpligte velde. Net ondernemers mag een uitreik.

## Voertuie

**RWC / CoR** — Roadworthy Certificate, of Certificate of Roadworthiness (padwaardigheidsertifikaat).
`;

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) removeDir(dir);
});

function fixtureOptions(overrides: Partial<BuildOptions> = {}): BuildOptions {
  const outDir = tempDir('out');
  dirs.push(outDir);
  return {
    repoRoot,
    configPaths: fixtureConfigPaths(),
    sourceRoots: { en: join(fixturesDir, 'en'), af: join(fixturesDir, 'af') },
    outDir,
    strictTaxonomy: false,
    ...overrides,
  };
}

function afTree(extra: Record<string, string> = {}): string {
  const dir = copyTree(join(fixturesDir, 'af'), 'af');
  dirs.push(dir);
  for (const [file, text] of Object.entries(extra)) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), text, 'utf8');
  }
  return dir;
}

function mutatedAf(file: string, find: string, replace: string): string {
  const dir = afTree(file === GLOSSARY ? { [GLOSSARY]: AF_GLOSSARY } : {});
  editFile(join(dir, file), find, replace);
  return dir;
}

function findings(af: string): string[] {
  const result = buildContent(
    fixtureOptions({ mode: 'fidelity', sourceRoots: { en: join(fixturesDir, 'en'), af } }),
  );
  return result.findings.map(formatFinding);
}

describe('a faithful Afrikaans translation', () => {
  const result = buildContent(fixtureOptions());
  const af = result.langs.find((build) => build.lang === 'af');
  const en = result.langs.find((build) => build.lang === 'en');

  it('passes the fidelity check and is built block for block with English ids', () => {
    expect(result.findings).toEqual([]);
    expect(af?.docs.map((doc) => doc.id)).toEqual([
      'core/tax-fixture',
      'paperwork/which-template-fixture',
      'paperwork/templates/quotation-fixture',
    ]);
    expect(af?.skipped).toEqual(['lookup/glossary', 'lookup/sources']);
    for (const doc of af?.docs ?? []) {
      const source = en?.docs.find((candidate) => candidate.id === doc.id);
      expect(doc.blocks.map((block) => block.id)).toEqual(source?.blocks.map((block) => block.id));
      expect(doc.blocks.map((block) => block.sourceHash)).toEqual(
        source?.blocks.map((block) => block.hash),
      );
      expect(doc.translation).toEqual({ status: 'machine-unreviewed', sourceLang: 'en' });
    }
  });

  it('copies task ids, applicability, placeholder styles and the English heading anchors', () => {
    const tax = af?.docs.find((doc) => doc.id === 'core/tax-fixture');
    expect(tax?.headings.map((heading) => heading.id)).toEqual([
      'words-used-in-this-file',
      'the-short-version',
      'what-sars-wants-from-a-sole-proprietor',
      'your-tax-checklist',
    ]);
    expect(tax?.headings[0]?.text).toBe('Woorde wat in hierdie lêer gebruik word');
    expect(tax?.generated).toEqual({ date: '2026-09-13', tool: 'Claude, Anthropic' });
    const enTasks = en?.tasks.tasks.map((task) => [task.id, task.when]);
    expect(af?.tasks.tasks.map((task) => [task.id, task.when])).toEqual(enTasks);
    expect(af?.tasks.tasks[1]?.when).toEqual({ entity: 'pty' });
    const quote = af?.docs.find((doc) => doc.id === 'paperwork/templates/quotation-fixture');
    const header = quote?.blocks.find((block) => block.id === 'intro.3');
    expect(
      header?.kind === 'paragraph' && header.c.filter((run) => run.t === 'placeholder'),
    ).toEqual([
      { t: 'placeholder', v: 'Jou naam', style: 'identity', key: 'ownerName' },
      { t: 'placeholder', v: 'Foon', style: 'identity', key: 'phone' },
      { t: 'placeholder', v: 'E-pos', style: 'identity', key: 'email' },
      {
        t: 'placeholder',
        v: "As 'n maatskappy: Handeldryf as 'n naam van [GEREGISTREERDE NAAM] (Pty) Ltd, Reg. No. [NOMMER] — die wet vereis dit",
        style: 'instruction',
        nested: true,
      },
    ]);
    expect(quote?.title).toBe('Kwotasie (sjabloon)');
    expect(result.files.map((file) => file.path)).toContain('af/tasks.json');
    const manifest = result.files.find((file) => file.path === 'manifest.json')?.data as {
      langs: Record<string, unknown>;
    };
    expect(manifest.langs).toEqual({
      en: { status: 'source', docCount: 5 },
      af: { status: 'partial', docCount: 3 },
    });
  });
});

describe('the fidelity check fails with a precise message', () => {
  it.each([
    [
      'a changed rand amount',
      TAX,
      'R120,000 per jaar',
      'R12,000 per jaar',
      ['core/tax-fixture:the-short-version.2: rand expected R120,000 got R12,000'],
    ],
    [
      'a changed form code',
      TAX,
      'Dien die IRP6 teen',
      'Dien die IRP7 teen',
      ['core/tax-fixture:the-short-version.3: form-code expected IRP6 got (none)'],
    ],
    [
      'a changed day',
      TAX,
      'teen 31 Augustus',
      'teen 30 Augustus',
      ['core/tax-fixture:the-short-version.3: date expected --08-31 got --08-30'],
    ],
    [
      'a changed month',
      TAX,
      'teen 31 Augustus',
      'teen 31 Oktober',
      ['core/tax-fixture:the-short-version.3: date expected --08-31 got --10-31'],
    ],
    [
      'a dropped link',
      TAX,
      '[Woordelys](../05%20Look%20it%20up/01-glossary.md)',
      'Woordelys',
      ['core/tax-fixture:words-used-in-this-file.1: links expected lookup/glossary got (none)'],
    ],
    [
      'a changed placeholder count',
      QUOTE,
      '[Jou naam] | [Foon] | [E-pos]',
      '[Jou naam] | [Foon]',
      ['paperwork/templates/quotation-fixture:intro.3: placeholder-count expected 5 got 4'],
    ],
    [
      'merged template lines',
      QUOTE,
      '[E-pos]\n[As ',
      '[E-pos] [As ',
      ['paperwork/templates/quotation-fixture:intro.3: line-breaks expected 2 got 1'],
    ],
    [
      'an extra block',
      TAX,
      '## Die kort weergawe\n\n',
      '## Die kort weergawe\n\nEkstra paragraaf.\n\n',
      ['core/tax-fixture:the-short-version.3: block-count expected 12 got 13'],
    ],
    [
      'a missing callout label',
      TAX,
      '> **In gewone taal:** Onder',
      '> Onder',
      ['core/tax-fixture:the-short-version.3: callout-label expected In gewone taal: got (none)'],
    ],
    [
      'a renamed protected name',
      TAX,
      'Wat SARS van',
      'Wat SAID van',
      [
        'core/tax-fixture:what-sars-wants-from-a-sole-proprietor: keep-verbatim expected SARS ×1 got (none)',
      ],
    ],
    [
      'a changed footer date',
      TAX,
      'op 13 September 2026',
      'op 14 September 2026',
      ['core/tax-fixture:footer: footer-date expected 2026-09-13 got 2026-09-14'],
    ],
    [
      'a changed hyphen-line count in a template preview',
      TEMPLATES,
      '-------------------------------------------------------------\n[Item of diens]',
      '[Item of diens]',
      ['paperwork/which-template-fixture:template-1-quotation.1: hyphen-lines expected 3 got 2'],
    ],
    [
      'an edited verbatim example',
      TEMPLATES,
      'A trading name of Mokoena Holdings',
      "'n Handelsnaam van Mokoena Holdings",
      [
        'paperwork/which-template-fixture:prompts-to-generate-the-rest.3: code-verbatim expected line 2 "A trading name of Mokoena Holdings (Pty) Ltd | Reg. No. 2026/123456/07" got "\'n Handelsnaam van Mokoena Holdings (Pty) Ltd | Reg. No. 2026/123456/07"',
      ],
    ],
    [
      'a changed placeholder case',
      QUOTE,
      '[JOU BESIGHEIDSNAAM]',
      '[Jou besigheidsnaam]',
      [
        'paperwork/templates/quotation-fixture:intro.3: placeholder-case expected upper [YOUR BUSINESS NAME] got mixed [Jou besigheidsnaam]',
      ],
    ],
    [
      'a checklist heading without the marker',
      TAX,
      '## Jou belasting-kontrolelys',
      '## Jou belastinglys',
      ['core/tax-fixture:your-tax-checklist.1: block-kind expected tasklist got list'],
    ],
    [
      'a changed rand amount in a glossary definition',
      GLOSSARY,
      'R600,000',
      'R60,000',
      ['lookup/glossary:turnover-tax: rand expected R600,000 got R60,000'],
    ],
    [
      'a changed form code in a glossary term',
      GLOSSARY,
      '**VAT264** —',
      '**VAT246** —',
      ['lookup/glossary:vat264: form-code expected VAT264 got VAT246'],
    ],
    [
      'a renamed abbreviation in the glossary',
      GLOSSARY,
      '**SARS** —',
      '**SAID** —',
      ['lookup/glossary:sars: keep-verbatim expected SARS ×1 got (none)'],
    ],
    [
      'a dropped glossary entry',
      GLOSSARY,
      '**VAT264** — Die vorm wat die koper en die verkoper albei teken sodat ’n eis vir nosionele insetbelasting geldig is.\n\n',
      '',
      ['lookup/glossary:tax.1: glossary-count expected 5 got 4'],
    ],
  ])('for %s', (_name, file, find, replace, expected) => {
    expect(findings(mutatedAf(file, find, replace))).toEqual(expected);
  });

  it('throws in build mode', () => {
    const af = mutatedAf(TAX, 'R120,000 per jaar', 'R12,000 per jaar');
    expect(() =>
      buildContent(fixtureOptions({ sourceRoots: { en: join(fixturesDir, 'en'), af } })),
    ).toThrow(ContentError);
  });
});

describe('glossary entries', () => {
  it('compares every definition, treats "mag" as a verb and copies the English ids', () => {
    const af = afTree({ [GLOSSARY]: AF_GLOSSARY });
    const result = buildContent(
      fixtureOptions({ mode: 'fidelity', sourceRoots: { en: join(fixturesDir, 'en'), af } }),
    );
    expect(result.findings).toEqual([]);
    const glossary = result.langs.find((build) => build.lang === 'af')?.glossary;
    expect(glossary?.entries.map((entry) => entry.id)).toEqual([
      'sars',
      'vat',
      'turnover-tax',
      'vat264',
      'tax-invoice',
      'rwc--cor',
    ]);
    expect(glossary?.entries[1]?.term).toBe('BTW (VAT)');
  });

  it('runs every block rule on an entry written as its paragraph', () => {
    const entry = { id: 'x', term: 'SARS', definition: [{ t: 'text' as const, v: 'R5.' }] };
    expect(glossaryParagraph(entry)).toEqual({
      id: 'x',
      hash: '0000000000000000',
      kind: 'paragraph',
      c: [
        { t: 'strong', c: [{ t: 'text', v: 'SARS' }] },
        { t: 'text', v: ' — ' },
        { t: 'text', v: 'R5.' },
      ],
    });
  });
});

describe('stale translations, TODO blocks and missing documents', () => {
  it('fails when English changed after the Afrikaans block was built, unless --allow-stale', () => {
    const options = fixtureOptions();
    const built = buildContent(options);
    writeOutputs(options.outDir ?? '', built.files, built.managedPrefixes);
    const en = copyTree(join(fixturesDir, 'en'), 'en');
    dirs.push(en);
    editFile(join(en, TAX), 'before you file.', 'before you submit anything.');
    const stale = buildContent({
      ...options,
      mode: 'fidelity',
      priorDir: options.outDir,
      sourceRoots: { en, af: join(fixturesDir, 'af') },
    });
    expect(
      stale.findings.map((finding) => `${finding.doc}:${finding.block}:${finding.rule}`),
    ).toEqual(['core/tax-fixture:intro.1:stale']);
    const allowed = buildContent({
      ...options,
      mode: 'fidelity',
      allowStale: true,
      priorDir: options.outDir,
      sourceRoots: { en, af: join(fixturesDir, 'af') },
    });
    // Stale reads the committed src/data, so a scratch --out still checks it: without priorDir the
    // prior hashes come from src/data, where the fixture documents do not exist.
    expect(
      buildContent({
        ...options,
        mode: 'fidelity',
        sourceRoots: { en, af: join(fixturesDir, 'af') },
      }).findings,
    ).toEqual([]);
    expect(allowed.findings).toEqual([]);
    const tax = allowed.langs
      .find((build) => build.lang === 'af')
      ?.docs.find((doc) => doc.id === 'core/tax-fixture');
    const oldHash = built.langs
      .find((build) => build.lang === 'en')
      ?.docs.find((doc) => doc.id === 'core/tax-fixture')?.blocks[0]?.hash;
    expect(tax?.blocks[0]?.sourceHash).toBe(oldHash);
  });

  it('reports <<TODO>> blocks and falls back to English with --allow-partial', () => {
    const af = mutatedAf(
      TAX,
      'Die vrywillige registrasiedrempel het van R50,000 tot R120,000 per jaar gestyg.',
      '<<TODO>>',
    );
    expect(findings(af)).toEqual([
      'core/tax-fixture:the-short-version.2: todo expected a translation got <<TODO>>',
    ]);
    const partial = buildContent(
      fixtureOptions({ allowPartial: true, sourceRoots: { en: join(fixturesDir, 'en'), af } }),
    );
    const block = partial.langs
      .find((build) => build.lang === 'af')
      ?.docs.find((doc) => doc.id === 'core/tax-fixture')
      ?.blocks.find((candidate) => candidate.id === 'the-short-version.2');
    expect(block?.fallback).toBe(true);
    expect(block?.kind === 'paragraph' && block.c).toEqual([
      {
        t: 'text',
        v: 'The voluntary registration threshold increased from R50,000 to R120,000 per year.',
      },
    ]);
  });

  it('skips missing Afrikaans documents, or emits English fallbacks with --allow-partial', () => {
    const af = afTree();
    rmSync(join(af, QUOTE));
    const partial = buildContent(
      fixtureOptions({ allowPartial: true, sourceRoots: { en: join(fixturesDir, 'en'), af } }),
    );
    const build = partial.langs.find((candidate) => candidate.lang === 'af');
    expect(build?.fallback).toEqual([
      'paperwork/templates/quotation-fixture',
      'lookup/glossary',
      'lookup/sources',
    ]);
    const quote = build?.docs.find((doc) => doc.id === 'paperwork/templates/quotation-fixture');
    expect(quote?.translation.status).toBe('fallback');
    expect(quote?.blocks.every((block) => block.fallback && block.sourceHash === block.hash)).toBe(
      true,
    );
    expect(build?.glossary?.entries).toHaveLength(6);
    expect(build?.sources?.entries).toHaveLength(6);
    expect(build?.sources?.entries[1]?.noUrlReason).toContain('as above');
  });

  it('reports a missing source tree instead of failing', () => {
    const result = buildContent(
      fixtureOptions({
        sourceRoots: { en: join(fixturesDir, 'en'), af: join(fixturesDir, 'no-such-dir') },
      }),
    );
    expect(result.missingRoots.map((root) => root.lang)).toEqual(['af']);
    expect(result.langs.map((build) => build.lang)).toEqual(['en']);
  });

  it('restricts the check to one document with --doc', () => {
    const af = mutatedAf(QUOTE, '[Jou naam] | [Foon] | [E-pos]', '[Jou naam] | [Foon]');
    const result = buildContent(
      fixtureOptions({
        mode: 'fidelity',
        doc: 'core/tax-fixture',
        sourceRoots: { en: join(fixturesDir, 'en'), af },
      }),
    );
    expect(result.findings).toEqual([]);
    expect(result.langs.find((build) => build.lang === 'af')?.docs.map((doc) => doc.id)).toEqual([
      'core/tax-fixture',
    ]);
  });

  it('accepts translator notes next to the documents', () => {
    const af = afTree({
      'TRANSLATION-NOTES.md': '# Notes\n\nSuspected fidelity false positives\n',
    });
    expect(findings(af)).toEqual([]);
  });
});

describe('block and file comparisons', () => {
  const hash = '0000000000000000';
  const en = enMarkers();
  const af = afMarkers();

  it('reports a changed and an added ordinal, and accepts the language own spelling', () => {
    const paragraph = (text: string): Block => ({
      id: 'p',
      hash,
      kind: 'paragraph',
      c: [{ t: 'text', v: text }],
    });
    const rules = (enText: string, afText: string): string[] =>
      compareBlocks('d', paragraph(enText), paragraph(afText), en, af).map(
        (finding) => `${finding.rule} ${finding.expected} ${finding.got}`,
      );
    expect(
      rules(
        'EMP201 submitted and paid by the 7th of the following month',
        'EMP201 ingedien en betaal teen die 8ste van die volgende maand',
      ),
    ).toEqual(['ordinal 7 8']);
    expect(rules('EMP201 every month', 'EMP201 vanaf die 7de dag')).toEqual(['ordinal (none) 7']);
    expect(
      rules(
        'by the 1st, the 2nd, the 3rd and the 28th',
        'teen die 1ste, die 2de, die 3de en die 28ste',
      ),
    ).toEqual([]);
  });

  it('compares structure and per-kind shape', () => {
    const enBlocks: Block[] = [
      { id: 'a', hash, kind: 'heading', depth: 2, text: 'A', c: [] },
      { id: 'a.1', hash, kind: 'list', ordered: true, start: 1, items: [[], []] },
      { id: 'a.2', hash, kind: 'table', header: [[], []], rows: [[[], []]], align: [null, null] },
    ];
    expect(
      compareStructure('d', { blocks: enBlocks, rawKinds: ['heading', 'list', 'table'] }, [
        enBlocks[0] as Block,
        enBlocks[2] as Block,
        enBlocks[1] as Block,
      ]),
    ).toEqual([
      { doc: 'd', block: 'a.1', rule: 'block-kind', expected: 'list', got: 'table' },
      { doc: 'd', block: 'a.2', rule: 'block-kind', expected: 'table', got: 'list' },
    ]);
    expect(
      compareBlocks(
        'd',
        enBlocks[0] as Block,
        { id: 'a', hash, kind: 'heading', depth: 3, text: 'A', c: [] },
        en,
        af,
      ).map((f) => f.rule),
    ).toEqual(['heading-depth']);
    expect(
      compareBlocks(
        'd',
        enBlocks[1] as Block,
        { id: 'a.1', hash, kind: 'list', ordered: false, items: [[]] },
        en,
        af,
      ).map((f) => f.rule),
    ).toEqual(['list-ordered', 'list-start', 'list-items']);
    expect(
      compareBlocks(
        'd',
        enBlocks[2] as Block,
        { id: 'a.2', hash, kind: 'table', header: [[]], rows: [], align: [null] },
        en,
        af,
      ).map((f) => f.rule),
    ).toEqual(['table-columns', 'table-rows']);
    expect(
      compareBlocks(
        'd',
        {
          id: 'p',
          hash,
          kind: 'paragraph',
          c: [
            { t: 'docref', doc: 'core/register', label: '01-core/02' },
            { t: 'text', v: ' in 2026' },
          ],
        },
        {
          id: 'p',
          hash,
          kind: 'paragraph',
          c: [
            { t: 'docref', section: 'core', label: '01-core/' },
            { t: 'text', v: ' in 2025' },
          ],
        },
        en,
        af,
      ).map(formatFinding),
    ).toEqual([
      'd:p: number expected 2026 got 2025',
      'd:p: docrefs expected core/register got section:core',
    ]);
  });

  it('checks protected names in translated fences and allows extra English in brackets', () => {
    const fence = (text: string): Block => ({
      id: 'f',
      hash,
      kind: 'code',
      variant: 'prompt',
      text,
    });
    const terms = ['SARS', 'Companies Act', 'eFiling'];
    expect(
      compareBlocks(
        'd',
        fence('Ask SARS about the Companies Act and eFiling.'),
        fence('Vra SAID oor die Maatskappywet en EFiling. EFiling (eFiling), SARS'),
        en,
        af,
        terms,
      ).map(formatFinding),
    ).toEqual(['d:f: keep-verbatim expected Companies Act ×1 got (none)']);
  });

  it('compares sources and quick answers by position and copies English ids', () => {
    const entry = {
      group: 'G',
      groupId: 'g',
      title: 'T',
      official: true,
      type: 'web' as const,
      urls: [],
      block: 'g.1',
    };
    const enFile: SourcesFile = {
      lang: 'en',
      doc: 'lookup/sources',
      checkedOn: '2026-09-13',
      acts: [{ id: 'act', name: 'Act', governs: [], appearsIn: ['core/register'] }],
      groups: [
        {
          id: 'g',
          title: 'G',
          order: 1,
          notes: [],
          subgroups: [{ id: 'label', title: 'Label', block: 'g.1', notes: [], entry: 'e' }],
        },
      ],
      entries: [{ ...entry, id: 'e', url: 'https://a.example/', subgroupId: 'label' }],
    };
    const trFile: SourcesFile = {
      ...enFile,
      lang: 'af',
      checkedOn: '2026-09-14',
      acts: [{ id: 'x', name: 'Act', governs: [], appearsIn: [] }],
      groups: [
        {
          id: 'g',
          title: 'G',
          order: 1,
          notes: [],
          subgroups: [{ id: 'etiket', title: 'Etiket', block: 'g.1', notes: [], entry: 'x' }],
        },
      ],
      entries: [
        { ...entry, id: 'x', official: false, url: 'https://b.example/', subgroupId: 'etiket' },
      ],
    };
    expect(alignSources(enFile, trFile).map(formatFinding)).toEqual([
      'lookup/sources:intro: checked-on expected 2026-09-13 got 2026-09-14',
      'lookup/sources:g.1: source-url expected https://a.example/ got https://b.example/',
      'lookup/sources:g.1: source-official expected true got false',
      'lookup/sources:legislation-this-toolkit-relies-on: act-appears-in expected core/register got ',
    ]);
    expect(trFile.entries[0]?.id).toBe('e');
    expect(trFile.entries[0]?.subgroupId).toBe('label');
    expect(trFile.groups[0]?.subgroups[0]).toMatchObject({ id: 'label', entry: 'e' });
    expect(alignSources(enFile, { ...trFile, entries: [], acts: [] }).map((f) => f.rule)).toEqual([
      'checked-on',
      'source-count',
      'act-count',
    ]);

    const enQuick: QuickAnswersFile = {
      lang: 'en',
      doc: 'start/how-to-use',
      items: [
        { id: 'q', question: [], targets: [{ t: 'docref', doc: 'core/register', label: 'x' }] },
      ],
    };
    const trQuick: QuickAnswersFile = {
      lang: 'af',
      doc: 'start/how-to-use',
      items: [{ id: 'v', question: [], targets: [{ t: 'docref', section: 'core', label: 'x' }] }],
    };
    expect(alignQuickAnswers(enQuick, trQuick, 'p3').map(formatFinding)).toEqual([
      'start/how-to-use:p3: quick-answer-targets expected core/register got core',
    ]);
    expect(trQuick.items[0]?.id).toBe('q');
    expect(alignQuickAnswers(enQuick, { ...trQuick, items: [] }, 'p3').map((f) => f.rule)).toEqual([
      'quick-answer-count',
    ]);
  });

  it('keeps the committed fixture markdown byte-stable', () => {
    expect(readFileSync(join(fixturesDir, 'af', TAX), 'utf8')).toContain('> **In gewone taal:**');
    const copy = tempDir('copy');
    dirs.push(copy);
    cpSync(join(fixturesDir, 'af'), copy, { recursive: true });
    expect(readFileSync(join(copy, QUOTE), 'utf8')).toBe(
      readFileSync(join(fixturesDir, 'af', QUOTE), 'utf8'),
    );
  });
});
