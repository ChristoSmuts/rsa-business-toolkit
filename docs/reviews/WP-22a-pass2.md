# WP-22a review, pass 2 (Reviewer F: whole diff, fresh eyes)

- Worktree: `.claude/worktrees/agent-adc6b347a89c34014`, branch `worktree-agent-adc6b347a89c34014`, HEAD `bb370a1` (commits `9d1577b`, `bb370a1`), base `4b4fa67`. HEAD confirmed before starting.
- Date: 2026-09-15
- Machine: Windows 11, heavily loaded. Playwright on port 4931, Lighthouse on 4932, `--workers=2 --timeout=120000`.

## Verdict: NOT CLEAN

| Severity | Count |
| -------- | ----- |
| blocker  | 0     |
| major    | 1     |
| minor    | 7     |
| nit      | 9     |

The pass-1 fixes hold. The exceptions list, auto fixtures, launcher, Lighthouse URL list and audit additions all work, and 15 of my 28 negative scenarios fail with clear messages. The other 13 pass when they should fail. One of them is a major: the rule that forces specs to use the guarded fixtures can be bypassed in three ordinary ways, and the unit test and Playwright both accept all three.

## Commands (run by me in the worktree)

| Command | Exit | Tail |
| --- | --- | --- |
| `pnpm lint` | 0 | `All matched files use Prettier code style!` |
| `pnpm typecheck` | 0 | `Result (28 files): - 0 errors - 0 warnings - 0 hints` |
| `pnpm test` | 0 | `Test Files 3 passed (3)  Tests 55 passed (55)` |
| `pnpm build` | 0 | `dist:audit: 1 HTML file(s), 1 URL(s) checked under base /business-toolkit/. No problems.` |
| `PW_PORT=4931 playwright test --project chromium --project webkit --project nojs --workers=2 --timeout=120000` | 0 | `6 skipped  7 passed (3.9m)`. Skips: 404 x4 (no `404.html`), the two build-output checks on webkit (by design) |
| `PW_PORT=4931 playwright test --project mobile --workers=2 --timeout=120000` | 0 | `4 skipped  2 passed (2.4m)` |
| `PW_PORT=4931 pnpm test:a11y` | 0 | `ok 1 light theme › / (51.5s)`, `ok 2 dark theme › / (51.7s)`, `2 passed (2.4m)` |
| `LH_PORT=4932 pnpm lhci` | 1 (expected) | see below |
| `pnpm dlx @action-validator/cli .github/workflows/ci.yml` | 0 | no output (valid) |

`pnpm lhci` summary (readable, one row per failed assertion):

```
==> Lighthouse CI summary
  [desktop] ERROR categories.seo: expected >= 0.95, found 0.9  (http://127.0.0.1:4932/business-toolkit/)
  [mobile] ERROR categories.seo: expected >= 0.95, found 0.9  (http://127.0.0.1:4932/business-toolkit/)
Lighthouse CI failed for: desktop (exit 1), mobile (exit 1). Reports: .lighthouseci/<preset>/
```

`CHROME_PATH=...\ms-playwright\chromium-1243\chrome-win64\chrome.exe`, the pinned build.

Extra builds for the deploy path (PowerShell, `SITE_URL=https://owner.github.io`):
- `BASE_PATH=/` gives `dist:audit: ... checked under base /. No problems.` (exit 0). This is the user-site case, where `configure-pages` gives `base_path` `''` and `deploy.yml` turns it into `/`.
- `BASE_PATH=/business-toolkit/` exits 0.
- A final plain `pnpm build` restored `dist/`.

Note: in Git Bash, `BASE_PATH=/ pnpm build` is rewritten by MSYS path conversion to `/C:/Program Files/Git/` and the audit fails. This is an environment artefact, not a harness bug, but a Windows Git Bash user will hit it (`MSYS_NO_PATHCONV=1` avoids it).

State at the end: `git status --short` is empty. `dist/` holds only `.nojekyll`, `index.html`, `sitemap-0.xml`, `sitemap-index.xml` and `_astro/page.BDh2vuYI.js`. No node or chrome process refers to port 4931, 4932 or this worktree.

## Ownership

