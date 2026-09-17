/**
 * Real Afrikaans prose: faithful translations of three corpus documents (written by the WP-10 reviewer,
 * updated to the typographic ’n and to English official names). They must pass with no findings, and the
 * reviewer's mutations must each fail with a precise message.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildContent } from '../../../scripts/content/build';
import {
  loadTranslationTerms,
  markersFor,
  translationTermsPath,
} from '../../../scripts/content/config';
import { applySourceFixes } from '../../../scripts/content/discover';
import { IssueCollector } from '../../../scripts/content/errors';
import { alignTranslation, formatFinding } from '../../../scripts/content/fidelity';
import { assignTaskIds } from '../../../scripts/content/special/checklist';
import { protectedTerms } from '../../../scripts/content/verbatim';
import {
  codes,
  fixturesDir,
  parseMd,
  readCorpus,
  realConfig,
  realEntry,
  removeDir,
  repoRoot,
  tempDir,
} from './helpers';

const AF_REAL = join(fixturesDir, 'af-real');
const PICK = 'business-types/pick-your-business-type';
const RECEIPT = 'paperwork/templates/receipt';
const ADD = 'core/adding-new-lines';
const DOCS = [PICK, RECEIPT, ADD] as const;
type DocId = (typeof DOCS)[number];

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) removeDir(dir);
});

const terms = protectedTerms(loadTranslationTerms(translationTermsPath(repoRoot, 'af')));

function afSource(docId: DocId): string {
  return readFileSync(join(AF_REAL, ...realEntry(docId).source.split('/')), 'utf8');
}

/** Parse issues (as `issue <code>`) followed by fidelity findings. */
function check(docId: DocId, markdown: string): string[] {
  const entry = realEntry(docId);
  const en = parseMd(readCorpus(entry), entry).parsed;
  assignTaskIds(en.blocks, entry.id);
  const fixIssues = new IssueCollector();
  const { parsed, issues } = parseMd(
    applySourceFixes(markdown, entry, 'af', markersFor(realConfig(), 'af'), fixIssues),
    entry,
    'af',
  );
  const findings = alignTranslation(en, parsed, {
    allowPartial: false,
    allowStale: false,
    enMarkers: markersFor(realConfig(), 'en'),
    trMarkers: markersFor(realConfig(), 'af'),
    protectedTerms: terms,
  });
  return [
    ...[...codes(fixIssues), ...codes(issues)].map((code) => `issue ${code}`),
    ...findings.map(formatFinding),
  ];
}

describe('faithful Afrikaans translations of real documents', () => {
  it.each(DOCS)('%s has no findings', (docId) => {
    expect(check(docId, afSource(docId))).toEqual([]);
  });

  it('treats the straight apostrophe in ’n exactly like the typographic one', () => {
    for (const docId of DOCS) {
      const source = afSource(docId);
      expect(source).toContain('’n');
      expect(check(docId, source.replaceAll('’n', "'n").replaceAll('’N', "'N"))).toEqual([]);
    }
  });

  it('passes a whole fidelity build pointed at the fixture tree', () => {
    const outDir = tempDir('af-real-out');
    dirs.push(outDir);
    const result = buildContent({
      repoRoot,
      mode: 'fidelity',
      langs: ['af'],
      sourceRoots: { af: AF_REAL },
      outDir,
    });
    expect(result.findings.map(formatFinding)).toEqual([]);
    const af = result.langs.find((build) => build.lang === 'af');
    expect(af?.root).toBe(AF_REAL);
    expect(af?.docs.map((doc) => doc.id).sort()).toEqual([...DOCS].sort());
  }, 300_000);
});

