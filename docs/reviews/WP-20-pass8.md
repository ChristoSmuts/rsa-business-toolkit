# WP-20 review pass 8 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2026-10-02
- **Commit reviewed:** `177457d` ("fix(components): resolve wp-20 review pass 7"), the tip of `claude/lucid-bell-t5acdn`. I checked it out detached in a clean worktree.
- **Scope:** `git diff b010d5b...177457d`: 31 commits, 85 files, +10573 / -114. This includes the pass 7 fix commit (10 files, +136 / -41), which I verify below.

## Gate results

I re-ran all of these myself on `177457d`.

- `pnpm install --frozen-lockfile`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 176 files, 0 errors, 0 warnings.
  - vitest unit+dom: 30 files, **941 passed (941)**. That is two more than pass 7: the new `check-trust` cases.
  - Content drift: none ("Wrote 0 changed files, removed 0, 41 files in total").
  - vitest content: **32 passed (32)**.
- `pnpm build`: exit 0, 96 pages.
  - `dist:audit`: 96 HTML files, 13351 URLs checked under `/business-toolkit/`, no problems.
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` in one process (`PW_PORT=5120`, 2 workers): 597 tests, **512 passed, 85 skipped, 0 failed**.
  - chromium: 248 passed.
  - mobile: 163 passed, 85 skipped.
  - nojs: 101 passed.
- `pnpm test:a11y`: **192 passed** (96 routes × light and dark).
- **WebKit was not run.** It is not available in this environment. The brief's definition of done lists WebKit, and it is still on `merge-checklist.md`.
- I used the existing browser shim read-only. I did not run `playwright install` and did not touch `/opt`. My own preview ran on port 5121 and is stopped.

## My own checks

I ran Playwright scripts against `astro preview` on port 5121, with `page.on('crash')`, `pageerror` and console-error listeners on every page.

**Desktop menus** at 1280×800 (`/core/register/`, `/af/core/tax-and-sars/`), Read and Tools. I pressed:

- all four corners of `.st-menu__list`, the middle of its bottom and right padding, and the gap between every pair of links;
- a right-click in the padding, then Escape;
- a press inside the list released outside it;
- a double-click on the summary.

There was no crash and no console error. A drag that starts inside the list leaves the menu open.

**Short viewports.** At 1024×500, 1280×600 and 1280×720:

- Read (6 links) ends at 387–393px and Tools (4 links) at 263–266px, so both fit.
- Tabbing through every link keeps the menu open and focus visible.
- A wheel scroll over the open list closes it, with no crash.

**Keyboard scrolling with focus inside an open menu.** I tested ArrowDown, PageDown and Space from the first link. The menu closes and focus drops to `<body>`; see minor 2. The next Tab lands on "Tools".

**Drawer** at 375px (`/af/core/register/`):

- It opens with focus on the close button, which is named "Maak kieslys toe" through its icon.
- Opening and closing both accordions keeps it open.
- The theme radios inside it apply Dark.
- After 40 Tabs, focus is still inside the dialog.
- Escape closes it and returns focus to "Kieslys".
- After following a link and going back, the drawer is closed.

**Theme control** (1280px, `/af/`):

- The arrow keys move System → Light → Dark.
- Dark survives a reload.
- Focusing a theme radio while Read is open closes Read, through the `focusout` path. There was no crash.

**Language switcher.** The Afrikaans link on `/core/register/#business-bank-account` points at `/af/core/register/#business-bank-account`. After the switch, the target heading sits 87px from the top, below the 71px bar. Without JavaScript the target lands at 16px, and the bar is static then.

**Pager:** it is named "Vorige en volgende bladsy" on Afrikaans pages.

**Tab order** on `/core/register/` (75 stops): skip link, home, Read, Tools, the two language links, the theme radios, then the sidebar. No stop is invisible or has zero size.

**Screenshots I looked at:**

- `/`, `/af/`, `/core/register/`, `/af/core/register/`, `/templates/quotation/`, `/af/templates/quotation/`, `/checklist/`, `/af/business-types/food/`, `/search/`, `/sources/` and `/af/glossary/`, at 320, 768 and 1280px, in light, dark, forced colours and without JavaScript.
- Full-page shots of `/af/templates/quotation/`, `/af/checklist/`, `/af/business-types/` and `/af/contents/` at 375 and 1280px.
- No page scrolls sideways at any width.
- In every mode the AI notice, its status and "Hoe dit gemaak is" sit together in the header.

**Print** (`emulateMedia('print')` with a menu open, plus a PDF of `/templates/quotation/`):

- The top bar, the menu lists, the pager and the language switcher are hidden.
- The AI notice, the "Sources for this page" section and the three blank signature lines print.
- External links print their URL.

