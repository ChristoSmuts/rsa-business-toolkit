# WP-20 review pass 2 (milestone 2 and the whole package)

- Reviewer: an independent reviewer agent that did not write this code.
- Date: 2026-10-02
- Commit reviewed: `b202c08` ("feat(pages): build every route in both languages"), checked out detached in a clean worktree. Scope: `git diff b010d5b...b202c08`, 71 files, +7824 / -94. This covers the M1 commits, `0133cc0` (M1 pass 1 fixes) and `b202c08` (M2).
- Gate results. I re-ran all of these myself.
  - `pnpm install --frozen-lockfile`: OK.
  - `pnpm gate:fast`: exit 0.
    - eslint, prettier and stylelint: clean.
    - `astro check`: 173 files, 0 errors, 0 warnings, 0 hints.
    - vitest unit+dom: 29 files, **918 passed (918)**.
    - Content drift: none.
    - vitest content: **32 passed (32)**.
  - `pnpm build`: exit 0, 96 HTML files. `dist:audit` checked 13741 URLs under `/business-toolkit/` and found no problems. It allowed 4 future routes: `find-my-path/`, `my-path/` and their `af/` twins.
  - Playwright `chromium`, `mobile` and `nojs`: 572 tests, **496 passed, 76 skipped, 0 failed**.
    - chromium: 237 passed.
    - mobile: 161 passed, 76 skipped. 72 of the skips are the per-document D5 loop, which runs in chromium only. 2 are head checks that read `dist/`. 2 are the existing mobile skips of the page contract.
    - nojs: 98 passed.
  - `pnpm test:a11y`: **192 passed** (96 routes × light and dark).
  - webkit: **not run**. WebKit is not installed in this environment; `/opt/pw-browsers` holds only `chromium-1194` and `chromium_headless_shell-1194`.
  - Environment: Playwright 1.63 expects chromium build 1243. Every Playwright run above used a symlink shim to the 1194 binaries in my scratchpad (`PLAYWRIGHT_BROWSERS_PATH=<scratchpad>/pw`). I did not run `playwright install`, and I changed nothing under `/opt`.
- My own checks on `dist/`, with happy-dom and Playwright scripts in my scratchpad:
  - Heading order on all 96 pages: no skipped level anywhere, and exactly one `h1` per page.
  - No inline `<script>`, no root-relative URL outside the base, and no duplicate ids on any page.
  - 320px reflow over all 96 routes, with and without JavaScript: 0 pages scroll sideways.
  - JavaScript: all non-design-system chunks together are **4.8 KB gzipped**. That is an upper bound for any page, and the B3 budget for document pages is 25 KB.
- Mutation tests. I reverted each mutation with `git checkout -- <file>`, rebuilt `dist/` afterwards, and `git status` is clean.
  1. `assertDocTrust` accepts any `sourceNote`, even with an empty reason: `pages.test.ts` goes red (1 test).
  2. `headingTag` always returns `h4` for a pseudo heading: `render.test.ts` goes red (3 tests, including the corpus walk).
  3. The home page's turnover-tax 0% band changed from `R600,000` to `R950,000`: `home.test.ts` **stays green (4/4)**. See major 2.
  4. `lang={contentLangTag}` removed from the `<h1>` in `Doc.astro`, then rebuilt: the e2e test "an Afrikaans document page shows English with the fallback notice" goes red.
  5. `<SourcesForPage>` removed from `Doc.astro`: `pnpm build` **stays green** (exit 0, audit clean). `pages.spec.ts` goes red on all 72 per-document D5 tests. See minor 4.
- File ownership. These changed files fall outside `src/components/{content,trust,navigation,pages}`, `src/layouts`, `src/lib`, `src/i18n`, `src/pages/[...locale]`, `src/pages/404.astro`, `tests` and `docs`:
  - `.prettierignore` and `src/components/ui/TableScroll.astro`: both recorded in `backlog.md`.
  - `src/scripts/{navigation,code-scroll}.ts` and `src/styles/content.css`: these are the package's own new files.
  - `src/pages/design-system.astro` (WP-11): a one-line link fix. See the nit.
  - `src/pages/index.astro` was deleted. It was the foundation's placeholder home, and the brief asks for it to be replaced.

