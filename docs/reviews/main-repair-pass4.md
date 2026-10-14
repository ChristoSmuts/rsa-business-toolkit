# main-repair (after the document page's failed WebKit job): review pass 4

**CLEAN**: zero blocker, zero major, zero minor, three nit.

Pass 3's blocker (the CDP name tests would throw in CI's WebKit job) and its minor (two trips to `/search/` when the script fails after a held Enter) are fixed, and the fix for the minor is held by a test that fails on the old code. Every order of events tried in the search hold ends in exactly one navigation to the right place, at CPU 1× and 5×, on desktop and on a Pixel 7. The sources control has its real name in Chromium's own tree in both states and languages, with and without JavaScript, and axe is clean on it at 320 and 360px.

- Branch reviewed: `main-repair` at `b19166e` (fifteen commits on `main` at `005cab0`), checked out as `review-repair-pass4`. Scope: `git log 005cab0..b19166e --no-merges` (`f163b23`, `2f1641d`, `84bca9f`, `77e7211`, `2ca04c4`, `178d6fc`, `7304f30`, `54797c9`, `b7b77a6`, `4bdb880`, `e00698e`, `c831b77`, `16a25c7`, `b0c142c`, `b19166e`). The whole diff was read (17 files, +875 / −81), not only the fixes for pass 3.
- Reviewer: fresh instance, first look at this work; passes 1 to 3 read first. No source, style, test or content file was edited. Probes ran from the reviewer's scratchpad (`repairr4/`) against a copy of this branch's production build served under `/business-toolkit/` (Python static server, port 5710), in Playwright's Chromium (`chromium-headless-shell` 1243). The mutation run used a second copy (port 5711) with one change to the minified `search-boot` code (`repairr4/mkmut.py`); nothing in the worktree was changed for it.
- Checklists: `stoep-design` (rules 6, 7, 8, 9, 10, 11), `web-interface-guidelines`, `accessibility`. Nothing in the diff animates (the chevron turns at once).
- Screenshots (Chromium, Linux): `docs/reviews/main-repair-pass4/`.
- No stylelint `no-invalid-position-declaration` quirk in this worktree.

## Gate, re-run by the reviewer

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. ESLint, Prettier, Stylelint clean; `astro check` 329 files, 0 errors, 0 warnings; unit + dom 81 files, 3437 passed; content drift none; content 40 passed (`/tmp/rr4-gatefast.log`). |
| `pnpm build` | exit 0. 200 pages; `dist:audit` 26,659 URLs, no problems; `dist:budget` heaviest document page `/af/business-types/food/` 24.3 KB without and with a profile (budget 25.0 KB, "0.8 KB left"), heaviest other `/af/search/` 34.9 KB (`/tmp/rr4-build.log`). |
| Playwright chromium + mobile + nojs, port 5701 | exit 0: **1716 passed, 103 skipped, 0 failed** (21.2m) (`/tmp/rr4-e2e.log`). |
| `pnpm test:a11y`, port 5702 | exit 0: **424 passed** (7.2m), including the four 360px sources checks (`/tmp/rr4-a11y.log`). |
| `playwright test --list --project=webkit` | 574 tests in 12 files (`/tmp/rr4-webkit-list.log`). See "WebKit" below: every Chromium-only test in the diff skips there. No WebKit binary here, so the project was not run. |
| `search.spec.ts` ×10, chromium + mobile, CDP CPU throttling 6×, 4 workers, port 5703 | exit 1: **819 passed, 1 failed** (23.2m). Every test of "the search dialog while it loads" group 259 of 260 green, the new clock and trip tests 20 of 20 each; the one failure is the pre-existing "fetches the index when it opens…" (chromium, repeat 5), a 30 s timeout in `waitForLoadState('networkidle')` (`search.spec.ts:317`) before the test opens anything, the same line pass 3 saw fail once at 6× (see "Out of scope") (`/tmp/rr4-search-x10.log`). | |
| `interactive.spec.ts` ×10, chromium + mobile, CDP CPU throttling 5×, 4 workers, port 5704 | exit 0: **630 passed, 70 skipped, 0 failed** (14.0m); both ring tests 40 of 40 (`/tmp/rr4-interactive-x10.log`). |
| Mutation: the "while it loads" group against the build with `b19166e`'s `forget(); left = true;` removed (port 5711, `PW_REUSE_SERVER=1`) | **2 failed, 24 passed**: only "a script that fails after a held Enter goes to the search page once", chromium and mobile, `Expected: 1, Received: 2`. Against the unmutated build (port 5710): **26 passed** (`/tmp/rr4-mut.log`, `/tmp/rr4-unmut.log`). |

