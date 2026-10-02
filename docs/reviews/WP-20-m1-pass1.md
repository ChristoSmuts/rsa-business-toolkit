# WP-20 milestone 1, review pass 1

- Reviewer: an independent reviewer agent that did not write this code.
- Date: 2026-10-02
- Commit reviewed: `a28c067` (merge of `origin/main` `b010d5b` into `claude/lucid-bell-t5acdn`). The milestone's own commits are `a50bb6f..9de5fa2`. Scope is `git diff origin/main...HEAD`: 50 files, +5065 / -40.
- Gate results, re-run by me:
  - `pnpm install --frozen-lockfile`: OK.
  - `pnpm gate:fast`: exit 0.
    - eslint, prettier and stylelint clean.
    - `astro check`: 158 files, 0 errors, 0 warnings, 0 hints.
    - vitest unit+dom: 27 files, **886 passed (886)**.
    - Content drift: none.
    - vitest content: **32 passed (32)**.
  - `pnpm build`: exit 0. 4 pages built. `dist:audit` checked 460 URLs, no problems, and allowed 95 future routes.
  - Playwright `chromium`, `mobile` and `nojs`: **128 passed, 6 skipped, 0 failed** (134 total: chromium 64, mobile 64, nojs 6). The skips are 404 specs (no 404 page built yet) and two mobile-only skips of the page-contract specs.
  - `pnpm test:a11y`: **8 passed** (4 sitemap URLs × light and dark, including `/design-system/content/` and `/af/design-system/content/`).
  - webkit: **not run**. `/opt/pw-browsers` holds only `chromium-1194` and `chromium_headless_shell-1194`, and no webkit.
  - Environment note: Playwright 1.63.0 expects chromium revision 1243. The plain `pnpm test:e2e` run failed all 134 tests with "Executable doesn't exist … chromium_headless_shell-1243". I ran every Playwright result above through a symlink shim to the 1194 binaries: `PLAYWRIGHT_BROWSERS_PATH=<scratchpad>/pw`. I did not run `playwright install`, and I changed nothing under `/opt`.
- Mutation tests. Each mutation was reverted with `git checkout -- <file>`, and the tree is clean at the end.
  1. `tableIsWide` changed from `>=` to `>`: 2 unit tests went red (`render.test.ts` "stacks from five columns", and `coverage.test.ts`).
  2. `isHumanVerified` with the `namesAPerson` check removed: 5 unit tests went red (`trust.test.ts`).
  3. `isRedundantRule` changed to always return true: 3 unit tests went red.
  4. `rel="noopener noreferrer"` removed from the external link in `Inline.astro`, then rebuilt: e2e "renders every block kind and every inline run" went red.
  5. Tasklist checkbox id changed to a random id: e2e "a checklist uses the task ids the pipeline generated" went red.
  6. No-JS stacked-menu rule in `SiteHeader.astro` disabled: nojs "sections and tools are reachable at 320px" went red.
  7. AiNotice link moved above the status paragraph: e2e "the AI notice … in the order the design system fixes" went red.
- File ownership: `git diff --name-only` outside `src/components/{content,trust,navigation}`, `src/lib`, `src/i18n`, `src/pages`, `tests` and `docs` returns:
  - `.prettierignore`
  - `src/components/ui/TableScroll.astro` (owned by WP-11)
  - `src/scripts/navigation.ts`
  - `src/styles/content.css`

  See the minor finding on ownership.

## Checked, no finding

- Every `Block` kind (12) and every `InlineRun` kind has a branch:
  - `Block.astro`, with the `hidden` case.
  - `Inline.astro`: text, br, code, strong, em, placeholder, sigline, external link, internal link, docref doc and docref section.
