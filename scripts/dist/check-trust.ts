/**
 * `pnpm dist:trust`, run by `pnpm build` after `astro build`: build plan D5 checked on the
 * rendered pages, not only on the data.
 *
 * `Doc.astro` already refuses a document whose data has no sources and no note. That cannot catch a
 * layout that stops *rendering* the notice or the sources section, which would still build. So every
 * built page with a content `<article data-kind="…">` must contain the AI notice inside its header
 * and the "Sources for this page" section, and the build fails naming each page that does not.
 */
import { readFileSync } from 'node:fs';
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

/** Turns a dictionary sentence into a pattern with `{date}` and `{reviewer}` as wildcards. */
function sentencePattern(sentence: string): RegExp {
  const escaped = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.replace(/\\\{(date|reviewer)\\\}/g, '.+?'));
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
  for (const file of listFiles(root).filter((name) => name.endsWith('.html'))) {
    const html = readFileSync(path.join(root, ...file.split('/')), 'utf8');
    if (/<article\b[^>]*\bdata-kind="/.test(html)) documents++;
    for (const problem of trustProblems(html)) {
      failures.push(`/${routeOfHtmlFile(file)}: ${problem}`);
    }
  }
  if (failures.length > 0) {
    console.error(
      `dist:trust: build plan D5 is not met:\n${failures.map((f) => `  - ${f}`).join('\n')}`,
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
  console.log(`dist:trust: ${documents} document page(s), each with its AI notice and sources.`);
  return 0;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  process.exitCode = runCli();
}
