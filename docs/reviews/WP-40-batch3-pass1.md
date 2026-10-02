# WP-40 batch 3: af review, pass 1

- Date: 2 October 2026
- Commit reviewed: `2fe99c1` (integration branch tip, with all 36 Afrikaans documents and the regenerated `src/data`)
- Fixes: `e742efd` (`fix(af): apply batch 3 review pass 1 fixes`), on top of `2fe99c1`
- Reviewer role: af-reviewer (WP-42)
- Documents: `core/you-are-the-business`, `start/how-to-use`, `start/how-this-was-made`, `start/what-has-changed`
- Translator's notes: `docs/reviews/WP-40-batch3-notes.md`
- **Verdict: clean.** No blocker or major findings. 8 minor and 8 nit findings, all fixed in this pass.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 8 | 8 |
| nit | 8 | 8 |

## Fidelity check

Before fixes, at `2fe99c1`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below, for each document in the batch (`--doc core/you-are-the-business`, `start/how-to-use`, `start/how-this-was-made`, `start/what-has-changed`):

```
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.
```

And the full run again:

```
$ pnpm content:fidelity --lang af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

`src/data` was not regenerated. The orchestrator's `pnpm content:build --lang af` picks up the fixed markdown.

## How I reviewed

I compared each Afrikaans block with its English partner, sentence by sentence. I checked meaning (added, lost, made more or less certain), modal verbs, `TERMS-af.json` terms and the batch 0 glossary, consistency within the batch and with the headings of other batches that these files quote, register (`jy`), spelling, and link text against the Afrikaans H1 of each target. Facts, numbers, rand amounts, dates, form codes, URLs and link targets were all correct.

**AI disclosure (`start/how-this-was-made`).** I checked every sentence that says who wrote, checked or did not check something, and how certain it is. All of them match the English: the sentence that names the AI assistant that wrote the guide and the company that made it (same names, `’n KI-assistent wat deur … gemaak is`, same date); "No lawyer, accountant, or registered tax practitioner reviewed it before publication" (`Geen prokureur, rekenmeester of geregistreerde belastingpraktisyn het dit voor publikasie hersien nie`); "The prompts … were written by the AI. They were not tested against every AI tool"; "Two factual errors were found and fixed"; "Four claims were weakened because they could not be verified"; "No further factual errors were found"; "The user noticed" (`Die gebruiker het opgemerk`); "spotted by the user" in `what-has-changed` (`raakgesien deur die gebruiker`); "The zip was verified to be byte-identical"; "One unverifiable price … was removed". English passives stay passive, so no actor is added. None of these is changed by the fixes below.

**Link text.** Across the whole Afrikaans corpus, link text translates the English link text, not the target's H1 (for example `[Voertuie vir jou besigheid](05-vehicles.md)`, `[Tuiswerk en veilige ontmoetings](…09-working-from-home-and-safety.md)`, `[Watter sjabloon om wanneer te gebruik](…)`, `[Kern: begin hier](…)`). English does the same: its link texts are not its H1s. Batch 3 uses exactly the same strings as the other batches, so I made no change. Where a link text is the target's title in English, the Afrikaans is the target's Afrikaans H1: `Hoe om hierdie gereedskapstel te gebruik`, `Bestuur van ’n Pty Ltd`, `Betaal jouself uit ’n Pty Ltd`, `Registreer: wat jy regtig nodig het`, `Belasting en SARS`, `Wat jy nodig het om dinge te verkoop`, `Handelsmerkopdragte`, `Handelsmerktoepassings en afronding`, `Gratis gereedskap`, `Kies jou besigheidstipe`, `Hoofkontrolelys`, `Woordelys`, `Bronne- en verifikasieregister`, `Jy is die besigheid`. Quoted headings of other files: "Waarheen volgende" matches batch 4's `00-already-have-your-name`; "Choosing the name" did not match batch 1 (F7).

## Findings

### F1 minor (fixed): "arguably" became "probably"
- Document: `core/you-are-the-business`, "What both structures still need", paragraph 1
- English: "For a one-person business this is arguably more important than the public liability cover …"
- Afrikaans: "Vir ’n eenpersoonbesigheid is dit waarskynlik belangriker as die dekking vir openbare aanspreeklikheid …"
- What is wrong: `waarskynlik` ("probably") claims likelihood; "arguably" only says a case can be made. Bilingual dictionaries do give `waarskynlik` for "arguably", so this is not a meaning change, but the hedge is not exact on a point the translator flagged.
- Fix: "Vir ’n eenpersoonbesigheid kan ’n mens redeneer dat dit belangriker is as …". It keeps the hedge and adds no speaker.

### F2 minor (fixed): missing negation "nie"
- Document: `core/you-are-the-business`, "Pty Ltd paying you a salary: you may have some", paragraph 1
- English: "… one of the few real advantages of incorporating that nobody mentions in the register-or-not conversation."
- Afrikaans: "… van inlywing wat niemand noem wanneer mense praat oor of jy moet registreer of nie."
- What is wrong: `niemand noem` needs its closing `nie`. The final `of nie` belongs to the indirect question, so the sentence lacks the negation.
- Fix: "… wat niemand noem nie wanneer mense praat oor of jy moet registreer of nie."

### F3 minor (fixed): "besering aan diens"
- Document: `core/you-are-the-business`, same section, paragraph 3
- English: "it pays out for injury on duty."
- Afrikaans: "dit betaal uit vir ’n besering aan diens."
- What is wrong: the fixed Afrikaans term for injury on duty is `besering op diens`; `aan diens` reads as "injury to the service".
- Fix: "dit betaal uit vir ’n besering op diens."

### F4 minor (fixed): "die leer van stappe" reads as "the doctrine of steps"
- Documents: `core/you-are-the-business`, heading "The escalation ladder"; `start/what-has-changed`, Change 4, "Added"
- English: "The escalation ladder"; "the escalation ladder for an unpaid invoice"
- Afrikaans: "Die leer van stappe"; "die leer van stappe vir ’n onbetaalde faktuur"
- What is wrong: `leer` is both "ladder" and "doctrine, teaching". In a heading with no context, the second reading comes first. The notes give "plain rather than technical" as the reason; I agree with the aim but not the result.
- Fix: "Die invorderingstappe"; "die invorderingstappe vir ’n onbetaalde faktuur". The numbered list under the heading shows that each step is firmer than the last. The heading id stays `the-escalation-ladder`.

### F5 minor (fixed): "handles" as "handvatsels"
- Document: `start/how-this-was-made`, Corrections log, "Ninth pass"
- English: "domain and handles"
- Afrikaans: "domein en handvatsels"
- What is wrong: `handvatsel` is a physical handle. Batch 4 renders social media handles as `gebruikersname` (`00-already-have-your-name`, `01-branding-prompts`), which is also the plain word.
- Fix: "domein en gebruikersname"

### F6 minor (fixed): "handles" as "handvatsels"
- Document: `start/what-has-changed`, Change 1, "What it does", item 3
- English: "domain and handles"
- Afrikaans: "domein en handvatsels"
- Fix: "domein en gebruikersname", as F5.

### F7 minor (fixed): quoted heading does not match batch 1
- Document: `start/what-has-changed`, Change 1, "Changed: signposts pointing at the new file", row 2
- English: "One line under "Choosing the name""
- Afrikaans: "Een reël onder "Kies die naam""
- What is wrong: the row points into `02-register.md`, whose Afrikaans heading (batch 1) is `## Die naam kies`. A reader looking for "Kies die naam" will not find it. The notes asked batch 1 to check this; the check is done here.
- Fix: "Een reël onder "Die naam kies"". Snippet 2 keeps the English "Choosing the name", because it locates a heading in the English Drive document; I agree with that.

