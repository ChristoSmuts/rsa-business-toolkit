# WP-33 review pass 18 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 17.
- **Date:** 7 October 2026
- **Commit reviewed:** `8597126` ("docs(search): document the pass 17 rules, the firstIn limit and search:diff"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b..8597126`, the whole package. I looked hardest at `git diff 5180091..8597126`: `549a151` (`SOURCE_WORDS`, `LAW_WORDS`, the register keywords, the Act lead, the whole-heading lift, "Words used" after lifted sections, the "what is" lead, the new bets, the `firstIn` check, `pnpm search:diff`) and `8597126` (docs).
- **The bar:** a major is a failing acceptance row, a regression against `3656fef`, a whole class of query going wrong, a broken rule, or a weak acceptance set (`docs/testing.md`, "Search acceptance set").

## Verdict

**Not clean: 0 blockers, 3 majors, 4 minors, 1 nit.**

Every acceptance row passes, finished and typed (inside the 2337 tests of `pnpm test`). The build, the typo sweep, e2e and a11y are green. The pass 17 findings are fixed as asked:

- `source`, `sources`, `bronne`, `bron`, `waar kom dit vandaan`, `where does this information come from` and `references` open the sources register.
- `ek het 'n naam vir my besigheid nodig`, `ek wil 'n naam vir my besigheid hê`, `ek soek 'n besigheidsnaam` and `nuwe besigheidsnaam` open "Prompt 3: the name".
- `how do i pay provisional tax` and `hoe betaal ek voorlopige belasting` open "Provisional tax".
- `home office deduction` opens Working from home's "Home office deduction", and `i want a licence` opens "What you need to sell things".
- `what is a pty ltd`, `wat is 'n eenmansaak` and `what is a tax invoice` open the glossary entry.

The majors all come from the new source rules:

1. A regression across a whole class. `come` and `official` are now source words. "Come up with a name" and "official name" queries open the sources register's "How to use this file".
2. A regression across a whole class. The Act lead fires on any law word (`law`, `regulations`, `by-laws`, `wet`), not only on an Act name. It puts an arbitrary register entry ahead of the guide's own section. Sometimes that entry does not list the law the query names (`employment act`, `regulasies vir kos` typed).
3. A weak acceptance set for these rules:
   - The Act rows accept any entry on the register page, so they cannot catch a wrong entry.
   - No row covers a source word used in another sense, or a law word that is not an Act.
   - The Afrikaans set lacks the step-aside rows and three of the Act rows that the English set has.

## Gate results

I ran all of these myself on `8597126`. The logs are in the shared scratchpad under `wp33-review18-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0 ("Done in 2.7s using pnpm v11.22.0").
- `pnpm gate:fast` (`wp33-review18-gatefast.log`): exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "- 0 errors", "- 0 warnings", "- 0 hints".
  - Vitest unit and dom: "Test Files  37 passed (37)", "Tests  2337 passed (2337)".
  - "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  34 passed (34)".
- `pnpm build` (`wp33-review18-build.log`): exit 0, "96 page(s) built in 3.64s".
  - "search:build: en.f6349ef5b3.json: 945 entries, 746.9 KB raw, 166.9 KB gzip" and "search:build: af.42f85cbffd.json: 951 entries, 809.9 KB raw, 184.0 KB gzip".
  - "dist:audit: 96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - "dist:trust: 72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - "dist:budget: largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 20.8 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 14.6 KB gzip (shared chunks counted once)."
  - These match `docs/testing.md` (20.8 KB, 14.6 KB, 166.9 / 184.0 KB) and the ADR.
- `pnpm search:typos` (`wp33-review18-typos.log`): exit 0: "search:typos: of 58672 one-keystroke typos, 53443 open the correct spelling's first result and 57496 one of its first three." This matches the ADR's pass 17 note.
- `pnpm search:diff 3656fef` (`wp33-review18-diff.log`): exit 0: "search:diff 3656fef: 7274 searches, 228 changed first results: 139 better, 0 worse, 4 same-target, 85 ?." This matches the ADR.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4825`, default reporters, `wp33-review18-e2e.log`): **555 passed, 85 skipped** (4.6 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4825/business-toolkit/` and "Running 640 tests using 2 workers".
  - `grep -c ✘` gives 0, so the failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4826`, `wp33-review18-a11y.log`): **196 passed** (3.2 min, exit 0). The log says `Local    http://127.0.0.1:4826/business-toolkit/` and "Running 196 tests using 2 workers" (a11y runs one project, as at passes 16 and 17). It has no `✘` line.
  - I ran no probe while e2e or a11y ran. All in-memory and built-index probes ran after the build and before e2e started.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.** Since `5180091`, `src/` changed only in `src/lib/search-client.ts` and `src/lib/search/options.ts`. They add no `href="/` literal, no `localStorage`, no `innerHTML`, no literal colour and no UI string. No rule in `CLAUDE.md` is broken.

