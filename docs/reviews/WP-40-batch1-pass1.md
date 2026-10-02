# WP-40 batch 1: af review, pass 1

- Date: 2 October 2026
- Commit reviewed: `2fe99c1` (all 36 Afrikaans documents; batch 1 was translated in `a5ebe4c`, `feat(af): translate batch 1 (register, tax, selling, vehicles)`)
- Reviewer role: af-reviewer (WP-42)
- Documents: `core/register`, `core/tax-and-sars`, `core/what-you-need-to-sell-things`, `core/vehicles`
- **Verdict: clean.** No blocker or major findings. 8 minor and 7 nit findings; 14 of them are fixed in this pass, in `fix(af): apply batch 1 review pass 1 fixes`.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 8 | 8 |
| nit | 7 | 6 |

## Fidelity check

Before fixes, at `2fe99c1`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below, each document (`--doc core/register`, `core/tax-and-sars`, `core/what-you-need-to-sell-things`, `core/vehicles`) prints `Fidelity af: 1 docs faithful, 0 findings`, and the whole set:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

The fixes change Afrikaans block text, so `src/data/af` for these four documents is now behind the markdown. I did not regenerate it (out of scope for the reviewer); the orchestrator's `pnpm content:build --lang af` at integration picks the changes up.

## How I reviewed

I compared every Afrikaans line with its English partner, sentence by sentence, in all four documents. I checked meaning (added, lost, made more or less certain), modal verbs, `TERMS-af.json` and glossary terms, consistency within the batch, register (`jy`), AWS spelling, link text against the Afrikaans H1 of each target, and placeholder meaning. Every number, rand amount, percentage, date, deadline, form code, Act name and URL is correct, and I found no change to a fact, obligation or deadline. Every `must`, `may`, `should` and `must not` is rendered as the style guide requires (I re-checked the modal list in the notes, section 4, and agree with all of it).

Link text: every link text matches its target's Afrikaans H1, or mirrors English link text that already differs from the English H1 (`Voertuie vir jou besigheid`, `Watter sjabloon om wanneer te gebruik`, `Het jy reeds jou naam? (kortpad)`). Those are faithful and come from batch 0; they are not findings.

## Findings

### F1 minor (fixed): "sodat" turns a reason into a purpose
- Document: `core/register`, "Which one should you choose", "Register a Pty if", item 3
- English: "Your work could cause serious loss or injury, so you want a legal wall between the business and your house"
- Afrikaans: "Jou werk ernstige verlies of besering kan veroorsaak, sodat jy ’n regsmuur tussen die besigheid en jou huis wil hê"
- What is wrong: `sodat` means "in order that", so the sentence says the work causes loss in order that you want a wall. English "so" means "and therefore".
- Fix: "…kan veroorsaak, en jy dus ’n regsmuur tussen die besigheid en jou huis wil hê"

### F2 minor (fixed): "several times the fee" reads as "ask the fee a few times"
- Document: `core/register`, "How to register a company yourself", paragraph 1
- English: "Agents charge several times the CIPC fee for a form …"
- Afrikaans: "Agente vra ’n paar keer die CIPC-fooi vir ’n vorm …"
- Fix: "Agente vra ’n paar keer soveel as die CIPC-fooi vir ’n vorm …"

### F3 minor (fixed): "public officer" is "openbare beampte"
- Document: `core/register`, "How to register a company yourself", list after "two things are easy to miss", item 1
- English: "Confirm the SARS registered representative (the public officer)."
- Afrikaans: "… (die openbare amptenaar, "public officer")."
- What is wrong: the Afrikaans text of the Income Tax Act (section 101) and SARS's Afrikaans material call this person the `openbare beampte`. `openbare amptenaar` reads as any civil servant.
- Fix: "(die openbare beampte, "public officer")". The term table in the notes (section 1) should read `openbare beampte` for later batches.

### F4 nit (fixed): "teen dit" for "be sued on its own"
- Document: `core/register`, "Private company (Pty) Ltd", paragraph 1
- English: "It can own things, sign contracts, and be sued on its own."
- Afrikaans: "Dit kan dinge besit en kontrakte teken, en ’n eis kan op sy eie teen dit ingestel word."
- What is wrong: `teen dit` for a thing is stiff (`daarteen` is the normal form), and `op sy eie` is ambiguous in this word order. The point is that the claim is against the company itself.
- Fix: "… en ’n eis kan teen die maatskappy self ingestel word."

