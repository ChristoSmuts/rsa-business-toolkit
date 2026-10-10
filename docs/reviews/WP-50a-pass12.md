# WP-50a review, pass 12

Tree: `bfef911`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 11 and their fixes. Since pass 11 the code change is `13078ea` (share the required-list rules, and never rewrite the count), plus its docs commit `bfef911`. The reviewer is fresh and independent, reviewed the whole package (`git diff 204a2a2..bfef911`), looked hardest at `git diff 11f5644..bfef911`, and changed no code.

## Verdict: clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 0 |
| Minor | 0 |

- All 11 items are fixed on the built site (table below).
- Pass 11's m1 and m2 are fixed: the count line is no longer written on load, and the server and the script now use the same rules.
- The refactor did not change what a reader sees while filling a template. Before and after the refactor, 156 steps across all five templates in both languages give the same result.
- Pass 11's m3, m4 and m5 are unchanged and are in the backlog (`backlog.md`), so they are not raised again.
- No new problem was found.

## Checks run

All logs are in the session scratchpad as `wp50a-review12-*.log`, and the probe scripts are in `r12/`.

- **Builds.** The probes ran against copies of the built sites:
  - this tree's build, copied to `r12/dist` and served on port 5042;
  - pass 11's tree (`f609747`, the code before the refactor), `r11/dist`, served on port 5041;
  - `204a2a2`, pass 8's `r8/base/dist`, served on port 5043.

  All three were served under `/business-toolkit/` by `r11/serve.mjs`, and the probes used Playwright Chromium.
- **Worktree.** No probe ran in the worktree. After all the runs, the worktree had no changes besides this file.

`pnpm gate:fast` (`wp50a-review12-gatefast.log`):

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  79 passed (79)
      Tests  3287 passed (3287)
Content drift: none.
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

`pnpm build` (`wp50a-review12-build.log`):

```
11:29:09 [build] 198 page(s) built in 6.17s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

`pnpm content:fidelity --lang af` (`wp50a-review12-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e (`wp50a-review12-e2e.log`). The exact command in the brief was used: chromium, mobile and nojs, `PW_PORT=5031`, default reporters.

```
Running 1720 tests using 2 workers
  93 skipped
  1627 passed (20.6m)
EXIT 0
```

- The log has no `✘` lines, and no test was flaky or retried.
- The 20 new runs of "the script leaves the rendered required list and count as they are" (ten pages, chromium and mobile) all passed. That is pass 11's 1,607 tests plus these 20.
- The sweep lines are the same as in pass 11:

```
template sweep en invoice 360x740: 39 positions, worst shift 0.000, worst scroll 0.0px, worst field movement 0.0px
template sweep af quotation 320x568: 53 positions, worst shift 0.000, worst scroll 0.0px, worst field movement 0.0px
(all 16: worst shift 0.000, worst scroll 0.0px, worst field movement 0.0px)
template blank runs en invoice: 360px: 94px, 320px: 94px, 1280px: 69px
template blank runs af receipt: 360px: 94px, 320px: 94px, 1280px: 35px
(all 10: 94px at 360 and 320, 35 to 69px at 1280)
```

`pnpm test:a11y` with `PW_PORT=5032` (`wp50a-review12-a11y.log`):

```
Running 416 tests using 2 workers
  416 passed (8.2m)
EXIT 0
```

The log has no `✘` lines.

## The pass 11 change (`11f5644..bfef911`)

### The count line on load

