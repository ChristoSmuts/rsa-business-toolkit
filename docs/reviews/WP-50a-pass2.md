# WP-50a review, pass 2

Tree: `afce80c`. That is the 13 fix commits on `204a2a2`, the pass 1 review (`f5384e2`) and 5 commits that fix pass 1. Reviewer: fresh, independent. No code was changed for this review.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 3 |
| Minor | 5 |

- **M1** is the item 1 fix moving the page: a layout shift of 0.54 to 0.78.
- **M2** is a reflow regression against `204a2a2`, caused by the checkbox fix. Pass 1 accepted that fix and missed it.
- **M3** is the "Now reading" pill fix not meeting its own criterion: the pill flickers on short sections.

Every other pass 1 finding is fixed: M2, M4, m1, m2, m3, m4 and m5.

## Checks run

All logs are in the session scratchpad as `wp50a-review2-*.log`. The probe scripts are in `wp50a-r2/`.

`pnpm gate:fast` (`wp50a-review2-gatefast.log`):

```
All matched files use Prettier code style!
- 0 errors
- 0 warnings
 Test Files  77 passed (77)
      Tests  3249 passed (3249)
 Test Files  1 passed (1)
      Tests  39 passed (39)
EXIT 0
```

`pnpm build` (`wp50a-review2-build.log`):

```
[build] 198 page(s) built in 4.08s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.6 KB without a profile, 24.6 KB with one (budget 25.0 KB, 0.4 KB left).
dist:budget: heaviest other page /af/search/: 34.7 KB without a profile, 34.7 KB with one (budget 45.0 KB, 10.3 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

After the build, `git status` was clean, so the content shows no drift.

`pnpm content:fidelity --lang af` (`wp50a-review2-fidelity.log`):

```
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
EXIT 0
```

e2e, chromium + mobile + nojs, `PW_PORT=4931` (`wp50a-review2-e2e.log`):

```
Running 1230 tests using 2 workers
  93 skipped
  1137 passed (10.0m)
EXIT 0
```

The log has no `✘` lines and no flaky or retried tests.

`pnpm test:a11y`, `PW_PORT=4932` (`wp50a-review2-a11y.log`):

```
  416 passed (6.3m)
