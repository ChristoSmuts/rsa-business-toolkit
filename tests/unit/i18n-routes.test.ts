import { describe, expect, it } from 'vitest';
import { LOCALES } from '../../src/i18n/locales';
import { alternateUrls, localeStaticPaths, switchLocaleUrl } from '../../src/lib/i18n-routes';
import { basePath } from '../../src/lib/paths';

const base = '/business-toolkit/';
const site = 'https://example.github.io';
/** A known locale that is not routed yet, so the example keeps working when one is enabled. */
const planned = LOCALES.find((entry) => !entry.enabled)!.code;

describe('localeStaticPaths', () => {
  it('emits undefined for English and the code for other locales', () => {
    expect(localeStaticPaths()).toEqual([
      { params: { locale: undefined }, props: { locale: 'en' } },
      { params: { locale: 'af' }, props: { locale: 'af' } },
    ]);
  });
  it('returns fresh objects each call', () => {
    const first = localeStaticPaths();
    first[0]!.props.locale = 'af';
    expect(localeStaticPaths()[0]!.props.locale).toBe('en');
  });
});

describe('alternateUrls', () => {
  it('returns absolute hreflang URLs plus x-default', () => {
    expect(alternateUrls('core/register/', ['en', 'af'], site, base)).toEqual([
      {
        hreflang: 'en-ZA',
        href: 'https://example.github.io/business-toolkit/core/register/',
        locale: 'en',
      },
      {
        hreflang: 'af-ZA',
        href: 'https://example.github.io/business-toolkit/af/core/register/',
        locale: 'af',
      },
      {
        hreflang: 'x-default',
        href: 'https://example.github.io/business-toolkit/core/register/',
        locale: 'en',
      },
    ]);
  });
  it('handles the home page and a root base', () => {
    expect(alternateUrls('', ['en', 'af'], `${site}/`, '/').map((entry) => entry.href)).toEqual([
      'https://example.github.io/',
      'https://example.github.io/af/',
      'https://example.github.io/',
    ]);
  });
  it('keeps enabled-locale order and ignores unknown, planned and duplicate codes', () => {
    const entries = alternateUrls('glossary', ['af', planned, 'xx', 'en', 'af'], site, base);
    expect(entries.map((entry) => entry.hreflang)).toEqual(['en-ZA', 'af-ZA', 'x-default']);
  });
  it('leaves out x-default when English is not available', () => {
    expect(alternateUrls('glossary/', ['af'], site, base)).toEqual([
      {
        hreflang: 'af-ZA',
        href: 'https://example.github.io/business-toolkit/af/glossary/',
        locale: 'af',
      },
    ]);
    expect(alternateUrls('glossary/', [], site, base)).toEqual([]);
  });
  it('drops the query and hash from the route', () => {
    const [first] = alternateUrls('/search/?q=vat#results', ['en'], site, base);
    expect(first?.href).toBe('https://example.github.io/business-toolkit/search/');
  });
  it('removes a locale prefix from the route instead of doubling it', () => {
    const hrefs = (route: string, root = base) =>
      alternateUrls(route, ['en', 'af'], site, root).map((entry) => entry.href);
    const expected = [
      'https://example.github.io/business-toolkit/core/register/',
      'https://example.github.io/business-toolkit/af/core/register/',
      'https://example.github.io/business-toolkit/core/register/',
    ];
    expect(hrefs('af/core/register/')).toEqual(expected);
    expect(hrefs('/af/core/register/')).toEqual(expected);
    expect(hrefs('af/', '/')).toEqual([
      'https://example.github.io/',
      'https://example.github.io/af/',
      'https://example.github.io/',
    ]);
    expect(hrefs('africa/')[1]).toBe('https://example.github.io/business-toolkit/af/africa/');
  });
  it('throws when the route is a full URL', () => {
    expect(() => alternateUrls('https://x.test/core/', ['en'], site, base)).toThrow(RangeError);
    expect(() => alternateUrls('//x.test/core/', ['en'], site, base)).toThrow(RangeError);
  });
  it('accepts a URL for site and ignores any path on it', () => {
    const [first] = alternateUrls('sources', ['en'], new URL('https://x.test/ignored/'), base);
    expect(first?.href).toBe('https://x.test/business-toolkit/sources/');
  });
  it('uses the configured base by default', () => {
    const [first] = alternateUrls('about/', ['en'], site);
    expect(first?.href).toBe(new URL(`${basePath()}about/`, site).href);
  });
});

