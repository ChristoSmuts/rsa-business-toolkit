# WP-50 Phase 0: code audit

Audited commit: `538366a` (docs: record the wp-33 merge). No source file was changed.

Checklists used: `stoep-design` (house rules, which win), `web-interface-guidelines` with its overrides table, `accessibility` (evidence-led loop and manual checks), `review-animations` with `STANDARDS.md`, and the generic-look list in `frontend-design`.

How the evidence was gathered:

- `pnpm build` and `pnpm test:a11y` on this worktree (results in section 2).
- Playwright scripts against `astro preview` on port 4883, base path `/business-toolkit/`, Chromium 1243. The scripts were kept outside the worktree. Phone runs use 360×800 with `hasTouch` and `isMobile` unless a line says otherwise.
- Every high and medium finding below quotes the code or gives the measured number. Where something could not be verified in this environment (WebKit, a real screen reader), it is not reported as a finding.

Severity: **High** makes a page harder to read or use for a first-time owner on a phone, or is an accessibility failure. **Medium** is a polish or consistency problem a reader would notice. **Low** is a nit.

## Summary

| Section | High | Medium | Low | Total |
| --- | --- | --- | --- | --- |
| 1. Web Interface Guidelines | 1 | 5 | 9 | 15 |
| 2. Accessibility | 0 | 1 | 3 | 4 |
| 3. Motion (`review-animations`) | 0 | 3 | 5 | 8 |
| 4. Generic-look check | 0 | 2 | 2 | 4 |
| **Total** | **1** | **11** | **19** | **31** |

Each finding is counted once, in the section that owns it. Motion issues that the web interface guidelines also cover (the progress ring, smooth scrolling, the card hover lift) are counted in section 3 only.

The ten that matter most, in the order a reader meets them:

1. **High.** On a 360px phone the first paragraph of a document is 2.6 to 4.3 screens down (section 1, `layouts`).
2. **Medium.** "On this page (41 sections)" and "Words used in this file" show no open or closed marker (section 1, `navigation`).
3. **Medium.** The phone top bar takes two rows (113px), and three rows (165px) when the device reports hover (section 1, `navigation`).
4. **Medium.** "Sources for this page" is 8,183px tall on the vehicle dealer page on a phone (section 1, `trust`).
5. **Medium.** The progress ring in the top bar draws in for 960ms on every page once a reader has a path (section 3; verdict Block).
6. **Medium.** Every keyboard focus move scrolls smoothly, because of `html:focus-within { scroll-behavior: smooth }` (section 3).
7. **Medium.** Low-data mode still downloads 97 KB of webfonts on each uncached visit (section 1, `layouts`).
8. **Medium.** Business details typed into one template are not offered in the next one (section 2, 3.3.7).
9. **Medium.** The "Now reading" pill truncates a translated heading with an ellipsis, against house rule 8 (section 1, `navigation`).
10. **Medium.** Stoep matches the first generic look (cream, high-contrast serif, terracotta-family accent) and half of the fourth (one card style everywhere, lifted on hover) (section 4).

---

## 1. Web Interface Guidelines review

Format: `file:line - issue [severity]`, grouped by folder. A folder marked "✓ pass" had nothing to report against `guidelines.md` after the overrides.

### src/layouts

```text
src/layouts/Doc.astro:245 - "Words used in this file" <details> renders `open`; with the header stack above it, the first paragraph of a document starts 2.6–4.3 phone screens down [High]
src/layouts/Base.astro:105-106 - font <link rel="preload"> runs before theme-init can set low data, so st.lowData=true still downloads both woff2 files (97 KB) [Medium]
```

**Doc.astro:245 (High).** Measured at 360×800, the `top` of the first `.st-blocks` paragraph:

| Page | First paragraph at | Screens down |
| --- | --- | --- |
| `/core/tax-and-sars/` | 2,113px | 2.6 |
| `/af/core/tax-and-sars/` | 2,490px | 3.1 |
| `/business-types/vehicle-dealer/` | 2,954px | 3.7 |
| `/af/business-types/vehicle-dealer/` | 3,431px | 4.3 |
| `/templates/invoice/` (first form field) | 1,938px | 2.4 |

