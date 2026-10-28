# lead-dedupe review, pass 3

## Verdict: CLEAN

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 0 |
| Minor | 6 |
| Nit | 0 |

Scope: branch `lead-dedupe` at `a1fed4e`, the pass 2 fixes included. The reviewer reviewed it fresh and changed no code. All 34 written summaries are accurate to their pages.

This record comes from the report the coordinator relayed. The author did not see the reviewer's full probe table or the per-summary table, so they are summarised below.

## Checks run

- **Builds:** OK.
- **`pnpm gate:fast`:** 3446 unit and dom tests and 43 content tests pass.
- **`pnpm content:fidelity --lang af`:** 0 findings.
- **e2e:** 663 passed, 14 skipped.
- **Dealer two-screen test:** run 5 times, stable each time.
- **Data counts:** `summarySource` is 17 override and 20 derived in each language.
- **Search index:** it differs from `ea15b4a` only in the length of the quick-answer lead fields.
- **HTML diff:** limited to leads, meta and social descriptions, and hub summary rows.
- **First-screen sweep:** 444 measurements, all 74 pages at three sizes with and without JavaScript. The tightest no-JavaScript cases at 360×740 are Afrikaans beauty (686), Afrikaans professional and creative (679) and Afrikaans retail (676), each of 696.
- **Probe table:** every probe behaved as intended.
- **Per-summary table:** all OK.

## Findings

**m1: the dealer lead does not quite match Layers 2 and 3.**
- Layer 3 says "unregistered or unlicensed". The lead should use those words.
- "Registering the vehicles you sell" should be closer to Layer 2, which lets a sole proprietor register against their own ID.
- Do not edit the dealer's "Quick answer" item 8, which omits "unlicensed"; a markdown fix needs an official source. Record it in the backlog instead.
- Keep the English dealer's first heading within 1,480px at 360×740.

**m2:** the Afrikaans dealer lead should use the page's term "motorhandelnommers".

**m3:** the Afrikaans food lead's "ander papiere daarom" should read "ander papiere wat daarby hoort".

**m4:** add Afrikaans professional and creative to the no-JavaScript 360×740 loop in `nojs.spec.ts`. Mention it in the tightest-cases sentence of `design-system.md`.

**m5:** the content check should also read table cells near the top and the business type's "Main reason" shown under the H1. List what is still excluded in the test comment and in `design-system.md`.

**m6: the measurements and a content question.**
- `design-system.md` should say "about 70 moved down", or remeasure.
- Add a backlog row for the owner's content review: "Three separate registration layers" reads as if all three are required, while Layer 3 is optional. The phrase appears in the hub table, the type's "Main reason" and the dealer's second paragraph.

## Fixed in

- **`2a21b77` fix(content), m1.** English dealer lead: "SAPS registration, stock registered to the business or your ID, trade numbers to drive unregistered or unlicensed stock, and the consumer law." The first heading is at 1,477px at 360×740. Two longer versions measured 1,506px and were dropped.
- **`77fcc2d` fix(af), m1 to m3.** The Afrikaans dealer lead follows the English one: "jou ID-nommer", "motorhandelnommers om ongeregistreerde of ongelisensieerde voorraad te ry". The food lead says "ander papiere wat daarby hoort". Both are flagged for the owner's Afrikaans review.
- **`3dc585e` test(tests), m4 to m6.**
  - **Content check:** it now reads table cells and the type's "Main reason". The test comment and `design-system.md` list what is still excluded: block 11 onwards, the closed "Words used" table, and a sentence pieced together from several items or cells of fewer than five words.
  - **Probes:** two new ones, a cell of the hub's effort table and the beauty page's main reason. Each fails when its addition is removed from the check.
  - **Leads:** all 34 still pass.
  - **`nojs.spec.ts`:** now also checks Afrikaans professional and creative.
  - **Sweep:** remeasured after these rewrites. 244 measurements moved up and 78 moved down; the Afrikaans dealer and food leads are now a line longer. The four tightest no-JavaScript cases at 360×740 are Afrikaans beauty 686, Afrikaans professional and creative 679, Afrikaans vehicle dealer 679 and Afrikaans retail 676, each of 696. `nojs.spec.ts` checks all four.
  - **Backlog:** two rows for the owner, one for item 8 and one for "Three separate registration layers".
