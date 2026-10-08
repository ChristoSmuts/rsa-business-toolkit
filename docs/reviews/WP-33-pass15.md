# WP-33 review pass 15 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 14.
- **Date:** 7 October 2026
- **Commit reviewed:** `8517fd5` ("docs(search): document page keywords and filler words, for review pass 14"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b..8517fd5`, the whole package. I looked hardest at the pass 14 fixes, `git diff fd09df7..8517fd5`: `abc7648` (page keywords, best-bet filler words, hyphenated best-bet words, the quick-answer lead in its own field, typed beginnings with completions, the extra-key typos) and `8517fd5` (docs).

## Verdict

**Not clean: 0 blockers, 4 majors, 1 minor, 0 nits.**

The pass 14 findings are fixed as asked:

- Major: `register my own business`, `register a new business`, `register my small business`, `registreer 'n nuwe besigheid` and `registreer my eie besigheid` open the Register page, typed and finished, through the filler words.
- Minor 1: `annual return` and `jaarlikse opgawe` open the glossary entry that tells the CIPC filing from the tax returns.
- Minor 2: `BTW-registrasie` and `BTW-drempel` open "BTW: waarskynlik nog nie", finished and typed (from `BTW-registras` and `BTW-dre`).
- Minor 3: `tax return` opens Tax and SARS (page keyword). `do i need to register for vat` is accepted.
- Minor 4: `do i need a company` and `het ek 'n maatskappy nodig` no longer list "Do I need an audit?"; `tax number` no longer opens "How do I pay less tax legally?".
- Nits 1 to 3: `maatskap` and `handels` no longer show a best bet; the sweep prints "one-keystroke typos" and adds the extra key; the docs give the current sizes.

I found no best bet that a filler word turns into a wrong answer (details below). The four majors are all in the ranking, outside what the best bets cover. Majors 1, 2 (English), 3 and 4 are the same at `fd09df7`; this pass did not cause them. The Afrikaans half of major 2 and the minor are caused by this pass.

## Gate results

I ran all of these myself on `8517fd5`. The logs are in the shared scratchpad under `wp33-review15-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0 ("Done in 2.6s using pnpm v11.22.0").
- `pnpm gate:fast` (`wp33-review15-gatefast.log`): exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "- 0 errors", "- 0 warnings", "- 0 hints".
  - Vitest unit and dom: "Test Files  36 passed (36)", "Tests  1335 passed (1335)".
  - Content drift: "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  34 passed (34)".
- `pnpm build` (`wp33-review15-build.log`): exit 0, "96 page(s) built in 3.19s".
  - `search:build`: "en.c950ec3983.json: 945 entries, 745.2 KB raw, 166.6 KB gzip" and "af.fd9dca0e60.json: 951 entries, 808.0 KB raw, 183.6 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 19.7 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 13.5 KB gzip (shared chunks counted once)."
  - These match `docs/testing.md` (19.7 KB, 13.5 KB), the ADR (166.6 KB, 183.6 KB) and `docs/design-system.md:507` (167 KB, 184 KB, rounded).
- `pnpm search:typos` (`wp33-review15-typos.log`): exit 0: "search:typos: of 58672 one-keystroke typos, 53506 open the correct spelling's first result and 57518 one of its first three." This is what the ADR says.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4811`, default reporters, `wp33-review15-e2e.log`): **555 passed, 85 skipped** (4.5 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4811/business-toolkit/` and "Running 640 tests using 2 workers", so this run tested this build on my port.
  - The log has no `✘` line (`grep -c ✘` gives 0), so the failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4812`, `wp33-review15-a11y.log`): **196 passed** (3.2 min, exit 0). The server was on `Local http://127.0.0.1:4812/business-toolkit/` and the log says "Running 196 tests using 2 workers". It has no `✘` line.
  - I ran nothing else in the worktree while e2e and a11y ran. My only Playwright probe ran afterwards, on port 4813, with `--output` in the scratchpad.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.**
  - Since `fd09df7`, `src/` changed only in `src/lib/search-client.ts`, `src/lib/search/options.ts` and `src/lib/search/types.ts`. They add no `href="/` literal, no `localStorage`, no `innerHTML`, no literal colour and no UI string.
  - `scripts/search/keywords.ts` reads a local file only. A page in the keywords file that is not in the manifest, or is listed twice, throws, so `pnpm build` fails.
  - `INDEX_VERSION` went from 3 to 5, so a cached old client refuses the new index (`lead` field, `filler`).

