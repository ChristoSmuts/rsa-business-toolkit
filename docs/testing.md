# Testing

This page explains the site-wide test harness: what each suite checks, how to run one page, and how to read the reports.

All browser suites run against the **built** site (`dist/`) served by `astro preview` under the base path (default `/business-toolkit/`). Build first:

```bash
pnpm build          # astro build + pnpm dist:audit
```

## Suites at a glance

| Command             | Where                                        | What it checks                                                                                                |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm test`         | `tests/unit`, `tests/dom`                    | Pure functions (Vitest), including the link audit and the harness rules below                                 |
| `pnpm dist:audit`   | `scripts/dist/audit-links.ts`                | Every HTML file in `dist/`: base path, broken targets and `#fragments`, `<base>`, third-party resources and hints, external forms and meta refresh, inline `on*` handlers, `noopener`, `http:`, `javascript:` |
| `pnpm test:e2e`     | `tests/e2e` (chromium, webkit, mobile, nojs) | Page contract, CSP, no third-party requests, 404 page, no-JS reading, content rendering and navigation        |
| `pnpm test:a11y`    | `tests/e2e/a11y.spec.ts`                     | axe (WCAG 2.0/2.1 A and AA) on every page in light and dark themes                                            |
| `pnpm test:visual`  | `tests/e2e/visual.spec.ts`                   | Screenshot comparison (added in a later package)                                                              |
| `pnpm lhci`         | `tests/lighthouse/lighthouserc.cjs`          | Lighthouse scores and size budgets, desktop and mobile                                                        |

## How pages are discovered

The route-driven specs never hard-code URLs. `tests/e2e/helpers/routes.ts` reads the build output when the spec file loads:

- `sitemapRoutes()` reads `dist/**/sitemap-*.xml` and strips the origin and base path. The home page is `''`, a section is `core/`, an Afrikaans page is `af/core/register/`. If none of the sitemap routes exists in `dist/`, it stops with a `BASE_PATH` mismatch message.
- `allHtmlRoutes()` walks `dist/**/*.html` as a cross-check.
- `pageRoutes()` is what the specs use: every sitemap route plus every built page that is left out of the sitemap on purpose (`404.html`, and `noindex` pages such as `design-system/`). Every built page gets the page checks.
- The `page contract › sitemap and built HTML list the same routes` test (chromium only) fails when a page is built but missing from the sitemap, listed but not built, or listed although it is `noindex`. Documented exclusions are `404.html`, `design-system/` and `af/design-system/`; any page with `<meta name="robots" content="noindex">` is excluded automatically.

Routes are sorted, so test order and titles are stable. Each route gets its own test, titled with its path (for example `/af/core/`).

If `dist/` is missing or has no `index.html`, the run stops before any test with `[e2e] No build output … Run pnpm build first`. The check runs in `tests/e2e/helpers/web-server.ts`, the `webServer` command, because Playwright starts the web server before `globalSetup` and before it loads the specs. Under `PW_DEV=1` (`pnpm test:e2e:dev`) the launcher is not used, and the route-driven specs skip instead.

## The suites in detail

### Page contract: `csp-and-network.spec.ts`

Projects `chromium`, `webkit` and `mobile`. For every page:

- HTTP 200, `<html lang>` starts with `en` or `af`, exactly one `<h1>`, a non-empty `<title>`, one `<meta name="viewport">`.
- Check `csp-meta`: exactly one `<meta http-equiv="Content-Security-Policy">`, a direct child of `<head>`, before any script, style or preload. Its policy must equal ADR 0005 **exactly**: every directive, parsed and normalised (directive and source names case-insensitive, order and repeated sources ignored). A missing, extra or repeated directive, or any added or removed source (`font-src *`, `'unsafe-eval'`, a dropped `data:`), fails. The expected policy is `EXPECTED_CSP` in `tests/e2e/helpers/policy.ts`, and `pnpm test` fails if it differs from the ADR text.
- Check `referrer-meta`: exactly one `<meta name="referrer" content="strict-origin-when-cross-origin">` in `<head>` (ADR 0005, `EXPECTED_REFERRER`).
- Check `no-base-element`: no `<base>` element at all.
- Check `no-inline-script`: no inline `<script>` except `application/ld+json` and `application/json` data blocks.
- URL rules (`documentUrlProblems`, no exceptions):
  - every same-origin `href`, `xlink:href`, `src`, `srcset`, `imagesrcset`, `poster`, `<object data>`, `ping`, `cite`, `action`, `formaction` and meta refresh URL is absolute and starts with the base path;
  - every `#fragment` link resolves to the page itself (a `<base href>` would send it elsewhere);
  - no form `action`/`formaction` and no meta refresh (at any delay) to another origin;
  - no resource or resource hint on another origin: `<link rel="preconnect|dns-prefetch|preload|modulepreload|prefetch|stylesheet|icon|…">`, `src`, `srcset`, `poster`, `data`, `ping`, SVG `href`. `<a>`, `<area>` and purely navigational `<link rel>` values (`canonical`, `alternate`, …) may point anywhere.
- No console errors, page errors, CSP violations or requests to other origins (automatic guard below).

Two build-output tests run once, in chromium: the sitemap cross-check, and `page check exceptions are valid and point at built pages`.

### No JavaScript: `nojs.spec.ts`

Project `nojs` (JavaScript disabled). For every page: a visible `<h1>`, one visible, non-empty `<main>`, every `.js-only` element hidden, and check `nojs-min-text`: at least 20 characters of text in `<main>`.

### Page check exceptions

Every built page must pass `csp-meta`, `referrer-meta`, `no-base-element`, `no-inline-script` and `nojs-min-text`. The only way to skip one is an entry in `tests/e2e/helpers/exceptions.ts`, with the route, the checks, a reason and an expiry (which change removes it). A `no-base-element` exception also lets the page through `pnpm dist:audit`; its `#fragment` links must still resolve to the page.

- Exempt routes always run, even with `E2E_ROUTE_LIMIT`, so sampling cannot hide a stale entry. (`-g` can still filter them out; CI runs everything.)

- An exempt page that passes the check fails the test with `Stale exception: /<route> now passes "<check>"`. Remove the entry in the same change that fixes the page.
- An entry for a route that is not built fails the chromium test `page check exceptions are valid and point at built pages`.
- A missing or empty `reason` or `expires`, an unknown check or a duplicate route fails `pnpm test` (`tests/unit/e2e-harness.test.ts`).
- `expiresOn` is optional: a review date in `YYYY-MM-DD` form. Anything else in that field fails `pnpm test`. Once the date has passed, the chromium `page check exceptions` test prints `[e2e] overdue page check exception: …`, records an `exception-overdue` annotation and, under `CI`, emits `::warning title=Overdue page check exception::…`, so the warning reaches the run summary of a **green** run (the HTML report is only uploaded when a job fails). It does not fail the run: a date alone should not break the build for everyone on one morning.
- Exempt tests carry an `exception:<check>` annotation with the reason and the current problems.

