/**
 * Typed UI string helpers. See `docs/i18n.md`.
 *
 * - `t(locale, key, params)` looks up a dot-path key, picks a plural form when the value is a
 *   plural object, and replaces `{param}` placeholders.
 * - Keys are checked at compile time against `en.json`, so a typo fails `pnpm typecheck`.
 * - Parameters are checked at compile time too: a key with `{title}` needs `{ title }`, and
 *   `count` must be a number. The names come from `ParamNames` below, which a test keeps in step
 *   with `en.json`.
 * - A key missing from a non-English dictionary falls back to English. In dev (and in tests) a
 *   `console.warn` explains what happened. Production builds stay silent.
 */
import af from './af.json';
import en from './en.json';
import { DEFAULT_LOCALE, getLocale, type Locale, type LocaleCode } from './locales';

/** The canonical dictionary shape, inferred from `en.json`. */
export type Dict = typeof en;

/** Top-level dictionary groups, for example `'search'` or `'prompts'`. */
export type DictGroup = keyof Dict;

export type PluralCategory = Intl.LDMLPluralRule;

/** A plural value: `{ "one": "{count} result", "other": "{count} results" }`. `other` is required. */
export type PluralForms = Partial<Record<PluralCategory, string>> & { readonly other: string };

/**
 * Parameter values. Numbers are inserted with `String()`, never regrouped.
 * `count` selects the plural form, so it must be a number.
 */
export type Params = Readonly<Record<string, string | number>> & { readonly count?: number };

/** Any dictionary subtree, used for runtime lookups. */
export interface DictTree {
  readonly [key: string]: string | DictTree;
}

type KeyPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends { other: string }
      ? `${Prefix}${K}`
      : KeyPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every valid dot-path key, for example `'nav.skipLink'` or `'search.results'`. */
export type TranslationKey = KeyPaths<Dict>;

/** Keys inside the given groups, for translators built from `pick()`. */
export type KeyIn<G extends DictGroup> = Extract<TranslationKey, `${G}.${string}`>;

/*
 * The `{param}` names of every key that has placeholders, generated from `en.json`.
 * JSON imports have no literal string types, so TypeScript cannot read the names itself.
 * Do not edit by hand. After changing placeholders in `en.json`, run:
 *   pnpm exec cross-env I18N_UPDATE_TYPES=1 vitest run --project unit tests/unit/i18n.test.ts -t ParamNames
 *   pnpm exec prettier --write src/i18n/index.ts
 * The same test fails when this list is out of date.
 */
