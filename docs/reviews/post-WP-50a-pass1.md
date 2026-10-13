# Post-WP-50a review, pass 1

Scope: `git diff 75ba3ee f4160fa`, without the docs commit `3437e75` (WP-50 design decisions). That is three merges and one fix:

1. `7bf4ab0`: the English-source errata from `WP-40-owner-items.md`, their Afrikaans mirrors, and the curated Afrikaans summary for the vehicle-dealer page.
2. `df3ab2c`: the new document "Closing as a sole proprietor" in English and Afrikaans, with its sources, links from other documents, search keywords and acceptance queries.
3. `7fa07fe`: backlog fixes that do not depend on design. These are the wizard tick order kept in `history.state`, the storage warning shown from the first paint, the prompt button names, coverage for the content report, the search chip's row, the `dist:trust` tests and the removed `ManifestSchema.searchIndex`.
4. `f4160fa`: the best bet "sources for tax". The coordinator added it during this pass, after the reviewer reported that `3437e75` failed `gate:fast`.

The reviewer is independent and changed no code. Worktree branch: `worktree-agent-a955b61d68cfe03f8`, at `f4160fa` plus this file.

## Verdict: clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 0 |
| Minor | 3 |
| Nit | 3 |

- One problem was found at `3437e75`: the acceptance query "sources for tax" lost its first result, so `pnpm gate:fast` failed. It is recorded under "Fixed during this pass". `f4160fa` fixes it, and every check below passes on `f4160fa`. A major is reported only on the tree that was asked for. The final tree has no major, so this pass is clean. The process gap stays as minor 1.
- The new document is correct. Each fact in it either repeats wording the guide already sources, or has a new entry in the register that says it was not opened. No figure, form code or deadline contradicts the rest of the guide.
- All the errata are fixed correctly. No heading id changed. The one checklist task whose text changed has a rename entry.
- Every closed backlog row was checked. Each is fixed and has a test.

## Checks run

Logs are in `/tmp/pa1-*.log`.

`pnpm gate:fast` at `3437e75` (`pa1-gatefast.log`) failed:

```
 FAIL  |unit| tests/unit/search/acceptance.test.ts > search acceptance set: en > finished > "sources for tax"
 FAIL  |unit| tests/unit/search/acceptance.test.ts > search acceptance set: en > typed > "sources for tax"
AssertionError: first should be lookup/sources#tax-and-sars; got core/paying-yourself#uif-sources-disagree | lookup/sources#tax-and-sars | lookup/sources#paying-yourself-from-a-company
      Tests  2 failed | 3669 passed (3671)
exit 1
```

Bisecting: the test passes at `7bf4ab0` (merge 1) and at `5721c27` (the closing-page branch on its own). It fails at `df3ab2c`, the merge that combines them.

`pnpm gate:fast` at `f4160fa` (`pa1-gatefast2.log`):

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  81 passed (81)
      Tests  3671 passed (3671)
Content drift: none.
 Test Files  1 passed (1)
      Tests  40 passed (40)
EXIT 0
```

`pnpm content:fidelity --lang af` (`pa1-fidelity2.log`):

```
Fidelity af: 37 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

`pnpm build` (`pa1-build2.log`):

```
21:20:02 [build] 210 page(s) built in 5.39s
dist:audit: 210 HTML file(s), 28665 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 74 document page(s), each with its AI notice and sources; 99 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 210 page(s) within budget.
EXIT 0
```

`pnpm search:diff 75ba3ee` (`pa1-searchdiff2.log`):

```
search:diff 75ba3ee: 10158 searches, 125 changed first results: 68 better, 0 worse, 0 same-target, 57 ?.
```

- No acceptance query lost its first result.
- `tests/search/acceptance-queries.json` only gains rows: 14 new rows, all with `need: "first"`. No existing row is removed or loosened.
- The 57 rows marked `?` were all read; see minor 2.

e2e at `3437e75` on the same build as `f4160fa`, apart from the search index (`pa1-e2e.log`). Specs: `wizard`, `wizard-shift`, `templates`, `template-shift`, `search`, `content`, `nojs` and `interactive`; projects chromium, mobile and nojs; `PW_PORT=4531`.

```
  7 skipped
  841 passed (12.4m)
EXIT 0
```

