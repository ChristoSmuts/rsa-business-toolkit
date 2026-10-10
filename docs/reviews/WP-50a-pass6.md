# WP-50a review, pass 6

Tree: `d3d5611`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 5 and their fixes. The pass 5 fix is `27762b3..d3d5611`: with JavaScript, the wizard is in steps from the first paint. It no longer shows the no-JavaScript form and folds it. The reviewer is fresh and independent, and changed no code for this review.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 1 |
| Minor | 6 |

- **M1:** a returning reader ("Edit answers") who changes question 1 before the script arrives has the change undone when it arrives. The saved answer is put back, with no sign. This is the audit's item 2 ("taps in that gap are lost silently"), still there for that reader. `204a2a2` does the same, so it is not a regression, but the item is not fully fixed.

The pass 5 change itself does what it says:

- **Pass 5 M1 is gone.** The gap below question 1's Next equals `204a2a2`'s at every size (119 to 141px).
- **Pass 5 M2 is gone.** A tap moves the tapped answer by at most 1px and never scrolls the page.
- **Next and Back never scroll the page down.**
- **The failure path reaches a result** and leaves no invisible bars.
- **Nothing accepted in passes 1 to 4 has regressed.**

## Checks run

All logs are in the session scratchpad as `wp50a-review6-*.log`, and the probe scripts are in `r6/`. The probes ran against a copy of the built `dist/`, served under `/business-toolkit/` by `r6/serve.mjs`: port 4975 for `d3d5611`, and port 4976 for the `204a2a2` build in `base204/dist`. They used Playwright Chromium, and they ran only after e2e and a11y had finished.

`pnpm gate:fast` (`wp50a-review6-gatefast.log`):

```
All matched files use Prettier code style!
Result (319 files):
- 0 errors
- 0 warnings
 Test Files  78 passed (78)
      Tests  3273 passed (3273)
Content drift: none.
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

The unit count is 3,273, one fewer than at pass 5, because the dom test for the height hold was removed with the hold.

`pnpm build` (`wp50a-review6-build.log`):

```
[build] 198 page(s) built in 5.42s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

After the build, `git status` was clean.

