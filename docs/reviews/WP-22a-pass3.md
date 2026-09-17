# WP-22a review, pass 3 (Reviewer P: whole diff, fresh eyes)

- Worktree: `.claude/worktrees/agent-adc6b347a89c34014`, branch `worktree-agent-adc6b347a89c34014`, HEAD `e4c122d` (commits `9d1577b`, `bb370a1`, `a7d71d1`, `e4c122d`), base `main` `4b4fa67`. HEAD confirmed before starting.
- Date: 2026-09-17
- Machine: Windows 11, heavily loaded (another reviewer was running browsers). Playwright on port 5591, `--workers=1`. Lighthouse verified statically only (local run cannot finish inside the command cap); CI is the gate.
- Diff reviewed: `git diff 4b4fa67...HEAD` (38 files, +6790/-61). Ownership: everything is under `tests/**`, `scripts/**`, `playwright.config.ts`, `eslint.config.js`, `package.json`/`pnpm-lock.yaml`, `astro.config.ts` (only to import the shared `normaliseBase`), `.github/workflows/ci.yml` and `docs/testing.md`. No `src/**` changes. Within the tests-package allowlist.

## Verdict: NOT CLEAN

| Severity | Count |
| -------- | ----- |
| blocker  | 0     |
| major    | 2     |
| minor    | 3     |
| nit      | 5     |

The pass-2 fix round holds: the major and all seven minors from pass 2 are resolved, and all 13 scenarios that pass 2 found passing when they should fail now fail, with clear messages. 24 of my own 28 probes fail correctly. Two majors remain, both cases where a green run does **not** mean "no console error, no CSP violation, no third-party request":

1. a page or context created in `test.beforeAll` is never guarded, and nothing (runtime, lint or docs) notices;
2. in CI (`retries: 2`) a guard violation that happens on one attempt only is reported as flaky and the job passes.

Both are small, local fixes in the package's own files.

## Commands (all run by me in the worktree)

| Command | Exit | Tail |
| --- | --- | --- |
| `pnpm lint` | 0 | `Checking formatting... All matched files use Prettier code style!` |
| `pnpm typecheck` | 0 | `Result (34 files): - 0 errors - 0 warnings - 0 hints` |
| `pnpm test` | 0 | `Test Files 3 passed (3)  Tests 96 passed (96)` |
| `pnpm build` | 0 | `dist:audit: 1 HTML file(s), 1 URL(s) checked under base /business-toolkit/. No problems.` |
| `PW_PORT=5591 playwright test --project chromium --workers=1` | 0 | `2 skipped  4 passed (1.4m)` (skips: the two 404 tests, no `dist/404.html` yet) |
| `PW_PORT=5591 playwright test --project webkit --workers=1` | 0 | `4 skipped  2 passed (32.3s)` (the two build-output checks are chromium-only by design) |
| `PW_PORT=5591 playwright test --project nojs --workers=1` | 0 | `ok 1 [nojs] › nojs.spec.ts:19:5 › readable without JavaScript › / (25.3s)  1 passed (51.2s)` |
| `PW_PORT=5591 playwright test --project mobile --workers=1` | 0 | `4 skipped  2 passed (2.0m)` |
| `PW_PORT=5591 playwright test --project a11y --workers=1` (= `pnpm test:a11y`) | 0 | `ok 1 light theme › / (41.6s)`, `ok 2 dark theme › / (21.5s)`, `2 passed (1.8m)` |
| `pnpm dlx @action-validator/cli .github/workflows/ci.yml` | 0 | no findings |

`pnpm lhci` was not run (see the brief). Statically: `tests/lighthouse/lighthouserc.cjs` carries every C4 budget (perf 0.9, a11y/BP/SEO 0.95, CLS 0.01, script 60 KB, stylesheet 30 KB, font 200 KB, total 600 KB, third-party count 0), `urls.json` holds only `/` (the only built page) and `assertBuilt()` stops the run if a listed page is missing; `run-lhci.mjs` sets `CHROME_PATH`, refuses a busy `LH_PORT`, runs both presets and now prints `lhci failed before assertions` plus a `::error` annotation when the config throws (pass-2 nit fixed).

