# WP-31 review pass 2 (Find my path and My path)

- **Reviewer:** an independent reviewer agent, a different instance from pass 1. It did not write this code.
- **Date:** 6 October 2026
- **Commit reviewed:** `c875c2c` ("docs: record WP-31's stored path, budgets and review fixes"), the tip of `worktree-agent-a0193f6dbc3887574`. I reset a clean worktree to it.
- **Scope:** the whole diff, `git diff 61bb68c c875c2c`: 92 files, +8474 / -164. Not only the fixes in `64b400b`, `349073a` and `c875c2c`.

## Verdict

**Clean: 0 blocker, 0 major, 5 minor, 3 nit.**

Every pass 1 major is fixed, and I found no new one:

1. **Budget.** Document pages no longer load the rules. The heaviest is 21.5 KB with or without answers. `dist:budget` measures it the way the reviews do, and it fails the build when a page is over.
2. **No `:has()`.** Without `:has()`, the no-JavaScript wizard shows a list of all 49 result pages.
3. **Selling sections.** "If you sell online", "If you import anything" and the other selling sections in `core/what-you-need-to-sell-things` are now tags, so the switch never hides them. The marker no longer says whom a part is "only for".
4. **Button name.** "Mark as done" names only the pages that the step shows.
5. **Label in name.** Each accessible name starts with its visible label, in both languages, and a unit test checks this.

The minors are rare cases or polish:

- two home tabs from different builds rewrite the stored path in a loop;
- a type document's whole checklist can disappear without a marker;
- the top bar wraps to two rows between 1024 and about 1180 px;
- the home card shifts the layout;
- without `:has()`, the no-JavaScript wizard does not point to its list.

## Gate results

I ran all of these myself on `c875c2c`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 6.5s").
- `pnpm gate:fast`: exit 0.
  - "All matched files use Prettier code style!"
  - `astro check`: "Result (257 files)", 0 errors, 0 warnings, 0 hints.
  - vitest unit + dom: "Test Files 60 passed (60)", "Tests 1273 passed (1273)".
  - "Wrote 0 changed files, removed 0, 83 files in total." "Content drift: none."
  - vitest content: "Tests 37 passed (37)".
- `pnpm build`: exit 0, "198 page(s) built".
  - `dist:audit`: "198 HTML file(s), 23338 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`:
    - "heaviest document page /af/business-types/food/: 21.5 KB without a profile, 21.5 KB with one (budget 25.0 KB, 3.5 KB left)."
    - "heaviest other page /af/my-path/: 24.1 KB without a profile, 24.1 KB with one (budget 45.0 KB, 20.9 KB left)."
    - "198 page(s) within budget."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4731`, default reporters): **907 passed, 88 skipped, 0 failed** (13.6 min). Pass 1's flaky wizard test (minor 7) passed.
- `pnpm test:a11y` (same environment): **408 passed, 0 failed** (13.4 min). This includes axe on every wizard step, on My path with the "Remove your answers?" dialog open, on a document with "Only what applies to me" on, and on the 98 result pages.
- **WebKit was not run.** It is not available in this environment. It stays on `merge-checklist.md`.

## My own checks

### The reading paths

I ran `buildPath` on the built `src/data/paths.json` for 42 profiles: each entity × {vehicle dealer, food, General, beauty + General, professional + vehicle dealer, General + food} × each allowed stage. I compared each result with A5 and with Paths 1, 2 and 4 of "How to use this toolkit".

- **Path 1 (not started).**
  - Sole proprietor: 9 steps.
  - Pty Ltd and undecided: 10 steps, the last being "Running a Pty Ltd" and "Paying yourself".
  - Step 3 holds the type documents, with the primary type first and General expanded in place. General + food gives retail, services, professional, food.
- **Path 2 (trading).** 4 steps for every entity: checklist, tax, the type documents, then `core/register#popia-register-your-information-officer`.
- **Path 4 (Pty Ltd, growing).**
  - `{pty, [vehicle-dealer], pty-growing}` gives exactly the guide's ten documents, in order.
  - With another kind of business, "Vehicles" drops out and the path has 9 steps. The dealer-only reasons are hidden on steps 4, 5, 6, 8 and 9, and the general ones stay.
