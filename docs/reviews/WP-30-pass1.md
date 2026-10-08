# WP-30 review pass 1 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2 October 2026
- **Commit reviewed:** `d2b89ff` ("docs(components): say which search key the shortcuts setting gates"), the tip of `worktree-agent-acb967a2bda1e55df`. I reset a clean worktree to it.
- **Scope:** `git diff 2744d07 d2b89ff`: 56 files, +4925 / -112.

## Verdict

**Not clean: 0 blocker, 1 major, 8 minor, 6 nit.**

The store, the adapter and the elements are well built and well tested. Every gate is green. The one major is the brief's checklist requirement "a tick on one page shows on the other": it is not met for the tasks that appear on a document page and on `/checklist/` under different ids, and the code comments and docs say it is.

## Gate results

I ran all of these myself on `d2b89ff`.

- `pnpm install --frozen-lockfile --offline`: OK.
- `pnpm gate:fast`: exit 0.
  - ESLint, Prettier, stylelint: clean.
  - `astro check`: 208 files, 0 errors, 0 warnings, 0 hints.
  - vitest unit + dom: **41 files, 1080 passed (1080)**.
  - Content drift: "Wrote 0 changed files, removed 0, 41 files in total. Content drift: none."
  - vitest content: **32 passed (32)**.
- `pnpm build`: exit 0, 96 pages.
  - `dist:audit`: "96 HTML file(s), 13950 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4541`, 2 workers): 630 tests, **543 passed, 87 skipped, 0 failed** (5.7 min).
  - chromium: 262 passed.
  - mobile: 175 passed, 87 skipped. All skips are desktop-only or clipboard-only tests.
  - nojs: 106 passed.
- `pnpm test:a11y`: **198 passed** (5.3 min). This includes the 6 new "axe with the interactive states open" tests: both dialogs, the language banner and the storage warning, each in light and dark.
- Coverage, `pnpm exec vitest run --project unit --project dom --coverage`:
  - `src/lib/store.ts`: 100 statements / 96.96 branches / 100 functions / 100 lines.
  - `src/lib/storage/**`: 98.43 / 93.93 / 100 / 100. `migrate.ts` is fully covered. `adapter.ts` has 84.61% branches.
  - The run exits **1**, because `src/lib/content/**` is at 89.04% functions against its 100% floor. `collections.ts` and `context.ts` are at 0%. This diff does not touch `src/lib/content/**` or its tests, so it predates WP-30, as the author says. See minor 7.
- **WebKit was not run.** It is not available in this environment. It stays on `merge-checklist.md`.

## My own checks

- **JS budget.** I added up every `<script src>` on the built page and the chunks they import, each gzipped (level 9):
  - `core/what-you-need-to-sell-things/`, `core/running-a-pty-ltd/` and `business-types/vehicle-dealer/`: 14.6 KB gz (13 files, 36.7 KB raw).
  - `branding/branding-prompts/`: 14.2 KB.
  - `checklist/` and `af/checklist/`: 15.1 KB.
  - `about/`: 12.9 KB. Home: 12.5 KB.
  - The author's figure is 15.9 KB. Either way it is well under 25 KB.
- **CSP.** No inline `<script>` with a body and no `on*=` attribute anywhere in `dist/`. No `innerHTML`, `outerHTML` or `insertAdjacentHTML` in `src/scripts` or `src/lib`.
- **`localStorage`** appears outside `src/lib/store.ts` and `src/lib/storage/` only in `theme-init.js`, the documented exception. No colour literals and no `href="/…"` literals in the new or changed components.
- **Probes against the built site** (Chromium, my own static server):
  - With storage throwing, the "Ticks are saved on this device only." line and the "cannot be saved" warning both show (minor 1).
  - Tick "Not done yet" on `/checklist/`, go to `/about/`, press Back: the radio comes back checked and the ticked item is shown (minor 2).
  - On the English home page with `st.lang=af` and scripts delayed 1.5 s, the banner causes a **CLS of 0.129** (minor 3). The same probe on `branding/branding-prompts/` measured 0 for the copy buttons.
  - The pill's accessible name at 375px is "Now reading The general rule". It links to `#st-on-this-page` (minor 4).
  - Tick "Get public liability insurance" on `business-types/services-trades/`, open `/checklist/`: "Public liability insurance" is unticked and the ring says "0 of 91 done" (major 1).

