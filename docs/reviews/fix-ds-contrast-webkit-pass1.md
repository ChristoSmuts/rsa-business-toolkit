# Review — `fix/ds-contrast-webkit`, pass 1 (Reviewer X)

| | |
|---|---|
| Worktree | `C:\_Projects\Local\bt-wt\ds-contrast` |
| Branch | `fix/ds-contrast-webkit` |
| HEAD | `8f60dc5bcec2b066ce6b878e6e8a697e8b36167b` — `fix(design): gate the contrast panel on the element it measures` (confirmed before starting) |
| Base | `1874a60ccc3c86904606c7b578a5c1e9f89e2e4a` on `main` (confirmed as merge-base) |
| Diff | `git diff 1874a60..HEAD` — 4 files, +515 / −87 |
| Date | 20 September 2026 |
| Machine | Windows 11 Enterprise 26200, Node v24.19.0, pnpm 11.22.0, Vitest 5.0.1, `PW_PORT=5391`, `--workers=1`, no `--reporter` on the command line |
| Reviewer | Fresh instance, no prior contact with this work. This is a post-merge fix, so this single pass is the only independent review. |

This is a post-merge fix to already-merged code, so it gets one independent pass rather than two, and I have weighted it accordingly: every claim the author made was re-derived from scratch, the bug was reproduced on the pre-fix file on this machine, each guard was deleted and the suite watched go red, and the fix was attacked directly through its own exported API and through a live browser.

## Verdict

**CLEAN** — zero blockers, zero majors.

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 3 |

The fix does what it claims. Every author claim I checked held up, including the two draft holes it says it closed. The three minors are all latent gaps in the *stated invariant* ("never reports a result it cannot substantiate") rather than live defects: none is reachable with today's `tokens.css` on the engines the gate runs. I did not soften anything to reach clean, and I found nothing I had to inflate to look thorough.

## Commands

Every command run with `Set-Location` into the worktree. No pasted output was trusted.

| Command | Exit | Tail |
|---|---|---|
| `pnpm lint` | 0 | `Checking formatting... All matched files use Prettier code style!` |
| `pnpm typecheck` (`astro check`) | 0 | `Result (96 files): - 0 errors - 0 warnings - 0 hints` |
| `pnpm exec tsc --noEmit -p .` | 0 | (no output) |
| `pnpm test` | 0 | `Test Files 20 passed (20) / Tests 688 passed (688) / Duration 79.35s` |
| `pnpm test:content` | 0 | `Test Files 1 passed (1) / Tests 32 passed (32)` |
| `pnpm content:drift` | 0 | `Content drift: none.` |
| `pnpm build` | 0 | `2 page(s) built in 1.82s / Complete!` |
| `playwright test --project chromium --project webkit --project mobile --workers=1` | 0 | `2 skipped / 94 passed (12.4m)` |
| `playwright test --project nojs --list` | 1 | `Error: No tests found / Total: 0 tests in 0 files` |
| `playwright test --project a11y --list` | 1 | `Error: No tests found / Total: 0 tests in 0 files` |

Notes on the two exit-1 rows, which are expected and not findings:

- `tests/e2e/` contains only `design-system.spec.ts` and `smoke.spec.ts`. `playwright.config.ts:49,51` match the `nojs` and `a11y` projects on `nojs.spec.ts` and `a11y.spec.ts`, which do not exist on this branch. `pnpm test:e2e` passes `--project nojs` and `pnpm test:a11y` passes `--project a11y`, so both exit 1 on "No tests found". I confirmed the cause by listing each project rather than assuming: the failure is a missing spec file, not a broken harness, a broken config or a crashing browser. This is the unmerged e2e harness package, as briefed.
- The 2 skipped tests are the two WebKit forced-colours tests, skipped by `test.skip(browserName !== 'chromium', 'Playwright emulates forced-colors in Chromium only.')` at `tests/e2e/design-system.spec.ts:458`. Both run and pass on chromium and mobile.

The first Playwright invocation died with `Error: Process from config.webServer exited early` — Astro 7's `preview` daemonises, so Playwright's `webServer` sees its child exit while the server keeps listening. The surviving daemon served `http://127.0.0.1:5391/business-toolkit/` with 200, and the re-run reused it (`reuseExistingServer: !isCI`). Worth knowing for anyone repeating this.

## Reproduction of the bug

