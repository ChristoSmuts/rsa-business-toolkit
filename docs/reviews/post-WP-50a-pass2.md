# Post-WP-50a review, pass 2

## Verdict: CLEAN

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 0 |
| Minor | 4 |
| Nit | 3 |

Scope: `git diff 75ba3ee 498d225`, without the docs commit `3437e75` (WP-50 design decisions). That covers:

- the English errata and their Afrikaans mirrors;
- the new document "Closing as a sole proprietor" in English and Afrikaans;
- the backlog fixes in `7fa07fe`;
- `f4160fa` ("sources for tax");
- the pass 1 fixes `f87c599`, `528bdf9`, `437ccb7`, `8654093`, `4cb8fd4`, `a90d672` and `63cd2b4`, merged in `498d225`.

The reviewer is independent, reviewed the whole diff fresh, and changed no code. Branch: `review-post50a-pass2`, at `498d225` plus this file.

Summary:

- Every gate passes. `search:diff 75ba3ee` reports 0 worse. No acceptance row was removed or loosened. The new document's facts agree with the rest of the guide. The Afrikaans fidelity check gives 0 findings. The new AI-notice sentence is true, matches ADR 0006 and D5, appears in both languages, and is used only on the one AI-checked page that needs it.
- The two new ranking rules are documented in `src/lib/search/options.ts` and `docs/design-system.md`, and they fix the queries pass 1 named. The reviewer then tried owner-style queries that are not in the corpus. Those show the rules are narrower than their descriptions (minors 1 to 3). None is a regression to a page that hides the right answer: each wrong first result links to the right page or shows it in the top three. That is why they are minor, not major.

## Checks run

Logs are in `/tmp/p2r-*.log`.

`pnpm gate:fast` (`p2r-gatefast.log`). Lint passed in this worktree too: the stylelint quirk with nested worktrees did not happen.

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
      Tests  3717 passed (3717)
Content drift: none.
      Tests  40 passed (40)
EXIT 0
```

`pnpm content:fidelity --lang af` (`p2r-fidelity.log`):

```
Fidelity af: 37 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

`pnpm build` (`p2r-build.log`):

```
dist:audit: 210 HTML file(s), 28723 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 74 document page(s), each with its AI notice and sources; 99 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.4 KB without a profile, 34.4 KB with one (budget 45.0 KB, 10.6 KB left).
dist:budget: 210 page(s) within budget.
EXIT 0
```

`pnpm search:diff 75ba3ee` (`p2r-searchdiff.log`):

```
search:diff 75ba3ee: 10172 searches, 154 changed first results: 97 better, 0 worse, 0 same-target, 57 ?.
```

`pnpm search:typos` (`p2r-typos.log`):

```
search:typos: of 59472 one-keystroke typos, 54202 open the correct spelling's first result and 58053 one of its first three.
```

Acceptance rows. `git diff 75ba3ee 498d225 -- tests/search/acceptance-queries.json` has no `-` lines. It adds 39 rows, all `need: "first"`, and 22 of them come from pass 1.

Full e2e on chromium, mobile and nojs (`p2r-e2e.log`). It ran on `PW_PORT=4593`, because 4591 and 4592 were already serving another worktree's preview, so the first attempt stopped with "already used". The log has no `✘` lines, and the known intermittent banner-height test did not fail this run.

```
  95 skipped
  1693 passed (19.3m)
EXIT 0
```

`pnpm test:a11y` (`p2r-a11y.log`, `PW_PORT=4594`, for the same reason):

```
  440 passed (9.1m)
EXIT 0
```

The reviewer also wrote an ad-hoc runner (`scripts/search/*` and `runSearch`, the same path `search:diff` uses). It ran about 130 owner-style queries in both languages, at `75ba3ee`, `f4160fa` and `498d225`. The results are in the findings below and in "Checked and found right".

## Findings

