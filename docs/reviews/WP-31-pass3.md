# WP-31 review pass 3 (Find my path and My path)

- **Reviewer:** an independent reviewer agent, a different instance from passes 1 and 2. It did not write this code.
- **Date:** 6 October 2026
- **Commit reviewed:** `1bbed5a` ("docs: record WP-31 review pass 2 fixes"), the tip of `worktree-agent-a0193f6dbc3887574`. I reset a clean worktree to it.
- **Scope:** the whole diff, `git diff 61bb68c 1bbed5a`: 93 files, +9036 / -187. Not only the pass 2 fixes in `64850e0` and `1bbed5a`.

## Verdict

**Not clean: 0 blocker, 1 major, 3 minor, 1 nit.**

The two-pass count restarts. Pass 2 was clean, but this pass found one major:

- **Major 1.** With "Only what applies to me" on, a Pty Ltd reader loses the "Provisional tax" section of Tax and SARS. The guide says this section applies to "a director of a company". The content pipeline marks it as applying to everyone, but the switch collapses it together with its parent, "What SARS wants from a sole proprietor".

Every pass 2 finding is fixed as its commits say, and I checked each one in the browser (see "Pass 2 fixes" below).

## Gate results

I ran all of these myself on `1bbed5a`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 7.3s").
- `pnpm gate:fast`: exit 0.
  - "All matched files use Prettier code style!"
  - `astro check`: "Result (257 files)", 0 errors, 0 warnings, 0 hints.
  - vitest unit + dom: "Test Files 60 passed (60)", "Tests 1279 passed (1279)".
  - "Wrote 0 changed files, removed 0, 83 files in total." "Content drift: none."
  - vitest content: "Tests 37 passed (37)".
- `pnpm build`: exit 0, "198 page(s) built".
  - `dist:audit`: "198 HTML file(s), 23338 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`:
    - "heaviest document page /af/business-types/food/: 21.7 KB without a profile, 21.7 KB with one (budget 25.0 KB, 3.3 KB left)."
    - "heaviest other page /af/my-path/: 24.2 KB without a profile, 24.2 KB with one (budget 45.0 KB, 20.8 KB left)."
    - "198 page(s) within budget."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4761`, default reporters): **914 passed, 89 skipped, 0 failed** (11.2 min).
- `pnpm test:a11y` (same environment): **408 passed, 0 failed** (8.5 min).
- **WebKit was not run.** It is not available in this environment. It stays on `merge-checklist.md`.

## My own checks

### The reading paths

I ran `buildPath` on the built `src/data/paths.json` and `manifest.json` for 49 profiles: each entity × {vehicle dealer, food, General, beauty + General, professional + vehicle dealer, General + food, retail} × each allowed stage. I compared each result with A5 and with Paths 1, 2 and 4 of "How to use this toolkit".

- **Path 1 (not started):**
  - Sole proprietor: 9 steps.
  - Pty Ltd and undecided: 10 steps. Step 10 is "Running a Pty Ltd" and "Paying yourself", with the reason "If you decide yes" (pass 2, nit 3 is fixed).
  - Step 3 lists the type documents, primary type first, with General expanded in place.
- **Path 2 (trading):** 4 steps for every entity. Step 4 opens `core/register/#popia-register-your-information-officer`, and that anchor exists in both languages.
- **Path 4 (Pty Ltd, growing):**
  - `{pty, [vehicle-dealer], pty-growing}` gives exactly the guide's ten documents, in order.
  - With professional + vehicle dealer, the path has 10 steps, with both type documents at step 4.
  - With any other kind of business, "Vehicles" drops out and the path has 9 steps. The dealer-only reasons on steps 4, 5, 6, 8 and 9 are hidden.
- **Afrikaans:** I read the built result pages for `undecided/general/not-started`, `pty/food/pty-growing` and `sole-prop/beauty/trading` in both languages. The steps and documents are the same. Each Afrikaans reason is the Afrikaans list item's own words.

### "Only what applies to me"

- **What can hide.** I listed every heading, task and table row in `src/data/en/docs/**` with an entity or business-type condition. I then turned the switch on for a Pty Ltd vehicle dealer and for a sole-proprietor food business, in both languages, on:
  - Tax and SARS;
  - Vehicles;
  - You are the business;
  - Vehicle dealer;
  - Working from home and safety;
  - Which template to use when.
