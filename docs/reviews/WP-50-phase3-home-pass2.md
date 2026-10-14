# WP-50 Phase 3, item 2 (home, hubs, card set): review pass 2

**CLEAN**: zero blocker, zero major. One minor, four nits.

- Branch reviewed: `wp50-p3-home` at `756f2f4` (checked out as `review-p3home-pass2`), compared with `main` at `5fbea62`.
- Scope: the whole of item 2, not only the pass 1 fixes. The commits are `85d84f6`, `270b037`, `0e85a7d`, `3db454c`, `f9858e5`, `21ceac6`, `bc0ce23` and `756f2f4` (`b2b12d` is the pass 1 review). The code diff is `188f895..756f2f4`, where `188f895` is the `wp50-p3-doc` commit merged in at `b2a20d3`. The document-page commits are under a separate review.
- Reviewer: a fresh instance that had not seen this work. Checklists: `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`.
- Screenshots: `docs/reviews/WP-50-phase3-home-pass2/`, 20 PNG files. Each file shows before (`5fbea62`, left) and after (`756f2f4`, right) at the same width, theme and language. The page height is in each caption. They cover:
  - home at 320, 768 and 1280px, light and dark, EN and AF;
  - home with saved answers at 320 (EN, light) and 1280 (AF, dark);
  - the Core, Paperwork and Look it up hubs;
  - business types and `/templates/`;
  - My path;
  - forced colours on home (320) and on Paperwork (AF, 1280, dark OS theme).
- Method: both builds were served under `/business-toolkit/` from a small static server with gzip (`5fbea62` was built from `git archive`). Probes used Chromium (Playwright), with the scripts in the reviewer's scratchpad.

## Gates (run by the reviewer)

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | Exit 0. ESLint, Prettier and Stylelint are clean. The `no-invalid-position-declaration` quirk did not appear in this worktree. `astro check` reports 0 errors, 0 warnings, 0 hints on 329 files. Unit and dom tests: 81 files, 3,437 passed. Content drift: none. Content tests: 40 passed |
| `pnpm build` | Exit 0. 200 pages. `dist:audit`: 26,780 URLs, no problems. `dist:trust`: 74 document pages, 99 AF pages with language of parts correct. `dist:budget`: the heaviest document page (`/af/business-types/food/`) is 24.0 KB, 1.0 KB under the limit; the heaviest other page (`/af/search/`) is 34.6 KB; all 200 pages are within budget |
| e2e chromium + mobile + nojs (`PW_PORT=5001`) | Exit 1: **1,711 passed, 1 failed, 103 skipped** (24.5 min). The one failure is `[mobile] search.spec.ts:207`, "Enter while the index loads opens the result…", on a document page (`business-types/vehicle-dealer/`). It is not caused by item 2; see "Also noticed" |
| `pnpm test:a11y` (`PW_PORT=5002`) | Exit 0. 420 passed (14.7 min) |

Gate tails:

```
gate:fast
 Test Files  81 passed (81)
      Tests  3437 passed (3437)
Content drift: none.
 Test Files  1 passed (1)
      Tests  40 passed (40)

build
dist:audit: 200 HTML file(s), 26780 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 74 document page(s), each with its AI notice and sources; 99 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/business-types/food/: 24.0 KB without a profile, 24.0 KB with one (budget 25.0 KB, 1.0 KB left).
dist:budget: 200 page(s) within budget.

e2e
  1 failed
    [mobile] › tests/e2e/search.spec.ts:207:3 › the search dialog › Enter while the index loads opens the result for the text when it arrives
  103 skipped
  1711 passed (24.5m)

a11y
  420 passed (14.7m)
```

## Independent checks

- **Targets ≥ 44px.** Every link, button, summary and input in `<main>` was measured on home, the 5 hubs, business types, `/templates/` and My path, in EN and AF, at 320 and 1280px. A card's link was measured by the box its `::after` covers. Item 2 adds no new target under 44px. The only small items are:
  - inline links in the business-types document text;
  - the inline step-title links and the 20px checkboxes on My path. Their markup is unchanged since `5fbea62`; the checkboxes are labelled.

  Each tool action is 44px tall at every width.
