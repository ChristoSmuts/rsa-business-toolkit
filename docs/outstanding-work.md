# Outstanding work

**Status on 5 October 2026 (work paused by the owner). `main` carries WP-20 (the site), WP-40 (the Afrikaans translation of all 36 documents, with the code changes integrating it needed) and WP-30 (the store: saved ticks, copy buttons, the contents tracking, settings, shortcuts and the language banner). WP-31, WP-32 and WP-33 are built but not through review; their work lives only on branches in the cloud session that built them.**

Read `docs/build-plan.md` first for the design, then this file for where the work stopped. `docs/reviews/merge-checklist.md` holds the tasks that must happen at merge time.

## Where to pick up (5 October 2026)

### Merged

| Package | Reviews |
| --- | --- |
| WP-20, the site | `WP-20-m1-pass1.md`, `WP-20-pass2.md` to `pass9.md`; passes 8 and 9 clean |
| WP-40, the Afrikaans translation | seven batches, each with two consecutive clean af-reviews (`WP-40-batch<N>-pass<n>.md`) |
| WP-40 integration (code, tests, metadata) | `WP-40-integration-pass1.md` to `pass4.md`; passes 3 and 4 clean |
| WP-30, the store | `WP-30-pass1.md` to `pass3.md`; passes 2 and 3 clean, pass 3's minors fixed |

Gate on the merged tree (`61bb68c`): `pnpm gate:fast` green (1124 unit and dom tests, 37 content tests, no drift); `pnpm build` green (`dist:audit`, `dist:trust` on 72 document pages and 47 Afrikaans pages); Playwright chromium, mobile and nojs 559 passed, 0 failed; `pnpm test:a11y` 198 passed. WebKit was not run (not installed in the cloud container).

What WP-40 changed besides the Afrikaans markdown: the sources register has its own language on a page (`sourcesLang`), and text the Afrikaans register keeps in English is marked `lang="en-ZA"` (`keptInEnglish`); docrefs and the contents block mark English titles in Afrikaans text; every document has an Afrikaans navigation title; `dist:trust` excuses only names, case by case, with tests on both sides. Items for the owner: `docs/reviews/WP-40-owner-items.md`.

What WP-30 added: the device store (`src/lib/store.ts`, `src/lib/storage/`), saved checklist ticks shared between a document and `/checklist/` for 45 linked tasks (`content-meta/task-links.json`), ticks carried across reworded tasks (`task-renames.json`, `released-task-keys.json`; see `content-meta/README.md`), copy buttons on prompts, the "Now reading" contents tracking, settings and keyboard shortcuts on `/about/`, clear-my-data, and the language banner.

### Built, not through review (not on the remote)

These branches exist only in the cloud session that built them. If that session is gone, they have to be rebuilt from their briefs.

