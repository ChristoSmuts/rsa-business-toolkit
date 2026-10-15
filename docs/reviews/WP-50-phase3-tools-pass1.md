# WP-50 Phase 3, item 4 (the tools): review pass 1

**NOT CLEAN**: zero blocker, one major, eight minor.

- Branch reviewed: `wp50-p3-tools` at `81200d3`, compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build`, both trees | OK; heaviest document page 24.3 KB, heaviest other page 34.9 KB; 200 pages |
| `pnpm gate:fast` | exit 0; 82 test files, 3,447 tests |
| e2e chromium + mobile + nojs | 1,790 passed, 126 skipped, including all 30 search Enter tests |
| axe, tools and dialogs | 104 passed, including the 8 new tests |
| Probes | 320, 360 and 1280px; 200% text; forced colours |
| Print | PDFs pixel-identical to the base |
| Mutation probes | the summary's order and "Do this next" both caught by the tests |
| Base dialogs | measured at left 0, top 0, as the item says |

## Findings

**M1 (major)**: below 30rem the done tick (`.st-wizard__stepper-n::before`) sits inside the visually hidden span, so it is clipped to 1×1 and invisible. Done and current bars are the same colour and height, so the phone stepper shows two states, not three. The test in `tools.spec.ts` checks `borderRightWidth: 2px` at 320px and passes anyway, and `docs/design-system.md` and the code comment claim "three states, not by colour alone". Decision: on phones the bar is a plain segmented progress bar, filled up to and including the current step and empty after it, and the h2 "Question n of 3: …" carries the step. Make the current segment distinguishable from done ones without colour alone, and keep the tick only where it is actually drawn (from 30rem). The test should check the tick from 30rem, with its box really drawn (bigger than 1×1, not clipped), and the three-state bar at 320px. Correct the comment and the design system.

**m1**: in forced colours, steps after the current one should draw their bar in `GrayText`.

**m2**: the empty segment uses `--st-border` (about 1.4:1 on the page). Use `--st-border-strong` (3:1 or more on `--st-bg`) below 30rem, in both themes; check the pair is in `CONTRAST_PAIRS`.

**m3**: add a test that the first answer is within 740px at 360×740 in English and Afrikaans, the reader's real gain. Keep the 698px limit outside Chromium, but say in its comment that it is provisional until the first CI WebKit figure, which the coordinator will record.

**m4**: in `nojs.spec.ts` the new describe sits under the existing "WCAG 1.4.10 at 320px without JavaScript" comment; move it above, so the comment heads its own describe again.

**m5**: render the summary's kinds of business as a small list in tick order, the first marked "(main)" (and its Afrikaans equivalent, through i18n keys in both files), instead of a comma-joined string. Update the DOM test.

**m6**: use the shared `.st-visually-hidden` rules (a class or a shared selector) instead of copying them inline in `Wizard.astro`.

**m7**: the stepper's "done" means "before the current step", so after "Change" an answered later step shows as to come. Backlog row.

**m8**: with text at 200% at 320px the confirm dialog's buttons break words. Pre-existing. Backlog row.

## What checked out

- "Change" keeps the answers, except a "Pty Ltd, growing" stage, which is correctly dropped when how the reader trades changes; focus goes to the question's heading; the tab order is right; the summary is correct for "I have not decided" with three kinds of business, in both languages.
- "Do this next" is right through marking and unmarking steps, and with "Only what applies to me".
- "Edit answers" is still a link.
- The template's missing-item links focus the right fields.
- The search dialog's links go through `href()` and are present without JavaScript.
- Printed text is identical to the base.

## Fixed in `06b647b`

- **M1**: below 30rem the stepper is a segmented progress bar, filled up to and including the current step: to come a 2px line, done a 6px segment, current a 10px segment, all on one bottom edge, so the stepper is 10px tall at every step and nothing moves on Next or Back. The three states differ in height as well as colour; the h2 names the step. The tick rule is inside `@media (width >= 30rem)`, so it is drawn only where the words show. `tools.spec.ts`: at 320px, the bars' widths are `10px 2px 2px` on question 1, `6px 6px 10px` on question 3 and `6px 10px 2px` after Back, done and current share a colour and to come does not, the stepper keeps its height, and the tick's `content` is `none`; at 1280px, on question 2, the done step's tick has `content: ""`, a 2px border, a box wider and taller than 1px, its words are not clipped (`clip-path: none`, more than 1px wide), and the other two steps have no tick. The code comment and `docs/design-system.md` say so.
- **m1**: `.st-wizard__stepper li[aria-current='step'] ~ li` is `GrayText` in forced colours (at every width).
- **m2**: the to-come line is `--st-border-strong`; `border-strong` on `bg` is already in `CONTRAST_PAIRS` (UI, 3:1) and passes in both themes.
- **m3**: `tools.spec.ts`, "at 360×740: the first answer is on the first screen", EN and AF (554px and 608px; the limit is 740). The 698px limit's comment says it is provisional until the first CI WebKit figure is recorded.
- **m4**: the comment heads "no sideways scrolling at 320px without JavaScript" again.
- **m5**: the kinds of business are a server-rendered `<ul>`, one hidden `<li>` per kind; `#summarise()` shows, orders and marks them, and writes no markup. The first is marked "(main)" / "(hoof)" (`wizard.summary.main`) when there are two or more. `tests/dom/wizard.test.ts` checks the list, its order, the marker and none for a single kind; `tools.spec.ts` checks the visible items in both languages.
- **m6**: `.st-visually-hidden-narrow` in `utilities.css`, the same declarations as `.st-visually-hidden` below 30rem, is on the stepper's two spans; the copy in `Wizard.astro` is gone.
- **m7, m8**: rows in `docs/reviews/backlog.md`.
- The tax invoice's lead is unchanged, as the coordinator asked.
- Screenshots: the Find my path pairs in `docs/reviews/WP-50-phase3-tools/` are retaken from this build.