**Signature lines:** each is now `<span class="st-sigline" aria-hidden="true">` followed by visually hidden "(blank line to fill in)", or "(leë lyn om in te vul)" in Afrikaans chrome. Inside an English fallback block it is English, the same as the other hidden strings there ("(external link)", the table captions). That matches the content-language policy settled in M1.

**Language of parts.**

- `dist:trust` now checks text in both directions.
- I swept `aria-label`, `title`, `alt`, `placeholder` and `aria-description` on every `af/**` page against its English twin. There are no English values marked as Afrikaans. The only matches are meta descriptions, which the backlog accepts (pass 3 nit).

**Guards in `scripts/dist/check-trust.ts`.** I fed `trustProblems` and `langProblems` modified real pages and small fixtures.

False negatives:

- A notice hidden with `hidden` or `display: none` passes. See minor 1.
- A sources section whose only entry is an empty `<li class="st-source"></li>` passes. This is the same gap as minor 1, in a narrower form.
- Any all-caps text is treated as language-neutral, including all five template titles. See minor 3.
- `lang="EN-ZA"` (upper case) is not recognised. Astro emits lower case, so this is not reported.

False positives:

- On a fixture, "e.g." marked `en-ZA` and absent from the twin is reported as Afrikaans. That is narrow and not reported.

**Facts outside the markdown:** the pass 7 change adds only the `templates.fields.blankLine` string. There are no new figures.

**Ownership.** The pass 7 fix touches:

- `scripts/dist/check-trust.ts`: recorded as a tooling change in pass 4 and on `merge-checklist.md`;
- both dictionaries: one new key in each;
- `docs/testing.md`;
- `docs/reviews/backlog.md`: one new WP-20 row;
- package files.

The whole-diff cross-package set is unchanged from pass 7:

| File | Owner | Recorded |
|---|---|---|
| `.prettierignore` | tooling | Yes (M1 p1 m5) |
| `src/components/ui/TableScroll.astro` | WP-11 | Yes |
| `src/components/ui/Card.astro` (`titleLang`) | WP-11 | Yes (p3) |
| `src/pages/design-system.astro` (register link) | WP-11 | Yes (p2) |
| `package.json` (`build` runs `dist:trust`) | orchestrator | Yes (p4), and on the merge checklist |
| `scripts/dist/check-trust.ts` | tooling | Yes (p4) |
| `src/i18n/index.ts` (two `ParamNames` lines) | WP-12 | Accepted (p5, p7) |
| `tests/unit/e2e-harness.test.ts`, `tests/unit/i18n.test.ts`, `tests/e2e/helpers/exceptions.ts`, `tests/e2e/nojs.spec.ts`, `tests/lighthouse/urls.json` | WP-22a / WP-12 | The brief directs the `exceptions.ts`, `urls.json` and e2e edits. The two unit-test edits follow from emptying the exception lists and from a changed `site.checkedOn` string. Accepted. |
| `docs/design-system.md`, `docs/testing.md`, `docs/i18n.md`, `docs/outstanding-work.md` | docs | They describe this package's behaviour. Accepted. |

## Mutation tests

I reverted each mutation with `git checkout -- <file>`. I then rebuilt `dist/` from the clean tree, and `git status` is clean.

| # | Mutation | Guard | Result |
|---|---|---|---|
| 1 (pass 7 guard) | `navigation.ts`: `focusout` back to `if (next instanceof Node && menu.contains(next)) return;` (the pass 7 crash) | `pages.spec.ts` "the desktop menus close on Escape, outside clicks, focus leaving, scrolling and each other" | **Caught.** `Error: mouse.click: Target crashed`. |
| 2 (pass 7 guard) | `TaskListBlock.astro:42`: `lang={siteLang}` removed | `dist:trust`, reverse direction | **Caught.** Exit 1, with 13 "Afrikaans text marked as English: "Merkies op hierdie bladsy…"" findings. |
| 3 (pass 7 guard) | `navigation.ts`: `SCROLL_CLOSE = 1e9` | the same e2e test | **Caught.** It fails at `pages.spec.ts:368` (the scroll poll). Unit tests still pass (941). |
| 4 (pass 7 guard) | `navigation.ts`: Escape ignored unless focus is inside the menu | the same e2e test | **Caught.** It fails at `pages.spec.ts:362`. |
| 5 (pass 7 guard) | `navigation.ts`: the document `pointerdown` listener renamed to a dead event (pass 7 mutation 1, which survived then) | the same e2e test | **Caught.** It fails at `pages.spec.ts:356`, after the blur. |
| 6 (D5 guard) | `AiNotice.astro`: `:global(.st-ai-notice) { display: none; }` | `dist:trust`; `pages.spec.ts` "the D5 trust pieces on every document page"; all of chromium and nojs | **Survives.** `pnpm build` exits 0 with the same `dist:trust` line. The D5 e2e tests pass 77; chromium and nojs pass 349. See minor 1. |

