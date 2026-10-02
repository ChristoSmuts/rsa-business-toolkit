# WP-20 review pass 3 (whole package)

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2026-10-02
- **Commit reviewed:** `c8ca374` ("fix(pages): resolve wp-20 review pass 2"), checked out detached in a clean worktree.
- **Scope:** `git diff b010d5b...c8ca374`, 78 files, +8323 / -104. This covers M1, the M1 pass 1 fixes, M2 (`b202c08`), `edd42eb` and the pass 2 fixes (`c8ca374`).
- **Gate results.** I re-ran all of these myself.
  - `pnpm install --frozen-lockfile`: OK.
  - `pnpm gate:fast`: exit 0.
    - eslint, prettier and stylelint: clean.
    - `astro check`: 176 files, 0 errors, 0 warnings, 0 hints.
    - vitest unit+dom: 30 files, **925 passed (925)**.
    - Content drift: none.
    - vitest content: **32 passed (32)**.
  - `pnpm build`: exit 0, 96 pages.
    - `dist:audit`: 96 HTML files, 13539 URLs checked under `/business-toolkit/`, no problems.
    - `dist:trust`: "72 document page(s), each with its AI notice and sources."
  - Playwright `chromium`, `mobile` and `nojs`: 574 tests, **498 passed, 76 skipped, 0 failed**.
    - chromium: 238 passed.
    - mobile: 162 passed, 76 skipped. The skips are the chromium-only per-document D5 loop, the head checks that read `dist/`, and the existing page-contract skips.
    - nojs: 98 passed.
  - `pnpm test:a11y`: **192 passed** (96 routes × light and dark).
  - WebKit: **not run**. It is not installed in this environment; `/opt/pw-browsers` holds only chromium 1194, its headless shell and ffmpeg.
  - Environment:
    - Plain symlinks `chromium-1243 -> chromium-1194` and `chromium_headless_shell-1243 -> …-1194` do not work. Build 1243 expects `chrome-headless-shell-linux64/chrome-headless-shell` and `chrome-linux64/`, but build 1194 ships `chrome-linux/headless_shell`. With the plain links, all 574 tests failed with "Executable doesn't exist".
    - I built a directory shim in my scratchpad that links each 1194 file under the 1243 layout, and set `PLAYWRIGHT_BROWSERS_PATH` to it with `PW_PORT=4620`.
    - I did not run `playwright install`, and I changed nothing under `/opt`.
- **My own checks**, with happy-dom and Playwright scripts in my scratchpad:
  - Head and sitemap consistency over all 96 HTML files: 92 indexable pages, each in the sitemap with identical `hreflang` sets. Each has a canonical, `x-default` pointing at English, `og:locale` matching `<html lang>`, a description of at least 20 characters and `theme-color`. No noindex page is in the sitemap. 0 issues.
  - Language-of-parts sweep on all 48 `/af/` pages: I compared each text node and each `aria-label`/`title`/`alt` with the English twin. Only two patterns remain:
    - the language switcher (blocker 2);
    - the "SA Business Toolkit" wordmark, which is a proper name and not a finding.
  - Screenshots at 320px and 1280px of `/`, `/af/`, `/business-types/`, `/af/core/register/`, `/templates/`, `/search/`, `/core/` and `/business-types/vehicle-dealer/`. No page scrolls sideways. I found the top-bar defect (blocker 1) and the pager defect (minor 1) by looking at them.
  - `WIZARD_AVAILABLE` is honoured everywhere: hero button, trust line, Tools menu, drawer. No built page links to `find-my-path/` or `my-path/`. The only "Find my path" text left is a non-link button demo on `/design-system/`.