Driver: fresh WebKit context per load, `context.route('**/*', r => r.continue())`, `goto(..., {waitUntil: 'load'})` then 400–500 ms, reading `[data-contrast-summary]`'s `data-live`/`data-failures` and the first row's ratio. For the instrumented runs I overrode `window.getComputedStyle` from `addInitScript` and recorded, for every call, whether the element was `documentElement` or the probe span, and what `--st-bg` and `color` came back.

### Before the fix (`git checkout 1874a60 -- src/scripts/design-system-contrast.ts`, rebuilt)

| Run | Loads | Interception | Loads publishing `data-failures="76"` |
|---|---|---|---|
| uninstrumented | 24 | yes | 0 |
| instrumented | 24 | yes | **2** |
| instrumented | 48 | yes | **2** |
| instrumented | 24 | **no** | 0 |

**4 of 72** instrumented intercepted loads reproduced the bug; **0 of 24** without interception. On every one of the four the signature was exactly what the author describes:

```
2 x  live=on failures=76 first=1.00:1 blindProbeReads=196 rootFresh=1 totalReads=197
22 x  live=on failures=0  first=16.20:1 blindProbeReads=0   rootFresh=1 totalReads=197
```

All 196 probe reads returned `--st-bg` = `''` while the root read fresh in the same load, the panel published "76 of 76 pairs fail" at 1.00:1, and it never recovered. My hit rate (4/72 ≈ 6%) is well below the author's 10/24 ≈ 42%, and the uninstrumented driver did not hit it at all in 24 loads — the window is machine- and instrumentation-sensitive, which is consistent with a race and with the author's own point that this is far too unreliable to gate on. The direction and the mechanism reproduce exactly; only the rate differs. I have no reason to doubt the author's number on their machine, and I am reporting mine rather than theirs.

### After the fix (restored, rebuilt; served bundle verified to contain `stContrastProbe` and the `unavailable` copy, and not the pre-fix `the stylesheet did not load` string)

**96 intercepted WebKit loads, 0 published a failure.** Every load ended `live=on failures=0 first=16.20:1`.

More usefully, the instrumentation shows the refusal path actually firing in production loads rather than the window merely being narrower:

```
POST-FIX A (48):  2 x blindProbeReads=1 totalReads=47   |  46 x blindProbeReads=0 totalReads=92
POST-FIX B (48):  6 x blindProbeReads=1 totalReads=47   |  42 x blindProbeReads=0 totalReads=92
```

**8 of 96 loads (1 in 12)** still hit the race. On those the probe was blind for exactly one read — the canary — the reading was refused, and a single later pass did the full 46 reads (47 total) instead of the two full passes (92) a clean load makes. So the blind reading is being detected and discarded, not outrun. The author's claim that the window is not merely narrowed is substantiated on my hardware too.

Also confirmed: post-fix `rootFresh=0` on every load — the fixed code no longer reads `documentElement` at all, which is the point of the change.

## Mutation results

The real file was mutated in place, the suite run, then restored with `git checkout HEAD --`. Byte-identity proved after each cycle and at the end:

- baseline SHA256 `620ABD6BF35C3D045FBB3D1A88AB7D63C7556B3505E6181C6CE88EEE1C3006D8`, `git hash-object` `b895449ba9f120fdf106b6428ff5fbe1a77ae437`
- final SHA256 **identical**, `git status --short` **empty**

| Mutation | Result | Which test, and does it name the right thing? |
|---|---|---|
| Remove gate 1 (`src/scripts/design-system-contrast.ts:101`, the canary check) | 1 failed, 6 passed | `refuses a probe the tokens never reached, even when every colour it reads differs` — exactly one test, and it is the one written to isolate the canary. Message: `expected { swatches: [ '#fbf8f3', …(5) ], …(2) } to be null`. Correct: the reader delivers *correct, differing* colours with no canary, so only gate 1 can catch it. |
| Remove gate 2 (`:128-136`, the all-one-colour backstop) | 1 failed, 6 passed | `refuses a probe that resolves the canary but reads one colour for everything`. Message: `expected { swatches: [ '#000000', …(5) ], …(2) } to be null`, received `failures: 76` with every ratio `1.00:1`. Correct and specific. |
| Remove both, rebuild, run the new e2e test (chromium + webkit) | both failed | `the contrast panel never reports failures it could not measure` fails at `tests/e2e/design-system.spec.ts:523` with the locator resolving to `<p data-live="on" … data-failures="76" …>76 of 76 pairs fail (theme: system).</p>` — **the original bug verbatim**. |
| Extra check I added: run the new e2e test against the genuine pre-fix file (`1874a60`), not a mutated copy | failed on webkit | Same failure, same `data-failures="76"`. The `body > span[hidden]` fallback selector in the test's injected CSS really does match the old probe, so the test is red against the code it was written to catch, not only against a mutant of the new code. |

