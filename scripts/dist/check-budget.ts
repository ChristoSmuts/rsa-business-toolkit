/**
 * `pnpm dist:budget`, run by `pnpm build`: the JavaScript budget of plan B3 flow 9 on every built
 * page, measured the way the reviews measure it. Every `<script src>` of the page and every chunk
 * it imports, each gzipped (level 9) on its own, summed.
 *
 * Two figures per page:
 * - **without a profile**: the scripts and their static imports;
 * - **with a profile**: also the chunks a reader with saved answers can load lazily
 *   (`PROFILE_CHUNKS`, the reading-path rules). They load once per content version, when the path
 *   stored on the device is out of date, so this is the worst page view such a reader has (review
 *   WP-31 pass 1, major 1).
 *
 * A document page (`<article data-kind>`) may load `DOC_BUDGET`, any other page `TOOL_BUDGET`, both
 * with a profile. The build fails when one is over, and prints the heaviest of each kind and how
 * much room is left, so the next package can see what it has.
 *
 * It also prints what loads only when the reader asks for it, which no page budget counts: every
 * other dynamic `import()` (today the search dialog's results code, the client and MiniSearch,
 * imported when search first opens), shared chunks counted once, and each search index
 * (`search/<lang>.<hash>.json`), fetched at the same moment (WP-33).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { normaliseBase } from '../base-path';
import { listFiles, resolveDistRoot, routeOfHtmlFile } from './audit-links';

export const DOC_BUDGET = 25 * 1024;
export const TOOL_BUDGET = 45 * 1024;
/** Chunks loaded lazily for a reader with saved answers. */
export const PROFILE_CHUNKS = /^path-data\.[^/]*\.js$/;

/** The `src` of every external script on a page, in order. */
export function pageScripts(html: string): string[] {
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
}

/** Static and dynamic imports of a bundled module (relative `.js` specifiers only). */
export function moduleImports(source: string): { static: string[]; dynamic: string[] } {
  const dynamic = [...source.matchAll(/import\(\s*["'`](\.{1,2}\/[^"'`]+\.js)["'`]\s*\)/g)].map(
    (match) => match[1] ?? '',
  );
  const all = [...source.matchAll(/(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"']+\.js)["']/g)].map(
    (match) => match[1] ?? '',
  );
  return { static: all, dynamic };
}

/**
 * Every file a page loads: the entry scripts and their static imports, plus the dynamic imports
 * `lazy` accepts (by file name) and everything those import.
 */
export function scriptGraph(
  entries: readonly string[],
  read: (file: string) => string,
  lazy: (file: string) => boolean = () => false,
): string[] {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.shift() ?? '';
    if (seen.has(file)) continue;
    seen.add(file);
    const imports = moduleImports(read(file));
    const resolve = (spec: string): string => path.posix.join(path.posix.dirname(file), spec);
    queue.push(...imports.static.map(resolve));
    queue.push(
      ...imports.dynamic.map(resolve).filter((target) => lazy(path.posix.basename(target))),
    );
  }
  return [...seen];
}

export interface PageWeight {
  readonly route: string;
  readonly document: boolean;
  readonly without: number;
  readonly withProfile: number;
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

export function runCli(
  distDir = path.resolve('dist'),
  base = normaliseBase(process.env.BASE_PATH),
): number {
  const root = resolveDistRoot(distDir, base);
  const sizes = new Map<string, number>();
  const read = (file: string): string => readFileSync(path.join(root, ...file.split('/')), 'utf8');
  const gz = (file: string): number => {
    let size = sizes.get(file);
    if (size === undefined) {
      size = gzipSync(readFileSync(path.join(root, ...file.split('/'))), { level: 9 }).length;
      sizes.set(file, size);
    }
    return size;
  };
  const toFile = (src: string): string | undefined => {
    const pathname = src.split(/[?#]/)[0] ?? '';
    if (!pathname.startsWith(base)) return undefined;
    const file = pathname.slice(base.length);
    return existsSync(path.join(root, ...file.split('/'))) ? file : undefined;
  };
  const pages: PageWeight[] = [];
  for (const file of listFiles(root).filter((name) => name.endsWith('.html'))) {
    const html = read(file);
    const entries = pageScripts(html).flatMap((src) => toFile(src) ?? []);
    const sum = (files: string[]): number => files.reduce((total, f) => total + gz(f), 0);
    pages.push({
      route: `/${routeOfHtmlFile(file)}`,
      document: /<article\b[^>]*\bdata-kind="/.test(html),
      without: sum(scriptGraph(entries, read)),
      withProfile: sum(scriptGraph(entries, read, (name) => PROFILE_CHUNKS.test(name))),
    });
  }
  reportOnDemand(root, read, gz);
  const over = pages.filter(
    (page) => page.withProfile > (page.document ? DOC_BUDGET : TOOL_BUDGET),
  );
  const heaviest = (document: boolean): PageWeight | undefined =>
    pages
      .filter((page) => page.document === document)
      .sort((a, b) => b.withProfile - a.withProfile)[0];
  for (const [label, page, budget] of [
    ['document', heaviest(true), DOC_BUDGET],
    ['other', heaviest(false), TOOL_BUDGET],
  ] as const) {
    if (!page) continue;
    console.log(
      `dist:budget: heaviest ${label} page ${page.route}: ${kb(page.without)} without a profile, ` +
        `${kb(page.withProfile)} with one (budget ${kb(budget)}, ${kb(budget - page.withProfile)} left).`,
    );
  }
  if (over.length > 0) {
    console.error(
      `dist:budget: over the JavaScript budget:\n${over
        .map((page) => `  - ${page.route}: ${kb(page.withProfile)} with a profile`)
        .join('\n')}`,
    );
    return 1;
  }
  console.log(`dist:budget: ${pages.length} page(s) within budget.`);
  return 0;
}

/** What loads only on demand (`onDemand`) and the search index files, printed by `runCli`. */
function reportOnDemand(
  root: string,
  read: (file: string) => string,
  gz: (file: string) => number,
): void {
  const astro = path.join(root, '_astro');
  if (existsSync(astro)) {
    const chunks = readdirSync(astro)
      .filter((name) => name.endsWith('.js'))
      .map((name) => `_astro/${name}`);
    const files = onDemand(chunks, read);
    const size = files.reduce((total, file) => total + gz(file), 0);
    console.log(
      `dist:budget: loaded on demand (dynamic import(), not in the page figures; today the search ` +
        `dialog): ${kb(size)} gzip (shared chunks counted once).`,
    );
  }
  const searchDir = path.join(root, 'search');
  if (existsSync(searchDir)) {
    for (const name of readdirSync(searchDir).filter((f) => f.endsWith('.json'))) {
      const body = readFileSync(path.join(searchDir, name));
      console.log(
        `dist:budget: search index ${name}: ${kb(body.length)} raw, ` +
          `${kb(gzipSync(body, { level: 9 }).length)} gzip.`,
      );
    }
  }
}

/**
 * Every file loaded by a dynamic `import()` in `chunks` other than the profile chunks (which the
 * page figures count), with its static imports.
 */
export function onDemand(chunks: readonly string[], read: (file: string) => string): string[] {
  const targets = chunks.flatMap((file) =>
    moduleImports(read(file))
      .dynamic.map((spec) => path.posix.join(path.posix.dirname(file), spec))
      .filter((target) => !PROFILE_CHUNKS.test(path.posix.basename(target))),
  );
  return scriptGraph([...new Set(targets)], read);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  process.exitCode = runCli();
}
