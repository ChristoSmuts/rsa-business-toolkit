# WP-10 review, pass 1 (Reviewer A: correctness, data integrity, security, tests)

- Package: WP-10 markdown-to-JSON content pipeline
- Branch: `worktree-agent-a57043a283a0c3c96`, commit `da96cd0` on `main` `51e9c01`
- Reviewed: 2026-09-15, on Windows 11 under heavy machine load (other agents running)
- Scratch: `%TEMP%\claude\...\scratchpad\wp10-review\` (`roundtrip.py`, `render.py`, `counts.py`, `sources_check.py`, `sources_loss.py`, `exp.mts`, `af-faithful/`)

## Verdict

**NOT CLEAN.** 1 blocker, 1 major, 14 minor, 7 nit.

The English data is faithful. An independent round-trip and a render-back line diff over all 36 documents found no lost or altered text. Every difference is one of the intended transforms. Links, anchors, legacy refs, glossary, acts, task counts and determinism all check out.

Two problems stop the merge:

1. **Blocker.** The fidelity gate rejects faithful Afrikaans translations. Month matching is case-insensitive, so the English verb "may" counts as the date "May". It occurs 204 times in 32 of the 36 documents. Three faithful translations I wrote failed with 7 such findings, and a translator cannot fix them.
2. **Major.** `sources.json` silently drops text for 5 register entries. This includes a legal claim (SARB Act s14) and two research citations cut to 120 characters. The doc JSON still has the text, but the structured register does not, and nothing fails.

## Commands run (worktree, output tails)

`node_modules` was present, so `pnpm install` was not needed.

```
$ pnpm content:build --report
Docs per section: en {branding: 5, business-types: 7, core: 10, lookup: 3, paperwork: 7, start: 4}
Blocks by kind (en): callout 71, code 54, glossary 7, heading 491, hr 144, list 103, note 6, paragraph 1318, table 28, tasklist 37, terms 19, toc 1
Tasks: 213 · Glossary: 121 entries in 7 groups · Sources: 111 entries, 14 acts
Placeholders: 72 inline, 153 in fences
Fence variants: example 3, listing 3, prompt 39, snippet 5, template-preview 5
Legacy refs resolved: 101 · Internal links resolved: 218 · External links: 170
Unsupported nodes: 0 · Unresolved links/refs/anchors: 0 · Unclassified fences: 0
af: no source tree at ...\docs\rsa-business-toolkit-af (skipped)
Wrote 0 changed files, removed 0, 41 files in total.
exit 0

$ pnpm content:build   (twice more) -> Wrote 0 changed files ... exit 0
sha256 of every file under src/data (sorted), before / after --report / after build / after build 2 / after all gates:
455365694923ccd0f3f66792dbe417fd9031b41af4dbdcc12f3ff6aff5bb7384 (identical all five times)
git status --porcelain after all commands: (empty)

$ pnpm content:drift
Wrote 0 changed files, removed 0, 41 files in total.
Content drift: none.
exit 0

$ pnpm lint
All matched files use Prettier code style!
exit 0

$ pnpm typecheck
[content] Synced content
Result (51 files): 0 errors, 0 warnings, 0 hints
exit 0

$ pnpm test:content
Test Files  1 passed (1)
     Tests  17 passed (17)
exit 0

