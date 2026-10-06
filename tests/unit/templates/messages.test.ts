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

  it('gives a quantity its own message for "1.500", in Afrikaans too (review pass 2, nit 2)', () => {
    const messages = numberMessages(useTranslations('af'), 'af', 'number');
    expect(messages['data-message-ambiguous']).toBe(
      'Dit kan op twee maniere gelees word. Skryf eenduisend vyfhonderd as 1500, of een en ’n half as 1.5.',
    );
    expect(messages['data-message-decimals']).toBe(messages['data-message-format']);
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
