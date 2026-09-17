# WP-10 content pipeline: review pass 5

- Reviewer: REVIEWER-T (fresh; did not do pass 1, 2, 3 or 4)
- Worktree: `.claude/worktrees/agent-a57043a283a0c3c96`, branch `worktree-agent-a57043a283a0c3c96`
- HEAD: `1af3a570ebda8aada2a44fa9e7db3c04a0116ac6` (`1af3a57`), confirmed with `git rev-parse HEAD` before starting and again at the end — unchanged
- Base: `git merge-base main worktree-agent-a57043a283a0c3c96` → `a566e8857d5b96dd2a8a3ded227aeb77d1671018` (`a566e88`)
- Whole diff reviewed: `git diff a566e88..HEAD` — 115 files, +76,581 −1. Fix round since pass 4: commits `bafe987`, `042ecff`, `e112792`, `1af3a57` on top of `f09d723`
- Date: 2026-09-18
- Machine notes: two other agents were running throughout. Every vitest invocation used `--maxWorkers=1`. The coverage run printed seven `[vitest-pool]: Timeout terminating forks worker …` lines; all 17 test files still passed and the run exited 0, so this was **environment under load, not a code failure**. The plain unit+dom run printed none. `pnpm -v` itself once exceeded a 120 s shell timeout, which is the same load signature.
- I drafted my own findings before opening `WP-10-pass3.md` or `WP-10-pass4.md`.
- Not run, as the brief scoped: `pnpm build`, Playwright, Lighthouse, and `content:fidelity` against a real Afrikaans tree (none exists in the worktree; the build reports `af: no source tree … (skipped)`).

## Verdict

**CLEAN.** 0 blocker, 0 major, 1 minor, 1 nit.

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 1 |
| nit | 1 |

This is the second consecutive clean pass. Pass 4 was clean and the round since then contains only minor/nit fixes plus two reasoned refusals, so under the 17 September amendment to `docs/reviews/README.md` the count is not restarted and the package is mergeable.

I verified both points where the author disagreed with pass 4 against the source rather than the reply. **The author is right on Q2 and right on Q4**; pass 4's Q2 rationale ("it takes an argv array and a `repoRoot`, so it is testable") is factually wrong about the code as written. Details in the pass-4 table below.

I attacked the register escape hatch from four directions, including the two new variants the brief asked for, and could not get an unsourced claim past the guards by any route the guards claim to cover. The one route that does get through — a link differing only by a query string — is the blind spot the fix round documented and pinned with a test, and it behaves exactly as documented.

## Ownership

`git diff --name-only a566e88..HEAD` lists 115 paths. Against the allowlist:

| Path group | Count | Verdict |
|---|---|---|
| `content-meta/**` | 8 | In the allowlist |
| `scripts/content/**` | 24 | In the allowlist |
| `scripts/build-content.ts` | 1 | In the allowlist (`scripts/build-*.ts`) |
| `scripts/translate/{STYLE-GUIDE-af.md,TERMS-af.json,status.ts}` | 3 | In the allowlist (`scripts/translate/**`) |
| `src/lib/content/schema.ts`, `src/content.config.ts` | 2 | In the allowlist |
| `src/data/en/**` | 36 | In the allowlist |
| `src/data/manifest.json` | 1 | In scope. Build plan A2's `src/content/manifest.json`, relocated to `src/data`; nothing outside this package writes it. Accepted in passes 3 and 4 |
| `tests/content/**`, `tests/unit/content/**` | 24 | Content tests, in the allowlist |
| `vitest.config.ts` | 1 | In the allowlist for this pass |
| `docs/reviews/backlog.md` | 1 | In the allowlist |
| `package.json` | 1 | Shared file (D1). I diffed it in full: it adds `content:build`, `content:check`, `content:drift`, `content:fidelity`, `translate:status` and inserts `content:drift` into `gate:fast`. Nothing else. Accepted from pass 2 onward |

No path outside the package. No breach.

## Commands and output (all run by me, in the worktree, in the foreground)

