# WP-40 batch 4: translator notes

Batch 4: `branding/already-have-your-name`, `branding/branding-prompts`, `branding/mood-and-materials`, `branding/brand-applications-and-polish`, `branding/marketing-prompts`. Base commit `4c20b2b`.

All five documents print 0 fidelity findings. Every fenced block has the same number of lines as the English (checked with a script). The `example` fence (`MOKOENA MOTORS`) and the `listing` fence (`07 Brand/`) are byte-identical to the English (checked with `diff`). I found no suspected false positives. The coordinator's update (food truck → `kosvragmotor`, due date → `Vervaldatum`) does not apply: neither term appears in this batch.

These notes are for the human reviewer. Where they differ from `STYLE-GUIDE-af.md` or `TERMS-af.json`, the guide and the term list win.

## 1. Terms not in TERMS-af.json

Document titles follow batch 0 (`Handelsmerkopdragte`, `Bemarkingsopdragte`, `Stemming en materiale (gebruik ná Opdrag 4)`, `Handelsmerktoepassings en afronding`, `Het jy reeds jou naam? (kortpad)`, `Kosbesigheid`, `Nuwe besigheidslyne byvoeg`, `Registreer: wat jy regtig nodig het`, `Watter sjabloon om wanneer te gebruik`, `Gratis gereedskap`).

| English | Afrikaans used | Why |
| --- | --- | --- |
| brief / brand brief | kortbeskrywing / handelsmerk-kortbeskrywing | Batch 0 `kortbeskrywing`. Placeholder `[PLAK JOU HANDELSMERK-KORTBESKRYWING]` |
| tagline | slagspreuk | |
| wordmark | woordmerk | |
| mark (logo symbol), pictorial mark | beeldmerk | Not `merk`, which readers may take as "brand" next to `handelsmerk` |
| lockup | logo-opstelling | `samestelling` is taken by "compilation" in TERMS |
| typeface / font; type (as in "colours and type") | lettertipe / font; lettertipe | Batch 0 used `lettertipe` for "type" |
| hex code | hekskode | |
| refine prompt | verfyningsopdrag | Batch 3 (`start/how-to-use`) has the same prompt and should match |
| de-generic prompt | die opdrag teen alledaagsheid | A descriptive name; "ont-generiese opdrag" reads badly |
| visual territory | visuele wêreld | |
| Path A / Path B | Roete A / Roete B | |
| handles (social media) | gebruikersname | |
| signage / sign maker | uithangborde / uithangbordmaker | |
| vehicle signage | voertuigtekens | |
| cast / calendered vinyl | gegote / gekalanderde viniel | English in brackets on first use |
| bleed | afloop | English in brackets on first use and in the quoted request "3mm afloop" ("3mm bleed") |
| reversed (logo) | omgekeer | |
| clear space | vrye ruimte | |
| content pillar | inhoudspilaar | |
| hashtag / caption | hutsmerk / onderskrif | |
| Quick Replies (WhatsApp) | vinnige antwoorde (Quick Replies) | The WhatsApp feature name in brackets |
| consistency / inconsistency | konsekwentheid; eenvormigheid in "the consistency test" | Reviewer may want one word throughout |

## 2. Prompts: language choices

- **"Use simple English" / "Plain English a Grade 8 learner can read" / "Simple English" in prompts** became `Gebruik eenvoudige taal` / `Eenvoudige taal wat ’n graad 8-leerder kan lees`. The prompts are now in Afrikaans, so the AI will answer in Afrikaans; "simple English" would make it switch language. `eenvoudige taal` keeps the instruction (plain wording) without choosing a language for the user. **Reviewer: confirm, or change to `eenvoudige Afrikaans`.**
- **Facts about language stay as English says them.** Prompt 9 "My customers are not all first-language English speakers" → `Nie al my kliënte praat Engels as eerste taal nie`. Marketing Prompt 3 "once in English and once in a warmer, less formal tone" → `een keer in Engels en een keer in ’n warmer, minder formele toon`. An Afrikaans user may prefer `in Afrikaans` here; I did not change it because that changes the instruction.
- **Banned-word lists** in prompts and the "language tells" section are translated into the Afrikaans buzzwords the AI would produce in Afrikaans (`bemagtig`, `verhef`, `ontsluit`, `herdefinieer`, `naatloos`, `innoverend`, `oplossings`, `pasgemaak`, `reis`, …). `premium` stays. "Quality. Service. Trust." → "Gehalte. Diens. Vertroue."
- **Brief headings** in Prompt 0 and the worked example became `AANBOD`, `TEIKENMARK`, `VERSKIL`, `TOON`, `KENMERKENDE DETAIL`, `BEPERKINGS`. Prompt 11 headings are in Afrikaans capitals too (`WIE ONS IS`, …). CMYK, WCAG AA and the Google Fonts names are unchanged.
- **Worked example.** The business names (`Van Wyk Bakkies`, `Clipboard Motors`, `Fault List Bakkies`, `Werksbakkie`, `Paarl Diesel Yard`) and domains stay. The explanations are translated. "Afrikaans for "work bakkie"" stays as `Afrikaans vir "work bakkie"`, which reads oddly in Afrikaans but keeps the point for English buyers.
- **Placeholders** keep the English case pattern: `[PLAK hekskodes, nadat ek die kontras nagegaan het]`, `[PLAK of skryf "geen"]`, `[Opsioneel]`, `[sê waarvan jy hou, in jou eie woorde]`.

## 3. Things kept faithful that a reviewer may want to raise with the owner

- **`branding/marketing-prompts` Prompt 1, `[PASTE YOUR BRAND BRIEF FROM 05-branding-prompts.md]`.** The file name is out of date in English (the brief is from `01-branding-prompts.md`). I kept `05-branding-prompts.md` inside the translated placeholder.
- **`branding/brand-applications-and-polish` Part 7 listing, "The one-page guide from Prompt 10".** The brand guide comes from Prompt 11. The listing must stay byte-identical, so it is unchanged.
- **`branding/branding-prompts` Prompt 3, "A suggested.co.za domain".** Missing space in English. I wrote `’n Voorgestelde .co.za-domein`.
- **`yourname.co.za`** in inline code stays in English.
- **`Path > Trace Bitmap`** stays as the English Inkscape menu path; Afrikaans Inkscape menus may differ.
- **"3am"** became `om drieuur in die oggend`. The check counts `3` in Afrikaans but not in "3am", so a digit gave a `number` finding.
- **"a few hundred to low thousands of rand"** became `’n paar honderd rand tot in die lae duisende`. `’n paar duisend` triggers a `multiplier` finding, because the English "thousands" is not counted. The meaning is the same.
- **"cannot be generated by the thousand"** became `by die duisend` (the check needs `duisend`).
- **"Zone 3 UV climate"** became `’n UV-klimaat van sone 3`.

## 4. Modal verbs checked

- "You may end up trading as" → `Jy kan dalk uiteindelik … handel dryf` (possibility).
- "the domain may be taken", "fault may read as negative", "parts I may struggle to own" → `dalk` / `kan` (possibility).
- "you must do yourself", "must still carry", "Must be true" → `moet`.
- "Most one-person businesses should stop after item 6" → `behoort … op te hou`.
- Inside prompts, where the user asks the AI for a recommendation ("which three of these I should answer publicly", "the 8 photos I should take first", "the brand applications I should make", "the categories I should choose"), "should" became `moet`, which reads naturally in a request. `behoort` would also work; the reviewer may prefer it for strict consistency with the style guide.
- "You do not need to register a trade mark in year one" → `Jy hoef nie … te registreer nie`; "You do need to know" → `Jy moet wel weet`.
