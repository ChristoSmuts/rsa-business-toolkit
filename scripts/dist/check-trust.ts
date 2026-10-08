/**
 * `pnpm dist:trust`, run by `pnpm build` after `astro build`: build plan D5 checked on the
 * rendered pages, not only on the data, and the language-of-parts rule on every Afrikaans page.
 *
 * `Doc.astro` already refuses a document whose data has no sources and no note. That cannot catch a
 * layout that stops *rendering* the notice or the sources section, which would still build. So every
 * built page with a content `<article data-kind="…">` must contain the AI notice inside its header
 * and the "Sources for this page" section, and the build fails naming each page that does not.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ENABLED_LOCALES, type Locale } from '../../src/i18n/locales';
import { normaliseBase } from '../base-path';
import { decodeEntities, listFiles, resolveDistRoot, routeOfHtmlFile } from './audit-links';
import af from '../../src/i18n/af.json';
import en from '../../src/i18n/en.json';
import termsAf from '../translate/TERMS-af.json';

/** Document kinds whose pages D5 governs: every kind the content pipeline emits. */
export const TRUST_KINDS = ['guide', 'template', 'checklist', 'glossary', 'sources'] as const;

/** The element starting at `start` up to its matching close tag (no nesting of the same tag). */
function sliceElement(html: string, start: number, tag: string): string {
  const close = html.indexOf(`</${tag}>`, start);
  return close === -1 ? html.slice(start) : html.slice(start, close + tag.length + 3);
}

/** Visible text of an HTML fragment, roughly: tags dropped, entities decoded, spaces collapsed. */
function textOf(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The AI notice sentences of a language (`trust.aiNotice.body*`), as patterns with `{date}` and
 * `{reviewer}` as wildcards. The notice must say one of them: "Written by AI … who checked it …"
 * is the core of D5, and a layout that drops or rewrites it must not build (review WP-20 pass 4).
 */
export interface NoticeShape {
  /** The page lists sources of its own ("the sources below"). */
  readonly pageSources: boolean;
  /** The status names a person who checked the page. */
  readonly humanChecked: boolean;
}

/**
 * Turns a dictionary sentence into a pattern with `{date}` and `{reviewer}` as wildcards. A wildcard
 * cannot cross a full stop, so "on 13 September 2026. No person has checked it yet" can never pass
 * for a reviewer's name (review WP-20 pass 6).
 */
function sentencePattern(sentence: string): RegExp {
  const escaped = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.replace(/\\\{(date|reviewer)\\\}/g, '[^.]+?'));
}

/**
 * The AI notice sentence a page must say (`trust.aiNotice.body*`), chosen the way `trustNotice()`
 * chooses it: "the sources below" only when the page lists sources of its own, and "{reviewer}
 * checked it" only when the status credits a person. With all four accepted, a page with no
 * sources could tell readers to check "the sources below" and still build (review WP-20 pass 5).
 * Without a shape, every variant is returned (used to recognise any notice at all).
 */
export function noticeSentences(locale: Locale, shape?: NoticeShape): RegExp[] {
  const dict = (locale === 'af' ? af : en) as { trust: { aiNotice: Record<string, string> } };
  const bodies = dict.trust.aiNotice;
  if (!shape) {
    return Object.entries(bodies)
      .filter(([key]) => key.startsWith('body'))
      .map(([, sentence]) => sentencePattern(sentence));
  }
  const key = shape.humanChecked
    ? shape.pageSources
      ? 'bodyHumanChecked'
      : 'bodyHumanCheckedNoPageSources'
    : shape.pageSources
      ? 'body'
      : 'bodyNoPageSources';
  return [sentencePattern(bodies[key] ?? '')];
}

/** The status sentence of a human check, as a pattern (`trust.status.humanChecked`). */
function humanStatus(locale: Locale): RegExp {
  const dict = (locale === 'af' ? af : en) as { trust: { status: Record<string, string> } };
  return sentencePattern(dict.trust.status['humanChecked'] ?? '');
}

function pageLocale(html: string): Locale {
  return /<html\b[^>]*\blang="af/.test(html) ? 'af' : 'en';
}

/**
 * What is missing from one page, as sentences. Empty when the page is not a document page.
 *
 * Checks content, not only structure (review WP-20 pass 3): the AI notice must carry its status
 * and the "How this was made" link, and "Sources for this page" must list at least one source, or
 * give a note of real length together with a link to the full register.
 */