State at the end: `git status --short` empty, `dist/` back to `_astro/page.BDh2vuYI.js`, `index.html`, `sitemap-0.xml`, `sitemap-index.xml`. No server left on 5591 or 5592 (Playwright owns and stops its own `webServer`; every run started from a confirmed-free port).

## CI wiring

`.github/workflows/ci.yml`: `e2e` (matrix `chromium|webkit|mobile|nojs`) runs `pnpm exec playwright test --project <p>`, `a11y` runs `pnpm test:a11y`, `visual` runs `pnpm test:visual`. None of them passes `--reporter` or `--config`, so `playwright.config.ts` applies, which means `reporter: [github, html, guard-reporter]` and `globalTeardown: guard-teardown.ts` always apply. Each browser job downloads the `dist` artifact from `build`, so the suites test the same build that `dist:audit` checked. `PLAYWRIGHT_VERSION` is pinned to the `@playwright/test` version in `package.json` (`1.63.0`) and used as the browser cache key. The `lighthouse` job installs Chromium and runs `pnpm lhci` as a hard gate.

## Fails when it should (negative scenarios)

Method: probe pages written into the gitignored `dist/` (each `noindex`, so `pageRoutes()` picks them up without touching the sitemap; each carries the exact ADR 0005 CSP, `lang`, one `<h1>`, `<title>`, viewport and a long enough `<main>`, so one defect is isolated per page), plus temporary `tests/e2e/zz-*` specs and one temporary entry in `exceptions.ts`. All reverted; `git status --short` empty afterwards. Runs: `PW_PORT=5591 pnpm exec playwright test <filter> --project chromium --workers=1 [--timeout=120000]`, no `--reporter` override, slash-free `-g` patterns only.