Current list: **empty**. The one entry it held (the placeholder home page, with no meta CSP, no referrer meta and a 19-character `<main>`) was removed when the design system merged and `src/pages/index.astro` started rendering through `Base.astro` — the stale-exception check failed until it went, which is what that check is for.

### Content, trust and navigation: `content.spec.ts`

Projects `chromium`, `webkit` and `mobile`. It runs against `/design-system/content/` and its
Afrikaans twin, the live reference the site package renders from `src/data/`:

- every block kind, fence variant and inline-run kind in `ALL_FEATURES` (`src/lib/content/coverage.ts`)
  is claimed by a demo item on the page **and** produced the markup its renderer promises. The
  expected selector per feature is in the spec, and a feature with no entry fails the test, so
  widening the feature list cannot widen the claim;
- the rendered text of every paragraph in the demo document equals `plainText` of the same runs. The
  inline renderer glues runs together inside a sentence, so this is what catches a stray newline in
  its template rendering "in Glossary ." with a space before the full stop;
- the D5 pieces: the AI notice in its fixed order, its status as the neutral `status` badge with the
  explanation next to it, the sources list with its official labels and "what this source supports",
  the source-note form for a page with no sources of its own, and the Afrikaans fallback notice with
  `lang="en"` on the content;
- navigation: the section and tool links, a `<details>` menu opened from the keyboard, the drawer
  opening and closing on Escape, the breadcrumb, the sidebar, one table of contents at any width, the
  language switcher keeping the `#fragment`, and the footer;
- reflow at 320px in both languages. When the page does scroll sideways the failure **names the
  element responsible**: it hides one element at a time, deepest first, and reports the ones whose
  removal stops the scrolling. A bounding box cannot answer that — the first cause found this way was
  a 1px visually hidden span, absolutely positioned, escaping an unpositioned scroll region;
- the min-content width of every shrink-wrapped component the package adds, each at a width where it
  is on screen. A box that measures zero fails, so a component hidden by a media query cannot satisfy
  the test without being tested.

### The real pages: `pages.spec.ts`

WP-20 milestone 2. The per-route loops run in `chromium` only, because `mobile` and `webkit` render
the same HTML and the `nojs` and `a11y` projects already visit every route; the navigation tests run
in every project.

- **D5 on every document page, in both languages.** The AI notice is the first callout in the article
  header and links "How this was made"; "Sources for this page" lists sources or carries a note; and
  the page links the sources register (the register page itself excepted). `pnpm dist:audit` proves
  each of those links resolves. Two checks make `pnpm build` itself fail first: `Doc.astro` calls
  `assertDocTrust`, so a document whose data has no sources and no note never renders, and
  `pnpm dist:trust` (`scripts/dist/check-trust.ts`, run by `pnpm build` after the link audit)
  fails any built page with an `<article data-kind>` whose header lacks the AI notice with its
  status and its "How this was made" link, or whose "Sources for this page" lists no source and has
  no note with a link to the register. It also fails when the number of document pages is not every
  manifest document in every enabled locale. `SourcesForPage` throws when a page's data lists
  sources that its register does not resolve, so "the sources below" can never sit over an empty
  list.
- **The head of every built page**, read from `dist/` with no browser: a canonical URL that is the
  page itself, `hreflang` with `x-default`, `og:title`, `og:description`, `og:url`, `og:locale`,
  `og:type`, a description of at least 20 characters, and `theme-color`. The `hreflang` set in
  every page's head must equal the one `sitemap-0.xml` gives the same URL. An Afrikaans page that
  shows the English document is still the Afrikaans page for its URL (Afrikaans `<html lang>`,
  navigation and notices), so it is self-canonical and listed in both.
- **The top bar never hides what a link scrolls to.** At 320, 375, 1024, 1100 and 1280px in both
  languages (and at 375, 1024 and 1280px in the `nojs` project), following a contents link must
  leave the heading below the bar's bottom edge. The scroll padding follows the bar's measured
  height, so a bar that wraps to two rows at 1024px still clears its targets.
- **Prompts wrap on a phone.** At 320px no prompt or snippet on `branding/branding-prompts/` scrolls
  sideways; only layouts (template previews, listings) may.
- `dist:trust` also requires the AI notice to say the `trust.aiNotice.body*` sentence that matches
  what the page shows: "the sources below" only over a list of sources, "{reviewer} checked it"
  only when the status names a person.
- `dist:trust` checks language of parts on every Afrikaans page, both ways: a text node that
  inherits `af-ZA` but also appears word for word in the English twin is English read with an
  Afrikaans voice, and one that inherits `en-ZA` but is not in the English twin is Afrikaans read
  with an English voice. Strings both dictionaries share, `<code>`, URLs, all-caps codes, numbers
  and rand amounts are skipped. It found the effort meter's English "(5 of 5)" on its first run.
- **The desktop menus close properly.** Escape returns focus to the summary (also with nothing
  focused, as after a Safari mouse click), opening Tools closes Read (a shared `name`, which works
  without JavaScript too), a click outside, focus moving out and scrolling close the open one, and
  a press on the open list's padding or between its links neither closes it nor crashes the tab.
- **Navigation only real routes can show:** the breadcrumb through a section, the pager crossing
  from one section into the next, a section landing's cards in order, switching language on a real
  document with an anchor that exists on the other side, the Afrikaans fallback with `lang="en-ZA"`
  on the content and Afrikaans chrome around it, and the home page's figures each with an official
  SARS link and its check date.

`not-found.spec.ts` stopped skipping when `src/pages/404.astro` landed.

`nojs.spec.ts` adds the other half of the navigation contract: with scripting off the header's
`<details>` menus are shown at every width and the drawer button is not, so a phone without
JavaScript still reaches every section and tool.

### The store and the interactive pieces (WP-30)

`tests/e2e/interactive.spec.ts` (projects `chromium`, `webkit` and `mobile`) drives the built site:

- **Checklists.** A tick on `core/what-you-need-to-sell-things/` survives a reload, is counted under
  "Checklists on other pages" on `/checklist/`, and is ticked on the Afrikaans twin. A task linked
  to a master task (`sameAs`, `content-meta/task-links.json`; "Get public liability insurance" on
  `business-types/services-trades/`) ticked on its document is ticked on `/checklist/` and counted in
  the ring; unticked or ticked there, it follows on the document, in English and Afrikaans. On `/checklist/`
  the ring, the part bars and the group lines count ticks; "Not done yet" hides ticked items and
  "Everything" brings them back; "Remove ticks" opens its dialog with "Keep my ticks" focused,
  Escape cancels and returns focus to the button, and confirming empties `st.checks.v1` and says so.
- **Storage that throws.** An init script makes `window.localStorage` throw before any page script
  runs: the storage warning shows, the "saved on this device" line goes, and ticks and progress
  still work for the page view. With working storage the warning stays hidden.
