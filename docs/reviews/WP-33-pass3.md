# WP-33 review pass 3 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do pass 1 or pass 2.
- **Date:** 5 October 2026
- **Commit reviewed:** `6db3355` ("docs(search): record the review pass 2 fixes and new numbers"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b 6db3355`, the whole package and not only the fixes: 43 files, +6238 / -69. `d2f685b` is the main working branch with the Afrikaans translation, merged into WP-33 in `794585d`. The pass 2 fixes are `598fd2e`, `23089f6` and `6db3355`.

## Verdict

**Not clean: 0 blockers, 1 major, 3 minors, 1 nit.**

The pass 2 fixes for the dialog work:

- Enter before the index has loaded, then Escape, opens nothing. A result chosen for a closed dialog does nothing, and the next close still returns focus.
- One fast Enter that finds nothing goes to `/search/?q=`.
- A failed import of the results code now writes "Search could not load." to the status line.
- `page 2`, `step 1`, `stap 1` and similar now find only entries that hold the number.
- `VAT 264` now ranks exactly as `VAT264`.

All the gates are green.

The major comes from the pass 2 fix for minor 1 and nit 1. `resolvePairs` treats a hyphenated word like a form code. When the index holds the joined form, the query searches only that one term, exactly. A hyphenated query is now far stricter than the same two words with a space between them. Typing the end of a word also removes results. This hits Afrikaans hardest, because Afrikaans writes `BTW-registrasie`, `BTW-faktuur` and `SARS-registrasie` with a hyphen. For example, `BTW-regis` finds 35 results, but `BTW-registrasie` finds 9, and the tax invoice template and the VAT glossary entry are not among them.

The two-pass count starts again from zero.

## Gate results

I re-ran all of these myself on `6db3355`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 6.8s").
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier ("All matched files use Prettier code style!") and stylelint: clean.
  - `astro check`: "Result (197 files): 0 errors, 0 warnings, 0 hints".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1086 passed (1086)".
  - Content drift: "Content drift: none."
  - Vitest content: "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `search:build`: "en.572ee5bd2f.json: 945 entries, 738.4 KB raw, 165.3 KB gzip" and "af.0151dae661.json: 951 entries, 801.1 KB raw, 181.9 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.8 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 17.0 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 11.0 KB gzip (shared chunks counted once)."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4621`, default reporters): **543 passed, 85 skipped, 0 failed** (8.8 min).
  - All 14 `search.spec.ts` tests passed in chromium and in mobile. This includes the two new "Enter while the index loads" tests.
  - The 3 `nojs` search tests passed.
  - The 85 skips are the existing mobile duplicates of the D5 page checks.
- `pnpm test:a11y` (same environment): **196 passed** (8.2 min). This includes the four "search dialog open" runs.
- Coverage (`vitest run --project unit --project dom --coverage`):
  - `src/lib/search-client.ts`: 99.17% statements, 97.7% branches, 100% functions, 99.04% lines. That is above the brief's 90%.
  - `src/lib/search/**`: 100 / 91.48 / 100 / 100.
  - `scripts/search/**`: 100 / 93.22 / 100 / 100.
  - The command exits 1 on "Coverage for functions (88%) does not meet `src/lib/content/**` threshold (100%)". This package does not touch `src/lib/content/**`, and passes 1 and 2 saw the same thing, so it is not a WP-33 finding.
- **WebKit was not run.** It is not installed in this environment.

## My own checks

- **Mutations.** For each, I changed the code in my worktree, ran the unit or dom tests, and then reverted the change. Nothing was committed.

  | Change | Result |
  | --- | --- |
  | Remove the whole closed/cancelled check in `enterCurrent()` | killed ("does nothing when the dialog closed while the index was loading") |
  | Remove only the `#closes` counter from that check | **survives** (minor 2) |
  | Remove only the `!this.#dialog?.open` part of that check | survives (the counter covers it, so this is expected) |
  | Remove the `#choose` open-dialog guard | killed |
  | Remove the text-changed check | killed |
  | Remove the no-results `requestSubmit()` | killed |
  | Remove the `data-failed-text` status write | killed |
  | Make the stop-word capitals rule always true | killed |
  | Skip `resolvePairs` | killed (the `VAT 264` ranking tests) |
  | Let the exact part use prefix and fuzzy matching | killed (the `queryTree` shape test only) |