export function trustProblems(html: string): string[] {
  const article = /<article\b[^>]*\bdata-kind="([^"]+)"/.exec(html);
  if (!article) return [];
  const problems: string[] = [];
  const kind = article[1] ?? '';
  if (!(TRUST_KINDS as readonly string[]).includes(kind)) {
    problems.push(`unknown document kind "${kind}"`);
  }
  const locale = pageLocale(html);
  const sourcesStart = html.search(/<section\b[^>]*aria-labelledby="sources-for-this-page"/);
  const section = sourcesStart === -1 ? '' : sliceElement(html, sourcesStart, 'section');
  // A listed source must say something: an empty `<li class="st-source">` lists nothing (pass 8).
  const listsSources = [...section.matchAll(/<li class="st-source"[^>]*>([\s\S]*?)<\/li>/g)].some(
    (entry) => textOf(entry[1] ?? '').length >= 3,
  );

  const header = /<article\b[^>]*>\s*<header\b[\s\S]*?<\/header>/.exec(
    html.slice(article.index),
  )?.[0];
  if (!header?.includes('st-ai-notice')) {
    problems.push('no AI notice in the article header');
  } else {
    const status = /<p class="st-ai-notice__status"[^>]*>([\s\S]*?)<\/p>/.exec(header)?.[1];
    if (status === undefined) problems.push('the AI notice has no status');
    const said = textOf(header);
    const shape: NoticeShape = {
      pageSources: listsSources,
      humanChecked: status !== undefined && humanStatus(locale).test(textOf(status)),
    };
    const says = (candidate: NoticeShape): boolean =>
      noticeSentences(locale, candidate).some((sentence) => sentence.test(said));
    if (!says(shape)) {
      problems.push(
        says({ ...shape, pageSources: !shape.pageSources })
          ? shape.pageSources
            ? 'the AI notice points at the register although the page lists its own sources'
            : 'the AI notice says "the sources below" but the page lists none'
          : says({ ...shape, humanChecked: !shape.humanChecked })
            ? 'the AI notice and its status disagree on who checked the page'
            : 'the AI notice does not say who wrote and checked the page',
      );
    }
    if (!/href="[^"]*\/start\/how-this-was-made\/"/.test(header)) {
      problems.push('the AI notice does not link "How this was made"');
    }
  }
  if (sourcesStart === -1) {
    problems.push('no "Sources for this page" section');
    return problems;
  }
  const note = /<p class="st-hint"[^>]*>([\s\S]*?)<\/p>/.exec(section)?.[1] ?? '';
  const linksRegister = /href="[^"]*\/sources\/"/.test(section);
  const isRegister = /\bdata-doc="lookup\/sources"/.test(html);
  if (!listsSources) {
    if (textOf(note).length < 30) {
      problems.push('"Sources for this page" lists nothing and has no note');
    }
    if (!linksRegister && !isRegister) {
      problems.push('"Sources for this page" does not link the register');
    }
  }
  return problems;
}

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

export interface LangText {
  readonly text: string;
  readonly lang: string;
  /** Inside `<code>`: a form code or a command, the same in every language. */
  readonly code?: true;
}

/**
 * Every visible text node of a page with the `lang` it inherits. A small walker, not a full parser:
 * enough for Astro's own output, which closes every element it opens. `<script>`, `<style>`,
 * `<svg>` and `<head>` contents are skipped.
 */
export function textNodesWithLang(html: string): LangText[] {
  const out: LangText[] = [];
  const stack: { tag: string; lang: string }[] = [];
  const inCode = (): boolean => stack.some((entry) => entry.tag === 'code');
  let skip = 0;
  const current = (): string => stack.at(-1)?.lang ?? '';
  for (const match of html.matchAll(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g)) {
    const token = match[0];
    if (token.startsWith('<!--')) continue;
    if (token.startsWith('</')) {
      const tag = token.slice(2, -1).trim().toLowerCase();
      const index = stack.map((entry) => entry.tag).lastIndexOf(tag);
      if (index !== -1) {
        if (['script', 'style', 'svg', 'head', 'template'].includes(tag))
          skip = Math.max(0, skip - 1);
        stack.length = index;
      }
      continue;
    }
    if (token.startsWith('<')) {
      const tag = (/^<([a-zA-Z][\w-]*)/.exec(token)?.[1] ?? '').toLowerCase();
      const lang = /\slang="([^"]*)"/.exec(token)?.[1];
      const selfClosing = VOID_ELEMENTS.has(tag) || token.endsWith('/>');
      if (selfClosing) continue;
      if (['script', 'style', 'svg', 'head', 'template'].includes(tag)) skip++;
      stack.push({ tag, lang: lang ?? current() });
      continue;
    }
    if (skip > 0) continue;
    const text = decodeEntities(token).replace(/\s+/g, ' ').trim();
    if (text !== '')
      out.push(inCode() ? { text, lang: current(), code: true } : { text, lang: current() });
  }
  return out;
}

