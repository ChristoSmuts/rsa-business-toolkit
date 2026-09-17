import type { InlineRun } from '../../src/lib/content/schema';

export const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface FactMarkers {
  /** Month names exactly as the language capitalises them. Matching is case-sensitive. */
  months: readonly string[];
  multipliers: { thousand: string; million: string; billion: string };
  sectionWords: readonly string[];
  /**
   * Words that make a month without a day or year a date when they come straight before it:
   * `in July`, `by the end of August`, `End September`. The first letter matches either case.
   */
  dateContextWords: readonly string[];
  /** Words that add a further month to a dated month: `in March or April`, `in February and April`. */
  dateListWords: readonly string[];
  /** Words that make `Month <word> Month` a date range on their own: `July to October`. */
  dateRangeWords: readonly string[];
  /**
   * Suffixes an ordinal is written with, after the digits: `7th` (EN), `7de` and `28ste` (AF). Only the
   * number is compared, so English and Afrikaans spell the ordinal their own way but must mean the same day.
   */
  ordinalSuffixes: readonly string[];
}

/** English ordinal suffixes, accepted in every language so an untranslated `7th` still counts. */
export const EN_ORDINAL_SUFFIXES = ['st', 'nd', 'rd', 'th'] as const;

export const EN_FACT_MARKERS: FactMarkers = {
  months: EN_MONTHS,
  multipliers: { thousand: 'thousand', million: 'million', billion: 'billion' },
  sectionWords: ['section'],
  dateContextWords: [
    'in',
    'by',
    'from',
    'since',
    'until',
    'before',
    'after',
    'during',
    'end of',
    'end',
    'start of',
    'beginning of',
    'middle of',
    'mid',
    'early',
    'late',
    'every',
    'each',
    'next',
    'last',
    'this',
  ],
  dateListWords: ['and', 'or', 'to', 'through', 'until'],
  dateRangeWords: ['to', 'through', 'until'],
  ordinalSuffixes: EN_ORDINAL_SUFFIXES,
};

/** Verifiable facts in a piece of text. Every value is normalised so EN and AF compare equal. */
export interface Facts {
  numbers: string[];
  rands: string[];
  percents: string[];
  codes: string[];
  dates: string[];
  /** The number of an ordinal, without its suffix: `the 7th` and `die 7de` are both `7`. */
  ordinals: string[];
  multipliers: string[];
  sections: string[];
}

export const FACT_KINDS = [
  'codes',
  'sections',
  'dates',
  'rands',
  'percents',
  'ordinals',
  'numbers',
  'multipliers',
] as const;
export type FactKind = (typeof FACT_KINDS)[number];

export function emptyFacts(): Facts {
  return {
    numbers: [],
    rands: [],
    percents: [],
    codes: [],
    dates: [],
    ordinals: [],
    multipliers: [],
    sections: [],
  };
}

/** What the date extractor counted and what it deliberately left alone (for `--report`). */
export interface DateAudit {
  /** Every date fact: the normalised value and the text it came from. */
  tokens: { value: string; text: string }[];
  /** Capitalised month names outside a date context, with surrounding text. */
  skipped: { word: string; text: string }[];
  /** Month names in another case (`may`, `march`), which are never dates. */
  otherCase: string[];
}

export function emptyDateAudit(): DateAudit {
  return { tokens: [], skipped: [], otherCase: [] };
}

const NOT_WORD_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_WORD_AFTER = '(?![\\p{L}\\p{N}])';
/**
 * The word between an ordinal day and its month: `the 7th of August`, `die 7de van Augustus`. Both
 * languages are listed, so an English day-month date and its Afrikaans translation give the same fact.
 */
const ORDINAL_MONTH_WORDS = '(?:of|van)';

/**
 * Form and regulation codes that must stay byte-identical in every language. An English plural or a
 * possessive (`ITR14s`, `ITR14's`) still counts as the code; so does an Afrikaans compound (`ITR14-vorm`).
 */
const FORM_CODE_RE = new RegExp(
  `${NOT_WORD_BEFORE}(ITR\\s?1[24]|IRP\\s?6|EMP\\s?[25]01|VAT\\s?\\d{3}|SAPS\\s?\\d{3}|CoR\\s?\\d+(?:\\.\\d+)?|R\\d{3,4}(?=\\s+(?:of|van)\\s+\\d{4})|R(?:638|146|962)|MTN\\s?1|RC\\s?1|RLV|NCO|ABR|RPC|SANS\\s?\\d+(?:-[A-Z])?|CR\\s?2B)(?:'?s)?${NOT_WORD_AFTER}`,
  'gu',
);
const RAND_RE = /(?<![\p{L}\p{N}])R\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?![\p{N}])/gu;
const PERCENT_RE = /(?<![\p{L}\p{N}%.,])\d+(?:[.,]\d+)?\s?%(?![0-9A-Fa-f]{2})/gu;
const NUMBER_RE = /(?<![\p{L}\p{N}%]|\p{N}[.,])\d+(?:,\d{3})*(?:\.\d+)?(?![\p{L}\p{N}])/gu;
/** Typographic apostrophes (`’n`, `ITR14’s`) read exactly like the straight one. */
const APOSTROPHES = /[‘’ʼ]/g;

