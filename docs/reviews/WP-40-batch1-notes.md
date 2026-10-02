# WP-40 batch 1: translator notes

Batch 1: `core/register`, `core/tax-and-sars`, `core/what-you-need-to-sell-things`, `core/vehicles`. Base commit `4c20b2b` (batch 0 included).

All four documents print 0 fidelity findings. I found no suspected false positives.

These notes are for the human reviewer. Where they differ from `STYLE-GUIDE-af.md` or `TERMS-af.json`, the guide and the term list win. I used the batch 0 glossary and the batch 0 document titles throughout (for example `Bestuur van ’n Pty Ltd`, `Betaal jouself uit ’n Pty Ltd`, `Jy is die besigheid`, `Watter sjabloon om wanneer te gebruik`, `Het jy reeds jou naam? (kortpad)`, `Handelsmerkopdragte`, `Voertuie vir jou besigheid` as link text).

Coordinator update during the batch: "food truck" → `kosvragmotor` and invoice "due date" → `Vervaldatum`. Neither term occurs in this batch. Note that `vervaldatum` also appears in `core/what-you-need-to-sell-things` for "expiry" of the COA ("no fixed expiry"), which is its normal meaning; the two senses now share one word across the guide.

## 1. Terms not in TERMS-af.json (later batches should reuse these)

| English | Afrikaans used | Where |
| --- | --- | --- |
| surety / sign personal surety | borgstelling (surety) / persoonlik borg staan | register |
| B-BBEE affidavit | B-BBEE-beëdigde verklaring | register |
| Exempted Micro Enterprise (EME) | vrygestelde mikro-onderneming (Exempted Micro Enterprise, EME) | register |
| B-BBEE Recognition Level 4 / Level 2 | B-BBEE-erkenningsvlak 4 / vlak 2-status | register |
| public officer (SARS registered representative) | geregistreerde verteenwoordiger by SARS (die openbare amptenaar, "public officer") | register |
| enterprise number | ondernemingsnommer | register |
| name reservation / incorporation | naamreservering / inlywing | register |
| Home Affairs | Binnelandse Sake | register |
| injury-on-duty cover / illness benefit | dekking vir beserings aan diens / siektevoordeel | register |
| magistrates' court / instruct an attorney | landdroshof / ’n prokureur opdrag gee | register |
| natural person / juristic person (Small Claims Courts Act quote) | natuurlike persoon / regspersoon | register |
| deduction | aftrekking (deduction) | tax |
| year of assessment | jaar van aanslag | tax |
| close corporation (CC) | beslote korporasie (CC) | tax |
| personal service provider | persoonlikediensverskaffer (personal service providers) | tax |
| labour broker | arbeidsmakelaar | tax |
| capital gains tax | kapitaalwinsbelasting | tax |
| retirement annuity | aftree-annuïteit | tax |
| nil return | nulopgawe, nul-IRP6, nul-ITR14 | tax |
| filing season | indieningseisoen | tax |
| SARS gazettes the dates | SARS publiseer die datums ... in die Staatskoerant | tax |
| taxable supplies | belasbare leverings (batch 0: supply → lewering) | tax |
| Environmental Health Practitioner (first use) | omgewingsgesondheidspraktisyn (Environmental Health Practitioner) | selling |
| Business Licensing Officer | besigheidslisensiëringsbeampte (Business Licensing Officer) | selling |
| by-laws | verordeninge | selling, vehicles |
| liquor licence | dranklisensie | selling |
| SARS Customs / importer's code | SARS Doeane (SARS Customs) / invoerderskode | selling |
| landed value | gelande waarde | selling |
| tax compliance status | belastingnakomingstatus | selling |
| traffic register number | verkeersregisternommer (traffic register number) | vehicles |
| registering authority | registrasie-owerheid (registering authority) | vehicles |
| fringe benefit | byvoordeel (fringe benefit) | vehicles |
| licence disc | lisensieskyf | vehicles |
| wear and tear | slytasie | vehicles |
| owner-operator | eienaar-operateur | vehicles |
| goods in transit cover | dekking vir goedere in transito (goods in transit) | vehicles |
| Professional Driving Permit | professionele bestuurspermit (Professional Driving Permit) | vehicles |

## 2. Official names kept in English with a gloss

