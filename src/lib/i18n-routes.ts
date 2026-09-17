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

/** A string that starts with a scheme: `https:`, `mailto:` and similar. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
/** A protocol-relative URL (`//host/…`). Only `alternateUrls` rejects this form. */
const PROTOCOL_RELATIVE = /^\/\//;
/**
 * A `.` or `..` path segment, also percent-encoded (`%2e`), which `new URL` would resolve.
 * Checked on the segments between slashes.
 */
const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i;
/**
 * A backslash (also percent-encoded, `%5c`), tab, carriage return or line feed. `new URL` treats
 * `\` as `/` and drops tabs and line breaks, so `core/..\..\x/` or `core/.<tab>./x/` would get past
 * the dot-segment check and resolve to a different page per locale.
 */
const UNSAFE_ROUTE_CHAR = /[\\\t\n\r]|%5c/i;

/**
 * The guard both helpers share, so `alternateUrls` and `switchLocaleUrl` reject the same shapes.
 * `raw` is the string the caller passed, `path` the path part after any `new URL` normalisation.
 */
function assertSafePath(raw: string, path: string, what: string): void {
  if (UNSAFE_ROUTE_CHAR.test(raw)) {
    throw new RangeError(`Expected ${what} without backslashes, tabs or line breaks: ${raw}`);
  }
  if (path.split('/').some((segment) => DOT_SEGMENT.test(segment))) {
    throw new RangeError(`Expected ${what} without "." or ".." segments: ${raw}`);
  }
}

function webUrlParts(url: URL): UrlParts {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RangeError(`Expected an http or https URL: ${url.href}`);
  }
  return { path: url.pathname, search: url.search, hash: url.hash };
}

function urlParts(current: string | URL): UrlParts {
  if (typeof current !== 'string') return webUrlParts(current);
  if (HAS_SCHEME.test(current)) return webUrlParts(new URL(current));
  if (!current.startsWith('/')) {
    throw new RangeError(`Expected a path that starts with "/", a full URL or a URL: ${current}`);
  }
  return splitSuffix(current);
}

/**
 * hreflang alternates for `<link rel="alternate">`.
 *
 * - `route` is site-relative, for example `core/register/` or `/core/register/`. Query and hash
 *   are dropped. A leading locale prefix (`af/core/register/`) is removed, so every locale gets
 *   one prefix.
 * - Only enabled locales listed in `availableLocales` are returned, in `ENABLED_LOCALES` order.
 *   Unknown or disabled codes are ignored.
 * - `x-default` points to the English URL and is added only when English is available.
 * - Any path on `site` is ignored. The base path comes from `base`, normalised with `basePath()`.
 * - Throws `RangeError` when `route` is a full URL (`https://…`, `mailto:…`), a protocol-relative
 *   URL (`//host/…`), has a `.` or `..` segment (also `%2e`), or contains a backslash (also
 *   `%5c`), a tab or a line break.
 */
export function alternateUrls(
  route: string,
  availableLocales: readonly string[],
  site: string | URL,
  base: string = basePath(),
): AlternateUrl[] {
  if (HAS_SCHEME.test(route) || PROTOCOL_RELATIVE.test(route)) {
    throw new RangeError(`Expected a site-relative route, not a full URL: ${route}`);
  }
  const { path } = splitSuffix(route);
  assertSafePath(route, path, 'a route');
  const root = basePath(base);
  const neutral = routeFromPath(`${root}${path.replace(/^\/+/, '')}`, root);
  const wanted = new Set(availableLocales);
  const locales = ENABLED_LOCALES.filter((locale) => wanted.has(locale));
  const absolute = (locale: Locale): string => new URL(href(locale, neutral, root), site).href;
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
 * a switch. The result is a path that starts with the base.
 * `switchLocaleUrl('/business-toolkit/core/register/#popia', 'af')` → `/business-toolkit/af/core/register/#popia`.
 *
 * `current` may be:
 * - a path that starts with `/`, such as `location.pathname + location.search + location.hash`.
 *   A path that starts with `//` is still a path (`//core/register/` is `/core/register/`),
 *   never a protocol-relative URL;
 * - a full `http:` or `https:` URL string that starts with its scheme, such as `location.href`;
 * - a `URL` object.
 *
 * Repeated slashes in the path are collapsed before the locale is read. `base` is normalised
 * with `basePath()`. Throws `RangeError` for a relative path such as `core/register/` or `''`,
 * and for schemes other than `http:` and `https:` (for example `mailto:`).
 *
 * The same guard as `alternateUrls` applies, so both helpers reject the same shapes: a backslash
 * (also `%5c`), a tab or a line break anywhere in a string `current`, and a `.` or `..` segment
 * (also `%2e`) in the path. A full URL string and a `URL` object are normalised by `new URL`
 * first, so `https://x.test/a/../b/` is the already-resolved `/b/` and is accepted.
 */
export function switchLocaleUrl(
  current: string | URL,
  targetLocale: Locale,
  base: string = basePath(),
): string {
  const root = basePath(base);
  const { path, search, hash } = urlParts(current);
  // Only the path can traverse. A query or fragment may legitimately hold a backslash, for example a
  // search for `C:`, so it is not checked.
  const rawPath = typeof current === 'string' ? (current.split(/[?#]/, 1)[0] ?? '') : path;
  assertSafePath(rawPath, path, 'a path');
  const route = routeFromPath(path.replace(/\/{2,}/g, '/'), root);
  return `${href(targetLocale, route, root)}${search}${hash}`;
}
