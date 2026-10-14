# Review: a11y-phone, pass 2

Scope: git diff bebd0de...a11y-phone excluding docs/reviews/, reviewed at c3d7aa3 (7514e93 only changes the pass 1 review file). Scratch worktrees rev-a11y2 and rev-main, removed afterwards.

## What I ran

1. pnpm gate:fast on the clean branch tree: EXIT 0 (Prettier clean, 0 errors, 81 files / 3438 tests passed, Content drift: none, content 40 passed).
2. playwright --list main vs branch: chromium 829/829, webkit 595/595, mobile 595/595, nojs 438/438, a11y 424/424, visual 146/146, a11y-phone 0/400. The 400 a11y-phone titles are exactly the 400 axe sweep titles in a11y; 24 omitted are the documented interactive-state groups.
3. Emulation probe on /, /af/, /core/register/, /af/core/register/, both themes, both projects (16 passed): a11y-phone {"iw":360,"cw":360,"sw":360,"dpr":2.625,"hoverNone":true,"coarse":true,"touch":1,"rm":true,"mob":true}; a11y iw 1280, fine pointer, touch 0.
4. Meta viewport stripped on /core/register/: a11y passed, a11y-phone failed "layout width Expected: 360 Received: 980".
5. Visible scrollbars (ignoreDefaultArgs --hide-scrollbars): a11y-phone 360/360, a11y 1280/1265 innerWidth/clientWidth, 2 passed.
6. viewport: PHONE_VIEWPORT removed: e2e passes at 412px; unit test fails "a11y-phone is a 360x740 touch phone".
7. Phone grep narrowed to dark: phone lists 200 tests; e2e-harness unit test still 76 passed.
8. Docs' proof reproduced on business-types/vehicle-dealer/: a11y passes, a11y-phone fails "label [critical] Form elements must have labels".
9. 700px div in <main> of /core/register/: a11y-phone fails at the width check, Expected 360 Received 700.
10. Full pnpm test:a11y:phone: 400 passed (8.3m), 502 s wall.
11. Documented -g commands select 1 test each; the " › " form selects 0.
12. CI YAML parses; a11y-phone needs build, 30-min timeout, downloads dist, installs chromium, uploads a11y-phone-report if: always(); deploy.yml gates on it via workflow_call.

## Major findings

M1. The e2e width check does not catch a lost viewport override, though its comment, docs/testing.md and f17fff3 say it does: dropping the override makes the declared viewport Pixel 7's 412 and innerWidth 412, so the check compares the page with itself (run 6). The unit test catches it, but this is a check that silently does not test what it claims.

## Minor findings

m1. Unit test does not pin both themes in the phone grep (run 7).

m2. "Not a test for sideways overflow" is true only on desktop; on the phone overflow fails the width check before axe runs (run 9). Say so and give a clearer message.

m3. Stale "Per-test timeout of the a11y project" comments at playwright.config.ts:34 and tests/e2e/helpers/timeouts.ts:63.

m4. Timings vary by machine (6.5 min documented, 8.3 min measured).

m5. Open top-bar menus and the nav drawer are not scanned anywhere (pre-existing); the docs should say so.

No CLAUDE.md rule broken; nothing excluded or loosened beyond the documented groups.

Verdict: NOT CLEAN (1 major, 5 minor).

## Fixed in 79cef43

- M1: the expected widths are in `tests/e2e/helpers/a11y-viewports.ts` (a11y 1280×720, a11y-phone 360×740), and `playwright.config.ts` builds both projects' viewports from it. The sweep looks the width up by project name (an unknown project throws) and requires the declared viewport to match. Rerun of run 6 with the override removed: the sweep fails "the width the project declares, Expected: 360, Received: 412". The comment and `docs/testing.md` now say what each check catches.
- m1: the unit test requires the phone grep to select sweep titles in both themes, and pins `A11Y_VIEWPORTS` and the unknown-project error.
- m2: the message is "layout width (360 expected; wider means sideways overflow or no meta viewport)". The comment and docs say that overflow fails it on the phone and not on desktop. Rerun of run 9: "Expected: 360, Received: 700" with that message; a11y passed.
- m3: both comments name the two a11y projects.
- m4: the docs give the phone pass as about 6.5 to 8.5 min and the combined run as about 15 to 17 min.
- m5: the docs say the open top-bar menus and the navigation drawer are not scanned by axe anywhere yet.
