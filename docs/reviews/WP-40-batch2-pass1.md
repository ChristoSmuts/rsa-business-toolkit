# WP-40 batch 2: af review, pass 1

- Date: 2 October 2026
- Commit reviewed: `2fe99c1` (tip of `claude/lucid-bell-t5acdn`, all 36 Afrikaans documents and the regenerated `src/data`)
- Reviewer role: af-reviewer (WP-42)
- Documents: `core/running-a-pty-ltd`, `core/paying-yourself`, `core/adding-new-lines`, `core/working-from-home-and-safety`
- **Verdict: clean.** No blocker or major findings. 11 minor and 16 nit findings; 24 of them are fixed in this pass.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 11 | 11 |
| nit | 16 | 13 |

## Fidelity check

Before fixes, at `2fe99c1`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below, each document on its own (`--doc core/running-a-pty-ltd`, `core/paying-yourself`, `core/adding-new-lines`, `core/working-from-home-and-safety`):

```
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.
```

and the whole corpus:

```
$ pnpm content:fidelity --lang af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

The fixes change Afrikaans markdown only. `src/data/af` was not regenerated in this pass; the orchestrator's `pnpm content:build --lang af` at integration picks the fixes up.

## How I reviewed

I compared every Afrikaans block with its English partner, sentence by sentence. I read the tax, dividend, loan-account, deregistration and directors'-duties paragraphs twice (`paying-yourself` options 1 to 3 and "Fixing a debit loan account"; `running-a-pty-ltd` financial statements, "What happens if you stop filing", "When the company does not protect you", COIDA; `adding-new-lines` turnover tax and SBC). I checked modal verbs, `TERMS-af.json` terms, consistency with the glossary and within the batch, register (`jy`), spelling, link text against the target H1, and placeholder meaning.

Every fact, figure, obligation and deadline matches English: R175, R100 to R3,000 and R150 to R4,000, 30 business days, 1 July 2024, PIS thresholds 100 / 349 / 350, R99,000, 20%, 27%, 7.75% from 1 December 2025, 1 March 2017, s7B, s64E(4), ss22, 76, 77, 218(2), s32, s80, s80(1), seven days, 30 days, 12 to 18 months, R50,000 / R3,000 November 2024, 86% / 74% / R1.888 miljard. "must" is `moet`, "may" is `mag`, `kan` or `dalk` as the meaning needs, "should" is `behoort`. I found no blocker or major.

## Findings

### F1 minor (fixed): "after registration with SARS" reading
- Document: `core/running-a-pty-ltd`, "5. Registered representative and company details", paragraph 1
- English: "Confirm the registered representative (the public officer) with SARS after registration."
- Afrikaans: "Bevestig die geregistreerde verteenwoordiger (…) ná registrasie by SARS."
- What is wrong: the word order makes it read "after registration with SARS". English means: confirm with SARS, after the company is registered.
- Fix: "Bevestig ná registrasie die geregistreerde verteenwoordiger (registered representative, die "public officer") by SARS."

### F2 minor (fixed): "settling" annual returns became "paying" them
- Document: `core/running-a-pty-ltd`, "What happens if you stop filing", paragraph after "Om dit terug te kry:" (CoR 40.5)
- English: "… and settling all outstanding annual returns and fees."
- Afrikaans: "… en alle uitstaande jaarlikse opgawes en fooie te betaal."
- What is wrong: you do not "pay" a return; the filing part of "settle" is lost.
- Fix: "… en alle uitstaande jaarlikse opgawes en fooie af te handel."

### F3 minor (fixed): official name order for the Master of the High Court
- Document: `core/running-a-pty-ltd`, "What happens if you are not there", paragraph 2
- English: "The Master of the High Court must appoint an executor …"
- Afrikaans: "Die Meester van die Hooggeregshof (Master of the High Court) moet …"
- What is wrong: the style guide's official-names rule puts the English name first with the official Afrikaans name in brackets, as the same document does for "Compensation Fund (Vergoedingsfonds)".
- Fix: "Die Master of the High Court (Meester van die Hooggeregshof) moet …"

### F4 minor (fixed): "lok" is an anglicism for "attracts"
- Document: `core/paying-yourself`, "When salary makes sense", paragraph 1
- English: "… the first R99,000 of your total taxable income attracts no tax if you are under 65."
- Afrikaans: "… geen belasting lok nie as jy jonger as 65 is."
- Fix: "… die eerste R99,000 van jou totale belasbare inkomste belastingvry is as jy jonger as 65 is." Same fact, plain Afrikaans.

### F5 minor (fixed): "hou by" does not mean "keep track of"
- Document: `core/paying-yourself`, "Debit loan account: you owe the company", paragraph 3
- English: "If a director does not carefully keep track of what is recorded against their loan account …"
- Afrikaans: "As ’n direkteur nie noukeurig hou by wat …"
- What is wrong: `hou by` means "keep up with" or "stick to"; the sentence does not say what English says.
- Fix: "As ’n direkteur nie noukeurig rekord hou van wat teen sy of haar leningsrekening aangeteken word nie, …"

### F6 minor (fixed): MOI missing after "akte van oprigting"
- Document: `core/adding-new-lines`, "Can one company trade in more than one thing", paragraph 1
- English: "… with the standard Memorandum of Incorporation has unrestricted objects."
- Afrikaans: "… met die standaard-akte van oprigting geregistreer is, …"
- What is wrong: `TERMS-af.json` (Memorandum of Incorporation) says always to write MOI with `akte van oprigting`, because the Afrikaans term also names the pre-2011 memorandum of association.
- Fix: "… met die standaard-akte van oprigting (MOI) geregistreer is, …"

### F7 minor (fixed): "weerspieël word" in prose
- Document: `core/working-from-home-and-safety`, "The one rule", paragraph 2
- English: "… until the funds reflect in your account balance, not "pending"."
- Afrikaans: "… totdat die geld in jou rekeningsaldo weerspieël word (reflected), nie "hangend" nie."
- What is wrong: the passive `weerspieël word` is the calque batch 0 removed (batch 0 F10). The rest of this document uses `weerspieël` intransitively ("voordat die geld weerspieël").
- Fix: "… totdat die geld in jou rekeningsaldo weerspieël (reflected), nie "hangend" nie."

### F8 minor (fixed): relative clause without "aan wie"
- Document: `core/working-from-home-and-safety`, "Why this rule exists", paragraph 2
- English: "Gumtree South Africa described a seller who was sent a fake proof of payment …"
- Afrikaans: "… ’n verkoper beskryf wat ’n vals betalingsbewys gestuur is, …"
- What is wrong: as written the seller is the thing that was sent.
- Fix: "… ’n verkoper beskryf aan wie ’n vals betalingsbewys gestuur is, …"

### F9 minor (fixed): official name order for the Reserve Bank (translator's note)
- Document: `core/working-from-home-and-safety`, "If you take cash", paragraph 2
- English: "The South African Reserve Bank teaches a three-step check."
- Afrikaans: "Die Suid-Afrikaanse Reserwebank (South African Reserve Bank) leer …"
- What is wrong: a proper name follows the official-names rule (English first, official Afrikaans in brackets); the style guide says this rule wins when it seems to conflict with the common-term rule. `Reserwebank` in `TERMS-af.json` is the short common reference, as in the glossary's "Die Reserwebank se toets".
- Fix: "Die South African Reserve Bank (Suid-Afrikaanse Reserwebank) leer …"

### F10 minor (fixed): "is gelukkig dat" anglicism (translator's note)
- Document: `core/working-from-home-and-safety`, "Choose the place", last paragraph
- English: "Many stations are happy for people to meet in the visitor parking."
- Afrikaans: "Baie stasies is gelukkig dat mense in die besoekersparkering ontmoet."
- Fix: "Baie stasies laat mense graag in die besoekersparkering ontmoet."

### F11 minor (fixed): "rugsteunplan" is a computer backup
- Document: `core/working-from-home-and-safety`, "Before you go", "Trust the feeling"
- English: "Have a back-up plan."
- Afrikaans: "Hê ’n rugsteunplan."
- Fix: "Hou ’n uitwykplan gereed."

### F12 nit (fixed): "reaction to the grey list" instead of "to the grey listing"
- Document: `core/running-a-pty-ltd`, "2. Beneficial ownership filing", paragraph 1
- English: "… South Africa's response to the FATF grey listing."
- Afrikaans: "… Suid-Afrika se reaksie op die FATF se grys lys."
- Fix: "… Suid-Afrika se reaksie op sy plasing op die FATF se grys lys."

### F13 nit (fixed): "keer" for "prevent"
- Document: `core/running-a-pty-ltd`, "What happens if you stop filing", last paragraph
- English: "Two calendar reminders prevent all of this."
- Afrikaans: "Twee herinneringe in jou kalender keer dit alles."
- Fix: "… voorkom dit alles."

### F14 nit (fixed): "knowing misconduct"
- Document: `core/running-a-pty-ltd`, "When the company does not protect you", paragraph after "Reckless or negligent trading"
- English: "… not against knowing misconduct."
- Afrikaans: "… nie teen wangedrag waarvan jy weet nie."
- What is wrong: "misconduct you know about" is not "misconduct you commit knowingly".
- Fix: "… nie teen wangedrag wat jy wetend pleeg nie."

### F15 nit (fixed): code joined to an adjective (translator's note)
- Document: `core/running-a-pty-ltd`, "Your Pty Ltd annual checklist", item 7
- English: "Two IRP6 provisional returns filed"
- Afrikaans: "Twee IRP6-voorlopige opgawes ingedien"
- What is wrong: the hyphen joins the code to the adjective, not to the noun.
- Fix: "Twee voorlopige IRP6-opgawes ingedien"

### F16 nit (fixed): "worth knowing about" became "you must know"
- Document: `core/paying-yourself`, "Debit loan account", bold lead of the discrepancy paragraph
- English: "A discrepancy worth knowing about."
- Afrikaans: "’n Teenstrydigheid wat jy moet ken."
- Fix: "’n Teenstrydigheid wat die moeite werd is om van te weet."

### F17 nit (fixed): "hef op jouself rente" (translator's note)
- Document: `core/paying-yourself`, "Fixing a debit loan account", "In gewone taal"
- English: "… or charge yourself interest at the official rate …"
- Afrikaans: "… of hef op jouself rente teen die amptelike koers …"
- Fix: "… of hef rente op jou lening teen die amptelike koers …"

### F18 nit (fixed): elliptical last sentence
- Document: `core/adding-new-lines`, "When splitting is still worth it", paragraph 1
- English: "A vehicle dealer adding tyre fitment usually is not."
- Afrikaans: "… is gewoonlik nie."
- Fix: "… is gewoonlik nie so ’n geval nie."

### F19 nit (fixed): "universal" became "general"
- Document: `core/adding-new-lines`, "What the law requires either way", paragraph after the example
- English: "The universal practice is the "trading as" disclosure above …"
- Afrikaans: "Die algemene praktyk …"
- Fix: "Die universele praktyk …"

### F20 nit (fixed): "worth arguing about"
- Document: `core/working-from-home-and-safety`, Part 2, "Keep the records"
- English: "… for any sale worth arguing about."
- Afrikaans: "… vir enige verkoping waaroor daar ’n argument kan kom."
- Fix: "… vir enige verkoping wat groot genoeg is om oor te stry."

### F21 nit (fixed): "die spel opstoot"
- Document: `core/working-from-home-and-safety`, "Why this rule exists", paragraph 2
- English: "… as scammers up the ante."
- Afrikaans: "… namate swendelaars die spel opstoot."
- Fix: "… namate swendelaars die spel opskerp."

### F22 nit (fixed): "praat jou om om"
- Document: `core/working-from-home-and-safety`, scams table, row 4
- English: "Social engineering. They talk you into approving a payment yourself."
- Afrikaans: "Hulle praat jou om om self ’n betaling goed te keur."
- Fix: "Hulle haal jou oor om self ’n betaling goed te keur."

### F23 nit (fixed): missing article
- Document: `core/working-from-home-and-safety`, "If you take cash", paragraph 5
- English: "By law counterfeit money cannot be exchanged for real money."
- Afrikaans: "Volgens wet kan vals geld …"
- Fix: "Volgens die wet kan vals geld …" (as batch 0 F13)

### F24 nit (fixed): "worth worrying about" became "must worry about"
- Document: `core/working-from-home-and-safety`, "If you take cash", last paragraph
- English: "For any amount worth worrying about, …"
- Afrikaans: "Vir enige bedrag waaroor jy jou moet bekommer, …"
- Fix: "Vir enige bedrag wat groot genoeg is om jou te bekommer, …"

### F25 nit (not fixed): "within 30 business days of" became "after"
- Document: `core/running-a-pty-ltd`, "1. CIPC annual return", paragraph 2, and the checklist item
- English: "within 30 business days of their registration anniversary"
- Afrikaans: "binne 30 werksdae ná die herdenkingsdatum van hulle registrasie"
- What is wrong: nothing of substance. `ná` is more explicit than "of", but it is what CIPC's rule says (the return is due within 30 business days after the anniversary date) and how SA readers take the English. No deadline changed.
- Fix: none.

### F26 nit (not fixed): link text is not the target H1 (English source)
- Document: `core/working-from-home-and-safety`, Part 2 "Keep the records" and Part 4 (twice); `core/running-a-pty-ltd` and `core/paying-yourself` are fine
- English: link text "Which template to use when" (target H1 "Documents and templates"), "Vehicle dealer" (target H1 "Business type: buying and selling vehicles")
- Afrikaans: "Watter sjabloon om wanneer te gebruik" (target H1 `Dokumente en sjablone`), "Voertuighandelaar" (target H1 `Besigheidstipe: voertuie koop en verkoop`)
- What is wrong: the Afrikaans translates the English link text faithfully, and every other batch does the same. The mismatch is in the English source.
- Fix: none here. Pass to the content owner; if the English link text changes, the Afrikaans follows.

### F27 nit (not fixed): Afrikaans first for "National Commissioner"
- Document: `core/adding-new-lines`, intro list, SAPS item
- Afrikaans: "die Nasionale Kommissaris (National Commissioner)"
- What is wrong: strictly, the official-names rule would put the English first. It is an office title, not an institution, and the Afrikaans reads naturally; I left it.
- Fix: none required.

## The translator's judgement calls

Section 1, titles:
- All four H1s are faithful. I agree with translating `working-from-home-and-safety`'s H1 faithfully; batch 0's link text `Tuiswerk en veilige ontmoetings` translates the shorter English link label, which differs in English too. Whether the H1 should match the link text is an English-source decision, not a translation one.
- Cross-references use the current Afrikaans titles: `Registreer: wat jy regtig nodig het`, `Belasting en SARS`, `Woordelys`, `Jy is die besigheid`, `Bestuur van ’n Pty Ltd`, `Betaal jouself uit ’n Pty Ltd`, `Bronne- en verifikasieregister`, `Handelsmerkopdragte`. `Nuwe besigheidslyne byvoeg`, `Bemarkingsopdragte`, `Watter sjabloon om wanneer te gebruik` and `Voertuighandelaar` translate shorter English link labels; see F26.

Section 2, terms: I agree with all of them, with two exceptions on name order: Master of the High Court (F3) and South African Reserve Bank (F9). Notes on some:
- `herdenkingsdatum van die registrasie`, `werksdae`, `goeie status`, `laste aan derde partye` (liabilities on a balance sheet are `laste`, as TERMS says): agree.
- `regspersoon` for "juristic person": agree; it is the same concept as "legal person".
- `Vergoedingsfonds`: agree; it is the name COIDA's Afrikaans text uses.
- `dividend in natura (dividend in specie)`, `jaar van aanslag`, `byvoordeel`, `Vierde Bylae`, `Paragraaf 11C`: agree; these are the Income Tax Act's Afrikaans terms.
- `prysgegewe rente`: agree.
- `leningsrekening in krediet / in debiet`: agree; clear and consistent with the glossary.
- `omhein (ring-fence)` as the verb, `omheining van verliese` kept for s20A: agree.
- `toep`, `banktoep`, `uitvissing (phishing)`, `sosiale manipulasie`: agree.
- `Kits-EFT / RTC (instant EFT)`: agree; English uses "Instant EFT" here, not the glossary's "immediate payment".
- `"veilige ruilsone" ("safe exchange zone")`: agree; quoted wording rule.

Section 3, meaning:
- Quoted wording with placeholders (`"vir en namens [Maatskappynaam] (Pty) Ltd" ("for and on behalf of")`, `"’n handelsnaam van [Geregistreerde Naam] (Pty) Ltd, Reg. No. [nommer]" ("a trading name of")`): agree. The placeholder count and case are unchanged, and the meaning of each placeholder is the same.
- Sole proprietor as a person (`die eienaar van ’n eenmansaak`): agree. A plain `’n eenmansaak` would say the business form is "not an employee" or "barred from contributing", which is less exact.
- "AR-deregistered" as `weens die jaarlikse opgawe (AR) gederegistreer`: agree. It explains, adds no fact, and matches the CIPC status name kept in English.
- "Two IRP6 provisional returns filed": disagree with the word order; see F15.
- Cohen NO v Segal split into three sentences: agree. Every fact is kept (1970, Witwatersrand Local Division, two directors, sale proceeds, purported dividend, profits not capital, beyond the company's powers). `kwansuis` is right for "purported".
- "should no longer be used" → `behoort nie meer gebruik te word nie`: agree. It follows the modal rule; the preceding sentence already says the paragraph was repealed.
- "raise interest income on the loan balance" → `hef rente-inkomste op die leningsaldo`: agree for the main text. I changed the plain-words line (F17).
- "breaks the zoning rules" → `oortree`: agree.
- PayShap and RTC "cannot be reversed" kept absolute: agree.
- SOUTH AFRICAN RESERVE BANK in English capitals: agree; it is the printed wording.
- "Fake proof of payment" → `Vals betalingsbewyse`, "proof of purchase" → `aankoopbewys`: agree.
- "Many stations are happy …": agree with the translator's own doubt; fixed (F10).
- Reflected / cleared / pending in brackets on first use: agree. I removed the passive `word` from the first use of `weerspieël` (F7).

Section 4, modal verbs: I checked all of them and agree with each, including `geld UIF en SDL dalk nie` (possibility, not prohibition), `geen aandeelhouer mag … hou nie` (prohibition), `mag oor die algemeen net uit wins verklaar word` (legal permission) and `kan persoonlik aanspreeklik gehou word` for "may face personal exposure". "must" is `moet` throughout, including "must be registered" and "must submit a Return of Earnings" for COIDA.