What fills that space on `/business-types/vehicle-dealer/` (touch phone): the article header 213–1,094px (section label, h1, lead, read time, effort meter, AI notice), "Read Core first" 1,126–1,291px, then the open glossary 1,323–2,685px, which holds 14 terms. On Afrikaans pages the machine-translation notice adds another 243px. The AI notice alone is 418px tall in English and 469px in Afrikaans.

```astro
<details class="st-doc__terms" id="words-used-in-this-file" open>
```

House rule 9 keeps the AI notice and its link near the top, and that stays. The glossary has no such rule, and it is the single largest block. Phase 3 should decide how much of the header a phone sees before the text, in both languages.

**Base.astro:105-106 (Medium).** With `localStorage['st.lowData'] = 'true'`, `html[data-low-data]` is set, and the page still fetched `fraunces-latin-opsz-normal.woff2` (67,304 B) and `instrument-sans-latin-wght-normal.woff2` (30,092 B), exactly as with the setting off. The preloads are in the HTML, so no script can cancel them. The `:root[data-low-data]` font swap in `tokens.css:372-376` only stops the fonts from being used.

```astro
<link rel="preload" href={frauncesLatin} as="font" type="font/woff2" crossorigin />
<link rel="preload" href={instrumentLatin} as="font" type="font/woff2" crossorigin />
```

### src/components/navigation

```text
src/components/navigation/TableOfContents.astro:108-115 - summary set to display:flex removes the ::marker; no chevron replaces it [Medium]
src/layouts/Doc.astro:395-401 - same for the "Words used in this file" summary (listed here because it is the same pattern) [counted above]
src/components/navigation/TableOfContents.astro:203-209 - "Now reading" pill: nowrap + text-overflow: ellipsis on a translated heading (house rule 8) [Medium]
src/components/navigation/SiteHeader.astro:184-191,285-313 - phone top bar wraps to 2 rows (113px) or 3 rows (165px) [Medium]
src/components/navigation/SiteHeader.astro:209-219,267-279 - search link and Menu button have no :hover state [Low]
src/components/navigation/SiteHeader.astro:241-261 - from 1024 to 1365px the search control is the icon alone, which covers the common 1280 and 1366 laptop widths [Low]
src/components/navigation/NavDrawer.astro:78-91 - drawer dialog scrolls (overflow: auto) with no overscroll-behavior: contain [Low]
src/components/navigation/SectionSidebar.astro:145 - sticky top is calc(--st-topbar + space-4) = 72px, but the bar measures 71px, so the intended 16px gap is 1px; TableOfContents.astro:250 has the same rule [Low]
```

**TableOfContents.astro:108-115 (Medium).** A `<summary>` with `display: flex` is no longer a list item, so Chromium draws no disclosure triangle. The menus in `NavMenu.astro` add a chevron icon for this reason; the two document disclosures do not. On the phone screenshot, "On this page (41 sections)" reads as a bold label, and nothing says it opens. Measured on `/af/business-types/vehicle-dealer/`: both visible summaries have `display=flex`.

```css
.st-toc__summary {
  display: flex;
  align-items: center;
  min-block-size: var(--st-target);
```

**TableOfContents.astro:203-209 (Medium).** House rule 8: "Nothing truncates and nothing gets `white-space: nowrap` if it is translated." The pill text is the current heading, which is translated. The accessible name keeps the whole title, so this is a visual loss only. On the sample measured (`/af/business-types/vehicle-dealer/`, "Hou jou registrasie geldig") nothing was clipped, but longer Afrikaans headings on that page will be.

