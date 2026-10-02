# WP-40 batch 3: translator notes

Batch 3: `core/you-are-the-business`, `start/how-to-use`, `start/how-this-was-made`, `start/what-has-changed`. Base commit `4c20b2b`.

All four documents print 0 fidelity findings. I found no suspected false positives, so nothing went into `TRANSLATION-NOTES.md`. Document titles, link texts and terms follow the batch 0 glossary and `docs/reviews/WP-40-batch0-notes.md`. The coordinator's update is applied: an invoice's due date is `vervaldatum` (used once, in the escalation ladder). "food truck" does not occur in this batch.

These notes are for the human reviewer. Where they differ from `STYLE-GUIDE-af.md` or `TERMS-af.json`, the guide and the term list win.

## 1. Terms not in TERMS-af.json

| English | Afrikaans used | Where | Note |
| --- | --- | --- | --- |
| Master of the High Court | Master of the High Court (Meester van die Hooggeregshof) | you-are-the-business | Official name kept in English, Afrikaans in brackets on first use (in its own word-table row). Later: "Master of the High Court", then "die Master" |
| High Court | Hooggeregshof | you-are-the-business | |
| Letter of Good Standing | Letter of Good Standing (no gloss) | you-are-the-business | Kept in English as the name of the COIDA document; I did not add an unverified Afrikaans name |
| Return of Earnings | Return of Earnings (verdiensteopgawe) | you-are-the-business, what-has-changed | Descriptive gloss, lower case, not checked against an official Afrikaans form name |
| Government Gazette / Government Notice | Government Gazette (Staatskoerant) / Government Notice (Goewermentskennisgewing) | you-are-the-business, how-this-was-made | Numbers unchanged |
| income protection | inkomstebeskerming | you-are-the-business | |
| disability cover | ongeskiktheidsdekking | you-are-the-business | |
| letter of demand | aanmaningsbrief | you-are-the-business | |
| prescription / prescribes | verjaring / verjaar | you-are-the-business | |
| executor / curator | eksekuteur / kurator | you-are-the-business | |
| deceased estate | bestorwe boedel | you-are-the-business | |
| perpetual succession | ewigdurende opvolging | you-are-the-business | |
| defendant / juristic person | verweerder / regspersoon | you-are-the-business | TERMS legal person → regspersoon |
| escalation ladder | die leer van stappe | you-are-the-business, what-has-changed | Plain rather than technical |
| sole proprietor (as a person) | eenmansaak-eienaar | you-are-the-business, how-this-was-made, what-has-changed | TERMS gives `eenmansaak` for the business form. Where English means the person ("a sole proprietor cannot be an employee"), I wrote `eenmansaak-eienaar`. Where it means the structure (section heading "Sole proprietor", "a company and sole proprietor"), `eenmansaak`. The orchestrator may want this added to TERMS |
| Path 1–4 | Roete 1–4 | how-to-use | |
| refine prompt | verfyningsopdrag | how-to-use | TERMS prompt → opdrag |
| critique prompt | kritiekopdrag | how-to-use | |
| defect schedule | bylae van gebreke | how-to-use | |
| motor trade insurance | motorhandelversekering | how-to-use | |
| pass (verification pass) | rondte | how-this-was-made, what-has-changed | "Derde rondte", "Negende rondte" |
| Corrections log | Lys van regstellings | how-this-was-made, what-has-changed | Not `logboek`, which TERMS uses for the vehicle logbook |
| prompt engineering | opdragontwerp (prompt engineering) | how-this-was-made | |
| cast versus calendered (vinyl) | gegote teenoor gekalanderde vinyl | how-this-was-made, what-has-changed | Trade terms; a sign maker should confirm |
| Fourth Schedule | Vierde Bylae | how-this-was-made | Not an Act name, so translated; the Act name stays English |
| Department of Transport / National Consumer Commission | Department of Transport (Departement van Vervoer) / National Consumer Commission (Nasionale Verbruikerskommissie) | how-this-was-made | Official names kept, Afrikaans in brackets on first use. B-BBEE Commission kept in English with no gloss |
| South African Reserve Bank | South African Reserve Bank (Suid-Afrikaanse Reserwebank) | how-this-was-made | TERMS Reserve Bank → Reserwebank |
| Changelog and redline (H1) | Veranderingslys en verskille | what-has-changed | "redline" is the comparison between the two copies; `verskille` says that plainly. Reviewer may prefer another title |
| AI disclosure (H1) | KI-openbaarmaking | how-this-was-made | The H1 is translated literally. Links to this file use the TERMS title `Hoe dit gemaak is en hoe om dit na te gaan` |
| Start here (link text to `00-start-here.md`) | Begin hier | what-has-changed | Batch 0's H1 for that file is "Suid-Afrikaanse gereedskapstel vir klein besighede". The English link text is "Start here", so I translated the link text |
| DONE / NO — needs paste / NOT YET | KLAAR / NEE — moet geplak word / NOG NIE | what-has-changed | Capitals kept as in English |

## 2. Judgement calls a reviewer should look at

