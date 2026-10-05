# WP-30 review pass 3 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and it is not the reviewer of pass 1 or pass 2.
- **Date:** 5 October 2026
- **Commit reviewed:** `aeee101` ("fix(components): move ticks to changed keys and show only a valid banner"), the tip of `worktree-agent-acb967a2bda1e55df`. I reset a clean worktree to it.
- **Scope:** `git diff 2744d07 aeee101`, the whole package again: 86 files, +6820 / -136. I gave extra time to the two commits after pass 2: `b330f8f` (task renames, `src/data/task-keys.json`, `renameChecks()`, the released-keys test, four new links, the `considered` map) and `aeee101` (the per-language first-paint banner rule).

## Verdict

**Clean: 0 blocker, 0 major, 2 minor, 4 nit.**

Pass 2 was clean, so this is the second consecutive clean pass (D4). The pass 2 minors and nits are fixed, and the new key-migration path is correct, idempotent and tested at each level. The two minors below should be fixed or moved to the backlog. Neither changes the verdict:

- a tick or a settings switch changed before its module connects is undone when it connects;
- the key migration runs as a side effect of one page script, not of the store.

## Gate results

I ran all of these myself on `aeee101`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 4.7s").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!". ESLint and stylelint: clean.
  - `astro check`: "Result (210 files)", 0 errors, 0 warnings.
  - vitest unit + dom: "Test Files 43 passed (43)", "Tests 1102 passed (1102)".
  - Content drift: "Wrote 0 changed files, removed 0, 42 files in total. Content drift: none." This branch has no Afrikaans markdown tree ("af: no source tree … (skipped)"), so the count is lower than the 81 in pass 2.
  - vitest content: "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14024 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4601`): **552 passed, 87 skipped, 1 failed** (8.8 min).
  - The failure is `interactive.spec.ts:404` "? opens the shortcuts list, unless single-key shortcuts are off" on chromium: `toHaveURL` received `/about/#keyboard-shortcuts`.
  - Run alone with `--repeat-each=20` it passed 20 of 20. It failed while I was running coverage at the same time, so the machine was loaded.
  - The cause is a real race in the product, not only in the test. See minor 1.
  - The skips are the desktop-only and clipboard-only tests on `mobile`, as in passes 1 and 2.
- `pnpm test:a11y`: **198 passed** (6.7 min). This includes the "interactive states" runs: both dialogs, the banner and the storage warning, in both themes.
- Coverage, `pnpm exec vitest run --project unit --project dom --coverage`:
  - `src/lib/store.ts`: 100 statements, 97.82 branches, 100 functions, 100 lines. Line 162 is the `typeof window` guard.
  - `src/lib/storage/adapter.ts` and `migrate.ts`: 100 / 100 / 100 / 100 each.
  - The run exits 1 on the older `src/lib/content/**` functions floor (89.04% against 100%). This predates WP-30 and is already in `backlog.md`.
- **WebKit was not run.** It is not available in this environment. It stays on `merge-checklist.md`.

## My own checks

### The rename and key-migration path

- **Where it runs.** `renameChecks(taskKeys.renames)` runs at the top level of `src/scripts/checklist.ts`, before the three `customElements.define` calls. So it runs before any `<st-checklist>` or `<st-checklist-progress>` reads the store.
  - Every component that reads `checks` imports that module: `TaskListBlock.astro:105`, `ChecklistElsewhere.astro:60` and `ChecklistSummary.astro:116`. No other module reads `checks` today, so every page with a checkbox or a count migrates first.
  - That holds only while every reader imports this one script. See minor 2.
- **Idempotent.** A second run finds nothing under the old keys, returns 0 and writes nothing. The dom test checks that the stored string is unchanged.
- **Conflicts.** A tick already saved under the new key wins, and the old key is removed.
- **Mutations.**
  - Without `delete next[from]`, the dom test fails.
  - When the new key is overwritten unconditionally, the dom test fails.
  - When the `renameChecks` call is removed from `checklist.ts` (rebuilt), the e2e test "a tick saved under a key that has since changed moves to the key used now" fails.
  - When the store is written on every call (not only when a tick moved), all 1102 unit and dom tests still pass (nit 2).
