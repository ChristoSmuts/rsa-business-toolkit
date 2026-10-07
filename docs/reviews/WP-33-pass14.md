# WP-33 review pass 14 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 13.
- **Date:** 7 October 2026
- **Commit reviewed:** `0be1306` ("docs(search): document search best bets and the wider typo sweep, for review pass 13"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b..0be1306`, the whole package. I looked hardest at the pass 13 fixes, `git diff 9bfa6bb..0be1306`: `0109879` (best bets, quick answers with their page's lead, the wider typo sweep) and `0be1306` (docs).

## Verdict

**Not clean: 0 blockers, 1 major, 4 minors, 3 nits.**

The pass 13 findings are fixed as asked:

- Major: `register my business`, `register a business`, `register business`, `how do i register my business`, `registreer my besigheid`, `registreer besigheid` and `hoe registreer ek my besigheid` open the Register page, typed and finished. In English the ranking alone does it too.
- Minor 1: `tax` and `my tax` open Tax and SARS.
- Nit 1: the sweep now makes typos at the first letter, doubled letters and neighbouring-key letters.

Every best-bet target exists in both languages, and the build-time validation works. I found no regression from the best bets for the 227 common queries I compared.

The major is the pass 13 major again, with one more word. `register my own business`, `register a new business` and `registreer 'n nuwe besigheid` do not show the Register page in the dialog at all. Enter opens a vehicle registration section, "Registered name and trading names" (Adding new lines) or "Path 3" (How to use). `register my small business` opens the small business corporation tax rates. The best bet covers only the exact phrase (accepted), and the ranking half of the fix covers only "business" with no other word.

## Gate results

I ran all of these myself on `0be1306`. The logs are in the shared scratchpad under `wp33-review14-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0 ("Done in 2.5s using pnpm v11.22.0").
- `pnpm gate:fast` (`wp33-review14-gatefast.log`): exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "- 0 errors", "- 0 warnings", "- 0 hints".
  - Vitest unit and dom: "Test Files  36 passed (36)", "Tests  1310 passed (1310)".
  - Content drift: "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  34 passed (34)".
- `pnpm build` (`wp33-review14-build.log`): exit 0, "96 page(s) built in 3.16s".
  - `search:build`: "en.e8e60b5b5e.json: 945 entries, 743.8 KB raw, 166.1 KB gzip" and "af.1c086d579d.json: 951 entries, 806.6 KB raw, 183.1 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 19.5 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 13.3 KB gzip (shared chunks counted once)."
  - These match `docs/testing.md` and the ADR. `docs/design-system.md:502` still says "182 KB in Afrikaans" (nit 3).
- `pnpm search:typos` (`wp33-review14-typos.log`): exit 0, 50.3 s: "search:typos: of 30108 one-letter typos, 26940 open the correct spelling's first result and 29231 one of its first three."
  - I copied the new sweep script into a scratch export of `9bfa6bb` (pass 13 code, best bets removed from the call) and ran it there: "of 30108 one-letter typos, 27447 open the correct spelling's first result and 29242 one of its first three." So the ADR's "27447 and 29242 ... with them 26940 and 29231" is true.
  - The ADR says the first count drops because of the best bets. I ran the sweep on `0be1306` with the best bets off: "27450 ... and 29231". So the quick-answer lead costs nothing on the first count, and the best bets cost 510. The explanation is right.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4805`, default reporters, `wp33-review14-e2e.log`): **555 passed, 85 skipped** (4.6 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4805/business-toolkit/` and "Running 640 tests using 2 workers", so this run tested this build on my port.
  - The log has no `✘` line (`grep -c ✘` gives 0), so the failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4808`, `wp33-review14-a11y2.log`): **196 passed** (3.2 min, exit 0). The server was on `Local http://127.0.0.1:4808/business-toolkit/` and the log says "Running 196 tests using 2 workers". It has no `✘` line.
  - My first run (`wp33-review14-a11y.log`, port 4806) is not counted. It had "194 passed, 2 failed", but both failures were `ENOENT` on trace files under `test-results/`. My own probe run had started in the same worktree at the same time and cleared that folder. The axe checks of those two pages (`/search/` and `/sources/`, dark theme) pass in the rerun.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.**
  - Since `9bfa6bb`, only `src/lib/search-client.ts`, `src/lib/search/options.ts` and `src/lib/search/types.ts` changed under `src/`. They add no `href="/` literal, no `localStorage`, no `innerHTML`, no literal colour and no UI string.
  - The new `scripts/search/best-bets.ts` reads a local file only. The sweep makes no network request.
  - `INDEX_VERSION` went from 2 to 3, so a page with a cached old client refuses the new index rather than misreading it.

