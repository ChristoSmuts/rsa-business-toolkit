# WP-50 Phase 3, item 4 (the tools): review pass 2

**CLEAN**: zero blocker, zero major, four minor.

- Branch reviewed: `wp50-p3-tools` at `3203609` (the pass 1 fixes in `06b647b`), compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build`, both trees | OK; 200 pages; heaviest document page 24.3 KB and heaviest other page 34.9 KB, unchanged |
| `pnpm gate:fast` | exit 0; 82 test files, 3,447 tests |
| e2e chromium | 860 passed, including all the held-Enter search tests |
| e2e mobile + nojs | 935 passed, 131 skipped |
| axe on the tool pages | 84 passed |
| Phone stepper, contrast (light / dark) | done and current 7.67 / 9.27:1; to come 4.40 / 4.90:1 |
| Phone stepper, heights | 10/2/2, 6/10/2 and 6/6/10 at questions 1, 2 and 3 |
| Phone stepper, forced colours | `Highlight` for done and current, `GrayText` for to come |
| Layout shift at 320px, fonts held | `/find-my-path/` 0.029 (base 0.015), Afrikaans 0.015, My path 0.000 |
| Confirm dialogs | centred at 320, 768 and 1280px; buttons 238×44 on a phone; safe choice first and focused |
| Print | PDFs identical to the base for the tax invoice, the checklist and `/templates/`; Find my path differs by the stepper's indent only; My path changed (m3) |
| 200% text | OK |
| Keyboard and accessibility tree | checked |
| Mutation probes | all caught, except the summary's reorder, which only the DOM test caught (m2) |

## Minors

**m1**: Chromium names the "Change" buttons "Change : How you trade", with a stray space that comes from the absolutely positioned visually hidden span. Use a named-label key, as `myPath.markDoneNamed` does (for example `wizard.summary.changeNamed`, "Change: {step}" / "Verander: {step}", in both files with the same placeholder), as `aria-label`; keep the visible text "Change"; assert the exact name with `chromiumAxName` in `tools.spec.ts`, skipped on WebKit with a reason. Check the label-in-name rule still holds.

**m2**: the summary test in `tools.spec.ts` ticks Food, then General, which is also the server's order, so a lost reorder passes it. Tick General first, then Food, and expect "General … (main)" first. Probe it by removing the `list.append` reorder in a scratch edit, then revert.

**m3**: My path's print changed: "Edit answers" no longer prints (right: it is an action); "Do this next" and the double ring print (keep: useful on paper); the answers' heading is small and muted above a hairline. Record these in the tools section of `docs/design-system.md`.

**m4**: "Your answers so far" has an accessible name on a `section`, so it is a region landmark. Use `role="group"` with `aria-labelledby`, or a plain `div` with the `h3`. Drop the list bullet when only one kind of business is shown, keeping the list semantics.

## Fixed in `d93acdc`

- **m1**: each "Change" shows "Change" ("Verander") and is named from `wizard.summary.changeNamed`, "Change: {step}" / "Verander: {step}", by `aria-label`; the visually hidden span is gone. The name starts with the visible word (WCAG 2.5.3). `tools.spec.ts`, "each "Change" is named after its question…", reads the exact names from Chromium's tree in both languages ("Change: How you trade", "Change: Kind of business", "Verander: Hoe jy handel dryf", "Verander: Soort besigheid") and checks the visible text; it is skipped outside Chromium (CDP) and in the `mobile` project (it sets its own size). `tests/dom/wizard.test.ts` checks the visible text and the `aria-label`. `ParamNames` in `src/i18n/index.ts` lists the new key's `step`.
- **m2**: the e2e summary test ticks General, then Food, and expects "General: I sell or do many things (main)" then "Food business" (Afrikaans "Algemeen: ek verkoop of doen baie dinge (hoof)" then "Kosbesigheid"). Probe: with `list.append(item)` commented out in `wizard.ts` and the site rebuilt, both language runs of the test failed ("Expected - 1, Received + 1"); the edit was reverted and the site rebuilt from the committed source.
- **m3**: `docs/design-system.md`, "The tools", has a "Print" paragraph: what prints as before, the stepper indent, and My path's three intended changes.
- **m4**: "Your answers so far" is a `div` with `role="group"` and `aria-labelledby` its `h3`, so no landmark; `tools.spec.ts` checks the role and the group's name in Chromium's tree. With one kind of business shown the list has no bullet and no indent (`list-style: none`, still `role="list"`); a second kind brings the bullets back. A new test checks both.
