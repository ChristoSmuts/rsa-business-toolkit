# WP-40 batch 5: af review, pass 3

- Date: 2 October 2026
- Commit reviewed: `8247dbe` (local tip of `claude/lucid-bell-t5acdn`, which includes the pass 1 and pass 2 fixes)
- Fixes commit: `2e2b3e9` (`fix(af): apply batch 5 review pass 3 fixes`), on top of `8247dbe`
- Reviewer role: af-reviewer (WP-42), third independent reviewer
- Documents: `business-types/vehicle-dealer`, `food`, `beauty`, `retail-online`, `services-trades`, `professional-creative` (not the hub)
- **Verdict: clean.** No blocker and no major findings. 1 minor and 2 nit findings; the minor and 1 nit are fixed in this pass.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 1 | 1 |
| nit | 2 | 1 |

Pass 2 was clean, so this is the second consecutive clean pass the batch needs. Under the 17 September amendment in `docs/reviews/README.md`, the minor and nit fixes made in this clean pass do not restart the count. The next review (or the integrated review of `main`) verifies them.

## Fidelity check

Before the fixes, at `8247dbe`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes:

```
$ pnpm content:fidelity --lang af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.

$ pnpm content:fidelity --lang af --doc business-types/vehicle-dealer
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.

$ pnpm content:fidelity --lang af --doc business-types/professional-creative
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.
```

I did not regenerate `src/data`. The committed `src/data/af` for vehicle-dealer and professional-creative is now one sentence behind the markdown, so the orchestrator must run `pnpm content:build --lang af` when merging.

## How I reviewed

I reviewed the whole batch afresh, not only the earlier fixes. Each Afrikaans file has the same line count as its English source, so I read the two side by side, line by line, and compared each sentence. I checked:

- meaning: anything added, lost, or made more or less certain, and who does what to whom;
- every figure, rand amount, date, deadline, form code, section reference, licence rule and obligation;
- modal verbs (`mag`, `moet`, `kan`, `kan dalk`, `hoef nie`, `behoort`);
- job and trade names, and every checklist item (same action, same condition);
- terms against `TERMS-af.json`, the glossary and the hub (link texts `Voertuighandelaar`, `Kosbesigheid`, `Kleinhandel en aanlynwinkel`);
- register (`jy`), the typographic `’n`, the callout labels, the words-table headings and the footers.

Every fact matches English. In vehicle-dealer that includes SAPS 601 (free) and SAPS 604; the R100 second-hand threshold; the five-year record keeping; the 30-day change notice; the R102, R762 and R168 trade-number fees; CPA s56, s56(2), s56(4), s2(10) and s5, with six months and the three-month repeat repair; the R30,000 Small Claims Court limit (Gazette 55038, Notice 7717, 20 July and 1 August 2026) and the R20,000 limit it replaced; the R200,000 and R400,000 court limits; the R175,000 refund; 15/115 notional input tax and the R115,000, R15,000, R120,000, R20,000, R3,000 and R15,650 example; R2.3 million, R2.4 million, R900,000 and 21 business days; the R600,000 turnover-tax band at 1% (R1,550 on R155,000); s22 trading stock; the 60-day roadworthy and 21-day RLV rules; and all 22 checklist items with their three group labels and the "If working from home:" condition. In the other five documents it includes COA, R638 Regulation 10, R146, the 14-day grace period and the timing ranges (food); the health-establishment licence and the CPA cancellation rule (beauty); ECTA s43, s43(2), s43(3), s44, s42(2) and s46 with 14, seven and 30 days, 15% import VAT and 500 KB (retail-online); 3,500 kg and 40 against 4,000 (services-trades); and the 20% professional-services exclusion and 50% deposit (professional-creative).

The settled choices are in place and I did not change them: "Voertuie vir jou besigheid" as link text, `IE`, `veltoets`, `voertuigbelettering` and `nutsmanne`.

## Findings

### F1 minor (fixed): "chase a customer" became "follow a customer"
- Document: `business-types/vehicle-dealer`, "Where disputes go", paragraph 2
- English: "but to chase a customer who has not paid you will need the magistrates' court and an attorney."
- Afrikaans: "maar om ’n kliënt te agtervolg wat jou nie betaal het nie, sal jy die landdroshof en ’n prokureur nodig hê."
- What is wrong: `agtervolg` means to pursue or follow someone physically. The English means recovering a debt, and the sentence is about which court you use for that. A reader could take it literally.
- Fix: "maar om geld te verhaal by ’n kliënt wat jou nie betaal het nie, sal jy die landdroshof en ’n prokureur nodig hê."

### F2 nit (fixed): "verloor geld aan" is an anglicism
- Document: `business-types/professional-creative`, "Getting paid", paragraph 1
- English: "Freelancers in South Africa lose more money to late payment than to low rates."
- Afrikaans: "Vryskutwerkers in Suid-Afrika verloor meer geld aan laat betaling as aan lae tariewe."
- What is wrong: "lose money to" copied word for word. Afrikaans gives the cause with `weens`.
- Fix: "… verloor meer geld weens laat betaling as weens lae tariewe."

### F3 nit (not fixed): "jou munisipaliteit se beampte"
- Document: `business-types/vehicle-dealer`, "Municipal business licence and zoning", paragraph 2
- English: "Ask your Business Licensing Officer."
- Afrikaans: "Vra jou munisipaliteit se beampte vir besigheidslisensiëring (Business Licensing Officer)."
- What is wrong: "jou munisipaliteit se" is not in the English. It adds no fact: the paragraph is about municipal licences, and the officer is a municipal one. I left it.

## Checks on pass 2's fixes

All pass 2 fixes are in place: "Veltoets (patch test)" in the beauty words table (F1), "Voertuigbelettering" twice in services-trades (F2), "uithangborde" in beauty (F3), "klepdekselpakking" (F4), "ernstige verbintenis" (F5), "magtigingsbrief (letter of authority)" (F6), "diensbeurte" (F7), "die dikwelste onderverseker" (F8), and "haarkappery, barbierswerk" and "die vel deurboor" (F9). The pass 1 and pass 2 nits left open (Hooggeregshof, "op lêer hou", "’n klein kleinhandelaar", "eerste installasie", "uitstelperiode", generic `hy`) are unchanged. I agree with the earlier reasons and add nothing new.
