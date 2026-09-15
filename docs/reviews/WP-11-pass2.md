# WP-11 Stoep design system: review pass 2 (Reviewer G)

- Reviewer: REVIEWER-G (accessibility, UX, visual quality, performance, code quality). Did not do pass 1.
- Worktree: `.claude/worktrees/agent-a2273231b664d89f3`, branch `worktree-agent-a2273231b664d89f3`
- Commit reviewed: `8710091` (commits `8d9982c`, `6dbadf9`, `8710091`; base `f81a1f8`). Worktree clean after review.
- Date: 2026-09-15
- Scope: the whole diff (39 files, +6310/−13), not only the pass-1 fixes.
- Scratch evidence: `%TEMP%\claude\C---Projects-Local-business-toolkit\2d511423-486a-4dd5-8e3b-fab6857854dc\scratchpad\wp11-pass2\` (below: `scratch/`). Screenshots in `scratch/shots/`, focus and probe clips in `scratch/focus/`, probe scripts `a11y.mjs`, `fc.mjs`, `probe-inline.mjs`, `shots.mjs`, `serve-mut.mjs`.

## Verdict: CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 8 |
| nit | 10 |

Every pass-1 finding is resolved or justified (table at the end). The system is in good shape:
- The tokens match plan B4.
- The live contrast panel now works in WebKit.
- The stacked table no longer overlaps and keeps its table semantics.
- The theme control is a real `<st-theme-toggle>` element.
- Every stand-alone target is at least 44 px at 320, 375, 768 and 1280 px.
- No inline scripts ship, and the CSP equals plan C4.

The minor findings are worth fixing before the pages packages copy these patterns. The most important are:
- A global `svg { display: block }` rule breaks `Icon` inside running text.
- Badges cannot wrap, so a long label overflows at 320 px.
- At 320 px the dot pattern sits behind the lead text.
- The axe tests time out in WebKit when run with 8 workers.

## Commands and output tails

All commands were run by the reviewer in the author worktree.

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
  ├─ /design-system/index.html (+33ms)
  ├─ /index.html (+8ms)
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 2 page(s) built in 4.60s
[build] Complete!
```

Built HTML (Node scan of `dist/`):

```
== design-system/index.html bytes 178671 inline-no-src 0
   <script src="/business-toolkit/_astro/theme-init.BHr9UoTf.js">
   <script type="module" src="/business-toolkit/_astro/page.BDh2vuYI.js">
   <script type="module" src="/business-toolkit/_astro/TableScroll.astro_astro_type_script_index_0_lang.B7Xp4wqM.js">
   <script type="module" src="/business-toolkit/_astro/design-system.astro_astro_type_script_index_0_lang.rZbjIkD-.js">
  CSP: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'
== index.html bytes 3024 inline-no-src 0
   <script src="/business-toolkit/_astro/theme-init.BHr9UoTf.js">
   <script type="module" src="/business-toolkit/_astro/page.BDh2vuYI.js">
  CSP: (identical to plan C4)
```

No `<script>` without `src` exists on either page. The CSP is byte-identical to plan C4. `page.BDh2vuYI.js` is Astro's prefetch script.

Playwright, `PW_PORT=5031`, specs `design-system.spec.ts` + `smoke.spec.ts`, `--timeout=120000`:

```
===== chromium
  25 passed (2.7m)
===== webkit (8 workers)
  x  [webkit] › design-system.spec.ts:318:5 › axe reports no serious or critical violations (light) (2.0m)
  x  [webkit] › design-system.spec.ts:318:5 › axe reports no serious or critical violations (dark) (2.0m)
    Test timeout of 120000ms exceeded.
  2 failed
  23 passed (7.6m)
===== webkit, axe tests only, --workers=1
  ok 1 [webkit] › axe reports no serious or critical violations (light) (31.6s)
  ok 2 [webkit] › axe reports no serious or critical violations (dark) (34.2s)
  2 passed (2.0m)
===== mobile
  25 passed (3.4m)
```

The two WebKit failures are timeouts on a heavily loaded machine, not violations. See minor T1.

