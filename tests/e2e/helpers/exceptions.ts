/**
 * The single, reviewed list of pages that may skip a page-level check, and of routes that are
 * correct to link to but that no package builds yet (`KNOWN_FUTURE_ROUTES`, below).
 *
 * Every built HTML page must pass every check in `PAGE_CHECKS`. A page is exempt only when it has an
 * entry here. Rules, enforced by `validateExceptions()` (unit test) and by the e2e specs:
 * - `route` is a site-relative route as used by `tests/e2e/helpers/routes.ts` (`''` is the home page).
 * - `checks` lists only the checks that actually fail for the page today.
 * - `reason` says why, `expires` says which change removes the entry, and the optional `expiresOn`
 *   (`YYYY-MM-DD`) is a review date that `overdueExceptions()` reports once it has passed.
 * - When an exempt page starts to pass a check, the e2e test fails with "Stale exception", so the
 *   entry must be removed. An entry whose route is not built also fails (`page contract` spec).
 *
 * This module has no Playwright import, so the unit tests can validate it.
 */

export const PAGE_CHECKS = [
  'csp-meta',
  'referrer-meta',
  'no-base-element',
  'no-inline-script',
  'nojs-min-text',
] as const;
export type PageCheck = (typeof PAGE_CHECKS)[number];

export const PAGE_CHECK_DESCRIPTIONS: Readonly<Record<PageCheck, string>> = {
  'csp-meta':
    'one <meta http-equiv="Content-Security-Policy"> in <head>, before any script or style, with exactly the ADR 0005 policy',
  'referrer-meta':
    'one <meta name="referrer" content="strict-origin-when-cross-origin"> in <head> (ADR 0005)',
  'no-base-element': 'no <base> element (it re-targets relative and #fragment links)',
  'no-inline-script': "no inline <script> (breaks script-src 'self')",
  'nojs-min-text': '<main> has at least 20 characters of text without JavaScript',
};