## M1 pass 1 findings

| # | Finding | Status |
|---|---|---|
| B1 | "Read the English version" link marked `lang="en"` | Fixed. The link has `hreflang="en-ZA"` and no `lang` (`dist/af/core/register/`). |
| M1 | English text outside `.st-blocks` not marked on fallback pages | Fixed on document pages: the `h1`, lead, terms, TOC, breadcrumb, sidebar (`docTitleLang`) and source text all carry `lang="en-ZA"`, and the chrome inside the blocks is English. The same defect reappears on the new M2 surfaces; see major 1. |
| M2 | Pseudo headings render `h4` under `h2` | Fixed. `headingTags` places them by the last real heading. 0 skips across all 96 built pages, and mutation 2 is caught. |
| m1 | Official badge misses `www` and trailing-slash variants | Fixed. `officialUrlKey` normalises both sides; `https://inforegulator.org.za` now gets its badge. |
| m2 | Stale fragment in the language switcher | Fixed. `#apply` always recomputes and also listens for `popstate`. |
| m3 | Every `<pre>` is an unnamed tab stop | Fixed. The block is `role="region"` with an `aria-label`, and `st-code-scroll` drops the stop when nothing overflows. |
| m4 | English-only text on the AF reference page not marked | Fixed. The demo headings and hints carry `lang="en-ZA"`. |
| m5 | Ownership: `TableScroll.astro` and `.prettierignore` | Recorded in `backlog.md` with a reason. |
| n1 | Comments point at missing test files | Fixed. The paths now name `tests/unit/site/*`, and the comment describes the real `html:not(.js)` mechanism. |
| n2 | Missing link targets degrade silently | Fixed for the AI notice: `AiNotice.astro:42` throws. |
| n3 | `.js` set but module blocked leaves a dead Menu button | Recorded in `backlog.md` with a reason. |

## Checked, no finding

- **Routes.** Every B1 route that the brief puts in scope exists in both locales:
  - home, search, contents, about, templates and its 5 template pages;
  - the 5 section landings, the business-types hub and its 6 type pages;
  - glossary, checklist and sources;
  - all 36 documents;
  - `404.html`.
- **D5 on document pages.** Every document page in both locales (72) has the AI notice as the first callout in `article > header`, with its body, status and explanation, and the "How this was made" link in order. Afrikaans pages put the translation notice directly under it. Every page has a "Sources for this page" section with entries, or a source note that links the register and how-this-was-made. Pages without their own sources get the "checked … against the sources in the register" body, not "the sources below".
- **Notices by page kind.** The checklist carries the reminder-list note. Templates state the date their rules were checked.
- **Afrikaans fallback pages.** `<html lang="af-ZA">`, the content is marked `lang="en-ZA"`, and the chrome is Afrikaans.
- **Head metadata.** Canonical, `hreflang` with `x-default`, Open Graph, a description of at least 20 characters, and `theme-color` for both schemes are on every indexable page. The noindex pages (`404`, `design-system/*`) have a description and `theme-color`.
- **Home figures.** The R2.3 million and R120,000 figures match `start/start-here` and the "supports" text of their SARS sources, each with "AI-checked 13 September 2026" and an official link.
- **Static rules.** No literal colours and no root-relative `href` in the changed source. No hard-coded UI strings in the new templates. `en.json` and `af.json` have identical keys (704 each).
- **About.** It describes no unbuilt feature. Shortcuts and settings are left out on purpose, and the licence text matches `00-start-here.md#licence`.
- **No JavaScript.** Every page renders. The search page shows the common questions and a link to the contents. The 404 page works and has both languages, each marked with its own `lang`.
- **Navigation.** The pager crosses sections. Breadcrumbs carry `aria-current`. Section landings list their documents in order. The contents page lists every document and its sections.

