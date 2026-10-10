# WP-50a review, pass 9

Tree: `115bdeb`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 8 and their fixes. Since pass 8 the only change is a backlog doc commit (`3d6b5a2..115bdeb`). The reviewer is fresh and independent, reviewed the whole package (`git diff 204a2a2..115bdeb`), and changed no code.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 1 |
| Minor | 2 |

- **M1 (major, a):** on a template page, when the form's script arrives while the reader is in or below the line items, the field they are looking at jumps by 52 to 133px (layout shift 0.156 to 0.248 at 360px). The "Remove line" and "Add line" buttons now appear only when the script is ready, with no room kept for them. On `204a2a2` nothing moved.
- **m1 (minor):** what is left of item 8. Five Afrikaans two-column tables still scroll sideways at 360px, the width of most phones, not only at 320px. One of them is the Afrikaans business-types hub, whose link column is cut off.
- **m2 (minor):** when the template module fails to load, the hidden tab strip leaves a blank 46px band above the form for good.

All 11 items are fixed on the built site, apart from M1's side effect on item 2 and m1's residue of item 8.

## Checks run

All logs are in the session scratchpad as `wp50a-review9-*.log`, and the probe scripts are in `r9/`.

- **Builds.** The probes ran against a copy of this tree's `dist/` (`r9dist`, served on port 4995). The `204a2a2` build is pass 8's `r8/base/dist`, which comes from a `git archive 204a2a2`. Its HTML still has `st-ring-draw` and the section label, so it predates the package. It was served on port 4996.
- **Server and browser.** Both builds were served under `/business-toolkit/` by `r9/serve.mjs`, and the probes used Playwright Chromium.
- **Timing.** The probes ran against those copies, outside the worktree. Nothing ran in the worktree while e2e or a11y was running.
- **Worktree.** After all the runs it had no changes besides this file. The visual run's new baselines (`tests/e2e/__screenshots__/`, untracked) were deleted.

`pnpm gate:fast` (`wp50a-review9-gate-fast.log`). The `DOMException … JavaScript file loading is disabled` stacks in the log come from `tests/dom/theme-init.test.ts`, which makes scripts fail on purpose. They are not failures.

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  78 passed (78)
      Tests  3277 passed (3277)
Content drift: none.
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

`pnpm build` (`wp50a-review9-build.log`):

```
07:39:11 [build] 198 page(s) built in 5.35s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

`pnpm content:fidelity --lang af` (`wp50a-review9-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e (`wp50a-review9-e2e.log`), with the brief's exact command (chromium, mobile and nojs, `PW_PORT=5001`, default reporters):

```
Running 1660 tests using 2 workers
  93 skipped
  1567 passed (14.3m)
EXIT 0
```

The log has 0 `✘` lines, and no flaky or retried tests.

`pnpm test:a11y` with `PW_PORT=5002` (`wp50a-review9-a11y.log`):

```
  416 passed (7.8m)
EXIT 0
```

The log has 0 `✘` lines.

`pnpm exec playwright test --project=visual`, with `PW_PORT=5003` (`wp50a-review9-visual.log`):

```
Running 146 tests using 2 workers
  146 failed
EXIT 1
```

- **What failed.** All 146 failures are "A snapshot doesn't exist … writing actual". No other `Error:` line is in the log.
- **What it shows.** The spec runs to the end on every shot. It has no baselines, so it cannot compare anything yet.

## The areas the brief singled out

### Template tabs: no dead controls

Probes: `r9/tpl.mjs`, `tpl-move.mjs` and `tplfail.mjs`. The logs are `wp50a-review9-probe-tpl*.log`.

- **Modules held, at 360×740 and 1280×900, en invoice and af quotation.**
  - The tab strip is `visibility: hidden` in its own room, so nothing can be tapped.
  - The preview, the "Print"/"Clear" buttons and the line buttons are not shown.
  - The no-JavaScript print line shows.
  - A value typed meanwhile is kept once the script arrives (`typed "businessName" kept as "Typed early"`).
- **Released.**
  - The tabs show in their room (1715 to 1717px, or 2px).
  - At 1280px the preview appears beside the form, and the form column keeps its width (440px).
- **But the controls inside the form had no room kept for them.** See M1.

### Search on a slow network

Probe: `r9/search.mjs`, which holds the dialog chunk and the index separately. The logs are `wp50a-review9-probe-search*.log`.