EXIT 0
```

The log has no `✘` lines.

Commit messages: `pnpm exec commitlint --verbose --from 204a2a2 --to afce80c` gives `found 0 problems` for all 19 commits. All 5 new commits use a CLAUDE.md scope and end with both trailers.

The probes ran against the built `dist/`, served under `/business-toolkit/` in Playwright Chromium. They ran only after e2e and a11y had finished.

## Major

### M1. When the wizard starts on question 2 instead of 3, it shifts the layout by 0.54 to 0.78. The `wizard.earlierMissing` hint can never show

`src/scripts/wizard.ts:119-125` (start step and scroll compensation), `:80-86` and `:248-250` (the earlier-question path and the hint); `src/components/wizard/Wizard.astro:225`, `:282`.

**Item 1 itself holds.** The wizard never starts past an unanswered question, and "See my path" always works:

- with all three questions answered and the reader at question 3, it reaches `my-path/`;
- with nothing answered and the reader at question 3, it opens on question 1 with a layout shift of 0.

**The problem is the case where question 1 is answered and question 2 isn't.** The steps were:

1. Hold the `/_astro/*.js` modules.
2. Answer question 1 and question 3, and leave question 2 empty.
3. Scroll so question 3 is at 80px.
4. Release the modules.

The wizard opens question 2 in question 3's place. Question 1 folds away above question 2, so question 2 moves up in the document by question 1's height. The `scrollBy` keeps it where question 3 was on screen, but by the CLS definition that is still a shift of the whole step.

From `wp50a-review2-probe-wizard-shift.log`:

```
Q1 answered, at Q3 360x740: ... "shifts":[{"v":0.675,"src":["SECTION.st-wizard__step st-stack 674->79 h661", ...]}]
Q1 answered, at Q3, Q3 unanswered 360x740: ... {"v":0.704, ...}
Q1 answered, at Q3 320x568: ... {"v":0.775, ...}
Q1 answered, at Q3 412x915: ... {"v":0.545, ...}
Q1 answered, at Q3 1280x800: ... {"v":0.238, ...}
af Q1 answered, at Q3 360x740: ... {"v":0.761, ...}
nothing answered, at Q3 320x568: ... "shifts":[]
```

The project's limit is 0.1, used since WP-31. `docs/design-system.md` (§ enhancement, "The switch costs no layout shift where the reader is looking") claims this case puts the question "where the question in view was". The new e2e test only covers the case where question 1 is unanswered, and that case happens to shift 0.

**What the reader sees.** In both cases the question they just answered is replaced, under their finger, by another one. Nothing on screen says why.

**The hint can never show.** The wizard now always starts on the first unanswered step, so no step can be valid while an earlier one is not. That means:

- `#advance()`'s earlier-question branch can't be reached through the UI;
- the `data-earlier-hint` line can't be reached either;
- no test touches the hint (`grep -rl "earlier-hint\|earlierMissing" tests/` returns nothing).

The brief and `docs/design-system.md` both say the hint appears. The probe never saw it (`wp50a-review2-probe-wizard.log`, `earlierHintsVisible: []` in every scenario).

**Fix:**

- Start on the step in view, as `f5384e2` did. When an earlier step is unanswered, show the `wizard.earlierMissing` line, which the code already supports. Let Next or "See my path" go to the missing question; that path already exists in `#advance()`.
- This moves nothing without input, makes the hint reachable, and keeps every tap working.
- Add e2e tests:
  - question 1 answered, question 2 not, the reader at question 3: layout shift ≤ 0.1, the hint is visible, and "See my path" opens question 2 and focuses it;
  - the same with nothing answered.

### M2. The checkbox fix makes `/af/business-types/food/` scroll sideways at 320px (a regression against `204a2a2`)

`src/styles/base.css:493-496` (`.st-check > input { flex-shrink: 0; }`).

The checkbox no longer shrinks. Nothing else in the `.st-check` row can shrink below its min-content either: the label `<span>` is a flex item with `min-width: auto` and only `break-word`.

So the longest word in a task label sets the row's minimum width. In "Doen aansoek om die COA by jou munisipaliteit se Omgewingsgesondheidsafdeling" that word is "Omgewingsgesondheidsafdeling", and it pushes the page 3px wider than the screen. That is a WCAG 1.4.10 reflow failure on the heaviest document page, with and without JavaScript.

From `wp50a-review2-probe-overflow.log` and `-overflow-all.log`:

```
js=true overflow 3
  SPAN. right=323.0 text="Doen aansoek om die COA by jou munisipaliteit se Omgewingsge"
js=false overflow 3
197 pages at 320px: 1 scroll sideways
197 pages at 320px with .st-check > input { flex-shrink: 1 !important }: 0 scroll sideways
```

`tests/e2e/content.spec.ts` "no horizontal scrolling at 320px" doesn't visit this page, and the checkbox test in `first-screen.spec.ts` only looks at `/checklist/`.

**Fix:**

- Keep `flex-shrink: 0` on the box, and let the label shrink: `.st-check > span { min-inline-size: 0; }`, with `overflow-wrap: anywhere` there or the existing `break-word`. Then check that the long word wraps rather than overflows.
- Add `af/business-types/food/` to the 320px reflow test. Better still, run the `scrollWidth` check over every built page, which takes about a minute (`wp50a-r2/overflow-all.mjs`).

### M3. The "Now reading" pill flickers on short sections and goes away at every heading

`src/scripts/toc.ts:141-150`.

The pill is now hidden whenever the current section's heading is anywhere on screen. As the reader scrolls, each heading that reaches the line makes the pill vanish. It comes back only once that heading has left the top of the screen, and its fade-in (`st-toc-pill-in`) runs again each time.

That gives a hidden gap of 128 to 232px of scroll at every section boundary, on every page. On a page of short sections the pill blinks on for one flick of the thumb and off again.

From `wp50a-review2-probe-pill-flicker.log`, at 320×568 in 4px steps:

```
branding/brand-applications-and-polish/: pill shows 22 times, 10 of them for under 120px of scroll
  ... shown 32px "Part 1: the files you mu" / hidden 132px / ... / shown 36px "Part 3: where the brand " / hidden 160px / shown 84px "1. WhatsApp Business pro" / hidden 132px / shown 36px "2. Google Business Profi" / ...
af/branding/brand-applications-and-polish/: pill shows 22 times, 9 of them for under 120px of scroll
  ... / hidden 132px / shown 8px "8. Uithangbord en venste"
```

Over all 31 documents with a pill (`wp50a-review2-probe-pill.log`, 16px steps), the pill toggled:

- in English, 823 times, 30 of those shows lasting under 120px of scroll;
- in Afrikaans, 821 times, 28 of those shows lasting under 120px of scroll.

Two parts of the item do hold:

- After a contents-link jump the pill never covers its own heading: in each language, 441 of 442 jumps leave the pill hidden. The 442nd is m2.
- A reader who has scrolled away is still told where they are.

**Fix:** hide the pill only while it would overlap the current heading (heading top < pill bottom + gap), not whenever the heading is on screen. Alternatively, set `--st-toc-pill-space` from the pill's measured height with a `ResizeObserver`, so the line always sits below the pill. With either change:

- one- and two-line pills stay up continuously;
- only a tall pill over a just-reached heading hides;
- the toggle count drops to near zero.

Add a test that scrolls `branding/brand-applications-and-polish/` at 320px and fails if a show lasts under about 120px of scroll.

## Minor

### m1. A pill of three or more lines still covers the next heading as it scrolls up

`src/scripts/toc.ts:149`; `src/components/navigation/TableOfContents.astro:98` (the reserved space is 1lh + 44px + 8px).

A heading only becomes current once its top passes the line at about 102px. A pill taller than about 94px therefore covers the incoming heading while it slides from the pill's bottom up to the line.

From `wp50a-review2-probe-pill.log`:

```
start/what-has-changed/ known-structural-differences-... overlap 48px, pillH 146
af/start/what-has-changed/ known-structural-differences-... overlap 43px, pillH 146
start/what-has-changed/ 3-01-how-to-use-this-toolkit... overlap 15px, pillH 121
```

It's brief, and only on the longest titles. The `ResizeObserver` variant of the M3 fix removes it as well.

### m2. On "Free tools" the pill names the wrong section and sits right over the heading a link went to

`src/scripts/toc.ts:22-34` (`currentIndex` takes the last list index above the line, so it assumes the list is in page order).

On `paperwork/free-tools/` (both languages), the contents list has `which-office-software-to-use` before `words-used-in-this-file`. On the page the word list comes first (1016px against 1248px).

So once "Which office software to use" passes the line, the current section is "Words used in this file". The pill is shown, because that heading is off screen, and it names that section above the heading the reader is actually in.

From `wp50a-review2-probe-pill-jump.log` and `-pill-words.log`:

```
paperwork/free-tools/#which-office-software-to-use: pill shown after the jump: {"shown":true,"text":"Now reading Words used in this file","headTop":94,"pillBottom":92}
af/paperwork/free-tools/#which-office-software-to-use: ... "Jy lees nou Woorde wat in hierdie lêer gebruik word" ...
  pill frames 158 naming the wrong section 7
```

These are the only two pages whose contents list is out of page order (a check of every built `st-toc--details`).

On every page, the pill also reads "Now reading: Words used in this file" for 288 to 384px of scroll after the closed list (`-pill-flicker.log`). Over that stretch the reader is in the contents and the intro note, not the word list. At `204a2a2` the list was open on phones, so the name was right then.

**Fix:**

- In `currentIndex`, pick the target with the greatest `top ≤ line`, not the last index.
- Don't count a closed `<details>` target as a section the reader is in.

### m3. Six two-column tables still scroll at 320px. That's acceptable, but two of them do so only because of one URL

`src/components/ui/TableScroll.astro:99-112`.

**Measured** (`wp50a-review2-probe-tables.log`): there are 16 two-column tables. None of them has a word split mid-word, at 320, 360 or 412px. 6 scroll at 320px, 6 at 360px and 4 at 412px:

```
af/branding/branding-prompts/ #1: overflow 227px ... longest="webaim.org/resources/contrastchecker"
af/business-types/ #1: overflow 77px ...
af/checklist/ #2: overflow 97px ...
af/sources/ #2: overflow 138px ...
af/start/how-to-use/ #1: overflow 77px ...
branding/branding-prompts/ #1: overflow 110px ... cols [86,312]
```

Each one has:

- `role="region"`, `tabindex="0"`;
- an `aria-labelledby` label ("Tabel: … Rol sywaarts om alles te sien");
- the radial edge shadows;
- no body cell background that would hide the shadows.

Every 3+ column table is still at least 576px wide.

**I judge this acceptable.** Each of these tables scrolls less than at `204a2a2`, where every table was at least 576px, and readable words beat the split words of `f5384e2`.

**The branding-prompts tables are the exception.** The only thing that widens them is the bare URL `webaim.org/resources/contrastchecker`. In English it squeezes the first column to 86px, one word per line ("The / AI / cannot / reliably…"). It also pushes most of every row's "So you must…" text off screen (screenshot `wp50a-r2/table-320-branding_branding-prompts_-1.png`).

**Fix:** let links in table cells break anywhere: `.st-table-scroll :is(td, th) a { overflow-wrap: anywhere; }`. URLs may break; words still may not. Then measure again: the English prompts table should fit.

The Afrikaans business-types hub hides most of its "Maak oop" link column at 320px. That is worth a stacked layout in the revamp (WP-50 Phase 1, business-type pages).

### m4. The receipt and privacy-notice form pages say their first sentence twice

`content-meta/docs.meta.json:501`, `:518`; `src/i18n/en.json:501`, `:506` (and `af.json`).

The new summaries are accurate and come from the templates' own words. They say nothing about copying a file and contain no `[`, and only the four summaries changed in `src/data` (`git diff --word-diff f5384e2..afce80c -- src/data`).

The problem is that each lead now repeats, word for word, the first sentence of the line just above the form:

```
receipt  lead: Send this when money arrives. It stops the "did you get my payment?" message.
receipt  form line: Send this when money arrives. Fill in the form, check the preview, then save it as a PDF to send.
privacy  lead: Put this on your website, or send it as a PDF when a customer asks. It is short on purpose.
privacy  form line: Put this on your website, or send it as a PDF when a customer asks. Fill in the form, …
```

The Afrikaans pages repeat in the same way.

The quotation summary ("Tell a customer the price before you do the work") comes from the "which template" page ("A price you offer before the work"), not from the template itself, which is fine.

**Fix:** drop the first sentence from `formHowTo` for these two templates, so the form line says only how to use the form.

### m5. `docs/design-system.md` repeats itself in the `TableScroll` row

`docs/design-system.md:240`: "The "Key to the short words" table fits in both languages, so the "Key to the short words" table fits at 320px in both languages (WP-50a; …)".

The comment at `src/components/ui/TableScroll.astro:103` also runs well past the 100-character line width.

**Fix:** make it one sentence, and rewrap the comment.

## Pass 1 findings: status

| Pass 1 | Status | Evidence |
| --- | --- | --- |
| M1 wizard lost tap | Fixed, but see M1 above | `-probe-wizard.log`: every start lands on the first unanswered question; all answered → `my-path/` |
| M2 split words | Fixed | 0 split words in 16 tables at 320, 360 and 412px; padding `--st-space-2` below 480px; no `overflow-wrap: anywhere` or `hyphens` left on cells |
| M3 pill covers its heading | Fixed for jumps; see M3, m1, m2 | 441 of 442 jumps per language with the pill hidden; the heading never above the screen |
| M4 template lead | Fixed | leads and meta of all six template pages, without "make a copy" or `[`; content test added |
| m1 word-list link | Fixed with JavaScript | `-probe-terms.log`: `320px js=true … open after following the link true`; without JavaScript still closed, as accepted in pass 1 |
| m2 "Loading search…" | Fixed | `-probe-search.log`: `status-line mutations while typing 16 characters …: 0`; `search-ui.ts` writes only a change |
| m3 Afrikaans hub summary | Fixed | "Vind jou soort besigheid in een tabel, …", which matches the English |
| m4 header shift recorded | Fixed | `WP-50-design-revamp.md` item 5 has it, with the 0.1 target |
| m5 budget figure | Fixed | the skill and `docs/testing.md` say `/af/business-types/food/` 24.6 KB (24.63), 0.4 KB left, matching the build |

## Pass 1's accepted items: re-checked

- **AI notice:** all 72 document pages at 320×568, with and without a profile. The worst case is `branding/mood-and-materials/`, with its top at 453px and 115px of the notice on the first screen. The lead is never above it (`-probe-regress.log`). The e2e and nojs first-screen tests pass.
- **Reading order and `data-enhance`:** unchanged since pass 1. The e2e tests pass: wizard and templates held for 3 s, then released.
- **Banner:** CLS 0.000 at 320, 360 and 412px, with and without the offer.
- **Motion:**
  - no animation when the page opens;
  - the ring gets `data-animate` after its first draw;
  - a tick runs `stroke-dashoffset:200`;
  - `scroll-behavior` is `auto`.
- **Checkbox:** square; the e2e test passes. But see M2.
- **Prompt naming:** the e2e test "prompt names" passes.
- **At 320px the header is 217px before the fonts arrive and 165px after.** This is recorded and deferred to the WP-50 header work.
