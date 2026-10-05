# WP-33 review pass 2 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do pass 1.
- **Date:** 5 October 2026
- **Commit reviewed:** `c0567cf` ("docs(search): record the review pass 1 fixes, the deviations and new numbers"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b c0567cf`, the whole package and not only the fixes: 42 files, +5762 / -69. `d2f685b` is the main working branch with the full Afrikaans translation, merged into WP-33 in `794585d`.

## Verdict

**Not clean: 0 blockers, 1 major, 4 minors, 3 nits.**

The pass 1 fixes work:

- `VAT 264` and `vat 264` now find what `VAT264` finds.
- Enter inside the debounce opens a result for the current text.
- The live regions stay in the accessibility tree.
- One Escape closes the dialog.
- "Words used" terms match whole words only.

All the gates are green. Every anchor in both built indexes resolves, and the Afrikaans index is all Afrikaans.

The major is a new race that comes from the fix for pass 1 major 2. The reader presses Enter before the index has loaded, and then presses Escape. The page still goes to a result a few seconds later.

The two-pass count starts again from zero.

## Gate results

I re-ran all of these myself on `c0567cf`.

- `pnpm install --frozen-lockfile --offline`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 197 files, 0 errors.
  - Vitest unit and dom: 35 files, **1071 passed (1071)**.
  - Content drift: "Content drift: none."
  - Vitest content: **34 passed (34)**.
- `pnpm build`: exit 0, 96 pages.
  - `search:build`: "en.572ee5bd2f.json: 945 entries, 738.4 KB raw, 165.3 KB gzip" and "af.0151dae661.json: 951 entries, 801.1 KB raw, 181.9 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.7 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 16.9 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 10.8 KB gzip".
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4581`, default reporters): **539 passed, 85 skipped, 0 failed** (7.0 min).
  - All 12 `search.spec.ts` tests passed in chromium and in mobile.
  - The 3 `nojs` search tests passed.
  - The 85 skips are the existing mobile duplicates of the D5 page checks.
- `pnpm test:a11y` (same environment): **196 passed** (7.5 min). This includes the "search dialog open" runs in both states and both themes.
- Coverage (`vitest run --project unit --project dom --coverage`):
  - `src/lib/search-client.ts`: 99.11% statements, 97.5% branches, 100% functions, 98.97% lines. That is above the brief's 90%.
  - `src/lib/search/**`: 100 / 90.9 / 100 / 100.
  - `scripts/search/**`: 100 / 93.22 / 100 / 100.
  - The command exits 1 on "Coverage for functions (88%) does not meet `src/lib/content/**` threshold (100%)". This package does not touch `src/lib/content/**`. Pass 1 saw the same thing, so it is not a WP-33 finding.
- **WebKit was not run.** It is not installed in this environment.

## My own checks

- **Anchors in `dist/`.** I wrote a script that reads every stored entry of both built index files and looks for its `id` in the target `dist/**/index.html`.
  - English: 945 entries, **0 missing**.
  - Afrikaans: 951 entries, **0 missing**, **0 marked as another language**.
  - Every target is a heading or `<dt>` with `tabindex`, or a `<details>`.
- **Ranking against A7**, with the real client on an index built from `src/data` exactly as the build does:
  - `VAT264`: the glossary entry first, then the vehicle dealer's "The conditions you must meet".
  - `VAT 264` and `vat 264`: the glossary entry, then the sources register's "Tax and SARS", then "The conditions you must meet". It is third, so the top-3 requirement holds, but only just (nit 1).
  - `SAPS 601`, `saps601` and `saps 601`: all find `#how-to-register` first.
  - `notion`: the notional input tax glossary entry first, and the section second.
  - `PIS`: the glossary entry first.
  - `e-filing`, `eFiling` and `efiling`: the `eFiling` glossary entry first.
  - `Tax 2026`: 18 results, every one containing `2026`, so it does not over-match.
  - `Section 12`: 6 results, all with both words.
  - Ordinary words followed by a small number do over-match (minor 1).
