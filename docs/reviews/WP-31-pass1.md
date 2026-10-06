# WP-31 review pass 1 (Find my path and My path)

- **Reviewer:** an independent reviewer agent. It did not write this code.
- **Date:** 5 October 2026
- **Commit reviewed:** `c8bd782` ("docs: document Find my path, My path and the reading-path rules"), the tip of `worktree-agent-a0193f6dbc3887574`. I reset a clean worktree to it.
- **Scope:** `git diff 61bb68c c8bd782`: 72 files, +6774 / -83.

## Verdict

**Not clean: 0 blocker, 5 major, 8 minor, 4 nit.**

The path engine is right. The rules follow "How to use this toolkit" item by item in both languages, and the pipeline check stops them from drifting. The tests catch every behaviour I removed. The wizard, My path and the markers work with the keyboard. The five majors are:

1. With a saved profile, a document page loads more than the 25 KB JavaScript budget. Without one there is 1 KB left for WP-33.
2. Without JavaScript, the wizard has no submit button at all in a browser without `:has()`.
3. "Only what applies to me" hides "If you sell online" and "If you import anything" from everyone who did not choose Retail and online. The marker then says the section is "only for" that kind of business.
4. On My path, the business-type step's "Mark as done" button names all six kinds of business.
5. The names of "Mark as done" and "Fill from my profile" do not contain their visible labels (WCAG 2.5.3), in both languages.

## Gate results

I ran all of these myself on `c8bd782`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 6.1s").
- `pnpm gate:fast`: exit 0.
  - "All matched files use Prettier code style!". ESLint and stylelint: clean.
  - `astro check`: "Result (245 files)", 0 errors, 0 warnings, 0 hints.
  - vitest unit + dom: "Test Files 55 passed (55)", "Tests 1229 passed (1229)".
  - "Wrote 0 changed files, removed 0, 83 files in total." "Content drift: none."
  - vitest content: "Tests 37 passed (37)".
- `pnpm build`: exit 0, "198 page(s) built".
  - `dist:audit`: "198 HTML file(s), 23048 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4681`): **897 passed, 88 skipped, 1 failed** (12.8 min).
  - The failure was `wizard.spec.ts:82` "“Pty Ltd, growing” is disabled, with its reason, unless the answer is Pty Ltd" on chromium. The page stayed on question 2 after the second Next.
  - I was running vitest mutations at the same time, so the machine was loaded.
  - Run alone with `--repeat-each=15` on chromium and mobile, it passed 30 of 30. See minor 7.
- `pnpm test:a11y`: **408 passed** (13.7 min). This includes the new "axe on Find my path and My path" block and the 98 result pages, which the route loop reads from `dist/`.
- Coverage, `pnpm exec vitest run --project unit --project dom --coverage`:
  - `src/lib/path-engine.ts`: 100 statements, 98.91 branches, 100 functions, 100 lines (line 139).
  - `src/lib/path-pages.ts`: 98.03 / 89.65 / 95.83 / 100.
  - `src/lib/profile.ts` and `src/lib/profile-store.ts`: 100 throughout. The text reporter leaves out fully covered files.
  - The run exits 1 on the older `src/lib/content/**` functions floor (90.24% against 100%). This predates WP-31 and is in `backlog.md`.
- **WebKit was not run.** It is not available in this environment. It stays on `merge-checklist.md`.

## My own checks

### The reading paths

I ran `buildPath` for 35 profiles: each entity × {vehicle dealer, food, General, beauty + General, professional + vehicle dealer} × each allowed stage. I compared each result with A5 and with Paths 1, 2 and 4 in English and Afrikaans.

- **Not started (Path 1).**
  - Sole proprietor: 9 steps, without "Running a Pty Ltd" and "Paying yourself".
  - Pty Ltd and undecided: 10 steps, so item 10 appears only for those two, as A5 says.
  - Step 3 holds the reader's type documents. The primary type comes first, and General expands in place: beauty + General gives beauty, retail, services, professional.
- **Trading (Path 2).** Checklist, tax, the type documents, then `core/register#popia-register-your-information-officer`, for every entity.
  - A trading Pty Ltd is not sent to "Running a Pty Ltd". That follows A5 and the guide's Path 2, and Part A2 of the checklist (step 1) covers the company duties. It is not a finding.
