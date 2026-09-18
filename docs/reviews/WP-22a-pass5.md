# WP-22a review, pass 5 (Reviewer U: whole diff, fresh eyes)

- Worktree: `.claude/worktrees/agent-adc6b347a89c34014`, branch `worktree-agent-adc6b347a89c34014`, HEAD `e0f355a` (`e0f355a418a561af0089d94d01ee22375291d629`), confirmed with `git rev-parse HEAD` before starting and again after cleanup. Commits over base: `9d1577b` … `9f83b00`, `846460d`, `5a6d5d9`, `fa7c5d2`, `a6ffc16`, `e0f355a`.
- Base: `git merge-base main worktree-agent-adc6b347a89c34014` = `4b4fa673a9ad5291dda61166be7dfac77a148f56`.
- Date: 2026-09-18
- Machine: Windows 11, heavily loaded. Chromium context setup alone repeatedly took 25–45 s, and one `beforeAll` hook hit the default 30 s hook timeout on its first run (`"beforeAll" hook timeout of 30000ms exceeded. Error: browser.newPage: Test ended.`) and then passed at `--timeout=120000`. I call that out explicitly below so it is not mistaken for a harness defect. Playwright always on `PW_PORT=5691`, always `--workers=1`, never `--reporter` on the command line except in the one probe that deliberately tests the override. Port 5491 left alone.
- `main` has moved (`22e14b0`, the content pipeline). I reviewed the branch as it stands against its own merge base; merge integration is not mine.
- Not run: `pnpm lhci` (out of scope per the brief; CI is the gate). `pnpm test:visual` — no `visual.spec.ts` and no baselines exist in the diff, and CI skips the job until Linux baselines land. `content:check` / `content:fidelity` are not this package's scripts.
- Diff reviewed: `git diff 4b4fa67..HEAD` — 39 files, +7757/−63.

## Verdict: CLEAN

| Severity | Count |
| -------- | ----- |
| blocker  | 0     |
| major    | 0     |
| minor    | 2     |
| nit      | 2     |

I set out to make a green run ship a real defect, and against the shapes that matter I could not. Every one of pass 4's five `beforeAll` probes (A, B, C, D, E) now fails, reporting the *actual* console error and the *actual* off-origin request rather than a stray-context message. `test.afterAll` traffic — a shape pass 4 did not raise — fails the worker. The `APIRequestContext` fix is better than claimed: wrapping `fetch` on the instance also backstops the verb methods, so even `Object.getPrototypeOf(page.request).get.call(page.request, …)` is caught. M2's retry protection holds, and it does **not** turn ordinary infrastructure flakiness red. The `inline-handler` rule now catches all six attributes pass 4 named, plus `ononline` and uppercase `ONCLICK`, with no false positives on `once`/`only`/`online`/`data-on`. The `preview-url.ts` design is sound and self-checking.

The two minors are real but narrow, and neither is a defect shipping green through a shape a normal author would write:

- **m1** is a genuine break of a documented invariant: opt-outs are supposed to be per test, but a defect raised in `beforeAll` is drained at the *first following test's* teardown and filtered through *that test's* `allowConsoleError`. I put a real broken same-origin asset in a `beforeAll` and a plausible, unrelated opt-out on the next test, and the run exited 0.
- **m2** is the second net's tamper surface: the `browser.on('context')` listener is registered outside the `listeners` registry, so the "guard listener was removed" check cannot see it, and the liveness check can only detect an event that *never* fires, not one that stops. `docs/testing.md:117` overstates this.

I did not find a way to defeat the primary net (the worker-scope `browser.newContext` patch) without deliberately reaching through `Object.getPrototypeOf`, and when I did that the second net caught it.

## Commands (all run by me, in the worktree, this session)

