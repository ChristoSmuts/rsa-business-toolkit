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
  const listsSources = /class="st-source"/.test(section);

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
 * URLs and domain names, and all-caps codes (VAT201, SARS, EMP201). Names such as "Google Drive"
 * cannot be told apart from English words; the translation package extends `sharedStrings` or this
 * pattern when its first document lands (backlog, review WP-20 pass 7).
 */
const LANGUAGE_NEUTRAL =
  /^(?:[^\p{L}]+|R[\d.,]+(?: million)?|(?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:\/\S*)?|[\p{Lu}\d][\p{Lu}\d /&.-]*)$/u;

/**
 * Language of parts on an Afrikaans page (build plan B5, WCAG 3.1.2; reviews WP-20 passes 6, 7), in
 * both directions: text marked Afrikaans that the English twin also has is English read with an
 * Afrikaans voice, and text marked English that the English twin lacks is Afrikaans read with an
 * English voice. Shared names, `<code>` and language-neutral text are skipped.
 */
export function langProblems(afHtml: string, enHtml: string, shared = sharedStrings()): string[] {
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
    if (node.lang.startsWith('af') && inEnglish) {
      report(`English text marked as Afrikaans: "${node.text.slice(0, 60)}"`);
    }
    // Afrikaans text read with an English voice: it inherits en-ZA and the English twin lacks it,
    // as when a site line inside an English fallback block loses its own lang (review pass 7).
    if (node.lang.startsWith('en') && !inEnglish) {
      report(`Afrikaans text marked as English: "${node.text.slice(0, 60)}"`);
    }
  }
  return found;
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
  let afPages = 0;
  for (const file of files) {
    const html = readFileSync(path.join(root, ...file.split('/')), 'utf8');
    if (file.startsWith('af/') && !file.startsWith('af/design-system/')) {
      const twin = path.join(root, ...file.slice(3).split('/'));
      if (existsSync(twin)) {
        afPages++;
        for (const problem of langProblems(html, readFileSync(twin, 'utf8'), shared)) {
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
