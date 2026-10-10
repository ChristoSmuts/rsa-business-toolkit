# WP-50a review, pass 4

Tree: `4c5be79`. That is the WP-50a package on `204a2a2`, with the reviews from passes 1 to 3 and their fixes. The pass 3 fixes are `34ce8c7..4c5be79`. The reviewer is fresh and independent, and changed no code for this review.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 1 |
| Minor | 3 |

- **M1:** a reader near the end of a question when the wizard's script arrives sees a layout shift of 0.11 to 0.26. The questions below fold away, the footer jumps up into view, and at question 1 the page also scrolls 9 to 12px by itself. At question 1 this is a regression against `204a2a2`, which measures 0.000 in the same places. The pass 3 tests and probes only put the question's heading at 80px, so they never saw it.

The pass 3 fixes all do what they say:

- Question 2's two help lines no longer swap places (M1).
- The page no longer scrolls on open at 320px in Afrikaans (m1).
- The buttons are described by the line that shows (m2).
- The figures are right (m3).
- The template check has its braces (m4).
- The skip count is 93 again (m5).
- `theme-init.js` is minified, and the change is safe (m6).

Nothing accepted in passes 1 to 3 has regressed.

## Checks run

All logs are in the session scratchpad as `wp50a-review4-*.log`, and the probe scripts are in `r4/`. The probes ran against the built `dist/`, served by `tests/e2e/helpers/web-server.ts` on port 4953 under `/business-toolkit/`, in Playwright Chromium. They ran only after e2e and a11y had finished. For the comparison with the base, a copy of `204a2a2` (`git archive`) was built in the scratchpad and served on port 4954.

`pnpm gate:fast` (`wp50a-review4-gatefast.log`):

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  78 passed (78)
      Tests  3254 passed (3254)
Content drift: none.
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

`pnpm build` (`wp50a-review4-build.log`):

```
[build] 198 page(s) built in 5.47s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: heaviest other page /af/search/: 34.1 KB without a profile, 34.1 KB with one (budget 45.0 KB, 10.9 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

After the build, `git status` was clean.

`pnpm content:fidelity --lang af` (`wp50a-review4-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

The e2e run (`wp50a-review4-e2e.log`) used the exact command from the brief: chromium, mobile and nojs, `PW_PORT=4951`, with the default reporters:

```
Running 1678 tests using 2 workers
  93 skipped
  1585 passed (14.1m)
EXIT 0
```

The log has no `✘` lines and no flaky or retried tests.

`pnpm test:a11y`, `PW_PORT=4952` (`wp50a-review4-a11y.log`):

```
  416 passed (7.3m)
EXIT 0
```

The log has no `✘` lines.

`pnpm exec commitlint --from 34ce8c7 --to 4c5be79` gives `found 0 problems, 1 warnings`. The warning is `footer-leading-blank` on `4c5be79`, whose body has a blank line inside a sentence ("gives the current / / figure: 24.0 KB"). That body also says that "only the Afrikaans branding-prompts table still scrolls at 320px". Five tables still scroll. The design-system text it describes is correct. History is not rewritten for this, so it is not a finding.

## Major

### M1. A reader near the end of a question when the script arrives sees the footer jump into view (0.11 to 0.26), and at question 1 the page scrolls by itself

Where:

- `src/scripts/wizard.ts:115-129`: the step in view keeps its place, but nothing below it does;
- `src/styles/utilities.css:24` and `:33`, with `wizardNoJsCss()` (`src/lib/path-pages.ts:133`): before `data-ready`, all three questions show and the step navigation is hidden;
- the test, `tests/e2e/wizard.spec.ts:942-997`: it only puts the heading at 80px.

**How I reproduced it.** I used `r4/wiz.mjs ... sweep` (log `wp50a-review4-probe-wizard-sweep.log`) and `r4/footer.mjs` (log `wp50a-review4-probe-wizard-footer.log`):

1. Hold the `/_astro/*.js` modules, as `holdModules` does.
2. Answer the questions before the reader's with a click.
3. Scroll so that the reader's question heading is at -300, -150, 20, 150, 250 or 400px.
4. Wait for `document.fonts.ready` and 800 ms.
5. Release the modules.
6. Sum the layout-shift entries recorded after the release.

