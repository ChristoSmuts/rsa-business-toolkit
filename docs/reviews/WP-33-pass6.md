# WP-33 review pass 6 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 5.
- **Date:** 5 October 2026
- **Commit reviewed:** `46a291a` ("docs(search): update the query-kind table and budget numbers for review pass 5"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b 46a291a`, the whole package and not only the fixes: 46 files, +7753 / -69. The pass 5 fixes are `bddff92` and `46a291a`.

## Verdict

**Not clean: 0 blockers, 2 majors, 3 minors, 3 nits.**

The pass 5 findings are fixed as the table now describes them, and I checked each on the real indexes:

- `VAT 15%`, `BTW 15%`, `brand 5` and `under 100` now find at least what their two words find (11, 11, 47 and 3 results). `VAT 264` still ranks exactly as `VAT264`.
- While typed, `SAPS 60`, `VAT 26` and `EMP 20` reach `SAPS601`, `VAT264` and `EMP201` in the live list, in both languages.
- `R120 000`, `R 120 000`, `R120000` and `R120,000` give the same 4 results. `R2,3 miljoen` gives the same 13 results as `R2.3 miljoen`. `R2 300 000` and `R1,000,000` reach the "R2.3 million" and "R1 million" sections. `2026/27` gives the same 8 results as `2026/2027` in both languages.
- `pay-as-you-earn` puts the PAYE glossary entry first, and `in-house` finds 14 results.
- The search page and Enter search a finished query, so `R1` there is R1.
- The close test now fails when the close handler's guard is removed (pass 5, nit 1).

Most realistic queries I took from the guide work well in both languages. Examples are `turnover tax`, `provisional tax`, `home office deduction`, `POPIA information officer`, `moet ek vir BTW registreer`, `voorlopige belasting`, `tuiskantoor aftrekking` and `belastingdrempel 2026/27`. The normalisation is the same at index and query time, because both go through `rawTokens` and `foldTerm`. It changes only terms, never the stored text that is shown.

The two majors are about what the reader gets, not about the table's rows:

1. Enter after a code or an amount that is only partly typed throws away the list on screen. `SAPS 60` then Enter opens the vehicle-sale section, which is pass 5's own example. `VAT26` then Enter goes to a "nothing found" page while the list shows `VAT264` first.
2. "Every word must match" falls back to "any word" only when it finds nothing. So a form code plus the word a reader uses for its due date finds one passing mention, and nothing that answers. `EMP201 deadline`, `ITR14 deadline`, `EMP201 sperdatum` and `ITR14 sperdatum` each give only the corrections log.

The two-pass count stays at zero.

## Gate results

I re-ran all of these myself on `46a291a`. The logs are in my scratchpad, not in the repository. The first Playwright run was cut off when the work was paused. I re-ran the build, Playwright and a11y in full afterwards, and only those later runs are reported here.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 9s using pnpm v11.22.0").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "Result (197 files): 0 errors, 0 warnings, 0 hints".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1183 passed (1183)".
  - Vitest content: "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.8 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 17.8 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 11.7 KB gzip".
  - `dist:budget`: "index af.faed23efc0.json: 800.9 KB raw, 181.9 KB gzip" and "index en.873ecd57d1.json: 738.0 KB raw, 165.2 KB gzip". These match `docs/testing.md` and `docs/design-system.md`.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4691`, default reporters): **543 passed, 85 skipped, 0 failed** (8.3 min, exit 0). The failure list is empty.
- `pnpm test:a11y` (same environment): **196 passed** (9.4 min, exit 0).
- Coverage (`vitest run --project unit --project dom --coverage`):
  - `src/lib/search-client.ts`: 99.28% statements, 98.05% branches, 100% functions, 99.15% lines. That is above the brief's 90%.
  - `src/lib/search/options.ts`: 100 / 94.66 / 100 / 100.
  - The command exits 1 on the `src/lib/content/**` function threshold (88% against 100%). That is outside this package and passes 1 to 5 saw the same, so it is not a WP-33 finding.
- **WebKit was not run.** It is not installed in this environment.
- **File ownership and rules.** The added lines under `src/` have no `href="/` literals, no `localStorage` and no `innerHTML`. Literal colours appear only as forced-colours system keywords (`CanvasText`), which the rest of the site also uses. All new UI strings (`search.resultsShown`, `search.seeAll`) are in both dictionaries. Outside `docs/`, `scripts/`, `src/` and `tests/`, the diff touches only `.gitignore`, `package.json` and `vitest.config.ts`.

## My own checks

