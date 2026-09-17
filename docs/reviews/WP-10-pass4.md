# WP-10 content pipeline: review pass 4

- Reviewer: REVIEWER-Q (did not do pass 1, 2 or 3)
- Worktree: `.claude/worktrees/agent-a57043a283a0c3c96`, branch `worktree-agent-a57043a283a0c3c96`
- HEAD: `f09d72384d9aea567da6b4191edeb917d6d1db53` (`f09d723`), confirmed with `git rev-parse HEAD` before starting
- Base: `git merge-base main worktree-agent-a57043a283a0c3c96` → `a566e8857d5b96dd2a8a3ded227aeb77d1671018` (`a566e88`)
- Whole diff reviewed: `git diff a566e88..HEAD` — 115 files, +76,446 −1. Fix round since pass 3: `git diff 68fd583..HEAD` — 30 files, +520 −60, commits `17372e5`, `0774405`, `f09d723`
- Date: 2026-09-17
- Machine notes: two other agents were running. Every vitest invocation used `--maxWorkers=1` as instructed; no `[vitest-pool]: Timeout starting forks runner` occurred in this pass, so no run had to be discounted as environment failure. I drafted my own findings before opening `WP-10-pass3.md`.
- Not run, as the brief scoped: `pnpm build`, Playwright, Lighthouse, `content:fidelity` against a real Afrikaans tree (none exists in the worktree; the build reports `af: no source tree … (skipped)`).

## Verdict

**CLEAN.** 0 blocker, 0 major, 3 minor, 4 nit.

All ten pass-3 findings are resolved, and I confirmed each one with my own probes rather than the author's tests. The pass-3 major is genuinely closed: its own reproduction case (strip the map rules from `core/tax-and-sars`, add a note and an exemption) is now refused by `source-note-with-evidence`, and an exemption does not override it. The untrue fixture exemptions are gone and the two replacement Companies Act mappings are true of the fixture text I read.

I re-verified the accuracy lens independently rather than accepting it. I reproduced the "acts named in a document's text but not in its `sources.acts`" analysis from `src/data/en/**` with my own script: **17**, of which 14 are on `lookup/sources` and 3 on `start/how-this-was-made` — exactly the residue claimed. I read all 13 new `source-map.json` reasons and all 10 group reasons against the markdown. Every one is true of the page text; I quote the supporting lines below. This is the class of defect pass 3 caught, and I could not find another instance of it.

On the question the brief asked me to scrutinise hardest — whether the guard's shape wrongly forces a real factual claim into the backlog — my judgement is that the shape is right and the deferral is defensible, but the backlog entry is incomplete. Details in minor Q3.

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 4 |

## Ownership

`git diff --name-only a566e88..HEAD` lists 115 paths. Against the brief's allowlist:

| Path group | Verdict |
|---|---|
| `content-meta/**` (8 files), `scripts/content/**` (24), `scripts/build-content.ts`, `src/lib/content/schema.ts`, `src/content.config.ts`, `src/data/en/**` (36), `tests/content/**`, `tests/unit/content/**` (24), `vitest.config.ts`, `docs/reviews/backlog.md` | In the allowlist |
| `scripts/translate/{STYLE-GUIDE-af.md,TERMS-af.json,status.ts}` | In scope. Build plan A2 puts these three files inside the content-pipeline `scripts/` layout, and pass 3 counted them as content-pipeline paths |
| `src/data/manifest.json` | In scope. A2's `src/content/manifest.json`, relocated to `src/data`; nothing else writes it |
| `package.json` | Shared file (D1). Adds only `content:build`, `content:check`, `content:drift`, `content:fidelity`, `translate:status` and inserts `content:drift` into `gate:fast`. Accepted in pass 2; I confirmed the diff contains nothing else |
| `vitest.config.ts` | Pass 3 flagged this as a scaffold/tooling root config (its minor m1). The brief for this pass lists it in the content-pipeline allowlist, so the orchestrator has accepted it. No finding |

