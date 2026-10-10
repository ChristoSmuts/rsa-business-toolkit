# WP-50a review, pass 10

Tree: `365598f`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 9 and their fixes. Since pass 9 the code change is `4648480` (keep the room of every script control until the script runs), plus its docs commit. The reviewer is fresh and independent, reviewed the whole package (`git diff 204a2a2..365598f`), looked hardest at `git diff 0f08adb..365598f`, and changed no code.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 1 |
| Minor | 2 |

- **M1 (major, a):** before the template's script runs, the room kept for the required items and the actions is a blank band of 727 to 1,542px under the form: one to 2.7 phone screens of nothing, with no word about why. On `204a2a2` that room held the required items list and the buttons.
- **m1 (minor):** the required items list still shrinks when the script runs, by 22 to 170px, not 70. On the tax invoice and the privacy notice, text the reader is looking at moves by 118 to 170px (layout shift 0.089 to 0.168). It is the same or smaller on `204a2a2`.
- **m2 (minor):** a shared slot keeps the hidden no-JavaScript line's room when its partner is hidden too. That leaves 45 to 67px of blank above the storage warning when storage is blocked, and between the last line and the totals once all ten lines are shown.

All 11 items are fixed on the built site. M1 is a side effect of the item 2 fix.

## Checks run

All logs are in the session scratchpad as `wp50a-review10-*.log`, and the probe scripts are in `r10/`.

- **Builds.** The probes ran against a copy of this tree's `dist/` (`r10/dist`, served on port 5021). The `204a2a2` build is pass 8's `r8/base/dist`. Its `src/` matches a fresh `git archive 204a2a2` (only the generated `src/generated/` differs), and its HTML still has `st-ring-draw`. It was served on port 5022.
- **Server and browser.** Both builds were served under `/business-toolkit/` by `r10/serve.mjs`, and the probes used Playwright Chromium.
- **Timing.** The probes ran against those copies, outside the worktree. Nothing ran in the worktree while e2e or a11y was running.
- **Worktree.** After all the runs it had no changes besides this file.

`pnpm gate:fast` (`wp50a-review10-gate-fast.log`). The `DOMException … JavaScript file loading is disabled` stacks in the log come from `tests/dom/theme-init.test.ts`, which makes scripts fail on purpose. They are not failures.

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

`pnpm build` (`wp50a-review10-build.log`):

```
08:58:55 [build] 198 page(s) built in 5.32s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

`pnpm content:fidelity --lang af` (`wp50a-review10-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e (`wp50a-review10-e2e.log`), with the brief's exact command (chromium, mobile and nojs, `PW_PORT=5011`, default reporters):

```
Running 1670 tests using 2 workers
  93 skipped
  1577 passed (16.5m)
EXIT 0
```

The log has 0 `✘` lines, and no flaky or retried tests. The new `template-shift.spec.ts` ran its 8 tests (invoice and quotation, en and af, 360×740 and 320×568) and passed. `wizard-shift.spec.ts` passed all 16.

`pnpm test:a11y` with `PW_PORT=5012` (`wp50a-review10-a11y.log`):

```
Running 416 tests using 2 workers
  416 passed (7.6m)
EXIT 0
```

The log has 0 `✘` lines. axe runs on loaded pages, so it cannot see M1, which exists only before the script.

## The areas the brief singled out

### 1. The generic rule: `.js-only` keeps its room inside a `data-enhance` element

`src/styles/utilities.css:35-37` now gives `[data-enhance]:not([data-ready]) .js-only` `visibility: hidden !important` instead of `display: none`. Two elements have `data-enhance`: `<st-wizard>` and `<st-template-form>`.

**Tap, focus and reading out** (`r10/tpl.mjs`, `r10/wizard.mjs`; `wp50a-review10-probe-tpl-*.log`, `-wizard-tip.log`). Modules held, at 360×740:

| Check | `365598f` | `204a2a2` |
| --- | --- | --- |
| Tab from the top of the page to the footer: anything focused that is not seen (template, 4 pages) | none | 12 or more per page: "Fill in", "Remove line", "Add line", every required-item link, "Print or save as PDF", "Clear form" |
| The same on Find my path, en and af | none | (pass 8: Next was shown and dead) |
| The form's accessibility tree names "Add line", "Remove line", "Required items", "Clear", "Fill in" or "Preview" | none of them ("Print" is only in the no-JavaScript print line) | all of them |
| Element under the middle of "Print or save as PDF" | the form itself: the hidden button takes no tap | the button, which did nothing |

**`!important`.** Visibility is inherited, and only one element inside a `.js-only` sets its own: the wizard's waiting line (`Wizard.astro:417`, `visibility: visible`). It still shows, as intended (held: `"waiting":"shown"`). Nothing else inside a `.js-only` sets visibility, so the `!important` overrides nothing it should not. The other properties are untouched, and on the failure path the components' own `display: none !important` rules win as they should.

**Empty bands.**

- **Find my path:** no change. Before the script, 141px of space under question 1 (Next's room with "Loading the next step…", and the saved line's room). `wizard-shift.spec.ts`, which compares that space with `204a2a2`'s, passes. Failed, thrown or without JavaScript, it is 64px, the same as without JavaScript.
- **Templates, failed and no-JS:** no band (49px, the same in both).
- **Templates before the script:** a band of 727 to 1,542px. See M1.

### 2. Shared slots (`.st-tslot`)

Probe: `r10/misc.mjs` (`wp50a-review10-probe-misc-*.log`).

- **Reading order without JavaScript.** The lines block now reads "Line 10" → "Without JavaScript the totals are not worked out. Write them on the printed page." → "Totals" → "AMOUNT DUE". On `204a2a2` the line came after the empty totals. The explanation now comes before the totals it explains, next to the last line, and is read before the empty amounts. That is where a reader needs it, so this is acceptable, if anything better.
- **Blank under the shorter line.**
  - "Add line" with the totals line hidden under it: 31px from the button to the totals at 320px (en and af) and at 360px in Afrikaans, against 8 to 9px on `204a2a2`. That is 22px more, under one button. It reads as ordinary spacing.
  - "Saved on this device only" with the print line: the two lines are within 2px of each other in both languages.
  - Acceptable. The rare cases where the slot's room shows as a gap are m2.
- **Print** (`r10/print.mjs`, A4 `page.pdf` and `pdftotext`, `wp50a-review10-probe-print-tip.log`). Invoice, Afrikaans quotation and privacy notice, at 360 and 1280:

| State | Pages | Words | Typed name and line | Totals line, print line, saved line or "Add line" on paper |
| --- | --- | --- | --- | --- |
| Script ready | 1 | 53 / 95 / 235 | printed | none |
| Modules held | 3 / 3 / 2 | 88 / 143 / 223 | printed | none |
| Template module blocked | 3 / 3 / 2 | 88 / 143 / 223 | printed | none |
| No JavaScript | 3 / 3 / 2 | 88 / 143 / 223 | printed | none |

The held and blocked prints are the no-JavaScript print, word for word. The room kept for the required items and the actions does not reach paper (`print.css` hides `.js-only`, and only `[data-print-sheet]` prints).

### 3. The failure paths

