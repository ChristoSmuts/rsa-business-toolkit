# lead-dedupe review, pass 7

## Verdict: CLEAN

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 0 |
| Minor | 3 |
| Nit | a few, in the per-summary table |

Scope: branch `lead-dedupe` at `35da99a`, the pass 6 fixes included. The reviewer reviewed it fresh and changed no code. This is the second clean pass in a row, so the branch merges once these minors are done.

This record comes from the report the coordinator relayed. The reviewer's mutation table (M1 to M15), false-positive probes and per-summary table are summarised, not copied.

## Checks run

- **Builds:** OK.
- **`pnpm gate:fast`:** 3446 unit and dom tests and 46 content tests pass.
- **`pnpm content:fidelity --lang af`:** 0 findings.
- **Search index:** differs from `ea15b4a` only in the lead field, for 5 English and 7 Afrikaans docs.
- **HTML:** 76 files differ, only by the lead, meta descriptions, hub summary rows and the sample.
- **Pages with a lead:** 34, exactly the 17 English and 17 Afrikaans summary overrides.
- **First-screen sweep:**
  - 1,368 measurements per tree, at nine sizes, with JavaScript on and off.
  - No new overflow.
  - The tightest is Afrikaans beauty without JavaScript, at 730 of 740.
- **English dealer:** its first heading is at 1,477.4px, inside the 1,480px the test allows.
- **Full e2e, 8 shards:** 1777 passed, 112 skipped, 0 failed. This was the second run: the first run was affected by ENOSPC (no space left on the device).
- **axe:** 152 passed.
- **Mutations:** M1 to M15, run by the reviewer. The ones that survived are m1.
- **False-positive probes:** all passed, as they should.
- **Per-summary accuracy:** all OK, with nits on wording only.

## Findings

**m1: four rules still have no probe, so the "every rule pinned" claim does not hold.**
- **The Afrikaans main reason.** It is taken from the Afrikaans hub, and no probe covers that. Mutations M1, M2 and M13 survive.
- **The last window of eight words.** Changing `index + size <= list.length` to `<` survives.
- **A figure read whole.** Changing the figure pattern to `\d+` survives, because "R1,200" and "R1 200" then compare equal.
- **A number that is there twice.** Removing duplicates with a `Set` survives.

**m2: no test holds a shown summary to its written text.** The build passes every summary through `truncateSummary`. A written summary that the build cut short would show as a lead that differs from `docs.meta.json`, and no test would notice.

**m3:** no action.

## Fixed in

- **`79f2dc0` test(tests), m1 and m2.**
  - **m1:** four probes in "pins each rule of the lead check":
    - "Gesondheidsinspeksie en munisipale lisensie." on the Afrikaans beauty page is caught;
    - "New words here: then ask every happy customer for a review." on marketing prompts is caught;
    - `summaryNumbers('R1,200')` differs from `summaryNumbers('R1 200')`;
    - "5 steps, 5 options." differs from "5 steps and options.".
  - **m2:** a new test, "shows every summary override exactly as docs.meta.json writes it". It checks both `doc.summary` and `docLead`.
  - `design-system.md` and the test comment now say 47 mutations.

Each of the six new mutations was run once on a copy of the test file and then reverted. Each one fails "pins each rule of the lead check":

| Mutation | Probe that fails |
| --- | --- |
| The Afrikaans page reads the English hub | "Gesondheidsinspeksie en munisipale lisensie." |
| The translated hub is read as if it were the English one | the same |
| No main reason for Afrikaans pages | the same |
| `index + size <= list.length` → `<` | "New words here: then ask every happy customer for a review." |
| Figure pattern → `\d+` | "R1,200" against "R1 200" |
| Numbers kept in a `Set` | "5 steps, 5 options." against "5 steps and options." |

The m2 test was checked with two scratch edits, each reverted:
- **The quotation's English override set to 230 characters.** `content:build` stops at the schema's 200-character limit ("Too big: expected string to have <=200 characters").
- **The same edit, with the schema limit raised to 400.** The build cuts the summary back to its first sentence, "Tell a customer the price before you do the work, and send it as a PDF.". `src/data` then matches a fresh build, so the drift and fresh-build tests pass. The new test is the one that fails: 1 failed, 46 passed.

That commit passed `pnpm gate:fast` on its own.
