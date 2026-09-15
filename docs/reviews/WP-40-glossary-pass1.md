# WP-40.glossary review, pass 1 (AF-REVIEWER)

- Package: WP-40.glossary, Afrikaans translation of `05 Look it up/01-glossary.md`
- Worktree: `C:\_Projects\Local\bt-wt\af-glossary`, branch `content/af-glossary`, commits `6907d8f` (translation) and `864f2f7` (notes), base `da96cd0`
- Reviewer: AF-REVIEWER (independent of the translator)
- Date: 2026-09-15
- Scope: `docs/rsa-business-toolkit-af/05 Look it up/01-glossary.md` against the English source, `docs/rsa-business-toolkit-af/README.md`, and the terms appended to `scripts/translate/TERMS-af.json`. Reviewed against the orchestrator decisions: English in brackets inside the bold, official names in English, typographic `’n`, and "Hoofkontrolelys".
- Authority note: I had no network access. I could not check SARS or CIPC Afrikaans pages, the AWS or the Pharos dictionaries. Where I name a usage below, it is my professional judgement unless I say otherwise.

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 2 |
| minor | 17 |
| nit | 16 |

The translation is careful and faithful. Every number, amount, percentage, date, form code, section reference and URL matches. The structure matches exactly. The terms match `TERMS-af.json`. There are no blockers. There are two majors:

- **M1:** the sole proprietor entry turns "No registration needed" into "you don't have to register anything".
- **M2:** the translator notes (`README.md` R3 last bullet and R5) and two older `TERMS-af.json` entries tell the next 35 translators to do the opposite of the orchestrator decisions.

Most minors are word choices that give a second, wrong reading in Afrikaans ("wettige naam", "voorraad bestuur", "voorraad afneem", "Dit besluit"), plus the straight apostrophe.

## 1. Mechanical checks

Script: `scratchpad/af-glossary-review/mech.py` (reads both files).

| Check | Result |
|---|---|
| Lines | 264 / 264 |
| H1, intro, blocks | 132 blocks each, same kind at every position (H1, intro, 7 × H2, 121 entries, `---`, footer) |
| H2 groups | 7 / 7, same order |
| Entries | 121 / 121, same order, same group sizes |
| Em dash separator `** — ` | Present on all 121 entries |
| Abbreviations and proper names in the bold | All kept. I checked every token in each English term that has capitals or digits: SARS, CoR 14.3, RWC / CoR, eNaTIS / NaTIS, RTC, s20A, VAT264, Business Act and the rest. `**VAT**` → `**BTW (VAT)**` as decided |
| Numbers, R amounts, %, form codes, section refs, URLs | **0 mismatches in 121 entries.** The check covered R99,000, R600,000, R10/R50 miljoen, R50,000, R30,000/R20,000, 15%, 20% (×2), 0% (×2), 7.75%, 1 Desember 2025, 1 Maart 2017, 1 Augustus 2026, 2026/2027, 12 maande, 3,500 kg, 7th→7de, 65, 2018/2012, Acts 68 of 2008 and 25 of 2002, s56, s20A, artikel 4, artikel 22, CoR 14.3, CoR 40.5, R638, R962, R146, VAT264, EMP201 and all three URLs |
| Untranslated English sentences | None. The heuristic only flags Act names that stay in English on purpose, and Afrikaans words spelled like English ones ("is", "in", "by", "of") |
| Footer | Present. `---` kept. The line starts with `*Deur KI gegenereer (Claude, Anthropic) op 13 September 2026` and matches the style-guide wording. Both link targets are unchanged |
| `'n` vs `’n` | **105 straight `'n`, 0 typographic `’n`** (minor m1). The generated `src/data/af/glossary.json` has the straight form too, so rebuild it after the fix |
| The translator's fidelity false positives (`may` read as May) | Confirmed. All three are the English verb, and the Afrikaans `mag` is correct |
| `TERMS-af.json` | Valid JSON, 148 terms, no duplicate `en` keys. Where two English terms share an `af` value, that is on purpose (quote/quotation, sole proprietor/-ship, brand/trade mark) |