- **Pty Ltd, growing (Path 4).**
  - `{pty, [vehicle-dealer], pty-growing}` gives exactly Path 4's ten documents, in order.
  - Another kind of business drops "Vehicles" and renumbers to 9 steps. The dealer-only "why" text is hidden on steps 4, 6, 7, 9 and 10, and shown on the general ones ("what your company already owes each year").
  - If an invalid `pty-growing` profile without a Pty Ltd reaches the engine, it gets Path 2.
- **The "why" text** is the words after the em dash in each list item, read from the document in the page's language. The Afrikaans list uses the same " — " separator, and items without one show no reason. Nothing is invented. The pipeline check (`scripts/content/paths.ts`) fails when a step's documents differ from the links in its list item.
- **Matching rule.** `applies` is A5 to the letter. Tags never hide anything. Undecided sees both entities. I listed every condition in the generated data (about 200 headings, tasks and rows). The engine applies them correctly. One mapping it applies is wrong for readers: see major 3.

### Mutations

I made each change locally, ran the matching tests, and reverted it. The worktree is clean at `c8bd782`.

| Mutation | Result |
| --- | --- |
| `applies`: drop `profile.entity === 'undecided'` | 2 unit tests fail, one of them the A5 Path 1 fixture |
| `buildPath`: drop the "first step only" dedupe | 1 unit test fails |
| `buildPath`: `why: true` always | 1 unit and 1 dom test fail |
| `resetProfile` also clears the ticks | the profile-store dom test fails |
| Wizard: no focus on the step heading | the wizard dom test fails |
| Wizard: never disable "Pty Ltd, growing" | the wizard dom test fails |
| `showSection`: no focus on the heading | the applies dom test fails |
| `checkPaths`: skip the "item links to this document" check | the content paths test fails |

### The no-JavaScript wizard

In chromium, the 49 `formaction` buttons work. All are `display: none` (so not focusable) until one matches. Exactly one shows, named "See my path", and it lands on the right page. The disabled, hidden first submit button stops Enter from submitting through the wrong result.

The result pages are `noindex`, left out of the sitemap and guarded by `NOINDEX_REQUIRED`. The e2e test checks every one against `buildPath`. Without `:has()` the form is a dead end: see major 2.

### Profile and store

- **Validation.** `zod/mini` rejects an unknown type, a duplicate type, no type, and `pty-growing` without a Pty Ltd.
- **Corrupt or invalid stored value.** The store removes it, and My path shows its empty state once the module connects.
- **Storage blocked.** The answers travel in the address, and both pages say they are not saved.
- **Reset** keeps the ticks. The mutation above proves the test guards this.
- **Cross-tab.** The `storage` event is tested for both keys.
- **`theme-init.js`** stays an external `script-src 'self'` file. It sets `data-st-profile` for any non-null string, valid or not. See minor 5.

### JavaScript budget

I measured it again: every `<script src>` of a built page and its static imports, each gzipped at level 9, then summed.

| Page | Files | Gzipped |
| --- | --- | --- |
| `business-types/food/` (heaviest document) | 27 | 24,625 B (24.0 KB) |
| same page with a profile (adds `path-data`, 2,303 B, lazily) | 28 | 26,928 B (26.3 KB) |
| `my-path/` | 26 | 25.6 KB (tool budget 45) |
| `checklist/` | 28 | 23.0 KB |
| `find-my-path/` | 17 | 18.8 KB |

The store chunk (nanostores, `zod/mini` and now the profile schema) is 8.8 KB of the document total. See major 1.

## Findings

