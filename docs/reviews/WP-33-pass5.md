# WP-33 review pass 5 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 4.
- **Date:** 5 October 2026
- **Commit reviewed:** `bf156f7` ("docs(search): update the budget numbers after review pass 4"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b bf156f7`, the whole package and not only the fixes: 45 files, +7083 / -69. `d2f685b` is the main working branch, merged into WP-33 in `794585d`. The pass 4 fixes are `c233421`, `1f90f60` and `bf156f7`.

## Verdict

**Not clean: 0 blockers, 3 majors, 3 minors, 2 nits.**

The pass 4 major is fixed. A term with a digit is no longer fuzzy-matched: `SAPS604`, `EMP501 due`, `ITR14 deadline` and `R500,000` now find only their own form or amount. Writing the rules down as one table was the right move, and most rows hold. I checked them on the real indexes:

- Words, partial words and typos: `notion`, `notinal input`, `turnovr tax`, `omsetbelastng`, `kontrolel` all find what the reader wants.
- Joined codes while typing (`VAT26`, `SAPS60`, `EMP20`) and joined codes with a typo (`VAT246`, `EMP502`) behave as the table says.
- Hyphenated words (`e-fil`, `B-BBEE`, `BTW-drempel`, `VAT-registered`) and punctuation (`"PIS"?!`) behave as the table says.
- Section numbers (`14.3`, `CoR 14.3`) and dates (`on 1 March`, `28 February`) behave as the table says.

The Enter, Escape and close timing holds up. I found nothing new there, and the mutations below show the key guards are tested.

The three majors are all in the table itself, which this pass was asked to judge:

1. The "Code, spaced" rule treats any word followed by a number as a form code once the index happens to hold the two joined. `VAT 15%`, the VAT rate, then finds 3 results instead of 11, and loses the VAT glossary entry. `15% VAT` finds all 11.
2. A spaced code that is still being typed never reaches its code. `SAPS 60` shows one unrelated section and `VAT 26` shows the corrections log. `SAPS60` and `VAT26` both reach the right form. The table says the two spellings must give the same answer.
3. South African ways of writing amounts and tax years are not in the table, and they find nothing. Examples are `R120 000`, `R120000` and `2026/27`. `R2,3 miljoen` finds results, but not the threshold sections.

The two-pass count stays at zero.

## Gate results

I re-ran all of these myself on `bf156f7`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 5s using pnpm v11.22.0").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "Result (197 files): 0 errors, 0 warnings, 0 hints".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1145 passed (1145)".
  - Vitest content: "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.8 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 17.3 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 11.3 KB gzip".
  - `dist:budget`: "index af.0151dae661.json: 801.1 KB raw, 181.9 KB gzip" and "index en.572ee5bd2f.json: 738.4 KB raw, 165.3 KB gzip".
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4661`, default reporters): **543 passed, 85 skipped, 0 failed** (8.9 min). The failure list is empty.
- `pnpm test:a11y` (same environment): **196 passed** (8.7 min).
- Coverage (`vitest run --project unit --project dom --coverage`):
  - `src/lib/search-client.ts`: 99.23% statements, 97.91% branches, 100% functions, 99.1% lines. That is above the brief's 90%.
  - `src/lib/search/options.ts`: 100 / 97.72 / 100 / 100.
  - The command exits 1 on the `src/lib/content/**` function threshold (88% against 100%). That is outside this package and passes 1 to 4 saw the same, so it is not a WP-33 finding.
- **WebKit was not run.** It is not installed in this environment.
- **File ownership and rules.** The added lines under `src/` have no `href="/` literals, no `localStorage`, no `innerHTML` and no literal colours. Outside `docs/`, `scripts/`, `src/` and `tests/`, the diff touches only `.gitignore`, `package.json` and `vitest.config.ts`.

## My own checks

- **Real queries.** I built both indexes in memory the way `tests/unit/search/index.test.ts` does, and ran about 120 queries through `runSearchCounted`. The terms came from the guide's own text: codes, amounts, dates, Act names, Afrikaans compounds, typos, partial words, punctuation and quoted text. Every finding below gives the queries and their result counts.
- **Spaced codes against their joined form.** I took every index term made of letters and then digits (30 in English, 32 in Afrikaans). For each one I compared the entries that hold the joined term with the entries that hold both words. Six spaced queries lose results because they resolve to the joined term (major 1).
- **Mutations.** For each change below, I edited my worktree, ran `tests/unit/search` and `tests/dom`, and then restored the file. Nothing was committed, and `git status` is clean.

  | Change | Result |
  | --- | --- |
  | Let terms with a digit be fuzzy (`fuzzy: FUZZY`) | killed (15 tests, including the real-index rows `SAPS604`, `EMP501 due`, `ITR14 deadline`) |
  | `resolvePairs` never resolves | killed (8 tests, including the `VAT 264` real-index rows) |
  | Fuzzy on the hyphen's joined branch | killed (1 test, the query-tree shape test only) |
  | `PREFIX_MIN_LENGTH = 1` | killed (4 tests, including real-index `e-fil`) |
  | `typing` always `true` | killed (1 test) |
  | Bare numbers prefix-matched while last | killed, but only by the `matchRule` unit cases; no real-index row fails (nit 1) |
  | Drop the close check in `enterCurrent` | killed |
  | Never take the "options are stale" Enter path | killed (4 tests) |
  | Drop `this.#sequence++` from `#onDialogClose` | **survives** (nit 2) |

