# WP-20 review pass 6 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2026-10-02
- **Commit reviewed:** `05792ec` ("fix(components): resolve the wp-20 review pass 5 minors"). This is the tip of `claude/lucid-bell-t5acdn`. I checked it out detached in a clean worktree.
- **Scope:** `git diff b010d5b...05792ec`: 26 commits, 82 files, +9730 / -114. That includes the pass 5 fix commit, which I verify below under the 17 September amendment.
- **Gate results.** I re-ran all of these myself.
  - `pnpm install --frozen-lockfile`: OK.
  - `pnpm gate:fast`: exit 0.
    - Lint, Prettier and stylelint: clean.
    - `astro check`: 176 files, 0 errors, 0 warnings, 0 hints.
    - vitest unit+dom: 30 files, **936 passed (936)**.
    - Content drift: none.
    - vitest content: **32 passed (32)**.
  - `pnpm build`: exit 0, 96 pages.
    - `dist:audit`: 96 HTML files, 13351 URLs checked under `/business-toolkit/`, no problems.
    - `dist:trust`: "72 document page(s), each with its AI notice and sources."
  - Playwright `chromium`, `mobile` and `nojs` in one process (`PW_PORT=4920`): 595 tests, **511 passed, 84 skipped, 0 failed**.
    - chromium: 247 passed.
    - mobile: 163 passed, 84 skipped. There are two more skips than in pass 5 because the two new pass 5 tests are chromium-only.
    - nojs: 101 passed.
  - `pnpm test:a11y`: **192 passed** (96 routes × light and dark).
  - **WebKit: not run.** It is not available in this environment.
  - Every Playwright run used the existing shim read-only (`PLAYWRIGHT_BROWSERS_PATH=<scratchpad>/pw`). I did not run `playwright install` and I changed nothing under `/opt`.
- **My own checks.** I ran Playwright scripts against `astro preview` on port 4931.
  - **Accessible names and roles.** I took accessibility snapshots of `/`, `/af/`, `/core/register/`, `/af/core/register/` and `/checklist/` at 375 and 1280px. There are 0 unnamed interactive elements. Landmarks, the theme radio group, the drawer dialog name, the breadcrumb, pager and footer navigation names, and the sources region name are all in the page language. The English titles inside them carry `en-ZA`.
  - **Keyboard, end to end.** Pages: home and `/af/core/register/` at 375px; `/checklist/`, `/templates/invoice/` and `/af/search/` at 1280px; `/af/glossary/` at 375px.
    - The skip link is the first stop on every page and moves focus into `main`.
    - Every focus stop has an outline. The card links show focus on the card, as WP-11 designed.
    - The drawer opens with focus inside it, and Escape returns focus to Menu.
    - The desktop Read and Tools menus fail. See major 1.
  - **Print** (`emulateMedia('print')`, plus a PDF read as page images). Pages: `/core/register/`, `/checklist/`, `/af/checklist/`, `/business-types/food/` and home, each with and without JavaScript.
    - The header, footer, navigation, buttons and skip link are hidden.
    - The AI notice and "Sources for this page" print.
    - External links print their URL.
    - Checkboxes print as empty boxes.
    - Table headers repeat across pages.
    - The table of contents summary prints with nothing under it. See nit 2.
  - **Dark theme and forced colours.** Pages: `/af/core/register/` dark at 375 and 1280px; `/core/register/` and `/af/` in forced colours; `/af/checklist/` dark at 320px without JavaScript; `/af/templates/invoice/` dark at 375px. I looked at all of them and found nothing wrong. No page scrolls sideways.
  - **Long Afrikaans strings.** I looked at the drawer at 320px on `/af/checklist/` and the AF hub at 320px. Text wraps, and the document is 320px wide.
  - **Language of parts.** I swept every `dist/af/**` page against its English twin. The only English text marked as Afrikaans is the wordmark "SA Business Toolkit", which is a name and is identical in `af.json`.
  - **Facts outside the markdown.**
    - The about page's licence sentence matches `00-start-here.md` "Licence".
    - The home "Four things" record period ("five years") matches `03-tax-and-sars.md:184`, and the line links its `#records` anchor.
    - The home figures are guarded, as pass 5 confirmed.
  - **Every link in the header, footer, pager and contents.** `dist:audit` resolved all 13351 URLs and fragments.
  - **D5 guard coverage.** `dist:trust` compares its page count with the manifest (36 documents × 2 locales). A layout that drops `data-kind` therefore fails the build; it cannot quietly check zero pages.
