# WP-11 Stoep design system: review pass 3 (Reviewer H)

- Reviewer: REVIEWER-H (accessibility, UX and visual quality, performance, code quality). Did not do passes 1 or 2; read them only after drafting findings.
- Worktree: `.claude/worktrees/agent-a2273231b664d89f3`, branch `worktree-agent-a2273231b664d89f3`
- Commit reviewed: `8710091` (base `f81a1f8`), whole diff: 39 files, +6310/−13. Worktree left unedited.
- Date: 2026-09-16
- Scratch evidence: `%TEMP%\claude\C---Projects-Local-business-toolkit\2d511423-486a-4dd5-8e3b-fab6857854dc\scratchpad\wp11-pass3\` (below: `scratch/`). Scripts: `shots.mjs`, `audit.mjs`, `long2.mjs`, `sim.mjs`, `weight.mjs`, `montage.mjs`. Screenshots in `scratch/shots/`, sheets in `scratch/m/`, probes in `scratch/audit/` and `scratch/long/`. Independent draft: `scratch/draft-findings.txt`.

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 1 |
| minor | 9 |
| nit | 5 |

The system is well made: tokens match plan B4, dark mode is warm and well tuned, focus and target sizes are right, no inline script ships, and every gate is green in all three Playwright projects. One problem is not minor: `Badge` cannot wrap. With a realistic long label inside a `Card` on a plain page, the page scrolls horizontally at 320px in Chromium and WebKit (WCAG 1.4.10). Pass 2 measured the same overflow and rated it minor. Rated on real impact, it is an accessibility failure in a shared component that every page package will use for applies-to, machine-translation and D5 verification badges, and it contradicts the package's own documented rule ("Components wrap instead of truncating", +25% strings). It must be fixed before merge. The fix is small.

## Commands and output tails

All run by the reviewer in the author worktree on HEAD `8710091`.

```
== pnpm lint
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!

== pnpm typecheck
$ astro check
Result (42 files):
- 0 errors
- 0 warnings
- 0 hints

== pnpm test
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  2 passed (2)
      Tests  183 passed (183)

== pnpm build
[WARN] [astro-icon] Failed to load icons from "src/icons": ENOENT ... (pre-existing, no local icon set)
  ├─ /design-system/index.html (+36ms)
  ├─ /index.html (+8ms)
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 2 page(s) built in 4.37s
[build] Complete!
```

Built HTML:

```
== dist/index.html
inline scripts: 0
<script src="/business-toolkit/_astro/theme-init.BHr9UoTf.js">
<script type="module" src="/business-toolkit/_astro/page.BDh2vuYI.js">
<link rel="stylesheet" href="/business-toolkit/_astro/stoep.CFQHO2kO.css">
<link rel="stylesheet" href="/business-toolkit/_astro/stoep.DYQNUk6e.css">
CSP: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'
<style> blocks: 0
== dist/design-system/index.html
inline scripts: 0
<script src="/business-toolkit/_astro/theme-init.BHr9UoTf.js">
<script type="module" src="/business-toolkit/_astro/page.BDh2vuYI.js">
<script type="module" src="/business-toolkit/_astro/TableScroll.astro_astro_type_script_index_0_lang.B7Xp4wqM.js">
<script type="module" src="/business-toolkit/_astro/design-system.astro_astro_type_script_index_0_lang.rZbjIkD-.js">
CSP: (identical)
<style> blocks: 0
```

The CSP is byte-identical to plan C4 on both pages and precedes the first script. `page.BDh2vuYI.js` is Astro's prefetch module.

Playwright, preview on 127.0.0.1:5131, `PW_PORT=5131 ... --workers=1 --timeout=180000`, specs `design-system.spec.ts` + `smoke.spec.ts`:

```
===== chromium
  ok 25 [chromium] › tests\e2e\smoke.spec.ts:3:1 › home page renders under the base path (10.0s)
  25 passed (5.6m)
===== webkit
  ok 15 [webkit] › design-system.spec.ts:318:5 › axe reports no serious or critical violations (light) (25.0s)
  ok 18 [webkit] › design-system.spec.ts:318:5 › axe reports no serious or critical violations (dark) (24.4s)
  25 passed (4.3m)
===== mobile
  25 passed (4.8m)
