# WP-10 content pipeline: review pass 2

- Reviewer: REVIEWER-J (did not do pass 1)
- Worktree: `.claude/worktrees/agent-a57043a283a0c3c96`, branch `worktree-agent-a57043a283a0c3c96`, HEAD `2db7941` (confirmed)
- Diff reviewed: `git diff a566e88...HEAD` (merge base with `main`), 113 files, including `da96cd0`, `b6359c5`, `de62bc3`, `afa541c` (merge) and `2db7941`
- Date: 2026-09-16

## Verdict

**NOT CLEAN.** 0 blocker, 2 major, 7 minor, 6 nit.

The pipeline is careful and well tested. The gates are green, the output is deterministic, and every word of the English source reaches the JSON except the intended removals. The source mappings are specific, not boilerplate. Two gaps must be fixed before merge:

1. `human-verified` can be recorded without a review date, and with a blank reviewer name. The page would then say "Checked by {reviewer} on 13 September 2026", a date that no reviewer gave.
2. The fidelity check ignores ordinal numbers. `EMP201 by the 7th` can become `teen die 8ste` in Afrikaans without a finding. The corpus has 8 such deadlines.

## Ownership

`git diff --name-only a566e88...HEAD` lists 113 paths. All are inside the owned paths: `content-meta/**`, `scripts/build-content.ts`, `scripts/content/**`, `scripts/translate/**`, `src/lib/content/schema.ts`, `src/content.config.ts`, `src/data/manifest.json`, `src/data/en/**`, `tests/content/**`, `tests/unit/content/**`, `package.json`. No `docs/rsa-business-toolkit/**` file is changed by the package.

## Command tails (run by the reviewer in the worktree)

`pnpm content:build --report` (exit 0):

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
```

Build twice and hash `src/data` (`find src/data -type f | LC_ALL=C sort | xargs sha256sum | sha256sum`):

```
b1 exit=0
9aaca2d033373b1cad6947618e7281be5878053defcabe14e4945120c96753ec *-
b2 exit=0
9aaca2d033373b1cad6947618e7281be5878053defcabe14e4945120c96753ec *-
```

`pnpm content:drift`:

```
Wrote 0 changed files, removed 0, 41 files in total.
Content drift: none.
drift exit=0
```

`pnpm lint` (exit 0):

```
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
```

`pnpm typecheck` (exit 0):

```
Result (66 files):
- 0 errors
- 0 warnings
- 0 hints
```

`pnpm exec tsc --noEmit -p .`: exit 0, no output.

`pnpm test` (exit 0, default pool, no timeout on this run):

```
 Test Files  17 passed (17)
      Tests  439 passed (439)
   Duration  87.97s (transform 72%, tests 17%, import 11%)
```

`pnpm test:content` (exit 0):

```
 Test Files  1 passed (1)
      Tests  32 passed (32)
   Duration  13.57s
