import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../../src/i18n/en.json';
import {
  PLURAL_CATEGORIES,
  createTranslator,
  dictionaryCodes,
  getDictionary,
  interpolate,
  isPluralForms,
  pick,
  selectPlural,
  t,
  useTranslations,
  type DictTree,
  type Params,
  type PluralForms,
  type TranslationKey,
} from '../../src/i18n/index';
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  LOCALES,
  getLocale,
  isEnabledLocale,
  sitemapLocales,
  type LocaleCode,
} from '../../src/i18n/locales';

/* ------------------------------------------------------------------ helpers */

const I18N_DIR = new URL('../../src/i18n/', import.meta.url);

function loadDictionary(code: string): DictTree {
  return JSON.parse(readFileSync(new URL(`${code}.json`, I18N_DIR), 'utf8')) as DictTree;
}

type Leaf = string | PluralForms;

/** Flatten to `dot.path → leaf`. Objects with an `other` key are plural leaves. */
function flatten(tree: DictTree, prefix = ''): Map<string, Leaf> {
  const out = new Map<string, Leaf>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else if ('other' in value) out.set(path, value as PluralForms);
    else for (const [childKey, child] of flatten(value, path)) out.set(childKey, child);
  }
  return out;
}

function forms(leaf: Leaf): string[] {
  return typeof leaf === 'string' ? [leaf] : Object.values(leaf);
}

/**
 * Sorted `{param}` names across all forms of a leaf.
 * For plurals this is the union over the forms on purpose: a language may write "Een resultaat"
 * in its `one` form without `{count}`, as long as the key as a whole uses the same names.
 */
function paramNames(leaf: Leaf): string[] {
  const names = new Set<string>();
  for (const text of forms(leaf)) {
    for (const match of text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)) names.add(match[1]!);
  }
  return [...names].sort();
}

/** Text in typographic quotes is a literal (for example the words “Tax Invoice”). */
function withoutQuoted(text: string): string {
  return text.replace(/“[^”]*”/g, '“”');
}

const EN = flatten(loadDictionary('en'));

/**
 * Every locale that has a UI dictionary, enabled or not. A new `zu.json` is checked by all
 * parity and text-rule tests as soon as `uiDictionary: true` is set, before routing is enabled.
 */
const DICTIONARY_LOCALES = LOCALES.filter((entry) => entry.uiDictionary).map((entry) => ({
  code: entry.code,
  flat: flatten(loadDictionary(entry.code)),
}));
const TRANSLATED = DICTIONARY_LOCALES.filter((entry) => entry.code !== DEFAULT_LOCALE);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('../../src/i18n/af.json');
});

/* ------------------------------------------------------------------ locales.ts */

describe('locale metadata', () => {
  it('lists the 11 official South African languages once each', () => {
    expect(LOCALES.map((entry) => entry.code)).toEqual([
      'en',
      'af',
      'zu',
      'xh',
      'st',
      'tn',
      'nso',
      'ts',
      'ss',
      've',
      'nr',
    ]);
    expect(LOCALES.map((entry) => entry.nativeName)).toEqual([
      'English',
      'Afrikaans',
      'isiZulu',
      'isiXhosa',
      'Sesotho',
      'Setswana',
      'Sesotho sa Leboa',
      'Xitsonga',
      'siSwati',
      'Tshivenḓa',
      'isiNdebele',
    ]);
  });

  it('has consistent fields for every entry', () => {
    for (const entry of LOCALES) {
      expect(entry.hreflang, entry.code).toBe(`${entry.code}-ZA`);
      expect(entry.dir, entry.code).toBe('ltr');
      expect(entry.name.trim(), entry.code).not.toBe('');
      expect(['complete', 'partial', 'planned'], entry.code).toContain(entry.status);
      if (entry.enabled) expect(entry.uiDictionary, `${entry.code} enabled needs UI`).toBe(true);
      if (!entry.enabled) expect(entry.status, entry.code).toBe('planned');
    }
  });

  it('has a dictionary file exactly for locales with uiDictionary', () => {
    for (const entry of LOCALES) {
      expect(existsSync(new URL(`${entry.code}.json`, I18N_DIR)), entry.code).toBe(
        entry.uiDictionary,
      );
    }
  });

  it('registers every dictionary file in index.ts', () => {
    expect(dictionaryCodes().sort()).toEqual(DICTIONARY_LOCALES.map((entry) => entry.code).sort());
  });

  it('enables only English and Afrikaans, English first', () => {
    expect([...ENABLED_LOCALES]).toEqual(['en', 'af']);
    expect(ENABLED_LOCALES[0]).toBe(DEFAULT_LOCALE);
    expect(getLocale(DEFAULT_LOCALE)?.status).toBe('complete');
  });

  it('checks and looks up codes', () => {
    expect(isEnabledLocale('af')).toBe(true);
    expect(isEnabledLocale(LOCALES.find((entry) => !entry.enabled)!.code)).toBe(false);
    expect(isEnabledLocale('')).toBe(false);
    expect(isEnabledLocale(null)).toBe(false);
    expect(isEnabledLocale(undefined)).toBe(false);
    expect(getLocale('ve')?.nativeName).toBe('Tshivenḓa');
    expect(getLocale('xx')).toBeUndefined();
  });

  it('builds the sitemap locale map from enabled locales', () => {
    expect(sitemapLocales()).toEqual({ en: 'en-ZA', af: 'af-ZA' });
  });

  /**
   * Importing the Astro config loads Vite and every integration. Measured on the Windows machine
   * this package is gated on: 5.7 s for the whole file with the module graph warm, 23.2 s cold, and
   * it exceeded a 30 s budget during `pnpm gate`, where 22 test files import in parallel. That cost
   * is the toolchain's, not this assertion's — the two `expect`s below are instant — so the budget
   * is set from the measurement rather than left one bad run away from a false failure. It still
   * fails if loading the config genuinely hangs.
   */
  it('drives astro.config.ts', async () => {
    const { default: config } = await import('../../astro.config');
    expect(config.i18n?.defaultLocale).toBe(DEFAULT_LOCALE);
    expect(config.i18n?.locales).toEqual([...ENABLED_LOCALES]);
  }, 120_000);
});

