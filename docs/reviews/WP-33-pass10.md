# WP-33 review pass 10 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 9.
- **Date:** 6 October 2026
- **Commit reviewed:** `c1ca282` ("docs(search): state the title rule for pages about the guide, for review pass 9"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b c1ca282`, the whole package: 50 files, +9284 / -69. The pass 9 fixes are `9ecb225` (code and tests) and `c1ca282` (docs).

## Verdict

**Not clean: 0 blockers, 1 major, 3 minors, 3 nits.**

The two-pass count stays at zero.

The pass 9 fix works as described. Common single words no longer open the changelog's Drive-paste notes:

- English: `register`, `name`, `branding`, `business`, `check`, `change`, `start here`, `choosing the name`, `materials`, and while typing `regist`, `nam`, `brand`.
- Afrikaans: `registreer`, `naam`, `besigheid`, `materiale`, `register`, `branding`.

The pass 8 and pass 7 rows still hold:

- `how this was made`, `hoe dit gemaak is`, `what has changed`, `wat het verander`, `corrections` and `regstellings` open their page.
- `PAYE deadline`, `EMP201 deadline`, `UIF deadline`, `ITR14 deadline`, `EMP201 sperdatum` and `ITR14 sperdatum` open the glossary entry.

The major is new and is not a regression. Search indexes each page under its manifest title, but the page shows a different heading at the top. The AI disclosure page says "AI disclosure" / "KI-openbaarmaking" at the top, and searching for those words does not list the page in the dialog. The guide's ordinary topics rank well: in about 200 realistic queries, the first option was the likely page in all but the cases listed below.

## Gate results

I re-ran all of these myself on `c1ca282`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 4.9s using pnpm v11.22.0").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "0 errors".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1240 passed (1240)".
  - Content drift: "Content drift: none."
  - Vitest content: "Test Files 1 passed (1)", "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 18.7 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 12.6 KB gzip (shared chunks counted once)."
  - `dist:budget`: "index af.faed23efc0.json: 800.9 KB raw, 181.9 KB gzip" and "index en.873ecd57d1.json: 738.0 KB raw, 165.2 KB gzip". These match `docs/testing.md` and `docs/design-system.md`.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4771`, default reporters): **555 passed, 85 skipped, 0 failed** (6.3 min, exit 0). The failure list is empty.
- `pnpm test:a11y` (same environment): **196 passed** (7.2 min, exit 0).
- **WebKit was not run.** It is not installed in this environment.
- **Rules.**
  - The added lines under `src/` have no `href="/` literal, no `localStorage`, no `innerHTML` and no literal colour.
  - Outside `docs/`, `scripts/`, `src/` and `tests/`, the diff touches only `.gitignore`, `package.json` and `vitest.config.ts`.
  - Nothing under `src/scripts/`, `src/components/` or `src/pages/` changed since `f1110b0`.

## My own checks

### Real queries

I built both indexes in memory, the way `tests/unit/search/index.test.ts` does. I ran each query through `runSearchCounted` with `typing` set as the dialog sets it. I then rebuilt the dialog's visible list with `groupResults` and at most 3 per section. That list is what the reader sees and what Enter opens.

I took the queries from the guide's own headings, glossary and quick answers: topics, codes, amounts, dates, Act names, Afrikaans compounds, typos and partial words. I also asked each page's title for its page, in both languages (36 pages × 2 languages × typed and finished).

**English, first option is the likely page (OK):**

