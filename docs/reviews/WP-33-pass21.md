# WP-33 review pass 21 (final: the integration with main and the pass 20 fixes)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 20.
- **Date:** 8 October 2026
- **Commit reviewed:** `3dbb1be` ("docs(search): record the pass 20 diff on the merged tip"), the tip of `worktree-agent-a0761a64fd64c33f9`, which holds the merge of main `4d5dd8f` (`034b54f`). I reset a clean worktree to it.
- **Scope:**
  - The integration, never reviewed before: `git diff 4d5dd8f..3dbb1be`, the merge `034b54f`, `49be8a0` and `75dee5c`.
  - The pass 20 fixes: `git diff ba71215..f1aa931`, and a spot-check of the verdicts in `docs/reviews/WP-33-diff-2947fbf.md`.
- **The bar:** a major is a failing acceptance row, a regression against main (`4d5dd8f`) or the pass 20 tip (`2947fbf`), a whole class of query going wrong, a broken rule, or a weak acceptance set. The package merges after this pass whatever the verdict; each finding says whether to fix it before the merge or put it in the backlog.

## Verdict

**Not clean: 0 blockers, 1 major, 2 minors, 2 nits.**

The merge loses nothing from either side, every suite is green, and every WP-30/31/32 feature behaves as on main. The one major is new with the integration: the dialog's script now loads on the first open, and the dialog only opens when it arrives. Until then a key press goes nowhere. A reader who presses `/` and types at once loses the first letter even on a fast connection. On a slow one they lose the whole query, and nothing on screen shows that search is coming. At `2947fbf` the same keys typed `vat` into the field.

| # | Severity | Finding | Recommendation |
| --- | --- | --- | --- |
| major 1 | major | First open: the dialog waits for its script, so the first typed letters are lost and a click shows nothing (regression against `2947fbf`) | **fix before merge** (see the note in the finding) |
| minor 1 | minor | The "My business types" chip appears late and pushes the common questions 64px down; the chip has no e2e or axe run | backlog |
| minor 2 | minor | "sources for privacy", "where are the sources for tax" and af typed `bronne vir kos` still open unrelated sections; the backlog row says "Sources for <topic>" works | backlog |
| nit 1 | nit | Three verdicts in `WP-33-diff-2947fbf.md` I would rate differently | backlog |
| nit 2 | nit | `employing staff` still opens Zoning (pass 20 minor 3, only the exact bets were added) | backlog |

## Gate results

I ran all of these myself on `3dbb1be`. The logs are in the session scratchpad as `wp33-review21-*.log`, not in the repository.

- `pnpm install --frozen-lockfile`: exit 0 ("Done in 2.9s using pnpm v11.22.0").
- `pnpm gate:fast` (`wp33-review21-gatefast.log`): exit 0.
  - "All matched files use Prettier code style!"
  - `astro check`: "Result (309 files): - 0 errors - 0 warnings - 0 hints".
  - Vitest unit and dom: "Test Files  75 passed (75)", "Tests  3228 passed (3228)".
  - "Content drift: none."
  - Vitest content: "Test Files  1 passed (1)", "Tests  37 passed (37)".
- `pnpm build` (`wp33-review21-build.log`): exit 0.
  - "dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems."
  - "dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways."
  - "dist:budget: loaded on demand (dynamic import(), not in the page figures; today the search dialog): 27.6 KB gzip (shared chunks counted once)."
  - "dist:budget: search index af.0a79cbef91.json: 815.2 KB raw, 185.0 KB gzip." and "search index en.c5c4aa43de.json: 749.6 KB raw, 167.5 KB gzip."
  - "dist:budget: heaviest document page /af/templates/invoice/: 25.0 KB without a profile, 25.0 KB with one (budget 25.0 KB, 0.0 KB left)."
  - "dist:budget: heaviest other page /af/search/: 34.4 KB without a profile, 34.4 KB with one (budget 45.0 KB, 10.6 KB left)."
  - "dist:budget: 198 page(s) within budget."
- `pnpm search:typos` (`wp33-review21-typos.log`): exit 0. "search:typos: of 58836 one-keystroke typos, 53595 open the correct spelling's first result and 57650 one of its first three." This matches ADR 0003.
- `pnpm search:diff 2947fbf` (`wp33-review21-diff.log`): exit 0. "search:diff 2947fbf: 9854 searches, 142 changed first results: 73 better, 0 worse, 0 same-target, 69 ?." This matches the verdict file and the ADR. The verdict file holds 69 `?` rows: 56 better, 13 neutral.
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4851`, default reporters, `wp33-review21-e2e.log`): **1029 passed, 90 skipped** (10.1 min, exit 0).
  - The log says `[WebServer] ┃ Local    http://127.0.0.1:4851/business-toolkit/` and "Running 1119 tests using 2 workers".
  - `grep -c ✘` gives 0, and the log has no "failed" or "flaky" line. The failure list is empty.
