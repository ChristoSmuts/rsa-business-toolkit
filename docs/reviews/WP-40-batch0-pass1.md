# WP-40 batch 0: af review, pass 1

- Date: 2 October 2026
- Commit reviewed: `4c20b2b` (`feat(af): translate batch 0 (glossary, start pages, templates)`)
- Reviewer role: af-reviewer (WP-42)
- Documents: `lookup/glossary`, `start/start-here`, `core/start-here`, `business-types/pick-your-business-type`, `paperwork/templates/` quotation, invoice, tax-invoice, receipt, privacy-notice
- **Verdict: clean.** No blocker or major findings. 10 minor and 6 nit findings; 13 of them are fixed in this pass.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 10 | 9 |
| nit | 6 | 4 |

## Fidelity check

Before fixes, at `4c20b2b`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 9 docs faithful, 0 findings, 27 docs not translated yet.
```

After the fixes below:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 9 docs faithful, 0 findings, 27 docs not translated yet.
```

## How I reviewed

I compared each Afrikaans block with its English partner, sentence by sentence. I checked meaning (added, lost, made more or less certain), modal verbs, `TERMS-af.json` terms, consistency within the batch, register (`jy`), spelling, link text against targets, and placeholder meaning. Facts, numbers, rand amounts, dates, form codes, URLs and links were all correct. I found no meaning change that affects a fact or an obligation.

## Findings

### F1 minor (fixed): "of dat" makes the sentence ungrammatical
- Document: `core/start-here`, intro, paragraph 2
- English: "Every step tells you if it is required by law, or if it is only a good idea."
- Afrikaans: "Elke stap sê vir jou of dit deur die wet vereis word, of dat dit net ’n goeie idee is."
- Fix: "… of dit net ’n goeie idee is."

### F2 minor (fixed): "if you need to" became "if you must"
- Document: `core/start-here`, "If the legal words are hard", paragraph 1
- English: "Read that one instead if you need to."
- Afrikaans: "Lees eerder daardie reël as jy moet."
- What is wrong: `as jy moet` reads as an obligation ("if you must"); English means "if you need it".
- Fix: "Lees eerder daardie reël as jy dit nodig het."

### F3 minor (fixed): awkward sentence with a comma before "nodig nie"
- Document: `start/start-here`, "The short version of the whole toolkit", paragraph 1
- English: "You do not need most of what people tell you to get."
- Afrikaans: "Jy het nie die meeste van wat mense jou sê om te kry, nodig nie."
- Fix: "Jy het nie die meeste dinge nodig wat mense vir jou sê om te kry nie." (the same shape as the matching sentence in `core/start-here`)

### F4 minor (fixed): "koskar" is not clearly a vehicle
- Document: `business-types/pick-your-business-type`, intro, paragraph after the table
- English: "A food truck is a food business and a vehicle owner."
- Afrikaans: "’n Koskar is ’n kosbesigheid en ’n voertuigeienaar."
- What is wrong: `koskar` can be read as a food cart or trolley, which does not make you a vehicle owner. The point of the sentence is lost.
- Fix: "’n Kosvragmotor is …". The notes table (section 1, food truck) should read `kosvragmotor`.

### F5 nit (fixed): heavy compound
- Document: `business-types/pick-your-business-type`, same paragraph
- English: "An online clothing brand is retail and online."
- Afrikaans: "’n Aanlynklerehandelsmerk is kleinhandel en aanlyn."
- Fix: "’n Aanlyn klerehandelsmerk is …"

### F6 nit (fixed): "drankies" leans towards alcohol
- Document: `business-types/pick-your-business-type`, table row 2
- English: "Make, cook, package or sell food or drinks"
- Afrikaans: "Kos of drankies maak, kook, verpak of verkoop"
- What is wrong: colloquial `drankies` usually means alcoholic drinks. The English covers all drinks.
- Fix: "Kos of drinkgoed maak, kook, verpak of verkoop"

