# WP-50 Phase 3, item 4 (the tools): review pass 3

**NOT CLEAN**: zero blocker, one major, seven minor.

- Branch reviewed: `wp50-p3-tools` at `a98082d` (the pass 2 fixes in `d93acdc`), compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | OK; budgets unchanged (24.3 and 34.9 KB) |
| `pnpm gate:fast` | exit 0; 3,447 tests |
| e2e chromium + mobile + nojs | 1,797 passed, 133 skipped, including every search test |
| axe on the tool pages | 84 passed |
| Layout shift at 320px, fonts held | `/find-my-path/` 0.029; every other tool page 0.015 or less |
| Print | text as documented |
| Confirm dialogs | centred; focus returned to the control that opened them |
| Keyboard and accessibility tree | OK |
| Phone stepper | three states |
| Project rules | OK |

**Mutation probes**:

| Result | Probe |
| --- | --- |
| Caught | `flex-wrap: nowrap` on the missing items (by the sideways-scroll check only) |
| Caught | "(main)" on a single kind of business (by the DOM test) |
| Caught | `.st-visually-hidden-narrow` without its clip (by the sideways-scroll check, English only) |
| Not caught | the glossary link hidden |
| Not caught | the actions heading hidden |
| Not caught | forced-colours `Highlight` instead of `GrayText` for steps to come |
| Not caught | the "Do this next" double ring removed |
| Not caught | `flex-wrap: wrap-reverse` on the dialog's actions |

## Findings

**M1 (major)**: two tools tests check text without checking that it shows. The search test "no results points at the glossary" uses `toHaveText` and the `href` on `.st-search-dialog__more a`. The tax invoice test checks `#st-tool-actions-heading`, but the page top of a `display: none` element is 0. Hiding either passes. Add `toBeVisible()` for both, check the glossary link's 44px row, and re-run both probes (hide the link; hide the heading) to show they now fail, then revert.

**m1 (fix, do not defer)**: My path loses keyboard focus on "Mark as done" (`activeElement` is `BODY`), because `#renderSteps()` re-appends every card. Keep the cards in place when the order has not changed, or put focus back on the same card's button after the re-render. A keyboard or screen-reader user marking steps in order should stay where they were. Add an e2e `toBeFocused` check for "Mark as done" and for the button after it, and a DOM test if practical. Do not change stored data shapes.

**m2**: add tests for:
- `GrayText` on steps to come in forced colours (computed style in a `forcedColors: 'active'` context);
- the "Do this next" double ring and its forced-colours outline;
- the confirm dialog's safe choice visually first on a phone (the y-order of the two buttons at 320px).

Probe each by breaking it.

**m3**: the tax invoice's missing-items test should assert more than one distinct row and every link's right edge inside the list. Probe with `flex-wrap: nowrap`.

**m4**: the axe test "Find my path, question 3 with the answers so far" should tick two kinds of business, so axe sees the bulleted list and "(main)".

**m5**: `.st-tgroup__legend` overflows with text at 200% at 320px in Afrikaans ("Dokumentbesonderhede" ends at 555px). Add `overflow-wrap: anywhere` (and `hyphens: auto` with `lang` set) or `min-inline-size: 0` on the fieldset. Measure English and Afrikaans at 200% and 320px before and after.

**m6**: tidy the duplicate comment lines in `tests/dom/wizard.test.ts`.

**m7**: already in the backlog (the stepper's "done" means "before the current step"); nothing to do.

## Fixed in `63e0716`

- **M1**: both tests now assert `toBeVisible()`, and the glossary link's box is at least 44px tall.
  - Probes (built, run, reverted): with the glossary link hidden (`display: none` on its `li`), both language runs of the search test failed; with `#st-tool-actions-heading` hidden, both runs of the tax invoice test failed.
- **m1**: `placeAfter()` in `src/scripts/my-path.ts` moves a step card, or a page link inside a card, only when it is not already after the one before it. The first render puts the reader's steps in order; later renders move nothing, so the pressed button keeps focus. No stored data changes.
  - `tools.spec.ts`, both languages, presses Enter three times on step 1's own button ("Mark as done", "Remove the tick" / "Haal die merkie af", "Mark as done") and checks it keeps focus after each press. `tests/dom/my-path.test.ts` checks that no element leaves the list while the button is pressed twice and that the button keeps focus.
  - Probe: with the old `my-path.ts`, both e2e runs failed on focus and the DOM test failed.
- **m2**: three new tests in `tools.spec.ts`.
  - **Forced colours, phone stepper:** on question 2 the bars are `Highlight`, `Highlight`, `GrayText`. The test compares against what the browser resolves those system colours to on a probe element, so it does not hard-code a palette.
  - **"Do this next" ring:** the next step's circle has two box shadows and the others none; in forced colours it has a solid outline.
  - **Dialog order:** the dialog's safe choice is above the other at 320px.
  - Probes: `Highlight` for steps to come, the ring's shadows removed, and `flex-wrap: wrap-reverse` on the dialog's actions each failed their test ("Expected: < 288.2, Received: 344.2" for the dialog).
- **m3**: the missing-items test asserts more than one distinct row and every link's right edge inside the list. Probe: with `flex-wrap: nowrap` both runs failed on "more than one row".
- **m4**: the axe test ticks General, then Food, and waits for one visible "(hoof)" before running axe.
- **m5**: the legend is capped at its group's width (`max-inline-size: 100%`), with `overflow-wrap: anywhere` and `hyphens: auto`. The cap is what makes the long word wrap: a fieldset grows to its legend's longest word, so `overflow-wrap` alone was not enough.
  - Measured on the tax invoice at 320px with text at 200%:

    | | `ea15b4a` | `a98082d` | `63e0716` |
    | --- | --- | --- | --- |
    | Afrikaans, widest legend | 477px | 555px | 288px (inside the column) |
    | English, widest legend | 257px | 288px | 288px |
    | At 100% text, both languages | — | unchanged | unchanged |

  - A new test measures each legend's words, not only its box, against the tool's column in both languages. Probe: it fails on the old rule ("Dokumentbesonderhede: 555").
  - The page still scrolls sideways at 200% from older causes, each smaller than at `ea15b4a`: English 38px (the date field; 71px at `ea15b4a`) and Afrikaans 183px (a one-word field label, the translation notice, a note callout; 216px at `ea15b4a`). There is a new backlog row.
- **m6**: the two comment lines are one.
- **m7**: unchanged; the backlog row stands.
