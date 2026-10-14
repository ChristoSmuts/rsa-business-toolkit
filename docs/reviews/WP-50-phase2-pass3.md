# WP-50 Phase 2, review pass 3

**CLEAN: 0 blocker, 0 major, 2 minor, 2 nit.**

- Reviewed: all of WP-50 Phase 2 as merged, `git log 3437e75..06d0cd6` (mock removal, ink focus ring, rooibos only for "In plain words", the Fraunces wght-only cut for h1 and h2 with conditional preloads in a `<template>` plus a `<noscript>` copy, per-platform fallback faces, gentler reduced motion, `.st-quiet-links`, the pass 1 fixes, the pass 2 fixes (measures in em, the "late web fonts on a wide screen" e2e, docs) and the banner test fix in `interactive.spec.ts`). Review branch `review-p2-pass3` at `06d0cd6`.
- Compared against: `main` at `75ba3ee` and the pre-Phase-2 base `3437e75`, each extracted with `git archive` and built in its own directory. `main` lacks some content commits (the closing page, dates, i18n keys for "sources not opened"), so content-only differences are not Phase 2's.
- Checklists: `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`.
- Probes: my own Playwright scripts (not the suite, not the numbers in `docs/design-system.md` or passes 1 and 2) against copies of the three `dist/` folders served under `/business-toolkit/` by a small static server. Machine fonts: Liberation and DejaVu (no Arial, Georgia, Roboto or Noto Serif).
- Screenshots: `docs/reviews/WP-50-phase2-pass3/`. Each `cmp-*.png` puts main (left) beside Phase 2 (right), first screen, reduced motion on, fonts loaded. `zoom200-*.png` are Phase 2 at 200% zoom (640 CSS px at device scale 2).

## Gate (re-run by the reviewer)

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. ESLint, Prettier, Stylelint clean (no `no-invalid-position-declaration` quirk in this worktree); `astro check` 0 errors, 0 warnings, 0 hints; Vitest 81 files, **3,439 passed**; content drift none; content tests 40 passed |
| `pnpm build` | exit 0. 200 pages. `dist:audit` no problems (27,669 URLs); `dist:trust` 74 document pages; `dist:budget` heaviest document page `/af/business-types/food/` **24.1 KB** (0.9 KB left), heaviest other `/af/search/` 34.8 KB |
| e2e chromium, mobile, nojs (`PW_PORT=4811`) | exit 0. **1,652 passed**, 98 skipped, 0 failed, 0 flaky (19.1 min). The new "late web fonts on a wide screen" tests and the banner test passed |
| `pnpm test:a11y` (`PW_PORT=4812`) | exit 0. **420 passed** (6.8 min), both themes |

## Verified independently

**Contrast.** All 77 `CONTRAST_PAIRS` (read from `color.ts` with tsx), each token resolved live in Chromium and sampled through a canvas, in light and dark, both with `data-theme` and with the system preference: **0 failures in all four runs**. Lowest text pair 4.87:1 light (`on-accent` on `accent`), 5.52:1 dark (link on Paperwork tint); lowest control edge 4.04:1 / 4.02:1 (`border-strong` on `surface-2`); focus ring 11.88:1 to 17.16:1 light, 9.39:1 to 15.76:1 dark; the new pair `primary` on `surface` 8.13:1 / 8.48:1. These agree with `docs/design-system.md` within the `color-mix` rounding its line 74 describes.

**Focus ring, tabbed.** 14 pages (home EN/AF, vehicle-dealer, AF food, Find my path, invoice EN/AF, core, search, about, checklist, paperwork, look-it-up, My path) at 360px, **664 stops each** in light, dark and forced colours. With the ring settled (250ms after Tab) every stop has a 3px solid ring in `rgb(30,27,22)` / `rgb(241,236,226)` (cards draw it on the card through `:has`), and a system-colour ring in forced colours. Lowest ring against what it sits on: 14.54:1 light and 11.57:1 dark ("How this was made" on the Look it up tinted AI notice). Tints, soft callouts, segmented controls and the skip link are covered; the inverse toast holds no focusable control. The only exception is a transient one under reduced motion (minor 1). Separately, on the invoice the first date-range input (`#st-tf-intro-6-r1`) keeps focus through three Tab presses and then loses `:focus-visible`; it does exactly the same on main, so it is not Phase 2 (noted for the templates owner).

**Fonts.**

| Mode (home, AF home, vehicle-dealer, AF food, invoice, Find my path) | Phase 2 font bytes | main |
| --- | --- | --- |
| First visit | 66,738 (invoice 98,579 with the italic); 2 preloads in `<head>` | 97,423 (invoice 129,264) |
| Low data (`st.lowData=true`) | **0** on all six, 0 preloads, `data-low-data` set | 97,423 |
| JavaScript off | 66,738; h1 rendered; no errors | |
| Storage blocked (`localStorage` getter throws) | 66,738, `data-st-storage="blocked"`, 2 preloads, **no page or console error** | |

No request left `localhost` in any mode on either build.

**Layout shift with every `.woff2` held** (released once the stylesheets apply plus 400ms; shift from the release to `fonts.ready` + 800ms), top of every sitemap page (98 in Phase 2, 96 on main), both languages:

| Width | Phase 2 over 0.1 | Phase 2 worst | main over 0.1 | Pages worse than main by > 0.005 |
| --- | --- | --- | --- | --- |
| 320×568 | **0** | 0.025 (`af/paperwork/free-tools/`) | 96 | 0 |
| 1024×800 | **0** | 0.068 (`/af/`) | 17 | 0 |
| 1280×800 | **0** | 0.019 (`core/vehicles/`) | 1 | 1 (`paperwork/free-tools/` 0.004 → 0.009) |
| 1440×800 | **0** | 0.016 (`core/register/`) | 0 | 0 |

That meets the brief (≤ 0.1 everywhere, nothing worse than 75ba3ee beyond noise) and matches the second table in `docs/design-system.md`. I also swept every document page **scrolled 1500px** at 320 and 1280px: at 320px Phase 2 has 3 of 81 over 0.1 (worst 0.127) against 76 on main, none worse than main; at 1280px 6 of 81 against 13 on main, but two pages are worse at that position (minor 2).

**Text column widths.** On 12 pages at 1024, 1280 and 1440px, every element with a length `max-inline-size` (prose, callouts, hero, AI notice, sources, tables, wizard, settings, footer): the Phase 2 measure is 0.975 to 1.041 of main's with the web font (body 816 → 820px at 18px, 816 → 796px at 17.5px; the lead 884 → 920px at 20.2px), and identical in low data mode (fallback) and with the web font. The em conversion holds the columns within a few %, and the fallback now draws the same column.

**Reduced motion.** Ten pages at 360 and 1280px, hovered card and scrolled 3,200px: no element or pseudo-element has a transition of any moving or discrete property (transform, translate, scale, rotate, all, stroke-dashoffset, inset, margins, sizes, visibility, display, overlay); the longest transition is 0.12s; no keyframe animation longer than 0.01ms; a hovered card moves 0.00px; `scroll-behavior: auto`.

**Print** (emulated print, dark colour scheme): invoice, checklist, AF tax, vehicle-dealer and `/design-system/` print in the light palette (`rgb(30,27,22)` on transparent), every visible link in `main` underlined (checklist 42/42), the quiet links show their underline on paper, h1 in Fraunces and h3 in Instrument Sans. PDF page counts equal main's (1, 14, 11, 26, 17).

**Screenshots.** 60 pairs (home, core hub, vehicle-dealer, invoice, Find my path × 320/768/1280 × light/dark × EN/AF). No horizontal scroll in either build. The loaded state is nearly identical to main; visible differences are the Fraunces text cut on h1 and h2, h3/h4 in Instrument Sans, and the veld-green type badge. The hub is taller because main's core section has 10 documents and this branch 11; home at 320px is 33px (EN) and 93px (AF) taller because of newer copy in the AI notice.

**200% zoom** (640 CSS px at scale 2) and 400% (320 at scale 4), vehicle-dealer and invoice in both languages: no horizontal scroll, no clipped text, nothing past the viewport outside table scrollers, on both builds.

**Budget.** `/af/business-types/food/` by my own count of the page's script graph (gzip): base `3437e75` 24,636 B, main 24,621 B, Phase 2 **24,716 B** (+80 B over base, +95 B over main, still 0.9 KB under 25 KB). Phase 2's own share is `theme-init.js` +23 B (the template move); the rest is `store.js` +39 B, which grew with the "sources not opened" i18n keys of the content fixes, plus 1 to 5 B of chunk-hash churn in other chunks. Within the brief's "~0.1 KB".

**Markup.** `git diff 3437e75..06d0cd6 -- src/components` touches only `<style>` blocks (`AiNotice`, `Badge`, `EmptyState`, `Wizard`), a comment in `ProgressRing`, and the deleted mock components. `Base.astro` changes only the head. No component markup changed. The `.st-quiet-links` utility is used only on `/design-system/` until Phase 3, as intended.

**Pass 2 fixes.** All `ch` lengths are gone from `src/**` (only comments mention them); `--st-measure` 45.56em and `--st-measure-wide` 60.3em; `/af/` now 0.068 / 0.012 / 0.010 at 1024 / 1280 / 1440 (pass 2: 0.304 / 0.240 / 0.200). The new e2e holds `/af/` at 1024 and 1280 and `/` at 1280 to ≤ 0.1 and waits for the stylesheets first; the desktop table and the nit 1 wording are in `docs/design-system.md`.

## `review-animations` (by name, over the transitions the phase touches)

| Before | After | Why |
| --- | --- | --- |
| `base.css:765-767` reduced-motion list includes `outline-color` | Drop `outline-color` from the list, or give `:focus-visible` `transition: none` | Under reduced motion a button's ring fades in from white over 120ms; without reduced motion it is instant (minor 1) |
| `tokens.css` durations capped at 120ms, lift 0 | Keep | Nothing moves (measured) |

Verdict: **Approve** (no Block). No movement survives reduced motion, nothing new moves on load or scroll, no `ease-in`, nothing over 300ms.

## Findings