| Command | Exit | Tail |
| --- | --- | --- |
| `git rev-parse HEAD` | 0 | `e0f355a418a561af0089d94d01ee22375291d629` |
| `git status --short` (before) | 0 | empty |
| `pnpm lint` | 0 | `Checking formatting... All matched files use Prettier code style!` |
| `pnpm typecheck` | 0 | `Result (35 files): - 0 errors - 0 warnings - 0 hints` |
| `pnpm test` | 0 | `Test Files 3 passed (3)  Tests 119 passed (119)  Duration 14.26s` |
| `pnpm build` (runs `dist:audit`) | 0 | `dist:audit: 1 HTML file(s), 1 URL(s) checked under base /business-toolkit/. No problems.` |
| `PW_PORT=5691 playwright test --project chromium --project webkit --project nojs --workers=1` | 0 | `6 skipped  7 passed (2.7m)` (skips: the two 404 tests in both browsers, no `dist/404.html` yet; the two build-output checks are chromium-only by design) |
| `PW_PORT=5691 playwright test --project mobile --project a11y --workers=1` | 0 | `4 skipped  4 passed (2.9m)` — `ok 7 [a11y] light theme › / (33.5s)`, `ok 8 [a11y] dark theme › / (19.6s)`. **The mobile project did not flake for me this time** |
| `pnpm dlx @action-validator/cli .github/workflows/ci.yml` | 0 | no findings |
| `pnpm dist:audit` after cleanup | 0 | `1 HTML file(s), 1 URL(s) checked … No problems.` |
| `git status --short` (after cleanup) | 0 | empty (`STATUS_LINES=0`) |

Probe runs (each `--project chromium --workers=1`, timeouts noted):

| Probe run | Exit | Tail |
| --- | --- | --- |
| batch 1: `-g "zz "` (A, C, afterAll, API ×2), default 30 s timeout | 1 | `5 failed`. A failed on a **30 s `beforeAll` hook timeout** — environment, see below |
| A re-run, `--timeout=120000` | 1 | `x 1 zz A … Error: [e2e guards] 2 unexpected console error(s) …` |
| controls `-g "zz CTRL"` | 1 | `x 1 probe2 is caught`, `ok 2 clean test passes` |
| `-g "zz OPT"` | **0** | `ok 1 zz OPT first test has its own unrelated opt-out (8.8s)  1 passed` — **m1** |
| `-g "zz SKIP"` | 0 | `1 skipped` — the `beforeAll` never ran, nothing produced |
| `-g "zz SB\|zz PROTO\|zz BU"` | 1 | `2 failed` (BU, PROTO), `2 passed` (SB, PROTONET) |
| `-g "zz RETRY\|zz INFRA" --retries=2` | 1 | `2 flaky`, then `[e2e guards] The run fails: 1 guard problem(s) … was retried away` |
| `-g "zz INFRA" --retries=2` | **0** | `1 flaky`, **no `[e2e guards]` block** |
| `-g "zz FAIL"` | 1 | `1 passed` then `[e2e guards] … is hidden by test.fail()/test.fixme()` |
| `-g "zz B \|zz D \|zz K2"` | 1 | `3 failed` |
| `-g "zz S3"` (6 pass-3 scenarios) | 1 | `6 failed`, `[e2e guards] The run fails: 3 guard problem(s)` |
| `-g "zz UNG"` | 1 | `1 passed` then `[e2e guards] … unguarded test: zz-unguarded.spec.ts:4 … (passed)` |
| `pnpm exec eslint tests/e2e/zz-unguarded.spec.ts` | 1 | `1 problem (1 error, 0 warnings)` |
| `--reporter=list -g "zz CTRL clean"` | 1 | `Error: [e2e guards] tests/e2e/helpers/guard-reporter.ts did not run …` |
| `pnpm dist:audit` with `dist/zz-handler/` | 1 | `10 problem(s) (inline-handler: 8, third-party-resource: 1, base-path: 1)` |

**Environment vs. real failure.** Exactly one failure in this session was environmental: probe A's `beforeAll` hook exceeded the default 30 s hook timeout while launching chromium on a loaded machine (`Error: browser.newPage: Test ended.`). Re-run at `--timeout=180000` it produced the expected guard failure. No `[e2e guards]` block was printed for the timeout, so the harness did **not** misattribute an infrastructure failure to the guards — the same property pass 4 checked as probe J. Everything else in the tables above is a real, reproducible result.

