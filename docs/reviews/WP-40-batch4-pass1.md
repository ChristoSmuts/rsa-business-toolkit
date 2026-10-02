# WP-40 batch 4: af review, pass 1

- Date: 2 October 2026
- Commit reviewed: `2fe99c1` (tip of `claude/lucid-bell-t5acdn`)
- Reviewer role: af-reviewer (WP-42)
- Documents: `branding/already-have-your-name`, `branding/branding-prompts`, `branding/mood-and-materials`, `branding/brand-applications-and-polish`, `branding/marketing-prompts`
- **Verdict: not clean.** One major finding (fixed in this pass). No blockers. The next pass must review the whole batch again.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 1 | 1 |
| minor | 13 | 13 |
| nit | 30 | 27 |

## Fidelity check

Before fixes, at `2fe99c1`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below, each document on its own (`--doc branding/<id>`) printed `Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.`, and the full run:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

`src/data/**` was not regenerated. The committed `src/data/af` for these five documents now lags the markdown by the wording fixes below; the orchestrator should run `pnpm content:build --lang af` when integrating.

## How I reviewed

I paired every Afrikaans block with its English block and read them sentence by sentence: meaning (added, lost, more or less certain), modal verbs, every prompt as an instruction to an AI tool, `TERMS-af.json` and glossary terms, consistency within the batch, the "jy" register, AWS spelling, link text against the target document's Afrikaans H1, and each judgement call in `WP-40-batch4-notes.md`.

Every number, rand amount, percentage, date, URL, form code (R146), Act name, link target, placeholder and fence line matches the English. The legal content (section 32 of the Companies Act, the CIPC name versus trade mark distinction, "you do not need to register a trade mark in year one", R146 labelling) is translated correctly; no fact, figure, legal rule or deadline is changed. The `example` fence (`MOKOENA MOTORS`) and the `listing` fence (`07 Brand/`) are byte-identical. Every prompt keeps its numbered structure, its "Number them 1 to 5 … weakest … stop" ending and its placeholders, and asks for the same output.

## Decision: "Use simple English" → "Gebruik eenvoudige taal"

Kept as the translator wrote it, in all six places (Prompt 0, Prompt 1 "Plain English a Grade 8 learner can read", Prompt 11, the file-checklist prompt, Marketing Prompt 2; Prompt 6 and Prompt 9 already said "simple language").

Reason: "simple English" carries two instructions, plain register and the reader's language. Chat tools answer in the language of the prompt, so an Afrikaans prompt with `eenvoudige taal` gets plain Afrikaans back, which is what an Afrikaans reader wants. Writing `eenvoudige Afrikaans` would also force Afrikaans onto the customer-facing outputs (tagline, about paragraph, posts, Google Business Profile text), where the language should follow the customers named in the brief ("Languages my customers speak", "CONSTRAINTS"), not the owner's reading language. If a user pastes English material and gets English back, adding "in Afrikaans" is their call.

## Findings

### F1 major (fixed): "a native speaker of each language" became one person who speaks every language natively
- Document: `branding/already-have-your-name`, "Three checks still worth doing", check 3; `branding/branding-prompts`, "What the AI cannot do…" table row 2, and "Before you commit to a name" item 5
- English: "Say the trading name to a native speaker of every language your customers use" / "Ask a native speaker of each language your customers use" / "Say the name to a native speaker of each language your customers use"
- Afrikaans: "Sê die handelsnaam vir iemand wat elke taal wat jou kliënte praat as moedertaal praat" (and the same construction in the other two places)
- What is wrong: the Afrikaans asks for one person whose mother tongue is every one of the customers' languages. That person rarely exists, so the check that protects the reader from a rude or unlucky name reads as impossible. English means one native speaker per language.
- Fix: "Sê die handelsnaam vir ’n moedertaalspreker van elke taal wat jou kliënte praat, en vra …"; table: "’n moedertaalspreker van elke taal wat jou kliënte praat, vra"; item 5: "Sê die naam vir ’n moedertaalspreker van elke taal wat jou kliënte praat, en vra hoe dit klink."