- `pnpm test:a11y` (`PW_PORT=4852`, `wp33-review21-a11y.log`): **416 passed** (7.9 min, exit 0).
  - The log says `Local    http://127.0.0.1:4852/business-toolkit/`.
  - It has no `✘` line.
- **WebKit was not run.** It is not installed in this environment.
- **Order.** The search probes ran before e2e. The browser probes ran after a11y, on my own preview servers: port 4853 for `3dbb1be`, and port 4854 for a build of `2947fbf` that I exported to the scratchpad with `git archive`. Nothing ran in the worktree while e2e or a11y ran.

## 1. The integration with main

### Merge resolutions

For each of the seven conflicted files I listed every line that each side added since the merge base `d2f685b` and checked whether it is still at the tip.

- **`content-meta/README.md`.** Only the two old title lines changed. They are replaced by one title that covers task keys, reading paths and search. All sections from both sides are there.
- **`docs/design-system.md`.** The lines that went are main's "1024 to 1279px" bullet, its app-pages row and its `isTypingTarget` sentence, and WP-33's "not built: filter chips", "TODO" and old budget paragraphs. Each is rewritten for the merged state:
  - `:778` covers the bar from 1024 to 1365px;
  - `:857` keeps main's budget paragraph, with a note on the search button.
  - Nothing a reader needs was lost.
- **`docs/reviews/backlog.md`.** The four WP-33 rows that went (filter chips, the `searchSettings()` TODO, the `js-budget.ts` coverage, `arrivalStore`) are what `49be8a0` resolves. Main's WP-31 budget row is updated to 24.97 KB (`:47`).
- **`docs/testing.md`.** WP-33's `js-budget.ts` section and numbers are gone, replaced by the one `check-budget.ts` section (`:231-247`). The link to `design-system.md#scripts-csp-and-javascript-budget` is still there (`:238`), and so is the anchor (`design-system.md:848`).
- **`package.json`.** `build` runs `search:build` first and ends with the one `dist:budget` (`tsx scripts/dist/check-budget.ts`). `js-budget.ts` is gone.
- **`SiteHeader.astro` and `tests/e2e/nojs.spec.ts`.** No line from either side is lost.

### Budget

- There is one `dist:budget` (`scripts/dist/check-budget.ts`). It walks every built HTML page (198), sums the gzipped script graph without a profile and with the lazy `path-data` chunk, and fails a page over its budget.
- **The figure is confirmed.** I re-measured with the script's own `pageScripts`/`scriptGraph`. `/af/templates/invoice/` loads 25573 bytes gzipped, which is 24.974 KB. That leaves **27 bytes** of the 25600-byte budget. All five Afrikaans template pages and `/templates/invoice/` tie.
- **Main's figure** is 23.65 KB (`docs/testing.md:247`). WP-33 adds about 1.3 KB to each page:
  - the search boot code inside the `Page.astro` chunk (shortcut matching, `applySettings`, `openSearch`);
  - Vite's `preload-helper` chunk, **755 bytes**. In `dist/_astro/` only three chunks import it: the `Page.astro` chunk (that is, `search-boot.ts`'s `import('./search')`), `YourPathCard` and `search` itself. The invoice page loads no `YourPathCard`, so those 755 bytes are there only because of WP-33's dynamic import.
- **What could be trimmed:**
  - The `search` chunk has no CSS dependency. Loading it without Vite's preload wrapper would very probably remove those 755 bytes from every page: for example `build.modulePreload: false`, or a `resolveDependencies` that returns nothing for it. I did not build that variant.
  - `aria-haspopup="dialog"` could be rendered by the server rather than set by script (a few bytes).
  - The backlog row's own suggestion, minifying `theme-init.js` (1475 bytes gzipped as shipped), is the larger win.
  - The budget is a known backlog row, so I do not report it as a finding. But any fix for major 1 must not add bytes to the boot code, or the template pages fail the build.

### Search settings, shortcuts, session storage, filter chip

