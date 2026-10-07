# WP-31 review pass 4 (Find my path and My path)

- **Reviewer:** an independent reviewer agent, a different instance from passes 1, 2 and 3. It did not write this code.
- **Date:** 6 October 2026
- **Commit reviewed:** `c6c9ba1` ("docs: record WP-31 review pass 3 fixes"), the tip of `worktree-agent-a0193f6dbc3887574`. I reset a clean worktree to it.
- **Scope:** the whole diff, `git diff 61bb68c c6c9ba1`: 95 files, +9741 / -194. Not only the pass 3 fixes in `005fc94` and `c6c9ba1`.

## Verdict

**Clean: 0 blocker, 0 major, 2 minor, 4 nit.**

Pass 3 was not clean, so this is the first clean pass of a new count. WP-31 needs one more consecutive clean pass.

Every pass 3 finding is fixed as the commits say. I checked each one in the browser and with mutations (see "Pass 3 fixes" below).

## Gate results

I ran all of these myself on `c6c9ba1`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 4s").
- `pnpm gate:fast`: exit 0.
  - "All matched files use Prettier code style!"
  - `astro check`: "Result (258 files)", 0 errors.
  - vitest unit + dom: "Test Files 61 passed (61)", "Tests 1299 passed (1299)".
  - "Wrote 0 changed files, removed 0, 83 files in total." "Content drift: none."
  - vitest content: "Tests 37 passed (37)".
- `pnpm build`: exit 0, "198 page(s) built".
  - `dist:audit`: "198 HTML file(s), 23338 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`:
    - "heaviest document page /af/business-types/food/: 21.9 KB without a profile, 21.9 KB with one (budget 25.0 KB, 3.1 KB left)."
    - "heaviest other page /af/my-path/: 24.5 KB without a profile, 24.5 KB with one (budget 45.0 KB, 20.5 KB left)."
    - "198 page(s) within budget."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4781`, default reporters): **924 passed, 89 skipped, 0 failed** (10.5 min).
- `pnpm test:a11y` (same environment): **408 passed, 0 failed** (10.1 min).
- **WebKit was not run.** It is not available in this environment. It stays on `merge-checklist.md`.

## My own checks

### "Only what applies to me": what the switch can hide

**What carries a condition on the page.** Only three kinds of element get `data-applies`:

- headings (`Block.astro`), with a `HiddenMarker` before each one that has a condition;
- checklist items (`TaskListBlock.astro`);
- table rows (`TableBlock.astro`).

Paragraphs, lists, list items, callouts and code blocks never carry their own condition. They are hidden only as part of a heading's section. My path adds one more: each type checklist's `<section data-applies data-types>`.

**What the all-profiles test covers** (`tests/dom/applies-all-profiles.test.ts`):

- It mounts every document in `src/data/{en,af}/docs` as flat siblings, the same shape `Blocks.astro` renders.
- It runs `filterByProfile` for each of the 49 single-type answers.
- It fails if a heading, a block of any kind, a checklist item or a table row is hidden while its heading's condition (and the item's or row's own) applies.
- So it covers every kind of element the switch can hide, the nested case (H2 > H3) and the sibling case (H3 after H3), in both languages.
- **Multi-type answers** are not run, but they need not be. `applies` is a union over types, so a part hidden for `{B, C}` would also be hidden for `{B}` or `{C}`, where the test already looks.
- **Two gaps, both small:**
  - The test builds its own markup rather than reading the rendered page (nit 4).
  - The real content has no sub-heading with its own condition under a heading that does not apply, so one branch of `hiddenPart` is tested by nothing (minor 1).

**Mutations.** When I made `hiddenPart` return the whole section (the pass 3 behaviour), three tests failed:

- the en and af all-profiles tests, which name `#provisional-tax` and its nine blocks for all seven Pty Ltd answers;
- the synthetic nested test in `tests/dom/applies.test.ts`.

**`applicability.json` against the guide's own words.** I listed every heading, task and row with a condition in `src/data/en/docs/**`. I then read the guide's text for each section below.