## 2. Per-entry findings (sorted by severity)

### Major

| # | Term | English | Afrikaans (current) | Issue type | Corrected Afrikaans |
|---|---|---|---|---|---|
| M1 | Sole proprietor | "You, trading as yourself. Not a separate legal person. No registration needed." | "… Nie 'n aparte regspersoon nie. Jy hoef niks te registreer nie." | Meaning changed (made stronger). "Jy hoef niks te registreer nie" means "you do not have to register anything". A sole proprietor must still register for income tax, and may need VAT, UIF or a licence. The style guide forbids making a statement stronger. (A lay reader can misread the short English the same way; see section 4.) | "Jy, wat in jou eie naam handel dryf. Nie ’n aparte regspersoon nie. Geen registrasie nodig nie." |
| M2 | Notes and TERMS entries that other translators will copy | Orchestrator decisions: typographic `’n`; official names of organisations, forms and certificates in English with the official Afrikaans name in brackets; "Master checklist" → "Hoofkontrolelys" | `README.md` R5: "Use the straight apostrophe `'n`". R3 last bullet: the Afrikaans leads for certificates, "`Sertifikaat van Aanvaarbaarheid` in prose". `TERMS-af.json`: `Master checklist → Meesterkontrolelys`, `Certificate of Acceptability → Sertifikaat van Aanvaarbaarheid` (no note) | Inconsistent with the decisions, and will spread to 35 documents | Rewrite R5: "Use `’n` (U+2019) everywhere." Rewrite the R3 last bullet: "Certificate of Acceptability (Sertifikaat van Aanvaarbaarheid) on first use, then the English name." Update TERMS as in section 5. Also change the style-guide glossary example `**Eenmansaak** — …` to `**Eenmansaak (sole proprietor)** — …` |

### Minor

