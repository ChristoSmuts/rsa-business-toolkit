# Afrikaans translation style guide

This guide is for the agents that translate `docs/rsa-business-toolkit/` into `docs/rsa-business-toolkit-af/`, and for the reviewers who check them. Read it with `scripts/translate/TERMS-af.json`.

This guide and `TERMS-af.json` are the rules. A translator's notes file records decisions for the human reviewer only. It never adds or changes a rule, and where it disagrees with this guide or `TERMS-af.json`, the guide and `TERMS-af.json` win.

## How you work

1. Translate one document at a time. The Afrikaans file has **the same relative path** as the English file, for example `docs/rsa-business-toolkit-af/01 Core - applies to everyone/02-register.md`. Keep the English folder and file names.
2. Run the fidelity check for your document and fix every finding:

   ```
   pnpm content:fidelity --lang af --doc core/register
   ```

3. Repeat until it prints `0 findings`. A finding looks like this:

   ```
   core/register:how-to-register-a-company-yourself.2: rand expected R175 got R17
   ```

   It names the document, the block id (the English heading slug and the block number under it), the rule, what English has and what you wrote. A finding in the glossary names the entry id instead of a block id, for example `lookup/glossary:tax-invoice`. A finding about the footer names `footer`.

4. Run `pnpm translate:status --lang af` to see every document, its status and its open findings.

### Commands

| Command                                                                 | What it does                                                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm content:fidelity --lang af --doc <id>`                            | Checks one document. Prints every finding. Writes nothing                                          |
| `pnpm content:fidelity --lang af`                                       | Checks every Afrikaans document that exists                                                        |
| `pnpm content:fidelity --lang af --doc <id> --source-root af=<folder>`  | Checks markdown in another folder, for example a scratch copy of `docs/rsa-business-toolkit-af`    |
| `pnpm translate:status --lang af [--source-root af=<folder>]`           | Lists every document with its status and number of findings                                        |
| `pnpm content:build --lang af`                                          | Regenerates `src/data` for English and Afrikaans. It fails if any Afrikaans document has a finding |
| `pnpm content:build --lang af --source-root af=<folder> --out <folder>` | Builds from a scratch copy into another folder, without touching `src/data`                        |

`--source-root` takes the language, an equals sign and a folder: `--source-root af=C:/scratch/rsa-business-toolkit-af`. The folder must have the same layout as `docs/rsa-business-toolkit-af`.

`--out` must point at an empty folder, or at one an earlier content build wrote. The build refuses any other folder, because it deletes the generated files it does not produce again.

The `stale` check always reads the committed `src/data/af`, not the folder you build into. So `--out` to a scratch folder still tells you that English changed after you translated a block. It also means the check needs `src/data/af` to be up to date in your checkout: run `git pull` before you trust a clean run.

If a block cannot be translated yet, write a paragraph that contains only `<<TODO>>`. The build fails on it unless someone runs it with `--allow-partial` during roll-out, which shows the English block in its place.

Keep your own notes in `docs/rsa-business-toolkit-af/TRANSLATION-NOTES.md`. The build ignores that file.

## The one rule: same structure, same facts

The Afrikaans file must have **the same blocks in the same order** as the English file. Every heading, paragraph, list, list item, table row, blockquote, fenced block and `---` line has a partner at the same position. Do not merge two paragraphs, split one, add a note or leave something out.

Heading ids are the English slugs in every language, so `#words-used-in-this-file` works on `/af/` too. You translate the heading text; the build keeps the English id.

## Markdown shape the parser depends on

The build reads the markdown shape, not only the words. These changes look harmless but change the structure, and the finding often points at a block further down.

- **A colon before a checklist stays.** A paragraph that ends in `:` directly before a checklist is the checklist's group label. `Before your first purchase:` becomes `Voor jou eerste aankoop:`. Without the colon it becomes a separate paragraph and you get `block-count`.
- **A bold-only line stays a bold-only line.** `**Vehicle dealer** (`04-business-types/01`)` becomes `**Voertuighandelaar** (`04-business-types/01`)`. Do not add text after the bold title, and do not make a whole translated sentence bold. Either change gives `block-kind` or `pseudo-heading`.
- **Blank lines stay where English has them, and only there.** A blank line starts a new block. Two lines without a blank line between them are one block.
- **A line break inside a block stays.** Where English continues a paragraph, a template header or a sources entry on the next line, do the same. Do not wrap long lines and do not join lines. Otherwise you get `line-breaks`.
- **List numbering mirrors English.** Numbered stays numbered, and a list that starts at 3 starts at 3.
- **The steps in `01 Core - applies to everyone/01-core-start-here.md`.** In English, the note under step 2 (` If you will work from home …`) is followed directly by `3. Pick a name`, which markdown reads as one paragraph. The English build inserts a blank line in memory. In Afrikaans, write a blank line before `3.`. If you copy the English shape without the blank line, the build inserts it for you, so both forms give the same structure.