| Case | `115bdeb` | `204a2a2` |
| --- | --- | --- |
| Open with the dialog script held | status "Loading search…" ("Soektog laai tans…" in af) | status empty |
| Type "vat" while held | the common questions are hidden | the common questions stand under the query |
| Dialog script in, index held | still "Loading search…" | "Loading search…" |
| Index in | "12 of 59 results shown …" | the same |
| Open, close with Escape before the script, script arrives, reopen | "Loading search…" on reopen, cleared when the index arrives with an empty field | nothing said |
| Index request aborted | "Search could not load." and the failed state | the same |

Fixed, with no stuck state found.

### Language banner

Pass 8's measurement (no shift from the banner) was not repeated. Reading the code: the override sits in the component's scoped style (`LangBanner.astro:97-109`, the rule at `:105`). It points `--st-font-body` at the fallback for the banner only, so it does not leak.

### Summaries pipeline (`deriveSummary`, `content-meta`)

Probe: `r9/summaries.mjs`, the meta description and lead of all 197 pages, base against tip (`wp50a-review9-probe-summaries.log`).

```
pages 197, changed 12, raw folder names 0, newly empty 0
```

- **The 12 changes.**
  - The seven Afrikaans business-type pages and the af hub lose "Lees eers 01-core/…".
  - The receipt, quotation and privacy-notice pages lose the "make a copy … [SQUARE BRACKETS]" sentence.
- **Regressions.** None: no page lost its summary or gained a worse one.
- **The template intros** (`r9/intro.mjs`). Item 4's line about the form replaces the file instruction on the four templates that had one, in both languages. The legal notes stay ("Three rules you must follow…", the Information Officer note), and the tax invoice is unchanged.

### theme-init minify plugin and the CSP

- **The minified file.** `_astro/theme-init.DdaPI5cc.js` is 2,028 bytes (1,023 gzip). It is minified, ES2019 (an optional `catch{}` binding and template literals), and keeps its IIFE.
- **Inline scripts.** None of the built HTML files has an inline `<script>`.
- **The CSP.** Every page has the meta CSP (`script-src 'self'`), and it is unchanged.
- **The DOM tests.** They run the minified copy (gate above).

### Print, for every page the package touched

Probes: `r9/print.mjs` and `print-held.mjs`, using Chromium `page.pdf` A4 and `pdftotext`. The logs are `wp50a-review9-probe-print*.log`. Window sizes 360 and 1280 were each printed from both builds.

| Page | Result |
| --- | --- |
| `business-types/vehicle-dealer/`, `af/business-types/food/`, `core/tax-and-sars/`, `paperwork/free-tools/` | Same page count and words as `204a2a2`. The section label still prints, the "Words used in this file" list prints although it is closed on a phone (`print.css` opens `::details-content`), and the only change is the new Afrikaans summary. |
| `checklist/`, `af/checklist/` | Same pages and words; one line wraps at another word. |
| `templates/invoice/`, `af/templates/quotation/`, `templates/privacy-notice/`, after the script | The same sheet as `204a2a2`. |
| The same templates with the modules held | `204a2a2` printed a blank page (0 words). This tree prints the form as the sheet (84 to 221 words). That is an improvement. |

### Reflow, and the CSS changes on pages outside the audit's list

- **The reflow spec** (`tests/e2e/reflow.spec.ts`, in the chromium project of the e2e run) passes on every page.
- **A geometry sweep of all 197 pages at 320px on both builds** (`r9/sweep.mjs`, `wp50a-review9-probe-sweep320.log`):
  - No page scrolls sideways on either build.
  - 14 two-column tables stopped scrolling, and none started.
  - Every visible checklist box is 20px (it was 13px at its smallest on `204a2a2`).
  - Two three-column tables are 24px narrower, from the tighter cell padding below 480px.
  - The height and text changes are on document pages only: the closed word list, the hidden section label, and tables that now wrap.
- **Screenshots of untouched pages at 320×568** (`r9/shots/`):
  - Home, About, My path and Look it up are byte-identical to `204a2a2`.
  - `af/glossary/` and `sources/` differ only by item 1's header (no section label; the notice straight after the H1).

### WebKit-like behaviour approximated in Chromium

