# WP-11 Stoep design system: review pass 4 (Reviewer O)

- Reviewer: REVIEWER-O (accessibility, visual quality and UX, performance, code quality). Did not review this package before; reviewed the whole diff, then read passes 2 and 3 only after drafting findings.
- Worktree: `.claude/worktrees/agent-a2273231b664d89f3`, branch `worktree-agent-a2273231b664d89f3`.
- Commit reviewed: `0cabe11` (base `f81a1f8`). Whole diff: 40 files, +7237/−13. Latest round: `8710091..0cabe11`, 17 files, +1044/−117. Worktree left unedited.
- Date: 2026-09-17
- Scratch evidence: `%TEMP%\claude\C---Projects-Local-business-toolkit\2d511423-486a-4dd5-8e3b-fab6857854dc\scratchpad\wp11-pass4\` (below: `scratch/`). Scripts `reflow.mjs`, `targeted.mjs`, `real.mjs`, `shots.mjs`, `crop.mjs`, `hyph.mjs`, `cmp.mjs`, `a11y.mjs`, `misc.mjs`, `print.mjs`; raw output `reflow.txt`, `reflow-results.json`, `targeted.txt`; 100+ screenshots in `scratch/shots/` and `scratch/crops/`.

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 2 |
| minor | 7 |
| nit | 5 |

The package is in good shape. Every gate is green, the pass-3 major (badge reflow) is genuinely fixed, and all nine pass-3 minors and all five nits are resolved. The tokens, contrast work, forced-colours handling, print rules, keyboard behaviour and focus treatment are all better than the plan asks for.

Two things stop this pass being clean.

1. The min-content class of bug the pass-3 round set out to close is **still open in `Button`** (and in `.st-link-block` and `.st-toast`). A single long Afrikaans word in a button label makes the page scroll sideways at 320px in both engines — 343px with a real word from `src/i18n/af.json`, 362px with a 27-character compound. `EmptyState` was fixed; the button inside its own `actions` slot was not. The new e2e guard cannot see it, because it injects a label that contains spaces.
2. The new D5 demo presents **the stale VAT threshold** ("You must register for VAT once your turnover passes R 1 000 000 in any 12 months") carrying an "AI-checked 12 September 2026" badge and a SARS link. That is the exact fact the toolkit's own content warns about ("If a website tells you the VAT threshold is R1 million, that site is out of date" — `docs/rsa-business-toolkit/README.md:41`; the real figure is R2.3 million from 1 April 2026), it is the string the plan's forbidden-string test exists to catch, and it sits on the page every page package is told to copy.

Both fixes are small.

## Commands and output tails

Run by the reviewer in the author worktree at HEAD `0cabe11`.

```
== pnpm lint
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
EXIT=0

== pnpm typecheck
$ astro check
18:25:52 [check] Getting diagnostics for Astro files in ...
Result (43 files):
- 0 errors
- 0 warnings
- 0 hints
EXIT=0

== pnpm test
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  2 passed (2)
      Tests  183 passed (183)
   Duration  14.75s
EXIT=0

== pnpm build
[WARN] [astro-icon] Failed to load icons from "src/icons": ENOENT ... (pre-existing)
  ├─ /design-system/index.html (+71ms)
  ├─ /index.html (+17ms)
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 2 page(s) built in 3.20s
[build] Complete!
EXIT=0
```

Built HTML (`node` scan of every `dist/**/*.html`):

```
dist\design-system\index.html   scripts: 4   inline (no src): 0   CSP before first script: true
dist\index.html                 scripts: 2   inline (no src): 0   CSP before first script: true
CSP (both): default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
            font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'
referrer (both): strict-origin-when-cross-origin
/ : 1 inline <style>, 1 stylesheet link   |   /design-system/ : 0 inline <style>, 2 stylesheet links
```

**Zero inline `<script>` on either page**, and the CSP is byte-identical to plan C4 and precedes the first script. The pass-3 CSS-inlining minor is fixed: `/` inlines its 232 B of scoped page CSS again while scripts stay external.

Asset sizes (`dist/_astro`, raw): `stoep.rYWzmf5b.css` 21,375 · `design-system@_@astro.DA9vkfMq.css` 29,254 · scripts `theme-init` 1,209 + `page` (prefetch) 2,487 + `TableScroll` 892 + design-system page 7,068 = **11,656 raw** (budget 60 KB) · fonts 97 KB preloaded (167 KB on the specimen page). Only the token chunk is named `stoep.*` — the pass-3 naming nit is fixed.

Playwright, preview on **127.0.0.1:5491**, one project at a time, `--workers=1`; port confirmed free before each run (`port5491:000`).

```
===== chromium (tests/e2e/design-system.spec.ts tests/e2e/smoke.spec.ts)
  ok 28 [chromium] › tests\e2e\smoke.spec.ts:3:1 › home page renders under the base path (8.6s)
  28 passed (5.6m)

