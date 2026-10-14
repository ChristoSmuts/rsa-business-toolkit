# Review: a11y-phone, pass 4

Covers `git diff bebd0de...a11y-phone` at e89b3b2 (12 commits). Scratch worktree `rev-a11y4`, removed afterwards; the main checkout was not touched. `dist/` copied from the builder's worktree, `PW_PORT=4957`, browsers from `scratchpad/pw3`. Every probe edit was reverted.

## What I ran

1. `pnpm gate:fast`, EXIT 0 on a clean tree: Prettier clean; astro check 0 errors, 0 warnings; Vitest 81 files, 3438 tests passed; "Content drift: none."; content tests 40 passed.
2. Other projects against main (main's `playwright.config.ts`, `a11y.spec.ts` and `timeouts.ts` swapped in, then restored): chromium 829, webkit 595, mobile 595, nojs 438 and visual 146 byte-identical; a11y 424 with identical titles. a11y-phone 400, exactly the 400 "axe WCAG 2.1 A/AA" titles of a11y (200 dark, 198 under /af/). Not run on the phone: interactive states open (14), Find my path (6), search dialog open (4).
3. Emulation probe on `core/register/` and `af/business-types/vehicle-dealer/`, both themes, 8 passed. a11y-phone: innerWidth, clientWidth, visualViewport and scrollWidth 360, dpr 2.625, no hover, coarse pointer, touch 1, reduced motion, `af-ZA` dark seen, sources rest list visible. a11y: 1280, dpr 1, hover, fine pointer, touch 0, rest list hidden. Reduced motion survives `setTheme`'s `emulateMedia`; `screen.width` is 360.
4. Visible scrollbars (`--hide-scrollbars` removed from both projects), `E2E_ROUTE_LIMIT=3`: 14 passed; desktop innerWidth 1280, clientWidth 1265; phone 360/360.
5. Mutated `dist/index.html`, both projects, light `/`: a 200px absolute box at left 300 fails the phone with "Expected: 360 Received: 500"; meta viewport `width=1280` fails the phone with "Received: 1280"; a 700px div in `<main>` fails the phone with "Received: 700". a11y passes all three. `html,body{overflow-x:hidden}` plus a 700px div passes both, as expected: clipped overflow does not widen the layout viewport, and the docs point to the reflow sweep for overflow.
6. Declared width: the phone viewport copied from `A11Y_VIEWPORTS.a11y` fails the e2e test ("the width the project declares / Expected: 360 / Received: 1280"). The phone constant changed to 412x839 passes the e2e test, as designed, and fails the unit test ("expected { width: 412, height: 839 } to deeply equal { width: 360, height: 740 }").
7. The documented proof: with `for="sources-for-this-page-more"` removed from the built vehicle-dealer page, a11y-phone fails with "label [critical] Form elements must have labels" and a11y passes.
8. New probe: a top-level `grepInvert: /\/af\//` in `defineConfig` shrinks the phone pass to 202 tests and desktop to 224, and the unit test still passes ("2 passed | 74 skipped"). See m1.
9. Documented `-g` examples select 1 test each; the old " › " form gives "No tests found".
10. `E2E_ROUTE_LIMIT=10 pnpm test:a11y`: 64 passed (1.4m), EXIT 0.
11. `pnpm test:a11y:phone`: 400 passed (5.9m), EXIT 0.
12. CI YAML parses. a11y and a11y-phone both need `build`, have a 30-minute timeout and nine steps identical except the run line and the artifact name (`if: always()`). `deploy.yml` calls `ci.yml`, so a failing phone job blocks deploy.
13. `commitlint --from bebd0de --to HEAD`: found 0 problems, 0 warnings. All 12 commits carry the attribution lines.
14. Only tests, config, CI and docs change; no CLAUDE.md rule broken.

## Major findings

None.

## Minor findings

- m1. The unit test pins only project-level `grep`, `grepInvert` and `testIgnore`. A top-level `grep` or `grepInvert` in `defineConfig` is inherited by every project and is not caught (run 8). The comment "Nothing may take part of the sweep away again" overstates what the test guards.
- m2. Nothing pins the scripts or the CI run lines. Pointing `test:a11y:phone` or the phone job's `run:` line at the desktop project would keep "Accessibility (axe, phone)" green without running the phone pass. The repo has no precedent for pinning `ci.yml` in tests, so this is a suggestion.
- m3. Still open for the owner: add "Accessibility (axe, phone)" to required checks if branch protection lists them. `docs/testing.md` says so.
- m4. Cosmetic: the full phone run took 5.9 min, a little under the documented "about 6.5 to 8.5 min".

Verdict: CLEAN (0 major, 4 minor)

## Fixed after this pass

- m1: the unit test also requires `grep`, `grepInvert` and `testIgnore` to be unset at the top of the config, and the comment says what it guards.
- m2: a new unit test pins the three `test:a11y*` scripts and checks that the `a11y` job runs `test:a11y:desktop` and the `a11y-phone` job runs `test:a11y:phone`. Pointing the phone job at the desktop script fails it.
- m4: `docs/testing.md` gives the phone pass as about 6 to 8.5 min, with the four measured runs.
- m3 stays with the repository owner.

Passes 3 and 4 are two consecutive clean passes, so the branch is ready to merge.
