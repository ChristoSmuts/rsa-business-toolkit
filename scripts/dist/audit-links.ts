/**
 * Post-build link audit for the static site in `dist/`.
 *
 * Parses every HTML file and fails with a list when:
 * - an internal URL does not start with the base path. URLs are read from `href`, `xlink:href`,
 *   `src`, `srcset`, `imagesrcset`, `action`, `formaction`, `poster`, `ping`, `cite`,
 *   `<object data>`, `<meta http-equiv="refresh">` and the Open Graph / Twitter URL `<meta>` tags
 *   (`og:url`, `og:image`, `twitter:image`, ...),
 * - an internal URL points at a file that does not exist in `dist/`, unless its route is listed in
 *   `KNOWN_FUTURE_ROUTES` (`tests/e2e/helpers/exceptions.ts`), which also fails once the route is
 *   built or nothing links to it any more,
 * - a `#fragment` does not match an `id` (or `<a name>`) in the target page,
 * - a page has a `<base>` element (unless `tests/e2e/helpers/exceptions.ts` exempts it from
 *   `no-base-element`), or a `#fragment` link that `<base href>` sends to another page,
 * - a resource or resource hint loads from another origin (`<link rel=preconnect|dns-prefetch|
 *   preload|modulepreload|prefetch|stylesheet|...>`, `src`, `srcset`, `poster`, `ping`, ...),
 * - a form `action`/`formaction` or a meta refresh points at another origin,
 * - an element carries an inline event handler (`onclick`, `onload`, ...),
 * - a `target="_blank"` element has no `rel="noopener"`,
 * - an external link uses plain `http:`,
 * - a URL uses `javascript:` (blocked by the ADR 0005 CSP, and dead without JavaScript).
 *
 * Not audited: CSS `url()` in `style` attributes and stylesheets. Cross-origin ones are blocked by
 * the CSP (and fail e2e as CSP violations); same-origin 404s show up as e2e console errors.
 *
 * Run with `pnpm dist:audit` (part of `pnpm build`). Environment:
 * - `BASE_PATH` (default `/business-toolkit/`, normalised like `astro.config.ts`)
 * - `SITE_URL` (default `https://example.github.io`); absolute URLs on this origin count as internal
 * - `DIST_DIR` (default `dist`)
 *
 * The HTML scanner is a small tokenizer, not a full parser. Astro emits well-formed HTML, and the
 * audit only needs start tags and their attributes, so a dependency such as parse5 is not needed.
 * It skips comments, doctype and the raw text of `<script>`, `<style>` and similar elements.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import {
  findException,
  KNOWN_FUTURE_ROUTES,
  overdueFutureRoutes,
  overdueWarningCommand,
  validateFutureRoutes,
  type FutureRoute,
} from '../../tests/e2e/helpers/exceptions';
import { DEFAULT_BASE, normaliseBase } from '../base-path';

export { DEFAULT_BASE, normaliseBase };

export type Rule =
  | 'base-path'
  | 'missing-target'
  | 'missing-fragment'
  | 'noopener'
  | 'insecure-http'
  | 'javascript-url'
  | 'base-element'
  | 'base-fragment'
  | 'third-party-resource'
  | 'external-form'
  | 'external-refresh'
  | 'inline-handler';

/**
 * Attribute names that begin with `on` but are not event handlers. Everything else that matches
 * `ON_PREFIXED` is reported, so a handler the HTML spec adds later fails closed. A hand-written list
 * of handler names failed open instead: it silently missed `onafterprint`, `onbeforeprint`,
 * `onlanguagechange`, `ongotpointercapture`, `onlostpointercapture` and `ondragexit` (review WP-22a
 * pass 4, m2), and this site has a print-sheet flow. Only add a name here with a reason.
 */
export const NOT_EVENT_HANDLER_ATTRIBUTES: readonly string[] = ['once', 'only', 'online'];

const ON_PREFIXED = /^on[a-z]+$/;