The question's heading and choices stay where they were in every run. Below them, though:

- the steps after the reader's question fold away;
- at question 3, the step's nav appears ("Back", "See my path", the hint and the storage line);
- so the footer moves into the space where the next question or the nav used to be.

| Reader | Viewport | Layout shift | Source |
| --- | --- | --- | --- |
| en, question 1, heading at -150 | 412×839 (the mobile project) | **0.260** | `FOOTER.st-footer 0->621 h0->218` |
| af, question 1, heading at -150 | 412×839 | **0.182** | footer |
| en, question 1, heading at -150 | 1280×720 (the chromium project) | **0.226** | footer |
| af, question 1, heading at -150 | 1280×720 | **0.234** | footer |
| en / af, question 1, heading at -300 | 360×740 | 0.151 / 0.173 | footer |
| en / af, question 2 heading at 400px (reader still on question 1) | 360×740 | 0.209 / 0.211 | footer |
| en / af, question 3, heading at -300 | 360×740 | 0.146 / 0.145 | footer |
| en / af, question 3, heading at -300 or -150 | 412×839 | 0.128 / 0.129 | footer |
| af, question 3, heading at 20 | 412×839 | 0.111 | footer |
| en / af, question 3, heading at -300 | 1280×720 | 0.129 / 0.129 | footer |

A keyboard reader who ticks the last kind of business ("General") and stays on it gets the same: 0.166 (en) and 0.108 (af) at 412×839 (`r4/kbd4.mjs`, `wp50a-review4-probe-wizard-keyboard.log`).

Here is what is on screen at 412×839, in English, at question 1, before and after the release (`elementFromPoint` down the middle):

```
 420: FORM  "Question 1 of 3: How y…"   | 420: P "What is the difference"
 525: SECTION "Question 2 of 3: Kind…"  | 525: FORM
 630: P.st-hint "Not sure, or you do…"  | 630: DIV.st-container "Written by AI, and che…"   (footer)
 735: LABEL "Vehicle dealer You buy…"   | 735: UL.st-footer__links
```

At question 1 the page also moves. The document gets shorter than `scrollY` plus the viewport, so the browser clamps the scroll. `scrollY` goes from 664 to 652 at 412×839 and from 542 to 533 at 1280×720, and the question's heading moves down by as much. `start > 0` rightly stops the wizard's own `scrollBy` here, but nothing stops this clamp.

**It is a regression against `204a2a2` at question 1.** At `204a2a2`, `html.js st-wizard:not([data-ready]) .st-wizard__step:not([data-step='entity'])` hid questions 2 and 3 before the script ran, so the page under question 1 already had its final shape. The same probe against a build of `204a2a2` gives (`wp50a-review4-probe-wizard-q1-vs-204a2a2.log`):

```
204a2a2  en 412x839 entity heading@-150 CLS 0.000
204a2a2  af 412x839 entity heading@-150 CLS 0.000
204a2a2  en 1280x720 entity heading@-150 CLS 0.000
4c5be79  en 412x839 entity heading@-150 CLS 0.260
4c5be79  af 412x839 entity heading@-150 CLS 0.182
4c5be79  en 1280x720 entity heading@-150 CLS 0.226
```

At questions 2 and 3 there is no base to compare with, because those questions did not show before the script at `204a2a2`. The brief's limit still applies there: a layout shift of at most 0.1.

**Why it is major.**

- It breaks item 2's own limit: `docs/testing.md` item 2 says "layout shift ≤ 0.1", and the brief says "Layout shift must be ≤ 0.1, and the page must not move by itself".
- It happens in the project's own viewports (412×839 and 1280×720).
- At question 1 it is a regression against `204a2a2`.
- It hits a common position. On a phone, question 1's last choice ("I have not decided") is near the bottom of the question, so a reader who scrolls to it is where these shifts are. Pass 3 measured question 1 only with its heading at 80px.

`docs/design-system.md` § "Controls that need a script" says "only what is below it changes". That is true. But on a phone, what is below is on screen, and the footer jumping 200px into the space where question 2 was is a shift the reader sees.

