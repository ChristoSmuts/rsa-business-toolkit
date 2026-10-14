# WP-50 Phase 3, item 2 (home, hubs, card set): review pass 1

**CLEAN**: zero blocker, zero major. Four minor, four nit.

- Branch reviewed: `wp50-p3-home` at `b2a20d3` (checked out as `review-p3home-pass1`), compared with `main` at `5fbea62`.
- Scope: `85d84f6`, `270b037`, `0e85a7d`, `3db454c`. The document-page commits merged in from `wp50-p3-doc` are under a separate review.
- Reviewer: a fresh instance. Checklists: `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`.
- Screenshots: `docs/reviews/WP-50-phase3-home-pass1/`, 20 PNG files. Each file shows before (`5fbea62`, left) and after (`b2a20d3`, right) at the same size, theme and language. They cover home at 320, 768 and 1280px in light, dark, English and Afrikaans, home with saved answers, the Core and Paperwork hubs, business types, `/templates/`, My path, and forced colours on home and Paperwork.

## Gates (run by the reviewer)

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. Lint, Prettier, Stylelint clean (no `no-invalid-position-declaration` quirk in this worktree), `astro check` 0/0/0, 81 files and 3,437 unit+dom tests passed, content drift none, 40 content tests passed |
| `pnpm build` | exit 0. 200 pages. `dist:audit` 26,768 URLs with no problems. `dist:trust` 74 document pages. `dist:budget`: heaviest document page 24.0 KB (1.0 KB left), heaviest other page 34.6 KB |
| e2e chromium + mobile + nojs (`PW_PORT=4981`) | 1,703 passed, 102 skipped (27.1 min), exit 0 |
| `pnpm test:a11y` (`PW_PORT=4982`) | 420 passed (9.7 min), exit 0 |

## Independent checks (Chromium, `5fbea62` vs `b2a20d3`, both builds served under `/business-toolkit/`)

- **Targets ≥ 44px.** Every link, button and summary in `<main>` was measured on the 16 pages (home, 5 hubs, business types, `/templates/`, My path; EN and AF; 320 and 1280px; light and dark). Inline links in running text were exempt. A card's link was measured by its card, because its `::after` covers the card. Item 2 adds **no** new target under 44px. The only "new" small items were two inline links in the business-types document text at 1280px, and those come from text reflow.
- **The stoep and the accessibility tree.** The order is: `figure "Three short questions…"` › `list` (3 items) › `link "Three short questions…"`. The roof is `aria-hidden`. The step numbers are generated content with empty alternative text, so nothing is read twice. Hit testing covered every 6px across the hero at 320 and 1280px. The stoep link is hit only inside the figure (288×254 at 320; 512×232 at 1280). "Find my path", "I know what I need" and "How this was made" each keep their own hits. No interactive element is nested in another.
- **Keyboard and focus.** Tab order on home is the same at 320 and 1280px: hero actions › AI-line link › stoep › 2 page rows › tool action › 7 type tiles › "See all" › 4 rows › 3 "Official source" › "How this was made". Every card shape and the stoep get the 3px ink ring round the whole shape. The link's own outline is `none` there.
- **Contrast.** Computed for every text node in cards, rows, the stoep, facts, steps, the AI line and the trust list, in both themes. The lowest text pair is 6.88:1 (the stoep caption, muted on paper). Graphics: tool frame 7.67 (light) and 9.27 (dark). Row rules 5.59 to 8.26 (light) and 7.64 to 10.04 (dark). Step circle edge 7.67/9.27. Step rail 4.40/4.90. Tool action edge 4.67/4.48. The stoep step fill against the paper is 1.11/1.49 and the type-tile hairline 1.37/1.51. Both of those are decoration: the words inside carry the meaning, so 1.4.11 does not apply.
- **Forced colours.** The row rule, tool frame, tile edge, icon tile, stoep steps, fact rule, step circles and rail all compute to `CanvasText`. The action edge is `LinkText`. The roof does not (see m4).
- **Motion.** No transitions or transforms on any shape. Hover only changes colour, and only inside `(hover: hover)` (the e2e test walks the stylesheets). Nothing moves on load, so reduced motion has nothing to remove.
- **Without JavaScript.** The nojs project passes. That includes the new stoep and tool test, and no sideways scroll at 320px on every page.
- **320px, Afrikaans, zoom.** No sideways scroll on any page at 320px, at 1280px with 200% zoom (640 CSS px), or with 400% zoom (320 CSS px). The stoep keeps each Afrikaans step on one line.
- **Content kept.** Visible text of `<main>` was diffed word by word on every page. Home lost only "Read Core: start here" and "Open the core section". These were plain text, not links, under the two rows. One repeated the summary and the other repeated the title link's target. The links on "Where to start" are unchanged apart from the tool's name: `If you know what you need` became `Open the checklist`, with the same `href`. Each hub lost its "Page n of N" eyebrows. Hubs lost the read time on tools (m2). Business types, `/templates/` (gains "Open template" ×5) and My path have no other loss.
- **Late-font layout shift.** Every `.woff2` was held until the DOM and stylesheets were in, then released. Pages measured: top of home, all 5 hubs, business types and `/templates/`, EN and AF (16 pages), at 320×568, 1024, 1280 and 1440. Home was also measured scrolled to 1,200 and 2,400px at 360 and 1280. Worst result per width:

  | Width | Before | After |
  | --- | --- | --- |
  | 320 | 0.010 | 0.010 |
  | 1024 | 0.068 (`/af/`) | 0.010 (`business-types/`) |
  | 1280 | 0.012 | 0.024 (`/`) |
  | 1440 | 0.010 | 0.004 |
  | home scrolled | 0.001 | 0.005 |

  Every page stays well under 0.1. This matches the author's table.
