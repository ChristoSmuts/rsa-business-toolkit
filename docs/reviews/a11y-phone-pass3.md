# Review: a11y-phone, pass 3

Covers git diff bebd0de...a11y-phone at 293a769 (10 commits). Scratch worktree rev-a11y3, removed; main checkout untouched; dist/ copied from agent worktree at 293a769; PW_PORT=4937; browsers scratchpad/pw3; probe edits reverted.

## What I ran

1. pnpm gate:fast EXIT 0: Prettier clean; astro check 0 errors / 0 warnings; Vitest 81 files, 3438 tests passed; Content drift: none; content tests 40 passed.
2. playwright --list branch vs main (bebd0de config, a11y.spec.ts, timeouts.ts temporarily): chromium 829, mobile 595, webkit 595, nojs 438, a11y 424, visual 146 identical to main. a11y-phone 400, titles equal the 400 "axe WCAG 2.1 A/AA" titles in a11y (200 light, 200 dark, 198 under /af/). Groups not run on the phone: interactive states open (14), Find my path and My path (6), search dialog open (4).
3. E2E_ROUTE_LIMIT=8, both projects, -g "axe WCAG": 32 passed (49.1s).
4. Emulation probe, EN and AF, both themes: a11y-phone iw 360, cw 360, dpr 2.625, hover none, coarse, touch 1, reduced motion, af-ZA/dark seen; a11y iw 1280, cw 1280, dpr 1, fine, touch 0. 16 passed.
5. Phone viewport override removed: e2e fails "the width the project declares / Expected: 360 / Received: 412"; unit test fails "a11y-phone is a 360x740 touch phone" (1 failed | 75 passed).
6. Meta viewport stripped from dist/core/register/index.html: a11y-phone fails "layout width (360 expected; wider means sideways overflow or no meta viewport) / Expected: 360 / Received: 980"; a11y passes.
7. 700px div in <main>: a11y-phone fails Expected 360 Received 700; a11y passes.
8. Visible scrollbars on both projects: 4 passed; a11y iw 1280 cw 1265; a11y-phone 360/360.
9. Config changes vs the unit test: phone grep narrowed to dark: caught; isMobile false: caught; hasTouch false: caught; phone grepInvert /dark theme/: 76 passed (200 tests listed); phone grepInvert /\/af\//: 76 passed (202 listed); phone testIgnore /a11y/: 76 passed (CI would fail on "No tests found"); a11y grepInvert /\/af\//: 76 passed.
10. Full pnpm test:a11y:phone: 400 passed (7.4m), EXIT 0, 446 s wall.
11. -g "dark theme /af/core/register/" selects 1 test in both projects.
12. CI YAML parses; a11y and a11y-phone both need build, 30-min timeout, identical except name, run line and artifact name (if: always()); deploy.yml verify calls ci.yml so a failing phone job blocks deploy.
13. All 10 commit messages Conventional with attribution lines.
14. No CLAUDE.md rule broken.

## Major findings

None. Pass 2 M1 is fixed (run 5).

## Minor findings

m1. Unit test does not catch a theme or language dropped via grepInvert or testIgnore (run 9); assert they are unset on a11y-phone and grepInvert unset on a11y.

m2. Wording suggests a missing meta viewport fails on desktop too; it fails only on the phone (run 6).

m3. Cosmetic: JSDoc lines at playwright.config.ts:35 and tests/e2e/helpers/timeouts.ts:63 run past ~100 columns; the unit test's "other" titles are invented rather than copied (still valid).

m4. Still open for the owner: add "Accessibility (axe, phone)" to required checks if branch protection lists them; docs/testing.md says so.

Verdict: CLEAN (0 major, 4 minor)

## Fixed in 468b928

- m1: the unit test requires `grepInvert` and `testIgnore` to be unset on `a11y-phone` and `grepInvert` to be unset on `a11y`. Rerun of the four run 9 changes that passed before: each now fails the test ("expected /dark theme/ to be undefined", "expected /\/af\// to be undefined" on either project, "expected /a11y/ to be undefined"); the config was restored after each.
- m2: the sweep comment and `docs/testing.md` say that on the phone the check fails on a missing or wrong meta viewport (980) and on sideways overflow, and that on desktop, where Chromium ignores the meta viewport, it only confirms the 1280px viewport.
- m3: the JSDoc lines in `playwright.config.ts` and `tests/e2e/helpers/timeouts.ts` are wrapped to the width of the other comments, and the unit test's titles of the skipped groups are copied from `playwright test --project a11y --list`.
- m4: left for the repository owner (branch protection); `docs/testing.md` already says to add `Accessibility (axe, phone)` to the required checks if branch protection lists them.