Ownership (`git diff --name-only f81a1f8...HEAD`) covers 39 paths, all inside the owned list:
- `src/styles/**`, `src/scripts/**`, `src/layouts/Base.astro`, `src/components/ui/**` and `src/components/illustrations/**`
- `public/favicon.svg`, `src/pages/design-system.astro` and `src/pages/index.astro`
- `docs/design-system.md`, `tests/unit/tokens-contrast.test.ts` and `tests/e2e/design-system.spec.ts`
- one line in `eslint.config.js` (adds `src/scripts/**` to the storage allow-list)
- `astro.config.ts`: only `vite.build.assetsInlineLimit` and `vite.build.rollupOptions.output.assetFileNames`

## Measured bytes

Values are from `dist/`. "gz" is gzip -9.

| Page | HTML | JS (raw / gz) | CSS (raw / gz) | Fonts |
|---|---|---|---|---|
| `/` | 3,024 / 1,129 | theme-init 1,209 / 633 + prefetch `page` 2,487 / 1,118 = **3,696 / 1,751** | `stoep.CFQHO2kO` 20,592 / 5,219 + `stoep.DYQNUk6e` 232 / 125 = **20,824 / 5,344** | preloaded Fraunces latin 67,304 + Instrument Sans latin 30,092 = **97,396** |
| `/design-system/` | 179,042 / 15,289 | theme-init + prefetch + TableScroll 721 / 358 + page script 6,354 / 2,739 = **10,771 / 4,848** | 20,592 / 5,219 + `stoep.BoC9BnP_` 28,026 / 4,807 = **48,618 / 10,026** | as above, plus latin-ext Fraunces 59,388 and Instrument Sans 11,144 (the diacritics specimen) |

The base layout ships only the classic blocking `theme-init` (633 B gz) and Astro's prefetch module (1,118 B gz). Everything is well inside the C4 budgets: script ≤60 KB, stylesheet ≤30 KB gz, fonts ≤200 KB.

## Independent verification (summary)

- **Targets:** `scratch/a11y.mjs` checked every focusable element, card overlays and checkbox labels included. Nothing is under 44×44 at 320, 375, 768 or 1280 px on either page (47, 47, 45 and 44 targets on `/design-system/`).
- **Skip link:** Chromium, fresh page. The first Tab focuses "Skip to content", which is visible (top 8 px, 44 px high). Enter moves focus to `main#main` and the next Tab goes to the "Theme" link. WebKit does not Tab to links by default (Safari needs Option+Tab), so the skip link is not a Tab stop there. That is platform behaviour, not a defect.
- **Landmarks and headings:**
  - The page has one `h1`, 43 headings and no skipped levels.
  - Its landmarks are `header` → banner, `main`, `nav "On this page"` and `footer` → contentinfo, all correctly outside `main`.
  - The eight `section[aria-labelledby]` elements become region landmarks (nit A5).
- **`role="note"`:** all five Callouts. **ProgressRing:** `img "Part A: 12 of 34 done"` etc. **Icon:** every SVG is `aria-hidden` except the four rings, the labelled Print icon and the mark-only logo (all `role="img"` with a name).
- **`<st-table-scroll>`:**
  - At 1280 px no region scrolls, and none has a role, tabindex or name.
  - At 320 px the three plain tables are `role=region tabindex=0 aria-labelledby=<caption>`. The stacked wide table has none of them.
  - At 375 px ArrowRight scrolls the focused contrast region; this is covered by the e2e test.
- **Stacked table semantics:** the ARIA snapshot at 320 px is identical in Chromium and WebKit: `table` → `rowheader "Food"`, `cell "High"`, etc. The generated label is not in the cell name.
- **Inactive buttons:**
  - All eight disabled or loading `<button>`s render `type="button"`. A `click()` and a keyboard Enter or Space reach no handler.
  - Names are `button "Saving" [disabled]` and `button "Disabled" [disabled]`, and `aria-busy="true"` is present on the loading ones.
  - Same result in both engines.
- **`<st-theme-toggle>`:**
  - A `group "Colour theme"` with three radios and one tab stop.
  - ArrowRight moves and applies light, then dark. It wraps to system in Chromium and stops at dark in WebKit (native radio behaviour).
  - The choice persists, and `theme-color` follows it (e2e test).
