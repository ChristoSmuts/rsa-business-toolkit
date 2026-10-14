# main-repair (after the document page's failed WebKit job): review pass 5

**CLEAN**: zero blocker, zero major, one minor, three nit.

CI's own WebKit job (WebKit 26.6) is green on `01c10e1`: 472 passed, 102 skipped, 0 failed, 0 flaky, against 1 failed and 1 flaky on `b19166e`. The two test-only WebKit fixes are engine-correct as far as can be checked without a WebKit binary here, keep every assertion, add no skip and no fixed wait. The product code is unchanged since pass 4 (`b19166e`), and it still behaves: every order of events tried in the search hold ends in exactly one navigation to the right place or none, at CPU 1× and 5×, on desktop and on a Pixel 7; the sources control has its real name and state in Chromium's own tree, in both languages, with and without JavaScript, and axe is clean on it at 320 and 360px. The one minor is visual: from 768px and on paper, where this package makes the rest of the list show in every engine, the join between the two lists is 12px where every other pair of entries is 32px apart.

- Branch reviewed: `main-repair` / `claude/lucid-bell-t5acdn` at `01c10e1` (19 commits on `main` at `005cab0`), checked out as `review-repair-pass5`. Scope: `git log 005cab0..01c10e1 --no-merges`: `f163b23`, `2f1641d`, `84bca9f`, `77e7211`, `2ca04c4`, `178d6fc`, `7304f30`, `54797c9`, `b7b77a6`, `4bdb880`, `e00698e`, `c831b77`, `16a25c7`, `b0c142c`, `b19166e`, `ab0638f`, `1dc09e3`, `cab8e77`, `01c10e1`. The whole diff was read (26 files, +1033 / −81; source and styles 7 files, +221 / −46), not only the commits since pass 4.
- Reviewer: fresh instance, first look at this work; passes 1 to 4 read first. No source, style, test or content file was edited. Probes ran from the reviewer's scratchpad (`repairr5/`) against a copy of this branch's production build served under `/business-toolkit/` (Python static server, port 5810), in Playwright's Chromium (`chromium-headless-shell` 1243).
- Checklists: `stoep-design` (rules 6, 7, 8, 9, 10, 11), `web-interface-guidelines`, `accessibility`. Nothing in the diff animates (the chevron turns at once).
- Screenshots (Chromium, Linux): `docs/reviews/main-repair-pass5/`.
- No stylelint `no-invalid-position-declaration` quirk in this worktree.

## Gate, re-run by the reviewer

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. ESLint, Prettier, Stylelint clean; `astro check` 0 errors, 0 warnings, 0 hints; unit + dom 81 files, 3437 passed; content drift none; content 40 passed (`/tmp/rr5-gatefast.log`). |
| `pnpm build` | exit 0. 200 pages; `dist:audit` 26,659 URLs, no problems; `dist:trust` 74 document pages each with AI notice and sources; `dist:budget` heaviest document page `/af/business-types/food/` 24.3 KB without and with a profile (budget 25.0 KB, "0.8 KB left"), heaviest other `/af/search/` 34.9 KB (`/tmp/rr5-build.log`). Exact figure (`repairr5/budget.ts`, same graph and gzip level as `check-budget.ts`): 24,832 bytes = 24.25 KB, 0.75 KB left. |
| Playwright chromium + mobile + nojs, port 5801 | exit 0: **1716 passed, 103 skipped, 0 failed** (19.8m) (`/tmp/rr5-e2e.log`). |
| `pnpm test:a11y`, port 5802 | exit 0: **424 passed** (7.5m), including the four 360px sources checks (`/tmp/rr5-a11y.log`). |
| `playwright test --list --project=webkit` | 574 tests in 12 files; both changed tests listed (`search.spec.ts:514`, `:574`) (`/tmp/rr5-webkit-list.log`). No WebKit binary here; CI's result is below. |
| `search.spec.ts` ×10, chromium + mobile, CDP CPU throttling 6×, 4 workers, port 5803 | exit 0: **820 passed, 0 failed** (20.2m), including both changed tests 40 of 40 (`/tmp/rr5-search-x10.log`). Pass 3 and pass 4 each saw one `networkidle` timeout at this rate; none here. |
| `interactive.spec.ts` ×10, chromium + mobile, CDP CPU throttling 5×, 4 workers, port 5804 | exit 0: **630 passed, 70 skipped, 0 failed** (11.5m); both ring tests 40 of 40 (`/tmp/rr5-interactive-x10.log`). |

