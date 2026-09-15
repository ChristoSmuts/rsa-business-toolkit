# SA Business Toolkit web app — build plan

## Context

`docs/rsa-business-toolkit/` holds a plain-markdown toolkit (36 documents, ~68,500 words, 5 fill-in templates) for one person starting and running a business in South Africa as a sole proprietor or a one-person Pty Ltd. The README already promises "a searchable offline web app" generated from the markdown. This plan builds that app with Astro, deploys it to GitHub Pages, keeps all data in JSON, and makes it bilingual (English + Afrikaans, extensible to all 11 official languages), accessible (WCAG 2.1 AA), searchable, and personalised to the reader's entity type, business type(s) and stage.

Decisions already made with the user:
- Afrikaans: UI **and** all 36 documents, AI-translated by agents, flagged as unreviewed machine translation, verified by an automated fidelity check.
- Interactivity: "Find my path" wizard → personalised reading path + checklist + "only what applies to me" filter; checklists persist in localStorage; templates fill in-browser and print to PDF; AI prompts have copy buttons.
- GitHub Pages base path configurable via env, default `/business-toolkit/`.
- Markdown in `docs/` stays the source of truth; a script regenerates committed JSON.
- Local git from the start (`git init`, `main`); remote added at the end.
- Multiple agents build in parallel; every work package is reviewed by a reviewer agent at least twice; Playwright + Vitest + axe + Lighthouse gate completion.

Toolchain verified on this machine: Node 24.19, pnpm 11.22, git 2.51, Playwright 1.63 CLI with chromium/webkit browsers already in `%LOCALAPPDATA%\ms-playwright`. Current package versions (Sept 2026): astro 7.3.2, @astrojs/sitemap 3.7.4, pagefind 1.5.2, minisearch 7.2.0, nanostores 1.5.3, vitest 5.0.1, @playwright/test 1.63.0, @axe-core/playwright 4.13.0, remark 15 / remark-gfm 4 / unified 11, zod 4.6.5, tsx 4.23, astro-icon 1.2.0, @iconify-json/lucide 1.2.132, lefthook 2.1.14, @lhci/cli 0.15.1, eslint-plugin-astro 3.1.0, prettier-plugin-astro 1.0.0.

## Content facts that drive the design (from the inventory)

- One H1 per file, only H2/H3. 49 GFM tables (6 with 4–7 columns). 71 single-line blockquotes: 65 `> **In plain words:**` callouts, 6 unlabeled notes in templates.
- 55 fenced code blocks, all untagged: 34 AI prompts (02 Branding + 2 in business types), 9 template renderings (61-hyphen rules inside), literal examples and one stale box-drawing folder tree in `00 Start here/00-start-here.md`.
- 145 `- [ ]` tasks in 6 files (master checklist 91). Business-type "Your checklist" sections use ordered lists (normalise to tasks).
- Bold-only lines act as sub-headings in the master checklist and as source titles (`**[Official] SARS — Turnover Tax**` + bare URL + `Supports:` line) in the sources register. Glossary is 121 `**Term** — Definition` lines in 7 groups.
- "Words used in this file": first H2 in 19 files, identical intro + `| Word | Meaning |` table.
- Footer disclaimer: 29 files, `---` then one italic line (4 path/date variants). Templates and two Start-here files have none.
- 614 internal links (526 `%20`-encoded, 298 with GitHub-style anchors), zero external markdown links; 114 bare URLs (113 in sources register) plus bare domains in prose.
- Old-scheme inline-code refs (`` `01-core/04` ``, `` `04-business-types/02` ``, `` `03-documents/01` ``, `` `02-branding-and-marketing/01a` ``) need a resolver map to real docs.
- Placeholders `[SQUARE BRACKETS]` in 5 flavours; nested `[If a company: ... [REGISTERED NAME] (Pty) Ltd ... [NUMBER] ...]` (4×) parses as a link in CommonMark: handle before parsing.
- Applicability markers: core docs 06–08 are Pty-only; H2/H3 starting `If you are a sole proprietor` / `If you have a registered company` / `If you trade as a company` / `Part A2: extra, only if you registered a Pty Ltd`; task items prefixed `If a company:` / `If working from home:`; `01 Core/04` is a `## If you sell food|online|...` dispatch table; business-type files have H1 `Business type: ...` and end with `Branding and marketing notes` → `Your checklist`.
- Em dash U+2014 is a load-bearing separator; never normalise.

## Architecture summary (one paragraph)

Astro 7 static site (`output: 'static'`, `base` from `BASE_PATH`, default `/business-toolkit/`), zero UI framework: vanilla TypeScript modules and a nanostores-based persistent store for the few interactive islands. Markdown in `docs/rsa-business-toolkit/` (EN) and a mirror tree `docs/rsa-business-toolkit-af/` (AF) are parsed by `scripts/build-content.ts` (unified + remark-gfm → typed block JSON) into committed JSON under `src/content/`, validated by Zod through Astro content collections. Block ids are derived from English headings (github-slugger, so the 298 existing INDEX.md anchors keep working) and shared by every language. MiniSearch indexes are built per language at build time and fetched lazily. Design system "Stoep" (token prefix `--st-`), Lucide icons via astro-icon, fonts Fraunces + Instrument Sans self-hosted. Tests: Vitest (parser, fidelity, path engine, i18n, search, contrast), Playwright (e2e, axe, visual, print), Lighthouse CI. CI/CD via GitHub Actions to Pages.

Naming decisions that unify the three sub-plans:
- Doc ids: `start/*`, `core/*`, `branding/*`, `paperwork/*`, `paperwork/templates/*`, `business-types/*`, `lookup/*`. Route slugs come from a `route` field in `content-meta/docs.meta.json` so tools get short URLs (`/glossary/`, `/checklist/`, `/sources/`, `/templates/quotation/`) while guides live under their section (`/core/register/`).
- localStorage keys: `st.profile.v1`, `st.checks.v1`, `st.theme`, `st.lang`, `st.prompts.v1`, `st.template.<id>.v1`, `st.seenVersion`, `st.shortcuts`, `st.lowData`.
- Locales: `en` unprefixed, `af` under `/af/`; hreflang `en-ZA`, `af-ZA`, `x-default` = en.

## Part A — Content pipeline, data model, search, i18n

### A1. Libraries
`unified`, `remark-parse`, `remark-gfm`, `@types/mdast`, `unist-util-visit`, `mdast-util-to-string`, `github-slugger`, `tsx`, `zod` (import `z` from `astro/zod` so scripts and collections share one instance), `minisearch`, `@astrojs/sitemap`. No glob lib (Node 24 `readdirSync({recursive:true})`), reading time = words/200.

### A2. File layout
```
content-meta/            hand-maintained, committed
  docs.meta.json         source path → id, route, section, order, kind, appliesTo, tags, fenceVariant, fenceOverrides, blockOverrides, hideSections, summary
  legacy-refs.json       `01-core/04` etc → doc ids (bare folders → section ids)
  business-types.json    taxonomy + "general" preset
  paths.json             wizard rules (Paths 1/2/4 + checklist assembly)
  markers.json           per-language literal markers (In plain words / In gewone taal, Supports / Ondersteun, Words used heading, footer prefix, month names)
  applicability.json     per-heading / per-task overrides
  translations.json      per-doc translation status
docs/rsa-business-toolkit/      EN source (unchanged)
docs/rsa-business-toolkit-af/   AF source, identical relative paths
scripts/
  build-content.ts             orchestrator: --lang --doc --check --report --fidelity-only --allow-partial --allow-stale
  content/{discover,parse,inline,refs,fences,ids,meta,facts,fidelity,write}.ts
  content/special/{glossary,sources,checklist,terms,footer}.ts
  build-search-index.ts        → public/search/<lang>.<hash>.json (gitignored)
  translate/{STYLE-GUIDE-af.md,TERMS-af.json,status.ts}
src/content/                   generated, committed
  manifest.json, schema.ts
  <lang>/docs/<section>__<slug>.json, <lang>/glossary.json, <lang>/sources.json, <lang>/tasks.json
src/content.config.ts          Astro collections (glob/file loaders + Zod)
src/i18n/{locales.ts,index.ts,en.json,af.json}
```
npm scripts: `content:build`, `content:check` (regenerate to temp and diff, exit 1 on drift), `content:fidelity`, `search:build`, `prebuild = content:build && search:build`.