| Command | Exit | Tail |
|---|---|---|
| `git rev-parse HEAD` | 0 | `1af3a570ebda8aada2a44fa9e7db3c04a0116ac6` |
| `git merge-base main worktree-agent-a57043a283a0c3c96` | 0 | `a566e8857d5b96dd2a8a3ded227aeb77d1671018` |
| `pnpm lint` | 0 | `All matched files use Prettier code style!` |
| `pnpm typecheck` | 0 | `Result (66 files): - 0 errors - 0 warnings - 0 hints` |
| `pnpm exec tsc --noEmit -p .` | 0 | (no output) |
| `pnpm exec vitest run --project unit --project dom --maxWorkers=1` | 0 | `Test Files 17 passed (17)` / `Tests 477 passed (477)` / `Duration 84.83s` |
| `pnpm exec vitest run --project content --maxWorkers=1` (= `pnpm test:content`) | 0 | `Test Files 1 passed (1)` / `Tests 32 passed (32)` / `Duration 5.79s` |
| `pnpm content:check` | 0 | `Content check: 41 files match the markdown.` |
| `pnpm content:drift` | 0 | `Wrote 0 changed files, removed 0, 41 files in total.` / `Content drift: none.` |
| `pnpm exec vitest run --project unit --project dom --maxWorkers=1 --coverage` | 0 | `Statements 93.82% (2672/2848)` / `Branches 86.09% (1808/2100)` / `Functions 96.76% (508/525)` / `Lines 94.86% (2345/2472)`; no threshold ERROR |
| Threshold-liveness probe (below) | 1 | 16 `ERROR:` lines, four per threshold group |

Test count is 477, up from pass 4's 474: the three added tests are the blind-spot pinning test, the impostor-register test and the second-register schema test. `astro check` now covers 66 files, up from 63.

Per-file coverage for the files this package owns:

```
File               | % Stmts | % Branch | % Funcs | % Lines |
All files          |   93.82 |    86.09 |   96.76 |   94.86 |
 scripts           |       0 |        0 |       0 |       0 |
  build-content.ts |       0 |        0 |       0 |       0 | 25-115
 scripts/content   |   97.48 |    88.11 |   99.49 |   98.43 |   floor 97/85/98/97
  build.ts         |   94.09 |    78.37 |   96.66 |   93.75 |
  provenance.ts    |     100 |    91.11 |     100 |     100 |
  report.ts        |   99.18 |    64.93 |     100 |   98.98 |   backlogged (m1)
 ...ontent/special |   95.82 |    88.95 |   97.95 |    98.2 |
 scripts/translate |       0 |        0 |       0 |       0 |
  status.ts        |       0 |        0 |       0 |       0 | 19-73
 src/lib/content   |   85.83 |     72.6 |     100 |   85.21 |   floor 85/72/100/85
  schema.ts        |   85.83 |     72.6 |     100 |   85.21 |
```

### Determinism and committed output

```
$ pnpm content:build --out <scratch>/b1     exit 0
$ pnpm content:build --out <scratch>/b2     exit 0
$ diff -r --brief <scratch>/b1 <scratch>/b2   → IDENTICAL
$ diff -r --brief <scratch>/b1 src/data       → IDENTICAL
$ git status --short                          → (empty)
```

Two independent builds are byte-identical to each other and to the committed `src/data`.

**Worktree state: `git status --short` is empty and `git rev-parse HEAD` is still `1af3a57`. I left the author's worktree exactly as I found it.** Every probe ran from scratchpad files outside the worktree, importing worktree modules by absolute path, and each probe that needed mutated config or corpus copied `content-meta` and `docs/rsa-business-toolkit` into a temp directory first.

## Probe results

### Batch A — the register escape hatch, end to end through `buildContent` against the real corpus

Probes ran the **whole build** with a tampered `content-meta` copy and `sourceRoots: { en: <corpus copy> }`, so nothing is mocked.