### F5 nit (fixed): "dressed as work"
- Document: `core/register`, "Things you can skip at the start", business plan paragraph
- English: "Writing a 30-page plan for yourself is procrastination dressed as work."
- Afrikaans: "… is uitstel wat soos werk aangetrek is."
- Fix: "… is uitstel wat as werk vermom is."

### F6 minor (fixed): "This is called being …" calqued in a plain-words line
- Document: `core/tax-and-sars`, "Provisional tax", first "In plain words"
- English: "This is called being a provisional taxpayer."
- Afrikaans: "Dit word genoem om ’n voorlopige belastingbetaler te wees."
- What is wrong: word-for-word English structure; it does not read as Afrikaans, in the one line that must be simplest.
- Fix: "Iemand wat dit moet doen, word ’n voorlopige belastingbetaler genoem."

### F7 minor (fixed): "Rekenkundige" means arithmetical
- Document: `core/tax-and-sars`, "Route 2: claim every real expense", list item 7
- English: "Accounting and legal fees"
- Afrikaans: "Rekenkundige en regsfooie"
- What is wrong: `rekenkundig` is "arithmetical" (`rekenkunde`); accounting is `rekeningkundig`. The same document uses `rekeningkundige sagteware` correctly.
- Fix: "Rekenmeesters- en regsfooie" (matches `rekenmeestersfooi` later in the document).

### F8 nit (fixed): "single most common" calque
- Document: `core/tax-and-sars`, "What SARS wants from a company", paragraph 3
- English: "This is the single most common way small owners build up debt to the state …"
- Afrikaans: "Dit is die enkele mees algemene manier waarop …"
- Fix: "Dit is die algemeenste manier waarop …"

### F9 nit (fixed): "BTW" without "(VAT)" in the word table
- Document: `core/tax-and-sars`, "Words used in this file", row VAT
- English: "VAT"
- Afrikaans: "BTW"
- What is wrong: every other row in this table gives the English in brackets, readers meet "VAT" on SARS forms, and the glossary headword is `BTW (VAT)`.
- Fix: "BTW (VAT)"

### F10 nit (fixed): "kleinhandel en diens van kos"
- Document: `core/what-you-need-to-sell-things`, "The general rule", paragraph 5
- English: "food retail and food service"
- Afrikaans: "kleinhandel en diens van kos"
- What is wrong: reads as "retail, and service of food"; the food applies to both.
- Fix: "kleinhandel in kos en kosdienste"

### F11 minor (fixed): "import duty" is a duty, not a tax
- Document: `core/what-you-need-to-sell-things`, "If you import anything", paragraph 2
- English: "You will pay import duty plus 15% VAT on the landed value at the border …"
- Afrikaans: "Jy sal invoerbelasting plus 15% BTW …"
- What is wrong: customs duty is `invoerreg` (`doeanereg`); `invoerbelasting` blurs it with the VAT in the same sentence.
- Fix: "Jy sal invoerreg plus 15% BTW …"

### F12 minor (fixed): "fail" narrowed to "break"
- Document: `core/what-you-need-to-sell-things`, "Rules that apply to everyone selling anything", paragraph 3
- English: "If goods fail within six months, the customer can generally demand a repair, replacement, or refund …"
- Afrikaans: "As goedere binne ses maande breek, …"
- What is wrong: the implied warranty covers goods that turn out defective or stop working, not only goods that break. `breek` narrows the customer's right as the reader will understand it.
- Fix: "As goedere binne ses maande faal, …"

### F13 nit (fixed): "gereed is dat"
- Document: `core/what-you-need-to-sell-things`, "If you sell beauty or body treatments", paragraph 3
- English: "… unless you are prepared for it to be classified as a medicine."
- Afrikaans: "… tensy jy gereed is dat dit as ’n medisyne geklassifiseer word."
- Fix: "… tensy jy daarop voorbereid is dat dit as ’n medisyne geklassifiseer word."

### F14 minor (fixed): "brandmerk" for branding a vehicle
- Document: `core/vehicles`, "Other things to check", paragraph 3
- English: "Branding your vehicle."
- Afrikaans: "Om jou voertuig te brandmerk."
- What is wrong: `brandmerk` first means to brand with a hot iron, or to stigmatise. TERMS uses `handelsmerk` for brand, and the paragraph is about signage.
- Fix: "Jou handelsmerk op jou voertuig."