```css
.st-toc__pill-text {
  min-inline-size: 0;
  overflow: hidden;
  font-weight: var(--st-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**SiteHeader.astro (Medium).** At 360px with touch the bar is the wordmark row plus a row with Search, English, Afrikaans and Menu, 113px. Without `hover: none` (a phone with a mouse, or many desktop emulators) the `/` hint stays and Menu drops to a third row, 165px (screenshot `fold-business-types_vehicle-dealer_.png`). The bar is not sticky below 1024px, so this costs the first screen only, but that is the screen where the reader decides whether this site is for them.

### src/components/trust

```text
src/components/trust/SourcesForPage.astro:113-204 - on a phone the sources section is 8,183px on /business-types/vehicle-dealer/ and 2,082px on /af/core/tax-and-sars/; the pager comes after it [Medium]
```

House rule 9 forbids hiding the sources in a disclosure, and that is right. But every entry is a stand-alone 44px link plus a badge plus a "Supports:" hint, so 30 sources become ten phone screens. Phase 3 should make each entry more compact without hiding it.

### src/components/ui

```text
src/components/ui/TableScroll.astro:88-90 - `thead th { white-space: nowrap }` on translated column headings (house rule 8); contained in the scroll region, so the page does not overflow [Low]
```

The card hover lift, the ring animation and the toast keyframes are in section 3.

### src/components/interactive

```text
src/components/interactive/LangBanner.astro:124-134 - close button has no :hover state [Low]
```

### src/components/pages

```text
src/components/pages/SectionLanding.astro:64 - "Page n of N" eyebrow above every card title, inside an <ol> that already numbers them [Low]
```

### src/components/templates

```text
src/components/templates/TemplateTool.astro:306-322 - Fill in / Preview tabs have no :hover state [Low]
```

Redundant entry across templates is in section 2.

### src/pages

```text
src/pages/404.astro:39-100 - uses Base, not Page: no footer, so no Contents, About or "How this was made" links [Low]
```

### src/components/content

✓ pass

### src/components/search

✓ pass. Verified: `/` opens the dialog with focus in the field, arrow keys move `aria-activedescendant`, the status line counts results, and Escape returns focus to the header link that opened it.

### src/components/wizard

✓ pass. Verified by keyboard: Space chooses, Enter moves to the next question and focus lands on its heading, and the answers are checked again on a return visit.

### src/components/illustrations

✓ pass

### src/styles

```text
src/styles/base.css:128-131 - smooth scrolling on focus-within (counted in section 3)
src/styles/base.css:328 - link underline transition (counted in section 3)
```

No other findings. `content.css`, `search.css`, `print.css`, `tokens.css` and `utilities.css` pass.

### src/scripts

✓ pass. Focus management was checked in the browser: the drawer returns focus to Menu on Escape, the search dialog returns focus to its trigger, and the wizard moves focus to each step heading.

### Rules skipped because of an override

Title case, curly quotes in content, preconnect, `Accept-Language` detection, the hydration section, Tailwind class names, `virtua`, `nuqs`, and "provide a reduced variant" (the project's near-zero rule is applied instead; see section 3).

---

## 2. Accessibility audit

### Automated run

`pnpm build`: passed. 198 pages built. `dist:audit` found no link problems, `dist:trust` passed (72 document pages, 98 Afrikaans pages with language of parts correct both ways), and `dist:budget` passed. The heaviest document page is `/af/templates/invoice/` at 24.2 KB against a 25.0 KB budget.

`PLAYWRIGHT_BROWSERS_PATH=… PW_PORT=4882 pnpm test:a11y`:

```text
  416 passed (9.6m)
```

That is 200 sitemap URLs in the light theme, plus the dark theme and the dialog states. There were no violations.

**Low.** `tests/e2e/a11y.spec.ts:15` runs `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']` only, so axe's WCAG 2.2 rules (`wcag22aa`, which includes `target-size`) never run. The manual target check below found no failures, so this is a gap in coverage, not a defect.

### Manual checks

| Check | Result | Evidence |
| --- | --- | --- |
| Keyboard: home, a document, wizard, template, search dialog | Pass | Tab walks at 1280 and 360 (40–120 stops per page). Every stop showed a 2px outline or the card's `:has()` ring. No traps. Dialogs and the drawer return focus. |
| Focus not obscured (2.4.11) | Pass | At 1024, 1280 and 1366 the sticky bar is 71px and `--st-topbar-offset` keeps every focused element clear of it. The search dialog's sticky top covered no focused link at 1280×800 or 360×640. |
| 200% zoom and 320px reflow | Pass | 20 routes, English and Afrikaans, at 320px and at 640 CSS px (1280 at 2×): `scrollWidth − clientWidth = 0` on every one. |
| Forced colours | Pass, one Low | Screenshots of home, a hub, the wizard, a template and the checklist with `forcedColors: 'active'`: chips, segmented control, checked choices and the stepper all use `Highlight`. |
| Target size (2.5.8) | Pass | No link, button, field or summary under 24×24 on the 20 routes, except inline links in running text, which are exempt. |
| Consistent help (3.2.6) | Pass | Header (Search, then Menu) and footer (Contents, About, How this was made) are in the same order on 10 page types in both languages. The 404 page has neither; see section 1. |
| Redundant entry (3.3.7) | Wizard passes, templates Medium | See below. |
| Language of parts on Afrikaans pages | Pass, one Low | See below. |