- **Mutation tests.** I reverted each with `git checkout -- <file>`, rebuilt `dist/` at the end, and `git status` is clean.
  1. The home VAT card's `from` changed from `2026-04-01` to `2026-03-01`: `home.test.ts` **stays green (5/5)**. See major 2.
  2. `SourcesForPage` resolves no entries (`sourceEntriesFor(undefined, …)`, as when a register file is missing):
     - `pnpm build` **stays green**, including `dist:trust`;
     - the per-document D5 e2e loop **passes 22 of 72**.
     
     See major 1.
  3. The status badge and its one-sentence explanation removed from `AiNotice`:
     - `dist:trust` **stays green**;
     - one e2e test goes red (`content.spec.ts` "the AI notice states who checked…", on the design-system demo page only).
  4. `lang` removed from the pager's "next" title: `pages.spec.ts` "an Afrikaans document page shows English…" goes red.

## Earlier findings

| Pass | # | Finding | Status |
|---|---|---|---|
| M1 p1 | B1 | "Read the English version" link marked `lang="en"` | Fixed (`hreflang="en-ZA"`, no `lang`). The same defect class is still present in the language switcher; see blocker 2. |
| M1 p1 | M1 | English text outside `.st-blocks` not marked on fallback pages | Fixed. The sweep finds no unmarked English document text on `/af/`. |
| M1 p1 | M2 | Pseudo headings render `h4` under `h2` | Fixed. |
| M1 p1 | m1 | Official badge misses `www` and trailing-slash variants | Fixed. |
| M1 p1 | m2 | Stale fragment in the language switcher | Fixed. |
| M1 p1 | m3 | Every `<pre>` is an unnamed tab stop | Fixed (`st-code-scroll`). |
| M1 p1 | m4 | English-only text on the AF reference page not marked | Fixed. |
| M1 p1 | m5 | Ownership: `TableScroll.astro`, `.prettierignore` | Recorded in `backlog.md`. Accepted. |
| M1 p1 | n1 | Comments point at missing test files | Fixed. |
| M1 p1 | n2 | Missing link targets degrade silently | Fixed for the AI notice (throws). |
| M1 p1 | n3 | `.js` set but module blocked leaves a dead Menu button | Recorded in `backlog.md`. Accepted: the layout-shift reasoning holds. |
| p2 | M1 | English titles on AF landing cards, contents and pager marked as Afrikaans | Fixed. Cards have `lang="en-ZA"` on `h2`, contents links carry `lang`, the pager title is in a `span lang`, and the mixed-language `aria-label` is gone. Mutation 4 is caught. The pager fix introduced a visual defect; see minor 1. |
| p2 | M2 | "0% on the first R600,000" not supported by the cited source | Fixed: the band was removed and the test was tightened for `amount`. The same gap remains for `oldAmount` and `from`; see major 2. |
| p2 | M3 | Contradictory `hreflang`/canonical on AF fallback pages | Fixed. Fallback pages are self-canonical and listed in `hreflang`, the same as the sitemap, and a test compares them. My cross-check finds 0 mismatches. The `docLocales` comment is now stale; see nit 1. |
| p2 | m1 | Search page says "could not load"; query lost | Message fixed (`search.notReady`). Echoing the query is deferred to WP-33 in the backlog. I accept that deferral, but not the form being the home page's only primary action; see minor 3. |
| p2 | m2 | `/` hint for a shortcut that does nothing | Fixed. No `<kbd>` on any non-design-system page. |
| p2 | m3 | Wizard links 404 and "your answers" line | Fixed behind `WIZARD_AVAILABLE`, verified in source and `dist/`. |
| p2 | m4 | Removing D5 pieces from `Doc.astro` does not fail the build | Fixed for removal: `dist:trust` runs in `pnpm build`. It is shallow (mutations 2 and 3); see major 1. |
| p2 | m5 | Hub not per B6; `/sources/` has no per-entry anchors | Hub: fixed. It shows the six tiles with effort meters; the effort ranking stays in the document's own table. Anchors: deferred in the backlog until the first feature links an entry. Accepted. |
| p2 | n1 | 404 has no closest-route suggestion | Deferred to WP-33 in the backlog. Accepted. |
| p2 | n2 | One line of WP-11's `design-system.astro` changed | Recorded in `backlog.md`. `c8ca374` then changed WP-11's `Card.astro` without recording it; see minor 4. |