## Earlier findings

| Pass | # | Finding | Status |
|---|---|---|---|
| M1 p1 | B1 | "Read the English version" link marked `lang="en"` | Fixed. |
| M1 p1 | M1 | English text outside `.st-blocks` not marked | Fixed. `dist:trust` guards it in both directions now (mutation 2). |
| M1 p1 | M2 | Pseudo headings render `h4` under `h2` | Fixed. |
| M1 p1 | m1–m4 | Official badge variants; stale fragment; unnamed `<pre>` stops; English on the AF reference page | Fixed. |
| M1 p1 | m5 | Ownership: `TableScroll`, `.prettierignore` | Recorded in the backlog. Accepted. |
| M1 p1 | n1, n2 | Comments point at missing tests; silent missing link targets | Fixed. |
| M1 p1 | n3 | `.js` set but the module is blocked | Backlog. Accepted. |
| p2 | M1–M3 | English titles marked as Afrikaans; home 0% band; hreflang/canonical | Fixed. |
| p2 | m1 | Search query lost | Message fixed. Echoing the query is deferred to WP-33. Accepted. |
| p2 | m2–m4 | `/` hint; wizard links; D5 removal does not fail the build | Fixed. Removing the notice fails the build; hiding it does not (minor 1). |
| p2 | m5 | Hub; per-entry anchors on `/sources/` | Hub fixed. Anchors deferred. Accepted. |
| p2 | n1, n2 | 404 suggestion; `design-system.astro` line | Deferred or recorded. Accepted. |
| p3 | B1, B2 | Bar covers anchors below 1024px; switcher name language | Fixed. Re-checked: anchors land below the bar with and without JavaScript. |
| p3 | M1, M2 | Empty sources under "the sources below"; home figures | Fixed. |
| p3 | m1–m5, n1–n3 | Assorted | Fixed, or deferred with reasons I accept (n3, the AF meta description). |
| p4 | B1, M1 | Sticky bar from 1024px; prompts do not reflow | Fixed. No sideways scroll at 320–1280px. |
| p4 | m1–m5, n1 | Search link; home figure test; notice sentence; ownership; trust lines; checklist ticks | Fixed or recorded. |
| p5 | m1–m3, n1 | Notice sentence variant; not-saved line; 44px targets; scroll-padding comment | Fixed. |
| p6 | M1 | Desktop menus cannot be dismissed | Fixed. All five paths are now guarded (mutations 1, 3, 4 and 5). |
| p6 | m1, m2, n1, n2 | Not-saved line language; language-of-parts guard; person check; TOC print | Fixed. |
| p7 | B1 | Press inside an open menu crashes the tab | **Fixed.** No crash anywhere I pressed. The e2e test reproduces the crash against the old handler (mutation 1). |
| p7 | m1 | Language check runs one way only | **Fixed.** Mutation 2 caught on 13 pages. |
| p7 | m2 | Outside-click path untested; Escape needs focus inside | **Fixed.** Mutations 4 and 5 caught. The test still runs on chromium only and simulates Safari with `blur()`. That is acceptable while WebKit is unavailable. |
| p7 | m3 | Language check fails on URLs, form codes and names | **Fixed in part.** `<code>`, URLs, domains and all-caps codes are skipped. Names are deferred to the translation package (new backlog row), and I accept that reason: it fails closed and there are no Afrikaans documents. The all-caps rule is too broad (minor 3). |
| p7 | m4 | Every sigline announced as "Signature" | **Fixed.** Decorative line plus hidden "(blank line to fill in)", in both dictionaries. |
| p7 | n1 | Open menu rides the sticky bar on scroll | **Fixed** (mutation 3 caught). When the menu holds focus, closing it drops focus to `<body>` (minor 2). |

I reviewed every WP-20 row in `backlog.md` again and accept each reason as written, including the new pass 7 row.

## Findings

