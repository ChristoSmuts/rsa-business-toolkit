# WP-40 batch 0: translator notes

Batch 0: `lookup/glossary`, `start/start-here`, `core/start-here`, `business-types/pick-your-business-type`, and `paperwork/templates/` quotation, invoice, tax-invoice, receipt and privacy-notice. Base commit `2744d07`.

All nine documents print 0 fidelity findings. I found no suspected false positives, so nothing went into `TRANSLATION-NOTES.md`.

These notes are for the human reviewer. Where they differ from `STYLE-GUIDE-af.md` or `TERMS-af.json`, the guide and the term list win.

## 1. Terms not in TERMS-af.json (later batches should reuse these)

| English | Afrikaans used | Where | Why |
| --- | --- | --- | --- |
| toolkit | gereedskapstel | start pages | Plain and literal. "guide" is still `gids`, as in the UI. The orchestrator may prefer `gids` for both, to match the UI |
| Core: start here (link text) | Kern: begin hier | start-here | Same as the UI string `home.whereToStart.fiveMinutes` |
| Working from home and meeting safely (doc title) | Tuiswerk en veilige ontmoetings | core/start-here | Uses the TERMS `tuiswerk` |
| Branding prompts / Marketing prompts | Handelsmerkopdragte / Bemarkingsopdragte | core/start-here | TERMS brand → handelsmerk, prompt → opdrag |
| Register: what you actually need | Registreer: wat jy regtig nodig het | core/start-here | |
| Running a Pty Ltd | Bestuur van ’n Pty Ltd | core/start-here | Same as the example in the style guide |
| Paying yourself from a Pty Ltd | Betaal jouself uit ’n Pty Ltd | core/start-here | |
| Adding new lines of business | Nuwe besigheidslyne byvoeg | core/start-here | |
| You are the business | Jy is die besigheid | core/start-here | |
| Already have your name (shortcut) | Het jy reeds jou naam? (kortpad) | core/start-here | |
| Mood and materials | Stemming en materiale | core/start-here | |
| Brand applications and polish | Handelsmerktoepassings en afronding | core/start-here | |
| Which template to use when | Watter sjabloon om wanneer te gebruik | core/start-here | |
| What you need to sell things | Wat jy nodig het om dinge te verkoop | core/start-here | |
| Free tools | Gratis gereedskap | core/start-here | |
| Pick your business type | Kies jou besigheidstipe | H1 and links | |
| Business-type doc titles | Voertuighandelaar, Kosbesigheid, Skoonheid en persoonlike versorging, Kleinhandel en aanlynwinkel, Dienste en ambagte, Professionele en kreatiewe werk | pick-your-business-type | Batch 5 should use these as its H1s |
| How to use this toolkit | Hoe om hierdie gereedskapstel te gebruik | start-here | |
| (design) brief | kortbeskrywing | core/start-here | `opdrag` is taken by "prompt" |
| type (typeface) / voice / about text | lettertipe / stem / "oor ons"-teks | core/start-here | |
| Reference (list label) | Naslaan | core/start-here | The UI section name is "Slaan dit na" |
| supply (VAT) | lewering | tax invoice | The VAT Act's Afrikaans word |
| abridged tax invoice | verkorte belastingfaktuur | tax invoice | |
| serial number | volgnommer | tax invoice | |
| Qty / Unit price / Amount | Aantal / Eenheidsprys / Bedrag | templates | |
| Field / Detail | Veld / Besonderhede | templates | |
| Due date / Date of issue | Betaaldatum / Uitreikdatum | templates | |
| Branch code / Reference | Takkode / Verwysing | templates | |
| Timing (quotation heading) | Tydsraamwerk | quotation | |
| transfer (bank) | oordrag | glossary POP | Not `oorbetaling`, which could be read as "overpayment" next to the overpayment-scam entry |
| piercings | lyfringe | pick-your-business-type | |
| tutoring | privaat onderrig | pick-your-business-type | |
| food truck | koskar | pick-your-business-type | |

## 2. Glossary decisions

- **Headword form.** Common nouns: `**Afrikaans (English)**`. Abbreviations and proper names stay as the headword (`**SARS**`, `**CoR 14.3**`, `**Bona vacantia**`, `**RWC / CoR**`). `**VAT**` became `**BTW (VAT)**`, as the style guide says.
- **Expansions after an abbreviation.** I kept the English expansion, because readers see it on forms and websites, and added a plain Afrikaans gloss in brackets: `Public Interest Score (openbare-belangtelling)`. The glosses are in lower case unless I am confident they are the official Afrikaans name. They are descriptive renderings and **I could not check any of them online**:
  - Treated as official, with capitals: `Suid-Afrikaanse Inkomstediens` (SARS), `Werkloosheidversekeringsfonds` (UIF), `Sertifikaat van Aanvaarbaarheid` (COA, from TERMS), `Inligtingsreguleerder` and `Kleineisehof` (from TERMS).
  - Descriptive, in lower case: CIPC, CSD, MOI, AFS, FAS, PAYE, SDL, SBC, B-BBEE, EME, QSE, EHP, NRCS, LOA, SAHPRA, NCR, FSP, PSIRA, NHBRC, CIDB, BRNC, TRN, ABR, RLV, NCO, PrDP, GVM, VIN.