describe('switchLocaleUrl', () => {
  it('moves English to Afrikaans and keeps the anchor', () => {
    expect(switchLocaleUrl('/business-toolkit/core/register/#popia', 'af', base)).toBe(
      '/business-toolkit/af/core/register/#popia',
    );
  });
  it('moves Afrikaans to English', () => {
    expect(switchLocaleUrl('/business-toolkit/af/core/register/#popia', 'en', base)).toBe(
      '/business-toolkit/core/register/#popia',
    );
  });
  it('keeps the query string', () => {
    expect(switchLocaleUrl('/business-toolkit/search/?q=VAT264#top', 'af', base)).toBe(
      '/business-toolkit/af/search/?q=VAT264#top',
    );
    expect(switchLocaleUrl('/business-toolkit/af/search/?q=btw', 'en', base)).toBe(
      '/business-toolkit/search/?q=btw',
    );
  });
  it('handles home pages with and without a trailing slash', () => {
    expect(switchLocaleUrl('/business-toolkit/', 'af', base)).toBe('/business-toolkit/af/');
    expect(switchLocaleUrl('/business-toolkit/af/', 'en', base)).toBe('/business-toolkit/');
    expect(switchLocaleUrl('/business-toolkit/af', 'en', base)).toBe('/business-toolkit/');
    expect(switchLocaleUrl('/business-toolkit', 'af', base)).toBe('/business-toolkit/af/');
  });
  it('adds the trailing slash that routes need', () => {
    expect(switchLocaleUrl('/business-toolkit/core/register', 'af', base)).toBe(
      '/business-toolkit/af/core/register/',
    );
  });
  it('returns the same URL when the target is the current locale', () => {
    expect(switchLocaleUrl('/business-toolkit/af/glossary/#pis', 'af', base)).toBe(
      '/business-toolkit/af/glossary/#pis',
    );
  });
  it('accepts a URL object', () => {
    const url = new URL('https://example.github.io/business-toolkit/checklist/?print=1#part-a');
    expect(switchLocaleUrl(url, 'af', base)).toBe('/business-toolkit/af/checklist/?print=1#part-a');
  });
  it('accepts a full URL string such as location.href', () => {
    expect(
      switchLocaleUrl('https://x.test/business-toolkit/core/register/?q=1#popia', 'af', base),
    ).toBe('/business-toolkit/af/core/register/?q=1#popia');
    expect(switchLocaleUrl('HTTP://x.test/business-toolkit/af/', 'en', base)).toBe(
      '/business-toolkit/',
    );
    expect(switchLocaleUrl('//x.test/business-toolkit/af/glossary/', 'en', base)).toBe(
      '/business-toolkit/glossary/',
    );
  });
  it('throws for a relative path', () => {
    expect(() => switchLocaleUrl('core/register/', 'af', base)).toThrow(RangeError);
    expect(() => switchLocaleUrl('', 'af', base)).toThrow(RangeError);
  });
  it('throws for schemes other than http and https', () => {
    expect(() => switchLocaleUrl('mailto:someone@example.com', 'af', base)).toThrow(
      'Expected an http or https URL',
    );
    expect(() => switchLocaleUrl(new URL('javascript:alert(1)'), 'af', base)).toThrow(RangeError);
  });
  it('collapses repeated slashes before reading the locale', () => {
    expect(switchLocaleUrl('/business-toolkit//af//core/', 'en', base)).toBe(
      '/business-toolkit/core/',
    );
    expect(switchLocaleUrl('//x.test/business-toolkit//af//core/', 'en', base)).toBe(
      '/business-toolkit/core/',
    );
  });
  it('works at a root base', () => {
    expect(switchLocaleUrl('/af/templates/invoice/', 'en', '/')).toBe('/templates/invoice/');
    expect(switchLocaleUrl('/templates/invoice/', 'af', '/')).toBe('/af/templates/invoice/');
  });
  it('uses the configured base by default', () => {
    expect(switchLocaleUrl(`${basePath()}about/`, 'af')).toBe(`${basePath()}af/about/`);
  });
});