- Registration and company: `register company`, `register a company`, `how to register a company`, `sole proprietor`, `pty ltd`, `company name`, `choosing the name`, `business bank account`, `information officer`, `POPIA`, `B-BBEE affidavit`, `BBBEE`.
- Tax: `provisional tax`, `provisonal tax` (typo), `turnover tax`, `tax threshold`, `register for VAT`, `VAT threshold`, `R1m`, `tax invoice`, `invoice template`.
- Templates: `quotation`, `receipt`, `privacy notice`.
- Home, safety, licences and selling: `home office deduction`, `zoning`, `test drive`, `scams`, `payshap`, `food licence`, `certificate of acceptability`, `R638`, `second hand goods`.
- Codes: `SAPS 601`, `VAT264`, `EMP201`, `EMP201 deadline`, `ITR14`, `ITR12`, `IRP6`.
- Running a company: `CIPC annual return`, `annual return`, `beneficial ownership`, `financial statements`, `dividends tax`, `loan account`, `salary or dividend`, `paying yourself`, `deemed remuneration`, `UIF`, `COIDA`, `small claims court`, `customer does not pay`.
- Vehicles: `logbook`, `BRNC`, `traffic register number`, `vehicle in company name`.
- Consumer law: `Consumer Protection Act`, `cooling-off period`, `voetstoots`.
- Dates and filing: `tax year 2026/27`, `28 February`, `31 August`, `e-filing`, `efiling`.
- Branding: `logo`, `brand colours`, `AI prompts`, `free tools`, `whatsapp business`, `google business profile`, `instagram`.
- Navigation and pages: `glossary`, `start here`, `how this was made`, `what has changed`, `has changed`, `corrections`, `sources`, `verified`, `limitations`, `small business corporation`, `SBC`, `retirement annuity`, `trading name`, `change company name`, `name`, `change`, `changes`.
- Typed, part of a word: `reg`, `regi`, `provis`, `turno`, `divid`, `VAT26`, `SAPS 60`, `pty l`, `hom`.
- Every page title except the three in minor 2. That includes `vehicle dealer`, `food business`, `master checklist`, `mood and materials`, `running a pty ltd`, `already have your name`, `pick your business type` and `what you need to sell things`.

**Afrikaans, first option is the likely page (OK):**

- Registration and company: `registreer maatskappy`, `maatskappy registreer`, `moet ek ’n maatskappy registreer`, `eenmansaak`, `eenmansaak of maatskappy`, `besigheidsbankrekening`, `inligtingsbeampte`, `POPIA`.
- Tax: `voorlopige belasting`, `voorlopge belasting` (typo), `omsetbelasting`, `omsetbelastng` (typo), `belastingdrempel`, `BTW`, `registreer vir BTW`, `BTW drempel`, `belastingfaktuur`, `faktuur`, `faktuur sjabloon`.
- Templates: `kwotasie`, `kwitansie`, `privaatheidskennisgewing`.
- Home and safety: `tuiskantoor`, `tuiskantooraftrekking`, `sonering`, `toetsrit`.
- Selling and codes: `tweedehandse goedere`, `SAPS 601`, `SAPS60`, `SAPS 60`, `VAT264`, `EMP201`, `EMP201 sperdatum`, `ITR14`.
- Running a company: `CIPC jaarlikse opgawe`, `jaarlikse opgawe`, `finansiële state`, `finansiele state`, `dividendbelasting`, `leningsrekening`, `salaris of dividend`, `betaal jouself`, `kleineisehof`, `kliënt betaal nie`, `maatskappy sluit`.
- Vehicles and consumer law: `logboek`, `afkoelperiode`, `voetstoots`.
- Dates and filing: `belastingjaar 2026/27`, `28 Februarie`, `e-filing`.
- Branding: `handelsnaam`, `handelsmerk`, `logo`, `bemarkingsopdragte`.
- Navigation and pages: `woordelys`, `begin hier`, `hoe dit gemaak is`, `wat het verander`, `regstellings`, `bronne`, `nagegaan`, `versekering`.
- Typed, part of a word: `belas`, `omset`.
- Every page title except `Belasting en SARS` and `Jy is die besigheid`; both pages are on the first screen.

**Misses.** These are queries where the first option, which Enter opens, is not the likely page.

