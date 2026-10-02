/**
 * The facts the home page states itself (build plan B6 "Three numbers that changed in 2026", D5
 * "facts are shown with their date"). Every other fact on the site comes from the markdown.
 *
 * Each figure names the register entry that supports it. `tests/unit/site/home.test.ts` fails
 * when a figure is not in that entry's own "supports" text, or when the old figure is not the
 * one `start/start-here` names, so these strings cannot drift from the sourced content. Rand
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
}

export const HOME_NUMBERS: readonly HomeNumber[] = [
  {
    id: 'vat-compulsory',
    labelKey: 'home.threeNumbers.vatCompulsory',
    amount: 'R2.3 million',
    oldAmount: 'R1 million',
    from: '2026-04-01',
    sourceId: 'sars--what-is-the-new-threshold-for-vat-registration',
  },
  {
    id: 'vat-voluntary',
    labelKey: 'home.threeNumbers.vatVoluntary',
    amount: 'R120,000',
    oldAmount: 'R50,000',
    sourceId: 'sars--budget-2026-frequently-asked-questions',
  },
  {
    id: 'turnover-tax',
    labelKey: 'home.threeNumbers.turnoverTax',
    amount: 'R2.3 million',
    zeroBand: { rate: 0, amount: 'R600,000' },
    sourceId: 'sars--turnover-tax',
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