| # | Term | English | Afrikaans (current) | Issue type | Corrected Afrikaans |
|---|---|---|---|---|---|
| m1 | (whole file) | — | 105 × `'n` | Grammar or spelling (apostrophe decision) | Replace every `'n` / `'N` with `’n` / `’N`, then rebuild `src/data/af/*.json` |
| m2 | Beneficial ownership filing | "…naming the real humans behind a company" | "…wat die regte mense agter 'n maatskappy noem" | Unnatural and ambiguous: "die regte mense" first reads as "the right people" | "’n Gratis indiening by CIPC wat die werklike mense agter ’n maatskappy noem. Verpligtend." |
| m3 | PIS | "…that decides whether your company needs an audit…" | "Dit besluit of jou maatskappy…" | Wrong term: `besluit` is the fixed term for "resolution" a few entries later. A score does not make a decision | "Dit bepaal of jou maatskappy ’n oudit, ’n onafhanklike oorsig of nie een van die twee nie nodig het." |
| m4 | Bona vacantia | "Property with no owner, which can pass to the state. What can happen to a deregistered company's assets." | "Eiendom sonder 'n eienaar, wat na die staat kan oorgaan. Dit kan met die bates van 'n gederegistreerde maatskappy gebeur." | Wrong term: `eiendom` makes readers think of land and buildings, but the legal meaning is "goed" or "bates". The second sentence is loose | "Bates sonder ’n eienaar, wat na die staat kan oorgaan. Dit is wat met die bates van ’n gederegistreerde maatskappy kan gebeur." |
| m5 | Registered name | "The company's legal name on its CoR 14.3." | "Die maatskappy se wettige naam…" | Wrong term: `wettig` means "lawful" or "legitimate", not "official" | "Die maatskappy se amptelike naam op sy CoR 14.3. …" (or `regsnaam`) |
| m6 | Trading name | "A name you market under … shown as "trading as"." | "'n Naam waaronder jy bemark … gewys as "handeldrywende as" ("trading as")." | Unnatural: `bemark` needs an object, and "gewys as" is an Anglicism | "’n Naam waaronder jy jou besigheid bemark en wat verskil van die geregistreerde naam. Dit word toegelaat, maar die geregistreerde naam en nommer moet steeds op dokumente verskyn, met die woorde "handeldrywende as" ("trading as")." |
| m7 | ITR12 | "…for individuals, including sole proprietors." | "…vir individue, ook vir eenmansake." | Wrong term: the return is for the person, but `eenmansaak` here reads as the type of business | "Die jaarlikse inkomstebelastingopgawe vir individue, ook eienaars van eenmansake." |
| m8 | EMP201 | "Due by the 7th of the following month." | "Dit moet teen die 7de van die volgende maand in wees." | Meaning narrowed, and the register is too casual. "in wees" only means "handed in", but "due" also covers the PAYE payment | "Dit is teen die 7de van die volgende maand verskuldig." |
| m9 | Deemed remuneration | "An old PAYE rule for private company directors, repealed with effect from 1 March 2017." | "'n Ou PAYE-reël vir direkteure van privaat maatskappye, wat met ingang van 1 Maart 2017 herroep is." | Grammar: `wat` comes straight after "maatskappye", so on a first reading the companies seem to be repealed | "’n Ou PAYE-reël vir direkteure van privaat maatskappye. Dit is met ingang van 1 Maart 2017 herroep." |
| m10 | SBC | "Small Business Corporation." | "Small Business Corporation (klein sakekorporasie)." | Spelling (AWS; my judgement): when a word group is the first part of a compound, you write it as one word, as in `kleinsakeonderneming` and `kleinsakesektor`. The term will spread to every tax document | "Small Business Corporation (kleinsakekorporasie). …" |
| m11 | EME | "Uses a free affidavit instead of a paid certificate." | "Gebruik 'n gratis beëdigde verklaring…" | Grammar: in Afrikaans a sentence that starts with the verb is a command ("Use a free affidavit") | "Dit gebruik ’n gratis beëdigde verklaring in plaas van ’n sertifikaat waarvoor jy betaal." |
| m12 | Information Officer | "Must be registered with the Information Regulator." | "Moet by die Inligtingsreguleerder geregistreer wees." | Grammar: a sentence that starts with the verb reads as a question or a fragment | "Die beampte moet by die Inligtingsreguleerder geregistreer wees." |
| m13 | SAHPRA | "South African Health Products Regulatory Authority." | "(Suid-Afrikaanse Reguleerder van Gesondheidsprodukte)" | Bracket rule and consistency: the capitals make an unverified rendering look like an official name, while the PSIRA, NHBRC and CIDB renderings are lower case. "Authority" became "Reguleerder" | "(Suid-Afrikaanse reguleringsowerheid vir gesondheidsprodukte)" |
| m14 | Motor trade number | "Lets a dealer drive unregistered stock on public roads." | "…om ongeregistreerde voorraad op openbare paaie te bestuur." | Ambiguous: "voorraad bestuur" first reads as "manage stock" | "Dit laat ’n handelaar toe om ongeregistreerde voertuie uit sy voorraad op openbare paaie te ry." |
| m15 | Geotag | "…before photographing stock at home." | "…voordat jy voorraad by die huis afneem." | Ambiguous: "voorraad afneem" reads as "stock decreases", and `afneem` for "photograph" is old-fashioned | "…voordat jy foto’s van voorraad by die huis neem." |
| m16 | Reflected / cleared | "The money is actually in your account balance. "Pending" is not reflected." | "**Weerspieël / verreken (reflected / cleared)** — …" | Unnatural and inconsistent. `weerspieël` without an object copies the English. This file also uses `verreken` for "set off" (ring-fencing), and in everyday speech it also means "miscalculate". The headword works **only because** the English is in brackets | Keep the headword. Add a note in `TERMS-af.json` (section 5). Optional change to the definition: "Die geld is werklik in jou rekeningsaldo. "Hangend" ("pending") is nog nie weerspieël nie." |
| m17 | Headwords: Information Regulator, Small Claims Court | "**Information Regulator**", "**Small Claims Court**" | "**Inligtingsreguleerder (Information Regulator)**", "**Hof vir Klein Eise (Small Claims Court)**" | Two bracket rules give opposite results here. The glossary rule gives Afrikaans (English); the official-names rule gives English (official Afrikaans). The translation follows the glossary rule and the older TERMS entries. **The orchestrator must decide.** The rest of each entry is correct either way | If the official-names rule wins: "**Information Regulator (Inligtingsreguleerder)**" and "**Small Claims Court (Hof vir Klein Eise)**", with TERMS updated to match |