### minor 1: under reduced motion the focus ring on a button fades in from white

File: `src/styles/base.css:765-767` (the reduced-motion `transition-property` list holds `outline-color`), with `src/components/ui/Button.astro:178-182` (the button's own four durations)

Acceptance item: Phase 2, "gentler, not zero"; general quality (focus visibility)

What is wrong: The reduced-motion list replaces each element's own list, and it contains `outline-color`. A `.st-btn` normally transitions only background, border, colour and transform, so its ring appears at once. Under reduced motion it inherits an `outline-color` transition of 120ms, so the ring starts in the button's resting `outline-color` (`currentcolor`, white on a primary button) and fades to ink. Sampled every 25ms after Tab on the home page's "Find my path" button: `rgb(255,255,255)` → `rgb(147,145,143)` → `rgb(55,52,48)` → `rgb(35,32,27)` → ink. On cream the first two samples are 1.06:1 and 2.98:1. The settled ring is correct (14.54:1 or better everywhere), so this is not a WCAG failure, but it inverts the intent: only readers who asked for less motion get an animated focus ring, and it starts invisible. Main draws it at once in both modes. Cards and other elements with their own transitions behave the same way.

How to reproduce: reduced motion on, open `/business-toolkit/`, Tab to `main a.st-btn`, read `getComputedStyle(el).outlineColor` at 0, 25, 50ms. Script: `scratchpad/p3r/tplfocus2.mjs` (session scratchpad).

Suggested fix: remove `outline-color` from the list (a ring should appear at once, with or without reduced motion), or add `:focus-visible { transition-property: none }` inside the same media query. Extend the "reduced motion keeps short fades" e2e to assert that `outline-color` is not transitioned.

### minor 2: the "at most 0.081 at any width" claim holds only at the top of the page

File: `docs/design-system.md:204` ("layout shift at most 0.081 when the fonts arrive late, at any width"); the measurements behind it at `:230-268`

Acceptance item: Measures of done, "Layout shift stays at or below today's level on the home and document pages"; documentation accuracy

What is wrong: The 320px table measures a few scrolled positions and the desktop table measures the top of the page. Scrolled 1500px into every document page at 1280px with the fonts held, 6 of 81 pages are over 0.1 (main: 13): `branding/already-have-your-name/` 0.262, `af/branding/mood-and-materials/` 0.206, `core/start-here/` 0.198, `af/sources/` 0.196, `start/start-here/` 0.188, `core/running-a-pty-ltd/` 0.115. Two are worse than main and `3437e75` at that position: `branding/already-have-your-name/` 0.058 → 0.262 and `af/sources/` 0.036 → 0.196 (3 runs each, identical). It depends on where the viewport falls: at 800, 1200, 2500 and 3000px Phase 2 is lower on `already-have-your-name`, and `af/sources/` is worse only at 1200 and 1500px. Overall Phase 2 halves what reflows: on `already-have-your-name` at 1280px 6 blocks change height when the font arrives (174px in total) against 12 (344px) on `3437e75`. A reader who follows a search result to a heading deep in a page on a first visit is the one who sees it. This is a residual of matching on average text width (a single line still wraps differently), not a regression of the page as a whole, so it is minor. What is wrong is the sentence the preload trade-off relies on, which overstates the bound.

How to reproduce: hold `**/*.woff2`, open the page at 1280×800, wait for the stylesheets, `scrollTo(0, 1500)`, wait 400ms, release, sum `layout-shift` until `fonts.ready` + 800ms. Scripts: `scratchpad/p3r/cls.mjs <port> 1280 out.json 4 '<regex>' 1500`, `reflow.mjs`.

Suggested fix: say "at most 0.081 at the top of any page at 320 to 1440px, and at the scrolled positions in the first table; deeper positions on a wide screen can still reach about 0.26 on a few pages (fewer than before Phase 2)", and add one scrolled desktop row to the table. Phase 3 (the document page) can look at the worst pages.

### nit 1: a sentence in "Section tints" still speaks of the rooibos ring in the present tense

File: `docs/design-system.md:180` ("the light focus ring on a tint is already the tightest pair in the system", "the worst ring is still 5.10:1")

What is wrong: The paragraph opens with "(history: …)" but the body still reads as current. The light ring on a tint is now 11.88:1 and the dark one 9.39:1.

Suggested fix: put the paragraph in the past tense ("was the tightest pair", "was 5.10:1").

### nit 2: the tokens comment rounds the light tint ring up

File: `src/styles/tokens.css:107` ("at least 11.90:1 light")

What is wrong: Live Chromium gives 11.88:1 for the ring on the Look it up tint; `color.ts` gives 11.90. Line 74 of the design-system doc explains the difference, the comment does not. Harmless.

Suggested fix: none needed; or "about 11.9:1".

## Not checked

- WebKit (unavailable), real Android (`local('Roboto')`, `local('Noto Serif')`), Windows/macOS (`Arial`, `Georgia`): only the Liberation faces were exercised. NVDA and TalkBack.
- Throttled first-visit timing of the conditional preloads (pass 1 and pass 2 measured it; the owner kept the trade-off).
