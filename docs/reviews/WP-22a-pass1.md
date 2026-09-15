# WP-22a review, pass 1 (Reviewer A: correctness, test reliability, CI, security)

- Worktree: `.claude/worktrees/agent-adc6b347a89c34014`, branch `worktree-agent-adc6b347a89c34014`, commit `9d1577b`, base `4b4fa67`
- Date: 2026-09-15

## Verdict: NOT CLEAN

| Severity | Count |
| -------- | ----- |
| blocker  | 0     |
| major    | 2     |
| minor    | 7     |
| nit      | 6     |

The harness does what it should. All 17 negative scenarios I built failed with readable messages, in both chromium and webkit where that applies. The route discovery and the link audit held up against adversarial fixtures. Two majors block a clean pass:

1. The CSP meta check and the no-JS text minimum only run on pages that have `#main`, so a page that skips the shared layout passes silently.
2. Merging turns the CI `lighthouse` job red on every push. Because `deploy.yml` reuses `ci.yml` as its `verify` step, Pages deploys are blocked until a meta description lands.

## Commands run (worktree, Windows, shared machine)

| Command | Result | Tail |
| --- | --- | --- |
| `pnpm lint` | exit 0, 86 s | `All matched files use Prettier code style!` |
| `pnpm typecheck` | exit 0, 63 s | `Result (25 files): 0 errors, 0 warnings, 0 hints` |
| `pnpm test` | exit 0, 65 s | `Test Files 2 passed (2)  Tests 40 passed (40)` |
| `pnpm build` | exit 0, 94 s | `dist:audit: 1 HTML file(s), 1 URL(s) checked under base /business-toolkit/. No problems.` |
| `PW_PORT=4631 playwright test --project chromium --project webkit --project nojs` | **exit 1** (default 30 s timeout) | `9 failed ... Test timeout of 30000ms exceeded while setting up "page"` (load: CPU about 19 % but many node processes from other agents) |
| same, with `--workers=2 --timeout=120000` | exit 0, 293 s → 6.6 min | `5 skipped, 6 passed (6.6m)`. Skips: 404 ×4 (no `404.html`), the cross-check on webkit (by design) |
| `PW_PORT=4631 playwright test --project mobile --timeout=120000` | exit 0 | `3 skipped, 2 passed (2.4m)` |
| `PW_PORT=4631 pnpm test:a11y` | exit 0 | `ok light theme › / (41.4s)`, `ok dark theme › / (40.4s)`, `2 passed (2.1m)` |
| `LH_PORT=4632 pnpm lhci` | **exit 1** | `categories.seo failure for minScore assertion expected: >=0.95 found: 0.9`, then `Lighthouse CI failed for: desktop (exit 1), mobile (exit 1)` |
| `pnpm dlx @action-validator/cli .github/workflows/ci.yml` | exit 0 | no output (valid) |

Lighthouse, median run, identical for desktop and mobile: performance 1.00, accessibility 1.00, best practices 0.96, SEO 0.90 (the failing audit is `meta-description`). CLS 0, script 1488 B, stylesheet 0, font 0, total 2056 B, third-party 0. Only the SEO assertion fails.

After the experiments, `git -C <worktree> status --short` is empty. `dist/` was rebuilt with `pnpm build` (exit 0) and contains only the original five files. Ports 4631 and 4632 have no listener.

## Ownership

`git diff --name-only 4b4fa67...HEAD` lists 26 paths. All of them are in the brief except `tests/e2e/global-setup.ts`, which the author declared. `pnpm-lock.yaml` follows from the `@lhci/cli` addition, and the unit test fixtures belong to the audit-links unit tests. No `src/**` changes. I accept `global-setup.ts` as a declared extra, but it rarely does anything; see minor m1.

## Fails when it should

Negative pages were written into the gitignored `dist/` (`make-neg.ps1` in scratch) and added to a copy of `sitemap-0.xml`. `neg-unlisted` was left out of the sitemap on purpose. The dist:audit cases ran against scratch fixtures through the real CLI (`DIST_DIR=<scratch> pnpm dist:audit`).