// @generated-start param-names
interface ParamNames {
  'site.checkedOn': 'date';
  'site.titleTemplate': 'page' | 'section' | 'site';
  'site.titleTemplateShort': 'page' | 'site';
  'site.updatedNotice': 'date';
  'nav.pathProgress': 'done' | 'total';
  'nav.sectionToggle': 'section';
  'nav.onThisPageCount': 'count';
  'nav.previous': 'title';
  'nav.next': 'title';
  'lang.switchTo': 'language';
  'lang.continueBanner.message': 'language';
  'lang.continueBanner.action': 'language';
  'lang.fallbackNotice.body': 'language';
  'home.heroVerify': 'date';
  'home.findMyPathHint': 'total';
  'home.whereToStart.fiveMinutes.title': 'minutes';
  'home.businessTypes.openType': 'name';
  'home.threeNumbers.heading': 'year';
  'home.threeNumbers.turnoverTaxZero': 'amount' | 'rate';
  'home.threeNumbers.notOld': 'amount';
  'home.threeNumbers.from': 'date';
  'home.threeNumbers.officialSourceFor': 'name';
  'home.trust.checked': 'date';
  'home.yourPath.continue': 'n' | 'total';
  'section.startWithNamed': 'title';
  'section.docCount': 'count';
  'section.pageNumber': 'n' | 'total';
  'section.pagesLabel': 'section';
  'businessTypesHub.effortMeter': 'level' | 'name';
  'doc.readTime': 'minutes';
  'doc.effort': 'level';
  'doc.showNamed': 'name';
  'doc.hideNamed': 'name';
  'doc.verifiedOn': 'date';
  'doc.hiddenSections': 'count';
  'doc.showHiddenSections': 'count';
  'doc.hiddenFor.businessTypes': 'types';
  'doc.showHiddenNamed': 'title';
  'doc.copyLinkTo': 'heading';
  'doc.tableRegion': 'caption';
  'doc.related.item': 'name';
  'doc.checklistCompleteNamed': 'title';
  'wizard.intro': 'total';
  'wizard.stepOf': 'n' | 'total';
  'wizard.stepHeading': 'n' | 'title' | 'total';
  'wizard.types.effort': 'level';
  'wizard.stage.ptyGrowingDisabled': 'step';
  'myPath.empty.body': 'total';
  'myPath.progress': 'done' | 'total';
  'myPath.stepLabel': 'n';
  'myPath.readStep': 'n' | 'title';
  'myPath.markDoneNamed': 'title';
  'myPath.markNotDoneNamed': 'title';
  'checklist.progress': 'done' | 'total';
  'checklist.partProgress': 'done' | 'part' | 'total';
  'checklist.hiddenItems': 'count';
  'checklist.tickedOn': 'date';
  'templates.openNamed': 'name';
  'templates.fields.tradingAsLine': 'company' | 'number';
  'templates.fields.customerVatNumberHint': 'amount';
  'templates.fields.numberHint': 'example';
  'templates.privacy.removeListItem': 'text';
  'templates.removeLine': 'description';
  'templates.vat': 'rate';
  'templates.requiredItems': 'present' | 'total';
  'templates.missing': 'list';
  'templates.required.taxInvoice.heading': 'total';
  'templates.required.taxInvoice.lead': 'amount';
  'templates.required.thresholds.none': 'amount';
  'templates.required.thresholds.abridged': 'from' | 'to';
  'templates.required.thresholds.full': 'amount';
  'templates.required.issueWithin': 'days';
  'templates.startNextDone': 'number';
  'validation.summaryCount': 'count';
  'validation.goToField': 'field';
  'validation.required': 'field';
  'validation.email': 'example';
  'validation.number': 'example';
  'prompts.copyNamed': 'n' | 'title';
  'prompts.copiedNamed': 'n';
  'prompts.fillFromProfileNamed': 'n';
  'prompts.undoFillNamed': 'n';
  'prompts.placeholdersRemaining': 'count';
  'prompts.showFullNamed': 'title';
  'prompts.showLessNamed': 'title';
  'prompts.promptLabel': 'n' | 'title';
  'search.resultsFor': 'query';
  'search.noResults': 'query';
  'search.results': 'count';
  'search.groupLabel': 'section';
  'search.resultPath': 'doc' | 'heading';
  'search.resultKind': 'kind' | 'title';
  'contents.docSections': 'title';
  'glossary.termCount': 'count';
  'glossary.letterLink': 'letter';
  'glossary.letterEmpty': 'letter';
  'glossary.copyLinkTo': 'term';
  'glossary.noMatches': 'query';
  'sources.count': 'count';
  'sources.copyLinkTo': 'title';
  'sources.noMatches': 'query';
  'designSystem.contrast': 'ratio';
  'notFound.suggestion': 'title';
  'a11y.progress': 'percent';
  'date.format': 'day' | 'month' | 'year';
  'common.closeNamed': 'name';
  'common.dismissNamed': 'name';
  'common.minutes': 'count';
}
// @generated-end param-names

type ParamValue<N extends string> = N extends 'count' ? number : string | number;

/** The parameters a key needs, from its placeholders in `en.json`. */
export type ParamsFor<K extends TranslationKey> = K extends keyof ParamNames
  ? { readonly [N in ParamNames[K]]: ParamValue<N> }
  : Params;

/** The arguments after the key: required for keys with placeholders, optional otherwise. */
export type ParamArgs<K extends TranslationKey> = K extends keyof ParamNames
  ? [params: ParamsFor<K>]
  : [params?: Params];