| # | Scenario | Expected | Observed | Evidence (abridged) |
| - | --- | --- | --- | --- |
| 1 | control: probe page with no defect (`/p-good/`) | passes | Correct | `ok 7 page contract › /p-good/` |
| 2 | control: guarded test that only loads the home page | passes | Correct | `ok 1 zz net › control: home page, nothing else` |
| 3 | `<base href="/business-toolkit/other/">` + `<a href="#details">` | fails | Correct | `/p-base/ fails "no-base-element"` … `+ "<base href=\"/business-toolkit/other/\">"`; `dist:audit`: `[base-fragment] <a href="#details"> resolves against <base …> to /business-toolkit/other/, not this page`, `[base-element]` |
| 4 | loosened CSP directive `font-src *` | fails | Correct | `/p-fontsrc/ fails "csp-meta"` … `+ "CSP font-src is \"*\", expected \"'self'\" (extra: *) (missing: 'self')"` |
| 5 | cross-origin `<form action="https://example.org/submit">` | fails | Correct | `URL problems on /p-form/` … `submits to another origin (https://example.org); ADR 0005 form-action 'self'`; `dist:audit`: `[external-form]` |
| 6 | inline `<script>` | fails | Correct | `/p-inline/ fails "no-inline-script"` **and** `2 unexpected console error(s) …: CSP violation: script-src-elem blocked inline` |
| 7 | `console.error` in `setTimeout(…, 2500)` from an external module (after load) | fails | Correct | `1 unexpected console error(s) …: - console.error: probe late error 2500 ms after load (…/_astro/p-lateerr.js:0)` |
| 8 | missing `<meta name="referrer">` | fails | Correct | `/p-noref/ fails "referrer-meta"` … `+ "no <meta name=\"referrer\" content=\"strict-origin-when-cross-origin\">"` |
| 9 | third-party `<link rel="preconnect" href="https://fonts.gstatic.com">` | fails | Correct | `URL problems on /p-preconnect/` … `loads from another origin (https://fonts.gstatic.com)`; `dist:audit`: `[third-party-resource]` |
| 10 | external meta refresh with a 20 s delay | fails | Correct | `URL problems on /p-refresh/` … `<meta content="https://example.org/"> refreshes to another origin`; `dist:audit`: `[external-refresh]` |
| 11 | unhandled promise rejection from an external module | fails | Correct | `1 unexpected console error(s) …: - pageerror: probe unhandled rejection` |
| 12 | stale page-check exception (`p-stale/` exempt from `no-base-element`, page has no `<base>`) | fails | Correct | `Stale exception: /p-stale/ now passes "no-base-element". Remove "no-base-element" for route "p-stale/" …` |
| 13 | third-party **image** injected by page JS | fails | Correct | `1 request(s) left the preview origin …: - GET http://192.0.2.1/probe.png (image)` |
| 14 | third-party **font** (`new FontFace(...).load()`) | fails | Correct | `- GET http://192.0.2.1/probe.woff2 (font)` |
| 15 | third-party **stylesheet** `<link>` injected by JS | fails | Correct | `- GET http://192.0.2.1/probe.css (stylesheet)` |
| 16 | third-party **fetch** | fails | Correct | `- GET http://192.0.2.1/api (fetch)` |
| 17 | third-party **WebSocket** (`ws://192.0.2.1:9/`) | fails | Correct | `1 request(s) left the preview origin …: - WEBSOCKET ws://192.0.2.1:9/` |
| 18 | request hidden by `page.route('**/*', r => r.continue())` | fails | Correct | `1 request(s) left the preview origin …: - GET http://192.0.2.1/probe.png (image)`; ESLint also: `Intercept requests only with routeSameOrigin() …` |
| 19 | `console.error` 300 ms after the test body ends | fails | Correct | `1 unexpected console error(s) …: - console.error: zz probe error after body` |
| 20 | opt-out at `test.describe(…, { annotation })` level | test and run fail | Correct | `"allow-console-error" is declared at …zz-describe.spec.ts:3, not on the test itself` + `1 unexpected console error(s)`; reporter: `invalid opt-out in zz-describe.spec.ts:4 …` |
| 21 | opt-out pushed in `beforeEach` | test and run fail | Correct | `"allow-console-error" was added at run time …`; reporter repeats it |
| 22 | empty opt-out pattern on the test itself | test and run fail | Correct | `"allow-console-error" has no match pattern; an empty pattern would allow everything` |
| 23 | guard bypass: `import test from '@playwright/test'` (default import) | run fails | Correct | test itself `1 passed`, run exit 1: `[e2e guards] … unguarded test: zz-default.spec.ts:3 "…" (passed). Import test from tests/e2e/fixtures.ts …`; ESLint also errors |
| 24 | guard bypass: `tests/e2e/zz-plain.test.ts` | never run; `pnpm test` fails | Correct | `playwright test --list` over all projects: 0 matches; `pnpm test`: `expected [ 'zz-plain.test.ts' ] to deeply equal []` |
| 25 | guard bypass: helper `helpers/zz-pw.ts` re-exporting Playwright's `test` | run fails | Correct | `unguarded test: zz-reexport.spec.ts:3 …`; ESLint errors on the helper |
| 26 | `--reporter=list` replaces the configured reporters | run fails | Correct | test `ok … /p-good/  1 passed`, run exit 1: `[e2e guards] tests/e2e/helpers/guard-reporter.ts did not run …` |
| 27 | page created in `test.beforeAll` via `browser.newPage()`, then a third-party image **and** a `console.error` | fails | **PASS (hole)** | `ok 1 zz-shared.spec.ts … 1 passed`, exit 0. No lint error either. **M1** |
| 28 | guard violation on the first attempt only, `--retries=1` (CI uses 2) | run fails | **PASS (hole)** | attempt 1: `- console.error: zz first attempt only`; then `ok (retry #1)`, `1 flaky`, **exit 0**. **M2** |
| 29 | `test.fail()` on a guarded test whose only failure is the guard | run fails | **PASS (hole)** | `x 1 zz test.fail hides a guard violation` … `1 passed`, exit 0. **m1** |
| 30 | `page.request.get('http://127.0.0.1:9/zz')` (other origin, APIRequestContext) | fails, or is documented as out of scope | **PASS (hole)** | `ok 9 zz net › api request context to other origin`. **m2** |

