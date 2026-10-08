# WP-33 review pass 11 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 10.
- **Date:** 6 October 2026
- **Commit reviewed:** `f45a227` ("docs(search): write down the page title rule for review pass 10"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b f45a227`, the whole package: 51 files, +9757 / -69. The pass 10 fixes are `b0969e6` (code and tests) and `f45a227` (docs).

## Verdict

**Clean: 0 blockers, 0 majors, 2 minors, 3 nits.**

The pass 10 major is fixed. Every page's first entry now carries both its navigation title and its H1. A query that names either title leads with that page, in both languages:

- `AI disclosure`, `KI-openbaarmaking` and `KI openbaarmaking` open `start/how-this-was-made` first.
- `changelog`, `veranderingslys` and `redline` open `start/what-has-changed` first.
- `disclosure` alone now lists the disclosure page (7th of 8; at `c1ca282` it was not found). It does not lead, as the pass 10 acceptance asks.

I also asked every page's titles for their page. I took the navigation title and the H1 in both languages, finished and typed (with the last word cut short by two letters). That is 175 queries, read in the dialog's visible list. 170 open their page first. The other 5 are:

- `start here` and `begin hier`: the guide's own "Start here" leads, and the Core "Start here" is 4th in the dialog. This is by design.
- The three typed cases in nit 1.

The pass 10 minors hold:

- `what changed` and `has changed` open the changelog.
- `ve` and `ver` while typing no longer open it.
- `marketing prompts`, `tax and sars`, `Belasting en SARS`, `you are the business` and `Jy is die besigheid` open their page.
- `how this was made`, `hoe dit gemaak is`, `wat het verander`, `corrections`, `regstellings`, `verified` and `nagegaan` open their page.
- `PAYE deadline`, `EMP201 deadline` and `EMP201 sperdatum` still open the glossary entry.
- `register`, `registreer`, `name`, `naam`, `business` and `besigheid` open their topic, not a changelog note.

`AI generated` keeps the disclosure 10th in the dialog, which was accepted before. `KI gegenereer` moved it up from 7th to 4th.

The two new rules have side effects, and they are minor:

- Headings come before text.
- Page titles are now in the first entry's title field.

## Gate results

I re-ran all of these myself on `f45a227`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0.
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "0 errors".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1265 passed (1265)".
  - Content drift: "Content drift: none."
  - Vitest content: "Test Files 1 passed (1)", "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `search:build`: "en.310b250e3f.json: 945 entries, 739.5 KB raw, 165.6 KB gzip" and "af.52ae2cc2e2.json: 951 entries, 802.6 KB raw, 182.3 KB gzip".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 18.8 KB gzip (search/index.html), budget 45.0 KB." and "loaded on demand (dynamic import(); today only the search dialog): 12.7 KB gzip (shared chunks counted once)."
  - These numbers match `docs/testing.md` and `docs/design-system.md`.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4791`, default reporters): **555 passed, 85 skipped** (6.6 min, exit 0). The failure list is empty: no `✘` line in the log.
- `pnpm test:a11y` (same environment): **196 passed** (5.6 min, exit 0).
- **WebKit was not run.** It is not installed in this environment.
- **Rules.**
  - The added lines under `src/` have no `href="/` literal, no `localStorage`, no `innerHTML` and no literal colour.
  - Nothing under `src/scripts/`, `src/components/` or `src/pages/` changed since `c1ca282`.
  - The index format change bumps `INDEX_VERSION` to 2, so an old cached index shows the failed state, not wrong results.

## My own checks

### Real queries

I built both indexes in memory, the way `tests/unit/search/index.test.ts` does. I ran each query through `runSearchCounted` with `typing` set as the dialog sets it. Then I rebuilt the dialog's visible list with `groupResults`, at most 3 per section. I ran the same scripts against an export of `c1ca282` (pass 10) to compare first options.

There were about 700 distinct queries:

- every English and Afrikaans query from pass 10;
- every glossary term in both languages;
- about 300 more topic, code, typo and partly-typed queries.

The first option changed for 65 of them. Almost all are better. Some examples:

- `tax invoice`, `belastingfaktuur`, `invoice`, `faktuur`, `kwotasie` and `kwitansie` now open the template, not the glossary entry.
- `register for VAT` opens "Do I have to register for VAT?".
- `BTW-registrasie` opens "BTW: waarskynlik nog nie".
- `CIPC annual return` opens the annual return section.
- `vehicle dealer`, `food and drinks`, `voertuie`, `kos en drinkgoed`, `kleinhandel` and `van die huis af werk` open their page.

The two minors below are the changes for the worse that I found.

The owner has accepted the misses below, and they still miss: `VAT registration`, `BTW registrasie` (spaced), `checklist`, `company tax rate`, `Companies Act`, `liquor licence`, `bankrekening` and `close company`. `verander` opens the changelog, which is also accepted.

### Mutations

I made each change below in a scratch export of `f45a227`, never in the worktree, and ran `tests/unit/search` and `tests/dom/search.test.ts`. The baseline is 314 tests, all passing. The worktree's `git status` is clean.