**Redundant entry (Medium).** The wizard keeps its answers. After a full keyboard run, `/find-my-path/` came back with `entity=sole-prop, type=vehicle-dealer, stage=not-started` checked. Within one template, "Start next" carries the business and bank details.

Across templates, nothing carries. In the test, "Thandi Repairs" and a phone number were typed into the invoice, and the draft was saved under `st.template.invoice.v1`. The quotation, receipt and tax invoice then opened with both fields empty. Strictly, each template is its own process, so this is not a 3.3.7 failure. But an owner who uses all four types re-types the same five business fields four times. The cause is a stub:

```ts
// src/lib/templates/profile.ts:19-21
export function readBusinessDetails(): BusinessDetails | null {
  return null;
}
```

It is already tracked in `docs/reviews/backlog.md` ("Templates: pre-fill from the profile").

**Forced colours card focus (Low).** In forced colours the card's focus ring is `solid 2px rgb(255, 255, 255)`, the same colour as the card border. It reads as a second line 2px outside the border, which is visible but weaker than the 3px `CanvasText` ring that `base.css:615-619` gives every other control.

**Language of parts (Low).** `dist:trust` passes. A word-frequency scan of 12 Afrikaans pages found no unmarked English UI text. What it did find, unmarked, were English proper names inside Afrikaans text: Act titles ("Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972") on `/af/sources/` (62 runs), `/af/glossary/` and `/af/checklist/`, and "RLV-vorm — Application for Registration and Licensing of Motor Vehicle". Proper names are exempt under 3.1.2, but a screen reader will read them with Afrikaans rules. Bare URLs also showed up; they are not language.

Not done here: NVDA, TalkBack and WebKit. Phase 5 lists them.

---

## 3. Motion review (`review-animations`)

Inventory: every `transition`, `animation`, `@keyframes`, `@starting-style` and WAAPI call in `src/styles/**`, the components' style blocks and `src/scripts/**`.

- There is no `@starting-style` and no `element.animate()` anywhere.
- Scripts only toggle classes, and they call `scrollIntoView` in `search.ts:97`, `site.ts:62`, `applies.ts:303`, `template-form.ts:270` and `search-ui.ts:259`.
- `--st-ease` is `cubic-bezier(0.2, 0.7, 0.2, 1)`, an ease-out. There is no `ease-in` and no `transition: all`.

### Part 1: findings

| Before | After | Why |
| --- | --- | --- |
| `ProgressRing.astro:77` `animation: st-ring-draw calc(var(--st-duration-slow) * 3) …` (960ms), on the top bar's ring on every page once a profile exists. Measured with `document.getAnimations()`: `st-ring-draw 960ms` in the top bar on `/core/tax-and-sars/`, `/my-path/` and `/checklist/`. **Medium** | No animation in the top bar; on `/my-path/` and `/checklist/` draw only when the value changes, at ≤ 300ms | Seen on every page view (100+ times a day for an active reader), decorative, and over three times the 300ms UI budget |
| `base.css:128-131` `html:focus-within { scroll-behavior: smooth; }`. Measured: just after Tab, the newly focused element was still off screen while the page scrolled to it. **Medium** | Delete. If kept, scope it to same-page anchor links only | It animates a keyboard-initiated action on every Tab, which `STANDARDS.md` says never to animate. It also makes a keyboard user wait to see where focus went |
| `Card.astro:82-86` `.st-card[data-interactive='true']:hover { transform: translateY(var(--st-lift)); box-shadow: var(--st-shadow-2) }`, not in `@media (hover: hover) and (pointer: fine)`. **Medium** | Gate it behind `(hover: hover) and (pointer: fine)`, or drop the lift and keep only the shadow or the underline | Ungated hover motion sticks after a tap on a phone. Hub cards are passed over tens of times per visit. Lift on every card is also the generic tell in section 4 |
| `Card.astro:77-79` `transition: transform …, box-shadow var(--st-duration-base) …` **Low** | Transition `transform` only, or put the shadow on a pseudo-element and fade its `opacity` | `box-shadow` repaints each frame |
| `ToastRegion.astro:79,110` `animation: st-toast-in …` keyframes (opacity + 0.5rem translate), no exit. **Low** | A transition with `@starting-style`, and a short opacity exit | Copy toasts can fire back to back; keyframes restart from zero instead of retargeting |
| `TableOfContents.astro:185,211` `st-toc-pill-in`: opacity only, keyframes, each time the pill unhides. **Low** | Keep the fade but shorten it to `--st-duration-fast`, or delete it | It shows up during scrolling, which happens tens of times per page. It fades from nothing with no transform; acceptable for a pill that hangs in place, but it adds nothing |
| `base.css:328` `transition: text-decoration-thickness var(--st-duration-fast)` on every link. **Low** | Delete | Hover on links is the most frequent interaction there is. 120ms on underline thickness is not noticed, and it is a paint property |
| `search.css:96` `animation: st-search-flash 2s var(--st-ease) 1` (background colour). **Low** | Keep. Optionally fade an overlay's `opacity` instead of `background-color` | 2s is long, but it is a wayfinding cue the build plan asks for (B3, "2s highlight") and happens once per search result. The reduced-motion branch already holds a static highlight, which is the right shape |