- **Keyboard.** I traced these sequences against the code, and the dom tests cover each guard:
  - Enter within the debounce.
  - Enter twice while the index is loading.
  - Enter and then typing before the index arrives.
  - Escape, the close button and the backdrop while an Enter waits.
  - Opening the dialog again before the slow index arrives.
  - A failed load after Enter.
  - Enter before the results code has loaded. With text in the field, the native form submits to `/search/?q=`. That is a sensible fallback.
  - Escape during IME composition.
  - `/` typed inside the field.

  None of them opens a result for a closed dialog or for older text.

## Findings

### major: "Code, spaced" resolves an ordinary word and number to an incidental joined alias, so `VAT 15%` loses most of its results

File: `src/lib/search-client.ts:180` (`resolvePairs`), `src/lib/search/options.ts:202` (any 2 to 6 letters before a number is a code pair), `src/lib/search/options.ts:158` (the index aliases any word with two capitals before a number), `docs/design-system.md:387` (the table row)
Acceptance item: build plan A7 (prefix and fuzzy search that finds what the reader asks for); the table's own "Why": "the spaced and joined spellings must give the same answer"; the pass 3 rule that a spelling must not shrink the results.

What is wrong:

- At index time, `tokenize` adds a joined alias for any word with two capitals followed by a number. So `VAT 15%` in the tax invoice template becomes the term `vat15`.
- At query time, `queryParts` makes any 2 to 6 letter word before a number into a code pair. `resolvePairs` then searches only the joined term exactly whenever the index holds it.
- So the VAT rate, written the way a reader writes it, is read as a form code `VAT15`. It finds only the 3 entries where "VAT 15" happens to stand side by side. The VAT glossary entry and the "Working with 15%" section are both dropped.
- Word order changes the answer.

| Query | Results | First result |
| --- | --- | --- |
| `VAT 15%` / `VAT 15` (en) | 3 | "Supply" (tax invoice template); no VAT glossary entry, no "Working with 15%" |
| `15% VAT` (en) | 11 | VAT glossary entry, then "Working with 15%" |
| `BTW 15%` (af) | 3 | "Lewering"; no "BTW (VAT)" glossary entry |
| `15% BTW` (af) | 11 | "BTW (VAT)" glossary entry, then "Werk met 15%" |
| `brand 5` (en) | 1 | 27 entries hold both words |
| `werk 5` (af) | 1 | 27 entries hold both words |
| `nie 15` (af) | 1 | 8 entries hold both words |
| `under 100` (en) | 1 | 3 entries hold both words |

These are all six spaced queries in both indexes that lose results this way; I checked every letters-then-digits index term. `VAT 15%` is one of the most natural questions a reader of this guide asks, so this is a wrong answer and not ranking noise. It is the same class as the pass 3 major (`BTW-registrasie` 9 results against 21 for `BTW registrasie`).

How to reproduce: `runSearchCounted(en.index, 'VAT 15%', 'en', {}, BASE)` gives total 3, and `'15% VAT'` gives 11.

Suggested fix: decide in the table when a spaced pair is a code. Two options:

- Resolve to the joined term only when no entry holds both words without holding the joined term. Spaced form codes such as `VAT 264` and `SAPS 601` pass that test; `VAT 15` does not.
- Search "joined term, or both words" and rank by the better branch, not the sum.

Acceptance: a real-index test over every letters-then-digits index term in both languages. Each spaced query finds at least every entry the both-words search finds, or the table names the exception. `VAT 15%` and `BTW 15%` find their glossary entry and the "Working with 15%" section. `VAT 264` still ranks exactly as `VAT264`.

### major: a spaced code that is still being typed never reaches its code, while the joined spelling does

File: `src/lib/search-client.ts:180` (`resolvePairs` looks only for the whole joined term), `src/lib/search/options.ts:272` (a bare number is always exact), `docs/design-system.md:386-387`
Acceptance item: the table's "Code, joined" row ("Prefix while typing lets `VAT26` reach `VAT264`") and its "Code, spaced" row ("The spaced and joined spellings must give the same answer"); B3 flow 3 (live results as the reader types).