export interface PageCheckException {
  route: string;
  checks: readonly PageCheck[];
  reason: string;
  /** Which change removes the entry, in words. */
  expires: string;
  /**
   * Optional review date, `YYYY-MM-DD`. An entry whose date has passed is reported by
   * `overdueExceptions()`: the chromium `page check exceptions` test annotates it, so an entry whose
   * "expiring" change never lands is noticed instead of living forever. It does not fail the run:
   * a date alone is no reason to break the build for everyone on one morning.
   */
  expiresOn?: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date in `YYYY-MM-DD` form. */
export function isIsoDate(value: string): boolean {
  const parts = ISO_DATE.exec(value);
  if (!parts) return false;
  const [year, month, day] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Empty, and that is the goal state. The one entry it held (the placeholder home page, with no meta
 * CSP, no referrer meta and a 19-character `<main>`) was removed when the design system merged and
 * `src/pages/index.astro` started rendering through `Base.astro`: the stale-exception check failed
 * until it went, which is exactly what that check is for.
 */
export const PAGE_CHECK_EXCEPTIONS: readonly PageCheckException[] = [];

/** GitHub Actions workflow-command form of an overdue warning (`::warning …`), one line. */
export function overdueWarningCommand(
  message: string,
  title = 'Overdue page check exception',
): string {
  const escaped = message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  return `::warning title=${title}::${escaped}`;
}

export function findException(
  route: string,
  check: PageCheck,
  exceptions: readonly PageCheckException[] = PAGE_CHECK_EXCEPTIONS,
): PageCheckException | undefined {
  return exceptions.find((entry) => entry.route === route && entry.checks.includes(check));
}

/** Problems with the list itself, as readable sentences. Empty when the list is valid. */
export function validateExceptions(
  exceptions: readonly PageCheckException[] = PAGE_CHECK_EXCEPTIONS,
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const known: readonly string[] = PAGE_CHECKS;
  exceptions.forEach((entry, index) => {
    const label = `exception ${index + 1} (route "${entry.route}")`;
    if (entry.route.startsWith('/')) {
      problems.push(`${label}: route must be site-relative without a leading slash`);
    }
    if (seen.has(entry.route)) problems.push(`${label}: duplicate route, merge the entries`);
    seen.add(entry.route);
    if (entry.checks.length === 0) problems.push(`${label}: checks is empty, remove the entry`);
    for (const check of entry.checks) {
      if (!known.includes(check)) problems.push(`${label}: unknown check "${check}"`);
    }
    if (new Set(entry.checks).size !== entry.checks.length) {
      problems.push(`${label}: a check is listed twice`);
    }
    if (entry.reason.trim().length < 10) problems.push(`${label}: reason is missing or too short`);
    if (entry.expires.trim().length < 10) {
      problems.push(`${label}: expires is missing or too short (say which change removes it)`);
    }
    if (entry.expiresOn !== undefined && !isIsoDate(entry.expiresOn)) {
      problems.push(
        `${label}: expiresOn must be a date in YYYY-MM-DD form, got "${entry.expiresOn}"`,
      );
    }
  });
  return problems;
}

/**
 * Routes that a built page links to on purpose although nothing in `dist/` serves them yet, because
 * the package that builds them has not landed. `pnpm dist:audit` skips `missing-target` for exactly
 * these URLs and for nothing else.
 *
 * The allowance is designed to delete itself. `auditDist` fails, with the entry named, as soon as
 * either half of its reason stops being true:
 * - the route **is** built now (the link resolves, so the entry is doing nothing);
 * - **nothing links to it** any more (the entry is doing nothing either way).
 *
 * That is the same rule as the "Stale exception" check for page checks: an exception that is no
 * longer needed fails until it is removed, so the list cannot rot into a silent
 * "ignore missing links" switch. `expiresOn` adds a review date on top, reported as a warning.
 *
 * Do not add an entry to make a wrong link pass. A link to a route no package will ever build is a
 * bug in the page, not a gap in the audit.
 */
export interface FutureRoute {
  /** Site-relative route without a leading slash, exactly as it will be built (`af/core/x/`). */
  route: string;
  /** Which page links to it today, and why that link is already correct. */
  reason: string;
  /** Which change removes the entry, in words. */
  expires: string;
  /** Optional review date, `YYYY-MM-DD`, reported by `overdueFutureRoutes()` once it has passed. */
  expiresOn?: string;
}

/**
 * Empty, and that is the goal state. Every route in build plan B1 is built: WP-20 built all but the
 * wizard and My path, and WP-31 built those two (and turned `WIZARD_AVAILABLE` on, so pages link to
 * them again). The generated list milestone 1 needed deleted itself the way it was designed to:
 * the audit failed on each entry whose route had been built.
 */
export const KNOWN_FUTURE_ROUTES: readonly FutureRoute[] = [];

/** Problems with the future-route list itself, as readable sentences. Empty when it is valid. */
export function validateFutureRoutes(
  routes: readonly FutureRoute[] = KNOWN_FUTURE_ROUTES,
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  routes.forEach((entry, index) => {
    const label = `future route ${index + 1} ("${entry.route}")`;
    if (entry.route.trim() === '') problems.push(`${label}: route is empty`);
    if (entry.route.startsWith('/')) {
      problems.push(`${label}: route must be site-relative without a leading slash`);
    }
    if (seen.has(entry.route)) problems.push(`${label}: duplicate route, merge the entries`);
    seen.add(entry.route);
    if (entry.reason.trim().length < 10) problems.push(`${label}: reason is missing or too short`);
    if (entry.expires.trim().length < 10) {
      problems.push(`${label}: expires is missing or too short (say which change removes it)`);
    }
    if (entry.expiresOn !== undefined && !isIsoDate(entry.expiresOn)) {
      problems.push(
        `${label}: expiresOn must be a date in YYYY-MM-DD form, got "${entry.expiresOn}"`,
      );
    }
  });
  return problems;
}

/** Warnings for future routes whose optional `expiresOn` date has passed. Not a failure. */
export function overdueFutureRoutes(
  routes: readonly FutureRoute[] = KNOWN_FUTURE_ROUTES,
  today: string = new Date().toISOString().slice(0, 10),
): string[] {
  return routes
    .filter(
      (entry) =>
        entry.expiresOn !== undefined && isIsoDate(entry.expiresOn) && entry.expiresOn < today,
    )
    .map(
      (entry) =>
        `known-future route "${entry.route}" was due on ${entry.expiresOn ?? ''}: ${entry.expires}`,
    );
}

/**
 * Warnings for entries whose optional `expiresOn` date has passed. Not a failure (see the field),
 * but the chromium `page check exceptions` test records each one as an annotation.
 */
export function overdueExceptions(
  exceptions: readonly PageCheckException[] = PAGE_CHECK_EXCEPTIONS,
  today: string = new Date().toISOString().slice(0, 10),
): string[] {
  return exceptions
    .filter(
      (entry) =>
        entry.expiresOn !== undefined && isIsoDate(entry.expiresOn) && entry.expiresOn < today,
    )
    .map(
      (entry) =>
        `exception for route "${entry.route}" (${entry.checks.join(', ')}) was due on ${entry.expiresOn ?? ''}: ${entry.expires}`,
    );
}
