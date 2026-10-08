# WP-33 review pass 19 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 18.
- **Date:** 7 October 2026
- **Commit reviewed:** `733195e` ("docs(search): document act names, the source words and onlyLang"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b..733195e`, the whole package. I looked hardest at `git diff 9b9de1e..733195e`: `09bcfcf` (Act names from the register data plus `content-meta/search-act-names.json`, the four source words, the new bets, the whole-heading lift rules, `se` as filler, the two-stop-word question rule, the `onlyLang` parity check, the generated `search:diff` corpus) and `733195e` (docs).
- **The bar:** a major is a failing acceptance row, a regression against `8597126`, a whole class of query going wrong, a broken rule, or a weak acceptance set (`docs/testing.md`, "Search acceptance set").

## Verdict

**Not clean: 0 blockers, 5 majors, 4 minors, 1 nit.**

Every acceptance row passes, finished and typed (inside the 2482 tests of `pnpm test`). The build, the typo sweep, e2e and a11y are green. The pass 18 findings are fixed as asked:

- `come up with a name`, `how do i come up with a business name`, `official name`, `official business name` and `official invoice` no longer open the sources register. Af `verwysing` opens the tax invoice's "Payment details".
- `employment law`, `what the law requires`, `regulations for food`, `small claims court act`, `law`, `regulations` and af `wat die wet vereis`, `regulasies vir kos` open the guide's own section, not a register entry.
- The Act rows name `#legislation-this-toolkit-relies-on`, and the Afrikaans set has the Act, step-aside and `pty ltd` rows.
- `sole proprietor bank account` opens "Business bank account"; `vat for a sole proprietor` and `btw vir 'n eenmansaak` open "VAT: probably not yet"; `hoe kom ek aan 'n besigheidsnaam` and `my besigheid se naam` open "Prompt 3: the name"; af `Wat ingesluit is` opens its own section; `maatskappywet`, `verbruikersbeskermingswet` and `privaatheidswet` open the Legislation entry.

The majors:

1. Five phrases removed from the best bets to stay under the cap of 80 do not open their target by ranking (`dividends`, `kies naam besigheid`, `maatskappybelastingkoers` typed). Nothing guards them.
2. Afrikaans owners cannot reach most Acts by their Afrikaans name. Several of these names now open an unrelated section where they used to open the register (`wet op besighede` → notional input tax). Two open the NHBRC glossary entry.
3. The Act-name match ignores word order, so `can i act as a company`, `act for a company`, `act on credit` and `act on food` read as Act names. The documented rule says "exactly an Act's name".
4. A law word next to a guide noun now opens worse places than at `8597126`: `tax law`, `sars law`, `sars regulations`, `by-laws`, `licensing law`, af `lisensie wet`, `rekords wet` and `regulasies vir sars`.
5. Two of the new ranking rules cause regressions. The business-type tie-break demotes a business-type page below the checklist (`vehicle dealer business`). Making `se` a filler word sends `maatskappy se naam` to "Adding new lines".

## Gate results

I ran all of these myself on `733195e`. The logs are in the shared scratchpad under `wp33-review19-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0 ("Done in 2.6s using pnpm v11.22.0").
- `pnpm gate:fast` (`wp33-review19-gatefast.log`): exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "- 0 errors", "- 0 warnings", "- 0 hints".
  - Vitest unit and dom: "Test Files  37 passed (37)", "Tests  2482 passed (2482)".
  - "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  34 passed (34)".
- `pnpm build` (`wp33-review19-build.log`): exit 0.
  - "search:build: en.dba81b2794.json: 945 entries, 748.2 KB raw, 167.2 KB gzip" and "search:build: af.cef7f4b8d5.json: 951 entries, 811.4 KB raw, 184.4 KB gzip".
  - "dist:audit: 96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - "dist:trust: 72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - "dist:budget: largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 20.8 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 14.7 KB gzip (shared chunks counted once)."
  - These match `docs/testing.md` (20.8 KB, 14.7 KB, 167.2 / 184.4 KB) and the ADR.
- `pnpm search:typos` (`wp33-review19-typos.log`): exit 0: "search:typos: of 58672 one-keystroke typos, 53433 open the correct spelling's first result and 57486 one of its first three." This matches the ADR.
- `pnpm search:diff 8597126` (`wp33-review19-diff.log`): exit 0: "search:diff 8597126: 8670 searches, 332 changed first results: 112 better, 0 worse, 2 same-target, 218 ?." This matches the ADR.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4831`, default reporters, `wp33-review19-e2e.log`): **555 passed, 85 skipped** (4.7 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4831/business-toolkit/` and "Running 640 tests using 2 workers".
  - `grep -c ✘` gives 0, so the failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4832`, `wp33-review19-a11y.log`): **196 passed** (3.5 min, exit 0).
  - The log says `Local    http://127.0.0.1:4832/business-toolkit/` and "Running 196 tests using 2 workers".
  - It has no `✘` line.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.** Since `9b9de1e`, `src/` changed only in `src/lib/search-client.ts`, `src/lib/search/options.ts` and `src/lib/search/types.ts`. They add no `href="/` literal, no `localStorage`, no `innerHTML`, no literal colour and no UI string. No rule in `CLAUDE.md` is broken.

