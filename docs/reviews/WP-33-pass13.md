# WP-33 review pass 13 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 12.
- **Date:** 7 October 2026
- **Commit reviewed:** `7a27839` ("docs(search): describe the typed-word, typo heading and written-word rules for review pass 12"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b..7a27839`, the whole package. I looked hardest at the pass 12 fixes, `git diff c035744..7a27839`: `4032bcb` (code, tests and `scripts/search-typo-sweep.ts`) and `7a27839` (docs).

## Verdict

**Not clean: 0 blockers, 1 major, 1 minor, 1 nit.**

The pass 12 findings are fixed as asked, and I found no regression from the fixes:

- Major: `my belasting`, `die belasting`, `jou belasting`, `van belasting`, `wat is belasting` and `wat is die belasting` (typed) open Tax and SARS ("Voorlopige belasting"). In the built site's dialog, `my belasting` lists three Tax and SARS options first, and Enter goes to `/business-toolkit/af/core/tax-and-sars/#provisional-tax`. `wat het vera`, `die kwot`, `die hoof`, `die woordel` and `die privaath` still lead with their one-word title while typed.
- Minor 1: `cipc anual return`, `cipc jarlikse opgawe` and `voorlopige belastnig` open the section asked for.
- Minor 2: `registr for vat` opens Tax and SARS. `register a compani` (finished) opens the Register page.

The major is not new. Since the first search commits, `register my business` and `registreer my besigheid` open a vehicle dealer section. In Afrikaans, the Register page is result 83 and not in the dialog. The pass 12 commit gives the same results.

## Gate results

I ran all of these myself on `7a27839`. The logs are in the shared scratchpad under `wp33-review13-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0 ("Done in 4.3s using pnpm v11.22.0").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "- 0 errors".
  - Vitest unit and dom: "Test Files  35 passed (35)", "Tests  1292 passed (1292)".
  - Content drift: "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built in 4.10s".
  - `search:build`: "en.2a2c9793c7.json: 945 entries, 739.4 KB raw, 165.6 KB gzip" and "af.39208bcc98.json: 951 entries, 802.5 KB raw, 182.3 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 19.2 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 13.1 KB gzip (shared chunks counted once)."
  - These numbers match `docs/testing.md` (19.2 KB, 13.1 KB, 165.6 / 182.3 KB).
- `pnpm search:typos`: exit 0, 17.9 s: "search:typos: of 8192 one-letter typos, 7259 open the correct spelling's first result and 7670 one of its first three."
  - I copied the script into a scratch export of `c035744` (pass 11 code) and ran it there: "of 8192 one-letter typos, 7210 open the correct spelling's first result and 7664 one of its first three." So the ADR's "7210 ... at pass 11, 7259 after these fixes" is true.
- Coverage of `src/lib/search-client.ts` (search unit and dom tests, 341 tests): 98.93% statements, 97.18% branches, 100% functions, 99.56% lines.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4797`, default reporters): **555 passed, 85 skipped** (5.3 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4797/business-toolkit/` and "Running 640 tests using 2 workers", so this run tested this build on my port.
  - The log has no `✘` line (`grep -c ✘` gives 0), so the failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4797`, server on `Local http://127.0.0.1:4797/business-toolkit/`, "Running 196 tests using 2 workers"): **196 passed** (3.8 min, exit 0). The log has no `✘` line.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.**
  - Since `c035744`, only `src/lib/search-client.ts`, `scripts/search-typo-sweep.ts` and `package.json` changed under code.
  - They add no `href="/` literal, no `localStorage`, no `innerHTML`, no literal colour and no UI string.
  - The sweep script makes no network request.

## My own checks

### How I ran queries