The throttled runs used two untracked copies of the specs (`tests/e2e/zz-rr5-*.spec.ts`, only a `beforeEach` that sets CDP CPU throttling added, `repairr5/mkthrottled.py`), deleted afterwards and never committed.

## CI

| Run | Commit | E2E (webkit) | Everything else |
| --- | --- | --- | --- |
| 38589830144 | `b19166e` | failure: 470 passed, **1 failed** ("a script that arrives after the 8 s fallback does not replay the Enter", 3 of 3 attempts, timeout in `waitForRequest` for the index), **1 flaky** ("an Enter cancelled by Escape …", `toHaveValue('PIS')`: combobox not found), 102 skipped | green |
| 38600090200 | `1dc09e3` | cancelled (superseded) | — |
| 38600459746 | `01c10e1` | **success: 472 passed, 0 failed, 0 flaky, 102 skipped** (7.8m, WebKit 26.6, playwright webkit v2359) | all eight other jobs green (lint/types/unit/content, build, chromium, mobile, nojs, axe, visual, Lighthouse) |

The WebKit report artifact of the failing run could not be downloaded here (the egress proxy refuses the artifact host), so the traces were not read; the reasoning below rests on the CI log, the code and Playwright's WebKit backend.

## Minor

### minor 1: from 768px and on paper, entries 3 and 4 sit 12px apart; every other pair is 32px apart

File: `src/components/trust/SourcesForPage.astro:292-301` (`@media print, (min-width: 768px)`, `.st-sources__rest { padding-block-start: 0; }`), with the section's `gap: var(--st-space-3)` (`:200`)
Acceptance item: general quality (stoep-design rule 9's exception: "all entries show from 768px"; the list should read as one list there).

What is wrong: from 768px and in print the control is `display: none` and the rest is meant to be "an ordinary list", but the two `<ul>`s are joined by the section's grid gap (12px) instead of the list's own spacing. `repairr5/seam.mjs` (`/tmp/rr5-seam.log`), vehicle-dealer page, the gap from one `<li>`'s bottom to the next one's top:

| View | Inside the first list | Entry 3 → entry 4 (the seam) | Inside the rest |
| --- | --- | --- | --- |
| 768 and 1280, EN and AF | 32, 32 | **12** | 32 |
| print, from 360 and from 1280, EN and AF | 29, 29 | **11** | 29 |
| 320 and 360, opened (control between) | 32, 32 | 68 | 32 |

On screen this reads as a hitch: entry 4's title starts right under entry 3's "What this source supports" line, so the two look like one item, on every iPad, Mac and desktop, and on paper (`sources-1280-en.png`, `sources-360-en-print.png`). That is exactly the view this package exists to fix in WebKit, and every engine now shows it. Nothing is lost or hidden, so this is not a major. No test measures the seam; `doc-page.spec.ts` checks the rest is visible and the control is not.

How to reproduce: `node repairr5/seam.mjs` against a build, or open `/business-types/vehicle-dealer/` at 1280px and look at "SARS — VAT 420 Guide for Motor Dealers" and the entry after it.

Suggested fix: in the `print, (min-width: 768px)` block give the rest the list's own spacing less the section gap instead of zero (for example `padding-block-start: calc(<the entries' gap> - var(--st-space-3))`, or wrap both lists so one `.st-stack` gap applies), and add an assertion to the existing 768px and print tests in `doc-page.spec.ts` that the seam equals the gap inside the lists.

## Nit

### nit 1: the budget record in `docs/testing.md` is under "Windows notes" and its "unrounded" figure is not the unrounded figure

File: `docs/testing.md:849`

`01c10e1` closes pass 4 nit 2 with "`/af/business-types/food/` is 24.3 KB (printed; 0.7 KB under the 25.0 KB budget once unrounded figures are used, the build prints 0.8 KB left)". Measured with the budget script's own graph and gzip level, the page is 24,832 bytes: 24.25 KB, **0.75 KB** left, so neither "0.7" nor "0.8" is the unrounded figure. The line also stands at the end of the file, after the "Windows notes" list, while every earlier budget record is with the others near line 284 ("… is 24.00 KB (printed 24.0 KB, 1.0 KB left)"). Suggested: move it next to those records in their format, "`/af/business-types/food/` is 24.25 KB (printed 24.3 KB, 0.8 KB left)".

### nit 2: the "a script that arrives after the 8 s fallback" test does not say which branch it took

File: `tests/e2e/search.spec.ts:574-635`

The race between "the index was asked for" (the script ran, Chromium) and "the script request failed" (the engine dropped it, WebKit per `1dc09e3`) is right, and both branches end with the same strict checks. But the outcome is only in the assertion's message, which shows only on failure, so a green CI run cannot tell whether WebKit took the "dropped" branch as reasoned or ran the script after all. `testInfo.annotations.push({ type: 'outcome', description: outcome })` (or a `console.log`) would make the engine-specific claim checkable from the report, at no cost to strictness.

### nit 3: focus stays in the closed dialog's field for a moment in every engine; the product could move it

File: `src/scripts/search-boot.ts:171-182` (the pre-script Escape and Close handlers), `src/scripts/search.ts:185-202` (`#onClose`)