This is the claim I was most sceptical of, given the project's history of guards that cannot fail, and it holds in all four directions. The author's account of the two draft holes is also verified:

- `data-failures` is now genuinely absent (not `"0"`) for both non-measurement states. `summarise(..., null, ...)` at `:252` deletes the attribute, the forced-colours test asserts `getAttribute('data-failures')` is `null` at `:466`, and the new test asserts the same at `:531`.
- `data-live="on"` is now asserted next to **every** `data-failures="0"` — three places: `:131`, `:689`, `:723`. Since `'on'` is written only inside `render()`, and `render()` is reached only with a non-null `Reading`, the count can no longer be satisfied by a panel that measured nothing.

## Judgement on the gate-2 masking argument

The author argues gate 2 cannot mask genuine token drift because it is value-independent except for the degenerate all-one-colour case, and points at the "still reports real drift" test.

**My judgement: the argument is sound where it matters, and slightly overstated as written.**

Sound where it matters. The failure mode a backstop like this must never have is converting a broken palette into a reported *pass*. It cannot. Refusal takes the `return null` path, which reaches `unavailable()`, which sets `data-live="unavailable"` and **removes** `data-failures`. Every assertion that reads the zero-failure count now requires `data-live="on"` as well. So anything gate 2 swallows turns the gate **red**, not green. I verified the pairing at all three sites and verified by mutation that the two halves fail independently.

Overstated as written. The sentence at `src/scripts/design-system-contrast.ts:93` and `docs/design-system.md:322` says "neither can hide real drift". That is not literally true: a genuine `tokens.css` breakage that collapsed the whole palette to one colour *would* be swallowed by gate 2. It would be reported as `unavailable` rather than as 76 failures. What is true, and what the argument actually needs, is the weaker and still sufficient claim: **gate 2 can never turn a failing palette into a passing one, and the degenerate case it swallows still fails the gate.** I would not hold the fix for this; see nit 1.

Two further reasons I am comfortable with gate 2's cost being bounded:

- It requires `measured.length > 1` **and** every measured colour identical. With 46 swatch tokens and 76 pairs no real palette can trip it; I could not construct a partial-drift case that did.
- `tests/unit/tokens-contrast.test.ts` checks every `CONTRAST_PAIRS` entry against `tokens.css` at build time with no browser involved, so a palette collapse fails there regardless of what the panel does. The runtime panel is a second line, not the only one.

And the cost is directly bounded by a test: `still reports real drift, so the gate has not silenced the panel` breaks one token and asserts, pair by pair, the exact set that must fail (`expect(reading?.pairs[index]?.pass).toBe(!broken.includes(pair))`). I confirmed this test is unaffected by either mutation, so the gates buy their safety without silencing the panel.

## Attempts to defeat the fix

I drove the exported `measure()` directly with hostile `TokenReader`s, and drove the live page in WebKit and Chromium.

Against `measure()` (canary present in every case except the control):

| Reader | Outcome |
|---|---|
| every token `lab(50% 20 30)` | **PUBLISHED** `failures=76/76`, all ratios `unreadable` |
| every token `color(display-p3 0.2 0.3 0.4)` | **PUBLISHED** `failures=76/76`, all ratios `unreadable` |
| half the tokens arrived, half inherited black | **PUBLISHED** `failures=39/76` |
| only the canary arrived, rest inherited black | **PUBLISHED** `failures=59/76` |
| fully styled (control) | PUBLISHED `failures=0/76` |

These are minors 1 and 2 below. Against the live page:

- **Blind the probe, then force a re-measure via a theme change.** Both engines: `data-live="unavailable"`, `data-failures` absent, `0` probes left in the DOM. Correct — except that all 76 rows keep `data-result="pass"` and the "Now" column keeps `16.20:1`, measured under the *previous* theme (minor 3).
- **Un-blind, change theme again.** Both engines recover to `data-live="on"`, `data-failures="0"`. It does not wedge.
- **Thrash the theme 12 times at 60 ms during a blinded retry window, then un-blind.** Both engines settle at `on` / `0` with exactly one probe in the DOM. No timer pile-up (each `attempt()` clears the pending timer at `:312` before doing anything), no probe leak (`discardProbe()` at `:336`, `ensureProbe()` keyed on `isConnected` at `:175`).
- **Retry termination.** `timer` is only re-armed while `Date.now() < deadline` with `GIVE_UP_MS = 5000` and `RETRY_MS = 50`, so at most ~100 cheap iterations (each refused attempt costs a single `getComputedStyle` for the canary). `load` resets the deadline rather than replacing the loop, so the 5 s clock only really starts once every stylesheet is in. A page that never becomes measurable ends at `unavailable` and says "Reload to try again". Terminates and behaves sanely.
- **Forced colours.** `attempt()` clears the timer *before* checking `forcedColours.matches`, so turning forced colours on mid-retry cannot leave an orphan timer. `pause()` rewrites every row to `Paused` and drops `data-failures`. Chromium and mobile e2e both pass; WebKit skips because Playwright cannot emulate it. If a browser had forced colours active but did not match the media query, gate 2 would catch the all-one-colour reading and the panel would say `unavailable` rather than accuse the palette — a wrong-ish message but never a false failure.
- **Reduced motion** is not touched by this script.
- **A token legitimately equal to another** cannot trip gate 2: it requires *every* measured colour to be identical across 46 tokens.
- **Can `on` be reported when it could not measure?** Only via minors 1 and 2. `'on'` is written in exactly one place, `render()`, reachable only with a non-null `Reading`.
- **Can it stick at `unavailable` when it could measure?** Only if the probe stays blind for 5 s after `load` and nothing (theme, colour scheme, forced colours) subsequently changes. Recovery on any of those milestones is verified above.

### DOM, assistive technology and the `Measuring…` state

- The summary is `<p class="ds-contrast-summary" data-contrast-summary aria-live="polite">` at `src/pages/design-system.astro:328` with a `js-only` "Measuring…" span and a `no-js-only` fallback. `src/styles/utilities.css:17,22` hide the inapplicable one with `display: none !important`, so AT sees exactly one, never both. `aria-live="polite"` announces only subsequent changes, so the initial state is not spoken twice.
- While a reading is pending the rows keep their server-rendered `<span class="ds-result" data-contrast-result data-result="pending">Not checked</span>` (`design-system.astro:393-395`) and the "Now" cell keeps `–`. Both are honest text, not colour-only, and readable by AT. Nothing is written over them, so no false `FAIL` can flash.
- axe (wcag2a/aa, 21a/aa) passes in light and dark on all three projects with no serious or critical violations.
- The probe is a `hidden` span, so it is out of the accessibility tree and out of layout. At most one exists at a time.
- `PANEL = { timeout: 30_000 }` at `tests/e2e/design-system.spec.ts:27` comfortably exceeds `GIVE_UP_MS = 5000`, so the e2e assertions cannot race the retry loop.

### Ownership, and the rest of the five lenses

`git diff --name-only 1874a60..HEAD` is `docs/design-system.md`, `src/scripts/design-system-contrast.ts`, `tests/e2e/design-system.spec.ts`, `tests/unit/design-system-contrast.test.ts`. Nothing in `src/lib/**` or `src/pages/**`; nothing outside what a design-system fix should touch.

- **Internationalisation.** `/design-system/` is `lang="en"`, `noindex`, excluded from the sitemap, and is a dev-facing reference. Hard-coded English in the panel copy matches the page it lives on and the pre-fix code. Not a finding.
- **Performance.** The rewrite is a net improvement: write targets are collected once (`panelTargets()` memoised at `:206`) instead of re-querying 76 rows per pass, and token colours are memoised per reading (`cache` at `:103`), so a clean load makes 46 reads per pass instead of one per pair-side. A refused attempt costs one `getComputedStyle`. No new dependencies; the page bundle is 8228 bytes.
- **Security.** No `innerHTML` anywhere — `textContent` only. No network. The script is an external module under `script-src 'self'`; `element.style.color` is a CSSOM mutation, not an inline `style` attribute in markup, and the project's CSP allows `style-src 'unsafe-inline'` regardless. The e2e CSP and no-inline-script assertions pass.
- **Correctness.** Ratios truncated not rounded (`formatRatio`), `Math.floor(ratio * 100) / 100 >= min` so a displayed ratio never overstates a pass. Translucent tokens composited over `bg` with the `token !== CANARY` guard preventing infinite recursion at `:77`. `MediaQueryList`s held at module scope at `:167-168` with a comment explaining why — a real and easy-to-lose bug, correctly pre-empted.
- **Documentation.** `docs/design-system.md` gains an accurate section, and the file header comment is the best explanation of this bug anyone will get. One wording nit below.