- **Markers.** Every collapsed section shows its marker, with "Show".
- **The problem.** One collapsed section hides a part that the guide and the content data both say applies to everyone (major 1).
- **Checklists.** A checklist with every item hidden now collapses to its line, with "Show" (pass 2, minor 2 is fixed). A checklist with only some items hidden says how many are hidden, but offers no "Show" (minor 2).
- **Undecided readers** see everything.

### The stored path (`st.pathView.v1`)

I checked these in chromium against my own preview server.

| Case | Result |
| --- | --- |
| Corrupt view (`{not json`) | Dropped. The home page rebuilds it. No errors. |
| Corrupt or invalid profile | The store drops it. Nothing throws. On the home page, the reserved space collapses (minor 1). |
| Two tabs from different builds | The element only draws a stored path that another tab wrote. It never writes back. When I made `pathView` changes rebuild again (a mutation), the dom test failed. |
| Storage blocked (`localStorage` throws) | The wizard goes to `my-path/?entity=sole-prop&type=food&stage=trading`, which shows 4 steps and the storage warning. A document page shows no ring. No page errors. |

### The no-JavaScript wizard

The `nojs` project passed. Its tests cover:

- with `:has()`, one button for the checked answers;
- without `:has()`, the open list with "Choose your path from this list" and its hint;
- "Pty Ltd, growing" without a Pty Ltd;
- My path's empty state.

The pass 2 fix (an open `<details>`, closed only inside `@supports selector(:has(*))`) is in the markup. When I removed `open`, the wizard markup fixture test failed (see the mutations).

### The top bar

I seeded `{pty, [vehicle-dealer, general], pty-growing}`, opened My path, then opened `core/tax-and-sars/` in each language.

- **From 1024 to 1600 px** (1024, 1100, 1180, 1240, 1279, 1280, 1300, 1366, 1440, 1600):
  - the bar is 71 px, one row, in both languages;
  - no control is outside the viewport, and none is smaller than 24 px;
  - there is no horizontal scroll;
  - the ring shows, and the link is named "My path: 0 of 10 steps done", or "My roete: 0 van 10 stappe klaar" in Afrikaans.
- **At 320, 360 and 390 px:**
  - the bar is 113 px, with no clipped controls and no horizontal scroll;
  - every control in it is at least 44 × 44 px;
  - the ring is visible.
- **At 768 and 1023 px:** the bar is 61 px.

### Layout shift on home (390 px, CLS over 1.5 s)

| Case | CLS |
| --- | --- |
| No answers | 0 |
| Answers, stored view current | 0 |
| Answers, no stored view (lazy rebuild) | 0 |
| Answers, corrupt stored view | 0 |
| Invalid or corrupt `st.profile.v1` | 0.313 (minor 1) |

### The `!important` override

The rule in `YourPathCard.astro` is `html.js[data-st-profile] st-your-path[hidden]:not([data-no-path])`, so it can only match `st-your-path`.

- **Home page with answers:** no other `[hidden]` element has a computed `display` other than `none`.
- **A document page:** the same.
- **While the card is invisible:** its links are `visibility: hidden`, so they are out of the tab order and the accessibility tree.

### `dist:budget`

The figures match pass 2's method, and they are within budget (see above). Document pages still never load `path-data`.

### Mutations

I made each change locally, ran the matching tests, and reverted it. The worktree was clean afterwards.

| Mutation | Result |
| --- | --- |
| `applies.ts`: a fully hidden list never offers "Show" | 1 dom test fails |
| `path-progress.ts`: rebuild on every `pathView` change | 1 dom test fails ("never writes back a path another tab stored") |
| `path-pages.ts` `stepWhy`: no fallback to the words before the link | 1 unit test fails |
| `Wizard.astro`: the fallback `<details>` not `open` | 2 unit tests fail (en, af markup fixtures) |
| `wizard.ts`: "Pty Ltd, growing" never disabled | 1 dom test fails |
| `applies.ts`: `always` mode never filters | 1 dom test fails |
| `path-engine.ts`: ignore a step's `when` | 1 unit test fails |

No test covers major 1. The content test `tests/unit/content/applicability.test.ts:54-73` checks that the pipeline gives "Provisional tax" no condition. No dom or e2e test checks that the switch then leaves it visible.

### Accessibility of the new controls

