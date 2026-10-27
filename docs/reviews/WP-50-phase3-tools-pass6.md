# WP-50 Phase 3, item 4 (the tools): review pass 6

**CLEAN**: zero blocker, zero major, six minor.

- Branch reviewed: `wp50-p3-tools` at `55f7b61` (the pass 5 fixes in `f103965`), compared with `ea15b4a`.
- Reviewer: a fresh instance, checklists `stoep-design`, `web-interface-guidelines`, `accessibility`, `review-animations`. This file records the findings as the coordinator relayed them; the reviewer's full text is with the coordinator.

## What the reviewer ran

| Check | Result |
| --- | --- |
| `pnpm build` | OK; budgets unchanged (24.3 and 34.9 KB) |
| `pnpm gate:fast` | exit 0; 3,449 tests |
| e2e chromium + mobile + nojs, 8 shards | 1,808 passed, 144 skipped, 0 failed, including all 30 search Enter tests |
| axe | tool tests 24 passed; routes 80 passed |
| Layout shift | worst 0.029 |
| 200% text | OK, except the known Afrikaans translation notice on `/af/checklist/` |
| Without JavaScript | the step region is present and empty |

**The hidden step region, verified by hand:**
- it is a 1×1 clipped box, absolutely positioned;
- writing to it or clearing it shifts nothing;
- a press moves the button only by the "Done" badge's line;
- it is silent on load and with `?saved=1`, and speaks once per press;
- My path has exactly two polite, atomic live regions;
- the region was never focused in 129 presses of Tab;
- it is hidden in forced colours, in print and in the dark theme.

**Mutation probes R1 to R13** (the full table is with the coordinator):

| Probe | What it breaks | Caught at `55f7b61` |
| --- | --- | --- |
| R1 | `hidden` on the step region | only by the CDP test |
| R2 | `aria-hidden` on the step region | only by the CDP test |
| R3 | progress announced on every load | no |
| R3b | the `?saved=1` message announced in the step region | no |
| R4 | a `tabindex` on the step region | no |
| R5 | the visible `[data-status]` line's role removed | no |
| R6 | `.st-step__head` stays absolutely positioned when only "Do this next" shows | no |
| R9 to R13 | (in the coordinator's table) | yes |

## Minors

**m1**: test that the step region is silent on load and with `?saved=1`. Install a MutationObserver through `page.addInitScript`, load `my-path/` and `my-path/?saved=1`, and assert there is no non-empty write to `[data-step-status]` before the first press and exactly one after it. Probes R3 and R3b must fail it.

**m2**: assert that the "Do this next" badge's bottom is at or above the top of the first visible `li[data-doc] a` in the same card, at 320 and 1280px. Probe R6 must fail it.

**m3**: in the Chromium-tree test, also assert that `st-my-path [data-status]` is role `status` with `live: polite`. Probe R5 must fail it.

**m4**: assert that the step region has no `tabindex`, in the Chromium-tree test or in the DOM test that reads `my-path.astro`. Probe R4 must fail it.

**m5**: in the DOM test (reading the real element from `my-path.astro`), also assert no `hidden` and no `aria-hidden`, so `gate:fast` guards against R1 and R2.

**m6**: `docs/design-system.md`, tools table, My path row: "…which Chromium does not  Since review pass 5…" is missing its full stop.

## Fixed in `7910f3d`

No change to the site's code; tests and the design record only.

- **m1**: `tools.spec.ts`, "the step region is silent on load and with ?saved=1, and speaks once per press".
  - An init script observes the whole document from before the page's scripts run, and records the step region's text after every mutation inside it.
  - For `my-path/` and then `my-path/?saved=1` (the saved line checked visible), it expects no non-empty write after load, then exactly one after one press.
  - Probes R3 and R3b each fail it. R3b also fails "a press moves the button…", whose saved line is then empty.
- **m2**: `tools.spec.ts`, "Do this next sits above the step's first page", at 320 and 1280px: the badge's bottom is at or above the top of the card's first visible page link. Probe R6 fails both widths: the badge's bottom was 16 to 17px below the link's top.
- **m3**: the Chromium-tree test, now "the two status regions are polite statuses…", checks `[data-step-status]` and `[data-status]`. Each must be role `status`, `live: polite` and not focusable. Probe R5 fails it ("Expected: status, Received: none").
- **m4**:
  - The tree test checks the step region is not focusable and has no `tabindex` attribute.
  - The DOM test checks that the element from `my-path.astro` has no `tabindex`.
  - Probe R4 fails both: in the tree test, "is not focusable: Expected false, Received true".
- **m5**: the DOM test checks that the element from `my-path.astro` has no `hidden` and no `aria-hidden`. Probes R1 and R2 each fail it under `vitest`, so `gate:fast` now catches them.
- **m6**: the full stop is in.

Every probe was applied, built where it needed a build, run and reverted.