| Change | Result |
| --- | --- |
| `has`/`have`/`had` count as title words | killed (3) |
| A single typed word may be a prefix of a title word | killed (3) |
| Title prefix from 2 letters instead of 4 | killed (1) |
| Coverage of exactly half is enough | killed (2) |
| No "headings before text" promotion | killed (1) |
| H1 not used by the title rule (navigation title only) | killed (2) |
| Headings on pages about the guide promoted too | killed (4) |
| Titles not added to the first entry's title field | killed (8) |
| Tie between two titled pages: last in reading order | killed (1) |
| No "covered most" preference between titled pages | **survives** (nit 3) |

## Findings

### minor 1: "headings before text" also promotes fuzzy and prefix heading matches

File: `src/lib/search-client.ts:452` (`headed` is `allWords({ fields: ['title'] })`, with the normal prefix and fuzzy rules), `:462-463` (every `headed` entry is moved before every text match, whatever its score)

Acceptance item: general quality (ranking); `docs/design-system.md` "Headings before text".

What is wrong: an entry counts as "its heading holds every word" when each query word only resembles a heading word. That covers a prefix (`market` → "marketing") or a one-edit fuzzy match (`stall` → "small"). Such an entry is moved above entries whose text holds the exact words and scores higher.

- `market stall` (en) opens Marketing prompts "Where South African small businesses actually get customers". In the title field, `market` matches "marketing" by prefix and `stall` matches "small" by fuzzy match: `{"marketing":["title"],"small":["title"]}`.
- The guide does answer this question. Retail and online shop, "Do you need a licence", says "Market stalls usually need a trading permit from the market or the municipality rather than a business licence". That entry is 9th in the dialog, behind three branding prompts, two glossary entries and the checklist.
- At `c1ca282` the first option was also wrong (glossary "Trading name"), so this is not a regression of the first option. But the new rule now actively ranks a near-miss heading above exact text. A market or spaza trader is a common reader of this guide.

How to reproduce: `runSearchCounted(en.index, 'market stall', 'en', { typing: false }, BASE)`. The first result is `branding/marketing-prompts/#where-south-african-small-businesses-actually-get-customers`, and `business-types/retail-online/#do-you-need-a-licence` comes after it and after the other branding entries.

Suggested fix: build `headed` from exact word matches, or prefix only for the last word while it is typed, and never fuzzy. For example, run the title-only search with `fuzzy: false` and `prefix` limited to the typed last term. Add a row: `market stall` does not lead with a branding prompt.

### minor 2: a page title in the first entry's title field can beat the template asked for

File: `scripts/search/entries.ts:190` (the first entry's title field gets "first heading · navigation title · H1"); `src/lib/search/options.ts` (`title` is boosted 3)

Acceptance item: general quality (ranking).

What is wrong: "Which template to use when · Documents and templates" now sits in the boosted title field of that page's first entry. A query that names a kind of template plus "template" can now lead with the overview page instead of the template.

- `quote template` (en) opens "Which template to use when". "Template 1: quotation" is 2nd and the Quotation template is 3rd. At `c1ca282` the Quotation template was first.
- `quote templ` while typing: the Quotation template is not in the first three. The overview page is 4th.
- `quotation template`, `invoice template`, `receipt template`, `kwotasie sjabloon` and `faktuur sjabloon` are right. This is about the common short word "quote", which does not prefix-match "quotation".

The template is on the first screen in each case, so this is minor.

Suggested fix: optional. Give the quotation template the extra term `quote` (for example in its index title), or give the index-title words of an overview page a lower boost than its own heading. Add a row: `quote template` opens `templates/quotation/` first.

### nit 1: a title with one content word does not lead while that word is still being typed

File: `src/lib/search-client.ts:260` (`typed = words.length > 1`, counted after stop words)

What is wrong: the prefix rule counts words after stop words. A title with one content word therefore never leads while that word is being typed, even after other words:

- `wat het verand` (af): the changelog is 13th in the dialog.
- `you are the busine` (en): the page is 5th.
- `jy is die besighe` (af): the page is not in the dialog.
- `KI-openb` (af): the disclosure is not in the first three. A hyphenated pair counts as one part.

The finished word is right in each case, so this lasts only while the reader is typing. It is the price of keeping `ve` and `ver` from opening the changelog, so recording it in `docs/design-system.md` is enough.

### nit 2: a code comment claims a result that does not happen

File: `src/lib/search-client.ts:450-451`

What is wrong: the comment says "`VAT registration` opens 'Do I have to register for VAT?' before a template". It does not: `VAT registration` opens the tax invoice template, which is one of the accepted misses. The design system uses the true example, `BTW-registrasie` (which opens "BTW: waarskynlik nog nie"). Use the same example in the comment.

### nit 3: no test pins "the one the query covers most" between two titled pages

File: `src/lib/search-client.ts:448`

What is wrong: when the sort drops `b.cover - a.cover` and keeps only reading order, all 314 search tests still pass. Add a row where two pages qualify with different coverage, or remove the clause if no real query needs it.
