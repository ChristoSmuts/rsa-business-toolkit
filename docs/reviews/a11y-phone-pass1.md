# a11y-phone review pass 1

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Branch:** `a11y-phone`, from `main` at `bebd0de`.
- **Scope:** the 360px phone pass of the per-page axe sweep: the `a11y-phone` Playwright project,
  the width check in `tests/e2e/a11y.spec.ts`, the `test:a11y*` scripts, the
  `Accessibility (axe, phone)` CI job and `docs/testing.md`.
- **Note:** this file summarises the reviewer's findings as the coordinator relayed them. The
  reviewer's full report text was not passed on.

## What I ran

The reviewer's gate and Playwright runs on the branch tip were not relayed in detail. The verdict
below is theirs.

## Answers

- The phone pass covers every sitemap route in both languages and both themes at 360×740, with the
  same tags, blocking rule and annotations as the 1280px pass. No rule was loosened and nothing was
  excluded.
- A separate project (touch and mobile viewport emulation, its own CI job) is a sound choice over a
  resize inside the desktop test.

## Major findings

None.

## Minor findings

- **m1.** The width check compared `clientWidth` with `page.viewportSize()`, so it would still pass
  if the 360×740 override or `isMobile`/`hasTouch` were lost. Compare with the width the project
  declares (`testInfo.project.use.viewport`), and assert in `tests/unit/e2e-harness.test.ts` that
  `a11y-phone` uses 360×740, `isMobile`, `hasTouch`, reduced motion and its `grep`. The docs
  sentence "the test checks the layout width before it trusts the result" should not suggest that
  it catches sideways overflow; the chromium 320px reflow sweep covers that.
- **m2.** The desktop half fails with visible scrollbars (headed or `--ui` runs). Use
  `window.innerWidth` or allow for the scrollbar. The check sat between `analyze()` and the
  attachment, so a width failure lost the axe JSON; move it before `analyze()` or after the attach.
- **m3.** `docs/testing.md` should say that the phone pass sees the narrow top bar's menus closed
  only, and that the open states (search dialog, menus, confirm dialogs, wizard steps) are covered
  at 360 or 390px by resized desktop contexts without touch.
- **m4.** `docs/testing.md` should say that `pnpm test:a11y` now takes about 16 minutes, and that
  under a 10-minute command limit the two scripts run separately or in the background.
- **m5.** Branch protection: if it lists required checks, `Accessibility (axe, phone)` must be
  added. This is a repository setting; the docs should mention it.
- **m6.** Table formatting in `docs/testing.md`, including the unpadded `pnpm test:a11y` row of the
  command table. Only the padding was asked for.

## Verdict

CLEAN, with minors.

## Resolution

m1 to m4 and the m6 padding were fixed in `f17fff3`. m5 is a repository setting: `docs/testing.md`
now says to add `Accessibility (axe, phone)` to the required checks if branch protection lists
them. The rest of m6 was left as the coordinator asked.