**24 of 28 defect scenarios fail as they should** (scenarios 3–26), the 2 controls pass, and 4 scenarios (27–30) pass when they should not.

### The `e4c122d` change ("only passing tests need the guard stamp")

Both halves confirmed, without contriving anything:

- A genuinely unguarded test that **passes** is still caught: scenarios 23 and 25 (run exit 1, test-level `1 passed`).
- A **timed-out** test is not misreported as unguarded: this loaded machine produced four real `Test timeout of 30000ms exceeded while setting up "page"` failures in the page-contract run (`/p-lateerr/`, `/p-noref/`, `/p-preconnect/`, `/p-refresh/`) and one deliberate body timeout (`zz-timeout.spec.ts`, plus a retry that timed out in setup). In every case the run failed on the timeout only; the reporter printed no `[e2e guards]` block and never blamed the import. Re-run with `--timeout=120000`, the same four pages failed on their real defects (scenarios 7–10). The unit test `does not blame a test that never ran its body for missing the guards` covers `failed`, `timedOut`, `interrupted` and `skipped`.

### The "no tests found" quirk (judged)

`playwright test zz-plain` prints `Error: No tests found.` first and then the teardown's `[e2e guards] … guard-reporter.ts did not run …`; exit 1. The real cause is stated above the misleading line and the exit code is right, so this is cosmetic — a nit (n1), not a correctness problem. Failing closed is the correct default here: a run whose reporter never began cannot prove anything.

## Findings

### major (M1): a page or context created in `test.beforeAll` runs without any guard

File: tests/e2e/fixtures.ts:283-313 (`guardContext(context)`, the `browser.newContext` patch)
Acceptance item: build plan C4/C6 "an e2e test fails on any non-same-origin request or CSP console violation"; docs/testing.md Fixtures ("guards the default context plus every context or page that the test creates")

What is wrong: the patch on `browser.newContext` is installed inside the test-scoped `harnessGuards` fixture, so it only covers contexts created while a test body (or `beforeEach`) runs. `test.beforeAll` is worker-scoped and runs before test fixtures are set up, so a page created there is never listened to, never route-blocked and never settled — while the test still receives the `harness-guards` annotation, so the reporter sees nothing wrong. The "shared page in serial mode" pattern is standard Playwright usage (and tempting on this slow machine, because it saves a browser start per test), and neither ESLint nor `pnpm test` objects: `browser.newPage()`/`browser.newContext()` are not in the `no-restricted-syntax` list, only `launch`/`connect` are.

How to reproduce: temporary `tests/e2e/zz-shared.spec.ts`

```ts
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
let shared: Page;
test.describe.configure({ mode: 'serial' });
test.beforeAll(async ({ browser }) => { shared = await browser.newPage({ baseURL: '…/business-toolkit/' }); });
test.afterAll(async () => { await shared.close(); });
test('third-party image and console.error', async () => {
  await shared.goto('./');
  await shared.evaluate(() => { const i = new Image(); i.src = 'http://192.0.2.1/shared.png'; document.body.append(i); console.error('zz shared page error'); });
  await expect(shared.locator('h1')).toBeVisible();
});
```

`PW_PORT=5591 pnpm exec playwright test zz-shared --project chromium --workers=1 --timeout=120000` → `ok 1 …  1 passed`, exit 0. `pnpm exec eslint tests/e2e/zz-shared.spec.ts` → no error.

