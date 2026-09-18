# WP-22a review, pass 6 (Reviewer W: whole diff, fresh eyes, deciding pass)

- Worktree: `.claude/worktrees/agent-adc6b347a89c34014`, branch `worktree-agent-adc6b347a89c34014`, HEAD `ecc35ef` (`ecc35efb1c65b3d23c09630b8cdc5149c6e881be`), confirmed with `git rev-parse HEAD` before starting and again after cleanup. Round under review adds `6f1cafe` and `ecc35ef` on top of pass 5's `e0f355a`.
- Base: `git merge-base main worktree-agent-adc6b347a89c34014` = `4b4fa673a9ad5291dda61166be7dfac77a148f56`.
- Date: 2026-09-18
- Machine: Windows 11, loaded. Chromium context setup alone repeatedly took 24–25 s per test (a single-test chromium run takes ~52 s wall). I ran every Playwright command with `--workers=1 --timeout=180000` and `PW_PORT=5691`, and never passed `--reporter` except in the one probe that deliberately tests the override. **No environment failure occurred this session** — every red result below is a real, reproducible guard result, and I did not have to re-run anything for a hook timeout.
- `main` has moved a long way (content pipeline `22e14b0`, design system `337ae26`). I reviewed the branch against its own merge base; merge integration is the orchestrator's job. Because the base predates both, `dist/` holds exactly one page, so the route-driven specs are thin — that is a property of the base, not of this package.
- Not run: `pnpm lhci` (out of scope per the brief; CI is the gate). `pnpm test:visual` — no `visual.spec.ts` and no baselines exist in the diff. `pnpm content:fidelity` — not this package's script and there is no content on this base; `pnpm test:content` does run and passes vacuously.
- Diff reviewed: `git diff 4b4fa67..HEAD` — 39 files, +7810/−63.

## Verdict: CLEAN

| Severity | Count |
| -------- | ----- |
| blocker  | 0     |
| major    | 0     |
| minor    | 2     |
| nit      | 1     |

My core job was to make a green run ship a real defect. I could not, across 22 probes aimed squarely at the seams this round introduced.

The three claims of the latest round all hold, and I verified each independently rather than re-running the author's probes:

- **m1 (setup-time drain).** I proved the ordering empirically, which is the crux: `harnessGuards` setup really does run *after* `test.beforeAll`, so a defect the hook produced is drained with `accepted = []` and reported as `raised before this test started`. Pass 5's exact hole — an unrelated `allowConsoleError` on the following test — is closed (P1). The cross-file shape the author says pass 5 did not raise is closed too (P4). It also survives `test.describe.configure({ mode: 'serial' })` (P6).
- **m2 (listener registry + per-drain liveness).** Both halves work. `browser.removeAllListeners('context')` is now reported as `Guard listener(s) were removed (context)` (P10), and I killed the listener *while faking `browser.listeners`* so that only the liveness check could notice — it noticed, on the next test's setup drain (P15).
- **n1 (settle before the worker-teardown drain).** A `console.error` fired 800 ms after `test.afterAll` returned, on a page the hook left open, fails the worker (P3). It survives `--retries=2` (Playwright cannot retry it away because it is not a test failure). The `setScriptsEnabled` interaction does not break the `nojs` project: a `nojs` worker-teardown defect is still caught (P5).

No regressions. M2's retry protection still fails a guard violation that a retry hid (P7), `test.fail()` still cannot hide one (P8), a mid-body `test.skip()` after a defect still fails (P14), ordinary infrastructure flakiness still retries **green with no `[e2e guards]` block** (P21, exit 0), and none of the five projects produced a false `Guard listener(s) were removed` — the regression the author named as most feared.

The two minors are diagnostic-quality and documentation-accuracy issues. Neither lets a defect ship green, and I say so plainly rather than inflating them: under `docs/reviews/README.md` they may be fixed without restarting the two-pass count, or moved to `backlog.md`.

## Commands (all run by me, in the worktree, this session)

