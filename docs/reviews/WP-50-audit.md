# WP-50 Phase 0: audit summary

Date: 9 October 2026. Tree: `538366a` (main after the WP-33 merge). No site code was changed for this audit.

Three parts, run in parallel:

| Part | File | What it did |
| --- | --- | --- |
| Code audit | `WP-50-audit-code.md` | Every component, layout, page, style and script checked against `web-interface-guidelines`, the `accessibility` skill (axe plus manual checks), `review-animations`, and the generic-look list in `frontend-design`. 31 findings: 1 high, 11 medium, 19 low. |
| Reader journeys | `WP-50-audit-flows.md`, screenshots in `WP-50-audit/flows/` | The nine build-plan B3 flows walked as a first-time owner: 360×740 touch, CPU slowed 4×, Slow 3G. Flows 1, 4 and 5 again in Afrikaans. |
| Visual spec | `tests/e2e/visual.spec.ts`, `docs/testing.md` | 146 screenshots: 12 page types × 320/768/1280px × light/dark × English/Afrikaans, plus two full-page shots. No baselines are committed; Linux baselines come from the "Update visual baselines" workflow. |

The good news first. axe passed on all 416 runs. The manual checks found no WCAG failure:

- keyboard use;
- focus clear of the sticky header;
- 320px and 200% zoom reflow on 20 routes in both languages;
- forced colours;
- target sizes;
- consistent help.

Once a page has loaded, every control answers a tap in under 300 ms, with one exception at 524 ms. Dark theme reads well. Nothing overflows with long Afrikaans strings.

## Fix before the revamp

These break a project rule or are plain bugs. They don't depend on any design decision, so they can be fixed now in small, separate changes. Each one gets a test.

| # | Problem | Rule or reason | Where |
| --- | --- | --- | --- |
| 1 | On a 320px phone the AI notice on the vehicle-dealer page is below the first screen | Stoep rule 9, ADR 0006: the notice sits near the top | `Doc.astro`; header height plus page header |
| 2 | Wizard "Next" and the template "Fill in" / "Preview" tabs show at about 4.6 s but do nothing until their script runs at 12 to 13 s on a slow phone. Taps in that gap are lost silently | Every page must work without JavaScript; a control that looks ready must be ready | `Wizard.astro`, template tabs |
| 3 | The search dialog shows nothing for 8 to 11 s while the index downloads, so search looks broken | Loading must be stated (build plan B3 flow 3) | search dialog |
| 4 | The invoice page tells the reader to "make a copy, rename it… replace everything in [SQUARE BRACKETS], then export to PDF", which is the markdown template's instruction, not the form's | Wrong instruction on the page | template page intro (content or layout; check which) |
| 5 | The "Now reading" pill cuts translated headings off with an ellipsis | Stoep rule 8: nothing translated truncates | `TableOfContents.astro:203-209` |
| 6 | The language banner shifts the layout by 0.144 | Over the 0.1 limit used since WP-31 | language banner |
| 7 | The top-bar progress ring draws in for 960 ms on every page view, and `scroll-behavior: smooth` animates the scroll on every Tab | `review-animations` verdict "Block": motion on a high-frequency action | `ProgressRing.astro:77`, `base.css:128-131` |
| 8 | Checkboxes shrink on items whose text wraps; tables get a 576 px minimum width, which cuts off two-column tables on a phone | Layout bugs | `base.css` (`.st-check > input`), `TableScroll.astro` |
| 9 | "Copied" messages on branding prompts name the wrong prompt ("Prompt 0" says "Prompt 4 copied") | Bug | prompt copy button |

## What would most help a first-time owner

These are ranked by how often a reader meets them. All three audits point at the first two.

1. **Get to the content within two screens of the top.** The vehicle-dealer page's first content heading is 3,291 px down on a phone (4.4 screens; 5.2 in Afrikaans). The causes:
   - the always-open "Words used in this file" list: 15 terms, which the build plan wanted open on desktop only;
   - an AI notice of 418 to 469 px;
   - the section label repeating the breadcrumb;
   - a header that grows.

   The same pattern holds on the checklist, the templates and the prompts.