===== webkit
  -  11 [webkit] › forced colours: the contrast panel pauses ... (skipped, chromium-only)
  -  12 [webkit] › forced colours: the selected theme segment ... (skipped, chromium-only)
  ok 28 [webkit] › tests\e2e\smoke.spec.ts:3:1 › home page renders under the base path (3.3s)
  2 skipped
  26 passed (2.4m)

===== mobile (Pixel 7)
  ok 28 [mobile] › tests\e2e\smoke.spec.ts:3:1 › home page renders under the base path (10.6s)
  28 passed (5.8m)
```

The author's reported results reproduce exactly (28 / 26+2 / 28).

## Reflow audit (primary task)

Method: preview at 127.0.0.1:5491, viewport 320×800, Chromium and WebKit. For each of 40 text-bearing selector groups on `/design-system/`, the first text node of every match was replaced with (a) the longest real Afrikaans status label `"Masjienvertaling, nog nie nagegaan nie"`, (b) `"eenpersoonsondernemings"` (23), (c) `"voorlopigebelastingbetalers"` (27); then `document.documentElement.scrollWidth`, every element whose right edge passed the viewport, and every text node clipped by an `overflow: hidden` ancestor were recorded (`scratch/reflow.mjs`, `scratch/reflow.txt`). A second pass used realistic strings taken from `src/i18n/af.json` in the main checkout (`scratch/real.mjs`) and long URLs/code paths (`scratch/targeted.mjs`).

**As shipped, both pages are clean: `scrollWidth === clientWidth === 320` in both engines, and 640/1280 at 200% root font size are clean too.**

Injected results (identical in Chromium and WebKit unless noted):

| Injected into | String | scrollWidth @320 | Verdict |
|---|---|---|---|
| every badge, callout label, card title, effort value, `thead th`, table body cell, caption, hint, form label, legend, checkbox row, TOC link, card eyebrow/summary/meta, section-header title and eyebrow, empty title/body, toast text, illustration caption, topbar tag, `mark` | all three strings | **320** | pass |
| `.st-btn__label` | `eenpersoonsondernemings` / `voorlopigebelastingbetalers` | **358 / 362** | **fail (major 1)** |
| `.st-empty` action button | `Maatskappyregistrasienommer` (real `af.json` string, 27 ch) | **343** | **fail (major 1)** |
| `a.st-link-block` (D5 source titles, AI-notice link) | 27-char compound / 37-char compound | 327 / **337** | fail (major 1) |
| `.st-toast span` | `Maatskappyregistrasienommer gekopieer` | **327** | fail (major 1) |
| `.ds-segmented__option` label (page-local) | 23–27-char compound | 359 / 360 | fail (page demo, folded into major 1) |
| `.ds-type` specimen paragraphs (`.st-display`, `.ds-type__h1/2/3`) | 23–27-char compound | **473 / 485** | minor 4 (page grid without `minmax(0,1fr)`) |
| `.ds-spacing li` token-name column (`nowrap` by design) | any | 408–538 | not a defect (token names, documented `nowrap`) |
| `.st-kbd` (documented `nowrap`) | 38-char label | 346 | not a defect (docs: "Do not put a sentence in a `Kbd`") |
| SectionHeader lead with a long URL or `code` path | `https://www.sars.gov.za/types-of-tax/value-added-tax/vat-registration/` | 320, but text **clipped** at 302/309 px against a 291 px header edge | minor 2 (silent content loss) |
| Callout body, plain-words body, card summary, empty body, source hint | same URL | 320 | pass |
| Real `af.json` strings in AI-notice link, source link, `lg` button, toast | `Privaatheidskennisgewing`, `Laatbetalingsvoorwaardes`, `Maatskappyregistrasienommer` | 320 (except the empty-state button, above) | pass |