- **`resolvePairs` on every pair in the guide.** I collected every hyphenated word and every "2–6 letters, space, number" pair from the entry text of both built indexes. Then I ran each one with the real client. I compared the result with the same two words in reverse order, which does not form a pair, so both words are searched as ordinary words.
  - English: 201 pairs resolve to an exact joined term. For 106 of them, the plain two words find at least twice as many entries (and at least 3 more).
  - Afrikaans: 291 pairs resolve to an exact joined term, and 117 of them are affected in the same way.
  - Codes and years behave well:
    - `VAT 264`: 8 results, the same as `VAT264`.
    - `SAPS 601`: 7 results, `#how-to-register` first.
    - `Tax 2026`: 18 results, all holding 2026. The joined form is not in the index, so both words are searched.
    - `VAT 201`: 2 results.
    - `page 2`: 3 results, all holding the number.
  - The problem is hyphenated words (major 1).
- **Stop-word capitals rule.**
  - `on 1 March` gives `1` and `march`.
  - `op 28 Februarie` gives `28` and `februarie`.
  - `IT 12` gives `it12` (0 results; the guide does not hold it).
  - Lower-case `it 12` gives `12` alone, which finds 21 entries that hold any `12`.
  - All-capitals dates (`ON 1 MARCH`) pair again (nit 1).
- **Enter, close and text-change races.** I read `enterCurrent()`, `#onDialogClose`, `#choose` and `search()` together and checked these cases. I ran the first two in dom probes.
  1. Enter while the index loads, then close, then re-open before the index arrives: nothing opens. The `#closes` counter catches this. Without the counter, my probe opened the old result after the re-open, because `opened()` re-runs the same query and renders it first. No shipped test covers this (minor 2).
  2. Enter twice on the same text while the index loads: both calls can reach `activate()`. The first `#choose` closes the dialog, and the second returns early on the open-dialog guard. So the page navigates once.
  3. Enter, type more, then Enter: the first call is dropped on the text check, and the second opens the result for the new text.
  4. A fast Enter with no results submits to the locale's `/search/` (`action="/business-toolkit/af/search/"` on Afrikaans pages). A failed index does not submit, and an empty query is stopped by `#onSubmit`.
  5. A debounced search still pending at close is cleared by `#onDialogClose`, and `opened()` searches the text again on re-open.
- **`data-failed-text`.** It is rendered from `t('search.failed')`: "Search could not load." on English pages and "Die soektog kon nie laai nie." on Afrikaans pages. It is plain text read through `textContent`, so it is safe for the CSP and has no HTML. A dom probe found that the failed state is never cleared once the code does load (minor 1).
- **Rules.** The diff adds no `innerHTML`, `insertAdjacentHTML`, `set:html`, `href="/…"` literal, colour literal or `localStorage`. The only absolute URL is the `https://example.invalid/` base in `queryFrom()`, which is never fetched.
- **Ownership and deferrals.** Same as pass 2: the cross-package changes and the `backlog.md` rows are recorded. I agree with the deferrals (filter chips to WP-31, the settings rewire and `arrivalStore` at the WP-30 merge).

## Findings

### major 1: a hyphenated query searches only its joined form, exactly, so it finds far less than the same words with a space
File: `src/lib/search-client.ts:164-180` (`hasTerm`, `resolvePairs`), `src/lib/search-client.ts:195-197` (the exact branch of `queryTree`), `src/lib/search/options.ts:196` (hyphen pairs)
Acceptance item: Build 1 / A7 (prefix and fuzzy matching; `lang` and Afrikaans search); correctness. `docs/design-system.md:378` and ADR 0003 describe the new behaviour as giving "`VAT 264` ranks precisely as `VAT264`". They do not say that hyphenated words lose results.
What is wrong: `resolvePairs` handles both kinds of pair in the same way. If the index holds the joined term, the query searches that one term only, with `prefix: false` and `fuzzy: false`. For a form code (`VAT 264` → `vat264`) that is right. But the index also stores a joined alias for every hyphenated word (`tokenize`, `options.ts:159`). So most hyphenated queries now search only the hyphenated spelling. They lose:
- every entry that writes the two words apart or in another order ("registrasie vir BTW", "VAT registered");
- every longer form of the word, because prefix matching is off (`BTW-geregistreer` no longer finds `BTW-geregistreerde`).

