import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { normaliseBase } from '../../scripts/base-path';
import {
  findException,
  isIsoDate,
  KNOWN_FUTURE_ROUTES,
  overdueExceptions,
  overdueFutureRoutes,
  overdueWarningCommand,
  PAGE_CHECK_EXCEPTIONS,
  PAGE_CHECKS,
  validateExceptions,
  validateFutureRoutes,
  type FutureRoute,
  type PageCheckException,
} from '../e2e/helpers/exceptions';
import {
  ALLOW_CONSOLE_ERROR,
  ALLOW_OTHER_ORIGIN,
  allowConsoleError,
  allowOtherOrigin,
  apiRequestUrl,
  classifyOptOuts,
  compileMatch,
  CONTEXT_WITHOUT_URL,
  createBlockedRequests,
  GUARD_ANNOTATION,
  GUARD_FAILURE_MARKER,
  guardRunProblems,
  isSameOrigin,
  KNOWN_UNGUARDED_SPECS,
  optedOut,
  parseOptOut,
  strayContextUrls,
  unguardedContextProblem,
  type ExecutedTest,
} from '../e2e/helpers/guard-policy';
import { cspDifferences, EXPECTED_CSP, EXPECTED_REFERRER, parseCsp } from '../e2e/helpers/policy';
import { previewBaseUrl, previewOrigin, previewPort } from '../e2e/helpers/preview-url';
import { isNoindex } from '../e2e/helpers/routes';
import { a11yTimeout, pageSetupTimeout } from '../e2e/helpers/timeouts';
import { buildOutputProblem } from '../e2e/helpers/web-server';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const e2eDir = path.join(repoRoot, 'tests', 'e2e');
const fixtures = path.join(repoRoot, 'tests', 'unit', 'fixtures', 'audit-links');

function walk(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      return entry.name === '__screenshots__' ? [] : walk(path.join(dir, entry.name), rel);
    }
    return [rel];
  });
}

describe('page check exceptions (tests/e2e/helpers/exceptions.ts)', () => {
  it('is a valid, reviewed list', () => {
    expect(validateExceptions()).toEqual([]);
  });

  it('knows the ADR 0005 checks', () => {
    expect([...PAGE_CHECKS]).toEqual([
      'csp-meta',
      'referrer-meta',
      'no-base-element',
      'no-inline-script',
      'nojs-min-text',
    ]);
  });

  it('rejects entries without a reason or expiry, duplicates and unknown checks', () => {
    const bad = [
      { route: 'core/', checks: ['csp-meta'], reason: 'Legacy page for now', expires: '' },
      { route: 'core/', checks: [], reason: 'x', expires: 'Remove with WP-99 layout' },
      { route: '/af/', checks: ['nope'], reason: 'Some good reason', expires: 'When WP-99 lands' },
    ] as unknown as PageCheckException[];
    expect(validateExceptions(bad)).toEqual([
      'exception 1 (route "core/"): expires is missing or too short (say which change removes it)',
      'exception 2 (route "core/"): duplicate route, merge the entries',
      'exception 2 (route "core/"): checks is empty, remove the entry',
      'exception 2 (route "core/"): reason is missing or too short',
      'exception 3 (route "/af/"): route must be site-relative without a leading slash',
      'exception 3 (route "/af/"): unknown check "nope"',
    ]);
  });

  it('accepts an optional expiresOn date and rejects anything that is not one', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('when the layout lands')).toBe(false);
    const list = [
      { route: 'a/', checks: ['csp-meta'], reason: 'a good reason', expires: 'with WP-99 layout' },
      {
        route: 'b/',
        checks: ['csp-meta'],
        reason: 'a good reason',
        expires: 'with WP-99 layout',
        expiresOn: 'soon',
      },
    ] as unknown as PageCheckException[];
    expect(validateExceptions(list)).toEqual([
      'exception 2 (route "b/"): expiresOn must be a date in YYYY-MM-DD form, got "soon"',
    ]);
  });

  it('warns about an entry whose review date has passed, and only then', () => {
    const entry = (expiresOn?: string): PageCheckException => ({
      route: 'core/',
      checks: ['csp-meta'],
      reason: 'a good reason',
      expires: 'with the WP-99 layout',
      ...(expiresOn === undefined ? {} : { expiresOn }),
    });
    expect(overdueExceptions([entry()], '2026-09-17')).toEqual([]);
    expect(overdueExceptions([entry('2026-09-17')], '2026-09-17')).toEqual([]);
    expect(overdueExceptions([entry('2026-12-01')], '2026-09-17')).toEqual([]);
    expect(overdueExceptions([entry('2026-09-16')], '2026-09-17')).toEqual([
      'exception for route "core/" (csp-meta) was due on 2026-09-16: with the WP-99 layout',
    ]);
  });

  /**
   * Review WP-22a pass 4 (n2): the warning was a bare stdout line, which the CI reporter set does not
   * surface on a green run (the HTML report is only uploaded on failure), and no entry used the
   * field, so the whole path was dormant.
   */
  it('emits a GitHub warning command, and the live list exercises expiresOn', () => {
    expect(overdueWarningCommand('exception for route "" was due on 2020-01-01: x')).toBe(
      '::warning title=Overdue page check exception::exception for route "" was due on 2020-01-01: x',
    );
    expect(overdueWarningCommand('a\r\nb 50%')).toBe(
      '::warning title=Overdue page check exception::a%0D%0Ab 50%25',
    );
    // While either list holds an entry, at least one must carry a review date, or the overdue path
    // goes dormant with work still waiting on it. Both lists empty is their goal state (WP-20 left
    // them so): nothing can go overdue, and the functions above stay covered by their own tests.
    const live = [...PAGE_CHECK_EXCEPTIONS, ...KNOWN_FUTURE_ROUTES];
    if (live.length > 0) expect(live.some((entry) => entry.expiresOn !== undefined)).toBe(true);
    for (const entry of live) {
      if (entry.expiresOn !== undefined) expect(isIsoDate(entry.expiresOn), entry.route).toBe(true);
    }
  });

  it('finds an exception only for its route and check', () => {
    const list: PageCheckException[] = [
      { route: '', checks: ['csp-meta'], reason: 'placeholder page', expires: 'home page package' },
    ];
    expect(findException('', 'csp-meta', list)).toBe(list[0]);
    expect(findException('', 'no-inline-script', list)).toBeUndefined();
    expect(findException('core/', 'csp-meta', list)).toBeUndefined();
    expect(PAGE_CHECK_EXCEPTIONS.length).toBeGreaterThanOrEqual(0);
  });
});

