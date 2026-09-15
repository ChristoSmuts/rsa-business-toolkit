/**
 * Route helpers for `src/pages/[...locale]/…` pages.
 * English is unprefixed (`/core/register/`), other enabled locales get a prefix (`/af/core/register/`).
 */
import { DEFAULT_LOCALE, ENABLED_LOCALES, getLocale, type Locale } from '../i18n/locales';
import { basePath, href, routeFromPath } from './paths';

export interface LocaleStaticPath {
  params: { locale: string | undefined };
  props: { locale: Locale };
}

/**
 * `getStaticPaths` entries for a `[...locale]` route:
 * `[{ params: { locale: undefined }, props: { locale: 'en' } }, { params: { locale: 'af' }, props: { locale: 'af' } }]`.
 * Pages with more params spread these into their own entries.
 */
export function localeStaticPaths(): LocaleStaticPath[] {
  return ENABLED_LOCALES.map((locale) => ({
    params: { locale: locale === DEFAULT_LOCALE ? undefined : locale },
    props: { locale },
  }));
}

export interface AlternateUrl {
  /** `en-ZA`, `af-ZA` or `x-default`. */
  hreflang: string;
  /** Absolute URL. */
  href: string;
  locale: Locale;
}

interface UrlParts {
  path: string;
  search: string;
  hash: string;
}

function splitSuffix(value: string): UrlParts {
  const hashIndex = value.indexOf('#');
  const hash = hashIndex === -1 ? '' : value.slice(hashIndex);
  const beforeHash = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  const search = queryIndex === -1 ? '' : beforeHash.slice(queryIndex);
  const path = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  return { path, search, hash };
}

/** `https:`, `mailto:` and similar. Also `//host/…` (protocol-relative). */
const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function webUrlParts(url: URL): UrlParts {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RangeError(`Expected an http or https URL: ${url.href}`);
  }
  return { path: url.pathname, search: url.search, hash: url.hash };
}

function urlParts(current: string | URL): UrlParts {
  if (typeof current !== 'string') return webUrlParts(current);
  if (ABSOLUTE_URL.test(current)) return webUrlParts(new URL(current, 'https://localhost'));
  if (!current.startsWith('/')) {
    throw new RangeError(`Expected a path that starts with "/", a full URL or a URL: ${current}`);
  }
  return splitSuffix(current);
}

/**
 * hreflang alternates for `<link rel="alternate">`.
 *
 * - `route` is site-relative, for example `core/register/`. Query and hash are dropped.
 *   A leading locale prefix (`af/core/register/`) is removed, so every locale gets one prefix.
 * - Only enabled locales listed in `availableLocales` are returned, in `ENABLED_LOCALES` order.
 *   Unknown or disabled codes are ignored.
 * - `x-default` points to the English URL and is added only when English is available.
 * - Any path on `site` is ignored. The base path comes from `base`.
 * - Throws `RangeError` when `route` is a full URL (`https://…`, `//host/…`).
 */
export function alternateUrls(
  route: string,
  availableLocales: readonly string[],
  site: string | URL,
  base: string = basePath(),
): AlternateUrl[] {
  if (ABSOLUTE_URL.test(route)) {
    throw new RangeError(`Expected a site-relative route, not a full URL: ${route}`);
  }
  const { path } = splitSuffix(route);
  const neutral = routeFromPath(`${base}${path.replace(/^\/+/, '')}`, base);
  const wanted = new Set(availableLocales);
  const locales = ENABLED_LOCALES.filter((locale) => wanted.has(locale));
  const absolute = (locale: Locale): string => new URL(href(locale, neutral, base), site).href;
  const entries: AlternateUrl[] = locales.map((locale) => ({
    hreflang: getLocale(locale)?.hreflang ?? locale,
    href: absolute(locale),
    locale,
  }));
  if (locales.includes(DEFAULT_LOCALE)) {
    entries.push({ hreflang: 'x-default', href: absolute(DEFAULT_LOCALE), locale: DEFAULT_LOCALE });
  }
  return entries;
}

/**
 * The same page in another language, keeping the query string and the hash, so anchors survive
 * a switch. `current` may be a path (`location.pathname + location.search + location.hash`),
 * a full URL string (`location.href`) or a `URL`. The result is a path that starts with the base.
 * `switchLocaleUrl('/business-toolkit/core/register/#popia', 'af')` → `/business-toolkit/af/core/register/#popia`.
 * Repeated slashes in the path are collapsed before the locale is read.
 * Throws `RangeError` for a relative path such as `core/register/` and for schemes other than
 * `http:` and `https:` (for example `mailto:`).
 */
export function switchLocaleUrl(
  current: string | URL,
  targetLocale: Locale,
  base: string = basePath(),
): string {
  const { path, search, hash } = urlParts(current);
  const route = routeFromPath(path.replace(/\/{2,}/g, '/'), base);
  return `${href(targetLocale, route, base)}${search}${hash}`;
}