`ab0638f` is right that this is a test-harness timing issue: `repairr5/race.mjs` case N measures the same window in Chromium (focus leaves the closed dialog 18–26 ms after Escape at 1×, 77–88 ms at 5×; it then lands on `<body>` when the dialog was opened with `/` from nothing focused, or on the header's search link on a phone), and no reader types `/` that fast. When the dialog was opened from `<body>`, neither script returns focus anywhere (`#onClose` calls `body.focus()`, which does nothing), so the hidden field keeps focus until the engine's own fix-up runs. Blurring the field on close when there is no focusable opener would make the state deterministic and let the test drop its precondition poll. Optional.

## The two WebKit test fixes, judged

### `ab0638f`: reopen with `/` only once focus has left the closed dialog

- **Engine-correct.** `showModal()` records the focused element to give focus back to on close; with `<body>` focused there is no focused element, so `close()` restores nothing and the field inside the now hidden dialog keeps focus until the engine's focus fix-up moves it. `site.ts` ignores shortcut keys typed in a field (`isTypingTarget`, `src/scripts/site.ts:32`), so a `/` sent in that window goes into the hidden field, and `field(page)` (by role) then finds no visible combobox: exactly CI's flaky failure ("element(s) not found" at `search.spec.ts:530`). Chromium has the same window, only shorter (case N above).
- **Still strict.** It waits for a condition (`expect.poll` on `!dialog.contains(document.activeElement)`), not for time; it polls from the test, correctly, because `waitForFunction`'s default polling uses `requestAnimationFrame`, which Playwright's paused clock controls in this test. No assertion changed. CI WebKit: passed first time on `01c10e1`.

### `1dc09e3`: accept either outcome for the held script after the 8 s fallback

- **Engine-correct, as far as can be checked here.** The CI failure (3 of 3, timeout waiting for the index request after releasing the script) fits the stated cause: once the fallback's navigation to `/search/` starts, WebKit cancels the old document's pending loads, so the held module never runs. Playwright's WebKit backend supports the test's handling of it: a cancelled intercepted request reports `Network.loadingFailed` (→ `requestfailed`), and `route.continue()` on it is `sendMayFail` (`playwright-core@1.63.0/lib/coreBundle.js:46515`), so the release after the cancel cannot throw. In Chromium the old document keeps its loads until the new one commits (the search page is held), so the script runs and asks for the index; the reviewer's `repairr5/race.mjs` J (script arrives after the fallback) and the new JF (script fails after the fallback, which is what WebKit does) both give exactly one navigation, to `/search/?q=PIS`, at 1× and 5×, desktop and phone.
- **Still strict.** No skip. In both branches the test requires zero submits after the fallback's own, then `/search/?q=PIS` with "PIS" in its field. In the "dropped" branch the no-replay check is true by construction (the script never ran), which is the real behaviour a Safari reader gets, not a loosened check; nit 2 asks only that the branch taken be visible. The console allowance is scoped to this one test and to the two messages a dropped module gives in WebKit (`/Importing a module script failed|Failed to load resource: cancelled/`); Chromium's message for a failed dynamic import ("Failed to fetch dynamically imported module") is not covered, so nothing is hidden in Chromium. Both promises that may lose the race have `.catch` so a page close is not an unhandled rejection. CI WebKit: passed first time on `01c10e1`.

## The sources control, checked

`repairr5/sources.mjs` (`/tmp/rr5-sources.log`), `repairr5/axe.mjs` (`/tmp/rr5-axe.log`); vehicle-dealer page, EN and AF, JavaScript on and off, at 320, 360, 768 and 1280px:

| Check | Result |
| --- | --- |
| Name and state in Chromium's own tree (`Accessibility.getPartialAXTree`) | `checkbox "Show the other 38 sources"` / `checkbox "Wys die ander 38 bronne"`, name from `relatedElement` (the `<label for>`), `checked=false`, then `checked=true` after Space; same name in both states; focusable, not ignored. Same with JavaScript off. |
| Hit area | checkbox box equals the label row: 288×44 at 320px, 326.7×44 at 360px, EN and AF, JS on and off. A click 4px from the row's right and bottom edges checks it. |
| Keyboard | Tab from the first list's last link lands on the checkbox; Enter does nothing (right for a checkbox, and nothing submits); Space checks it and shows the rest. |
| Focus ring | `solid 3px` in `--st-focus` on the label (`sources-360-en-focus.png`). Forced colours, light and dark: label text, chevron border and ring in the system colour (`rgb(0,0,0)` / `rgb(255,255,255)`; `sources-320-forced-*.png`). |
| Layout | 3 entries visible at 320 and 360 until checked, then all (`sources-320-af-closed.png`, `sources-320-af-open.png`); at 768 and 1280 all entries and no control (`sources-1280-en.png`, see minor 1); no sideways scroll at any width. |
| Print | from 360px, EN and AF: the rest shows, no control (`sources-360-en-print.png`, see minor 1). |
| axe at 320 and 360 | WCAG 2.0–2.2 A/AA tags on the section, closed and open, light and dark, EN and AF, scripts on and blocked, with touch: **0 violations** in 32 runs. |
| Copy | sentence case, plain verb, one phrase in both states, number byte-identical in Afrikaans, `trust.sources.more` only (no `less`) in both dictionaries with the same keys. |

WebKit and Safari, reasoned: the control needs `<label for>` with a real text node, `:checked`, the general sibling combinator and two prefix-syntax media queries, which every Safari the project serves supports; CI's WebKit job runs `doc-page.spec.ts`'s phone, keyboard, 768px and print checks and is green. `:focus-visible` (Safari 15.4+) is used as everywhere else in the system.

## The search hold, every order tried

`repairr5/race.mjs` (`/tmp/rr5-race.log`): the dialog's script (`search.<hash>.js`) held by `page.route` until released, aborted or never answered; desktop 1280×800 (opened with `/`) and Pixel 7 (tap on the header's search link); CDP CPU throttling 1× and 5×. Every case ran four times (two profiles × two rates); results were the same in all four. Times are from the Enter.