export type Translator<K extends TranslationKey = TranslationKey> = <Key extends K>(
  key: Key,
  ...params: ParamArgs<Key>
) => string;

const ENGLISH: DictTree = en;

/**
 * Every UI dictionary by language code. Register `<code>.json` here when its `uiDictionary`
 * flag in `locales.ts` is set, even before the locale is enabled.
 */
const DICTIONARIES: Readonly<Partial<Record<LocaleCode, DictTree>>> = { en, af };

/** Codes of the registered UI dictionaries. A test compares this with `uiDictionary` flags. */
export function dictionaryCodes(): LocaleCode[] {
  return Object.keys(DICTIONARIES) as LocaleCode[];
}

export const PLURAL_CATEGORIES: readonly PluralCategory[] = [
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
];

function isDev(): boolean {
  return import.meta.env?.DEV === true;
}

function warn(message: string): void {
  if (isDev()) console.warn(`[i18n] ${message}`);
}

/** `true` for an object whose keys are all CLDR plural categories and that has `other`. */
export function isPluralForms(value: unknown): value is PluralForms {
  if (typeof value !== 'object' || value === null) return false;
  const entries = Object.entries(value);
  return (
    typeof (value as { other?: unknown }).other === 'string' &&
    entries.every(
      ([key, form]) =>
        (PLURAL_CATEGORIES as readonly string[]).includes(key) && typeof form === 'string',
    )
  );
}

function isLeaf(value: string | DictTree | undefined): value is string | PluralForms {
  return typeof value === 'string' || isPluralForms(value);
}

function lookup(tree: DictTree | undefined, key: string): string | DictTree | undefined {
  let node: string | DictTree | undefined = tree;
  for (const part of key.split('.')) {
    // Plural objects are leaves: `search.results.one` is not a key.
    if (
      node === undefined ||
      typeof node === 'string' ||
      isPluralForms(node) ||
      !Object.hasOwn(node, part)
    ) {
      return undefined;
    }
    node = node[part];
  }
  return node;
}

function sameShape(a: string | PluralForms, b: string | PluralForms): boolean {
  return typeof a === typeof b;
}

const PARAM_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

/** Replace `{name}` placeholders. Unknown placeholders stay in the text and warn in dev. */
export function interpolate(template: string, params: Params = {}): string {
  return template.replace(PARAM_PATTERN, (match, name: string) => {
    if (Object.hasOwn(params, name)) return String(params[name]);
    warn(`Missing parameter "{${name}}" in "${template}"`);
    return match;
  });
}

const pluralRulesCache = new Map<string, Intl.PluralRules>();

/** Pick the plural form for `count` with `Intl.PluralRules`. Falls back to `other`. */
export function selectPlural(locale: LocaleCode, forms: PluralForms, count: number): string {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(getLocale(locale)?.hreflang ?? locale);
    pluralRulesCache.set(locale, rules);
  }
  return forms[rules.select(count)] ?? forms.other;
}

function render(
  locale: LocaleCode,
  key: string,
  value: string | PluralForms,
  params: Params | undefined,
): string {
  if (typeof value === 'string') return interpolate(value, params);
  const count: unknown = params?.count;
  if (typeof count !== 'number') {
    warn(`Key "${key}" is plural and needs a numeric "count" parameter`);
    return interpolate(value.other, params);
  }
  return interpolate(selectPlural(locale, value, count), params);
}

function translateFrom(
  locale: LocaleCode,
  key: string,
  params: Params | undefined,
  primary: DictTree | undefined,
  fallback: DictTree | undefined,
): string {
  const own = lookup(primary, key);
  const english = lookup(fallback, key);
  if (isLeaf(own) && (!isLeaf(english) || sameShape(own, english))) {
    return render(locale, key, own, params);
  }
  if (isLeaf(english)) {
    warn(`Key "${key}" is missing in "${locale}" or has the wrong shape. Using English.`);
    return render(DEFAULT_LOCALE, key, english, params);
  }
  warn(`Unknown key "${key}" for "${locale}"`);
  return key;
}