| # | Scenario | Expected | Observed | Evidence |
| - | --- | --- | --- | --- |
| 1 | `<img>` without alt and a `<button>` with no name (`/neg-axe/`) | a11y fails, readable | Fails in light and dark | `2 serious/critical axe violation(s) on /neg-axe/ (dark): - button-name [critical] Buttons must have discernible text <url> button - image-alt [critical] ... img` |
| 2 | `console.error` in a same-origin module script | `consoleErrors` fails | Fails in chromium and webkit | `1 unexpected console error(s)...: - console.error: NEG-CONSOLE marker (http://127.0.0.1:4631/business-toolkit/_astro/neg-console.js:0)` |
| 3 | Uncaught exception | fails | Fails in chromium and webkit | `- pageerror: NEG-THROW marker` |
| 4 | Inline `<script>` under the ADR 0005 meta CSP, page has `#main` | CSP violation detected | Fails in chromium and webkit on two paths: the static inline-script assertion, and the `securitypolicyviolation` event plus the console message | chromium: `CSP violation: script-src-elem blocked inline (…/neg-csp-inline/:1)` and `console.error: Executing inline script violates … 'script-src 'self''`; webkit: `Refused to execute a script because its hash, its nonce, or 'unsafe-inline' does not appear…` plus the same `CSP violation` line |
| 5 | Inline event handler (`<body onload>`) under the meta CSP. The static inline-script check cannot see this. | CSP violation detected | Fails in chromium and webkit through the event binding alone | `CSP violation: script-src-attr blocked inline (…/neg-csp-handler/:1)` (both engines) |
| 6 | Third-party `<img>`, `fetch()` and `XMLHttpRequest` | `sameOriginGuard` fails | Fails in chromium and webkit; all three request types aborted and listed | `3 request(s) left the preview origin http://127.0.0.1:4631 ...: - GET https://example.net/neg-img.png (image) - GET https://example.com/neg-fetch (fetch) - GET https://example.org/neg-xhr (xhr)` |
| 7 | Two `<h1>` | `csp-and-network` fails | Fails in chromium and webkit | `Error: exactly one <h1> ... Expected: 1 Received: 2` |
| 8 | Root-relative `href="/core/"` | `dist:audit` fails | exit 1 | `index.html:6  [base-path] <a href="/core/">  internal URL must start with /business-toolkit/` |
| 9 | Broken fragment `/business-toolkit/#missing-id` (control `#present` passes) | fails | exit 1 | `index.html:7  [missing-fragment] ... no element with id "missing-id" in index.html` |
| 10 | `target="_blank"` with `rel="noreferrer"` only | fails | exit 1 | `index.html:8  [noopener] <a rel="noreferrer">  target="_blank" needs rel="noopener"` |
| 11 | `http://www.cipc.co.za/` | fails | exit 1 | `index.html:9  [insecure-http] ... external link uses http:, use https:` then `4 problem(s) (base-path: 1, missing-fragment: 1, noopener: 1, insecure-http: 1)` |
| 12 | JS disabled, a visible `.js-only` button | nojs fails | Fails | `Error: .js-only element 1 of 1 ... Expected: hidden Received: visible` |
| 13 | `neg-unlisted/index.html` built but not in the sitemap | cross-check fails | Fails (chromium; skipped in other projects by design) | `Built but missing from the sitemap (...): - /neg-unlisted/` |
| 14 | `dist/` missing, `playwright test --list` | loud failure | exit 1 | `MissingBuildError: No build output at …\dist. Run \`pnpm build\` ...` / `Total: 0 tests in 0 files` |
| 15 | `dist/` missing, full run | loud failure | exit 1, but the message comes from Astro, not from `global-setup.ts` (see m1) | `[WebServer] [preview] The output directory …\dist\ does not exist. Did you run \`astro build\`?` / `Error: Process from config.webServer was not able to start.` |
| 16 | Adversarial audit fixture (37 cases, `audit-adv.ts`) | tokenizer correct | Correct on 32; 5 false negatives, see m5 | `21 problem(s) (base-path: 9, missing-fragment: 3, insecure-http: 2, noopener: 3, missing-target: 4)` |
| 17 | Adversarial route discovery (`routes-adv.ts`) | correct mapping and errors | Correct; two gaps, see n3 | see "Route discovery" below |

Result: 17 of 17 scenarios fail when they should. No scenario passed silently. Scenario 15 fails for a different reason than the author intended (m1), and scenario 16 has five edge-case false negatives (m5).

The contract run with the negative pages ended `13 failed, 1 skipped, 4 passed (8.8m)`: 6 negative pages × 2 engines, plus the cross-check. The 4 passes are `/neg-axe/` and `/neg-jsonly/` in both engines, which is correct because the contract does not run axe or the `.js-only` check.

## Route discovery (scratch `routes-adv.ts`, run against the real helper)