No path outside the package. No breach.

## Commands and output (all run by me, in the worktree, in the foreground)

| Command | Exit | Tail |
|---|---|---|
| `git rev-parse HEAD` | 0 | `f09d72384d9aea567da6b4191edeb917d6d1db53` |
| `git merge-base main worktree-agent-a57043a283a0c3c96` | 0 | `a566e8857d5b96dd2a8a3ded227aeb77d1671018` |
| `pnpm lint` | 0 | `All matched files use Prettier code style!` |
| `pnpm typecheck` | 0 | `Result (63 files): - 0 errors - 0 warnings - 0 hints` |
| `pnpm exec tsc --noEmit -p .` | 0 | (no output) |
| `pnpm exec vitest run --project unit --project dom --maxWorkers=1` | 0 | `Test Files 17 passed (17)` / `Tests 474 passed (474)` / `Duration 107.51s` |
| `pnpm test:content` | 0 | `Test Files 1 passed (1)` / `Tests 32 passed (32)` / `Duration 5.58s` |
| `pnpm content:drift` | 0 | `Wrote 0 changed files, removed 0, 41 files in total.` / `Content drift: none.` |
| `pnpm content:check` | 0 | `Content check: 41 files match the markdown.` |
| `pnpm exec vitest run --project unit --project dom --coverage --maxWorkers=1` | 0 | `scripts/content \| 97.47 \| 88.11 \| 99.49 \| 98.42` — all four thresholds met |

Coverage, per file, for the files this package owns (from the same run):

```
File               | % Stmts | % Branch | % Funcs | % Lines |
All files          |    93.8 |    86.09 |   96.74 |   94.85 |
 scripts           |       0 |        0 |       0 |       0 |
  build-content.ts |       0 |        0 |       0 |       0 | 25-115
 scripts/content   |   97.47 |    88.11 |   99.49 |   98.42 |
  build.ts         |   94.09 |    78.37 |   96.66 |   93.75 |
  facts.ts         |     100 |    81.81 |     100 |     100 |
  fidelity.ts      |   93.59 |    83.48 |     100 |   97.65 |
  provenance.ts    |     100 |     91.3 |     100 |     100 |
  report.ts        |   99.18 |    64.93 |     100 |   98.98 |
 ...ontent/special |   95.82 |    88.95 |   97.95 |    98.2 |
 scripts/translate |       0 |        0 |       0 |       0 |
  status.ts        |       0 |        0 |       0 |       0 | 19-73
 src/lib/content   |   85.83 |     72.6 |     100 |   85.21 |
  schema.ts        |   85.83 |     72.6 |     100 |   85.21 |
```