200% text zoom: `640 baseline`, `640 + root font-size 200%` and `1280 + 200%` all measure `scrollWidth === clientWidth`, with no element or text node outside the viewport, in both engines (`scratch/targeted.txt`). (`320 + 200%`, i.e. 800% effective, does overflow to 626px; that is well past WCAG's 400% requirement and is not a finding.)

Widest measured `scrollWidth` at 320px: **485px** (type-specimen paragraph, page-only, minor 4); worst for a shared component: **362px** (`Button`).

## Findings

### Accessibility

### major: `Button`, `.st-link-block` and `.st-toast` still widen the page at 320px — the same min-content bug `EmptyState` was just fixed for
File: src/components/ui/Button.astro:269 (`.st-btn__label`), src/styles/utilities.css:33 (`.st-link-block`), src/components/ui/ToastRegion.astro:53 (`.st-toast`)
Acceptance item: B5 "rem units and reflow at 320px (only table regions scroll)" (WCAG 1.4.10); B7/i18n "+25% string length"; docs/design-system.md:351 "Let a badge, a callout label or a button label wrap", :399 "check the component again at 320px with a 38-character Afrikaans label"
What is wrong: `min-inline-size: 0` lets a flex item *shrink*, but it does not lower the item's **min-content contribution**, which is what sizes the button inside `.st-cluster`, `.st-empty` or any grid. So one unbreakable word still pushes the button — and the page — past the viewport. `.st-link-block` and `.st-toast` have the same shape (an inline-flex box whose text is an anonymous flex item with `min-width: auto`). Measured at 320px, both engines: `.st-btn__label` = "eenpersoonsondernemings" → 358, "voorlopigebelastingbetalers" → 362; **a real dictionary string** (`templates.fields.registrationNumber` = "Maatskappyregistrasienommer") in the `EmptyState` actions button → **343**; `.st-toast` with "Maatskappyregistrasienommer gekopieer" → 327; `.st-link-block` with a 37-character compound → 337. The two `<a class="st-btn">` variants overflow as well (right edge 332/336).
The e2e guard added in this round cannot catch it: it injects `"Masjienvertaling, nog nie nagegaan nie"`, whose longest token is 16 characters, into `.st-btn__label`, so buttons pass on a string that has spaces to break at. The unbreakable compound is injected only into `.st-section-header__title` and `.st-empty__title`.
How to reproduce: with the preview on 5491, `node scratch/reflow.mjs` (see the `button label` rows), or in DevTools at 320px on `/design-system/`:
`document.querySelector('.st-empty .st-btn__label').textContent = 'Maatskappyregistrasienommer'; document.documentElement.scrollWidth` → 343.
Suggested fix: add `overflow-wrap: anywhere` (or `break-word` plus `min-inline-size: 0` on the flex *container*) to `.st-btn__label`, wrap `.st-link-block` text in a span with the same rule, and give `.st-toast` a text wrapper; then extend the e2e long-label injection to use an unbreakable compound for `.st-btn__label`, `a.st-link-block` and `.st-toast span` as well as the two title selectors.

### Content and D5

### major: the D5 "dated fact" demo publishes the stale R1 million VAT threshold as an AI-checked fact
File: src/pages/design-system.astro:1066-1075
Acceptance item: plan D5 ("Facts are shown with their date"; "Nothing implies more certainty than the source"), ADR 0006 §4; plan A/C6 forbidden strings (`R1 million … VAT`)
What is wrong: the demo reads "You must register for VAT once your turnover passes **R 1 000 000** in any 12 months." followed by `Badge variant="official" icon="lucide:calendar-check"` reading "AI-checked 12 September 2026" and a link to sars.gov.za. The toolkit's own content says the compulsory threshold rose to **R2.3 million on 1 April 2026** and that any site quoting R1 million is out of date (`docs/rsa-business-toolkit/README.md:37,41`, `05 Look it up/03-sources-and-verification-register.md:64`). The page is built and deployed (noindex only), and `docs/design-system.md:258` tells every page package to copy this section, so a wrong number ships wearing the verification badge the plan invented to prevent exactly that. The forbidden-string test in `content:check` only scans generated content JSON, so nothing guards demo copy.
How to reproduce: open `/design-system/#notices`, "Dated facts and unconfirmed facts"; compare with `docs/rsa-business-toolkit/README.md:37`.
Suggested fix: change the demo to the current figure ("R 2 300 000", checked date from the register) or use an obviously non-factual placeholder; optionally extend the forbidden-string check to `src/pages/**`.

### minor: `SectionHeader` silently clips lead content that does not fit, and `scrollWidth` tests cannot see it
File: src/components/ui/SectionHeader.astro:39-48 (`overflow: hidden`) and :102-107 (`.st-section-header__inner` is a grid with an implicit `auto` track)
Acceptance item: B5 reflow (WCAG 1.4.10 forbids loss of content), and the package's own i18n rule "Grid containers that hold text need `minmax(0, 1fr)`" (docs/design-system.md:361)
What is wrong: the inner grid track sizes to its children's min-content, and the header clips. A lead paragraph containing a long URL or a file path therefore disappears off the right edge with no scrollbar and no page-level overflow: text right edge 302px (Chromium) / 309px (WebKit) against a 291px header, and 400px for a long `code` path. Headings escape this only because of the new site-wide `overflow-wrap: anywhere`; the eyebrow, lead text and inline `code` do not.
How to reproduce: `node scratch/targeted.mjs` rows "SectionHeader lead: long URL text" and "long code path" (`clipped=[...]`, `sw=320`).
Suggested fix: `grid-template-columns: minmax(0, 1fr)` on `.st-section-header__inner` (the same cap `.ds-page` uses), and move `overflow: hidden` from the header onto `.st-section-header__pattern`, which is the only thing that needs clipping.

### minor: the site-wide `h1–h6 { overflow-wrap: anywhere }` rule breaks headings before punctuation, and is undocumented
File: src/styles/base.css:158-165; docs/design-system.md (Typography, i18n)
Acceptance item: B7 "docs/design-system.md (… type …, i18n rules)"; general visual quality
What is wrong: `anywhere` creates a soft-wrap opportunity at *every* character, including before punctuation, so an ordinary English heading now breaks with the comma orphaned on the next line. Measured, identical in Chromium and WebKit at 320px on `.st-section-header__title`:

| `overflow-wrap` | Line breaks for "Responsibilities, registrations and recordkeeping" |
|---|---|
| `anywhere` (current) | `Responsibilities` / `, registrations` / `and` / `recordkeeping` |
| `break-word` | `Responsibilities,` / `registrations` / `and` / `recordkeeping` |

Rendering inside a heading is otherwise unchanged (`break-word` already breaks a too-long word at render time); the only thing `anywhere` adds is the lower min-content width, which is needed **only** where a heading sits in an uncapped grid or flex track. The rule also lands on every future page's headings without being recorded anywhere: neither `overflow-wrap: anywhere` on headings nor `EmptyState`'s `hyphens: auto` / `min-inline-size: 0` appear in `docs/design-system.md`, although that file is the stated contract and has a "Contribution checklist". Related: `hyphens: auto` works only in Chromium here — WebKit has no Afrikaans (or English) pattern set on Windows and breaks mid-word ("voorlopigebelasting|betalers", `scratch/crops/hyph-webkit-empty1.png` vs `hyph-chromium-empty1.png`), so the hyphens are a progressive enhancement, not the mechanism.
How to reproduce: `node scratch/cmp.mjs`.
Suggested fix: keep `break-word` for headings and cap the containers instead (`minmax(0, 1fr)` / `min-inline-size: 0`), which is the fix `EmptyState`, `.ds-page` and `.ds-section` already use; if the global rule stays, document it and its punctuation behaviour in `docs/design-system.md`.

### minor: page grids other than `.ds-page` and `.ds-section` still have the pass-3 min-content bug
File: src/pages/design-system.astro (`.ds-type`, `.ds-theme`, `.ds-form`, `.ds-swatch-group`, `.ds-illustration`, `div.ds-demo:not(...) { display: grid }`)
Acceptance item: as pass 3 minor V1
What is wrong: the pass-3 fix capped the two outer grids but not the inner ones. Injecting a 27-character compound into the type-specimen paragraphs widens the page to **485px** in both engines (`.st-display` and `.ds-type__h1/2/3` are `<p>`, so the new heading rule does not reach them). The page's own content is fixed, so this is minor, but the page is the template page packages copy, and `docs/design-system.md:361` claims the cap is the house rule.
How to reproduce: `node scratch/reflow.mjs`, rows `paragraph p (all)`.
Suggested fix: `grid-template-columns: minmax(0, 1fr)` on the remaining `display: grid` blocks in the page style, or a single rule for `.ds-section :is(...)`.

### minor: the swatch group title still advertises a flat tint strength
File: src/pages/design-system.astro:83
What is wrong: the live reference reads "Section tints (hue over page background: **18% light, 22% dark**)", but `tokens.css` now uses per-hue strengths (light: paperwork 14%, types 12%; dark: start 26%, branding 16%, paperwork 28%). `docs/design-system.md` has the correct table, so the page — the thing a designer will trust — is the only wrong copy.
Suggested fix: retitle to "Section tints (per-hue strength; see docs)" or render the strength per swatch.

### minor: the "Sources for this page" note renders two stand-alone links as 40px targets and calls them inline
File: src/pages/design-system.astro:1053-1060; docs/design-system.md:281
Acceptance item: B5 "target size AAA adopted" (44px)
What is wrong: the no-sources note is "This page has no sources of its own. *See the full sources register* · *See how this guide was made*" — two link phrases separated by a middot, not a sentence with an inline link. Measured 254×40 and 237×40 at 320px. The docs justify them as "an inline link in a sentence, so it is exempt from the 44px rule", and the e2e target test exempts any `<a>` whose parent holds other text, so nothing would catch a regression here either.
How to reproduce: `node scratch/a11y.mjs` → `SMALL TARGETS @320`.
Suggested fix: make them `.st-link-block` (or stack them), or write the note as one real sentence with the links embedded.

### minor: the AI-checked status badge is visually identical to the "Official source" badge
File: src/pages/design-system.astro:920-930, 957-966; docs/design-system.md:265
Acceptance item: D5 "Nothing implies more certainty than the source"; ADR 0006 §5
What is wrong: the documented recipe uses `Badge variant="official"` for the verification status, so "AI-checked" and "Checked by {reviewer}" render in exactly the same info-teal chip as "Official source" in the sources list two sections below (`scratch/crops/chromium-375-light-notices-0.png` and `-2.png`). The icon and the words differ, which satisfies 1.4.1, but at a glance the page teaches that an AI check and an official source carry the same weight — the one conflation ADR 0006 was written to avoid. In forced colours both collapse to the same bordered chip, so only the words remain.
Suggested fix: use a neutral variant (`effort`, surface-2) for verification status and keep the info/official tint for officialness, and say why in `docs/design-system.md`; no new colour is needed.

### minor: in the D5 source pattern the external-link icon detaches from wrapped link text
File: src/pages/design-system.astro:987-1050 (`.ds-source__title a.st-link-block` with an inline `Icon`)
What is wrong: `.st-link-block` is `display: inline-flex`, so the icon becomes its own flex item: whitespace between text and icon collapses (`Register for tax↗` with no gap), and when the title wraps to two lines the icon floats vertically centred at the far right of the block, detached from the last word ("Starting a small business, step by step" and "Consumer Protection Act 68 of 2008" at 375px, `scratch/crops/chromium-375-light-notices-2.png`, `-3.png`). Source titles are long and translated, so this will be the normal case, not the edge case.
Suggested fix: keep the ↗ inside the last text run (`<span>title <Icon/></span>` in a `display: inline` link with a 44px pseudo-target), or set `gap` and `display: inline` on the link and use the `.st-link-block` height on a wrapper.

### Code, docs and tests

### nit: a fictional named reviewer is published in the notice demos
File: src/pages/design-system.astro:196-204, 213
What is wrong: "Thandi Mokoena" appears as a named human reviewer in three demo notices on a deployed page. D5 reserves "checked by a named human expert" for the real thing; a screenshot of this page reads as a real claim. Use `{reviewer}` or an obviously fictional placeholder.

### nit: `Base.astro`'s comment still describes the old `assetsInlineLimit: 0`
File: src/layouts/Base.astro:10
What is wrong: the comment says "`vite.build.assetsInlineLimit: 0` in astro.config.ts stops Astro inlining small bundles", but the config now uses the function form so CSS can still inline. `docs/design-system.md` is correct.

### nit: `uid()` ids depend on build order
File: src/scripts/uid.ts:63-68
What is wrong: the counter is module-global and never reset, so `st-callout-N` ids shift when an unrelated page renders first. Nothing asserts them and they are unique per page, so this is only a diff-noise risk once `dist` snapshots or visual baselines grow.

### nit: `theme-control.ts` writes `localStorage` directly and stores `system`
File: src/scripts/theme-control.ts:18,41; eslint.config.js:39
What is wrong: the package widened the storage allow-list to `src/scripts/**`, which is justified for the blocking `theme-init.js`, but `theme-control.ts` is an ordinary module that will duplicate what `src/lib/store.ts` and `lib/theme.ts` own in WP-30. It also writes `st.theme = "system"`, a value `theme-init` ignores. Worth a note so WP-30 reclaims it.

### nit: every build logs an astro-icon warning
File: astro.config.ts:60
What is wrong: `[astro-icon] Failed to load icons from "src/icons": ENOENT` on every build because there is no local icon set. Pre-existing and harmless, but it is noise in CI logs; `iconDir` can point at an existing folder or the local set can be dropped.

## Audit notes (no finding)

- **Keyboard, Chromium and WebKit at 320px** (`scratch/a11y.mjs`): skip link → logo → 10 TOC links → the theme radio group (one stop, arrows move and persist: system → light → dark → system, `st.theme` written each time) → the three scrollable table regions → 19 buttons → card links (ring on the whole card) → "Browse contents" → form fields → checkbox/radio rows → footer. Every stop shows a 2px `rgb(181,86,26)` ring. Disabled and loading buttons stay focusable and announce only their status (e2e).
- **Targets:** no stand-alone control under 44px at 320 or 375; the only sub-44px items are inline links (three of them; two are minor 6).
- **`role="note"` names:** all ten callouts resolve `aria-labelledby` to their visible label ("About this page", "Oor hierdie bladsy", "Masjienvertaling", …). No duplicate ids, no dangling `aria-labelledby`/`aria-describedby`, no skipped heading level, one `h1`, landmarks are banner / main / `nav "On this page"` / contentinfo / one live `status` region / the table regions. The pass-2 "eight region landmarks" nit is gone.
- **`st-table-scroll`:** at 320px the three overflowing regions are tab stops; at 1280 the non-overflowing ones have no `role`, `tabindex` or `aria-labelledby`. The stacked wide table has no tab stop.
- **Forced colours (Chromium):** the selected theme segment is filled `Highlight`/`HighlightText` (`scratch/crops/forced-375-theme-0.png`), disabled buttons are `GrayText` + dashed while loading buttons keep `ButtonText` and the spinner gap, badges and callouts keep borders and icons, and the contrast panel pauses with an explanation instead of reporting 76 failures.
- **Reduced motion:** spinner `animation-name: none`, ring and toast `1e-05s`, `--st-lift: 0px`, `--st-duration-fast: 0s`. **Low data** (`html[data-low-data]`): pattern `display: none`, fallback font stacks.
- **Print** (`emulateMedia`, with `st.theme=dark` saved): light palette forced (`--st-bg #fbf8f3`), header, nav, buttons and the toast region hidden, 11pt base.
- **Visual:** hierarchy reads well at all four widths in both themes; the section tints are now clearly distinct in dark (the pass-3 near-twins are gone); the shweshwe pattern sits in a bottom band under 768px, clear of the lead; badges wrap into calm rounded rectangles with the icon on the first line; cards, callouts, effort meters and rings are consistent. WebKit still draws Fraunces heavy at every weight (documented port artifact).

## Pass-2 and pass-3 verification

| Pass | Finding | Status | Evidence |
|---|---|---|---|
| 3 | **major** `Badge` cannot wrap → 336px at 320 | **Resolved** | `white-space: nowrap` gone; `max-inline-size: 100%`, `align-items: flex-start`, `--st-radius-lg`. All 21 badges injected with the 38-char label → `scrollWidth` 320 in both engines; card-meta repro included |
| 3 | minor forced-colours panel reports 76 FAIL | Resolved | `pause()` + `forced-colors` listener; e2e test; verified in a forced-colours context |
| 3 | minor forced-colours theme segment differs by border alone | Resolved | `forced-color-adjust: none` + `Highlight` fill; e2e test; screenshot |
| 3 | minor `svg { display: block }` breaks inline `Icon` | Resolved | `.st-icon { display: inline-block; vertical-align: -0.125em }` + a demo paragraph |
| 3 | minor `.ds-page`/`.ds-section` min-content widening | Resolved for those two | `minmax(0, 1fr)` on both; other inner grids still uncapped → minor 4 above |
| 3 | minor shweshwe dots behind the lead on phones | Resolved | bottom band under 768px; verified at 320 light and dark |
| 3 | minor dark tints near twins | Resolved | per-hue strengths; ΔE_OK ≥ 0.025 unit test; visually distinct at 1280 dark |
| 3 | minor `assetsInlineLimit: 0` kills CSS inlining | Resolved | function form; `/` has 1 inline `<style>`, 1 CSS link, 0 inline scripts |
| 3 | minor hard-coded 120s describe timeout | Resolved | `PW_DS_TIMEOUT` env + `test.slow()` on both axe tests |
| 3 | minor no D5 guidance | Resolved | "Notices and sources" in `docs/design-system.md` + a full demo section (but see major 2 and minors 6–8) |
| 3 | nit caller attributes can override loading/disabled semantics | Resolved | `rest` spread first; `aria-disabled`/`aria-busy` destructured out of props |
| 3 | nit `st-table-scroll` drops a focused tab stop | Resolved | `:focus` guard + `blur` re-check |
| 3 | nit hue-as-text threshold looser than B4 | Resolved | test asserts the measured 5.59 minimum |
| 3 | nit every CSS file named `stoep.*` | Resolved | content-based `assetFileNames`; only the token chunk is `stoep.*` |
| 3 | nit preloaded fonts under reduced data | Justified | documented in "Known limits" |
| 2 | minor inline `Icon`; minor Badge wrap; minor forced-colour segment; minor dots; minor dark tints; minor CSS inlining; minor axe timeout; minor D5 guidance | Resolved | as the pass-3 rows above |
| 2 | nit Callout note has no accessible name | Resolved | `aria-labelledby` + `uid()`; all ten notes named |
| 2 | nit eight region landmarks | Resolved | sections no longer carry `aria-labelledby`; landmark list is banner/main/nav/contentinfo + status + table regions |
| 2 | nit "✓ PASS" wraps | Resolved | `.ds-result { white-space: nowrap }` |
| 2 | nit token names break at hyphens | Resolved | `overflow-wrap: normal; word-break: keep-all` |
| 2 | nit inactive `href` button drops `icon-end` | Resolved | `hasEnd && !loading` in the inactive branch + a demo |
| 2 | nit `[aria-invalid]` global with `!important` | Resolved | scoped to `input`(text)/`select`/`textarea`, no `!important` |
| 2 | nit rendered-contrast test limits overstated | Resolved | both limits documented in "Automated checks" |
| 2 | nit print link URLs underlined | Resolved | `a[href^='http']::after { display: inline-block }` |
| 2 | nit docs say 480px for the tick, code says 560px | Resolved | docs now say 560px and explain it is component-level |

No regressions found against pass 1, 2 or 3.

## D5 readiness

**Yes — a page package can build the AI notice and the "Sources for this page" section from the documented primitives, with no new colours and no new components.** `docs/design-system.md` "Notices and sources (plan D5)" gives the exact composition (Callout `info` + `lucide:bot`, the notice sentence, the status as badge **and** words, its one-sentence explanation, then the `.st-link-block` link; the MT notice directly under it on Afrikaans pages; sources as `<ul role="list">` with link + official/flag badge + "What this source supports: …"; `doc.sourceNote` for pages with no sources; dated and unconfirmed facts). `/design-system/#notices` shows all of it in English and Afrikaans, and the primitives carry it: `role="note"` is named from its visible label, the callout/link/badge contrast pairs are all in `CONTRAST_PAIRS`, callouts are `break-inside: avoid` in print, and everything survives forced colours as icon + words.

Four things should be settled before the first page package copies it:

| Item | Rating |
|---|---|
| The dated-fact demo states the stale R1 million VAT threshold as an AI-checked fact | **major 2** |
| Verification status and officialness use the same badge variant, so an AI check looks as strong as an official source | minor 7 |
| The external-link ↗ detaches from wrapped source titles, and text/icon spacing collapses | minor 8 |
| The no-sources note's two links are 40px stand-alone targets documented as inline-exempt | minor 6 |

None of these needs a new token or component; all four are edits to the demo and the guidance.