/**
 * True for an inline event-handler attribute (`onclick`, `onbeforeprint`, …). `script-src 'self'`
 * blocks them, and they are neither an inline `<script>` (checked by `no-inline-script`) nor a URL,
 * so nothing else in the harness would see one that never fires during a test. Attribute names
 * reach this already lower-cased by the tokenizer, so `ONCLICK` is caught too.
 */
export function isInlineHandlerAttribute(name: string): boolean {
  return ON_PREFIXED.test(name) && !NOT_EVENT_HANDLER_ATTRIBUTES.includes(name);
}

/**
 * `<link rel>` values that only describe a relation and make the browser fetch nothing. Every other
 * `rel` (stylesheet, icon, manifest, preconnect, dns-prefetch, preload, modulepreload, prefetch,
 * prerender, search, unknown values) counts as a resource.
 */
export const NAVIGATIONAL_LINK_RELS: readonly string[] = [
  'alternate',
  'author',
  'bookmark',
  'canonical',
  'external',
  'help',
  'license',
  'me',
  'next',
  'nofollow',
  'noopener',
  'noreferrer',
  'opener',
  'prev',
  'privacy-policy',
  'tag',
  'terms-of-service',
];

export interface Finding {
  /** Posix path of the HTML file, relative to the dist root. */
  file: string;
  line: number;
  tag: string;
  attr: string;
  value: string;
  rule: Rule;
  message: string;
}

export interface Tag {
  name: string;
  attrs: ReadonlyMap<string, string>;
  line: number;
}

export interface AuditContext {
  base: string;
  /** Origin of the deployed site (for example `https://example.github.io`), or null. */
  siteOrigin: string | null;
  /** Posix paths of every file in the dist root. */
  files: ReadonlySet<string>;
  /** Ids that can be targeted by a fragment in the given HTML file. */
  idsFor: (file: string) => ReadonlySet<string>;
  /** True when the HTML file may contain a `<base>` element (default: never). */
  baseElementAllowed?: (file: string) => boolean;
  /**
   * True when nothing needs to serve `pathname` yet (a `KNOWN_FUTURE_ROUTES` entry). Called only
   * for an internal URL under the base path that nothing in `dist/` serves; default: never.
   */
  missingTargetAllowed?: (pathname: string) => boolean;
}

export interface AuditResult {
  root: string;
  htmlFiles: number;
  urls: number;
  findings: Finding[];
  /**
   * Problems with the `KNOWN_FUTURE_ROUTES` list itself: an entry whose route is built now, one
   * that nothing links to any more, or a malformed entry. Each one fails the audit.
   */
  allowanceProblems: string[];
  /** Routes of the future-route entries that were actually used, sorted. */
  allowedMissing: string[];
}

export const DEFAULT_SITE_URL = 'https://example.github.io';

/** Route of a dist HTML file as used by `tests/e2e/helpers/exceptions.ts` (`index.html` -> `''`). */
export function routeOfHtmlFile(file: string): string {
  if (file === 'index.html') return '';
  if (file.endsWith('/index.html')) return file.slice(0, -'index.html'.length);
  return file;
}

/** `<base>` is allowed only for pages exempt from `no-base-element` in the e2e exception list. */
export function baseElementExempt(file: string): boolean {
  return findException(routeOfHtmlFile(file), 'no-base-element') !== undefined;
}

/** Convert Windows separators to forward slashes. */
export function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const { origin } = new URL(url);
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

/**
 * Astro can write the site either directly into `dist/` (the default, even with a base path) or
 * into `dist/<base>/`. Return whichever directory actually holds the site.
 */
export function resolveDistRoot(distDir: string, base: string): string {
  if (!existsSync(distDir)) {
    throw new Error(
      `No build output at ${distDir}. Run \`pnpm build\` first (with the same BASE_PATH).`,
    );
  }
  const rootHasSite =
    existsSync(path.join(distDir, 'index.html')) ||
    existsSync(path.join(distDir, 'sitemap-index.xml'));
  if (!rootHasSite && base !== '/') {
    const nested = path.join(distDir, ...base.split('/').filter(Boolean));
    if (existsSync(path.join(nested, 'index.html'))) return nested;
  }
  return distDir;
}

