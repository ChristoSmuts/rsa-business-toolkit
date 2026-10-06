# WP-33 review pass 7 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 6.
- **Date:** 6 October 2026
- **Commit reviewed:** `961e037` ("docs(search): update the document page budget after the early enter fix"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b 961e037`, the whole package and not only the fixes: 47 files, +8362 / -69. The pass 6 fixes are `2e58714`, `d209dda`, `e269e17` and `961e037`.

## Verdict

**Clean: 0 blockers, 0 majors, 3 minors, 2 nits.**

This is the first clean pass in the two-pass count. The next pass must review the whole diff again.

Both pass 6 majors are fixed as the new rules describe them. I checked each on the real indexes and in the code:

- **Enter acts on what the reader sees.** With the list for the field's text on screen, Enter opens the active option or the first one, with no new search (`src/scripts/search-ui.ts:161-176`). The dialog lists `SAPS 60`, `VAT26`, `EMP20` (en) and `SAPS60` (af) with `SAPS 601`, `VAT264`, `EMP201` and `SAPS 601` first, and Enter opens those options. The e2e test covers `SAPS 60` and `VAT26`. Enter waits for a search only when the list on screen belongs to older text. It is cancelled when the dialog closes or the text changes before the answer.
- **All words first, then any word.** `EMP201 deadline`, `ITR14 deadline`, `EMP201 sperdatum` and `ITR14 sperdatum` now list the code's glossary entry second, after the one page that names both words. `VAT246`, `EMP502`, `zzzzqq 1` and `R123,456` still find nothing.
- The pass 6 minors and nits are also addressed:
  - `VAT 15%` and `BTW 15%` put the VAT glossary entry first.
  - `R1m`, `R10m`, `R2.3m` and `R2,3m` work in both languages.
  - `2026-27` is the same as `2026/27`, and `2026/03` stays as written.
  - A match on the millions alias marks the amount and its word.
  - The 404 suggestions search a finished query, and a dom test now checks it.

For common two- and three-word questions, "all words, then any word" does not bury the answer. The all-words results are usually the right ones. Examples: `register for VAT`, `turnover tax`, `home office deduction`, `POPIA information officer`, `cipc annual return`, `business bank account`, `do I need a licence to sell food`, `what is a tax invoice`, `invoice template` (en); `moet ek vir BTW registreer`, `BTW drempel`, `BTW-registrasie`, `faktuur sjabloon`, `maatskappy registreer`, `omsetbelasting` (af). Typos still reach their target: `privisional tax` and `turnovr tax`. One class of query puts a weak page first: a topic word plus "deadline" or "sperdatum". That is minor 1. The right entry is second there, on the first screen, in both languages.

## Gate results

I re-ran all of these myself on `961e037`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 10s using pnpm v11.22.0").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "0 errors, 0 warnings, 0 hints".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1200 passed (1200)".
  - Vitest content: "Test Files 1 passed (1)", "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 18.2 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 12.1 KB gzip (shared chunks counted once)."
  - `dist:budget`: "index af.faed23efc0.json: 800.9 KB raw, 181.9 KB gzip" and "index en.873ecd57d1.json: 738.0 KB raw, 165.2 KB gzip". These match `docs/testing.md` and `docs/design-system.md`.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4711`, default reporters): **551 passed, 85 skipped, 0 failed** (10.1 min, exit 0). The failure list is empty.
- `pnpm test:a11y` (same environment): **196 passed** (9.0 min, exit 0).
- Coverage (`vitest run --project unit --project dom --coverage`):
  - `src/lib/search-client.ts`: 99.43% statements, 97.69% branches, 100% functions, 99.34% lines. That is above the brief's 90%.
  - `src/lib/search/options.ts`: 100 / 94.25 / 100 / 100.
  - The command exits 1 on the `src/lib/content/**` function threshold (88% against 100%). That is outside this package, and earlier passes saw the same.