`Button.astro:178-198` (press `translateY(1px)`, colour transitions) and `Button.astro:290` (spinner, `0.8s linear infinite`, removed under reduced motion) pass. `--st-duration-fast` is 120ms, inside the skill's 100–160ms press band. One gap: press and release use the same timing.

### Part 2: verdict

1. **Feel-breaking regressions.** The 960ms ring draw in the top bar on every page view, and smooth scrolling on every keyboard focus move. Both animate high-frequency actions.
2. **Missed simplifications.** The link underline transition and the pill fade could both be deleted.
3. **Performance.** `box-shadow` on card hover and `background-color` in the search flash. Both are small.
4. **Interruptibility and timing.** Toast keyframes should be a transition. Button press and release use the same timing.
5. **Origin, physicality and cohesion.** Nothing scales from the wrong origin, there is no `scale(0)`, and the motion is calm and fits the brief.
6. **Accessibility.** The card hover lift is not gated to fine pointers. Reduced motion is respected everywhere; see below.

**Decision: Block.** The ring in the top bar animates on every page view, and smooth scrolling animates every Tab. Both are "animation on a keyboard or high-frequency action". Everything else would pass with the Low items fixed.

### Reduced motion: project rule compared with the skill

The project sets every duration to zero. `tokens.css:354-361` sets `--st-duration-*` to `0ms` and `--st-lift` to `0px`, and `base.css:643-652` forces `animation-duration` and `transition-duration` to `0.01ms !important` on everything. Under `reducedMotion: 'reduce'` the measured ring animation was `0ms`.

`review-animations` asks for "gentler, not zero": keep opacity and colour, drop movement. Under the skill's rule, these would change:

| Element | Project rule today | Skill's rule |
| --- | --- | --- |
| Toast | Appears instantly | Opacity fade without the 0.5rem rise |
| "Now reading" pill | Appears instantly | Keeps its opacity fade |
| Card hover | Shadow changes instantly (no lift) | Shadow change may stay gently animated |
| Link underline | Changes instantly | No change in practice |
| Search flash | Already "gentler": a static highlight held for 2s, then removed | Same |

D3 in WP-50 defaults to the skill's rule. If it is adopted, the global `!important` block in `base.css:643-652` has to go or be narrowed, because it would zero out the opacity fades the skill wants to keep.

---

## 4. Generic-look check

### The five looks in `frontend-design`

