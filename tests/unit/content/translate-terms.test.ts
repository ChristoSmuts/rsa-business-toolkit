import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadTranslationTerms, translationTermsPath } from '../../../scripts/content/config';
import { EN_MONTHS } from '../../../scripts/content/facts';
import { protectedTerms } from '../../../scripts/content/verbatim';
import { afMarkers, enMarkers, repoRoot } from './helpers';

interface Term {
  en: string;
  af: string;
  note: string;
  keepVerbatim: boolean;
}

interface Terms {
  register: string;
  apostrophe: string;
  markers: Record<string, { en: string; af: string }>;
  months: Record<string, string>;
  multipliers: Record<string, string>;
  keepVerbatim: string[];
  formCodes: string[];
  terms: Term[];
}

const termsPath = join(repoRoot, 'scripts', 'translate', 'TERMS-af.json');
const terms = JSON.parse(readFileSync(termsPath, 'utf8')) as Terms;
const guide = readFileSync(join(repoRoot, 'scripts', 'translate', 'STYLE-GUIDE-af.md'), 'utf8');
/** A straight apostrophe in ’n. */
const STRAIGHT_N = /(^|[^\p{L}])'n(?![\p{L}])/mu;

describe('TERMS-af.json', () => {
  it('uses exactly the markers the pipeline parses', () => {
    const en = enMarkers();
    const af = afMarkers();
    for (const key of [
      'plainWords',
      'supports',
      'wordsUsedHeading',
      'footerPrefix',
      'checklistHeading',
      'officialTag',
      'allBusinessTypes',
    ] as const) {
      expect(terms.markers[key], key).toEqual({ en: en[key], af: af[key] });
    }
    expect(terms.markers['checkedOn']?.af).toMatch(new RegExp(af.checkedOnPattern, 'u'));
    expect(terms.markers['checkedOn']?.en).toMatch(new RegExp(en.checkedOnPattern, 'u'));
    expect(terms.markers['squareBrackets']?.af).toBe(`[${af.placeholderLiterals[0] ?? ''}]`);
    expect(terms.markers['sectionWord']?.af).toBe(af.sectionWords[0]);
  });

  it('matches the month and multiplier maps used by the fidelity check', () => {
    expect(Object.keys(terms.months)).toEqual([...EN_MONTHS]);
    expect(Object.values(terms.months)).toEqual(afMarkers().months);
    expect(terms.multipliers).toEqual(afMarkers().multipliers);
  });

  it('fixes the plan terminology, the reviewed glossary terms and the jy register', () => {
    const lookup = new Map(terms.terms.map((term) => [term.en, term.af]));
    for (const [en, af] of [
      ['VAT', 'BTW'],
      ['sole proprietor', 'eenmansaak'],
      ['provisional tax', 'voorlopige belasting'],
      ['turnover tax', 'omsetbelasting'],
      ['Master checklist', 'Hoofkontrolelys'],
      ['vendor', 'ondernemer'],
      ['input tax', 'insetbelasting'],
      ['output tax', 'uitsetbelasting'],
      ['notional input tax', 'nosionele insetbelasting'],
      ['deemed', 'geag'],
      ['assessed loss', 'vasgestelde verlies'],
      ['Memorandum of Incorporation', 'akte van oprigting'],
      ['Small Business Corporation', 'kleinsakekorporasie'],
      ['Pay As You Earn', 'lopende betaalstelsel'],
      ['Skills Development Levy', 'vaardigheidsontwikkelingsheffing'],
      ['filing', 'indiening'],
      ['to file', 'indien'],
      ['independent review', 'onafhanklike oorsig'],
      ['limited assurance', 'beperkte sekerheid'],
      ['legal person', 'regspersoon'],
      ['board', 'direksie'],
      ['resolution', 'besluit'],
      ['payroll', 'betaalstaat'],
      ['scam', 'swendelary'],
      ['trading as', 'handeldrywende as'],
      ['Small Claims Court', 'Kleineisehof'],
    ]) {
      expect(lookup.get(en ?? ''), en).toBe(af);
    }
    expect(terms.register).toBe('jy');
    for (const name of ['SARS', 'CIPC', 'POPIA', 'Pty Ltd', 'eFiling', 'BizPortal', 'PayShap'])
      expect(terms.keepVerbatim).toContain(name);
    for (const code of ['ITR14', 'IRP6', 'VAT264', 'VAT101', 'EMP201', 'EMP501', 'SAPS 601'])
      expect(terms.formCodes).toContain(code);
    expect(new Set(terms.terms.map((term) => term.en)).size).toBe(terms.terms.length);
  });

  it('gives every term one shape, the typographic ’n and the reviewer notes', () => {
    expect(terms.apostrophe).toBe('’n');
    for (const term of terms.terms) {
      expect(Object.keys(term).sort(), term.en).toEqual(['af', 'en', 'keepVerbatim', 'note']);
      expect(`${term.af} ${term.note}`, term.en).not.toMatch(STRAIGHT_N);
    }
    const note = (en: string): string => terms.terms.find((term) => term.en === en)?.note ?? '';
    expect(note('Certificate of Acceptability')).toContain(
      'Certificate of Acceptability (Sertifikaat van Aanvaarbaarheid)',
    );
    expect(note('Memorandum of Incorporation')).toContain('MOI');
    expect(note('Memorandum of Incorporation')).toContain('memorandum of association');
    expect(note('body corporate')).toContain('regspersoon');
    expect(note('reflected')).toContain('first use');
    expect(note('cleared')).toContain('set off');
    expect(note('beneficial ownership')).toContain('uiteindelike');
    expect(note('filing')).toContain('liassering');
    expect(note('Pay As You Earn')).toContain('LBS');
  });

  it('protects Act names, official English names and the form codes the fact rule cannot see', () => {
    expect(terms.terms.filter((term) => term.keepVerbatim).map((term) => term.en)).toEqual([
      'Information Regulator',
      'Certificate of Acceptability',
      'Small Claims Court',
    ]);
    const list = protectedTerms(loadTranslationTerms(termsPath));
    for (const name of [
      'SARS',
      'Consumer Protection Act',
      'Foodstuffs, Cosmetics and Disinfectants Act',
      'Information Regulator',
      'QUO-0001',
      'VAT 420',
    ]) {
      if (name === 'VAT 420') expect(list).not.toContain(name);
      else expect(list).toContain(name);
    }
    expect(list).not.toContain('ITR14');
    expect(protectedTerms(undefined)).toEqual([]);
    expect(loadTranslationTerms(translationTermsPath(repoRoot, 'zu'))).toBeUndefined();
  });
});

