# WP-10 content pipeline: review pass 3

- Reviewer: REVIEWER-M (did not do pass 1 or pass 2)
- Worktree: `.claude/worktrees/agent-a57043a283a0c3c96`, branch `worktree-agent-a57043a283a0c3c96`, HEAD `68fd583` (confirmed with `git rev-parse --short HEAD`)
- Fix round reviewed: `git diff 2db7941..68fd583` (41 files, +807 −108). Whole package re-read where the fix round touched it: `git diff a566e88...HEAD` (114 files)
- Date: 2026-09-17

## Verdict

**NOT CLEAN.** 0 blocker, 1 major, 2 minor, 7 nit.

Both pass-2 majors are fixed, and I confirmed each one with my own probes, not only the tests. `human-verified` now refuses every bad case in the brief. Ordinals are compared by number, including through the full `buildContent` fidelity path on a real document. The six missing Act citations are mapped, and each mapping reason is true of the page text.

One major remains, and it is in the fix round itself. A page that must list sources can still get a source-note exemption. Nothing checks the reason, and the fix round used that path with a reason that is not true of the fixture text. `paperwork/templates/quotation-fixture` says the company registration number "is required by law". The fixture register's Companies Act row lists that document. The production quotation template maps the Companies Act for exactly that sentence. The fixture was still exempted as making "no factual claims from the sources register". `docs/outstanding-work.md` records that the stopped agent had decided on "truthful entry and act mappings for the fixtures rather than weaken the rule". The fix round did the opposite.

The coverage minor from pass 2 (m9) is not fixed. The fix round added a 90% branch threshold, but the package is at 88.12%, so every coverage run now exits 1.

## Ownership

`git diff --name-only a566e88...HEAD` lists 114 paths. All but four are in content-pipeline paths (`content-meta/**`, `scripts/content/**`, `scripts/translate/**`, `src/data/**`, `src/lib/content/schema.ts`, `tests/content/**`, `tests/unit/content/**`). The other four are `scripts/build-content.ts` and `src/content.config.ts` (both owned by content-pipeline under D1), `package.json` (a shared file, already accepted in pass 2), and **`vitest.config.ts`**, which is new in `68fd583`. `vitest.config.ts` is a root config owned by scaffold/tooling. Under D1, shared files change through small single-purpose commits that the orchestrator merges. See minor m1 below.

## Command tails (run by me in the worktree)

`pnpm content:build --report` (exit 0, 515 lines; full output in `scratchpad/wp10-pass3/report1.txt`):

```
Docs per section: en {branding: 5, business-types: 7, core: 10, lookup: 3, paperwork: 7, start: 4}
Blocks by kind (en): callout 71, code 54, glossary 7, heading 491, hr 144, list 103, note 6, paragraph 1318, table 28, tasklist 37, terms 19, toc 1
Tasks: 213 · Glossary: 121 entries in 7 groups · Sources: 105 entries (101 with a URL, 4 citations without a URL), 7 sub-groups, 14 acts
Placeholders: 72 inline, 153 in fences
Fence variants: example 3, listing 2, prompt 36, snippet 8, template-preview 5 (+1 replaced by a table of contents)
Legacy refs resolved: 101 · Internal links resolved: 218 · External links: 170
Unsupported nodes: 0 · Unresolved links/refs/anchors: 0 · Unclassified fences: 0
af: no source tree at …\docs\rsa-business-toolkit-af (skipped)
Wrote 0 changed files, removed 0, 41 files in total.
…
== Register entries without "what it supports" text (en): 7 ==
cliffe-dekker-hofmeyr-2026-budget-summary-vat
rlv-form--application-for-registration-and-licensing-of-motor-vehicle
saflii--second-hand-goods-act-consolidated-text
sme-south-africa-1
yebo-business
iol--the-mercury
the-citizen-local-titles

== Acts named in a document's text but not in its sources.acts (en): 32 ==
…
== Capitalised month names not counted as dates (en): 2 ==
…
== Month words in another case, never dates (en) ==
may: 113 in 29 docs
october: 1 in 1 docs
```

