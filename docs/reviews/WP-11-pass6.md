# WP-11 Stoep design system: review pass 6 (Reviewer V)

- Reviewer: REVIEWER-V (correctness, accessibility, i18n, performance, security; D5 over-claim lens). Did not review this package before. Reviewed the whole diff, drafted findings, then read passes 4 and 5.
- Worktree: `C:\_Projects\Local\business-toolkit\.claude\worktrees\agent-a2273231b664d89f3`, branch `worktree-agent-a2273231b664d89f3`.
- HEAD reviewed: `fb0ac86eb906553188e240b8bfdfd2a5d144fe8b` (confirmed with `git rev-parse HEAD` before starting, and again at the end — unchanged).
- Base: `git merge-base main worktree-agent-a2273231b664d89f3` = `f81a1f8131a2f6e14c0bc864a85e2e9019e96ff2`.
- Whole diff: 42 files, +7821/−13. Round since pass 5: `ee161ff` (per-component min-content guard), `ae2973b` (`stripMarkup` docstring + split-case test), `fb0ac86` (hyphenation off during measurement).
- `main` has moved (content pipeline merged as `22e14b0`). Reviewed the branch as it stands; merge integration is the orchestrator's job.
- Date: 2026-09-18.
- Machine: Windows 11 Enterprise 26200, Node v24.19.0, pnpm 11.22.0, Playwright 1.63.0, Vitest 5.0.1, Astro 7.3.2. Loaded machine. All Playwright runs used `PW_PORT=5491` and `--workers=1`; 5691/5692 untouched; no `--reporter` passed on any command line. Port 5491 confirmed free before the first run and released afterwards (`Get-NetTCPConnection -LocalPort 5491 -State Listen` → none).
- Scratch evidence: `%TEMP%\claude\C---Projects-Local-business-toolkit\2d511423-486a-4dd5-8e3b-fab6857854dc\scratchpad\` — `audit.mjs` (broad reflow + a11y audit), `diag.mjs`–`diag2.mjs` (overflow blame), `diag3.mjs` (real horizontal-scroll probe), `diag4.mjs`–`diag6.mjs` (section and element bisect), `diag7.mjs`–`diag10.mjs` (`<select>` characterisation), `diag11.mjs`–`diag12.mjs` (target sizes with documented exemptions), `diag13.mjs` (min-content growth at unmodified HEAD).
- **Worktree left exactly as found.** Nine temporary source reverts were applied to demonstrate guard failure and were each restored with `git checkout --` in the same turn. Final `git status --short` returns 0 lines and `git status --porcelain --untracked-files=all` returns 0 lines. HEAD unchanged at `fb0ac86`.

## Verdict: CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 1 |

Pass 5's one minor is genuinely fixed, and fixed better than either approach pass 5 suggested. I verified the new guard by breaking it, not by reading it: **all four** declarations the author claims are individually load-bearing turn the test red on their own, in Chromium *and* WebKit, and the numbers in the spec comment reproduce on this machine to the pixel.

I also independently re-ran the whole reflow and accessibility audit rather than re-running the author's. It is clean at 320×800 and at 200% root font in both engines, with one engine-specific exception I found that no prior pass covers (`<select>`, minor 1).

On the 14-cap blindness the author reported but did not fix: I verified it, and **the author's claim is correct for 13 of the 14, not all 14** — `.st-section-header__inner` *is* individually guarded. I assign the blindness **minor** and judge it acceptable as documented, with a backlog entry (see [Severity judgement: the capped-track blindness](#severity-judgement-the-capped-track-blindness)).

## Commands and output tails

Run by the reviewer in the author worktree at HEAD `fb0ac86`. Real exit codes, captured per command.

```
== pnpm lint
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
LINT_EXIT=0

== pnpm typecheck
$ astro check
02:33:24 [types] Generated 79ms
02:33:24 [check] Getting diagnostics for Astro files in C:\...\agent-a2273231b664d89f3...
Result (44 files):
- 0 errors
- 0 warnings
- 0 hints
TC_EXIT=0