| Section | Condition | Agrees with the guide? |
| --- | --- | --- |
| Tax: "What SARS wants from a sole proprietor" | sole proprietor | Yes. "Provisional tax" under it is now `{}` and stays visible to a Pty Ltd reader. |
| Tax: "What SARS wants from a company", "Route 4 … (companies only)" | Pty Ltd | Yes. The following "A fifth option" and "Retirement contributions" have no condition. |
| Tax: VAT, Records, calendar | none | Yes. |
| Vehicles: "If you are a sole proprietor" with Routes 1 and 2 | sole proprietor | Yes |
| Vehicles: "If you have a registered company" with its five H3s | Pty Ltd | Yes |
| Vehicles: "The decision most people get wrong" | none | Yes |
| You are the business: the two sole-proprietor H3s, the two Pty Ltd H3s | as named | Yes. "What both structures still need" has no condition. |
| Which template: "If you are a Pty Ltd: the header line …" | Pty Ltd | Yes |
| Working from home: "For a vehicle dealer" | vehicle dealer | Yes |
| Vehicle dealer: "If you trade as a company" / "… as a sole proprietor" | as named | Yes, except the last sentence of the sole-proprietor part (nit 1). |
| What you need to sell things: food, beauty, second-hand, online, import, regulated services | tags | Tags never hide anything, so a Pty Ltd food business still sees "If you sell food". |
| Register: POPIA and company decision | none | Yes |
| Master checklist: Part A2 and its four groups | Pty Ltd | Yes |
| Master checklist: Part B groups | their type | Yes |
| Master checklist: "If a company:" tasks | Pty Ltd | Yes |
| Master checklist: "For a vehicle:" task | vehicle dealer | Yes |
| Master checklist: Part C rows | Pty Ltd (CIPC, ITR14, loan account, beneficial ownership) or tags | Yes. The IRP6 rows have no condition. |
| Type documents' checklists | their type, from the document | Yes |
| Adding new lines, Paying yourself, Running a Pty Ltd | Pty Ltd, from the document ("… to your Pty") | Yes |

The Afrikaans data has the same conditions on the same ids in every document.

**In chromium** I seeded four profiles with the switch on: Pty Ltd vehicle dealer, sole-proprietor food, sole-proprietor vehicle dealer, and Pty Ltd food. I opened ten pages: Tax (en and af), Vehicles, You are the business (en and af), `/checklist/` with "Only what applies to me", Vehicle dealer, Working from home, Which template, and Adding new lines.

- Every collapsed section has its own visible marker.
- `#provisional-tax` and its IRP6 list are visible for Pty Ltd readers in both languages. They are visible also when the page opens on the Route 4 anchor.
- A partly hidden checklist says "1 item is hidden because it does not apply to you" and offers "Show 1 hidden item" ("Wys 1 versteekte item"), a 44 px button. Pressing it brings the item back.
- No page errors.

### The reading paths

I ran `buildPath` on the built `paths.json` and `manifest.json` for ten profiles and compared each result with A5 and with Paths 1, 2 and 4 of "How to use this toolkit".

- **Path 1 (not started):**
  - Sole proprietor + food: 9 steps.
  - Undecided + General: 10 steps, with three type documents at step 3 (A5 fixture).
  - Pty Ltd + beauty: 10 steps. Step 10 is "Running a Pty Ltd" and "Paying yourself".
- **Path 2 (trading):** 4 steps for sole-proprietor dealer, Pty Ltd retail, and undecided services + food (two type documents at step 3). Step 4 goes to `core/register#popia-register-your-information-officer`. The built result pages say "specifically the POPIA section" ("spesifiek die afdeling oor POPIA").
- **Path 4 (Pty Ltd, growing):**
  - Vehicle dealer: exactly the guide's ten documents in order (A5 fixture).
  - Professional + dealer: 10 steps.
  - Food or General: 9 steps without "Vehicles", and with the dealer-only reasons hidden.

### The stored path, across tabs and builds

- The stored view's version is a hash of the rules plus each document's route, titles and conditions (`scripts/content/paths.ts:183-193`). So a build that renames a route also invalidates old views.
- When I made `pathView` changes rebuild again, the dom test "never writes back a path another tab stored" failed.

### The home card (390 px, CLS over 2.5 s or more)

| Case | CLS |
| --- | --- |
| No answers | 0 |
| Valid answers (en and af) | 0 |
| `{"entity":"pty","bad":1}` | 0. `data-st-profile` is not set. |
| `{"entity":"` | 0 |
| Valid answers, every module blocked (`theme-init` loads) | 0.239, once at 1.1 s, when the fallback gives the space back. Before the fix the invisible box stayed for good. |
| Valid answers, modules 2.5 s late | **0.478**: the box collapses at 1 s, then comes back when the module connects (minor 2) |