Suggested fix: at guard teardown, fail when the browser holds a context that was never guarded and has a page off `about:blank`, for example `browser.contexts().filter((c) => !guarded.includes(c))` — cheap, and it closes the whole family of "page from somewhere else" cases. Optionally also ban `browser.newPage`/`browser.newContext` inside `beforeAll`/`afterAll` in ESLint, and correct the docs/testing.md sentence to say which contexts are covered.

### major (M2): in CI a guard violation on one attempt is retried away and the job stays green

File: playwright.config.ts:38 (`retries: isCI ? 2 : 0`); tests/e2e/helpers/guard-reporter.ts:29-46 (`onTestEnd` already sees every attempt)
Acceptance item: build plan C4/C6 "zero console errors / CSP violations / third-party requests"; docs/testing.md Fixtures ("The reporter repeats the check for the whole run")

What is wrong: guard problems are exactly the kind of failure that appears on one attempt only — the settle step is time-bounded (3 s, `networkidle`), late timers, lazy loading and races produce intermittent `console.error`s, and an occasional third-party request is precisely the defect worth catching. With two retries in CI, such an attempt is recorded as `flaky` and the run exits 0, so a real ADR 0005 violation ships green. The reporter already receives every attempt's result and could refuse it.

How to reproduce: temporary `tests/e2e/zz-flaky.spec.ts` whose body does `if (test.info().retry === 0) await page.evaluate(() => console.error('zz first attempt only'))`, then `PW_PORT=5591 pnpm exec playwright test zz-flaky --project chromium --workers=1 --retries=1 --timeout=120000`:

```
  x  1 … zz guard violation on first attempt only (25.5s)
      - console.error: zz first attempt only
  ok 2 … (retry #1)
  1 flaky
EXIT=0
```

