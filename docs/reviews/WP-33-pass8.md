# WP-33 review pass 8 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 7.
- **Date:** 6 October 2026
- **Commit reviewed:** `f1110b0` ("docs(search): write down document weights, see all and enter for review pass 7"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b f1110b0`, the whole package and not only the fixes: 48 files, +8742 / -69. The pass 7 fixes are `cf73578` and `f1110b0`.

## Verdict

**Not clean: 0 blockers, 1 major, 0 minors, 1 nit.**

The two-pass count goes back to zero. Pass 7 was clean, but the fix for its minor 1 (`cf73578`, the document weight for pages about the guide) introduced a regression: those pages can no longer be found by their own titles. That is the major below.

The other four pass 7 fixes are correct, and I checked each in the code, in the tests and with a mutation:

- **Enter after a failed load of the results code** submits to `/search/?q=` (`src/scripts/search.ts:221-233`), also when an early Enter was waiting for that load.
- **"See all" carries `typed=1`** when the list was found while the last word was being typed (`src/scripts/search-ui.ts:383`). The search page reads it (`typedFrom`, `src/scripts/search-page.ts:95-97`) on load and on `popstate`, and drops it for a search submitted on the page. The e2e test "VAT26, then See all" passes in chromium and mobile: VAT264 is first and the count equals the promised number.
- **The all-words count** shows in the dialog and on the search page (`countStatus`, `src/scripts/search-render.ts:122-131`).
- **An arrow-highlighted option wins on Enter**, also in an older list (`src/scripts/search-ui.ts:171-183`). Typing clears the highlight (`#onInput`, `:112`), so Enter after typing still waits for the new list.

The two pass 6 rules stand. Enter acts on what the reader sees: `SAPS 60` and `VAT26` open SAPS 601 and VAT264. All-words results come first, then any-word results: `PAYE deadline`, `EMP201 deadline`, `UIF deadline`, `ITR14 deadline`, `EMP201 sperdatum` and `ITR14 sperdatum` now open the topic's glossary entry first.

## Gate results

I re-ran all of these myself on `f1110b0`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 8.6s using pnpm v11.22.0").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "0 errors".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1210 passed (1210)".
  - Vitest content: "Test Files 1 passed (1)", "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 18.4 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 12.3 KB gzip (shared chunks counted once)."
  - `dist:budget`: "index af.f2f07f0d1b.json: 801.0 KB raw, 181.9 KB gzip" and "index en.4660692f6f.json: 738.1 KB raw, 165.2 KB gzip".
- Playwright `chromium`, `mobile` and `nojs`, default reporters: **553 passed, 85 skipped, 0 failed** (7.4 min, exit 0). The failure list is empty.
  - The first run on `PW_PORT=4741` did not start, because another session's `astro preview` already used that port ("http://127.0.0.1:4741/business-toolkit/ is already used"). I re-ran on `PW_PORT=4767` with the same browsers path.
- `pnpm test:a11y` (same environment, port 4767): **196 passed** (8.5 min, exit 0).
- **WebKit was not run.** It is not installed in this environment.
- **File ownership and rules.**
  - The added lines under `src/` have no `href="/` literals, no `localStorage`, no `innerHTML` and no literal colours.
  - Outside `docs/`, `scripts/`, `src/` and `tests/`, the diff touches only `.gitignore`, `package.json` and `vitest.config.ts`.

## My own checks

- **Real queries.** I built both indexes in memory, the way `tests/unit/search/index.test.ts` does, and ran queries through `runSearchCounted`. I also rebuilt the dialog's visible list: `groupResults` over the client's default 30 results, at most 3 per section. That list is what the reader sees and what Enter opens.
  - **Ordinary queries are right in both languages.** English: `register for VAT`, `turnover tax`, `home office`, `POPIA`, `invoice template`, `VAT 15%`, `R1m`, `tax year 2026/27`, `CIPC annual return`, `provisional tax deadline`, `when is EMP201 due`, `SAPS 601`, `SAPS 60` (typed). Afrikaans: `registreer vir BTW`, `omsetbelasting`, `faktuur sjabloon`, `BTW 15%`, `tuiskantoor`, `maatskappy registreer`, `voorlopige belasting sperdatum`.
  - **Queries for the pages about the guide** are the major below. I compared each one with `961e037`, the commit pass 7 reviewed. To do that, I put back the three files that `cf73578` changed in ranking (`src/lib/search-client.ts`, `src/lib/search/options.ts` and `scripts/search/entries.ts`), ran the queries, and restored the files.
- **Keyboard, traced against the code and the dom tests.** These sequences behave correctly:
  - Enter with the list on screen;
  - Enter within the debounce;
  - Enter while the index loads;
  - Enter before the results code loads;
  - Enter after the results code failed to load (it submits);
  - Enter after the index failed to load (the first Enter stays on the failed state, as pass 4 decided, and the next Enter submits);
  - arrows then Enter, also on a stale list;
  - Escape, the close button or the backdrop while an Enter waits;
  - re-opening with and without text.
- **Mutations.** For each change below, I edited my worktree, ran `tests/unit/search` and `tests/dom/search.test.ts` (259 tests), and then restored the file. Nothing was committed, and `git status` is clean.

  | Change | Result |
  | --- | --- |
  | Pages about the guide stay with the all-words results (no demotion) | killed (9 tests) |
  | "See all" never adds `typed=1` | killed (1) |
  | The search page ignores `typed=1` | killed (1) |
  | No submit after the results code failed to load for an early Enter | killed (1) |
  | A highlighted option no longer wins on a stale list | killed (1) |
  | The "match every word" count never shows | killed (1) |

  No test fails when the about-the-guide pages are buried for a query that asks for them (see the major).

## Findings

### major: the AI disclosure page and the changelog can no longer be found by their own titles

File: `src/lib/search/options.ts:56-59` (`DOC_WEIGHT`: a quarter for the whole of `start/how-this-was-made` and `start/what-has-changed`); `src/lib/search-client.ts:359-362` (`aboutGuide`: every all-words hit on those pages is moved down among the any-word results); `docs/design-system.md:418-422`
Acceptance item: build plan A7 (search finds what the reader asks for); D5 and ADR 0006 (the AI disclosure and how to check the facts must be easy to reach); the task for this pass ("check the about the guide rule does not hide those pages when a reader is actually looking for them").

What is wrong: the rule applies to every query, including queries that ask for these pages. Each page gets two penalties. Its weight is a quarter, and when it matches every word it still drops below all other all-words results, however weak they are. So a reader who types the title of the page gets something else, and Enter opens an unrelated result. The table compares the dialog's list at `961e037` (before the fix) with `f1110b0`:

| Query | At `961e037`: position in the dialog, Enter opens | At `f1110b0`: position in the dialog, Enter opens |
| --- | --- | --- |
| `how this was made` (en) | 1st, "How it was made" | 6th, glossary "POP" |
| `what has changed` (en) | 1st, "What has changed" | 13th, "What changes the moment you have a company" |
| `what changed` (en) | 1st | not in the dialog (69th of 93), "PDF" |
| `AI generated` / `generated by AI` (en) | 1st, "This toolkit was generated by AI" | 8th, "Ownership of what the AI makes" |
| `how to check it` (en) | 1st, "How to check anything in this toolkit" | not in the dialog (127th), "Other things to check" (vehicles) |
| `verified` (en) | 1st, "Not verified" | 5th, "How to get the BRNC" |
| `check the facts` (en) | 1st | not in the dialog (14th overall), "Licence" |
| `hoe dit gemaak is` (af) | 4th | not in the dialog (20th overall) |
| `wat het verander` (af) | 1st, "Wat het verander" | not in the dialog (84th of 108), "Wat verander sodra jy ’n maatskappy het" |
| `regstellings` (af) | 1st, "Lys van regstellings" | 5th, "Deel 5: die kritiekopdrag" |
| `KI gegenereer` (af) | 1st, "Hierdie gereedskapstel is deur KI gegenereer" | 12th, "Eienaarskap van wat die KI maak" |
| `deur KI gegenereer` (af) | 1st | 6th |

`corrections`, `corrections log`, `lys van regstellings`, `known limitations`, `when to pay a human` and `verified against official sources` still open the right section. In those queries no other page matches every word, so nothing pushes the page down. The all-words count also leaves these pages out: `how this was made` says "(7 match every word)", and the page itself is not one of the 7 (nit below).

Who hits it and how often:

- Every content page carries the "AI-generated" notice. A reader who wants to know how far to trust the guide types "AI", "how this was made", "verified" or "check the facts". An Afrikaans reader types "KI gegenereer" or "hoe dit gemaak is".
- A returning reader types "what has changed" or "wat het verander" to see what is new since the last visit.
- These are the page and section titles, in both languages. In 5 of the 12 queries above the page is not in the dialog's list at all, and in every one Enter opens an unrelated result.
- D5 and ADR 0006 make this page the guide's answer to "can I rely on this". Search was the place where it was always found first, and the fix for a ranking minor took that away.

How to reproduce: `runSearchCounted(en.index, 'what has changed', 'en', { limit: 5000, typing: false }, BASE)`. The first result is `core/running-a-pty-ltd/#what-changes-the-moment-you-have-a-company`, and `start/what-has-changed/` is 20th. On the Afrikaans index, `'wat het verander'` puts `af/start/what-has-changed/` 84th of 108.

Suggested fix: make the demotion depend on the query, not on the page alone. For example, demote an about-the-guide all-words hit only when it is weak next to the best other all-words hit (pass 7's "under a quarter of it"). Or demote it only when its match is in the body and not in its title or heading. Drop the blanket quarter weight, or keep it only for body text. Then `PAYE deadline` still opens the PAYE entry, and the page title still finds the page.

Acceptance:

- Add real-index rows to the query-kind table. `how this was made`, `what has changed` and `AI generated` (en), and `hoe dit gemaak is`, `wat het verander` and `KI gegenereer` (af), each open a section of their page first.
- The pass 7 rows still hold: `PAYE deadline`, `EMP201 deadline`, `UIF deadline`, `ITR14 deadline`, `EMP201 sperdatum` and `ITR14 sperdatum` open the topic's glossary entry first.
- `docs/design-system.md` states the narrower rule.

### nit: the "match every word" count leaves out about-the-guide pages that match every word

File: `src/lib/search-client.ts:373` (`if (rank < all.length) matchedAll++`, where `all` excludes `passing`)
Acceptance item: general quality.

What is wrong: an about-the-guide result that matches every word is counted as an any-word result. `how this was made` says "69 results (7 match every word)", and the page itself is not one of the 7. `corrections` says "6 results" with no count, although all six results contain the word. The number is a little lower than the words say. This probably goes away with the fix for the major. If not, call these "the best matches" in the string, or count them.
