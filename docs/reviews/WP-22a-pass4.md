# WP-22a review, pass 4 (Reviewer R: whole diff, fresh eyes)

- Worktree: `.claude/worktrees/agent-adc6b347a89c34014`, branch `worktree-agent-adc6b347a89c34014`, HEAD `5a6d5d9` (`5a6d5d9faf73c19458d453980b2af6da81e47937`), confirmed with `git rev-parse HEAD` before starting. Commits over base: `9d1577b`, `bb370a1`, `a7d71d1`, `e4c122d`, `9f83b00`, `846460d`, `5a6d5d9`.
- Base: `git merge-base main worktree-agent-adc6b347a89c34014` = `4b4fa673a9ad5291dda61166be7dfac77a148f56`.
- Date: 2026-09-17
- Machine: Windows 11, loaded (another agent holds port 5491). Playwright on `PW_PORT=5691`, always `--workers=1`, never `--reporter` on the command line except in the one probe that deliberately tests the override. One chromium page-contract run took 6.6 min for 8 routes, so probe runs used `--timeout=120000`.
- Not run: `pnpm lhci` (out of scope per the brief; CI is the gate). `pnpm test:visual` was not run — there are no `visual.spec.ts` or Linux/win32 baselines in the diff and CI skips the job until baselines exist. `pnpm content:check` / `content:fidelity` are not this package's scripts and were not exercised.
- Diff reviewed: `git diff 4b4fa67..HEAD` — 38 files, +7197/−61.

## Verdict: NOT CLEAN

| Severity | Count |
| -------- | ----- |
| blocker  | 0     |
| major    | 1     |
| minor    | 2     |
| nit      | 3     |

The fix round is largely real. **M2 is genuinely fixed** and verified on three independent retry shapes, and it does *not* make ordinary infrastructure flakiness red. **m1 is correctly judged**: I probed the author's own argument by calling `test.skip()` *mid-body after a defect had already happened*, and the guards still fired and failed the test — the decision not to ban `test.skip` is sound (though the reason given in the docs is wrong; see n1). **n1, n3, n4 are fixed**, and **n2 is implemented but incomplete**.

**M1 is not fixed.** The teardown check closes exactly one shape — "an unguarded context is still open, with a page off `about:blank`, at the moment a test's fixture teardown runs". Three realistic variants still ship a real defect (a `console.error` plus a third-party request on a real site page) through a **green run with exit 0**, and one of them produces **no ESLint error at all**, because the new lint rule is purely syntactic and one level of function indirection evades it. `docs/testing.md:110` states the hole "is closed from both sides, so a shared page from a hook never passes silently"; that sentence is not true as written.

## Commands (all run by me, in the worktree, this session)

| Command | Exit | Tail |
| --- | --- | --- |
| `git rev-parse HEAD` | 0 | `5a6d5d9faf73c19458d453980b2af6da81e47937` |
| `pnpm lint` | 0 | `Checking formatting... All matched files use Prettier code style!` |
| `pnpm typecheck` | 0 | `Result (34 files): - 0 errors - 0 warnings - 0 hints` |
| `pnpm test` | 0 | `Test Files 3 passed (3)  Tests 111 passed (111)  Duration 24.91s` |
| `pnpm build` (runs `dist:audit`) | 0 | `dist:audit: 1 HTML file(s), 1 URL(s) checked under base /business-toolkit/. No problems.` |
| `PW_PORT=5691 playwright test --project chromium --workers=1` | 0 | `2 skipped  4 passed (1.9m)` (skips: the two 404 tests, no `dist/404.html` yet) |
| `PW_PORT=5691 playwright test --project webkit --workers=1` | 0 | `4 skipped  2 passed (1.2m)` (the two build-output checks are chromium-only by design) |
| `PW_PORT=5691 playwright test --project nojs --workers=1` | 0 | `ok 1 [nojs] › nojs.spec.ts:19:5 › readable without JavaScript › / (28.1s)  1 passed (1.2m)` |
| `PW_PORT=5691 playwright test --project mobile --workers=1` (1st) | 1 | `2 failed … 2 skipped  2 passed (3.6m)` — both failures are the chromium-only build-output checks on this loaded machine; **no `[e2e guards]` block was printed**, so the reporter did not misattribute an infrastructure failure to the guards |
| `PW_PORT=5691 playwright test --project mobile --workers=1` (2nd) | 0 | `4 skipped  2 passed (1.5m)` — the first run was genuine local flakiness |
| `PW_PORT=5691 playwright test --project a11y --workers=1` (= `pnpm test:a11y`) | 0 | `ok 1 light theme › / (33.7s)`, `ok 2 dark theme › / (18.3s)`, `2 passed (1.4m)` |
| `pnpm dlx @action-validator/cli .github/workflows/ci.yml` | 0 | no findings |
| `pnpm dist:audit` after cleanup | 0 | `1 HTML file(s), 1 URL(s) checked … No problems.` |