## How I ran queries

- **In memory.** I built both indexes the way `tests/unit/search/acceptance.test.ts` does (`loadIndexInput`, `buildEntries`, `serialiseIndex` with the manifest sections and the resolved bets) and ran `runSearch` with `typing: false` and `typing: true`, limit 3. I ran the same script against an export of `3656fef` (`git archive 3656fef src scripts content-meta` into the scratchpad, never into the worktree) to find regressions.
- **Against the build.** For every finding I loaded `dist/search/en.f6349ef5b3.json` and `dist/search/af.42f85cbffd.json` (the files the browser fetches) with `loadIndex` and ran the queries with base `/business-toolkit/`. The hrefs quoted below come from that run (`wp33-review18-dist-probe.log`).
- **Sweeps.**
  - Every "Words used" title and glossary alias in both languages, old against new (245 queries): 25 first results changed, all better or neutral.
  - Every two- and three-word section heading, combined with the task words owners add (37 English and 17 Afrikaans phrasings).
  - Source and law words in other senses (about 90 phrasings).

## Review items

### 1. `pnpm search:diff`

**What it does.** It does what `docs/testing.md` says.

- **Export.** It runs `git archive <ref> src scripts content-meta` into a temp folder and links `node_modules`. The old ref's data (`src/data`) comes with it. `load.ts`, `best-bets.ts` and `keywords.ts` resolve their files from `import.meta.dirname`, so the old run reads the old data, not the working tree's.
- **Corpus.** Every acceptance row, every page title, every section heading and every glossary term (without its bracket), plus every backticked query in `docs/reviews/WP-33-pass*.md`, each in both languages.
- **Comparison.** Finished and typed, first result only, classified by row or heading.

My run gives the same totals as the ADR.

**Three limits.** None of them is a defect of the tool:

- The corpus has no glossary aliases and no "Words used" titles. My sweep of those found no regression.
- It passes `[]` as the index's sections. Sections are metadata only (`build.ts:71-88`), so ranking is unaffected.
- It only knows the queries it holds. The regressions in majors 1 and 2 are invisible to it, because no corpus query uses "come", "official", "law" or "regulations" in the senses below. Once this pass's queries are quoted here, the next run will see them.

**The 85 `?` results.** The per-item classification is not in the repository, only the totals (49 better, 32 neutral, 4 justified). I judged 34 of them myself (17 queries, finished and typed):

- **Better (9 queries):**
  - `Licence`, `license`, `Lisensie` → "What you need to sell things";
  - `call business`, `naming business`, `naam besigheid`, `kies besigheidsnaam` → "Prompt 3: the name";
  - `The home office deduction` → Working from home's section, not "The turnover tax trap";
  - `B-BBEE affidavit` → its own section.
- **Intended by the new rules (5):**
  - `national credit act`, `Companies Act`, `Consumer Protection Act`, `foodstuffs act` → a register entry;
  - `what is a pty ltd` on the Afrikaans index → the glossary.
