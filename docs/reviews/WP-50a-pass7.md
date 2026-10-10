# WP-50a review, pass 7

Tree: `a680b7b`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 6 and their fixes. The pass 6 fix is `91837b0..a680b7b`. The reviewer is fresh and independent, and changed no code for this review.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 1 |
| Minor | 2 |

- **M1:** after Back without the back/forward cache, Chromium puts the old ticks back after the wizard has set itself up. It does this after `load` and fires no `change` event. So the wizard's own state no longer matches the screen:
  - with saved answers, "See my path" saves kinds of business the reader has unticked;
  - with no saved answers, a visibly answered question has a dead Next, with "Choose an answer first." showing.

  The pass 6 fix says "after Back or Forward … the saved answers win". That is not what happens. `204a2a2` does the same, so this is not a regression. But it is the M1 item (answers wrongly overwritten) and audit item 2 (a dead control) on a route a reader takes from question 1 itself ("What is the difference?" and Back).
- **m1:** only a throw whose top frame is in the wizard's entry file names "Wizard". A throw in a module it imports, or in a function from one, names that chunk instead. The page then stays on question 1 with "Loading the next step…" for good.
- **m2:** "Loading the next step…" is `aria-hidden`. A screen-reader user who answers question 1 before the script arrives gets nothing in its place.

The rest of the pass 6 fixes do what they say:

- an answer given before the script, on an ordinary load, is kept;
- the waiting line passes on contrast, zoom, forced colours and Afrikaans at 320px;
- the hint's `!important` stays on the hint;
- step 1 is current in the HTML;
- a late error changes nothing;
- the tests are stronger.

Nothing accepted in passes 1 to 6 has regressed.

## Checks run

All logs are in the session scratchpad as `wp50a-review7-*.log`, and the probe scripts are in `r7/`. The probes ran against a copy of the built `dist/` (`r7/dist`), served under `/business-toolkit/` by `r6/serve.mjs`: port 4985 for `a680b7b`, and port 4986 for the `204a2a2` build in `base204/dist`. They used Playwright Chromium, and they ran only after e2e and a11y had finished.

`pnpm gate:fast` (`wp50a-review7-gatefast.log`):

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  78 passed (78)
      Tests  3276 passed (3276)
Content drift: none.
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

`pnpm build` (`wp50a-review7-build.log`):

```
[build] 198 page(s) built in 5.32s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

`pnpm content:fidelity --lang af` (`wp50a-review7-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e (`wp50a-review7-e2e.log`), with the brief's exact command (chromium, mobile and nojs, `PW_PORT=4981`, default reporters):

```
  93 skipped
  1563 passed (14.3m)
EXIT 0
```

The log has no `✘` lines and no flaky or retried tests. The wizard lines:

```
wizard arrival en 412x839: 16 positions, worst shift 0.000, worst scroll movement 0.0px
wizard arrival af 412x839: 20 positions, worst shift 0.000, worst scroll movement 0.0px
wizard arrival en 360x740: 22 positions, worst shift 0.000, worst scroll movement 0.0px
wizard arrival af 360x740: 26 positions, worst shift 0.000, worst scroll movement 0.0px
wizard arrival en 320x568: 32 positions, worst shift 0.000, worst scroll movement 0.0px
wizard arrival af 320x568: 34 positions, worst shift 0.000, worst scroll movement 0.0px
wizard arrival en 1280x720: 14 positions, worst shift 0.000, worst scroll movement 0.0px
wizard arrival af 1280x720: 14 positions, worst shift 0.000, worst scroll movement 0.0px
wizard reader en 412x839: gap below Next 119px (204a2a2 119px), worst shift 0.000, worst scroll on a tap 0.0px, ...
wizard reader af 412x839: gap below Next 141px (204a2a2 141px), worst shift 0.000, worst scroll on a tap 0.0px, ...
wizard reader en 360x740: gap below Next 141px (204a2a2 141px), worst shift 0.000, ...
wizard reader af 360x740: gap below Next 141px (204a2a2 141px), worst shift 0.000, ...
wizard reader en 320x568: gap below Next 141px (204a2a2 141px), worst shift 0.000, ...
wizard reader af 320x568: gap below Next 141px (204a2a2 141px), worst shift 0.000, ...
wizard reader en 1280x720: gap below Next 120px (204a2a2 120px), worst shift 0.000, worst scroll on a tap 1.0px, ...
wizard reader af 1280x720: gap below Next 120px (204a2a2 120px), worst shift 0.000, worst scroll on a tap 1.0px, ...
```

