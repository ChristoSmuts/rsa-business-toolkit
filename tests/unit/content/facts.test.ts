import { describe, expect, it } from 'vitest';
import {
  EN_FACT_MARKERS,
  emptyDateAudit,
  emptyFacts,
  extractFacts,
  factsFromRuns,
  mergeFacts,
  normaliseMonth,
} from '../../../scripts/content/facts';
import { multisetDiff } from '../../../scripts/content/fidelity';
import { afMarkers, enMarkers } from './helpers';

describe('extractFacts', () => {
  it('does not read a %20 in a link target as a percentage', () => {
    const facts = factsFromRuns(
      [
        { t: 'text', v: 'See ' },
        { t: 'link', doc: 'lookup/sources', c: [{ t: 'text', v: 'Sources' }] },
        {
          t: 'link',
          href: 'https://example.org/Look%20it%20up/50%25',
          external: true,
          c: [{ t: 'text', v: 'the register' }],
        },
      ],
      enMarkers(),
    );
    expect(facts).toEqual(emptyFacts());
    expect(extractFacts('../05%20Look%20it%20up/03-sources.md', EN_FACT_MARKERS).percents).toEqual(
      [],
    );
  });

  it('reads CoR 14.3 as a form code and never as R14', () => {
    const facts = extractFacts(
      'Your CoR 14.3 arrives by email; reinstate with CoR 40.5.',
      EN_FACT_MARKERS,
    );
    expect(facts.codes).toEqual(['CoR 14.3', 'CoR 40.5']);
    expect(facts.rands).toEqual([]);
    expect(facts.numbers).toEqual([]);
  });

  it('reads R638 of 2018 as code R638 and number 2018', () => {
    const facts = extractFacts('Regulation R638 of 2018 replaced R962.', EN_FACT_MARKERS);
    expect(facts.codes).toEqual(['R638', 'R962']);
    expect(facts.numbers).toEqual(['2018']);
    expect(facts.rands).toEqual([]);
  });

  it('normalises Afrikaans month names to English, case-sensitively', () => {
    expect(normaliseMonth('Februarie', afMarkers())).toBe('February');
    expect(normaliseMonth('maart', afMarkers())).toBeUndefined();
    expect(normaliseMonth('may', EN_FACT_MARKERS)).toBeUndefined();
    expect(normaliseMonth('Tuesday', afMarkers())).toBeUndefined();
    expect(extractFacts('teen 28 Februarie 2027 en in Februarie', afMarkers()).dates).toEqual([
      '2027-02-28',
      'February',
    ]);
    expect(extractFacts('by 28 February 2027 and in February', EN_FACT_MARKERS).dates).toEqual([
      '2027-02-28',
      'February',
    ]);
  });

  it('extracts rands, multipliers, percentages, sections, dates and plain numbers', () => {
    const en = extractFacts(
      'Register within 21 business days once turnover passes R2.3 million, charge 15% (10.25% interest), see s64E(4) and section 56(2), from 1 April 2026 and 31 August, in December 2025, 28/29 February. Items R 0.00.',
      enMarkers(),
    );
    expect(en).toEqual({
      codes: [],
      ordinals: [],
      sections: ['s64E(4)', 's56(2)'],
      dates: ['2026-04-01', '--08-31', '--02-28', '--02-29', '2025-12'],
      rands: ['R2.3', 'R0.00'],
      percents: ['15%', '10.25%'],
      numbers: ['21'],
      multipliers: ['million'],
    });
    const af = extractFacts(
      'Registreer binne 21 werksdae sodra omset R2.3 miljoen oorskry, hef 15% (10.25% rente), sien s64E(4) en artikel 56(2), vanaf 1 April 2026 en 31 Augustus, in Desember 2025, 28/29 Februarie. Items R 0.00.',
      afMarkers(),
    );
    expect(af).toEqual(en);
  });

  it('keeps thousand separators and form codes with spaces', () => {
    const facts = extractFacts(
      'File VAT264 and SAPS 601 for R120,000 or R1,400,001 at 0%.',
      EN_FACT_MARKERS,
    );
    expect(facts.codes).toEqual(['VAT264', 'SAPS 601']);
    expect(facts.rands).toEqual(['R120,000', 'R1,400,001']);
    expect(facts.percents).toEqual(['0%']);
  });

  it('merges facts and diffs multisets', () => {
    const merged = mergeFacts(
      extractFacts('R5', EN_FACT_MARKERS),
      extractFacts('R5 and 7', EN_FACT_MARKERS),
    );
    expect(merged.rands).toEqual(['R5', 'R5']);
    expect(multisetDiff(['R5', 'R5', '3'], ['R5', '4'])).toEqual({
      missing: ['3', 'R5'],
      extra: ['4'],
    });
  });
});

