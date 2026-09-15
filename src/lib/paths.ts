import { DEFAULT_LOCALE, ENABLED_LOCALES, isEnabledLocale, type Locale } from '../i18n/locales';

export { DEFAULT_LOCALE, type Locale };

/** Enabled locale codes. The list itself lives in `src/i18n/locales.ts`. */
export const LOCALES: readonly Locale[] = ENABLED_LOCALES;

/** Base path, always with a leading and trailing slash. */
export function basePath(raw: string = import.meta.env.BASE_URL ?? '/'): string {
  if (!raw || raw === '/') return '/';
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

export function isLocale(value: string | undefined): value is Locale {
  return isEnabledLocale(value);
}

/**
 * Build an internal URL that respects the GitHub Pages base path and the locale prefix.
 * `path` is site-relative, for example `core/register/` or `core/register/#popia`.
 */
export function href(locale: Locale, path = '', base: string = basePath()): string {
  const hashIndex = path.indexOf('#');
  const pathPart = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
  let clean = pathPart.replace(/\/{2,}/g, '/').replace(/^\/+/, '');
  if (clean !== '' && !clean.endsWith('/') && !/\.[a-z0-9]+$/i.test(clean)) clean += '/';
  const prefix = locale === DEFAULT_LOCALE ? '' : `${locale}/`;
  return `${base}${prefix}${clean}${hash}`;
}

function stripBase(pathname: string, base: string): string {
  if (pathname.startsWith(base)) return pathname.slice(base.length);
  if (`${pathname}/` === base) return '';
  return pathname.replace(/^\/+/, '');
}

/** Detect the locale from a pathname that may include the base path. */
export function localeFromPath(pathname: string, base: string = basePath()): Locale {
  const first = stripBase(pathname, base).split('/')[0];
  return isLocale(first) && first !== DEFAULT_LOCALE ? first : DEFAULT_LOCALE;
}

/** Strip base and locale prefix, returning the locale-independent route path. */
export function routeFromPath(pathname: string, base: string = basePath()): string {
  const rest = stripBase(pathname, base);
  const locale = localeFromPath(pathname, base);
  return locale === DEFAULT_LOCALE ? rest : rest.slice(locale.length + 1);
}