The throttled runs used two untracked copies of the specs (`tests/e2e/zz-rr4-*.spec.ts`, with only a `beforeEach` that sets CDP CPU throttling added, `repairr4/mkthrottled.py`), deleted afterwards and never committed.

## Nit

### nit 1: the label row grows with large text, the checkbox does not (pass 3, nit 1, still open)

File: `src/components/trust/SourcesForPage.astro:241-250`

Unchanged since pass 3: `block-size: var(--st-target)` on the checkbox, `min-block-size` on the label. With the root font size doubled at 320px, the Afrikaans label is 256×154px and the checkbox covers its top 256×44px (`repairr4/sources.mjs`, `zoom200`). A tap anywhere on the label still toggles it through `for`, so nothing breaks; only a screen reader's touch-exploration frame no longer surrounds the words. Fine to leave in the backlog.

### nit 2: rule 6 points at `docs/testing.md` for the live figure, which still says 24.0 KB

File: `.claude/skills/stoep-design/SKILL.md:29`, `docs/testing.md:284`

`b19166e` updated rule 6 to "24.3 KB after the WP-50 Phase 3 repairs, 0.8 KB under the limit" and says "the live figure is in `docs/testing.md`", but `docs/testing.md`'s latest entry is still `/af/business-types/food/` at 24.00 KB (WP-50a review pass 3). 24.3 + 0.8 also reads as 25.1: both are rounded from about 24.25 / 0.75 KB. Suggested: add the package's exact figure to `docs/testing.md` (as earlier entries do: "24.2x KB, printed 24.3 KB, 0.8 KB left") and let the rule say "about 24.3 KB".

### nit 3: the design system says the CDP name check runs "in both states and languages", not that WebKit skips it

File: `docs/design-system.md:1156`

True of Chromium (`chromium`, `mobile`, `nojs`). Since `b19166e` the two `doc-page.spec.ts` name tests skip in the `webkit` project with a reason, and WebKit's name is reasoned, not measured. One clause ("Chromium only; WebKit skips it") would keep the page from overstating coverage.

## The sources control, checked

`repairr4/sources.mjs` (`/tmp/rr4-sources.log`), vehicle-dealer page, EN and AF, JavaScript on and off, at 320, 360, 768 and 1280px:

| Check | Result |
| --- | --- |
| Name in Chromium's own tree (`Accessibility.getPartialAXTree`) | `checkbox "Show the other 38 sources"` / `checkbox "Wys die ander 38 bronne"`, name source `relatedElement` (the `<label for>`), `checked=false`, then `checked=true` after a tap; same name in both states; focusable, not ignored. Full tree: the phrase is one node (the checkbox) while unchecked. |
| Hit area | checkbox box equals the label row: 288×44 at 320px, 326.7×44 at 360px, EN and AF, JS on and off. A tap at the row's far end (4px from its right and bottom edges) checks it and shows all 34 entries. |
| Keyboard | from the first list's last link, Tab lands on the checkbox; Enter does nothing (right for a checkbox, and it does not submit anything); Space checks it. |
| Focus ring | 3px solid `--st-focus` on the label (`sources-360-en-focus.png`). Forced colours, light and dark: label text, chevron border and ring all in the system colour (`sources-320-forced-*.png`). |
| Layout | 3 of 34 entries visible at 320 and 360 until checked, then all 34 (`sources-320-af-closed.png`, `-open.png`); at 768 and 1280 all 34 and no control (`sources-1280-en.png`); no sideways scroll at 320 or 360. |
| Print | from 360px: all 34 entries, no control (`sources-360-en-print.png`). |
| axe at 320 and 360 | `repairr4/axe360.mjs`: WCAG 2.0–2.2 A/AA tags on the section, closed and open, light and dark, EN and AF, with and without touch: **0 violations** (`/tmp/rr4-axe360.log`). One `target-size` hit appeared in a first probe and was traced to scroll position (`repairr4/axe360s.mjs`): at 320px with the open list scrolled 300px past the control, the sticky top bar covers part of an entry's link ("partially obscured … 288px by 15.8px"). Any link scrolled under the bar gives it, the control is not involved, and the a11y spec's own runs (from the top of the page) pass. Not a finding. |
| Copy | sentence case, plain verb, one phrase in both states, number byte-identical in Afrikaans, `trust.sources.less` gone from both dictionaries, same keys. |