### F2 minor (fixed): "You are not." became "Jy doen nie."
- Document: `branding/already-have-your-name`, intro, paragraph 2
- English: "[Branding prompts] assumes you are starting from nothing. You are not."
- Afrikaans: "… neem aan dat jy van niks af begin. Jy doen nie."
- What is wrong: `Jy doen nie` is a calque of the English ellipsis and does not parse in Afrikaans.
- Fix: "… Jy begin nie van niks af nie."

### F3 minor (fixed): "gevat" for a taken domain or handle
- Document: `branding/already-have-your-name`, check 1 (twice); `branding/branding-prompts`, "Before you commit to a name" closing paragraph, and the worked example option 1
- English: "If they are taken", "with the domain mokoenamotors.co.za taken", "If the domain and the handles are taken", "the domain may be taken"
- Afrikaans: "As dit reeds gevat is", "terwyl die domein mokoenamotors.co.za gevat is", "gevat is", "is dalk gevat"
- What is wrong: `gevat` for "taken" is an anglicism; in Afrikaans `gevat` means grabbed or quick-witted.
- Fix: "As dit nie meer beskikbaar is nie", "reeds in gebruik is" (three places).

### F4 minor (fixed): "delivery notes"
- Document: `branding/already-have-your-name`, "The rule that applies to you because the name is registered"
- English: "invoices, receipts, delivery notes, letters, orders and notices"
- Afrikaans: "fakture, kwitansies, afleweringsbriewe, briewe, …"
- What is wrong: the standard Afrikaans document name is `afleweringsnota`; `afleweringsbrief` reads as a letter, and it sits next to `briewe` in the same list.
- Fix: "afleweringsnotas".

### F5 minor (fixed): "work around" became "waarom" ("why")
- Document: `branding/already-have-your-name`, paragraph after the modified Prompt 2
- English: "A name you cannot change is a constraint the logo has to work around"
- Afrikaans: "’n beperking waarom die logo moet werk"
- What is wrong: `waarom` means "why", so the sentence reads "a constraint why the logo must work".
- Fix: "’n beperking waaromheen die logo moet werk".

### F6 minor (fixed): broken construction "om op mee te ding"
- Document: `branding/branding-prompts`, "Read this before you start…", paragraph 2
- English: "so the only thing left to compete on is price"
- Afrikaans: "so die enigste ding wat oorbly om op mee te ding, is prys."
- Fix: "so die enigste ding waarop jy nog kan meeding, is prys."

### F7 minor (fixed): "Vary" became intransitive "verskil"
- Document: `branding/branding-prompts`, Prompt 6 Path B prompt
- English: "Vary the 5 prompts by construction (…)"
- Afrikaans: "Verskil die 5 opdragte volgens konstruksie (…)"
- What is wrong: `verskil` ("differ") takes no object; the AI is told the prompts differ rather than asked to vary them.
- Fix: "Wissel die 5 opdragte af volgens konstruksie (…)"

### F8 minor (fixed): "talk you into" calqued
- Document: `branding/mood-and-materials`, "The cheap version is usually fine"
- English: "The point of Prompt B is not to talk you into expensive materials."
- Afrikaans: "Opdrag B is nie daar om jou na duur materiale te praat nie."
- Fix: "Opdrag B is nie daar om jou duur materiale aan te praat nie." (the same verb the prompt itself uses: "aangepraat word").

### F9 minor (fixed): "oor druk" means "print over"
- Document: `branding/brand-applications-and-polish`, Part 3, "9. Packaging and labels"
- English: "labelling is regulated under R146 of 2012 and getting it wrong means reprinting"
- Afrikaans: "… en as jy dit verkeerd kry, moet jy oor druk."
- What is wrong: written apart, `oor druk` reads as "print over (it)"; the word for "reprint" is one word.
- Fix: "moet jy herdruk". The R146 rule itself is correct (see N21 for its form).

### F10 minor (fixed): "voertuigtekens" for vehicle signage
- Document: `branding/brand-applications-and-polish`, Part 3 heading "5. Vehicle signage" and Part 6 item 2
- English: "Vehicle signage"
- Afrikaans: "Voertuigtekens"
- What is wrong: `tekens` reads as signs or symbols (road signs, warning signs), not the lettering and graphics on a vehicle. The trade term is `voertuigbelettering`, which also matches "what the vehicle lettering is cut from" (`waaruit die letters op die voertuig gesny is`) in `mood-and-materials`.
- Fix: "Voertuigbelettering" in both places. This replaces the coined term in notes section 1.