describe('dates need the capitalised month in a date context', () => {
  it.each([
    ['You may still have to file a return showing zero.', []],
    ['It may carry on any lawful business.', []],
    ['Only vendors may issue one.', []],
    ['May I see the invoice?', []],
    ['They march to the office.', []],
    ['Troops march in March.', ['March']],
    ['Its training data ends in May 2026.', ['2026-05']],
    ['File by 31 May.', ['--05-31']],
    [
      'Tax thresholds change in February and take effect in March or April.',
      ['February', 'March', 'April'],
    ],
    ['Once by the end of August, once by the end of February.', ['August', 'February']],
    ['End September', ['September']],
    ['July to October', ['July', 'October']],
    ['mid-February', ['February']],
    ['Choose February so it matches the tax year.', []],
  ])('English %j → %j', (text, dates) => {
    expect(extractFacts(text, enMarkers()).dates).toEqual(dates);
  });

  it.each([
    ['Jy moet dalk steeds ’n opgawe indien.', []],
    ['Dit mag enige wettige besigheid bedryf.', []],
    ['in mei', []],
    ['in Mei 2026', ['2026-05']],
    ['teen 31 Mei', ['--05-31']],
    [
      'Belastingdrempels verander in Februarie en tree in Maart of April in werking.',
      ['February', 'March', 'April'],
    ],
    ['teen die einde van Augustus', ['August']],
    ['Einde September', ['September']],
    ['Julie tot Oktober', ['July', 'October']],
  ])('Afrikaans %j → %j', (text, dates) => {
    expect(extractFacts(text, afMarkers()).dates).toEqual(dates);
  });

  it('audits counted dates, skipped capitalised months and month words in another case', () => {
    const audit = emptyDateAudit();
    extractFacts(
      'Choose February so you may file by 31 August or in May 2026.',
      enMarkers(),
      audit,
    );
    expect(audit).toEqual({
      tokens: [
        { value: '--08-31', text: '31 August' },
        { value: '2026-05', text: 'May 2026' },
      ],
      skipped: [{ word: 'February', text: 'Choose February so you may file by 31 August' }],
      otherCase: ['may'],
    });
  });
});

