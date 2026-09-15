# WP-11 Stoep design system: review pass 1 (Reviewer B)

- Reviewer: REVIEWER-B (accessibility, UX, visual quality, performance)
- Worktree: `.claude/worktrees/agent-a2273231b664d89f3`, branch `worktree-agent-a2273231b664d89f3`
- Commit reviewed: `8d9982c` (base `f81a1f8`)
- Date: 2026-09-15
- Scratch evidence (screenshots, probe scripts, JSON): `%TEMP%\claude\C---Projects-Local-business-toolkit\2d511423-486a-4dd5-8e3b-fab6857854dc\scratchpad\wp11-review\` (below: `scratch/`)

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 1 |
| major | 3 |
| minor | 20 |
| nit | 13 |

The foundation is strong. Tokens match plan B4 exactly, both themes are warm and coherent, and the theme is applied before first paint in Chromium and WebKit. Focus rings are clear in light, dark and forced colours. No inline scripts ship, and the CSP equals plan C4. The page reflows at 320px. The work is not mergeable yet, for four reasons:

- The live contrast panel reports every pair as FAIL in WebKit, which turns the WebKit e2e project (part of `pnpm gate`) red.
- The stacked table has overlapping text on phones.
- The diff touches `src/pages/index.astro`, which is outside the design-system allowlist.
- `?worker&url` has a dev-server risk (see the Performance section).

## Commands and output tails

All run by the reviewer in the author worktree.

```
== pnpm lint
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
(stylelint silent = pass)

== pnpm typecheck
$ astro check
Result (41 files):
- 0 errors
- 0 warnings
- 0 hints

== pnpm test
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  2 passed (2)
      Tests  119 passed (119)

== pnpm build
[WARN] [astro-icon] Failed to load icons from "src/icons": ENOENT ... (harmless, no local icon set)
  ├─ /design-system/index.html (+35ms)
  ├─ /index.html (+7ms)
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 2 page(s) built in 3.13s
[build] Complete!
```

Playwright, `PW_PORT=4531`, against `astro preview` on 127.0.0.1:4531, specs `design-system.spec.ts` + `smoke.spec.ts`:

```
===== project chromium
  9 passed (1.7m)

===== project webkit
    Error: expect(locator).toHaveAttribute(expected) failed
    Locator:  locator('[data-contrast-summary]')
    Expected: "0"
    Received: "49"
    ... <p ... data-failures="49" ...>49 of 49 pairs fail (theme: dark).</p>
  4 failed
    [webkit] › design-system.spec.ts:23:3 › renders without console errors or CSP violations
    [webkit] › design-system.spec.ts:83:5 › runtime contrast panel shows zero FAIL (light)
    [webkit] › design-system.spec.ts:83:5 › runtime contrast panel shows zero FAIL (dark)
    [webkit] › design-system.spec.ts:92:5 › axe reports no serious or critical violations (dark)
  5 passed (1.8m)

===== project mobile
  9 passed (3.0m)
```

(The WebKit "axe (light)" test passed in this run while "contrast panel (light)" failed on the same assertion. The assertion is timing-sensitive, because the panel first renders "Measuring…" with no `data-failures`. Treat the WebKit failure as deterministic: the reviewer's own WebKit probe also shows 49/49 FAIL.)

Ownership (`git diff --name-only f81a1f8...HEAD`): 37 files. See major M2.

## Independent verification

### Inline scripts and CSP (built `dist/`)

| File | `<script>` total | inline (no `src`) | CSP meta |
|---|---|---|---|
| `index.html` | 2 (`theme-init` classic, Astro `page.*.js` module) | 0 | present |
| `design-system/index.html` | 4 (`theme-init`, `theme-control` defer, `design-system-contrast` defer, `page.*.js` module) | 0 | present |

The CSP content is byte-identical to plan C4: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'`. It is followed by `<meta name="referrer" content="strict-origin-when-cross-origin">`. The CSP meta comes before the first script. `index.html` carries one inline `<style>` block (`inlineStylesheets: 'auto'`), which `'unsafe-inline'` allows.

### No flash of wrong theme

- `<head>` order (runtime): `meta charset`, `meta viewport`, `meta CSP`, `meta referrer`, `script src` (theme-init, blocking classic, no `defer`/`async`/`type=module`), `title`, then the rest.
- Probe (`scratch/probe.cjs`, "FOUC"): `st.theme=dark` is stored, and a MutationObserver records `data-theme` when `<body>` first exists. Chromium `{ themeAtBody: "dark", jsAtBody: true }`, WebKit `"dark"`. The theme is set before any body content can paint.