- `sitemap-index.xml` plus `sitemap-0.xml` and `sitemap-1.xml`: both urlsets are read and the index is ignored. Result `["","af/core/","core/","q/","sp ace/"]`.
- Sitemap on a different origin (`https://prod.example.org/bt/…`): only the pathname is used, so routes map to the preview origin. Query strings are dropped and `&amp;` is decoded.
- Percent-encoding: `sp%20ace/` in the sitemap and the `sp ace/index.html` file agree. `routeUrl` re-encodes to `sp%20ace/`.
- Base `/`: routes `["","core/"]`, and the cross-check passes. A nested `dist/bt/` layout resolves correctly. A `/` build tested as `/bt/` throws `Sitemap URL https://x.org/ is outside the base path /bt/`.
- Trailing-slash mismatch (`/bt/core` in the sitemap, `core/index.html` on disk) is reported on both sides.
- Noindex: `content="NOINDEX" name="ROBOTS"` and unquoted `name=robots` are detected. `googlebot` noindex combined with robots `index` is correctly not excluded. `design-system/` and `af/design-system/` are included in `pageRoutes`, and `404.html` is excluded.
- `/af/` routes are handled like any other path.
- Windows paths: `listFiles` converts to posix, and unit tests cover `documentUrlPath('core\\register\\index.html')`.
- `E2E_ROUTE_LIMIT`: limit 3 gives `["","design-system/","sp ace/"]`, which is deterministic.
- Gaps: see n3.

## Reliability notes

- **`ASTRO_PREVIEW_BACKGROUND=1`** is not a documented Astro setting. It is the marker Astro sets on its own detached child.
  - `node_modules/astro/dist/cli/server.js:32,140` passes `{ [config.envVar]: "1" }` to the child it spawns.
  - `cli/preview/index.js:45`: `agentDetected = !process.env.ASTRO_PREVIEW_BACKGROUND && isRunByAgent()`, which uses `am-i-vibing`.
  - If an agent is detected, `wantsBackground` is true (`:50`). Combined with `--ignore-lock`, Astro throws (`:76-85`). Without it, Astro detaches and exits (`:87-89`).
  - With the variable set, detection is skipped and the server runs in the foreground. The variable's only other effect is `background: true` in the lock file (`:137`). That write is skipped when `--ignore-lock` is passed (`:101-113`).
  - The workaround is correct today and harmless in CI, but it depends on an internal variable (n1).
- **`--ignore-lock`** is documented (`--help` text at `:29-30`). It skips the lock check and the lock write, so parallel worktrees can each run a preview. It is safe because Playwright owns the process and now refuses to reuse a port (see the next point).
- **`reuseExistingServer` opt-in**: CI was already `false`, and `local-gate.ps1`/`.sh` start their own server. Nothing breaks. If a local `pnpm preview` is already running on the port, the run now fails loudly instead of testing the wrong build, which is the better default.
- **`globalSetup` and `PW_DEV`**: returns early under `PW_DEV=1`, and route-driven specs skip with a reason. It does work, but see m1.
- **Load order**: in the Playwright 1.63 runner (`lib/runner/index.js:6946-6953`), `--list` only loads test files, which throws `MissingBuildError` at module scope (scenario 14). A normal run executes plugin setup (webServer, `:6324`) before `globalSetup` (`:6326`), and loads test files after both. Lint and typecheck never execute the specs, and every CI job that runs Playwright downloads `dist` first, so there is no CI hazard.
- **Waits**: no fixed sleeps. The contract waits for `networkidle`. a11y waits for `load`, `data-theme` and `document.fonts.ready`, but does not wait for animations or reduced motion (n5). The timeouts are discussed in m3.

## CI review

- `lighthouse` job: `playwright install --with-deps chromium`, then `chrome-path.mjs`. That resolves `$XDG_CACHE_HOME/ms-playwright` or `~/.cache/ms-playwright`, then `chromium-<rev>/chrome-linux64/chrome` or `chrome-linux/chrome`, and excludes `chromium_headless_shell-*`. `--no-sandbox` is added on Linux. This should work on ubuntu-latest. Locally it picked `chromium-1243\chrome-win64\chrome.exe`, but see m6.
- The job will fail on every push today (M2).
- `pnpm build` now includes `dist:audit` in `ci.yml` `build`, `deploy.yml` `build` and `visual-update.yml`. All three set `BASE_PATH` and `SITE_URL` consistently with `astro build`, so the audit's site origin matches the canonical URLs.
- The e2e and a11y jobs are unaffected by the reuse change.
- action-validator: valid.

