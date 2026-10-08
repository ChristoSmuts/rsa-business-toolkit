# WP-33 review pass 20 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 19.
- **Date:** 8 October 2026
- **Commit reviewed:** `2947fbf` ("docs(search): record written filler and the pass 19b diff verdicts"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b..2947fbf`, the whole package. I looked hardest at `git diff c5aae3b..2947fbf`: `8ded6df` (restored bets, cap 120, Act aliases with ordered matching, law words as filler, the tie-break and `se` reverted, the source rule), `50d0428` (`sê` as written filler, stop words compared as written, `oor` as filler) and the two docs commits, including `docs/reviews/WP-33-diff-733195e.md`.
- **The bar:** a major is a failing acceptance row, a regression against `733195e`, a whole class of query going wrong, a broken rule, or a weak acceptance set (`docs/testing.md`, "Search acceptance set").

## Verdict

**Not clean: 0 blockers, 2 majors, 4 minors, 1 nit.**

Every acceptance row passes, finished and typed (inside the 2650 tests of `pnpm test`). The build, the typo sweep, e2e and a11y are green. No CLAUDE.md rule is broken. The pass 19 findings are fixed as asked:

- The removed bets are back and are rows: `dividends`, `dividende`, `kies naam besigheid`, `kies 'n naam vir my besigheid`, `maatskappybelastingkoers` (typed too) open their targets.
- Every Act opens the Legislation entry by its Afrikaans title and the short forms (`wet op besighede`, `nasionale padverkeerswet`, `ekt-wet`, `ohsa`, `nca`, `bee act`, `cpa act`). A generated test asks every name and alias in both indexes.
- The Act match is ordered: `can i act as a company`, `act on credit`, `act on food` no longer open the Legislation entry.
- `tax law`, `sars law`, `by-laws`, `licensing law`, af `rekords wet`, `lisensie wet` open guide sections.
- `vehicle dealer business` opens the type's page; `maatskappy se naam`, `company name` open "Registered name"; `kleinhandel en aanlyn` opens the retail page; `which laws apply` opens "What everyone needs regardless of type".

The majors:

1. The new source rule (full weight only when a source word ends the query) breaks "sources for <topic>" in both languages. 26 phrasings that opened the register's topic entry at `733195e` now open "UIF: sources disagree", "Debit loan account" or "What is in this toolkit".
2. Making law words pure filler regresses queries whose bare noun is ambiguous: `labour law` (and three phrasings), `credit regulations` (and two), af `kos wet`, `wat die wet oor kos sê`, `werk wet`. The verdict file marks all of them "neutral" by a mechanical rule. Pass 19 named `kos wet` → "If you sell food" as fixed; it is broken again.

## Gate results

I ran all of these myself on `2947fbf`. The logs are in the shared scratchpad under `wp33-review20-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0 ("Done in 9s using pnpm v11.22.0").
- `pnpm gate:fast` (`wp33-review20-gatefast.log`): exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "- 0 errors", "- 0 warnings", "- 0 hints".
  - Vitest unit and dom: "Test Files  37 passed (37)", "Tests  2650 passed (2650)".
  - "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  34 passed (34)".
- `pnpm build` (`wp33-review20-build.log`): exit 0.
  - "search:build: en.644b6bc862.json: 945 entries, 749.1 KB raw, 167.4 KB gzip" and "search:build: af.ce51ad25d1.json: 951 entries, 813.6 KB raw, 184.8 KB gzip".
  - "dist:audit: 96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - "dist:trust: 72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - "dist:budget: largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 21.0 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 14.8 KB gzip (shared chunks counted once)."
  - These match `docs/testing.md:290-292` (21.0 KB, 14.8 KB, 167.4 / 184.8 KB) and the ADR.
- `pnpm search:typos` (`wp33-review20-typos.log`): exit 0: "search:typos: of 58672 one-keystroke typos, 53433 open the correct spelling's first result and 57486 one of its first three." This matches the ADR.
- `pnpm search:diff 733195e` (`wp33-review20-diff.log`): exit 0: "search:diff 733195e: 9362 searches, 517 changed first results: 126 better, 1 worse, 7 same-target, 383 ?." This matches the ADR and the verdict file.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4841`, default reporters, `wp33-review20-e2e.log`): **555 passed, 85 skipped** (5.0 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4841/business-toolkit/` and "Running 640 tests using 2 workers".
  - `grep -c ✘` gives 0, so the failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4842`, `wp33-review20-a11y.log`): **196 passed** (4.2 min, exit 0).
  - The log says `Local    http://127.0.0.1:4842/business-toolkit/` and "Running 196 tests using 2 workers".
  - It has no `✘` line.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.** Since `c5aae3b`, `src/` changed only in `src/lib/search-client.ts` and `src/lib/search/options.ts`. Across the whole package, `src/scripts/search*.ts`, `src/lib/search*` and the search pages hold no `innerHTML`, `insertAdjacentHTML` or `eval`, no `href="/` literal, no `localStorage` and no literal colour. No rule in `CLAUDE.md` is broken.

