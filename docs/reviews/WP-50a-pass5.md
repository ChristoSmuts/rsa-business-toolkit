# WP-50a review, pass 5

Tree: `fce45c7`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 4 and their fixes. The pass 4 fixes are `277344c..fce45c7`. The reviewer is fresh and independent, and changed no code for this review.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 2 |
| Minor | 3 |

- **M1:** the wizard's hold leaves 1,514 to 2,315px of empty page below question 1's Next on every visit with JavaScript (2.1 to 4.5 screens). No reader scroll ever releases it, because the wizard never leaves the screen. This is a regression against `204a2a2`, where the gap is 119 to 141px.
- **M2:** at pass 4's own position (question 1, heading at -150px), the tap that releases the hold moves the tapped choice by 8 to 11px. The footer comes up about 1,780px into the lower part of the screen at the same moment. `204a2a2` moves nothing there.

The checks all pass. The sweep (`wizard-shift.spec.ts`) passes as well. But it measures only the moment the script arrives. Both majors happen later: M1 on every ordinary visit, and M2 when the reader first taps.

What the pass 4 fixes get right:

- The script's arrival no longer shifts anything, at any position in the sweep.
- `scrollY` restoration after the focus jump works, and it never fights the reader.
- The IntersectionObserver never fires wrongly.
- The theme-init tests run on the minified copy.
- The docs on fonts are right.

Nothing accepted in passes 1 to 4 has regressed.

## Checks run

All logs are in the session scratchpad as `wp50a-review5-*.log`, and the probe scripts are in `r5/`. The probes ran against the built `dist/` in Playwright Chromium, served by `tests/e2e/helpers/web-server.ts` on port 4963 under `/business-toolkit/`. They ran before e2e and a11y started, or after both had finished. For the comparison with the base, the `204a2a2` build already in the scratchpad (`base204/`, whose `src/scripts/wizard.ts` is byte-identical to `git show 204a2a2:src/scripts/wizard.ts`) was served on port 4964.

`pnpm gate:fast` (`wp50a-review5-gatefast.log`):

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  78 passed (78)
      Tests  3274 passed (3274)
Content drift: none.
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

`pnpm build` (`wp50a-review5-build.log`):

```
[build] 198 page(s) built in 5.36s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

After the build, `git status` was clean.

`pnpm content:fidelity --lang af` (`wp50a-review5-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

The e2e run (`wp50a-review5-e2e.log`) used the brief's exact command: chromium, mobile and nojs, `PW_PORT=4961`, with the default reporters:

```
Running 1650 tests using 2 workers
  93 skipped
  1557 passed (15.3m)
EXIT 0
```

The log has no `✘` lines and no flaky or retried tests. The total is 1,678 at pass 4, minus the 36 single-position tests that were removed, plus the 8 sweep tests. The 93 skips are the same as at pass 4. The sweep's own lines:

```
wizard sweep en 412x839: 40 positions, worst shift 0.007, worst scroll movement 0.0px
wizard sweep af 412x839: 42 positions, worst shift 0.015, worst scroll movement 0.0px
wizard sweep en 360x740: 45 positions, worst shift 0.020, worst scroll movement 0.0px
wizard sweep af 360x740: 48 positions, worst shift 0.020, worst scroll movement 0.0px
wizard sweep en 320x568: 53 positions, worst shift 0.033, worst scroll movement 0.0px
wizard sweep af 320x568: 56 positions, worst shift 0.060, worst scroll movement 0.0px
wizard sweep en 1280x720: 34 positions, worst shift 0.000, worst scroll movement 0.0px
wizard sweep af 1280x720: 34 positions, worst shift 0.001, worst scroll movement 0.0px
```

`pnpm test:a11y`, `PW_PORT=4962` (`wp50a-review5-a11y.log`):

```
  416 passed (7.5m)
EXIT 0
```

The log has no `✘` lines.

`pnpm exec commitlint --from 277344c --to fce45c7` printed nothing and exited 0 (`wp50a-review5-commitlint.log`).

## Major

### M1. The hold leaves two to four screens of empty page below question 1, and no scroll ever releases it

Where:

- `src/scripts/wizard.ts:143`: `#hold` runs on every load, including at the top of the page, where there is nothing on screen below the question to protect;
- `src/scripts/wizard.ts:155-172`: the hold sets `min-block-size` to the whole no-JavaScript form's height, and only the IntersectionObserver can release it without a tap;
- `src/scripts/wizard.ts:164-168`: the observer releases only when the wizard is fully off screen. The footer (167 to 288px) is shorter than every viewport tested, so at the end of the page the held wizard still fills the top of the screen, and the release never fires;
- `docs/design-system.md:834-846` says the wizard takes its own height when the reader "scrolls it fully out of view". That cannot happen.

**How I reproduced it.** `r5/blank.mjs` (log `wp50a-review5-probe-blank.log`) does an ordinary load, with no modules held, so the script arrives at the top as it does for nearly every reader. It measures the gap between the bottom of question 1's Next bar and the footer, then scrolls down with the mouse wheel to the end of the page, then back to the top. The same script against `204a2a2` is in `wp50a-review5-probe-blank-204a2a2.log`:

| Viewport | `fce45c7`: empty below Next | At the end of the page, empty on screen | Hold released by scrolling | `204a2a2`: empty below Next |
| --- | --- | --- | --- | --- |
| en 412×839 | 1,911px (2.3 screens) | 621 of 839px | no | 119px |
| af 412×839 | 1,920px (2.3 screens) | 598 of 839px | no | 141px |
| en 360×740 | 2,042px (2.8 screens) | 499 of 740px | no | 141px |
| af 360×740 | 2,135px (2.9 screens) | 499 of 740px | no | 141px |
| en 320×568 | 2,200px (3.9 screens) | 328 of 568px | no | 141px |
| af 320×568 | 2,315px (4.1 screens) | 280 of 568px | no | 141px |
| en 1280×720 | 1,578px (2.2 screens) | 551 of 720px | no | 120px |
| af 1280×720 | 1,626px (2.3 screens) | 551 of 720px | no | 120px |
| en / af 640×360 (1280×720 at 200% zoom) | 1,614 / 1,636px (4.5 screens) | 194 / 193 of 360px | no | 119px |

`r5/release.mjs` (`wp50a-review5-probe-release.log`, 250 runs) holds the modules, puts the reader at 7 positions, releases the modules, and then takes each route that should release the hold. It confirms the scroll route: in all 70 "scroll the wizard out of view" runs, at every size, in both languages and from every starting position, the hold was still in place at the end of the page (`heldAfter=2649px` and so on). The other routes work: a change, Next and Back each release it.

Screenshots: `r5/shots/blank-en-412-past-nav.png` is one whole phone screen of the page background, just past Next. `blank-en-412-end.png` is the end of the page: 621px of nothing, then the footer.

A reload keeps the gap (`r5/reload.mjs`, `wp50a-review5-probe-reload.log`). After a change, scrolling to the end and reloading, the browser restores the same `scrollY`, and the held page shows 288 to 381px of empty screen. `204a2a2` shows 9 to 141px. Turning off scroll restoration in the sweep (`wizard-shift.spec.ts:62`) does not hide any other problem: the restored position is where the reader was.

Screen reader and keyboard users are not affected: the empty room has no content, and Tab goes from Next to the footer links. Without JavaScript nothing is held (`#hold` runs only in the script). With pinch zoom, the visual viewport does not change the observer's root, and I found no wrong firing at 200% zoom or on first paint. The observer simply never gets a chance to release.

**Why it is major.** The first-time owner on a phone opens Find my path, reads question 1 and scrolls on to see what comes next. They get two to four screens of blank page and then a footer, which looks like a broken page. It happens on every visit with JavaScript, not only when the script is slow. It is a regression against `204a2a2`. It also breaks Stoep's brief ("get them to the right paragraph fast"). Pass 4 suggested releasing on `resize` too, and that was not done: rotating the phone keeps the portrait height in pixels.

**Fix:**