| Command | Exit | Tail |
| --- | --- | --- |
| `git rev-parse HEAD` | 0 | `ecc35efb1c65b3d23c09630b8cdc5149c6e881be` |
| `git merge-base main worktree-agent-adc6b347a89c34014` | 0 | `4b4fa673a9ad5291dda61166be7dfac77a148f56` |
| `git status --short` (before, worktree **and** main) | 0 | empty in both |
| `pnpm lint` | 0 | `Checking formatting... All matched files use Prettier code style!` |
| `pnpm typecheck` | 0 | `Result (35 files): - 0 errors - 0 warnings - 0 hints` |
| `pnpm test` | 0 | `Test Files 3 passed (3)  Tests 119 passed (119)  Duration 13.27s` |
| `pnpm test:content` | 0 | `include: tests/content/**/*.test.ts` — vacuous on this base (`--passWithNoTests`) |
| `pnpm build` (runs `dist:audit`) | 0 | `dist:audit: 1 HTML file(s), 1 URL(s) checked under base /business-toolkit/. No problems.` |
| `PW_PORT=5691 playwright test --project chromium --workers=1 --timeout=180000` | 0 | `2 skipped  4 passed (1.7m)` (skips: the two 404 tests, no `dist/404.html` on this base) |
| `… --project webkit --project mobile --project nojs` | 0 | `8 skipped  5 passed (2.4m)` |
| `… --project a11y` | 0 | `ok 1 light theme › / (30.2s)`, `ok 2 dark theme › / (16.4s)`, `2 passed (1.2m)` |
| `pnpm dlx @action-validator/cli .github/workflows/ci.yml` | 0 | no findings |
| `pnpm exec eslint tests/e2e/zz-p17.spec.ts tests/e2e/zz-p9.spec.ts` | 1 | `✖ 4 problems (4 errors, 0 warnings)` — `request` fixture, `page.route`, two listener removals |
| `pnpm dist:audit` after cleanup | 0 | `1 HTML file(s), 1 URL(s) checked … No problems.` |
| `git status --short` (after cleanup, worktree **and** main) | 0 | empty in both (`LINES=0`) |

Probe runs (each `--project chromium --workers=1 --timeout=180000` unless noted):

| Probe run | Exit | Tail |
| --- | --- | --- |
| `-g "zzP1"` | 1 | `Error: [e2e guards] raised before this test started … so no opt-out on this test applies` at `fixtures.ts:605` |
| `-g "zzP2"` | **0** | `ok 1 zzP2 own opt-out still works (24.9s)  1 passed` |
| `-g "zzP3"` | 1 | `[e2e guards] after the last test in this worker …` at `fixtures.ts:545`; `1 passed`, `1 error was not a part of any test` |
| `-g "zzP3" --retries=2` | 1 | same worker-teardown error; not retried away |
| `-g "zzP4"` | 1 | `1 failed` (`zz-p4b`), `1 passed` — cross-file leak reported at the next file's setup drain |
| `--project nojs -g "zzP5"` | 1 | `[e2e guards] after the last test in this worker … GET http://192.0.2.1/zzP5.html (document) (×2)` |
| `-g "zzP6"` (serial mode) | 1 | `1 failed`, `1 did not run` |
| `-g "zzP7" --retries=2` | 1 | `1 flaky`, then `[e2e guards] … was retried away (the run ended "passed")` |
| `-g "zzP8"` (`test.fail()`) | 1 | `1 passed`, then `[e2e guards] … is hidden by test.fail()/test.fixme()` |
| `-g "zzP9\|zzP10"` | 1 | `Guard listener(s) were removed (console)`; `… (context)`; `2 failed` |
| `-g "zzP11"` | 1 | `1 distinct request(s) … GET http://192.0.2.1/zzP11.png (image) (×2)` |
| `-g "zzP13"` (`beforeEach` defect + test opt-out) | **0** | `1 passed (1.0m)` — see minor (m2) |
| `-g "zzP14"` (mid-body `test.skip`) | 1 | `[e2e guards] 1 unexpected console error(s) … 1 failed` |
| `-g "zzP15"` | 1 | `The browser reported no 'context' event for any context the guards installed since the last check …` |
| `-g "zzP17\|zzP18\|zzP20"` | 1 | `3 failed` — apirequest, `request` fixture, route-continued image |
| `-g "zzP21" --retries=2` | **0** | `1 flaky`, **no `[e2e guards]` block** |
| `-g "zzP22"` | 1 | `3 failed`, then `[e2e guards] The run fails: 4 guard problem(s)` |
| `--reporter=list -g "zzP2 own"` | 1 | `1 passed`, then `Error: [e2e guards] tests/e2e/helpers/guard-reporter.ts did not run …` |
| `pnpm dist:audit` with `dist/zz-audit.html` | 1 | `14 problem(s) (base-element: 1, missing-target: 1, external-refresh: 1, third-party-resource: 3, inline-handler: 2, external-form: 1, base-fragment: 1, insecure-http: 1, javascript-url: 1, noopener: 1, base-path: 1)` |