## My own checks

### How I ran queries

I built both indexes in memory, the way `tests/unit/search/index.test.ts` does, with the best bets and filler resolved, and ran each query through `runSearch`, typed and finished. To compare, I ran the same scripts against:

- a scratch export of `fd09df7` (pass 14 code), never against the worktree;
- `8517fd5` with the page keywords left out (`input.keywords = new Map()`), to see what the keywords do on their own.

I also ran each query a keystroke at a time (typed, from three letters) and printed every change of the first result.

I checked the majors and the minor in the built site. I added a temporary spec (deleted after the run, not committed; `git status` is clean) and ran it with `PW_PORT=4813` (the log said `Local http://127.0.0.1:4813/business-toolkit/`). It opens the page, presses `/`, types the query a key at a time, reads every option, then presses ArrowDown and Enter and reads the URL.

### Page keywords

I read each keyword against the guide. Each is a word the page answers:

- `register business`, `start business`, `registration` / `registreer besigheid`, `begin besigheid`, `registrasie` on Register;
- `tax return`, `income tax` / `belastingopgawe`, `inkomstebelasting` on Tax and SARS;
- `licence`, `permit`, `trading licence` / `lisensie`, `permit`, `handelslisensie` on What you need to sell things;
- `what kind of business` / `watter soort besigheid` on Pick your business type.

With and without the keywords, I compared 23 queries that use these words for something else: `vehicle registration`, `registration number`, `uif registration`, `company registration`, `registration certificate`, `driver's licence`, `vehicle licence`, `licence disc`, `software licence`, `tv licence`, `work permit`, `street trading permit`, `permit to sell food`, `company tax return`, `provisional tax return`, `vat return`, `company income tax`, `start a food business`, `start business from home`, `besigheidsregistrasie`, `voertuigregistrasie`, `kosbesigheid begin` and `inkomstebelasting vir maatskappy`. No keyword pulls its page above the section that answers these. The one exception is `deregistreer my besigheid` (major 2): the keyword `registreer besigheid` matches it through the typo reading of `deregistreer`.

### Best bets with filler words

I checked every phrase against every filler word, in both languages, for a query in which the filler word changes the meaning. I found none:

- `can I register a business without a bank account`: "without" is not filler, so no bet; the ranking opens "Business bank account", which is right.
- `should I register for VAT` and `I want to register for VAT` open "VAT: probably not yet". That section holds the threshold and the voluntary choice, so it answers both.
- `I want to close my business`: no bet holds "close business", so the filler words play no part. The ranking is wrong (majors 1 and 2).
- `my own name as business name`: no bet holds "name". The ranking opens "Prompt 3: the name", which says "Use your own name" (`01-branding-prompts.md:70`).
- `small company tax rate` and `new company tax rate` match the bet `company tax rate`. "4. SARS company tax" points to the Small Business Corporation rates, and the SBC glossary entry is 2nd, so this is right.
- `I want to get a quote` opens the Quotation template. The guide has no page on getting a quote from a supplier, so this is the best it has.
- Negations are safe: `don't`, `can't` and `not` leave a word (`t`, `not`) that is not filler, so no bet matches.

**Hyphenated words.** `BTW-registrasie` and `BTW-drempel` read as `btw registrasie` and `btw drempel`. `UIF-registrasie` reads as `uif registrasie`, and "registrasie" is not filler, so it does not match the bet `uif`. That is right.