2. **A one-row phone header.** Today it is two rows (113 px), or three (165 px) once the progress ring and search load. It grows at about 11 s and pushes the page down 52 px. It shows a "/" key hint on touch screens. The desktop theme switch is the widest thing in it.
3. **Make tools and steps look different from pages.** One card style (white, green top edge, underlined serif title, 14 px radius, same shadow, same hover lift) is used for:
   - home's starting points;
   - business types;
   - every section landing;
   - the templates index;
   - My path steps.

   Readers can't tell a page from a tool from a step. The hover lift isn't limited to fine pointers either.
4. **Keep the reader's place.**
   - Switching language opens the other language at the top of the page.
   - There is no back-to-top control (build plan B3 flow 4).
   - "Continue" on My path sends the reader to "Pick your business type", which the wizard has already answered.
   - Tapping a checklist item that holds a link opens the link instead of ticking it.
5. **Make low-data mode real and findable.** Both fonts are preloaded in every page head, so 97 KB of a 142 KB first visit is fonts, even with low data on. The setting lives only on the About page, not in the footer as B3 planned. (This was already a known limit in `docs/design-system.md`. The revamp is the time to fix the preload.)
6. **Quieter navigation chrome.**
   - The document contents column at 1280 px is a wall of underlined links, louder than the article.
   - The two disclosures ("On this page", "Words used") have no open or closed marker.
   - "Sources for this page" is 8,183 px tall on the vehicle-dealer page on a phone; it could collapse past the first few entries.
7. **Plain words in the tools.** The search count line ("12 of 59 results shown (56 match every word)") is jargon. The tax invoice's heading reads "TAX INVOICE" in capitals. That is the invoice's own wording on the sheet, but it reads as shouting where it heads the page.
8. **The 404 page.** English and Afrikaans are stacked, with no navigation and no language or theme control.

The code audit and the flows audit have the rest (19 low findings and the remaining mediums).

## Does Stoep look generic? (input to decision D1)

Partly. Of the five looks `frontend-design` lists:

- **Look 1 is present.** A warm cream background (`#FBF8F3`), Fraunces as a high-contrast display serif, and a clay-orange accent (`#B5561A`). Two things soften it: the primary colour is veld green, and the orange is mostly the focus ring and the "In plain words" callout. A first-time visitor still sees cream, Fraunces and orange together.
- **Look 4 is half there.** One card style everywhere, with a near-default shadow and the same hover lift.
- **Looks 2, 3 and 5 are absent.** There are no ALL-CAPS eyebrows, no "→" in link text, no fade-up on scroll and no accented headline word. The only middle-dot string is in `<title>`.

What is genuinely Stoep's own, and should survive any direction:

- the shweshwe dot pattern;
- the roof-and-steps logo;
- the six section hues with measured separation;
- the trust devices (the AI notice, "Official source" and "Not an official source" badges);
- the "In plain words" callout;
- the two-tone business-type illustrations;
- the effort meter;
- the A4 template preview;
- the care for Afrikaans length.

The audit's reading, which I agree with: keep that second group, and reconsider the base palette and type pairing (D1, D2) and the single card style. That is a narrower change than a new identity.

## Reduced motion (input to decision D3)

Today every duration is zero under `prefers-reduced-motion`, enforced by a global `!important` block in `base.css:643-652`. If D3 adopts "gentler, not zero":

- the toast and the "Now reading" pill keep an opacity fade;
- card shadows may still change gently;
- the global block has to be narrowed, or it will zero those fades too.

## Not checked here

- WebKit, NVDA with Firefox, and TalkBack with Chrome: none were available in the container. They are Phase 5.
- Timings are single runs. Treat them as order of magnitude.
- Screenshots come from this container's Linux Chromium; CI and Windows render fonts slightly differently.

## Next

1. Fix the nine items above, each as a small change with a test. They are bugs or rule breaks, so they go through the normal two-pass review, not the design gate.
2. Phase 1 (direction): up to two directions, built on the "Stoep's own" list and addressing items 1 to 3 of the ranked list, shown as mock pages under `/design-system/`. Then the owner's decisions D1 to D5.