### F8 minor (fixed): beneficial ownership phrasing
- Document: `start/how-to-use`, Path 4, "Weeks 1 to 2"
- English: "file beneficial ownership"
- Afrikaans: "dien voordelige eienaarskap (beneficial ownership) in"
- What is wrong: you file the information, not the ownership. The `TERMS-af.json` note for beneficial ownership asks for `inligting oor voordelige eienaarskap`.
- Fix: "dien inligting oor voordelige eienaarskap (beneficial ownership) in"

### F9 nit (fixed): "servicing" as "diens"
- Document: `start/how-to-use`, Path 4, item 10
- English: "before you add tyres, servicing, or anything else"
- Afrikaans: "voordat jy bande, diens of enigiets anders byvoeg"
- What is wrong: `diens` alone is "service" in every sense. For a vehicle dealer, servicing cars is `diensbeurte`.
- Fix: "voordat jy bande, diensbeurte of enigiets anders byvoeg"

### F10 nit (fixed): "plat stelling" is a calque
- Document: `start/how-this-was-made`, Corrections log, "Softened, not corrected"
- English: "could not be verified to a standard worth stating flatly"
- Afrikaans: "nie tot ’n standaard nagegaan kon word wat ’n plat stelling regverdig nie"
- Fix: "… wat ’n stellige bewering regverdig nie". The certainty of the sentence is unchanged.