What is wrong: `resolvePairs` checks whether the index holds the joined term exactly. While the reader is typing, `vat26` or `saps60` is not a whole term, so the pair falls back to "both words". The partial number is then matched exactly as a bare number. So every spaced code shows unrelated results, or nothing, until its last digit is typed. The joined spelling reaches the code from its first digit. The table has no row for a spaced code being typed, and the code breaks the invariant the table gives as the reason for the spaced rule.

| Typed so far | Results | What the reader sees first |
| --- | --- | --- |
| `SAPS 60` (en) | 1 | "When you sell a vehicle out" (matched `60` and `saps`) |
| `SAPS60` (en) | 8 | "SAPS 601" (how to register) |
| `VAT 26` (en) | 1 | "Corrections log" |
| `VAT26` (en) | 8 | VAT264 glossary entry |
| `EMP 20` (en) | 4 | Sources "Paying yourself from a company" (matched `20`) |
| `EMP20` (en) | 11 | EMP201 glossary entry |
| `SAPS 60` / `EMP 20` (af) | 1 / 3 | "Wanneer jy 'n voertuig verkoop" / "Om 'n leningsrekening in debiet reg te stel" |

A reader who types `SAPS 60` and presses Enter (for example, because the list already looks like it has one answer) opens the vehicle-sale section. The dialog's live list, which is the main way this guide is searched, also shows the wrong page at every step of typing a code the way the guide itself writes it (`SAPS 601`, `VAT 264`).

How to reproduce: `runSearchCounted(en.index, 'SAPS 60', 'en', {}, BASE)` against `'SAPS60'`.

Suggested fix: when the pair is the last part and is still being typed, resolve it by prefix. If any index term starts with the joined form (`saps60` → `saps601`, `saps604`), search the joined form by the joined-code rule (prefix while last). Otherwise use both words. Add the row "Code, spaced, being typed" to the table.

Acceptance: a real-index row per language. `SAPS 60` and `VAT 26` give the same first results as `SAPS60` and `VAT26`. `page 2` and `stap 1` still hold only entries with that number.

### major: South African ways of writing amounts and tax years are missing from the table and find nothing

File: `src/lib/search/options.ts:118` (`TOKEN`), `src/lib/search/options.ts:270` (`matchRule`), `src/lib/search-client.ts:160` (`weak` leaves lone numbers out of the fallback), `docs/design-system.md:389-390`
Acceptance item: the brief's step 1 and A7 (the tokenizer keeps codes and amounts whole so they can be found); the task for this pass, "is any kind of query missing".

What is wrong: the guide writes amounts one way: `R120,000`, `R2.3 million`, and `2026/2027` for a tax year. The Afrikaans translation keeps these byte-identical, as CLAUDE.md requires. Readers in South Africa often write them in other ways:

- with a space between thousands (`R120 000`, the SI and SARS style);
- with no separator (`R120000`);
- with a decimal comma, the normal Afrikaans style (`R2,3 miljoen`);
- with a short tax year (`2026/27`).

The table's "Rand amount" and "Number, year" rows cover none of these, and the results are:

| Query | Results | Guide text it should find |
| --- | --- | --- |
| `R120 000` (en and af) | 0 | `R120,000`, 4 entries |
| `R120000` (en) | 0 | `R120,000` |
| `R1,000,000` (en) | 0 | `R1 million`, 8 entries |
| `2026/27` (en and af) | 0 | `2026/2027`, 14 places |
| `R2,3 miljoen` (af) | 24, led by the QSE and EME glossary entries; `r2,3` matches nothing | `R2.3 miljoen`, 23 places, the VAT threshold sections |
| `R2,3` (en) | 1, "Route 3: turnover tax" through `R2,300,000` | the VAT threshold |
| `R2 300 000` (en) | 1, an unrelated section | the VAT threshold |

"Nothing found" for an amount or tax year that the guide states many times is a wrong answer, not an honest one. Thresholds and tax years are what this guide is most often consulted for. `R2,3 miljoen` is how an Afrikaans reader writes the VAT threshold.

How to reproduce: `runSearchCounted(en.index, 'R120 000', 'en', {}, BASE).total` is 0; `'2026/27'` is 0.

Suggested fix: add the rows to the table. Then normalise amounts the same way at index and query time:

- remove a space or comma between groups of exactly three digits after `R`, and remove the thousands separators;
- read `,` followed by one or two digits after `R` as a decimal point;
- give `YYYY/YY` the alias `YYYY/YYYY` at index time, or expand it at query time.

Keep the joined-code and exact-number rules on the normalised form.

Acceptance: real-index rows, in both languages:

- `R120 000` and `R120000` find what `R120,000` finds;
- `R2,3 miljoen` puts a VAT-threshold section in the top 3, as `R2.3 miljoen` does;
- `2026/27` finds what `2026/2027` finds;
- `R1 million` still never matches `R10`.