- The coverage page renders a real block for every one of the 41 `ALL_FEATURES`.
- Internal links in built HTML: no `href="/…"` outside `/business-toolkit/` on either content page. All internal URLs come from `href()` through `docHref` and `sectionHref`.
- External anchors: 9 per page, all with `rel="noopener noreferrer"`.
- Tables with 5 or more columns get `data-wide="true"` and `data-label` on each cell.
- Checkbox ids are the pipeline task ids. There are no duplicate task ids within any document in the corpus, and no duplicate ids at all in either built page (79 and 80 ids).
- AiNotice order is body, status badge plus explanation, then the link. The body is chosen by `trustNotice()` from `verification.status`, a real name check, and `hasPageSources`. The AF body says "die Engelse teks … nagegaan".
- TranslationNotice sits directly after AiNotice inside `article > header`.
- SourcesForPage branches (entries with Official or Not-official badges and "what it supports", the Acts sub-list, and the source note with register and how-made links) are all rendered and tested.
- The drawer is a native `<dialog>` inside a `.js-only` host.
  - No-JS fallback: below 1024px, `html:not(.js) .st-topbar__menus` shows the same `<details>` menus stacked in the header. This is verified by the nojs spec at 320px.
- The language switcher appends `location.hash` on load and on `hashchange`.
- No literal colours in the changed CSS or components. No inline `<script>` in built HTML. `en.json` and `af.json` have identical key sets (703 each).

## Findings

### blocker: the "read the English version" link marks Afrikaans text as English
File: src/components/trust/TranslationNotice.astro:37 and :48
Acceptance item: Milestone 1.2 (Afrikaans translation notice); B5 "`<html lang>` per route and `lang="en"` on fallback blocks"; WCAG 3.1.2 Language of Parts
What is wrong: The link gets `lang={englishLang}` (`en-ZA`), but its text is `t('lang.mtNotice.link')` in the page locale. On `/af/` that text is "Lees die Engelse weergawe". A screen reader reads Afrikaans with an English voice. The file comment says "the link text is English while the notice around it is not", which is wrong. The attribute that describes the *target's* language is `hreflang`.
How to reproduce: `pnpm build`, then `grep -o '<a class="st-link-block" href="/business-toolkit/design-system/content/" lang="en-ZA">[^<]*' dist/af/design-system/content/index.html` prints `… lang="en-ZA"> Lees die Engelse weergawe`.
Suggested fix: Replace `lang` with `hreflang` on both links and correct the comment. Add an assertion to the AF e2e test that the link has no `lang` and does have `hreflang="en-ZA"`.

### major: on the English-fallback page, English text outside `.st-blocks` is not marked `lang="en"`, and Afrikaans manifest titles inside it are marked English
File: src/pages/[...locale]/design-system/content.astro:122-175; src/components/navigation/TableOfContents.astro:42,54; Breadcrumb.astro:35; SectionSidebar.astro:59; src/components/trust/SourcesForPage.astro:73-108; src/components/content/Inline.astro:79-80; TableBlock.astro:38-40
Acceptance item: Milestone 1.2 and 1.3; B5 language of parts; WP-20 M2 item 4 ("`lang="en"` on the content"), which these components will be reused for
What is wrong: On `/af/design-system/content/` only the `.st-blocks` wrapper carries `lang="en-ZA"`. Every other piece of English text inherits `lang="af-ZA"`:
- the `<h1>` ("Pick your business type")
- the lead summary
- the "Words used" terms
- the TOC entries ("How much regulation each type carries")
- the breadcrumb's current crumb and the sidebar titles, through `docTitle`'s English fallback
- source titles and "supports" text from `en/sources.json`

The reverse also happens. Inside the `lang="en-ZA"` blocks, docrefs render the *Afrikaans* manifest title ("Kern: geld vir almal"), and the table caption is the Afrikaans `doc.tableRegion` sentence ("Tabel: … Rol sywaarts om alles te sien."). Both get read with an English voice. None of these components can set `lang` on what they render. The AF e2e test only checks `.st-blocks`, so it passes. axe does not detect wrong-but-valid `lang` values.
How to reproduce: `pnpm build`, then `sed 's/></>\n</g' dist/af/design-system/content/index.html | grep -n '<h1\|data-depth\|Kern: geld'`.
Suggested fix: Give the doc-text components (TOC, Breadcrumb or crumb, SectionSidebar entries, SourcesForPage, the page header) a content-language input and emit `lang` where the text language differs from the page. Wrap Afrikaans chrome strings that appear inside fallback blocks (docref titles, table caption) with `lang` set to the page locale, or use English titles inside English blocks. Extend the AF e2e test to check `h1` and the TOC.

