# WP-50 Phase 3, item 4 (the tools): review pass 7

**NOT CLEAN**: zero blocker, one major, three minor.

- Branch reviewed: `wp50-p3-tools` at `a2da36f` (the pass 6 fixes in `7910f3d`), compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | OK; budgets unchanged |
| `pnpm gate:fast` | green on the third run; the first two timed out in `tests/dom/applies-all-profiles.test.ts` under load (m3) |
| e2e chromium + mobile + nojs, 16 shards | 1,807 passed, 147 skipped, 4 failed on load timeouts; all 4 passed on a rerun |
| axe | 44 + 24 passed |
| Layout shift | worst 0.029 |
| i18n | 682 keys, identical in both files |
| By hand | Find my path, My path, the dialogs, the templates and search all correct |

**Mutation probes:**

| Probe | What it breaks | Caught at `a2da36f` |
| --- | --- | --- |
| A | `position: relative` removed from `.st-wizard__stepper li`: the tick is drawn at the page's origin | no |
| K | the tick's `inset-inline-start` set to `-3em`: the tick is outside its item | no |
| B | the phone bars no longer share a bottom edge | yes |
| U | the phone's "to come" bar in `--st-border`, not `--st-border-strong` | no |
| F | the template actions heading an `<h2>` changed to a `<p>` | no |
| R | the second ring of "Do this next" removed | yes |

## Findings

**M1**: the "from 30rem a done step shows its tick" test checks that the tick is drawn and not clipped, but not where it is. Assert that the number's `offsetParent` is its `li`, and that the tick's box lies inside the item's start padding and height (or use `elementFromPoint` at its centre). Probes A and K must fail it.

**m1**: the phone stepper's "to come" colour must equal `--st-border-strong` resolved on a probe element, not only differ from the filled colour. Probe U must fail it.

**m2**: assert the template actions heading by role `heading`, not by its words. Probe F must fail it.

**m3**: `tests/dom/applies-all-profiles.test.ts` timed out at 5,000ms at a load average of 14 to 22. Give it a measured per-test timeout or split it per language, and close or update the backlog row "load-sensitive unit tests".

**Audit** (asked with the findings): for every claim in "The tools (WP-50 Phase 3)" in `docs/design-system.md` and every test title in `tests/e2e/tools.spec.ts`, name the test that holds it and run one mutation that breaks it in the real CSS, markup or script. Strengthen or add tests where a mutation passes.

## Fixed in `b8b0f78` and `672c4af`

No change to the site's code; tests, the backlog and the design record only.

- **M1** (`b8b0f78`): "from 30rem a done step shows its tick" asserts that the number's `offsetParent` is its item, and that the tick's box starts at or after the item's left edge, ends inside its start padding and before the words, and lies within its height. Probes A and K each fail it.
- **m1** (`b8b0f78`): "to come, done and current are three bars" compares each bar's colour with `--st-primary` and `--st-border-strong` resolved on a probe element, at all three steps. It also checks that the bars share one bottom edge and that the step's h2 is `--st-text-xl`. Probe U fails it.
- **m2** (`b8b0f78`): the templates test finds "When you are done" / "As jy klaar is" with `getByRole('heading')`. Probe F fails it.
- **m3** (`b8b0f78`): `applies-all-profiles.test.ts` runs one test per document and language (77 tests), each with a measured 10s timeout. Run alone, the slowest document took 529ms (the first one, which includes the warm-up) and the others took 260ms or less. One test for a whole language took about 2.4s. The backlog row is closed.
- **Audit**: 71 mutations over 67 claims and test titles. With the tests at `b8b0f78`, 62 were caught and 9 passed. With `672c4af`, 68 are caught. The other 3 are equivalent mutants: each removes one of two rules that both hold the claim, and the claim stays true on the page. The new tests in `b8b0f78` came from the first part of the audit (the answers strip, My path in print, the legend's face and size, the actions heading in print, the dialog's full-row choices, the search dialog's two link rows, the current step's weight). `672c4af` covers the misses below.

Every mutation was applied to the real file, built, run against the named test, and reverted. `git diff` was clean of mutations before each commit.

## The audit

Tests are named by a unique part of their title in `tools.spec.ts`, unless another file is given. "Caught" is the result with the tests at `b8b0f78`. Where that says no, "after" gives the result with `672c4af`.

### Confirm dialog