- **Neutral (3):**
  - `If you are a sole proprietor` → "Sole proprietor" (You are the business) instead of the vehicle-dealer section. Its own section, `core/vehicles#if-you-are-a-sole-proprietor`, was not first before either and is 2nd now.
  - Afrikaans `Wat ingesluit is` (the heading of the quotation's "What is included") → `quotation#what-is-not-included`. Its own section is 3rd, and the old first result was the "Words used" entry. Both are wrong, so I count it neutral. It is a single heading, so I list it under minor 4.
  - English `register`, `regist` and `regi` on the Afrikaans index → the registered-name glossary entry instead of a vehicle section. These are English words on the Afrikaans index, and neither result is right.

None of these is worse. I find the author's classification fair.

Two details:

- `Companies Act` leads with a different register entry per language: "Running a Pty Ltd: annual returns…" in English and "Legislation this toolkit relies on" in Afrikaans.
- `Consumer Protection Act` leads with the vehicle-specific "Used vehicle sales and the Consumer Protection Act", not the general Legislation table.

Both list the Act, so I do not count them as findings. They do show how the Act lead picks its entry (major 2).

### 2. Sources register

- **Half weight only without a source word.** This holds (`search-client.ts:594-609`). But `SOURCE_WORDS` (`options.ts:71-103`) holds words that are rarely about sources: `come`, `official`, `verwysing` (major 1).
- **Keywords in both languages.** Yes (`content-meta/search-keywords.json:44-48`), and the schema test refuses one language only.
- **An Act name opens the register entry that lists it.** This works for the Acts the register lists:
  - `companies act`, `national credit act`, `consumer protection act`, `second-hand goods act`, `foodstuffs act`, `income tax act`, in both indexes;
  - `wet op inkomstebelasting` and `wetgewing`.
- **The step-aside.** It works for the three headings and the glossary term the rows name, and for `popia act` / `popia wet` (glossary). The Afrikaans headings `Die wyer wetgewing`, `Wat die wet in elk geval vereis` and `die opskrif wat deur die wet vereis word` open their own sections.
- **Hijacks.** The lead also fires on a bare law word, and on Act names the register does not list, ahead of the guide's own section (major 2). It does not step aside for a partial heading: `what the law requires` loses "What the law requires either way".
- **Act names that do not reach the register.** `basic conditions of employment act`, `liquor act` and `tobacco act` are not in the register, so that is right. The Afrikaans compounds `maatskappywet`, `verbruikersbeskermingswet` and `privaatheidswet` do not reach it (minor 3).
- **"act", "source" or "bron" in another sense.** `act as an agent`, `act fast on vat`, `before you act on a number`, `reference number`, `payment reference` and `invoice reference` are unchanged. `bron` has no other sense in the guide. The hijacks come from `come`, `official` and `verwysing` (major 1).

### 3. The whole-heading lift

I listed every section heading of two or three words in both languages (251) and tried the generic ones with the words owners add:

- `how to register`, `how to apply`, `what it costs`, `cost and time`, `which to use`, `your rights`, `getting paid`, `payment details`, `every sale`, `selling online`, `working from home`, `food business`, `vehicle dealer`, `stock records`, `importing stock`, `who we are`, `business card`, `your checklist`;
- in Afrikaans: `wat dit kos`, `koste en tyd`, `jou regte`, `betaal word`, `elke jaar`, `elke verkoping`, `die besluit`, `die naam kies`, `wie ons is`.

`How to register` and similar headings lose their stop words, so they do not count as two words and do not hijack `how to register for vat`. Only one phrasing changed for the worse: `sole proprietor bank account` (minor 1). "Sole proprietor" (You are the business) is a generic two-word heading, but the glossary entry still leads the other sole proprietor phrasings I tried, so it is not a class.

### 4. "Words used" after lifted sections

The sweep of all 245 "Words used" titles and aliases finds 25 changed first results, all better or neutral:

- `Deduction` / `Aftrekking` → "Home office deduction";
- `Tagline` / `Slagspreuk` → "Do you need a tagline?";
- `Deposit` / `Deposito` → "Holding deposits";
- `Refine prompt` / `Verfyningsopdrag` → "The refine prompt".

`Debit loan account` and `Leningsrekening in debiet` now open the section "Debit loan account: you owe the company" instead of the "Words used" entry. That is the same place, explained in full.

### 5. "What is" plus a glossary term

The new test (`tests/unit/search/index.test.ts:1162-1195`) asks every term and alias in both languages and passes.

- **A term that is also a page title.** The glossary entry leads, as documented: `what is a pty ltd` → `glossary/#pty-ltd` ahead of "Running a Pty Ltd", and `what is a tax invoice` → the glossary ahead of the template.
- **The bare term keeps the page.** `pty ltd` → "Running a Pty Ltd" in both languages.
- **No reach into longer questions.** `named` needs every query word to be a word of the term, so `what is included` and `wat is ingesluit` do not trigger it.

### 6. One-language checks

The schema refuses a bet or a keyword page with either list missing or empty. `best-bets.test.ts:28-39` proves it for both files. Every new bet has phrases in both languages, and `SOURCE_WORDS` and `LAW_WORDS` have both. The rows do not match (major 3).

### 7. The two approved target changes

- **`pty ltd` → "Running a Pty Ltd"** (`acceptance-queries.json:97`). This holds in both indexes, finished and typed. The Afrikaans set has no bare `pty ltd` row (major 3).
- **`besigheidsnaam` → "Prompt 3: the name"** (`:2886`, with an anchor). This is consistent with the bet, and every Afrikaans naming row expects `branding/branding-prompts`. The English `business name` row (`:1188`) names only the page, not the anchor (nit 1).

## Findings

### major 1: `come`, `official` and `verwysing` are source words, so naming and "official" queries open the sources register (regression, whole class)

Files: `src/lib/search/options.ts:87-88` (`'official'`, `'come'`), `:92` (`'verwysing'`); `src/lib/search-client.ts:594-609` (`asksSource` lifts the register to full weight); `content-meta/search-keywords.json:46` (`where does this come from` puts `come` into the register page's indexed title).

Any query with one of these words keeps the register at full weight, and the keyword phrase adds `come` to its title. "Come up with a name" is the common English way to ask for a name. "Official" is how owners say "registered". The register's "How to use this file" holds both words ("confirm against the official source"), so it now leads:

| Query (finished and typed) | `3656fef` first | `8597126` first (built index) |
| --- | --- | --- |
| `how do i come up with a business name` | `branding/branding-prompts#prompt-11-put-it-all-together` | `/business-toolkit/sources/#how-to-use-this-file` |
| `come up with a business name` | the same | `/business-toolkit/sources/#how-to-use-this-file` |
| `come up with a name` | the same | `/business-toolkit/sources/#how-to-use-this-file` |
| `how to come up with a name for my business` | the same | `/business-toolkit/sources/#how-to-use-this-file` |
| `official name` | `core/start-here#what-is-in-this-toolkit` | `/business-toolkit/sources/#how-to-use-this-file` |
| `official business name` | `core/start-here#what-is-in-this-toolkit` | `/business-toolkit/sources/#how-to-use-this-file` |
| `official invoice` | `core/start-here#what-is-in-this-toolkit` | `/business-toolkit/sources/#tax-and-sars` |
| af `verwysing` (an invoice's payment reference) | `templates/tax-invoice#payment-details` | `/business-toolkit/af/sources/` |

The old results for the "official" queries were weak too. But a register of URLs is no answer to "what is my official business name". The naming class is the guide's main branding task, and it now opens a page that explains how to read source labels.

How to reproduce: against the built `dist/search/en.f6349ef5b3.json`, `runSearch(en, 'how do i come up with a business name', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/sources/#how-to-use-this-file | /business-toolkit/sources/#running-a-pty-ltd-annual-returns-financial-statements-directors | /business-toolkit/branding/branding-prompts/#prompt-11-put-it-all-together` for both values of `typing`. `'official name'` gives `/business-toolkit/sources/#how-to-use-this-file | /business-toolkit/sources/#company-registration | …`. Against `af.42f85cbffd.json`, `'verwysing'` gives `/business-toolkit/af/sources/ | /business-toolkit/af/templates/tax-invoice/#payment-details | …`. The same in-memory script on the `3656fef` export gives the old first results in the table.

Suggested fix:

- Take `come`, `official`, `amptelik`, `amptelike`, `verwysing` and `vandaan` out of `SOURCE_WORDS`. Match the phrases `where does this come from` and `waar kom dit vandaan` as phrases, through the keyword or a best bet, not through a single word.
- Keep only words that mean "source" in every sense the guide uses (`source(s)`, `bron(ne)`, `references`, `verwysings`).
- Add rows that guard this: `how do i come up with a business name` and `come up with a name` → `branding/branding-prompts`, `notFirst: ["lookup/sources"]`; `official business name` → somewhere other than `lookup/sources`; af `verwysing` → `notFirst: ["lookup/sources"]`.
- Add a corpus of other-sense phrasings to `search:diff`, for example by quoting them here.

### major 2: any law word, not only an Act name, leads with an arbitrary register entry ahead of the guide's section (regression, whole class)

Files: `src/lib/search/options.ts:106-120` (`LAW_WORDS`: `law`, `laws`, `regulation(s)`, `wet`, `wette`, `regulasie(s)`, as well as `act`); `src/lib/search-client.ts:877-891` (`namesLaw`, `lawEntry`: the first register entry in rank order that holds every query word, put first; the step-aside only when a whole guide heading is in the query).

`docs/design-system.md` says: "A query that names an Act … leads with the register entry that holds every word". The code fires on any law word. It then picks whichever register entry ranks highest and holds the words, not the entry that lists the Act. The result is a whole class of owner questions about "the law" that now open a list of URLs, sometimes about another subject:

| Query (finished and typed unless noted) | `3656fef` first | `8597126` first (built index) |
| --- | --- | --- |
| `employment law` | `core/running-a-pty-ltd#employees-including-yourself` | `/business-toolkit/sources/#paying-yourself-from-a-company` |
| `employment act` | `core/running-a-pty-ltd#employees-including-yourself` | `/business-toolkit/sources/#you-are-the-business-uif-coida-courts-and-continuity` (it holds "employment" only in "the scope of that employment") |
| `tax act` | `core/tax-and-sars#provisional-tax` | `/business-toolkit/sources/#paying-yourself-from-a-company` |
| `what the law requires` | `core/adding-new-lines#what-the-law-requires-either-way` | `/business-toolkit/sources/#running-a-pty-ltd-annual-returns-financial-statements-directors` |
| af `wat die wet vereis` | the same section | finished `/business-toolkit/af/sources/#running-a-pty-ltd-annual-returns-financial-statements-directors`, typed `/business-toolkit/af/sources/` |
| `regulations for food` | `core/what-you-need-to-sell-things#if-you-sell-food` | `/business-toolkit/sources/#food-businesses` |
| af `regulasies vir kos` | `core/what-you-need-to-sell-things#if-you-sell-food` | finished `/business-toolkit/af/sources/#legislation-this-toolkit-relies-on`, **typed `/business-toolkit/af/sources/#running-a-pty-ltd-annual-returns-financial-statements-directors`** |
| `health regulations` | `business-types/services-trades#occupational-health-and-safety` | `/business-toolkit/sources/#food-businesses` |
| `consumer law` | `business-types/services-trades#consumer-law-on-services` | `/business-toolkit/sources/#consumer-law-and-online-selling` |
| `municipal by-laws` | `core/what-you-need-to-sell-things#the-general-rule` | `/business-toolkit/sources/#business-licensing` |
| `what laws apply to me` | `business-types/retail-online#selling-online` | `/business-toolkit/sources/#business-licensing` |
| `small claims court act` | `core/you-are-the-business#small-claims-court-only-if-you-are-a-natural-person` | `/business-toolkit/sources/#used-vehicle-sales-and-the-consumer-protection-act` (the Small Claims Courts Act is listed under "You are the business: UIF, COIDA, courts and continuity") |
| `companies act section 32` | `core/adding-new-lines#what-the-law-requires-either-way` | `/business-toolkit/sources/#how-to-use-this-file` |
| `law` | `business-types/food#the-wider-law` | `/business-toolkit/sources/#consumer-law-and-online-selling` |
| `regulations` | `business-types/services-trades#occupational-health-and-safety` | `/business-toolkit/sources/#running-a-pty-ltd-annual-returns-financial-statements-directors` |
| `act` | `glossary#businesses-act-licence` | `/business-toolkit/sources/#used-vehicle-sales-and-the-consumer-protection-act` |

The guide's section explains the rule in plain words; the register entry lists URLs. `regulasies vir kos` while typed opens the Pty Ltd annual-returns entry, which is about another subject: the typed `kos` prefix matches "koste". `employment act` and `small claims court act` open an entry that does not list the Act.

How to reproduce: against the built `dist/search/en.f6349ef5b3.json`, `runSearch(en, 'employment law', 'en', { limit: 3, typing }, '/business-toolkit/')` gives `/business-toolkit/sources/#paying-yourself-from-a-company | /business-toolkit/core/running-a-pty-ltd/#employees-including-yourself | …` for both values of `typing`. `'what the law requires'` gives `/business-toolkit/sources/#running-a-pty-ltd-annual-returns-financial-statements-directors | /business-toolkit/core/adding-new-lines/#what-the-law-requires-either-way | …`. Against `af.42f85cbffd.json`, `runSearch(af, 'regulasies vir kos', 'af', { limit: 3, typing: true }, '/business-toolkit/')` gives `/business-toolkit/af/sources/#running-a-pty-ltd-annual-returns-financial-statements-directors | /business-toolkit/af/core/what-you-need-to-sell-things/#if-you-sell-food | …`. The `3656fef` export gives the old first results in the table.

Suggested fix:

- Lead with the register only when the query names an Act the register lists. Build that list at index time from the "Legislation this toolkit relies on" table and the "Underlying law" lines, for example as a best-bet-like table of Act names to entries. Do not decide it from one law word.
- Prefer the entry that lists the Act by name ("Legislation this toolkit relies on" for every Act in its table) over whichever register entry ranks highest.
- Leave a bare `law`, `laws`, `regulations`, `by-laws`, `wet` or `regulasies` to the ranking (the half weight then still applies).
- Do not let a typed prefix choose the entry. Match the Act name with whole words only.
- Add rows: `employment law` and `what the law requires` (and af `wat die wet vereis`) → the guide section, `notFirst: ["lookup/sources"]`; `regulasies vir kos` and `regulations for food` → `core/what-you-need-to-sell-things#if-you-sell-food`; `small claims court act` → not `lookup/sources#used-vehicle-sales-and-the-consumer-protection-act`.

### major 3: the acceptance rows for the source rules cannot catch a wrong register entry, and the two languages do not match

Files: `tests/search/acceptance-queries.json:1729-1764` (English Act rows), `:3327-3346` (Afrikaans `wetgewing` and Act rows), `:1874-1898` (English step-aside rows), `:97` (`pty ltd`).

- **The Act rows name only the page.** Each of `companies act`, `income tax act`, `consumer protection act`, `foodstuffs act` and `second-hand goods act` (English), and `wetgewing`, `companies act` and `consumer protection act` (Afrikaans), is `doc: "lookup/sources"` with no anchor. Any entry of the register passes, including one that does not list the Act. `small claims court act` (major 2) shows that this happens. These rows cannot catch it.
- **Nothing guards the other senses.** No row covers a source word used in another sense (major 1) or a law word that is not an Act name (major 2). Every acceptance row passes while both classes are wrong.
- **Afrikaans lacks rows the English set has.**
  - The three step-aside rows that guard the Act lead's exception: `before you act on a number`, `consumer law on services`, `businesses act licence`. Their Afrikaans counterparts, for example `Voordat jy op 'n getal reageer`, `Verbruikersreg oor dienste` and `Die wyer wetgewing`, pass today but are not guarded.
  - `income tax act`, `foodstuffs act` and `second-hand goods act`. The Afrikaans register keeps the English Act names, so the same queries apply.
  - The bare `pty ltd` row, the approved target change.
- **English lacks `legislation`.** Afrikaans has `wetgewing`.

I ran every missing counterpart. Each gives the right page today:

- af `income tax act` → `/business-toolkit/af/sources/#paying-yourself-from-a-company`;
- af `pty ltd` → `/business-toolkit/af/core/running-a-pty-ltd/`;
- en `legislation` → `/business-toolkit/sources/#legislation-this-toolkit-relies-on`.

So this is a gap in the set, not a failing search.

How to reproduce: `node -e` over `tests/search/acceptance-queries.json`, listing rows by `lang` and `from` (`pass 17 major 1`, `pass 17 regression diff`): English 11 source rows and 5 regression-diff rows, Afrikaans 8 and 1.

Suggested fix:

- Give each Act row the anchor of the entry that lists the Act (`#legislation-this-toolkit-relies-on`, or the subject entry), so a wrong entry fails it.
- Add the other-sense and non-Act rows from majors 1 and 2 in both languages.
- Mirror the step-aside rows in Afrikaans with the Afrikaans headings that hold `wet`/`wetgewing`: `Die wyer wetgewing`, `Wat die wet in elk geval vereis`, `die opskrif wat deur die wet vereis word`.
- Add af `income tax act`, `foodstuffs act`, `second-hand goods act` and `pty ltd`, and en `legislation`.
- A test could compare the two languages' rows by `from` tag and fail when one language has a pass's rows and the other has none for the same subject.

### minor 1: `sole proprietor bank account` opens "Sole proprietor" (UIF and COIDA), not "Business bank account"

File: `src/lib/search-client.ts:793-810` (`contained`: lifted in rank order, so the shorter heading that names the owner, not the task, wins).

`runSearch(en, 'sole proprietor bank account', 'en', { limit: 3, typing }, '/business-toolkit/')` against the built index gives `/business-toolkit/core/you-are-the-business/#sole-proprietor | /business-toolkit/core/register/#business-bank-account | …` for both values of `typing`. At `3656fef` "Business bank account" was first. Both headings are wholly in the query, so both are lifted.

Suggested fix: add the row. Among contained headings, put the one with more words first (it names more of the query).

### minor 2: two Afrikaans naming phrasings miss

- `hoe kom ek aan 'n besigheidsnaam` ("how do I get a business name"; English `how do i get a business name` is a row) → `/business-toolkit/af/branding/brand-applications-and-polish/#part-5-the-critique-prompt`.
- `my besigheid se naam` ("my business's name") → `/business-toolkit/af/core/vehicles/`.

Both give the same result at `3656fef`, finished and typed, on the built index. Suggested fix: add both as rows to `branding/branding-prompts`. `kom aan besigheidsnaam` and `besigheid se naam` can join the Afrikaans naming bet.

### minor 3: Afrikaans compound Act names do not reach the register

`maatskappywet` → `/business-toolkit/af/glossary/#owner-managed-company`. `verbruikersbeskermingswet` and `privaatheidswet` give no result. The guide keeps the English Act names, but an Afrikaans owner may type the Afrikaans compound. Suggested fix: add `maatskappywet`, `verbruikersbeskermingswet`, `inkomstebelastingwet` and `btw-wet` to the register's Afrikaans keywords, or to the Act table proposed in major 2, and add rows.

### minor 4: single phrasings that miss in both languages, and one heading

- `vat for a sole proprietor` and `btw vir 'n eenmansaak` → `/business-toolkit/business-types/vehicle-dealer/#your-startup-checklist` (Afrikaans the same), a dealer's checklist. The same at `3656fef`.
- Afrikaans `Wat ingesluit is`, the heading of the quotation's "What is included", → `/business-toolkit/af/templates/quotation/#what-is-not-included`; its own section is 3rd. English `what is included` opens its own section.

Suggested fix: add the rows, with `core/tax-and-sars#vat-probably-not-yet` for the first pair.

### nit 1: `business name` and `besigheidsnaam` rows differ in strictness

`tests/search/acceptance-queries.json:1188` (`business name`, page only) against `:2886` (`besigheidsnaam`, `#prompt-3-the-name`). Both bets target "Prompt 3: the name". Suggested fix: give the English row the same anchor.
