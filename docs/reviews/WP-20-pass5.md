# WP-20 review pass 5 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2026-10-02
- **Commit reviewed:** `b03eb3f` ("fix(components): resolve wp-20 review pass 4"). This is the tip of `claude/lucid-bell-t5acdn` and `origin/claude/lucid-bell-t5acdn`. I checked it out detached in a clean worktree.
- **Scope:** `git diff b010d5b...b03eb3f`: 24 commits, 81 files, +9404 / -114.
- **Gate results.** I re-ran all of these myself.
  - `pnpm install --frozen-lockfile`: OK.
  - `pnpm gate:fast`: exit 0.
    - eslint, prettier and stylelint: clean.
    - `astro check`: 176 files, 0 errors, 0 warnings, 0 hints.
    - vitest unit+dom: 30 files, **934 passed (934)**.
    - Content drift: none.
    - vitest content: **32 passed (32)**.
  - `pnpm build`: exit 0, 96 pages.
    - `dist:audit`: 96 HTML files, 13351 URLs checked under `/business-toolkit/`, no problems.
    - `dist:trust`: "72 document page(s), each with its AI notice and sources."
  - Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4820`): 591 tests, **509 passed, 82 skipped, 0 failed**.
    - chromium: 245 passed.
    - mobile: 163 passed, 82 skipped. The skips are chromium-only loops, the `dist/` head checks, and specs that set their own viewport.
    - nojs: 101 passed.
  - `pnpm test:a11y`: **192 passed** (96 routes × light and dark).
    - My first a11y run had 2 failures, both `ENOENT` on trace artefacts. I caused them by running a second Playwright process into the same `test-results/` at the same time. After a clean rebuild, a sole run passed 192/192.
  - WebKit: **not run**. It is not installed in this environment.
  - Environment: every Playwright run used the existing shim, read-only: `PLAYWRIGHT_BROWSERS_PATH=<scratchpad>/pw`. I did not run `playwright install` and I changed nothing under `/opt`.
- **My own checks.** I used Playwright scripts in my scratchpad against `astro preview` on port 4830.
  - **Anchors on a cold load with a fragment.** Widths: every 40px from 320 to 1440, plus 1000, 1023, 1024, 1025, 1100, 1180, 1279 and 1280. Each width with and without JavaScript, on `/core/register/`, `/af/core/register/` and a late heading of `/business-types/vehicle-dealer/`. Result: **0 of 222** samples put the target above the bar's bottom edge.
    - With JavaScript, from 1024px the bar is 71px and `--st-topbar-offset` is 71px. The heading lands at 87px.
    - Without JavaScript, the bar is static at every width.
  - **Zoom 200%.** A 1280px window at 200% zoom gives a 640px CSS viewport, so it falls inside the static-bar range checked above.
  - **Focus under the bar.** I scrolled to the bottom and pressed Shift+Tab through all content on `/core/register/` at 1024px, `/business-types/vehicle-dealer/` at 1280px and `/af/core/tax-and-sars/` at 1100px. That is 225 focus stops: 0 fully hidden and 0 partly hidden under the bar.
  - **Screenshots and reflow.** I took screenshots at 320, 375, 768, 1024 and 1280px, with and without JavaScript, of 14 pages and their Afrikaans twins (270 images). The pages were home, `/core/`, vehicle dealer, the hub, the checklist, `/templates/` and `/templates/invoice/`, branding prompts, search, contents, glossary, sources, about and 404. No page scrolls sideways.
    - Looked at: home at 320px (JS and no JS) and `/af/` at 1024px; vehicle dealer at 320px with JS, 1024px without JS, and `/af/` at 768px; checklist at 375px; search at 1280px; 404 at 375px without JS; a prompt at 320px (it wraps); a template preview at 320px (a scrolling named region); the pager at 320px; the invoice page at 375px.
  - **Language of parts.** Spot checks after the pass 4 changes:
    - The English title on the Afrikaans breadcrumb and sidebar carries `lang="en-ZA"`.
    - The new strings (`checklist.notSaved`, `checklistStatic`, `bodyStatic`, `site.checkedOn`, `home.trust.*`) exist in Afrikaans and render inside `af-ZA`.
  - **Flags.** No built page outside `/design-system/` contains any of these: "Your answers stay", `find-my-path`, `my-path/`, "Fill in and print", `st-topbar__search`, `<kbd>`, or "Tick each item". The only link to `/search/` is the footer's "Common questions".
  - **Head and sitemap.** 92 sitemap URLs and 92 HTML files without `noindex`. The head-versus-sitemap e2e test is green.
  - **JavaScript budget.** The largest non-design-system page loads 4,987 bytes gzipped, including imported chunks. The B3 budget is 25 KB. No built page has an inline `<script>`.
- **Mutation tests.** I reverted each one with `git checkout -- <file>` and rebuilt from clean at the end. `git status` is clean.
  1. `Doc.astro` passes `hasPageSources={!hasOwnSources(doc.sources)}`. This inverts which notice sentence each page gets. `pnpm build` and `dist:trust` **stay green**, Playwright chromium and nojs **stay green (346 passed)**, and unit+dom **stays green (934)**. `/start/start-here/` then says "An AI checked it against the sources below" with 0 `.st-source` entries below. See minor 1.
  2. `trackTopbar()` not called. The chromium anchor test goes red at 1024, 1100 and 1280px. Caught.
  3. The voluntary VAT card's `from` set to `2026-03-02`. `home.test.ts` goes red ("…in one clause"). Caught.
  4. The no-JS `html:not(.js) .st-topbar { position: static }` rule emptied. The nojs anchor test goes red at 1024 and 1280px. Caught.
- **File ownership.** These changed files fall outside `src/components/{content,trust,navigation,pages}`, `src/layouts`, `src/lib`, `src/i18n`, `src/pages`, `tests` and `docs`:

  | File | Owner | Recorded |
  |---|---|---|
  | `.prettierignore` | tooling | Yes (M1 p1 m5) |
  | `src/components/ui/TableScroll.astro` | WP-11 | Yes |
  | `src/components/ui/Card.astro` (`titleLang`) | WP-11 | Yes (p3) |
  | `src/pages/design-system.astro` (one line) | WP-11 | Yes (p2) |
  | `package.json` (`build` runs `dist:trust`) | orchestrator | Yes (p4), and flagged for the merge checklist |
  | `scripts/dist/check-trust.ts` | tooling | Yes (p4) |
  | `src/scripts/{navigation,code-scroll}.ts`, `src/styles/content.css` | new files of this package | Accepted in p2 |

  - `src/styles/base.css` is no longer in the diff, because the pass 4 edit was reverted.
  - WP-12's `src/i18n/index.ts` (one `ParamNames` line) and `tests/unit/{i18n,e2e-harness}.test.ts` changed in small ways that follow from this package. I accept them without a backlog entry.

## Earlier findings

| Pass | # | Finding | Status |
|---|---|---|---|
| M1 p1 | B1 | "Read the English version" link marked `lang="en"` | Fixed. |
| M1 p1 | M1 | English text outside `.st-blocks` not marked | Fixed. Spot checks still hold. |
| M1 p1 | M2 | Pseudo headings render `h4` under `h2` | Fixed. |
| M1 p1 | m1 | Official badge misses `www`/slash variants | Fixed. |
| M1 p1 | m2 | Stale fragment in the switcher | Fixed. |
| M1 p1 | m3 | Unnamed `<pre>` tab stops | Fixed. Prose blocks now carry no region and no tab stop at all. |
| M1 p1 | m4 | English-only text on the AF reference page | Fixed. |
| M1 p1 | m5 | Ownership: `TableScroll`, `.prettierignore` | Recorded in the backlog. Accepted. |
| M1 p1 | n1 | Comments point at missing tests | Fixed. |
| M1 p1 | n2 | Missing link targets degrade silently | Fixed for the AI notice. |
| M1 p1 | n3 | `.js` set but module blocked | Recorded in the backlog. Accepted. |
| p2 | M1 | English titles on AF cards, contents, pager | Fixed. |
| p2 | M2 | Home 0% band unsupported | Fixed (removed). |
| p2 | M3 | Contradictory hreflang/canonical | Fixed. The e2e head-vs-sitemap test is green. |
| p2 | m1 | Search message; query lost | Message fixed. Echoing the query is deferred to WP-33. Accepted. |
| p2 | m2 | `/` hint for a missing shortcut | Fixed. |
| p2 | m3 | Wizard links | Fixed behind `WIZARD_AVAILABLE`. |
| p2 | m4 | Removing D5 pieces does not fail the build | Fixed (`dist:trust`). See minor 1 for the remaining gap. |
| p2 | m5 | Hub; per-entry anchors on `/sources/` | Hub fixed. Anchors deferred. Accepted. |
| p2 | n1 | 404 closest-route suggestion | Deferred to WP-33. Accepted. |
| p2 | n2 | One line of `design-system.astro` | Recorded. Accepted. |
| p3 | B1 | Top bar covers anchors below 1024px | Fixed. |
| p3 | B2 | Switcher name in the wrong language | Fixed. |
| p3 | M1 | Empty sources under "the sources below" | Fixed. `SourcesForPage` throws, and `dist:trust` checks content. |
| p3 | M2 | Home figures unsupported | Fixed. |
| p3 | m1–m5, n1–n3 | Pager, templates wording, hero action, Card ownership, "Four things", comments, duplicate "Official source", AF description | Fixed, or deferred with reasons I accept (n3). |
| p4 | B1 | Sticky bar from 1024px covers anchors (JS and no JS) | **Fixed.** The bar's measured height drives `scroll-padding`. Without JS the bar is never sticky. 0 of 222 cold-load samples are hidden, and 0 of 225 reverse-tab focus stops. Mutations 2 and 4 are caught. |
| p4 | M1 | Prompts do not reflow | **Fixed.** Prompts, snippets and examples use `pre-wrap`, carry no region and no tab stop. Template previews and listings keep a named scrolling region. An e2e test asserts no prompt overflows at 320px. |
| p4 | m1 | Search link in the header and drawer | **Fixed.** It is gone behind `SEARCH_AVAILABLE`. The footer's "Common questions" goes to the page. |
| p4 | m2 | Home figure test checks substrings | **Fixed.** `supportsClause` binds the amount, old amount and date to one clause of the cited entry. Mutation 3 is caught. |
| p4 | m3 | Nothing checks the AI notice's sentence | **Partly fixed.** `dist:trust` now requires one of the `trust.aiNotice.body*` sentences, but it accepts any of them. Mutation 1 survives every guard. See minor 1. |
| p4 | m4 | Unrecorded cross-package edits | **Fixed.** The `base.css` edit was reverted, and `package.json` and `check-trust.ts` are recorded. One comment still refers to the reverted `base.css` rule; see nit 1. |
| p4 | m5 | Home trust lines overstate the check | **Fixed.** The text now reads "most recently on {date}" (the latest `checkedOn`, 14 September) and "Each page lists its sources or points to the sources register". The figure cards keep the register date. |
| p4 | n1 | Checklist ticks lost with no notice | **Partly fixed.** `CHECKLIST_SAVES` covers the nav, the home card and `/checklist/`, but not the 12 other document pages that render checkboxes. See minor 2. |

## Findings

### minor: the notice sentence guard accepts the wrong variant, so a page with no sources can say "the sources below" and every gate stays green
File: scripts/dist/check-trust.ts (`noticeSentences`, `trustProblems`); tests/e2e/pages.spec.ts:38-70 (the D5 loop)
Acceptance item: M2.3 (the build fails when a page renders without its D5 pieces); D5 ("Nothing implies more certainty than the source"). This is the residue of pass 4 minor 4, whose suggested fix included comparing the notice with `trustNotice(doc.verification, …)`.
What is wrong:
- `noticeSentences()` turns all four `trust.aiNotice.body*` sentences into patterns, and `trustProblems` passes a page when any one of them matches. A page with no sources of its own can therefore say "checked it against the sources below" and still pass. So can an AI-checked page that uses the "{reviewer} checked it" sentence, because `{reviewer}` is a wildcard.
- The e2e loop checks only the notice's class and its link.
- Mutation 1 inverted the choice for all 72 document pages:
  - 24 pages (12 documents × 2 locales, the source-note pages) told readers to check "the sources below" when none were there.
  - Build, `dist:trust`, 346 chromium+nojs tests and 934 unit tests all stayed green.
How to reproduce: In `src/layouts/Doc.astro`, change `hasPageSources={hasOwnSources(doc.sources)}` to `hasPageSources={!hasOwnSources(doc.sources)}`. Then:
1. Run `pnpm build`. It exits 0 with "72 document page(s), each with its AI notice and sources".
2. Run `grep -o 'against the sources below' dist/start/start-here/index.html`. It matches, while `grep -c 'class="st-source"'` on the same file gives 0.
3. Run `playwright test --project=chromium --project=nojs`. All pass.
Suggested fix: In `trustProblems`, pick the expected sentence from what the page renders: the `…NoPageSources` variants exactly when the sources section has no `.st-source`, and the `…HumanChecked` variants only when the status badge says human-checked. Alternatively, in the e2e loop, compare the notice text with `t(trustNotice(doc.verification, hasOwnSources(doc.sources)).bodyKey, …)`.

### minor: `CHECKLIST_SAVES` is not honoured on the 12 document pages with inline checklists
File: src/layouts/Doc.astro:172-176 (the `checklist.notSaved` line is inside `doc.kind === 'checklist'`); src/components/content/ (tasklist rendering)
Acceptance item: review brief ("the four flags in `src/lib/routes.ts` honoured everywhere"); pass 4 nit 1
What is wrong:
- Only `/checklist/` and `/af/checklist/` say "Ticks on this page are not saved yet."
- These 12 English pages, and their Afrikaans twins, render working checkboxes with no such line, and every tick is lost on reload:
  - the six business-type pages, which have the inline Part B checklist B6 calls for;
  - `branding/mood-and-materials`;
  - `core/adding-new-lines`, `core/running-a-pty-ltd`, `core/what-you-need-to-sell-things`, `core/working-from-home-and-safety` and `core/you-are-the-business`.

  The flag's own comment says the wording must tell the reader ticks are not saved.
How to reproduce: `pnpm build`, then compare these two outputs:
```
grep -l 'type="checkbox"' -r dist --include=*.html | grep -v design-system
grep -l 'not saved yet' -r dist --include=*.html
```
The first lists 26 pages and the second lists 2.
Suggested fix: Render the `checklist.notSaved` line next to the first tasklist on any page that has one, or in the tasklist component, while `!CHECKLIST_SAVES`.

### minor: breadcrumb links and the common-question links are below the 44px target size
File: src/components/navigation/Breadcrumb.astro (`.st-breadcrumb__item a`); src/pages/[...locale]/search.astro (`.st-search__answer a`)
Acceptance item: B4 ("all ≥44px targets"); B5 ("target size AAA adopted")
What is wrong:
- At 375px, breadcrumb links are 23px tall: "Home" is 39×23 and "Your kind of business" is 137×23. They appear on every non-home page.
- On `/search/` there are 31 standalone answer links ("Register: what you actually need", "Tax and SARS", …), each 20px tall.
- None of these sits inside a sentence, so the inline exception does not apply.
- Card title links (28px) are not a problem, because the whole card is the target through the pseudo-element.
How to reproduce: At 375×800, run `document.querySelectorAll('.st-breadcrumb a, .st-search__answer a')` and read each `getBoundingClientRect().height`.
Suggested fix: Set `min-block-size: var(--st-target)` with `display: inline-flex; align-items: center` on both. Add both to an existing target-size e2e check.

### nit: the SiteHeader comment still credits `base.css` with the scroll padding, and `base.css` keeps a rule that never applies
File: src/components/navigation/SiteHeader.astro:160-163; src/styles/base.css:124
What is wrong: The comment says "`base.css` drops the matching scroll padding at the same breakpoint". That rule was reverted. `base.css:124` still sets `scroll-padding-block-start: calc(var(--st-topbar) + var(--st-space-4))`, and SiteHeader's global `html:root` rule always overrides it. A later edit to `base.css` will look effective and do nothing.
Suggested fix: Correct the comment. Leave `base.css` to WP-11, but note in `docs/design-system.md` that SiteHeader owns the scroll padding.

## Verdict

Clean: 0 blocker, 0 major, 3 minor, 1 nit. This is the first clean pass after pass 4's blocker, so the package needs one more consecutive clean pass. Every earlier finding is fixed or deferred in `backlog.md` with a reason I accept, except two that are partly fixed: pass 4 minor 4 (minor 1 here) and pass 4 nit 1 (minor 2 here). WebKit was not run because it is not installed in this environment.