## Security

- No secrets, and no new network access at test time: requests to other origins are aborted before DNS by `context.route`.
- `@lhci/cli@0.15.1` adds `lighthouse@12.6.1`, `puppeteer-core@24.43.1` and `chrome-launcher`. None of them is added to `allowBuilds` in `pnpm-workspace.yaml`, so no install scripts run. `puppeteer-core` downloads no browser.
- The link audit's `http:` and `noopener` rules match ADR 0005.
- WebSockets to other origins are recorded but not aborted (n2).

## Findings

### major: CSP meta and no-JS text checks are skipped for any page without `#main`

File: tests/e2e/csp-and-network.spec.ts:56 (also tests/e2e/nojs.spec.ts:28)
Acceptance item: csp-and-network "CSP meta when the shared layout is used"; ADR 0005 "meta CSP on every page"; build plan C4

What is wrong: whether the ADR 0005 CSP assertions run depends on a heuristic, `page.locator('#main').count() > 0`. The same applies to the 20-character `<main>` minimum. A page that does not render the shared layout, such as a future `404.astro`, a print layout, or a page that renames the skip-link target, gets only a `csp-skipped` or `nojs-placeholder` annotation and passes. CI never surfaces annotations. The pages most likely to lack the meta CSP are exactly the ones that bypass the layout, so this is the case where the harness passes when it should fail.

How to reproduce: add `dist/x/index.html` with lang, title, viewport, one `<h1>` and no `<meta http-equiv="Content-Security-Policy">`, and add it to `sitemap-0.xml`. Run `PW_PORT=4631 pnpm exec playwright test --project chromium -g "/x/"`. It passes with a `csp-skipped` annotation. The same mechanism is visible in scenario 6: `/neg-thirdparty/` has no CSP and was only caught by the network guard.

Suggested fix: invert the default. Require the CSP and the text minimum on every route except an explicit, documented list, currently `['']` for the placeholder home page. Fail when a listed route already has a CSP, so the list cannot go stale. The WP-11/WP-21 pages will then turn the check on automatically.

### major: CI `lighthouse` job fails on every push, which blocks `deploy.yml`

File: tests/lighthouse/lighthouserc.cjs:71; .github/workflows/ci.yml:191-192; .github/workflows/deploy.yml:16-18
Acceptance item: ci.yml "lighthouse job"; general quality (main must stay green)

What is wrong: before this package the `lighthouse` job was a passing no-op. It now runs `pnpm lhci`, which exits 1 on the current placeholder page: `categories.seo` is 0.90 against a 0.95 minimum, and the failing audit is `meta-description`, in both presets. `deploy.yml` calls `ci.yml` as `verify`, and `build`/`deploy` need it, so after merge every push to `main` is red and no Pages deploy can run until another package adds a meta description. The author declared the failure, but did not declare its effect on CI and deploy.

How to reproduce: `LH_PORT=4632 pnpm lhci` exits 1 with `categories.seo failure for minScore assertion expected: >=0.95 found: 0.9`.

Suggested fix: pick one, with a `docs/reviews/backlog.md` entry naming the package that restores it. (a) Keep the job but set `'categories:seo'` to `['warn', …]` until the layout with a meta description lands. (b) Mark the job `continue-on-error: true` with a TODO. (c) Have the orchestrator land a one-line meta description in `src/pages/index.astro` before merging.

### minor: `global-setup.ts` never shows its hint in the default configuration

File: tests/e2e/global-setup.ts:11-24; playwright.config.ts:24
Acceptance item: declared extra file; docs/testing.md "the run stops with a message that tells you to run `pnpm build`"

What is wrong: Playwright runs webServer plugin setup before `globalSetup` (`playwright/lib/runner/index.js:6324-6326`). With `dist/` missing, `astro preview` fails first, and the user sees Astro's message. The `pnpm build`/`BASE_PATH` hint only appears under `PW_REUSE_SERVER=1`. Astro's message is still clear, so this is low impact, but the file mostly does nothing.

How to reproduce: rename `dist`, then run `PW_PORT=4631 pnpm exec playwright test --project chromium`. The output is `[WebServer] [preview] The output directory …\dist\ does not exist` / `Process from config.webServer was not able to start`.

Suggested fix: run the dist check at the top of `playwright.config.ts` (skipped under `PW_DEV` and `--list`), or drop `global-setup.ts` and fix the wording in docs/testing.md.

