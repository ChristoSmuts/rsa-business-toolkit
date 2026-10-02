# WP-33: search

Status: brief, ready to start. WP-20 is on `main`. Runs alongside WP-30.

Read first: `CLAUDE.md`, `docs/build-plan.md` A7, B3 flow 3, C2 and D4, `docs/design-system.md`, `docs/i18n.md`, `docs/testing.md`.

## What already exists

- `/search/` (`src/pages/[...locale]/search.astro`): a page that works without JavaScript and shows the contents index and the common questions. It hides its form while `SEARCH_AVAILABLE` (`src/lib/routes.ts`) is `false`.
- The header has no search button while the flag is off. `src/lib/nav.ts` adds "Common questions" to the footer while it is off.
- `src/data/<lang>/quick-answers.json`, `glossary.json`, `tasks.json` and the docs' blocks and headings, typed by `src/lib/content/schema.ts`.
- Strings: `search.*` and `about.shortcuts.*` in both dictionaries. Add a key only when none fits, in both files.
- `minisearch` (7.2.0) is in the plan. Check `package.json`; if it is missing, add it in its own `chore(deps)` commit with `save-exact`. It is MIT.

## Build

1. `scripts/build-search-index.ts`, per A7: per language, entries for sections (document + heading to the next heading), glossary entries, document terms, tasks and quick answers, with weights; a tokenizer that keeps form codes (`VAT264`, `SAPS 601` also as `saps601`); lowercase and diacritic stripping; prefix and fuzzy (0.2, terms longer than 4 characters). Write `public/search/<lang>.<hash>.json` (or the Astro equivalent under the base path) and record the file name where the client can find it at build time. Wire it into `pnpm build` before `astro build`. Afrikaans documents fall back to English entries until translated, with `lang` recorded per entry so the UI can mark them.
2. `src/lib/search-client.ts`: loads the current language's index lazily on first use, `search(q, {section?})` returns typed results with `href` built through `href()` plus the anchor. Pure and unit-tested in node.
3. `<st-search>`: the dialog (native `<dialog>`), opened by the header button, `/` and Ctrl+K (never while focus is in a field). Empty state shows the common questions. Results are grouped by section, shown as document › heading with the matched words in `<mark>` (built with DOM APIs, never `innerHTML` with result text), as a listbox with arrow keys, Enter and Escape. Loading, no-results and failed states, each with a link to the contents page. Choosing a result goes to the anchor, and the heading gets focus and a short highlight (respect `prefers-reduced-motion`). The shortcuts on/off setting comes from WP-30's store. If WP-30 has not merged when you get there, read it through one small function in your element and note it for integration.
4. `/search/?q=`: with JavaScript, the page runs the query and shows results in place, and echoes the query. Without JavaScript the form submits to the same page and the contents index stays the answer.
5. 404: suggest results for the words in the missing path when JavaScript runs.
6. Flip `SEARCH_AVAILABLE`, and make every place that reads it right (header button, home buttons, footer link, search page).

The search index never loads on a page until the reader opens search, and on low data (WP-30's `st.lowData`) it is not preloaded. The interactive JS budget is 25 KB gzipped on document pages without the index, 45 KB on tool pages. Measure and record it in `docs/testing.md`. No request leaves the site's origin.

## Tests

- Unit: the A7 cases (`VAT264` puts the vehicle-dealer conditions section in the top 3; `SAPS 601` and `saps601` both hit; `notional` prefix-matches; `PIS` ranks the glossary first), the size budget (400 KB gzip per language), the client's `href` under the base path in both locales, and query highlighting.
- Dom: the dialog opens, closes and returns focus; listbox keyboard handling.
- E2e: press `/`, type `SAPS 601`, open the first result, and the URL hash points at a heading that has focus; Ctrl+K; `/search/?q=` with and without JavaScript; a 404 suggestion; no other-origin requests.
- `pnpm test:a11y` with the dialog open.

## Definition of done

- `pnpm gate:fast` green, pasted verbatim.
- `pnpm build` green (link audit and `dist:trust` included).
- Playwright chromium, mobile and nojs green. WebKit is not installed in the cloud container; say so in the hand-over.
- `pnpm test:a11y` green.
- Coverage of `src/lib/search-client.ts` at least 90%.
- Two consecutive clean review passes (D4), the second by a different reviewer instance.

## Out of scope

Filtering by "my business types" needs the profile (WP-31). Afrikaans stemming. The store itself (WP-30).