The sweep now runs each position twice, unanswered and answered, so it has twice pass 6's positions. The worst arrival shift went from 0.069 to 0.000, because the saved line now keeps its room. The interaction figure now counts the reader's own shifts too, and is 0.000 everywhere.

`pnpm test:a11y`, `PW_PORT=4982` (`wp50a-review7-a11y.log`):

```
  416 passed (7.1m)
EXIT 0
```

The log has no `✘` lines.

After the build and the runs, the worktree had no changes.

## Major

### M1. After Back without the back/forward cache, the wizard's state and the screen disagree: wrong answers are saved, or Next is dead

Where:

- `src/scripts/wizard.ts:183-202` (`#restore`) and `:108-114` (`connectedCallback`);
- the claim at `src/scripts/wizard.ts:180-181` and `docs/design-system.md:849-850`: "After Back or Forward the browser restores the old ticks, and the saved answers win".

**When Chromium puts the ticks back.** `r7/when.mjs` (`wp50a-review7-probe-when.log`) runs Find my path, ticks "Pty Ltd", follows "What is the difference?" and goes Back. It logs the "Pty Ltd" input at each point:

```
after Back: data-ready pty=false | DOMContentLoaded pty=false | load pty=false | pageshow pty=true; pty now true
```

So the browser puts the old ticks back after `load` and just before `pageshow`. That is long after `connectedCallback` and `#restore` have run, and it fires no `change` or `input` event. The `back_forward` branch in `#restore` never sees those ticks, and nothing tells the wizard about them afterwards. Its `#order` (the kinds of business), the buttons' `aria-disabled` and the hints all stay as `#restore` left them.

**Reproduced** with `r7/back.mjs` (`wp50a-review7-probe-back.log`) at 360×740 in both languages, with Playwright's default (no back/forward cache):

1. Open Find my path ("Edit answers") with the profile `sole-prop` / `services-trades, food` / `trading` saved.
2. Next. Untick "services and trades" and tick "beauty".
3. Back to question 1, then follow "What is the difference?".
4. Press the browser's Back, then go through to "See my path".

```
tip en saved profile=true: before leaving {entity=sole-prop types=food,beauty stage=trading}; after Back, ticked when data-ready set: types=food,services-trades; on screen {entity=sole-prop types=food,beauty stage=trading}; answers() {"entity":"sole-prop","businessTypes":["services-trades","food"],"stage":"trading"}; ... See my path saves {"entity":"sole-prop","businessTypes":["services-trades","food"],"stage":"trading"}
```

What happens:

- The screen shows "food" and "beauty" ticked.
- "See my path" saves `services-trades, food`, a kind of business the reader unticked and that shows unticked.
- Nothing says so. My path then shows the old path, with the old primary type.

The same run with no saved answers (tick "Pty Ltd" on question 1, go on to tick "beauty", come back, follow the link, press Back):

```
tip en saved profile=false: before leaving {entity=pty types=beauty stage=-}; after Back, ticked when data-ready set: types=-; on screen {entity=pty types=beauty stage=-}; answers() null; at question 1: Next aria-disabled=true, "Choose an answer first." shown; a tap on Next stays on question 1 (focus BUTTON)
```

Question 1 shows "Pty Ltd" ticked, with "Choose an answer first." under Next, and a tap on Next does nothing. The reader has to tick another answer and then theirs again. Afrikaans is the same.

`r7/nav.mjs` (`wp50a-review7-probe-nav.log`) shows the same outcome on every Back:

```
bfcache-off en saved=true difference link and Back: ... reader changed {... entity=pty ...}; after Back (persisted=false) {nav=back_forward step=0 entity=pty types=food,services-trades stage=trading}
bfcache-off en saved pty/food/trading, newer saved sole-prop/beauty/not-started, Back to the wizard (persisted=false): {nav=back_forward step=0 entity=pty types=food stage=trading}
```

The browser's ticks are what show, not the saved answers. In the second line the wizard's `#order` is the saved `["beauty"]` while "food" shows ticked.

**The other navigation types:**