| # | Probe | Expected | Actual |
|---|---|---|---|
| T-A1 | Two documents declare `kind: "sources"` (`core/tax-and-sars` and `lookup/sources`) | `loadConfig` refuses | **CAUGHT** — `docs.meta.json: invalid … only one document is the sources register, but 2 declare kind "sources": core/tax-and-sars, lookup/sources` |
| T-A2 | **Impostor is first in file order**: real register demoted to `kind: "guide"`, `core/tax-and-sars` declares `kind: "sources"`, is moved to the top of `docs[]`, given a source note **and** an exemption, and all its map rules stripped | build must not pass silently | **CAUGHT** — build fails with 154 issues across `sources-checked-on`, `sources-block`, `sources-acts`, `source-map`, `doc-without-sources`, `source-note-not-allowed`, `unknown-override`. Taking the register label means being parsed as the register, which a guide cannot survive. The escape is self-defeating |
| T-A3 | `registerDocId` changed after `build.ts` resolves it | not reachable | Not reachable by construction: `build.ts:496` computes `enSourcesDoc` and `build.ts:513` passes `enSourcesDoc?.entry.id` in the same expression, with no mutation in between and no other caller in the package |
| T-A4 | A page declares `kind: "sources"` in Afrikaans only | not reachable | Not reachable: `kind` lives on the single shared `docs[]` entry in `docs.meta.json`; there is no per-language `kind` field to set |
| T-A5 | A `guide` in `branding` loses every group/entry/act mapping and links no register entry | refused | **CAUGHT** — `doc-without-sources` |
| T-A6 | The same guide is quietly given a source note instead, with no exemption | refused | **CAUGHT** — `source-note-not-allowed` |
| T-A7 | Control: pristine metadata and corpus | builds clean | **BUILD SUCCEEDED**, no issues |

### Batch B — smuggling an unsourced claim onto a noted page, by URL variant

Target is `branding/marketing-prompts`, which already carries **both** a source note and a `sourceNoteExemptions` entry — the strongest starting position an attacker has. A paragraph making a factual claim plus a link was inserted above the AI footer, and the full build was run.

| Probe | Link form | Expected | Actual |
|---|---|---|---|
| T-B1 | `https://www.sars.gov.za/types-of-tax/turnover-tax/` (exact register URL) | refused | **CAUGHT** — `source-note-with-evidence … register entry "sars--turnover-tax"` |
| T-B2 | `http://SARS.gov.za/types-of-tax/turnover-tax` (http, uppercase host, no `www.`, no trailing slash) | refused | **CAUGHT** — same issue. Normalisation holds through scheme, case, `www.` and trailing slash |
| T-B3 | `…/turnover-tax/#rates` (fragment) | refused | **CAUGHT** |
| T-B4 | `…/turnover-tax/?utm_source=x` (query string) | **not** caught — documented blind spot | **NOT SEEN**, build clean. Matches the doc comment and the pinned test |
| T-B5 | Markdown link text rather than a bare URL: `[the SARS turnover tax page](…)` | refused | **CAUGHT** — the guard reads resolved external links, not raw text |
| T-B6 | Control: `https://example.org/nothing-here/` | not caught | **NOT SEEN**, build clean |

The existing exemption did **not** help in T-B1/2/3/5. That is the pass-3 major staying closed, proved on the hardest case rather than on a synthetic one.

### Batch C — are the four coverage threshold groups actually live?

The author claims to have proved this by bumping the 0-floors to 1. I reproduced it independently, without touching the worktree: a probe vitest config in my scratchpad imports the author's real `vitest.config.ts`, raises only the two 0-floors to 1, and runs a single trivial test file so every group is far below its floor.

```
$ pnpm exec vitest run --config <scratch>/probe-thresholds.config.ts \
    --project unit --maxWorkers=1 --coverage tests/unit/format.test.ts
…
ERROR: Coverage for lines (0%) does not meet "scripts/content/**" threshold (97%)
ERROR: Coverage for branches (0%) does not meet "scripts/content/**" threshold (85%)
ERROR: Coverage for lines (0%) does not meet "src/lib/content/**" threshold (85%)
ERROR: Coverage for functions (0%) does not meet "src/lib/content/**" threshold (100%)
ERROR: Coverage for lines (0%) does not meet "scripts/build-content.ts" threshold (1%)
ERROR: Coverage for statements (0%) does not meet "scripts/build-content.ts" threshold (1%)
ERROR: Coverage for lines (0%) does not meet "scripts/translate/status.ts" threshold (1%)
ERROR: Coverage for statements (0%) does not meet "scripts/translate/status.ts" threshold (1%)
   (16 ERROR lines in total, four per group)   exit 1
```