- **Reduced motion:** the spinner has `animation: none`, the ring and toast animations collapse to 0.00001 s, `--st-lift` is 0 px and `scroll-behavior` is `auto`. Same in both engines.
- **Low data:** `html[data-low-data]` sets the pattern to `display: none` and both families to the fallback stacks. `prefers-reduced-data` could not be emulated: Chromium accepts the CDP call, but `matchMedia` still returns false.
- **Forced colours** (Chromium, light and dark):
  - Focus rings are 3 px system colour on buttons, inputs and links. The ring is 2 px on the whole card and on the theme label.
  - Lit effort bars are CanvasText; unlit bars are outlined.
  - The spinner keeps its transparent gap (`borderRightColor=rgba(0,0,0,0)`).
  - Badges and callouts have CanvasText borders. The ring value is CanvasText on a GrayText track. The pattern is `none`.
  - One gap: see minor A3.
- **Is the rendered-contrast e2e test meaningful?** Yes. I copied `dist/` to scratch and changed only `.st-effort__label` to `var(--st-border)` in the copied CSS. I served the copy on port 5033 and ran `rendered component text meets 4.5:1 (light)` against it. It failed as it should: `Received: [".st-effort__label: 1.45:1"]`. Limits: it samples the first match per selector and ignores `background-image` layers.
- **`color.ts` parser:** handles `#rgb(a)`/`#rrggbb(aa)`, `rgb()`/`rgba()` in comma and space syntax with `%` and `none`, `color(srgb …)` with alpha, `oklab()` (L as number or %, a/b % scaled 0.4), `oklch()` (hue in deg/turn/grad/rad and `none`) and `transparent`. It rejects `hsl()` and named colours instead of guessing. Unit tests pin the exact strings WebKit 26 and Chromium 147 return for an oklab tint.
- **WebKit "wait for load":** the fix is event-based, not timed. It measures only when `--st-bg` resolves. Otherwise it waits for `load`, and if the page is already `complete` it shows "unavailable". Robust.
- **`?url` theme-init:**
  - In the build it is a hashed classic file that loads first in `<head>`.
  - Under `astro dev` (reviewer started it on port 5034, then stopped it), the page emits `<script src="/src/scripts/theme-init.js">`. That URL returns `HTTP 200`, `Content-Type: text/javascript` and the verbatim source. The dev CSP is off, as documented.
- **Literal colours:** a grep of `src/**` for hex, `rgb`, `hsl`, `oklch` and named colours finds none outside `tokens.css`. The only hits are words such as `white-space` and `clampRgb`.
- **Stylelint:** stdin probes with a component filename flag `#ff0000`, `rgb()`, `red` and `black` in an `.astro` `<style>`, and `#123456` and `hsl()` in `base.css`. `tokens.css` is exempt.
  - Observation outside WP-11 ownership: `stylelint.config.js` does not include plan C5's `stylelint-declaration-strict-value`, so literal `font-size: 14px` passes. For the scaffold owner.
- **Illustration fills:** computed `fill` is `rgb(255,255,255)` on the tinted tiles and card art. The two-tone rendering works.
- **WebKit headings look heavier:** a width probe shows Instrument Sans 400 vs 700 at 412 vs 429 px in both engines, and equal Fraunces widths at a fixed `opsz`. The weights apply; the look comes from the Windows WebKit rasteriser. Not a finding.

## Findings

### Accessibility

### minor: `Icon` inside running text renders as a block and breaks the line
File: src/styles/base.css:152-173
Acceptance item: B4 Icons ("inlined … scale with text"); docs/design-system.md "an error message … that starts with an icon"
What is wrong:
- The global reset gives every `svg` `display: block`, and `.st-icon` only resets `max-inline-size`.
- Any `<Icon>` placed in a sentence therefore sits on its own line: an error message, an external-link ↗, an "Official" marker in a paragraph.
- The design-system page hides this, because every demo wraps icons in a flex container. `.ds-form .st-error-text { display: flex }` is page-scoped CSS, so the documented `.st-field` error pattern breaks on any other page.
How to reproduce: `node scratch/probe-inline.mjs chromium|webkit`. It inserts `<p class="st-error-text"><svg class="st-icon">… A VAT number has 10 digits.</p>`. Result: `display: block`, `iconTop 79`, `textTop 99`, `sameLine: false` in both engines. Clip: `scratch/focus/*-probe-inline.png`.
Suggested fix:
```css
.st-icon {
  display: inline-block;
  vertical-align: -0.125em;
  max-inline-size: none;
  fill: none;
  stroke: currentcolor;
}
```
Also move `display: flex; align-items: center; gap: var(--st-space-1)` from `.ds-form .st-error-text` into base `.st-error-text`.

