/**
 * The ADR 0005 page security policy, as the single source for the e2e checks and the unit test that
 * compares it with `docs/adr/0005-security-headers-on-pages.md`.
 *
 * This module has no Playwright import, so the unit tests can load it.
 */

/** Exact Content-Security-Policy from ADR 0005 (Decision, first bullet). */
export const EXPECTED_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'";

/** Exact referrer policy from ADR 0005 (`<meta name="referrer" content="...">`). */
export const EXPECTED_REFERRER = 'strict-origin-when-cross-origin';

export interface ParsedCsp {
  /** Directive name (lower case) to its source list (lower case, de-duplicated, sorted). */
  directives: Map<string, string[]>;
  /** Directive names that appear more than once (browsers ignore every repeat). */
  duplicates: string[];
}

/**
 * Parse a policy the way browsers do for one policy: split on `;`, split each part on ASCII
 * whitespace, ignore empty parts, keep only the first occurrence of a directive. Directive names and
 * source expressions are compared case-insensitively.
 */
export function parseCsp(policy: string): ParsedCsp {
  const directives = new Map<string, string[]>();
  const duplicates: string[] = [];
  for (const part of policy.split(';')) {
    const tokens = part
      .trim()
      .split(/[\t\n\f\r ]+/)
      .filter(Boolean);
    const [rawName, ...values] = tokens;
    if (!rawName) continue;
    const name = rawName.toLowerCase();
    if (directives.has(name)) {
      duplicates.push(name);
      continue;
    }
    directives.set(name, [...new Set(values.map((value) => value.toLowerCase()))].sort());
  }
  return { directives, duplicates };
}

/**
 * Differences between `actual` and the ADR 0005 policy, as readable sentences. Empty when every
 * directive matches exactly: no missing or extra directive, no missing or extra source, no repeat.
 */
export function cspDifferences(actual: string, expected: string = EXPECTED_CSP): string[] {
  const want = parseCsp(expected).directives;
  const got = parseCsp(actual);
  const problems: string[] = [];
  for (const name of got.duplicates) {
    problems.push(`CSP directive ${name} appears more than once (browsers ignore the repeat)`);
  }
  for (const [name, sources] of want) {
    const actualSources = got.directives.get(name);
    if (!actualSources) {
      problems.push(`CSP ${name} is missing, expected "${sources.join(' ')}"`);
      continue;
    }
    const extra = actualSources.filter((source) => !sources.includes(source));
    const missing = sources.filter((source) => !actualSources.includes(source));
    if (extra.length > 0 || missing.length > 0) {
      problems.push(
        `CSP ${name} is "${actualSources.join(' ')}", expected "${sources.join(' ')}"` +
          (extra.length > 0 ? ` (extra: ${extra.join(' ')})` : '') +
          (missing.length > 0 ? ` (missing: ${missing.join(' ')})` : ''),
      );
    }
  }
  for (const name of got.directives.keys()) {
    if (!want.has(name)) problems.push(`CSP has extra directive ${name}, not in ADR 0005`);
  }
  return problems;
}
