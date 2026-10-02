/**
 * `pnpm dist:budget`: the interactive JavaScript each built page loads before the reader does
 * anything, gzipped, against the budget of build plan B3 flow 9 and C2: 25 KB on document pages,
 * 45 KB on tool pages (the search page, the 404 page and the rest of the app pages).
 *
 * "Loads" means every `<script src>` on the page and every module those import statically. A
 * dynamic `import()` is left out on purpose: the search dialog's results code and MiniSearch are
 * imported only when the reader opens search, and the index (`search/<lang>.<hash>.json`) is data
 * fetched at that moment. Their sizes are printed separately, so the cost of opening search is on
 * record too.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

export const DOC_BUDGET = 25 * 1024;
export const TOOL_BUDGET = 45 * 1024;

const STATIC_IMPORT =
  /(?:\bimport|\bexport)\s*(?:[\w${}\s,*]+\s*from\s*)?["'`](\.{1,2}\/[^"'`]+\.js)["'`]/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["'`](\.{1,2}\/[^"'`]+\.js)["'`]\s*\)/g;
const SCRIPT_SRC = /<script\b[^>]*\bsrc="([^"]+)"/g;

export function gzipSize(source: string | Buffer): number {
  return gzipSync(source, { level: 9 }).length;
}

/** Static and dynamic imports of a built chunk, as paths relative to the chunk. */
export function chunkImports(source: string): {
  readonly static: string[];
  readonly dynamic: string[];
} {
  const dynamic = [...source.matchAll(DYNAMIC_IMPORT)].map((m) => m[1] ?? '');
  // Remove dynamic imports first so `import("./x.js")` is not read as a static one.
  const rest = source.replace(DYNAMIC_IMPORT, '');
  return { static: [...rest.matchAll(STATIC_IMPORT)].map((m) => m[1] ?? ''), dynamic };
}

/** Every file a set of entry scripts loads up front, following static imports. */
export function eagerFiles(entries: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    if (!file.endsWith('.js')) continue;
    for (const next of chunkImports(readFileSync(file, 'utf8')).static) {
      queue.push(path.resolve(path.dirname(file), next));
    }
  }
  return seen;
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.html'))
    .map((file) => path.join(dir, file))
    .filter((file) => statSync(file).isFile());
}

/** A document page carries `<article data-kind>` (Doc.astro); everything else is a tool page. */
export function isDocumentPage(html: string): boolean {
  return /<article\b[^>]*\bdata-kind=/.test(html);
}

function main(): void {
  const dist = path.resolve(process.argv[2] ?? 'dist');
  const base = (process.env['BASE_PATH'] ?? '/business-toolkit/').replace(/^\/*|\/*$/g, '');
  const toFile = (src: string): string =>
    path.join(dist, src.replace(/^\/+/, '').replace(new RegExp(`^${base}/`), ''));
  const worst = { doc: { size: 0, page: '' }, tool: { size: 0, page: '' } };
  const failures: string[] = [];
  for (const file of htmlFiles(dist)) {
    const html = readFileSync(file, 'utf8');
    const entries = [...html.matchAll(SCRIPT_SRC)].map((m) => toFile(m[1] ?? ''));
    let size = 0;
    for (const js of eagerFiles(entries)) size += gzipSize(readFileSync(js));
    const kind = isDocumentPage(html) ? 'doc' : 'tool';
    const budget = kind === 'doc' ? DOC_BUDGET : TOOL_BUDGET;
    const page = path.relative(dist, file);
    if (size > worst[kind].size) worst[kind] = { size, page };
    if (size > budget) failures.push(`${page}: ${String(size)} B gzip > ${String(budget)} B`);
  }
  const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;
  console.log(
    `dist:budget: largest document page ${kb(worst.doc.size)} gzip (${worst.doc.page}), budget ${kb(DOC_BUDGET)}; ` +
      `largest tool page ${kb(worst.tool.size)} gzip (${worst.tool.page}), budget ${kb(TOOL_BUDGET)}.`,
  );
  const astro = path.join(dist, '_astro');
  const lazy = new Set<string>();
  for (const name of readdirSync(astro).filter((f) => f.endsWith('.js'))) {
    for (const next of chunkImports(readFileSync(path.join(astro, name), 'utf8')).dynamic) {
      for (const file of eagerFiles([path.resolve(astro, next)])) lazy.add(file);
    }
  }
  const lazySize = [...lazy].reduce((sum, file) => sum + gzipSize(readFileSync(file)), 0);
  console.log(
    `dist:budget: imported when search opens: ${kb(lazySize)} gzip (shared chunks counted once).`,
  );
  const searchDir = path.join(dist, 'search');
  if (existsSync(searchDir)) {
    for (const name of readdirSync(searchDir).filter((f) => f.endsWith('.json'))) {
      const body = readFileSync(path.join(searchDir, name));
      console.log(
        `dist:budget: index ${name}: ${kb(body.length)} raw, ${kb(gzipSize(body))} gzip.`,
      );
    }
  }
  if (failures.length > 0) {
    console.error(`dist:budget: over budget:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
}

if (process.argv[1] !== undefined && import.meta.filename === path.resolve(process.argv[1])) main();
