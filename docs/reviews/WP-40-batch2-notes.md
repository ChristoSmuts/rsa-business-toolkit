# WP-40 batch 2: translator notes

Batch 2: `core/running-a-pty-ltd`, `core/paying-yourself`, `core/adding-new-lines`, `core/working-from-home-and-safety`. Base commit `4c20b2b`.

All four documents print 0 fidelity findings. I found no suspected false positives, so nothing went into `TRANSLATION-NOTES.md`.

These notes are for the human reviewer. Where they differ from `STYLE-GUIDE-af.md` or `TERMS-af.json`, the guide and the term list win.

The coordinator's later term changes ("food truck" → `kosvragmotor`, invoice "due date" → `Vervaldatum`) do not occur in this batch.

## 1. Document titles (H1)

| English H1 | Afrikaans H1 | Note |
| --- | --- | --- |
| Running a Pty Ltd | Bestuur van ’n Pty Ltd | Same as batch 0 link text |
| Paying yourself from a Pty Ltd | Betaal jouself uit ’n Pty Ltd | Same as batch 0 |
| Adding new lines of business to your Pty | Nuwe besigheidslyne by jou Pty voeg | Batch 0 link text is `Nuwe besigheidslyne byvoeg`, which translates the shorter link label. The H1 keeps "to your Pty" |
| Running it from home, and meeting customers safely | Bestuur dit van die huis af, en ontmoet kliënte veilig | Batch 0 link text is `Tuiswerk en veilige ontmoetings`, which translates the shorter link label "Working from home and meeting safely". I translated the H1 faithfully. **The orchestrator may prefer to make the H1 match the link text** |

Links to other documents use the batch 0 titles: Registreer: wat jy regtig nodig het, Belasting en SARS, Woordelys, Jy is die besigheid, Handelsmerkopdragte, Bemarkingsopdragte, Watter sjabloon om wanneer te gebruik, Voertuighandelaar, Bronne- en verifikasieregister.

## 2. Terms not in TERMS-af.json

| English | Afrikaans used | Where |
| --- | --- | --- |
| dormant company | dormante maatskappy | pty-ltd |
| registration anniversary | herdenkingsdatum van die registrasie | pty-ltd |
| business days | werksdae | pty-ltd, checklist |
| good standing | goeie status | pty-ltd |
| third-party liabilities | laste aan derde partye | pty-ltd |
| juristic person | regspersoon | pty-ltd (same word as "legal person") |
| Financial Accountability Supplement | kept in English, `(aanvulling oor finansiële verantwoordbaarheid)` on first use | pty-ltd; same gloss as the glossary FAS entry |
| registered representative (public officer) | geregistreerde verteenwoordiger (registered representative, die "public officer") | pty-ltd |
| CIPC status names "AR Deregistration Process", "Final Deregistration" | kept in English, in quotes | pty-ltd; these are status labels on the CIPC system |
| Central Supplier Database | kept in English, `(sentrale verskafferdatabasis)` | pty-ltd; same gloss as the glossary CSD entry |
| personal surety / surety | persoonlike borgstelling / borg | pty-ltd, new-lines |
| securities register / beneficial interest register | effekteregister / register van voordelige belange | pty-ltd |
| share certificate | aandelesertifikaat | pty-ltd |
| perpetual succession | ewigdurende opvolging | pty-ltd |
| deceased estate / executor | bestorwe boedel / eksekuteur | pty-ltd |
| Master of the High Court | Meester van die Hooggeregshof (Master of the High Court) | pty-ltd. I treated the Afrikaans as the official name |
| Compensation Fund | Compensation Fund (Vergoedingsfonds) | pty-ltd. Afrikaans treated as the official name; I could not check it online |
| Return of Earnings / Letter of Good Standing | kept in English with a lower-case gloss: (opgawe van verdienste) / (brief van goeie status) | pty-ltd |
| tax clearance | belastingklaring | pty-ltd |
| Fourth Schedule / Paragraph 11C | Vierde Bylae / Paragraaf 11C | paying-yourself |
| dividend in specie | dividend in natura (dividend in specie) | paying-yourself |
| year of assessment | jaar van aanslag | paying-yourself |
| fringe benefit | byvoordeel | paying-yourself |
| foregone interest | prysgegewe rente | paying-yourself |
| director's fees | direkteursfooie | paying-yourself |
| credit / debit loan account | leningsrekening in krediet / in debiet | paying-yourself |
| Comprehensive Guide to Dividends Tax | kept in English, `(omvattende gids oor dividendbelasting)` | paying-yourself |
| Witwatersrand Local Division, Cohen NO v Segal, The Tax Faculty | kept in English | paying-yourself |
| unrestricted objects | onbeperkte oogmerke | new-lines |
| National Commissioner (SAPS) | Nasionale Kommissaris (National Commissioner) | new-lines |
| ring-fence (verb, table) | omhein (ring-fence) | new-lines; the noun stays `omheining van verliese` for s20A |
| social handles | sosiale-media-name | new-lines |
| "Line" column; Vehicles, Tyres, Workshop | "Lyn"-kolom; Voertuie, Bande, Werkswinkel | new-lines |
| title deed / sectional title / conduct rules / town planner | titelakte / deeltitel / gedragsreëls / stadsbeplanner | working-from-home |
| app (banking app) | toep, banktoep | working-from-home |
| Real-Time Clearing | Real-Time Clearing (intydse verrekening) | working-from-home |
| Instant EFT | Kits-EFT (instant EFT) | working-from-home |
| social engineering / phishing | sosiale manipulasie / uitvissing (phishing) | working-from-home |
| South African Reserve Bank | Suid-Afrikaanse Reserwebank (South African Reserve Bank) | working-from-home. Here the Afrikaans name comes first, because TERMS has `Reserwebank` as a common term. SARB is kept |
| safe exchange zone | "veilige ruilsone" ("safe exchange zone") | working-from-home |
| tracking company | opsporingsmaatskappy | working-from-home |