## Ownership

Outside the interactive and store role (D1), the diff touches:

- content blocks and navigation: `CodeBlock`, `TaskListBlock`, `Block`, `Blocks`, `TableOfContents`, `SiteHeader`;
- layouts and pages: `Doc`, `Page`, `about`, `index`;
- `src/i18n/*.json`, `eslint.config.js`, `vitest.config.ts`, `tests/e2e/**`, `docs/design-system.md` and `docs/testing.md`.

Each of these is named or required by the brief: flipping `CHECKLIST_SAVES` and every reader of it, the About settings, the ESLint allow-list, the coverage floor, the e2e tests and the docs. The i18n change adds 3 keys, in both files. I accept the set.

## The author's reading of "a tick on one page shows on the other"

The data: `tasks.json` has 213 tasks. 91 are on `lookup/checklist` and 122 on twelve other documents. Ids are `docId:hash(text)` (`scripts/content/ids.ts:49`), so two documents can never share one. The brief assumed they did. So did the old `TaskListBlock` comment, and plan B6 says the type docs' Part B list has the "same task ids as /checklist/".

The master checklist mostly collects the other pages' tasks:
- **6 tasks have identical wording** on both pages: five on `core/running-a-pty-ltd`, such as "Two IRP6 provisional returns filed", and one on `core/working-from-home-and-safety`.
- A word-overlap check finds **about 35 more with the same meaning**, which I spot-read. Examples: "Get public liability insurance" and "Public liability insurance"; "Apply for the municipal health establishment licence" and "Municipal health establishment licence".

"Checklists on other pages" works and is honest as far as it goes: it shows per-page counts from the same store, and the links work without JavaScript. But it does not meet the intent. A reader who ticks a task where they read about it finds the same task unticked on `/checklist/`, and the "Your progress" ring leaves it out. They will tick it twice, or decide the site lost their tick. See major 1.

## Findings

### major 1: The same task on a document page and on `/checklist/` does not share a tick, and the docs say it does

File: `src/components/content/TaskListBlock.astro:5-6`, `src/scripts/checklist.ts:2-4`, `docs/design-system.md:346`, `src/components/interactive/ChecklistElsewhere.astro:1-8`

Acceptance item: Build 3, "ticks persist by task id on document pages and on `/checklist/`; a tick on one page shows on the other". Also plan B6 (type doc Part B, "same task ids as /checklist/").

What is wrong:
- About 40 of the 122 tasks on document pages are the same task as one on `/checklist/`. Six have identical wording. Each copy has its own id, so a tick on one never shows on the other.
- The comments and the design-system table still say it does:
  - `TaskListBlock.astro`: "the same id `/checklist/` uses, so a tick is saved once and every page showing the task agrees".
  - `checklist.ts`: "any page that shows a task shows the same tick".
  - `design-system.md`: "two copies of a task (another page, …) agree".
- The e2e test is named "…shows on /checklist/…". It only checks the per-page count under "Checklists on other pages".

Why it matters:
- This is the main promise of saved checklists.
- On `/checklist/` the reader sees a task they already ticked as not done.
- The overall ring under-counts.
- "Remove ticks" says it removes every tick on the device. That is true, but most of those ticks are invisible on that page.

How to reproduce: open `business-types/services-trades/` and tick "Get public liability insurance". Then open `/checklist/`. "Public liability insurance" is unticked, and "Your progress" says 0 of 91 done.

Suggested fix: the ids are the content pipeline's, so this needs the orchestrator. Two options:
- (a) Give each pair one storage key. For example, a `sameAs` map in `content-meta/`, or a `checksKey` emitted beside `id` in `tasks.json`, that pairs each document task with its `/checklist/` twin. `<st-checklist>` then writes and reads `data-check-key` instead of `data-task`. That is a small change in `checklist.ts` and `TaskListBlock.astro`.
- (b) The owner accepts per-page ids for now. Then amend the brief and B6, add a backlog entry, and change "Checklists on other pages" to say plainly that a tick on another page is not ticked here.

Either way, correct the three comments and the test name.

### minor 1: "Ticks are saved on this device only" shows next to "Your ticks cannot be saved on this device"

File: `src/components/content/TaskListBlock.astro:59`

Acceptance item: Build 3, "Storage failure shows the notice".

What is wrong: `.st-tasklist__saved` is `.js-only` and nothing hides it when `<st-storage-notice>` shows. With storage blocked, the page says both things, one under the other.