Build twice and hash `src/data` (`find src/data -type f | LC_ALL=C sort | xargs sha256sum | sha256sum`):

```
exit1=0
Wrote 0 changed files, removed 0, 41 files in total.
exit2=0
Wrote 0 changed files, removed 0, 41 files in total.
H1=4d500281455cdbc9fcbc652f53b4ff7d829ce748b91e2268159ab90dfdcc3fed *-
H2=4d500281455cdbc9fcbc652f53b4ff7d829ce748b91e2268159ab90dfdcc3fed *-
41
```

`git status --short` was empty after both builds.

`pnpm content:drift`:

```
Unsupported nodes: 0 · Unresolved links/refs/anchors: 0 · Unclassified fences: 0
af: no source tree at …\docs\rsa-business-toolkit-af (skipped)
Wrote 0 changed files, removed 0, 41 files in total.
Content drift: none.
exit=0
```

`pnpm lint`:

```
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
exit=0
```

`pnpm typecheck`:

```
Result (66 files):
- 0 errors
- 0 warnings
- 0 hints
exit=0
```

`pnpm exec tsc --noEmit -p .`: no output, exit 0.

`pnpm test`, first run (default pool). This was machine load, not a failing test:

```
Error: [vitest-pool]: Timeout starting forks runner.
 Test Files  13 passed (13)
      Tests  330 passed (330)
     Errors  4 errors
   Duration  134.43s
[ELIFECYCLE] Test failed. See above for more details.
exit=1
```

`pnpm test --maxWorkers=1`, the rerun:

```
 Test Files  17 passed (17)
      Tests  463 passed (463)
   Duration  116.55s (tests 61%, import 31%, transform 8%)
exit=0
```

`pnpm test:content`:

```
 Test Files  1 passed (1)
      Tests  32 passed (32)
   Duration  11.82s
exit=0
```

`pnpm exec vitest run --project unit --maxWorkers=1 --coverage --coverage.include='scripts/content/**' --coverage.reporter=text`:

```
 Test Files  17 passed (17)
      Tests  463 passed (463)
All files          |   97.02 |    88.12 |   99.31 |   98.27 |
  build.ts         |   92.76 |    77.02 |   96.66 |   92.71 |
  facts.ts         |     100 |    81.81 |     100 |     100 |
  fidelity.ts      |   93.59 |    83.48 |     100 |   97.65 |
  provenance.ts    |     100 |     90.9 |     100 |     100 |
  report.ts        |   99.18 |    64.93 |     100 |   98.98 |
  sources.ts       |   95.61 |    88.47 |     100 |    97.8 |
Statements   : 97.02% ( 2348/2420 )
Branches     : 88.12% ( 1581/1794 )
Functions    : 99.31% ( 438/441 )
Lines        : 98.27% ( 2055/2091 )
ERROR: Coverage for branches (88.12%) does not meet "scripts/content/**" threshold (90%)
exit=1
```

The same run with `--project unit --project content` (18 files, 495 tests passed) gives identical figures and the same `ERROR`, exit 1. The content project adds no branch coverage.

I did not run `pnpm build`, Playwright or a preview server, as the brief instructed.

## Pass-2 verification