When I made `theme-init.js` set `data-st-profile` for any stored value, at least 10 theme-init dom tests failed.

### The no-JavaScript wizard

The `nojs` project passed. It covers:

- one button for the checked answers, with `:has()`;
- the open list without `:has()`;
- "Pty Ltd, growing" without a Pty Ltd;
- My path's empty state;
- documents offering no switch.

Result pages are `noindex` and not in `sitemap-0.xml`.

### Other mutations

I made each change locally, ran the matching tests, and reverted it. The worktree was clean afterwards.

| Mutation | Result |
| --- | --- |
| `hiddenPart` returns the whole section | 3 dom tests fail |
| `hiddenPart` breaks only at a sub-heading with no condition (drops `\|\| matches(element, who)`) | **nothing fails** (minor 1) |
| A partly hidden checklist offers no "Show" | 1 dom test fails |
| `theme-init.js` accepts any stored value | at least 10 dom tests fail |
| `stepWhy` drops the words after the link | 1 unit test fails |
| Path elements rebuild on every `pathView` change | 1 dom test fails |

### Accessibility and budget

- axe passed on every sitemap URL in both themes, and on the wizard steps and My path with the dialog open.
- The new checklist button is named by its visible text ("Show 2 hidden items"), so a screen reader's button list can tell the buttons apart.
- `dist:budget` matches the hand-over: 21.9 KB on the heaviest document page.

## Findings

### minor 1: one branch of `hiddenPart` is covered by no test
File: src/scripts/applies.ts:60-75 (line 68)
Acceptance item: Tests ("dom tests … personalisation"); Build 5
What is wrong:
- `hiddenPart` stops a collapsed part at a deeper heading that either has no condition (`!element.hasAttribute('data-applies')`) or has its own condition that applies to the reader (`matches(element, who)`).
- Only the first case is tested:
  - the synthetic test in `tests/dom/applies.test.ts:105-141` uses a sub-heading with no condition;
  - the real content has no sub-heading whose own condition applies under a parent that does not (for example a type-only H3 under a Pty Ltd H2).
- When I removed `|| matches(element, who)`, all 23 tests in `applies.test.ts` and `applies-all-profiles.test.ts` still passed.
Why it matters: The first `applicability.json` override of that shape, such as a dealer-only sub-heading under a company-only heading, would silently hide it from a sole-proprietor dealer. The all-profiles test would catch that only once such content exists, and its message would point at content, not at the regression.
How to reproduce: Delete `|| matches(element, who)` at `src/scripts/applies.ts:68`, then run `pnpm exec vitest run tests/dom/applies.test.ts tests/dom/applies-all-profiles.test.ts`.
Suggested fix: Add a synthetic case to `applies.test.ts`: H2 `data-entity="pty"` > H3 `data-types="vehicle-dealer"`, for `{sole-prop, [vehicle-dealer]}`. The H3 and its content must stay visible.

### minor 2: when the home page's modules take more than a second, the card makes the page jump twice
File: src/components/wizard/YourPathCard.astro:73-89, src/scripts/your-path.ts:26-30
Acceptance item: D4 performance lens ("no layout shift")
What is wrong:
- The pass 3 fallback gives back the card's kept space after one second if the module has not connected.
- If the module then connects (a slow connection, not a dropped one), `data-connected` stops the animation. The kept space comes back, and then the card fills it.
- In chromium at 390 px with every module delayed 2.5 s, CLS was 0.478: two shifts of 0.239, at 1.1 s and at about 5 s. Before the fix this case was 0, because the space was kept until the card appeared.
- It happens only for a reader with answers, on a slow first load of the home page. Cached loads are 0.
Why it matters: On a slow mobile connection, a reader's home page jumps under their thumb, twice. A single shift (when the card finally appears) would be the most a late card should cost.
How to reproduce: Seed valid answers. Delay every `/_astro/*.js` request except `theme-init` by 2.5 s with `page.route`. Load `/` and observe `layout-shift`.
Suggested fix: Once the space has been given back, do not reserve it again. For example, have `your-path.ts` set `data-no-path` instead of reserving the space when it connects after the give-up time, so the card appears once. Or give up only when the module fails to load (`error` on its script), not on a timer.