### major 1: a document page loads more than 25 KB of JavaScript once the reader has answers, and leaves WP-33 no room
File: src/scripts/path-progress.ts:27, src/components/navigation/SiteHeader.astro:110, docs/testing.md:229, docs/design-system.md:528
Acceptance item: JS budgets recorded (DoD); plan B3 flow 9 (≤25 KB gz on document pages)
What is wrong:
- `<st-path-progress>` is on every page. When a profile exists, it imports `path-data` (2.3 KB gz) on page load, not on a user action.
- For the reader this package is for, the heaviest document page loads 26.3 KB. Without a profile it is 24.0 KB, which leaves less than 1 KB for WP-33's search trigger on every page.
- The docs record only the 24.1 KB figure.
- MiniSearch counts as lazy because it loads when the reader opens search. This chunk loads on its own.
How to reproduce: Seed `st.profile.v1`, open `business-types/food/`, and add up the gzipped `.js` responses. Or sum `dist/_astro` files as in the table above.
Suggested fix:
- Put the ring's numbers in the store, or compute them without the rules on document pages.
- Or drop `zod/mini` from the client profile path (a small hand-written guard).
- Or move the path-following pager behind a smaller module.
- Record the with-profile figure in `docs/testing.md` and leave stated room for WP-33.

### major 2: without JavaScript, the wizard has no way forward in a browser without `:has()`
File: src/components/wizard/Wizard.astro:254-267, src/components/wizard/Wizard.astro:295-297, src/lib/path-pages.ts:109
Acceptance item: Build 2 and 3 ("one GET form that works without JavaScript"), C2 progressive enhancement
What is wrong:
- Every result button is `display: none` by default, and only a `:has()` rule shows one.
- A browser without `:has()` shows all three questions, then "Choose an answer first." for ever, with no submit control.
- Such browsers include Opera Mini in its data-saving mode, KaiOS phones, older Samsung Internet and Firefox ESR 115. They are the low-data, cheap-phone readers the no-JS path exists for (B3 flow 9).
- The hand-over says "none current". The no-JS form's whole job is to serve browsers that are not current.
How to reproduce: Load `find-my-path/` with JavaScript off in a browser without `:has()` (for example Firefox 115 ESR), or delete the generated `<style>` block. Answer all three questions: no button appears.
Suggested fix:
- Make the fallback visible by default and hide it with `@supports selector(:has(*))`: for example, a `<details>` "Or choose your path from a list" with the 49 result links grouped by answer.
- Keep the `:has()` single button as the enhancement.
- Add a nojs test that removes the `:has()` style and still reaches a result page.

### major 3: "Only what applies to me" hides "If you sell online" and "If you import anything" from most readers, and the marker overstates the guide
File: content-meta/applicability.json:40-52 (applied by src/scripts/applies.ts:84 and src/components/content/HiddenMarker.astro:36-40)
Acceptance item: Build 5 (markers hide only what does not apply); D5 "Nothing implies more certainty than the source"
What is wrong:
- In `core/what-you-need-to-sell-things`, three sections are tied to kinds of business:
  - "If you sell online" and "If you import anything": `retail-online` only.
  - "If you sell second-hand goods": retail and vehicle dealer.
- The text is about an activity, not a kind of business. "If you import anything" covers anyone who imports, and it names automotive parts. ECTA applies to every business that sells online.
- With the switch on, a food business that sells online, a beauty business that imports products, or a vehicle dealer who lists online loses these sections. The marker then says "Hidden: this part is only for these kinds of business: Retail and online."
- The guide never says this. Sections with the same kind of heading ("If you sell alcohol", "If you sell medicines…") are never hidden, so the rule is also inconsistent.
- The mapping predates WP-31, but WP-31 is the first package to show it to readers.
How to reproduce: Seed `{entity:'sole-prop', businessTypes:['food'], stage:'trading'}` and `st.onlyMine: true`, then open `core/what-you-need-to-sell-things/`. "If you sell online" and "If you import anything" are collapsed, each with that marker.
Suggested fix:
- Make these activity sections tags (never hidden), like `import` and `second-hand` on the retail tasks already are.
- Or keep the type mapping only for food and beauty, whose sections really are type-specific.
- Add a test that no "If you sell online" or "If you import" heading carries `data-types`.