### minor: Badges cannot wrap, so a long label overflows at 320px
File: src/components/ui/Badge.astro:49
Acceptance item: B5 reflow at 320px; docs "+25% string length … wrap instead of truncating"
What is wrong: `.st-badge { white-space: nowrap }`. An Afrikaans-length entity badge ("Slegs vir maatskappye met beperkte aanspreeklikheid") is 394 px wide in a 320 px viewport. The page then scrolls horizontally: `scrollWidth` becomes 410, in both engines. The e2e 320 px test passes only because the demo labels are short.
How to reproduce: `node scratch/probe-inline.mjs chromium` → `longBadge.overflows: true`.
Suggested fix: remove `white-space: nowrap` and add `max-inline-size: 100%` and `text-wrap: balance`. Keep the icon aligned with `align-self: start` and `margin-block-start: 0.2em` when the text wraps. Add a long-label badge to the 320 px demo so the existing overflow test guards it.

### minor: In forced colours the selected theme segment is shown by border colour alone under 560px
File: src/pages/design-system.astro:963-1027
Acceptance item: B4 "colour never carries meaning alone"; B5 forced-colors rules
What is wrong:
- Unchecked segments have `border: 2px solid transparent`, which forced colours paints as CanvasText.
- The checked segment gets `border-color: Highlight`. Its fill is forced to Canvas, so both states have the same 2 px border and background, and differ only in colour (white vs cyan in dark, black vs purple in light).
- Under 560 px the tick is hidden, and under 400 px the icons too. The only remaining cue is colour.
- ThemeToggle in the navigation package will copy this pattern.
How to reproduce: `node scratch/fc.mjs` → `checkedSegment borderTopColor=rgb(26,235,255) backgroundColor=rgb(0,0,0)`, `uncheckedSegment borderTopColor=rgb(255,255,255) backgroundColor=rgba(0,0,0,0)`. Clip: `scratch/focus/forced-segmented.png`.
Suggested fix:
```css
@media (forced-colors: active) {
  .ds-segmented__option { border-color: Canvas; }
  .ds-segmented__option:has(input:checked) {
    forced-color-adjust: none;
    border-color: Highlight;
    background-color: Highlight;
    color: HighlightText;
  }
  .ds-segmented__option:has(input:checked) .ds-segmented__tick { display: inline-flex; }
}
```

### nit: Callout notes have no accessible name
File: src/components/ui/Callout.astro:30-34
What is wrong: `role="note"` is announced as "note" without its visible label, because the label is only the first paragraph inside it.
Suggested fix: give the label `<p>` an id and set `aria-labelledby` on the note (generate the id from `Astro.self` or a counter).

### nit: Eight region landmarks on the reference page
File: src/pages/design-system.astro (every `<section class="ds-section" aria-labelledby>`)
What is wrong: Each named `<section>` becomes a region landmark, so the landmark list has eight regions plus the scrollable tables. This is noisy for screen-reader landmark navigation. It affects this page only, but pages will copy the pattern.
Suggested fix: use plain `<section>` (the h2 already gives structure) or `<div>`. Keep regions for real landmarks.

### Visual and UX

Overall impression. The system is warm, calm and credible for a South African small-business guide:
- Paper background, veld green and rooibos read as friendly and trustworthy, without looking like a bank or a government portal.
- Fraunces headings give character, and Instrument Sans stays legible at 16 to 18 px.
- Dark mode is well tuned: warm near-black, pastel hues, and the danger fill now reads as destructive.
- Button states are unmistakable in both themes: loading keeps its fill with a spinner, disabled is dashed and muted.
- The stronger 18 %/22 % section tints are distinct in light without being garish.
- Illustrations share one 2.5 stroke, round caps and a two-tone fill. They are recognisable and consistent.
- Print output uses the light palette, hides JS-only UI and prints tables whole.

Screenshots: `scratch/shots/{chromium,webkit}-{ds,home}-{320,375,768,1280}-{light,dark}-NN.png`, plus `chromium-*-1280-forced-{light,dark}` and `chromium-*-1280-print`.