## Ownership

`git diff --name-only 4b4fa67..HEAD` lists 39 files, all inside `tests/**`, `scripts/**`, `playwright.config.ts`, `eslint.config.js`, `package.json` + `pnpm-lock.yaml`, `astro.config.ts`, `.github/workflows/ci.yml`, `docs/testing.md`. **`src/**` is untouched** — no `src/` path appears in the list.

`astro.config.ts` is import-only: the hunk deletes the local `normaliseBase` and imports the identical function from the new `scripts/base-path.ts`. I diffed the two bodies — `(raw ?? '/business-toolkit/').trim()`, `'' | '/' → '/'`, else strip and re-wrap slashes — behaviour is identical, with `DEFAULT_BASE` extracted as a named constant. Within the brief's allowlist.

`package.json` changes are confined to this package's contract: `build` now chains `pnpm dist:audit`, plus new `dist:audit` and `lhci` scripts and the `@lhci/cli` devDependency. Note that `typecheck` is still only `astro check`, without the `tsc -p tsconfig.scripts.json` that build plan C5 lists — but that script is **unchanged by this diff** and `tsconfig.json` uses `include: ["**/*"]`, so `tests/**` and `scripts/**` *are* type-checked (verified: 35 files, 0 errors). Not this package's finding.

## CI wiring (re-verified)

`@action-validator/cli` exits 0. No job passes `--reporter` or `--config`: the `e2e` job runs `pnpm exec playwright test --project ${{ matrix.project }}` (line 92), `a11y` runs `pnpm test:a11y` (124), `visual` runs `pnpm test:visual` (157), `lighthouse` runs `pnpm lhci` (192) as a hard gate. So `playwright.config.ts` always applies — `reporter: [github, html, guard-reporter]` under CI and `globalTeardown: guard-teardown.ts`. Workflow-level `PLAYWRIGHT_VERSION: '1.63.0'` (line 20) matches `@playwright/test` in `package.json`, and the browser cache is keyed on it. `BASE_PATH`/`SITE_URL` come from repo variables with the C7 defaults.

## Scenario table

### The crux: does the setup drain really see `test.beforeAll`?

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| P1 | `beforeAll` opens a page via `browser.newPage()`, emits `console.error`, closes it **inside the hook**; the file's single test carries a **matching** `allowConsoleError` | run fails, hook-attributed, opt-out ignored | **Correct — fails** | `x 1 zz-p1.spec.ts:11:1 … Error: [e2e guards] raised before this test started (a test.beforeAll hook, or work that outlived an earlier test), so no opt-out on this test applies: 1 unexpected console error(s) … - console.error: zzDEFECT hook P1` at `fixtures.ts:605`; exit 1. **This is the empirical proof that `harnessGuards` setup runs after `beforeAll`** — the whole m1 design rests on it, and it was previously only asserted |
| P2 | A test's **own** `console.error` with its own matching opt-out | still green | **Correct** | `ok 1 zzP2 own opt-out still works (24.9s)  1 passed`, exit 0. The fix did not break legitimate opt-outs |
| P6 | Same as P1 but under `test.describe.configure({ mode: 'serial' })`, with **both** tests carrying a matching opt-out | run fails on the first test | **Correct — fails** | `x zz-p6.spec.ts:13:1 › zzP6 first serial test`, same `raised before this test started` block; `1 failed`, `1 did not run`; exit 1 |
| P13 | Defect raised **between the setup drain and the body**, i.e. in `test.beforeEach`, with a matching opt-out on the test | — | **PASS — exit 0** | `1 passed (1.0m)`. The `beforeEach` error is drained at the test's teardown and excused by that test's opt-out. This also *proves* auto fixtures set up before `beforeEach`. See minor (m2): the behaviour is defensible, the docs' absolute wording is not |

