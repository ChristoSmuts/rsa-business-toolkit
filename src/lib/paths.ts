/// <reference types="astro/client" />
import { DEFAULT_LOCALE, ENABLED_LOCALES, isEnabledLocale, type Locale } from '../i18n/locales';

/**
 * `ENABLED_LOCALES` is re-exported under its own name. The full list of all 11 languages is
 * `LOCALES` in `src/i18n/locales.ts`; this file has no export with that name, so an auto-import
 * cannot pick the wrong list.
 */
export { DEFAULT_LOCALE, ENABLED_LOCALES, type Locale };

/**
 * Base path, always with a leading and trailing slash. Every helper that takes a `base` argument
 * normalises it with this function, so `/business-toolkit`, `business-toolkit/` and
 * `/business-toolkit/` all behave the same. A base made only of slashes (`//`) is `/`.
 * Leading and trailing backslashes are stripped with the slashes, so a Windows-built base
 * cannot produce a `/\…` path, which a browser reads as a link to another host.
 */
export function basePath(raw: string = import.meta.env.BASE_URL ?? '/'): string {
  const inner = raw.replace(/^[/\\]+|[/\\]+$/g, '');
  return inner === '' ? '/' : `/${inner}/`;
}

export function isLocale(value: string | undefined): value is Locale {
  return isEnabledLocale(value);
}

/**
 * Build an internal URL that respects the GitHub Pages base path and the locale prefix.
 * `path` is site-relative, for example `core/register/` or `core/register/#popia`.
 * Leading slashes and backslashes are removed, so the result never starts with `//` or `/\`,
 * which a browser would read as a link to another host.
 */
export function href(locale: Locale, path = '', base: string = basePath()): string {
  const root = basePath(base);
  const hashIndex = path.indexOf('#');
  const pathPart = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
  let clean = pathPart.replace(/\/{2,}/g, '/').replace(/^[/\\]+/, '');
  if (clean !== '' && !clean.endsWith('/') && !/\.[a-z0-9]+$/i.test(clean)) clean += '/';
  const prefix = locale === DEFAULT_LOCALE ? '' : `${locale}/`;
  return `${root}${prefix}${clean}${hash}`;
}

function stripBase(pathname: string, root: string): string {
  if (pathname.startsWith(root)) return pathname.slice(root.length);
  if (`${pathname}/` === root) return '';
  return pathname.replace(/^\/+/, '');
}

/** Detect the locale from a pathname that may include the base path. */
export function localeFromPath(pathname: string, base: string = basePath()): Locale {
  const first = stripBase(pathname, basePath(base)).split('/')[0];
  return isLocale(first) && first !== DEFAULT_LOCALE ? first : DEFAULT_LOCALE;
}

/**
 * Strip base and locale prefix, returning the locale-independent route path.
 *
 * A pathname from outside the base keeps its own path, minus the leading slashes:
 * `routeFromPath('/other/x', '/business-toolkit/')` is `other/x`. That is deliberate, so a
 * language switch on a page served outside the configured base still produces a usable route
 * rather than throwing in the browser.
 */
export function routeFromPath(pathname: string, base: string = basePath()): string {
  const root = basePath(base);
  const rest = stripBase(pathname, root);
  const locale = localeFromPath(pathname, root);
  return locale === DEFAULT_LOCALE ? rest : rest.slice(locale.length + 1);
}
