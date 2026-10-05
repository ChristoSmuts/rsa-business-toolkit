# Stoep design system

Stoep is the design system of the SA Business Toolkit web app. A stoep is the porch in front of a South African house: an open, familiar place where neighbours talk plainly. The system should feel the same.

- Source of truth for every colour and scale: `src/styles/tokens.css`.
- Live reference: `/design-system/` (noindex, excluded from the sitemap). It shows every token, every component and a contrast panel that re-measures colours in the browser.
- Automated checks (details under [Automated checks](#automated-checks)): `tests/unit/tokens-contrast.test.ts` and `tests/e2e/design-system.spec.ts`.

## Principles

1. **Plain first.** Content is the product. Components get out of the way of the words.
2. **Warm, not corporate.** Paper, earth and veld: off-white paper, veld green, rooibos accent, section hues taken from the landscape.
3. **Colour never carries meaning alone.** Every status has an icon and a text label. Links are always underlined. Meters and rings always have written values.
4. **Fast on a cheap phone.** No raster images, two self-hosted variable fonts, one tiny blocking script per page, CSS-only decoration that switches off under reduced data.
5. **One source of truth.** Literal colours exist only in `tokens.css` (Stylelint enforces this, including in `.astro` style blocks). Everything else uses `var(--st-*)`.

## Colour

### Rationale

- **Background** is a warm paper white (`#FBF8F3`), not pure white, so long reading is gentle. Cards are pure white (`--st-surface`) to lift off the page.
- **Primary** is veld green (`#1E5A3C`). It is used for links, primary buttons, checkbox fills and progress. Green reads as "go" and as land, without the saturated look of a bank or a government portal.
- **Accent** is rooibos (`#B5561A`). It is used for the focus ring and for spoken-aside "In plain words" callouts. The ring colour differs from the link colour, so focus is visible on links.
- **Section hues** give each part of the toolkit an identity: Start here (ochre `#8A5A00`), Core (veld `#1E5A3C`), Branding (protea `#9C2E63`), Paperwork (teal `#1F6B6B`), Your kind of business (clay `#A3401A`), Look it up (dusk `#4A3F8F`). Use them for text, stripes and icons, and as soft tints (`--st-hue-*-tint`) with `--st-text` on top.
- **Section tints** mix the hue into the page background. `--st-tint-strength` is the default (**18% light, 22% dark**); plan B4 says 12%, and at a flat 12% Core, Paperwork and Look it up read as the same greige. Four hues use the default and four carry a per-hue strength, because a flat strength leaves some pairs indistinguishable. See [Section tints](#section-tints) for the measured numbers and why the separation stops where it does.
- **Dark theme** keeps the same roles with lighter, less saturated hues on a warm near-black (`#15130F`).
- **Decorative border** (`--st-border`) never marks a control boundary. Controls use `--st-border-strong` (at least 3:1).

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

### Verified contrast (WCAG 2.x)

Text needs at least 4.5:1. Control borders and focus indicators need at least 3:1. Ratios are truncated to two decimals, never rounded up. The same list (`CONTRAST_PAIRS` in `src/scripts/color.ts`) drives the unit test and the live panel. It holds the plan B4 pairs plus every text, link and focus-ring pair the components render: callout bodies and links on every soft background, links and focus rings on every section tint, the inverse toast and the danger hover.

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
| `--st-focus` | `--st-bg` | Focus ring on page | 3:1 | 4.59:1 | 8.61:1 |
| `--st-focus` | `--st-surface` | Focus ring on cards | 3:1 | 4.87:1 | 7.88:1 |
| `--st-focus` | `--st-surface-2` | Focus ring in note callouts and code | 3:1 | 4.21:1 | 7.06:1 |
| `--st-focus` | `--st-primary-soft` | Focus ring in official callouts and badges | 3:1 | 4.15:1 | 5.79:1 |
| `--st-focus` | `--st-accent-soft` | Focus ring in plain-words callouts | 3:1 | 4.18:1 | 6.77:1 |
| `--st-focus` | `--st-warning-bg` | Focus ring in warning callouts | 3:1 | 4.41:1 | 6.43:1 |
| `--st-focus` | `--st-info-bg` | Focus ring in info callouts | 3:1 | 4.12:1 | 6.32:1 |
| `--st-focus` | `--st-hue-start-tint` | Focus ring on Start here tint | 3:1 | 3.55:1 | 5.29:1 |
| `--st-focus` | `--st-hue-core-tint` | Focus ring on Core tint | 3:1 | 3.40:1 | 5.93:1 |
| `--st-focus` | `--st-hue-branding-tint` | Focus ring on Branding tint | 3:1 | 3.46:1 | 6.91:1 |
| `--st-focus` | `--st-hue-paperwork-tint` | Focus ring on Paperwork tint | 3:1 | 3.74:1 | 5.10:1 |
| `--st-focus` | `--st-hue-types-tint` | Focus ring on Business types tint | 3:1 | 3.85:1 | 6.07:1 |
| `--st-focus` | `--st-hue-lookup-tint` | Focus ring on Look it up tint | 3:1 | 3.37:1 | 6.05:1 |
| `--st-primary` | `--st-bg` | Primary button edge, checkbox fill | 3:1 | 7.67:1 | 9.26:1 |

These match the plan's quoted ratios to one decimal (text on bg 16.2/15.8, muted 6.9/8.1, on-primary 8.1/7.7, on-accent 4.9/7.8, accent-text 5.9/8.6, focus 4.6/8.6, border-strong 4.4/4.9). Two notes on the plan's figures: dark border-strong on bg measures 4.90:1 (the plan says 4.5), and the Start here hue on light bg measures 5.59:1, which rounds to the plan's 5.6 (the unit test asserts 5.59, not a looser 5.5).

**The light focus ring on a section tint is the tightest pair in the system** (3.37:1 to 3.85:1 against a 3:1 minimum) and it is what caps tint separation. See [Section tints](#section-tints) before changing any `--st-tint-strength-*`.

### Section tints

The six tints must be tellable apart, and separation is measured in **OKLab** (ΔE_OK), not sRGB. Euclidean distance in sRGB flatters dark colours: the two dark pairs that review pass 3 called "near twins" were 6.7 and 8.1 sRGB units apart and passed the old `> 5` test comfortably.

Measured strengths and worst pairs:

| Theme | start | core | branding | paperwork | types | lookup | Worst pair (ΔE_OK) | Worst focus ring |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light | 18% | 18% | 18% | 14% | 12% | 18% | **0.0280** Start here vs Core | 3.37:1 |
| Dark | 26% | 22% | 16% | 28% | 22% | 22% | **0.0389** Core vs Your kind of business | 5.10:1 |

Before this round, with a flat strength per theme, the worst pairs were 0.0141 (light Start here vs Your kind of business) and **0.0126** (dark Core vs Paperwork) — the two dark pairs reported in review. The unit test asserts **ΔE_OK ≥ 0.025** for every pair in both themes, which those three pairs fail and the current palette passes.

**Why the separation stops there.** A tint darkens as its strength rises, and the light focus ring on a tint is already the tightest pair in the system. The search found a light configuration reaching ΔE_OK 0.0400, but it puts that ring at **3.02:1** against a 3:1 minimum — a 0.02 margin. Accessibility wins over separation, so the light tints were instead chosen to lose **no margin at all**: every light text, link and focus pair is at least as good as it was at a flat 18%, and Paperwork and Your kind of business are deliberately *weaker* than the default, which both separates them from their neighbours and raises their focus contrast (3.52 → 3.74 and 3.51 → 3.85). Dark has much more headroom, so three hues move there and the worst ring is still 5.10:1.

If you change a hue or a strength, re-run `pnpm test`: the test asserts each tint against its hue, background and strength, so the numbers above can be re-derived rather than trusted.

## Typography

| Role | Family | Details |
| --- | --- | --- |
| Headings and display | Fraunces Variable (`@fontsource-variable/fraunces`, `opsz` + `wght` axes) | Weight 600, `font-variation-settings: 'opsz' 48` for headings, `144` for `.st-display` |
| Body and UI | Instrument Sans Variable (`@fontsource-variable/instrument-sans`, `wght`) | 400 to 700, normal and italic |
| Code | System monospace stack | `--st-font-mono` |

- Subsets: latin and latin-ext only, with the fontsource `unicode-range` values. Latin-ext covers Afrikaans (ê, ô, ë, ï) and future languages (ḓ, ṱ, ṋ, ṅ). The design-system page shows the test string `Kôsê, sê, môre, ëïü, ḓ ṱ ṋ ṅ` in every family.
- `font-display: swap`. `Base.astro` preloads only the two latin woff2 files, imported with Vite `?url` so the hashed URLs match the ones in `base.css`.
- Metric-matched fallbacks keep layout shift low while fonts swap. Values were measured from the font files with `@capsizecss/unpack`:
  - `Fraunces fallback` = `local('Georgia')`, `size-adjust 116.2%`, `ascent-override 84.17%`, `descent-override 21.95%`, `line-gap-override 0%`.
  - `Instrument Sans fallback` = `local('Arial')`, `local('Roboto')` …, `size-adjust 102.74%`, `ascent-override 94.42%`, `descent-override 24.33%`, `line-gap-override 0%`.
- Low data (`prefers-reduced-data: reduce` or `html[data-low-data]`) switches `--st-font-display` and `--st-font-body` to the fallback stacks, so CSS never requests the webfonts. See [Known limits](#known-limits) for the preloads.
- Display figures use no-break spaces between digit groups (`R 1 234.56` with U+00A0), so an amount never breaks across lines. The decimal separator for rand amounts follows the toolkit markdown (i18n package).

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

Body line height 1.6; headings 1.15 (h3 and h4 1.3). Measure `--st-measure: 68ch`, tables and sheets `--st-measure-wide: 90ch`. The pipeline emits no h4 or deeper.

## Other tokens

| Group | Tokens |
| --- | --- |
| Spacing | `--st-space-1` … `--st-space-9` = 4, 8, 12, 16, 24, 32, 48, 64, 96px (in rem) |
| Radius | `--st-radius-sm` 4px, `-md` 8px, `-lg` 14px, `-pill` 999px |
| Shadow | `--st-shadow-1` (resting card), `--st-shadow-2` (lifted card, toast) |
| Motion | `--st-duration-fast` 120ms, `-base` 200ms, `-slow` 320ms, `--st-ease`, `--st-lift` −2px. Under `prefers-reduced-motion: reduce` durations become 0ms and the lift 0px; `base.css` also clamps all animations and transitions. |
| Layers | `--st-z-sticky` 10, `-drawer` 40, `-dialog` 50, `-toast` 60 |
| Targets | `--st-target` 44px, `--st-target-lg` 52px |
| Borders and focus | `--st-border-width` 1px, `--st-focus-width` 2px, `--st-focus-offset` 2px, `--st-stripe-width` 4px |
| Layout | `--st-container` 1360px, `--st-sidebar` 272px, `--st-toc` 240px, `--st-topbar` 56px, `--st-gutter` fluid 16 → 32px |

## Grid and breakpoints

Custom properties cannot be used inside media queries, so breakpoints are literal and must be used consistently, with range syntax (`@media (width >= 768px)`):

| Name | Width | What changes |
| --- | --- | --- |
| sm | 480px | Full-width block buttons become inline |
| md | 768px | Roomier section headers, two-column definition lists |
| lg | 1024px | Document sidebar column appears (`.st-doc-grid`) |
| xl | 1280px | In-page TOC column appears |
| (tables) | 640px | `TableScroll wide` stacks into cards below this width |
| (theme control) | 560px, 400px | The segmented control drops its tick, then its icons |

The last two are component-level widths, not system breakpoints: they belong to one component each and no layout depends on them.

Layout utilities (`src/styles/utilities.css`): `.st-container`, `.st-measure`, `.st-stack` (+ `-sm`, `-lg`, `-xl`), `.st-flow`, `.st-cluster`, `.st-grid` (`--st-grid-min`), `.st-doc-grid` (`272px | minmax(0,1fr) | 240px`), `.st-visually-hidden`, `.st-link-block` (a stand-alone link with a 44px target; see [Wrapping and min-content](#wrapping-and-min-content)), `.js-only`, `.no-js-only`, `.st-num`, and the `[data-section]` hue scopes.

## Components

All components live in `src/components/ui/` (primitives) and `src/components/illustrations/`. Every interactive target is at least 44×44 CSS px and shows a 2px `--st-focus` ring with a 2px offset on `:focus-visible`.

| Component | Props | States | Accessibility |
| --- | --- | --- | --- |
| `Button` | `variant` primary/secondary/ghost/danger, `size` md/lg, `href`, `type`, `iconStart`, `iconEnd`, slots `icon-start`/`icon-end`, `loading`, `loadingText`, `disabled`, `block` | default, hover, active, focus, loading (variant fill, spinner, `cursor: progress`), disabled (dashed, muted, `--st-surface-2`) | `href` renders `<a>`. Disabled and loading use `aria-disabled="true"` (focusable, announced). `theme-init` swallows clicks on `.st-btn[aria-disabled="true"]`, and an inactive `submit`/`reset` renders as `type="button"`, so it cannot submit even without JavaScript. Loading adds `aria-busy`, hides the visible label from assistive technology and exposes only `loadingText` ("Saving", not "Saving Saving"). The spinner stops under reduced motion and keeps its gap in forced colours. The component owns `aria-disabled`, `aria-busy` and, while loading, the accessible name: those are spread **after** the caller's attributes, so a caller cannot undo the inactive state or replace `loadingText`. An inactive `href` button still renders its `icon-end`, so it does not change width when it becomes active. |
| `Card` | `title`, `titleLang`, `href`, `section`, `eyebrow`, `headingLevel`, slots `illustration`, `meta` | static, hover lift, focus (ring on the whole card) | Single tab stop: the title link's `::after` covers the card. The meta row sits above the overlay, so links in it stay usable. The whole-card ring uses `:has()`; browsers without it get the ring on the link itself (`@supports not selector(:has(*))`). |
| `Callout` | `variant` plain-words/note/warning/official/info, `label`, `icon`, `labelId` | – | `role="note"` named by its own visible label through `aria-labelledby`, so it is announced as "About this page, note" rather than a bare "note". The id is generated (`src/scripts/uid.ts`) unless you pass `labelId`. Icon plus visible text label; the icon stays beside the first line when a long label wraps. Plain-words is never collapsed. |
| `Badge` | `variant` entity/type/official/status/effort/mt/flag, `icon` (or `null`) | – | Icon plus text; tinted colours are decoration only. `status` (who checked a page, and when) is deliberately neutral — see [Notices and sources](#notices-and-sources-plan-d5). **Badges wrap.** A label longer than the row it sits in breaks onto a second or third line instead of pushing the page sideways, the icon stays beside the first line, and the corner radius is `--st-radius-lg`, which a browser clamps to an exact pill on a one-line badge and leaves as a calm rounded rectangle on a wrapped one. `flag` reuses the verified warning pair for "Not confirmed" and other verification flags. |
| `EffortMeter` | `level` 1–5, `label`, `levelLabels`, `scaleText` | five levels | Bars are `aria-hidden`; the level is written out ("Medium to high") plus hidden "(4 of 5)". Defaults follow the toolkit's own scale: Lowest, Low to medium, Medium, Medium to high, High. |
| `ProgressRing` | `value`, `max`, `label`, `size`, `showValue` | empty, partial, complete | SVG `role="img"` with `aria-label` ("Part A: 12 of 34 done"). The percentage text is `aria-hidden` and sized to clear the stroke at 100%. The arc draws in once; reduced motion skips it. |
| `Icon` | `name` (`lucide:*`), `label`, `size` | – | `aria-hidden` unless `label` is given, then `role="img"` + `aria-label`. Use a label only when the icon is the only content. `.st-icon` is `inline-block` with `vertical-align: -0.125em`, so an icon inside a sentence (an error message, an external-link ↗, an "Official" marker) stays on the line even though the reset makes every other `svg` a block. Flex and grid children are blockified anyway, so icon rows in buttons and badges are unaffected. Icons come from Lucide; `src/icons/` exists (with a README and no SVGs) because astro-icon reads its `iconDir` on every build and otherwise logged `Failed to load icons from "src/icons": ENOENT` into every build and CI log. |
| `Kbd` | – | – | Native `<kbd>`. Keeps `white-space: nowrap`: a key name is short by definition, and breaking `Shift` across two lines would read as two keys. Do not put a sentence in a `Kbd`. |
| `VisuallyHidden` | `as`, `id` | – | Uses `.st-visually-hidden`. |
| `SectionHeader` | `section`, `title`, `eyebrow`, `level` 1–4 (default 1), `id` | six section hues | Hue stripe, tint, CSS-only shweshwe-inspired dot pattern (`aria-hidden`, removed under reduced data, low data and forced colours). Use `level` 3 or 4 when the header sits inside another page's outline. The eyebrow uses `--st-text` with a hue dot, never hue-coloured text on the tint. Code in the lead gets a light surface veil instead of beige `surface-2`. Under 768px the header is only as wide as the reading column, so the pattern moves from the inline end to a 3rem band along the bottom, out from behind the lead text. The header itself does **not** clip (`overflow: hidden` sits on the pattern's own box): clipping hid a lead paragraph that held a long URL instead of wrapping it, which is loss of content under WCAG 1.4.10 and which no `scrollWidth` test can see. The inner grid states `minmax(0, 1fr)` for the same reason. |
| `EmptyState` | `title`, `icon`, `headingLevel`, slot `actions` | – | Real heading; icon decorative. Its grid states `minmax(0, 1fr)` and the title lowers its own min-content width (`overflow-wrap: anywhere`), because `justify-items: center` shrink-wraps every item. `hyphens: auto` on the title is a progressive enhancement only — Chromium hyphenates here, WebKit on Windows has no dictionary and breaks mid-word — so it may never be the mechanism that stops an overflow. |
| `ToastRegion` | `id`, `label`, `static` | neutral (inverse), success, info, warning, danger | One `role="status"` region per page (implies polite; `aria-atomic="false"` so each toast is read on its own). Toasts need an icon plus text. Remove them after about 4 seconds. |
| `TableScroll` | `labelledby`, `wide` | overflow shadows, stacked cards < 640px | Renders `<st-table-scroll role="region" tabindex="0" aria-labelledby>`. The element (`src/scripts/table-scroll.ts`) removes the tab stop, role and label while nothing overflows and restores them on resize; without JS the region always stays focusable. The region is `position: relative`, so it is the containing block for anything positioned inside it: an `overflow` ancestor only clips descendants it is the containing block for, and without it every absolutely positioned element in a table escaped the scroll region and widened the page — a `.st-visually-hidden` span in a cell and the `thead` the stacked mode hides both did, measured as a 581px document at 320px. Nothing about that is visible, and no bounding box shows it; only `documentElement.scrollWidth` does. For `wide`, set `data-label` on every body cell. Each stacked cell is a two-column grid (label, value), so a wrapped label makes the row taller and never overlaps the next row. **Wrap cell content that mixes text and elements in one element** (for example `<span>`), otherwise each text run becomes its own grid row. The generated label uses `content: attr(data-label) / ''`, so screen readers hear the column header once. The element never removes the tab stop from itself while it holds focus (rotating the phone or closing a sidebar would otherwise drop focus to `<body>`); it re-checks on `blur`. |
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
| `src/layouts/Doc.astro` | every document | Build plan B6 in order. Business-type documents add the effort meter, "Read Core first" and the related types; the checklist says it is a reminder list; a template says when its rules were checked. |
| `src/components/pages/BusinessTypeTiles.astro` | home, `business-types/` | The six types as tiles with effort meters. The hub document shows them above its text (B6); it leaves out the General tile, which would link to itself. |
| `src/components/pages/SectionLanding.astro` | `start/`, `core/`, `branding/`, `paperwork/`, `look-it-up/` | Cards built from each document's own summary and reading time. |
| `src/pages/[...locale]/index.astro` | home | The three 2026 figures come from `src/lib/home.ts`, each tied to an official register entry; `tests/unit/site/home.test.ts` fails if a figure is not in its source's own "supports" text. |
| `contents.astro`, `templates/index.astro`, `about.astro`, `search.astro` | the app pages | The search page is a GET form, one sentence saying full search is not ready (the same with or without JavaScript; the loading and failure messages belong to WP-33's client), and the common questions from "How to use this toolkit". About lists the shortcuts that work and has the settings (WP-30; the search keys join the table with `SEARCH_AVAILABLE`); the header leaves out the `/` hint until WP-33 adds the shortcut. |
| `src/pages/404.astro` | `/404.html` | Both languages on one page, because the server cannot know which one the reader wanted. |
| `src/layouts/Page.astro` | all of the above | Canonical, `hreflang` with `x-default`, Open Graph and a description. Every page is listed in every enabled locale, matching the sitemap; an Afrikaans fallback page is the Afrikaans page for its URL. |

Three flags in `src/lib/routes.ts` keep the site from offering what is not built:

- `WIZARD_AVAILABLE` (WP-31): no page links to the wizard or My path. The Tools menu, the drawer, the
  "Find my path" button, the trust line about "your answers" and the hero's "only the steps that
  apply to you" are left out.
- `SEARCH_AVAILABLE` (WP-33): `/search/` and the 404 page show no search form, the header shows no
  `/` hint, and the home page's actions are "Read Core: start here" and the contents.
- `TEMPLATES_FILLABLE` (WP-32): the templates index and the drawer describe what the template pages
  are now, what each document must show with a sample layout, not a form to fill in.
- `CHECKLIST_SAVES` (WP-30, **on**): while it was off, the checklist was described as a list to
  print and tick and every checklist page said its ticks were not saved yet. On, see
  [Interactive pieces](#interactive-pieces-wp-30).

With `SEARCH_AVAILABLE` off, the header and drawer carry no Search link; the search page's common
questions are linked from the footer instead.

Each package sets its flag to `true` in the change that builds the feature.

The top bar is sticky only from 1024px and only with JavaScript. On a phone it wraps to two or three
rows, and without JavaScript it carries the theme hint and, below 1024px, every menu, so pinned it
would cover anchor targets and focus. Where it is sticky its height still varies (one row at 1280px,
two at 1024px), so the scroll padding is not a constant: `trackTopbar()` in
`src/scripts/navigation.ts` publishes the bar's measured height as `--st-topbar-offset` (0 while the
bar is not sticky), and `SiteHeader.astro` sets `scroll-padding-block-start` from it. That rule owns the
scroll padding on every page with the header: it outranks the `html` rule in `base.css`, so a change
there has no effect on those pages. Below 1280px, on a page with the table of contents and with
JavaScript, it also adds `--st-toc-pill-space` (one 44px line plus a gap), the room the "Now
reading" pill takes, so a heading reached by a link lands below the pill rather than under it.

Fenced blocks: prompts, snippets and examples are prose and wrap; template previews and listings
are layouts, keep `white-space: pre`, and are the only ones that can scroll, as a named region.

On an Afrikaans route that falls back to the English document, the English text is marked
`lang="en-ZA"` wherever it appears: the blocks, the `<h1>`, the summary, the terms, the table of
contents, the breadcrumb and sidebar titles, and the register's own text in "Sources for this page".
Inside the blocks the labels and document titles are English too (`ContentContext.contentLang`), so a
fallback block is one English island rather than English text with Afrikaans labels read in an
English voice. Everything around the content, and every URL, stays in the reader's language.

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
| `<st-checklist-tools>` | `checklist.ts` | `ChecklistSummary` | `/checklist/` only: the "Show" radios (Everything / Not done yet) and "Remove ticks", which asks in a `ConfirmDialog` and then says "All ticks were removed." in a polite status line. "Not done yet" hides what is ticked **when it is chosen**; a box ticked afterwards stays put, so focus never vanishes. A choice the browser restores (Back, a reload that keeps form state) is applied when the element connects. "Only what applies to me" is WP-31. | Hidden with the summary. |
| `<st-storage-notice>` | `storage-notice.ts` | `TaskListBlock` (first checklist), `Settings` | Rendered `hidden`; shown while `storageAvailable` is `false`. A warning `Callout` with the right `storage.*` / `checklist.storageUnavailable` text. With `data-show="available"` it is the opposite: the "Ticks are saved on this device only" line wraps itself in one, so it goes when the warning comes and the page never says both. | Stays hidden. |
| `<st-copy>` | `copy.ts` | `CodeBlock` (prompts only) | Shows its `hidden` button. Copies the prompt's `<pre>` text exactly, says "Copied" with a tick in place of the copy icon for two seconds and "Prompt 2 copied" in its `role="status"` line; if the clipboard refuses, selects the text and says how to copy it. Records the prompt in `promptsCopied` (`<doc id>#<block id>`). The button's visible text is `prompts.copy`, its name `prompts.copyNamed` ("Copy prompt 2: Logo brief"). | No button. The text is all there and copyable by hand. |
| `<st-toc>` | `toc.ts` | `TableOfContents` (both variants) | `display: contents`. Scroll-spy: the link to the last heading that has passed the scroll-padding line gets `aria-current="location"` (a stripe and weight, never colour alone). Below 1280px a sticky one-line "Now reading" pill names it once the list has scrolled away; it links back to the list and opens it, and its name says so (`nav.currentSectionLabel`: "Now reading: Tax basics. Open the list of sections."). No smooth scrolling of its own; the pill's fade is a duration token that reduced motion sets to 0. | Plain anchors; no pill. |
| `<st-setting>` | `settings.ts` | `Settings` (`/about/`) | One `role="switch"` checkbox bound to `shortcuts` or `lowData`. A switch changed before the module connected is kept and saved. While `SEARCH_AVAILABLE` is off the help lines use the `…Static` strings, which do not mention `/` or loading search. | Hidden; one line says some tools need JavaScript. |
| `<st-clear-data>` | `settings.ts` | `Settings` | "Clear all my data": `ConfirmDialog`, then `clearAll()` and "All your data was removed from this device." | Hidden. |
| `<st-lang-banner>` | `lang-banner.ts` | `LangBanner` (English home only) | Shown from the first paint, so it never shifts the page: `theme-init.js` sets `<html data-st-lang-offer>` when `st.lang` is not the page's language, a CSS rule per language shows the banner whose `data-locale` matches it, and the element keeps it in step with the store. Shown while `st.lang` is a language other than the page's: the message and actions in **that** language, with its `lang`. "Gaan voort in Afrikaans" is a plain link (never a redirect); "Stay on this page" saves the page's language; close hides it for this page view. Focus moves to `<main>` when it goes. A saved value that is not an enabled language shows nothing: the first-paint rule is per language. | Not shown: `theme-init.js` sets the attribute that shows it, and it needs JavaScript too. |
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
editable content (`isTypingTarget`) or while a `<dialog>` is open, and `?` only while single-key shortcuts are on. `/` and Ctrl+K
are WP-33's: its listener checks `isTypingTarget(event.target)` and, for `/`, `shortcutsEnabled()`,
and its rows appear in the `/about/` table when `SEARCH_AVAILABLE` is on.

Low data: the `lowData` store sets `<html data-low-data>`, which `tokens.css` already maps to the
system fonts and no pattern. `theme-init.js` applies it before paint from `st.lowData`.

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
before any module, so it reads `st.theme`, `st.lowData` and `st.lang` itself, in the formats the store writes. The store is built on `nanostores` alone; it does not use `@nanostores/persistent` (removed), because its adapter has to survive a throwing `localStorage`.

### Illustrations

Seven inline SVGs: `VehicleDealer` (bakkie), `FoodBusiness` (pot with steam), `BeautyCare` (comb and scissors), `RetailOnline` (shop awning with parcel), `ServicesTrades` (spanner and ladder), `ProfessionalCreative` (pencil and laptop), `General` (row of small shapes).

- Hand-authored geometric shapes, each under 2 KB, `aria-hidden="true"`, `focusable="false"`.
- Business-type art belongs to "Your kind of business" (`data-section="types"`). The design-system page adds a separate, labelled hue demo row.
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

On an **Afrikaans page** the Afrikaans AI notice comes first in the article header and says the *English* text was checked, and the machine-translation notice (`Callout variant="warning"`, `icon="lucide:languages"`) sits directly under it, in the same header. Neither notice is dismissible. Put the link to the English version inside the MT notice with `lang="en"` on the link text.

`Callout` names its own `role="note"` from its label, so a screen reader announces "About this page, note" rather than a bare "note".

### Sources for this page

A heading plus `<ul role="list">` (`.st-stack`). Each entry has:

- the **title as a link**, with `.st-link-block` and an external-link `Icon` (`lucide:external-link`) inside the link text, plus `rel="noopener"`. The icon belongs in the last text run, and `.st-link-block` is inline layout, so it stays there when a long translated title wraps;
- `Badge variant="official"` when the source is official, or `Badge variant="flag"` ("Not an official source") when it is not — never silence, and never colour alone;
- a `.st-hint` line beginning "What this source supports: …", so a reader can tell which fact rests on which source.

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
- **Blocking theme init.** `src/scripts/theme-init.js` is plain JavaScript (checked with `// @ts-check`). `Base.astro` imports it with `?url`; Vite copies the file unchanged with a hashed name (it does not compile `?url` imports, which is why the file is `.js` and not `.ts`) and Base loads it with `<script is:inline src={url}>`, a classic render-blocking script right after the theme-color metas. About 1.2 KB unminified.
- **Everything else** is a normal Astro `<script>`: bundled as an ES module, deduplicated per page, able to share chunks and use `import()`. Component scripts (for example `TableScroll`) and page scripts (the design-system page imports `theme-control` and `design-system-contrast`) work the same way.
- `astro.config.ts` sets `vite.build.assetsInlineLimit` to a **function**, not to `0`. Astro inlines a processed script bundle, and Vite a `?url` asset (as a `data:` URI), when it is under that limit, and `script-src 'self'` would block both; but a flat `0` also switched off Astro's `inlineStylesheets: 'auto'`, so a page with a few hundred bytes of scoped CSS paid for an extra render-blocking request. The function returns `false` for everything except `.css`, where it returns `undefined` and the default size limit applies. Result: zero inline `<script>` on any page, and small stylesheets inline again (`style-src` already allows `'unsafe-inline'`). E2e tests check both on `/` and `/design-system/`.
- Only the CSS chunk that carries the design tokens is named `stoep.[hash].css`; page CSS keeps Rollup's own name (`assetFileNames` matches on `originalFileNames`). Three files all called `stoep.*` could not be told apart in DevTools or a budget report.
- Module scripts run after parsing but, in WebKit, **before stylesheets that come later in `<head>`** have applied (Astro emits page CSS links after its scripts). A script that reads computed styles must therefore check that the tokens resolve — and it must check on **the element it is about to measure**, not on `documentElement`. See [The live contrast panel](#the-live-contrast-panel) for why the difference is not academic.
- `localStorage` is allowed only in `src/lib/store.ts` and `src/lib/storage/**` (ESLint allow-list; `src/scripts/**` left it with WP-30). `theme-init.js` reads `st.theme`, `st.lowData` and `st.lang` itself, because it must run before any module loads; it is plain JavaScript, outside the TypeScript rule, and the one documented exception.
- **JavaScript budget** (plan B3 flow 9: 25 KB gzipped on document pages). Measured on the WP-30 build: the heaviest document pages load 14 script files, 39.9 KB raw and **15.9 KB gzipped** (each file gzipped on its own and summed, `theme-init` included); the store chunk (nanostores and `zod/mini`) is 7.2 KB of that. `/about/` is 13.2 KB and the home page 12.8 KB. How to measure: `docs/testing.md`.
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

- **Low data and preloads.** The two `<link rel="preload">` font files (about 97 KB) are still fetched in low-data mode; a meta-level preload cannot react to a runtime toggle, and `prefers-reduced-data` ships in no stable browser. The toggle landed on `/about/` (WP-30) and this is still true: the preloads come after `theme-init.js` in `<head>`, so it cannot remove them, and moving them would cost every other reader the early font request. The fonts themselves are not used in low-data mode.
- **Safari table semantics.** Stacked cells are `display: grid`. Playwright's accessibility snapshot keeps table, rowheader and cell roles in Chromium and WebKit, but that is computed from the DOM. Real VoiceOver on Safari has not been checked; the Table component can add explicit ARIA table roles if needed.
- **`:has()`** drives the card ring and the segmented control's checked style. Browsers without `:has()` get the ring on the card link; the checked segment then shows only the native radio state to assistive technology, not the fill.
- **The stacked table mode has no data to run on.** `TableScroll wide` stacks a table into labelled
  cards under 640px, and `data-label` on each body cell is what makes that readable. Both of the
  corpus's five-column-plus tables (a cash book and a vehicle logbook) are column headings with no
  rows, so the labelling path renders nothing today and `tests/e2e/content.spec.ts` can only check
  that the region asks for the mode. The first wide table with rows will exercise it.
- **Print** rules (sheet-only printing, hidden chrome) have no automated check yet. The templates package must verify sheet-only printing with `emulateMedia('print')` once a template page exists.
- **Manual assistive-technology checks** (NVDA with Firefox, TalkBack with Chrome, plan B5) were not run for this package; there are no real pages yet. They are deferred to the pages packages, which own the six B5 journeys.
- **WebKit heading weight (port artifact, to confirm on real Safari).** Playwright's Windows WebKit draws Fraunces heavy at every weight: an explicit `"wght" 300` still renders black. It is the rasteriser, not the CSS — measured advance widths are identical to Chromium (600: 369.5px, 900: 395.5px, 300: 343.7px), so the variation axis *is* being applied, and Chromium at the same weights looks right. **The type tokens were deliberately not changed for it.** Check once on real Safari (macOS and iOS) before assuming anything is wrong with the font setup; if it reproduces there, it belongs in a bug against the font or the engine, not in `tokens.css`.

## Do and don't

| Do | Don't |
| --- | --- |
| Use `var(--st-*)` for every colour, size and duration | Write hex, `rgb()`, `hsl()` or named colours outside `tokens.css` |
| Pair every status colour with an icon and words | Use colour, position or shape alone to mean something |
| Keep links underlined | Remove underlines to "clean up" a list of links |
| Use `--st-border-strong` for control edges | Use `--st-border` for inputs, checkboxes or buttons |
| Put hue-coloured text on `--st-bg` or `--st-surface` | Put hue text on its own tint (not verified) |
| Give icon-only buttons a `label` | Put meaning in an `aria-hidden` icon |
| Use `Card` with one link for the whole card | Nest several full-card links or buttons in one card |
| Use `.st-link-block` for a link that stands alone | Leave a lone footer link at text height |
| Test at 320px, 200% zoom, dark, forced colours and print | Assume the desktop light theme is representative |
| Test at 320px with the longest real Afrikaans label, not the English one | Ship a component whose demo strings are all short |
| Let a badge, a callout label or a button label wrap | Add `white-space: nowrap` to anything translated |
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
- `<details>` content is expanded where the browser supports `::details-content`. JavaScript should also open `<details>` on `beforeprint`.
- External links print their URL after the text. The generated `::after` is an `inline-block`, because text decoration propagates from the inline parent into generated content: without it the printed "(https://…)" was underlined along with the link. It carries `max-inline-size: 100%` and `overflow-wrap: anywhere` so a long URL still wraps inside the page.
- Checkboxes print as empty boxes, unless `<html data-print-ticks>` is set.
- When an element has `data-print-sheet`, only that element prints (templates). Everything that is not the sheet, inside it or one of its ancestors gets `display: none`, so no blank pages are left behind and the sheet stays in normal flow.
- Headings avoid breaks after; table rows, figures, callouts and code avoid breaks inside; table headers repeat.
- Not yet verified automatically (see Known limits).

## Forced colours and preferences

- `forced-colors: active`: focus rings become 3px `CanvasText`, cards, callouts, badges and toasts get visible borders, native checkboxes keep system rendering, the loading spinner keeps its gap, and illustration fills and the shweshwe pattern are removed.
- The selected theme segment is filled with `Highlight`/`HighlightText` behind `forced-color-adjust: none`. A selected state must never come down to border colour alone, which is what happens if you let forced colours paint a transparent border as `CanvasText` and the fill as `Canvas`.
- The live contrast panel **pauses** in forced colours and says so. The system palette replaces every author colour, so `getComputedStyle` returns the same forced value for every token and each pair would read "1.00:1 ✗ FAIL". Reporting 76 failures would tell a high-contrast user the design system is broken when nothing has drifted. The panel resumes when the override is turned off; the build-time Light and Dark columns stay visible throughout.
- `prefers-reduced-motion: reduce`: durations 0ms, no lift, no spinner rotation, no ring draw.
- `prefers-reduced-data: reduce` or `html[data-low-data]`: system fonts, no decorative pattern.

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
11. Run `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm exec playwright test tests/e2e/design-system.spec.ts --project chromium --project webkit --project mobile`.
