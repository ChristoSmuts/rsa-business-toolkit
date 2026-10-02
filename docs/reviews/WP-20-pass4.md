# WP-20 review pass 4 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2026-10-02
- **Commit reviewed:** `5938f5b` ("fix(components): resolve wp-20 review pass 3"), the tip of `claude/lucid-bell-t5acdn` and `origin/claude/lucid-bell-t5acdn`. I checked it out detached in a clean worktree.
- **Scope:** `git diff b010d5b...5938f5b`, 80 files, +8905 / -105. This covers M1, every fix commit and M2.
- **Gate results.** I re-ran all of these myself.
  - `pnpm install --frozen-lockfile`: OK.
  - `pnpm gate:fast`: exit 0.
    - eslint, prettier and stylelint: clean.
    - `astro check`: 176 files, 0 errors, 0 warnings, 0 hints.
    - vitest unit+dom: 30 files, **930 passed (930)**.
    - Content drift: none.
    - vitest content: **32 passed (32)**.
  - `pnpm build`: exit 0, 96 pages.
    - `dist:audit`: 96 HTML files, 13539 URLs checked under `/business-toolkit/`, no problems.
    - `dist:trust`: "72 document page(s), each with its AI notice and sources."
  - Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4720`): 582 tests, **503 passed, 79 skipped, 0 failed**.
    - chromium: 242 passed.
    - mobile: 163 passed, 79 skipped.
    - nojs: 98 passed.
  - `pnpm test:a11y`: **192 passed** (96 routes × light and dark).
  - WebKit: **not run**. It is not installed in this environment; `/opt/pw-browsers` holds only chromium 1194.
  - Environment: every Playwright run used the existing shim, `PLAYWRIGHT_BROWSERS_PATH=<scratchpad>/pw`, read-only. I did not run `playwright install` and changed nothing under `/opt`.
- **My own checks**, using happy-dom and Playwright scripts in my scratchpad against `dist/` and a preview on port 4721:
  - **Head and sitemap.** 92 indexable pages and 92 sitemap URLs. Each page has a canonical, an `hreflang` set equal to its sitemap entry, `og:*`, a description and `theme-color`. No noindex page is in the sitemap. 0 issues.
  - **Language of parts, all 47 `/af/` pages compared with their English twins** (text nodes, `aria-label`, `title`, `alt`):
    - No English text inherits `af-ZA`. The only exceptions are the proper name "SA Business Toolkit", the word "Afrikaans" and the figure "R2.3 million".
    - No Afrikaans text sits inside `lang="en-ZA"`.
    - The switcher fix is correct. The visually hidden "Read this page in " / "Lees hierdie bladsy in " is in the page language, `lang` sits only on the language name, and there is no `aria-label`.
  - **Screenshots** at 320, 375 and 1280px of these pages, with no sideways scroll on any of them (`scrollWidth` equals the viewport):
    - `/`, `/core/`, `/business-types/vehicle-dealer/`, `/business-types/`, `/checklist/`, `/templates/` and `/templates/invoice/`;
    - `/search/`, `/contents/`, `/about/`, `/glossary/`, `/sources/` and `/404.html`;
    - the Afrikaans pages `/af/`, `/af/core/`, `/af/business-types/` and `/af/business-types/vehicle-dealer/`.

    Looking at them found blocker 1 and major 1.
  - **Top bar height and anchor position** at 1024, 1100, 1180, 1279, 1280 and 1440px, with and without JavaScript, in both locales. See blocker 1.
  - **Keyboard**, at 375px with JavaScript:
    - The tab order is skip link, wordmark, Search, the two language links, Menu, then content.
    - The skip link moves focus to `main#main`.
    - The drawer opens with focus on Close, and Escape closes it with focus back on Menu.
    - Overflowing `<pre>` blocks are named regions with a tab stop.
    - The pager reads as one sentence ("Previous: Already have your name (shortcut)").
  - **Flags.** `WIZARD_AVAILABLE`, `SEARCH_AVAILABLE` and `TEMPLATES_FILLABLE` are honoured in source and in `dist/`. No built page outside `/design-system/` contains "Find my path", "My path", "your answers" outside the markdown, a fill-in description, or a search form. See minor 2 for the Search link that remains.
  - **Home "Four things".** Each rule links to a section that states it: `#business-bank-account`; `#provisional-tax`, which has the nil-IRP6 paragraph; `#the-general-rule`; and `#records` ("five years").