### F11 nit (fixed): "’n enigste direkteur"
- Documents: `start/how-this-was-made` ("Third pass"); `core/you-are-the-business` ("Pty Ltd paying you a salary", last paragraph; "Pty Ltd: this is the serious one", paragraphs 2 and 4)
- English: "a sole director of a Pty Ltd"; "for a sole director"; "when a sole director dies"; "a sole director and shareholder died"
- Afrikaans: "’n enigste direkteur …" in each place
- What is wrong: `enigste` with the indefinite article is unnatural Afrikaans; the generic definite article is the normal form.
- Fix: "die enigste direkteur van ’n Pty Ltd"; "vir die enigste direkteur"; "Wanneer die enigste direkteur sterf"; "het die enigste direkteur en aandeelhouer gesterf". The meaning is unchanged.

### F12 nit (fixed): "jou self"
- Document: `core/you-are-the-business`, "What both structures still need", paragraph 1
- English: "the thing most likely to actually happen to you"
- Afrikaans: "die ding wat die waarskynlikste met jou self sal gebeur"
- Fix: "met jouself" (AWS: one word).

### F13 nit (fixed): "modest fee" as "redelike fooi"
- Document: `core/you-are-the-business`, escalation list, item 4
- English: "An attorney will write one for a modest fee"
- Afrikaans: "’n Prokureur sal een teen ’n redelike fooi skryf"
- What is wrong: `redelik` is "reasonable"; "modest" is "small". `beskeie` is exact.
- Fix: "teen ’n beskeie fooi"

### F14 nit (fixed): word order makes "debt in the country"
- Document: `core/you-are-the-business`, "Small Claims Court", last paragraph
- English: "the cheapest debt recovery route in the country"
- Afrikaans: "die goedkoopste roete om skuld in die land in te vorder"
- Fix: "die goedkoopste roete in die land om skuld in te vorder"

### F15 nit (fixed): "weerspieël (reflected)" in prose
- Document: `core/you-are-the-business`, "Prevention beats collection", item 5
- English: "Wait for the money to reflect in your balance before you hand anything over."
- Afrikaans: "Wag totdat die geld in jou saldo weerspieël (reflected) voordat jy enigiets oorhandig."
- What is wrong: it follows the TERMS first-use rule, but the TERMS note prefers "die geld is in jou saldo" in prose, and batch 0 (F10 there) made the same change in the invoice template.
- Fix: "Wag totdat die geld in jou saldo is voordat jy enigiets oorhandig." No meaning is lost.
- Note for the orchestrator: `09-working-from-home-and-safety`, `01-vehicle-dealer` and `02-master-checklist` (other batches) still use intransitive `weerspieël`. Under the current TERMS entry that is allowed; I did not touch them.

### F16 nit (fixed): "Die enkele doeltreffendste" is a calque
- Document: `core/you-are-the-business`, "The four fixes", fix 1
- English: "The single most effective fix."
- Afrikaans: "Die enkele doeltreffendste oplossing."
- Fix: "Die heel doeltreffendste oplossing."

## "Everyday English" on an Afrikaans page: decision

**Decision:** on an Afrikaans page, when a sentence describes the language of the text the reader is looking at, say `taal` (`alledaagse taal`, `eenvoudige taal`). When a sentence records what was done to the English source, keep `Engels`.

- `start/how-to-use`, "That line says the same thing in everyday English": the sentence tells the reader what the `In gewone taal:` line on this page does. On `/af/` that line is in Afrikaans, so `alledaagse Engels` would be false. `alledaagse taal` is right. **Agree with the translator; no change.**
- `start/how-this-was-made`, fourth pass, "in everyday English": a record of the readability pass on the English source. `alledaagse Engels` is true and must stay. **Agree; no change.** The quoted labels with the English in brackets are right.
- **What batch 0 should change:** `start/start-here`, paragraph 2, "Written in simple English for readers who do not speak English as a first language …" is rendered `Geskryf in eenvoudige Engels vir lesers wat nie Engels as eerste taal praat nie …`. The first `Engels` describes the text the Afrikaans reader is reading, so under this rule it should become `Geskryf in eenvoudige taal vir lesers wat nie Engels as eerste taal praat nie …`. The second `Engels` says who the toolkit was written for, which is a fact about the source, so it stays. This reverses batch 0 pass 1's "keep it literally" for the first `Engels` only. I did not edit batch 0's file; the orchestrator should apply it in a batch 0 pass or at integration.

## The translator's judgement calls