`git diff --name-only 4b4fa67...HEAD` lists 30 paths. All of them are in the owned or declared list:
- `tests/e2e/helpers/routes.ts` falls under `tests/e2e/helpers/**`.
- `pnpm-lock.yaml` follows from `@lhci/cli`.
- The unit fixtures belong to `tests/unit/audit-links.test.ts`.

No `src/**` changes. `global-setup.ts` from pass 1 is gone.

## Web server launcher (`tests/e2e/helpers/web-server.ts`)

- **Missing `dist`.** I renamed `dist` and ran chromium. Output: `[WebServer] [e2e] No build output: ...\dist does not exist. Run \`pnpm build\` first (BASE_PATH=/business-toolkit/), or \`pnpm test:e2e:dev\` to test against astro dev.` then `Error: Process from config.webServer was not able to start. Exit code: 1`. Exit 1 after 62 s, most of it Playwright start-up on this machine.
- **`PW_DEV=1`.** Output: `astro v7.3.2 ready in 3825 ms`, `watching for file changes...`, `[vite] connected`, `1 passed`. This is `astro dev`.
- **No orphans.** A process snapshot before the runs showed only another worktree's previews, on ports 4741 and 5031. After the chromium/webkit/nojs, mobile, a11y, `PW_DEV` and `lhci` runs, nothing new remained.
- **How Playwright stops the server.** On Windows it runs `taskkill /pid <pid> /T /F` (`playwright-core/lib/coreBundle.js:9402`). lhci uses `tree-kill` (`@lhci/utils/src/child-process-helper.js:12`).
- **Linux.** Playwright spawns `webServer` with `detached: process.platform !== "win32"` and stops it with `process.kill(-pid, "SIGKILL")` (`coreBundle.js:9319,9409`). That kills the whole process group, including the `astro` grandchild, whether or not signals are forwarded. The launcher only uses `node:path`, `fileURLToPath` and `process.execPath`, so nothing in it is Windows-specific. Its "invoked directly" check also held from a lower-case Windows cwd (`c:\_projects\...`): `dist:audit` ran and reported findings.

## Fails when it should

I created probe pages in the gitignored `dist/` with `make-probes.mjs` in scratch, and appended them to `sitemap-0.xml` (except `p-nositemap`). The page template has the full ADR 0005 CSP, `lang`, one `<h1>`, `<title>`, viewport and a long enough `<main>`, so each probe isolates one defect. I temporarily edited `tests/e2e/helpers/exceptions.ts` and added `tests/e2e/zz-*` files. Everything was reverted and `dist/` rebuilt. "Pass" in the Observed column means the defect went undetected.

