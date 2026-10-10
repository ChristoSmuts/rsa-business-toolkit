# WP-50a review, pass 3

Tree: `6b9600f`. That is the WP-50a package on `204a2a2`, with the pass 1 and pass 2 reviews and their fixes. The pass 2 fixes are `979ef01..6b9600f`. Reviewer: fresh, independent. No code was changed for this review.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 1 |
| Minor | 6 |

- **M1:** a reader at question 2 when the wizard's script arrives sees a layout shift of 0.47 to 0.51 on a phone. Item 2 ("no dead controls, no shift") still fails its own 0.1 limit at 320 and 360px. The e2e test runs only at 1280×720 and 412×839, where the shift is 0.009 and 0.031.

All five pass 2 findings (M1, M2, M3, m1 to m5) are fixed. The rest of the package holds.

## Checks run

All logs are in the session scratchpad as `wp50a-review3-*.log`. The probe scripts are in `r3/`. The probes ran against the built `dist/`, served by `tests/e2e/helpers/web-server.ts` on port 4943 under `/business-toolkit/`, in Playwright Chromium. They ran only after e2e and a11y had finished.

`pnpm gate:fast` (`wp50a-review3-gatefast.log`):

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  77 passed (77)
      Tests  3250 passed (3250)
Content drift: none.
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

`pnpm build` (`wp50a-review3-build.log`):

```
[build] 198 page(s) built in 4.34s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.7 KB without a profile, 24.7 KB with one (budget 25.0 KB, 0.3 KB left).
dist:budget: heaviest other page /af/search/: 34.7 KB without a profile, 34.7 KB with one (budget 45.0 KB, 10.3 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

After the build, `git status` was clean.

`pnpm content:fidelity --lang af` (`wp50a-review3-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e, chromium + mobile + nojs, `PW_PORT=4941`, with the exact command from the brief (`wp50a-review3-e2e.log`):

```
Running 1836 tests using 2 workers
  291 skipped
  1545 passed (15.5m)
EXIT 0
```

The log has no `✘` lines and no flaky or retried tests. The first run of this suite (`wp50a-review3-e2e-listreporter.log`) added `--reporter=list`, which drops the guard reporter. It passed the same 1545 tests, but `guard-teardown` failed the run, as it is meant to. The run quoted above is the one without that flag.

`pnpm test:a11y`, `PW_PORT=4942` (`wp50a-review3-a11y.log`):

```
  416 passed (4.7m)
EXIT 0
```

The log has no `✘` lines.

Commit messages: `pnpm exec commitlint --from 979ef01 --to 6b9600f` gives `found 0 problems, 0 warnings`.

### Why 291 tests are skipped, not 93

Every one of the 291 skipped tests is in the `mobile` project:

- 93 skips were already there before this pass;
- 198 are `reflow.spec.ts:20`, one per route, skipped by `test.skip(project !== 'chromium')`.

That gives 93 + 198 = 291. The sweep itself runs in full:

- `[chromium] › reflow.spec.ts` passed 198 times;
- `[nojs] › nojs.spec.ts › no sideways scrolling at 320px without JavaScript` passed 198 times.

The 198 routes are every built page (`pageRoutes()`: the sitemap plus the `noindex` pages), in both languages. Nothing real was skipped by accident. How the skip is written is m5.

## Major

### M1. A reader at question 2 when the wizard's script arrives sees a layout shift of 0.47 to 0.51 at 320 and 360px

Where:

- `src/components/wizard/Wizard.astro:176-184`: the `js-only` line `#wz-help-type` and the `no-js-only` note `#wz-nojs-type` swap places;
- `src/scripts/wizard.ts:114-125`;
- the test, `tests/e2e/wizard.spec.ts:918`.

**How I reproduced it** (`r3/q2.mjs`, `wp50a-review3-probe-wizard-q2.log`):

1. Hold the `/_astro/*.js` modules, the same way as `holdModules`.
2. Answer question 1.
3. Scroll so that "Question 2 of 3" is at 80px.
4. Wait 0.8 s or 3 s, then release the modules.
5. Sum the layout-shift entries with the same `PerformanceObserver` the wizard spec uses.

The question's heading stays at 80px, as intended. The content under it moves, though, because the help lines swap:

- "Choose all that fit" (`js-only`) appears;
- the 67px "without JavaScript you can choose one" note goes;
- so "If none fit…" moves 57px down, and the choices move 22px up.

```
en 320x568   CLS 0.466  [{"v":0.466,"src":["P.st-hint 0->262 h0->45","DIV.st-wizard__choices 0->319 h0->249"]}]
en 360x740   CLS 0.510
af 320x568   CLS 0.466
af 360x740   CLS 0.047
en 412x839   CLS 0.031   (the mobile project's viewport)
en 1280x720  CLS 0.009   (the chromium project's viewport)
```