| Pass-2 item | Fix in `68fd583` | Status and evidence |
|---|---|---|
| **M1** `human-verified` without a date or real name | `ProvenanceSchema.verification` is a discriminated union; `IsoDateSchema` checks real calendar dates; `VerificationSchema` and `DocSchema` refuse a blank reviewer and a reviewer on `ai-checked`; `checkProvenanceConfig` refuses future dates | **Fixed.** All 14 bad cases are refused and the valid leap day is accepted (probe 1). Two edge cases remain, see nits n1 and n2 |
| **M2** ordinals ignored by fidelity | `ordinalSuffixes` markers, an `ordinals` fact kind, rule `ordinal` | **Fixed.** Correct ordinals give no finding; changed, added or dropped ones are caught; `7de-dag` works. Proven through `buildContent` fidelity mode on `core/paying-yourself` (probe 2) |
| m1 act rows count as sources; no test pins sources | `doc-without-sources` now needs a register entry or a deliberate map; `corpus.test.ts` pins the sources of 7 documents and asserts that only `paperwork/templates/quotation` lives on an act mapping alone | **Fixed** for mappings (probe 3: dropping the quotation's act mapping fails the build). The exemption path is still open: see **major M1** |
| m3 six pages miss a cited Act | act rules for the Companies Act (`core/adding-new-lines`, `branding/already-have-your-name`), CPA (`core/adding-new-lines`), ECTA (`paperwork/free-tools`), POPIA (privacy notice), VAT Act (tax invoice); Ombud advisory note for services-trades | **Fixed for the six named pages.** Each reason matches the markdown: `08-adding-new-lines.md:48` and `:57`, `00-already-have-your-name.md:50`, privacy notice line 5, free tools line 89, tax invoice line 5 (R50, R5,000, 21 days), services-trades line 51. The same gap remains on three other pages: minor m2 |
| m4 "what it supports" missing for 18 of 105 | `supports` falls back to the qualifier or the single note, recorded in `supportsFrom`; leading dashes stripped; `--report` lists what is left; `corpus.test.ts` pins the count at 7 | **Fixed.** 11 entries now carry `supportsFrom`. I checked the remaining 7 in the register: none has any supporting text (bare list items or bare URLs), so omitting the label is correct. Residue: nit n6 |
| m5 `--out` deletes unrelated files | `assertSafeOutDir` refuses a non-empty folder without a version-1 manifest; tested in `write-meta.test.ts` | **Fixed** |
| m7 stale check depends on `outDir` | `priorDir` defaults to `src/data`; the style guide explains it | **Fixed** |
| m8 `sourceFixes` pattern can match the wrong line; fixes can change facts | pattern anchored to the `2. ` line; `factsDigest` refuses a fix that changes a fact; both tested in `parse.test.ts` | **Fixed**, with a gap for translations: nit n3 |
| m9 branch coverage 88.25% | threshold added to `vitest.config.ts`; no new branch tests | **Not fixed.** Branches are 88.12%, and the new threshold makes the coverage run exit 1: minor m1 |
| n1 start page or glossary without a note builds | `DocSchema.superRefine` requires sources or a note | **Fixed** |
| n2 "Business Act" in two reasons | both now say "Businesses Act" | **Fixed** |
| n3 two tool spellings; one doc checked before it was generated | tool is `Claude, Anthropic` everywhere | **Half fixed.** `core/you-are-the-business` still has `generated.date 2026-09-14` and `verification.checkedOn 2026-09-13`: nit n5 |
| n4 a bare month is not a fact | documented as a known limit in `STYLE-GUIDE-af.md` | **Accepted limit**, documented |
| n5 `allowDomains` limits | comment in `inline.ts` | **Accepted**, documented |
| n6 digest covers one doc and not sources | digest now includes `sources`, `sourceNote`, `verification`; separate pins for 7 docs | **Fixed** well enough |

### The orchestrator's test changes

- **Deliberate act mapping for the synthetic `core/register`** (`provenance.test.ts:121`). This is correct under the new rule and is not a weakening. The "reports every broken mapping" test replaces the acts list and now also expects `core/register: doc-without-sources`, so the new rule is asserted there too.
- **The broken-map test adds one broken entry to the valid fixture map.** This is not weakened. The assertion is still exactly `['source-map']`. It is more precise, because a whole-map replacement would now also raise `doc-without-sources` for every fixture document.
- **Future-date message in file-first order** (`provenance.test.ts:276`). This matches `formatIssue`, and the test injects `today`, so it is deterministic.
- **`Claude, Anthropic` everywhere.** The value in `provenance.json` now matches the corpus footers (n3). This test can no longer tell the default from a footer value, but `parse.test.ts:96` and `special.test.ts:474` still inject `Claude (Anthropic)` and prove the default path. No coverage lost.
- **Fixture exemptions.** These are not acceptable as written. See major M1.

## Findings

### major: a source-note exemption can excuse a page that makes claims, and the fix round did so with an untrue reason (M1)
File: `tests/unit/content/fixtures/meta/provenance.json:6`, `tests/unit/content/fixtures/meta/source-map.json:8` (and `:7`, `provenance.json:5`); `scripts/content/provenance.ts:201-215` (the only exemption check), `:294-303`
Acceptance item: ADR-0006 decision 3 and D5 ("The build fails if a guide, template, checklist or business-type page has no sources and no note"); pass-2 m1; the brief's check that "the exemption mechanism cannot silently excuse a guide that does make claims"
What is wrong: the build accepts a note on any required page if `provenance.json` has an exemption reason of 10 or more characters. Nothing compares the reason with the page, or with what the register says about the page. The fix round used this to make the fixture build pass. `quotation-fixture` contains `Reg. No. [NUMBER] — this is required by law`. The fixture legislation table (`fixtures/en/05 Look it up/03-sources-and-verification-register.md:17`) lists the Companies Act for `03-documents/01` and `02`, which are this document and `which-template-fixture`. Production maps the Companies Act to `paperwork/templates/quotation` for the same sentence (`content-meta/source-map.json:549`). Yet the fixture note says the page "makes no factual claims from the sources register". The exemption reason's list of fixture sources also leaves out the Xero tax-tables item. The appearsIn acts are dropped with no report line. The fixtures now model the pattern that ADR-0006 forbids, and review of the reason did not catch it, even though review is the only guard.
How to reproduce:
1. Read the fixture text above next to `fixtures/meta/source-map.json:8`.
2. Run `pnpm exec tsx scratchpad/wp10-pass3/probe-sources.mts`, case "exempt core/tax-and-sars": remove the tax guide's map rules, add a note and an exemption. The build passes and `core/tax-and-sars` has `sources={"entries":[],"acts":[]} note=yes`, although the legislation table lists it for the Income Tax Act and the VAT Act.
Suggested fix: remove both fixture exemptions and notes, and add a fixture `acts` rule mapping `companies-act` to `paperwork/templates/quotation-fixture` (and to `paperwork/which-template-fixture`, which shows `Reg. No.` for a company), with a reason, as production does. This also gives the fixture build an end-to-end case for a page that lives on a deliberate act mapping. In `mapDocSources`, refuse a note or exemption for a page that an act's "Where it appears" row lists or whose links match a register entry, unless that evidence is acknowledged explicitly. Add a test for it.

### minor: the new branch threshold fails, and it landed in a root config owned by tooling (m1)
File: `vitest.config.ts:33-36`
Acceptance item: C5 (`test` … "coverage ≥90% on `src/lib/**` and `scripts/**`"); pass-2 m9; D1 file ownership
What is wrong: pass 2 suggested "add a threshold and tests for the uncovered `build.ts` branches". The threshold was added. No branch tests were added, and branch coverage fell from 88.25% to 88.12%. Every coverage run of the package now exits 1. `gate:fast` does not run coverage, so the gate stays green, but a CI coverage step added in WP-51 would go red at once. `vitest.config.ts` is not a content-pipeline path.
How to reproduce: `pnpm exec vitest run --project unit --maxWorkers=1 --coverage --coverage.include='scripts/content/**'` prints `ERROR: Coverage for branches (88.12%) does not meet "scripts/content/**" threshold (90%)`, exit 1.
Suggested fix: add branch tests for `report.ts` (64.93%), `build.ts` (77.02%) and `facts.ts` (81.81%) until the threshold passes. Or record the shortfall in `docs/reviews/backlog.md` and set the threshold to the measured value in a separate commit the orchestrator merges.

### minor: three more pages cite an Act by section without listing it (m2)
File: `content-meta/source-map.json` (acts rules, around `:548-576`)
Acceptance item: D5 "Sources for this page"; pass-2 m3
What is wrong: the fix round mapped the Companies Act for its own stated reason, "Each states that a company must show its registered name and registration number on its documents, which is section 32". It skipped two other pages that make the same statement, and one tax citation:
- `core/running-a-pty-ltd`: `06-running-a-pty-ltd.md:36` "Section 32 of the Companies Act requires the registered name and registration number…". `sources.acts` is `[]`.
- `paperwork/which-template-to-use-when`: `01-which-template-to-use-when.md:51` "…under section 32 of the Companies Act". It also names the Consumer Protection Act in prose at `:368`, and ECTA sections 43, 44 and 46 in a prompt at `:361`. `sources.acts` has only the VAT Act and POPIA.
- `business-types/vehicle-dealer`: `01-vehicle-dealer.md:341` "Section 22 of the Income Tax Act requires closing trading stock…". The page has 6 acts, but not the Income Tax Act.

The fix round's own report section, "Acts named in a document's text but not in its sources.acts", lists all three.
How to reproduce: `pnpm content:build --report`, then the section above; `grep -n "Section 32\|section 32\|Section 22" docs/rsa-business-toolkit/**/*.md`.
Suggested fix: add these pages to the existing Companies Act rule, and add CPA and ECTA rules for the template guide and an Income Tax Act rule for vehicle-dealer, each with a reason.

### nit: an invisible or punctuation-only reviewer name is accepted (n1)
File: `scripts/content/config.ts:320-326`; `src/lib/content/schema.ts` (`VerificationSchema.superRefine`)
What is wrong: `reviewedBy: "​"` (a zero-width space) and `reviewedBy: "-"` pass. `String.prototype.trim` does not remove U+200B. A page would show "Checked by" with no visible name.
Suggested fix: require at least one letter (`/\p{L}/u`).

### nit: "future" is judged by the UTC date (n2)
File: `scripts/content/provenance.ts:272`
What is wrong: `today` defaults to `new Date().toISOString().slice(0, 10)`. Between 00:00 and 02:00 SAST, a review recorded with that day's date is refused as in the future.
Suggested fix: use the `Africa/Johannesburg` calendar date, or allow one day of slack.

### nit: the source-fix fact guard reads translations with English markers (n3)
File: `scripts/content/discover.ts:67`
What is wrong: `factsDigest` always uses `EN_FACT_MARKERS`. An Afrikaans `sourceFix` that changes `7de` to `8ste`, or `Augustus` to `September` in a date, is not seen as a fact change, because English markers do not read Afrikaans ordinal suffixes or month names.
Suggested fix: pass the language's markers into `applySourceFixes`.

### nit: an exemption for a page that needs none is accepted (n4)
File: `scripts/content/provenance.ts:294-303`
What is wrong: `sourceNoteExemptions["start/how-to-use"]` builds without complaint (probe 3, "exemption on start doc"). Exemptions should record real decisions, and an unneeded one hides that.
Suggested fix: also flag an exemption whose page does not satisfy `requiresSources`.

### nit: one document is still "checked" before it was generated (n5)
File: `src/data/en/docs/core__you-are-the-business.json` (from the footer date and the register date)
What is wrong: this is pass-2 n3's second half, still open: `generated.date 2026-09-14`, `verification.checkedOn 2026-09-13`. The AI notice would say the page was checked a day before it was written.
Suggested fix: use the later of the two dates as `checkedOn`, or fail the build when `checkedOn < generated.date`.

### nit: a source title is still a sentence ending in "including" (n6)
File: `src/data/en/sources.json`, entry `cast-versus-calendered-lifespans-cast-roughly-5-to-10-years-outdoors-calendered-roughly-1-to-5-are-consistent`
What is wrong: this is pass-2 m4 residue. The title is "Cast versus calendered lifespans (cast roughly 5 to 10 years outdoors, calendered roughly 1 to 5) are consistent across several independent trade sources, including". Its `supports` now comes from the qualifier, but the rendered title still reads as a broken sentence.
Suggested fix: repair the register entry in WP-47, or put the sentence into `supports` and derive a short title.

### nit: `the 7th of August` and `7 Augustus` would disagree (n7)
File: `scripts/content/facts.ts` (`patterns.ordinal`, `dayMonth`)
What is wrong: English `7th of August` yields ordinal `7` and no date. The natural Afrikaans `7 Augustus` yields date `--08-07` and no ordinal, so a faithful translation would fail. No corpus sentence has this form today; the only ordinals are `7th of the following month`.
Suggested fix: treat `<ordinal> of <Month>` as a day-month date, or add a line to the style guide.

## Probe results

All scripts are in `scratchpad/wp10-pass3/` and were run with `pnpm exec tsx <script>` from the worktree. No worktree file was changed.

### Probe 1: verification overrides (`probe-verification.mts`)

Each case goes through `ProvenanceSchema`, then `checkProvenanceConfig` with the real clock (today 2026-09-17), then `verificationFor` and `VerificationSchema`.

| Case | Result |
|---|---|
| blank reviewer `""` | refused (schema): `reviewedBy names the person who checked the document` |
| whitespace reviewer `" \t "` | refused (schema), same message |
| NBSP reviewer | refused (schema), same message |
| zero-width reviewer `​` | **accepted** (n1) |
| punctuation reviewer `-` | **accepted** (n1) |
| missing reviewer | refused (schema): `expected string, received undefined` |
| missing own date | refused (schema): `checkedOn: Invalid input: expected string, received undefined` |
| `2026-02-30` | refused (schema): `invalid ISO date: expected a real calendar date written as YYYY-MM-DD` |
| `2025-02-29` | refused (schema), same message |
| `2099-01-01` | refused (build check): `verification-date: … checkedOn 2099-01-01 is in the future (today is 2026-09-17)` |
| `2026-09-18` (tomorrow) | refused (build check), same message |
| reviewer on `ai-checked` | refused (schema): `Unrecognized key: "reviewedBy"` |
| `ai-checked` with future date | refused (build check) |
| unknown status | refused (schema): `Invalid discriminator value` |
| valid review on `2024-02-29` | accepted: `{"status":"human-verified","checkedOn":"2024-02-29","reviewedBy":"Jane Expert CA(SA)"}`, and `VerificationSchema` accepts the output |

### Probe 2: ordinals (`probe-ordinals.mts`)

`extractFacts` with the real `content-meta` markers:

| Language | Text | ordinals | numbers | dates |
|---|---|---|---|---|
| en | `7th 21st 22nd 23rd` | 7, 21, 22, 23 | none | none |
| af | `7de 21ste 22ste 23ste` | 7, 21, 22, 23 | none | none |
| af | `7de-dag 21ste-eeu` | 7, 21 | none | none |
| en | `7th-floor` | 7 | none | none |
| af | `2de 3de 1ste 28ste` | 2, 3, 1, 28 | none | none |
| en / af | `7th of August` / `7 Augustus` | 7 / none | none | none / `--08-07` (n7) |

`compareBlocks` on the real EMP201 sentences (`07-paying-yourself.md:46`, the `02-master-checklist.md:184` row):

| Case | Findings |
|---|---|
| `…by the 7th of the following month` → `…teen die 7de van die volgende maand` | none |
| same, `8ste` | `ordinal 7->8` |
| checklist row, both `7de` | none |
| checklist row, second one `17de` | `ordinal 7->17` |
| checklist row, second ordinal dropped | `ordinal 7->(none)` |
| `21st, 22nd or 23rd` → `21ste, 22ste of 23ste` | none |
| `23rd` → `24ste` | `ordinal 23->24` |
| `the 7th-day rule` → `die 7de-dag-reël` | none |
| same, `8ste-dag` | `ordinal 7->8` |
| `7th` → `sewende` | `ordinal 7->(none)` |
| `7th` → `7` | `ordinal 7->(none)`, `number (none)->7` |

Full pipeline: `buildContent({mode: 'fidelity', doc: 'core/paying-yourself', sourceRoots: {af: <scratch>}})`, with an Afrikaans copy of the real document (footer, plain-words labels and the "Words used" heading in Afrikaans, so the structure aligns):

```
en-copy    findings=0 ordinal/number: []
7de        findings=0 ordinal/number: []
8ste       findings=1 ordinal/number: ["what-it-triggers.3 ordinal 7->8"]
```

### Probe 3: source mapping and exemptions (`probe-sources.mts`)

Each case copies the real `content-meta`, changes it and builds to a scratch folder:

| Mutation | Result |
|---|---|
| Remove the Companies Act rule for `paperwork/templates/quotation` (appearsIn is its only other evidence) | fails: `doc-without-sources: no sources: no link to a register entry and no mapping in content-meta/source-map.json (an act's "Where it appears" row is not evidence on its own)…` |
| Map an act to `branding/marketing-prompts`, which has a note | fails: `act "companies-act-71-of-2008" maps to "branding/marketing-prompts", which has a source note instead of sources` |
| Replace the act rule with one whose reason is `"x"` | fails: `Too small: expected string to have >=10 characters → at acts[5].reason` |
| Remove the map rules for `core/tax-and-sars`, add a note and an exemption | **builds**; `sources={"entries":[],"acts":[]}`, note=yes (major M1) |
| Exemption for `start/how-to-use`, which needs none | **builds** (n4) |

The "act row is not evidence" rule cannot be bypassed through map rules: unknown acts, acts on noted pages and short reasons all fail. I also checked every committed document for register entries found through URL links rather than map rules. There are none, so the only evidence an exemption drops without trace is the appearsIn acts.

### Sample of per-page source mappings (11 documents)

| Document | Mapping | Justified by the page text? |
|---|---|---|
| `core/tax-and-sars` | 7 entries + Income Tax and VAT Acts (pinned in `corpus.test.ts`) | yes (pass-2 audit; unchanged) |
| `core/adding-new-lines` | + Companies Act, CPA | yes, `:48` s32 and `:57` s80 |
| `branding/already-have-your-name` | CIPC trade mark search + Companies Act | yes, `:50` s32 |
| `paperwork/templates/quotation` | Companies Act only | yes, "required by law" header line |
| `paperwork/templates/privacy-notice` | Information Regulator, SERR Synergy + POPIA | yes, line 5 "POPIA makes registration compulsory" |
| `paperwork/templates/tax-invoice` | SARS tax invoice checklist + VAT Act | yes, line 5: R50, R5,000, 21 days; the register's VAT Act row says "tax invoices (s20)" |
| `paperwork/free-tools` | Google Fonts, Inkscape + ECTA | yes, line 89 "legally valid … under ECTA" |
| `business-types/services-trades` | + Ombud Advisory Note 1 | yes, line 51 "six-month implied warranty"; the entry supports "CPA s55 and s56" |
| `paperwork/templates/receipt` | Flip the Market | yes, line 25 "Not 'pending'" |
| `core/vehicles` | RLV form, traffic register number, BRNC guide, Trafico, BloemQ4U + NRTA | yes: traffic register number at `:33-37`, BRNC and proxy terms at `:12-14` |
| `branding/brand-applications-and-polish` | R146, WebAIM | yes, `:141` R146 and `:222` webaim.org |

## Lenses

- **Correctness.** Output is deterministic (identical hashes, no drift). Error messages name the file, document and rule. The new union types flow through `verificationFor` without casts. Findings: M1, m2, n1, n2, n3, n5, n7.
- **Accessibility.** Not applicable to this package, which produces data only. `supports` is now one field, so a page never renders an empty "What it supports" label.
- **Internationalisation.** Ordinal suffixes are per-language markers. English suffixes are accepted in Afrikaans, so an untranslated `7th` still counts. The style guide documents ordinals, the bare-month limit, `--out` and stale checks.
- **Performance.** `factsDigest` runs `extractFacts` twice per applied fix, and there are only a handful of fixes. The build takes about 30 s on this loaded machine, unchanged.
- **Security.** `assertSafeOutDir` closes the `--out` deletion hazard. No network access and no new dependencies.