Suggested fix: in `guardRunProblems`, also fail the run when any *attempt* of a test reported a guard problem (the fixture's error text is available on `result.errors`; a stable marker string such as `[e2e guards]` in the thrown message makes matching exact). That keeps retries for infrastructure flakiness (browser setup timeouts, which this machine produces often) while making guard violations non-retryable. `failOnFlakyTests: true` would also work but would make every infra hiccup red.

### minor (m1): `test.fail()` turns a guard violation into an expected failure

File: tests/e2e/helpers/guard-policy.ts:180-201 (status filter); eslint.config.js:43-120 (no rule against `test.fail`)
What is wrong: a guarded test that only fails because of the guards, marked `test.fail()`, is reported as `1 passed` and the run exits 0 (scenario 29). `test.fail`/`test.fixme` are not restricted in `tests/e2e/**`, so this joins the documented "a spec can forge the annotation" limit but is much easier to reach by accident (someone marks a known-broken page as expected-to-fail and silently loses the guards for it).
How to reproduce: scenario 29 above.
Suggested fix: ESLint `no-restricted-syntax` for `test.fail`/`test.fixme`/`test.skip(true)`-style annotations in `tests/e2e/**`, or list it beside the forged-annotation limit in docs/testing.md.

### minor (m2): requests from `page.request` / the `request` fixture are not guarded

File: tests/e2e/fixtures.ts:246-259 (context `request` listener and route); docs/testing.md "Network | Any request or WebSocket to an origin other than the preview server"
What is wrong: `APIRequestContext` traffic (`page.request.get(...)`, `context.request`, the `request` fixture) does not raise the context `request` event and does not go through context routes, so a spec can reach any origin without `allowOtherOrigin` (scenario 30 passes green). It cannot hide a site defect, but it can make CI depend on the public internet, and the documented opt-out example ("checks that the SARS link still resolves") is exactly the use case someone will implement this way.
How to reproduce: `await page.request.get('http://127.0.0.1:9/zz').catch(() => undefined);` inside a guarded test → passes.
Suggested fix: state the limit in docs/testing.md, and add `page.request`/`context.request`/the `request` fixture to the ESLint restrictions for `tests/e2e/**` (or wrap them in a helper that enforces same-origin).

### minor (m3): docs overstate that a continued `page.route` request never leaves the machine

File: docs/testing.md:110 ("A context route also aborts them, so no connection is made"); tests/e2e/fixtures.ts:8-12
What is wrong: when a page-level route calls `route.continue()`, the context route does not run (only `route.fallback()` chains), so the request really is sent — in scenario 18 the direct injection produced `net::ERR_BLOCKED_BY_CLIENT` while the `page.route` variant produced no block message, only the guard's report. The test fails either way, which is what matters, but the sentence would let a reviewer assume no packets leave the host.
Suggested fix: reword to "the guard always reports it; a request that no spec route takes is also aborted by the context route, so nothing leaves the machine in that case".

### nit (n1): `globalTeardown` reports "reporter did not run" when no test matched

File: tests/e2e/helpers/guard-teardown.ts:10-17
`Error: No tests found.` is printed immediately above and the exit code is 1, so nothing is hidden. Suggested fix: add "(this also appears when no test matched the filter)" to the message.

### nit (n2): inline event-handler attributes are not covered by any check

File: tests/e2e/helpers/page-checks.ts:74-84 (`script:not([src])`); scripts/dist/audit-links.ts (no rule for `on*`)
`<button onclick="…">` is neither an inline `<script>` nor a URL, so it is reported only if it actually executes during a test (then as a CSP violation). Low risk for this site (no handlers are generated), but the layered "no inline code" story has this gap. Suggested fix: report `on*` attributes in `dist:audit`, or note the gap beside the `style="url()"` note.

### nit (n3): `routeSameOrigin` has two identical branches

File: tests/e2e/helpers/network.ts:20-21 — `if ('context' in target) await target.route(predicate, handler); else await target.route(predicate, handler);`. Suggested fix: one call (the union type already resolves).

### nit (n4): duplicate ESLint message for Playwright imports

File: eslint.config.js:50-72 — `@playwright/test` matches both the `paths` entry and the `@playwright/*` pattern, so every offending line reports twice (`'@playwright/test' import is restricted from being used` and `… by a pattern`). Cosmetic; narrow the pattern to `@playwright/*/*` or drop the overlap.

### nit (n5): `expires` in `exceptions.ts` is still free text (carried from pass 2)

File: tests/e2e/helpers/exceptions.ts:41-50 — an entry whose "expiring" change never lands is never flagged. Pass 2 raised this as a nit; the sampling half of that nit **is** fixed (`pageRoutes()` always appends exempt routes). Fine to leave as is, or add an optional date that warns when passed.

## Pass-2 findings verification

| Pass-2 finding | Status | Evidence |
| --- | --- | --- |
| major: fixture rule bypassed by default import, `.test.ts` file or re-export | **Resolved** | Three layers now: the runtime guard reporter fails the run for a passing unguarded test (scenarios 23, 25), every project sets `testMatch: /\.spec\.ts$/` so a `*.test.ts` is never listed (scenario 24, `--list` 0 matches) and `pnpm test` fails on its existence, and ESLint `@typescript-eslint/no-restricted-imports` + `no-restricted-syntax` cover default/namespace/re-export/`require`/`import()`/`import =`/`playwright*` subpaths, with the exempt list frozen to `KNOWN_UNGUARDED_SPECS` by unit tests |
| m1: opt-outs can disable a guard for a block or file | **Resolved** | `classifyOptOuts` accepts an opt-out only at the test's own location; scenarios 20 (describe), 21 (`beforeEach` push) and 22 (empty pattern) all fail the test and the run |
| m2: `page.route` bypasses `sameOriginGuard` | **Resolved** | Context `request` observer plus context route; scenario 18 fails with the request listed, and ESLint bans `page.route` outside `helpers/network.ts` |
| m3: console errors after the test body are not caught | **Resolved** | Bounded settle step (`load`, `networkidle`, pending short timers, 3 s cap): scenario 7 (2500 ms after load) and scenario 19 (300 ms after the body) both fail |
| m4: `csp-meta` checked 5 of 9 directives | **Resolved** | `policy.ts` parses and compares the whole ADR 0005 policy (missing/extra directive, missing/extra source, repeats); scenario 4 fails on `font-src *`; a unit test compares `EXPECTED_CSP` with the ADR text character for character |
| m5: third-party `preconnect`/`dns-prefetch` detected nowhere | **Resolved** | `documentUrlProblems` classifies non-navigational `<link rel>` as a resource, and `dist:audit` has `third-party-resource`; scenario 9 fails in both |
| m6: audit ignored `<base href>`, external forms, external meta refresh | **Resolved** | New rules `base-element`, `base-fragment`, `external-form`, `external-refresh`; scenarios 3, 5, 10 fail in e2e **and** in `dist:audit` (the 20 s delay is caught, unlike pass 2) |
| m7: referrer policy not checked | **Resolved** | `referrer-meta` check with the exception mechanism; scenario 8 fails |
| n: `design-system/` exclusion skipped the noindex requirement | **Resolved** | `NOINDEX_REQUIRED` in `routes.ts` fails a `design-system/` page that loses `noindex`; `DOCUMENTED_EXCLUSIONS` is now only `404.html` |
| n: opt-out `/core/x` threw instead of matching | **Resolved** | `compileMatch` accepts `[dgimsuy]` flags only, otherwise substring; unit-tested |
| n: `isNoindex` missed `content="none"` | **Resolved** | Token match on `noindex|none`, unit-tested |
| n: tokenizer/audit scope gaps | **Resolved** | `imagesrcset`, `ping`, `cite`, `<object data>`, SVG `href`, tab/newline stripping before scheme detection and `&sol;`/`&colon;`/`&Tab;` decoding are implemented and documented; `style="url()"` is now declared out of scope in docs/testing.md |
| n: `KNOWN_DIRECT_PLAYWRIGHT_IMPORTS` could grow | **Resolved** | Renamed `KNOWN_UNGUARDED_SPECS`, frozen by a unit test to exactly `['smoke.spec.ts']`, must also match the ESLint ignore list, and a listed spec that starts using the guards fails the run |
| n: `pnpm lhci` misreported a config error | **Resolved** | `run-lhci.mjs` prints `lhci failed before assertions …` and emits a `::error` annotation and summary line for `missingResults` |
| n: a11y tags omit `best-practice` | **Documented, not backlogged** | docs/testing.md:87 records the divergence and when to add the tag; `docs/reviews/backlog.md` is still empty, which pass 2 had suggested as the place. Acceptable |
| n: base normalisation differed in `playwright.config.ts` | **Resolved** | Shared `scripts/base-path.ts` `normaliseBase` (trims, `''`/`'/'` → `/`), imported by `astro.config.ts`, `playwright.config.ts` and the helpers; unit-tested as shared |
| n: stale-exception detection depended on sampling | **Resolved (half)** | `pageRoutes()` always adds exempt routes, so `E2E_ROUTE_LIMIT` cannot hide a stale entry (`-g` still can, as documented); `expires` is still free text — carried as n5 |
| 13 scenarios that passed when they should fail (8, 9, 10, 12, 14, 16, 20, 22–27) | **All 13 now fail** | scenarios 9, 7, 19, 3, 5, 10, 4, 23, 24, 25, 20, 21, 18 respectively. Pass-2 #13 (`formaction` off base) and #14 share one code path (`action`/`formaction` in `documentUrlProblems` and `external-form` in the audit); I probed `action` |

## Scratch artefacts

Session scratchpad `wp22a-pass3/`: `pages.txt`, `pages2.txt`, `net.txt`, `shared.txt`, `optout.txt`, `zz-describe.txt`, `zz-default.txt`, `zz-reexport.txt`, `plain.txt`, `fft.txt`, `zz-flaky.txt`, `zz-fail.txt`, `audit.txt`, `reporter.txt`.
