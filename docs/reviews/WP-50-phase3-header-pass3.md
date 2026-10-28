# Review: WP-50 Phase 3 item 5 (header, footer and navigation), pass 3

Branch `wp50-p3-header` at `44136cb`, compared with main `0a618bb`. Fresh reviewer, read-only, scratch worktrees removed afterwards.

**Verdict: NOT CLEAN.** 0 blockers, 2 majors, 5 minors. The reader-facing work is sound; the majors are a broken measure of done and three tests that claim more than they check.

**Status: not fixed yet.** Work paused on 28 October 2026 at the owner's request after this pass. The findings below are the next step for this branch.

## What the reviewer ran

- `pnpm build`: exit 0. `dist:audit` 200 HTML files, 29,142 URLs, no problems. `dist:trust` 74 document pages. Heaviest document page 24.3 KB, **0.7 KB left** (main: 0.8 KB). `/af/search/` 35.0 KB (main 34.9 KB).
- Exact gzip bytes, main → branch: heaviest document page 24,832 → 24,878; `/af/search/` 35,759 → 35,805; `navigation.*.js` 1,574 → 1,620 (raw 3,777 → 3,887).
- `pnpm gate:fast`: exit 0. 82 files, 3,447 tests; content drift none; content 47 tests.
- e2e chromium + mobile + nojs, sharded (a 4-way first shard, then 8-way shards 3 to 8 after a time cap under shared load): 0 failures in any run.
- `pnpm test:a11y`, 4 shards: 828 passed, 0 failures. WebKit not run (cannot run in the container).
- Merge with main: every file `0a618bb` touched is identical on the branch apart from the branch's own changes to `docs/design-system.md`, `docs/reviews/backlog.md` and `tests/e2e/nojs.spec.ts`; main's extra no-JS AI-notice pages are kept. Lead behaviour intact.
- Language link: static sweep of `dist`, 198 header pages, each with one link to an existing page in the other language; `#st-site-map`, `#st-theme`, `#top` present and unique. 0 problems.
- Search dialog and held Enter: source unchanged, `search.spec.ts` passed.
- Bar and AI notice, main → branch: AF dealer 320×568 bar 165 → 61 (JS), 213 → 61 (no JS), notice 354/402 → 250; EN dealer 360×740 notice 551 → 447; AF start here 568×320 no JS bar 213 → 61, notice 415 → 263; home 1024 no JS 88.6 → 61; AF register 1280 71 → 61. At 200% text 159px (1024, sticky), 173px (768), 161px (1280), no sideways scroll. Forced colours 61px, focus ring visible. Late-font tests passed.
- Keyboard: Tab order at 1280 correct; "Light or dark" by keyboard focuses `fieldset#st-theme` with a visible ring and closes Tools; Back to top focuses the skip link, next Tab reaches the wordmark; no-JS Menu and Back to top work; no-JS "Light or dark" leaves Tools open (documented).
- Language-link fragments: content ids carried, chrome and malformed fragments dropped; in-page jumps and Back/Forward behave.

## Fresh mutations (none from pass 2's table)

| Mutation | Result |
| --- | --- |
| Footer theme legend visually hidden | not caught |
| `.st-theme-control:focus-visible { outline: none }` | not caught |
| `flex-shrink: 0` dropped from `.st-topbar__control` | not caught (no visible effect seen) |
| Menu link shown with JS too | caught indirectly (row height) |
| Footer lists lose `aria-labelledby` | not caught |
| "Back to top" moved above the disclaimer | not caught |
| Footer links `--st-text-muted` in dark only | not caught |
| `<st-lang-switch>` no longer listens for `hashchange` | not caught |

## Major findings

**M1. The script budget grew, against a WP-50 measure of done, and the record says it did not.** The fragment filter adds 46 B gzip to every page's script (24,832 → 24,878 B; `/af/search/` 35,759 → 35,805 B). "Measures of done" says script budgets must not grow. The record is wrong in `docs/design-system.md` (says "unchanged"), `.claude/skills/stoep-design/SKILL.md` rule 6 (0.8 KB) and `docs/testing.md` (no new figure). An equivalent saving exists, built and tested by the reviewer in a scratch tree: in `src/scripts/navigation.ts`, `StLangSwitch.#apply` can use `document.querySelector('main :target') ? location.hash : ''` instead of the decode/`getElementById`/`closest` block; `StNavDrawer.#onClick` can merge its two `closest()` checks into one; use `location` for `window.location`. Result: +1 B instead of +46 B, same behaviour on every probe, 98 targeted tests passing. Trim the last byte or record "+1 B", and update all three documents.

**M2. Three header checks claim behaviour they do not test.**
1. The fragment test only loads each hash with `page.goto`; the real path is an in-page jump through `hashchange`. Removing the listener fails nothing. Fix: from a heading hash, click "Light or dark" and Back to top, assert the fragment is dropped, then Back restores it.
2. "'Back to top' ends the footer" never checks order. Fix: assert it is the footer's last focusable element.
3. The footer Theme group's shown legend and focus ring are unchecked. Fix: assert the legend box is at least 1px tall and unclipped; after a keyboard jump compare the fieldset outline with `focusToken()`.

## Minor findings

1. The Theme group's focus ring spans the whole footer (about 1,250px at 1280 around a 350px control). Give `.st-footer__theme` `justify-self: start` or `inline-size: fit-content`.
2. The header comment of `src/scripts/navigation.ts` is stale (stacked no-JS menus; "a pair of ordinary links").
3. Test gaps: the footer token test runs in light only (rerun with `colorScheme: 'dark'`); nothing reads the footer list names (`chromiumAxName` on one list).
4. Indirect coverage: the controls' `flex-shrink: 0` is unasserted (no reader harm seen); nothing asserts `.st-topbar__menu-link` is hidden with JS (one `toBeHidden()`).
5. Older than this branch: `search.ts` `openResult()` uses `history.pushState` for in-page results, which fires no `hashchange`, so the language link keeps the old fragment. Backlog row.

## Checked and accepted

- Without JS, Tools stays open after "Light or dark" from 1024px (documented; no clean no-JS alternative).
- The 159 to 161px sticky bar at 1024px+ with 200% text (documented; smaller than main's 166 to 175px).
- `#main` and in-`<main>` generated ids are carried to the other language; harmless.