- Hold only what is on screen when the script arrives. Set `min-block-size` to `max(0, min(height, scrollY + innerHeight − wizardTopInDocument))`. Then nothing visible moves, and the empty room ends at the bottom of the screen the reader was looking at. At the top of the page on a phone, question 1's Next is already below the fold (1,154px at 412×839), so the hold would be 0.
- Release when the reader scrolls past the shown step's nav, for example by observing a sentinel after `.st-wizard__nav`, and on `resize`. Don't wait for the whole wizard to leave the screen.
- Add an e2e check for an ordinary load: the space between the shown step's nav and the footer is at most one screen, and after scrolling to the end the hold is gone. The sweep stops measuring at the release, so it cannot see this.
- Correct `docs/design-system.md` § "Controls that need a script" to match.

### M2. At question 1, the tap that releases the hold moves the tapped choice and pulls the footer up under it

Where: `src/scripts/wizard.ts:178-202` (`#release`). Releasing drops `min-block-size` and makes the document shorter than `scrollY + innerHeight`. The browser then clamps the scroll before the `scrollBy` at `:199-201` can act, and `scrollBy` cannot scroll past the new end of the page.

**How I reproduced it.** `r5/release.mjs` and `r5/tap2.mjs` (logs `wp50a-review5-probe-release.log` and `wp50a-review5-probe-tap.log`) do this:

1. Hold the modules.
2. Scroll so that question 1's heading is at -150px, the position from pass 4.
3. Release the modules.
4. Tap the lowest choice in view ("I have not decided").

| Viewport | Tapped choice (top, before → after) | `scrollY` | Footer top | Layout shift (marked as input) |
| --- | --- | --- | --- | --- |
| en 412×839 | 291 → 302 | 664 → 654 | 2401 → 621 | 0.260 |
| en 1280×720 | 238 → 246 | 542 → 535 | 2000 → 551 | 0.235 |
| af 1280×720 | 238 → 246 | 542 → 535 | 2000 → 551 | 0.235 |

The same tap at `204a2a2` (`wp50a-review5-probe-tap-204a2a2.log`) moves nothing: `choices=24 → 24`, `footer=621 → 623`, and no layout shift.

Because the shift follows a tap, Chrome marks it `hadRecentInput`, so it does not count towards CLS, and the sweep does not see it. But the reader does. The thing they just touched slides down by 8 to 11px while the footer rises 1,780px into the bottom of the screen. This is the pass 4 M1 shift and scroll, moved from the script's arrival to the reader's first tap. `docs/design-system.md` says "what the reader touched keeps its place on screen", and here it does not. At the other positions and routes the tapped choice stays within 2px. The 1 to 2px left over is the checkbox's own change.

**Why it is major.** It is a regression against `204a2a2`, and the fix doesn't fix its item. Pass 4's M1 found exactly this clamp and scroll at question 1, and they are still there.

**Fix:** in `#release`, when the wizard is on screen, keep `min-block-size` at the height the document needs so that `scrollY + innerHeight` still fits. That is `scrollY + innerHeight − wizardTopInDocument − (document height − wizard bottom)`, if positive. Drop the rest only once that room is off screen, using the same sentinel as M1. Add the -150px question-1 tap at 412×839 and 1280×720 to the e2e suite, and assert that the tapped input stays within 1px.

## Minor

### m1. On question 2 at 320 and 360px, the first tap moves the question's heading down 22 to 23px

Where: `src/scripts/wizard.ts:57-64`, where the change handler hides the no-JavaScript line with the tapped input as the anchor, and `src/components/wizard/Wizard.astro:452-455`.

**How I reproduced it** (`r5/tap2.mjs`, `wp50a-review5-probe-tap.log`). The reader's question 2 heading is at 80px, and the reader taps the lowest kind of business in view:

```
en 360x740: heading=80 choices=320  ->  heading=103 choices=320
en 320x568: heading=80 choices=341  ->  heading=103 choices=342
af 320x568: heading=80 choices=341  ->  heading=102 choices=341
af 360, 412 and 1280 in both languages: heading 80 -> 80
```

The tapped choice stays put, because the scroll keeps it there. The 27px slot shrinks above it, though, so the heading, "Choose all that fit" and the last line of the stepper all slide down (`r5/shots/tap-en-320-type80-before.png` and `-after.png`). It follows a tap, so it does not count as a layout shift, and it is smaller than the gap pass 4 m1 found. But a reader sees the top of the question move as they tick their first box.

