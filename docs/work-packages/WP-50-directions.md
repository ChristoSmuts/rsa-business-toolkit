# WP-50 Phase 1: two design directions

Status: for the owner's decision (D1 to D5). Tree: `204a2a2` plus this change. Date: 9 October 2026.

This is Phase 1 of `WP-50-design-revamp.md`. It follows `frontend-design`'s two passes (plan, check against the brief, build, critique) inside the `stoep-design` brief, and it answers the audit in `docs/reviews/WP-50-audit.md`.

Nothing on the real site changed. The two directions exist only as mock pages:

| Page | Direction A | Direction B |
| --- | --- | --- |
| Index of both | `/design-system/directions/` | (same) |
| Home | `/design-system/directions/a/` | `/design-system/directions/b/` |
| Vehicle-dealer document | `/design-system/directions/a/vehicle-dealer/` | `/design-system/directions/b/vehicle-dealer/` |
| Afrikaans | `/af/design-system/directions/…` | (same) |

The mocks are `noindex` and filtered out of the sitemap by the existing `/design-system/` rule. They use real content from `src/data`, the real trust and content components (AI notice, translation notice, sources, contents, glossary terms, every block), and work without JavaScript. Section, tool and search links open the current site; a note at the foot of each mock says so.

Screenshots: `docs/reviews/WP-50-directions/` (59 WebP files, 3.6 MB, none over 88 KB). Names are `<current|a|b>-<home|doc>-<en|af>-<360|1280>-<light|dark>.webp`, plus `-reading` (the first "In plain words" callout in the reading flow), `-menu` (phone menu open), `-read-menu` (desktop Read menu open) and four `r1-*` files from the first round, before the critique.

## Summary for the owner

- **A, "Stoep, re-set"**: the same paper, veld green and six section hues. Fraunces stays but becomes the low-contrast text cut, only for page titles and section headings. Rooibos leaves the chrome: it is only the "In plain words" voice. The focus ring becomes ink. One card style becomes five shapes, each meaning one thing. The home page's one bold thing is the stoep: Find my path's three questions drawn as the logo's roof and steps.
- **B, "Shweshwe and ink"**: a white page with indigo ink, taken from shweshwe cloth. One typeface, Commissioner, for everything. Ochre is the one warm colour, for "In plain words" and amounts. The home hero is a piece of the cloth: indigo, printed with the dots. The top of a document is a page-facts slip, laid out like a well-made form.
- **Both** put the vehicle-dealer page's first content heading inside two phone screens in both languages (today 4.4 and 5.2 screens), keep the AI notice inside the first screen, have a one-row phone header (56 to 62 px, today 113 to 165 px), make tools, pages and steps look different, and quiet the navigation chrome.
- **Focus contrast** is the biggest measurable gain: the weakest focus ring goes from 3.37:1 today to 11.90:1 (A) and 10.40:1 (B), which also removes the cap on section-tint separation that `docs/design-system.md` describes.

My recommendation: **A for D1 and D2**, with B's page-facts slip considered for Phase 3. A fixes what the audit ranks first at the lowest risk to a heavily tested codebase and keeps every token name. B is the stronger identity, but it changes every colour and the type, so it costs more review and more visual-diff churn. The owner's taste decides; both pass every check below.

## Pass 1: the plan

### The brief, restated

- Subject: small-business admin in South Africa (CIPC, SARS, VAT, UIF, licences, invoices), in plain words.
- Audience: a first-time owner, often in a second language, on a cheap Android phone, on prepaid data, a little anxious.
- Primary job: "what do I have to do, and what does it cost?", then act on it.
- Tone: calm, warm, plain, trustworthy. Not salesy, not playful about money, not government-portal grey.
- Boldness: one memorable element per page type.

### Kept in both directions, exactly