- **Weight on a slow first visit.** Test conditions: 360px, cache off, 150 ms latency, 1.6 Mbit/s down, gzip served, five runs, median shown.

  | Page | Stylesheets | Requests | Transferred | FCP = LCP (median) |
  | --- | --- | --- | --- | --- |
  | `/` | 2 → 4 | 22 → 24 | 111.1 → 113.5 KB | 768 → 784 ms |
  | `/af/` | 2 → 4 | 22 → 24 | 111.1 → 113.6 KB | 764 → 780 ms |
  | `core/` | 4 → 5 | 21 → 22 | 112.3 → 113.5 KB | 724 → 768 ms |
  | `paperwork/` | 4 → 5 | 21 → 22 | 111.6 → 113.2 KB | 784 → 748 ms |
  | `templates/` | 2 → 3 | 19 → 20 | 104.3 → 105.7 KB | 804 → 768 ms |

  The before and after run ranges overlap on every page (home: 712 to 784 ms before, 728 to 856 ms after). The two extra stylesheets cost about +16 ms at the median and about 2.5 KB. That is acceptable, though see n4.
- **JavaScript.** Unchanged, as `dist:budget` shows: the stoep and the card set are CSS only.
- **Print.** Home and Paperwork were printed to PDF. Row rules, tool frames and the tile hairline print. The hero buttons are left out. The stoep prints (see n3).

**Audit item 3: can a reader tell a page from a tool from a step at a glance?** Yes, on a phone in both themes and in forced colours.

- A page is a bare row with a coloured rule and a serif title.
- A tool is a framed panel with a button.
- A step is a numbered circle on a rail.
- A kind of business is a tile with its picture.

The shapes stay distinct in forced colours. Tool and tile frames are both `CanvasText` there, but the button on one and the picture on the other keep them apart. See `home-af-320-dark.png`, `paperwork-af-320-light.png`, `mypath-en-320-light.png` and `forced-paperwork-en-320.png`.

## Findings

### minor m1: tools in one grid row do not share a height; the fix described in the docs has no effect
File: src/components/ui/Card.astro:223
Acceptance item: general quality. `docs/design-system.md` ("Critique, round 1") says this was fixed: "tools in one grid row now share a height with their actions on one line".
What is wrong: `li > .st-card[data-variant='tool'] { block-size: 100% }` is in Card's scoped `<style>`. Astro scopes every compound in the selector, so the built rule is `li[data-astro-cid-mx574jlw]>.st-card[data-astro-cid-mx574jlw][data-variant=tool]` (`dist/_astro/Card.DLmxPLJn.css`). The `<li>` is rendered by `SectionLanding.astro` and `templates/index.astro` and carries their scope id, not Card's, so the rule never matches. On Paperwork at 1280px the three tools in the first row are 230, 343 and 286px tall in a 343px row. Their actions sit at y = 996, 1110 and 1052. On `/templates/` the second row is 172 and 201px. See `paperwork-en-768-dark.png`.
How to reproduce: open `/paperwork/` at 1280px and compare the panels' heights and the tops of "Open template".
Suggested fix: write `:global(li) > .st-card[data-variant='tool']`, or set `block-size: 100%` from the grids that own the `<li>`. Add an assertion to `home-hubs.spec.ts`: on Paperwork at 1280px the first row's panels have equal heights and their actions have equal tops.

### minor m2: a tool on a hub no longer shows its read time, and would drop an "only for" badge
File: src/components/pages/SectionLanding.astro:110-125
Acceptance item: "no content lost from home or hubs".
What is wrong: page rows keep the `meta` slot, which holds the read time and the entity badge. Tool cards get no `meta`. On Paperwork the five templates lost "1 min read" or "2 min read". On Look it up the checklist lost "7 min read". For a template the read time matters little. For the checklist, "7 min" tells a nervous reader how big it is. No template or checklist has `appliesTo.entity` other than `all` today. If one ever did, its "Pty Ltd only" or "Sole proprietor only" badge would disappear from the hub without anyone noticing.
Suggested fix: pass the same `meta` (read time, entity badge) to the tool cards. If dropping the read time on tools is deliberate, at least keep the entity badge, and record the decision under "Section hubs" in `docs/design-system.md`.