### major: pseudo headings always render as `<h4>`, skipping a level under an `<h2>`
File: src/components/content/Block.astro:36,42; src/lib/content/render.ts:158
Acceptance item: B4 "No H4+ from the pipeline (pseudo-headings render as bold lead-ins with heading semantics only where the outline allows)"; B5 heading order
What is wrong: `headingTag(depth)` maps depth 4 to `h4` unconditionally. In 5 places in the English corpus, a pseudo heading follows an `h2` with no `h3` between, giving an h2 to h4 skip:
- `core/working-from-home-and-safety#setup`
- `core/you-are-the-business#protection`
- `lookup/checklist#before-you-trade`
- `lookup/checklist#once-after-registration`
- `lookup/checklist#vehicle-dealer`

The render.ts comment says this "keeps heading semantics so the outline stays complete", which is not true there. axe's `heading-order` is "moderate", so the serious/critical a11y gate will not catch it when M2 builds these pages.
How to reproduce: Walk `src/data/en/docs/*.json` and compare each non-hidden heading's depth with the previous heading's depth. 22 depth-4 headings exist and 5 of them skip a level. I used a 20-line node script in my scratchpad.
Suggested fix: Pass the previous heading depth into the decision. Render a pseudo heading as `h(prev+1)` when that is ≤ 4, or as a bold `<p>` lead-in when the outline does not allow a heading. Unit-test it against the corpus.

### minor: the Official badge is missed on official links whose URL differs only by `www` or a trailing slash
File: src/lib/content/render.ts:176-184; src/components/content/Inline.astro:54-56
Acceptance item: Milestone 1.1 "Official sources get the Official badge"
What is wrong: `officialUrls` matches by exact string. 13 external links in the English corpus point at an official register URL but differ from it only by scheme host form or trailing slash, so they get no badge:
- `https://inforegulator.org.za/` vs `https://inforegulator.org.za`
- `https://www.gov.za` vs `https://gov.za/`
- `https://www.cipc.co.za` vs `https://www.cipc.co.za/`

42 links match exactly.
How to reproduce: Normalise URLs with `replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')` and compare corpus external links with the official register URLs.
Suggested fix: Normalise the host (`www.`), the trailing slash and the scheme on both sides of the lookup. Add a unit test with these three URLs.

### minor: the language switcher keeps a stale fragment after the hash is cleared
File: src/scripts/navigation.ts:51-53
Acceptance item: Milestone 1.3 "language switcher (same page and anchor in the other locale)"
What is wrong: `#apply` returns early when `location.hash === ''`. After a reader goes from `#a` back to no fragment (browser Back, or a link to the bare page), the switcher links still end in `#a`. Switching language then jumps to a heading the reader has left.
How to reproduce: Open `/business-toolkit/design-system/content/#how-much-regulation-each-type-carries`, then press Back to the URL with no hash. The AF link `href` still ends in `#how-much-regulation-each-type-carries`.
Suggested fix: Always recompute the hrefs (`switchLocaleUrl` with an empty hash), or reset to the server `href` kept in a data attribute.

### minor: every fenced block is an unnamed tab stop, even when it does not scroll
File: src/components/content/CodeBlock.astro:37
Acceptance item: general quality (accessibility: focus order)
What is wrong: `<pre tabindex="0">` is always focusable and has no role or accessible name. A page like `branding/branding-prompts` adds one silent tab stop per prompt, and the corpus has 36 prompts. The file comment admits this and defers it to WP-30, but the unnamed focusable region is in this milestone's markup. `TableScroll` already solves the same problem: `role="region"`, a label, and the tab stop dropped while nothing overflows.
How to reproduce: `grep -o '<pre tabindex="0"' dist/design-system/content/index.html | wc -l` gives 5. Tab through the coverage section; screen readers announce nothing useful for these stops.
Suggested fix: Name the region (`role="region"` plus `aria-label` from a `prompts.*` or `doc.*` string). Optionally reuse the `st-table-scroll` overflow logic to drop the stop when the block does not overflow.

