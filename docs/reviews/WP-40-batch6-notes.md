# WP-40 batch 6: translator notes

Batch 6: `paperwork/which-template-to-use-when`, `paperwork/free-tools`, `lookup/checklist`, `lookup/sources`. Base commit `4c20b2b`.

All four documents print 0 fidelity findings. `pnpm content:build --lang af` and `pnpm content:check` pass. I found no suspected fidelity false positives.

These notes are for the human reviewer. Where they differ from `STYLE-GUIDE-af.md` or `TERMS-af.json`, the guide and the term list win. I reused the batch 0 renderings and document titles from `docs/reviews/WP-40-batch0-notes.md` and the Afrikaans glossary.

## 1. Coordinator term update applied

- Invoice "due date" is now `Vervaldatum` (words table and the invoice preview in `01-which-template-to-use-when.md`). "payment dates" in the service-agreement prompt stays `betaaldatums`, because it means the dates of payments, not a due date.
- **Not changed (another batch's file):** `templates-to-fill-in/02-invoice-not-vat-registered.md` (batch 0) still has `| Betaaldatum |`. It should become `Vervaldatum` too.
- "food truck" does not occur in this batch.

## 2. Terms not in TERMS-af.json

| English | Afrikaans used | Where |
| --- | --- | --- |
| Documents and templates (H1 of which-template-to-use-when) | Dokumente en sjablone | The H1 is translated literally. Links elsewhere use the batch 0 title `Watter sjabloon om wanneer te gebruik` |
| delivery note | afleweringsbrief | templates guide, checklist |
| service agreement | diensooreenkoms | templates guide, checklist |
| Recipient | Ontvanger | words table |
| Reconcile | rekonsilieer | follows TERMS reconciliation → rekonsiliasie |
| Slip (till slip) | strokie | cash book, checklist |
| browser / offline / sync / backup / hotspot / domain | blaaier / vanlyn / sinkroniseer / rugsteun / warmkol / domein | free-tools words table, with the English in brackets on first use |
| router | roeteerder | free tools |
| free tier | gratis vlak | free tools |
| registered representative (public officer) | geregistreerde verteenwoordiger (registered representative) by SARS | checklist |
| Key to the short words / Short / Means | Sleutel tot die kort woorde / Kort / Beteken | checklist |
| Secondary | Sekondêr | sources register |
| Underlying law / Case law | Onderliggende wetgewing / Regspraak | sources register |
| Schedule (Income Tax Act) | Bylae (Sesde, Sewende, Vierde Bylae) | sources register |
| independent contractor | onafhanklike kontrakteur | sources register |
| prescription period | verjaringstermyn | sources register |
| cast / calendered vinyl | gegote / gekalanderde viniel | sources register |

## 3. Sources register: how I handled titles and names

- **`[Amptelik]` titles.** I followed the style-guide example (`SARS — Turnover Tax` → `SARS — Omsetbelasting`): the titles of official web pages that describe a topic are translated (Omsetbelasting, Belastingkalender, Begroting 2026: gereelde vrae, Wat is die nuwe drempel vir BTW-registrasie?, Maatskappyregistrasie, Onafhanklike oorsigte, Registreer ’n motorvoertuig and so on).
- **Named publications keep their English title**, because a reader must search for that exact title: Guide to Provisional Tax, Tax Invoice Checklist, VAT 420 Guide for Motor Dealers, Comprehensive Guide to Dividends Tax, Consumer Protection in e-Commerce, Advisory Note 1: Implied Warranty of Quality, National Instruction 2 of 2016: …, the R638 and R146 regulation titles, Binding General Ruling 12, SABRIC's 2024 Annual Crime Statistics, the two journal articles. A reviewer may prefer an Afrikaans gloss in brackets after some of them; I did not add one, because I could not check official Afrikaans titles.
- **Mixed case: "VAT Connect Issue 20, October 2025"** became `VAT Connect uitgawe 20, Oktober 2025`. The date check needs the Afrikaans month, so the title could not stay fully English. "VAT 264 declaration for the supply of second-hand goods" became `VAT 264-verklaring vir die lewering van tweedehandse goedere` (form code kept).
- **Secondary source titles** (Govchain, How to register a company directly with CIPC; Xero ZA, SARS Tax Tables 2026/2027; etc.) stay in English: they are the titles of English web pages. Only the description after the dash is translated.
- **Institutions** keep their English name: Department of Justice, Department of Transport, Western Cape Government, National Consumer Commission, Consumer Goods and Services Ombud, Consumer Tribunal, Western Cape High Court, Motor Industry Ombudsman of South Africa, B-BBEE Commission, National Credit Regulator, Financial Sector Conduct Authority, Legal Aid South Africa, Home Affairs. I added an Afrikaans name in brackets only where I am confident it is the official one: `Information Regulator of South Africa (Inligtingsreguleerder)`, `Master of the High Court (Meester van die Hooggeregshof)`, `Home Affairs (Binnelandse Sake)`, `Small Claims Court (Kleineisehof)`. `Small Claims Courts (kleineisehowe)` and `Designated Police Officer (aangewese polisiebeampte)`, `Return of Earnings (verdiensteopgawe)` are descriptive glosses in lower case and are **not verified**.
- Case names (Cohen NO v Segal, Witwatersrand Local Division, Renault v Windsor, Saga Wines), "Companies Regulations 2011", "UK Model Articles" (`die Britse Model Articles`) stay in English.
- "Witwatersrand Local Division, judgment 28 April 1970" → `uitspraak 28 April 1970`.
- "regulation 26 / regulation 28 and 29" → `regulasie 26` / `regulasies 28 en 29` (the English says "regulation 28 and 29"; I used the plural, which is correct Afrikaans and adds nothing).

## 4. Judgement calls and English-source issues

- **Typos in English kept faithful but fixed in form:** `free-tools` "sends you a.docx" and `checklist` "as a.co.za domain" are missing a space in English. I wrote `’n .docx` and `as ’n .co.za-domein`. The owner may want to fix the English.
- **`free-tools` example domain** "yourname.co.za" stays `yourname.co.za`. An Afrikaans `jounaam.co.za` fails the build (`unknown-bare-domain`, it would become a live link). The same applies to `you@yourbusiness.co.za` in inline code.
- **`free-tools` menu path** "File, then Download, then PDF" keeps the English menu names, because most users run Google Docs in English. Translate them if the orchestrator assumes an Afrikaans interface.
- **Listing fence** (Drive folders) is copied byte for byte, as the style guide requires, so it shows English folder names in the Afrikaans page.
- **Prompts in `which-template-to-use-when`.** The English prompts ask the AI to write "in simple English". I kept `in eenvoudige Engels` to stay faithful. An Afrikaans reader probably wants Afrikaans terms and conditions; changing it to `eenvoudige Afrikaans` would change what the prompt produces, so it is the orchestrator's call. "Grade 8 learner" → `’n graad 8-leerder`. "check with a lawyer" → `met ’n prokureur behoort te gaan praat` (lawyer → prokureur as in batch 0).
- **Template previews** use the batch 0 labels (Kwotasienommer, Geldig tot, Tydsraamwerk, Takkode, Verwysing, Kwitansienommer, Saldo nog verskuldig …). `[Company registration number, if you have one]` became `[Maatskappyregistrasienommer, as jy een het]`. In the privacy-notice preview, `("we", "us")` became `("ons")`, as in batch 0, and "Information Regulator" became `Information Regulator (Inligtingsreguleerder)`.
- **"Tax Invoice" quoted wording** follows batch 0: `"Belastingfaktuur" ("Tax Invoice")`, and for the full tax-invoice list `"Belastingfaktuur" ("Tax Invoice"), "BTW-faktuur" ("VAT Invoice") of "Faktuur" ("Invoice")`. The batch 0 caveat applies: a reviewer should confirm that SARS accepts the Afrikaans words.
- **Checklist register.** English mixes "I/my" items with impersonal ones. Afrikaans items use past participles in the first person (`… nagegaan`, `… geregistreer`). The style-guide example line `VAT264-proses in plek, as jy geregistreer is` is used exactly as given, so that one item says `jy` where the rest say `ek`. A reviewer may prefer `as ek geregistreer is`.
- **Checklist conditions** keep the condition first with a colon: `As ek van die huis af werk: …`, `As ’n maatskappy: …`, `As ek later lyne wil byvoeg: …`.
- **Checklist "Money hygiene"** items are English gerunds ("Photographing every slip …"). I rendered them as present-tense habits (`Ek neem ’n foto van elke strokie …`).
- **"Loan account checked and cleared"** → `nagegaan en vereffen`. TERMS `cleared` → `verreken` is for cleared funds, not a loan, so I did not use it here. For PayShap and MotorHappy, "clear" means cleared funds, so there it is `verreken`.
- **"VAT dealer"** (checklist VAT264 row) → `BTW-geregistreerde handelaar`.
- **Tracker entry "keys handed over only once seated"** is ambiguous in English (who is seated). I kept it ambiguous: `sleutels eers oorhandig wanneer julle sit`.
- **"Treatment liability insurance"** → `Aanspreeklikheidsversekering vir behandelings`. **"patch test"** → `pleistertoets (patch test)`.
- **"IP"** (professional and creative) → `IE` (intellektuele eiendom). A reviewer may prefer to keep `IP`.
- **"often convert better"** (free tools, website builder) → `lei dikwels beter tot verkope`.

## 5. Modal verbs checked

- "the last day the customer may pay" → `mag betaal` (permission).
- "Prices may change", "can be unenforceable" → `kan`.
- "household insurance may not cover" → `dek dalk nie` (possibility).
- "should check with a lawyer", "should be treated as a pointer", "should no longer be used" → `behoort`.
- "may only take up duties after registration", "a dividend may generally only be declared", "only a natural person may institute", "A nominated director … may appear", "the SARB alone may issue", "who may hold motor trade numbers", "who may perform a review" → `mag`.
- "sector codes may set different thresholds" → `kan` (possibility).
- "AI-generated images may be difficult to own" → `kan moeilik wees`.
- "must" → `moet` throughout; "not required to register" → `nie verplig om te registreer nie`.