- **WP-33, search** (`worktree-agent-a0761a64fd64c33f9`, tip `46a291a`). Five review passes, each with majors, mostly in how queries are read; the author now follows one documented table of query kinds. Pass 6 was stopped when the owner paused the work. Next: review pass 6, then merge (rewire its settings to WP-30's store at merge; backlog rows say how).
- **WP-31, Find my path and My path** (`worktree-agent-a0193f6dbc3887574`, tip `c8bd782`). Built with all gates green, 98 pre-rendered result pages. Review pass 1 was stopped. Its heaviest document page uses 24.1 KB of the 25 KB script budget.
- **WP-32, fillable templates** (`worktree-agent-a253e59a4d4c5ad19`). Review pass 1 found 1 blocker (a huge amount breaks the page for good) and 5 majors about what prints; the author was part-way through the fixes when the work paused, with uncommitted changes in that worktree.

### Not started

- **P4a, the accuracy review against official sources**: the cloud environment cannot reach SARS, CIPC, gov.za, SAFLII or the Information Regulator.
- **WebKit**: run the WebKit project locally (merge checklist).

### Decided on 2 October 2026

- **Licence:** MIT for the code (`LICENSE`), and the guide's text dedicated to the public domain under CC0 1.0 (`docs/rsa-business-toolkit/LICENSE.md`).
- **Hosting:** GitHub Pages, set up by the owner. `.github/workflows/deploy.yml` is ready; set the Pages source to GitHub Actions. `BASE_PATH` and `SITE_URL` default to the Pages values when the repository variables are unset.

## What is merged (the three foundation packages, 17–20 September)

| Package | Commit | Reviews |
|---|---|---|
| Content pipeline (WP-10) | `22e14b0` | passes 4 and 5 clean, two different reviewers |
| Design system (WP-11) | `337ae26` | passes 5 and 6 clean, two different reviewers |
| Test harness (WP-22a) | `fd8bbe7` | passes 5 and 6 clean, two different reviewers |
| WebKit contrast fix | `da6dcb0` | one review pass, clean; its three latent findings then closed |

`main` after the final merge: 808 unit and dom tests, 32 content tests, no content drift, `dist:audit` clean, and Playwright green on chromium, webkit (twice), mobile, nojs and a11y.

### The one bug the foundation found in itself

Merging the harness and the design system into one tree exposed a real, user-visible bug that neither package's own reviews could see: on WebKit the live contrast panel could measure every token as the same colour, publish "76 of 76 pairs fail", and never recover, so a Safari visitor whose stylesheet landed late saw the design system permanently accusing itself. It is fixed in `da6dcb0` — the panel now gates on the element it measures and withdraws any reading it cannot substantiate. `docs/reviews/fix-ds-contrast-webkit-pass1.md` has the detail.

### Known limits carried forward

- `pnpm test:visual` exits 1 with "No tests found": there is no `tests/e2e/visual.spec.ts` and no `__screenshots__` baselines. Both arrive with the package that adds pages; `test:visual` is not part of `pnpm gate`, and CI already conditions its `visual` job on the baselines existing.
- `tests/e2e/helpers/exceptions.ts` declares the routes in `KNOWN_FUTURE_ROUTES` that `/design-system/` and `/design-system/content/` link to and no page package has built yet. Since WP-20 milestone 1 the list is derived from `src/data/manifest.json` rather than typed out: `af/` plus every section, document and tool route of build plan B1 in both languages. Each fails the audit once its route exists, so **WP-20 milestone 2 removes the generated block in the same change that builds the routes**. The `lookup/sources/` entry is gone: the register's route is `sources/`, and the design-system link that pointed at the document id was wrong.
- `docs/reviews/backlog.md` holds every deferred minor, with the reason each can wait.

**The sections below this point describe the state on 16 September and are kept as history.** They are superseded for the three foundation packages, and remain accurate for the unmerged localisation follow-up and Afrikaans glossary branches.

## How the work is organised

Five work packages were built in parallel, each in its own git worktree, each reviewed by independent agents. A package merges into `main` only after **two consecutive clean review passes** (zero blocker, zero major). The review protocol is `docs/reviews/README.md`; every review report so far is committed in `docs/reviews/`.

## What is merged

| Package | Commit | What it gives you |
|---|---|---|
| Scaffold and tooling | `51e9c01` | Astro 7 static site, base path from `BASE_PATH`, English and Afrikaans routing, ESLint, Prettier, Stylelint, Vitest, Playwright, lefthook, commitlint |
| CI and workflows | `a733cd0` | Checks, Pages deploy, visual baseline workflows, and local gate scripts for Git Bash and PowerShell |
| Localisation (WP-12) | `33bf2a8` | UI text in English and Afrikaans, locale metadata for all 11 official languages, typed text lookup, date and rand formatting, locale routing helpers |
| Content corrections | `34175e9`, `745e387` | FSP definition, Businesses Act name, sole-proprietor registration line, step numbering, in both the individual documents and the combined edition |
| Accuracy decisions | `bfda0d6`, `eb084d1`, `a1fd925`, `d0301a3` | Build plan D5 and P4a, ADR 0006, the document page spec, and the revised AI notice wording |

## Branches that are not merged

Each has real work in it. Nothing here is throwaway.

| Branch | Tip | Worktree | State |
|---|---|---|---|
| ~~`worktree-agent-a57043a283a0c3c96`~~ | `78d3437` | `.claude/worktrees/agent-a57043a283a0c3c96` | Content pipeline (WP-10). **Merged as `22e14b0`.** The worktree can be removed. |
| ~~`worktree-agent-a2273231b664d89f3`~~ | `a1cfb09` | `.claude/worktrees/agent-a2273231b664d89f3` | Design system (WP-11). **Merged as `337ae26`.** The worktree can be removed. |
| ~~`worktree-agent-adc6b347a89c34014`~~ | `67cd18d` | `.claude/worktrees/agent-adc6b347a89c34014` | Test harness (WP-22a). **Merged as `fd8bbe7`.** The worktree can be removed. |
| ~~`fix/ds-contrast-webkit`~~ | `5a61bb7` | `C:\_Projects\Local\bt-wt\ds-contrast` | The WebKit contrast fix. **Merged as `da6dcb0`.** The worktree can be removed. |
| `wp/wp12b-i18n-followup` | `ed18d52` | `C:\_Projects\Local\bt-wt\wp12b` | Localisation follow-up (WP-12b). Three review passes done, fix round 4 not started. **4 uncommitted files**: a commit was in flight when it was stopped, so check whether those changes were meant for it. |
| `content/af-glossary` | `864f2f7` | `C:\_Projects\Local\bt-wt\af-glossary` | Afrikaans glossary translation, 121 entries. **Clean.** Needs rebasing onto the fixed pipeline. |

**Before resuming any branch**, run `git -C <worktree> status --short` and decide what to keep. Two agents were stopped mid-edit.

## Package by package

### WP-10, content pipeline

Converts the 36 markdown documents into typed JSON, and produces the per-page source lists and AI-disclosure data.

Done: all 36 documents parse with zero unresolved links, references or unclassified code blocks; 439 unit tests and 32 content tests pass; builds are deterministic; an independent round-trip check found no lost text; the Afrikaans fidelity check works, with the reviewer's translations as fixtures; the translation style guide is written.

Outstanding, from `docs/reviews/WP-10-pass2.md`:
- **Major.** `human-verified` can be recorded without a real reviewer name or its own date, and impossible dates pass. A page could credit a named expert with a date nobody gave. Fix in `scripts/content/config.ts`, `provenance.ts` and `src/lib/content/schema.ts`.
- **Major.** The fidelity check ignores ordinals, so an Afrikaans payroll deadline could drift from "7de" to "8ste" unnoticed. The corpus has 8 such deadlines. Fix in `scripts/content/facts.ts`.
- **Minor.** Six pages cite an Act by section without listing it as a source: POPIA on the privacy notice, Companies Act s32 on two documents, ECTA, and the VAT Act.
- **Minor.** 18 of 105 source entries have no "what this supports" text.
- The remaining minors and nits are listed in the review.

The agent was stopped while deciding how to map two test fixtures to sources. Its own conclusion was the right one: add truthful entry and act mappings for the fixtures rather than weaken the rule.

### WP-11, design system ("Stoep")

Tokens, layout, components, illustrations and the live reference page.

Done and verified in the tree: colour tokens with contrast tests, the badge wrapping fix, icons inline in prose, stronger section tints at no contrast cost, the AI notice and sources demos, restored CSS inlining, and a stylesheet naming regression the agent caught in its own work. Lint, types, 183 unit tests and the build all pass. Built pages have no inline scripts and the security policy matches the plan exactly.

Outstanding:
- The three browser projects, the screenshots and the commit were never run. The work is uncommitted in the worktree.
- After that, two consecutive clean passes are still required, because pass 3 was not clean.

### WP-22a, site-wide test harness

Accessibility scans, security policy and third-party request checks, JavaScript-disabled checks, the post-build link audit and Lighthouse budgets.

Done: lint, types, 95 unit tests, build and workflow validation pass; the Chromium, no-JavaScript and mobile projects pass; guards are on by default with a runtime guarantee; the expected security policy is unit-tested against ADR 0005; a reporter bug the agent found in its own work is fixed in `e4c122d`.

Outstanding:
- The WebKit project failed on stray browser processes and needs a re-run.
- The accessibility suite was invoked incorrectly and needs a re-run.
- Ten probe scenarios were voided by a Git Bash path-conversion quirk and must be re-run with slash-free patterns.
- Then two consecutive clean passes.
- Local Lighthouse was deliberately skipped: it cannot finish inside the command time limit on this machine. CI on Ubuntu is the gate.
- Known quirk to document: when a run matches no tests, the guard safeguard fires before the reporter registers, so an empty selection surfaces as a guard error rather than "no tests found".

### WP-12b, localisation follow-up

The wording readers see about who wrote the content and who checked it, plus leftover review fixes.

Done: 25 trust strings in both languages, covering the AI notice, verification status, the sources section, dated fact labels, a "not confirmed" flag and the checklist and template reminders; every string that mentions checking now names who checked; the Afrikaans says the English text was checked, so it does not contradict the machine-translation notice; the whole-project TypeScript check is in the fast gate; 145 tests pass with 100% line coverage on the shared library.

Outstanding, from `docs/reviews/WP-12b-pass3.md`:
- **Major.** `docs/i18n.md` claims every Afrikaans status string says "Engelse teks". That is false for the two short labels, contradicts its own table and misdescribes the test.
- **Minor.** Two Afrikaans regressions to revert to attested usage: "Webwerfvoetstuk" should be `voetreël` or `voetskrif`; "Kies almal wat pas" should use `alles`.
- **Minor.** Six keys say the page was checked "against official sources". About two thirds of the register is not official, so this overclaims. Exact replacements are in the review.
- The reviewer could not run its correctness probes because the machine stalled. Those probes must run before any pass counts as clean.

### Afrikaans content translation

Only the glossary is translated, on `content/af-glossary`. The other 35 documents, about 67,000 words, have not been started.

Before starting them:
1. Merge the fixed content pipeline, then rebase the glossary branch onto it.
2. Drop the glossary branch's `scripts/translate/TERMS-af.json` changes in favour of the pipeline branch's version.
3. Apply the glossary review findings in `docs/reviews/WP-40-glossary-pass1.md`, including the corrections the English fixes require, since the source text changed after the translation.
4. Then translate in batches, each document looping the fidelity check until clean.

## Not started

- **Pages and components (P2).** No real pages exist yet; the site still has a placeholder home page and the design-system reference page.
- **Interactive features (P3).** The wizard, persistent checklists, fillable templates and search.
- **Accuracy review (P4a).** Defined in the build plan. Every fact checked against an official source, with the URL, the supporting quote and the date recorded. This is the phase that turns "AI-checked" into something a reader can rely on, and it has not begun.
- **Human expert review.** Recommended before public launch for the core tax, company and vehicle-dealer documents. No page may be marked `human-verified` without a named reviewer and a date.
- **GitHub remote.** Not created. The deploy workflow is written and needs repository variables `BASE_PATH` and `SITE_URL`, with the Pages source set to GitHub Actions.
- **Licence.** Decided on 2 October 2026: MIT for code, CC0 1.0 for the guide's text (see the top of this file).

## Suggested order when picking this up

1. Clean up: check each worktree's uncommitted files, and kill any stray `node` or browser processes left by the interrupted runs.
2. Finish WP-10's two majors, get two clean passes, merge. This unblocks the most.
3. Finish WP-11's browser runs and commit, then two clean passes, merge.
4. Finish WP-22a's re-runs, then two clean passes, merge.
5. Finish WP-12b's fix round, then two clean passes, merge.
6. Work through `docs/reviews/merge-checklist.md` at each merge, especially the combined `gate:fast` line, which three branches edit.
7. Then the glossary rebase and the remaining 35 translations, the page and interactive packages, and the accuracy review.

## Machine notes that cost time

- Long commands exceed the ten-minute limit when the machine is loaded, and agents that waited on background jobs repeatedly stalled. Keep commands small, and read log files directly rather than waiting on monitors.
- Process inspection commands hang on this machine. Confirm a port is free by whether the next server binds.
- Automatic agent worktrees were refused under load. Create worktrees by hand under `C:\_Projects\Local\bt-wt\` and point agents at them.
- Playwright needs the browser builds that match its version; 1.63 needed newer Chromium and WebKit than were installed.
- TypeScript is pinned to 5.9 because the lint and type-check tools do not support TypeScript 7 yet.