export function normaliseApostrophes(text: string): string {
  return text.replace(APOSTROPHES, "'");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Longest first, so `end of` wins over `end`. Inner spaces match any whitespace. */
function alternation(words: readonly string[], eitherCaseFirstLetter: boolean): string {
  return [...new Set(words)]
    .sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0))
    .map((word) => {
      const pattern = word.trim().split(/\s+/).map(escapeRegExp).join('\\s+');
      const first = word.trim().charAt(0);
      const lower = first.toLowerCase();
      const upper = first.toUpperCase();
      if (!eitherCaseFirstLetter || lower === upper) return pattern;
      return `[${lower}${upper}]${pattern.slice(first.length)}`;
    })
    .join('|');
}

interface Patterns {
  section: RegExp;
  dayMonth: RegExp;
  monthYear: RegExp;
  context: RegExp;
  range: RegExp;
  month: RegExp;
  anyCaseMonth: RegExp;
  ordinal: RegExp;
  multipliers: [string, RegExp][];
}

const patternCache = new WeakMap<FactMarkers, Patterns>();

function patternsFor(markers: FactMarkers): Patterns {
  const cached = patternCache.get(markers);
  if (cached) return cached;
  const sectionWords = alternation([...markers.sectionWords, 'section'], false);
  const months = alternation([...markers.months, ...EN_MONTHS], false);
  const month = `(?:${months})${NOT_WORD_AFTER}`;
  const ordinals = alternation([...markers.ordinalSuffixes, ...EN_ORDINAL_SUFFIXES], false);
  const context = alternation(markers.dateContextWords, true);
  const list = alternation([...markers.dateListWords, ...markers.dateRangeWords], true);
  const range = alternation(markers.dateRangeWords, true);
  const multiplierPairs = Object.entries(markers.multipliers).flatMap(([canonical, word]) => [
    [canonical, word] as const,
    [canonical, canonical] as const,
  ]);
  const patterns: Patterns = {
    section: new RegExp(
      `(?<![\\p{L}])(?:s|(?:${sectionWords})\\s+)(\\d+[A-Z]?(?:\\(\\d+\\))*)${NOT_WORD_AFTER}`,
      'giu',
    ),
    dayMonth: new RegExp(
      `${NOT_WORD_BEFORE}(\\d{1,2})(?:/(\\d{1,2}))?(?:(?:${ordinals})(?:\\s+${ORDINAL_MONTH_WORDS})?)?\\s+(${months})(?:\\s+(\\d{4}))?${NOT_WORD_AFTER}`,
      'gu',
    ),
    monthYear: new RegExp(`${NOT_WORD_BEFORE}(${months})\\s+(\\d{4})${NOT_WORD_AFTER}`, 'gu'),
    context: new RegExp(
      `${NOT_WORD_BEFORE}(?:${context})(?:\\s+|-)${month}(?:(?:\\s*,\\s*|\\s+(?:${list})\\s+)${month})*`,
      'gu',
    ),
    range: new RegExp(
      `${NOT_WORD_BEFORE}${month}(?:\\s*[\\u2013-]\\s*|\\s+(?:${range})\\s+)${month}`,
      'gu',
    ),
    month: new RegExp(`${NOT_WORD_BEFORE}(${months})${NOT_WORD_AFTER}`, 'gu'),
    anyCaseMonth: new RegExp(`${NOT_WORD_BEFORE}(${months})${NOT_WORD_AFTER}`, 'giu'),
    ordinal: new RegExp(`${NOT_WORD_BEFORE}(\\d+)(?:${ordinals})${NOT_WORD_AFTER}`, 'gu'),
    multipliers: multiplierPairs.map(([canonical, word]) => [
      canonical,
      new RegExp(`${NOT_WORD_BEFORE}${escapeRegExp(word)}${NOT_WORD_AFTER}`, 'giu'),
    ]),
  };
  patternCache.set(markers, patterns);
  return patterns;
}

function mask(text: string, re: RegExp, collect: (match: RegExpExecArray) => void): string {
  return text.replace(re, (...args: unknown[]) => {
    const match = args[0] as string;
    const groups = args.slice(1, -2) as (string | undefined)[];
    const index = args.at(-2) as number;
    const exec = Object.assign([match, ...groups], {
      index,
      input: text,
    }) as unknown as RegExpExecArray;
    collect(exec);
    return ' '.repeat(match.length);
  });
}

function monthIndex(word: string, markers: FactMarkers): number {
  const own = markers.months.indexOf(word);
  if (own >= 0) return own;
  return (EN_MONTHS as readonly string[]).indexOf(word);
}

/**
 * `Februarie` (AF) → `February`. Case-sensitive: `may` and `maart` are not months.
 * Returns `undefined` for a word that is not a month.
 */
export function normaliseMonth(word: string, markers: FactMarkers): string | undefined {
  const index = monthIndex(word, markers);
  return index >= 0 ? EN_MONTHS[index] : undefined;
}