How to reproduce: the e2e "storage throws" setup, then check that `.st-tasklist__saved` is visible. It is.

Suggested fix: hide the saved line while `storageAvailable` is `false`. For example, put it inside an element that toggles opposite to the notice. Add the assertion to the e2e test.

### minor 2: A filter restored by the browser is not applied

File: `src/scripts/checklist.ts:146-156`

Acceptance item: Build 3, "Not done yet" filtering.

What is wrong:
- `StChecklistTools.connectedCallback` copies a checked radio into `currentFilter` but never dispatches `FILTER_EVENT`.
- `st-checklist` is defined, and so upgraded, before `st-checklist-tools`, so every list has already applied `all`.
- When the browser restores form state (Back without bfcache, or a Firefox reload), "Not done yet" is checked and every ticked item still shows.

How to reproduce: on `/checklist/`, tick an item and choose "Not done yet". Go to `/about/`, then press Back. The radio is checked and the item is visible.

Suggested fix: dispatch the event (or call `applyFilter` on every list) from `connectedCallback` when the restored value is not `all`. Or reset the radios to the module state.

### minor 3: The language banner shifts the home page when it appears

File: `src/components/interactive/LangBanner.astro:46-51`, `src/pages/[...locale]/index.astro:100`

Acceptance item: D4 performance lens, no layout shift.

What is wrong: the banner sits above the hero, is rendered `hidden`, and is shown by a module script. When the script arrives after first paint, the whole page moves down. I measured CLS 0.129 with scripts delayed 1.5 s, which is above the 0.1 "good" limit, on a slow phone connection, the audience this site is for.

Suggested fix: `theme-init.js` already reads storage before paint. It could also read `st.lang` (a bare string) and set a root attribute such as `data-st-lang="af"`, so CSS can show the banner from the first paint. Or reserve its space.

### minor 4: The "Now reading" pill's name does not say where it goes

File: `src/components/navigation/TableOfContents.astro:59-62`

Acceptance item: Accessibility lens (link purpose, WCAG 2.4.4).

What is wrong: the link's name is "Now reading <section title>", which reads as a link to that section. It actually opens the "On this page" list. A screen-reader user who lists links gets no hint of that.

Suggested fix: add the destination to the name, for example a visually hidden ", open the contents" phrase from a new key in both dictionaries. Or use `aria-describedby` pointing at the list's summary.

### minor 5: One bad entry resets every tick

File: `src/lib/store.ts:176`, `src/lib/storage/migrate.ts:190-193`

Acceptance item: Build 1, per-key reset. Correctness lens, no silent data loss.

What is wrong:
- `checksSchema` is `z.record(z.string(), isoDateTime)`. One value that is not an ISO date-time fails the whole record, and `readValue` then removes `st.checks.v1`, every tick included.
- The same applies to `st.prompts.v1`.
- The per-key reset is right for a corrupt key. For a map of independent entries, it turns one bad entry into total loss, with no notice.

Suggested fix: for the two record stores, drop the invalid entries and keep the rest. For example, a schema that filters entries, or a `readValue` option. Add a test with one bad date among good ones.

### minor 6: The settings' help text promises things that are not built

File: `src/i18n/en.json:817`, `src/i18n/en.json:819` (and the same keys in `af.json`)

Acceptance item: Build 6. Also the package's own rule in `about.astro`: "a row for a key that does nothing would tell a reader something untrue".

What is wrong:
- `shortcutsHelp` says "Turn this off if / or ? causes problems", but `/` does nothing until WP-33.
- `lowDataHelp` says it "loads search only when you open it", but there is no search yet.
- The strings predate WP-30, but this package is the first to show them.

Suggested fix: use `SEARCH_AVAILABLE`-dependent variants (`…Static`), as the Tools menu does.

### minor 7: The coverage floors bind nowhere, and `adapter.ts` alone is under 90% branches

File: `vitest.config.ts:73-76`

Acceptance item: Tests, "Coverage of `src/lib/store.ts` and `src/lib/storage/**` at least 90% (add the floor to `vitest.config.ts`)".

What is wrong:
- The floor is applied to the `storage/**` glob as a whole (93.93% branches). `adapter.ts` on its own is 84.61%: the copy-to-memory loop in `fail()`, lines 74-80, and the `remove` catch, line 128.
- Coverage runs in no gate (`gate:fast` and `gate` run `vitest` without `--coverage`).
- The documented coverage command exits 1 anyway, on the older `src/lib/content/**` floor. So a drop under the new floors would not be noticed.

