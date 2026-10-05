# WP-33 review pass 4 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1, 2 or 3.
- **Date:** 5 October 2026
- **Commit reviewed:** `a1ce3ad` ("docs(search): update the budget numbers after review pass 3"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b a1ce3ad`, the whole package and not only the fixes: 44 files, +6575 / -69. `d2f685b` is the main working branch with the Afrikaans translation, merged into WP-33 in `794585d`. The pass 3 fixes are `e46f005` and `a1ce3ad`.

## Verdict

**Not clean: 0 blockers, 1 major, 3 minors, 2 nits.**

The pass 3 fixes work:

- A hyphenated word is never resolved to its joined form. Over every hyphenated word in both indexes (227 English, 335 Afrikaans), the hyphenated query finds at least what the spaced words find, except where one half is a stop word (`all-in`, `bo-op`), which is the precise reading. `BTW-registrasie` now finds 21, the same as `BTW registrasie`, with "BTW: waarskynlik nog nie" first.
- Opening the dialog with an empty field clears an earlier failed state.
- The close counter and the exact options now each have a behaviour test that fails without them.
- `ON 1 MARCH` keeps its 1.

All the gates are green.

The major is older than pass 3 and none of the earlier passes reported it. Fuzzy matching (and, to a smaller degree, prefix matching) also applies to terms that hold digits. So a form code typed joined, or a rand amount, matches **other** form codes and **other** amounts, and these often rank first. `SAPS604` puts the SAPS 601 section first. `EMP501 due` puts the EMP201 glossary entry first. `ITR14 deadline` puts the ITR12 calendar first. `R500,000` puts a section with R750,000 and R800,000 first, and marks R750,000 as the match. For a guide whose point is getting thresholds and forms right, this is a wrong answer, not noise.

The two-pass count stays at zero.

## Gate results

I re-ran all of these myself on `a1ce3ad`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 5.7s").
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier ("All matched files use Prettier code style!") and stylelint: clean.
  - `astro check`: "Result (197 files): 0 errors, 0 warnings".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1102 passed (1102)".
  - Content drift: "Content drift: none."
  - Vitest content: "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `search:build`: "en.572ee5bd2f.json: 945 entries, 738.4 KB raw, 165.3 KB gzip" and "af.0151dae661.json: 951 entries, 801.1 KB raw, 181.9 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.8 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 17.1 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 11.1 KB gzip (shared chunks counted once)."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4631`, default reporters): **543 passed, 85 skipped, 0 failed** (7.4 min). All 14 `search.spec.ts` tests passed in chromium and in mobile, and the 3 `nojs` search tests passed. The 85 skips are the existing mobile duplicates of the D5 page checks.
- `pnpm test:a11y` (same environment): **196 passed** (5.2 min), including the four "axe with the search dialog open" runs.
- Coverage (`vitest run --project unit --project dom --coverage`):
  - `src/lib/search-client.ts`: 99.19% statements, 97.77% branches, 100% functions, 99.06% lines. That is above the brief's 90%.
  - `src/lib/search/**`: 100 / 92.59 / 100 / 100.
  - `scripts/search/**`: 100 / 93.22 / 100 / 100.
  - The command exits 1 on "Coverage for functions (88%) does not meet `src/lib/content/**` threshold (100%)". This package does not touch `src/lib/content/**`, and passes 1 to 3 saw the same thing, so it is not a WP-33 finding.
- **WebKit was not run.** It is not installed in this environment.

## My own checks

- **Mutations.** For each, I changed the code in my worktree, ran `tests/unit/search` and `tests/dom/search.test.ts`, and then restored the file. Nothing was committed.

  | Change | Result |
  | --- | --- |
  | Let `resolvePairs` resolve hyphenated pairs again | killed (13 tests, including the four Afrikaans "at least what the spaced form finds" cases) |
  | Drop the joined branch of a hyphenated pair | killed (`e-filing` finds the glossary entry first) |
  | Let the hyphen's joined branch use prefix and fuzzy matching | killed (the query tree shape test only) |
  | Remove `else this.#showEmpty()` from `opened()` | killed ("clears the failed state when a later open loads the results code") |
  | Remove the all-capitals rule | killed |
  | Let the exact part use prefix and fuzzy matching | killed, now also by a behaviour test |
  | Remove the close counter from `enterCurrent()` | killed ("closed and re-opened while the index was loading") |
  | Remove only the `!this.#dialog?.open` check | survives (the counter covers it, as expected) |
  | Remove the text-changed check | killed |
  | Remove the failed-state guard before `requestSubmit()` | **survives** (minor 3) |
  | Remove the `#choose` open-dialog guard | killed |
  | Turn fuzzy matching off for every term | killed (the `belastng` typo cases) |

