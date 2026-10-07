# WP-33 review pass 16 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 15.
- **Date:** 7 October 2026
- **Commit reviewed:** `059186f` ("docs(search): document the acceptance set and the pass 15 ranking rules"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b..059186f`, the whole package. I looked hardest at `git diff 84f424f..059186f`: `21de938` (the acceptance set, filler words in the ranking, whole words, the question rule, new bets and keywords, bet cap 60) and `059186f` (docs).
- **The bar:** from this pass a major is a failing acceptance row, a regression against `84f424f`, a whole class of query going wrong, a broken rule, or a weak acceptance set (`docs/testing.md`, "Search acceptance set").

## Verdict

**Not clean: 0 blockers, 5 majors, 3 minors, 0 nits.**

Every acceptance row passes, finished and typed (766 tests, inside the 2109 of `pnpm test`). The pass 15 findings are fixed as asked: `I want to close my business`, `I need to file my tax return`, `how do i get a tax number`, `ek wil my besigheid sluit`, `deregister my business`, `deregistreer my besigheid`, `how do i register my business for vat`, `moet ek my besigheid vir btw registreer`, `open a bank account`, `hoe maak ek 'n bankrekening oop` and `besigheidsnaam` all open the place their row names.

The majors are:

1. The set is weak in places: some rows pass while the first result is a wrong page, and some main tasks have no row for the phrasings that fail.
2. A regression: a heading that holds a filler word ("How to get the BRNC", "Do you need a tagline?") no longer opens for its own question.
3. A regression across a whole class: "license" is now a whole word of the guide, so it no longer reaches "licence". Every "license" query loses the licence page.
4. A whole Afrikaans class fails: `ek wil 'n X hê` ("I want an X") and `ek soek 'n X` ("I'm looking for an X").
5. A regression: `vehicle` opens the sources register, and every swap typo of "vehicle dealer" does too.

## Gate results

I ran all of these myself on `059186f`. The logs are in the shared scratchpad under `wp33-review16-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0.
- `pnpm gate:fast` (`wp33-review16-gatefast.log`): exit 0.
  - "All matched files use Prettier code style!"
  - `astro check`: "- 0 errors", "- 0 warnings", "- 0 hints".
  - Vitest unit and dom: "Test Files  37 passed (37)", "Tests  2109 passed (2109)".
  - "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  34 passed (34)".
- `pnpm build` (`wp33-review16-build.log`): exit 0.
  - "search:build: en.d0dcf5119e.json: 945 entries, 745.9 KB raw, 166.7 KB gzip" and "search:build: af.d2e32c434e.json: 951 entries, 808.6 KB raw, 183.7 KB gzip".
  - "dist:audit: 96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - "dist:trust: 72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - "dist:budget: largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 20.0 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand …: 13.8 KB gzip". These match `docs/testing.md`.
- `pnpm search:typos` (`wp33-review16-typos.log`): exit 0: "search:typos: of 58672 one-keystroke typos, 53281 open the correct spelling's first result and 57473 one of its first three." This matches the ADR.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4815`, default reporters, `wp33-review16-e2e.log`): **555 passed, 85 skipped** (4.5 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4815/business-toolkit/` and "Running 640 tests using 2 workers".
  - `grep -c ✘` gives 0, so the failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4816`, `wp33-review16-a11y.log`): **196 passed** (3.1 min, exit 0). The log says `Local    http://127.0.0.1:4816/business-toolkit/` and "Running 196 tests using 2 workers". It has no `✘` line.
  - I ran no probe while e2e or a11y ran. The typo sweeps finished before e2e started. The built-index probe ran between e2e and a11y.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.** Since `84f424f`, `src/` changed only in `src/lib/search-client.ts`. It adds no `href="/` literal, no `localStorage`, no `innerHTML`, no literal colour and no UI string. No rule in `CLAUDE.md` is broken.

## How I ran queries