describe('STYLE-GUIDE-af.md', () => {
  it.each([
    'R2.3 miljoen',
    'R120,000',
    '15%',
    '**In gewone taal:**',
    'Ondersteun:',
    'Woorde wat in hierdie lêer gebruik word',
    '*Deur KI gegenereer',
    'kontrolelys',
    'Februarie',
    '**jy**',
    'pnpm content:fidelity --lang af --doc',
    'pnpm content:build --lang af',
    '--source-root af=',
    '[JOU BESIGHEIDSNAAM]',
    'TRANSLATION-NOTES.md',
    'Suspected fidelity false positives',
    'Handeldrywende as',
    '"handeldrywende as" ("trading as")',
    'Geen registrasie nodig nie',
    'artikel 4-toets',
    '**Eenmansaak (sole proprietor)**',
    '**Information Regulator (Inligtingsreguleerder)**',
    '**Small Claims Court (Kleineisehof)**',
    'ITR14-opgawes',
    'die Februarie 2026-begroting',
    'keep-verbatim',
    'line-breaks',
    'footer-date',
    '’n',
  ])('states %s', (text) => {
    expect(guide).toContain(text);
  });

  it('uses the typographic ’n in every example', () => {
    expect(guide).not.toMatch(STRAIGHT_N);
  });
});
