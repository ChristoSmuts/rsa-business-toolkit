# WP-50 Phase 2, review pass 2

**NOT CLEAN: 0 blocker, 1 major, 2 minor, 2 nit.**

- Reviewed: the Phase 2 commits `git log 3437e75..8424427` (13 commits: mock removal, ink focus ring, rooibos only for "In plain words", the Fraunces wght-only cut for h1 and h2, conditional preloads, per-platform fallback faces, gentler reduced motion, `.st-quiet-links`, docs, and the pass 1 fixes), plus `a426007` (the banner test fix). Integration branch `wp50-phase2-int`; review branch `review-p2-pass2` at `a426007`.
- Compared against: `main` at `75ba3ee`, built separately in its own worktree. `main` is behind `3437e75` by some content commits (the closing page, dates, page counts), so text that differs between the two builds is not Phase 2's doing.
- Checklists: `stoep-design` (house rules), `web-interface-guidelines`, `accessibility`, `review-animations`.
- Screenshots: `docs/reviews/WP-50-phase2-pass2/`. Each `cmp-*.png` puts main (left) next to Phase 2 (right), first screen, reduced motion on, fonts loaded. `p2-*.png` are Phase 2 only.
- All probes used my own Playwright scripts against copies of the two `dist/` folders served under `/business-toolkit/`. The numbers in `docs/design-system.md` and in pass 1 were not reused.

## Gate (re-run by the reviewer)

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. ESLint, Prettier and Stylelint clean (no `no-invalid-position-declaration` quirk in this worktree); `astro check` 0 errors, 0 warnings, 0 hints; Vitest 80 files, **3,399 passed**; content drift none; content tests 40 passed |
| `pnpm build` | exit 0. 200 pages (main 208: the 8 mock routes are gone). `dist:audit` no problems; `dist:trust` 74 document pages; `dist:budget`: heaviest document page `/af/business-types/food/` **24.0 KB** (1.0 KB left, same as main), heaviest other `/af/search/` 34.4 KB (main 34.1 KB; the difference is the search index of the newer content, not Phase 2) |
| e2e chromium, mobile, nojs | **1,643 passed**, 95 skipped, 6 failed, all six in `[mobile] search.spec.ts` with `ENOENT … test-results/.playwright-artifacts-N/…`. That was my doing: I ran the banner repeat test (below) in the same worktree while the suite ran, and its start cleared `test-results/`. Re-run of `search.spec.ts` alone in all three projects: 59 passed, 1 failed (`[chromium] Ctrl+K opens it; Escape closes it`, the dialog stayed open after Escape); that test then passed 40/40 (`--repeat-each=20`, chromium and mobile, 8 workers). Phase 2 does not touch the search script or the dialog, so I record it as an existing flake, not a finding |
| `pnpm test:a11y` | exit 0. **420 passed** (8.8 min), both themes |
| Banner test, `--repeat-each=15 --workers=8`, mobile and chromium | **90/90 passed** (1.6 min), run while the full e2e suite and my probes were also running, so under real load |

## Verified independently

**Contrast.** All 77 `CONTRAST_PAIRS`, measured from the live page's computed colours (canvas sampling) on `/design-system/`, in both themes: **0 failures**. Lowest focus pair 11.87:1 light (Look it up tint) and 9.38:1 dark (Paperwork tint); lowest text pair 4.87:1 light (`on-accent` on `accent`) and 5.52:1 dark (link on Paperwork tint); lowest control edge 4.03:1 and 4.01:1 (`border-strong` on `surface-2`). The new badge colours: `on-primary-soft` on `primary-soft` 9.03:1 light, 8.36:1 dark, as the comment in `Badge.astro` says. These agree with `docs/design-system.md` within the browser's `color-mix` rounding the doc now explains.

**Focus ring.** I tabbed through nine pages (home EN and AF, vehicle-dealer, Find my path, a result page, the invoice, the core hub, search, about) at 360px: 885 focus stops in light, dark and forced colours. Every stop has a ring: 3px, `rgb(30,27,22)` light and `rgb(241,236,226)` dark, offset 2px (offset 0 on the three template inputs), and 3px system black in forced colours. The lowest ring against what it sits on was 14.54:1 light and 11.57:1 dark (the "How this was made" link in the AI notice on the Paperwork-tinted callout). The wizard heading and the search chip now use the focus tokens (`Wizard.astro:494`, `search.css:173`).