- **Mutation tests.** I reverted each one with `git checkout -- <file>`, rebuilt `dist/` at the end, and `git status` is clean.
  1. The voluntary VAT card's `from` changed from `2026-04-01` to `2026-03-02`: `home.test.ts` **stays green (6/6)**. See minor 3.
  2. The AI notice's body sentence ("Written by AI … Not legal, tax or financial advice.") deleted from `AiNotice.astro`:
     - `pnpm build`, including `dist:trust`, **stays green**;
     - the 72-page per-document D5 e2e loop **stays green**;
     - only `content.spec.ts` "the AI notice states who checked…" goes red, and it runs on the design-system demo page.

     See minor 4.
  3. The top bar made `position: sticky` again below 1024px: the new anchor test goes red at 320 and 375px (chromium). Caught.
  4. `lang={option.hreflang}` put back on the switcher `<a>`: "the language switcher names each language in its own language…" goes red in chromium and mobile. Caught.
  5. `SourcesForPage` resolves no register entries: `pnpm build` fails with "business-types/pick-your-business-type lists 5 source(s) but the en register resolves 1". Caught.
- **File ownership.** These changed files fall outside `src/components/{content,trust,navigation,pages}`, `src/layouts`, `src/lib`, `src/i18n`, `src/pages`, `tests` and `docs`:

  | File | Owner (D1) | Recorded |
  |---|---|---|
  | `.prettierignore` | tooling | Yes (`backlog.md`, M1 p1 m5) |
  | `src/components/ui/TableScroll.astro` | WP-11 | Yes |
  | `src/components/ui/Card.astro` (`titleLang`) | WP-11 | Yes (pass 3) |
  | `src/pages/design-system.astro` (one line) | WP-11 | Yes |
  | `src/styles/content.css`, `src/scripts/{navigation,code-scroll}.ts` | new files of this package | Accepted in pass 2 |
  | `src/styles/base.css` (`scroll-padding` media rule, `5938f5b`) | WP-11 (`src/styles/**`) | **No.** See minor 5. |
  | `package.json` (`build` gains `dist:trust`, new `dist:trust` script) | shared, orchestrator | **No.** See minor 5. |
  | `scripts/dist/check-trust.ts` (new) | scaffold/tooling (`scripts/**`) | **No.** See minor 5. |

## Earlier findings

