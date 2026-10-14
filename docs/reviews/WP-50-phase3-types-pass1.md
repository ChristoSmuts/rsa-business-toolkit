# WP-50 Phase 3, item 3 (business-type pages): review pass 1

**CLEAN**: zero blocker, zero major, eight minor.

- Branch reviewed: `wp50-p3-types` at `88aabf3`, compared with `bebd0de`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | exit 0; heaviest document page `/af/core/adding-new-lines/` 24.3 KB |
| `pnpm gate:fast` | exit 0; 82 test files, 3,441 tests |
| e2e (the item's specs) | 619 passed, 14 skipped |
| axe, business-types pages | 38 passed |
| `content:check` probe | a wrong id in each of three `glance` entries failed the build, as expected |
| "Main reason" quotes | all 12 byte-identical to the hub table's rows |
| Applicability probe, six profiles | identical before and after, except the intended own-type checklists now shown |
| Layout shift with scripts held | 0.0000 |
| Sideways scroll | none on 36 checks |
| Print | real tables; "Go straight to" hidden |
| Focus order | matches the visual order |

## Findings

1. **minor**: `src/lib/applicability.ts`'s entity guard is untested: deleting the two `appliesTo.entity !== …` lines keeps the unit tests green. Add cases: `({entity:'pty', businessTypes:['food']}, 'food')` keeps the entity condition; `({businessTypes:['food','beauty']}, 'food')` gives `{}`; `({businessTypes:['beauty']}, 'food')` keeps `data-types`.
2. **minor**: a stacked table's caption and name still say "Scroll sideways to see all of it" / "Rol sywaarts om alles te sien" where nothing scrolls. Use a caption without the instruction when `stack` is set.
3. **minor**: harden the stacked tables' semantics for WebKit and VoiceOver with explicit `table`, `rowgroup`, `row`, `columnheader` and `cell` roles (the standard fix for `display: block` tables). Keep the Chromium tree test; add the stacked hub tables with VoiceOver to the Phase 5 iPhone checklist.
4. **minor**: `tests/e2e/doc-page.spec.ts`'s header comment should state the two-screen rule with the ≤48px "Go straight to" allowance and that the Afrikaans dealer is past two screens and untested (backlog row).
5. **minor**: "Go straight to" costs too much on food (118 to 162px) and repeats the "On this page" list just below. Render it as one wrapping line with inline links (each still a 44px target, separators not read out), keep only the checklist and, where it exists, the timing section, and hide it where the contents column is visible.
6. **minor**: give the "Main reason" a visually hidden label, so a screen reader does not read one run-on line. The meter's Afrikaans level words differ from the hub table's ("Laag tot matig" / "Laag tot middelmatig", "Laagste" / "Die minste"): a content and i18n question for the backlog.
7. **minor**: the no-answers line hard-codes "three" / "drie"; use `{total}` as `findMyPathHint` does.
8. **minor**: `docs/design-system.md` should list `stack` in TableScroll's props; `Doc.astro` should take `pickTable` from the collection it already receives if that is clean, or say why not.

## Fixed in `3997a03`

1. `tests/unit/path-engine.test.ts` has the three cases and three more (sole proprietor, `entity: 'all'`, no page type). Probe: with the two guard lines deleted, "on a business-type page, drops only a condition that is the page's own kind of business" fails (1 failed, 23 passed); restored, 24 passed.
2. `doc.tableRegionStacked` ("Table: {caption}." / "Tabel: {caption}.") names a stacked table; `types.spec.ts` checks the caption has no "Rol sywaarts".
3. `TableBlock` sets the five roles when `stack` is set (and `aria-labelledby` on the table); `types.spec.ts` checks them; the Chromium tree test stays. The Phase 5 checklist in `WP-50-design-revamp.md` lists "the stacked hub tables with VoiceOver".
4. The header comment says so; backlog row added (Afrikaans dealer 1,740px at 360×740).
5. `TypeJump` is one wrapping line in `--st-text-sm`: "Go straight to:", then the timing (food only) and the checklist, a dot between them (`content: '·' / ''`), each link 44px tall, not shown from 1280px. `glance.need` is gone from `business-types.json`, the schema and `content:check`. Row height and first heading of the text (pass 1 → now):

   | Page | 320×568 row | 320×568 heading | 360×740 row | 360×740 heading |
   | --- | --- | --- | --- | --- |
   | Food EN | 162 → 66 | 1,600 → 1,504 | 118 → 44 | 1,433 → 1,359 |
   | Food AF | 162 → 66 | 1,937 → 1,841 | 162 → 66 | 1,795 → 1,699 |
   | Dealer EN | 44 → 44 | 1,592 → 1,592 | 44 → 44 | 1,477 → 1,477 |
   | Dealer AF | 74 → 44 | 1,855 → 1,824 | 44 → 44 | 1,763 → 1,740 |

   (At `bebd0de`, without the row: food 1,439 / 1,755 and dealer 1,504 / 1,736 at 320×568; food 1,317 / 1,638 and dealer 1,408 / 1,675 at 360×740, EN / AF.)
6. A visually hidden "Main reason:" / "Hoofrede:" (`businessTypes.glance.reasonLabel`) starts the reason; backlog row for the level words.
7. `doc.onlyWhatAppliesNoProfile` takes `{total}`, from `WIZARD_QUESTIONS` in `src/lib/routes.ts`, which `Wizard.astro` uses too; the wizard and types specs match "3 short questions".
8. The props column lists `stack`. `pickTable` is not in the `businessTypes` collection (that collection is the file's `types` array, one entry per kind of business; `pickTable` belongs to the table), so `Doc.astro` keeps reading the one validated file and says why in a comment.