- The log has no `✘` lines.
- The template sweeps all report `worst shift 0.000, worst field movement 0.0px`.
- The new test "a template with storage blocked: the warning is there before the script" passed for en and af.
- The Back tests in `wizard.spec.ts` passed. They tick beauty before food and check the saved order.

After `f4160fa`, `search.spec.ts` was run again on the new build (`pa1-e2e-search2.log`), and so was `pnpm test:a11y` (`pa1-a11y.log`, `PW_PORT=4532`):

```
search.spec.ts (chromium, mobile, nojs): 60 passed (1.1m), EXIT 0, no ✘ lines
```

```
pnpm test:a11y: 440 passed (7.2m), EXIT 0, no ✘ lines
```

The rendered `/core/closing-as-a-sole-proprietor/` and `/af/core/closing-as-a-sole-proprietor/` were also read in `dist`:

- Both pages show the AI notice ("About this page" / "Oor hierdie bladsy") directly under the summary.
- The English page has "Sources for this page" with 20 sources. Each of the five new Act entries shows "Not opened when this entry was added. Confirm …".
- The heading ids in the Afrikaans JSON match the English ones exactly (13 English slugs).

## Fixed during this pass

### major (fixed in `f4160fa`): the integrated tree failed `gate:fast`
File: `tests/search/acceptance-queries.json:2503` (the "sources for tax" row, `need: "first"`)
Acceptance item: "no acceptance query lost its first result"; CLAUDE.md: "Run `pnpm gate:fast` before claiming a change is done".
What was wrong: at `3437e75`, "sources for tax" opened `core/paying-yourself#uif-sources-disagree` first, ahead of `lookup/sources#tax-and-sars`. Neither branch failed on its own; the failure came from merging them. `f4160fa` adds the phrase to the existing best bet for `lookup/sources#tax-and-sars` (`content-meta/search-best-bets.json`), and the row passes again. The process gap stays open as minor 1.

## Findings

### minor 1: merges went in without `gate:fast` on the merged tree
File: merge commit `df3ab2c` (and `7fa07fe` on top of it)
Acceptance item: general quality, and the review protocol's "After merge" step
What is wrong: `gate:fast` was red at both merges and at `3437e75`. It turned green only once the reviewer reported it. The best bet in `f4160fa` repairs this one query, but the cause is a ranking change from the new corpus. Other phrasings can still drift; see minor 2.
How to reproduce: `git checkout df3ab2c && pnpm exec vitest run tests/unit/search/acceptance.test.ts -t "sources for tax"` gives 2 failed. At `5721c27` and at `7bf4ab0` it gives 2 passed.
Suggested fix: after each merge into the integration branch, run `pnpm gate:fast` on the merged tree before the next merge, as the protocol says.

### minor 2: some of the 57 unlabelled search changes are worse for a reader
File: `content-meta/search-keywords.json:44` and `content-meta/search-best-bets.json` (no rows yet); the cause is the new document's wide vocabulary.
Acceptance item: search, "nothing worse for a reader"
What is wrong: `search:diff` marks these first results `?`, not "worse". They do send a reader asking about something else to the closing page:

| Index, query | Before | After | Why it is worse |
| --- | --- | --- | --- |
| en, `deregistreer my maatskappy` (finished and typed) | `core/running-a-pty-ltd#closing-a-company-properly` | `core/closing-as-a-sole-proprietor#turnover-tax-if-you-registered-for-it` | The query says "company"; the new page is for sole proprietors only and says so. `deregistreer`, `deregistreer besigheid` and `deregistreer my besigheid` move the same way, to the turnover tax section rather than the top of the page. |
| en, `licences` and `licenses` | `core/adding-new-lines` | `core/closing-as-a-sole-proprietor#licences-and-registrations` | A reader who types "licences" usually wants to get one, which is `core/what-you-need-to-sell-things`, not to cancel one. |
| en, `act on vat` and `sars act`; af, `invoice act` | VAT or provisional tax sections | `core/closing-as-a-sole-proprietor#vat-if-you-are-registered` | The closing VAT section now answers general VAT and SARS questions. |
| af typed, `bronne vir logo` | `lookup/sources#branding-tools-referenced` | `core/start-here#what-is-in-this-toolkit` | It moved away from the right sources section. |
| en, `employing staff` | `core/working-from-home-and-safety#zoning` | `core/closing-as-a-sole-proprietor#if-you-had-staff` | Wrong before and still wrong: the query is about hiring. This is backlog WP-33 pass 21 nit 2, still open. |