### minor: English-only text on the Afrikaans reference page, not marked `lang="en"`
File: src/pages/[...locale]/design-system/content.astro:179-182, 201-205, 215-218, 230
Acceptance item: CLAUDE.md "Every UI string lives in en.json and af.json"; B5 language of parts
What is wrong: The `/af/` twin of the reference page renders hard-coded English headings and hints ("Every block kind and every inline run", "Notices that need content this build does not have yet", and others) inside `lang="af-ZA"`. The page is a `noindex` design-system reference and the existing `/design-system/` is also English-only, so the dictionary rule is arguably out of scope here. The missing `lang="en"` is not.
How to reproduce: View `dist/af/design-system/content/index.html` and search for "Every block kind".
Suggested fix: Put `lang="en"` on the demo sections (or on a wrapper), or move the strings into a `designSystem.*` group.

### minor: file ownership: WP-11's `TableScroll.astro` edited, and `Inline.astro` excluded from Prettier
File: src/components/ui/TableScroll.astro:51-61; .prettierignore
Acceptance item: Review protocol step 2 (file ownership)
What is wrong: The brief scopes milestone 1 to `src/components/content|trust|navigation`, `src/lib` helpers, i18n, the reference page, tests and docs. `TableScroll.astro` belongs to WP-11. The change itself (`position: relative`, so a visually hidden span cannot widen the page at 320px) is justified and covered by the reflow e2e test, but it needs to be recorded as a cross-package change. Adding `Inline.astro` to `.prettierignore` is reasoned in the file, but it leaves a central renderer outside the formatter. Only the e2e text-equality test now guards whitespace there.
How to reproduce: `git diff --name-only origin/main...HEAD`.
Suggested fix: Note the `TableScroll` change in the handover or in `docs/reviews` for WP-11. Keep the e2e text-equality test as the documented guard for the Prettier exclusion.

### nit: comments point at test files that do not exist
File: src/components/content/Block.astro:5 (`tests/unit/content-render.test.ts`); src/lib/content/coverage.ts:9 (`tests/unit/content-coverage.test.ts`); src/lib/nav.ts:5 (`tests/unit/nav.test.ts`); src/scripts/navigation.ts:3 (`.no-js-only` menus, but the mechanism is `html:not(.js)`)
Acceptance item: general quality
What is wrong: The tests live under `tests/unit/site/`, and the no-JS menus are not `.no-js-only`.
How to reproduce: `ls tests/unit/content-render.test.ts tests/unit/content-coverage.test.ts tests/unit/nav.test.ts` gives "No such file or directory" for all three.
Suggested fix: Update the paths and the wording.

### nit: missing link targets degrade silently instead of failing the build
File: src/components/trust/AiNotice.astro:50; src/components/content/Inline.astro:78-80
Acceptance item: D5 (AiNotice must link "How this was made")
What is wrong: If the manifest does not know `start/how-this-was-made`, the AI notice drops its required link without error. An internal link or docref to an unknown id renders as plain text. `content:check` currently reports 0 unresolved links, so nothing is wrong today, but `manifest.ts:277` says "a caller can decide between omitting the link and failing the build", and no caller fails.
How to reproduce: Code reading.
Suggested fix: Throw at build time in AiNotice when `howMade` is undefined, and optionally in Inline.

### nit: if `theme-init.js` runs but module scripts do not, the phone has a dead Menu button
File: src/components/navigation/SiteHeader.astro:156-168; src/scripts/theme-init.js:22
Acceptance item: general quality (works without JavaScript)
What is wrong: The `js` class comes from the classic `theme-init.js`. The drawer behaviour comes from a module script. A browser that runs classic scripts but fails or blocks the module gets `.js` set: the stacked menus are hidden and the Menu button does nothing. This is an edge case.
How to reproduce: Code reading. Block the `navigation` module chunk in devtools at 375px.
Suggested fix: Have `<st-nav-drawer>` set a class such as `nav-ready` when it connects, and base the hide-menus rule on that class instead of `.js`.

## Verdict

Not clean: 1 blocker, 2 major, 4 minor, 3 nit. Webkit was not run because it is not installed in this environment.