- **Real queries.** I built both indexes in memory the way `tests/unit/search/index.test.ts` does. I then ran about 200 queries through `runSearchCounted`, as typed (`typing: true`) and as finished (`typing: false`). The terms came from the guide's own text: codes, amounts, tax years, dates, Act names, deadlines, fees, Afrikaans compounds, typos, partial words, hyphenated words and questions. Every finding below gives the queries and their result counts.
- **Normalisation in the indexed text.** I scanned every entry's text for the patterns the new rules rewrite: amounts with spaced groups, `R` before a number, `YYYY/NN`, `R… million` and digit-hyphen-digit. The data holds only `R 0.00` (template placeholders, left alone because `0.00` is not whole digits), 12 kinds of `R… million` / `R… miljoen` (aliased as intended), `57-1` and `2026-09`. Registration numbers such as `2026/123456/07` are not touched. URLs are not indexed, so `…/2026/03/…` does not become `2003` today (nit 2).
- **Highlighting.** `highlight()` folds each shown word with the same `foldTerm`. So `R2,3`, `R120,000` and `2026/2027` are marked when they match, and the shown text is never changed. Matches through an alias that is not in the text, such as the "in millions" alias, are not marked (minor 3).
- **Mutations.** For each change below, I edited my worktree, ran `tests/unit/search` and `tests/dom`, and then restored the file. Nothing was committed, and `git status` is clean.

  | Change | Result |
  | --- | --- |
  | A spaced pair keeps only its joined reading (`return first`) | killed (20 tests, including the `VAT 15%`, `BTW 15%` and every-code rows) |
  | The joined form of a spaced pair is never prefix-matched while typed | killed (6 tests) |
  | Spaced groups of an amount are not joined | killed (7 tests) |
  | No short tax year (`2026/27`) | killed (4 tests) |
  | No decimal comma (`R2,3`) | killed (3 tests) |
  | No "in millions" alias | killed (3 tests) |
  | Hyphen chains with a stop word keep only the joined form | killed (3 tests) |
  | Enter never takes the "finished" path (`typed = false`) | killed (1 test) |
  | `enterCurrent` searches as typed | killed (1 test) |
  | The search page reads `?q=` as typed | killed (1 test) |
  | The 404 suggestions read the address as typed | **survives** (nit 3) |
  | Drop `this.#sequence++` from `#onDialogClose` | killed (1 test) |

- **Keyboard.** I traced these sequences against the code, and the dom tests cover each guard:
  - Enter within the debounce.
  - Enter twice while the index is loading.
  - Enter and then typing before the answer.
  - Escape, the close button and the backdrop while an Enter waits.
  - Opening the dialog again with or without text.
  - A failed index load after Enter. The failed state shows and nothing submits.
  - The results code failing to load.
  - Escape during IME composition.
  - `/` typed inside the field.
  - A trailing space ("`R1 `" is finished).

  None of them opens a result for a closed dialog or for older text. The one sequence that navigates wrongly is Enter after a partly typed code or amount (major 1).

## Findings

### major: Enter after a partly typed code or amount ignores the list on screen and opens an unrelated page or "nothing found"

File: `src/scripts/search-ui.ts:163-166` (Enter takes the "finished" path whenever the shown list was found while typing), `src/scripts/search-ui.ts:120-137` (`enterCurrent` searches again with `typing: false` and opens that first result, or submits to `/search/?q=`), `docs/design-system.md` ("Enter opens the active option or the first one")
Acceptance item: brief step 3 ("listbox with arrow keys, Enter and Escape"); the design system's own pattern ("Enter opens the active option or the first one"); pass 5, major 2 ("A reader who types `SAPS 60` and presses Enter … opens the vehicle-sale section").

What is wrong: in the live dialog, the last term of almost every query is "being typed", because the field ends inside a word. The fix for "`R1` is never R146" makes Enter search again with the last term finished whenever no option is active. For a word this changes nothing, because words are always prefix-matched. For a code or an amount that is only partly typed, the finished search finds something else or nothing:

| Typed, then Enter (no arrow key) | List on screen (first option) | What Enter does |
| --- | --- | --- |
| `SAPS 60` (en) | "SAPS 601" (how to register), 9 results | opens "When you sell a vehicle out" (the only finished result: `saps` and `60`) |
| `VAT26` (en) | "VAT264" glossary entry, 8 results | finished search finds 0, so it goes to `/search/?q=VAT26`, which says nothing was found |
| `EMP20` (en) | "EMP201" glossary entry, 11 results | 0, so "nothing found" page |
| `SAPS60` (af) | "SAPS 601", 8 results | 0, so "nothing found" page |
| `R120` (en) | "How notional input tax works" (R120,000), 4 results | 0, so "nothing found" page |

The first row is the exact case pass 5 called a major. The live list is now right, but Enter still opens the vehicle-sale section. In the other rows the reader sees the answer at the top of the list, presses Enter, and is told the guide has nothing.