- **The stoep.** The link's accessible name is "Three short questions. Then you get the steps that apply to you, in order. Start Find my path" (AF: "… Begin Vind my roete"). It starts with the visible caption and names Find my path. The `<figure>` has no `aria-label` or `aria-labelledby`, so the caption is heard once. The roof is `aria-hidden`. The numbers are `content: counter() / ''`. The figure holds one tab stop and nothing interactive is nested. The overlay covers the figure, and `home-hubs.spec.ts` clicks a step and lands on Find my path.
- **Keyboard order and focus.** On home the tab order is the same at 320 and 1280px (23 stops): "How this was made" (in the AI line), Find my path, I know what I need, the stoep, the 2 page rows, "Open the checklist", the 7 tiles, "See all business types", the 4 rows, the 3 "Official source" links, "How this was made". Every stop showed a ring of at least 2px on the element or round its card or figure. Paperwork at 1280 has 9 stops: rows, then 5 × "Open template: …". `/templates/` at 320 has 8. The business-types hub and My path have no stop without a ring.
- **Contrast.** This was computed for every text node in cards, rows, the stoep, the hero, facts, the trust list, steps and the "Your path" card, in both themes on 8 pages:
  - Lowest text pair: 6.88:1 in light (lead, AI line, stoep caption, row summaries) and 7.38:1 in dark.
  - Tool frame: 8.13 (light) and 8.48 (dark).
  - Action edge: 4.67 and 4.48.
  - Row rule: 5.88 to 8.26 (light) and 8.49 to 9.69 (dark).
  - Roof and fact rule: 7.67 and 9.27.
  - Step circle edge: 7.67 and 9.27.
  - Step rail: 4.40 and 4.90.

  Every graphic pair is above 3:1.
- **Forced colours.** Tested with the OS theme light and dark and the site theme light and dark (4 combinations). The roof, the stoep step edges, the row rule, the row hairline, the tool frame, the tile edge, the fact rule, the "Your path" frame and the step circle edge all compute to `CanvasText`. The tool action edge is `LinkText`. The rail is `CanvasText` via `forced-color-adjust: none`. The pass 1 roof fix (m4) works: the roof is rgb(255,255,255) on a dark contrast theme with the site's light theme. Page, tool and tile stay distinct; see `forced-paperwork-af-1280-forced.png`. One leftover box is m1.
- **Motion.** The diff adds no `transition`, `animation` or `transform`. Every `:hover` rule for `.st-card` or `.st-stoep` sits inside `(hover: hover)` (the e2e walk passes). Hover changes colour only. Nothing moves on load, so reduced motion has nothing to remove.
- **Without JavaScript.** The nojs project passed. It now includes the AI line at 320×568 in both languages, the stoep link, and a template tool's action.
- **Home AI line on the first screen** (the top of the line ≤ screen height − 44px). The table gives the top of the line in page px, after → before (`5fbea62`):

  | Screen | EN, JS | EN, no JS | AF, JS | AF, no JS | EN, saved answers | AF, saved answers | EN, "Gaan voort in Afrikaans" banner |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | 320×568 (limit 524) | **466** ← 490 | **514** ← 538 | **466** ← 490 | **514** ← 538 | 801 ← 823 | 871 ← 893 | 787 ← 811 |
  | 360×740 (limit 696) | 440 ← 464 | 488 ← 512 | 469 ← 493 | 517 ← 541 | 775 ← 797 | 860 ← 882 | 674 ← 698 |
  | 412×915 (limit 871) | 392 ← 416 | 492 ← 516 | 392 ← 416 | 492 ← 516 | 728 ← 750 | 728 ← 750 | 626 ← 650 |

  The delegate's decision holds at all three sizes, both languages, with and without JS. No-JS at 320×568 was off the first screen on `main` and is now on it. **With saved answers** the line is below the first screen at 320 and 360 but on it at 412. In every case it is 22px higher than on `main`, so this is not a regression. My judgement is that it **needs no fix**. That reader has been through Find my path, and the wizard, its result and My path all carry the "Written by AI…" line. The "Your path" card is the right thing for a returning reader's first screen. `docs/design-system.md` already records this case. The language-banner case behaves the same way and is not recorded (n2).
- **Tools on a row.** Paperwork and `/templates/` were checked in EN and AF at 768, 1024, 1280 and 1440, and Look it up and home at the same widths. Every row of tools has equal panel heights and equal action tops (rows are 2+2+1 at 768 and 1024, 3+2 at 1280 and 1440). The pass 1 fix (m1) works. **Meta is kept on hub tools**: "1 min read" or "2 min read" on templates, "7 min read" on the checklist (AF "… min. leestyd"). `/templates/` never showed a read time, so it loses none.
- **320px, longest Afrikaans, zoom.** No page scrolls sideways at 320 or 640 CSS px, in EN or AF. 640 CSS px is 1280 at 200% zoom, and 320 is 1280 at 400%. The pages checked: home, 5 hubs, business types, `/templates/`, My path and a Find my path result. The only "overflow" found was visually hidden text clipping as designed, plus one document table inside its own scroll region on AF My path. The stoep keeps each AF step on one line, and the tool titles take the full width below 480px.
- **Content kept.** The visible text of `<main>` was diffed word by word against `5fbea62`:

  | Page | Lost | Gained |
  | --- | --- | --- |
  | Home (EN/AF) | "Read Core: start here" and "Open the core section" (redundant, recorded) | The three stoep steps and the caption |
  | Hubs | Every "Page n of N" eyebrow (recorded) | "Tools in this section" and the template actions |
  | Look it up | Nothing | Nothing; the checklist moves from second in the list to the tools after the rows |
  | `/templates/` | Nothing | "Open template" ×5 |
  | My path | Nothing | Nothing |

  The business-types hub lost a block ("Your kind of business / Pick your business type / Vehicle dealer …"). That comes from `Doc.astro` (item 1), not from item 2.
