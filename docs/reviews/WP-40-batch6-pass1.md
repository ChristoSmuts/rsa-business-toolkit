# WP-40 batch 6: af review, pass 1

- Date: 2 October 2026
- Commit reviewed: `2fe99c1` (tip of `claude/lucid-bell-t5acdn`; the batch 6 translation is `7efd3e8`, `feat(af): translate batch 6 (templates guide, free tools, checklist, sources)`)
- Reviewer role: af-reviewer (WP-42)
- Documents: `paperwork/which-template-to-use-when`, `paperwork/free-tools`, `lookup/checklist`, `lookup/sources`
- Fixes commit: `8f35c60` (`fix(af): apply batch 6 review pass 1 fixes`)
- **Verdict: clean.** No blocker or major findings. 12 minor and 16 nit findings; 26 of them are fixed in this pass.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 12 | 12 |
| nit | 16 | 14 |

## Fidelity check

Before fixes, at `2fe99c1`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below, each document on its own (`--doc paperwork/which-template-to-use-when`, `paperwork/free-tools`, `lookup/checklist`, `lookup/sources`) and the whole set:

```
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (x4, one per document)

$ pnpm content:fidelity --lang af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

`src/data/**` was not touched. The orchestrator regenerates it at integration (`pnpm content:build --lang af`).

## How I reviewed

I compared each Afrikaans block with its English partner, sentence by sentence. I checked meaning (added, lost, made more or less certain), modal verbs, `TERMS-af.json` and glossary terms, consistency within the batch and with other batches, register, spelling, link text against the target H1s, and placeholder meaning. In the sources register I checked that each `Ondersteun:` line claims what the English `Supports:` line claims, no more and no less. Every number, rand amount, date, form code, URL and link was correct. I found no change to a fact, figure, obligation, deadline or source claim.

Link text: all links to other documents translate the English link text and match the target H1 where English does (`Gratis gereedskap`, `Woordelys`, `Registreer: wat jy regtig nodig het`, `Bestuur van ’n Pty Ltd`, `Betaal jouself uit ’n Pty Ltd`, `Bronne- en verifikasieregister`). `[Voertuie vir jou besigheid]` differs from the H1 `Voertuie en jou besigheid`, but the English link text ("Vehicles for your business") differs from its H1 in the same way, and other batches use the same text. Not a finding.

## Findings

### F1 minor (fixed): relative clause does not parse (same as batch 0 F8)
- Document: `paperwork/which-template-to-use-when`, "Template 1: quotation", rule 2 under "Three rules that save you money"
- English: "Most disputes are about work the customer assumed was in the price."
- Afrikaans: "Die meeste geskille gaan oor werk wat die kliënt aangeneem het by die prys ingesluit is."
- Fix: "… oor werk waarvan die kliënt aangeneem het dat dit by die prys ingesluit is." Now identical to the corrected `templates-to-fill-in/01-quotation.md` (batch 0 pass 1 F8), as the coordinator asked.

### F2 minor (fixed): broken relative clause (same as batch 0 F12)
- Document: `paperwork/which-template-to-use-when`, "Template 5: privacy notice (POPIA)", preview, WHAT WE COLLECT, item 3
- English: "Details of what you bought or asked about"
- Afrikaans: "Besonderhede van wat jy gekoop het of oor navraag gedoen het"
- Fix: "Besonderhede van wat jy gekoop het of waaroor jy navraag gedoen het". Now identical to the corrected `templates-to-fill-in/05-privacy-notice-popia.md` (batch 0 pass 1 F12), as the coordinator asked.

### F3 nit (fixed): missing article (same as batch 0 F13)
- Document: `paperwork/which-template-to-use-when`, "Template 5", preview, WHY WE COLLECT IT, item 3
- English: "To keep records that SARS requires by law"
- Afrikaans: "Om rekords te hou wat SARS volgens wet vereis"
- Fix: "… wat SARS volgens die wet vereis" (matches the corrected privacy-notice template).

### F4 minor (fixed): negative imperative
- Document: `paperwork/which-template-to-use-when`, "Invoice numbering", paragraph 2
- English: "If you cancel an invoice, do not delete it."
- Afrikaans: "As jy ’n faktuur kanselleer, moet dit nie uitvee nie."
- What is wrong: a negative instruction is `moenie`; `moet dit nie uitvee nie` reads as colloquial and is inconsistent with the `Moenie …` instructions elsewhere in the file.
- Fix: "As jy ’n faktuur kanselleer, moenie dit uitvee nie."

### F5 nit (fixed): "meestal" for "most of"
- Document: `paperwork/which-template-to-use-when`, "Template 3", paragraph on R50 to R5,000
- English: "It needs most of the same information"
- Afrikaans: "Dit het meestal dieselfde inligting nodig"
- What is wrong: `meestal` means "mostly, usually"; English means "most of the items".
- Fix: "Dit het die meeste van dieselfde inligting nodig"

### F6 minor (fixed): prompts asked the AI for "eenvoudige Engels"
- Document: `paperwork/which-template-to-use-when`, "Prompts to generate the rest", "Terms and conditions" prompt block 2 and "A simple service agreement" prompt block 2
- English: "Write terms and conditions for my business in simple English that a Grade 8 learner can read." / "Write a one-page agreement in simple English covering:"
- Afrikaans: "… in eenvoudige Engels wat ’n graad 8-leerder kan lees." / "… in eenvoudige Engels wat die volgende dek:"
- What is wrong: in the English file "English" is the reader's own language; the point of the instruction is "simple". An Afrikaans reader who pastes an Afrikaans prompt and gets English terms back is not served by it. I considered "eenvoudige Afrikaans" and chose "eenvoudige taal": with an Afrikaans prompt the AI writes Afrikaans by default, but a reader whose customers read English is not forced into Afrikaans either. It also matches batch 4, which rendered every "simple English" in a prompt as `eenvoudige taal` (`01-branding-prompts`, `03-brand-applications-and-polish`, `04-marketing-prompts`), and the sources register's "plain language" (`eenvoudige taal`) for the Consumer Protection Act requirement the next paragraph cites. "Written in simple English …" in `start/start-here` stays as it is: that sentence is a fact about the English text (batch 0 decision).
- Fix: "in eenvoudige taal" in both prompts.

### F7 nit (fixed): "enige kant"
- Document: `paperwork/which-template-to-use-when`, service agreement prompt, list item 9
- English: "How either side can cancel"
- Afrikaans: "Hoe enige kant kan kanselleer"
- Fix: "Hoe enige party kan kanselleer" (the list opens with "Wie die partye is").

### F8 nit (fixed): "regsgeleerd"
- Document: `paperwork/which-template-to-use-when`, paragraph after the terms-and-conditions prompt
- English: "do not ask the AI to make it sound legal"
- Afrikaans: "moenie die KI vra om dit regsgeleerd te laat klink nie"
- What is wrong: `regsgeleerd` describes a person learned in law, not legal-sounding text.
- Fix: "… om dit soos regstaal te laat klink nie."

### F9 nit (fixed): "geld insamel"
- Document: `paperwork/which-template-to-use-when`, "Documents you probably do not need yet", paragraph 1
- English: "Only needed to raise money from a bank or investor."
- Afrikaans: "Net nodig om geld by ’n bank of belegger in te samel."
- What is wrong: `geld insamel` suggests fundraising or collecting donations.
- Fix: "Net nodig om geld by ’n bank of belegger te kry."

### F10 minor (fixed): "spyskaarte" for software menus
- Document: `paperwork/free-tools`, "LibreOffice", Weaknesses
- English: "The menus look different from Microsoft Office"
- Afrikaans: "Die spyskaarte lyk anders as Microsoft Office"
- What is wrong: `spyskaart` is a restaurant menu. The software term is `kieslys`.
- Fix: "Die kieslyste lyk anders as Microsoft Office"

### F11 minor (fixed): main-clause word order after "as"
- Document: `paperwork/free-tools`, "The recommendation", reason 3
- English: "If your laptop is stolen or the hard drive dies, your business does not stop."
- Afrikaans: "As jou skootrekenaar gesteel word of die hardeskyf gaan dood, stop jou besigheid nie."
- Fix: "… of die hardeskyf doodgaan, stop jou besigheid nie."

### F12 nit (fixed): elliptic "LibreOffice nie."
- Document: `paperwork/free-tools`, "The recommendation", reason 1
- English: "Google works there. LibreOffice does not."
- Afrikaans: "Google werk daar. LibreOffice nie."
- Fix: "Google werk daar. LibreOffice werk nie daar nie."

### F13 nit (fixed): awkward "verby ongeveer R500,000 omset is"
- Document: `paperwork/free-tools`, "What to avoid", item 2
- English: "… until you are past about R500,000 turnover or have stock to track."
- Afrikaans: "… totdat jy verby ongeveer R500,000 omset is of voorraad het om by te hou."
- Fix: "… totdat jou omset verby ongeveer R500,000 is of jy voorraad het om by te hou." Amount unchanged.

### F14 minor (fixed): "jy" in one checklist item where all others say "ek"
- Document: `lookup/checklist`, Part B, "Vehicle dealer", item 8
- English: "VAT264 process in place, if registered"
- Afrikaans: "VAT264-proses in plek, as jy geregistreer is"
- Decision on the translator's question: the tick items are written from the reader's own side (`my`, `ek`) because English uses "I/my" in every personal item, and the conditions in this group already say `as ek … rondbeweeg`, `as ek in tweedehandse goedere handel dryf`. One `jy` in the middle of a list of `ek` items reads as a different speaker. Headings, the key table and the Part C calendar keep `jy`, because English says "you" there ("Before you trade", "if you run payroll", "Per your certificate"). The style-guide example uses this line with `jy` to show the shape of a checklist group, not as a register rule.
- Fix: "VAT264-proses in plek, as ek geregistreer is". The orchestrator may want to update the example in `STYLE-GUIDE-af.md` ("A master checklist group") to match; I did not edit the guide.

### F15 minor (fixed): "is … weerspieël" and "pending" without its English
- Document: `lookup/checklist`, Part A, "Every sale where I never meet the customer, or meet them once", item 1
- English: "Money reflected in my balance, not "pending", before anything is handed over"
- Afrikaans: "Geld is in my saldo weerspieël (reflected), nie "hangend" nie, voordat enigiets oorhandig word"
- What is wrong: `is … weerspieël` is ungrammatical (the passive needs `word`), and `TERMS-af.json` (reflected) says to prefer "die geld is in jou saldo" in prose; batch 0 F10 made the same change in the invoice template. Readers see "pending" in English bank apps; batch 0 F11 added it in brackets.
- Fix: "Die geld is in my saldo, nie "hangend" ("pending") nie, voordat enigiets oorhandig word". No meaning lost.

### F16 minor (fixed): "IE" against "IP" in batch 5
- Document: `lookup/checklist`, Part B, "Professional and creative", item 2
- English: "Service agreement covering scope, revision rounds, IP and payment"
- Afrikaans: "… rondtes van wysigings, IE en betaling dek"
- What is wrong: the linked business-type document (`business-types/professional-and-creative`, batch 5) keeps `IP` and explains it in its words table; `IE` appears nowhere else and is not explained on this printable page.
- Fix: "IP". I disagree with the translator's call (notes section 4) for that reason.

### F17 minor (fixed): "deur" makes the department the applicant
- Document: `lookup/checklist`, Part B, "Food", item 3
- English: "COA applied for through the municipal Environmental Health Department"
- Afrikaans: "Aansoek om ’n COA gedoen deur die munisipaliteit se afdeling vir omgewingsgesondheid"
- What is wrong: after a passive, `deur` names the agent, so it reads "application made by the department".
- Fix: "Aansoek om ’n COA gedoen by die munisipaliteit se afdeling vir omgewingsgesondheid"

### F18 nit (fixed): "herdenking" against batch 2's "herdenkingsdatum"
- Documents: `lookup/checklist` Part A2 "Every year" item 2 and Part C row "Anniversary of registration"; `lookup/sources` "Running a Pty Ltd", Govchain entry
- English: "registration anniversary", "Anniversary of registration", "incorporation anniversary"
- Afrikaans: "herdenking van registrasie", "Herdenking van registrasie", "herdenking van inlywing"
- What is wrong: `core/running-a-pty-ltd` and `core/tax-and-sars` use `herdenkingsdatum`; a bare `herdenking` reads as a commemoration.
- Fix: `herdenkingsdatum van registrasie` / `Herdenkingsdatum van registrasie` / `herdenkingsdatum van inlywing`.

### F19 nit (fixed): "brand one-pager" named differently from its target
- Document: `lookup/checklist`, Part A, "Brand and documents", item 3
- English: "Built a brand one-pager (`02-branding-and-marketing/01`)"
- Afrikaans: "’n Handelsmerkopsomming van een bladsy gemaak"
- What is wrong: the referenced prompt produces a "one-page brand guide", which batch 4 renders `handelsmerkgids van een bladsy`.
- Fix: "’n Handelsmerkgids van een bladsy gemaak"

### F20 nit (fixed): "tussen … of"
- Document: `lookup/checklist`, Part A, "Compliance", item 4
- English: "Decided sole proprietor or company, and registered if needed"
- Afrikaans: "Besluit tussen eenmansaak of maatskappy, en geregistreer as dit nodig is"
- Fix: "Besluit tussen ’n eenmansaak en ’n maatskappy, en geregistreer as dit nodig is" (`tussen … en`).

### F21 minor (fixed): "micro business qualification" became "when a micro business qualifies"
- Document: `lookup/sources`, "Tax and SARS", SARS Turnover Tax entry, `Ondersteun:`
- English: "Supports: micro business qualification, …"
- Afrikaans: "Ondersteun: wanneer ’n mikrobesigheid kwalifiseer, …"
- What is wrong: the English means the test for qualifying as a micro business; the Afrikaans says when an existing micro business qualifies (for something unnamed).
- Fix: "Ondersteun: wanneer ’n besigheid as ’n mikrobesigheid kwalifiseer, …". The claim is now exactly the English one.

### F22 minor (fixed): "may become a party" rendered with "kan"
- Document: `lookup/sources`, "You are the business", "Small Claims Court, who may sue"
- English: "only a natural person may institute an action, and a juristic person may become a party only as defendant"
- Afrikaans: "net ’n natuurlike persoon mag ’n eis instel, en ’n regspersoon kan net as verweerder ’n party word"
- What is wrong: both "may" are the statutory permission; the style guide says `mag`. The first half already uses `mag`.
- Fix: "… en ’n regspersoon mag net as verweerder ’n party word"

### F23 nit (fixed): "nominated" as "aangewese"
- Document: `lookup/sources`, same paragraph
- English: "A nominated director or officer may appear for a juristic person"
- Afrikaans: "’n Aangewese direkteur of beampte mag verskyn …"
- What is wrong: `aangewese` is "designated"; it is also this batch's gloss for the different role "Designated Police Officer".
- Fix: "’n Benoemde direkteur of beampte mag verskyn …"

### F24 nit (fixed): "Beskikbaar deur gov.za"
- Document: `lookup/sources`, "Food businesses", R638 and R146 entries
- English: "Available through gov.za."
- Afrikaans: "Beskikbaar deur gov.za."
- Fix: "Beskikbaar op gov.za." (twice)

### F25 nit (fixed): "geldeenhede" for "currency"
- Document: `lookup/sources`, "Working from home, payments and personal safety", SARB entry, `Ondersteun:`
- English: "that the SARB alone may issue currency under section 14 of the SARB Act"
- Afrikaans: "dat net die SARB geldeenhede mag uitreik, …"
- What is wrong: `geldeenheid` is a unit of currency (the rand), not the notes and coins issued.
- Fix: "dat net die SARB geld mag uitreik, …"

### F26 nit (fixed): "cleared" without its English on first use
- Document: `lookup/sources`, "PayShap limits", Solmate entry
- English: "payments clear in seconds"
- Afrikaans: "betalings binne sekondes verreken word"
- What is wrong: `TERMS-af.json` (cleared) asks for the English in brackets on first use; this is the first use in the document.
- Fix: "betalings binne sekondes verreken word (clear)"

### F27 nit (not fixed): unverified descriptive glosses
- Document: `lookup/sources`: `Return of Earnings (verdiensteopgawe)`, `Designated Police Officer (aangewese polisiebeampte)`, `Small Claims Courts (kleineisehowe)`
- What is wrong: nothing wrong in meaning; they are lower-case descriptive glosses, as the notes say, and batches 1 to 5 use the same glosses (`core/running-a-pty-ltd` has `opgawe van verdienste` for the first). The Compensation Fund's own Afrikaans name for the ROE was not checked.
- Fix: none here. The orchestrator may add `Return of Earnings` to `TERMS-af.json` so all batches use one gloss.

### F28 nit (not fixed): "criteria" as "vereistes", the templates guide says "kriteria"
- Document: `lookup/sources`, SARS Tax Invoice Checklist entry
- English: "the seven criteria … the five criteria"
- Afrikaans: "die sewe vereistes … die vyf vereistes"
- What is wrong: the templates guide translates the same "criteria" as `kriteria`. Both are correct and the claim is identical.
- Fix: optional; left as it is.

### F29 (record only): coordinator request, covered by F1 and F2
The coordinator's extra item from batch 0 pass 2 (the quoted template sentences in `which-template-to-use-when` still had the pre-pass-1 wording of batch 0 F8 and F12) is covered by F1 and F2. I checked the rest of the quoted template text in the guide against the corrected templates (quotation, invoice, receipt, privacy notice): no other sentence differs in wording that batch 0 corrected. This line is listed only to record the request; it is not counted separately in the table.

## The translator's judgement calls

Section 1, due date: agree. `Vervaldatum` is used in the words table and the invoice preview; "payment dates" in the service-agreement prompt is correctly `betaaldatums`. The batch 0 invoice template now also says `Vervaldatum`, so that open item is closed.

Section 2, new terms: agree with all except `IE` (F16). `afleweringsbrief`, `diensooreenkoms`, `Ontvanger`, `rekonsilieer`, `strokie` (also used in batches 1 and 2), `blaaier`, `vanlyn`, `sinkroniseer`, `rugsteun`, `warmkol`, `domein`, `roeteerder`, `gratis vlak`, `Sekondêr`, `Onderliggende wetgewing`, `Regspraak`, `Bylae`, `onafhanklike kontrakteur`, `verjaringstermyn`, `gegote / gekalanderde viniel` are standard and used consistently. `Sleutel tot die kort woorde` / `Kort` / `Beteken`: agree; a short table header suits a printed page.

Section 3, sources register titles:
- Official topic pages translated, named publications kept in English: agree. It is the style guide's rule (`SARS — Omsetbelasting`) and the reader needs the exact English title to search for a guide, a notice or a regulation. I would not add Afrikaans glosses after named publications without checked official titles.
- `VAT Connect uitgawe 20, Oktober 2025`: agree. The month must be Afrikaans for the date check, and the reader can still find the issue by its number.
- `VAT 264-verklaring vir die lewering van tweedehandse goedere`: agree; form code kept.
- Secondary titles in English with only the description translated: agree.
- Institutions in English, Afrikaans names only where confident: agree. `Information Regulator (Inligtingsreguleerder)` and `Small Claims Court (Kleineisehof)` follow TERMS; `Meester van die Hooggeregshof` and `Binnelandse Sake` are the official Afrikaans names. The unverified lower-case glosses are F27.
- Case names, Companies Regulations 2011, `die Britse Model Articles`: agree.
- `uitspraak 28 April 1970`, `regulasies 28 en 29`: agree; the plural adds nothing.

Section 4:
- Missing spaces in English (`a.docx`, `a.co.za`), written `’n .docx` and `’n .co.za-domein`: agree. Pass to the content owner for the English.
- `yourname.co.za` and `you@yourbusiness.co.za` kept: agree; a changed domain would be a fact change and the build rejects it.
- Google Docs menu path kept in English (File, Download, PDF): agree. Most readers run Google Docs in English, and the Afrikaans interface labels cannot be checked here.
- Listing fence copied byte for byte: agree; the style guide requires it.
- "Simple English" in prompts: disagree; see F6. Decision: `eenvoudige taal`, not `eenvoudige Engels` and not `eenvoudige Afrikaans`. "Grade 8 learner" → `’n graad 8-leerder` and `prokureur` for lawyer: agree.
- Template preview labels from batch 0, `[Maatskappyregistrasienommer, as jy een het]`, `("ons")`, `Information Regulator (Inligtingsreguleerder)`: agree.
- `"Belastingfaktuur" ("Tax Invoice")` and the three-word list: agree; it follows batch 0. The batch 0 caveat (confirm against the gazetted Afrikaans VAT Act) still stands for the orchestrator.
- Checklist register: decided in F14. Tick items use `ek`; headings, the key table and the calendar keep `jy` as English uses "you" there.
- Conditions first with a colon: agree; checked in every conditional item.
- Money hygiene gerunds as present-tense habits (`Ek neem ’n foto …`): agree. It keeps the sense of an ongoing habit, which a past participle would lose.
- `nagegaan en vereffen` for a loan account, `verreken` for cleared funds: agree. `vereffen` (settle) is the right word for clearing a loan account; I used the same in the Part C row, which already said `vereffen`.
- `BTW-geregistreerde handelaar` for "VAT dealer": agree; `BTW-ondernemer` would lose "dealer".
- `sleutels eers oorhandig wanneer julle sit`: agree. It is as open as the English, and it is a summary of a secondary source, not advice.
- `Aanspreeklikheidsversekering vir behandelings`, `pleistertoets (patch test)`: agree.
- `IE` for IP: disagree; see F16.
- `lei dikwels beter tot verkope`: agree; it says what "convert better" means without marketing jargon.

Section 5, modal verbs: I checked every one listed. All are correct except "a juristic person may become a party only as defendant", which had `kan` (F22). I also checked "must" (`moet`) and "should" (`behoort`) in all four documents; none is strengthened or weakened.

## For the orchestrator

- `STYLE-GUIDE-af.md`, "A master checklist group": the example line `VAT264-proses in plek, as jy geregistreer is` no longer matches the checklist (F14). Consider changing it to `as ek geregistreer is`.
- `TERMS-af.json`: consider entries for `Return of Earnings` (F27) and "simple English" in prompts (`eenvoudige taal`, F6), so later edits stay consistent.
- English source: `a.docx` (`paperwork/free-tools`) and `a.co.za` (`lookup/checklist`) are missing a space.