Suggested fix:
- Cover the two adapter paths: a key that is already in memory, and `removeItem` throwing.
- Ask the tooling owner, through the backlog, to run coverage in `gate` once the `src/lib/content/**` floor is fixed.

### minor 8: The new components are not on `/design-system/`

File: `src/pages/design-system.astro`

Acceptance item: Plan B7, "every component in every state" on the design-system page. The brief does not list it, and the author names it as a known limit.

What is wrong: the page shows none of these:
- `ConfirmDialog` (open);
- the copy button's "Copied" state and its failure line;
- the checklist progress line and the `/checklist/` summary;
- the storage warning;
- the `role="switch"` settings;
- the language banner;
- the TOC's `aria-current` state and the pill.

Reviewers and WP-50's visual baselines have no single place to see them.

Suggested fix: add them, or record a backlog entry assigning them to the design-system owner before P5.

### nit 1: Low data still downloads the two preloaded fonts

File: `src/layouts/Base.astro:105-106`, `docs/design-system.md` Known limits

The author documented this. I agree it cannot be fixed from `theme-init.js`, because the preload scanner has fetched them before any script runs. The setting does what its help text says: it uses the device's fonts. Record it in `docs/reviews/backlog.md` so WP-50 decides between keeping the preloads and dropping them.

### nit 2: `@nanostores/persistent` is a dependency that nothing imports

File: `package.json:46`, `docs/build-plan.md:210`

It ships nothing to the browser, so this is a tidy-up, not a cost. Remove it through the orchestrator (`package.json` is shared). Update C2's "nanostores + @nanostores/persistent" and "persistentMap" wording to match the store that was built.

### nit 3: Alt+← now overrides the browser's Back on every page with a pager

File: `src/scripts/site.ts:36-42`

This is what B5 and the brief ask for, and it is done carefully: the key goes to the browser when there is no pager. But Alt+← is the standard Back key in Chrome, Edge and Firefox on Windows and Linux, and keyboard users rely on it. Worth an owner decision before release.

### nit 4: No tick on "Copied"

File: `src/scripts/copy.ts:90-92`

B3 flow 6 and B4 describe a "Copied ✓" morph. The label changes, but the icon stays the copy icon and no style uses `[data-copied]`.

### nit 5: `?` with a confirm dialog open acts behind the dialog

File: `src/scripts/site.ts:29-57`

On `/about/` with "Clear all your data?" open, pressing `?` tries to focus the inert heading behind the dialog. On other pages it navigates away with the dialog open. Ignore shortcuts while a modal `<dialog open>` exists.

### nit 6: The shortcuts table has no caption

File: `src/pages/[...locale]/about.astro:102`

B4's Table component asks for a `<caption>`. The section heading labels it in practice, and axe is clean.

## What I checked and found right

- **Adapter.** It survives the getter throwing, every call throwing, and a write that fails mid-session (copying the backing store into memory first). It reports `storageAvailable`, and storage events are ignored once it is in memory.
- **`migrate()`.** It writes nothing on a first visit and drops a lone corrupt meta key. It stops at the first throwing migration and leaves data from a newer schema alone.
- **`clearAll`.** It removes only `st.` keys, puts every store back to its default, and other tabs follow through per-key `storage` events.
- **`persistentValue`.** It rejects keys outside `st.` and refuses a second schema for the same key. The API and doc comment are enough for WP-31 and WP-32.
- **Cross-tab and bfcache.** `storage` events and `pageshow` with `persisted` re-read the stores.
- **Elements.**
  - All of them do nothing in the constructor, wire up in `connectedCallback` and unwire in `disconnectedCallback`, timers included.
  - `ConfirmDialog` uses `<form method="dialog">`. Cancel comes first and has focus, Escape cancels, and focus returns to the opener.
  - The copy and reset messages go to existing `role="status"` lines.
- **No JavaScript.** The boxes tick and one line says they are not saved. There is no copy button, no pill, no settings controls and no banner. The `nojs` project checks each of these.
- **i18n.** The 3 new keys are in both dictionaries. The banner is written in the language it offers and carries its `lang`. Fallback blocks keep `lang` on the copy button and the progress line.