## What the fidelity check enforces

The build fails when any of these differ from English.

| Rule                                                                     | What it checks                                                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `block-count`, `block-kind`                                              | Same number of blocks, same kind at each position                                                                  |
| `heading-depth`, `pseudo-heading`                                        | `##` stays `##`, `###` stays `###`, a bold-only line stays a bold-only line                                        |
| `list-items`, `list-ordered`, `list-start`                               | Same number of list items, numbered stays numbered, a list that starts at 8 still starts at 8                      |
| `task-count`, `task-group`, `table-rows`, `table-columns`, `terms-count` | Same number of checklist items, the checklist label, table rows, table columns and word-table rows                 |
| `line-breaks`                                                            | Same number of line breaks inside each block (template headers, sources entries, list items)                       |
| `callout-label`                                                          | `> **In plain words:**` becomes exactly `> **In gewone taal:**`                                                    |
| `rand`, `percent`, `number`, `multiplier`                                | Every rand amount, percentage and number is byte-identical; `million` becomes `miljoen`                            |
| `date`                                                                   | Same dates; see "Dates" below                                                                                      |
| `form-code`                                                              | Form and regulation codes are unchanged                                                                            |
| `section-ref`                                                            | `s43(2)` stays `s43(2)`; `section 56(2)` becomes `artikel 56(2)`                                                   |
| `keep-verbatim`                                                          | Every protected name in English is still there: Act names, SARS, CIPC, eFiling, official English names, QUO-0001 … |
| `links`, `docrefs`                                                       | Same link targets in the same order; same old-scheme references in backticks                                       |
| `placeholder-count`, `placeholder-case`, `placeholder-nesting`           | Same number of `[BRACKETS]`, ALL CAPS stays ALL CAPS, nested stays nested                                          |
| `code-verbatim`                                                          | Example and listing fences are not changed at all                                                                  |
| `hyphen-lines`                                                           | Template previews keep every `-------` rule line                                                                   |
| `footer-date`                                                            | The footer keeps the English date                                                                                  |
| `glossary-count`                                                         | Same number of glossary entries in each group. Every glossary entry is also checked with all the rules above       |
| `source-url`, `source-official`, `act-appears-in`, `checked-on`          | Sources register: URLs and `[Amptelik]` flags by position, act locations, the check date                           |
| `stale`                                                                  | The English block changed after you translated it: update your block                                               |

## Numbers, amounts and dates

Copy every digit exactly. Do not switch to the Afrikaans decimal comma or a space as thousands separator.

| English                             | Afrikaans                               | Wrong                                  |
| ----------------------------------- | --------------------------------------- | -------------------------------------- |
| `**R2.3 million**`                  | `**R2.3 miljoen**`                      | `R2,3 miljoen`                         |
| `R120,000`                          | `R120,000`                              | `R120 000`                             |
| `15%`, `10.25%`, `0%`               | `15%`, `10.25%`, `0%`                   | `15 persent`                           |
| `from 1 April 2026`                 | `vanaf 1 April 2026`                    | `vanaf 1/4/2026`                       |
| `First IRP6: by 31 August`          | `Eerste IRP6: teen 31 Augustus`         | `teen einde Augustus`                  |
| `28 or 29 February`                 | `28 of 29 Februarie`                    | `die einde van Februarie`              |
| `Each gives you 5 options.`         | `Elkeen gee jou 5 opsies.`              | `vyf opsies`                           |
| `R15,000 and three months on setup` | `R15,000 en drie maande aan opstelling` | (words stay words, digits stay digits) |
| `by the 7th`                        | `teen die 7de`                          | `teen die 7`                           |

### Dates

Month names: Januarie, Februarie, Maart, April, Mei, Junie, Julie, Augustus, September, Oktober, November, Desember. Always with a capital letter.

A month counts as a date only in a date position, in both languages:

- a day before it: `31 Augustus`, `28/29 Februarie`;
- a year after it: `Mei 2026`;
- a date word straight before it: `in Julie`, `teen die einde van Augustus`, `Einde September`, `vanaf`, `sedert`, `tot`, `voor`, `ná`, `gedurende`, `begin van`, `middel van`, `elke`, `volgende`, `verlede`, `hierdie`;
- a range or a list after one of those: `Julie tot Oktober`, `in Maart of April`, `in Februarie en April`.

So keep the month next to its day or year exactly as English does, and use the Afrikaans month name only in those positions.

| English                    | Afrikaans                      | Wrong                             |
| -------------------------- | ------------------------------ | --------------------------------- |
| `the February 2026 Budget` | `die Februarie 2026-begroting` | `die 2026-begroting in Februarie` |
| `End September`            | `Einde September`              | `Laat in die jaar`                |
| `July to October`          | `Julie tot Oktober`            | `van die middel van die jaar`     |

The English verb "may" is never a month, and neither is Afrikaans `mag`. Translate "may" as the meaning requires (see "Faithfulness").

A known limit: a month on its own, with no day, no year and no date word, is not checked at all. `The deadline is May.` translated as `Die sperdatum is Junie.` passes the build. The rule is deliberate, because it is what keeps the verb "may" out of the dates. Keep a bare month faithful yourself; the build cannot catch it for you.

Ordinals are checked by their number, not their spelling: `the 7th` must be `die 7de`, and `1ste`, `2de`, `3de` and `28ste` are all correct Afrikaans for `1st`, `2nd`, `3rd` and `28th`. Change the number and the build fails with `ordinal`.

### Section references

`section 22` becomes `artikel 22` and `sections 79 and 80` becomes `artikels 79 en 80`. A compound keeps the number and a hyphen: "the section 4 test" becomes `die artikel 4-toets`.

## Form codes, Act names and fixed names

Keep these exactly as written: ITR12, ITR14, IRP6, VAT101, VAT264, VAT 420, EMP201, EMP501, SAPS 601, SAPS 604, CoR 14.3, CoR 40.5, R638, R146, R962, MTN1, RC1, RLV, NCO, ABR, SANS 10400-T and the document numbers QUO-0001, INV-0001, REC-0001. The full list is `formCodes` in `TERMS-af.json`.

### Code plurals and possessives

A code keeps its letters and digits; the Afrikaans ending goes after a hyphen or an apostrophe.

| English                 | Afrikaans (accepted)                             | Wrong                 |
| ----------------------- | ------------------------------------------------ | --------------------- |
| `two ITR14s`            | `twee ITR14-opgawes` (preferred), `twee ITR14’s` | `twee ITR14e`         |
| `the ITR14's due date`  | `die ITR14-sperdatum`                            | `die ITR-14-datum`    |
| `the SAPS 601 form`     | `die SAPS 601-vorm`                              | `die SAPS601-vorm`    |
| `the R10,000 threshold` | `die R10,000-drempel`                            | `die R10 000-drempel` |

### Act names and official names

Keep the English name, number and year of every Act: `Companies Act 71 of 2008` stays `Companies Act 71 of 2008`. You may explain it after the name in brackets.

Keep the English name of an organisation, court, regulator, form or certificate, then add the official Afrikaans name in brackets where one exists, on first use. Never put a fact (a number, date, amount or condition) inside the brackets: the check counts it as an extra fact.

SARS, CIPC, POPIA, Pty Ltd, eFiling, BizPortal, PayShap, B-BBEE and the other names in `keepVerbatim` do not change. VAT becomes **BTW in prose only**; VAT264 and VAT101 stay as they are. The check fails with `keep-verbatim` when one of these names, or a term marked `"keepVerbatim": true` in `TERMS-af.json`, is missing.

### Two bracket rules, and which one wins

| Kind of term                                                           | Rule                                              | Example                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A common-noun concept                                                  | Afrikaans term, English in brackets               | `**Eenmansaak (sole proprietor)**`                                                           |
| A proper name of an institution, court, regulator, form or certificate | English name, official Afrikaans name in brackets | `**Information Regulator (Inligtingsreguleerder)**`, `**Small Claims Court (Kleineisehof)**` |

When the two rules seem to conflict, a proper name follows the official-names rule.