| Pass | # | Finding | Status |
|---|---|---|---|
| M1 p1 | B1 | "Read the English version" link marked `lang="en"` | Fixed. `hreflang` only. |
| M1 p1 | M1 | English text outside `.st-blocks` not marked | Fixed. My sweep finds no unmarked English text. |
| M1 p1 | M2 | Pseudo headings render `h4` under `h2` | Fixed. |
| M1 p1 | m1 | Official badge misses `www` and trailing-slash variants | Fixed. |
| M1 p1 | m2 | Stale fragment in the switcher | Fixed. |
| M1 p1 | m3 | Unnamed `<pre>` tab stops | Fixed (named region; `st-code-scroll` drops the stop when nothing overflows). |
| M1 p1 | m4 | English-only text on the AF reference page | Fixed. |
| M1 p1 | m5 | Ownership: `TableScroll.astro`, `.prettierignore` | Recorded in `backlog.md`. Accepted. |
| M1 p1 | n1 | Comments point at missing test files | Fixed. |
| M1 p1 | n2 | Missing link targets degrade silently | Fixed for the AI notice. |
| M1 p1 | n3 | `.js` set but module blocked leaves a dead Menu button | Recorded in `backlog.md`. Accepted. |
| p2 | M1 | English titles on AF cards, contents and pager | Fixed. |
| p2 | M2 | Home 0% band not supported by its source | Fixed (band removed). |
| p2 | M3 | Contradictory `hreflang`/canonical on AF fallback pages | Fixed. My cross-check finds 0 mismatches. |
| p2 | m1 | Search "could not load"; query lost | Message fixed. Echoing `q` deferred to WP-33. Accepted. |
| p2 | m2 | `/` hint for a shortcut that does nothing | Fixed. |
| p2 | m3 | Wizard links and "your answers" | Fixed behind `WIZARD_AVAILABLE`. |
| p2 | m4 | Removing D5 pieces from `Doc.astro` does not fail the build | Fixed for removal of the sections. See minor 4 for the notice body. |
| p2 | m5 | Hub not per B6; no per-entry anchors on `/sources/` | Hub fixed. Anchors deferred in the backlog. Accepted. |
| p2 | n1 | 404 has no closest-route suggestion | Deferred to WP-33. Accepted. |
| p2 | n2 | One line of `design-system.astro` | Recorded. Accepted. |
| p3 | B1 | Top bar covers anchor targets below 1024px | **Partly fixed.** Below 1024px the bar is now static and the theme control is hidden, verified at 320 and 375px. The same defect remains from 1024px up to about 1180px, and from 1024px up to at least 1440px without JavaScript. See blocker 1. |
| p3 | B2 | Language switcher name read in the wrong language | Fixed. Verified in `dist/`, and caught by mutation 4. |
| p3 | M1 | "Sources for this page" can render empty under "the sources below" | Fixed. `SourcesForPage` throws (mutation 5). `dist:trust` checks the status, the how-made link, a `.st-source` or a note with a register link, and the page count. The notice's body sentence is still unchecked; see minor 4. |
| p3 | M2 | Home figures not supported by their source | Fixed for "Not R50,000", which is gone. The test now requires the date in the cited entry. That check is a substring test; see minor 3. |
| p3 | m1 | Pager text broken | Fixed. |
| p3 | m2 | Templates describe fill-in | Fixed behind `TEMPLATES_FILLABLE`. |
| p3 | m3 | Home primary action goes to a search that cannot search | Fixed. The hero is now "Read Core: start here" and "Browse all pages", and there are no search forms. The header link remains; see minor 2. |
| p3 | m4 | `Card.astro` ownership not recorded | Recorded, and `docs/design-system.md` lists `titleLang`. |
| p3 | m5 | "Four things" unsourced | Fixed. Each item links to the section that states it on a page with sources. |
| p3 | n1 | Stale `docLocales` comment | Fixed. |
| p3 | n2 | "Official source" twice on home cards | Fixed. The badge is gone from the link name, and hidden text names the figure. |
| p3 | n3 | AF fallback description in English under `af_ZA` | Deferred in the backlog. Accepted: it resolves per page as translations land. |

## Findings

### blocker: from 1024px the sticky top bar still wraps and covers anchor targets (with JavaScript up to about 1180px, without JavaScript at every width I measured)
File: src/components/navigation/SiteHeader.astro (`@media (width < 1024px)` is the only rule that hides the theme control or unsticks the bar); src/styles/base.css (`scroll-padding-top` 72px from 1024px); tests/e2e/pages.spec.ts:160-162 (only 320, 375 and 1280px, JavaScript only)
Acceptance item: M1.3 header; B2 "Top bar (sticky, 56px)"; B3 flow 7 (lands on the same heading); B5 focus management and anchor targets. This is pass 3 blocker 1, fixed only below 1024px.
What is wrong: From 1024px the bar is sticky and the full theme control (System / Light / Dark) is in it.
- **With JavaScript**, the controls do not fit on one row at 1024px in either language, or at 1100px in Afrikaans. The theme control wraps to a second row and the bar is **123px** tall, while the scroll padding is 72px.
  - At 1024×800, after following `#how-to-register-a-company-yourself` on `/core/register/` or `/af/core/register/`, the heading sits at 72–111px and the bar ends at 123px. The heading is completely hidden; the screenshot shows body text directly under the theme row.
- **Without JavaScript**, the theme control is replaced by the hint "The theme follows your device setting. Saving a choice needs JavaScript.", which takes a second row.
  - The bar is **93px** at every width from 1024 to 1280px in both languages, and still 93px at 1440px in Afrikaans.
  - The heading top sits at 72px, so its upper half (21 of 39px) is under the bar.
- **Focus** scrolled into view can be hidden the same way.
- **The tests miss it.** The new e2e test only measures 320, 375 and 1280px with JavaScript. At 1280px the bar is 71px against 72px of padding: 1px of margin.

1024px is a common tablet landscape width.

How to reproduce:
1. `pnpm build`, then `astro preview`.
2. At 1024×800, open `/business-toolkit/core/register/` and set `location.hash = '#how-to-register-a-company-yourself'`. `document.querySelector('.st-topbar').getBoundingClientRect().bottom` is 123, and the heading's `top` is 72.
3. Repeat with JavaScript disabled: the bar's bottom is 93.