/** Translate one key. `t('en', 'nav.next', { title: 'Tax and SARS' })`. */
export function t<K extends TranslationKey>(
  locale: Locale,
  key: K,
  ...params: ParamArgs<K>
): string {
  const fallback = locale === DEFAULT_LOCALE ? undefined : ENGLISH;
  return translateFrom(
    locale,
    key,
    params[0] as Params | undefined,
    DICTIONARIES[locale],
    fallback,
  );
}

/** A `t` bound to one locale, for use in `.astro` frontmatter. */
export function useTranslations(locale: Locale): Translator {
  return (key, ...params) => t(locale, key, ...params);
}

function mergeWithFallback(base: DictTree, override: DictTree | undefined, path: string): DictTree {
  const out: Record<string, string | DictTree> = {};
  for (const [key, baseValue] of Object.entries(base)) {
    const childPath = path ? `${path}.${key}` : key;
    const value = override && Object.hasOwn(override, key) ? override[key] : undefined;
    if (isLeaf(baseValue)) {
      const sameKind =
        typeof baseValue === 'string' ? typeof value === 'string' : isPluralForms(value);
      if (!sameKind) warn(`Key "${childPath}" is missing or has the wrong shape. Using English.`);
      out[key] = sameKind && value !== undefined ? value : baseValue;
    } else {
      out[key] = mergeWithFallback(
        baseValue,
        typeof value === 'object' ? value : undefined,
        childPath,
      );
    }
  }
  return out;
}

/**
 * The full dictionary for a locale, with English filling any gaps.
 * Keys that exist only in the locale file are dropped.
 */
export function getDictionary(locale: Locale): Dict {
  return pick(locale, Object.keys(en) as DictGroup[]) as Dict;
}

/**
 * A subset of the dictionary for serialising into a client script, for example
 * `pick(locale, ['search', 'prompts'])`. English fills any gaps.
 */
export function pick<G extends DictGroup>(locale: Locale, groups: readonly G[]): Pick<Dict, G> {
  const own = DICTIONARIES[locale];
  const out: Record<string, DictTree> = {};
  for (const group of groups) {
    const base = ENGLISH[group];
    if (typeof base !== 'object') continue;
    const override = locale === DEFAULT_LOCALE ? base : own?.[group];
    out[group] = mergeWithFallback(
      base,
      typeof override === 'object' ? override : undefined,
      group,
    );
  }
  return out as unknown as Pick<Dict, G>;
}

/**
 * A translator over a dictionary subset from `pick()`, for client scripts that receive the
 * subset as JSON. Plural rules, interpolation and parameter types behave exactly like `t`.
 */
export function createTranslator<G extends DictGroup>(
  locale: Locale,
  dictionary: Pick<Dict, G>,
): Translator<KeyIn<G>> {
  const tree = dictionary as unknown as DictTree;
  return (key, ...params) =>
    translateFrom(locale, key, params[0] as Params | undefined, tree, undefined);
}

/* ------------------------------------------------------------------ formatting */

const NBSP = ' ';

export interface NumberFormatOptions {
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
}

/**
 * One number format for every language, so numbers stay byte-identical across locales:
 * thousands grouped with a no-break space (U+00A0), `.` as the decimal mark, `-` for negatives.
 * `formatNumber('af', 1234.5)` → `1 234.5`.
 */
export function formatNumber(
  _locale: Locale,
  value: number,
  options: NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) throw new RangeError(`Not a finite number: ${String(value)}`);
  const formatter = new Intl.NumberFormat('en-US', {
    useGrouping: true,
    signDisplay: 'negative',
    ...options,
  });
  return formatter.format(value).replace(/,/g, NBSP);
}

/** The largest amount `formatRand` accepts: every cent is still exact in a double. */
export const MAX_RAND_AMOUNT = Number.MAX_SAFE_INTEGER / 100;