- **A changed key.** A tick seeded under a linked task's own id (as saved before the link) is
  moved to the master key when `/checklist/` loads (`renameChecks`, `src/data/task-keys.json`).
- **The banner before paint.** With every bundled module held back by `routeSameOrigin`, the
  banner is already visible (only `theme-init.js` has run); a saved `st.lang` that is not an
  enabled language shows no banner at any point.
- **A restored filter.** "Not done yet" chosen, then the tools element reconnected with the radio
  still checked (what a form-restoring reload does): the ticked item stays hidden.
- **Copy** (Chromium only, which is where Playwright can grant clipboard permissions): the clipboard
  holds the first prompt on `branding/branding-prompts/` **byte for byte** equal to that block's
  `text` in `src/data`, so `compressHTML` or a template change that alters whitespace inside the
  `<pre>` fails here. The button says "Copied", the status line "Prompt 1 copied", and
  `st.prompts.v1` records it. A refusing clipboard (stubbed) leaves the whole prompt selected.
- **Scroll-spy.** At 1280px, following a contents link gives exactly that link
  `aria-current="location"`. At 375px the "Now reading" pill names the section, sits above the
  heading (never over it), and opens the list.
- **Settings.** "Clear all my data" with seeded `st.theme`, `st.lang`, `st.checks.v1`,
  `st.shortcuts` and a WP-31 style `st.profile.v1` leaves **no `st.` key** and keeps a key another app
  owns; the theme and the switches are back to their defaults. Low data sets `data-low-data`, keeps it
  on the next page before paint, and the body no longer uses the web font.
- **Shortcuts.** `?` goes to `/about/#keyboard-shortcuts`, and does nothing once single-key
  shortcuts are off; Alt+→ and Alt+← follow the pager.
- **Language.** Following "Afrikaans" in the switcher saves `st.lang`; the English home page then
  shows the banner in Afrikaans (`lang="af-ZA"`) with a link to `/af/` and no redirect; "Bly op
  hierdie bladsy" saves English and the banner does not come back; closing it hides it for that page
  view only.

`nojs.spec.ts` checks the other side: the checklist ticks and says, once, that ticks are not saved,
with no progress, summary, tools or dialog; prompts have no copy button; the contents have no pill
and no `aria-current`; `/about/` offers no switch and no "Clear all my data", only the line that
some tools need JavaScript; the home page shows no banner. `pages.spec.ts` reads every built page
with a checklist and checks its saving line for whichever value `CHECKLIST_SAVES` has.

**Task keys** (`tests/content/validate.test.ts`, `content:check`): every key in
`content-meta/released-task-keys.json` must still be a key or be carried to one by
`content-meta/task-renames.json`, and every current key must be recorded there. See
`content-meta/README.md` for the rule and the update command.

`a11y.spec.ts` also runs axe, in both themes, with the "Remove all ticks?" dialog open, with the
"Clear all your data?" dialog open, with the language banner showing and with the storage warning
showing.

**Dom tests** (`tests/dom/`, happy-dom): every element connects, round-trips through the store,
disconnects cleanly (a control used after `disconnectedCallback` changes nothing) and is driven by
its native keyboard control; `tests/dom/store.test.ts` loads a fresh store over seeded, corrupt and
throwing `localStorage`. Mount markup with `mount()` from `tests/dom/helpers.ts`: happy-dom connects
elements set through `innerHTML` before their children are parsed, which no real page does.
**Unit tests** (`tests/unit/storage/`, `tests/unit/shortcuts.test.ts`,
`tests/unit/site/checklist.test.ts`) cover the adapter with every way storage fails, migrations,
the per-key reset, `clearAll`, the shortcut matcher and the checklist helpers.

**Coverage floor.** `vitest.config.ts` sets `src/lib/store.ts` and `src/lib/storage/**` to 95%
statements and lines, 90% branches and 100% functions, measured with the unit and dom projects
together: `pnpm exec vitest run --project unit --project dom --coverage`. On the WP-30 build:
`store.ts` 100 / 96.97 / 100 / 100, `storage/` 98.4 / 93.9 / 100 / 100. `pnpm test` does not collect
coverage, so the floors bind only when coverage is run. (That run also reports the `src/lib/content/**`
functions floor at 89%, short of its 100%, because `collections.ts` and `context.ts` are not loaded
by any unit test; this predates WP-30 and is the same at `2744d07`.)