- **Afrikaans, in the browser on `/af/business-types/vehicle-dealer/`.** For each query below, every option `href` was under `/business-toolkit/af/`. None had an English tag or a `lang` attribute, and the `<mark>`s were on Afrikaans words.

  | Query | Status line | First results |
  | --- | --- | --- |
  | `belasting` | "6 van 30 resultate gewys" | "Voorlopige belasting", then "Hoe betaal ek wettig minder belasting?" |
  | `BTW-registrasie` | "15 van 30 resultate gewys" | The tax invoice template, then "Sjabloon 3: faktuur as jy WEL vir BTW geregistreer is". "BTW: waarskynlik nog nie" is second in the full list. |
  | `omsetbelasting` | "13 van 30 resultate gewys" | The glossary entry first, then "Die omsetbelasting-strik" and "Roete 3: omsetbelasting" |
  | `faktuur` | "14 van 30 resultate gewys" | "Faktuur (invoice)" first |
  | `kontrolelys` | "12 van 25 resultate gewys" | The "Kontrolelys" and "Jou kontrolelys" sections |

  `belastng` finds "Voorlopige belasting" first. `voorlopige belasting`, `registreer vir BTW` and `Moet ek BTW registreer?` all rank sensibly. The common question "Moet ek vir BTW registreer?" comes first for the last two.
- **ARIA tree** of the open Afrikaans dialog with `VAT264` results:
  - The dialog is named "Soek".
  - The combobox is named "Soek in die gids", with `[expanded]`.
  - The `status` node is present.
  - The listbox is named "Soekresultate", and its groups are named "Soekresultate in {section}".
  - Each option's name is its title alone (for example `option "VAT264"`), and the rest is the description.
  - The status line was in the tree before any search (also tested in e2e).
- **Races, in chromium against my own `astro preview`, with the index request delayed on purpose:**
  1. Enter, then Escape while the index loads: the dialog closes, and about 2 s later the page goes to `glossary/#pis` anyway. **This is the major.**
  2. Enter while the index loads, then waiting: the result for the current text opens. Correct.
  3. Two Enters straight after typing `VAT 264`: one navigation, to `glossary/#vat264`. Correct.
  4. Typing more while the index loads, then Enter: opens the result for the final text (`VAT 264` → `#vat264`). Correct.
  5. Enter at once on a query with no results: nothing happens, and the status says nothing was found. A second Enter goes to `/search/?q=` (nit 2).
  6. The same race as 1, with a result on the same page: after Escape, the hash still changes and the heading still takes focus.
- **Security and rules.** The diff adds no `innerHTML`, `insertAdjacentHTML`, `set:html`, `href="/…"` literal, colour literal or `localStorage`. During my browser probes no request went to another origin. The only storage is the `sessionStorage` arrival key behind `arrivalStore` (backlog row).
- **Deferrals.**
  - **Filter chips to WP-31: reasonable.** The brief's step 3 does not list them. The only filter with a clear use needs the profile. The client already supports the filters. `docs/design-system.md` and the backlog both record the deviation.
  - **Settings rewire, `isTypingTarget()` and the `aria-keyshortcuts` refresh at the WP-30 merge: reasonable.** The brief allows exactly this ("read it through one small function … and note it for integration"). The function is the only place search reads a setting, and it has a `TODO` and a backlog row.
  - **`arrivalStore`: reasonable.** It is session-scoped, carries no reader data, is guarded and is recorded.
  - None of the deferrals is something the brief requires now.

## Findings

### major 1: Enter before the index has loaded still opens a result after the reader closes the dialog
File: `src/scripts/search-ui.ts:107-115`, `src/scripts/search-ui.ts:128-133`, `src/scripts/search-ui.ts:163-165`, `src/scripts/search.ts:209-213`
Acceptance item: Build 3 (Enter and Escape on the listbox); B5 ("Esc everywhere"); correctness
What is wrong: `enterCurrent()` waits for `this.search(query)`. The first time, that means waiting for the whole index download (165 KB gzip in English, 182 KB in Afrikaans). Afterwards it calls `activate(first)` and only checks that the text did not change. It never checks that the dialog is still open. If the reader presses Escape during the wait (or the close button, or the backdrop), `#choose` still runs:
- To another page: `openResult()` navigates.
- On the same page: the hash changes, and focus moves to the heading.

`#choose` also sets `#leaving = true` and calls `close()` on a dialog that is already closed. That fires no `close` event, so `#leaving` stays `true`. The next ordinary close then skips the focus return (in Chromium the native dialog focus restore hides this).