### F11 minor (fixed): "eenvormigheid" used for both "consistency" and "sameness"
- Document: `branding/brand-applications-and-polish`, Part 4, "The consistency test"
- English: "**The consistency test.** … Inconsistency is the most common reason …"
- Afrikaans: "**Die eenvormigheidstoets.** … Gebrek aan eenvormigheid is die algemeenste rede …"
- What is wrong: the same batch uses `eenvormigheid` for the bad thing ("the sameness trap", `die strik van eenvormigheid`, in `branding-prompts` Prompt 2) and `konsekwent` / `konsekwentheid` for the good thing everywhere else ("Consistency is worth more than perfection", "plain and consistent", "A consistent ordinary brand"). Here the good thing gets the bad word.
- Fix: "**Die konsekwentheidstoets.**" and "Gebrek aan konsekwentheid …". `eenvormigheid` now means only "sameness" in this batch.

### F12 minor (fixed): "worth paying for" read as "worth prepaying"
- Document: `branding/brand-applications-and-polish`, Part 6, both list labels
- English: "Worth paying for, in this order, when you have money:" / "Not worth paying for in year one:"
- Afrikaans: "Die moeite werd om voor te betaal, …" / "Nie die moeite werd om in die eerste jaar voor te betaal nie:"
- What is wrong: with the preposition stranded, `om voor te betaal` reads as `voorbetaal` (pay in advance).
- Fix: "Dit is die moeite werd om hiervoor te betaal, in hierdie volgorde, wanneer jy geld het:" / "Dit is nie die moeite werd om in die eerste jaar hiervoor te betaal nie:"

### F13 minor (fixed): "only once" became "as soon as"
- Document: `branding/brand-applications-and-polish`, Part 6, item 4
- English: "**A proper photo shoot**, only once you have work worth photographing."
- Afrikaans: "**’n Behoorlike fotosessie**, net sodra jy werk het …"
- What is wrong: `net sodra` reads first as "just as soon as", which loses the "not before" restriction.
- Fix: "… eers wanneer jy werk het wat die moeite werd is om af te neem."

### F14 minor (fixed): "die meeste keer" reads as "most of the time"
- Document: `branding/marketing-prompts`, Prompt 5
- English: "List the 10 questions or worries that most often stop a South African customer from buying from a small, unknown business like mine."
- Afrikaans: "… wat ’n Suid-Afrikaanse kliënt die meeste keer / om by ’n klein, onbekende besigheid soos myne te koop."
- What is wrong: `die meeste keer` is read as the adverb "mostly" before the reader reaches `om … te koop`; the sentence has to be read twice.
- Fix: "… wat ’n Suid-Afrikaanse kliënt die meeste daarvan / weerhou om by ’n klein, onbekende besigheid soos myne te koop." (line break kept)

### N1 nit (fixed): "dit verduidelik nie homself nie"
- Document: `branding/already-have-your-name`, "Do you need a tagline?"
- English: "the name is memorable but not self-explanatory"
- Fix: "maar nie selfverduidelikend nie"

### N2 nit (fixed): "ongemaklik in klein groottes"
- Document: `branding/already-have-your-name`, modified Prompt 2, question 6
- English: "awkward at small sizes"
- Fix: "lomp in klein groottes" (`ongemaklik` is "uncomfortable")

### N3 nit (fixed): "watter handelsmerke reeds … bestaan" in the competitor prompts
- Document: `branding/already-have-your-name`, modified Prompt 2; `branding/branding-prompts`, Prompt 2
- English: "I want to understand what branding already exists in my market"
- Afrikaans: "Ek wil verstaan watter handelsmerke reeds in my mark bestaan in"
- What is wrong: `watter handelsmerke … bestaan` can be read by the AI as a request to list registered trade marks, which it cannot do. The English asks how competitors look.
- Fix: "Ek wil verstaan hoe die handelsmerke in my mark reeds lyk in" (line break kept)

### N4 nit (fixed): "Vermy almal."
- Document: `branding/branding-prompts`, "The visual tells"
- Fix: "Vermy hulle almal."

### N5 nit (fixed): "waar gehalte en diens ontmoet"
- Document: `branding/branding-prompts`, "The language tells"
- English: "where quality meets service"
- Fix: "waar gehalte en diens mekaar ontmoet" (`ontmoet` needs an object)

