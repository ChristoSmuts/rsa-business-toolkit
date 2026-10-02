# WP-40 batch 5: translator notes

Batch 5: the six business-type documents `business-types/vehicle-dealer`, `food`, `beauty`, `retail-online`, `services-trades` and `professional-creative` (not the hub). Base commit `4c20b2b`.

All six documents print 0 fidelity findings. I found no suspected false positives, so nothing went into `TRANSLATION-NOTES.md`.

These notes are for the human reviewer. Where they differ from `STYLE-GUIDE-af.md` or `TERMS-af.json`, the guide and the term list win.

## 1. H1 titles

Following the coordinator's update after the batch 0 review, each H1 translates the document's own English H1 ("Business type: …"), not the hub's link text:

| English H1 | Afrikaans H1 |
| --- | --- |
| Business type: buying and selling vehicles | Besigheidstipe: voertuie koop en verkoop |
| Business type: food and drinks | Besigheidstipe: kos en drinkgoed |
| Business type: beauty and personal care | Besigheidstipe: skoonheid en persoonlike versorging |
| Business type: retail and online selling | Besigheidstipe: kleinhandel en aanlyn verkoop |
| Business type: services and trades | Besigheidstipe: dienste en ambagte |
| Business type: professional and creative work | Besigheidstipe: professionele en kreatiewe werk |

`content-meta/docs.meta.json` has only an English `title` for these docs, so `scripts/content/meta.ts` falls back to the H1 for the Afrikaans title. The Afrikaans nav and card titles will therefore show the "Besigheidstipe: …" prefix, while English shows "Beauty and personal care". The orchestrator may want to add `title.af` (for example the hub link texts: Voertuighandelaar, Kosbesigheid, …).

## 2. Coordinator terminology updates applied

- food truck → `kosvragmotor` (food doc, intro).
- invoice due date → `vervaldatum` (professional-creative: "clear due dates" → "duidelike vervaldatums").
- The food doc also uses `vervaldatum` in its ordinary sense of "expiry" ("no fixed expiry" → "geen vaste vervaldatum nie"). That is correct Afrikaans, but the word now carries two meanings in the corpus.

## 3. Terms not in TERMS-af.json (reused within this batch)

| English | Afrikaans used | Where | Note |
| --- | --- | --- | --- |
| health establishment | gesondheidsinrigting | beauty | English in brackets in the words table |
| patch test | plektoets | beauty | English in brackets in the words table. No settled Afrikaans term found; a reviewer may prefer `veltoets` |
| treatment liability insurance | aanspreeklikheidsversekering vir behandelings | beauty | |
| professional indemnity | professionele skadeloosstelling | beauty | English in brackets |
| person in charge | persoon in beheer | food | R638 wording; English in brackets on first use |
| food handler | voedselhanteerder | food | |
| scope / variation / progress payment | omvang / wysiging / vorderingsbetaling | services-trades | English in brackets in the words table |
| scope creep | omvangkruip | professional-creative | English in brackets |
| importer's code | invoerderskode | retail-online | English in brackets on first use |
| chargeback | terugvordering | retail-online | English in brackets |
| home office deduction | tuiskantooraftrekking | professional-creative | |
| personal service provider | persoonlikedienste-verskaffer | professional-creative | |
| revision rounds | hersieningsrondes | professional-creative | |
| defect schedule | gebrekeskedule | vehicle-dealer | |
| settlement letter | vereffeningsbrief | vehicle-dealer | |
| common law | gemenereg | vehicle-dealer | |
| district court / regional court / High Court | distrikshof / streekhof / Hooggeregshof | vehicle-dealer | |
| microdots | mikrokolle | vehicle-dealer | English in brackets |
| doc title "Vehicles for your business" | Voertuie vir jou besigheid | services-trades, vehicle-dealer | Batch 1 translates `core/vehicles`; align the link text with its H1 |
| doc title "Tax and SARS" | Belasting en SARS | professional-creative, vehicle-dealer | Align with batch 1 |
| doc titles from batch 0 notes | Woordelys, Bemarkingsopdragte, Handelsmerkopdragte, Watter sjabloon om wanneer te gebruik, Tuiswerk en veilige ontmoetings, Nuwe besigheidslyne byvoeg, Bronne- en verifikasieregister | links | As batch 0 |

## 4. Official names kept in English with an Afrikaans gloss

I could not check any of these Afrikaans names online. Each appears on first use only:

- Businesses Act licence names: `Business Licence (besigheidslisensie)`, `Zoning Certificate (soneringsertifikaat)`, `Fire Compliance Certificate (brandnakomingsertifikaat, SANS 10400-T)`, `Gas Certificate of Compliance (gasnakomingsertifikaat)`, `Liquor Licence (dranklisensie)` (food). The English sentence lists them as names, so I kept the English with a gloss.
- `Certificate of Compliance (nakomingsertifikaat)` and `Certificate of Conformity (gelykvormigheidsertifikaat)` (services-trades).
- `Department of Employment and Labour (Departement van Indiensneming en Arbeid)`, `Department of Transport (Departement van Vervoer)`, `South African Police Service (Suid-Afrikaanse Polisiediens)`, `Consumer Tribunal (Verbruikerstribunaal)`, `Construction Regulations (Konstruksieregulasies)`: treated as official names, with capitals.
- `Designated Police Officer (aangewese polisiebeampte)`, `Business Licensing Officer` (as `beampte vir besigheidslisensiëring (Business Licensing Officer)`), `Customs and Excise Division (afdeling Doeane en Aksyns)`: descriptive glosses, lower case.
- `Government Gazette 55038, Government Notice 7717` became `Staatskoerant (Government Gazette) 55038, Goewermentskennisgewing 7717`.
- Kept in English without gloss: Motor Industry Ombudsman of South Africa (MIOSA), Retail Motor Industry Organisation (RMI), South African Bureau of Standards, National Regulator for Compulsory Specifications, Standards Act 8 of 2008, Professional Driving Permit (with `professionele bestuurspermit`, as in the glossary), Application for motor trade number (MTN1), VAT 420 Guide for Motor Dealers, Traffic Register Number / Business Register Number Certificate (glossed `verkeersregisternommer` once, as in the glossary).
- "National Commissioner" became `Nasionale Kommissaris` without the English.

## 5. Judgement calls on meaning

- **vehicle-dealer, "a voetstoots sale" / "voetstoots clauses".** The fidelity check needs `voetstoots` as a separate word, so I wrote `’n verkoop voetstoots` and `voetstoots-klousules` instead of the natural compounds `voetstootsverkoop` / `voetstootsklousules`. Both are correct Afrikaans.
- **vehicle-dealer, "Turnover tax is almost certainly wrong"** → `byna seker verkeerd`. Same certainty.
- **vehicle-dealer, "Failing to meet the 21-day deadline carries penalties"** → `word boetes opgelê` ("penalties are imposed"). Penalties here read as fines.
- **vehicle-dealer, "mark-up of R20,000"** in the SARS example became `wins van R20,000`, matching the plain-words line, which also calls it profit. A reviewer may prefer `winsopslag`.
- **vehicle-dealer, "In plain terms:"** (a normal paragraph, not a callout) became `In gewone woorde:`, so it is not confused with the `In gewone taal:` callout label.
- **vehicle-dealer, "Your startup checklist"** → `Jou kontrolelys vir die begin`, containing `kontrolelys` as the style guide requires.
- **services-trades, "50% on completion of first fix"** → `50% wanneer die eerste installasie voltooi is`. "First fix" is a building-trade term (rough-in before walls are closed). I found no settled Afrikaans term. A reviewer may want a better rendering.
- **services-trades, "Trades that invoice monthly get paid whenever"** → `word betaal wanneer dit die kliënt pas` ("when it suits the client"). That makes the idiom explicit.
- **services-trades, "your customer's insurance may refuse to pay"** → `kan … dalk weier` (possibility, not permission).
- **retail-online, "converts better"** → `lei … tot meer verkope` (leads to more sales). That is plain wording for a marketing term.
- **retail-online, "settlement time"** (payment gateway) → `hoe lank dit neem voordat die geld in jou rekening is`, a plain explanation and not a term.
- **professional-creative, "IP"** is kept as `IP` (with `Intellektuele eiendom (intellectual property)` in the words table) because the checklist uses the abbreviation. The usual Afrikaans abbreviation would be `IE`.
- **professional-creative, "Naledi Mokoena Design"** is kept unchanged as an example name.
- **professional-creative, "AI tools / AI-generated"** → `KI-gereedskap / KI-gegenereerde`, consistent with the footer's `KI`.
- **food, "game lodge kitchen"** → `die kombuis van ’n wildsoord`.
- **food, the prompt fence** and **retail-online, the prompt fence** are translated line for line, with the same number of lines.
- **beauty, "Clears eczema"** → `"Laat ekseem verdwyn"`. These are example claims, so the quotes are in Afrikaans only. An Afrikaans seller would write the Afrikaans claim, and the regulatory point is the same.

## 6. Modal verbs checked

- "No person may carry on … unless" / "You may not begin trading" → `Niemand mag … nie` / `Jy mag nie … nie`.
- "a customer may cancel" / "You may charge a cancellation fee" → `mag` (permission).
- "may not legally be done" / "may not be practised" / "may not be sold" → `mag nie`.
- "the National Commissioner may issue" → `kan … uitreik` (discretion, not permission).
- "A police official may require" / "may inspect" → `kan`.
- "may claim R15,000" (SARS example) → `mag` (entitled).
- "SARS may treat you as" → `kan … dalk` (possibility).
- "a client may require a safety file" → `kan … vereis`.
- "Other registrations that may apply" → `wat dalk van toepassing is`.
- "should" occurs once ("as a vehicle should") → `behoort`.