== pnpm test
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  3 passed (3)
      Tests  188 passed (188)
   Start at  02:34:44
   Duration  19.28s (transform 51%, import 29%, tests 15%, worker 4%)
TEST_EXIT=0

== pnpm test:content
$ vitest run --project content --passWithNoTests
No test files found, exiting with code 0
CONTENT_EXIT=0

== pnpm build
$ astro build
02:38:03 [build] output: "static"
02:38:03 [astro-icon] Loaded icons from src/icons, lucide
02:38:03 [vite] ✓ built in 454ms
02:38:03 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
02:38:03 [build] 2 page(s) built in 870ms
02:38:03 [build] Complete!
BUILD_EXIT=0

== PW_PORT=5491 pnpm exec playwright test --project chromium --project webkit --project mobile --workers=1
  ok 93 [mobile] › tests\e2e\smoke.spec.ts:3:1 › home page renders under the base path (20.2s)
  Slow test file: [chromium] › tests\e2e\design-system.spec.ts (6.7m)
  Slow test file: [mobile] › tests\e2e\design-system.spec.ts (6.6m)
  2 skipped
  91 passed (18.9m)
PW_EXIT=0
```

The two skips are the forced-colours tests under WebKit and mobile; Playwright emulates `forced-colors` in Chromium only, and the spec skips them explicitly (`design-system.spec.ts:452`, `:466`).

No "exited early" from `astro preview` was seen in any run. I killed stale listeners before starting and let Playwright's `webServer` manage the process; the daemonisation problem the previous author hit did not reproduce on this machine.

Two further gate lines, for the orchestrator's information only — see nit 1:

```
== PW_PORT=5491 pnpm exec playwright test --project nojs --workers=1
Error: No tests found
NOJS_EXIT=1