The results also shrink while the reader types. A part-word does not resolve, because the index has no `btwregis`, so it is searched as two words with prefix matching. The whole word does resolve, so it is searched exactly. Measured with the real client on the indexes built from `src/data`:

| Lang | Query | Results now | Same words with a space | `c0567cf` tree |
| --- | --- | --- | --- | --- |
| af | `BTW-regis` (typing) | 35 | — | 36 |
| af | `BTW-registrasie` | **9** | 21 | 105 |
| af | `BTW-faktuur` | **2** | 19 | 19 |
| af | `SARS-registrasie` | **2** | — | 43 |
| af | `BTW-geregistreer` | **12** | 48 (reverse order) | 87 |
| af | `KI-opdragte` | **6** | 29 (reverse order) | 40 |
| en | `VAT-registered` | **3** | 49 | 125 |
| en | `small-business` | **1** (the privacy notice) | 74 (reverse order) | 74 |
| en | `co-owner` | **1** | 61 (reverse order) | 61 |

The `c0567cf` column is wider partly because its joined branch was fuzzy (pass 2 minor 1). The fair comparison is the "with a space" column.

What the reader loses is the main answer:
- `BTW registrasie` with a space has the tax invoice template first, then "BTW: waarskynlik nog nie".
- `BTW-registrasie` has "Die kort weergawe van die hele gids" first. "BTW: waarskynlik nog nie" is 8th of 9, and the tax invoice template and the VAT glossary entry are not in the results at all.
- `VAT-registered` loses `glossary/#vat` and both invoice templates, which `VAT registered` has as its top three.

The dialog shows "9 results". It does not say that more exist, so the reader has no reason to try the spaced form. Afrikaans writes compounds with acronyms with a hyphen as a rule (`BTW-`, `SARS-`, `CIPC-`, `KI-`), and pass 2 used `BTW-registrasie` as one of its Afrikaans test queries. So this is the normal way an Afrikaans reader searches, not an edge case. No test covers a hyphenated query apart from `e-filing`, where the glossary entry is still first. So the gate stayed green.
How to reproduce: Use `runSearch(index, q, 'af', { limit: 5000 }, '/business-toolkit/')` on the Afrikaans index built as `tests/unit/search/index.test.ts` builds it. Compare `BTW-registrasie` (9), `BTW registrasie` (21) and `BTW-regis` (35). In English, compare `VAT-registered` (3) and `VAT registered` (49).
Suggested fix: Resolve only code pairs (letters followed by a number) to the exact joined term. For a hyphenated pair, search "both words, or the joined form exactly": `{ combineWith: 'OR', queries: [{ combineWith: 'AND', queries: pair }, { queries: [joined], prefix: false, fuzzy: false }] }`. The exact joined branch keeps `page2`-style fuzzy noise out, and the both-words branch keeps the recall and the prefix matching. Add unit cases:
- `BTW-registrasie` finds at least what `BTW registrasie` finds;
- `VAT-registered` finds `glossary/#vat`;
- `BTW-registrasie` returns at least as many results as `BTW-regis` returns among the entries that contain the full word.

### minor 1: once the results code has failed to load, the failed state and "Search could not load." stay after it loads
File: `src/scripts/search.ts:290-305`, `src/scripts/search-ui.ts:91-95`
Acceptance item: Build 3 (loading, no-results and failed states); B5 (live region)
What is wrong: When the `search-ui` import fails, `open()` shows the failed block, hides the empty state and, since pass 2, writes "Search could not load." to the status line. It also clears `#controller`, so the next open tries the import again. If that second try works, `opened()` only searches when the field has text. Nothing resets the failed block, the empty state or the status. So the reader re-opens a dialog that works and still sees "Search could not load." and only the contents link, without the common questions, until they type. The status text is new in `598fd2e`. The stale failed block was already there before. The existing dom test covers only the first, failed open.
How to reproduce: A dom probe (not committed) based on the test "shows the failed state when the results code cannot load":
1. Fail the first `controller()`, open the dialog, then close it.
2. Restore the real `controller()`, open again, and wait for it.
3. Read the state. I got status "Search could not load.", the failed block shown and the empty state hidden. The expected state is an empty status, the failed block hidden and the empty state shown.
Suggested fix: In `opened()`, when the field is empty, call `#showEmpty()`. That clears the status, hides the failed block and shows the common questions. Add the two-open dom test.