- **Real queries on the real indexes.** I ran about 150 queries with the real client on the indexes built from `src/data`, as `tests/unit/search/index.test.ts` builds them, and compared each with what a reader would expect.
  - Codes, spaced and joined, behave well where no near neighbour exists: `VAT264`, `VAT 264` and `vat-264` (8 each, glossary first), `SAPS 601`, `saps601` and `SAPS-601`, `IRP 6`, `EMP 201`, `CR 2B`, `CoR 14.3`, `INV-0001`, `QUO-0001`, `REC-0001`.
  - Codes with a near neighbour do not (major 1). The spaced form is resolved exactly, so it is right. The joined form is fuzzy, so it is not: `ITR 12` finds 6 and `ITR12` finds 16, ITR14 entries among them.
  - Years and dates: `2026` (32), `28 February`, `1 March`, `ON 1 MARCH` and `tax year 2026` are all sensible. `2025/26` finds 2.
  - Hyphenated and compound words: `BTW-registrasie` 21, `BTW-faktuur` 19, `SARS-registrasie` 31, `KI-opdragte` 29, `VAT-registered` 49, `B-BBEE` 14 (glossary first), `e-pos` 23, `pay-as-you-earn` 19, `second-hand` 34. Afrikaans closed compounds are found whole (`omsetbelasting`, `belastingfaktuur`, `eenmansaak`), and a part of a compound is not (`nommer` does not find `belastingnommer`). That is expected without decompounding, and the brief puts Afrikaans stemming out of scope.
  - Typing: `BTW-` 58, `BTW-r` 4, `BTW-regis` 35, `BTW-registrasie` 21. `VAT 2` 5, `VAT 26` 2, `VAT 264` 8. A lone letter or a partial number briefly narrows the list, and the finished word is right. `e-fil` and `e-mai` find 1 unrelated entry each until the word is finished (nit 2).
  - Typos: `regstration`, `provisonal tax`, `turnovr tax`, `invoce` and `voorlopige belastig` all find the right entry first. A swapped pair of letters does not (`invocie` finds nothing). That is plain Levenshtein distance in MiniSearch, and within A7.
  - Punctuation, quotes and junk: `"tax invoice"`, `VAT?`, `vat/tax`, `vat & tax`, `<b>vat</b>`, `???`, `—` and `...` all behave. Apostrophes split (`owner's` → `owner`, `s`) the same way at index and query time, so they still match.
  - Long input: a full question is cut at 12 words. `Do I need to register for VAT if I earn R50,000 a year?` falls back to `OR` and ranks "VAT: probably not yet" second. Part of the first result's score comes from `R5,000` fuzzy-matching `R50,000` (major 1).
- **Keyboard sequences in the built site.** I ran these against `astro preview` in Playwright Chromium, holding the index or the `search-ui` chunk back with `page.route`:
  1. Index held 2 s; type `SAPS 601`, Enter, Escape, `/` again: nothing opens, and the re-opened dialog shows the 7 results.
  2. Index held; `SAPS`, Enter, then ` 601`: nothing opens. A second Enter opens `#how-to-register`, and that heading has focus.
  3. Index held; Enter, then the close button: nothing opens.
  4. Index held; Enter twice: one navigation.
  5. Results for `VAT` on screen; ArrowDown twice, type `264`, Enter at once: opens `glossary/#vat264`, the first result of the new text.
  6. Escape with text: the dialog closes. `/` re-opens it with the text and its results, and Enter opens the first one.
  7. Index request aborted; Enter: "Search could not load.", nothing opens. A second Enter submits to `/search/?q=VAT264`.
  8. Afrikaans page; type `BTW-registrasie` and Enter at once: opens `af/core/tax-and-sars/#vat-probably-not-yet`, with focus on the heading.
  9. `search-ui` chunk held 1.5 s; type `vat264`, Enter: the native form submits to `/search/?q=vat264`, which shows the results. With an empty field the same Enter goes to `/search/?q=` (nit 1).
  10. Index held; type `VAT264`, wait for the debounced search, clear the field, Escape, `/`: the re-opened dialog has an empty field but shows "7 of 8 results shown" for `VAT264` once the index arrives (minor 1).
- **Rules.** The diff adds no `innerHTML`, `insertAdjacentHTML`, `set:html`, `href="/…"` literal, colour literal or `localStorage`. The only absolute URL is the `https://example.invalid/` base in `queryFrom()`, which is never fetched. No request left the origin in my browser runs or in the e2e guards.
- **Ownership and deferrals.** Same as passes 2 and 3: the cross-package changes and the `backlog.md` rows are recorded. I agree with the deferrals.

## Findings