### major 4: on My path, the business-type step's "Mark as done" button names all six kinds of business
File: src/components/wizard/PathSteps.astro:45-49, src/components/wizard/PathSteps.astro:103-105, src/scripts/my-path.ts:150-160
Acceptance item: Build 4 (step cards with done / not done); B5 roles and names
What is wrong:
- My path renders the `$businessTypes` card with all six type documents and hides the ones that do not apply.
- The button's `aria-label`, `data-name-done` and `data-name-undo` come from the server. They name all six: "Mark Vehicle dealer, Food business, Beauty and personal care, Retail and online shop, Services and trades, Professional and creative work as done".
- The script never updates them. A screen-reader user with one kind of business hears that the button marks six.
- A step whose documents the dedupe or `applies` trims has the same problem.
How to reproduce: `grep -o 'aria-label="Mark Vehicle[^"]*"' dist/my-path/index.html`. Or open My path with `{sole-prop, [food], trading}` and inspect step 3's button.
Suggested fix:
- In `#renderSteps`, build the name from the documents shown, using a template from the server (as `data-label-template` does for the step label).
- Assert the name in `my-path.test.ts`.

### major 5: "Mark as done" and "Fill from my profile" fail Label in Name (WCAG 2.5.3) in both languages
File: src/components/wizard/PathSteps.astro:98-108, src/components/content/CodeBlock.astro:75-83,111, src/i18n/en.json (myPath.markDoneNamed, myPath.markNotDoneNamed, prompts.fillFromProfileNamed), src/i18n/af.json (same keys)
Acceptance item: B5 (WCAG 2.1 AA); D4 accessibility lens
What is wrong: In each case below, the visible label is not contained in the accessible name.

| Visible label | Accessible name |
| --- | --- |
| "Mark as done" | "Mark Core: start here as done" |
| "Fill from my profile" | "Fill prompt 2 from my profile: …" |
| "Haal die merkie af" | "Haal die merkie van … af" |
| "Vul in uit my profiel" | "Vul opdrag 2 in uit my profiel: …" |

- That is failure F96. A voice-control user who says what they see ("click Mark as done") may not reach the button.
- The project already follows the rule elsewhere: "Copy prompt" / "Copy prompt 2: Logo brief".
- axe does not report it, because `label-content-name-mismatch` is experimental.
Suggested fix:
- Start each name with the visible text: "Mark as done: Core: start here", "Remove the tick: …", "Fill from my profile: prompt 2, …", and the Afrikaans equivalents.
- Add a unit check that every `*Named` string contains its visible label for each locale.

### minor 1: a link to a collapsed section goes nowhere
File: src/scripts/applies.ts:83-127
Acceptance item: Build 5 (nothing removed; Show brings it back)
What is wrong:
- With the switch on, the table of contents (outside the scope) still lists the hidden headings. Clicking one, or arriving with that `#hash` from search or a shared link, scrolls to an element that is `display: none`, so nothing happens.
- The reader gets no sign that the section exists and is collapsed.
Suggested fix: On load and on `hashchange`, call `showSection` when the target is inside a `.st-filtered` section. Or scroll to and focus its marker.

### minor 2: result pages always say "JavaScript is off"
File: src/pages/[...locale]/find-my-path/result/[entity]/[type]/[stage].astro:107
Acceptance item: general quality
What is wrong: `wizard.noJs` has no `no-js-only` class. A reader with JavaScript who opens a result link (from history, or one someone shared) is told JavaScript is off, and is not offered a way to save the answers.
Suggested fix: Make the line `.no-js-only`. With JavaScript, offer "Save these answers", which sets the profile and opens My path.

### minor 3: without JavaScript, the kinds-of-business question says "Choose all that fit" while only one can be chosen
File: src/components/wizard/Wizard.astro:149-157
Acceptance item: B5; Build 3 (`wizard.noJsOneType`)
What is wrong:
- The fieldset's `aria-describedby` points at `#wz-help-type`, the `.js-only` "Choose all that fit." A description is read even when the referenced element is hidden, so no-JS screen-reader users hear it over radios.
- The visible no-JS hint ("Without JavaScript you can choose one kind of business…") is not part of the description.
Suggested fix: Give the no-JS hint an id and list both, or let the script set `aria-describedby` when it turns the radios into checkboxes.

### minor 4: answers in the address silently replace a saved profile
File: src/scripts/my-path.ts:55-57
Acceptance item: general quality
What is wrong:
- When storage is blocked, the address keeps the answers so a reload still shows them. Readers copy and share that address.
- When someone with saved answers opens it, `profile.set(fromAddress)` overwrites their own answers with no notice and no way back.
Suggested fix: Write address answers only when storage is unavailable or there is no saved profile. Otherwise show them for this view and offer "Use these answers".