## Ownership

`git diff --name-only 4b4fa67..HEAD` stays inside `tests/**`, `scripts/**`, `playwright.config.ts`, `eslint.config.js`, `package.json` + `pnpm-lock.yaml`, `astro.config.ts`, `.github/workflows/ci.yml`, `docs/testing.md`. **`src/**` is untouched** (confirmed: no `src/` path in the name-only list).

`astro.config.ts` is import-only in effect: the hunk deletes the local `normaliseBase` and imports the identical function from the new `scripts/base-path.ts`. I compared the two bodies — `(raw ?? '/business-toolkit/').trim()`, `'' | '/' → '/'`, else strip and re-wrap slashes — behaviour is byte-identical, with `DEFAULT_BASE` extracted as a named constant. Within the brief's allowlist.

## CI wiring (re-verified)

`@action-validator/cli` exits 0. No job passes `--reporter` or `--config`, so `playwright.config.ts` always applies (`reporter: [github, html, guard-reporter]` under CI, `globalTeardown: guard-teardown.ts`). The only CI change in this round is the `lighthouse` job: the old "skip if the script is not defined yet" shim is gone and `pnpm lhci` is now a hard gate, preceded by a Playwright cache and `playwright install --with-deps chromium` so `scripts/ci/chrome-path.mjs` resolves. `PLAYWRIGHT_VERSION: '1.63.0'` (workflow-level `env:`, line 20) matches `@playwright/test` in `package.json`. That satisfies C7's "`lighthouse` (artifact)" as a gate.

## Scenario table

### Pass-4 probes A–E, re-verified (M1)

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| A | Page opened in `beforeAll` **through a helper**, defect in the body, closed in `afterAll` | run fails, naming the real defect | **Correct — fails** | `x 1 zz-a.spec.ts:20:1 … Error: [e2e guards] 2 unexpected console error(s), page error(s) or CSP violation(s): - console.error: zz probe console error (…/zz-probe/:12) - console.error: Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector (http://192.0.2.1/zz-probe.png:0)` + `1 request(s) left the preview origin`; exit 1. Note it reports the **actual** error, not a stray-context message |
| B | Same, but `shared.context().close()` at the end of the body | run fails | **Correct — fails** | `x 2 zz-bd.spec.ts:16:3 › B › zz B defect then context closed inside the body`, same two console errors + the off-origin request; exit 1 |
| C | `beforeAll` opens a seed page, emits the defect and closes it **inside `beforeAll`**; a clean test follows | run fails, reported on the first test | **Correct — fails** | `x 5 zz-c.spec.ts:17:1 › zz C clean body after a dirty beforeAll … Error: [e2e guards] 2 unexpected console error(s) …`; exit 1 |
| D | `beforeAll` page, defect in the body, then `goto('about:blank')` before teardown | run fails | **Correct — fails** | `x 3 zz-bd.spec.ts:35:3 › D › zz D defect then parked on about:blank`, same block; exit 1 |
| E | Same as C, `browser.newPage()` in a helper so **no ESLint selector matches** | run fails at run time | **Correct — fails** | E is the shape of A/C/E in my probes: every one of my hook probes calls `openViaHelper(browser)`, never `browser.newPage()` literally inside the hook. All three fail at run time. ESLint no longer needs to catch it |

### Pass-4 probes L / K2, re-verified (m1)

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| L | `const target = page; target.request.get('http://192.0.2.1/zzL')` — the alias no lint selector sees | run fails | **Correct — fails** | `x 3 zz-api.spec.ts:4:1` → `[e2e guards] 1 request(s) left the preview origin http://127.0.0.1:5691 …` |
| K2 | The Playwright `request` fixture | run fails | **Correct — fails** | `x 3 zz-bd.spec.ts:43:1 › zz K2 … Error: [e2e guards] the \`request\` fixture is an APIRequestContext that no guard can observe …` |
| — | `page.request === context.request` in Playwright 1.63 | true | **Correct** | assertion `expect(page.request === context.request).toBe(true)` passed before the guard threw on the following line |
| — | **My addition**: reach the *unwrapped prototype* method — `Object.getPrototypeOf(page.request).get.call(page.request, 'http://192.0.2.1/zzProto')` | unclear; the instance wrap is documented as the control | **Correct — fails, and better than claimed** | `x 4 zz-api.spec.ts:11:1 … Error: [e2e guards] APIRequestContext … may not reach another origin: **FETCH** http://192.0.2.1/zzProto`. The verb methods delegate to `this.fetch`, which *is* wrapped on the instance, so the prototype route is closed as a side effect |