Wait times of 0.8 s and 3 s give the same figures. With the two swapped lines hidden by an injected style, the shift is 0, and the heading and the choices keep their place (`r3/q2b.mjs ... nohints`). A trace of every frame shows one frame of the change and nothing in between:

```
1230:80:341 1230:80:341 512:80:319R SHIFT 0.466 512:80:319R ...
```

The wider matrix (`r3/wizard.mjs`, `wp50a-review3-probe-wizard.log`, 360×740) has 8 answer combinations × 3 reader positions. For a reader at question 2 the shift is 0.47 to 0.53 in all 8. At question 1 the worst is 0.014, and at question 3 it is 0.038.

**Why it is major.** The brief for this pass asks for CLS ≤ 0.1. `docs/design-system.md` § enhancement says the switch "costs no layout shift where the reader is looking". `docs/testing.md` item 2 says "a reader already at question 2 stays on it … layout shift ≤ 0.1". On the phones the site is built for, the answers move under the reader's thumb.

**Fix:**

- Give the two help lines one slot that keeps its height. For example, put both in one grid cell (`grid-area: 1 / 1`) and swap them with `visibility`, not `display`. Or write one line whose text the element replaces on connect, and give it a `min-block-size` that fits the longer of the two.
- Run the question 2 test (`wizard.spec.ts:918`) at 320×568 and 360×740 as well, in both languages.

## Minor

### m1. Afrikaans "Find my path" at 320px scrolls itself 22px down when it opens

Where:

- `src/scripts/wizard.ts:125`: `if (after !== before) view?.scrollBy(…)` lost pass 1's `inView > 0` guard;
- `src/components/wizard/Wizard.astro:385-389`: the current step's label is `semibold`.

**How I reproduced it** (`r3/top.mjs`, `wp50a-review3-probe-wizard-top.log`). Open `/af/find-my-path/` at 320px at the top of the page, then release the modules:

```
af/ 320 before {"y":0,"stepper":138,"q1":592,"h1":265} after {"y":22,"stepper":160,"q1":592,"h1":243}
en 320, en/af 360 and 412: y stays 0
```

`aria-current="step"` sets the current step in `semibold`. The 22px growth is the stepper's alone: the stepper is 138px tall before and 160px after, and question 1 stays at 592px. That fits one stepper row ("Hoe jy handel dryf" or its neighbours) gaining a line. I did not isolate which label wraps. Before pass 2's fix, question 1 moved down 22px. Now the page scrolls by 22px instead, on load, with nobody touching it. The page title and the top of the stepper move up, and the reader opens a page that is already scrolled.

**Fix:**

- Put back `start > 0 &&` on the `scrollBy`, so that a reader at the top is never scrolled.
- Stop the current step from changing the stepper's height. For example, reserve the semibold width (a hidden semibold copy of the label in the same grid cell), or mark the current step with its stripe and colour only. The stepper is meant to be "shown from the first paint, so it does not push the form down".

### m2. The "earlier question" line is not tied to the button, and the button's description says the opposite

Where: `src/components/wizard/Wizard.astro:219`, `:225`, `:276`, `:282`.

**How I reproduced it** (`r3/misc.mjs`, `r3/desc.mjs`, `wp50a-review3-probe-misc.log`, CDP accessibility tree). Take a reader at question 3 with question 1 unanswered, after the script has run.

On screen they see "A question before this one has no answer yet. This button takes you to it." The accessible description of "See my path" is still `"Choose an answer first."`, because:

- `aria-describedby` points at the hidden `#wz-next-hint-stage`, and Chromium uses hidden text that is referenced directly;
- the new `[data-earlier-hint]` has no `id` and is not referenced at all.

The same hidden-reference problem gives every Next button the description "Choose an answer first." even after the question is answered. That part is older than WP-50a:

```
Q1 answered (hint hidden): [["Next","Choose an answer first."]]
```

A screen-reader user still recovers, because focus moves to the missing question's heading.

**Fix:**

- Give each `[data-earlier-hint]` an id.
- In `#update()`, set the button's `aria-describedby` to the hint that is showing, or to none.

### m3. Two documents give out-of-date figures

- `.claude/skills/stoep-design/SKILL.md:29` says the heaviest document page "is at 24.6 KB after WP-50a, 0.4 KB under the limit". The build now prints 24.7 KB with 0.3 KB left, and `docs/testing.md` says 24.68 KB.
- `docs/design-system.md:240` (`TableScroll`) still lists "the branding-prompts table in both languages" among the tables that scroll at 320px. Since `st-url`, the English one fits: `wp50a-review3-probe-tables.log` shows only `af/branding/branding-prompts/` (103px), with the English table not listed.

**Fix:** update both to the measured figures.

### m4. The new check in `templates.spec.ts` captured the old `else`

Where: `tests/e2e/templates.spec.ts:575-579`.

The pass 2 lines were inserted between `if (line) await expect(…visible)` and its `else`. That `else` (`.st-note-line` count 0) now belongs to `if (line && first)`. Today it behaves the same, because every template has a lead. But a template with a form line and an empty lead would now fail on "no note line" instead of on the real cause, and the code no longer says what it means.