### F7 minor (fixed): misplaced negation in the PIS entry
- Document: `lookup/glossary`, entry `pis`
- English: "… whether your company needs an audit, an independent review, or neither."
- Afrikaans: "… of jou maatskappy ’n oudit, ’n onafhanklike oorsig of nie een van die twee nie nodig het."
- What is wrong: the closing `nie` comes before `nodig het`, which is ungrammatical and makes the reader stop.
- Fix: "… of geeneen van die twee nodig het nie."

### F8 minor (fixed): relative clause does not parse
- Document: `paperwork/templates/quotation`, "What is NOT included", italic note
- English: "Most disputes are about work the customer assumed was in the price."
- Afrikaans: "Die meeste geskille gaan oor werk wat die kliënt aangeneem het by die prys ingesluit is."
- Fix: "… oor werk waarvan die kliënt aangeneem het dat dit by die prys ingesluit is."

### F9 minor (fixed): "Due date" label
- Document: `paperwork/templates/invoice`, header table row 3
- English: "Due date"
- Afrikaans: "Betaaldatum"
- What is wrong: `betaaldatum` reads as "the date paid" as easily as "the date payment is due". The standard label on South African Afrikaans invoices and statements is `Vervaldatum`.
- Fix: "Vervaldatum". The notes table (section 1, Due date) should read `Vervaldatum`, so batch 6 (`which-template-to-use-when` previews) uses it too.

### F10 minor (fixed): "weerspieël word" anglicism in prose
- Document: `paperwork/templates/invoice`, "Before you hand anything over"
- English: "Wait until the money reflects in your account balance, not "pending"."
- Afrikaans: "Wag totdat die geld in jou rekeningsaldo weerspieël word, nie "hangend" ("pending") nie."
- What is wrong: `TERMS-af.json` (reflected) says to prefer "die geld is in jou saldo" in prose; "weerspieël word" is a calque of the SA English banking idiom.
- Fix: "Wag totdat die geld in jou rekeningsaldo is, nie "hangend" ("pending") nie." No meaning is lost.

### F11 nit (fixed): "pending" without its English
- Document: `paperwork/templates/receipt`, closing blockquote
- English: "Not "pending"."
- Afrikaans: "Nie "hangend" nie."
- What is wrong: readers see "pending" in English bank apps; the invoice template and the glossary add it in brackets, the receipt did not.
- Fix: "Nie "hangend" ("pending") nie."

### F12 minor (fixed): broken relative clause
- Document: `paperwork/templates/privacy-notice`, "What we collect", item 3
- English: "Details of what you bought or asked about"
- Afrikaans: "Besonderhede van wat jy gekoop het of oor navraag gedoen het"
- Fix: "Besonderhede van wat jy gekoop het of waaroor jy navraag gedoen het"

### F13 nit (fixed): missing article
- Document: `paperwork/templates/privacy-notice`, "Why we collect it", item 3
- English: "To keep records that SARS requires by law"
- Afrikaans: "Om rekords te hou wat SARS volgens wet vereis"
- Fix: "… wat SARS volgens die wet vereis"

### F14 minor (not fixed, notes file): business-type link text is not the H1
- Document: `docs/reviews/WP-40-batch0-notes.md`, section 1, "Business-type doc titles"
- English: link text "Vehicle dealer", "Food business" …; the target H1s are "Business type: buying and selling vehicles", "Business type: food and drinks" …
- Afrikaans: the notes say "Batch 5 should use these as its H1s".
- What is wrong: the link text and the H1s differ in English. Batch 5 must translate its own H1s faithfully (`Besigheidstipe: …`), not reuse the link text. The link text itself in `pick-your-business-type` is correct.
- Fix: for the orchestrator: tell batch 5 to ignore that instruction. I did not edit the translator's notes.

### F15 nit (not fixed): "gereedskapstel" against the UI's "gids"
- Document: `start/start-here` and `core/start-here`, every "toolkit"
- English: "toolkit"
- Afrikaans: "gereedskapstel"
- What is wrong: it is faithful, but it reads like a physical tool kit, and the UI says `gids` on the same pages. English has the same split (content "toolkit", UI "guide"), so this is not an error.
- Fix: none. The orchestrator decides whether to add `toolkit` to `TERMS-af.json`.