| # | Scenario | Expected | Observed | Evidence |
| - | --- | --- | --- | --- |
| 1 | Critical axe violation in dark theme only (`<img>` without alt, shown only under `[data-theme=dark]`) | a11y dark fails, light passes | Correct | `1 serious/critical axe violation(s) on /p-dark-axe/ (dark): - image-alt [critical] Images must have alternative text`; light passes |
| 2 | Stale exception (`p-good/` exempt from `no-inline-script`) | fails | Correct | `Stale exception: /p-good/ now passes "no-inline-script". Remove "no-inline-script" for route "p-good/" from tests/e2e/helpers/exceptions.ts` |
| 3 | Exception for a route that is not built | fails | Correct (chromium) | `exception for route "p-does-not-exist/": no such page in dist/, remove the entry` |
| 4 | Page built but missing from the sitemap | fails | Correct | `Built but missing from the sitemap (...): - /p-nositemap/` |
| 5 | `noindex` page listed in the sitemap | fails | Correct | `Marked noindex but listed in the sitemap (...): - /p-noindex/` |
| 6 | Third-party stylesheet (`fonts.googleapis.com`) | fails | Correct (CSP) | `CSP violation: style-src-elem blocked https://fonts.googleapis.com/css2?...` |
| 7 | Third-party `@font-face` (`fonts.gstatic.com`) | fails | Correct (CSP) | `CSP violation: font-src blocked https://fonts.gstatic.com/s/x.woff2` |
| 8 | `<link rel="preconnect" href="https://fonts.gstatic.com">` | fails (third-party connection) | **Pass** in e2e, audit and Lighthouse | `/p-preconnect/` not in the failed list; `dist:audit` reports only `p-formaction` (m5) |
| 9 | `console.error` in `setTimeout(..., 1500)` from a same-origin module (`/p-late-error/`) | fails | **Pass** in chromium and webkit | not in the failed list of `neg-chromium.log`; webkit `1 passed` (m3) |
| 10 | `console.error` 300 ms after the test body ends | fails | **Pass** | `zz late console.error ...` passed (m3) |
| 11 | Unhandled promise rejection | fails | Correct in chromium and webkit | chromium `pageerror: unhandled rejection boom`; webkit `pageerror: Error: unhandled rejection boom` |
| 12 | `<base href="/business-toolkit/p-good/">` plus `<a href="#details">`: the fragment link now opens another page | fails | **Pass** in audit and e2e | audit `base href` probe: `findings: []`; `/p-base/` passed the contract (m6) |
| 13 | `formaction="/elsewhere/"` (outside the base) | fails | Correct in audit (the build gate); the e2e `findOffBaseUrls` does not read `formaction` | `dist/p-formaction/index.html:1 [base-path] <button formaction="/elsewhere/">` |
| 14 | `<form action="https://evil.example/collect">` | fails (ADR 0005 `form-action 'self'`) | **Pass** in audit and e2e | audit `formaction external` probe: `findings: []` (m6) |
| 15 | `<meta http-equiv="refresh" content="0; url=https://evil.example/">` | fails | Correct in e2e (chromium and webkit); audit passes it | `1 request(s) left the preview origin ...: - GET https://evil.example/ (document)` |
| 16 | Same meta refresh with a 4 s delay | fails | **Pass** | `/p-refresh-late/` passed (m3, m6) |
| 17 | `urls.json` lists `/core/`, which is not built | fails | Correct | `tests/lighthouse/urls.json lists page(s) that are not in ...\dist: /core/. Run \`pnpm build\` ...` (see n6 for the misleading summary row) |
| 18 | Inline `<script>` | fails | Correct | `/p-inline/ fails "no-inline-script"` plus the CSP console error |
| 19 | CSP `<meta>` in `<body>` only | fails | Correct, but only through Chromium's console message | `console.error: The Content Security Policy '...' was delivered via a <meta> element outside the document's <head>, which is disallowed.` |
| 20 | Loose CSP: `style-src *`, `img-src *`, `font-src *`, `connect-src *` | fails (ADR 0005) | **Pass** | `/p-csp-loose/` passed `csp-meta` (m4) |
| 21 | `dist/` missing | clear message, non-zero exit | Correct | see the launcher section |
| 22 | Spec with `import test, { expect } from '@playwright/test'` | `pnpm test` fails | **Pass**; Playwright runs the spec unguarded | vitest `Tests 9 passed (9)`; `--list`: `[chromium] › zz-default.spec.ts:3:1 › zz default import bypass` (M1) |
| 23 | `tests/e2e/zz-plain.test.ts` with `import { expect, test } from '@playwright/test'` | `pnpm test` fails | **Pass**; Playwright runs it | `--list`: `[chromium] › zz-plain.test.ts:3:1 › zz .test.ts file bypass` (M1) |
| 24 | Spec imports `test` from `./helpers/zz-pw`, which re-exports `@playwright/test` | `pnpm test` fails | **Pass** | `--list`: `[chromium] › zz-reexport.spec.ts:3:1 › zz re-export bypass` (M1) |
| 25 | `test.describe(..., { annotation: [{ type: ALLOW_CONSOLE_ERROR, description: '' }, { type: ALLOW_OTHER_ORIGIN, description: '' }] })` around a test that logs an error and loads an off-site image | should not silently disable a whole block | **Pass** | `zz describe-level opt-out ...` passed (m1) |
| 26 | `test.beforeEach(() => test.info().annotations.push({ type: 'allow-console-error' }))` | same | **Pass** | `zz beforeEach opt-out ...` passed (m1) |
| 27 | `page.route('**/*', r => r.continue())`, then an off-site image on a page without CSP | `sameOriginGuard` fails | **Pass**. The control without `page.route` fails correctly | control: `- GET http://192.0.2.1/probe.png (image)`; the `page.route` variant passed (m2) |
| 28 | Tokenizer set: `srcset` with a comma inside a URL, `data-href`, `<svg><use href>` good/bad/missing fragment, `<link rel=preload as=font>` off-base, upper-case `HREF`/`SRC`, `&#x2F;` and `&amp;` entities, entity-encoded `javascript:`, a 2 MB single line, 200 000 tags on one line | correct findings | Correct | `srcset=/bt/_astro/a,b.png` kept whole and the missing second candidate reported; `data-href` ignored; `base-path:href=/nope/sprite.svg#i`, `missing-fragment:xlink:href=#missing-sym`; `base-path:href=/_astro/font.woff2`; `base-path:href=/wrong/` from `HREF`; `javascript-url` for `java&#x73;cript:`; 2 MB line in 9 ms; 200 001 tags in 207 ms. Gaps in n4 |

