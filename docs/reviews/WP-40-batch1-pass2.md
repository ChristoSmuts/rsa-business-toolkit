# WP-40 batch 1: af review, pass 2

- Date: 2 October 2026
- Commit reviewed: `51f524e` (after the pass 1 fixes; whole batch reviewed again, not only those fixes)
- Reviewer role: af-reviewer (WP-42), second independent pass
- Documents: `core/register`, `core/tax-and-sars`, `core/what-you-need-to-sell-things`, `core/vehicles`
- **Verdict: clean.** No blocker or major findings. 1 minor and 7 nit findings; 7 of them are fixed in this pass, in `fix(af): apply batch 1 review pass 2 fixes`.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 1 | 1 |
| nit | 7 | 6 |

## Fidelity check

Before fixes, at `51f524e`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

As in pass 1, `src/data/af` was not regenerated; the orchestrator's `pnpm content:build --lang af` at integration picks the changes up.

## How I reviewed

I paired every block of each Afrikaans document with its English block (82, 93, 87 and 76 blocks; the counts match) and read them line by line. I checked meaning (added, lost, made more or less certain), every modal verb, every number, rand amount, percentage, date, deadline, form code, Act name and URL, terminology against `TERMS-af.json` and the batch 0 glossary, the `jy` register, AWS spelling, and link text against the Afrikaans H1 of each target. I read the tax and registration rules twice: provisional tax, the nil IRP6, the thresholds by age, the turnover tax bands and exclusions, the SBC conditions (`must not` rendered `mag nie`, `may` as `mag`), the VAT thresholds and the 21-business-day rule, backdating and the 10% penalty, the ITR12 deadlines and the weekend rule, the Small Claims Courts Act section 7(1) quote, the POPIA registration rule, the B-BBEE levels, the Businesses Act and R638 rules, the ECTA sections 43, 44 and 46 timings, the CPA six-month warranty, the BRNC, proxy and RLV rules. I found no change to a fact, figure, obligation or deadline, and no strengthened or weakened statement.

The pass 1 fixes (F1 to F14) are all correctly applied and read naturally. I agree with pass 1's assessment of the translator's judgement calls.

## Findings

### F1 minor (fixed): "Trademarks cost" reads as "brands cost"
- Document: `core/register`, "Choosing the name", paragraph after the list
- English: "A company name stops nobody from using the same brand. A trademark does. Trademarks cost several thousand rand and take a long time."
- Afrikaans: "… ’n Geregistreerde handelsmerk doen dit wel. Handelsmerke kos ’n paar duisend rand en neem lank."
- What is wrong: TERMS uses `handelsmerk` for both "brand" and "trade mark", and says to write `geregistreerde handelsmerk` where a registered trade mark is meant. The sentence before uses `handelsmerk` for "brand", so a bare `Handelsmerke kos` can be read as "brands cost several thousand rand", which misstates what costs money.
- Fix: "Geregistreerde handelsmerke kos ’n paar duisend rand en neem lank."

### F2 nit (fixed): "sets out" rendered as "gee"
- Document: `core/register`, "Which one should you choose", paragraph after "Register a Pty if"
- English: "It sets out every filing a company owes each year …"
- Afrikaans: "Dit gee elke indiening wat ’n maatskappy elke jaar verskuldig is, …"
- Fix: "Dit sit elke indiening uiteen wat ’n maatskappy elke jaar verskuldig is, …"

### F3 nit (fixed): "There is a limit" as "limiet"
- Document: `core/tax-and-sars`, "A fifth option if you have a salary as well", paragraph 2
- English: "There is a limit. Section 20A …"
- Afrikaans: "Daar is ’n limiet."
- What is wrong: `limiet` suggests a numeric ceiling; English means a restriction (ring-fencing).
- Fix: "Daar is ’n beperking."

### F4 nit (fixed): word order of the retirement cap increase
- Document: `core/tax-and-sars`, "Retirement contributions", paragraph 1
- English: "The 2026 Budget increased the retirement contribution cap to R430,000 per year, up from R350,000."
- Afrikaans: "… het die perk op aftreebydraes na R430,000 per jaar verhoog, van R350,000."
- What is wrong: the trailing "van R350,000" is an English word order and reads as an afterthought.
- Fix: "… het die perk op aftreebydraes van R350,000 na R430,000 per jaar verhoog." Same figures.

### F5 nit (fixed): "vra die aansoekvorm"
- Document: `core/what-you-need-to-sell-things`, "If you sell food", "How to get it" paragraph
- English: "… and request the COA application form."
- Afrikaans: "… en vra die aansoekvorm vir die COA."
- Fix: "… en vra die aansoekvorm vir die COA aan." (`aanvra`, request)

### F6 nit (fixed): "health professionals" as "gesondheidswerkers"
- Document: `core/what-you-need-to-sell-things`, "If you provide professional or regulated services", paragraph 1
- English: "… security services, and health professionals."
- Afrikaans: "… sekuriteitsdienste en gesondheidswerkers."
- What is wrong: the list is of registered professionals; `gesondheidswerkers` (health workers) is wider and includes unregistered staff.
- Fix: "… sekuriteitsdienste en gesondheidspraktisyns."

### F7 nit (fixed): "gee dit een" in a plain-words line
- Document: `core/vehicles`, "If you have a registered company", first "In plain words"
- English: "A company has no ID number, so the traffic department gives it one."
- Afrikaans: "… so die verkeersdepartement gee dit een."
- What is wrong: `gee dit een` is ambiguous ("gives one of it") and stiff in the line that must be simplest.
- Fix: "… so die verkeersdepartement gee vir die maatskappy een."

### F8 nit (not fixed): `eenmansaak` used for the person
- Document: `core/vehicles` heading "If you are a sole proprietor" (`As jy ’n eenmansaak is`) and `core/register` ("’n Eenmansaak kan nie tot UIF bydra nie", "’n eenmansaak is ook nie ’n werknemer kragtens COIDA nie")
- English: "sole proprietor" for the person
- What is wrong: nothing against the rules: TERMS maps "sole proprietor" to `eenmansaak`, and English itself uses the word for both the person and the business. Other batches sometimes write `eenmansaak-eienaar` or `as ’n eenmansaak handel dryf` (`business-types/vehicle-dealer`, `core/you-are-the-business`) where the person is meant. The meaning is clear, so I left it.
- Fix: none here. The orchestrator may add a TERMS note on when to write `eenmansaak-eienaar` for the person.

## Notes for the orchestrator

- Pass 1's F15 (`dormante maatskappy` against `slapende maatskappy`) still stands as an open TERMS question; the batch is consistent either way.
- Link text mirrors English link text where that differs from the English H1 (`Voertuie vir jou besigheid`, `Watter sjabloon om wanneer te gebruik`, `Het jy reeds jou naam? (kortpad)`). That is faithful, not a finding.