**Fonts.**

| Mode (home, vehicle-dealer, af food, invoice, Find my path) | Phase 2 font bytes | main |
| --- | --- | --- |
| First visit | 66,738 (Fraunces wght 36,633 + Instrument 30,105); invoice also loads the italic, 98,579 | 97,423; invoice 129,264 |
| Low data (`st.lowData=true`) | **0** on all five, no preload in `<head>` | 97,423 |
| JavaScript off | 66,738; the font requests are started by the parser, so the `<noscript>` preloads work; with low data stored it is still 66,738, as expected (nothing can read storage) | 97,423 |
| Storage blocked (`localStorage` getter throws) | 66,738, `data-st-storage="blocked"`, 2 preloads, no page or console error | |

No third-party request in any mode. With JS on, CDP names `theme-init.js` as the initiator of both font requests.

**The preload trade-off as documented.** Under 150ms latency and 1.6 Mbit/s with the cache off (my runs had other load on the machine): vehicle-dealer at 360px, 7 runs, main fonts start 174ms, finish 1,559ms, FCP 1,136ms; Phase 2 start 391ms, finish 1,394ms, FCP 936ms. Home and AF home at 1280px, 5 runs each: main start 173 to 187ms, FCP 1,088ms; Phase 2 start 365 to 372ms, FCP 888 to 912ms. That matches the new section in `docs/design-system.md` ("fonts start about 190ms later … first paint about 250ms earlier") and the Known limits row; the doc now states the cost honestly. The one claim it leans on that does not hold everywhere is "layout shift at most 0.081 when the fonts arrive late": see major 1.

**Layout shift with `.woff2` held** (released once the page is in place; shift from the release to `fonts.ready` plus 800ms):

| Page and position | 320×568 EN main → P2 | 320×568 AF main → P2 | 1024×768 EN main → P2 | 1024×768 AF main → P2 |
| --- | --- | --- | --- | --- |
| home, top | 0.230 → 0.010 | 0.231 → 0.000 | 0.072 → 0.038 | 1.377 / 0.113 → **0.295** |
| `business-types/food/`, top | 0.229 → 0.000 | 0.231 → 0.000 | 0.007 → 0.011 | 1.377 → 0.002 |
| `business-types/food/`, 1500px | 0.401 → 0.081 | 0.286 → 0.080 | 0.087 → 0.020 | 0.076 → 0.021 |
| vehicle-dealer, top | 0.230 → 0.000 | 0.230 → 0.000 | 0.005 → 0.009 | 0.010 → 0.002 |
| vehicle-dealer, 1500px | 0.401 → 0.077 | 0.286 → 0.037 | 0.070 → 0.054 | 0.777 → 0.017 |
| find-my-path, top | 0.229 → 0.015 | 0.230 → 0.015 | 0.006 → 0.008 | 0.006 → 0.008 |
| find-my-path, first question at 80px | 0.172 → 0.056 | 0.133 → 0.046 | 0.005 → 0.007 | 0.777 → 0.006 |