1. **Warm cream background, high-contrast serif display, terracotta accent. Present (Medium).** `--st-bg: #fbf8f3` is a warm cream close to the skill's `#F4F1EA`. Headings use Fraunces at `opsz` 48 and the display size at 144 (`--st-opsz-display`), which is a high-contrast serif. The accent is `--st-accent: #b5561a`, a rooibos in the same family as `#D97757`. Two things make it less of a match. The primary colour is veld green `#1e5a3c` (buttons, links, the logo tile), not the terracotta. And the accent is mostly the focus ring and the "In plain words" callout. Even so, a first-time visitor sees cream, Fraunces and a clay-orange ring together. D1 in WP-50 is the right place to decide this.
2. **Near-black background with one acid accent. Absent.** The dark theme is warm (`--st-bg: #15130f`) with a soft green primary (`#7cc79a`) and six section hues. No single bright accent carries it.
3. **Broadsheet layout with hairline rules and zero radius. Absent.** Radii are 4, 8 and 14px. The layout is one reading column with a sidebar and a contents column, not dense newspaper columns.
4. **SaaS card kit. Partly present (Medium).** One `Card.astro` serves the home page (3 "where to start" cards and 7 business-type tiles), every section landing, and the templates index. Every card has `--st-radius-lg` (14px), the same `--st-shadow-1` (ink at 10%, close to `rgba(0,0,0,.1)`) and the same hover lift. The same radius also goes on badges, callouts, the task list, the empty state and dialogs. There are no gradient washes; the shweshwe dot pattern is the opposite of one.
5. **Template chrome. Mostly absent, a few traces (Low).** Details:
   - No ALL-CAPS eyebrows.
   - There are sentence-case labels above titles: "Page 2 of 10" on cards (`SectionLanding.astro:64`), "Section: Core" above every document h1 (`Doc.astro:163-165`), and the dot eyebrow in `SectionHeader.astro`.
   - Middle-dot meta strings appear only in `<title>` (`"{page} · {section} · {site}"`, `en.json:10-11`).
   - There is no "→" character in link text, but `lucide:arrow-right` icons end the Next, Continue, "Save my answers" and empty-state buttons.
   - Monospace is used only for blanks to fill in (`.st-placeholder`), where it means "replace this".
   - The text colour is a tinted near-black, `#1e1b16`.

### Other tells checked

| Tell | Found? | Where |
| --- | --- | --- |
| ALL-CAPS eyebrows | No | No `text-transform: uppercase` anywhere. The only tracked-out caps are the template sheet title ("INVOICE", `TemplateSheet.astro:204`), which is the template's own wording and a real invoice convention |
| "A · B · C" meta strings | Only in `<title>` | `en.json:10-11` (Low, counted with look 5) |
| "→" appended to links | As icons, not text | `Wizard.astro:152,213`, `YourPathCard.astro:47`, `[stage].astro:115`, `my-path.astro:149` (counted with look 5) |
| Identical rounded cards with one radius | Yes | See look 4 |
| Fade-up on every section | No | Nothing animates on load except the progress ring (section 3) |
| One accented word in headlines | No | "Start and run your business in South Africa" is one weight and one colour |
| Big number with a small label | Yes, once (Low) | The home page's "three numbers" use `--st-text-display` in `--st-primary` (`index.astro:303-309`). Here it fits: the numbers are the content, and each carries a date and an official source |

### What is Stoep's own

- **The shweshwe dot pattern** on section headers (`SectionHeader.astro:72-89`) is pure CSS. It moves to a band under the text on a phone and is removed under low data and forced colours. It is specific to South Africa and costs no bytes.
- **The stoep logo** is a roof over three steps (`Logo.astro`), with the name as real text.
- **The six section hues**, each with a tint whose separation is measured in OKLab (`tokens.css:86-140`). They give every part of the guide its own colour without colour carrying any meaning.
- **The trust devices.** The AI notice uses a neutral status chip, never the "Official" one. The "Official source" and "Not an official source" badges on every source are the guide's real identity, and no template kit has them.
- **The "In plain words" callout**, a spoken aside with one square corner (`Callout.astro:78-89`).
- **The business-type illustrations**: two-tone, inline SVG, coloured by section.
- **The effort meter**: five bars with the level always written out.
- **The A4 template preview** beside the form.
- **The care for Afrikaans length.** Nothing overflowed at 320px on any of 20 routes. Layout is wrapped with `overflow-wrap: anywhere` everywhere.

The parts that read as generic are the base palette and type pairing, and the single card style with a hover lift. The parts that read as Stoep are the pattern, the hues, the trust devices and the tools. A revamp that keeps the second group and reconsiders the first would keep the site's identity.