- **Mutation tests.** Each was reverted with `git checkout -- <file>`. I then rebuilt `dist/` from the clean tree, and `git status` is clean.

  | # | Mutation | Guard | Result |
  |---|---|---|---|
  | 1 (pass 5 guard) | `Doc.astro:153` `hasPageSources={!hasOwnSources(...)}` | `dist:trust` | **Caught.** The build fails on all 72 pages: 60 "points at the register although the page lists its own sources" and 12 "says 'the sources below' but the page lists none". |
  | 2 (pass 5 guard) | Breadcrumb `min-block-size: var(--st-target)` removed | `pages.spec.ts` "stand-alone targets" | **Caught.** `"Core: applies to everyone" 162x23`. |
  | 3 (pass 5 guard) | `TaskListBlock.astro`: `first &&` removed, so every tasklist gets the note | `pages.spec.ts` "ticks are not saved yet" | **Caught.** For example, `/checklist/` has 16 lines and `/business-types/vehicle-dealer/` has 3. |
  | 4 (pass 5 guard) | `search.astro` answer `min-block-size` removed | `pages.spec.ts` "stand-alone targets" | **Caught.** `/search/`: 31 links at 26px. |
  | 5 | `SourcesForPage.astro`: `lang={dataLang}` removed from the entry title (l.100) and the source note (l.128) | everything | **Survives.** Unit 936 passed, chromium+nojs 348 passed. The sweep then finds 132 English text nodes marked `af-ZA`. See minor 2. |

- **File ownership.** The set of files outside this package's paths is the same as in pass 5:

  | File | Owner | Recorded |
  |---|---|---|
  | `.prettierignore` | tooling | Yes (M1 p1 m5) |
  | `src/components/ui/TableScroll.astro` | WP-11 | Yes |
  | `src/components/ui/Card.astro` (`titleLang`) | WP-11 | Yes (p3) |
  | `src/pages/design-system.astro` (one line) | WP-11 | Yes (p2) |
  | `package.json` (`build` runs `dist:trust`) | orchestrator | Yes (p4), and on the merge checklist |
  | `scripts/dist/check-trust.ts` | tooling | Yes (p4) |
  | `src/scripts/{navigation,code-scroll}.ts`, `src/styles/content.css` | new files of this package | Accepted in p2 |
  | `docs/design-system.md` (pass 5 fix: SiteHeader owns the scroll padding) | WP-11 doc | Not in the backlog. It is the doc change pass 5 nit 1 asked for. Accepted. |

  - `src/i18n/index.ts` (one `ParamNames` line) and the small test-harness edits were accepted in pass 5. They have not changed since.

## Earlier findings

| Pass | # | Finding | Status |
|---|---|---|---|
| M1 p1 | B1 | "Read the English version" link marked `lang="en"` | Fixed. |
| M1 p1 | M1 | English text outside `.st-blocks` not marked | Fixed. My sweep is clean apart from the wordmark. Only spot checks guard it, though; see minor 2. |
| M1 p1 | M2 | Pseudo headings render `h4` under `h2` | Fixed. |
| M1 p1 | m1 | Official badge misses `www`/slash variants | Fixed. |
| M1 p1 | m2 | Stale fragment in the switcher | Fixed. |
| M1 p1 | m3 | Unnamed `<pre>` tab stops | Fixed. |
| M1 p1 | m4 | English-only text on the AF reference page | Fixed. |
| M1 p1 | m5 | Ownership: `TableScroll`, `.prettierignore` | Recorded in the backlog. Accepted. |
| M1 p1 | n1, n2 | Comments point at missing tests; missing link targets degrade silently | Fixed. |
| M1 p1 | n3 | `.js` set but module blocked | Recorded in the backlog. Accepted. |
| p2 | M1 | English titles on AF cards, contents, pager | Fixed. The e2e tests are green. |
| p2 | M2 | Home 0% band unsupported | Fixed (removed). |
| p2 | M3 | Contradictory hreflang/canonical | Fixed. The head-vs-sitemap test is green. |
| p2 | m1 | Search query lost | Message fixed. Echoing the query is deferred to WP-33. Accepted. |
| p2 | m2, m3 | `/` hint; wizard links | Fixed. |
| p2 | m4 | Removing D5 pieces does not fail the build | Fixed (`dist:trust`, with a page count). |
| p2 | m5 | Hub; per-entry anchors on `/sources/` | Hub fixed. Anchors deferred. Accepted. |
| p2 | n1, n2 | 404 suggestion; `design-system.astro` line | Deferred or recorded. Accepted. |
| p3 | B1, B2 | Bar covers anchors below 1024px; switcher name language | Fixed. The anchor e2e tests are green with and without JS. |
| p3 | M1, M2 | Empty sources under "the sources below"; home figures | Fixed. |
| p3 | m1–m5, n1–n3 | Assorted | Fixed, or deferred with reasons I accept (n3). |
| p4 | B1 | Sticky bar from 1024px covers anchors | Fixed. The chromium and nojs anchor tests are green. |
| p4 | M1 | Prompts do not reflow | Fixed. |
| p4 | m1, m2, m4, m5 | Search link; home figure test; ownership; trust lines | Fixed. |
| p4 | m3 | Nothing checks the AI notice's sentence | Fixed by pass 5 m1 (below). |
| p4 | n1 | Checklist ticks lost with no notice | Fixed by pass 5 m2 (below), with a language regression (minor 1). |
| p5 | m1 | Notice sentence guard accepts the wrong variant | **Fixed.** `dist:trust` derives the expected sentence from what the page shows. Mutation 1 now fails all 72 pages, and unit tests cover both directions of the sources choice. One direction of the person check still leaks; see nit 1. |
| p5 | m2 | `CHECKLIST_SAVES` not honoured on 12 document pages | **Fixed in substance.** All 26 pages with checkboxes say it exactly once, guarded by an e2e test (mutation 3 caught). The line now renders in the content language, so all 13 Afrikaans pages, including `/af/checklist/`, which pass 5 saw in Afrikaans, now say it in English. See minor 1. |
| p5 | m3 | Breadcrumb and common-question links below 44px | **Fixed.** The new e2e test measures `/core/register/`, `/af/business-types/food/`, `/search/` and `/contents/` at 375px. Mutations 2 and 4 are caught. |
| p5 | n1 | SiteHeader comment credits `base.css` | **Fixed.** The comment is corrected, and `docs/design-system.md` now says SiteHeader owns the scroll padding. |

