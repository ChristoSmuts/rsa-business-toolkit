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
import { normaliseBase } from '../base-path';
import { listFiles, resolveDistRoot, routeOfHtmlFile } from './audit-links';

/** Document kinds whose pages D5 governs: every kind the content pipeline emits. */
export const TRUST_KINDS = ['guide', 'template', 'checklist', 'glossary', 'sources'] as const;

/** What is missing from one page, as sentences. Empty when the page is not a document page. */
export function trustProblems(html: string): string[] {
  const article = /<article\b[^>]*\bdata-kind="([^"]+)"/.exec(html);
  if (!article) return [];
  const problems: string[] = [];
  const kind = article[1] ?? '';
  if (!(TRUST_KINDS as readonly string[]).includes(kind)) {
    problems.push(`unknown document kind "${kind}"`);
  }
  const header = /<article\b[^>]*>\s*<header\b[\s\S]*?<\/header>/.exec(
    html.slice(article.index),
  )?.[0];
  if (!header?.includes('st-ai-notice')) problems.push('no AI notice in the article header');
  if (!/<section\b[^>]*aria-labelledby="sources-for-this-page"/.test(html)) {
    problems.push('no "Sources for this page" section');
  }
  return problems;
}

export function runCli(
  distDir = path.resolve('dist'),
  base = normaliseBase(process.env.BASE_PATH),
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
  if (documents === 0) {
    console.error('dist:trust: no document pages found, so nothing was checked.');
    return 1;
  }
  console.log(`dist:trust: ${documents} document page(s), each with its AI notice and sources.`);
  return 0;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  process.exitCode = runCli();
}