## Findings

### minor: a reading where *every* token is unparseable bypasses gate 2 and publishes "76 of 76 pairs fail"
File: `src/scripts/design-system-contrast.ts:128`
Acceptance item: "it never reports a result it cannot substantiate" (`docs/design-system.md`, The live contrast panel)
What is wrong: gate 2 is guarded by `measured.length > 1`, where `measured` is the *successfully parsed* colours. When `parseCssColor` throws for every token, `measured` is empty, the guard is false, gate 2 never runs, and `measure()` returns a reading in which all 76 pairs are `{ ratio: null, pass: false }`. `render()` then writes `unreadable` into every "Now" cell, `FAIL` into every Result cell, and the summary claims "76 of 76 pairs fail" — the exact headline the fix exists to prevent, from an instrument that read nothing.
How to reproduce: `measure({ custom: () => '#fbf8f3', colour: () => 'lab(50% 20 30)' }, SWATCHES, PAIRS)` returns `failures=76/76` with all ratios null. Same with `color(display-p3 0.2 0.3 0.4)`.
Reachability: latent, not live. It needs a computed `color` serialisation outside the parser's set (`#hex`, `rgb`/`rgba`, `color(srgb …)`, `oklab`, `oklch`, `transparent`). Today `tokens.css` is hex plus `color-mix(in oklab, …)`, which both engines serialise as `rgb()` or `oklab()`. It would become live the day someone adds an `lab()`, `lch()`, `hwb()` or `display-p3` token, or a future Safari changes how it serialises wide-gamut `color`. If it were reachable today I would have raised it as a blocker.
Suggested fix: refuse when nothing parsed at all — add `if (cache.size > 0 && measured.length === 0) return null;` before the existing block. One line, and it closes the case where the panel's own instrument is entirely broken while leaving the single-token behaviour untouched.

### minor: a partial reading (only some tokens delivered to the probe) passes both gates
File: `src/scripts/design-system-contrast.ts:101`
Acceptance item: "it never reports a result it cannot substantiate"
What is wrong: gate 1 tests one token, `CANARY = 'bg'`. If the probe receives `--st-bg` but not the rest, every other `var(--st-…)` is invalid at computed-value time and `color` falls back to the inherited value, giving a mixture of real and inherited colours. That is not all-one-colour, so gate 2 does not fire either, and the panel publishes a fabricated failure count.
How to reproduce: `measure({ custom: () => '#fbf8f3', colour: t => t === 'bg' ? asRgb('bg') : 'rgb(0, 0, 0)' }, SWATCHES, PAIRS)` publishes `failures=59/76`. A half-and-half reader publishes `failures=39/76`.
Reachability: latent. `tokens.css` declares the whole palette in one `:root` rule, so the tokens reach the probe atomically — which is why the real WebKit race was all-or-nothing (196 of 196 reads blind). It becomes reachable if the palette is ever split across two rules or two stylesheets. The docs at `docs/design-system.md:320` present gate 2 as "the backstop for any future variant of (1)"; this is a variant of (1) that the backstop does not cover, so the documented reasoning is a little stronger than the code.
Suggested fix: make the canary the whole palette rather than one token — the reader already exposes `custom(token)`, so `swatchTokens.some(t => read.custom(t).trim() === '')` would refuse a partial delivery for the same cost as today's single check.