$ pnpm build
[content] Syncing content
[content] Synced content
[build] 1 page(s) built in 7.05s
[build] Complete!
exit 0
```

`pnpm test` and the coverage run did not complete on this machine. Each attempt lost test files to `[vitest-pool]: Timeout starting forks runner` under load. No test failed in any attempt.

```
$ pnpm test                                   (in the full sequence)
Test Files  5 passed (5)   Tests  66 passed (66)   Errors  6 errors (Timeout starting forks runner)   exit 1
$ pnpm test                                   (re-run on its own)
Test Files  7 passed (7)   Tests  108 passed (108) Errors  4 errors (Timeout starting forks runner)   exit 1
$ pnpm exec vitest run --project unit --coverage --coverage.include=scripts/content/**   (on its own)
Test Files  7 passed (7)   Tests  108 passed (108) Errors  4 errors   Lines 44.82% (build.ts, fidelity.ts, sources.ts at 0% because their test files never started)
```

Re-running with one worker avoids the fork-start race:

```
$ pnpm exec vitest run --project unit --project dom --maxWorkers=1 --no-file-parallelism --coverage --coverage.include=scripts/content/**
[vitest-pool]: Timeout terminating forks worker for test files …/write-meta.test.ts   (teardown only)
 Test Files  11 passed (11)
      Tests  184 passed (184)
Statements   : 95.86% ( 1764/1840 )
Branches     : 87.81% ( 1182/1346 )
Functions    : 97.54% ( 318/326 )
Lines        : 97.01% ( 1528/1575 )
exit 0
```

This confirms the author's claims of 184 unit tests and 97.01% line coverage. The earlier failures were environmental: fork-pool start timeouts under machine load, with no test failing.

## Ownership

`git diff --name-only 51e9c01...HEAD`: 100 files, all inside the allowlist.
- `content-meta/*` (6), `scripts/build-content.ts`, `scripts/content/**` (23), `scripts/translate/**` (3)
- `src/lib/content/schema.ts`, `src/content.config.ts`, `src/data/manifest.json`, `src/data/en/**`
- `tests/content/validate.test.ts`, `tests/unit/content/**`
- `package.json`: adds `content:build|check|drift|fidelity`, `translate:status`, and `content:drift` in `gate:fast` only

No breach.

## Independent counts vs the author's

Measured by `counts.py` and `roundtrip.py`, which do not use project code.

| Item | Author | Measured | Note |
|---|---|---|---|
| Docs per section | 4/10/5/7/7/3 | 4/10/5/7/7/3 | |
| paragraph / heading / hr / list | 1318 / 491 / 144 / 103 | 1318 / 491 / 144 / 103 | |
| callout (plain / note) | 71 (65 / 6) | 71 (65 / 6); source has 71 `>` lines, 65 `> **In plain words:**` | all 65 `pairsWith` point at the previous block (63 paragraphs, 2 lists) |
| code / table / tasklist / terms / glossary / note / toc | 54 / 28 / 37 / 19 / 7 / 6 / 1 | same | source has 55 fences (one became `toc`) and 19 "Words used" headings |
| Tasks | 213 (145 + 68) | 213. Source has 145 `- [ ]` (master checklist 91). Ordered: vehicle 22, food 9, beauty 8, retail 8, services 8, professional 7, core/what-you-need-to-sell-things 6 | all 213 ids unique; no collision suffixes |
| Glossary | 121 in 7 groups | 121 `**Term** — ` lines; JSON 121 entries in 7 groups | round-trip diff 0 for the glossary, so no truncated definitions |
| Sources | 111 entries, 14 acts | 111 entries, 14 acts; 37 official | source has 39 `[Official]`, but 2 are in prose (the how-to-use list and the intro paragraph) |
| Placeholders | 72 inline, 153 in fences | 72, 153 | |
| Fence variants | prompt 39, example 3, listing 3, snippet 5, template-preview 5 | same in the report; committed blocks have listing 2 + toc 1 | |
| Legacy refs | 101 uses of 27 codes | 97 legacy-shaped inline codes (24 distinct) + 4 bare continuations (`03`×2, `04`, `06`) = 101 | |
| Internal links | 218 | 276 `](` in the 36 docs, minus 58 footer links = 218; per-doc sequence equal for all 36 | 0 external markdown links |
| External links | 170 | 170 | |
| Quick answers | 36 | Path 3 table has 36 rows | |
| INDEX.md anchors | – | 298 anchored links, 298 resolve to a heading id in the right doc | |

**Plan 614 vs 276 links: the plan counted more files.** 276 (36 docs) + 335 (INDEX.md) + 3 (README.md) = 614 exactly, and all 298 anchors are in INDEX.md. The parser is not missing links. The plan's 576 legacy usages cannot be reproduced from any file set: the 36 docs hold 101, and `SA-Business-Toolkit-complete.md` adds 87 matching lines. The plan figure is stale.

## Key scratch output

**Round-trip** (`roundtrip.py`). Visible-word sequence of the source, markdown stripped, compared with the JSON using difflib. Every source-only difference falls into one of these groups:
- ordered-list numbers (not stored)
- the `Word | Meaning` header row of the 19 terms tables (not stored)
- the 348-token stale folder tree replaced by `toc`
- the 6 `(04-business-types/0N)` labels on master-checklist pseudo-headings (kept as `ref`)
- the 65 "In plain words" labels
- the 29 footers

There are no other missing or added words in any document.

**Render-back line diff** (`render.py`). The JSON is rendered to markdown and line-diffed against the normalised source. 199 changed lines in total, all expected:
- the tree → `[[TOC]]` (45)
- ordered checklists → `- [ ]` (136 across 7 docs)
- pseudo-heading ref labels (12)
- `already-have-your-name` renumbering 2,3 → 4,5 (4). CommonMark treats `1,2,3,2,3` as one list, so this is a corpus issue the author already reported.
- one whitespace change (2)

Bold, code, links and em dashes in table cells are identical. So are nested placeholders, signature lines and `In plain words` placement. This holds for `03-tax-and-sars`, `01-vehicle-dealer`, `02-master-checklist`, `03-sources…register`, `01-glossary`, `03-tax-invoice…` and `01-branding-prompts` (0 changed lines each, apart from the checklist numbering noted).

**Afrikaans fidelity** (`exp.mts`). Faithful translations of `00-pick-your-business-type.md`, `04-receipt.md` and `08-adding-new-lines.md` are in `af-faithful/`. The run used the API's `sourceRoots` override.

```
findings (8):
  core/adding-new-lines:can-one-company-trade-in-more-than-one-thing.1: date expected May got (none)
  core/adding-new-lines:can-one-company-trade-in-more-than-one-thing.3: date expected May got (none)
  core/adding-new-lines:tax-one-company-several-activities.5: date expected May got (none)
  core/adding-new-lines:what-a-second-company-costs.1: form-code expected (none) got ITR14
  core/adding-new-lines:the-hidden-cost-you-may-lose-sbc-rates-on-both: date expected May got (none)
  core/adding-new-lines:the-hidden-cost-you-may-lose-sbc-rates-on-both.2: date expected May, May got (none)
  paperwork/templates/receipt:intro.7: date expected May got (none)
  business-types/pick-your-business-type:how-much-regulation-each-type-carries.3: date expected May got (none)
```

Mutations: new findings beyond that baseline. All requested mutations fail with a precise message.

```
1  changed rand            pick-your-business-type:what-nobody-needs-on-day-one.1: rand expected R2.3 got R2.5
2  changed percentage      adding-new-lines:tax-one-company-several-activities.4: percent expected 20% got 25%
3  changed date (fixture)  core/tax-fixture:intro.1: date expected 2026-03-01 got 2026-03-02   (month: got 2026-10-01)
4  dropped link            pick-your-business-type:intro.3: links expected …vehicle-dealer | business-types/food | … got …vehicle-dealer | business-types/beauty | …
5  changed link target     pick-your-business-type:intro.3: links expected business-types/vehicle-dealer | … got business-types/food | business-types/food | …
6  dropped placeholder     receipt:intro.3: placeholder-count expected 4 got 3
7  extra paragraph         receipt:intro.6: block-count expected 7 got 8
8  missing callout label   adding-new-lines:can-one-company-trade-in-more-than-one-thing.4: callout-label expected In gewone taal: got (none)
9  ITR14 -> IBR14          adding-new-lines:tax-one-company-several-activities.1: form-code expected ITR14 got (none)
10 changed bare URL        pick-your-business-type:what-everyone-needs-regardless-of-type.2: links expected https://inforegulator.org.za/ got https://inforegulator.co.za/
11 translated example     adding-new-lines:what-the-law-requires-either-way.3: code-verbatim expected line 2 "A trading name of Mokoena Holdings …" got "'n Handelsnaam van Mokoena Holdings …"
12 removed table row       pick-your-business-type:how-much-regulation-each-type-carries.2: table-rows expected 6 got 5
also: number 30->60 (number), placeholder case, nesting flattened, miljoen->duisend (multiplier), docref 06->07, dropped list item
not caught (expected, reviewer territory): Act name translated, SARS renamed, effort labels swapped between rows, cells swapped within a row, negation flipped, footer date changed
```

Fact-extraction probes: English sentence vs style-guide-compliant Afrikaans.

```
ok      28 or 29 February || 28 of 29 Februarie        ok  28/29 February || 28/29 Februarie        ok  R2.3 million || R2.3 miljoen
ok      IRP6 returns || IRP6-opgawes, the 7th || die 7de, 65 to 74 || 65 tot 74, 2026/2027-jaar, SAPS 601-vorm, Artikel 20A, artikels 79 en 80, R10,000-drempel, 15%
FINDING You may still have to file … || Jy moet dalk steeds …                  dates: expected May got -
FINDING It may carry on any lawful business || Dit mag enige wettige besigheid bedryf   dates: expected May got -
FINDING the February 2026 Budget || die 2026-begroting in Februarie             dates: expected 2026-02 got February; numbers: got 2026
FINDING two ITR14s || twee ITR14's                                              codes: expected - got ITR14
true positives: R2,3 miljoen / R120 000 / 15 persent / teen einde Augustus all flagged
```

**Task ids** (scratch copy of the master checklist):

```
reorder two adjacent tasks: ids changed 0
edit one task's text: exactly one id replaced (lookup/checklist:5dfc9c4d -> :8ce3efe0)
trailing full stop + double space: ids changed 0
duplicate text inserted later: [:5cce7722, :5cce7722-2]; then the earlier copy removed: remaining copy becomes :5cce7722 (suffix shifts)
```

**Robustness:**

```
CRLF + BOM corpus: 41 of 41 output files byte-identical to the committed data
manifest.contentHash by collation: en-US/en-US-u-va-posix/et/da/sv/tr/code point f290092e8b57236e (= committed); lt 0ac67f008349afb0; cs b3f03d14c22abb67
unsafe markdown: html block, 3 inline html, image, strikethrough, footnote ref/def, javascript:, data:, mailto: links -> all build errors
sourceFixes after the upstream blank line is added: core/start-here: source-fix: expected exactly one match for a sourceFixes "find", found 0
```

## Findings

### Data fidelity

### major: sources.json drops text from 5 register entries without failing
File: scripts/content/special/sources.ts:39 (`shortenTitle`), :72-94 (`entryFromListItem`)
Acceptance item: general quality (no silent data loss); A3 stage 8 sources `SourceEntry{official,url,supports,group,notes}`
What is wrong: A list-item entry keeps only a 120-character title and the text after an em dash that directly follows its first link. Anything else is dropped from every structured field (`title`, `qualifier`, `supports`, `notes`, `urls`):
- **The Citizen** (28 words). This includes "that counterfeit notes cannot be exchanged and must be reported to SAPS; that the SARB alone may issue currency under section 14 of the SARB Act". The `Supports:` line is a lazy continuation of the list item, so the official SARB entry also has no `supports`.
- **Elliot & Maier** (25 words) and **Labrecque & Milne** (21 words). The title is cut at "…Functioning in…", and the journal, year and finding are gone.
- **Cast versus calendered** (16 words).
- **CIPC trade mark search** (19 words): "via the CIPC eServices portal at … The toolkit tells readers to search this themselves…".

The doc JSON (`lookup__sources.json` blocks) still has the text. A `/sources/` page or search index built from `sources.json` would publish an incomplete register, and nothing warns.
How to reproduce: `python scratchpad/wp10-review/sources_loss.py`. It lists 36 items with words missing: 31 are only the "Supports" label, and the 5 above are real losses.
Suggested fix: store the full runs of each entry (for example `text: InlineRun[]`) and truncate only in the UI. Attach a `Supports:` line that continues a list item to the preceding bold-titled entry, or report it. Add a build check and test that every word of an entry's source paragraph or item appears in some field of the entry.

### minor: sub-heading lines in the sources register become empty source entries
File: scripts/content/special/sources.ts:180-195
Acceptance item: general quality
What is wrong: Six bold lines that introduce a list become `SourceEntry` objects with no URL, supports or notes. They are "PayShap limits", "Fake proof of payment and marketplace scams", "Meeting buyers and test drives", "Home-based business zoning", "Colour psychology" and "Signage vinyl and South African UV". The list items under them become separate entries with no link back. Entries whose URLs sit inline (for example "UIF and the self-employed") also have no `url`, only `urls`. As a result 17 entries lack `url`, not "one" as reported; only "SARS — Budget 2026 FAQ (as above)" truly has no URL. Consumers can handle this because `url` is optional and `urls` is always present, but the UI will render empty cards.
How to reproduce: `python scratchpad/wp10-review/sources_check.py`
Suggested fix: treat a bold-only paragraph followed directly by a list as a sub-group (`subgroup` on the child entries) instead of an entry.

### minor: master checklist Part C rows carry no applicability
File: src/lib/content/schema.ts:224-230 (table block); content-meta/applicability.json
Acceptance item: A5 "`master.partC` rows filtered by entity"
What is wrong: Some rows are company-only: "Anniversary of registration … if you have a company", "ITR14 company tax return", "Monthly, if you run payroll". The table block cannot express per-row `appliesTo`, so WP-31 cannot filter Part C without re-parsing text. This is partly a plan gap, because A4 also has no row applicability.
How to reproduce: `src/data/en/docs/lookup__checklist.json`, block `part-c-recurring-calendar.2`
Suggested fix: add optional `rowAppliesTo` on table blocks, fed by `applicability.json` (keyed by block id and row index), or record the gap for WP-31.

### minor: three branding worked-example fences are classified `prompt`
File: content-meta/docs.meta.json:313 (`fenceVariant: prompt` for branding/branding-prompts)
Acceptance item: A3 stage 7, copy button semantics
What is wrong: `prompt-0-answers.1`, `what-a-good-brief-looks-like.1` and `what-good-name-options-look-like.1` are sample answers ("1. What I sell: used bakkies…", "1. Van Wyk Bakkies"), not prompts. They will get a copy-prompt button. `prompt` does keep them translatable, which is right; `example` would forbid translation.
How to reproduce: `pnpm content:build --report`, fence table
Suggested fix: add `fenceOverrides` → `snippet` (translated, no copy button) for these three block ids.

### nit: the "Your registration checklist" list stays a plain list while question lists become tasks
File: scripts/content/parse.ts:95-99 (`isTasklist`)
Acceptance item: A3 stage 5
What is wrong: The two unordered lists under `core/register#your-registration-checklist` are not tickable. The ordered questions under `core/what-you-need-to-sell-things#your-licence-checklist` ("Does my business type appear…?") become 6 tasks. Both results come from the plan rule, but the outcome is inconsistent for users.
Suggested fix: decide per heading in `applicability.json` or `docs.meta.json` and note it in the report.

### nit: an illustrative "In plain words" line becomes a real paired callout
File: docs/rsa-business-toolkit/00 Start here/01-how-to-use-this-toolkit.md:157
What is wrong: `> **In plain words:**...` is an example of the format inside the prose. It is emitted as a plain callout with text `...`, paired with "Every hard one is followed by a line that starts like this:".
Suggested fix: add a `blockOverrides` entry to render it as a note, or accept it.

### Fidelity gate and translation readiness

### blocker: the English modal verb "may" is extracted as the month May
File: scripts/content/facts.ts:146 (also :130-133 and :139-142; all compiled with `'giu'`)
Acceptance item: A6 "multiset equality of … normalised dates"; the package goal of a gate usable by 36 translators
What is wrong: Month names are matched case-insensitively, so every "may" in English prose ("you may still have to file", "no shareholder may hold shares") adds a `May` date fact. A correct Afrikaans rendering ("mag", "kan", "dalk") has none, so the block fails with `date expected May got (none)`. The corpus has 204 case-insensitive "may" hits in 32 of the 36 documents. Faithful translations of 3 real documents failed with 7 such findings. The translator cannot fix these; they would have to write "Mei" or leave English in the text. The same risk applies in principle to "march" and to Afrikaans "Mei". No test covers ordinary English prose through the fact extractor.
How to reproduce: `pnpm exec tsx scratchpad/wp10-review/exp.mts af probes`. Or `extractFacts('It may carry on any lawful business.', markers.en).dates` returns `['May']`.
Suggested fix: match month names case-sensitively (both languages capitalise them), or count a bare month only next to a day or year. Add unit tests with "may"/"May 2026"/"mag" and a regression test that runs the fidelity check over a real translated document such as the three in `af-faithful/`.

### minor: false positives from Afrikaans plurals of codes and from moving a year away from its month
File: scripts/content/facts.ts:64-71 (`NOT_WORD_AFTER` on `FORM_CODE_RE`), :139-150; scripts/translate/STYLE-GUIDE-af.md:54-77
Acceptance item: A6 fact equality
What is wrong: English "two ITR14s" yields no code, because the trailing `s` blocks the match. Natural Afrikaans "twee ITR14's" yields `ITR14`, so the result is `form-code expected (none) got ITR14`. "the February 2026 Budget" gives the date `2026-02`, but the natural reordering "die 2026-begroting in Februarie" gives `February` + number `2026`. Both are legitimate Afrikaans, and the style guide does not warn about either.
How to reproduce: `exp.mts probes`, and the baseline finding `core/adding-new-lines:what-a-second-company-costs.1`
Suggested fix: allow an optional plural `s` on English codes (`ITR14s`, `IRP6s`). Add two rules to the style guide: "keep a month next to its day or year" and "write `ITR14-opgawes` rather than `ITR14's`" (or accept `'s` in the regex).

### minor: fidelity does not compare template line breaks, the footer date, or the "keep exactly" names
File: scripts/content/fidelity.ts:172-266 (`compareBlocks`), :337 (`alignTranslation`)
Acceptance item: A6
What is wrong: A translator can merge the three template header lines (`**[NAME]**` / `[Phone] | [Email]` / `[If a company…]`) into one and still pass, which breaks the printed layout. The AF footer date (`doc.generated.date`) is never compared with English. The style guide's "Form codes, Act names and fixed names" section says "Keep these exactly as written" and names Act names, SARS, CIPC and others. Only form codes are enforced. Translating "Consumer Protection Act" or renaming "SARS" passes, which I confirmed by mutation.
How to reproduce: `exp.mts af`, probes 19, 20 and 23
Suggested fix: compare the `br` count per block in template docs, and compare `generated.date`. Either check a `keepVerbatim` list from `TERMS-af.json` as a multiset, or mark those names as "reviewer-checked" in the style guide.

### minor: style guide gaps that will produce confusing block-count failures
File: scripts/translate/STYLE-GUIDE-af.md
Acceptance item: A6 translation workflow
What is wrong: The guide is clear and mostly accurate. It is missing rules that the parser depends on:
- **Trailing colon.** A paragraph ending in `:` right before a checklist becomes the task group. Dropping the colon (for example "Voor jou eerste aankoop") adds a block and fails as `block-count`, pointing at a distant block.
- **Bold-only lines.** A line that is only bold becomes a pseudo-heading. Bolding a whole translated line, or adding text after a bold title, changes the kind.
- **Blank lines.** A list or paragraph needs a blank line before it where English has one. `core/start-here` is fixed for English by an in-memory `sourceFixes` entry (`lang: en` only). An Afrikaans file that copies the English markdown gets a different structure and a `block-count` finding with no explanation.
- **False positives.** There is no rule for what a translator does when a finding is a false positive, such as the blocker above. 36 parallel agents will otherwise loop or bend the text.
How to reproduce: read the guide against `parse.ts:236-244` (group paragraphs) and `content-meta/docs.meta.json:154-161` (sourceFixes)
Suggested fix: add a "Markdown shape" section covering these four points, with the two corpus examples. Add an escalation rule: stop, record the finding in `translations.json` notes, and do not reword to satisfy the checker.

### minor: the fidelity CLI cannot be pointed at a scratch tree
File: scripts/build-content.ts:23-60
Acceptance item: testability (review brief)
What is wrong: `buildContent` accepts `sourceRoots` and `outDir`, but `pnpm content:fidelity` has no `--root`/`--af-root`/`--out` flags. Reviewers and translators working in a scratch mirror must write a script, as `exp.mts` does.
Suggested fix: add `--source-root <lang>=<path>` and `--out <dir>`.

### Schema and integration

### minor: manifest.contentHash depends on the host collation
File: scripts/content/build.ts:531
Acceptance item: "deterministic output on Windows and Linux"
What is wrong: File paths are sorted with `String.prototype.localeCompare` before hashing. Under Lithuanian or Czech collation the hash changes: `0ac67f008349afb0` and `b3f03d14c22abb67` versus the committed `f290092e8b57236e`. `content:drift` would then fail on such a machine or CI image. `write.ts:64,91` and `report.ts` use the same pattern, which is harmless there.
How to reproduce: `exp.mts robust`, collation section
Suggested fix: compare by code point (`a < b ? -1 : a > b ? 1 : 0`) everywhere output order matters.

### nit: the schema allows states the pipeline never produces
File: src/lib/content/schema.ts:190-199, :248
What is wrong: The `sources` block kind is never emitted. `depth: 4` is allowed without `pseudo`, and `pseudo` is allowed on depth 2 and 3. Renderers must still handle these cases. Link and docref runs share `t` values and are told apart with `'href' in run` / `'doc' in run`, which is fine but not a discriminated union.
Suggested fix: remove `sources`. Use a union so that `depth: 4` requires `pseudo: true`.

### nit: `z` comes from `zod`, not `astro/zod` (A1)
File: src/lib/content/schema.ts:8
What is wrong: The file deviates from A1. The header comment says both resolve to one installed zod 4, and `pnpm typecheck` and `pnpm build` confirm the collections load ("[content] Synced content"). Recorded only so the deviation is visible.

### Robustness and security

Checked and fine:
- Raw HTML blocks and inline HTML are rejected with build errors. So are images, strikethrough, footnotes, and `javascript:`, `data:` and `mailto:` link targets.
- External hrefs are schema-limited to http(s).
- No `eval`, `new Function` or network access; the only child process is `git status` in `--drift`.
- Paths with spaces and backslashes are handled with `node:path` and posix joins.
- CRLF and BOM input gives byte-identical output.
- `sourceFixes` is exact-match, applied exactly once, carries a mandatory `reason` (at least 10 characters), and fails loudly when the source changes.

### minor: a plain email address anywhere in prose breaks the build with a misleading error
File: scripts/content/inline.ts:95-113
Acceptance item: general quality
What is wrong: remark-gfm autolinks `info@yourbusiness.co.za` to `mailto:…`. That is resolved as an internal document path and fails with `link target "mailto:info@…" (00 Start here/mailto:info@…) is not a document listed in docs.meta.json`. The corpus has none today. Templates or translations could easily add one.
How to reproduce: `exp.mts robust`, the "entity-escaped doc" case
Suggested fix: give `mailto:` its own error message ("email addresses are not supported; write it as code or add support"), or support `mailto:` as an external link kind.

### minor: bare-domain linkification links any unlisted example domain
File: scripts/content/linkify.ts:4-6; content-meta/docs.meta.json:8-16
Acceptance item: A3 stage 6
What is wrong: `ignoreDomains` is an exception list. "Use yourshop.co.za or bakkies.co.za as an example" becomes two live links to third-party sites. Today's output is clean: all 14 bare-domain hosts are real (cars.co.za, business.google.com, fonts.google.com, fsca.co.za, gov.za, government.co.za, inforegulator.org.za, libreoffice.org, miosa.co.za, ncr.org.za, onlyoffice.com, sars.gov.za, thencc.org.za, webaim.org). The only unlinked domain-like tokens are the ignored example names and `a.docx`. There are no false positives on `R2.3`, `CoR 14.3`, `s12E(1)` or `Reg. No. 2026/123456/07`, and trailing punctuation is trimmed correctly.
How to reproduce: `exp.mts probes`, linkify section
Suggested fix: print the distinct linkified hosts in `--report`, or fail on hosts not in an allowlist, so that a new domain gets a human decision.

### minor: build errors name doc and block, not file and line
File: scripts/content/errors.ts:9-12
Acceptance item: review brief, "error messages naming file:line"
What is wrong: Errors look like `start/start-here:intro.2: unresolved-link: …`. For a translator the block id is a useful locator, but the markdown line number is available from `node.position` and would save time in 36 parallel translations.
Suggested fix: add `line` to `ContentIssue` and print `sourcePath:line`.

### minor: task id collision suffixes shift when an earlier duplicate is removed
File: scripts/content/ids.ts:48-58
Acceptance item: A3 stage 8 task id stability
What is wrong: Ids are stable under reordering and cosmetic edits, and an edit changes only that id, as verified. For duplicate texts in one doc, removing the first copy renames `…:5cce7722-2` to `…:5cce7722`, so a saved tick moves to the other copy. The corpus has no duplicates today.
Suggested fix: make duplicates a build error, as glossary ids already are, or document the behaviour next to `st.checks.v1`.

### Tests

### minor: no test would have caught the blocker or the major
File: tests/unit/content/facts.test.ts; tests/unit/content/special.test.ts:247
Acceptance item: A8 hazards, C6
What is wrong: The fact tests use hand-built sentences with no ordinary English words that collide with markers, and no test runs the fidelity check over a real document translation. The sources test checks counts, expansions and ids, not that entry fields cover their source text. The negative fidelity tests are good: each mutation asserts an exact message, and I reproduced 12 of 12 plus 6 more. But they only prove the checker fails; nothing proves it passes on realistic prose.
Suggested fix: commit `af-faithful`-style translations of two or three short real docs as fixtures that must produce 0 findings. Add the words-coverage assertion for `sources.json`.

### minor: forbidden-string rules are English-only and the escape hatch is loose
File: tests/content/validate.test.ts:227-259
Acceptance item: A8 forbidden stale strings
What is wrong: The rules match `R1 million` and `voluntary`, so an Afrikaans doc stating "R1 miljoen" as the BTW threshold passes. The `allowed` escape skips any sentence that also mentions `R2.3 million` (a judgement call the author disclosed). A sentence such as "The VAT threshold is R1 million and the turnover tax limit R2.3 million" would pass.
Suggested fix: give each rule both language forms (`miljoen`, `BTW`, `vrywillig`). Require the current figure to be in the same clause, or match the explicit "not R1 million" pattern only.

### nit: the snapshot is the full 3,510-line vehicle-dealer document
File: tests/unit/content/__snapshots__/corpus.test.ts.snap
What is wrong: The snapshot is meaningful but too large to review in a diff. Any wording change to that doc updates 3,500 lines.
Suggested fix: snapshot a structural digest (block ids, kinds, variants, task ids, applicability), and keep the full text covered by the drift check.

### Docs

### nit: report details that disagree with the committed data or with the author's summary
File: scripts/content/report.ts
What is wrong:
- The report says "listing 3", but committed blocks hold 2 listings and 1 `toc`, because the count is taken before overrides.
- The author's report says "one source with no URL"; the actual count is 17 entries without `url` (see the minor finding above).

Neither affects the data.

### nit: corpus numbering 1,2,3,2,3 in already-have-your-name renders as 4,5
File: docs/rsa-business-toolkit/02 Branding and marketing/00-already-have-your-name.md:77-80
What is wrong: This is a markdown source issue the author already reported, not a pipeline defect. Readers of the app will see "4." and "5." where the markdown says "2." and "3.".
Suggested fix: raise it with the content owner, or add a narrowly scoped `sourceFixes` entry with a reason.

## Items checked with no finding

- **Applicability.**
  - `core/register` stays `all`.
  - `core/vehicles#if-you-have-a-registered-company` and its children are `pty`.
  - `business-types/vehicle-dealer#if-you-trade-as-a-sole-proprietor` is `sole-prop`, and `#if-you-trade-as-a-company` is `pty`.
  - The `core/tax-and-sars#provisional-tax` override `{}` is justified: the text says provisional tax applies to sole traders and company directors alike.
  - `lookup/checklist#never` inheriting `pty` from Part A2 is correct.
  - `core/vehicles#if-the-company-owns-the-vehicle` sits under a comparison section and correctly stays `all`.
  - Nothing is hidden for `undecided`, because A5 matches every entity for it.
- **Legacy refs.** All 27 codes map correctly against the Path 3 table and the folder tree in `00-start-here.md`, including `01a` → `branding/mood-and-materials`. The bare `03`/`04`/`06` continuations resolve to the folder of the preceding ref (beauty, retail, professional).
- **Acts.** `appearsIn` expands "all business types" to all 6 type docs (Consumer Protection Act) and resolves continuations: Business Act → core/what-you-need-to-sell-things, food, beauty.
- **Fence classification.** The receipt and privacy previews, the free-tools folder listing, both MOKOENA examples and all other prompts are classified correctly, apart from the three worked-example fences above.
- **Footers.** All 29 are identical except for path depth and one date (14 September in `10-you-are-the-business`). Dropping them loses no unique text, and `generated.date` keeps the date.
- **Hidden section.** `start/how-to-use#making-the-files-easier-to-use` is kept with `hidden: true`, so its anchors still resolve.