- **Late-font layout shift.** Every `.woff2` was held until the DOM and stylesheets were in, then released. 16 pages were measured (home, 5 hubs, business types, `/templates/`, in EN and AF). Worst result per width, before → after:

  | Width | Before | After |
  | --- | --- | --- |
  | 320×568 | 0.010 | 0.012 (`/`) |
  | 1024 | 0.068 (`/af/`) | 0.010 (`business-types/`) |
  | 1280 | 0.012 | 0.024 (`/`) |
  | 1440 | 0.010 | 0.004 |
  | home scrolled to 1,200 or 2,400px (360 and 1280, EN and AF) | 0.052 (`/af/` at 1280) | 0.006 |

  Every page stays far under 0.1. The figures match `docs/design-system.md`.
- **Weight and a slow first visit.** Test conditions: 360px, cache off, 150 ms latency, 1.6 Mbit/s, gzip, 5 runs, median FCP shown (range in brackets).

  | Page | Stylesheets | Requests | Transferred | FCP |
  | --- | --- | --- | --- | --- |
  | `/` | 2 → 4 | 22 → 24 | 108.6 → 111.1 KB | 732 (696–940) → 824 (752–968) ms |
  | `/af/` | 2 → 4 | 22 → 24 | 108.7 → 111.2 KB | 792 → 812 ms |
  | `core/` | 4 → 5 | 21 → 22 | 109.8 → 111.0 KB | 852 → 888 ms |
  | `paperwork/` | 4 → 5 | 21 → 22 | 109.2 → 110.7 KB | 880 → 772 ms |
  | `templates/` | 2 → 3 | 19 → 20 | 102.0 → 103.3 KB | 860 → 772 ms |

  The before and after ranges overlap on every page. The script count is unchanged (17 on home), and `dist:budget` shows JavaScript unchanged. The cost of the extra stylesheets was recorded after pass 1 (n4) and is accepted in the design record.
- **Print.** Home and Paperwork were printed to A4 PDF. The stoep and the hero buttons are left out. Row rules, tool frames and tile hairlines print. See n1 for the tool actions and for panels split across pages.
- **Project rules.** The diff contains:
  - no literal colours outside `tokens.css`;
  - no `href="/…"` literals;
  - no `localStorage` use;
  - no new script.

  Every new string (`home.stoepCaption`, `home.stoepLink`, `section.toolsHeading`) is in both locales. The removed keys (`home.whereToStart.anHour.action`, `section.pageNumber`) are gone from both locales and from `ParamNames`. Hubs are not content pages, and they keep their dated AI line.

**Audit item 3: can a first-time reader tell a page, a tool and a step apart at a glance on a phone?** Yes, in both themes and in forced colours.

- **A page** is a bare row: a coloured rule and a serif title link.
- **A tool** is a framed panel with a sans title and a button-shaped action (a yellow-edged button in forced colours).
- **A step** is a numbered circle on a rail.
- **A kind of business** is a tile with its picture.

See `lookup-af-320-dark.png`, `paperwork-af-768-dark.png`, `mypath-en-320-light.png` and `forced-paperwork-af-1280-forced.png`.

## Findings

### minor m1: in forced colours the "plain" read time on hub rows and tools is boxed again, with its text touching the box
File: src/styles/utilities.css:123-128 (the `.st-row .st-card__meta .st-badge, .st-card[data-variant='tool'] .st-card__meta .st-badge` rule), src/components/pages/SectionLanding.astro:89-96 and 125-134
Acceptance item: forced colours. This is the same defect item 1 fixed on the document page (`7cf306f`, "a bare badge for the document's meta line").
What is wrong: the rule makes the badge's border `transparent` and takes away its side padding. Forced colours repaint every border in `CanvasText`. So on every hub row and every hub tool, "11 min read" / "1 min. leestyd" sits in a 1px box whose left and right edges touch the icon and the last letter. That is a cramped chip, and it is the "one box too many" that the Critique round 1 removed. Measured: `border-top: solid rgb(255,255,255) 1px` on the row badge and the tool badge, in all 4 OS/site theme combinations. See `forced-paperwork-af-1280-forced.png` (right half, under each row and each template).
How to reproduce: open `/af/paperwork/` with forced colours on, and look at "11 min. leestyd" under "Dokumente en sjablone".
Suggested fix: pass `bare` to the `Badge` components in `SectionLanding.astro` (rows and tools). `Badge` already removes the border with `border-style: none`, and forced colours leave that alone. Then delete the transparent-border rule from `utilities.css`. Extend the forced-colours e2e test to check that `border-top-style` on a hub row's read time is `none`.