**All four threshold keys match real files and are enforced.** No key silently fails to apply. The author's claim is verified.

### Batch D — accuracy of `content-meta/source-map.json` against the markdown

This is the defect class pass 3 caught, so I checked it mechanically rather than by sampling. A script extracted every distinctive token (rand amount, percentage, statutory section reference, form code, number of days/months/years, any 3+ digit number) from all 115 mapping reasons and asserted each token appears in each mapped document's markdown. 26 rule/document pairs were flagged; I then read every one against the source.

24 of the 26 are artefacts of my tokeniser or of correctly-scoped reason wording:

- reasons write `s44`, `s46`, `s64E(4)`, `s7(1)`, `s56`; the markdown writes "section 44", "section 46", "section 64E(4)", "Section 7(1)", "section 56" — all present and correct (`04-what-you-need-to-sell-things.md:127,137`; `07-paying-yourself.md:137`; `10-you-are-the-business.md:83`)
- `2-6 month timelines` vs "two to six months" (`02-food-business.md:22,72`)
- `R2.3m` vs "R2.3 million"; `R99,000,` and `R20,000 m` are my regex eating a comma and the word "mark-up"
- reasons of the form "Glossary defines X; checklist requires Y" scope each clause to one document, and each clause is true of the document it names

Two were real reads worth recording:

- **All three "30-day" reasons check out.** `running-a-pty-ltd-…` "30-business-day window" matches `06-running-a-pty-ltd.md:50` ("within 30 **business** days of their registration anniversary") and `:237`. `entry govchain-company-annual-returns` → `lookup/checklist` "within 30 business days" matches `02-master-checklist.md:102` and `:187`. The two left as calendar days are correct: `consumer-law-and-online-selling` "s46 30-day rule" matches `04-what-you-need-to-sell-things.md:137` ("under section 46, you must execute the order within 30 days"), and `nada-saps-dealer-inspections` "within 30 days of any change" matches `08-adding-new-lines.md:30`. The Q5 fix is right and the two refusals are right.
- One loose universal, recorded as nit T2 below.

I also read the whole `running-a-pty-ltd-annual-returns-financial-statements-directors` reason clause by clause — "R100-R3,000 fees" (`:54`), "BO hard stop" (`:70`), "PIS audit/review rules" (`:76`), "FAS" (`:102`), "CoR 40.5" (`:144`), "deregistration" (`:70`) — every clause is true of the page.

### Batch E — does anything in `src/data/en/**` assert what its sources do not support?

My own script over all 36 generated documents:

- Every document with zero sources carries a `sourceNote`: `branding/marketing-prompts`, `lookup/sources`, and the four `start` pages. No page renders an empty sources section. D5 satisfied.
- Zero dangling ids: every id in a document's `sources.entries` and `sources.acts` exists in `sources.json`.
- No `sourceNote.see` entry points at its own document.
- All 36 documents are `ai-checked`; **none** claims `human-verified` and none carries a `reviewedBy`. No page borrows a reviewer's authority.
- No document has `verification.checkedOn` after today, and none is checked before it was generated.
- `assertSafeOutDir` (`write.ts:62`) still refuses any non-empty `--out` folder without a version-1 `manifest.json`, and deletions are confined to `managedFiles` under the managed prefixes. I exercised it by building into two fresh scratch folders.

## Findings

### minor: the coverage floors this round added are executed by no automated gate (T1)

File: `vitest.config.ts:42-47`; `package.json` `"test"`; `.github/workflows/ci.yml:35`; `lefthook.yml` `pre-push`
Acceptance item: C5, `test` = "vitest unit+dom, coverage ≥90% on `src/lib/**` and `scripts/**`"

What is wrong: the four threshold groups are correct and live (batch C proves it), but nothing runs them automatically. `pnpm test` is `vitest run --project unit --project dom --passWithNoTests` with no `--coverage`; `gate:fast` calls `pnpm test`; the CI `quality` job calls `pnpm test`; the lefthook `pre-push` job calls `pnpm typecheck && pnpm test`. I grepped the whole repository: `coverage` appears only as the `@vitest/coverage-v8` dependency in `package.json:58` and in `docs/build-plan.md`. A regression from 97.48% to, say, 60% on `scripts/content/**` would turn nothing red.