/** Strings both dictionaries spell the same way: names, not words in either language. */
function sharedStrings(): Set<string> {
  const values = (tree: unknown, into: Set<string>): Set<string> => {
    if (typeof tree === 'string') into.add(tree);
    else if (tree && typeof tree === 'object') for (const v of Object.values(tree)) values(v, into);
    return into;
  };
  const english = values(en, new Set());
  return new Set([...values(af, new Set())].filter((value) => english.has(value)));
}

/**
 * Text CLAUDE.md requires to stay byte-identical in Afrikaans, so it is the same in both twins
 * without being English: numbers, rand amounts as the English markdown writes them ("R2.3 million"),
 * URLs and domain names, and codes: one all-caps token with a digit (VAT201, EMP201) or of at
 * most five letters (SARS, CIPC), or a short run of such tokens ("CC0 1.0"). Upper-case words
 * ("TAX INVOICE") are words, and are checked (review WP-20 passes 8, 9). Names such as "Google Drive"
 * cannot be told apart from English words, so `isProtectedText` takes them from TERMS-af.json.
 */
const LANGUAGE_NEUTRAL =
  /^(?:[^\p{L}]+|R ?[\d.,]+(?: million)?|\[\p{Lu}\]|(?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?|(?:(?:(?=[\p{Lu}\d&./-]*\d)[\p{Lu}\d&./-]{2,}|\p{Lu}{2,5})(?: |$))+)$/u;

/**
 * Names `scripts/translate/TERMS-af.json` keeps in English in every language (SARS, eFiling, Act
 * names, form codes), longest first so "WhatsApp Business" is removed before "WhatsApp".
 */
export const PROTECTED_NAMES: readonly string[] = [
  ...new Set([
    ...termsAf.keepVerbatim,
    ...termsAf.formCodes,
    ...termsAf.terms.filter((term) => term.keepVerbatim).map((term) => term.en),
  ]),
].sort((a, b) => b.length - a.length);

interface RegisterTitles {
  entries: readonly { id: string; title: string }[];
  acts: readonly { id: string; name: string }[];
}

/**
 * Register titles the Afrikaans translation kept exactly as the English register has them: the
 * translators' own decision that a title is a name to search for (named publications, secondary
 * titles, publishers, Act names), so it is the same on both twins without being untranslated.
 * Whole, plus the publisher before " — " or the first ", " ("Govchain", "Flip the Market"),
 * because the register's prose names the publisher alone. A title the translation changed is
 * never a name here (review WP-40 integration pass 1, major 1).
 */
export function registerNames(english: RegisterTitles, afrikaans: RegisterTitles): string[] {
  const names = new Set<string>(OTHER_NAMES);
  const kept = new Set([
    ...afrikaans.entries.map((entry) => `${entry.id}\u0000${entry.title}`),
    ...afrikaans.acts.map((act) => `${act.id}\u0000${act.name}`),
  ]);
  const add = (id: string, title: string, publisher: boolean): void => {
    if (!kept.has(`${id}\u0000${title}`)) return;
    names.add(title);
    // Only an entry's title starts with its publisher; an Act name's first word is a word
    // ("Foodstuffs, Cosmetics and Disinfectants Act"), not a name (integration pass 2, nit 2).
    const head = publisher ? title.split(/ — |, /)[0]?.trim() : undefined;
    if (head && head !== title) names.add(head);
  };
  for (const entry of english.entries) add(entry.id, entry.title, true);
  for (const act of english.acts) add(act.id, act.name, false);
  return [...names];
}

/**
 * Proper names the register's prose cites outside its titles (law firms, journals, regulators
 * named mid-sentence, institutions the style guide keeps in English), and official names the translation keeps in English (CIPC's
 * "Letter of Good Standing", WP-40 batch 2 and 3 notes).
 */
const OTHER_NAMES = [
  'Annual Review of Psychology',
  'B-BBEE Commission',
  'Financial Sector Conduct Authority',
  'Journal of the Academy of Marketing Science',
  'Letter of Good Standing',
  // The company line of every template keeps "Reg. No." in Afrikaans too (STYLE-GUIDE-af.md, the
  // template headers; WP-40 batch 0 notes). WP-32's form prints it as its own text run.
  'Reg. No.',
  'Shandu Attorneys',
  'Werksmans Attorneys',
];

/**
 * Words and labels spelled and meant the same in Afrikaans and English, so a twin that has them is
 * not untranslated: loanwords (Favicon, Odometer), product and file names (Pantone, Markdown,
 * Drive), and table labels that are Afrikaans too ("Was", "In Drive?", "Status in markdown:").
 * Each entry was read in context in WP-40 integration; add one only after doing the same.
 */
export const SAME_IN_AFRIKAANS: ReadonlySet<string> = new Set([
  // The payment-details row label of the invoices, "Bank" in both templates (WP-32).
  'Bank',
  'Dividend',
  'Drive',
  'Favicon',
  'In Drive?',
  'Km',
  'Markdown',
  'Odometer',
  'Pantone',
  'Pty',
  'Raster',
  'Status in Drive:',
  'Status in markdown:',
  'Was',
]);

/** Month names Afrikaans spells as English does, so "13 September 2026" is the same in both. */
const SAME_MONTHS = Object.entries(termsAf.months)
  .filter(([english, afrikaans]) => english === afrikaans)
  .map(([english]) => english);
const SAME_DATE = new RegExp(`\\b\\d{1,2} (?:${SAME_MONTHS.join('|')}) \\d{4}\\b`, 'g');

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True when text is made only of protected names, an Act's "68 of 2008", punctuation, and short
 * codes ("RWC / CoR", "SARS:", "Consumer Protection Act 68 of 2008."). Such text is the same on both
 * twins because the style guide keeps it, not because a translation is missing. A code here is a
 * `LANGUAGE_NEUTRAL` token or two to four letters with at least two capitals (CoR, PrDP).
 */
const namePatterns = new Map<string, RegExp>();
function namePattern(name: string): RegExp {
  let pattern = namePatterns.get(name);
  if (!pattern) {
    // Case-sensitive: "Tax calendar" in a sentence is words, not the title "SARS — Tax calendar".
    // A lower-case term-list name ("voetstoots") also matches with a capital, as a headword.
    const first = name.charAt(0);
    const head =
      first === first.toUpperCase() ? escapeRegExp(first) : `[${first}${first.toUpperCase()}]`;
    pattern = new RegExp(
      `(?<![\\p{L}\\d])${head}${escapeRegExp(name.slice(1))}(?![\\p{L}\\d])`,
      'gu',
    );
    namePatterns.set(name, pattern);
  }
  return pattern;
}

export function isProtectedText(text: string, names: readonly string[] = PROTECTED_NAMES): boolean {
  const patterns = (value: string): string =>
    value
      .replace(/\bRegulation R\d+ of \d{4}\b/g, ' ')
      .replace(/\b\d+ of \d{4}\b/g, ' ')
      .replace(/\b\d+ x \d+\b/g, ' ')
      .replace(SAME_DATE, ' ');
  const withoutNames = (value: string): string =>
    names.reduce((rest, name) => rest.replace(namePattern(name), ' '), value);
  // Both orders: a name can contain a pattern ("National Instruction 2 of 2016") and a pattern can
  // contain a name ("Regulation R638 of 2018", where removing "R638" first breaks the pattern).
  return [patterns(withoutNames(text)), withoutNames(patterns(text))].some(isNeutralResidue);
}

/** What is left of a text once its names and patterns are removed: only codes and punctuation. */
function isNeutralResidue(rest: string): boolean {
  const left = rest.trim();
  if (SAME_IN_AFRIKAANS.has(left) || SAME_IN_AFRIKAANS.has(left.replace(/[.,;]+$/, '')))
    return true;
  return rest
    .split(/[\s/]+/)
    .map((token) => token.replace(/^[(]+|[),.;:]+$/g, ''))
    .filter((token) => token !== '')
    .every(
      (token) =>
        !/\p{L}/u.test(token) ||
        LANGUAGE_NEUTRAL.test(token) ||
        /^(?=(?:\P{Lu}*\p{Lu}){2})\p{L}{2,4}$/u.test(token),
    );
}

/**
 * Language of parts on an Afrikaans page (build plan B5, WCAG 3.1.2; reviews WP-20 passes 6, 7), in
 * both directions: text marked Afrikaans that the English twin also has is English read with an
 * Afrikaans voice, and text marked English that the English twin lacks is Afrikaans read with an
 * English voice. Shared names, `<code>` and language-neutral text are skipped.
 */
export function langProblems(
  afHtml: string,
  enHtml: string,
  shared = sharedStrings(),
  names: readonly string[] = PROTECTED_NAMES,
): string[] {
  const english = new Set(textNodesWithLang(enHtml).map((node) => node.text));
  const found: string[] = [];
  const seen = new Set<string>();
  const report = (message: string): void => {
    if (seen.has(message)) return;
    seen.add(message);
    found.push(message);
  };
  for (const node of textNodesWithLang(afHtml)) {
    if (node.code || shared.has(node.text) || LANGUAGE_NEUTRAL.test(node.text)) continue;
    const inEnglish = english.has(node.text);
    // English text read with an Afrikaans voice: it inherits af-ZA and the English twin has it.
    const englishAsAfrikaans = node.lang.startsWith('af') && inEnglish;
    // Afrikaans text read with an English voice: it inherits en-ZA and the English twin lacks it,
    // as when a site line inside an English fallback block loses its own lang (review pass 7).
    const afrikaansAsEnglish = node.lang.startsWith('en') && !inEnglish;
    // Names are checked last, and only for a would-be finding: it is the slow test.
    if (!(englishAsAfrikaans || afrikaansAsEnglish) || isProtectedText(node.text, names)) continue;
    report(
      englishAsAfrikaans
        ? `English text marked as Afrikaans: "${node.text.slice(0, 60)}"`
        : `Afrikaans text marked as English: "${node.text.slice(0, 60)}"`,
    );
  }
  return found;
}

/** Protected names plus the register titles both languages share, longest first. */
export function namesForCheck(repoRoot = path.resolve('.')): string[] {
  const read = (lang: string): RegisterTitles | undefined => {
    const file = path.join(repoRoot, 'src', 'data', lang, 'sources.json');
    return existsSync(file)
      ? (JSON.parse(readFileSync(file, 'utf8')) as RegisterTitles)
      : undefined;
  };
  const english = read('en');
  const afrikaans = read('af');
  const shared = english && afrikaans ? registerNames(english, afrikaans) : [...OTHER_NAMES];
  return [...new Set([...PROTECTED_NAMES, ...shared])].sort((a, b) => b.length - a.length);
}

/** Document pages the build must contain: every manifest document in every enabled locale. */
export function expectedDocumentPages(repoRoot = path.resolve('.')): number {
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, 'src', 'data', 'manifest.json'), 'utf8'),
  ) as { docs: Record<string, unknown> };
  return Object.keys(manifest.docs).length * ENABLED_LOCALES.length;
}

