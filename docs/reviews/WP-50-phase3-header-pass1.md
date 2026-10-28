# WP-50 Phase 3, item 5 (the header, footer and navigation): review pass 1

**NOT CLEAN**: zero blocker, one major, seven minor.

- Branch reviewed: `wp50-p3-header` at `25a8a1b` (`2cbb6b1` the change, `25a8a1b` its record), compared with `ea15b4a`.
- Reviewer: a fresh instance. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | exit 0; `dist:audit` and `dist:trust` OK; script budgets unchanged (heaviest document page 24.3 KB, `/af/search/` 34.9 KB) |
| `pnpm gate:fast` | exit 0; 3,446 unit and dom tests |
| e2e, chromium + mobile + nojs, sharded | all passed; 2 load timeouts that passed on rerun |
| `pnpm test:a11y` | 828 passed; 2 load timeouts that passed on rerun |
| The bar | 61px everywhere measured, every control's top at 8px and 44px tall, EN and AF, with and without JavaScript |
| AI notice positions | as the table in `docs/design-system.md` ("The header, footer and navigation") |
| Weight | HTML +0.5 KB gzip per page (the footer's site map), CSS +0.3 KB gzip |
| Keyboard | Tab order skip link, wordmark, search, language, Menu; focus ring visible |
| Without JavaScript | Menu reaches the footer's site map; the menus work from 1024px |
| Forced colours | bar rule and control borders kept |
| 404 and `/design-system/` | correctly excluded (their own shell) |

Mutation table (the reviewer broke the code and ran the tests):

| Mutation | Caught |
| --- | --- |
| Ring shown below 1024px | yes |
| Wordmark name shown below 360px | yes |
| `/` hint shown below 1024px | only indirectly |
| Footer links muted | no |
| Search and Menu borders transparent | no |
| Focus outline transparent | no |

## Major

**M1.** With 200% root text at 320 and 360px, or at narrow CSS widths from browser zoom (240px English, 160px Afrikaans), `.st-topbar__home` (`flex: 1 1 0; min-inline-size: 0`) shrank below its logo: the link was 12 to 19px wide and the mark and name were overprinted by Search and the language link. A WCAG 1.4.4 and 1.4.10 regression against `ea15b4a`, and a home-link target of 12 to 19px. Fix: give the link a floor of at least the mark and target size, drop to mark only, then let the row wrap before anything overlaps; tests at 320 and 360px with 200% root text and at 240 and 160px (EN and AF) asserting that no two bar children intersect and that the home link is at least 44px wide; probe by restoring `min-inline-size: 0`.

## Minors

1. **m1.** The focus-ring test should assert outline width and colour equal the resolved `--st-focus` and `--st-focus-width` (as `design-system.spec.ts` does). Probe: outline colour transparent.
2. **m2.** Assert the search and Menu border colour equals the resolved `--st-border-strong`, and the footer link colour `--st-text`. Probes: transparent borders, muted footer links.
3. **m3.** Assert the `/` hint is hidden at 768px and shown from 1024px.
4. **m4.** Desktop readers can now reach light and dark only at the end of the page. Add a way from the top: a "Light or dark" item in the Tools menu from 1024px that jumps to the footer's theme control (a fragment link that works without JavaScript; focus lands on the control's group), and mention the footer control in `/about/` Settings next to low data mode. Keys in both i18n files; test it.
5. **m5.** Add a "Back to top" fragment link after the footer's site map (works without JavaScript, 44px).
6. **m6.** Note the footer's three `h2` headings in `docs/design-system.md` for the Phase 5 screen-reader pass.
7. **m7.** Note in `docs/design-system.md` that at 1024px with 200% text the sticky bar is 161px.

## Fixed in `188c76c`

| Finding | Fix | Test, and the probe that fails it |
| --- | --- | --- |
| M1 | `.st-topbar__home` keeps `min-inline-size: min-content` (its longest word beside the mark) and the mark-only logo `min-inline-size: 44px`; the row wraps instead. Measured: 320px at 200% text 172px (two rows), 360px at 200% 250px (three), 240 and 160px 109px (two); nothing overlaps (`docs/reviews/WP-50-phase3-header/zoom-*.png`) | `header.spec.ts`, "large text and zoom": 320 and 360px at 200%, 240 and 160px, home and a document page, EN and AF; no two children of the bar intersect, the logo stays inside its link, the link is 44px or wider. Probe: restoring `min-inline-size: 0` and dropping the logo's floor failed all four ("the wordmark runs out of its link") |
| m1 | — | The phone keyboard test compares each control's focused outline with `solid`, `--st-focus-width` and the resolved `--st-focus`. Probe: `.st-topbar__search:focus-visible { outline-color: transparent }` failed it |
| m2 | — | "search and Menu are drawn with the strong border, and footer links in the text colour". Probes: transparent control borders failed it (`rgba(0, 0, 0, 0)` for `rgb(125, 115, 98)`); footer links in `--st-text-muted` failed it (`rgb(92, 86, 72)` for `rgb(30, 27, 22)`) |
| m3 | — | "the `/` hint is hidden below 1024px and shown from 1024px" (Chromium, a mouse screen). Probe: no longer hiding the hint below 1024px failed it |
| m4 | From 1024px the Tools menu ends with "Light or dark" / "Lig of donker" (`nav.themeLink`), `#st-theme`; the footer's theme control is wrapped in `<div id="st-theme" tabindex="-1">`, so the browser focuses it. `/about/` Settings gains "Light or dark is under Theme at the end of every page." with a "Go to Theme" link (`about.settings.themeHelp`, `about.settings.themeLink`) | `header.spec.ts`: the link, its words in both languages, the jump and focus at 1280px; `/about/` in both languages. `nojs.spec.ts`: the same jump with no script. `content.spec.ts`'s exact Tools list gains `#st-theme`; the site-map comparisons skip in-page links. Probe: removing `tabindex="-1"` failed the focus checks |
| m5 | "Back to top" / "Terug na bo" (`nav.backToTop`, an existing key) ends the footer: `#top`, which every browser takes to the top of the document (a link to the sticky bar would not scroll from 1024px; the first try did not) | `header.spec.ts`: 44px tall, goes to `#top`, `scrollY` 0; `nojs.spec.ts`: works with no script |
| m6 | `docs/design-system.md`, "Known limits": the three footer `h2`s, for the Phase 5 NVDA and TalkBack pass | — |
| m7 | `docs/design-system.md`, "Large text and zoom": 159 to 161px from 1024px with 200% text, kept sticky, revisit in Phase 5 | — |

Weight after the fixes: script unchanged (24,832 B heaviest document page, 35,759 B `/af/search/`).