## Findings

### blocker: below 1024px the sticky top bar covers anchor targets: the "hide the theme control" rule never matches
File: src/components/navigation/SiteHeader.astro (the `@media (width < 1024px)` rule for `.st-topbar__theme`); src/components/navigation/ThemeControl.astro; the `scroll-padding-top` in the global styles (72px)

Acceptance item: M1.3 (header, mobile drawer); B2 (top bar 56px, drawer below 1024px); B3 flow 7 ("lands on the same heading"); B5 (focus management, anchor targets); general quality

What is wrong:
- **The rule does not apply.** `SiteHeader` passes `class="st-topbar__theme"` to `<ThemeControl>`. Astro scopes the hiding rule to SiteHeader's cid, and it compiles to `.st-topbar__theme[data-astro-cid-wpn4ixnr]{display:none}`. The rendered element carries ThemeControl's cid (`data-astro-cid-4qffy7xi`), so the rule never matches.
- **The bar grows.** The full theme control stays in the sticky bar at every width, next to the drawer, which has its own theme control. The sticky bar is:
  - 227px tall at 320×568 (40% of the screen);
  - 175px at 375×667;
  - 123px at 640×360.
- **Anchors land under it.** `scroll-padding-top` is 72px. Any fragment link puts its heading entirely under the bar on a phone. Measured on `/core/register/#how-to-register-a-company-yourself`: the heading is at 72–137px and the bar ends at 227px (320×568) or 175px (375×667). This affects:
  - the contents `<details>` on document pages;
  - the heading links on `/contents/`;
  - glossary `#term` links;
  - the language switcher's preserved anchor.
- **Focus can be hidden.** Tab focus scrolled into view can sit behind the bar for the same reason.

No test checks the bar height or where a fragment target lands. The 320px reflow tests only check horizontal scrolling.

How to reproduce: `pnpm build`, `astro preview`. At 320×568, open `/business-toolkit/core/register/#how-to-register-a-company-yourself`. The heading is not visible; body text sits directly under the bar. `getComputedStyle(document.querySelector('.st-topbar__theme')).display` returns `block`. Also `grep -o '\.st-topbar__theme[^{]*{[^}]*}' dist/_astro/*.css`.

Suggested fix:
- Make the rule match: `:global(.st-topbar__theme)` inside `.st-topbar`, or a `hideBelowLg` prop on `ThemeControl`.
- Then make the bar's real height and `scroll-padding-top` agree at every width. Either set the padding from a measured custom property, or keep the bar to one row (56px) below 1024px as B2 specifies.
- Add an e2e test at 320×568 and 375×667: load a URL with a fragment and assert the target's top is below the bar's bottom.

### blocker: the language switcher's link name is in the page's language but marked as the other language
File: src/components/navigation/LanguageSwitcher.astro (the `<a class="st-lang__link" … lang={option.hreflang} aria-label={…}>`)

Acceptance item: M1.3 (language switcher); B5 (`<html lang>` per route; language of parts); WCAG 3.1.2. This is the same defect class as M1 pass 1 blocker 1.

What is wrong:
- **English pages.** The Afrikaans link has `lang="af-ZA"`, but its accessible name is `aria-label="Read this page in Afrikaans"`, which is English.
- **Afrikaans pages.** The English link has `lang="en-ZA"` and `aria-label="Lees hierdie bladsy in English"`, which is Afrikaans.

`aria-label` replaces the visible text as the name, and screen readers speak it in the element's `lang`. So every page, in both the header and the drawer (192 links across the site), has a link whose name is read with the wrong voice. My sweep found this on all 47 Afrikaans twins, and the English pages have the mirror case. No test covers it. axe does not flag wrong-but-valid `lang` values.