I reviewed every WP-20 row in `backlog.md` again and accept each reason as written.

## Findings

### major: the desktop Read and Tools menus cannot be dismissed, and while the bar is sticky an open menu stays pinned over the article
File: src/components/navigation/NavMenu.astro (the `@media (width >= 1024px)` absolute `.st-menu__list`); src/components/navigation/SiteHeader.astro (sticky bar from 1024px); src/scripts/navigation.ts (no menu behaviour)
Acceptance item: M1.3 (header with the Read and Tools menus); B5 ("native `<dialog>` for search/drawer (no traps, Esc everywhere)", "keyboard-only on home …"); B2 (top bar menus)
What is wrong:
- From 1024px the menus are native `<details>` whose list floats over the page (`position: absolute`, `z-index: var(--st-z-sticky)`).
- Nothing closes an open menu except activating its summary again:
  - Escape does nothing.
  - A click elsewhere on the page does nothing.
  - Opening the other menu does nothing either, so both lists stay open and the Tools list covers half of the Read links.
- With JavaScript the bar is sticky, so an open list moves with the bar. Scrolled 2500px down `/core/register/`, the Read list (256×307px at x 540, y 57) still covers the article heading "Which one should you choose" and the list below it.
- On the home page, after a keyboard user opens Read and tabs on, the next stops in the hero are under the open list. The trust line and its "How this was made" link are hidden at the point the reader is told to check how the guide was made.
- The only e2e test for these menus (`content.spec.ts` "a native details menu opens and closes with the keyboard alone") toggles the summary twice, so it cannot see any of this.
- Without JavaScript the bar is static, so the list scrolls away with the page. Escape still does nothing there, but a no-JS page cannot be expected to add that.
How to reproduce:
1. Run `pnpm build`, then `astro preview`. Open `/business-toolkit/core/register/` at 1280×800 with JavaScript on.
2. Click "Read", or Tab to it and press Enter.
3. Press Escape, then click in the article. `document.querySelector('.st-topbar__menus .st-menu').open` is still `true`.
4. Scroll down. The list stays over the article text.
5. Click "Tools" too. Both are `open`, and the lists overlap (see `/af/core/tax-and-sars/` at 1280px).
Suggested fix:
- Give both top-bar `<details>` the same `name` attribute. Native exclusive accordions need no script, and opening one then closes the other.
- In `navigation.ts`, add a small enhancement:
  - Escape inside an open top-bar menu closes it and returns focus to its `<summary>`.
  - A `pointerdown` outside the menu, or focus leaving it (`focusout` with `relatedTarget` outside), closes it.
- Extend the e2e test to cover Escape (closed, focus on the summary), an outside click, and opening Tools closing Read.