This matters more after this round than before it, because two review rounds (pass-3 m1, pass-4 Q2) were spent tuning these numbers, and the new `backlog.md` Q2 row justifies the 0-floors partly on the strength of what the gate does run. The row does not say that the floors themselves are never run by the gate.

Why minor and not major: the gap is pre-existing on `main` at the merge base, not introduced by this diff; it is already known and written down — `WP-10-pass3.md:196` says "`gate:fast` does not run coverage, so the gate stays green, but a CI coverage step added in WP-51 would go red at once" — and build plan D3 assigns CI finalisation to WP-51. The thresholds are honest measurements that do their job the moment coverage is run. Nothing wrong reaches a reader.

How to reproduce: `pnpm test` completes in 85 s and prints no coverage table; `grep -rn coverage .github/ package.json lefthook.yml` returns only the dependency line.

Suggested fix: one clause in the `backlog.md` Q2 row saying the floors are not yet executed by any gate and that WP-51 owns wiring a `--coverage` step into CI. Adding `--coverage` to `pnpm test` would also work but is a shared-file change that belongs to WP-51.

### nit: one mapping reason states "Each" of a claim one of its seven documents does not make (T2)

File: `content-meta/source-map.json`, entry rule `sars--what-is-the-new-threshold-for-vat-registration`
Acceptance item: general quality; the pass-3 defect class (a reason that is not true of the page)

The reason reads "Each states compulsory VAT registration applies only over R2.3 million turnover; start-here says an R1 million figure is out of date". Six of the seven mapped documents do state the R2.3 million threshold (`core/register:188`, `core/tax-and-sars:26`, `which-template-to-use-when:122`, `templates/invoice:3`, `pick-your-business-type:46`, `vehicle-dealer:286`). The seventh, `core/start-here`, does not: `01-core-start-here.md` contains no "R2.3" anywhere. Its only relevant sentence is `:94`, "If a website tells you the VAT threshold is R1 million, that site is out of date" — which is exactly what the reason's second clause says, so the mapping itself is correct and this entry is a proper source for that claim.

So this is wording, not a wrong mapping: the second clause names the exception, but "Each" is written as a universal and is not one. This is the lowest-value end of the pass-3 defect class, and it is the only instance I found in 115 reasons.

Suggested fix: "Six state compulsory VAT registration applies only over R2.3 million turnover; `core/start-here` says an R1 million figure is out of date."

### Considered and rejected

- **`isFrontPage` and a root URL carrying a query.** `normaliseSourceUrl` keeps the query, so `https://x.co.za/?utm_source=y` would not be treated as a front page and would count as evidence. I was going to raise it, then checked the real register: the only such URL is `https://www.cipc.co.za/?page_id=11891`, where the query genuinely identifies a page, not the site root. Treating it as evidence is correct. Raising this would have been a manufactured finding.
- **`registerCheckedOn` / `generated.date` fallback chain.** See Q4 below — the author is right, and I verified it rather than taking the reply.

## Pass-4 verification