/**
 * Routes that a built page links to although nothing serves them yet. `pnpm dist:audit` owns the
 * two staleness checks (the route is built now; nothing links to it any more) and is unit-tested in
 * `tests/unit/audit-links.test.ts`; this covers the list and its shape.
 */
describe('known future routes (tests/e2e/helpers/exceptions.ts)', () => {
  it('is a valid, reviewed list', () => {
    expect(validateFutureRoutes()).toEqual([]);
    expect(KNOWN_FUTURE_ROUTES.length).toBeGreaterThanOrEqual(0);
  });

  it('rejects a leading slash, an empty or duplicate route, and a missing reason or expiry', () => {
    const bad = [
      { route: '/af/', checks: [], reason: 'Design system links to it', expires: 'with WP-21' },
      { route: 'af/', reason: 'short', expires: '' },
      { route: 'af/', reason: 'Design system links to it', expires: 'with the page package' },
      { route: '', reason: 'Design system links to it', expires: 'with the page package' },
      {
        route: 'x/',
        reason: 'Design system links to it',
        expires: 'with the page package',
        expiresOn: 'soon',
      },
    ] as unknown as FutureRoute[];
    expect(validateFutureRoutes(bad)).toEqual([
      'future route 1 ("/af/"): route must be site-relative without a leading slash',
      'future route 2 ("af/"): reason is missing or too short',
      'future route 2 ("af/"): expires is missing or too short (say which change removes it)',
      'future route 3 ("af/"): duplicate route, merge the entries',
      'future route 4 (""): route is empty',
      'future route 5 ("x/"): expiresOn must be a date in YYYY-MM-DD form, got "soon"',
    ]);
  });

  it('warns about an entry whose review date has passed, and only then', () => {
    const entry = (expiresOn?: string): FutureRoute => ({
      route: 'lookup/sources/',
      reason: 'The design system sources demo links to it.',
      expires: 'Remove with the page package.',
      ...(expiresOn === undefined ? {} : { expiresOn }),
    });
    expect(overdueFutureRoutes([entry()], '2026-09-18')).toEqual([]);
    expect(overdueFutureRoutes([entry('2026-09-18')], '2026-09-18')).toEqual([]);
    expect(overdueFutureRoutes([entry('2026-09-17')], '2026-09-18')).toEqual([
      'known-future route "lookup/sources/" was due on 2026-09-17: Remove with the page package.',
    ]);
    expect(overdueWarningCommand('x', 'Overdue known-future route')).toBe(
      '::warning title=Overdue known-future route::x',
    );
  });
});