### My own probes of the new design's seams

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| P1 | Defect raised **entirely inside `test.afterAll`** (the shape pass 4 did not raise) | worker teardown fails the run | **Correct — fails** | `x 2 zz-afterall.spec.ts:10:1 … Error: [e2e guards] after the last test in this worker (a test.afterAll hook, or work that outlived a test): 2 unexpected console error(s) … 1 request(s) left the preview origin`; exit 1 |
| P2 | `test.beforeAll` ordering: is the worker fixture really installed before the hook? | yes | **Correct** | Probes A/C/E prove it empirically — the hook's `browser.newPage()` goes through the patched `newContext` and is fully guarded (console, network and CSP), not merely detected |
| P3 | Context created by walking past the own-property patch: `Object.getPrototypeOf(browser).newContext.call(browser)` | second net reports it | **Correct — fails** | `x 3 zz-browser.spec.ts:17:1 › zz PROTO … Error: [e2e guards] 1 page URL(s) were loaded in a browser context that the guards never saw:` |
| P4 | Same, **plus `browser.removeAllListeners('context')`** first | ideally detected | **PASS — exit 0 (see m2)** | `ok 4 zz-browser.spec.ts:28:1 › zz PROTONET … (51.1s)`. The `removed` check only inspects listeners registered through `listen()`, which excludes the browser-level `'context'` listener; the liveness check in `take()` stays satisfied by contexts already in `seen`. Two deliberate, lint-banned steps are needed, so: minor |
| P5 | **Second browser**: `chromium.launch()`, real defect on its page | documented as lint-only | **PASS — exit 0, as documented** | `ok 2 zz-browser.spec.ts:8:1 › zz SB defect on a page from a browser the spec launched (1.2m)`. `docs/testing.md:101,140` state this plainly, and reaching it needs a value import that `eslint.config.js:54` bans (verified: the `@playwright/test` import in my probe errors). No finding — see Other observations |
| P6 | `preview-url.ts` disagreeing with `baseURL`: `test.use({ baseURL: 'http://127.0.0.1:5999/business-toolkit/' })` | guard fails the test | **Correct — fails** | `x 1 zz-baseurl.spec.ts:6:1 … Error: [e2e guards] use.baseURL is on http://127.0.0.1:5999, but the worker guards watch http://127.0.0.1:5691 (tests/e2e/helpers/preview-url.ts). They must agree … Change PW_PORT, not use.baseURL.` |
| P7 | **Opt-out × worker scope**: `beforeAll` loads a page with a broken **same-origin** asset (a real 404 defect); the first following test carries its own unrelated `allowConsoleError('/Failed to load resource/', …)` | the hook defect must still fail | **PASS — exit 0 (m1)** | `ok 1 zz-optout.spec.ts:18:1 › zz OPT first test has its own unrelated opt-out (8.8s)  1 passed`. Control: the identical page loaded in a test **body** with no opt-out fails — `x 1 zz CTRL probe2 … console.error: Failed to load resource: the server responded with a status of 404 (Not Found) (…/zz-probe2/zz-missing-asset.png:0)` |
| P8 | `beforeAll` defect when **every** test in the file is statically skipped | not lost | **Correct (vacuous)** | `1 skipped`, exit 0 — Playwright never ran the hook, so nothing was produced. Not a hole |
| P9 | Retry protection (M2): guard violation on attempt 1 only, `--retries=2` | run fails | **Correct — fails** | `1 flaky` … then `[e2e guards] The run fails: 1 guard problem(s) … guard violation on attempt 1 of zz-retry.spec.ts:5 … was retried away (the run ended "passed")`; exit 1 |
| P10 | Genuine infrastructure flakiness: ordinary failure on attempt 1, green on retry | **must stay green, no `[e2e guards]` block** | **Correct** | `x 1`, `ok 2 (retry #1)`, `1 flaky`, **exit 0**, no `[e2e guards]` output at all |
| P11 | `test.fail()` hiding a guard-only failure | run fails | **Correct — fails** | `1 passed` then `[e2e guards] … is hidden by test.fail()/test.fixme(): the failure counts as expected and the run would pass`; exit 1 |
| P12 | Clean control test | passes | **Correct** | `ok 2 zz-ctrl.spec.ts:11:1 › zz CTRL clean test passes` |