- **The "why" text.** I read every reason in the built Afrikaans My path. Each is the Afrikaans list item's words after " — ", in the same order as the English. The engine is shared, so both languages get the same steps.

### "Only what applies to me"

I listed every condition left in `src/data/{en,af}/docs/**`: headings, tasks (`when`) and table rows. The English and Afrikaans lists are identical.

What can still hide:

- the sole proprietor / company sections of tax, vehicles, "You are the business" and "Which template", by entity;
- "For a vehicle dealer" in "Working from home and safety";
- Part A2 and the Part B and Part C groups of the checklist;
- each type document's own checklist items, by its type.

Every one of these names its entity or kind of business in its own heading or document. None is an activity that any reader may do. The selling sections in "What you need to sell things" are tags only, and the content test fails if one goes back to a business type (I checked this by mutation).

The marker now says "Hidden by “Only what applies to me”: {heading}", or "Versteek deur “Net wat vir my geld”: …" in Afrikaans. It claims nothing the guide does not say.

An undecided reader sees everything.

### The stored path (`st.pathView.v1`)

I checked these in chromium against my own preview server:

| Case | Result |
| --- | --- |
| Rules change | The version is a hash of the rules, the business types and the route, titles and `appliesTo` of every document a path can hold. A change to any of them makes the stored view out of date. With an out-of-date view, a document page hides the ring and keeps the section-order pager. The "My path" link in the menus stays visible. Opening the home page rebuilds the view, and the stored version becomes the new hash. |
| Corrupt value (`{not json`) | Removed on load. Nothing throws. |
| Other answers in another tab | The `storage` event refreshes the profile, then the view. The ring and the pager follow. Tested in the dom suite. |
| Storage blocked (`localStorage` throws) | The wizard goes to `my-path/?entity=…&type=…&stage=…`, which shows 4 steps. There are no page errors. A document page then shows no ring, as documented. |
| Trade-off (no ring on document pages until home or My path is opened) | Stated in the hand-over, `docs/design-system.md` and the module comments. The pager in section order is still a correct reading order, so I accept this. |

There is one problem in this area: see minor 1.

### The no-JavaScript wizard

- **With `:has()`:** exactly one "See my path" button shows, for the checked answers, and the list of every result is hidden.
- **Without `:has()`** (I removed the generated style): no result button shows, the "Choose an answer" line is hidden, and the closed "Or choose your answers from a list" leads to a result page. See minor 5 on wording.
- **Readers of the questions:** the kinds-of-business question now names the no-JavaScript hint in its description, and the script swaps in "Choose all that fit".
- **Result pages:** 98 in all. Each has `noindex, nofollow` and none is in the sitemap. "JavaScript is off" is `.no-js-only`, and with JavaScript "Save these answers" keeps them.

### `dist:budget`

- **Matches my own count.** I measured each page with my own script: every `<script src>`, the static imports, each file gzipped at level 9, summed. The figures are the same as the check's:
  - document 22,055 B;
  - My path 24,665 B;
  - home 17,722 B, plus `path-data` (2,528 B) when it rebuilds.
- **Nothing it leaves out.** The built pages have no inline module scripts. Document pages have no dynamic imports at all, so the "with a profile" figure on document pages is not hiding anything.
- **The check fails when it should.** If `PROFILE_CHUNKS` never matches, 2 unit tests fail.

### Mutations

I made each change locally, ran the matching tests, and reverted it. The worktree is clean at `c875c2c`.

| Mutation | Result |
| --- | --- |
| `applies.ts`: no `revealHash()` on connect | 1 dom test fails |
| `applies.ts`: checklist mode keeps "mine" when the answers go | 1 dom test fails |
| `my-path.ts`: name every page of a step, not only the shown ones | 1 dom test fails |
| `path-view.ts` `viewFor`: ignore the version | 4 dom tests fail |
| `path-progress.ts`: no "back to My path" on the last page | 1 dom test fails |
| `check-budget.ts`: `PROFILE_CHUNKS` never matches | 2 unit tests fail |
| `path-pages.ts`: drop the `@supports selector(:has(*))` guard | 1 unit test fails |
| `applicability.json`: "If you sell online" back to `retail-online` | 1 content test fails |