- **`searchSettings()`** (`src/scripts/search-render.ts:25-30`) returns `shortcutsEnabled()` and `lowData.get()`, with `prefers-reduced-data` as a second reason for low data. The dialog controller and the search page use it: the index is not preloaded with low data.
- **Shortcuts.** `matchShortcut` (`src/lib/shortcuts.ts`) has a `search` action for `/` (single key, only while shortcuts are on) and Ctrl+K / ⌘K (never with Alt or Shift). `handleShortcut` (`src/scripts/site.ts:31-46`) skips fields and open dialogs, and calls `openSearch()`. I checked in a browser (`wp33-review21-ui-misc.log`):
  - With `st.shortcuts` off, `/` does nothing, the hint is hidden and `aria-keyshortcuts` is `Control+K`. Ctrl+K opens the dialog.
  - Switching shortcuts off on `/about/` updates the header without a reload.
  - `/` with focus on the settings switch does not open search.
  - Opening by click puts focus in `#st-search-input`, and Escape returns it to the header control.
- **Session storage.** `st.search.arrival` goes through `src/lib/storage/session.ts` (`sessionValue`, which refuses keys without `st.`) and `session-flag.ts` (`sessionHas`). Outside `src/lib/storage/` and `store.ts`, nothing in `src/` touches Web Storage except main's `theme-init.js`.
- **Filter chip.** "My business types" is a `role="group"` labelled by `search.filters.label`, with a toggle button (`aria-pressed`). It is shown only when `profileBusinessTypes()` is not `null`, and starts off on every open.
  - Axe on the dialog with the chip pressed and results showing (WCAG 2.2 AA tags): no violations, light and dark.
  - The chip is 169×44px. Its pressed state shows a check mark and bold text as well as colour.

### `searchTranslator()`

`tests/dom/search.test.ts:212` compares `searchTranslator` with `t()` for every `search.*` string in both languages, at counts 0, 1, 2 and 7. It is part of the 3228 passing tests.

### Header from 1024 to 1365px

I measured `.st-topbar` with a profile and a stored path (`wp33-review21-ui-bar.log`) and without (`wp33-review21-ui-header.log`), at:

- **widths** 320, 640, 683, 720, 768, 1024, 1100, 1279, 1280, 1300, 1365, 1366, 1400 and 1440px. 640, 683 and 720px are what 200% zoom gives on 1280, 1366 and 1440px screens.
- **both languages and both themes.**

What I found:

- The page never scrolls sideways.
- From 1024px up the bar is one row (71px) with "My path" shown, in both languages and both themes.
- From 1024 to 1365px the control is 44×44px. Its accessible name is "Search"/"Soek" from the visually hidden label, and `aria-keyshortcuts` is "/ Control+K".
- From 1366px it is 146×44px (en) or 129×44px (af), with the word and the `/` hint.
- Below 1024px it keeps the word, 44px high, as on main.
- **Forced colours** at 1024, 1280 and 1440px: the round control keeps its border (`solid`, drawn in the system colour), and the icon shows (screenshots checked).

`wizard.spec.ts:369` checks one row only up to 1280px. My sweep covers 1281 to 1440px.

### WP-30/31/32 features

All their e2e suites pass in chromium, mobile and nojs (`interactive.spec.ts`, `wizard.spec.ts`, `templates.spec.ts`, `content.spec.ts`, `nojs.spec.ts`), and so does the full axe run. By hand I checked the settings page (the shortcuts switch, the live header update) and the header with My path's ring and a saved profile on a document page. I re-measured the template pages' budget. I found nothing that behaves differently from main.

## 2. The pass 20 fixes

Against the built index (`wp33-review21-probe1.log`, `wp33-review21-probe3.log`), finished and typed:

- **Source words followed by for/on/about/vir/oor.** These open the register's entry: `sources for tax`, `source for tax`, `sources on vat`, `sources about popia`, `sources for food`, `sources for company registration`, af `bronne vir btw`, `bronne vir belasting`, `bron vir sars`, `bronne oor btw`.
  - The other senses still open their targets: `source of income`, `where do i source stock`, `source stock`, `source for stock`, `where to source for stock`, `bron van inkomste`, `waar kry ek voorraad`.
  - The rule is `search-client.ts:617-624`.
- **Law words with two senses.** These open the legal sense: `labour law` (Employees), `credit regulations` (the credit section), `food law` and af `kos wet` (If you sell food), af `werk wet` and `arbeidswet` (Employees). `verbruikersbeskerming` and `besigheid wet` open the Legislation entry.
- **Single phrasings.**
  - `vat rate` and `btw koers` open the VAT glossary entry.
  - `tax rates` opens Tax and SARS.
  - `staff`, `hire staff`, `employment contract`, `personeel` and `personeel aanstel` open Employees.
  - `what is this site about` and `oor die toolkit` open "What this toolkit is".
  - `bee level` and `bee status` open the B-BBEE affidavit section.