### minor m3: at 320×568 the home page's AI line has moved off the first screen
File: src/pages/[...locale]/index.astro:98-132
Acceptance item: build plan B6 sets the home hero as "H1, lead, AI/verify line, Find my path, I know what I need". `WP-50-directions.md` ("Home") changed this to put the actions first.
What is wrong: the new order follows the approved direction. The side effect has not been measured or recorded: on the smallest supported phone (320×568) the "Written by AI…" line used to start on the first screen and now starts below it. Its top moved from 490 to 622px in both EN and AF. At 360×740 it stays visible (596 EN, 625 AF). Home is not a content page, so Stoep rule 9 does not strictly apply. But home is where a first-time reader first learns the guide is AI-written, and `first-screen.spec.ts` guards only document pages.
Suggested fix: decide one of two things and write it down. Option one: accept this, and record it in "The home page…" section with the numbers. Option two: keep the AI line on the first screen at 320×568, for example by tightening the hero gaps on short phones or putting the AI line before the actions below 360px, and add home to the first-screen test.

### minor m4: in forced colours the stoep's roof keeps the author's green
File: src/pages/[...locale]/index.astro:354-360
Acceptance item: forced colours. `docs/design-system.md` says the roof is "a `currentColor` stroke, so forced colours draw it".
What is wrong: `.st-stoep__roof` sets `color: var(--st-primary)`, and Chromium does not force `color` on the SVG. In forced colours the roof computes to `rgb(30, 90, 60)` (light) or `#7CC79A` (dark), not `CanvasText`. See `forced-home-en-1280.png`. Usually the author palette follows the OS scheme, so the roof stays visible. A reader who chose the site's light theme under a dark high-contrast theme gets #1E5A3C on black (about 2.6:1). The roof is decorative, but it is the outline of the page's one memorable element, and the doc claims it is handled.
Suggested fix: add `@media (forced-colors: active) { .st-stoep__roof { color: CanvasText; } }`, and extend the forced-colours e2e test to check the roof's computed colour.

### nit n1: the stoep is announced twice
File: src/pages/[...locale]/index.astro:138,161-165
`<figure aria-labelledby="home-stoep-caption">` takes its name from the caption, and the caption is the link. A screen reader therefore says "figure, Three short questions. Then you get the steps…", reads the list, then says "link, Three short questions. Then you get the steps…". Suggestion: drop `aria-labelledby`. A `<figure>` with a `<figcaption>` is still exposed, and the link's words are heard once.

### nit n2: the stoep's link words do not name where it goes
File: src/i18n/en.json (`home.stoepCaption`)
In a list of links, or for a speech user, "Three short questions. Then you get the steps that apply to you, in order." does not say it opens Find my path. 2.4.4 passes from context, but it is the one link on the figure. Consider a caption that starts with the tool's name ("Find my path: three short questions…"), or a visually hidden suffix.

### nit n3: the stoep prints
File: src/pages/[...locale]/index.astro:134-167 (and `src/styles/print.css`)
On paper, with backgrounds off, the stoep becomes three loose lines and the roof (seen in the reviewer's print-to-PDF of home, page 1; not committed), plus a link nobody can follow. The hero buttons are already left out of print. Consider `@media print { .st-stoep { display: none; } }`.

### nit n4: home's own stylesheet is now a separate request
File: src/pages/[...locale]/index.astro:302 onwards
Home now loads `stoep.css`, `i18n-routes.css`, `Card.css` and `index@_@astro.css`. The last one holds only home's styles, which used to be inlined. Its cost was within run-to-run noise in the slow-3G runs (+16 ms FCP median, +2.5 KB). Still, on HTTP/1.1 behind a weak link each stylesheet that blocks render is one more round trip. If Astro's `inlineStylesheets` threshold can be raised for this one file, or the stoep's CSS made smaller, home would be back to three.

### Also noticed (no finding)
- On Paperwork the page row "Free tools" sits just above the "Tools in this section" heading, and in Afrikaans the two use different words: "Gratis gereedskap" and "Nutsgoed". This is a wording point for item 4 or the content, not a defect here.
- The hub still says "7 pages" above a list of two rows plus five tools. The count is right, because it counts documents, but it can read oddly.

## Verdict

CLEAN. The card set does what audit item 3 asked: each shape means one thing, and the shapes stay distinct on a 320px phone, in dark mode and in forced colours. The project rules hold:

- tokens only;
- `href()` everywhere;
- no JavaScript added;
- every string in both locales with identical keys;
- the two removed keys really were redundant.

m1 should be fixed: the design record claims a fix that never takes effect. m2 to m4 and the nits can follow under the 17 September amendment.
