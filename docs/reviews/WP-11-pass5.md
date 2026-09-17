# WP-11 Stoep design system: review pass 5 (Reviewer S)

- Reviewer: REVIEWER-S (accessibility, correctness, i18n, performance, security; D5 over-claim lens). Did not review this package before. Reviewed the whole diff, drafted findings, then read pass 4.
- Worktree: `C:\_Projects\Local\business-toolkit\.claude\worktrees\agent-a2273231b664d89f3`, branch `worktree-agent-a2273231b664d89f3`.
- HEAD reviewed: `b17e7fd73d54ca87970bb104cf8b6d08f2ebc60a` (confirmed with `git rev-parse HEAD` before starting).
- Base: `git merge-base main worktree-agent-a2273231b664d89f3` = `f81a1f8131a2f6e14c0bc864a85e2e9019e96ff2`.
- Whole diff: 42 files, +7684/−13. Fix round `0cabe11..b17e7fd`: 15 files across `f8a60f8` (code and tests), `12a92f6` (docs), `b17e7fd` (forbidden-string guard).
- Date: 2026-09-18.
- Machine: Windows 11 Enterprise 26200, Node v24.19.0, pnpm 11.22.0, Playwright 1.63.0, vitest 5.0.1. Loaded machine (a concurrent agent on port 5691); all runs used `PW_PORT=5491` and `--workers=1`, port confirmed free beforehand and released afterwards. No `--reporter` passed on any command line.
- Scratch evidence: `%TEMP%\claude\C---Projects-Local-business-toolkit\2d511423-486a-4dd5-8e3b-fab6857854dc\scratchpad\` — `reflow-audit.mjs` (broad injection), `reflow-probe.mjs` (blame isolation), `reflow-final.mjs` (final audit table), `mutation-reflow.mjs` (reflow guard mutation), `heading-wrap.mjs` (minor 2 re-measurement), `pass4-verify.mjs` (minors 3 and 7), `uif.mjs` (real long Afrikaans terms).
- **Worktree left exactly as found.** Two mutation tests temporarily edited tracked files and were reverted with `git checkout --` in the same turn; final `git status --short` is empty, `git status --porcelain` returns 0 lines, HEAD is unchanged at `b17e7fd`. No preview server left listening on 5491 (verified with `Get-NetTCPConnection -LocalPort 5491 -State Listen` → none).

## Verdict: CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 1 |
| nit | 1 |

Both pass-4 majors are genuinely fixed, and I verified each one by breaking it rather than by reading it.

- **Reflow.** At 320×800 in Chromium *and* WebKit, with real Afrikaans strings from `src/i18n/af.json` and unbreakable compounds injected into 29 selector groups, `document.documentElement.scrollWidth === clientWidth === 320`, **zero** elements past the viewport and **zero** text nodes clipped by an `overflow: hidden` ancestor. 200% root font size at 640 and 1280 is clean in both engines too.
- **The stale VAT threshold.** The demo now reads R 2 300 000 / 1 April 2026 / checked 13 September 2026, and all three match `docs/rsa-business-toolkit/` exactly. I pasted the stale sentence back *as authored, with its markup* and the new guard went red on the real file, naming `src/pages/design-system.astro:1084`. `b17e7fd` is a real fix, not a cosmetic one.
- **Minor 2, where the author disagreed with pass 4: the author is right.** I re-measured independently and `break-word` and `anywhere` produce byte-identical line boxes, box widths, line counts and document widths on every capped heading container, in both engines, on five strings including pass 4's own "Responsibilities," comma-orphan case.

The one minor is a gap in the *guard*, not in the page: two of the four declarations the fix round added are no longer load-bearing at page level, so the e2e test stays green if they are deleted. That corrects a claim in the handover, but nothing user-facing is wrong.

## Commands and output tails

Run by the reviewer in the author worktree at HEAD `b17e7fd`. Real exit codes, captured per command.

```
== pnpm lint
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
LINT_EXIT=0