Controls: a plain `console.error` fails, and an off-site image fails, both correctly.

Result: **15 of 28 scenarios fail when they should. 13 pass silently** (8, 9, 10, 12, 14, 16, 20, 22–27).

CSS `url()` in `style` attributes is not audited, and the docs do not say so (n4). A same-origin 404 from such a URL shows up as a Chromium `Failed to load resource` console error during e2e. A cross-origin `url()` is blocked by the CSP.

## Exceptions design

- **Shape.** `route`, `checks`, `reason`, `expires`. `validateExceptions()` rejects a leading slash, duplicates, empty or unknown checks, a check listed twice, and a short reason or expiry. Unit-tested.
- **Stale detection.** `enforceCheck` throws when an exempt page passes (scenario 2). Routes that are not built fail the chromium build-output test (scenario 3). An exempt page that regresses in a different way under the same check stays exempt, but the current problems are written into the annotation, which is acceptable.
- **Weak spots.**
  - Stale detection only runs for routes the run includes, so `E2E_ROUTE_LIMIT` or `-g` can skip it. CI runs all routes.
  - `expires` is free text, not a date.
  - Both are n9.
- **Future `/af/` routes.** Matching is exact, so `af/` needs its own entry. That is correct: nothing is exempted by prefix.
- **404 page.** It goes through `pageRoutes()` as `404.html`, so a `404.html` exception would use that route string. The not-found spec itself skips until the page exists.

## CI

- **`deploy.yml`.** `pnpm build` now runs `dist:audit`. `BASE_PATH` (`format('{0}/', base_path)`) and `SITE_URL` (`steps.pages.outputs.origin`) are the same values `astro build` uses. I reproduced both the project-site and user-site bases locally (exit 0, see above).
- **`lighthouse` job.** `actions/cache` keyed on `PLAYWRIGHT_VERSION` (defined in `ci.yml` `env`), then `playwright install --with-deps chromium`, then `pnpm lhci`. `.lighthouseci` is uploaded with `if: always()`. action-validator passes.
- **Annotations.** `::error title=Lighthouse desktop: categories.seo::expected >= 0.95, found 0.9 (url)` is valid workflow-command syntax. The runner splits properties at the first `::`. A single `:` in `title` is fine, and there is no `,` in the title, so no property escaping is needed. The job summary is a Markdown table appended to `GITHUB_STEP_SUMMARY`.
- **Red job.** The job is red today because SEO is 0.90. That is pass-1 M2, now covered by the orchestrator's `docs/reviews/merge-checklist.md` item "Give the placeholder home page a meta description through `Base.astro`". There is no remote yet, so nothing is blocked in practice.

## Findings

### major: the "use the shared fixtures" rule is bypassed by a default import, a `.test.ts` file or a re-export

File: tests/unit/e2e-harness.test.ts:56-75; playwright.config.ts:67-69
Acceptance item: fixtures "`pnpm test` fails when a spec imports `test` from `@playwright/test`" (docs/testing.md, Fixtures)