- **Storage blocked.** The map is empty and in memory, so the call does nothing and nothing throws. If a write fails, the adapter falls back to memory and the move is tried again on the next load.
- **Two tabs.**
  - Two tabs of the same build that load together both compute the same result and write the same map.
  - A tab still open on an older build gets the `storage` event. It shows its old-key box unticked until the reader ticks it again. The next load of the new build moves that tick again, or drops it if the master key is already ticked.
  - Nothing is lost, and this is the expected cost of a deploy.
- **Pipeline checks** (`taskKeyRenames`): an unknown new id, an old id that is still a task, and a chain are each rejected with their own code. Each has a unit test. A rename whose target is a linked task resolves to the master key, and the test covers that case.

### The released-keys snapshot

I reworded "Set up WhatsApp Business with quick replies" in `05-services-and-trades.md` and ran `pnpm content:build`, then `pnpm test:content`. Then I reverted every change.

1. With no rename entry, the test fails: "released task keys that no longer exist: add each to content-meta/task-renames.json (old id -> new id)".
2. With the entry added and the content rebuilt, `task-keys.json` gains `a9a8c6bf → 9401a326`. The test then fails on the second check: "task keys not yet recorded: run the TASK_KEYS_UPDATE command in this test".
3. The documented command, `pnpm exec cross-env TASK_KEYS_UPDATE=1 vitest run --project content -t "released task key"`, ran 1 test and skipped 33. It added exactly one key. The file it wrote passes `prettier --check`, and the full content suite then passed (34 of 34).

Can it be fooled?

- Running the update command does not hide a lost key, because the update only adds keys and the "lost" check still runs after it.
- Rewording a linked master task without a rename fails twice: the link becomes `task-link-unknown`, and the old master key is lost.
- Removing a key from the file by hand, or pointing a rename at the wrong task, does hide a lost tick. `content-meta/README.md` allows the hand removal only when a task is deleted, and asks for the reason in the commit. That is the right limit for a data file.
- Unlinking a task after release is not covered (nit 4).

The workflow is clear enough for the next content author. The README says what changes a key, what to add, and the exact command. `docs/testing.md` points to it, and both failure messages name the file or the command to use.

### The 45 task links and `considered`

I checked the four new links against the task text:

| Document task | Master task | |
| --- | --- | --- |
| `working-from-home:cad4290c` "Money reflected in my balance before anything left my hands" | `057de8cb` "Money reflected in my balance, not "pending", before anything is handed over" | Same habit. |
| `beauty:22a2e898` "Register your POPIA information officer, since you hold client health information" | `a036463c` "Registered my Information Officer at inforegulator.org.za (free)" | Same action. "Since" gives a reason, not a condition. |
| `services-trades:92e8509e` "Claim and complete your Google Business Profile" | `22905c13` "Claimed and completed my Google Business Profile" | Only the tense differs. |
| `professional-creative:66134f08` "Register as a provisional taxpayer and diarise the IRP6 dates" | `afe2d3be` "Registered as a provisional taxpayer" | The same extra-clause pattern as the accepted `food:7ee08e59`. |

All four are right. Each new link is also in `task-keys.json`, and the `validate.test.ts` sameAs check passes.

I read all 18 `considered` entries next to both texts, and each reason matches the text. The record is incomplete in two places, and the build does not check its ids (nit 3).

### The banner's first-paint CSS

- The built rule is `:root[data-st-lang-offer=af] .st-lang-banner[data-locale=af]{display:block}`, inlined in a `<style>` in the head.
  - The meta CSP allows this: `style-src 'self' 'unsafe-inline'`, the same as every other inlined Astro style.
  - The script side is unchanged: `theme-init.js` is still an external file under `script-src 'self'`.
- **Exact match.** `theme-init.js` writes the saved string as it is. The rule shows a banner only when that string equals the banner's own `data-locale`. A value such as `fr` matches nothing.
- **No layout shift.** I held every `/_astro/*.js` except `theme-init`, and the banner is visible before `st-lang-banner` is defined. The new e2e test does the same and passes.
- **Mutation.** I put back the old global rule, `:root[data-st-lang-offer] .st-lang-banner`.
  - Both `tests/unit/lang-banner.test.ts` tests fail.
  - The e2e test "a saved value that is not an enabled language shows no banner at any point" still passes (nit 1).

### Other checks

