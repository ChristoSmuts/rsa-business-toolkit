# WP-33 review pass 1 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2 October 2026
- **Commit reviewed:** `a19b3b8` ("docs(search): describe search, its tests, its budget and what is left"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff 2744d07 a19b3b8`: 41 files, +5081 / -69.

## Verdict

**Not clean: 0 blockers, 2 majors, 9 minors, 4 nits.** The two majors are both search returning the wrong thing for an ordinary query: a form code typed with a space, and Enter pressed straight after typing. Everything else is in good shape. All the gates are green, every index anchor resolves, the budgets hold with a lot of room, nothing is built with `innerHTML`, and there are no off-origin requests. The A7 cases pass.

## Gate results

I re-ran all of these myself on `a19b3b8`.

- `pnpm install --frozen-lockfile --offline`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 197 files, 0 errors, 0 warnings, 0 hints.
  - Vitest unit and dom: 35 files, **1049 passed (1049)**.
  - Content drift: "Wrote 0 changed files, removed 0, 41 files in total. Content drift: none."
  - Vitest content: **32 passed (32)**.
- `pnpm build`: exit 0, 96 pages.
  - `search:build`: "en.91b2cd9fb1.json: 945 entries, 729.5 KB raw, 163.2 KB gzip" and "af.b3a0b91aff.json: 945 entries, 740.8 KB raw, 163.8 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.7 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 16.6 KB gzip (search/index.html), budget 45.0 KB." Opening search adds 10.3 KB gzip.
- A second `pnpm search:build` produced the same file names, so the build is deterministic.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4551`, default reporters): 618 tests, **533 passed, 85 skipped, 0 failed** (6.0 min). The 85 skips are the existing mobile duplicates of the D5 page checks. All 9 `search.spec.ts` tests passed in both chromium and mobile, and the 3 new `nojs` search tests passed.
- `pnpm test:a11y` (same environment): **196 passed** (4.5 min). That is 96 routes × 2 themes, plus the 4 new "axe with the search dialog open" tests (2 routes × 2 themes, each checking the empty state and the results state). It now runs with the `best-practice` tag.
- Coverage (`vitest run --project unit --project dom --coverage`):
  - `src/lib/search-client.ts`: 99.07% statements, 97.26% branches, 100% functions, 98.92% lines. That is above the brief's 90%.
  - `src/lib/search/**`: 100 / 88.88 / 100 / 100.
  - `scripts/search/**`: 100 / 93.16 / 100 / 100.
  - The command exits 1 on "Coverage for functions (89.04%) does not meet `src/lib/content/**` threshold (100%)". The cause is `collections.ts` and `context.ts`, both at 0%. WP-33 does not touch either file, so the failure is not caused by this package. It is not part of `gate:fast` either. The orchestrator should look at it separately.
- **WebKit was not run.** It is not installed in this environment.

## My own checks

- **Anchors.** I wrote a script that reads every entry of both built indexes and looks for the `id` in the target `dist/**/index.html`. Result: 945 + 945 entries, **0 missing**. Glossary targets are `<dt tabindex="-1">` and headings have `tabindex="-1"`.
- **Ranking against A7**, with the real client on the built index:
  - `VAT264`: the glossary entry first, then the vehicle dealer's "The conditions you must meet".
  - `SAPS 601`, `saps601` and `saps 601`: all three find the SAPS 601 term, the register section and both checklist items.
  - `notio`: the notional input tax glossary entry and the matching section.
  - `PIS`: the glossary entry first.
  - Empty and whitespace queries: 0 results.
  - `(*)` and `"`: 0 results.
  - `<script>…`: harmless, because of the OR fallback (nit 1).
  - A 5000-character query takes 40 ms. 300 repeated words take 356 ms (nit 2).