### F16 nit (not fixed, TERMS): "tuiswerk" also means school homework
- Document: `lookup/glossary` group heading "Working from home and getting paid" → "Tuiswerk en betaling ontvang"; `core/start-here` link text "Tuiswerk en veilige ontmoetings"
- What is wrong: the translator followed `TERMS-af.json` (working from home → tuiswerk), which is correct under the rules. In a heading with no context, the first reading is "homework".
- Fix: none here. The orchestrator might change the TERMS entry to `werk van die huis af`. Then these two places and later batches change together.

## The translator's judgement calls

Section 1, new terms: I agree with all of them except food truck (`kosvragmotor`, F4) and due date (`Vervaldatum`, F9). `oordrag` for a bank transfer: I agree, the reason is good. `kortbeskrywing` for a design brief: I agree, because `opdrag` is taken. `Naslaan` for the "Reference:" label: I agree, because it is a list label and not the UI section name.

Section 2, glossary:
- Headword form: agree. It follows the style guide's bracket rules, and `**BTW (VAT)**` is as required.
- English expansions with lower-case descriptive glosses: agree. Lower case tells the reader that the gloss is not an official name, which is the safe choice when it cannot be checked. `Suid-Afrikaanse Inkomstediens` and `Werkloosheidversekeringsfonds` are the official Afrikaans names and are spelt correctly.
- Act names without Afrikaans titles: agree. The style guide allows a bracket explanation but does not require it.
- `Businesses Act-lisensie`: agree. The English now says "Businesses Act", and the TERMS note says to switch when it does. The TERMS entry should be updated by the orchestrator.
- Sole proprietor: agree. It is exact, and "moet steeds … registreer" matches "still need to register".
- `amptelike naam` for "legal name": agree. `wettige naam` would mean "lawful name".
- `beslissing` in the resolution definition: agree.
- Ring-fencing headword with `s20A` in the brackets: agree. The fidelity check is satisfied, and it reads naturally.
- Immediate payment / RTC: agree.
- OTP: agree.
- Small Claims Court, `voorheen R20,000`: agree. It says the same fact, and both amounts are kept. `prokureur` follows TERMS.
- Deemed remuneration split into two sentences: agree. No fact is lost.
- Deemed dividend, `die tekort`: agree. It is as vague as the English, which is correct.
- `tuiswerk` heading: agree that it follows TERMS; see F16.
- `oorbetalingswendelary`: agree to keep the TERMS spelling. A hyphen would need a TERMS change.

Section 3, ambiguous English:
- "Written in simple English …" kept literally: agree. Changing it would change a fact. The orchestrator could raise an English-source or UI note.
- Listing fence byte-identical: confirmed by the fidelity check (`code-verbatim`).
- "left column" in `pick-your-business-type`: agree to keep it. It is an English-source issue (the setup-effort column is the middle one). Pass it to the content owner.
- "Three rules" followed by four "Do NOT" rules in the invoice template: agree to keep it. It is an English-source issue for the content owner.
- Tax invoice item 1, Afrikaans words with the English in brackets: agree. It follows the style guide's quoted-wording rule. The VAT Act was enacted in both languages, and Afrikaans teaching material on section 20(4) gives "belastingfaktuur", "BTW-faktuur" or "faktuur" as the required words. I could not open the official Afrikaans text of the Act to confirm this. The orchestrator should confirm it against the gazetted Afrikaans text before release. For the non-VAT warning, naming both forms is the safer reading, as the notes say.
- `("ons")` for `("we", "us")`: agree. The placeholder count is unchanged.
- `STOP` in English: agree. It is the keyword customers type.
- Template header form: agree. It is the style guide's exact form.
- "onder jou eie naam" and "as jouself": agree.

Section 4, modal verbs: I checked all six; each is correct (`mag` for permission, `kan` and `dalk` for possibility, `mag nie` for "may not"). I also checked "must" (`moet`) in every template, and "Only a natural person may bring a claim" (`mag`). None is strengthened or weakened.