The reader asked to cancel, and the page moves anyway, seconds later. That is most likely to happen on the first search of a visit on a slow phone connection, because that is when the index is still loading. The pass 1 major 2 fix introduced this.
How to reproduce: In Playwright, delay the `search/en.<hash>.json` route by 2.5 s. Open `business-types/vehicle-dealer/`, press `/`, fill `PIS`, press Enter, wait 300 ms, then press Escape. The dialog closes, and about 2 s later the URL is `/business-toolkit/glossary/#pis`. With a same-page result (`notional input tax`), the hash becomes `#notional-input-tax` and the heading takes focus after the dialog has closed.
Suggested fix:
- In `enterCurrent()`, after the `await`, do nothing unless the host's dialog is still open. Simpler still, have the controller listen for the dialog's `close` event and bump `#sequence`, so pending work is cancelled and the existing sequence check drops it.
- In `#choose`, call `close()` only when the dialog is open, or reset `#leaving` when it is not.
- Add a dom test: Enter while `client.search` is pending, then close the dialog, then resolve the search. Expect no `openResult`.

### minor 1: the joined alternative for "word + number" fuzzy-matches the word alone, so "page 2", "step 1" and "part 2" over-match
File: `src/lib/search/options.ts:179-201`, `src/lib/search-client.ts:167-182`
Acceptance item: General quality (the new query tree); A7 (fuzzy only where it helps)
What is wrong: `queryParts` makes a pair of any 2–6 letter word followed by a number, in any case. The client then searches the joined form (`page2`, `step1`) with the same fuzzy rule as any other term. At 0.2 × length, a joined term of five or more characters gets edit distance 1, so `page2` matches `page`, `pages` and `pager`, and `route3` matches `route`. The pair is "(page AND 2) OR page2~1", so it becomes "every entry that says page".

Measured on the real English index (Afrikaans behaves the same):

| Query | Results | Results without the number | First such result at rank |
| --- | --- | --- | --- |
| `page 2` | 22 | 19 | 4 |
| `route 3` | 19 | 17 | 3 ("Compilation") |
| `step 1` | 29 | 22 | 8 |
| `part 2` | 99 | 83 | 17 |
| `prompt 7` | 102 | 89 | 14 |
| `stap 1` | 25 | 18 | 8 |
| `deel 2` | 88 | 75 | 14 |

Before the fix, `AND` kept these to the entries with both words. The dialog count ("6 of 99 results shown") and the search page list grow with entries that do not mention the number the reader typed. This is the "every Prompt 1" noise that pass 1's nit 1 complained about, now coming in through the alias. Real codes are not affected: `VAT 264`, `SAPS 601` and `Tax 2026` have no results that lack the number.
How to reproduce: `runSearch(index, 'route 3', 'en', { limit: 1000 })` on the index built from `src/data`, then count the results whose `terms` contain no `3`.
Suggested fix: Search the joined alternative exactly. MiniSearch takes options per sub-query: `{ queries: [part.joined], fuzzy: false }`, and prefix can stay. A typo in a code (`vat246`) is better caught by the pair branch's own fuzzy words. Add a unit case: `page 2` returns only entries that contain both.

### minor 2: when the results code cannot load, the dialog shows "Use the contents page instead." with no reason and announces nothing
File: `src/scripts/search.ts:287-298`; `src/components/search/SearchDialog.astro:115-121`
Acceptance item: Build 3 ("Loading, no-results and failed states, each with a link to the contents page"); B5 (live region)
What is wrong: The pass 1 minor 9 fix moved the failure sentence into the status line only, and the failed block now holds just the link. The status line is written by the controller. When the `search-ui` chunk itself fails to import (offline, or a stale page after a deploy), the fallback in `open()` un-hides the failed block but never writes the status. The reader then sees a lone "Use the contents page instead." without "Search could not load.", and a screen reader hears nothing. The dom test for this path (`tests/dom/search.test.ts:309-320`) checks only `hidden`.
How to reproduce: Block `/_astro/search-ui*.js` in the browser, open the dialog, and read the status (empty) and the visible text.
Suggested fix: In that fallback, also set the `[role="status"]` text to the failed string. It can be rendered into the markup, for example as a `data-` attribute on the status, because `search.ts` has no translator. Extend the dom test to assert the status text.