describe('each mutation of real Afrikaans prose fails precisely', () => {
  it.each<[string, DocId, string | RegExp, string, string[]]>([
    [
      '1 a changed rand amount',
      PICK,
      'R2.3 miljoen',
      'R2.5 miljoen',
      [`${PICK}:what-nobody-needs-on-day-one.1: rand expected R2.3 got R2.5`],
    ],
    [
      '2 a changed percentage',
      ADD,
      'meer as 20% van',
      'meer as 25% van',
      [`${ADD}:tax-one-company-several-activities.4: percent expected 20% got 25%`],
    ],
    [
      '4 a dropped link',
      PICK,
      '[Kosbesigheid](02-food-business.md)',
      'Kosbesigheid',
      [`${PICK}:intro.3: links expected business-types/vehicle-dealer | business-types/food`],
    ],
    [
      '5 a changed link target',
      PICK,
      '[Voertuighandelaar](01-vehicle-dealer.md)',
      '[Voertuighandelaar](02-food-business.md)',
      [`${PICK}:intro.3: links expected business-types/vehicle-dealer | business-types/food`],
    ],
    [
      '6 a dropped placeholder',
      RECEIPT,
      '[Foon] | [E-pos]',
      '[Foon]',
      [`${RECEIPT}:intro.3: placeholder-count expected 4 got 3`],
    ],
    [
      '7 an extra paragraph',
      RECEIPT,
      'Dankie.\n',
      'Dankie.\n\nOns waardeer jou besigheid.\n',
      [`${RECEIPT}:intro.6: block-count expected 7 got 8`],
    ],
    [
      '8 a missing callout label',
      ADD,
      '> **In gewone taal:** As enigiets',
      '> As enigiets',
      [
        `${ADD}:can-one-company-trade-in-more-than-one-thing.4: callout-label expected In gewone taal: got (none)`,
      ],
    ],
    [
      '9 a changed form code',
      ADD,
      'Alle aktiwiteite gaan op een ITR14.',
      'Alle aktiwiteite gaan op een IBR14.',
      [`${ADD}:tax-one-company-several-activities.1: form-code expected ITR14 got (none)`],
    ],
    [
      '10 a changed bare domain',
      PICK,
      'inforegulator.org.za',
      'inforegulator.co.za',
      [
        'issue unknown-bare-domain',
        `${PICK}:what-everyone-needs-regardless-of-type.2: links expected https://inforegulator.org.za/ got https://inforegulator.co.za/`,
      ],
    ],
    [
      '11 a translated example fence',
      ADD,
      'A trading name of Mokoena Holdings',
      '’n Handelsnaam van Mokoena Holdings',
      [`${ADD}:what-the-law-requires-either-way.3: code-verbatim expected line 2`],
    ],
    [
      '12 a removed table row',
      PICK,
      /^\| Voertuighandel .*\n/m,
      '',
      [`${PICK}:how-much-regulation-each-type-carries.2: table-rows expected 6 got 5`],
    ],
    [
      '13 a changed plain number',
      ADD,
      'SAPS binne 30 dae in kennis gestel',
      'SAPS binne 60 dae in kennis gestel',
      [`${ADD}:checklist-before-you-add-a-line.1: number expected 30 got 60`],
    ],
    [
      '14 a changed placeholder case',
      RECEIPT,
      '[JOU BESIGHEIDSNAAM]',
      '[Jou besigheidsnaam]',
      [
        `${RECEIPT}:intro.3: placeholder-case expected upper [YOUR BUSINESS NAME] got mixed [Jou besigheidsnaam]`,
      ],
    ],
    [
      '15 a flattened nested placeholder',
      RECEIPT,
      '[GEREGISTREERDE NAAM] (Pty) Ltd, Reg. No. [NOMMER]]',
      'GEREGISTREERDE NAAM (Pty) Ltd, Reg. No. NOMMER]',
      [`${RECEIPT}:intro.3: placeholder-nesting expected true got false`],
    ],
    [
      '16 a changed multiplier',
      PICK,
      'R10 miljoen',
      'R10 duisend',
      [`${PICK}:what-nobody-needs-on-day-one.1: multiplier expected million got thousand`],
    ],
    [
      '17 a changed old-scheme reference',
      ADD,
      'in `01-core/06`',
      'in `01-core/07`',
      [
        `${ADD}:when-splitting-is-still-worth-it.2: docrefs expected core/running-a-pty-ltd got core/paying-yourself`,
      ],
    ],
    [
      '18 a dropped list item',
      PICK,
      /^- ’n Sakeplan.*\n/m,
      '',
      [`${PICK}:what-nobody-needs-on-day-one.1: list-items expected 5 got 4`],
    ],
    [
      '19 a translated Act name',
      PICK,
      'Consumer Protection Act',
      'Wet op Verbruikersbeskerming',
      [
        `${PICK}:what-everyone-needs-regardless-of-type.2: keep-verbatim expected Consumer Protection Act ×1 got (none)`,
      ],
    ],
    [
      '20 a renamed SARS',
      PICK,
      'SARS-registrasie',
      'SAID-registrasie',
      [
        `${PICK}:what-everyone-needs-regardless-of-type.2: keep-verbatim expected SARS ×1 got (none)`,
      ],
    ],
    [
      '21 an official name in Afrikaans only',
      ADD,
      'Certificate of Acceptability (Sertifikaat van Aanvaarbaarheid)',
      'Sertifikaat van Aanvaarbaarheid',
      [
        `${ADD}:can-one-company-trade-in-more-than-one-thing.3: keep-verbatim expected Certificate of Acceptability ×1 got (none)`,
      ],
    ],
    [
      '22 a changed footer date',
      PICK,
      'op 13 September 2026',
      'op 14 September 2026',
      [`${PICK}:footer: footer-date expected 2026-09-13 got 2026-09-14`],
    ],
    [
      '23 merged template header lines',
      RECEIPT,
      /\[E-pos\]\n\[As /,
      '[E-pos] [As ',
      [`${RECEIPT}:intro.3: line-breaks expected 2 got 1`],
    ],
  ])('%s', (_name, docId, find, replace, expected) => {
    const source = afSource(docId);
    expect(typeof find === 'string' ? source.includes(find) : find.test(source)).toBe(true);
    const found = check(docId, source.replace(find, replace));
    // Each expected string is the start of the message; a mismatch prints the full finding.
    expect(
      found.map((finding, index) =>
        finding.startsWith(expected[index] ?? ' ') ? expected[index] : finding,
      ),
    ).toEqual(expected);
  });
});
