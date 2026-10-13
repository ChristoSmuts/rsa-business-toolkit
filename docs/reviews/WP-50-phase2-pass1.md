# WP-50 Phase 2, review pass 1

**CLEAN: 0 blocker, 0 major, 4 minor, 3 nit.**

- Reviewed: `git log 3437e75..3bc38cc` (8 commits), merged at `72ac977` on `wp50-phase2-int`. Review branch `review-p2-pass1`.
- Compared against: `main` at `75ba3ee`, built separately. `main` is behind `3437e75` by some content commits, so text that differs between the two builds (dates, page counts, sidebar titles) is not Phase 2's doing.
- Checklists: `stoep-design` (house rules), `web-interface-guidelines`, `accessibility`, `review-animations` (run below).
- Screenshots: `docs/reviews/WP-50-phase2-pass1/`. Each `cmp-*.png` puts main (left) next to Phase 2 (right), first screen, reduced motion on so nothing is captured mid-transition. Each `p2-*.png` is Phase 2 only.

## Gate (re-run by the reviewer)

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. Lint, Prettier and Stylelint clean; `astro check` 0 errors; 80 files and 3,353 tests passed; content drift none; content tests 40 passed |
| `pnpm build` | exit 0. `dist:budget`: heaviest document page `/af/business-types/food/` **24.0 KB** (1.0 KB left), heaviest other `/af/search/` 34.1 KB. Same figures as main. Minified `theme-init.js` is 2,032 bytes (1,059 gzip), against 2,028 (1,023) on main |
| e2e chromium, mobile, nojs | exit 0. **1,647 passed**, 95 skipped (23.5 min) |
| `pnpm test:a11y` | exit 0. **420 passed** (8.6 min) |

## Verified independently

Measurements came from the built `dist/` served under `/business-toolkit/`, using my own Playwright scripts. The numbers in `docs/design-system.md` were not reused.

**Contrast.** I measured all 77 `CONTRAST_PAIRS` from the live page's computed colours (canvas sampling), in both themes. 0 failures. The lowest focus pairs are 11.88:1 light (Look it up tint) and 9.39:1 dark (Paperwork tint). The lowest text pairs are 4.87:1 light (`on-accent` on `accent`) and 5.52:1 dark (link on Paperwork tint). The lowest control edge is 4.04:1 and 4.02:1 (`border-strong` on `surface-2`). These match the documented 11.90, 9.33, 4.87, 5.49 and 4.03/4.01 to within canvas rounding.

**Focus ring.** I tabbed through home in both builds. Phase 2 gives a 3px ring in `rgb(30,27,22)` light and `rgb(241,236,226)` dark, with a 2px offset. Main gave 2px rooibos. I checked it on the top bar, buttons, the language link, the segmented theme control (dark: the ring sits clear of the selected green fill, `p2-theme-seg-system-dark.png`), hub cards on a section tint (`p2-card-hub-light.png`), the dark home button at 320px (`p2-home-btn-dark-320.png`), template inputs (offset 0, ink border plus ring) and dark checklist checkboxes. In forced colours the ring is 3px `CanvasText`, and cards keep the system ring.

**Fonts.**

| Mode (home, vehicle-dealer, af food, invoice) | Phase 2 font bytes | main |
| --- | --- | --- |
| First visit | 66,738 (Fraunces wght 36,633 + Instrument 30,105); invoice also loads the italic, 98,579 | 97,430; invoice 129,271 |
| Low data (`st.lowData=true`) | **0**, no preload in `<head>`, h1 in `Fraunces fallback` | 97,430 |
| JavaScript off | 66,738 (the `<noscript>` copy), page renders | 97,430 |
| Storage blocked (`localStorage` getter throws) | 66,738, `data-st-storage="blocked"`, no page error | 97,430 |

There were no third-party requests in any mode.

**Layout shift when fonts arrive late** at 320×568. Every `.woff2` was held, the page scrolled into place, then the fonts were released. I measured layout shift from the release until `fonts.ready` plus 800ms.

