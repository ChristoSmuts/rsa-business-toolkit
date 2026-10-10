# WP-50a review, pass 11

Tree: `f609747`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 10 and their fixes. Since pass 10 the code change is `1748b13` (render the empty form's state before the script, not blank room), plus its docs commit. The reviewer is fresh and independent, reviewed the whole package (`git diff 204a2a2..f609747`), looked hardest at `git diff 4158f98..f609747`, and changed no code.

## Verdict: clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 0 |
| Minor | 5 |

- **m1 (minor):** the script's first run still rewrites the count line, a `role="status"` live region, on every template in both languages. The server renders it with spaces around the text, so the guard `text !== status.textContent` never matches. The visible text does not change, but the code comment and `docs/design-system.md` say the first run writes nothing. `204a2a2` also wrote the line on load.
- **m2 (minor):** the server and the script do not share the required-list rules. `emptyFormRequired()` copies them, `readable()` included, and no test compares the two outputs. The unit test pins the server function to hand-copied counts.
- **m3 (minor):** a reader returning with a saved draft still sees the required list change when the script runs. It shrinks by 144px, and on the privacy notice the text under the buttons moves 48px (layout shift 0.162). This is smaller than at `204a2a2` (48 to 263px, 0.262 to 0.344).
- **m4 (minor):** with storage blocked, the storage warning appears above the form when the script runs, and the first field moves down 97px (en) or 123px (af), with layout shift 0.098 or 0.124. At `204a2a2` it was 89px or 115px, with layout shift 0.097 or 0.125.
- **m5 (minor):** if the template module never arrives, "Loading the form tools…" stays for good, and the count line and list never change while the reader types. This is the wizard's known backlog item, and the template has it too.

All 11 items are fixed on the built site. Pass 10's major (M1, the blank band) is fixed: the widest blank run before the script is now 94px (it was 727 to 1,542px). Pass 10's two minors are fixed too.

## Checks run

All logs are in the session scratchpad as `wp50a-review11-*.log`, and the probe scripts are in `r11/`.

- **Builds.** The probes ran against a copy of this tree's `dist/` (`r11/dist`, served on port 5031). The `204a2a2` build is pass 8's `r8/base/dist`, which still has `st-ring-draw` in its HTML; it was served on port 5032. Both were served under `/business-toolkit/` by `r11/serve.mjs`, and the probes used Playwright Chromium.
- **Timing.** The probes ran outside the worktree. The any-element sweep (below) started only after e2e and a11y had finished.
- **Worktree.** After all the runs it had no changes besides this file.

`pnpm gate:fast` (`wp50a-review11-gate-fast.log`). The `fail` stack frames in the log come from `tests/dom/theme-init.test.ts`, which makes scripts fail on purpose. They are not test failures.

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

`pnpm build` (`wp50a-review11-build.log`):

```
10:18:17 [build] 198 page(s) built in 5.70s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

`pnpm content:fidelity --lang af` (`wp50a-review11-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e (`wp50a-review11-e2e.log`), run with the exact command in the brief (chromium, mobile and nojs, `PW_PORT=5021`, default reporters):

```
Running 1700 tests using 2 workers
  93 skipped
  1607 passed (19.0m)
EXIT 0
```

The log has no `✘` lines and no flaky or retried tests. The new tests all ran and passed:

- the ten "before the script, no blank run over 120px in the tool" tests;
- "a slot keeps no room once both its lines are hidden";
- the 16 `template-shift.spec.ts` sweeps, which now cover four templates;
- all 16 `wizard-shift.spec.ts` tests.

The sweep's own lines:

```
template sweep en invoice 360x740: 39 positions, worst shift 0.000, worst scroll 0.0px, worst field movement 0.0px
template sweep af quotation 320x568: 53 positions, worst shift 0.000, worst scroll 0.0px, worst field movement 0.0px
template sweep en tax-invoice 360x740: 34 positions, worst shift 0.000, worst scroll 0.0px, worst field movement 0.0px
template sweep af privacy-notice 320x568: 28 positions, worst shift 0.000, worst scroll 0.0px, worst field movement 0.0px
(all 16: worst shift 0.000, worst scroll 0.0px, worst field movement 0.0px)
template blank runs en invoice: 360px: 94px, 320px: 94px, 1280px: 69px
template blank runs af receipt: 360px: 94px, 320px: 94px, 1280px: 35px
(all 10: 94px at 360 and 320, 35 to 69px at 1280)
```

`pnpm test:a11y` with `PW_PORT=5022` (`wp50a-review11-a11y.log`):

```
Running 416 tests using 2 workers
  416 passed (7.8m)
EXIT 0
```

The log has no `✘` lines. axe runs on loaded pages, after "Loading the form tools…" has gone. The probes below check that line instead.

## The areas the brief singled out

### 1. `emptyFormRequired(model)`

Probe: `r11/req.mjs` (`wp50a-review11-probe-req-tip.log`, `-req-204a2a2.log`). For each of the five templates in both languages, at 360×740, the probe holds every module except theme-init and records the list. It then puts a `MutationObserver` on the count line, releases the modules and records the list again.

| Template | Items shown, before = after | Count line, before (raw) → after | List height, before = after | Writes to the live region on load |
| --- | --- | --- | --- | --- |
| en / af invoice | same 16 | `" 2 of 18 required items present "` → `"2 of 18 required items present"`; af `" 2 van 18 verpligte items is ingevul "` → same without spaces | same | 1 (`childList +1 -1`) |
| en / af tax invoice | same 13 | 2 of 15 | same | 1 |
| en / af privacy notice | same 6 | 3 of 9 | same | 1 |
| en / af receipt | same 9 | 1 of 10 | same | 1 |
| en / af quotation | same 19 | 1 of 20 | same | 1 |

- **Items and count text.** On all ten pages the script shows the same items, the same count text and the same list height as the server rendered. Pass 10's m1 (the list shrinking by 22 to 170px on a first visit) is gone. At `204a2a2` the count was empty before the script, and the list lost 1 to 3 items when the script ran.
- **Announcement on load.** The script still writes the count line once on load. See m1.
- **Drift.** The rules are copied, not shared. See m2.
- **Without JavaScript and on the failure path.** The list and the actions are `display: none` (`TemplateTool.astro:364-372`), as at `204a2a2`. That is the print sheet only.

### 2. "Loading the form tools…"

Probes: `r11/waiting.mjs` (`wp50a-review11-probe-waiting.log`), `r11/contrast.mjs` (`-contrast.log`) and `r11/tpl.mjs` (`-tpl-tip.log`). They cover all five templates in both languages. Every module was held at these sizes:

- 320×568;
- 360×740;
- 640×450, which is 1280×900 at 200% zoom;
- 320×225, which is 1280×900 at 400% zoom;
- forced colours at 360.

| Check | Result |
| --- | --- |
| Contrast | 6.88:1 in the light theme (`rgb(92,86,72)` on `rgb(251,248,243)`) and 8.06:1 in the dark theme (`rgb(179,170,153)` on `rgb(21,19,15)`). It is the ordinary `.st-hint` colour. |
| Forced colours | It shows, in the system text colour (`rgb(0,0,0)`) with no background of its own. |
| 200% and 400% zoom, and Afrikaans at 320px | Always one line: "Die vorm se gereedskap laai…" is 185px wide in a 288px column. The text sits inside the buttons' room (44 to 170px high) in every case, overlaps nothing under it, and causes no sideways scroll. |
| Read once | The `.st-tool__actions` accessibility tree names it once before the script and not at all after. Nothing else in the room is in the tree, because the buttons are `visibility: hidden`. |
| Gone after the script | `display: none` on all 50 loads. The buttons appear in the room it held, and nothing moves (sweep below). |
| Tap where Print will be | Hits the waiting line, which is not a control. |
| Template module blocked (failure path) | The line is not shown, and the actions and list are `display: none`. Under the form there are 49px of space, the same as without JavaScript (`-tpl-tip.log`). |
| Module never arrives | The line stays for good. See m5. |

### 3. The `.st-tslot` `:has()` rule

Probe: `r11/slots.mjs` (`wp50a-review11-probe-slots.log`). En and af invoice at 360px, in four states: storage available or blocked, each with the `:has()` rule in place or deleted from the stylesheet. Deleting the rule stands in for a browser without `:has()`.

| State | `:has()` supported | `:has()` not supported |
| --- | --- | --- |
| Storage available, on load (slot heights) | 46 / 45 (af 46 / 67) | the same |
| Storage blocked, on load | 0 / 45 (af 0 / 67) | 45 / 45 (af 45 / 67) |
| All ten lines shown: last line to totals | 16px | 61px (af 83px) |
| One line removed again | "Add line" is back, and the slot has its 45 (af 67)px again | the same |

- **With `:has()`:** pass 10's m2 is fixed.
- **Without `:has()`:** the selector is dropped, and the page falls back to pass 10's state: an unseen 45 to 83px room, no lost content and no movement. That is an acceptable fallback. `:has()` is in every evergreen engine (Chromium 105, Safari 15.4, Firefox 121). The rule matches only a hidden direct partner, or the hidden "Add line" button inside its paragraph. With storage available it never matched in these runs.

### 4. The tests

- **Blank-run test** (`templates.spec.ts:652`). It walks every visible text node, control and border inside `<st-template-form>`, and fails on a vertical run over 120px.
  - It would have caught pass 10's M1.
  - It would catch losing the waiting line at 360 and 320px, where the buttons' room is 156px. It would not catch that at 1280px, where the room is 44 to 100px.
  - It checks the tool only, not the page under it. That is enough, since nothing outside the tool changed.
- **Slot test** (`templates.spec.ts:707`). It checks both slots at 0px in the two states. It does not check that the slots keep their room while the partner shows; the earlier pass 9 tests cover that.
- **`template-shift.spec.ts`.** It now tracks the first field, heading, list item or paragraph on screen, and skips the waiting line. To check that this rule hides nothing, `r11/sweep.mjs` (`wp50a-review11-probe-sweep.log`) repeats the sweep and measures every visible element on screen, not only the one the spec picks:
  - fields, buttons, links, labels, list items, paragraphs, `dt` and `dd`, in `main` and the footer;
  - the same positions (every 120px from the form's top to 120px past the tool), each a fresh held load;
  - all five templates (the spec leaves out the receipt), in both languages, at 360×740 and 320×568.

  It flags any position where some element moved more than 2px while the spec's own rule would pass. It also flags a pick inside a sticky or fixed box, and a position where nothing is picked. Result:

  - all 20 runs (702 positions) have the worst movement of any element at 0px, the worst movement of the picked element at 0px, and the worst layout shift at 0.000;
  - no position hides movement;
  - no pick sits in a sticky or fixed box;
  - every position has a pick. For example:

  ```
  en invoice 360x740: 39 positions; worst any-element 0px, worst pick 0px, worst cls 0.000; positions where the rule hides movement: 0
  af quotation 320x568: 53 positions; worst any-element 0px, …: 0
  af receipt 320x568: 22 positions; worst any-element 0px, …: 0
  ```

  Skipping the waiting line hides nothing: the buttons take its place, which is not movement. The spec still leaves out the receipt, which is the simplest of the five.
- **`wizard-shift.spec.ts`.** All 16 passed. Pass 10 made no wizard change.

### 5. The rule across both `data-enhance` elements

Only `<st-wizard>` and `<st-template-form>` carry `data-enhance` (`Wizard.astro:93`, `TemplateTool.astro:94`).

| State | Find my path, en and af (`r11/wizard.mjs`) | Templates, four pages (`r11/tpl.mjs`), and all ten (sweep, blank-run test) |
| --- | --- | --- |
| Before the script | Question 1 and the stepper show, and "Loading the next step…" sits in Next's room. 141px under question 1, as in pass 10, and within `wizard-shift.spec.ts`'s bound against `204a2a2`. Nothing hidden takes focus. | The form, the required list as the script will leave it, and "Loading the form tools…" in the buttons' room. Widest run without anything to see: 94px. 40px from the last visible line to the next section, the same as after the script (pass 10: 727 to 1,542px). Nothing hidden takes focus. |
| After the script | Ready, and nothing moves (`wizard-shift.spec.ts`). | Ready, and nothing moves on any template (sweep above). |
| Module blocked or throwing | The no-JavaScript form, no stepper, 64px, and it reaches the result page. | The no-JavaScript form to the pixel, 49px. |
| Module never arrives | The waiting line stays for good (backlog). | The waiting line stays for good (m5). |
| Storage blocked | Not in scope; pass 6 checked it. | The warning pushes the form down when the script runs (m4; it did at `204a2a2` too). |
| Returning with a saved draft | Not re-checked; it comes back from saved answers (pass 6). | The list changes when the script runs (m3; less than at `204a2a2`). |

No blank run of over 120px is left before the script on either element. The moves left are m3 and m4, and both are rarer and smaller than, or the same as, at `204a2a2`.

## The 11 items, end to end

Probes: `r11/items.mjs` (pass 8's script, unchanged apart from the module path), `r11/venda.mjs`, and a `grep` of both builds (`wp50a-review11-probe-items-tip.log`, `-items-204a2a2.log`, `-venda.log`).

| # | Problem | `204a2a2` | `f609747` | Result |
| --- | --- | --- | --- | --- |
| 1 | AI notice below the first screen at 320×568 on vehicle-dealer | Notice top at 753px (en) and 696px (af), below the 568px screen | 414px in both languages | Fixed |
| 2 | Wizard Next and template tabs show but do nothing before their script | Modules held 1.5s: "wizard Next … SHOWN and a tap does nothing"; "template "Preview" tab … SHOWN and a tap does nothing" | "not shown, so nothing to tap" for both. Nothing hidden takes focus. Waiting lines sit in the rooms of Next and of the buttons. | Fixed. Pass 10's blank band is gone. |
| 3 | Search dialog shows nothing while the index downloads | Index held, dialog open 1.5s: `loading=false` | `loading=true` ("Loading search…") | Fixed |
| 4 | Invoice page shows the markdown's "make a copy … [SQUARE BRACKETS] … PDF" | Instruction above the form (en and af) | Not above the form, and not in the meta description | Fixed |
| 5 | "Now reading" pill cuts translated headings with an ellipsis | `nowrap` / `ellipsis` / `hidden`, clipped (en and af) | `normal` / `clip` / `visible`, not clipped, full title | Fixed |
| 6 | Language banner shifts the layout by 0.144 | 360px: banner 237 → 185px, CLS 0.136, all of it from the banner | 237 → 237px, nothing from the banner (total 0.020). At 320px, nothing from the banner (288 → 288px). | Fixed |
| 7 | Ring draws in for 960ms on every view; smooth scroll on Tab | `[st-ring-draw:960@st-ring__value]` after load; `smooth` after Tab | `[]`; `auto` | Fixed |
| 8 | Checkboxes shrink beside wrapped text; 576px tables cut two-column tables | Checkboxes 13 to 20px wide; four tables at 576/288 CUT | Every checkbox 20px; en tables 288/288; af "Kort/Beteken" 288/288 | Fixed. The af calendar is 385/288 (was 576); that is pass 9 m1, in the backlog |
| 9 | "Copied" names the wrong prompt | 16 of 16 wrong in each language ("Prompt 1 copied") | 0 of 16 wrong ("Copied: The refine prompt (use after every step)", "Gekopieer: Die verfyningsopdrag …") | Fixed |
| 10 | Raw folder name in summaries | 7 pages have a folder name in their meta description ("Lees eers 01-core/. Hierdie lêer …") | 0 pages | Fixed |
| 11 | Docs claim the web fonts cover the Venda letters | No "system font" line on `/design-system/` | Measured: neither family's latin or latin-ext file has ḓ ṱ ṋ ṅ Ḓ Ṱ Ṋ Ṅ. `docs/design-system.md:169` says so, and `/design-system/` labels the line "system font". | Fixed |

### Earlier passes

As far as these runs show, nothing accepted in passes 1 to 10 has regressed:

- e2e (chromium, mobile and nojs), dom, unit and a11y all pass;
- the 11-item table above;
- the wizard probe gives the same figures as pass 10 in every state;
- the template's failure and no-JavaScript paths match pass 10 (49px, no rooms);
- the pass 10 diff adds no literal colours, `href="/…"`, direct storage, `nowrap`, `ellipsis` or animation;
- the one new UI string, `templates.loadingTools`, is in both `en.json` and `af.json`.

## Minor

### m1. The script still writes the count line on load

**Category:** minor. It was already present at `204a2a2`, where the script wrote an empty count line on load. It is not one of the 11 items. But pass 10's fix says it removed this, and it did not.

**Where:**

- `src/components/templates/TemplateTool.astro:242-244`:

  ```astro
  <p role="status" data-required-count>
    {startCount}
  </p>
  ```

  It renders as `<p role="status" data-required-count> 2 of 18 required items present </p>`, with a space at each end.
- `src/scripts/template-form.ts:517`: `if (status && text !== this.#lastStatus && text !== status.textContent)` compares the unspaced text with the spaced `textContent`, so it always writes.
- `docs/design-system.md` says "the script's first run changes nothing in it". The comment at `template-form.ts:516` says "the first run writes nothing".

**Reproduced** with `r11/req.mjs` (`wp50a-review11-probe-req-tip.log`). On all ten template pages (five templates, en and af), there is one `childList +1 -1` mutation on the `role="status"` element when the script runs. For example:

```
tip 360x740 en invoice: sameItems=true sameHeight=true countBefore=" 2 of 18 required items present " countAfter="2 of 18 required items present" liveRegionMutations=1
tip 360x740 af quotation: … countBefore=" 1 van 20 verpligte items is ingevul " countAfter="1 van 20 verpligte items is ingevul" liveRegionMutations=1
204a2a2 360x740 en invoice: … countBefore="" countAfter="2 of 18 required items present" liveRegionMutations=1 ["childList +1 -0 …"]
```

**Who notices.** A screen reader user. Replacing the text node in a polite live region is a change that screen readers can announce. So 8 to 13s after the page loads on a slow phone, the reader may hear "2 of 18 required items present" out of nowhere, maybe while they are typing in a field far from the list. Sighted readers see nothing change.

**Fix:**

- Render the text with no whitespace around it (`<p role="status" data-required-count>{startCount}</p>` on one line, which Prettier allows with a `prettier-ignore` comment), or compare `status.textContent.trim()`.
- Also set `this.#lastStatus` from the rendered text in `connectedCallback`.
- Add a check to "a template before its script runs" that observes the count line and expects no mutation from the release to `data-ready`.

**Backlog row:**

| WP-50a | Pass 11 minor 1: the template script rewrites the `role="status"` count line once on load on every template, because the server renders it with spaces around the text and the guard compares untrimmed text, so a screen reader may announce "2 of 18 required items present" 8 to 13s after load. Same write at `204a2a2` (from empty). | Render the count with no surrounding whitespace or compare trimmed text, seed `#lastStatus` from it, and assert no mutation of the count line between release and `data-ready`. | `WP-50a-pass11.md` |

### m2. The server copies the script's required-list rules, and no test holds the two together

**Category:** minor. Today the two agree on all ten pages (area 1). This is a maintenance risk, not a visible fault.

**Where:**

- `src/lib/templates/required.ts:25-29` and `src/scripts/template-form.ts:649-653`: the same `readable()`, written twice.
- `required.ts:38` and `template-form.ts:485-487`: the threshold rule, written twice.
- `required.ts:46-50` and `template-form.ts:501-506`: the present and `follows` rule, written twice.
- `required.ts:44`: the "lines are never present" rule. The script works this out from the lines (`template-form.ts:493-497`).
- The module header says `required.test.ts` and `template-shift.spec.ts` "hold the two together". Neither does:
  - `tests/unit/templates/required.test.ts` never imports the script. It checks `emptyFormRequired()` against counts copied by hand from pass 10's probe.
  - `template-shift.spec.ts` sees only movement. It leaves out the receipt, and it never compares the count text.

**Reproduced** by reading and searching the tests (`grep -rn "required-count\|emptyFormRequired\|data-required-item" tests`). No test renders the page, runs the script on an empty form, and compares the list and count with what the server rendered. `r11/req.mjs` does exactly that, and passes today.

**Who would notice.** Say someone changes one copy only: a new field kind, a template with a prefilled line, a `requiredAbove` rule that changes to `>=`. Then the unit test stays green, and the list jumps or the count changes on load again.

**Fix:**

- Move the per-item rule into one pure function in `src/lib/templates/required.ts`, for example `isPresent(item, valueOf, kindOf, followsOf, lines)` and `applies(item, total)`. Have the script call it with the form's values and the server with the defaults. The script already imports from `src/lib/templates/totals`.
- Add an e2e or DOM check that, for each template, compares the server-rendered list and count with the state after `data-ready` on an empty form.

**Backlog row:**

| WP-50a | Pass 11 minor 2: `emptyFormRequired()` duplicates the template script's required-list rules (`readable()`, the `requiredAbove` rule, `follows`), and no test compares the server-rendered list and count with the script's on an empty form; the unit test pins hand-copied counts. | Share one pure rule between `required.ts` and `template-form.ts`, and add a test that compares the list and count before and after the script on all five templates. | `WP-50a-pass11.md` |

### m3. With a saved draft, the required list still changes when the script runs

**Category:** minor. It was already present at `204a2a2`, and it is now smaller. It is outside the 11 items. The pass 10 change says so in its own header ("A saved draft or business details can still change the list").

**Where:** `src/components/templates/TemplateTool.astro:65-71` and `:246-257` render the list for an empty form, and `template-form.ts:477-508` re-renders it from the saved draft.

**Reproduced** with `r11/returning.mjs` (`wp50a-review11-probe-returning-tip.log`, `-returning-204a2a2.log`). At 360×740:

1. Fill the first six text fields, so the draft is saved (`st.template.<slug>.v1`, `st.meta.v1`).
2. Reload with the modules held.
3. Scroll so that the actions are 150px from the top of the screen, then release.

| Template | `f609747` | `204a2a2` |
| --- | --- | --- |
| Invoice | list 902 → 758px (16 → 13 items); scroll anchoring holds the text (0px, CLS 0.000) | 972 → 758px; text under the buttons moved −214px, CLS 0.262 |
| Tax invoice | 758 → 614px; 0px, CLS 0.000 | 902 → 614px; −48px, CLS 0.344 |
| Privacy notice | 422 → 278px (6 → 3 items); text under the buttons moved −48px, CLS 0.162 | 540 → 278px; −263px, CLS 0.314 |

Safari has no scroll anchoring, so there the invoice and tax-invoice text would move by the list's change too.

**Who notices.** Everyone who uses a template a second time. That is the expected way to use it: the business details are kept.

**Fix.** Either option:

- Have the inline `theme-init.js`, which already reads `st.` storage before paint, set the `hidden` state of present items from the saved draft before first paint.
- Or keep the list's height until the reader acts, as the wizard does.

**Backlog row:**

| WP-50a | Pass 11 minor 3: with a saved draft, the template's required list still shrinks when the script runs (144px on invoice, tax invoice and privacy notice); on the privacy notice the text under the buttons moves 48px (0.162). Was 48 to 263px (0.26 to 0.34) at `204a2a2`. | Apply the saved draft's "present" state to the list before first paint (inline, as theme-init reads `st.` keys), or hold the list's height until the reader acts. | `WP-50a-pass11.md` |

### m4. With storage blocked, the warning pushes the form down when the script runs

**Category:** minor. It was already present at `204a2a2`, with the same layout shift. It is outside the 11 items, and it is a rare state.

**Where:** `src/components/templates/TemplateTool.astro:119-123`, `<st-storage-notice hidden>`, which the script shows above the form when storage throws. The slot above it now takes no room (`:415-424`, pass 10's m2 fix).

**Reproduced** with `r11/blocked.mjs` (`wp50a-review11-probe-blocked-tip.log`, `-blocked-204a2a2.log`). At 360×740, `localStorage` throws, the modules are held, and the reader is at the first field:

```
tip     en invoice reader at top: slot 46 -> 0, first field moved 97px,  cls 0.098
tip     af invoice reader at top: first field moved 123px, cls 0.124
tip     en privacy-notice / af privacy-notice: 97px / 123px, cls 0.098 / 0.124
204a2a2 en invoice: 89px, cls 0.097;   af invoice: 115px, cls 0.125
```

When the reader is further down, scroll anchoring holds the field (0px). The fields move 8px more than at `204a2a2`, but the layout shift is the same to within 0.001.

**Fix:** let `theme-init.js` set `html[data-st-storage="blocked"]` when its own `st.` read throws. Show the warning from first paint with CSS, before the script, in place of the saved line's slot.

**Backlog row:**

| WP-50a | Pass 11 minor 4: with storage blocked, the template's storage warning appears above the form when the script runs, moving the first field down 97px (en) / 123px (af), 0.098 / 0.124; 89 / 115px at `204a2a2`. | Detect blocked storage in `theme-init.js` and show the warning from first paint with CSS. | `WP-50a-pass11.md` |

### m5. If the template module never arrives, "Loading the form tools…" stays for good

**Category:** minor. This is the wizard's known backlog item (pass 6 m2 and pass 7 m1, `backlog.md:58`). The brief asked whether the template has it too, and it does.

**Where:** `TemplateTool.astro:383-394`. The waiting line shows while `st-template-form:not([data-ready])` and `data-st-script-failed` does not name "TemplateTool". A hung request sets neither.

**Reproduced** with `r11/hang.mjs` (`wp50a-review11-probe-hang.log`). The template module request is never answered. A customer name is typed, and the probe checks again 20s later:

```
{"ready":false,"failed":"","waiting":"flex/visible","count":"2 of 18 required items present","customerListed":true,
 "printLine":["To print, use your browser’s Print command. Without JavaScri…","Without JavaScript the totals are not worked out. Write them…"]}
```

The reader still has the printable form and the no-JavaScript print and totals lines, so nothing is lost. But the page keeps saying the tools are loading, and the count line and list still say the customer is missing. At `204a2a2` the list was stale in the same way, but there was no count line and no waiting line.

**Fix:** extend the wizard's backlog row. After a timeout (say 15s) without `data-ready`, `theme-init.js` treats the element's module as failed (`data-st-script-failed`), so both pages fall back to the no-JavaScript form.

**Backlog row:** add "and the template form: 'Loading the form tools…' and a stale required count stay for good (pass 11 m5)" to the existing row at `backlog.md:58`.

## Not re-raised

- **Five Afrikaans two-column tables scroll sideways at 320 and 360px.** This is pass 9 m1, in the backlog. The af checklist calendar is 385/288px.
- **The wizard never becomes ready if a module hangs.** Pass 6 m2 and pass 7 m1, in the backlog. m5 adds the template to it.
- **The wizard's kinds of business after Back without the back/forward cache.** Pass 8 m1, in the backlog.