### major 1: form codes typed joined and rand amounts fuzzy-match other codes and other amounts, and rank them first
File: `src/lib/search/options.ts:247-254` (`fuzzy`, `prefix`), `src/lib/search-client.ts:231-235` (the options every query part uses)
Acceptance item: Build 1 / A7 (a tokenizer that keeps form codes and amounts whole); correctness. ADR 0003 and `docs/design-system.md` say "`VAT 264` ranks precisely as `VAT264`". That holds for `VAT264` only because it has no near neighbour.
What is wrong: `fuzzy()` gives every term longer than four characters an edit distance of 0.2 × length, and the tokenizer keeps codes and amounts as single terms (`emp501`, `saps604`, `r500,000`). So a code is one edit from its neighbour form (`emp201`/`emp501`, `itr12`/`itr14`, `saps601`/`saps604`), and an eight-character amount is two edits from most other amounts (`r500,000` matches `r750,000`, `r800,000`, `r200,000`, `r30,000`). Pass 2 made a *spaced* code resolve exactly, so the spaced and joined forms of the same code now give different answers. What a reader gets, measured with the real client on the indexes built from `src/data`:

| Lang | Query | First result (matched terms) | What the reader asked about |
| --- | --- | --- | --- |
| en | `SAPS604` | vehicle dealer `#how-to-register`, "SAPS 601" (`saps601`) | `SAPS 604` (spaced) puts "Keeping your registration valid" first |
| en | `EMP501 due` | `glossary/#emp201` (`emp201`, `due`) | EMP501, the annual reconciliation |
| en | `ITR14 deadline` | "Your tax year calendar" (`itr12`, `deadline`) | the company return |
| af | `ITR14 sperdatum` | "Jou belastingjaarkalender" (`itr12`, `sperdatum`) | the company return |
| en | `R500,000` | "Route 3: turnover tax" (`r750,000`, `r800,000`, `r200,000` …, not `r500,000`) | the first entry holding R500,000 is 10th |
| en | `R300,000` | "Route 3: turnover tax" (`r750,000` …) | the guide never says R300,000; "Nothing found" is the true answer |
| en | `R1 million` | `glossary/#qse` (`r10`, `million`), the R10 million QSE line | through prefix: `r1` matches `r10` |

The dialog marks the matched terms, so the reader also sees the wrong amount highlighted as the match: `highlight('Route 3 R750,000 and R500,000', ['r750,000'])` marks `R750,000`. The `/search/?q=R500,000` page in the built site lists two entries without R500,000 before the first one that has it. No test covers a code or an amount with a near neighbour, so the gate stayed green. The A7 cases (`VAT264`, `SAPS 601`) have none.

This matters because the guide exists to get the reader's thresholds and forms right. The build plan treats a wrong amount as a defect worth a test of its own (A8, the content validation test: forbidden stale strings such as "R1 million" as the VAT threshold). A search that answers `R500,000` with R750,000, or `EMP501` with EMP201, points the reader at the wrong fact with a highlight that says it is the match.
How to reproduce: `runSearch(index, q, lang, { limit: 10 }, '/business-toolkit/')` on the index built as `tests/unit/search/index.test.ts` builds it, for the queries above, and print `href` and `terms`. In the browser: `/business-toolkit/search/?q=R500,000`.
Suggested fix: Do not fuzzy-match a query term that holds a digit: `fuzzy(term)` returns `false` when `/\p{N}/u.test(term)`. A typo in a code is better caught by the spaced form, and a typo in an amount is a different amount. Prefix matching can stay for typing (`R50` → `R50,000`), but consider turning it off for a digit term that is not the last word of the query, so `R1 million` does not match R10. Record the change in ADR 0003 and `docs/design-system.md`. Add unit cases on the real index:
- `SAPS604` puts `#keeping-your-registration-valid` first;
- `EMP501` does not return `glossary/#emp201` in the top 1, and `ITR14 deadline` returns no result whose only code term is `itr12`;
- `R500,000` has `r500,000` in the terms of every result in its top 3;
- `R300,000` returns no result.

### minor 1: a search still running when the dialog closes can fill the re-opened dialog under an empty field
File: `src/scripts/search-ui.ts:91-98` (`opened()`), `src/scripts/search-ui.ts:136-139` (`#onDialogClose`)
Acceptance item: Build 3 (states); B5 (live region says what happened)
What is wrong: `#onDialogClose` clears the debounce timer but does not invalidate a search that is already waiting for the index. `opened()` with an empty field calls `#showEmpty()`, which also does not bump `#sequence`. So in this order: type `VAT264`, the debounced search starts and waits for the index, clear the field and press Escape within 120 ms (the timer for the empty text is cleared), re-open. The dialog shows the common questions, then the index arrives and the old search renders "7 of 8 results shown" and seven `VAT264` options under an empty field, with the common questions hidden. Enter is safe there: the text check sends it to `search('')`, which shows the common questions. But the arrow keys move through the stale options, and a click opens one.
How to reproduce: in the built site, hold the index request for 1.5 s with `page.route`, then press `/`, type `VAT264`, wait 300 ms, press Ctrl+A, Backspace, Escape, wait 100 ms, press `/`, and wait 2.5 s. A dom probe built from the "Enter before the index has loaded" harness gives the same state: field `""`, 1 option, status "1 result", common questions hidden.
Suggested fix: Bump `#sequence` in `#onDialogClose` (or in `#showEmpty()`), so any answer that arrives after a close or an empty-field reset is dropped. Add the dom case above.