Who hits it and how often: a reader who types the start of a form code (or an amount), sees the right first option and presses Enter to take it. That is the usual way to accept an autocomplete suggestion. It is not the most common path, because most readers type the whole code, but I would expect it regularly from readers who know the form only roughly ("VAT 26-something"). The outcome is plainly wrong, not a weaker ranking.

How to reproduce: in `tests/unit/search/index.test.ts` terms, `runSearch(en.index, 'SAPS 60', 'en', { typing: true })[0]` is "SAPS 601" and `{ typing: false }` gives only "When you sell a vehicle out". In the dialog, type `SAPS 60`, wait for the list, and press Enter.

Suggested fix: decide in the table which reading Enter takes when the two differ. For example, Enter opens the first option on screen when the finished search finds nothing, or when the finished query's last term is a code or amount that the shown options reached by prefix. Keep "`R1` is R1" if the table still wants it, but say which wins.

Acceptance: dom tests (with the real client and index or a faithful stub). Enter after `SAPS 60`, `VAT26` and `EMP20`, with no option active, opens the code's own entry (the option shown first), never an unrelated section and never the "nothing found" page. The `R1` test keeps whatever behaviour the table states. Add one row per language.

### major: a form code with "deadline" or "sperdatum" finds one passing mention and loses the code's own entries

File: `src/lib/search-client.ts:288-294` (the any-word pass runs only when the every-word pass finds nothing), `tests/unit/search/index.test.ts:202-203` and `:365-369` (the rows `ITR14 deadline`, `ITR14 sperdatum` and `ITR 14 deadline` accept the single result), `docs/design-system.md` (the "Mixed" row gives `ITR 14 deadline` as a query that works)
Acceptance item: build plan A7 (search that finds what the reader asks for); the task for this pass ("judge the query table as a whole for this guide's readers").

What is wrong: every word must match first, and the any-word pass runs only when that finds nothing. The guide gives due dates in words such as "by the 7th of the following month" and "within 12 months of financial year end". It writes "deadline" or "sperdatum" mostly in the corrections log and the calendar. So a code plus the word the reader uses for "when is it due" matches one page that names both in passing. That one page is all the reader sees. A query that matches nothing at all gets the much better any-word list.

| Query | Results | What the reader gets | What it loses |
| --- | --- | --- | --- |
| `EMP201 deadline` (en) | 1 | "Corrections log" | EMP201 glossary entry ("by the 7th"), the checklist item "EMP201 submitted and paid by the 7th" |
| `ITR14 deadline` (en) | 1 | "Corrections log" | ITR14 glossary entry, "4. SARS company tax", "ITR14 filed within 12 months of financial year end" |
| `EMP201 due date` (en) | 1 | "Tax and SARS" in the sources register | the same |
| `UIF deadline` (en) | 1 | "Corrections log" | UIF glossary entry and sections |
| `income tax deadline` (en) | 3 | "Corrections log" first | |
| `EMP201 sperdatum` (af) | 1 | "Lys van regstellings" | EMP201 glossary entry |
| `ITR14 sperdatum` (af) | 1 | "Lys van regstellings" | ITR14 glossary entry, "4. SARS-maatskappybelasting" |
| compare `ITR14 due date` (en) | 66 | any-word pass: ITR14 glossary entry 2nd, "4. SARS company tax" in the top 5 | |
| compare `EMP501 deadline` (en) | 25 | any-word pass: EMP501 glossary entry first | |

The corrections log only says that "the provisional tax, EMP201 and ITR14 deadlines were confirmed against SARS's own calendar page". It does not give the date. So the honest best answer is missing, and the result shown does not answer the question. The row for `ITR 14 deadline` in the table test fixes this outcome in place (`startsWith: 'ITR14 deadline'`, and every result must hold `itr14`).

Who hits it and how often: owners checking when a monthly or yearly return is due. That is one of the main reasons to open this guide, and "deadline" and "sperdatum" are the words people type. I would expect it often, in both languages. It is not one exotic query: any code or topic word plus a word the guide uses only in passing behaves the same.

How to reproduce: `runSearchCounted(en.index, 'EMP201 deadline', 'en', { typing: false }, BASE)` gives total 1, "Corrections log". `'ITR14 sperdatum'` on the Afrikaans index gives total 1, "Lys van regstellings".

Suggested fix: when the every-word pass finds only a few results (for example fewer than 5), add the any-word results after them. Keep the every-word results first and leave out lone numbers and single letters as today, so `VAT246`, `EMP502` and the junk-query test still find nothing. Another option is to let a code alone carry the any-word pass ("the code's own entries after the every-word matches"). Write the rule in the table either way.