/** Every file below `dir`, as sorted posix paths relative to `dir`. */
export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(toPosixPath(path.relative(dir, full)));
    }
  };
  walk(dir);
  return out.sort(compareStrings);
}

export function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: String.fromCharCode(0xa0),
  // Punctuation that can spell a URL scheme or path (`&sol;`, `&colon;`, `&Tab;`, ...).
  sol: '/',
  bsol: '\\',
  colon: ':',
  period: '.',
  comma: ',',
  num: '#',
  quest: '?',
  equals: '=',
  commat: '@',
  excl: '!',
  percnt: '%',
  plus: '+',
  lowbar: '_',
  lpar: '(',
  rpar: ')',
  tab: '\t',
  newline: '\n',
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Elements whose content is raw text: tags inside them are not markup. */
const RAW_TEXT_ELEMENTS = new Set([
  'script',
  'style',
  'textarea',
  'title',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
]);

const isSpace = (ch: string | undefined): boolean =>
  ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r' || ch === '\f';

/** Extract start tags and their attributes from an HTML document. */
export function extractTags(html: string): Tag[] {
  const tags: Tag[] = [];
  const length = html.length;
  let line = 1;
  let lineCursor = 0;
  const lineAt = (index: number): number => {
    for (; lineCursor < index; lineCursor++) if (html.charCodeAt(lineCursor) === 10) line++;
    return line;
  };
  const skipPast = (needle: string, from: number): number => {
    const end = html.indexOf(needle, from);
    return end === -1 ? length : end + needle.length;
  };

  let i = 0;
  while (i < length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;
    const next = html[lt + 1];
    if (html.startsWith('<!--', lt)) {
      // `<!-->` and `<!--->` are complete (empty) comments in HTML.
      if (html.startsWith('<!-->', lt)) i = lt + 5;
      else if (html.startsWith('<!--->', lt)) i = lt + 6;
      else i = skipPast('-->', lt + 4);
      continue;
    }
    if (html.startsWith('<![CDATA[', lt)) {
      i = skipPast(']]>', lt + 9);
      continue;
    }
    if (next === '!' || next === '?' || next === '/') {
      i = skipPast('>', lt + 1);
      continue;
    }
    if (next === undefined || !/[a-z]/i.test(next)) {
      i = lt + 1;
      continue;
    }

    let j = lt + 1;
    while (j < length && !isSpace(html[j]) && html[j] !== '/' && html[j] !== '>') j++;
    const name = html.slice(lt + 1, j).toLowerCase();
    const attrs = new Map<string, string>();

    while (j < length) {
      while (j < length && (isSpace(html[j]) || html[j] === '/')) j++;
      if (j >= length) break;
      if (html[j] === '>') {
        j++;
        break;
      }
      const nameStart = j;
      while (j < length && !isSpace(html[j]) && !['/', '>', '='].includes(html[j] ?? '')) j++;
      if (j === nameStart) j++; // a stray '=' with no name: skip it
      const attrName = html.slice(nameStart, j).toLowerCase();
      while (j < length && isSpace(html[j])) j++;
      let value = '';
      if (html[j] === '=') {
        j++;
        while (j < length && isSpace(html[j])) j++;
        const quote = html[j];
        if (quote === '"' || quote === "'") {
          const end = html.indexOf(quote, j + 1);
          const stop = end === -1 ? length : end;
          value = html.slice(j + 1, stop);
          j = stop + 1;
        } else {
          const start = j;
          while (j < length && !isSpace(html[j]) && html[j] !== '>') j++;
          value = html.slice(start, j);
        }
      }
      // HTML keeps the first occurrence of a duplicated attribute.
      if (attrName && !attrs.has(attrName)) attrs.set(attrName, decodeEntities(value));
    }

    tags.push({ name, attrs, line: lineAt(lt) });
    i = j;

    if (RAW_TEXT_ELEMENTS.has(name)) {
      const closing = new RegExp(`</${name}[\\s/>]`, 'gi');
      closing.lastIndex = i;
      const match = closing.exec(html);
      i = match ? match.index : length;
    }
  }
  return tags;
}