- **Common owner queries** (registering, VAT, paying yourself, bank account, name, licence, invoice template, UIF, closing, eFiling, turnover tax, provisional tax, POPIA, sole proprietor, Pty Ltd, annual return, beneficial ownership; 50 queries over both languages) open the place they should.

**Spot-check of `WP-33-diff-2947fbf.md`.** I re-ran 37 of its queries on the built index: all 18 re-rated law-word items and 19 of the `?` rows. Every "Now first"/"After" in the file is what the tip returns. I agree with 34 of the verdicts. I would rate three differently (nit 1).

## Findings

### major 1: on first open the dialog waits for its script, so the first letters typed are lost and a click shows nothing (regression against `2947fbf`)

Files: `src/scripts/search-boot.ts:50` (`load`), `:58-68` (`openSearch`: when `<st-search>` is not yet defined it calls `load().then(() => host.open?.(from))` and nothing else); `src/components/search/SearchDialog.astro` (`49be8a0` removed its eager `<script>` import of `search.ts`).

At `2947fbf` every page loaded `<st-search>` up front. `/`, Ctrl+K or a click opened the server-rendered dialog and focused its field at once, and only the results code waited. The integration moved `<st-search>` behind a dynamic import to save budget. The dialog markup is still in the page, but nothing opens it until `search.*.js` (1.8 KB gzip, plus `rolldown-runtime`) has arrived and run. Meanwhile:

- the reader's keys go to the page, so whatever they type first is lost;
- a click on the header control gives no visible response: no dialog, no busy state;
- this happens on the first open of every page load, because every navigation starts with `<st-search>` undefined.

How I reproduced it (Playwright, chromium, 1280px, `/core/register/`, `wp33-review21-ui-slow.log` and `wp33-review21-ui-slow-2947fbf.log`):

| Step | `2947fbf` (port 4854) | `3dbb1be` (port 4853) |
| --- | --- | --- |
| `/`, then type `vat` at once (80 ms per key), local server, no throttling (three runs) | field holds `vat` | field holds `at`: the `v` is lost every time |
| Dialog script held 2 s; `/`, then `vat` | dialog open and field focused during the wait; field holds `vat` | during the wait `dialog.open` is false and focus is on `BODY`; it opens after 2142 ms with an **empty** field |
| Same, Ctrl+K | field holds `vat` | empty field, opened after 2088 ms |
| Same, click on the header control | dialog open at once | nothing for 2141 ms, then the dialog with an empty field |
| Dialog script fails (`route.abort()`) | — | `/` and click both go to `/af/search/`, as designed |

The fallback when the script fails to load is right. The cost is in the common case: a keyboard reader who uses the advertised `/` shortcut loses their first letter on every page, and on a phone network loses the whole query.

It does not break a feature already on main: main has no search. So under this pass's rule it could go to the backlog. I recommend fixing it before the merge anyway, because:

- the merge is what puts this behaviour on every page;
- the fix is small;
- the e2e tests cannot catch it. `field(page).fill(...)` waits for the field to appear, so it never types into the gap.

Suggested fix (it must stay within the 27 bytes of budget left; see "Budget" above):

- In `openSearch()`, when the element is not yet defined, open the server-rendered dialog straight away:
  - `host.querySelector('dialog')?.showModal()` and focus the field, remembering `from`;
  - then `load()`, and let `<st-search>` take over the open dialog. `connectedCallback` or `open()` needs a path that adopts a dialog that is already open, sets `#returnFocus` and calls `controller().then(c => c.opened())`;
  - on failure, keep today's move to the search page and carry the typed text as `?q=`.
- Pay for it by dropping Vite's preload helper from that import (755 bytes, see "Budget").
- Add an e2e test that holds `search.*.js`, presses `/`, types with `page.keyboard.type` (not `fill`), and expects the whole text in the field.

### minor 1: the "My business types" chip appears late and pushes the common questions down; the chip has no e2e or axe coverage

Files: `src/components/search/SearchDialog.astro:104-114` (the chip group, `hidden` in the markup); `src/scripts/search-ui.ts:123-126` (`opened()` unhides it only once the results code has loaded).

For a reader with saved answers, the dialog opens with the common questions. When `search-ui` arrives, the 44px chip row appears above the status line and everything below it moves down. With `search-ui.*.js` held 1.5 s (`st.profile.v1` = food, 1280px), the first common question's top went from y 274 to y 338. That is a 64px shift under the reader's finger or pointer (`wp33-review21-ui-misc.log`). With no delay the chip is there before the first measurement and nothing moves.