What is wrong: every automatic guard (console errors, CSP violations, third-party requests) relies on specs importing from `tests/e2e/fixtures.ts`. The enforcement misses three ordinary ways around it:
- **Default import.** `@playwright/test`'s default export is `test` (`default export is test: true`), and the regex only matches `{ ... }` and `* as` imports.
- **`.test.ts` files.** `specFiles()` only reads `*.spec.ts`. The chromium, webkit and mobile projects set no `testMatch`, so Playwright's default `*.@(spec|test).?(c|m)[jt]s?(x)` also collects `*.test.ts`. This repo uses `.test.ts` for all Vitest files, so the name is a natural mistake.
- **Re-export helper.** A spec importing from a local helper that re-exports `test` from `@playwright/test`.

Also missed: `require` and dynamic `import()`, `import { test } from 'playwright/test'`, and `import { expect, /* x */ test }` (the comment makes the name `/* x */ test`, which the regex does not match).

With any of these, a spec runs without guards and `pnpm test` stays green.

How to reproduce: add `tests/e2e/zz-default.spec.ts` (`import test, { expect } from '@playwright/test'`), `tests/e2e/zz-plain.test.ts` (named import) and `tests/e2e/zz-reexport.spec.ts` (importing from `tests/e2e/helpers/zz-pw.ts`, which contains `export { expect, test } from '@playwright/test'`). `pnpm exec vitest run --project unit tests/unit/e2e-harness.test.ts` gives `Tests 9 passed (9)`. `pnpm exec playwright test --list --project chromium -g zz` lists all three.

Suggested fix:
- Scan every `.ts`/`.js`/`.mts`/`.cts` file under `tests/e2e` except `fixtures.ts`, and allow only type-only imports from `@playwright/test` or `playwright/test` (for example via the TypeScript compiler API, or a stricter regex that also catches default, `require` and `import()`).
- Or set `testMatch: /\.spec\.ts$/` on every project, so the file scan and Playwright agree.
- Better still, move the rule into ESLint (`no-restricted-imports` with `importNames: ['default', 'test']` for `tests/e2e/**` except `fixtures.ts`) so it fails at edit time.

### minor: annotation opt-outs can silently disable a guard for a whole block or file

File: tests/e2e/fixtures.ts:50-61
Acceptance item: fixtures "per-test opt-out, as narrow as possible"

What is wrong:
- An empty description allows every message or origin.
- Playwright applies `test.describe(..., { annotation })` to every test in the block.
- `test.beforeEach` can push the annotation for every test.

So one line can switch off both guards for a whole file. Nothing detects it: not the unit test, not the reporter (CI never shows annotations).

How to reproduce: scenarios 25 and 26. Both tests logged `console.error` (25 also loaded an off-site image) and passed.

Suggested fix:
- Reject empty descriptions: throw in `allowedByAnnotation` when a description is empty.
- Add a unit test that scans `tests/e2e/**` for `ALLOW_CONSOLE_ERROR`, `ALLOW_OTHER_ORIGIN` and their string values outside a `test(..., { annotation })` call or `test.info().annotations.push` inside a test body.
- Or print every opt-out that was actually used into the test's error output.

### minor: `page.route` in a spec bypasses `sameOriginGuard`

File: tests/e2e/fixtures.ts:133-140
Acceptance item: sameOriginGuard "aborts and records every request to another origin"

What is wrong: page-level routes take precedence over context routes. A spec that mocks or observes requests with `page.route('**/*', r => r.continue())` stops the guard from seeing any request, and third-party requests go out unreported.

How to reproduce: scenario 27. The control (no `page.route`) fails with `GET http://192.0.2.1/probe.png (image)`, and the same test with `page.route(...continue)` passes.

Suggested fix: also record off-origin requests from `context.on('request')` (an observer, not a route) and fail on those. Or document that specs must use `route.fallback()`, and add that to the static scan.

### minor: console errors and navigations after the test body are not caught

File: tests/e2e/fixtures.ts:108-118; tests/e2e/csp-and-network.spec.ts:54
Acceptance item: build plan C4/C6 "zero console errors/CSP/third-party"

What is wrong:
- The teardown checks the collected errors as soon as the test body returns.
- The page contract waits for `networkidle` and then runs quick assertions.
- A `console.error`, rejection or redirect that happens after roughly 0.5 s is missed.

Deferred work is exactly where custom elements and lazy loading (search index, store reads) will fail.

How to reproduce: scenario 9 (`setTimeout(..., 1500)` in a module script, chromium and webkit), scenario 10 (300 ms after the body) and scenario 16 (4 s meta refresh) all pass.