## 3. Judgement calls on meaning

- **Quoted wording with placeholders (`pty-ltd`).** "for and on behalf of [Company Name] (Pty) Ltd" became `"vir en namens [Maatskappynaam] (Pty) Ltd" ("for and on behalf of")`. The English in brackets leaves out the placeholder, so the placeholder count stays the same. The same goes for `"’n handelsnaam van [Geregistreerde Naam] (Pty) Ltd, Reg. No. [nommer]" ("a trading name of")`. Placeholders in title case kept title case. "Director" became `"Direkteur" ("Director")`.
- **Sole proprietor as a person.** TERMS gives `eenmansaak`, which names the business form. Where English uses "sole proprietor" for the person ("A sole proprietor … is not an employee", "a sole proprietor is barred from contributing", "cover a sole proprietor cannot buy"), I wrote `’n eenmansaak (sole proprietor) se eienaar` or `die eienaar van ’n eenmansaak`. A reviewer may prefer a plain `’n eenmansaak`.
- **`pty-ltd`, "AR-deregistered companies".** It became `Maatskappye wat weens die jaarlikse opgawe (AR) gederegistreer is`, which explains "AR" as the annual return. AR is not otherwise expanded in the English.
- **`pty-ltd`, "Two IRP6 provisional returns filed".** It became `Twee IRP6-voorlopige opgawes ingedien`.
- **`paying-yourself`, the Cohen NO v Segal paragraph.** One long English sentence became three Afrikaans sentences in the same paragraph. "purported to declare" became `kwansuis … verklaar`.
- **`paying-yourself`, "should no longer be used".** It became `behoort nie meer gebruik te word nie`, following the style guide (should → behoort). The rule was repealed, so this reads softer than the fact. It is faithful to the English.
- **`paying-yourself`, "raise interest income on the loan balance".** It became `hef rente-inkomste op die leningsaldo`; the "In plain words" line is `hef op jouself rente`.
- **`working-from-home`, "the one thing that usually breaks the zoning rules".** It became `die een ding wat gewoonlik die soneringsreëls oortree`.
- **`working-from-home`, "PayShap and Real-Time Clearing … cannot be reversed".** Kept as an absolute statement, as in English.
- **`working-from-home`, "SOUTH AFRICAN RESERVE BANK".** These are the words printed on the note, so they stay in English capitals.
- **`working-from-home`, "Fake proof of payment".** It became `Vals betalingsbewyse`, and "proof of purchase" became `aankoopbewys`.
- **`working-from-home`, "Many stations are happy for people to meet".** It became `Baie stasies is gelukkig dat …`. `is bereid dat` would be more idiomatic. A reviewer may change it.
- **"Reflected / cleared".** English is given in brackets on first use in prose: `weerspieël word (reflected)` and `verreken (cleared)`. "pending" becomes `"hangend" ("pending")`, as in the glossary.

## 4. Modal verbs checked

- "you may have bound yourself personally" → `het jy jouself dalk persoonlik gebind` (possibility).
- "may only require an independent review" → `dalk net ’n onafhanklike oorsig vereis`.
- "Banks … may refuse" → `kan weier`. "Directors may face personal exposure" → `kan persoonlik aanspreeklik gehou word`.
- "A dividend may generally only be declared out of profits" → `mag oor die algemeen net uit wins verklaar word` (permission, legal rule).
- "UIF and SDL may not apply" → `geld UIF en SDL dalk nie` (possibility, not prohibition).
- "no shareholder may hold shares in another company" → `geen aandeelhouer mag … hou nie` (prohibition).
- "It may carry on any lawful business" → `Dit mag enige wettige besigheid bedryf`.
- "Company A may lose SBC status" → `kan … verloor`; "may never qualify" → `kwalifiseer dalk nooit`.
- "you may be able to claim" → `kan jy dalk … eis`; "might not cover you" → `dek jou dalk glad nie`; "they may never come back" → `kom dalk nooit terug nie`.
- "should" → `behoort` throughout ("Nothing here should stop you", "should be stored", "Each trading name should have", "should start here").