- **Normal load:** the reader's answer is kept. The e2e test passes, and the pass 6 probe case is fixed.
- **Reload:** Chromium puts nothing back on a reload (`nav=reload … entity=sole-prop types=food,services-trades`). The saved answers fill the form, and the unsaved changes go, as on any reload. So counting a reload as "normal" makes no difference in Chromium. In Firefox, which does put form state back on a reload, it would keep the reader's answers, which is the right outcome. I could not run Firefox here (only Chromium is installed).
- **Back/forward cache restore:** the page and its script state come back whole, and nothing re-runs, so nothing can be lost. I could not get headless Chromium to use the back/forward cache, even with `--enable-features=BackForwardCache` and Playwright's disabling argument removed (`persisted=false`, `wp50a-review7-probe-nav-bfcache.log`). So M1 affects a Back the cache does not serve: an evicted entry on a low-memory phone, a browser or setting without the cache, or any page Chrome declines to cache.

`wp50a-review7-probe-back-204a2a2.log` shows `204a2a2` gives the same lines, so this is not a regression.

**Why it is major.**

- It saves answers the reader can see they changed, without a word. That is the "wrongly overwritten" outcome M1 was meant to remove.
- The no-profile case is a dead Next beside a visible answer, which is audit item 2.
- The route is a link in question 1's own fieldset ("What is the difference?"), which a first-time owner choosing between sole proprietor and Pty Ltd is likely to follow.
- The pass 6 rule for back/forward was written for browser behaviour that Chromium does not have, and the docs repeat it.

**Fix.**

- **Re-read the form once the browser has put its ticks back.** In `connectedCallback`, add a `pageshow` listener (removed in `disconnectedCallback`). When `event.persisted` is false, run a `#sync()` that:
  1. keeps `#order` entries that are still checked;
  2. appends any other checked kinds in page order;
  3. calls `#update()`.

  Also call it from `answers()` and `#stepValid` for the kinds of business, so a missed event can never save a kind that is not ticked.
- **Or stop the browser from putting ticks back** with `autocomplete="off"` on the `<form>`. The saved answers then win on Back, as the docs say. The no-profile reader loses unsaved ticks on Back, but what shows is what the wizard holds.
- **Correct** `wizard.ts:180-181` and `docs/design-system.md:849-850` to what happens.
- **Add a `wizard.spec.ts` case:** with saved answers, change the kinds of business, follow "What is the difference?", go Back, then "See my path". Expect the profile to match the ticks on screen. Add the no-profile case too: Next enabled with the restored answer.

## Minor

### m1. Only a throw in the wizard's entry file names "Wizard"; one in a module it imports leaves the page on question 1 with "Loading the next step…" for good

Where: `src/scripts/theme-init.js:54`. The name comes from `event.filename`, which is the file of the top stack frame. The wizard's entry `Wizard.astro_astro_type_script_index_0_lang.*.js` imports `store.*.js`, `profile-store.*.js`, `storage-notice.*.js` and `path-data.*.js`. `connectedCallback` calls into them (`profile.get()`, `parseProfile`).

**Reproduced** with `r7/fail.mjs` (`wp50a-review7-probe-fail.log`) at 360×740. Each case rewrites one built chunk on the way in:

```
entry throws at the top (edited 1): errors ["boom"]; failed=Wizard ready=false questions true/true/true stepper=false waiting=false results=true
storage-notice throws at the top (edited 1): errors ["boom"]; failed=storage-notice ready=false questions true/false/false stepper=true waiting=true results=false
path-data throws at the top (edited 1): errors ["boom"]; failed=path-data ready=false questions true/false/false stepper=true waiting=true results=false
a dependency function throws inside connectedCallback (edited 2): errors ["dep"]; failed=path-data ready=false questions true/false/false stepper=true waiting=true results=false
entry throws after ready (edited 1): errors ["late"]; failed=Wizard ready=true questions true/false/false stepper=true waiting=false results=false
header script throws (edited 1): errors ["other"]; failed=SiteHeader ready=true questions true/false/false stepper=true waiting=false results=false
```

**What works.**

- The e2e case: the entry itself throws at the top.
- No false positives:
  - the entry throwing after `data-ready` (on Next) names "Wizard" but changes nothing on screen, because every rule waits for `data-ready`;
  - another page script's error names only that script;
  - an `ErrorEvent` with no file is ignored (`tests/dom/theme-init.test.ts`);
  - from reading the code, not run: an image's load error is a plain `Event` with no `filename`, so it is ignored, and extensions' content scripts run in their own world, so their errors do not reach the page's `window` listener.

