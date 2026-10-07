/**
 * Route discovery for the route-driven e2e suites (a11y, csp-and-network, nojs).
 *
 * Routes are site-relative paths without the base: `''` is the home page, `core/` a section,
 * `af/core/register/` an Afrikaans doc. Everything is read synchronously from `dist/` so specs can
 * generate one test per route at module scope.
 *
 * Environment:
 * - `BASE_PATH`: same normalisation as `astro.config.ts` and `playwright.config.ts`.
 * - `E2E_ROUTE_LIMIT`: optional deterministic sample size (evenly spaced over the sorted list).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  compareStrings,
  listFiles,
  normaliseBase,
  resolveDistRoot,
} from '../../../scripts/dist/audit-links';
import { PAGE_CHECK_EXCEPTIONS } from './exceptions';

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);
export const DEFAULT_DIST_DIR = path.join(REPO_ROOT, 'dist');

export interface RouteOptions {
  /** Build output directory. Default: `<repo>/dist`. */
  distDir?: string;
  /** Base path. Default: `BASE_PATH` or `/business-toolkit/`. */
  base?: string;
  /** Deterministic sample size. Default: no limit. */
  limit?: number | undefined;
}

/**
 * HTML files and routes that are intentionally absent from the sitemap.
 * - `404.html`: served by GitHub Pages for unknown URLs, never linked.
 * Any page with `<meta name="robots" content="noindex">` (or `none`) is excluded automatically.
 */
export const DOCUMENTED_EXCLUSIONS: readonly RegExp[] = [/^404\.html$/];

/**
 * Routes that must stay out of search engines: they are excluded from the sitemap only because they
 * are `noindex`, and the route check fails if they lose it.
 * - `design-system/` (both locales): live style reference, filtered in `astro.config.ts`.
 * - `find-my-path/result/…` (both locales): the wizard's no-JavaScript result pages (WP-31), which
 *   repeat the guide for one set of answers; filtered in `astro.config.ts`.
 */
export const NOINDEX_REQUIRED: readonly RegExp[] = [
  /^(af\/)?design-system\//,
  /^(af\/)?find-my-path\/result\//,
];

export class MissingBuildError extends Error {
  constructor(distDir: string) {
    super(
      `No build output at ${distDir}. Run \`pnpm build\` (with the same BASE_PATH) before the e2e suites, ` +
        'or use `pnpm test:e2e:dev` for suites that do not need dist/.',
    );
    this.name = 'MissingBuildError';
  }
}

function resolveOptions(options: RouteOptions): { root: string; base: string; limit?: number } {
  const distDir = options.distDir ?? DEFAULT_DIST_DIR;
  const base = options.base ?? normaliseBase(process.env.BASE_PATH);
  if (!existsSync(distDir)) throw new MissingBuildError(distDir);
  const resolved: { root: string; base: string; limit?: number } = {
    root: resolveDistRoot(distDir, base),
    base,
  };
  if (options.limit !== undefined) resolved.limit = options.limit;
  return resolved;
}

function sortUnique(routes: Iterable<string>): string[] {
  return [...new Set(routes)].sort(compareStrings);
}

/** Evenly spaced, deterministic sample that always keeps the first and last route. */
export function sampleRoutes(routes: readonly string[], limit?: number): string[] {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0 || limit >= routes.length) {
    return [...routes];
  }
  if (limit === 1) return routes.slice(0, 1);
  const step = (routes.length - 1) / (limit - 1);
  const picked = new Set<number>();
  for (let i = 0; i < limit; i++) picked.add(Math.round(i * step));
  return [...picked].sort((a, b) => a - b).map((index) => routes[index] as string);
}

export function routeLimitFromEnv(env: NodeJS.ProcessEnv = process.env): number | undefined {
  const raw = env.E2E_ROUTE_LIMIT?.trim();
  if (!raw) return undefined;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`E2E_ROUTE_LIMIT must be a positive integer, got "${raw}".`);
  }
  return limit;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Convert an absolute sitemap URL to a route, or throw when it is outside the base path. */
export function routeFromUrl(url: string, base: string): string {
  const { pathname } = new URL(url);
  if (!pathname.startsWith(base)) {
    throw new Error(
      `Sitemap URL ${url} is outside the base path ${base}. Build and test with the same BASE_PATH.`,
    );
  }
  return decodeURI(pathname.slice(base.length));
}