### Bytes shipped

`/` (measured from `dist/` and from `performance.getEntriesByType('resource')` against the preview server):

| Asset | Raw | gzip -9 | Transferred (preview) |
|---|---|---|---|
| `index.html` | 3,077 | 1,170 | – |
| JS `theme-init-*.js` | 166 | 172 | 166 |
| JS `page.*.js` (Astro prefetch) | 2,487 | 1,135 | 1,118 |
| **JS total** | **2,653** | **1,307** | **1,284** |
| CSS `Logo.*.css` (shared base CSS) | 19,666 | 5,048 | 5,054 |
| Font `fraunces-latin-opsz-normal` (preloaded) | 67,304 | n/a (woff2) | 67,304 |
| Font `instrument-sans-latin-wght-normal` (preloaded) | 30,092 | n/a | 30,092 |
| **Fonts total** | **97,396** | | |

`/design-system/` adds: HTML 144,417 (13,864 gz), `design-system.*.css` 26,359 (4,642 gz), `theme-control` 768 (403 gz), `design-system-contrast` 1,972 (1,049 gz). It also loads the latin-ext files (59,388 + 11,144) because the diacritics specimen uses ḓ ṱ ṋ ṅ.

Everything is well inside the C4 budgets (script ≤60 KB, stylesheet ≤30 KB, fonts ≤200 KB).

### Other measured results (`scratch/probe-shots.json`, `scratch/probe-clips-a11y-webkit.json`)

- **Horizontal overflow:** none at 320, 375, 768, 1024 or 1280, light and dark, on both pages (`scrollWidth === clientWidth`). The 320px, deviceScaleFactor 1 run stands in for 200% zoom and reflows.
- **axe (all rules, not only serious/critical):** 0 violations on both pages, 1280 and 375, light and dark. `color-contrast` is *incomplete* on 366 to 374 nodes of the design-system page, so axe gives almost no contrast assurance there (see minor T3).
- **Heading order:** no level skips. The outline problem is in minor A5.
- **Landmarks:** banner, main, contentinfo and "On this page" navigation are correct. `lang="en-ZA"`, `dir="ltr"`.
- **SVGs:** 48, none without either `aria-hidden="true"` or `role`. ProgressRings are `role="img"` with a full label ("Part A: 12 of 34 done").
- **Skip link:** first Tab stop, visible (44px high, top 8px), Enter moves focus to `main#main` and the next Tab goes to "Theme". Screenshot `shots/focus/skiplink-375.png`.
- **Card:** single tab stop. The tab sequence after the Print button is "Register your business", "Food business", then out of the grid. No nested interactive content in the demo.
- **Focus rings:** `:focus-visible` matches and the ring is 2px `--st-focus` in light (`rgb(181,86,26)`) and dark (`rgb(232,162,92)`), and 3px system colour in forced colours, for Button, secondary Button, Card (ring on the whole card), TableScroll region, theme radio, input, checkbox and link. See `shots/focus/*-{light,dark,forced}.png`.
- **Reduced motion:** ring and card transition durations are `1e-05s`, spinner `animation-name: none`, `--st-lift: 0px`.
- **TableScroll keyboard:** after focusing the region at 375px, ArrowRight scrolls it (`scrollLeft` 0 → 85; `scratch/recheck.cjs`).
- **Targets:** every control is at least 44×44 except the card title links (28 to 32px high, but the `::after` overlay makes the whole card the target, so this is a false positive) and two standalone footer links (minor A7).
- **Tokens parser mutation test** (`scratch/mutate.ts`): detects a single dark block drift, drift in both dark blocks, a light border below 3:1, a dropped dark token, an unsupported colour syntax (srgb mix, `rgb()`, alpha hex). It does **not** detect an override in a later block (minor T1).
- **Literal colours:** none outside `tokens.css` in `src/**`. `public/favicon.svg` holds hex values, which the unit test checks against tokens.

## Findings

### Accessibility