/** Ids a fragment can target: every `id`, plus `name` on `<a>` (legacy anchors). */
export function collectIds(tags: readonly Tag[]): Set<string> {
  const ids = new Set<string>();
  for (const tag of tags) {
    const id = tag.attrs.get('id');
    if (id) ids.add(id);
    const name = tag.name === 'a' ? tag.attrs.get('name') : undefined;
    if (name) ids.add(name);
  }
  return ids;
}

/** URL candidates from a `srcset` value (descriptors dropped; commas inside URLs kept). */
export function parseSrcset(value: string): string[] {
  const urls: string[] = [];
  const length = value.length;
  let i = 0;
  while (i < length) {
    while (i < length && (isSpace(value[i]) || value[i] === ',')) i++;
    if (i >= length) break;
    const start = i;
    while (i < length && !isSpace(value[i])) i++;
    let url = value.slice(start, i);
    if (url.endsWith(',')) {
      url = url.replace(/,+$/, '');
    } else {
      let depth = 0;
      while (i < length) {
        const ch = value[i];
        i++;
        if (ch === '(') depth++;
        else if (ch === ')') depth = Math.max(0, depth - 1);
        else if (ch === ',' && depth === 0) break;
      }
    }
    if (url) urls.push(url);
  }
  return urls;
}

/** URL path at which a dist file is served, for example `core/index.html` -> `/base/core/`. */
export function documentUrlPath(file: string, base: string): string {
  const posix = toPosixPath(file).replace(/^\/+/, '');
  if (posix === 'index.html') return base;
  if (posix.endsWith('/index.html')) return `${base}${posix.slice(0, -'index.html'.length)}`;
  return `${base}${posix}`;
}

export type ClassifiedUrl =
  | { kind: 'skip' }
  | { kind: 'javascript' }
  | { kind: 'fragment'; fragment: string }
  | { kind: 'external'; protocol: string }
  | {
      kind: 'internal';
      pathname: string;
      fragment: string | null;
      /** True when the raw value is a path such as `core/` or `../x` rather than `/base/...`. */
      pathRelative: boolean;
    };

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const AUDIT_ORIGIN = 'http://audit.invalid';

/** Classify a raw attribute value relative to the page served at `documentPath`. */
export function classifyUrl(
  raw: string,
  options: { siteOrigin: string | null; documentPath: string },
): ClassifiedUrl {
  // Browsers strip ASCII tab and newline anywhere in a URL (`java<TAB>script:` is javascript:).
  const value = raw.replace(/[\t\n\r]/g, '').trim();
  if (value === '') return { kind: 'skip' };
  if (value.startsWith('#')) return { kind: 'fragment', fragment: value.slice(1) };

  const scheme = SCHEME.exec(value)?.[1]?.toLowerCase();
  let url: URL;
  try {
    if (scheme === 'http' || scheme === 'https') url = new URL(value);
    else if (scheme === 'javascript') return { kind: 'javascript' };
    else if (scheme !== undefined) return { kind: 'skip' };
    else if (value.startsWith('//')) url = new URL(`https:${value}`);
    else url = new URL(value, `${AUDIT_ORIGIN}${options.documentPath}`);
  } catch {
    return { kind: 'external', protocol: 'invalid' };
  }

  const isAbsolute = scheme !== undefined || value.startsWith('//');
  if (isAbsolute && url.origin !== options.siteOrigin) {
    return { kind: 'external', protocol: url.protocol };
  }
  const fragment = url.hash ? url.hash.slice(1) : null;
  return {
    kind: 'internal',
    pathname: url.pathname,
    fragment,
    pathRelative: !isAbsolute && !value.startsWith('/') && !value.startsWith('?'),
  };
}