Suggested fix:
- Keep the bar to one row whenever it is sticky. For example, move the theme control (and the no-JS hint) out of the bar below 1280px, or make the bar static whenever it can wrap.
- Or derive `scroll-padding-top` from the bar's real height: a custom property set by `ResizeObserver`, with a no-JS fallback that is static.
- Extend the anchor test to 1024px and 1100px, to both locales, and to the `nojs` project.

### major: AI prompts do not reflow: every prompt on a phone needs sideways scrolling on each line
File: src/components/content/CodeBlock.astro:14-20 and the `pre` rules in `src/styles/content.css`
Acceptance item: B5 "rem units and reflow at 320px (only table regions scroll)"; WCAG 1.4.10 Reflow; B3 flow 6 (copy a prompt)
What is wrong: Every fenced block keeps `white-space: pre`, including the 36 `prompt` blocks, which are plain English prose for the reader to read and edit.
- On `/branding/branding-prompts/` at 320px, all 16 prompts overflow, up to 2.3× the visible width.
- Each line is cut at the right edge ("Who buys it (age, income, wher…"), so reading one prompt means scrolling sideways line by line.
- The 3 `snippet` blocks on that page do the same.

The file comment justifies `pre` by template previews, which are layouts. That reasoning does not cover prose prompts. B5 allows only table regions to scroll. The 320px reflow tests pass because the overflow is inside a scrolling region, not on the page.

How to reproduce: `astro preview`. At 320×740, open `/business-toolkit/branding/branding-prompts/`. For each `figure.st-code[data-variant="prompt"] pre`, `scrollWidth / clientWidth` is between 1.x and 2.3.

Suggested fix:
- Use `white-space: pre-wrap; overflow-wrap: anywhere` for the `prompt` (and probably `snippet` and `example`) variants. Keep `pre` only for `template-preview` and `listing`, if those really are layouts.
- Add an e2e assertion that no prompt `pre` overflows at 320px.

### minor: the header and the drawer still offer "Search" on every page, and it leads to a page that says search is not ready
File: src/components/navigation/SiteHeader.astro:58-61; src/components/navigation/NavDrawer.astro (search link); src/lib/routes.ts (`SEARCH_AVAILABLE`)
Acceptance item: review brief (nothing describing or linking to an unbuilt feature); flags honoured everywhere
What is wrong: With `SEARCH_AVAILABLE` false:
- the top bar on all 94 pages that have one shows a magnifier button labelled "Search" / "Soek";
- the drawer repeats it;
- both lead to `/search/`, whose first content is "Full search is not ready yet".

The flag removed the forms and the hero action but left the most prominent entry point. That is the same class as the wizard links fixed in pass 2.

How to reproduce: `grep -l 'st-topbar__search' -r dist --include=*.html | wc -l` gives 94.

Suggested fix: Behind `SEARCH_AVAILABLE`, either drop the search link from the bar and the drawer, or relabel it to what the page is now (for example "Common questions"). Optionally keep `/search/` as an unlinked shell.

### minor: the home figure test checks substrings, not that the source supports this figure's date
File: tests/unit/site/home.test.ts ("state only figures and dates their own source supports")
Acceptance item: D5 "Nothing implies more certainty than the source"; pass 3 major 2
What is wrong: The test only asserts that `formatDate('en', from)` occurs somewhere in the cited entry's `supports` text. `sars--budget-2026-frequently-asked-questions` also contains "from 2 March 2026", which is the date of the late-payment interest rate. With the voluntary VAT card's `from` set to `2026-03-02` (mutation 1), the test stays green, and the card would print "From 2 March 2026" under SARS's link. Amounts have the same weakness: "R2.3 million" appears in that entry for both VAT and turnover tax.

How to reproduce: Set the second `from` in `src/lib/home.ts` to `'2026-03-02'` and run `pnpm exec vitest run tests/unit/site/home.test.ts`: 6 passed.

Suggested fix: Assert the figure and its date as one phrase taken from the supports text, for example `R120,000 voluntary from 1 April 2026`. Or store the exact supporting clause next to each `HomeNumber` and assert that clause, so the test binds the figure to its claim.

