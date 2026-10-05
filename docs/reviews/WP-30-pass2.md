# WP-30 review pass 2 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and it is not the reviewer of pass 1. This package touches `src/lib`, so the protocol needs a different instance.
- **Date:** 5 October 2026
- **Commit reviewed:** `626a484` ("fix(components): resolve the WP-30 review pass 1 minors and nits"), the tip of `worktree-agent-acb967a2bda1e55df`. I reset a clean worktree to it.
- **Scope:** `git diff 2744d07 626a484`, the whole package again: 79 files, +5874 / -132. I gave extra time to the pass 1 fixes: `a652fd7` (task links), `9282f4f` (shared ticks), `a76ff88` (dependency removed) and `626a484` (minors and nits).

## Verdict

**Clean: 0 blocker, 0 major, 2 minor, 4 nit.**

The pass 1 major is fixed. Tasks are linked through a reviewed data file. The pipeline rejects bad links and the content tests check them again. The checkbox key is `sameAs ?? id`, and the comments, docs and e2e tests now say what the code does. Every gate is green.

The two minors are about the link data, not the code:
- four document tasks that say the same thing as a master task are still unlinked;
- there is no way yet to keep a saved tick when a link is added or a task is reworded after release.

Nothing is lost today, because no released build has saved a tick.

## Gate results

I ran all of these myself on `626a484`.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 30.1s").
- `pnpm gate:fast`: exit 0.
  - ESLint, Prettier ("All matched files use Prettier code style!"), stylelint: clean.
  - `astro check`: "Result (209 files): 0 errors, 0 warnings, 0 hints".
  - vitest unit + dom: "Test Files 42 passed (42)", "Tests 1095 passed (1095)".
  - Content drift: "Wrote 0 changed files, removed 0, 81 files in total. Content drift: none."
  - vitest content: "Tests 35 passed (35)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14024 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4571`, 2 workers): "Running 634 tests", **547 passed, 87 skipped, 0 failed** (8.7 min). The skips are the desktop-only and clipboard-only tests on `mobile`, as in pass 1.
- `pnpm test:a11y`: **198 passed** (9.3 min). This includes the 6 "interactive states" runs: both dialogs, the banner and the storage warning, each in light and dark.
- Coverage, `pnpm exec vitest run --project unit --project dom --coverage`:
  - `src/lib/store.ts`: 100 statements / 97.5 branches / 100 functions / 100 lines. Line 162 is the `typeof window` guard.
  - `src/lib/storage/adapter.ts` and `migrate.ts`: 100 / 100 / 100 / 100 each (from the json-summary reporter; the text report leaves out fully covered files).
  - The run exits 1 on the older `src/lib/content/**` functions floor (89.04% against 100%). This predates WP-30 and is in `backlog.md`.
- **WebKit was not run.** It is not available in this environment. It stays on `merge-checklist.md`.

## My own checks

- **JS budget.** I added up every `<script src>` on the built page and the chunks they import, each gzipped at level 9:

  | Page | Files | Raw | Gzipped |
  | --- | --- | --- | --- |
  | `core/running-a-pty-ltd/` and `business-types/services-trades/` | 15 | 34.8 KB | 14.3 KB |
  | `checklist/` and `af/checklist/` | 18 | 35.7 KB | 14.9 KB |
  | `branding/branding-prompts/` | 14 | 34.3 KB | 14.1 KB |
  | `about/` | 12 | 30.6 KB | 12.5 KB |
  | Home | 11 | 29.9 KB | 12.1 KB |

  All are well under 25 KB.