| Query | First option (Enter opens) | Where the likely page is | Severity |
| --- | --- | --- | --- |
| `AI disclosure` (en) | Vehicle dealer "The one defence that works" | Disclosure page 27th overall, not in the dialog | major |
| `disclosure` (en) | "Documents you probably do not need yet" | Not in the results | major |
| `KI-openbaarmaking`, `KI openbaarmaking` (af) | "Watter KI-hulpmiddel" | Not in the results | major |
| `changelog` (en), `veranderingslys` (af) | One changelog section, found through a word in its text | The page's first section is not found | major (same cause) |
| `redline` (en) | nothing found | The page is not found | major (same cause) |
| `ve`, `ver`, `vera`…`verande` while typing, `verander` (af) | "Wat het verander" (the changelog) | The topic sections (verkoop, versekering, …) once more letters are typed | minor 1 |
| `what changed`, `changed` (en) | Free tools term "PDF" | "What has changed" is 4th in the dialog | minor 1 |
| `marketing prompts` (en) | "Branding prompts" | Marketing prompts is 3rd in the dialog | minor 2 |
| `tax and sars` (en) / `Belasting en SARS` (af) | Glossary "SARS" | The page is 4th / 2nd | minor 2 |
| `you are the business` (en) / `Jy is die besigheid` (af) | "Can I put the car in the business name?" | The page is 2nd / 3rd | minor 2 |
| `VAT registration`, `BTW registrasie`, `BTW-registrasie` | Tax invoice template | "VAT: probably not yet" is 2nd | minor 3 |
| `checklist` (en) / `kontrolelys` (af) | Brand file checklist prompt / mood checklist | Master checklist 2nd (en) | minor 3 |
| `liquor licence` (en) | Food "Everything else you may need" | "If you sell alcohol" is 2nd | minor 3 |
| `company tax rate` (en) | Glossary "Deemed dividend" | SBC entry 2nd, "SARS company tax" 3rd | minor 3 |
| `Companies Act` (en) / `Maatskappywet` (af) | Glossary "Trading stock" / "Eienaarbestuurde maatskappy" | No single page; the sources register is 2nd (en) | minor 3 |
| `bankrekening` (af) | Glossary "ShapID" | "Besigheidsbankrekening" is a compound and is not reached | minor 3 |
| `close company`, `deregister company` (en) | An SBC section / "Do I need to register a company?" | "Closing a company properly" is not in the top 3 / is 2nd | minor 3 |
| `Wet op Verbruikersbeskerming` (af) | An unrelated section | The guide keeps the English Act name in Afrikaans | minor 3 |
| `disclaimer`, `accuracy`, `redline`, `bedrogspul`, `medical aid`, `shelf company` | Nothing, or a weak entry | The guide does not use the word | not a search fault |

### Keyboard

Nothing in `src/scripts/` changed since pass 8. I read `search-ui.ts` and `search.ts` again against the dom tests and the e2e tests. These behave as documented:

- Enter with the list on screen opens the active option or the first one, with no new search.
- Enter within the 120 ms debounce, while the index loads, or before the results code loads waits for the current text's list and opens its first option. It is cancelled when the dialog closes or the text changes.
- After the results code fails to load, Enter submits to `/search/?q=`. After the index fails, the failed state shows with the contents link.
- An option highlighted with an arrow key wins on Enter, also on a stale list. Typing clears the highlight.
- The arrow keys wrap. Escape closes in one press, even with text. An IME composition is ignored.
- Re-opening searches the text again, or shows the common questions when the field is empty.
- `/` does nothing in a field.

The e2e keyboard tests passed in chromium and mobile.

### Mutations

I made each change below in a scratch copy of `c1ca282`, never in the worktree, and ran `tests/unit/search` and `tests/dom/search.test.ts`. The baseline is 289 tests, all passing. The worktree's `git status` is clean.

| Change in `src/lib/search-client.ts` | Result |
| --- | --- |
| Title rule without "covers more than half of the title" | killed (2: `check`, `change`) |
| No title lead (`titled` never set) | killed (3) |
| No quarter weight in `boostDocument` | killed (7) |
| Entries whose heading holds every word forced to the front (the pass 8 rule) | killed (20) |
| No demotion of entries that name the words only in their text | killed (9) |
| Title lead picks the best-scoring entry instead of the first in reading order | survives the unit and dom tests. The e2e test (`tests/e2e/search.spec.ts:148`) pins the first section, so it is covered there. |
| `titleHolds` without prefix matching (exact words only) | **survives** (nit 3) |

## Findings

### major: the AI disclosure page cannot be found by the heading shown at its top

