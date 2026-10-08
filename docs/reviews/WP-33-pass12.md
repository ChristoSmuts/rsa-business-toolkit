# WP-33 review pass 12 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 11.
- **Date:** 7 October 2026
- **Commit reviewed:** `1414309` ("docs(search): describe exact heading lifts and titles in the breadcrumb, for review pass 11"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b 1414309`, the whole package. I looked hardest at the pass 11 fixes, `git diff 2b76f2a 1414309`: `57640e4` (code and tests) and `1414309` (docs).

## Verdict

**Not clean: 0 blockers, 1 major, 2 minors, 0 nits.**

The pass 11 findings are fixed as asked:

- Minor 1: `market stall` opens the retail page. "Do you need a licence" is in the first three, and no branding prompt leads, typed or finished.
- Minor 2: `quote template` and `kwotasie sjabloon` open the Quotation template.
- Nit 1: `wat het verand`, `you are the busine`, `jy is die besighe` and `KI-openb` lead with their page while typed.
- Nits 2 and 3: the code comment uses the true example, and a test now pins "covered most".

The new rule for one-word titles has a side effect in Afrikaans, and that is the major. A stop word plus a whole Afrikaans word now counts as "typing" a one-word compound title. So `my belasting` and `die belasting` in the dialog open the tax invoice template for VAT vendors instead of Tax and SARS.

The heading lift and the typo rule are correct for queries spelled right. They cost something for misspelled ones (minors 1 and 2).

## Gate results

I ran all of these myself on `1414309`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0.
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "0 errors".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1274 passed (1274)".
  - Content drift: "Content drift: none."
  - Vitest content: "Test Files 1 passed (1)", "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built in 4.78s".
  - `search:build`: "en.2a2c9793c7.json: 945 entries, 739.4 KB raw, 165.6 KB gzip" and "af.39208bcc98.json: 951 entries, 802.5 KB raw, 182.3 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 19.1 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 12.9 KB gzip (shared chunks counted once)."
  - These numbers match `docs/testing.md` and `docs/design-system.md`.
- Coverage of `src/lib/search-client.ts` (unit and dom): 98.87% statements, 96.82% branches, 100% functions, 99.54% lines.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4793`, default reporters): **555 passed, 85 skipped** (5.0 min, exit 0). There is no `✘` line in the log, so the failure list is empty.
  - My first run of this command is not counted. When I read its log afterwards, it said `[WebServer] ┃ Local http://127.0.0.1:4795/business-toolkit/` and "Running 1015 tests". So I could not show that this run tested this build. The scratchpad is shared, so another session may have written to the same log name. In the second run, the log says `Local http://127.0.0.1:4793/business-toolkit/` and "Running 640 tests". The numbers above are from that run.
- `pnpm test:a11y` (`PW_PORT=4793`, server on `Local http://127.0.0.1:4793/business-toolkit/`): **196 passed** (4.9 min, exit 0), with no `✘` line. I ran it again after a container restart stopped my first run.
- **WebKit was not run.** It is not installed in this environment.
- **Rules.**
  - Since `2b76f2a`, only `src/lib/search-client.ts` and `scripts/search/entries.ts` changed under `src/` and `scripts/`.
  - They add no `href="/` literal, no `localStorage`, no `innerHTML` and no literal colour.
  - No UI string, page or component changed.

## My own checks

### How I ran queries

I built both indexes in memory, the way `tests/unit/search/index.test.ts` does. I ran each query through `runSearchCounted` with `typing` set as the dialog sets it. Then I rebuilt the dialog's visible list with `groupResults`, at most 3 per section.

I ran the same script against three scratch exports, never against the worktree:

- `f45a227`, the pass 11 commit;
- `1414309` with `TYPO_SHARE = 1`, to take out only the typo rule;
- `1414309` with the fixes I suggest below.

I checked the major and minor 1 in the built site too. I started `astro preview` on a port I saw it bind, opened the dialog with `/`, typed the query, read the options and pressed Enter.

### One-letter typos

I took 54 queries a small-business owner would type, in English and Afrikaans. They cover SARS, VAT/BTW, invoice/faktuur, UIF, CIPC, registration, tax, licence, quotation and receipt words. For every word of five letters or more, I made each one-letter typo: a dropped letter, a doubled letter, two letters swapped, and a common wrong letter. That gives 4062 typed and finished queries.

A typo query counts as good when its first option is one of the first three options of the query spelled right, in the same build.

| Build | Typo queries whose first option is good |
| --- | --- |
| `f45a227` (pass 11) | 1899 of 4062 |
| `1414309` with the typo rule off | 1758 |
| `1414309` | 1722 |
| `1414309` with the major and minor 1 fixes below | 1896 |