### minor: `consoleErrors` and `sameOriginGuard` are opt-in, so most specs are unguarded

File: tests/e2e/fixtures.ts:70,160
Acceptance item: fixtures "console.error, pageerror and CSP violations auto-fail"; plan C4

What is wrong: neither fixture is `{ auto: true }`. Only `csp-and-network.spec.ts` requests them. The a11y, nojs and not-found specs, and every future feature spec (search dialog, wizard, templates), get no console, CSP or third-party guard unless the author remembers to destructure `consoleErrors: _consoleErrors`. The docs state this, but it goes against "auto-fail" and is easy to forget.

How to reproduce: `/neg-console/` produced no failure in the a11y project. Only the contract caught it.

Suggested fix: declare both as `[fn, { auto: true }]`. Keep the `allow-console-error` annotation, and add an opt-out annotation for the rare spec that must reach another origin.

### minor: hard-coded long timeouts hide real slowness

File: tests/e2e/a11y.spec.ts:53
Acceptance item: general quality (test reliability)

What is wrong: `test.describe.configure({ timeout: 90_000 })` applies in CI too. docs/testing.md tells users to pass `--timeout=120000` for mobile. On a fast CI runner, a page that suddenly takes 60 s would pass. The need for the extra time is environmental: on this machine even chromium at the 30 s default failed with `setting up "page"`.

How to reproduce: run the desktop projects at the default timeout on a loaded machine: 9 of 9 non-skipped tests time out. At 120 s all pass.

Suggested fix: read a `PW_TIMEOUT` (or `PW_SLOW=1` multiplier) in `playwright.config.ts` and keep the CI default at 30 s. Remove the per-describe 90 s, or apply it only when the multiplier is set.

### minor: link audit false negatives on edge cases

File: scripts/dist/audit-links.ts:183-186, 318-327, 358, 387
Acceptance item: dist:audit "base prefix, missing targets, fragments"

What is wrong: the adversarial fixture (`audit-adv.ts`) passed these unchecked:
- `/bt/core%2Findex.html` resolves because `decodeURIComponent` turns `%2F` into a separator. A static host would 404.
- An HTML empty comment `<!-->` makes the scanner skip to the next `-->`, hiding the markup in between.
- `javascript:` URLs are skipped silently.
- `formaction`, `<meta http-equiv="refresh" content="…url=">` and `og:image`/`og:url` `content` are not audited.

Everything else was handled correctly: quoted `>`, unquoted values, `srcset` descriptors, `<script>`/`<style>`/`<textarea>` contents, comments, `&amp;`, upper-case tags, schemes and site origin, protocol-relative and backslash URLs, `mailto:`/`tel:`/`data:`, `#top`, percent-encoded fragments, query strings, `<noscript>`, `<use href>` and `<area target=_blank>`.

How to reproduce: `pnpm exec tsx <scratch>/audit-adv.ts`. Lines 15, 17, 18, 19 and 26 produce no finding.

Suggested fix: decode with a helper that keeps `%2F`. Treat `<!-->` and `<!--->` as complete comments. Report `javascript:` as its own rule. Add `formaction`, meta-refresh URLs and `og:*` URL content to `URL_ATTRIBUTES`.

### minor: `chrome-path.mjs` picks the newest Chromium on disk, not the one Playwright pins

File: scripts/ci/chrome-path.mjs:84-97
Acceptance item: lighthouse "CHROME_PATH comes from the Playwright chromium"

What is wrong: this machine has `chromium-1228`, `-1234` and `-1243` from several Playwright versions. The script takes the highest revision whether or not `@playwright/test@1.63.0` uses it. Local Lighthouse numbers can therefore come from a different browser than the e2e suites. A shared, restored cache in CI can cause the same drift.

How to reproduce: `node scripts/ci/chrome-path.mjs` prints `…\chromium-1243\…` and ignores `playwright-core/browsers.json`.

Suggested fix: read the `chromium` revision from `playwright-core/browsers.json` and fall back to the newest only when that folder is missing. Alternatively, use `require('playwright-core').chromium.executablePath()`.

### minor: Lighthouse URL list is not committed, so CI only ever audits the home page

File: tests/lighthouse/lighthouserc.cjs:36-42; .github/workflows/ci.yml:191-192
Acceptance item: lighthouse "URLs extensible as pages arrive"; plan C4/C6 ("6 URLs both locales", "total ≤ 600 KB on the heaviest doc")