In the glossary, the English goes inside the bold: `**Sole proprietor** — …` becomes `**Eenmansaak (sole proprietor)** — …`. Abbreviations and proper names stay as they are (`**SARS** — …`), except `**VAT**`, which becomes `**BTW (VAT)**`.

In running text, add the English in brackets **once per document, on first use**, and only where readers will meet the English on official forms, websites or bank apps: `voorlopige belastingbetaler (provisional taxpayer)`. Do not add it for everyday words such as faktuur or kwotasie.

### Quoted English wording

When English quotes words the reader must use or will see, write the Afrikaans in quotes and the English in quotes and brackets: `"handeldrywende as" ("trading as")`.

### The apostrophe in ’n

Write the typographic `’n` (and `’N` at the start of a sentence), as the app's interface does. The check reads a straight apostrophe exactly like the typographic one, so neither causes a finding, but the text must use `’n`.

## Faithfulness: obligations and permissions

Do not strengthen or weaken a statement. Translate what English says, not what you think it means.

| English                   | Afrikaans                     | Wrong                                                      |
| ------------------------- | ----------------------------- | ---------------------------------------------------------- |
| `No registration needed.` | `Geen registrasie nodig nie.` | `Jy hoef niks te registreer nie.` (says more than English) |
| `must`                    | `moet`                        |                                                            |
| `may` (permission)        | `mag`                         |                                                            |
| `may` (possibility)       | `kan`, `dalk`                 | `mag`                                                      |
| `should`                  | `behoort`                     | `moet` (stronger)                                          |
| `must not`, `may not`     | `mag nie`                     | `hoef nie` (weaker)                                        |

`mag` is the Afrikaans for the permission "may". It is never read as the month Mei.

## Links and references

Translate the link text. Never change the link target.

Before (`01 Core - applies to everyone/02-register.md`):

```
Before you register, read [Running a Pty Ltd](06-running-a-pty-ltd.md).
```

After:

```
Lees [Bestuur van ’n Pty Ltd](06-running-a-pty-ltd.md) voordat jy registreer.
```

References to old folders in backticks, such as `` `01-core/04` `` or `` `04-business-types/` ``, stay exactly as they are.

Bare web addresses such as `www.sars.gov.za` and `inforegulator.org.za` stay exactly as they are. Email addresses stay as plain text.

## Placeholders in templates and prompts

Translate the words inside the brackets, keep the brackets, keep the same number of placeholders, and keep capital letters where English uses capitals.

| English                                                                               | Afrikaans                                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `**[YOUR BUSINESS NAME]**`                                                            | `**[JOU BESIGHEIDSNAAM]**`                                                                             |
| `[Your name] \| [Phone] \| [Email]`                                                   | `[Jou naam] \| [Foon] \| [E-pos]`                                                                      |
| `[DD Month YYYY]`                                                                     | `[DD Maand JJJJ]`                                                                                      |
| `Deposit of [X]% before work starts.`                                                 | `Deposito van [X]% voordat werk begin.`                                                                |
| `[If a company: Trading as a name of [REGISTERED NAME] (Pty) Ltd, Reg. No. [NUMBER]]` | `[As ’n maatskappy: Handeldrywende as ’n naam van [GEREGISTREERDE NAAM] (Pty) Ltd, Reg. No. [NOMMER]]` |
| `replace everything in [SQUARE BRACKETS]`                                             | `vervang alles in [VIERKANTIGE HAKIES]`                                                                |

Keep the line breaks of a template header: three lines in English are three lines in Afrikaans.

## Fixed labels

| English                                          | Afrikaans                                       |
| ------------------------------------------------ | ----------------------------------------------- |
| `> **In plain words:** …`                        | `> **In gewone taal:** …`                       |
| `## Words used in this file`                     | `## Woorde wat in hierdie lêer gebruik word`    |
| `\| Word \| Meaning \|`                          | `\| Woord \| Betekenis \|`                      |
| `Supports: …` (sources register)                 | `Ondersteun: …`                                 |
| `**[Official] SARS — Turnover Tax**`             | `**[Amptelik] SARS — Omsetbelasting**`          |
| `All sources were checked on 13 September 2026.` | `Alle bronne is op 13 September 2026 nagegaan.` |
| `` `01-core/04`, all business types ``           | `` `01-core/04`, alle besigheidstipes ``        |
| `## Your checklist`                              | `## Jou kontrolelys`                            |