### Regression sample from the pass-3 table

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| S3A | Opt-out at `test.describe(…, { annotation })` level | test and run fail | **Correct** | `"allow-console-error" is declared at …zz-s3.spec.ts:4, not on the test itself (test.describe annotations would opt out a whole block)`, repeated by the reporter |
| S3B | Empty opt-out pattern on the test itself | test and run fail | **Correct** | `"allow-console-error" has no match pattern; an empty pattern would allow everything` |
| S3C | Opt-out pushed at run time from the body | test and run fail | **Correct** | `"allow-console-error" was added at run time (test.info().annotations.push in a hook or the test body)` |
| S3D | `context.removeAllListeners('console')` | test fails | **Correct** | `Guard listener(s) were removed (console). Specs must not call removeAllListeners/off on a page or context.` |
| S3E | WebSocket to another origin | test fails | **Correct** | `1 request(s) left the preview origin … - WEBSOCKET ws://192.0.2.1:9/zz` |
| S3F | Off-origin image hidden behind `page.route('**/*', r => r.continue())` | test fails | **Correct** | `1 request(s) left the preview origin … - GET http://192.0.2.1/zzS3F.png (image)` |
| S3G | Spec importing `test` from `@playwright/test` | run fails | **Correct** | test-level `1 passed`, then `[e2e guards] … unguarded test: zz-unguarded.spec.ts:4 … (passed)`; exit 1. ESLint reports it exactly **once** |
| S3H | `--reporter=list` replaces the configured reporters | run fails | **Correct** | `1 passed` then `Error: [e2e guards] tests/e2e/helpers/guard-reporter.ts did not run …`, including the "(this also appears when no test matched the filter …)" wording; exit 1 |
| S3I | `inline-handler`: the six attributes pass 4 named, plus `ononline` and uppercase `ONCLICK` | all reported | **Correct** | `[inline-handler] <body onafterprint="x()">`, `onbeforeprint`, `onlanguagechange`, `ongotpointercapture`, `onlostpointercapture`, `ondragexit`, `ononline`, `onclick` — 8 findings |
| S3J | `inline-handler`: `once`, `only`, `online`, `data-on` on the same element | **not** reported | **Correct, no false positives** | same run, exactly the 8 above and nothing else |

## Findings

### minor (m1): a defect raised in `beforeAll` is filtered through the *next test's* opt-outs

File: `tests/e2e/fixtures.ts:582-598` (`harnessGuards` teardown: `guardProblems(guards.take(), accepted, …)`); `tests/e2e/helpers/guard-policy.ts:132` (`classifyOptOuts`); `docs/testing.md:115`, `docs/testing.md:152-154`
Acceptance item: build plan C6 — "csp-and-network (zero console errors/CSP/third-party)"; `docs/testing.md:154` "Opt-outs exist only per test, and only in the details of that test's own `test()` call."

What is wrong: the collectors are worker-scoped and drained at each test's teardown, but the *filter* applied at that drain is the draining test's `accepted` opt-out list. Anything a `test.beforeAll` hook produced therefore inherits the opt-outs of the first test that follows it. That breaks the stated per-test invariant in the one direction that matters: an opt-out declared for test T silences a defect that did not happen in T, and the run exits 0.