How to reproduce:
```
grep -o '<a class="st-lang__link"[^>]*aria-label[^>]*>' dist/af/core/register/index.html dist/core/register/index.html
```

Suggested fix: Drop `lang` from the `<a>` and keep `hreflang`. Wrap only the visible language name in `<span lang={option.hreflang}>`. Leave the `aria-label` in the page language, or replace it with visually hidden text in the page language around the marked span. Add an e2e assertion in both locales.

### major: "Sources for this page" can render empty under a notice that says "the sources below", and no guard notices
File: src/components/trust/SourcesForPage.astro (the `count > 0` branch and the `trust.sources.noPageSources` fallback); scripts/dist/check-trust.ts (`trustProblems`); tests/e2e/pages.spec.ts:42-70; src/lib/pages.ts (`assertDocTrust`)

Acceptance item: M2.3 ("The build must fail if a guide, template, checklist or business-type page renders without one"); D5 ("non-empty sources section or source note"; "Nothing implies more certainty than the source")

What is wrong:
- **What gets rendered.** `assertDocTrust` checks `doc.sources` ids. `AiNotice` picks "checked it against the sources below" from those same ids. `SourcesForPage` renders only the entries it can resolve in `context.sources`. When the register for the content language is missing or does not hold the ids, the page says "against the sources below" over "This page has no sources of its own." and shows no register link.
- **Which guards miss it.**
  - `dist:trust` only checks that the substring `st-ai-notice` is in the header and that a `section[aria-labelledby="sources-for-this-page"]` exists. It does not check that either has content.
  - The e2e loop accepts any `p.st-hint` longer than 10 characters as a "note", and that includes the fallback sentence.
- **Mutation results.**
  - Mutation 2 (no entries resolved): build green, `dist:trust` green, and the e2e loop passed 22 of 72 pages. Only 12 of those 22 are real source-note pages.
  - Mutation 3 (status and explanation removed): `dist:trust` green.
- **Why this is realistic.** `src/data/` holds only `en/`. When the first Afrikaans document lands, `loadSources('af')` returns `undefined` unless `af/sources.json` exists, and every translated page renders exactly this state.

How to reproduce: In `SourcesForPage.astro`, replace `context.sources` with `undefined` in the `sourceEntriesFor` and `actsFor` calls. Then:
- run `pnpm build`: exit 0 and "72 document page(s), each with its AI notice and sources";
- run `playwright test --project=chromium tests/e2e/pages.spec.ts -g "D5 trust pieces on every document page"`: 22 passed.

Suggested fix:
- Make `SourcesForPage` throw when `hasOwnSources(doc.sources)` is true but nothing resolves. Do the same when there is no `sourceNote` and nothing resolves.
- Tighten `trustProblems`:
  - the notice must contain its status text and the how-this-was-made link;
  - the sources section must contain at least one `.st-source` or a non-empty source note plus a register link;
  - the number of document pages must equal the number of manifest doc routes × locales.
- In the e2e loop, compare the rendered entry count with `doc.sources`, and refuse `trust.sources.noPageSources` on a page whose data lists sources.

### major: home figures are still shown under official sources that do not support them, and the test still allows it
File: src/lib/home.ts:31-45 (`oldAmount: 'R50,000'`, `from: '2026-04-01'`); tests/unit/site/home.test.ts ("state only figures their own source supports"; "name the same out-of-date figures and date as Start here")

Acceptance item: D5 ("a link to the specific source"; "Nothing implies more certainty than the source"); ADR 0006. This is the same class as pass 2 major 2, whose fix states "every figure on this card must be" supported.

What is wrong:
- **"Not R50,000".** The voluntary VAT card shows "R120,000 / Not R50,000 / AI-checked 13 September 2026 / Official source [Official source]". The cited entry `sars--budget-2026-frequently-asked-questions` supports R120,000 but says nothing about R50,000. No VAT entry in the register mentions R50,000; the only R50,000 in `sources.json` is a BankservAfrica payment limit. `oldAmount` is checked only against the guide's `start/start-here` text, which is the exact rule pass 2 rejected for the 0% band.
- **The `from` date.** The compulsory VAT card's "From 1 April 2026" comes from `item.from`, which no test checks against anything. The test only asserts that "Start here" contains "from 1 April 2026". Mutation 1 (`2026-03-01`) stayed green, and the card would then print "From 1 March 2026" under SARS's link.