**Fix:**

- Keep the wizard's height until the reader acts. In `connectedCallback`, measure from the top of the start step to the end of `<st-wizard>` before anything changes. Set that as `min-block-size` on the form, or on a spacer after the shown step, and clear it on the first `go()`, `#advance()`, change, or `resize`. Then the footer stays where it was. The document cannot get shorter, so the scroll is not clamped.
- Keep the room of each step's `.js-only` nav before ready, so it does not push the footer down at question 3. Use `visibility: hidden` under `[data-enhance]:not([data-ready])`, the way the template tabs keep their room.
- Extend the test at `wizard.spec.ts:942`: add positions where the heading is above the viewport (-150px) and where the next question's heading is just below the middle, at 412×839, 360×740 and 1280×720, in both languages. Assert that layout shift is ≤ 0.1 and that `scrollY` changes only by the wizard's own `scrollBy`.

## Minor

### m1. Question 2 keeps an empty line under "Choose all that fit" on phones

Where: `src/components/wizard/Wizard.astro:185-192` and `:431-442`.

**How I reproduced it** (`r4/gap.mjs`, `wp50a-review4-probe-wizard-slot.log`). I measured the text of each help line with a `Range` after the script had run, on question 2.

The shared slot keeps the height of the no-JavaScript line, which is longer. So a reader with JavaScript, which is nearly every reader, gets this gap below the line they see:

| | Slot | "Choose all that fit" | No-JS line | Empty under the shown line |
| --- | --- | --- | --- | --- |
| en 320 and 360 | 67px | 40px (2 lines) | 63px (3 lines) | 27px |
| af 320 | 67px | 40px | 63px | 27px |
| af 360, 412 and 1280; en 412 and 1280 | equal | equal | equal | 4 to 5px (the normal leading) |

The gap is about one blank line between "Choose all that fit" and "Not sure, or you do many…" on the phones the site is built for. It is a fair price for M1 of pass 3, and it does not hurt reading. But it is a gap the design did not choose.

**Fix:** make the two lines wrap to the same number of lines at 320px in both languages. For example, shorten `wizard.noJsOneType` so it is no longer than `wizard.types.help`, then check the slot at 320 and 360px in a unit or e2e test. Another way: let the script, once the reader first changes something on question 2, drop the hidden line with `display: none`. The step is already on screen then, and the reader caused the change, so it does not count as a shift.

### m2. The settle rule is right for the wizard, but the reason it gives is incomplete: late web fonts move the whole question, not just the top bar

Where: `tests/e2e/wizard.spec.ts:943-948`. The comment says "Only the shifts after the page and its fonts have settled count: the top bar's own change of rows when the web font arrives is item 6's".

**How I reproduced it** (`r4/fonts.mjs`, `wp50a-review4-probe-wizard-fonts.log`). I held the modules and the `.woff2` files, scrolled the reader's question heading to 80px, then released them in either order.

- The script's own shift was 0.000 in every case where the fonts came after the modules. So the rule does not hide a shift the wizard causes.
- What the rule hides is the font swap itself, which moves the reader's question:

```
en 320x568 q2 modules-then-fonts: js=0.000 font=0.283 head 80->6
en 320x568 q3 fonts-then-modules: font=0.375 js=0.000 head 80->-109
en 360x740 q3 fonts-then-modules: font=0.404 js=0.139 head 80->-215
af 320x568 q2 modules-then-fonts: js=0.000 font=0.319 head 80->28
```

The same happens on document pages. With a reader scrolled 1500px when the fonts land, `business-types/food/` shifts 0.401 at 320×568 and `af/business-types/food/` shifts 0.286 (`r4/fontdoc.mjs`, `wp50a-review4-probe-fonts-docs.log`).

This is the fallback metrics site-wide. It is not WP-50a's doing, and it does not count against this package. The fonts are preloaded, so few readers will have scrolled to question 2 before they arrive. But the comment, and item 6 in `docs/testing.md`, say that only the top bar moves, and that is not what happens.

**Fix:**