### minor: neither `dist:trust` nor the per-document e2e loop checks the AI notice's sentence
File: scripts/dist/check-trust.ts (`trustProblems`); tests/e2e/pages.spec.ts:42-70 (the D5 loop)
Acceptance item: M2.3 (the build must fail if a page renders without the notice); D5 ("states that it was generated by AI … says who checked")
What is wrong: `trustProblems` requires the `st-ai-notice` class, `st-ai-notice__status` and the how-made link, but not the notice text. With the body paragraph deleted (mutation 2), the following all stay green:
- `pnpm build`;
- `dist:trust`;
- all 72 per-document e2e tests.

Only one test on the design-system demo page goes red. That test catches a change to the shared component, but not a layout that drops or replaces the sentence on document pages. "Written by AI … No person has checked it yet" is the core of D5, and it is the one part nothing on a real page verifies.

How to reproduce: Delete `<p>{t(notice.bodyKey, …)}</p>` in `src/components/trust/AiNotice.astro`. Then run `pnpm build`, which ends with "dist:trust: 72 document page(s), each with its AI notice and sources". Then run `playwright test --project=chromium tests/e2e/pages.spec.ts`: no failure.

Suggested fix: In `trustProblems`, require the notice to contain one of the `trust.aiNotice.body*` sentences of the page's locale, with `{date}` as a wildcard. In the e2e loop, compare the notice text with `trustNotice(doc.verification, …)`.

### minor: cross-package edits in `5938f5b` and earlier are not recorded
File: src/styles/base.css:128-137; package.json (`build`, `dist:trust`); scripts/dist/check-trust.ts
Acceptance item: Review protocol step 2; D1 (`src/styles/**` is WP-11; `package.json` changes through the orchestrator; `scripts/**` tooling)
What is wrong:
- `base.css` gained a `scroll-padding-block-start` media rule.
- `package.json` changed `build` and added `dist:trust`.
- `scripts/dist/check-trust.ts` is a new tooling script.

None of these is in `backlog.md`'s cross-package entries, unlike the `TableScroll`, `Card` and `design-system.astro` edits. The `base.css` rule is also coupled to a breakpoint that `SiteHeader.astro` owns, which is how blocker 1 slipped through.

How to reproduce: `git diff --name-only b010d5b...5938f5b`; `grep -n 'base.css\|package.json\|check-trust' docs/reviews/backlog.md` finds nothing.

Suggested fix: Record the three edits in `backlog.md`. Consider moving the scroll-padding rule next to the header, or to a token both files read.

### minor: the home page's trust lines overstate what was checked
File: src/i18n/en.json `home.heroVerify`, `home.trust.checked`, `home.trust.sources` (and their `af.json` twins); src/pages/[...locale]/index.astro:39 (`checkedOn` from the register)
Acceptance item: D5 "Nothing implies more certainty than the source"
What is wrong:
- **"An AI checked the facts … on 13 September 2026".** This is said of the whole site. `core/you-are-the-business` was generated and checked on 14 September (35 documents carry 2026-09-13 and one carries 2026-09-14).
- **"Sources listed where facts are stated".** It is not true for `start/start-here` or `start/how-this-was-made`. Both state figures (VAT and turnover-tax thresholds, the 11C repeal) under a source note, as the backlog's WP-10 "m2 residue" entry records.

The backlog defers the content repair to WP-47, but these home-page sentences are WP-20's own strings, and they make the general claim on the most visited page.

How to reproduce: View `dist/index.html`: the hero and the trust strip. Run `node -e` over `src/data/en/docs/*.json` to count `verification.checkedOn` values.

Suggested fix: Use wording that holds: "checked … between 13 and 14 September 2026", or the latest `checkedOn` across the manifest, and "Each page lists its sources or points to the register". Revisit once WP-47 lands.

### nit: the checklist invites ticking that is lost on reload, with no notice
File: src/lib/nav.ts (`nav.toolDescriptions.checklist` "Tick each item when you finish it"); src/pages/[...locale]/index.astro ("If you know what you need … Tick each item when you finish it")
What is wrong: The checkboxes are real, but persistence is WP-30. A reader who ticks items and comes back finds them all cleared, and nothing on the page says the ticks are not saved yet.
Suggested fix: Until WP-30, say "Print it and tick as you go" (the markdown's own wording), or add a short `checklist.notSaved` line behind a flag, the same pattern as the other three.

## Verdict

Not clean: 1 blocker, 1 major, 5 minor, 1 nit. Every earlier finding is fixed or deferred in `backlog.md` with a reason I accept, except pass 3 blocker 1, which is fixed only below 1024px (blocker 1 here). WebKit was not run because it is not installed in this environment.