- **Browser checks** (my own preview on port 4552, chromium):
  - No off-origin requests.
  - Header control 146×44, close button 44×44, every option at least 75 px tall.
  - Failed index (HTTP 500): the failed state and the contents link show. After the server recovers, a new query loads the index and shows results, so retry works.
  - Phone drawer: the drawer's Search link closes the drawer and opens the dialog. Escape returns focus to the menu button.
  - Arrival from `/search/?q=PIS` focuses `#pis`.
  - With reduced motion, the target gets a static `--st-mark-bg` and no animation. The class is removed after 2 s.
- **CSP:** `connect-src 'self'` covers the index fetch. MiniSearch needs no `eval`. The diff adds no `innerHTML`, `insertAdjacentHTML`, `set:html`, `href="/…"` literal or colour literal.
- **Budget script:** I followed every `<script src>` and its static imports by hand. The measured sizes match `dist:budget`. The lazy chunk set is `search-ui`, `search-render` (which includes MiniSearch) and `paths`. The `search` chunk loads `search-ui` with a backtick dynamic `import()`, and the script's regex handles backticks. Built pages have no inline scripts, so nothing escapes the count.
- **Afrikaans after WP-40.** I exported `src/data` from `claude/lucid-bell-t5acdn` (all 36 documents in Afrikaans, plus `af/tasks.json` with 213 tasks, `af/glossary.json` with 121 entries and `af/quick-answers.json` with 36 items) and built the Afrikaans index with this branch's code.
  - It builds cleanly: 951 entries, **none marked English**, 178.6 KB gzip.
  - `belastng` finds "Voorlopige belasting" and other "belasting" entries.
  - `BTW`, `omsetbelasting` and `registreer vir BTW` rank sensibly.
  - `VAT264` still puts `/af/business-types/vehicle-dealer/#the-conditions-you-must-meet` second.
  - The merge notes at the end follow from this.

## Findings

### major 1: a form code typed with a space finds almost nothing (`VAT 264`, `vat 264`)
File: `src/lib/search/options.ts:130-141`, `src/lib/search-client.ts:177-178`
Acceptance item: Build 1 (tokenizer keeps form codes, with a `saps601`-style alias); A7 tokenizer rule
What is wrong: The alias only joins halves. It never splits a joined code. Most of the guide writes `VAT264` as one token, so the index holds only the term `vat264`. Each query then fails differently:
- The query `VAT 264` becomes `vat`, `264` and `vat264`, combined with `AND`. Only an entry that contains all three can match, so the alias makes the query stricter instead of looser.
- `vat 264` in lower case gets no alias at all, so it needs a literal `264`.

Both return **1 result**: the sources register's "Tax and SARS" section. The `VAT264` glossary entry, the vehicle dealer's "The conditions you must meet" and both checklist items are all missing, and the `OR` fallback never runs because `AND` found one result. `VAT 264 form` gives the same single result. Writing the code with a space is the most natural way to type it. Form codes are what this guide is searched for, so this is a wrong answer to a core query.
How to reproduce: `runSearch(index, 'VAT 264', 'en')` on the built English index returns only `sources/#tax-and-sars`. In the dialog, type `VAT 264`: the status says "1 result".
Suggested fix:
- At query time, when two adjacent tokens look like `letters digits`, search `(letters AND digits) OR joined`. MiniSearch takes a query tree, `{ combineWith: 'OR', queries: [{ combineWith: 'AND', queries: [...] }, 'vat264'] }`. Apply it regardless of capitals, because queries are short and often typed in lower case.
- Add `VAT 264` and `vat 264` to the A7 unit cases next to `SAPS 601` and `saps601`.

