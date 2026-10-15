# lead-dedupe review, pass 4

## Verdict: NOT CLEAN

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 1 |
| Minor | 7 |
| Nit | 0 |

Scope: branch `lead-dedupe` at `968b94e`, the pass 3 fixes included. The reviewer reviewed it fresh and changed no code.

This record comes from the report the coordinator relayed. The author did not see the reviewer's probe table, mutation results or per-summary table in full, so those are summarised below.

## Checks run

- Builds: OK.
- `pnpm gate:fast`: 3446 unit and dom tests and 43 content tests pass.
- `pnpm content:fidelity --lang af`: 0 findings.
- `content:drift`: none, at every one of the branch's 18 commits.
- `summarySource`: 17 override and 20 derived, in both languages.
- Search index: it differs from `ea15b4a` only in the quick-answer lead fields.
- HTML: 76 files differ, and only by the lead, meta descriptions and hub summary rows.
- Full e2e over chromium, mobile and nojs, sharded: about 1777 passed, 0 failed.
- Dealer two-screen test: passed 20 times out of 20, at 1,477px.
- A first-screen sweep.
- axe: 208 passed.
- Mutations of the content check, and a fresh probe table.
- Per-summary accuracy table: every summary is accurate except "What has changed" (M1) and branding prompts (m1).

## Findings

**M1: the "What has changed" lead turns most readers away.** The English and Afrikaans lead begins "Read this if you keep a copy of the toolkit in Google Drive: …". That tells most web readers the page is not for them. But it is the toolkit's only changelog, and Change 4 lists factual corrections:

- COIDA applies to a salaried sole director;
- a sole proprietor is barred from UIF and COIDA;
- only natural persons may sue in the Small Claims Court.

Lead with what changed, including corrections to earlier advice, and put the Drive copy second.

**m1: the branding prompts lead is wrong about the options.** "Each prompt gives you 5 options" is not true of Prompt 0 (the brief) or Prompt 11 (put it all together), and it nearly repeats block 3. Reword in English and Afrikaans, with numbers byte-identical.

**m2: short-sentence leads slip through.** Also fail when the whole lead, or every one of its sentences whatever their length, is inside an opening text. "Topic: …" leads must still pass. Probes: "Print this. Tick as you go." and "Pick two channels. Do those two properly."

**m3: the H1 and the main reason are not fully compared.** Compare the H1 as a heading. Apply whole-text containment to the business type's main reason. Probe: "Three separate registration layers."

**m4: no test ties English and Afrikaans summaries together.** Add content tests: every doc with an English override has an Afrikaans one, and the numbers in each pair are equal.

**m5: no probe depends on the form view.** Add one that only the form view catches, so removing it fails.

**m6: the dealer lead's height limit is not recorded.** `design-system.md` should say that the English dealer lead is height-bound (1,477px of 1,480 at 360×740), so later edits must remeasure.

**m7: the measurement notes need two clarifications.**
- Say what was measured on the receipt, which has no `.st-blocks h2`, or give the count for pages that have one.
- Note that the numbers in `nojs.spec.ts` (label-row end, of 740) and in the design doc (notice top, of 696) measure different things.

## Fixed in

- `7c31766` fix(content), M1 and m1:
  - "What has changed": "Every change to the toolkit, including corrections to earlier advice, and what to paste into a Google Drive copy to keep it in sync." Checked against Change 4 ("plus three corrections") and "What you need to paste into Drive".
  - Branding prompts: "…; ten of them give you 5 options to refine." Prompt 0 and Prompt 11 have no options; Prompts 1 to 10 do.
- `388daa6` fix(af), M1 and m1 in Afrikaans:
  - "Elke verandering aan die gereedskapstel, ook regstellings van vroeëre raad, en wat jy in ’n Google Drive-kopie moet plak om dit gelyk te hou."
  - "…; tien daarvan gee jou 5 opsies om te verfyn."
  - The commit asks for the owner's Afrikaans review.
- `4ea607b` test(tests), m2 to m7:
  - The check now applies whole-lead and every-sentence containment, compares the H1 as a heading, and treats the main reason as whole-text containment.
  - New test: every English summary override has an Afrikaans one with the same numbers.
  - New probes: "Print this. Tick as you go.", "Pick two channels. Do those two properly.", "Three separate registration layers.", a sentence that is the dealer's main reason, a sentence that is its H1, and the receipt's form line (caught only through the form view). "Vehicle dealing: the registrations, the consumer law and VAT." still passes.
  - Mutations: removing the whole-lead and every-sentence rules, the main-reason rule, the H1 or the form view each makes the probe test fail. Each was tried and reverted.
  - `design-system.md` covers m6 and m7.
  - The sweep was remeasured on the final summaries and is unchanged from pass 3: 244 measurements up and 78 down. 10 of the 78 are on pages whose first h2 is not a heading of the text: the forms' "Required items", the hub tiles' heading and the checklist's "Your progress".