/** `<url><loc>` values of a urlset document (sitemap index entries are ignored). */
export function locsFromSitemap(xml: string): string[] {
  const locs: string[] = [];
  for (const match of xml.matchAll(/<url>[\s\S]*?<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    if (match[1]) locs.push(decodeXml(match[1]));
  }
  return locs;
}

/** Routes listed in `dist/**\/sitemap-*.xml`, sorted, optionally sampled. */
export function sitemapRoutes(options: RouteOptions = {}): string[] {
  const { root, base, limit } = resolveOptions(options);
  const sitemaps = listFiles(root).filter(
    (file) => /(^|\/)sitemap-[^/]*\.xml$/.test(file) && !file.endsWith('sitemap-index.xml'),
  );
  if (sitemaps.length === 0) {
    throw new Error(
      `No sitemap-*.xml under ${root}. Check that @astrojs/sitemap is enabled and run \`pnpm build\`.`,
    );
  }
  const routes = sortUnique(
    sitemaps.flatMap((file) =>
      locsFromSitemap(readFileSync(path.join(root, file), 'utf8')).map((loc) =>
        routeFromUrl(loc, base),
      ),
    ),
  );
  const built = (route: string): boolean =>
    existsSync(
      path.join(
        root,
        ...(route === '' || route.endsWith('/') ? `${route}index.html` : route).split('/'),
      ),
    );
  if (routes.length > 0 && !routes.some(built)) {
    throw new Error(
      `None of the ${routes.length} sitemap route(s) exists under ${root} (first: /${routes[0]}). ` +
        `The site was probably built with a different BASE_PATH than ${base}. Build and test with the same BASE_PATH.`,
    );
  }
  return sampleRoutes(routes, limit);
}

/** Route for a built HTML file: `index.html` -> `''`, `core/index.html` -> `core/`. */
export function routeFromHtmlFile(file: string): string {
  if (file === 'index.html') return '';
  if (file.endsWith('/index.html')) return file.slice(0, -'index.html'.length);
  return file;
}

/** Every built HTML page (`dist/**\/*.html`) as a route, sorted, optionally sampled. */
export function allHtmlRoutes(options: RouteOptions = {}): string[] {
  const { root, limit } = resolveOptions(options);
  const routes = listFiles(root)
    .filter((file) => file.endsWith('.html'))
    .map(routeFromHtmlFile);
  return sampleRoutes(sortUnique(routes), limit);
}

/** HTML file on disk for a route. */
export function htmlFileForRoute(route: string, options: RouteOptions = {}): string {
  const { root } = resolveOptions(options);
  const rel = route === '' || route.endsWith('/') ? `${route}index.html` : route;
  return path.join(root, ...rel.split('/'));
}

/** True for `<meta name="robots">` with a `noindex` or `none` directive. */
export function isNoindex(html: string): boolean {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\bname\s*=\s*["']?robots["'\s/>]/i.test(tag)) continue;
    const content = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const directives = (content?.[1] ?? content?.[2] ?? content?.[3] ?? '')
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);
    if (directives.includes('noindex') || directives.includes('none')) return true;
  }
  return false;
}

/** True when a route is intentionally missing from the sitemap. */
export function isExcludedFromSitemap(route: string, options: RouteOptions = {}): boolean {
  if (DOCUMENTED_EXCLUSIONS.some((pattern) => pattern.test(route))) return true;
  const file = htmlFileForRoute(route, options);
  return existsSync(file) && isNoindex(readFileSync(file, 'utf8'));
}

export interface RouteComparison {
  /** In the sitemap but no HTML file was built for it. */
  onlyInSitemap: string[];
  /** Built but not in the sitemap, and not a documented exclusion or noindex page. */
  onlyInHtml: string[];
  /** Built, not in the sitemap, and excluded on purpose. */
  excluded: string[];
}

export function compareRouteSources(
  sitemap: readonly string[],
  html: readonly string[],
  isExcluded: (route: string) => boolean,
): RouteComparison {
  const sitemapSet = new Set(sitemap);
  const htmlSet = new Set(html);
  const notInSitemap = sortUnique(html.filter((route) => !sitemapSet.has(route)));
  return {
    onlyInSitemap: sortUnique(sitemap.filter((route) => !htmlSet.has(route))),
    onlyInHtml: notInSitemap.filter((route) => !isExcluded(route)),
    excluded: notInSitemap.filter((route) => isExcluded(route)),
  };
}