### A3. Parse stages (per doc, per language)
1. Discover via `docs.meta.json`; unlisted `.md` not in the explicit `ignore` list (INDEX, README, complete.md) is a build error.
2. CRLF→LF only; all hazard handling is post-parse on the AST.
3. remark-parse + remark-gfm → mdast.
4. Footer strip: trailing `thematicBreak` + italic paragraph starting with the language's footer marker → `doc.generated = {date, tool}`; both nodes removed.
5. Structural transform → `Block[]`: H1 → title; H2/H3 → `heading` (id = github-slugger per doc); bold-only paragraph → `heading{depth:4, pseudo:true, ref?}` (not in sources/template docs); italic-only paragraph in templates → `note`; blockquote starting with the plain-words marker → `callout{style:'plain', pairsWith: previous block id}` else `callout{style:'note'}`; tables → `table`; lists with checkboxes → `tasklist`; ordered lists under a heading matching `/checklist/i` (`/kontrolelys/i`) → `tasklist` (normalises the six business-type files); a paragraph ending in `:` directly before a tasklist becomes its `group`; fenced code → classified (stage 7); `thematicBreak` → `hr`; anything else → build error.
6. Inline transform → `InlineRun[]`: text/strong/em/code/br; in template docs soft breaks become `br`; internal links: decode `%20`, resolve `../`, map to doc id (+ anchor kept verbatim), unresolvable = error; inline code matching the old scheme → `docref` via `legacy-refs.json`, unmatched = error (so the map is proven by the 576 usages); bare URLs and bare domains (`inforegulator.org.za`) → external links; `[...]` in templates and prompt fences → `placeholder{v, style: identity|field|format|choice|instruction, nested?}` with a depth-aware scanner (unit test asserts remark yields no link node for the 4 nested-bracket lines); 10+ underscores → `sigline`.
7. Fence classification, first match wins, unclassified = build error until overridden: 20+ hyphen line → `template-preview`; box-drawing chars → `listing` (the stale tree in start-here is replaced by a `toc` block via blockOverrides); doc default `fenceVariant` (`prompt` for the 5 branding docs, `snippet` for what-has-changed); contains placeholder or starts `I `/`My `/`Here is`/`Stop.` → `prompt`; ≤3 lines → `example`.
8. Special docs by `kind`: `glossary` (em-dash split → `{id: slug(EN term), term, definition, group}`), `sources` (legislation table → `acts[]` with `appearsIn` resolved incl. `all business types` expansion; bold-title + URL line + `Supports:` line → `SourceEntry{official, url, supports, group, notes}`), `checklist`/any tasklist → `Task{id = docId + ':' + sha1(normalised EN text).slice(0,8), when}` with prefix parsing (`If a company:` → entity pty; `If working from home:` → tag home; `For a vehicle:` → vehicle-dealer), master checklist Part B groups tagged by the pseudo-heading `ref`, Part A2 tagged pty; `terms` (first H2 "Words used…" + table → `terms` block and `doc.terms`); `template` (br preserved, placeholders, no pseudo-heading promotion).
9. Overrides by block id (`blockOverrides`, `hideSections`, e.g. hide "Making the files easier to use").
10. Ids: non-heading blocks `<headingSlug>.<n>` (`intro.<n>` before first heading); `hash = sha1(source slice)`; AF blocks carry `sourceHash` = EN hash.
11. Metadata: title, summary (first paragraph ≤200 chars or override), readingTime, related (top-5 link targets excluding lookup/*), `appliesTo` doc-level from meta + heading-level inference (`If you are a sole proprietor` → sole-prop; `registered company|trade as a company|Pty Ltd|Part A2` → pty; in `core/what-you-need-to-sell-things`: food→food, beauty→beauty, online/second-hand/import→retail-online, professional→professional-creative) with `applicability.json` overrides; report printed for review.
12. Fidelity check (A6) then deterministic write (sorted keys, LF); `--check` mode diffs.

### A4. Schema (Zod in `src/content/schema.ts`, types inferred)
```ts
type Lang = 'en'|'af'|'zu'|'xh'|'st'|'tn'|'nso'|'ts'|'ss'|'ve'|'nr';
type Entity = 'all'|'sole-prop'|'pty';
type BusinessTypeId = 'vehicle-dealer'|'food'|'beauty'|'retail-online'|'services-trades'|'professional-creative';
type SectionId = 'start'|'core'|'branding'|'paperwork'|'business-types'|'lookup';
type DocKind = 'guide'|'template'|'glossary'|'sources'|'checklist';
type InlineRun = {t:'text',v} | {t:'strong',c} | {t:'em',c} | {t:'code',v} | {t:'link',doc,anchor?,c} | {t:'link',href,external:true,c} | {t:'docref',doc,label} | {t:'placeholder',v,style,nested?} | {t:'sigline'} | {t:'br'};
interface Applicability { entity?: Entity; businessTypes?: BusinessTypeId[]; tags?: string[] }
type Block = {id,hash,sourceHash?,fallback?} & (
  | {kind:'heading',depth:2|3|4,pseudo?,c,ref?,appliesTo?} | {kind:'paragraph',c} | {kind:'callout',style:'plain'|'note',c,pairsWith?}
  | {kind:'list',ordered,start?,items:InlineRun[][]} | {kind:'tasklist',group?,items:Task[]}
  | {kind:'table',header,rows,align} | {kind:'code',variant:'prompt'|'template-preview'|'example'|'listing'|'snippet',text,placeholders?}
  | {kind:'terms',intro,items:{term,meaning}[]} | {kind:'note',c} | {kind:'hr'} | {kind:'toc'} | {kind:'glossary'} | {kind:'sources'});
interface Task { id; c: InlineRun[]; when?: Applicability; doc; block }
interface Doc { id; lang; slug; route; section; order; kind; title; summary; readingTime; appliesTo:{entity, businessTypes: BusinessTypeId[]|'all'}; tags; related; terms; headings:{id,depth,text,appliesTo?}[]; blocks; generated?; translation?:{status:'source'|'machine-unreviewed'|'reviewed'|'fallback', sourceLang}; archived?; sourcePath }
interface GlossaryEntry { id; term; definition; group; groupId }
interface SourceEntry { id; group; title; official; url; supports; notes? }   interface Act { name; governs; appearsIn: string[] }
interface Manifest { sections; docs: Record<id,{slug,route,section,order,kind,titles,langs}>; langs; searchIndex: Record<Lang,string> }
```
Doc-level `appliesTo.entity = 'pty'` for `core/running-a-pty-ltd`, `core/paying-yourself`, `core/adding-new-lines`; business-type docs set their own type; everything else `all`.

### A5. Taxonomy and wizard rules
- `business-types.json`: six types with `doc`, `order`, `effort` (lowest…high, from the pick-your-business-type table), `masterChecklistGroup` (pseudo-heading id in the master checklist). Preset `general` expands to `retail-online`, `services-trades`, `professional-creative`; `vehicle-dealer`, `food`, `beauty` must be ticked explicitly (they carry licensing regimes). Profile = `{entity:'undecided'|'sole-prop'|'pty', businessTypes[], stage:'not-started'|'trading'|'pty-growing'}`; first selected type is primary.
- Matching rule everywhere: applies if `(appliesTo.entity==='all' || entity==='undecided' || appliesTo.entity===entity) && (businessTypes==='all' || intersection non-empty)`. Filtered sections collapse to their heading with a "Hidden: applies to Pty Ltd only — Show" chip; nothing is removed from the DOM.
- `paths.json`: rules `not-started` (= Path 1, step 3 expands to `$businessTypes`, step 10 only when entity pty/undecided), `trading` (= Path 2), `pty-growing` (= Path 4 generalised: core start, running a Pty, paying yourself, `$businessTypes`, vehicles when vehicle-dealer, tax SBC anchor, templates, branding, working from home, adding lines). Checklist assembly: `master.partA` always (tasks filtered by `when`), `master.partA2` when pty, `master.partB.<type>` per type, `master.partC` rows filtered by entity, then each type doc's own "Your checklist" as a detailed tier. Path 3's question table becomes `quick-answers` for the search dialog.
- `src/lib/path-engine.ts`: pure `buildPath(profile, manifest, paths)`; fixtures: `{pty,[vehicle-dealer],pty-growing}` → exactly Path 4's ten docs in order; `{undecided, general, not-started}` → Path 1 with three type docs at step 3.

### A6. Localisation and translation workflow
- Astro i18n: `defaultLocale:'en'`, `locales:['en','af']`, `prefixDefaultLocale:false`, `redirectToDefaultLocale:false`. `src/i18n/locales.ts` is the single source for config, sitemap, switcher (code, nativeName, hreflang, status).
- UI strings: `src/i18n/en.json` canonical; `t(lang,key,params)` with typed keys and EN fallback (dev warning). Vitest asserts identical key sets, no empty strings, matching `{param}` names.
- AF content source: `docs/rsa-business-toolkit-af/` mirror tree; AF JSON mirrors EN block-for-block with the same ids. `translations.json` sets `machine-unreviewed` for all 36; flipping to `reviewed` is a one-line edit.
- Translation agents (one doc per agent, parallel): inputs = EN path, AF path, `STYLE-GUIDE-af.md`, `TERMS-af.json`; loop `pnpm content:fidelity --lang af --doc <id>` until clean. Style rules (checked ones enforced by fidelity): identical block structure and order; digits, rand amounts, percentages and punctuation byte-identical (`R2.3 miljoen`, `R120,000`); form codes (ITR14, IRP6, VAT264, VAT101, EMP201, EMP501, SAPS 601, CoR 14.3, CoR 40.5, R638, R146…) verbatim; URLs and link targets verbatim, link text translated; placeholders translated but bracketed, same count; act names keep English (`Companies Act 71 of 2008`); callout label exactly `**In gewone taal:**`; `Supports:` → `Ondersteun:`; Words-used heading fixed; footer starts `*Deur KI gegenereer`; fixed terminology (SARS, CIPC, POPIA, Pty Ltd, eFiling, BizPortal, PayShap unchanged; VAT→BTW in prose only; sole proprietor→eenmansaak; provisional tax→voorlopige belasting; turnover tax→omsetbelasting); "jy" register; `example`/`listing`/`template-preview` fences untranslated except field labels.
- Fidelity check (build-failing, per doc): equal block count and per-position kind/depth/style/variant/column and item counts; multiset equality of numbers, rand amounts, percentages, form codes, normalised dates, multiplier words and `s12(3)` refs per block (text runs only, never hrefs; `%20` and `CoR 14.3` guarded); identical link/docref sequences; equal placeholder counts and identity-style; code variants equal, untranslated variants byte-equal; glossary ids and source URLs positionally equal; task ids copied from EN by position; `sourceHash` current (stale → fail unless `--allow-stale`). `--allow-partial` (rollout only) emits EN copies with `fallback:true` for `<<TODO>>` blocks.
- Render fallback: `/af/` `getStaticPaths` iterates the EN manifest; missing AF doc renders EN with `translation.status='fallback'` and a banner; fallback blocks get `lang="en"` and a marker. hreflang alternates per doc; `@astrojs/sitemap` with `i18n` locales; `<html lang>` per page. Heading ids are EN slugs in every language so anchors and search deep links are shareable across languages.

### A7. Search (MiniSearch, decided over Pagefind)
Reasons: results are typed (section, glossary term, doc term, task, quick answer) with stable anchors and applicability facets; Afrikaans and the other nine languages have no Snowball stemmer so prefix + fuzzy is the realistic strategy (Pagefind is prefix-only); testable in Vitest without a site build. Budget: ≤400 KB gzip per language index (test-enforced); shard by section if a language exceeds it.
- `scripts/build-search-index.ts`: per language, docs = sections (`id 'core/register#popia-…'`, title, docTitle, breadcrumb path, plain text of blocks to next heading, section, entity, businessTypes, weight 1), glossary entries (weight 3), doc terms (2), tasks (1.5), quick answers (2). Options: fields title/text/path; tokenizer keeps form codes (`VAT264`, `saps601` alias); `processTerm` lowercases and strips diacritics; `prefix:true`, `fuzzy` 0.2 for terms >4 chars, `boost {title:3, path:1.5}`, `boostDocument` by weight, `filter` by facets. Serialised to `public/search/<lang>.<hash>.json`; hash recorded in `manifest.json`.
- `src/lib/search-client.ts`: lazy-load current language index on first open; `search(q, {section?, types?, entity?}) → Result[]` with `href = localeUrl(doc) + '#' + anchor`.
- Tests: `VAT264` → vehicle-dealer conditions section in top 3; `SAPS 601` and `saps601` both hit; `notional` prefix-matches; AF typo `belastng` matches `belasting`; `PIS` ranks glossary first; food filter excludes vehicle sections; size budget. Playwright: press `/`, type `SAPS 601`, open first result, assert hash targets a heading.

### A8. Astro content integration
Astro content layer collections (`glob`/`file` loaders, Zod): `docs` (id `${lang}/${docId}`), `glossary`, `sources`, `tasks` (per language), `manifest`, `businessTypes`, `paths` (superRefine: every referenced doc/anchor exists). Block schema uses `z.discriminatedUnion('kind')` and `z.lazy` for `InlineRun`. Scripts validate output with the same schemas before writing. UI dictionaries are plain typed JSON imports (needed synchronously in client islands).
Content validation test (`tests/content/validate.test.ts`): every link/docref target exists and every anchor resolves; every `#anchor` in the original INDEX.md resolves; every file parses against the schema; sources `appearsIn` ids exist and URLs are https (official hosts allowlist warns); all 36 docs present per language; task ids unique; `paths.json` references resolve; glossary ids unique; forbidden stale strings (e.g. "R1 million" as VAT threshold) absent.

## Part B — Information architecture, UX, design system "Stoep", accessibility

### B1. Routes (EN unprefixed, AF twin under `/af/`, all trailing-slash)
```
/                       home (personalised "Your path" card when a profile exists)
/find-my-path/          wizard (3 steps; no-JS: one form submitting GET to /my-path/)
/my-path/               dashboard: ordered path, personalised checklist, progress, edit answers
/search/?q=             full-page search (no-JS/shareable fallback for the dialog)
/contents/              full site map (every doc + heading) = INDEX.md
/start/ …/start-here/ …/how-to-use/ …/how-this-was-made/ …/what-has-changed/
/core/ + 10 docs (register, tax-and-sars, what-you-need-to-sell-things, vehicles, running-a-pty-ltd, paying-yourself, adding-new-lines, working-from-home-and-safety, you-are-the-business, start-here)
/branding/ + 5 docs     /paperwork/ + which-template-to-use-when, free-tools
/business-types/        hub (tiles, "If you…" routing list, effort meters) + 6 type docs
/look-it-up/            landing with 3 tool cards
/glossary/#<term>  /checklist/  /sources/#<entry>
/templates/  /templates/{quotation,invoice,tax-invoice,receipt,privacy-notice}/
/about/                 AI disclosure summary, licence, keyboard shortcuts, settings (shortcuts, low data, reset local data)
/design-system/         live Stoep reference (noindex, footer link)
/404.html
```
Number prefixes stripped from slugs; ordering from `order`. One `url(path, lang)` helper prepends base + locale everywhere.

### B2. Navigation
- Top bar (sticky, 56px): wordmark · Read menu (5 sections) · Tools menu (My path, Checklist, Templates, Glossary, Sources) · Search button with `/` kbd hint · LanguageSwitcher · ThemeToggle. <1024px: hamburger → full-height `<dialog>` drawer (Find my path / My path with progress, search field, sections as accordions, tools, language, theme).
- Section sidebar (doc pages ≥1024px, 272px, sticky): ordered doc list with numbers, applies-to badges ("Pty Ltd only" on core 06–08), tick when the doc's checklist is complete, "Only what applies to me" switch (when profile exists).
- In-page TOC (≥1280px, 240px, scroll-spy, reading-progress ring); below that a `<details>` "On this page (N sections)" under the header plus a sticky current-section pill.
- Breadcrumbs on every non-home page (`aria-current="page"`); mobile shows parent crumb only. Prev/Next pager follows the personalised path when present, else section order.

### B3. Key UX flows
1. First visit → Hero "Find my path" / "I know what I need" (search). Wizard: step 1 entity (radio cards: sole prop / Pty Ltd / not decided, with "What's the difference?" link preserving return), step 2 business types (checkbox tiles + "General: I sell or do many things"), step 3 stage (Pty-growing disabled with reason unless entity = Pty). "See my path" saves `st.profile.v1`, lands on `/my-path/` with tip "Saved on this phone only. Nothing is sent anywhere."
2. Returning: home shows "Continue: step N", progress ring in top bar; content-version change shows a dismissible notice linking to what-has-changed.
3. Search-first: `/` or Ctrl+K opens dialog; empty state shows "Common questions" (Path 3 table, top 8) and filter chips; results grouped by section as doc › heading with `<mark>` snippets; Enter navigates and the target heading gets focus + 2s highlight; loading and failure states with links to Contents.
4. Long doc on a phone (vehicle dealer): read time and layer count in header; `<details>` TOC; 2px progress bar; sticky current-section pill; "In plain words" callouts never collapsed; wide tables scroll in a labelled region with edge shadows, and ≥5-column tables stack into labelled cards under 640px; interactive checklist at the end; back-to-top after 2 screens.
5. Fill and print an invoice: notice "saved on this device only"; profile pre-fills business fields; desktop form | live A4 preview, mobile tabs Fill in / Preview; line items with computed totals (Subtotal, VAT 15%, Total; `R 1 234.56`), `aria-live` totals; soft validation "6 of 7 required items present"; Print/Save as PDF calls `window.print()` with a sheet-only print stylesheet; Clear (confirm) and "Start next invoice" (increments number).
6. Copy a prompt: monospace pane, placeholders as `<mark>`; Copy → "Copied ✓" + polite announcement, clipboard failure falls back to select-text; "Fill from my profile" replaces known placeholders and reports how many remain; numbered prompt stepper with ✓ for copied prompts.
7. Switch language: switcher is plain links to the same slug under the other prefix (`lang`, `hreflang`, `aria-current`); choice saved; next visit to `/` offers "Gaan voort in Afrikaans" banner rather than auto-redirecting; AF pages show a non-dismissible MT notice; EN-fallback blocks get `lang="en"` and a tag; ticks/profile/theme are language-independent.
8. Checklist ticks: `st.checks.v1 = {[taskId]: ISO}`; ticking updates group progress, page ring and top-bar ring via the store; private-mode storage failure shows a notice and still works for the session.
9. Low data: no raster images; six business-type illustrations are inline SVG (<2 KB); two self-hosted variable fonts (latin + latin-ext), `font-display: swap`; `prefers-reduced-data` and a footer "Low data" toggle disable webfonts and index preloading; JS budget ≤25 KB gz on doc pages, ≤45 KB on tool pages; islands `client:visible`/`client:idle`.

### B4. Design system "Stoep" (`src/styles/tokens.css` is the only file allowed to contain colour literals)
Principles: plain first; warm not corporate (paper, earth, veld); colour never carries meaning alone; fast on a cheap phone; one source of truth.

Colour (light / dark), all pairs verified WCAG: bg `#FBF8F3`/`#15130F`; surface `#FFFFFF`/`#1F1C17`; surface-2 `#F3EEE5`/`#292520`; text `#1E1B16`/`#F1ECE2`; text-muted `#5C5648`/`#B3AA99`; border (decorative) `#DDD5C7`/`#3A342B`; border-strong (controls, ≥3:1) `#7D7362`/`#8C8271`; primary (veld green) `#1E5A3C`/`#7CC79A`, hover `#174730`/`#A9E0BE`, on-primary `#FFFFFF`/`#0E2A1B`, primary-soft `#E3F0E8`/`#1B3A29` with on-soft `#174730`/`#A9E0BE`; accent (rooibos) `#B5561A`/`#E8A25C`, accent-text `#9A4A10`/`#E8A25C`, on-accent `#FFFFFF`/`#2A1A08`, accent-soft `#FBEBDD`/`#3A2410` with on-soft `#7A3A0C`/`#F5C89A`; link = primary, visited `#4A3F8F`/`#B3A6EE`; focus = accent; success/warning/danger/info bg+text: `#E3F0E8`+`#174730`, `#FFF3D6`+`#7A4B00`, `#FCE6E4`+`#8F2323`, `#DDF0EF`+`#155A5A` (dark: `#1B3A29`+`#A9E0BE`, `#3A2A08`+`#F5C86A`, `#3E1A18`+`#F4A5A0`, `#0F3333`+`#8FD3D0`); mark-bg `#FFE9A8`/`#5A4A12`; section hues start `#8A5A00`/`#E6B85A`, core `#1E5A3C`/`#7CC79A`, branding `#9C2E63`/`#E48BB4`, paperwork `#1F6B6B`/`#79C9C4`, types `#A3401A`/`#EE9A72`, lookup `#4A3F8F`/`#B3A6EE`. Verified ratios: text on bg 16.2/15.8; muted on bg 6.9/8.1; on-primary on primary 8.1/7.7; on-accent on accent 4.9/7.8; accent-text on bg 5.9/8.6; focus ring on bg 4.6/8.6; border-strong on bg 4.4/4.5; section hues as text ≥5.6 light, ≥7.6 dark. Rules: decorative border never conveys a control boundary; section hues used for text/stripes/icons and as `color-mix` 12% tints with `--st-text` on top. Theme: tokens on `:root`, overridden under `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`; inline head script applies `st.theme` before paint; `color-scheme: light dark`.

Typography: headings/display **Fraunces** (variable, `@fontsource-variable/fraunces`, opsz 144 display / 48 headings, weight 600); body/UI **Instrument Sans** (`@fontsource-variable/instrument-sans`); mono = system stack. Metric-override fallbacks (Georgia; system-ui/Segoe UI/Roboto) for CLS <0.02. latin + latin-ext subsets cover Afrikaans ê ô ë ï and future ḓ ṱ ṋ ṅ, with a `unicode-range` system fallback; diacritics test string on the design-system page. Fluid scale: md 16→18 body, lg 18→21, xl 22→26 (h3), 2xl 28→36 (h2), 3xl 34→48 (h1), display 40→60; line-height 1.6 body; measure 68ch (90ch for tables/sheets). No H4+ from the pipeline (pseudo-headings render as bold lead-ins with heading semantics only where the outline allows).

Spacing 4/8/12/16/24/32/48/64/96px; radii 4/8/14/pill; two shadows; motion 120/200/320ms with `prefers-reduced-motion` collapsing to 0; z-index sticky 10, drawer 40, dialog 50, toast 60; `--st-target: 44px`. Layout: container 1360px; doc grid `272px | minmax(0,1fr) | 240px`; breakpoints sm 480, md 768, lg 1024 (sidebar), xl 1280 (TOC). Icons: Lucide via `astro-icon` + `@iconify-json/lucide`, inlined at build, `aria-hidden` unless sole content (then `aria-label`). Delight without cost: section accent stripes, Fraunces display numbers for the 2026 thresholds, effort meters, spoken-aside styling for "In plain words", illustrated type tiles that lift on hover/focus, drawing progress rings and ticks, "Copied ✓" morph, CSS-only shweshwe-inspired dot pattern at 6% (off under reduced-data).

Component inventory (props → states → a11y, all ≥44px targets, `:focus-visible` 2px accent ring + offset): Button (primary/secondary/ghost/danger, loading `aria-busy`), Link (always underlined, external ↗ + `rel=noopener`, `[Official]` badge when href matches a sources entry), Card (single tab stop via pseudo-element), Callout (plain-words / note / warning / official-link; icon + text label; `role="note"`), Table (`<caption>`, `th scope`, scroll region `tabindex=0` `role=region`, stacked cards under 640px for `wide` tables, numeric columns right-aligned), TaskList (native checkboxes in labels, `<fieldset>`/`<legend>` per group, `<progress>` labelled "Part A: 12 of 34 done"), ProgressRing (`role=img` + label), PromptBlock (`<figure>`/`<figcaption>`, `<mark class="st-placeholder">`, toolbar, polite live region, 14-line clamp with disclosure; copy always copies full text), TemplateForm + PrintSheet (fieldsets, labelled inputs, `autocomplete`, live totals, required-items list, mobile ARIA tabs), Badge (entity / type / official / effort / mt, never colour-only), Breadcrumb, TOC (`aria-current="location"`), Sidebar nav (switch `role="switch"`), SearchDialog (native `<dialog>`, combobox + listbox with `aria-activedescendant`, grouped results, toggle-button facet chips, focus return), LanguageSwitcher (nav of links), ThemeToggle (System/Light/Dark segmented radios), SkipLink, Stepper (`aria-current="step"`, focus moves to step heading), EmptyState, FooterDisclaimer, MT-notice banner (`role="note"`, not dismissible, link to English version), Toast (polite, 4s), Drawer (`<dialog>`), KeyboardHelp (`?`).

### B5. Accessibility plan (WCAG 2.1 AA, target size AAA adopted)
Semantic landmarks and heading order; DOM order = visual order; `autocomplete` on template business fields; every status has icon + text; links underlined; rem units and reflow at 320px (only table regions scroll); non-text contrast ≥3:1 for controls and focus; no hover-only content (glossary tooltips deferred for this reason); native `<dialog>` for search/drawer (no traps, Esc everywhere); single-key shortcuts `/` and `?` ignored in editable fields and switchable off in `/about/`; `Alt+←/→` prev/next; skip link; localised `<title>` "Doc · Section · SA Business Toolkit"; focus management (search returns focus to invoker, wizard moves focus to step heading, anchor targets `tabindex="-1"` + 2s highlight); `<html lang>` per route and `lang="en"` on fallback blocks; language/theme never auto-navigate; advisory validation with summary list; live regions for copy/totals/reset/result counts; `forced-colors` rules for focus rings and ticks. Print stylesheet: hides chrome, expands `<details>`, prints hrefs after external links, checklists as empty boxes (or with ticks via `data-print-ticks`), templates sheet-only, `@page { size: A4; margin: 15mm }`. Automated: axe on every sitemap URL in both languages and themes (zero serious/critical), contrast unit test on tokens, Lighthouse a11y ≥95. Manual: NVDA+Firefox and TalkBack+Chrome on home, wizard, vehicle-dealer, checklist, tax-invoice, search; keyboard-only on the same six; 200% zoom, 320px, forced-colors, print preview of checklist and tax invoice, Afrikaans string overflow on buttons and tiles.

### B6. Page specs (regions in order)
- Home: SkipLink · TopBar · [YourPathCard] · Hero (H1, lead, AI/verify line, Find my path, I know what I need) · Where to start (5 minutes / an hour / checklist) · Your kind of business tiles (6 + General) · Four things that matter early · Three numbers that changed in 2026 (display stats with [Official] links) · Trust strip · Footer.
- Section landing: breadcrumb · hue-striped header · [Start with… from profile] · ordered DocCards (number, title, summary, read time, badges, ✓) · disclaimer.
- Document: breadcrumb · sidebar · article header (section label, H1, read time, applies-to badges, verified date, MT banner on AF) · "Words used in this file" `<details>` (open on desktop) · TOC `<details>` (<xl) · blocks · inline TaskList · "Sources for this page" chips · pager · TOC column (xl) · footer. Filtered sections show a collapsed "Hidden: … — Show" marker.
- Business-type hub: H1 · "If you…" tiles · "read both" note · effort ranked list with meters · everyone-needs / nobody-needs columns · "Not sure? Find my path". Type doc = document + effort badge + "Read Core first" callout + inline Part B TaskList (same task ids as /checklist/) + related-type hints.
- Glossary: filter input with live count · A–Z bar · By group / A–Z toggle · `<dl>` groups with `dt id` + copy-link.
- Checklist: summary (ring + per-part bars) · profile chips + switch · Print / Reset (confirm) · Key to short words `<details>` · Parts A/A2/B/C/D as `<details open>` groups (C as table, D as warning cards) · storage-unavailable notice.
- Templates index (5 cards + "Which one do I need?") and template page (notice · [tabs] · form · A4 preview · required-items · actions).
- Sources: legend · Official-only switch + filter · legislation table · grouped entries with anchors.
- Search page, wizard, My path (chips, edit answers, ring, StepCards, filtered checklist, reset profile), About, Design system, 404 (bilingual, search field, links).

### B7. Design-system deliverables
`docs/design-system.md` (principles, colour rationale + verified contrast table, type, tokens, grid, components with states and a11y notes, do/don't, i18n rules: +25% string length, no text in images, print rules, contribution checklist); `src/styles/tokens.css`; `/design-system/` page with live swatches computing contrast at runtime (FAIL shown on drift), type specimen with diacritics, every component in every state, light/dark toggle, the six illustrations.

## Part C — Engineering architecture, tooling, CI/CD

Reconciliations applied across the three sub-plans: generated JSON lives in `src/data/<lang>/…` (schemas in `src/lib/content/schema.ts`); search is MiniSearch (Pagefind not provisioned, so CSP needs no `wasm-unsafe-eval`); settings live on `/about/` (no separate `/settings/`); the no-JS wizard pre-renders single-type result pages only (3 entities × 3 stages × 7 type choices = 63 per locale) and JS composes multi-type profiles client-side.

### C1. Astro config (`astro.config.ts`)
- `astro@7.3.2` (Node ≥22.12; Astro 7 facts: Vite 8, strict HTML compiler, `compressHTML` default `'jsx'`). `output:'static'`, `trailingSlash:'always'`, `build.format:'directory'`, `compressHTML:true` (prompt `<pre>` blocks are whitespace-sensitive; guarded by the clipboard byte-equality e2e test), `build.inlineStylesheets:'auto'`, `prefetch:{defaultStrategy:'hover'}`, no `<ClientRouter>` (MPA; custom elements would need re-init and focus management).
- `site` from `SITE_URL` (default `https://<owner>.github.io`), `base` from `BASE_PATH` (default `/business-toolkit/`), normalised. i18n as in A6. Integrations: `astro-icon` (lucide), `@astrojs/sitemap` with i18n locales.
- Pages under `src/pages/[...locale]/…` with `getStaticPaths` emitting `undefined` for en and `'af'`; one implementation per route. Routes: `index`, `[section]/index`, `[section]/[doc]`, `business-types/[type]`, `find-my-path/index`, `find-my-path/result/[profile]` (no-JS), `my-path`, `checklist`, `templates/[template]`, `search`, `contents`, `glossary`, `sources`, `about`, `design-system`, plus `404.astro`, `robots.txt.ts`.
- `src/lib/paths.ts`: `href(locale, path)`, `withBase`, `localeFromUrl`, `alternateUrls`. ESLint `no-restricted-syntax` forbids `href="/…"` literals in `.astro`; the 404-under-base e2e test backs it.

### C2. Interactivity: zero-framework custom elements + nanostores
Custom elements wrap Astro-rendered HTML and only attach behaviour: `<st-checklist>`, `<st-copy>`, `<st-theme-toggle>`, `<st-toc>`, `<st-lang-switch>`, `<st-search>`, `<st-wizard>`, `<st-template-form>`, `<st-clear-data>`. Rules: constructor does nothing; `connectedCallback` reads the store and wires listeners; never render markup Astro did not already render (except result lists); all state through the store; explicit keyboard handling. Total interactive JS <25 KB gz; MiniSearch (8 KB) lazy-loaded. Pure helpers (`path-engine.ts`, `templates/placeholders.ts`, `theme.ts`) unit-tested in node; elements in `happy-dom`.
State (`src/lib/store.ts`, `nanostores` + `@nanostores/persistent`): `profile` (`st.profile.v1`), `checks` (persistentMap `st.checks.v1:`), `theme` (`st.theme`), `lang` (`st.lang`, banner only, never redirects), prompts copied, template drafts, `meta` (`st.meta.v1 {schema, createdAt}`). `src/lib/storage/migrate.ts`: `SCHEMA_VERSION`, forward migrations, per-key reset on corrupt JSON; `clearAll()` removes every `st.` key. Theme init: tiny external blocking script (`is:inline` with Vite-built `src`) sets `data-theme` before paint so CSP stays `script-src 'self'`.
Progressive enhancement (guarded by the `nojs` Playwright project): every route readable without JS; TOC is plain anchors; checklists are real checkboxes with a `<noscript>` note that ticks are not saved; copy buttons `.js-only`; wizard is a GET form landing on a pre-rendered result page; templates print from rendered inputs; `/search/` without JS shows the full contents index.

### C3. Directory layout
```
.github/workflows/{ci.yml,deploy.yml,visual-update.yml}
content-meta/**                      (Part A)
docs/rsa-business-toolkit/  docs/rsa-business-toolkit-af/  docs/design-system.md  docs/adr/000N-*.md  docs/reviews/
scripts/{build-content.ts,build-search-index.ts,content/**,translate/**,ci/local-gate.ps1,ci/local-gate.sh}
src/
  content.config.ts                  collections over src/data (glob/file loaders)
  lib/content/schema.ts              Zod (Part A4)
  data/{en,af}/docs/*.json  data/{en,af}/{glossary,sources,tasks}.json  data/manifest.json
  i18n/{locales.ts,index.ts,en.json,af.json}
  layouts/{Base,Doc,Hub,Print}.astro
  components/{content-blocks,navigation,interactive,wizard,templates,search,design-system}/
  lib/{paths,store,storage/migrate,path-engine,search-client,theme,slug}.ts  lib/templates/placeholders.ts
  pages/[...locale]/**  pages/404.astro  pages/robots.txt.ts
  styles/{tokens,base,utilities,print}.css   scripts/theme-init.ts
public/{.nojekyll,favicon.svg,manifest.webmanifest}   public/search/ (gitignored, built)
tests/{unit,dom,content,e2e,lighthouse}/  tests/e2e/{fixtures,__screenshots__}/
astro.config.ts vitest.config.ts playwright.config.ts eslint.config.js prettier.config.js stylelint.config.js lefthook.yml commitlint.config.js tsconfig.json tsconfig.scripts.json package.json pnpm-lock.yaml .npmrc .nvmrc .editorconfig .gitattributes .gitignore README.md CLAUDE.md CHANGELOG.md LICENSE
```

### C4. Performance, SEO, robustness
No raster images (one committed apple-touch PNG); fonts `@fontsource-variable/fraunces` + `@fontsource-variable/instrument-sans`, preloaded via `?url` imports; `<html lang="en-ZA"|"af-ZA">`; canonical + hreflang + OG + `theme-color` both schemes; sitemap with i18n and `robots.txt` endpoint; `404.astro` → `dist/404.html` with base-aware links and a closest-route suggestion; `public/.nojekyll`; meta CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'` plus `referrer strict-origin-when-cross-origin` (documented limits of meta CSP in an ADR); an e2e test fails on any non-same-origin request or CSP console violation. No service worker in v1 (`manifest.webmanifest` shipped for add-to-home-screen; `@vite-pwa/astro` is the v1.1 candidate). Lighthouse budget: perf ≥90, a11y/BP/SEO ≥95, script ≤60 KB, stylesheet ≤30 KB, fonts ≤200 KB, third-party 0, CLS ≤0.01, total ≤600 KB on the heaviest doc.

### C5. Tooling
pnpm 11 (`packageManager`, `engines.node ">=22.12 <25"`, `.npmrc` engine-strict + save-exact), `.nvmrc` 24; TypeScript `astro/tsconfigs/strictest` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; `tsx` for scripts. ESLint **10** flat config (eslint-plugin-astro 3.x requires ESLint ≥10): `@eslint/js`, `typescript-eslint` type-checked, `eslint-plugin-astro` recommended + jsx-a11y-recommended (peer `eslint-plugin-jsx-a11y`), `eslint-plugin-playwright`, `eslint-plugin-vitest`, project rules (no `/`-literal hrefs, no `localStorage.` outside `src/lib/store.ts` and `src/lib/storage/`), `eslint-config-prettier` last. Prettier 3 + `prettier-plugin-astro` (lf, 100 cols, single quotes). Stylelint 16 + `stylelint-config-standard` + `postcss-html` + `stylelint-declaration-strict-value` requiring `var(--st-…)` for color/background/border-color/fill/stroke/box-shadow/font-family/font-size, `color-no-hex`, overrides exempting `tokens.css`. `astro check` + `tsc -p tsconfig.scripts.json`. EditorConfig; `.gitattributes` `* text=auto eol=lf` (+ binary for png/woff2); repo `core.autocrlf false`. Hooks: **lefthook** (pre-commit: eslint/prettier/stylelint on staged with `stage_fixed`; commit-msg: commitlint conventional; pre-push: typecheck + unit). Conventional Commit scopes: content, af, design, components, pages, wizard, search, templates, tests, ci, docs, deps. Windows: `cross-env`, `rimraf`, `node:path` + `path.posix` for slugs, `pnpm exec` not `npx`, `process.env.LOCALAPPDATA` for browser paths.
`package.json` scripts (contract for CI and agents): `dev`, `build`, `preview`, `content:build`, `content:check`, `content:drift` (`content:build && git diff --exit-code -- src/data`), `content:fidelity`, `search:build`, `lint`, `format`, `typecheck`, `test` (vitest unit+dom, coverage ≥90% on `src/lib/**` and `scripts/**`), `test:content`, `test:e2e`, `test:e2e:dev`, `test:a11y`, `test:visual`, `test:visual:update`, `lhci`, `gate:fast`, `gate`, `prepare` (lefthook install).

### C6. Testing
- Vitest 5 via `getViteConfig` with three inline projects: `unit` (node), `dom` (happy-dom, custom elements), `content` (node, 60 s timeout). Unit suites: parser fixtures (A8 list), link resolver, path engine, i18n dictionary, storage migrations, placeholder parser, paths helper, slug parity, contrast of token pairs, search index queries + size budget, custom elements (connect/disconnect, store round trip, keyboard handling of the results listbox, copy text).
- Content project: schema parse of every JSON file, links/anchors incl. original INDEX.md anchors, EN/AF fidelity (empty findings), forbidden strings (e.g. `R1 million … VAT`, `R50,000 … voluntary`, `TODO`, `{{`), dictionary completeness, heading-tree sanity (no skipped levels), `content:drift`.
- Playwright config: `baseURL http://127.0.0.1:4321${BASE_PATH}`, `webServer` = `pnpm preview` (built site under base; `PW_DEV=1` switches to `astro dev`), `reuseExistingServer` locally, `locale en-ZA`, `timezone Africa/Johannesburg`, trace on failure. Projects: `chromium`, `webkit`, `mobile` (Pixel 7), `nojs` (`javaScriptEnabled:false`), `a11y`, `visual` (`reducedMotion:'reduce'`, `maxDiffPixelRatio 0.01`, platform-suffixed baselines, `document.fonts.status === 'loaded'` before capture). Local browsers are found automatically under `%LOCALAPPDATA%\ms-playwright`; CI installs with `--with-deps` and caches.
- Specs: navigation (breadcrumbs, TOC `aria-current`, `/af/` mirror, switcher keeps page + anchor, lang/hreflang), search (open with `/` and button, known terms EN/AF from fixtures, keyboard-only), wizard (fixture profiles → expected path, `st.profile.v1` written, checklist filtered), checklist (tick, reload, `/af/`, clear data), templates (fill, preview updates, stub `window.print` and assert call, `emulateMedia('print')` screenshot with chrome hidden), copy (chromium, clipboard permission, byte-equal to JSON), theme (toggle, persist, system follows `emulateMedia`), 404 under base, csp-and-network (zero console errors/CSP/third-party), nojs (doc readable, wizard GET → pre-rendered result, template print CSS, search page browse index), a11y (every sitemap URL in both locales, axe tags wcag2a/2aa/21a/21aa/best-practice, zero serious/critical; dark theme sample; open search dialog; wizard step 2), visual (home ×2, section, long doc, business-types hub, wizard step 1 + result, tax-invoice + print, glossary, checklist, `/af/core/register/`, 404 at 375/768/1280 in light and dark).
- Lighthouse CI: `tests/lighthouse/lighthouserc.cjs`, 6 URLs both locales, 3 runs, mobile + desktop presets, median assertions per C4 budget, filesystem upload as artifact; locally `CHROME_PATH` points at the Playwright chromium (indicative only; ubuntu CI is the gate).

### C7. CI/CD (authored now, validated locally via `scripts/ci/local-gate.{ps1,sh}` running the identical script sequence)
- `ci.yml` (push all branches + PR, concurrency cancel-in-progress): jobs `quality` (pnpm/action-setup, setup-node from `.nvmrc` with pnpm cache, `install --frozen-lockfile`, lint, typecheck, test, content:check, content:drift, content:fidelity) → `build` (env `BASE_PATH: ${{ vars.BASE_PATH || '/business-toolkit/' }}`, `SITE_URL: ${{ vars.SITE_URL || format('https://{0}.github.io', github.repository_owner) }}`, upload `dist`) → parallel `e2e` (Playwright cache keyed on lockfile; chromium/webkit/mobile/nojs; report on failure), `a11y`, `visual` (diffs on failure), `lighthouse` (artifact). `visual-update.yml` on `workflow_dispatch` uploads refreshed Linux baselines as an artifact.
- `deploy.yml` (push to `main` + dispatch; `pages: write`, `id-token: write`; concurrency `pages`): build with the same env → `actions/configure-pages` → `actions/upload-pages-artifact` → `actions/deploy-pages` in `github-pages` environment. Pin action majors at authoring time. After `gh repo create` and first push: set Pages source to "GitHub Actions" and repo variables `BASE_PATH`/`SITE_URL`.
- Branching: `main` (protect once remote exists), short-lived `wp/<package>` and `content/af-<doc>` branches, squash merges, tags per phase.

### C8. Git setup (first step of execution)
`git init -b main`; `git config core.autocrlf false`; add `.gitattributes`, `.editorconfig`, `.gitignore` first; commit `chore: import RSA business toolkit markdown source (2026-09-14 edition)`. Then one commit per phase/package (`chore(scaffold)`, `feat(content)`, `feat(design)`, `feat(components)`, `feat(pages)`, `feat(i18n)`, `feat(af): translate <doc>` per doc, `feat(wizard)`, `feat(search)`, `feat(templates)`, `test(e2e)`, `ci:`, `docs:`). Tags `v0.1.0-scaffold`, `v0.2.0-content`, `v0.3.0-ui`, `v0.4.0-interactive`, `v0.5.0-af`, `v0.9.0-rc`, `v1.0.0`. Never commit `dist`, reports, `.env`; `src/data` and screenshots are committed.
Licence assumption (flag to user at delivery): MIT for code; content keeps the toolkit's own "use it, copy it, change it, no attribution required" terms with the AI disclosure retained.

## Part D — Multi-agent execution and review protocol

### D1. Roles and file ownership (reviewer's first check is `git diff --name-only` against the allowlist)
orchestrator (this session: merges, tags, CHANGELOG) · scaffold/tooling (root configs, `scripts/ci`, `.github`, lefthook) · content-pipeline (`scripts/content/**`, `scripts/build-*.ts`, `content-meta/**`, `src/lib/content/schema.ts`, `src/content.config.ts`, `src/data/en/**`, content tests) · translation ×N (one `docs/rsa-business-toolkit-af/<doc>.md` each) · af-reviewer (bilingual semantic review; may fix the AF doc under review) · design-system (`src/styles/**`, `Base.astro`, fonts/icons, `docs/design-system.md`, `/design-system/` page) · components (`content-blocks`, `navigation`) · pages (`src/pages/**`, `Doc/Hub/Print` layouts, `paths.ts`, `src/i18n/**`) · interactive/wizard (`interactive`, `wizard`, `templates`, `store`, `storage`, `path-engine`, `theme`, dom tests) · search (`search/**`, `search-client.ts`, `build-search-index.ts`, search page) · tests (`tests/e2e/**`, `playwright.config.ts`, lighthouse) · reviewer ×2 (writes `docs/reviews/<wp>-pass<n>.md`, never edits source) · docs (README, CLAUDE.md, ADRs, CHANGELOG). Shared files (`package.json`, `en.json`) change via small single-purpose commits merged by the orchestrator before dependants start.

### D2. Isolation and integration
Each work package runs in its own worktree under `C:\_Projects\Local\bt-wt\<wp>` on branch `wp/<wp>` (short paths, `pnpm install` per worktree). Orchestrator integrates sequentially: rebase on `main`, `pnpm gate:fast`, squash-merge; full `pnpm gate` after any merge touching `src/pages` or `src/lib` and after every third merge. Translation branches add one file each and merge in batches of six after fidelity passes. Red `main` → revert the squash and reopen the package.

### D3. Phases, work packages, definitions of done
- **P0 Foundation** (sequential): WP-00 git init + docs import; WP-01 scaffold (Astro 7, tooling, hooks, empty CI, gate scripts, CLAUDE.md skeleton, smoke e2e). DoD: `gate:fast` green, `build` emits base-relative links, smoke e2e passes.
- **P1 Content + design** (parallel ×3, after WP-01): WP-10 pipeline + schema + `content-meta` + EN JSON + parser/content tests; WP-11 Stoep tokens/base/print/utilities + Base layout + fonts/icons + contrast test + `docs/design-system.md`; WP-12 i18n scaffolding (locales, `paths.ts`, `en.json`/`af.json` UI strings, `[...locale]` helper, dictionary test). DoD: all 36 EN docs validate; links/anchors/INDEX anchors resolve; token lint enforced; dictionary test green.
- **P2 Rendering** (parallel ×3, after P1): WP-20 content-block + navigation components (from WP-10 JSON, incl. `/design-system/` component gallery); WP-21 pages/layouts for every route in both locales (AF renders EN with fallback banner until P4); WP-22 e2e skeleton (config, fixtures, navigation/404/csp/nojs specs, a11y harness, visual spec). DoD: every route builds in both locales; axe clean; win32 visual baselines captured.
- **P3 Interactive** (parallel ×4, after P2): WP-30 store/migrations/theme/checklist/copy/TOC/clear-data; WP-31 `paths.json` rules + path engine + wizard UI + pre-rendered single-type result pages + My path; WP-32 templates (placeholder parser, form binding, print sheet, print CSS); WP-33 MiniSearch index build + client + dialog + `/search/` page. DoD: unit coverage ≥90% on lib; feature e2e green in chromium/webkit/mobile/nojs; axe clean with dialogs open.
- **P4 Afrikaans** (after P1; can overlap P2/P3): WP-40.glossary first (fixes `TERMS-af.json` and the "Words used" vocabulary), then WP-40.<doc> ×35 in batches of six (docs >4k words chunked at H2 boundaries and reassembled by the script), each looping `content:fidelity --doc` until clean; WP-41 fidelity/style fixes; WP-42 af-reviewer semantic pass per doc (terminology consistency, no added facts, register), two clean passes each; then `content:build` regenerates `src/data/af/**`. Token sanity: ~36 translation runs (~10k each), ~36 fix runs, ~72 review passes ≈ 1.2M tokens. DoD: fidelity empty, forbidden strings clean, AF navigation/search e2e green, `manifest.langs.af.docCount === 36`.
- **P4a Accuracy review against official sources** (owner decision 2026-09-15; after WP-10 merges, runs in parallel with P2–P4, must finish before P6): WP-45 fact inventory. The pipeline emits `src/data/facts.json`, listing every rand amount, percentage, threshold, deadline, fee, form code, section reference and statutory claim, each with doc id, block id, the sentence, and mapped source ids. WP-46.<topic> accuracy reviewers work in parallel by topic: tax and SARS; company registration and running a Pty Ltd; paying yourself; POPIA and B-BBEE; consumer law and online selling; vehicles and vehicle dealing; food; beauty; trades and professional; templates and invoices; branding and marketing facts; free tools. Each reviewer opens the official source (SARS, CIPC, BizPortal, gov.za, Information Regulator, FSCA, NCC, SAPS, eNaTIS, municipal pages, saflii.org for Acts) and records per fact: `verified | incorrect | outdated | unverifiable | non-official-source-only`, with the URL, the quoted supporting text, and the date accessed. Evidence goes to `docs/accuracy/<topic>.md`. Incorrect and outdated facts are corrected in the English markdown on `main` with a `fix(content):` commit that cites the evidence. Non-official-only facts get an official source added or are reworded to state the uncertainty. Unverifiable facts are flagged in the text. WP-47 source register update: add or replace official URLs, repair entries without URLs, set `checkedOn`. WP-48 second-pass accuracy review on every corrected fact by a different reviewer. Afterwards, the pipeline sets `doc.verification.status = 'ai-checked'` with the new `checkedOn` for reviewed docs. `human-verified` is reserved for a named human expert review, which the owner arranges and is recommended before public launch for the core tax, register, Pty Ltd, paying-yourself and vehicle-dealer docs. Afrikaans translations of any corrected document are refreshed and re-checked by fidelity. DoD: every fact in `facts.json` has a status and evidence; zero `incorrect` or `outdated` remain; every `unverifiable` fact is visibly flagged on its page; the review files are committed.
- **P5 Hardening** (parallel ×3, after P3+P4+P4a): WP-50 Lighthouse/perf budget fixes; WP-51 CI workflows finalised, `local-gate` validated on Windows (PowerShell + Git Bash); WP-52 docs (README, CLAUDE.md, ADRs 0001 Astro 7, 0002 zero-framework, 0003 MiniSearch, 0004 i18n/translation, 0005 security headers, CHANGELOG, LICENSE). DoD: `pnpm gate` green on a fresh worktree.
- **P6 Whole-app review + release**: three reviewer instances with different lenses in parallel (`/code-review` + `/security-review`; accessibility audit checklist; i18n/content audit), owners fix, second full round; tag `v0.9.0-rc`; user runs the manual QA script (E2); tag `v1.0.0`; `gh repo create`, push, set Pages source and variables, confirm deploy of `/`, `/af/`, 404, print.

### D4. Review protocol (every package, minimum two consecutive clean passes)
1. Author submits: branch, `git diff main...wp/<wp> --stat`, filled acceptance checklist, verbatim `gate:fast` (and e2e where applicable) output.
2. Reviewer re-runs the gate itself (never trusts pasted output), checks the file-ownership allowlist, then reviews through five lenses: correctness (edge cases, error paths, deterministic ordering), accessibility (roles/names, focus order, tokens-only contrast, keyboard, live regions, reduced motion), i18n (no hardcoded strings, both locales, shared anchors, `href()` used), performance (JS budget, no layout shift, lazy search), security (CSP compatibility, no unsanitised `innerHTML`, no external requests, no secrets).
3. Findings in `docs/reviews/<wp>-pass<n>.md` with severity blocker/major/minor/nit, file:line and the acceptance item violated; minors may go to `docs/reviews/backlog.md` with a linked TODO.
4. Author fixes in fix-up commits, re-runs the gate, replies "fixed <sha>" or justifies.
5. Pass n clean (zero blocker/major) then a fresh pass n+1 over the whole diff also clean ⇒ mergeable. Packages touching `src/lib` or `src/pages` get pass n+1 from a different reviewer instance. Reviewers never edit the author's worktree; the tests agent may add failing tests reproducing a finding.
6. Orchestrator merges, runs the relevant e2e projects on `main`, reverts on red.
Per-package DoD: allowlist respected, checklist ticked, gate green, two clean passes, affected README/CLAUDE.md sections updated, no TODO without a backlog entry.

### D5. Content accuracy and AI disclosure requirements (owner decision 2026-09-15; applies to every page package)
- **Every content page states that it was generated by AI**, near the top, not only in the footer. The text must be short and plain: "Written by AI (Claude, Anthropic). Checked against the sources below on {date}. Rules change: check the official source before you act. Not legal, tax or financial advice." Link to `start/how-this-was-made`. Show the verification status (`AI-checked` or `Checked by {reviewer}`) as text, not only a badge colour. Afrikaans pages show the same notice in Afrikaans, in addition to the machine-translation notice.
- **Every content page lists its own sources** in a "Sources for this page" section. It comes from `doc.sources` (register entries and Acts mapped by the pipeline). Each entry shows the source title, an "Official" label where applicable, the link, and what it supports. Pages with no page-specific sources (start pages, the sources register itself) show `doc.sourceNote` with links to the full register and how-this-was-made. The build fails if a guide, template, checklist or business-type page has no sources and no note.
- **Facts are shown with their date.** Threshold, fee and deadline callouts on the home page and business-type hubs show "checked {date}" and a link to the specific source.
- **Nothing implies more certainty than the source.** No "guaranteed", "always" or "official" language unless the source is official and says so. Checklists are labelled as reminder lists, not proof of compliance. Templates state the date their required-content rules were checked.
- **E2E checks:** every content page renders the AI notice, a non-empty sources section or source note, and at least one working same-site link to the sources register. The a11y and nojs suites cover these sections.

## Part E — Verification

### E1. Automated gate (`pnpm gate`; identical to CI; `gate:fast` = first six lines)
```
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm content:build && git diff --exit-code -- src/data
pnpm content:check
pnpm content:fidelity --lang af
pnpm build
pnpm test:e2e
pnpm test:a11y
pnpm test:visual
pnpm lhci
git status --porcelain     # must be empty
```
Windows: `scripts/ci/local-gate.ps1` (sets `CHROME_PATH`, `BASE_PATH`, `SITE_URL` defaults); Git Bash: `scripts/ci/local-gate.sh`. Negative checks: editing one rand figure in an AF file must fail `content:fidelity` naming the block id; adding a raw hex colour to a component must fail `lint`; a `href="/x"` literal must fail `lint`.

### E2. Manual QA script (user, on `pnpm preview` and again on the live URL)
1. Desktop 1280px: home → Core → Tax and SARS; three TOC jumps update the hash and focus the heading; back restores scroll.
2. Phone 375px: drawer opens/closes by touch; tables scroll without page overflow; no zoom needed; targets ≥44px.
3. Keyboard only: skip link first; search via `/`, type "turnover", arrow twice, Enter opens the right doc; Esc returns focus; complete the wizard with Tab/Space/Enter; tick two items with Space.
4. NVDA: landmarks on home; H-key heading walk matches the TOC; search dialog announces as dialog with labelled input; checkbox state change announced; language switch changes the page language.
5. Print: fill the non-VAT invoice, Print → Save as PDF shows sheet only with typed values and no "Tax Invoice" wording; repeat for the VAT tax invoice and confirm the VAT line.
6. Copy a branding prompt and paste into an editor: whole prompt with line breaks.
7. Switch to Afrikaans from a deep anchor: same page and anchor under `/af/`, `lang="af-ZA"`, Afrikaans chrome, MT banner, ticks still ticked.
8. Theme: dark persists on reload; system follows the OS.
9. About → Clear my data: profile, ticks, theme reset; no `st.` keys remain.
10. Robustness: `/business-toolkit/nonsense/` shows the 404 with working links; with JS disabled a doc page, the wizard and a template page remain usable; zero console errors/CSP reports on five pages.
11. Live only: `/`, `/af/`, `sitemap-index.xml`, `robots.txt` resolve; devtools Lighthouse on mobile within budget.

## Critical files
- `astro.config.ts`, `src/lib/paths.ts` (base + locale routing correctness)
- `scripts/content/parse.ts` (+ `inline.ts`, `refs.ts`, `fences.ts`), `scripts/content/fidelity.ts` (+ `facts.ts`), `src/lib/content/schema.ts`, `content-meta/docs.meta.json` (+ `legacy-refs.json`, `paths.json`, `business-types.json`, `markers.json`)
- `scripts/build-search-index.ts`, `src/lib/search-client.ts`, `src/content.config.ts`
- `src/styles/tokens.css`, `src/layouts/Doc.astro`, `src/components/content-blocks/BlockRenderer.astro`, `src/lib/store.ts` + `src/lib/storage/migrate.ts`, `src/lib/path-engine.ts`
- `playwright.config.ts`, `.github/workflows/ci.yml` mirrored by `scripts/ci/local-gate.ps1`
- Source of wizard rules and quick answers: `docs/rsa-business-toolkit/00 Start here/01-how-to-use-this-toolkit.md`, `04 Your kind of business/00-pick-your-business-type.md`, `05 Look it up/02-master-checklist.md`