### minor 1: "close my pty ltd" opens the sole proprietor page, not the company's closing section
File: `src/lib/search/options.ts:111-139` (`MOMENT_WEIGHT`), `src/lib/search-client.ts:626-641`
Acceptance item: search, "nothing worse for a reader"
What is wrong: a closing word (`close`, `closing`) puts the closing page back at full weight, even when the query also names a company. The new page then comes first for Pty Ltd owners. Its first line sends them on to the company's section, but the company's section itself is not in the top three for most of these queries:

| Query (en, finished and typed) | `75ba3ee` | `498d225` |
| --- | --- | --- |
| `close my pty ltd`, `close pty ltd`, `close a pty ltd`, `close my pty` | `running-a-pty-ltd#what-happens-if-you-stop-filing` | `core/closing-as-a-sole-proprietor` (company's section not in the top 3) |
| `closing my pty ltd` | `running-a-pty-ltd#2-beneficial-ownership-filing` | `core/closing-as-a-sole-proprietor`, then `#closing-a-company-properly` |

`close my company` and `sluit my maatskappy` are pinned acceptance rows and still pass. Only the `pty` wording slips through. `search:diff` did not show this, because none of these phrases is in its corpus.
How to reproduce: run `runSearch(index, 'close my pty ltd', 'en', {limit: 3, typing: false}, '/')` on the built index, as `scripts/search-diff.ts` `runnerFor` does.
Suggested fix: keep the weight at 0.5 when the query also names a company (`pty`, `ltd`, `company`, `maatskappy`, `bpk`). Or lead with `running-a-pty-ltd#closing-a-company-properly` when a closing word and a company word appear together. Add `close my pty ltd` and `closing my pty ltd` as acceptance rows.

### minor 2: the hiring queries next to "employing staff" still open "If you had staff"
File: `content-meta/search-best-bets.json:397-401`; `src/lib/search/options.ts:111` (weight 0.5)
Acceptance item: search, "nothing worse for a reader"; "the ranking rules are general, not overfitted"
What is wrong: pass 1 named `employing staff` as an example of a query that should not open the closing page. The fix pinned that one phrase with a best bet. The half weight alone is not enough to move the closing page's staff section down, so the other phrasings still lead with it:

| Query | `75ba3ee` | `498d225` |
| --- | --- | --- |
| en `hiring staff` | `working-from-home-and-safety#zoning` | `closing-as-a-sole-proprietor#if-you-had-staff` |
| en `employ staff` | `working-from-home-and-safety#zoning` | `closing-as-a-sole-proprietor#if-you-had-staff` |
| en `staff`, `hire staff`, `employ an employee`; af `personeel aanstel`, `personeel in diens neem` | (right section or neutral) | `#if-you-had-staff` is now 2nd |

The 75ba3ee results were wrong too, so this is not counted as "worse". A reader who is hiring is still sent to the page about letting staff go.
How to reproduce: as in minor 1, with `hiring staff` and `employ staff`.
Suggested fix: add `hiring staff`, `employ staff` and `hiring` to the best bet for `running-a-pty-ltd#employees-including-yourself`, with Afrikaans counterparts (`personeel aanstel`). A more general option is a lower moment weight (about 0.3) for the closing page's sections that are not its title. Add acceptance rows either way.

### minor 3: in Afrikaans, "bronne vir lisensie" now opens "Branding tools referenced"
File: `src/lib/search-client.ts:990-1030` (`headingWord`, `sourceEntry`)
Acceptance item: search, `?` changes that are worse for a reader; "the sources-for rule is general"
What is wrong: the subject is matched against register headings as a whole word, or from seven letters as a prefix. Afrikaans headings are compounds ("Besigheidslisensiëring", "Kosbesighede"), so `lisensie` and `kos` match no heading. The rule then falls back to the first register entry that holds every word, and that entry can be unrelated:

| Query (af index) | `75ba3ee` | `498d225` |
| --- | --- | --- |
| `bronne vir lisensie` (finished and typed) | `start/start-here#licence` | `lookup/sources#branding-tools-referenced` (wrong) |
| `bronne vir lisensies` | `start/how-to-use#path-3…` | `lookup/sources#business-licensing` (right) |
| `bronne vir kos` (finished) | `#legislation-this-toolkit-relies-on` | unchanged, while en `sources for food` opens `#food-businesses` |

The singular and the plural give different results. The `?` list in `search:diff` has the first row. The rule's doc comment and `docs/design-system.md:514-519` describe the English case only.
How to reproduce: `pnpm search:diff 75ba3ee | grep 'bronne vir lisensie'`
Suggested fix: in the Afrikaans index, also accept a heading word that contains the subject (`besigheidslisensiëring` contains `lisensi…` once folded; `kosbesighede` contains `kos`), at least from four letters. Add acceptance rows for `bronne vir lisensie` → `lookup/sources#business-licensing` and `bronne vir kos` → `lookup/sources#food-businesses`.

### minor 4: the register and the change records say "checked 13 September" over content added on 13 October that was not opened
File: `content-meta/provenance.json:7-19` (no record for `lookup/sources`, `start/what-has-changed` or `start/how-this-was-made`); `docs/rsa-business-toolkit/05 Look it up/03-sources-and-verification-register.md:47-49, 387-406`
Acceptance item: ADR 0006 point 2 ("A page some of whose sources could not be opened says so in the notice"); build plan D5
What is wrong: the closing page now has an honest notice. The register page, though, still says "An AI checked it on 13 September 2026 against the sources in the sources register". It now holds three legislation rows and five entries, added on 13 October, that say "Not opened". "What has changed" (change 5) and "How this was made" (the thirteenth pass) carry the same 13 September date. Each such row says "Not opened" inline, so no single fact misleads. The page-level notice, though, says more than is true. The closing page's own provenance reason names this problem ("the register date would say the page was checked before it existed"). The same gap existed on a smaller scale for change 4 (14 September), so it is partly older than this package.
How to reproduce: open `dist/sources/index.html` and read "About this page".
Suggested fix: give `sourcesNotOpened` a no-page-sources variant (for example "… against the sources in the sources register. Some entries could not be opened, and each says so."). Mark `lookup/sources` with it. Or record in `backlog.md` that a page's notice date covers its original check only.

### nit 1: the closing checklist still assumes a SAPS and an Information Regulator registration
File: `docs/rsa-business-toolkit/01 Core - applies to everyone/11-closing-as-a-sole-proprietor.md:156` (af: same line)
What is wrong: nit 2 of pass 1 was fixed in the body (line 96), but the checklist line still reads "Told the municipality, SAPS, the Information Regulator and any other office …". Most one-person businesses hold neither registration.
Suggested fix: "Told every office that issued a licence or registration (the municipality, SAPS, the Information Regulator, …)". This changes the task key, so the line needs a `task-renames.json` entry.

### nit 2: `dist:trust` accepts either AI sentence on any AI-checked page with sources
File: `scripts/dist/check-trust.ts:73-82`
What is wrong: an AI-checked page with sources passes with `body` or with `bodySourcesNotOpened`, whatever its record says. The match between the record and the sentence is pinned only by the unit corpus test in `tests/unit/site/trust.test.ts:118`, which reads `src/data`, not `dist`. This is acceptable as it stands, but a template change that showed the wrong sentence would pass `dist:trust`.
Suggested fix: pass `sourcesNotOpened` into `NoticeShape` and expect the one sentence.

### nit 3: the legislation table's "What it governs" column does not name the new sections
File: `docs/rsa-business-toolkit/05 Look it up/03-sources-and-verification-register.md:34, 39`
What is wrong: `01-core/11` is now listed against the VAT Act and POPIA. Their "What it governs" text still names only s20 and s20(8) (VAT) and s55 (POPIA). It does not name s24, s8(2) or s14, which the closing page relies on.
Suggested fix: add "cancellation (s24), deemed supply on cancellation (s8(2))" and "retention (s14)", in both languages.

## Checked and found right

**Search rules.**
- `MOMENT_WEIGHT` is general in shape: a map from page to weight and words, folded, with the last typed word matched as a prefix from four letters. It is documented in its doc comment and in `docs/design-system.md:505-509`.
- Every query pass 1 listed now opens a sensible first result:
  - `licences` opens What you need to sell things.
  - `sars act` opens Tax and SARS.
  - `deregistreer my maatskappy` opens the company's closing section.
  - `bronne vir logo` opens Branding tools referenced.
  - `employing staff` opens Employees, through its best bet.
- The closing queries open the closing page: `cancel vat registration`, `kanselleer btw registrasie`, `stop trading`, `ophou handel`, `toemaak`, `close sole proprietor`, `eenmansaak toemaak`, `close bank account`.
- `how do i close my business` and `sluit my besigheid` open the company's closing section. That is a pinned decision (acceptance rows at lines 970 and 3623), and that section links to the sole proprietor page.
- The sources-for rule works in both languages for `sources for vat`, `bronne vir btw`, `sources for uif`, `sources for popia`, `sources for licence`, `sources for company` and `bronne vir belasting`. `where are the sources for tax` is better than before.
- Unchanged and still wrong from before this package, so not counted: `licence for food` (glossary first), `employ someone`, `wind up my business`, `quit my business`, `where are the sources for vat` (legislation table).
- Of the 57 `?` rows, apart from those in minor 3, the reviewer judged these better: `toemaak`, `close sole proprietorship`, `ITR 14 deadline`, `sources about popia`, `sources for company`, `sources for licence`. The rest are neutral or fragments: `had`, `reg`, `lang`, `added`, `tax rates` and the `labour` and `records` phrasings. The `labour` and `records` phrasings move from one register entry to another, and neither entry is clearly better.

**AI notice.**
- `bodySourcesNotOpened` and `aiCheckedNotOpenedMeans` are in both `en.json` and `af.json`, and `ParamNames` has the new key.
- The schema refuses `sourcesNotOpened` on a human-verified record (`schema.ts:368`), and `trustNotice()` ignores it there. No page is human-verified today.
- The rendered en and af closing pages show the new sentence and the "Not opened" marks. No other page shows the sentence.
- The wording matches "How this was made" (thirteenth pass): the environment could not reach SARS, gov.za or saflii.org.
- ADR 0006 and D5 are updated. `dist:trust` still finds the notice and sources on all 74 document pages.

**New document.** The reviewer read the whole document and checked it against the rest of the guide:
- The trading name is not registered: `02-register.md:28`.
- R2.3 million, the IRP6 dates and the nil IRP6 sentence: `03-tax-and-sars.md`.
- The SAPS 30 days and the five-year register: `01-vehicle-dealer.md`.
- Three-year prescription and "a sole proprietor cannot contribute to UIF": `10-you-are-the-business.md`.
- VAT Act s8(2) as a deemed supply on cancellation, and TAA s29 counted from the date of submission, are correct statements of the law.

Both nit fixes from pass 1 are in: the anchor link at line 3, and the conditional "If you registered yourself as information officer" at line 96.

**Afrikaans.**
- Heading ids are identical in en and af (13 English slugs). The `verification` records are identical.
- `R2.3 miljoen`, `30 dae`, the form codes and `inforegulator.org.za` are byte-identical to the English.
- The comma fix keeps task key `core/closing-as-a-sole-proprietor:21ec1805`, because keys come from the English text. No rename is needed, and the commit says why.

**Code.**
- Wizard: the order is kept in `history.state` under `stWizardOrder`. It is filtered to `TYPE_CHOICES`, and `replaceState` is guarded. This is not `localStorage`.
- Storage warning (`theme-init.js`, `utilities.css`, `TemplateTool.astro`): it applies only when theme-init's read throws, so pages without JS are unaffected. If the script fails, the print line comes back.
- Search chip row: it is kept, unseen, only for `html[data-st-profile]` until `data-ready`.
- No new `localStorage`, no `href="/…"` literals and no literal colours in the diff.
- `tests/e2e/pages.spec.ts:424-437` takes the Core count from the manifest, with a floor of 10. (The manifest is already parsed at line 29, so the second read could reuse it. That is not counted.)