- **axe:** passed on every wizard step, on My path with the dialog open, on a document with the switch on, and on every sitemap URL, in both themes.
- **Top bar link:** its accessible name starts with its visible label at every width where the label shows. Below 1280 px the ring stands alone and keeps the full name.
- **Switch:** a native checkbox with `role="switch"` and a description.
- **Marker:** its "Show" is named "Show hidden part: …".

## Findings

### major 1: "Only what applies to me" hides "Provisional tax" from a Pty Ltd reader, though the guide says it applies to company directors
File: src/scripts/applies.ts:37-51 (`sectionOf`), src/scripts/applies.ts:132-138 (`filterByProfile`); content-meta/applicability.json:70-73
Acceptance item: Build 5 ("Only what applies to me" and the collapsed markers); A5 matching rule
What is wrong:
- In `core/tax-and-sars`, "## What SARS wants from a sole proprietor" applies to `sole-prop`. Its child "### Provisional tax" is deliberately exempted: `content-meta/applicability.json:73` gives it `{}`. The generated `appliesTo` is `undefined` in both languages, and `tests/unit/content/applicability.test.ts:54-73` checks this.
- In the browser, `filterByProfile` collapses the H2's whole section with `sectionOf`, up to the next H2. That includes the H3 and every block under it, whatever their own condition.
- So for a Pty Ltd reader with the switch on, the section disappears, in English and in Afrikaans. That section says, at docs/rsa-business-toolkit/01 Core - applies to everyone/03-tax-and-sars.md:44 and :46:
  - "you must register as a provisional taxpayer. This applies to … a director of a company";
  - "It applies whether you trade as yourself or through a company".
  - It also gives the IRP6 dates.
- The only trace is the marker "Hidden by “Only what applies to me”: What SARS wants from a sole proprietor — Show". A company owner has no reason to open a section with that name.
Why it matters:
- Tax and SARS is on every path a Pty Ltd reader gets: Path 1 step 8, Path 2 step 2 and Path 4 step 6. The switch is the feature's main control.
- So a one-person Pty Ltd owner who turns the switch on is plausibly told nothing about their own provisional-tax duty as a director. That duty is something the guide says they need.
- The switch's help text promises it hides only "the parts that are not for how you trade". Here it hides a part the content data explicitly marks as being for everyone.
How to reproduce: Seed `st.profile.v1 = {"entity":"pty","businessTypes":["vehicle-dealer"],"stage":"pty-growing"}` and `st.onlyMine = true`. Open `core/tax-and-sars/` (or `af/core/tax-and-sars/`). `#provisional-tax` is inside `.st-filtered`, and the only visible marker is for `what-sars-wants-from-a-sole-proprietor`.
Suggested fix:
- **Mark the exemption on the page.** Render a heading that has its own explicit "applies to everyone" override with an attribute, for example `data-applies-all`.
- **Stop the collapse there.** In `sectionOf`, stop the collapsed range at such a heading. Its subsection then stays visible under a collapsed parent. Or keep the parent heading visible as context whenever a child is exempt.
- **Add tests.** Add a dom test with a nested exempt heading. Add an e2e check that `#provisional-tax` stays visible for a Pty Ltd reader with the switch on.
- **Re-check the other overrides.** Check every other `{}` heading override in `applicability.json` the same way.

### minor 1: an invalid or corrupt saved profile makes the home page jump on that visit
File: src/scripts/theme-init.js:27, src/components/wizard/YourPathCard.astro:68-71, src/scripts/your-path.ts:26-31
Acceptance item: D4 performance lens ("no layout shift")
What is wrong:
- `theme-init.js` sets `data-st-profile` for any stored value that starts like `{…"entity":"`. The card then keeps its space from first paint.
- When the store rejects the value (a truncated write, an old shape, "Pty Ltd, growing" without a Pty Ltd), the card sets `data-no-path`, and the space collapses after first paint.
- In chromium at 390 px, CLS was 0.313 for `{"entity":"pty","bad":1}` and for `{"entity":"`. With valid answers it is 0.
- It happens once, because the store removes the bad value.
- If the module never runs (a dropped request on a poor connection), the invisible box stays above the hero. My path has a one-second reveal fallback for the same case; the home card has none.
How to reproduce: Seed `st.profile.v1` with `{"entity":"pty","bad":1}`, then load `/` with a `layout-shift` `PerformanceObserver`.
Suggested fix:
- Make the head check closer to `parseProfile`, for example by also requiring `"stage":"` and `"businessTypes":[`.
- Give the reserved box the same timed fallback My path uses, so it collapses if the module has not run after a second.

