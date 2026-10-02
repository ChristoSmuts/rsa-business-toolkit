# WP-40: items for the owner

The Afrikaans translation is complete: all 36 documents, with 0 fidelity findings and two consecutive clean review passes per batch (`WP-40-batch<N>-pass<n>.md`). The translators and reviewers found the things below. They are outside the translation, or they need someone who can reach official sources or speaks Afrikaans as a first language.

## Problems in the English source

Fix these with `fix(content):` commits in `docs/rsa-business-toolkit/`. The Afrikaans files copy each problem faithfully, so they need the same fix afterwards. The fidelity check's `stale` rule points to each block.

| Document | Problem |
| --- | --- |
| `03 Paperwork and templates/templates-to-fill-in/02-invoice-not-vat-registered.md` | Says "Three rules" and lists four. |
| `04 Your kind of business/00-pick-your-business-type.md` | Points to the "left column" of the table; it means the business-type column. |
| `00 Start here/02-how-this-was-made.md` | "a.co.za domain" is missing a space. |
| `03 Paperwork and templates/02-free-tools.md` | "a.docx" is missing a space. |
| `05 Look it up/02-master-checklist.md` | "a.co.za" is missing a space. |
| `02 Branding and marketing/01-branding-prompts.md` | "A suggested.co.za domain" is missing a space. |
| `02 Branding and marketing/04-marketing-prompts.md` | Prompt 1 points to `05-branding-prompts.md`, an old file name. |
| `02 Branding and marketing/` (brand folder listing) | Says the one-page brand guide comes from Prompt 10; it comes from Prompt 11. |
| `01 Core - applies to everyone/05-vehicles.md` | Its H1 is "Vehicles and your business"; every link to it says "Vehicles for your business". Pick one. |
| Several documents | Link text "Which template to use when" points to a document titled "Documents and templates". |

## Needs checking against an official source

The cloud environment could not reach official South African sites, so none of these could be confirmed.

- **Tax invoice wording.** The Afrikaans templates and the templates guide say a tax invoice may be headed "Belastingfaktuur", "BTW-faktuur" or "Faktuur". Check that the official Afrikaans text of the VAT Act, section 20(4), accepts these words. If it does not, keep only the English words in the Afrikaans files.
- **Afrikaans names of institutions.** The translators kept official English names and added an Afrikaans gloss in brackets. Some glosses are names they believed to be official (Inligtingsreguleerder, Meester van die Hooggeregshof, Vergoedingsfonds, Binnelandse Sake, Kleineisehof, Staatskoerant); others are descriptions. The batch notes list each one.
- **"Hooggeregshof".** The guide uses it throughout. The courts' current Afrikaans name is "Hoë Hof"; decide whether to change it everywhere.

## Prompts that mention English

Two marketing prompts tell the AI about English: branding Prompt 9 ("not all my customers speak English as a first language") and marketing Prompt 3 (each message "once in English"). The translations are faithful, but an Afrikaans reader who pastes Prompt 3 unchanged gets an English version back. Decide whether the Afrikaans edition should say "in Afrikaans" there.

## Term-list decisions still open

`scripts/translate/TERMS-af.json` records the terms the reviews settled. These remain open:

- **"gereedskapstel" (toolkit) and "gids" (guide).** The content says the first, the interface the second, mirroring the English split. No reviewer called it wrong.
- **"tuiswerk" (working from home).** It can also mean school homework. The navigation title avoids it; the documents still use it as the term list says.
- **"eenmansaak" for the person.** Some documents write "eenmansaak-eienaar" for a sole proprietor as a person, others "eenmansaak" for both. Both are allowed.
- **"dormante maatskappy" or "slapende maatskappy"** for a dormant company.
- **"gesondheidsinstelling" or "gesondheidsinrigting"** for a health establishment.
- The style guide's checklist example still uses "jy"; the checklist's tick items now use "ek".
