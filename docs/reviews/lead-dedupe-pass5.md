# lead-dedupe review, pass 5

## Verdict: NOT CLEAN

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 2 |
| Minor | 5 |
| Nit | 0 |

Scope: branch `lead-dedupe` at `b8b54f1`, the pass 4 fixes included. The reviewer reviewed it fresh and changed no code.

This record comes from the report the coordinator relayed. The author did not see the reviewer's probe lists, mutation table or per-summary table in full, so they are summarised below.

## Checks run

- **Builds:** OK.
- **`pnpm gate:fast`:** 3446 unit and dom tests and 44 content tests pass.
- **`pnpm content:fidelity --lang af`:** 0 findings.
- **Search index:** differs from `ea15b4a` only in the lead field, for 5 English and 7 Afrikaans docs.
- **HTML:** 76 files differ, only by the lead, meta descriptions and hub summary rows. 34 pages have a lead.
- **Full e2e, sharded:** 0 failed.
- **axe:** 178 passed.
- **First-screen sweep:** the AI notice is on the first screen everywhere. The tightest no-JavaScript label row is Afrikaans beauty, at 717 of 740.
- **English dealer:** its first heading is at 1,477.4px in 15 of 15 loads.
- **Fresh probes:** the reviewer listed which were caught and which passed.
- **Mutation table:** removing the whole-lead rule alone kept 44 of 44 green. So did removing the every-sentence rule alone.
- **Per-summary accuracy table:** all OK except "What has changed".

## Findings

**M1: the "What has changed" lead over-claims.** In English and Afrikaans it says "Every change to the toolkit, including corrections to earlier advice". The page covers only Changes 1 to 5, from 13 September to 13 October 2026. Older corrections are in `00 Start here/02-how-this-was-made.md`, for example:
- the repeal of paragraph 11C deemed remuneration in 2017;
- the Small Claims Court limit rising from R20,000 to R30,000 from 1 August 2026;
- the claims softened in passes 3 to 8.

Rewrite from the page. Verify how many corrections it lists, keep "13" and "2026" byte-identical, and keep the AI notice on the first screen.

**M2: the probe test does not guard each rule as documented.** Removing the whole-lead rule alone, or the every-sentence rule alone, keeps all 44 tests green. Add a probe that only the every-sentence rule catches. Drop or document the redundant rule, and correct `design-system.md` so it claims only what the probes prove.

**m1: the "same numbers" test compares digits only.** Counts written as words, from one to twelve, should match too.

**m2: line 7 of the branding prompts page is wrong.** It says "Each one gives you 5 options", which Prompts 0, 6 (Path A) and 11 contradict. This needs a markdown fix for the owner, not a summary change. Record it in the backlog.

**m3: Afrikaans wording.**
- "regstellings aan vroeëre raad", not "van".
- Dealer: "voorraad wat op die besigheid of jou ID-nommer geregistreer is".
- Privacy notice: "wat jy oor hulle bewaar".

**m4: `4ea607b` on its own fails `astro check`.** Noted in the hand-back. The branch will be squash-merged, so main gets one green commit.

**m5:** no action.

## Fixed in

- **`c98b554` fix(content), M1.**
  - English: "What changed in the toolkit since 13 September 2026, including three corrections to earlier advice, and what to paste into the Google Drive copy to keep it in sync." Change 4 is "you are the business, plus three corrections", and three rows sit under "Corrected".
  - Afrikaans: "Wat sedert 13 September 2026 in die gereedskapstel verander het, ook drie regstellings aan vroeëre raad, …".
  - Both are in this one commit, because the content test holds the numbers of the two summaries equal.
  - Measured after the change: at 360×740 the English first heading moved from 1,418 to 1,447px and the Afrikaans one stayed at 1,735px. At 320×568 the Afrikaans one moved from 1,848 to 1,877px. The AI notice's label row ends at 554px with JavaScript and 602px without, at 360×740 in both languages.
- **`c859298` fix(af), m3.** Dealer: "voorraad wat op die besigheid of jou ID-nommer geregistreer is". Privacy notice: "wat jy oor hulle bewaar". The dealer's label row without JavaScript at 360×740 still ends at 723px of 740. The vehicle-dealer content test follows.
- **`6e07309` test(tests), M2, m1 and m2.**
  - The whole-lead rule is gone; the every-sentence rule covers a lead wholly inside one text.
  - New probe: "Required, in this order. Optional but often needed.", on the dealer page.
  - The number comparison now maps one/een to twelve/twaalf. A probe shows "Elf … nege daarvan" fails against "Twelve … ten of them".
  - Each mutation was tried once and reverted. Removing the every-sentence rule, the main-reason rule, the form view or the H1 makes the probe test fail. Removing the number words makes the number test fail.
  - `design-system.md` now claims only what the probes prove.
  - A backlog row records branding prompts line 7 for the owner.

Each of these commits passed `pnpm gate:fast` on its own.