## Ownership

`git diff --name-only 4b4fa67..HEAD` stays inside `tests/**`, `scripts/**`, `playwright.config.ts`, `eslint.config.js`, `package.json` + `pnpm-lock.yaml`, `astro.config.ts`, `.github/workflows/ci.yml`, `docs/testing.md`. **`src/**` is untouched.** The `astro.config.ts` change is import-only: it deletes the local `normaliseBase` and imports the shared one from the new `scripts/base-path.ts` (verified by reading the diff hunk). Within the tests-package allowlist.

## CI wiring (re-verified)

No job passes `--reporter` or `--config`, so `playwright.config.ts` always applies: `reporter: [github, html, guard-reporter]` in CI, `globalTeardown: guard-teardown.ts`. `e2e` runs the matrix `chromium|webkit|mobile|nojs` via `pnpm exec playwright test --project <p>`; `a11y` runs `pnpm test:a11y`; `visual` runs `pnpm test:visual` only when `tests/e2e/__screenshots__/linux` exists; `lighthouse` runs `pnpm lhci` as a hard gate. All browser jobs download the `dist` artifact from `build`, so they test the same build `dist:audit` checked. `PLAYWRIGHT_VERSION: '1.63.0'` matches `@playwright/test` in `package.json`. `playwright-report` is uploaded only `if: failure()` for `e2e` — relevant to n2 below.

## Scenario table

Method: probe pages written into the gitignored `dist/` (each `noindex`, each carrying the exact ADR 0005 CSP, `lang`, one `<h1>`, `<title>`, viewport and a ≥20-character `<main>`, so exactly one defect is isolated per page), generated by a small `node -e` script rather than shell heredocs, plus temporary `tests/e2e/zz-*.spec.ts` specs. `/zzp-good/` is the clean control. All artefacts removed afterwards (see "State at the end").

Runs: `PW_PORT=5691 pnpm exec playwright test <filter> --project chromium --workers=1 --timeout=120000`, no `--reporter` except in R3.

### Re-verification of the four holes pass 3 found (27–30)