- **CSP.** None of those pages has an inline `<script>` with a body or an `on*=` attribute. There is no `innerHTML`, `outerHTML` or `insertAdjacentHTML` anywhere in `src/`. `theme-init.js` is still an external file, so the new `st.lang` read needs no CSP change.
- **CLAUDE.md rules over the changed files.** `localStorage` appears only in `src/lib/store.ts`, `src/lib/storage/` and the documented `theme-init.js` exception. There are no colour literals and no `href="/…"` literals. Both dictionaries gained the same 3 keys (`nav.currentSectionLabel`, `about.settings.shortcutsHelpStatic`, `about.settings.lowDataHelpStatic`).
- **Link validation, by mutation.** I did not edit the repository for this. A scratch script called `buildContent` with `configPaths.taskLinks` pointed at mutated copies of `task-links.json`:
  - an unknown source: rejected, `task-link-unknown`;
  - an unknown target: rejected, `task-link-unknown`;
  - a second document task linked to an already-linked master task: rejected, `task-link-twice`;
  - a document-to-document link: rejected, `task-link-target`;
  - a chain: rejected, `task-link-chain` and `task-link-target`;
  - a source whose doc id is malformed: rejected by the Zod schema;
  - a target whose doc prefix is a well-formed but non-existent doc (`lookup/checklst:…`): **accepted** silently by the build. `tests/content/validate.test.ts` would catch it as "unknown task" in `content:check`. See nit 1.
- **Afrikaans after merge.** The Afrikaans translation lives on `claude/lucid-bell-t5acdn`. Its `src/data/en/tasks.json` has the same 213 task ids as this branch. All 41 link sources and 41 targets exist in its Afrikaans `tasks.json`.
  - That branch does not touch `scripts/content/**` or `src/lib/content/schema.ts`, so the `copyFromSource` change merges cleanly.
  - I built this branch's pipeline against that branch's Afrikaans markdown (`--source-root af=… --out <scratch>`): "af: 36 docs built, 0 skipped, 0 English fallbacks".
  - The Afrikaans `tasks.json` then carries all 41 `sameAs` values with 0 mismatches against `task-links.json`. So do the Afrikaans documents (41 items, 0 mismatches). For example, "Kry versekering vir openbare aanspreeklikheid" → `lookup/checklist:aa9275cd`.
  - A merge that kept that branch's generated `src/data/af/**` without rebuilding would lack `sameAs`. `content:drift` and the new `validate.test.ts` check (which compares every language with the file) would both fail, so the gap fails closed. The merge must rerun `pnpm content:build`, as every merge that touches content already does.
- **Ticks saved under an old id.** Before `9282f4f`, a linked document task saved its tick under its own id. That would orphan such ticks. But `CHECKLIST_SAVES` is `false` on `2744d07`, on `origin/main` and on `claude/lucid-bell-t5acdn`, so no released or merged build has ever saved a tick. Nothing needs migrating now. The future case is minor 2.
- **Language banner (probes on the built site, Chromium, my own static server, every module script delayed 1.5 s, `theme-init.js` not delayed):**
  - `st.lang=af`: `data-st-lang-offer="af"` and the banner is displayed before any module runs. CLS is **0**. The pass 1 minor 3 is fixed.
  - `st.lang=en` or nothing saved: no attribute, no banner, CLS 0.
  - `st.lang=fr` (not an enabled locale): the banner shows at first paint. The store then rejects the value, removes the key and the attribute, and the banner goes. CLS is **0.063**. See nit 2.
  - Storage blocked (the `localStorage` getter throws): no attribute, no banner, no page errors.
  - Close: the banner hides even though the root attribute stays (`[hidden] { display: none !important }` in `base.css` wins). Focus goes to `<main>`.
  - `/af/` with `st.lang=en`: the attribute is set, but no banner is rendered there, so it has no effect.
  - Two languages: exact. With a third, every banner would show until the module runs, as the component comment says.
- **Unlinked near-twins (probe).** I ticked the document task, then opened `/checklist/`:
  - "Get public liability insurance" (linked): ticked.
  - "Claim and complete your Google Business Profile": not ticked.
  - "Register your POPIA information officer, …": not ticked.
  - "Register as a provisional taxpayer and diarise the IRP6 dates": not ticked.

  See minor 1.

## The task links

### The 41 links

I read all 41 pairs in `src/data/en/tasks.json`, with the headings and `when` of both sides, and the markdown around several of them.