**Typed beginnings.** Keystroke by keystroke, for 41 phrases (20 English, 21 Afrikaans), no typed beginning showed a bet for a word other than the bet word or its forms. `maatskap` no longer shows "4. SARS-maatskappybelasting", and `handels` no longer shows the licence page. `invo` and `invoic` show no bet, because they also begin "invoicing". The ranking takes over there, and the bet comes back at `invoice`.

### The quick-answer lead

The lead now has a quarter boost in its own field. An answer that matches only through its lead ranks with the any-word results. Pass 14's minor 4 rows are fixed: `do i need a company` lists "Do I need to register a company?", "How to register a company yourself" and "Private company (Pty) Ltd" first. The one cost I found is `besigheidsnaam` (the minor).

### Common queries

I ran SARS, VAT, BTW, invoice, faktuur, UIF, CIPC, register, registreer, licence, lisensie, tax, belasting, company, maatskappy, bank, close and sluit. I ran each alone and in phrases, typed and finished, with "how do I…", "hoe…", stop-word and filler phrasings. Everything I did not list as a finding opens the page the guide would send a first-time owner to.

## Findings

### major 1: filler words count in the ranking, so "I want to…", "I need to…" and "how do I get…" questions open unrelated sections

Files:

- `content-meta/search-best-bets.json:3-19`: the filler list.
- `src/lib/search-client.ts:398` (`bestBet`): only the best bets read the filler list.
- `src/lib/search-client.ts:608` and `:628` (`titled`, `headed`): the ranking, the title rule and the heading lift still count the filler words.

Acceptance item: general quality (ranking), and the severity rule "gives them a wrong or incomplete path". Pass 14 made filler words "words that never say which page is meant" for the best bets only. The ranking still treats them as content words. Headings that contain them get the heading lift: "Path 3: I need one specific answer", "Path 4: … and I want to grow", "Path 2: … want to get compliant", "How to get the BRNC", "Which one should you choose" and "Things you can skip at the start". Other sections match through words like "what SARS **wants**", "materials", or Afrikaans "**wil** hê" and "jy **moet**". So the most natural way an owner asks opens a wrong section, even though the same question without the filler word is right.

Not caused by this pass: the first results are the same at `fd09df7`.

| Query (finished and typed) | Enter opens | Without the filler word |
| --- | --- | --- |
| `I want to close my business` | `branding/mood-and-materials/#prompt-b-materials-and-finishes` (a branding prompt) | `close my business`: "You are the business" |
| `I need to close my business` | `core/what-you-need-to-sell-things/#if-you-sell-food` | as above |
| `I want to register a company` | `core/tax-and-sars/#what-sars-wants-from-a-company` | `register a company`: "Do I need to register a company?", then "How to register a company yourself" |
| `I need to file my tax return` | `core/running-a-pty-ltd/#1-cipc-annual-return`: the CIPC filing, which the guide says is "Not a tax return" | `file my tax return`: Tax and SARS |
| `I want to file my tax return` | `core/tax-and-sars/#what-sars-wants-from-a-company` (a sole proprietor files an ITR12) | as above |
| `how do i get a tax number` | `core/vehicles/#which-is-better` (a vehicle ownership section) | `how do i a tax number`: Route 3, then Tax and SARS |
| `I need to pay tax`, `can I pay less tax` | `start/how-to-use/#path-3-i-need-one-specific-answer` (how to use the guide) | `pay tax`, `pay less tax`: "How do I pay less tax legally?" |
| `ek wil my besigheid sluit` | `af/core/tax-and-sars/#provisional-tax` | `ek my besigheid sluit`: "Jy is die besigheid" |
| `ek wil kos verkoop` | `af/business-types/retail-online/#do-you-need-a-licence` (retail) | `kos verkoop`: "As jy kos verkoop" |