File: `scripts/search/entries.ts:165`, `:185-186` (an entry's `title`, `docTitle` and `path` use `doc.title`, the manifest title; `doc.h1`, the heading the page shows, is never indexed); `src/lib/search-client.ts:221-254` and `:435-437` (`titleHolds` checks the manifest title only)

Acceptance item:

- build plan A7: entries for "document + heading to the next heading", and search finds what the reader asks for;
- D5 and ADR 0006: the AI disclosure and how to check the facts must be easy to reach;
- brief step 3: Enter opens the first option.

What is wrong: each page has an H1 in its JSON (`h1`) that the rendered page shows. The index never holds it, and in 22 of 36 pages per language it differs from the manifest title. For most pages this costs little, because the H1's words are also in the page's text. For the two pages about the guide, the H1 is the only place those words appear:

- `start/how-this-was-made` shows "AI disclosure" / "KI-openbaarmaking". Search knows it only as "How this was made and how to check it".
- `start/what-has-changed` shows "Changelog and redline" / "Veranderingslys en verskille". Search knows it only as "What has changed".

Results (the dialog's visible list; Enter opens the first):

| Query | First option | The disclosure or changelog page |
| --- | --- | --- |
| `AI disclosure` (en) | Vehicle dealer "The one defence that works" (CPA). 3rd is a changelog Drive-paste note | 27th of 55, not in the dialog |
| `disclosure` (en) | "Documents you probably do not need yet" | not found (7 results) |
| `KI-openbaarmaking` (af) | "Watter KI-hulpmiddel" (branding) | not found (93 any-word results, none from the page) |
| `KI openbaarmaking` (af) | the same | not found |
| `changelog` (en) | "How to keep the two copies in sync" | only that section, through a word in its text |
| `veranderingslys` (af) | the same section in Afrikaans | the same |
| `redline` (en) | nothing found | not found |

Who hits it, and why it is common:

- Every content page has the AI notice, and its link opens a page headed "AI disclosure" or "KI-openbaarmaking".
- A reader who wants to read that page again types the heading they saw: `AI disclosure`, or `KI-openbaarmaking` in Afrikaans. "Disclosure" is also the usual word for such a notice.
- In both languages the page is not in the list at all. Enter opens a consumer-law section about vehicle dealers, or a branding section.
- This is below the bar the orchestrator accepted for `AI generated` / `KI gegenereer` (the disclosure within the first ten).
- Pass 8's major was this page and the changelog not being findable "by their own titles". The title the reader actually sees was never in the index, so that fix and pass 9's title rule ("asked for by the page's title") cover only the manifest title.

How to reproduce:

- `runSearchCounted(en.index, 'AI disclosure', 'en', {}, BASE)`: the disclosure page is not among `results.slice(0, 26)`.
- `runSearchCounted(af.index, 'KI-openbaarmaking', 'af', {}, BASE)`: no result has `doc === 'start/how-this-was-made'`.

Suggested fix: index the H1 where it differs from the title, for example in the `path` or `title` field of the page's first entry. Let `titleHolds` accept the H1 as well as the manifest title. The "more than half" rule then keeps `AI` or `disclosure` alone from forcing the page to the front.

Acceptance:

- Real-index rows in the query-kind table: `AI disclosure` (en) and `KI-openbaarmaking` (af) open `start/how-this-was-made` first; `changelog` (en) and `veranderingslys` (af) open `start/what-has-changed` first.
- `AI` and `disclosure` alone do not put a page about the guide first.
- The pass 7, 8 and 9 rows still hold.
- `docs/design-system.md` says which titles count as "the page's title".

### minor 1: the title rule's "more than half" depends on stop words, so it fires on Afrikaans prefixes and misses `what changed`

File: `src/lib/search-client.ts:221-254` (`titleHolds`); `src/lib/search/options.ts:104` and `:112` (`what` and `het` are stop words, `has` is not)

Acceptance item: general quality (ranking); `docs/design-system.md` ("`check` or `change` alone does not ask for a page whose title merely holds the word").

What is wrong:

- **Afrikaans fires too easily.** "Wat het verander" is one word after stop words, `verander`. Any query that prefixes it covers "more than half" of the title. So the changelog's first section leads for `ve` and `ver` while typing (the start of verkoop, versekering, verkeer, verbruiker, verklaring), for `vera`…`verande`, and for `verander`. That is the Afrikaans `change`, which the table pins for English (`noGuideIn: 3`). Once a further letter rules the title out (`verk`), the list is right, so this is mostly a passing flash, and `verander` alone is a rare query.
- **English misses.** "What has changed" keeps `has`, so `what changed` and `changed` cover half, not more, and are not "asked for by title". Enter then opens the Free tools term "PDF", and the changelog is the 4th option. A returning reader may type exactly that.

Suggested fix: count title words the same way in both languages (for example, add `has` / `have` to the stop words, or ignore one-letter-to-three-letter prefixes in the title check). Also require a whole word, or at least four letters, before a one-word title leads.

Acceptance: rows for `ver` (typing) and `verander` (af) with `noGuideIn: 3`; `what changed` (en) opens `start/what-has-changed/` first.

### minor 2: three page titles do not open their page

File: `scripts/search/entries.ts:154-197` (a page with no text before its first heading gets no page entry: `start/how-to-use`, `start/how-this-was-made`, `branding/marketing-prompts`, `paperwork/free-tools`); `src/lib/search/options.ts:29-33` (`path` is boosted 1.5 against 3 for `title`)

Acceptance item: general quality (A7 "search finds what the reader asks for").

What is wrong: typing a page's own title as shown in the contents and the navigation does not always open it.

- `marketing prompts` opens "Branding prompts". Marketing prompts has no page entry, its title is only in `path`, and it is the 3rd option.
- `tax and sars` opens the glossary "SARS" (the page is 4th). `Belasting en SARS` (af) has the page 2nd.
- `you are the business` (en) and `Jy is die besigheid` (af) lose every word but "business" / "besigheid" to stop words. The page is 2nd and 3rd.

The page is on the first screen each time, so this is minor.

Acceptance: a row per language that asks every page title for its page, so `marketing prompts` and `tax and sars` open their page first. Or record in `docs/design-system.md` why a glossary entry may lead a page title.

### minor 3: ordinary queries where a related entry leads and the answer is 2nd or lower

File: `src/lib/search-client.ts` (ranking), `src/lib/search/options.ts` (`KIND_WEIGHT`, `FIELD_BOOST`)

Acceptance item: general quality (ranking).

What is wrong: these are common enough that the first option matters, but the answer is on the first screen in each case.

- `VAT registration`, `BTW registrasie` and `BTW-registrasie` open the tax invoice template rather than "VAT: probably not yet" or "Do I have to register for VAT?". `register for VAT` is right; `registration` does not prefix-reach `register`.
- `checklist` and `kontrolelys` open a brand file prompt or the mood checklist before the Master checklist.
- `liquor licence` opens the food page's "Everything else you may need" before "If you sell alcohol".
- `company tax rate` opens "Deemed dividend".
- `Companies Act` and `Maatskappywet` open a glossary entry that mentions the Act.
- `bankrekening` does not reach "Besigheidsbankrekening": the end of a compound is out of reach of prefix matching.
- `close company` misses "Closing a company properly": there is no stemming, as ADR 0003 accepts.
- `Wet op Verbruikersbeskerming` finds nothing relevant, because the Afrikaans guide keeps "Consumer Protection Act".

Suggested fix: optional. Rows for `VAT registration` and `BTW registrasie` are the most useful, for example by giving a quick answer or section the extra term `registration` / `registrasie`.

### nit 1: the `DOC_WEIGHT` comment describes the pass 8 rule

File: `src/lib/search/options.ts:50-56`

What is wrong: the comment says that a result whose heading or page title does not hold every word "weighs this much and never leads", and that one whose heading holds every word "ranks normally". Since `9ecb225`, every result from these pages weighs a quarter (`boostDocument`). Only a title query leads. Align it with `docs/design-system.md`.

### nit 2: ADR 0003's implementation notes put pass 9 before pass 8

File: `docs/adr/0003-minisearch.md:34-35`

What is wrong: the notes run pass 1 to 4, then pass 9, 8, 7, 6, 5. Put them in one order.

### nit 3: no test fails when the title check loses prefix matching

File: `src/lib/search-client.ts:226-229`; `tests/unit/search/index.test.ts` (the "page about the guide, by name" rows)

What is wrong: with `titleHolds` matching whole words only, all 289 search tests pass. The prefix lets the title lead while the last word is still being typed (`how this was ma`, `wat het veran`), which is what the live dialog sends. Add a typed row, for example `how this was ma` with `typing: true` and `firstDoc: 'start/how-this-was-made'`.