Section 1, terms not in `TERMS-af.json`:
- `Master of the High Court (Meester van die Hooggeregshof)`, then "die Master": agree. It is the official name with its Afrikaans title, and the first use is in the word table, which is where readers look.
- `Hooggeregshof`, `Government Gazette (Staatskoerant)`, `Government Notice (Goewermentskennisgewing)`, `Department of Transport (Departement van Vervoer)`, `National Consumer Commission (Nasionale Verbruikerskommissie)`, `South African Reserve Bank (Suid-Afrikaanse Reserwebank)`: agree. Each follows the official-names rule; no fact is inside the brackets. `B-BBEE Commission` without a gloss: agree.
- `Letter of Good Standing` with no gloss: agree. An unverified Afrikaans name would be worse than none.
- `Return of Earnings (verdiensteopgawe)` in lower case: agree, for the same reason as batch 0's lower-case glosses.
- `inkomstebeskerming`, `ongeskiktheidsdekking`, `aanmaningsbrief`, `verjaring / verjaar`, `eksekuteur / kurator`, `bestorwe boedel`, `ewigdurende opvolging`, `verweerder`, `regspersoon`: agree. These are the standard legal and insurance terms.
- Escalation ladder `die leer van stappe`: disagree, see F4.
- `eenmansaak-eienaar` for the person, `eenmansaak` for the structure: agree. "A sole proprietor cannot be an employee" is about a person, and `’n eenmansaak kan nie ’n werknemer wees nie` would be false. It is used consistently in all three documents where it occurs. I recommend the orchestrator add it to `TERMS-af.json`.
- `Roete 1–4`, `verfyningsopdrag`, `kritiekopdrag`, `bylae van gebreke`, `motorhandelversekering`: agree.
- `rondte` for a verification pass, `Lys van regstellings` for the corrections log: agree. `logboek` would clash with the vehicle logbook.
- `opdragontwerp (prompt engineering)`: agree.
- `gegote teenoor gekalanderde vinyl`: agree; these are the trade terms. A sign maker's confirmation would still be welcome.
- `Vierde Bylae`: agree. It is part of a reference, not an Act name.
- H1 `Veranderingslys en verskille`: agree. "Redline" means the differences between the two copies, and the file is about exactly that.
- H1 `KI-openbaarmaking` with links using `Hoe dit gemaak is en hoe om dit na te gaan`: agree. English does the same (H1 "AI disclosure", link text from TERMS).
- `Begin hier` as link text to `00-start-here.md`: agree. It translates the English link text "Start here", as everywhere else in the corpus.
- `KLAAR / NEE — moet geplak word / NOG NIE`: agree.

Section 2, judgement calls:
- "everyday English" in `how-to-use`: agree; see the decision above.
- "everyday English" in `how-this-was-made`, fourth pass: agree.
- Who did what in `how-this-was-made`: agree; verified sentence by sentence (see "How I reviewed").
- "well-ranked" → `artikels wat hoog in soekresultate verskyn het`: agree. For web articles, "well-ranked" means search ranking. It is not more certain than the English.
- "a.co.za": agree. It is an English-source typo; pass it to the content owner.
- "the gazetted 2026 filing-season closing dates": agree.
- Drive document and folder names kept in English: agree. They name things that exist only in English.
- The five snippets translated: agree. The style guide says to translate `snippet` fences. Pasting Afrikaans into the English Drive copy is odd, but this page is a record of the work, and the Drive names inside the snippets stay English. Snippet 2's "Choosing the name" stays English for the same reason. The table row needed the batch 1 heading (F7). Line counts match English; the uneven line lengths in snippets 4 and 5 are acceptable.
- "a trade, not a catch" → `’n ruil, nie ’n strik nie`: agree. The meaning (you pay contributions and get cover; it is not a hidden drawback) is kept.
- Small Claims Court first use in the table header, section heading in English only: agree. `’n Eis kan steeds … teen jou maatskappy ingestel word` follows the TERMS pattern for "sue".
- "Whatever number of months you could not work and still pay rent" → `Genoeg om huur te betaal vir die aantal maande wat jy nie sou kan werk nie`: agree. It says the same, more clearly.
- "arguably" → `waarskynlik`: disagree; see F1.
- "the register-or-not conversation": agree with the rendering; the sentence needed its `nie` (F2).

Section 3, modal verbs: I checked every one listed and every "must", "should", "may" and "might" in the four documents. Each is correct: `mag` for permission (section 7(1), "may appear for it", "may abandon the excess", "which court I may use"), `kan` and `dalk` for possibility, `behoort` for "should", `moet` for "must". The reader questions "Should my new line be a separate company?" and "Which free software should I use?" as `Moet …?`: agree. That is the natural Afrikaans question form, and it is a question, not an instruction, so nothing is strengthened.

## Notes for the orchestrator

- Batch 0 `start/start-here`: change the first `eenvoudige Engels` to `eenvoudige taal` (see the decision above).
- `TERMS-af.json`: consider adding `sole proprietor (the person)` → `eenmansaak-eienaar`, and `handles` (social media) → `gebruikersname`.
- English source: "a.co.za" in `02-how-this-was-made.md` is missing a space. This is for the content owner.