describe('faithful Afrikaans wording has the same facts', () => {
  it.each([
    ['by 28 or 29 February', 'teen 28 of 29 Februarie'],
    ['28/29 February: tax year ends', '28/29 Februarie: belastingjaar eindig'],
    ['under R2.3 million a year', 'onder R2.3 miljoen per jaar'],
    [
      'You may still have to file a return showing zero.',
      'Jy moet dalk steeds ’n opgawe indien wat nul toon.',
    ],
    ['It may carry on any lawful business.', 'Dit mag enige wettige besigheid bedryf.'],
    [
      'They changed a lot in the February 2026 Budget.',
      'Hulle het baie verander in die Begroting van Februarie 2026.',
    ],
    [
      'They changed a lot in the February 2026 Budget.',
      'Dit het baie verander in die Februarie 2026-begroting.',
    ],
    ['the 2026 Budget', 'die 2026-begroting'],
    ['two ITR14s, two sets of provisional returns', "twee ITR14's, twee stelle voorlopige opgawes"],
    ['two ITR14s', 'twee ITR14’s'],
    ['two ITR14s', 'twee ITR14-opgawes'],
    ["the ITR14's due date", 'die ITR14-sperdatum'],
    ['two IRP6 returns', 'twee IRP6-opgawes'],
    ['by the 7th of the following month', 'teen die 7de van die volgende maand'],
    ['R153,250 for ages 65 to 74', 'R153,250 vir ouderdomme 65 tot 74'],
    ['For the 2026/2027 year', 'Vir die 2026/2027-jaar'],
    ['the SAPS 601 form', 'die SAPS 601-vorm'],
    ['Section 20A of the Income Tax Act', 'Artikel 20A van die Income Tax Act'],
    ['The section 4 check a board must pass', 'Die artikel 4-toets wat ’n direksie moet slaag'],
    ['sections 79 and 80', 'artikels 79 en 80'],
    ['the R10,000 threshold', 'die R10,000-drempel'],
    ['in March and August', 'in Maart en Augustus'],
    ['shown as "trading as".', 'met die woorde "handeldrywende as" ("trading as").'],
  ])('%j = %j', (en, af) => {
    expect(extractFacts(af, afMarkers())).toEqual(extractFacts(en, enMarkers()));
  });

  /**
   * The EMP201 due date is the corpus's ordinal: it appears in `core/running-a-pty-ltd`,
   * `core/paying-yourself`, `lookup/glossary`, `lookup/checklist` and `lookup/sources`.
   */
  it.each([
    [
      'EMP201 submitted and paid by the 7th of the following month',
      'EMP201 ingedien en betaal teen die 7de van die volgende maand',
    ],
    [
      'EMP201 by the 7th, or the business day before if the 7th is a weekend',
      'EMP201 teen die 7de, of die besigheidsdag voor as die 7de op ’n naweek val',
    ],
    ['Due by the 7th of the following month', 'Verskuldig teen die 7de van die volgende maand'],
    ['the 1st, the 2nd and the 3rd', 'die 1ste, die 2de en die 3de'],
    ['by the 28th', 'teen die 28ste'],
    ['from the 7th day', 'vanaf die 7de dag'],
    ['the 7th-day rule', 'die 7de-dag-reël'],
  ])('ordinal %j = %j', (en, af) => {
    expect(extractFacts(af, afMarkers()).ordinals).toEqual(extractFacts(en, enMarkers()).ordinals);
  });

  it('reads an ordinal as its number, whatever the language spells after the digits', () => {
    expect(extractFacts('by the 7th of the following month', enMarkers()).ordinals).toEqual(['7']);
    expect(extractFacts('teen die 7de van die volgende maand', afMarkers()).ordinals).toEqual([
      '7',
    ]);
    expect(extractFacts('teen die 28ste', afMarkers()).ordinals).toEqual(['28']);
    // The ordinal is not also a plain number, so one changed day gives one finding, not two.
    expect(extractFacts('by the 7th', enMarkers()).numbers).toEqual([]);
    expect(extractFacts('7 days', enMarkers())).toMatchObject({ numbers: ['7'], ordinals: [] });
  });

  it('reports a changed or an added ordinal', () => {
    const diff = (en: string, af: string) =>
      multisetDiff(extractFacts(en, enMarkers()).ordinals, extractFacts(af, afMarkers()).ordinals);
    expect(
      diff(
        'EMP201 by the 7th of the following month',
        'EMP201 teen die 8ste van die volgende maand',
      ),
    ).toEqual({ missing: ['7'], extra: ['8'] });
    expect(diff('EMP201 monthly', 'EMP201 vanaf die 7de dag')).toEqual({
      missing: [],
      extra: ['7'],
    });
  });

  it('reads an ordinal day with its month as a date, in either language', () => {
    const dates = (text: string, af = false) => extractFacts(text, af ? afMarkers() : enMarkers());
    expect(dates('the 7th of August')).toMatchObject({ dates: ['--08-07'], ordinals: [] });
    expect(dates('7th August 2026')).toMatchObject({ dates: ['2026-08-07'], ordinals: [] });
    expect(dates('7 Augustus', true)).toMatchObject({ dates: ['--08-07'], ordinals: [] });
    expect(dates('die 7de van Augustus', true)).toMatchObject({
      dates: ['--08-07'],
      ordinals: [],
    });
    // An English day-month date and its Afrikaans translation now agree.
    expect(multisetDiff(dates('the 7th of August').dates, dates('7 Augustus', true).dates)).toEqual(
      { missing: [], extra: [] },
    );
    // An ordinal with no month is still an ordinal.
    expect(dates('by the 7th of the following month')).toMatchObject({
      dates: [],
      ordinals: ['7'],
    });
    // A different day is still caught.
    expect(multisetDiff(dates('the 7th of August').dates, dates('8 Augustus', true).dates)).toEqual(
      { missing: ['--08-07'], extra: ['--08-08'] },
    );
  });

  it('still reports real changes in Afrikaans', () => {
    const diff = (en: string, af: string) => {
      const a = extractFacts(en, enMarkers());
      const b = extractFacts(af, afMarkers());
      return { rands: multisetDiff(a.rands, b.rands), dates: multisetDiff(a.dates, b.dates) };
    };
    expect(diff('R2.3 million', 'R2,3 miljoen').rands.missing).toEqual(['R2.3']);
    expect(diff('R120,000', 'R120 000').rands.missing).toEqual(['R120,000']);
    expect(diff('by 31 August', 'teen einde Augustus').dates).toEqual({
      missing: ['--08-31'],
      extra: ['August'],
    });
  });
});
