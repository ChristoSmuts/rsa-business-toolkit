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
  it('throws when the route is a full or protocol-relative URL', () => {
    expect(() => alternateUrls('https://x.test/core/', ['en'], site, base)).toThrow(RangeError);
    expect(() => alternateUrls('mailto:x@y.test', ['en'], site, base)).toThrow(RangeError);
    expect(() => alternateUrls('//x.test/core/', ['en'], site, base)).toThrow(RangeError);
  });
  it('throws when the route has a dot segment, so every locale gets the same page', () => {
    for (const route of [
      '../core/',
      'core/./register/',
      'core/..',
      '%2e%2e/core/',
      'core/.%2E/x/',
    ]) {
      expect(() => alternateUrls(route, ['en', 'af'], site, base), route).toThrow(
        'without "." or ".." segments',
      );
    }
    expect(alternateUrls('core/.well/', ['af'], site, base)[0]?.href).toBe(
      'https://example.github.io/business-toolkit/af/core/.well/',
    );
  });
  it('throws when the route has a backslash, tab or line break, which new URL would rewrite', () => {
    for (const route of [
      'core/..\\..\\x/',
      'core\\register/',
      '\\core/',
      'core/%5c../x/',
      'core/%5C/x/',
      'core/.\t./x/',
      'core/.\n./x/',
      'core/.\r./x/',
    ]) {
      expect(() => alternateUrls(route, ['en', 'af'], site, base), JSON.stringify(route)).toThrow(
        'without backslashes, tabs or line breaks',
      );
    }
    expect(alternateUrls('core/%5b/', ['af'], site, base)[0]?.href).toBe(
      'https://example.github.io/business-toolkit/af/core/%5b/',
    );
  });
  it('normalises base like basePath()', () => {
    const expected = [
      'https://example.github.io/business-toolkit/core/',
      'https://example.github.io/business-toolkit/af/core/',
      'https://example.github.io/business-toolkit/core/',
    ];
    for (const root of ['/business-toolkit', 'business-toolkit/', '//business-toolkit//']) {
      const hrefs = alternateUrls('af/core/', ['en', 'af'], site, root).map((entry) => entry.href);
      expect(hrefs, root).toEqual(expected);
    }
    expect(alternateUrls('core/', ['af'], site, '')[0]?.href).toBe(
      'https://example.github.io/af/core/',
    );
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
  });
  it('reads a string that starts with // as a path, never as a host', () => {
    expect(switchLocaleUrl('//core/register/', 'af', '/')).toBe('/af/core/register/');
    expect(switchLocaleUrl('//a/b/af/x/', 'en', '/a/b/')).toBe('/a/b/x/');
    expect(switchLocaleUrl('//business-toolkit//af//core/?q=1#top', 'en', base)).toBe(
      '/business-toolkit/core/?q=1#top',
    );
    expect(switchLocaleUrl(new URL('https://x.test//af//core/'), 'en', '/')).toBe('/core/');
  });
  it('normalises base like basePath()', () => {
    for (const root of ['/business-toolkit', 'business-toolkit/', '//business-toolkit//']) {
      expect(switchLocaleUrl('/business-toolkit/core/', 'af', root), root).toBe(
        '/business-toolkit/af/core/',
      );
      expect(switchLocaleUrl('/business-toolkit/af/core/#x', 'en', root), root).toBe(
        '/business-toolkit/core/#x',
      );
    }
    expect(switchLocaleUrl('/af/core/', 'en', '')).toBe('/core/');
  });
  it('rejects the same shapes as alternateUrls, so the two contracts agree', () => {
    for (const current of [
      '/business-toolkit/core\\..\\..\\evil/',
      '/business-toolkit/core\\register/',
      '/\\evil.test/',
      '/business-toolkit/core/%5c../x/',
      '/business-toolkit/core/\t../evil/',
      '/business-toolkit/core/\n../evil/',
    ]) {
      expect(() => switchLocaleUrl(current, 'af', base), JSON.stringify(current)).toThrow(
        'without backslashes, tabs or line breaks',
      );
    }
    for (const current of [
      '/business-toolkit/af/../../evil/',
      '/business-toolkit/af/%2e%2e/evil/',
      '/business-toolkit/./core/',
      '/business-toolkit/core/.%2E/x/',
    ]) {
      expect(() => switchLocaleUrl(current, 'af', base), JSON.stringify(current)).toThrow(
        'without "." or ".." segments',
      );
    }
    // new URL resolves dot segments before the check, so an already-normalised URL is fine.
    expect(switchLocaleUrl('https://x.test/business-toolkit/a/../core/', 'af', base)).toBe(
      '/business-toolkit/af/core/',
    );
    expect(switchLocaleUrl(new URL('https://x.test/business-toolkit/a/../core/'), 'af', base)).toBe(
      '/business-toolkit/af/core/',
    );
    // A dot inside a segment is still a normal path.
    expect(switchLocaleUrl('/business-toolkit/core/.well/', 'af', base)).toBe(
      '/business-toolkit/af/core/.well/',
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
    expect(switchLocaleUrl('https://x.test/business-toolkit//af//core/', 'en', base)).toBe(
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

describe('switchLocaleUrl with a backslash outside the path', () => {
  const root = '/business-toolkit/';
  it('allows a backslash in the query or fragment, which cannot traverse', () => {
    expect(switchLocaleUrl('/business-toolkit/search/?q=C%5C', 'af', root)).toBe(
      '/business-toolkit/af/search/?q=C%5C',
    );
    expect(switchLocaleUrl('/business-toolkit/search/#C%5Cnotes', 'af', root)).toBe(
      '/business-toolkit/af/search/#C%5Cnotes',
    );
  });
  it('still refuses a backslash in the path itself', () => {
    expect(() => switchLocaleUrl('/business-toolkit/core%5C..%5Cx/?q=1', 'af', root)).toThrow(
      RangeError,
    );
  });
});