In the dialog the right section is often missing from the whole list. For `I want to close my business` and `I need to close my business`, no option is on Running a Pty Ltd. For `I need to file my tax return`, "1. CIPC annual return" is first, and "Tax and SARS" is not in the 10 options.

How to reproduce:

- In the unit index: `runSearch(en.index, 'I want to close my business', 'en', { limit: 1, typing }, BASE)[0].href` is `/business-toolkit/branding/mood-and-materials/#prompt-b-materials-and-finishes` for both values of `typing`. `'I need to file my tax return'` gives `/business-toolkit/core/running-a-pty-ltd/#1-cipc-annual-return`. `'how do i get a tax number'` gives `/business-toolkit/core/vehicles/#which-is-better`. `runSearch(af.index, 'ek wil my besigheid sluit', 'af', { limit: 1 }, BASE)[0].href` is `/business-toolkit/af/core/tax-and-sars/#provisional-tax`.
- In the built site (preview on 4813): on `/business-toolkit/`, press `/` and type `I want to close my business`. The first options are "Prompt B: materials and finishes", "Prompt A: the visual territory" and "Prompt 0: the business brief". ArrowDown and Enter go to `/business-toolkit/branding/mood-and-materials/#prompt-b-materials-and-finishes`. `I need to file my tax return` goes to `/business-toolkit/core/running-a-pty-ltd/#1-cipc-annual-return`. `how do i get a tax number` goes to `/business-toolkit/core/vehicles/#which-is-better`. On `/business-toolkit/af/`, `ek wil my besigheid sluit` goes to `/business-toolkit/af/core/tax-and-sars/#provisional-tax`.

Suggested fix: use one list for both jobs. Send the filler list in the index, as now. In `runSearchCounted`, drop filler words from the query parts before the all-words query, the title rule and the heading lift, as `STOP_WORDS` are dropped. Keep a filler word only when the query has nothing else, so `need` alone still searches. The table's "without" column shows what that gives. Then check that the filler list really holds only such words: `get` and `can` are fine, but `new` and `small` name sections ("Adding new lines", "small business corporation"). Keep those two for the best bets only, or check `small business corporation` and `new lines of business` after the change. Add rows: each query in the table, typed and finished, does not open the section in the "Enter opens" column.

### major 2: "close my business" never offers "Closing a company properly", and "deregister my business" opens the Register page

Files:

- `content-meta/search-best-bets.json:97-102`: the only closing bet, `close my company` / `sluit my maatskappy`.
- `content-meta/search-keywords.json:6-7`: the Register keywords `register business` and `registreer besigheid`.
- The typo reading in `src/lib/search/options.ts` (`matchRule`): fuzzy 0.2 for words longer than four letters, so `deregister` also reads as "register".

Acceptance item: the severity rule "hides something the guide says they need". The guide's only section on closing is "Closing a company properly" (`06-running-a-pty-ltd.md:218`). It says "deregister it deliberately. Do not just stop filing", and warns that a company nobody files for is deregistered, its bank account frozen and the director exposed (`:126-136`). A Pty Ltd owner says "business" as often as "company".

- `close my business`, `how do i close my business` and `close business` open "You are the business". That page is about what happens if you die or cannot work, not about closing on purpose. "Closing a company properly" is not in the first 60 results in English, and not in the dialog's 11 options.
- `sluit my besigheid`: the section is result 26.
- `deregister my business` and `deregister business` (finished and typed) open "Register: what you actually need", which means the opposite. `deregister` reads as "register" by the typo rule, and the new keyword `register business` sits in the Register page's heading field. At `fd09df7` these queries opened the quick answer "Do I need to register a company?", so the English half is not new.
- `deregistreer my besigheid` now opens "Registreer: wat jy regtig nodig het" too. At `fd09df7`, and with the keywords left out, it opened "Roete 3: omsetbelasting". So the keyword `registreer besigheid` did this.
- `deregister my company`, `close my company` and `deregistreer my maatskappy` are right.

How to reproduce:

- In the unit index: `runSearch(en.index, 'deregister my business', 'en', { limit: 1, typing }, BASE)[0].href` is `/business-toolkit/core/register/` for both values of `typing`. `runSearch(af.index, 'deregistreer my besigheid', 'af', { limit: 1 }, BASE)[0].href` is `/business-toolkit/af/core/register/`. With `limit: 60`, no result of `'close my business'` has the anchor `closing-a-company-properly`.
- In the built site: `deregister my business` goes to `/business-toolkit/core/register/`. Its first option is "Register: what you actually need", and no option is on Running a Pty Ltd. `close my business` lists 11 options with no Running a Pty Ltd one, and Enter goes to `/business-toolkit/core/you-are-the-business/`. On `/business-toolkit/af/`, `deregistreer my besigheid` goes to `/business-toolkit/af/core/register/`.

Suggested fix: two parts.

- Do not read a finished query word that is itself a word of the guide as a typo for another word. `deregister`, `deregistreer` and `deregistration` are all in the index, so their fuzzy reading should not add "register". Check that the typo sweep counts do not fall.
- Point closing at the closing section. For example, add `close business`, `deregister business`, `sluit besigheid` and `deregistreer besigheid` to the `closing-a-company-properly` bet. With the filler words, `I want to close my business` then matches too. A sole proprietor has no section of their own, and this one is still the guide's answer on closing. Or add `close business` / `sluit besigheid` as keywords of Running a Pty Ltd.

Add rows: `close my business`, `deregister my business`, `sluit my besigheid` and `deregistreer my besigheid`, typed and finished, open `core/running-a-pty-ltd/#closing-a-company-properly`, and none opens `core/register/`.

### major 3: "how do I register my business for VAT" opens the vehicle dealer's "register earlier" section, in both languages

Files: `content-meta/search-best-bets.json:35-40` (the VAT bet) and the heading lift in `src/lib/search-client.ts:628`.

Acceptance item: the severity rule "gives them a wrong or incomplete path". This is the VAT question with one more word. The bet `register for vat` does not match, because "business" is not filler (rightly). Then the heading lift picks the vehicle dealer section whose heading holds "register", "VAT" and "businesses". For a dealer, the guide says register for VAT earlier than other businesses. For everyone else, it says "VAT: probably not yet". A non-dealer who acts on the first result may register for VAT when the guide says they need not.

Not caused by this pass: the first results are the same at `fd09df7`.

| Query (finished and typed) | Enter opens | "VAT: probably not yet" / "BTW: waarskynlik nog nie" |
| --- | --- | --- |
| `how do i register my business for vat` | `business-types/vehicle-dealer/#vat-register-earlier-than-other-businesses` | 5th, after two invoice templates |
| `moet ek my besigheid vir btw registreer` | `af/business-types/vehicle-dealer/#the-conditions-you-must-meet` (VAT264 conditions for dealers) | 8th |
| `hoe registreer ek my besigheid vir btw` | `af/business-types/vehicle-dealer/#vat-register-earlier-than-other-businesses` | 10th |

`should I register my business for VAT` and `do I need to register my business for VAT` are right in English, so the miss is the plain "how do I" form and Afrikaans.

How to reproduce: `runSearch(en.index, 'how do i register my business for vat', 'en', { limit: 1, typing }, BASE)[0].href` is `/business-toolkit/business-types/vehicle-dealer/#vat-register-earlier-than-other-businesses` for both values of `typing`. `runSearch(af.index, 'moet ek my besigheid vir btw registreer', 'af', { limit: 1 }, BASE)[0].href` is `/business-toolkit/af/business-types/vehicle-dealer/#the-conditions-you-must-meet`.

Suggested fix: add `register my business for vat` and `registreer my besigheid vir btw` to the `vat-probably-not-yet` bet. They read as `register business vat` and `registreer besigheid btw`, distinct from the existing phrases. Or, in the ranking, do not let a heading lift take a section on a business-type page above a core section for a query that does not name the type. Add rows for the three queries.