- Reword the comment to say what is excluded: the font swap, which moves wrapped text everywhere on the page.
- Add the late-font reflow at 320px to the WP-50 revamp's font work, next to the audit's preload item: closer `size-adjust` and `ascent-override` on the fallbacks, or `font-display: optional` for body text.

### m3. No test runs theme-init's behaviour against the copy the pages load

Where: `tests/unit/minify-theme-init.test.ts`. It checks that the copy compiles as a classic script, that it has no `import` or `export`, that it is smaller, and that five strings survive. It does not check what the script does. `tests/dom/theme-init.test.ts` runs only the readable source.

**How I reproduced it** (`wp50a-review4-themeinit-minified.log`). I made a temporary copy of `tests/dom/theme-init.test.ts`, read `dist/_astro/theme-init.goNHpT6q.js` instead of the source, ran it, and then deleted it.

- All 19 behaviour tests pass: theme, `js` class, `meta theme-color`, the word list from 1024px only, the script-failed names, the profile rules and disabled buttons.
- The 2 failures are source-text checks that look for `'...'` quotes, and the minifier writes backticks. They are expected.

The minified script behaves exactly like the source today. Nothing would catch a minifier upgrade that changed that.

**Fix:** in `tests/dom/theme-init.test.ts`, run the behaviour `describe` blocks twice: once with `SOURCE` and once with `await minifyScript(SOURCE)`. Keep the source-text checks on the source only.

## What I verified and found holding

### The wizard on phones (pass 3 M1 and m1)

`r4/wiz.mjs head80` covers every question, at 320×568, 360×740, 412×839 and 1280×720, in both languages, with the modules held and then released. The earlier questions were answered with a click, and the reader's question heading was at 80px. The log is `wp50a-review4-probe-wizard-head80.log`.

- The layout shift is at most 0.039 (af 412×839, question 3). At question 2 it is 0.000 at every size.
- The heading and the choices stay within 1px.
- The page never moves by itself here: `scrollY` changes only by the wizard's `scrollBy`.
- In all 24 runs, the reader reached `my-path/`.

The `early` mode releases the modules without waiting for the fonts (`wp50a-review4-probe-wizard-early.log`). It gives the same figures.

Pass 3 asked for these fixes. Here is how each one holds up:

- **Question 2's help lines.** They share one grid cell and swap by `visibility`. With the script the slot shows "Choose all that fit", and without it the no-JavaScript line. The group's `aria-describedby` follows: `wz-help-type wz-general-type` with the script, `wz-general-type wz-nojs-type` without it (`wp50a-review4-probe-wizard-slot.log`). m1 is the remaining gap.
- **"Blurred before conversion".** The brief describes this, but the code does not blur. It measures the step in view before the inputs change type (`wizard.ts:115`), and the `scrollBy` puts the step back. The result is what was wanted. With the keyboard, focus is left on a kind of business, or on a stage, at the reader's question. When the script arrives, focus stays on that same input, now a checkbox, at the same height within 1px, and the next Tab goes to the next choice or to "Back" (`wp50a-review4-probe-wizard-keyboard.log`, 40 runs). When a pointer reader's focus was on a choice in a question that now folds away, focus falls to `<body>`. That reader is not using focus, so it does no harm.
- **The `start > 0` guard on `scrollBy`.** It holds. Opening at the top gives `scrollY` 0 at 320, 360 and 412px in both languages, and the stepper keeps its height: 138px, or 160px for af 320 (`wp50a-review4-probe-wizard-top.log`). The clamp in M1 is a different mechanism.
- **Stepper titles.** They reserve their semibold width with a `::after` copy, `content: attr(data-text) / ''`, `visibility: hidden`. That copy is not in the accessibility tree.
- **`aria-describedby` on Next and "See my path".** It follows the visible line: `wz-next-hint-*` while the step has no answer, `wz-earlier-hint-*` while an earlier question has none, and nothing on an answered step (the drive trails in the head80 log). The accessible description of "See my path" is now "A question before this one has no answer yet. This button takes you to it." (`wp50a-review4-probe-misc.log`).

### `theme-init.js` minified (pass 3 m6)