### Accessibility of the new controls

- **Wizard:** radio cards at least 44 px, focus on each step's heading, and `aria-disabled` Next with its reason.
- **Switch:** a native checkbox with `role="switch"` and a description.
- **Marker:** its "Show" button is named "Show hidden part: …", and focus goes to the heading.
- **Labels in names:** "Mark as done", "Remove the tick", "Fill from my profile" and "Undo" each start their name with the visible label, in both languages.
- **Top bar:** the link is named "My path: n of m steps done".
- **Reset:** the dialog is covered by axe.
- **Narrow screens:** no horizontal scroll at 320 px in either language, with or without answers.

## Findings

### minor 1: two home tabs from different builds rewrite the stored path in an endless loop
File: src/scripts/your-path.ts:30-35, src/scripts/path-progress.ts:44-47
Acceptance item: general quality (correctness: the stored path view across tabs)
What is wrong:
- Every `<st-your-path>` subscribes to `pathView`. When the stored view is not for its own `data-version`, it rebuilds the view and stores it.
- Two home pages from different builds (one tab opened before a deploy, one after) each see the other's write as out of date. Each writes its own version back, for as long as both tabs are open.
- In chromium the second tab received 1,327 `storage` events for `st.pathView.v1` in 3 seconds.
- Nothing is lost, but both tabs keep the CPU busy and keep writing to storage. A reader with the home page open on a laptop across a deploy hits it when they open the site again.
How to reproduce: Save a profile and open the home page in two tabs. In tab A, run `document.querySelector('st-your-path').dataset.version = 'old'; document.querySelector('st-your-path').update()`. Count `storage` events in tab B.
Suggested fix: Rebuild only on this page's own triggers (connect, a profile change), not on a `pathView` change from another tab. Or never overwrite a view whose version is not this page's when the change came from a `storage` event.

### minor 2: "Only what applies to me" can hide a type document's whole checklist with no marker or line
File: src/scripts/applies.ts:116-123
Acceptance item: Build 5 (collapsed markers; nothing hidden without saying so)
What is wrong:
- When every item of a checklist is filtered, the whole `<st-checklist>` gets `.st-filtered`, and its "{count} items are hidden" line goes with it.
- No marker stands in for it. The "Your checklist" heading stays, with nothing under it.
- Example: a food business with the switch on opens `business-types/beauty/`, perhaps to add treatments. The checklist is gone, and the page does not say why or offer "Show".
How to reproduce: Seed `{sole-prop,[food],trading}` and `st.onlyMine: true`, then open `business-types/beauty/`.
Suggested fix: Keep the hidden-items line outside the filtered list (or show it for a fully hidden list), with a "Show" button like the section marker's.

### minor 3: with answers saved, the sticky top bar wraps to two rows between 1024 and about 1180 px
File: src/components/navigation/SiteHeader.astro:69-90
Acceptance item: B2 (sticky 56 px top bar); general quality (layout)
What is wrong:
- The "My path" ring link takes the room the theme control had. From 1024 to about 1180 px the bar wraps to two rows: 71 → 123 px measured on `core/tax-and-sars/`, in both languages.
- At these widths the bar is sticky, so tablets in landscape and small laptops lose 52 px of reading height on every page.
- At 320 px the bar (not sticky there) grows from 113 to 165 px.
- WP-33's search button will make this worse.
How to reproduce: Save a profile, set the viewport to 1024 × 700, open any document, and measure `.st-topbar`.
Suggested fix: At these widths, show the ring with a visually hidden label, or move the theme control into the Tools menu or the drawer. Add a check that the bar keeps one row from 1024 px.