### minor: hiding the AI notice passes every gate
File: scripts/dist/check-trust.ts:112-141 (`trustProblems`); tests/e2e/pages.spec.ts:54-61
Acceptance item: M2.3 ("Every content page shows the AI notice near the top … The build must fail if a guide, template, checklist or business-type page renders without one"); ADR 0006
What is wrong:
- `dist:trust` checks that the notice's markup and sentence are in the article header. It does not check that the notice is displayed.
- The per-document e2e loop checks `toHaveClass(/st-ai-notice/)` and the link's `href`. Unlike the sources section two lines later (`toBeVisible()`), it never asserts that the notice is visible.
- Mutation 6 hid the notice on all 96 pages with one CSS rule, as a stray print or utility rule could. Then `pnpm build` passed, the 77 D5 tests passed, and chromium+nojs passed (349).
- An empty `<li class="st-source"></li>` likewise satisfies "lists sources".
- Today's output is correct: the notice shows on every page I opened, in every mode. So this is a missing check, not wrong behaviour, which makes it minor. That matches how passes 2 and 4 rated the earlier D5 guard gaps.
How to reproduce: Add `:global(.st-ai-notice) { display: none; }` to the `<style>` in `src/components/trust/AiNotice.astro`. Run `pnpm build`, then `playwright test --project chromium --project nojs`. Everything passes.
Suggested fix: In the per-document loop, add `await expect(first).toBeVisible()` and assert that each `.st-source` has non-empty text. These tests already open every document page in both locales, so this costs nothing.

### minor: when scrolling closes a menu that holds focus, focus drops to the page body
File: src/scripts/navigation.ts:142-149 (the `scroll` listener in `enhanceTopbarMenus`)
Acceptance item: M1.3 (header menus); design system "focus is never lost"; WCAG 2.4.3
What is wrong:
- The new scroll close sets `menu.open = false` whatever has focus.
- A keyboard user who opens Read, tabs to a link, and then presses ArrowDown, PageDown or Space (Space on a link scrolls in Chromium) scrolls the page more than 48px. The menu closes under the focused link, and `document.activeElement` becomes `<body>`.
- The Escape path returns focus to the summary; this path does not. A screen reader announces nothing about where focus went.
- In Chromium the next Tab still lands on "Tools", because the sequential focus starting point is kept, so the reader can recover. That makes it minor.
How to reproduce: At 1280×800 on `/core/register/`, focus the Read summary and press Enter, Tab, then ArrowDown four times. `document.activeElement` is `BODY`, `scrollY` is 160, and both menus are closed.
Suggested fix: When the open menu contains `document.activeElement`, either do not close it on scroll (it is in use), or move focus to its summary as Escape does. Add that step to the existing e2e test.

### minor: the new all-caps rule in the language check hides English template titles marked as Afrikaans
File: scripts/dist/check-trust.ts:242-243 (`LANGUAGE_NEUTRAL`, branch `[\p{Lu}\d][\p{Lu}\d /&.-]*`)
Acceptance item: M2.4 / B5 (language of parts); pass 7 minor 3 fix
What is wrong:
- The branch meant for codes such as VAT201, SARS and EMP201 accepts any upper-case text with spaces. That covers "QUOTATION", "TAX INVOICE", "PRIVACY NOTICE", "INVOICE", "RECEIPT", "TOTAL" and "WHAT IS NOT INCLUDED" in one direction, and Afrikaans "TOTAAL" in the other.
- The five template pages' `<h1>`s are exactly such text, and each carries its own `lang="en-ZA"` on the Afrikaans page.
- I removed that `lang` from each Afrikaans template's `<h1>` and ran `langProblems` against the English twin: no problems on all five. The same edit on a guide is caught ("English text marked as Afrikaans: "Register: what you actually need"").
- Today's output is correct, so this is a guard gap, which makes it minor. It was introduced by the pass 7 fix.
How to reproduce: Run `pnpm exec tsx` on a script that reads `dist/af/templates/quotation/index.html`, replaces `'<h1 lang="en-ZA"'` with `'<h1'`, and calls `langProblems(mutated, readFileSync('dist/templates/quotation/index.html','utf8'))`. It returns `[]`.
Suggested fix:
- Limit the code branch to a single token with no spaces that contains a digit or is at most five letters (`^[\p{Lu}\d][\p{Lu}\d&./-]{1,}$`, plus a length or digit condition). Or keep an explicit list of the codes the corpus uses.
- Add a unit case for "TAX INVOICE" marked as Afrikaans.

### nit: docs lag the pass 7 behaviour
File: docs/design-system.md:272-275; docs/reviews/merge-checklist.md:77,81
What is wrong:
- `design-system.md` still says Escape plus "a click or focus outside" close the menus. It does not mention the document-level Escape or the scroll close (`testing.md` does).
- `merge-checklist.md` still says "Six review passes … 2–6" and "passes 2–6" for the WebKit note.
Suggested fix: Update both lines.

## Verdict

**Clean: 0 blocker, 0 major, 3 minor, 1 nit.**

- The pass 7 blocker is fixed, and its new e2e step reproduces the crash against the old code.
- Every pass 7 minor and the nit are fixed. Five of the six mutations go red; the one that survives is the new minor 1.
- Under the protocol this is the first clean pass after pass 7's blocker reset the count. A second consecutive clean whole-diff pass is still needed before merge.
- WebKit was not run because it is not available in this environment. It remains on `merge-checklist.md`.