- **JS budget.** I added up every `<script src>` and the chunks each imports, gzipped at level 9:

  | Page | Files | Raw | Gzipped |
  | --- | --- | --- | --- |
  | `core/running-a-pty-ltd/`, `business-types/services-trades/` | 15 | 37.9 KB | 15.2 KB |
  | `checklist/`, `af/checklist/` | 18 | 38.8 KB | 15.7 KB |
  | `branding/branding-prompts/` | 14 | 34.5 KB | 14.2 KB |
  | `about/` | 12 | 30.8 KB | 12.5 KB |
  | Home | 11 | 30.0 KB | 12.2 KB |

  `task-keys.json` adds about 0.9 KB gzipped to the checklist pages. They are still well under 25 KB, and the 15.9 KB recorded in `docs/testing.md` stays representative.
- **CLAUDE.md rules over the new code.**
  - `localStorage` appears only in the store, the adapter and the documented `theme-init.js` exception.
  - No colour literals, no `href="/…"` literals and no new UI strings.
  - `src/data/task-keys.json` is generated by `content:build`, which is in the drift check and in `managedPrefixes`.
- **Without JavaScript.** The `nojs` project passed in full.

## Findings

### minor 1: A tick or a settings switch changed before its module connects is undone when it connects

File: `src/scripts/checklist.ts:56-61` and `:71-74`, `src/scripts/settings.ts:25-32`, `tests/e2e/interactive.spec.ts:404-414`

Acceptance item: Build 3 ("ticks persist by task id"; "Without JavaScript the boxes still tick") and Build 6 (the shortcuts toggle). Correctness lens, no silent data loss.

What is wrong:
- The checkboxes are server-rendered and can be clicked as soon as they are painted. The settings switches show as soon as `theme-init.js` adds `.js`.
- The module that saves them runs later, because module scripts are deferred.
- On connect, `<st-checklist>` sets `box.checked = id in map` for every box, and `<st-setting>` sets `checked` from the store. Neither looks at what the reader already did.
- So a tick made in that window is unticked again without being saved, and a switch turned off turns itself back on.

Before this package, such a tick at least stayed for the page view.

Why it matters:
- I measured the window from the first checkbox in the DOM to `st-checklist` being defined, with Chromium network throttling on a first visit:
  - about 1.6 Mbps and 150 ms latency: 0.8 s on `/checklist/` and 0.5 s on `business-types/services-trades/`;
  - about 400 kbps and 400 ms latency: 2.8 s and 1.9 s.
- `/checklist/` is where a returning reader goes to tick something, and slow phones are this site's audience.
- The same race made the package's own e2e test fail once in my gate run. With the machine loaded, `uncheck()` on the switch landed before `<st-setting>` connected, so `?` still navigated. So the required Playwright run is flaky.

How to reproduce: hold every `/_astro/*.js` except `theme-init` and go to `business-types/services-trades/` (`waitUntil: 'commit'`). Tick the first box, then let the modules load. The box was checked before the modules ran and is unchecked after, and `localStorage` is empty. On `/about/`, unchecking "Single-key shortcuts" gives the same result: it is back on after load and nothing is stored.

Suggested fix:
- On connect, treat a box whose `checked` differs from `defaultChecked` as the reader's action and write it to the store (`setChecked`) before subscribing. A box the browser restored on Back holds what the store held, so writing it back is harmless. Do the same in `<st-setting>`.
- Add a dom test for each element: change the input before the element connects, then connect it.
- In the e2e test, wait until `st-setting` is defined before `uncheck()`.

### minor 2: Moving ticks to changed keys is a side effect of one page script, not of the store

File: `src/scripts/checklist.ts:25-28`, `src/lib/store.ts:210-228`, `docs/design-system.md:400`

Acceptance item: Build 1 ("the store's API is part of the deliverable", which WP-31 builds on) and the correctness lens.

What is wrong:
- `renameChecks(taskKeys.renames)` is called only when `src/scripts/checklist.ts` is loaded.
- The store's doc comment and the design-system API table describe `renameChecks` as a function, and say nothing about who must call it or when.
- WP-31 ("My path", "Only mine") will read `checks`. A module that imports only `checks` from `src/lib/store.ts` sees ticks under their old keys after a deploy that renamed or linked tasks, until the reader next opens a page with a checklist.

Why it matters: nothing is lost, because the next checklist page moves the ticks. But a WP-31 page opened first after such a deploy would show those tasks as not done. The contract WP-31 starts from does not warn about it.

