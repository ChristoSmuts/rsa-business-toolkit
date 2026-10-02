# WP-40 batch 6: af review, pass 2

- Date: 2 October 2026
- Commit reviewed: `b303d65` (tip of `claude/lucid-bell-t5acdn`; it includes the pass 1 fixes `1943774` and the term settlement `a0d3464`)
- Reviewer role: af-reviewer (WP-42), second independent pass
- Documents: `paperwork/which-template-to-use-when`, `paperwork/free-tools`, `lookup/checklist`, `lookup/sources`
- Fixes commit: `bb8974d` (`fix(af): apply batch 6 review pass 2 fixes`)
- **Verdict: clean.** No blocker or major findings. 1 minor and 2 nit findings, all fixed in this pass. With pass 1, this is the second consecutive clean pass over the whole batch.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 1 | 1 |
| nit | 2 | 2 |

## Fidelity check

After the fixes, at `bb8974d`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

Each document on its own (`--doc paperwork/which-template-to-use-when`, `paperwork/free-tools`, `lookup/checklist`, `lookup/sources`):

```
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (x4, one per document)
```

`src/data/**` was not touched. The orchestrator regenerates it at integration (`pnpm content:build --lang af`).

## How I reviewed

I reviewed the whole batch again, not only the pass 1 fixes. For each document I paired every English block with its Afrikaans partner (every line in the sources register) and compared them sentence by sentence for meaning, modal verbs, conditions in checklist items, terms against `TERMS-af.json` and the glossary, register and spelling.

- **Facts.** Every number, rand amount, percentage, date, form code, section reference, URL and link target matches English. No fact, figure, obligation, deadline or source claim is changed.
- **Sources register.** I checked each `Ondersteun:` line against its `Supports:` line, and each secondary-source description after the dash. Each claims exactly what English claims. Titles follow the style guide: official topic pages translated, named publications (Guide to Provisional Tax, Tax Invoice Checklist, VAT 420 Guide for Motor Dealers, Comprehensive Guide to Dividends Tax, Advisory Note 1, National Instruction 2 of 2016, the R638 and R146 titles) and secondary titles kept in English.
- **Checklist.** All 91 tick items ask for the same action under the same condition, with the condition first and a colon. Tick items use `ek`; headings, the key table and the Part C calendar keep `jy`. `IE` and `veltoetse (patch tests)` follow the term list.
- **Modal verbs.** `mag`, `kan`, `dalk`, `behoort` and `moet` match English in all four documents.
- **Settled decisions, left as they are:** link text translates the English link text; `eenvoudige taal` in the two prompts; `IE`; `Vervaldatum`; `herdenkingsdatum`; template preview labels from batch 0.
- **Checked and not a finding:** "a director or member of a body corporate" (COIDA paragraph) is `’n direkteur of lid van ’n regspersoon`. The TERMS entry `beheerliggaam` is for a sectional-title body corporate; here the statute means a corporate body, so `regspersoon` is right. "Municipal health establishment licence" uses `gesondheidsinstelling`, as `core/what-you-need-to-sell-things` does (the beauty document uses `gesondheidsinrigting`; both are correct, and the difference is in another batch). Pass 1 F27 (unverified lower-case glosses) and F28 (`vereistes` against `kriteria`) still stand as recorded; neither changes meaning.

## Findings

### F1 minor (fixed): "public officer" without the term list's Afrikaans
- Document: `lookup/checklist`, Part A2, "Once, after registration", item 1
- English: "SARS registered representative (public officer) confirmed on eFiling"
- Afrikaans: "Geregistreerde verteenwoordiger by SARS (public officer) op eFiling bevestig"
- What is wrong: `TERMS-af.json` (public officer → `openbare beampte`, batch 1 review) gives the Afrikaans term, and `core/register` writes `(die openbare beampte, "public officer")`. The checklist gave only the English. Meaning unchanged.
- Fix: "Geregistreerde verteenwoordiger by SARS (openbare beampte, "public officer") op eFiling bevestig"

### F2 nit (fixed): "foute" for faults in goods
- Document: `paperwork/which-template-to-use-when`, "Terms and conditions" prompt, "Cover:" list item 6
- English: "Returns, refunds, and faults"
- Afrikaans: "Terugsendings, terugbetalings en foute"
- What is wrong: `foute` means mistakes. A fault in goods is a `gebrek`, the word the batch already uses for defects (checklist "lys van gebreke", sources register "klein gebreke").
- Fix: "Terugsendings, terugbetalings en gebreke"

### F3 nit (fixed): elliptic "… nie." (same pattern as pass 1 F12)
- Document: `paperwork/free-tools`, "Set up Google Drive properly on day one", paragraph 3
- English: "`2026-09-13 Invoice Nkosi.pdf` sorts properly. `13 Sept invoice.pdf` does not."
- Afrikaans: "`2026-09-13 Invoice Nkosi.pdf` sorteer reg. `13 Sept invoice.pdf` nie."
- Fix: "… `13 Sept invoice.pdf` sorteer nie reg nie."

## For the orchestrator

- Nothing new beyond pass 1's list (the `STYLE-GUIDE-af.md` checklist example with `jy`, a `Return of Earnings` term, and the missing spaces in English `a.docx` and `a.co.za`).
- Cross-batch, optional: "health establishment" is `gesondheidsinstelling` in `core/what-you-need-to-sell-things` and the checklist, `gesondheidsinrigting` in `business-types/beauty-and-personal-care`. A term-list entry would settle it.
