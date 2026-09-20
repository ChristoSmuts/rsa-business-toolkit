/**
 * Page-level checks shared by the route-driven specs. Each collector returns a list of problems
 * (empty when the page passes); `enforceCheck` applies the exception list from `exceptions.ts`.
 */
import type { Page } from '@playwright/test';
import { NAVIGATIONAL_LINK_RELS } from '../../../scripts/dist/audit-links';
import { expect, test } from '../fixtures';
import { findException, PAGE_CHECK_DESCRIPTIONS, type PageCheck } from './exceptions';
import { cspDifferences, EXPECTED_REFERRER } from './policy';

export { EXPECTED_CSP, EXPECTED_REFERRER } from './policy';

export const MIN_MAIN_TEXT = 20;

const DATA_SCRIPT_TYPES = ['application/ld+json', 'application/json'];

/** `csp-meta`: one ADR 0005 CSP meta, in `<head>`, before any resource, with the exact policy. */
export async function cspMetaProblems(page: Page): Promise<string[]> {
  const { policies, outsideHead, comesFirst } = await page.evaluate(() => {
    const metas = Array.from(
      document.querySelectorAll('meta[http-equiv="Content-Security-Policy" i]'),
    );
    const firstResource = document.querySelector(
      'script, style, link[rel~="stylesheet" i], link[rel~="modulepreload" i], link[rel~="preload" i]',
    );
    const first = metas[0];
    return {
      policies: metas.map((meta) => meta.getAttribute('content') ?? ''),
      outsideHead: metas.filter((meta) => meta.parentElement !== document.head).length,
      comesFirst:
        !first ||
        !firstResource ||
        Boolean(first.compareDocumentPosition(firstResource) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  if (policies.length === 0) return ['no <meta http-equiv="Content-Security-Policy">'];
  const problems: string[] = [];
  if (policies.length > 1) problems.push(`${policies.length} CSP meta elements, expected 1`);
  if (outsideHead > 0) {
    problems.push('CSP meta must be a direct child of <head> (browsers ignore it elsewhere)');
  }
  problems.push(...cspDifferences(policies[0] ?? ''));
  if (!comesFirst) problems.push('CSP meta must come before scripts and stylesheets');
  return problems;
}

/** `referrer-meta`: one `<meta name="referrer" content="strict-origin-when-cross-origin">` in head. */
export async function referrerMetaProblems(page: Page): Promise<string[]> {
  const metas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('meta[name="referrer" i]')).map((meta) => ({
      content: meta.getAttribute('content') ?? '',
      inHead: meta.parentElement === document.head,
    })),
  );
  if (metas.length === 0) return [`no <meta name="referrer" content="${EXPECTED_REFERRER}">`];
  const problems: string[] = [];
  if (metas.length > 1) problems.push(`${metas.length} referrer meta elements, expected 1`);
  for (const meta of metas) {
    if (meta.content.trim().toLowerCase() !== EXPECTED_REFERRER) {
      problems.push(`referrer meta content is "${meta.content}", expected "${EXPECTED_REFERRER}"`);
    }
    if (!meta.inHead) problems.push('referrer meta must be a direct child of <head>');
  }
  return problems;
}

/** `no-base-element`: the site never needs `<base>`; it silently re-targets relative and `#` links. */
export async function baseElementProblems(page: Page): Promise<string[]> {
  return page
    .locator('base')
    .evaluateAll((elements) => elements.map((element) => `${element.outerHTML.slice(0, 160)}`));
}

export async function inlineScriptProblems(page: Page): Promise<string[]> {
  return page
    .locator('script:not([src])')
    .evaluateAll(
      (scripts, allowed) =>
        scripts
          .filter((s) => !allowed.includes((s.getAttribute('type') ?? '').trim().toLowerCase()))
          .map((s) => `inline script: ${s.outerHTML.slice(0, 160)}`),
      DATA_SCRIPT_TYPES,
    );
}

export function mainTextProblems(text: string): string[] {
  return text.length >= MIN_MAIN_TEXT
    ? []
    : [`<main> has ${text.length} character(s) ("${text.slice(0, 80)}"), needs ${MIN_MAIN_TEXT}`];
}

/**
 * URL problems in the rendered document. Not exceptionable. Reports:
 * - a same-origin URL (`href`, `xlink:href`, `src`, `srcset`, `imagesrcset`, `poster`, `data`,
 *   `ping`, `cite`, `action`, `formaction`, meta refresh) that is path-relative or outside the base,
 * - a `#fragment` link that does not resolve to the current document (for example because of
 *   `<base href>`),
 * - a form `action`/`formaction` or a meta refresh (any delay) to another origin,
 * - a resource or resource hint (`<link rel=preconnect|dns-prefetch|preload|...>`, `src`, `srcset`,
 *   `poster`, `data`, `ping`, SVG `href`) on another origin.
 * `<a>`, `<area>` and navigational `<link rel>` values (canonical, alternate, ...) may point anywhere.
 * The `<base>` element itself is the `no-base-element` check.
 */
export async function documentUrlProblems(page: Page, basePath: string): Promise<string[]> {
  return page.evaluate(
    ({ base, navigationalRels }) => {
      type Kind = 'navigation' | 'resource' | 'form' | 'refresh';
      const out: string[] = [];
      const here = location.href.split('#')[0];
      const splitSrcset = (value: string): string[] =>
        value
          .split(/,(?=\s)|,$/)
          .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
          .filter(Boolean);
      const refreshTarget = (content: string): string | null => {
        const match = /^\s*[\d.]*\s*[;,]\s*(?:url\s*=\s*)?(['"]?)(.*?)\1\s*$/i.exec(content);
        const url = match?.[2]?.trim();
        return url ? url : null;
      };
      const check = (element: Element, attribute: string, raw: string, kind: Kind): void => {
        const value = raw.replace(/[\t\n\r]/g, '').trim();
        if (value === '') return;
        const label = `<${element.localName} ${attribute}="${raw}">`;
        let url: URL;
        try {
          url = new URL(value, document.baseURI);
        } catch {
          out.push(`${label} is not a valid URL`);
          return;
        }
        if (value.startsWith('#')) {
          if (url.href.split('#')[0] !== here) {
            out.push(`${label} resolves to ${url.href}, not this page (check <base href>)`);
          }
          return;
        }
        const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase();
        if (scheme !== undefined && scheme !== 'http' && scheme !== 'https') return;
        if (url.origin !== location.origin) {
          if (kind === 'resource') out.push(`${label} loads from another origin (${url.origin})`);
          if (kind === 'form') {
            out.push(
              `${label} submits to another origin (${url.origin}); ADR 0005 form-action 'self'`,
            );
          }
          if (kind === 'refresh') out.push(`${label} refreshes to another origin (${url.origin})`);
          return;
        }
        if (value.startsWith('?')) return;
        const absolute = scheme !== undefined || value.startsWith('/');
        if (!absolute || !url.pathname.startsWith(base)) out.push(`${label} is outside ${base}`);
      };

      for (const element of Array.from(document.querySelectorAll('*'))) {
        const tag = element.localName.toLowerCase();
        if (tag === 'base') continue;
        for (const { name: attributeName, value } of Array.from(element.attributes)) {
          const name = attributeName.toLowerCase();
          if (name === 'href' || name === 'xlink:href') {
            let kind: Kind = 'navigation';
            if (tag === 'link') {
              const rels = (element.getAttribute('rel') ?? '')
                .toLowerCase()
                .split(/\s+/)
                .filter(Boolean);
              kind =
                rels.length > 0 && rels.every((rel) => navigationalRels.includes(rel))
                  ? 'navigation'
                  : 'resource';
            } else if (tag !== 'a' && tag !== 'area') {
              kind = 'resource';
            }
            check(element, name, value, kind);
          } else if (name === 'src' || name === 'poster' || (name === 'data' && tag === 'object')) {
            check(element, name, value, 'resource');
          } else if (name === 'srcset' || name === 'imagesrcset') {
            for (const candidate of splitSrcset(value)) check(element, name, candidate, 'resource');
          } else if (name === 'ping') {
            for (const candidate of value.split(/\s+/).filter(Boolean)) {
              check(element, name, candidate, 'resource');
            }
          } else if (name === 'action' || name === 'formaction') {
            check(element, name, value, 'form');
          } else if (name === 'cite') {
            check(element, name, value, 'navigation');
          } else if (
            name === 'content' &&
            tag === 'meta' &&
            (element.getAttribute('http-equiv') ?? '').trim().toLowerCase() === 'refresh'
          ) {
            const target = refreshTarget(value);
            if (target !== null) check(element, 'content', target, 'refresh');
          }
        }
      }
      return out;
    },
    { base: basePath, navigationalRels: [...NAVIGATIONAL_LINK_RELS] },
  );
}

/**
 * Fail on problems unless the route has an exception for the check. An exception that is no longer
 * needed (the page passes) fails too, so the list in `exceptions.ts` cannot go stale.
 */
export function enforceCheck(route: string, check: PageCheck, problems: readonly string[]): void {
  const label = `/${route}`;
  const exception = findException(route, check);
  if (!exception) {
    expect(problems, `${label} fails "${check}": ${PAGE_CHECK_DESCRIPTIONS[check]}`).toEqual([]);
    return;
  }
  if (problems.length === 0) {
    throw new Error(
      `Stale exception: ${label} now passes "${check}". Remove "${check}" for route "${route}" from ` +
        `tests/e2e/helpers/exceptions.ts (reason was: ${exception.reason}).`,
    );
  }
  test.info().annotations.push({
    type: `exception:${check}`,
    description: `${exception.reason} Expires: ${exception.expires} Current problems: ${problems.join('; ')}`,
  });
}