Suggested fix: before the teardown check, wait a short settle period when a page is open: for example `await page.waitForTimeout(500)`, or a `requestIdleCallback` round trip through `page.evaluate`, capped. Document the limit.

### minor: `csp-meta` checks 5 of the 9 ADR 0005 directives

File: tests/e2e/helpers/page-checks.ts:10-16
Acceptance item: ADR 0005 policy; docs/testing.md "exactly as in ADR 0005"

What is wrong: `style-src`, `img-src`, `font-src` and `connect-src` are not compared. A page with `img-src *; font-src *; connect-src *; style-src *` passes. The network guard only catches requests the test actually triggers, and the deployed site would ship the weaker policy.

How to reproduce: scenario 20 (`/p-csp-loose/` passes).

Suggested fix: compare the full ADR 0005 policy (every directive, as a set per directive), and fail on extra directives that relax it.

### minor: third-party preconnect and DNS prefetch are not detected anywhere

File: scripts/dist/audit-links.ts:347-349; tests/e2e/fixtures.ts:133
Acceptance item: ADR 0005 "The site makes no third-party requests"

What is wrong: `<link rel="preconnect|dns-prefetch" href="https://...">` opens a connection to another origin without a request object. So `context.route` never sees it, Lighthouse's third-party count ignores it, and the audit accepts every external `https:` URL.

How to reproduce: scenario 8 (`/p-preconnect/` passes the contract; `dist:audit` reports nothing for it).

Suggested fix: in `dist:audit`, report any external URL on `<link>` whose `rel` includes `preconnect`, `dns-prefetch`, `preload`, `modulepreload`, `prefetch` or `stylesheet`. More generally, report any external URL that is not a navigational `<a>`/`<area>` href.

### minor: the link audit ignores `<base href>`, external form targets and external meta refresh

File: scripts/dist/audit-links.ts:326-357, 418-445
Acceptance item: dist:audit "base path, broken targets, broken fragments"; ADR 0005 `base-uri 'self'`, `form-action 'self'`

What is wrong:
- **`<base href>`.** Fragment and query URLs are resolved against the file's own path, so `<base href="/business-toolkit/p-good/">` sends every TOC `#anchor` to another page without a finding. CSP `base-uri 'self'` allows this same-origin base.
- **External forms.** `action` or `formaction` on another origin is accepted, although ADR 0005 blocks it at submit time, so the form would be dead.
- **External meta refresh.** A meta refresh to an external `https:` URL is accepted. e2e only catches the 0-second form.

How to reproduce: scenarios 12, 14 and 16. The scratch `tokenizer.ts` probes `base href`, `formaction external` and `meta refresh external` all return `findings: []`.

Suggested fix:
- Report any `<base>` element; the site never needs one.
- Report external `action`/`formaction` and external meta refresh as their own rules.

### minor: ADR 0005 referrer policy is not checked

File: tests/e2e/csp-and-network.spec.ts:51-68; tests/e2e/helpers/page-checks.ts
Acceptance item: ADR 0005 "Send `<meta name="referrer" content="strict-origin-when-cross-origin">`"; build plan C4

What is wrong: the page contract enforces the meta CSP but not the referrer meta, which ADR 0005 lists as the other header-replacement control. A layout that drops it passes.

How to reproduce: read the spec. No selector or check mentions `referrer`.

Suggested fix: add it to `csp-meta`, or a `referrer-meta` check with the same exception mechanism.

### nit: `design-system/` exclusion skips the noindex requirement

File: tests/e2e/helpers/routes.ts:46, 196-200
Acceptance item: routes "documented exclusions"

What is wrong: `DOCUMENTED_EXCLUSIONS` matches before the noindex test. If `design-system/` loses its `noindex` and is also dropped from the sitemap, the cross-check stays green.

Suggested fix: for `design-system/`, require `isNoindex` as well; keep the unconditional exclusion only for `404.html`.

### nit: an opt-out like `/core/x` throws instead of matching

File: tests/e2e/fixtures.ts:50-56
Acceptance item: general quality