### blocker: Live contrast panel reports all 49 pairs as FAIL in WebKit, so the gate is red
File: src/scripts/design-system-contrast.ts:12-32
Acceptance item: B7 "live swatches computing contrast at runtime (FAIL shown on drift)"; `pnpm gate` runs `test:e2e` including `--project webkit`
What is wrong: In WebKit (Safari engine), every "Now" ratio is `1.00:1`, every "Now" swatch reads `#000000`, and the summary reads "49 of 49 pairs fail". Safari users of the reference page see false failures, and four WebKit e2e tests fail. Root cause investigation (not fully confirmed):
- **Not stylesheet timing.** Both stylesheets are loaded and `--st-bg` resolves at DOMContentLoaded (`scratch/wktiming.cjs`).
- **Not canvas reuse or `willReadFrequently`.** A reused context returns correct pixels in WebKit (`scratch/wkcanvas.cjs`).
- **The same `resolveToken` code works** when run from a `DOMContentLoaded` listener in WebKit, returning `rgb(30, 27, 22)` → `[30,27,22]` (`scratch/wkdcl.cjs`). The shipped bundle (`dist/_astro/design-system-contrast-*.js`) runs it synchronously while the deferred script executes (`readyState === 'interactive'`), and there `getImageData` yields black. The difference is execution timing inside the defer phase, or canvas readiness at that moment.

Also, `getComputedStyle().color` in WebKit returns `oklab(…)` for the `color-mix` tints, which is why the author used a canvas.
How to reproduce: `PW_PORT=4531 pnpm exec playwright test tests/e2e/design-system.spec.ts --project=webkit`, or open `/design-system/` in Safari.
Suggested fix: Defer the first `update()` until the page has settled, for example `requestAnimationFrame(() => requestAnimationFrame(update))` or the `load` event, and verify in WebKit. Better, avoid the canvas entirely: set `probe.style.color = 'color-mix(in srgb, var(--st-x) 100%, transparent)'`, parse the resulting `rgb()`/`color(srgb …)` string, and handle `oklab()` with the existing `color.ts` maths. Keep the WebKit project in the e2e run for this spec.

### major: Stacked table labels overlap the next row on phones
File: src/components/ui/TableScroll.astro:974-986
Acceptance item: B4 Table "stacked cards under 640px for `wide` tables"; B5 reflow at 320px
What is wrong: The `::before` label is `position: absolute`, so it adds no height. When a label wraps to two lines ("Business type" at 38% of a 300px card) and the value is one line ("Food", "Vehicle dealing"), the second label line ("type") draws on top of the next row's "Effort" label. Afrikaans labels (+25%) will overlap more often.
How to reproduce: Open `/design-system/` at 375px and look at "Table scroll". Screenshots `shots/clips/ds-375-light-08-components-9.png`, `shots/table-wide-375-chromium.png`.
Suggested fix: Make each cell a grid and let the label take up space:
```css
.st-table-scroll[data-wide='true'] tbody :is(td, th)[data-label] {
  display: grid;
  grid-template-columns: minmax(6rem, 38%) 1fr;
  gap: var(--st-space-3);
  padding-inline-start: 0;
}
.st-table-scroll[data-wide='true'] tbody :is(td, th)[data-label]::before {
  position: static;
  inline-size: auto;
}
```
Cell content with mixed inline nodes needs a wrapper span, or use `display: flex` with `::before { flex: 0 0 38% }`. Add a Playwright assertion that no two label boxes intersect at 320px.