**Fix:** drop the hidden line when question 2 is off screen, on Next or Back away from it, or when a `go()` lands on it. Or use pass 4's first suggestion: shorten `wizard.noJsOneType` so the two lines wrap to the same number of lines at 320px, and drop the code.

### m2. If the wizard's module fails to load, each step keeps an invisible 44 to 78px bar for good

Where: `src/components/wizard/Wizard.astro:362-370`. `html.js st-wizard:not([data-ready]) .st-wizard__nav.js-only { display: flex !important; visibility: hidden }` does not look at `data-st-script-failed`.

**How I reproduced it** (`r5/fail.mjs`, `wp50a-review5-probe-fail.log`). I aborted every module except theme-init. theme-init then sets `data-st-script-failed="… Wizard …"`, `data-ready` never comes, and the no-JavaScript form is the page:

```
en 360x740: navs flex/hidden 44px | flex/hidden 78px | flex/hidden 78px
af 360x740: navs flex/hidden 78px | flex/hidden 78px | flex/hidden 78px
en/af 1280x720: navs flex/hidden 44px | 44px | 44px
```

That leaves three blank gaps between the questions and the result button. Before `c86fe8c`, the bars took no room. The gaps are not focusable and not in the accessibility tree, and the form still works.

**Fix:** scope the rule to `html.js:not([data-st-script-failed~='Wizard'])`, the way `YourPathCard.astro:74` and `my-path.astro:256` scope theirs.

### m3. No e2e test now covers pass 3's M1 (a focused kind of business scrolling the page)

Where:

- `tests/e2e/wizard-shift.spec.ts:11-12`: "No answers are given", so no input has focus when the script arrives;
- `tests/e2e/wizard.spec.ts:942`: the single-position tests that answered question 2 with a click, leaving focus on a kind of business, were removed.

**How I reproduced it.** I made a mutation in a scratch copy (`r5mut/`, from `git archive fce45c7`). I removed `if (view && view.scrollY !== scrolled) view.scrollTo(view.scrollX, scrolled);` at `wizard.ts:133` and built it.

- **The probe sees the bug** (`r5/focus.mjs`, `wp50a-review5-mutation-focus.log`). The reader ticked "Food business", scrolled until question 3's heading was at 400px, and the script arrived. The page jumps by itself:

  ```
  en 360x740: y 2018->1233   en 320x568: y 2340->1524   en 1280x720: y 1515->891
  af 360x740: y 2219->1315   af 320x568: y 2455->1547   af 1280x720: y 1563->891
  ```

  On `fce45c7` as committed, `y` does not change in any of those 24 runs (`wp50a-review5-probe-focus.log`).
- **The tests do not** (`wp50a-review5-mutation-e2e.log`). `wizard-shift.spec.ts` and `wizard.spec.ts` on that build, chromium and mobile: `84 passed, 2 skipped`, with no `✘`.

The code is right today. Nothing would catch it breaking.

**Fix:** in the sweep, run one more pass per size in which questions 1 and 2 are answered with a click before the scroll, so focus is on a kind of business.

## What I verified and found holding

### The hold, route by route (`wp50a-review5-probe-release.log`)

The probe covered 412×839, 360×740, 320×568, 1280×720 and 640×360, in both languages. The reader's question heading was at -150, 80 or -300px, or the page was at the top. Each run released the hold by a change, by Next, by Back or by scrolling.

- **When the script arrives**, no layout shift without input counts in any of the 250 runs (`cls(no-input)=0.000`), and `scrollY` does not move. The fix does what it says at the moment of arrival.
- **Next and Back** release the hold and move focus to the next heading, as before. A change releases it too. The tapped input keeps its place within 2px, except in M2 and the heading move in m1.
- **`scrollY` restoration after the focus jump** (`wizard.ts:131-133`) works in all 24 runs of `r5/focus.mjs`. It runs in the same task as the type change, so it cannot fight a reader's scroll. It only acts when the type change itself scrolled. Focus on a kind of business that folds away falls to `<body>`, and the next Tab goes to question 3's first choice.
- **The IntersectionObserver.** It is created after `#show` and marks the wizard seen on its first callback. I found no wrong release: none at first paint, none at 200% zoom (640×360), none on reload. Its problem is that it never releases at all (M1).
- **Before `data-ready`** the nav bars are `visibility: hidden`, so they are not focusable and are not read out. Without JavaScript they take no room. The `nojs` project passes, including `nojs.spec.ts:461` on all 198 routes.