export function runCli(
  distDir = path.resolve('dist'),
  base = normaliseBase(process.env.BASE_PATH),
  expected = expectedDocumentPages(),
): number {
  const root = resolveDistRoot(distDir, base);
  const failures: string[] = [];
  let documents = 0;
  const files = listFiles(root).filter((name) => name.endsWith('.html'));
  const shared = sharedStrings();
  const names = namesForCheck();
  let afPages = 0;
  for (const file of files) {
    const html = readFileSync(path.join(root, ...file.split('/')), 'utf8');
    // The design-system pages are an English reference, except the content gallery, which is
    // where the English-fallback state is still shown (review WP-40 integration pass 1).
    const reference =
      file.startsWith('af/design-system/') && !file.startsWith('af/design-system/content/');
    if (file.startsWith('af/') && !reference) {
      const twin = path.join(root, ...file.slice(3).split('/'));
      if (existsSync(twin)) {
        afPages++;
        for (const problem of langProblems(html, readFileSync(twin, 'utf8'), shared, names)) {
          failures.push(`/${routeOfHtmlFile(file)}: ${problem}`);
        }
      }
    }
    if (/<article\b[^>]*\bdata-kind="/.test(html)) documents++;
    for (const problem of trustProblems(html)) {
      failures.push(`/${routeOfHtmlFile(file)}: ${problem}`);
    }
  }
  if (failures.length > 0) {
    console.error(
      `dist:trust: D5 or language-of-parts problems:\n${failures.map((f) => `  - ${f}`).join('\n')}`,
    );
    return 1;
  }
  if (documents !== expected) {
    console.error(
      `dist:trust: found ${documents} document page(s), expected ${expected} ` +
        '(every manifest document in every enabled locale).',
    );
    return 1;
  }
  console.log(
    `dist:trust: ${documents} document page(s), each with its AI notice and sources; ` +
      `${afPages} Afrikaans page(s) with language of parts correct both ways.`,
  );
  return 0;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  process.exitCode = runCli();
}