- **Act names** (POPIA, PAIA, CPA, ECTA, COIDA, FAIS, FICA) stay in English with no Afrikaans title in brackets. I did not want to give unverified official Afrikaans Act titles.
- **Businesses Act licence.** The English now says "Businesses Act licence". `TERMS-af.json` says to switch to `Businesses Act-lisensie` once the English changes, so I used `**Businesses Act-lisensie (Businesses Act licence)**`. The TERMS entry still reads `Business Act licence` → `Business Act-lisensie` and should be updated.
- **Sole proprietor.** The English now reads "No company registration needed, but you still need to register with SARS for tax." I translated it exactly: "Geen maatskappyregistrasie nodig nie, maar jy moet steeds vir belasting by SARS registreer." This avoids the M1 problem from the earlier glossary review.
- **Registered name.** "legal name" became `amptelike naam`, not `wettige naam`, which means "lawful".
- **Resolution.** The definition uses `beslissing` ("a record of a decision"), so that `besluit` is not defined by itself.
- **Ring-fencing (s20A).** The headword is `**Omheining van verliese (ring-fencing, s20A)**`. The section reference is inside the brackets with the English.
- **Immediate payment / RTC.** The headword is `**Onmiddellike betaling / RTC (immediate payment)**`. RTC is not repeated in the brackets.
- **OTP.** "One-time PIN from your bank" became "’n Eenmalige PIN (one-time PIN) van jou bank".
- **Small Claims Court.** "up from R20,000" became "voorheen R20,000" ("previously R20,000"). "lawyer" became `prokureur`, following TERMS attorney → prokureur.
- **Deemed remuneration.** I split it into two sentences so that `wat` does not seem to refer to the companies (m9 in the earlier review).
- **Deemed dividend.** "the shortfall" became `die tekort`. I did not expand it, to avoid adding meaning.
- **Group heading "Working from home and getting paid".** It became `Tuiswerk en betaling ontvang`, following TERMS `tuiswerk`. `tuiswerk` can also mean "homework". If the orchestrator changes the term, change this heading and the core doc title together.
- **Overpayment scam.** I used the TERMS spelling `oorbetalingswendelary` (oorbetaling + swendelary). It is hard to split when you read it. A reviewer may prefer the hyphenated form `oorbetaling-swendelary`. I did not change it.

## 3. Ambiguous or awkward English, kept faithful

- **`start/start-here`, "Written in simple English for readers who do not speak English as a first language".** I translated it literally ("Geskryf in eenvoudige Engels …"). On the Afrikaans page this describes the English source, which reads oddly. The page's machine-translation notice covers it. The orchestrator may want an Afrikaans-specific line, but that would change a fact, so I did not.
- **`start/start-here`, the listing fence.** It is copied byte for byte (checked with `diff`). It still shows the old English folder names, as the style guide requires.
- **`business-types/pick-your-business-type`, "the left column of this table is worth reading as a cost comparison".** The left column is the business type. The setup-effort column is the middle one. I kept "linkerkolom". This may be an English-source issue for the owner.
- **`paperwork/templates/invoice`, "Three rules you must follow".** Four "Do NOT" rules follow. I kept "Drie reëls". This is an English-source issue.
- **`paperwork/templates/tax-invoice`, item 1, "The words "Tax Invoice", "VAT Invoice" or "Invoice"".** Under the quoted-wording rule I wrote `"Belastingfaktuur" ("Tax Invoice"), "BTW-faktuur" ("VAT Invoice") of "Faktuur" ("Invoice")`. This tells an Afrikaans reader that the Afrikaans words are acceptable on a tax invoice. I believe SARS accepts them, but I could not check it. **A reviewer should confirm this, or reduce it to the English words only.** The same applies to "Do NOT use the words "Tax Invoice"" in the non-VAT invoice, which became `"Belastingfaktuur" ("Tax Invoice")`. For that warning, naming both forms is the safer reading.
- **`paperwork/templates/privacy-notice`, `("we", "us")`.** This became `("ons")`, because Afrikaans has one word for both. The placeholder count is unchanged.
- **`paperwork/templates/privacy-notice`, "replying STOP".** STOP stays in English capitals, because it is the keyword customers type.
- **Template headers.** They use the style-guide form `[As ’n maatskappy: Handeldrywende as ’n naam van [GEREGISTREERDE NAAM] (Pty) Ltd, Reg. No. [NOMMER]]`. "Reg. No." stays as it is.
- **`core/start-here`, "under your own name"** became "onder jou eie naam". **`start/start-here`, "as yourself"** became "as jouself".

## 4. Modal verbs checked

- "may legally open" → `wettig mag oopmaak` (permission).
- "Prices may change" → `kan verander` (possibility).
- "money you may never get" → `dalk nooit sal kry nie`.
- "You may ask us / you may complain" → `mag`.
- "Only vendors may issue one" → `mag`.
- "Some businesses may not trade without a licence" → `mag nie`.
- "should" does not occur in this batch.
