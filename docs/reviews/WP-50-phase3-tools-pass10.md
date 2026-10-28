# Review: WP-50 Phase 3 item 4 (the tools), pass 10

Branch `wp50-p3-tools` at `d550d99` (merges main `0a618bb`), compared with `0a618bb`. Fresh reviewer, read-only, scratch worktrees removed afterwards.

**Verdict: CLEAN.** 0 major, 6 minor. This is the first clean pass after pass 9 (not clean), so one more clean pass is needed before the branch goes to main by pull request.

**Status: minors not fixed yet.** Work paused on 28 October 2026 at the owner's request after this pass.

## What the reviewer ran

- `pnpm install --frozen-lockfile` and `pnpm build` on both trees: exit 0. `dist:audit` 200 HTML files, 27,208 URLs, no problems. `dist:trust` 74 document pages. Heaviest document page 24.3 KB (0.8 KB left), `/af/search/` 34.9 KB (10.1 KB left), 200 pages within budget; budgets match the record.
- `pnpm gate:fast`: exit 0. 82 files, 3,524 tests; content drift none; content 47 tests.
- e2e chromium + mobile + nojs, 6 shards, every shard exit 0: 1,834 passed, 168 skipped, 0 failed.
- `pnpm test:a11y`, 4 shards: 836 passed, 0 failed.
- Search held-Enter: no change under `src/scripts/search*` or `src/lib/search`; only the chip test's locator changed (pass 9 m3) and it passes.
- Button sweep on both trees: 27 route states (home, hubs, about/settings, design-system, templates, tax invoice, quotation, Find my path questions 1 and 3, My path empty and with answers, checklist, all four confirm dialogs open, search page, search dialog with no results, a document page, glossary, 404, a result page), EN and AF, 320 and 360px, 100% and 200% text made two ways (root `font-size: 200%` and the browser default font size through CDP). 318 runs per tree.
  - No visible `.st-btn` under 44×44.
  - No overlap (only open modal dialogs over the inert page).
  - No new sideways scroll; templates improve (EN 71 → 38px, AF 216 → 183px).
  - Words broken inside a button: 0 new, 240 fixed.
- Computed padding, `0a618bb` → branch (side / top):

  | Where | md | lg | ghost | dialog form | checklist summary | `.st-tasklist` | template line |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 320px, 100% text | 24 → 20 | 32 → 24 | 12 → 12 | 24 → 20 | 16 → 12 | 24/16 → 12/12 | 12 → 12 |
  | 320px, 200% text | 48 → 20 | 64 → 24 | 24 → 12 | 48 → 20 | 32 → 12 | 48/32 → 24/24 | 24 → 12 |

  Icon gap at 200%: 16 → 8px. At 480px and 1280px the values equal `0a618bb`. The "Wrapping and min-content" table matches every figure.
- Layout shift at 320×568 and 1280×800, fonts held: worst `/find-my-path/` 320×568, 0.0146 → 0.0291; the rest at most 0.0154. All within 0.1.
- By hand: Find my path question 3 (AF 320, dark and forced colours), My path with "Do this next" (AF, dark and forced colours), search dialog with no results (AF 320×568, both links on the first screen above "Algemene vrae"), "Remove all ticks?" in forced colours, tax invoice without JavaScript (AF 320), confirm dialogs at 200% in AF ("Kanselleer", "Verwyder antwoorde" break no word).
- CLAUDE.md rules on the diff: no literal colours, no `href="/…"`, no `localStorage`; `!important` and `white-space: nowrap` only in `.st-visually-hidden-narrow`; i18n keys identical with placeholders kept.

## Mutation probes

| Probe | What it breaks | Caught? |
| --- | --- | --- |
| P1 | Button phone padding applies below 48rem instead of 30rem | **No** (56 passed) |
| P2 | Checklist summary capped at 16px | Yes, in AF only |
| P3 | `.st-tasklist` phone inline padding 16px | Yes |
| P4 | "(main)" shown for a single kind of business | Yes, by the DOM test only |
| P5 | Done and not-done announcement swapped | Yes |
| P6 | Icon gap capped at 12px | Yes, in AF |
| P7 | Danger choice drawn first in the confirm dialog | Yes |
| P8 | Template line `.st-tline__set` capped at 16px | **No** (56 passed) |

## Major findings

None. The deliberate phone padding change is recorded with figures that match the measurements, takes no target below 44px, adds no overlap or sideways scroll, and at 200% fixes 240 mid-word breaks and adds none.

## Minor findings

1. **My path with no answers breaks "Find my path" / "Vind my roete" inside words at 200% text, 320px** (156×252px; 217×425px on main). Cause: `EmptyState` keeps `--st-space-5` padding and `.st-empty__actions` shrink-wraps the button, the same cause as the home "Continue" card (backlog, pass 9 m1). Fix: cap `EmptyState` padding below 30rem like the tools' boxes, widen the backlog row, and add `my-path/` without a profile to "button labels at 200%". The `/design-system/` EmptyState specimen breaks the same way.
2. **The template's Fill in / Preview tabs break inside a word at 200% text** ("Previe/w", "Voor/skou") at 320 and 360px, both languages, same as main. They are not `.st-btn`, so the cap and the word test skip them. Backlog row, or give the tabs the phone cap and include `[role=tab]` in the 200% word test.
3. **A drift of the 30rem breakpoint is not caught (P1).** Add a 480px row to the "buttons' side padding" test expecting md 24, lg 32, ghost 12, dialog 24.
4. **The template line and checklist summary caps are not pinned (P8; P2 in AF only).** Add `.st-checklist-summary` and `.st-tline__set` to the padding test, or say the test pins only button and dialog values.
5. **The checklist box's "before" figure is wrong in the record.** At `0a618bb`, `.st-tasklist` at 320px was 24px side and 16px top, not 20px. Fix critique 7, the table row and the `content.css` comment, and note that `.st-tasklist` is not capped (24px at 200%; 48 on main).
6. **"(main)" for a single kind of business is caught only by the DOM test (P4).** Add `toBeHidden()` on `[data-summary-main]` in the e2e "one kind of business" test.