/* ------------------------------------------------------------------ dictionaries */

describe('dictionary structure', () => {
  it.each(DICTIONARY_LOCALES)('$code: plural objects hold only plural categories', ({ flat }) => {
    const bad = [...flat]
      .filter(([, leaf]) => typeof leaf !== 'string' && !isPluralForms(leaf))
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it.each(DICTIONARY_LOCALES)(
    '$code: plural objects cover every category the language needs',
    ({ code, flat }) => {
      const required = new Intl.PluralRules(getLocale(code)?.hreflang).resolvedOptions()
        .pluralCategories;
      const bad = [...flat]
        .filter(([, leaf]) => typeof leaf !== 'string')
        .filter(([, leaf]) => required.some((category) => !(category in (leaf as PluralForms))))
        .map(([key]) => key);
      expect(bad).toEqual([]);
    },
  );

  it('English is the canonical key set and has content', () => {
    expect(EN.size).toBeGreaterThan(300);
    expect([...EN.keys()].some((key) => key.startsWith('nav.'))).toBe(true);
  });

  it('English plural keys take {count} in their "other" form', () => {
    const bad = [...EN]
      .filter(([, leaf]) => typeof leaf !== 'string')
      .filter(([, leaf]) => !(leaf as PluralForms).other.includes('{count}'))
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it('English strings take figures from {param} values, not from the text', () => {
    // "Part A2" is the name of a checklist part, not a figure that can change.
    const allowed = new Set(['checklist.parts.a2']);
    const bad = [...EN]
      .filter(([key]) => !allowed.has(key))
      .filter(([, leaf]) =>
        forms(leaf).some((text) => /\d/.test(text.replace(/\{[A-Za-z][A-Za-z0-9_]*\}/g, ''))),
      )
      .map(([key, leaf]) => `${key}: ${forms(leaf).join(' | ')}`);
    expect(bad).toEqual([]);
  });

  it('lang.names has a name for every known locale', () => {
    for (const { code, flat } of DICTIONARY_LOCALES) {
      const names = [...flat.keys()]
        .filter((key) => key.startsWith('lang.names.'))
        .map((key) => key.slice('lang.names.'.length));
      expect(names, code).toEqual(LOCALES.map((entry) => entry.code));
    }
  });

  it('date.months has 12 months', () => {
    const months = [...EN.keys()].filter((key) => key.startsWith('date.months.'));
    expect(months).toEqual(Array.from({ length: 12 }, (_, index) => `date.months.${index + 1}`));
  });
});

describe.each(TRANSLATED)('$code dictionary matches English', ({ code, flat }) => {
  it('has exactly the English keys', () => {
    const missing = [...EN.keys()].filter((key) => !flat.has(key));
    const extra = [...flat.keys()].filter((key) => !EN.has(key));
    expect({ missing, extra }, `${code}.json differs from en.json`).toEqual({
      missing: [],
      extra: [],
    });
  });

  it('uses the same kind of value (string or plural) per key', () => {
    const mismatched = [...EN]
      .filter(([key, leaf]) => flat.has(key) && typeof flat.get(key) !== typeof leaf)
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it('uses the same {param} names per key', () => {
    const diffs = [...EN]
      .filter(([key]) => flat.has(key))
      .map(([key, leaf]) => ({ key, en: paramNames(leaf), [code]: paramNames(flat.get(key)!) }))
      .filter((entry) => JSON.stringify(entry.en) !== JSON.stringify(entry[code]));
    expect(diffs).toEqual([]);
  });

  it('uses the same plural categories per key', () => {
    const diffs = [...EN]
      .filter(([key, leaf]) => typeof leaf !== 'string' && flat.has(key))
      .map(([key, leaf]) => ({
        key,
        en: Object.keys(leaf).sort(),
        [code]: Object.keys(flat.get(key)!).sort(),
      }))
      .filter((entry) => JSON.stringify(entry.en) !== JSON.stringify(entry[code]));
    expect(diffs).toEqual([]);
  });

  it('keeps digits byte-identical per key', () => {
    const digits = (leaf: Leaf) =>
      forms(leaf)
        .flatMap((text) => text.match(/\d+(?:[.,]\d+)*%?/g) ?? [])
        .sort();
    const diffs = [...EN]
      .filter(([key]) => flat.has(key))
      .map(([key, leaf]) => ({ key, en: digits(leaf), [code]: digits(flat.get(key)!) }))
      .filter((entry) => JSON.stringify(entry.en) !== JSON.stringify(entry[code]));
    expect(diffs).toEqual([]);
  });
});

/**
 * Text rules for every dictionary:
 * - no empty strings, no leading or trailing whitespace, no double spaces, no line breaks;
 * - no straight quotes or apostrophes (U+0022, U+0027): use “ ” and ’, so text never needs
 *   escaping in HTML attributes and Afrikaans ’n is always typographic;
 * - no exclamation marks (plain, calm tone) and no "..." (use the … character);
 * - braces only as `{param}` placeholders.
 */
describe.each(DICTIONARY_LOCALES)('$code text rules', ({ flat }) => {
  const entries = [...flat].flatMap(([key, leaf]) =>
    typeof leaf === 'string'
      ? [{ key, text: leaf }]
      : Object.entries(leaf).map(([category, text]) => ({ key: `${key}.${category}`, text })),
  );
  const failing = (test: (text: string) => boolean) =>
    entries.filter(({ text }) => test(text)).map(({ key, text }) => `${key}: ${text}`);

  it('has no empty strings', () => {
    expect(failing((text) => text.trim() === '')).toEqual([]);
  });
  it('has no leading, trailing, double or line-break whitespace', () => {
    expect(failing((text) => text !== text.trim() || /\s{2,}|[\n\r\t]/.test(text))).toEqual([]);
  });
  it('has no straight quotes or apostrophes', () => {
    expect(failing((text) => /["']/.test(text))).toEqual([]);
  });
  it('has no exclamation marks or three-dot ellipses', () => {
    expect(failing((text) => text.includes('!') || text.includes('...'))).toEqual([]);
  });
  it('uses braces only for {param} placeholders', () => {
    expect(failing((text) => /[{}]/.test(text.replace(/\{[A-Za-z][A-Za-z0-9_]*\}/g, '')))).toEqual(
      [],
    );
  });
});

describe('Afrikaans terminology', () => {
  const af = flatten(loadDictionary('af'));
  const pairs = [...EN]
    .filter(([key]) => af.has(key))
    .map(([key, leaf]) => ({ key, en: forms(leaf).join(' '), af: forms(af.get(key)!).join(' ') }));

  it('keeps names and codes verbatim', () => {
    const verbatim = [
      'SARS',
      'CIPC',
      'POPIA',
      'Pty Ltd',
      'BizPortal',
      'eFiling',
      'PayShap',
      'PAYE',
      'PDF',
      'JavaScript',
      'Claude',
      'Anthropic',
    ];
    const bad = pairs.flatMap(({ key, en: english, af: afrikaans }) =>
      verbatim
        .filter((term) => english.includes(term) && !afrikaans.includes(term))
        .map((term) => `${key}: ${term}`),
    );
    expect(bad).toEqual([]);
  });

  it('uses the fixed Afrikaans terms outside quoted literals', () => {
    const terms: [RegExp, RegExp][] = [
      [/\bVAT\b/, /\bBTW\b/],
      [/sole proprietor/i, /eenmansa(?:ak|ke)/i],
      [/turnover tax/i, /omsetbelasting/i],
      [/provisional tax/i, /voorlopige belasting/i],
      [/checklist/i, /kontrolelys/i],
      [/glossary/i, /woordelys/i],
      [/template/i, /sjablo/i],
      [/search/i, /soek/i],
    ];
    const bad = pairs.flatMap(({ key, en: english, af: afrikaans }) =>
      terms
        .filter(
          ([source, target]) =>
            source.test(withoutQuoted(english)) && !target.test(withoutQuoted(afrikaans)),
        )
        .map(([source]) => `${key}: ${source.source}`),
    );
    expect(bad).toEqual([]);
  });

  it('never uses VAT in Afrikaans prose, only inside quoted literals', () => {
    expect(pairs.filter(({ af: afrikaans }) => /\bVAT\b/.test(withoutQuoted(afrikaans)))).toEqual(
      [],
    );
  });
});

/**
 * Length check for short UI labels. Afrikaans runs longer than English, and the design allows
 * about +25%. Every English string of at most 24 characters counts as a label (buttons, chips,
 * badges, column headers, menu items), so new labels are checked without a list of key names.
 * A label fails when the translation is more than 1.6 times the English length AND at least five
 * characters longer (so "No" → "Nee" never fails). Exceptions are kept per locale, each with a
 * reason. A new language starts with none, and the stale-exception test only checks the locale's
 * own list.
 */
const LABEL_LENGTH_EXCEPTIONS: Partial<Record<LocaleCode, Readonly<Record<string, string>>>> = {
  af: {
    'common.reset': '“Stel terug” is the usual Afrikaans word. Ten characters fit any button.',
    'businessTypes.retail-online.short':
      'No shorter Afrikaans word means retail. Type chips wrap onto a second line.',
    'templates.items.privacy-notice.name':
      'Privaatheidskennisgewing is the standard term for a POPIA privacy notice. Card titles wrap.',
  },
};

/**
 * D5: no string may say something was checked without naming who checked it. The set is derived
 * from the dictionary itself, so a new key cannot ship an agent-less claim, and the agent must sit
 * in the *same sentence* as the claim, so an "AI" elsewhere in a long string cannot satisfy it.
 */
describe.each(DICTIONARY_LOCALES)('$code names the checker', ({ code, flat }) => {
  const isEnglish = code === DEFAULT_LOCALE;
  /** The verb forms that claim a check happened. Imperatives ("check the link") are not claims. */
  const CLAIM = isEnglish ? /\bchecked\b/i : /\bnagegaan\b|\bbevestig\b/i;
  const AGENT = isEnglish
    ? /\bAI\b|\bIt\b|\{reviewer\}|\bNo person\b|\bNo lawyer\b/
    : /\bKI\b|\{reviewer\}|\bGeen\b|\bDit\b|\bNiemand\b/;
  /** Buttons and status labels that use the verb as a word, not as a claim about a check. */
  const NOT_A_CLAIM = new Set(['common.confirm', 'trust.unverified.label']);

  it('has claims to check', () => {
    const claims = [...flat].filter(([, leaf]) => forms(leaf).some((text) => CLAIM.test(text)));
    expect(claims.length).toBeGreaterThan(8);
  });

  it('names an agent in the same sentence as every claim', () => {
    const bad: string[] = [];
    for (const [key, leaf] of flat) {
      if (NOT_A_CLAIM.has(key)) continue;
      for (const text of forms(leaf)) {
        for (const sentence of text.split(/(?<=\.)\s+/)) {
          if (CLAIM.test(sentence) && !AGENT.test(sentence)) bad.push(`${key}: “${sentence}”`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe.each(TRANSLATED)('$code label length', ({ code, flat }) => {
  const MAX_LABEL_LENGTH = 24;
  const EXCEPTIONS = LABEL_LENGTH_EXCEPTIONS[code] ?? {};
  const tooLong = (english: string, other: string) =>
    other.length > english.length * 1.6 && other.length - english.length >= 5;
  const labels = [...EN]
    .map(([key, leaf]) => ({ key, en: typeof leaf === 'string' ? leaf : leaf.other }))
    .filter(({ en: english }) => english.length <= MAX_LABEL_LENGTH)
    .filter(({ key }) => flat.has(key))
    .map((entry) => {
      const leaf = flat.get(entry.key)!;
      return { ...entry, other: typeof leaf === 'string' ? leaf : leaf.other };
    });

  it('checks a meaningful number of labels', () => {
    expect(labels.length).toBeGreaterThan(200);
  });

  it('keeps short labels close to the English length', () => {
    const bad = labels
      .filter(({ key }) => !Object.hasOwn(EXCEPTIONS, key))
      .filter(({ en: english, other }) => tooLong(english, other))
      .map(({ key, en: english, other }) => `${key}: “${english}” → “${other}”`);
    expect(bad).toEqual([]);
  });

  it('has no stale exceptions', () => {
    const stale = Object.keys(EXCEPTIONS).filter((key) => {
      const label = labels.find((entry) => entry.key === key);
      return !label || !tooLong(label.en, label.other);
    });
    expect(stale).toEqual([]);
  });
});

/* ------------------------------------------------------------------ parameter types */

describe('ParamNames in index.ts', () => {
  const INDEX = new URL('index.ts', I18N_DIR);
  const START = '// @generated-start param-names';
  const END = '// @generated-end param-names';
  const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();
  /** One entry per key, so a failure shows only the keys that changed, whatever Prettier did. */
  const entries = (text: string) => normalise(text).split(/(?<=[{;]) /);
  const REGENERATE =
    'Out of date. Run: pnpm exec cross-env I18N_UPDATE_TYPES=1 vitest run --project unit tests/unit/i18n.test.ts -t ParamNames, then pnpm exec prettier --write src/i18n/index.ts';

  function expectedBlock(): string {
    const lines = [...EN]
      .map(([key, leaf]) => ({ key, names: paramNames(leaf) }))
      .filter(({ names }) => names.length > 0)
      .map(({ key, names }) => `  '${key}': ${names.map((name) => `'${name}'`).join(' | ')};`);
    return ['interface ParamNames {', ...lines, '}'].join('\n');
  }

  it('lists the {param} names of every English key', () => {
    const source = readFileSync(INDEX, 'utf8');
    const start = source.indexOf(START);
    const end = source.indexOf(END);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const current = source.slice(start + START.length, end);
    const expected = expectedBlock();
    if (process.env['I18N_UPDATE_TYPES'] === '1' && normalise(current) !== normalise(expected)) {
      writeFileSync(
        INDEX,
        `${source.slice(0, start + START.length)}\n${expected}\n${source.slice(end)}`,
      );
      return;
    }
    expect(entries(current), REGENERATE).toEqual(entries(expected));
  });
});

/* ------------------------------------------------------------------ index.ts */

describe('t', () => {
  it('translates plain keys', () => {
    expect(t('en', 'nav.skipLink')).toBe('Skip to main content');
    expect(t('af', 'nav.search')).toBe('Soek');
  });

  it('interpolates parameters, including numbers as plain strings', () => {
    expect(t('en', 'nav.next', { title: 'Tax and SARS' })).toBe('Next: Tax and SARS');
    expect(t('af', 'myPath.progress', { done: 3, total: 10 })).toBe('3 van 10 klaar');
    expect(t('en', 'site.checkedOn', { date: '13 September 2026' })).toBe(
      'An AI checked the facts against the sources in the sources register, most recently on 13 September 2026.',
    );
    expect(t('en', 'templates.vat', { rate: 15 })).toBe('VAT (15%)');
    expect(t('af', 'home.threeNumbers.heading', { year: 2026 })).toBe(
      'Drie getalle wat in 2026 verander het',
    );
  });

  it('selects plural forms with Intl.PluralRules', () => {
    expect(t('en', 'search.results', { count: 1 })).toBe('1 result');
    expect(t('en', 'search.results', { count: 0 })).toBe('0 results');
    expect(t('en', 'search.results', { count: 12 })).toBe('12 results');
    expect(t('af', 'search.results', { count: 1 })).toBe('1 resultaat');
    expect(t('af', 'search.results', { count: 2 })).toBe('2 resultate');
    expect(t('en', 'doc.showHiddenSections', { count: 1 })).toBe('Show 1 hidden section');
  });

  it('translates every key in every enabled locale without falling back', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const locale of ENABLED_LOCALES) {
      for (const [key, leaf] of EN) {
        const params: Params = Object.fromEntries(paramNames(leaf).map((name) => [name, 1]));
        const text = t(locale, key as TranslationKey, params);
        expect(text, `${locale} ${key}`).not.toBe(key);
        expect(text, `${locale} ${key}`).not.toMatch(/\{[A-Za-z]/);
      }
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns in dev and uses "other" when a plural key gets no numeric count', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // @ts-expect-error: plural keys need a count.
    expect(t('en', 'search.results')).toBe('{count} results');
    // @ts-expect-error: count must be a number.
    expect(t('en', 'search.results', { count: '1' })).toBe('1 results');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('needs a numeric "count"'));
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('warns in dev and keeps the placeholder when a parameter is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // @ts-expect-error: "nav.previous" needs { title }.
    expect(t('en', 'nav.previous')).toBe('Previous: {title}');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Missing parameter "{title}"'));
  });

  it('returns the key and warns for an unknown or group key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(t('af', 'nav.nope' as TranslationKey)).toBe('nav.nope');
    expect(t('en', 'nav.sections' as TranslationKey)).toBe('nav.sections');
    expect(t('en', 'nav.skipLink.extra' as TranslationKey)).toBe('nav.skipLink.extra');
    expect(t('en', 'toString' as TranslationKey)).toBe('toString');
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it('stays silent outside dev', () => {
    vi.stubEnv('DEV', false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // @ts-expect-error: "nav.previous" needs { title }.
    expect(t('en', 'nav.previous')).toBe('Previous: {title}');
    expect(t('en', 'nav.nope' as TranslationKey)).toBe('nav.nope');
    expect(warn).not.toHaveBeenCalled();
  });

  it('rejects typos at compile time', () => {
    // @ts-expect-error: "nav.skiplink" is not a key in en.json.
    expect(t('en', 'nav.skiplink')).toBe('nav.skiplink');
    // @ts-expect-error: plural sub-forms are not keys of their own.
    expect(t('en', 'search.results.one')).toBe('search.results.one');
  });

  it('rejects wrong parameter names and extra parameters at compile time', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // @ts-expect-error: the parameter is called "title", not "name".
    expect(t('en', 'nav.next', { name: 'Tax' })).toBe('Next: {title}');
    // @ts-expect-error: "myPath.progress" needs both done and total.
    expect(t('en', 'myPath.progress', { done: 1 })).toBe('1 of {total} done');
    // @ts-expect-error: "nav.next" has no {page} placeholder.
    expect(t('en', 'nav.next', { title: 'Tax', page: 2 })).toBe('Next: Tax');
  });

  it('requires every placeholder of every key in a key union at compile time', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const form of ['markDone', 'markDoneNamed'] as const) {
      // @ts-expect-error: the union includes "myPath.markDoneNamed", which needs { title }.
      t('en', `myPath.${form}`);
      expect(t('en', `myPath.${form}`, { title: 'Register' })).not.toContain('{');
    }
    expect(warn).toHaveBeenCalledOnce();
    const noPlaceholders = 'markNotDone' as 'markDone' | 'markNotDone';
    expect(t('af', `myPath.${noPlaceholders}`)).toBe('Haal die merkie af');
    const mixed = 'nav.next' as 'nav.next' | 'site.checkedOn';
    // @ts-expect-error: the union needs both { title } and { date }.
    t('en', mixed, { title: 'Tax' });
    expect(t('en', mixed, { title: 'Tax', date: '1 March 2026' })).toBe('Next: Tax');
    // @ts-expect-error: useTranslations keeps the same check.
    useTranslations('af')(`myPath.${noPlaceholders as 'markDone' | 'markDoneNamed'}`);
  });

  it('renders the trust strings for the AI notice and sources', () => {
    expect(t('en', 'trust.aiNotice.body', { date: '13 September 2026' })).toBe(
      'Written by AI (Claude, Anthropic). An AI checked it against the sources below on 13 September 2026. No person has checked it yet. Rules change: check the official source before you act. Not legal, tax or financial advice.',
    );
    expect(
      t('en', 'trust.aiNotice.bodyHumanChecked', { reviewer: 'A. Person', date: '1 March 2027' }),
    ).toBe(
      'Written by AI (Claude, Anthropic). A. Person checked it against the sources below on 1 March 2027. Rules change: check the official source before you act. Not legal, tax or financial advice.',
    );
    expect(t('af', 'trust.status.humanChecked', { reviewer: 'A. Person' })).toBe(
      'Deur A. Person nagegaan',
    );
    expect(t('en', 'trust.status.humanCheckedMeans', { reviewer: 'A. Person' })).toBe(
      'A. Person checked the facts on this page against the sources. Mistakes are still possible, and rules can change after that date.',
    );
    expect(t('en', 'trust.sources.count', { count: 1 })).toBe('1 source');
    expect(t('af', 'trust.sources.count', { count: 3 })).toBe('3 bronne');
    expect(t('en', 'trust.fact.sourceNamed', { title: 'SARS VAT page' })).toBe(
      'Source for this fact: SARS VAT page',
    );
  });

  it('says in every Afrikaans notice and status string that the English text was checked', () => {
    const date = '13 September 2026';
    const reviewer = 'A. Person';
    const afrikaans = [
      t('af', 'trust.aiNotice.body', { date }),
      t('af', 'trust.aiNotice.bodyNoPageSources', { date }),
      t('af', 'trust.aiNotice.bodyHumanChecked', { date, reviewer }),
      t('af', 'trust.aiNotice.bodyHumanCheckedNoPageSources', { date, reviewer }),
      t('af', 'trust.status.aiCheckedMeans'),
      t('af', 'trust.status.humanCheckedMeans', { reviewer }),
    ];
    for (const text of afrikaans) {
      expect(text).toContain('Engelse teks');
      expect(text).not.toContain('op hierdie bladsy');
    }
    // The two short status labels deliberately drop the qualifier: the body directly above them
    // and the explanation directly below them both carry it, and three statements of it in one
    // header read as anxious rather than careful.
    expect(t('af', 'trust.status.aiChecked')).toBe('KI-nagegaan');
    expect(t('af', 'trust.status.humanChecked', { reviewer })).toBe('Deur A. Person nagegaan');
    // The machine-translation notice directly under it says that no person checked the translation.
    expect(t('af', 'lang.mtNotice.body')).toContain(
      'Geen mens het die vertaling nog nagegaan nie.',
    );
  });

  it('says in the Afrikaans strings outside the notice that the English text was checked', () => {
    // The agent requirement itself is derived from the dictionary in the "names the checker"
    // suite above. This pins the machine-translation qualifier on the strings that carry it.
    const date = '13 September 2026';
    for (const key of [
      'site.description',
      'site.disclaimerShort',
      'site.disclaimerLong',
      'site.checkedOn',
      'home.heroLead',
      'home.heroVerify',
      'home.trust.checked',
      'about.aiSummary',
    ] as const) {
      expect(t('af', key, { date }), key).toContain('Engelse teks');
    }
  });

  it('binds a locale with useTranslations and keeps the parameter checks', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tr = useTranslations('af');
    expect(tr('common.yes')).toBe('Ja');
    expect(tr('common.minutes', { count: 1 })).toBe('1 minuut');
    // @ts-expect-error: count must be a number here too.
    expect(tr('common.minutes', { count: 'een' })).toBe('een minute');
    // @ts-expect-error: "nav.next" needs { title }.
    expect(tr('nav.next')).toBe('Volgende: {title}');
  });
});

describe('English fallback for incomplete dictionaries', () => {
  async function loadWithPartialAfrikaans() {
    vi.resetModules();
    vi.doMock('../../src/i18n/af.json', () => ({
      default: {
        nav: { search: 'Soek', skipLink: { wrong: 'shape' } },
        search: { results: 'not a plural', label: 'Soek in die gids' },
        common: 'wrong shape',
      },
    }));
    return import('../../src/i18n/index');
  }

  it('t falls back to English and warns', async () => {
    const i18n = await loadWithPartialAfrikaans();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(i18n.t('af', 'nav.search')).toBe('Soek');
    expect(i18n.t('af', 'nav.backToTop')).toBe('Back to top');
    expect(i18n.t('af', 'nav.skipLink')).toBe('Skip to main content');
    expect(i18n.t('af', 'search.results', { count: 1 })).toBe('1 result');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"nav.backToTop" is missing in "af"'),
    );
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('pick fills gaps from English and warns', async () => {
    const i18n = await loadWithPartialAfrikaans();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const subset = i18n.pick('af', ['search', 'common']);
    expect(subset.search.label).toBe('Soek in die gids');
    expect(subset.search.results).toEqual(en.search.results);
    expect(subset.common).toEqual(en.common);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"search.results"'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"common.yes"'));
  });
});

describe('pick, getDictionary and createTranslator', () => {
  it('returns only the requested groups', () => {
    const subset = pick('af', ['search', 'prompts']);
    expect(Object.keys(subset)).toEqual(['search', 'prompts']);
    expect(subset.search.placeholder).toBe('Byvoorbeeld: BTW-drempel');
  });

  it('round-trips through JSON for client scripts', () => {
    const subset = JSON.parse(JSON.stringify(pick('af', ['search', 'prompts']))) as ReturnType<
      typeof pick<'search' | 'prompts'>
    >;
    const tr = createTranslator('af', subset);
    expect(tr('search.results', { count: 1 })).toBe('1 resultaat');
    expect(tr('prompts.placeholdersRemaining', { count: 3 })).toBe('3 oop plekke om in te vul');
    expect(tr('search.noResults', { query: 'btw' })).toBe('Niks gevind vir “btw” nie.');
    expect(tr('prompts.copyNamed', { n: 2, title: 'Logo' })).toBe('Kopieer opdrag 2: Logo');
  });

  it('createTranslator only accepts keys from the picked groups, with typed parameters', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tr = createTranslator('en', pick('en', ['search']));
    // @ts-expect-error: "nav" was not picked.
    expect(tr('nav.search')).toBe('nav.search');
    expect(warn).toHaveBeenCalledOnce();
    // @ts-expect-error: count must be a number.
    expect(tr('search.results', { count: '2' })).toBe('2 results');
  });

  it('getDictionary returns the full dictionary', () => {
    expect(getDictionary('en')).toEqual(en);
    expect(flatten(getDictionary('af') as unknown as DictTree).size).toBe(EN.size);
    expect(getDictionary('af').common.yes).toBe('Ja');
  });

  it('ignores unknown group names passed at runtime', () => {
    expect(pick('en', ['nope' as 'search'])).toEqual({});
  });
});

describe('interpolate, selectPlural and isPluralForms', () => {
  it('replaces every occurrence and leaves non-placeholders alone', () => {
    expect(interpolate('{a} and {a} or {b}', { a: 'x', b: 0 })).toBe('x and x or 0');
    expect(interpolate('{ spaced } {1bad} {}', {})).toBe('{ spaced } {1bad} {}');
    expect(interpolate('no params')).toBe('no params');
  });

  it('does not re-read placeholders inside inserted values', () => {
    expect(interpolate('{a}', { a: '{b}', b: 'no' })).toBe('{b}');
  });

  it('ignores inherited properties as parameters', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(interpolate('{toString}', {})).toBe('{toString}');
  });

  it('falls back to "other" when a category form is absent', () => {
    expect(selectPlural('en', { other: 'many' }, 1)).toBe('many');
    expect(selectPlural('af', { one: 'een', other: 'baie' }, 1)).toBe('een');
  });

  it('recognises plural objects', () => {
    expect(isPluralForms({ one: 'a', other: 'b' })).toBe(true);
    expect(isPluralForms({ other: 'b' })).toBe(true);
    expect(isPluralForms({ one: 'a' })).toBe(false);
    expect(isPluralForms({ one: 'a', other: 'b', label: 'c' })).toBe(false);
    expect(isPluralForms({ one: 1, other: 'b' })).toBe(false);
    expect(isPluralForms('other')).toBe(false);
    expect(isPluralForms(null)).toBe(false);
    expect(PLURAL_CATEGORIES).toContain('other');
  });
});

describe('accessible names that contain the visible label (WCAG 2.5.3)', () => {
  // A button whose name is set from the `…Named` key shows the plain key. The name must start
  // with what is shown, so a speech-input user can say it (review WP-31 pass 1, major 5).
  const PAIRS = [
    ['myPath.markDone', 'myPath.markDoneNamed'],
    ['myPath.markNotDone', 'myPath.markNotDoneNamed'],
    ['prompts.fillFromProfile', 'prompts.fillFromProfileNamed'],
    ['prompts.undoFill', 'prompts.undoFillNamed'],
  ] as const;

  for (const code of ['en', 'af']) {
    const dictionary = flatten(loadDictionary(code));
    for (const [label, name] of PAIRS) {
      it(`${code}: ${name} starts with ${label}`, () => {
        const visible = dictionary.get(label);
        const accessible = dictionary.get(name);
        expect(typeof visible).toBe('string');
        expect(typeof accessible).toBe('string');
        expect(
          (accessible as string).toLowerCase().startsWith((visible as string).toLowerCase()),
        ).toBe(true);
      });
    }
  }
});

describe('the hidden-part wording', () => {
  // The guide's headings say whom a part is for; the dictionary must not offer a summary that
  // claims more (review WP-31 pass 1, major 3; pass 2, nit 1).
  for (const code of ['en', 'af']) {
    it(`${code}: no string says a hidden part is "only for" someone`, () => {
      const dictionary = flatten(loadDictionary(code));
      expect([...dictionary.keys()].filter((key) => key.startsWith('doc.hiddenFor'))).toEqual([]);
      const texts = [...dictionary.values()].flatMap(forms);
      expect(texts.filter((text) => /^(Hidden|Versteek): /.test(text))).toEqual([]);
    });
  }
});