- **In memory.** I built both indexes the way `tests/unit/search/acceptance.test.ts` does (`loadIndexInput`, `buildEntries`, `serialiseIndex` with the resolved bets) and ran `runSearch` with `typing: false` and `typing: true`, limit 3. I ran the same scripts against an export of `84f424f` (`git archive` into the scratchpad, never into the worktree) to find regressions.
- **Against the build.** For every finding I loaded `dist/search/en.d0dcf5119e.json` and `dist/search/af.d2e32c434e.json` (the files the browser fetches) with `loadIndex` and ran the queries with base `/business-toolkit/`. The hrefs quoted below come from that run.
- **Regression sweeps.**
  - Every entry title in both languages as a query, old against new: 33 English first results changed.
  - Every section or quick answer whose heading holds a filler word, queried by its own heading: 6 got worse and 1 better in each language.
  - A copy of `scripts/search-typo-sweep.ts` that prints each miss, run on both tips.

## Review items

### 1. The acceptance set

**Loosened rows.** These follow the documented term rule: "a term query opens its definition first" (`docs/design-system.md`). I read each glossary entry that comes first:

- `vat` / `btw` → glossary "VAT — Value-Added Tax, 15%. Only charged by registered vendors.";
- `turnover tax` → "A simplified tax for micro businesses … 0% on the first R600,000";
- `licence` → "Businesses Act licence";
- `beneficial ownership` → "Beneficial ownership filing".

None of these entries is wrong or harmful, and the guide's section is second or third. I accept those rows. The same goes for the other top-3 rows whose first result is a glossary entry: `sars`, `tax threshold`, `notional input tax`, `VAT264`, `cash book`, `loan account`, `logbook`, `voetstoots`, `popia`, `cooling off` and their Afrikaans forms.

**Rows too weak to catch a wrong answer.** Major 1 lists them.

**Coverage.** Every main task in the brief has rows. These phrasings have none, and they fail:

- `X hê` and `ek soek` (major 4);
- "license" (major 3);
- "pty ltd" for registering (minor 1);
- headings that hold filler words (major 2).

UIF and employees has only bare-term rows (`uif`, `paye`, `emp201`, `employees`, `coida`, `uif on my salary`). The question forms I tried give acceptable answers today, so I add them as rows to keep, not as a finding:

- `register for uif` opens "UIF: sources disagree";
- `uif registration` opens "Things you can skip at the start", which says a sole proprietor does not register;
- `I want to hire someone` opens "What this toolkit deliberately leaves out", which is right because the guide leaves out employment.

### 2. Filler words

`I want to / I need to / how do I / can I / ek wil / ek moet / hoe` now work for the pass 15 queries, and for many more I tried:

- `i want to sell alcohol`, `i need a liquor licence`, `i want to import`, `i need a quote`;
- `i need to file my annual return`, `how do i file beneficial ownership`, `i want to register for provisional tax`;
- `i want to take money out`, `i want to close my company`, `i need to open a business bank account`;
- `ek wil van die huis af werk`, `ek wil motors verkoop`, `ek wil kos van die huis af verkoop`.

Two costs:

- A heading that itself holds the filler word loses its own question (major 2).
- Afrikaans `hê` and `soek`, which do the same job, are not filler (major 4).

### 3. Whole words

`deregister` and `deregistreer` work. The cost is a real word used as a misspelling:

- "license" is the big one (major 3).
- The sweep also shows "trading stick", "title older", "free tolls" and "gesluit". Those are rare and I accept them.

`reciept` finds nothing at both tips. It is not a regression.

### 4. The question rule

It works for `do i need an audit`, `how do i name my business` and `i need a receipt`. It also catches "what is X" when a quick answer holds X (minor 2).

### 5. New best bets and keywords

I read each new phrase against the guide. Each target is the page the guide would send the owner to. The keyword `business name` on "Already have your name" does not fix English `business name` (major 1).

### 6. The typo sweep drop

I reproduced it exactly:

- 237 first-result misses are new and 12 are fixed.
- 200 of the new misses are typos of `services and trades` / `dienste en ambagte`.
- The other 37 are the whole-word cases above, plus the "vehicle dealer" swaps (major 5).

The `services and trades` typos open the checklist entry "Services and trades" first, and the business-type page second. It is the same subject, on the first screen, and the checklist lists that type's tasks. I judge it a minor (minor 3), not a real owner regression.

## Findings

### major 1: weak acceptance rows let a wrong first result pass, and `business name` still opens the vehicles page

Files:

- `tests/search/acceptance-queries.json`:
  - `:1149` `business name` (top3 `branding/branding-prompts`, `notFirst` only `core/vehicles#which-is-better`);
  - `:1163` `my own name as business name`;
  - `:118` `choosing a business name`;
  - `:1236` `can i run my business from home`;
  - `:2390` `kan ek my besigheid van die huis af bedryf`.
- `content-meta/search-keywords.json:19-23`.

These rows pass while their first result is a page a first-time owner should not be sent to:

| Query (finished and typed) | First result | Row target position |
| --- | --- | --- |
| `business name` | `/business-toolkit/core/vehicles/` ("Vehicles and your business") | 2 |
| `my own name as business name` | `core/vehicles` | 2 |
| `choosing a business name` | `core/start-here#what-is-in-this-toolkit` | 3 |
| `can i run my business from home` | `/business-toolkit/business-types/vehicle-dealer/#dealing-from-home-with-no-yard` | 2 |
| `kan ek my besigheid van die huis af bedryf` | `/business-toolkit/af/business-types/vehicle-dealer/#dealing-from-home-with-no-yard` | 2 |

- The `business name` row was meant to catch pass 15's wrong answer. Its `notFirst` names one section, `core/vehicles#which-is-better`. The wrong answer is now the vehicles page's first entry, which has no anchor, so the guard misses it.
- `i need a business name`, `how do i get a business name` and `i want to name my business` also open `/business-toolkit/core/vehicles/`. That is the pass 15 "I want to…" class, still failing for naming.
- `can i run my business from home` is also a regression. At `84f424f` it opened `core/working-from-home-and-safety#the-short-version`. Now a dealer-only section comes first for every owner. That is the same shape as pass 15 major 3.

How to reproduce: against the built `dist/search/en.d0dcf5119e.json`, `runSearch(index, 'business name', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/core/vehicles/ | /business-toolkit/branding/branding-prompts/ | /business-toolkit/branding/already-have-your-name/` for both values of `typing`. `'can i run my business from home'` gives `/business-toolkit/business-types/vehicle-dealer/#dealing-from-home-with-no-yard` first. At `84f424f` (scratch export, same script) it gave `core/working-from-home-and-safety#the-short-version`.

Suggested fix:

- Make these rows `first`, or give them a page-level `notFirst` (`core/vehicles`, `business-types/vehicle-dealer`), and fix the ranking until they pass.
- For naming, the obvious target is `branding/branding-prompts` (or its "Prompt 3: the name"). The `business name` keyword sits on "Already have your name", a page for owners who already have one. Move it, or add a `business name` / `besigheidsnaam` bet to the naming prompts.
- For working from home, the quick answer "Can I run this from home?" fails the question rule only because its question lacks "business". Count `business` / `besigheid` as covered when the answer's page is generic, or add the bet `run business from home`.
- Add rows for the uncovered phrasings named in this report.

### major 2: a heading that holds a filler word no longer opens for its own question (regression)

File: `src/lib/search-client.ts:600-604` (filler dropped from `parts`), used by `titled` (`:681`) and `headed` (`:701`).

The filler words are dropped from the heading lift too. So a heading whose wording is the owner's question ("How to **get** the BRNC", "Do you **need** a tagline?", "Hoe om die BRNC te **kry**", "Het jy 'n slagspreuk **nodig**?") ranks no better than any section that holds the remaining word. At `84f424f` every one of these opened its own section first.

