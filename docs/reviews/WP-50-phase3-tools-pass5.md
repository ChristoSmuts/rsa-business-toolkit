# WP-50 Phase 3, item 4 (the tools): review pass 5

**NOT CLEAN**: zero blocker, two major, five minor.

- Branch reviewed: `wp50-p3-tools` at `d2e5d6e` (the pass 4 fixes in `0d40523`), compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text and probe table are with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | OK; budgets unchanged (24.3 and 34.9 KB) |
| `pnpm gate:fast` | exit 0; 3,449 tests |
| e2e chromium + mobile + nojs, 8 shards | net 0 failed, including the held-Enter search tests |
| axe on the tool pages | 112 passed |
| Layout shift at 320px, fonts held | `/find-my-path/` 0.029; every other tool page 0.015 or less |
| 200% text | no sideways scroll on My path or Find my path |
| Chromium accessibility tree | one polite, atomic status region |
| Paths for 441 profiles | no step shares a page with another, and no step is empty |
| i18n | 682 keys, identical in both files |

**Mutation probes (Q1 to F1):** the full table is with the coordinator. This pass's findings rest on these:

| Probe | What it breaks | Covered by |
| --- | --- | --- |
| Q1 | counts only the pressed step in the message | M2 |
| Q2′ | announces on every redraw (`profile.listen`) | M2 |
| Q3 | removes the region's role | M2 |
| D1 | `margin: 0` on the dialog from 30rem | m1 |
| G1 | the English glossary on the Afrikaans page | m2 |
| F1b | the pages inside a step are not reordered | m3 |

## Findings

**M1 (major)**: the step announcement goes into the visible status line in the page header (`<p class="st-hint" role="status" data-status>`).
- Each press inserts a 22–24px line above the path: the pressed button moves from 270 to 323px at 320px (at the base, 270 to 300). Six seconds later the line is removed. Without scroll anchoring (Safari), that is CLS 0.0355 at 320px in English, with no input.
- It also overwrites the saved tip ("Saved on this device only…", `?saved=1`) for the rest of the visit.

Fix: send the step messages to a separate, visually hidden, polite live region inside `st-my-path` (`role="status"`, `.st-visually-hidden`, present from the first render so it is registered), and keep the visible line for the saved and removed messages only. Tests:
- marking a step moves the pressed button no more than at `ea15b4a` (the badge only);
- clearing the message causes no shift (measured with `overflow-anchor: none`);
- the saved tip survives a press.

**M2 (major)**: the announcement tests are too weak.
- (a) In the every-step test, leave earlier steps marked so the counts run 1, 2, 3, 4 then back down, and assert the exact text.
- (b) Assert the hidden region's role (status) and polite live setting in Chromium's tree on the real page, skipped on WebKit with a reason. In the DOM test, use the real component markup, not a role supplied by the fixture.
- (c) In the second-tab test, assert the step-announcement region stays empty after the redraw.

Re-run probes Q1, Q2′ and Q3, show each is caught, and revert.

**m1**: check the confirm dialog's centring at 1280px (and 768px) too. Probe D1.

**m2**: the glossary link test should assert the Afrikaans `href` on `/af/` (base + `af/…/glossary/`). Probe G1.

**m3**: the second-tab test should swap the kinds of business (Food, Beauty → Beauty, Food) and assert that the page links inside the step reorder. Probe F1b.

**m4**: record in `docs/design-system.md` that the button's name change and the announcement both speak on a press (acceptable), and note `aria-pressed` with a stable name as a Phase 4 option.

**m5**: `docs/testing.md`: run parallel Playwright invocations from separate worktrees or with distinct `--output` directories.

## Fixed in `f103965`

- **M1**: the step messages go to `<p class="st-visually-hidden" role="status" data-step-status></p>`, the last child of `st-my-path`, in the HTML from the first render. It is absolutely positioned and takes no room. The visible `[data-status]` line now carries only "Saved on this device only" and "Your answers were removed". Tests in `tools.spec.ts`:
  - At 320px, with `?saved=1` and `overflow-anchor: none`, a press moves "Mark as done" by no more than 31px. That is the "Done" badge's line, 30px at `ea15b4a`; with the message in the visible line it was 53px.
  - Then, while the message is cleared (up to 9 s), a `layout-shift` observer records nothing and the button does not move.
  - The visible line still reads the saved message after the press.
- **M2**:
  - **(a)** The every-step test (EN and AF, 320 and 1280px) marks steps 1 to 4 by Enter, leaving each marked, and expects "Step n done. n of 4 done.". It then unmarks 4 to 1 by Space and expects "Step n not done. n−1 of 4 done.", checking focus after each press. Clicks on every step follow.
  - **(b)** A Chromium-only test (CDP; skipped elsewhere and in `mobile`) reads `[data-step-status]` on the real page as role `status` with `live: polite`. `tests/dom/my-path.test.ts` takes the region's element from `my-path.astro` itself, by its `data-step-status` attribute, so the role and class it checks are the page's. The DOM test also runs the counts up and down and checks the visible line keeps "Saved on this device only."
  - **(c)** The second-tab test records every write to the region from just before the other tab acts. It expects the region empty and no non-empty write. A plain "is it empty at the end" check missed probe Q2′: the 6-second timer from the first load cleared the redraw's message before the test looked.
  - **Probes**, built, run and reverted:
    - Q1 failed all four every-step runs.
    - Q2′ failed the second-tab test once it recorded writes.
    - Q3 failed the Chromium-tree test.
    - With Q1 and Q3 applied together (one build for Q1, Q3, D1 and G1), the DOM test failed too.
- **m1**: the checklist dialog test also opens "Remove all ticks?" at 768×1024 and 1280×800, and checks it is centred across and down within 1px. Probe D1 failed both language runs.
- **m2**: the glossary link's `href` starts with the base path plus the page's language (`/business-toolkit/af/` on `/af/`), and on English pages not with `af/`. Probe G1 failed the Afrikaans run.
- **m3**: the second-tab test seeds sole proprietor, Food then Beauty. It checks the step lists `business-types/food` before `business-types/beauty`. The second tab opens Find my path with those answers, unticks and reticks Food, and saves. The first page's step then lists Beauty before Food. The steps are still numbered in order, the same button keeps focus, and nothing is said. Probe F1b failed it.
- **m4**: `docs/design-system.md` (My path row) records the hidden region and why. It also records that a press speaks both the button's new name and the message, which is accepted, and `aria-pressed` with one stable name as a Phase 4 option.
- **m5**: `docs/testing.md`, under the environment variables, says to run one Playwright run per worktree at a time, or to give each run its own worktree and `PW_PORT` or its own `--output`.