- **WebKit was not run.** It is not installed in this environment.
- **File ownership and rules.**
  - The added lines under `src/` have no `href="/` literals, no `localStorage`, no `innerHTML` and no literal colours.
  - Outside `docs/`, `scripts/`, `src/` and `tests/`, the diff touches only `.gitignore`, `package.json` and `vitest.config.ts`.

## My own checks

- **Real queries.** I built both indexes in memory, the way `tests/unit/search/index.test.ts` does. I ran about 80 hand-picked queries through `runSearchCounted`, both as typed and as finished. They came from the guide's text: codes, partial codes, amounts and their shorthand, tax years, Act names, deadlines, Afrikaans compounds, typos and questions.
- **Generated queries.** I also ran 1478 generated queries: every glossary term of one or two words, combined with "deadline", "due date", "form", "penalty", "register", "cost" or "when" in English, and "sperdatum", "vorm", "boete", "registreer", "koste" or "wanneer" in Afrikaans. In 90 of them, a "How this was made" page ranks first while its score is below a quarter of the best result's score (minor 1).
- **Keyboard, traced against the code and the dom tests.** These sequences behave correctly:
  - typing then Enter, after the list arrived and within the debounce;
  - Enter while the index loads;
  - Enter before the results code loads (`e269e17`);
  - Enter twice;
  - arrows then Enter;
  - Escape, the close button or the backdrop while an Enter waits;
  - re-opening with and without text;
  - a failed index load after Enter.

  The two sequences that go wrong are minor 2 (Enter after the results code failed to load) and nit 2 (arrows into an older list).
- **Mutations.** For each change below, I edited my worktree, ran `tests/unit/search` and `tests/dom/search.test.ts` (249 tests), and then restored the file. Nothing was committed, and `git status` is clean.

  | Change | Result |
  | --- | --- |
  | The any-word results only when all-words finds nothing (the old rule) | killed (7 tests) |
  | `knownCode` always false (every spaced pair merged by score) | killed (9) |
  | `knownCode` always true (every spaced pair joined first) | killed (2) |
  | Tax year without the "next year" check | killed (1) |
  | Enter always searches again, even with the list on screen | killed (5) |
  | The early-Enter submit never waits for the results code | killed (1) |
  | No millions highlight | killed (1) |
  | No `R1m` shorthand | killed (4) |
  | `R2.3m`: the amount and its `m` not joined | killed (3) |
  | `enterCurrent` ignores a text change while it waits | killed (1) |
  | The any-word results keep lone numbers and single letters | killed (2) |
  | `matchedAll` counts every result | killed (24) |

## Findings

### minor: a weak page that names both words ranks above the topic's own entry, so Enter opens the corrections log

File: `src/lib/search-client.ts:347-356` (all-words results always before any-word results, whatever their scores); `tests/unit/search/index.test.ts:437`, `:444`, `:451` and `:458` (the table rows pin `start/how-this-was-made/#corrections-log` as the first result)
Acceptance item: general quality (ranking). This is not a major, because the right entry is second and on the first screen.

What is wrong: when one meta page happens to hold both words, it comes before entries with 4 to 10 times its score. The corrections log, "Verified against official sources" and the sources register mention many topics next to "deadline". Examples:

| Query | First result (score) | The answer (position, score) |
| --- | --- | --- |
| `PAYE deadline` (en) | Corrections log (21) | PAYE glossary entry (2nd, 94) |
| `EMP201 deadline` (en) | Corrections log (20) | EMP201 glossary entry (2nd, 94) |
| `UIF deadline` (en) | Corrections log (20) | UIF glossary entry (2nd, 82) |
| `EMP201 dead` (en, while typed) | Corrections log (13) | EMP201 glossary entry (2nd, 94) |
| `sell second hand cars` (en) | Corrections log (42) | "If you sell second-hand goods" (2nd, 245) |
| `EMP201 sperdatum` (af) | Lys van regstellings (20) | EMP201 glossary entry (2nd, 95) |
| `ITR14 sperdatum` (af) | Lys van regstellings (20) | ITR14 glossary entry (2nd, 87) |
| `POPIA deadline` (en) | Verified against official sources (15) | 3rd |