describe('ADR 0005 policy (tests/e2e/helpers/policy.ts)', () => {
  const adr = readFileSync(
    path.join(repoRoot, 'docs', 'adr', '0005-security-headers-on-pages.md'),
    'utf8',
  );

  it('EXPECTED_CSP is the policy written in the ADR, character for character', () => {
    const written = /`(default-src [^`]+)`/.exec(adr)?.[1];
    expect(written, 'CSP bullet in ADR 0005').toBeDefined();
    expect(EXPECTED_CSP).toBe(written);
    expect(cspDifferences(written ?? '')).toEqual([]);
  });

  it('EXPECTED_REFERRER is the referrer policy written in the ADR', () => {
    expect(/<meta name="referrer" content="([^"]+)">/.exec(adr)?.[1]).toBe(EXPECTED_REFERRER);
  });

  it('parses directives case-insensitively and keeps the first of a repeated directive', () => {
    const parsed = parseCsp("  SCRIPT-SRC 'SELF'  'self' ;; img-src data: 'self'; img-src *");
    expect(Object.fromEntries(parsed.directives)).toEqual({
      'script-src': ["'self'"],
      'img-src': ["'self'", 'data:'],
    });
    expect(parsed.duplicates).toEqual(['img-src']);
  });

  it('accepts reordered directives and sources, whitespace and case', () => {
    const shuffled =
      "object-src 'none' ; FORM-ACTION 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; img-src data: 'self'; style-src 'unsafe-inline' 'self'; script-src 'self'; default-src 'self';";
    expect(cspDifferences(shuffled)).toEqual([]);
  });

  it('rejects any loosened, tightened, missing, extra or repeated directive', () => {
    const replace = (from: string, to: string): string => EXPECTED_CSP.replace(from, to);
    expect(cspDifferences(replace("font-src 'self'", 'font-src *'))).toEqual([
      'CSP font-src is "*", expected "\'self\'" (extra: *) (missing: \'self\')',
    ]);
    expect(cspDifferences(replace("script-src 'self'", "script-src 'self' 'unsafe-eval'"))).toEqual(
      ["CSP script-src is \"'self' 'unsafe-eval'\", expected \"'self'\" (extra: 'unsafe-eval')"],
    );
    expect(cspDifferences(replace("img-src 'self' data:", "img-src 'self'"))).toEqual([
      'CSP img-src is "\'self\'", expected "\'self\' data:" (missing: data:)',
    ]);
    expect(cspDifferences(replace("; object-src 'none'", ''))).toEqual([
      'CSP object-src is missing, expected "\'none\'"',
    ]);
    expect(cspDifferences(`${EXPECTED_CSP}; worker-src *`)).toEqual([
      'CSP has extra directive worker-src, not in ADR 0005',
    ]);
    expect(cspDifferences(`${EXPECTED_CSP}; connect-src *`)).toEqual([
      'CSP directive connect-src appears more than once (browsers ignore the repeat)',
    ]);
    for (const loose of ['style-src *', 'img-src *', 'connect-src *']) {
      const name = loose.split(' ')[0] ?? '';
      const policy = EXPECTED_CSP.replace(new RegExp(`${name} [^;]+`), loose);
      expect(cspDifferences(policy).length, loose).toBe(1);
    }
  });
});

describe('guard opt-outs (tests/e2e/helpers/guard-policy.ts)', () => {
  const where = { file: '/repo/tests/e2e/x.spec.ts', line: 10, column: 3 };
  const reason = 'The browser logs this on purpose in this test.';

  it('builds annotations with a pattern and a reason', () => {
    expect(allowConsoleError('/favicon/', reason)).toEqual({
      type: ALLOW_CONSOLE_ERROR,
      description: `/favicon/ | reason: ${reason}`,
    });
    expect(allowOtherOrigin('https://example.org/', reason).type).toBe(ALLOW_OTHER_ORIGIN);
    expect(parseOptOut({ ...allowConsoleError('/favicon/', reason) })).toEqual({
      type: ALLOW_CONSOLE_ERROR,
      match: '/favicon/',
      reason,
    });
  });

  it('rejects empty patterns, missing or short reasons and invalid regexes', () => {
    expect(parseOptOut({ type: ALLOW_CONSOLE_ERROR, description: '' })).toMatch(/no match pattern/);
    expect(parseOptOut({ type: ALLOW_CONSOLE_ERROR })).toMatch(/no match pattern/);
    expect(parseOptOut({ type: ALLOW_CONSOLE_ERROR, description: '/x/' })).toMatch(
      /reason of at least 20/,
    );
    expect(parseOptOut(allowConsoleError('x', 'too short'))).toMatch(/reason of at least 20/);
    expect(parseOptOut(allowConsoleError('/(/', reason))).toMatch(/not a valid regular expression/);
  });

  it('treats /body/flags as a regex only with known flags, otherwise as a substring', () => {
    expect(compileMatch('/status of 40\\d/i')('Failed: STATUS OF 404')).toBe(true);
    expect(() => compileMatch('/core/x')).not.toThrow();
    expect(compileMatch('/core/x')('GET /core/x.png')).toBe(true);
    expect(compileMatch('/core/x')('GET /core/')).toBe(false);
    const g = compileMatch('/a/g');
    expect([g('a'), g('a'), g('a')]).toEqual([true, true, true]);
  });

  it('accepts only opt-outs declared on the test itself', () => {
    const own = { ...allowConsoleError('boom', reason), location: where };
    const describeLevel = {
      ...allowConsoleError('boom', reason),
      location: { ...where, line: 4, column: 1 },
    };
    const runtime = { ...allowOtherOrigin('https://x.example/', reason) };
    const unrelated = { type: 'a11y-minor', description: '' };
    const { accepted, problems } = classifyOptOuts([own, describeLevel, runtime, unrelated], where);
    expect(accepted).toEqual([{ type: ALLOW_CONSOLE_ERROR, match: 'boom', reason }]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/declared at \/repo\/tests\/e2e\/x\.spec\.ts:4, not on the test/);
    expect(problems[1]).toMatch(/added at run time/);
    expect(optedOut(accepted, ALLOW_CONSOLE_ERROR, 'a boom happened')).toBe(true);
    expect(optedOut(accepted, ALLOW_OTHER_ORIGIN, 'boom')).toBe(false);
  });

  it('reports pages that live in a context the guards never saw', () => {
    expect(unguardedContextProblem([])).toBeUndefined();
    const problem = unguardedContextProblem([
      'http://127.0.0.1:4321/business-toolkit/',
      'http://127.0.0.1:4321/business-toolkit/core/',
    ]);
    expect(problem).toMatch(
      /^2 page URL\(s\) were loaded in a browser context that the guards never saw:/,
    );
    expect(problem).toContain('  - http://127.0.0.1:4321/business-toolkit/core/');
    expect(problem).toMatch(/browser\.newContext\(\)\/browser\.newPage\(\)/);
  });

  /**
   * Review WP-22a pass 4 (M1). The teardown check used to be a snapshot of `browser.contexts()`, so
   * a context that was closed inside the test body (probe B), closed inside `test.beforeAll` (probe
   * C) or parked on `about:blank` (probe D) was invisible and its defect shipped in a green run.
   * The registry is cumulative instead: a record survives the close, and a context that never loaded
   * a URL is still reported.
   */
  it('keeps unguarded contexts that were closed or never loaded a URL', () => {
    expect(
      strayContextUrls([
        { guarded: true, urls: ['http://127.0.0.1:4321/business-toolkit/'] },
        { guarded: false, urls: ['http://127.0.0.1:4321/business-toolkit/zzp/'] },
        { guarded: false, urls: [] },
      ]),
    ).toEqual(['http://127.0.0.1:4321/business-toolkit/zzp/', CONTEXT_WITHOUT_URL]);
    expect(strayContextUrls([{ guarded: true, urls: [] }])).toEqual([]);
  });

  /**
   * Review WP-22a pass 4 (m1): `page.request`/`context.request` reached any origin in a green run,
   * and the name-based lint rule was walked past by `const target = page`. The guards now wrap the
   * sending methods of every guarded context's APIRequestContext, and this is the decision they make.
   */
  it('resolves APIRequestContext targets and fails closed on anything unparseable', () => {
    const origin = 'http://127.0.0.1:5691';
    const base = `${origin}/`;
    expect(apiRequestUrl('/business-toolkit/x', base)).toBe(`${origin}/business-toolkit/x`);
    expect(apiRequestUrl('core/', `${origin}/business-toolkit/`)).toBe(
      `${origin}/business-toolkit/core/`,
    );
    expect(apiRequestUrl('http://192.0.2.1/zz', base)).toBe('http://192.0.2.1/zz');
    expect(apiRequestUrl({ url: () => 'http://192.0.2.1/req' }, base)).toBe('http://192.0.2.1/req');
    for (const url of [
      apiRequestUrl('http://192.0.2.1/zz', base),
      apiRequestUrl('http://127.0.0.1:5692/zzL', base),
      apiRequestUrl({ url: () => 'https://www.sars.gov.za/' }, base),
    ]) {
      expect(isSameOrigin(url, origin), url).toBe(false);
    }
    expect(isSameOrigin(apiRequestUrl('core/', base), origin)).toBe(true);
    expect(isSameOrigin('data:text/plain,x', origin)).toBe(true);
    expect(isSameOrigin(`ws://127.0.0.1:5691/live`, origin)).toBe(true);
    expect(isSameOrigin('not a url', origin)).toBe(false);
  });

  /**
   * Review WP-22a pass 6 (m1): `(×N)` counted guard observations. One off-origin request is seen by
   * both the context `request` observer and the aborting context route, so a single request printed
   * `(×2)`, while one that a spec's own route continued (observer only) printed no suffix at all.
   * Both paths still report — either may be the only one that sees a given request — but they pass
   * the same Playwright `Request` object, so it is counted once.
   */
  it('counts blocked traffic once per request, however many guards saw it', () => {
    const blocked = createBlockedRequests();
    const image = { url: 'http://192.0.2.1/probe.png' };
    const entry = 'GET http://192.0.2.1/probe.png (image)';
    blocked.note(entry, image); // context request observer
    blocked.note(entry, image); // context route, aborting the same request
    expect(blocked.entries()).toEqual([entry]);

    // A second, identical request is a second request: that is what (×N) is for.
    blocked.note(entry, { url: 'http://192.0.2.1/probe.png' });
    expect(blocked.entries()).toEqual([`${entry} (×2)`]);

    // An APIRequestContext call has no Request object; every call is one request.
    const api = 'GET http://192.0.2.1/zz (apirequest)';
    blocked.note(api);
    blocked.note(api);
    expect(blocked.entries()).toEqual([`${entry} (×2)`, `${api} (×2)`]);

    blocked.clear();
    expect(blocked.entries()).toEqual([]);
    // A token already counted stays counted: the same request cannot come back after a drain.
    blocked.note(entry, image);
    expect(blocked.entries()).toEqual([]);
  });

  it('rejects an empty opt-out even when it is on the test', () => {
    const empty = { type: ALLOW_OTHER_ORIGIN, description: '', location: where };
    expect(classifyOptOuts([empty], where).problems).toEqual([
      `"${ALLOW_OTHER_ORIGIN}" has no match pattern; an empty pattern would allow everything`,
    ]);
  });
});