### minor: Shweshwe dots sit behind the lead text on phones
File: src/components/ui/SectionHeader.astro:56-82
Acceptance item: general quality ("delight without cost"; legibility)
What is wrong:
- The pattern covers `min(60%, 28rem)` of the header from the inline end.
- At 1280 px that is empty space right of the text.
- At 320 and 375 px it is the right 60 % of the text block, so the 5 px ring motifs run through "never", "Fast", "One" and the code chip.
- In dark (`--st-pattern-ink: 40%`) the ochre rings are clearly visible behind light body text.
- Contrast still passes: the text measures about 5:1 or more against the dot colour. But the dots add visual noise exactly where people read on a cheap phone.
How to reproduce: `scratch/shots/chromium-ds-320-dark-00.png` and `webkit-ds-320-light-00.png`: the hero lead.
Suggested fix: keep the pattern out of the text column on narrow screens.
```css
@media (width < 768px) {
  .st-section-header__pattern {
    inset-block: auto 0;
    block-size: 3rem;
    inline-size: 100%;
    mask-image: linear-gradient(to top, currentcolor 20%, transparent);
  }
  .st-section-header { padding-block-end: var(--st-space-7); }
}
```
Or use `inline-size: 30%` with `--st-pattern-ink` at 20 % under 768 px.

### minor: Two pairs of dark section tints are near twins, and the separation test is too lax to notice
File: src/styles/tokens.css:91-117, 255; tests/unit/tokens-contrast.test.ts ("keeps every section tint distinguishable")
Acceptance item: B4 "section hues … identity"
What is wrong: dark Start here `#3c321f` vs Your kind of business `#3e2d23` are only 6.7 sRGB units apart. Dark Core `#2b3529` vs Paperwork `#2a3531` are 8.1 units apart. On the 1280 dark screenshot, Start vs Types and Core vs Paperwork are told apart mainly by the stripe. The unit test accepts any Euclidean sRGB distance above 5 (out of 441), which is below a just-noticeable difference on a dim phone screen.
How to reproduce: `scratch/shots/chromium-ds-1280-dark-08.png`; values from the swatch panel in `chromium-ds-1280-light-01.png`.
Suggested fix: measure separation in OKLab (ΔE_OK), for example `Math.hypot(ΔL, Δa, Δb) >= 0.03`, then adjust the two dark tints. A per-hue strength keeps everything else unchanged:
```css
/* inside both dark blocks */
--st-hue-start-tint: color-mix(in oklab, var(--st-hue-start) 26%, var(--st-bg));
--st-hue-paperwork-tint: color-mix(in oklab, var(--st-hue-paperwork) 26%, var(--st-bg));
```
Dark text and focus-ring pairs on tints have headroom (≥10.6:1 and ≥5.8:1). Rerun `pnpm test` and add the overrides to the structure test's allowed keys.

### nit: "✓ PASS" wraps onto two lines in the contrast table
File: src/pages/design-system.astro:1107-1121
What is wrong: At 1280 px the Result column breaks "✓" and "PASS" apart in every row (`scratch/shots/chromium-ds-1280-light-01.png`), which makes the table twice as tall as needed.
Suggested fix: `.ds-result { white-space: nowrap; }`.

### nit: Long tint token names break at the hyphen in the swatch grid
File: src/pages/design-system.astro:1064-1067
What is wrong: `--st-hue-branding-tint` and `--st-hue-paperwork-tint` split as "--st-hue-" / "branding-tint" at 1280 px in print and in narrow columns (`scratch/shots/chromium-ds-1280-print-00.png`).
Suggested fix: `.ds-swatch__name { overflow-wrap: normal; word-break: keep-all; }`, and let the grid use `minmax(min(100%, 17rem), 1fr)`.

### Performance

### minor: `assetsInlineLimit: 0` also turns off stylesheet inlining, adding a blocking request per page
File: astro.config.ts:354-356
Acceptance item: C1 `build.inlineStylesheets: 'auto'`; C4 performance
What is wrong:
- Astro's `inlineStylesheets: 'auto'` inlines CSS below `vite.build.assetsInlineLimit`.
- Setting it to 0 to keep scripts external also stops CSS inlining.
- Result: `/` now fetches a separate render-blocking `stoep.DYQNUk6e.css` of 232 bytes (125 gz) for three `.home*` rules. Pass 1 recorded it inline.
- Every future page or component with a small scoped style adds another blocking request.
- The CSP already allows inline styles (`style-src 'unsafe-inline'`).
How to reproduce: `node scratch/dist-audit.mjs` → `index.html` links `stoep.CFQHO2kO.css` and `stoep.DYQNUk6e.css`, with 0 inline `<style>` blocks.
Suggested fix: use Vite's function form so only scripts and `?url` assets are never inlined, for example `assetsInlineLimit: (file) => (/\.(css)$/.test(file) ? undefined : false)`. Confirm with a build that `index.html` gets one `<style>` block and still 0 inline `<script>`. If Astro 7 ignores the function form for stylesheet inlining, document the trade-off in `docs/design-system.md` instead.

