import { describe, expect, it } from 'vitest';
import { basePath, href, localeFromPath, routeFromPath } from '../../src/lib/paths';

const base = '/business-toolkit/';

describe('basePath', () => {
  it('normalises slashes', () => {
    expect(basePath('business-toolkit')).toBe('/business-toolkit/');
    expect(basePath('/business-toolkit')).toBe('/business-toolkit/');
    expect(basePath('//business-toolkit//')).toBe('/business-toolkit/');
    expect(basePath('/')).toBe('/');
    expect(basePath('')).toBe('/');
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
});

describe('localeFromPath and routeFromPath', () => {
  it('detects locales', () => {
    expect(localeFromPath('/business-toolkit/af/core/register/', base)).toBe('af');
    expect(localeFromPath('/business-toolkit/core/register/', base)).toBe('en');
    expect(localeFromPath('/business-toolkit/africa/', base)).toBe('en');
    expect(localeFromPath('/business-toolkit', base)).toBe('en');
  });
  it('strips base and locale', () => {
    expect(routeFromPath('/business-toolkit/af/core/register/', base)).toBe('core/register/');
    expect(routeFromPath('/business-toolkit/core/register/', base)).toBe('core/register/');
    expect(routeFromPath('/business-toolkit/af/', base)).toBe('');
  });
});