`pnpm content:fidelity --lang af` (`wp50a-review6-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e (`wp50a-review6-e2e.log`), with the brief's exact command (chromium, mobile and nojs, `PW_PORT=4971`, default reporters):

```
Running 1652 tests using 2 workers
  93 skipped
  1559 passed (13.8m)
EXIT 0
```

The log has no `✘` lines and no flaky or retried tests. The wizard lines:

```
wizard arrival en 412x839: 8 positions, worst shift 0.017, worst scroll movement 0.0px
wizard arrival af 412x839: 9 positions, worst shift 0.026, worst scroll movement 0.0px
wizard arrival en 360x740: 10 positions, worst shift 0.034, worst scroll movement 0.0px
wizard arrival af 360x740: 12 positions, worst shift 0.034, worst scroll movement 0.0px
wizard arrival en 320x568: 15 positions, worst shift 0.057, worst scroll movement 0.0px
wizard arrival en 1280x720: 6 positions, worst shift 0.010, worst scroll movement 0.0px
wizard arrival af 320x568: 16 positions, worst shift 0.069, worst scroll movement 0.0px
wizard arrival af 1280x720: 6 positions, worst shift 0.010, worst scroll movement 0.0px
wizard reader en 412x839: gap below Next 119px (204a2a2 119px), worst shift 0.000, worst scroll on a tap 0.0px, worst scroll up to the new heading on Next or Back 944.0px
wizard reader af 412x839: gap below Next 141px (204a2a2 141px), ...
wizard reader en 360x740: gap below Next 141px (204a2a2 141px), ...
wizard reader af 360x740: gap below Next 141px (204a2a2 141px), ...
wizard reader en 320x568: gap below Next 141px (204a2a2 141px), ...
wizard reader af 320x568: gap below Next 141px (204a2a2 141px), ...
wizard reader en 1280x720: gap below Next 120px (204a2a2 120px), worst shift 0.000, worst scroll on a tap 1.0px, ...
wizard reader af 1280x720: gap below Next 120px (204a2a2 120px), ...
```

`pnpm test:a11y`, `PW_PORT=4972` (`wp50a-review6-a11y.log`):

```
  416 passed (7.2m)
EXIT 0
```

The log has no `✘` lines.

## Major

### M1. "Edit answers": a change made to question 1 before the script arrives is silently undone

Where: `src/scripts/wizard.ts:108` (`this.#restore(profile.get())` in `connectedCallback`) and `:176-186` (`#restore`). With a saved profile, `#restore` sets every answer from the profile and does not look at what the reader has already ticked.

**How I reproduced it.** I used `r6/edit.mjs` (log `wp50a-review6-probe-edit.log`) at 360×740 in both languages:

1. Save the profile `sole-prop` / `services-trades, food` / `trading`.
2. Hold the modules and open Find my path, as "Edit answers" does.
3. Before the script arrives, tap "As a registered company (Pty Ltd)".
4. Release the modules.

```
tip en saved profile sole-prop, held modules: checked before the tap none; reader taps pty -> pty; after the script arrives -> sole-prop
tip af saved profile sole-prop, held modules: checked before the tap none; reader taps pty -> pty; after the script arrives -> sole-prop
tip en no profile, held modules: reader taps pty -> after the script arrives pty
```

The slow-phone run (`r6/slow.mjs`, `wp50a-review6-probe-slow.log`: CPU 4×, Slow 3G, touch, 360×740) shows the same without any held modules:

- question 1's heading is visible at 4.5s and the script is ready at 13.8s, a 9.3s window;
- the reader tapped "Pty Ltd" at 5.8s;
- after the script arrived, `checked=sole-prop`.

Nothing on the page says the answer changed. The reader came to change it, so they likely press Next without checking again and save the old answer to My path. `wp50a-review6-probe-edit-204a2a2.log` shows `204a2a2` does the same. This is not a regression.

The ordinary "Edit answers" flow works. From My path, the wizard opens on question 1 with every saved answer filled in, the kinds of business are checkboxes, and Next goes through. Unticking one kind and ticking another saves `["food","beauty"]` in the order ticked.

**Why it is major.** The audit's item 2 is "taps in that gap are lost silently". This is a tap in that gap, lost silently. It happens to the reader who came only to change an answer, and pass 5 made answering in the gap the intended way to use the page ("the answers are native inputs that work meanwhile"). The fix does not fully fix its item.

**Fix.** The server renders no answer checked. So when the script connects, an answer that is already checked was given by the reader, or put back by the browser on Back. In `#restore`:

- if `performance.getEntriesByType('navigation')[0]?.type !== 'back_forward'`, keep any group that already has a checked input, and restore only the groups that have none;
- if one kind of business was ticked as a radio, start `#order` from it.

Add a `wizard.spec.ts` case: save a profile, hold the modules, tap a different answer, release, and expect the reader's answer.

## Minor

### m1. On a slow phone the reader can answer question 1 and then see no way on, and no reason why, for up to 9 seconds

Where: `src/components/wizard/Wizard.astro:374-379`. Before `data-ready`, the whole `.st-wizard__nav` is `visibility: hidden`, including the line "Choose an answer first.". `.js-only` also hides "Saved on this device only".

**How I reproduced it** (`r6/slow.mjs`, `wp50a-review6-probe-slow.log`, screenshots in `r6/shots/slow-*-gap.png` and `-ready.png`). On CPU 4× and Slow 3G at 360×740, the gap is 9.3s in both languages. A reader who answers at 5.8s and scrolls on sees, in order:

- their answer;
- "What is the difference?";
- 44 to 78px of blank, then about 60px more of blank page;
- the footer ("Written by AI…").

A tap on Next's empty room does nothing, which is correct: focus goes to `MAIN` and the URL does not change. At 13.8s, Next appears in that room, with the answer kept and the question still in place.

**Judgement: a polish point, not a real problem for a first-time owner.**

- Reading question 1 takes most of that window: three choices of two to three lines each, and longer in Afrikaans for a second-language reader.
- Nothing can be tapped by mistake.
- Nothing is lost, except in M1.
- Next arrives where the reader is looking.

A reader who answers quickly can still think the page ends there, though. It costs nothing to say what is coming.

**Fix.** Before `data-ready`, show one quiet line in the nav's room, for example "Loading the next step…" (new keys in `en.json` and `af.json`). Keep the button `visibility: hidden` under the same selector. Then hide the line on `data-ready` and when the script has failed. That is CSS only, with no JavaScript cost.

### m2. A wizard module that hangs or throws leaves question 1 with no way on, for good

Where: `src/scripts/theme-init.js:47-60`. `data-st-script-failed` is set only by an `error` event on a `<script>` element, which means a network failure. `Wizard.astro:367-379` keeps the stepped layout until then.

**How I reproduced it** (`r6/fail.mjs`, `wp50a-review6-probe-fail.log`).

**An aborted module works.** That is the e2e case, and also an abort after 4 seconds, with the reader already in question 1. The result is `failed=Wizard`:

- all three questions show;
- the stepper is hidden;
- the result button leads to `/find-my-path/result/pty/food/trading/` in both languages, at 360 and 1280px;
- no element is `visibility: hidden` with height ("invisible room: none").

The switch shifts the layout by 0.04 to 0.18 when the abort is fast and by 0.000 when it is late. That is acceptable on this path.

**A hung or throwing module does not work.** For "hang", the request is never answered. For "throw", the module answers with `throw new Error("boom")`. In both cases `data-st-script-failed` is never set. Eight seconds later the page is still question 1, with a 44 to 78px invisible nav, no questions 2 and 3, and no result button. The reader cannot reach a result.

`204a2a2` is as stuck in both cases, and worse when the module is aborted: Next is visible and dead, and no result is reachable (`wp50a-review6-probe-fail-204a2a2.log`). So this is not a regression. Passes 1 to 4 did not have it, because they showed the no-JavaScript form until the script was ready.

**Fix.** Pick either or both:

- In `theme-init.js`, also mark a script as failed on a window `error` whose `filename` is a module's `src`.
- Give the stepped rules a time limit in CSS. For example, an animation on `st-wizard:not([data-ready])` with a delay of about 20 to 30s, which switches the page to the no-JavaScript form. That still costs no JavaScript.

### m3. When the script arrives, "Saved on this device only" appears and pushes the footer down 35 to 77px

Where: `src/components/wizard/Wizard.astro:325-326`. The line is `.js-only`, so it takes no room before `data-ready`. `docs/design-system.md:839` says "nothing folds, nothing moves".

**How I reproduced it** (`r6/arrive.mjs`, `wp50a-review6-probe-arrive.log`). Hold the modules, scroll to the end of the page (question 1's Next room and the footer on screen), then release:

```
en 320x568 unanswered: Next 186->186, footer 328->405; shifts 0.057[footer.st-footer 328->405]
af 320x568 unanswered: Next 137->137, footer 280->356; shifts 0.069[footer.st-footer 280->356]
en 360x740 both:       Next 392->392, footer 500->577; shifts 0.034
af 360x740 answered:   Next 358->358, footer 500->542; shifts 0.019
en/af 1280x720:        footer 551->607; shifts 0.010
```

These are the sweep's worst values. They are under the 0.1 limit, and the question and Next do not move. But this is the footer a reader is looking at while they wait for Next (m1), and it jumps.

**Fix.** Give the saved-tip block the nav's treatment before `data-ready`: `display: block; visibility: hidden` under the same `html.js:not([data-st-script-failed~='Wizard']) st-wizard:not([data-ready])` selector. Or fold it into m1's waiting line. Then correct `docs/design-system.md:839`.

### m4. Before the script, no step in the stepper is marked current

Where: `src/components/wizard/Wizard.astro:95`. No `<li>` is rendered with `aria-current`. `wizard.ts` `#show(0)` sets it on arrival (`wp50a-review6-probe-slow.log`: `aria-current=none` before, `current step=0` after).

For the 9.3s window, the stepper shows three grey steps with none highlighted, and a screen reader reads three steps with none current. The script always starts on step 1, and the stepper is hidden without JavaScript and on failure. So rendering `aria-current="step"` on the first `<li>` is always right. It would also remove the colour change on arrival.

**Fix.** Render `aria-current="step"` on `data-stepper="0"` on the server, and keep `#show` as it is.

### m5. Two comments still describe the folded form

- `src/components/wizard/Wizard.astro:17-21`: "Until the script has run … the page is the no-JavaScript form: all three questions, the result button for the checked answers, and no Back or Next."
- `src/styles/utilities.css:28-31`: "until then the page works as it does without JavaScript (the wizard's GET form, …)".

Both are now true only when the script fails or JavaScript is off.

**Fix.** Reword both to match `docs/design-system.md` § "The wizard is in steps from the first paint".

### m6. Test gaps

- **Nothing tests that "See my path" and Next go to an earlier unanswered question.** The e2e tests for this were removed (`git diff 27762b3..d3d5611 -- tests/e2e/wizard.spec.ts`, the old `:966-1017`). `tests/dom/wizard.test.ts:89` checks only the hint and the button's description. I agree with `docs/design-system.md` that a reader cannot reach that state today:
  - the wizard always starts at 0;
  - `go()` and `#advance()` refuse an unanswered step;
  - the steps are `hidden`, so find-in-page and fragments cannot reach them;
  - the stage that `#update` clears is on the current step's own validity.

  In the interaction probe I never reached it. But the code is kept as a safety net, so give it one dom test: call `go(2)` past an empty step through a test-only path, or set the state directly, then `requestSubmit()`, and expect question 1 shown and its heading focused.
- **In `wizard-shift.spec.ts`, the "interaction" part's layout-shift figure cannot fail.** Every action is a Playwright `check()` or `click()`, and the reading is taken within about 200ms, so every shift falls in Chrome's 500ms `hadRecentInput` window. The guards that work are the position checks: the tapped answer within 1px, no scroll on a tap, no footer coming into view, no scroll down on Next or Back. I recorded every shift, input or not, for nine actions per run, touch and keyboard, at four sizes in both languages (`r6/interact.mjs`, `wp50a-review6-probe-interact.log`). The only shift was 0.001 (`#wz-type-general-body`, af 412px, on ticking "General"). No reader-visible movement is hidden by the exclusion, so this is a naming point. Say in the test that the shift figure is informational, or count input shifts too, with their sources.
- **The arrival sweep never answers question 1 before the release.** The answered case moves the footer differently, but stays under 0.1 (m3).

## What I verified and found holding

### Item 2 on a slow phone (`wp50a-review6-probe-slow.log`)

- **Before the script**, with CPU 4×, Slow 3G and touch at 360×740 in both languages:
  - question 1 and the stepper show;
  - questions 2 and 3, the kinds of business, the result button and the list do not;
  - Next and its line are `visibility: hidden` and keep their room;
  - a tap on that room does nothing.
- **When the script arrives**, Next is visible in that room, question 1 has not moved, and the reader's answer is kept (no profile). Item 2 is met: no control looks ready before it works.
- **The m1 and M1 judgements** are above.

### Taps, Next and Back (`wp50a-review6-probe-interact.log`)

For each run I did, in order: a tap on question 1's last answer, low on the screen; Next; ticking two kinds of business; Back; Next; Next; a tap on a question 3 answer; Back. I did this by touch and by keyboard (Space and Enter), at 412×839, 360×740, 320×568 and 1280×720, in both languages:

- **Taps:** the tapped answer moves 1px (its border) and `scrollY` never changes.
- **Next and Back:**
  - the new step's heading gets focus and the stepper's `aria-current` follows;
  - the page either stays put (when the heading is on screen) or scrolls up to the heading (`y 759->120`, `898->167`, `1287->332`);
  - it never scrolls down;
  - the heading lands at 31 to 394px, inside the screen.
- **Layout shifts:** none, except the 0.001 in m6.

### Edit answers (`wp50a-review6-probe-edit.log`)

- **Restored:** every saved answer is checked on open, and the kinds of business are checkboxes.
- **Description:** question 2's group is described by `wz-help-type wz-general-type`, and an answered step's button has no `aria-describedby`. At `204a2a2` that button pointed at the hidden "Choose an answer first.", which pass 3 m2 fixed.
- **Saving:** the changed types are saved in the order ticked.
- **The exception** is M1.

### The earlier-question routing

I found no way to reach it; see m6.

### Failure path

See m2.

- **An aborted module** leaves a usable no-JavaScript form, with no invisible room and no stepper.
- **With no JavaScript,** `nojs.spec.ts` passes, including `:461` on all 198 routes.

### No-JavaScript and screen-reader readers against `204a2a2`

- **Question 2's lines.** Without JavaScript the group is described by `wz-general-type wz-nojs-type`. The "you can choose one" line now follows "If none fit…", which matches that order. With the script, it is described by `wz-help-type wz-general-type` (`tests/dom/wizard.test.ts:205`, which passes).
- **Hidden parts.** Before the script, the hidden steps and the nav are out of the accessibility tree.
- **axe** is clean on every sitemap URL in both themes.

### Things accepted in passes 1 to 4

`git diff 27762b3..d3d5611 --stat` touches only the wizard, its tests and two docs. None of these has regressed:

- **AI notice:** on the first screen at 320×568 on all 72 documents, with no failures. The worst case is `af/business-types/beauty/`, with its top at 453px (`wp50a-review6-probe-misc.log`).
- **The pill** (`r6/pill.mjs`, `wp50a-review6-probe-pill.log`): toggles 93 / 123, shows under 120px 0 / 1, wrong section 0 / 0, jumps covering their heading 0 of 423 / 0 of 423. These are identical to pass 5.
- **Template leads and how-to lines:** no repeats, and the tax invoice has no line (`wp50a-review6-probe-misc.log`).
- **Opening at the top:** `scrollY` stays 0 at 320 and 1280px in both languages.
- **Reading order, `data-enhance`, search loading, the banner, motion, prompt naming, the template tabs with no dead controls (`templates.spec.ts:595`), tables and reflow (`reflow.spec.ts` on all 198 routes), the checkbox, and theme-init minification and its tests:** their e2e, dom and unit tests all pass in the logs above.
- **Budget:** `/af/business-types/food/` is at 24.0 KB with 1.0 KB left, as `.claude/skills/stoep-design/SKILL.md` says.