- `Business Register Number Certificate (BRNC)`, `Traffic Register Number Certificate (sertifikaat van verkeersregisternommer)`, `Application for Business Registration (ABR)`, `RLV (Application for Registration and Licensing of Motor Vehicle)`, `National Regulator for Compulsory Specifications (NRCS)`, `Central Supplier Database (sentrale verskafferdatabasis)`, `Small Business Corporation (kleinsakekorporasie)`. As in batch 0, the glosses are descriptive and lower case; I could not check official Afrikaans names online.
- `Certificate of Acceptability` is kept every time English uses it (three times), with `(Sertifikaat van Aanvaarbaarheid)` on first use, per TERMS.
- `Small Claims Court (Kleineisehof)` and `Information Regulator (Inligtingsreguleerder)` on first use, per TERMS.

## 3. Judgement calls a reviewer should look at

- **`core/register`, trading-name example.** "Thabo's Plumbing" became `"Thabo se Loodgieterswerk"`, an Afrikaans-looking example name. It is an illustration, not a fact. Revert to the English name if the reviewer prefers examples untouched.
- **`core/register`, domain example.** `` `yourname.co.za` `` became `` `jounaam.co.za` ``. The fidelity check accepted it. Revert if inline code should stay verbatim.
- **`core/register`, B-BBEE levels.** I first wrote `erkenningsvlak 4 (Recognition Level 4)`; the check counted the extra `4`, so the English in brackets was dropped. The text now reads `B-BBEE-erkenningsvlak 4`.
- **`core/register`, "be sued on its own".** Following TERMS (`sue` → ’n eis instel), it became "’n eis kan op sy eie teen dit ingestel word". The verb list ("own things, sign contracts, and be sued") is split into "kan dinge besit en kontrakte teken, en ’n eis kan ... ingestel word". Same meaning, different shape.
- **`core/tax-and-sars`, quoted SARS wording.** Under the quoted-wording rule: `"plaaslike besigheidsinkomste" ("local business income")` (ITR12 section name), `"omhein" ("ring-fence")`, `"ja" ("yes")` on the ITR14, and `"Belastingfaktuur" ("Tax Invoice")` as in batch 0. The ITR12 section is in English on eFiling; the reviewer may prefer only the English label there.
- **`core/tax-and-sars`, "a sole trader".** Rendered as "die eienaar van ’n eenmansaak", because TERMS has no separate term for "sole trader".
- **`core/tax-and-sars`, "capped in rands".** "met ’n perk in rand".
- **`core/tax-and-sars`, the calendar.** The English paragraph "One rule that catches people…" sits between list items with no blank line before the next item. I kept that shape exactly.
- **`core/what-you-need-to-sell-things`, gender.** "the customer … they" became "hy of sy" / "hom of haar" in the checkout paragraph and its plain-words line; elsewhere "hulle" where English uses "they" for a customer.
- **`core/what-you-need-to-sell-things`, "no refunds" sign.** `"geen terugbetalings nie" ("no refunds")`.
- **`core/what-you-need-to-sell-things`, "R638 Regulation 10".** Became "regulasie 10 van R638".
- **`core/what-you-need-to-sell-things`, "ECTA section 43 information".** Became "die inligting van artikel 43 van ECTA".
- **`core/vehicles`, H1.** The English H1 is "Vehicles and your business", while other documents link to it as "Vehicles for your business". I translated each literally: H1 `Voertuie en jou besigheid`, link text `Voertuie vir jou besigheid` (batch 0's choice). This mismatch is in the English source.
- **`core/vehicles`, "one-man business".** Rendered as `eenmansaak`, the TERMS term.
- **`core/vehicles`, "non-legal person".** Rendered as "’n party/organisasie wat nie ’n regspersoon is nie", matching batch 0's TRN glossary entry.

## 4. Modal verbs checked

- "may be refused", "may be for UIF", "may lose SBC status", "may mean paying more" → `kan` (possibility).
- "only a natural person may institute", "may take part only as a defendant", "Information Officer may only take up duties", "you may not begin trading", "before they may be sold", "Some work may only be done", "Only directors … may act as proxy", "the only charge you may pass" → `mag` / `mag nie` (permission).
- "You may still have to file" → `Jy moet dalk steeds`.
- "A cost you may subtract" → `mag aftrek`.
- "should not put the vehicle", "every business should do", "The proxy should go", "Should you register voluntarily", "If you should be registered" → `behoort`.
