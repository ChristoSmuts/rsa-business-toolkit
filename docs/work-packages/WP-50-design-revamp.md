# WP-50: design revamp

Status: plan. Nothing is built yet. WP-33 (search) has merged, so the header, search dialog and search page are in scope.

Read first: `CLAUDE.md`, `.claude/skills/stoep-design/SKILL.md`, `docs/design-system.md`, `docs/build-plan.md` B3 (the nine key flows) and B4 (Stoep), and ADR 0007.

## Why

The site works. It passes WCAG 2.2 AA checks in both themes. It renders without JavaScript, prints, and stays inside its script budgets. What it has not had is a dedicated design pass: Stoep was set up as tokens and components in WP-11 and WP-20, then every later package added UI to that base. Two things now point at a revamp:

- **It may read as generic.** Anthropic's `frontend-design` skill lists the looks AI-generated sites converge on. The first is "a warm cream background with a high-contrast serif display and a terracotta or warm-clay accent". Stoep is a paper background (`#FBF8F3`), Fraunces headings and a rooibos accent (`#B5561A`). Stoep chose each of those for a reason (paper, earth and veld; see the design system's rationale). But a first-time visitor sees the combination, not the reasoning. Whether that matters is the first decision of this package.
- **Polish has never been reviewed.** Spacing rhythm across page types, hierarchy on the home page and hubs, the look of the tools (wizard, My path, templates, checklist), motion, and how the document page reads on a phone were each built package by package. No single pass has looked at them as one product.

## Skills this package uses

They are vendored in `.claude/skills/` (ADR 0007), and `stoep-design` overrides the rest.

| Phase | Skill |
| --- | --- |
| Every phase | `stoep-design` |
| Direction | `frontend-design`: the plan, review, build and critique loop, the generic-look list and the copy rules |
| Review | `web-interface-guidelines`, `accessibility`, and `review-animations` for anything that moves |

## Phases

### Phase 0: audit (no source changes)

1. **Baseline screenshots.** The `visual` Playwright project exists in `playwright.config.ts`, but there is no `tests/e2e/visual.spec.ts` and no baselines. Add the spec and capture these page types:
   - home;
   - a section hub;
   - a long document (vehicle dealer);
   - a business-type page;
   - `/find-my-path/` and `/my-path/` with a profile;
   - a template page;
   - `/checklist/`, search and the 404 page.

   Capture each at 320, 768 and 1280px, in light and dark, in English and Afrikaans. Baselines are per platform. Commit Linux baselines from CI, and note that the owner's Windows baselines are separate.
2. **Run the review skills over the shipped site and components**, and record findings in `docs/reviews/WP-50-audit.md`, ranked by how often a reader meets them:
   - `web-interface-guidelines` on every component folder;
   - `accessibility`, both the audit loop and the manual checks: keyboard, 200% zoom, forced colours and reduced motion;
   - `review-animations` on every transition in `src/styles/**` and `src/scripts/**`.
3. **Generic-look check.** For each of the five looks `frontend-design` lists, say in one line whether Stoep shows it, and where.
4. **Walk the nine B3 flows on a 360px phone emulation** and note where a reader hesitates, scrolls past something, or can't tell what to tap. Plain notes, with a screenshot each.

Deliverable: the audit file, the baseline screenshots, and a one-page summary of the five to ten changes that would matter most.

### Phase 1: direction (owner decision gate)

Done: two directions, their mocks and the owner's questions are in `WP-50-directions.md`.

Follow `frontend-design`'s two passes inside the `stoep-design` brief. Produce at most two directions. Each one has:

- a palette as named token values, with every pair's contrast measured;
- the typefaces and their roles. Each must be OFL or similar and available as a `@fontsource-variable` package;
- a layout concept for each page type: home, hub, document, tool. Write each concept in a sentence, with an ASCII wireframe at 360px and 1280px;
- one memorable element per page type;
- a list of what stays exactly as it is.

Then check each direction against the brief and the generic-look list, say what was revised and why, and render the home and document page of each as a static mock under `/design-system/` (noindex) so the owner can compare them in a browser.

The owner decides:

| # | Decision | Default if no answer |
| --- | --- | --- |
| D1 | Keep the paper, serif and rooibos combination, adjust it, or replace it | Keep veld green as primary and the six section hues; revisit the display face and the accent's role |
| D2 | Display typeface: keep Fraunces or change | Keep, unless D1 changes the direction |
| D3 | Reduced motion: zero (today) or "gentler, not zero" (`review-animations`) | Gentler: keep opacity changes, drop movement |
| D4 | The one memorable element on the home page | Phase 1 proposes two options |
| D5 | Whether the business-type illustrations grow, change style or stay | Stay; restyle only if D1 changes |

### Phase 2: tokens and base

- Change `src/styles/tokens.css`, `base.css`, `utilities.css` and `print.css` to the chosen direction. Keep every existing token name unless a rename is unavoidable, and give any rename a migration commit of its own.
- Update `CONTRAST_PAIRS`, the contrast unit test and the live panel on `/design-system/`.
- Self-host any new font through `@fontsource-variable`, with metric-matched fallbacks measured the way `docs/design-system.md` describes.
- Do not change component markup in this phase. The screenshots show what the tokens alone did.

### Phase 3: page types and components

Work in reader-traffic order. Each item is a separate commit series and review:

1. the document page (`Doc.astro` and the content components): the most-read page and the one most often read on a phone;
2. the home page and the section hubs;
3. business-type pages;
4. the tools: Find my path, My path, the templates, the checklist and the search dialog;
5. the header, footer and navigation;
6. the 404, about and contents pages.

Every change keeps the markup contracts the test suites rely on (ids, roles, `data-*` hooks), or changes the tests in the same commit and says why.

### Phase 4: motion and interaction

Add motion only where it answers a reader's action: opening, expanding, confirming, ticking. Use CSS transitions and `@starting-style` first. Use WAAPI only when CSS can't express the motion. Easing and durations live as tokens. `review-animations` runs on every change, and a "Block" verdict blocks the merge.

### Phase 5: verification

- The full gate: `gate:fast`, `build`, e2e for chromium, mobile and nojs, `test:a11y`, and `dist:budget`.
- Visual diffs against the Phase 0 baselines, reviewed by a person, never auto-approved.
- Manual checks:
  - NVDA with Firefox and TalkBack with Chrome, on the nine B3 flows;
  - WebKit on a real Mac or iPhone, which also covers the open WebKit item in `docs/outstanding-work.md`;
  - one real low-end Android phone on a throttled connection.

## Measures of done

- No new third-party request. The CSP test and `csp-and-network.spec.ts` pass unchanged.
- Script budgets don't grow. The heaviest document page is 23.7 KB today against a 25 KB budget; the revamp must not add to it, and should bring it back under the 22 KB target.
- Layout shift stays at or below today's level on the home and document pages (measured in WP-31: CLS under 0.1 with scripts 2.5 s late).
- axe reports zero violations in both themes. The manual checks above are done and written up.
- The audit's top findings are each fixed or explicitly deferred with a reason.
- `docs/design-system.md` describes the new direction, with measured contrast for every pair.

## Review

Same protocol as every package: two consecutive clean passes by fresh reviewer instances, per phase from Phase 2 on. Reviewers use `web-interface-guidelines`, `accessibility` and `review-animations` as their checklists and attach screenshots for every visual finding. A "major" is anything that makes a page harder to read or use for a first-time owner on a phone, any accessibility regression, or a broken project rule. Taste preferences are minor.

## Risks

- **Churn in a heavily tested codebase.** Main has about 1,400 unit and dom tests and 1,000 e2e tests, many asserting on markup, and search adds about 1,200 more. Keep markup changes deliberate and separate from style changes.
- **Convergence on another generic look.** An AI-led redesign tends to drift to a different default. The Phase 1 check against the generic-look list and the owner gate are there to catch it.
- **Afrikaans length.** Every mock and screenshot must include the Afrikaans page. English-only mocks hide wrapping problems.
- **Baseline drift across platforms.** Linux and Windows render fonts differently. Treat baselines per platform, and never compare across them.