### `test.afterAll` and the worker-teardown drain (n1)

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| P3 | `afterAll` opens a page, schedules `console.error` at **+800 ms**, returns **without awaiting it**, leaves the page open; last spec in the worker | worker teardown settles, then fails | **Correct — fails** | `Error: [e2e guards] after the last test in this worker (a test.afterAll hook, or work that outlived a test): … - console.error: zzDEFECT late afterAll P3` at `fixtures.ts:545`; `1 passed` but `1 error was not a part of any test`; exit 1. Pass 5's n1 was stated from code reading only; this probes the deferred half it could not distinguish |
| P3r | Same, with `--retries=2` | not retried away | **Correct** | identical error, exit 1. A worker-teardown error is not a test failure, so Playwright never retries it into `flaky` |
| P4 | **Cross-file leak**: file A's `afterAll` emits a defect; file B (next in the same worker) has one test with a **matching** opt-out | reported against file B's setup drain, opt-out ignored | **Correct — fails** | `x zz-p4b.spec.ts:4:1 … raised before this test started … - console.error: zzDEFECT afterAll P4a`; `1 failed  1 passed`; exit 1 |
| P5 | **`nojs` project** (`javaScriptEnabled: false`): `afterAll` navigates a page to another origin; tests the `setScriptsEnabled` path | worker teardown fails; no hang, no false green | **Correct — fails** | `[e2e guards] after the last test in this worker … 1 distinct request(s) left the preview origin … GET http://192.0.2.1/zzP5.html (document) (×2)`; exit 1. The JS-disabled settle path neither hangs nor suppresses the drain |
| — | Worker that runs **exactly one test** | both drains still run | **Correct** | P1, P3 and P5 are all single-test workers; the setup drain fired in P1 and the worker-teardown drain in P3 and P5 |
| — | A defect landing on **no test at all** | worker teardown is the backstop | **Correct** | P3/P5 are exactly that shape: the test passed and the run still failed. I found no window in which a drain does not eventually run — if `use()` throws (timeout), the collectors are simply not cleared and the leftovers surface at the next drain, which fails closed |

### The second net and its two self-checks (m2)

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| P10 | `browser.removeAllListeners('context')` | reported as a removed guard listener | **Correct — fails** | `Error: [e2e guards] Guard listener(s) were removed (context). Specs must not call removeAllListeners/off on a page or context.` — reported both on the test and again at worker teardown; exit 1. Pass 5's m2 half 1 is closed |
| P15 | **Liveness half, isolated**: remove the `'context'` listener **and** stub `browser.listeners` to keep returning the pre-removal array, so the removal check is blinded and only the liveness check can notice. Two tests, so a new context is guarded after the sabotage | the per-drain liveness check fires | **Correct — fails** | `x 2 zz-p15.spec.ts:17:1 › zzP15b … The browser reported no 'context' event for any context the guards installed since the last check, so the cumulative check for unguarded contexts in tests/e2e/fixtures.ts is dead. Playwright probably renamed the event, or a spec removed the listener` ; `1 failed  1 passed`; exit 1. Pass 5's m2 half 2 (an event that *stops* firing mid-run) is closed |
| P9 | `context.removeAllListeners('console')`, then a real `console.error` | reported | **Correct — fails** | `Guard listener(s) were removed (console)` |
| — | **False positives** for either check across all five projects | none | **Correct** | chromium, webkit, mobile, nojs and a11y all exit 0 with no `Guard listener(s) were removed` and no liveness message. This is the regression the author named as most feared; it did not occur |

### Retries, `test.fail()`, `test.skip()` (M2 protection, no regression)

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| P7 | Guard violation on attempt 1 only (`testInfo.retry === 0`), `--retries=2` | run fails despite `flaky` | **Correct — fails** | `1 flaky`, then `[e2e guards] The run fails: 1 guard problem(s) … guard violation on attempt 1 of zz-p7.spec.ts:4 … was retried away (the run ended "passed")`; exit 1 |
| P21 | **Genuine infrastructure flakiness**: non-guard failure on attempt 1, green on retry | **must stay green, no `[e2e guards]` block** | **Correct** | `1 flaky`, **exit 0**, no `[e2e guards]` output at all |
| P8 | `test.fail()` around a guard-only failure | run fails | **Correct — fails** | `1 passed` then `[e2e guards] … is hidden by test.fail()/test.fixme(): the failure counts as expected and the run would pass`; exit 1 |
| P14 | Mid-body `test.skip(true, …)` **after** a `console.error` (the documented claim at `docs/testing.md:141`) | test fails, not skipped | **Correct — fails** | `Error: [e2e guards] 1 unexpected console error(s) … - console.error: zzDEFECT before a mid-body skip P14`; `1 failed`; exit 1 |