== pnpm typecheck
$ astro check
22:50:28 [check] Getting diagnostics for Astro files in ...agent-a2273231b664d89f3...
Result (44 files):
- 0 errors
- 0 warnings
- 0 hints
TYPECHECK_EXIT=0

== pnpm test
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  3 passed (3)
      Tests  188 passed (188)
   Duration  15.65s
TEST_EXIT=0

== pnpm test:content            (gate:fast's fourth line)
$ vitest run --project content --passWithNoTests
No test files found, exiting with code 0
CONTENT_EXIT=0

== pnpm build
$ astro build
22:54:18 [astro-icon] Loaded icons from src/icons, lucide
  ├─ /design-system/index.html (+37ms)
  ├─ /index.html (+11ms)
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 2 page(s) built in 13.22s
[build] Complete!
BUILD_EXIT=0
```

The pass-4 nit is visible as fixed in the build log itself: `[astro-icon] Loaded icons from src/icons, lucide` replaces the old `Failed to load icons from "src/icons": ENOENT`.

Playwright, three projects in one run, `--workers=1`, preview on 127.0.0.1:5491:

```
$ PW_PORT=5491 pnpm exec playwright test --project chromium --project webkit --project mobile --workers=1
  ok 88 [mobile] › design-system.spec.ts:736:3 › disabled and loading buttons ignore activation ... (15.6s)
  ok 89 [mobile] › tests\e2e\smoke.spec.ts:3:1 › home page renders under the base path (17.8s)

  Slow test file: [webkit] › tests\e2e\design-system.spec.ts (6.5m)
  Slow test file: [chromium] › tests\e2e\design-system.spec.ts (6.0m)
  Slow test file: [mobile] › tests\e2e\design-system.spec.ts (5.9m)
  2 skipped
  88 passed (20.4m)
E2E_EXIT=0
```

88 passed, 2 skipped (the two forced-colours tests, Chromium-only by design), zero failures, zero flakes on a loaded machine. No environment failures to discount: no fork-pool timeouts and no browser setup timeouts occurred.

## Ownership

`git diff --name-only f81a1f8..b17e7fd` = 42 paths. Against the WP-11 allowlist (`src/styles/**`, `src/components/ui/**`, `src/layouts/Base.astro`, `src/pages/design-system.astro`, `src/scripts/**`, `docs/design-system.md`, `astro.config.ts`, design-system tests):

| Path | Status |
|---|---|
| `src/styles/**` (4), `src/scripts/**` (5), `src/components/ui/**` (13), `src/layouts/Base.astro`, `src/pages/design-system.astro`, `docs/design-system.md`, `astro.config.ts` | inside the allowlist |
| `tests/e2e/design-system.spec.ts`, `tests/unit/tokens-contrast.test.ts`, `tests/unit/forbidden-strings.test.ts` | design-system tests — inside |
| `src/components/illustrations/**` (8), `public/favicon.svg`, `src/pages/index.astro`, one line of `eslint.config.js` | outside the literal allowlist, but **already adjudicated**: pass 1 raised `index.astro` as a major, pass 2 recorded that the author's brief lists these as owned, and passes 2–4 accepted all of them. Not re-litigated here. |
| `src/icons/README.md` (new this round, flagged by the author) | **Acceptable.** See below. |

**`src/icons/README.md` — acceptable.** It is a six-line file whose only job is to make the directory exist so `astro-icon` stops logging `ENOENT` on every build. D1 gives the design-system package "fonts/icons", `astro.config.ts` (already owned) is where `icon()` is configured, and no other package owns `src/icons/`. The alternative — repointing `iconDir` in `astro.config.ts` — touches an owned file but leaves a less obvious artefact. It creates no merge-conflict surface for WP-12/WP-20/WP-21. I verified the warning is actually gone from the build log.

**Fix round stayed clean:** `git diff --name-only 0cabe11..b17e7fd` is 15 files, every one inside the allowlist except that README.

Rule checks across the whole diff: **zero** literal colours outside `tokens.css` (`git grep -nE "#[0-9a-fA-F]{3,8}|rgb\(|hsl\(" -- src ':!src/styles/tokens.css'` → empty, after excluding system colour keywords); **zero** `href="/…"` literals in `src/`; `href()` used 13 times in `design-system.astro`.

## Reflow audit

Method: `astro preview` on 127.0.0.1:5491 serving the real build. Viewport 320×800, Chromium **and** WebKit. The first text node of every match in 29 text-bearing selector groups was replaced with (a) unbreakable compounds of 24, 27 and 36 characters, (b) a 181-character real Afrikaans sentence (`site.disclaimerLong` shape) into all flow copy, and (c) the 38-character status label `"Masjienvertaling, nog nie nagegaan nie"` into every badge and callout label. For each run I recorded `document.documentElement.scrollWidth`, **every element whose right edge passes the viewport and is not inside a scrollable ancestor**, and **every text node clipped by an `overflow: hidden|clip` ancestor** — the pass-4 minor-1 class of defect that `scrollWidth` cannot see. 200% root font size was checked at 640 and 1280. (`scratchpad/reflow-final.mjs`.)

The longest unbreakable word in the whole of `src/i18n/af.json` is `Maatskappyregistrasienommer` (27, `templates.fields.registrationNumber`) — the author's `LONGEST_COMPOUND` is a real value and is the real worst case. `docs/rsa-business-toolkit-af/` does not exist yet (P4 has not run), so no longer Afrikaans string exists in the repo today.

| Engine | Viewport | Zoom | Compound | Selector groups | scrollWidth | clientWidth | Elements past viewport | Text clipped | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| chromium | 320×800 | 100% | 24 | 29 | **320** | 320 | 0 | 0 | pass |
| chromium | 320×800 | 100% | **27 (real worst case)** | 29 | **320** | 320 | 0 | 0 | pass |
| chromium | 320×800 | 100% | 36 (synthetic) | 29 | 393 | 320 | 3 | 0 | see note |
| chromium | 640×800 | 200% root | 27 | 29 | **640** | 640 | 0 | 0 | pass |
| chromium | 1280×800 | 200% root | 27 | 29 | **1280** | 1280 | 0 | 0 | pass |
| webkit | 320×800 | 100% | 24 | 29 | **320** | 320 | 0 | 0 | pass |
| webkit | 320×800 | 100% | **27 (real worst case)** | 29 | **320** | 320 | 0 | 0 | pass |
| webkit | 320×800 | 100% | 36 (synthetic) | 29 | 393 | 320 | 3 | 0 | see note |
| webkit | 640×800 | 200% root | 27 | 29 | **640** | 640 | 0 | 0 | pass |
| webkit | 1280×800 | 200% root | 27 | 29 | **1280** | 1280 | 0 | 0 | pass |

Chromium and WebKit agree to the pixel in every row.

**Selectors pass 4 did not cover — checked, no finding.** The 36-character rows above blame `.st-skip-link`, `.st-logo__text` and `label.st-check`, none of which is in the e2e injection list. I pushed on this with the longest *real* South African Afrikaans terms I could justify — `Werkloosheidsversekeringsfonds` (30; the UIF, named 25 times in the English content) and `Arbeidsongeskiktheidsversekering` (32) — and at both lengths `.st-skip-link` and `label.st-check` stay inside the viewport in both engines (`scratchpad/uif.mjs`). The only element that overflows at 27–32 characters is `.st-logo__text`, and that is the wordmark: a brand name rendered from the `name` prop ("SA Business Toolkit", longest word 8 characters), in the same category as the `--st-token-name` and `Kbd` strings the contract already documents as legitimately unbreakable. So the package carries roughly 32–35 characters of unbreakable compound before anything gives way, against a documented and real load of 27. That is genuine headroom, not luck, and it is not a finding.

**Two candidates I discarded as artefacts of my own injection**, recorded so the next reviewer does not chase them: injecting into `.ds-spacing li` walks into the `<code>--st-space-N</code>` token name (documented `white-space: nowrap`, never translated) and produced a 443–521px page; and the stacked wide table's `thead` reports as "clipped" because it is the standard visually-hidden pattern (`position: absolute; 1px; overflow: hidden; clip-path: inset(50%)`) with the column headers re-rendered as `data-label` cells. Neither is a defect.

## Guard mutation tests

A guard that cannot fail is not a guard. Both were verified by breaking the fix, not by reading the test.

### 1. Forbidden-string guard (`b17e7fd`) — **genuinely fails.** Verified.

I pasted the stale figure back into `src/pages/design-system.astro` exactly as the copy is authored — wrapped across two lines with the amount inside `<strong>` markup — and ran the test:

```
$ pnpm exec vitest run --project unit tests/unit/forbidden-strings.test.ts
 FAIL  |unit| tests/unit/forbidden-strings.test.ts > forbidden strings in hand-written source >
        never states the superseded R1 million compulsory VAT registration threshold
AssertionError: Use R2.3 million from 1 April 2026 — see docs/rsa-business-toolkit/05 Look it
up/03-sources-and-verification-register.md.: expected [ Array(1) ] to deeply equal []
+ [ "src\\pages\\design-system.astro:1084: VAT once your turnover passes R 1 000 000" ]
 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
MUTATION_EXIT=1
```

It fails on the real file, with the right line number. The file was restored with `git checkout --` immediately; `git status --short` empty.

**Facts check (independent of the test).** All four values match the source of truth:

| Claim on the page | Source | Match |
|---|---|---|
| `R 2 300 000` compulsory VAT threshold | `docs/rsa-business-toolkit/README.md:37` ("R2.3 million … not R1 million"); register:60, :64 | yes |
| "changed on 1 April 2026" | register:60, :64 ("rose from R1 million to R2.3 million on 1 April 2026") | yes |
| `checkedDate = '13 September 2026'` | register:5, "All sources were checked on 13 September 2026" | yes — the register's own date, not invented |
| SARS FAQ URL | register:63, byte-identical | yes |

### 2. Reflow guard — **fails for two of the four declarations, not four.** This is minor 1.

I reverted each declaration at runtime (an override stylesheet restoring the pre-`f8a60f8` value) against the real build, then ran the measurement from `tests/e2e/design-system.spec.ts:203` verbatim. This touches no file in the author's worktree.

| Reverted | Chromium scrollWidth | WebKit scrollWidth | e2e test |
|---|---|---|---|
| nothing (baseline) | 320 | 320 | PASS |
| `.st-btn__label { overflow-wrap: anywhere }` | **320** (button right edge 291 → 304) | **320** | **PASS — guard blind** |
| `.st-link-block` (back to `inline-flex`, no `anywhere`) | 353 | 353 | FAIL ✓ |
| `.st-toast { overflow-wrap: anywhere }` | **320** (toast right edge unchanged, 291) | **320** | **PASS — guard blind** |
| `.ds-segmented__option { overflow-wrap: anywhere }` | 372 | 372 | FAIL ✓ |
| all four together | 372 | 372 | FAIL ✓ |

The handover states that reverting the four declarations makes the test fail in both engines. That is true *collectively*, and true individually for `.st-link-block` and `.ds-segmented__option`. It is **not** true for `.st-btn__label` or `.st-toast`: with those reverted the page still measures 320 and the suite stays green. The reason is that minors 3–7 capped the page grids in the same round, so the button's and toast's raised min-content contribution no longer propagates to the document. Both declarations are still correct to keep — the button does grow 291 → 304 — but nothing will catch their removal.

### 3. Minor 2 re-measured — the author's disagreement is upheld

Pass 4 asked for `break-word` on headings plus capped containers; the author kept the global `h1–h6 { overflow-wrap: anywhere }` and argued that on a capped container the two values are indistinguishable. I applied each value to every heading and compared box width, box height, rendered line count and every line box rectangle on five capped containers (`.st-section-header__title`, `.st-empty__title`, `.ds-section > h2`, `.ds-section > h3`, `.st-card__title`), across five strings (`scratchpad/heading-wrap.mjs`):

```
chromium "Kernverpligtinge vir alle eenpersoonsonder..."  -> IDENTICAL (doc 320 vs 320)
chromium "Responsibilities, registrations and record..."  -> IDENTICAL (doc 320 vs 320)
chromium "Maatskappyregistrasienommer..."                 -> IDENTICAL (doc 320 vs 320)
chromium "Werknemersbelastingregistrasienommer en vo..."  -> IDENTICAL (doc 320 vs 320)
chromium "Verbruikersbeskermingswetgewing, privaathe..."  -> IDENTICAL (doc 320 vs 320)
webkit   (same five strings)                              -> IDENTICAL (doc 320 vs 320) ×5
```

Identical in both engines on all five, **including pass 4's own comma-orphan string**. Pass 4's "Responsibilities / , registrations" difference was indeed an artefact of the container being allowed to grow past the viewport; once `.st-section-header__inner` is capped it does not reproduce. The rule is correctly kept as a safety net and is documented at `docs/design-system.md:395` together with the cost. **Stating this plainly: the author was right and pass 4 was wrong on this point.**

## Findings

### minor: two of the four reflow declarations are no longer covered by any failing test
File: `src/components/ui/Button.astro:278` (`.st-btn__label`), `src/components/ui/ToastRegion.astro:68` (`.st-toast`); guard at `tests/e2e/design-system.spec.ts:203-261`
Acceptance item: `docs/design-system.md:431` contribution checklist item 9 ("add its selector to the long-label e2e injection"), which is the package's own stated mechanism for protecting these declarations; D4 review protocol "Missing required … test".
What is wrong: the long-label test asserts only `document.documentElement.scrollWidth <= clientWidth`. Since the page grids were capped in this same round, removing `overflow-wrap: anywhere` from `.st-btn__label` or from `.st-toast` no longer moves the document width, so the suite stays green with the fix deleted (measured above: 320/320 in both engines, against 353 and 372 for the two declarations that *are* covered). The selectors *are* injected, as the checklist requires — the assertion is simply too coarse to discriminate. Practical consequence: a future package that "tidies away" either declaration gets a green gate, and the regression only reappears once a component lands in a container that is not capped, which is exactly the situation the safety net exists for.
How to reproduce: `node scratchpad/mutation-reflow.mjs` with the preview on 5491 — rows `revert .st-btn__label` and `revert .st-toast` report PASS.
Suggested fix: alongside the document-width assertion, assert each shrink-wrapped component's own measured right edge against a budget (the test already collects `widest: {badge, button, linkBlock, toast}` for the failure message — asserting on it costs nothing), or assert `getComputedStyle(el).overflowWrap === 'anywhere'` for the five selectors the contract lists at `docs/design-system.md:394`.

### nit: `stripMarkup`'s docstring does not describe what the code does
File: `tests/unit/forbidden-strings.test.ts:97-99` (comment) vs `:100-118` (implementation)
What is wrong: the comment says "Replace every tag with a space, so a claim reads as a sentence however it is marked up", but the loop `continue`s through tag characters without pushing anything, so tags are *removed*, not replaced: `R 1<span>000 000</span>` becomes `R 1000 000`, with no word boundary where the markup was. Today this is harmless — `GAP` is `[\s\u00a0,.]?`, which matches the empty string, so the pattern still fires (I confirmed the guard goes red on the real authored sentence). It matters for the next rule someone adds: a pattern using `\b` or requiring a separator would silently miss the split-by-markup case, which is precisely the failure mode `b17e7fd` was written to close. Either push a space in the `inTag` branch, or correct the comment to "drop every tag".

## Pass-4 verification

| Pass-4 finding | Status | Evidence |
|---|---|---|
| **major 1** `Button`, `.st-link-block`, `.st-toast` widen the page at 320px (343–362px) | **Resolved** | My own audit: 320/320 in both engines at 24 and 27 characters, 0 elements past viewport, 0 text clipped, 200% clean at 640 and 1280. Verified load-bearing for `.st-link-block` (353) and `.ds-segmented__option` (372); see minor 1 for the guard gap on the other two |
| **major 2** D5 demo publishes the stale R1m VAT threshold as AI-checked | **Resolved** | R 2 300 000 / 1 April 2026 / 13 September 2026 / SARS URL all match `README.md:37` and register `:5,:60,:63,:64`. New guard proven red on the real authored markup (exit 1, correct file:line) |
| minor 1 `SectionHeader` silently clips lead content | **Resolved** | `overflow: hidden` moved off `.st-section-header` onto `.st-section-header__pattern` (`SectionHeader.astro:42-53`), inner grid capped; my clipped-text sweep found 0 real clips in either engine; e2e test at `:270` covers it |
| minor 2 `h1–h6 { overflow-wrap: anywhere }` breaks before punctuation | **Author disagreed — disagreement upheld** | Re-measured independently: identical line boxes, widths, line counts and document widths in both engines on 5 strings including pass 4's comma case. Documented at `docs/design-system.md:395` |
| minor 3 page grids other than `.ds-page`/`.ds-section` uncapped (485px) | **Resolved** | Type specimens with a 27-char compound: right edge 279px, `scrollWidth` 320, both engines |
| minor 4 swatch title advertises a flat tint strength | **Resolved** | `design-system.astro:83` now reads "Section tints (hue over the page background, per-hue strength)" |
| minor 5 no-sources note renders two 40px stand-alone targets | **Resolved** | Rewritten as a sentence plus a `.st-cluster` of two `.st-link-block` links (`:1067-1079`). The 44px test at `:167` measures any `.st-link-block` unconditionally, so a regression is now caught |
| minor 6 AI-checked badge identical to "Official source" | **Resolved** | New neutral `Badge variant="status"` (`Badge.astro:104-108`) reusing the already-verified `--st-surface-2` / `--st-text` pair — no new colour, no new contrast pair. Rationale in the component and at `docs/design-system.md:265`; e2e test at `:314` |
| minor 7 external-link ↗ detaches from wrapped source titles | **Resolved** | `.st-link-block` is `inline-block` with padding-based height. Measured at 375px on 5 links, both engines: `iconOnLastLine: true` in every case, 3–4 line wraps, height 70–96px (≥ 44) |
| nit fictional reviewer "Thandi Mokoena" published | **Resolved** | `git grep Thandi` → no hits; `{reviewer}` placeholder used, with the reason commented at `:194-195` |
| nit `Base.astro` comment describes the old `assetsInlineLimit: 0` | **Resolved** | `Base.astro:10` now describes the function form |
| nit `uid()` ids depend on build order | **Resolved** | `resetUid()` exported (`uid.ts:23`) with guidance at `:13` |
| nit `theme-control.ts` writes `localStorage` directly | **Resolved** | WP-30 hand-back note at `theme-control.ts:7` |
| nit every build logs an astro-icon ENOENT warning | **Resolved** | `src/icons/README.md`; build now logs `Loaded icons from src/icons, lucide`. Ownership judged acceptable (see Ownership) |

No regressions found against passes 1–4. The pass-3 and pass-2 items re-verified in pass 4 were spot-checked and remain fixed (no literal colours outside `tokens.css`, zero inline `<script>`, CSP byte-identical to plan C4 and before the first script, `PW_DS_TIMEOUT` configurable, forced-colours panel pauses, stacked table semantics).

## D5 readiness

**Yes.** All four items pass 4 wanted settled before a page package copies this section are closed, and I checked the page itself through the over-claim lens rather than only the docs.

| Pass-4 item | Now |
|---|---|
| Dated-fact demo states the stale R1m threshold | Current figure, from the register, with the register's own checked date, guarded by a unit test that I proved fails without the fix |
| Verification status and officialness share a badge variant | Separate variants: neutral `status` for who looked at the page, `official` for who wrote the rule; e2e asserts the split |
| ↗ detaches from wrapped source titles | Icon stays in the last text run in both engines |
| No-sources note's two links are 40px stand-alone targets | Both are `.st-link-block`, and the 44px test measures them unconditionally |

Over-claim check on the rendered page: the AI notice names *who* checked (an AI) and says plainly "No person has checked it yet"; the status appears as a badge **and** as words **and** with its one-sentence explanation immediately beside it; the unconfirmed-fact demo keeps the flag *and* the sentence telling the reader what to do about it; the Afrikaans notice correctly says the *English* text was checked, with the machine-translation notice directly under it; "official" is used only for entries that are official in the register. Nothing on the page claims more than its source supports. The one place the page could have over-claimed — a named human reviewer — is deliberately left as `{reviewer}`, with the reason commented in the source.

`docs/design-system.md` is a contract a page package could follow without rediscovering these bugs. The "Wrapping and min-content" section (`:376-398`) is the part that would otherwise be re-learned the hard way: it separates *wrapping* from *min-content*, gives a table of what each mechanism does and does **not** do (including that `min-inline-size: 0`, `hyphens: auto` and percentage `max-inline-size` are all traps), names the exact selectors that carry each rule, and records the measured before-values. "Notices and sources" (`:256-296`) gives the composition order, the no-new-colour rule and the reason, and "A number in a demo is a number that ships" states the standard that pass-4 major 2 violated. The contribution checklist's items 9 and 10 encode both majors as standing rules. My minor 1 is the one place the contract's own mechanism (checklist item 9) does not yet do what it promises.

## Audit notes (no finding)

- **Guard coverage beyond this package.** `tests/unit/forbidden-strings.test.ts` scans `src/pages`, `src/layouts` and `src/components`, skipping folders that do not exist yet without failing — so it starts working for WP-20/WP-21 the moment they land, rather than needing to be remembered.
- **`.st-link-block` blockification.** Inside `.st-cluster` (a flex container) the computed `display` is `block`, not `inline-block`, because flex items blockify. The min-content fix still holds there, because it comes from `overflow-wrap: anywhere` rather than from the display value; measured clean. Worth knowing before someone "fixes" the discrepancy.
- **`1lh` in `.st-link-block`'s padding.** `padding-block: max(0px, calc((var(--st-target) - 1lh) / 2))` degrades safely: if `lh` is unsupported the declaration is dropped and `min-block-size: var(--st-target)` still delivers a 44px target, with the text at the top rather than centred.
- **`docs/design-system.md` internal links** are written as `/design-system/#notices`, which would not resolve under the configured GitHub Pages base path if that markdown is ever rendered as a page. It is a repo doc, not shipped HTML, and the `href()` rule is about app links, so this is an observation for whoever publishes the docs, not a finding against WP-11.
- **What I could not check.** Manual assistive-technology passes (NVDA+Firefox, TalkBack+Chrome) and real Safari — the package documents both as deferred, and the WebKit heavy-Fraunces artefact is recorded in "Known limits" with measured advance widths showing the variation axis does apply. Print rules still have no automated check, as the package states. I did not re-run `test:a11y` or `test:visual`; the three e2e projects the package owns were run in full and axe runs inside them in light and dark.