The other `?` rows are neutral or better: `ITR 14 deadline` now opens `glossary#itr14`; `records source` and `sources for labour` open the register's new section; `toemaak` now finds the page; the rest are typed fragments (`had`, `reg`, `lang`, `added`).

How to reproduce: `pnpm search:diff 75ba3ee | grep -P '^\?'`
Suggested fix: add acceptance rows (`need: "first"`) for `deregistreer my maatskappy`, `licences` and `bronne vir logo` that pin the earlier targets, then fix them with best bets or keywords. Tuning the closing page's section weights would also work.

### minor 3: the guide's change and method records do not mention the new document, and the legislation table does not list its Acts
File: `docs/rsa-business-toolkit/00 Start here/03-what-has-changed.md:97` (last change is "Change 4"); `docs/rsa-business-toolkit/00 Start here/02-how-this-was-made.md`; `docs/rsa-business-toolkit/05 Look it up/03-sources-and-verification-register.md:29-46`
Acceptance item: ADR 0006 (disclosure); general quality
What is wrong: when "You are the business" was added on 14 September, the guide recorded it as "What has changed" change 4 and as the twelfth pass in "How this was made", and `provenance.json` cites both. "Closing as a sole proprietor" has no change entry and no pass entry. The method page therefore never says that this page's new Act citations were not opened. The legislation table also does not list the Tax Administration Act, the Prescription Act or the Unemployment Insurance Act, and it does not add `01-core/11` to the rows for the Income Tax, VAT, POPIA, Businesses and Second-Hand Goods Acts. The per-source "Not opened" marks are on the page itself, so a reader is not misled there. A reader of the change log, though, cannot see that the page exists. The page's notice also says "An AI checked it against the sources below" while five of those sources say "Not opened", which is a softer form of the same gap.
Suggested fix: add "Change 5: closing as a sole proprietor" and a matching pass in "How this was made" that says the five Acts were not opened. Add the three Acts to the legislation table and `01-core/11` to the existing rows, in English and Afrikaans.

### nit 1: the closing page links to the Pty Ltd page without its anchor
File: `docs/rsa-business-toolkit/01 Core - applies to everyone/11-closing-as-a-sole-proprietor.md:3`
What is wrong: "[Running a Pty Ltd](06-running-a-pty-ltd.md) covers closing a company" opens the top of a long page. The section is `#closing-a-company-properly`, which links back here.
Suggested fix: link to `06-running-a-pty-ltd.md#closing-a-company-properly`, in both languages.

### nit 2: "You registered yourself with the Information Regulator" assumes the reader did
File: `docs/rsa-business-toolkit/01 Core - applies to everyone/11-closing-as-a-sole-proprietor.md:96` (af: same line)
What is wrong: other items on that list start "if you had staff" or name the business type. This one states as fact a registration that many one-person businesses never made. A first-time owner who did not register may think they have to now.
Suggested fix: "If you registered yourself as information officer with the Information Regulator at inforegulator.org.za, ask the Regulator …".

### nit 3: one awkward Afrikaans checklist line
File: `docs/rsa-business-toolkit-af/01 Core - applies to everyone/11-closing-as-a-sole-proprietor.md:140`
What is wrong: "Elke skuld wat ek het gelys, en hoe ek elkeen gaan betaal" needs a comma after "het" to parse. Line 142 has one ("… wat die besigheid het, gelys"). Changing the text changes the task key. The key was released in this package, so the change needs a `task-renames.json` entry.
Suggested fix: "Elke skuld wat ek het, gelys, en hoe ek elkeen gaan betaal". Leave it if the rename is not worth it.

## What was checked and found right

**New document, facts.** Each claim was compared with the rest of the guide:

- R2.3 million turnover tax ceiling: `03-tax-and-sars.md:128`.
- IRP6 dates, the nil-IRP6 sentence and "penalties that grow every month": `03-tax-and-sars.md:50-61`.
- Business owner must be a provisional taxpayer: `:44`.
- Five years from submission: `:184`.
- Charging VAT while not registered is fraud: `:180`.
- "Local business income" on the ITR12: `:38`.
- Licence tied to the premises: `04-what-you-need-to-sell-things.md:30`.
- COA cannot be transferred: `:74`.
- SAPS 30-day notice: `01-vehicle-dealer.md:102`.
- Second-hand register kept for five years: `:62`.
- Three-year prescription: `10-you-are-the-business.md:77`.
- Sole proprietor cannot contribute to UIF and is not a COIDA employee: `10-you-are-the-business.md`, and the register's UIF and COIDA entries.
- "Your house and your car": `02-register.md:32`.