### minor 2: no test covers "Enter while loading, close, re-open", which is the one case the `#closes` counter exists for
File: `src/scripts/search-ui.ts:113-118`, `tests/dom/search.test.ts:486-493`
Acceptance item: Tests (dom: listbox keyboard handling)
What is wrong: `enterCurrent()` cancels on `closes !== this.#closes || !this.#dialog?.open`. The dom test closes the dialog and keeps it closed, so the `open` check alone passes it, and deleting the counter leaves every test green (mutation above). The counter is what stops a re-open race:
1. The reader presses Enter while the index loads.
2. They press Escape.
3. They re-open the dialog before the index arrives.

`opened()` re-runs the same text and renders it, so `#shownQuery` matches again. Without the counter, my probe opened the old result after the re-open. The code is right today, but nothing protects it.
How to reproduce: Delete `closes !== this.#closes || ` at `search-ui.ts:118` and run `pnpm exec vitest run tests/dom/search.test.ts`. Everything passes.
Suggested fix: Add a dom test with the gated client from the "Enter before the index has loaded" block:
1. Press Enter.
2. Close the dialog.
3. Wait one task.
4. Call `showModal()` and `opened()`.
5. Release the gate.
6. Expect no `openResult`.

### minor 3: the exact branch is only checked by the shape of the query tree
File: `tests/unit/search/client.test.ts` ("searches a pair as both words, and a resolved pair exactly"), `src/lib/search-client.ts:195-197`
Acceptance item: Tests (unit: A7 cases); general quality
What is wrong: `prefix: false, fuzzy: false` on the exact part is the point of the pass 2 minor 1 fix. Only a `toEqual` on the tree object asserts it. If I drop the two options, only that shape test fails. No behaviour test fails: the `page 2` tests never reach the exact branch, because `page2` is not in the index, and the `VAT 264` tests still pass. So a refactor that keeps the behaviour but changes the shape breaks the test, while a change that keeps the shape is not tested at all. Fixing major 1 will touch this code, so this is the time to add a behaviour test.
Suggested fix: Add a behaviour test with a small index that holds `vat264` and also `vat2640` or `vat265`. `VAT 264` must not return the near-miss entry.

### nit 1: an all-capitals date still pairs its stop word with the number
File: `src/lib/search/options.ts:194`
What is wrong: The capitals rule treats `ON 1 MARCH` and `OP 28 FEBRUARIE` (Caps Lock, or text copied from a heading) like `IT 12`. So the number turns into `on1` and plays no part: AND finds nothing, and the OR fallback matches only `march`. Lower-case `it 12` turns into a lone `12` and lists 21 entries that hold any 12. Neither is harmful, and the guide holds neither `IT12` nor `ON1`. A narrower rule would be to pair a stop word only when the whole query is not in capitals, or only when the next token is a known code length. That is optional.

## Pass 2 findings: status

| Pass 2 | Status at `6db3355` |
| --- | --- |
| major 1, Enter then close | Fixed. Cancelled on close (open check and close counter) and on text change, and `#choose` ignores a closed dialog. Dom and e2e tests cover close-and-stay-closed. Re-open is not tested (minor 2 above). |
| minor 1, `page 2` over-match | Fixed for word + number. The way it was fixed causes major 1 above for hyphenated words. |
| minor 2, failed import silent | Fixed with `data-failed-text`. The state does not clear after a later successful load (minor 1 above). |
| minor 3, no test across a pending load | Fixed: dom tests for the open, close and text-change cases, and two e2e tests with the index request held. The e2e fast-Enter test asserts exactly `/glossary/#vat264`. |
| minor 4, spaced code only "in 30" | Fixed: top 3, and the top 10 equal to `VAT264`'s. |
| nit 1, summed pair score | Fixed for codes by the exact resolution. |
| nit 2, fast Enter with no results | Fixed: one Enter submits to `/search/?q=`. |
| nit 3, stop word swallows a date's number | Fixed for normal case (nit 1 above for all capitals). |
