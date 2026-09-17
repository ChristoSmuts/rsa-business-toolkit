import { describe, expect, it } from 'vitest';
import { ENABLED_LOCALES as ENABLED_IN_LOCALES_TS, LOCALES } from '../../src/i18n/locales';
import * as paths from '../../src/lib/paths';
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  basePath,
  href,
  isLocale,
  localeFromPath,
  routeFromPath,
} from '../../src/lib/paths';

const base = '/business-toolkit/';
/** A known locale that is not routed yet, so the example keeps working when one is enabled. */
const planned = LOCALES.find((entry) => !entry.enabled)!.code;

describe('locale list', () => {
  it('comes from src/i18n/locales.ts', () => {
    expect(ENABLED_LOCALES).toBe(ENABLED_IN_LOCALES_TS);
    expect([...ENABLED_LOCALES]).toEqual(['en', 'af']);
    expect(DEFAULT_LOCALE).toBe('en');
  });
  it('has no second export called LOCALES', () => {
    expect(Object.keys(paths)).not.toContain('LOCALES');
  });
  it('accepts only enabled locales', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('af')).toBe(true);
    expect(isLocale(planned)).toBe(false);
    expect(isLocale('AF')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
  it('does not treat a planned locale prefix as a locale', () => {
    expect(localeFromPath(`/business-toolkit/${planned}/core/`, base)).toBe('en');
    expect(routeFromPath(`/business-toolkit/${planned}/core/`, base)).toBe(`${planned}/core/`);
  });
});

describe('basePath', () => {
  it('normalises slashes', () => {
    expect(basePath('business-toolkit')).toBe('/business-toolkit/');
    expect(basePath('/business-toolkit')).toBe('/business-toolkit/');
    expect(basePath('//business-toolkit//')).toBe('/business-toolkit/');
    expect(basePath('/')).toBe('/');
    expect(basePath('')).toBe('/');
    expect(basePath('//')).toBe('/');
    expect(basePath('///')).toBe('/');
  });
  it('strips backslashes too, so a Windows-built base cannot leave the site', () => {
    expect(basePath('\\business-toolkit\\')).toBe('/business-toolkit/');
    expect(basePath('\\\\')).toBe('/');
    expect(href('af', 'core/', '\\business-toolkit\\')).toBe('/business-toolkit/af/core/');
  });
  it('never builds a protocol-relative link from a slash-only base', () => {
    expect(href('af', 'core/', '//')).toBe('/af/core/');
    expect(href('en', '', '///')).toBe('/');
  });
  it('is applied to the base argument of every helper', () => {
    expect(href('af', 'core/', '/business-toolkit')).toBe('/business-toolkit/af/core/');
    expect(href('en', 'core/', 'business-toolkit/')).toBe('/business-toolkit/core/');
    expect(href('af', '', '')).toBe('/af/');
    expect(localeFromPath('/business-toolkit/af/', 'business-toolkit')).toBe('af');
    expect(routeFromPath('/business-toolkit/af/core/', '/business-toolkit')).toBe('core/');
  });
});

describe('href', () => {
  it('leaves English unprefixed', () => {
    expect(href('en', 'core/register', base)).toBe('/business-toolkit/core/register/');
  });
  it('prefixes Afrikaans', () => {
    expect(href('af', 'core/register/', base)).toBe('/business-toolkit/af/core/register/');
  });
  it('keeps anchors after the trailing slash', () => {
    expect(href('en', 'core/register#popia', base)).toBe('/business-toolkit/core/register/#popia');
  });
  it('handles the home page', () => {
    expect(href('en', '', base)).toBe('/business-toolkit/');
    expect(href('af', '', base)).toBe('/business-toolkit/af/');
  });
  it('does not add a slash to files', () => {
    expect(href('en', 'sitemap-index.xml', base)).toBe('/business-toolkit/sitemap-index.xml');
  });
  it('works at a root base', () => {
    expect(href('af', '/glossary/', '/')).toBe('/af/glossary/');
  });
  it('collapses repeated slashes', () => {
    expect(href('en', '///core//register', base)).toBe('/business-toolkit/core/register/');
  });
  it('removes leading backslashes, so the link cannot point to another host', () => {
    expect(href('en', '\\evil.test/', '/')).toBe('/evil.test/');
    expect(href('en', '/\\/evil.test/', '/')).toBe('/evil.test/');
    expect(href('af', '\\\\evil.test/', base)).toBe('/business-toolkit/af/evil.test/');
  });
});

describe('localeFromPath and routeFromPath', () => {
  it('detects locales', () => {
    expect(localeFromPath('/business-toolkit/af/core/register/', base)).toBe('af');
    expect(localeFromPath('/business-toolkit/core/register/', base)).toBe('en');
    expect(localeFromPath('/business-toolkit/africa/', base)).toBe('en');
    expect(localeFromPath('/business-toolkit', base)).toBe('en');
  });
  it('keeps a path from outside the base as its own route, by design', () => {
    expect(routeFromPath('/other/x', base)).toBe('other/x');
    expect(localeFromPath('/other/af/x', base)).toBe('en');
  });
  it('strips base and locale', () => {
    expect(routeFromPath('/business-toolkit/af/core/register/', base)).toBe('core/register/');
    expect(routeFromPath('/business-toolkit/core/register/', base)).toBe('core/register/');
    expect(routeFromPath('/business-toolkit/af/', base)).toBe('');
  });
});