### minor: Stacked table cells announce the column name twice
File: src/components/ui/TableScroll.astro:979-981
Acceptance item: general quality (B5 screen reader use)
What is wrong: Table semantics survive `display: block` in Chromium, and headers are still associated. The generated `::before` text is also part of each cell's name, so a screen reader hears "Business type, Business type Food". Playwright's `ariaSnapshot` (DOM-computed, not WebKit's native AX tree) shows `rowheader "Business type Food"` and `cell "Effort High"`. It also shows the table role kept in both engines, but that is Playwright's computation. Real VoiceOver on Safari still needs a manual check, as the author noted.
How to reproduce: `scratch/probe-clips-a11y-webkit.json` → `wideAria375Chromium`, `wideAria375Webkit`.
Suggested fix: `content: attr(data-label) / "";` (alt text for generated content: Chrome 77+, Safari 17.4+; older engines ignore the whole declaration, so declare a plain `content: attr(data-label)` first). For Safari table semantics, add explicit `role="table|row|columnheader|cell"` in the future Table component.

### minor: TableScroll stays a tab stop when nothing scrolls
File: src/components/ui/TableScroll.astro:890-896
Acceptance item: general quality (focus order)
What is wrong: In stacked mode (`scrollWidth <= clientWidth`, `tabIndex: 0`), and for any narrow table on desktop, the region still takes a focus stop with nothing to scroll. With many tables on the checklist or sources pages, that is a lot of empty stops.
How to reproduce: `wideStacked375` in `scratch/probe-clips-a11y-webkit.json`.
Suggested fix: Keep `tabindex="0"` in the HTML (no-JS safety), and let a tiny `st-table-scroll` element remove it (and `role="region"`) when `scrollWidth <= clientWidth`, re-checking on resize.

### minor: Loading button accessible name repeats the label
File: src/components/ui/Button.astro:114-122
Acceptance item: B4 Button "loading `aria-busy`"
What is wrong: The name is the visible label plus the hidden `loadingText`. The demo's loading button is announced "Saving Saving", and a real "Save" button would be "Save Loading".
How to reproduce: `disabledButtons` in `scratch/probe-clips-a11y-webkit.json`.
Suggested fix: While loading, wrap the visible label in `aria-hidden="true"` and expose only `loadingText`. Alternatively, keep the label and put `loadingText` in the page's polite live region instead of inside the button.

### minor: Section header demos insert six h2 headings inside "Components"
File: src/pages/design-system.astro:590-597
Acceptance item: B5 heading order
What is wrong: Under "H2 Components › H3 Section header", the six demos render as H2 ("Start here" … "Look it up"). Then "H3 Empty state" follows, which now sits under "H2 Look it up" in the outline. Screen reader heading navigation shows fake top-level sections.
How to reproduce: `structure.headings` in `scratch/probe-clips-a11y-webkit.json`.
Suggested fix: Allow `level` 3 or 4 on `SectionHeader` and use `level={4}` in the demo.

### minor: Card focus ring depends on `:has()`, with no fallback
File: src/components/ui/Card.astro:352-360, 401-403
Acceptance item: B4 "`:focus-visible` 2px accent ring"
What is wrong: The link's own outline is removed unconditionally, and the card ring only appears through `.st-card:has(.st-card__link:focus-visible)`. Browsers without `:has()` (Safari < 15.4, Firefox < 121, still present on older SA Android devices) show no focus indicator at all.
Suggested fix: `@supports not selector(:has(*)) { .st-card__link:focus-visible { outline: var(--st-focus-width) solid var(--st-focus); outline-offset: var(--st-focus-offset); } }`.

### minor: `aria-disabled` buttons still activate
File: src/components/ui/Button.astro:104
Acceptance item: B4 Button; CLAUDE.md "every page must work without JavaScript"
What is wrong: `disabled` renders `aria-disabled="true"` only. A `type="submit"` still submits, with or without JS, and nothing in the system blocks activation. The rule lives only in documentation.
Suggested fix: For `type="submit"` or `"reset"`, render the native `disabled` attribute (plus `aria-disabled`), or render `type="button"` while inactive. Ship a 10-line delegated click guard in `theme-init` or a shared script (`if (e.target.closest('[aria-disabled="true"]')) e.preventDefault()`).

### minor: Standalone footer links are below the 44px target
File: src/pages/index.astro:22; src/pages/design-system.astro:803
Acceptance item: B5 "target size AAA adopted"
What is wrong: The home "Design system" link measures 94×18 px. It is alone in the footer, so the inline-link exception does not apply. The design-system "Back to the toolkit" link measures 124×19 (it sits in a sentence, so it arguably qualifies as inline).
How to reproduce: `targets` in `scratch/probe-shots.json`.
Suggested fix: `.home-footer a { display: inline-flex; align-items: center; min-block-size: var(--st-target); }`, or a global `.st-link-block` utility.

### nit: Low data still fetches the two preloaded fonts (documented)
File: src/layouts/Base.astro:88-89
Acceptance item: B4 "off under reduced-data"
What is wrong: The CSS side works. With `data-low-data` in the served HTML (`scratch/recheck.cjs`), body and headings use the fallback stacks, the pattern is `display: none`, the latin-ext files are not requested, and only fallback faces load. The two `<link rel="preload">` files (97 KB) are still fetched and then unused, as the author documented. `prefers-reduced-data` cannot be emulated in Playwright and ships in no stable browser.
Suggested fix: Accept this for v1 with a `backlog.md` entry, or drop the Instrument Sans preload (30 KB) and keep only Fraunces.

### Visual and UX

Overall impression: the palette reads as a warm, credible South African small-business guide. The paper background, veld green and rooibos avoid both "bank" and "government portal". Fraunces at optical size 48 gives headings character without being twee. Instrument Sans is legible at 16 to 18px. Dark mode is well tuned: warm near-black, no pure-black cards, pastel hues that stay readable (`shots/clips/ds-1280-dark-*`). Illustrations have a consistent 2.5 stroke, round caps and one hue each, and are recognisable (bakkie, pot, comb and scissors, shop awning, ladder and spanner, laptop and pencil). The issues below are about polish and state clarity.

### minor: Loading and disabled buttons look identical, and loading loses its variant
File: src/components/ui/Button.astro:222-229
Acceptance item: B4 Button states
What is wrong: Both states use a dashed `--st-border-strong` border on `--st-surface-2` with muted text. A primary "Saving" looks exactly like a disabled button, so users think the action failed or is unavailable (`shots/clips/ds-1280-light-08-components-0.png`).
How to reproduce: See the Button demo, rows 1 to 4.
Suggested fix: Scope the dashed style to `[aria-disabled='true']:not([aria-busy='true'])`. For `[aria-busy='true']`, keep the variant colours and set `cursor: progress`. Optionally `opacity: 0.85` on the label, with the spinner carrying the state.

### minor: Disabled text input has no visual disabled state
File: src/styles/base.css:448-455
Acceptance item: B4 form controls; general quality
What is wrong: "Invoice number (set automatically)" looks exactly like an editable field (same `--st-surface` background, border and text colour) in light and dark (`shots/clips/ds-1280-light-09-forms.png`).
Suggested fix:
```css
:is(input, select, textarea):disabled {
  border-style: dashed;
  background-color: var(--st-surface-2);
  color: var(--st-text-muted);
}
```
(`text-muted` on `surface-2` is already a verified pair, 6.31:1 and 6.61:1.)

### minor: Theme segmented control wraps awkwardly on phones
File: src/pages/design-system.astro:906-929
Acceptance item: general quality (the future ThemeToggle will copy this pattern)
What is wrong: At 375px and 320px, "Dark" drops to a second row under "System", leaving a ragged two-row pill (288×102 px at 320px; `shots/clips/ds-375-light-03-theme.png`, `shots/theme-320.png`).
Suggested fix: `.ds-segmented { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; }`, `.ds-segmented__option { justify-content: center; padding-inline: var(--st-space-3); }`. Hide the tick icon under 400px (the filled background already shows the checked state), or stack vertically as full-width rows with `grid-auto-flow: row` below 360px.

### minor: Section tints are too close to tell apart
File: src/styles/tokens.css:88-93
Acceptance item: B4 "section hues … identity"
What is wrong: At 12% over `--st-bg`, Core `#e0e4db`, Paperwork `#e1e6e2` and Look it up `#e3e1e8` read as the same greige. Start here `#ede4d8` and Your kind of business `#f2e2d9` are also near twins (`shots/clips/ds-1280-light-08-components-6.png`). In dark, Core `#21251d` and Paperwork `#212521` are indistinguishable. The stripe carries identity, but the tint, the biggest area of colour on a landing page, does not.
Suggested fix: Raise the mix to 18% light and 22% dark via a token (`--st-tint-strength: 18%`, dark `22%`). Text-on-tint pairs stay above 11:1 at that strength; rerun the unit test. Alternatively, mix in `oklch` to keep chroma. Increase `--st-pattern-ink` to about 30% light so the shweshwe dots show at arm's length on a phone.

### minor: Hero on the reference page uses the cool "Look it up" hue
File: src/pages/design-system.astro:183
Acceptance item: general quality ("warm, not corporate")
What is wrong: The first thing on the page is a lavender-grey panel (`#e3e1e8`), the coolest colour in the system, so the page's first impression is less "stoep" than the rest of it (`shots/clips/ds-1280-light-01-hero.png`). The `<code>` chip (`--st-surface-2`, beige) also looks muddy on the lavender tint.
Suggested fix: `section="start"` (ochre) or `section="core"` for the hero. For code on tints, use `background-color: color-mix(in oklab, var(--st-surface) 70%, transparent)`.

### nit: Progress ring "100%" nearly touches the stroke
File: src/components/ui/ProgressRing.astro:822
What is wrong: At 56px the text is 35px wide inside a 44px inner diameter.
Suggested fix: `font-size: calc(var(--st-ring-size) * 0.22)`, or show a check icon at 100% (the label still carries "34 of 34 done").

### nit: Spacing specimen token names break mid-token at every width
File: src/pages/design-system.astro:1142
What is wrong: "--st-" / "space-1" wraps in the 7.5rem column, even at 1280px (`shots/clips/ds-1280-light-07-tokens.png`).
Suggested fix: `grid-template-columns: max-content 4rem 1fr;` plus `white-space: nowrap` on the code.

### nit: Type specimen body paragraph ignores the 68ch measure it describes
File: src/pages/design-system.astro:1066-1073
What is wrong: The paragraph that says "a measure of about 68 characters" runs about 150ch wide at 1280px.
Suggested fix: `.ds-type > :not(.st-display) { max-inline-size: var(--st-measure); }`.

### nit: Display figure uses a plain space
File: src/pages/design-system.astro:350
What is wrong: `R 1 234.56` renders as "R1 234.56", with the gaps collapsed visually by the tight display tracking, and the spaces can break the number across lines.
Suggested fix: Use U+00A0 or U+202F (narrow no-break space) between groups, and settle the decimal separator in the i18n brief (SA style guides use a comma; the toolkit markdown decides).

### nit: Danger button in dark mode reads soft
File: src/styles/tokens.css:216-217
What is wrong: Pastel pink `#f4a5a0` with dark text looks friendly rather than destructive next to the mint primary button (`shots/clips/ds-1280-dark-08-components-0.png`).
Suggested fix: Optional. Try `--st-danger-solid: #e0736b` with `--st-on-danger-solid: #1f0806` (check ≥4.5:1 in the unit test).

### nit: Illustration demo assigns business types to unrelated sections
File: src/pages/design-system.astro:139-147
What is wrong: Beauty shows as "branding", Retail as "paperwork", Services as "start". Pages will copy the demo.
Suggested fix: Show all seven under `types`, then add one row demonstrating the other hues, labelled as a hue demo.

### nit: Forced colours turn the loading spinner into a plain circle
File: src/components/ui/Button.astro:244-252
What is wrong: The transparent border segment is forced to a system colour (`shots/clips/ds-1280-forced-components-0.png`), so loading looks like a "no" icon.
Suggested fix: In `@media (forced-colors: active)`, draw the spinner with a `conic-gradient` mask, or hide it and rely on the loading text.

### nit: Focused table region caption touches the ring
File: src/components/ui/TableScroll.astro:909-911
Suggested fix: `padding: var(--st-space-1)` on `.st-table-scroll`, or `outline-offset: 0` for the region (`shots/focus/table-dark.png`).

### Performance

### major: `?worker&url` pattern is fragile in dev and for future pages
File: src/layouts/Base.astro:15, 81; src/pages/design-system.astro:30-31, 169-170
Acceptance item: C2 "tiny external blocking script (`is:inline` with Vite-built `src`)"; maintainability
What is wrong: The production output is correct: hashed, import-free classic IIFE files, zero inline scripts. Four concerns remain:
1. `?worker&url` is a Web Worker entry. Vite may add worker-specific preambles in dev (for example `importScripts('/@vite/env')` for classic workers), which throw on `window`. Not verified in this pass (no `astro dev` run); the orchestrator should load `/design-system/` under `pnpm dev` and check the console.
2. Each page script is a separate bundle. `design-system-contrast` inlines its own copy of `color.ts`. Every future script (checklist, search, wizard) would duplicate `nanostores` and `store.ts` instead of sharing chunks, which works against the <25 KB interactive-JS budget.
3. Scripts load as classic `defer` rather than modules, so top-level `import()` code splitting (MiniSearch lazy loading) is unavailable.
4. The pattern hides behind a Vite feature whose semantics are for workers; a future Vite change to worker output would silently break every page.
Suggested fix: Split by need:
- **theme-init** (must block): keep it tiny, author it as plain `src/scripts/theme-init.js`, and import it with `?url` (Vite copies it with a content hash, no worker semantics). Or keep `?worker&url` for this single file and add a dev e2e check.
- **All other scripts**: use normal Astro processed `<script>` tags (bundled as `type="module"`, shared chunks, `import()` works) and stop Astro inlining small ones with `vite: { build: { assetsInlineLimit: 0 } }` in `astro.config.ts`. Astro documents that processed scripts are inlined only below Vite's `assetsInlineLimit`. The reviewer could not rebuild the author worktree to confirm this in Astro 7.3.2, so the orchestrator should verify with a one-line config change and `grep -c '<script>' dist/**/*.html`. The existing "ships no inline scripts" e2e test then guards it. The config change belongs to the scaffold owner.

### minor: Shared base CSS chunk is named after `Logo`
File: dist/_astro/Logo.DDKg_-rN.css (build output)
What is wrong: The global tokens, base, utilities and print CSS ship in a chunk named after the first component that imports scoped CSS. This is harmless for caching, but confusing in Lighthouse and budget reports.
Suggested fix: Optional: `vite.build.rollupOptions.output.assetFileNames` with a stable `stoep-[hash].css` name for the entry CSS.

### nit: `theme-color` ignores an explicit theme choice
File: src/layouts/Base.astro:83-84
What is wrong: A user who picks Dark on a light-mode phone gets a light browser toolbar.
Suggested fix: `theme-init` can update the matching `meta[name=theme-color]` `content` when `st.theme` is set (a few bytes).

### Code and tests

### major: File ownership: `src/pages/index.astro` changed
File: src/pages/index.astro
Acceptance item: D1 ownership (design-system: `src/styles/**`, `Base.astro`, fonts/icons, `docs/design-system.md`, `/design-system/` page)
What is wrong: The home page belongs to the pages package. The rewrite is small (Base layout, Logo, footer link) and useful for the smoke test, but it is outside the allowlist, and D4 treats it as a merge conflict risk with WP-12 and the pages work. Other paths (`src/components/ui/**`, `src/components/illustrations/**`, `src/scripts/**`, `tests/**`, `public/favicon.svg`, the one-line `eslint.config.js` change) match the brief the author received.
How to reproduce: `git diff --name-only f81a1f8...8d9982c`
Suggested fix: If the orchestrator did not pre-approve this, revert `src/pages/index.astro` to the scaffold version and keep the Base layout exercised through `/design-system/` only. If it was approved, record that in the handover and downgrade this finding.

### minor: Token parser ignores later override blocks
File: src/scripts/color.ts:188-210; tests/unit/tokens-contrast.test.ts
Acceptance item: B4 "all pairs verified WCAG"; contrast unit test
What is wrong: `parseTokenBlocks` reads only the first `:root {`, the first dark block and the first system-dark block. Mutation run (`scratch/mutate.ts`): appending `@media screen { :root[data-theme='dark'] { --st-text: #555555; } }`, or a second `:root { --st-text: #bbbbbb }`, passes every unit assertion, although the real cascade would fail contrast badly. The runtime panel would catch it in a browser, but that panel is the part broken in WebKit.
How to reproduce: `node_modules/.bin/tsx scratch/mutate.ts` → rows "UNDETECTED/PASS | appended extra dark override block" and "light block override later in file".
Suggested fix: Add a test that each of the three selectors occurs exactly once in `tokens.css` (outside comments), and that no other `:root` rule declares colour tokens (allow only the reduced-motion and low-data blocks, with a known key set).

### minor: Contrast pair list misses pairs the components render
File: src/scripts/color.ts:22-73
Acceptance item: B4 verified pairs ("plus the pairs the components actually render")
What is wrong: Pairs that are rendered but not checked: `--st-text` on `accent-soft`, `warning-bg`, `info-bg`, `primary-soft` (callout bodies, section header default); `--st-bg` on `--st-text` (default inverse toast); `--st-link` on the callout and status tints; the danger hover `color-mix(danger-solid 82%, text)` with `on-danger-solid`; `--st-focus` on the tints. All pass comfortably today, but the list claims completeness.
Suggested fix: Add these pairs. `resolveColor` already handles the aliases; the hover mix needs the `color-mix` regex to accept `var(--st-text)` as second argument, which it does.

### minor: e2e coverage gaps for the claims the design system makes
File: tests/e2e/design-system.spec.ts
Acceptance item: C6 and B5 automated checks
What is wrong: No e2e assertion covers:
- inline scripts and CSP on `/` (only `/design-system/` is checked);
- theme applied before first paint;
- no horizontal overflow at 320px;
- 44px targets;
- stacked table layout;
- `:focus-visible` outline presence.
The panel tests also race the "Measuring…" state. They wait on `data-failures` with the default 5s timeout, which WebKit on a loaded machine can exceed. The test did not use fixed sleeps, which is good.
Suggested fix: Parametrise the no-inline and CSP test over both URLs. Add a `pageerror`-free FOUC check (MutationObserver at `<body>` creation, as in `scratch/probe.cjs`). Add a 320px `scrollWidth === clientWidth` check and a target-size scan that excludes inline links and the `::after` card links.

### minor: axe runs give almost no contrast coverage on this page
File: tests/e2e/design-system.spec.ts:92-107
What is wrong: `color-contrast` is "incomplete" for 366 to 374 nodes (gradient backgrounds, overlays, inline swatches), so a pass there does not mean contrast was checked. This is expected, but it should not be reported as contrast verification.
Suggested fix: Note it in `docs/design-system.md` under automated checks, and rely on the unit test and runtime panel (once fixed) as the contrast gate.

### minor: Theme control is not the planned custom element
File: src/scripts/theme-control.ts
Acceptance item: C2 "`<st-theme-toggle>` … custom elements wrap Astro-rendered HTML"
What is wrong: A document-level `querySelectorAll('[data-st-theme-control]')` script runs once at DOMContentLoaded. Controls added later (drawer `<dialog>` content, a second toggle) are not wired, and the pattern differs from what C2 prescribes for every other interactive piece.
Suggested fix: Wrap the fieldset in `<st-theme-toggle>` with `connectedCallback`, and move the state into `src/lib/theme.ts` when the interactive package lands. Acceptable to defer, with a backlog entry.

### minor: Print "sheet only" hides with `visibility`, leaving blank pages
File: src/styles/print.css:109-124
Acceptance item: B5 "templates sheet-only"
What is wrong: `visibility: hidden` keeps the layout box of everything else, so a long page prints the sheet and then blank pages for the hidden content. The absolutely positioned sheet can also clip across page breaks.
How to reproduce: Not reproducible yet (no template page exists). Verify when WP templates lands.
Suggested fix: `body:has([data-print-sheet]) > *:not(:has([data-print-sheet]), [data-print-sheet]) { display: none !important; }`, and apply the same rule recursively with a `.st-print-path` class set by the template layout. Drop `position: absolute`.

### nit: `role="status"` plus `aria-live="polite"` on the toast region
File: src/components/ui/ToastRegion.astro:1019-1021
Suggested fix: `role="status"` already implies polite with atomic true. Keep `aria-atomic="false"` if each toast should be read on its own, and remove the redundant `aria-live`. There is also no `info` toast variant, although the docs list one; add `[data-variant='info']` using `--st-info-*`, or change the docs.

### nit: Print keeps button styling on `<a class="st-btn">`
File: src/styles/print.css:23-33
Suggested fix: Add `.st-btn` to the hidden list, or `a.st-btn { border: 0; background: none; color: var(--st-text); padding: 0; }` in print.

### Documentation

### minor: Doc claims the page and tests guard things they do not
File: docs/design-system.md ("Automated checks", "Colour" additions table, "Scripts, CSP and JavaScript budget")
What is wrong:
- `--st-pattern-display` is listed as a token with a light value `block`, but it is not declared in `:root`; components use `var(--st-pattern-display, block)`.
- "an e2e test guards this" (no inline scripts) is true for `/design-system/` only.
- The contrast panel is described as working everywhere; it fails in Safari today.
- The Print section says print was checked, but there is no automated or recorded print check (the reviewer's Chromium PDF could not be rendered locally).
Suggested fix: Declare `--st-pattern-display: block` in `:root` (or fix the table). Scope the claims precisely, and add a "Known limits" subsection: preloads in low data, Safari table semantics, `:has()` focus fallback, axe contrast incompleteness.

### nit: No record of manual assistive-technology checks
File: docs/design-system.md ("Contribution checklist")
Suggested fix: Add a line saying which states were checked with NVDA and TalkBack for this package (plan B5 manual list), or explicitly defer them to the pages packages.

## Three visual improvements with the most impact

1. **Make states unmistakable.** Loading keeps the variant fill with a spinner. Disabled uses dashed muted styling. Disabled inputs get `--st-surface-2` with a dashed border. These three controls are the core of every template and wizard screen.
2. **Give the section tints real identity.** Use an 18% (light) / 22% (dark) tint strength token and a stronger shweshwe ink, so Core, Paperwork and Look it up stop collapsing into one greige. That is where the "warm SA landscape" idea is most visible.
3. **Fix the phone layouts of the two reusable patterns.** Use a grid-based stacked table cell (no overlapping labels) and a non-wrapping, equal-width segmented control. Both will be copied into the checklist, sources and ThemeToggle.