### Regression sample from the pass-3 / pass-4 tables

| # | Scenario | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| L (pass 4) | `const target = page; target.request.get('http://192.0.2.1/zzP17')` — the alias no lint selector sees | run fails | **Correct — fails** | `1 distinct request(s) left the preview origin … - GET http://192.0.2.1/zzP17 (apirequest)`. ESLint did **not** flag line 8 (the alias), exactly as `docs/testing.md:96` says; the runtime guard did |
| K2 (pass 4) | The Playwright `request` fixture | run fails | **Correct — fails** | `Error: [e2e guards] the \`request\` fixture is an APIRequestContext that no guard can observe …` |
| 27 (pass 3) | Off-origin image behind `page.route('**/*', r => r.continue())` | test fails | **Correct — fails** | `1 distinct request(s) … - GET http://192.0.2.1/zzP20.png (image)` — and note, **no `(×N)` suffix here**, unlike P11; see minor (m1) |
| 25/26 (pass 3) | Opt-out at `test.describe` level; pushed at run time; empty pattern; short reason | each fails the test **and** the run | **Correct** | `"allow-console-error" is declared at …zz-p22.spec.ts:4, not on the test itself`; `was added at run time (test.info().annotations.push in a hook or the test body)`; `has no match pattern; an empty pattern would allow everything`; `for "x" needs a reason of at least 20 characters` — all four repeated by the reporter: `[e2e guards] The run fails: 4 guard problem(s)`; exit 1 |
| S3H (pass 5) | `--reporter=list` replaces the configured reporters | run fails | **Correct** | `1 passed` then `Error: [e2e guards] tests/e2e/helpers/guard-reporter.ts did not run …`; exit 1 |
| 8/12/14/16 + rules (pass 3) | `dist:audit` on a page with `<base>`, external form, meta refresh to another origin, third-party `preconnect`/`stylesheet`/`img`, two inline handlers, `javascript:`, `http:`, `target=_blank` without `noopener`, root-relative href | every rule fires with file:line | **Correct** | 14 problems across 11 distinct rules, each with an accurate `dist/zz-audit.html:<line>` and the offending tag; exit 1. No rule regressed |

## Findings

### minor (m1): `(×N)` counts guard observations, not requests — a single off-origin request renders `(×2)`

File: `tests/e2e/fixtures.ts:398-402` (the context `request` observer calls `noteBlocked`) and `tests/e2e/fixtures.ts:415-421` (the context `route` handler calls `noteBlocked` again for the same request); rendered at `tests/e2e/fixtures.ts:329-331`, message at `tests/e2e/fixtures.ts:281-286`.
Acceptance item: pass-5 n2 — "Either count occurrences alongside the deduped key, or say 'distinct request(s)'." The round did both; the occurrence count is the part that is wrong.

What is wrong: every off-origin request that no spec route takes is seen twice by the guards — once by the `request` event observer and once by the `context.route` handler that aborts it — and `noteBlocked` is called on both paths. The `Map` therefore records 2 for a request that happened once. A request that a spec route *continues* is seen only by the observer and records 1. So the same single request prints `(×2)` or nothing depending on whether a spec happened to route it, and twenty real beacons would print `(×40)`.

The entry count in the message ("1 distinct request(s)") stays correct, and nothing is hidden — the run is red either way — so this is a diagnostic-quality issue, not an escape. But the suffix now actively misleads someone judging how bad a leak is, which is the exact problem pass-5 n2 asked to fix.

How to reproduce: `-g "zzP5"` → `GET http://192.0.2.1/zzP5.html (document) (×2)` for one `page.goto`. `-g "zzP11"` → `GET http://192.0.2.1/zzP11.png (image) (×2)` for one `new Image()`. `-g "zzP20"` (a `page.route` that continues) → the same shape of request with **no** suffix.

Suggested fix: count in one place only. Either drop the `noteBlocked` call from the route handler at `fixtures.ts:419` (the observer at `:398` already sees every request, which is why the docs call it the primary net), or de-duplicate per request — for example key on the `Request` object in a `WeakSet` before incrementing.

### minor (m2): "A hook's problems are attributed to the hook, never to a test" is not true for `beforeEach`/`afterEach`