### F15 nit (not fixed): "Dormante maatskappy"
- Document: `core/register` ("A dormant company …") and `core/tax-and-sars` (twice)
- English: "dormant company"
- Afrikaans: "dormante maatskappy"
- What is wrong: correct and understood, but `slapende maatskappy` is the more common Afrikaans accounting term. It is used consistently, so I left it.
- Fix: none here. The orchestrator may add `dormant company` to `TERMS-af.json`; batch 2 (`running-a-pty-ltd`) will meet it too.

## The translator's judgement calls

Section 3 of `docs/reviews/WP-40-batch1-notes.md`:

- **Trading-name example "Thabo se Loodgieterswerk".** Agree. It is an illustration of a trading name, not a fact, and an Afrikaans reader is better served by a name in their own language. The possessive `se` form is correct.
- **`jounaam.co.za`.** Agree. `yourname` is a placeholder, not a literal address, so translating it keeps its meaning. The fidelity check does not treat it as code that must stay verbatim.
- **"(Recognition Level 4)" dropped.** Agree; no meaning was lost. `B-BBEE-erkenningsvlak 4` is a full, literal rendering of "B-BBEE Recognition Level 4": the level, the number and the fact that it is automatic are all there. The bracket would only have helped the reader to recognise the English term, and the English the reader actually meets on the EME affidavit and on verification certificates is "Level 4 contributor" / "B-BBEE status level", not "Recognition Level". So the dropped bracket does not cost the reader a word they need. The style guide only asks for the English in brackets where readers will meet it on forms, so no fix is needed. If the orchestrator still wants the English, `B-BBEE-erkenningsvlak (Recognition Level) 4` keeps one `4` and passes the check.
- **"be sued on its own".** Agree with the split of the verb list and the TERMS rendering `’n eis instel`. I tightened the wording (F4).
- **Quoted SARS wording** (`"plaaslike besigheidsinkomste" ("local business income")`, `"omhein" ("ring-fence")`, `"ja" ("yes")`, `"Belastingfaktuur" ("Tax Invoice")`). Agree. This is the quoted-wording rule, and the English in brackets is what the reader sees on eFiling. Giving only the English label would break the rule.
- **"a sole trader" → "die eienaar van ’n eenmansaak".** Agree. It is exact, and TERMS has no separate term.
- **"capped in rands" → "met ’n perk in rand".** Agree.
- **The calendar paragraph between list items.** Agree; the shape is the English shape, and the fidelity check accepts it.
- **"hy of sy" for the customer at checkout, "hulle" elsewhere.** Agree. Both are correct Afrikaans and each follows the English sentence. A single style across the guide would be nicer; that is for the style guide, not this batch.
- **`"geen terugbetalings nie" ("no refunds")`.** Agree; quoted-wording rule.
- **"R638 Regulation 10" → "regulasie 10 van R638".** Agree.
- **"ECTA section 43 information" → "die inligting van artikel 43 van ECTA".** Agree; it is a little loose, but the link to section 43 is kept and the next sentence spells out what it requires.
- **Vehicles H1 `Voertuie en jou besigheid` against link text `Voertuie vir jou besigheid`.** Agree. Both follow the English, which has the same mismatch. That is an English-source issue for the content owner.
- **"one-man business" → `eenmansaak`.** Agree; the TERMS term.
- **"non-legal person" → "’n party/organisasie wat nie ’n regspersoon is nie".** Agree; it matches the batch 0 TRN glossary entry.

Section 1, new terms: I agree with all of them except `openbare amptenaar` for "public officer", which should be `openbare beampte` (F3). Notes on two others, no change needed: `persoonlikediensverskaffer` is a valid AWS compound of a word group, and `invoerderskode` is right; with F11, "import duty" is `invoerreg` and should be added to the list.

Section 2, official names: agree. The descriptive lower-case glosses follow batch 0, and the TERMS official names (`Certificate of Acceptability (Sertifikaat van Aanvaarbaarheid)`, `Small Claims Court (Kleineisehof)`, `Information Regulator (Inligtingsreguleerder)`) are on first use.

Batch 0 term changes: `kosvragmotor` and `Vervaldatum` do not occur in this batch, as the notes say. `vervaldatum` for the COA "expiry" is its normal meaning and is correct.