**What does not work.** A throw in a module the wizard imports, or in one of its functions while `connectedCallback` runs, names that chunk. The page stays on question 1 with the stepper and "Loading the next step…", and has no way on. The visible line now promises a step that never comes. `204a2a2` was as stuck, and pass 6's m2 was minor, so this stays minor. The cost is 10 bytes gzip on every page (`r7/tisize.mts`: 985 to 995 B), and the budget is unchanged at 24.0 KB.

**Fix.** One of these:

- **Name the wizard by `data-ready`, not by the file name:** in `theme-init.js`, on any window `error` before `DOMContentLoaded` + a tick, mark every `st-wizard:not([data-ready])` as failed. That widens the false-positive window, so keep it to errors whose file is under `/_astro/`.
- **Have the wizard catch its own setup:** wrap the import and `connectedCallback` body in `try … catch` that sets `data-st-script-failed` itself. A top-level throw in a dependency still escapes this, because the entry never runs.
- **Or accept it,** and record it in the backlog row with the hang case. In that case "Loading the next step…" should also go after some seconds, as the hang row already considers.

Add a `fail.mjs`-style e2e case with `storage-notice.*.js` throwing, whichever is chosen.

### m2. "Loading the next step…" is hidden from screen readers

Where: `src/components/wizard/Wizard.astro:168` (`aria-hidden="true"`).

Pass 6 m1 was that a reader who answers question 1 early sees no way on and no reason why. The line fixes that for sighted readers only. Before the script, a screen-reader user who answers question 1 and reads on finds:

- the end of the fieldset ("What is the difference?");
- then nothing, because Next and the saved line are `visibility: hidden`, and the waiting line is `aria-hidden`;
- then the footer.

That is the gap pass 6 m1 described, still there for them. `r7/misc.mjs` (`wp50a-review7-probe-misc.log`) takes the wizard's accessibility tree with the modules held, in both languages. The tree ends at the link "What is the difference?" ("Wat is die verskil?"), with no Next and no waiting line (`waiting line in the tree=false, Next in the tree=false`).

Hiding the line does not prevent a real problem:

- it is static text, not a live region, so it would not interrupt anyone;
- it is `display: none` from `data-ready`, so it cannot be read after Next exists;
- on the failure path it is hidden too.

The comment's reason ("not read out, the answers work meanwhile") is true for sighted readers as well, and they get the line.

**Fix.** Drop `aria-hidden="true"`, and update the e2e assertion at `tests/e2e/wizard.spec.ts` ("toHaveAttribute('aria-hidden', 'true')") to expect the line in the accessibility tree before `data-ready` and gone after.

## What I verified and found holding

### 1. An answer given before the script is kept

- **Normal load:** with saved answers and the modules held, a reader who taps "Pty Ltd" keeps it, and the untouched questions come back from the profile. `wizard.spec.ts`'s new case passes in chromium and mobile.
- **Kinds of business order:**
  - with saved answers and none ticked, `#order` is the saved order (`["services-trades","food"]` after a reload, `wp50a-review7-probe-nav.log`);
  - a kind ticked before the script cannot happen on a normal load, because question 2 is `display: none` until `data-ready`.

  The order goes wrong only after a Back the cache does not serve (M1).
- **Reload and bfcache:** see M1.
- **`pty-growing` with a changed question 1** (`wp50a-review7-probe-misc.log`): with a saved `pty` / `food` / `pty-growing` profile and "Sole proprietor" tapped before the script, question 3 has "Pty Ltd, growing" unticked and disabled, with its reason shown, and "See my path" `aria-disabled`. The reader must pick a stage again, with the reason in view. Nothing is lost silently.

### 2. The "Loading the next step…" line (`wp50a-review7-probe-waiting.log`, `r7/look.mjs`)