File: `docs/testing.md:115` (the bolded sentence); the same claim in `tests/e2e/fixtures.ts:13-14` ("What a hook produced is drained at the **setup** of the next test … so it is attributed to the hook and no opt-out can excuse it").
Acceptance item: `docs/testing.md:157` — "Opt-outs exist only per test, and only in the details of that test's own `test()` call"; build plan C6 `csp-and-network`.

What is wrong: the sentence is absolute and is the single line a future reviewer or author will rely on, but it only holds for `beforeAll` and `afterAll`. A `test.beforeEach` (and by the same path `afterEach`) runs *inside* the test's fixture scope, after the setup drain, so what it produces is drained at that test's teardown and **is** filtered through that test's `allowConsoleError`. I verified it: a `beforeEach` that emits `zzDEFECT beforeEach P13` on every run, with one matching opt-out on the test, exits 0.

I want to be precise about severity rather than inflate it: this is **not** a re-run of pass-5's m1. There the defect was produced once for a whole file and one test's opt-out silenced it for every test. Here the hook runs once per test, so an opt-out can only ever excuse what happened during its own test — the per-test invariant itself holds, and any other test in the file is still red. The defect is in the documentation's over-generalisation, which could lead a later reviewer to assume a guarantee the code does not give.

How to reproduce: `tests/e2e/zz-p13.spec.ts` in the probe table — `test.beforeEach` does `page.goto(BASE)` then `page.evaluate(() => console.error('zzDEFECT beforeEach P13'))`, and the single test declares `allowConsoleError('zzDEFECT', …)`. `-g "zzP13"` → `1 passed`, exit 0.

Suggested fix: docs only. Narrow the sentence at `docs/testing.md:115` and the comment at `fixtures.ts:13-14` to name the hooks it means — e.g. "A `beforeAll` or `afterAll` hook's problems are attributed to the hook, never to a test. `beforeEach` and `afterEach` run inside the test's own scope, so what they produce is that test's, and that test's opt-outs apply."

### nit (n1): the `listeners` registry and the `seen` map grow for the whole life of a worker

File: `tests/e2e/fixtures.ts:316` (`const listeners: GuardListener[] = []`), `:342-345` (`listen` pushes and never removes), `:321` and `:439-460` (`seen`), `:480` (`seen.delete` removes **stray** contexts only).

Every guarded context adds four entries to `listeners` and every page one more, each holding a strong reference to the context or page; `seen` keeps an entry, a `Set` of URLs and a `framenavigated` listener per context and page, and entries for *guarded* contexts are never deleted. Nothing is freed when a context closes, so a worker that runs several hundred tests retains several hundred closed `BrowserContext`/`Page` objects and iterates ~5N registry entries at every drain. It is correct today and cheap — the `closed.has(entry.target)` short-circuit at `:497` keeps the per-drain loop trivial, and today's suite has one page — but the content and design merges will multiply the route count sharply, so it is worth a line of housekeeping (drop `listeners` entries and `seen` records for a context once its `close` event fires) or a comment saying the growth is accepted.

## Pass-5 findings verification

| Pass-5 finding | Status | Evidence |
| --- | --- | --- |
| **minor (m1)**: a defect raised in `beforeAll` is filtered through the *next test's* opt-outs | **Resolved** | `harnessGuards` now drains at setup with `accepted = []` (`fixtures.ts:602-610`), before `setAllowOrigin` and before the body. P1 reproduces pass 5's exact shape (hook defect + matching opt-out on the following test) and now exits 1 with `raised before this test started … so no opt-out on this test applies`. It holds under `mode: 'serial'` (P6) and across spec files (P4) — the cross-file shape pass 5 did not raise. P2 confirms legitimate per-test opt-outs still work. The suggested fix in pass 5 is exactly what was implemented, including the message wording |
| **minor (m2)**: the second net has no tamper detection, and its liveness check cannot see the event stopping mid-run | **Resolved (both halves)** | Half 1: `trackContext` is registered through `listen()` (`fixtures.ts:464`), so `browser.removeAllListeners('context')` is now reported as `Guard listener(s) were removed (context)` (P10). Half 2: the check is now per drain over `guardedSinceTake` (`fixtures.ts:314`, `:486-494`), reset at every `take()`. I blinded the removal check by stubbing `browser.listeners` and the liveness check still fired on the next test's setup drain (P15). `docs/testing.md:117-120` now describes exactly what the two checks detect, including "A drain with no newly guarded context checks nothing" |
| **nit (n1)**: the settle step does not run before the worker-scope leftover drain | **Resolved** | `settle(openPages(), scriptsEnabled)` at `fixtures.ts:542`, before the final `take()`. Pass 5 stated this from code reading and could not distinguish it; I probed the deferred half directly — a `console.error` on an 800 ms timer that `afterAll` never awaits, on a page it leaves open — and it fails the worker (P3). The `setScriptsEnabled` setter (`fixtures.ts:119`, `:323-324`, `:520-522`, set per test at `:592`) makes the teardown settle with the last test's `javaScriptEnabled`; I confirmed the `nojs` project still reports a worker-teardown defect and neither hangs nor goes green (P5) |
| **nit (n2)**: `blocked` is a `Set`, so repeated identical off-origin requests are reported as one | **Addressed, with a new defect** | `blocked` is now a `Map<string, number>` (`fixtures.ts:313`, `:326-331`) rendering `(×N)`, and the message says "distinct request(s)" (`:283`). The "say distinct" half is done correctly. The "count occurrences" half double-counts every request the context route aborts, because both the observer and the route handler call `noteBlocked` — see minor (m1) above |

