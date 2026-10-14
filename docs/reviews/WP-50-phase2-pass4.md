# WP-50 Phase 2, review pass 4

**CLEAN: 0 blocker, 0 major, 1 minor, 1 nit.**

- Reviewed: all of WP-50 Phase 2 as merged: `git log 3437e75..wp50-phase2` (mock removal, ink focus ring, rooibos only for "In plain words", the Fraunces wght-only cut for h1 and h2, conditional font preloads in a `<template>` plus a `<noscript>` copy, per-platform fallback faces, gentler reduced motion, `.st-quiet-links`, the pass 1 and pass 2 fixes), `a426007` (banner test) and `554a775` (pass 3 fixes). Phase 2 surface diffed as `git diff 75ba3ee 554a775 -- src/styles src/layouts src/components src/scripts/theme-init.js src/pages/design-system.astro docs/design-system.md tests/…`. Review branch `review-p2-pass4` at `554a775`.
- Compared against: `main` at `75ba3ee`, extracted with `git archive` and built in its own directory (208 pages, with the direction mocks). Content-only differences (the core hub has 11 pages, not 10; newer AI-notice dates) are the merged content package's, not Phase 2's.
- Checklists: `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`.
- Probes: my own Playwright scripts against copies of both `dist/` folders served under `/business-toolkit/` by a small static server. Machine fonts: Liberation and DejaVu (no Arial, Georgia, Roboto, Noto Serif), so the Arial and Times faces are the ones exercised.
- Screenshots: `docs/reviews/WP-50-phase2-pass4/` (16 PNG, 1.9 MB). Each `cmp-<page>-<lang>-<theme>-<width>.png` puts main (left) beside Phase 2 (right), first screen, reduced motion, fonts loaded. All 60 pairs (home, core hub, vehicle-dealer, invoice, Find my path × 320/768/1280 × light/dark × EN/AF) were taken and looked at; 16 are kept.

## Gate (re-run by the reviewer)

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. ESLint, Prettier, Stylelint clean (no `no-invalid-position-declaration` quirk in this worktree); `astro check` 0 errors, 0 warnings, 0 hints; Vitest 81 files, **3,439 passed**; content drift none; content tests 40 passed. (The `DOMException … JavaScript file loading is disabled` lines are happy-dom noise from `tests/dom/theme-init.test.ts`, not failures.) |
| `pnpm build` | exit 0. 200 pages. `dist:audit` no problems (27,669 URLs); `dist:trust` 74 document pages, 99 Afrikaans pages; `dist:budget` heaviest document page `/af/business-types/food/` **24.1 KB** (0.9 KB left), heaviest other `/af/search/` 34.8 KB |
| e2e chromium, mobile, nojs (`PW_PORT=4851`) | exit 0. **1,652 passed**, 98 skipped, 0 failed, 0 flaky (18.9 min) |
| `pnpm test:a11y` (`PW_PORT=4852`) | exit 0. **420 passed** (6.4 min), both themes. (A first attempt without `PLAYWRIGHT_BROWSERS_PATH` failed every test at launch with "Executable doesn't exist"; an environment slip of mine, not a finding.) |

## Verified independently

**Markup rule.** `git diff 75ba3ee 554a775 -- src/components src/layouts`: `AiNotice`, `Badge`, `EmptyState`, `Wizard` change only inside `<style>`; `ProgressRing` only a comment; the mock components are deleted; `Base.astro` only the head (preloads moved into `<template data-st-preload>` + `<noscript>`, wght file). The `TemplateTool.astro` hunk (storage-blocked rule) is commit `3f57568`, the content package's, and is also style-only. No component markup changed.

**Contrast.** All 77 `CONTRAST_PAIRS` (read from `color.ts` with tsx), every token resolved live in Chromium and sampled through a canvas, with `data-theme` and with the system preference: **0 failures in all four runs**. Lowest text pair 4.87:1 light (`on-accent` on `accent`), 5.52:1 dark (link on Paperwork tint); lowest control edge 4.04:1 / 4.02:1 (`border-strong` on `surface-2`); focus ring 11.88:1 to 17.16:1 light, 9.39:1 to 15.76:1 dark; `primary` on `surface` 8.13:1 / 8.48:1, on `bg` 7.67:1 / 9.27:1.