### minor 5: if My path's module fails to load, the page is blank for a reader with saved answers
File: src/pages/[...locale]/my-path.astro:248-251, src/scripts/theme-init.js:26
Acceptance item: B6 My path (empty state); C2 progressive enhancement
What is wrong:
- `html[data-st-profile]` hides the empty state with `visibility: hidden` until `<st-my-path>` sets `data-ready`. The dashboard is `hidden` on the server.
- If the module never runs (a dropped request on a poor connection, a script error), the page shows only its header, with no "Find my path" and no explanation.
- `theme-init.js` sets the attribute for any stored string, including a corrupt one.
Suggested fix: Hide the empty state only for a short time (for example, an animation that reveals it after 1 s). Or set the attribute only when the stored value parses as JSON with an `entity` field.

### minor 6: /checklist/ can keep a hidden, checked "Only what applies to me"
File: src/components/interactive/ChecklistSummary.astro:84-88, src/scripts/applies.ts:185-186
Acceptance item: Build 5 ("Only mine" on /checklist/)
What is wrong:
- When the answers are removed in another tab, or a reload restores the radio while there is no profile, the "mine" label is hidden while its radio stays checked.
- The filter clears, but no visible radio is selected, so the "Show" group has no visible state.
Suggested fix: When the profile goes, check "Everything" and dispatch the filter event.

### minor 7: the wizard e2e test failed once under load
File: tests/e2e/wizard.spec.ts:82-100
Acceptance item: DoD (chromium e2e green)
What is wrong:
- In the full run, the page stayed on question 2 after Back, Back, Pty Ltd, Next, Next. The failure snapshot shows step 2 with Beauty ticked.
- It passed 30 of 30 alone. The second `getByRole('button', { name: 'Next' })` may resolve while step 1's button is still visible, or a click may land before the step changes.
Suggested fix: Wait for each step's heading to be focused before the next click, as the first test does. Check whether a quick double Next can be dropped in the product too.

### minor 8: the switch's help text tells only half of what it hides
File: src/i18n/en.json:254, src/i18n/af.json (doc.onlyWhatAppliesHelp)
Acceptance item: general quality
What is wrong: "Hides the parts for other kinds of business." The switch also hides the parts for the other way of trading (Pty Ltd or sole proprietor), which on most core pages is what it hides first.
Suggested fix: "Hides the parts that are not for how you trade or your kind of business. Nothing is removed…"

### nit 1: the brief's status line still says "brief"
File: docs/work-packages/WP-31-wizard.md:3
What is wrong: "Status: brief. Starts once WP-30 (the store) is merged." The work is done and handed over.

### nit 2: `hiddenReason()` is exported but unused, and the marker works out its reason another way
File: src/lib/path-engine.ts:64-75, src/components/content/HiddenMarker.astro:37-40
What is wrong:
- The marker names the entity whenever the heading has one, even when the kinds of business are the reason.
- No heading has both conditions today, so readers do not see this yet. Use one function, or remove the unused one.

### nit 3: the pager leaves the path after its last step
File: src/scripts/path-progress.ts:147-161
What is wrong: On the last document of the path, Next falls back to the section order. A link back to My path ("You reached the end of your path") would fit better.

### nit 4: the hand-over figures
File: docs/work-packages/WP-31-wizard.md (hand-over), docs/testing.md:229
What is wrong: The hand-over says 24.1 KB and I measure 24,625 B (24.0 KB). The difference does not matter. What is missing is the with-profile figure (major 1).

## Not findings

- File ownership: every changed path fits the brief (pipeline, `content-meta/paths.json`, components, pages, scripts, tests, docs).
- CLAUDE.md rules:
  - No `href="/…"` literals and no colour literals.
  - `localStorage` only through the store, plus the documented `theme-init.js` exception.
  - Keys start with `st.`. Both dictionaries have identical keys.
  - `set:html` is used only for the generated no-JS CSS, which is built from constants.
  - Duplicate ids: none on `/my-path/`, `/find-my-path/` or `/checklist/`.
- `WIZARD_AVAILABLE` is on, and every reader of it is right. `KNOWN_FUTURE_ROUTES` is empty.