## Other observations (no finding)

- **The failure modes are fail-closed.** I looked for a window where a drain never happens. There is none I could construct: if `use()` throws (a timed-out test), the teardown `take()` is skipped and the leftovers surface at the next test's setup drain or at worker teardown, both of which report with no opt-outs. If a `beforeAll` throws outright, its tests fail anyway. If every test in a file is statically skipped, Playwright never runs the hook.
- **Off-origin traffic is decided at collection time and is never retro-excused.** `allowOrigin` is `DENY_OTHER_ORIGINS` outside a test (`fixtures.ts:249`), set only after the setup drain (`:612`) and reset in the `finally` (`:629`). I confirmed the ordering by reading and by P5, where an `afterAll` navigation is blocked with no test in scope.
- **The `--reporter` escape hatch and the `KNOWN_UNGUARDED_SPECS` freeze both still work.** `smoke.spec.ts` passes unguarded in every project without tripping the reporter, and the globalTeardown fires when a command-line reporter replaces the configured ones.
- **`typecheck` is `astro check` only, without C5's `tsc -p tsconfig.scripts.json`.** `tsconfig.json` includes `**/*`, so `tests/**` and `scripts/**` are covered anyway (35 files, 0 errors), and the script is unchanged by this diff. Flagging it for the orchestrator, not as a finding against this package.
- `pnpm lint`/`pnpm test` trigger pnpm's `prepare` (`lefthook install`) in this worktree. Idempotent; `git status --short` stayed empty throughout.

## State at the end

- Every probe artefact deleted: `tests/e2e/zz-p{1,2,3,4a,4b,6,7,8,9,11,13,14,15,17,21,22}.spec.ts` (16 files), the `tests/e2e/zzprobe/` directory (holding the `nojs.spec.ts` probe), `dist/zz-audit.html`, and `test-results/` + `playwright-report/`. A recursive `Get-ChildItem -Filter "zz*"` over the worktree (excluding `node_modules`) returns **nothing**.
- `dist/` rebuilt with `pnpm build` (exit 0) and restored to exactly the five files it held before I started: `.nojekyll`, `index.html`, `sitemap-0.xml`, `sitemap-index.xml`, `_astro/page.BDh2vuYI.js`. `pnpm dist:audit` afterwards: `1 HTML file(s), 1 URL(s) checked … No problems.`
- `git status --short` → **empty in the worktree and in the main checkout**. `git rev-parse HEAD` in the worktree → `ecc35efb1c65b3d23c09630b8cdc5149c6e881be`, unchanged. I edited none of the author's tracked files; every probe was a new untracked file, now removed.
- Nothing listening on 5691, 5692, 4321 or 4322 (`Get-NetTCPConnection -State Listen` returns nothing for all four). No orphaned `astro preview` or `playwright test` process: the only Playwright-named `node.exe` processes on the machine are the pre-existing `@playwright/mcp` MCP servers, which I did not start. Every command in this review ran with `Set-Location` into the worktree first, except the two that are explicitly about the main checkout (`git status`, `git merge-base`) and the `action-validator` invocation, which read the worktree's `ci.yml` by path.