### major 4: "open a bank account" opens a fraud section; "Business bank account" is not in the dialog

Files: `content-meta/search-best-bets.json:125-129` (the bet `bank account` / `bankrekening`).

Acceptance item: the severity rule "hides something the guide says they need". The guide calls a separate bank account "the one thing every business should do, even a sole proprietor with no registration" (`02-register.md:115`). Owners ask for it as "open a bank account". "open" is not filler, so the bet does not match. The section "Business bank account" does not hold "open", so every section that holds all the words comes first. Among them are the fraud sections ("Open a case at your nearest SAPS station … the buyer's account").

Not caused by this pass: the first results are the same at `fd09df7`.

| Query (finished and typed) | Enter opens | "Business bank account" / "Besigheidsbankrekening" |
| --- | --- | --- |
| `open a bank account`, `how do i open a bank account` | `core/working-from-home-and-safety/#part-5-if-something-goes-wrong` | result 9; not among the dialog's 11 options |
| `open business bank account` | `core/start-here/#order-to-do-things` | result 5 |
| `hoe maak ek 'n bankrekening oop`, `maak 'n bankrekening oop` | `af/core/running-a-pty-ltd/#records-the-company-must-keep` | result 27; not among the dialog's 16 options |

The two checklist items ("Opened a separate bank account…") are in the dialog. They say what to do, but not which account or what to compare.

How to reproduce: `runSearch(en.index, 'open a bank account', 'en', { limit: 1, typing }, BASE)[0].href` is `/business-toolkit/core/working-from-home-and-safety/#part-5-if-something-goes-wrong` for both values of `typing`. In the built site, `open a bank account` goes to that URL, and none of the 11 options is on `core/register/`. On `/business-toolkit/af/`, `hoe maak ek n bankrekening oop` goes to `/business-toolkit/af/core/running-a-pty-ltd/#records-the-company-must-keep`.

Suggested fix: add `open a bank account`, `open business bank account` and `maak bankrekening oop` to that bet (`betWords` reads them as `open bank account`, `open business bank account` and `maak bankrekening oop`). Or add "open" / "oop" to the section's index text as a section keyword, if keywords are extended to sections. Add rows for each query in the table.

### minor 1: "besigheidsnaam" now opens a privacy notice placeholder ("Wie ons is")

File: `src/lib/search-client.ts:647` (`leadOnly`) and `src/lib/search/options.ts:49` (`lead: 0.25`).

Acceptance item: the quick-answer lead must not cost a better result. Pass 14 found `besigheidsnaam` opening "My naam is reeds besluit, wat slaan ek oor?" (better than before). That quick answer matches only through its page's lead ("as jou besigheidsnaam reeds vasstaan"), so it now ranks with the any-word results. The first result is the privacy notice template's "Wie ons is", whose text is the placeholder "[Besigheidsnaam]". Next come "1. WhatsApp Business-profiel", "Sjabloon 5", "4. E-poshandtekening" and "Sjabloon 4". "Het jy reeds jou naam? (kortpad)" is 6th. The page is still on the first screen, so this is minor.

How to reproduce: `runSearch(af.index, 'besigheidsnaam', 'af', { limit: 1 }, BASE)[0].href` is `/business-toolkit/af/templates/privacy-notice/#who-we-are`. At `fd09df7` it is `/business-toolkit/af/branding/already-have-your-name/`. In the built site, on `/business-toolkit/af/`, `besigheidsnaam` goes to `/business-toolkit/af/templates/privacy-notice/#who-we-are`.

Suggested fix: add `besigheidsnaam` as an Afrikaans keyword of `branding/already-have-your-name` (its English titles already hold "name"), or let a one-word query keep a lead-only answer among the all-words results when the lead is the only place the word is not a template placeholder. Add a row: `besigheidsnaam` does not open a template section first.