WebKit and Safari, reasoned (no browser here): the control depends on `<label for>` with a real text node, `:checked`, the general sibling combinator and two prefix-syntax media queries (`screen and (max-width: 767.98px)`, `print, (min-width: 768px)`), all of which every Safari the project serves supports, so the rest shows at 768px and wider and in print in WebKit (the original CI failure). `:focus-visible` (Safari 15.4+) is used for the ring as everywhere else in the system.

## The search hold, every order tried

`repairr4/race.mjs` (`/tmp/rr4-race.log`): the dialog's script (`search.<hash>.js`) held by `page.route` until released, aborted or never answered; desktop 1280×800 (opened with `/`) and Pixel 7 (tap on the header's search link); CDP CPU throttling 1× and 5×. Every case ran four times (two profiles × two rates); results were the same in all four unless noted. Times are from the Enter.

| Case | Result |
| --- | --- |
| A. Enter, release | one navigation, `/glossary/#pis` |
| B. Enter twice, release | one navigation, `/glossary/#pis` |
| C. Enter, Escape, release | 0 navigations, dialog closed |
| D. Enter, Close, release | 0 navigations, dialog closed |
| E. Enter, new text, release | 0 navigations, dialog open (the script searches the new text) |
| F. Enter, Escape, reopen, release, then a new Enter | nothing until the new Enter, then one navigation, `/glossary/#pis` |
| G. Script fails after Enter | one navigation, `/search/?q=PIS%20tax` |
| H. Script never arrives | one navigation, `/search/?q=PIS`, at 8.00–8.02 s |
| J. Fallback fired, script then arrives while the search page is held | one navigation, `/search/?q=PIS` |
| K. Script released, index held | "Loading search…", then one navigation to the result once the index arrives |
| L. No `requestSubmit` (Safari < 16), Enter, release | one navigation, `/glossary/#pis` |
| M. Closed empty, then the script fails | 0 navigations |
| Q. Enter, Escape, then the script fails | 0 navigations |
| P. Enter, Escape, reopen, script fails | one navigation, `/search/?q=PIS` (the dialog is open: intended) |
| T. Enter, text changed and changed back, release | one navigation, `/glossary/#pis` |
| AA. Enter, script fails at 5 s, search page held 4.5 s (pass 3 minor 1) | **one** request for `/search/?q=PIS`, at 5.0 s (pass 3: two) |
| AB. As AA, Escape while the search page loads | one request |
| AD. Enter on "PIS", new text "EMP201", Enter, release | one navigation, `/glossary/#emp201` (the latest Enter, for the text on screen) |
| AG. Text typed, no Enter, script fails | one navigation, `/search/?q=VAT` (pre-existing, intended) |
| N. Text typed, Close, release | 0 navigations; focus back on `<body>` (desktop, opened with `/` from no focused element) or the header's search link (phone) |
| W. Script released at 7.8 s | one navigation, the result |
| W2. Script released at 8.2 s | one navigation, `/search/?q=PIS` at 8.0 s |
| X. No `requestSubmit`, script never arrives | one navigation, `/search/?q=PIS` at 8.0 s |
| Y2. Script loaded, empty Enter | 0 navigations, dialog open |
| BF. Script fails after Enter, search page opens, Back | the document page reloads fresh (dialog closed, field empty); opening search again with the script still failing goes straight to `/search/` (the failure path, pre-existing and intended) |

No lost, duplicated, stale or unexpected navigation in any of the 100 runs. The no-JS path is unchanged: the form is a GET to `/search/`, and `nojs.spec.ts` passes.

