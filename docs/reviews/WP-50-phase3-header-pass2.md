# WP-50 Phase 3, item 5 (the header, footer and navigation): review pass 2

**NOT CLEAN**: zero blocker, two major, nine minor.

- Branch reviewed: `wp50-p3-header` at `0a4964f` (the pass 1 fixes in `188c76c`), compared with `ea15b4a`.
- Reviewer: a fresh instance. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.
- Before the fixes, `origin/main` (`0a618bb`, lead-dedupe) was merged in with a merge commit, `e2fc856`. The conflicts (backlog rows, the no-JavaScript AI notice test's pages, two paragraphs of `docs/design-system.md`) were resolved keeping both sides.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | exit 0; script budgets unchanged |
| `pnpm gate:fast` | exit 0; 3,446 unit and dom tests and 40 content tests |
| e2e, chromium + mobile + nojs, 4 shards | 0 failures |
| `pnpm test:a11y` | 828 passed |
| Language link over all 198 pages with the header | no problems |
| The bar | 61px at 100% text; at 200% text and narrow zoom it wraps, nothing overlaps |
| Keyboard | checks as recorded below (M1) |
| Mutation table | below the findings |

## Majors

**M1.** "Back to top" (`#top`, naming no element) scrolled to the top but left focus on the off-screen link; the next Tab went to the page. Link to a real focusable element at the very top so focus moves there and the next Tab reaches the wordmark, with and without JavaScript; test with the keyboard (focus, Enter: `scrollY` 0, the active element at the top, the next Tab on `.st-topbar__home`); fix the wording in `docs/design-system.md` and the `SiteFooter` comment.

**M2.** The large-text and zoom test passed with `.st-topbar__inner { flex-wrap: nowrap }` (Menu off the screen, 106px of sideways scroll at 320px with 200% text). Also assert every visible bar child lies within 0 to `innerWidth` and, on the home page, `scrollWidth − clientWidth ≤ 0`; probe `nowrap`.

## Minors

1. **m1.** `<st-lang-switch>` must carry only content heading ids, not the chrome's fragments (`#st-theme`, `#st-site-map`, `#top`). Test it.
2. **m2.** Without JavaScript the Tools `<details>` stays open after "Light or dark" and later covers the H1. Put "Light or dark" last in Tools after a visual separator (m8); note in `docs/design-system.md` that without JavaScript the menu stays open until closed; use a clean no-JavaScript way to avoid it if there is one.
3. **m3.** Assert the bar's visual left-to-right order at 360px (wordmark, Search, language, Menu) and 1280px (wordmark, Read, Tools, search, ring if shown, language); probe with CSS `order`.
4. **m4.** Assert the bar is not sticky below 1024px.
5. **m5.** Extend the token-colour checks to the language link, the wordmark, the footer headings, the footer's `--st-surface-2` ground and the bar's `--st-border` rule; the forced-colours test should check the border colour is a system colour other than Canvas.
6. **m6.** Put the `#st-theme` id and `tabindex` on the theme `<fieldset>` (or a `role="group"` named by the legend), so focus landing there is announced as the Theme group, with a ring round the control only.
7. **m7.** The `/about/` Settings pointer: put it beside low data mode, as the record says, and without JavaScript say plainly that the page follows the device's setting.
8. **m8.** The separator for "Light or dark" (with m2).
9. **m9.** Correct the counts in the record (13 kinds of page) and the "60px" comment (61px).

## Fixed in `570107a`

| Finding | Fix | Held by |
| --- | --- | --- |
| M1 | The skip link (`Base.astro`) has `id="top"`: "Back to top" scrolls there and focus moves to it (it shows), and the next Tab reaches the wordmark. Comments and record reworded | `header.spec.ts` "Back to top" from the keyboard (360 and 1280px) and by mouse; `nojs.spec.ts` with no script. Mutations `top-id-gone`, `back-to-top-small` |
| M2 | — (the code wrapped; the test could not tell) | "large text and zoom": every child within the screen, no sideways scroll on `/` and `/af/`. Mutations `row-nowrap`, `wordmark-floor-gone` |
| m1 | `navigation.ts`: the fragment goes with the link only when it names an element inside `<main>` | "carries a heading id, never a fragment of the page's chrome". Mutation `fragments-all` |
| m2, m8 | "Light or dark" is last in Tools after a rule (`NavLink.separated`, `.st-menu__item--separated`). No clean no-JavaScript way to close a `<details>` after a link inside it was found, so the record says it stays open until closed; with JavaScript it closes as focus leaves | "Light or dark" test checks the rule; `nojs.spec.ts` closes it. Mutation `theme-no-rule` |
| m3 | — | "left to right" at 360 and 1280px with the ring. Mutation `order-search-last` (CSS `order`) |
| m4 | — | "the bar scrolls away below 1024px and is pinned from 1024px" (320, 768, 1023, 1024px). Mutation `sticky-on-phone` |
| m5 | — | The token test now covers the language link, wordmark, footer headings, footer ground and bar rule; forced colours compare with the resolved `Canvas`. Mutations `lang-link-muted`, `wordmark-muted`, `footer-heading-muted`, `footer-ground`, `bar-rule-strong`, `forced-colours-canvas` |
| m6 | `ThemeControl` is one `<fieldset>` (legend, options, no-JavaScript line); the footer's has `id="st-theme" tabindex="-1"` | Focus lands on `fieldset#st-theme`; Chromium's tree names it "Tema". Mutations `theme-not-focusable`, `theme-group-unnamed` |
| m7 | The pointer sits between the low data switch and "Clear all my data", outside the script-only block; without JavaScript it says "Without JavaScript the page follows your device's light or dark setting." (`about.settings.themeHelpNoJs`) | `/about/` Settings tests in both projects, including document order. Mutations `settings-after-clear`, `settings-js-words`, `settings-nojs-words` |
| m9 | 13 kinds of page; "61px" in `SiteHeader.astro` | — |

## Audit: every claim and every test, broken on purpose

Each mutation below was made in the real CSS, markup or script (`src/`), the site rebuilt, the named tests run, and the file restored. All 39 were caught. One mutation first survived because it was too weak (`settings-after-clear` added `hidden` to "Clear all my data" instead of moving the pointer); rewritten as a real move, it was caught.

| Claim in "The header, footer and navigation" / test in `header.spec.ts` | Mutation | Result |
| --- | --- | --- |
| One 61px row at seven sizes, four pages, both languages ("the top bar is one row at …") | `one-row`: the bar's padding 16px | caught (7 sizes) |
| The ring joins the row from 1024px only ("with saved answers too") | `ring-below-1024`: ring not hidden below 1024px | caught |
| Same height before and after the web fonts ("late web fonts") | `late-font-padding`: padding in `ex` | caught (4 of 8) |
| One language link on every kind of page, named in its language ("is in the bar on every kind of page") | `both-language-links`: the page's own language linked again | caught |
| 44px targets ("are 44px targets") | `control-narrow`: controls lose their 44px minimum width | caught |
| Tab order and focus ring in the tokens ("a phone reaches the wordmark …") | `focus-ring-search`: transparent ring; `tab-order-lang-skipped`: language link out of the Tab order | caught; caught |
| The drawer does not repeat the switcher | `drawer-switcher`: switcher back in the drawer | caught |
| The mark-only wordmark keeps its name ("the browser names each control") | `wordmark-name-gone`: name `display: none` below 360px | caught |
| Landmarks named ("one banner, one contentinfo …") | `footer-nav-unnamed`: footer nav without its label | caught |
| `aria-current` in the bar, menus, drawer and footer | `footer-no-current`: footer without `aria-current` | caught |
| The footer lists every section and tool | `footer-no-tools`: no Tools group | caught |
| The theme is not in the bar | `theme-back-in-bar`: theme control in the row | caught |
| Forced colours: one row, a system border colour | `forced-colours-canvas`: control border `Canvas` | caught |
| Print leaves out bar and footer | `print-footer`: footer printed | caught |
| Large text and zoom: no overlap, on screen, no sideways scroll, wordmark 44px | `wordmark-floor-gone`: `min-inline-size: 0`; `row-nowrap`: `flex-wrap: nowrap` | caught (4 cases each) |
| Token colours: controls' border, footer links, language link, wordmark, footer headings, footer ground, bar rule | `control-border-transparent`, `footer-links-muted`, `lang-link-muted`, `wordmark-muted`, `footer-heading-muted`, `footer-ground`, `bar-rule-strong` | all caught |
| The `/` hint only from 1024px | `kbd-below-1024`: hint shown below 1024px | caught |
| "Light or dark" last, after a rule, focusing the Theme group | `theme-no-rule`, `theme-not-focusable` | caught; caught |
| The Theme group is named in Chromium's tree | `theme-group-unnamed`: legend `aria-hidden` | caught |
| `/about/` Settings pointer beside low data, words with and without JavaScript | `settings-after-clear` (moved after "Clear all my data"), `settings-js-words`, `settings-nojs-words` | survived when weak, then caught; caught; caught |
| "Back to top" 44px and goes to the top; moves focus with and without JavaScript | `back-to-top-small` (not a link block); `top-id-gone` (no `id="top"`) | caught; caught (chromium and nojs) |
| The language link keeps only a place in the text | `fragments-all`: every fragment carried | caught |
| Order left to right at 360 and 1280px | `order-search-last`: `order: 5` on search | caught |
| Static below 1024px, sticky from it | `sticky-on-phone` | caught |
| Without JavaScript Menu reaches the site map (`nojs.spec.ts`) | `site-map-id`: map's id changed | caught |
| Without JavaScript the menus work from 1024px and the Menu link hides (`nojs.spec.ts`) | `menu-link-wide`: Menu link shown from 1024px | caught |
| The AI notice on the first screen at 568×320 and other landscape sizes without JavaScript (`nojs.spec.ts`) | `nojs-stacked-menus`: the old stacked menus back | caught |

Claims that are measurements, not tests: the before/after heights and positions, the late-font shift figures, the weights, and the landscape sweep over all 74 document pages (re-run after the merge: 74 of 74 at every size, with and without JavaScript, worst top 289px at 320×568 and 263px at 568×320, unchanged). Claims held by older specs: the drawer opening from Menu and closing on Escape (`content.spec.ts`), the menus' scripted closing (`pages.spec.ts`), the switcher keeping and dropping a heading anchor (`content.spec.ts`, `pages.spec.ts`).