### nit: Every CSS file is named `stoep.<hash>.css`
File: astro.config.ts:357-363
What is wrong:
- Three files differ only by hash: the shared base (20.6 KB), the design-system page CSS (28 KB) and the home page CSS (232 B).
- In DevTools, Lighthouse and budget reports you cannot tell which is the shared design system and which is page CSS. As pages are added, there will be dozens of `stoep.*`.
Suggested fix: name only the chunk that contains the tokens `stoep`, and keep Rollup's name for the rest:
```ts
assetFileNames: (asset) =>
  asset.originalFileNames?.some((f) => f.endsWith('src/styles/tokens.css'))
    ? '_astro/stoep.[hash][extname]'
    : '_astro/[name].[hash][extname]',
```
Check against the Astro 7 output: if `originalFileNames` is empty for merged CSS, match on `asset.names` of the layout chunk instead.

### Code and tests

### minor: The axe tests exceed the spec's hard-coded 120s in WebKit under parallel load
File: tests/e2e/design-system.spec.ts:43, 318-337
Acceptance item: C6/E1 (`pnpm gate` runs the WebKit project)
What is wrong:
- `test.describe.configure({ timeout: 120_000 })` overrides the CLI `--timeout`.
- With 8 workers on a loaded machine, both WebKit axe tests timed out at 2.0 min. On one worker they pass in 31.6 s and 34.2 s.
- The page is 179 KB of HTML with about 370 contrast-incomplete nodes, so axe is slow in WebKit.
- A slower CI runner can turn the gate red without any product change.
How to reproduce: `PW_PORT=5031 pnpm exec playwright test tests/e2e/design-system.spec.ts --project=webkit --timeout=120000` (8 workers) → 2 failed with "Test timeout of 120000ms exceeded".
Suggested fix: call `test.slow()` inside the axe tests (it triples the timeout), or `test.setTimeout(300_000)`. Scope axe to the component demos with `.exclude('.ds-contrast')`: the contrast table is 76 rows of `code` and inline-styled samples, and it is checked by the unit test and the panel anyway.

### nit: Inactive `href` buttons drop the `icon-end` slot
File: src/components/ui/Button.astro:90-105
What is wrong: The disabled or loading `<a role="link">` branch renders `icon-start` and the label, but never `iconEnd` or the `icon-end` slot. A disabled "Next →" link loses its arrow and changes width.
Suggested fix: render the same `hasEnd && !loading` block as the `<button>` branch.

### nit: `[aria-invalid='true']` border rule applies to any element with `!important`
File: src/styles/base.css:429-432
What is wrong: A `fieldset`, a radio group `div` or a checkbox with `aria-invalid` gets a forced 2 px red border. Checkboxes ignore it and group containers suddenly gain a box. `!important` also blocks component overrides.
Suggested fix: scope it to `:is(input:not([type='checkbox'], [type='radio']), select, textarea)[aria-invalid='true']` and drop `!important` (specificity is already higher than the base control rule).

### nit: Rendered-contrast test samples only the first match and ignores background images
File: tests/e2e/design-system.spec.ts:393-420
What is wrong: The mutation run proves the test catches a broken component colour, so it is meaningful. It uses `querySelector` (first match only) and composites only `background-color`. Text over the table scroll gradients or the section pattern is not measured. That is acceptable, but the doc says "about 80 component elements", which reads as broader than it is.
Suggested fix: note the two limits in docs "Automated checks", or iterate `querySelectorAll` for the variant selectors.

### nit: Print link URLs are still underlined
File: src/styles/print.css:202-207
What is wrong: `text-decoration: none` on `a::after` has no effect. Decorations propagate from the inline parent into its generated content, so the printed "(https://…)" is underlined along with the link.
Suggested fix: `a[href^='http']::after { display: inline-block; }` removes propagation. Long URLs then need `max-inline-size: 100%` with `overflow-wrap: anywhere`, which is already set.

### Documentation