| Query | `84f424f` first | `059186f` first (section's position) |
| --- | --- | --- |
| `how do i get a brnc`, `how to get the brnc`, `i need a brnc`, `get brnc` (finished and typed) | `core/vehicles#how-to-get-the-brnc` | `/business-toolkit/glossary/#brnc` (3rd) |
| `hoe kry ek 'n brnc`, `brnc kry` (finished) | `core/vehicles#how-to-get-the-brnc` | `/business-toolkit/af/glossary/#brnc` (3rd) |
| `do i need a tagline`, `do you need a tagline`, `need a tagline` (finished and typed) | `branding/already-have-your-name#do-you-need-a-tagline` | `/business-toolkit/branding/branding-prompts/#the-test-that-matters-most` (3rd) |
| `het ek 'n slagspreuk nodig`, `slagspreuk nodig` (finished) | the same section | `/business-toolkit/af/branding/branding-prompts/#the-test-that-matters-most` (3rd) |
| `ek moet voorlopige belasting betaal` | `core/tax-and-sars#provisional-tax` | `lookup/glossary#provisional-taxpayer` (section 2nd) |

The glossary BRNC entry says only what a BRNC is. The owner asked how to get one.

The heading self-rank sweep (every section or quick answer whose heading holds a filler word, queried by its heading) found more losses:

- English: 6 worse, 1 better. Besides the two above: "Do you need a licence" (retail) from 2nd to 5th.
- Afrikaans: 6 worse, 1 better. Also "Hoe om dit te kry" (food) from 1st to 5th, and "Verander: wegwysers na die nuwe lêer" from 1st to 2nd.

How to reproduce: against the built index, `runSearch(en, 'how do i get a brnc', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/glossary/#brnc | /business-toolkit/core/vehicles/#after-you-have-the-brnc | /business-toolkit/core/vehicles/#how-to-get-the-brnc`. `'do i need a tagline'` gives `/business-toolkit/branding/branding-prompts/#the-test-that-matters-most` first. `runSearch(af, 'hoe kry ek n brnc', 'af', …)` gives `/business-toolkit/af/glossary/#brnc` first. The same script on the `84f424f` export gives the section first.

Suggested fix: drop filler words from the all-words query, as now, but let the heading lift and the title rule credit a heading that also holds the query's filler words as written. For example, compute `headed` twice, with `raw` and with `parts`, and promote the `raw` set first. A heading that "happens to say I need" is then lifted only when the owner said "I need" too. Re-run the pass 15 rows: `start/how-to-use#path-3-i-need-one-specific-answer` must stay out of `I need to pay tax`, so check that its heading does not hold every remaining word. Add rows: `how do i get a brnc` and `hoe kry ek 'n brnc` → `core/vehicles#how-to-get-the-brnc` first; `do i need a tagline` and `het ek 'n slagspreuk nodig` → `branding/already-have-your-name#do-you-need-a-tagline` first.

### major 3: "license" is a whole word of the guide, so every "license" query loses the licence page (regression, whole class)

File: `src/lib/search-client.ts:612-616` (`whole`) and `:467` (`leaf`, no fuzzy for a whole word).

"license" appears in the guide once, as a verb in the vehicle dealer page ("then license the motor trade number", `04 Your kind of business/01-vehicle-dealer.md:160`). Through the short-ending rule it also reaches "licensed" and "licenses". So the new rule never reads an owner's "license", the spelling many South Africans use, as "licence". Licences are one of the guide's main tasks.

| Query (finished and typed) | `84f424f` first | `059186f` first (top 3) |
| --- | --- | --- |
| `do i need a license` | `core/what-you-need-to-sell-things` | `/business-toolkit/glossary/#fsp` (Financial Services Provider), `vehicle-dealer#how-to-apply`, `…#if-you-sell-medicines-…`; the licence page is not in the top 3 |
| `trading license` | `core/what-you-need-to-sell-things` | `/business-toolkit/glossary/#trading-name`, `#trading-stock`, … ; no licence result |
| `business license` | `glossary#businesses-act-licence` | `glossary#fsp` |
| `liquor license` | `core/what-you-need-to-sell-things#if-you-sell-alcohol` | `glossary#fsp` (alcohol 2nd) |

How to reproduce: against the built index, `runSearch(en, 'do i need a license', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/glossary/#fsp | /business-toolkit/business-types/vehicle-dealer/#how-to-apply | /business-toolkit/core/what-you-need-to-sell-things/#if-you-sell-medicines-supplements-or-health-products` for both values of `typing`. The same script on `84f424f` gives `core/what-you-need-to-sell-things` first.

Suggested fix: keep the typo reading for a whole word, but count it below the word as written, as `TYPO_SHARE` already does. `deregister` then still ranks "deregister" sections first, but `license` still reaches "licence" when nothing holds "license" in the sense meant. A smaller alternative is a spelling-variant table (`license` → `licence`, `licenses` → `licences`), or a `license` keyword on "What you need to sell things" and the licence bets. Then check that `deregister my business` still passes. Add rows: `do i need a license`, `trading license`, `business license`, `liquor license`.

### major 4: Afrikaans "ek wil 'n X hê" and "ek soek 'n X" go wrong across every task (whole class)

File: `content-meta/search-best-bets.json:19` (the Afrikaans filler list lacks `hê` and `soek`).

`ek wil 'n X hê` ("I want an X") and `ek soek 'n X` ("I'm looking for an X") are the most common Afrikaans ways to ask for a thing. `hê` and `soek` are not filler, so the bets never match. In the ranking the all-words results must also hold "hê" or "soek", which the target sections do not. Results at `059186f`, against the built index:

| Query | First result | Target |
| --- | --- | --- |
| `ek wil 'n belastingnommer hê` | `/af/core/you-are-the-business/#the-one-page-record` | "What SARS wants from a sole proprietor": not in the top 3 |
| `ek wil 'n kontrolelys hê` | `/af/branding/brand-applications-and-polish/#prompt-generate-the-file-checklist-for-your-brand` | master checklist: not in the top 3 |
| `ek wil 'n faktuur hê` (finished) | `/af/branding/branding-prompts/#if-you-have-or-will-have-a-pty-ltd` | invoice template 2nd |
| `ek wil 'n kwotasie hê`, `ek wil 'n kwitansie hê` | a branding section, or "What the law requires either way" | template 2nd / 3rd |
| `ek wil 'n lisensie hê` | `glossary#fsp` | licence page not in the top 3 |
| `ek wil 'n bankrekening hê` | `core/you-are-the-business#sole-proprietor` | "Besigheidsbankrekening": not in the top 3 |
| `ek wil 'n privaatheidskennisgewing hê` | `core/register#popia-register-your-information-officer` | template 3rd |
| `ek soek 'n faktuur` | `/af/core/adding-new-lines/#what-the-law-requires-either-way` | invoice template: not in the top 3 |
| `ek soek 'n kwotasie` | `branding-prompts#what-the-ai-cannot-do-…` | quotation template: not in the top 3 |

The set's Afrikaans rows use `ek het 'n X nodig` and `ek wil X verb`, which pass. So nothing guards this class.

How to reproduce: against the built `dist/search/af.d2e32c434e.json`, `runSearch(af, 'ek wil n belastingnommer hê', 'af', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/af/core/you-are-the-business/#the-one-page-record | …#what-the-ai-cannot-do-and-what-you-must-do-yourself | …vehicle-dealer/#quick-answer-what-you-must-have` for both values of `typing`. `'ek soek n faktuur'` gives `/business-toolkit/af/core/adding-new-lines/#what-the-law-requires-either-way` first.

Suggested fix: add `hê` and `soek` to the Afrikaans filler list (and English `looking`, `like`, if you check them the same way). First confirm that no heading needs them: "Wat jy moet hê" style headings would hit major 2's issue, so fix major 2 first. Add rows for each query in the table, typed and finished.

### major 5: `vehicle` opens the sources register, and every swap typo of "vehicle dealer" does too (regression)

File: the ranking change in `src/lib/search-client.ts:467-482` (`leaf` with `whole` and `singulars`). `lookup/sources` is not in `DOC_WEIGHT` (`src/lib/search/options.ts:75`).

| Query (finished and typed) | `84f424f` first | `059186f` first |
| --- | --- | --- |
| `vehicle` | `business-types/vehicle-dealer` | `/business-toolkit/sources/#vehicle-dealing-and-vehicles-generally` |
| `vehicle daeler`, `vehicle deaelr`, `vehicle dealre`, `vehicle delaer`, `vehicle edaler` | `business-types/vehicle-dealer` | `/sources/#vehicle-dealing-and-vehicles-generally` |

An owner's bare `vehicle` should open "Vehicles and your business". It now opens the list of the guide's references. At the old tip it opened the dealer page, also not ideal. The typo sweep counts the swap typos among its 37 non-`services and trades` new misses.

How to reproduce: against the built index, `runSearch(en, 'vehicle', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/sources/#vehicle-dealing-and-vehicles-generally | /business-toolkit/business-types/vehicle-dealer/ | …#when-you-sell-a-vehicle-out` for both values of `typing`. On `84f424f` it gives `business-types/vehicle-dealer` first. The sweep copy with a miss list prints `MISS en F "vehicle daeler" -> /sources/#vehicle-dealing-and-vehicles-generally want /business-types/vehicle-dealer/`.

Suggested fix: the sources register is about where facts come from, like "How this was made". Give `lookup/sources` a reduced `DOC_WEIGHT` (and demote it like `aboutGuide` unless its heading is asked for), or let `vehicle` count the plural "vehicles" as written, so "Vehicles and your business" leads. Add rows: `vehicle` and `voertuig` → `core/vehicles`; `vehicle dealer` already has one.

### minor 1: single phrasings that miss (new rows)

None of these is in the set, and none is a regression. Each becomes a row, in the fix that makes it pass:

- `I want to send an invoice` → `branding/marketing-prompts#prompt-3-whatsapp-messages-you-send-every-week` (the invoice template is not in the top 3). `i want to give a quote` → `paperwork/templates/privacy-notice#why-we-collect-it`. `i need to send a quote` → the WhatsApp prompt first, quotation 2nd.
- `how do i register a pty ltd`, `register a pty ltd`, `register pty ltd` → `core/running-a-pty-ltd` (the ongoing duties), with `core/register` not in the top 3. `how do i open a company` → `core/running-a-pty-ltd#records-the-company-must-keep`. `hoe registreer ek 'n pty ltd` → `core/running-a-pty-ltd`.
- `ek wil 'n bankrekening oopmaak` and `bankrekening oopmaak` (the joined verb) → `glossary#shapid`; Besigheidsbankrekening is not in the top 3. `ek wil my besigheid toemaak` and `ek wil my besigheid afsluit` → `/af/core/vehicles/`. `hoe noem ek my besigheid` → `core/register#two-trade-offs-nobody-mentions`.
- `how long must i keep records` → `paperwork/templates/privacy-notice#how-long-we-keep-it` (a template placeholder section).

How to reproduce: the same `runSearch` call against the built index; for example `'I want to send an invoice'` gives `/business-toolkit/branding/marketing-prompts/#prompt-3-whatsapp-messages-you-send-every-week` first, and `'ek wil my besigheid toemaak'` gives `/business-toolkit/af/core/vehicles/` first.

Suggested fix: add these rows. `register pty ltd` / `registreer pty ltd` and `close business` / `toemaak` / `oopmaak` can join the existing register, closing and bank account bets.

### minor 2: "what is X" now leads with a quick answer instead of X's definition

File: `src/lib/search-client.ts:752-763` (the question rule).

`what is the small claims court`, `what is a proof of payment` and `what is a loan account` count as questions (three dropped words). So the quick answers "Can I use the Small Claims Court?", "Someone sent a proof of payment, can I release the goods?" and "What is a director's loan account?" lead. At `84f424f` the glossary entry was first; it is now second. Each answer is relevant, so I judge this a minor, but it goes against `docs/design-system.md` ("a term … keeps its glossary entry first").

How to reproduce: against the built index, `'what is the small claims court'` gives `/business-toolkit/core/you-are-the-business/ | /business-toolkit/glossary/#small-claims-court | …`. At `84f424f`, `lookup/glossary#small-claims-court` is first.

Suggested fix: do not count `what` / `wat` + `is` as dropped words for the question rule when the remaining words name a glossary term exactly. Or document that "what is X" opens the quick answer. Add a row either way.

### minor 3: typos of "services and trades" open the checklist entry before the page

File: the ranking (no single line); the drop is shown by `scripts/search-typo-sweep.ts`.

200 of the 237 new sweep misses are typos of `services`/`dienste` in `services and trades` / `dienste en ambagte`. For example, `srvices and trades`, `servces and trades` and `sevices and trades` now open `lookup/checklist#services-and-trades` and put `business-types/services-trades` second. `services and trade` opens `…#consumer-law-on-services`. The correct spelling still opens the page. The checklist entry is the same subject and lists that type's tasks, so an owner is not misled. I judge it not a real owner regression. The page should still win, as it does for the other business types.

How to reproduce: `runSearch(en, 'srvices and trades', 'en', { limit: 3, typing: false }, BASE)` gives `lookup/checklist#services-and-trades` first. At `84f424f` it gives `business-types/services-trades`.

Suggested fix: when a page's first entry and another entry tie on a title match, prefer the page entry (the reading-order tie-break already used by `titled`). Add a row: `srvices and trades` → `business-types/services-trades` first.