### The sweep (`tests/e2e/wizard-shift.spec.ts`)

- **Positions.** It covers the wizard's top every 60px, each step's end 40px above the bottom of the screen, and `layout.max` (the footer in view). That is "near the end of each question" and "footer in view", taken from the no-JavaScript form, which is what the reader sees before the script.
- **The fonts rule.** It hides nothing the wizard causes. `r5/fonts.mjs` (`wp50a-review5-probe-fonts.log`) released the fonts and the modules in both orders, at every question, at 320 to 1280px, in both languages. The script's own shift is 0.000 to 0.005 in every run. The font swap alone moves the question (0.13 to 0.45 at 320px), as pass 4 m2 found. With the hold, the swap after the script is usually smaller than before it, because only the shown step reflows.
- **History scroll restoration off** (`:62`) hides no reader problem; see the reload probe under M1.
- **The gaps.** The sweep stops at the release, so it cannot see M1 or M2, and it gives no answers, so it cannot see m3.

### The minor fixes

- **Question 2's no-JavaScript line** leaves the slot on the first change (`noJsLine.hidden = true`). With the script, the group's `aria-describedby` was already `wz-help-type wz-general-type`, so no description changes. Taking the wizard out of the page restores the line (`tests/dom/wizard.test.ts`). The side effect is m1.
- **theme-init.** `tests/dom/theme-init.test.ts:44-48` runs the behaviour `describe` blocks for `SOURCE` and for `await minifyScript(SOURCE)`, which is the function the build uses. Each block sets `code` in a `beforeAll`, and the blocks run in order. The text checks run on the source only. The unit count went from 3,254 to 3,274: 19 behaviour tests run again on the minified copy, and there is one new wizard test.
- **Docs.** `docs/testing.md` item 6 now says that the font swap moves wrapped text everywhere, not only the header. The WP-50 Phase 2 line asks for fallback metrics measured at 320px with the fonts held. Both match the fonts probe. The design-system wizard section is accurate except for the two claims named in M1 and M2.

### Things accepted in passes 1 to 4

None of these has regressed:

- **AI notice:** it is on the first screen at 320×568 on all 72 documents, with no failures. The worst case is `af/business-types/beauty/`, with its top at 453px (`wp50a-review5-probe-misc.log`).
- **The pill** (`r5/pill.mjs`, `wp50a-review5-probe-pill.log`, 320×568, 4px steps, 31 documents per language): toggles 93 / 123 (en / af), shows under 120px 0 / 1, wrong section named 0 / 0, jumps covering their heading 0 of 423 / 0 of 423. These are the same as passes 3 and 4.
- **Template leads and how-to lines:** the receipt and privacy-notice lines do not repeat their lead in either language, and the tax invoice has no line (`wp50a-review5-probe-misc.log`).
- **`aria-describedby`:** "See my path" is described as "A question before this one has no answer yet. This button takes you to it." while that line shows (`wp50a-review5-probe-misc.log`).
- **Opening at the top:** `scrollY` stays 0 at 320 and 1280px in both languages (`wp50a-review5-probe-misc.log`).
- **theme-init minification and the budget:** `/af/business-types/food/` is at 24.0 KB with 1.0 KB left.
- **Reading order, `data-enhance`, search loading, the banner, motion, prompt naming, tables and reflow:** their e2e, dom and unit tests all pass (`docs/testing.md` items 1 to 10, in the logs above). `[chromium] › reflow.spec.ts` and `[nojs] › nojs.spec.ts:461` each passed for all 198 routes.
- **Venda docs:** `git diff 277344c..fce45c7` touches nothing under `docs/rsa-business-toolkit*`.