**JavaScript budget.** Plan B3 allows 25 KB gzipped on a document page and 45 KB on a tool page.
`pnpm dist:budget` (`scripts/dist/check-budget.ts`, the last step of `pnpm build`) measures every
built page: every `<script src>` and the chunks it imports, each gzipped (level 9) and summed, once
without a profile and once with the chunks a reader with saved answers can load lazily
(`PROFILE_CHUNKS`). The build fails when a page is over with a profile, and prints the heaviest page
of each kind and the room left. On the WP-30 build the heaviest document page was 15.9 KB; on the
WP-31 build after review pass 5 it is 22.2 KB without and with a profile (it was 24.0 KB and 26.3 KB
before); see
[design-system.md](design-system.md#scripts-csp-and-javascript-budget) for the split.

### Find my path and My path (WP-31)

`tests/e2e/wizard.spec.ts` (projects `chromium`, `webkit` and `mobile`) drives the built site:

- **The wizard with the keyboard.** Space chooses, Enter goes on, focus lands on each step's
  heading, the stepper marks the step; "See my path" saves `st.profile.v1` (types in the order
  ticked) and My path says the answers are saved and shows Path 4 with food beside the dealer.
  "Pty Ltd, growing" is disabled with its reason until step 1 is Pty Ltd. "Edit answers" starts
  from the saved answers. In Afrikaans the same answers are saved and My path is Afrikaans. With a
  `localStorage` that throws, the answers go along in the address and both pages say they are not
  saved.
- **My path.** The empty state without answers; "Mark as done" and back, with the rings on My path,
  in the top bar and on the home page ("Continue: step 2 of 4" to the next page); the checklist hides
  Part A2 and the other kinds of business (still in the page) and shares ticks with `/checklist/`;
  "Remove my answers" (Escape cancels and returns focus; confirming keeps the ticks and focuses the
  heading).
- **Personalisation.** The pager follows the path (with the SBC anchor); "Only what applies to me"
  collapses a company section into its marker, Show brings it back with focus, and the choice holds
  on the next page; without answers the switch points at Find my path; `/checklist/` offers its
  "Only what applies to me" only with answers and counts what it hid; "Fill from my profile" fills
  `[BUSINESS TYPE]`, says what is left, and Undo puts it back.
- **Every result page** (98, read from `dist/` in chromium) lists exactly the steps `buildPath` gives
  for its answers and is `noindex`; `NOINDEX_REQUIRED` in `helpers/routes.ts` fails the route check
  if one loses it.

`nojs.spec.ts`: all three questions show as one form with radios; no result button shows until the
answers are complete, then exactly one, and it lands on the pre-rendered result page; "Pty Ltd,
growing" without a Pty Ltd says why there is no path (in Afrikaans); My path is the empty state;
documents offer no switch, hide nothing and show no "Fill from my profile".

`a11y.spec.ts`, `axe on Find my path and My path`: each wizard step, My path with steps and
checklist, the "Remove your answers?" dialog open, and a document and `/checklist/` with sections
collapsed into their markers, in both themes. The route loop covers `/find-my-path/`, `/my-path/`
and all 98 result pages.

**Dom tests.** `tests/dom/wizard.test.ts` drives `<st-wizard>` on the markup `Wizard.astro` really
renders: `tests/dom/fixtures/wizard.{en,af}.html`. Astro's container API renders components only in
the node project (happy-dom transforms `.astro` for the client), so
`tests/unit/components/wizard-markup.test.ts` renders the component and fails when the fixture
differs. After an intended change to the component:

```bash
pnpm exec cross-env FIXTURE_UPDATE=1 vitest run --project unit tests/unit/components/wizard-markup.test.ts
```

`applies.test.ts` (sections, markers, Show and focus, the three modes, the switch),
`my-path.test.ts` (steps, marks, the address, reset, the top-bar ring, the home card and the pager;
the last three wait for `element.rendered`, because the path data loads lazily),
`prompt-fill.test.ts` and `profile-store.test.ts` cover the rest. **Unit tests**:
`tests/unit/path-engine.test.ts` (the two A5 fixtures against the real Path 1 and Path 4 lists, every
rule, the matching rule, progress and marks), `profile.test.ts`, `path-pages.test.ts` and
`tests/unit/content/paths.test.ts` (every way `paths.json` can disagree with the markdown).

**Coverage floors** (`vitest.config.ts`, unit and dom projects together): `path-engine.ts` 95 / 95 /
100 / 95, `profile.ts` and `profile-store.ts` 95 / 90 / 100 / 95, `path-pages.ts` 95 / 85 / 95 / 95.
Measured on the WP-31 build: path-engine.ts 100 / 98.9 / 100 / 100, profile.ts and profile-store.ts 100 throughout, path-pages.ts 98.0 / 89.7 / 95.8 / 100, scripts/content/paths.ts 98.2 / 95 / 100 / 100.

### 404: `not-found.spec.ts`

Requests `nonexistent-<random>/` and `af/nonexistent-<random>/` under the base path and expects status 404, a visible `<h1>` and no URL problems (`documentUrlProblems`). The tests skip, with the reason shown, until `dist/404.html` exists. The browser's own "status of 404" console message is allowed in these tests. `/404.html` itself also goes through the page contract, the no-JS check and axe.

### Accessibility: `a11y.spec.ts`

Project `a11y` (reduced motion). For every page, in `light` and `dark` themes, runs axe with the tags `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`. The theme is checked again right before the analysis.

- `serious` and `critical` violations fail the test.
- `moderate` and `minor` violations are recorded as annotations (`a11y-moderate`, `a11y-minor`); they do not fail the test.
- The per-test timeout is `PW_A11Y_TIMEOUT` (milliseconds): 60 s in CI, 90 s locally. `--timeout` on the command line overrides it.
- `axe with the interactive states open` (WP-30) runs the same tags with each confirm dialog open, the language banner showing and the storage warning showing, in both themes.
- Build plan C6 also lists the `best-practice` tag. The package brief left it out on purpose. Add it in the package that adds the search dialog, where rules such as `aria-dialog-name` start to matter.

## Fixtures

**Every spec under `tests/e2e/` must import `test` and `expect` from `tests/e2e/fixtures.ts`, not from `@playwright/test`.** Otherwise the automatic guards do not run. Three layers enforce this:

1. **Runtime (the primary control).** The guard fixture adds a `harness-guards` annotation to every test it protects. The reporter `tests/e2e/helpers/guard-reporter.ts` checks every executed test at the end of the run. It fails the run and lists each test that **passed** without the guards, for example after a default import, a re-exporting helper, `test.extend` or a fixture override. Only passing tests must carry the stamp: a failed, timed-out, interrupted or skipped test already fails the run (or ran no body), so it cannot hide an unguarded defect, and requiring the stamp there would misreport an infrastructure timeout (the fixture never runs) as a wrong import. If a command-line `--reporter` replaces the configured reporters, `globalTeardown` (`guard-teardown.ts`) fails the run. Add the reporter back explicitly: `--reporter=list,./tests/e2e/helpers/guard-reporter.ts`.
2. **File names.** Every Playwright project matches only `*.spec.ts`, so a stray `*.test.ts` under `tests/e2e` never runs. `pnpm test` fails when one exists.
3. **Lint (an early signal, not a control).** Every rule below is a syntactic selector, so one level of indirection walks past it: `const target = page; target.request.get(…)` matches nothing, and neither does a `browser.newPage()` moved into a helper. Reviews have defeated two of these rules that way. They exist to fail in the editor before a run costs three minutes; where a property actually matters, the runtime guard above enforces it, and the two rules below that have **no** runtime backing say so. ESLint fails in `tests/e2e/**` (except `fixtures.ts`) on:
   - value imports and re-exports from `@playwright/test`, `playwright`, `playwright/test`, `playwright-core` and their subpaths (type-only imports are allowed);
   - `require`, `import()` and `import x = require()`;
   - `page.route` and its relatives (`context.route`, `unroute`, `unrouteAll`, `routeFromHAR`, `routeWebSocket`);
   - removing listeners;
   - launching or connecting browsers — **lint only**, nothing at run time sees a browser a spec launched itself;
   - `browser.newPage()` / `browser.newContext()` inside `beforeAll` / `afterAll`. Those **are** guarded (see below); the rule is about shared state and about where the report lands;
   - `page.request`, `context.request` and the `request` fixture (`APIRequestContext`, see below);
   - `request.newContext()` — **lint only**, an `APIRequestContext` built that way belongs to no browser context, so nothing can wrap it;
   - `test.fail()` and `test.fixme()`, which would report a guard-only failure as passing;
   - `.extend(`, and `test.use` of the guard fixtures.

Specs that still import directly are listed in `KNOWN_UNGUARDED_SPECS` (`tests/e2e/helpers/guard-policy.ts`). **The list is empty**: `smoke.spec.ts` (WP-00) and `design-system.spec.ts` (WP-11) were switched to the fixtures when their packages merged, so every spec runs the guards. It is frozen by a unit test that asserts the empty list, so putting a spec back is a deliberate edit; the ESLint ignore list must match it (also unit-tested), and a listed spec that starts to use the guards fails the run until its entry is removed.

The guards come in two halves, because only the reporting half needs `testInfo`:

- `harnessWorkerGuards` is a **worker-scoped** automatic fixture. It patches `browser.newContext` for the whole worker and holds the collectors. Since `browser.newPage()` calls `browser.newContext()`, both are covered, from any function, and the patch is in place before `test.beforeAll` runs.
- `harnessGuards` is the **test-scoped** automatic fixture. It guards the `context` fixture (the one behind `page`), applies this test's opt-outs, drains the collectors at teardown and fails the test.

So **every** context a spec creates is guarded: in the test body, in `beforeEach`, in `test.beforeAll`, or through a helper function. **A `test.beforeAll` or `test.afterAll` hook's problems are attributed to the hook, never to a test, and no opt-out can excuse them.** `beforeEach` and `afterEach` are not in that group and cannot be: they run inside the test's own fixture scope, after the setup drain, so what they produce belongs to that test, is drained at its teardown and *is* filtered by that test's opt-outs. The per-test rule still holds — such a hook runs once per test, so an opt-out only ever excuses what happened during its own test, and every other test in the file is still red. What a `beforeAll` hook produced is drained at the *setup* of the next test, before that test's opt-outs are in scope, and reported as `raised before this test started (a test.beforeAll hook, …), so no opt-out on this test applies`; what `test.afterAll` produced fails the worker after its last test (its pages are settled first, so deferred work an `afterAll` started is waited for too). Draining a hook's output at the next test's teardown instead would filter it through that test's `allowConsoleError`, which breaks the per-test rule below: a genuinely broken same-origin asset loaded in a `beforeAll` shipped green that way (review WP-22a pass 5, m1). The ESLint rule against creating pages in those hooks still stays: not that they are unguarded, but that they are shared state and their defects are reported somewhere other than where they happened. Prefer the `page` / `context` fixtures.

As a second net, the guards record every context the browser reports (`browser.on('context')`) with the URLs its pages loaded, and list any that was never guarded — **cumulatively**, so a context that was closed, or parked on `about:blank`, before teardown is still listed (`N page URL(s) were loaded in a browser context that the guards never saw`). Two checks protect that net itself, and they detect exactly this much:

- the `context` listener sits in the same registry as every other guard listener, so `browser.removeAllListeners('context')` is reported as `Guard listener(s) were removed (context)`, like any other removal;
- a liveness check runs **per drain**, over the contexts guarded since the previous drain: when the event reported none of them, the teardown says the check is dead instead of going quiet. Since every test creates a context, that catches both an event that never fires (a Playwright rename) and one that stops firing mid-run. A drain with no newly guarded context checks nothing.

| Guard            | What fails the test                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Console          | `console.error`, uncaught page errors (context `weberror`, including unhandled rejections) and CSP violations, from any page in the context.                                                                                                                                                                                                                                  |
| Network          | Any request or WebSocket to an origin other than the preview server (`data:` and `blob:` are allowed), including one the context's `APIRequestContext` makes (`context.request`, and `page.request`, which is the same object: the guards wrap its `fetch`/`get`/`post`/`put`/`patch`/`delete`/`head`, so an off-origin call throws and is reported). Requests are observed with the context `request` event. It fires even when a spec's own route handler continues or fulfils the request, so a `page.route` cannot hide one: the guard always reports it. A request that no spec route takes is also aborted by the context route, so in that case nothing leaves the machine; a request that a spec route continues is really sent. Identical requests share one entry, which then carries `(×N)`, so the message counts *distinct* requests and says how often each happened. Both guard paths (the `request` observer and the aborting route) report, but they pass the same Playwright `Request` object, so one request is counted once however many guards saw it. |
| Listener removal | A spec removed a guard listener.                                                                                                                                                                                                                                                                                                                                             |
| Opt-outs         | An invalid opt-out (see below).                                                                                                                                                                                                                                                                                                                                              |

**Settle step (bound: 3 s per drain, `SETTLE_CAP_MS`).** Before evaluating, the guard waits on every open page for `load`, then `networkidle`, then for pending `setTimeout` callbacks with a delay of up to 3 s. It runs before each of the three drains: a test's teardown, the next test's setup (for what a `beforeAll` hook left) and the worker teardown (for what a `test.afterAll` hook left). An init script counts those callbacks. So a `console.error` from deferred work after load, or from a timer that fires after the test body returns, still fails the test. There are no fixed sleeps: an idle page adds almost nothing. Not waited for: timers longer than 3 s, `setInterval`, and work that keeps rescheduling past the 3 s cap. A meta refresh with a long delay is caught by the page contract URL rules instead.

`consoleErrors` and `sameOriginGuard.blocked` expose what the guard has collected so far.

**Nothing turns a guard violation into a green run.** Every error the guard throws starts with the marker `[e2e guards]`, and the reporter records it for every attempt of every test. It fails the run when

- a **retry** hid it: CI runs with `retries: 2`, and a guard problem is exactly the kind that shows up on one attempt only, so it would otherwise be reported as `flaky` and the job would go green. Retries still absorb genuine infrastructure flakiness (a browser that times out while setting up `page` never runs the fixture, so no attempt carries the marker);
- **`test.fail()`** hid it: the failure would count as expected, so the test would be reported as passing. ESLint also rejects `test.fail` and `test.fixme` in `tests/e2e/**`.

Known limits of the runtime check:

- a spec can deliberately forge the `harness-guards` annotation. Lint and review cover that, not the runtime check;
- `test.skip(...)` is allowed. The reason is **not** that a skipped test runs no body — `test.skip()` called mid-body means the body ran up to that point. It is that the automatic fixture's teardown runs whatever the result is, and its throw turns the skip into a failure: a mid-body skip after a `console.error` and an off-origin request still fails the test. (`test.fail()` is different: it makes a failure count as expected, so a guard-only failure would be reported as a pass. Both ESLint and the reporter reject it.) Do not "optimise" that teardown away;
- `request.newContext()` builds an `APIRequestContext` that belongs to no browser context, so no guard can wrap or observe it. ESLint is the only control, and it is bypassable;
- a browser a spec launches itself (`chromium.launch()`) is outside every guard. Again ESLint only.

On-demand fixtures:

| Fixture                | Use                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `consoleErrors`        | Errors collected so far (read-only view of the guard).                                                                  |
| `sameOriginGuard`      | `blocked`: other-origin requests seen so far.                                                                            |
| `seedStorage(entries)` | Writes `st.*` localStorage keys before page scripts run. Call it before `page.goto`. Non-string values are JSON-encoded. |
| `setTheme(theme)`      | Seeds `st.theme`, emulates `prefers-color-scheme` and sets `data-theme` on `<html>`. Call it before `page.goto`.        |
| `basePath`             | The base path from `use.baseURL`, for example `/business-toolkit/`.                                                      |

### Opting out for one test

Opt-outs exist only per test, and only in the details of that test's own `test()` call. Build them with `allowConsoleError(match, reason)` or `allowOtherOrigin(match, reason)`:

- `match` must not be empty. `/body/flags` (flags `dgimsuy` only) is a regular expression; anything else is a substring, so `/core/x` matches literally.
- `reason` needs at least 20 characters.

```ts
import { allowConsoleError, allowOtherOrigin, test } from './fixtures';

test(
  'offline banner',
  { annotation: allowConsoleError('/ERR_INTERNET_DISCONNECTED/', 'The test switches the network off on purpose.') },
  async ({ page }) => {
    // …
  },
);

// Matching requests are let through and not reported:
test(
  'external link check',
  { annotation: allowOtherOrigin('https://www.sars.gov.za/', 'Checks that the SARS link still resolves.') },
  async ({ page }) => {
    // …
  },
);
```

Playwright stamps test-level annotations with the test's own location, and the guard checks that location. Each of the following fails the test and the run with a message that names the problem:

- an opt-out in `test.describe(..., { annotation })`, which would cover a whole block;
- an opt-out pushed at run time with `test.info().annotations.push` in `beforeEach`, `beforeAll` or the test body;
- an empty pattern, a short reason or an invalid regex.

The reporter repeats the check for the whole run.

### Intercepting requests

Use `routeSameOrigin(target, baseURL, matches, handler)` from `tests/e2e/helpers/network.ts`. Its handler only sees same-origin requests. ESLint bans `page.route` and `context.route` in specs. The network guard observes every request either way.

`seedStorage` seeds once per browser context. It stores a marker key named `__playwright.seeded.<uuid>` (not an `st.` key), so values that the page changes survive a reload.

### The harness fails when it should (negative scenarios)

Reviews probe the harness with deliberately broken pages and specs. These scenarios were re-run in chromium against temporary probe pages in `dist/` and temporary `tests/e2e/zz-*` files (all removed afterwards). Each one fails with the message shown.

| #   | Scenario (review WP-22a pass 2)                                             | Caught by                                               | Message (abridged)                                                                                          |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 8   | `<link rel>` `preconnect`, `dns-prefetch`, `prefetch`, `preload`, `modulepreload` to a third party | page contract URL rules; `dist:audit`             | `<link href="https://fonts.gstatic.com"> loads from another origin`; `[third-party-resource]`               |
| 9   | `console.error` in `setTimeout(…, 1500)` after load                         | guard settle step                                       | `unexpected console error(s) … late boom 1500 ms after load`                                                |
| 10  | `console.error` 300 ms after the test body ends                             | guard settle step                                       | `unexpected console error(s) … zz late boom after body`                                                     |
| 12  | `<base href>` that sends `#details` to another page                         | `no-base-element`; `dist:audit`                         | `fails "no-base-element"`; `[base-element]`, `[base-fragment] <a href="#details"> resolves against <base …>` |
| 14  | `<form action>` / `formaction` to another origin                            | page contract URL rules; `dist:audit`                   | `submits to another origin …; ADR 0005 form-action 'self'`; `[external-form]`                               |
| 16  | meta refresh to another origin after 4 s (and same-origin outside the base) | page contract URL rules; `dist:audit`                   | `refreshes to another origin`; `[external-refresh]`; `is outside /business-toolkit/`                        |
| 20  | loose CSP (`style-src *`, `img-src *`, `font-src *`, `connect-src *`), `font-src *`, added `'unsafe-eval'` | `csp-meta` (exact ADR 0005 compare) | `CSP font-src is "*", expected "'self'" (extra: *) (missing: 'self')`                                      |
| 22  | spec with `import test from '@playwright/test'`                             | guard reporter (run fails); ESLint                      | `unguarded test: zz-default.spec.ts:4 …`; `'@playwright/test' import is restricted`                         |
| 23  | `tests/e2e/zz-plain.test.ts`                                                | `testMatch` (never listed or run); `pnpm test`; ESLint  | `only *.spec.ts files hold tests … expected [ 'zz-plain.test.ts' ] to deeply equal []`                      |
| 24  | spec importing `test` from a helper that re-exports Playwright's            | guard reporter (run fails); ESLint on the helper        | `unguarded test: zz-reexport.spec.ts:4 …`                                                                   |
| 25  | `test.describe(…, { annotation: allowConsoleError(…) })`                    | guard (test fails) and reporter (run fails)             | `"allow-console-error" is declared at …:36, not on the test itself`                                         |
| 26  | opt-out pushed in `beforeEach` / `beforeAll`; empty opt-out on the test     | guard and reporter                                      | `was added at run time …`; `has no match pattern; an empty pattern would allow everything`                  |
| 27  | `page.route('**/*', r => r.continue())` or `fulfill` around an off-site image | guard request observer; ESLint                        | `1 distinct request(s) left the preview origin … GET http://192.0.2.1/probe.png (image)`                             |
| —   | referrer meta missing                                                       | `referrer-meta`                                         | `no <meta name="referrer" content="strict-origin-when-cross-origin">`                                       |
| —   | `removeAllListeners('console')`; error in a page from `browser.newPage()`   | guard                                                   | `Guard listener(s) were removed (console)`; `unexpected console error(s) … probe error in a new context`    |

Review WP-22a pass 4 found four shapes that put a real `console.error` **and** an off-origin request on a real page and still exited 0, plus two that reached another origin through an `APIRequestContext`. Each is reproduced as a probe and now fails; the pure half of each is a unit test in `tests/unit/`.

| #   | Scenario (review WP-22a pass 4)                                                            | Caught by                                    | Message (abridged)                                                                         |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A   | page opened in `beforeAll`, defect in the body, closed in `afterAll`                       | worker-scope guard                            | `6 unexpected console error(s) … zz A console error`; `GET http://192.0.2.1/A.png (image)` |
| B   | same, but `shared.context().close()` at the end of the body                                 | worker-scope guard (collectors are cumulative) | `… zz B console error`                                                                     |
| C   | `beforeAll` opens a seed page, emits the defect and closes it **inside `beforeAll`**        | worker-scope guard, reported on the first test | `… zz C setup error`                                                                       |
| D   | `beforeAll` page, defect in the body, then `goto('about:blank')` before teardown            | worker-scope guard                            | `… zz D console error`                                                                     |
| E   | same as C but `browser.newPage()` moved into a helper, so **no ESLint rule matches at all** | worker-scope guard                            | `… zz E setup error`                                                                       |
| L   | `const target = page; target.request.get('http://…')` — the alias no lint selector sees     | wrapped `APIRequestContext`                   | `1 distinct request(s) left the preview origin … GET http://127.0.0.1:5692/zzL (apirequest)`        |
| K2  | the `request` fixture                                                                       | the fixture override in `fixtures.ts`         | `the \`request\` fixture is an APIRequestContext that no guard can observe`                |

## Running part of a suite

Run one page by matching its test title (the route path) with `-g`:

```bash
pnpm exec playwright test --project chromium -g "page contract › /core/$"
pnpm exec playwright test --project a11y -g "dark theme › /af/core/register/"
pnpm exec playwright test --project nojs -g "/design-system/"
```

Run a smaller, evenly spread sample of pages (the first and last routes are always included):

```bash
E2E_ROUTE_LIMIT=10 pnpm test:a11y
```

On Windows PowerShell, set variables first: `$env:E2E_ROUTE_LIMIT = '10'; pnpm test:a11y`.

Other variables:

| Variable          | Default                  | Effect                                                                                  |
| ----------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `BASE_PATH`       | `/business-toolkit/`     | Must match the value used for `pnpm build`.                                             |
| `PW_PORT`         | `4321`                   | Port for the preview server. Change it when another checkout already uses 4321.         |
| `PW_REUSE_SERVER` | unset                    | `1` reuses a server already running on `PW_PORT` (for example your own `pnpm preview`). |
| `PW_DEV`          | unset                    | `1` tests `astro dev` instead of the build. Route-driven specs skip.                    |
| `PW_A11Y_TIMEOUT` | 60000 in CI, 90000 local | Per-test timeout of the `a11y` project, in milliseconds.                                |
| `PW_PAGE_SETUP_TIMEOUT` | `120000`           | Budget for creating the `page` fixture, separate from the test timeout. See below.      |
| `E2E_ROUTE_LIMIT` | unset                    | Sample size for route-driven specs.                                                     |

By default Playwright starts its own preview server and fails if the port is already taken, so a server from another worktree is never tested by mistake.

## Reading the accessibility report

A failing test prints one block per serious or critical violation:

```
2 serious/critical axe violation(s) on /core/ (dark):
  - color-contrast [serious] Elements must meet minimum color contrast ratio thresholds
    https://dequeuniversity.com/rules/axe/4.11/color-contrast
      .card > p
      footer a
      ... and 4 more
```

- The first line of each block has the rule id, the impact and a short description.
- The URL explains the rule and how to fix it.
- Up to three CSS selectors show where the problem is.

Every a11y test also attaches the full axe result as `axe-<theme>-<route>.json` (all violations with every node, plus passes and incomplete checks). To see attachments and annotations, open the HTML report:

```bash
pnpm exec playwright test --project a11y --reporter=html
pnpm exec playwright show-report
```

In CI the `a11y` job uploads `test-results/` as the `a11y-report` artifact. Contrast issues in dark mode usually come from token pairs in `src/styles/tokens.css`.

## Link audit: `pnpm dist:audit`

Runs after every `astro build` (it is part of `pnpm build`). It reads every HTML file in `dist/` and prints `dist/<file>:<line> [rule] <tag attr="value"> message` for each problem.

URLs are read from `href`, `xlink:href`, `src`, `srcset`, `imagesrcset`, `action`, `formaction`, `poster`, `ping`, `cite`, `<object data>`, the URL in `<meta http-equiv="refresh">`, and the `content` of Open Graph and Twitter URL tags (`og:url`, `og:image`, `og:video`, `og:audio` and their `:url`/`:secure_url` forms, `twitter:url`, `twitter:image`, `twitter:player`). ASCII tab and newline are stripped before the scheme is read (`java<TAB>script:` is a `javascript:` URL). Entities such as `&sol;`, `&colon;` and `&Tab;` are decoded.

**Not audited:** CSS `url()` in `style` attributes and stylesheets. A cross-origin `url()` is blocked by the CSP and fails e2e as a CSP violation. A same-origin 404 fails e2e as a console error.

| Rule               | Meaning                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `base-path`        | An internal URL does not start with the base path (root-relative `/x`, or path-relative `x/`). Use `href()`.    |
| `missing-target`   | Nothing in `dist/` would be served for the URL. An encoded `/` (`%2F`) never matches a folder. A route in `KNOWN_FUTURE_ROUTES` is allowed to be missing (below).                  |
| `missing-fragment` | `#fragment` does not match an `id` (or `<a name>`) on the target page. `#`, `#top` and text fragments are fine. |
| `noopener`         | `target="_blank"` without `rel="noopener"`.                                                                      |
| `insecure-http`    | An external link uses `http:`.                                                                                   |
| `javascript-url`   | A `javascript:` URL. The ADR 0005 CSP blocks it, and it does nothing without JavaScript. Use a `<button>`.       |
| `base-element`     | A `<base>` element, unless `exceptions.ts` exempts the route from `no-base-element`.                            |
| `base-fragment`    | A `#fragment` (or other relative) link that `<base href>` sends to another page or origin.                      |
| `third-party-resource` | A resource or resource hint on another origin: `<link rel>` other than navigational rels (`preconnect`, `dns-prefetch`, `preload`, `modulepreload`, `prefetch`, `stylesheet`, `icon`, …), `src`, `srcset`, `imagesrcset`, `poster`, `ping`, `<object data>`, SVG `href`. |
| `external-form`    | A form `action` or `formaction` on another origin (ADR 0005 `form-action 'self'` blocks the submit).            |
| `external-refresh` | A meta refresh to another origin, at any delay.                                                                  |
| `inline-handler`   | An inline event-handler attribute: any attribute matching `^on[a-z]+$` except the allowlist `once`, `only`, `online` (`NOT_EVENT_HANDLER_ATTRIBUTES`). Matching by shape rather than by a list of handler names means a handler the HTML spec adds later is reported without anyone editing a list. `script-src 'self'` blocks these, and they are neither an inline `<script>` nor a URL, so nothing else in the harness sees one that never fires during a test. Attach listeners in an `st-*` custom element. |

### Routes that are not built yet

A page can link, correctly, to a route that no package has built yet: a design-system demo of a component a later package wires to its page. Those links are right, so they stay, and the audit gets the exception instead — one entry per route in `KNOWN_FUTURE_ROUTES` (`tests/e2e/helpers/exceptions.ts`), with the route, who links to it, why the link is already correct, which change removes the entry, and an optional `expiresOn` review date. `missing-target` is skipped for exactly those URLs and for nothing else; every other rule still applies, and the fragment of such a link cannot be checked because the page does not exist.

The allowance is built to delete itself. `pnpm dist:audit` fails, naming the entry, as soon as either half of its reason stops being true:

- **the route is built now** — `route "start/how-this-was-made/" is built now (dist serves /business-toolkit/start/how-this-was-made/), so it is no longer a future route`. This is the one that matters: the package that builds the page removes the entry in the same change;
- **nothing links to it any more** — `nothing in dist links to "lookup/sources/" any more, so the allowance is unused`.

A malformed entry fails the audit too, and `pnpm test` (`tests/unit/e2e-harness.test.ts`) validates the list. A green run names what it let through, so the allowance is visible without reading the source:

```
dist:audit: 96 HTML file(s), 13527 URL(s) checked under base /business-toolkit/. No problems.
```

An overdue `expiresOn` prints `dist:audit: overdue known-future route: …` and, under `CI`, a `::warning` workflow command; like a page check exception's review date, it does not fail the build.

Do not add an entry to silence a link that is simply wrong. A link to a route no package will ever build is a bug in the page.

Current list: **empty**. Every route in build plan B1 is built: WP-20 built all but the wizard and
My path, and WP-31 built those two and turned `WIZARD_AVAILABLE` in `src/lib/routes.ts` on, so the
Tools menu, the drawer and the home page link them again.
A link a reader can follow to a missing page is a 404 on the deployed site, whatever the audit
allows, so the flag hides the links rather than this list excusing them. The generated list
milestone 1 needed deleted itself the way it was designed to: the audit failed on each entry whose
route had been built.

Absolute URLs on `SITE_URL` (canonical, hreflang and `og:url`) count as internal. The scanner is a small tokenizer in the script itself (no parser dependency). It ignores comments (including the empty `<!-->` form) and the contents of `<script>`, `<style>`, `<textarea>` and `<title>`.

## Visual baselines

Screenshots live in `tests/e2e/__screenshots__/<platform>/<project>/…`, so Windows (`win32`) and CI (`linux`) keep separate baselines.

- Update local baselines after an intended visual change: `pnpm test:visual:update`, check the new images, then commit them.
- Update the Linux baselines that CI uses: run the "Update visual baselines" workflow (`visual-update.yml`), download its artifact and commit the files under `tests/e2e/__screenshots__/linux/`.
- Until Linux baselines exist, the CI `visual` job prints a notice and passes.

## Lighthouse: `pnpm lhci`

`scripts/ci/run-lhci.mjs` sets `CHROME_PATH`, then runs `lhci autorun` with `tests/lighthouse/lighthouserc.cjs` once for `desktop` and once for `mobile`. Each run starts its own `astro preview` on port 4322, tests every URL three times, and checks the median run against the budget from the build plan (C4):

- Scores: performance ≥ 0.9; accessibility, best practices and SEO ≥ 0.95.
- CLS ≤ 0.01.
- Size limits: scripts ≤ 60 KB, stylesheets ≤ 30 KB, fonts ≤ 200 KB, total ≤ 600 KB.
- No third-party requests.

The CI `lighthouse` job is a hard gate. At the end of the run the launcher prints a summary of every failed assertion, for example:

```
==> Lighthouse CI summary
  [desktop] ERROR categories.seo: expected >= 0.95, found 0.9  (http://127.0.0.1:4322/business-toolkit/)
```

In GitHub Actions the same rows appear as error annotations and in the job summary. Reports are written to `.lighthouseci/desktop/` and `.lighthouseci/mobile/`: HTML and JSON reports, `manifest.json` and `assertion-results.json`.

### Which pages are audited

The committed list is `tests/lighthouse/urls.json` (site-relative paths, `/` is the home page). When a package adds a page type, it adds a representative path in the same change, for example:

```json
{ "paths": ["/", "/core/", "/af/", "/core/register/"] }
```

- Add the heaviest doc page (largest HTML plus scripts), so the 600 KB total budget is checked where it matters (C4), and one Afrikaans page.
- Every listed page must exist in `dist/`. Otherwise `pnpm lhci` stops with `urls.json lists page(s) that are not in dist`.
- Keep the list short: each path runs 3 times per preset.

| Variable      | Default             | Effect                                                                                  |
| ------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `LH_URLS`     | `urls.json`         | Override the list: site-relative paths separated by spaces or commas, e.g. `"/ core/"`. |
| `LH_PRESETS`  | `desktop,mobile`    | Which presets to run.                                                                   |
| `LH_PORT`     | `4322`              | Preview port. The launcher stops early if the port is in use.                           |
| `CHROME_PATH` | Playwright Chromium | Set it to use a different Chrome.                                                       |

Local Windows results are indicative only. The ubuntu CI job is the gate.

## Windows notes

- **Browsers.** Playwright browsers are installed under `%LOCALAPPDATA%\ms-playwright` (`chromium-<revision>`, `webkit-<revision>`). `PLAYWRIGHT_BROWSERS_PATH` overrides the folder; `0` means inside `node_modules`.
- **`CHROME_PATH`.** `node scripts/ci/chrome-path.mjs` prints the Chromium that the installed `@playwright/test` launches (`chromium.executablePath()`), for example `C:\Users\<you>\AppData\Local\ms-playwright\chromium-1243\chrome-win64\chrome.exe`. So Lighthouse and the e2e suites use the same browser build. If that build is not installed, it prints a warning and falls back to the newest `chromium-*` folder. `pnpm lhci` uses it automatically.
- **Astro 7 preview in agent sessions.** When Astro detects an AI coding agent, `astro preview` moves itself to the background and exits, and it refuses to start while another preview holds its lock file. The e2e launcher (`tests/e2e/helpers/web-server.ts`) and `scripts/ci/run-lhci.mjs` set `ASTRO_PREVIEW_BACKGROUND=1` and pass `--ignore-lock`, so the server stays in the foreground and several worktrees can run tests at once (`PW_DEV=1` sets `ASTRO_DEV_BACKGROUND=1`). **These variables are internal Astro markers, not documented settings**: Astro sets them on its own background child (`astro/dist/cli/preview/index.js` line 45 in Astro 7.3). `tests/unit/e2e-harness.test.ts` fails with an explanation if an Astro upgrade removes them. To stop a background preview that you started yourself, run `pnpm exec astro preview stop`.
- **Ports.** Several worktrees on one machine all default to port 4321. Give each run its own port: `$env:PW_PORT = '4461'; pnpm test:e2e`.
- **Page creation is slow, and it is not test time.** Spawning a Chromium renderer costs 22–44 s on a Windows dev machine (measured on 16 logical cores: 22.6 s with the machine idle, up to 44.2 s with eight browsers starting at once; `browser.newContext()` costs 10 ms because it spawns nothing, and WebKit costs about 4.6 s). Playwright charges test-scoped fixture setup to the test timeout, so until this was fixed a 30 s budget had 22.6 s of renderer spawn taken out of it before the first assertion, and any extra load turned into `Test timeout of 30000ms exceeded while setting up "page"` reported against whichever test ran first — usually `page contract › /` and `page contract › /design-system/`, because those are the first two tests in file order. The `page` fixture now has a setup budget of its own (`PW_PAGE_SETUP_TIMEOUT`, 120 s), so the 30 s test timeout is the budget for what a spec actually does. **Do not raise `--timeout` or drop `--workers` to work around a "setting up page" failure**: that was the old advice, and it is what let the harness fail on load rather than on defects. If you see one now, the browser really did fail to produce a page.
  To see that budget can still fail: `$env:PW_PAGE_SETUP_TIMEOUT = '1'; pnpm exec playwright test --project chromium --grep "page contract"` reports `Fixture "page" timeout of 1ms exceeded during setup.`
