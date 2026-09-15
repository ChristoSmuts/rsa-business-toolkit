/**
 * Single source of locale metadata for the whole app.
 *
 * Used by `astro.config.ts` (i18n routing and sitemap), `src/lib/paths.ts` (URL building),
 * `src/lib/i18n-routes.ts` (static paths and hreflang) and the language switcher.
 *
 * Keep this file free of `import.meta.env` and of Astro or Vite imports: `astro.config.ts`
 * imports it before Vite is running.
 */

/** How far the content (the 36 documents) is translated. The UI dictionary is tracked separately. */
export type LocaleStatus = 'complete' | 'partial' | 'planned';

export interface LocaleMeta {
  /** ISO 639 code, also the URL prefix (`/af/`). */
  readonly code: string;
  /** Language name in English. */
  readonly name: string;
  /** Language name in the language itself, as shown in the switcher. */
  readonly nativeName: string;
  /** BCP 47 tag for `hreflang`, `<html lang>` and `Intl`. */
  readonly hreflang: string;
  readonly dir: 'ltr' | 'rtl';
  readonly status: LocaleStatus;
  /** `true` when `src/i18n/<code>.json` exists with the full key set. */
  readonly uiDictionary: boolean;
  /** `true` when the locale is routed and built. Requires `uiDictionary: true`. */
  readonly enabled: boolean;
}

/** All 11 official South African languages, in the order the switcher shows them. */
export const LOCALES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    hreflang: 'en-ZA',
    dir: 'ltr',
    status: 'complete',
    uiDictionary: true,
    enabled: true,
  },
  {
    code: 'af',
    name: 'Afrikaans',
    nativeName: 'Afrikaans',
    hreflang: 'af-ZA',
    dir: 'ltr',
    status: 'partial',
    uiDictionary: true,
    enabled: true,
  },
  {
    code: 'zu',
    name: 'Zulu',
    nativeName: 'isiZulu',
    hreflang: 'zu-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
  {
    code: 'xh',
    name: 'Xhosa',
    nativeName: 'isiXhosa',
    hreflang: 'xh-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
  {
    code: 'st',
    name: 'Southern Sotho',
    nativeName: 'Sesotho',
    hreflang: 'st-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
  {
    code: 'tn',
    name: 'Tswana',
    nativeName: 'Setswana',
    hreflang: 'tn-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
  {
    code: 'nso',
    name: 'Northern Sotho',
    nativeName: 'Sesotho sa Leboa',
    hreflang: 'nso-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
  {
    code: 'ts',
    name: 'Tsonga',
    nativeName: 'Xitsonga',
    hreflang: 'ts-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
  {
    code: 'ss',
    name: 'Swati',
    nativeName: 'siSwati',
    hreflang: 'ss-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
  {
    code: 've',
    name: 'Venda',
    nativeName: 'Tshivenḓa',
    hreflang: 've-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
  {
    code: 'nr',
    name: 'Southern Ndebele',
    nativeName: 'isiNdebele',
    hreflang: 'nr-ZA',
    dir: 'ltr',
    status: 'planned',
    uiDictionary: false,
    enabled: false,
  },
] as const satisfies readonly LocaleMeta[];

type LocaleEntry = (typeof LOCALES)[number];
type EnabledEntry = Extract<LocaleEntry, { enabled: true }>;

/** Any of the 11 language codes, enabled or not. */
export type LocaleCode = LocaleEntry['code'];

/** A locale that is routed and built. Derived from `enabled: true` above. */
export type Locale = EnabledEntry['code'];

export const DEFAULT_LOCALE: Locale = 'en';

/** Enabled locale codes in switcher order. */
export const ENABLED_LOCALES: readonly Locale[] = LOCALES.filter(
  (entry): entry is EnabledEntry => entry.enabled,
).map((entry) => entry.code);

export function isEnabledLocale(value: string | null | undefined): value is Locale {
  return (ENABLED_LOCALES as readonly string[]).includes(value ?? '');
}

/** Metadata for a known code, enabled or not. Returns `undefined` for unknown codes. */
export function getLocale(code: string): LocaleMeta | undefined {
  return LOCALES.find((entry) => entry.code === code);
}

/** `{ en: 'en-ZA', af: 'af-ZA' }`, the shape `@astrojs/sitemap` expects for `i18n.locales`. */
export function sitemapLocales(): Record<string, string> {
  return Object.fromEntries(
    LOCALES.filter((entry) => entry.enabled).map((entry) => [entry.code, entry.hreflang]),
  );
}