Only console/page/CSP errors are affected. Off-origin traffic is safe: `blocked` entries are decided at collection time against `allowOrigin`, which is `DENY_OTHER_ORIGINS` outside a test (`fixtures.ts:239`, reset in the `finally` at `:579`), and `guardProblems` re-reports `harvest.blocked` unconditionally. I verified both halves.

The exposure is narrow — it needs a page-touching `beforeAll` (which `eslint.config.js:116` already discourages) *and* a matching opt-out on the next test — which is why it is minor rather than major. But it is not theoretical: the suite's one real opt-out today is `not-found.spec.ts:26` `allowConsoleError('/status of 404/', …)`, and the error text my probe produced was `Failed to load resource: the server responded with a status of 404 (Not Found)`. That pattern matches. Add a `beforeAll` to that file later and a genuinely broken same-origin asset goes green.

How to reproduce: `dist/zz-probe2/index.html` containing `<img src="zz-missing-asset.png">` (same-origin 404); a spec whose `beforeAll` opens it via a helper and closes the page, and whose single test declares `allowConsoleError('/Failed to load resource/', 'This test deliberately requests a URL that does not exist, for its own reasons.')`. Result: `ok 1 zz OPT first test has its own unrelated opt-out (8.8s)  1 passed`, exit 0. The same page loaded in a test body with no opt-out fails.

Suggested fix: harvest at the hook boundary rather than only at test teardown. Cheapest version: have `harnessWorkerGuards` expose a `take()` that the *test-scoped* fixture calls once at **setup** as well as at teardown, and report anything the setup drain finds as a hook-scoped problem with no opt-outs applied (the same path the worker teardown already uses at `fixtures.ts:513`, `guardProblems(take(), [], origin)`). The message can then say "raised before this test started (a `test.beforeAll` hook)", which also fixes the attribution the docs currently apologise for.

### minor (m2): the second net has no tamper detection, and its liveness check cannot see the event stopping mid-run

File: `tests/e2e/fixtures.ts:440-443` (the `browser.on('context', trackContext)` registration), `tests/e2e/fixtures.ts:462-468` (the liveness check), `tests/e2e/fixtures.ts:469-475` (the `removed` check); `docs/testing.md:117`
Acceptance item: `docs/testing.md:117` — "If a Playwright upgrade stopped emitting that event, the next teardown says so rather than going quiet."

What is wrong, two related things:

1. `trackContext` is attached with a bare `browser.on('context', …)`, not through the `listen()` helper, so it is never pushed into `listeners`. The "Guard listener(s) were removed" check at `:469-475` iterates `listeners` only, and therefore cannot see the browser-level listener being torn off. `browser.removeAllListeners('context')` disables the entire second net silently. (The `removeAllListeners` selector in `eslint.config.js:102` is lint-only, and pass 4 established that one level of indirection walks past those.)
2. The liveness check is `guarded.size > 0 && ![...guarded].some((context) => seen.has(context))`. Both `guarded` and the `seen` entries for guarded contexts grow monotonically — `seen.delete` at `:459` only removes *stray* contexts. So once a single guarded context has been recorded, the condition is permanently false. The check detects an event that **never** fires; it cannot detect one that stops. The docs sentence promises the latter.

Combined, P3 + P4 show the effect: the prototype bypass alone is caught (`1 page URL(s) were loaded in a browser context that the guards never saw`), the same bypass after `removeAllListeners('context')` passes green. It takes two deliberate, lint-banned steps, and the primary net (the `newContext` patch) is untouched in any realistic shape, so: minor, not major.

How to reproduce: probes P3 and P4 in the scenario table (`zz-browser.spec.ts`).

Suggested fix: register `trackContext` through `listen()` (widen its `target` type to include `Browser`) so the existing removal check covers it; and make the liveness check a per-drain one — for example record whether any context was created since the last `take()` and whether the event fired for it — or state in `docs/testing.md:117` only what the check actually does (it catches the event never firing at all, which is the Playwright-upgrade case it was written for).