A heading over a numbered checklist must contain the word **kontrolelys**, because a numbered list under such a heading becomes a tick list in the app.

## The footer

Keep the `---` line. Start the italic line with `*Deur KI gegenereer (Claude, Anthropic) op` and the same date. Keep both links.

Before (`01 Core - applies to everyone/03-tax-and-sars.md`):

```
*Generated by AI (Claude, Anthropic) on 13 September 2026. Facts in this file were checked against official South African sources listed with links in [Sources and verification register](../05%20Look%20it%20up/03-sources-and-verification-register.md). Rules and fees change — verify before you act. Not legal, tax, or financial advice. See [How this was made and how to check it](../00%20Start%20here/02-how-this-was-made.md).*
```

After:

```
*Deur KI gegenereer (Claude, Anthropic) op 13 September 2026. Die feite in hierdie lêer is nagegaan teen amptelike Suid-Afrikaanse bronne wat met skakels in die [Bronne- en verifikasieregister](../05%20Look%20it%20up/03-sources-and-verification-register.md) gelys is. Reëls en fooie verander — maak seker voordat jy optree. Nie regs-, belasting- of finansiële advies nie. Sien [Hoe dit gemaak is en hoe om dit na te gaan](../00%20Start%20here/02-how-this-was-made.md).*
```

## Fenced blocks

| Kind of fence      | Where it appears                                                                                                                  | What you do                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `prompt`           | `02 Branding and marketing`, prompts in other files                                                                               | Translate. Keep every `[PLACEHOLDER]` (translated), every number and line    |
| `template-preview` | Quotation, invoices, receipt and privacy notice in `03 Paperwork and templates/01-which-template-to-use-when.md`                  | Translate field labels only. Keep every `-----` line, amount and placeholder |
| `example`          | `MOKOENA MOTORS` / `Mokoena Solar` name examples                                                                                  | **Do not change a single character**                                         |
| `listing`          | Folder trees (`07 Brand/`, `01 Admin …`)                                                                                          | **Do not change a single character**                                         |
| `snippet`          | `00 Start here/03-what-has-changed.md` and the three worked-example answers in `02 Branding and marketing/01-branding-prompts.md` | Translate. Shown as plain text, without a copy button                        |

`pnpm content:build --report` lists every fence with its kind.

## Glossary and sources register

Glossary lines keep the shape `**Term** — Definition` with the em dash (—) and a space on each side. See "Two bracket rules" for the term. Keep every entry in the same group and order. The check compares every entry like a paragraph and names the entry id in its findings.

In the sources register, keep the three-line shape of each entry: bold title, the URL on its own line, then `Ondersteun:`. Never change a URL. A bold line that introduces a list stays a bold-only line with no link.

## Style (checked by the reviewer, not by the build)

- Write in plain, everyday South African Afrikaans for a reader who has never run a business. Short sentences. Aim for the same reading level as the English.
- Use **jy** and **jou**, never **u**.
- Use the terms in `TERMS-af.json` every time. Examples: sole proprietor → eenmansaak, provisional tax → voorlopige belasting, turnover tax → omsetbelasting, tax invoice → belastingfaktuur, quotation → kwotasie, invoice → faktuur, prompt → opdrag, Master checklist → Hoofkontrolelys.
- Keep the em dash (—) where English has it.
- Do not add facts, drop warnings, soften "must" or strengthen "may". "Not legal advice" stays in.
- "In gewone taal" lines stay as simple as the English "In plain words" lines.

## Common findings and how to fix them