### minor 3: no test covers Enter while the index is still loading, or cancelling it
File: `tests/dom/search.test.ts:412-421`, `tests/e2e/search.spec.ts:121-131`
Acceptance item: Tests (dom: listbox keyboard handling)
What is wrong: The dom test for pass 1 major 2 presses Enter inside the debounce with the index already loaded. The e2e test waits for a first query's options before typing `VAT 264`, so the index is loaded there too. No test runs `enterCurrent()` across a pending load, which is where the major lies. The e2e assertion also accepts any of three hashes (`#vat264`, `#the-conditions-you-must-meet` or `#vehicle-dealer`), so it would pass on several wrong first results.
Suggested fix: Add a dom test with a client whose `search` resolves on demand: Enter, then close, then resolve, and expect no `openResult`. Add a second one: Enter, then resolve, and expect the first result. In e2e, assert the exact first result (`#vat264`).

### minor 4: the spaced-code A7 test checks "anywhere in 30", not the top 3
File: `tests/unit/search/index.test.ts:62-69`
Acceptance item: Tests (A7 cases: `VAT264` puts the vehicle-dealer conditions section in the top 3)
What is wrong: For `VAT 264` and `vat 264` the conditions section is now exactly third. The sources register moved up to second (score 71.9 against 8.1), because its "Tax and SARS" text matches both branches of the pair. The test asserts only `toContain` over the default 30 results, so a small ranking change could push the section out of A7's top 3 for the spaced form without any test failing.
Suggested fix: Use `top(en.index, query)` (limit 3) for the spaced forms, as the joined `VAT264` case already does.

### nit 1: the spaced code ranks the sources register above the section that explains it
File: `src/lib/search-client.ts:167-182`
What is wrong: Because MiniSearch adds the scores of both branches of the `OR`, an entry that holds both `vat` and `264` as well as `vat264` gets roughly nine times the score of one that holds only `VAT264`. Today this only reorders positions 2 and 3. If minor 1 is fixed by making the joined form exact, consider also giving the pair a single score (for example with a `boost` on the joined branch only).

### nit 2: Enter on a fast-typed query with no results does nothing the first time
File: `src/scripts/search-ui.ts:128-133`
What is wrong: Enter inside the debounce always calls `preventDefault()` and then searches. When that search finds nothing (or fails), no option opens and the form does not submit either. A second Enter then goes to `/search/?q=`. `docs/design-system.md` says that without an option the form submits to the search page. The status line does say "Nothing found", so the reader is not left in silence.
Suggested fix: When `enterCurrent()` ends with no options, submit the form (`input.form.requestSubmit()`), so one Enter behaves the same however fast it is pressed.

### nit 3: a stop word in front of a number swallows the number
File: `src/lib/search/options.ts:186-195`
What is wrong: `on 28 February` becomes `on28` and `february`, because the stop word `on` pairs with `28`. `AND` then finds nothing. The `OR` fallback keeps `february` and `on28`, so the date the reader typed plays no part. This is deliberate for codes like `IT 12` (where `it` is a stop word), but `IT12` does not occur in the guide today, and dates such as "on 1 March", "op 28 Februarie" and "by 31 August" do.
Suggested fix: When the first word is a stop word, form the pair only if the original letters are upper case (`IT`), otherwise keep the number as its own part.

## Pass 1 findings: status

| Pass 1 | Status at `c0567cf` |
| --- | --- |
| major 1, spaced codes | Fixed. `VAT 264`, `vat 264` and `VAT 264 form` find the glossary entry, the conditions section and both checklist items. See also minor 1 and minor 4 above. |
| major 2, stale Enter | Fixed for the debounce. The new race with closing is major 1 above. |
| minor 1, live regions | Fixed. Both status lines are only visually hidden when empty, and the search page's region is never hidden. |
| minor 2, count | Fixed: "N of M results shown" / "{shown} van {count} resultate gewys". |
| minor 3, Escape | Fixed: one Escape closes the dialog, with a dom test and an e2e test. |
| minor 4, `sessionStorage` | Wrapped in `arrivalStore`. Backlog row kept until WP-30. |
| minor 5, substring terms | Fixed: `usesWords` matches on word boundaries, with a unit test. |
| minor 6, hyphenated words | Fixed at index and query time. |
| minor 7, filter chips | Deferred to WP-31, recorded in the backlog and the design system. Accepted. |
| minor 8, stale shortcut hint | `applySettings()` is in place. The subscription is deferred to the WP-30 merge. Accepted. |
| minor 9, repeated failure sentence | Fixed for a failed index. The failed chunk import path now shows no sentence at all (minor 2 above). |
| nits 1–4 | Done or recorded in the backlog (the `OR` fallback skips weak words, 12-word cap and `maxlength="200"`, short option names, "loaded on demand" label). |
