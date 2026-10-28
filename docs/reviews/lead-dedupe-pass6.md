# lead-dedupe review, pass 6

## Verdict: CLEAN

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 0 |
| Minor | 6 |
| Nit | a few, in the per-summary table |

Scope: branch `lead-dedupe` at `ae53327`, the pass 5 fixes included. The reviewer reviewed it fresh and changed no code.

This record comes from the report the coordinator relayed. The audit table below is the author's: it was run after the fixes, on the test file as committed.

## Checks run

- **Builds:** OK.
- **`pnpm gate:fast`:** 3446 unit and dom tests and 45 content tests pass.
- **`pnpm content:fidelity --lang af`:** 0 findings.
- **Search index:** differs from `ea15b4a` only in the lead field, for 5 English and 7 Afrikaans docs.
- **HTML:** 76 files differ, only by the lead, meta descriptions, hub summary rows and the sample.
- **First-screen sweep:** 0 AI-notice label rows end past the first screen. The tightest is Afrikaans beauty without JavaScript, at 717 of 740.
- **English dealer:** its first heading is at 1,477.4px in 16 of 16 loads, inside the 1,480px the test allows.
- **Full e2e, sharded:** 1776 passed, 112 skipped, 0 failed.
- **axe:** 152 passed.
- **Mutations:** 30, run by the reviewer.
- **Fresh probes:** 22, caught or passed as they should.

## Per-summary accuracy

Every written summary was checked against its page, in English and Afrikaans. All are OK. The nits are below the table.

| Page | Verdict |
| --- | --- |
| `start/what-has-changed` | OK (m2, m3: the page itself) |
| `core/running-a-pty-ltd` | OK |
| `core/closing-as-a-sole-proprietor` | OK |
| `branding/branding-prompts` | OK after m1 |
| `branding/mood-and-materials` | OK |
| `branding/marketing-prompts` | OK |
| `paperwork/templates/quotation` | OK |
| `paperwork/templates/receipt` | OK |
| `paperwork/templates/privacy-notice` | OK |
| `business-types/pick-your-business-type` | OK |
| `business-types/vehicle-dealer` | OK |
| `business-types/food` | OK |
| `business-types/beauty` | OK |
| `business-types/retail-online` | OK |
| `business-types/services-trades` | OK |
| `business-types/professional-creative` | OK |
| `lookup/checklist` | OK |

Nits: wording only, no action.

## Findings

**m1: the branding prompts lead says "ten of them" give 5 options.** Prompts 1 to 5 and 7 to 10 give 5 options. Prompt 0 (the brief) and Prompt 11 (put it all together) give none. Prompt 6 gives none on Path A and 5 image prompts on Path B. So "ten" is not right.

**m2: "What has changed" counts four corrections.** Line 114 says "all four corrections" ("al vier regstellings"), while Change 4 lists three under "Corrected". This is the page's own text, not a summary.

**m3: "What has changed" is out of date with itself.** "Last updated: 13 September 2026" comes before Change 5 (13 October 2026), and "What you need to paste into Drive" covers only Change 1.

**m4: no probe holds the five-word rule alone.** Add "Instagram and TikTok are slow starts. Prompts for posts and WhatsApp." on marketing prompts. Only the rule that a sentence of five words or more inside a text fails catches it. Show that removing that rule fails.

**m5: more rules have no probe.** These need one each:
- `'tasklist'` in `TEXT_KINDS`;
- the `!block.hidden` filter;
- the closing "…" strip;
- the figures half of `summaryNumbers` ("13 … 5" against "14 … 5" must fail);
- the assertion that an English override has an Afrikaans one, if practical.

Show that removing each one fails.

**m6: `design-system.md` does not name the short-sentence limit.** A sentence of fewer than five words that repeats the opening passes, unless every sentence of the lead is inside the opening.

## Audit: each rule and the probe that fails without it

Each mutation removes one rule or filter, or moves one limit by one, in a copy of `tests/content/validate.test.ts`. The copy runs on its own, and is then deleted. All 41 make a test fail. "Pins" is the test "pins each rule of the lead check". "Pass 2" is the test "catches a lead that repeats what the reader sees first, and passes a topic line".