## How I ran queries

- **In memory.** I built both indexes the way `tests/unit/search/acceptance.test.ts` does and ran `runSearch` with `typing: false` and `typing: true`, limit 3. For regressions I ran the same script against an export of `733195e` (`git archive` into the scratchpad, never into the worktree, with `node_modules` linked).
- **Against the build.** For every finding I loaded `dist/search/en.644b6bc862.json` and `dist/search/af.ce51ad25d1.json` with `loadIndex` and ran the queries with base `/business-toolkit/` (`wp33-review20-dist-probe.log`). The hrefs below come from that run.
- **Order.** All probes ran after the build and between the test runs. None ran while e2e or a11y ran.
- **Sweeps.**
  - About 230 common owner queries in both languages (registering, tax, VAT, paying yourself, naming, banking, licences, business types, templates, hiring, Acts), old against new.
  - "sources for <noun>", "source for <noun>", "<noun> sources" and the Afrikaans forms over 30 nouns per language (174 queries).
  - Every row of `WP-33-diff-733195e.md` (384 rows, 196 distinct queries): each "After" matches what the tip returns. I judged 110 of the `?` items myself (all English finished ones, and the Afrikaans `wet` and `wat die wet oor … sê` ones).

## Review items

### 1. Best bets

99 English and 103 Afrikaans phrases, under the cap of 120 (`MAX_BEST_BETS`). The 42 phrases added since `733195e` each name a sensible target. Every phrase removed in pass 18 is back and is an acceptance row in both languages (`dividends`, `dividende`, `kies naam besigheid`, `maatskappybelastingkoers`, `vehicles`, `voertuie`, `maak besigheidsbankrekening oop`). `search:diff` now reads every past bet and keyword from git history (`scripts/search-diff.ts:215-232`), and the corpus holds them.

### 2. Act aliases

Every alias is the Act it is filed under. Each opens the Legislation entry, finished and typed, in both indexes (the generated test in `index.test.ts` and my sweep agree). The match is ordered and contiguous (`search-client.ts:933-953`). `act company`, `act on vat` and `can i act as a company` no longer read as Act names. Bare `popia`, `cpa` and `bee` stay ordinary queries. `ohsa`, `nca` and `bbbee act`, which returned nothing or the wrong page, now open the entry.

### 3. Law words as filler

This fixes the pass 19 major 4 rows. It also fixes many generated phrasings: `vat law`, `safety law`, `import law`, `employment regulations`, af `regulasies vir rekords`. But where the bare noun is ambiguous, the law word was what kept the right section first (major 2).

### 4. Reverts

The business-type tie-break is gone. `home office deduction` still opens Working from home's section (it is a row). `se` is a content word again: `maatskappy se naam` and `besigheid se naam` open their targets through bets.

### 5. The source rule

`source of income`, `where do i source stock` and `source stock` are now bets, so they open the right place whatever the rule does. The rule itself costs the "sources for <topic>" class (major 1).

### 6. Written filler and stop words

- `sê` is dropped as written and `se` is kept: `wat sê sars`, `wat die wet oor btw sê` and `maatskappy se naam` all work.
- `hoë koste` and `hoë inkomste` search for `hoë`.
- `dié` and `óf` are stop words.
- `oor` and `about` as filler: `about vat`, `oor btw` open the VAT glossary entry; `about the toolkit` opens "About the numbers in this toolkit". Two phrasings miss (minor 4).

### 7. `search:diff` and the verdict file

The tool and the file agree: every one of the 384 rows gives the first result the tip returns. The "neutral" verdict for a law-word phrasing means only "opens what the bare noun opens", which the script checks. That rule hides the cases where the bare noun opens the wrong place (major 2). The corpus has no "sources for <noun>" phrasing, so the source rule's cost does not show (major 1).

### 8. The search UI (`web-interface-guidelines`, `accessibility`)

I read `SearchDialog.astro`, `search.ts`, `search-ui.ts`, `search-page.ts`, `search-render.ts`, `search.css` and `search.astro`, and found nothing to report.