### Nit

| # | Term | Afrikaans (current) | Issue | Suggested |
|---|---|---|---|---|
| n1 | Intro | "Suid-Afrikaanse besigheid is vol afkortings." | "besigheid" as a collective noun is unnatural | "Die Suid-Afrikaanse sakewêreld is vol afkortings." |
| n2 | H2 "Working from home and getting paid" | "Tuiswerk en betaal word" | "tuiswerk" first reads as "homework" (it is an existing TERMS term), and "betaal word" is stiff | Keep it for UI consistency, or use "Werk van die huis af en betaling ontvang" (a TERMS change; not required) |
| n3 | Solvency and liquidity test | "…wat 'n direksie moet slaag…" | `slaag` with a direct object is informal | "…waarin ’n direksie moet slaag voordat dit ’n dividend betaal…" |
| n4 | Trading stock | "Om voorraad te koop, verminder dus…" | Unneeded comma after an infinitive subject | "Om voorraad te koop verminder dus nie op sigself daardie jaar se wins nie." |
| n5 | Deemed dividend | "rentevry, of teen minder as die amptelike koers van SARS … word die verskil" | "teen minder as" is loose, and "die verskil" is vague | "…rentevry, of teen ’n laer koers as SARS se amptelike rentekoers, geld aan ’n aandeelhouer leen, word die rente wat te min is as ’n dividend behandel…" |
| n6 | Official rate of interest | "of 'n lening 'n lae rente het" | Unidiomatic | "of ’n lening teen ’n lae rentekoers is" |
| n7 | Voetstoots | "Afrikaans vir "soos dit staan" (in Engels "as is")." | Circular for an Afrikaans reader | "’n Afrikaanse woord wat "soos dit staan" beteken (in Engels "as is")." |
| n8 | B-BBEE | "breë-gebaseerde" | "breedgebaseerde" is the more usual form (judgement) | "breedgebaseerde swart ekonomiese bemagtiging" |
| n9 | TRN | "Dieselfde, maar vir wie nie 'n regspersoon is nie:" | Stiff | "Dieselfde, maar vir partye wat nie regspersone is nie:" |
| n10 | NCO | "op die dag wat jy verkoop" | Colloquial | "op die dag waarop jy verkoop" |
| n11 | MTN1 | "Aansoek om 'n motorhandelnommer." | The other form entries (ABR, RLV, NCO) keep the English form title and add an Afrikaans rendering. The English here is lower case, so the current text is acceptable | Optional: "Application for a motor trade number (aansoek om ’n motorhandelnommer)." |
| n12 | Immediate payment / RTC | "**Onmiddellike betaling / RTC (immediate payment / RTC)**" | The abbreviation appears again in the bracket | "**Onmiddellike betaling / RTC (immediate payment)**" |
| n13 | Overpayment scam | "Oorbetalingswendelary" | Hard to split when you read it ("oorbetaling-swendelary") | Acceptable as it is. Always add the English in brackets on first use |
| n14 | Proof of payment | "Die bevestiging van die bank wat 'n kliënt vir jou stuur." | `wat` can refer to "bank" | "Die bankbevestiging wat ’n kliënt vir jou stuur." |
| n15 | Small Claims Court | "verhoog van R20,000" | Anglicism; the amount is correct | "…vanaf 1 Augustus 2026. Dit was R20,000." |
| n16 | FICA | "bewys van adres" | Less natural | "adresbewys" |