| Finding                                                                                                                                         | What happened                                                                  | Fix                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `paperwork/templates/receipt:intro.6: block-count expected 7 got 8`                                                                             | An extra paragraph, a missing colon before a checklist, or an extra blank line | Compare the blocks from the named block down; restore the English shape |
| `business-types/pick-your-business-type:what-nobody-needs-on-day-one.1: rand expected R2.3 got R2.5`                                            | A digit changed                                                                | Copy the amount from English                                            |
| `core/tax-and-sars:provisional-tax.7: date expected --08-31 got August`                                                                         | `by 31 August` became `teen einde Augustus`                                    | Keep the day: `teen 31 Augustus`                                        |
| `business-types/pick-your-business-type:what-everyone-needs-regardless-of-type.2: keep-verbatim expected Consumer Protection Act ×1 got (none)` | An Act name was translated                                                     | Keep `Consumer Protection Act`; explain it in brackets if needed        |
| `lookup/glossary:information-officer: keep-verbatim expected Information Regulator ×1 got (none)`                                               | An official name appears only in Afrikaans                                     | Write `Information Regulator (Inligtingsreguleerder)` on first use      |
| `paperwork/templates/receipt:intro.3: line-breaks expected 2 got 1`                                                                             | Two template header lines were joined                                          | Put the lines back on separate lines                                    |
| `core/adding-new-lines:can-one-company-trade-in-more-than-one-thing.4: callout-label expected In gewone taal: got (none)`                       | The callout label is missing or misspelt                                       | Start the blockquote with `> **In gewone taal:**`                       |
| `core/adding-new-lines:what-the-law-requires-either-way.3: code-verbatim expected line 2 …`                                                     | An example fence was translated                                                | Copy the fence from English character for character                     |
| `business-types/pick-your-business-type:footer: footer-date expected 2026-09-13 got 2026-09-14`                                                 | The footer date changed                                                        | Use the English date                                                    |
| `paperwork/templates/receipt:intro.3: placeholder-count expected 4 got 3`                                                                       | A `[PLACEHOLDER]` was dropped or merged                                        | Keep one bracket pair for every English bracket pair                    |

## When a finding looks wrong

Do not distort the Afrikaans to make a finding go away: no English month names in Afrikaans prose, no invented numbers, no dropped words.

If you believe a finding is a false positive:

1. Leave your faithful translation as it is.
2. Record it in `docs/rsa-business-toolkit-af/TRANSLATION-NOTES.md` under the heading `## Suspected fidelity false positives`, one line each: the doc id, the block id and the exact message, with one sentence on why the Afrikaans is faithful.
3. Report it in your hand-over, so the pipeline owner can fix the check.

## Before and after, from the corpus

**A legal paragraph and its plain-words line** (`04 Your kind of business/01-vehicle-dealer.md`):

```
The form is the SAPS 601. No payment is required. Registration is free.

> **In plain words:** Bring two recent colour ID photos and a certified copy of the ID of everyone who runs the business day to day.
```

```
Die vorm is die SAPS 601. Geen betaling word vereis nie. Registrasie is gratis.

> **In gewone taal:** Bring twee onlangse kleur-ID-foto’s en ’n gesertifiseerde afskrif van die ID van almal wat die besigheid daagliks bestuur.
```

**The 2026 numbers** (`00 Start here/00-start-here.md`):

```
- Compulsory VAT registration: **R2.3 million**, not R1 million, from 1 April 2026
- Voluntary VAT registration: **R120,000**, not R50,000
```

```
- Verpligte BTW-registrasie: **R2.3 miljoen**, nie R1 miljoen nie, vanaf 1 April 2026
- Vrywillige BTW-registrasie: **R120,000**, nie R50,000 nie
```

**A master checklist group** (`05 Look it up/02-master-checklist.md`):

```
**Vehicle dealer** (`04-business-types/01`)
- [ ] SAPS second-hand goods dealer registration (SAPS 601, free)
- [ ] VAT264 process in place, if registered
```

```
**Voertuighandelaar** (`04-business-types/01`)
- [ ] SAPS-registrasie as handelaar in tweedehandse goedere (SAPS 601, gratis)
- [ ] VAT264-proses in plek, as jy geregistreer is
```

**A task with a condition** keeps the condition at the start, followed by a colon, so the app can filter it: `- [ ] If a company: filed beneficial ownership information (free)` becomes `- [ ] As ’n maatskappy: inligting oor voordelige eienaarskap ingedien (gratis)`.

## Checklist before you hand in

- [ ] Same number of blocks; `pnpm content:fidelity --lang af --doc <id>` prints 0 findings
- [ ] Every number, rand amount, percentage, date, form code and URL copied exactly; months next to their day or year
- [ ] Act names, official names and the names in `keepVerbatim` kept in English
- [ ] Link targets untouched, link text translated
- [ ] Placeholders translated inside the brackets, same count, capitals kept, line breaks kept
- [ ] `In gewone taal:`, `Ondersteun:`, the words-table heading and the footer written exactly as above
- [ ] Example and listing fences unchanged
- [ ] Terms from `TERMS-af.json`, "jy" register, `’n`, nothing added, left out, strengthened or weakened
- [ ] Suspected false positives recorded in `TRANSLATION-NOTES.md`, not worked around
