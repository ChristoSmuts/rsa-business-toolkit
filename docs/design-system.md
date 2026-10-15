# Stoep design system

Stoep is the design system of the SA Business Toolkit web app. A stoep is the porch in front of a South African house: an open, familiar place where neighbours talk plainly. The system should feel the same.

- Source of truth for every colour and scale: `src/styles/tokens.css`.
- Live reference: `/design-system/` (noindex, excluded from the sitemap). It shows every token, every component and a contrast panel that re-measures colours in the browser.
- Automated checks (details under [Automated checks](#automated-checks)): `tests/unit/tokens-contrast.test.ts` and `tests/e2e/design-system.spec.ts`.

## Principles

1. **Plain first.** Content is the product. Components get out of the way of the words.
2. **Warm, not corporate.** Paper, earth and veld: off-white paper, veld green, section hues taken from the landscape, and rooibos as the guide's own voice ("In plain words") and nothing else.
3. **Colour never carries meaning alone.** Every status has an icon and a text label. Links in running text are always underlined; a list of navigation links shows the underline on hover and focus (see [Links](#links)). Meters and rings always have written values.
4. **Fast on a cheap phone.** No raster images, two self-hosted variable fonts, one tiny blocking script per page, CSS-only decoration that switches off under reduced data.
5. **One source of truth.** Literal colours exist only in `tokens.css` (Stylelint enforces this, including in `.astro` style blocks). Everything else uses `var(--st-*)`.

## Colour

### Rationale

- **Background** is a warm paper white (`#FBF8F3`), not pure white, so long reading is gentle. Cards are pure white (`--st-surface`) to lift off the page.
- **Primary** is veld green (`#1E5A3C`). It is used for links, primary buttons, checkbox fills and progress. Green reads as "go" and as land, without the saturated look of a bank or a government portal.
- **Accent** is rooibos (`#B5561A`). Since WP-50 (direction A) it has one job: the "In plain words" callout, the guide speaking plainly. No chrome uses it (the pressed search chip, the prompt stripe and the business-type badge moved to veld green), so where a reader sees orange, the guide is explaining something. A new use needs a reason recorded here.
- **Focus** is ink: `--st-focus` is `var(--st-text)` in both themes, 3px wide with a 2px offset. It was rooibos, 2px. Ink is at least 9.33:1 on every surface, tint and soft background in both themes (rooibos was 3.37:1 at its weakest), it differs from the link colour so a focused link still shows its ring, and an orange ring on cream was the generic look in miniature (see [Direction A](#direction-a-wp-50)).
- **Section hues** give each part of the toolkit an identity: Start here (ochre `#8A5A00`), Core (veld `#1E5A3C`), Branding (protea `#9C2E63`), Paperwork (teal `#1F6B6B`), Your kind of business (clay `#A3401A`), Look it up (dusk `#4A3F8F`). Use them for text, stripes and icons, and as soft tints (`--st-hue-*-tint`) with `--st-text` on top.
- **Section tints** mix the hue into the page background. `--st-tint-strength` is the default (**18% light, 22% dark**); plan B4 says 12%, and at a flat 12% Core, Paperwork and Look it up read as the same greige. Four hues use the default and four carry a per-hue strength, because a flat strength leaves some pairs indistinguishable. See [Section tints](#section-tints) for the measured numbers and why the separation stops where it does.
- **Dark theme** keeps the same roles with lighter, less saturated hues on a warm near-black (`#15130F`).
- **Decorative border** (`--st-border`) never marks a control boundary. Controls use `--st-border-strong` (at least 3:1).

### Direction A (WP-50)

The owner chose direction A, "Stoep, re-set", on 13 October 2026 (`docs/work-packages/WP-50-directions.md`, "Decided"). In short:

- **Keep the palette.** Every colour token keeps its name and its value, except the focus alias. Readers who come back recognise the site, and recognition is part of trust on a site about tax and the law. The measured contrast below therefore holds, with every focus pair far above its minimum.
- **Rooibos is the voice, ink is the ring.** The two changes above. They remove the clearest sign of the generic "cream, high-contrast serif, terracotta" look that `frontend-design` lists, without a new identity.
- **Serif for reading titles, sans for things you act on.** Fraunces sets h1 and h2 only, from its wght-only file: the low-contrast text cut, not the display cut. Instrument Sans sets h3, h4 and everything else (see [Typography](#typography)).
- **Gentler, not zero, reduced motion** (decision D3; see [Motion](#motion)).
- **Quiet navigation chrome**: lists of navigation links drop the underline until hover and focus (see [Links](#links)).

Phase 2 changed tokens, base, utility and print CSS only; component markup is unchanged, and Phase 3 restyles the page types. Before and after screenshots: `docs/reviews/WP-50-phase2/` (`before-*` and `after-*`: 320, 768 and 1280px, light and dark, both languages, plus three focus-ring shots).

### Theme mechanics

- Light tokens live on `:root`.
- Dark overrides live in `@media screen { :root[data-theme='dark'] { … } }` (explicit choice) and `@media screen and (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }` (system). Both blocks must be identical; the unit test compares them.
- The unit test also parses every rule in `tokens.css` and fails if a palette block appears twice, sits under the wrong condition, or if any other rule overrides a colour token. Only the reduced-motion and low-data blocks may override tokens, and only their known motion, font and pattern keys.
- The dark blocks are wrapped in `@media screen` so **print always uses the light palette**. This is a deliberate addition to plan B4.
- `src/scripts/theme-init.js` runs as a blocking external script in `<head>`. It applies `st.theme` (`light` or `dark`) before first paint, points both `meta[name=theme-color]` tags at the chosen theme's background, and adds the `js` class to `<html>`. `system`, a missing key or blocked storage leaves `data-theme` unset.
- Aliases (`--st-link`, `--st-focus`, tints, shadows, `--st-danger-solid-hover`) are defined once on `:root` and resolve against whichever palette is active.

### Token changes and additions compared with plan B4

**No hex value from the plan was changed.** Every plan pair meets its threshold as specified (measured below).

Changes and additions, all documented in `tokens.css`:

| Token | Light | Dark | Why |
| --- | --- | --- | --- |
| `--st-danger-solid` / `--st-on-danger-solid` | `#8F2323` / `#FFFFFF` | `#E0736B` / `#1F0806` | Filled background for the danger button. The plan only had danger text and background tints. The dark fill is a stronger coral than the danger text so it reads as destructive next to the mint primary button. Ratio 8.63:1 light, 6.23:1 dark. |
| `--st-danger-solid-hover` | `color-mix(in oklab, danger-solid 82%, text)` | same formula | Danger button hover, as a token so its contrast is tested (9.97:1 light, 7.55:1 dark). |
| `--st-shadow-ink`, `--st-shadow-strength-1/2` | `#1E1B16`, 10%, 16% | `#000000`, 40%, 55% | Shadow colour per theme; `--st-shadow-1/2` mix these. |
| `--st-tint-strength` | 18% | 22% | Default strength of the section tints (plan: 12%, see Rationale). |
| `--st-tint-strength-*` (six) | 18%, except paperwork 14% and types 12% | 22%, except start 26%, paperwork 28% and branding 16% | Per-hue strength, so tints that would otherwise be twins can be told apart. Each defaults to `var(--st-tint-strength)`. See [Section tints](#section-tints). |
| `--st-hue-*-tint` | `color-mix(in oklab, hue var(--st-tint-strength-<hue>), bg)` | same formula | The plan's soft section tints, as tokens. |
| `--st-section`, `--st-section-tint` | primary, primary-soft | same | Default section scope; `[data-section]` overrides them. |
| `--st-pattern-ink` | 30% | 40% | Shweshwe dot strength (visible at arm's length on a phone). |
| `--st-pattern-display` | `block` | `block` | `none` under `prefers-reduced-data` and `html[data-low-data]`. |
| `--st-selection-bg`, `--st-link-hover` | aliases | aliases | Text selection and hovered links. |
| `--st-focus` | `var(--st-text)` | same alias | WP-50, direction A: the ring is ink, not rooibos (the plan's `var(--st-accent)`). |
| `--st-focus-width` | 3px | 3px | WP-50, direction A (was 2px). |

### Verified contrast (WCAG 2.x)

Text needs at least 4.5:1. Control borders and focus indicators need at least 3:1. Ratios are truncated to two decimals, never rounded up. Every ratio in this file is computed by `src/scripts/color.ts` from `tokens.css`, including the OKLab mixing of the tints. A browser resolves `color-mix(in oklab, …)` with its own rounding, so a live measurement of a mixed colour (the panel on `/design-system/`, or DevTools) can differ by up to about 0.06: 11.88:1 against 11.90:1 for the light ring on the Look it up tint, 9.39:1 against 9.33:1 for the dark ring on the Paperwork tint (WP-50 Phase 2 review pass 1). The same list (`CONTRAST_PAIRS` in `src/scripts/color.ts`) drives the unit test and the live panel. It holds the plan B4 pairs plus every text, link and focus-ring pair the components render: callout bodies and links on every soft background, links and focus rings on every section tint, the inverse toast and the danger hover.

| Foreground | Background | Use | Needs | Light | Dark |
| --- | --- | --- | --- | --- | --- |
| `--st-text` | `--st-bg` | Body text on page | 4.5:1 | 16.20:1 | 15.75:1 |
| `--st-text` | `--st-surface` | Body text on cards | 4.5:1 | 17.16:1 | 14.42:1 |
| `--st-text` | `--st-surface-2` | Body text on raised areas | 4.5:1 | 14.85:1 | 12.92:1 |
| `--st-text-muted` | `--st-bg` | Secondary text on page | 4.5:1 | 6.88:1 | 8.06:1 |
| `--st-text-muted` | `--st-surface` | Secondary text on cards | 4.5:1 | 7.29:1 | 7.37:1 |
| `--st-text-muted` | `--st-surface-2` | Secondary text, disabled controls | 4.5:1 | 6.31:1 | 6.61:1 |
| `--st-link` | `--st-bg` | Links on page | 4.5:1 | 7.67:1 | 9.26:1 |
| `--st-link` | `--st-surface` | Links on cards | 4.5:1 | 8.13:1 | 8.48:1 |
| `--st-link-hover` | `--st-bg` | Hovered links | 4.5:1 | 10.00:1 | 12.45:1 |
| `--st-link-visited` | `--st-bg` | Visited links | 4.5:1 | 8.26:1 | 8.48:1 |
| `--st-on-primary` | `--st-primary` | Primary button label | 4.5:1 | 8.13:1 | 7.68:1 |
| `--st-on-primary` | `--st-primary-hover` | Primary button label, hover | 4.5:1 | 10.60:1 | 10.31:1 |
| `--st-on-primary-soft` | `--st-primary-soft` | Text on soft green | 4.5:1 | 9.03:1 | 8.36:1 |
| `--st-on-accent` | `--st-accent` | Accent fill label | 4.5:1 | 4.87:1 | 7.80:1 |
| `--st-accent-text` | `--st-bg` | Accent text on page | 4.5:1 | 5.89:1 | 8.61:1 |
| `--st-accent-text` | `--st-surface` | Accent text on cards | 4.5:1 | 6.24:1 | 7.88:1 |
| `--st-on-accent-soft` | `--st-accent-soft` | Text on soft rooibos | 4.5:1 | 7.39:1 | 9.45:1 |
| `--st-success-text` | `--st-success-bg` | Success message | 4.5:1 | 9.03:1 | 8.36:1 |
| `--st-warning-text` | `--st-warning-bg` | Warning message | 4.5:1 | 6.71:1 | 8.81:1 |
| `--st-danger-text` | `--st-danger-bg` | Error message | 4.5:1 | 7.22:1 | 7.86:1 |
| `--st-info-text` | `--st-info-bg` | Info message | 4.5:1 | 6.73:1 | 8.04:1 |
| `--st-danger-text` | `--st-bg` | Error text on page | 4.5:1 | 8.14:1 | 9.48:1 |
| `--st-on-danger-solid` | `--st-danger-solid` | Danger button label | 4.5:1 | 8.63:1 | 6.23:1 |
| `--st-on-danger-solid` | `--st-danger-solid-hover` | Danger button label, hover | 4.5:1 | 9.97:1 | 7.55:1 |
| `--st-text` | `--st-mark-bg` | Highlighted search match | 4.5:1 | 14.28:1 | 7.36:1 |
| `--st-bg` | `--st-text` | Default toast (inverse) | 4.5:1 | 16.20:1 | 15.75:1 |
| `--st-text` | `--st-primary-soft` | Body text in official callouts and badges | 4.5:1 | 14.62:1 | 10.59:1 |
| `--st-text` | `--st-accent-soft` | Body text in plain-words callouts | 4.5:1 | 14.73:1 | 12.38:1 |
| `--st-text` | `--st-warning-bg` | Body text in warning callouts | 4.5:1 | 15.56:1 | 11.77:1 |
| `--st-text` | `--st-info-bg` | Body text in info callouts | 4.5:1 | 14.53:1 | 11.56:1 |
| `--st-link` | `--st-surface-2` | Links in note callouts and code | 4.5:1 | 7.03:1 | 7.60:1 |
| `--st-link` | `--st-primary-soft` | Links in official callouts and badges | 4.5:1 | 6.92:1 | 6.23:1 |
| `--st-link` | `--st-accent-soft` | Links in plain-words callouts | 4.5:1 | 6.98:1 | 7.28:1 |
| `--st-link` | `--st-warning-bg` | Links in warning callouts | 4.5:1 | 7.37:1 | 6.92:1 |
| `--st-link` | `--st-info-bg` | Links in info callouts | 4.5:1 | 6.88:1 | 6.80:1 |
| `--st-hue-start` | `--st-bg` | Start here hue as text | 4.5:1 | 5.59:1 | 10.04:1 |
| `--st-hue-core` | `--st-bg` | Core hue as text | 4.5:1 | 7.67:1 | 9.26:1 |
| `--st-hue-branding` | `--st-bg` | Branding hue as text | 4.5:1 | 6.64:1 | 7.64:1 |
| `--st-hue-paperwork` | `--st-bg` | Paperwork hue as text | 4.5:1 | 5.87:1 | 9.68:1 |
| `--st-hue-types` | `--st-bg` | Business types hue as text | 4.5:1 | 5.99:1 | 8.39:1 |
| `--st-hue-lookup` | `--st-bg` | Look it up hue as text | 4.5:1 | 8.26:1 | 8.48:1 |
| `--st-hue-start` | `--st-surface` | Start here hue on cards | 4.5:1 | 5.92:1 | 9.19:1 |
| `--st-hue-core` | `--st-surface` | Core hue on cards | 4.5:1 | 8.13:1 | 8.48:1 |
| `--st-hue-branding` | `--st-surface` | Branding hue on cards | 4.5:1 | 7.03:1 | 6.99:1 |
| `--st-hue-paperwork` | `--st-surface` | Paperwork hue on cards | 4.5:1 | 6.22:1 | 8.86:1 |
| `--st-hue-types` | `--st-surface` | Business types hue on cards | 4.5:1 | 6.35:1 | 7.68:1 |
| `--st-hue-lookup` | `--st-surface` | Look it up hue on cards | 4.5:1 | 8.75:1 | 7.76:1 |
| `--st-text` | `--st-hue-start-tint` | Text on Start here tint | 4.5:1 | 12.51:1 | 9.68:1 |
| `--st-text` | `--st-hue-core-tint` | Text on Core tint | 4.5:1 | 11.99:1 | 10.85:1 |
| `--st-text` | `--st-hue-branding-tint` | Text on Branding tint | 4.5:1 | 12.22:1 | 12.64:1 |
| `--st-text` | `--st-hue-paperwork-tint` | Text on Paperwork tint | 4.5:1 | 13.20:1 | 9.33:1 |
| `--st-text` | `--st-hue-types-tint` | Text on Business types tint | 4.5:1 | 13.58:1 | 11.10:1 |
| `--st-text` | `--st-hue-lookup-tint` | Text on Look it up tint | 4.5:1 | 11.90:1 | 11.06:1 |
| `--st-link` | `--st-hue-start-tint` | Links on Start here tint | 4.5:1 | 5.92:1 | 5.69:1 |
| `--st-link` | `--st-hue-core-tint` | Links on Core tint | 4.5:1 | 5.68:1 | 6.38:1 |
| `--st-link` | `--st-hue-branding-tint` | Links on Branding tint | 4.5:1 | 5.79:1 | 7.44:1 |
| `--st-link` | `--st-hue-paperwork-tint` | Links on Paperwork tint | 4.5:1 | 6.25:1 | 5.49:1 |
| `--st-link` | `--st-hue-types-tint` | Links on Business types tint | 4.5:1 | 6.43:1 | 6.53:1 |
| `--st-link` | `--st-hue-lookup-tint` | Links on Look it up tint | 4.5:1 | 5.63:1 | 6.51:1 |
| `--st-border-strong` | `--st-bg` | Control border on page | 3:1 | 4.40:1 | 4.90:1 |
| `--st-border-strong` | `--st-surface` | Control border on cards | 3:1 | 4.66:1 | 4.48:1 |
| `--st-border-strong` | `--st-surface-2` | Control border on raised areas | 3:1 | 4.03:1 | 4.01:1 |
| `--st-focus` | `--st-bg` | Focus ring on page | 3:1 | 16.20:1 | 15.75:1 |
| `--st-focus` | `--st-surface` | Focus ring on cards | 3:1 | 17.16:1 | 14.42:1 |
| `--st-focus` | `--st-surface-2` | Focus ring in note callouts and code | 3:1 | 14.85:1 | 12.92:1 |
| `--st-focus` | `--st-primary-soft` | Focus ring in official callouts and badges | 3:1 | 14.62:1 | 10.59:1 |
| `--st-focus` | `--st-accent-soft` | Focus ring in plain-words callouts | 3:1 | 14.73:1 | 12.38:1 |
| `--st-focus` | `--st-warning-bg` | Focus ring in warning callouts | 3:1 | 15.56:1 | 11.77:1 |
| `--st-focus` | `--st-info-bg` | Focus ring in info callouts | 3:1 | 14.53:1 | 11.56:1 |
| `--st-focus` | `--st-hue-start-tint` | Focus ring on Start here tint | 3:1 | 12.51:1 | 9.68:1 |
| `--st-focus` | `--st-hue-core-tint` | Focus ring on Core tint | 3:1 | 11.99:1 | 10.85:1 |
| `--st-focus` | `--st-hue-branding-tint` | Focus ring on Branding tint | 3:1 | 12.22:1 | 12.64:1 |
| `--st-focus` | `--st-hue-paperwork-tint` | Focus ring on Paperwork tint | 3:1 | 13.20:1 | 9.33:1 |
| `--st-focus` | `--st-hue-types-tint` | Focus ring on Business types tint | 3:1 | 13.58:1 | 11.10:1 |
| `--st-focus` | `--st-hue-lookup-tint` | Focus ring on Look it up tint | 3:1 | 11.90:1 | 11.06:1 |
| `--st-primary` | `--st-bg` | Primary button edge, checkbox fill | 3:1 | 7.67:1 | 9.26:1 |
| `--st-primary` | `--st-surface` | Selected chip edge, primary edge on cards | 3:1 | 8.13:1 | 8.48:1 |

These match the plan's quoted ratios to one decimal (text on bg 16.2/15.8, muted 6.9/8.1, on-primary 8.1/7.7, on-accent 4.9/7.8, accent-text 5.9/8.6, border-strong 4.4/4.9), except focus: the plan's rooibos ring measured 4.6/8.6, and the ink ring measures 16.2/15.8 (WP-50). Two notes on the plan's figures: dark border-strong on bg measures 4.90:1 (the plan says 4.5), and the Start here hue on light bg measures 5.59:1, which rounds to the plan's 5.6 (the unit test asserts 5.59, not a looser 5.5).

Lowest pair of each kind (77 pairs, both themes, WP-50 Phase 2):

| Theme | Text (needs 4.5:1) | Control edge (needs 3:1) | Focus ring (needs 3:1) |
| --- | --- | --- | --- |
| Light | 4.87:1 `on-accent` on `accent` | 4.03:1 `border-strong` on `surface-2` | 11.90:1 on the Look it up tint |
| Dark | 5.49:1 `link` on the Paperwork tint | 4.01:1 `border-strong` on `surface-2` | 9.33:1 on the Paperwork tint |

Before WP-50 the light focus ring on a section tint was the tightest pair in the system (3.37:1 to 3.85:1) and it capped tint separation. With the ink ring it is among the safest. The tightest pairs on a tint are now links (5.63:1 light, 5.49:1 dark). See [Section tints](#section-tints) before changing any `--st-tint-strength-*`.

### Section tints

The six tints must be tellable apart, and separation is measured in **OKLab** (ΔE_OK), not sRGB. Euclidean distance in sRGB flatters dark colours: the two dark pairs that review pass 3 called "near twins" were 6.7 and 8.1 sRGB units apart and passed the old `> 5` test comfortably.

Measured strengths and worst pairs:

| Theme | start | core | branding | paperwork | types | lookup | Worst pair (ΔE_OK) | Worst focus ring |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light | 18% | 18% | 18% | 14% | 12% | 18% | **0.0280** Start here vs Core | 11.90:1 (3.37:1 before WP-50) |
| Dark | 26% | 22% | 16% | 28% | 22% | 22% | **0.0389** Core vs Your kind of business | 9.33:1 (5.10:1 before WP-50) |

Before this round, with a flat strength per theme, the worst pairs were 0.0141 (light Start here vs Your kind of business) and **0.0126** (dark Core vs Paperwork) — the two dark pairs reported in review. The unit test asserts **ΔE_OK ≥ 0.025** for every pair in both themes, which those three pairs fail and the current palette passes.

**Why the separation stopped there** (history: the ink ring of WP-50 lifted this limit and the strengths were left as they are; a change now is limited by links on a tint, 5.63:1 light). A tint darkens as its strength rises, and the light focus ring on a tint is already the tightest pair in the system. The search found a light configuration reaching ΔE_OK 0.0400, but it puts that ring at **3.02:1** against a 3:1 minimum — a 0.02 margin. Accessibility wins over separation, so the light tints were instead chosen to lose **no margin at all**: every light text, link and focus pair is at least as good as it was at a flat 18%, and Paperwork and Your kind of business are deliberately *weaker* than the default, which both separates them from their neighbours and raises their focus contrast (3.52 → 3.74 and 3.51 → 3.85). Dark had much more headroom, so three hues moved there and the worst rooibos ring stayed at 5.10:1. Since WP-50 the ring is ink, at least 11.9:1 light and 9.3:1 dark on every tint.

If you change a hue or a strength, re-run `pnpm test`: the test asserts each tint against its hue, background and strength, so the numbers above can be re-derived rather than trusted.

## Typography

| Role | Family | Details |
| --- | --- | --- |
| Page titles and section headings (h1, h2), display figures (`.st-display`) | Fraunces Variable (`@fontsource-variable/fraunces`, the wght-only files) | Weight 600, tracking -0.005em (display figures -0.02em). The wght-only files have no optical-size axis: their outlines are Fraunces' text end, sturdy and low in contrast |
| Smaller headings (h3, h4), body and UI | Instrument Sans Variable (`@fontsource-variable/instrument-sans`, `wght`) | 400 to 700, normal and italic; h3 and h4 at 600 with no tracking |
| Code | System monospace stack | `--st-font-mono` |

- **Why** (WP-50, direction A, decision D2): the serif is for reading titles, the sans for everything a reader acts on. A low-contrast serif used sparingly reads as a heading voice, not as the high-contrast display serif that `frontend-design` lists among the generic looks. Components that set their own titles in `--st-font-display` follow the wght-file conventions too: the logo's name is Fraunces 600 with -0.005em tracking and no optical size since Phase 3, item 1; the home page's figures are Fraunces 600 with -0.02em tracking, lining figures and no optical size since Phase 3, item 2 (they were Fraunces at its default 400 in `--st-primary`); the template sheet's title follows in item 4.
- **The font files.** Fraunces moved from the opsz file to the wght-only file of the same package (5.3.0): latin 36,620 bytes instead of 67,304, latin-ext 33,584 instead of 59,388. Instrument Sans is unchanged (latin 30,092 bytes). A first visit therefore downloads 66,712 bytes of preloaded fonts instead of 97,396 (measured in Chromium on the vehicle-dealer page and home, WP-50 Phase 2). The files have no `opsz` axis, so `--st-opsz-display` and `--st-opsz-heading` were inert; Phase 3 removed the logo's last read of them and the two tokens.
- Subsets: latin and latin-ext only, with the fontsource `unicode-range` values. Latin-ext covers Afrikaans (ê, ô, ë, ï, ü). It does **not** cover the Venda letters ḓ ṱ ṋ ṅ and their capitals Ḓ Ṱ Ṋ Ṅ: neither the Fraunces nor the Instrument Sans latin-ext file has a glyph for them (fontTools finds no glyph in either file, and Chromium draws each of them differently against two different fallbacks, WP-50a), so a browser draws them from a system font, in the middle of a word set in the web font. No built page uses them today except `/design-system/` (the name "Tshivenḓa" is in `src/i18n/locales.ts` for a planned language, but nothing renders it); a Venda translation would need a typeface that covers them. The design-system page shows the test string `Kôsê, sê, môre, ëïü` in every family, and the Venda letters on a line of their own, labelled as drawn from a system font.
- **Preloads and low data.** `font-display: swap`. `Base.astro` keeps the preloads of the two latin files (imported with Vite `?url`, so the hashed URLs match `base.css`) in a `<template data-st-preload>` just before `theme-init.js`, plus a `<noscript>` copy. `theme-init.js` moves the template's links into `<head>` unless low data mode is on (`st.lowData`), so a reader who asked for less data downloads **no** font: 0 bytes on a first visit, against 97,396 before (WP-50 audit, item 5). The preload scanner skips `<template>` content, and `<noscript>` content when scripts run; without JavaScript the `<noscript>` copy preloads them. `prefers-reduced-data` is left to the CSS: no stable browser ships it, and a check in `theme-init.js` would grow every page's script. `tests/dom/theme-init.test.ts` checks low data off and on, and blocked storage.
- **What the conditional preload costs.** The preload scanner cannot see the template, so the font requests wait until `theme-init.js` has downloaded and run: on a first visit (nothing cached) that is one round trip later. Measured at 360px, 150ms latency, 1.6 Mbit/s, cache disabled, median of 7 cold loads each (WP-50 Phase 2 review pass 1; the first version of this section said 370 against 358ms, from single runs with the cache left on, and understated the cost):

  | Build | Page | Font requests start | Fonts finished | First contentful paint | Font bytes, low data on |
  | --- | --- | --- | --- | --- | --- |
  | Before Phase 2 (static preloads, opsz file) | vehicle dealer / home | 171 / 172ms | 1,487 / 1,323ms | 1,092 / 984ms | 97,396 |
  | Static preloads of the new files (not shipped) | vehicle dealer / home | 173 / 172ms | 1,137 / 1,074ms | 1,136 / 1,032ms | 66,712 |
  | Phase 2 (preloads through `theme-init.js`) | vehicle dealer / home | 366 / 355ms | 1,321 / 1,187ms | 888 / 840ms | 0 |

  So the fonts start about 190ms later than static preloads of the same files would, and finish 113 to 184ms later; they still finish earlier than before Phase 2, because the Fraunces file is smaller. First paint comes 250ms *earlier* than with static preloads, because 67 KB of fonts no longer compete with the stylesheet for the first round trips. With the matched fallbacks and the em measures (at the top of every page, layout shift of at most 0.068 when the fonts arrive late, at 320 to 1440px; see below), a later swap costs a reader little, and a reader on low data saves all 66,712 bytes. That is the trade-off, accepted for now. No cheaper way exists on a static host with `script-src 'self'`: nothing can read `st.lowData` before the preload scanner runs, and an inline script is not allowed. On a repeat visit `theme-init.js` usually comes from the cache and the delay mostly goes. Phase 5 checks it on a real phone (see [Known limits](#known-limits)).
- Low data (`prefers-reduced-data: reduce` or `html[data-low-data]`) switches `--st-font-display` and `--st-font-body` to the fallback stacks, so CSS never requests the webfonts either.
- Display figures use no-break spaces between digit groups (`R 1 234.56` with U+00A0), so an amount never breaks across lines. The decimal separator for rand amounts follows the toolkit markdown (i18n package).

### Fallback fonts and layout shift

The fallbacks are what a reader sees until the web fonts arrive, and in low data mode. Each local font a reader is likely to have gets its own `@font-face`, because one set of numbers cannot fit Arial, Roboto and Georgia at once. The stacks in `--st-font-display` and `--st-font-body` name them in turn, and the browser takes the first whose `local()` font exists.

| Face | `local()` sources | For | size-adjust | ascent-override | descent-override |
| --- | --- | --- | --- | --- | --- |
| `Instrument Sans fallback` 400 | Arial, ArialMT, Liberation Sans, Arimo | Windows, Apple, Linux, ChromeOS | 101.32% | 95.74% | 24.67% |
| `Instrument Sans fallback` 700 | Arial Bold, Liberation Sans Bold, Arimo Bold | the same, for 600 and 700 | 97.1% | 99.9% | 25.75% |
| `Instrument Sans fallback Roboto` 400 | Roboto, Roboto-Regular | Android | 102.6% | 94.54% | 24.37% |
| `Instrument Sans fallback Roboto` 700 | Roboto Bold, Roboto-Bold | Android, for 600 and 700 | 103.85% | 93.4% | 24.07% |
| `Fraunces fallback` | Georgia | Windows, Apple | 108.6% | 90.06% | 23.48% |
| `Fraunces fallback Noto Serif` | Noto Serif | Android | 100.74% | 97.08% | 25.31% |
| `Fraunces fallback Times` | Liberation Serif, Tinos | Linux, ChromeOS | 119.1% | 82.12% | 21.41% |

`line-gap-override` is 0% on every face.

How they were measured (WP-50 Phase 2):

- **size-adjust** is the ratio of advance widths, in Chromium, of the text of every document (37 English and 37 Afrikaans: about 734,000 characters of body text, and the h1 and h2 titles for the serif) set in the web font and in the local font. Body faces are matched to Instrument Sans 400, the bold faces to the mean of 600 and 700 (Arial Bold measures 96.47% against 600 and 97.80% against 700), and the serif faces to Fraunces 600 drawn with synthetic bold, which keeps the regular widths (Liberation Serif and Liberation Sans measure the same at 400, 600 and 700). English alone and Afrikaans alone differ by 0.2% to 0.3%. Roboto and Noto Serif were measured from their `@fontsource` files (the outlines Android ships), and Arial from Liberation Sans, which has Arial's advance widths. Georgia was not available: its value is Noto Serif's scaled by the two fonts' average widths in `@capsizecss/metrics` (Georgia 913/2048, Noto Serif 481/1000), a method that reproduced the measured Noto Serif to Liberation Serif ratio to 0.2% (1.1840 against 1.1823).
- **ascent-override** and **descent-override** are the web font's own metrics divided by size-adjust (Instrument Sans: ascent 0.970 em, descent 0.250 em; Fraunces: 0.978 and 0.255 em, the same in the wght and opsz files, read with `@capsizecss/unpack`), so the baseline sits where the web font will put it.
- Before WP-50 there were two faces: `local('Georgia')`, and Arial, Roboto and Helvetica sharing Arial's numbers from capsize (116.2% and 102.74%). On a phone (no Arial, no Georgia) and on Linux both failed, and the text fell through to an unadjusted system font.

**Layout shift when the fonts arrive late.** First table: 320×568 in Chromium, the reader scrolled into the page; every `.woff2` request held until the reader is in place, then released; the figure is the layout shift from the release to `document.fonts.ready` plus 800ms, the method of WP-50a review pass 4. This machine has the Liberation fonts, so it measures the Arial and Times faces; Android's Roboto and Noto Serif faces and Georgia were not measured live (see [Known limits](#known-limits)).

| Page and position | EN before | EN after | AF before | AF after |
| --- | --- | --- | --- | --- |
| `business-types/food/`, scrolled 1500px | 0.401 | 0.081 | 0.286 | 0.080 |
| `business-types/vehicle-dealer/`, scrolled 1500px | 0.401 | 0.077 | 0.337 | 0.037 |
| Find my path, question 1's heading at 80px | 0.172 | 0.056 | 0.133 | 0.046 |
| Find my path, question 2's heading at 80px | 0.283 | 0.046 | 0.319 | 0.046 |
| Find my path, question 3's heading at 80px | 0.133 | 0.046 | 0.093 | 0.046 |
| Home, top of the page | 0.230 | 0.010 | 0.230 | 0.000 |
| Header height at 320px, fallback then web font | 217 → 165px | 165 → 165px | 217 → 165px | 165 → 165px |

The 320px header no longer changes rows when the fonts arrive, which WP-50 Phase 3 (item 5) asked for.

The table above is 320px only, where the reading measure never binds. On a wide screen it does, and the first Phase 2 build had a desktop-only shift the 320px table could not show: the measures were in `ch`, the width of "0" in whichever font is drawn (0.67em in Instrument Sans, about 0.56em in the fallbacks), so every capped column was 17% narrower until the web font came, and the Afrikaans home page's lead wrapped to three lines and then two (review pass 2, major 1). The measures are now in em (see [Fluid scale](#fluid-scale-320px-to-1280px-viewport)).

Second table: the top of the page, fonts held until the page and its stylesheets are in, then released, at 1024×800, 1280×800 and 1440×800 (320×568 for the first column). Each cell is before Phase 2 (`3437e75`) → the first Phase 2 build (`ch` measures) → now. The first Phase 2 build was not swept at 320px.

| Page, top | 320px | 1024px | 1280px | 1440px |
| --- | --- | --- | --- | --- |
| `/` | 0.230 → 0.010 | 0.084 → 0.038 → 0.006 | 0.068 → 0.029 → 0.001 | 0.065 → 0.024 → 0.001 |
| `/af/` | 0.230 → 0.000 | 0.292 → **0.304** → 0.068 | 0.280 → **0.240** → 0.012 | 0.198 → **0.200** → 0.010 |
| `business-types/vehicle-dealer/` | 0.229 → 0.000 | 0.006 → 0.010 → 0.010 | 0.009 → 0.006 → 0.006 | 0.020 → 0.006 → 0.006 |
| `af/business-types/vehicle-dealer/` | 0.231 → 0.000 | 0.009 → 0.002 → 0.002 | 0.014 → 0.005 → 0.005 | 0.012 → 0.004 → 0.004 |
| `af/business-types/food/` | 0.231 → 0.000 | 1.379 → 0.002 → 0.002 | 0.022 → 0.001 → 0.001 | 0.023 → 0.001 → 0.001 |
| `find-my-path/` | 0.230 → 0.015 | 0.005 → 0.008 → 0.001 | 0.004 → 0.005 → 0.002 | 0.007 → 0.004 → 0.001 |
| `af/core/` | 0.230 → 0.000 | 1.379 → 0.001 → 0.001 | 0.011 → 0.000 → 0.000 | 0.005 → 0.000 → 0.000 |
| `af/templates/invoice/` | 0.230 → 0.000 | 1.379 → 0.001 → 0.001 | 0.008 → 0.001 → 0.003 | 0.021 → 0.007 → 0.007 |

Across the top of all 98 sitemap pages (both languages), cases over 0.1:

| Build | 320px | 1024px | 1280px | 1440px |
| --- | --- | --- | --- | --- |
| Before Phase 2 (`3437e75`) | 98 | 18 | 2 | 1 |
| First Phase 2 build (`ch` measures) | not swept | 1 (`/af/` 0.304) | 1 (`/af/` 0.240) | 1 (`/af/` 0.200) |
| Now | **0** (worst 0.027) | **0** (worst 0.068, `/af/`) | **0** (worst 0.019) | **0** (worst 0.016) |

No page is worse than before Phase 2 by more than 0.01 at any of the four widths. The 1.379 cases before Phase 2 are the Afrikaans header changing rows at 1024px when the font arrives. Body text keeps `font-display: swap`: `optional` would keep the web font from a first visit on a slow connection and buy nothing the metrics have not already bought. `tests/e2e/interactive.spec.ts` ("late web fonts on a wide screen") holds `/af/` at 1024 and 1280px and `/` at 1280px to 0.1 or less; it fails on the `ch` build.

**Scrolled into a page on a desktop** the picture is not as clean (WP-50 Phase 2 review pass 3, minor 2): at 1280px, scrolled 1500px, 6 of 81 document pages still shift more than 0.1 when the fonts arrive late, against 13 before Phase 2, and the reflowed text halves (6 blocks and 174px, against 12 blocks and 344px). Two pages are worse there than before: `branding/already-have-your-name/` (0.058 → 0.262) and `af/sources/` (0.036 → 0.196); both depend on which line sits at the viewport's top edge. Phase 3 rechecks them with the document page's new layout. On a phone the same holds (review pass 4, minor 1): at 360×740, scrolled 1500px, 4 of 74 document pages shift more than 0.1 (20 before Phase 2), and three of them were under 0.1 before: `af/core/running-a-pty-ltd/` (0.042 → 0.295), `af/core/working-from-home-and-safety/` (0.033 → 0.117) and `af/core/tax-and-sars/` (0.111 → 0.159). The cause is that the fallback text still lays out 3.5 to 4.5% narrower than Instrument Sans on this machine (0.954 to 0.966, measured on real text), so a block that reflows gains a line.

**Re-derived in WP-50 Phase 3, and kept at 101.32%.** Measured on the text of every document (60,000 characters each of English and Afrikaans paragraph and list text), laid out in the DOM in the adjusted face against Instrument Sans:

| Layout | 15.4px | 16.08px (body at 360) | 17.5px | 18px (body at 1280) |
| --- | --- | --- | --- | --- |
| Unhinted (`--font-render-hinting=none`; how Windows, macOS and Android lay text out), 101.32% | 0.996 / 0.999 | 0.995 / 0.998 | 0.995 / 0.998 | 0.995 / 0.998 |
| Hinted (Chromium on Linux, this machine), 101.32% | 1.014 / 1.017 | 0.963 / 0.969 | 1.005 / 1.006 | 0.957 / 0.965 |
| Hinted, 103.5% to 105% | 1.014 / 1.017 | 1.028 / 1.027 | 1.005 / 1.006 | 1.027 / 1.036 |

(EN / AF.) Laid out the way readers' systems lay it out, the face is already as wide as Instrument Sans (0.995 to 0.998). The 4% gap is Linux's hinting: Liberation Sans is drawn at a whole number of pixels per em, so any value from 99% to 103.4% draws 18px text at 18ppem, and the next step (19ppem) is 2.7% too wide. A Liberation-only face at 103% was built and swept: on a phone, scrolled 1500px, the sum of the shift fell (2.26 → 1.47) but five pages stayed over 0.1; on a 1280px screen, where Linux readers are, it rose (1.06 → 1.76, two pages over 0.1 → four). So the value stays, and the bold face's 97.1% likewise (0.994 unhinted). The serif face is within 1.5% hinted and 0.2% unhinted. Phase 5 still checks Roboto on a real phone.

**After the Phase 3 document page** (every `.woff2` held, released once the reader is in place, reduced motion; 74 document pages for the scrolled rows, all 98 sitemap pages for the top rows; `5fbea62` → this branch at `beaa776`, every figure from that one run):

| Position | Over 0.1 before | Over 0.1 after | Worst after | Sum of all pages, before → after |
| --- | --- | --- | --- | --- |
| Top, 320×568 | 0 | **0** | 0.032 (`af/paperwork/free-tools/`) | 0.18 → 0.21 |
| Top, 1024×800 | 0 | **0** | 0.068 (`/af/`) | 0.23 → 0.40 |
| Top, 1280×800 | 0 | **0** | 0.024 (`af/sources/`) | 0.27 → 0.24 |
| Top, 1440×800 | 0 | **0** | 0.019 (`af/sources/`) | 0.28 → 0.17 |
| 360×740, scrolled 800px | 1 | 1 | 0.138 (`af/core/running-a-pty-ltd/`) | 1.10 → 0.59 |
| 360×740, scrolled 1500px | 4 | 6 | 0.185 (`start/start-here/`) | 2.16 → 2.37 |
| 360×740, scrolled 2500px | 16 | 7 | 0.230 (`af/core/closing-as-a-sole-proprietor/`) | 3.98 → 2.43 |
| 1280×800, scrolled 1500px | 6 | 2 | 0.173 (`af/core/you-are-the-business/`) | 2.17 → 1.05 |
| 360×740, scrolled 1500px, unhinted | 2 | 2 | 0.300 (`start/start-here/`) | 0.63 → 0.82 |
| 1280×800, scrolled 1500px, unhinted | 1 | **0** | 0.087 (`af/core/closing-as-a-sole-proprietor/`) | 0.44 → 0.26 |

**Between runs** the same build measures differently by up to about 0.1 in a scrolled row's sum and on its worst page, and a page near 0.1 can cross it either way: four runs of the 360px, 1500px row on this branch (builds that differ only in details) gave sums of 2.26 to 2.37 and a worst page (`start/start-here/`) of 0.184 to 0.291, and review pass 2 measured 1.97 → 2.27. Read the table as a pattern, not to the last hundredth.

The top of every page stays at or under 0.068 at every width (no page more than 0.01 worse than before except five between 0.014 and 0.024, a quarter of the limit or less; the compact notice's small text gains a line when Instrument Sans arrives). Scrolled on a wide screen the worst pages are fixed (`branding/already-have-your-name/` 0.262 → under 0.03, `af/sources/` 0.196 → under 0.05, hinted). Scrolled on a phone the shift is lower at 800 and 2500px and about the same at 1500px, where pages now differ: the text starts 500 to 650px higher, so at 1500px the reader is in body paragraphs, which reflow (each gains a line under the hinted 4% gap), instead of the notices and the word list. Some of the pages over 0.1 there are start and Core pages whose H1 changes from two lines to three when Fraunces arrives. That is not a property of the layout, and no size-adjust fixes it for every title; it remains open for Phase 5's real-device check.

**Review pass 1 follow-up.** The review asked to try `text-wrap: pretty` (or no balancing) on the H1 on phones. It changes nothing: `balance` and `pretty` only even out the lines a greedy break already chose, never their number, so the same 17 headings on the 74 document pages at 360px (3 of them an H1) still change line count between the fallback and the web fonts, measured with low data mode as the fallback state. It was not kept. What moves on the named pages is body text: on `af/core/closing-as-a-sole-proprietor/` scrolled 2500px, four paragraphs above the viewport each gain a line (77 → 103px and so on), and on `af/core/you-are-the-business/` at 1280px one long block grows 173px; on `core/start-here/` and the start pages the H1 also goes from two lines to three. Each is the hinted 4% gap above. Unhinted, as phones lay text out, no page at 1280px and two at 360px exceed 0.1, the same count as before. So these pages stay worse than `5fbea62` at one depth on this machine's renderer; Phase 5 checks the late-font shift on a real Android phone (Roboto face, unhinted layout), which this container cannot.

### Fluid scale (320px to 1280px viewport)

| Token | Min → max | Use |
| --- | --- | --- |
| `--st-text-display` | 40 → 60px | Display numbers, hero |
| `--st-text-3xl` | 34 → 48px | h1 |
| `--st-text-2xl` | 28 → 36px | h2 |
| `--st-text-xl` | 22 → 26px | h3, card titles |
| `--st-text-lg` | 18 → 21px | Lead, plain-words callouts |
| `--st-text-md` | 16 → 18px | Body |
| `--st-text-sm` | 14 → 15px | Meta, badges, hints |
| `--st-text-xs` | 13px | Swatch values only |

Body line height 1.6; headings 1.15 (h3 and h4 1.3). Measure `--st-measure: 45.56em`, tables and sheets `--st-measure-wide: 60.3em`: 68 and 90 times the width of "0" in Instrument Sans (0.67em), in em so the fallback font draws the same column. Never size text containers in `ch`: it is the "0" of whichever font is on screen, and the fallbacks are matched on running text, not on figures. The pipeline emits no h4 or deeper.

## Other tokens

| Group | Tokens |
| --- | --- |
| Spacing | `--st-space-1` … `--st-space-9` = 4, 8, 12, 16, 24, 32, 48, 64, 96px (in rem) |
| Radius | `--st-radius-sm` 4px, `-md` 8px, `-lg` 14px, `-pill` 999px |
| Shadow | `--st-shadow-1` (resting card), `--st-shadow-2` (lifted card, toast) |
| Motion | `--st-duration-fast` 120ms, `-base` 200ms, `-slow` 320ms, `--st-ease`, `--st-lift` −2px. Under `prefers-reduced-motion: reduce` every duration is at most 120ms and the lift 0px; `base.css` keeps only transitions that move nothing. See [Motion](#motion). |
| Layers | `--st-z-sticky` 10, `-drawer` 40, `-dialog` 50, `-toast` 60 |
| Targets | `--st-target` 44px, `--st-target-lg` 52px |
| Borders and focus | `--st-border-width` 1px, `--st-focus-width` 3px (2px before WP-50), `--st-focus-offset` 2px, `--st-stripe-width` 4px |
| Layout | `--st-container` 1360px, `--st-sidebar` 272px, `--st-toc` 240px, `--st-topbar` 56px, `--st-gutter` fluid 16 → 32px |

### Motion

**The rule (WP-50, decision D3, "gentler, not zero").** With `prefers-reduced-motion: reduce` nothing moves: no transform, slide, lift, scroll animation or drawing ring. Changes that move nothing stay, at 120ms or less: a fade, a colour, a shadow, an underline. WCAG 2.3.3 and the vestibular guidance behind it concern movement, not fades, and a short fade keeps the cause and effect of a tap visible. Apple's and GOV.UK's practice is the same.

How it is enforced:

- `tokens.css` sets `--st-duration-base` and `--st-duration-slow` to `--st-duration-fast` (120ms) and `--st-lift` to 0.
- `base.css` sets `transition-property`, on every element and pseudo-element, to the properties that cannot move anything: `opacity`, the colours (`color`, `background-color`, `border-color`, `outline-color`, `text-decoration-color`), `text-decoration-thickness`, `fill`, `stroke` and `box-shadow`. Never `visibility`, `display` or `overlay`: with them, a control hidden that way stayed visible and clickable for 120ms under reduced motion (review pass 1, minor 2). The list replaces each element's own, so an element can gain a short fade it did not have; Phase 4 should gate movement where it is declared instead. A `transform` or `stroke-dashoffset` transition drops out of the list, so that change is instant. Durations stay as authored, which is why **transitions must use the duration tokens**: a literal 300ms would survive as a 300ms fade.
- Keyframe animations cannot be split by property, so they all still finish at once (`animation-duration: 0.01ms`), and `scroll-behavior` stays `auto`. An opacity-only entrance that should survive (the "Now reading" pill) needs a transition with `@starting-style` instead, in Phase 4.
- `tests/e2e/interactive.spec.ts` ("motion") checks a card, a button and a link under reduced motion: `opacity` and `box-shadow` stay in the list, no movement property does, every duration is 120ms or less and the lift is 0; and a ring's arc jumps.

**`review-animations` over every transition in `src/styles/**` and `src/scripts/**`** (WP-50 Phase 2). Verdict: **Approve**, no Block.

| Where | Motion | Verdict and why |
| --- | --- | --- |
| `base.css`, `a` | `text-decoration-thickness` over `--st-duration-fast` with `--st-ease`, on hover | Keep. Hover feedback, 120ms, not movement; a thin line on one link, so the non-GPU property costs nothing. Not gated behind `(hover: hover)`: after a tap the thicker line stays until the next tap, which is harmless. Stays under reduced motion |
| `base.css`, reduced-motion block | Narrowed from "every duration 0" to "drop movement, keep short fades" | The D3 rule above |
| `search.css`, `.st-search-target` | `background-color` keyframes, 2s, once | Keep. The landing highlight of a search result (build plan B3, "2s highlight"): colour only, once per search, a timer more than an animation, and it never needs to retarget. Static under reduced motion; the script removes the class after the same 2s |
| `tokens.css`, `--st-ease` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | A strong ease-out, as the standards ask for UI |
| `src/scripts/ring.ts` | Sets `data-animate` after the first drawing | Keep. A ring moves only when its value changes on the page, never on load (WP-50a fixed the Block the audit found). Under reduced motion the arc jumps |
| `search.ts`, `site.ts`, `applies.ts`, `template-form.ts`, `search-ui.ts` | `scrollIntoView`, five calls | Keep. All instant: no `behavior: 'smooth'`, and `scroll-behavior` is never smooth (WP-50a) |
| `src/scripts/search.ts` | Restarts the highlight when the same heading is chosen twice | Keep. A second choice must show again where the reader landed |

For Phases 3 and 4 (component CSS, outside the files this review covers): the card hover lift was ungated `:hover` motion on an element seen many times a day (removed in Phase 3, item 1: hover now deepens the shadow only, and only where `(hover: hover)`; the disclosure chevron added there turns at once); the toast enters with keyframes, which cannot be interrupted, and moves 0.5rem (D3 wants an opacity-only entrance); and the "Now reading" pill's opacity keyframes would read better as a transition.

## Grid and breakpoints

Custom properties cannot be used inside media queries, so breakpoints are literal and must be used consistently, with range syntax (`@media (width >= 768px)`):

| Name | Width | What changes |
| --- | --- | --- |
| sm | 480px | Full-width block buttons become inline |
| md | 768px | Roomier section headers, two-column definition lists |
| lg | 1024px | The `/design-system/content/` gallery's sidebar column appears (`.st-doc-grid`). Document pages have no sidebar since WP-50 Phase 3 |
| xl | 1280px | The document's contents column appears on the right (`Doc.astro`: `minmax(0, 1fr) 240px`) |
| (tables) | 640px | `TableScroll wide` stacks into cards below this width |
| (tables) | 36rem of the region | `TableScroll stack="rows"` stacks into cards below this width (a container query; business-types section) |
| (theme control) | 560px, 400px | The segmented control drops its tick, then its icons |

The last two are component-level widths, not system breakpoints: they belong to one component each and no layout depends on them.

Layout utilities (`src/styles/utilities.css`): `.st-quiet-links` (see [Links](#links)), `.st-container`, `.st-measure`, `.st-stack` (+ `-sm`, `-lg`, `-xl`), `.st-flow`, `.st-cluster`, `.st-grid` (`--st-grid-min`), `.st-doc-grid` (`272px | minmax(0,1fr) | 240px`, the content gallery only), `.st-disclosure` (a `<details>` with a chevron; see [The document page](#the-document-page-wp-50-phase-3)), `.st-visually-hidden`, `.st-link-block` (a stand-alone link with a 44px target; see [Wrapping and min-content](#wrapping-and-min-content)), `.js-only`, `.no-js-only` (inside an element marked `data-enhance`, both follow that element's `data-ready` instead of the page's `js` class; see [Controls that need a script](#controls-that-need-a-script-wp-50a)), `.st-num`, and the `[data-section]` hue scopes.

## Links

- **In running text, links are always underlined** (WCAG 1.4.1): the underline is what tells a link apart from the words around it. Offset 0.18em, thickness `max(1px, 0.0625em)`, thicker on hover.
- **In a list of navigation links** (the document contents column, menus), put `.st-quiet-links` on the list: its links show no underline until hover or focus. A contents list's place, heading and list form already say "these are links", and a column of underlines was louder than the article (WP-50 audit, finding 6; decided on 13 October 2026, `stoep-design` rule 7). The underline keeps its room (`text-decoration-color: transparent`, not removed), so nothing moves on hover; focus keeps the base 3px ink ring; forced colours paint the underline anyway; print shows it again, because paper has no hover. The current entry keeps its own marker. The document's contents column has used it since WP-50 Phase 3. `/design-system/` shows it next to an underlined link in a sentence, and `tests/e2e/design-system.spec.ts` checks the resting, hover and focus states.
- Never put `.st-quiet-links` on prose, a card's text or a single stand-alone link.

## Components

All components live in `src/components/ui/` (primitives) and `src/components/illustrations/`. Every interactive target is at least 44×44 CSS px and shows a 2px `--st-focus` ring with a 2px offset on `:focus-visible`.

| Component | Props | States | Accessibility |
| --- | --- | --- | --- |
| `Button` | `variant` primary/secondary/ghost/danger, `size` md/lg, `href`, `type`, `iconStart`, `iconEnd`, slots `icon-start`/`icon-end`, `loading`, `loadingText`, `disabled`, `block` | default, hover, active, focus, loading (variant fill, spinner, `cursor: progress`), disabled (dashed, muted, `--st-surface-2`) | `href` renders `<a>`. Disabled and loading use `aria-disabled="true"` (focusable, announced). `theme-init` swallows clicks on `.st-btn[aria-disabled="true"]`, and an inactive `submit`/`reset` renders as `type="button"`, so it cannot submit even without JavaScript. Loading adds `aria-busy`, hides the visible label from assistive technology and exposes only `loadingText` ("Saving", not "Saving Saving"). The spinner stops under reduced motion and keeps its gap in forced colours. The component owns `aria-disabled`, `aria-busy` and, while loading, the accessible name: those are spread **after** the caller's attributes, so a caller cannot undo the inactive state or replace `loadingText`. An inactive `href` button still renders its `icon-end`, so it does not change width when it becomes active. |
| `Card` | `title`, `titleLang`, `href`, `section`, `eyebrow`, `headingLevel`, `variant` page/tool/type, `action`, `actionContext`, `icon`, slots `illustration`, `meta` | static, hover (a colour, only where `(hover: hover)`), focus (ring on the whole card) | The card set (WP-50 Phase 3, item 2; see [The home page, the hubs and the card set](#the-home-page-the-hubs-and-the-card-set-wp-50-phase-3)): three shapes, each meaning one thing. No shadow and no lift on any of them. Single tab stop: the link's `::after` covers the card; on a tool the link is the button-shaped action, so its accessible name is the words on it (WCAG 2.5.3), with `actionContext` read after them. The meta row sits above the overlay, so links in it stay usable. The whole-card ring uses `:has()`; browsers without it get the ring on the link itself (`@supports not selector(:has(*))`). |
| `Callout` | `variant` plain-words/note/warning/official/info, `label`, `icon`, `labelId`, `compact` | default, compact | `compact` (WP-50 Phase 3) sets the body in `--st-text-sm` at line height 1.5 with 12px/16px padding; the box is at most `min(var(--st-measure), 38em)` in the page's em, about 85 characters of the small body text (it ran to about 110 at 1280px across the full measure; review pass 2, nit 2). The AI notice and the translation notice use it. `role="note"` named by its own visible label through `aria-labelledby`, so it is announced as "About this page, note" rather than a bare "note". The id is generated (`src/scripts/uid.ts`) unless you pass `labelId`. Icon plus visible text label; the icon stays beside the first line when a long label wraps. Plain-words is never collapsed. |
| `Badge` | `variant` entity/type/official/status/effort/mt/flag, `icon` (or `null`), `bare` | default, bare | `bare` (WP-50 Phase 3) is icon and words with no chip: no fill, no side padding and `border-style: none`, so forced colours draw no box either. The document's meta line uses it for the read time and the applies-to note. Icon plus text; tinted colours are decoration only. `status` (who checked a page, and when) is deliberately neutral — see [Notices and sources](#notices-and-sources-plan-d5). **Badges wrap.** A label longer than the row it sits in breaks onto a second or third line instead of pushing the page sideways, the icon stays beside the first line, and the corner radius is `--st-radius-lg`, which a browser clamps to an exact pill on a one-line badge and leaves as a calm rounded rectangle on a wrapped one. `flag` reuses the verified warning pair for "Not confirmed" and other verification flags. |
| `EffortMeter` | `level` 1–5, `label`, `levelLabels`, `scaleText` | five levels | Filled bars are veld green (`--st-primary`, 7.67:1 on the page, 8.13:1 on a tile) since WP-50 Phase 3; they were the section's hue, a rust next to rooibos on every business type. Bars are `aria-hidden`; the level is written out ("Medium to high") plus hidden "(4 of 5)". Defaults follow the toolkit's own scale: Lowest, Low to medium, Medium, Medium to high, High. |
| `ProgressRing` | `value`, `max`, `label`, `size`, `showValue` | empty, partial, complete | SVG `role="img"` with `aria-label` ("Part A: 12 of 34 done"). The percentage text is `aria-hidden` and sized to clear the stroke at 100%. Nothing moves when a page opens: the arc shows the value it opens with, and only a change on the page (a step marked done, a tick) moves it, a `stroke-dashoffset` transition of `--st-duration-base`. `drawRing()` sets `data-animate` after its first drawing, reading the style in between so the first value and the transition never land in one style change. Until WP-50a the top bar's ring drew in for 960ms on every page view. |
| `Icon` | `name` (`lucide:*`), `label`, `size` | – | `aria-hidden` unless `label` is given, then `role="img"` + `aria-label`. Use a label only when the icon is the only content. `.st-icon` is `inline-block` with `vertical-align: -0.125em`, so an icon inside a sentence (an error message, an external-link ↗, an "Official" marker) stays on the line even though the reset makes every other `svg` a block. Flex and grid children are blockified anyway, so icon rows in buttons and badges are unaffected. Icons come from Lucide; `src/icons/` exists (with a README and no SVGs) because astro-icon reads its `iconDir` on every build and otherwise logged `Failed to load icons from "src/icons": ENOENT` into every build and CI log. |
| `Kbd` | – | – | Native `<kbd>`. Keeps `white-space: nowrap`: a key name is short by definition, and breaking `Shift` across two lines would read as two keys. Do not put a sentence in a `Kbd`. |
| `VisuallyHidden` | `as`, `id` | – | Uses `.st-visually-hidden`. |
| `SectionHeader` | `section`, `title`, `eyebrow`, `level` 1–4 (default 1), `id` | six section hues | Hue stripe, tint, CSS-only shweshwe-inspired dot pattern (`aria-hidden`, removed under reduced data, low data and forced colours). Use `level` 3 or 4 when the header sits inside another page's outline. The eyebrow uses `--st-text` with a hue dot, never hue-coloured text on the tint. Code in the lead gets a light surface veil instead of beige `surface-2`. Under 768px the header is only as wide as the reading column, so the pattern moves from the inline end to a 3rem band along the bottom, out from behind the lead text. The header itself does **not** clip (`overflow: hidden` sits on the pattern's own box): clipping hid a lead paragraph that held a long URL instead of wrapping it, which is loss of content under WCAG 1.4.10 and which no `scrollWidth` test can see. The inner grid states `minmax(0, 1fr)` for the same reason. |
| `EmptyState` | `title`, `icon`, `headingLevel`, slot `actions` | – | Real heading; icon decorative. Its grid states `minmax(0, 1fr)` and the title lowers its own min-content width (`overflow-wrap: anywhere`), because `justify-items: center` shrink-wraps every item. `hyphens: auto` on the title is a progressive enhancement only — Chromium hyphenates here, WebKit on Windows has no dictionary and breaks mid-word — so it may never be the mechanism that stops an overflow. |
| `ToastRegion` | `id`, `label`, `static` | neutral (inverse), success, info, warning, danger | One `role="status"` region per page (implies polite; `aria-atomic="false"` so each toast is read on its own). Toasts need an icon plus text. Remove them after about 4 seconds. |
| `TableScroll` | `labelledby`, `wide`, `stack` | overflow shadows, stacked cards < 640px (`wide`) or below 36rem of the region (`stack="rows"`) | A table of three columns or more keeps `min-inline-size: 36rem` (and one-line column headings) and scrolls sideways; a two-column table fits the column where its words allow: words wrap only between words (the inherited `break-word`, which does not lower a column's min-content), and below 480px the cells' side padding is `--st-space-2`. A two-column table whose longest words cannot sit side by side scrolls sideways instead. Five Afrikaans tables do (the business-types hub, the checklist calendar, the sources contacts, how-to-use and branding prompts): all five at 320px and at 360px, and three at 412px (branding prompts, the checklist calendar and sources; the hub and how-to-use fit there). On the hub at 360px the link column was cut at the screen edge ("Voertuighande…") (WP-50a review pass 9, m1). Since WP-50 Phase 3, item 3 the business-types section's tables use `stack="rows"` (below): the hub's two no longer scroll; the other four remain in the backlog. The English branding-prompts table fits since `st-url`, below. `overflow-wrap: anywhere` broke words every two or three letters ("Vo/ert/uig/ha/nd/ela/ar", WP-50a review pass 1), and `hyphens: auto` is no help where the browser has no dictionary for the language, which is the case for every language in the Chromium the tests use. The "Key to the short words" table fits at 320px in both languages (WP-50a; at 36rem on every table it cut its second column off). A link whose text is an address (`st-url`, set by `Inline`) may break anywhere in a cell, so one URL does not widen a table; words still do not break. Renders `<st-table-scroll role="region" tabindex="0" aria-labelledby>`. The element (`src/scripts/table-scroll.ts`) removes the tab stop, role and label while nothing overflows and restores them on resize; without JS the region always stays focusable. The region is `position: relative`, so it is the containing block for anything positioned inside it: an `overflow` ancestor only clips descendants it is the containing block for, and without it every absolutely positioned element in a table escaped the scroll region and widened the page — a `.st-visually-hidden` span in a cell and the `thead` the stacked mode hides both did, measured as a 581px document at 320px. Nothing about that is visible, and no bounding box shows it; only `documentElement.scrollWidth` does. For `wide`, set `data-label` on every body cell. Each stacked cell is a two-column grid (label, value), so a wrapped label makes the row taller and never overlaps the next row. **Wrap cell content that mixes text and elements in one element** (for example `<span>`), otherwise each text run becomes its own grid row. The generated label uses `content: attr(data-label) / ''`, so screen readers hear the column header once. The element never removes the tab stop from itself while it holds focus (rotating the phone or closing a sidebar would otherwise drop focus to `<body>`); it re-checks on `blur`. The region scrolls sideways only (`overflow: auto hidden`, WP-50 Phase 3): with the other axis left `auto`, a few pixels of vertical overflow from a visually hidden span made a table that fits its column a scrollable region without a tab stop, which axe flagged once the document's text column widened. **`stack="rows"`** (WP-50 Phase 3, item 3; `TableBlock` sets it on every table of the business-types section that is not `wide`): the region is a size container (`container: st-table-stack / inline-size`), and when it is narrower than 36rem each body row becomes a card (`--st-surface`, hairline, 8px radius) and each cell shows its column heading above its words (`data-label`, `content: attr(data-label) / ''`, muted, small, semibold), not beside them as `wide` does: at 320px a label column left Afrikaans values about 170px. No rule between a card's cells. The `thead` is visually hidden as in `wide`. Measured on the region, not the viewport, so it follows the text column. Chromium keeps the table, its rows, cells and column headers in its own accessibility tree (`types.spec.ts`). Without container queries the table scrolls as before. |
| `Logo` (illustrations) | `name`, `markOnly`, `label` | – | Original stoep mark (roof over three steps) plus the name as real text. No flags or insignia. |

Form controls, links, tables, `mark`, `code` and prose are styled globally in `src/styles/base.css`. Use `.st-field` (label, control, `.st-hint`, `.st-error-text`) and `.st-check` (a checkbox or radio inside its label, as a 44px row). Invalid fields use `aria-invalid="true"` plus an error message linked with `aria-describedby` that starts with an icon; `.st-error-text` needs no layout of its own, because `.st-icon` is inline. The error border rule is scoped to `input` (not checkbox or radio), `select` and `textarea` and carries no `!important`, so a `fieldset` or a radio-group wrapper with `aria-invalid` does not grow a red box it cannot show. Disabled fields get a dashed border, `--st-surface-2` and muted text.

The theme control on `/design-system/` is `<st-theme-toggle>` (`src/scripts/theme-control.ts`) around System/Light/Dark radios. The segments are equal width on one row at every width; under **560px** the tick is dropped and under 400px the icons, because the filled segment already shows the choice. (560px and 640px are component-level widths, not system breakpoints; see [Grid and breakpoints](#grid-and-breakpoints).) In forced colours the selected segment is opted out with `forced-color-adjust: none` and filled with `Highlight`/`HighlightText`, so it differs from the others by fill and text colour and not by border colour alone — which mattered below 560px, where the tick is hidden. Every toggle on a page stays in sync, including ones connected later. The ThemeToggle component in the navigation package should reuse this element, including the forced-colour rule.

### Content, trust and navigation (WP-20)

The site package adds three families of components, and `/design-system/content/` is their live
reference, in English and in Afrikaans. It is `noindex` and out of the sitemap, like `/design-system/`.
Everything on it comes from `src/data/`: one whole document, rendered the way the document pages
render it, followed by the first real block in the corpus for every block kind, fence variant and
inline-run kind (`selectCoverage`, `src/lib/content/coverage.ts`). There are no invented examples,
so the page fails when the corpus renders badly rather than when a fixture does.

| Family | Components | Notes |
| --- | --- | --- |
| `src/components/content/` | `Blocks`, `Block`, `Inline`, `TableBlock`, `CodeBlock`, `TaskListBlock`, `TermsBlock`, `GlossaryBlock`, `ContentsBlock` | Every `Block` kind and every `InlineRun` kind. Styles that cross component boundaries (`.st-placeholder`, `.st-sigline`, `.st-blocks`, the terms list) are in `src/styles/content.css`, because a placeholder is marked both inside a paragraph and inside a `<pre>`. |
| `src/components/trust/` | `AiNotice`, `TranslationNotice`, `SourcesForPage` | Built only from `Callout`, `Badge`, `.st-link-block` and `.st-hint`, in the order [Notices and sources](#notices-and-sources-plan-d5) fixes. Which sentence is used is `trustNotice()` in `src/lib/content/trust.ts`, never the page. |
| `src/components/navigation/` | `SiteHeader`, `NavMenu`, `NavDrawer`, `Breadcrumb`, `SectionSidebar`, `TableOfContents`, `LanguageSwitcher`, `ThemeControl`, `SiteFooter` | `ThemeControl` reuses `<st-theme-toggle>` and its forced-colour rule. The Read and Tools menus are native `<details>`, so they need no script. |

Two rules the content renderers follow that a page package should not undo:

- **A docref shows the document's title, not its label.** The pipeline keeps the markdown's own
  link text, which is a folder name (`01-core/02`, `04-business-types/`). `docrefText()` resolves it
  through the manifest and keeps the label only for an id the manifest does not know.
- **`Inline.astro` is in `.prettierignore`.** Astro templates keep their whitespace, so breaking
  `<em><Self/></em>` over three lines renders "in Glossary ." with a space before the full stop.
  `tests/e2e/content.spec.ts` compares rendered paragraphs with `plainText` of the same runs, so the
  mistake fails the suite instead of shipping.

The top bar's Read and Tools menus share a `name`, so the browser keeps one open at a time with no
script. `navigation.ts` adds what `<details>` lacks: Escape closes the open menu and returns focus to
its summary (heard on the document, so it works after a Safari click that focuses nothing), a click
or focus outside closes it, and scrolling closes it, moving focus to the summary if it was inside,
so an open list never rides the sticky bar over the article. A side effect, accepted: after a scroll closes the menu and focus lands on its summary, Space toggles the menu rather than paging the document, as it does on any focused `<summary>`.

Without JavaScript the drawer cannot open, and it does not have to: below 1024px `SiteHeader` shows
the same `<details>` menus stacked whenever `<html>` has no `js` class, so a phone with scripting off
reaches every section and tool from the header, and there is no second copy of the links to keep in
step. The language switcher is plain links either way; `<st-lang-switch>` only adds the current
`#fragment` to them.

### Pages (WP-20 milestone 2)

| File | Routes | Notes |
| --- | --- | --- |
| `src/pages/[...locale]/[...route].astro` | every document and every section landing, in every enabled language | One catch-all, fed by `contentStaticPaths()` in `src/lib/pages.ts`. A section whose route is a document's (`business-types/`) gets no second page. A content route that collides with an app route or another content route fails the build. |
| `src/layouts/Doc.astro` | every document | Direction A since WP-50 Phase 3; see [The document page](#the-document-page-wp-50-phase-3). Business-type documents add the effort meter and the related types ("Read Core first" only when the text does not say it); the checklist says it is a reminder list; a template says when its rules were checked. |
| `src/components/pages/BusinessTypeTiles.astro` | home, `business-types/` | The six types as type tiles (`Card variant="type"`) with effort meters. The hub document shows them above its text (B6); it leaves out the General tile, which would link to itself. |
| `src/components/pages/SectionLanding.astro` | `start/`, `core/`, `branding/`, `paperwork/`, `look-it-up/` | The section header, then page rows built from each document's own summary and reading time, then the section's tools (fillable templates, the checklist) as tool panels. See [the hubs](#the-home-page-the-hubs-and-the-card-set-wp-50-phase-3). |
| `src/pages/[...locale]/index.astro` | home | Direction A with the stoep since WP-50 Phase 3 (see [the home page](#the-home-page-the-hubs-and-the-card-set-wp-50-phase-3)). The three 2026 figures come from `src/lib/home.ts`, each tied to an official register entry; `tests/unit/site/home.test.ts` fails if a figure is not in its source's own "supports" text. |
| `contents.astro`, `templates/index.astro`, `about.astro`, `search.astro` | the app pages | The search page is a GET form to itself; with JavaScript it runs `?q=` in place (see [Search](#search-wp-33)), without it it says search needs JavaScript and lists every page, after the common questions from "How to use this toolkit". About lists the shortcuts that work, the search keys among them, and has the settings (WP-30). |
| `src/pages/404.astro` | `/404.html` | Both languages on one page, because the server cannot know which one the reader wanted. With JavaScript, the block in the address's language suggests pages for the words in the missing address. |
| `src/layouts/Page.astro` | all of the above | Canonical, `hreflang` with `x-default`, Open Graph and a description. Every page is listed in every enabled locale, matching the sitemap; an Afrikaans fallback page is the Afrikaans page for its URL. |

Three flags in `src/lib/routes.ts` keep the site from offering what is not built:

- `WIZARD_AVAILABLE` (WP-31, **on**): while it was off, no page linked to the wizard or My path (the
  Tools menu, the drawer, the "Find my path" button, the trust line about "your answers" and the
  hero's "only the steps that apply to you" were left out). On, see
  [Find my path and My path](#find-my-path-and-my-path-wp-31).
- `SEARCH_AVAILABLE` (WP-33, **on**): off, `/search/` and the 404 page show no search form, the
  header and drawer show no search control or dialog, the home page's second action is the contents
  instead of "I know what I need", and the footer links the search page as "Common questions". On,
  see [Search](#search-wp-33).
- `TEMPLATES_FILLABLE` (WP-32, **on**): each template page is a form with a live preview
  (`TemplateTool`, see [Fillable templates](#fillable-templates-wp-32)), and the templates index and
  the Tools menu say "fill in and print". Off, they describe a sample layout and the template pages
  render as plain documents.
- `CHECKLIST_SAVES` (WP-30, **on**): while it was off, the checklist was described as a list to
  print and tick and every checklist page said its ticks were not saved yet. On, see
  [Interactive pieces](#interactive-pieces-wp-30).

Each package sets its flag to `true` in the change that builds the feature.

The top bar is sticky only from 1024px and only with JavaScript. On a phone it wraps to two or three
rows, and without JavaScript it carries the theme hint and, below 1024px, every menu, so pinned it
would cover anchor targets and focus. Where it is sticky its height still varies (one row at 1280px,
two at 1024px), so the scroll padding is not a constant: `trackTopbar()` in
`src/scripts/navigation.ts` publishes the bar's measured height as `--st-topbar-offset` (0 while the
bar is not sticky), and `SiteHeader.astro` sets `scroll-padding-block-start` from it. That rule owns the
scroll padding on every page with the header: it outranks the `html` rule in `base.css`, so a change
there has no effect on those pages. Below 1280px, on a page with the table of contents and with
JavaScript, it also adds `--st-toc-pill-space` (44px plus one more line and a gap), the room a one- or two-line
"Now reading" pill takes, so a heading reached by a link lands below the pill rather than under it.

Fenced blocks: prompts, snippets and examples are prose and wrap; template previews and listings
are layouts, keep `white-space: pre`, and are the only ones that can scroll, as a named region.

On an Afrikaans route that falls back to the English document, the English text is marked
`lang="en-ZA"` wherever it appears: the blocks, the `<h1>`, the summary, the terms, the table of
contents, the breadcrumb and sidebar titles, and the register's own text in "Sources for this page".
Inside the blocks the labels and document titles are English too (`ContentContext.contentLang`), so a
fallback block is one English island rather than English text with Afrikaans labels read in an
English voice. Everything around the content, and every URL, stays in the reader's language.

### The document page (WP-50 Phase 3)

Phase 3, item 1 builds `Doc.astro` to direction A (`docs/work-packages/WP-50-directions.md`, "Layout concepts → Document"). Screenshots, before (`5fbea62`) beside after: `docs/reviews/WP-50-phase3-doc/` (vehicle dealer, food, "What has changed" as a short document and the sources register, at 320, 360, 768 and 1280px, light and dark, English and Afrikaans).

**The top of the page, in order:**

1. **Breadcrumb** on one line, with a dot in the section's hue (`Breadcrumb sectionDot`) before the section. The "Section: …" label is gone: it repeated the breadcrumb. On a phone the trail is the section only, led by the dot. The dot is decoration (`aria-hidden`, absent in forced colours); the crumb's words name the section.
2. **H1 and lead.** The header's items are 12px apart.
3. **Meta line**: the read time and, on a business type, the effort meter, in one paragraph (`.st-doc__meta`; on a business type, since item 3, the type's facts, see [Business-type pages](#business-type-pages-wp-50-phase-3)). The read time is a plain icon and words there, not a chip (the critique's "one accessory"; the `Badge` keeps its markup).
4. **The AI notice**, compact (`Callout compact`: 14 to 15px body, 12/16px padding), same component, words, order and link. **The translation notice** directly under it, compact too.
5. **Two closed disclosures** with a chevron (`.st-disclosure`): "On this page (N sections)" and "Words used on this page" (renamed from "Words used in this file" in `en.json` and `af.json`; the heading id `words-used-in-this-file` is unchanged, so every anchor still works, and the contents list shows the new name for it). 16px under the notices, 8px apart. "Words used" is closed at every width: B6 had it open from 1024px, and the theme-init code that opened it is gone (−0.1 KB on every page). "Only what applies to me", where a page has it, sits under them.
6. **The text.** The separate "Read Core first" callout is gone from business types: all six open with "Read [Core: applies to everyone] first. This file adds …" in both languages, the link included. `Doc.astro` still shows the callout for a type whose first paragraph has no link to Core, so nothing is lost if a text changes.

On a short phone screen (below 768px wide and 740px high) and on a landscape phone (below 500px high) the notices come before the lead and the meta line (CSS `order`), so the AI notice stays on the first screen at 320×568 under today's two- and three-row header; see [AI notice](#ai-notice).

**The chevron** is drawn from two borders in `currentColor`, so it needs no icon and forced colours draw it; it points right when closed and down when open, at once (nothing animates). Print hides it, because paper shows the content open.

**From 1280px** there is no left section sidebar: the breadcrumb and the header's Read menu lead to the section, and the article gets the room (`minmax(0, 1fr) 240px`; the text column was about 640px wide at 1280px and is now the full measure). The contents column lists the **h2 sections only**, in `--st-text-muted` at `--st-text-sm`, as a `.st-quiet-links` list: no underline until hover or focus, the focus ring untouched. The section being read keeps its bar and weight and takes the text colour; every entry keeps the bar's room, so marking one does not push its text sideways. Links in running text keep their underline. `SectionSidebar` stays as a component for the `/design-system/content/` gallery.

**"In plain words" is the page's only warm colour.** The effort meter's bars moved from the section's hue (a rust next to rooibos on every business type) to veld green; the business-type badge was already green (Phase 2), and no other component on the page uses `--st-accent*`. The section's hue survives only as the breadcrumb's dot, which the direction asks for.

**"Sources for this page"** keeps its heading and count and shows its first three entries; on a phone the rest waits behind a native "Show the other N sources" checkbox. See [Sources for this page](#sources-for-this-page).

**Measured** at 360×740 in Chromium (Liberation fonts, web fonts loaded, JavaScript on, no saved answers), top of the element in page pixels; two screens are 1,480px:

| Page | Before (`5fbea62`) | After |
| --- | --- | --- |
| Vehicle dealer, EN: first heading of the text ("Quick answer") | 1,970 | **1,410** |
| Vehicle dealer, AF ("Vinnige antwoord") | 2,326 | **1,677** |
| Vehicle dealer, EN / AF: "Sources for this page", height | 8,273 / 8,937 | 910 / 1,010 |
| Vehicle dealer, EN / AF: page height | 40,353 / 44,976 | 32,430 / 36,399 |
| Food, EN / AF: first heading | 1,879 / 2,289 | 1,319 / 1,640 |
| Core start here, EN / AF: first heading | 1,345 / 1,701 | 1,081 / 1,321 |
| Sources register, EN / AF: first heading | 1,476 / 1,818 | 1,198 / 1,398 |

(The audit's 3,291px was measured before WP-50a.) English meets the two-screen target; Afrikaans is 197px over. What fills it is the header and real content: today's header is 165px at 360px (the mock had 57px; Phase 3, item 5 makes it one row), the Afrikaans translation notice is 178px (rule 9 keeps it), the Afrikaans lead wraps to five lines and the meta line to two, and the text's own three opening paragraphs are 389px. With a one-row header the Afrikaans page comes to about 1,570px. At 1280px the first heading moved from 2,368 / 2,803px to 939 / 1,114 (EN / AF). The AI notice starts 354px down at 320×568 in Afrikaans (402px without JavaScript), inside the 524px the first-screen test allows.

`tests/e2e/doc-page.spec.ts` holds the order, the two-screen target (English), the closed disclosures and their chevrons, the absent "Read Core first" callout, the 1280px column (h2 only, muted, no underline at rest, underline on hover, prose links underlined), the wider article, and the sources control (rest hidden on a phone until shown, by tap or keyboard; all entries shown from 768px with no control; all printed).

### The home page, the hubs and the card set (WP-50 Phase 3)

Phase 3, item 2 builds the home page and the section hubs to direction A (`docs/work-packages/WP-50-directions.md`, "Layout concepts → Home" and "Section hub", "The card set", decision D4 = A1). Screenshots, before (`5fbea62`) beside after: `docs/reviews/WP-50-phase3-home/` (`before-*` and `after-*`: home at 320, 360, 768 and 1280px with and without saved answers, the Core, Paperwork and Look it up hubs, the business-types hub, `/templates/` and My path, light and dark, English and Afrikaans; 28 files).

**The card set.** One `Card` component, with a `variant` per shape, and each shape means one thing on every page that shows it. Before, one card (white, green top edge, underlined serif title, 14px radius, the same shadow) was used for home's starting points, business types, every hub, the templates index and My path steps, and a reader could not tell a page from a tool from a step (WP-50 audit, finding 3).

| Shape | Means | Looks like | Used on |
| --- | --- | --- | --- |
| `page` (default) | A page to read | No box, no shadow: a 4px rule in the section's hue on the inline start, the title in Fraunces 600 as the link (text colour, underline in the hue), the summary in `--st-text-muted`, the read time as plain icon and words, a hairline under the row. Rows sit in a `.st-rows` list (`utilities.css`), which draws the hairline above the first. A plain link row (the home page's four early things) puts `.st-row` on its `<li>` | Hubs, "If you have 5 minutes" and "If you have an hour", the four early things |
| `tool` | A tool to use | A white panel with a 2px veld-green frame and the only large radius (14px), an icon tile (`--st-on-primary-soft` on `--st-primary-soft`, 9.03:1 / 8.36:1), and a button-shaped action. The action is the card's link, so its name is the words on it; `actionContext` names the tool after them in the accessible name where several tools share one action ("Open template: Invoice"). Below 480px the icon tile goes and the words take its column; the frame and the action still say "tool" | The checklist on home and on Look it up, the five templates on Paperwork and on `/templates/`, and the "Your path" card on home (its frame) |
| `type` | A kind of business | A white tile with a hairline, the illustration on its section tint in a 72px square (56px below 480px) beside the name, the one-line description and the effort meter | Home and the business-types hub |
| Step (`PathSteps`) | One step of the reader's path | A numbered circle (`--st-on-primary-soft` on `--st-primary-soft`, a 2px `--st-primary` edge) on a 2px rail in `--st-border-strong`; no box. The number is `content: attr(data-n) / ''`, so it is not read twice; "Step 3" stays in the markup, visually hidden. A step marked done fills its circle (`--st-on-primary` on `--st-primary`, 8.13:1 / 7.68:1). The last step shown has no rail | My path, the Find my path result |
| Fact (home) | A figure with its date and source | A 3px veld-green rule above, the label, the figure in Fraunces, the hints, "Official source" | "Three numbers that changed in 2026" |

No shape has a shadow or a lift. Hover changes a colour and only inside `@media (hover: hover)`: a page row's title takes `--st-link-hover`, a tool's action fills like the secondary button (`--st-on-primary-soft` on `--st-primary-soft`), a type tile's hairline becomes `--st-border-strong`. Focus is the 3px ink ring round the whole card (`:has()`). In forced colours the tool frame, the tile edge, the icon tile, the row rule, the step circle and the rail are drawn in `CanvasText`. Every colour pair above was already in `CONTRAST_PAIRS`; no token or pair was added.

**Home**, in order: the language banner and the "Your path" card (WP-31) as before, then the hero, then "Where to start", "Your kind of business", "Four things that matter early", "Three numbers that changed in 2026" and "Why you can use this guide". Every section keeps its content. What changed:

- **The hero**, in this order: h1, lead, the AI line ("Written by AI…", with its robot icon and "How this was made"), then the two actions. This is build plan B6's order. The first build put the actions before the AI line, as the direction's wireframe did, and the line then started 622px down at 320×568, below the first screen (review pass 1, m3). Decided by the owner's delegate: **the AI line starts on the first screen of home at 320×568, in both languages, with and without JavaScript**, because the site's trust rests on it. Below 480px the hero is a little tighter (16px above the h1 instead of 32px, 12px between its parts instead of 16px), so the line now starts at 466px with JavaScript and 514px without it (the no-JavaScript header is 213px, not 165px), both languages; the limit is 524px, the screen less a 44px line. With saved answers the "Your path" card sits above the hero and takes the first screen instead; that reader has used the guide before. The same holds when the language banner shows ("Gaan voort in Afrikaans" on the English home page, for a reader who chose Afrikaans before): the AI line then starts at 787px at 320×568, and is on screen from 360×740 (674px). Neither case is a regression (review pass 2, n2). `first-screen.spec.ts` and `nojs.spec.ts` hold the limit. From 1024px the stoep stands beside the words; below, under them.
- **The stoep** (the page's one bold element). Find my path's three questions ("How you trade", "Kind of business", "Where you are now", the wizard's own step names) as three steps widening downward (the top two inset by 14% and 7% of the width on each side), under the logo's roof, with the line "Three short questions. Then you get the steps that apply to you, in order." The roof is an inline SVG (`aria-hidden`, a `currentColor` stroke). Chromium does not force `color` on an SVG, so in forced colours the roof sets `color: CanvasText` itself (it kept the author's green before review pass 1, m4: #1E5A3C on black, about 2.6:1, for a reader with the site's light theme under a dark contrast theme); the steps are a real ordered list of text in `--st-on-primary-soft` on `--st-primary-soft`, numbered in Fraunces by a CSS counter with empty alternative text (the list already numbers them). The caption is the one link into the wizard and its target covers the figure, so a tap on any step opens Find my path: one tab stop, the ring round the figure. The figure takes no name of its own, so the caption is heard once, as the link; the link's name is its visible words followed by "Start Find my path" (`home.stoepLink`), so in a list of links, or for a speech user, it says where it goes and starts with what is on screen (review pass 1, n1 and n2). Print leaves the stoep out, as it leaves out the hero's buttons: on paper it was three loose lines and a link nobody can follow (n3). Nothing moves on load or on hover. It is HTML and CSS only (no script) and is left out when `WIZARD_AVAILABLE` is off. At 320px in Afrikaans every step keeps its words on one line.
- **Where to start**: "If you have 5 minutes" and "If you have an hour" are page rows; "If you know what you need" is the checklist as a tool, beside them from 1024px (at 768px its action wrapped to two lines in a narrow column, so it sits under them there). Removed: the small "Read Core: start here" and "Open the core section" lines under the first two cards. They repeated the summary above them ("Read Core: start here. It shows…"); `home.whereToStart.anHour.action` went with them (`fiveMinutes.action` still labels the hero button when the wizard is off).
- **Your kind of business**: type tiles, three to a row at 1280px; the General tile and "See all business types" stay.
- **Four things that matter early**: page rows in a `<ul>` (an `<ol>` before). They are not a sequence, and only real sequences are numbered (the generic-look check in WP-50-directions).
- **Three numbers**: facts instead of boxed cards. The figure was Fraunces at its default weight 400, `--st-text-display` (40 to 60px), in `--st-primary`; it is now Fraunces 600 with -0.02em tracking and lining figures, `--st-text-2xl`, in the text colour, the same wght-only settings as `.st-display` (Phase 2 leftover). Green is for things you act on; a figure is read.
- **Why you can use this guide**: the same four lines and the link, under a hairline instead of in a beige box: the box was the loudest thing at the foot of the page and held no action.

**Section hubs** (`start/`, `core/`, `branding/`, `paperwork/`, `look-it-up/`): breadcrumb, the shweshwe section header (kept; it is the hub's memorable element), the lead and the count of pages to read ("2 pages" on Paperwork; it counted the tools too until review pass 2), then the section's pages to read as page rows, in reading order, one column at the reading measure (two columns of cards before), then "Tools on this site" ("Gereedskap op dié webwerf") with the section's tools as tool panels: the five fillable templates on Paperwork ("Open template", named "Open template: Quotation" and so on with the template's short name, as on `/templates/`; the title's "(template)" repeated the action) and the master checklist on Look it up ("Open the checklist"). The heading was "Tools in this section" ("Nutsgoed in hierdie afdeling") until review pass 2. On Paperwork it sat right under the page row "Free tools" ("Gratis gereedskap"), which is about other people's free apps, so the two read as one thing in English and as two unrelated words in Afrikaans. "Tools on this site" says these are the guide's own, and the Afrikaans pair now uses one noun as the English pair does. (The header's Tools menu is still "Nutsgoed"; header wording is item 5.) A template is a tool while `TEMPLATES_FILLABLE` is on and the checklist while `CHECKLIST_SAVES` is; with a flag off it is a page row again. Removed: the "Page 2 of 10" eyebrow on every card (`section.pageNumber`): the list's own order is the reading order, and the eyebrow repeated it ten times. The hubs are not content pages (no `doc`), so the AI notice and "Sources for this page" rules do not apply; they keep their AI line with its date, as before. The **templates index** shows the five templates as tools; the **business-types hub** (a document) shows type tiles.

**Critique, round 1** ("remove one accessory"), from the first screenshots: the read time on every hub row was a chip, a box on a row whose point is having no box, as on the document page in item 1; it is now plain icon and words (`Badge bare` since review pass 2; first a transparent-border rule in `utilities.css`). Also from round 1: tools in one grid row share a height with their actions on one line, and the tool's icon tile gives its column to the words on a phone (in Afrikaans at 320px "As jy weet wat jy nodig het" took four lines beside it). The equal heights did not take effect in the first build (review pass 1, m1): a `li > .st-card` rule in `Card.astro` is scoped to Card, and the `<li>` belongs to the hub or the templates index, so it never matched. The list that owns the grid now makes each `<li>` a grid, so the panel stretches, and `home-hubs.spec.ts` checks that the panels in a row share a height and their actions a top. Tools also keep the meta row of a page row (review pass 1, m2): the read time and, should a tool ever apply to one kind of business only, its "Pty Ltd only" or "Sole proprietor only" note, as plain icon and words above the action. Since review pass 2 (m1) these are `Badge bare`, as on the document page: the first fix made the chip's border transparent, and forced colours repaint a transparent border, so the read time was boxed again there with its words touching the box; `bare` has no border at all. A meta row with nothing to press in it lets taps through (`pointer-events: none` unless it holds a link, button or field), so a tap on a tool's read time opens the tool like the rest of the panel (n4). In print a tool's action is an underlined link, not a framed button, and a tool panel or a type tile is never split across two pages (`break-inside: avoid`, n1).

**Measured** (Chromium, Liberation fonts, `5fbea62` → this branch; top of the element in page pixels, web fonts loaded):

| Page, width | Before | After |
| --- | --- | --- |
| Home, 360: "Where to start" (EN / AF) | 757 / 786 | 1,043 / 1,095 (the stoep sits above it) |
| Home, 360: "Your kind of business" (EN / AF) | 1,462 / 1,491 | 1,548 / 1,625 |
| Home, 360: "Three numbers" (EN / AF) | 4,115 / 4,349 | 3,108 / 3,317 |
| Home, 360: page height (EN / AF) | 5,690 / 5,975 | 4,508 / 4,768 |
| Home, 1280: page height (EN / AF) | 2,948 / 3,116 | 2,530 / 2,682 |
| Core hub, 360: page height (EN / AF) | 4,415 / 4,634 | 3,042 / 3,194 |
| Business-types hub, 360 (AF): page height | 7,996 | 6,599 |

**Layout shift with the web fonts late** (every `.woff2` held until the page and its stylesheets are in, then released; the method in [Fallback fonts and layout shift](#fallback-fonts-and-layout-shift)), the top of home, every hub, the business-types hub and `/templates/`, both languages, 16 pages:

| Width | Worst before (`5fbea62`) | Worst after | Over 0.1 |
| --- | --- | --- | --- |
| 320×568 | 0.010 (`/`) | 0.012 (`/`, after the pass 1 hero order; 0.010 before it) | 0 → 0 |
| 1024×800 | 0.068 (`/af/`) | 0.010 (`business-types/`) | 0 → 0 |
| 1280×800 | 0.012 (`/af/`) | 0.024 (`/`) | 0 → 0 |
| 1440×800 | 0.010 (`/af/`) | 0.004 (`/af/`) | 0 → 0 |

`/` at 1280px rose from 0.001 to 0.024: the h1 and lead reflow by a line when Fraunces arrives and the stoep beside them, centred on the hero, moves with them. It is a quarter of the limit, so it stays.

**Weight.** JavaScript is unchanged on every page this item touches (home 22.0 KB, hubs 17.1 KB, `/templates/` 17.1 KB, My path 26.4 KB, the heaviest document page 24.0 KB, gzip; `pnpm dist:budget`): the stoep, the card set and the hover states are CSS. CSS grew: the card set is about 6 KB raw, over Astro's 4 KB inline limit, so it is now its own cached file (`Card.*.css`) instead of copies inlined into each page's styles. Gzip per page, CSS files plus HTML: home 19.9 → 21.9 KB (two stylesheets → four), a hub 23.4 → 24.2 KB, `/templates/` 15.9 → 17.0 KB, a document page about +1 KB (it shares the `Card` file because `Doc.astro` renders the business-type tiles). On a second page the card set comes from the cache. Home's own styles (about 7 KB raw, 1.7 KB gzip: the hero, the stoep, the facts, the trust list) are a fourth stylesheet for the same reason. They stay separate (review pass 1, n4): Astro's `inlineStylesheets: 'auto'` inlines below one global 4 KB limit and has no per-file setting, and raising the limit for every page would inline other pages' styles too and lose their caching; folding home's styles into the site-wide `stoep.css` would make every page download them. Measured by the reviewer on a slow first visit (360px, 150ms, 1.6 Mbit/s, five runs), the two extra stylesheets cost about 16ms at the median first paint, inside the run-to-run spread.

`tests/e2e/home-hubs.spec.ts` holds the stoep (three steps in order, each wider than the one above, the roof hidden from assistive technology, beside the hero's words at 1280px, a tap on a step opens Find my path, 320px in Afrikaans with nothing clipped, the roof and the edges in the system's text colour in forced colours, one accessible name for the stoep, which names Find my path, and no stoep in print), the shapes (a page row has no fill, shadow or top border and a 4px rule; a tool has a 2px frame and the 14px radius; a tile has a hairline), hover (a colour changes, the box does not move; every hover rule for cards and the stoep sits inside `(hover: hover)`), the hubs (Paperwork: two rows, no "Page n of n", five template tools named "Open template: …"; Look it up: the checklist as a tool with its read time as plain words; `/templates/`: five tools; at 1280px the tools in one row share a height and their actions a top) and the steps (the circle's number is the step's, "Step n" in the markup, no rail under the last).

### Business-type pages (WP-50 Phase 3)

Phase 3, item 3 is what is specific to a kind of business on the six type pages (`business-types/*/`) and "Pick your business type", in both languages; they already use the item 1 document page. The reader's job there (WP-50 audit, flows 1 and 4): "I picked my kind of business; what does it need, and roughly what does it take?" Before this item the answer was the effort meter in the meta line and then the text: what the type needs was the first section, 1,224 to 1,675px down at 360×740, and how long it takes, where a page says, further on. Screenshots, before (`bebd0de`) beside after: `docs/reviews/WP-50-phase3-types/` (the hub, vehicle dealer, food and beauty at 320, 360, 768 and 1280px, light and dark, English and Afrikaans, plus `landing-tables-af-320-light.png` for the hub's tables; 25 files).

Nothing here adds a fact. Every word comes from the markdown, in the page's language (`src/lib/business-types.ts`).

**The type's facts** (`TypeFacts.astro`) take the meta line's place in the header: the read time and the effort meter on one line, as before, then the hub's "Main reason" for that level on the next ("Certificate of Acceptability, training, inspections"; "Drie aparte lae van registrasie"). The reason is the third column of the hub's effort table ("How much regulation each type carries"), found by its English row label (`pickTable.rows`, which `content:check` holds against the table) and taken from the translated table at the same row (`content:fidelity` keeps the rows in step). From 480px the type tile's two-tone illustration sits beside them on its section tint, a 48px square, so the page shows the picture of the tile the reader tapped (D5: the illustrations stay; the tile on home and the hub is item 2's). The facts have no link or control, so on a short phone screen they move after the AI notice with the lead (CSS `order`), as the meta line did; the order of focus does not change. A visually hidden "Main reason:" ("Hoofrede:", `businessTypes.glance.reasonLabel`) starts the reason, so a screen reader does not run it on after the meter's level (review pass 1, m6).

**"Go straight to"** (`TypeJump.astro`, "Gaan direk na:") follows the notices: one wrapping line, the label and then links to the type's timing, where it has one, and its checklist, each named by its own heading, a dot between them that is not read out (`content: '·' / ''`). The sections are listed by heading id in `content-meta/business-types.json` (`glance`; `content:check` fails a build whose id is not a heading of the type's document). So the dealer has one link (its startup checklist, about 30,000px down a phone), food two ("Realistic timing", "Your checklist"), the others one. Review pass 1 (m5) took out the "what you need" links of the first build: the first such section starts right under the disclosures and the rest are in "On this page" just below, and on food the row took 118 to 162px; it is now 44px in English at 360px and 66px in Afrikaans or at 320px. The row's text is `--st-text-sm`; each link is still a 44px target. It sits 4px under the notices and the contents disclosure 8px under it, since a 44px target already centres its words about 10px down. From 1280px, where the contents column is always in view, it is not shown. Print leaves it out.

**"Only what applies to me"** never hides a business type's own subject on its page: a part whose only condition is the page's own kind of business gets no condition there (`appliesAttributes(value, ownType)`, through `ContentContext.ownBusinessType`), and the switch is offered only when something else is left to hide (`docHasConditions(doc, type)`). Before, a food reader with the switch on saw the dealer's own startup checklist hidden on the dealer page. On five of the six the only conditions were the page's own checklist (`when: food` on the food page): the switch could only hide the page's subject from a reader who opened it, and without answers it showed "Answer the questions in Find my path to use this." under the disclosures, about a switch nobody could see. The vehicle dealer keeps it ("If you trade as a company" and "… as a sole proprietor" collapse into their markers). The line without answers now says what the switch is for: "To see only the parts of this page that apply to you, first answer three short questions: Find my path" ("Om net die dele van dié bladsy te sien wat vir jou geld, beantwoord eers drie kort vrae: Vind my roete"), on every document that has the switch. The five pages no longer load `applies.ts`: 2.4 KB less script on each.

**The hub's tables stack** (`TableScroll` `stack="rows"`, set by `TableBlock` on the business-types section's tables): below 36rem of the region each row is a card and each cell sits under its column heading. In Afrikaans the two-column "Kies jou besigheidstipe" table scrolled sideways by 77px at 320px and 38px at 360px (WP-50a pass 9, m1), and the three-column effort table by 288, 249, 199 and 133px at 320, 360, 412 and 480px, in English too. Now nothing scrolls on any type page or the hub at 320 to 480px, and every cell shows. The hub at 320px in Afrikaans is 1,315px longer (6,938 → 8,253px): every cell now has the line it needs. From about 610px of viewport the tables are tables again. A stacked table never scrolls (cards below 36rem, a fitting table above), so its caption drops "Scroll sideways to see all of it" (`doc.tableRegionStacked`: "Table: {caption}."), and its parts carry explicit `table`, `rowgroup`, `row`, `columnheader` and `cell` roles, the standard fix for `display: block` table parts, which WebKit drops from the tree VoiceOver reads (review pass 1, m2 and m3). VoiceOver on an iPhone is on the Phase 5 checklist.

**Critique, round 1** ("remove one accessory"). The first build was a separate panel after the AI notice ("Before you can trade": a white tile with a hairline, the illustration, a heading, the meter, the reason, a ruled "Go straight to" list). It put the effort meter on the second screen at 360×740, where the meta line had it on the first (487 → 931px), and pushed the dealer's first heading 300px down. The facts went back into the header as two lines and the links became one row. Then, from the second build's screenshots: the 3px veld-green rule above the facts (the home page's fact shape) read as a divider under the lead and cost 11px, and on a phone the art square took 60px of a 288px line, so the Afrikaans food reason wrapped to four lines beside it. The rule went; the art shows from 480px. In the stacked tables, the hairline between a card's cells went: each label already starts its cell.

**Measured** (Chromium, Liberation fonts, web fonts loaded, top of the element in page pixels; `bebd0de` → this branch):

| Page, 360×740 | Effort meter | AI notice | First heading of the text |
| --- | --- | --- | --- |
| Vehicle dealer, EN / AF | 487 / 546 → 487 / 542 | 521 / 576 → 551 / 602 | 1,408 / 1,675 → 1,477 / 1,740 |
| Food, EN / AF | 448 / 535 → 448 / 531 | 481 / 565 → 537 / 617 | 1,317 / 1,638 → 1,359 / 1,699 |
| Beauty, EN / AF | 517 / 528 → 513 / 524 | 547 / 558 → 573 / 609 | 1,264 / 1,486 → 1,276 / 1,524 |
| Professional, EN / AF | 487 / 546 → 487 / 542 | 521 / 576 → 551 / 602 | 1,356 / 1,649 → 1,373 / 1,662 |

The reason line is new and ends on the first screen on all twelve pages (`types.spec.ts`). The AI notice moves down by the reason's line or two and stays on the first screen everywhere (the latest is 617px in Afrikaans on food; the limit is 696). At 320×568, where the notices come first, it does not move (354px, 402px without JavaScript; Afrikaans beauty 393 / 441). The English dealer's first heading stays within two screens in Chromium (1,477 of 1,480); the text moves down by the "Go straight to" row, which reaches the checklist in one tap. With 3px to spare, `doc-page.spec.ts` keeps the plain two-screen limit in Chromium and allows the row's own height (at most 48px) on top of it only in other engines, so their font metrics (WebKit runs it in CI) do not fail the page for that link.

**Layout shift with the web fonts late** (the method in [Fallback fonts and layout shift](#fallback-fonts-and-layout-shift)), the top of the 14 pages: 320×568 0.000 → 0.000; 1024×800 0.008 → 0.008; 1280×800 0.007 → 0.007; 1440×800 0.006 → 0.005. None over 0.1. The hub scrolled to its tables at 360×740: 0.026 → 0.031 (English).

**Weight.** JavaScript (gzip, `pnpm dist:budget` method): the dealer and the hub unchanged (23.3 and 19.5 KB); food and retail 24.3 → 21.9 KB, the other three types 23.3 → 20.9 KB (no `applies.ts`). Food was the heaviest document page; the heaviest is now `/af/core/adding-new-lines/` at 24.3 KB, unchanged. CSS +0.3 KB gzip on every document page (the facts, the links and `stack="rows"`). No new colour pair: the facts, the links and the cards use text, muted text and link colours on `--st-bg` and `--st-surface`, and the art the type tile's pairs, all already in `CONTRAST_PAIRS`. In forced colours the art square and each stacked card get a `CanvasText` edge.

`tests/e2e/types.spec.ts` holds the facts (on the first screen at 360×740 in both languages, the reason quoted from the hub in the page's language, the art only from 480px), "Go straight to" (the links per type, 44px each, landing on their headings, after the AI notice), the switch (only on the dealer) and the hub's tables (cards at 320px in Afrikaans with every cell labelled and nothing sideways, tables at 1280px, table semantics in Chromium's own tree, skipped in other engines). `nojs.spec.ts` checks the facts, a jump link and the cards without a script; `a11y.spec.ts` runs axe at 320px on the Afrikaans hub and food page in both themes.

### The tools (WP-50 Phase 3)

Phase 3, item 4 is the five tools as one product: Find my path, My path, the templates (the index and each template), the checklist and the search dialog, plus the confirm dialog they share. Readers use them on a phone, often for the first time, to do something: answer, tick, fill in, print, find. Screenshots, `ea15b4a` on the left and this branch on the right: `docs/reviews/WP-50-phase3-tools/` (36 files: Find my path at questions 1 and 3 at 320px and question 2 at 1280px, My path at 320 and 1280px, the tax invoice at 320 and 1280px and its required items and actions at 320px, `/templates/`, the checklist, a confirm dialog at 320 and 1280px, and the search dialog with no results at 320px and with results at 1280px; English and Afrikaans, light and dark where it matters).

**The critique** (walked at 320×568, 360×740, 768 and 1280px, both languages, both themes, with and without JavaScript), in order of harm to a reader:

1. **Every confirm dialog sat against the top and start edges of the screen, at every width.** The reset in `base.css` sets every `margin` to 0, and a native modal `<dialog>` centres itself with `margin: auto`. "Remove all ticks?", "Remove your answers?", "Clear this form?" and "Clear all your data?" looked broken. On a phone its two buttons were two ragged right-aligned shapes of different widths.
2. **A template's Print button was two screens under the form on a phone.** "Required items" listed each missing item on its own line: thirteen on an empty tax invoice, about 620px at 320px, between the last field and Print. The buttons had no heading, so the end of the form and the actions read as one list.
3. **Find my path's first answer started below the first screen** (780px at 320×568, 803px in Afrikaans; 725px at 360×740). The stepper's words took two rows (about 120px) and said what the step's heading under it says again ("Step 1 of 3 / How you trade", then "Question 1 of 3: How you trade").
4. **Find my path never showed the answers before "See my path".** And a question already answered looked exactly like one still to come in the stepper (both muted, both on a grey bar).
5. **My path did not say where the reader was.** Every step looked the same, and the answers came first as a second h2 the size of "Your path", with a plain link to change them.
6. **On a phone a template's form was boxes in boxes.** Each group was a frame with 16px inside, so a field was 254px wide at 320px, and an invoice line was a grey box inside it.
7. **The checklist's items had about 210px of line at 320px** inside the box's 20px padding; most took three or four lines.
8. **"Nothing found … or look in the glossary"** in the search dialog, with no way to the glossary on screen.

What was already right and stays: one question per step, Back that keeps every answer (native inputs), 44px answer rows with visible labels, Next's reason written under it ("Choose an answer first."), the template's Fill in / Preview tabs, the checklist's 44px tick rows with a real tick (not colour), the counts on every list, the search dialog's field, results, failed and empty states at 320px, and the held-Enter logic in `search-boot.ts` (not touched).

**What changed**, by tool. No new component and no new colour pair: everything uses tokens and pairs already in `CONTRAST_PAIRS`.

| Tool | Change | Why |
| --- | --- | --- |
| Confirm dialog (`ConfirmDialog.astro`) | `margin: auto`, so it is centred with the page's 16px gutter. Below 30rem each choice takes a full row, the safe one first and focused, as before | Critique 1 |
| Find my path (`Wizard.astro`, `wizard.ts`) | Below 30rem the stepper is a segmented progress bar on one row, filled up to and including the current step and empty after it. The three states differ in height as well as colour: to come is a 2px line in `--st-border-strong` (the `border-strong` on `bg` pair, 3:1 or more in both themes, already in `CONTRAST_PAIRS`), done a 6px segment in `--st-primary`, current a 10px one; the bars share a bottom edge and the stepper is 10px tall at every step. Its words are visually hidden (`.st-visually-hidden-narrow`, the shared rule in `utilities.css` below 30rem) and stay in the accessibility tree (the list "Questions", "Step 2 of 3", "Kind of business"). There is no tick on a phone. The step's h2 is `--st-text-xl` there. First answer at 320×568: 780 → 635px (EN), 803 → 635px (AF); at 360×740: 725 → 554px (EN), 754 → 608px (AF), now on the first screen | Critique 3. The h2 says "Question 2 of 3: Kind of business", so the bar never carries the step alone (review pass 1, M1: the first build had done and current the same 6px, so the phone bar showed two states, and its tick was clipped inside the hidden words) |
| | From 30rem, where the stepper shows its words, a question already answered has a filled bar and a tick drawn from two borders in `currentcolor`, in the item's start padding (16px, at every step, so no word moves and no row wraps when it appears); the current step's words are semibold. In forced colours done and current bars are `Highlight` and steps to come `GrayText` (review pass 1, m1). "Done" means "before the current step": after "Change" goes back, a later question already answered shows as to come (backlog) | Critique 4: done, current and to come are three states, not by colour alone, at every width |
| | "Your answers so far" (`wizard.summary.*`) on the last question, above Back and "See my path": how the reader trades in its own label's words, and the kinds of business as a list in the order they were ticked, the first marked "(main)" / "(hoof)" when there are two or more (review pass 1, m5). "Change" (a ghost button, 44px, named "Change: How you trade" by `aria-label` from `wizard.summary.changeNamed`) goes back to that question with focus on its heading and every answer kept. The list items are server-rendered, one per kind of business; `#summarise()` in `wizard.ts` only shows, orders and marks them and writes the entity's words. The section is `.js-only`, so without JavaScript (all three questions on one page) there is no summary | Critique 4 |
| My path (`my-path.astro`, `PathSteps.astro`, `my-path.ts`) | The first step not done gets "Do this next" (`myPath.upNext`, with an arrow icon) and a second ring round its circle (`--st-bg` then `--st-primary`, a box shadow; a 2px `CanvasText` outline in forced colours). It moves on as steps are marked done; none once all are | Critique 5 |
| | The answers are one strip: "Your answers" as a small muted heading (the h2 and its id stay), the chips, and "Edit answers" as a secondary button with a pencil (still a link, same name), closed by a hairline | Critique 5 |
| Templates (`TemplateTool.astro`) | Below 30rem of the tool (its own container) a group has no frame and its legend is the group's heading (Fraunces, `--st-text-xl`); fields are 288px at 320px. From 30rem the frames stay | Critique 6 |
| | The missing required items wrap as one paragraph of links (`display: flex; flex-wrap: wrap`), each still a 44px target. The actions have a heading, "When you are done" / "As jy klaar is" (`templates.actionsHeading`; hidden with the actions without JavaScript and in print). Print at 320×568: 5,228 → 4,773px (EN), 5,581 → 5,145px (AF) | Critique 2 |
| Checklist (`content.css`) | Below 30rem `.st-tasklist` keeps 12px inside, not 16/20px. The rows stay 44px. `/checklist/` at 320px: 19,462 → 18,796px (EN), 21,335 → 20,363px (AF) | Critique 7. Every checklist on a document page gets the same room |
| Search dialog (`SearchDialog.astro`) | The empty state, which also shows under "Nothing found", ends with "Browse all pages" and "Look a word up in the glossary" (`search.browseGlossary`), 44px link rows. Server-rendered; no script change | Critique 8 |

**Critique, round 1** ("remove one accessory"). From the first build's screenshots: the answers strip on My path had a hairline above and below; the one above sat right under the lead and read as a rule under the title, so it went. The template groups lost their frame on a phone (above), and the stepper its words. The wizard's summary has hairlines between its rows and no box. Not added: a frame round the summary, a chip or badge for "Do this next" (it is words and an icon), colour on the ticked checklist rows.

**Print.** The tax invoice, the checklist and `/templates/` print exactly as at `ea15b4a` (review pass 2 compared the PDFs), and Find my path differs only by the stepper's 16px start indent. My path prints differently, on purpose: "Edit answers" no longer prints, because it is now a button and the site's print rules leave actions off paper; "Do this next" and its double ring do print, because on paper they still say where the reader is; "Your answers" prints as the small muted heading above the hairline, with the chips. "Your answers so far" on Find my path is a group named by its heading (`role="group"`), not a landmark, and a single kind of business shows without a bullet (still a list). "Change" shows its word and is named "Change: How you trade" through `wizard.summary.changeNamed` (review pass 2, m1, m4).

**Measured** (Chromium, Liberation fonts, web fonts loaded; top of the element in page pixels; `ea15b4a` → this branch). The first screen is 568px at 320×568 and 740px at 360×740; today's header (165px at both) is item 5's.

| Page, size | Element | EN | AF |
| --- | --- | --- | --- |
| Find my path, 320×568 | first answer | 780 → 635 | 803 → 635 |
| Find my path, 360×740 | first answer | 725 → 554 | 754 → 608 |
| Find my path, 320×568 | Next | 1,308 → 1,163 | 1,330 → 1,163 |
| Find my path, 320×568 | "See my path" (the summary is above it) | 1,245 → 1,336 | 1,290 → 1,358 |
| My path, 320×568 | first step | 700 → 708 | 700 → 708 |
| My path, 360×740 | first step | 657 → 666 | 657 → 666 |
| Tax invoice, 320×568 | Print | 5,228 → 4,773 | 5,581 → 5,145 |
| Tax invoice, 320×568 | page height | 7,449 → 6,994 | 7,979 → 7,544 |
| Checklist, 320×568 | page height | 19,462 → 18,796 | 21,335 → 20,363 |

My path's first step moves 8px down: the answers strip is about as tall as the h2, chips and link were (the chips take two rows at 320px), plus 8px above it. "Do this next" is what tells the reader where to start; at 360×740 that step is on the first screen (666px).

**Layout shift with the web fonts late** (every `.woff2` held until the page and its stylesheets are in, then released; the method in [Fallback fonts and layout shift](#fallback-fonts-and-layout-shift)), the top of `find-my-path/`, `my-path/` (with answers), `templates/`, `templates/tax-invoice/`, `checklist/` and `search/`, both languages: 320×568, worst 0.015 → 0.029 (`/find-my-path/`, which now has the answers on its first screen); 1280×800, worst 0.002 → 0.002. None over 0.1. Nothing moves when the scripts arrive: the summary is on question 3, which is hidden until the wizard is ready, and "Do this next" is inside My path's steps, which are drawn by its script into the room `theme-init.js` keeps (`wizard-shift.spec.ts` and the template and My path shift tests pass unchanged).

**Weight** (gzip, the `pnpm dist:budget` method; JavaScript / CSS files / HTML): `find-my-path/` 22.3 → 22.6 KB / 9.0 → 9.4 / 12.5 → 12.8 (the summary in `wizard.ts` and its list; a tool page, budget 45 KB); `my-path/` 26.7 → 26.7 / 7.8 → 7.8 / 25.1 → 25.6 (a "Do this next" in each step card); `templates/` 17.4 / 9.0 / 8.1, unchanged; `templates/tax-invoice/` 24.2 → 24.2 / 13.3 → 13.4 / 18.6 → 18.7; `checklist/` 23.8 → 23.8 / 13.3 → 13.4 / 26.0 → 26.0; `/af/search/` 34.9 → 34.9 / 7.8 / 11.2 → 11.3 (the glossary link in the dialog, on every page). The heaviest document page is unchanged (`/af/core/adding-new-lines/`, 24.3 KB of 25 KB), and so is the heaviest other page (`/af/search/`, 34.9 KB of 45 KB).

`tests/e2e/tools.spec.ts` holds the stepper at 320px (one row, at most 12px, the bars' three heights at each step and the same height at every step, no tick, its words in Chromium's own tree), the first answer (within 650px at 320×568 in Chromium, 698px elsewhere until the first CI WebKit figure is recorded; within 740px at 360×740, EN and AF), the tick from 30rem (drawn with a box of its own, its words not clipped, only on done steps), the summary (General ticked before Food, so a lost reorder fails; a group, not a landmark; no bullet for one kind of business) and "Change" (answers kept, focus on the heading, its exact name in Chromium's tree), "Do this next" moving on, "Edit answers" as a 44px button above the path, the template groups (no frame at 320px, a frame at 1280px, 286px or wider fields), the wrapped 44px required links and the actions heading, the checklist's 44px rows and 12px padding, the centred "Remove all ticks?" with both choices one width and the safe one focused, the glossary link under "no results", and no sideways scroll on any of them, in both languages. `nojs.spec.ts` checks there is no stepper or summary without JavaScript and that a template group is unframed at 320px. `a11y.spec.ts` runs axe at 320px in Afrikaans, in both themes, on the wizard's last question with the summary, My path with "Do this next", the tax invoice, and the search dialog with no results. `tests/dom/wizard.test.ts` and `tests/dom/my-path.test.ts` hold the summary's words, list order and "(main)" and the "Do this next" rule.

### Search (WP-33)

| File | What it is |
| --- | --- |
| `src/components/search/SearchDialog.astro` | The dialog, rendered by `SiteHeader` on every page with the header: a native `<dialog>` (Escape, backdrop and the focus trap come free), the form, an empty listbox, a polite status line, the failed state and, as the empty state, the first eight common questions. `js-only`: without JavaScript the header's search control is an ordinary link to `/search/`. |
| `src/scripts/search-boot.ts` | The part every page loads, through `site.ts` in `Page.astro`'s one script: opens the dialog from any `[data-search-open]` (the header control, the drawer link, the home page's "I know what I need"); `/` and Ctrl+K (⌘K) reach its `openSearch()` through the site's one keyboard handler (`matchShortcut`'s `search` action), which skips fields and open dialogs; shows the shortcut setting on the openers and follows it; imports `search.ts` the first time the reader asks, or when a result has just opened the page. That first time it opens the server-rendered `<dialog>` itself and focuses the field at once, so no key is lost while the script loads; `<st-search>` then takes the open dialog over and searches what was typed, and if the script cannot load, the search page opens with the text as `?q=` (review pass 21, major 1). It shares no module with `search.ts`, so it adds no chunk of its own, and its `import()` has no Vite preload wrapper (`scripts/search/plain-import.ts`). |
| `src/scripts/search.ts` | `<st-search>`, the dialog, imported on demand: opens and closes it, returns focus on close, and on arrival from a result focuses and highlights the target. |
| `src/scripts/search-ui.ts` | The results, imported when the dialog first opens, together with MiniSearch. |
| `src/scripts/search-page.ts` | `<st-search-page>` (the search page) and `<st-search-suggest>` (the 404 page). |
| `src/scripts/search-render.ts` | The DOM of one result, shared by all three. `createElement` and `textContent` only: result text is never parsed as HTML. Also `searchSettings()` (WP-30's `shortcuts` and `lowData` stores, with `prefers-reduced-data` as a second reason for low data) and `searchTranslator()`, a small translator for the serialised search strings that a test holds equal to `t()` for every string and count: `createTranslator()` would have put the translation core into the `i18n` chunk every page loads (0.5 KB on each). |
| `src/styles/search.css` | Result and highlight styles, global because the script builds the results. |

**Pattern.** The field is an ARIA 1.2 combobox that owns a listbox. Focus stays in the field; the up
and down arrows move `aria-activedescendant` (wrapping), Enter opens the active option or the first
one, and Escape closes the dialog in one press, even with text in the field (the field's own
clear-on-Escape is overridden, because the instructions promise "Press Escape to close search").
Enter acts on what the reader sees and never starts a different search: with the list for the text
in the field on screen, it opens the active option or the first one (`SAPS 60` opens SAPS 601, the
first option, even though the code is not typed in full). An option the reader highlighted with an
arrow key always wins, even in a list from before the last key press. Only with no option
highlighted and a list that belongs to older text (Enter before the debounced search has run, while
the index loads, or before the results code itself has loaded) does it wait for
the search of the current text, the same search the live list runs, and open its first result. If
the dialog closes, or the text changes, before that search answers (the first search can wait for
the whole index), the Enter is cancelled and nothing opens. If it finds nothing, the one Enter goes to
`/search/?q=`, as it does when the results are already on screen. If the results code itself cannot
load, the failed state shows and the status line says "Search could not load." (the page renders the
sentence on the status line as `data-failed-text`, because the eager script has no translator), and
Enter then submits to `/search/?q=`, a fresh page that works. Results are grouped by section, each group a `role="group"` named
"Results in {section}" (`search.groupLabel`) with a visible, `aria-hidden` section name. Groups follow
their best result, and the dialog shows at most three results per section, so one busy section (the
glossary, the checklist and the register are all "Look it up") cannot push the second-best result far
down; "See all {count} results on the search page" (`search.seeAll`) links `/search/?q=` for the
rest. Each option is
an `<a role="option">` with a real `href`, so a middle click or "open in new tab" still works. Inside
an option: the title, then "page › heading" and the kind ("Glossary", "Checklist item"), then a short
excerpt. The option's name is the title alone (`aria-labelledby`) and the rest is its description
(`aria-describedby`), so arrowing through the list reads one short name per option; matched words are `<mark>` (`--st-mark-bg`, verified with `--st-text` at 14.28:1 and 7.36:1).
An English result on an Afrikaans page carries `lang="en-ZA"` on its English text and a visible
"Engels" tag. The active option has the focus ring (`--st-focus`), not only a tint.

**States.** Empty (the common questions), loading, results
with a count ("3 of 30 results shown", `search.resultsShown`, when the per-section cap hides some),
no results (the common questions stay, with the contents link) and failed (the sentence once, in the
status line, and the contents link). The status line is the live region for all of them. It is
never `display: none`: empty, it is only visually hidden, so it is in the accessibility tree before
the first count arrives.

**Loading** (WP-50a). The status line says "Loading search…" from the moment the dialog opens
until the index has arrived: `search-boot.ts` says it while the dialog's own script loads (from the
status line's `data-loading-text`, because it has no translator), and the results code keeps saying it
while the index it starts fetching on opening downloads (unless low data is on: then on the first key).
With nothing typed the common questions stay under it, as the way on; once a query is typed they are
hidden until its results come, so they never stand under the query as if they were its results. A
query typed after the index has arrived says "Loading search…" only if it takes more than 150 ms. On a
slow phone the index took 8 to 11 s, and the dialog had said nothing (WP-50 audit, flow 3).

On `/search/` the same holds: the results region is never hidden, only its
heading until there is a query.

**Queries.** One table says how every kind of query term is matched, and the code follows it: the
rule for a single term is `matchRule()` in `src/lib/search/options.ts`; the same file writes amounts
and tax years one way (`tokenize()`, `foldTerm()`, used both when the index is built and when a
query is read) and splits a query into parts (`queryParts()`); `queryTree()` and
`runSearchCounted()` in `src/lib/search-client.ts` turn the parts into the search.
`tests/unit/search/index.test.ts` ("the query-kind table") runs one or more queries per row on both
real indexes, English and Afrikaans. "Last" below means the last term of the query while the reader
is still typing it. The live dialog is typing when the field ends inside a word, and Enter in the
dialog opens what that list shows. The search page (`/search/?q=`) and the 404 suggestions search a
finished query, so `R1` there is R1 and never R146.

| Kind | Example | Rule | Why |
| --- | --- | --- | --- |
| Word | `PIS`, `omsetbelasting` | prefix from 2 letters; fuzzy 0.2 when longer than 4 letters | A7: prefix and fuzzy matching stand in for stemming in every language, and catch typos (`belastng`). |
| Partial word | `notion` | the same rule: prefix | The reader is typing; `notion` must reach `notional`. |
| Single letter | `e` (in `e-filing`) | exact | A one-letter prefix matches nearly every term. |
| Code, joined | `VAT264`, `SAPS604`, `ITR14` | never fuzzy; prefix only while last | One edit is another form (`EMP501`/`EMP201`, `ITR14`/`ITR12`, `SAPS604`/`SAPS601`). Prefix while typing lets `VAT26` reach `VAT264`. |
| Code, spaced | `VAT 264`, `vat 264`, `VAT 15%`, `brand 5`, `under 100` | two readings: the joined form by the joined-code rule, and both words, each by its own rule. When the joined form names a glossary or "Words used" entry (a known code: `VAT264`, `SAPS601`, `EMP201`), its reading comes first; otherwise the two readings are merged by score | Never finds less than the two words as ordinary terms, and ranks exactly as the joined spelling when that is a known code (`VAT 264` = `VAT264`). An incidental pair is not a code: `VAT 15%` puts the VAT glossary entry first, as `15% VAT` does, not the template rows that print "VAT 15%". |
| Code, spaced, being typed | `SAPS 60`, `VAT 26`, `EMP 20` | as above; the joined form is prefix-matched because the number is last, and a code it reaches is a known code | Both spellings reach the same form while it is typed (`SAPS 60` and `SAPS60` both list `SAPS601` first), and Enter opens it. |
| Code with a typo | `VAT246`, `EMP502` | the joined-code rule: nothing is found | A near miss is a different form, so "nothing found" is the honest answer; the reader can try the spaced form. |
| Rand amount | `R500,000`, `R500 000`, `R 500 000`, `R500000` | one spelling at index and query time (`r500000`): thousands separators and the spaces between groups of three go; never fuzzy; prefix only while last with at most three digits | South Africans write amounts all four ways. Two edits turn `R500,000` into `R200,000`, a different amount; `R500000` must not reach R50 million. `R50` while typing reaches `R50 000`. |
| Rand amount, decimal comma | `R2,3 miljoen`, `R2,3` | a comma with one or two digits after it, at the end, is a decimal point: `R2.3` | The Afrikaans way of writing `R2.3`; a comma before exactly three digits stays a thousands separator. |
| Rand amount, in millions | `R1,000,000`, `R2 300 000` | `R1 million`, `R2.3 miljoen` in the guide also index `R1000000`, `R2300000`; a match through that alias marks the amount and its word | The guide writes millions in words; a reader may type the digits. |
| Rand amount, in millions, short | `R1m`, `R10m`, `R2.3m`, `R2,3m` | read as `R1000000`, `R10000000`, `R2300000`, at index and query time | The usual shorthand; it finds what `R1 million` finds. |
| Number, year | `2026`, `14.3`, `2` | exact | A value, not a stem: `2` is not `20`, `2026` is not `20261`. Lone numbers are left out of the any-word results. |
| Tax year | `2026/27`, `2026-27`, `2026/2027` | a four-digit year, then `/` or a hyphen or dash, then the next year's two digits, becomes both full years, at index and query time | The guide writes `2026/2027`; readers and SARS write `2026/27` and `2026-27`. `2026/03` (a year and a month, or a path) is not a tax year and stays as written. |
| Hyphenated word | `BTW-registrasie`, `VAT-registered`, `e-filing` | its words (each by its rule) or the whole chain joined; the joined form is prefix-matched only while last and never fuzzy | Must find at least what the spaced words find, also while typing (`e-fil` reaches `efiling`). The index holds the joined alias (`efiling`). |
| Hyphenated word with stop words | `pay-as-you-earn`, `in-house` | its words without the stop words (`pay`, `earn`; `house`), or the whole chain joined (`payasyouearn`) | A stop word inside the chain must not lose the chain: `pay-as-you-earn` finds PAYE, `in-house` finds what `house` finds. |
| Afrikaans compound | `kontrolelys`, `belastingjaar` | the word rule | No stemmer exists for Afrikaans (ADR 0003): prefix and fuzzy matching do that work. |
| Stop words | `the`, `die`, `op` | dropped; one before a number is not a code (`on 1 March` keeps the `1`) unless written in capitals in a query that is not all capitals (`IT 12 form`) | They carry no meaning for search; a date is not a code. |
| Punctuation | `"PIS"?!`, `R120,000`, `14.3` | separates terms, except `.` and `,` between digits (amounts and numbers stay whole) and a hyphen (above) | Amounts and section numbers are single values. |
| Mixed | `Companies Act 71 of 2008`, `tax year 2026/27`, `EMP201 deadline`, `VAT rate 15%` | each part by its own row, then all words first, any word after (below) | One query may hold words, codes, numbers and years; each keeps its rule. `EMP201 deadline` lists the one page that names both, then the EMP201 glossary entry and the sections that give the date in other words. |

**All words first, then any word.** Every query lists the results that match every part first,
best first, and then, always, the results that match some of the words, best first. The any-word
results take every word of every part (a spaced code gives its joined form and its words, a
hyphenated word its words and the whole chain) and leave out lone numbers and single letters, so a
junk query (`zzzzqq 1`) and a code with a typo (`VAT246`) still say "nothing found" instead of
listing every "Prompt 1".

**A query that names a page leads with that page.** A page has two titles: the one in the
navigation and the contents (the manifest title, "How this was made and how to check it") and the
H1 it shows ("AI disclosure"). Every entry's breadcrumb holds the navigation title, and the first
entry's also holds the H1; the boosted heading field holds only the entry's own heading, so a page
title never lifts an overview page above the template asked for (`quote template` opens the
Quotation template). A page title lifts a page only through this rule: when every word of the
query is a word of one of the two titles, and the query covers more than half of that title's
words, the page's first entry leads: `AI disclosure`, `KI-openbaarmaking`, `how this was
made`, `marketing prompts`, `tax and sars`, `you are the business`, `what changed`, `verander`.
Stop words do not count, nor do `has`, `have` and `had` (as `het` does not), so both languages count
alike. A word counts whole: `change` is not "changed". Only the last word, while it is still typed
and from four letters, and only after another word as typed, may be the beginning of one
(`marketing prom`, `you are the busine`, `wat het verand`, `KI-openb`); `ve`, `ver` or `verande`
alone names nothing. After a stop word only, the last word counts as typed only when it is not
itself a whole word of the guide: `my belasting` is the finished word "belasting" and opens Tax and
SARS, not the template headed "Belastingfaktuur". One word of a two-word title (`disclosure`, `AI`, `check`) does not name
the page. When two pages qualify, the one the query covers most leads, then the first in reading
order (`Start here`: the guide's own, then the Core section's). A test asks every page's titles,
in both languages, typed and finished, for its page.

**Headings before text, and written words before typos.** Within the results that match every word,
an entry whose own heading holds every word as written (whole words; the last word's beginning while
it is typed, from four letters; never a typo match) comes before one that holds them only in its
text (`BTW-registrasie` opens "VAT: probably not yet" before the tax invoice template). When no
result holds the words as written, because the reader misspelt one, the heading lift reads them as
the search does, typos included: `cipc anual return` opens "1. CIPC annual return", `voorlopige
belastnig` the provisional tax section. Among the rest, a result that needs a typo match for a word
counts half its score against those that hold every word as written: `market stall` lists the retail
page's "Do you need a licence" ("market stalls need a trading permit") before Marketing prompts'
"small businesses". "As written" is the word itself, the word with a short ending (`s`, `d`, `ed`,
and `es` after s, x, z, ch or sh: "stalls", "registered", "taxes"), or any longer word the last word
begins while it is typed. A finished word that a dropped letter has turned into the beginning of
another word is a typo: `registr` is not "registration", `compani` is not "companies", so `registr
for vat` opens Tax and SARS and `register a compani` the Register page. The short-ending rule was
chosen over "only the last word while typed" because a finished `market stall` must still count
"stalls" as written. `pnpm search:typos` counts, over every glossary term and page title in both
languages, how many one-letter typos open the correct spelling's first result.

**Filler words, whole words and questions.** The ranking drops the best bets' filler words
(`want`, `need`, `can`, `get`, `must`, `looking`, `find`, `show`, `send`, `give`; `wil`, `moet`,
`nodig`, `kry`, `hê`, `soek`) as it drops stop words, from the all-words query, the title rule and
the heading lift alike: `I want to close my business` ranks as `close business`, and `ek wil 'n
faktuur hê` as `faktuur`. Law words are filler too, unless the query is an Act's name (`law`,
`laws`, `regulation`, `regulations`, `by-laws`, `rules`, `says`, `about`; `wet`, `wette`,
`regulasies`, `reëls`, `verordeninge`): `tax law` opens what `tax` opens, `regulations for food`
what `food` opens (review WP-33 pass 19, major 4). A bare law word is the whole query, so it stays,
and the bare nouns that matter have best bets (`by-laws`, `verordeninge` → "The general rule").
`se` is not filler: `maatskappy se naam` and `my besigheid se naam` are best bets instead (pass 19,
major 5). `oor` ("about") is filler, like `about`. A filler word with a diacritic counts as written
when folding would make it a word the guide uses: the verb `sê` ("say") is dropped before the query
is folded, while the possessive `se` stays a content word, so `wat die wet oor btw sê` opens what
`btw` opens (pass 19b). `hê` and `reëls` fold to nothing the guide writes, so `he` and `reels` count
as filler too. For the same reason stop words are compared as written: `hoë` ("high") is a word, not
the stop word `hoe`; `dié` and `óf` are listed as stop words of their own. A filler word stays when it is the whole query (`need`), and while it is the last word
being typed if it has three letters or more and is not itself a word of the guide (`can` may become
"cancel"; `hê` may not; `sars law` drops `law` while typed, because "law" is a whole word already).
A heading that holds every word of the query as written, filler words included, comes before every
other lifted heading: `how do i get a brnc` opens "How to get the BRNC", `do i need a tagline` "Do
you need a tagline?", while a heading that only happens to say "I need" is lifted only when the
owner said "I need" too. A heading also holds a query word's plural (`kleinsakekorporasie`,
"…kleinsakekorporasies").

American spellings read as the guide's South African ones, in the index and in a query
(`SPELLINGS` in `src/lib/search/options.ts`: `license` → "licence", `color` → "colour", `center` →
"centre"; only words whose en-ZA form the guide uses). A word the guide itself holds is never read
as a typo of another word: `deregister` is not "register", `deregistreer` not "registreer"; its
singular still counts, at a fifth of its weight (`expenses` finds "Route 2: claim every real
expense"). A page about one moment in a business's life weighs half (`MOMENT_WEIGHT`) in a
query that does not name that moment: "Closing as a sole proprietor" lists every registration to
cancel, so without the word `close`, `stop`, `sluit`, `toemaak` or the like, `licences` opens What
you need to sell things, `sars act` Tax and SARS and `deregistreer my maatskappy` the company's
closing section (post-WP-50a review pass 1, minor 2). A word for a company (`pty`, `ltd`,
`company`, `maatskappy`) keeps the half weight even with a closing word (`close my pty ltd` opens
the company's closing section), and a closing word with a sole proprietor's word (`sluit my
eenmansaak`) weighs the page double (pass 2, minor 1). The sources register weighs half (`REFERENCE_WEIGHT`) in a query that does not ask for
sources (one whose last word is not a source word): it repeats every topic's words in its headings ("Vehicle dealing and vehicles
generally"), so it no longer leads a typo of `vehicle dealer`. A query that ends with a word that
only means "source" (`SOURCE_WORDS`: `source`, `sources`, `bron`, `bronne`) keeps it at full
weight (`tax source`), and so does one where a source word is followed by `for`, `on`, `about`,
`vir` or `oor` (`sources for tax`, `bronne vir btw`; `SOURCE_FOLLOWERS`, pass 20, major 1). Such a
query leads with the register's own entry on the subject (the words after `for` or `vir`): the
entry whose heading holds them ("Tax and SARS" for `where are the sources for tax`; from seven
letters a word may end differently, so `sources for licence` opens "Business licensing"), otherwise
an entry whose heading holds the subject inside a compound word, as Afrikaans writes it (`bronne vir
kos` opens "Kosbesighede", `bronne vir lisensie` "Besigheidslisensiëring"; the beginning of a word
from three letters, the inside from five; pass 2, minor 3), otherwise the first register entry
that holds every word of the query (`bronne vir logo` opens "Branding
tools referenced", not "What is in this toolkit"; post-WP-50a review pass 1, minor 2). One
where the word is a verb or part of another phrase does not (`where do i source stock`, `source of
income`; pass 19, minor 3); `where does
this come from` and `waar kom dit vandaan` are best bets, matched as whole phrases, so `come up
with a name` and `official name` are not source queries. A query that is exactly an Act's name, its
words in order and nothing between them, optionally followed by `act` or `wet`, a number and a
year (`companies act`, `companies act 71 of 2008`, `maatskappywet`, `wet op maatskappye`), opens "Legislation this toolkit relies on", the register entry that lists every
Act. The names come from the register's own data (`src/data/<lang>/sources.json`) plus the short
names, Afrikaans titles and short forms in `content-meta/search-act-names.json` (`ohsa`, `nca`, `bee
act`, `wet op beskerming van persoonlike inligting`); a generated test asks every one, finished and
typed, in both indexes. A law word alone (`law`, `act`, `regulations`, `regulasies`, `employment
law`, `what the law requires`) is not an Act name, and neither are the same words in another order
or with other words between (`act for a company`, `can i act as a company`, `act on credit`), so
the guide's own section leads (review WP-33 pass 18, major 2; pass 19, major 3).

A section whose whole heading, of two words or more, is in the query, and names more than half of
the query's words, is lifted next, after a heading that holds every word with filler: the task
phrasing of a term opens the section on it (`how do i pay provisional tax` → "Provisional tax",
not the "Provisional taxpayer" definition), but `sole proprietor bank account` is not "Sole
proprietor". Among several, the one that names more words comes first, then rank order (pass 19
removed a tie-break against business-type pages; where it mattered, a best bet now decides). A "Words used"
definition opens the section of its page where the word is used, which may be about something
else, so lifted sections come before it. A heading that is the query word for word, stop words
included, comes before the other headings of its own page (`Wat ingesluit is`, not "Wat NIE
ingesluit is nie").

A query asked as a question (two or more stop words: `do i need an audit`, `how do i name my
business`, `what must my invoice show`; filler words do not count, so `my besigheid se naam` is not
one) leads with the quick answer whose question holds
all its words, filler included, the most covered first. That answer comes before a best bet for
one of the words (`invoice`) and before a page named only by the words left once filler is
dropped ("Invoice"); a page named by every word (`hoe dit gemaak is`) still leads. "What is" plus a
glossary term or the alias in its brackets, filler words counted (`what is the small claims
court`, `what is a pty ltd`, `wat is 'n eenmansaak`), is a definition, not a question: the
glossary entry leads, before a page, a section or a best bet on the subject. A test asks it for
every glossary term in both languages. The fixed acceptance set in
`tests/search/acceptance-queries.json` holds the owner queries these rules are measured against
(`docs/testing.md`).

**Best bets.** A short table, `content-meta/search-best-bets.json` (documented in
`content-meta/README.md`), maps common owner phrasings to the page that must come first, whatever
the ranking: `register my business` and `registreer my besigheid` open Register, `tax` and
`belasting` Tax and SARS, `checklist` and `kontrolelys` the Master checklist. A phrase matches the
whole query (stop words dropped) or its typed last word from four letters; never a typo and never a
longer query, except filler words (`register my own business`, `registreer 'n nuwe besigheid`).
Ranking still answers the rest. Page keywords (`content-meta/search-keywords.json`) add owner words
a page's titles lack to its first entry's heading field (`register business` on Register, `tax
return` on Tax and SARS). A quick answer carries its page's lead in a field with a quarter boost,
and counts as matching every word only when its question or targets hold them; a quick answer that
matches only through the lead ranks with the any-word results (`do i need a company` lists the
Register sections, not "What does a Pty Ltd cost me every year?"). A glossary entry still leads a
one-word query that is only part of its term (`tax` → "Dividends tax") when no best bet covers it:
giving the glossary weight only to whole-term queries would also stop `notion` from opening
"Notional input tax", so it is not done.

**Pages about the guide.** "How this was made" (with its corrections log) and "What has changed"
weigh a quarter in every search (`DOC_WEIGHT`), and their headings are not moved before the text
of other pages: the changelog's headings name other pages ("02 Register - what you actually need"),
so `register`, `name` and `branding` open their topic. An entry of theirs that holds the words only
in its text ranks with the any-word results: the corrections log names many topics next to
"deadline", and `PAYE deadline` opens the PAYE entry. Asked for by a title, they lead like any page.
`AI generated` is not a title, and also a branding question: the branding section on AI-made work
leads, with the disclosure further down the first ten.

The count of results that match every word is the block listed first. At most 12
terms are searched (the fields take at most 200 characters). Counts are true totals, with how many
match every word when the others match only some: the dialog says "12 of 375 results shown (24
match every word)" (`search.matchedAll`) and "See all 375 results on the search page", and the
search page lists all of them; only the dialog's list stops at 30. "See all" for a list found while
the last word was still being typed carries `typed=1`, so the search page runs the same search and
lists what the link promised (`VAT26` reaches VAT264 there too); a search submitted on the page
itself is finished.

**Filter chip: "My business types"** (B3 flow 3, built at the WP-31 merge). A reader with saved
answers from Find my path sees one chip under the field, a toggle button (`aria-pressed`, a check
mark and bold text when on, not colour alone). On, the dialog keeps only results for their business
types (`profileBusinessTypes()` from WP-31's profile store, General expanded) and results for every
type (`SearchOptions.businessTypes`). It starts off on every open and is hidden without a profile.
Section chips are not built: the grouping by section and the search page already cover them.

**Choosing a result.** On another page: the script remembers the target in `sessionStorage`
(`st.search.arrival`, through `src/lib/storage/session.ts`, removed on the next page load; the
page-load check is `session-flag.ts`, which only asks whether a value waits) and the destination
loads the dialog script, which focuses the heading and
gives it `.st-search-target`, a two-second `--st-mark-bg` fade; with `prefers-reduced-motion` it does
not fade and the class is removed after the same two seconds. On the same page: no load, the hash
changes and the heading takes focus. Focus does not go back to the opener then.

**Weight.** A page loads only `search-boot.ts` (about 0.6 KB gzip inside the page's shared
script) and the dialog markup. Its one `import()` is plain: a build plugin
(`scripts/search/plain-import.ts`) removes Vite's preload wrapper, whose helper chunk (0.75 KB) was
the largest piece of search on a document page; the dialog script's own imports are on the page
already. The dialog script, the results code and MiniSearch (27.6 KB gzip, shared chunks counted
once) and the index
(167.5 KB gzip in English, 185.0 KB in Afrikaans) are fetched when the dialog first opens; with low
data, the index waits for the first key press. The dialog scrolls as a
whole, with the title and field sticky at its top: a scrolling box that held only the results,
whose options are not Tab stops, would be a region the keyboard cannot scroll.

### Interactive pieces (WP-30)

Every piece follows plan C2: a vanilla custom element wraps markup Astro already rendered, its
constructor does nothing, `connectedCallback` reads the store and wires listeners,
`disconnectedCallback` removes them, and keyboard use is the native control's (buttons, checkboxes,
radios, links, `<dialog>`). The only markup a script adds is text: the copy button's label and the
status lines. Each piece works, or is absent, without JavaScript: `tests/e2e/nojs.spec.ts`.

| Element | Script | Rendered by | What it does | Without JavaScript |
| --- | --- | --- | --- | --- |
| `<st-checklist>` | `checklist.ts` | `TaskListBlock` | Wraps one `<fieldset>` of checkboxes. A box the reader changed before the module connected (it is clickable from first paint) is saved as the reader's choice, not overwritten. A tick writes the `checks` store under the box's `data-task`: the task id, or, for a document task that repeats one on `/checklist/`, the master task's id (`sameAs`, from `content-meta/task-links.json`). So a linked task is ticked in both places, and the Afrikaans twin and other tabs follow; a task that is not linked keeps a tick of its own. Honours the `/checklist/` filter. | The boxes tick; one line says ticks are not saved (`.st-tasklist__no-js`, `.no-js-only`). |
| `<st-checklist-progress>` | `checklist.ts` | `TaskListBlock`, `ChecklistSummary`, `ChecklistElsewhere` | "3 of 7 done" for the ids in `data-tasks`, from `data-template`; fills a `<progress>` (`aria-hidden`; the text says it), a `[data-progress-text]` and a `ProgressRing` (its `aria-label` too). `data-complete` when all are done. | `.js-only`: a count that cannot change would be wrong. |
| `<st-checklist-tools>` | `checklist.ts` | `ChecklistSummary` | `/checklist/` only: the "Show" radios (Everything / Not done yet) and "Remove ticks", which asks in a `ConfirmDialog` and then says "All ticks were removed." in a polite status line. "Not done yet" hides what is ticked **when it is chosen**; a box ticked afterwards stays put, so focus never vanishes. A choice the browser restores (Back, a reload that keeps form state) is applied when the element connects. "Only what applies to me" (WP-31) is a third choice, shown only with a profile. | Hidden with the summary. |
| `<st-storage-notice>` | `storage-notice.ts` | `TaskListBlock` (first checklist), `Settings` | Rendered `hidden`; shown while `storageAvailable` is `false`. A warning `Callout` with the right `storage.*` / `checklist.storageUnavailable` text. With `data-show="available"` it is the opposite: the "Ticks are saved on this device only" line wraps itself in one, so it goes when the warning comes and the page never says both. | Stays hidden. |
| `<st-copy>` | `copy.ts` | `CodeBlock` (prompts only) | Shows its `hidden` button. Copies the prompt's `<pre>` text exactly, says "Copied" with a tick in place of the copy icon for two seconds and "Copied: Prompt 2: logo brief" in its `role="status"` line; if the clipboard refuses, selects the text and says how to copy it. Records the prompt in `promptsCopied` (`<doc id>#<block id>`). The button's visible text is `prompts.copy`, its name `prompts.copyNamed` ("Copy prompt: Prompt 2: logo brief"). A prompt is named by the heading above it, which carries the guide's own numbering; when one heading has several prompts, `prompts.titlePart` adds which one ("… (prompt 1 of 2)"). A count in page order named the prompt under "Prompt 0" "Prompt 4" (WP-50a). | No button. The text is all there and copyable by hand. |
| `<st-toc>` | `toc.ts` | `TableOfContents` (both variants) | `display: contents`. Scroll-spy: the link to the last heading that has passed the scroll-padding line gets `aria-current="location"` (a stripe and weight, never colour alone). The current section is the heading lowest on the page that has passed that line, so a list in another order than the page still names the right one, and a closed "Words used in this file" is never a section (WP-50a review pass 2, m2). Below 1280px a sticky "Now reading" pill names it once the list has scrolled away. The pill hides only while a heading's box overlaps the pill's own measured box, from the scroll-padding line down: a heading a contents link has just put there, or one coming up under a tall pill. It comes back once that heading has moved 16px on, and a one- or two-line pill ends above the line, so it does not hide at all (review pass 1, M3; pass 2, M3: hiding whenever a heading was on screen made it blink on and off between short sections); the label and the title run as one line of text that wraps, never cut off with an ellipsis (house rule 8), so most titles take one line at 320px and nearly all two, and the longest Afrikaans heading (135 characters) takes five; it links back to the list and opens it, and its name says so (`nav.currentSectionLabel`: "Now reading: Tax basics. Open the list of sections."). No smooth scrolling of its own; the pill's fade is a keyframe animation, which `base.css` finishes at once under reduced motion (see [Motion](#motion)). | Plain anchors; no pill. |
| `<st-setting>` | `settings.ts` | `Settings` (`/about/`) | One `role="switch"` checkbox bound to `shortcuts` or `lowData`. A switch changed before the module connected is kept and saved. While `SEARCH_AVAILABLE` is off the help lines use the `…Static` strings, which do not mention `/` or loading search. | Hidden; one line says some tools need JavaScript. |
| `<st-clear-data>` | `settings.ts` | `Settings` | "Clear all my data": `ConfirmDialog`, then `clearAll()` and "All your data was removed from this device." | Hidden. |
| `<st-lang-banner>` | `lang-banner.ts` | `LangBanner` (English home only) | Shown from the first paint, so it never shifts the page: `theme-init.js` sets `<html data-st-lang-offer>` when `st.lang` is not the page's language, a CSS rule per language shows the banner whose `data-locale` matches it, and the element keeps it in step with the store. It is set in the device font (`--st-font-body` points at `--st-font-body-fallback` inside it), so the web font arriving cannot change its height: in the web font its buttons moved to another line when the font swapped in, a layout shift of 0.144 at 360px (WP-50a). Shown while `st.lang` is a language other than the page's: the message and actions in **that** language, with its `lang`. "Gaan voort in Afrikaans" is a plain link (never a redirect); "Stay on this page" saves the page's language; close hides it for this page view. Focus moves to `<main>` when it goes. A saved value that is not an enabled language shows nothing: the first-paint rule is per language. | Not shown: `theme-init.js` sets the attribute that shows it, and it needs JavaScript too. |
| `<st-template-form>` | `template-form.ts` | `TemplateTool` | Binds a template's form to its draft (`st.template.<slug>.v1`), fills the A4 preview (dates in words, amounts with `formatRand`), works out line amounts, subtotal, VAT and total in an `aria-live` region, and counts the required items ("12 of 20 required items present", with a link to each one missing). Print calls `window.print()`; Start next keeps business and bank details and increments the number; Clear asks in a `ConfirmDialog`. A value typed before it connected is kept. The only markup it writes is the preview's list items, one per line the reader typed. | The form is the printable sheet; no preview, tabs, totals or buttons. The same until the element is ready (`data-enhance`). |
| `<st-theme-toggle>` | `theme-control.ts` | `ThemeControl` | Now on the `theme` store; the module applies the store to `<html>` and the theme-color metas whatever changes it (a toggle, another tab, clear my data). | As before. |
| `<st-lang-switch>` | `navigation.ts` | `LanguageSwitcher` | Also saves the language followed in `st.lang`. | Plain links. |

`ConfirmDialog` (`src/components/ui/ConfirmDialog.astro`, script `confirm-dialog.ts`) is the one
dialog pattern: a native modal `<dialog>` named by its heading and described by its body, buttons in
a `<form method="dialog">` (the browser closes it and sets `returnValue`), the safe choice first and
focused, Escape counts as cancel, and focus returns to the control that opened it.

Shortcuts (`src/lib/shortcuts.ts`, handled in `src/scripts/site.ts`, loaded by `Page.astro` on every
page): `?` goes to the list on `/about/` (the page's `<link rel="help">`, focusing its heading when
already there), Alt+← / Alt+→ follow the pager's `rel="prev"` / `rel="next"` and leave the key to
the browser when there is no pager, Escape closes an open "On this page" list (dialogs and the top
bar menus already close on Escape). Nothing fires while focus is in a text field, a select or
editable content (`isTypingTarget`) or while a `<dialog>` is open, and `?` and `/` only while single-key shortcuts are on. `/` and
Ctrl+K (⌘K) are the `search` action since the WP-33 merge: the same handler calls
`openSearch()` from `src/scripts/search-boot.ts`, and leaves the key to the browser on a page with no
search dialog. Their rows appear in the `/about/` table when `SEARCH_AVAILABLE` is on.

Low data: the `lowData` store sets `<html data-low-data>`, which `tokens.css` already maps to the
system fonts and no pattern. `theme-init.js` applies it before paint from `st.lowData`, and then
skips the font preloads (WP-50 Phase 2; see [Typography](#typography)).

### Fillable templates (WP-32)

A template document (`kind: 'template'`) renders through `Doc.astro` as usual: breadcrumb, AI notice,
translation notice, "An AI checked the legal rules for what this document must show on {date}",
sources and pager. What changes is the middle. `parseTemplate()` (`src/lib/templates/placeholders.ts`)
splits the blocks at the template's two `---` rules: the text **before** (how to use it, the rules
to follow) and **after** ("The seven things a full tax invoice must show") render as on any document,
so **every rule a reader is shown comes from the markdown**; the template itself becomes
`TemplateTool`. One block is the exception: the markdown's italic note for the file ("Make a copy, rename
it to the invoice number, replace everything in [SQUARE BRACKETS], then export to PDF") is not
shown above the form, where it sent readers looking for a file to copy (WP-50 audit, flow 5). `formIntro()`
(`src/lib/templates/intro.ts`) puts a line about the form in its place, from
`templates.items.<slug>.formHowTo`, in the language of the template's text; the tax invoice has no
such note and no line. The note stays in the document view (`TEMPLATES_FILLABLE` off). The lead and
meta description come from `doc.summary`, which for the quotation, receipt and privacy notice was that
same note; those three now have summaries in `content-meta/docs.meta.json`, in both languages, that
describe the document, not the file (review pass 1, M4). `tests/content/validate.test.ts` fails on a
template summary with the copy instruction or a `[`. The page has no contents list: its headings are the form's groups, which carry the
heading ids, so `#to` or `#payment-details` still lands on the right part.

| Piece | File | Notes |
| --- | --- | --- |
| Parser | `src/lib/templates/placeholders.ts` | Pure. Every `[PLACEHOLDER]` and every sample written as text (`QUO-0001`, `R 0.00`, `4XXXXXXXXX`) is a field. Names come from block ids and positions, so the Afrikaans template gives the same names and a draft opens in either language. Labels are the template's: a table row's label, a placeholder that stands alone, or the sentence around a slot with `…` in its place. Business details carry a `profileKey` and are named by the dictionary (`templates.fields.*`) unless the template names them itself (`Information Officer: [Your full name]`). Optional: the nested `[If a company: …]` line and an instruction placeholder in running text. A paragraph with no slot is text in its group, so the form is the whole document. |
| Totals | `src/lib/templates/totals.ts` | Whole cents. Line = quantity × unit price, rounded once; VAT at the template's own rate (`VAT @ 15%`) on the subtotal, rounded once; an empty quantity counts as 1, as the templates write. `readNumber` takes `1500`, `1 500`, `1,500.50`, `1 500,50`, `1.500,50` and `1,500,000`, and **refuses** what could be read two ways (`1.500`, `1,500`), more than two decimals in an amount and text, each with its own message. Limits: an amount, unit price or line amount at most R 1 000 000 000.00, a quantity at most 1 000 000, so `formatRand` can never throw on what was typed. While a used line cannot be read the totals stay blank and the form says why. |
| Draft | `src/lib/templates/draft.ts` | `st.template.<slug>.v1` through `persistentValue`. Holds only what differs from the defaults; an empty draft removes the key. The schema is lenient by entry: a bad value or line is dropped and the rest kept, and `dropOutOfRange` drops an amount over the limits when the form opens. |
| Form | `TemplateTool.astro`, `TemplateField.astro`, `TemplateLines.astro` | Groups are fieldsets in the template's order ("Your business", "Document details", then one per heading). No `required` attribute and no submit: validation is soft. `autocomplete` on business fields only. `MAX_LINES` (10) line rows are rendered; rows past the template's own are opened by "Add line". |
| Preview | `TemplateSheet.astro`, `SheetRuns.astro` | The template's own layout with a `<span data-field>` per slot. An empty slot has **no text**: the template's words are only `data-sample`, shown on screen by a `::before` highlighted with `--st-mark-bg` and printed as a blank line to write on, so a sample such as `R 0.00` or `INV-0001` never reaches paper. An optional slot shows nothing. A slot that is all instruction prints under a label from the template's words ("Customer VAT number: …"). Every paragraph of template text except signature lines has a "Leave this out of the document" box. `SheetRuns.astro` is in `.prettierignore`, and writes text runs itself (through `Inline` they printed "50 %"). |
| Element | `src/scripts/template-form.ts` | `<st-template-form>`; see the table above. |

Layout: `st-template-form` is a size container. At 52rem and wider the form and the preview sit side
by side; narrower, "Fill in" and "Preview" are ARIA tabs (arrow keys, Home, End), and the element
adds the `tabpanel` roles only while the tabs are on screen. Until the element is ready the tab strip
keeps its room but is `visibility: hidden` (no taps, no focus), so the form does not move when the tabs
appear. Required items, the actions and the
clear dialog follow. Template pages drop the contents column at 1280px so the tool has the room.

**Conditional items.** A slot the template words as conditional shows the template's condition
instead of "(optional)". When the condition has an amount ("required on invoices over R5,000") the
item joins the required items once the total is above it. The count says it checks only that items
are filled in, not that the document is correct ("Every item this form checks is filled in."). An
amount or number the form refuses does not count as filled in. An instruction slot with no
condition ("State your late payment terms here.") is required, so no slot says "(optional)" unless
the template's words make it so. Every text control has `maxlength` equal to the draft's per-field
limit (5 000 characters), and a longer value in an old draft is cut to the limit, never dropped.

**Printing.** Exactly one sheet prints. The form carries `data-print-sheet` in the HTML; the
element moves it to the preview when it connects (and back when it disconnects). So the preview
prints with JavaScript, at the page's full
width (`print.css` turns the sheet's ancestors into plain blocks, or the document grid's sidebar
track squeezed it into 272px). With the tabs on "Fill in" the preview still prints. Without
JavaScript the preview is not shown and the **form** is the sheet: it also carries
`data-print-sheet`, prints the title, labels, values on ruled lines, the template's text and blank
totals to write in, and a line under the notice says to use the browser's Print command.

On paper the sheet is in **sections**, one per heading of the template (and one for what comes
before the first heading). Each section is a plain block with `break-inside: avoid`, so a heading
stays with its text, a details table or the signature lines never split across two sheets, and a
section whose text is all left out ("Leave this out of the document") goes with its heading.
Chromium does not keep a grid item or a table inside one together, which is why the sheet is not a
grid in print. A section taller than a page can still break. The print leading is 1.3, so a
three-line quotation fits one A4 sheet (`templates.spec.ts` counts the PDF's pages). The site's
"Official" badge is not shown on the sheet or in the form's template text. Without JavaScript each
group of the form keeps together the same way, and a group taller than a page still breaks. A
section counts as empty when its paragraphs are left out and its lists are empty (without
JavaScript, a list field is empty while its placeholder shows). Start next keeps what belongs to
the business, not to the document: business and bank details, the late-payment terms and every
"Leave this out" choice. A field that reaches its 5 000-character limit says that the rest was not
kept.

#### The store (`src/lib/store.ts`, `src/lib/storage/`)

Everything the site remembers is on the device, under keys that start with `st.`. The store's own
doc comment is the reference; in short:

```ts
import * as z from 'zod/mini'; // client code: `zod/mini`, much smaller than `zod`
import { persistentValue, storageAvailable, clearAll } from '../lib/store';

export const profile = persistentValue('st.profile.v1', profileSchema, null); // WP-31
export const draft = persistentValue(`st.template.${id}.v1`, draftSchema, emptyDraft); // WP-32

profile.get();                    // the value, or the default when unset or invalid
profile.subscribe((p) => …);      // now and on every change, including from another tab
profile.set(next);                // JSON, stamps st.meta.v1 on the first write; null removes it
profile.reset();                  // removes the key
storageAvailable.get();           // false: show the matching storage.* notice
```

| Export | Signature | Notes |
| --- | --- | --- |
| `persistentValue` | `<T>(key: string, schema: Schema<T>, fallback: T, options?: { codec?: Codec }) => PersistentStore<T>` | `Schema<T>` is anything with Zod's `safeParse`. One store per key: the same key with the same schema returns the same store, with another schema it throws. A key outside `st.` throws. |
| `PersistentStore<T>` | nanostores `WritableAtom<T>` plus `key`, `set(value)`, `reset()` | Works with `computed()` and every nanostores helper. |
| `storageAvailable` | `ReadableAtom<boolean>` | `false` when `localStorage` is blocked or a write failed; the stores then live in memory for the page view. |
| `clearAll` | `() => string[]` | Removes every `st.` key (and nothing else) and puts every store back to its default. Returns the keys removed. |
| `checks`, `setChecked(key, done, now?)`, `countDone(map, keys)`, `renameChecks(renames)` | | `st.checks.v1`, `{ [key]: ISO date-time }`. The key is a checkbox's `data-task`: `sameAs ?? id`. An entry that is not a date-time is dropped on read and the rest kept (`entriesOf`), so one bad entry never costs every tick. `renameChecks` moves ticks from keys that changed (`src/data/task-keys.json`; rewording a task changes its id, see `content-meta/README.md`). The store runs it itself when it loads, once per page and writing only when a tick moved, so **every reader of `checks` sees current keys** with no call of its own. |
| `theme` | `PersistentStore<'system' \| 'light' \| 'dark'>` | `st.theme`, a bare string (read by `theme-init.js`). |
| `lang` | `PersistentStore<Locale \| null>` | `st.lang`, a bare string. |
| `promptsCopied`, `markPromptCopied(id, now?)` | | `st.prompts.v1`, `{ [promptId]: ISO date-time }`, read like `checks`. |
| `entriesOf` | `<V>(value: Schema<V>) => Schema<Record<string, V>>` | For a map of independent entries: drops the entries that fail `value` instead of resetting the whole key. |
| `shortcuts`, `shortcutsEnabled()` | `PersistentStore<boolean>`, `() => boolean` | `st.shortcuts`, default `true`. |
| `lowData` | `PersistentStore<boolean>` | `st.lowData`, default `false`. |
| `seenVersion` | `PersistentStore<string \| null>` | `st.seenVersion`, for the "what has changed" notice. |

`src/lib/storage/migrate.ts` holds `SCHEMA_VERSION`, `MIGRATIONS` (forward only; `MIGRATIONS[n]`
moves data from `n - 1` to `n`), `st.meta.v1 = { schema, createdAt }`, the per-key reset
(`readValue`) and `clearAll(adapter)`. A change to a stored shape raises `SCHEMA_VERSION` and adds a
migration, or uses a new key (`.v2`). `src/lib/storage/adapter.ts` is the `localStorage` wrapper that
never throws.

`theme-init.js` is the one documented exception to "only the store reads storage": it must run
before any module, so it reads `st.theme`, `st.lowData`, `st.lang` and `st.profile.v1` itself, in the formats the store writes; keep it in step with the `theme`, `lowData`, `lang` and `profile` stores. It sets `data-low-data`, `data-theme`, `data-st-lang-offer` (the saved language, when it is not the page's, so the language banner shows from first paint) `data-st-script-failed` (the names of scripts that failed to load, from the start of the file name: `YourPathCard`, `my-path`) and `data-st-profile` (saved answers that `parseProfile` would accept, with the same rules, which `tests/dom/theme-init.test.ts` keeps equal, so My path and the home card keep their space only for real answers) and `data-st-storage="blocked"` (its own read threw, so `utilities.css` shows the storage warnings and hides the "saved on this device" lines from the first paint; WP-50a review pass 11, m4). It copies the font preloads from `<template data-st-preload>` into `<head>` unless low data is on (WP-50 Phase 2). From 1024px it also opens "Words used in this file" (`#words-used-in-this-file`) as the parser adds it, through a `MutationObserver` that stops once the list is found or the page has been parsed (WP-50a). The build minifies the copy the pages load (`scripts/minify-theme-init.ts`), so its comments cost no page weight; the source stays readable, and is what `tests/dom/theme-init.test.ts` runs. The store is built on `nanostores` alone; it does not use `@nanostores/persistent` (removed), because its adapter has to survive a throwing `localStorage`.

### Find my path and My path (WP-31)

The reader's answers (`st.profile.v1`: how they trade, their kinds of business in the order they
chose them, and where they are now; build plan A5) personalise the guide. The answers and the path
are computed by pure modules shared by the pages and the browser: `src/lib/profile.ts` (the profile,
its hand-written check, the query string, the 49 single-type answers) and `src/lib/path-engine.ts`
(`applies`, the A5 matching rule, and `buildPath(profile, manifest, paths)`), on the rules in
`content-meta/paths.json` (see `content-meta/README.md`).

| Element | Script | Rendered by | What it does | Without JavaScript |
| --- | --- | --- | --- | --- |
| `<st-wizard>` | `wizard.ts` | `Wizard.astro` (`/find-my-path/`) | Makes the one form three steps: a stepper (`aria-current="step"`), Back and Next, focus on each step's heading; the kinds of business become checkboxes (the server renders radios) ticked in order, the first being the primary type; "Pty Ltd, growing" is `disabled` with its reason shown unless step 1 is Pty Ltd; Next and "See my path" stay `aria-disabled` with a hint until the step is answered; Enter in an answer goes on. "See my path" saves the profile and opens `/my-path/?saved=1`, or `/my-path/?entity=…&type=…&stage=…` when the device will not save. Answers saved earlier are filled in. | All three questions show, also with JavaScript until the element is ready (`data-enhance`; the stepper shows from the first paint as an outline of the three questions); one kind of business (radios, and the page says more need JavaScript). Each of the 49 result pages has its own submit button with that page as `formaction`; CSS `:has()` shows only the one matching the checked answers (`wizardNoJsCss()` in the page `<head>`), otherwise "Choose an answer first." or why "Pty Ltd, growing" needs a Pty Ltd. All of that is inside `@supports selector(:has(*))`; a browser without `:has()` sees instead an open list, "Choose your path from this list", with a line saying the browser cannot show the button, and a link to every result page. A disabled first submit button is the form's default button, so Enter never submits through the wrong result. |
| `<st-my-path>` | `my-path.ts` | `my-path.astro` | Shows the answers as chips, the steps numbered and ordered (every step of every rule is rendered `hidden`, with every page it can hold), each step's "why" from "How to use this toolkit" when it fits, "Mark as done" (`st.path.v1`, every page of the step), the ring, the personalised checklist and "Remove my answers" (a `ConfirmDialog`; ticks stay; focus goes to the `<h1>`). | The empty state with "Find my path". |
| `<st-path-progress>` | `path-progress.ts` | `SiteHeader` | The top bar's "My path: 3 of 10 steps done" link and ring, when there is a profile. | Hidden. |
| `<st-your-path>` | `path-progress.ts` | `YourPathCard` (home) | "Your path" card: ring, "Continue: step 4 of 10" to that step's first page, "Open my path", "Edit answers". | Hidden. |
| `<st-path-pager>` | `path-progress.ts` | `Doc.astro` | On a document on the reader's path, Previous and Next follow the path (with a step's `#anchor`); a side with no path neighbour keeps the section order. | Section order. |
| `<st-applies-scope>` | `applies.ts` | `AppliesScope` (documents with conditions, `/checklist/`, My path) | Hides what does not apply (`.st-filtered`): a heading's section collapses into its `HiddenMarker` ("Hidden by “Only what applies to me”: What SARS wants from a company" and Show, which brings back that section and focuses its heading; the marker never says who a part is for, because the guide's own heading says that), a link to a hidden part (`#hash`, on load and on `hashchange`) brings it back, single items and table rows go, a checklist says "2 items are hidden because they do not apply to you" with a "Show 2 hidden items" button, and a checklist with every item hidden collapses to that line (never an empty "Your checklist"; on My path such a list goes). A collapsed section ends at the first sub-heading that applies to the reader or to everyone (`hiddenPart`): "Provisional tax" stays visible for a Pty Ltd reader under the collapsed "What SARS wants from a sole proprietor". `tests/dom/applies-all-profiles.test.ts` checks every document in both languages against all 49 answers. **Nothing is removed from the page.** Modes: `switch` (follows `st.onlyMine`), `checklist` (the "Show: Only what applies to me" choice), `always` (My path, no markers). | Nothing is hidden. |
| `<st-applies-switch>` | `applies.ts` | `AppliesSwitch` (sidebar from 1024px, above the text below) | "Only what applies to me", a `role="switch"` checkbox bound to `st.onlyMine`; only with a profile, otherwise a line pointing at Find my path. | Hidden. |
| `<st-prompt-fill>` | `prompt-fill.ts` | `CodeBlock` (prompts with `[BUSINESS TYPE]`) | "Fill from my profile" writes the primary kind of business into the blanks the profile knows (`prompts.profileValues`), says how many blanks are left, and "Undo" puts the brackets back; focus moves to whichever button replaces the one pressed. "Copy prompt" copies the filled text. | Hidden. |

Components: `Wizard`, `PathSteps` and `YourPathCard` (`src/components/wizard/`), `HiddenMarker`
(`src/components/content/`), `AppliesScope` and `AppliesSwitch` (`src/components/interactive/`).
Headings, checklist items and table rows with a condition carry it as `data-entity`/`data-types`
(`appliesAttributes`), every heading its `data-depth`, so a section can be found without wrappers.

Pages: `/find-my-path/`, `/my-path/` and the no-JavaScript results
`/find-my-path/result/<entity>/<type>/<stage>/` (49 per language, `noindex`, left out of the
sitemap, built by the same `buildPath`). With JavaScript a reader never lands on a result page.

Rules the pieces follow:

- **The profile reader is the only way in.** Other packages read the answers with `readProfile()`,
  `profileBusinessTypes()` (General expanded; for WP-33's "My business types" filter) or
  `profileEntity()` from `src/lib/profile-store.ts`, and subscribe to `profile`; never parse
  `st.profile.v1` themselves.
- **Document pages never load the path rules.** `path-progress.ts` (the top bar's ring and the
  pager) is on every page, so it reads the path stored on the device (`st.pathView.v1`,
  `src/lib/path-view.ts`) and nothing more. The wizard and My path write it; the home card
  (`your-path.ts`) rebuilds it with `import('./path-data')` when the answers or the rules (the hash
  of `paths.json`, `data-version`) changed. Until then a document page shows no ring and keeps its
  pager in section order. On the path's last page, Next leads to My path.
- **The top bar from 1024 to 1279px** shows the ring without its "My path" label and the theme control without icons, so the sticky bar keeps one row with answers saved. Since the WP-33 merge the search control is its icon alone from 1024 to 1365px (44px, its name the visually hidden "Search"/"Soek", no `/` hint), and below 1280px the bar's gaps narrow to `--st-space-1`: with the word, the hint and "My path" the bar wrapped to two rows (124px) up to 1365px, and the Afrikaans bar was a few pixels too wide at 1024px.
- **The home card keeps its space.** With `html[data-st-profile]` the card's box is kept, invisible, from first paint, so the page does not move when it appears; the card drops it (`data-no-path`) when there are no answers after all. Only what stops the card from drawing gives the space back: its own module failing to load (`data-st-script-failed~="YourPathCard"`) or the lazy path rules failing to load (`data-path-failed`, and the next trigger tries again). A slow load moves nothing, a dropped request leaves no gap, and another script failing leaves the card alone.
- **Rebuilding the stored path** happens only on an element's own triggers (connecting, new answers), never on a change to `st.pathView.v1` from another tab, so two tabs on different builds cannot keep overwriting each other.
- `theme-init.js` sets `<html data-st-profile>` before paint when answers are saved, so My path never
  shows its empty state ("You have not answered the questions yet") to a reader with answers, however
  slow the load: it keeps a screen's height for the path until it is drawn, so the footer does not
  move either. Only when My path's own module fails to load (`data-st-script-failed~="my-path"`)
  does the empty state with "Find my path" show.

| Store | Key | Value |
| --- | --- | --- |
| `profile` | `st.profile.v1` | `{ entity, businessTypes[], stage }`; invalid (including "Pty Ltd, growing" without a Pty Ltd) is removed |
| `pathDone` | `st.path.v1` | `{ [docId]: ISO date-time marked as read }`; a step is done when all its pages are |
| `onlyMine` | `st.onlyMine` | `true` / `false`, "Only what applies to me" |
| `pathView` | `st.pathView.v1` | `{ version, profile, steps, docs }`: the reader's path for the top bar, the pager and the home card, rebuilt when `version` (the `paths.json` hash) or `profile` (the answers' query string) no longer match |

"Remove my answers" clears all four and keeps the ticks; "Clear all my data" on `/about/` clears
everything.

### Controls that need a script (WP-50a)

On a slow phone the modules run 8 to 13 s after the first paint. A control that shows before its
script works loses the tap: the wizard's Next and the template's Fill in / Preview tabs did (WP-50
audit, flows 1 and 5). An element whose controls need its script carries `data-enhance` and sets
`data-ready` at the end of `connectedCallback` (and removes it on disconnect). Until then
`utilities.css` keeps every `.js-only` control in its subtree unseen but in its room
(`visibility: hidden`: no taps, no focus, not read out) and shows `.no-js-only`, so the page works
as it does without JavaScript and nothing moves when the script shows its controls. Where a
no-JavaScript line is replaced by something else, the two share one grid cell (`.st-tslot` in the
templates), and after the script the line keeps its room unseen, so the slot is never shorter. Each
component drops the rooms if its script fails to load (`data-st-script-failed`, set by
`theme-init.js`), so no blank band is left. Today that is `<st-wizard>` and `<st-template-form>`.
In the template the tabs, "Remove line" and "Add line" keep their room, the print line shares a slot
with "saved on this device only" and the totals line with "Add line" (WP-50a review pass 9, M1: with
`display: none` the field the reader was filling in jumped 52 to 133px, 0.16 to 0.25). A slot whose
partner is hidden too (storage blocked; "Add line" after ten lines) keeps no room (pass 10, m2).

**Before the script runs, the server renders what the script would show for an empty form; where a
control truly needs the script, its room carries a visible waiting line, never blank space** (pass
10, M1: rooms kept unseen for the required items and the actions left 727 to 1,542px of blank page
under the form). So the required items list is rendered as the script leaves it for an empty form
(`emptyFormRequired()`, `src/lib/templates/required.ts`, with the rules the script itself imports
from `required-rules.ts`: items present by default or below their amount are `hidden`, and the
count line is written, with no whitespace around it, so the script's first run does not write it;
pass 11, m1 and m2), its links work without the script, and the
script's first run changes nothing in it (it shrank by up to 170px). The buttons' room holds
"Loading the form tools…" (`templates.loadingTools`, read by screen readers too), and the hints
under them show. The wizard follows the same rule: question 1 and the stepper as the script shows
them, and "Loading the next step…" in Next's room. The wizard goes further, below: with JavaScript
it does not show the no-JavaScript form first.

**The wizard is in steps from the first paint** (WP-50a review pass 5). With JavaScript (the `js`
class `theme-init.js` sets before the first paint), `Wizard.astro`'s CSS shows what the script will
show: the stepper and question 1 only, with the no-JavaScript parts (questions 2 and 3, the result
button and its list) hidden. Step 1 is marked current in the HTML. Next keeps its room,
`visibility: hidden`, so it cannot be tapped before it works, and "Loading the next step…"
(`wizard.loadingNext`; plain text, read by screen readers too, pass 7 m2) sits over that room and takes none of its own. "Saved on this
device only" keeps its room the same way, and so does "Choose an answer first." once the step is
answered, so a tap moves nothing and the page is as long after the script as before it (pass 6, m1,
m3, m4). The answers are native inputs that
work meanwhile. When the script arrives it makes the kinds of business checkboxes, and shows Next
and the saved line where their room was; nothing folds, nothing moves and nothing scrolls. Each step
title in the stepper keeps the room of its semibold form (pass 3, m1).

With saved answers ("Edit answers") the script fills in the questions from them, except one the
reader has already answered: the server renders no answer checked, so on an ordinary load a checked
answer is the reader's and stays (pass 6, M1). After Back, when the page is not served from the
back/forward cache, the browser puts the reader's earlier ticks back once the page has loaded, just
before `pageshow`, with no `change` event; those win. The wizard reads the form again on `pageshow`
(and the next frame), so what it saves and which buttons work match what shows, and `answers()`
only ever saves kinds of business that show ticked (pass 7, M1). A page served from the cache comes
back with its state and needs nothing.

- **Without JavaScript** the page is the GET form: all three questions and the result button for
  the answers (`wizardNoJsCss()` keys on `st-wizard:not([data-ready])`).
- **If the wizard's own script fails to load, or throws as it runs**, `theme-init.js` names it in
  `data-st-script-failed` ("Wizard"; a load error on its `<script>`, or a window `error` whose
  `filename` is the module), the stepped rules stop applying, and the page becomes the no-JavaScript
  form, with no unseen bars left behind. A layout change is acceptable on that path. Every rule that
  reads the attribute also waits for `data-ready`, so a later error changes nothing. A module that
  never arrives is a backlog row (pass 6, m2).

Four passes tried to show the whole no-JavaScript form first and fold it when the script arrived:
the help lines swapped places at question 2 (0.47 at 320px), the footer jumped into view near the
end of a question (0.11 to 0.26), the browser clamped or anchored the scroll, and holding the form's
height left two to four screens of empty page. Folding a long form into one step always moves
something, so the wizard no longer does it. `wizard-shift.spec.ts` checks the result at four sizes
in both languages: when the script arrives at any scroll position, the gap below question 1's Next
against `204a2a2`, and the reader's first tap, Next and Back.

If a question before the current one has no answer, the line under its button says so
(`wizard.earlierMissing`), and Next and "See my path" go to the first unanswered question and focus
its heading. Since the wizard starts on question 1 and Next refuses an unanswered step, no way to
get there is known today; it stays as a safety net (review pass 2, M1). Next and "See my path" are
described only by the line under them that shows (pass 3, m2). The template's tabs already have
their room; the form does not move when its script arrives (`templates.spec.ts`).

### Illustrations

Seven inline SVGs: `VehicleDealer` (bakkie), `FoodBusiness` (pot with steam), `BeautyCare` (comb and scissors), `RetailOnline` (shop awning with parcel), `ServicesTrades` (spanner and ladder), `ProfessionalCreative` (pencil and laptop), `General` (row of small shapes).

- Hand-authored geometric shapes, each under 2 KB, `aria-hidden="true"`, `focusable="false"`.
- Business-type art belongs to "Your kind of business" (`data-section="types"`). The design-system page adds a separate, labelled hue demo row. `src/components/illustrations/by-type.ts` maps each type to its illustration for the type tiles and, from 480px, the type page's facts (WP-50 Phase 3, item 3).
- Two tone: strokes use `currentColor` (the section hue through `.st-illustration { color: var(--st-section) }`); shapes with `.st-illo-fill` use `--st-illustration-fill`, which defaults to `--st-section-tint` (right on `--st-bg` or `--st-surface`). On a tinted background, set `--st-illustration-fill: var(--st-surface)` so the fill stays visible. `Card` already does this in its illustration area. Set `--st-illustration-size` to resize.
- Components have no `<style>` block, so no scope attributes are added to every path.

## Notices and sources (plan D5)

Every content page carries an AI notice near the top and a "Sources for this page" section. Both compose from primitives that already exist. **No new colour tokens and no new components are needed**, so do not invent a notice style per page package. `/design-system/` shows all of it under [Notices and sources](/design-system/#notices), in English and in Afrikaans.

### AI notice

`Callout variant="info"` with `icon="lucide:bot"` and `label={t('trust.aiNotice.label')}`. Inside, in this order, and nowhere else on the page:

1. **The notice sentence** (`trust.aiNotice.body`, or the `…HumanChecked` / `…NoPageSources` variant). It names who checked: an AI, or the named reviewer.
2. **The verification status**, as a `Badge` **and** as words: `trust.status.aiChecked` ("AI-checked") or `trust.status.humanChecked` ("Checked by {reviewer}"). Use `variant="status"` with an `icon` override (`lucide:bot`, `lucide:user-check`). `status` is the neutral surface-2 chip, **not** the info tint that marks an official source: a status says who looked at the page, officialness says who wrote the rule, and the two carry very different weight. Rendering "AI-checked" in the same teal chip as "Official source" teaches at a glance that an AI check is as good as the regulator, which is the conflation ADR 0006 exists to prevent — and in forced colours and in greyscale print the chip is gone, so only the words are left to carry it. No new colour: `status` reuses the `--st-text` on `--st-surface-2` pair that is already verified.
3. **Its one-sentence explanation** (`trust.status.aiCheckedMeans` / `humanCheckedMeans`), immediately beside the status.
4. **The link** to `start/how-this-was-made`, as `.st-link-block` so it is a 44px target.

**On a phone the notice is on the first screen** (WP-50a), at 320×568 too, with JavaScript or without, in both languages: before WP-50a it started 625 to 812px down. Since WP-50 Phase 3 it is a compact callout (small type and padding; same words, order and link) and there is no section label anywhere (the breadcrumb's hue dot names the section). The order is direction A's (H1, lead, meta line, notice) wherever the notice still fits the first screen; on a short phone screen (below 768px wide and 740px high) and on a landscape phone (below 500px high) the notices come straight after the H1 and the lead and meta line follow them (`st-doc__after-notice`, CSS `order`), because today's two- and three-row header leaves no room. Neither has a link or control, so the order of focus is the same; a screen reader still reads the lead first. That rule can go once the header is one row (Phase 3, item 5). "Words used on this page" is a closed disclosure at every width (it was open from 1024px until Phase 3). Measured at 320×568 on the vehicle-dealer page: the notice starts 354px down in Afrikaans with JavaScript and 402px without (the no-JS header carries every menu). On landscape phones the page also starts 8px under the header. Measured on all 74 document pages (EN and AF), the notice's label row ends inside the first screen:

| Landscape size | With JavaScript (worst top) | Without JavaScript (213px header) |
| --- | --- | --- |
| 568×320 | 73 of 74 (`af/start/start-here/` misses, top 315px) | 0 of 74 (328 to 415px) |
| 640×360, 740×360, 800×360 | 74 of 74 (274, 225, 227px) | 0 of 74 (329 to 379px) |
| 844×390 | 74 of 74 (229px) | 61 of 74 (13 miss at 381px) |
| 896×414, 915×412 | 74 of 74 (231px) | 65 of 74 (9 miss at 383px: those whose H1 takes two lines, such as AF beauty and AF start here) |

**Known gap:** the misses above wait for the one-row header (Phase 3, item 5); every one of them was further down at `5fbea62`. `doc-page.spec.ts` checks 360×740, 412×915, 800×360, 844×390 and 915×412 with JavaScript, on the vehicle dealer (EN and AF), AF start here and AF beauty; `nojs.spec.ts` checks 360×740, 412×915 and 915×412 without, on the vehicle dealer. `tests/e2e/first-screen.spec.ts` and `nojs.spec.ts` check it.

On an **Afrikaans page** the Afrikaans AI notice comes first in the article header and says the *English* text was checked, and the machine-translation notice (`Callout variant="warning"`, `icon="lucide:languages"`) sits directly under it, in the same header. Neither notice is dismissible. Put the link to the English version inside the MT notice with `lang="en"` on the link text.

`Callout` names its own `role="note"` from its label, so a screen reader announces "About this page, note" rather than a bare "note".

### Sources for this page

A heading plus `<ul role="list">` (`.st-stack`). Each entry has:

- the **title as a link**, with `.st-link-block` and an external-link `Icon` (`lucide:external-link`) inside the link text, plus `rel="noopener"`. The icon belongs in the last text run, and `.st-link-block` is inline layout, so it stays there when a long translated title wraps;
- `Badge variant="official"` when the source is official, or `Badge variant="flag"` ("Not an official source") when it is not — never silence, and never colour alone;
- a `.st-hint` line beginning "What this source supports: …", so a reader can tell which fact rests on which source.

**On a long page the list comes in two parts** (WP-50 Phase 3; the audit measured the section at 8,183px on the vehicle-dealer page on a phone, now 910px). A page with six or more items (each register entry, plus the one Acts item) shows the first three, then a control that reads "Show the other 38 sources" ("Wys die ander 38 bronne", `trust.sources.more`), then the rest as a plain list (`.st-sources__rest`). The control is a native checkbox with a plain `<label for>` styled like a disclosure (44px row, the same chevron, the focus ring drawn on the label). The label holds one phrase as real text, "Show the other 38 sources" ("Wys die ander 38 bronne"), the same in both states: checked means shown, and the chevron turns. That text is the checkbox's only name, so it is never `aria-hidden`. The checkbox is transparent and lies over the whole label row, so the row is its hit area and a screen reader's focus box surrounds the words. Main repair review pass 2 found the earlier version (an `aria-hidden` label whose words were CSS `::after` text, "Hide …" once checked) named "" in Chromium's own accessibility tree, while Playwright's computed name said otherwise; `doc-page.spec.ts` and `nojs.spec.ts` now read the name Chromium exposes over the DevTools protocol (`tests/e2e/helpers/ax.ts`), in both states and languages (Chromium only: Playwright opens a CDP session only there, so WebKit skips it), with and without JavaScript, and `a11y.spec.ts` runs axe on the vehicle dealer at 360px with the control closed and open. Space or a tap shows the rest. **Only `screen and (max-width: 767.98px)` hides anything**, and only while the box is unchecked; from 768px and on paper (`print, (min-width: 768px)`), in every engine, the rest is an ordinary list and the control is `display: none`. These two queries use the prefix syntax, not ranges, so an engine that predates range queries behaves the same instead of showing a control that does nothing (nit 2). The lists carry no bullets. It needs no script. Every entry is in the HTML, so `dist:trust` sees them all; find in page does not search the hidden rest on a phone until the reader shows it.

Why not a `<details>` (the first version): a closed `<details>` hides its content at every width and on paper in WebKit, and showing it at 768px needs `::details-content`, which the WebKit in CI does not apply. Safari readers on an iPad or a Mac saw neither the rest nor a summary to open it, and the rest did not print; CI's WebKit job failed on exactly that after the merge. A checkbox and two media queries behave the same in Chromium, WebKit and Firefox, with and without JavaScript, and cost no script. The heading, the count line and the first entries are never collapsed, and the AI notice never is. This is the one exception `stoep-design` rule 9 allows (owner-delegated decision, WP-50 Phase 3 review pass 1): on a phone the rest may wait behind a native control, provided every entry is in the HTML, it opens without JavaScript, every entry prints, and all entries show from 768px. The entries are `SourceItems.astro`, rendered once per part. `doc-page.spec.ts` and `nojs.spec.ts` check the phone, the keyboard, 768px and print without relying on any engine feature beyond media queries and `:checked`.

Acts and regulations go in a nested `<ul role="list">` under an "Acts and regulations" entry, each with its section numbers in a `.st-hint`. Pages with no sources of their own (start pages, the register itself) render `doc.sourceNote` as a `.st-hint` sentence, followed by the two links — to the full register and to how-this-was-made — as `.st-link-block` in a `.st-cluster`. Do **not** hang them off the end of the sentence separated by a middot: two link phrases side by side are stand-alone links, not inline links in a sentence, so the 44px rule applies to them and the e2e target test only measures them once they say so.

### Dated and unconfirmed facts

- A dated fact: the claim, then `Badge variant="status" icon="lucide:calendar-check"` reading "AI-checked {date}" with the date in words, then the link to the one source that supports it.
- An unconfirmed fact: `Badge variant="flag"` reading `trust.unverified.label` ("Not confirmed"), followed by `trust.unverified.body`, the sentence that says what to do about it.

**A number in a demo is a number that ships.** `/design-system/` is built and deployed, and every page package copies this section, so a figure in an example is held to the same standard as one on a content page: it comes from the verification register, and its "checked" date is the register's own (`docs/rsa-business-toolkit/05 Look it up/03-sources-and-verification-register.md`). A stale figure wearing a verification badge is worse than one with no badge at all. Review pass 4 found the dated-fact demo stating the superseded R1 million VAT threshold — the exact number the toolkit's own content warns readers about — with an "AI-checked" badge next to it. `tests/unit/forbidden-strings.test.ts` now scans `src/pages/**`, `src/layouts/**` and `src/components/**` for that class of mistake; the content pipeline's check only sees the generated JSON. Add a pattern there whenever a fact goes stale, and never restate a superseded figure in a demo to make a point about it.

### What must never be colour-only

Verification status, officialness and "not confirmed" are the three places a page package will be tempted to use a coloured chip on its own. All three must carry an icon **and** words, and the status must carry its explanation sentence next to it. The reason is not only WCAG 1.4.1:

- **In print** the light palette is forced and callouts are `break-inside: avoid`, but a reader may print in greyscale. Words survive; a tint does not.
- **In forced colours** every badge and callout keeps only a `CanvasText` border, and all tints collapse to `Canvas`. An "Official" badge and a "Not confirmed" badge are then distinguishable by their icon and their text, and by nothing else.
- Under `prefers-reduced-data` the shweshwe pattern goes and fonts fall back, but none of this text does.

## Scripts, CSP and JavaScript budget

- CSP (meta, production builds only, because the dev server injects inline scripts): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'`. It comes before the first script in `<head>`.
- **Blocking theme init.** `src/scripts/theme-init.js` is plain JavaScript (checked with `// @ts-check`). `Base.astro` imports it with `?url`; Vite copies the file with a hashed name (it does not compile `?url` imports, which is why the file is `.js` and not `.ts`), and Base loads it with `<script is:inline src={url}>`, a classic render-blocking script right after the theme-color metas. Because Vite does not minify a `?url` copy, the `minifyThemeInit` plugin (`scripts/minify-theme-init.ts`, in `astro.config.ts`) minifies it in `generateBundle` with Vite's own minifier (Oxc), as an ES2019 classic script: the file keeps its name and hash, `script-src 'self'` still covers it, and no dependency was added. About 1.0 KB gzipped (1.7 KB before; WP-50a review pass 3, m6). `tests/unit/minify-theme-init.test.ts` checks that the copy compiles as a classic script with no imports.
- **Everything else** is a normal Astro `<script>`: bundled as an ES module, deduplicated per page, able to share chunks and use `import()`. Component scripts (for example `TableScroll`) and page scripts (the design-system page imports `theme-control` and `design-system-contrast`) work the same way.
- `astro.config.ts` sets `vite.build.assetsInlineLimit` to a **function**, not to `0`. Astro inlines a processed script bundle, and Vite a `?url` asset (as a `data:` URI), when it is under that limit, and `script-src 'self'` would block both; but a flat `0` also switched off Astro's `inlineStylesheets: 'auto'`, so a page with a few hundred bytes of scoped CSS paid for an extra render-blocking request. The function returns `false` for everything except `.css`, where it returns `undefined` and the default size limit applies. Result: zero inline `<script>` on any page, and small stylesheets inline again (`style-src` already allows `'unsafe-inline'`). E2e tests check both on `/` and `/design-system/`.
- Only the CSS chunk that carries the design tokens is named `stoep.[hash].css`; page CSS keeps Rollup's own name (`assetFileNames` matches on `originalFileNames`). Three files all called `stoep.*` could not be told apart in DevTools or a budget report.
- Module scripts run after parsing but, in WebKit, **before stylesheets that come later in `<head>`** have applied (Astro emits page CSS links after its scripts). A script that reads computed styles must therefore check that the tokens resolve — and it must check on **the element it is about to measure**, not on `documentElement`. See [The live contrast panel](#the-live-contrast-panel) for why the difference is not academic.
- `localStorage` is allowed only in `src/lib/store.ts` and `src/lib/storage/**` (ESLint allow-list; `src/scripts/**` left it with WP-30). `theme-init.js` reads `st.theme`, `st.lowData` and `st.lang` itself, because it must run before any module loads; it is plain JavaScript, outside the TypeScript rule, and the one documented exception.
- **JavaScript budget** (plan B3 flow 9: 25 KB gzipped on document pages, 45 KB on tool pages), checked on every page by `pnpm dist:budget` at the end of `pnpm build`. Measured on the WP-31 build after review pass 5, each file gzipped (level 9) on its own and summed, `theme-init` included, without / with a saved profile: the heaviest document page (`/af/business-types/food/`) **22.2 KB / 22.2 KB**, 2.8 KB under the budget. Tool pages: My path 24.7 KB, `/checklist/` 21.7 KB, Find my path 20.3 KB; the home page 17.7 KB, and 20.5 KB when it rebuilds the stored path (the rules and the engine, `path-data`, lazily). The profile is checked by hand-written code, not zod, so the store chunk carries no schema library; "Fill from my profile" loads its script only on pages with a fillable prompt. On the WP-30 build the heaviest document page was 15.9 KB; before review pass 1 of WP-31 it was 24.0 KB, and 26.3 KB with a profile. How to measure: `docs/testing.md`. WP-33 adds the search button's script (`<st-search>`) to every page with the header; the results code, MiniSearch and the index load only when search opens. The merged numbers are in `docs/testing.md`.
- In `astro dev` the same imports work: `?url` returns the source path of `theme-init.js`, which Vite serves as JavaScript, and processed scripts load as dev modules.

### The live contrast panel

`src/scripts/design-system-contrast.ts` measures every `CONTRAST_PAIRS` entry in the browser and writes PASS or FAIL into the table, so drift between `tokens.css` and the verified ratios shows up on the page. Because a designer trusts what it says, it is held to one rule: **it never reports a result it cannot substantiate.**

The rule exists because it once broke it. In WebKit, on a cold cache, a `<span>` appended to `<body>` at the moment the panel first ran received **none** of the `--st-*` properties, although `documentElement` resolved `--st-bg` to `#fbf8f3` in the same instant: the root's computed style was fresh, the freshly inserted element's inherited custom properties were not. Every `var(--st-…)` was then invalid at computed-value time, `color` fell back to the inherited initial black, all 76 pairs measured 1.00:1, and the panel wrote "76 of 76 pairs fail" — permanently, because it only re-measures on a theme change. Measured with `getComputedStyle` instrumented from document start, over cold WebKit loads driven through Playwright request interception (which perturbs stylesheet timing enough to expose the race, but does not cause it): **10 of 24** loads hit it and every one reported 76 failures, against **0 of 12** loads with no interception. On each failing load all 196 reads the panel made showed the root at `--st-bg` = `#fbf8f3` and the probe at `''` with `color` = `rgb(0, 0, 0)`; on each passing load, 0 of 196. The old guard checked `--st-bg` on `documentElement`, which was true the whole time.

After the fix, **0 of 96** loads under the same interception reported a failure. The race itself is still there — the first read is still blind on roughly one load in six — but the panel now refuses that reading and measures on the next pass.

So `measure()` takes a `TokenReader` and refuses a reading on any of three value-independent conditions:

1. a token the reading needs did not reach the measuring element through the cascade. **Every** such token is checked, not one canary: `--st-bg` alone only proves that *a* token arrived, and a partial delivery — the canary through, the rest not — reads real colours for what arrived and the inherited black for the rest, which trips neither of the other two conditions and published 59 fabricated failures in review. The check is ordered with the canary first and short-circuits, so the all-or-nothing case it was written for still costs one read per refused attempt;
2. every token measured as the same colour. No palette is one colour in any theme, so this is the instrument misreading, and it is the backstop for any future variant of (1) that still delivers every token;
3. not one token could be parsed. (2) needs two parsed colours to compare, so without (3) a reading the parser understood nothing of — an `lab()` or `color(display-p3 …)` token, or an engine serialising one in a way `parseCssColor` does not know — is published as all 76 pairs failing at an `unreadable` ratio: the original false accusation from a different cause.

None of the three looks at whether a colour is *correct*, so none can turn drift into a pass: a broken token still measures as itself and still fails its pair. What (2) **can** swallow is a palette that genuinely collapsed to a single colour — that is reported as `unavailable` rather than as 76 failures. That is the honest limit of the claim, and it is affordable: a refused reading publishes no failure count at all, every assertion that reads `data-failures="0"` also requires `data-live="on"`, and `tests/unit/tokens-contrast.test.ts` checks every pair against `tokens.css` at build time with no browser involved. The gates can cost the panel a diagnosis; they cannot buy it a clean bill of health.

While a reading is refused the panel writes **nothing** — the server-rendered "Measuring…" summary and `pending` rows stay put, so no false FAIL can flash — discards the probe and retries every 50ms with a fresh one, for five seconds from the last milestone (`load` resets the clock). If it is still blind it sets `data-live="unavailable"` and says so. `data-live` is therefore one of `on`, `paused` (forced colours), or `unavailable`, and is **absent until the first substantiated reading**, which is a fourth observable state and deliberately not a value. **`data-failures` exists only when a measurement is behind it**: it is removed for `paused` and `unavailable`, never set to `0`. Three e2e assertions read `data-failures="0"` as "all 76 pairs were measured and none failed", so a panel that measured nothing must not be able to satisfy them.

The table is held to the same rule as the summary. A **re-measure** can fail after a good reading — a theme change while the probe cannot resolve the tokens — and `unavailable` then puts the rows back to `–` / `Not checked` / `pending` and the swatches to `…`, exactly as `paused` rewrites them. Leaving 76 `PASS` rows and the previous theme's ratios under a paragraph saying the checks are unavailable showed a designer a live-looking measurement of a theme that was never measured. Before the first reading there is nothing to withdraw and the server-rendered table is left untouched, so "nothing is written until there is something to stand behind" still holds literally.

One last piece of wording. An unparseable token fails its pair, which is the right way round — the pair cannot be shown to meet its minimum, and `unreadable` is visible in the row. But "N of 76 pairs fail" on its own reads as a contrast verdict, and a parser gap is not one, so `Reading` carries an `unreadable` count and the summary appends "M of those could not be read" when it is non-zero.

## Automated checks

- **Unit** (`tests/unit/forbidden-strings.test.ts`): stale facts and unfinished markers in hand-written source (`src/pages/**`, `src/layouts/**`, `src/components/**`), with a mutation self-test. The content pipeline's forbidden-string check only sees the generated JSON, so a number typed into a page was unguarded until now. See [Dated and unconfirmed facts](#dated-and-unconfirmed-facts).
- **Unit** (`tests/unit/tokens-contrast.test.ts`): plan B4 hex values; dark blocks identical; the token structure test (one of each palette block, no other colour overrides, with a mutation self-test); every `CONTRAST_PAIRS` entry in both themes; tint strength and tint separation; favicon colours; and the computed-colour parser (`rgb()`, `color(srgb …)`, `oklab()`, `oklch()`, hex with alpha, `none`, compositing), including the exact strings WebKit and Chromium return.
- **Unit** (`tests/unit/design-system-contrast.test.ts`): the live panel's measurement gate. `measure()` takes a `TokenReader` rather than touching the DOM, so each of the three conditions can be exercised alone. Each of these must be refused outright, not reported as 76 failures: an unstyled probe (no `--st-*` delivered, `color` = `rgb(0, 0, 0)`); a probe the tokens never reached that nonetheless reads a *different*, correct colour for every token; a probe that received only the canary and reads black for everything else; and a probe that received every token but whose computed colours are all in a syntax the parser does not know (`lab()`, `color(display-p3 …)`). A drifted palette must still report exactly the pairs it breaks, so the gate has not bought safety by silencing the panel, and a reading with one unparseable token among readable ones must still be published, with the unreadable pairs counted separately. Each case isolates one condition, and each is paired with a control that differs only in the thing under test — the unstyled probe trips all of them at once, so without the others, deleting the delivery check or the parser check leaves the suite green. Removing any one condition now turns exactly the tests written for it red. See [The live contrast panel](#the-live-contrast-panel).
- **e2e** (`tests/e2e/design-system.spec.ts`, projects chromium, webkit and mobile):
  - no inline scripts and the exact C4 CSP on `/` and `/design-system/`;
  - a saved dark theme is on `<html>` (with `js`) before `<body>` exists, and theme-color follows it;
  - no horizontal scrolling at 320px, on both pages;
  - **long labels**: the longest real Afrikaans status label ("Masjienvertaling, nog nie nagegaan nie", 38 characters) is injected into every badge, callout label, effort value, card title and table heading, and an unbreakable compound (`Maatskappyregistrasienommer`, a real `af.json` value, plus `eenpersoonsondernemings` in the headings) into every button label, stand-alone link, toast, theme segment and section-header title, then `document.documentElement.scrollWidth` is measured against the viewport at 320px. **The compound is the point**: a label with spaces only proves a component can wrap between words, which is why the pass-3 version of this test passed while `Button`, `.st-link-block` and `.st-toast` were still 327–362px wide. Anything sized by its own content gets the compound;
  - **a long URL in a section header lead** is wrapped and not clipped: every text node's right edge is compared with the header's, because `scrollWidth` cannot see content an `overflow: hidden` ancestor has cut off;
  - **verification status badges are neutral** (`data-variant="status"`) and the sources list keeps `official`, so an AI check never renders in the chip that marks an official source;
  - forced colours (Chromium only, which is all Playwright can emulate): the contrast panel pauses instead of reporting every pair as FAIL, and the selected theme segment differs from the others by fill and text colour, not by border colour alone;
  - stand-alone targets are at least 44px (inline links in sentences and the card overlay are exempt);
  - the theme control (pointer, keyboard, persistence, theme-color, one row at 320px);
  - the live contrast panel reports `data-live="on"` with zero FAIL, and its "Now" ratios equal the build-time ratios for the active theme (`data-live` is asserted next to `data-failures="0"` everywhere that count is read, so the count can only come from a measurement);
  - **the panel never reports a failure it could not measure**: every token from `tokens.css` is reset to its guaranteed-invalid value on the probe element and on the probe only, so the page is styled while the measuring element is blind — the exact WebKit state described under [The live contrast panel](#the-live-contrast-panel). The panel must end at `data-live="unavailable"`, with **no** `data-failures` attribute, zero `FAIL` cells and every row still on its server-rendered `pending`. With the delivery and one-colour conditions removed it reports `data-failures="76"` and "76 of 76 pairs fail", so this test can fail;
  - **a withdrawn reading takes the table with it**: the panel measures normally, then the probe is blinded and a theme change asks for a re-measure it cannot make. The summary must reach `data-live="unavailable"` with no `data-failures`, and the table must hold no `pass` row, no ratio other than `–` and no swatch value other than `…`. Before the fix it kept all 76 `pass` rows and the previous theme's ratios;
  - axe (wcag2a/aa, 21a/aa) has no serious or critical violations in light and dark;
  - **rendered text contrast**: the computed text and background colours of about 80 component elements in both themes are composited and must reach 4.5:1. Two limits worth knowing: it samples the **first** match of each selector, not every match, and it composites `background-color` layers only, so text over the table-scroll gradients or the section pattern is not measured. A mutation run (breaking one component colour in a copy of `dist/`) confirmed it fails as it should;
  - the stacked table uses grid cells that never overlap and keeps its table, row header and cell semantics;
  - table regions are tab stops only while they scroll;
  - focus rings are visible on key controls;
  - disabled and loading buttons ignore clicks and announce only their status.
- **axe and colour contrast.** axe marks `color-contrast` as *incomplete* on most of this page (tints, gradients, overlays, inline swatches), so an axe pass is **not** contrast verification here. The contrast gate is the unit test, the live panel and the rendered-text e2e check.
- **Timeouts.** This page is large and axe is slow on it in WebKit, so the spec sets its own describe timeout. `test.describe.configure` overrides the CLI `--timeout`, so the value is **configurable**: set `PW_DS_TIMEOUT` in milliseconds (default 120000) on a loaded machine or a slow CI runner. The two axe tests also call `test.slow()`, which triples whatever is configured. A loaded machine should no longer turn the gate red without a product change.

## Known limits

- **Low data and `prefers-reduced-data`.** The low data toggle now stops the font preloads too (WP-50 Phase 2; see [Typography](#typography)). A browser that ships `prefers-reduced-data` would still get the preloads, though the CSS would not use the fonts; no stable browser ships it, and checking it in `theme-init.js` would grow every page's script.
- **Font preloads start one round trip late on a first visit.** They go through `theme-init.js` so that low data mode can stop them; fonts start about 190ms later than static preloads would at 150ms latency, while first paint comes about 250ms earlier (figures under [Typography](#typography)). Check on a real low-end phone in Phase 5; if the late swap is noticed, the alternative is static preloads for everyone, at 66,712 bytes for low data readers too.
- **Fallback metrics on Android and with Georgia were not measured live.** The Roboto and Noto Serif faces were measured from the same outlines in `@fontsource` packages, and Georgia from capsize's average widths. Whether Android Chrome matches `local('Roboto')` and `local('Noto Serif')` by those names should be checked on a real phone (WP-50 Phase 5); if it does not, the text falls through to the unadjusted system font, as before WP-50.
- **Safari table semantics.** Stacked cells are `display: grid`. Playwright's accessibility snapshot keeps table, rowheader and cell roles in Chromium and WebKit, but that is computed from the DOM. Real VoiceOver on Safari has not been checked; the Table component can add explicit ARIA table roles if needed.
- **`:has()`** drives the card ring and the segmented control's checked style. Browsers without `:has()` get the ring on the card link; the checked segment then shows only the native radio state to assistive technology, not the fill.
- **The stacked table mode has no data to run on.** `TableScroll wide` stacks a table into labelled
  cards under 640px, and `data-label` on each body cell is what makes that readable. Both of the
  corpus's five-column-plus tables (a cash book and a vehicle logbook) are column headings with no
  rows, so the labelling path renders nothing today and `tests/e2e/content.spec.ts` can only check
  that the region asks for the mode. The first wide table with rows will exercise it.
- **Print** rules: sheet-only printing is checked on the template pages under `emulateMedia('print')` (with and without JavaScript, `tests/e2e/templates.spec.ts` and `nojs.spec.ts`), and Chromium renders the tax invoice to an A4 PDF. A real print dialog, paper margins and other browsers' print engines are checked by hand only.
- **Manual assistive-technology checks** (NVDA with Firefox, TalkBack with Chrome, plan B5) were not run for this package; there are no real pages yet. They are deferred to the pages packages, which own the six B5 journeys.
- **WebKit heading weight (port artifact, to confirm on real Safari).** Playwright's Windows WebKit draws Fraunces heavy at every weight: an explicit `"wght" 300` still renders black. It is the rasteriser, not the CSS — measured advance widths are identical to Chromium (600: 369.5px, 900: 395.5px, 300: 343.7px), so the variation axis *is* being applied, and Chromium at the same weights looks right. **The type tokens were deliberately not changed for it.** Check once on real Safari (macOS and iOS) before assuming anything is wrong with the font setup; if it reproduces there, it belongs in a bug against the font or the engine, not in `tokens.css`.

## Do and don't

| Do | Don't |
| --- | --- |
| Use `var(--st-*)` for every colour, size and duration | Write hex, `rgb()`, `hsl()` or named colours outside `tokens.css` |
| Pair every status colour with an icon and words | Use colour, position or shape alone to mean something |
| Keep links in running text underlined | Remove underlines from links in a sentence, a card's text or a lone link |
| Put `.st-quiet-links` on a navigation list (contents, menus) | Hide a navigation link's underline on focus, or drop its focus ring |
| Use rooibos only for "In plain words" | Use `--st-accent` for chrome: chips, stripes, rings, active states |
| Use the duration tokens for every transition | Write a literal duration, or transition `transform` without checking reduced motion |
| Use `--st-border-strong` for control edges | Use `--st-border` for inputs, checkboxes or buttons |
| Put hue-coloured text on `--st-bg` or `--st-surface` | Put hue text on its own tint (not verified) |
| Give icon-only buttons a `label` | Put meaning in an `aria-hidden` icon |
| Use `Card` with one link for the whole card | Nest several full-card links or buttons in one card |
| Pick the card shape by what the thing is: `page` to read, `tool` to use, `type` for a kind of business, `PathSteps` for a step | Frame a page to read, or show a tool as a bare row; style a card per page instead of choosing its variant |
| Gate hover styles behind `@media (hover: hover)` and change a colour only | Lift, scale or shadow a card on hover |
| Use `.st-link-block` for a link that stands alone | Leave a lone footer link at text height |
| Test at 320px, 200% zoom, dark, forced colours and print | Assume the desktop light theme is representative |
| Test at 320px with the longest real Afrikaans label, not the English one | Ship a component whose demo strings are all short |
| Let a badge, a callout label or a button label wrap | Add `white-space: nowrap` to anything translated |
| Keep a control that needs a script hidden until its element is ready (`data-enhance`) | Show a button that does nothing until a module arrives |
| Cap text-bearing grid tracks with `minmax(0, 1fr)` | Leave an implicit `auto` track around a heading |
| Lower min-content (`overflow-wrap: anywhere`) on text in a box that is sized by its own content | Assume `min-inline-size: 0` or `hyphens: auto` fixed it |
| Let the header wrap a long URL | Hide it with `overflow: hidden` |
| Use the current figure, from the register, in a demo | Print a superseded number under a verification badge |
| Give a `role="note"` an accessible name from its visible label | Ship a bare "note" that is announced with no name |
| Say what a status means in words, next to the status | Let a coloured chip be the whole verification story |

## Internationalisation

- Allow **+25% string length** in every button, badge, tile and heading. Afrikaans is often longer than English. Components wrap instead of truncating; never set fixed widths on text containers.
- +25% is the *average*, not the worst case. Status labels are far worse: "Machine translated" (18) becomes "Masjienvertaling, nog nie nagegaan nie" (38), and "AI-checked" becomes "KI-nagegaan (Engelse teks)". `/design-system/` has a [Long labels](/design-system/#long-labels) section built from the real `trust.*` Afrikaans strings, and an e2e test injects the longest of them into every component at 320px and measures the document width. Add new components to that section.
- **Never use `white-space: nowrap` on a translated string.** It is the one declaration that turns a long label into a horizontally scrolling page, because a nowrap box is never narrower than its text and that width propagates out through every ancestor. `nowrap` is correct only for content that is short by definition and meaningless when broken: a key in `Kbd`, a table heading inside a scroll region, a `--st-token-name`, a ratio like "✓ PASS".
- Two separate things have to be right, and they are easy to confuse: **wrapping** (what the text does inside its box) and **min-content** (how wide the box insists on being). See [Wrapping and min-content](#wrapping-and-min-content).
- **No text in images.** Illustrations and the logo mark contain no words; the wordmark is real text.
- Every visible default in a component (`Callout` labels, `EffortMeter` labels, `Button` `loadingText`, `ToastRegion` label) is a prop. Pages must pass strings from `src/i18n/*.json`.
- Set `lang` on content in another language (`lang="en"` on English fallback blocks inside Afrikaans pages).
- Use logical properties (`inline-size`, `margin-inline`, `inset-inline-start`) so a future right-to-left language needs no rewrite.
- Numbers use tabular figures in tables (`.st-num`).

### Wrapping and min-content

**Afrikaans compounds in headings** (WP-50 Phase 3 review pass 1, minor 6): at 320px fifteen Afrikaans pages have a heading word longer than the line ("verifikasieregister", "Handelsmerktoepassings", "PRIVAATHEIDSKENNISGEWING"). Below 480px (review pass 2, minor 4: on a wider screen a heading word wraps whole, as before), Afrikaans h1, h2 and h3 set `hyphens: auto` with `hyphenate-limit-chars: 12 5 5`, so where the browser has an Afrikaans dictionary such a word breaks at a syllable with a hyphen and short words still wrap whole. The Chromium in this container has no dictionary for any language, so there the heading's `overflow-wrap: anywhere` still decides, and the break stays where it was ("verifikasieregiste / r"). A smaller heading would not help: the longest words do not fit 288px at any reasonable size. Check on a real Android phone in Phase 5. A soft hyphen at the compound boundary would give a correct break in every browser, but the content pipeline has no way to add one: it would mean editing the Afrikaans titles in `docs/rsa-business-toolkit-af/` by hand (and `src/data/**` must never be), so it is left for the translation workflow (backlog).

One unbreakable Afrikaans compound — `Maatskappyregistrasienommer` (27), `voorlopigebelastingbetalers` (27) — is the load every component has to carry at 320px. Two different mechanisms are involved, and fixing the wrong one looks like a fix without being one.

| | What it does | What it does **not** do |
| --- | --- | --- |
| `overflow-wrap: break-word` (the global default on `body`) | Breaks a word at render time when it cannot fit on a line by itself | Lower the box's min-content width |
| `overflow-wrap: anywhere` | The same, **and** lowers the min-content width | Change anything while the text fits |
| `min-inline-size: 0` on a flex item | Lets the item shrink below its automatic minimum | Lower the item's min-content **contribution**, which is what sizes its container |
| `grid-template-columns: minmax(0, 1fr)` | Stops a track growing to its children's min-content | Help when the child is shrink-wrapped inside the track (`justify-items: center`, `inline-flex`, `inline-block`) |
| `max-inline-size: 100%` | Caps the used width | Cap anything while an ancestor is being sized intrinsically — a percentage resolves to `none` there |
| `hyphens: auto` | Adds hyphenation where the engine has a dictionary for the page language | Work at all in WebKit on Windows (no Afrikaans or English patterns). **Progressive enhancement only** |

So: **cap the containers, and lower min-content on the text inside any box that is sized by its own content.** A block-level box in a capped track needs nothing beyond the global `break-word`. A box that shrink-wraps — a button, a stand-alone link, a toast, a badge, a heading under `justify-items: center` — is never narrower than its longest word unless that word can break, which is what `overflow-wrap: anywhere` buys.

Where the system states it:

- `.ds-page`, `.ds-section`, `.st-doc-grid`, `.st-section-header__inner`, `.st-empty` and every single-column grid on `/design-system/` cap their track with `minmax(0, 1fr)`.
- The site package adds `.st-menu__summary`, `.st-menu__link`, `.st-segmented__option`,
  `.st-toc__summary`, `.st-lang__link`, `.st-topbar__search` and `.st-topbar__menu-button`. Each is
  measured on its own by `tests/e2e/content.spec.ts`, at a width where it is on screen, and a box that
  measures zero fails: a component hidden by a media query would otherwise satisfy the test without
  being tested at all.
- `.st-btn__label`, `.st-link-block`, `.st-toast`, `.st-empty__title` and `.ds-segmented__option` set `overflow-wrap: anywhere`. Each of the five is measured on its own by the "no shrink-wrapped component is sized by its longest word" e2e test, which compares the component's own min-content width on a 2-character word against a 27-character compound. The page-level `scrollWidth` test cannot do that job: with the containers capped as well, deleting one of these declarations — or one `minmax(0, 1fr)` cap — leaves the document at 320px, because the two mechanisms mask each other at page level. Both are still wanted; only the per-component measurement can tell you which one you just deleted. On `.st-toast` it sits on the container, because the toast text is an anonymous flex item that nothing can select — `overflow-wrap` is inherited, so it reaches it. Measured at 320px before these rules, in **both** Chromium and WebKit: button label 362px, a real `af.json` string in an `EmptyState` action button 343px, `.st-link-block` 337px, `.st-toast` 327px, a theme segment 360px, a type specimen 485px.
- `base.css` sets `overflow-wrap: anywhere` on `h1`–`h6`. It is a safety net for headings that land in a container a future package forgot to cap; the containers are still capped. On a capped container the two values render **identically** — measured on `.st-section-header__title` at 320px in both engines, `break-word` and `anywhere` produce the same lines, the same 234px box and the same 320px document, including the mid-word break of "Responsibilities," that neither value can avoid once the heading is wider than its line. The only difference `anywhere` can make is one soft-wrap opportunity earlier (before a comma, say) when the word plus its punctuation does not fit but the word does.
- `.st-link-block` is `display: inline-block` with padding-based height, not `inline-flex`. A flex box makes a trailing `↗` its own item: the space before it collapses and, on a wrapped title, it floats away from the last word to the far right of the block. Inline layout keeps it in the text run, and it is what allows the link to be narrower than its longest word.

**Never** rely on `hyphens: auto`, `min-inline-size: 0` or a percentage `max-inline-size` alone to stop an overflow. Each of them can make the failure look fixed in Chromium, or in one container, while the page still scrolls sideways somewhere else.

## Print

`src/styles/print.css`, plus the light palette forced by `tokens.css`:

- A4 with 15mm margins, 11pt base size.
- Hidden: skip link, `body > header`, `body > footer`, `nav`, `dialog`, buttons and `.st-btn` links, `.js-only`, `.st-no-print`, `[data-print='hide']`, search, toasts.
- `<details>` content is expanded where the browser supports `::details-content`. JavaScript should also open `<details>` on `beforeprint`. A `.st-disclosure` prints without its chevron. "Sources for this page" is not a `<details>`: on paper its whole list prints and its "Show the other 38 sources" control does not, in every engine (WP-50 Phase 3).
- External links print their URL after the text. The generated `::after` is an `inline-block`, because text decoration propagates from the inline parent into generated content: without it the printed "(https://…)" was underlined along with the link. It carries `max-inline-size: 100%` and `overflow-wrap: anywhere` so a long URL still wraps inside the page.
- Checkboxes print as empty boxes, unless `<html data-print-ticks>` is set.
- A `.st-quiet-links` list prints with its underlines (paper has no hover).
- When an element has `data-print-sheet`, only that element prints (templates). Everything that is not the sheet, inside it or one of its ancestors gets `display: none`, so no blank pages are left behind and the sheet stays in normal flow.
- Headings avoid breaks after; table rows, figures, callouts and code avoid breaks inside; table headers repeat.
- Verified automatically on the template pages (see Known limits for what is not).

## Forced colours and preferences

- `forced-colors: active`: focus rings become 3px `CanvasText` (the same width as the ink ring), cards, callouts, badges and toasts get visible borders, native checkboxes keep system rendering, the loading spinner keeps its gap, and illustration fills and the shweshwe pattern are removed.
- The selected theme segment is filled with `Highlight`/`HighlightText` behind `forced-color-adjust: none`. A selected state must never come down to border colour alone, which is what happens if you let forced colours paint a transparent border as `CanvasText` and the fill as `Canvas`.
- The live contrast panel **pauses** in forced colours and says so. The system palette replaces every author colour, so `getComputedStyle` returns the same forced value for every token and each pair would read "1.00:1 ✗ FAIL". Reporting 76 failures would tell a high-contrast user the design system is broken when nothing has drifted. The panel resumes when the override is turned off; the build-time Light and Dark columns stay visible throughout.
- `prefers-reduced-motion: reduce`: gentler, not zero (WP-50, D3). Nothing moves (no lift, slide, spinner rotation, drawing ring or keyframe animation); fades and colour changes stay at 120ms or less. See [Motion](#motion).
- No smooth scrolling anywhere. `html:focus-within { scroll-behavior: smooth }` animated the scroll on every Tab, so it was removed (WP-50a, `review-animations` verdict Block in the WP-50 audit); contents links jump too.
- `prefers-reduced-data: reduce` or `html[data-low-data]`: system fonts, no decorative pattern; with the toggle, no font preloads either.

## Contribution checklist

1. New colour? Add it to all three palette blocks in `tokens.css` (light, explicit dark, system dark). Add every pair a component renders with it to `CONTRAST_PAIRS` in `src/scripts/color.ts`, then run `pnpm test`.
2. No literal colours outside `tokens.css`; `pnpm lint` must pass (ESLint, Prettier, Stylelint).
3. Every interactive element is at least 44×44px, keyboard reachable, and has a visible `:focus-visible` ring.
4. Meaning never relies on colour alone: add an icon and text.
5. Check light, dark, forced colours, reduced motion, 320px width, 200% zoom and print.
6. Add the component, in every state, to `/design-system/`, and add its text elements to the rendered-contrast e2e list.
7. No inline `<script>`: use a normal Astro `<script>` (module). Only render-blocking code goes in a plain `.js` file imported with `?url`.
8. Scripts that read computed styles wait until the tokens resolve (see Scripts).
9. Strings come from props (i18n), with room for +25% length. Then check the component again at 320px with a 38-character Afrikaans label **and** with one unbreakable 27-character compound, in Chromium **and** WebKit — several of these rules behave differently per engine. Read [Wrapping and min-content](#wrapping-and-min-content) before reaching for a fix, add the component to the Long labels section of `/design-system/`, and add its selector to the long-label e2e injection. If the component's box is sized by its own content, add it to `SHRINK_WRAPPED` in the same spec as well — the page-level injection alone will not fail when its declaration is deleted.
10. Any real number in an example comes from the verification register, with the register's date. If a figure can go stale, add it to `tests/unit/forbidden-strings.test.ts` when it does.
11. Rooibos (`--st-accent`) is only for "In plain words", and the focus ring is ink. Do not give either a new job without recording why here. Transitions use the duration tokens and move nothing that reduced motion would object to (see [Motion](#motion)).
12. Run `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm exec playwright test tests/e2e/design-system.spec.ts --project chromium --project webkit --project mobile`.