- The shweshwe dot pattern (A: on section headers as today; B: also on the hero and the header's selvedge), removed under low data and forced colours as today.
- The roof-and-steps logo, its geometry and its real-text name. Only the tile colour follows the palette.
- The six section hues and their per-hue tint strengths. A keeps every hex value. B keeps five and moves Look it up from `#4A3F8F` to `#5B3A8E` (light) and `#C6B2F0` (dark) so it does not sit next to the indigo primary; its tints are re-measured against the white page.
- The trust devices: the AI notice (same words, same order, same link; restyled, never demoted), the translation notice directly under it, "Official source" and "Not an official source" on every source, "Sources for this page".
- The "In plain words" callout: never collapsed, larger type, one square corner.
- The two-tone business-type illustrations (D5: they stay; only their tile changes).
- The effort meter: five bars and the level in words.
- The A4 template preview beside the form (not mocked; described under "Tool page").
- Afrikaans-length care: nothing truncates, `overflow-wrap: anywhere` on headings, `minmax(0, 1fr)` tracks. Both mocks have no horizontal scroll at 360 px in either language.
- Every hard rule in `stoep-design`: no framework, works without JavaScript, colours only through `--st-*`, no third-party requests, 44 px targets, links underlined, nothing colour-only.

### Direction A: "Stoep, re-set"

**Palette.** Every colour token keeps today's value except the focus alias. New tokens are mock-only roles (`--st-dir-*`) that map onto existing colours.

| Token | Light | Dark | Role in A |
| --- | --- | --- | --- |
| `--st-bg` | `#FBF8F3` | `#15130F` | Paper (unchanged) |
| `--st-surface` | `#FFFFFF` | `#1F1C17` | Tools and type tiles |
| `--st-text` | `#1E1B16` | `#F1ECE2` | Text, and now the focus ring |
| `--st-primary` | `#1E5A3C` | `#7CC79A` | Veld green: links, buttons, step numbers, tool frames |
| `--st-accent` | `#B5561A` | `#E8A25C` | Rooibos: only the "In plain words" edge and label |
| `--st-focus` | `var(--st-text)` (16.20:1) | `var(--st-text)` (15.75:1) | Was `var(--st-accent)` (4.59:1 / 8.61:1) |
| `--st-focus-width` | 3px | 3px | Was 2px |
| `--st-dir-tool-edge` | `var(--st-primary)` | same | 2px frame of a tool |
| `--st-dir-tool-icon-bg` / `-icon` | `var(--st-primary-soft)` / `var(--st-on-primary-soft)` | same | Tool icon tile (9.03:1 / 8.36:1) |
| `--st-dir-rule` | `var(--st-border)` | same | Hairlines between rows |

**Type.** Fraunces, from the wght-only file (`fraunces-latin-wght-normal.woff2`, 36.6 KB instead of the 67.3 KB opsz file every page preloads today). That file has the optical size fixed at the text end, so headings are sturdy and low-contrast instead of a high-contrast display cut. Roles:

| Role | Face | Setting |
| --- | --- | --- |
| h1, h2, page-row titles, fact figures, the stoep numbers | Fraunces (text cut) | 600, tracking -0.005em |
| h3, h4, tool titles, type names, labels, header name | Instrument Sans | 600 to 700 |
| Body, UI | Instrument Sans | 400, unchanged scale |

**Principles.** Paper and veld stay; the orange is the guide's voice and nothing else; serif is for reading titles, sans for things you act on; every shape means one thing.

### Direction B: "Shweshwe and ink"

**Palette.** Shweshwe is an indigo-dyed cotton printed with small white discharge dots. B takes its base from the cloth.

| Token | Light | Dark | Role in B |
| --- | --- | --- | --- |
| `--st-bg` / `--st-surface` | `#FFFFFF` / `#FFFFFF` | `#10141F` / `#171D2C` | White page; indigo night |
| `--st-surface-2` | `#EFF2F8` | `#1F2638` | Indigo wash: tools, raised areas |
| `--st-text` | `#1B2A4A` | `#E8ECF5` | Indigo ink (14.22:1 / 15.54:1) |
| `--st-text-muted` | `#4A5672` | `#A9B3C8` | Secondary text |
| `--st-border` / `--st-border-strong` | `#D6DCE8` / `#69748E` | `#2F3850` / `#7D89A6` | Hairlines / control edges |
| `--st-primary` / `-hover` | `#233F86` / `#1A2F66` | `#9FB3EF` / `#C4D0F7` | Shweshwe indigo: links, buttons |
| `--st-primary-soft` / `--st-on-primary-soft` | `#E6EBF7` / `#1A2F66` | `#1E2A4C` / `#C4D0F7` | Official callouts, selection |
| `--st-accent` | `#D99A1E` | `#E9B547` | Ochre: "In plain words" edge, the amount underline |
| `--st-accent-text` / `--st-on-accent` | `#7F5200` / `#1B2A4A` | `#E9B547` / `#1B1505` | Ochre as text; label on ochre |
| `--st-accent-soft` / `--st-on-accent-soft` | `#FCF1D6` / `#6A4400` | `#352A0F` / `#F5D88E` | "In plain words" background and label |
| `--st-warning-bg` / `-text` | `#FDE8DC` / `#8A3209` | `#3D2210` / `#F7B48A` | Moved to burnt orange so it is not ochre |
| `--st-info-bg` / `-text` | `#E2F1F0` / `#155A5A` | `#0F3333` / `#8FD3D0` | AI notice (teal, as today) |
| `--st-link-visited` | `#5B3A8E` | `#C6B2F0` | Plum |
| `--st-hue-lookup` | `#5B3A8E` | `#C6B2F0` | Moved off the indigo (see "Kept") |
| `--st-focus` | `var(--st-text)` | `var(--st-text)` | Ink ring, 3px |
| `--st-dir-cloth` / `--st-dir-cloth-dot` / `--st-dir-on-cloth` | `#233F86` / `#C9D4F2` / `#FFFFFF` | `#1E2A4C` / `#3C4F86` / `#E8ECF5` | Hero cloth, its dots, type on it (9.87:1 / 11.90:1) |

Status, danger, mark and the other five hues keep today's values.

**Type.** One family: Commissioner (OFL, `@fontsource-variable/commissioner` 5.3.0, wght file, 36.7 KB latin plus 31.0 KB latin-ext). A humanist sans with open apertures, a plain oval zero and a narrow set width, which matters for Afrikaans. h1 800, h2 and h3 700, body 400. Italic is synthesised (the wght file has none). Metric-matched fallback on Arial measured from the file: `size-adjust 99.8%`, `ascent-override 101.9%`, `descent-override 20.6%`.

**Principles.** The cloth is the brand and appears in one place per page; ink is for reading; ochre marks the two things a nervous reader is looking for, the plain explanation and the amount; the top of a document reads like a well-made form.

### Layout concepts

Alignment for both: left-aligned everywhere, ragged right, one reading column capped at `--st-measure` (68ch). Nothing is centred except the stoep figure's steps, which copy the logo.

#### Header: one row at every width

Phone, 360 px (both directions; B adds a 6 px shweshwe selvedge under it, except where the cloth hero follows):

```
+--------------------------------------------+
| [#] SA Business   (Q) Search   (=) Menu    |  56 px, one row
|     Toolkit                                |  name wraps to 2 lines by design
+--------------------------------------------+
```

The language links and the theme move into the menu (a native `<details>`, so it works without JavaScript). There is no "/" key hint on touch screens, and nothing is added after load, so the header cannot grow. In Afrikaans the row is "Soek" and "Kieslys"; it fits.

Desktop, 1280 px:

```
+-----------------------------------------------------------------------------------------+
| [#] SA Business Toolkit   Read v   Tools v                ( Q Search          )  English Afrikaans |
+-----------------------------------------------------------------------------------------+
```

"Read" and "Tools" are the live header's two words, as quiet text drop-downs. Search looks like a field. Language is two small links. The theme control moves into a settings item in the footer with low data mode (B3 asked for both there).

#### Home

A: hero text left, the stoep right (desktop) or below (phone); then "Where to start" as two page rows and one tool; then the kinds of business as tiles; then the four early things as rows; then the three 2026 numbers as facts; then the trust list.

```
A, 360                               A, 1280
+------------------------+           +----------------------------------------------------+
| header (one row)       |           | header                                             |
| H1 Start and run your  |           | H1 Start and run your           /\  roof          |
|    business in SA      |           |    business in SA             [ 1 How you trade ]  |
| lead                   |           | lead                        [ 2 Kind of business ] |
| [Find my path]         |           | [Find my path] [I know..]  [ 3 Where you are now ] |
| [I know what I need]   |           | (bot) AI line + link        caption                |
| (bot) AI line + link   |           |                                                    |
|      /\                |           | H2 Where to start                                  |
|  [1 How you trade]     |           | | If you have 5 minutes   |  +--------------------+ |
| [2 Kind of business]   |           | | If you have an hour     |  | [=] tool: checklist| |
|[3 Where you are now]   |           |                              | [Open the checklist]| |
| H2 Where to start      |           |                              +--------------------+ |
| | page row             |           | H2 Your kind of business: 3 x tiles                |
| | page row             |           | ...                                                |
| [tool: checklist]      |           +----------------------------------------------------+
+------------------------+
```

B: the hero is a full-width band of indigo cloth with the dots printed along its top edge; the rest is the same order, on white.

```
B, 360                               B, 1280
+------------------------+           +----------------------------------------------------+
| header                 |           | header                                             |
|::::::::::::::::::::::::|           |::::::::::::::::::::::::::::::::::::::::::::::::::::|
|  H1 Start and run      |           |  H1 Start and run your business in South Africa   |
|     your business      |           |  lead                                              |
|  lead (white on indigo)|           |  [Find my path] [I know what I need]               |
|  [Find my path]        |           |  (bot) AI line + link                              |
|  [I know what I need]  |           +----------------------------------------------------+
|  (bot) AI line         |           | H2 Where to start   rows        | tool (wash, top  |
+------------------------+           |                                 |  indigo rule)    |
| H2 Where to start      |           | H2 ...                                             |
+------------------------+           +----------------------------------------------------+
```

#### Section hub (not mocked)

Both: the existing `SectionHeader` with the shweshwe pattern, then the section's pages as page rows in reading order, then that section's tools as tools. The hub's "Page 2 of 10" eyebrow goes; the order is the list's own order.

```
360                                   1280
+------------------------+            +-----------------------------------------------+
| header                 |            | header                                        |
| [section header, hue   |            | [section header: title, lead | shweshwe dots ]|
|  tint, dots band below]|            | | Start here: the order to do things          |
| | page row (hue rule)  |            | | You are the business                        |
| | page row             |            | | Register: what you actually need      [tool]|
| | page row             |            | ...                                           |
| [tool: checklist]      |            +-----------------------------------------------+
+------------------------+
```

A's hub memorable element is the section header itself (kept). B's hub header is a strip of cloth in the section's hue: the same dots on the hue instead of indigo.

#### Document

The top of the page, in this order, both directions:

1. Breadcrumb on one line: "Home / ● Your kind of business", the dot in the section's hue. The "Section: Your kind of business" label is gone; it repeated the breadcrumb.
2. h1, then the lead.
3. A: the read time badge and the effort meter on one line. B: the page-facts slip, two labelled boxes (setup effort, reading time) with the AI notice as the slip's lower half.
4. The AI notice: same component, same words, same order, same link, smaller type and padding.
5. The translation notice on Afrikaans pages, directly under it.
6. Two closed disclosures with a chevron: "On this page (41 sections)" and "Words used on this page" (was "Words used in this file", open, 15 terms, about 1,500 px on a phone).
7. The content. No "Read Core first" callout: the document's own first line already says "Read Core first".

```
A, 360                               A, 1280
+------------------------+           +------------------------------------------------+
| header                 |           | header                                         |
| Home / ● Your kind of… |           |   Home / ● Your kind of business    | On this  |
| H1 Business type:      |           |   H1 Business type: buying and      | page     |
|    buying and selling  |           |      selling vehicles               | (h2 only,|
|    vehicles            |           |   lead                              |  muted,  |
| lead                   |           |   (28 min read)  Setup effort ▮▮▮▮▮ | no under-|
| (28 min) Effort ▮▮▮▮▮  |           |   [AI notice, compact]              |  lines   |
| [AI notice, compact]   |           |   > Words used on this page         |  until   |
| > On this page (41)    |           |   Read Core first. This file adds…  |  hover)  |
| > Words used on page   |           |   H2 Quick answer: what you must…   |          |
| Read Core first…       |           +------------------------------------------------+
| H2 Quick answer        |  <- 1,248 px (EN), 1,457 px (AF); two screens = 1,480 px
+------------------------+
```

B is the same order with the slip, and with the contents column on the left at 1280 px (contents first, then the text, in reading order).

```
B, 360                               B, 1280
+------------------------+           +------------------------------------------------+
| header + selvedge      |           | header + selvedge                              |
| Home / ● Your kind of… |           | On this   | Home / ● Your kind of business     |
| H1 Business type: …    |           | page      | H1 Business type: buying and …     |
| lead                   |           | (muted)   | lead                               |
| +--------------------+ |           |           | +-------------------+------------+ |
| |Setup effort|Reading| |           |           | |Setup effort  High |Reading 28 m| |
| |▮▮▮▮▮ High  |28 min | |           |           | +-------------------+------------+ |
| +--------------------+ |           |           | | AI notice, as the slip's lower | |
| | AI notice          | |           |           | | half                           | |
| +--------------------+ |           |           | +--------------------------------+ |
| > On this page / Words |           |           | > Words used on this page          |
| H2 Quick answer        |  <- 1,258 px (EN), 1,473 px (AF)                            |
+------------------------+           +------------------------------------------------+
```

At 1280 px the left section sidebar is gone in both: the breadcrumb and the Read menu do its job, and the article gets the room. The contents column shows h2 entries only, muted, with the underline appearing on hover and focus. Rule 7 ("links stay underlined") applies to links in text; this column is navigation chrome, and the audit asked for exactly this. If the owner reads rule 7 as covering it, the column keeps a thin underline in `--st-border-strong` instead (the class `.st-dir-quiet` already does that for the header).

#### Tool page (wizard and template; not mocked)

Both: the tool starts within the first screen. Above it, only the h1, one line of lead, the AI notice and a "saved on this device" line. Long notes ("Do NOT …", rules checked on …) move below the tool or into one closed disclosure. The wizard shows one question per screen with its answers in view; the stepper is a single line "Question 1 of 3: How you trade", with the stoep's three steps as its marker in A. The template keeps the A4 sheet beside the form at 1280 px and under a "Preview" tab on a phone.

```
Template, 360                         Template, 1280
+------------------------+            +-----------------------------------------------+
| header                 |            | header                                        |
| H1 Invoice             |            | H1 Invoice                                    |
| lead (one line)        |            | lead; AI notice                               |
| [AI notice]            |            | +--------------------+ +---------------------+ |
| Saved on this device   |            | | form               | | A4 sheet, live total| |
| [Fill in | Preview]    |            | |                    | | paper edge, shadow  | |
| Business name [_____]  |            | +--------------------+ +---------------------+ |
| ...                    |            | Notes and rules (below the tool)              |
+------------------------+            +-----------------------------------------------+
```

A's tool memorable element is the A4 sheet (kept, with a paper edge). B's is the form itself: fields as labelled boxes, as on a printed form, so the web form and the printed sheet look like the same document.

### The card set (both directions)

One card style becomes five shapes. Each shape means one thing, so a reader can tell a page from a tool from a step before reading the words.

| Shape | Means | A | B | Used for |
| --- | --- | --- | --- | --- |
| Page row | Something to read | No box, no shadow; 4 px rule in the section hue; Fraunces title link; one line of description; hairline between rows | Same, with a small hue square instead of the rule; sans title | Section pages, "if you have 5 minutes", related pages, the four early things |
| Tool | Something to use | White, 2 px veld-green frame, 14 px radius (the only large radius), icon tile, a button-shaped action | Indigo wash, 1 px edge with a 4 px indigo top rule, 8 px radius, filled icon tile | Find my path, checklist, templates, My path |
| Step | One of a sequence | Numbered circle on a rail; the stoep figure on the home page | Same | My path steps, the wizard stepper |
| Fact | A figure with a source | 3 px top rule, the figure in Fraunces, "Not R1 million", the date, "Official source" | Bordered box, the figure in 800 weight with an ochre underline (the cost marker) | The 2026 numbers |
| Type tile | A kind of business | White tile, hairline, illustration on its tint, name, effort meter | Section tint, 6 px hue edge, no radius on that edge | Home and the business-types hub |

No shape has a hover lift. Hover changes a colour only, and only on fine pointers in Phase 3.

### The one memorable element per page type

| Page type | A | B |
| --- | --- | --- |
| Home | Option A1 (mocked): **the stoep.** Find my path's three questions as three steps widening downward under the logo's roof, with "Three short questions. Then you get the steps that apply to you, in order." It is a real sequence, it previews the tool, and it is the logo's own shape. Option A2: **the ledger line.** The three 2026 numbers as one quiet line directly under the hero ("VAT: R2.3 million, not R1 million. Turnover tax: R2.3 million."), each with its source, answering "what does it cost?" before anything else. | Option B1 (mocked): **the cloth hero.** The hero is a band of shweshwe indigo with the dots printed along its top edge, white type, white primary button. Option B2: **the price list.** The hero is followed by a short "What it costs" list styled as a receipt: the three 2026 numbers plus the steps the guide says cost nothing (for a dealer, the SAPS 601 registration), each amount with the ochre underline and its official source. |
| Hub | The shweshwe section header (kept) | A strip of cloth in the section's hue |
| Document | "In plain words" as the page's only warm colour | The page-facts slip |
| Tool | The A4 sheet with a paper edge | Form fields as printed-form boxes |

Decision D4 picks one home option. My preference: A1 with A, B1 with B. A2 and B2 both put money first, which suits the brief's primary job, but they compete with the "Three numbers" section further down; choosing one of them means removing that section.

### Reduced motion (D3)

Both directions take the D3 default, "gentler, not zero": under `prefers-reduced-motion` opacity changes stay (at most 120 ms) and every movement goes (lift, slide, smooth scroll, the ring's draw-in). The mocks have exactly two motions, both opacity only: the phone menu's panel and an opened disclosure's content fade in over 120 ms with `@starting-style`. They opt back in under reduced motion, because today's `base.css` block zeroes every transition with `!important`; Phase 2 narrows that block to movement. Nothing moves on load or on scroll in either direction.

### Pass 1 check against the brief and the five generic looks, and what was revised

I wrote each plan, then asked what I would produce for "a friendly small-business guide" with no brief at all, and compared. These are the revisions made before any code was written, plus one made while building.

| Look or check | Where it showed in the first plan | Revision and why |
| --- | --- | --- |
| 1. Cream, high-contrast serif, terracotta accent | A keeps paper and Fraunces by design | A uses Fraunces's text cut, not the opsz-144 display cut, and only for titles; the rooibos ring becomes ink. A terracotta ring on cream is the tell in miniature, and it is also the system's weakest contrast pair. What remains in A is paper plus a low-contrast serif with a green primary. I think that is a choice for this brief, but A does not fully escape look 1, and the owner should weigh that. |
| 2. Near-black with one acid accent | B's first idea for ochre was the focus ring and the "you are here" marker, a single bright accent on indigo | Ochre on white is 2.44:1, so it cannot be a ring; and one bright accent everywhere is look 2 in daylight. Ochre was cut back to two jobs (plain words, the amount underline), and the ring became ink. Dark B is an indigo night with the cloth panel and all six hues, not black plus one colour. |
| 3. Broadsheet hairlines, zero radius | Absent in both | No change. B uses hairlines only where a printed form would (the slip, rows), with 4 to 8 px radii. |
| 4. SaaS card kit | Both started from "a card per item" | Replaced by the five-shape set above; no shared shadow, no hover lift. While building, A's type tiles were first the section tint like B's; changed to a white tile so only B uses tinted tiles and A's tool frame stays the only framed object on its page. |
| 5. Template chrome | "Section: …" above every h1; numbered markers; B's first text colour `#161B26` | The "Section:" label goes (the breadcrumb says it). Numbers appear only on real sequences: the first plan drew the "Four things that matter early" as stoep steps, but they are not a sequence, so the stoep became Find my path's three questions, which are. `#161B26` is a tinted near-black, the tell; B's text became `#1B2A4A`, which reads as dark blue ink, the ballpoint on a form. |
| Big number, small label | A's first home idea was the 2026 numbers as giant figures in the hero | That is the default hero. It became option A2, a quiet ledger line with sources. |
| Quiet chrome | B's first header was a full indigo band with dots | Louder chrome is the opposite of what the audit asked. It became a 6 px selvedge under a white header. |
| Plain words vs official | B's first plain-words colour was indigo-soft, the same as official callouts | Two callouts that mean different things in one colour. Plain words became ochre-soft, and warning moved to burnt orange so ochre stays unique. |

## Contrast

Measured with `src/scripts/color.ts` against the same `CONTRAST_PAIRS` list the live token test uses, plus the pairs only the mocks render. `tests/unit/directions-contrast.test.ts` asserts every row below and the tint separation, so these numbers can be re-derived. Ratios are truncated to two decimals. "Today" is tokens.css unchanged.

Lowest pair per theme:

| Theme | Lowest text (needs 4.5) | Lowest control edge (needs 3) | Lowest focus ring (needs 3) | Worst tint pair, ΔE_OK (needs 0.025) |
| --- | --- | --- | --- | --- |
| Today light | 4.87:1 on-accent on accent | 4.03:1 border-strong on surface-2 | **3.37:1** on Look it up tint | 0.0280 |
| Today dark | 5.49:1 link on Paperwork tint | 4.01:1 | 5.10:1 on Paperwork tint | 0.0389 |
| A light | 4.87:1 on-accent on accent | 4.03:1 | **11.90:1** on Look it up tint | 0.0280 |
| A dark | 5.49:1 link on Paperwork tint | 4.01:1 | 9.33:1 on Paperwork tint | 0.0389 |
| B light | 5.81:1 on-accent on accent | 4.17:1 | **10.40:1** on Look it up tint | 0.0263 (Branding vs Look it up) |
| B dark | 5.25:1 link on Paperwork tint | 4.30:1 | 9.16:1 on Paperwork tint | 0.0372 (types vs Look it up) |

Every pair (L = light, D = dark):

| Foreground | Background | Use | Needs | Today L | Today D | A L | A D | B L | B D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `text` | `bg` | Body text on page | 4.5:1 | 16.20:1 | 15.75:1 | 16.20:1 | 15.75:1 | 14.22:1 | 15.54:1 |
| `text` | `surface` | Body text on cards | 4.5:1 | 17.16:1 | 14.42:1 | 17.16:1 | 14.42:1 | 14.22:1 | 14.21:1 |
| `text` | `surface-2` | Body text on raised areas | 4.5:1 | 14.85:1 | 12.92:1 | 14.85:1 | 12.92:1 | 12.68:1 | 12.74:1 |
| `text-muted` | `bg` | Secondary text on page | 4.5:1 | 6.88:1 | 8.06:1 | 6.88:1 | 8.06:1 | 7.32:1 | 8.73:1 |
| `text-muted` | `surface` | Secondary text on cards | 4.5:1 | 7.29:1 | 7.37:1 | 7.29:1 | 7.37:1 | 7.32:1 | 7.98:1 |
| `text-muted` | `surface-2` | Secondary text, disabled controls | 4.5:1 | 6.31:1 | 6.61:1 | 6.31:1 | 6.61:1 | 6.53:1 | 7.15:1 |
| `link` | `bg` | Links on page | 4.5:1 | 7.67:1 | 9.26:1 | 7.67:1 | 9.26:1 | 9.87:1 | 8.90:1 |
| `link` | `surface` | Links on cards | 4.5:1 | 8.13:1 | 8.48:1 | 8.13:1 | 8.48:1 | 9.87:1 | 8.14:1 |
| `link-hover` | `bg` | Hovered links | 4.5:1 | 10.00:1 | 12.45:1 | 10.00:1 | 12.45:1 | 12.78:1 | 12.00:1 |
| `link-visited` | `bg` | Visited links | 4.5:1 | 8.26:1 | 8.48:1 | 8.26:1 | 8.48:1 | 8.60:1 | 9.65:1 |
| `on-primary` | `primary` | Primary button label | 4.5:1 | 8.13:1 | 7.68:1 | 8.13:1 | 7.68:1 | 9.87:1 | 8.64:1 |
| `on-primary` | `primary-hover` | Primary button label, hover | 4.5:1 | 10.60:1 | 10.31:1 | 10.60:1 | 10.31:1 | 12.78:1 | 11.65:1 |
| `on-primary-soft` | `primary-soft` | Text on soft green | 4.5:1 | 9.03:1 | 8.36:1 | 9.03:1 | 8.36:1 | 10.71:1 | 9.19:1 |
| `on-accent` | `accent` | Accent fill label | 4.5:1 | 4.87:1 | 7.80:1 | 4.87:1 | 7.80:1 | 5.81:1 | 9.65:1 |
| `accent-text` | `bg` | Accent text on page | 4.5:1 | 5.89:1 | 8.61:1 | 5.89:1 | 8.61:1 | 6.75:1 | 9.77:1 |
| `accent-text` | `surface` | Accent text on cards | 4.5:1 | 6.24:1 | 7.88:1 | 6.24:1 | 7.88:1 | 6.75:1 | 8.94:1 |
| `on-accent-soft` | `accent-soft` | Text on soft rooibos | 4.5:1 | 7.39:1 | 9.45:1 | 7.39:1 | 9.45:1 | 7.66:1 | 10.13:1 |
| `success-text` | `success-bg` | Success message | 4.5:1 | 9.03:1 | 8.36:1 | 9.03:1 | 8.36:1 | 9.03:1 | 8.36:1 |
| `warning-text` | `warning-bg` | Warning message | 4.5:1 | 6.71:1 | 8.81:1 | 6.71:1 | 8.81:1 | 6.98:1 | 8.25:1 |
| `danger-text` | `danger-bg` | Error message | 4.5:1 | 7.22:1 | 7.86:1 | 7.22:1 | 7.86:1 | 7.22:1 | 7.86:1 |
| `info-text` | `info-bg` | Info message | 4.5:1 | 6.73:1 | 8.04:1 | 6.73:1 | 8.04:1 | 6.84:1 | 8.04:1 |
| `danger-text` | `bg` | Error text on page | 4.5:1 | 8.14:1 | 9.48:1 | 8.14:1 | 9.48:1 | 8.63:1 | 9.40:1 |
| `on-danger-solid` | `danger-solid` | Danger button label | 4.5:1 | 8.63:1 | 6.23:1 | 8.63:1 | 6.23:1 | 8.63:1 | 6.23:1 |
| `on-danger-solid` | `danger-solid-hover` | Danger button label, hover | 4.5:1 | 9.97:1 | 7.55:1 | 9.97:1 | 7.55:1 | 9.47:1 | 7.54:1 |
| `text` | `mark-bg` | Highlighted search match | 4.5:1 | 14.28:1 | 7.36:1 | 14.28:1 | 7.36:1 | 11.31:1 | 7.32:1 |
| `bg` | `text` | Default toast (inverse) | 4.5:1 | 16.20:1 | 15.75:1 | 16.20:1 | 15.75:1 | 14.22:1 | 15.54:1 |
| `text` | `primary-soft` | Body text in official callouts and badges | 4.5:1 | 14.62:1 | 10.59:1 | 14.62:1 | 10.59:1 | 11.91:1 | 11.90:1 |
| `text` | `accent-soft` | Body text in plain-words callouts | 4.5:1 | 14.73:1 | 12.38:1 | 14.73:1 | 12.38:1 | 12.65:1 | 11.91:1 |
| `text` | `warning-bg` | Body text in warning callouts | 4.5:1 | 15.56:1 | 11.77:1 | 15.56:1 | 11.77:1 | 12.02:1 | 12.37:1 |
| `text` | `info-bg` | Body text in info callouts | 4.5:1 | 14.53:1 | 11.56:1 | 14.53:1 | 11.56:1 | 12.23:1 | 11.51:1 |
| `link` | `surface-2` | Links in note callouts and code | 4.5:1 | 7.03:1 | 7.60:1 | 7.03:1 | 7.60:1 | 8.80:1 | 7.30:1 |
| `link` | `primary-soft` | Links in official callouts and badges | 4.5:1 | 6.92:1 | 6.23:1 | 6.92:1 | 6.23:1 | 8.27:1 | 6.82:1 |
| `link` | `accent-soft` | Links in plain-words callouts | 4.5:1 | 6.98:1 | 7.28:1 | 6.98:1 | 7.28:1 | 8.78:1 | 6.82:1 |
| `link` | `warning-bg` | Links in warning callouts | 4.5:1 | 7.37:1 | 6.92:1 | 7.37:1 | 6.92:1 | 8.34:1 | 7.08:1 |
| `link` | `info-bg` | Links in info callouts | 4.5:1 | 6.88:1 | 6.80:1 | 6.88:1 | 6.80:1 | 8.49:1 | 6.59:1 |
| `hue-start` | `bg` | Start here hue as text | 4.5:1 | 5.59:1 | 10.04:1 | 5.59:1 | 10.04:1 | 5.92:1 | 9.95:1 |
| `hue-core` | `bg` | Core hue as text | 4.5:1 | 7.67:1 | 9.26:1 | 7.67:1 | 9.26:1 | 8.13:1 | 9.18:1 |
| `hue-branding` | `bg` | Branding hue as text | 4.5:1 | 6.64:1 | 7.64:1 | 6.64:1 | 7.64:1 | 7.03:1 | 7.57:1 |
| `hue-paperwork` | `bg` | Paperwork hue as text | 4.5:1 | 5.87:1 | 9.68:1 | 5.87:1 | 9.68:1 | 6.22:1 | 9.60:1 |
| `hue-types` | `bg` | Business types hue as text | 4.5:1 | 5.99:1 | 8.39:1 | 5.99:1 | 8.39:1 | 6.35:1 | 8.32:1 |
| `hue-lookup` | `bg` | Look it up hue as text | 4.5:1 | 8.26:1 | 8.48:1 | 8.26:1 | 8.48:1 | 8.60:1 | 9.65:1 |
| `hue-start` | `surface` | Start here hue on cards | 4.5:1 | 5.92:1 | 9.19:1 | 5.92:1 | 9.19:1 | 5.92:1 | 9.10:1 |
| `hue-core` | `surface` | Core hue on cards | 4.5:1 | 8.13:1 | 8.48:1 | 8.13:1 | 8.48:1 | 8.13:1 | 8.40:1 |
| `hue-branding` | `surface` | Branding hue on cards | 4.5:1 | 7.03:1 | 6.99:1 | 7.03:1 | 6.99:1 | 7.03:1 | 6.92:1 |
| `hue-paperwork` | `surface` | Paperwork hue on cards | 4.5:1 | 6.22:1 | 8.86:1 | 6.22:1 | 8.86:1 | 6.22:1 | 8.78:1 |
| `hue-types` | `surface` | Business types hue on cards | 4.5:1 | 6.35:1 | 7.68:1 | 6.35:1 | 7.68:1 | 6.35:1 | 7.60:1 |
| `hue-lookup` | `surface` | Look it up hue on cards | 4.5:1 | 8.75:1 | 7.76:1 | 8.75:1 | 7.76:1 | 8.60:1 | 8.83:1 |
| `text` | `hue-start-tint` | Text on Start here tint | 4.5:1 | 12.51:1 | 9.68:1 | 12.51:1 | 9.68:1 | 10.91:1 | 9.48:1 |
| `text` | `hue-core-tint` | Text on Core tint | 4.5:1 | 11.99:1 | 10.85:1 | 11.99:1 | 10.85:1 | 10.46:1 | 10.65:1 |
| `text` | `hue-branding-tint` | Text on Branding tint | 4.5:1 | 12.22:1 | 12.64:1 | 12.22:1 | 12.64:1 | 10.66:1 | 12.42:1 |
| `text` | `hue-paperwork-tint` | Text on Paperwork tint | 4.5:1 | 13.20:1 | 9.33:1 | 13.20:1 | 9.33:1 | 11.53:1 | 9.16:1 |
| `text` | `hue-types-tint` | Text on Business types tint | 4.5:1 | 13.58:1 | 11.10:1 | 13.58:1 | 11.10:1 | 11.87:1 | 10.88:1 |
| `text` | `hue-lookup-tint` | Text on Look it up tint | 4.5:1 | 11.90:1 | 11.06:1 | 11.90:1 | 11.06:1 | 10.40:1 | 10.53:1 |
| `link` | `hue-start-tint` | Links on Start here tint | 4.5:1 | 5.92:1 | 5.69:1 | 5.92:1 | 5.69:1 | 7.57:1 | 5.43:1 |
| `link` | `hue-core-tint` | Links on Core tint | 4.5:1 | 5.68:1 | 6.38:1 | 5.68:1 | 6.38:1 | 7.26:1 | 6.10:1 |
| `link` | `hue-branding-tint` | Links on Branding tint | 4.5:1 | 5.79:1 | 7.44:1 | 5.79:1 | 7.44:1 | 7.40:1 | 7.12:1 |
| `link` | `hue-paperwork-tint` | Links on Paperwork tint | 4.5:1 | 6.25:1 | 5.49:1 | 6.25:1 | 5.49:1 | 8.00:1 | 5.25:1 |
| `link` | `hue-types-tint` | Links on Business types tint | 4.5:1 | 6.43:1 | 6.53:1 | 6.43:1 | 6.53:1 | 8.24:1 | 6.23:1 |
| `link` | `hue-lookup-tint` | Links on Look it up tint | 4.5:1 | 5.63:1 | 6.51:1 | 5.63:1 | 6.51:1 | 7.22:1 | 6.03:1 |
| `border-strong` | `bg` | Control border on page | 3:1 | 4.40:1 | 4.90:1 | 4.40:1 | 4.90:1 | 4.67:1 | 5.25:1 |
| `border-strong` | `surface` | Control border on cards | 3:1 | 4.66:1 | 4.48:1 | 4.66:1 | 4.48:1 | 4.67:1 | 4.80:1 |
| `border-strong` | `surface-2` | Control border on raised areas | 3:1 | 4.03:1 | 4.01:1 | 4.03:1 | 4.01:1 | 4.17:1 | 4.30:1 |
| `focus` | `bg` | Focus ring on page | 3:1 | 4.59:1 | 8.61:1 | 16.20:1 | 15.75:1 | 14.22:1 | 15.54:1 |
| `focus` | `surface` | Focus ring on cards | 3:1 | 4.87:1 | 7.88:1 | 17.16:1 | 14.42:1 | 14.22:1 | 14.21:1 |
| `focus` | `surface-2` | Focus ring in note callouts and code | 3:1 | 4.21:1 | 7.06:1 | 14.85:1 | 12.92:1 | 12.68:1 | 12.74:1 |
| `focus` | `primary-soft` | Focus ring in official callouts and badges | 3:1 | 4.15:1 | 5.79:1 | 14.62:1 | 10.59:1 | 11.91:1 | 11.90:1 |
| `focus` | `accent-soft` | Focus ring in plain-words callouts | 3:1 | 4.18:1 | 6.77:1 | 14.73:1 | 12.38:1 | 12.65:1 | 11.91:1 |
| `focus` | `warning-bg` | Focus ring in warning callouts | 3:1 | 4.41:1 | 6.43:1 | 15.56:1 | 11.77:1 | 12.02:1 | 12.37:1 |
| `focus` | `info-bg` | Focus ring in info callouts | 3:1 | 4.12:1 | 6.32:1 | 14.53:1 | 11.56:1 | 12.23:1 | 11.51:1 |
| `focus` | `hue-start-tint` | Focus ring on Start here tint | 3:1 | 3.55:1 | 5.29:1 | 12.51:1 | 9.68:1 | 10.91:1 | 9.48:1 |
| `focus` | `hue-core-tint` | Focus ring on Core tint | 3:1 | 3.40:1 | 5.93:1 | 11.99:1 | 10.85:1 | 10.46:1 | 10.65:1 |
| `focus` | `hue-branding-tint` | Focus ring on Branding tint | 3:1 | 3.46:1 | 6.91:1 | 12.22:1 | 12.64:1 | 10.66:1 | 12.42:1 |
| `focus` | `hue-paperwork-tint` | Focus ring on Paperwork tint | 3:1 | 3.74:1 | 5.10:1 | 13.20:1 | 9.33:1 | 11.53:1 | 9.16:1 |
| `focus` | `hue-types-tint` | Focus ring on Business types tint | 3:1 | 3.85:1 | 6.07:1 | 13.58:1 | 11.10:1 | 11.87:1 | 10.88:1 |
| `focus` | `hue-lookup-tint` | Focus ring on Look it up tint | 3:1 | 3.37:1 | 6.05:1 | 11.90:1 | 11.06:1 | 10.40:1 | 10.53:1 |
| `primary` | `bg` | Primary button edge, checkbox fill | 3:1 | 7.67:1 | 9.26:1 | 7.67:1 | 9.26:1 | 9.87:1 | 8.90:1 |
| `dir-on-cloth` | `dir-cloth` | B: hero text on cloth | 4.5:1 | n/a | n/a | n/a | n/a | 9.87:1 | 11.90:1 |
| `dir-cloth` | `dir-on-cloth` | B: hero primary button label | 4.5:1 | n/a | n/a | n/a | n/a | 9.87:1 | 11.90:1 |
| `dir-tool-icon` | `dir-tool-icon-bg` | Tool icon on its tile | 3:1 | n/a | n/a | 9.03:1 | 8.36:1 | 9.87:1 | 8.64:1 |
| `text` | `dir-tool-bg` | Text on a tool | 4.5:1 | n/a | n/a | 17.16:1 | 14.42:1 | 12.68:1 | 12.74:1 |
| `focus` | `dir-tool-bg` | Focus ring on a tool | 3:1 | n/a | n/a | 17.16:1 | 14.42:1 | 12.68:1 | 12.74:1 |

## Pass 2: build, screenshots, critique, revise

All shots: Chromium on Linux, 360×740 at device scale 2 and 1280×800 at scale 1, light and dark (`prefers-color-scheme`), English and Afrikaans, from `astro preview` of a production build.

### Measured on the vehicle-dealer page and home

Top of the element, in CSS px from the top of the page (two phone screens = 1,480 px):

| Page, 360 px | Header | AI notice | First content heading ("Quick answer") | Home: "Where to start" |
| --- | --- | --- | --- | --- |
| Today, EN | 113 | 676 to 1,094 | 3,291 (4.4 screens) | 705 |
| Today, AF | 113 | 647 to 1,116 | 3,819 (5.2 screens) | 756 |
| A, EN | 57 | 427 to 721 | 1,248 (1.7 screens) | 896 |
| A, AF | 57 | 424 to 739 | 1,457 (2.0 screens) | 947 |
| B, EN | 62 | 462 to 755 | 1,258 (1.7 screens) | 698 |
| B, AF | 62 | 433 to 747 | 1,473 (2.0 screens) | 749 |

At 1280 px the first content heading moves from 2,368 / 2,770 px (EN / AF) to 937 / 1,089 (A) and 929 / 1,074 (B). No page scrolls sideways at either width in either language. The AI notice ends inside the first phone screen in every case.

In Afrikaans both directions are inside two screens by less than 25 px. What fills that space is real content: the Afrikaans lead is the document's first line ("Lees eers 01-core/. …"; see "Found on the way"), and the translation notice is 186 px. Rule 9 keeps both.

### Critique, round 1 ("remove one accessory")

Looking at the first full set (`r1-*` files and the round-1 PNGs in the scratchpad):

| Seen | Accessory removed or fixed | Why |
| --- | --- | --- |
| A home, desktop (`r1-a-home-en-1280-light`): the stoep's caption ended in a second "Find my path" link, next to the hero's "Find my path" button | Removed the caption link | Two identical actions side by side; the figure is a preview, the button is the action |
| A document (`r1-a-doc-en-1280-light`): the AI notice had a full border, a left stripe and a tint, three ways of saying "box" | Removed the full border | The stripe and tint were enough; the border made the notice the loudest thing above the title |
| B home, phone (`r1-b-home-en-360-light`): the header's shweshwe selvedge sat directly on the cloth hero's printed dots, two patterns touching with a white gap | The selvedge is hidden where the cloth hero follows, and the hero starts at the header | The hero is the cloth; a second strip of it repeated the idea |
| B, every amount (`r1-b-typeface-zero-comparison`): Atkinson Hyperlegible Next has only a slashed zero, so "R100" read as "R1ØØ" and "2026" as "2Ø26" | Replaced the typeface with Commissioner | In a guide whose answers are amounts, a zero that looks like a letter is a reading error for a second-language reader. Atkinson was chosen for legibility of form codes; it failed on the thing the reader looks for most. Commissioner keeps the humanist, open shapes with a plain zero and a narrower width |
| B headings, desktop: Commissioner at 800 with -0.02em tracking was cramped | Tracking set to -0.005em (h1) and 0 | Commissioner is already tight at heavy weights |
| B slip: "Reading time: 28 min read" said it twice; a third box "Applies to: Everyone" told the reader nothing | "28 min"; the third box removed | Each word does one job |
| Both: the menu buttons, "Words used" and "On this page" rows were 52 px | 44 px | Two rows of 8 px each brought Afrikaans inside two screens |
| Both, desktop: six section links in the header wrapped to two rows | Replaced by "Read" and "Tools" drop-downs | Quieter chrome, and one row at every width |

Round 2 (the 55 final files) was checked the same way; nothing else was removed. Two things I would still look at in Phase 3: A's stoep on a phone adds about 200 px before "Where to start" (it is the memorable element, but on a phone it could shrink to one line per step), and B's hero on a 1280 px screen leaves the right half of the cloth empty (B2's price list could sit there).

### The most telling screenshots

- `current-doc-en-360-light` against `a-doc-en-360-light` and `b-doc-en-360-light`: the same first screen, today and in each direction.
- `current-home-en-360-light` against `a-home-en-360-light` and `b-home-en-360-light`: the header row and the home hero.
- `a-home-en-1280-light`: the stoep, page rows and the tool, side by side.
- `b-home-af-1280-dark`: the cloth hero in Afrikaans and dark.
- `b-doc-en-1280-light`: the slip and the contents on the left.
- `a-doc-af-360-dark` and `b-doc-af-360-dark`: the Afrikaans top block with the translation notice.
- `b-doc-en-360-light-reading` and `a-doc-en-360-light-reading`: "In plain words" in the reading flow.
- `a-home-af-360-light-menu`: the phone menu holds sections, tools and language.

## Found on the way (not design; for the owner)

- **Afrikaans lead of the vehicle-dealer page.** The English summary is "Vehicle dealing has three registration layers …". The Afrikaans summary is "Lees eers 01-core/. Hierdie lêer voeg die reëls by wat net vir ’n voertuighandelaar geld.", the document's first line with a raw folder name. That is a translation pipeline issue for the `af` workflow; it shows in the live page's lead too.
- **Venda and other latin-ext glyphs.** `docs/design-system.md` says latin-ext covers ḓ ṱ ṋ ṅ. Checked with fontTools: neither today's Fraunces nor Instrument Sans latin-ext files contain U+1E13, U+1E71, U+1E4B (only Commissioner's has ṅ). The browser falls back to a system font for those letters. Not urgent while only English and Afrikaans are enabled; worth a line in "Known limits".
- **Fonts.** A's wght-only Fraunces is 30.7 KB smaller than today's preloaded opsz file. The mocks cannot show the saving, because `Base.astro` preloads the opsz file on every page and the mocks must not edit it; Phase 2 swaps the preload.

## What the owner decides

| # | Decision | Options from this phase | Recommendation |
| --- | --- | --- | --- |
| D1 | Palette | A (today's palette, ink focus, rooibos only for plain words) or B (white, indigo ink, ochre) | A |
| D2 | Display face | A: Fraunces text cut for h1/h2 only, Instrument Sans for the rest. B: Commissioner for everything | A |
| D3 | Reduced motion | Both: gentler, not zero (opacity at most 120 ms, no movement) | Gentler |
| D4 | Home memorable element | A1 the stoep, A2 the ledger line, B1 the cloth hero, B2 the price list | A1 (or B1 with B) |
| D5 | Illustrations | Both keep them; only the tile changes | Stay |

Also asked: whether the document contents column may drop its underline until hover (see "Document" above).

## Files in this change

| File | What |
| --- | --- |
| `src/styles/directions.css` | Both palettes, the fonts, every mock style. Scoped to `[data-direction]`; loaded only by the eight mock pages |
| `src/components/directions/` | `MockShell.astro` (head, one-row header, footer, mock note), `MockHome.astro`, `MockDoc.astro`, `mock.ts` (mock-only copy, marked as such, in English and Afrikaans) |
| `src/pages/[...locale]/design-system/directions/` | The index and the two mock routes per direction and language |
| `tests/unit/directions-contrast.test.ts` | Every pair above, both directions, both themes, and tint separation |
| `stylelint.config.js` | `color-no-hex` off for `src/styles/directions.css` only, marked temporary |
| `package.json` | `@fontsource-variable/commissioner` 5.3.0 (OFL), used only by the B mocks |
| `docs/reviews/WP-50-directions/` | The screenshots |

## Removing the mocks after the decision

Delete `src/styles/directions.css`, `src/components/directions/`, `src/pages/[...locale]/design-system/directions/`, `tests/unit/directions-contrast.test.ts`, the Stylelint override, and (if A is chosen) the Commissioner dependency. The chosen palette moves into `tokens.css` in Phase 2 with its pairs in `CONTRAST_PAIRS`.