### minor 2: result counts stop at 30 and are announced as the total, and "See all" shows the same 30
File: `src/lib/search-client.ts:37` (`DEFAULT_LIMIT`), `src/scripts/search-ui.ts:335-346`, `src/scripts/search-page.ts:153-167`
Acceptance item: Build 3 and 4 (the search page as the full list); B5 (live region result counts)
What is wrong: `runSearch` stops at 30 results, and both the dialog and the search page count what came back. `VAT` matches 59 entries and `regstration` 124. The dialog says "12 of 30 results shown" and "See all 30 results on the search page", and the search page says "30 results" and lists 30. There is no way to reach result 31, and the count and the "See all" link both state a total that is not the total. The pass 1 fix ("N of M results shown") made the first number honest. The second number is still the cap.
How to reproduce: on the built site, open the dialog and type `VAT`. Then open `/business-toolkit/search/?q=VAT`.
Suggested fix: Either let the search page ask for every result (`limit: Infinity`, or a large cap) and have the client return the full count with the capped list, or word the cap honestly ("30 or more results", a new key in both dictionaries).

### minor 3: no test covers "Enter while the index loads, and the load fails"
File: `src/scripts/search-ui.ts:126`, `tests/dom/search.test.ts` ("Enter before the index has loaded")
Acceptance item: Tests (dom: listbox keyboard handling)
What is wrong: `enterCurrent()` submits to the search page when nothing was found, but not when the index failed (`this.#failed?.hidden !== false`). Removing that guard leaves every test green (mutation above). Without it, an Enter during a load that fails navigates the reader away to `/search/?q=`, which will most likely fail too, instead of leaving them on the failed state with its contents link. The behaviour is right today (keyboard sequence 7), but nothing protects it.
How to reproduce: replace `} else if (this.#failed?.hidden !== false) {` with `} else {` at `search-ui.ts:126` and run `pnpm exec vitest run tests/dom/search.test.ts`. Everything passes.
Suggested fix: Add a dom case to the gated-client block whose `search()` rejects after the gate: press Enter, release, and expect `requestSubmit` not to be called and the failed block to be shown.

### nit 1: Enter in an empty field before the results code has loaded leaves the page for `/search/?q=`
File: `src/scripts/search.ts:284-306` (`open()`), `src/scripts/search-ui.ts:169-172` (`#onSubmit`)
What is wrong: The submit guard lives in the lazily loaded half. On a slow first open, Enter in the empty field submits the native form and the reader lands on `/search/?q=` with nothing searched. With text, the same early Enter goes to `/search/?q=<text>`, which is a fair answer. Moving the empty-query `preventDefault()` into `<st-search>` (the eager half, which already owns Escape) would keep the reader on their page.

### nit 2: a hyphenated word whose first half is one letter finds almost nothing until it is finished
File: `src/lib/search-client.ts:206-211`
What is wrong: The joined branch of a hyphenated pair is exact, without prefix. When the first half is a single letter, the both-words branch needs that letter as a whole term. So `e-fil` and `e-mai` find one unrelated entry each, while `efil` finds 10, with the eFiling glossary entry first. The spaced `e filing` also finds 1. Allowing prefix (not fuzzy) on the hyphen's joined branch would fix the typing case without bringing back the `page2` noise that pass 2 removed, because that noise came from fuzzy matching. A matched joined alias is also not marked in text that writes the hyphen (`highlight('… e-filing', ['efiling'])` marks nothing), which is harmless while the both-words branch marks the halves.

## Pass 3 findings: status

| Pass 3 | Status at `a1ce3ad` |
| --- | --- |
| major 1, hyphenated query narrower than spaced | Fixed. Hyphenated pairs are never resolved; the tree is "both words, or the joined form exactly". The sweep over every hyphenated word in both indexes found no case where the hyphenated form finds less, except stop-word halves, which are the precise reading. Unit tests cover the four Afrikaans words and `e-filing`. |
| minor 1, failed state stays after a later successful load | Fixed in `opened()`, with a dom test that fails without it. |
| minor 2, no test for close and re-open while loading | Fixed: the dom test fails without the counter. |
| minor 3, exact branch tested only by shape | Fixed: a behaviour test fails when the exact options are dropped. |
| nit 1, all-capitals date pairs | Fixed: `ON 1 MARCH` keeps the 1. |