/**
 * The dist file that GitHub Pages would serve for `pathname`, or null. Directory URLs map to
 * `index.html`; extensionless URLs may also match `<path>.html` or `<path>/index.html`.
 */
export function resolveTargetFile(
  pathname: string,
  base: string,
  files: ReadonlySet<string>,
): string | null {
  if (!pathname.startsWith(base)) return null;
  const encoded = pathname.slice(base.length);
  // A static host does not treat an encoded `/` or `\` as a path separator, so nothing is served.
  if (/%2f|%5c/i.test(encoded)) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(encoded);
  } catch {
    return null;
  }
  rel = toPosixPath(rel);
  const candidates =
    rel === '' || rel.endsWith('/')
      ? [`${rel}index.html`]
      : [rel, `${rel}/index.html`, `${rel}.html`];
  return candidates.find((candidate) => files.has(candidate)) ?? null;
}

function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

/** Fragments that never need a matching id. */
function fragmentAlwaysValid(fragment: string): boolean {
  return fragment === '' || fragment.toLowerCase() === 'top' || fragment.startsWith(':~:');
}

function fragmentExists(fragment: string, ids: ReadonlySet<string>): boolean {
  return fragmentAlwaysValid(fragment) || ids.has(fragment) || ids.has(decodeFragment(fragment));
}

const URL_ATTRIBUTES = [
  'href',
  'xlink:href',
  'src',
  'srcset',
  'imagesrcset',
  'action',
  'formaction',
  'poster',
  'ping',
  'cite',
] as const;

export type UrlKind = 'navigation' | 'resource' | 'form' | 'refresh';