(Main's 1.377 and 0.777 at 1024px in Afrikaans are its header changing rows when the font arrives, which happens on some runs and not others; Phase 2 fixes that.) I then swept the top of every sitemap page (97) at 1024 and 1280px in both builds. Main has 26 cases over 0.1; Phase 2 has two, both the Afrikaans home page, which is the only page Phase 2 makes worse (major 1).

**Reduced motion** (`reducedMotion: 'reduce'`, home EN and AF, core, vehicle-dealer, Find my path, invoice, checklist, `/design-system/`, search, My path, at 360 and 1280px, scrolled 3,200px): no element or pseudo-element has a running transition of any moving or discrete property (transform, translate, scale, rotate, all, stroke-dashoffset, inset, margins, sizes, visibility, display, overlay); the longest transition is 0.12s; keyframe animations run 0.01ms; a hovered card moves 0.00px. What does run is colour and shadow at 120ms. The new e2e test ("a button that is hidden is gone at once") covers the pass 1 minor 2 fix.

**Print.** Emulated print with a dark colour scheme: the invoice and the checklist print in the light palette (text `rgb(30,27,22)` on transparent); 42/42 checklist links underlined; h1 in Fraunces (`p2-print-template.png`, `p2-print-checklist.png`). The `.st-quiet-links` print rule is in `print.css:78`.

**Screenshots.** 60 pairs: home, the core hub, vehicle-dealer, the invoice and Find my path, at 320/768/1280, light and dark, EN and AF. None has a horizontal scroll in either build. Eleven are committed. Visible Phase 2 changes: h3 and h4 in Instrument Sans (card titles, `cmp-home-af-dark-1280.png`), the Fraunces text cut on h1 and h2, the veld-green business-type badge. Nothing got worse in the loaded state, including Afrikaans at 320px (`cmp-home-af-light-320.png`, `cmp-template-af-light-320.png`, `cmp-fmp-af-light-320.png`). The hub is taller only because main's core section has 10 documents and this branch 11.

**Markup.** `git diff 3437e75..8424427 -- src/components` touches only `Badge.astro` (`<style>`), `Wizard.astro` (`<style>`), `ProgressRing.astro` (comment) and the deleted mock components. `Base.astro` changes only the head. No component markup changed.

**Banner test fix (`a426007`).** Waiting until every `link[rel=stylesheet]` has a `sheet` before taking `before` is the right condition: it is reached before the held fonts, does not depend on module scripts, and the banner and the stylesheets are both in the document by the time `toBeVisible()` passes. 90/90 under load. The other `waitUntil: 'commit'` tests that pass 1 asked about (`interactive.spec.ts:152`, `:169`, `:581`) assert state, not geometry, so they do not need it.

## `review-animations` (by name, over every transition the phase touched)

| Before | After | Why |
| --- | --- | --- |
| `base.css:765` reduced-motion list with `visibility, display, overlay` | Removed (done) | A hidden control vanished 120ms late; now instant, and tested |
| `tokens.css:381` `--st-duration-base/slow` → `--st-duration-fast` under reduced motion | Keep | ≤ 120ms, and nothing moves (measured) |
| `toc.ts` comment on the pill | Keep | Now matches the code; the doc table still says otherwise (nit 1) |

Verdict: **Approve.** No movement survives reduced motion, nothing new moves on load or scroll, no `ease-in`, nothing over 300ms.

## Findings

### major 1: the Afrikaans home page jumps on desktop when the fonts arrive late, three times as much as on main

File: `src/styles/tokens.css:207-208` (`--st-measure: 68ch`, `--st-measure-wide: 90ch`), with the fallback faces at `src/styles/base.css:88-175`; the claim at `docs/design-system.md:204` and `:230-242`

Acceptance item: Measures of done, "Layout shift stays at or below today's level on the home and document pages"; Phase 2, "The fallback fonts' metrics must cut the site-wide shift when the web fonts swap in"

What is wrong: The hero lead on `/af/` wraps to three lines in the fallback font and two in Instrument Sans, so everything below it moves up 32px when the font arrives (`p2-late-font-af-home-1280.png`: fonts held above, arrived below). Layout shift, `.woff2` held then released:

| `/af/`, top | 1024px | 1280px | 1440px |
| --- | --- | --- | --- |
| main | 0.113 (1.377 on runs where its header also wraps) | 0.085 | 0.071 |
| Phase 2 | **0.304** | **0.240** | **0.200** |

It is not an artefact of holding the fonts. A normal load at 1280px with 150ms latency and 1.6 Mbit/s (the conditions of the preload table in `docs/design-system.md`), cache off, gives **0.240 on all 5 runs** against 0.085 on main, because the conditional preload now lands the fonts after first paint (FCP 888ms, fonts finished 1,249ms). The English home page is 0.029 under the same conditions, and in the sweep of all 97 pages at 1024 and 1280px this is the only page Phase 2 makes worse. Google's own line for "good" is 0.1.

The cause is the `ch` unit, not the size-adjust numbers. `ch` is the width of "0" in the first available font. Instrument Sans has wide figures, and the fallback faces were matched on the average width of running text, not on "0", so while the fallback is drawn `1ch` is about 17% narrower: the hero text column (`max-inline-size: var(--st-measure)`) is 680px in the fallback and 816px in the web font (main: 755px, because its fallback face failed on Linux and the unadjusted system font happened to have wider figures). The English lead fits two lines at either width; the Afrikaans one does not. Everything in `ch` has the same property (`--st-measure`, `--st-measure-wide`, `EmptyState` 48ch, `AiNotice` `flex: 1 1 18ch`, the 15ch column in `content.css:176`), and in low data mode every capped paragraph on a wide screen is permanently about 17% narrower than with the fonts (harmless in itself, but not what the measure intends).

The docs present the trade-off the owner accepted as "with the matched fallbacks (layout shift at most 0.081 when the fonts arrive late) a later swap costs a reader little", and "Every case is under 0.1". Both figures come from 320px only, where the measure never binds. The preload decision itself is the owner's and stays; the bounded shift it relies on is what is missing on this page.

How to reproduce: hold `**/*.woff2` with `page.route`, open `/business-toolkit/af/` at 1280×800, wait until every stylesheet has a `sheet`, observe `layout-shift`, release, wait for `document.fonts.ready` + 800ms. Or throttle (150ms, 1.6 Mbit/s, cache off) and read the buffered `layout-shift` entries after load. Scripts: `scratchpad/p2r2/cls-src.mjs`, `cls-throttle.mjs`, `ch.mjs` (session scratchpad).

Suggested fix: give the measures a unit that does not depend on which font is drawn, at the width they have today with the web font: `--st-measure` and `--st-measure-wide` in `em` (68 × the em width of Instrument Sans' "0", measured; the hero column is 816px at 1280px today). As a check of the cause I injected `:root { --st-measure: 43.75em }` (a little narrower than today): the shift on `/af/` fell to 0.003 / 0.038 / 0.032 at 1024 / 1280 / 1440px. Then re-measure the other `ch` uses, add a 1280px Afrikaans home row to the layout-shift table in `docs/design-system.md` (and say the 320px table is 320px only), and add an e2e check (the banner test at 1024px covers the English home only).

### minor 1: the late-font layout-shift table measures one width

File: `docs/design-system.md:230-242`; `tests/e2e/interactive.spec.ts:630` (widths 320, 360, 1024 on the English home)

Acceptance item: Phase 2, "measure at 320px with the fonts held"; general quality

What is wrong: The brief asked for 320px and the table and tests do exactly that, so a desktop-only shift (major 1) had no row to show up in. Separate from fixing major 1, the table should carry a desktop column (1024 or 1280px) for the same pages so a later fallback or measure change is caught.

Suggested fix: add the column, and extend the existing held-font e2e test with `/af/` at 1280px.

### minor 2: one search dialog test failed once in the re-run (not Phase 2)

File: `tests/e2e/search.spec.ts:70-84`

Acceptance item: general quality (flaky gate)

What is wrong: "Ctrl+K opens it; Escape closes it and focus goes back" failed once in chromium (the dialog stayed open after Escape) and then passed 40 of 40. Phase 2 does not touch the dialog or its script, so this is an existing intermittent failure, recorded so the next reviewer can look for it.

Suggested fix: none in this package; note it in `backlog.md` if it recurs.

### nit 1: the `<st-toc>` row still says reduced motion sets the pill's fade to 0

File: `docs/design-system.md:731` ("the pill's fade is a duration token that reduced motion sets to 0")

What is wrong: Since D3 the duration tokens stay at 120ms, and the pill is a keyframe animation that `base.css` finishes in 0.01ms. `toc.ts` was corrected in Phase 2; the doc row was not.

Suggested fix: "the pill's fade is a keyframe animation, which `base.css` finishes at once under reduced motion (see [Motion](#motion))".

### nit 2: `Logo.astro` still sets an `opsz` axis the files no longer have

File: `src/components/illustrations/Logo.astro:74`

What is wrong: Inert since the wght-only files (as `tokens.css:200-204` says, and left to Phase 3 on purpose). Noted only so Phase 3 removes it together with `--st-opsz-*`.

## Not checked

- WebKit (unavailable), real Android (`local('Roboto')` and `local('Noto Serif')`), Georgia and Arial (not installed: the Liberation faces were exercised), NVDA and TalkBack, 200% zoom.
- Whether the measure fix in major 1 changes line lengths elsewhere: that needs the author's measurement of Instrument Sans' "0".