I built both indexes in memory, the way `tests/unit/search/index.test.ts` does, and ran each query through `runSearchCounted`, typed and finished. To compare, I ran the same scripts against a scratch export of `c035744` (the pass 12 commit, whose code is pass 11's), never against the worktree. I checked the major and the minor in the built site too. I started the preview on port 4798 (the log said `Local http://127.0.0.1:4798/business-toolkit/`), opened the dialog with `/`, typed the query, read the options and pressed Enter.

### The pass 12 fixes

- **Stop word, then a whole word.** `lastIsWord` (`src/lib/search-client.ts:532-539`) searches the last part with no prefix and no fuzzy. `typed` (`:269`) is now `words.length > 1 || (tokens > 1 && !lastIsWord)`. I traced every prefix of these phrases while typed: `my receipt`, `a quotation`, `the glossary`, `my invoice`, `die woordelys`, `my kwitansie`, `die kwotasie`, `die hoofkontrolelys`, `die faktuur`, `die privaatheidskennisgewing` and `wat het verander`. Each leads with its title once the last word is four letters long and not a whole word, as before. `die belasting` opens Tax and SARS. `die belast` still opens the tax invoice template while typed, as the reader may be typing "belastingfaktuur". I do not report that.
- **Typo fallback for the heading lift.** `misspelt` (`:559`) is `true` only when no all-words result holds the words as written. So a query spelt right never takes the fuzzy branch. `market stall` still opens the retail page.
- **Short endings.** `holdsAsWritten` (`:335-361`) counts a longer word as written only for `s`, `d`, `ed`, or `es` after s, x, z, ch or sh. The last word while typed may still begin any word. A code part counts as written when its words begin a term, and that is harmless because the code words are never fuzzy.

### Common queries, before and after the fixes

I compared the first three results of 74 queries a first-time owner would type, typed and finished, at `c035744` and at `7a27839` (148 lists). Only 5 changed:

- `my belasting` and `die belasting` (typed): fixed, as above.
- `btw registrasie` (finished): it now opens "BTW: waarskynlik nog nie" before the tax invoice template, which is better.
- `besigheidslisensie` and `inkomstebelasting`: only the third option changed.

The queries were SARS, VAT, BTW, invoice, faktuur, UIF, CIPC, register, registreer, licence, lisensie, tax and belasting, each alone and in phrases. The phrases included `how do I register`, `hoe registreer ek`, `my invoice`, `die faktuur`, `register for vat`, `registreer vir btw`, `register with sars`, `registreer by sars`, `do i need a licence`, `het ek n lisensie nodig` and `cipc annual return`.

- `how do I register` and `hoe registreer ek` open the Register page's "Do I need to register a company?". `my invoice` opens the invoice template and `die faktuur` the faktuur template. `register for vat` and `registreer vir btw` open Tax and SARS.

I also checked every typed prefix of those 74 queries (1132 lists). Only `my belas`, `my belasting`, `die belas` and `die belasting` (typed) changed their first option, and all four for the better. Finished prefixes changed more (62, such as `vat regis` and `invoice templ`). Only the search page reads a query as finished, and a reader does not submit half a word there, so I do not report them.

### One-letter typos of those queries

I made every dropped letter, doubled letter and swap in each word of five letters or more (3602 typo queries, typed and finished). A typo query counts as good when its first option is one of the first three options of the correct spelling, in the same build. 3107 were good at `c035744` and 3132 are good at `7a27839`. 87 gained and 62 lost.

- 56 of the 62 losses are typos of `register my business`. The correct spelling itself leads with vehicle dealer sections (the major), so these losses only swap one wrong first option for another.
- `registree` and `hoe registree ek` (Afrikaans, finished) now open the glossary's "Registered name" instead of the Register page. Typed, they are a prefix of `registreer` and still open the Register page. Only the search page reads them as finished, so I do not report this.

### The typo sweep

`scripts/search-typo-sweep.ts` measures what `docs/testing.md` and the ADR say it does. Its queries are every page title and glossary term in both languages. It makes the one-letter typos of each word of five letters or more, typed and finished. It counts typos whose first result is the correct spelling's first result, or one of its first three, in the same build. I reproduced both numbers above. Two limits are worth knowing, but neither is a defect for a regression count:

- The baseline is the correct spelling in the same build. So a change that makes the correct spelling worse, and its typos with it, does not lower the score.
- The sweep has dropped letters and swaps only. See the nit.

## Findings

### major 1: "register my business" opens a vehicle dealer section; in Afrikaans the Register page is not offered

File: `src/lib/search-client.ts:540-550` (`titled`: the title rule needs every query word in the title) and `:551-565` (the heading lift), with `scripts/search/entries.ts` (`answerEntries`, `:360-390`: the quick answer "Do I need to register a company?" holds only its question and the page title).

Acceptance item: general quality (ranking), and the severity rule "gives them a wrong or incomplete path". Registering is the first thing a new owner looks up, and the guide's answer is the Register page ("Register: what you actually need", quick answer "Do I need to register a company?").

What is wrong: a query that adds "my business" to "register" loses the Register page. "business" is not in the Register page's titles or in its quick answer. So neither the title rule nor the heading lift picks the page. The vehicle dealer's headings hold both words ("VAT: register earlier than other businesses"), so they are lifted first.

- `register my business`, `register a business`, `register business` and `how do i register my business` (en, typed): the options are "VAT: register earlier than other businesses", "Register (noun)" and "How to register" (all Vehicle dealer). Then come "Traffic register number" (Vehicles), "POPIA: register your information officer" and "Register: what you actually need". Enter opens `business-types/vehicle-dealer/#vat-register-earlier-than-other-businesses`. Finished, "Traffic register number" is first.
- `registreer my besigheid`, `registreer besigheid` and `hoe registreer ek my besigheid` (af, typed and finished): the options are "Laag 2: voertuie op die besigheid se naam registreer", "BTW: registreer vroeër as ander besighede" and "Hoe om te registreer" (all Voertuighandelaar). Then come "POPIA: registreer jou inligtingsbeampte", "Besigheidsbankrekening" and "Roete 1: registreer dit teen jou eie ID" (Voertuie). `af/core/register/` is result **83**, so it is not in the dialog at all, and neither is its quick answer. Enter opens `af/business-types/vehicle-dealer/#layer-2-getting-vehicles-registered-to-the-business`.
- Without "business", the query is right: `how do I register` and `hoe registreer ek` open "Do I need to register a company?". `register my company` and `registreer n maatskappy` are right too. So the reader who says what they mean in the most natural words gets the worst list.
- The results are the same at `c035744`, so the pass 12 fixes did not cause this. No earlier pass or test covers this query.

How to reproduce:

- In the unit index: `runSearchCounted(en.index, 'register my business', 'en', { typing: true }, BASE).results[0].href` is `/business-toolkit/business-types/vehicle-dealer/#vat-register-earlier-than-other-businesses`. With `af.index` and `'registreer my besigheid'`, the first result is `.../af/business-types/vehicle-dealer/#layer-2-getting-vehicles-registered-to-the-business`. `/business-toolkit/af/core/register/` is at index 82 of the results with `limit: 500`.
- In the built site (preview on 4798): open `/business-toolkit/`, press `/`, type `register my business`. The nine options and the Enter target are as listed above. On `/business-toolkit/af/`, `registreer my besigheid` gives the Afrikaans list above, and Enter goes to the vehicle dealer page.

Suggested fix: make the Register page answer "register" + "business" without special-casing the query. These are options, not a single tested fix:

- Give each quick-answer entry its target page's lead paragraph (or description) as its text in `answerEntries`. The Register page's lead holds "business" ("besigheid"), so the quick answer "Do I need to register a company?" matches every word and carries the answer weight. Or:
- Let the title rule count a page when every query word is in its title or its quick-answer question, plus "business"/"besigheid" as words that do not count for the title rule, as `has` and `have` do not (`TITLE_STOP_WORDS`). In this guide "my business" says nothing about which page is meant. Check that `business licence` and `business bank account` still open their sections.

Add rows: `register my business` (en) and `registreer my besigheid` (af), typed and finished, open `core/register/` first, and `business-types/vehicle-dealer` is not first.

### minor 1: "tax" opens the "Dividends tax" glossary entry

File: `src/lib/search-client.ts:540-595` (ranking within the all-words results; the glossary weight).

Acceptance item: general quality (ranking).

What is wrong: `tax` and `my tax` (en, typed and finished) list the glossary entries "Dividends tax", "Turnover tax" and "Tax threshold" first. Enter opens `glossary/#dividends-tax`, which applies only to companies paying dividends. The Tax and SARS options ("Provisional tax", "How do I pay less tax legally?", "Route 3: turnover tax") are 4th to 6th, on the first screen. The Afrikaans `belasting` opens Tax and SARS ("Voorlopige belasting"), so the two languages differ. The results are the same at `c035744`. The reader still sees Tax and SARS without scrolling, so this is minor.

How to reproduce: `runSearchCounted(en.index, 'tax', 'en', { typing: true }, BASE).results[0].href` is `/business-toolkit/glossary/#dividends-tax`, and `core/tax-and-sars/` (the page's first entry) is 9th. In the built site's dialog, `tax` shows the three glossary entries first under "Look it up", and Enter goes to `/business-toolkit/glossary/#dividends-tax`.

Suggested fix: a one-word query that is a glossary entry's whole term opens that entry (`VAT`, `SARS`, `UIF`). One that is only part of several terms ("Dividends tax", "Turnover tax") should not put a glossary entry before the section that explains it. For example, give a glossary entry the glossary weight only when the query covers its whole term, as the title rule does for pages. Add a row: `tax` opens a `core/tax-and-sars/` entry.

### nit 1: the sweep's header says "once per position", and it leaves out common typo kinds

File: `scripts/search-typo-sweep.ts:3-4` and `:14-23`.

The header says each word "is misspelt once per position". `typos()` starts at the second letter, as its own comment says ("after its first letter"). It also makes only dropped letters and swaps. A swap is two edits, so MiniSearch's fuzzy match (one edit for words of up to nine letters) rarely finds it. A doubled letter (`registerr`) or a wrong letter (`regoster`) is one edit, and both are common typos, but the sweep does not count them.

How to reproduce: `typos('register')` holds 13 strings, all drops and swaps after the `r`, and none of them is `registerr` or `rregister`.

Suggested fix: say "after the first letter" in the header, and add a doubled letter and a neighbouring-key substitution, so that the count follows typos that the fuzzy match can find. If the counts change, update the numbers in the ADR.