No finding: the other entries (about 90) are accurate and complete, use the right register and use the TERMS terms. That includes the high-risk entries: VAT and vendor; input, output and notional input tax; VAT264; tax invoice; assessed loss; ring-fencing; turnover tax; which way debit and credit go on the loan account; the rule that only a natural person may claim in the Small Claims Court; the PayShap limits; title holder versus owner; voetstoots; the cooling-off period; and the implied warranty.

## 3. Terminology audit

### The translator's key decisions (README "What the reviewer should check first", plus the items the orchestrator named)

| English | Chosen | Verdict | Reason / authority |
|---|---|---|---|
| vendor (VAT) | ondernemer | **Accept** | The Afrikaans text of the VAT Act 89 of 1991 uses `ondernemer`, and SARS Afrikaans material follows it (confident; not rechecked online). `verkoper` would clash with buyer/seller in VAT264 |
| input / output tax | insetbelasting / uitsetbelasting | **Accept** | The VAT Act's Afrikaans terms |
| notional input tax | nosionele insetbelasting | **Accept** | Established SARS Afrikaans usage (judgement) |
| deemed | geag (geagte vergoeding / dividend) | **Accept** | `geag` is the standard statutory Afrikaans for "deemed" throughout the Income Tax Act |
| assessed loss | vasgestelde verlies | **Accept** | Matches the Afrikaans text of s20 of the Income Tax Act as I know it; I could not check this offline |
| ring-fencing | omheining van verliese | **Accept** | I know of no settled statutory term. This one is descriptive and plain. Always use it with s20A |
| Memorandum of Incorporation | akte van oprigting | **Accept with caveat** | Under the Companies Act 61 of 1973, `akte van oprigting` was the Afrikaans for the *memorandum of association* (the articles were the `statute`). The MOI replaced both, and Afrikaans practice now uses the old term for it, so it is usable. But the README's reason ("Term in the Afrikaans Companies Act") is doubtful: I believe the Companies Act 71 of 2008 has no signed Afrikaans text. Remove that reason. TERMS must require `MOI` next to the term, so that readers with pre-2011 documents do not mix the two up |
| Small Business Corporation | klein sakekorporasie | **Replace with `kleinsakekorporasie`** | AWS compounding rule: a word group that is the first part of a compound is written as one word (compare `kleinsakeonderneming`). I could not check the SARS Afrikaans spelling offline. If the orchestrator finds a SARS Afrikaans source that writes two words, follow that source |
| beneficial ownership (filing) | voordelige eienaarskap; indiening van voordelige eienaarskap | **Accept** | `voordelige eienaar` is the established Afrikaans legal and tax term for "beneficial owner" (Pharos legal usage; judgement). `uiteindelike` translates "*ultimate*" (`uiteindelike voordelige eienaar` = ultimate beneficial owner), so it must not replace `voordelige`. Add the English on first use, because lay readers may read `voordelige` as "advantageous". Optional wording: `indiening oor voordelige eienaarskap` |
| independent review | onafhanklike oorsig | **Accept** | Afrikaans accountants use it for reviews under the Companies Regulations (review engagement = `oorsigopdrag`) |
| limited assurance | beperkte sekerheid | **Accept** | Assurance engagement = `sekerheidsopdrag`. `versekering` would mean insurance |
| legal person | regspersoon | **Accept** | Standard, and matches the UI |
| body corporate | beheerliggaam | **Accept with note** | The Afrikaans sectional-title legislation calls the body corporate `regspersoon`, which clashes with "legal person". `beheerliggaam` is clear. TERMS should mention the statutory word and require "(body corporate)" on first use |
| board | direksie | **Accept** | The most common SA Afrikaans usage in company contexts |
| resolution | besluit | **Accept** | Plain and correct. Do not use `besluit` for the verb "decide" near it (m3) |
| payroll | betaalstaat | **Accept** | Standard |
| Skills Development Levy | vaardigheidsontwikkelingsheffing | **Accept** | The official Afrikaans name as far as I know. Not in TERMS yet (section 5) |
| Pay As You Earn | lopende betaalstelsel | **Accept, add note** | SARS Afrikaans uses `LBS` (Lopende Betaalstelsel). Keep `PAYE` as the term (keepVerbatim), and record LBS in TERMS so translators recognise it. Do not use LBS in the text |
| scam | swendelary | **Accept** | Common in SA Afrikaans media for "scam" |
| reflected / cleared / pending | weerspieël / verreken / hangend | **Accept `hangend`. Accept the other two only with the English in brackets** | See m16. Banks do use `verreken` for clearing (`verrekening`), but lay readers know it as "set off" or "miscalculate" |
| geotag | liggingsmerker | **Accept** | Plain. Always add "(geotag)" on first use |
| customer code | kliëntkode | **Accept** | `kliënt` is SA Afrikaans usage |
| Public Interest Score | openbare-belangtelling | **Accept** | The hyphenation is reasonable. I could not confirm a form used by a professional body offline |
| trading as | handeldrywende as | **Accept** | Common on SA Afrikaans documents. But the style-guide placeholder example says `Handeldryf as 'n naam van`, which is a different form. Make the templates use the TERMS form |
| home enterprise / home occupation; consent use | tuisonderneming / tuisbedrywigheid; vergunningsgebruik | **Accept** | `vergunningsgebruik` is the Afrikaans town-planning term. I could not check the wording of Afrikaans municipal by-laws for the two home categories offline |
| proxy; title holder | gevolmagtigde; titelhouer | **Accept** | Standard legal Afrikaans. I could not check the eNaTIS Afrikaans wording offline |
| Commissioner of Oaths; affidavit | Kommissaris van Ede; beëdigde verklaring | **Accept** | The official title; common usage |
| positive opinion | positiewe mening | **Accept** | Plain. `ouditmening` would also be correct |