/** Throw a readable error unless the sitemap and the built HTML agree. */
export function assertRoutesAgree(options: RouteOptions = {}): RouteComparison {
  const full = { ...options, limit: undefined };
  const comparison = compareRouteSources(sitemapRoutes(full), allHtmlRoutes(full), (route) =>
    isExcludedFromSitemap(route, full),
  );
  const problems: string[] = [];
  if (comparison.onlyInSitemap.length > 0) {
    problems.push(
      `In the sitemap but not built:\n${comparison.onlyInSitemap.map((r) => `  - /${r}`).join('\n')}`,
    );
  }
  if (comparison.onlyInHtml.length > 0) {
    problems.push(
      'Built but missing from the sitemap (add it, or mark it noindex and filter it in astro.config.ts):\n' +
        comparison.onlyInHtml.map((r) => `  - /${r}`).join('\n'),
    );
  }
  const noindexInSitemap = sitemapRoutes(full).filter((route) => {
    const file = htmlFileForRoute(route, full);
    return existsSync(file) && isNoindex(readFileSync(file, 'utf8'));
  });
  if (noindexInSitemap.length > 0) {
    problems.push(
      'Marked noindex but listed in the sitemap (filter it in astro.config.ts, or drop noindex):\n' +
        noindexInSitemap.map((r) => `  - /${r}`).join('\n'),
    );
  }
  const missingNoindex = allHtmlRoutes(full).filter((route) => {
    if (!NOINDEX_REQUIRED.some((pattern) => pattern.test(route))) return false;
    const file = htmlFileForRoute(route, full);
    return existsSync(file) && !isNoindex(readFileSync(file, 'utf8'));
  });
  if (missingNoindex.length > 0) {
    problems.push(
      'Must be <meta name="robots" content="noindex"> (NOINDEX_REQUIRED in tests/e2e/helpers/routes.ts):\n' +
        missingNoindex.map((r) => `  - /${r}`).join('\n'),
    );
  }
  if (problems.length > 0) throw new Error(problems.join('\n\n'));
  return comparison;
}

/**
 * Routes for the page-level suites: every sitemap route plus every built page that is excluded from
 * the sitemap on purpose (`404.html` and noindex pages such as `design-system/`), so every built
 * page gets the page checks. Sorted and sampled with `E2E_ROUTE_LIMIT`.
 */
export function pageRoutes(options: RouteOptions = {}): string[] {
  const full = { ...options, limit: undefined };
  const sitemap = sitemapRoutes(full);
  const sitemapSet = new Set(sitemap);
  const extra = allHtmlRoutes(full).filter(
    (route) => !sitemapSet.has(route) && isExcludedFromSitemap(route, full),
  );
  const all = sortUnique([...sitemap, ...extra]);
  const sampled = sampleRoutes(all, options.limit ?? routeLimitFromEnv());
  // Exempt routes always run, so a sample cannot hide a stale entry in exceptions.ts.
  const exempt = PAGE_CHECK_EXCEPTIONS.map((entry) => entry.route).filter((route) =>
    all.includes(route),
  );
  return sortUnique([...sampled, ...exempt]);
}

export interface DiscoveredRoutes {
  routes: string[];
  /** Set when route discovery is impossible but the run may continue (PW_DEV without dist/). */
  skipReason?: string;
}

/**
 * `pageRoutes()` for spec modules. Throws `MissingBuildError` when dist/ is missing, except under
 * `PW_DEV=1`, where route-driven specs skip instead so the dev-server run still works.
 */
export function discoverPageRoutes(options: RouteOptions = {}): DiscoveredRoutes {
  try {
    return { routes: pageRoutes(options) };
  } catch (error) {
    if (error instanceof MissingBuildError && process.env.PW_DEV === '1') {
      return {
        routes: [],
        skipReason: `${error.message} Route-driven specs are skipped under PW_DEV.`,
      };
    }
    throw error;
  }
}

/** True when the build produced `404.html`. Returns false when dist/ is missing. */
export function hasNotFoundPage(options: RouteOptions = {}): boolean {
  try {
    const { root } = resolveOptions(options);
    return existsSync(path.join(root, '404.html'));
  } catch (error) {
    if (error instanceof MissingBuildError) return false;
    throw error;
  }
}

/** Test title for a route. */
export function routeLabel(route: string): string {
  return `/${route}`;
}

/** Relative URL for `page.goto`, resolved against `use.baseURL` (which already ends in the base). */
export function routeUrl(route: string): string {
  return route === '' ? './' : encodeURI(route);
}