const pad = (value: string): string => value.padStart(2, '0');

function around(text: string, index: number, length: number): string {
  return text
    .slice(Math.max(0, index - 30), index + length + 30)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts numbers, rand amounts, percentages, form codes, dates, multiplier words and section references.
 * Codes, sections, dates, rands and percentages are masked before plain numbers, so `CoR 14.3` never yields
 * `R14` and `R638 of 2018` yields code `R638` plus number `2018`.
 *
 * An ordinal is counted by its number only, so `the 7th` and `die 7de` agree while `die 8ste` does not.
 * The suffix may be attached to a noun (`7th-floor`, `7de-dag`); only the digits are compared.
 *
 * A day written as an ordinal is that day's date, not a bare ordinal: `the 7th of August`, `7th August`
 * and the Afrikaans `7 Augustus` or `7de van Augustus` all give the same `--08-07`.
 *
 * A month name counts only when it is capitalised as the language writes it and sits in a date context:
 * a day before it (`31 August`, `28/29 February`), a year after it (`May 2026`), a context word before it
 * (`in July`, `End September`, `by the end of August`, with `in March or April` adding April), or a range
 * (`July to October`). So the English verb "may" is never the month May.
 */
export function extractFacts(input: string, markers: FactMarkers, audit?: DateAudit): Facts {
  const facts = emptyFacts();
  const patterns = patternsFor(markers);
  const original = normaliseApostrophes(input);
  let text = original;

  text = mask(text, FORM_CODE_RE, (m) => facts.codes.push((m[1] ?? m[0]).replace(/\s+/g, ' ')));
  text = mask(text, patterns.section, (m) => facts.sections.push(`s${m[1] ?? ''}`));

  const date = (value: string, match: RegExpExecArray): void => {
    facts.dates.push(value);
    audit?.tokens.push({ value, text: match[0].replace(/\s+/g, ' ').trim() });
  };
  const monthNumber = (word: string | undefined): string =>
    pad(String(monthIndex(word ?? '', markers) + 1));
  text = mask(text, patterns.dayMonth, (m) => {
    const year = m[4] ?? '-'; // `--MM-DD`: ISO 8601 date without a year
    for (const day of [m[1], m[2]]) if (day) date(`${year}-${monthNumber(m[3])}-${pad(day)}`, m);
  });
  text = mask(text, patterns.monthYear, (m) => date(`${m[2] ?? ''}-${monthNumber(m[1])}`, m));
  const namedMonths = (m: RegExpExecArray): void => {
    for (const found of m[0].matchAll(patterns.month)) {
      const month = normaliseMonth(found[1] ?? '', markers);
      if (month) date(month, m);
    }
  };
  // Ranges first: in Afrikaans `tot` is both a range word (`Julie tot Oktober`) and a context word.
  text = mask(text, patterns.range, namedMonths);
  text = mask(text, patterns.context, namedMonths);
  if (audit) {
    for (const found of text.matchAll(patterns.month)) {
      audit.skipped.push({
        word: found[1] ?? '',
        text: around(original, found.index, found[0].length),
      });
    }
    for (const found of text.matchAll(patterns.anyCaseMonth)) {
      const word = found[1] ?? '';
      if (monthIndex(word, markers) < 0) audit.otherCase.push(word);
    }
  }

  text = mask(text, RAND_RE, (m) => facts.rands.push(m[0].replace(/\s+/g, '')));
  text = mask(text, PERCENT_RE, (m) => facts.percents.push(m[0].replace(/\s+/g, '')));
  // Before plain numbers, which stop at a letter: `7th` and `7de` would otherwise be no fact at all.
  text = mask(text, patterns.ordinal, (m) => facts.ordinals.push(m[1] ?? ''));
  text = mask(text, NUMBER_RE, (m) => facts.numbers.push(m[0]));

  for (const [canonical, re] of patterns.multipliers) {
    text = mask(text, re, () => facts.multipliers.push(canonical));
  }
  return facts;
}

export function mergeFacts(target: Facts, source: Facts): Facts {
  for (const kind of FACT_KINDS) target[kind].push(...source[kind]);
  return target;
}

/**
 * Facts from inline runs. Only visible text counts: link targets (`href`, `doc`, `anchor`) and docref
 * labels are excluded, so a `%20` in a link target is never a percentage.
 */
export function factsFromRuns(
  runs: readonly InlineRun[],
  markers: FactMarkers,
  audit?: DateAudit,
): Facts {
  const facts = emptyFacts();
  const visit = (list: readonly InlineRun[]): void => {
    let buffer = '';
    const flush = (): void => {
      if (buffer) mergeFacts(facts, extractFacts(buffer, markers, audit));
      buffer = '';
    };
    for (const run of list) {
      if (run.t === 'text' || run.t === 'code') buffer += run.v;
      else if (run.t === 'placeholder') buffer += ` ${run.v} `;
      else if (run.t === 'strong' || run.t === 'em' || run.t === 'link') {
        flush();
        visit(run.c);
      } else {
        flush();
      }
    }
    flush();
  };
  visit(runs);
  return facts;
}