function roundToCents(value: number): number {
  const magnitude = Math.abs(value);
  // Shift the decimal point in the string form so 1.005 rounds to 1.01, not 1.00.
  // Exponent forms such as `1e-7` give NaN here and use plain multiplication instead.
  const shifted = Number(`${magnitude}e2`);
  const cents = Number.isFinite(shifted) ? Math.round(shifted) : Math.round(magnitude * 100);
  return (Math.sign(value) * cents) / 100;
}

/**
 * Rand amounts for templates, the same in every language: `R 1 234.56`.
 * The two spaces are no-break spaces (U+00A0) so an amount never wraps across lines.
 * Rounds half away from zero to cents. Negative amounts: `-R 50.00`.
 * Throws `RangeError` for non-finite amounts and for amounts above `MAX_RAND_AMOUNT`
 * (about R90 trillion), where cents can no longer be exact.
 */
export function formatRand(locale: Locale, amount: number): string {
  if (!Number.isFinite(amount)) throw new RangeError(`Not a finite amount: ${String(amount)}`);
  if (Math.abs(amount) > MAX_RAND_AMOUNT) {
    throw new RangeError(`Amount too large to show exact cents: ${String(amount)}`);
  }
  const rounded = roundToCents(amount);
  const digits = formatNumber(locale, Math.abs(rounded), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${rounded < 0 ? '-' : ''}R${NBSP}${digits}`;
}

type MonthKey = Extract<TranslationKey, `date.months.${string}`>;

/** South Africa uses UTC+02:00 all year, with no daylight saving. */
const SAST_OFFSET_MINUTES = 120;
/** Real time zone offsets run from -12:00 to +14:00. */
const MAX_OFFSET_MINUTES = 14 * 60;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d{1,9})?)?(?:(Z)|([+-])([01]\d|2[0-3]):?([0-5]\d))$/;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

/** Parts of a real calendar date in `YYYY-MM-DD` form, or `undefined` (for example `2026-02-30`). */
function calendarDate(value: string): DateParts | undefined {
  const match = DATE_ONLY.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  const real =
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day;
  return real ? { year, month, day } : undefined;
}

function dateParts(iso: string): DateParts {
  const timestamp = TIMESTAMP.exec(iso);
  const day = calendarDate(timestamp ? timestamp[1]! : iso);
  if (!day) {
    const shapeOk = timestamp !== null || DATE_ONLY.test(iso);
    throw new RangeError(
      shapeOk
        ? `Invalid date: ${iso}`
        : `Expected YYYY-MM-DD or an ISO timestamp with a time zone: ${iso}`,
    );
  }
  if (!timestamp) return day;
  const [, , hour, minute, second = '0', zulu, sign, offsetHours = '0', offsetMinutes = '0'] =
    timestamp;
  const offset = zulu
    ? 0
    : (sign === '-' ? -1 : 1) * (Number(offsetHours) * 60 + Number(offsetMinutes));
  if (Math.abs(offset) > MAX_OFFSET_MINUTES) {
    throw new RangeError(`Invalid time zone offset: ${iso}`);
  }
  const utc =
    Date.UTC(day.year, day.month - 1, day.day, Number(hour), Number(minute), Number(second)) -
    offset * 60_000;
  const local = new Date(utc + SAST_OFFSET_MINUTES * 60_000);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() };
}

/**
 * `formatDate('en', '2026-09-13')` → `13 September 2026`; `'2026-03-01'` in `af` → `1 Maart 2026`.
 * Month names and word order come from the dictionary (`date.months`, `date.format`), so output
 * does not depend on the ICU data of the runtime.
 * Timestamps (`2026-09-13T23:30:00Z`, `2026-09-14T01:00+02:00`) are shown as the calendar day in
 * South Africa.
 * Throws `RangeError` for anything else, including impossible dates such as `2026-02-30` or
 * `2026-02-30T10:00:00Z` and times such as `T24:00`. There is no silent fallback.
 */
export function formatDate(locale: Locale, isoDate: string): string {
  const { year, month, day } = dateParts(isoDate);
  const monthName = t(locale, `date.months.${month}` as MonthKey);
  return t(locale, 'date.format', { day, month: monthName, year });
}