## How I ran queries

- **In memory.** I built both indexes the way `tests/unit/search/acceptance.test.ts` does (`loadIndexInput`, `buildEntries`, `serialiseIndex` with the manifest sections and `resolveBestBets`, which now carries `acts`). I ran `runSearch` with `typing: false` and `typing: true`, limit 3. To find regressions I ran the same script against an export of `8597126`: `git archive 8597126 src scripts content-meta` into the scratchpad, never into the worktree, with `node_modules` linked.
- **Against the build.** For every finding I loaded `dist/search/en.dba81b2794.json` and `dist/search/af.cef7f4b8d5.json` with `loadIndex` and ran the queries with base `/business-toolkit/` (`wp33-review19-dist-probe.log`). The hrefs below come from that run. All probes ran after the build and before e2e started. None ran while e2e or a11y ran.
- **Sweeps.**
  - Every Act of the register by its English name, short name and alias, and by its official Afrikaans title, in both indexes (91 queries).
  - Law and source words in other senses (88 queries), and more law phrasings (44).
  - Every removed best-bet phrase, every new bet phrase and their variants (56).
  - Every section heading of two or three words with an owner's tail (`for my business`, `as a sole proprietor`, `vir my besigheid`, `as eenmansaak`, …): 700 queries, old against new.
  - Every quick-answer question in both languages (72), old against new, for the two-stop-word question rule. Nothing changed.
  - Afrikaans phrasings with `se` and `sê` (33).

## Review items

### 1. Act names

**How it works.** `scripts/search/acts.ts` reads the Acts from `src/data/<lang>/sources.json`. It strips the number and year (`actShortName`) and adds the names in `content-meta/search-act-names.json`. It ships them in the index as `acts`. `search-client.ts:921-940` puts "Legislation this toolkit relies on" first when the query's words (stop words and numbers dropped) are, as a set, the words of one name. The build fails on an unknown Act id or a name two Acts share. All of this works.

**English names.** Every register Act opens the Legislation entry by its full short name, finished and typed, in both indexes: `income tax act`, `value-added tax act` (with or without the hyphen), `companies act`, `consumer protection act`, `electronic communications and transactions act`, `protection of personal information act`, `businesses act`, `foodstuffs cosmetics and disinfectants act`, `second hand goods act`, `national road traffic act`, `national credit act`, `broad-based black economic empowerment act` and `occupational health and safety act`. The same holds with the number and year (`companies act 71 of 2008`, `companies act 2008`), and with `the` or `my` in front.

**Aliases.** Every alias in the file is right: each names the Act it is filed under. Each opens the Legislation entry: `vat act`, `company act`, `popia act`, `popi act`, `food act`, `foodstuffs act`, `road traffic act`, `credit act`, `fais act`, `b-bbee act`, `ohs act`; `inkomstebelastingwet`, `btw-wet`, `btw wet`, `maatskappywet`, `maatskappy wet`, `verbruikersbeskermingswet`, `wet op verbruikersbeskerming`, `privaatheidswet`, `besigheidswet`, `padverkeerswet`, `kredietwet`.

**Gaps.**

- The Electronic Communications and Transactions Act has no alias in either language. `ect act` opens the ECTA glossary entry, a definition, which I accept. Af `ekt-wet` and the Afrikaans title do not reach it (major 2).
- Seven other Acts have no Afrikaans name at all (major 2).
- `bee act` and `bbbee act`, the forms owners use for the B-BBEE Act, miss (major 2).

**Ordinary phrases.** No Act name is an ordinary phrase as written. But the match is order-free and drops stop words, so ordinary phrases that hold an Act's words in another order match it (major 3).

### 2. Source words

`SOURCE_WORDS` is now `source`, `sources`, `bron` and `bronne` (`options.ts:72`). The keyword lists lose `act`, `wet`, `verwysings` and the two "come from" phrases. `where does this come from`, `where does this information come from`, `waar kom dit vandaan` and `verwysings` are best bets.

