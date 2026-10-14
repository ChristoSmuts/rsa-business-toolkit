# WP-50 Phase 3, item 1 (document page): review pass 1

**CLEAN**: zero blocker, zero major. Six minor, three nit.

- Branch reviewed: `wp50-p3-doc` at `cb6cb58` (4 commits on `main` at `5fbea62`), checked out as `review-p3doc-pass1`.
- Reviewer: fresh instance, first look at this work. No source, style or content file was edited.
- Checklists: `stoep-design` (hard rules), `web-interface-guidelines`, `accessibility`, `review-animations` (the only motion change is a removal: the card's hover lift; the chevron turns at once, so nothing to review there).
- Before/after screenshots (Chromium, Linux, DPR 1, two screens tall, `5fbea62` left, `cb6cb58` right): `docs/reviews/WP-50-phase3-doc-pass1/`.

## Gate, re-run by the reviewer

| Command | Result |
| --- | --- |
| `pnpm gate:fast` | exit 0. lint, Prettier, Stylelint clean (no `no-invalid-position-declaration` quirk in this worktree); `astro check` 0/0/0 over 328 files; unit + dom 81 files, 3437 tests passed; content drift none; content 40 passed. (happy-dom prints "JavaScript file loading is disabled" stack traces from `tests/dom/theme-init.test.ts`; noise, the tests pass.) |
| `pnpm build` | exit 0. 200 pages; `dist:audit` 26,659 URLs, no problems; `dist:trust` 74 document pages each with AI notice and sources, 99 AF pages with language of parts correct; `dist:budget` heaviest document page `/af/business-types/food/` 24.0 KB (1.0 KB left, unchanged from main), heaviest other `/af/search/` 34.6 KB (was 34.8). |
| Playwright chromium + mobile + nojs | exit 0: 1,668 passed, 101 skipped (21.1m), port 4921, 2 workers. Includes the new `doc-page.spec.ts` and the changed `first-screen`, `nojs` and `wizard` specs. |
| `pnpm test:a11y` | exit 0: 420 passed (8.7m), port 4922, both themes, every sitemap URL plus the open-state cases. (A first attempt without `PLAYWRIGHT_BROWSERS_PATH` failed at browser launch, 0ms per test; environment only.) |

## What was verified, and how

All measurements: production builds of `5fbea62` and `cb6cb58`, served statically under `/business-toolkit/`, Chromium 1243 headless, web fonts loaded unless stated. Probe scripts are in the reviewer's scratchpad (`p3docr1/`), not committed.

### Top of the page and the AI notice (rule 9)

Order on every document checked (vehicle dealer, food, Core tax, Core Pty Ltd, start here, sources register, glossary, checklist, invoice template; EN and AF): breadcrumb (dot + one crumb on phones), H1, lead, meta line, AI notice, translation notice directly under it (AF), "On this page (N sections)", "Words used on this page", text. On short phones (< 768 × < 740) the notices move above the lead and meta line, as documented. The "Read Core first" callout is gone on all six business types (their first paragraph links Core in both languages). The AI notice's words are byte-identical to `5fbea62` on all 76 pages that carry it (compared as text).

AI notice top on the vehicle-dealer page, page px (the notice's 44px label row must end inside the screen):

| Viewport | JS EN | JS AF | no-JS EN | no-JS AF | On first screen |
| --- | --- | --- | --- | --- | --- |
| 320×568 | 354 | 354 | 402 | 402 | yes, all four |
| 360×740 | 523 | 578 | 571 | 626 | yes, all four |
| 412×915 | 434 | 475 | 534 | 575 | yes, all four |

Also swept 360×640, 360×739 and 320×740 on AF vehicle dealer, AF Core tax and AF invoice, with and without JS: on the first screen in every case. Landscape phones: see minor 2.

### First content heading at 360×740 (JS, fonts loaded)

| Page | Before | After | Author's claim |
| --- | --- | --- | --- |
| Vehicle dealer EN / AF | 1,970 / 2,326 | **1,410 / 1,677** | 1,410 / 1,677 (matches) |
| Food EN / AF | 1,879 / 2,289 | 1,319 / 1,640 | matches |
| Core tax and SARS EN / AF | 1,434 / 1,786 | 1,121 / 1,359 | (not claimed) |
| Core running a Pty Ltd EN / AF | 1,643 / 2,035 | 1,330 / 1,607 | (not claimed) |
| Start here EN / AF | 1,451 / 1,777 | 1,181 / 1,393 | (not claimed) |
| Sources register EN / AF | 1,476 / 1,818 | 1,198 / 1,398 | matches |

"Sources for this page" on vehicle dealer at 360: 8,273px → 910px (EN), 8,937 → 1,010 (AF); page 40,353 → 32,430. Claims hold. The AF dealer page is 197px over two screens; with a 165px header it is mostly the header (Phase 3 item 5) plus the 178px translation notice that rule 9 keeps. Accepted as the author states it.

### Rule 9 and "Sources for this page" collapsed on phones

Judged compliant. The section, its heading and its count ("41 sources") are always shown, with the first three entries (on the dealer page all three are SARS, "Official source"). Below 768px the rest sit in a native `<details>` whose summary states the number ("38 more sources" / "Nog 38 bronne", 44px target, `DisclosureTriangle` with `expanded=false` in the AX tree). Every entry stays in the HTML (`dist:trust` passes), opens without JavaScript (`nojs.spec.ts` and checked by hand), and prints (34/34 entries visible under print media, with and without JS). From 768px the summary is hidden and every entry shows; the entries are focusable in order (Tab from the third entry goes to the fourth) and exposed in the AX tree. This is what the WP-50 audit (finding 6) asked for, and ADR 0006 asks that the page "renders them in a Sources for this page section", which it does. The rule's wording ("cannot be ... hidden in a disclosure") is ambiguous for a partial collapse, so see minor 1.

The AI notice is not in a disclosure, is not demoted, and keeps its words, order and link; compact type is a restyle the rule allows.

### Disclosures, keyboard and screen reader

- Summary names: "On this page (41 sections)" / "Op hierdie bladsy (41 afdelings)", "Words used on this page" / "Woorde op hierdie bladsy". Closed by default at every width; `expanded` reported false; Enter and Space toggle; 3px ink focus ring (`rgb(30,27,22)`); 44px tall.
- The chevron is a `::before` with `content: ''`, so it adds nothing to the accessible name. Forced colours draw it (computed `CanvasText`, yellow in the dark emulation); print hides it.
- Breadcrumb dot: `aria-hidden`, gone in forced colours; the crumb's words name the section.

### Contents column at 1280

h2 entries only (15 on vehicle dealer, was 41 mixed h2/h3), muted `#5C5648` on paper, 6.88:1 (dark 8.06:1). At rest `text-decoration-color: transparent`; hover and `:focus-visible` show the underline; focus keeps the 3px ink ring. The section being read gets `aria-current="location"`, text colour, weight 600 and the inset bar; when the reader is in an h3 sub-section, its h2 is marked (scroll-spy takes the last listed heading passed). Forced colours: the underline is painted on every entry and the current bar shows (screenshot `forced-colours-column-dealer-en-1280.png`). Prose links keep `underline` in `--st-primary`. The column is sticky with its own scroll (`max-block-size: 712px`, `overflow-y: auto`), so the last entry stays reachable. Article width 640 → 928px.

### No JavaScript

Top-of-page order and AI notice position: table above. Both disclosures open with no script; the sources remainder opens with no script; nothing horizontal-scrolls.

### Zoom and reflow

1280 at 200% (640×400) and 400% (320×200), plus 768×1024 and 1280×800, on AF vehicle dealer, AF sources, AF glossary, AF checklist, AF invoice, AF "Which template", AF start here, JS and no-JS: no horizontal scroll anywhere.

### Contrast of every changed pair (measured in the page)

| Pair | Light | Dark |
| --- | --- | --- |
| Compact AI notice body on info bg | 14.54 | 11.57 |
| AI notice label | 6.73 | 8.04 |
| AI notice link | 6.89 | 6.81 |
| Compact translation notice body / link | 15.56 / 7.37 | 11.78 / 6.93 |
| Meta line read time (badge without chip) on paper | 16.20 | 15.76 |
| Effort label (muted) / value | 6.88 / 16.20 | 8.06 / 15.76 |
| Effort bar on (now `--st-primary`) on paper, non-text | 7.67 | 9.27 |
| Breadcrumb link | 7.67 | 9.27 |
| Disclosure summary and chevron | 16.20 | 15.76 |
| Contents column links and title | 6.88 | 8.06 |

All pass. The compact notices are 14px at 320–360px and 15px at 1280px.

### Late-font layout shift (every `.woff2` held, released with the reader in place, reduced motion, hinted Linux)

Sitemap pages (98) for "top"; document pages (74) for "scrolled".

| Position | Over 0.1 before → after | Sum before → after | Worst after |
| --- | --- | --- | --- |
| Top, 320×568 | 0 → 0 | 0.182 → 0.211 | 0.032 |
| Top, 1024×800 | 0 → 0 | 0.226 → 0.441 | 0.068 (`/af/`) |
| Top, 1280×800 | 0 → 0 | 0.274 → 0.212 | 0.023 |
| Top, 1440×800 | 0 → 0 | 0.279 → 0.142 | 0.010 |
| 360×740, scrolled 800 | 1 → 1 | 1.090 → 0.569 | 0.137 |
| 360×740, scrolled 1500 | 4 → **5** | 2.041 → **2.256** | 0.179 (`start/start-here/`) |
| 360×740, scrolled 2500 | 16 → 7 | 4.004 → 2.404 | 0.230 |
| 1280×800, scrolled 1500 | 6 → 2 | 2.178 → 1.052 | 0.173 |
| 360×740, scrolled 1500, unhinted | 2 → 2 | 0.787 → 0.824 | 0.300 (`start/start-here/`) |

The author's figures reproduce (within a few hundredths; the unhinted row is 2 → 2 here against the doc's 2 → 3). Pages that got worse are recorded in minor 3.

### Pages that use `Doc.astro` but are not a typical document

Glossary, sources register, master checklist, invoice template (EN/AF, 320/768/1280): no layout breakage. The template has no contents column and its form plus preview now span the full width at 1280 (912 → 1,216px; `cmp-invoice-af-1280-light.png`), which reads well. The templates index is a hub page, not `Doc.astro`; unchanged. The glossary's page shrinks 24,129 → 16,244px at 360 only because its 38 sources collapse past three.

## Findings

### minor 1: rule 9's wording does not yet cover the partial collapse of "Sources for this page"
File: `.claude/skills/stoep-design/SKILL.md:32`; `src/components/trust/SourcesForPage.astro:53`
Acceptance item: Stoep rule 9 / ADR 0006
What is wrong: Rule 9 says the sources "cannot be ... hidden in a disclosure". The section, heading, count and first three entries stay visible, and the rest is one tap away, in the HTML, in find-in-page and in print, so I judge it compliant with the rule's intent and with audit finding 6. But the rule text was not amended, while rule 7 was amended when the contents column changed. The next reviewer can read it the other way.
How to reproduce: 360×740, `/business-types/vehicle-dealer/`, scroll to "Sources for this page".
Suggested fix: add one sentence to rule 9 (and `docs/design-system.md`, "Sources for this page"): "On a phone, entries past the first three may wait in a native disclosure that states how many; the section, its heading and count, and the first entries never collapse, and every entry prints." Get the owner's nod if the protocol needs it.

### minor 2: on landscape phones the AI notice is still below the first screen
File: `src/layouts/Doc.astro:482`
Acceptance item: Stoep rule 9 (first screen); not a regression
What is wrong: The reorder applies only below 768px wide. At 800×360 and 844×390 (common landscape phones) the AF vehicle-dealer notice starts at 357–359px with JS (label row ends ~400px, screen 360–390), and with no JS (213px header) it is below the first screen at 568×320 up to 915×412. Before this branch it was worse in every one of these cases (for example 800×360: 547 → 357; 915×412: 504 → 313), so nothing regressed and the 320×568 contract holds.
How to reproduce: `top.mjs`-style probe or DevTools at 800×360, `/af/business-types/vehicle-dealer/`.
Suggested fix: when the header becomes one row (Phase 3 item 5), widen the short-screen condition to `(height < 740px)` alone or add `(orientation: landscape) and (height < 500px)`; add 800×360 to `first-screen.spec.ts`.

### minor 3: late-font shift scrolled 1500px on a phone: one more page over 0.1, four newly over
File: `src/layouts/Doc.astro` (layout), `src/styles/base.css` (fallback metrics)
Acceptance item: WP-50 measures of done, "Layout shift stays at or below today's level on ... document pages"
What is wrong: Everything else improved (table above), but at 360×740 scrolled 1500px the count goes 4 → 5 and the sum 2.04 → 2.26. Newly over 0.1: `core/start-here/` 0.072 → 0.173, `branding/mood-and-materials/` 0.099 → 0.162, `af/start/how-this-was-made/` 0.001 → 0.145, `af/start/start-here/` 0.076 → 0.142; worse: `start/start-here/` 0.105 → 0.179. At 2500px: `af/core/closing-as-a-sole-proprietor/` 0.006 → 0.230, `start/start-here/` 0.045 → 0.128, `core/paying-yourself/` 0.043 → 0.114 (the count still falls 16 → 7). At 1280 scrolled 1500: `af/core/you-are-the-business/` 0.027 → 0.173, `af/start/what-has-changed/` 0.002 → 0.149 (count 6 → 2). Unhinted (how Android lays text out) the phone row is 2 → 2. The author documents this and the cause (text now starts 500–650px higher, so body paragraphs, not the notices, sit at the viewport edge; H1s that change line count under `text-wrap: balance`). Not a reader-facing major on its own, since the aggregate halves and the unhinted count is flat, but it is a recorded regression on named pages.
How to reproduce: hold `*.woff2`, load at 360×740, scroll to 1500, release, sum `layout-shift` entries.
Suggested fix: keep it in the Phase 5 real-device check, and try `text-wrap: pretty` (or no balancing) on the document H1 at < 768px, which removes the line-count flip on the start pages.

### minor 4: forced colours: the meta line's read-time chip gets a border with no padding
File: `src/layouts/Doc.astro:412-416`
Acceptance item: general quality (forced colours)
What is wrong: `.st-doc .st-doc__meta > .st-badge` removes the chip with `border-color: transparent` and `padding-inline: 0`. Forced colours repaint the border in `CanvasText`, so "28 min read" sits in a tight box whose edge touches the icon and the last letter (screenshot `forced-colours-dealer-en-360.png`, below the lead).
How to reproduce: emulate `forced-colors: active`, `/business-types/vehicle-dealer/` at 360.
Suggested fix: `border-style: none` (or `border: 0`) instead of a transparent colour, or a `@media (forced-colors: active)` rule that drops the border.

### minor 5: the new e2e test checks the order at 360×740 but not that the AI notice is on the first screen there
File: `tests/e2e/doc-page.spec.ts:32`
Acceptance item: Stoep rule 9 guard
What is wrong: The short-screen reorder is now limited to `height < 740px`, so 360×740 and 412×915 rely on the HTML order to keep the notice on screen (523 / 578px today, 162px of slack in AF). `first-screen.spec.ts` checks only 320×568. A taller meta line or lead could push it off at 360×740 with no test failing.
Suggested fix: in `doc-page.spec.ts`, assert `.st-ai-notice` top + 44 ≤ viewport height at 360×740 and 412×915, EN and AF, JS and no-JS.

### minor 6: an Afrikaans H1 breaks inside a word at 320px (pre-existing)
File: `src/styles/base.css` (headings' `overflow-wrap: anywhere`)
Acceptance item: Stoep rule 8, readability
What is wrong: `/af/sources/` at 320px sets "Bronne- en verifikasieregiste / r" (a single "r" on the third line), before and after this branch (`cmp-sources-af-320-dark.png`). Not caused here, but the document page's H1 is this package's element, and a broken word in the title is hard for a second-language reader.
Suggested fix: `hyphens: auto` with `lang="af"` where the browser has the dictionary, plus a slightly smaller H1 step at < 360px, or `overflow-wrap: break-word` so a long word only breaks when it truly cannot fit.

### nit 1: printed pages show "38 more sources" as a bold line in the middle of the list
File: `src/components/trust/SourcesForPage.astro:144`, `src/styles/print.css`
What is wrong: Print opens the disclosure and drops the chevron, but the summary still prints in bold between entry 3 and entry 4, reading like a sub-heading.
Suggested fix: hide `.st-sources__more > summary` in `print.css`.

### nit 2: the unhinted phone row in `docs/design-system.md` differs from a re-run
File: `docs/design-system.md:293`
What is wrong: "360×740, scrolled 1500px, unhinted | 2 | 3"; this review measured 2 → 2 (sum 0.787 → 0.824). Probably a page on the 0.1 edge.
Suggested fix: note that the row is within run-to-run noise, or give the page.

### nit 3: the meta line's chip removal lives in `Doc.astro`'s global style
File: `src/layouts/Doc.astro:409-417`
What is wrong: Restyling another component's element (`.st-badge`) from the layout makes the Badge's look depend on its parent; a `Badge variant="plain"` (or a prop) would keep the rule with the component.
Suggested fix: optional; consider when Phase 3 touches Badge.

## Not checked

- WebKit (unavailable here) and real devices; Phase 5 owns NVDA/TalkBack and the real-phone check. The disclosure summaries use `display: flex`, which older Safari handled poorly; worth a look on the Mac pass.
- Screen readers by ear; semantics were checked through the Chromium accessibility tree.
