/**
 * The messages a number field shows when what was typed cannot be used (review WP-32 pass 1,
 * blocker 1 and major 3), as `data-*` attributes for `<st-template-form>`, which picks one by the
 * problem `readNumber` reports. Build-time only: the page renders them; the script never sees the
 * dictionary.
 */
import { formatNumber, formatRand, type Translator } from '../../i18n';
import type { Locale } from '../../i18n/locales';
import { MAX_AMOUNT_CENTS, MAX_QUANTITY } from './totals';

/** How an amount is written in an example: the same digits in every language. */
export const AMOUNT_EXAMPLE = '1 500.50';
export const QUANTITY_EXAMPLE = '2';

export function numberMessages(
  t: Translator,
  locale: Locale,
  kind: 'money' | 'number',
): Record<string, string> {
  const example = kind === 'money' ? AMOUNT_EXAMPLE : QUANTITY_EXAMPLE;
  const max =
    kind === 'money'
      ? formatRand(locale, MAX_AMOUNT_CENTS / 100)
      : formatNumber(locale, MAX_QUANTITY);
  const format = t('templates.notANumber', { example });
  return {
    'data-message-format': format,
    'data-message-ambiguous': kind === 'money' ? t('templates.ambiguous', { example }) : format,
    'data-message-decimals':
      kind === 'money' ? t('templates.tooManyDecimals', { example }) : format,
    'data-message-too-large': t('templates.tooLarge', { max }),
  };
}