- **Scroll anchoring.** Safari does not do scroll anchoring. In Chromium, with the reader below the line items when the template script arrives, the page was scrolled by 105 to 157px to keep their place (`-tpl-move-lower.log`, `y3914 → y4071`, `y4610 → y4744`). Without that compensation, the reader would see that much movement on top of the visible jump in M1. Injecting `overflow-anchor: none` did not switch anchoring off in this Chromium, so this is inferred from the scroll offsets, not seen.
- **Selectors.** The selectors the package added need `:has()` (Safari 15.4), complex `:not()` (Safari 9), the `lh` unit (Safari 16.4) and `content: attr() / ''` (Safari 17.4, after a plain fallback). Each has a fallback or is far below today's iOS.
- **Not run:** WebKit itself is not installed (only Chromium is under `pw/`).

### Earlier fixes

The wizard (passes 2 to 8), the pill, the ring, the tables and the prompt names were not reworked here beyond the e2e, dom and sweep runs above, which all pass. A diff search of `src` for literal colours, `href="/…"`, direct storage, `nowrap`, `ellipsis` and new animations found nothing added beyond the ring's `transition`, which only runs after the first drawing, at `--st-duration-base`.

## Major

### M1. The template form jumps when its script arrives with the reader in or below the line items

**Category:** major (a), a regression against `204a2a2`. It is a side effect of the item 2 fix.

**Where:**

- `src/styles/utilities.css:24`: `[data-enhance]:not([data-ready]) .js-only { display: none !important }`;
- `src/styles/utilities.css:34`: the matching `.no-js-only` rule;
- `src/components/templates/TemplateTool.astro:81`: `data-enhance` on `<st-template-form>`;
- the controls they hit, in `src/components/templates/TemplateLines.astro`:
  - `:123`, "Remove line" under each line (44px plus the gap);
  - `:137`, "Add line";
  - `:161`, the no-JavaScript totals line, which goes away at the same moment.

**What happens.** Item 2 moved the template's "Fill in" / "Preview" tabs into a room kept with `visibility: hidden`, so they do not move anything. But `data-enhance` also hides every `.js-only` inside the form until the script is ready, with `display: none`, so those controls take no room until then. When the script arrives, a "Remove line" button appears under every visible line, "Add line" appears, and the totals line goes. Everything below moves.

The backlog foresaw this (`docs/reviews/backlog.md:41`, WP-32): "Showing the buttons only once connected would shift the layout on every load." The new e2e check, "a template before its script runs" (`tests/e2e/templates.spec.ts:594`), only checks that the form's top has not moved.

**Reproduced** with `r9/tpl-move.mjs` (`wp50a-review9-probe-tpl-move.log`, `-tpl-move-204a2a2.log`, `-tpl-move-lower.log`). Every module except theme-init is held. The reader scrolls into the form, the modules are released, and the field they were looking at is measured from the top of the screen:

```
tip     360x740 templates/invoice/ at 0.6: lines.1.description@132 -> @184  cls 0.156
tip     360x740 af/templates/quotation/ at 0.6: what-is-included.1@204 -> @337  cls 0.248
tip     360x740 templates/invoice/ at 0.7: payment-details.1:r0@202 -> @149  (page scrolled y3914 -> y4071)
tip     1280x900 af/templates/quotation/ at 0.6: what-is-included.1@244 -> @396  cls 0.056
204a2a2 360x740 templates/invoice/ at 0.6: lines.1.description@122 -> @122  cls 0.000
204a2a2 360x740 af/templates/quotation/ at 0.6: what-is-included.1@258 -> @258  cls 0.000
204a2a2 360x740 templates/invoice/ at 0.7: payment-details.1:r0@232 -> @232
```

- **Above the line items:** nothing moves, as on `204a2a2`.
- **In or just below them:** the field the reader is filling in moves by 52px (one line) to 133px (three lines). The layout shift is 0.156 to 0.248 on a phone, over the 0.1 limit the package itself holds the wizard and the banner to. On `204a2a2` it was 0.000 at every position.

On a slow phone the audit measured the template script at 12 to 13s. That is long enough for a reader to reach the line items. A tap there as the script lands can hit the wrong field, or the "Remove line" button that has just appeared under the line above.

**Fix.** Keep the room for these controls the way the tabs and the wizard's Next do:

- **The buttons.** Inside `st-template-form:not([data-ready])`, show `.st-tline__remove` and the "Add line" paragraph with `display: revert` (or `flex`) and `visibility: hidden`. Don't let `display: none` hide them. A hidden element takes no taps or focus, so item 2 holds.
- **The totals line.** Lay the no-JavaScript line out over the "Add line" room (`position: absolute`, as `.st-wizard__waiting` does), or give it the same height. Then its leaving moves nothing.
- **If the module fails to load.** Drop the reserved room with `html[data-st-script-failed~='TemplateTool'] st-template-form:not([data-ready]) …`. theme-init already records the name "TemplateTool" (`r9/tplfail.mjs`). See m2.
- **The test.** Extend "a template before its script runs" to scroll to a line item before the release, and check that it has not moved (within 1px) at 360×740, in both languages.