/** What a URL in `attr` of `tag` does: navigate, load a resource, submit a form or refresh. */
export function urlKind(tag: Tag, attr: string): UrlKind {
  if (attr === 'action' || attr === 'formaction') return 'form';
  if (tag.name === 'meta') {
    return tag.attrs.get('http-equiv')?.trim().toLowerCase() === 'refresh'
      ? 'refresh'
      : 'navigation';
  }
  if (attr === 'href' || attr === 'xlink:href') {
    if (tag.name === 'a' || tag.name === 'area' || tag.name === 'base') return 'navigation';
    if (tag.name === 'link') {
      const rels = (tag.attrs.get('rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
      return rels.length > 0 && rels.every((rel) => NAVIGATIONAL_LINK_RELS.includes(rel))
        ? 'navigation'
        : 'resource';
    }
    return 'resource';
  }
  if (attr === 'cite') return 'navigation';
  return 'resource';
}

/** `<meta property|name>` keys whose `content` is a URL. */
const URL_META_KEYS =
  /^(og:(url|image|image:url|image:secure_url|video|video:url|video:secure_url|audio|audio:url|audio:secure_url)|twitter:(url|image|image:src|player))$/i;

/** URL in a meta refresh `content` value such as `0; url='/bt/x/'`, or null. */
export function refreshUrl(content: string): string | null {
  const match = /^\s*[\d.]*\s*[;,]\s*(?:url\s*=\s*)?(['"]?)(.*?)\1\s*$/i.exec(content);
  const url = match?.[2]?.trim();
  return url ? url : null;
}

/** Every URL-valued attribute of a tag, as `[attribute, value]` pairs (`srcset` split). */
export function urlCandidates(tag: Tag): Array<[attr: string, value: string]> {
  const out: Array<[string, string]> = [];
  for (const attr of URL_ATTRIBUTES) {
    const raw = tag.attrs.get(attr);
    if (raw === undefined) continue;
    const values =
      attr === 'srcset' || attr === 'imagesrcset'
        ? parseSrcset(raw)
        : attr === 'ping'
          ? raw.split(/[\t\n\f\r ]+/).filter(Boolean)
          : [raw];
    for (const value of values) out.push([attr, value]);
  }
  if (tag.name === 'object') {
    const data = tag.attrs.get('data');
    if (data !== undefined) out.push(['data', data]);
  }
  if (tag.name === 'meta') {
    const content = tag.attrs.get('content');
    if (content !== undefined) {
      const key = tag.attrs.get('property') ?? tag.attrs.get('name') ?? '';
      if (tag.attrs.get('http-equiv')?.trim().toLowerCase() === 'refresh') {
        const url = refreshUrl(content);
        if (url !== null) out.push(['content', url]);
      } else if (URL_META_KEYS.test(key.trim())) {
        out.push(['content', content]);
      }
    }
  }
  return out;
}

/** Audit a single HTML document. `file` is its posix path relative to the dist root. */
export function auditDocument(
  file: string,
  tags: readonly Tag[],
  context: AuditContext,
): { urls: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const documentPath = documentUrlPath(file, context.base);
  const ownIds = context.idsFor(file);
  let urls = 0;

  // Browsers resolve relative URLs against the first <base> that has an href.
  const baseTag = tags.find((tag) => tag.name === 'base' && tag.attrs.has('href'));
  let relativeTo: string | null = documentPath;
  if (baseTag) {
    const resolved = classifyUrl(baseTag.attrs.get('href') ?? '', {
      siteOrigin: context.siteOrigin,
      documentPath,
    });
    if (resolved.kind === 'internal') relativeTo = resolved.pathname;
    else if (resolved.kind === 'external') relativeTo = null;
  }
  const baseAllowed = context.baseElementAllowed?.(file) ?? false;

  for (const tag of tags) {
    const report = (attr: string, value: string, rule: Rule, message: string): void => {
      findings.push({ file, line: tag.line, tag: tag.name, attr, value, rule, message });
    };

    if (tag.name === 'base' && !baseAllowed) {
      report(
        'href',
        tag.attrs.get('href') ?? '',
        'base-element',
        '<base> re-targets relative and #fragment links; remove it (or exempt the route from "no-base-element" in tests/e2e/helpers/exceptions.ts)',
      );
    }

    for (const [attr, value] of tag.attrs) {
      if (!isInlineHandlerAttribute(attr)) continue;
      report(
        attr,
        value,
        'inline-handler',
        "inline event handlers are blocked by script-src 'self'; attach the listener in an st-* custom element instead",
      );
    }

    const target = tag.attrs.get('target');
    if (target?.trim().toLowerCase() === '_blank') {
      const rel = (tag.attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
      if (!rel.includes('noopener')) {
        report(
          'rel',
          tag.attrs.get('rel') ?? '',
          'noopener',
          'target="_blank" needs rel="noopener"',
        );
      }
    }

    for (const [attr, value] of urlCandidates(tag)) {
      urls++;
      const stripped = value.replace(/[\t\n\r]/g, '').trim();
      const relative = stripped !== '' && !SCHEME.test(stripped) && !stripped.startsWith('/');
      if (baseTag && tag !== baseTag && relative && relativeTo !== documentPath) {
        if (stripped.startsWith('#') || relativeTo === null) {
          report(
            attr,
            value,
            'base-fragment',
            `resolves against <base href="${baseTag.attrs.get('href') ?? ''}"> to ${relativeTo ?? 'another origin'}, not this page`,
          );
          continue;
        }
      }
      const url = classifyUrl(value, {
        siteOrigin: context.siteOrigin,
        documentPath: tag === baseTag ? documentPath : (relativeTo ?? documentPath),
      });
      if (url.kind === 'skip') continue;

      if (url.kind === 'javascript') {
        report(
          attr,
          value,
          'javascript-url',
          "javascript: URLs are blocked by script-src 'self' and do nothing without JavaScript",
        );
        continue;
      }

      if (url.kind === 'external') {
        const kind = urlKind(tag, attr);
        if (kind === 'form') {
          report(
            attr,
            value,
            'external-form',
            "form submits to another origin; ADR 0005 form-action 'self' blocks it",
          );
        } else if (kind === 'refresh') {
          report(attr, value, 'external-refresh', 'meta refresh to another origin (at any delay)');
        } else if (kind === 'resource') {
          report(
            attr,
            value,
            'third-party-resource',
            'resource or resource hint on another origin; the site makes no third-party requests (ADR 0005)',
          );
        } else if (url.protocol === 'http:') {
          report(attr, value, 'insecure-http', 'external link uses http:, use https:');
        }
        continue;
      }

      if (url.kind === 'fragment') {
        if (!fragmentExists(url.fragment, ownIds)) {
          report(
            attr,
            value,
            'missing-fragment',
            `no element with id "${url.fragment}" on this page`,
          );
        }
        continue;
      }

      if (url.pathRelative || !url.pathname.startsWith(context.base)) {
        report(
          attr,
          value,
          'base-path',
          `internal URL must start with ${context.base} (use href() from src/lib/paths.ts)`,
        );
        continue;
      }

      const targetFile = resolveTargetFile(url.pathname, context.base, context.files);
      if (targetFile === null) {
        // A route that no package builds yet (KNOWN_FUTURE_ROUTES). The fragment cannot be checked
        // against a page that does not exist; the entry itself is checked in `auditDist`.
        if (context.missingTargetAllowed?.(url.pathname) !== true) {
          report(attr, value, 'missing-target', `nothing in dist serves ${url.pathname}`);
        }
        continue;
      }

      if (url.fragment !== null && targetFile.endsWith('.html')) {
        if (!fragmentExists(url.fragment, context.idsFor(targetFile))) {
          report(
            attr,
            value,
            'missing-fragment',
            `no element with id "${url.fragment}" in ${targetFile}`,
          );
        }
      }
    }
  }
  return { urls, findings };
}

/** Audit every HTML file under `root` (already resolved with `resolveDistRoot`). */
export function auditDist(
  root: string,
  options: {
    base: string;
    siteOrigin: string | null;
    baseElementAllowed?: (file: string) => boolean;
    /** Routes that may be missing for now. Default: none, so every broken link is reported. */
    futureRoutes?: readonly FutureRoute[];
  },
): AuditResult {
  const allFiles = listFiles(root);
  const files = new Set(allFiles);
  const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
  const tagsByFile = new Map<string, Tag[]>();
  const idsByFile = new Map<string, Set<string>>();

  const tagsFor = (file: string): Tag[] => {
    let tags = tagsByFile.get(file);
    if (!tags) {
      tags = extractTags(readFileSync(path.join(root, file), 'utf8'));
      tagsByFile.set(file, tags);
    }
    return tags;
  };
  const idsFor = (file: string): ReadonlySet<string> => {
    let ids = idsByFile.get(file);
    if (!ids) {
      ids = files.has(file) ? collectIds(tagsFor(file)) : new Set();
      idsByFile.set(file, ids);
    }
    return ids;
  };

  const futureRoutes = options.futureRoutes ?? [];
  /** Allowed pathname -> its entry, for the `missing-target` skip and the staleness checks. */
  const allowed = new Map<string, FutureRoute>(
    futureRoutes.map((entry) => [`${options.base}${entry.route}`, entry]),
  );
  const used = new Set<string>();

  const context: AuditContext = {
    ...options,
    files,
    idsFor,
    missingTargetAllowed: (pathname) => {
      if (!allowed.has(pathname)) return false;
      used.add(pathname);
      return true;
    },
  };
  const findings: Finding[] = [];
  let urls = 0;
  for (const file of htmlFiles) {
    const result = auditDocument(file, tagsFor(file), context);
    urls += result.urls;
    findings.push(...result.findings);
  }
  findings.sort(
    (a, b) => compareStrings(a.file, b.file) || a.line - b.line || compareStrings(a.value, b.value),
  );

  // An allowance must fail once it is no longer needed, exactly like a stale page check exception.
  const allowanceProblems = validateFutureRoutes(futureRoutes);
  for (const [pathname, entry] of allowed) {
    if (resolveTargetFile(pathname, options.base, files) !== null) {
      allowanceProblems.push(
        `route "${entry.route}" is built now (dist serves ${pathname}), so it is no longer a ` +
          `future route: remove the entry from KNOWN_FUTURE_ROUTES (${entry.expires})`,
      );
    } else if (!used.has(pathname)) {
      allowanceProblems.push(
        `nothing in dist links to "${entry.route}" any more, so the allowance is unused: remove ` +
          `the entry from KNOWN_FUTURE_ROUTES (it was there for: ${entry.reason})`,
      );
    }
  }

  return {
    root,
    htmlFiles: htmlFiles.length,
    urls,
    findings,
    allowanceProblems,
    allowedMissing: [...used]
      .map((pathname) => allowed.get(pathname)?.route ?? pathname)
      .sort(compareStrings),
  };
}

export function formatFindings(findings: readonly Finding[], distLabel = 'dist'): string {
  const counts = new Map<Rule, number>();
  for (const finding of findings) counts.set(finding.rule, (counts.get(finding.rule) ?? 0) + 1);
  const lines = findings.map(
    (f) =>
      `  ${distLabel}/${f.file}:${f.line}  [${f.rule}] <${f.tag} ${f.attr}="${f.value}">  ${f.message}`,
  );
  const summary = [...counts.entries()].map(([rule, count]) => `${rule}: ${count}`).join(', ');
  return `${lines.join('\n')}\n\n${findings.length} problem(s) (${summary})`;
}

/** CLI entry point. Returns the process exit code. */
export function runCli(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  write: { out: (text: string) => void; err: (text: string) => void } = {
    out: (text) => process.stdout.write(`${text}\n`),
    err: (text) => process.stderr.write(`${text}\n`),
  },
  futureRoutes: readonly FutureRoute[] = KNOWN_FUTURE_ROUTES,
): number {
  const base = normaliseBase(env.BASE_PATH);
  const siteOrigin = originOf(env.SITE_URL ?? DEFAULT_SITE_URL);
  const distDir = path.resolve(cwd, env.DIST_DIR ?? 'dist');

  let root: string;
  try {
    root = resolveDistRoot(distDir, base);
  } catch (error) {
    write.err(`dist:audit: ${(error as Error).message}`);
    return 1;
  }

  const result = auditDist(root, {
    base,
    siteOrigin,
    baseElementAllowed: baseElementExempt,
    futureRoutes,
  });
  const label = toPosixPath(path.relative(cwd, root)) || '.';
  if (result.htmlFiles === 0) {
    write.err(`dist:audit: no HTML files under ${label}. Did the build fail?`);
    return 1;
  }
  let failed = false;
  if (result.findings.length > 0) {
    write.err(
      `dist:audit: link problems in ${result.htmlFiles} HTML file(s) (base ${base}):\n${formatFindings(result.findings, label)}`,
    );
    failed = true;
  }
  if (result.allowanceProblems.length > 0) {
    write.err(
      'dist:audit: stale KNOWN_FUTURE_ROUTES entr(ies) in tests/e2e/helpers/exceptions.ts:\n' +
        result.allowanceProblems.map((problem) => `  - ${problem}`).join('\n'),
    );
    failed = true;
  }
  if (failed) return 1;

  // A review date that has passed is a warning, not a failure (see exceptions.ts). In CI it also
  // goes out as a workflow command, so it reaches the summary of a green run.
  for (const overdue of overdueFutureRoutes(futureRoutes)) {
    write.out(`dist:audit: overdue known-future route: ${overdue}`);
    if (env.CI) write.out(overdueWarningCommand(overdue, 'Overdue known-future route'));
  }
  const allowed =
    result.allowedMissing.length === 0
      ? ''
      : ` ${result.allowedMissing.length} route(s) not built yet, allowed to be missing by ` +
        `KNOWN_FUTURE_ROUTES (tests/e2e/helpers/exceptions.ts): ${result.allowedMissing.join(', ')}.`;
  write.out(
    `dist:audit: ${result.htmlFiles} HTML file(s), ${result.urls} URL(s) checked under base ${base}. No problems.${allowed}`,
  );
  return 0;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(path.resolve(invokedPath)).href) {
  process.exitCode = runCli();
}