| ID | Claim | Mutation | Test | Caught |
| --- | --- | --- | --- | --- |
| C1 | Centred, with the 16px gutter, at 320px | `margin: 0` on `.st-dialog` | `centred "Remove all ticks?"` | yes |
| D1 | Centred at 768 and 1280px | `margin: 0` from 30rem | same | yes |
| C2 | On a phone each choice takes a full row | `flex: 0 0 auto` on the buttons | `each choice takes the full row` | yes |
| C3a | The safe choice comes first (on top) | `flex-wrap: wrap-reverse` | same, and `centred …` | yes |
| C3b | The safe choice has focus | `autofocus` removed from Cancel | same | no: equivalent. `showModal()` focuses the first focusable control, which is Cancel, so the claim holds |
| C3c | The safe choice has focus | `autofocus` moved to the danger button | same | yes |

### Find my path: the stepper

| ID | Claim | Mutation | Test | Caught |
| --- | --- | --- | --- | --- |
| S1 | On a phone the stepper is one row | `flex-direction: column` | `the stepper is one bar` | yes |
| B | The bars share a bottom edge | `align-items: end` removed | `three bars` | yes |
| S2 | Current 10px, done 6px, to come 2px | current bar 6px | `three bars` | yes |
| U | To come is `--st-border-strong` | `--st-border` | `three bars` | yes (`b8b0f78`, m1) |
| S3 | The step's h2 is `--st-text-xl` on a phone | `--st-text-2xl` | `three bars` | yes |
| S4 | No tick on a phone | tick query `width >= 0` | `three bars` | yes |
| S5 | The words are visually hidden below 30rem | cut-off at 20rem | `the stepper is one bar and the first answer is higher` | yes |
| X1 | First answer on the first screen at 360×740 (554 EN / 608 AF) | cut-off at 20rem (the words shown again) | `at 360×740: the first answer is on the first screen` | no; **after: yes**. The test now bounds 554/608px + 16px, not 740px |
| S6 | The words stay in the accessibility tree | `visibility: hidden` in `.st-visually-hidden-narrow` | `keeps its words for assistive technology` | yes |
| A | The tick is positioned against its item | `position: relative` removed from the item | `shows its tick` | yes (`b8b0f78`, M1) |
| K | The tick is in the item's start padding | `inset-inline-start: -3em` | `shows its tick` | yes (`b8b0f78`, M1) |
| S7 | The current step's words are semibold from 30rem | `font-weight` removed | `shows its tick` | yes |
| X5 | Forced colours: done and current are `Highlight` | `GrayText` | `done and current Highlight` | yes |
| S8 | Forced colours: to come is `GrayText` | `Highlight` | same | yes |

### Find my path: the summary and "Change"

| ID | Claim | Mutation | Test | Caught |
| --- | --- | --- | --- | --- |
| W1 | A group, not a landmark | `role="group"` removed | `named after its question` | yes |
| W2 | One kind of business shows no bullet | selector made to match nothing | `no bullet` | yes |
| W3 | No summary without JavaScript | `js-only` removed | `nojs.spec.ts`, `the tools at 320px without JavaScript` | yes |
| W4 | "Change" is named "Change: How you trade" | `aria-label` removed | `named after its question` | yes |
| W6 | The kinds of business are in tick order | `list.append(item)` removed | `answers so far`; `tests/dom/wizard.test.ts` | yes |
| W5 | "(main)" only with two or more | `(main)` on one as well | same | yes |
| P2 | The first "Change" (index 0) goes back to question 1 | index 0 treated as false | `answers so far` | yes |
| X3 | "Change" is a ghost button | `variant="secondary"` | `answers so far` | no; **after: yes** (asserts `data-variant="ghost"`) |
| X4 | "Change" puts focus on the question's heading | the focus call in `go()` removed | `answers so far` | yes |

### My path