### nit 1: a dealer's "TRN or BRNC is worth having" sits in the sole-proprietor part
File: docs/rsa-business-toolkit/04 Your kind of business/01-vehicle-dealer.md:142
What is wrong:
- The last sentence of "If you trade as a sole proprietor" is "For a dealer, a TRN or BRNC is worth having. It separates stock vehicles from your personal vehicle …".
- It speaks to both entities, but a Pty Ltd dealer with the switch on does not see it. They do see "If you trade as a company", which says the BRNC is required.
Suggested fix: In a later `fix(content):` change, move the sentence under "Layer 2" after both sub-headings, or exempt it. It is not a fact error.

### nit 2: "Show N hidden items" focuses the list's first box, not the item it brought back
File: src/scripts/applies.ts:150
What is wrong:
- In `core/you-are-the-business` (sole proprietor), the hidden item is the fourth.
- After "Show 1 hidden item", focus goes to the first item ("I know whether I can contribute to UIF …").
- A screen-reader user then has to find which item came back.
Suggested fix: Focus the first box that was hidden, and fall back to the first box.

### nit 3: some company-only tasks in "You are the business" are not marked
File: docs/rsa-business-toolkit/01 Core - applies to everyone/10-you-are-the-business.md:192-194; content-meta/applicability.json (`taskPrefixes`)
What is wrong:
- "A second director appointed …", "Checked whether my MOI allows an executor …" and "A will that deals with the shares …" are company duties. They have no "If I have a company" prefix, so a sole proprietor still sees them with the switch on.
- This shows too much, not too little, so nobody loses anything.
Suggested fix: Optional. Add the prefix in the English markdown, or a `tasks` entry in `applicability.json`.

### nit 4: the all-profiles test models the page instead of reading it
File: tests/dom/applies-all-profiles.test.ts:35-101
What is wrong:
- The test builds its own flat DOM from the JSON.
- If `Block.astro`, `TaskListBlock.astro` or `TableBlock.astro` changed what they render, the test would keep passing. Examples: a heading without `data-depth`, or a heading and its section wrapped in a container.
- Only the single e2e check for `#provisional-tax` (`tests/e2e/wizard.spec.ts`) looks at a real page.
Suggested fix: Optional. Add a unit test that renders one document with the Astro container API and asserts the attributes the model relies on: `data-depth` on every heading, a marker before each heading with a condition, and blocks as direct siblings.

## Pass 3 fixes

| Pass 3 finding | Fixed in | My check |
| --- | --- | --- |
| major 1: "Provisional tax" hidden from Pty Ltd readers | `005fc94` | Visible for Pty Ltd readers in both languages. The all-profiles test fails without the fix (en and af). It also covers every other `{}` override, because it runs every document for all 49 answers. |
| minor 1: invalid answers make the home page jump | `005fc94` | CLS 0 for `{"entity":"pty","bad":1}` and `{"entity":"`. `data-st-profile` is not set. The theme-init tests fail when the check is loosened. A slow module now costs two shifts (minor 2). |
| minor 2: a partly hidden checklist has no "Show" | `005fc94` | "Show 1 hidden item" on `core/you-are-the-business`, and "Show 2 hidden items" on `/checklist/`. A dom test fails without it. |
| minor 3: the checklist line's button is named only "Show" | `005fc94` | Named "Show N hidden items" / "Wys N versteekte items". |
| nit 1: Path 2 step 4 drops "specifically the POPIA section" | `005fc94` | On the built result pages in both languages. A unit test fails without it. |

## Not findings

- **File ownership:** every changed path is inside the brief's areas: pipeline, `content-meta/`, components, pages, scripts, tests and docs.
- **CLAUDE.md rules:**
  - no `href="/…"` literals and no colour literals in the diff;
  - storage only through the store, plus the documented read-only `theme-init.js`, and every key starts with `st.`;
  - both dictionaries have identical keys (unit test).
- **A sole proprietor's Path 1 has no step 10.** A5 says step 10 is only for Pty Ltd or undecided. Passes 1 to 3 accepted this, and so do I.
- **A type document's checklist collapses for a reader of another type, but its headings stay.** The headings carry only entity conditions. The document-level type condition goes to its tasks. A reader who opens another type's document on purpose still sees its text, with the checklist one "Show" away. This matches A5.
- **No ring on document pages until the home page or My path rebuilds an out-of-date stored path.** This is the documented trade-off; I accept it, as passes 2 and 3 did.