Suggested fix: run the move wherever `checks` is first read. For example, import `task-keys.json` in a small `src/lib/checks.ts` that both `checklist.ts` and WP-31 import, or run it from the store's own module. Or, at the least, say in the store doc comment and in `docs/design-system.md` that every reader of `checks` must import `src/scripts/checklist.ts` (or call `renameChecks` with `task-keys.json`) first.

### nit 1: The "not an enabled language" e2e test cannot see a flash

File: `tests/e2e/interactive.spec.ts:488-497`

The test asserts `toBeHidden()` right after `waitUntil: 'commit'`, when the banner may not be parsed yet (a missing element counts as hidden), and again after `load`, when the module has already hidden it. With the old global rule put back, it still passes. `tests/unit/lang-banner.test.ts` does catch that regression, so the behaviour is guarded.

Either hold the modules as the test before it does, then assert hidden once `st-lang-banner` is attached, or rename the test so it does not say "at any point".

### nit 2: "Writes only when one was moved" is not guarded

File: `tests/dom/store.test.ts:146-148`, `src/lib/store.ts:226`

The dom test compares the stored string before and after a no-op call, and the string is the same whether or not the store writes. When I changed the code to write on every call, all 1102 unit and dom tests passed. That mutation makes every first visit to a checklist page write `st.checks.v1` and `st.meta.v1`, which breaks the store's own rule ("A visit that saves nothing writes nothing").

Add a dom test that imports `src/scripts/checklist.ts` against empty storage and expects no `st.` keys, or spy on `storage.set`.

### nit 3: The `considered` record is incomplete, and its ids are not checked

File: `content-meta/task-links.json:50-123`, `scripts/content/config.ts:357-359`

- Two groups that pass 2 listed as right to leave unlinked are missing:
  - `core/adding-new-lines:57d2420f` against `lookup/checklist:d21f5efe`;
  - the meeting habits against `b620b7df` and `8a68f28a`.
- The build ignores the map, so a reworded task leaves a stale entry without warning. After my rewording mutation, `services-trades:a9a8c6bf` still pointed at nothing.
- The three zoning reasons say "one link per master task". But none of the three is linked, so the real reason is that the master task is broader ("if I work from home or from fixed premises").

Check that both ids of each entry are tasks (`content:check` or `validate.test.ts`), add the missing pairs, and reword the zoning reasons.

### nit 4: Unlinking or retargeting a link after release is not covered

File: `content-meta/README.md:34-66`

The README covers rewording, linking and removing a task. It does not cover removing a link or pointing it at another master task after release.

- In both cases the document task's key changes, but the old key is still a live key (the master task's), so the released-keys test passes. The tick stays on the master task, and the document copy shows unticked.
- Moving it would be wrong, because the master task still owns that tick, so the code is right to do nothing.

Say in the README that unlinking or retargeting unticks the document copy for readers who ticked it, so the author decides knowingly. Pointing the two test failure messages at `content-meta/README.md` would also help.

## What I checked and found right

- **The pass 2 fixes.**
  - Minor 1: the four links, all correct.
  - Minor 2: `task-renames.json`, `task-keys.json` and `renameChecks`, with the released-keys test and README.
  - Nit 1: a link to an unknown document is now `task-link-unknown`, and the unit test changed with it.
  - Nit 2: the per-language first-paint rule, with a unit guard for every enabled language.
  - Nit 3: the `considered` map.
  - Nit 4: the design-system row and the pre-module e2e test.
- **Store, adapter and migrations.** These are unchanged since pass 2 apart from `renameChecks`, and still fully covered.
  - Construction never throws.
  - A failure mid-session falls back to memory, and `storage` events are ignored once in memory.
  - `clearAll` removes only `st.` keys.
  - `entriesOf` drops only bad entries.
  - `persistentValue` rejects non-`st.` keys and a second schema for the same key.
- **Elements (C2).** Each one does nothing in its constructor, wires up in `connectedCallback` and unwires in `disconnectedCallback`. The dialogs use `<form method="dialog">`, focus Cancel and return focus to the opener. Shortcuts are ignored in fields and while a dialog is open.
- **i18n.** No new UI strings in these commits. The banner carries its own `lang`, and anchors and task ids are shared across languages.
- **Security.** No `innerHTML`, no inline script bodies and no third-party requests, and the inline style is allowed by the meta CSP.