- **Template module aborted** (`r10/tplfail.mjs`, `r10/tpl.mjs`):
  - `data-st-script-failed="TemplateTool"`;
  - the tab strip is `display: none` (0px; pass 9's 46px band is gone);
  - every `.js-only` in the form is `display: none`;
  - the print line and the totals line show.
  - The page is the no-JavaScript page to the pixel (the same 49px under the form). A typed name and line print (table above).
- **Wizard module aborted, or replaced by one that throws**, en and af (`r10/wizard.mjs`):
  - `data-st-script-failed="Wizard"`;
  - no stepper, and every `.js-only` is `display: none`;
  - nothing hidden takes focus;
  - after ticking an answer to each question, the no-JavaScript result button leads to `result/sole-prop/vehicle-dealer/not-started/`, as it does without JavaScript.
- **Held, then released:** the wizard becomes ready; the template becomes ready.

### 4. `template-shift.spec.ts`

It passes, and so does the wizard sweep (above). It covers the invoice and the quotation, from the top of the `.st-tform` to its end. It does not cover:

- the blank band under the form (M1);
- the content below the required list (m1);
- the tax invoice and the privacy notice, where m1 is largest.

### 5. The known leftover: the required items list shrinks

See m1. In short: the reader sees it, and it is not 70px everywhere: 22 to 170px. It is not a regression: `204a2a2` shrank the same list by the same amount, with shifts as large or larger.

## The 11 items, end to end

Probes: `r10/items.mjs` (pass 8's script, unchanged apart from the module path), `r10/venda.mjs`, and a `grep` of both builds (`wp50a-review10-probe-items-*.log`, `-venda.log`).

| # | Problem | `204a2a2` | `365598f` | Result |
| --- | --- | --- | --- | --- |
| 1 | AI notice below the first screen at 320×568 on vehicle-dealer | Notice top 753px (en), 696px (af): below the 568px screen | 414px in both languages; the 44px label row is in view | Fixed |
| 2 | Wizard Next and template tabs show but do nothing before their script | Modules held 1.5s: wizard Next shown, and a tap does nothing; template "Preview" shown, and a tap does nothing. Tab reaches 12 or more dead controls per template page | Next and both tabs not shown, so nothing to tap; nothing hidden takes focus; "Loading the next step…" in Next's room | Fixed. But the template's kept rooms leave a blank band under the form (M1) |
| 3 | Search dialog shows nothing while the index downloads | Index held, dialog open 1.5s: no "Loading search…" | "Loading search…" shown | Fixed |
| 4 | Invoice page shows the markdown's "make a copy … [SQUARE BRACKETS] … PDF" | The instruction is above the form (en and af) | Not above the form, and not in the meta description (en and af) | Fixed |
| 5 | "Now reading" pill cuts translated headings with an ellipsis | `nowrap` / `ellipsis` / `hidden`, clipped (en "Prompt: generate the file checklist for your brand", af "Deel 2: basiese beginsels van drukwerk wat geld spaar") | `normal` / `clip` / `visible`, not clipped, full title shown | Fixed |
| 6 | Language banner shifts the layout by 0.144 | Home, `st.lang=af`, fonts held then released, 360px: banner 237 to 185px, CLS 0.136, all from the banner | Banner 237 to 237px, no shift from the banner (total 0.020). At 320px the 0.190 total is not the banner (0.000 from it; 288 to 288px) | Fixed |
| 7 | Ring draws in for 960ms on every view; smooth scroll on Tab | `/checklist/` with a profile: `st-ring-draw:960` after load; `scroll-behavior: smooth` after Tab | No animation after load; `auto` after Tab | Fixed |
| 8 | Checkboxes shrink beside wrapped text; 576px tables cut two-column tables | `/checklist/` at 320px: checkboxes 13 to 20px wide; all four two-column tables 576px in a 288px box (en and af) | Every checkbox 20px; en tables 288/288; af "Kort/Beteken" 288/288 | Fixed. The af checklist calendar is 385px in 288px (was 576px). That is pass 9's m1, in the backlog |
| 9 | "Copied" names the wrong prompt | 16 of 16 wrong in each language ("Prompt 0: the business brief" gives "Prompt 4 copied") | 0 of 16 wrong in each language ("Copied: The refine prompt (use after every step)", "Gekopieer: Die verfyningsopdrag …") | Fixed |
| 10 | Raw folder name in summaries | 7 pages have a folder name in their meta description ("Lees eers 01-core/. Hierdie lêer …") | 0 pages | Fixed |
| 11 | Docs claim the web fonts cover the Venda letters | `docs/design-system.md:169` says latin-ext covers "ḓ, ṱ, ṋ, ṅ"; `/design-system/` has no "system font" line | Measured: neither the latin nor the latin-ext file of Fraunces or Instrument Sans has ḓ ṱ ṋ ṅ Ḓ Ṱ Ṋ Ṅ (ł ő ā found in latin-ext, ô ë in latin). The doc now says so, and the page labels the line "system font" | Fixed |

### Earlier passes

Nothing accepted in passes 1 to 9 has regressed, as far as these runs show:

- **The test runs.** e2e (chromium, mobile, nojs), dom, unit and a11y all pass.
- **The 11 items.** The table above.
- **Pass 9 m2.** No band is left when the template module fails (above).
- **Wizard fixes (passes 2 to 8).** The wizard probes above, plus `wizard.spec.ts` and `wizard-shift.spec.ts`.
- **Diff search.** A search of the pass 9 diff found:
  - no new literal colours, `href="/…"`, direct storage, `nowrap`, `ellipsis` or animation;
  - no new UI string.

## Major

### M1. Before the template's script, the form is followed by one to 2.7 screens of blank

**Category:** major (a), a regression against `204a2a2`. It is the item 2 fix's generic rule. It fails check 1 of the brief: "nothing visible is left as an unexplained empty band before the script".

**Where:**

- `src/styles/utilities.css:35-37`: `[data-enhance]:not([data-ready]) .js-only { visibility: hidden !important; }`;
- the two big rooms it keeps, in `src/components/templates/TemplateTool.astro`:
  - `:225`, `<section class="st-tool__required js-only …">`: the heading "Required items", its note, and a link for every required item;
  - `:244`, `<div class="st-tool__actions js-only …">`: "Print or save as PDF", "Start next …", "Clear form" and their hints.

**What happens.** Pass 9's fix keeps the room of every `.js-only` in the form, to stop "Remove line" and "Add line" from pushing the field the reader is in. That works. But the same rule also keeps the room of the required items section and the actions, both below the form, unseen. Until the script runs, the reader who scrolls past the last field finds blank cream, then the next section of the page. Nothing says what is missing or why. If the module request hangs and never fails, the band stays.

On `204a2a2` the same room held the "Required items" heading, its note and a list of links to each required field. Those are plain `#` links that work without the script. It also held the buttons, which did nothing (item 2). On `0f08adb` (pass 9's tree) the room was not kept (`display: none`), so there was no band.

**Reproduced** with `r10/tpl.mjs` and `r10/band.mjs` (`wp50a-review10-probe-tpl-tip.log`, `-tpl-204a2a2.log`, `-band-tip.log`). Every module except theme-init is held (excerpt; the log has the full JSON):

```
tip     360x740 templates/invoice/ held: lastVisibleBottomInForm 5057, next "Invoice numbering" at 6397 -> blankBelowForm 1340
tip     360x740 af/templates/quotation/ held: blankBelowForm 1541
tip     360x740 templates/privacy-notice/ held: blankBelowForm 798
tip     360x740 af/templates/receipt/ held: blankBelowForm 933
tip     (released, failed, no-JS): blankBelowForm 40 to 49
204a2a2 360x740 (same four pages) held: blankBelowForm 40, required list and actions shown
```

The band's size by page and window (the kept rooms, `-band-tip.log`):

| Page | 360×740 | 320×568 | 1280×900 |
| --- | --- | --- | --- |
| en invoice | 1,290px (1.74 screens) | 1,289px (2.27) | 1,096px (1.22) |
| af quotation | 1,492px (2.02) | 1,542px (2.71) | 1,221px (1.36) |
| en tax invoice | 1,220px (1.65) | 1,245px (2.19) | 1,000px (1.11) |
| en receipt | 906px (1.22) | 905px (1.59) | 712px (0.79) |
| en / af privacy notice | 749 / 727px (1.0) | 749 / 726px (1.3) | 632px (0.70) |

Screenshots: `r10/shots/tip-360-templates_invoice_-band.png` (the last field, then a blank screen) against `r10/shots/204a2a2-360-templates_invoice_-band.png` (the last field, then "Required items" and its links).

**Who sees it.**

- **Readers who skim.** On a slow phone the template script arrived at 12 to 13s in the audit. A reader who scrolls to see what the page holds, or who taps a contents link to a section after the form, reaches the band within that time.
- **Readers who scroll back.** Below the band, scrolling up shows a screen or two of nothing.
- **A hung module.** The band stays for good.

`template-shift.spec.ts` only sweeps the `.st-tform` itself, and "a template before its script runs" only checks the form's top, so neither can see the band.

**Fix.** Keep a room only for controls that sit among content the reader may be in: the tabs, "Remove line", and "Add line" in its slot. Don't keep one for the two blocks under the form:

- **The required items.**
  - This is mostly not a script control. The heading, note and links work without the script; only the count line (`data-required-count`) and the hiding of present items need it.
  - Show the section before the script. Keep `.js-only` on the count line only.
  - Render the list in the state the script will put it in for an empty form, so it does not shrink (m1).
  - Without JavaScript it can stay hidden as today.
- **The actions.** Either:
  - use `display: none` until ready, as at `0f08adb`; they only push content below the form, and Chromium's scroll anchoring held the reader's place there in pass 9's probes; or
  - keep the room, and show one line in it like the wizard's "Loading the next step…" (for example, "Print and Clear will be here when the page has loaded. You can print now with your browser's Print command.").
- **Tests.** Extend "a template before its script runs" (`tests/e2e/templates.spec.ts:595`) to check that no vertical run of more than about 100px inside `<st-template-form>` is without visible content. Do it at 360×740 for all five templates in both languages.

## Minor

### m1. The required items list shrinks by up to 170px when the script runs

**Category:** minor. This was already present at `204a2a2`, and it is outside the 11 items. It is the "known leftover", which is larger than the 70px recorded.

**Where:** `src/components/templates/TemplateTool.astro:224-241`, the list as rendered, and `src/scripts/template-form.ts:484-508`, which hides items on its first run:

- items already present (the first row of a list, a prefilled date);
- items under a threshold the empty form does not reach (`requiredAbove`).

**Reproduced** with `r10/req.mjs` (`wp50a-review10-probe-req.log`), at 360×740 with the modules held, then released:

```
invoice:        h972 18 items -> h902 16 items; hidden: intro.6:r0, payment-details.1:r4
tax-invoice:    h902 16 items -> h758 13 items; hidden: intro.5:r0, to.1:2(above 500000), payment-details.1:r4
privacy-notice: h540  9 items -> h422  6 items; hidden: what-we-collect.1, why-we-collect-it.1, who-we-share-it-with.2
receipt:        h588 10 items -> h566  9 items
quotation:      h1197 20 items -> h1175 19 items
```

**Does a reader see it?** Yes: whenever what is below the list is on screen when the script arrives. With `r10/shrink.mjs` (`wp50a-review10-probe-shrink-*.log`), the reader is placed at the required list, at the actions, just after the form, and at the end of the page:

- **At the list, or at the end of the page:** nothing visible moves (the shrink is below them, or the scroll clamps).
- **At the actions or just after the form:** Chromium's scroll anchoring holds the text in place on the invoice, quotation and receipt (scrollY moves 22 to 71px instead). On the tax invoice and the privacy notice it does not:

```
tip     360x740 tax-invoice at actions:       "The seven things a full tax in…" @429 -> @285  cls 0.120
tip     360x740 af/tax-invoice at actions:    "Die sewe dinge wat ’n volledig…" @430 -> @260  cls 0.148
tip     320x568 tax-invoice at actions:       @430 -> @260  cls 0.168
tip     360x740 privacy-notice at after:      "If you take ID copies" @450 -> @331  cls 0.089
tip     320x568 af/privacy-notice at after:   @364 -> @246  cls 0.122
204a2a2 360x740 tax-invoice at actions:       cls 0.176
204a2a2 320x568 tax-invoice at actions:       cls 0.269
204a2a2 320x568 privacy-notice at after:      "Last updated" @55 -> @-64  cls 0.188
```

Safari has no scroll anchoring, so there the text moves on every template, by the amounts above. It is no worse than `204a2a2`, where the same shrink happened with the list visible.

**Fix.** Render the list as the script will leave it for an empty form:

- mark `hidden` server-side the items whose fields have a default (the first list row, a prefilled date);
- mark `hidden` the `requiredAbove` items whose threshold zero totals cannot reach;
- write the starting count line ("2 of 18 required items present") into the HTML;
- with saved answers, the list can still change, but no longer on every first visit;
- extend `template-shift.spec.ts` to positions below the form, on all five templates.

**Backlog row:**

| WP-50a | Pass 10 minor 1: when the template script runs, the required items list shrinks by 22 to 170px (tax invoice 144px, privacy notice 118px), and text below it moves 118 to 170px where scroll anchoring does not hold it (always, in Safari). Same at `204a2a2`. | Render the list in the state the script gives an empty form (present and below-threshold items `hidden`, the count line written), and sweep below the form in `template-shift.spec.ts` on all five templates. | `WP-50a-pass10.md` |

### m2. A shared slot keeps a blank room when both its lines are hidden

**Category:** minor. These are rare states, and only blank space is added: nothing is lost, moved under the reader or hidden. It is 45 to 67px worse than `204a2a2` in two states. M1 is the large version of the same pattern.

**Where:** `src/components/templates/TemplateTool.astro:360-363`. After the script, the no-JavaScript line in each `.st-tslot` is `display: block; visibility: hidden`, so the slot keeps its height even when its partner is hidden:

- `TemplateTool.astro:100-108`: "saved on this device only" is hidden by `st-storage-notice` when storage fails;
- `TemplateLines.astro:141-148`: "Add line" is hidden once all ten lines show (`template-form.ts:474`).

**Reproduced** with `r10/misc.mjs` (`wp50a-review10-probe-misc-*.log`):

| State | `365598f` | `204a2a2` |
| --- | --- | --- |
| Storage blocked (`localStorage` throws), 360px, en invoice | a 45px empty slot, then the warning (`firstSlot h45 top1646`, warning top 1699) | the warning at the top of the stack |
| Same, 320px, af quotation | a 67px empty slot above the warning | no gap |
| All ten lines shown, 360px en | 61px from the last line to the totals | 16px |
| Same, 320px, or af at 360px | 83px | 16px |

**Fix:**

- Let a slot's hidden line keep its room only while its partner shows, for example `.st-tslot:has(> [hidden], > * > [hidden]) > .no-js-only { display: none !important }` (the storage line hides itself; "Add line" hides its button inside the paragraph).
- Or remove the hidden line once its partner is hidden. That cannot move anything the reader is in, since the partner has just gone.

**Backlog row:**

| WP-50a | Pass 10 minor 2: a template `.st-tslot` keeps the unseen no-JavaScript line's room when its partner is hidden too: 45 to 67px of blank above the storage warning when storage is blocked, and 61 to 83px (was 16px) between the last line and the totals once all ten lines show. | Keep the line's room only while the partner shows (`:has()` on the slot), or drop it when the partner hides. | `WP-50a-pass10.md` |

## Not re-raised

- **Five Afrikaans two-column tables scroll sideways at 360px.** This is pass 9 m1, in the backlog.
- **The wizard never becomes ready if a module hangs.** This is pass 6 m2 and pass 7 m1, in the backlog. M1 has the same cause on the template page: a hung request leaves the band for good.
- **The wizard's kinds of business after Back without the back/forward cache.** This is pass 8 m1, in the backlog.