How to reproduce:
```
grep -o '[^"]\{0,60\}50,000[^"]\{0,40\}' src/data/en/sources.json
```
This prints only the BankservAfrica sentence. Then set `from: '2026-03-01'` in `src/lib/home.ts` and run `pnpm exec vitest run tests/unit/site/home.test.ts`: 5 passed.

Suggested fix:
- Require `oldAmount`, and the formatted `from` date (or its "1 April 2026" form), in the cited entry's own `supports` text, the same way as `amount`.
- Drop "Not R50,000" until the register supports it. The old R1 million is supported by `sars--what-is-the-new-threshold-for-vat-registration`.
- Adding the support is a `fix(content):` change to the English register with an official citation.

### minor: the pager's text is broken on every document page
File: src/layouts/Doc.astro (`.st-pager__link { display: flex; … overflow-wrap: anywhere }` with the split `previousParts`/`nextParts` from `c8ca374`)

Acceptance item: general quality (B2 pager; B5 reflow and readability)

What is wrong: The pass 2 fix split "Previous: {title}" into a text node and a `<span lang>`. Inside a flex container each part becomes its own flex item. As a result:
- the space after the colon collapses: "Next:Vehicle dealer", "Vorige:Core: start here";
- when the title wraps, the label item shrinks and `overflow-wrap: anywhere` breaks it mid-word. On `/business-types/` at 1280px it reads "Previo / us:" beside "Privacy notice, POPIA (template)".

The accessible name is correct ("Previous: Privacy notice, POPIA (template)"), so this is visual only, but it affects all 72 document pages in both languages.

How to reproduce: `astro preview`, open `/business-toolkit/business-types/` at 1280px and look at the pager. Or open `/af/core/register/` at 320px.

Suggested fix: Wrap the whole sentence in one inline `<span>` inside the flex link, so the text and the title flow as a single item, or make the link `display: block`. Add the pager to the 320px "sized by its longest word" e2e list.

### minor: the templates index and the drawer describe the fill-in feature, which is not built
File: src/pages/[...locale]/templates/index.astro (lead and meta description from `templates.indexIntro`); src/lib/nav.ts (`nav.toolDescriptions.templates`, shown in the drawer); src/i18n/en.json and af.json

Acceptance item: brief "Out of scope" (WP-32 fillable templates; "build the static … version so those packages only enhance it"); review brief (anything that describes a feature that does not exist yet)

What is wrong:
- `/templates/` says "Fill in a form, check the page, then print it or save it as a PDF." in its lead, its meta description and `og:description`.
- The drawer says "Fill in and print" for Templates. It appears in the built HTML of 47 English pages, and its Afrikaans equivalent on the `/af/` pages.
- The template pages are static documents with no form until WP-32. This is the same class as the wizard links fixed in pass 2.

How to reproduce:
```
grep -o '<p class="st-lead"[^>]*>[^<]*' dist/templates/index.html
grep -l 'Fill in and print' -r dist --include=*.html | wc -l
```

Suggested fix: Until WP-32 lands, use wording that matches the static pages ("Read what each document must show, with a sample layout"). Put the fill-in wording behind a `TEMPLATES_FILLABLE` flag, the same pattern as `WIZARD_AVAILABLE`.

### minor: with the wizard off, the home page's only primary action leads to a search that cannot search
File: src/pages/[...locale]/index.astro:91-103 (hero buttons and lead); src/pages/[...locale]/search.astro (form); src/pages/404.astro (two search forms)

Acceptance item: brief task 3 (features that do not exist yet); B3 flow 1

