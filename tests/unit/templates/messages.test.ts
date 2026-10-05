import { describe, expect, it } from 'vitest';
import { useTranslations } from '../../../src/i18n';
import { fieldId, lineNames } from '../../../src/lib/templates/ids';
import { numberMessages } from '../../../src/lib/templates/messages';

describe('numberMessages', () => {
  it('gives an amount field a message for each problem, with the limit', () => {
    const messages = numberMessages(useTranslations('en'), 'en', 'money');
    expect(messages['data-message-ambiguous']).toContain('1 500.50');
    expect(messages['data-message-decimals']).toContain('two decimals');
    expect(messages['data-message-too-large']).toBe(
      'This is more than the form can work with. The most is R 1 000 000 000.00.',
    );
  });

  it('gives a quantity one message for every reading problem, in Afrikaans too', () => {
    const messages = numberMessages(useTranslations('af'), 'af', 'number');
    expect(messages['data-message-ambiguous']).toBe(messages['data-message-format']);
    expect(messages['data-message-format']).toContain('Skryf dit soos 2');
    expect(messages['data-message-too-large']).toContain('1 000 000');
  });
});

describe('ids', () => {
  it('builds ids a selector and a fragment can use', () => {
    expect(fieldId('intro.4:r0')).toBe('st-tf-intro-4-r0');
    expect(lineNames(2)).toEqual({
      description: 'lines.2.description',
      quantity: 'lines.2.quantity',
      unitPrice: 'lines.2.unitPrice',
    });
  });
});