What is wrong: the URLs come only from `LH_URLS`, which CI does not set. Adding the heaviest doc and `/af/` pages later means editing the workflow rather than the config, and the "heaviest doc" budget cannot be checked.

How to reproduce: read the files. `pnpm lhci` logs `Running Lighthouse 3 time(s) on http://127.0.0.1:4632/business-toolkit/`, one URL.

Suggested fix: add a committed `DEFAULT_PATHS` array in `lighthouserc.cjs`, filtered to paths that exist in `dist/`, and keep `LH_URLS` as an override.

### minor: `sameOriginGuard` records but does not block WebSockets and worker requests

File: tests/e2e/fixtures.ts:169-177
Acceptance item: sameOriginGuard

What is wrong: `context.route` does not intercept WebSocket connections, so a `wss://` to another origin actually connects and is only recorded, through a page-level listener that also misses workers. The test still fails, so this is a containment gap rather than a false pass.

How to reproduce: reasoning from the Playwright API. `context.routeWebSocket` exists for this purpose, but I did not run it to avoid an outbound connection.

Suggested fix: add `context.routeWebSocket(url => !isAllowedUrl(…), ws => ws.close())` and listen on `context.on('weberror')` or the service worker events as needed.

### nit: dependence on Astro's internal `ASTRO_PREVIEW_BACKGROUND` marker

File: playwright.config.ts:34; tests/lighthouse/lighthouserc.cjs:47; scripts/ci/run-lhci.mjs:40
Acceptance item: declared deviation

What is wrong: the variable is not a documented setting (see "Reliability notes"). A future Astro release could rename it, and preview would then detach again with `--ignore-lock` throwing. `lighthouserc.cjs` also sets it as a side effect at module load, which duplicates `run-lhci.mjs`.

Suggested fix: add a comment with the Astro version and `cli/preview/index.js:45`, and remove the duplicate assignment in `lighthouserc.cjs`.

### nit: SameOriginGuard `blocked` is asserted twice

File: tests/e2e/csp-and-network.spec.ts:106
Acceptance item: general quality

What is wrong: the explicit `expect(sameOriginGuard.blocked)` and the fixture teardown both report the same list (visible in scenario 6), which doubles the noise.

Suggested fix: keep one.

### nit: route discovery gaps

File: tests/e2e/helpers/routes.ts:181-185, 106-114
Acceptance item: routes "documented exclusions"

What is wrong: two gaps:
- A `noindex` page that is also listed in the sitemap is not reported. Test `noindex page listed in sitemap agree` returns `{"onlyInSitemap":[],"onlyInHtml":[],"excluded":[]}`.
- A `/bt/` build tested with `BASE_PATH=/` does not throw. It yields routes like `bt/core/` and only fails later on HTTP status.

Suggested fix: report noindex pages found in the sitemap, and reject sitemap paths whose first segment matches a directory missing from `dist`.

### nit: playwright.config base normalisation differs from `normaliseBase`

File: playwright.config.ts:3-4 (pre-existing)
Acceptance item: general quality

What is wrong: `BASE_PATH=''` gives `//`, and whitespace is not trimmed. `routes.ts`, `audit-links.ts` and `lighthouserc.cjs` use the trimmed `normaliseBase`, so the helpers and `baseURL` can disagree.

Suggested fix: import `normaliseBase` from `scripts/dist/audit-links.ts` in the config.

### nit: a11y does not settle motion or the theme script

File: tests/e2e/a11y.spec.ts:63-70; tests/e2e/fixtures.ts:133-157
Acceptance item: a11y

What is wrong: the a11y project has no `reducedMotion: 'reduce'`. `setTheme` sets `data-theme`, but the site's own theme script can overwrite it after the assertion. Once transitions and the theme toggle exist, colour-contrast results may flake. The plan's `best-practice` tag (C6) is also omitted, which matches the brief.

Suggested fix: set `reducedMotion: 'reduce'` on the a11y project, and assert `data-theme` again right before `analyze()`.

### nit: `scripts/dist/audit-links.ts` is skipped by Prettier

File: .prettierignore:4 (`dist/`)
Acceptance item: declared deviation

What is wrong: the gitignore-style `dist/` pattern also matches `scripts/dist/`. ESLint's flat-config `dist/` only matches the root, so ESLint still lints the file. The orchestrator is fixing this on main.

Suggested fix: use `/dist/` in `.prettierignore` and `.gitignore`.
