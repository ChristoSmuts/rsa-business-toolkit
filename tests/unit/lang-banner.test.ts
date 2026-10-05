import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, ENABLED_LOCALES } from '../../src/i18n/locales';

/**
 * The language banner is shown before paint by a CSS rule per language (`LangBanner.astro`), so a
 * stale or unknown `st.lang` shows nothing. A language enabled without its rule would never get
 * its banner shown at first paint.
 */
describe('LangBanner first-paint rules', () => {
  const source = readFileSync(
    new URL('../../src/components/interactive/LangBanner.astro', import.meta.url),
    'utf8',
  );

  it('has a rule for every language the English home page can offer', () => {
    const missing = ENABLED_LOCALES.filter((code) => code !== DEFAULT_LOCALE).filter(
      (code) =>
        !source.includes(
          `:root[data-st-lang-offer='${code}'] .st-lang-banner[data-locale='${code}']`,
        ),
    );
    expect(missing).toEqual([]);
  });

  it('has no rule that shows every banner whatever the saved language', () => {
    expect(source).not.toMatch(/:root\[data-st-lang-offer\]\s/);
  });
});