## My own checks

### How I ran queries

I built both indexes in memory, the way `tests/unit/search/index.test.ts` does, with the best bets resolved, and ran each query through `runSearchCounted`, typed and finished. To compare, I ran the same scripts against:

- a scratch export of `9bfa6bb` (pass 13 code), never against the worktree;
- `0be1306` with the best bets left out of the index (`serialiseIndex(lang, sections, entries)`), to see what the quick-answer lead does on its own.

I checked the major and minors 2 and 3 in the built site too. I added a temporary spec (deleted after the run, not committed) and ran it with `PW_PORT=4807` (the log said `Local http://127.0.0.1:4807/business-toolkit/`). It opens the page, presses `/`, types the query a key at a time, reads every option, then presses ArrowDown and Enter and reads the URL.

### Best bets

**Targets.** I read every target against the guide. Each is the page or section the guide itself sends a first-time owner to, in both languages, with one exception (minor 1, `annual return`). Some notes:

- `register for vat`, `vat registration` and `vat threshold` open "VAT: probably not yet", which holds the threshold, the 21-day rule and the voluntary choice. That is better than the quick answer the ranking gave before.
- `invoice` opens the non-VAT invoice template. That is the guide's own default (`03-tax-and-sars.md:180`).
- `pay myself` and `betaal myself` open "Paying yourself from a Pty Ltd". The guide has no other page on paying yourself, so this is right.
- `sole proprietor` and `eenmansaak` now open the Register section instead of the glossary. The section is the fuller answer.

**Afrikaans phrases.** All 30 are natural Afrikaans an owner would type. The one gap is spelling: Afrikaans writes `BTW-registrasie` and `BTW-drempel` with a hyphen, and the guide does so too (17 and 5 times, never spaced). The hyphenated form reads as one joined word, so it never matches the spaced phrase (minor 2).

**Validation.** `resolveBestBets` on edited in-memory copies of the file:

- a renamed anchor throws "best bet target core/tax-and-sars#vat-gone has no en entry" (and the same for `af`);
- an anchor on the wrong page throws "core/register#uif has no en entry";
- a phrase of stop words only throws "has only stop words";
- two Afrikaans phrases that read the same throw "read the same".

`scripts/build-search-index.ts` calls it for every language before writing, so `pnpm build` fails on any of these. The over-40 check runs after the loop and counts per language. The index client does not validate `bets` itself, but the index comes from the same build, so that is fine.

**Hijacks.** I checked every phrase, and every typed beginning of four letters or more, against what else it could mean. Only `annual return` takes a query that often means something else (minor 1). Some typed beginnings of other words show a best bet for a keystroke or two (nit 1).

### Quick answers with their page's lead

I compared the first three results of 227 queries (121 English, 106 Afrikaans), typed and finished (454 lists), at `9bfa6bb` and at `0be1306` with the best bets off. 24 lists changed (12 queries).