| Pass-4 item | Claimed fix | My verdict and evidence |
|---|---|---|
| **minor Q1** — `kind: 'sources'` is a wider escape hatch than the comment claims; a second one is swallowed silently | Closed in two halves: `DocsMetaSchema.superRefine` refuses more than one `kind: "sources"` entry (`config.ts:144-155`); `mapDocSources` excepts the register **by id**, passed from `build.ts:513` | **Resolved.** Both halves verified independently, end to end. Probe T-A1 shows the schema refusal, naming both documents. Probe T-A2 — the new variant the brief asked for, with the impostor **first in file order**, noted, exempt and with its mappings stripped — fails the build with 154 issues: taking the label means being parsed as the register, and `buildSourcesFile` immediately reports `sources-checked-on`, `sources-block` and `sources-acts`, while the demoted real register picks up `doc-without-sources`. Probes T-A3 and T-A4 (post-resolution id change; Afrikaans-only `kind`) are not reachable by construction, for the reasons given in batch A. The comment at `provenance.ts:62-66` now describes what the code does |
| **minor Q2** — coverage floors only on `scripts/content/**`; three owned files unfloored; function threshold slack | Floors added for `src/lib/content/**` (85/72/100/85); `scripts/content/**` raised to 97/85/98/97; the two CLI entry modules floored at **0** and recorded in `backlog.md`. **The author disagreed with pass 4's rationale** | **Resolved, and the author's disagreement is correct.** Pass 4 wrote that `build-content.ts` `main()` "takes an argv array and a `repoRoot`, so it is testable". That is factually wrong about the code: `scripts/build-content.ts:31` is `function main(): number` — not exported, no parameters — it reads `process.argv.slice(2)` at `:32`, and `:105` runs `process.exitCode = main()` at module top level, so importing the module runs a full build against the real corpus. `scripts/translate/status.ts` is the same shape (`:52`, `:53`, `:76`). A unit test cannot reach either `main()` without that side effect. The 0 floor is therefore an honest measurement and not a quiet exclusion: both files stay inside `coverage.include`, both appear in the report at 0% with their uncovered line ranges, and `backlog.md` states the restructure needed (export `main(argv, repoRoot)`, move the runner to a separate entry file) and when to do it. All four threshold groups are live — I proved it myself in batch C, 16 ERROR lines, exit 1, four per group. Floors now sit just under the measurement (97.48 vs 97, 88.11 vs 85, 99.49 vs 98, 98.43 vs 97), which closes pass 4's slack complaint. My residual T1 is about *running* the floors, not about their values |
| **minor Q3** — the m2-residue backlog row misdescribes a content decision as a pipeline constraint, and a second page in the same class is unrecorded | Row rewritten; `start/start-here` added with three rand figures quoted; two deferred rows added | **Resolved, and the quotes are accurate.** I checked every quoted string against the markdown byte for byte. `backlog.md` quotes `start/start-here:97-99` as "R2.3 million, not R1 million, from 1 April 2026", "R120,000, not R50,000", and "R2.3 million threshold, with 0% on the first R600,000" — `00-start-here.md:97`, `:98`, `:99` read exactly that, and those three bullets link nothing. The row's other quote, `start/how-this-was-made:127`, matches `02-how-this-was-made.md:127` ("paragraph 11C of the Fourth Schedule to the Income Tax Act, was repealed with effect from 1 March 2017"). The row now names the decision ("whether a `start` orientation page carries its own source list or points at the pages that carry one") rather than the mechanism, and states correctly that removing the note and mapping the entries builds cleanly. No over-claim |
| **nit Q4** — two unreachable fallbacks in `provenance.ts` | One deleted; the second **declined** | **Correctly handled; the author is right on the refusal.** The `if (review.checkedOn !== undefined && …)` guard is gone: `provenance.ts:317-318` now reads `if (review.checkedOn > today)` with a comment saying both review kinds require `checkedOn`. The declined branch is `verificationFor` at `provenance.ts:300`, `override?.checkedOn ?? registerCheckedOn ?? config.provenance.generated.date`. I read the call path rather than the reply: `build.ts:520` passes `enSources?.checkedOn`, and `enSources` is `undefined` both when no document has `kind: 'sources'` (`build.ts:496-506`) and when `buildSourcesFile` returns `undefined` because the register has no check date. Because `issues.throwIfAny()` sits at `build.ts:479` and again at `:537`, `verificationFor` genuinely executes in between with `registerCheckedOn === undefined`. It is also exercised directly: `provenance.test.ts:414` asserts `verificationFor('core/vehicles', config, undefined).checkedOn` is `'2026-09-13'`, which is `config.provenance.generated.date`; delete the last term of the chain and that assertion fails. Not dead code. Declining was right |
| **nit Q5** — one mapping reason says "30-day" where the page says "30 business days" | Reason changed to "30-business-day"; two others left as calendar days | **Resolved and verified at source.** I spot-checked all three, plus the two I found beyond the ones named. "30-business-day window" ↔ `06-running-a-pty-ltd.md:50`, `:237`. `entry govchain-company-annual-returns` ↔ `02-master-checklist.md:102`, `:187` (also "business days"). Calendar-day reasons correctly left: `consumer-law-and-online-selling` "s46 30-day rule" ↔ `04-what-you-need-to-sell-things.md:137`; `nada-saps-dealer-inspections` "within 30 days of any change" ↔ `08-adding-new-lines.md:30`; `second-hand-goods-dealing` "30-day notice" is the same SAPS obligation. No remaining imprecision of this kind |
| **nit Q6** — the register's check date predates content it covers | Moved to `backlog.md` rather than fixed | **Resolved as a deferral, and the quote is accurate.** `backlog.md` quotes `start-here:11` as telling readers every figure "was checked against official South African sources on 13 September 2026"; `00-start-here.md:11` reads exactly that. The row correctly notes that the pipeline already refuses the unsafe direction — a page checked before it was generated fails the build, which I confirmed is enforced by `checkVerificationDates` (`provenance.ts:355-366`) and `DocSchema.superRefine`. Assigning the content repair to WP-47 is the right call under ADR-0006 decision 1 |
| **nit Q7** — the limits of the evidence test are not written where the guard is | Doc comment names three blind spots; a test pins P2/P3b/P7 plus a control | **Resolved, and the comment is accurate rather than aspirational.** `provenance.ts:80-84` names exactly three: a claim resting on a register entry the page does not link, a link differing by query string, and a link to an entry whose URL is a site front page. I verified each against the code — `found` is built only from `doc.externalLinks` (`:132-139`), `normaliseSourceUrl` keeps `url.search` (`:44`), and `isFrontPage` (`:50`) excludes keys with no `/` and no `?` — and then against behaviour in batch B, where the query-string variant passes and everything else is caught. `provenance.test.ts:317-348` pins all three plus a control that must still be caught, so the limits cannot silently widen |

