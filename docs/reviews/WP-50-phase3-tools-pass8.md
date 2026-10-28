# WP-50 Phase 3, item 4 (the tools): review pass 8

**CLEAN**: zero blocker, zero major, five minor.

- Branch reviewed: `wp50-p3-tools` at `175f14f` (the pass 7 fixes in `b8b0f78` and `672c4af`), compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text and probe table are with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | OK; budgets unchanged |
| `pnpm gate:fast` | exit 0; 3,523 + 40 tests |
| e2e chromium + mobile + nojs, 12 shards | 1,817 passed, 153 skipped, 0 failed |
| axe on the tool pages | 496 passed |
| Layout shift | worst 0.029 |
| By hand | the tools at 320, 360, 768 and 1280px, both languages, and Chromium's accessibility tree |
| Fresh mutation probes MA to MJ | MC, MH and MJ not caught (m5, m4, m3); the full table is with the coordinator |

## Minors

**m1**: in the search dialog, the "no results" way to the glossary is below the first screen at every size: 772px at 320×568 (EN), 721 and 747px at 360×740, and 748px at 1280×800, where the dialog shows 638px. Put the way out in view, measure it at 320×568, 360×740 and 1280×800 in both languages, and add a test that it is in the viewport, not only visible. The held-Enter logic must not change.

**m2**: "Edit answers", now a `Button`, breaks inside its words with text at 200% at 320px ("Edit / answe / rs"), because `.st-btn__label` has `overflow-wrap: anywhere`. Make button labels wrap between words first, check the confirm dialogs' buttons, add a test, and update the backlog row from pass 1, m8.

**m3**: from 30rem, assert that a done step's bar colour equals `--st-primary` resolved and the bar to come does not, at 500 and 1280px. Probe MJ (the fill removed) must fail it.

**m4**: at 1280px the confirm dialog's two choices share one row (equal tops). Probe MH (a full row at every width) must fail it.

**m5**: the bottom of the "Your answers" heading is at or above the top of the first chip. Probe MC (no `flex-basis: 100%`) must fail it.

## Fixed in `6f257e4`

Before the fixes, `origin/main` at `0a618bb` (the lead dedupe) was merged in (`b2c383c`, a merge commit; the one conflict, `docs/reviews/backlog.md`, keeps both sides). With it, the tax invoice shows its first sentence once, so the backlog row about that sentence twice is closed.

- **m1**: in `SearchDialog.astro` the empty state's "Browse all pages" and "Look a word up in the glossary" come first, above "Common questions", in the HTML as on screen, so the reading and focus order stay one. No script change, and the held-Enter logic is untouched. A new test, "the search dialog: the way out of "Nothing found" is in view", types a word with no results at 320×568, 360×740 and 1280×800 in both languages. It asserts that both links are wholly in the viewport (`toBeInViewport({ ratio: 1 })`) and end inside the dialog's scroll area and the window. Moving the links back below the questions (with `order`) fails it.
- **m2**: the cause was the padding, not only the wrapping rule. At 200% text the button's side padding doubled to 40px, which left "Edit answers" 108px beside its pencil. Below 30rem a button's side padding is now `min(var(--st-space-5), 20px)` (24px for `lg`), and a confirm dialog's padding is `min(var(--st-space-5), 20px)`. Both are the same 20px at the default text size. `overflow-wrap: anywhere` stays as the last resort for a word longer than the button.
  - A new test, "button labels at 200% text and 320px", finds no word drawn on two lines. It checks "Edit answers", and the choices of all four confirm dialogs (checklist, My path, tax invoice, settings), in both languages. It also checks that no dialog scrolls sideways.
  - Taking out either cap fails it.
  - Making the button `flex-wrap: wrap` was tried as well. Once the padding was capped, removing it changed nothing, so it was not kept.
  - The backlog row from pass 1, m8 is closed.
- **m3**: "from 30rem a done step shows its tick" compares the done bar's colour with `--st-primary` resolved on a probe element, and asserts that the bar to come is not that colour, at 500 and 1280px. MJ (the fill line removed) fails it.
- **m4**: the "Remove all ticks?" test asserts equal tops for the two choices at 1280px. MH fails it.
- **m5**: the answers strip test asserts that the heading's bottom is at or above the first chip's top, at 320 and 1280px. MC fails it at 1280px. At 320px the chips take a row of their own anyway.

| Probe | What it breaks | Test | Caught |
| --- | --- | --- | --- |
| m1 | `.st-search-dialog__more { order: 1 }`: the links below the questions again | `the way out of "Nothing found" is in view` | yes |
| m2a | the button's side padding not capped | `button labels at 200% text and 320px` | yes |
| m2b | the dialog's padding not capped | same | yes |
| MJ | `border-block-start-color: var(--st-primary)` removed from the done rule | `shows its tick` | yes |
| MH | `flex: 1 1 100%` for the choices at every width | `centred "Remove all ticks?"` | yes |
| MC | `flex-basis: 100%` removed from the answers heading | `the answers strip` | yes |

Every probe was applied to the real file, built, run and reverted.