### major 2: Enter right after typing opens a result for the previous query
File: `src/scripts/search-ui.ts:92-96`, `src/scripts/search-ui.ts:109-117`
Acceptance item: Build 3 (listbox with arrow keys, Enter); B3 flow 3 ("Enter navigates")
What is wrong: Typing only schedules the search 120 ms later, and the search itself awaits the client. Until then `#options` still holds the previous query's results, and Enter opens `this.#options[0]` from that stale list. A reader who types a query and presses Enter at once (a normal way to use a search box) goes to the wrong page.
How to reproduce: In the dialog, type `VAT264` and wait for results. Then replace it with `SAPS 601` and press Enter at once (Playwright: `fill('SAPS 601')`, then `keyboard.press('Enter')`). The browser goes to `glossary/#vat264`, the first result for the old query. The e2e test does not catch this because it waits for the options to be visible before pressing Enter.
Suggested fix: On `input`, clear the options or mark them stale straight away. On Enter while a search is pending or in flight, run the search for the current value now and open its first result, or fall back to submitting `/search/?q=`. Add a dom test that presses Enter inside the debounce window.

### minor 1: the status live regions are `display: none` or `hidden` until they get text
File: `src/components/search/SearchDialog.astro:99`, `:237-239`; `src/pages/[...locale]/search.astro:110-116`
Acceptance item: Build 3 / B5 (live region for result counts)
What is wrong:
- In the dialog, `.st-search-dialog__status:empty { display: none }` removes the `role="status"` element from the accessibility tree. My ARIA snapshot of the open, empty dialog has no status node. The first count is then text added to a region that was not in the tree. NVDA with Firefox in particular often stays silent in that case, and B5's manual QA uses NVDA and Firefox.
- On `/search/`, the whole `[data-search-region]` holding the status is `hidden` until the first query, and is un-hidden in the same task that writes the text.

How to reproduce: Open the dialog and read the accessibility tree: there is no `status`.
Suggested fix: Keep the status element rendered at all times and hide it visually only (or give it zero size) when empty. On the search page, keep the status outside the hidden region.

### minor 2: the announced count is not the number of options the reader can reach
File: `src/scripts/search-ui.ts:268`
Acceptance item: B5 (live regions for result counts)
What is wrong: The dialog shows at most three results per section (`PER_GROUP`) but announces `results.length`, for example "30 results", while maybe 10 options can be reached with the arrow keys. A screen reader user hears 30 and finds 10. The "See all" link explains the gap visually, but the announcement comes first.
Suggested fix: Announce what is shown, for example "10 of 30 results", using a new key in both dictionaries.

### minor 3: the first Escape clears the field instead of closing the dialog, and the instructions say otherwise
File: `src/components/search/SearchDialog.astro:79-97`
Acceptance item: Build 3 (Escape); B5 ("Esc everywhere")
What is wrong: The field is `type="search"`, so in Chromium the first Escape on a non-empty field clears it and the dialog stays open. I saw `open: true` with an empty value, and the old options stay until the debounce fires. The second Escape closes. The visible-to-AT instructions (`search.instructions`) say "Press Escape to close search". Clearing first is a defensible combobox behaviour, but the instructions and the brief describe the other one, and no test covers Escape with text in the field.
Suggested fix: Choose one behaviour. Either handle Escape on the input yourself and close the dialog, or keep the clear-first behaviour, say so in both dictionaries, and add a test for each press.

### minor 4: arrival focus uses `sessionStorage` directly
File: `src/scripts/search.ts:103-140`
Acceptance item: CLAUDE.md storage rule (spirit); C2 ("all state through the store")
What is wrong: CLAUDE.md names only `localStorage`, so this is not a literal breach. The key starts with `st.`, every access is guarded, and the value lasts one page load. But it is a second storage path beside `src/lib/store.ts` / `src/lib/storage/`, and `clearAll()` will not see it. The backlog row records it.
Suggested fix: At the WP-30 merge, either route it through the storage layer or remove the need for it. B5 already asks for "anchor targets `tabindex="-1"` + 2s highlight" for every anchor arrival, so focusing and highlighting the fragment target on any load with a hash would need no storage at all. Either is fine. Keep the backlog row until one is done.

### minor 5: "Words used" terms can open an unrelated section (substring match)
File: `scripts/search/entries.ts:243-246`
Acceptance item: Correctness: result hrefs open the right place
What is wrong: `foldTerm(section.text).includes(words)` matches inside other words. In the English data, 15 terms are placed by substring alone. Most are harmless plurals ("lockups", "dividends"), but five go to the wrong place:

| Term | Page | Opens | Matched inside |
| --- | --- | --- | --- |
| IP | professional-creative | `#what-you-need` | "munic**ip**al" |
| NCO | vehicle-dealer | `#turnover-tax-is-almost-certainly-wrong-for-a-dealer` | "i**nco**me" |
| ECTA | what-you-need-to-sell-things | `#if-you-sell-beauty-or-body-treatments` | "disinf**ecta**nts" |
| POP | working-from-home-and-safety | `#part-2-…` | "**pop**ia" |
| UPS | free-tools | `#other-free-tools-worth-having` | "back**ups**" |

Suggested fix: Match on word boundaries (Unicode-aware, allowing a plural `s`), and add a unit case.

### minor 6: hyphenated words split into a one-letter token
File: `src/lib/search/options.ts:118`
Acceptance item: General quality (tokenizer)
What is wrong: `e-filing` becomes `e` and `filing`. With `AND` it finds only one unrelated vehicle dealer section, and the `eFiling` glossary entry is missed. `efiling` works. Readers commonly write SARS's "eFiling" as "e-filing".
Suggested fix: Also index and query the joined form of a hyphenated word (`efiling`), in the same way as the form-code alias.

### minor 7: B3's filter chips are not built, and nothing records the deviation
File: `src/components/search/SearchDialog.astro:122-140`
Acceptance item: B3 flow 3 ("empty state shows Common questions … and filter chips")
What is wrong: The client supports `section`, `kinds`, `entity` and `businessTypes` filters, but the dialog offers none. The brief's step 3 does not repeat the chips and puts only the business-type filter out of scope. So the brief and B3 differ, and neither the ADR notes nor the backlog say the chips were left out.
Suggested fix: Either add section chips, or record in the backlog that they are deferred (and to which package).