### minor: going `unavailable` after a good reading leaves the table showing a stale measurement
File: `src/scripts/design-system-contrast.ts:279`
Acceptance item: "it never reports a result it cannot substantiate" / general quality
What is wrong: `pause()` rewrites all 76 rows to `Paused` and all swatches to `system colour`, so the table and the summary agree. `unavailable()` writes only the summary. On a *re-measure* that fails — a theme change while the probe cannot resolve tokens — the summary correctly says checks are unavailable and drops `data-failures`, but the table still shows 76 `data-result="pass"` rows and a "Now" column measured under the previous theme. A designer reading the table sees a live-looking measurement for a theme that was never measured, contradicted only by the paragraph above it.
How to reproduce: load `/design-system/`, wait for `data-live="on"`; inject `[data-st-contrast-probe]{--st-<every token>:initial}`; set `document.documentElement.dataset.theme = 'dark'`; wait 6 s. Observed on both webkit and chromium: `live: 'unavailable', failures: null, firstRatio: '16.20:1', pass: 76`.
Reachability: low. It needs the tokens to stop resolving after they once resolved, which essentially does not happen post-`load`. Raised because `pause()` already establishes the right pattern and `unavailable()` diverges from it, and because the comment at `:333-335` shows the author considered keeping "the last good reading" a feature — it is, right up until the panel gives up, at which point the stale rows outlive the claim that backed them.
Suggested fix: have `unavailable()` reset the rows the way `pause()` does (`–` / `Not checked` / `data-result="pending"`) and the swatches to `…`, so the table and the summary never disagree.

### nit: "neither can hide real drift" overstates what the gates guarantee
File: `src/scripts/design-system-contrast.ts:93` (and the same sentence at `docs/design-system.md:322`)
Acceptance item: general quality
What is wrong: a palette that genuinely collapsed to a single colour *would* be hidden by gate 2 — reported as `unavailable` rather than as failures. The guarantee the code actually delivers, and the one the argument needs, is stronger where it counts and weaker where it is claimed: gate 2 can never turn a failing palette into a reported pass, because refusal removes `data-failures` and sets `data-live="unavailable"`, and every assertion reading the zero count now also requires `data-live="on"`.
Suggested fix: reword to "neither can turn drift into a pass: a refused reading publishes no count at all, and the gate asserts `data-live=\"on\"` alongside `data-failures=\"0\"`."

### nit: the documented DOM contract omits the state the panel is in most often at first paint
File: `src/scripts/design-system-contrast.ts:30`
Acceptance item: general quality
What is wrong: the contract says `data-live` is `on`, `paused` or `unavailable`. There is a fourth observable state — the attribute is **absent** while a reading is pending, which is precisely the state the fix introduces and the one a future reader is most likely to mishandle. The `LiveState` type at `:235` has the same three-way shape.
Suggested fix: one clause — "and is absent until the first substantiated reading".

### nit: the summary does not distinguish "fails contrast" from "could not be read"
File: `src/scripts/design-system-contrast.ts:296`
Acceptance item: general quality
What is wrong: the author deliberately left an unparseable token rendering as `FAIL` with ratio `unreadable`, and I agree that is the right call — failing loud on a token nobody can parse beats silence, and `unreadable` is visible in the row. But the summary rolls it into "N of 76 pairs fail", which reads as a contrast verdict. Someone scanning the summary without reading the table would attribute a parser gap to the palette.
Suggested fix: optional. Count unreadable pairs separately and append ", M could not be read" when non-zero. If this is not worth the code, it belongs in `backlog.md` alongside minor 1, which shares the root cause.

## On the thing the author left deliberately

The author's judgement that a single unparseable token should still render `FAIL` with ratio `unreadable` is **acceptable**, and I would not change it. Treating an unreadable token as a pass, or dropping it from the count, would be the dangerous direction; a visible `unreadable` in the row plus a failure is fail-loud behaviour, and the pair genuinely cannot be shown to meet its minimum. The only part worth revisiting is the two consequences above: the degenerate all-unparseable case (minor 1), where fail-loud becomes the original false accusation, and the summary wording (nit 3).

## Worktree state on exit

- `git status --short` in `C:\_Projects\Local\bt-wt\ds-contrast` — **empty**.
- `src/scripts/design-system-contrast.ts` SHA256 `620ABD6BF35C3D045FBB3D1A88AB7D63C7556B3505E6181C6CE88EEE1C3006D8`, identical to the hash taken before the first mutation; `git hash-object` `b895449ba9f120fdf106b6428ff5fbe1a77ae437`.
- `dist/` rebuilt from the restored HEAD so no mutated build is left behind. `test-results/` and `playwright-report/` removed. All scratch scripts were written to the session scratchpad; the one file that had to sit inside the worktree for module resolution (`.holes-tmp.ts`) was deleted in the same command that ran it, and `git status --short` was empty immediately afterwards.
- Nothing listening on 5391, 4321 or 4322 — verified with `Get-NetTCPConnection -State Listen -LocalPort 5391,4321,4322`, which returns nothing. All `astro preview` jobs and their daemonised children were stopped.