### nit (n1): the settle step does not run before the worker-scope leftover drain

File: `tests/e2e/fixtures.ts:510-519` (leftover `guardProblems(take(), [], origin)`); compare `:577` where the test-scoped teardown calls `settle(...)` first
Deferred work from a `test.afterAll` hook — a `console.error` on a short `setTimeout` after the page loads — is not waited for at worker teardown the way it is at test teardown, because `settle()` is only called on the test path. My P1 probe used an explicit `waitForLoadState('networkidle')`, so it does not distinguish the two. **Stated from code reading; I did not probe it**, and I did not want to re-dirty a cleaned worktree for a nit. If the author agrees it is real, a `settle(openPages(), true)` before the final `take()` is one line; if not, a sentence at `fixtures.ts:510` saying late work in `afterAll` is out of scope would close it.

### nit (n2): `blocked` is a `Set`, so repeated identical off-origin requests are reported as one

File: `tests/e2e/fixtures.ts:301` (`const blocked = new Set<string>()`), message at `:271`
The entry key is `METHOD url (resourceType)`, so twenty identical beacons to a tracker report as `1 request(s) left the preview origin`. Nothing is hidden and the URL is named, but the count in the message understates the traffic, which matters when someone is judging how bad a leak is. `errors` is a plain array and does not dedupe, so the two halves of the message are counted on different bases. Either count occurrences alongside the deduped key, or say "distinct request(s)".

## Pass-4 findings verification

| Pass-4 finding | Status | Evidence |
| --- | --- | --- |
| **major (M1)**: a page created in `beforeAll` is unguarded whenever its context does not survive to teardown; the lint ban is evaded by one level of indirection | **Resolved** | The patch moved to a worker-scoped auto fixture (`fixtures.ts:296-522`), so it is installed before `test.beforeAll`. All five pass-4 shapes now fail, and each reports the **real** defect, not a stray-context message: A (`zz-a.spec.ts`), B and D (`zz-bd.spec.ts`), C (`zz-c.spec.ts`), E (every one of my hook probes routes `browser.newPage()` through `openViaHelper()`, which no selector matches, and all still fail). The claim that it also closed `test.afterAll` traffic is **true** and I verified it independently (P1): `[e2e guards] after the last test in this worker (a test.afterAll hook, or work that outlived a test)`. `docs/testing.md:115` now describes the behaviour accurately. The cumulative `browser.on('context')` second net works (P3) — with the caveat in m2 |
| **minor (m1)**: `APIRequestContext` traffic reaches any origin in a green run; the lint restriction is name-based | **Resolved** | `guardApiRequest` (`fixtures.ts:341-362`) wraps `fetch/get/post/put/patch/delete/head` on **each guarded context's instance** with `Object.defineProperty`, leaving the shared prototype untouched, and the `request` fixture is replaced by one that throws (`fixtures.ts:530-536`). Probe L fails, K2 fails, and the prototype route fails too because the verb methods delegate to the wrapped `fetch`. `page.request === context.request` asserted true in 1.63. `request.newContext()` remains lint-only and is **named as such** in `docs/testing.md:104,139` |
| **minor (m2)**: the `inline-handler` rule misses six real event-handler attributes | **Resolved** | `audit-links.ts:63-75`: `ON_PREFIXED = /^on[a-z]+$/` minus `NOT_EVENT_HANDLER_ATTRIBUTES = ['once','only','online']`, i.e. it fails closed. `pnpm dist:audit` on a probe page reports all six (`onafterprint`, `onbeforeprint`, `onlanguagechange`, `ongotpointercapture`, `onlostpointercapture`, `ondragexit`) plus `ononline` and uppercase `ONCLICK`, and **nothing** for `once`, `only`, `online`, `data-on` |
| **nit (n1)**: the docs justify allowing `test.skip` with a reason that is not true | **Resolved** | `docs/testing.md:138` now reads "The reason is **not** that a skipped test runs no body … It is that the automatic fixture's teardown runs whatever the result is, and its throw turns the skip into a failure … Do not 'optimise' that teardown away" |
| **nit (n2)**: the `expiresOn` warning is a bare stdout line, and nothing uses the field | **Resolved** | `exceptions.ts:76-79` adds `overdueWarningCommand` with `%`/`CR`/`LF` escaping; `csp-and-network.spec.ts:67` emits `::warning title=Overdue page check exception::…` under `process.env.CI`; and the home-page exception now carries `expiresOn: '2026-12-31'` (`exceptions.ts:71`), so the path is live. Documented at `docs/testing.md:68` |
| **nit (n3)**: `hiddenGuardFailure` groups attempts by title and location, not by test id | **Resolved** | `guard-reporter.ts:50` passes `id: test.id`; `guard-policy.ts:273` keys on `test.id ?? <file:line:col:title>` and documents why (`ExecutedTest.id`, `guard-policy.ts:247-250`) |