| Rule or filter | Mutation | Probe that fails |
| --- | --- | --- |
| Paragraphs are compared | drop `'paragraph'` | the data test; pass 2: the dealer's old lead; pins: "Instagram and TikTok are slow starts." |
| Notes | drop `'note'` | pins: "Send this when money arrives."; pass 2: the receipt's form line |
| Callouts | drop `'callout'` | pass 2: the receipt's callout |
| List items | drop `'list'` | pass 2: the dealer's "Quick answer" item |
| Task-list items | drop `'tasklist'` | pins: "Sold something once and got paid, to prove people want it." |
| Table cells | drop `'table'` | pass 2: "Some trades need professional registration." |
| Headings | drop `'heading'` | pass 2: the marketing page's old lead |
| "Words used" is not compared | add `'terms'` | pins: "The free form to register as a second-hand goods dealer with the police." passes |
| Hidden blocks are not compared | drop `!block.hidden` | pins: the dealer's old lead passes once its paragraph is hidden |
| Ten blocks, not more | `OPENING_BLOCKS` 11 | pins: "This is compulsory and most small dealers do not know about it." passes |
| Ten blocks, not fewer | `OPENING_BLOCKS` 9 | pins: "Reviews are the single biggest factor in whether you show up above your competitors." |
| The H1 | drop it | pass 2: "Buying and selling vehicles. What to register and what to sign." |
| The form view | drop it | pass 2: the receipt's form line |
| The main reason | drop it | pass 2: "Health inspection and municipal licence." on beauty |
| The main reason is matched whole, at any length | treat it as body text | pass 2: "Three separate registration layers." |
| A sentence inside a heading fails | heading by run only | pass 2: "Buying and selling vehicles." |
| A run of six words with a heading fails | heading by inside only | pass 2: the marketing page's old lead |
| Headings are not body text | treat a heading as body text | pass 2: the marketing page's old lead |
| Six words with a heading, not seven | `HEADING_RUN` 7 | pass 2: the marketing page's old lead |
| Six words with a heading, not five | `HEADING_RUN` 5 | pins: "Second-hand goods dealer registration comes first." passes |
| A sentence of five words or more inside a text fails (m4) | drop the rule | pins: "Instagram and TikTok are slow starts. Prompts for posts and WhatsApp." |
| Five words, not six | 6 | pins: "Send this when money arrives. Keep a copy for your records too." |
| Five words, not four | 4 | pins: "Tick as you go. A checklist of every step, in order." passes |
| A run of eight words with a text fails | drop the rule | pins: the food sentence; pass 2: the dealer's old lead |
| Eight words, not nine | `RUN` 9 | pins: "Then ask every happy customer for a review, by WhatsApp." |
| Eight words, not seven | `RUN` 7 | pins: "Ask every happy customer for a review, by WhatsApp." passes |
| Every sentence inside the opening fails | drop the rule | pass 2: "Print this. Tick as you go."; pins: "PRINT THIS. TICK AS YOU GO." |
| Case is ignored | drop `toLowerCase` | pins: "PRINT THIS. TICK AS YOU GO."; pass 2: the dealer's H1 sentence |
| An apostrophe joins its word | drop the strip | pins: "Your customers insurance may refuse to pay." on services and trades |
| Punctuation separates words | split at spaces only | pass 2: the "Quick answer" item; pins: the apostrophe probe |
| No empty words | drop the filter | pass 2: the hub's cell; pins: the receipt's note |
| Spaces are tidied | drop `\s+` → space | pins: the sentence reported is "Instagram and TikTok are slow starts" |
| Ends are trimmed | drop `trim` | pins: the same probe |
| A closing "…" is left off (m5) | drop the strip | pins: the same probe |
| Sentences split at . ! ? only | split at a colon too | pins: "Vehicle dealing: required, in this order." passes |
| Sentences are split | do not split | pass 2: "Required, in this order. Optional but often needed."; pins: the m4 probe |
| A sentence with no words is dropped | drop the filter | pins: "Print this. Tick as you go. …" |
| Figures count in the number comparison (m5) | drop them | pins: "Since 13 September, 5 options." against "Sedert 14 September, 5 opsies." |
| Counts written as words count | drop them | the number test: "Elf … nege daarvan" against "Twelve … ten of them" |
| An English override needs an Afrikaans one (m5) | drop the branch in `overrideGaps` | pins: entry "b" |
| The two have the same numbers | drop the comparison | pins: entry "c" |

Three assertions hold the data itself, so no probe can pin them. Each was checked by changing the data or the source once and then reverting:

| Assertion | Change | What fails |
| --- | --- | --- |
| `summarySource` agrees with `docs.meta.json` | marketing prompts' English `summarySource` set to `derived` | the summarySource test, the data test, and the fresh-build test |
| Every English override has an Afrikaans one with the same numbers | marketing prompts' Afrikaans summary removed from `docs.meta.json` | that test, the summarySource test, and the fresh-build test |
| Only an override is a lead, and no shown lead repeats its opening | `docLead` returns every summary | the data test |

Two pieces of code could not change any result, so they were removed rather than pinned:
- the `list.length > 0` guard in `inside()`, because the empty-sentence filter means no sentence without words reaches it;
- the fallback in the derived-summary assertion that searched paragraphs and notes for the summary, because every derived summary already fails the check.

Removing the fallback makes that assertion stricter.

## Fixed in

- **`d1d0f7a` fix(content), m1.** English: "most of them give you 5 options to refine". Afrikaans: "die meeste daarvan gee jou 5 opsies om te verfyn". Both are in one commit, because the content test holds the numbers of the two summaries equal.
- **`f7b3a68` docs(docs), m2 and m3.** A backlog row records the page's inconsistencies for the owner. They are fixes to the guide's text, which need a `fix(content):` commit that cites the page's own changes.
- **`89b6a9c` test(tests), m4, m5, m6 and the audit.**
  - The test "pins each rule of the lead check" has the probes in the table above.
  - `overrideGaps` serves both the data test and its probe.
  - The two pieces of dead code are gone.
  - `design-system.md` names the short-sentence limit (m6) and claims only what the probes prove.
  - With it, the content suite has 46 tests.
- **This record**, `docs(docs)`.

Each of these commits passed `pnpm gate:fast` on its own.