What is wrong: any description of the form `/.../letters` is read as a regex with flags. The URL substring `/core/x` becomes `new RegExp('core', 'x')`, which throws `SyntaxError: Invalid flags supplied to RegExp constructor 'x'` during teardown.

Suggested fix: only accept known flags (`[dgimsuvy]*`), or use an explicit `re:` prefix.

### nit: `isNoindex` misses `content="none"`

File: tests/e2e/helpers/routes.ts:182-193
Acceptance item: routes "noindex pages are excluded automatically"

What is wrong: `none` means `noindex, nofollow`, but it is not detected.

Suggested fix: match `noindex|none` as tokens.

### nit: tokenizer and audit scope gaps

File: scripts/dist/audit-links.ts:134-153, 403-411; docs/testing.md "Link audit"
Acceptance item: dist:audit

What is wrong:
- **Attributes not read.** `<object data>`, `<link imagesrcset>`, `<a ping>` and `<blockquote cite>`. `object-src 'none'` covers `data`; `ping` can leak to a tracker on click.
- **`java<TAB>script:`.** Browsers strip the tab, so this is a `javascript:` URL, but it is reported as `base-path`. It still fails, under the wrong rule.
- **`&sol;`.** Only six named entities are decoded, so `&sol;wrong/` is read as a path-relative URL. It still fails, but with a misleading value.
- **`style="...url(...)"`.** Not audited, and the docs do not say it is out of scope.

Suggested fix: add `imagesrcset` and `ping`, strip ASCII tab and newline before scheme detection, and state the `style` `url()` decision in docs/testing.md.

### nit: `KNOWN_DIRECT_PLAYWRIGHT_IMPORTS` can grow

File: tests/unit/e2e-harness.test.ts:54
Acceptance item: "the list can only shrink"

What is wrong: removals are enforced, additions are not. Adding a name silences the check.

Suggested fix: assert the list equals a frozen snapshot, or at least that its length is at most 1 (the current value).

### nit: `pnpm lhci` summary misreports a config error

File: scripts/ci/run-lhci.mjs:121-127, 136-141
Acceptance item: lighthouse "readable summary and annotations"

What is wrong: when `lighthouserc.cjs` throws (for example a `urls.json` page that is not built), the summary says `no assertion results: collect or the preview server failed`, and no `::error` annotation is emitted. The job fails correctly, but in GitHub only the raw log explains why.

How to reproduce: scenario 17.

Suggested fix: emit `::error title=Lighthouse <preset>::no assertion results (see log)` for `missingResults`, and word the row as "lhci failed before assertions".

### nit: a11y tags omit `best-practice` from build plan C6

File: tests/e2e/a11y.spec.ts:14
Acceptance item: build plan C6 (package brief narrowed it, per pass 1)

What is wrong: C6 lists `best-practice`. Serious best-practice rules such as `aria-dialog-name`, `tabindex` and `label-title-only` will matter for the search dialog and wizard. Pass 1 says the brief intentionally left the tag out.

Suggested fix: record the divergence in `docs/reviews/backlog.md`, and add the tag in the package that adds the search dialog.

### nit: base normalisation in `playwright.config.ts` still differs (pass-1 nit carried)

File: playwright.config.ts:3-4
Acceptance item: general quality

What is wrong: `BASE_PATH=''` gives `//`, and `' /bt/ '` gives `/ /bt/ /`. The helpers use a trimmed `normaliseBase`.

How to reproduce: `node -e` with the config expression prints `"" -> "//"`.

Suggested fix: import `normaliseBase` from `scripts/dist/audit-links.ts`.

### nit: stale exception detection depends on the run including the route; `expires` is not a date

File: tests/e2e/helpers/page-checks.ts:91-108; tests/e2e/helpers/exceptions.ts:30-35
Acceptance item: exceptions "cannot go stale"

What is wrong: with `E2E_ROUTE_LIMIT` or `-g`, an exempt route may not run, so a stale entry survives a local run. CI runs every route, so this is low risk. `expires` names a change but not a date, so an entry whose change never lands is never flagged.

Suggested fix: run a cheap static stale check (fetch the exempt routes regardless of sampling), and optionally add an `until` date that warns when passed.

## Pass-1 findings verification