- Better: `vat number` now opens "Do I have to register for VAT?" (was the non-VAT invoice template). `besigheidsnaam` opens "My naam is reeds besluit, wat slaan ek oor?" (was the privacy notice's "Wie ons is").
- Neutral: `company` and `business name` swap two quick answers. `belasting` (with the best bets off) opens "Hoe betaal ek wettig minder belasting?" instead of a term. The best bet now opens Tax and SARS anyway.
- Worse: a quick answer whose question has nothing to do with the query rises because its page's lead holds the query words (minor 4).

So the lead does not drag quick answers above better results for most common queries. Where it does, the right result is still first or second.

### Common queries

Across the 227 queries, 57 of 454 lists changed their first result from `9bfa6bb` to `0be1306`. Every change is a best bet (or the lead, above). All the best-bet changes are better or the same:

- `checklist` opens the Master checklist, not the branding prompt.
- `liquor licence` and `dranklisensie` open "If you sell alcohol".
- `work from home` opens the Working from home page.
- `annual return` and `jaarlikse opgawe` are the exception (minor 1).

What I probed, typed and finished, in both languages:

- SARS, VAT, BTW, invoice, faktuur, UIF, CIPC, register, registreer, licence, lisensie, tax, belasting, company and maatskappy, each alone and in phrases;
- stop-word phrases (`my tax`, `die faktuur`, `the glossary`, `begin 'n besigheid`, `het ek n lisensie nodig`);
- "how do I…" and "hoe…" questions (`how do i register`, `how do i pay tax`, `how do i close my company`, `how do i pay myself`, `hoe registreer ek vir btw`, `hoe begin ek 'n besigheid`, `hoe betaal ek myself`).

All open the page the guide would send a first-time owner to, except the queries in the major and in minors 1 to 3.

### The typo sweep

`scripts/search-typo-sweep.ts` measures what `docs/testing.md` and the ADR say it does:

- its queries are every page title and glossary term in both languages;
- it makes the dropped, doubled, neighbouring-key and swapped-letter typos of each word of five letters or more, at every position, first letter included;
- it counts against the correct spelling's first result in the same build.

I reproduced all four numbers in the ADR (above). Two small wording gaps are in nit 2.

## Findings

### major 1: "register my own business", "register a new business" and "registreer 'n nuwe besigheid" do not offer the Register page

Files: `src/lib/search-client.ts:577` (`titled`, the title rule: every query word must be in the title) and the heading lift after it; `scripts/search/entries.ts:375,385` (the quick answer's text is its targets, its page's lead and its note).

Acceptance item: general quality (ranking), and the severity rule "gives them a wrong or incomplete path". This is the pass 13 major with one more word. Registering is the first thing a new owner looks up, and "my own", "a new" and "my small" are how people say it.

What is wrong: the best bet pins only `register business` (accepted). The ranking half of the pass 13 fix relies on the Register page's lead ("For a one-person business…") holding "business". One more word that the Register page does not hold ("own", "new", "small", "eie", "nuwe", "klein") breaks it again. Then a heading that holds that word wins. In English, the Register page and its quick answer are result 42 (`own`), 18 (`new`) or 28 (`small`).

Not caused by this pass: the first results are the same at `9bfa6bb`.

| Query (finished and typed) | Enter opens | Register in the dialog |
| --- | --- | --- |
| `register my own business` | `core/vehicles/#route-1-register-it-against-your-own-id` | none of the 10 options |
| `register a new business`, `register new business` | `core/adding-new-lines/#registered-name-and-trading-names` | none |
| `register my small business`, `register small business`, `how do i register my small business` | `core/tax-and-sars/#route-4-small-business-corporation-rates-companies-only` (a company tax rate) | only "POPIA: register your information officer" (2nd of 13) |
| `registreer 'n nuwe besigheid` | `af/start/how-to-use/#path-3-i-need-one-specific-answer` | none (the page is result 16) |
| `registreer my eie besigheid` | `af/core/vehicles/#route-1-register-it-against-your-own-id` | "Eenmansaak (handel as jouself)" 2nd |

How to reproduce:

- In the unit index: `runSearch(en.index, 'register my own business', 'en', { limit: 1, typing }, BASE)[0].href` is `/business-toolkit/core/vehicles/#route-1-register-it-against-your-own-id` for both values of `typing`. With `limit: 500`, the first entry with `doc === 'core/register'` and no anchor is at index 41.
- In the built site (preview on 4807): on `/business-toolkit/`, press `/`, type `register my own business`. The dialog lists 10 options and none is on `core/register/`. ArrowDown and Enter go to `/business-toolkit/core/vehicles/#route-1-register-it-against-your-own-id`. `register my small business` goes to `/business-toolkit/core/tax-and-sars/#route-4-small-business-corporation-rates-companies-only`. On `/business-toolkit/af/`, `registreer my eie besigheid` goes to `/business-toolkit/af/core/vehicles/#route-1-register-it-against-your-own-id`.

Suggested fix: fix the ranking, not the table. These are options, not a single tested fix:

- In the title rule and the heading lift, do not count a few words that say nothing about which page is meant, next to "business"/"besigheid": `own`, `new`, `small`, `eie`, `nuwe`, `klein` (like `TITLE_STOP_WORDS`). Then `register my own business` reads as `register business` for those rules, and the quick answer "Do I need to register a company?" leads. Check that `small business corporation` and `new lines of business` still open their sections.
- Or give the quick answer a second question in the content (for example "How do I register my business?" / "Hoe registreer ek my besigheid?") so the answer weight applies to more phrasings.

Add rows: each query in the table, typed and finished, opens `core/register/` first.

### minor 1: the best bet "annual return" pins the CIPC filing, but the guide also calls the tax return an "annual return"

File: `content-meta/search-best-bets.json:65` (`"annual return"`) and the Afrikaans `"jaarlikse opgawe"` next to it.

Acceptance item: best bets must not hijack a query that means something else.

What is wrong: the guide uses "annual return" for three filings:

- the CIPC filing (`06-running-a-pty-ltd.md:46`);
- the sole proprietor's ITR12 ("Filing season for the annual return (ITR12)", `03-tax-and-sars.md:203`);
- the company's ITR14 ("one ITR14 annual return", `03-tax-and-sars.md:67`).

Its glossary entry says "A yearly filing with CIPC … Not a tax return. Both are required." Before this pass that glossary entry was first, so the reader saw the warning first. Now the best bet pins "1. CIPC annual return" in Running a Pty Ltd. In the dialog, the Running a Pty Ltd group takes the first three options and pushes the glossary entry to 4th. A sole proprietor (the guide's default reader) who means their ITR12 lands on a Pty Ltd duty that does not apply to them. No Tax and SARS option is in the dialog. The glossary entry is still visible, so this is minor.

How to reproduce: `runSearch(en.index, 'annual return', 'en', { limit: 1 }, BASE)[0].href` is `/business-toolkit/core/running-a-pty-ltd/#1-cipc-annual-return`. With the best bets off (or at `9bfa6bb`) it is `/business-toolkit/glossary/#annual-return`. In the built site's dialog, `annual return` lists "1. CIPC annual return", "Your Pty Ltd annual checklist", "2. Beneficial ownership filing", then "Annual return" (glossary). Enter goes to `/business-toolkit/core/running-a-pty-ltd/#1-cipc-annual-return`. `jaarlikse opgawe` does the same in Afrikaans.

Suggested fix: drop the bare `annual return` and `jaarlikse opgawe` phrases and keep `cipc annual return` and `cipc jaarlikse opgawe`. Or point them at `lookup/glossary#annual-return`, which names both filings. Add a row: `annual return` does not open a Running a Pty Ltd section first.

### minor 2: "BTW-registrasie", as Afrikaans spells it, is not the best bet "btw registrasie"; the dialog opens the tax invoice template

File: `content-meta/search-best-bets.json:23`.

Acceptance item: the Afrikaans phrases are what an owner would type.

What is wrong: Afrikaans writes `BTW-registrasie` and `BTW-drempel` with a hyphen. The Afrikaans guide has `BTW-registrasie` 17 times and `BTW-drempel` 5 times, and never the spaced form. `betWords` reads a hyphenated word as one joined word: `betWords('BTW-registrasie')` is `["btwregistrasie"]`, while the phrase is `["btw","registrasie"]`. So the correct spelling never matches.

- Finished, the ranking still opens "BTW: waarskynlik nog nie".
- Typed (the dialog), `BTW-registrasie` opens "Belastingfaktuur, BTW-geregistreer (sjabloon)", the template for VAT vendors. The guide says not to use it until you are registered. "BTW: waarskynlik nog nie" is the 4th option.
- `BTW-drempel` happens to be right by ranking.
- The typed result is the same at `9bfa6bb`, so the best bet did not cause it, but it does not cover the spelling it is meant for.

How to reproduce: `runSearch(af.index, 'BTW-registrasie', 'af', { limit: 1, typing: true }, BASE)[0].href` is `/business-toolkit/af/templates/tax-invoice/`. With `'btw registrasie'` it is `.../af/core/tax-and-sars/#vat-probably-not-yet`. In the built site, on `/business-toolkit/af/`, type `BTW-registrasie` in the dialog. ArrowDown and Enter go to `/business-toolkit/af/templates/tax-invoice/`.

Suggested fix: add `btw-registrasie` and `btw-drempel` to that bet. They read as `btwregistrasie` and `btwdrempel`, so the validation accepts them as distinct phrases; I checked this with `resolveBestBets` on an edited copy. English `vat-registration` is rare, so it is optional. Add a row: `BTW-registrasie`, typed and finished, opens `#vat-probably-not-yet`.

### minor 3: "do i need to register for vat" opens the invoice template for VAT vendors; "tax return" opens "Annual return (not a tax return)"

File: `src/lib/search-client.ts` (ranking within the all-words results).

Acceptance item: general quality (ranking) for "how do I…" questions. The results are the same at `9bfa6bb`, and the right section is on the first screen, so this is minor.

What is wrong:

- **`do i need to register for vat`** (finished and typed): the dialog lists three invoice templates first. "Template 3: invoice if you ARE registered for VAT", "Invoice, NOT VAT registered (template)" and "Tax invoice, VAT registered (template)" come before "VAT: probably not yet" (4th). The quick answer "Do I have to register for VAT?" is not in the dialog at all. Enter goes to `/business-toolkit/paperwork/which-template-to-use-when/#template-3-invoice-if-you-are-registered-for-vat`. `how do i register for vat` is right, so the word `need` is what does it. The best bet does not cover it (accepted).
- **`tax return`** (finished and typed): the dialog lists "Annual return" (the CIPC glossary entry that says "Not a tax return"), "ITR14" and "IRP6". The glossary group is capped at three, so "ITR12", the sole proprietor's return, is not shown. Tax and SARS's "Provisional tax" and "Your tax year calendar" are 4th and 6th. Enter goes to `/business-toolkit/glossary/#annual-return`.

How to reproduce: `runSearch(en.index, 'do i need to register for vat', 'en', { limit: 1 }, BASE)[0].href` is `/business-toolkit/paperwork/which-template-to-use-when/#template-3-invoice-if-you-are-registered-for-vat`. With `'tax return'` it is `/business-toolkit/glossary/#annual-return`. The dialog lists above are from the built site on port 4807.

Suggested fix: treat `need`/`have` as `TITLE_STOP_WORDS` already treats `has`/`have`, so the quick answer "Do I have to register for VAT?" counts as titled for `do i need to register for vat`. For `tax return`, the guide's term "ITR12 / ITR14" ("The yearly tax return", Tax and SARS) or the ITR12 glossary entry should come before "Annual return". For example, do not let a glossary entry whose term holds only one of the query words lead a two-word query. Add rows for both.

### minor 4: a quick answer can rise on its page's lead alone, above a better result

File: `scripts/search/entries.ts:375,385` (the lead goes into the quick answer's `text`).

Acceptance item: the brief's question "does the lead drag quick answers above better results for common queries?" For most queries, no (see "Quick answers with their page's lead"). For a few, an unrelated quick answer moves up, because its page's lead holds the query words.

| Query (typed and finished) | Before (`9bfa6bb`) | Now (best bets off; the same with them on unless noted) |
| --- | --- | --- |
| `do i need a company` | 2nd "How to register a company yourself" | 2nd **"Do I need an audit?"** (Running a Pty Ltd's lead says "company") |
| `het ek 'n maatskappy nodig` | 2nd "Privaat maatskappy (Pty) Ltd" | 2nd **"Het ek 'n oudit nodig?"** |
| `tax number` | 1st "Route 3: turnover tax" | 1st **"How do I pay less tax legally?"** |
| `bank account` (best bets off) | no quick answer in the top 3 | 2nd **"What is a director's loan account?"** |
| `photographer` | 3rd food branding notes | 3rd **"How do I name my business?"** |

In each case the first result is still right or was already wrong, so this is minor.

How to reproduce: build the index with `serialiseIndex('en', [], entries)` (best bets off) and run `runSearch(index, 'do i need a company', 'en', { limit: 3 }, BASE)`. The second result is the answer entry "Do I need an audit?". At `9bfa6bb` it is the section "How to register a company yourself".

Suggested fix: keep the lead, but give it less weight than the question and the note. For example, index it in a field with a low boost, or count an answer entry as "all words" only when its question or targets hold the query words. Add rows for `do i need a company` and `het ek 'n maatskappy nodig`.

### nit 1: a typed beginning of four letters or more shows a best bet for another word for a keystroke or two

File: `src/lib/search-client.ts:377-398` (`bestBet`, the typed-prefix branch).

- `maatskap` and `maatskapp` (typed, on the way to `maatskappy`) open "4. SARS-maatskappybelasting", through the best bet `maatskappybelasting`.
- `handels` (on the way to `handelsnaam`) opens "Wat jy nodig het om dinge te verkoop" (best bet `handelslisensie`) before the glossary's "Handelsnaam".
- `registreer my besig` opens a vehicle dealer section. `besig` ("busy") is a whole word, so the typed branch is off for one keystroke. From `besigh` it opens Register again.

Each lasts until the word is finished, so it is a nit. To reproduce, run `runSearch(af.index, 'maatskap', 'af', { limit: 1, typing: true }, BASE)[0].href`. It is `.../af/core/running-a-pty-ltd/#4-sars-company-tax`.

Suggested fix: allow the typed branch only when the typed beginning is at least half of the phrase word, or when no whole word of the index starts with the typed part, other than the bet word's own compounds. Or accept it as it is.

### nit 2: the sweep's output still says "one-letter typos", and "every way one keystroke can" leaves out an extra key

File: `scripts/search-typo-sweep.ts:2`, `:5` and `:92`.

- The header line 2 and the printed line 92 say "one-letter typos". The docs and line 5 now say "one-keystroke".
- Line 5 says "every way one keystroke can", but an extra neighbouring key pressed next to the right one (`regidster`) is not made. Only the same letter doubled is.

I ran `typos('register')` (copied from the script): it gives 49 strings, including `registerr`, `rregister` and `regoster`, but not `regidster` or `registwer`.

Suggested fix: print "one-keystroke typos", and either add the inserted neighbouring key or say "dropped, doubled, neighbouring-key and swapped letters" instead of "every way". If the counts change, update the ADR.

### nit 3: design-system.md gives the old Afrikaans index size

File: `docs/design-system.md:502`. It says "the index (166 KB gzip in English, 182 KB in Afrikaans)". The build gives "183.1 KB gzip" for Afrikaans, and `docs/testing.md` and the ADR say 183.1. Suggested fix: "183 KB".