| Page and position | EN main → P2 | AF main → P2 |
| --- | --- | --- |
| home, top | 0.230 → **0.010** | 0.231 → **0.000** |
| `business-types/food/`, 1500px | 0.401 → **0.081** | 0.286 → **0.080** |
| `business-types/vehicle-dealer/`, 1500px | 0.401 → **0.077** | 0.286 → **0.037** |
| vehicle-dealer, top | 0.230 → 0.000 | 0.231 → 0.000 |
| find-my-path, top | 0.230 → 0.015 | 0.230 → 0.015 |
| find-my-path, first question heading at 80px | 0.123 → 0.034 | 0.020 → 0.028 |
| `templates/invoice/`, top | 0.229 → 0.000 | 0.230 → 0.000 |
| header height at 320px, fallback → web font | 217 → 165px | **165 → 165px** (P2, both languages) |

Every case is ≤ 0.1. This machine has Liberation fonts and no Arial, Roboto, Georgia or Noto Serif, so these figures exercise the Liberation faces only. On main the old `Instrument Sans fallback` face reports `status: error` on this machine, which confirms the doc's point that it never matched on Linux.

**Reduced motion.** With `reducedMotion: 'reduce'` I loaded home, core, vehicle-dealer, find-my-path, the invoice, the checklist and `/design-system/` at 360 and 1280px, then scrolled 3,200px in steps:

- No element has a transition of `transform`, `translate`, `scale`, `rotate`, `all`, `stroke-dashoffset`, `inset`, a margin or a size.
- The longest transition is 0.12s.
- Hovering a card moves it 0.00px.
- The keyframe animations (pill, toast) run 0.01ms.

Without reduced motion, the only things that move on load or scroll are the TOC pill fade, the design-system demo toasts and spinner, and the card hover lift. All existed on main, so nothing new moves.

**Print.** I emulated `media: print` with a dark colour scheme on the invoice, the checklist and vehicle-dealer. Text is `rgb(30,27,22)` on transparent (the light palette), and 33/33, 40/40 and 40/40 links in `main` are underlined (`p2-print-template.png`, `p2-print-checklist.png`).

**`.st-quiet-links`** on `/design-system/`:

- Resting: underline with a transparent colour (`p2-quiet-screen.png`).
- Hover: underline in the link colour, 2.25px.
- Focus: ring.
- Forced colours: the underline is painted (`p2-quiet-forced.png`), although the computed value still reads transparent.
- Print: the underline is `rgb(30,27,22)`.

No page uses it yet, as the phase intends.

**Screenshots.** I took 60 pairs: home, the core hub, vehicle-dealer, the invoice and find-my-path, at 320/768/1280, light and dark, EN and AF. Ten are committed. Phase 2's visible changes are h3 and h4 in Instrument Sans (card titles, for example `cmp-home-en-light-1280.png`) and slightly different Fraunces outlines on h1 and h2. No wrapping, truncation or overflow got worse in Afrikaans at 320px (`cmp-home-af-dark-320.png`, `cmp-fmp-af-light-320.png`, `cmp-template-af-light-320.png`). Nothing got worse that I could see.

**Markup.** Component markup is unchanged. `ProgressRing.astro` changes only a comment. `Base.astro` changes only the head. `/design-system/` gains a demo block, which is a page, not a component.

## `review-animations` (by name, over every transition the phase touched)

| Before | After | Why |
| --- | --- | --- |
| `base.css:759` reduced-motion `transition-property: … visibility, display, overlay …` applied to every element | Drop `visibility`, `display` and `overlay` until something needs an exit fade (nothing does today) | The list replaces each element's own list, so it adds properties that element never transitioned. A `.st-btn` hidden with `visibility` now stays visible for 120ms under reduced motion, and only then (minor 2) |
| `tokens.css` reduced motion: `--st-duration-base/slow` → `--st-duration-fast` | Keep | Durations within the 120ms D3 bound; no movement left (measured) |
| `search.css` `.st-search-chip[aria-pressed]` colour swap | Keep | Colour only, no motion added |
| `base.css:410` `a` `text-decoration-thickness` 120ms, ungated hover | Keep (already recorded in `docs/design-system.md`) | Feedback, not movement |

Verdict: **Approve**. No movement survives reduced motion, no new motion on load or scroll, no `ease-in` and no duration over 300ms. Minor 2 is a craft note, not a Block.

## Findings

### minor 1: font preloads now start one round trip later on a first visit, and the doc understates it

File: `docs/design-system.md:195`; `src/layouts/Base.astro:97-110`; `src/scripts/theme-init.js:29-37`

Acceptance item: Phase 2, "no font preloads in low data mode"; Measures of done (layout shift, phone on prepaid data)