## Minor

### m1. Five Afrikaans two-column tables still scroll sideways on an ordinary phone, not only at 320px

**Category:** minor. This is what is left of item 8.

- **Better than before.** On `204a2a2` every one of these tables was 576px wide, and its second column started off screen.
- **Documented.** `docs/design-system.md:240` lists all five at 320px, and pass 3 accepted them.
- **What is new here.** The same five are not limited to 320px:
  - at 360px, four still scroll (the 327px column);
  - at 412px, three do.

**Where:** `src/components/ui/TableScroll.astro:91-118`. Cells keep `overflow-wrap: break-word`, which does not lower a column's min-content.

**Reproduced** with `r9/twocol.mjs` and `twocol-w.mjs` (`wp50a-review9-probe-twocol*.log`). The figures are table width / box width:

| Table | 320px | 360px | 412px |
| --- | --- | --- | --- |
| `af/business-types/` "Kies jou besigheidstipe" | 365/288 | 365/327 | fits |
| `af/branding/branding-prompts/` | 391/288 | 391/327 | 393/377 |
| `af/checklist/` calendar | 385/288 | 385/327 | 386/377 |
| `af/sources/` "Wie om te vra" | 426/288 | 426/327 | 427/377 |
| `af/start/how-to-use/` | 365/288 | 365/327 | fits |

On the Afrikaans business-types hub at 360px (`r9/af-bt-360.png`), the link column reads "Voertuighande…", "Kleinhandel en…" and "Professionele e…" at the screen edge. The links still work: the visible part can be tapped, and the region is labelled "Rol sywaarts…". That is why this is minor and not (b).

**Fix.** Below 480px, show a two-column table that still overflows as the stacked cards `TableScroll` already has for `wide` tables. The other way is to give those cells `data-label` and the `wide` flag at build time when the longest words of the two columns cannot fit 327px together.

**Backlog row:**

| WP-50a | Pass 9 minor 1: five Afrikaans two-column tables (the business-types hub, branding prompts, checklist calendar, sources and how-to-use) still scroll sideways at 360px, and three at 412px; the hub's link column is cut at the screen edge. | Stack two-column tables that still overflow below 480px (the `wide` cards), or mark them `wide` at build time. | `WP-50a-pass9.md` |

### m2. When the template module fails to load, a blank band is left where the tabs would be

**Category:** minor. `204a2a2` was worse here: it showed tabs and buttons that did nothing.

**Where:** `src/components/templates/TemplateTool.astro:339-341`. `st-template-form:not([data-ready]) .st-tool__tabs { visibility: hidden }` has no exception for a failed module.

**Reproduced** with `r9/tplfail.mjs` (`wp50a-review9-probe-tplfail.log`), which aborts the `TemplateTool` module:

```
tip     template module blocked: {"failed":"TemplateTool","tabs":"not shown h=46","hint":"shown h=45","totalsHint":"shown h=45","removeBtn":"not shown h=0","printBtn":"not shown h=0"}
204a2a2 template module blocked: {"failed":"TemplateTool","tabs":"shown h=46","hint":"not shown h=0","totalsHint":"not shown h=0","removeBtn":"shown h=44","printBtn":"shown h=44"}
```

What works: the no-JavaScript form, its print line and the totals line. What is left over: an empty 46px band above the form, which stays.

**Fix:** add `html[data-st-script-failed~='TemplateTool'] .st-tool__tabs { display: none }`. That is the same pattern as the wizard (`Wizard.astro`, `data-st-script-failed~='Wizard'`).

**Backlog row:**

| WP-50a | Pass 9 minor 2: when the template module fails to load, the hidden tab strip leaves a 46px blank band above the no-JavaScript form. | Hide the strip under `html[data-st-script-failed~='TemplateTool']`. | `WP-50a-pass9.md` |

## Not re-raised

- **"Words used in this file" without JavaScript.** It is closed on desktop too, where B6 says "open on desktop". Pass 1 accepted this (`WP-50a-pass1.md:181`), and `docs/design-system.md:902` records it.
- **The wizard's kinds of business after Back.** Without the back/forward cache, the order can change (pass 8 m1). It is in the backlog.