## Other observations (no finding)

- **`chromium.launch()` is still outside every guard, and that is correctly documented.** P5 shipped a real `console.error` plus an off-origin image through a green run. `docs/testing.md:101` ("launching or connecting browsers — **lint only**, nothing at run time sees a browser a spec launched itself") and `:140` both say so, and reaching it requires a value import of `@playwright/test` that `eslint.config.js:54` rejects — I confirmed the error fires on my probe file. Three lint-only rules exist (`launch`/`connect`, `request.newContext()`, and the `test.use` guard-fixture override); the docs name the first two explicitly in "Known limits" and the third is covered by the `.extend`/`test.use` pair. The brief's claim that the docs "name the two rules with no runtime backing" is accurate.
- **The `preview-url.ts` design is sound.** A worker fixture genuinely cannot read the test-scoped `baseURL` option, so a shared module is the right shape, and the mismatch check (`fixtures.ts:542-549`) makes the duplication self-correcting rather than a drift risk — verified live in P6. The error message even points at the right lever ("Change `PW_PORT`, not `use.baseURL`").
- **The `beforeAll`/`afterAll` lint rule was kept with an honest reason.** `eslint.config.js:113-119` now says the shape *is* guarded and that the objection is shared state plus where the report lands. Given m1, keeping that rule is the right call — it is currently the only thing discouraging the shape that m1 exploits.
- **`docs/testing.md:96` is unusually candid** about the lint layer being bypassable ("Reviews have defeated two of these rules that way"). That is the correct posture for a package whose whole value is that green means green.
- **Only-passing-tests-need-the-stamp still behaves.** P10's infra flake produced `1 flaky`, exit 0, and no `[e2e guards]` output, so an infrastructure timeout is never misreported as a wrong import.
- `pnpm lint`/`pnpm test`/etc. trigger pnpm's `prepare` (`lefthook install`) in this worktree. Idempotent; `git status --short` stayed empty.

## State at the end

- Every probe artefact deleted: `tests/e2e/zz-*.spec.ts` (14 files: `zz-a`, `zz-c`, `zz-afterall`, `zz-api`, `zz-bd`, `zz-browser`, `zz-baseurl`, `zz-optout`, `zz-ctrl`, `zz-skipall`, `zz-retry`, `zz-fail`, `zz-s3`, `zz-unguarded`) and `dist/zz-probe/`, `dist/zz-probe2/`, `dist/zz-handler/`, plus `test-results/` and `playwright-report/`. A recursive `Get-ChildItem -Filter "zz*"` over the worktree returns nothing.
- `dist/` rebuilt with `pnpm build` (exit 0) and restored to exactly the five files it held before I started: `.nojekyll`, `_astro/page.BDh2vuYI.js`, `index.html`, `sitemap-0.xml`, `sitemap-index.xml`. `dist:audit` afterwards: `1 HTML file(s), 1 URL(s) checked … No problems.`
- `git status --short` → **empty**. `git rev-parse HEAD` → `e0f355a418a561af0089d94d01ee22375291d629`, unchanged. I edited nothing under the author's tracked files.
- No server left listening: `Get-NetTCPConnection -State Listen` on ports 5691, 5692, 5999, 4321 and 4322 returns nothing.