== PW_PORT=5491 pnpm exec playwright test --project a11y --workers=1
Error: No tests found
A11Y_EXIT=1
```

## Ownership

`git diff --name-only f81a1f8..fb0ac86` = 42 paths.

| Paths | Verdict |
|---|---|
| `src/styles/**` (4), `src/scripts/**` (6), `src/components/ui/**` (13), `src/icons/README.md`, `src/layouts/Base.astro`, `src/pages/design-system.astro`, `docs/design-system.md`, `astro.config.ts`, `tests/e2e/design-system.spec.ts`, `tests/unit/{forbidden-strings,tokens-contrast}.test.ts` | inside the allowlist |
| `src/components/illustrations/**` (8), `public/favicon.svg`, `src/pages/index.astro`, one line of `eslint.config.js` | outside the literal allowlist, **already adjudicated** in passes 1–4 and accepted. Not re-litigated. I spot-checked each: the illustrations and favicon are explicit B7 deliverables, `index.astro` had to adopt the new `Base` layout for the CSP e2e test on `/`, and the `eslint.config.js` line adds `src/scripts/**` to the `no-restricted-globals` allow-list, which `docs/design-system.md:306` documents and `theme-init.js` requires. |

The round since pass 5 (`b17e7fd..fb0ac86`) touches four files, all inside the allowlist: `tests/e2e/design-system.spec.ts`, `tests/unit/forbidden-strings.test.ts`, `docs/design-system.md`, `src/pages/design-system.astro`.

`playwright.config.ts` is **unchanged** from the base commit.

## Guard verification: can the new test actually fail?

Each declaration was deleted from the real source, `pnpm build` re-run, and `-g "no shrink-wrapped"` run against Chromium and WebKit. Every revert was restored with `git checkout --` immediately after. "Min-content on the compound" is the box's own min-content width at 320px with hyphenation forced off, as the test measures it.

| # | Declaration | File:line | Min-content on compound, rule present → deleted | Result |
|---|---|---|---|---|
| 1 | `.st-btn__label { overflow-wrap: anywhere }` | `src/components/ui/Button.astro:280` | 111px → **289px** | **RED** in chromium and webkit |
| 2 | `.st-link-block { overflow-wrap: anywhere }` | `src/styles/utilities.css:47` | 16px → **237px** | **RED** in chromium and webkit |
| 3 | `.st-toast-region .st-toast { overflow-wrap: anywhere }` | `src/components/ui/ToastRegion.astro:68` | 78px → **262px** | **RED** in chromium and webkit |
| 4 | `.ds-segmented__option { overflow-wrap: anywhere }` | `src/pages/design-system.astro:1378` | 44px → **265px** | **RED** in chromium and webkit |
| 5a | `.st-empty__title { overflow-wrap: anywhere }` **alone** | `src/components/ui/EmptyState.astro:68` | 21px → 21px | **GREEN** — exactly as the author documents |
| 5b | 5a **plus** `h1–h6 { overflow-wrap: anywhere }` | + `src/styles/base.css:172` | 21px → **210px** | **RED** in chromium and webkit |

Case 5b reproduced the author's documented figures exactly: *"min-content 23px on 'Ja', 210px on the compound, both engines"* (`design-system.spec.ts:76-77`). I measured 23px/210px on the revert and 21px on the intact build (the 2px is the `hyphens: manual` override the test applies and my standalone probe applies identically). Both engines agreed to the pixel in every one of the six runs.

### Judging the instrument

**Is the growth assertion with a 24px tolerance sound?** Yes. Measured at unmodified HEAD, in both engines:

| Selector | min-content "Ja" → "Maatskappyregistrasienommer" | growth |
|---|---|---|
| `.st-btn` | 105 → 111 (chromium), 104 → 111 (webkit) | 6–7px |
| `a.st-link-block` | 15 → 16 | 1px |
| `.st-toast` | 72 → 78 | 6px |
| `.ds-segmented__option` | 37 → 44 | 7px |
| `.st-empty__title` | 12 → 21 | 9px |

So the tolerance sits between a 1–9px noise floor and a 178–221px failure signal: roughly 2.7× above the worst legitimate movement and 7× below the weakest failure. Nothing a designer can do to padding, font, icon, border or component size moves the *growth* — those all cancel between the two measurements — so the number is not tied to a font, a component or an engine, exactly as the comment claims. The two engines never differed by more than 1px in any measurement I took. This is a well-chosen quantity.

**Was rejecting pass 5's two suggestions right?** Yes, on both counts, and I would have rejected them too.

- A **right-edge budget** measures where the component happens to sit on this page today. It is the same class of quantity that made the page-level test blind in the first place, and it would have to be re-tuned every time the demo layout moved.
- **Asserting `getComputedStyle(el).overflowWrap === 'anywhere'`** asserts that the declaration exists, which is a tautology against the declaration itself: it would pass if the rule were present but overridden, or present but irrelevant, and it hard-codes one implementation of the requirement. Measuring min-content asserts the *effect*, which is what the contract actually promises.

**Was measuring in place rather than on a clone the right call?** Yes, and the author's stated reason is verifiable: `.st-toast` is styled through the descendant selector `.st-toast-region .st-toast` (`ToastRegion.astro:53`), so a clone in a bare wrapper loses the declaration and measures identically with and without it — a guard that cannot fail. The author reports hitting exactly this and says so in the comment (`:319-321`). Measuring in place costs a save/restore of the `style` attribute, which the code does correctly (`:347`, `:355-356`), including removing the attribute when there was none.

**`fb0ac86` (hyphenation off) is a real correctness fix, not cosmetics.** `.st-empty__title` carries `hyphens: auto` (`EmptyState.astro:69`). Without forcing `hyphens: manual` during measurement, Chromium — which has a dictionary for this page's language — could hyphenate its way under the tolerance while WebKit on Windows, which has none, could not. That is precisely the "passes in one engine, fails in the other" trap the package documents at `docs/design-system.md:387`, and the commit closes it.

**Should the fifth entry (`.st-empty__title`) have been shipped?** Yes, keep it, and the honesty is correctly handled. My case 5a confirms the author's disclosure: the entry cannot fail on its own, because `base.css:166-173` supplies the same value to the same element and the two rules deliberately mask each other. But the entry is not dead weight:

- it guarantees the *effect* survives regardless of which rule delivers it, which is what a page package actually depends on (case 5b proves it fails when the effect is genuinely gone);
- the `expect(item.short).toBeGreaterThan(-1)` assertion at `:372-374` means renaming or deleting `.st-empty__title` fails the test rather than silently measuring nothing;
- `docs/design-system.md:394` lists five selectors, so dropping the entry would put the contract and the test out of sync.

Deleting it to keep a "every entry can fail alone" invariant would trade a real guarantee for a tidier story. Documenting exactly what it does and does not prove — which the author does, at `design-system.spec.ts:68-79` — is the better call, and is the behaviour the review protocol should want to see.

## Severity judgement: the capped-track blindness

The author reports that reverting each `minmax(0, 1fr)` cap to `auto` leaves the document at 320/320 in both engines for **all 14** capped selectors, did not fix it, and recorded it at `design-system.spec.ts:246-249` and `docs/design-system.md:394`.

I verified this myself rather than accepting it.

- There are exactly 14 single-column `grid-template-columns: minmax(0, 1fr)` declarations (`EmptyState.astro:39`, `SectionHeader.astro:120`, `utilities.css:104`, and 11 in `design-system.astro`).
- I replaced **all 14 at once** with `auto`. The 320px reflow tests, the long-Afrikaans-label test and the per-component min-content test all stayed **green** in both engines — but the "long URL in a section header lead is wrapped, not clipped" test went **red** in both.
- Isolating it: reverting **only** `SectionHeader.astro:120` turns that test red in both engines, with a named diff (`header right edge 304px`, text runs at `right=361`, `358`, `368`).
- Reverting the **other 13 together** left every page-level test green in both engines (16 passed). Since they are collectively invisible, each is individually invisible.

**So the claim is right for 13 of the 14 and wrong for one.** `.st-section-header__inner`'s cap is genuinely guarded, by the clip test pass 4 asked for. That is recorded as minor 2 below.

**Severity of the remaining 13-cap blindness: minor. Acceptable as documented; move to `docs/reviews/backlog.md`.**

Reasoning:

- **Nothing user-facing is wrong.** Both mechanisms are present and both are correct. They are redundant at page level *by design* — that is the stated intent at `base.css:159-160` ("This is a safety net, not the mechanism") and in the do/don't table. Redundancy that cannot be observed from outside is the normal signature of defence in depth, not of a defect.
- **No acceptance item requires a per-cap guard.** B4, B5 and B7 require the reflow behaviour, which is guarded; the contribution checklist (item 9) requires adding a component to the long-label injection and to `SHRINK_WRAPPED`, both of which are satisfied. There is no "each house rule must have its own mutation test" requirement to breach.
- **The author's technical argument is correct**, and I checked it. With `overflow-wrap: anywhere` on `h1`–`h6` globally and on each shrink-wrapped component, no *text* can demonstrate a missing cap: `anywhere` breaks anything text-based, so the cap has nothing left to do. A per-container guard needs an intrinsically unbreakable, non-text child (a fixed-width element, a `<pre>` with `nowrap`, an SVG with an intrinsic width) injected into each track. That is a new test surface with its own design questions, not a minor fix — and it would assert against injected content that no page actually renders, so its own value needs arguing before it is built.
- **It is disclosed in both the right places** — the spec beside the test and the contract document — so the next package is not misled into thinking the caps are covered.

It would be a major if the caps were the *only* thing standing between a real string and a sideways-scrolling page. They are not: for every shrink-wrapped component the min-content declaration is independently guarded and proven to fail (the table above), and for block-level content in a capped track the global `break-word` is sufficient. The blindness costs future maintainers a tidy-up risk, which is what `backlog.md` is for.

Suggested backlog entry: *"WP-11: 13 of the 14 `minmax(0, 1fr)` caps have no test that fails when they are removed, because the min-content declarations mask them at page level. A guard needs an intrinsically unbreakable non-text child injected per track. `.st-section-header__inner` is already covered by the section-header clip test."*

## Reflow and accessibility audit (mine, not a re-run of the author's)

At 320×800 I injected the real `af.json` / Afrikaans-markdown strings the page itself declares (`design-system.astro:170-182`) plus three unbreakable compounds (`Maatskappyregistrasienommer`, `voorlopigebelastingbetalers`, `eenpersoonsondernemings`) into **every** text node on the page — 391 of them, not a selector list — excluding only content that is nowrap by contract (`code`, `pre`, `.st-kbd`, token names, swatch values, the contrast table's own result cells). Then `scrollWidth`, every element past the viewport, and every text run cut off by an `overflow: hidden`/`clip` ancestor.

| engine | page | mode | scrollWidth | clientWidth | past viewport | clipped text |
|---|---|---|---|---|---|---|
| chromium | `/` | 320×800 stressed | 320 | 320 | 0 | 0 |
| chromium | `/` | 200% root @640 | 640 | 640 | 0 | 0 |
| chromium | `/` | 200% root @1280 | 1280 | 1280 | 0 | 0 |
| chromium | `/design-system/` | 320×800 stressed (391 nodes) | 320 | 320 | 0 | 0 real |
| chromium | `/design-system/` | 200% root @640 | 640 | 640 | 0 | 0 |
| chromium | `/design-system/` | 200% root @1280 | 1280 | 1280 | 0 | 0 |
| webkit | `/` | 320×800 stressed | 320 | 320 | 0 | 0 |
| webkit | `/` | 200% root @640 | 640 | 640 | 0 | 0 |
| webkit | `/` | 200% root @1280 | 1280 | 1280 | 0 | 0 |
| webkit | `/design-system/` | 320×800 stressed (391 nodes) | **414** | 320 | 0 | 0 real |
| webkit | `/design-system/` | 200% root @640 | 640 | 640 | 0 | 0 |
| webkit | `/design-system/` | 200% root @1280 | 1280 | 1280 | 0 | 0 |

Unstressed baseline is 320/320 in both engines on both pages.

Two entries need explaining, and I chased both to ground rather than reporting the raw number.

- **"0 real" clipped text.** My sweep reported five hits in both engines, all inside a `thead` whose box is 1px wide. That is the stacked wide table's column header under 640px, hidden with the standard visually-hidden pattern (`TableScroll.astro:95-102`: `position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%)`). The header stays available to assistive technology and the visual labels come from `data-label`. False positive of my detector, not a defect. No other clipped text anywhere, which confirms pass 4's `SectionHeader` clip finding stays fixed under a much broader injection than the author's.
- **webkit 414.** Real: `window.scrollTo(9999, 0)` leaves `scrollX` at 94, so the page genuinely scrolls sideways. Bisected to a single `<option>` — see minor 1. It is not reachable by any element or text run overflowing its box (my uncontained-overflow sweep returns 0 in both engines); it is WebKit leaking a `<select>`'s option width into document scrollable overflow. Chromium is unaffected.

Wider B5 lens, `/design-system/`, both engines:

| Check | Result |
|---|---|
| Landmarks | `header`, `main`, `nav "On this page"`, `footer`; 10 `role="note"` callouts, each named via `aria-labelledby`; one `role="status"` named "Example notifications" |
| Heading outline | one `h1`, zero level jumps |
| Accessible names | 0 unnamed links, buttons, inputs, selects, textareas or summaries |
| Underlined links | 0 bare links outside cards, topbar, TOC and buttons |
| Focus order | 40 stops (chromium) / 28 (webkit); 0 stops out of visual order |
| Visible focus | 0 stops without a visible indicator in either engine. (My first sweep flagged three WebKit inputs; on inspection they carry their own `outline: solid 2px rgb(181, 86, 26)` — my sweep was reading only the label's outline. No finding.) |
| Target size | 0 sub-44px stand-alone targets at 320px and 375px in both engines, with the two documented exemptions applied (inline links in sentences; `.st-card__link`, whose `::after` makes the card the target) |
| Forced colours | contrast panel pauses rather than reporting 76 failures; selected theme segment differs by fill *and* text colour, not border alone (chromium; Playwright emulates nowhere else) |
| Reduced motion | `--st-duration-fast/base` 0s, `--st-lift` 0px, spinner `animation-name: none` in both engines |
| Print | light palette forced (`--st-bg` resolves to `#fbf8f3` under `media: print` even with dark active); 0 visible `.st-btn`, `body > header`, `body > footer`, skip link or toast region |
| Contrast | tokens only; 0 literal colours outside `tokens.css` (Stylelint), `CONTRAST_PAIRS` green in the unit test and in the live panel in both themes, rendered-text e2e check green |

## Findings

### minor 1: a long `<select>` option scrolls the page sideways in WebKit at phone widths, and `<select>` is missing from the wrapping contract
File: `src/styles/base.css:408-417` (the `input`/`select`/`textarea` rule); contract gap at `docs/design-system.md:376-398` ("Wrapping and min-content") and `:333-340` ("Known limits")
Acceptance item: B5 "reflow at 320px (only table regions scroll)"; B7 `docs/design-system.md` as the contract every page package follows.

What is wrong: in WebKit, an `<option>` label longer than about 39 characters leaks its intrinsic width into the **document's** scrollable overflow at 320px and 375px, even though the `<select>` box itself stays correctly clamped at 288px and nothing overflows its own box. Measured at 320px with `Kernverpligtinge vir alle eenpersoonsondernemings` (48 characters, a real Afrikaans heading from the toolkit) in one option of the Form controls demo: `documentElement.scrollWidth` 414, `window.scrollX` reaches 94 — the page really scrolls. Chromium is 320 throughout. `<input>` and `<textarea>` with the same string are unaffected in both engines, and at 768px the effect is gone.

Nothing on `/design-system/` fails today: its options are "Food", "Retail and online", "Services and trades". The risk is the next package. The wizard, the templates form and the search facets will all render `<select>`s from `af.json`, and the contract that tells them how to survive a long Afrikaans string lists buttons, stand-alone links, toasts, badges and headings, but not `<select>`.

This also resists the fixes the contract teaches. I tested `min-inline-size: 0`, `max-inline-size: 100%`, `overflow: hidden` and `text-overflow: ellipsis` on the select itself: **none** changes the number. The only thing that contains it is `overflow: hidden` on an ancestor — which would clip the select's focus ring, so it is not a good recommendation either.

Caveat I cannot resolve here: this is Playwright's WebKit on Windows, which draws a non-native `<select>`. Real Safari on macOS and iOS may differ, exactly as the package already notes for the Fraunces weight artifact (`docs/design-system.md:340`). That is an argument for documenting it with the same "confirm on real Safari" framing, not for ignoring it — the target audience is on phones, and iOS Safari is WebKit.

How to reproduce: with the preview on 5491, `node scratchpad/diag9.mjs` and `node scratchpad/diag10.mjs`.

Suggested fix (docs only): add a row to the "Wrapping and min-content" table — `<select>`: *"WebKit adds a long option's intrinsic width to the document's scrollable overflow at phone widths, whatever CSS the select carries. Keep option labels short (under ~35 characters in Afrikaans); for long choices use radios or a `<datalist>`-backed input. Confirm on real Safari."* — and a "Known limits" entry. Optionally add the Form controls `<select>` to the long-label injection with a realistic longest option, so the budget is visible rather than folklore.

### minor 2: the "all 14 caps" claim is wrong for one of the fourteen, in both the spec and the contract
File: `tests/e2e/design-system.spec.ts:246-248`; `docs/design-system.md:394`
Acceptance item: B7 (`docs/design-system.md` is the contract page packages follow); D4 review protocol accuracy of a disclosed limitation.

What is wrong: the spec comment says *"reverting any one `minmax(0, 1fr)` cap on its own does too"* and the contract says *"deleting one of these declarations — or one `minmax(0, 1fr)` cap — leaves the document at 320px"*. That is true for 13 of the 14 caps but false for `SectionHeader.astro:120`, which the "a long URL in a section header lead is wrapped, not clipped" test catches on its own, in both engines. Both statements were written before that test's coverage was re-checked against the cap list.

The error is in the conservative direction — it claims less coverage than exists — so nobody is misled into an unsafe change. It still matters: the contract is the deliverable, a future reader who tests the claim will find it does not hold, and the backlog item's scope is 13 caps, not 14.

How to reproduce: replace `minmax(0, 1fr)` with `auto` in `src/components/ui/SectionHeader.astro:120` only, `pnpm build`, then `-g "long URL in a section header"` → red in chromium and webkit with `header right edge 304px` and three text runs at 358–368px.

Suggested fix: change both sentences to "13 of the 14 caps", and note that `.st-section-header__inner` is covered by the clip test.

### minor 3: 13 of the 14 capped tracks have no test that fails when the cap is removed
File: `src/styles/utilities.css:104`, `src/components/ui/EmptyState.astro:39`, and 11 declarations in `src/pages/design-system.astro`
Acceptance item: general quality / D4 "missing required test" — see the [severity judgement](#severity-judgement-the-capped-track-blindness) for why this is minor and not major.

What is wrong: removing all 13 at once leaves every page-level test green in both engines, so each is individually unguarded. Verified, not assumed.

Suggested fix: **accept as documented and move to `docs/reviews/backlog.md`** with the wording proposed above. Do not block the merge on it.

### nit 1: `pnpm test:e2e` and `pnpm test:a11y` exit 1, so `pnpm gate` is red — pre-existing, not WP-11's
File: `playwright.config.ts:44-53` (projects `nojs` and `a11y`); `package.json` scripts `test:e2e`, `test:a11y`, `gate`
Acceptance item: E1 automated gate.

What is wrong: `pnpm test:e2e` includes `--project nojs` and `pnpm test:a11y` runs `--project a11y`; no `*.nojs.spec.ts` or `*.a11y.spec.ts` exists, so Playwright exits 1 with "No tests found" and `pnpm gate` fails at its seventh line.

**This is not introduced by WP-11.** `playwright.config.ts` is byte-identical to the base commit, those projects came from the scaffold (`51e9c01`), and at `f81a1f8` `tests/e2e/` held only `smoke.spec.ts` — so the same two commands failed before this branch existed. `pnpm gate:fast`, which is the command CLAUDE.md tells authors to run, is green. Recorded so the orchestrator knows before wiring CI, not as something WP-11 must fix. The nojs and a11y suites belong to the pages packages (`docs/design-system.md:339`).

Suggested fix (orchestrator, or the first pages package): add `--passWithNoTests` equivalents, or defer those projects until their specs land.

## Pass-5 verification

| Pass-5 finding | Status | Evidence |
|---|---|---|
| **minor 1** two of the four reflow declarations are no longer covered by any failing test (`.st-btn__label`, `.st-toast`) | **Resolved, and better than either suggested fix** | New per-component min-content test (`design-system.spec.ts:327-380`). I deleted each of the four declarations from the real source and rebuilt: all four go red in chromium *and* webkit (table above), including the two pass 5 named. Both of pass 5's suggested approaches were rejected with reasons I independently agree with |
| **nit 1** `stripMarkup`'s docstring does not describe what the code does | **Resolved, and the behaviour is right to keep** | `ae2973b` corrects the docstring to "Drop every tag — do not replace it with a space" (`forbidden-strings.test.ts:96`) and adds the split-amount case to the mutation self-test (`:177-181`). I verified the author's argument against the real patterns: `GAP` is `[\s\u00a0,.]?`, which allows **at most one** separator, so pushing a space would turn `R 1 000 <em>000</em>` into `R 1 000  000` and the rule would stop matching. Dropping is correct; the docstring now also warns the next rule-writer that a tag boundary is not a word boundary (`:106-110`) |

Regression check against passes 1–4: none found. I re-verified the two pass-4 majors independently rather than trusting pass 5 — the reflow major through my own 391-node injection (clean in both engines apart from minor 1), and the stale-VAT major by checking the rendered figures against the source register myself (below). I spot-checked the pass-2/3 items that pass 5 re-verified: zero literal colours outside `tokens.css` (Stylelint green), zero inline `<script>` on both pages, CSP byte-identical to plan C4 and before the first script, forced-colours panel pauses, stacked-table semantics intact, `PW_DS_TIMEOUT` still configurable at `design-system.spec.ts:32`.

## D5 readiness

**Does anything on the rendered page imply more certainty than its source supports?** No. I checked the numbers against the source rather than against pass 5.

- The dated-fact demo states `R 2 300 000` and "This threshold changed on 1 April 2026" (`design-system.astro:1085`). The register says *"compulsory VAT registration threshold rose from R1 million to R2.3 million on 1 April 2026"* (`docs/rsa-business-toolkit/05 Look it up/03-sources-and-verification-register.md:64`, corroborated at `:60`). Match.
- The demo's checked date is `13 September 2026` (`:200`). The register's own line 5 reads "All sources were checked on 13 September 2026." Match — the demo does not invent a verification date.
- The English notice body (`:204`) is D5's required sentence verbatim, including "No person has checked it yet" and "Not legal, tax or financial advice".
- `{reviewer}` is left as a literal placeholder, with the reason commented at `:194-196`: a screenshot must not read as a claim that a person checked the page. Correct D5 judgement, and pass 4's fictional-reviewer nit stays fixed (`git grep Thandi` → no hits).
- Verification status uses the neutral `status` badge and never the `official` variant; officialness keeps `official`. Proven by e2e (`:433-446`) and by my own read of the rendered variants. Status, its explanation sentence and the "How this was made" link all sit together in the notice, as D5 requires.
- The forbidden-string guard now scans hand-written source, which the pipeline's own check cannot see, and its mutation self-test proves it fires on the claim *as authored*, across a line break and through markup.

**Is `docs/design-system.md` a contract a page package could follow without rediscovering these bugs?** Yes, with one gap.

It is unusually good for this purpose: the "Wrapping and min-content" table separates the two mechanisms that everyone confuses and names, for each, what it does *not* do; it records the measured before-numbers for six components in both engines; it states plainly that `hyphens: auto`, `min-inline-size: 0` and percentage `max-inline-size` must never be relied on; contribution checklist item 9 tells a new component's author to test at 320px with a 38-character label **and** a 27-character compound in **both** engines, and to add the selector to `SHRINK_WRAPPED` if the box is shrink-wrapped. The D5 section is equally direct — "A number in a demo is a number that ships", and the three things that must never be colour-only, with the print and forced-colours reasons spelled out. A page package following it would not rediscover any of passes 1–5's findings.

The gap is minor 1: `<select>` is the one shrink-wrapped, text-bearing control the table does not cover, and it is the one where every fix the document teaches fails. Fixing that is a docs edit. Minor 2 is a one-line accuracy correction in the same file.

Applying the author's own checklist item 9 to the author's own `<select>` demo is how I found minor 1 — which is the strongest thing I can say about the contract: it is good enough that following it finds the things it does not yet say.

## Conclusion

Zero blockers, zero majors. Pass 5 was clean, the round since was minor-only and is verified fixed, and this pass is clean, so under `docs/reviews/README.md` the package is **mergeable**.

I looked hard for a reason not to say that, re-derived every load-bearing claim from measurement rather than from the handover, and found one real defect the package does not cover (`<select>` in WebKit) and one inaccurate sentence about its own coverage. Neither blocks the merge; both are docs-level. The three minors and the nit should go to `docs/reviews/backlog.md` or be fixed in a follow-up commit, verified by the post-merge review of `main` per the 17 September amendment.