```

`pnpm build` (exit 0):

```
[build] 1 page(s) built in 2.66s
[build] Complete!
```

`pnpm exec vitest run --project unit --coverage --coverage.include=scripts/content/**` (exit 0):

```
 Test Files  17 passed (17)
      Tests  439 passed (439)
All files          |   96.97 |    88.25 |   99.06 |   98.22 |
  build.ts         |   92.73 |    76.71 |   96.66 |   92.68 |
  fidelity.ts      |   93.59 |    83.18 |     100 |   97.65 |
  facts.ts         |     100 |    83.01 |     100 |     100 |
  provenance.ts    |     100 |    91.66 |     100 |     100 |
  sources.ts       |   95.89 |    89.02 |     100 |      98 |
  report.ts        |   99.02 |    65.07 |     100 |   98.79 |
Branches     : 88.25% ( 1525/1728 )
Lines        : 98.22% ( 1995/2031 )
```

Vitest's fork pool did not time out on start, so no `--maxWorkers=1` rerun was needed.

## Independent counts versus the author's

Counted from the markdown with my own script (fences skipped for line rules), and from the JSON where noted.

| Item | Reviewer | Author (`--report`) | Agree |
|---|---|---|---|
| Documents | 36 | 36 | yes |
| Fenced blocks | 55 | 54 code + 1 replaced by toc = 55 | yes |
| Blockquotes | 71 (65 "In plain words") | callout 71 | yes |
| "Words used in this file" tables | 19 | terms 19 | yes |
| GFM tables | 47 separator rows | table 28 + terms 19 = 47 | yes |
| `---` lines | 173, of which 29 are footer rules | hr 144 (173 − 29) | yes |
| Footers | 29 | 29 docs with `generated` from the footer | yes |
| Glossary lines | 121 | 121 in 7 groups | yes |
| `[Official]` titles | 37 | 37 official entries in `sources.json` | yes |
| Acts table rows | 14 | 14 | yes |
| `- [ ]` tasks | 145 | 213 tasks (145 + ordered checklist items) | consistent |
| H2 + H3 | 309 + 160 = 469 | heading 491 (includes depth-4 pseudo headings) | consistent |

### Round trip of every visible word

Script: `scratchpad/wp10-pass2/roundtrip.mjs`. It compares the multiset of words (`[\p{L}\p{N}]+`) in each English markdown file with every string in the generated JSON. The JSON strings include blocks, terms, docref labels, placeholders, link hrefs, the glossary entries and groups, sources titles, qualifiers, supports, notes, sub-groups and acts. Internal link targets are removed from the markdown first.

Result: 68,041 source words, 1,877 not found. Every missing word falls into one of these intended removals:

| Intended removal | Where it went |
|---|---|
| Generated-by-AI footer line (about 45 words in each of 29 docs) | `doc.generated` (date, tool); the page renders the AI notice from it |
| The `In plain words:` label (65 callouts) | `callout.style: "plain"` |
| The `Word \| Meaning` header of the 19 words tables | `terms` block has no header |
| Numerals of ordered lists (`1.` `2.` …) | `list.ordered` and `list.start`; business-type checklists become tasks |
| `(`04-business-types/01`)` codes after master-checklist group titles (`04`, `business`, `types`) | pseudo-heading `ref` (doc id) |
| The stale box-drawing folder tree in `start/start-here` (344 words) | replaced by a `toc` block via `blockOverrides` (build plan A3 stage 7) |

Nothing else is missing. `paperwork/templates/{quotation,invoice,receipt,privacy-notice}` and `start/what-has-changed` round-trip with 0 missing words.

### Spot checks

- `core/tax-and-sars`: all 7 H2 and 9 H3 sections present; the words table (8 rows), provisional-tax callouts, IRP6 date list and the income tax table rows match the markdown.
- `business-types/vehicle-dealer`: structural digest matches the snapshot; 20 plain-words callouts; ordered checklist items 1 to 22 become tasks.
- `lookup/checklist`: Part A, A2, B groups with `ref`, and Part C `rowWhen` rows match (`validate.test.ts` pins the 7 conditional rows).
- `lookup/sources`: 105 entries, 14 acts, 7 sub-groups; the `sources-text-lost` guard keeps every word.
- `lookup/glossary`: 121 entries in 7 groups; definitions keep links and codes.
- `paperwork/templates/tax-invoice`: header line breaks, placeholders and the numbered field list present.
- `branding/branding-prompts`: 13 prompt fences and 3 worked-answer snippets; placeholders in fences recorded.

### English corrections from `main` in the generated JSON

| Correction | Result |
|---|---|
| FSP glossary entry | `glossary.json` `fsp`: "A business licensed under FAIS to give advice on, or sell, financial products. …" |
| Businesses Act (every doc and the register) | "Businesses Act" in 7 doc JSON files, `glossary.json` (`businesses-act-licence`) and `sources.json`; `grep "Business Act "` finds nothing in `src/data/en` |
| Sole proprietor wording | `glossary.json` `sole-proprietor`: "No company registration needed, but you still need to register with SARS for tax." |
| Step numbering in already-have-your-name | `where-to-go-next.1`: `ordered: true`, `start: 1`, 5 items |

`src/data` is built from the merged markdown: `content:drift` is clean after the merge.

## Per-page sources audit (G16)

Evidence came from `scratchpad/wp10-pass2/audit.cjs` (mapped entries with official flag, how each was mapped, and topic and rand mentions per doc) and from reading the doc passages. "Justified" means the doc makes a claim that the entry's `supports` text or the mapping reason matches.

| Doc | Mapped entries | Justified? | Missing | Notes |
|---|---|---|---|---|
| core/tax-and-sars | 7 entries (5 official): SARS turnover tax, Budget 2026 FAQ, VAT threshold, tax calendar, provisional tax guide; Xero tables, SAIT. Acts: Income Tax, VAT | Yes. Each reason names a figure the doc states (R99,000/R153,250/R171,300, R800,000 → R2,000, IRP6 dates) | No register entry exists for the SBC rates or the income tax brackets. The personal thresholds rest only on Xero (not official). This is for P4a | Removing every map entry for this doc still builds, because the two acts remain (m1) |
| core/register | 12 entries (4 official) + Companies Act, POPIA, B-BBEE Act | Yes | None found | `uif-and-the-self-employed`, `coida-and-working-directors` and `small-claims-court-who-may-sue` have no `supports`; their text is in `qualifier` (m4) |
| core/start-here | 1 official (VAT threshold) | Yes: "a site that says R1 million is out of date" | None needed; it is a route map | Thin but honest |
| core/working-from-home-and-safety | 19 entries (2 official), whole group | Yes; the group covers banknotes, PayShap, POP scams, test drives and zoning, and so does the doc | None | `iol--the-mercury` and `the-citizen-local-titles` have no supports text |
| core/vehicles | 5 entries (2 official) + National Road Traffic Act | Yes | None | `rlv-form…` has no supports text |
| core/adding-new-lines | SARS turnover tax, BizPortal, NADA | Yes | **Companies Act 71 of 2008** (the doc quotes section 32) and **Consumer Protection Act** (it cites section 80) | (m3) |
| branding/already-have-your-name | CIPC trade mark search | Yes | **Companies Act 71 of 2008**: the section "The rule that applies to you because the name is registered" quotes section 32 | The quotation template gets the Companies Act for the same claim; this doc does not (m3) |
| branding/mood-and-materials | 4 entries (0 official), whole group | Yes (colour research, UV fade, vinyl life) | None | One "entry" is titled with a sentence that ends "…including" and holds the URLs in `qualifier` (m4) |
| paperwork/templates/quotation | Companies Act (source-map act rule) | Yes: required registered name and number | None | Only an act, no link; acceptable |
| paperwork/templates/invoice | SARS VAT threshold, Flip the Market | Yes | None | |
| paperwork/templates/tax-invoice | SARS Tax Invoice Checklist (official) | Yes: seven fields above R5,000, abridged R50 to R5,000 | Value-Added Tax Act 89 of 1991 | (m3) |
| paperwork/templates/receipt | Flip the Market (not official) | Yes: the "reflected, not pending" note | None | Only a non-official source; the page must label it |
| paperwork/templates/privacy-notice | Information Regulator (official), SERR Synergy | Yes | **Protection of Personal Information Act 4 of 2013**: the template says "POPIA makes registration compulsory" | (m3) |
| paperwork/free-tools | Google Fonts, Inkscape | Yes | Electronic Communications and Transactions Act: "A signed PDF is legally valid … under ECTA" | (m3) |
| business-types/services-trades | Hanekom Attorneys (WeBuyCars case) + CPA, OHS acts | Partly. A law-firm note about a car dealer supports the generic six-month warranty claim only indirectly | Consumer Goods and Services Ombud advisory note 1 (official), already mapped to the glossary and vehicle-dealer for the same claim. The register has nothing for electrician CoC, NHBRC, CIDB or PSIRA (P4a) | (m3) |
| business-types/beauty | Information Regulator, Businesses Act citation + CPA, Businesses Act, FCD acts | Yes | None found | The Businesses Act appears both as an entry and as an act |
| business-types/food | R638, R146, Food Focus, ASC Food Safety (group) + Businesses Act + 3 acts | Yes | None | |
| business-types/professional-creative | SARS turnover tax + CPA, FAIS | Yes: the 20% professional-services exclusion | None in the register | |
| lookup/checklist | 16 entries (8 official) | Yes; every reason is a line of the checklist | B-BBEE Commission FAQ, BizPortal (Part A mentions B-BBEE and CIPC registration) | |
| lookup/glossary | 38 entries (21 official) | Yes; each reason names a definition | None | Not a "required" kind, but well covered |

Reasons in `source-map.json` are specific and auditable (for example "States the Western Cape tariffs: R102 application, R762 vehicle licensing, R168 …"). None is boilerplate. The schema requires 10 characters, so a boilerplate reason (`xxxxxxxxxx`) still builds; review is the only guard. Two reasons still say "Business Act" (m6 nit).

Official versus non-official labelling comes from the register's `[Official]` tag, by position. 37 of 105 entries are official. `alignSources` checks the flag in translations.

Build rule, tested by mutation (`scratchpad/wp10-pass2/mutate.ts`, in memory with copied `content-meta`):

| Mutation | Result |
|---|---|
| Remove all mappings for `paperwork/templates/receipt` | fails: `doc-without-sources: no sources: no link to a register entry, no act that lists it, and no mapping in content-meta/source-map.json. Map the register entries that support its claims, or give it a note` |
| Remove all mappings for `paperwork/free-tools` | fails, same message |
| Remove the act mapping for `paperwork/templates/quotation` | fails, same message |
| Remove all mappings for `core/tax-and-sars` | **builds**; the page keeps only the Income Tax Act and VAT Act (m1) |
| Give `core/tax-and-sars` a note without an exemption | fails: `source-note-not-allowed: a guide in core must list sources; a note needs a decision recorded in content-meta/provenance.json sourceNoteExemptions` |
| Remove the `branding/marketing-prompts` exemption | fails, same code |
| Remove the note from `start/how-to-use` | builds; the doc has neither sources nor a note. `validate.test.ts` would catch it (nit n1) |
| Unknown entry id in a mapping | fails: `source-map: entry "no-such-entry" is not in the sources register` |

Exemptions: `provenance.json` `sourceNoteExemptions` holds only `branding/marketing-prompts`, with a reason. `start/*` and `lookup/sources` get notes in `source-map.json` `notes.docs`. They need no exemption because `start` and the `sources` kind are outside `SOURCES_REQUIRED`. Each has a reason. `checkProvenanceConfig` rejects an exemption for a doc without a note. This matches D5.

## AI disclosure data (G17)

- Every one of the 36 English docs has `generated` (29 from the footer; 7 templates and start files from `provenance.json`: `{date: 2026-09-13, tool: "Claude (Anthropic)"}`) and `verification` `{status: "ai-checked", checkedOn: "2026-09-13"}` (the register's check date).
- The override path is `content-meta/provenance.json` `verification[docId] = {status, checkedOn?, reviewedBy?}`. Unknown doc ids fail (`unknown-override`).
- Schema: `VerificationSchema` is `{status: ai-checked | human-verified, checkedOn: ISO date, reviewedBy?}`. `DocSchema` refines "human-verified names reviewedBy".

Mutation results:

| Override | Result |
|---|---|
| `human-verified`, no `reviewedBy` | fails: `provenance.json: invalid ✖ a human-verified document names reviewedBy` |
| `human-verified`, `reviewedBy: "Jane Expert CA(SA)"`, no `checkedOn` | **builds**; `verification = {status: human-verified, reviewedBy: Jane Expert CA(SA), checkedOn: 2026-09-13}` (M1) |
| `human-verified`, `reviewedBy: " "` | **builds** (M1) |
| `ai-checked` with `reviewedBy: "Some Person"` | **builds**; `reviewedBy` is written on an AI-checked doc (M1) |
| `checkedOn: "2026-13-45"` | **builds** (M1) |

## Fidelity gate

Scratch tree: `scratchpad/wp10-pass2/af/good`. Built by `af-src/assemble.cjs` and written following `STYLE-GUIDE-af.md`. It contains:

- `core/tax-and-sars`: title, intro, the words table, "The short version", "What SARS wants from a sole proprietor" and "Provisional tax" translated, with the footer in Afrikaans. It uses `’n`, `Income Tax Act` kept in English with `voorlopige belastingbetaler (provisional taxpayer)`, "Jy moet dalk steeds" for "You may still have to", `mag aftrek` for permission, `Februarie 2026-begroting`, `ITR14’s`, `"plaaslike besigheidsinkomste" ("local business income")` and BTW for VAT. The rest of the doc stays English with the callout labels translated.
- `paperwork/templates/receipt`: fully translated. It keeps the three header lines, placeholders, `REC-0001`, `R 0.00` and PayShap, and uses a straight `'n` once.
- `lookup/glossary`: English copy with four translated entries, including `**Eenmansaak (sole proprietor)** — … Geen maatskappyregistrasie nodig nie, maar …` and `Die artikel 4-toets`, and `**BTW (VAT)**`.

The faithful tree passes, through the real CLI:

```
$ pnpm content:fidelity --lang af --source-root af=<scratch>/af/good
Checking af markdown in …\scratchpad\wp10-pass2\af\good
Fidelity af: 3 docs faithful, 0 findings, 33 docs not translated yet.
```

It also passes in build mode, which throws on any finding:

```
$ pnpm content:build --lang af --source-root en=<scratch>/en-copy --source-root af=<scratch>/af/good --out <scratch>/stale-out
af: 3 docs built, 33 skipped (no source), 0 English fallbacks
Wrote 46 changed files, removed 0, 46 files in total.
```

One caveat about my first attempt, because it shows a real trap for translators: the untranslated English tail of `core/tax-and-sars` produced three `callout-label expected In gewone taal: got (none)` findings, because an English `> **In plain words:**` label in an Afrikaans file is read as an unlabelled note. That is correct behaviour and the message is precise.

Each required mutation fails with a precise message (one variant per tree, run through `buildContent` in fidelity mode, `af-src/variants.ts`):

| Mutation | Finding |
|---|---|
| A translated official name (`Income Tax Act` → `Inkomstebelastingwet`) | `core/tax-and-sars:provisional-tax.2: keep-verbatim expected Income Tax Act ×1 got (none)` |
| A changed rand amount inside a glossary definition (`R600,000` → `R650,000`) | `lookup/glossary:turnover-tax: rand expected R600,000 got R650,000` |
| A missing template line break (receipt header lines joined) | `paperwork/templates/receipt:intro.3: line-breaks expected 2 got 1` |
| A changed footer date (13 → 14 September) | `core/tax-and-sars:footer: footer-date expected 2026-09-13 got 2026-09-14` |
| `ITR14` translated (`ITR14’s` → `IBR14`) | `core/tax-and-sars:words-used-in-this-file.1: form-code expected ITR14 got (none)` |
| A stale block after changing the English source | `core/tax-and-sars:the-short-version.1: stale expected sourceHash b9a0d158dc28484f got sourceHash 0f4986252ed1712c` |
| A strengthened obligation (`Jy moet dalk steeds` → `Jy moet steeds`) | **no finding**, as expected: semantics cannot be detected automatically. This is the known limit in ADR-0004 ("catches factual drift, but not meaning or tone") and is why WP-42 reads every document. The style guide covers it under "Faithfulness". |

The stale case, in full: build the faithful tree into a scratch out folder, change one English sentence ("You may still have to file a return showing zero." → "You might still…") in the English copy, then rebuild into the same folder. The build fails with `Content build failed with 1 problem(s): fidelity: core/tax-and-sars:the-short-version.1: stale …`. The message names the document and the block, but gives only two hashes; the style guide explains what "stale" means, so a translator can act on it.

None of these false-positive cases produced a finding:

| Case | Where in my translation |
|---|---|
| `mag` (the modal verb) | `’n Koste wat jy van inkomste mag aftrek` in the words table |
| `ITR14’s` | `ITR12 vir mense, ITR14’s vir maatskappye` |
| `Februarie 2026-begroting` | `Hulle het baie verander in die Februarie 2026-begroting` |
| `artikel 4-toets` | glossary: `Die artikel 4-toets wat ’n raad moet slaag` |
| `'n` versus `’n` | the receipt uses a straight `'n` once, the rest typographic |
| Quoted English wording | `in die afdeling "plaaslike besigheidsinkomste" ("local business income")` |
| VAT → BTW in prose, `BTW (VAT)` in the glossary | words table and glossary |
| Afrikaans plural/compound forms (`IRP6-opgawes`, `nul-IRP6`) | provisional-tax section |
| `Geen maatskappyregistrasie nodig nie` (the corrected sole-proprietor wording) | glossary |

One gap found while probing (M2 below): an added or changed ordinal is not detected. The variant that adds `vanaf die 7de dag` to a translated sentence produces no finding.

## Findings

### major: `human-verified` can be recorded without a review date or a real reviewer name (M1)
File: `scripts/content/config.ts:304` (`ProvenanceSchema.verification`, `checkedOn` optional at `:309`), `scripts/content/provenance.ts:236` (`verificationFor`), `src/lib/content/schema.ts:305` (`VerificationSchema`), `src/lib/content/schema.ts:57` (`IsoDateSchema`)
Acceptance item: ADR-0006 decision 5 and D5 ("Checked by {reviewer}"); brief item "nothing can mark a doc human-verified without a named reviewer and a date"
What is wrong: `checkedOn` is optional in the override. When it is missing, `verificationFor` falls back to the register date, so the page would say a named person checked it on 13 September 2026. `reviewedBy` accepts `" "`. `reviewedBy` is also written on an `ai-checked` doc. `IsoDateSchema` accepts `2026-13-45`.
How to reproduce: put `"verification": {"core/tax-and-sars": {"status": "human-verified", "reviewedBy": "Jane Expert CA(SA)"}}` in a copy of `provenance.json` and build with `configPaths.provenance` pointing at it (`scratchpad/wp10-pass2/mutate.ts human-verified-no-date`). The build passes and `verification.checkedOn` is `2026-09-13`.
Suggested fix: make the override a discriminated union: `human-verified` requires `checkedOn` and a trimmed non-empty `reviewedBy`; `ai-checked` forbids `reviewedBy`. Apply the same refine in `VerificationSchema`. Validate `IsoDateSchema` as a real calendar date. Add a negative test for each case.

### major: ordinal numbers are not facts, so a changed deadline day passes the fidelity check (M2)
File: `scripts/content/facts.ts:126` (`NUMBER_RE` negative lookahead `(?![\p{L}\p{N}])`)
Acceptance item: ADR-0004 ("fails when an Afrikaans document differs from English in … numbers … dates"); `STYLE-GUIDE-af.md` "Numbers, amounts and dates" (`by the 7th` → `teen die 7de`)
What is wrong: a digit followed by a letter is not extracted, so `7th`, `7de` and `8ste` yield no fact. `EMP201 by the 7th of the following month` and `EMP201 teen die 8ste van die volgende maand` produce identical facts (`codes: [EMP201]`). The English corpus has 8 such ordinals, all the EMP201 due date (`core/running-a-pty-ltd`, `core/paying-yourself`, `lookup/glossary`, `lookup/checklist` ×3, `lookup/sources` ×2). An added ordinal is also missed: the `ordinal-changed` scratch variant adds `vanaf die 7de dag` with no finding.
How to reproduce: `pnpm exec tsx scratchpad/wp10-pass2/edge.ts` (prints the facts for both sentences), or put `teen die 8ste` in an Afrikaans `core/paying-yourself`.
Suggested fix: extract ordinals as numbers before `NUMBER_RE`: English `\d+(?:st|nd|rd|th)`, Afrikaans `\d+(?:ste|de)` (add an `ordinalSuffixes` marker per language). Add fidelity tests for a changed and an added ordinal.

### minor: the "no sources" rule counts legislation-table acts, and no test pins per-document sources (m1)
File: `scripts/content/provenance.ts:224`; `tests/content/validate.test.ts:212`
Acceptance item: D5 "Sources for this page"; G16
What is wrong: the build fails only when a doc has zero entries and zero acts. 11 guides get acts from "Where it appears". For them, deleting every register mapping still builds. The tax guide would then list the Income Tax Act and the VAT Act and none of its 7 SARS sources. No test pins the per-document lists, so this regression would pass the gate.
How to reproduce: `mutate.ts drop-tax-and-sars` builds, and `core/tax-and-sars` gets `entries: []`.
Suggested fix: snapshot `doc.sources` for every English doc (ids only) in `corpus.test.ts`, or require at least one register entry for guides and templates in `core`, `paperwork` and `business-types`.

### minor: several documents miss an Act that their text cites (m3)
File: `content-meta/source-map.json`
Acceptance item: D5 "Sources for this page"; G16
What is wrong: the mapping is justified where it exists, but these direct citations have no mapped source:
- `branding/already-have-your-name` and `core/adding-new-lines` quote "Section 32 of the Companies Act"; the Companies Act is mapped only to `paperwork/templates/quotation` for the same rule.
- `core/adding-new-lines` cites section 80 of the Consumer Protection Act.
- `paperwork/templates/privacy-notice` says "POPIA makes registration compulsory"; POPIA is not mapped.
- `paperwork/templates/tax-invoice` has no VAT Act.
- `paperwork/free-tools` says a signed PDF is valid "under ECTA"; ECTA is not mapped.
- `business-types/services-trades` supports the six-month warranty with a law-firm note on a car dealer case, while the official Consumer Goods and Services Ombud advisory note is mapped elsewhere for the same claim.
How to reproduce: `node scratchpad/wp10-pass2/audit.cjs <worktree> branding/already-have-your-name core/adding-new-lines paperwork/templates/privacy-notice`
Suggested fix: add the act rules and the entry rule with reasons. Consider a report line that lists act names found in a doc's text but not in its `sources.acts`.

### minor: "what it supports" is missing or split for 18 of 105 sources (m4)
File: `scripts/content/special/sources.ts:108` (`paragraphFields`), `:144` (`listItemFields`)
Acceptance item: D5 ("Each entry shows the source title, an Official label …, the link, and what it supports"); downstream readiness
What is wrong: 18 entries have no `supports`. For 7 of them the text is in `qualifier` (`uif-and-the-self-employed`, `coida-and-working-directors`, `small-claims-court-who-may-sue`, `death-of-a-sole-director-and-shareholder`, `businesses-act-71-of-1991`, `regulation-r638-of-2018`, `regulation-r146-of-2012`) or in `notes` (`information-regulator-of-south-africa`, `cipc--annual-returns-filing-system`). For `rlv-form…`, `saflii--second-hand-goods-act-consolidated-text`, `sme-south-africa-1`, `yebo-business`, `iol--the-mercury` and `cliffe-dekker-hofmeyr-2026-budget-summary-vat` there is no text at all. Some qualifiers start with a stray `— ` (`carscoza`, `regulation-r146-of-2012`). One entry's title is a sentence that ends "…including" (`cast-versus-calendered-lifespans…`). A page package must rebuild "what it supports" from three fields, and some entries render with nothing.
How to reproduce: `node -e` over `src/data/en/sources.json`: `entries.filter(e => !e.supports)`.
Suggested fix: emit a normalised `supportsText` (supports, else qualifier text without a leading dash, else notes) or document the fallback in the schema. Flag entries with none in `--report`, so P4a/WP-47 can repair the register.

### minor: `--out` deletes unrelated JSON files under `<out>/<lang>/` and overwrites `<out>/manifest.json` (m5)
File: `scripts/content/write.ts:58` (`writeOutputs`; the `rmSync` of every managed file not produced is at `:67`)
Acceptance item: general quality (path safety)
What is wrong: `--out` accepts any directory. Managed prefixes are `en/`, `af/` and `manifest.json`, so any `*.json` under `<out>/en/` is removed and a foreign `manifest.json` is replaced. Translators are told to use `--out <folder>`.
How to reproduce: create `<scratch>/outtest/en/unrelated/precious.json` and `<scratch>/outtest/manifest.json`, then `pnpm content:build --out <scratch>/outtest`. Output: `Wrote 41 changed files, removed 1`; `precious.json` is gone.
Suggested fix: refuse a non-empty `--out` that has no previous `manifest.json` with `version: 1`, or remove only files matching the generated name patterns. Add a CLI test.

### minor: stale detection depends on JSON already built into the output folder (m7)
File: `scripts/content/build.ts:293` (`readPrior`), `:564` (`prior: readPrior(outDir, …)`), `scripts/content/fidelity.ts:503`
Acceptance item: ADR-0004 consequence 2 (stale blocks fail)
What is wrong: `sourceHash` is read from the previous Afrikaans JSON in `outDir`. With `--out` pointing at a new scratch folder, which the style guide suggests, stale is never checked. Any edit to an Afrikaans block, even one unrelated to the English change, also clears the stale state.
How to reproduce: build the faithful scratch tree with `--out <scratch>/stale-out`, change an English block, rebuild with the same `--out`: the build fails with `core/tax-and-sars:the-short-version.1: stale expected sourceHash b9a0d158dc28484f got sourceHash 0f4986252ed1712c`. Run the same build with a fresh `--out` and no stale check happens.
Suggested fix: record `sourceHash` per block in the Afrikaans markdown tree's companion file, or always read prior hashes from `src/data/<lang>`. Say in the style guide that stale needs the committed `src/data/af`.

### minor: the translation `sourceFixes` pattern can match the wrong line (m8)
File: `content-meta/docs.meta.json:179`
Acceptance item: general quality (`sourceFixes` safety)
What is wrong: `^( ?[^\s\d-][^\n]*)\n(3\. )` matches any text line directly before a `3. ` line anywhere in the doc. An Afrikaans file that already has the blank line before step 3 but has another `text\n3. ` place gets a blank line inserted there. The `exactly one match` guard makes two matches an error, which is safe but confusing. English `find` fixes use a function replacement, so `$` is not expanded; that is good. Nothing stops a `sourceFix` from changing a fact in memory, which conflicts with ADR-0006 decision 1 ("correct errors at the source").
How to reproduce: `edge.ts` prints `matches … [ 94 ]` for a sample with the correct blank line at step 3 and another `Die drie dinge:\n3. …` line.
Suggested fix: anchor the pattern to the step 2 note (`Let wel`/`If you will work from home` equivalent) or to the list position. Fail a `sourceFix` whose `find`/`replace` changes the extracted facts.

### minor: branch coverage of `scripts/content/**` is 88.25% (m9)
File: `scripts/content/build.ts` (76.71% branches), `report.ts` (65.07%)
Acceptance item: C5 "coverage ≥90% on `src/lib/**` and `scripts/**`"
What is wrong: statements are 96.97% and lines 98.22%, but branches are below 90%, and there is no coverage threshold in config to hold the line.
How to reproduce: `pnpm exec vitest run --project unit --coverage --coverage.include=scripts/content/**`
Suggested fix: add a threshold and tests for the uncovered `build.ts` branches (partial and fallback manifest status, `readPrior` errors).

### nit: a start page or glossary without a note builds (n1)
File: `scripts/content/provenance.ts:202`
What is wrong: the build does not enforce "sources or a note" for `start/*`, the glossary or the register. `validate.test.ts` does, so the gate still fails.
Suggested fix: add the invariant to `DocSchema.superRefine`.

### nit: two mapping reasons still say "Business Act" (n2)
File: `content-meta/source-map.json:43` (group `food-businesses` reason), `:422` (entry `businesses-act-71-of-1991` reason)
What is wrong: the wrong short title that `main` corrected.

### nit: `generated.tool` has two spellings, and one doc is "checked" before it was generated (n3)
File: `content-meta/provenance.json:3`; `src/data/en/docs/core__you-are-the-business.json`
What is wrong: the footer gives `Claude, Anthropic`, the project default `Claude (Anthropic)`. `core/you-are-the-business` has `generated.date 2026-09-14` and `verification.checkedOn 2026-09-13`.

### nit: a month without a day, year or date word is not a fact (n4)
File: `scripts/content/facts.ts:171` (`patternsFor`, the month and context patterns)
What is wrong: `The deadline is May.` → `Die sperdatum is Junie.` passes. The rule is deliberate (it keeps "may" out) and documented, so this is a known limit.

### nit: `allowDomains` is strict but clear (n5)
File: `scripts/content/inline.ts:80`
What is wrong: nothing serious. A new bare host fails with `"new-host.co.za/page" would become a link to new-host.co.za. Add a real host to linkify.allowDomains, or an example name to linkify.ignoreDomains, in docs.meta.json`. That is fine for authors who already edit `content-meta`. Two notes: tokens such as `ASP.NET` would also trip it, and `www.` or `https://` autolinks bypass the list.

### nit: the snapshot digest covers one document and not its sources (n6)
File: `tests/unit/content/corpus.test.ts:33` (`digest`)
What is wrong: the digest is meaningful (ids, kinds, sizes, task ids, applicability) but covers only `business-types/vehicle-dealer` and leaves out `sources` and `verification`. See m1.

## Robustness notes (no finding)

- Windows paths and CRLF: `listMarkdown` joins with `sep` and converts to posix; `normaliseSource` strips BOM and CRLF; `corpus.test.ts` proves CRLF output is byte-identical; `displayPath` handles paths outside the repo.
- Collation: `byCodeUnit` everywhere output order matters; `write-meta.test.ts` runs with a Lithuanian collation.
- Email: a GFM autolinked bare address stays plain text; a written `mailto:` link fails with `unsupported-link` and a clear instruction. The bare-domain regex does not linkify the domain part of an address.
- `duplicate-task`: `the task "…" repeats a task in <block>. Task ids come from the text, so reword one of them.` Clear, and names both places.
- `--source-root`/`--out`: resolved against the working directory, language validated, duplicates rejected, `--out` refused with `--drift`. Doc ids are regex-validated, so `docFileName` cannot escape the output folder. Link targets outside the toolkit are rejected. The only unsafe part is m5.

## Tests

- Behavioural: tests build real content or fixture trees and assert findings, codes and messages, not internals. `fidelity.test.ts` has 19 precise negative cases (rand, form code, day, month, link, placeholder count and case, merged lines, extra block, callout label, protected name, footer date, hyphen lines, verbatim fence, checklist marker, glossary rand, code, abbreviation and count). `af-real.test.ts` mutates real Afrikaans prose from three documents.
- Realistic fixtures: `fixtures/af-real` holds full translations of `core/adding-new-lines`, `business-types/pick-your-business-type` and the receipt template, in the style-guide register, with `’n` and English official names.
- Would they catch regressions: yes for structure, facts, links, placeholders, glossary, sources alignment and determinism. No for M1, M2, m1 and m5: no test covers those paths.

## Pass-1 and G1–G18 verification

The author's hand-over table with G1–G18 numbers is not in the worktree, the commit messages or the two review files I was given, so I verified every finding by the ids used in `WP-10-pass1.md` (blocker, major, minor, nit) and in `WP-40-glossary-pass1.md` (M1–M2, m1–m17, n1–n16, plus the section 5 TERMS table). The fixes are spread over `b6359c5`, `de62bc3` and `2db7941`, and the English corrections over `34175e9` and `745e387` on `main`.

### WP-10 pass 1

| Pass-1 finding | Claimed fix | Verified |
|---|---|---|
| blocker: "may" extracted as the month May | `b6359c5` month counts only when capitalised and in a date context | **Fixed.** `extractFacts('You may register', en)` yields no date; `Jy mag registreer` likewise. `corpus.test.ts` asserts no `May` token anywhere and lists the two skipped capitalised months. My three faithful documents give 0 findings |
| major: `sources.json` drops text from 5 entries | `b6359c5` full titles, qualifiers, supports, notes, sub-groups, `sources-text-lost` | **Fixed.** The SARB section 14 sentence is in the SARB entry's `supports`; Elliot & Maier and Labrecque & Milne keep the full title, journal and year; the cast-versus URLs are in `qualifier`; the CIPC trade-mark text is in `supports`. The words-coverage guard fails the build if any word is lost. Residual shape issues are m4 |
| minor: bold sub-heading lines become empty entries | `b6359c5` sub-groups | **Fixed.** 7 sub-groups; a label that is itself an entry keeps `entry`; entries carry `subgroupId`. `type` is `web` or `citation` with `noUrlReason`, so 101 have a URL and 4 are citations with a stated reason |
| minor: Part C rows carry no applicability | `b6359c5`, tightened in `2db7941` | **Fixed.** `rowWhen` on table blocks; `validate.test.ts:264` pins all 7 conditional rows, including the director's loan account and beneficial ownership rows |
| minor: three branding worked-example fences are `prompt` | `2db7941` made them `snippet` | **Fixed.** `--report` shows `prompt-0-answers.1`, `what-a-good-brief-looks-like.1` and `what-good-name-options-look-like.1` as `snippet` by `override` |
| nit: "Your registration checklist" lists stay plain lists | not claimed | **Still open.** `core/register` has no `tasklist` block. Unchanged behaviour, acceptable as a nit |
| nit: an illustrative "In plain words" line becomes a real callout | not claimed | **Still open.** `start/how-to-use` block `how-the-legal-parts-are-written.3` is a plain callout paired with `.2` |
| minor: false positives on `ITR14's` and a moved year | `b6359c5` code plurals and apostrophes; `de62bc3` date-position rules | **Fixed.** `twee ITR14’s` and `twee ITR14-opgawes` both yield `ITR14`; `die Februarie 2026-begroting` yields `2026-02`. The style guide now has the "Dates" and "Code plurals and possessives" sections |
| minor: no line-break, footer-date or keep-verbatim checks | `b6359c5` | **Fixed.** My mutations produced `line-breaks expected 2 got 1`, `footer-date expected 2026-09-13 got 2026-09-14` and `keep-verbatim expected Income Tax Act ×1 got (none)` |
| minor: style-guide gaps (colon, bold-only, blank lines, false positives) | `de62bc3` | **Fixed.** "Markdown shape the parser depends on" covers all four, including the `core/start-here` blank line before step 3, and "When a finding looks wrong" gives the escalation rule |
| minor: fidelity CLI cannot target a scratch tree | `b6359c5` | **Fixed.** `--source-root <lang>=<dir>` and `--out <dir>`; I used both throughout this review. `cli.test.ts` covers 10 error cases |
| minor: `manifest.contentHash` depends on host collation | `b6359c5` byCodeUnit | **Fixed.** `byCodeUnit` in `write.ts`, the content hash and the report; `write-meta.test.ts` runs a Lithuanian collation and gets the same hash |
| nit: schema allows states the pipeline never produces | `b6359c5` | **Fixed** for the unused `sources` block kind (removed) and for depth 4 ⟺ `pseudo` (`DocSchema.superRefine`). Link and docref runs still share `t`, which is workable |
| nit: `z` from `zod`, not `astro/zod` | documented | **Unchanged, accepted.** The header comment explains that both resolve to the one installed zod 4; `astro check` and `pnpm build` load the collections |
| minor: plain email address breaks the build | `b6359c5` | **Fixed.** A GFM-autolinked bare address stays plain text; an explicit `mailto:` link fails with `email links are not supported ("mailto:…"); write the address as plain text` |
| minor: bare-domain linkification links any example domain | `b6359c5` allow list | **Fixed.** `linkify.allowDomains` with 14 hosts; an unlisted host fails with an actionable message, and `--report` prints the linkified hosts. See nit n5 |
| minor: build errors name doc and block, not file and line | `b6359c5` | **Fixed.** `ContentIssue.at = {file, line}`; `formatIssue` prints `docs/…/02-register.md:17: core/register:intro.2: code: message` |
| minor: task id collision suffixes shift | `b6359c5` | **Fixed.** A repeated task text is now a build error: `the task "…" repeats a task in <block>. Task ids come from the text, so reword one of them.` |
| minor: no test would have caught the blocker or the major | `b6359c5` | **Fixed.** `af-real.test.ts` builds real Afrikaans translations of three documents and asserts 0 findings, then mutates them; `special.test.ts` asserts the words-coverage failure |
| minor: forbidden strings are English-only and the escape hatch is loose | `b6359c5` | **Fixed.** Rules now match `R1 miljoen`, `BTW`, `Vrywillige`, `Kleineisehof`; the case "The VAT threshold is R1 million and the turnover tax limit R2.3 million" is flagged (`validate.test.ts:376`) |
| nit: the snapshot is the full vehicle-dealer document | `b6359c5` digest | **Fixed.** The snapshot is a 309-line structural digest. See nit n6 |
| nit: report says "listing 3" and "one source with no URL" | `b6359c5` | **Fixed.** The report says `listing 2 … (+1 replaced by a table of contents)` and `105 entries (101 with a URL, 4 citations without a URL)` |
| nit: corpus numbering 1,2,3,2,3 renders as 4,5 | `34175e9`, `745e387` on `main` | **Fixed at the source.** `where-to-go-next.1` is `ordered: true`, `start: 1`, 5 items |

### WP-40 glossary pass 1, items inside WP-10's owned files

The Afrikaans glossary document itself belongs to WP-40. These are the items that land in `TERMS-af.json` and `STYLE-GUIDE-af.md`.

| Glossary finding | Verified |
|---|---|
| M1 sole proprietor "No registration needed" | **Fixed at the source** on `main` (`34175e9`): "No company registration needed, but you still need to register with SARS for tax." Present in `glossary.json` |
| M2 notes and TERMS contradict the orchestrator decisions | **Fixed.** `TERMS-af.json` has one entry shape with notes; the style guide states the two bracket rules and which wins |
| m1 straight `'n` | **Fixed.** No straight `'n` in `TERMS-af.json` or the style guide (the 5 hits under `scripts/translate` are in `status.ts` code) |
| m10 SBC → `kleinsakekorporasie` | **Fixed.** Entry present with the one-word note |
| m16 reflected / cleared | **Fixed.** `weerspieël` and `verreken` both carry the "add the English in brackets; also means set off" note |
| m17 Information Regulator, Small Claims Court bracket conflict | **Fixed by decision.** Both are official-name entries: "write 'Information Regulator (Inligtingsreguleerder)' on first use", "'Small Claims Court (Kleineisehof)'". The style guide's table records the rule and which one wins |
| Section 5: Master checklist → `Hoofkontrolelys` | **Fixed**, and used in the style guide's terminology list |
| Section 5: Certificate of Acceptability note | **Fixed** ("official name … then the English name. Keep COA.") |
| Section 5: PAYE, SDL entries | **Fixed.** Both present |
| Section 5: MOI, body corporate, beneficial ownership, trading as, filing notes | **Fixed.** All five notes present, including "Write 'inligting oor voordelige eienaarskap', not 'voordelige eienaarskap-inligting'", which the style guide's task example now follows |
| Section 5: Business Act licence | **Deferred on purpose**, with the note "Change to 'Businesses Act-lisensie' only if the English source changes". The English has since changed on `main`, so this entry now needs the change (folded into nit n2) |
| Style-guide glossary example `**Eenmansaak (sole proprietor)**` | **Fixed** (line 154 and line 159) |
| Style-guide template example `Handeldryf as` | **Fixed** to `Handeldrywende as ’n naam van`, matching the TERMS form |

## Downstream readiness

- **AI notice (D5):** every doc has `generated.date`/`tool`, `verification.status`/`checkedOn` and `translation.status`. A page can render the notice directly. Once M1 is fixed, `reviewedBy` plus `checkedOn` gives "Checked by {reviewer} on {date}".
- **"Sources for this page":** `doc.sources.entries` and `doc.sources.acts` are ids resolved against `sources.json`. Entries carry `title`, `official`, `url`/`urls`, `type` (`web` or `citation` with `noUrlReason`) and `supports`. A page needs one lookup and the m4 fallback for "what it supports". Acts carry `name` and `governs` but no link and no official flag. `sourceNote.reason` and `sourceNote.see` cover the six note pages. The per-page `reason` from `source-map.json` is not exported; pages show the register-wide `supports` text. That is acceptable for D5 but less specific.
- **i18n `trust.*` keys (`wp/wp12b-i18n-followup`, `ff3a9b8`):**

| Key | Data field | Lines up? |
|---|---|---|
| `trust.aiNotice.body` "{date}" | `verification.checkedOn` | yes |
| `trust.aiNotice.bodyNoPageSources` | `sourceNote` present | yes |
| `trust.status.aiChecked` "{date}" | `verification.status === 'ai-checked'`, `checkedOn` | yes |
| `trust.status.humanChecked` "{reviewer} on {date}" | `reviewedBy`, `checkedOn` | yes, after M1 (today the date can be invented) |
| `trust.sources.officialLabel`, `externalLink` / `externalLinkOther` | `entry.official` | yes for entries; acts have no flag or link |
| `trust.sources.supportsLabel` | `entry.supports` | partly (m4) |
| `trust.sources.actsHeading` | `doc.sources.acts` → `acts[].name`, `governs` | yes |
| `trust.sources.noPageSources`, `seeRegister`, `seeHowMade` | `sourceNote.see` (`lookup/sources`, `start/how-this-was-made`) | yes |
| `trust.fact.checked` / `trust.fact.source` | no per-fact data yet (P4a `facts.json`) | not yet |
| `trust.unverified.*` | no field yet (P4a) | not yet |
| `trust.checklistReminder`, `trust.templateRulesChecked` "{date}" | `kind`, `verification.checkedOn` | yes |

- Copy on that branch overstates the data: `home.trust.sources` "An official link for every fact" and `nav.toolDescriptions.sources` "Official links for every fact". Only 37 of 105 register entries are official, and `core/working-from-home-and-safety` has 2 official sources out of 19. This is not WP-10's file, but the pages package should not use those lines as written.