The pass 18 hijacks are gone, finished and typed, on the built index: every row of major 1 of pass 18 now opens a guide page, and so does every phrasing I added (`come up with a food`, `official records`, `amptelike huis`, …). `where does this info come from`, `waar kom hierdie inligting vandaan` and `waar kom die syfers vandaan` still open the register by ranking.

`source` itself still gives the register full weight in its other senses. That is unchanged from `8597126` (minor 3).

### 3. The whole-heading lift

- **More than half of the query's words.** This fixes `sole proprietor bank account` and `eenmansaak bankrekening`. In my sweep of 700 heading-plus-tail queries, only 4 first results (finished and typed counted apart) moved away from the heading's own section, all for `branding tools referenced …`, a register heading. 5 moved to it: 2 rightly (`getting paid for my business` → You are the business's "Getting paid"), and 3 where the "own section" is a checklist heading that shares a business-type page's name (see the tie-break below).
- **Ties go to a heading that is not on a business-type page.** This fixes `home office deduction`. But it also applies when the heading is a business-type page's own title, so the checklist's same-named section wins (major 5).
- **A heading that is the query word for word leads its page.** This fixes af `Wat ingesluit is` and `Logolêers`, and I found no case where it misfires.

### 4. `se` as filler, and the question rule

- `my besigheid se naam`, `besigheid se naam`, `besigheid se bankrekening`, `cipc se jaarlikse opgawe`, `'n maand se plasings` and the vehicle "op die besigheid se naam" headings all open the right place.
- `sê` folds to `se`, so it is filler too. `wat sê sars` and `wat moet ek vir sars sê` are unchanged.
- One regression: `maatskappy se naam` (major 5).
- The question rule (two stop words, filler not counted) changes the first result of none of the 72 quick-answer questions.

### 5. The language-parity test and `onlyLang`

The test (`acceptance.test.ts:141-157`) works: it fails a row without a same-target row in the other language unless `onlyLang` gives a reason of more than 20 characters.

- **`payment reference` / `verwysing`.** Approved by the owner; both rows pass.
- **`municipal by-laws`** (`acceptance-queries.json:2023-2032`). The owner does not approve its `onlyLang`, so I report it as minor 1.

### 6. The wider `search:diff` corpus

I read all 218 `?` items and judged more than 35 of the generated phrasings, finished and typed.

- **Neutral, as the author says:**
  - `invoice act` (finished: the vehicle dealer's "Voetstoots does not protect you"; typed: the branding "Your quote and invoice");
  - `name act`, `name law`, `company law`, `trading law`, `cipc act`, `official cipc`, `official company`, `official home`, `official records`;
  - `labour regulations`, `employment regulations`, `safety act`, `safety regulations`, `uif act`, `health act`, `trading act`, `licence act`, `vehicle regulations`;
  - af `bank wet`, `naam wet`, `wat die wet oor bank sê`, `amptelike cipc`, `amptelike werk`.

  None of these is a likely first-time owner query, and the old result was a register entry, no better.
- **Better:** `uif law` and af `uif wet` → the UIF sections, `records act` → "Records the company must keep", af `kos wet` → "If you sell food", af `skoonheid wet` → the beauty licence, af `sars wet` and `belasting wet` → Tax and SARS.
- **Worse, and likely to be typed:** `tax law`, `sars law`, `sars regulations`, `by-laws`, `licensing law`, af `lisensie wet`, af `rekords wet`, af `regulasies vir sars` (major 4).

**One limit.** The corpus does not hold the old ref's best-bet phrases, so the bets removed in this commit are invisible to it (major 1).

### 7. The best-bet cap

Both languages hold exactly 80 phrases. The removed phrases: en `dividends`, `vehicles`; af `dividende`, `voertuie`, `maatskappybelastingkoers`, `maak besigheidsbankrekening oop`, `kies naam besigheid`. `which laws apply` and `come up with business name` were never bets at `8597126`.

| Removed phrase | Target | Finished | Typed |
| --- | --- | --- | --- |
| `vehicles` | `core/vehicles` | yes | yes |
| `voertuie` | `core/vehicles` | yes | yes |
| `maak besigheidsbankrekening oop` | `core/register#business-bank-account` | yes | yes |
| `dividends` | `core/paying-yourself#option-2-dividend` | **no**: the "Dividends tax" glossary entry | **no** |
| `dividende` | `core/paying-yourself#option-2-dividend` | the page, not the section | the page |
| `maatskappybelastingkoers` | `core/running-a-pty-ltd#4-sars-company-tax` | yes | **no**: "Tax: one company, several activities" |
| `kies naam besigheid` | `branding/branding-prompts#prompt-3-the-name` | **no**: "Which one should you choose" (the business structure) | **no** |

`which laws apply to me` opens a vehicles section, which it also did at `8597126` (minor 2).

## Findings

### major 1: removed best-bet phrases no longer open their target (regression)

Files: `content-meta/search-best-bets.json:166` (`maatskappybelasting` only), `:227-228` (`dividend` only), `:260-268` (the naming phrases without `kies naam besigheid`); `scripts/search-diff.ts` (corpus).

The cap of 80 forced removals. The commit says ranking covers them. For three of them it does not:

| Query | `8597126` first | `733195e` first (built index) |
| --- | --- | --- |
| `dividends` (finished and typed) | `core/paying-yourself#option-2-dividend` | `/business-toolkit/glossary/#dividends-tax` |
| af `kies naam besigheid` (finished and typed) | `branding/branding-prompts#prompt-3-the-name` | `/business-toolkit/af/core/register/#which-one-should-you-choose` |
| af `kies 'n naam vir my besigheid` (finished and typed) | `branding/branding-prompts#prompt-3-the-name` | `/business-toolkit/af/core/register/#which-one-should-you-choose` |
| af `kies naam vir besigheid` (finished and typed) | `branding/branding-prompts#prompt-3-the-name` | `/business-toolkit/af/core/register/#which-one-should-you-choose` |
| af `maatskappybelastingkoers` (typed) | `core/running-a-pty-ltd#4-sars-company-tax` | `/business-toolkit/af/core/adding-new-lines/#tax-one-company-several-activities` |
| af `wat is die maatskappybelastingkoers` (typed) | `core/running-a-pty-ltd#4-sars-company-tax` | `core/adding-new-lines#tax-one-company-several-activities` (in memory) |

- `dividends` is the plural owners type. It now opens the definition of a different tax, not the option of paying yourself a dividend.
- "Kies 'n naam vir my besigheid" ("choose a name for my business") is the Afrikaans form of the main branding task. It now opens the choice of business structure.
- `dividende` falls from the section to the page (`af/core/paying-yourself/`). The Afrikaans `dividend` row accepts the page, so I do not count it.

**Why nothing caught it.** The acceptance set has `dividend` but not `dividends`. It has `kies 'n besigheidsnaam` but not `kies naam besigheid` or `kies 'n naam vir my besigheid`. It has no `maatskappybelastingkoers` row. A removed bet loses its generated test in `index.test.ts`. The `search:diff` corpus does not hold old bet phrases.

How to reproduce: against `dist/search/en.dba81b2794.json`, `runSearch(en, 'dividends', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/glossary/#dividends-tax | /business-toolkit/core/paying-yourself/ | /business-toolkit/core/paying-yourself/#what-it-costs` for both values of `typing`. Against `af.cef7f4b8d5.json`:

- `'kies naam besigheid'` gives `/business-toolkit/af/core/register/#which-one-should-you-choose | /business-toolkit/af/start/how-to-use/#path-3-i-need-one-specific-answer | …`.
- `'maatskappybelastingkoers'` typed gives `/business-toolkit/af/core/adding-new-lines/#tax-one-company-several-activities | /business-toolkit/af/core/running-a-pty-ltd/#4-sars-company-tax`.

The in-memory script on the `8597126` export gives the old first results.

Suggested fix:

- Before removing a bet phrase, make it an acceptance row in both languages: `dividends` / `dividende` → `core/paying-yourself#option-2-dividend`, `kies naam besigheid` and `kies 'n naam vir my besigheid` → `branding/branding-prompts#prompt-3-the-name` (with an English `choose a name for my business` counterpart), `maatskappybelastingkoers` → `core/running-a-pty-ltd#4-sars-company-tax`. Then fix the ranking, or keep the bet.
- One way to free bet slots without losing phrasings: count phrases that differ only by a final `s`/`e` as one, or add `kies` to the Afrikaans filler list. "Choose" never says which page is meant, and `choose` is in neither list.
- Add the old ref's best-bet phrases and keyword phrases to the `search:diff` corpus, so a removed bet shows up as a change.

### major 2: most Acts cannot be found by their Afrikaans name; several such names regress or open unrelated entries

Files: `content-meta/search-act-names.json:5-63` (no `af` names for the ECT Act, Foodstuffs, Second-Hand Goods, FAIS, B-BBEE and OHS Acts; `besigheidswet`, `padverkeerswet` and `kredietwet` but not the official titles); `src/lib/search-client.ts:921-929` (exact word-set match, so `nasionale padverkeerswet` is not `padverkeerswet`).

The brief asks that every register Act be reachable by its common name in both languages. In Afrikaans the common names are the official Afrikaans titles. Of the 14 Acts, 6 have no Afrikaans name in the file. For 3 more, the file lists an informal compound but not the official title:

| Afrikaans title (finished and typed, built index) | `8597126` first | `733195e` first |
| --- | --- | --- |
| `wet op besighede` (Businesses Act) | `lookup/sources#business-licensing` | `/business-toolkit/af/business-types/vehicle-dealer/#how-notional-input-tax-works` |
| `nasionale padverkeerswet` (National Road Traffic Act) | `glossary#nhbrc` | `/business-toolkit/af/glossary/#nhbrc` (the home builders' council) |
| `nasionale kredietwet` (National Credit Act) | `glossary#nhbrc` | `/business-toolkit/af/glossary/#nhbrc` |
| `ekt-wet` (ECT Act) | `lookup/sources` | `/business-toolkit/af/core/adding-new-lines/#what-the-law-requires-either-way` |
| `wet op elektroniese kommunikasie en transaksies` | `core/what-you-need-to-sell-things#if-you-sell-online` | the same |
| `wet op voedingsmiddels` (Foodstuffs Act) | `lookup/sources` | `/business-toolkit/af/core/adding-new-lines/#what-the-law-requires-either-way` |
| `voedselwet` | (none) | (none) |
| `wet op tweedehandse goedere` | `lookup/sources#legislation-this-toolkit-relies-on` | `/business-toolkit/af/business-types/vehicle-dealer/#layer-1-saps-second-hand-goods-dealer-registration` |
| `wet op beskerming van persoonlike inligting` (POPIA) | `glossary#information-officer` | the same |
| `wet op beroepsgesondheid en veiligheid` (OHS Act) | `business-types/services-trades#occupational-health-and-safety` | the same |
| `wet op maatskappye` | `lookup/sources#running-a-pty-ltd-…` | `/business-toolkit/af/core/tax-and-sars/#route-4-small-business-corporation-rates-companies-only` |
| `inkomstebelasting wet` | `lookup/sources#legislation-this-toolkit-relies-on` (both) | finished the same, **typed** `/business-toolkit/af/core/tax-and-sars/#route-1-stay-under-the-tax-threshold` |
| `b-bbee-wet` | `lookup/checklist#key-to-the-short-words` | the same |
| `fais-wet` | `glossary#fais` | the same (a definition; acceptable) |

`wet op besighede`, `ekt-wet`, `wet op voedingsmiddels`, `wet op maatskappye` and `inkomstebelasting wet` (typed) regress. `nasionale padverkeerswet` and `nasionale kredietwet` open an unrelated glossary entry. That is unchanged, but these are the Acts' own Afrikaans titles. The file has `padverkeerswet` and `kredietwet`, and the extra word `nasionale` defeats the exact match.

English has the same gap for the forms owners use: `bee act` → `/business-toolkit/business-types/vehicle-dealer/#the-one-defence-that-works`, `bbbee act` → `core/register#your-registration-checklist`, `ohsa` and `nca` → no result. The acceptance set has no row for any official Afrikaans title, nor for `btw-wet`, `besigheidswet`, `padverkeerswet` or `kredietwet`, so it cannot catch this.

How to reproduce: against `dist/search/af.cef7f4b8d5.json`:

- `runSearch(af, 'wet op besighede', 'af', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/af/business-types/vehicle-dealer/#how-notional-input-tax-works | /business-toolkit/af/core/register/#popia-register-your-information-officer | …`.
- `'nasionale padverkeerswet'` gives `/business-toolkit/af/glossary/#nhbrc | /business-toolkit/af/glossary/#enatis--natis | /business-toolkit/af/glossary/#ncr`.
- `'inkomstebelasting wet'` typed gives `/business-toolkit/af/core/tax-and-sars/#route-1-stay-under-the-tax-threshold | /business-toolkit/af/sources/#legislation-this-toolkit-relies-on | …`.

The `8597126` export gives the old first results.

Suggested fix:

- Add the official Afrikaans title of every Act to `search-act-names.json`:
  - `wet op besighede`, `nasionale padverkeerswet`, `nasionale kredietwet`;
  - `wet op elektroniese kommunikasie en transaksies` and `ekt-wet`;
  - `wet op voedingsmiddels skoonheidsmiddels en ontsmettingsmiddels` with a short `wet op voedingsmiddels`;
  - `wet op tweedehandse goedere`;
  - `wet op beskerming van persoonlike inligting`;
  - `wet op beroepsgesondheid en veiligheid`;
  - `wet op breë basis swart ekonomiese bemagtiging` and `b-bbee-wet`;
  - `fais-wet`;
  - `wet op belasting op toegevoegde waarde`;
  - and `inkomstebelasting wet` (or let the match join a split compound).
- Add English `ect act`, `bee act`, `bbbee act` and `ohsa`.
- Add one acceptance row per Act per language. Better: a generated test like the glossary's `what is` test that runs every name in the names file and every register Act name, finished and typed, so a new alias cannot go untested.

### major 3: the Act-name match ignores word order, so ordinary phrases read as Act names (documented rule not holding)

Files: `src/lib/search-client.ts:921-929` (`entry.w.length === new Set(actWords).size && entry.w.every((word) => actWords.includes(word))`); `docs/design-system.md:480` and `content-meta/README.md:12` ("a query that is exactly an Act's name, in whole words").

The match compares the query's words with an Act's words as a set, after it drops stop words. So any phrasing that holds `act` and the Act's other words, in any order, opens the Legislation entry:

| Query (finished and typed, built index) | First |
| --- | --- |
| `can i act as a company` | `/business-toolkit/sources/#legislation-this-toolkit-relies-on` |
| `act for a company` | `/business-toolkit/sources/#legislation-this-toolkit-relies-on` |
| `act on credit` | `/business-toolkit/sources/#legislation-this-toolkit-relies-on` |
| `act on food` | `/business-toolkit/sources/#legislation-this-toolkit-relies-on` |
| `act on vat` | `/business-toolkit/sources/#legislation-this-toolkit-relies-on` (in memory) |

`can i act as a company` is a sole proprietor's question about trading as a company. The guide's answer is in Register and You are the business, not a list of Acts. At `8597126` these phrasings opened a register entry by the law-word lead, so this is not a regression. But this pass's design promises "exactly" an Act's name, and the code does not keep that promise. No acceptance row guards an ordinary phrase that holds `act`.

How to reproduce: against `dist/search/en.dba81b2794.json`, `runSearch(en, 'can i act as a company', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/sources/#legislation-this-toolkit-relies-on | /business-toolkit/core/running-a-pty-ltd/#records-the-company-must-keep | …` for both values of `typing`.

Suggested fix:

- Compare the query's words in order with the name's words (stop words dropped from both), so `act company` is not `company act`.
- Only then allow the trailing number and year.
- Add rows: `can i act as a company` and `act on credit` with `notFirst: ["lookup/sources"]`, with Afrikaans counterparts (`wet op krediet` is a real word order in Afrikaans, so test it).

### major 4: a law word next to a guide noun now opens a worse place (regression, `search:diff` items judged "neutral")

Files: `src/lib/search/options.ts:72` (law words are now ordinary words), `content-meta/search-keywords.json:44-48` (the register lost its law keywords); the author's classification in `docs/adr/0003-minisearch.md` ("182 neutral").

Dropping the law-word lead was right (pass 18, major 2). But with the lead gone, the law word itself is ranked like any word. `law`, `regulations` and `wet` are rare in the guide's sections, so they pull a query towards whichever section happens to hold them. Among the generated phrasings, and close variants, these are ones a first-time owner would type, and each now opens something worse than the register entry it opened at `8597126`:

| Query (built index) | `8597126` first | `733195e` first |
| --- | --- | --- |
| `tax law` | `lookup/sources#paying-yourself-from-a-company` (lists the Income Tax Act) | finished `/business-toolkit/business-types/vehicle-dealer/#how-notional-input-tax-works`, typed `core/tax-and-sars/#route-3-turnover-tax` |
| `sars law` | `lookup/sources#paying-yourself-from-a-company` | finished `/business-toolkit/paperwork/which-template-to-use-when/#template-5-privacy-notice-popia`, typed `core/tax-and-sars/#route-3-turnover-tax` |
| `sars regulations` | `lookup/sources#running-a-pty-ltd-…` | `/business-toolkit/business-types/vehicle-dealer/#imported-vehicles` |
| af `regulasies vir sars` | `lookup/sources#running-a-pty-ltd-…` | `/business-toolkit/af/business-types/vehicle-dealer/#imported-vehicles` |
| `by-laws`, `local by-laws` | `lookup/sources#business-licensing` | `/business-toolkit/branding/brand-applications-and-polish/#5-vehicle-signage` |
| `licensing law` | `lookup/sources#business-licensing` | `/business-toolkit/glossary/#fais` (financial advisers) |
| af `lisensie wet` | `lookup/sources#business-licensing` | `/business-toolkit/af/glossary/#fais` |
| af `rekords wet` | `lookup/sources#legislation-this-toolkit-relies-on` | `/business-toolkit/af/paperwork/which-template-to-use-when/#template-5-privacy-notice-popia` |
| af `wat die wet oor rekords sê` | `core/tax-and-sars#route-3-turnover-tax` | `/business-toolkit/af/paperwork/which-template-to-use-when/#template-5-privacy-notice-popia` |

A dealer's notional input tax, imported vehicles, vehicle signage, financial advisers' licences and a privacy notice are each about another subject. A register entry at least lists the law the owner asked about. `business law` (→ `business-types/food#the-wider-law`, a one-type page) is borderline.

The author judged all 218 `?` items better or neutral. I spot-checked more than 35 generated items (review item 6) and count these as worse.

How to reproduce: against `dist/search/en.dba81b2794.json`:

- `runSearch(en, 'tax law', 'en', { limit: 3, typing: false }, '/business-toolkit/')` gives `/business-toolkit/business-types/vehicle-dealer/#how-notional-input-tax-works | /business-toolkit/core/tax-and-sars/#route-3-turnover-tax | …`.
- `'by-laws'` gives `/business-toolkit/branding/brand-applications-and-polish/#5-vehicle-signage | /business-toolkit/core/vehicles/#other-things-to-check | /business-toolkit/core/what-you-need-to-sell-things/#the-general-rule`.
- `'licensing law'` gives `/business-toolkit/glossary/#fais | /business-toolkit/sources/#business-licensing | …`.

Against `af.cef7f4b8d5.json`, `'rekords wet'` gives `/business-toolkit/af/paperwork/which-template-to-use-when/#template-5-privacy-notice-popia | …`. The `8597126` export gives the old first results, and `pnpm search:diff 8597126` lists the generated ones as `?`.

Suggested fix:

- When a query has a law word (`law`, `laws`, `regulations`, `rules`, `by-laws`, `wet`, `wette`, `regulasies`, `verordeninge`) and at least one other content word, rank on the other words and let the law word only break ties. Then `tax law` ranks as `tax` (the Tax and SARS bet's page), `licensing law` as `licensing`, and `rekords wet` as `rekords` ("Records").
- Leave a bare law word as it is now.
- Give `by-laws` / `verordeninge` a keyword on `core/what-you-need-to-sell-things` ("Check your local by-laws" is in "The general rule").
- Add rows in both languages: `tax law` → `core/tax-and-sars`, `licensing law` → `core/what-you-need-to-sell-things`, `by-laws` → `core/what-you-need-to-sell-things#the-general-rule`, `rekords wet` → `core/tax-and-sars#records`, each with `notFirst` for the place it opens today.

### major 5: two of the new ranking rules regress single phrasings: the business-type tie-break and `se` as filler

**(a) The tie-break demotes the business-type page itself.** File: `src/lib/search-client.ts:830-839`. `typePage` sorts every contained heading on a `business-types/` page after one elsewhere. That includes the page's own title entry ("Vehicle dealer"). The checklist has a section with the same title, so it wins:

| Query (built index) | `8597126` first | `733195e` first |
| --- | --- | --- |
| `vehicle dealer business` (finished and typed) | `business-types/vehicle-dealer` | `/business-toolkit/checklist/#vehicle-dealer` |
| `vehicle dealer for my business` (finished and typed) | `business-types/vehicle-dealer` | `checklist#vehicle-dealer` (in memory) |
| af `dienste en ambagte vir my besigheid` (finished) | `business-types/services-trades` | `/business-toolkit/af/checklist/#services-and-trades` |

The rule was meant for a type-specific section ("Home office deduction" on Professional and creative work). An owner who names their business type wants that type's page.

**(b) `se` as filler drops the word that kept the glossary first.** File: `content-meta/search-best-bets.json:40`.

| Query (built index, finished and typed) | `8597126` first | `733195e` first |
| --- | --- | --- |
| af `maatskappy se naam` | `glossary#registered-name` | `/business-toolkit/af/core/adding-new-lines/` ("Adding new lines of business to your Pty") |
| af `my maatskappy se naam` | `glossary#registered-name` | `core/adding-new-lines` (in memory) |
| af `wat is my maatskappy se naam` | `glossary#registered-name` | `/business-toolkit/af/core/adding-new-lines/` |

English `company name` and `the company name` already open "Adding new lines" at both commits, with "Registered name" second. Making `se` a filler word brings the Afrikaans phrasing down to the same wrong place.

How to reproduce: against `dist/search/en.dba81b2794.json`, `runSearch(en, 'vehicle dealer business', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/checklist/#vehicle-dealer | /business-toolkit/business-types/vehicle-dealer/ | …`. Against `af.cef7f4b8d5.json`, `'maatskappy se naam'` gives `/business-toolkit/af/core/adding-new-lines/ | /business-toolkit/af/glossary/#registered-name | …`. The `8597126` export gives the old first results.

Suggested fix:

- Apply the business-type tie-break only between sections (`k === 'section'` with an anchor). Never apply it to a page's own entry, or when the query names the type.
- For `company name` / `maatskappy se naam`, make "Registered name" lead: a keyword on the glossary entry, or a bet `company name` / `maatskappy naam`.
- Add rows: `vehicle dealer business` → `business-types/vehicle-dealer`, af `voertuighandelaar besigheid`; `company name` and af `maatskappy se naam` → `lookup/glossary#registered-name`.

### minor 1: `munisipale verordeninge` opens vehicle signage; its `onlyLang` is not approved

File: `tests/search/acceptance-queries.json:2023-2032` (`municipal by-laws`, `onlyLang`).

- `runSearch(af, 'munisipale verordeninge', 'af', { limit: 3, typing }, '/business-toolkit/')` on the built index gives `/business-toolkit/af/branding/brand-applications-and-polish/#5-vehicle-signage | /business-toolkit/af/core/what-you-need-to-sell-things/#the-general-rule | /business-toolkit/af/core/vehicles/#other-things-to-check`, finished and typed. It is the same at `8597126`.
- **What it opens:** "5. Voertuigtekens" (vehicle signage), whose text says "Kyk na jou munisipale verordeninge vir beperkings op grootte".
- **What it should open:** "Die algemene reël" (`core/what-you-need-to-sell-things#the-general-rule`), the section the English row expects. It says "Kontroleer jou plaaslike verordeninge" about licences.
- `plaaslike verordeninge` already opens it. `verordeninge` alone opens vehicle signage.

Suggested fix:

- Remove the `onlyLang` from the English row.
- Add the Afrikaans row `munisipale verordeninge` → `core/what-you-need-to-sell-things#the-general-rule` with `notFirst: ["branding/brand-applications-and-polish#5-vehicle-signage"]`.
- Fix the ranking, for example with the `verordeninge` keyword from major 4.

### minor 2: "which laws apply" phrasings miss

- `which laws apply to me` and `which laws apply` → `/business-toolkit/core/vehicles/#other-things-to-check`. The same at `8597126`. `which` is not a stop word, so the `laws apply` bet does not match.
- `what laws apply to my business` → `/business-toolkit/business-types/food/#the-wider-law`. It was `lookup/sources#business-licensing` at `8597126`, no better. `business` is not filler, so the bet does not match.

`what laws apply to me` (a row) opens "What everyone needs regardless of type". Suggested fix: add both as rows with that target, with af `watter wette geld vir my besigheid` (it opens the page today, so give it the anchor). Add `which` to the English stop words, or `business` / `besigheid` to the bet's phrases.

### minor 3: `source` in another sense still opens the register

`SOURCE_WORDS` keeps `source`, which owners also use as a verb and in "source of income":

- `where do i source stock` → `/business-toolkit/sources/#running-a-pty-ltd-annual-returns-financial-statements-directors`;
- `source of income` → the same entry;
- `source suppliers` → `sources#colour-research-and-signage-materials` (in memory).

All are the same at `8597126`. Suggested fix: add `where do i source stock` (→ the retail stock section, for example `business-types/retail-online`) and `source of income` (→ `core/tax-and-sars`) as rows with `notFirst: ["lookup/sources"]`, with Afrikaans counterparts. Then count `source` as a source word only when it is a noun the query does not qualify (`source`, `sources`, `the source`, `what is the source`).

### minor 4: af `kleinhandel en aanlyn` opens the checklist, not the business-type page

`runSearch(af, 'kleinhandel en aanlyn', 'af', { limit: 3, typing: false }, '/business-toolkit/')` on the built index gives `/business-toolkit/af/checklist/#retail-and-online | /business-toolkit/af/business-types/retail-online/ | …`. While typed, the page is first. English `retail and online` opens the page. The same at `8597126`. Suggested fix: add the row (→ `business-types/retail-online`) in both languages. The fix for major 5 (a) may cover it.

### nit 1: the ADR's `search:diff` note hides the judged items

`docs/adr/0003-minisearch.md` gives only the totals ("36 better, 182 neutral"), as at pass 18. Item-level judgements, at least for the generated phrasings, would have let this pass check the author's calls directly instead of re-judging all 218. Suggested fix: write the `?` list with a verdict column to a file next to the log (outside the repository is fine) and name it in the hand-over.