### N6 nit (fixed): attributive "klaar"
- Document: `branding/branding-prompts`, "The test that matters most"; `branding/marketing-prompts`, "Making the images"
- English: "your finished logo", "a finished job"
- Afrikaans: "jou klaar logo", "’n klaar werk"
- Fix: "jou voltooide logo", "’n voltooide werk"

### N7 nit (fixed): "Vir name" and "Gratis vlakke"
- Document: `branding/branding-prompts`, "Which AI tool"
- English: "For naming, …" / "Free tiers are fine for drafts."
- Fix: "Vir naamgewing, …" / "Gratis weergawes is goed genoeg vir konsepte."

### N8 nit (fixed): "wat dit eie maak"
- Document: `branding/branding-prompts`, Prompt 5
- English: "the ONE deliberate modification that makes it ownable"
- Fix: "wat dit joune maak" (`eie` needs an owner)

### N9 nit (fixed): double negative "geen … nêrens"
- Document: `branding/branding-prompts`, Prompt 6 Path B prompt
- English: "No text, no letters, no words anywhere in the image."
- Fix: "Geen teks, geen letters, geen woorde enige plek in die prent nie."

### N10 nit (fixed): "voer" for a social media feed
- Document: `branding/branding-prompts`, after Prompt 8
- English: "a recognisable feed"
- Fix: "’n herkenbare voer (feed)" — readers see "feed" in the apps; `voer` alone first reads as fodder.

### N11 nit (fixed): "kom kuier" for "visit"
- Document: `branding/branding-prompts`, Prompt 10 rules
- English: "Ends with what to do next (message, call, visit)"
- Fix: "(stuur ’n boodskap, bel, besoek)" — `kuier` is a social visit, odd as a call to action for a business.

### N12 nit (fixed): "klein bussies" for small vans
- Document: `branding/branding-prompts`, worked example, Prompt 0 answer 1 and the brief's OFFER line
- English: "used bakkies and small vans"
- Fix: "klein bestelwaens" — `bussie` suggests a minibus taxi or a Kombi, not a work van.

### N13 nit (fixed): "Blunt" as "Reguit"
- Document: `branding/branding-prompts`, worked example, option 3
- English: "Blunt."
- Afrikaans: "Reguit."
- Fix: "Padlangs." — the brief already uses `Reguit` for "Straight" (TONE), so the two English words collapsed into one.

### N14 nit (fixed): "kopers wat eerste Engels praat"
- Document: `branding/branding-prompts`, worked example, option 4
- English: "less clear to English-first buyers"
- Fix: "kopers wie se eerste taal Engels is"

### N15 nit (fixed): "ruwe werkswinkel-logo"
- Document: `branding/mood-and-materials`, "Why this step exists"
- English: "a rugged workshop logo"
- Fix: "’n stoere werkswinkellogo" (`ruwe` is "crude"; the compound needs no hyphen)

### N16 nit (fixed): "oor pas en verskil"
- Document: `branding/mood-and-materials`, end of the colour research section
- English: "ask about fit and difference"
- Fix: "vra die opdragte hieronder hoe goed iets pas en hoe dit verskil" (`pas` as a bare noun reads as "pass")