### minor: the "ticks are not saved yet" line is now English on every Afrikaans page
File: src/components/content/TaskListBlock.astro:28-34 (`t = useTranslations(context.contentLang)`)
Acceptance item: CLAUDE.md "Every UI string lives in en.json and af.json"; pass 5 minor 2
What is wrong:
- The pass 5 fix moved the line from `Doc.astro`, which used the page locale, into `TaskListBlock`, which uses the content language.
- On the 13 Afrikaans checklist pages every document is an English fallback, so the reader now sees "Ticks on this page are not saved yet. Print the list to keep track." Before, `/af/checklist/` said "Merkies op hierdie bladsy word nog nie gestoor nie…".
- The line is a statement about the site, not part of the document's text, and the `af.json` string goes unused.
- It is correctly inside `lang="en-ZA"`, so the markup does not lie, but an Afrikaans reader loses the warning in their own language.
- The new e2e test only counts the lines, so it cannot see the language.
How to reproduce: `pnpm build`, then:
- `grep -c 'Merkies op hierdie bladsy' dist/af/checklist/index.html` prints 0.
- `grep -o 'st-tasklist__not-saved">[^<]*' dist/af/checklist/index.html` prints the English sentence.
Suggested fix:
- Render this line with `useTranslations(context.locale)`. On a fallback page, mark it with the page language (`lang="af-ZA"`), because it sits inside the English block container.
- In the e2e test, assert that each `/af/` page contains `af.json`'s `checklist.notSaved`.

### minor: no guard covers the language-of-parts rule in the sources section, or anywhere outside a few spot-checked elements
File: src/components/trust/SourcesForPage.astro:100-163; tests/e2e/pages.spec.ts:300-346 (spot checks only)
Acceptance item: M2.4 ("`lang="en"` on the content"); B5 ("`lang="en"` on fallback blocks"); the reason pass 1 major 2 was a major
What is wrong:
- Mutation 5 removed `lang={dataLang}` from the source entry titles and the source note. That leaves 132 English text nodes on Afrikaans pages marked `af-ZA`.
- Unit (936), chromium and nojs (348), `dist:audit` and `dist:trust` all stayed green. axe does not judge the language of text.
- Today's output is correct (my sweep is clean apart from the wordmark), but the rule that two earlier majors were about is guarded only on the blocks container, the H1, the pager, a card title and the contents list.
How to reproduce:
1. Delete `lang={dataLang}` on lines 100 and 128 of `SourcesForPage.astro`.
2. Run `pnpm build && pnpm test && playwright test --project=chromium --project=nojs`. Everything passes.
3. `grep -o '<span>SARS — What is the new threshold[^<]*' dist/af/core/register/index.html` matches, with no `lang` on it or any ancestor below `<html lang="af-ZA">`.
Suggested fix: Add a `dist/` check, in `dist:trust` or an e2e test that reads `dist/`:
- For every `/af/` page, find text nodes whose nearest `lang` is `af*` and whose text also appears as a text node in the English twin.
- Allowlist the site name.
- Fail on anything else.

### nit: the person check in `dist:trust` holds in one direction only
File: scripts/dist/check-trust.ts (`sentencePattern`)
What is wrong:
- `{date}` becomes an unanchored lazy `.+?`. It can stretch across sentence ends: "13 September 2026. No person has checked it yet".
- So the AI sentence also matches the human-checked pattern. A page whose status says "Checked by Jane Doe" while its body says "No person has checked it yet" passes.
- The reverse case is caught, and so is the sources choice.
- No page is human-checked today, so nothing ships wrong.
How to reproduce: Call `trustProblems()` with a header whose body is the `trust.aiNotice.body` sentence and whose status is `<span>Checked by Jane Doe</span>`, over a list of sources. It returns `[]`.
Suggested fix: Use `[^.]+?` for `{date}` and `{reviewer}`, or anchor the pattern to the full notice paragraph. Add the inverse case to `tests/unit/check-trust.test.ts`.

### nit: the table of contents summary prints with nothing under it
File: src/components/navigation/TableOfContents.astro (`variant="details"`); src/styles/print.css
What is wrong:
- `print.css` hides every `nav`, including the list inside the TOC `<details>`, but the `<details>` and its summary still print.
- Every printed document has a bold "On this page (13 sections)" line with nothing under it. On `/checklist/` it sits right above "Print this. Tick as you go."
- Related: the printed checklist now also carries "Ticks on this page are not saved yet. Print the list to keep track." on paper.
How to reproduce: `emulateMedia({ media: 'print' })` on `/checklist/`, or print to PDF. Page 1 shows "On this page (6 sections)" alone.
Suggested fix: Add `class="st-no-print"` to the TOC `<details>`, and to the not-saved line.

## Verdict

**Not clean: 0 blocker, 1 major, 2 minor, 2 nit.**

- The pass 5 fixes are verified: all four guards added after pass 5 go red under mutation.
- One of those fixes introduced minor 1.
- Major 1 is new. Earlier passes did not exercise dismissing the desktop menus. Under the protocol it resets the two-pass count, so this is not the second consecutive clean pass.
- WebKit was not run because it is not available in this environment.
