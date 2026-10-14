# Review: a11y-phone, pass 1

Branch a11y-phone (bd19605) against main bebd0de. Files: playwright.config.ts, tests/e2e/a11y.spec.ts, package.json, .github/workflows/ci.yml, docs/testing.md, tests/unit/e2e-harness.test.ts.

## What I ran

Scratch detached worktree of bd19605, dist/ copied from main, PW_PORT=4917.

- pnpm gate:fast exit 0: prettier clean; astro check 330 files 0 errors 0 warnings; Vitest 81 files, 3437 tests passed; Content drift: none; content tests 40 passed.
- playwright --list per project: chromium 829 in 16 files; mobile 595 in 13; webkit 595 in 13; nojs 438 in 1; a11y 424 in 1; a11y-phone 400 in 1 (2 themes x 200 routes); visual 146 in 1. Existing projects unchanged.
- E2E_ROUTE_LIMIT=12 --project a11y-phone: 24 passed (1.0m).
- Probe with the a11y-phone use block: hover:none true, pointer:coarse true, maxTouchPoints 1, prefers-reduced-motion reduce, innerWidth/clientWidth 360, devicePixelRatio 2.625, Pixel 7 UA. Desktop a11y: 1280, no touch.
- Docs proof reproduced: removing for="sources-for-this-page-more" on the built vehicle-dealer page: a11y 1 passed, a11y-phone 1 failed with "label [critical] Form elements must have labels".
- -g examples checked with --list: each new form selects 1 test; the old " › " form gives No tests found, so the doc fix is right.
- Width assertion: catches a stripped meta viewport (980 vs 360); does not catch a 700px overflowing element (see m1).
- CI YAML parses; a11y-phone needs build.

## Answers

360px with touch and mobile emulation: yes, measured. Both themes and languages: yes, same THEMES loop and discoverPageRoutes(). Nothing loosened; only the interactive-state and search-dialog groups are dropped by the project grep, as documented. CI: both jobs download dist, install Chromium, upload test-results under a11y-report / a11y-phone-report; 30-min timeouts vs 8.0/6.5 min measured; deploy.yml gates on it through workflow_call. No other project changes its spec pickup. No CLAUDE.md rule broken.

## Major findings

None.

## Minor findings

m1. Width assertion is relative to page.viewportSize(); would pass if the 360x740 override or isMobile/hasTouch were lost; harness test doesn't pin the a11y-phone use block; doesn't detect sideways overflow (reflow sweep covers that) so the docs sentence overstates it.

m2. Desktop half depends on headless --hide-scrollbars (clientWidth likely 1265 headed; inferred, not run); assertion between analyze() and attach loses the axe JSON on failure.

m3. Docs say the narrow top bar's menus are in what axe sees; only closed. Open states are scanned only by resized desktop contexts without touch.

m4. pnpm test:a11y (and pnpm gate, local-gate scripts) now ~15.7 min, over the 10-minute agent command limit in docs/outstanding-work.md:186.

m5. New check name must be added to required checks if branch protection lists them; neither a11y job uploads playwright-report/.

m6. Cosmetic: unpadded command table row; pre-existing nojs -g "/design-system/" example matches 6 tests; 2c6ac1f message about the Pixel 7 screen.

## Verdict

CLEAN (no majors)

## Fixed in

- m1 to m4 and the m6 padding (the command table row): `f17fff3`.
- m5 is left for the repository owner (branch protection settings). `docs/testing.md` says to add
  `Accessibility (axe, phone)` to the required checks if branch protection lists them.
