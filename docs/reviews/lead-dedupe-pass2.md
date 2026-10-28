# lead-dedupe review, pass 2

## Verdict: NOT CLEAN

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 3 |
| Minor | 8 |
| Nit | 0 |

Scope: branch `lead-dedupe` at `ace466b`, the pass 1 fixes included. The reviewer reviewed it fresh and changed no code. Three summaries mislead.

This record comes from the report the coordinator relayed. The author did not see the reviewer's full probe table or the per-summary accuracy table. Only the probes and rows the findings name are listed below.

## Checks run

- Builds: OK.
- `pnpm gate:fast`: 3446 unit and dom tests pass.
- `pnpm content:fidelity --lang af`: 0 findings.
- e2e: 663 passed, 14 skipped.
- Data counts: 20 derived and 17 override summaries in each language. The longest override is 183 characters.
- Search index: it differs from `ea15b4a` only in the quick-answer lead fields.
- HTML diff: 69 pages differ, including the summary rows on the hub pages.
- Probe table A to H against the content check. The probes named in the findings:
  - **A:** the vehicle dealer's old lead. It must fail.
  - **C:** a lead equal to an item of the dealer's "Quick answer" list. It passed, which is the gap in m3.
  - **E:** a lead equal to the receipt's callout. It passed, which is the gap in m3.
  - **H:** "Vehicle dealing: the registrations, the consumer law and VAT." It failed as a false positive, because the check split sentences at ":". That is m2.
- A wider overlap sweep, comparing each lead with the page's headings and early blocks.
- A first-screen sweep over all 74 pages at three sizes, with JavaScript on and off.
- A per-summary accuracy table: each written lead checked against its page.

## Findings

**M1: the vehicle-dealer lead over-claims.** "The three registrations a dealer needs (SAPS, vehicles in the business's name, motor trade numbers) …" is wrong on two counts:

- The page makes motor trade numbers conditional. They are "Optional but often needed", and only if you drive unregistered or unlicensed stock on public roads.
- A sole proprietor may register vehicles against their own ID.

Fix in English and Afrikaans so every claim matches the page. Keep the English dealer's first heading within 1,480px at 360×740.

**M2: the food lead misstates the page.** "The one document you must have before you sell food, the other permits you may need" leaves out that the page also requires a business licence before trading, with zoning and training in its lists.

**M3: "Eleven AI prompts" is wrong.** The page has Prompt 0 to Prompt 11, which is twelve, and "What has changed" says "all 12 branding prompts".

**m1: beauty wording.** The English lead should follow the page's heading, "the insurance you actually need". The Afrikaans lead should use the page's own phrase for no-shows, "kliënte wat nie opdaag nie".

**m2: the check splits sentences at ":" and ";".** That gives false positives on "Topic: …" leads (probe H). Split at . ! ? only, or apply containment only to fragments of five words or more.

**m3: the check reads only paragraphs and notes.** Extend it to callouts and list items among the first visible blocks, and to headings for exact sentence containment, so it checks what the reader sees first (probes C and E). Update the test name and `design-system.md`.

**m4: two Afrikaans pages sit close to the no-JavaScript limit.** Afrikaans beauty and retail end the AI notice's label row at 730 and 720px of 740 at 360×740. Add them to the no-JavaScript first-screen loop in `nojs.spec.ts`.

**m5: the marketing-prompts lead echoes its first heading.** "actually find customers" against the heading's "actually get customers", in English and Afrikaans.

**m6: Afrikaans wording.**
- Mood and materials: "Met wat …" becomes "Dit sluit in wat …".
- Professional and creative: "betaal word" becomes "om betaal te word".
- Checklist: keep "regte".
- Food: "tuisbak" becomes "tuisbakkery".

These still need the owner's Afrikaans review.

**m7: record every page whose first heading moved down.** Remeasure after these rewrites. The reviewer's list: English food +29, English "Running a Pty Ltd" +29, Afrikaans branding prompts +87, Afrikaans marketing +58, Afrikaans mood +116, Afrikaans checklist +116, Afrikaans retail +29, Afrikaans "Running a Pty Ltd" +29, and receipt in English and Afrikaans +29 at 412×915.

**m8: "What has changed".** "keep the two copies the same" should say "in sync", with the Afrikaans equivalent.

## Fixed in

- **`02da879` fix(content): seven English summaries (M1, M2, M3, m1, m5, m8).** Each claim was checked against its own page:
  - **Vehicle dealer:** "SAPS registration, registering the vehicles you sell, trade numbers if you drive unregistered stock, and the consumer law behind every sale." Its first heading is at 1,477px at 360×740, the same as at `ea15b4a`.
  - **Food:** "The certificate every food business needs, the business licence and other papers around it, labelling, and how long it all takes, from home baking to a food truck."
  - **Branding prompts:** "Twelve AI prompts …"
  - **Beauty:** "… the insurance you actually need …"
  - **"What has changed":** "… how to keep both copies in sync." Not "the two copies in sync", which would repeat that heading word for word.
  - **Marketing prompts:** reworded. The new pass 2 check also caught **"Pick your business type"**, whose lead repeated its heading "What everyone needs, regardless of type", so it was reworded too.
- **`9a76367` fix(af): ten Afrikaans summaries (M1, M2, M3, m1, m5, m6, m8).** These are the same seven pages plus mood and materials, professional and creative, and the checklist. The commit flags them for the owner's Afrikaans review. Numbers are as in English.
- **`a01c724` test(tests): the check and the measurements (m2, m3, m4, m7).**
  - **Sentences:** sentences split at . ! ? only. Containment counts only for a sentence of five words or more.
  - **What it reads:** the first ten visible blocks that carry text: paragraphs, notes, callouts, list and task-list items, and headings. Against a heading, a sentence fails when it is inside the heading or shares a six-word run with it.
  - **Probes:** a new test holds the check to A, C, E and the old marketing lead, which all fail, and H, which passes.
  - **`nojs.spec.ts`:** now checks Afrikaans beauty and retail at 360×740 and 412×915.
  - **`design-system.md`:** says what is compared. It also lists every page whose first heading moved down, from a sweep of all 74 pages at 320×568, 360×740 and 412×915 with and without JavaScript, against `ea15b4a`. In that sweep, 244 of 444 measurements moved up and 72 moved down. The Afrikaans checklist moves the most: +117 to +145px. Its old lead was the one line "Druk dit uit. Merk af soos jy gaan."; it now has a written summary of about five lines. On every page and size, the AI notice's label row stays inside the first screen.