describe('guard run check (tests/e2e/helpers/guard-reporter.ts)', () => {
  const run = (overrides: Partial<ExecutedTest>): ExecutedTest => ({
    title: 'chromium › x.spec.ts › t',
    file: 'x.spec.ts',
    location: { file: '/repo/tests/e2e/x.spec.ts', line: 3, column: 1 },
    status: 'passed',
    annotations: [{ type: GUARD_ANNOTATION, description: 'consoleErrors, sameOriginGuard' }],
    ...overrides,
  });

  it('passes guarded tests, statically skipped tests and known unguarded specs', () => {
    expect(
      guardRunProblems(
        [
          run({}),
          run({ file: 'y.spec.ts', status: 'skipped', annotations: [] }),
          run({ file: 'other-package.spec.ts', annotations: [] }),
        ],
        ['other-package.spec.ts'],
      ),
    ).toEqual([]);
  });

  it('fails an unguarded test that passed', () => {
    const problems = guardRunProblems([
      run({ file: 'zz-default.spec.ts', status: 'passed', annotations: [] }),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^unguarded test: zz-default\.spec\.ts:3/);
  });

  /**
   * Regression (review WP-22a pass 2): when a browser times out while setting up `page`, the guard
   * fixture never runs and never stamps the test. Such a test already fails the run, so it must not
   * be reported as a missing fixture import, which would blame a correct spec for a flaky browser.
   */
  it('does not blame a test that never ran its body for missing the guards', () => {
    for (const status of ['failed', 'timedOut', 'interrupted', 'skipped'] as const) {
      expect(
        guardRunProblems([run({ file: 'csp-and-network.spec.ts', status, annotations: [] })]),
        status,
      ).toEqual([]);
    }
  });

  /**
   * Review WP-22a pass 3 (M2): CI runs with `retries: 2`, so a guard violation on one attempt only
   * was reported as `flaky` and the run exited 0. Every attempt is recorded now, and the run fails
   * unless the last attempt reports the violation itself (then it already fails the run).
   */
  it('fails the run for a guard violation that a retry hid', () => {
    const attempts: ExecutedTest[] = [
      run({
        status: 'failed',
        retry: 0,
        guardFailure: `${GUARD_FAILURE_MARKER} 1 unexpected console error(s):\n  - console.error: boom`,
      }),
      run({ status: 'passed', retry: 1 }),
    ];
    const problems = guardRunProblems(attempts);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^guard violation on attempt 1 of x\.spec\.ts:3 /);
    expect(problems[0]).toMatch(/was retried away \(the run ended "passed"\)/);
    expect(problems[0]).toContain('console.error: boom');
  });

  /** Review WP-22a pass 3 (m1): `test.fail()` made a guard-only failure count as `1 passed`. */
  it('fails the run for a guard violation inside a test.fail() test', () => {
    const problems = guardRunProblems([
      run({
        status: 'failed',
        expectedStatus: 'failed',
        guardFailure: `${GUARD_FAILURE_MARKER} 1 request(s) left the preview origin`,
      }),
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^guard violation in x\.spec\.ts:3 .* hidden by test\.fail\(\)/s);
    expect(problems[0]).toContain('1 request(s) left the preview origin');
  });

  it('keeps ordinary retries green and does not repeat a guard failure that stands', () => {
    // A browser that times out while setting up `page` is infrastructure flakiness, not a guard
    // problem: the fixture never ran, so no attempt carries a guard error.
    expect(
      guardRunProblems([
        run({ status: 'timedOut', retry: 0, annotations: [] }),
        run({ status: 'passed', retry: 1 }),
      ]),
    ).toEqual([]);
    // The last attempt reports the violation itself: the run already fails on it.
    expect(
      guardRunProblems([
        run({ status: 'failed', retry: 0, guardFailure: `${GUARD_FAILURE_MARKER} boom` }),
        run({ status: 'failed', retry: 1, guardFailure: `${GUARD_FAILURE_MARKER} boom` }),
      ]),
    ).toEqual([]);
    // Attempts of different tests are not mixed up.
    expect(
      guardRunProblems([
        run({ file: 'a.spec.ts', status: 'failed', guardFailure: `${GUARD_FAILURE_MARKER} boom` }),
        run({ file: 'b.spec.ts', status: 'passed' }),
      ]),
    ).toEqual([]);
  });

  /**
   * Review WP-22a pass 4 (n3): attempts used to be grouped by title plus call site, so two generated
   * tests from one `test()` call with the same title collapsed into one group. The "last attempt"
   * was then whichever arrived last, which can both mask a guard failure and fabricate one.
   * `TestCase.id` is unique per generated test and stable across retries.
   */
  it('groups attempts by test id, not by title and call site', () => {
    const shared = { file: 'loop.spec.ts', title: 'chromium › loop.spec.ts › page' };
    // Without ids these four rows are one group whose last attempt is green: the failure vanishes.
    const withoutIds = guardRunProblems([
      run({ ...shared, status: 'failed', guardFailure: `${GUARD_FAILURE_MARKER} boom` }),
      run({ ...shared, status: 'passed' }),
    ]);
    expect(withoutIds).toHaveLength(1);
    // With ids the failing test stands on its own and is not cancelled by the other one's pass.
    expect(
      guardRunProblems([
        run({
          ...shared,
          id: 'aaa',
          status: 'failed',
          guardFailure: `${GUARD_FAILURE_MARKER} boom`,
        }),
        run({ ...shared, id: 'bbb', status: 'passed' }),
      ]),
    ).toEqual([]);
    expect(
      guardRunProblems([
        run({
          ...shared,
          id: 'aaa',
          retry: 0,
          status: 'failed',
          guardFailure: `${GUARD_FAILURE_MARKER} boom`,
        }),
        run({ ...shared, id: 'aaa', retry: 1, status: 'passed' }),
        run({ ...shared, id: 'bbb', status: 'passed' }),
      ]),
    ).toHaveLength(1);
  });

  it('fails a known unguarded spec that now runs the guards', () => {
    expect(
      guardRunProblems([run({ file: 'other-package.spec.ts' })], ['other-package.spec.ts']),
    ).toEqual([
      'other-package.spec.ts now runs the guards: remove it from KNOWN_UNGUARDED_SPECS (tests/e2e/helpers/guard-policy.ts) and eslint.config.js.',
    ]);
  });

  /** With the list empty, an unguarded spec is simply a failure: nothing is exempt. */
  it('fails any unguarded spec now that the list is empty', () => {
    expect(guardRunProblems([run({ file: 'smoke.spec.ts', annotations: [] })])).toEqual([
      'unguarded test: smoke.spec.ts:3 "chromium › x.spec.ts › t" (passed). ' +
        "Import test from tests/e2e/fixtures.ts (not '@playwright/test', a re-export or test.extend of it).",
    ]);
  });

  it('fails invalid opt-outs that reached a test from a describe block or a hook', () => {
    const problems = guardRunProblems([
      run({
        annotations: [
          { type: GUARD_ANNOTATION },
          { type: ALLOW_CONSOLE_ERROR, description: '' },
          {
            ...allowOtherOrigin('x', 'a reason that is long enough'),
            location: { file: 'd', line: 1, column: 1 },
          },
        ],
      }),
    ]);
    expect(problems).toHaveLength(2);
    for (const problem of problems) expect(problem).toMatch(/^invalid opt-out in x\.spec\.ts:3/);
  });

  /**
   * The list reached empty when WP-00's `smoke.spec.ts` and WP-11's `design-system.spec.ts` were
   * switched to the fixtures (the WP-11 + WP-22a merge checklist). Every spec runs the guards, so
   * this asserts the empty list: adding a file back has to be a deliberate edit here, with the
   * package that owns it named, and the per-entry checks below then apply again.
   */
  it('KNOWN_UNGUARDED_SPECS is frozen and can only shrink', () => {
    expect([...KNOWN_UNGUARDED_SPECS]).toEqual([]);
    for (const file of KNOWN_UNGUARDED_SPECS) {
      const full = path.join(e2eDir, file);
      expect(existsSync(full), `${file} was removed: delete it from KNOWN_UNGUARDED_SPECS`).toBe(
        true,
      );
      expect(
        readFileSync(full, 'utf8'),
        `${file} no longer imports from @playwright/test: delete it from KNOWN_UNGUARDED_SPECS`,
      ).toMatch(/from ['"]@playwright\/test['"]/);
    }
  });
});

describe('e2e test files', () => {
  it('only *.spec.ts files hold tests under tests/e2e (no *.test.* or non-TypeScript specs)', () => {
    const stray = walk(e2eDir).filter(
      (file) =>
        /\.test\.[cm]?[jt]sx?$/.test(file) ||
        (/\.spec\.[cm]?[jt]sx?$/.test(file) && !file.endsWith('.spec.ts')),
    );
    expect(
      stray,
      'Playwright only runs *.spec.ts; rename these or move Vitest tests to tests/unit',
    ).toEqual([]);
  });

  /**
   * Importing the Playwright config pulls in `@playwright/test`, which costs several seconds cold
   * and has exceeded Vitest's 5 s default during `pnpm gate`, where every test file imports in
   * parallel. Same reasoning as the `page` fixture budget above: the cost is the toolchain's, not
   * this assertion's, so it gets a budget of its own rather than sharing the default one.
   */
  it(
    'every Playwright project only matches *.spec.ts and the guard reporter is configured',
    { timeout: 120_000 },
    async () => {
      const config = (await import('../../playwright.config')).default;
      const reporters = JSON.stringify(config.reporter);
      expect(reporters).toContain('guard-reporter.ts');
      expect(config.globalTeardown).toContain('guard-teardown.ts');
      for (const project of config.projects ?? []) {
        const match = project.testMatch;
        expect(match, `${project.name} testMatch`).toBeInstanceOf(RegExp);
        const regex = match as RegExp;
        for (const file of ['zz-plain.test.ts', 'zz.spec.js', 'a11y.spec.ts.bak', 'zz.spec.tsx']) {
          expect(regex.test(file), `${project.name} must not match ${file}`).toBe(false);
        }
      }
    },
  );
});

describe('ESLint rules for tests/e2e (eslint.config.js)', () => {
  const eslint = new ESLint({ cwd: repoRoot });
  const lint = async (code: string, file = 'tests/e2e/zz-probe.spec.ts'): Promise<string[]> => {
    const [result] = await eslint.lintText(code, { filePath: path.join(repoRoot, file) });
    return (result?.messages ?? [])
      .filter(
        (m) =>
          m.ruleId === '@typescript-eslint/no-restricted-imports' ||
          m.ruleId === 'no-restricted-syntax',
      )
      .map((m) => m.ruleId ?? '');
  };

  const banned: Array<[string, string]> = [
    [
      'default import',
      "import test, { expect } from '@playwright/test';\nvoid test;\nvoid expect;",
    ],
    [
      'commented named import',
      "import { expect, /* x */ test } from '@playwright/test';\nvoid test;\nvoid expect;",
    ],
    ['namespace import', "import * as pw from '@playwright/test';\nvoid pw;"],
    ['re-export', "export { test } from '@playwright/test';"],
    ['playwright/test', "import { test } from 'playwright/test';\nvoid test;"],
    ['playwright-core', "import { chromium } from 'playwright-core';\nvoid chromium;"],
    ['require', "const pw = require('@playwright/test');\nvoid pw;"],
    ['dynamic import', "const pw = await import('@playwright/test');\nvoid pw;"],
    ['import equals', "import pw = require('@playwright/test');\nvoid pw;"],
    ['page.route', "declare const page: any;\nawait page.route('**/*', (r: any) => r.continue());"],
    ['context.unrouteAll', 'declare const context: any;\nawait context.unrouteAll();'],
    ['removeAllListeners', "declare const context: any;\ncontext.removeAllListeners('request');"],
    ['browser launch', 'declare const playwright: any;\nawait playwright.chromium.launch();'],
    ['test.extend', "import { test } from './fixtures';\nexport const t = test.extend({});"],
    [
      'test.use override',
      "import { test } from './fixtures';\ntest.use({ harnessGuards: undefined } as never);",
    ],
    [
      'browser.newPage in beforeAll',
      "import { test } from './fixtures';\ntest.beforeAll(async ({ browser }: any) => {\n  await browser.newPage();\n});",
    ],
    [
      'browser.newContext in afterAll',
      "import { test } from './fixtures';\ntest.afterAll(async ({ browser }: any) => {\n  await browser.newContext();\n});",
    ],
    ['test.fail', "import { test } from './fixtures';\ntest.fail();"],
    [
      'test.fixme',
      "import { test } from './fixtures';\ntest.describe.fixme('x', () => undefined);",
    ],
    ['page.request', "declare const page: any;\nawait page.request.get('http://127.0.0.1:9/zz');"],
    ['context.request', 'declare const context: any;\nvoid context.request;'],
    [
      'request fixture',
      "import { test } from './fixtures';\ntest('x', async ({ request }: any) => {\n  void request;\n});",
    ],
    [
      'request.newContext',
      'declare const playwright: any;\nawait playwright.request.newContext();',
    ],
  ];

  for (const [name, code] of banned) {
    it(`reports ${name}`, { timeout: 120_000 }, async () => {
      expect((await lint(code)).length, code).toBeGreaterThan(0);
    });
  }

  it('reports a Playwright import once, not twice', { timeout: 120_000 }, async () => {
    expect(await lint("import test from '@playwright/test';\nvoid test;")).toEqual([
      '@typescript-eslint/no-restricted-imports',
    ]);
  });

  it('reports a re-exporting helper under tests/e2e/helpers', { timeout: 120_000 }, async () => {
    expect(
      await lint("export { expect, test } from '@playwright/test';", 'tests/e2e/helpers/zz-pw.ts'),
    ).not.toEqual([]);
  });

  it(
    'allows type-only imports, fixtures.ts and the route helper, and covers every spec',
    { timeout: 120_000 },
    async () => {
      expect(
        await lint("import type { Page } from '@playwright/test';\nexport type P = Page;"),
      ).toEqual([]);
      expect(
        await lint("import { type Page } from '@playwright/test';\nexport type P = Page;"),
      ).toEqual([]);
      expect(
        await lint(
          "import { expect, test as base } from '@playwright/test';\nexport const t = base.extend({});\nvoid expect;",
          'tests/e2e/fixtures.ts',
        ),
      ).toEqual([]);
      expect(
        await lint(
          'declare const page: any;\nawait page.route(() => true, () => undefined);',
          'tests/e2e/helpers/network.ts',
        ),
      ).toEqual([]);
      const exempt = await eslint.calculateConfigForFile(path.join(e2eDir, 'fixtures.ts'));
      expect(exempt.rules?.['@typescript-eslint/no-restricted-imports']).toBeUndefined();
      for (const spec of ['a11y.spec.ts', 'smoke.spec.ts', 'design-system.spec.ts']) {
        const applied = await eslint.calculateConfigForFile(path.join(e2eDir, spec));
        expect(applied.rules?.['@typescript-eslint/no-restricted-imports']?.[0], spec).toBe(2);
      }
    },
  );

  it(
    'exempts exactly KNOWN_UNGUARDED_SPECS from the import rule',
    { timeout: 120_000 },
    async () => {
      const exempt: string[] = [];
      for (const file of walk(e2eDir).filter((f) => f.endsWith('.ts') && f !== 'fixtures.ts')) {
        const config = await eslint.calculateConfigForFile(path.join(e2eDir, file));
        if (!config.rules?.['@typescript-eslint/no-restricted-imports']) exempt.push(file);
      }
      expect(exempt).toEqual([...KNOWN_UNGUARDED_SPECS]);
    },
  );
});

describe('routes helpers', () => {
  it('isNoindex reads noindex and none as tokens', () => {
    expect(isNoindex('<meta name="robots" content="noindex, follow">')).toBe(true);
    expect(isNoindex("<meta content='none' name='robots'>")).toBe(true);
    expect(isNoindex('<meta name=robots content=NOINDEX>')).toBe(true);
    expect(isNoindex('<meta name="robots" content="index, follow">')).toBe(false);
    expect(isNoindex('<meta name="robots-x" content="noindex">')).toBe(false);
    expect(isNoindex('<meta name="description" content="none of this">')).toBe(false);
  });
});

describe('base path normalisation (scripts/base-path.ts)', () => {
  it('is shared by astro.config.ts and playwright.config.ts', () => {
    for (const file of ['astro.config.ts', 'playwright.config.ts']) {
      const source = readFileSync(path.join(repoRoot, file), 'utf8');
      expect(source, file).toMatch(/import \{ normaliseBase \} from '\.\/scripts\/base-path';/);
      expect(source, file).not.toMatch(/function normaliseBase|replace\(\/\^\\\/\+/);
    }
    expect(normaliseBase('')).toBe('/');
    expect(normaliseBase(' /bt/ ')).toBe('/bt/');
    expect(normaliseBase(undefined)).toBe('/business-toolkit/');
  });
});

/**
 * The worker half of the guards is set up before any test-scoped option exists, so it cannot read
 * `use.baseURL` and reads the preview origin from this module instead. If `playwright.config.ts`
 * ever computed `baseURL` some other way, every request to the preview server would look like
 * another origin. The guard fixture compares the two at run time; this pins the source.
 */
describe('preview URL (tests/e2e/helpers/preview-url.ts)', () => {
  it('is what playwright.config.ts builds use.baseURL from', () => {
    const source = readFileSync(path.join(repoRoot, 'playwright.config.ts'), 'utf8');
    expect(source).toMatch(
      /import \{ previewOrigin, previewPort \} from '\.\/tests\/e2e\/helpers\/preview-url';/,
    );
    expect(source).toMatch(/const PORT = previewPort\(\);/);
    expect(source).toMatch(/const ORIGIN = previewOrigin\(\);/);
    expect(source).toMatch(/baseURL: `\$\{ORIGIN\}\$\{BASE\}`/);
    expect(source).not.toMatch(/http:\/\/127\.0\.0\.1:\$\{/);
  });

  it('reads PW_PORT and BASE_PATH', () => {
    expect(previewPort({})).toBe(4321);
    expect(previewPort({ PW_PORT: '5691' })).toBe(5691);
    expect(previewOrigin({ PW_PORT: '5691' })).toBe('http://127.0.0.1:5691');
    expect(previewBaseUrl({ PW_PORT: '5691', BASE_PATH: '/bt/' })).toBe(
      'http://127.0.0.1:5691/bt/',
    );
    expect(previewBaseUrl({})).toBe('http://127.0.0.1:4321/business-toolkit/');
    for (const bad of ['0', '-1', '99999', 'abc', '80.5']) {
      expect(() => previewPort({ PW_PORT: bad }), bad).toThrow(/PW_PORT/);
    }
  });
});

/**
 * Creating a page is host cost, not test work: it costs 22-44 s of Chromium renderer spawn on the
 * machine this package is gated on, and while it shared the test's 30 s budget the suites reported
 * page-contract failures in which no assertion had run. These pin the separate budget in place, so
 * an edit that drops the `timeout` from the `page` fixture — and silently puts page creation back
 * inside the test timeout — fails here rather than months later as an unreproducible flake.
 */
describe('timeout policy (tests/e2e/helpers/timeouts.ts)', () => {
  it('reads PW_PAGE_SETUP_TIMEOUT and PW_A11Y_TIMEOUT, and rejects anything that is not one', () => {
    expect(pageSetupTimeout({})).toBe(120_000);
    expect(pageSetupTimeout({ PW_PAGE_SETUP_TIMEOUT: '1' })).toBe(1);
    expect(a11yTimeout({})).toBe(90_000);
    expect(a11yTimeout({ CI: 'true' })).toBe(60_000);
    expect(a11yTimeout({ CI: 'true', PW_A11Y_TIMEOUT: '5000' })).toBe(5000);
    for (const bad of ['0', '-1', 'abc', '1.5']) {
      expect(() => pageSetupTimeout({ PW_PAGE_SETUP_TIMEOUT: bad }), bad).toThrow(
        /PW_PAGE_SETUP_TIMEOUT must be a positive integer/,
      );
    }
    // A blank value is "unset", not an error; only a non-empty, non-integer value throws.
    expect(pageSetupTimeout({ PW_PAGE_SETUP_TIMEOUT: '' })).toBe(120_000);
  });

  it('gives the page fixture a setup budget outside the test timeout', () => {
    const source = readFileSync(path.join(e2eDir, 'fixtures.ts'), 'utf8');
    expect(source).toMatch(/import \{ pageSetupTimeout \} from '\.\/helpers\/timeouts';/);
    // The tuple form with `timeout` is what moves setup into its own slot; a plain function shares
    // the test's budget again (playwright/lib/worker/workerProcessEntry.js).
    expect(
      source,
      'the page fixture must keep its own `timeout`, or creating a page spends the test timeout again',
    ).toMatch(/page: \[[\s\S]*?\{ scope: 'test', timeout: pageSetupTimeout\(\) \},\s*\],/);
    expect(source).toMatch(/context\.newPage\(\)/);
  });

  it('is where playwright.config.ts gets the a11y timeout, with no second copy of the parser', () => {
    const source = readFileSync(path.join(repoRoot, 'playwright.config.ts'), 'utf8');
    expect(source).toMatch(/import \{ a11yTimeout \} from '\.\/tests\/e2e\/helpers\/timeouts';/);
    expect(source).toMatch(/const A11Y_TIMEOUT = a11yTimeout\(\);/);
    expect(source).not.toMatch(/process\.env\.PW_A11Y_TIMEOUT/);
    // A11Y_TIMEOUT belongs to the a11y project only. The default test timeout stays Playwright's
    // 30 s, because page setup no longer spends it; raising it instead of separating the budgets
    // would hand every assertion a longer rope for a cost that is not the site's.
    const a11yUses = source.match(/(?<![A-Z_])A11Y_TIMEOUT/g) ?? [];
    expect(a11yUses).toHaveLength(2);
    expect(source).toMatch(
      /testMatch: \/\(\^\|\[\\\\\/\]\)a11y\\\.spec\\\.ts\$\/,[\s\S]{0,120}?timeout: A11Y_TIMEOUT,/,
    );
  });
});

describe('Astro internals the e2e and Lighthouse launchers rely on', () => {
  const markers = [
    ['preview', 'ASTRO_PREVIEW_BACKGROUND'],
    ['dev', 'ASTRO_DEV_BACKGROUND'],
  ] as const;

  for (const [command, marker] of markers) {
    it(`astro ${command} still honours ${marker}`, () => {
      const file = path.join(repoRoot, 'node_modules', 'astro', 'dist', 'cli', command, 'index.js');
      const source = existsSync(file) ? readFileSync(file, 'utf8') : '';
      expect(
        source.includes(`process.env.${marker}`),
        `${file} no longer reads process.env.${marker}. After an Astro upgrade, astro ${command} may ` +
          'detach into the background under an AI agent and break Playwright webServer and pnpm lhci. ' +
          'Find the new foreground switch and update tests/e2e/helpers/web-server.ts, ' +
          'playwright.config.ts, scripts/ci/run-lhci.mjs and docs/testing.md.',
      ).toBe(true);
    });
  }
});

describe('web-server launcher build check', () => {
  it('accepts a complete build and explains a missing or incomplete one', () => {
    expect(buildOutputProblem(path.join(fixtures, 'good'), 'bt')).toBeNull();
    expect(buildOutputProblem(path.join(fixtures, 'nested'), 'bt')).toBeNull();
    expect(buildOutputProblem(path.join(fixtures, 'missing'), 'bt')).toMatch(
      /does not exist\. Run `pnpm build` first \(BASE_PATH=\/bt\/\)/,
    );
    expect(buildOutputProblem(path.join(fixtures, 'good', '_astro'), 'bt')).toMatch(
      /build is incomplete: no index\.html/,
    );
  });
});

describe('Lighthouse URL list (tests/lighthouse/urls.json)', () => {
  it('is a non-empty list of site-relative paths', () => {
    const data = JSON.parse(
      readFileSync(path.join(repoRoot, 'tests', 'lighthouse', 'urls.json'), 'utf8'),
    ) as { paths?: unknown };
    expect(Array.isArray(data.paths)).toBe(true);
    const paths = data.paths as unknown[];
    expect(paths.length).toBeGreaterThan(0);
    for (const entry of paths) expect(entry).toMatch(/^\/[^\s]*$/);
  });
});