### Terms the translator appended to TERMS-af.json (80 entries)

I **accept the other appended entries unchanged**: filing, financial statements, financial year (end), audit, compilation, accountant, deregistered, deregistration, reinstate, solvency and liquidity test, trading stock, stock, at cost, floor plan finance, lender, natural person, income tax (return), levy, employer, employee, reconciliation, remuneration, official rate of interest, micro business, consumer, liability, assets, premises, Environmental Health Practitioner, regulation, Business Act licence, trading licence, zoning certificate, Letter of Authority, owner, HOA, instant payment, immediate payment, overpayment scam, one-time PIN, Reserve Bank, banknote, Look feel tilt, spreadsheet, sue. Section 5 lists the entries that need a change or a note.

## 4. English-source issues (for the orchestrator; the owner's content)

| Entry | Issue | How the Afrikaans handles it | Verdict |
|---|---|---|---|
| FSP | The headword expands to "Financial Services Provider", which is a person or business. The definition calls it "A licence required to sell or advise on financial products" | The Afrikaans follows the English exactly: "(verskaffer van finansiële dienste). 'n Lisensie wat jy nodig het…". The notes record the problem, and nothing was fixed silently | **Handled sensibly.** When the owner fixes the English (e.g. "A business licensed by the FSCA to…"), change the Afrikaans to match |
| Business Act licence | The statute is the Businesses Act 71 of 1991 | Keeps "Business Act-lisensie", and the notes flag it | **Handled sensibly.** If the English becomes "Businesses Act licence", change both the Afrikaans headword and the TERMS entry to `Businesses Act-lisensie` |
| Sole proprietor (new) | A lay reader can take "No registration needed" to mean no registration at all (SARS, VAT, licences). The intended meaning is no company registration | See M1: the Afrikaans made the statement stronger | Suggest the owner writes "No company registration needed". Until then, the Afrikaans must match the English and not go further |