### minor 2: a checklist with only some items hidden says so, but offers no "Show"
File: src/scripts/applies.ts:149-153
Acceptance item: Build 5 (collapsed parts with "Show"; nothing hidden without a way back)
What is wrong:
- `hiddenLine(line, …, all)` offers "Show" only when every item of the list is hidden.
- When some items are hidden, the line says "1 item is hidden because it does not apply to you", with no button. Example: the "If I have a company and pay myself a salary" item in `core/you-are-the-business`, for a sole proprietor.
- The only way back is the switch. Below 1024 px that is at the top of the article, far above the checklist at the end of the page.
Why it matters: The reader is told something is hidden but cannot see what, and the way back is not next to the message. This is rare: few documents have mixed conditions in one list.
How to reproduce: Seed `{sole-prop,[food],trading}` and `st.onlyMine: true`, then open `core/you-are-the-business/` at 390 px. Scroll to the checklist.
Suggested fix: Always offer "Show" in the line when it is visible, using `showList` as it is.

### minor 3: the checklist line's "Show" button is named only "Show"
File: src/components/content/TaskListBlock.astro:101-106
Acceptance item: B5 (roles and names); general quality
What is wrong:
- The section marker's button is named "Show hidden part: {heading}".
- The checklist line's button is named only "Show".
- On a page with several such lists, a screen reader's button list shows several identical "Show" buttons.
Suggested fix: Give the button the name "Show hidden items" (and an Afrikaans string), or "Show hidden items: {list legend}".

### nit 1: Path 2 step 4 drops "specifically the POPIA section"
File: src/lib/path-pages.ts:19-38, content-meta/paths.json:31
What is wrong:
- The guide's item is "[Register: what you actually need](…), specifically the POPIA section". Its words come after the link and there is no dash, so `stepWhy` finds no reason.
- The step shows only the document title. It does link to `#popia-register-your-information-officer`, but nothing tells the reader that only that section is meant.
Suggested fix: Use the words after the link as the reason when there is no dash and nothing before the link ("specifically the POPIA section").

## Pass 2 fixes

| Pass 2 finding | Fixed in | My check |
| --- | --- | --- |
| minor 1: two tabs rewrite the stored path | `64850e0` | Only connecting and new answers rebuild. The dom test fails when `pathView` changes rebuild again. |
| minor 2: an emptied checklist vanishes | `64850e0` | The list collapses to its line, with "Show", and focus goes to the first box. The dom test fails without it. Partly hidden lists: see minor 2. |
| minor 3: the top bar wraps from 1024 to 1180 px | `64850e0` | 71 px, one row, from 1024 to 1600 px in both languages. |
| minor 4: the home card shifts the page | `64850e0` | CLS 0 with valid answers, with and without a stored view. Invalid answers: see minor 1. |
| minor 5: no `:has()` and nothing points to the list | `64850e0` | The list is open, with a heading and a hint. It is hidden inside `@supports`. |
| nit 1: unused `doc.hiddenFor.*` | `64850e0` | Removed from both dictionaries. A unit test (`tests/unit/i18n.test.ts:849`) keeps them out. |
| nit 2: the brief asks for Zod | `1bbed5a` | The brief's Build 1 and hand-over explain `parseProfile`. |
| nit 3: "If you decide yes" | `64850e0` | Step 10 shows it in both languages ("As jy ja besluit"). |

## Not findings

- **File ownership:** every changed path is inside the brief's areas: pipeline, `content-meta/`, components, pages, scripts, tests and docs.
- **CLAUDE.md rules:**
  - no `href="/…"` literals and no colour literals in the diff;
  - storage only through the store, plus the documented read-only `theme-init.js`, and every key starts with `st.`;
  - both dictionaries have identical keys (unit test).
- **Afrikaans facts:** the Afrikaans reasons and step titles are the Afrikaans documents' own words, so no numbers or codes are introduced.
- **The home card's heading:** "Your path" (`h2`) comes before the hero's `h1`. B6 puts the card first, and axe's WCAG rules pass, so I did not raise it.
- **No ring on document pages until the home page or My path rebuilds an out-of-date stored path.** This is the trade-off documented since pass 1, and I accept it, as pass 2 did.
