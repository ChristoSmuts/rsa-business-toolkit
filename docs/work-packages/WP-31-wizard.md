# WP-31: Find my path and My path

Status: brief. Starts once WP-30 (the store) is merged.

Read first: `CLAUDE.md`, `docs/build-plan.md` A5, B1, B3 flows 1 and 2, B6 (home, section landing, document, checklist, My path) and C2, the store's API as WP-30 documented it (`src/lib/store.ts` doc comment and `docs/design-system.md`), `docs/i18n.md`, `docs/testing.md`.

## What already exists

- `APP_ROUTES.wizard` (`find-my-path/`) and `APP_ROUTES.myPath` (`my-path/`) in `src/lib/routes.ts`, not built while `WIZARD_AVAILABLE` is `false`.
- `content-meta/business-types.json`, `content-meta/applicability.json`, and every document's `appliesTo` in the generated data.
- Strings: `wizard.*`, `myPath.*`, `prompts.fillFromProfile*`, `prompts.placeholdersRemaining.*`, `checklist.filters.mine`, `checklist.hiddenItems.*`, `home.*` in both dictionaries.
- WP-30's store, with its typed persistent JSON helper for `st.profile.v1`.

## Build

1. **Rules and engine.** `paths.json` per A5, generated or validated by the content pipeline (a `paths` collection whose every doc id and anchor must exist). `src/lib/path-engine.ts`: pure `buildPath(profile, manifest, paths)` and the matching rule `applies(appliesTo, profile)`. The two A5 fixtures are tests: `{pty, [vehicle-dealer], pty-growing}` gives exactly Path 4's ten documents in order; `{undecided, general, not-started}` gives Path 1 with three type documents at step 3. The profile shape is A5's; validate it with Zod in the store helper.
2. **Wizard** (`/find-my-path/`, `<st-wizard>`): three steps per B3 flow 1, as one GET form that works without JavaScript. With JavaScript it becomes stepped, with focus moved to each step's heading, "Pty Ltd, growing" disabled with its reason unless the entity is Pty Ltd, and "See my path" saving the profile.
3. **Pre-rendered results:** without JavaScript, the form lands on a pre-rendered result page for the answers. Pre-render the single-business-type combinations (entity × one type or general × stage), per locale; more than one type needs JavaScript and the page says so (`wizard.noJsOneType`). Record the page count in the hand-over.
4. **My path** (`/my-path/`): profile chips, edit answers, progress ring, step cards in order with done/not done, the personalised checklist from the store's ticks, and reset profile with a confirm dialog. Empty state when there is no profile.
5. **Personalisation elsewhere:** the home "Your path" card, the pager following the path when a profile exists, the section sidebar's "Only what applies to me" switch, "Only mine" on `/checklist/`, collapsed "Hidden: applies to Pty Ltd only — Show" markers (nothing removed from the DOM), the top-bar progress ring, and "Fill from my profile" on prompts (replace known placeholders, say how many remain, undo).
6. Flip `WIZARD_AVAILABLE` and make every place that reads it right.

## Tests

Unit tests for the engine and the matching rule (≥90% coverage of `src/lib/path-engine.ts`), dom tests for the wizard's keyboard and focus, e2e for the whole flow with and without JavaScript, the pre-rendered result pages, personalisation, and reset. `pnpm test:a11y` on every step and with the reset dialog open.

## Definition of done

As WP-30: `gate:fast`, `build`, chromium, mobile and nojs e2e, `test:a11y`, JS budgets recorded, docs updated, two consecutive clean review passes, the second by a different reviewer instance.