**These 33 are the same action under the same condition:**
- 6 pty pairs with identical or near-identical text (the CIPC return, the AFS, the Public Interest Score, the FAS, the ITR14 and the IRP6 returns);
- EMP201: "Every month, if the company pays you or anyone else a salary" against "Every month, if the company pays anyone a salary including me";
- the stock-photo location pair;
- vehicle dealer: BRNC and SAPS 601;
- 6 food pairs (all but `food:7ee08e59`);
- all 6 beauty pairs;
- retail: ECTA s43, order review, returns policy, stock tracking;
- services: insurance, vehicle insurer, quote template, deposit terms;
- professional: turnover tax exclusion, service agreement, home office.

**These 5 differ in wording, and I accept them:**
- `vehicle-dealer:621643ad` "Build your sale agreement and defect schedule template" → "Sale agreement with a numbered defect schedule the buyer initials". It is the same document; the master line says what it must contain.
- `vehicle-dealer:70c5bd63` "Set up your SAPS acquisition and disposal register" → "… register set up with VIN, engine, odometer, colour fields". Same.
- `professional-creative:09f007d9` "Assess whether you look like an employee of one client, and fix it if so" → "Checked I do not look like an employee of one client". The master line states the result of the same check.
- `retail-online:51431599` and `7606eb50` carry `tags` (`second-hand`, `import`). Their master twins carry no tag but say "if I deal in second-hand goods" and "if I import" in their text. It is the same condition, written differently. WP-31's "Only mine" filter should read the master side's text with this in mind. That is not a WP-30 issue.

**These 3 have a small extra word on one side, and I would keep them linked:** `pty:44c17e09` ("filed and current" against "current"), `food:7ee08e59`, `services-trades:6fa9b54e` ("Set up" against "running").

I found no link that pairs two different actions.

### The doubtful pairs left unlinked

The author's commits mention no list of doubtful pairs, and none is recorded in the backlog or the docs (nit 3). I rebuilt one by comparing every unlinked document task (81) with every unlinked master task (50).

**Should be linked (minor 1).** Each is the same action, and the document task applies to a subset of the readers the master task applies to. That is the pattern of the accepted retail links.

| Document task | Master task |
| --- | --- |
| `business-types/services-trades:92e8509e` "Claim and complete your Google Business Profile" | `lookup/checklist:22905c13` "Claimed and completed my Google Business Profile" |
| `business-types/beauty:22a2e898` "Register your POPIA information officer, since you hold client health information" | `lookup/checklist:a036463c` "Registered my Information Officer at inforegulator.org.za (free)". "Since …" is a reason, not a condition. |
| `business-types/professional-creative:66134f08` "Register as a provisional taxpayer and diarise the IRP6 dates" | `lookup/checklist:afe2d3be` "Registered as a provisional taxpayer". The same extra-clause pattern as the accepted `food:7ee08e59`. |
| `core/working-from-home-and-safety:cad4290c` "Money reflected in my balance before anything left my hands" | `lookup/checklist:057de8cb` "Money reflected in my balance, not "pending", before anything is handed over". The same habit for the same kind of sale. |