### N17 nit (fixed): "soos ’n ontwerper dit sou opdra"
- Document: `branding/mood-and-materials`, Prompt A
- English: "as a designer would brief it"
- Fix: "soos ’n ontwerper dit in ’n kortbeskrywing sou uiteensit" (`opdra` means assign or dedicate; `kortbeskrywing` is the batch's word for "brief")

### N18 nit (fixed): "saamgestel" for "curated"
- Document: `branding/mood-and-materials`, Prompt A rules
- Fix: "gekureer" — the banned word the AI would actually write in Afrikaans.

### N19 nit (fixed): "drieuur"
- Document: `branding/brand-applications-and-polish`, intro
- Fix: "drie-uur" (AWS: hyphen at the vowel clash, as in `twee-uur`). The translator's choice of words over "3am" is fine.

### N20 nit (fixed): "growwe ontwerp" for "chunky design"
- Document: `branding/brand-applications-and-polish`, Part 2, Embroidery
- Fix: "’n eenvoudige, stewige ontwerp in een kleur" (`grof` is "coarse" or "rude")

### N21 nit (fixed): "R146 of 2012" in Afrikaans prose
- Document: `branding/brand-applications-and-polish`, Part 3, item 9
- Afrikaans: "kragtens R146 of 2012"
- Fix: "kragtens R146 van 2012", as `core/what-you-need-to-sell-things` (batch 1) writes it. The code R146 and the year are unchanged; only Act names keep the English "of".

### N22 nit (fixed): "my waarskynlik sal verdien"
- Document: `branding/brand-applications-and-polish`, "Prompt: plan your applications"
- English: "how much each one is likely to earn me"
- Fix: "hoeveel elkeen / vir my waarskynlik sal verdien" (line break kept; matches Part 3's "vir jou verdien")

### N23 nit (fixed): "watter dele ek dalk sukkel om te besit"
- Document: `branding/brand-applications-and-polish`, Part 5 critique prompt, question 8
- Fix: "watter dele ek dalk sal sukkel om te besit" (`dalk` for "may" kept, as the notes say)

### N24 nit (fixed): word order in "Branded merchandise of any kind"
- Document: `branding/brand-applications-and-polish`, Part 6
- Afrikaans: "Handelsware met jou handelsmerk van enige soort"
- Fix: "Enige soort handelsware met jou handelsmerk" (the original reads as "your brand of any kind")

### N25 nit (fixed): "faktor in of jy"
- Document: `branding/marketing-prompts`, "1. Google Business Profile"
- Fix: "die grootste enkele faktor wat bepaal of jy …"

### N26 nit (fixed): "wat die leser sê"
- Document: `branding/marketing-prompts`, Prompt 2
- English: "One line telling the reader what to do next"
- Fix: "Een reël wat vir die leser sê wat om volgende te doen"

### N27 nit (fixed): "Gewone plasings" for organic posts
- Document: `branding/marketing-prompts`, "What to ignore in your first year"
- Fix: "Onbetaalde plasings" — the paragraph contrasts paid and unpaid; `gewone` does not carry that.

### N28 nit (not fixed): "Nie duime nie" for "Not likes"
- Document: `branding/marketing-prompts`, "The one metric that matters"
- What is wrong: understandable, but `duime` (thumbs) is not how the apps or most users say it; `duimpies` or `laaiks` are the everyday forms. A style preference, so I left the translator's choice.

### N29 nit (not fixed, for the content owner): language facts kept as "Engels" inside Afrikaans prompts
- Document: `branding/branding-prompts`, Prompt 9 rules; `branding/marketing-prompts`, Prompt 3
- English: "My customers are not all first-language English speakers." / "once in English and once in a warmer, less formal tone"
- Afrikaans: "Nie al my kliënte praat Engels as eerste taal nie." / "een keer in Engels en een keer in ’n warmer, minder formele toon"
- What is wrong: nothing in the translation; it is faithful and I agree with keeping it (see the notes, section 2). But an Afrikaans user who pastes Prompt 3 unchanged gets one English version and one warmer version, which is probably not what they want, and the English itself contrasts a language with a tone. The owner may want the English to say "once in my main customer language" or similar; the Afrikaans would then follow.

### N30 nit (not fixed, English source): link text "Which template to use when" against the H1 "Documents and templates"
- Document: `branding/already-have-your-name` and `branding/brand-applications-and-polish`
- English: "[Which template to use when](…/01-which-template-to-use-when.md)"; the target's English H1 is "Documents and templates"
- Afrikaans: "[Watter sjabloon om wanneer te gebruik](…)"; the target's Afrikaans H1 is "Dokumente en sjablone"
- What is wrong: the link text translates the English link text faithfully, and every other Afrikaans document uses the same text, so it is consistent. The mismatch with the H1 exists in English too. Every other link in the batch matches its target: `Handelsmerkopdragte`, `Handelsmerktoepassings en afronding`, `Gratis gereedskap`, `Registreer: wat jy regtig nodig het`, `Woordelys`, and the shortened forms `Bemarkingsopdragte`, `Nuwe besigheidslyne byvoeg`, `Kosbesigheid`, `Het jy reeds jou naam? (kortpad)` and `Stemming en materiale (gebruik ná Opdrag 4)` mirror shortened English link text.

## The translator's judgement calls

Section 1, terms not in `TERMS-af.json`:
- `kortbeskrywing` / `handelsmerk-kortbeskrywing` (brief): agree. It follows batch 0, and `opdrag` is taken by "prompt".
- `slagspreuk` (tagline): agree. It is the standard word and reads naturally in "Het jy ’n slagspreuk nodig?".
- `woordmerk` (wordmark): agree. Batch 3 (`start/how-this-was-made`) uses it too.
- `beeldmerk` (mark): agree, for the reason given; bare `merk` would blur with `handelsmerk`.
- `logo-opstelling` (lockup): agree. `samestelling` is taken, and the glossary-table definition makes the meaning clear.
- `lettertipe` / `font`: agree. "Net lettertipe" for "type only" is a little stiff, but clear with the table and Path A heading.
- `hekskode`: agree.
- `verfyningsopdrag`: agree; it matches `start/how-to-use`.
- `die opdrag teen alledaagsheid`: agree; it reads better than any literal form.
- `visuele wêreld` (visual territory): agree. It is used consistently in Prompt A, the add-on line and the checklist.
- `Roete A` / `Roete B`: agree.
- `gebruikersname` (handles): agree.
- `uithangborde` / `uithangbordmaker`: agree.
- `voertuigtekens` (vehicle signage): disagree, replaced by `voertuigbelettering` (F10).
- `gegote` / `gekalanderde viniel` with the English on first use: agree.
- `afloop` (bleed) with the English in the quoted request: agree; it is the print-trade term and follows the quoted-wording rule.
- `omgekeer` (reversed), `vrye ruimte` (clear space): agree.
- `inhoudspilaar`: agree.
- `hutsmerk` / `onderskrif`: agree; `hutsmerk` is the established Afrikaans word.
- `vinnige antwoorde (Quick Replies)`: agree.
- Consistency: disagree with the split. `konsekwentheid` now throughout; `eenvormigheid` only for "sameness" (F11).

Section 2, prompts:
- `eenvoudige taal`: agree; see the decision above.
- Language facts kept as English says them: agree, with a note for the owner (N29).
- Banned-word lists translated into the Afrikaans buzzwords: agree. An Afrikaans prompt gets Afrikaans output, so those are the words that need banning. I changed one (`gekureer`, N18).
- Brief headings in Afrikaans capitals: agree. The later prompts paste the brief back in, so the headings only need to be consistent, and they are.
- Worked example names and domains unchanged, `Afrikaans vir "work bakkie"`: agree. The gloss is the point of the line.
- Placeholder case pattern: agree; it mirrors English and passes `placeholder-case`.

Section 3, kept faithful:
- `05-branding-prompts.md` in Marketing Prompt 1: agree to keep it. English-source issue: the brief comes from `01-branding-prompts.md`. For the content owner.
- Listing "The one-page guide from Prompt 10": agree; the fence must stay byte-identical. English-source issue (the brand guide is Prompt 11). For the content owner.
- "A suggested.co.za domain" → `’n Voorgestelde .co.za-domein`: agree.
- `yourname.co.za` in code: agree.
- `Path > Trace Bitmap` in English: agree; it is the menu path users will see in most installs.
- "3am" → words: agree; spelling fixed (N19).
- "a few hundred to low thousands of rand" → `’n paar honderd rand tot in die lae duisende`: agree; same meaning.
- "by the thousand" → `by die duisend`: agree.
- "Zone 3 UV climate" → `’n UV-klimaat van sone 3`: agree.

Section 4, modal verbs: I checked every one. "You may end up trading as", "the domain may be taken", "fault may read as negative", "parts I may struggle to own" use `kan` / `dalk` (possibility), correctly. "must" is `moet` throughout. "Most one-person businesses should stop after item 6" is `behoort … op te hou`, correctly. `moet` for "should" inside requests to the AI ("the 8 photos I should take first", "the categories I should choose", "which three … I should answer publicly", "the brand applications I should make"): agree. These ask the AI for a recommendation, they are not obligations stated by the guide, and `moet` is the natural Afrikaans in a request. "You do not need to register a trade mark in year one" → `Jy hoef nie … te registreer nie` and "You do need to know" → `Jy moet wel weet`: correct.