What is wrong: The preloads now wait for `theme-init.js` to download and run. The preload scanner cannot see them, and the stylesheets that would request the fonts come after the script, so a first visit starts the font requests about one round trip later. The doc says the cost is about 12ms: "about 370ms, against 358ms when the links were static". I measured 5 runs each at 150ms latency and 1.6 Mbit/s (CDP throttling, 360px), median:

| | font requests start | fonts finished | FCP |
| --- | --- | --- | --- |
| vehicle-dealer, Phase 2 | 381ms | 1398ms | 1044ms |
| vehicle-dealer, main (static preloads) | 173ms | 1490ms | 1124ms |
| home, Phase 2 | 370ms | 1195ms | 880ms |
| home, main | 172ms | 1317ms | 1060ms |

The fonts still *finish* earlier, because the Fraunces file is 30.7 KB smaller. That smaller file could also have been preloaded statically, which would have saved the extra ~200ms for every reader who has low data mode off. The trade-off itself is reasonable: there is no way to read `st.lowData` before the preload scanner runs, and the CSP rules out inline script. But it is presented as almost free when it is not. The fallback metrics now keep the late swap under 0.1, which is why this is minor and not major.

How to reproduce: run `scratchpad/p2r1/timing.mjs` against `dist/` and against main's build, or throttle in DevTools (Slow 3G, cache disabled) and compare the start time of the `.woff2` requests with and without the template.

Suggested fix: correct the figures in `docs/design-system.md:195`, state the one-round-trip cost and why it is accepted, and add a row to Known limits. Note it for the Phase 5 real-phone check.

### minor 2: the reduced-motion rule adds transitions that the default motion does not have

File: `src/styles/base.css:759-761`

Acceptance item: D3 "gentler, not zero" (reduced motion should be a subset of the default motion)

What is wrong: `transition-property: <13 properties> !important` replaces each element's own list instead of filtering it. Durations cycle over the new list, so an element that transitioned only `transform` and `box-shadow` (`.st-card`) or only colours and `transform` (`.st-btn`) now also transitions `opacity`, `visibility` and every colour, at the cycled duration. The visible case is `visibility`. Under reduced motion, a `.st-btn` that is hidden through `visibility` stays visible and clickable for 120ms. Seen on `/find-my-path/` (`st-btn`: `visibility` 120ms on load) and `/templates/invoice/` (`st-tline__remove`: `visibility` 120ms on load and scroll). Without reduced motion these switch instantly, and on main both were 0.01ms. A reader who asked for less motion gets a lingering control that other readers do not. It is small and not movement, hence minor.

How to reproduce: `page.emulateMedia({ reducedMotion: 'reduce' })` on `/templates/invoice/`, then `document.getAnimations().map(a => a.transitionProperty)` after load. It lists `visibility` on `.st-tline__remove`.

Suggested fix: remove `visibility`, `display` and `overlay` from the list now (no transition in `src/` needs them). In Phase 4, prefer gating movement where it is declared (`@media (prefers-reduced-motion: no-preference) { transition: transform … }`) over a global property override, so reduced motion is a true subset.

### minor 3: rooibos is still used for chrome (the business-type badge), contrary to the new rule and the docs

File: `src/components/ui/Badge.astro:87-90` (`data-variant='type'` → `--st-accent-soft` / `--st-on-accent-soft`); claims at `docs/design-system.md:23` and `src/styles/tokens.css:39-43`

Acceptance item: D1 "rooibos only for 'In plain words'"; stoep-design rule 3 and the new do/don't row "Use `--st-accent` for chrome: chips … active states"

What is wrong: The business-type chip on the Find my path result pages (`[stage].astro:70`) and on My path (`my-path.astro:100`) is still rooibos. The docs say "No chrome uses it (the pressed search chip and the prompt stripe moved to veld green)". The search chip and prompt stripe were moved in Phase 2 (`search.css`, `content.css`), so leaving this badge is an omission, not a scope limit. Changing a component's CSS is not a markup change.

How to reproduce: `grep -rn "st-accent" src --include=*.astro`, or open `/find-my-path/result/sole-prop/food/trading/`.

Suggested fix: move the `type` badge to another tint (`--st-primary-soft` or neutral) in Phase 2. Or record it in `docs/design-system.md` as a known exception that Phase 3 removes, and soften "No chrome uses it" until then.

### minor 4: the banner font-swap test is flaky because it measures before the stylesheets apply (not a Phase 2 regression)