Acceptance: real-index rows. `EMP201 deadline`, `ITR14 deadline`, `EMP201 sperdatum` and `ITR14 sperdatum` each have the code's glossary entry in the top 3. `ITR14 deadline` still lists the every-word match before the rest. `VAT246` and `EMP502` stay empty, and "an unknown word with a lone number finds nothing" still passes.

### minor: a spaced pair's joined reading always ranks first, so `VAT 15%` opens a template row, not the VAT entry

File: `src/lib/search-client.ts:281-287` (`[...first, ...words]`: joined results before the words' results, whatever their scores), `tests/unit/search/index.test.ts` (the `VAT 15%` row asserts `templates/tax-invoice/#supply` in the top 3)
Acceptance item: general quality (ranking); the table's "Code, spaced" row.

What is wrong: the joined term exists for `VAT 15` only because the tax invoice template prints "VAT 15%" side by side. All three entries that hold it come before the VAT glossary entry:

- `VAT 15%`: "Supply" (template row), "Key to the short words", "Template 3", and only then "VAT" (glossary) and "Working with 15%".
- `BTW 15%`: "Lewering" first, and "BTW (VAT)" 4th.
- `brand 5`: "Prompt 11: put it all together" first, through an incidental `brand5`.

`15% VAT` puts the VAT glossary entry first. Word order therefore decides what Enter opens. Everything is found, so this is ranking, not a lost result.

Acceptance: either the table says joined-first is meant even for incidental pairs, or the joined reading ranks first only when the joined term is a known code (a glossary or term entry, or an aliased form code). `VAT 15%` then has the VAT glossary entry first, and `VAT 264` still ranks exactly as `VAT264`.

### minor: common shorthand for amounts and tax years still finds nothing

File: `src/lib/search/options.ts:118` (`TOKEN`), `:147-173` (`rawTokens`), `docs/design-system.md` ("Rand amount" and "Tax year" rows)
Acceptance item: the table's "Rand amount" and "Tax year" rows ("South Africans write amounts all four ways").

What is wrong:

- `R1m` and `R10m` find 0 results, and `R1m turnover` finds only "turnover" pages. `R1m` is a single token, `r1m`, which matches nothing.
- `R2.3m` happens to work, because the token stops after `R2.3` and `m` becomes a separate single letter.
- `2026-27`, a common way to write the tax year, finds 0. It becomes a hyphen part, `2026 AND 27` or `202627`.

These are less common than the spellings fixed in this round, so they are minor.

Acceptance: the table states whether `R1m` / `R2.3m` (as `R1 million`) and `2026-27` (as `2026/27`) are covered. If they are, add real-index rows: `R1m` finds what `R1 million` finds, and `2026-27` finds what `2026/27` finds, in both languages.

### minor: a match through the "in millions" alias is not highlighted

File: `src/lib/search-client.ts:337-349` (`markTerms`), `src/lib/search/options.ts:201-204`
Acceptance item: brief step 3 ("the matched words in `<mark>`").

What is wrong: `R2 300 000` and `R2,300,000` match "R2.3 million" through the index alias `r2300000`. That alias is not a word in the text, so no result marks anything. In the first three results of `R2 300 000` ("The decision", "Route 3: turnover tax", "Tax and SARS"), title, path and excerpt have no `<mark>`. `R2.3 million` marks "R2.3" and "million" in the same results.

Acceptance: a match on the millions alias marks the amount and its "million" / "miljoen" word, with a `highlight()` unit test.

### nit: the tax-year rule turns any four digits, `/`, two digits into a year

File: `src/lib/search/options.ts:162-169`
Acceptance item: general quality.

What is wrong: `2026/03` (a date path or a `YYYY/MM` date) becomes `2026` and `2003`, at index and query time. The rule does not check that the two digits are the next year. Today's indexed text has no such date, because URLs are not indexed, so nothing is wrong yet. The same applies to a hyphen chain of numbers: `1-2 weeks` indexes `12`. The data holds only `57-1` and `2026-09`.

Acceptance: expand `YYYY/YY` only when `YY` is the year after `YYYY`, with a unit case for `2026/03`.

### nit: nothing tests that the 404 suggestions search a finished query

File: `src/scripts/search-page.ts:229`, `tests/dom/search.test.ts`
Acceptance item: general quality.

What is wrong: removing `typing: false` from `StSearchSuggest.suggest` leaves every test green. The effect today is small, because address words seldom end in a digit.

Acceptance: a dom test where a suggestion query ending in a code or amount (`/core/r1/`) is searched as finished.

### nit: the design system lists the mixed example `ITR 14 deadline` as working

File: `docs/design-system.md` (the "Mixed" row)
Acceptance item: general quality.

What is wrong: the row offers `ITR 14 deadline` as an example of each part keeping its rule. That is true, but the result is the single corrections-log hit described in major 2. Update the example together with the fix for major 2.