### minor 8: the shortcut setting is read once, so the `/` hint and `aria-keyshortcuts` go stale
File: `src/scripts/search.ts:31-36`, `:222-231`
Acceptance item: Build 3 (shortcut setting from WP-30's store); WP-30 integration
What is wrong: `connectedCallback` sets `aria-keyshortcuts` and the hint's `hidden` once. The keydown handler reads `searchSettings()` on every press, so the key itself is fine. But on `/about/`, which has the header and is where WP-30 puts the setting, switching shortcuts off leaves the `/` hint and `aria-keyshortcuts="/ Control+K"` in place until the next page load.
Suggested fix: At the WP-30 merge, subscribe to `shortcuts` and update both attributes when it changes. See also merge note 1.

### minor 9: the dialog repeats the failure message
File: `src/components/search/SearchDialog.astro:114-115`, `src/scripts/search-ui.ts:218-223`
Acceptance item: General quality (states)
What is wrong: In the failed state the status line and the failed block both show "Search could not load." The visible text reads "Search could not load. Search could not load. Use the contents page instead."
Suggested fix: Keep the sentence in the live region only. The failed block then needs only the contents link, or the reverse.

### nit 1: the OR fallback turns junk queries into 30 arbitrary results
File: `src/lib/search-client.ts:177-178`
What is wrong: `<script>alert(1)</script>` finds nothing with `AND`, then `OR` matches the prefix `1` against every "Prompt 1", "Option 1" and similar, and returns 30 results. It is harmless, but "nothing found" would be more honest when the only words that match are numbers or single letters.

### nit 2: no length cap on the query
File: `src/components/search/SearchDialog.astro:79-94`, `src/pages/[...locale]/search.astro`
What is wrong: A pasted 4 KB query (300 words) takes about 356 ms per keystroke search on a desktop CPU, and will be slower on a low-end phone. A `maxlength` (for example 200) on both inputs, or a token cap in `runSearch`, would bound it.

### nit 3: option accessible names include the whole excerpt
File: `src/scripts/search-render.ts:79-110`
What is wrong: Each option's name is title, path, kind and up to 160 characters of excerpt. In the ARIA snapshot one name is "Tax and SARS Sources and verification register · Page section [Official] SARS — Turnover Tax Supports: micro business qualification, the R2.3 million threshold …". Arrowing through the list reads all of that every time. Consider putting the excerpt (and perhaps the path) in an `aria-describedby` description, so the name stays short.

### nit 4: `dist:budget` calls every dynamic import "imported when search opens"
File: `scripts/dist/js-budget.ts:90-100`
What is wrong: The lazy total adds up every dynamic `import()` in `_astro/`, whatever it belongs to. Today only search uses one, so the number is right. Once WP-30 or WP-31 adds a lazy chunk, the line will mislabel it. Either key the lazy set to the search chunk, or label it "loaded on demand". Its `main()` is also untested (34% lines). That is acceptable for a CLI, but worth a backlog line.

## Author's stated deviations from A7

- **Checklist weight 1 instead of 1.5:** accepted. I reproduced the reasoning. With BM25 `b` 0.3 and weight 1, `VAT264` gives glossary, section, task, task. The section A7 requires in the top 3 is second. The ADR notes record the change.
- **BM25 `b` 0.3:** accepted, for the same reason. It holds on the real Afrikaans data too (see "My own checks").
- **Index file names in the gitignored `src/generated/search-index.json` instead of `manifest.json`:** accepted.
  - `content:drift` checks `manifest.json`, so a later build step cannot write there.
  - A build without `search:build` fails with a clear message (`src/lib/search/files.ts:199-212`).
  - `gate:fast` passed in my fresh worktree, which had no `src/generated/`, so typecheck and the tests do not depend on it.
  - The now-unused `ManifestSchema.searchIndex` is in the backlog.
- **Placeholder `searchSettings()` awaiting WP-30:** accepted as a placeholder. There is a `TODO(WP-30 integration)` with a backlog row, and it is the only place search reads settings. See minor 8 and merge note 1.

## Merge notes (not findings against this branch)

These come from the integration branch (`claude/lucid-bell-t5acdn`, WP-40 merged) and the WP-30 branch under review (`worktree-agent-a097a30a395f91ce3`).

1. **WP-30 settings.**
   - Point `searchSettings()` at `shortcutsEnabled()` and `lowData.get()` from `src/lib/store.ts`, and keep `prefers-reduced-data` as a second reason for low data.
   - WP-30 also ships `isTypingTarget()` in `src/lib/shortcuts.ts`. Keep one copy; `src/scripts/search.ts:38-46` duplicates it.
   - WP-30 adds a `?` shortcut on the same `document` keydown. Make sure neither fires while the other's dialog is open.
   - Subscribe for minor 8.
2. **WP-40 breaks two of this package's tests on merge.**
   - `tests/unit/search/index.test.ts:130-135` expects every Afrikaans entry to be English. With the real Afrikaans data, none are (0 of 951).
   - `tests/e2e/search.spec.ts:107-116` expects the first Afrikaans `VAT264` result to carry `lang="en-ZA"` and "Engels". It is now the Afrikaans glossary entry.
   - Turn both into tests of the opposite: no English marks on translated entries, and a fixture that still checks the fallback mark.
3. **Afrikaans data is complete, so the load concern goes away.** WP-40's `af/tasks.json` (213), `af/glossary.json` (121) and `af/quick-answers.json` (36) are whole files. The author's backlog row about whole-file fallback in `scripts/search/load.ts` can be closed.
4. **New tests to add after merge.** A7's `belastng` → `belasting` case can now run on real data, not only the fixture. The Afrikaans index grows to about 178.6 KB gzip, still under budget. Update the numbers in `docs/testing.md`.
5. **Re-run the anchor check on the merged `dist/`.** The shared English heading ids should hold, but this review checked them only on fallback pages.
6. **Budget after merge.** WP-30 adds the store and the interactive pieces to every document page. `dist:budget` will show the combined number; the 25 KB headroom today is about 17 KB.