**Fix:** use braces. Make `if (line) { visible; repeat check } else { count 0 }`.

### m5. The reflow sweep adds 198 skipped tests to every mobile run

Where: `tests/e2e/reflow.spec.ts:20-21`.

`test.skip(testInfo.project.name !== 'chromium', …)` creates the test in the `mobile` project and then skips it, so the skip count went from 93 to 291. A real accidental skip is now much harder to spot in that number.

**Fix:** keep the file out of the `mobile` project with `testIgnore` in `playwright.config.ts`, the way `special` already does. Or use `test.describe.configure` and a project check at describe level, so that no test is generated there.

### m6. The budget has an easy 0.68 KB in `theme-init.js`, which ships unminified

Where: `src/scripts/theme-init.js`, which is copied verbatim via `?url` and loaded on every page.

```
gzip -9 src/scripts/theme-init.js                      1698 bytes
esbuild --minify --target=es2019 | gzip -9             1017 bytes
```

This package added 0.20 KB to that file (the word-list `MutationObserver`). Minifying the file at build time saves about 0.68 KB on every page. That would take the heaviest document page from 24.68 KB to about 24.0 KB, about 1.0 KB under the limit, before the revamp starts.

The rest of what the package added is already minified by Vite and small:

- the contents script, 0.17 + 0.05 KB;
- `search-boot`, 0.10 KB;
- the ring guards, 2 × 0.05 KB.

None of it is dead code.

**Fix:** have the build minify `theme-init.js` (esbuild or Vite `transform`) and keep the readable source. The test that the script is ES2019 with no imports still applies.

## What I verified and found holding

### Wizard (pass 2 M1)

From `wp50a-review3-probe-wizard.log`, 32 runs: 8 answer combinations × reader at questions 1, 2 and 3 with the modules held, plus 8 with the modules not held.

- The wizard always starts on the question in view. It shows `wizard.earlierMissing` exactly when an earlier question is unanswered, and then hides "Choose an answer first.".
- Next and "See my path" go to the first unanswered question and focus its heading (`focus=wz-h-entity`, `wz-h-type`).
- In all 32 runs the reader reached `my-path/`.
- Layout shift at questions 1 and 3 is at most 0.038. Question 2 is M1.

### Reflow (pass 2 M2)

- `reflow.spec.ts` and the `nojs.spec.ts` sweep pass on all 198 routes, in chromium and in nojs.
- "Omgewingsgesondheidsafdeling" now wraps inside its label on `/af/business-types/food/`.

### The "Now reading" pill (pass 2 M3, m1, m2)

The probe is `r3/pill.mjs`. It covers all 31 documents with a pill in each language and scrolls the whole page. On every step it checks the pill against each contents heading's text range, and it compares the pill's title with the lowest open heading past the line, in document order. Then it jumps to every contents link.

| Viewport, step | Toggles en / af | Shows under 120px | Wrong section named | Jumps covering their heading |
| --- | --- | --- | --- | --- |
| 320×568, 4px | 93 / 123 | 0 / 1 | 0 / 0 | 0 of 423 / 0 of 423 |
| 320×568, 16px | 65 / 83 | 0 / 0 | 0 / 0 | 0 of 423 / 0 of 423 |
| 1100×800, 8px | 31 / 31 | 0 / 0 | 0 / 0 | 0 of 423 / 0 of 423 |

- The 93 and 123 toggles match the author's figures exactly; pass 2 counted about 820.
- The single short show is 84px on `af/business-types/vehicle-dealer/`, near the end of the page.
- The pill overlaps a heading's line box only by 1 to 5px as the heading slides under it, which is inside the line box's half-leading and the 4px `INK` allowance. It never reaches the letters of a heading a link has just reached.
- A closed word list never names the section.
- "Free tools" names "Which office software to use" correctly.

### URLs in table cells (pass 2 m3)

From `wp50a-review3-probe-tables.log`:

- `st-url` is on the two `webaim.org/resources/contrastchecker` links in tables, and on bare addresses elsewhere, where it has no effect outside a cell.
- At 320px, 5 of 16 two-column tables scroll: the Afrikaans branding prompts (103px), the business-types hub (77px), the checklist calendar (97px), sources (138px) and how-to-use (77px). The English branding-prompts table fits.

### Form how-to lines (pass 2 m4)

The receipt and privacy-notice lines no longer repeat their summary, in either language (`wp50a-review3-probe-misc.log`).

### Things accepted in passes 1 and 2

None of these has regressed:

- **AI notice:** on the first screen at 320×568 for all 72 documents. The worst case is `af/business-types/beauty/`, with its top at 453px.
- **Reading order, `data-enhance`, search loading, the banner, motion, prompt naming, template leads and summaries:** their WP-50a e2e and unit tests all pass (`docs/testing.md` items 1 to 10).
- **Venda docs:** unchanged since pass 2.