The chip is tested only in `tests/dom/search.test.ts`. No e2e test presses it in a browser, and the a11y suite opens the dialog without a profile, so axe never sees the chip. My manual axe run was clean.

Suggested fix:

- Decide whether the chip shows on the server-rendered side. The profile is in `localStorage`, which the boot code can read without new imports: `theme-init.js` already reads `st.profile.v1`, and could set a `data-has-profile` attribute that CSS uses.
- Or reserve the row's space while the results code loads.
- Add an e2e test with a seeded profile that presses the chip and checks the status count. Add the dialog with a profile to the axe "search dialog open" runs, in both themes.

Recommendation: backlog.

### minor 2: some "sources for <topic>" phrasings still open unrelated sections; the backlog row says they work

Built index, finished and typed unless noted (`wp33-review21-probe1.log`, and in memory at both commits, `q2-old.log` / `q2-new.log`):

| Query | First at `3dbb1be` | Same at `2947fbf` |
| --- | --- | --- |
| `sources for privacy` | `core/start-here/#what-is-in-this-toolkit` | yes |
| af `bronne vir privaatheid` | `af/core/start-here/#what-is-in-this-toolkit` | yes |
| `where are the sources for tax` | `core/paying-yourself/#uif-sources-disagree` | yes |
| af `waar is die bronne vir belasting` (typed) | `af/core/paying-yourself/#uif-sources-disagree` | yes |
| af `bronne vir kos` (typed; finished opens the Legislation entry) | `af/core/paying-yourself/#uif-sources-disagree` | yes |

None is a regression, and the register's entry is in the first three for the tax ones. But `docs/reviews/backlog.md:53` says '"Sources for <topic>" works', and these show it does not where:

- the topic word is not in a register heading (`privacy`: the entry is "POPIA");
- or a question frame comes first (`where are the`).

Suggested fix: when the backlog row is taken up, cover "sources for <topic>" as well. Add `privacy`/`privaatheid` as a keyword of the register's POPIA entry, and `where are the sources for` / `waar is die bronne vir` to the phrasings the source rule and the `search:diff` corpus know. Correct the backlog row's sentence now, with rows for `sources for privacy` and `bronne vir privaatheid`.

Recommendation: backlog.

### nit 1: three verdicts in `WP-33-diff-2947fbf.md` I would rate differently

- `:59`, `:76` af `bron vir maatskappybelasting` and `:60`, `:77` `bron vir tuiskantoor`, marked "neutral". They open the top of the register (`af/sources/`). English `sources for company tax` opens `sources/#paying-yourself-from-a-company`, and `sources for home office` opens `sources/#working-from-home-payments-and-personal-safety`. The register has the entry the reader wants, and the Afrikaans query lands on the page top. That is no worse than before, but it is not neutral either: it is an EN/AF gap.
- `:34` `company law` → `lookup/glossary#owner-managed-company`, marked "justified". The Companies Act is the company law. `companies act` opens the Legislation entry, and `company law` could too, as `business law`/`besigheid wet` now do.

Suggested fix: when the bets are next revised, add `maatskappybelasting`/`tuiskantoor` as keywords on those register entries, and `company law` as a bet for the Legislation entry. Correct the three verdicts.

Recommendation: backlog.

### nit 2: `employing staff` still opens Zoning

Pass 20 minor 3 named `hire staff`, `employing staff`, `staff` and `personeel`. The bets fix three of them. `employing staff` still opens `core/working-from-home-and-safety/#zoning`, finished and typed, the same at `2947fbf`. Exact-word bets are accepted, so this is a single phrasing. Zoning first for a staff question shows that the ranking still favours that section for the word "staff".

Suggested fix: a page keyword `staff` (and `personeel`) on `core/running-a-pty-ltd#employees-including-yourself` rather than a bet, so every phrasing with the word benefits. Add a row `employing staff`.

Recommendation: backlog.

## Rules

- No `innerHTML`, `insertAdjacentHTML` or `eval` in `src/scripts/search*.ts` or `src/lib/search*`.
- No `href="/` literal in the search components or pages.
- Storage goes only through `src/lib/storage/` and `store.ts`, under `st.` keys. No literal colour outside `tokens.css`: Stylelint passes, and the chip uses `--st-*` tokens only.
- No third-party request: `csp-and-network.spec.ts` passes.
- Every page works without JavaScript: the header control is a link to `/search/`, and the nojs suite passes.
- No `CLAUDE.md` rule is broken.