Read from the code and consistent with the runs: `forget()` clears both the text and the timer and is called on every new held Enter, on `close` (Escape, Close, the Android back gesture through the close watcher), on the replay and now in the failure handler; `left` is set on both ways out (the timer and the failure handler), so neither fires after the other. The replay compares the text at the Enter with the text now, as `search-ui.ts`'s `enterCurrent()` does. Safari before 16: `search-boot.ts` dispatches a cancelable `submit` (L), `search-ui.ts` and `search.ts` fall back to `form.submit()` after the same empty-query check their handlers make; before 15.4 there is no `<dialog>`, `showModal()` throws in the click handler before `preventDefault()`, and the header link goes to `/search/`.

## Tests

- Nothing loosened, no retries, `test.slow` or `waitForTimeout` added by the diff. The CDP name tests (`doc-page.spec.ts:276`) now `test.skip(browserName !== 'chromium', …)` at the top of the body, with the reason; the helper is `chromiumAxName`, so it no longer shadows the fixture, and its comment says what a caller must do. `nojs.spec.ts`'s two CDP tests run only in the `nojs` project (Desktop Chrome).
- `page.clock` is used correctly in all five clock tests: installed before `goto`, the page loads with time flowing, `pauseAt` then stops it, and only `runFor` moves it, so nothing waits 8 real seconds.
- The new trip-counting test (`search.spec.ts:603`) is meaningful: it counts `navigate` events for `/search/` and cancels each, so the page that holds the Enter stays and its timer can still fire. Against a build with the fix removed it fails `Expected: 1, Received: 2` on chromium and mobile; against this build it passes (mutation row above). It skips, with a reason, where there is no Navigation API, after feature detection rather than by browser name, so it runs in any WebKit that has the API (Safari 26.2 shipped it) and cannot throw where it is missing. The same guard (`counted`) keeps "a dialog closed before its script fails to load" strict where the API exists and falls back to the request log elsewhere.
- The ring tests record `transitionrun` from before the action (both of them now), and the reduced-motion half waits for the new percentage and two frames, then requires no ring transition at all.

## WebKit

`--list --project=webkit` lists both CDP name tests (`doc-page.spec.ts:276`, EN and AF); both skip at the top of the body in WebKit before any CDP call (`browserName` is `webkit` there), so they cannot throw. Every other test the diff adds or changes uses only cross-engine APIs: `holdRequests`/`routeSameOrigin`, `page.clock`, `customElements.get`, a submit counter, `getByRole('checkbox')`, label clicks, `emulateMedia({ media: 'print' })`, `transitionrun` (Safari 13.1+), and the feature-detected Navigation API. The console allowance for the aborted dialog script is the same regex as the pre-existing "the dialog's script fails" test, which passes in CI's WebKit. CI's own WebKit job on this commit is the measured answer; the reviewer did not run it.

## JavaScript budget

Heaviest document page 24.3 KB of 25 KB (`dist:budget`: 0.8 KB left as printed). `b19166e` adds two statements to `search-boot.ts`, inside the rounding. The sources control costs no script. Justified: it fixes keys lost on exactly the slow phones the site is for.

## Out of scope, noticed

- `await page.waitForLoadState('networkidle')` (`search.spec.ts:317`, `interactive.spec.ts:941`), unchanged by this diff, is the only load-sensitive wait left in the two specs: it timed out once in 820 runs here at 6× (pass 3: once in 40 each at 6×). Waiting for the state the test needs (the element defined, the ring drawn) would remove it. Pass 3 suggested a backlog line; still worth one.
- Pre-existing tests that read `layout-shift` entries run in the `webkit` project without a skip: `first-screen.spec.ts:100` ("is closed at 1280px too, and nothing moves"), `templates.spec.ts:596` ("shows no tabs while the module is held …") and four in `wizard.spec.ts` (`:264`, `:488`, `:527`, `:647`, plus the observer at `:474`). WebKit has no `layout-shift` entries; `observe()` with an unsupported type only warns, so they do not throw, but their "nothing moves" assertions pass vacuously there instead of skipping, as `interactive.spec.ts:636` and `:710` do. Not in this diff; worth a backlog line.
- At 320px with the root font size doubled, a few callouts' labels and bodies overflow (`scrollWidth` 518px in Afrikaans, 335px in English; `repairr4/zoom.mjs`, `/tmp/rr4-zoom.log`); nothing in the sources section does. Beyond what WCAG asks (1.4.10 is 400% zoom of a 1280px page, at normal text size), and not in this diff.