```

Ownership (`git diff --name-only f81a1f8...HEAD`): 39 paths, all inside the owned list: `src/styles/**` (4), `src/scripts/**` (5), `src/layouts/Base.astro`, `src/components/ui/**` (13), `src/components/illustrations/**` (8), `public/favicon.svg`, `src/pages/design-system.astro`, `src/pages/index.astro`, `docs/design-system.md`, `tests/unit/tokens-contrast.test.ts`, `tests/e2e/design-system.spec.ts`, one line in `eslint.config.js` (adds `src/scripts/**` to the storage allow-list), and in `astro.config.ts` only `vite.build.assetsInlineLimit` and `vite.build.rollupOptions.output.assetFileNames`.

## Measured bytes

From `dist/` (gzip -9) and from the network log of a fresh load against the preview (`scratch/audit/audit-chromium.json` → `perf`).

| Page | Requests | HTML raw / gz | JS raw / gz | CSS raw / gz | Fonts (woff2) |
|---|---|---|---|---|---|
| `/` | 7 | 3,024 / 1,143 | theme-init 1,209 / 654 + prefetch 2,487 / 1,135 = **3,696 / 1,789** | `stoep.CFQHO2kO` 20,592 / 5,230 + `stoep.DYQNUk6e` 232 / 146 = **20,824 / 5,376** | Fraunces latin 67,304 + Instrument Sans latin 30,092 = **97,396** (both preloaded) |
| `/design-system/` | 11 | 179,042 / 15,359 | + TableScroll 721 / 419 + page script 6,354 / 2,793 = **10,771 / 5,001** | 20,592 / 5,230 + `stoep.BoC9BnP_` 28,026 / 4,835 = **48,618 / 10,065** | above + latin-ext Fraunces 59,388 + Instrument Sans 11,144 = **167,928** (diacritics specimen) |

All within C4 budgets (script ≤60 KB, stylesheet ≤30 KB, fonts ≤200 KB). CSS inlining regression on `/`: exactly one extra render-blocking request, 232 B raw / 146 B gz, carrying three `.home*` rules (minor P1).

## Independent verification (summary)

- **Screenshots** (`scratch/shots/`, sheets `scratch/m/`): both pages at 320, 414, 768, 1024 and 1440 px, light and dark, Chromium and WebKit (40 full-page captures, `reducedMotion: reduce`). Every capture has `scrollWidth === clientWidth`, and the contrast panel reads "All 76 pairs pass" in every capture. Also forced colours at 414 and 1280 (`scratch/audit/fc-*`), print with a dark colour scheme (`print-*.png/.pdf`), and 200% root font size at 1280 (no element outside the viewport on either page).
- **Visual judgement:** clear hierarchy (Fraunces H1/H2 over quiet Instrument Sans body), even rhythm from the spacing scale, a warm and credible palette. Dark mode is warm near-black with pastel hues and no pure black. Illustrations share one stroke weight and a two-tone fill. The theme control holds three equal segments on one row at 320px. Loading and disabled buttons are clearly different. Print uses the light palette, hides chrome and buttons, and keeps callouts and tables whole.
- **WebKit heading weight:** Playwright's Windows WebKit draws Fraunces heavy at every weight. Measured advance widths are identical to Chromium (600: 369.5 px, 900: 395.5 px, 300: 343.7 px, `scratch/audit/weight-*.png`), yet an explicit `"wght" 300` still renders black. That is the Windows WebKit port's variable-font rasterising, not the CSS. Not a finding; check once on real Safari.
- **Keyboard, Chromium** (`audit-chromium.json` → `kbd`): skip link → logo → 8 TOC links → theme radio group (one stop) → 19 buttons → 2 card links (ring on the whole card) → "Browse contents" → 4 form fields → 3 checkbox/radio stops → footer link. Every stop has a 2px `rgb(181,86,26)` ring and `:focus-visible`. The skip link is 160×44 at top-left, and Enter moves focus to `main#main`. **WebKit:** same order minus links (Safari does not Tab to links by default: platform behaviour).
- **Targets:** every stand-alone control is at least 44×44 (buttons 44 or 52 high, TOC links 44, card overlays whole-card, checkbox rows 44). e2e test green in all three projects.
- **Landmarks and headings:** banner, main, `nav "On this page"`, contentinfo; one h1; 43 headings with no skipped level (H4 only under H3 demos). Home: header, main (h1), footer.
- **ARIA** (same in both engines): `st-theme-toggle` → `group "Colour theme"` with radios System/Light/Dark. The loading button is `button "Saving" [disabled]` with `aria-busy`, the disabled button `button "Disabled" [disabled]`; Enter and Space on the disabled button reach no click handler (0). `ProgressRing` → `img "Part A: 0 of 34 done"`. `Callout` → `note` (no name, pass-2 nit). `st-table-scroll` at 1280 → no role or tabindex while nothing scrolls. `EffortMeter` → "Effort: High (5 of 5)". Mark-only logo → `img "SA Business Toolkit"`.
- **Reduced motion:** spinner `animation-name: none`, ring `1e-05s`, `--st-lift: 0px`.
- **Reduced data:** cannot be emulated (Chromium CDP accepted, `matchMedia` false). Verified by code: `--st-pattern-display: none` and fallback font stacks. Preloads still fetch (documented Known limit).
- **Colour-only meaning:** badges, callouts, effort meter, ring, contrast results (✓/✗ plus text), errors (icon + text + 2px border) and disabled fields (dashed) all carry a non-colour cue. The one exception is minor A2.
- **Code:** `color.ts` WCAG, OKLab and parser maths are correct (oklab `a`/`b` % scaled 0.4; truncating `formatRatio`). The dark and system-dark blocks are byte-equal and guarded by a structure test with a mutation self-test. The WebKit load fix is event-based. `theme-init.js?url` is a classic blocking file, all other scripts are processed modules, and no literal colours exist outside `tokens.css` (grep of `src/**`; `public/favicon.svg` hex values are unit-tested against tokens). Tests are deterministic (no fixed sleeps; `expect.poll` and attribute waits).

## Findings

### Accessibility

### major: `Badge` cannot wrap, so a long label makes the page scroll horizontally at 320px
File: src/components/ui/Badge.astro:49 (`white-space: nowrap`)
Acceptance item: B5 "rem units and reflow at 320px (only table regions scroll)" (WCAG 1.4.10); B7 i18n rule "+25% string length"; docs/design-system.md:285 "Components wrap instead of truncating"
What is wrong: A badge is never narrower than its text. In a `Card` meta row at 320px, the card body leaves about 238px, so any label longer than about 29 characters (14px semibold) overflows the card. Inside `.st-grid` the overflow becomes page-level horizontal scroll. This was measured on a plain page region built from the real rendered components (`st-container > st-grid > Card`), with the design-system page's own grid artifact neutralised:

| Engine | Viewport | Label | Card | Badge | Page `scrollWidth` |
|---|---|---|---|---|---|
| Chromium | 320 | "Masjienvertaling, nog nie nagegaan nie" (38 chars) | 16–304 | 41–336 (295 px) | **336** |
| WebKit | 320 | same | 16–304 | 41–336 | **336** |
| Chromium / WebKit | 375 | same | 17–358 | 42–338 | 375 (overflows the card padding) |

On the design-system page itself, the same label in the card grows the page to 387px, and the stand-alone badge cluster to 337px, in both engines (`scratch/long/long2-*.json`). Such labels are realistic: plan D5 requires the verification status as text ("Checked by {reviewer}" / its Afrikaans form), and plan B4 puts applies-to, machine-translation and official badges on every document header and card, all translated at +25%. The 320px e2e reflow test passes only because the demo labels are short.
How to reproduce: `node scratch/sim.mjs <outdir>` with the preview on port 5131 (prints `cardBadge ... pageScrollWidth 336`). Or, in DevTools at 320px on `/design-system/`: `document.querySelector('.st-card__meta .st-badge span:last-child').textContent = 'Masjienvertaling, nog nie nagegaan nie'`, then compare `document.documentElement.scrollWidth` with `clientWidth`.
Suggested fix: Remove `white-space: nowrap`. Add `max-inline-size: 100%`, keep `display: inline-flex`, set `align-items: flex-start` on the badge with a small `margin-block-start` on the icon so it stays aligned with the first line, and use `--st-radius-md` (or a `text-wrap: balance` label) so a two-line pill still looks intentional. Add a long Afrikaans badge to the Card and Badge demos, so the existing "reflows at 320px" test guards it, or add a dedicated test that injects a 40-character label.

### minor: In forced colours the live contrast panel reports all 76 pairs as FAIL
File: src/scripts/design-system-contrast.ts:21-33
Acceptance item: B7 "live swatches computing contrast at runtime (FAIL shown on drift)"; B5 forced-colors
What is wrong: Under `forced-colors: active`, `getComputedStyle(probe).color` returns the forced system colour for every token. Every swatch reads "Now #000000", every row reads "1.00:1 ✗ FAIL", and the summary says "76 of 76 pairs fail (theme: system)". A Windows high-contrast user is told the design system is broken when nothing drifted. The page is a noindex developer reference, so the impact is limited, but the output is wrong. Neither earlier pass reported it.
How to reproduce: Chromium context with `forcedColors: 'active'` on `/design-system/`. Sheets `scratch/m/fc-ds-414-00.png` and `scratch/m/fc-ds-1280-00.png` (summary line and the whole "Now/Result" columns).
Suggested fix: Set `probe.style.forcedColorAdjust = 'none'` so the computed value is the author colour (then verify in forced colours), or skip measuring when `matchMedia('(forced-colors: active)').matches` and show "Live checks are paused while forced colours are on", re-running on the media query's `change` event.

### minor: In forced colours, the selected theme segment is shown by border colour alone below 560px (queued item, confirmed)
File: src/pages/design-system.astro:1010-1027
Acceptance item: B4 "colour never carries meaning alone"; B5 forced-colors rules
What is wrong: At 414px in forced colours (light), "Dark" selected has a 2px purple `Highlight` border and the other segments a 2px black border. Background, weight and icons are identical, and the tick is hidden below 560px (`scratch/audit/fc-toggle-414.png`; at 1280 the tick shows, `fc-toggle-1280.png`). Windows high contrast combined with 400% zoom (a 320 CSS px viewport) is a common low-vision setup, so this is a real gap. It stays minor because forced colours is a user override outside WCAG's default-rendering conformance, the checked state is exposed to assistive technology, and the control lives on the reference page. The future ThemeToggle must not copy it.
How to reproduce: As above.
Suggested fix: Pass 2's CSS (Highlight fill with `forced-color-adjust: none` and `HighlightText`), or keep the tick visible in forced colours at every width.

### minor: Global `svg { display: block }` breaks `Icon` inside running text (queued item, confirmed by code)
File: src/styles/base.css:152-173
Acceptance item: B4 Icons ("scale with text")
What is wrong: `.st-icon` resets only `max-inline-size`, so an `Icon` in a sentence starts a new line. The design-system page hides this because every icon demo sits in a flex container (`.ds-form .st-error-text` is page-scoped). Minor now; D5 source lists and ↗ external-link markers will hit it.
Suggested fix: `.st-icon { display: inline-block; vertical-align: -0.125em; }`, and move the flex layout into base `.st-error-text`.

### Visual and UX

### minor: The design-system page's section grids let one long word widen the whole page at 320px
File: src/pages/design-system.astro (`.ds-page` and `.ds-section` are `display: grid` with an implicit `auto` column)
Acceptance item: B5 reflow; general quality (pages copy this layout)
What is wrong: The implicit track sizes to its children's min-content. One unbreakable Afrikaans compound word in a demo SectionHeader title ("Kernverpligtinge vir alle eenpersoonsondernemings") makes the page 446px wide at 320px; a long card title makes it 367px, in both engines. Once the same content sits in a plain `st-container > st-grid`, it wraps correctly (`overflow-wrap: break-word`) with no overflow (`scratch/audit/sim-chromium.json` → `cardTitle` 320). The components are fine; the page layout is not. Content on this page is fixed, hence minor, but a page package copying `.ds-section` would inherit the bug.
How to reproduce: `node scratch/long2.mjs <outdir> chromium` → `320 longCompoundTitle sw 446`, `320 longCardTitle sw 367`.
Suggested fix: `grid-template-columns: minmax(0, 1fr)` on `.ds-page` and `.ds-section` (the same pattern `.st-doc-grid` already uses).

### minor: Shweshwe dots sit behind the lead text on phones (queued item, confirmed)
File: src/components/ui/SectionHeader.astro:56-82
What is wrong: At 320px the pattern covers the right 60% of the hero lead ("Fast on a cheap phone. One source of truth") in light and dark (`scratch/m/ds-chromium-320-light-00.png`, `ds-chromium-320-dark-*`). Contrast still passes; it is reading noise where people read. Minor.
Suggested fix: As pass 2 (a bottom band or 30% width under 768px).

### minor: Dark section tints Core/Paperwork and Start/Types are near twins (queued item, confirmed)
File: src/styles/tokens.css (dark `--st-tint-strength: 22%`); tests/unit/tokens-contrast.test.ts (distance > 5 in sRGB)
What is wrong: In the 1440 dark sheets (`scratch/m/ds-chromium-1440-dark-01.png`) Core and Paperwork headers are told apart mainly by the stripe and title. The stripe, eyebrow dot and visible title always carry identity, so nothing is conveyed by tint alone. Minor.
Suggested fix: As pass 2 (ΔE_OK threshold, lift two dark tints).

### Performance

### minor: `assetsInlineLimit: 0` removes CSS inlining: one extra blocking request on `/` (queued item, measured)
File: astro.config.ts (vite.build.assetsInlineLimit)
What is wrong: `/` makes 7 requests instead of 6; the extra `stoep.DYQNUk6e.css` is 232 B (146 B gz) for three `.home*` rules. Every future page with a small scoped `<style>` adds one render-blocking round trip, which matters most on the slow mobile networks the plan targets. The byte cost is negligible, and the setting is required to keep scripts external under `script-src 'self'`. Minor.
Suggested fix: Try the function form of `assetsInlineLimit` so only CSS may inline, and confirm `index.html` gets one `<style>` and still 0 inline `<script>`; otherwise document the trade-off.

### Code and tests

### minor: The spec's hard-coded 120s describe timeout can still time out WebKit axe under parallel load (queued item, not reproduced)
File: tests/e2e/design-system.spec.ts:43
What is wrong: `test.describe.configure({ timeout: 120_000 })` overrides the CLI `--timeout`. In this pass (1 worker) WebKit axe took 25.0s and 24.4s and passed; pass 2 saw 2.0 min timeouts with 8 workers. The risk to CI is real, and the code confirms the override. Minor.
Suggested fix: `test.slow()` in the axe tests, or exclude `.ds-contrast` from the axe scan.

### Documentation

### minor: No design guidance for the D5 AI notice and "Sources for this page" (queued item)
File: docs/design-system.md (Components)
What is wrong and fix: see "D5 readiness" below. The primitives exist, but without a documented composition each page package will invent its own. Minor, can move to `backlog.md` with a reason.

### nit: Caller attributes can override the loading and disabled semantics of `Button`
File: src/components/ui/Button.astro:108, 127 (`{...common} {...rest}`)
What is wrong: `rest` is spread after `aria-disabled`/`aria-busy`, so a caller's `aria-label` replaces the `loadingText` name, and a caller's `aria-disabled="false"` would undo the inactive state.
Suggested fix: Spread `rest` first, then `common`, or omit `aria-*` keys from `Props`.

### nit: `st-table-scroll` can drop the tab stop from a focused region
File: src/scripts/table-scroll.ts:29-36
What is wrong: When a focused region stops overflowing (rotation, zoom, sidebar toggle), `tabindex` and `role` are removed while it holds focus, so focus falls back to `body`.
Suggested fix: Skip the removal while `this.matches(':focus')`, and re-check on `blur`.

### nit: The unit test's hue-as-text threshold is looser than plan B4
File: tests/unit/tokens-contrast.test.ts:310-320
What is wrong: The plan says "≥5.6 light"; the test asserts `> 5.5`. The real minimum is Start here at 5.59:1 (docs table), which rounds to the plan's 5.6. Harmless, but the test allows drift down to 5.51.
Suggested fix: Assert `>= 5.59`, or correct the plan figure to 5.5.

### nit: Every CSS file is named `stoep.[hash].css`
File: astro.config.ts (assetFileNames)
What is wrong: Three `stoep.*` files (shared 20.6 KB, design-system page 28 KB, home 232 B) cannot be told apart in budget reports. Same as pass 2.

### nit: Preloaded fonts are fetched under reduced data (documented Known limit)
File: src/layouts/Base.astro (two `<link rel="preload">`)
What is wrong: 97 KB is still fetched when fallbacks are in use. `prefers-reduced-data` ships in no stable browser, and this is documented. Nit.

## Long-content reflow results (injected in the browser only)

| Injection (320px) | Chromium page width | WebKit page width | Verdict |
|---|---|---|---|
| MT badge "Masjienvertaling, nog nie nagegaan nie" in a Card, plain page region | 336 | 336 | **fail: major** |
| Same badge, plain `st-cluster` in a container | 320 (badge 16–311, inside the gutter) | 320 | passes narrowly |
| Warning callout title, 95 characters | 320 | 320 | wraps, pass |
| Wide table: three-line stacked label | 320 | 320 | label wraps in its own column, pass |
| Wide table: long `thead th` (hidden when stacked) | 320 | 320 | pass; at 1280 @200% the region scrolls, as designed |
| `lg` button "Vind my pad deur die registrasieproses" | 320 | 320 | wraps, pass |
| Long compound title in a SectionHeader, design-system page | 446 | 446 | minor V1 (page grid) |
| Same in a Card title, plain page region | 320 | 320 | pass |
| Long warning toast text | 320 | 320 | pass |
| Effort meter "Moeite: Middelmatig tot hoog" | 320 | 320 | pass |

At 1280px with a 200% root font size, none of these injections overflow the page.

## Regression check against passes 1 and 2

HEAD is `8710091`, the same commit pass 2 reviewed, so no code changed after pass 2.

- **Pass-1 resolutions still hold:**
  - WebKit contrast panel: all 76 pairs pass in every WebKit capture and e2e test.
  - Stacked table: no overlap; the e2e test is green in 3 projects, and the three-line label injection also passes.
  - Loading button name: `button "Saving"`.
  - Inactive activation: 0 clicks by mouse, Enter and Space.
  - Targets: 44px.
  - Theme control: a real `<st-theme-toggle>`, one row at 320.
  - CSS name: `stoep.*`. Token structure test: present.
  - CSP and inline scripts: 0 inline, byte-identical CSP.
  - theme-color: follows the saved theme (e2e).
  - Print: light palette, buttons hidden.
- **Pass-2 minors, all still present and confirmed:**
  - inline `Icon`;
  - Badge wrapping, **re-rated major** (above: pass 2's own probe showed page `scrollWidth` 410 at 320, which is a 1.4.10 failure, not polish);
  - forced-colours segment state;
  - dot pattern under the lead;
  - dark tints;
  - CSS inlining (measured: +1 request, 146 B gz);
  - WebKit axe timeout (not reproduced at 1 worker; kept minor on code evidence);
  - D5 guidance.
- **Pass-2 nits:** not re-verified individually except the Callout accessible name (still unnamed `note`), `stoep.*` naming (still present) and the `[aria-invalid]` rule (still global with `!important`).
- **New in pass 3:** minor A1 (forced-colours contrast panel all FAIL), minor V1 (design-system page grid min-content widening), nits on the `Button` prop spread, TableScroll focus loss and the hue threshold.
- **Regressions:** none.

## D5 readiness: can a page package build the AI notice and "Sources for this page" from existing primitives, with no new colours or components?

**Yes, once the Badge major is fixed.** No new colour tokens or components are needed.

- **AI notice:** `Callout variant="info"` with `label` (translated, for example "Written by AI") and `icon="lucide:bot"`. `role="note"` fits, the body carries the D5 sentence and the `start/how-this-was-made` link (underlined, verified link-on-info-bg pair 6.8:1 light), and the verification status is a sentence or a text Badge. It prints (callouts are `break-inside: avoid`).
- **Sources list:** `<ul role="list">` with `.st-flow`/`.st-stack-sm`. Each entry has the title as a link (`.st-link-block` for a 44px stand-alone target), `Badge variant="official"` ("Official", icon plus text), and an `.st-hint` "Supports: …" line. Print already appends external URLs.

Gaps:

| Gap | Rating |
|---|---|
| `Badge` cannot wrap: long "Checked by {reviewer}" and Afrikaans status or official labels overflow at 320px | **major** (the finding above) |
| No documented "Notices and sources" composition, and no demo on `/design-system/`, so each page package will diverge | minor (queued) |
| `Icon` in running text breaks the line (↗ external marker, inline "Official" marker) | minor (queued) |
| `Callout` `note` has no accessible name, so the notice is announced as a bare "note" | nit |
| No verification-status Badge variant (use `official` or `effort` with an `icon` override) and no `Link` component with the B4 ↗ + `rel=noopener` + `[Official]` behaviour; D5 does not require either, and both can be composed | nit |