No regressions from the pass-4 fix round. The three tests added in this round all fail if the corresponding guard is removed, which I checked by construction rather than assumption.

## Lenses

- **Correctness.** Output is deterministic across two independent builds and byte-identical to the committed `src/data`. The register exception is now identity-based and the identity is resolved once in the same expression that consumes it. `assertSafeOutDir` still refuses a foreign `--out` folder, and `writeOutputs` deletes only within managed prefixes. `stableStringify` sorts keys with `byCodeUnit`, so output does not depend on host collation. Finding: T1.
- **Accuracy and over-claim.** The lens I weighted most. I machine-checked all 115 mapping reasons against the markdown and read all 26 flags; one loose universal (T2) is the only imprecision. Every generated document with no sources carries a note, no id dangles, no page claims a human reviewer, and the `backlog.md` quotes added this round are exact. The forbidden-stale-string guard (`validate.test.ts:329-400`) correctly distinguishes "the VAT threshold is R1 million" from "not R1 million" and is tested in both directions.
- **Accessibility.** Not applicable; this package emits data only. `doc.sources`, `doc.sourceNote`, `doc.generated` and `doc.verification` are present and schema-validated on all 36 documents, which is what D5's page-level requirements render from.
- **Internationalisation.** Heading ids stay English slugs. `kind` is language-independent, which is why the Afrikaans-only register variant is unreachable. No Afrikaans tree exists in the worktree, so the fidelity path could not be exercised beyond its fixtures; that is the brief's scope, not a gap in the work.
- **Performance.** Full content build about 25 s on a loaded machine; unit + dom 85 s at `--maxWorkers=1`. No new dependencies, no network access at build or runtime.
- **Security.** No `innerHTML`, no third-party runtime requests, no secrets. `build-content.ts:86` shells out to `git status` with `execFileSync` and an argument array, so there is no shell interpolation.

## Recommendation

**Merge.** This is the second consecutive clean pass over the whole diff, from a reviewer who did none of the earlier ones, and the round between the two clean passes contains only minor/nit fixes and two correctly-reasoned refusals. Minor T1 and nit T2 may be fixed without restarting the count, or moved to `docs/reviews/backlog.md`; I would move T1 to the backlog against WP-51, which already owns CI finalisation, and fix T2 in place since it is a one-line wording change in a file this package owns.