### minor: No guidance for the plan D5 AI notice and "Sources for this page"
File: docs/design-system.md (Components); src/components/ui/Callout.astro; src/components/ui/Badge.astro
Acceptance item: plan D5 (owner decision 2026-09-15; applies to every page package)
What is wrong:
- D5 needs two things on every content page: a short AI notice near the top, with verification status as text; and a sources list whose entries each show title, "Official" label, link and "what it supports".
- The primitives mostly exist:
  - a Callout (`info` or `official`) can carry the notice, with its icon and visible label;
  - `Badge variant="official"` gives the label as icon plus text;
  - `.st-link-block` gives 44 px stand-alone links.
- But the design system does not say which to use. Without that, each page package will invent its own notice style and source-entry layout.
- The `note` role and "Good to know" default label also fit an AI disclosure poorly.
- This is mainly a later page-package concern. The composition guidance belongs here, so it can move to `backlog.md` with a reason.
Suggested fix: add a short "Notices and sources" section to `docs/design-system.md`. It should cover:
1. the AI notice: `Callout variant="info" label={t('ai.label')} icon="lucide:bot"` placed after the H1 and lead, with the verification status as a sentence, never a colour-only badge;
2. a source entry pattern: a `<ul role="list">` of items, each with the title as a link (`.st-link-block`), `Badge variant="official"` when official, and a `.st-hint` "Supports: …" line;
3. a demo of both on `/design-system/`.
Optionally add `variant="ai"` to Callout (reusing `--st-info-*`, no new colour pairs).

### nit: Docs say the theme control drops its tick under 480px; the code uses 560px
File: docs/design-system.md:222; src/pages/design-system.astro:1010-1015
What is wrong: The doc says "under 480px the tick is dropped". The CSS comment and media query use `width < 560px`.
Suggested fix: change the doc to 560px (or the query to 480px; 560px is not one of the documented breakpoints, so 480px matches the system better).

## Pass-1 findings verification