- **`start/how-to-use`, "says the same thing in everyday English".** On the Afrikaans page the plain-words lines are in Afrikaans, so I wrote `in alledaagse taal` ("in everyday language"), not `alledaagse Engels`. This differs from batch 0, which kept "eenvoudige Engels" in `start/start-here` where it describes the English source. Here the sentence tells the reader what they will see on the page they are reading, so the literal version would be false. **Reviewer: confirm, or revert to `Engels` for consistency with batch 0.**
- **`start/how-this-was-made`, fourth pass, "in everyday English".** Here I kept `alledaagse Engels`, because the sentence is a record of what was done to the English source. I quoted the labels as `"In gewone taal:" ("In plain words:")` and `"Woorde wat in hierdie lêer gebruik word" ("Words used in this file")`.
- **`start/how-this-was-made`, who did what.** Kept exactly: "written by Claude, an AI assistant made by Anthropic"; "No lawyer, accountant, or registered tax practitioner reviewed it" → `Geen prokureur, rekenmeester of geregistreerde belastingpraktisyn het dit … hersien nie`; "The user noticed" → `Die gebruiker het opgemerk`. Passives stay passive (`is … gevind`, `is … nagegaan`), so the Afrikaans does not name an actor where English does not. "Softened, not corrected" → `Afgewater, nie reggestel nie`; "weakened" → `verswak`.
- **`start/how-this-was-made`, "well-ranked South African articles".** I wrote `artikels wat hoog in soekresultate verskyn het` ("that appeared high in search results"). This is my reading of "well-ranked". It may be slightly more specific than the English.
- **`start/how-this-was-made`, "the annual cost of a.co.za domain".** The English is missing a space ("a.co.za"). I wrote `’n .co.za-domein`. This is an English-source typo for the owner.
- **`start/how-this-was-made`, "the gazetted 2026 filing-season closing dates".** I wrote `die sluitingsdatums vir die 2026-indieningseisoen soos in die Staatskoerant afgekondig`.
- **`start/what-has-changed`, Drive document names.** Names of the Google Drive documents (`"00 Already have your name - start here in this folder"`, `"01 Start here - what is in this folder"`, `"00 START HERE"`, `"02 AI disclosure and how this was checked"`, etc.) and Drive folder names (`02 Branding and marketing`, `01 Core`) stay in English, because the Drive copy exists only in English. I did not add Afrikaans glosses, so the names match what a reader sees in Drive.
- **`start/what-has-changed`, the five snippet fences.** I translated them, as the style guide says for `snippet`. They are text to paste into the English Drive documents, so an Afrikaans paste into an English document is odd. The Drive document names inside them stay in English. Snippet 2 still refers to the heading "Choosing the name" in English in the Drive document. In the table above it, the same heading inside `02-register.md` is translated as "Kies die naam"; **batch 1 should check that this matches its rendering of that heading**. Snippet 5 quotes the English line "The lesson generalises" because it locates a line in the English Drive document. Line counts match English; the line lengths in snippets 4 and 5 are uneven.
- **`start/what-has-changed`, "For a company it is a trade, not a catch."** I wrote `’n ruil, nie ’n strik nie` ("a trade-off, not a trap").
- **`core/you-are-the-business`, Small Claims Court.** First use with the Afrikaans name in brackets is in the table header; the section heading keeps the English name only. "Your company can still be sued" follows the TERMS pattern: `’n Eis kan steeds … teen jou maatskappy ingestel word`.
- **`core/you-are-the-business`, "Whatever number of months you could not work and still pay rent."** The English is compressed. I wrote `Genoeg om huur te betaal vir die aantal maande wat jy nie sou kan werk nie` ("Enough to pay rent for the number of months you could not work").
- **`core/you-are-the-business`, "arguably more important"** → `waarskynlik belangriker`. `waarskynlik` is close to "probably". A reviewer may prefer `myns insiens` or `ek sou sê`, but those add a speaker.
- **`core/you-are-the-business`, "the register-or-not conversation"** → `wanneer mense praat oor of jy moet registreer of nie`.

## 3. Modal verbs checked

- "you may have some" (heading) → `jy het dalk iets` (possibility).
- "it may also be the only illness benefit" → `is dit dalk ook` (possibility).
- "Incapacity may be worse than death" → `kan erger … wees` (possibility).
- "only a natural person may institute an action", "may become a party only as defendant", "may participate as a defendant", "may appear for it", "you may abandon the excess" → `mag` (permission).
- "I know which court I may use" → `mag`.
- "your financial reporting obligation may change" → `kan verander`.
- "something you might do" → `iets wat jy dalk … doen`. "It might be." → `Dit kan wees.`
- "should" → `behoort` ("You should know that", "why you should open the link"; "Generic where it should be specific" → `behoort … te wees`). "Should my new line be a separate company?" and "Which free software should I use?" are reader questions and became `Moet …`, the natural Afrikaans question form; a reviewer may prefer `Behoort …`.
- "must" → `moet` throughout. "must not" does not occur.