| Case | Result |
| --- | --- |
| Contrast, light | `rgb(92, 86, 72)` on `rgb(251, 248, 243)`, 6.88:1 (the `st-hint` muted text pair, already in `CONTRAST_PAIRS`) |
| Contrast, dark | `rgb(179, 170, 153)` on `rgb(21, 19, 15)`, 8.06:1 |
| Forced colours | system `CanvasText`, no background or border that could vanish |
| 200% zoom of 320px (160 CSS px) | box 128×101 (en), 128×115 (af); the text wraps to two lines, 40px tall, inside its box |
| 400% of 1280 (320 CSS px) | same as 320px |
| Afrikaans at 320px | "Die volgende stap laai…" is 145×18 in a 288×78 box |
| Overflow | never past its box, and no sideways scroll, in any of the 30 combinations |

It is `display: none` without JavaScript, on the failure path and from `data-ready`. It takes no room of its own: it is `position: absolute; inset: 0` in the nav, and its box equals the nav's in every row above.

### 3. `data-st-script-failed` from the `ErrorEvent` filename

See m1 for the cases.

- **The stepper's failure rule** now reads `html[data-st-script-failed~='Wizard'] st-wizard:not([data-ready]) .st-wizard__stepper`, so a late error keeps the stepper ("entry throws after ready … stepper=true").
- **The YourPathCard rule** keys on `st-your-path[hidden]`, not `data-ready`, but the card's script removes `hidden` when it draws, so a later error there changes nothing either. "Every rule … waits for its element's data-ready" in the comment is close enough.
- **The theme-init tests** run on the source and the minified copy and pass.

### 4. The saved line and the hint keep their room

- **The hint selector** is component-scoped. The built CSS is `.st-wizard__nav[data-astro-cid-ujow3465] p[data-astro-cid-ujow3465][data-next-hint][hidden]{visibility:hidden;display:block!important}`. It touches only the three "Choose an answer first." lines, not `[data-earlier-hint]` or any other `[hidden]` element.
- **Screen readers:** a hint kept this way is `visibility: hidden`, so it is not read, and `#update` no longer points `aria-describedby` at it.
- **The no-JavaScript form:** the nav and the saved block are `.js-only`, which is `display: none !important` under `html:not(.js)`, so the form is unchanged (`nojs.spec.ts`, including `:461` on all 198 routes, passes).
- **The failure path:** both are `.js-only` inside `[data-enhance]:not([data-ready])`, so they take no room (the "throws" case shows all three questions and the result button).

### 5. `aria-current="step"` in the HTML

`[data-stepper="0"]` has `aria-current="step"` before the script (`wizard.spec.ts`), and `#show` moves it. The stepper is `display: none` without JavaScript and on failure, so no stale "current" is exposed there. The semibold room for the title (pass 3, m1) means marking the step in the HTML moves nothing.

### 6. The tests

- **The routing DOM test** (`tests/dom/wizard.test.ts:89`) reaches the state by clearing question 1 without an event, then by unticking the only kind on question 3's view. It checks the step, the focus and that `navigate` is not called. That is the safety net pass 6 asked for.
- **The interaction figure** now counts every shift with a 0.1 bound. It was 0.000 in every run here, so the bound is real and has room.
- **The arrival sweep** runs every position unanswered and answered: 178 runs over 4 sizes in 2 languages, and the worst is 0.000.
- **The gap:** none of the new tests covers a Back (M1) or a throw in a dependency (m1).

### Things accepted in passes 1 to 6

`git diff 91837b0..a680b7b --stat` touches:

- the wizard, its tests and fixtures;
- `theme-init.js` and its tests;
- two i18n keys;
- a comment in `utilities.css`;
- three docs.

None of these has regressed, and their e2e, dom and unit tests all pass in the logs above:

- the AI notice on the first screen for all 72 documents (`first-screen.spec.ts`, `dist:trust`);
- reading order and `data-enhance`;
- search loading, the banner, motion and prompt naming;
- template leads and summaries (`tests/content`, `templates.spec.ts`), and the template tabs with no dead controls (`templates.spec.ts:595`);
- tables and reflow (`reflow.spec.ts` on all 198 routes);
- the pill (`first-screen.spec.ts`, `tests/dom/toc.test.ts`);
- theme-init minification, now 995 B gzip;
- the wizard:
  - its stepped first paint;
  - its failure path for an aborted or throwing entry;
  - the gap below Next, at 119 to 141px, equal to `204a2a2`;
  - taps, at 0 to 1px;
  - Next and Back, which never scroll down;
  - Edit answers on an ordinary load.
- **Budget:** `/af/business-types/food/` is at 24.0 KB, with 1.0 KB left.