| # | Pass-1 finding (severity) | Status | Evidence |
|---|---|---|---|
| 1 | Live contrast panel all FAIL in WebKit (blocker) | Resolved | Canvas replaced by computed-style parsing (`color.ts`) plus a token-resolved or `load` wait. WebKit "runtime contrast panel shows zero FAIL (light, dark)" pass; screenshot shows "All 76 pairs pass". |
| 2 | Stacked table labels overlap (major) | Resolved | Grid cells; e2e "labels take their own grid column and never overlap" passes in all 3 projects; `webkit-ds-375-light-11.png`, `chromium-ds-320-light-12.png`. |
| 3 | Ownership: `src/pages/index.astro` (major) | Justified | The pass-2 brief lists `src/pages/index.astro` (placeholder) as owned. The diff stays a placeholder. |
| 4 | `?worker&url` fragile (major) | Resolved | `theme-init.js?url` classic file; other scripts are processed modules; `assetsInlineLimit: 0`; 0 inline scripts; verified under `astro dev` (200, `text/javascript`). New side effect: minor P1. |
| 5 | Stacked cells announce column name twice (minor) | Resolved | `content: attr(data-label) / ''`; ARIA snapshot `cell "High"` in both engines. |
| 6 | TableScroll tab stop when not scrolling (minor) | Resolved | `table-scroll.ts`; e2e test; probe at 320/1280. |
| 7 | Loading button name repeats (minor) | Resolved | `button "Saving" [disabled]`; label `aria-hidden`. |
| 8 | Section header demos insert h2s (minor) | Resolved | `level={4}`; 0 heading skips. |
| 9 | Card ring depends on `:has()` (minor) | Resolved | `@supports not selector(:has(*))` fallback. |
| 10 | `aria-disabled` buttons still activate (minor) | Resolved | `type="button"` while inactive; capture-phase guard in theme-init; click, Enter and Space reach no handler. |
| 11 | Stand-alone footer links < 44px (minor) | Resolved | `.st-link-block`; probe finds 0 small targets at every width. |
| 12 | Loading and disabled look identical (minor) | Resolved | Loading keeps the variant fill and a spinner; disabled is dashed (`chromium-ds-1280-light-06.png`, dark `-06`). |
| 13 | Disabled input has no visual state (minor) | Resolved | Dashed, `--st-surface-2`, muted (`-light-10.png`). |
| 14 | Segmented control wraps on phones (minor) | Resolved | Equal columns on one row at 320 (e2e test, `chromium-ds-320-dark-00.png`); icons full size (e2e 3:1 test). Forced-colour gap: minor A3. |
| 15 | Section tints too close (minor) | Resolved in light, partly in dark | 18 %/22 % strength token and pattern ink 30 %/40 %; light tints distinct. Two dark pairs still near twins: minor V2. |
| 16 | Hero uses cool hue (minor) | Resolved | Hero `section="start"`; code chip uses the surface veil. |
| 17 | Shared CSS named after `Logo` (minor) | Resolved | Now `stoep.[hash].css`; naming scheme refinement in nit P2. |
| 18 | Token parser ignores later overrides (minor) | Resolved | `tokenRules` structure test with a mutation self-test (5 mutations detected). |
| 19 | Pair list misses rendered pairs (minor) | Resolved | 76 pairs incl. callout bodies, links and focus on tints, inverse toast, danger hover. |
| 20 | e2e coverage gaps (minor) | Resolved | CSP/no-inline on both URLs, pre-paint theme, 320 reflow, 44 px targets, stacked table, focus rings, inactive buttons all tested. |
| 21 | axe gives no contrast coverage (minor) | Resolved | Documented; rendered-contrast e2e test added and proven by mutation. |
| 22 | Theme control not a custom element (minor) | Resolved | `<st-theme-toggle>` with `connectedCallback`, cross-instance sync event. |
| 23 | Print sheet-only via `visibility` (minor) | Resolved | `display: none` on non-ancestors via `:has()`; sheet stays in flow. Still unverified until a template page exists (documented known limit). |
| 24 | Doc claims beyond tests (minor) | Resolved | `--st-pattern-display` declared; claims scoped; "Known limits" added. |
| 25 | Low data still fetches preloads (nit) | Justified | Documented in Known limits. |
| 26 | Ring "100%" touches stroke (nit) | Resolved | `font-size: calc(size * 0.22)`; clear in screenshots. |
| 27 | Spacing token names wrap (nit) | Resolved | `max-content` column, `nowrap` (`-light-05.png`). |
| 28 | Type specimen ignores 68ch (nit) | Resolved | `.ds-type > :not(.st-display) { max-inline-size: var(--st-measure) }`. |
| 29 | Display figure plain spaces (nit) | Resolved | U+00A0 in `R 1 234.56`. |
| 30 | Dark danger button soft (nit) | Resolved | `--st-danger-solid: #e0736b` / `#1f0806`, 6.23:1. |
| 31 | Illustrations in unrelated sections (nit) | Resolved | All seven under `types`, plus a labelled hue demo row. |
| 32 | Forced-colour spinner full circle (nit) | Resolved | `forced-color-adjust: none`, transparent right border kept (computed). |
| 33 | Table caption touches ring (nit) | Resolved | `padding-block: var(--st-space-1)`. |
| 34 | theme-color ignores explicit theme (nit) | Resolved | theme-init and toggle update both metas; e2e asserts `#15130f`. |
| 35 | `role=status` + `aria-live`, no info toast (nit) | Resolved | `aria-live` removed; `info` variant added. |
| 36 | Print keeps `.st-btn` link styling (nit) | Resolved | `.st-btn` hidden in print. |
| 37 | No record of manual AT checks (nit) | Justified | Explicitly deferred to the pages packages in Known limits. |

Regressions found: one, minor P1 (CSS no longer inlined, a side effect of the pass-1 script fix). No other regressions: every e2e test that passed in pass 1 still passes, and lint, typecheck, unit tests and build are green.

## Three most valuable remaining design improvements

1. **Make `Icon` and `Badge` safe in real prose.**
   - Set `.st-icon { display: inline-block; vertical-align: -0.125em }`.
   - Let badges wrap instead of `white-space: nowrap`.
   - Every guide page will put ↗ and "Official" markers and applies-to badges inside Afrikaans sentences at 320 px. Today both break layout.
2. **Keep the shweshwe pattern out of the reading column on phones.** On narrow screens, move it to a 3rem band along the bottom of the section header, or thin it to 30 % width at half the ink. The texture should frame the words, not sit under them. Section landings are the first thing readers see on a cheap phone.
3. **Give the dark section tints the same identity as the light ones.**
   - Test tint separation in OKLab (ΔE_OK ≥ 0.03).
   - Lift dark Start here and Paperwork to a 26 % mix, so Start vs Types and Core vs Paperwork read apart without relying on the 6 px stripe.
   - While there, show the D5 AI notice and a source entry on `/design-system/`, so the page packages copy one pattern.