File: `tests/e2e/interactive.spec.ts:657-660` (`goto('./', { waitUntil: 'commit' })`, `toBeVisible()`, then `boundingBox()`)

Acceptance item: general quality (a flaky gate); raised by the orchestrator, verified here

What is wrong: The orchestrator reported "banner 50px, then 70px" at 1024px and a 116px difference at 360px under parallel load. These are exactly the banner's heights with no stylesheet applied. `st-lang-banner` is an inline custom element that becomes visible as soon as it is parsed, and its `display: none` / `display: block` rules and the Button sizes live in the page CSS. When the stylesheets are slow, `toBeVisible()` passes on the unstyled element and `before` records the unstyled height. My probe held `.woff2` (and optionally `.css`) and measured the banner at each stage:

| Width | first visible, CSS still pending | CSS in, fonts held | fonts in |
| --- | --- | --- | --- |
| 1024 | **50px** | 70px | 70px |
| 360 | **69px** (185 − 69 = **116**) | 185px | 185px |
| 320 | 88px | 273px | 273px |

Main behaves the same (1024: 50 → 82 → 82; 360: 69 → 237 → 237). With the CSS applied, the banner's height does not change when the web fonts arrive, in either build. The banner is set in the fallback stack only (`LangBanner.astro`), and both the 400 and 700 `Instrument Sans fallback` faces are `loaded` before the web font arrives. Font loading and the fallback metrics are therefore not the cause. Phase 2 actually makes the banner shorter (273 against 288px at 320, 185 against 237px at 360), because its fallback faces now match on Linux. I could not reproduce a failure locally: 48/48 passed with `-g "the banner is as tall" --repeat-each=8 --workers=8`, and 128/128 with `-g "language"`. The pre-Phase-2 failure (total shift 0.109 at 1024px) is consistent with the old unmatched fallback, which Phase 2 fixes (home: 0.230 → 0.010).

How to reproduce: run `scratchpad/p2r1/banner.mjs` (holds `.css` and `.woff2` and measures the banner after `waitUntil: 'commit'`), or add `page.route('**/*.css', …)` with a delay to the test.

Suggested fix (tests): before taking `before`, wait until the CSS applies, for example `await page.goto('./', { waitUntil: 'domcontentloaded' })` (DCL waits for the deferred module scripts, which wait for the stylesheets, and does not wait for the held fonts), or `await expect(banner).toHaveCSS('display', 'block')` plus a check that a stylesheet rule has applied (for example the banner's border width). The same `commit` pattern is used at `interactive.spec.ts:152`, `:169` and `:581`. Check that those measure only after the CSS is in.

### nit 1: the `web-interface-guidelines` override for reduced motion is stale

File: `.claude/skills/web-interface-guidelines/SKILL.md:28`

What is wrong: It still says the rule "sets durations to near zero. Keep that until the design revamp (WP-50) decides otherwise." WP-50 decided otherwise (D3). `review-animations/UPSTREAM.md` was updated; this file was not.

Suggested fix: point the row at D3 and `docs/design-system.md#motion`.

### nit 2: two focus rings keep a literal 2px width now that the token is 3px

File: `src/components/wizard/Wizard.astro:494` (`outline: 2px solid var(--st-focus)`), `src/styles/search.css:173` (`outline-offset: 2px`, width from the token, so this one is only a literal offset)

What is wrong: The question heading's ring in Find my path is 2px while every other ring is 3px. It passes contrast (ink), but the doc says the ring is 3px everywhere.

Suggested fix: use `var(--st-focus-width)` and `var(--st-focus-offset)` (in Phase 3, since `Wizard.astro` is a component).

### nit 3: `design-system.md` "Lowest pair" and the tint table quote focus values to two decimals that a live measurement reproduces only to about 0.05

File: `docs/design-system.md` (Verified contrast, "Lowest pair of each kind")

What is wrong: The values match `color.ts`. A browser measurement gives 11.88 against 11.90 and 9.39 against 9.33, because `color-mix(in oklab)` rounds differently in the browser. This is harmless, but readers may compare them.

Suggested fix: optional. Note that the numbers come from `color.ts`, not from the browser.

## Not checked

- WebKit (unavailable here), real Android (`local('Roboto')` and `local('Noto Serif')` matching, which the docs already list as a known limit), Georgia and Arial (not installed), NVDA and TalkBack, and 200% zoom (I did not take screenshots at 200%).