Pass 1's numbering is inconsistent: its text calls the audit finding "m5" and chrome-path "m6". I map M1, M2, m1–m7 and n1–n6 in document order.

| Pass-1 finding | Status | Evidence |
| --- | --- | --- |
| M1: CSP and no-JS checks skipped without `#main` | **Resolved** | The `#main` heuristic is gone. Every built page runs `csp-meta`, `no-inline-script` and `nojs-min-text` unless `exceptions.ts` lists it. Scenarios 2, 3, 18 and 19; the home page is the only exception. |
| M2: `lighthouse` job red, blocks `deploy.yml` | **Accepted by orchestrator** | Still exits 1 (SEO 0.90), as the brief expects. `docs/reviews/merge-checklist.md` commits to a meta description via `Base.astro` after WP-11 and WP-22a merge. No remote exists yet. Not re-raised. |
| m1: `global-setup.ts` hint never shown | **Resolved** | Replaced by the `webServer` launcher; message verified with `dist` missing (scenario 21). |
| m2: guards opt-in | **Resolved** | Both fixtures are `{ auto: true }`. Controls fail in a spec that never names them. The new gaps are M1 and minor m1. |
| m3: hard-coded long timeouts | **Resolved** | The `describe.configure` is gone; `PW_A11Y_TIMEOUT` sets 60 s in CI and 90 s locally, validated in the config, and `--timeout` wins. |
| m4: link audit false negatives | **Resolved** | `%2F`/`%5C` never resolve, `<!-->`/`<!--->` are comments, and `javascript-url`, `formaction`, meta refresh and og/twitter URLs are audited. Unit tests "adversarial markup (review WP-22a pass 1)" plus my scenarios 13 and 28. New gaps: minor m6 and nit n4. |
| m5: `chrome-path.mjs` picks newest Chromium | **Resolved** | `chromium.executablePath()` first, fallback with a warning; `lhci` printed `chromium-1243`. |
| m6: Lighthouse URL list not committed | **Resolved** | `tests/lighthouse/urls.json`, validated by a unit test and by `assertBuilt` (scenario 17). |
| m7: WebSockets not blocked | **Resolved (by reading)** | `context.routeWebSocket` closes other-origin sockets with 1008 and records them. Not executed, to avoid an outbound connection. |
| n1: internal Astro marker | **Resolved** | Documented in code and docs. `e2e-harness.test.ts` fails if `ASTRO_PREVIEW_BACKGROUND` or `ASTRO_DEV_BACKGROUND` disappears from Astro's CLI. `lighthouserc.cjs` no longer sets it. |
| n2: blocked list asserted twice | **Resolved** | The spec has no explicit `sameOriginGuard.blocked` assertion. |
| n3: route discovery gaps | **Resolved** | noindex-in-sitemap now fails (scenario 5). A base mismatch throws `None of the N sitemap route(s) exists ...` (`routes.ts:152-157`). |
| n4: config base normalisation | **Not resolved** | Carried as a nit above (`"" -> "//"`). |
| n5: a11y motion and theme settle | **Resolved** | `reducedMotion: 'reduce'` on the a11y project; `data-theme` asserted again after `document.fonts.ready`. Scenario 1 shows dark-theme analysis works. |
| n6: `.prettierignore` `dist/` skips `scripts/dist/` | **Resolved on main** | Main now has `/dist/`. With main's ignore file, `prettier --check scripts/dist/audit-links.ts tests/unit/*.test.ts tests/e2e` gives `All matched files use Prettier code style!` |

No regressions found from the pass-1 fixes.

## Scratch artefacts

In the session scratchpad `wp22a-pass2/`: `make-probes.mjs`, `edit-exceptions.mjs`, `zz-review-probe.spec.ts`, `tokenizer.ts`, `imports.mjs`, `draft-findings.md` (written before reading pass 1), and the logs `neg-chromium.log`, `neg-a11y.log`, `neg-webkit.log`, `neg-guard.log`, `neg-imports-vitest.log`, `neg-imports-list.log`, `neg-nodist.log`, `pwdev.log`, `neg-lhci.log`, `lhci.log`, `e2e1.log`, `e2e-mobile.log`, `a11y.log`, `lint.log`, `typecheck.log`, `test.log`, `build.log`.