- The typo rule on its own changes the first option of 15 of the 4062 queries. 4 are better (`cipc annuall return`, `belastingfaktur`) and 4 are worse (minor 2). The other 7 swap two good options or are `market stall` typos, whose correct spelling also changed.
- The other pass 11 changes cost 141 typo queries net (229 lost, 88 gained). Most of the losses are one typo in `cipc annual return`, `cipc jaarlikse opgawe` and `voorlopige belasting` (`business licence` loses 43 too, but its correct spelling's list also changed, for the better). For those three, the cause is that the heading lift now ignores typos, so a misspelt word loses the lift (minor 1). With the fuzzy fallback suggested in minor 1 (and the major fix), the score is back to 1896.
- With the major and minor 1 fixes, the 323 search unit and dom tests still pass. `market stall` still opens the retail page, and the typo score comes back to the pass 11 level.

Typos in the short words SARS, VAT, UIF, CIPC and BTW are not affected by either rule. Words of four letters or fewer get no fuzzy match, so `SRAS` finds nothing, at both commits. `SARSS` opens the SARS glossary entry.

A swap of two letters is two edits in MiniSearch, so `qoute` finds only "route" (glossary "Compilation" first). That was true before this package's last fixes too, and it is a limit of the fuzzy match, so I do not report it.

### The pass 11 changes against real queries

- **H1 placement.** `scripts/search/entries.ts:183` now adds the H1 to the first entry's breadcrumb (`path`) when it differs from the navigation title. `AI disclosure`, `KI-openbaarmaking`, `changelog`, `redline` and `veranderingslys` still open their page. The test that asks every page's titles for their page passes. `provisional tax` now opens the Tax and SARS section, not the glossary entry, which is better.
- **Heading lift.** Only whole words count, plus the beginning of the last word while it is typed, from four letters. I checked that `headingTree` gives no fuzzy and no prefix to earlier words.
- **One-word titles.** These are the one-word titles: "INVOICE", "QUOTATION", "RECEIPT", "Glossary", and in Afrikaans "FAKTUUR", "KWOTASIE", "KWITANSIE", "BELASTINGFAKTUUR", "Woordelys", "Hoofkontrolelys", "Kosbesigheid", "Voertuighandelaar", "Bemarkingsopdragte", "Handelsmerkopdragte", "PRIVAATHEIDSKENNISGEWING" and "Wat het verander". In English none of them begins with another common word, and `my invoice`, `an invoi`, `a receipt` and `my glos` are right. In Afrikaans, a compound title starts with a whole word. That is the major.

The accepted misses (`VAT registration`, `checklist`, `company tax rate`, `Companies Act`, `liquor licence`, `bankrekening`, `close company`) and `verander` opening the changelog are not reported.

## Findings

### major 1: in Afrikaans, a stop word plus "belasting" opens the tax invoice template

File: `src/lib/search-client.ts:267` (`const typed = tokens > 1`), `:268-269` (a typed word of four letters or more may be the beginning of a title word), `:496` (`tokens` counts stop words).

Acceptance item: general quality (ranking). The design-system rule "A query that names a page leads with that page" says only a word *still being typed* may be the beginning of a title word.

What is wrong: since `57640e4`, a single content word after any stop word counts as being typed, and so may be the beginning of a one-word title. Many Afrikaans titles are compounds that start with a whole common word. "BELASTINGFAKTUUR" (H1 of the tax invoice template) starts with `belasting` (tax). So a reader who types "my tax" or "the tax" gets the tax invoice template for VAT-registered businesses as the first option. Enter opens it. Most readers of this guide are not VAT-registered, and the guide tells them so.

- `my belasting`, `die belasting`, `jou belasting`, `van belasting`, `wat is belasting` and `wat is die belasting` (af, typed): the first option is `af/templates/tax-invoice/`. The next two are tax invoice sections, and Tax and SARS ("Voorlopige belasting") is 4th.
- At `f45a227` each of these opened `af/core/tax-and-sars/#provisional-tax`. `belasting` alone still does.
- The dialog reads every query that ends in a letter as typed (`src/scripts/search-ui.ts:242`). So the reader gets this as soon as they stop typing, unless they add a space. The `/search/` page reads the query as finished and is right.
- `my voertuig` now opens the vehicle dealer page ("Voertuighandelaar"). Its sections led at `f45a227` too, so this is not a new miss.

How to reproduce:

- In the unit index: `runSearchCounted(af.index, 'my belasting', 'af', { typing: true }, BASE).results[0].href` is `/business-toolkit/af/templates/tax-invoice/`.
- In the built site: open `/business-toolkit/af/`, press `/`, type `my belasting`. The options are "Belastingfaktuur, BTW-geregistreer (sjabloon)", "Verkorte belastingfaktuur", "Die sewe dinge wat 'n volledige belastingfaktuur moet wys", then "Voorlopige belasting (provisional tax)". Enter goes to `/business-toolkit/af/templates/tax-invoice/`.

Suggested fix: let a stop word make the last word "typed" only when that word is not itself a whole word of the index. `verand`, `busine`, `besighe` and `openb` are not words, but `belasting` is. For example, in `titleCoverage` use `typed = words.length > 1 || (tokens > 1 && !whole)`. In `runSearchCounted`, set `whole` when the last part, searched with no prefix and no fuzzy, has hits. I tried this in a scratch export:

- `my belasting`, `die belasting` and `wat is die belasting` open Tax and SARS.
- `wat het verand`, `you are the busine`, `jy is die besighe` and `KI-openb` still lead with their page.
- All 323 search unit and dom tests pass.

Add rows: `my belasting` and `die belasting` (af, typed) do not open `templates/tax-invoice/` first.

### minor 1: one typo drops the heading lift, so the section asked for falls behind glossary entries

File: `src/lib/search-client.ts:513-517` (`headed` is built from `headingTree`, which has no fuzzy match), `:284-311` (`headingTree`).

Acceptance item: general quality (ranking).

What is wrong: the pass 11 fix rightly stops a typo match from lifting a heading above text that holds the exact words (`stall` is not "small"). But when the reader misspells a word, no entry holds it as written, so no heading is lifted at all. Pure score order then puts short glossary entries first.

- `cipc anual return` (en) and `cipc jarlikse opgawe` (af), typed or finished: the options are glossary "Annual return", glossary "FAS", the Sources entry, then "1. CIPC annual return". At `f45a227` the section was first, and it still is when spelled right.
- `voorlopige belastnig` (af): glossary "Voorlopige belastingbetaler" first. At `f45a227` the Tax and SARS section was first.
- Over the 4062 one-letter typos, the pass 11 changes other than the typo rule drop the good first options from 1899 to 1758. The fallback below brings them back.

The section is still on the first screen, and the glossary entry says what an annual return is. So this is minor.

How to reproduce: `runSearchCounted(en.index, 'cipc anual return', 'en', { typing: true }, BASE)`. The first result is `glossary/#annual-return`, and `core/running-a-pty-ltd/#1-cipc-annual-return` is 4th in the dialog. I saw the same order in the built site's dialog.

Suggested fix: use the fuzzy heading match only when no all-words result holds every word as written (`every.every((hit) => !holdsAsWritten(hit.terms, parts))`). Then a typo can never lift a heading above an exact match, which was the point of pass 11 minor 1, but a misspelt query keeps the lift. In a scratch export, with the major fix as well:

- `cipc anual return` and `cipc jarlikse opgawe` open "1. CIPC annual return".
- `voorlopige belastnig` opens the Tax and SARS section.
- `market stall` and `marke stall` still open the retail page.
- All 323 search tests pass.
- The typo score is 1896 of 4062.

Add a row: `cipc anual return` opens `core/running-a-pty-ltd/#1-cipc-annual-return`.

### minor 2: the typo rule counts a typo that begins another word as "written"

File: `src/lib/search-client.ts:320-328` (`holdsAsWritten`: `term === word || term.startsWith(word)` for every word).

Acceptance item: general quality (ranking). The typo rule was not asked for, so it should not make a misspelt query worse.

What is wrong: a dropped letter often leaves the beginning of a longer word. `registr` begins "registration" and `compani` begins "companies". `holdsAsWritten` then treats entries with that longer word as holding the word as written. Entries with the word the reader meant ("register", "company") match it only by typo, so their score is halved.

- `registr for vat` (en, typed or finished): the options are the tax invoice template, "Template 3: invoice if you ARE registered for VAT" and "Template 2". "VAT: probably not yet" is 4th and "Do I have to register for VAT?" is 5th. With the typo rule off, and at `f45a227`, Tax and SARS was first.
- `register a compani` (en): the options are glossary "Registered name", "CIPC" and "BizPortal". "Do I need to register a company?" is 4th. With the rule off, `core/register/` was first.

In my 4062 typo queries, these two are the only first options the typo rule makes worse. So it is minor.

How to reproduce: `runSearchCounted(en.index, 'registr for vat', 'en', { typing: true }, BASE)`. The first result is `templates/tax-invoice/`, with `terms` `["registration","vat"]`. The Tax and SARS quick answer has `["register","vat"]` and is 5th. I saw the same order in the built site's dialog, and Enter opens the template.

Suggested fix: count a longer word as written only when the search itself would have read the word as a beginning, that is the last word while it is typed, as `headingTree` does. Or count it only when the rest is a short ending (`s`, `es`, `ed`): `stall` → "stalls" stays written, but `registr` → "registration" does not. Add a row: `registr for vat` does not open a template first.
