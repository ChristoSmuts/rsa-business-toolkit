/**
 * The facts the home page states itself (build plan B6 "Three numbers that changed in 2026", D5
 * "facts are shown with their date"). Every other fact on the site comes from the markdown.
 *
 * Each figure names the register entry that supports it. `tests/unit/site/home.test.ts` fails
 * when the figure, the old figure or the date it applies from is not in that entry's own
 * "supports" text: the guide's text is never enough, because the card shows these under the
 * source's link and its Official badge (D5, reviews WP-20 passes 2 and 3). Rand
 * amounts are written exactly as the English markdown writes them; Afrikaans keeps them
 * byte-identical (CLAUDE.md).
 */
import type { TranslationKey } from '../i18n';
import type { SourcesFile } from './content/schema';

export interface HomeNumber {
  readonly id: string;
  readonly labelKey: TranslationKey;
  /** The figure as the markdown writes it. */
  readonly amount: string;
  /** The out-of-date figure many websites still quote, when the guide names one. */
  readonly oldAmount?: string | undefined;
  /** `YYYY-MM-DD` the figure applies from, when the source gives one. */
  readonly from?: string | undefined;
  /** The 0% band, for turnover tax. */
  readonly zeroBand?: { readonly rate: number; readonly amount: string } | undefined;
  /** Register entry id (`src/data/<lang>/sources.json`) that supports the figure. */
  readonly sourceId: string;
  /**
   * The words in that entry's "supports" text that state this figure. The test requires the amount,
   * the old amount and the date inside this one clause, so a date the entry gives for something
   * else ("from 2 March 2026", the interest rate) cannot pass for this figure's (review WP-20 p4).
   */
  readonly supportsClause: string;
}

export const HOME_NUMBERS: readonly HomeNumber[] = [
  {
    id: 'vat-compulsory',
    labelKey: 'home.threeNumbers.vatCompulsory',
    amount: 'R2.3 million',
    oldAmount: 'R1 million',
    from: '2026-04-01',
    sourceId: 'sars--what-is-the-new-threshold-for-vat-registration',
    supportsClause:
      'compulsory VAT registration threshold rose from R1 million to R2.3 million on 1 April 2026',
  },
  {
    id: 'vat-voluntary',
    labelKey: 'home.threeNumbers.vatVoluntary',
    amount: 'R120,000',
    // "Not R50,000" is left out: the guide says it, but no register entry does (review WP-20 pass 3).
    from: '2026-04-01',
    sourceId: 'sars--budget-2026-frequently-asked-questions',
    supportsClause: 'R120,000 voluntary from 1 April 2026',
  },
  {
    id: 'turnover-tax',
    labelKey: 'home.threeNumbers.turnoverTax',
    amount: 'R2.3 million',
    // The guide's "0% on the first R600,000" is not shown here: no register entry records it as
    // supported, and every figure on this card must be. Add `zeroBand` back once the register
    // cites an official source for the band (a `fix(content):` change, WP-47).
    sourceId: 'sars--turnover-tax',
    supportsClause: 'the R2.3 million threshold',
  },
];

/** The year the three numbers changed in, from the first dated figure. */
export const HOME_NUMBERS_YEAR = 2026;

export interface ResolvedHomeNumber extends HomeNumber {
  readonly sourceUrl: string;
  readonly sourceTitle: string;
  readonly official: boolean;
}

/**
 * Each figure with its source's link and title. Throws when the register has no entry for it or
 * the entry has no link, so the build fails instead of showing a number without its source.
 */
export function resolveHomeNumbers(sources: SourcesFile | undefined): ResolvedHomeNumber[] {
  return HOME_NUMBERS.map((item) => {
    const entry = sources?.entries.find((candidate) => candidate.id === item.sourceId);
    if (!entry?.url) {
      throw new Error(
        `Home figure ${item.id} cites register entry ${item.sourceId}, which has no link.`,
      );
    }
    return { ...item, sourceUrl: entry.url, sourceTitle: entry.title, official: entry.official };
  });
}

/**
 * "Four things that matter early" (build plan B6). Each item states a rule, so each links to the
 * section of the guide that states it with its sources (D5; review WP-20 pass 3).
 * `tests/unit/site/home.test.ts` fails when an anchor is gone or the page lists no sources.
 */
export const HOME_FOUR_THINGS: readonly {
  readonly labelKey: TranslationKey;
  readonly doc: string;
  readonly anchor: string;
}[] = [
  { labelKey: 'home.fourThings.bank', doc: 'core/register', anchor: 'business-bank-account' },
  { labelKey: 'home.fourThings.sars', doc: 'core/tax-and-sars', anchor: 'provisional-tax' },
  {
    labelKey: 'home.fourThings.licence',
    doc: 'core/what-you-need-to-sell-things',
    anchor: 'the-general-rule',
  },
  { labelKey: 'home.fourThings.records', doc: 'core/tax-and-sars', anchor: 'records' },
];