## 5. Changes TERMS-af.json needs before 35 more translators start

| Term | Current | Required | Reason |
|---|---|---|---|
| Master checklist | `Meesterkontrolelys` | `Hoofkontrolelys` | Orchestrator decision |
| Certificate of Acceptability | `Sertifikaat van Aanvaarbaarheid` (no note) | Keep `af`; add note: "The official name stays English: 'Certificate of Acceptability (Sertifikaat van Aanvaarbaarheid)' on first use, then the English name. Keep COA." | Official-names decision. README R3 says the opposite (M2) |
| Information Regulator; Small Claims Court | `Inligtingsreguleerder`; `Hof vir Klein Eise` (no note) | Wait for the orchestrator's ruling on m17. If the official-names rule applies, add the notes "'Information Regulator (Inligtingsreguleerder)' on first use" and "'Small Claims Court (Hof vir Klein Eise)' on first use" | The conflict must be settled before prose documents use these names |
| Small Business Corporation | Missing (only in the README, as `klein sakekorporasie`) | Add `{ "en": "Small Business Corporation", "af": "kleinsakekorporasie", "note": "Keep SBC. First use: 'Small Business Corporation (kleinsakekorporasie)'." }` | AWS one-word compound (m10). The expansion is not in TERMS at all |
| Pay As You Earn | Missing | Add `{ "en": "Pay As You Earn", "af": "lopende betaalstelsel", "note": "Keep PAYE. SARS Afrikaans forms say LBS; do not use LBS in the text." }` | Every payroll document needs it |
| Skills Development Levy | Missing | Add `{ "en": "Skills Development Levy", "af": "vaardigheidsontwikkelingsheffing", "note": "Keep SDL." }` | Every payroll document needs it |
| Memorandum of Incorporation | `akte van oprigting`, note "Keep MOI." | Note: "Always write MOI with it. Under the 1973 Act, 'akte van oprigting' meant the memorandum of association. For pre-2011 documents, say which one you mean." | Prevents confusion (section 3) |
| body corporate | `beheerliggaam`, note "Not 'regspersoon'…" | Add to the note: "The Afrikaans sectional-title legislation says 'regspersoon'. Add '(body corporate)' on first use." | Readers see the statutory word on levy statements |
| reflected; cleared | `weerspieël`; `verreken` | Keep the terms. Add this note to both: "Add the English in brackets on first use. In prose, prefer 'die geld is in jou saldo'. 'verreken' also means 'set off' (ring-fencing)." | m16 |
| beneficial ownership | `voordelige eienaarskap` | Add note: "Add '(beneficial ownership)' on first use. Not 'uiteindelike eienaarskap'." Also change the style-guide example `voordelige eienaarskap-inligting` to `inligting oor voordelige eienaarskap` | Lay readers may read 'voordelige' as 'advantageous'. Translators will copy the example's hyphenated form, which is not an AWS form |
| trading as | `handeldrywende as` | Keep. Fix the style-guide template example `Handeldryf as 'n naam van` so that the templates use the TERMS form | Otherwise two forms spread into the templates |
| filing | `indiening` | Add to the note: "Filing records (keeping papers) = 'liassering' or 'bêre', not 'indiening'." | The record-keeping documents use "filing" in that other sense |
| Business Act licence | `Business Act-lisensie` | No change now. Change it to `Businesses Act-lisensie` if the owner corrects the English | Section 4 |
| Apostrophe in all `af` values and notes | `'n` in the `sue` entry and in the style-guide examples | `’n` | Orchestrator decision. Translators copy TERMS and the style guide word for word |

Also update `docs/rsa-business-toolkit-af/README.md`: R5 (use `’n`), the R3 last bullet (the English official name leads), the MOI row (remove the Companies Act claim) and the SBC row (`kleinsakekorporasie`).