### nit n1: in print a tool still shows its button-shaped action, and a panel or tile can split across two pages
File: src/components/ui/Card.astro:105-115 and 256-284 (and `src/styles/print.css:28-41, 105-113`)
`print.css` hides `.st-btn` and the stoep is hidden for the same reason: on paper it is a link nobody can follow. But `.st-card__action` is not a `.st-btn`, so "Open template" ×5 and "Open the checklist" print as framed buttons (`after-paperwork` PDF, page 1). Also, `.st-card` has no `break-inside: avoid`. On A4, the second row of templates on Paperwork, and the third and fourth tiles on home, start on page 1 and end on page 2.
Suggestion: add `data-print="hide"` (or `st-no-print`) to `.st-card__action-row`, and `break-inside: avoid` for `.st-card[data-variant='tool'], .st-card[data-variant='type']` in `print.css`.

### nit n2: the home AI line is also below the first screen when the "Gaan voort in Afrikaans" banner shows, and this case is not recorded
File: docs/design-system.md, "The home page, the hubs and the card set", first bullet
With `st.lang = af` on the English home page at 320×568, the banner sits above the hero and the AI line starts at 787px (811 on `main`). At 360×740 it is on screen (674). As with saved answers, this reader has used the site before (they chose a language in the switcher), so I see no need for a code change. The design record names only the saved-answers case.
Suggestion: add one sentence: "the same holds when the language banner shows (787px at 320×568, on screen from 360×740)".

### nit n3: on a hub, the template action's accessible name repeats "template"
File: src/components/pages/SectionLanding.astro:51-53
On Paperwork the name is "Open template: Quotation (template)". `docTitle` includes "(template)". On `/templates/` the same action is "Open template: Quotation". A screen reader user moving through the links hears "template" twice on every hub tool, and the two pages name the same action differently.
Suggestion: on the hub, use the template's short name as `actionContext`, as `/templates/` does (`item.name`). Keep the visible title as it is.

### nit n4: a tap on a tool's read time does nothing
File: src/components/ui/Card.astro:177-187
`.st-card__meta` sits above the link overlay (`z-index: 1`) so that a link placed in it would stay usable. Hub tools now carry a meta row, so a strip about 20px tall in the middle of each tool panel is the one part of the panel that does not open the tool. Rows and tiles have had the same strip since `5fbea62`. It matters a little more on a framed panel, which looks like one target.
Suggestion: when the meta slot holds no interactive content, which is true everywhere today, add `pointer-events: none` to it, or raise it only with `:has(a, button)`.

### Also noticed (no finding against item 2)
- **A flaky search test on the document page, not caused by item 2.** `search.spec.ts:207` ("Enter while the index loads…") failed once in the full run. Repeating it 10× in chromium and mobile (`--repeat-each=10`) gave 5/40 failures on `756f2f4` and the same 5/40 on `188f895` (the `wp50-p3-doc` head merged here). On `5fbea62` it passed 40/40. The page navigates to `/search/?q=PIS` instead of opening the dialog, so the native form submit wins over the dialog script. The flake therefore comes from the document-page work (item 1) or its merge base, not from item 2. It should go to the item 1 reviewer or the orchestrator before merge, because CI retries can hide it.
- The business-types hub loses the section's own page list ("Your kind of business / Pick your business type / …") in `<main>`. That change is from `Doc.astro` (item 1).
- Pass 1's two wording notes still stand: "Free tools" sits right above "Tools in this section" on Paperwork, AF uses "Gratis gereedskap" and "Nutsgoed" for the two, and the hub's "7 pages" counts tools too. These are for item 4 or the content.

## Verdict

CLEAN. The card set does what audit item 3 asked: on a 320px phone, in both themes and in forced colours, a page, a tool, a step and a kind of business each have one shape. All of pass 1's minors and nits are fixed and hold when measured:

- tool rows share a height and an action line;
- hub tools keep their read time;
- the AI line is on the first screen at 320×568 with and without JS in both languages;
- the roof is `CanvasText`;
- the stoep has one name, which says where it goes;
- the stoep stays off paper.

No accessibility regression, no layout-shift or weight regression, and no broken project rule were found. m1 repeats a defect that item 1 already fixed, with a ready component option (`bare`), and should be fixed. The nits can follow under the 17 September amendment.