**Focus ring.** 15 pages (home EN/AF, core hub, start, paperwork, look-it-up, vehicle-dealer, AF food, Find my path, invoice EN/AF, checklist, search, about, My path) at 360px, tabbed from the top to the end of the page: **679 stops** in each of light, dark and forced colours, each with reduced motion on and off (6 runs). At every stop I read the ring at the keypress and 250ms later: **it was the settled ring at once in all 6 runs** (pass 3's minor 1 is fixed; the e2e now asserts `outline-color` is not in the reduced-motion list). Every stop has a 3px solid ring in `rgb(30,27,22)` / `rgb(241,236,226)` (cards through `:has`), and a system-colour ring in forced colours. Lowest ring against its actual backdrop: 14.54:1 light, 11.57:1 dark (the "How this was made" link on the tinted AI notice); on the paper-coloured header backdrop 14.85:1 / 12.93:1. The only stops without a ring are the invoice's two date inputs on their fourth Tab (the native calendar button inside the input), identical on main (2px rooibos then none), so not Phase 2.

**Keyboard.** Document (vehicle-dealer, 90 stops) and template (invoice EN/AF, 71/72 stops) as above. Find my path EN and AF, reduced motion on and off: radio with arrows, Next, focus goes to the next question's h2 with the 3px ink ring, kind of business with Space, the last question, "See my path" opens `/my-path/`.

**Fonts.**

| Mode (home, AF home, vehicle-dealer, AF food, invoice, Find my path, core) | Phase 2 font bytes (resource timing) | main |
| --- | --- | --- |
| First visit | 66,712 (invoice 98,540 with the italic); 2 preloads in `<head>` | 97,396 (invoice 129,224) |
| Low data (`st.lowData=true`) | **0** on all seven, 0 preloads, `data-low-data` set | 97,396 |
| JavaScript off | 66,712; h1 rendered; no errors | |
| Storage blocked (`localStorage` getter throws) | 66,712, `data-st-storage="blocked"`, 2 preloads, **no page or console error** | |

No request left the origin in any mode on either build. In the built HTML the template sits before `theme-init.js`, which is before the first stylesheet, so the moved links land in `<head>` early.

**Preload trade-off in the docs.** `docs/design-system.md:193-204` and `:1157-1158` state the cost honestly: fonts start about 190ms later on a first visit than static preloads would, first paint about 250ms earlier, low data saves all 66,712 bytes, measured from 7 cold runs at 150ms/1.6 Mbit/s, with the earlier understated figure called out, and Phase 5 to check on a real phone. The "at most 0.068 … at the top of every page" sentence is now scoped correctly (pass 3 minor 2). Owner decision respected; no finding.

**Late-font layout shift, every `.woff2` held** (released once every stylesheet has a sheet plus 400ms; shift from the release to `fonts.ready` + 800ms; reduced motion):

| Position | Phase 2 over 0.1 | Phase 2 worst | main over 0.1 | Pages worse than main by > 0.005 |
| --- | --- | --- | --- | --- |
| Top, 320×568, 98 pages | **0** | 0.027 (`branding/branding-prompts/`) | 96 | 0 |
| Top, 1024×800 | **0** | 0.068 (`/af/`) | 33 (worst `/af/` 1.402) | 0 |
| Top, 1280×800 | **0** | 0.019 (`core/vehicles/`) | 1 | 0 |
| Top, 1440×800 | **0** | 0.016 (`core/register/`) | 0 | 0 |
| Scrolled 1500px, 360×740, 74 document pages | 4 | 0.295 (`af/core/running-a-pty-ltd/`) | 20 | 11 (minor 1) |
| Scrolled 1500px, 1280×800, 74 document pages | 6 | 0.262 (`branding/already-have-your-name/`) | 15 | 10, two of them over 0.1 (`branding/already-have-your-name/` 0.059 → 0.262, `af/sources/` 0.016 → 0.196) |

The top-of-page results meet the brief and match the docs' second table. The 1280px scrolled result matches what pass 3 recorded and the docs now state (`docs/design-system.md:269`). The 360px scrolled result is new (minor 1).

**Text column widths.** 12 pages × 1024/1280/1440px, every element with a length `max-inline-size`: Phase 2 is **0.975 to 1.041** of main's with the web font, and identical in low data mode (fallback). Only the lead is outside ±3% (920 against 884px, +4.1%). The em measures hold.

**Reduced motion.** Ten pages at 360 and 1280px, hovered card, scrolled 3,200px, every element and pseudo-element: longest transition (duration + delay) **120ms**; no transition of transform, translate, scale, rotate, all, stroke-dashoffset, inset, margins, sizes, visibility, display, overlay or outline on any element; no keyframe animation longer than 0.01ms; a hovered card moves 0.00px; `scroll-behavior: auto`. Hidden controls therefore go at once. All transitions in `src/` use the duration tokens (Card, Button, links, ProgressRing), so the "durations stay as authored" approach cannot leak a long fade today.

**Print** (print media, dark colour scheme): invoice, checklist, AF tax, vehicle-dealer print in the light palette (`rgb(30,27,22)` on transparent), every visible link in `main` underlined (checklist 42/42, vehicle-dealer 54/54, AF tax 16/16), h1 Fraunces, h3 Instrument Sans (main: Fraunces, the intended D2 change). PDF page counts equal main's (1, 14, 11, 26).

**200% and 400% zoom** (640 CSS px at scale 2, 320 at scale 4), vehicle-dealer and invoice in both languages, Find my path, AF home: no horizontal scroll, no element past the viewport outside table scrollers, on both builds.

**Screenshots.** 60 pairs: no horizontal scroll in either build. The loaded state is nearly identical to main: Fraunces' text cut on h1 and h2 (sturdier, lower contrast), h3/h4 in Instrument Sans, the veld-green type badge. Nothing harder to read; Afrikaans wraps the same or better.

**Budget.** `/af/business-types/food/`, my own count of the static script graph (27 files, gzip -9): main 24,588 B, Phase 2 **24,680 B** (+92 B). `theme-init.js` 995 → 1,031 B gzip (+36 B, the template move and the storage-blocked flag); the rest is the content package's i18n growth in `store.js` and hash churn. Still 0.9 KB under 25 KB.

**Rules.** No literal colours outside `tokens.css` (Stylelint); every focus outline outside forced colours reads `--st-focus-width` / `--st-focus` (remaining `outline: none` are the card link whose card draws the ring, `main:focus`, programmatic `tabindex=-1`, the wizard h2's non-visible focus, and the template's print rules); `accent` is used only by the plain-words callout; `--st-accent-text` is now unused but kept (token names unchanged, as the brief requires); both palette blocks keep their shape (unit test); no new dependency or third-party request.

## `review-animations` (by name, over the transitions the phase touches)

| Before | After | Why |
| --- | --- | --- |
| `base.css:761-772` list of properties kept under reduced motion | Keep | Measured: nothing moves, nothing over 120ms, focus ring and hidden controls instant |
| `tokens.css:390-395` durations capped at 120ms, lift 0 | Keep | Card hover moves 0px |

Verdict: **Approve.** No movement survives reduced motion, nothing new moves on load or scroll, no `ease-in`, nothing over 300ms.

## Findings

### minor 1: on a 360px phone, scrolled into a page, a few documents still jump when the fonts arrive late, three more than on main

File: `src/styles/base.css:133-142` (`Instrument Sans fallback` 400, `size-adjust: 101.32%`); `docs/design-system.md:204`, `:226`, `:230-237`, `:269`

Acceptance item: Measures of done, "Layout shift stays at or below today's level on the home and document pages"; documentation accuracy

What is wrong: Scrolled 1500px into all 74 document pages at 360×740 (a common Android width) with the fonts held, 4 pages shift more than 0.1 when the fonts arrive (main: 20), and 11 are worse than main by more than 0.005. Three of those are over 0.1 and were under it on main: `af/core/running-a-pty-ltd/` 0.042 → **0.295** (3 runs: 0.295, 0.296, 0.296; main varied 0.043 to 0.158), `af/core/working-from-home-and-safety/` 0.033 → 0.117, `af/core/tax-and-sars/` 0.111 → 0.159. It depends on where the viewport falls. On `af/core/running-a-pty-ltd/` at 800 / 1500 / 2500 / 4000px Phase 2 gives 0.124 / 0.295 / 0.127 / 0.384 against main's 0.046 / 0.158 / 0.207 / 0.302, and the other two pages are lower than main at 800 and 2500px. At 320×568 the same page gives 0.003 against main's 0.405. So taken over the whole site Phase 2 still cuts the scrolled shift a lot (20 → 4 pages over 0.1), but deep positions on a phone are not "0.08 or less". The docs' first table measures only two pages at one depth at 320px, and the desktop paragraph at `:269` implies the phone case is clean.

The mechanism differs from main. On main the fallback was wider, so text lost lines when the font came. In Phase 2 every reflowed block **gains** one line: on `af/core/running-a-pty-ltd/` at 1500px, 7 blocks above the viewport each grow by about 25px (+206px), including the AI notice and the translation notice. On this machine the laid-out fallback text is narrower than Instrument Sans, not as wide. Measured with DOM spans over all `main p, li` text at 18px: fallback/web **0.954 (EN) to 0.966 (AF)**, against the 1.000 the docs at `:226` describe. Unadjusted Liberation Sans scaled by 1.0132 gives 0.967 to 0.980 on the same text. So part of the gap appears only once `size-adjust` is applied (18.24px glyph advances hinted differently from 18px), and part is in the measurement itself. Android's Roboto face (subpixel positioning, no Liberation) was not measured and may behave differently.

How to reproduce: hold `**/*.woff2`, open `/business-toolkit/af/core/running-a-pty-ltd/` at 360×740, wait for every stylesheet's `sheet`, `scrollTo(0, 1500)`, wait 400ms, release, sum `layout-shift` until `fonts.ready` + 800ms. Scripts (session scratchpad `p4r/`): `cls.mjs <port> <dist> 360 740 1500 out.json 1`, `reflow.mjs <port> <path> 360 740 <y>`, `widthratio2.mjs`, `widthratio3.mjs`.

Suggested fix: (1) In the docs, add a 360px scrolled row to the first table, or a sentence like the desktop one at `:269`: "at 360px, scrolled into a page, 4 of 74 documents still shift more than 0.1 (main: 20); three are worse than main at 1500px". (2) When Phase 3 rechecks the document page, measure `size-adjust` from laid-out text in the adjusted face (not from advance widths at the unadjusted size), check whether about 104% for the Liberation/Arial face closes the gap, and check the Roboto face on a real Android phone in Phase 5. Not a major: no page is harder to read once loaded, the top of every page is under 0.1 at every width, and overall the scrolled shift on a phone fell from 20 pages over 0.1 to 4.

### nit 1: two comments reflowed by `554a775` run past the line length

File: `src/styles/tokens.css:108` (137 characters), `src/styles/base.css:756-758` (102, 101, then a short line "Phase 4 should")

What is wrong: Prettier does not wrap comments, so the pass 3 edits left one very long line and one ragged paragraph. Harmless.

Suggested fix: rewrap both comments at 100 columns.

## Not checked

- WebKit (unavailable), real Android (`local('Roboto')`, `local('Noto Serif')`), Windows/macOS (`Arial`, `Georgia`): only the Liberation faces were exercised. NVDA and TalkBack.
- Throttled first-visit timing of the conditional preloads (measured in pass 1; the owner kept the trade-off; only the docs' wording was judged).
