# WP-50 Phase 3, item 4 (the tools): review pass 4

**NOT CLEAN**: zero blocker, one major, six minor. The behaviour is correct; the major is a gap in the tests.

- Branch reviewed: `wp50-p3-tools` at `cc342d0` (the pass 3 fixes in `63e0716`), compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text, including the whole probe table, is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | OK; budgets unchanged (24.3 and 34.9 KB) |
| `pnpm gate:fast` | exit 0; 3,448 tests |
| e2e chromium + mobile + nojs | 1,800 passed, 136 skipped, 0 failed, run in 8 shards |
| axe on the tool pages | 504 passed |
| Layout shift at 320px, fonts held | `/find-my-path/` 0.029; every other tool page 0.015 or less |
| The legend cap | no side effects at 100% text, at 1280px, in forced colours, in print, or on other fieldsets |
| 200% text | as before |
| Focus fix, by hand | holds for the first, a middle and the last step, by Enter, Space and click, at 320 and 1280px, in English and Afrikaans, and after the answers change in a second tab |
| i18n | 680 keys, identical in both files |

**Mutation probes P1 to P17.** Each probe breaks the code and checks a test fails. The four this pass's findings name were not caught:

| Probe | Caught at `cc342d0` |
| --- | --- |
| P1: `placeAfter` re-inserts every card except the first (`if (wanted !== child \|\| previous !== null)`) | No: the whole suite passes, but Chromium loses focus on every step after the first |
| P2: `Number(dataset.go)` makes the index `"0"` falsy, so the first "Change" does nothing | No |
| P3: `.st-visually-hidden-narrow` widened to 40rem, so the words and tick are hidden at about 500px | No |
| P11: the checklist's phone padding at every width | No |

The other probes, and their results, are in the reviewer's table with the coordinator.

## Findings

**M1 (major)**: the focus-fix tests press only step 1, and the DOM test cannot see the failure. happy-dom treats `insertBefore(x, x)` as a no-op: no mutation records, and focus is kept. Chromium removes the node, re-inserts it and drops focus, so probe P1 passes the whole suite. Fix:
- In `tools.spec.ts`, use a profile with four or more steps (Pty Ltd, Food and General, trading). Loop "Mark as done" and "Remove the tick" over every visible step, at least the first, a middle and the last. Assert `toBeFocused` after each press, in English and Afrikaans.
- Add a test that changes `st.profile.v1` from a second page, through the app's normal path, and checks the order and that focus holds.
- In `tests/dom/my-path.test.ts`, replace the MutationObserver guard with a spy on `insertBefore`, `append`, `prepend` and `replaceChildren`. It should fail on any call after the first render when the order is unchanged, with a note saying why (happy-dom).
- Re-run P1, show both tests catch it, and revert.

**m1**: add a polite status announcement on Mark and Unmark through the existing `announce()` helper, for example "Step 1 done. 1 of 4 done." / "Step 1 not done. 0 of 4 done." Use new i18n keys in both files with the same placeholders, and test it.

**m2**: in `tools.spec.ts`, also click `change.nth(0)` and expect focus on `#wz-h-entity` with "sole proprietor" still checked. Probe with P2.

**m3**: add a check at about 500px that the stepper's words are not clipped and that the tick is drawn on a done step. Probe with P3.

**m4**: the checklist padding test should also assert the wider padding at 1280px. Probe with P11.

**m5**: `TemplateTool.astro`: reword the stale comment above `.st-tool__missing a` ("Each link is a full target, however short its text").

**m6**: nothing to do.

## Fixed in `0d40523`

- **M1**:
  - **Every step, in a real browser.** `tools.spec.ts`, "My path keeps focus on every step", seeds Pty Ltd, Food and General, trading (four steps). For each step it presses Enter ("Mark as done"), checks focus and the new label, presses Space ("Remove the tick"), checks focus, then clicks twice and checks focus again. It runs in English and Afrikaans, at 320 and 1280px, and then checks the cards are still numbered 1 to 4 in order.
  - **Answers changed in a second tab.** A second test opens a second page in the same context and answers Find my path there the normal way, going from sole proprietor and Food to Pty Ltd, Food and General, then "See my path". The first page redraws with the new pages on its path, numbered in order. The same button element (marked before the change) still has focus.
  - **DOM test.** `tests/dom/my-path.test.ts` spies on `insertBefore`, `appendChild`, `append`, `prepend` and `replaceChildren`. Any element moved inside the list after the first render fails it, while every step of a four-step path is pressed twice. Only element arguments count, because happy-dom writes text through the same methods. The comment says why mutation records cannot see the failure.
  - **Probe P1, rebuilt and reverted.** The DOM test fails, and the every-step e2e test fails in all four runs (EN and AF, 320 and 1280px) on `toBeFocused` after step 1. The step-1-only test and the second-tab test pass under P1, as expected: they only press step 1.
- **m1**: each press of "Mark as done" or "Remove the tick" writes to My path's polite status line through `announce()`. The keys are `myPath.stepMarkedDone`, "Step {n} done. {done} of {total} done." / "Stap {n} klaar. {done} van {total} klaar.", and `myPath.stepMarkedNotDone`, "Step {n} not done. {done} of {total} done." / "Stap {n} nie klaar nie. {done} van {total} klaar.". `ParamNames` was regenerated. The every-step e2e test checks the exact text after each press, and a DOM test checks both sentences.
- **m2**: the summary test also clicks the first "Change" and checks focus on `#wz-h-entity` with sole proprietor still checked. Probe P2 makes both language runs fail.
- **m3**: the tick test runs at 500px as well as 1280px: the tick is drawn with a box of its own, its words are not clipped, and the other steps have none. Probe P3 makes the 500px run fail.
- **m4**: the checklist test also checks the padding is 24px at 1280px (`--st-space-5`, not 20px as the finding guessed). Probe P11 makes both language runs fail.
- **m5**: the comment reads "Each link is a full 44px target, however short its text".
- `docs/design-system.md`, "The tools", records the announcement and the focus tests.
