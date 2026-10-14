# WP-50 Phase 3, item 3 (business-type pages): review pass 2

**CLEAN**: zero blocker, zero major, six minor, two notes outside the diff. With pass 1, two clean passes in a row.

- Branch reviewed: `wp50-p3-types` at `cbf716c` (the pass 1 fixes in `3997a03` and the merge of `main` at `32c72cf`), compared with `bebd0de`.
- Reviewer: a fresh instance. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | exit 0; `dist:audit` and `dist:trust` OK; heaviest document page `/af/core/adding-new-lines/` 24.3 KB |
| `pnpm gate:fast` | exit 0; 82 test files, 3,444 tests |
| e2e (the item's specs) | 620 passed, 15 skipped |
| axe, business-types tests | 66 passed |
| `content:check` probe | wrong ids in two `glance` entries failed the build, as they should |
| "Main reason" quotes | all 12 byte-identical to the hub table's cells |
| Applicability, 6 profiles × 12 pages | identical to `bebd0de` except the intended own-type checklists now shown |
| Stacked tables | complete roles, `aria-labelledby` to the caption, no sideways scroll from 320 to 1280px in both languages, 200% text fine, print shows real table rows |
| "Go straight to" | shown from 320 to 1279px only, where the contents column is hidden; 44px links; focus order matches the visual order |
| First screen | the facts and the AI notice as in `docs/design-system.md` |
| Layout shift | 0.0000 |
| Merge of `main` | clean |

## Minors

1. `doc-page.spec.ts` allows the "Go straight to" row on top of two screens in every engine. Keep the plain limit (1,480px) in Chromium, where the page was measured, and the allowance only in other engines; say so in the comment and in `docs/design-system.md`.
2. `applicability.ts`: the doc comment should say that a part conditioned on an entity and the page's own type keeps its whole condition (no content has one today), so a future change is deliberate.
3. `TypeJump`: the visible "Go straight to:" label is read and also names the list; make it `aria-hidden` so it is announced once (`aria-labelledby` still resolves it), and check Chromium's tree.
4. Tests: (a) compare every page's "Main reason" byte for byte with the hub's effort-table cell in the built HTML, 6 types × 2 languages; (b) check the stacked tables' roles on every `tr`, `th` and `td`, not only the first; (c) the Chromium tree test should check that rows contain their cells.
5. A unit assertion that `WIZARD_QUESTIONS` equals the number of wizard step titles.
6. Hide the type's illustration in print.

## Notes outside the diff

- `WP-50-design-revamp.md`, "Measures of done", still says the heaviest document page is "23.7 KB today".
- The Afrikaans food page's lead ends "’n klein…": a cut-off summary.

## Fixed in `5c85449`

1. Chromium keeps `TWO_SCREENS` (1,480px); other engines get `TWO_SCREENS` plus the row's height, which must itself be at most 48px. The test's comment, the file's header comment and the design system say so.
2. The `appliesAttributes` comment gives the example (`{ entity: 'pty', businessTypes: ['food'] }` on the food page still hides from a sole proprietor) and says no content has such a condition today.
3. The label span is `aria-hidden="true"`. A new Chromium-only test reads the full tree on the food page: the only node named "Go straight to" is the list, named "Go straight to:".
4. (a) `types.spec.ts`, "the "Main reason" on every type": the hub's English table maps rows to types by their English labels (`pickTable.rows`), then for both languages each page's `.st-type-facts__reason-text` equals the hub cell of its row. (b) Every `thead`, `tbody`, `tr`, `th` and `td` in each stacked region carries its role. (c) Each `row` in Chromium's tree has at least two `cell` or `columnheader` children (14 or more rows).
5. `tests/unit/components/wizard-markup.test.ts`: `WIZARD_QUESTIONS` equals the number of `wizard.steps` titles in `en.json` and of steps `Wizard.astro` renders.
6. The art square is `st-no-print`, and in print the facts are one column.

Outside the diff:

- The measures of done now give 24.3 KB (`/af/core/adding-new-lines/`) and food's 21.9 KB.
- The Afrikaans food summary is not cut off in the markdown and not by the display. It is cut by the content build: `content-meta/docs.meta.json` gives `business-types/food` an English summary only, so the Afrikaans one is derived from the document's first paragraph (`deriveSummary` in `scripts/content/meta.ts`), and `truncateSummary` cuts it at `SUMMARY_MAX` with "…". It is the only Afrikaans document whose summary ends that way. Left unchanged, as the coordinator asked: the fix is an `af` summary for food in `docs.meta.json` (a translation of the English one), a content decision.
