# WP-40 batch 5: af review, pass 1

- Date: 2 October 2026
- Commit reviewed: `2fe99c1` (tip of `claude/lucid-bell-t5acdn`, with all 36 Afrikaans documents and the regenerated `src/data`)
- Fixes commit: `64c0374` (`fix(af): apply batch 5 review pass 1 fixes`), on top of `2fe99c1`
- Reviewer role: af-reviewer (WP-42)
- Documents: `business-types/vehicle-dealer`, `food`, `beauty`, `retail-online`, `services-trades`, `professional-creative` (not the hub)
- **Verdict: not clean.** 1 major finding (fixed in this pass). No blockers. 11 minor and 12 nit findings; 17 of the 24 findings are fixed in this pass.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 1 | 1 |
| minor | 11 | 10 |
| nit | 12 | 7 |

## Fidelity check

Before the fixes, at `2fe99c1`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes, each document on its own (`--doc business-types/<id>`) and then all of them:

```
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (vehicle-dealer)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (food)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (beauty)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (retail-online)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (services-trades)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (professional-creative)

$ pnpm content:fidelity --lang af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

I did not regenerate `src/data`. The committed `src/data/af` for these six documents is now behind the markdown, so the orchestrator must run `pnpm content:build --lang af` when merging.

## How I reviewed

I compared each Afrikaans block with its English partner, sentence by sentence. The files have the same line count as English, so I read them interleaved line by line. I checked:

- meaning: anything added, lost, or made more or less certain;
- modal verbs (every `mag`, `moet`, `kan`, `behoort`, `hoef nie`);
- terms against `TERMS-af.json`, the translated glossary, the hub, and the other documents in the batch;
- register (`jy`), spelling and anglicisms;
- link text against the Afrikaans H1 of each target;
- checklist items, the four plain-words callouts per section, and the two prompt fences.

Every fact, figure, rand amount, date, deadline, form code, section reference and licence rule matches English. That includes the SAPS 601 and 604 rules, the R102, R762 and R168 trade-number fees, the CPA s56 rules (six months, three-month repeat), the Small Claims Court limit of R30,000, the R200,000 and R400,000 court limits, notional input tax (15/115), the 21-business-day VAT deadline, the 21-day RLV deadline, the 60-day roadworthy rule, ECTA s43 to s46 (14 days, seven days, 30 days), the 20% turnover-tax exclusion and the 3,500 kg rule. Every modal verb matches the notes and the style guide. The one major finding is a wrong word that changes who a document covers.

## Findings

### F1 major (fixed): "handymen" became "handlangers" (labourers' helpers)
- Document: `business-types/services-trades`, intro, paragraph 2
- English: "This covers plumbers, electricians, builders, painters, mechanics, gardeners, cleaners, handymen, couriers, and installers."
- Afrikaans: "… skoonmakers, handlangers, koeriers en installeerders."
- What is wrong: a `handlanger` is a labourer's assistant (or, figuratively, an accomplice), not a self-employed odd-job worker. The list says who the document is for, so a reader who is a handyman does not find himself in it.
- Fix: "… skoonmakers, nutsmanne, koeriers …" (`nutsman`: someone who does all kinds of odd jobs).

### F2 minor (fixed): the photos' age reads as the applicant's age
- Document: `business-types/vehicle-dealer`, "How to register", paragraph 5
- English: "two colour ID photos of the applicant no older than 3 months"
- Afrikaans: "twee kleur-ID-foto’s van die aansoeker wat nie ouer as 3 maande is nie"
- What is wrong: the relative clause attaches to `die aansoeker`, so it reads as "the applicant who is not older than 3 months". The requirement is about the photos.
- Fix: "twee kleur-ID-foto’s van die aansoeker, nie ouer as 3 maande nie,"

### F3 minor (fixed): "uitverkoop" means a clearance sale
- Document: `business-types/vehicle-dealer`, heading "When you sell a vehicle out"
- English: "When you sell a vehicle out"
- Afrikaans: "Wanneer jy ’n voertuig uitverkoop"
- What is wrong: `uitverkoop` means to sell out or hold a clearance sale. English "sell out" here only pairs with "buy in" above it.
- Fix: "Wanneer jy ’n voertuig verkoop"

### F4 minor (fixed): "notice given" became "the knowledge given"
- Document: `business-types/vehicle-dealer`, "Holding deposits", paragraph 2
- English: "What is reasonable takes into account the notice given …"
- Afrikaans: "By wat redelik is, word die kennis wat gegee is in ag geneem …"
- What is wrong: as a noun on its own, `kennis` reads as "knowledge". The legal concept is `kennisgewing`.
- Fix: "… word die kennisgewing wat gegee is in ag geneem …"

### F5 minor (fixed): the same "kennis" problem in the beauty document
- Document: `business-types/beauty`, "Bookings, deposits and no-shows", paragraph 2
- English: "Reasonable depends on how much notice they gave …"
- Afrikaans: "Wat redelik is, hang af van hoeveel kennis hulle gegee het …"
- Fix: "… hang af van hoe lank vooraf hulle jou laat weet het …"

### F6 minor (fixed): "weerspieël" used without a verb, against the TERMS note
- Document: `business-types/vehicle-dealer`, "Dealing from home, with no yard", list item 4
- English: "Full payment reflected in your balance before keys, papers or a signed NCO change hands"
- Afrikaans: "Die volle betaling weerspieël (reflected) in jou saldo voordat …"
- What is wrong: `weerspieël` is transitive, so the line does not parse. `TERMS-af.json` (reflected) prefers "die geld is in jou saldo" in prose, which is also how batch 0 fixed the invoice template (batch 0 F10).
- Fix: "Die volle betaling is in jou saldo (reflected) voordat …"

### F7 minor (fixed): "sonder wat" is ungrammatical
- Document: `business-types/food`, words table row COA and the heading "The one document you cannot trade without"
- English: "The permit you cannot open without." / "The one document you cannot trade without"
- Afrikaans: "Die permit sonder wat jy nie kan oopmaak nie." / "Die een dokument sonder wat jy nie kan handel dryf nie"
- Fix: "Die permit waarsonder jy nie kan oopmaak nie." / "Die een dokument waarsonder jy nie kan handel dryf nie"

### F8 minor (fixed): "geland" missing its inflection
- Document: `business-types/retail-online`, "Importing stock", paragraph 2
- English: "on the landed value … Build it into your landed cost"
- Afrikaans: "op die geland waarde … Bou dit in jou geland koste in"
- What is wrong: an attributive participle takes `-e`.
- Fix: "gelande waarde", "gelande koste"

### F9 minor (fixed): "plektoets" is not an Afrikaans term
- Document: `business-types/beauty`, words table, "Consumer law applies to services too", checklist item 5
- English: "patch test"
- Afrikaans: "plektoets"
- What is wrong: the word does not exist. Afrikaans product instructions and salons say `veltoets` (or `allergietoets`). The translator also suggested it in the notes.
- Fix: "veltoets" in all three places (English kept in brackets in the words table). Note for batch 6: `02-master-checklist.md` line 143 has "pleistertoetse (patch tests)" and should use "veltoetse" too. That file is outside this batch, so I did not touch it.

### F10 minor (fixed): "IP" against "IE"; one form for the batch
- Document: `business-types/professional-creative`, words table and checklist item 3
- English: "IP"
- Afrikaans: "IP"
- What is wrong: the Afrikaans abbreviation is `IE` (intellektuele eiendom), and the master checklist (batch 6, "… IE en betaling dek") already uses it. Two forms for the same item would show up on the same checklist screen.
- Fix: words table "IE (IP) | Intellektuele eiendom (intellectual property). …", and checklist item 3 "… omvang, hersienings, IE en betaling dek". **Decision for the batch: `IE`**, with `(IP)` on the words-table line where readers meet the English abbreviation in contracts.

### F11 minor (fixed): link text does not match the target's Afrikaans title
- Document: `business-types/vehicle-dealer` ("If you trade as a company"), `business-types/services-trades` ("Insurance" and "Vehicles")
- English: "[Vehicles for your business](…/05-vehicles.md)"
- Afrikaans: "[Voertuie vir jou besigheid](…)"
- What is wrong: the target's Afrikaans H1 (batch 1) is "Voertuie en jou besigheid". The reader sees one title in the link and another on the page.
- Fix: "[Voertuie en jou besigheid](…)" in all three links. Note for the orchestrator: the same link text "Voertuie vir jou besigheid" is still in other batches' files (`00 Start here/01-how-to-use-this-toolkit.md`, `01-core-start-here.md`, `02-register.md`, `03-tax-and-sars.md`, `03 Paperwork and templates/01-which-template-to-use-when.md`). Align them in one sweep.

### F12 minor (not fixed, orchestrator): other link texts paraphrase their targets
- Documents: the whole batch
- English link text → target English H1: "Working from home and meeting safely" → "Running it from home, and meeting customers safely"; "Adding new lines of business" → "Adding new lines of business to your Pty"; "Which template to use when" → "Documents and templates"; "Marketing prompts" → "Marketing prompts and assets"; "Retail and online shop" / "Food business" → "Business type: …".
- Afrikaans: "Tuiswerk en veilige ontmoetings", "Nuwe besigheidslyne byvoeg", "Watter sjabloon om wanneer te gebruik", "Bemarkingsopdragte", "Kleinhandel en aanlynwinkel", "Kosbesigheid". Each is a faithful translation of the English link text and the same rendering the rest of the corpus uses.
- What is wrong: the English link texts already differ from their targets' H1s, so the Afrikaans does too. "Watter sjabloon om wanneer te gebruik" → "Dokumente en sjablone" is the most noticeable.
- Fix: none here. Changing only batch 5 would break consistency with batches 0 to 6. The orchestrator should decide corpus-wide whether link texts follow the target H1, and fix the English link texts first if so.

### F13 nit (fixed): "mark-up" became "wins"
- Document: `business-types/vehicle-dealer`, "How notional input tax works", SARS worked example
- English: "the dealer's mark-up of R20,000"
- Afrikaans: "die handelaar se wins van R20,000"
- What is wrong: English uses the trade term here and "profit" only in the plain-words line. `opslag` is the plain Afrikaans word for a mark-up, and it keeps that difference.
- Fix: "die handelaar se opslag van R20,000"

### F14 nit (fixed): Small Claims Court sentence reads as if the court needs a lawyer
- Document: `business-types/vehicle-dealer`, "Where disputes go", paragraph 1
- English: "Below that, the Small Claims Court needs no lawyer."
- Afrikaans: "Onder dit het die Small Claims Court (Kleineisehof) geen prokureur nodig nie."
- Fix: "Daaronder is die Small Claims Court (Kleineisehof), waar jy geen prokureur nodig het nie."

### F15 nit (fixed): "band" is an anglicism
- Document: `business-types/vehicle-dealer`, "Turnover tax is almost certainly wrong for a dealer", paragraph 2
- English: "At 1% on the band above R600,000"
- Afrikaans: "Teen 1% op die band bo R600,000"
- Fix: "Teen 1% op die gedeelte bo R600,000"

### F16 nit (fixed): "wat" as a relative of time
- Documents: `business-types/vehicle-dealer` ("Laat dit teken op dieselfde oomblik wat jy …", "elke keer wat ’n voertuig van eienaar verander"); `business-types/services-trades` ("op die dag wat jy klaarmaak")
- Fix: "oomblik waarop", "elke keer wanneer", "dag waarop"

### F17 nit (fixed): "membership of the industry"
- Document: `business-types/vehicle-dealer`, heading "Voluntary industry membership"
- Afrikaans: "Vrywillige lidmaatskap van die bedryf"
- What is wrong: you cannot be a member of an industry. The paragraph is about the RMI.
- Fix: "Vrywillige lidmaatskap van ’n bedryfsorganisasie"

### F18 nit (fixed): "voorraad op hande" is a calque
- Document: `business-types/retail-online`, "Stock records", paragraph 1
- English: "stock on hand"
- Fix: "voorraad wat jy het"

### F19 nit (fixed): ambiguous relative clause
- Document: `business-types/professional-creative`, "Tax point most freelancers miss", paragraph 1
- English: "one client, who controls your hours and how you work"
- Afrikaans: "een kliënt werk, wat jou ure beheer en hoe jy werk"
- Fix: "een kliënt werk wat jou ure en jou manier van werk beheer"

### F20 nit (not fixed): "Hooggeregshof" for "High Court"
- Document: `business-types/vehicle-dealer`, "Where disputes go", paragraphs 3 and 4
- What is wrong: since the Superior Courts Act (2013) the court is the "Hoë Hof". "Hooggeregshof" is still common in the press, and the rest of the corpus uses it ("Meester van die Hooggeregshof"), so I left it for consistency.
- Fix: none here. The orchestrator may add `High Court` to `TERMS-af.json`.

### F21 nit (not fixed): "op lêer hou"
- Documents: `business-types/beauty` ("Hou die toestemming op lêer"), `business-types/professional-creative` ("hou ’n foto en die berekening op lêer")
- What is wrong: it is a calque of "keep on file". "Bewaar die toestemming" reads better. It is understood, so I did not change it.

### F22 nit (not fixed): "’n klein kleinhandelaar"
- Document: `business-types/retail-online`, "Payments", paragraph 3
- What is wrong: it is a faithful rendering of "a small retailer", but the doubled "klein" sounds clumsy. There is no clean alternative that keeps the meaning, so I left it.

### F23 nit (not fixed): "first fix"
- Document: `business-types/services-trades`, "Deposits and payment", paragraph 2
- Afrikaans: "50% wanneer die eerste installasie voltooi is"
- What is wrong: a reader may take "die eerste installasie" as "the first of several installations" rather than the rough-in stage before walls are closed. It is still clear and enforceable as the example means it, and Afrikaans has no settled term. Leave it unless a trade reviewer offers one.

### F24 nit (not fixed, other batch): patch test in the master checklist
- See F9. `05 Look it up/02-master-checklist.md` "pleistertoetse (patch tests)" should become "veltoetse (patch tests)" in batch 6's next pass.

## The translator's judgement calls

Section 1, H1 titles: **agree**. Each H1 translates its own English H1. I also support the suggestion that the orchestrator adds `title.af` (the hub link texts) to `docs.meta.json`, so the Afrikaans nav does not show the "Besigheidstipe:" prefix where English shows a short title.

Section 2, coordinator terms: **agree**. `kosvragmotor` and `vervaldatum` are applied. `vervaldatum` in its ordinary sense of expiry (food, COA) is correct Afrikaans, and the context makes it clear.

Section 3, new terms:
- **Agree**: gesondheidsinrigting, aanspreeklikheidsversekering vir behandelings, professionele skadeloosstelling, persoon in beheer, voedselhanteerder, omvang / wysiging / vorderingsbetaling, omvangkruip, invoerderskode, terugvordering (chargeback, with English in brackets), tuiskantooraftrekking, persoonlikedienste-verskaffer, hersieningsrondes, gebrekeskedule, vereffeningsbrief, gemenereg, distrikshof / streekhof, mikrokolle (microdots). For Hooggeregshof, see F20.
- **Disagree**: patch test → use `veltoets`, not `plektoets` (F9).
- **Partly agree**: "Voertuie vir jou besigheid" faithfully translates the English link text, but the batch 1 H1 is "Voertuie en jou besigheid" (F11). "Belasting en SARS" matches its H1. The batch 0 link texts are consistent with the corpus (F12).

Section 4, official names: **agree** with every gloss. Each is on first use, carries no facts inside the brackets, and stays in English where readers meet the English name. "Nasionale Kommissaris" without the English is acceptable: it is a title in a sentence, not a name the reader must find on a form.

Section 5, judgement calls on meaning:
- "’n verkoop voetstoots" and "voetstoots-klousules": **agree**. Both are correct Afrikaans. "Verkoop voetstoots" mirrors the common "voetstoots verkoop", and AWS allows a hyphen in a compound for clarity. The natural compounds `voetstootsverkoop` and `voetstootsklousules` would be better, but the check needs `voetstoots` as a separate word, and the hyphenated form reads well. "’n Algemene "voetstoots"-klousule" with quotes is also fine.
- "byna seker verkeerd": **agree**. It has the same certainty as "almost certainly".
- "word boetes opgelê": **agree**. "Carries penalties" states the consequence as certain, and so does the Afrikaans.
- "mark-up" → "wins": **disagree**. Use `opslag` (F13).
- "In gewone woorde:" for "In plain terms:": **agree**. It avoids confusion with the callout label.
- "Jou kontrolelys vir die begin": **agree**. It contains `kontrolelys` as required.
- "eerste installasie" for "first fix": **agree, with reservations** (F23).
- "wanneer dit die kliënt pas": **agree**. It is the plain meaning of "get paid whenever" and does not overstate it.
- "kan … dalk weier": **agree**. "May" here is a possibility.
- "lei tot meer verkope" and the settlement-time paraphrase: **agree**. Both are plain and faithful.
- "IP" kept: **disagree**. Use `IE` for the batch, as in the master checklist (F10).
- "Naledi Mokoena Design" unchanged, `KI-gereedskap`, `wildsoord`, the prompt fences line for line, and "Laat ekseem verdwyn": **agree**.

Section 6, modal verbs: **agree**. I checked every instance listed against the English and found no other modal that drifts. The only "should" is rendered `behoort`. Every "may not" is `mag nie`. Discretion and possibility are `kan` / `kan dalk`.