### minor 4: the home page's "Your path" card shifts the page when it appears
File: src/pages/[...locale]/index.astro:103, src/components/wizard/YourPathCard.astro:28-35
Acceptance item: D4 performance lens ("no layout shift")
What is wrong:
- The card is rendered `hidden` above the hero and shown once the module runs.
- For a returning reader with answers, chromium measured a cumulative layout shift of 0.109 (0 without answers). That is over the 0.1 "good" limit.
- When the stored path is out of date, the card waits for the lazy rules, so the shift comes later still.
How to reproduce: Save a profile, open My path once, then load the home page with a `layout-shift` `PerformanceObserver`.
Suggested fix: `theme-init.js` already sets `html[data-st-profile]` before first paint. Use it to reserve the card's space, or render the card's frame visible with placeholder text.

### minor 5: without `:has()`, nothing tells the reader the answers alone lead nowhere
File: src/components/wizard/Wizard.astro:276-306, src/lib/path-pages.ts:125-126
Acceptance item: Build 2 and 3 (one GET form that works without JavaScript)
What is wrong:
- Where `:has()` does not work, the reader can answer all three questions, and then nothing appears: no button and no hint (the "Choose an answer" line is inside `@supports`).
- The only way on is a closed `<details>` whose summary starts with "Or", although there is nothing before it to choose instead.
- A reader can find it, so this is not a dead end, but they have to guess that the questions above do nothing.
How to reproduce: With JavaScript off, remove the generated `<style>@supports selector(:has…` block from `find-my-path/`. Answer the three questions.
Suggested fix:
- Outside `@supports`, show one line such as "Choose your path from this list" and open the `<details>` by default.
- Inside `@supports`, close it and keep "Or choose…".
- Or reword the summary so it does not depend on a button being shown.

### nit 1: the old "Hidden: this part is only for …" strings are no longer used
File: src/i18n/en.json:246-250, src/i18n/af.json:246-250 (`doc.hiddenFor.*`), src/i18n/index.ts:100
What is wrong: Since the marker became "Hidden by “Only what applies to me”: …", no page uses `doc.hiddenFor.*`. Only `tests/unit/i18n.test.ts` reads them. Remove them, or note why they stay, so that no later package uses the wording pass 1 found overstated.

### nit 2: the brief still says "validate it with Zod in the store helper"
File: docs/work-packages/WP-31-wizard.md:16
What is wrong: The profile is now checked by the hand-written `parseProfile` (`src/lib/profile.ts`) to save about 1.4 KB, as `docs/design-system.md` says. The brief's Build 1 still asks for Zod. Add a line to the hand-over so the brief and the code agree.

### nit 3: Path 1's last step loses "If you decide yes"
File: src/lib/path-pages.ts:17-27 (applied by src/components/wizard/PathSteps.astro:94-99)
What is wrong:
- The reason comes only from the words after " — ". The guide's item 10 is "If you decide yes, Running a Pty Ltd and Paying yourself from a Pty Ltd". It has no dash, so an undecided reader's step 10 shows the two company documents with no reason.
- The guide's own condition ("If you decide yes") is lost, although step 9 says "decide about a company".
Suggested fix: When an item has no " — ", use the words before its first link as the reason ("If you decide yes"). Or add a reason for this item in `paths.json`, taken from the item's own words.

## Not findings

- **Pass 1 findings:** every finding is fixed as its commit messages say. The brief's status line is updated (nit 1). The hand-over records the budgets without and with answers (nit 4).
- **File ownership:** every changed path is inside the brief's areas: pipeline, `content-meta/`, components, pages, scripts, tests and docs.
  - `64b400b` changes `content-meta/applicability.json` and the generated data together, with a `fix(content):` commit.
  - The fix changes no facts, only which sections the switch may hide.
- **CLAUDE.md rules:**
  - no `href="/…"` literals and no colour literals;
  - storage only through the store (plus the documented `theme-init.js` read), and every key starts with `st.`;
  - both dictionaries have identical keys.
- **The pager on path documents:** every document a path can hold has both Previous and Next in section order, so the path pager always has links to rewrite.
- **The pager when the stored path is out of date:** it stays in section order until the home page or My path is opened. This is the stated trade-off, and I accept it (see "The stored path" above).