| Case | Result |
| --- | --- |
| A. Enter, release | one navigation, `/glossary/#pis` |
| B. Enter twice, release | one navigation, `/glossary/#pis` |
| C. Enter, Escape, release | 0 navigations, dialog closed |
| D. Enter, Close, release | 0 navigations, dialog closed |
| E. Enter, new text, release | 0 navigations, dialog open |
| F. Enter, Escape, reopen, release, then a new Enter | nothing until the new Enter, then one navigation, `/glossary/#pis` |
| G. Script fails after Enter | one navigation, `/search/?q=PIS%20tax` |
| H. Script never arrives | one navigation, `/search/?q=PIS`, at 8.01–8.02 s |
| J. Fallback fired, script then arrives while the search page is held | one navigation, `/search/?q=PIS` |
| JF. Fallback fired, script then fails while the search page is held (WebKit's case in `1dc09e3`) | one navigation, `/search/?q=PIS` |
| K. Script released, index held | "Loading search…" on the status line, then one navigation to the result |
| L. No `requestSubmit` (Safari < 16), Enter, release | one navigation, `/glossary/#pis` |
| M. Closed empty, then the script fails | 0 navigations |
| Q. Enter, Escape, then the script fails | 0 navigations |
| AA. Enter, script fails at 5 s, search page held 4.5 s | one navigation, at 5.0 s |
| AD. Enter on "PIS", new text "EMP201", Enter, release | one navigation, `/glossary/#emp201` |
| T. Enter, text changed and changed back, release | one navigation, `/glossary/#pis` |
| W2. Script released at 8.2 s | one navigation, `/search/?q=PIS` at 8.0 s |
| X. No `requestSubmit`, script never arrives | one navigation, `/search/?q=PIS` at 8.0 s |
| Y. Blank query, Enter, release | 0 navigations, dialog open |
| N. Text typed, Escape | 0 navigations; focus leaves the dialog 18–88 ms later (nit 3) |

No lost, duplicated, stale or unexpected navigation in 88 runs. Read from the code and consistent with the runs: `forget()` clears the text and the timer and runs on every new held Enter, on `close`, after the replay and in the failure handler; `left` is set on both ways out, so neither fires after the other; the replay compares the text at the Enter with the text now. Safari before 16: `search-boot.ts` dispatches a cancelable `submit` (L, X), and `search-ui.ts` and `search.ts` fall back to `form.submit()` after the same empty-query check their handlers make. Before 15.4 there is no `<dialog>`: `showModal()` throws before `preventDefault()` and the header link goes to `/search/`. The no-JS path is the plain GET form to `/search/` (`nojs` project green).

## Tests

- Nothing loosened: no retries, `test.slow`, `waitForTimeout` or fixed waits added anywhere in the diff. The skips are the CDP name tests (`doc-page.spec.ts`, `browserName !== 'chromium'`, with the reason), a keyboard test on `mobile`, and the trip-counting test where the Navigation API is missing (feature-detected, so it should run in CI's WebKit 26.6, Safari having shipped the API in 26.2; not verified from a report here).
- `page.clock` is installed before `goto`, paused after load, and only `runFor` moves it; nothing waits 8 real seconds.
- The ring tests record `transitionrun` from before the action; the reduced-motion half waits for the new percentage and two frames, then requires no ring transition.

## JavaScript budget

Heaviest document page 24.25 KB of 25 KB (printed 24.3 KB, 0.8 KB left); the vehicle-dealer page 23.32 KB. `ab0638f`, `1dc09e3` and the two docs commits change no shipped code; the package's own cost (the held Enter in `search-boot.ts`) is justified: it keeps keys typed on exactly the slow phones the site is for. The sources control costs no script.

## Out of scope, noticed

- The `networkidle` waits and the WebKit layout-shift tests that pass without measuring are now in `backlog.md` (`01c10e1`), with reasons. Nothing new.