| # | Scenario | Expected | Observed | Evidence |
| - | --- | --- | --- | --- |
| A | **(pass-3 #27)** `browser.newPage()` in `beforeAll`, third-party image + `console.error` in the body, page closed in `afterAll` | run fails | **Correct — now fails** | `x 1 zz-a-beforeall.spec.ts … Error: [e2e guards] 1 page(s) live in a browser context that the guards never saw: - http://127.0.0.1:5691/business-toolkit/zzp-good/` … `at fixtures.ts:373`; exit 1. ESLint also: `beforeAll/afterAll run before the test-scoped guard fixture …` |
| G | **(pass-3 #28)** guard violation on **attempt 2 of 3**, `--retries=2` | run fails | **Correct — now fails** | `x 1`, `x 2 (retry #1)`, `ok 3 (retry #2)`, `1 flaky`, then `[e2e guards] The run fails: 1 guard problem(s) … guard violation on attempt 2 of zz-g-retry.spec.ts:3 … was retried away (the run ended "passed")`; **exit 1** |
| F | **(pass-3 #29 / m1)** `test.skip(true, …)` called **mid-body, after** a third-party image, a cross-origin `fetch` and a `console.error` | must not hide the defect | **Correct — fails** | `x 1 zz-f-skip.spec.ts … Error: [e2e guards] 6 unexpected console error(s) … - console.error: zz F error before the skip … 1 request(s) left the preview origin … - GET http://192.0.2.1/zzF.png (image)`; exit 1. The author's judgement holds |
| K1/K2/L | **(pass-3 #30 / m2)** `page.request.get('http://192.0.2.1/…')`, the `request` fixture, and an **aliased** `const target = page; target.request.get(…)` | should fail, or be an accepted documented limit | **Still passes green** (unchanged at run level, as the author states) | `ok 1 K1: page.request to another origin`, `ok 2 K2: the request fixture …`, `ok 1 L: aliased page reaches another origin …`; all exit 0. Lint catches K1/K2 *only without* a disable comment; **L produces no lint error at all** |

### New probes of my own (M1 residue)

| # | Scenario | Expected | Observed | Evidence |
| - | --- | --- | --- | --- |
| B | `beforeAll` page, defect in the body, **`shared.context().close()` at the end of the body** | run fails | **PASS (hole)** | `ok 2 zz-b-closed.spec.ts:9:1 › B: beforeAll page, defect, context closed inside the body (8.6s)`, exit 0 |
| C | **`beforeAll` opens a throwaway "setup" page, emits `console.error` + a cross-origin `fetch`, and closes it inside `beforeAll`**; a trivial guarded test follows | run fails | **PASS (hole)** | `ok 1 zz-c-setup.spec.ts:13:1 › C: trivial test after an unguarded beforeAll setup page (9.1s)`, exit 0. ESLint does flag line 5 |
| D | `beforeAll` page, defect in the body, then `shared.goto('about:blank')` at the end of the body | run fails | **PASS (hole)** | `ok 2 zz-d-blank.spec.ts:12:1 › D: beforeAll page parked on about:blank … (8.4s)`, exit 0. ESLint does flag line 7 |
| E | Same as C but `browser.newPage()` is called from a one-line **helper function** instead of literally inside the `beforeAll` callback | run fails, or at least lint fails | **PASS (hole), and `pnpm exec eslint` exits 0** | `pnpm exec eslint tests/e2e/zz-e-helper.spec.ts` → `LINT_EXIT=0`; `ok 1 zz-e-helper.spec.ts:19:1 › E: unguarded beforeAll page created through a helper (16.4s)`, exit 0 |
| Q | Unguarded page opened **and closed** inside a **worker-scoped fixture** (`base.extend(..., { scope: 'worker' })`) | run fails | **Correct — fails** | `x 1 zz-q-worker.spec.ts:20:1 …  Error: [e2e guards] 4 unexpected console error(s) … - console.error: zz Q worker fixture error … - CSP violation: connect-src blocked http://192.0.2.1/zzQ`. Playwright sets the auto test-scoped guard fixture up *before* this worker fixture, so the `browser.newContext` patch is already installed. ESLint also rejects `.extend` outside `fixtures.ts` |
| — | Context created in `globalSetup` | n/a | **Not reachable today** | `playwright.config.ts:43` sets only `globalTeardown`; there is no `globalSetup`. A future package that adds one would be uncovered |

### New probes of my own (M2 residue)

| # | Scenario | Expected | Observed | Evidence |
| - | --- | --- | --- | --- |
| H | Guard violation on attempt 1 only, retries supplied by **`test.describe.configure({ retries: 2 })`** rather than the CLI/CI setting | run fails | **Correct** | `1 flaky` then `[e2e guards] The run fails: 1 guard problem(s) … guard violation on attempt 1 of zz-h-configretry.spec.ts:5 … was retried away`; exit 1 |
| I | Ordinary (non-guard) failure on attempt 1, green on retry — the infrastructure-flakiness case | **must stay green** | **Correct** | `x 1`, `ok 2 (retry #1)`, `1 flaky`, **exit 0**, no `[e2e guards]` block |
| J | Forced `Test timeout … while setting up "context"` on a **guarded** spec, with `--retries=1` | plain timeout failure, no guard misreport | **Correct** | `playwright test csp-and-network --timeout=1 --retries=1` → `Test timeout of 1ms exceeded while setting up "context".` ×8, `4 failed`, **no `[e2e guards]` block and no "unguarded test" line** |
| — | Guard error whose message lacks `GUARD_FAILURE_MARKER` | n/a | **Not reachable from the guards** | Every guard problem funnels through the single `throw new Error(\`${GUARD_FAILURE_MARKER} …\`)` at `fixtures.ts:373`. Assertions from `page-checks.ts` are unmarked, but those are deterministic page-contract checks, not guards |
| — | A test forging `[e2e guards]` in its own assertion message | cannot *suppress* | **Cannot suppress** | To suppress, the *last* attempt must carry the marker, which means that attempt failed, so the run is red anyway. It can *fabricate* a run failure (fails closed) — see n3 |

### Regression sample from the 24 scenarios pass 3 confirmed

| # | Scenario (pass-3 #) | Expected | Observed | Evidence |
| - | --- | --- | --- | --- |
| R1 | control `/zzp-good/` (#1) | passes | Correct | `ok 4 page contract › /zzp-good/ (27.9s)` |
| R2 | `<base href="/business-toolkit/other/">` + `<a href="#details">` (#3) | fails | Correct | `/zzp-base/ fails "no-base-element"`; `dist:audit`: `[base-fragment] <a href="#details"> resolves against <base …> to /business-toolkit/other/, not this page`, `[base-element]`, `[missing-target]` |
| R3 | loosened CSP `font-src *` (#4) | fails | Correct | `/zzp-csp/ fails "csp-meta": … with exactly the ADR 0005 policy` |
| R4 | cross-origin `<form action="https://example.org/submit">` (#5) | fails | Correct | `URL problems on /zzp-form/`; `dist:audit`: `[external-form]` |
| R5 | inline `<script>` (#6) | fails | Correct | `/zzp-inline/ fails "no-inline-script"` **and** `[e2e guards] 2 unexpected console error(s) … - CSP violation: script-src-elem blocked inline` |
| R6 | missing `<meta name="referrer">` (#8) | fails | Correct | `/zzp-noref/ fails "referrer-meta"` |
| R7 | third-party `<link rel="preconnect">` (#9) | fails | Correct | `URL problems on /zzp-preconnect/`; `dist:audit`: `[third-party-resource]` |
| R8 | external meta refresh, 20 s delay (#10) | fails | Correct | `URL problems on /zzp-refresh/`; `dist:audit`: `[external-refresh]` |
| R9 | third-party image injected by page JS (#13) | fails | Correct | `[e2e guards] … 1 request(s) left the preview origin http://127.0.0.1:5691 … - GET http://192.0.2.1/zzM.png (image)` |
| R10 | third-party WebSocket (#17) | fails | Correct | `[e2e guards] 1 request(s) left the preview origin … - WEBSOCKET ws://192.0.2.1:9/zz` |
| R11 | request hidden by `page.route('**/*', r => r.continue())` (#18) | fails | Correct | `- GET http://192.0.2.1/zzM4.png (image)`; ESLint also: `Intercept requests only with routeSameOrigin() …` |
| R12 | `console.error` 300 ms after the body ends (#19) | fails | Correct | `[e2e guards] 1 unexpected console error(s) … - console.error: zz M5 error after the body` |
| R13 | opt-out at `test.describe(…, { annotation })` level (#20) | test and run fail | Correct | `"allow-console-error" is declared at …zz-n-optout.spec.ts:3, not on the test itself`; reporter repeats it |
| R14 | opt-out pushed in `beforeEach` (#21) | test and run fail | Correct | `"allow-console-error" was added at run time (test.info().annotations.push in a hook or the test body)` |
| R15 | empty opt-out pattern on the test itself (#22) | test and run fail | Correct | `"allow-console-error" has no match pattern; an empty pattern would allow everything` |
| R16 | `import pw from '@playwright/test'` default import (#23) | run fails | Correct | test-level `ok 1 … 1 passed`, then `[e2e guards] The run fails: 1 guard problem(s) … unguarded test: zz-o-default.spec.ts:3 … (passed)`; **exit 1**. ESLint reports it **once** (n4 fixed) |
| R17 | `--reporter=list` replaces the configured reporters (#26) | run fails | Correct | `ok 1 …  1 passed` then `Error: [e2e guards] tests/e2e/helpers/guard-reporter.ts did not run …`; exit 1. The new "(this also appears when no test matched the filter …)" wording is present (n1 fixed) |
| R18 | valid test-level opt-out (control) | honoured | Correct (with a caveat of my own making) | the `zz N4` console error was **not** reported as unexpected; the test still failed because my own probe file had a `beforeEach` pushing a run-time annotation that applied to every test in the file — my probe's fault, not the harness's |
| R19 | overdue `expiresOn` warning path | warns, does not fail | Correct | local: `[e2e] overdue page check exception: exception for route "" (csp-meta) was due on 2020-01-01: …`, `1 passed`, exit 0. Under `CI=1` (github + html + guard reporters): the same plain line appears in the log, exit 0, and **no `::warning` annotation** |
| R20 | `inline-handler`: uppercase `ONCLICK` | reported | Correct | `dist/zzp-handler/index.html:1  [inline-handler] <body onclick="console.error('upper')">` (the tokenizer lower-cases attribute names at `audit-links.ts:304`) |
| R21 | `inline-handler`: `once`, `onlyx`, `online` on an element | **not** reported | Correct, no false positives | same run: only the one `[inline-handler]` finding |
| R22 | `inline-handler`: `onafterprint`, `onbeforeprint`, `onlanguagechange`, `ongotpointercapture` on the same element | reported | **Missed** — see m2 | same run reported **only** `onclick`; the `onafterprint="fetch('https://example.org/a')"` attribute was not reported at all |

**Score: 22 of 22 sampled pass-3 scenarios still fail correctly (no regressions); 2 of the 4 pass-3 holes (A, G) are closed; F is correctly judged as a non-hole; 1 (K/L) is unchanged by design; and 4 new probes (B, C, D, E) show M1 is only partly closed.**

## Findings

### major (M1): a page created in `beforeAll` is still unguarded whenever its context does not survive to teardown, and the ESLint ban is evaded by one level of indirection

File: `tests/e2e/fixtures.ts:320-331` (the `unguardedContextProblem` call); `tests/e2e/helpers/guard-policy.ts:175-184`; `eslint.config.js:112-117`; `docs/testing.md:110-114`
Acceptance item: build plan C4 / C6 — "an e2e test fails on any non-same-origin request or CSP console violation"; ADR 0005 — "an end-to-end test fails on any request to another origin and on any CSP violation"; `docs/testing.md:110` — "That hole is closed from both sides, so a shared page from a hook never passes silently".

What is wrong: the runtime check is a **snapshot taken at one instant**. It lists `browser.contexts()` that are not in `guarded`, keeps only pages that are open and off `about:blank`, and runs once per test at guard teardown. Anything that is not visible at that instant is invisible to it:

- a context **closed before teardown** — inside the test body (probe B) or inside `beforeAll` itself (probe C);
- a page **navigated to `about:blank`** before teardown (probe D), which the filter at `fixtures.ts:328` explicitly drops.

In every case the page really did load a site URL, really did emit a `console.error`, and really did issue a cross-origin request — and the run exits 0.

Probe C is the realistic shape: a throwaway setup/seed page opened and closed in `beforeAll`. It is exactly what someone writes when a later package needs to warm a cache or seed `localStorage` once per worker.

The second half of the fix — the ESLint ban — is a purely syntactic selector (`CallExpression[callee.property.name=/^(beforeAll|afterAll)$/] CallExpression[callee.property.name=/^(newPage|newContext)$/]`), so it only fires when `newPage`/`newContext` is written *inside* the hook callback. Probe E moves it into a two-line helper:

```ts
async function openSetupPage(browser: Browser): Promise<Page> {
  return browser.newPage({ baseURL: '…/business-toolkit/' });
}
test.beforeAll(async ({ browser }) => {
  const setup = await openSetupPage(browser);
  /* console.error + cross-origin fetch on a real page */
  await setup.close();
});
```

`pnpm exec eslint tests/e2e/zz-e-helper.spec.ts` → **exit 0, no error**, and the Playwright run → `ok 1 … 1 passed`, **exit 0**. So for this shape there is no control at all: not runtime, not lint, not docs.

How to reproduce: the four probe specs are reproduced verbatim in the scenario table above (B, C, D, E). Each was run as `PW_PORT=5691 pnpm exec playwright test <name> --project chromium --workers=1 --timeout=120000` against a clean `dist/zzp-good/` probe page.

Suggested fix (either one closes the family; the first is the cheap one):

1. Make the check **cumulative rather than a snapshot**: in the guard fixture, subscribe once per worker to `browser.on('context', …)`. Any context whose creation was not driven by the (patched) `newContext` is an unguarded context; record it in a worker-lifetime set and report it at the next test teardown even if it has already been closed. `BrowserContext` also emits `close`, so the set can carry the last URL seen. This catches B, C, D and E without any lint dependency.
2. Or guard those contexts instead of failing them: patch `browser.newContext` once per **worker** (a worker-scoped auto fixture that installs the patch and hands the collected errors to the test-scoped fixture), so a `beforeAll` context is guarded rather than merely detected. The author's stated reason for keeping it test-scoped is that the fixture needs `testInfo`; only the *reporting* half needs `testInfo`, so the patch and the collectors can live at worker scope and the test-scoped fixture can drain them.

Either way, `docs/testing.md:110` must stop claiming the hole is closed until it is.

### minor (m1): `APIRequestContext` traffic still reaches any origin in a green run, and the lint restriction is name-based

File: `tests/e2e/fixtures.ts:254-258` (context `request` observer); `eslint.config.js:123-134`; `docs/testing.md:138`
Acceptance item: build plan C4 — "The site makes no third-party requests … an e2e test fails on any request to another origin"; `docs/testing.md:121` "Network | Any request or WebSocket to an origin other than the preview server … except one an `APIRequestContext` makes".

What is wrong: the fix for pass-3 m2 is documentation plus ESLint only, and the ESLint selectors match on **identifier names** (`page|context|playwright|apiRequest` followed by `.request`, and a destructured `request` parameter). Two one-line evasions defeat them:

- `// eslint-disable-next-line no-restricted-syntax` above the call (K1/K2): run passes, `pnpm exec eslint` exits 0;
- **no disable comment needed at all**: `const target = page; await target.request.get('http://192.0.2.1/zzL')` (probe L) — `pnpm exec eslint` exits 0 and the Playwright run exits 0.

This cannot hide a *site* defect (the site's own code runs in the browser and is fully observed), which is why I keep it minor rather than major. It can, however, make CI silently depend on the public internet — and the documented opt-out example in `docs/testing.md` ("checks that the SARS link still resolves") is precisely the use case someone will reach for.

How to reproduce: probes K1, K2, L in the scenario table.

Suggested fix: a runtime control is available and cheap. `page.request` is `context.request`, and the guard already holds each guarded context: in `guardContext`, wrap the methods of `target.request` (`fetch`, `get`, `post`, `put`, `patch`, `delete`, `head`) so a non-same-origin URL is pushed into `blocked` (or rejected outright), and override the `request` fixture in `fixtures.ts` to throw with a pointer to the page-driven alternative. That converts an unenforceable lint rule into the same guarantee the rest of the network guard gives.

### minor (m2): the new `inline-handler` rule misses six real event-handler attributes

File: `scripts/dist/audit-links.ts:62` (`INLINE_HANDLER`)
Acceptance item: this is the n2 fix from pass 3; the rule's own doc comment claims "a name the HTML spec actually defines".

What is wrong: the alternation is hand-written and incomplete. Checked against the HTML Living Standard event-handler content attribute list, these are **not** matched:

`onafterprint`, `onbeforeprint`, `onlanguagechange`, `ongotpointercapture`, `onlostpointercapture` (and the legacy `ondragexit`).

`onafterprint` and `onbeforeprint` matter most for this site: `docs/build-plan.md` C6 has a whole print-sheet flow, so `<body onbeforeprint="…">` is a plausible thing for the templates package to emit, and nothing in the harness would report it — it is not an inline `<script>` (so `no-inline-script` misses it), not a URL, and it never fires during a test (so no CSP violation is observed).

Note also that the alternation contains the bare word `language`, so `onlanguage` (not a real attribute) is reported while `onlanguagechange` (a real one) is not.

How to reproduce: probe page `dist/zzp-handler/index.html` with
`<body ONCLICK="console.error('upper')" onafterprint="fetch('https://example.org/a')" onbeforeprint="x()" onlanguagechange="y()" ongotpointercapture="z()">`
→ `pnpm dist:audit` reports **only** `[inline-handler] <body onclick="console.error('upper')">`, one problem, and nothing about the other four.

The good news, confirmed in the same run: uppercase attribute names *are* caught (`audit-links.ts:304` lower-cases them), and `once` / `onlyx` / `online` produce **no** false positives.

Suggested fix: either add the six names, or replace the hand-written list with the simpler and stricter rule "`^on[a-z]+$` **minus** a short, unit-tested allowlist of known non-handler attributes (`once`, `only`, `online`, …)", which fails closed as new handlers are added to the platform. Whichever is chosen, extend the unit test at `tests/unit/audit-links.test.ts:467` to assert the print handlers.

### nit (n1): the docs justify allowing `test.skip` with a reason that is not true

File: `docs/testing.md:137`
"a spec can call `test.skip(...)`, and a skipped test runs no body, so it proves nothing" — a `test.skip()` called mid-body means the body *did* run, up to that point. The **conclusion** is right and I verified it (probe F: a mid-body skip after a third-party image, a cross-origin `fetch` and a `console.error` still produced `Error: [e2e guards] 6 unexpected console error(s) …` and exit 1), but the reason given is not the reason it is safe. The real reason is that the auto fixture's teardown runs regardless of the skip and its throw turns the result into a failure. Reword, so a later reader does not "optimise" the teardown on the strength of the stated reason.

### nit (n2): the `expiresOn` warning is a bare stdout line, and today nothing uses the field

File: `tests/e2e/helpers/exceptions.ts:141-147`, `tests/e2e/csp-and-network.spec.ts:56-60`
Judging the author's argument ("a date should not break the build for everyone on one morning"): the argument is right, but the warning as implemented will not be noticed. Under the CI reporter set (`github`, `html`, guard) I confirmed it prints as a plain log line and produces **no** `::warning` annotation, so it does not appear in the run summary; the `exception-overdue` annotation only reaches the HTML report, which `ci.yml:93` uploads `if: failure()` — i.e. never on the green runs where this warning is the only signal. Separately, `PAGE_CHECK_EXCEPTIONS` currently has **one** entry and it has no `expiresOn`, so the mechanism is dormant.
Suggested fix: emit `::warning title=Overdue page check exception::…` when `process.env.CI` is set (one line, and the GitHub reporter already surfaces those), and give the existing home-page exception an `expiresOn` so the path is live.

### nit (n3): `hiddenGuardFailure` groups attempts by title and location, not by test id

File: `tests/e2e/helpers/guard-policy.ts:206` (`${test.file}:${test.location.line}:${test.location.column}:${test.title}`); `tests/e2e/helpers/guard-reporter.ts:47-58`
Two distinct tests generated from the same `test(...)` call site with the same title — a `for` loop whose label function is not injective — collapse into one attempt group, and the "last attempt" is then whichever result arrived last. That can both mask a guard failure and fabricate one. It is latent today (`routeLabel(route)` returns `/${route}`, which is unique, and `a11y.spec.ts` disambiguates through its `describe` names, which are part of `title`), but it is a trap for the next spec. Playwright's reporter API gives `TestCase.id`, which is exactly this key and is stable across retries. Related, and also fails-closed rather than open: a test whose *own* error text happens to contain `[e2e guards]` and then goes green on a retry fabricates a run failure.

## Pass-3 findings verification

| Pass-3 finding | Status | Evidence |
| --- | --- | --- |
| **major M1**: page/context created in `test.beforeAll` runs without any guard | **Partly resolved — carried as major M1** | The exact pass-3 reproducer now fails (probe A: `1 page(s) live in a browser context that the guards never saw`, exit 1) and ESLint rejects the direct syntax. But probes B (context closed in the body), C (page opened and closed inside `beforeAll`), D (parked on `about:blank`) and E (helper indirection — **no lint error either**) all still ship a `console.error` + a cross-origin request through a green run, exit 0 |
| **major M2**: in CI a guard violation on one attempt is retried away and the job stays green | **Resolved** | `GUARD_FAILURE_MARKER` on every guard throw (`fixtures.ts:373`), every attempt recorded (`guard-reporter.ts:47-58`), `hiddenGuardFailure` fails the run. Verified on attempt 1 of 2 (probe H), attempt 2 of 3 (probe G) and with `test.describe.configure({ retries })` (probe H). Ordinary flakiness still retries green (probe I, exit 0) and a forced `Test timeout … while setting up "context"` produces no guard misreport (probe J) |
| **minor m1**: `test.fail()` turns a guard violation into an expected failure | **Resolved** | Runtime: `hiddenGuardFailure` reports `last.expectedStatus === 'failed'` (`guard-policy.ts:248-254`), unit-tested. Lint: `eslint.config.js:118-122` rejects `test.fail`/`test.fixme`. The deliberate decision **not** to ban `test.skip(true, …)` is **justified**, and I tested the residue the author did not claim to test: a `test.skip()` *mid-body after* a defect still fails (probe F). `csp-and-network.spec.ts:32,37,45` and `not-found.spec.ts:154` are all legitimate uses |
| **minor m2**: `page.request` / `context.request` / `request` fixture are not guarded | **Not resolved — carried as minor m1** | Lint and docs only, as the author states. Run level unchanged (K1, K2 pass green). Worse than pass 3 assumed: the lint is name-based, so an alias (`const target = page`) evades it with no disable comment (probe L, lint exit 0, run exit 0) |
| **minor m3**: docs overstate that a continued `page.route` request never leaves the machine | **Resolved** | `docs/testing.md:121` now reads "A request that no spec route takes is also aborted by the context route, so in that case nothing leaves the machine; a request that a spec route continues is really sent." Accurate |
| **nit n1**: `globalTeardown` reports "reporter did not run" when no test matched | **Resolved** | `guard-teardown.ts:90`: "(this also appears when no test matched the filter: the \"No tests found.\" line above is then the real cause)". Seen verbatim in probe R17 |
| **nit n2**: inline event-handler attributes covered by no check | **Partly resolved — carried as minor m2** | New `inline-handler` rule with a `Rule` entry, a docs row (`docs/testing.md:292`) and a unit test. No false positives on `once`/`only`/`online`; uppercase attributes are caught. But six real spec handler names are missed, including `onafterprint`/`onbeforeprint` |
| **nit n3**: `routeSameOrigin` had two identical branches | **Resolved** | `tests/e2e/helpers/network.ts:11-21` is now one `await target.route(predicate, handler)` |
| **nit n4**: duplicate ESLint message for Playwright imports | **Resolved** | `eslint.config.js:62-72` excludes `!@playwright/test` from the pattern group. Probe R16: exactly one error (`'@playwright/test' import is restricted …`), not two |
| **nit n5**: `expires` in `exceptions.ts` is free text | **Partly resolved — carried as nit n2** | Optional `expiresOn`, validated by `isIsoDate` (`pnpm test` fails on a bad value), reported by `overdueExceptions`, annotated and printed by the chromium `page check exceptions` test. Warning-not-failure is the right call, but it emits no GitHub annotation and no entry uses the field yet |

## Other observations (no finding)

- **`e4c122d` "only passing tests need the guard stamp" still behaves.** A genuinely unguarded test that *passes* is caught (probe R16). A test that times out in setup is not blamed for a wrong import (probe J): eight forced `Test timeout of 1ms exceeded while setting up "context"` failures produced `4 failed` with no `[e2e guards]` block at all.
- **Worker-scoped fixtures are, in fact, covered** (probe Q), because Playwright sets the auto test-scoped guard fixture up before a worker fixture that the test requests. That is an ordering property of Playwright rather than an explicit design choice in this package, so it would be worth a unit or e2e test if the author wants to rely on it.
- **`ONCLICK` is caught** because the tokenizer lower-cases attribute names (`audit-links.ts:304`); the "uppercase attributes" worry in the brief is unfounded.
- Running anything with `CI=1` in this worktree triggers `pnpm`'s `prepare` script (`lefthook install`), which re-syncs the git hooks. Idempotent, and `git status --short` stayed empty.

## State at the end

- Every probe artefact deleted: `dist/zzp-*` (9 directories) and `tests/e2e/zz-*.spec.ts` (13 files), plus `test-results/` and `playwright-report/`.
- `git status --short` → **empty**. `git status --short --ignored | grep -i zz` → no matches.
- `dist/` restored to exactly the five files it held before I started: `.nojekyll`, `_astro/page.BDh2vuYI.js`, `index.html`, `sitemap-0.xml`, `sitemap-index.xml`. `pnpm dist:audit` afterwards: `1 HTML file(s), 1 URL(s) checked … No problems.` (exit 0).
- No server left listening: ports 5691 and 5692 both bind free. Playwright owns and stops its own `webServer`; every run started from a confirmed-free port. Port 5491 was left alone.
- `git rev-parse HEAD` unchanged: `5a6d5d9faf73c19458d453980b2af6da81e47937`. No commit, no edit, nothing staged in the author's worktree.
