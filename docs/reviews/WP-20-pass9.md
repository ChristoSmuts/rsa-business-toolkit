# WP-20 review pass 9 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2026-10-02
- **Commit reviewed:** `d67dc92` ("fix(components): resolve the wp-20 review pass 8 minors"), the tip of `claude/lucid-bell-t5acdn`. I checked it out detached in a clean worktree. Note: the worktree I was given was on `main` (`b010d5b`), not the branch.
- **Scope:** `git diff b010d5b...d67dc92`: 94 files, +10920 / -127. This includes the two commits made after pass 8, which I verify below:
  - `1d68b74`: the licence change (13 files).
  - `d67dc92`: the pass 8 minors (6 files).

## Gate results

I re-ran all of these myself on `d67dc92`.

- `pnpm install --frozen-lockfile`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 176 files, 0 errors, 0 warnings, 0 hints.
  - vitest unit+dom: 30 files, **943 passed (943)**. That is two more than pass 8: the new `check-trust` cases.
  - Content drift: "Wrote 0 changed files, removed 0, 41 files in total. Content drift: none."
  - vitest content: **32 passed (32)**.
- `pnpm build`: exit 0, 96 pages.
  - `dist:audit`: "96 HTML file(s), 13355 URL(s) checked under base /business-toolkit/. No problems." That is four more URLs than pass 8, from the new CC0 links.
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` in one process (`PW_PORT=5220`, 2 workers): 597 tests, **512 passed, 85 skipped, 0 failed** (4.1 min).
  - chromium: 248 passed.
  - mobile: 163 passed, 85 skipped.
  - nojs: 101 passed.
- `pnpm test:a11y`: **192 passed** (96 routes × light and dark).
- **WebKit was not run.** It is not available in this environment. It remains on `merge-checklist.md`.
- Environment: I used the browser shim read-only. I did not run `playwright install` and did not touch `/opt`. My own previews ran on port 5221 and are stopped. Only one Playwright process ran at a time.

## My own checks

I ran scripts against `astro preview` on port 5221, with `crash`, `pageerror`, console-error and off-origin request listeners. None fired anywhere.

**Desktop menus** (1280×800 and 1024×500, `/core/register/` and `/af/core/tax-and-sars/`):
- Left presses in the padding of both lists keep the menu open, at the top of the page and 4000px down. A press on a link navigates. No crash.
- A drag that starts inside the list and ends outside it leaves the menu open.
- Keyboard scrolling from a focused link (ArrowDown ×4, PageDown, Space, End) closes the menu and puts focus on the summary. This is pass 8 minor 2, now fixed.
- After that, Space presses on the now-focused summary toggle the menu open and closed. They no longer scroll the page; see nit 1.
- A trap I ruled out: Playwright's `locator.click()` on the sticky summary scrolls the page about 408px first, so the scroll handler closes the menu straight away. A raw `mouse.click` at the summary's position opens it correctly at every scroll depth. So it is a test-tool effect, not a site defect. Specs that click a summary after scrolling should keep that in mind.

**Drawer** (375px, `/af/about/` and `/core/register/`):
- Focus cycles close, menu summaries, links, the language links and the theme radio group.
- One stop in each cycle leaves for the browser chrome (`BODY`). This is Chromium's native modal `<dialog>` behaviour, and the background stays inert. Pass 8's "40 Tabs, still inside" depended on where the count stopped.
- Escape returns focus to "Kieslys".

**Screenshots I looked at:**
- `/`, `/af/`, `/about/`, `/af/about/`, `/start/start-here/`, `/af/start/start-here/`, `/core/register/` and `/af/templates/quotation/`.
- At 320, 768 and 1280px, in light, dark, forced colours and without JavaScript.
- No page scrolls sideways.
- The licence section reads correctly in both languages and every mode.
- The AI notice, its status and "Hoe dit gemaak is" sit together in the header.

**Print:** I printed `/about/`, `/af/about/` and `/start/start-here/` to PDF and screenshot. The chrome is hidden and the licence prints.

**Guards in `scripts/dist/check-trust.ts`:**
- The pass 8 template-title reproduction now fails correctly on all five Afrikaans templates. Removing `lang="en-ZA"` from each `<h1>` reports "English text marked as Afrikaans": QUOTATION, TAX INVOICE, INVOICE, RECEIPT, PRIVACY NOTICE.
- Across all 46 Afrikaans pages, the narrowed code branch (`\p{Lu}{2,5}` or a token containing a digit) excuses only "10". No English word hides behind it today.
- Remaining false negatives (nit 2):
  - A notice given the `st-visually-hidden` class still passes both `dist:trust` and the e2e `toBeVisible()`. The 1px clip box counts as visible.
  - Emptying every source title on `/core/register/` still passes. The badge and the hidden "Opens the official website" text supply at least 3 characters.
- No new false positives found.

**Facts outside the markdown.** The about page now says "The website's code is open source under the MIT licence". That matches `LICENSE`.
- I checked the README's dependency licence sentence against `pnpm licenses list`. It is wrong; see minor 2.
- The MIT copyright holder, "Christo Smuts", matches the only human git author in the repository.

## Ownership

The cross-package set through pass 8 is unchanged, and I accept it as recorded there: `.prettierignore`, `TableScroll.astro`, `Card.astro`, `design-system.astro`, `package.json` (`dist:trust`), `scripts/dist/check-trust.ts`, two `ParamNames` lines, the harness and lighthouse edits, and the docs.

`d67dc92` stays inside files already accepted: `check-trust.ts`, `navigation.ts`, its tests, `design-system.md` and `merge-checklist.md`.

`1d68b74` is new and touches files this package does not own:

| File | Owner | Recorded |
|---|---|---|
| `LICENSE` (new), `README.md` | docs / orchestrator | No |
| `docs/rsa-business-toolkit/LICENSE.md` (new), `00 Start here/00-start-here.md`, `SA-Business-Toolkit-complete.md` | guide source (owner) | No |
| `content-meta/docs.meta.json` (`ignore` gains `LICENSE.md`) | content pipeline (WP-10) | No |
| `src/data/en/docs/start__start-here.json`, `src/data/manifest.json` | generated by the pipeline; correctly regenerated, drift clean | No |
| `src/i18n/index.ts` (a third `ParamNames` line, `about.licence`) | WP-12 | No |
| `package.json` (`"license": "MIT"`) | orchestrator | No |

See minor 3.

## Mutation tests

I reverted each mutation with `git checkout -- <file>` and rebuilt `dist/` from the clean tree afterwards. `git status` is clean.

| # | Mutation | Guard | Result |
|---|---|---|---|
| 1 (pass 8) | `check-trust.ts`: `listsSources` back to `/class="st-source"/.test(section)` | `check-trust.test.ts` "does not count an empty source entry" | **Caught.** 1 failed, 19 passed. |
| 2 (pass 8) | `check-trust.ts`: `LANGUAGE_NEUTRAL` code branch back to `[\p{Lu}\d][\p{Lu}\d /&.-]*` | `check-trust.test.ts` "checks upper-case words" | **Caught.** 1 failed, 19 passed. |
| 3 (pass 8) | `AiNotice.astro`: `:global(.st-ai-notice) { display: none !important; }` | `pages.spec.ts` D5 loop, `toBeVisible()` | **Caught.** "Received: hidden" at `pages.spec.ts:59`. `dist:trust` still passes, as expected. Pass 8's exact rule without `!important` no longer hides the notice in this build: it loses on specificity to the callout's scoped `display`, and the 72 D5 tests pass. Use `!important` when repeating this mutation. |
| 4 (pass 8) | `navigation.ts`: scroll-close no longer refocuses the summary (`void hadFocus;`) | `pages.spec.ts` "the desktop menus close on …", new keyboard-scroll step | **Survives.** 1 passed. Run by hand on the same build, focus drops to `BODY`. See minor 1. |
| 5 (pass 7) | `TaskListBlock.astro`: `lang={siteLang}` removed | `dist:trust`, reverse direction | **Caught.** Exit 1, 13 "Afrikaans text marked as English" findings. |

## Earlier findings

| Pass | # | Finding | Status |
|---|---|---|---|
| M1 p1 | B1, M1, M2 | `lang` on the English link; unmarked English outside `.st-blocks`; pseudo-heading levels | Fixed. Language of parts is guarded both ways (mutation 5). |
| M1 p1 | m1–m4, n1, n2 | Badge variants, stale fragment, unnamed `<pre>`, AF reference page, comments, silent missing targets | Fixed. |
| M1 p1 | m5 | Ownership: `TableScroll`, `.prettierignore` | Recorded. Accepted. |
| M1 p1 | n3 | `.js` set but the module is blocked | Backlog. Accepted. |
| p2 | M1–M3 | English titles marked Afrikaans; home 0% band; hreflang/canonical | Fixed. |
| p2 | m1 | Search query not echoed | Deferred to WP-33. Accepted. |
| p2 | m2–m4 | `/` hint; wizard links; D5 removal must fail the build | Fixed. |
| p2 | m5, n1, n2 | `/sources/` per-entry anchors; 404 suggestion; `design-system.astro` line | Deferred or recorded. Accepted. |
| p3 | B1, B2, M1, M2 | Bar covers anchors; switcher name language; empty sources; home figures | Fixed. The nojs anchor tests pass at 375, 1024 and 1280px. |
| p3 | m1–m5, n1–n3 | Assorted | Fixed, or deferred with reasons I accept. |
| p4 | B1, M1, m1–m5, n1 | Sticky bar; prompt reflow; assorted | Fixed or recorded. No sideways scroll at 320–1280px. |
| p5 | m1–m3, n1 | Notice variant; not-saved line; 44px targets; comment | Fixed. |
| p6 | M1, m1, m2, n1, n2 | Menus not dismissable; language guard; person check; TOC print | Fixed. |
| p7 | B1 | Press inside an open menu crashes the tab | Fixed. No crash anywhere I pressed. |
| p7 | m1, m2, m4, n1 | One-way language check; untested outside click; sigline name; menu rides the bar | Fixed. |
| p7 | m3 | Language check fails on names | Names deferred (backlog). Accepted: it fails closed and there are no Afrikaans documents yet. |
| **p8** | **m1** | Hiding the AI notice passes every gate | **Fixed.** The e2e `toBeVisible()` catches it (mutation 3). Empty `<li class="st-source">` is caught (mutation 1). Narrower gaps remain (nit 2). |
| **p8** | **m2** | Scroll-close drops focus to `<body>` | **Behaviour fixed.** I verified it by hand for ArrowDown, PageDown, Space and End. **Its new test does not guard it** (mutation 4); see minor 1. |
| **p8** | **m3** | All-caps rule hides English template titles | **Fixed.** Mutation 2 is caught, and all five real templates fail correctly when their `lang` is removed. |
| **p8** | **n1** | Docs lag the pass 7 behaviour | **Fixed.** `design-system.md:272-276` and `merge-checklist.md:77,81` are updated. |

I reviewed every WP-20 row in `backlog.md` again and accept each reason as written.

## Licence change (owner's decision, 2 October 2026)

**Consistent and accurate:**
- `LICENSE` is the standard MIT text, and `package.json` declares `"license": "MIT"`.
- The guide's start page, the combined edition, `LICENSE.md`, the README and the about page agree on:
  - CC0 1.0 for the guide's text;
  - MIT for the code;
  - no attribution needed;
  - keeping the how-this-was-made page and the register as a request, not a condition.
- The Afrikaans about string says the same as the English.
- `docs.meta.json` ignores `LICENSE.md`, so the pipeline does not try to render it. Drift is clean.

**Linking the CC0 legal code instead of reproducing it is acceptable.** Creative Commons publishes CC0 at a stable canonical URL and supports marking a work with a notice and a link. CC0 has no condition that the text travel with the work. Add the verbatim legal code when it can be fetched, but nothing is wrong without it.

**What is not right:** minors 2, 3 and 4 below.

## Findings

No blockers. No majors.

### minor: the new keyboard-scroll e2e step does not test the pass 8 fix, and can pass or fail by timing
File: tests/e2e/pages.spec.ts:378-386; src/scripts/navigation.ts:121-126,143-155
Acceptance item: M1.3 (header menus); pass 8 minor 2 ("Add that step to the existing e2e test")
What is wrong:
- `base.css:130` sets `scroll-behavior: smooth`, so the step's `window.scrollTo(0, 0)` starts a smooth scroll from y≈800. The step does not wait for it to finish.
- Enter then opens Read mid-scroll. `openedAt` is only updated in the `toggle` event, which is dispatched asynchronously. So the next frame's scroll event compares y≈792 with the stale `openedAt` of 0 and closes the menu, before any ArrowDown is pressed.
- What follows depends on timing:
  - Sometimes `read.locator('a').first().focus()` is a no-op on the closed menu. Focus stays on the summary, and `toBeFocused` passes whatever `navigation.ts` does.
  - Otherwise the link takes focus inside the closed `<details>` and drops to `BODY`. That would fail even with the fix.
- Mutation 4, which removes the fix, survives. I replayed the test's exact sequence three times and got both outcomes.
- The behaviour itself is correct (I checked it directly), so this is a guard gap plus a flake risk, not wrong behaviour. That makes it minor, as passes 2, 4 and 8 rated earlier guard gaps.
How to reproduce:
1. Replace line 152 of `navigation.ts` with `void hadFocus;` and run `pnpm build`.
2. Run `playwright test tests/e2e/pages.spec.ts --project=chromium -g "desktop menus"`. It reports 1 passed.
3. Run the same steps by hand on a preview, with no prior scroll: focus drops to `BODY`.
Suggested fix:
- In the test, use `scrollTo({ top: 0, behavior: 'instant' })` and wait for `scrollY === 0`. Assert that Read is open and the link is focused before pressing ArrowDown.
- In `navigation.ts`, record `openedAt` when the scroll handler first sees a newly opened menu, or on the summary's `click`/`keydown`, not only on the async `toggle`.

### minor: the README's dependency licence list is wrong
File: README.md:79
Acceptance item: general quality (licence statements the owner asked to be accurate)
What is wrong:
- The README says "Libraries are MIT, ISC, Apache-2.0 or BSD … axe-core, used only in tests, is MPL-2.0."
- `pnpm licenses list` also shows:
  - `lightningcss` (MPL-2.0, a build-time CSS tool);
  - `@img/sharp-libvips-linux-x64` (LGPL-3.0-or-later);
  - `argparse` (Python-2.0);
  - nine BlueOak-1.0.0 packages;
  - MIT-0, 0BSD, and CC0-1.0 (`mdn-data`, `language-subtag-registry`).
- "Every dependency is free and open source" is true. The list that follows is not.
- None of these packages ships in `dist/`; only the OFL fonts and the ISC Lucide icons do. So no licence obligation is broken, and this is minor rather than major.
How to reproduce: `pnpm licenses list --json`, then group the packages by licence.
Suggested fix: Drop the enumeration ("Every dependency is under a free and open-source licence; run `pnpm licenses list` for the full list"). Or name what ships (OFL-1.1 fonts, ISC icons) and say that build and test tools carry other OSI licences.

### minor: the CC0 dedication names no affirmer, and the guide says "is in the public domain"
File: docs/rsa-business-toolkit/LICENSE.md:3; docs/rsa-business-toolkit/00 Start here/00-start-here.md:105 (and the combined edition :179); src/i18n/en.json and af.json `about.licence`
Acceptance item: general quality (accuracy of the licence statements)
What is wrong:
- CC0 is a waiver made by an affirmer who holds the rights, with a fallback licence where a waiver is not effective. `LICENSE.md` says the text "is dedicated to the public domain" but not by whom. The MIT `LICENSE` names Christo Smuts.
- The start page and about page go further: "This guide is in the public domain". That is not true in every jurisdiction where only the fallback licence applies.
- Creative Commons' recommended notice is "To the extent possible under law, <name> has waived all copyright and related or neighbouring rights to <work>."
- Nothing a reader can do with the text is wrong today, and the meaning ("use it for anything") is right, so this is minor.
Suggested fix:
- Use the CC notice wording with the owner's name in `LICENSE.md`.
- On the start page and in `about.licence`, say "dedicated to the public domain under CC0 1.0" ("aan die publieke domein toegewy" in Afrikaans).

### minor: the licence commit's cross-package edits are not recorded, and two planning docs still call the licence unconfirmed
File: docs/reviews/merge-checklist.md (WP-20 section); docs/reviews/backlog.md; docs/outstanding-work.md:41,166; docs/build-plan.md:255
Acceptance item: protocol step 2 (file ownership); general quality
What is wrong:
- `1d68b74` edits files from the guide source, the content pipeline (`docs.meta.json`), WP-12 (`src/i18n/index.ts`), the orchestrator (`package.json`) and the docs (`README.md`, `LICENSE`). None is recorded in `backlog.md` or `merge-checklist.md`, unlike every earlier cross-package edit.
- A squash merge of this branch would bury an owner-level licence decision in a WP-20 commit.
- `outstanding-work.md` still says "Licence. The plan assumes MIT for code and the toolkit's own terms for content. Not confirmed", and lists it as a decision needed before publishing.
- `build-plan.md:255` still states the "toolkit's own terms" assumption.
- It is minor, not an ownership major: the change is owner-directed, single-purpose, regenerated correctly (drift clean) and covered by the gate. It needs recording, not undoing.
Suggested fix:
- Add a WP-20 merge-checklist item: keep `1d68b74` as its own `docs:` commit (or cherry-pick it to `main` first), and confirm the listed shared-file edits.
- Mark the licence decided, with its date, in `outstanding-work.md`, and note the decision under the build plan's assumption.

### nit: after a scroll closes a menu, Space no longer pages the document
File: src/scripts/navigation.ts:150-152
What is wrong: A keyboard reader on a link in an open menu who presses Space to page down gets the first page scroll, the menu closes, and focus lands on the summary. Every later Space toggles the menu open and closed in place: I saw five presses alternate with y fixed at 623. This is native `<summary>` behaviour and focus is not lost. But the reader did not choose to focus the summary.
Suggested fix: Optional. Pass 8 also offered "do not close on scroll while the menu holds focus". Either choice is defensible. If the current one stays, the docs could say so.

### nit: the remaining D5 guard gaps are narrow but real
File: scripts/dist/check-trust.ts:111-113; tests/e2e/pages.spec.ts:58-73
What is wrong:
- A notice with `class="st-visually-hidden …"` passes `dist:trust` and `toBeVisible()`, because the 1px clip box counts as visible.
- A source entry whose title text is empty still passes both checks: the badge and the hidden "Opens the official website" text supply 3 or more characters.
Suggested fix: Optional.
- Assert that the notice's bounding box is taller than, say, 40px.
- Measure the text of `.st-source__title > a > span` or `.st-source__name`, not the whole `<li>`.

### nit: the about page names CC0 without linking it
File: src/pages/[...locale]/about.astro:72-75
What is wrong: The start page links "CC0 1.0" to creativecommons.org. The about page, which is where a reader looks for terms, gives the name only.
Suggested fix: Make "CC0 1.0" a link to the deed (an external link, with no runtime request).

## Verdict

**Clean: 0 blocker, 0 major, 4 minor, 3 nit.**

- Every pass 8 minor is fixed in behaviour, and so is the nit. Four of my five mutations go red. The survivor (mutation 4) shows that the new keyboard-scroll test step races the page's own smooth scrolling (minor 1). I verified the behaviour itself by hand.
- The licence change agrees with itself across the guide, the combined edition, the about page in both languages, `LICENSE`, `LICENSE.md` and `package.json`. Linking the CC0 legal code instead of copying it is acceptable. The README's dependency list, the dedication wording and the unrecorded shared-file edits need tidying (minors 2–4).
- This is the second consecutive clean whole-diff pass after pass 8. Under the 17 September amendment, the minors may be fixed without restarting the count, and the next review verifies them.
- WebKit was not run because it is not available in this environment. It remains on `merge-checklist.md`.