### minor: a hyphenated word with a stop-word half ignores the table: joined form only, with prefix and fuzzy matching

File: `src/lib/search/options.ts:209-213`
Acceptance item: the table's "Hyphenated word" row ("both words (each by its rule) or the joined form; the joined form is ... never fuzzy").

What is wrong: when one half of a pair is a stop word, `pair` is `undefined`, and the joined form is pushed as a plain word string. It is then matched by the word rule: prefix, and fuzzy above four letters. The table says the joined form of a hyphenated word is never fuzzy, and that the remaining word is also searched. Examples:

- `pay-as-you-earn`, the name SARS gives PAYE, becomes `payas AND youearn`. `payas` fuzzy-matches `pays`, so the 19 results start with "Every month, if the company pays anyone a salary" and "Overpayment scam". `pay as you earn` puts the PAYE glossary entry first.
- `in-house` becomes `inhouse` and finds 0 results.

Pass 4 noted that `all-in` and `bo-op` are "the precise reading", but the code does not match the table for them either.

How to reproduce: `runSearchCounted(en.index, 'pay-as-you-earn', 'en', {}, BASE)`.

Acceptance: the table states the rule for a hyphenated pair with a stop-word half, and the code follows it. That means the remaining word by its rule, or the joined form never fuzzy. `pay-as-you-earn` finds the PAYE glossary entry in the top 3, with a real-index row.

### minor: a finished query is still treated as "being typed": trailing space is trimmed, and Enter and `/search/?q=` prefix-match the last term

File: `src/scripts/search-ui.ts:224` and `:116` (`search(q)` and `enterCurrent` trim), `src/scripts/search-page.ts:81` and `:93`, `src/lib/search-client.ts:277`
Acceptance item: the table's definition of "last": "a term followed by more text is finished".

What is wrong: `runSearchCounted` decides `typing` from the last character of the query, but every caller trims the query first. So a trailing space never marks a term as finished. A query submitted with Enter, or loaded from `/search/?q=`, is treated as still being typed. `R1` (or `R1 ` with a space) prefix-matches `R10,000`, `R146` and `R1,400,000`, and the first result, which Enter opens, is the R146 glossary entry. The table's own example says "a finished `R1` must not match `R10`". It holds only when more words follow.

How to reproduce: `runSearchCounted(en.index, 'R1', ...)` and `'R1 '` both give 49 results with "R146" first.

Acceptance: pass the untrimmed text to the client, or a `typing` flag. The dialog's live search passes `typing: true` only when the field ends inside a word. Enter and the search page pass `typing: false`. A dom test checks that Enter on `R1` does not open the R146 entry.

### minor: the "Number, year" and "Single letter" rows are not tested on the real indexes

File: `tests/unit/search/index.test.ts:201` (`page 2`, `every: '2'`, checked with `startsWith`) and `:84-103` (`term.includes(number)`)
Acceptance item: `docs/design-system.md` says each row is "tested row by row on both real indexes"; brief "Tests".

What is wrong: both checks on `page 2` pass when `2` prefix-matches `20` or `2026`, because they use `startsWith` and `includes`. A mutation that prefix-matches bare numbers while last survives every real-index test. Only the `matchRule` unit cases catch it. No row checks the single-letter rule on a real index, and there is no Afrikaans number or year row.

Acceptance: real-index rows that fail if a bare number or a single letter is prefix-matched. For example, every result of `page 2` holds the term `2` exactly. Add one Afrikaans number or year row.

### nit: the "drop a pending search on close" test passes without the fix it names

File: `tests/dom/search.test.ts:576-592`, `src/scripts/search-ui.ts:141`
Acceptance item: general quality (pass 4, minor 1).

What is wrong: removing `this.#sequence++` from `#onDialogClose` leaves every test green. `opened()` with an empty field calls `#showEmpty()`, which also increases the sequence. So the test checks `#showEmpty`, not the close handler. The behaviour is still right today, because both paths drop the old answer. The guard the comment describes is not what is tested.

Acceptance: either the test closes the dialog and lets the old answer arrive before it opens again (checking that nothing was rendered while closed), or the redundant guard and its comment go.

### nit: the table has no example of a query that mixes kinds

File: `docs/design-system.md:380-395`
Acceptance item: general quality.

What is wrong: the table describes single terms. Readers mostly type several kinds together: `Companies Act 71 of 2008`, `tax year 2026/27`, `ITR 14 deadline`, `VAT rate 15%`. In these, a word before a number becomes a code pair (`act 71`, `year 2026`, `rate 15`). That is harmless today because those joined terms are not in the index, so the pair falls back to both words. It is easy to miss when a later change adds an alias (see major 1).

Acceptance: one sentence and one real-index row for a mixed query, such as `Companies Act 71 of 2008`, which finds "Legislation this toolkit relies on".
