# WP-20: the site (content rendering, navigation and every page)

Status: brief, ready to start once WP-10, WP-11, WP-12b and WP-22a are merged into `main`.

This package combines the build plan's WP-20 (components) and WP-21 (pages and layouts). They were planned as two parallel packages. Experience from phase 1 showed that splitting tightly coupled work across agents caused most of the integration churn, so one agent builds it in two milestones, with a commit and a review at the end of each.

Read first: `CLAUDE.md`, `docs/build-plan.md` Parts B and D5, `docs/adr/0006-ai-disclosure-and-accuracy.md`, `docs/design-system.md`, `docs/i18n.md`, `docs/testing.md`.

## What already exists (use it, do not rebuild it)

**Content data (WP-10).** Generated JSON under `src/data/`, typed by `src/lib/content/schema.ts` and loaded through Astro collections in `src/content.config.ts`.
- `Doc`: `id`, `slug`, `route`, `section`, `order`, `kind`, `title`, `summary`, `readingTime`, `appliesTo`, `tags`, `related`, `terms`, `headings`, `blocks`, `generated`, `verification`, `sources`, `sourceNote`, `translation`.
- `Block` kinds: `heading`, `paragraph`, `callout` (`plain` and `note`), `list`, `tasklist`, `table`, `code` (variants `prompt`, `template-preview`, `example`, `listing`, `snippet`), `terms`, `note`, `hr`, `toc`, `glossary`.
- `InlineRun`: `text`, `strong`, `em`, `code`, internal `link` (`doc`, `anchor`), external `link` (`href`), `docref` (to a doc or a section), `placeholder`, `sigline`, `br`.
- Also `glossary.json`, `sources.json`, `tasks.json`, `quick-answers.json`, `manifest.json`, and `content-meta/business-types.json`.

**Design system (WP-11).** `src/layouts/Base.astro`, `src/styles/*`, and `src/components/ui/`: `Badge`, `Button`, `Callout`, `Card`, `EffortMeter`, `EmptyState`, `Icon`, `Kbd`, `ProgressRing`, `SectionHeader`, `TableScroll`, `ToastRegion`, `VisuallyHidden`. Illustrations for the six business types, a general one, and the logo. `/design-system/` shows every component, including the notices and sources pattern for D5.

**Localisation (WP-12, WP-12b).** `src/i18n/en.json` and `af.json`, `t()`, `useTranslations`, `createTranslator`, `formatDate`, `formatRand`, `formatNumber`. `src/lib/paths.ts`: `href`, `basePath`, `localeFromPath`, `routeFromPath`. `src/lib/i18n-routes.ts`: `localeStaticPaths`, `alternateUrls`, `switchLocaleUrl`. The `trust` group holds every string for the AI notice, verification status, sources section, fact labels and reminders.

**Test harness (WP-22a).** Import `test` and `expect` from `tests/e2e/fixtures.ts` in every spec; guards for console errors, CSP violations and other-origin requests are on automatically. `tests/e2e/helpers/exceptions.ts` lists page-check exceptions; remove the home-page entry once the home page uses `Base.astro`. `tests/lighthouse/urls.json` lists the Lighthouse URLs; add the pages you build.

## Milestone 1: rendering and navigation

1. `src/components/content/`: an inline renderer for every `InlineRun` and a block renderer for every `Block` kind.
   - Internal links and docrefs go through `href()` and resolve doc ids to routes from the manifest.
   - External links get `rel="noopener noreferrer"`. Official sources get the Official badge; see D5.
   - `callout plain` renders as the "In plain words" aside, and `callout note` as a note.
   - `table` uses `TableScroll`; tables with 5 or more columns use its stacked mode.
   - `tasklist` renders real checkboxes with stable ids from the task record. Persistence is WP-30.
   - `code prompt` renders the prompt with placeholders marked; the copy button is WP-30 and must enhance, never be required.
   - `code template-preview`, `example`, `listing` and `snippet` render as preformatted text without a copy button.
   - `terms` renders "Words used in this file"; `glossary` renders from `glossary.json`; `toc` renders the contents from the manifest.
   - Placeholders and siglines render visibly and accessibly in templates.
2. `src/components/trust/`: the D5 pieces, built only from existing primitives and `trust.*` strings.
   - `AiNotice`: label, body naming who checked, status and its one-sentence explanation, and the "How this was made" link, in that order. On Afrikaans pages the machine-translation notice sits directly under it in the same header.
   - `SourcesForPage`: entries with official labels and what each supports, an Acts sub-list, or the source note with links to the register and how-this-was-made.
   - Choose the notice body from `verification.status` and whether the page has its own sources.
3. `src/components/navigation/`: skip link, header with the Read and Tools menus, mobile drawer as a native `<dialog>`, breadcrumb, section sidebar, table of contents, language switcher (same page and anchor in the other locale), theme control, footer with the short disclaimer.
4. Tests: unit tests for the renderers' pure helpers, and a Playwright spec that renders every block kind from real data. Milestone review before continuing.

## Milestone 2: pages and routes

1. Pages under `src/pages/[...locale]/` using `localeStaticPaths()`, for every route in build plan B1: home, section landings, every document, the business-types hub and the six type pages, glossary, checklist (static; persistence is WP-30), sources, templates index and the five template pages (static; filling is WP-32), contents, about, 404, and a search page shell that works without JavaScript (the search client is WP-33).
2. `src/layouts/Doc.astro` per B6: header with the AI notice, words-used, contents, blocks, the doc's checklist, sources for this page, previous and next.
3. Every content page shows the AI notice near the top and a sources section. The build must fail if a guide, template, checklist or business-type page renders without one.
4. Afrikaans: every route exists under `/af/`. Where no Afrikaans document exists yet, render English with the fallback notice, `lang="en"` on the content, and correct `hreflang`.
5. Head: canonical, `hreflang` including `x-default`, Open Graph, a meta description on every page, and `theme-color`.
6. Tests: extend the e2e suite so every built route passes the page contract, no-JS and axe checks in both locales; add route-level specs for navigation, language switching with anchors, breadcrumbs, the AI notice and sources on every content page, and 404 under the base path. Add the main page types to `tests/lighthouse/urls.json`.

## Definition of done

- `pnpm gate:fast` green.
- `pnpm build` green, including the link audit, with every route in both locales.
- Playwright chromium, webkit, mobile and nojs green.
- `pnpm test:a11y` green over every sitemap URL.
- No literal colours, no root-relative links, no inline scripts, and no hard-coded UI strings.
- Two review passes: one after each milestone, and a whole-package pass at the end.

## Out of scope here

WP-30 (store, checklist persistence, copy buttons, clear data), WP-31 (wizard and My path), WP-32 (fillable templates), WP-33 (search index and dialog), and the Afrikaans content translation. Build the static, no-JavaScript version of each surface so those packages only enhance it.
