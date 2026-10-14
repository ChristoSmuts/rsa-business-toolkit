# WP-50 Phase 3, item 1 (document page): review pass 2

**CLEAN**: zero blocker, zero major. Four minor, four nit.

- Branch reviewed: `wp50-p3-doc` at `188f895` (11 commits on `main` at `5fbea62`: the document page and pass 1's fixes), checked out as `review-p3doc-pass2`. The whole diff `5fbea62..188f895` was reviewed, not only the fixes.
- Reviewer: fresh instance, first look at this work. No source, style, test or content file was edited.
- Checklists: `stoep-design` (hard rules, rule 9 as amended in `649019a`), `web-interface-guidelines`, `accessibility`, `review-animations` (the only motion change is a removal: the card's hover lift; the chevron turns at once, so nothing to review).
- Before/after screenshots (Chromium 1243 headless, Linux, DPR 1; `5fbea62` left, `188f895` right, two screens tall at 320, one and a half at 768, two at 1280): `docs/reviews/WP-50-phase3-doc-pass2/`. 19 composites plus the contents-column focus ring.

## Gate, re-run by the reviewer

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. ESLint, Prettier, Stylelint clean (no `no-invalid-position-declaration` quirk in this worktree); `astro check` 328 files, 0 errors, 0 warnings, 0 hints; unit + dom 81 files, 3437 tests passed; content drift none; content 40 passed. |
| `pnpm build` | exit 0. 200 pages; `dist:audit` 26,659 URLs, no problems; `dist:trust` 74 document pages each with AI notice and sources, 99 AF pages with language of parts correct; `dist:budget` heaviest document page `/af/business-types/food/` 24.0 KB (1.0 KB left; `5fbea62` built here: 24.1 KB), heaviest other `/af/search/` 34.6 KB (was 34.8). |
| Playwright chromium + mobile + nojs, port 4961 | 1,677 passed, 101 skipped, **2 failed** (27.0m): `interactive.spec.ts:793` (ring motion, `expect.poll` 5s timeout) and `search.spec.ts:221` (Enter while the index loads). Both ran while this reviewer's probe sweeps loaded the machine; neither spec nor anything they test is touched by the diff. Re-run alone with `--repeat-each=3`: **6 passed** (12.7s). Judged load flakes, not findings. |
| `pnpm test:a11y`, port 4962 | exit 0: 420 passed (9.7m). |

## What was verified, and how

Production builds of `5fbea62` (exported with `git archive`, built in the reviewer's scratchpad) and `188f895`, served statically under `/business-toolkit/`, Chromium 1243 headless, web fonts loaded unless stated. Probe scripts are in the reviewer's scratchpad (`p3docr2/`), not committed.

### Top of the page and the AI notice (rule 9)

Order on screen (sorted by position): tall phones and wider screens H1, lead, meta line, AI notice, translation notice (AF); short phones (< 768 × < 740) and landscape (< 500 high) H1, notices, lead, meta. Breadcrumb above, then "On this page (N sections)", "Words used on this page", the switch where it applies, the text.

Sweep: 30 pages (15 EN + 15 AF: vehicle dealer, food, business-types hub, Core tax, Core Pty Ltd, Core closing, start here, what has changed, sources, glossary, checklist, invoice, privacy notice, which template, mood and materials) × 10 viewports × JS on/off, both builds; landscape viewports then on all 74 document pages (head). A case passes when the notice's 44px label row ends inside the screen.

| Viewport | JS: off-screen before → after | No JS: before → after | Worst after (JS / no JS) |
| --- | --- | --- | --- |
| 320×568 | 0 → 0 /30 | 0 → 0 | 393 / 441 |
| 360×740 | 0 → 0 | 0 → 0 | 576 / 624 (AF dealer) |
| 412×915 | 0 → 0 | 0 → 0 | 473 / 573 |
| 800×360 | 30 → 0 | 30 → 30 | 243 / 395 |
| 844×390 | 30 → 0 | 30 → 5 (13/74) | 245 / 397 |
| 915×412 | 30 → 0 | 30 → 3 (**9/74**) | 247 / 399 |
| 896×414 | 30 → 0 | 30 → 3 (**9/74**) | 247 / 399 |
| 568×320 | 30 → **1** (1/74) | 30 → 30 | 315 / 415 |
| 640×360 | 9 → 0 | 30 → 9 (27/74) | 274 / 374 |
| 740×360 | 0 → 0 | 30 → 30 | 225 / 377 |

**No case regressed against `5fbea62`**: no page/viewport/JS combination that had the label row on the first screen lost it, and every landscape case moved up (for example AF vehicle dealer 844×390 no JS 701 → 397; `af/start/start-here/` 568×320 JS 375 → 315). On tall phones the notice is lower than before (360×740 EN dealer 416 → 521) because direction A puts the lead and meta line first there; it stays well inside the screen (worst 624 of 740 without JS). The recorded landscape limit is understated, though: see minor 1. No horizontal scroll in any case.

### First content heading at 360×740 (JS, fonts loaded)

| Page | Before | After |
| --- | --- | --- |
| Vehicle dealer EN / AF | 1,970 / 2,326 | **1,408 / 1,675** |
| Food EN / AF | 1,879 / 2,289 | 1,317 / 1,638 |
| Core closing as a sole proprietor EN / AF | 1,811 / 2,215 | 1,457 / 1,746 |
| Core running a Pty Ltd EN / AF | 1,643 / 2,035 | 1,328 / 1,605 |
| Which template EN / AF | 1,642 / 2,020 | 1,328 / 1,591 |

Every one of the 30 sampled pages starts its text earlier (the templates by about 220 to 330px). The author's figures hold within 2px.

### Disclosures

- Names and counts: "On this page (41 sections)" / "Op hierdie bladsy (41 afdelings)", "Words used on this page" / "Woorde op hierdie bladsy", "38 more sources" / "Nog 38 bronne" (checked also on Core tax, glossary, checklist, sources register). Closed by default; 44px summaries.
- Accessibility tree: each is a `DisclosureTriangle` named by its words alone, `expanded: false`. The chevron is `::before` with `content: ''` and adds nothing to the name.
- Keyboard: focus shows the 3px ink ring (`rgb(30,27,22)`); Enter opens, Space closes.
- Forced colours (dark emulation): the chevron is drawn in `CanvasText` (yellow); the breadcrumb dot is `display: none`; the bare badge has `border-style: none`, so no box (pass 1 minor 4 fixed); other badges keep their `CanvasText` border.
- Print: the chevrons are hidden; "Words used" content prints (closed in the DOM, shown by `print.css`); the sources "more" summary is hidden and all 34/34 entries print (pass 1 nit 1 fixed).
- Without JavaScript: all three open by click.

### Contents column at 1280

Vehicle dealer 15 entries, all `data-depth="2"` (the 14 text h2s plus "Words used on this page", which now carries the page's name for it and `lang` of the UI); AF Core tax 9. Muted `#5C5648` at rest, `text-decoration-color: transparent`; hover shows the underline and takes the text colour; keyboard focus shows the underline and the 3px ink ring. Scrolled to the fifth h2, one entry has `aria-current="location"`, weight 600 and the 4px inset bar in `--st-primary`. Prose links in the article are underlined in `--st-primary`. Article width 928px. The ring loses its left and right sides: see minor 2 (pre-existing).

### "Sources for this page" and amended rule 9

Each condition of the amended rule checked:

| Condition | Evidence |
| --- | --- |
| Heading, count and first entries always shown | "41 sources" / "38 bronne" / "10 sources" line, first `<ul>` holds 3 items at every width. |
| Every entry in the HTML | 34/34 `li.st-source` on vehicle dealer, 38/38 on AF glossary in the DOM at 360; `dist:trust` passes. |
| Opens without JavaScript | no-JS click opens `.st-sources__more` (and `nojs.spec.ts` asserts it). |
| Every entry prints | 34/34 visible under print media at 360, 768 and 1280; the summary hidden. |
| All entries show from 768px | 34/34 and 38/38 visible at 768 and 1280, summary hidden; Tab from the third entry's link lands on the fourth (inside the closed `<details>`). |
| The AI notice never collapsed | Not in a disclosure on any of the 74 pages; words unchanged (`dist:trust`). |

Met, in this Chromium. The "from 768px" part rests on `::details-content` (nit 3).

### Afrikaans heading hyphenation

`:is(h1, h2, h3):lang(af) { hyphens: auto; hyphenate-limit-chars: 12 5 5 }` computes to `auto` on AF headings. This Chromium has no Afrikaans dictionary, and the result is byte-for-byte the old fallback: at 320px the same 28 words in AF headings split across lines in both builds (for example "verifikasieregiste / r" in the sources register's H1, "PRIVAATHEIDSKENNISGEWING", "Handelsmerktoepassings"), and every AF heading on all 37 AF documents has the same height in both builds. So the change is safe where it does nothing and the fallback keeps everything inside the screen. See minor 4 for what it does where a dictionary exists.

### Zoom and reflow

All 74 document pages at 640×400 (1280 at 200%), 320×200 (400%) and 320×568, with and without JS: no horizontal page scroll and no element in `<main>` past the viewport outside a table scroll region (444 cases).

### Contrast of changed pairs (measured in the page, AF vehicle dealer)

| Pair | Light | Dark |
| --- | --- | --- |
| Compact AI notice body / label / link | 14.54 / 6.73 / 6.89 | 11.57 / 8.04 / 6.81 |
| Compact translation notice body / link | 15.56 / 7.37 | 11.78 / 6.93 |
| Bare read-time badge on paper | 16.20 | 15.76 |
| Effort label / value | 6.88 / 16.20 | 8.06 / 15.76 |
| Effort bar on (`--st-primary`, graphic) | 7.67 | 9.27 |
| Breadcrumb link | 7.67 | 9.27 |
| Breadcrumb dot (decoration, hidden from AT) | 6.00 | 8.39 |
| Disclosure summaries (both, and "more sources") | 16.20 | 15.76 |
| Contents column title / link | 6.88 | 8.06 |
| Contents column current bar (graphic) | 7.67 | 9.27 |

All pass at 360 and 1280.

### Late-font layout shift

Every `.woff2` held until the page and the reader's scroll position are in place, then released; sum of `layout-shift` from release to `fonts.ready` + 800ms; reduced motion; 4 pages at a time. All 98 sitemap pages for "top", 74 document pages for "scrolled". `5fbea62` → `188f895`:

| Position | Over 0.1 | Sum | Worst after | Newly over 0.1 |
| --- | --- | --- | --- | --- |
| Top, 320×568 | 0 → 0 | 0.173 → 0.210 | 0.034 | none |
| Top, 1024×800 | 0 → 0 | 0.226 → 0.443 | 0.069 (`/af/`) | none |
| Top, 1280×800 | 0 → 0 | 0.275 → 0.212 | 0.023 | none |
| Top, 1440×800 | 0 → 0 | 0.279 → 0.142 | 0.010 | none |
| 360×740, scrolled 800 | 1 → 1 | 1.097 → 0.584 | 0.138 | none |
| 360×740, scrolled 1500 | 4 → **5** | 1.967 → **2.266** | 0.185 (`start/start-here/`) | `core/start-here/` 0.072 → 0.174, `branding/mood-and-materials/` 0.099 → 0.162, `af/start/start-here/` 0.076 → 0.149, `af/start/how-this-was-made/` 0.001 → 0.137 |
| 360×740, scrolled 2500 | 16 → 7 | 3.985 → 2.425 | 0.230 | `af/core/closing-as-a-sole-proprietor/` 0.006 → 0.230, `start/start-here/` 0.045 → 0.132, `core/paying-yourself/` 0.040 → 0.111 |
| 1280×800, scrolled 1500 | 6 → 2 | 2.178 → 1.045 | 0.173 | `af/core/you-are-the-business/` 0.027 → 0.173, `af/start/what-has-changed/` 0.002 → 0.150 |
| 360×740, scrolled 1500, unhinted | 2 → 2 | 0.621 → 0.808 | 0.300 (`start/start-here/`) | none |

**Top of every page, every width: 0 over 0.1 before and after**, worst 0.069; the 1024 sum doubles but stays a scatter of ~0.01 values (the recorded cause, the compact notice's 15px text gaining a line, is consistent with it). Scrolled, the picture improved overall (the sum falls at 800 and 2500 on a phone and halves at 1280; pages over 0.1 fall 16 → 7 and 6 → 2), with one depth worse (1500px on a phone) and named pages newly over 0.1 at each scrolled depth. These are exactly the pages the author records (`docs/design-system.md`, "Review pass 1 follow-up"), and the figures reproduce. The shift happens only while the fonts arrive; once they are in, the layout is fixed, and nothing about the loaded pages is harder to read (checked by screenshot on the named pages). **The recorded limit is honestly stated and acceptable as a minor** (minor 3), with Phase 5's real-phone check as the owner. Small inconsistencies in the record: nit 4.

### Pages that use `Doc.astro` but are not a typical document

Glossary (AF 1280), sources register (EN/AF 320/768/1280), master checklist (AF 360), invoice template (AF 1280), business-types hub (AF 360): no breakage. The checklist keeps its "proof of compliance" note right under the disclosures; the invoice's form and preview take the full width at 1280 with no contents column; the glossary's sources collapse past three on a phone.

### Project rules spot-checked

No `href="/…"` literals added; no literal colours outside `tokens.css` (Stylelint passes); new strings `trust.sources.more` (one/other) and the renamed `doc.wordsUsed` exist in both `en.json` and `af.json`; heading id `words-used-in-this-file` unchanged; no storage access added; the removed `--st-opsz-*` tokens have no remaining readers; budgets do not grow (24.1 → 24.0 KB).

### a11y

`pnpm test:a11y` (port 4962): exit 0, 420 passed (9.7m), both themes, every sitemap URL plus the open-state cases.

## Findings

### minor 1: the recorded landscape limit says 915×412 and 896×414 pass; 9 of 74 pages do not without JavaScript, and one page misses at 568×320 with it
File: `docs/design-system.md:1131`; `src/layouts/Doc.astro:26-32`; `tests/e2e/nojs.spec.ts:447-451`; `tests/e2e/doc-page.spec.ts:69-87` (test at line 77)
Acceptance item: Stoep rule 9 (first screen); honesty of the recorded limit. Not a regression.
What is wrong: The record and the commit `7aae628` say that without JavaScript only screens "lower than about 400px" miss and that "915×412 and 896×414 pass". Measured on all 74 document pages, at 915×412 and 896×414 with no JS the notice starts at 399px on 9 pages (label row ends at 430, below 412/414): `business-types/professional-creative/`, `core/working-from-home-and-safety/`, `branding/mood-and-materials/`, and AF `beauty`, `professional-creative`, `retail-online`, `working-from-home-and-safety`, `start/start-here`, `branding/mood-and-materials`. At 844×390 it is 13 of 74 pages that miss, not all (some pass, so "lower than about 400px" is roughly right there). With JavaScript, `af/start/start-here/` at 568×320 starts at 315px (label row ends 345 > 320), against the record's "272 (568×320)" for the dealer. The tests check only the vehicle dealer, which passes at both. Every one of these cases was further down in `5fbea62` (for example 654 → 399, 375 → 315), so nothing regressed, and the decision to wait for the one-row header (item 5) stands; but the stated limit should match what a reader gets.
How to reproduce: `p3docr2/top-land.mjs` against the head build, or DevTools at 915×412 with JavaScript off on `/af/business-types/beauty/`.
Suggested fix: correct the record: "without JavaScript the notice misses the first screen on landscape phones up to about 414px high on pages whose H1 or breadcrumb takes an extra line (9 of 74 at 915×412), and on all at 400px or lower; with JavaScript it is on the first screen everywhere except `af/start/start-here/` at 568×320". Add a second, longer-titled page (for example AF `start/start-here/` and AF `business-types/beauty/`) to the landscape tests so item 5 inherits a guard that would have caught this.

### minor 2: the contents column's focus ring loses its left and right sides (pre-existing)
File: `src/components/navigation/TableOfContents.astro:286-287` (column `overflow-y: auto`), with `.st-toc__list a` filling the column's width
Acceptance item: WCAG 2.4.7 is met; general quality of the focus indicator (direction A's 3px ink ring)
What is wrong: The column scrolls (`overflow-y: auto`, so `overflow-x` computes to `auto` as well), and each link is exactly as wide as the column (1008 to 1248px in both builds), so the ring, drawn 2px outside the link, is clipped on both sides. A keyboard user sees two horizontal bars above and below the entry rather than a ring (`contents-column-focus-1280-after.png`). Same geometry in `5fbea62`; still worth fixing while the column is being restyled, since direction A made the ring the focus signal and these links no longer have an underline at rest.
How to reproduce: 1280×800, `/business-types/vehicle-dealer/`, Tab into the contents column.
Suggested fix: give the column's list `padding-inline: calc(var(--st-focus-width) + var(--st-focus-offset))` (or a negative `outline-offset` on these links only), so the ring fits inside the scroll box.

### minor 3: late-font shift scrolled into a page: one depth worse on a phone and named pages newly over 0.1 (recorded, carried from pass 1)
File: `src/layouts/Doc.astro` (layout); `docs/design-system.md:286-298`
Acceptance item: WP-50 measures of done, "Layout shift stays at or below today's level on ... document pages"
What is wrong: Reproduced exactly as recorded (table above): at 360×740 scrolled 1500px, 4 → 5 pages over 0.1 and the sum 1.97 → 2.27; newly over 0.1 at each scrolled depth on the pages named there. The top of every page is clean at every width, and overall the shift fell (sums lower at 800 and 2500 on a phone and halved at 1280; counts 16 → 7 and 6 → 2). The author tried `text-wrap: pretty` as pass 1 suggested and explains why it cannot change line counts; the cause given (hinted 4% fallback gap on body paragraphs, three H1s that change line count) is consistent with which pages move. Judged acceptable as a minor: it is transient, only while fonts arrive, measured on Linux hinting, and the unhinted count is flat (2 → 2). It stays open for Phase 5's real-phone check, as recorded.
How to reproduce: `p3docr2/cls-all.sh`.
Suggested fix: none now beyond Phase 5; keep the named pages in that check.

### minor 4: Afrikaans heading hyphenation is a no-op here, and where it works it applies at every width
File: `src/styles/base.css:261-264`
Acceptance item: Stoep rule 8, readability (pass 1 minor 6)
What is wrong: In the test Chromium nothing changes (28 split words in AF headings at 320px in both builds; every AF heading the same height on all 37 AF documents), which is what the author says, and the fallback keeps every heading on screen, so this is not a regression. Two things remain. First, "verifikasieregiste / r" in the sources register's H1, the worst case, still shows to every reader whose browser lacks an Afrikaans dictionary (unverified here whether Chrome on Android has one). Second, where a dictionary exists the rule is not limited to narrow screens: on a laptop any heading word of 12 letters or more at a line end can be hyphenated where it used to wrap whole, which second-language readers find harder, and headings are where it shows most.
How to reproduce: `p3docr2/hyph.mjs` on both builds; `/af/sources/` at 320px.
Suggested fix: scope the rule to narrow screens (`@media (width < 480px)`), and for the few H1s that split mid-word in the fallback, consider a soft hyphen at the compound boundary in the Afrikaans title (a content change, so through the translation pipeline, not `src/data/**`), which gives a correct break in every browser.

### nit 1: the document-page section still states only the short-phone condition
File: `docs/design-system.md:505`
What is wrong: "On a short phone screen (below 768px wide and 740px high) the notices come before the lead…" was not updated for the landscape condition added in `7aae628`; line 1131 and `Doc.astro` have it.
Suggested fix: add "and on a landscape phone (below 500px high)" there.

### nit 2: the compact AI notice is a long line of small type on a wide screen
File: `src/components/ui/Callout.astro:84-98`
What is wrong: The compact body is 15px but the box keeps the page's measure (`45.56em` of 18px), so at 1280 a line of the notice runs to about 105 to 110 characters (`cmp-vehicle-dealer-af-1280-dark.png`), longer than the text beside it. The comment says this is deliberate (aligns with the text). It is the page's most important caveat; taste, so a nit.
Suggested fix: cap `.st-callout[data-size='compact'] .st-callout__body` at about 70em of its own size, or leave it.

### nit 3: "all entries show from 768px" depends on `::details-content`
File: `src/components/trust/SourcesForPage.astro:196-208`
What is wrong: In browsers without `::details-content` (Chrome before 131, Safari before 18.4, Firefox before 143) the summary stays at 768px and up and the rest stays collapsed, which the amended rule 9 does not allow as worded. The fallback works (one tap, prints, in the HTML), and the comment says so; the rule text does not.
Suggested fix: add "where the browser supports it" to rule 9's last condition, or accept as is.

### nit 4: two figures in the late-font record disagree with each other
File: `docs/design-system.md:290`, `:296`, `:298`
What is wrong: The table gives 2.16 → 2.36 and worst 0.291 (`start/start-here/`) for 360×740 scrolled 1500px; the follow-up paragraph says 2.16 → 2.33, and this review measured 1.97 → 2.27 with worst 0.185. All within run-to-run noise, but the paragraph at line 296 still quotes `start/start-here/` "0.249 → 0.291" as if exact.
Suggested fix: note the spread once ("±0.1 in the sum, ±0.1 on the worst page between runs") or quote the re-run.

## Pass 1 findings, verified

| Pass 1 | Status |
| --- | --- |
| minor 1 (rule 9 wording) | Fixed: rule 9 amended (`649019a`), same words in `docs/design-system.md`; the branch meets every condition (table above). |
| minor 2 (landscape) | Partly fixed as recorded: with JS every landscape case passes except one page at 568×320; without JS still waits for item 5. Recorded limit understated: minor 1. |
| minor 3 (late fonts) | Recorded with cause; reproduced; minor 3. |
| minor 4 (forced-colours chip) | Fixed: `Badge bare`, `border-style: none`. |
| minor 5 (first-screen test at 360/412) | Fixed: `doc-page.spec.ts` and `nojs.spec.ts`, dealer only (minor 1). |
| minor 6 (AF H1 break) | Rule added; no effect in this browser, as stated; minor 4. |
| nit 1 (printed "more" line) | Fixed. |
| nit 2 (unhinted row) | Fixed (2 → 2; this review also 2 → 2). |
| nit 3 (badge restyled from the layout) | Fixed (`bare` prop). |

## Not checked

- WebKit (unavailable) and real devices; Phase 5 owns NVDA/TalkBack, the real Android phone and the late-font shift with Roboto.
- Whether Chrome on Android or Safari has an Afrikaans hyphenation dictionary (minor 4).
- Screen readers by ear; semantics through the Chromium accessibility tree only.