- The dialog is a native `<dialog>` labelled by its heading. The field is a labelled combobox with `aria-controls`, `aria-expanded` and `aria-activedescendant`, and instructions through `aria-describedby`.
- Options are real links in labelled groups.
- The status line is a polite live region that exists before the first count.
- Escape closes. Focus returns to the opener, or to the menu button when the opener was in the closed phone menu.
- The loading text is delayed 150 ms and ends with "…". The no-results and failed states keep a link to the contents.
- The close button is 44 px with a labelled icon. The active option has a visible outline, with a forced-colours variant.
- The arrival highlight has a reduced-motion variant.
- Without JavaScript the header control is a link to `/search/`. That page says search needs JavaScript and lists every page (the nojs e2e tests pass).
- Result text is built with DOM APIs.

Rules skipped because of the project overrides: Title Case, curly quotes in content, preconnect, language detection, hydration and virtualisation.

## Findings

### major 1: "sources for <topic>" opens unrelated sections (regression, whole class, both languages)

Files: `src/lib/search-client.ts:612-617` (`asksSource` only when the last word is a source word); `scripts/search-diff.ts:114` (`PHRASINGS` has no "sources for <noun>").

Pass 19 minor 3 asked that `source` in other senses (`where do i source stock`, `source of income`) stop opening the register. The fix gives the register full weight only when a source word ends the query. "Sources for <topic>" is the most natural way to ask for a topic's sources, and every content page has a section called "Sources for this page". With the source word first, the register falls back to its reduced weight, and pages that merely hold the word "sources" or the topic word win:

| Query (built index, finished and typed unless noted) | `733195e` first | `2947fbf` first |
| --- | --- | --- |
| `sources for tax`, `source for tax` | `lookup/sources#tax-and-sars` | `/business-toolkit/core/paying-yourself/#uif-sources-disagree` |
| `sources for company tax` | `lookup/sources#paying-yourself-from-a-company` | `/business-toolkit/core/paying-yourself/#uif-sources-disagree` |
| `sources for dividends`, `source for company` | `lookup/sources#paying-yourself-from-a-company`, `#company-registration` | `/business-toolkit/core/paying-yourself/#debit-loan-account-you-owe-the-company` |
| `sources for beauty`, `source for invoice` | `lookup/sources#…` | `/business-toolkit/core/start-here/#what-is-in-this-toolkit` |
| af `bronne vir btw` | `lookup/sources#tax-and-sars` | `/business-toolkit/af/business-types/vehicle-dealer/#the-conditions-you-must-meet` |
| af `bronne vir belasting` (typed) | `lookup/sources#tax-and-sars` | `/business-toolkit/af/core/paying-yourself/#uif-sources-disagree` |
| af `bron vir sars` | `lookup/sources#tax-and-sars` | `/business-toolkit/af/core/paying-yourself/#fixing-a-debit-loan-account` |
| af `bronne vir inkomstebelasting` | `lookup/sources#tax-and-sars` | `/business-toolkit/af/core/paying-yourself/#debit-loan-account-you-owe-the-company` |
| af `bronne vir cipc` | `lookup/sources#running-a-pty-ltd-…` | `start/how-to-use#path-3-i-need-one-specific-answer` (in memory) |

In my sweep of 174 such phrasings, 29 queries (56 searches, finished and typed counted apart) changed. All are "<source word> for/vir <topic>". Three changes are harmless: af `bron vir maatskappybelasting` → "4. SARS company tax", `bron vir tuiskantoor` → "Home office deduction", `bron vir lisensie` → "Licence". The other 26 are worse. The register's entry is still second or third, so the owner who reads on finds it, but the first result answers another question (a director's loan account when they asked where the tax facts come from). No acceptance row has a source word before the topic, and the `search:diff` corpus has no such phrasing, so nothing caught it.

How to reproduce: against `dist/search/en.644b6bc862.json`, `runSearch(en, 'sources for tax', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/core/paying-yourself/#uif-sources-disagree | /business-toolkit/sources/#tax-and-sars | /business-toolkit/sources/#paying-yourself-from-a-company` for both values of `typing`. Against `af.ce51ad25d1.json`, `'bron vir sars'` gives `/business-toolkit/af/core/paying-yourself/#fixing-a-debit-loan-account | /business-toolkit/af/sources/#tax-and-sars | …`. The same script on the `733195e` export gives the register's entry first.

Suggested fix:

- Count a source word as asking for sources when it ends the query **or** is followed by `for`, `on`, `about`, `vir` or `oor`.
  - I tried this in a scratch copy, not in the worktree. It restores every query in the table above.
  - It keeps `source of income`, `where do i source stock`, `source stock`, `bron van inkomste` and `waar kry ek voorraad` on their targets, because those are bets.
- Add rows in both languages: `sources for tax` → `lookup/sources#tax-and-sars` (af `bronne vir belasting`), and `sources for vat` (af `bronne vir btw`), each with `notFirst` for the place it opens today.
- Add `sources for <noun>` and `bronne vir <noun>` to `PHRASINGS` in `scripts/search-diff.ts`.
- Note for the backlog: some "<topic> sources" phrasings miss at both commits (`privacy sources`, `company sources`, `salary sources` → "What is in this toolkit" or "UIF: sources disagree"). The fix above does not cover them.

### major 2: law words as pure filler regress queries whose bare noun is ambiguous; the verdict file calls them "neutral"

Files: `content-meta/search-best-bets.json:24-31` and `:51-56` (the law words in `filler`); `src/lib/search-client.ts:644-653` (filler dropped before ranking); `docs/reviews/WP-33-diff-733195e.md:56, 102, 115, 143, 189, 202, 225, 236-237, 255, 260, 290, 297, 331, 342-343, 360, 365, 396, 403` (judged "neutral").

Pass 19 major 4 suggested ranking on the other words and letting the law word "only break ties". The fix drops the law word completely, so a "<noun> law" query opens whatever bare "<noun>" opens. The verdict file then counts every such change as neutral because "the script checked that the new first result is the bare noun's first result". That check says nothing about whether the bare noun's result is right. Where the noun has two senses, the law word was what picked the legal sense, and it is gone:

| Query (built index, finished and typed) | `733195e` first | `2947fbf` first |
| --- | --- | --- |
| `labour law` | `core/running-a-pty-ltd#employees-including-yourself` | `/business-toolkit/business-types/professional-creative/#the-turnover-tax-trap` |
| `labour regulations`, `regulations for labour` | `business-types/services-trades#occupational-health-and-safety` | the turnover-tax trap |
| `what the law says about labour` | the colour-research section | the turnover-tax trap |
| `credit regulations`, `regulations for credit` | `lookup/sources#legislation-this-toolkit-relies-on` (lists the National Credit Act) | `/business-toolkit/glossary/#credit-note` (an invoice correction) |
| af `kos wet` | `core/what-you-need-to-sell-things#if-you-sell-food` | `/business-toolkit/af/core/running-a-pty-ltd/` |
| af `wat die wet oor kos sê` | `core/what-you-need-to-sell-things#if-you-sell-food` | `/business-toolkit/af/core/running-a-pty-ltd/` |
| af `werk wet` | `core/running-a-pty-ltd#employees-including-yourself` (finished) | `/business-toolkit/af/core/you-are-the-business/` |

- "The turnover-tax trap" mentions "labour brokers" as a business that cannot use turnover tax. The guide's word on labour law is in "Employees (including yourself)": "Employment law is outside the scope of this toolkit … the Basic Conditions of Employment Act and the Labour Relations Act are strict". That is what `labour law` opened before, and what `employment law` (a row) and af `arbeidswet` still open.
- `kos` is both "food" and "costs", so bare `kos` opens "Running a Pty Ltd". Pass 19 listed af `kos wet` → "If you sell food" among the fixes; it is broken again. The af row `regulasies vir kos` passes only because `regulasies kos` is now a best bet.
- `credit` alone means a credit note in the guide, so "credit regulations" lands on the glossary's invoice term, not on lending to customers.

`labour law` is one of the commonest law questions an owner who takes on help will type. No row covers it, `kos wet`, `werk wet` or `credit regulations`.

How to reproduce: against `dist/search/en.644b6bc862.json`, `runSearch(en, 'labour law', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/business-types/professional-creative/#the-turnover-tax-trap | /business-toolkit/business-types/services-trades/#check-whether-your-trade-is-regulated | /business-toolkit/core/running-a-pty-ltd/#employees-including-yourself` for both values of `typing`. Against `af.ce51ad25d1.json`, `'kos wet'` gives `/business-toolkit/af/core/running-a-pty-ltd/ | /business-toolkit/af/core/what-you-need-to-sell-things/#if-you-sell-food | /business-toolkit/af/checklist/#food`. The `733195e` export gives the old first results.

Suggested fix:

- Let the law word break ties instead of dropping it. Rank on the other words, then, among results within a small score margin of the best, prefer one whose text holds the law word. Pass 19's suggestion was meant this way.
- Or, smaller: add page keywords that pick the legal sense.
  - `labour` → `core/running-a-pty-ltd#employees-including-yourself` (af `arbeid`).
  - Bets `kos wet` / `food law` → `core/what-you-need-to-sell-things#if-you-sell-food`.
  - `credit regulations` / `kredietregulasies` → `business-types/vehicle-dealer#if-you-extend-credit-yourself`, where af `krediet wet` already goes.
- Add rows in both languages: `labour law` → `core/running-a-pty-ltd#employees-including-yourself` (af `arbeidswet`), `kos wet` → `core/what-you-need-to-sell-things#if-you-sell-food` (en `food law`, which opens the Food page today: accept the page, or point both at the section), and `credit regulations` (af `krediet wet`). Each needs `notFirst` for the place it opens today.
- In the verdict file, check a "neutral" law-word item by hand when the bare noun's first result is a different subject. Do not accept it by rule.

### minor 1: af `verbruikersbeskerming` finds nothing

`runSearch(af, 'verbruikersbeskerming', 'af', { limit: 3, typing }, '/business-toolkit/')` on the built index returns no results, finished and typed. The same at `733195e`. The Afrikaans guide says `verbruikersreg` and keeps the English Act name, so the plain Afrikaans word for "consumer protection" matches nothing. Only the Act aliases (`verbruikersbeskermingswet`, `wet op verbruikersbeskerming`) work. English `consumer protection` opens the vehicle dealer's CPA section.

Suggested fix: a page keyword `verbruikersbeskerming` on `business-types/services-trades#consumer-law-on-services` (where af `verbruikersreg` goes), and a row in both languages.

### minor 2: `vat rate` opens a dealer-only turnover-tax section

| Query (built index, finished and typed) | First |
| --- | --- |
| `vat rate`, `what is the vat rate` | `/business-toolkit/business-types/vehicle-dealer/#turnover-tax-is-almost-certainly-wrong-for-a-dealer` |
| af `btw koers` | `core/tax-and-sars#route-3-turnover-tax` (in memory) |
| `tax rates` | `core/adding-new-lines#tax-one-company-several-activities` (in memory) |

The same at `733195e`. The rate is in Tax and SARS's opening table ("VAT | 15% tax added to sales …") and in the VAT glossary entry. The set has no row for any of these very common phrasings.

Suggested fix: rows `vat rate` / af `btw-koers` → `core/tax-and-sars` (or `lookup/glossary#vat`), with a keyword or bet if ranking cannot do it.

### minor 3: hiring phrasings open Zoning

`hire staff`, `employing staff`, `staff` and af `personeel` open `/business-toolkit/core/working-from-home-and-safety/#zoning`, finished and typed. `employment contract` opens `business-types/professional-creative#intellectual-property`. The same at `733195e`. "Employees (including yourself)" is the guide's answer, and `my first employee`, `employees` and `employment` already open it.

Suggested fix: keywords `staff`, `hire`, `personeel` on `core/running-a-pty-ltd#employees-including-yourself`, and a row `hire staff` / af `personeel aanstel`.

### minor 4: `about`/`oor` as filler leaves "what is this site about" questions to chance

- `what is this site about` → `/business-toolkit/business-types/retail-online/#what-must-appear-on-your-site`. At `733195e` it opened "About the numbers in this toolkit", no better but on the right page.
- af `oor die toolkit` → `/business-toolkit/af/start/what-has-changed/#3-01-how-to-use-this-toolkit--add-a-row-to-the-path-3-table`, a changelog row. At `733195e` it opened `branding/already-have-your-name`.
- English `about the toolkit` opens "About the numbers in this toolkit".

Suggested fix: a bet `what is this toolkit` / `oor die toolkit` / `what is this site` → `start/how-to-use#what-this-toolkit-is`, with rows.

### nit 1: other single misses for the backlog

Each is the same at `733195e`, so none blocks the merge:

- `bee level` → `lookup/sources#running-a-pty-ltd-…`; `bee status` → `core/adding-new-lines#the-hidden-cost-you-may-lose-sbc-rates-on-both`. `bee certificate` and `bee affidavit` are right.
- `letterhead` → `core/vehicles#how-to-get-the-brnc`.
- `baking from home` → `lookup/glossary#sabric`; af `bak van die huis af` → `business-types/vehicle-dealer#dealing-from-home-with-no-yard`.
- af `hoeveel kos dit om 'n maatskappy te registreer` → `core/register#business-bank-account`, where English opens "Private company (Pty) Ltd".