Probe: `r12/req.mjs` (pass 11's script, `wp50a-review12-probe-req-tip.log`). For each template in both languages, at 360×740, the probe holds the modules. It records the list and the count, observes the count line, releases the modules, and records them again.

| | Pass 11 (`f609747`) | `bfef911` |
| --- | --- | --- |
| Count as rendered | `" 2 of 18 required items present "` (spaces at both ends) | `"2 of 18 required items present"` |
| Writes to the `role="status"` line on load | 1 on every page | 0 on all ten pages |
| Items, count text and list height, before and after the script | the same | the same |

- The built HTML is `<p role="status" data-required-count>2 of 18 required items present</p>`, with no whitespace, on all ten pages. The af pages have the same, for example `2 van 18 verpligte items is ingevul`.
- The guard now compares trimmed text (`template-form.ts:522`). Even if whitespace came back, the first run would still write nothing.
- `#lastStatus` is not seeded from the rendered text, but it does not need to be. Before the first write, the trimmed-text check covers it. After that, the line always holds `#lastStatus`.

### The shared rules

- `required-rules.ts` holds `readable()`, `requiredApplies()` and `fieldPresent()`. `required.ts:33-46` and `template-form.ts:483-511` both call them.
- Read side by side with the old code:
  - `requiredApplies(above, total)` is `above === undefined || total > above`. The script's old test was exactly this. The server's old test, `!(0 > above)`, is its negation at a total of 0. A `NaN` from a bad attribute gives "does not apply" in both, as before.
  - `fieldPresent(value, kind, followed)` passes `undefined` when there is no `follows`. Otherwise it passes the followed value, or `''`. As before, a value counts when it is not blank and the form can read it. Failing that, the field counts when the field it follows is not blank. The followed value is not checked for readability, as before.
  - "Lines" is still never present on the server, and the script still works it out from the lines.

### While a reader fills a template

Probe: `r12/fill.mjs` (`r12/fill-pre.log` and `r12/fill-tip.log`). The same script runs against pass 11's build, before the refactor, and against this build. It covers all five templates in both languages, at 360×740. After each step it records three things: the required items shown, the count text (trimmed), and the number of writes to the count line. The steps are:

- refused values: `abc` in the receipt's two money fields, and `x` in the quotation's two number fields; then `-5` and `150.00`, and `50`;
- `follows`: on the invoice and tax invoice, the followed invoice number is emptied. Then the follower is filled and emptied, and the invoice number is set to a value, to spaces, and to a value again;
- the amount threshold: one line, with the price at 4999.99, 5000, 5000.00, 5000.01, `abc` and 1000, and the quantity at 6 and -1;
- every remaining field filled;
- Start next (where the template has it);
- a reload, which restores the draft;
- Clear, confirmed in the dialog;
- a reload after Clear.

Result: the two logs are the same on all 156 steps (`diff` prints nothing). Some examples from this build:

```
tip en tax-invoice | line price 4999.99 | n=13 count="3 of 16 required items present" writes=1
tip en tax-invoice | line price 1000 | n=12 count="3 of 15 required items present" writes=1
tip en tax-invoice | qty 6 (6000) | n=13 count="3 of 16 required items present" writes=1
tip af receipt | refused money intro.4:r3=abc | n=9 count="1 van 10 verpligte items is ingevul" writes=0
tip af quotation | refused number payment.1:0=x | n=19 count="1 van 20 verpligte items is ingevul" writes=0
tip en invoice | followed intro.6:r0 emptied | n=18 count="0 of 18 required items present" writes=1
tip af tax-invoice | start next | n=4 count="11 van 15 verpligte items is ingevul" writes=1
tip af tax-invoice | reload with draft | n=4 count="11 van 15 verpligte items is ingevul" writes=0
tip en invoice | clear | n=16 count="2 of 18 required items present" writes=1
tip en invoice | reload after clear | n=16 count="2 of 18 required items present" writes=0
```

The tax invoice's "required above R5,000" item applies from a line of R4,999.99. That is because the template's total includes 15% VAT (R5,749.99). It behaved the same before the refactor.

### The new test

`templates.spec.ts:706-752` holds the modules, observes the count line, and releases them. It then expects the same items, the same count, and no writes, on all five templates in both languages. It would have failed on pass 11's tree: there, `r11/req.mjs` saw one write on every page. It ran 20 times (chromium and mobile), and every run passed.

### The new backlog rows

`backlog.md` gains rows for pass 11's m3 and m4, and the existing "never becomes ready" row now covers the template form too (m5). The figures in the rows match pass 11, and this pass's probes reproduce them:

- `returning.mjs` and `blocked.mjs` give the same output as in pass 11;
- `hang.mjs` still shows "Loading the form tools…" and the empty-form count 20s after a hung module.

## The 11 items, end to end

Probes: `r12/items.mjs` (pass 8's script) on this build and on `204a2a2` (`wp50a-review12-probe-items-tip.log` and `-items-204a2a2.log`), `r12/venda.mjs` (`-venda.log`), `r12/notice.mjs` (`-notice-tip.log`), and a `grep` of both builds.

| # | Problem | `204a2a2` | `bfef911` | Result |
| --- | --- | --- | --- | --- |
| 1 | AI notice below the first screen at 320×568 on vehicle-dealer | Notice top at 753px (en) and 696px (af) | 414px in both languages. On all 72 document pages, with and without JavaScript, the highest notice top is 501px (af beauty, no JavaScript); the limit is 524px. | Fixed |
| 2 | Wizard Next and template tabs show but do nothing before their script | Both "SHOWN and a tap does nothing" | Neither is shown, so there is nothing to tap. The waiting lines sit in their rooms. | Fixed |
| 3 | Search dialog shows nothing while the index downloads | `loading=false` | `loading=true` ("Loading search…") | Fixed |
| 4 | Invoice page shows the markdown's "make a copy … [SQUARE BRACKETS] … PDF" | Shown above the form, in en and af | Not above the form, and not in the meta description | Fixed |
| 5 | "Now reading" pill cuts translated headings with an ellipsis | `nowrap` / `ellipsis`, clipped | `normal` / `clip` / `visible`, not clipped, full title in both languages | Fixed |
| 6 | Language banner shifts the layout by 0.144 | 360px: banner 237 → 185px, 0.136 from the banner | 237 → 237px, nothing from the banner. At 320px also nothing (288 → 288px). | Fixed |
| 7 | Ring draws in for 960ms on every view; smooth scroll on Tab | `[st-ring-draw:960…]`; `smooth` | `[]`; `auto`. Later changes use `--st-duration-base`, which is 0ms under reduced motion (`tokens.css:354-360`). | Fixed |
| 8 | Checkboxes shrink beside wrapped text; 576px tables cut two-column tables | Checkboxes 13 to 20px; four tables 576/288 cut | Every checkbox 20px; en tables 288/288; af "Kort/Beteken" 288/288 | Fixed. The af calendar is 385/288; that is pass 9 m1, in the backlog. |
| 9 | "Copied" names the wrong prompt | 16 of 16 wrong in each language | 0 of 16 wrong in each language | Fixed |
| 10 | Raw folder name in summaries | 7 pages have one in their meta description | 0 pages | Fixed |
| 11 | Docs claim the web fonts cover the Venda letters | No "system font" line | Measured: no Fraunces or Instrument Sans file has ḓ ṱ ṋ ṅ Ḓ Ṱ Ṋ Ṅ. `docs/design-system.md:169` says so, and `/design-system/` labels the line "system font". | Fixed |

Note on item 1: `notice.mjs` flags only the design-system specimen pages (`/design-system/content/`, at 664px with JavaScript). They show the component on purpose and are not document pages.

## The full sweep

| Area | Probe and log | Result |
| --- | --- | --- |
| Wizard: held, blocked, throwing, no JavaScript, en and af | `wizard.mjs`, `-wizard-tip.log` | Same as in pass 11: 141px below question 1 while held; the no-JavaScript form (64px) when blocked, throwing or without JavaScript; it reaches the result page; nothing hidden takes focus. |
| Templates before the script | `tpl.mjs`, `-tpl-tip.log` | Same as in pass 11, line for line (timings aside). |
| Template module blocked | `tplfail.mjs`, `-tplfail-tip.log` | `data-st-script-failed="TemplateTool"`, no tabs, the print and totals lines shown, no rooms. |
| Any element moving when the script arrives, all five templates, en and af, 360 and 320 | `sweep.mjs`, `-sweep-tip.log` | 702 positions in total. At every position, the worst movement of any element is 0px and the worst layout shift is 0.000, and no position hides movement. |
| The waiting line: contrast, forced colours, 200% and 400% zoom | `waiting.mjs`, `contrast.mjs` | Same as in pass 11 (6.88:1 light, 8.06:1 dark; one line at 320px in af). |
| Slots, storage blocked, ten lines, no-JavaScript reading order | `slots.mjs`, `misc.mjs` | Same as in pass 11 and pass 10. |
| Print, in every state, 360 and 1280 | `print.mjs`, `-print-tip.log` | The page and word counts are the same as in pass 10's log. For example, the invoice's sheet is 1 page when ready and 3 pages when held, failed or without JavaScript, the same as in pass 10. |
| Reflow at 320px, with and without JavaScript | e2e `reflow.spec.ts`, `nojs.spec.ts` | All pass. |
| No-JavaScript | e2e `nojs` project | All pass. |
| Accessibility tree and axe | e2e (wizard waiting line in the tree), `pnpm test:a11y` | See above. |
| House rules in the package diff | `git diff 204a2a2..bfef911 -- src scripts` | No literal colours, no `href="/…"`, no direct storage, no `nowrap`. The only `ellipsis` is in a comment. The one `transition` uses a token. `en.json` and `af.json` have the same 663 keys. |

## Not raised again

These are already in the backlog, and nothing about them changed in this pass:

- Pass 11 m3: with a saved draft, the required list shrinks when the script runs.
- Pass 11 m4: with storage blocked, the warning pushes the form down.
- Pass 11 m5 and the wizard row: a module that never arrives leaves the waiting line for good.
- Pass 9 m1: Afrikaans two-column tables at 320 to 412px.
- Pass 8 m1: after Back without the back/forward cache, the wizard loses the order in which kinds of business were ticked.