| ID | Claim | Mutation | Test | Caught |
| --- | --- | --- | --- | --- |
| R | "Do this next" has a second ring | `box-shadow: none` | `second ring` | yes |
| FC | …and a `CanvasText` outline in forced colours | outline removed | same | yes |
| X2 | "Do this next" has an arrow icon | the `Icon` removed | `moves on as steps are done` | no; **after: yes** (counts the badge's `svg`) |
| R6 | The badge sits above the step's first page | `:has()` without the badge | `sits above` | yes |
| N2 | The badge is on the first step not done and moves on | badge always hidden | `moves on as steps are done` | yes |
| P1 | "Mark as done" keeps focus on every step | every card re-inserted | `on every step`; `tests/dom/my-path.test.ts` | yes |
| F1b | Pages inside a step are in profile order | `placeAfter` for pages removed | `reordered in a second page` | yes |
| Q1 | The message counts every done step | counts only the pressed one | `on every step` | yes |
| Q2 | Silent on a redraw | announces on every redraw | `reordered…`, `silent on load` | yes |
| R3b | The saved line stays in the visible line | saved line sent to the step region | `silent on load` | yes |
| Q3 | The step region is a polite status | role removed | `polite statuses`; DOM test | yes |
| R4 | The step region is no tab stop | `tabindex="-1"` | same | yes |
| R1 | The step region is not `hidden` | `hidden` added | DOM test | yes |
| M3 | The step region is visually hidden | class removed | DOM test | yes |
| X11 | A press moves nothing (the message is said, not shown) | same as M3 | `a press moves the button` | no: the region is last in the page, so nothing above moved. **After: yes** (the region is a 1×1 box) |
| R5 | The visible line is a polite status | role removed | `polite statuses` | yes |
| N4 | "Your answers": small and muted, the body face | `--st-text` | `the answers strip` | yes |
| N5 | The strip ends with a hairline | `border-block-end` removed | same | yes |
| N6 | "Edit answers" is a secondary button with a pencil | `variant="ghost"`, no icon | same | yes |
| X12 | "Edit answers" is a 44px button above the path | a plain `<a>` | `moves on as steps are done`, `the answers strip` | yes |
| X10 | "Do this next" prints | hidden in print | `on paper` | yes |
| X14 | "Your answers" prints | `st-no-print` on the h2 | `on paper` | yes |

### Templates

| ID | Claim | Mutation | Test | Caught |
| --- | --- | --- | --- | --- |
| T1 | No frame on a phone | `border: 0` removed below 30rem | `no frames, wrapped` | yes |
| X13 | Fields 286px or wider at 320px | 16px padding kept on a phone | same | yes |
| T2 | The frame stays from 30rem | `border: 0` | `keep their frame` | yes |
| T3 | The legend is in the display face at `--st-text-xl` | `font-family` removed | `legend is the heading` | yes |
| T4 | The legend is capped at its group (`max-inline-size: 100%`) | removed | `every legend stays inside` | no; **after: yes**. Either rule alone keeps the words in the column, so the test now also checks the two rules |
| X9 | …and may break inside a word (`overflow-wrap: anywhere`) | removed | same | no; **after: yes** (same reason) |
| T4c | Both together | both removed | same | yes |
| T5 | The missing items wrap | `flex-wrap: nowrap` | `no frames, wrapped` | yes |
| F | The actions have a heading | `h2` changed to `p` | same | yes (`b8b0f78`, m2) |
| T6 | The actions heading is not printed | `.st-tool__heading` removed from the component's print rule | `the template actions heading is not printed` | no: equivalent. The site's sheet-only print rule in `print.css` also removes it |
| T6d | same | the actions exempted from the sheet-only rule, the component's rule kept | same | no: equivalent, for the same reason the other way round |
| T6c | same | both | same | yes |
| X6 | The actions and their heading are hidden without JavaScript | `html:not(.js) .st-tool__actions` removed | `nojs.spec.ts`, `the tools at 320px without JavaScript` | yes |

### Checklist and search dialog

| ID | Claim | Mutation | Test | Caught |
| --- | --- | --- | --- | --- |
| K1 | 12px inside on a phone | `--st-space-5` | `44px tick rows` | yes |
| P11 | The wider padding stays from 30rem | 12px at every width | same | yes |
| X7 | The tick rows stay 44px | `.st-check` without its target size | same | yes |
| X8 | "Browse all pages" is in the empty state | removed | `44px link rows`, `points at the glossary` | yes |
| G0 | The glossary link shows | hidden | `points at the glossary` | yes |
| G1 | The glossary link is in the page's language | English link on the Afrikaans page | same | yes |
| G2 | The glossary link is a 44px row | `st-link-block` removed | same, and `44px link rows` | yes |

**Totals**: 71 mutations over 67 claims and test titles. With the tests at `b8b0f78`: 62 caught and 9 not (C3b, X1, X2, X3, X9, X11, T4, T6, T6d). With `672c4af`: 68 caught. C3b, T6 and T6d are equivalent mutants, so the claim stays true under each of them. The reviewer's probes A, K, U and F are caught since `b8b0f78`, and B and R were already caught.