## Findings

### major: English document titles on Afrikaans pages are marked as Afrikaans on the new M2 surfaces
File: src/components/pages/SectionLanding.astro:61; src/pages/[...locale]/contents.astro:81,86; src/layouts/Doc.astro:229,234 (titles from `docPager`, src/lib/pages.ts)
Acceptance item: M2.4 (`lang="en"` on English content on `/af/`); B5 language of parts; WCAG 3.1.2. This is the same defect class as M1 pass 1 major 2.
What is wrong: No document is translated: `manifest.json` has `langs: ["en"]` for all 36. On `/af/` the following link names are English text inside `lang="af-ZA"`, so a screen reader reads them with an Afrikaans voice:
- the section landing card titles ("Register: what you actually need", the card's link name);
- every document link on `/af/contents/`;
- the pager links ("Vorige: Core: start here", "Volgende: Tax and SARS").

The reverse also happens. On `/af/contents/`, the Afrikaans `aria-label` "Afdelings van {title}" sits on a `ul lang="en-ZA"`. The helper that fixes this already exists (`docTitleLang`, used in `SectionSidebar.astro:41`), but these three places do not use it. The summaries on the same cards are marked correctly.
How to reproduce: `pnpm build`, then:
```
grep -o 'st-card__link[^>]*>[^<]*' dist/af/core/index.html | head -2
grep -o '<a class="st-pager__link[^>]*>[^<]*' dist/af/core/register/index.html
```
Neither output has a `lang` attribute on or around the English title. You can also walk the text nodes of `dist/af/core/index.html` and print each node's nearest `[lang]`.
Suggested fix: Wrap the title in `<span lang={docTitleLang(...)}>` in the card, the contents link and the pager. For the pager this means `docPager` returns the title's language. Move the contents `aria-label` off the `lang="en-ZA"` list, or mark only the headings inside it. Extend the AF e2e test to cover a landing card, a contents entry and the pager.

### major: the home page's turnover-tax "0% on the first R600,000" is shown under an official source that the register does not record as supporting it, and the test is written to allow that
File: src/lib/home.ts:49; tests/unit/site/home.test.ts:26-27; src/pages/[...locale]/index.astro (numbers section)
Acceptance item: D5 "Facts are shown with their date … and a link to the specific source"; D5 "Nothing implies more certainty than the source"; ADR 0006 decision 4
What is wrong: The turnover-tax card shows "0% tax on the first R600,000", then "AI-checked 13 September 2026", then an "Official source" link to `sars--turnover-tax`, with the Official badge. That entry's "supports" text covers only "micro business qualification, the R2.3 million threshold … reduced record-keeping". No entry in `src/data/en/sources.json` mentions R600,000 at all. The guard does not check the source. It checks `supports + plainTextOf('core/tax-and-sars')`, so any figure the guide prints passes. Mutation 3 changed the band to `R950,000` (a band boundary in the guide) and the test stayed green. The home page states this figure in display type, as a sourced and dated fact.
How to reproduce: Run
```
grep -c 600,000 src/data/en/sources.json
```
It prints 0. Then set `zeroBand.amount` to `'R950,000'` in `src/lib/home.ts` and run `pnpm exec vitest run tests/unit/site/home.test.ts`: 4 passed.
Suggested fix: Make the test require the band amount in the cited entry's own "supports" text, as it already does for `amount`. Then either cite a register entry that supports the 0% band, or drop the band from the home card until the register has one. Adding the entry is a `fix(content):` change to the English register with an official citation (WP-47). Do not loosen the test.

### major: Afrikaans fallback pages send contradictory hreflang and canonical signals
File: src/layouts/Page.astro:45-46; src/lib/pages.ts (`docLocales`); astro.config.ts:57-58 (sitemap i18n)
Acceptance item: M2.4 "correct `hreflang`"; M2.5 head
What is wrong: For all 36 `/af/` document pages:
- The page head leaves out `af-ZA` from `hreflang`, because the page "is not an Afrikaans version".
- `sitemap-0.xml` lists the same URL with `hreflang="af-ZA"` pointing at itself, paired with `en-ZA`.
- The page's canonical is itself (`/af/core/register/`), while its content is a duplicate of `/core/register/`.
- It declares `og:locale` `af_ZA` over an English description.

A self-canonical page that is missing from its own hreflang set, with the sitemap saying the opposite, gives search engines conflicting answers. The head test (`pages.spec.ts` "an untranslated document is not offered…") checks only one of the two channels.
How to reproduce: `pnpm build`, then:
```
grep -o '<link rel="\(canonical\|alternate\)"[^>]*>' dist/af/core/register/index.html
grep -o '<url><loc>[^<]*af/core/register/</loc>[^u]*' dist/sitemap-0.xml
```
Suggested fix: Pick one policy and apply it everywhere. The likely one: a fallback page points its canonical at the English URL (or is `noindex`), is left out of the sitemap or listed without an `af-ZA` alternate, and uses `og:locale` `en_ZA`. Add a check that reads `sitemap-0.xml` next to the head check.

### minor: with JavaScript on, the search page always says "Search could not load", and the query is lost
File: src/pages/[...locale]/search.astro:84-87
Acceptance item: M2.1 "a search page shell that works without JavaScript"; brief task 3 "behave sensibly with and without JavaScript"
What is wrong: The `.js-only` paragraph shows "Search could not load. Use the contents page instead." to every reader with scripts on, because no search client exists until WP-33. That is a failure message for something that never tried to run. Submitting the form (`?q=VAT+threshold`) reloads the same page. The input is empty and the query appears nowhere. Without JavaScript the "Search needs JavaScript" text is accurate.
How to reproduce: `astro preview`, open `/business-toolkit/search/?q=VAT+threshold` with JavaScript on. The callout reads "Search could not load…" and `#st-search-q` is empty.
Suggested fix: Until WP-33, show one neutral sentence in both modes ("Full search is coming; use the common questions or the contents"). Optionally echo `q` into the input from a tiny script. Leave the failure message to the client that can actually fail.

### minor: the header advertises a "/" search shortcut that does nothing
File: src/components/navigation/SiteHeader.astro:61
Acceptance item: brief task 3 "anything … that describes features that do not exist yet"; B5 shortcuts
What is wrong: With JavaScript on, every page shows `<kbd>/</kbd>` on the Search link. No `keydown` handler exists anywhere in `src/scripts`. Pressing `/` leaves focus on `BODY` and the URL unchanged. `about.astro` leaves out the shortcut table for exactly this reason ("a table of shortcuts that do nothing would tell a reader something untrue"), but the header makes the claim on every page.
How to reproduce: Open `/business-toolkit/core/register/` with JavaScript on and press `/`. Nothing happens. `grep -rn keydown src/scripts` finds no shortcut handler.
Suggested fix: Render the hint only once WP-33 ships the handler. For example, put it behind a flag that the search module sets.

### minor: the home page promises the wizard, which is not built: the primary button 404s and the trust strip names "your answers"
File: src/pages/[...locale]/index.astro:123 and :256; tests/e2e/helpers/exceptions.ts (`WIZARD_ROUTES`)
Acceptance item: brief task 3 (features that do not exist yet); general quality
What is wrong: The hero's primary button "Find my path" links to `find-my-path/`, which does not exist until WP-31. The Tools menu's "My path" also links to a missing route. On a deployed `main` these are 404s from the most prominent control on the home page. The audit allows them through `KNOWN_FUTURE_ROUTES`, which keeps the gate green but does not change what a reader gets. The trust strip says "Your answers stay on this device", but there is nowhere to give answers yet.
How to reproduce: `pnpm build`. `dist/find-my-path/` does not exist, and `grep -o 'href="[^"]*find-my-path/"' dist/index.html` matches the hero button.
Suggested fix: Until WP-31 lands, leave the wizard button, the My path entry and the "answers" line out of the rendered output, behind a single flag in `src/lib/routes.ts`. Alternatively, record an explicit owner decision that `main` is not deployed before WP-31.

### minor: removing the AI notice or the sources section from `Doc.astro` does not fail `pnpm build`
File: src/layouts/Doc.astro (`assertDocTrust` call); src/lib/pages.ts (`assertDocTrust`)
Acceptance item: M2.3 "The build must fail if a guide, template, checklist or business-type page renders without one"
What is wrong: `assertDocTrust` checks the data (sources or a note), not the rendered page. With `<SourcesForPage>` deleted from `Doc.astro` (mutation 5), `pnpm build` exits 0 and the link audit is clean. Only `pages.spec.ts` (72 failures) catches it. That is still in `pnpm gate`, so CI would go red, but it is not "the build fails" as the brief and `docs/testing.md` state.
How to reproduce: Delete the `<SourcesForPage … />` element in `src/layouts/Doc.astro` and run `pnpm build`: exit 0.
Suggested fix: Have `dist:audit`, or a small post-build check, require `.st-ai-notice` and `section[aria-labelledby="sources-for-this-page"]` in every HTML file whose `article` has `data-kind` of guide, template, checklist or glossary/sources. Or change the brief and testing doc to say the gate fails, not the build.

### minor: the business-types hub and the sources page do not follow their B6/B1 specs
File: src/pages/[...locale]/[...route].astro; src/lib/pages.ts (`contentPages`: "the document is the landing")
Acceptance item: M2.1 (business-types hub; sources); B6 "Business-type hub: … tiles … effort ranked list with meters … Not sure? Find my path"; B1 `/sources/#<entry>`
What is wrong:
- **The hub.** `/business-types/` is the "Pick your business type" document rendered as a plain guide: tables, no tiles, no effort meters, no "Not sure?" route.
- **The sources page.** It has section anchors (`#tax-and-sars` and others) but no per-entry ids, so the `/sources/#<entry>` form in B1 cannot be linked. Nothing links to it today, so the audit does not notice.

The design-system doc records the hub decision only as "the document is the landing", not as a deviation from B6.
How to reproduce:
```
grep -c 'id="sars--' dist/sources/index.html
```
prints 0. View `dist/business-types/index.html`: no `.st-card` tiles and no `st-effort` meters in `main`.
Suggested fix: Either build the B6 hub around the document, with the tiles and effort meters already used on the home page, and give each register entry its id, or record both as deliberate deviations in `docs/reviews/backlog.md` with the owner's agreement.

### nit: the 404 page has no closest-route suggestion
File: src/pages/404.astro
Acceptance item: build plan C4 "`404.astro` … with base-aware links and a closest-route suggestion"
What is wrong: `notFound.suggestion` ("Maybe you were looking for: {title}") exists in both dictionaries but is never used. The search box on the 404 page leads to the search shell, which cannot search yet (see the search minor).
How to reproduce: `grep -rn notFound.suggestion src/` finds only the dictionaries.
Suggested fix: A small script that matches `location.pathname` against the manifest routes. Or record it as WP-33's.

### nit: one line of WP-11's `src/pages/design-system.astro` changed
File: src/pages/design-system.astro:1072
Acceptance item: Review protocol step 2 (file ownership)
What is wrong: The register link changed from `lookup/sources/` to `sources/`. The change is correct and was needed to remove the future-route exception, but it is a cross-package edit and is not recorded in `backlog.md` the way the `TableScroll` change is.
How to reproduce: `git diff b010d5b...b202c08 -- src/pages/design-system.astro`.
Suggested fix: Add one line to the backlog's cross-package entry.

## Verdict

Not clean: 0 blocker, 3 major, 5 minor, 2 nit. All M1 pass 1 findings are fixed or recorded in the backlog with a reason. WebKit was not run because it is not installed in this environment.