The five new register entries are correct statements of the law: TAA s29, VAT Act s24 and s8(2), the UI Act, POPIA s14 and Prescription Act s11(d). Each is marked "Not opened" on the page. `source-map.json` maps every reused entry to the page with a reason. The EMP201 "7th of the following month" and the EMP501 "twice-yearly" wording match the SARS calendar entry.

**New document, voice and structure.** Short sentences, "In plain words" boxes, and a glossary table first, as on the other core pages. `appliesTo: sole-prop`, and the VAT and staff sections and checklist lines carry the existing `vat-registered` and `employer` tags. 17 tasks, and `released-task-keys.json` has 17 new keys.

**Afrikaans.**
- `R2.3 miljoen`, `30 dae`, `EMP201`, `EMP501`, `IRP6`, `ITR12` and `inforegulator.org.za` are byte-identical to the English.
- Terms follow `TERMS-af.json`: eenmansaak, voorlopige belastingbetaler, omsetbelasting, BTW-ondernemer, Return of Earnings (verdiensteopgawe), inligtingsbeampte, handelslisensie.
- Act names stay in English. `Prescription Act` and `Tax Administration Act` were added to `actNames`.
- The fidelity check gives 0 findings.

**Errata.** Each of the ten rows in `WP-40-owner-items.md` was compared with its target:

- "Four rules" now matches the four rules listed.
- The column is called "Business type".
- The spaces are fixed in `a .co.za`, `a .docx` and `suggested .co.za`.
- The marketing prompt points to `01-branding-prompts.md`.
- Prompt 11 is "put it all together", the one-page brand guide.
- The H1s are "Vehicles and your business" and "Documents and templates", and `docs.meta.json` titles follow them in both languages. `grep` finds no old link text in either corpus.
- No heading changed. `lookup/checklist:bcf0f339` → `608a7dd6` is in `task-renames.json` and `task-keys.json`. The new key is in `released-task-keys.json`.
- The Afrikaans vehicle-dealer summary in `docs.meta.json` is a faithful translation.

**Code.**
- Wizard (`src/scripts/wizard.ts:33-61, 263-269`): the order is kept in `history.state` under `stWizardOrder`, merged with the entry's other state. It is filtered to `TYPE_CHOICES`, and `replaceState` is guarded. It is not storage, so the `store.ts` rule does not apply.
- Storage warning (`theme-init.js:18-21`, `utilities.css:49-62`, `TemplateTool.astro:425-435`): it applies only when `theme-init`'s own read throws. Without JavaScript nothing changes, because `theme-init` does not run. Every `st-storage-notice` is `display: block` in its component, so first paint and the script's state match. If the script fails to load, the warning stays shown, which is still true, and the template's print line comes back. It adds no bytes to the heaviest page (24.0 KB).
- Search chip (`search.css:139-145`, `search-ui.ts:131-135`): the row is kept, unseen, only for `html[data-st-profile]`. It is released on `data-ready`. `theme-init`'s `answers()` and `parseProfile` are kept equal by a test.
- Prompt names: only `{title}`, in both `en.json` and `af.json`, and `ParamNames` follows.
- `ManifestSchema.searchIndex` is removed, and a test checks that the strict schema rejects it.

**Backlog.** Each row closed in `backlog.md` cites a commit on this branch (`35ed137`, `0b73540` and `4f70e78` are ancestors) and has a test:

- `wizard.test.ts` and the `wizard.spec.ts` Back test
- `template-shift.spec.ts` and `theme-init.test.ts`
- the `search.spec.ts` chip test and the Afrikaans axe run with a profile
- `report.test.ts` (floor 90)
- `language-marks.test.ts`
- `check-trust.test.ts`
- `i18n.test.ts`
- `validate.test.ts` for the schema

The rows left open (WP-33 nit 2, pass 11 m3, and two of the WP-40 nits) each give a reason.

Not raised, because it predates this scope: "Businesses Act 71 of 1991" shows as "Not an official source" on nine pages, including this one. Its register entry has no link.
