# WP-50 Phase 3, item 4 (the tools): review pass 9

**NOT CLEAN**: zero blocker, one major, five minor.

- Branch reviewed: `wp50-p3-tools` at `5b035c7` (the merge of `origin/main` in `b2c383c`, the pass 8 fixes in `6f257e4`), compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text and probe table are with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | OK; budgets unchanged |
| `pnpm gate:fast` | exit 0; 3,524 + 47 tests |
| e2e chromium + mobile + nojs, 12 shards | 1,829 passed, 163 skipped, 0 failed |
| axe | 836 passed |
| Button sweep | 19 routes, EN and AF, 320 and 360px, text at 100% and 200% |
| Layout shift | worst 0.029 |
| The merge | the lead dedupe is intact; search unchanged |

**Mutation probes:** one survived. With `padding-inline: 0` on every button below 30rem, every test passed: no test pinned the padding the pass 8 record described (M1).

## Findings

**M1**: the pass 8 cap is not "the same at the default text size". Below 30rem at 100% text it changed:

- every md button 24 → 20px;
- lg 32 → 24px;
- ghost 12 → 20px, because the cap overrides ghost's own padding at the same specificity, later in the file;
- the dialog's form 24 → 20px.

A 24px cap would not fix the Afrikaans breaks at 200% ("antwoorde", "Kanselleer"). Decision:

- keep 20px (md, dialog) and 24px (lg) below 30rem as a deliberate phone change;
- exclude ghost from the cap, so it keeps `var(--st-space-3)`, capped at 12px;
- correct the comments and the design record with measured before and after values;
- pin the computed padding with a test. The probes `padding-inline: 0` and ghost at 20px must fail it.

**m1**: the checklist's "Remove ticks" / "Verwyder merkies" breaks inside a word at 200% text and 320px, in both languages. The `.st-checklist-summary` padding grows to 32px a side. Cap it below 30rem the same way. Extend the no-mid-word test to the checklist summary's button and to the tool pages' own buttons ("Remove line" on the templates). Do the same for the home page's "Continue: step 1 of 4" if the cause is the same and the fix is small; otherwise add a backlog row. Narrow the design record's claim to what the test covers.

**m2**: the search empty state's region is named "Common questions" but now opens with "Browse all pages" and the glossary link. Move the links outside the named section, still before the questions on screen and in the HTML, and keep the in-viewport test passing.

**m3**: `search.spec.ts:956` measures `[data-search-empty] a`, which is now "Browse all pages". Target `.st-search-dialog__questions a`, or rename the test, so it tests what its name says.

**m4**: add backlog rows for two pages at 200% text and 320px. The keyboard shortcuts table under About, Settings scrolls the page sideways (EN 425px, AF 589px). On `/af/search/`, long compound links make the page 405px wide.

**m5**: the pass 8 record says the caps are "the same 20px at the default text size". This is covered by M1's corrected record.

## Fixed in `118cc9d`

- **M1**: in `Button.astro`, below 30rem:

  | Rule | Value |
  | --- | --- |
  | md (primary, secondary, danger) | `min(var(--st-space-5), 20px)` |
  | ghost (not lg) | `min(var(--st-space-3), 12px)`, excluded from the md cap |
  | lg | `min(var(--st-space-6), 24px)` |
  | gap between icon and words | `min(var(--st-space-2), 8px)` |

  `ConfirmDialog.astro` keeps `min(var(--st-space-5), 20px)` for the form below 30rem. From 30rem nothing changes.

  Before → after at 320px, per side ("before" is `ea15b4a`, the tokens' rem values at a 16px and a 32px root):

  | Below 30rem | 100% text | 200% text |
  | --- | --- | --- |
  | md button | 24 → 20px | 48 → 20px |
  | lg button | 32 → 24px | 64 → 24px |
  | ghost button | 12 → 12px | 24 → 12px |
  | icon gap | 8 → 8px | 16 → 8px |
  | confirm dialog's form | 24 → 20px | 48 → 20px |

  The "after" values at 320px, and md 24, lg 32, ghost 12 and dialog 24px at 1280px, are pinned by the new test "buttons' side padding". It reads the computed padding of every md, lg and ghost button on `/design-system/` and of the checklist's confirm dialog, at 320px with 100% and 200% text and at 1280px with 100% text. The comments in both components and "Wrapping and min-content" in `docs/design-system.md` now give these figures and call the change deliberate.

- **m1**: below 30rem, `.st-checklist-summary` is `min(var(--st-space-3), 12px)`: 16 → 12px at 100% (deliberate, like the checklist box's own 12px) and 32 → 12px at 200%. A template's `.st-tline__set` is `min(var(--st-space-3), 12px)`: 12px at 100%, unchanged, and 24 → 12px at 200%.
  - The no-mid-word test now has three checks: "Edit answers", the four confirm dialogs, and a new "the tool pages' own buttons" (the checklist summary's "Remove ticks" and the tax invoice's "Remove line"). Each runs in both languages.
  - The test now counts a broken word only if it would fit the button's content width on one line. A compound longer than the button ("belastingfaktuur", in an Afrikaans template button) may still break; that is the last resort.
  - The home page's "Continue: step 1 of 4" breaks because of its card's 48px padding, not the button's. That is a home-page change, so it is a backlog row for Phase 3, item 5.
  - The design record's claim is narrowed to the buttons the test covers.
- **m2**: in `SearchDialog.astro`, `[data-search-empty]` is now a plain `div`. It holds the links list first and then `section.st-search-dialog__common`, named "Common questions" and holding only the heading and the questions. The scripts still show and hide `[data-search-empty]` as before; no script was changed. The in-viewport test also asserts that the region named "Common questions" / "Algemene vrae" holds no `.st-search-dialog__more` and still has its links.
- **m3**: `search.spec.ts` (the chip test) measures `[data-search-empty] .st-search-dialog__questions a`.
- **m4**: in the backlog, as two rows.
- **m5**: see M1. The pass 8 record's "the same 20px" was wrong, and so was its 40px. At 200% text a md button's padding was 48px a side, from `--st-space-5` (1.5rem).

| Probe | What it breaks | Test | Caught |
| --- | --- | --- | --- |
| P0 | `padding-inline: 0` on md buttons below 30rem | `buttons' side padding` | yes |
| PG | ghost at 20px below 30rem | same | yes |
| PL | lg not capped | same | yes |
| DLG | the dialog's form not capped | same | yes. The word test alone no longer sees it: with 48px padding a button is narrower than "Kanselleer", so that word may break |
| GAP | the icon gap not capped | `button labels at 200% text and 320px` | yes |
| CS | the checklist summary's padding not capped | `the tool pages' own buttons` | yes |
| TL | a template line's padding not capped | same | yes |
| SM | the empty-state wrapper named "Common questions" again (`role="region"`) | `the way out of "Nothing found" is in view` | yes, all 6 |

Every probe was applied to the real file, built, run and reverted.