- **A valid classic script that behaves like the source.** It is one IIFE with no `import` or `export`. The minified copy passes the 19 behaviour tests (m3). It uses template literals and `catch {}`, both within ES2019.
- **Still a blocking external script under the CSP.** Every page has `<script src="/business-toolkit/_astro/theme-init.goNHpT6q.js">` with no `async`, `defer` or `type`, after the CSP meta `script-src 'self'`. dist:audit and the a11y and e2e suites pass.
- **Nothing else in the bundle is touched.** I built once with `minifyThemeInit()` taken out of `astro.config.ts` and once as committed, then compared the SHA-256 of every file in `dist/`. Only `_astro/theme-init.goNHpT6q.js` differs.
- **A syntax error fails the build.** I appended `(function () {` to `src/scripts/theme-init.js` and ran `astro build` (log `wp50a-review4-syntaxerror-build.log`). The result was `EXIT 1` with `theme-init.js: Expected '}' but found 'EOF' at minifyScript (scripts/minify-theme-init.ts:47:9)`. I then restored the file.
- **No new dependency, and it runs on the allowed Node versions.** `package.json` and the lockfile are unchanged in `34ce8c7..4c5be79`. `minify` is a public export of Vite 8.3.0 (`dist/node/index.d.ts`, re-exported from `rolldown/utils`), and Vite comes through Astro (`"vite": "^8.0.13"`). Vite is ESM-only, so `require` needs `require(esm)`, which is on by default from Node 22.12. `engines` is `>=22.12 <25`, and CI uses `.nvmrc`. The build ran on Node 22.22.0.
- **Observations, not findings.** The copy keeps the hash of the source, so a Vite upgrade that changed the minified bytes would ship them under the same URL. GitHub Pages caches for 10 minutes, and the behaviour is the same, so the risk is small. `loadMinifier` resolves Astro from `process.cwd()`, which is the project root under `pnpm`.
- **Budget.** `/af/business-types/food/` is 24.0 KB with 1.0 KB left, matching `docs/testing.md` and `stoep-design` rule 6.

### The other pass 3 fixes

- **Reflow (m5).** `reflow.spec.ts` is in `testIgnore` for webkit and mobile. All 93 skips in the e2e log are in the `mobile` project: 72 in `pages.spec.ts:53`, 5 in `pages.spec.ts:226`, and 16 single ones elsewhere. There are none in `reflow.spec.ts`. `[chromium] › reflow.spec.ts` passed 198 times, and `[nojs] › nojs.spec.ts:461` (no sideways scrolling at 320px) passed 198 times. That is every route in both languages.
- **The template check (m4).** `templates.spec.ts:576-583` now reads `if (line) { visible; repeat check } else { count 0 }`.
- **Docs (m3).** The `TableScroll` row and `stoep-design` show the measured figures. The tables probe (`wp50a-review4-probe-tables.log`) matches pass 3 exactly: 5 of 16 two-column tables scroll at 320px, and all of them are Afrikaans.

### Things accepted in passes 1 to 3

None of these has regressed:

- **AI notice:** on the first screen at 320×568 for all 72 documents, with no failures. The worst case is `af/business-types/beauty/`, with its top at 453px (`wp50a-review4-probe-misc.log`).
- **The "Now reading" pill** (`r4/pill.mjs`, 31 documents per language), the same as pass 3:

| Viewport, step | Toggles en / af | Shows under 120px | Wrong section named | Jumps covering their heading |
| --- | --- | --- | --- | --- |
| 320×568, 4px | 93 / 123 | 0 / 1 | 0 / 0 | 0 of 423 / 0 of 423 |
| 1100×800, 8px | 31 / 31 | 0 / 0 | 0 / 0 | 0 of 423 / 0 of 423 |

- **Template leads and how-to lines:** the receipt and privacy-notice lines do not repeat their summary in either language, and the tax invoice has no line.
- **Reading order, `data-enhance`, search loading, the language banner, motion, prompt naming, tables and reflow:** their WP-50a e2e, unit and dom tests all pass (`docs/testing.md` items 1 to 10, in the e2e and gate logs above).
- **Venda docs:** `git diff 34ce8c7..4c5be79` touches nothing under `docs/rsa-business-toolkit*` and no Venda file.