What is wrong:
- **The hero button.** With `WIZARD_AVAILABLE` false, "I know what I need" becomes the hero's only, primary button, and it goes to `/search/`.
- **The search form.** That page renders a working-looking search field and button whose submission reloads the page and discards the query. It also says, correctly, that search is not ready.
- **The 404 page.** It offers two more such forms.
- **The hero lead.** It promises "only the steps that apply to you", which needs the wizard's profile.

The backlog defers echoing the query to WP-33, and I accept that. The problem is promoting a non-working control to the home page's main action.

How to reproduce: `astro preview`, open `/business-toolkit/`, press "I know what I need", type a query and submit. The page reloads unchanged.

Suggested fix: Until WP-33, point the hero's primary button at the contents page or "Core: start here". Leave the search form out (or put it behind the same kind of flag) on `/search/` and `/404.html`, keeping the common questions and the contents link. Remove "only the steps that apply to you" from the hero lead behind `WIZARD_AVAILABLE`, or reword it.

### minor: ownership: WP-11's `Card.astro` changed and not recorded
File: src/components/ui/Card.astro (new `titleLang` prop, `c8ca374`)

Acceptance item: Review protocol step 2 (file ownership)

What is wrong: The change is small and needed for the pass 2 `lang` fix. However, `backlog.md` records the `TableScroll.astro` and `design-system.astro` cross-package edits and not this one. `docs/design-system.md`'s Card row does not list `titleLang` either.

How to reproduce: `git diff b010d5b...c8ca374 -- src/components/ui/Card.astro`; `grep -n Card docs/reviews/backlog.md` finds nothing.

Suggested fix: Add one line to the backlog's cross-package entry, and add `titleLang` to the Card row in `docs/design-system.md`.

### minor: "Four things that matter early" states a legal rule on the home page with no source or date
File: src/pages/[...locale]/index.astro (the `home-four` section); src/i18n/en.json `home.fourThings.records`

Acceptance item: D5 ("Facts are shown with their date … on the home page … and a link to the specific source"); review brief (every fact outside the markdown sourced and dated)

What is wrong: "Records that you keep for five years" is a retention rule, and "Filing with SARS, even when you earn nothing" is a filing duty. Both are stated in dictionary strings outside the markdown, with no date, no source and no link to the page that sources them. The "three numbers" cards on the same page do all three.

How to reproduce: View `dist/index.html`, section `#home-four`.

Suggested fix: Link each item to the document section that states and sources it (for example `core/tax-and-sars`), or show "AI-checked {date}" with the register entry, the same way as the number cards.

### nit: stale comment on `docLocales`
File: src/lib/pages.ts (`docLocales` JSDoc)

What is wrong: The comment says an Afrikaans page showing English "is not offered as one in `hreflang`". `c8ca374` reversed that policy, and `Page.astro` now lists it.

Suggested fix: Reword the comment to describe what the function is now used for (choosing the content language).

### nit: "Official source" appears twice on each home number card
File: src/pages/[...locale]/index.astro (numbers section)

What is wrong: The link text "Official source ↗" is followed by an "Official source" badge, so a screen reader hears it twice in a row.

Suggested fix: Make the link text the entry's title, or `trust.fact.sourceNamed`, and keep the badge.

### nit: Afrikaans fallback pages describe themselves in English under `og:locale` `af_ZA`
File: src/layouts/Doc.astro (`description={doc.summary}`); src/layouts/Page.astro

What is wrong: The meta description and `og:description` are the English summary, while `og:locale` is `af_ZA`. This follows from the self-canonical policy chosen in pass 2. It is harmless, but a localised prefix (for example `lang.fallbackNotice.title`) would make the snippet honest.

## Verdict

Not clean: 2 blocker, 2 major, 5 minor, 3 nit. Every earlier finding is fixed or deferred in `backlog.md` with a reason I accept, except the one deferral I partly challenge in minor 3. WebKit was not run because it is not installed in this environment.