**Right to leave unlinked.** Each differs in action, scope or condition, or would break the one-per-master rule:
- `pty:295a6e78` "Loan account balance checked" against `12b6eab2` "checked **and cleared**";
- `pty:7ec2806c` "records folder updated" against `eb8bf210` "created";
- `vehicle-dealer:9d53e703` "Get motor trade insurance **quotes**" against `8dbe5551` "insurance including stock and test drives";
- `vehicle-dealer:96c81d0e` "Work out whether VAT pays … and confirm you are NOT on turnover tax" against `8ef76a00` "VAT decision made, with notional input tax modelled". This is the closest call. I would accept either choice.
- `vehicle-dealer:81105d14` "Decide sole proprietor or company" against `5d35feb9` "…, and registered if needed";
- `vehicle-dealer:e5ee625b` against `eb465a87` ("Applied for that licence … and waited for it to be issued");
- `vehicle-dealer:856d737a` "VAT264 for every purchase" (a per-sale habit) against `e441a4c4` "process in place";
- the three zoning tasks (`vehicle-dealer:85d9f1a4`, `food:c251f427`, `beauty:92352a66`) against the one `88cba814`;
- `services-trades:7aeedd49` "Confirm whether … requires registration" against `c835f118` "registration, if required";
- `services-trades:a9a8c6bf` against `f77f50f7` (the master adds a catalogue);
- `retail-online:eead27a2` "Publish your privacy notice" against `1b7c3802` "Written a privacy notice";
- `retail-online:05b6a4b6` "trader's licence" against `5dfc9c4d` "needs a licence";
- `working-from-home:bbeb1c8a` and `1a704bb5` against the single combined `53e717ac`;
- `working-from-home:b77d1f44` against the combined `1c9a465a`;
- the meeting habits against the combined `b620b7df` and `8a68f28a`;
- `adding-new-lines:57d2420f` (a new line's documents) against `d21f5efe` (once after registration).

## Findings

### minor 1: Four document tasks that repeat a master task are still not linked

File: `content-meta/task-links.json:3-45`

Acceptance item: Build 3, "a tick on one page shows on the other" (the pass 1 major, for the pairs it still misses).

What is wrong: the four pairs in the first table above are the same action as a master-checklist task, by the rule the author wrote into `TaskLinksSchema` ("both ask for the same action under the same condition"). They are not in the file. The Google Business Profile pair differs only in tense.

Why it matters: this is the pass 1 reproduction with another task. A services-and-trades reader ticks "Claim and complete your Google Business Profile" on their page, finds it unticked on `/checklist/`, and the ring under-counts. It is minor, not major, for three reasons:
- the mechanism is complete and correct;
- the docs now say honestly that an unlinked task keeps its own tick;
- the fix is four data lines.

How to reproduce: open `business-types/services-trades/`, tick "Claim and complete your Google Business Profile", then open `/checklist/`. "Claimed and completed my Google Business Profile" is unticked.

Suggested fix:
- Add the four entries and run `pnpm content:build`.
- Ship it before release, so no saved tick has to move (see minor 2).

### minor 2: A link added, or a task reworded, after release orphans the ticks already saved

File: `src/components/content/TaskListBlock.astro:84`, `scripts/content/ids.ts:49`, `src/lib/storage/migrate.ts:22-26`

Acceptance item: Correctness lens, "no silent data loss". Build 1, forward migrations.

What is wrong: this package is the first to save ticks, and the keys it saves under can change with content:
- Task ids are a hash of the task's text. A `fix(content):` that corrects a task's wording (CLAUDE.md asks for exactly these) gives the task a new id.
- A link added to `task-links.json` later moves a document task's key from its own id to the master id.

In both cases the saved tick stays under the old key and the box shows unticked. Nothing tells the reader.

The store's `SCHEMA_VERSION` migrations are about the stored shape, and they cannot see content changes. Nothing is lost today: `CHECKLIST_SAVES` has never been on in a merged build.

Why it matters: the first content fix after release silently unticks that task for every reader who ticked it. Adding the four links from minor 1 after release would do the same. And the facts in this guide are expected to change (thresholds, form names).

Suggested fix: one of these, or both. They can go through the backlog to the content-pipeline owner, if recorded before release.
- (a) Emit the previous key beside the new one. For example, `content-meta/task-renames.json` (old id → new id) for rewordings, and the source's own id for linked tasks, rendered as `data-task-was`. On connect, `<st-checklist>` moves a tick from the old key to `data-task` when only the old one is set. That is a few lines in `checklist.ts` plus a dom test.
- (b) At least, say in `content-meta` and the content guide that rewording a task or adding a link after release unticks it, and add a `content:check` warning when a task id disappears between `src/data` and the new build.

### nit 1: `linkTasks` silently skips a link whose doc prefix is not a built document

File: `scripts/content/special/checklist.ts:98-99`

The comment says this is for "partial builds". But an English build is never partial: a document listed in `docs.meta.json` that is missing is a `missing-source` error. So the skip only hides a typo such as `lookup/checklst:88cba814`. My mutation passed `buildContent` with no issue. `tests/content/validate.test.ts` catches it in `content:check`, so nothing wrong ships.

Make it a `task-link-unknown` error, or say in the comment which build the skip is for. The unit test "skips a link whose documents are not both in the build" would change with it.

### nit 2: Any string in `st.lang` shows the banner at first paint

File: `src/scripts/theme-init.js:22-24`, `src/components/interactive/LangBanner.astro:90`

`theme-init.js` sets `data-st-lang-offer` for any value that differs from the page's language. The global CSS then shows every banner, whichever language the attribute names. With a value that is not an enabled locale (my probe used `fr`), the banner flashes and goes, for a CLS of 0.063. The same thing would happen to the non-matching banners once a third language exists.

It needs a hand-edited or stale key, so this is rare. A per-offer rule, `:root[data-st-lang-offer="af"] st-lang-banner[data-locale="af"]`, generated in the component's style for each offer, fixes both cases with no script change.

### nit 3: The near-twins left unlinked are not recorded

File: `content-meta/task-links.json`, `docs/reviews/backlog.md`

The file records what is linked but not what was considered and left out, or why. The next editor (or the WP-31 author wiring "Only mine") cannot tell a deliberate "no" from a pair nobody looked at.

Record the decisions somewhere durable. The lists under "The doubtful pairs left unlinked" above are a starting point. JSON has no comments, so either:
- a short `content-meta/README` section; or
- a `"considered"` map in the file, which `TaskLinksSchema` would then allow.

### nit 4: Two small doc slips around the banner and first paint

- `docs/design-system.md:354`: the "Without JavaScript" cell for `<st-lang-banner>` still says "Rendered `hidden`". The banner is no longer rendered with `hidden`. It is `display: none` until `theme-init.js` sets the root attribute, and that script needs JavaScript too, so the outcome is the same. Say "Not shown (`theme-init.js` sets the attribute that shows it)".
- No e2e test guards the pass 1 minor 3 fix. Every banner test looks after `load`, so a regression back to a module-only banner would pass. A Chromium test that delays every `/_astro/*.js` except `theme-init` and asserts the banner is visible before the modules arrive (as my probe does) would hold it.

## What I checked and found right

- **The pass 1 fixes.**
  - Major 1: links, `sameAs`, the `data-task` key, the comments, the design-system table and an e2e test in both directions and both languages.
  - Minor 1: the "saved" line hides when storage fails.
  - Minor 2: a restored filter is applied.
  - Minor 3: no shift from the banner.
  - Minor 4: the pill's name says where it goes.
  - Minor 5: `entriesOf` drops only bad entries. Tested, and a corrupt non-object is still reset.
  - Minor 6: the `…Static` help strings.
  - Minor 7: `adapter.ts` is fully covered.
  - Nits 2 and 4 to 6: the dependency is gone from `package.json` and the lockfile, the "Copied" tick, shortcuts ignored while a `<dialog>` is open, and the table caption.
  - Minor 8, minor 7's gate half, nit 1 and nit 3 are in `backlog.md` with reasons I accept.
- **`linkTasks` rules.** Both ids exist, the target is on the master checklist and the source is not, no chains, one link per master task. The first link wins and the rest are reported. Each rule has a unit test, and `validate.test.ts` checks the committed data in every language.
- **Store and adapter, again.** Construction never throws. A failure mid-session copies the backing storage into memory. `storage` events are ignored once in memory. `clearAll` removes only `st.` keys and resets every registered store. A first visit writes nothing. `persistentValue` rejects non-`st.` keys and a second schema for one key.
- **Elements.** Every element (C2) does nothing in its constructor, wires up in `connectedCallback` and unwires in `disconnectedCallback`. `<st-checklist-tools>` now dispatches the restored filter once on connect, after the lists. Dialogs use `<form method="dialog">`, put focus on Cancel and return focus to the opener.
- **No JavaScript.** The `nojs` project passes, including the checklist, prompts, TOC, settings and banner checks.