Across the 1478 generated queries (see "My own checks"), a weak first result like this occurs 380 times, and 90 of those are a "How this was made" page. A reader who types such a query and presses Enter gets the corrections log, which does not answer the question. This is the cost of a strict "all words first". The list shows the answer one row down, so I rate it minor.

Suggested fix: count an all-words result as an any-word result when its score is far below the best any-word score (for example, under a quarter of it). Or give the corrections log and the verification pages a low entry weight (`w`).

Acceptance: `PAYE deadline`, `EMP201 deadline`, `sell second hand cars` and `EMP201 sperdatum` open the topic's own entry or a section that answers, on Enter. `VAT246` and `zzzzqq 1` still find nothing. If the strict order is kept on purpose, the table in `docs/design-system.md` says that a page naming both words passingly comes first.

### minor: Enter does nothing after the results code failed to load

File: `src/scripts/search.ts:211-222` (`#onSubmit` prevents the submit whenever `#uiReady` is false, then retries the import and swallows a second failure with `() => undefined`)
Acceptance item: brief step 3 (failed state "with a link to the contents page"); CLAUDE.md ("Every page must work without JavaScript", by extension a working fallback).

What is wrong: before `e269e17`, Enter in the failed dialog submitted to `/search/?q=`. That is a fresh page, which works even when the dialog's chunk is gone. Now every Enter is prevented. The import is retried, and when the retry also fails, nothing happens and nothing new is announced. The likeliest cause is the one the code's own comment names: a stale page after a deploy, where the old hashed chunk is gone. A retry cannot succeed then, so the reader's Enter is dead. The failed message and the contents link stay visible, so the reader is not stuck.

How to reproduce: in `tests/dom/search.test.ts`, make the `./search-ui` import reject (as in "shows the failed state when the results code cannot load"). Type text and dispatch `submit`: `defaultPrevented` is true, and no navigation follows.

Acceptance: once a load of the results code has failed (or the retry fails), Enter submits to `/search/?q=`, with a dom test.

### minor: "See all N results" for a partly typed code leads to a page that finds nothing

File: `src/scripts/search-ui.ts:360-364` (the link carries `q` only); `src/scripts/search-page.ts:156` (the page searches with `typing: false`)
Acceptance item: general quality; the status line and link promise a count ("See all 8 results on the search page").

What is wrong: the dialog's list is a typed search, and the search page reads the same text as finished. Because `PER_GROUP` is 3, the link appears even for short lists:

- `VAT26`: the dialog shows 7 of 8 and offers "See all 8 results". The page then says nothing was found.
- `EMP20`: "See all 11", and the page finds 0.
- `SAPS 60`: the page lists "When you sell a vehicle out" first, not `SAPS 601`.

The promised results are not there. This is less common than Enter, so it is minor.

Acceptance: the search page shows what the link promises for `VAT26` and `EMP20`. For example, the link carries the typed state, or the page reads a `q` that ends inside a code as typed. Add an e2e or dom test.

### nit: result counts are mostly any-word matches

File: `src/scripts/search-ui.ts:353-357`
Acceptance item: general quality.

What is wrong: the total now counts every any-word match. `business bank account` says "12 of 375 results shown" and offers "See all 375 results", although 24 results match all three words. `register for VAT` gives 200 results, of which 49 match all words. This is not wrong, but the number says little. A count such as "24 match every word" would help, or a divider on the search page where the any-word results begin (`matchedAll` is already returned).

### nit: arrows into an older list, then Enter, opens a different result

File: `src/scripts/search-ui.ts:107` and `:161-166`
Acceptance item: general quality.

What is wrong: the reader types, then presses ArrowDown within the 120 ms debounce. `move()` then makes an option of the older list active. Enter sees that the text differs from `#shownQuery`, so it opens the first result of the new text, not the highlighted option. This needs a key press within 120 ms of typing, so it is rare. Either ignore arrows while the list is stale, or let an active option win.
