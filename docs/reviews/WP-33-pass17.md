# WP-33 review pass 17 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 16.
- **Date:** 7 October 2026
- **Commit reviewed:** `3656fef` ("docs(search): document the pass 16 rules and the firstIn field"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b..3656fef`, the whole package. I looked hardest at `git diff c4932e3..3656fef`: `fbabb08` (`firstIn`, the strengthened rows, the full-query heading lift, plurals in headings, `SPELLINGS`, the new filler words, `REFERENCE_WEIGHT`, the new best bets and the cap of 80, the question and "what is" rules) and `3656fef` (docs).
- **The bar:** a major is a failing acceptance row, a regression against `c4932e3`, a whole class of query going wrong, a broken rule, or a weak acceptance set (`docs/testing.md`, "Search acceptance set").

## Verdict

**Not clean: 0 blockers, 5 majors, 1 minor, 0 nits.**

Every acceptance row passes, finished and typed (inside the 2237 tests of `pnpm test`). The build, the typo sweep, e2e and a11y are green. Most pass 16 findings are fixed as asked:

- `business name`, `i need a business name`, `how do i get a business name`, `my own name as business name` open "Prompt 3: the name".
- `can i run my business from home` opens Working from home.
- `how do i get a brnc` and `do i need a tagline` open their own sections.
- `do i need a license`, `trading license`, `liquor license` reach the licence page.
- `ek wil 'n faktuur hê`, `ek soek 'n kwotasie`, `ek wil 'n bankrekening hê` and `ek wil 'n privaatheidskennisgewing hê` open the right template or section.
- `vehicle` and `voertuig` open "Vehicles and your business".
- `what is the small claims court` opens the glossary entry.

The majors are:

1. A regression across a whole class: the sources register now loses "where does this come from" and source queries (`source`, `bronne`, `waar kom dit vandaan`, `companies act`). "UIF: sources disagree" leads instead. No row guards this.
2. The Afrikaans business-name class still opens "Vehicles and your business". The pass 16 fix (a best bet) covers English only. The Afrikaans set has two naming rows, against eight in English.
3. Pass 16 major 2's provisional tax regression is not fixed. Its row was loosened to accept it. `how do i pay provisional tax`, `i need to pay provisional tax` and their Afrikaans forms open the "Provisional taxpayer" definition.
4. Weak rows. `home office deduction` lets "The turnover tax trap" (a professional-services section) come first. The two Afrikaans "want/looking for a licence" rows let a glossary entry come first for a task phrasing. That goes against the `firstIn` definition in `docs/testing.md`.
5. A documented rule does not hold: "what is" plus a glossary term does not open the glossary entry for `pty ltd`, `sole proprietor` or `tax invoice`, in either language.

## Gate results

I ran all of these myself on `3656fef`. The logs are in the shared scratchpad under `wp33-review17-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0 ("Done in 2.5s using pnpm v11.22.0").
- `pnpm gate:fast` (`wp33-review17-gatefast.log`): exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "- 0 errors", "- 0 warnings", "- 0 hints".
  - Vitest unit and dom: "Test Files  37 passed (37)", "Tests  2237 passed (2237)".
  - "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  34 passed (34)".
- `pnpm build` (`wp33-review17-build.log`): exit 0, "96 page(s) built in 3.19s".
  - "search:build: en.618c43ebb2.json: 945 entries, 746.4 KB raw, 166.8 KB gzip" and "search:build: af.8d3e365931.json: 951 entries, 809.1 KB raw, 183.8 KB gzip".
  - "dist:audit: 96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - "dist:trust: 72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - "dist:budget: largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 20.3 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 14.2 KB gzip (shared chunks counted once)."
  - These match `docs/testing.md` (20.3 KB, 14.2 KB, 166.8 / 183.8 KB) and the ADR.
- `pnpm search:typos` (`wp33-review17-typos.log`): exit 0: "search:typos: of 58672 one-keystroke typos, 53294 open the correct spelling's first result and 57498 one of its first three." This matches the ADR's pass 16 note.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4821`, default reporters, `wp33-review17-e2e.log`): **555 passed, 85 skipped** (4.5 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4821/business-toolkit/` and "Running 640 tests using 2 workers".
  - `grep -c ✘` gives 0, so the failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4822`, `wp33-review17-a11y.log`): **196 passed** (3.2 min, exit 0). The log says `Local    http://127.0.0.1:4822/business-toolkit/` and "Running 196 tests using 2 workers". It has no `✘` line.
  - I ran no probe while e2e or a11y ran. All in-memory and built-index probes ran after the build and before e2e started.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.** Since `c4932e3`, `src/` changed only in `src/lib/search-client.ts` and `src/lib/search/options.ts`. They add no `href="/` literal, no `localStorage`, no `innerHTML`, no literal colour and no UI string. No rule in `CLAUDE.md` is broken.

## How I ran queries

- **In memory.** I built both indexes the way `tests/unit/search/acceptance.test.ts` does (`loadIndexInput`, `buildEntries`, `serialiseIndex` with the resolved bets) and ran `runSearch` with `typing: false` and `typing: true`, limit 3. I ran the same script against an export of `c4932e3` (`git archive` into the scratchpad, never into the worktree) to find regressions.
- **Against the build.** For every finding I loaded `dist/search/en.618c43ebb2.json` and `dist/search/af.8d3e365931.json` (the files the browser fetches) with `loadIndex` and ran the queries with base `/business-toolkit/`. The hrefs quoted below come from that run (`wp33-review17-dist-probe.log`).
- **Regression sweep.** Every entry title in both languages as a query, finished and typed, old against new, with the entry's own rank. 8 got worse and 27 better. The 8 are all small: sources sections `b-bbee` and `popia` drop from 2nd to 3rd or 3rd to 4th behind their glossary entries, and the typed Afrikaans retail "Het jy 'n lisensie nodig?" drops from 2nd to 3rd. The full-query heading lift did not cost any heading its own question.

## Review items

### 1. `firstIn` and the strengthened rows

The check in `acceptance.test.ts:142-148` is right: any first result outside the target and `firstIn` fails a `top3` row. I read all 51 `top3` rows. Most `firstIn` lists name the glossary entry of the bare term, which follows the documented term rule. These rows are weak:

- `home office deduction` (`tests/search/acceptance-queries.json:1339`);
- `ek wil 'n lisensie hê` and `ek soek 'n lisensie` (`:2969`, `:2977`);
- `ek moet voorlopige belasting betaal` (`:3075`).

Major 4 and major 3 cover them. `toetsrit` allows the whole Working from home page; its first result is that page's own entry, which is fine.

The `notFirst` rows now name whole pages where the wrong answer was a page (`core/vehicles`, `lookup/sources`, `business-types/vehicle-dealer`). I spot-checked the `first` rows for naming, closing, VAT, bank account, records, licences, vehicles and working from home against the guide. Each target is the page the guide would send a first-time owner to.

Coverage gaps:

- No row covers the sources register or "where does this come from" (major 1).
- Afrikaans naming has two rows (major 2).
- No row covers "pay provisional tax" as a task (major 3).
- The only "what is" rows are the three that pass (major 5).

### 2. The full-query heading lift and plurals

It fixes pass 16 major 2. The title sweep shows no heading losing its own question. `i need one specific answer` opens "Path 3: I need one specific answer", and `I need to pay tax` still opens Tax and SARS. `what do i need to start` now opens "Register: what you actually need" instead of "Where to start" (the keyword "start business" plus "need"). That page answers the question, so I do not count it as a regression. I found no plural lift that misleads (`trade`, `record`, `fee`, `tax`, `vehicle`).

### 3. Spellings

Every en-ZA form in `SPELLINGS` is in the English guide: licence 224, licences 28, organisation 14, organisations 2, centre 7, colour 169, colours 79, programme 2, catalogue 10, defence 6, labour 8, authorised 10, recognise 8, judgement 2, travelled 2 (whole-word counts in `docs/rsa-business-toolkit/`).

The American forms the guide itself holds are "license" (a verb, once), "licenses" (a URL slug), "color"/"Color" (two paper titles and two URLs in the sources register) and "judgment" (legal and "snap judgment"). The Afrikaans guide also holds "program", its own word. The mapping applies to the index and the query alike, so each of these is still found by its own spelling. Those words now also match their en-ZA form, which does not change what any of them means in the guide. No form code is affected: none of the 15 words is a form code or part of one, and a joined code (`saps601`) is never a key of the table. `licensed` stays as written. `license`, `licenses`, `liquor license`, `brand colors` and `colors for my logo` now open the right places.

### 4. New filler words

I tried `trade show`, `car show`, `no show`, `send money`, `give a refund`, `find a supplier`, `find my tax number`, `am i a sole proprietor`, `i am already trading`, `i am a pty ltd`, `looking after my records`, `soek werk`, `ek soek hulp` and `asseblief help`. None loses a meaning the guide covers. The guide has no trade-show content, and "no-shows" still opens the beauty bookings section. A typed two-letter filler word (`my`, `am`, `hê`) is dropped. That only means `pay my` waits for the next letter before it reaches "myself", which costs nothing.

### 5. `REFERENCE_WEIGHT`

`sources`, `where does this come from`, `where did this fact come from`, `legislation`, `national credit act` and `Companies Act 71 of 2008` (3rd, as documented) still reach the register. The singular, the Afrikaans plural, "where does this information come from", `waar kom dit vandaan` and the bare Act names do not (major 1).

### 6. New best bets

I read each new phrase and its target. All targets exist and are the guide's answer. The phrases are `register pty ltd`, `open company`, `registreer pty ltd`, `toemaak besigheid`, `afsluit besigheid`, `bankrekening oopmaak`, `dividend(s)` / `dividend(e)`, `run business from home`, `besigheid van die huis af bedryf`, `vehicle(s)` / `voertuig` / `voertuie`, `need brnc` / `brnc nodig`, `business name` / `choose business name` / `choosing business name` / `noem besigheid`, and `keep records` / `how long to keep records` / `rekords hou` / `hoe lank rekords hou`.

I found no hijack:

- `dividends tax` and `dividend tax` still open the Dividends tax glossary entry.
- `vehicle finance` still opens "Floor plan finance".
- `register a pty ltd for vat`, `open a company bank account` and `change my business name` fall through to the ranking.

The cap of 80 holds, since the build passes. The gap is that the naming bet has no Afrikaans phrase for the most common Afrikaans phrasing (major 2).

### 7. The rule changes

- **A quick answer asked word for word comes before a best bet.** `what must my invoice show` opens the quick answer. `do i need a company` leads with "Do I need to register a company?", which targets Register, the bet's target too.
- **A repeated phrase word.** `my own name as business name` matches `business name`. I found no query where an extra phrase word changes the target.
- **"What is" plus a glossary term.** This works for `small claims court`, `proof of payment`, `loan account`, `vat`, `popia`, `brnc`, `cipc` and `sars`, but not for `pty ltd`, `sole proprietor` or `tax invoice` (major 5).

## Findings

### major 1: source and "where does this come from" queries lose the sources register (regression, whole class)

Files: `src/lib/search/options.ts:74-76` (`REFERENCE_WEIGHT`, `lookup/sources: 0.5`), applied to every entry of the page in `src/lib/search-client.ts:596-599`; `tests/search/acceptance-queries.json` (no row).

Halving every entry of the register, its page entry included, drops it below "UIF: sources disagree" and below other pages for the ways owners ask where a fact comes from. The brief asks that "sources", "Companies Act" and "where does this come from" still reach the register. Several do not:

| Query (finished and typed unless noted) | `c4932e3` first | `3656fef` first (register position) |
| --- | --- | --- |
| `source` | `lookup/sources` | `/business-toolkit/core/paying-yourself/#uif-sources-disagree` (2nd) |
| `what is the source` | `lookup/sources` | `…/core/paying-yourself/#uif-sources-disagree` (2nd) |
| `bronne` | `lookup/sources` | `/business-toolkit/af/core/paying-yourself/#uif-sources-disagree` (2nd) |
| `wat is die bron` (typed) | `lookup/sources` | `…/af/core/paying-yourself/#uif-sources-disagree` (2nd) |
| `where does this information come from` | `lookup/sources` | `/business-toolkit/glossary/#information-officer` (2nd) |
| `waar kom dit vandaan` | `lookup/sources#how-to-use-this-file` | `/business-toolkit/af/branding/branding-prompts/#prompt-0-the-business-brief` (not in top 3) |
| `companies act` | `glossary#trading-stock`, register 2nd and 3rd | `glossary#trading-stock`; register not in top 3 |
| `references` | `lookup/sources#branding-tools-referenced` | `/business-toolkit/templates/invoice/#payment-details` (not in top 3) |
| `foodstuffs act` (finished) | `business-types/food#the-wider-law`, register 2nd and 3rd | the same first; register not in top 3 |

"UIF: sources disagree" is about UIF only. An owner who asks for the source, in either language, gets a UIF section first. `waar kom dit vandaan` is the Afrikaans form of `where does this come from`, which still works in English. It now opens the business brief prompt.

How to reproduce: against the built `dist/search/af.8d3e365931.json`, `runSearch(af, 'bronne', 'af', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/af/core/paying-yourself/#uif-sources-disagree | /business-toolkit/af/sources/ | /business-toolkit/af/start/start-here/#read-this-first` for both values of `typing`. `'waar kom dit vandaan'` gives `/business-toolkit/af/branding/branding-prompts/#prompt-0-the-business-brief | /business-toolkit/af/start/how-to-use/#path-3-i-need-one-specific-answer | /business-toolkit/af/branding/branding-prompts/#prompt-3-the-name`. Against `en.618c43ebb2.json`, `'source'` gives `/business-toolkit/core/paying-yourself/#uif-sources-disagree | /business-toolkit/sources/ | …`. The same in-memory script on the `c4932e3` export gives `lookup/sources` first for each.

Suggested fix:

- Weigh down only the register's sections, not its page entry. Its title "Sources and verification register" is what a source query names, and the "Vehicle dealing and vehicles generally" problem came from a section.
- Or give the register page keywords (`source`, `where does this come from`; `bron`, `bronne`, `waar kom dit vandaan`).
- Add rows: `source`, `sources`, `bronne`, `bron`, `where does this come from`, `waar kom dit vandaan`, `where does this information come from` → `lookup/sources` first. Add `companies act` → top 3 with the register's Legislation entry, or a documented `firstIn`.

### major 2: the Afrikaans business-name class still opens "Vehicles and your business"

Files: `content-meta/search-best-bets.json:233-239` (the naming bet: English `business name`, `choose business name`, `choosing business name`; Afrikaans only `noem besigheid`); `content-meta/search-keywords.json:19-23` (`besigheidsnaam` on "Already have your name"); `tests/search/acceptance-queries.json:2682`, `:2690` (the only two Afrikaans naming rows besides the already-named ones).

Pass 16 major 1 found that the naming family opened `core/vehicles`. The fix is a best bet in English. Every English phrasing I tried now opens "Prompt 3: the name", including `i need a name for my business`, `looking for a business name`, `find a name for my business`, `new business name` and `how do i choose a business name`. The Afrikaans equivalents do not:

| Query | First result (built index) |
| --- | --- |
| `ek het 'n naam vir my besigheid nodig` (finished) | `/business-toolkit/af/core/vehicles/` |
| `ek het 'n naam vir my besigheid nodig` (typed) | `/business-toolkit/af/start/how-to-use/#path-3-i-need-one-specific-answer` |
| `ek wil 'n naam vir my besigheid hê` (finished and typed) | `/business-toolkit/af/core/vehicles/` (at `c4932e3`: the dealer's "Quick answer: what you must have", also wrong) |
| `ek soek 'n besigheidsnaam`, `ek wil 'n besigheidsnaam hê`, `nuwe besigheidsnaam` | `/business-toolkit/af/branding/already-have-your-name/`, the page for owners who already have a name |

`ek het 'n X nodig` and `ek wil 'n X hê` are the two Afrikaans forms the set uses for every other task. The naming task has eight English rows and two Afrikaans ones, so the set cannot catch this. `besigheidsnaam` (a `first` row to "Already have your name") and English `business name` (a `first` row to "Prompt 3: the name") now expect different pages for the same word.

How to reproduce: against the built `dist/search/af.8d3e365931.json`, `runSearch(af, "ek het 'n naam vir my besigheid nodig", 'af', { limit: 3, typing: false }, '/business-toolkit/')` gives `/business-toolkit/af/core/vehicles/ | /business-toolkit/af/branding/branding-prompts/ | /business-toolkit/af/business-types/vehicle-dealer/#layer-2-getting-vehicles-registered-to-the-business`. `"ek wil 'n naam vir my besigheid hê"` gives `/business-toolkit/af/core/vehicles/` first for both values of `typing`. `"ek soek 'n besigheidsnaam"` gives `/business-toolkit/af/branding/already-have-your-name/` first.

Suggested fix:

- Give the Afrikaans naming bet the phrasings the English one has, for example `naam besigheid`, `besigheidsnaam` and `kies besigheidsnaam`. Check that the words `ek`, `het` and `vir` are dropped, so that `ek het 'n naam vir my besigheid nodig` and `ek wil 'n naam vir my besigheid hê` match. If they are not, add a phrase that holds them.
- Decide once whether a bare `business name` / `besigheidsnaam` means "I need one" (Prompt 3) or "I have one" (Already have your name), and make both languages' rows agree.
- Add Afrikaans rows for each query in the table, finished and typed.

### major 3: "pay provisional tax" opens the "Provisional taxpayer" definition, and its row was loosened to accept it (pass 16 major 2 not fixed)

Files: `tests/search/acceptance-queries.json:3073-3080` (the row, `top3` with `firstIn: ["lookup/glossary#provisional-taxpayer"]`, `from: "pass 16 major 2"`); the ranking (no single line).

Pass 16 major 2 listed `ek moet voorlopige belasting betaal` as a regression: at `84f424f` it opened `core/tax-and-sars#provisional-tax`, at `059186f` the glossary entry. The fix added a row that allows the glossary entry first. The query is a task ("I must pay provisional tax"), not a term, so the documented term rule does not cover it. The same holds for the whole class, in both languages:

| Query (finished and typed) | First result | "Provisional tax" section |
| --- | --- | --- |
| `ek moet voorlopige belasting betaal` | `/business-toolkit/af/glossary/#provisional-taxpayer` | 2nd |
| `hoe betaal ek voorlopige belasting` | `/business-toolkit/af/glossary/#provisional-taxpayer` | 2nd |
| `how do i pay provisional tax` | `/business-toolkit/glossary/#provisional-taxpayer` | 2nd |
| `i need to pay provisional tax`, `i must pay provisional tax` | `/business-toolkit/glossary/#provisional-taxpayer` | 2nd |

The bare term `provisional tax` / `voorlopige belasting` correctly opens the section. Adding "how do I pay" moves a definition of the person, not the tax, ahead of the section that says how to pay.

How to reproduce: against the built `dist/search/en.618c43ebb2.json`, `runSearch(en, 'how do i pay provisional tax', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/glossary/#provisional-taxpayer | /business-toolkit/core/tax-and-sars/#provisional-tax | /business-toolkit/core/tax-and-sars/#route-3-turnover-tax` for both values of `typing`. Against `af.8d3e365931.json`, `"ek moet voorlopige belasting betaal"` gives `/business-toolkit/af/glossary/#provisional-taxpayer` first.

Suggested fix: find why "pay" / "betaal" moves the glossary entry ahead of the section. I did not trace it; the definition's text holding "pay" is one guess. Fix it at the rule, for example by letting the term rule apply only when the query is the term alone. Make the Afrikaans row `first` without `firstIn`, and add rows for `how do i pay provisional tax`, `i need to pay provisional tax` and `hoe betaal ek voorlopige belasting`.

### major 4: weak rows let a page on another subject come first

Files: `tests/search/acceptance-queries.json:1337-1344` (`home office deduction`), `:2967-2982` (`ek wil 'n lisensie hê`, `ek soek 'n lisensie`); `docs/testing.md:229-231` (the `firstIn` definition).

`docs/testing.md` says `firstIn` names "the glossary entry or 'Words used' definition of the same term, or another entry on the same subject". These rows break that:

- **`home office deduction`** allows `business-types/professional-creative#the-turnover-tax-trap` first, and that is what comes first, finished and typed (also for `home office`). That section is about professional services being excluded from turnover tax. It mentions the home office deduction once, in its last line. A sole proprietor who works from home is sent to a section for consultants and designers. Two sections on the subject itself exist: Working from home's "Home office deduction" (2nd) and the same page's "The home office deduction" (3rd). The `firstIn` was chosen to fit the current first result, so the row cannot catch this wrong answer.
- **`ek wil 'n lisensie hê`** and **`ek soek 'n lisensie`** ("I want a licence", "I'm looking for a licence") allow `glossary#businesses-act-licence` first. That is a task phrasing, and the entry defines one licence that applies to some trades only. The English `do i need a license` row is `first` to "What you need to sell things". English `i want a licence` and `looking for a licence` also open the glossary entry, and no row covers them.

How to reproduce: against the built index, `runSearch(en, 'home office deduction', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/business-types/professional-creative/#the-turnover-tax-trap | /business-toolkit/core/working-from-home-and-safety/#home-office-deduction | /business-toolkit/business-types/professional-creative/#the-home-office-deduction`. `runSearch(af, "ek wil 'n lisensie hê", 'af', …)` and `runSearch(en, 'i want a licence', 'en', …)` give the `#businesses-act-licence` glossary entry first.

Suggested fix: make `home office deduction` a `first` row (Working from home's section), or allow only `business-types/professional-creative#the-home-office-deduction` in `firstIn`. Then fix the ranking: the turnover tax trap wins on body text only. Make the two Afrikaans licence rows `first` to `core/what-you-need-to-sell-things`, add `i want a licence` / `looking for a licence`, and fix the ranking so a task phrasing of a term reaches the page, as `do i need a license` does. Add a check that every `firstIn` place is a glossary or `term` entry, or a section on the target page, so a `firstIn` cannot quietly admit another subject.

### major 5: "what is" plus a glossary term does not open the glossary entry for `pty ltd`, `sole proprietor` or `tax invoice` (documented rule does not hold)

Files: `docs/design-system.md:483-485` ('"What is" plus a glossary term … is a definition, not a question: the glossary entry leads'); `src/lib/search-client.ts:788-799` (`namesTerm` only turns the question rule off).

The rule is documented without conditions. The code only stops the question rule. A page title or a lifted heading that names the term still leads:

| Query (finished and typed) | First result | Glossary entry |
| --- | --- | --- |
| `what is a pty ltd`, `wat is 'n pty ltd` | `/business-toolkit/core/running-a-pty-ltd/` | 2nd (`glossary/#pty-ltd`, term "Pty Ltd") |
| `what is a sole proprietor`, `wat is 'n eenmansaak` | `/business-toolkit/core/register/#sole-proprietor-trading-as-yourself` | 2nd (`glossary/#sole-proprietor`) |
| `what is a tax invoice`, `wat is 'n belastingfaktuur` | `/business-toolkit/templates/tax-invoice/` | 2nd (`glossary/#tax-invoice`) |

The pages that lead are on the subject, so an owner is not misled. But the documented rule does not hold, and the set has "what is" rows only for the three terms that pass (`small claims court`, `proof of payment`, `loan account`). Not a regression: `c4932e3` gives the same.

How to reproduce: against the built `dist/search/en.618c43ebb2.json`, `runSearch(en, 'what is a pty ltd', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/core/running-a-pty-ltd/ | /business-toolkit/glossary/#pty-ltd | /business-toolkit/core/running-a-pty-ltd/#your-pty-ltd-annual-checklist` for both values of `typing`. `'what is a sole proprietor'` and `'what is a tax invoice'` give the section and the template first.

Suggested fix: either make the rule hold, by putting the glossary entry first when `namesTerm` is true (as `titled` is put first), or narrow the sentence in `docs/design-system.md` to what the code does ("is not treated as a question"). Add rows for the three terms in both languages with the chosen expectation.

### minor 1: single phrasings that miss (new rows)

Neither is in the set, and neither is a regression:

- `what should i call my business` → `/business-toolkit/core/working-from-home-and-safety/#part-2-doing-business-by-phone-whatsapp-and-voice-note`. "Prompt 3: the name" is not in the top 3.
- `naming my business` → `/business-toolkit/business-types/food/#branding-and-marketing-notes`, with `core/vehicles#how-to-get-the-brnc` second.

How to reproduce: the same `runSearch` call against the built index, finished and typed.

Suggested fix: add both as rows to `branding/branding-prompts`. `call business` and `naming business` can join the naming bet.