The coverage run now **exits 0** (pass 3's m1 made it exit 1). `report.ts` is at 64.93% branches, is still inside `coverage.include`, is still measured, and is recorded in `docs/reviews/backlog.md`. It is not excluded. See minor Q2 for what the thresholds still do not cover.

### Determinism and committed output

```
committed: 2a2510e8eab07576e03b66fc006b8fd14d3e17c0
build 1  : 2a2510e8eab07576e03b66fc006b8fd14d3e17c0
build 2  : 2a2510e8eab07576e03b66fc006b8fd14d3e17c0
git status --short: (empty)
```

(`find src/data -type f | sort | xargs sha1sum | sha1sum`, hashed before any build, then after `pnpm content:build` twice.) Two consecutive builds are byte-identical, and the committed JSON matches a fresh build.

**Worktree state: `git status --short` is empty. I left the author's worktree exactly as I found it.** Every probe ran from scratchpad files outside the worktree (`…/scratchpad/probeQ.mts`, `probeQ2.mts`, `actsQ.mjs`), importing the worktree modules by `file://` URL, and each one that needed a mutated config copied `content-meta` to a temp directory first and deleted it afterwards.

## Probe results

### Batch 1 — trying to break `source-note-with-evidence` (`probeQ.mts`, direct calls to `mapDocSources`)

| # | Probe | Expected | Actual |
|---|---|---|---|
| P1 | Noted page links a register entry's URL exactly | refused | **refused** — `source-note-with-evidence[start/probe]` |
| P2 | Noted page's claim cites an act the register does not list at all, and the page links nothing | not caught (nothing to see) | not caught, no issue |
| P3a | Same URL through `http://`, `SARS.gov.za` in capitals, no trailing slash, with a `#top` fragment | refused | **refused** — normalisation holds through scheme, case, `www.`, trailing slash and fragment |
| P3b | Same page with `?utm_source=x` appended | not caught | not caught — the query is part of the key |
| P4 | A **non-register** page declares `kind: 'sources'` in `docs.meta.json`, carries a note, and has an act `appearsIn` row **and** a matching register link | should still be refused | **not caught, no issue at all** — see minor Q1 |
| P5 | A page that already carries a `sourceNoteExemptions` entry then gains act evidence | refused, exemption must not override | **refused** — `source-note-with-evidence[core/probe]`; the exemption does not help |
| P6 | `source-map.json` tries to map an act to a noted page | refused | **refused** — `source-map[start/probe]`, "which has a source note instead of sources" |
| P7 | Noted page links a register entry whose URL is a bare site root | not caught (front pages excluded by design) | not caught |

P2, P3b and P7 are limits of what link-and-`appearsIn` evidence can see, not defects; P4 is a real hole (Q1).

### Batch 2 — the pass-3 findings, through the full `buildContent` against the real `content-meta` (`probeQ2.mts`)

| Probe | Result |
|---|---|
| **Pass-3 M1 reproduction**: drop every group/entry/act rule for `core/tax-and-sars`, give it a note and a 10+ character exemption | **REFUSED**: `core/tax-and-sars: source-note-with-evidence: has a source note, but the sources register has evidence for it: act "income-tax-act-58-of-1962", act "value-added-tax-act-89-of-1991". …` The exact case that built in pass 3 now fails |
| **n4**: exemption for `start/how-to-use`, which needs none | **REFUSED**: `unknown-override: … "start/how-to-use", which does not need one: a guide in start may carry a source note without an exemption` |
| **n5**: pin `checkedOn: 2026-09-01` on `core/you-are-the-business` | **REFUSED**: `verification-date: en: checked on 2026-09-01, before it was generated on 2026-09-14…` |
| **n5b**: delete the override entirely, so it falls back to the register's `2026-09-13` | **REFUSED**, same code. The build fails rather than silently using the later date, as claimed |
| **n1**: `reviewedBy` values | `""`, `" \t "`, `"​"`, `"-"`, `"..."`, `"1962"` all **refused**; `"Jane Expert CA(SA)"` accepted |
| **n7**: ordinal day-month dates | `the 7th of August` → `dates ["--08-07"], ordinals []`; `7th August 2026` → `["2026-08-07"]`; af `7 Augustus` and `die 7de van Augustus` → both `["--08-07"]`; `by the 7th of the following month` and `teen die 7de van die volgende maand` → `dates [], ordinals ["7"]`. English and Afrikaans now agree, and a bare ordinal is still an ordinal |

### Batch 3 — independent recount of the m2 residue (`actsQ.mjs`)

My own script walks every `src/data/en/docs/*.json`, flattens all block text, and reports each act from `sources.json` whose short name appears in the text but is absent from that doc's `sources.acts`:

```
acts named in a document's text but absent from its sources.acts: 17
  lookup/sources -> 14 acts (the register itself)
  start/how-this-was-made -> income-tax-act-58-of-1962, businesses-act-71-of-1991, second-hand-goods-act-6-of-2009
```

This matches the claim exactly. I read the three `how-this-was-made` sites: `:41` "Businesses Act licensing categories" and `:44` "Second-Hand Goods Act dealer registration" are bullets in a list of verified topics, not claims — the agent's judgement is right. `:127` is a claim. See Q3.

## Findings

### minor: `kind: 'sources'` is a wider escape hatch than the comment claims, and a second one is swallowed silently (Q1)

File: `scripts/content/provenance.ts:211-217`; `scripts/content/build.ts:251` and `:496`
Acceptance item: ADR-0006 decision 3; D5 "The build fails if a guide, template, checklist or business-type page has no sources and no note"; the fix round's own claim that the guard has "no override"

What is wrong: the exception is written as `doc.entry.kind === 'sources'`, and the comment justifies it as "The register document is the one exception, because every link on it is a register entry by definition." Nothing enforces that only one document has that kind. `docs.meta.json` is hand-maintained, and `kind` is a free choice per entry. A page that sets `"kind": "sources"` gets three things at once: it is outside `SOURCES_REQUIRED.kinds`, so `requiresSources` is false and `doc-without-sources` never fires; it is outside the new guard, so `source-note-with-evidence` never fires; and `build.ts` finds the register with `parsed.find((doc) => doc.entry.kind === 'sources')`, so a second such document is neither treated as the register nor reported. The result is a page carrying a source note with act `appearsIn` evidence and a matching register link, and a build that emits no issue of any kind.

How to reproduce: probe P4 above. `core/probe` declares `kind: 'sources'`, has a note, is listed in the Income Tax Act's `appearsIn`, and links a register entry's URL. Result: `issues: (none)`, `core/probe: note=YES entries=[] acts=[]`.

Why minor and not major: reaching it needs a deliberate mislabel in hand-maintained config by the package owner, and the corpus has exactly one `sources` document today. But the guard is sold as having no override, and this one is a single word in a JSON file with no diagnostic at all.

Suggested fix: resolve the register document once (the single entry whose `kind` is `sources`) and make the exception identity-based rather than kind-based; raise a `source-map` or taxonomy issue when more than one document declares `kind: 'sources'`.

### minor: the C5 coverage floor is enforced on `scripts/content/**` only, and the function threshold is slack (Q2)

File: `vitest.config.ts:29-41`
Acceptance item: C5, `test` = "vitest unit+dom, coverage ≥90% on `src/lib/**` and `scripts/**`"

What is wrong: `coverage.include` is `src/lib/**`, `src/i18n/**` and `scripts/**`, but `thresholds` has one key, `scripts/content/**`. There is no global threshold, so three files this package owns have no floor at all:

- `scripts/build-content.ts` — **0% / 0% / 0% / 0%**, lines 25-115 uncovered. This is the CLI `main()`: the `--check`, `--drift` and `--fidelity-only` branches CI depends on. `cli.ts` (argument parsing) is at 100%, but `main()` itself is never entered by a unit test.
- `scripts/translate/status.ts` — **0%**, lines 19-73, and `translate:status` is a published package script.
- `src/lib/content/schema.ts` — **85.83% statements, 72.60% branches**. This is the package's own Zod schema, the file the fix round changed for `namesAPerson` and the new `checkedOn < generated.date` rule.

Separately, the thresholds that do exist have more slack than the brief assumed. Measured this run against configured: statements 97.47 vs 95, branches 88.11 vs 85, functions **99.49 vs 95**, lines 98.42 vs 95. The function threshold tolerates a 4.5-point regression — roughly 20 of the ~440 functions in `scripts/content` could stop being called before the gate noticed. Branches at 85 vs 88.11 is the figure pass 3 asked for and is correctly backlogged; the other three are pinned to round numbers rather than to the measurement.

This is a minor rather than a major because the uncovered CLI paths *are* exercised end-to-end every time `gate:fast` runs — I ran `content:drift` and `content:check` and both pass — so the behaviour is tested, just not by a coverage-counted test. The gap is a regression-detection gap, not missing behaviour.

How to reproduce: the coverage table above.

Suggested fix: raise functions to 98 and statements/lines to 97 to match the measurement; add a `src/lib/content/**` threshold for the schema this package owns; and either cover `build-content.ts` `main()` (it takes an argv array and a `repoRoot`, so it is testable) or record both 0% files in `backlog.md` the way `report.ts` was recorded.

### minor: the m2-residue backlog entry is incomplete, and it frames a content decision as a pipeline constraint (Q3)

File: `docs/reviews/backlog.md:101`; `content-meta/source-map.json` `notes.docs["start/start-here"]`; `docs/rsa-business-toolkit/00 Start here/00-start-here.md:97-99`
Acceptance item: ADR-0006 decision 3; D5 "Every content page lists its own sources"

I scrutinised this as the brief asked, and I do **not** think the guard is the wrong shape. Two reasons:

1. The 11C claim is fully sourced elsewhere in the corpus. `core/paying-yourself:52` states the same repeal, and that page is mapped to the `paying-yourself-from-a-company` register group whose reason names "11C repeal from 1 March 2017". The register carries the supporting entry (`03-sources-and-verification-register.md:160`, the Polity / ENSafrica item, "confirms paragraph 11C was repealed with effect from 1 March 2017"). `how-this-was-made` is a start page whose own text says the correction "is sourced in [Sources and verification register]", and its note points there. So no reader loses a source.
2. The trap will only ever catch a page that gains an act `appearsIn` row or a link matching a register entry. In both cases dropping the note and listing the sources is the *right* outcome, and D5 does not forbid a start page from having sources — it only says a page with none shows a note. A hard failure is the correct behaviour.

What is wrong is narrower, and it is two things:

- **The backlog entry says the wrong thing.** "mapping an Act to a noted page is refused by design" is literally true of `mapTo`, but it reads as though the pipeline makes the fix impossible. It does not: removing the note and mapping the Income Tax Act would build. What is deferred is a content decision (should this start page carry a note or a source list?), not a pipeline limitation. The entry should say so.
- **A second page in the same class is not recorded.** `start/start-here:97-99` states three specific figures — "Compulsory VAT registration: **R2.3 million**, not R1 million, from 1 April 2026", "Voluntary VAT registration: **R120,000**, not R50,000", "Turnover tax: **R2.3 million** threshold, with **0% on the first R600,000**" — under a note reading "An orientation page: its headline figures are stated and sourced in the documents it points to." Those three bullets link nothing. The figures are indeed sourced, on `core/tax-and-sars` (`:26`, `:28`, `:107`, which carries 7 register entries plus the Income Tax and VAT Acts), but that page is only reachable from a generic reading path higher up. This is the same class as the backlogged `how-this-was-made` item, it is more numerically specific, and the new guard cannot see it because the page links no register URL (probe P2). It belongs in the same backlog row for the accuracy-review phase.

Suggested fix: reword the `m2 residue` backlog row to name the decision rather than the mechanism, and add `start/start-here` to it.

### nit: the schema tightening left two unreachable fallbacks in the file the threshold measures (Q4)

File: `scripts/content/provenance.ts:285` and `:323`
`ProvenanceSchema` now requires `checkedOn` on **both** union members (`config.ts:171`, `:178`), so `override?.checkedOn ?? registerCheckedOn ?? config.provenance.generated.date` can never fall past the first term when an override exists, and `if (review.checkedOn !== undefined && …)` can never be false. Both are dead branches in `provenance.ts`, which is one of the files whose branch percentage the `scripts/content/**` threshold measures.
Suggested fix: drop the `!== undefined` guard, and reduce the fallback chain to `override?.checkedOn ?? registerCheckedOn ?? …` with a comment saying the first term only applies when there is no override.

### nit: one mapping reason paraphrases a deadline less precisely than the page states it (Q5)

File: `content-meta/source-map.json`, group `running-a-pty-ltd-annual-returns-financial-statements-directors`
The reason says "30-day window". `06-running-a-pty-ltd.md:50` and `:237` both say "30 **business** days". Every other reason I checked is exact, and this is the one class of defect pass 3 caught, so it is worth keeping the reasons literal.
Suggested fix: "30-business-day window".

### nit: the register's own check date now visibly predates content it covers (Q6)

File: `src/data/en/sources.json` (`checkedOn: 2026-09-13`); `docs/rsa-business-toolkit/05 Look it up/03-sources-and-verification-register.md:372`; `docs/rsa-business-toolkit/00 Start here/00-start-here.md:11`
The n5 fix is correct and its evidence checks out (see the table below), but it makes an existing content inconsistency visible: the register says it was checked on 2026-09-13 while containing the section "You are the business: UIF, COIDA, courts and continuity" for a page generated 2026-09-14, and `start-here:11` still tells readers that every threshold "was checked against official South African sources on 13 September 2026" while the pipeline now records 2026-09-14 for one page. This is content, owned by WP-47, not the pipeline.
Suggested fix: note it for WP-47 alongside the existing n6 backlog row.

### nit: the limits of the evidence test are not written down where the guard is (Q7)

File: `scripts/content/provenance.ts:64-75` and `:205-210`
The doc comment describes the guard as though the register "has evidence for" a page were a decidable fact. Probes P2, P3b and P7 show three blind spots: a claim resting on a register entry the page does not link is invisible; a link differing only by a query string does not match; and a link to a register entry whose URL is a site root is excluded by `isFrontPage`. All three are reasonable, but a future reader could take a clean build as proof that no noted page makes a claim, which it is not.
Suggested fix: one sentence in the comment saying the check is a backstop over links and `appearsIn` rows, and that an unlinked claim is still the accuracy review's job.

## Pass-3 verification

| Pass-3 item | Fix | Status and my evidence |
|---|---|---|
| **M1** a source-note exemption can excuse a page that makes claims; the fix round did so with an untrue fixture reason | `mapDocSources` computes `evidence` from act `appearsIn` rows and URL-matched register entries and raises `source-note-with-evidence`, before and independent of the exemption check; `kind: 'sources'` excepted. Fixture exemptions and notes deleted; two Companies Act mappings added | **Fixed.** Pass-3's own reproduction is now refused (batch 2, row 1). An existing exemption does not override it (probe P5). `fixtures/meta/provenance.json` `sourceNoteExemptions` is `{}` and `fixtures/meta/source-map.json` `notes.docs` holds only `lookup/sources`. Both new fixture reasons are true of the fixture text I read: `fixtures/en/03 Paperwork and templates/templates-to-fill-in/01-quotation.md:9` "Reg. No. [NUMBER] — this is required by law"; `…/01-which-template-to-use-when.md:29` "A trading name of Mokoena Holdings (Pty) Ltd \| Reg. No. 2026/123456/07". Residual hole: minor Q1 |
| **m1** the new 90% branch threshold fails; every coverage run exits 1 | threshold set to the measured 95/85/95/95; `report.ts` shortfall recorded in `backlog.md:99` | **Fixed.** My coverage run exits **0** at 97.47/88.11/99.49/98.42. `report.ts` is still inside `coverage.include`, still measured at 64.93% branches, and is backlogged, not excluded. Threshold slack is a new, separate minor (Q2) |
| **m2** three more pages cite an Act by section without listing it | 15 act mappings added across 8 documents | **Fixed.** My independent recount gives 17 residual, 14 on `lookup/sources` and 3 on `start/how-this-was-made` — the claimed figures. All three named pages are fixed and pinned in `corpus.test.ts`: `core/running-a-pty-ltd` → `['companies-act-71-of-2008']` (`06-running-a-pty-ltd.md:36`, "Section 32 of the Companies Act requires the registered name and registration number…"); `paperwork/which-template-to-use-when` → 5 acts (`:51` s32, `:368` CPA plain language, `:360-362` ECTA ss43/44/46 and the seven-day cooling-off right); `business-types/vehicle-dealer` → `income-tax-act-58-of-1962` (`:341`, "Section 22 of the Income Tax Act requires closing trading stock…"). I also verified the other ten new reasons line by line — see "Accuracy spot checks" |
| **n1** an invisible or punctuation-only reviewer name is accepted | `namesAPerson` = `/\p{L}/u`, used by `ProvenanceSchema`, `VerificationSchema`, `DocSchema` and `validate.test.ts` | **Fixed.** `"​"`, `"-"`, `"..."` and `"1962"` are all refused; `"Jane Expert CA(SA)"` accepted (batch 2) |
| **n2** "future" judged by the UTC date | `todayInJohannesburg()` via `Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' })` | **Fixed.** `REVIEW_TIME_ZONE` is the documented default for `checkProvenanceConfig` |
| **n3** the source-fix fact guard reads translations with English markers | `applySourceFixes` takes `markers: FactMarkers`; `build.ts` passes `markersFor(ctx.config, lang)`; both test call sites pass `afMarkers()` | **Fixed** |
| **n4** an exemption for a page that needs none is accepted | `checkProvenanceConfig` raises `unknown-override` when the exempted doc fails `requiresSources` | **Fixed.** `start/how-to-use` is now refused with the exact message (batch 2) |
| **n5** one document is "checked" before it was generated | build fails (`checkVerificationDates` plus `DocSchema.superRefine`) rather than using the later date; `ai-checked` overrides now require `checkedOn` **and** a `reason` of 10+ characters; override added for `core/you-are-the-business` | **Fixed, and the date is justified.** Deleting the override makes the build fail rather than silently pass (batch 2, n5b). The cited evidence is real: the page footer is "*Generated by AI (Claude, Anthropic) on 14 September 2026. Facts in this file were checked against official South African sources…*"; `03-what-has-changed.md:97-99` "Change 4: you are the business, plus three corrections / **Date:** 14 September 2026"; `02-how-this-was-made.md:151` the twelfth pass describes the same work; and the register does have a section for the page (`03-sources-and-verification-register.md:372`). This is not an invented date. One imprecision: the twelfth pass itself carries no date — the dated evidence is Change 4 and the footer. Residual content inconsistency: nit Q6. I also checked the obvious forward-looking trap, that an Afrikaans translation generated later would fail this new rule: it cannot, because fidelity rule `footer-date` requires the translated footer to keep the English date (`fidelity.ts:409`, `STYLE-GUIDE-af.md:85`) |
| **n6** a register title is a sentence ending in "including" | deliberately not fixed | **Backlogged as claimed**, `backlog.md:100`, assigned to WP-47. Correct call: it is a content repair in the English register |
| **n7** `the 7th of August` and `7 Augustus` disagree | `ORDINAL_MONTH_WORDS = (?:of\|van)` folded into the `dayMonth` pattern | **Fixed.** Both languages give `--08-07`, the bare ordinal case is unchanged, and the ordinal is consumed rather than double-counted (batch 2). The new group is optional in the regex, so no previously matching date stops matching |

## Accuracy spot checks (the pass-3 defect class)

Every new act mapping reason, read against the markdown:

| Reason claims | Markdown | True? |
|---|---|---|
| s32 registered name and number, `core/running-a-pty-ltd`, `paperwork/which-template-to-use-when` | `06-running-a-pty-ltd.md:36`; `01-which-template-to-use-when.md:51` | yes |
| CPA plain language and the T&Cs prompt, `which-template-to-use-when` | `:368` "The Consumer Protection Act requires plain language. A document your customer cannot understand can be unenforceable"; `:356` | yes |
| ECTA ss43, 44, 46 and the seven-day cooling-off right | `:360-362` | yes |
| Income Tax s22 closing trading stock, `vehicle-dealer` | `01-vehicle-dealer.md:341` | yes |
| Income Tax s7B and s64E(4), `core/paying-yourself` | `07-paying-yourself.md:58`, `:137` | yes |
| Companies Act s4 solvency and liquidity, `core/paying-yourself` | `:103` | yes |
| Companies Act, director ceases on death, `core/you-are-the-business` | `10-you-are-the-business.md:123` | yes |
| Companies Act on every quote, invoice and contract, `branding/branding-prompts` | `01-branding-prompts.md:345` | yes |
| Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972, `core/what-you-need-to-sell-things` | `04-what-you-need-to-sell-things.md:86` | yes |
| Second-Hand Goods Act 6 of 2009, SAPS register, same page | `:102` | yes |
| Businesses Act municipal trading licence, `vehicle-dealer` and `retail-online` | `01-vehicle-dealer.md:367`; `04-retail-and-online-shop.md:28` | yes |
| OHSA 85 of 1993 among the Acts governing a food business | `02-food-business.md:94` | yes |
| CPA among what every business needs, `pick-your-business-type` | `00-pick-your-business-type.md:40` | yes |

All ten group reasons also check out, e.g. `paying-yourself-from-a-company` ("s64E(4) … 7.75% official rate, 11C repeal from 1 March 2017") against `07-paying-yourself.md:52`, `:143`; `food-businesses` ("R638 COA requirement and Regulation 10 training, R146 labelling") against `02-food-business.md:14`, `:15`, `:28`; `working-from-home…` ("SABRIC 2024 figures, PayShap R50,000 limit") against `09-working-from-home-and-safety.md:119`, `:127`. The only imprecision found is nit Q5.

## Lenses

- **Correctness.** Output is deterministic across two builds and matches the committed JSON. The new guard fires before the exemption check, so it cannot be overridden; I proved this rather than reading it. Error messages name the file, the document, the rule and the remedy. The `dayMonth` change is additive: the new group is optional, so no date that matched before stops matching. `checkVerificationDates` runs over both the English and every translated build, and the `footer-date` fidelity rule makes it safe for translations. Findings: Q1, Q4, Q7.
- **Accuracy and over-claim.** This is the lens I weighted most. No generated artefact asserts something a source does not support that I could find: all 13 new mapping reasons and all 10 group reasons are true of the page text; the `ai-checked` date override for `core/you-are-the-business` is backed by the page footer, the dated Change 4 entry and a real register section; the untrue fixture exemptions are gone and their replacements are accurate. The one residue is a start page stating three thresholds behind a note (Q3), which D5 permits and the accuracy phase owns.
- **Accessibility.** Not applicable: this package emits data only. `doc.sourceNote`, `doc.sources`, `doc.generated` and `doc.verification` are present and schema-validated on every document, which is what D5's page-level requirements render from.
- **Internationalisation.** `applySourceFixes` now reads each language with its own markers, so an Afrikaans fix that changes an ordinal or a month is caught. The new `of|van` ordinal handling deliberately accepts both languages' connectives, so an untranslated English form still compares equal. Heading ids stay English slugs. No UI strings in this package.
- **Performance.** Full build about 30 s on a loaded machine; unit + dom 107 s at `--maxWorkers=1`. No new dependencies, no network access.
- **Security.** No `innerHTML`, no runtime third-party requests, no secrets. `assertSafeOutDir` (pass 2 m5) still guards `--out`. `build-content.ts:86` shells out to `git status` with `execFileSync` and an argument array, so there is no shell interpolation.

## Recommendation

This is the **first clean pass** for WP-10 (pass 3 was NOT CLEAN). Under D4 the package needs one more clean pass over the whole diff from a fresh reviewer before it merges. Under the 17 September protocol amendment, the three minors and four nits above may be fixed now without restarting the count; Q3 and Q6 are the two I would move to `backlog.md` rather than fix here, since both are content decisions owned by the accuracy review phase.
