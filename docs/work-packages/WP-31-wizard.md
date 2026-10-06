# WP-31: Find my path and My path

Status: built and handed over; review passes 1, 2 and 3 findings fixed.

Read first: `CLAUDE.md`, `docs/build-plan.md` A5, B1, B3 flows 1 and 2, B6 (home, section landing, document, checklist, My path) and C2, the store's API as WP-30 documented it (`src/lib/store.ts` doc comment and `docs/design-system.md`), `docs/i18n.md`, `docs/testing.md`.

## What already exists

- `APP_ROUTES.wizard` (`find-my-path/`) and `APP_ROUTES.myPath` (`my-path/`) in `src/lib/routes.ts`, not built while `WIZARD_AVAILABLE` is `false`.
- `content-meta/business-types.json`, `content-meta/applicability.json`, and every document's `appliesTo` in the generated data.
- Strings: `wizard.*`, `myPath.*`, `prompts.fillFromProfile*`, `prompts.placeholdersRemaining.*`, `checklist.filters.mine`, `checklist.hiddenItems.*`, `home.*` in both dictionaries.
- WP-30's store, with its typed persistent JSON helper for `st.profile.v1`.

## Build

1. **Rules and engine.** `paths.json` per A5, generated or validated by the content pipeline (a `paths` collection whose every doc id and anchor must exist). `src/lib/path-engine.ts`: pure `buildPath(profile, manifest, paths)` and the matching rule `applies(appliesTo, profile)`. The two A5 fixtures are tests: `{pty, [vehicle-dealer], pty-growing}` gives exactly Path 4's ten documents in order; `{undecided, general, not-started}` gives Path 1 with three type documents at step 3. The profile shape is A5's; validate it in the store helper (built: a hand-written check, `parseProfile` in `src/lib/profile.ts`, instead of Zod; see the hand-over).
2. **Wizard** (`/find-my-path/`, `<st-wizard>`): three steps per B3 flow 1, as one GET form that works without JavaScript. With JavaScript it becomes stepped, with focus moved to each step's heading, "Pty Ltd, growing" disabled with its reason unless the entity is Pty Ltd, and "See my path" saving the profile.
3. **Pre-rendered results:** without JavaScript, the form lands on a pre-rendered result page for the answers. Pre-render the single-business-type combinations (entity × one type or general × stage), per locale; more than one type needs JavaScript and the page says so (`wizard.noJsOneType`). Record the page count in the hand-over.
4. **My path** (`/my-path/`): profile chips, edit answers, progress ring, step cards in order with done/not done, the personalised checklist from the store's ticks, and reset profile with a confirm dialog. Empty state when there is no profile.
5. **Personalisation elsewhere:** the home "Your path" card, the pager following the path when a profile exists, the section sidebar's "Only what applies to me" switch, "Only mine" on `/checklist/`, collapsed "Hidden: applies to Pty Ltd only — Show" markers (nothing removed from the DOM), the top-bar progress ring, and "Fill from my profile" on prompts (replace known placeholders, say how many remain, undo).
6. Flip `WIZARD_AVAILABLE` and make every place that reads it right.

## Tests

Unit tests for the engine and the matching rule (≥90% coverage of `src/lib/path-engine.ts`), dom tests for the wizard's keyboard and focus, e2e for the whole flow with and without JavaScript, the pre-rendered result pages, personalisation, and reset. `pnpm test:a11y` on every step and with the reset dialog open.

## Definition of done

As WP-30: `gate:fast`, `build`, chromium, mobile and nojs e2e, `test:a11y`, JS budgets recorded, docs updated, two consecutive clean review passes, the second by a different reviewer instance.

## Hand-over

- **Pre-rendered pages.** 49 result pages per language (3 entities × 7 type choices × the allowed
  stages; "Pty Ltd, growing" only with a Pty Ltd), 98 in all, plus `/find-my-path/` and `/my-path/`
  in both languages: the build went from 96 to 198 HTML files. The result pages are `noindex` and
  left out of the sitemap.
- **No-JavaScript form.** A static host cannot route a query string to a page, so each result page
  has its own submit button (`formaction`) and CSS `:has()` shows the one for the checked answers.
  Where `:has()` does not work, the CSS (inside `@supports selector(:has(*))`) does not apply, and
  the form offers an open list instead, "Choose your path from this list": a link to each of the 49 result
  pages, grouped by how you trade.
- **JavaScript budgets** (`pnpm dist:budget`, run by `pnpm build`: gzipped level 9, per file,
  summed, without and with a saved profile): heaviest document page `/af/business-types/food/`
  21.9 KB / 21.9 KB (25 KB budget, 3.1 KB left for WP-33); My path 24.5 KB, `/checklist/` 21.5 KB,
  Find my path 20.1 KB (45 KB budget); home 17.5 KB, 20.3 KB when it rebuilds the stored path. Before
  review pass 1 the heaviest document page was 24.0 KB without a profile and 26.3 KB with one.
- **No Zod in the browser for the profile.** Build 1 asked for Zod in the store helper. The
  profile is checked by `parseProfile` (`src/lib/profile.ts`), hand-written, with the same rules
  (known entity and stage, known types without duplicates and at least one, "Pty Ltd, growing" only
  with a Pty Ltd). It saved about 1.4 KB gzipped on every page (review pass 1, major 1).
- **The stored path.** Document pages never load the path rules. The wizard, My path and the home
  page store the reader's path (`st.pathView.v1`: steps, routes and titles, with the hash of
  `paths.json` and the answers it is for); the top bar's ring and the pager read it. When it is out
  of date only the home page rebuilds it (lazily); until then a document page shows no ring and keeps
  its pager in section order. A path element rebuilds the stored path only on its own triggers
  (connecting, new answers), never because another tab stored one, so two tabs on different builds
  do not keep overwriting each other (review pass 2, minor 1).
- **For WP-32 and WP-33.** Read the profile with `readProfile()`, `profileEntity()` and
  `profileBusinessTypes()` from `src/lib/profile-store.ts`. WP-33's "My business types" filter chips
  are not built here; `profileBusinessTypes()` is what they need.
- **Not built.** The section landing's "Start with…" (B6) is not in this brief and is left out.
  "Done" on a step is the reader's own mark (`st.path.v1`), not derived from checklist ticks.
