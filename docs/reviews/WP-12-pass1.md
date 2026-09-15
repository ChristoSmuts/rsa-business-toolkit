# WP-12 review, pass 1 (REVIEWER-A)

- Package: WP-12, i18n dictionary and helpers
- Branch: `worktree-agent-a6dc8cdd77877812b`, final commit `ed92a7a`, base `51e9c01`
- Reviewer: REVIEWER-A (independent of the author)
- Date: 2026-09-15

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 4 |
| minor | 9 |
| nit | 8 |

The engineering is solid. All gates pass. `t()`, the plural handling, fallback, `pick`/`createTranslator`, the formatters and the route helpers behave correctly on every edge case I probed, and they do not depend on the time zone. Tree-shaking works, so client scripts do not ship the dictionaries. The package is not clean for three reasons. The dictionary does not yet cover several Part B surfaces (M1, M2). Several repeated controls have labels that are ambiguous for screen readers (M3). A handful of Afrikaans strings are ungrammatical or use the wrong word (M4).

## Commands run (in the author worktree)

`pnpm lint`
```
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
```

`pnpm typecheck`
```
$ astro check
Result (21 files):
- 0 errors
- 0 warnings
- 0 hints
```

`pnpm test`
```
 Test Files  4 passed (4)
      Tests  105 passed (105)
   Duration  19.82s
```

`pnpm exec vitest run --project unit --coverage --coverage.include=src/i18n/**/*.ts --coverage.include=src/lib/**/*.ts`
```
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files        |    99.4 |    96.32 |     100 |   99.31 |
  index.ts       |     100 |    97.61 |     100 |     100 | 123,178
  i18n-routes.ts |     100 |    94.44 |     100 |     100 | 62
  paths.ts       |   95.83 |    93.75 |     100 |      95 | 35
Lines        : 99.31% ( 146/147 )
```

`pnpm build`
```
[build] 1 page(s) built in 654ms
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] Complete!
```

Extra checks:
- `tsc --noEmit -p .` exits 0. The `@ts-expect-error` lines in `tests/unit/i18n.test.ts:462,464,533` are therefore real. If one became unused, tsc would report it.
- Key count: en 444 and af 444, identical sets (node flatten script). This confirms the author's number.
- Ownership: `git diff --name-only 51e9c01...HEAD` lists `astro.config.ts, docs/i18n.md, src/i18n/{af.json,en.json,index.ts,locales.ts}, src/lib/{i18n-routes.ts,paths.ts}, tests/unit/{format,i18n-routes,i18n,paths}.test.ts`. All are inside the owned paths. The `astro.config.ts` change touches only the i18n and sitemap locales.
- Probe scripts: in the scratchpad, outside the worktree, run with the worktree's `tsx`. Results are summarised under each finding and in "Verified OK".
- Bundle probe: a client entry that imports only `createTranslator` was built with the worktree's Vite 8 (lib mode, minified). The result is 3 800 B raw / 1 365 B gz. It contains no dictionary strings ("Skip to main content", "Januarie" and "resultate" are all absent). Only the `LOCALES` metadata is included.
- Time zone probe (`process.env.TZ` = Africa/Johannesburg, Pacific/Honolulu, Pacific/Kiritimati, America/Sao_Paulo): `formatDate` gives identical output in all four. `2026-02-28` stays `28 February 2026`, and `2026-02-28T23:30:00Z` becomes `1 March 2026` (SAST) in every zone.

## Verified OK (no finding)

- `t()` with a missing param keeps `{title}` and warns in dev. Nested typos return the key, warn, and fail typecheck. Plural counts 0, 1 and 2 give `0 resultate`, `1 resultaat` and `2 resultate`. `-1` gives `-1 result` (correct under CLDR). `NaN` falls back to `other`. A `$&` inside a param value is inserted literally, with no replace-pattern injection.
- Fallback: a partial af mock falls back to English for missing keys and for keys with the wrong shape, in both `t` and `pick`.
- `formatRand`: `0.005` gives `R 0.01`, `-0.005` gives `-R 0.01`, `1.345` gives `R 1.35`, `-1234567.891` gives `-R 1 234 567.89`. `NaN` and `Infinity` throw. Both spaces are U+00A0.
- `formatDate` rejects `0026-01-01`, `2026-02-29`, `13/09/2026`, lower-case `z`, leading whitespace and hour `25`.
- `switchLocaleUrl`: `/africa/` gives `/af/africa/` (no false match). `/af` without a slash at root base gives `/`. `/af?x=1` gives `/?x=1`. A query and hash are kept, and `%23` inside the query survives. `/business-toolkit?q=1` gives `/business-toolkit/af/?q=1`.
- `alternateUrls` handles a site with a trailing slash. The site path is ignored, which is documented and tested. `x-default` is added only when English is available.
- `localeStaticPaths` returns `params.locale: undefined` for `en`. This is correct for an Astro `[...locale]` rest param, and matches C1.
- `astro.config.ts` imports `./src/i18n/locales` without an extension. Astro loads the config through Vite, so the import resolves the same way on Linux. The file name is lower-case and matches exactly. A test imports the real config.
- There are no circular imports: `locales.ts` has no imports, `paths.ts` and `index.ts` import `locales.ts`, and `i18n-routes.ts` imports `locales.ts` and `paths.ts`.
- The key-set test reports both missing and extra keys. The param test compares sorted name sets, so `{name}` against `{naam}` fails. The length-ratio test is deterministic, not flaky.

---

## Findings

### major: M1. Dictionary does not cover several Part B surfaces
File: src/i18n/en.json (whole file), src/i18n/af.json (whole file)
Acceptance item: "complete nested UI dictionary for every surface in Part B"
What is wrong: I walked B1 to B6 surface by surface. These UI strings have no key, so a later page package would have to hard-code them or invent keys outside WP-12:
- **Business-type hub (B6):** the "If you…" routing list heading, the "read both" note (only `home.businessTypes.lead` exists, which is a home string), the effort ranked list heading, the "What everyone needs" / "What nobody needs" column headings, and "Not sure? Find my path".
- **Type doc (B6):** the related-type hints ("Also applies if you…" / "See also"). `doc.readCoreFirst` exists but has no callout title.
- **Section landing (B6):** "Start with…" from profile. There is no label for the DocCard "checklist complete" ✓ for screen readers. The same gap applies to the sidebar tick when a doc's checklist is complete (B2).
- **Keyboard help dialog (B4 KeyboardHelp, `?`):** no dialog close label. There are no rows for `Ctrl+K` (B3.3) or for `Alt+←/→` as distinct from single keys. `about.shortcuts.previous/next` exist, but nothing names the modifier.
- **Contents page (B1 `/contents/`):** only `nav.contents`. There is no page intro and no `<title>`-worthy description.
- **Advisory validation summary (B5):** no summary heading ("Check these answers" or similar) for the wizard or the templates.
- **Storage unavailable (B3.8, B6):** only `checklist.storageUnavailable`. The wizard (`wizard.savedTip` assumes success), templates (`templates.savedNotice`) and settings have no failure text.
- **Search dialog (B4 combobox):** no usage instructions for screen readers ("Use the arrow keys to move through results, Enter to open") and no group label format for "doc › heading" results.
- **Sources (B6):** no legislation table caption or column headers.

How to reproduce: `grep -nE "ifYou|nobodyNeeds|everyoneNeeds|startWith|alsoApplies|keyboardHelp|ctrlK" src/i18n/en.json` returns nothing.
Suggested fix: add a `businessTypesHub` group (or extend `businessTypes`) and add `section.startWith`, `doc.related.*`, `doc.checklistComplete`, `keyboardHelp.*`, `contents.*`, `validation.summaryTitle`, `storage.unavailable` (generic), `search.instructions`, and `sources.legislation.*`. Mirror all of them in af.json.

### major: M2. Template form has no field labels and no names for the seven required tax invoice items
File: src/i18n/en.json:340-406 (`templates`)
Acceptance item: Part B3.5 and B6 template page ("form · A4 preview · required-items"). B4 TemplateForm needs "labelled inputs, `autocomplete`, required-items list".
What is wrong: `templates.groups` and `templates.line` exist, but no labels exist for the actual business, customer, document or payment fields. Examples: business name, address, VAT number, registration number, phone, email, customer name/address/VAT number, invoice/quotation/receipt number, date of issue, due date, valid until, bank, account number, branch code, payment reference, payment method. `templates.requiredItems` ("{present} of {total} required items present") and `templates.missing` ("Missing: {list}") need the item names. The source defines seven (`docs/rsa-business-toolkit/03 Paperwork and templates/templates-to-fill-in/03-tax-invoice-vat-registered.md:47-57`): the words "Tax Invoice"; your name, address and VAT number; the customer's name and address (and VAT number if registered); serial number and date of issue; description; quantity or volume; value, VAT and total. The "second-hand goods" note is also missing.
How to reproduce: `grep -n "vatNumber\|dueDate\|businessName" src/i18n/en.json` returns nothing.
Suggested fix: add `templates.fields.*` (one key per input, shared across the five templates) and `templates.required.taxInvoice.{words,supplier,recipient,numberAndDate,description,quantity,values}`. If the orchestrator decides these labels come from the content pipeline (the template-preview fences), record that decision in the brief and in `docs/i18n.md`, and downgrade this finding.

### major: M3. Repeated controls have labels that are ambiguous out of context
File: src/i18n/en.json:192-193, 201, 208, 366, 287-290, 408, 471, 621, 626 (and the same keys in af.json)
Acceptance item: "a11y strings are meaningful for screen readers; labels are not ambiguous out of context"
What is wrong: these labels repeat many times on one page, and a screen-reader user who lists buttons or links hears identical names: `doc.show`, `doc.hide`, `doc.hiddenShow` ("Show"), `doc.copyLink` and `glossary.copyLink` ("Copy link", one per term, so about 100 on /glossary/), `templates.open` ("Open template", five cards), `myPath.read` ("Read"), `myPath.markDone` / `markNotDone` ("Mark as done"), `prompts.copy` ("Copy prompt", about 10 per branding doc), `common.close` ("Close"), `common.dismiss` ("Dismiss"). The dictionary already shows the right pattern in `templates.removeLine` ("Remove line: {description}") but does not use it for these. WCAG 2.4.4 "in context" may technically pass, but the brief asks for more, and without keys the components cannot do better without hard-coding.
How to reproduce: read `en.json` and compare it with the component inventory in B4 (glossary `dt` copy-link, PromptBlock toolbar, StepCards, DocCards).
Suggested fix: add parameterised accessible-name variants and keep the short visible text:
- `glossary.copyLinkTo`: "Copy link to {term}"
- `doc.copyLinkTo`: "Copy link to {heading}"
- `doc.showHidden`: "Show hidden section: {title}"
- `templates.openNamed`: "Open the {name} template"
- `myPath.readStep`: "Read step {n}: {title}"
- `myPath.markDoneNamed`: "Mark {title} as done"
- `prompts.copyNamed`: "Copy prompt {n}: {title}"
- `common.closeDialog`: "Close {name}"
- `site.dismissNotice`: "Dismiss this notice"

### major: M4. Afrikaans strings with grammar errors or wrong words
File: src/i18n/af.json (see the table below; rows marked **M4**)
Acceptance item: "natural jy-register Afrikaans"
What is wrong: six strings are wrong, not just a matter of style. They would read as mistakes to a native reader:
- "nagegaande" is not a standard attributive form.
- "As myself" is an anglicism and not idiomatic.
- "almal" is used for things instead of people.
- "Sleutel" means a lock key, not a keyboard key.
- "advokaat" narrows "lawyer" to "advocate".
- "Lae data-modus" is hyphenated wrongly.
How to reproduce: read the listed keys.
Suggested fix: use the corrected strings in the table below. All other rows in the table are minor or nit.

### minor: m1. `t()` params are not typed per key; a string `count` silently picks `other`
File: src/i18n/index.ts:26, 129-141
Acceptance item: general quality ("typed dot-path keys")
What is wrong: `Params` is `Record<string, string | number>`. `t('en','search.results',{count:'1'})` returns `1 results`. It warns only in dev, and production is silent. A missing param such as `t('en','nav.next')` also compiles.
How to reproduce: probe output: `t plural "1" => "1 results"`, `t missing param => "Next: {title}"`.
Suggested fix: derive a `ParamsFor<K>` type from the template literal of the EN value, or at least require `count: number` for plural keys through an overload.

### minor: m2. `formatDate` accepts impossible timestamps and rolls them over
File: src/i18n/index.ts:293-320
Acceptance item: "`formatDate` with invalid ISO strings"
What is wrong: date-only input is validated strictly, but timestamps go through the lenient `Date.parse`. `2026-02-30T10:00:00Z` returns `2 March 2026` instead of throwing. This is inconsistent with `2026-02-30`, which throws.
How to reproduce: probe: `date 2026-02-30T10:00:00Z => "2 March 2026"`.
Suggested fix: validate the `YYYY-MM-DD` prefix with the same `Date.UTC` round-trip before parsing the timestamp. Add a test.

### minor: m3. `switchLocaleUrl` with an absolute URL string returns a broken path
File: src/lib/i18n-routes.ts:77-87
Acceptance item: general quality
What is wrong: `switchLocaleUrl('https://x.test/business-toolkit/core/','af')` returns `/business-toolkit/af/https:/x.test/business-toolkit/core/`. Passing `location.href` is a natural mistake. The doc comment says to pass a pathname or a `URL` object, but nothing guards the string case.
How to reproduce: probe: `switch full URL string`.
Suggested fix: if the string matches `/^[a-z][a-z0-9+.-]*:/i`, parse it with `new URL()`. Otherwise require a leading `/`. Add a test.

### minor: m4. "Add a language" steps fail typecheck, and a non-enabled dictionary is not parity-tested
File: docs/i18n.md:149-152; src/i18n/index.ts:49; tests/unit/i18n.test.ts:62
Acceptance item: "adding language #3 is really as documented"
What is wrong: step 2 says to register `zu` in `DICTIONARIES` while `enabled` is still `false`. `DICTIONARIES` is typed `Record<Locale, DictTree>`, and `Locale` covers only enabled codes, so `{ en, af, zu }` fails with an excess-property error. Also, `DICTIONARY_LOCALES` iterates `ENABLED_LOCALES`. A `zu.json` with `uiDictionary: true` but not yet enabled skips the parity, param, plural and text-rule tests, which is exactly the state step 1 creates.
How to reproduce: follow the steps in a scratch branch, or reason from the types at `index.ts:49`.
Suggested fix: build `DICTIONARY_LOCALES` from `LOCALES.filter(l => l.uiDictionary)`. Either type `DICTIONARIES` as `Partial<Record<LocaleCode, DictTree>>`, or reorder the docs so that registration happens together with enabling.

### minor: m5. Values hard-coded inside dictionary strings
File: src/i18n/en.json:160, 312, 387 (and af.json)
Acceptance item: CLAUDE.md ("Pass values in through `{param}` placeholders") and docs/i18n.md:195
What is wrong: `templates.vat` "VAT 15%", `home.threeNumbers.heading` "…changed in 2026" and similar strings embed figures. A VAT rate change would mean editing every dictionary instead of one data value, and the digit-equality test would not catch a missed file that keeps the old figure in both.
Suggested fix: use `"VAT {rate}%"` and `"Three numbers that changed in {year}"`.

### minor: m6. `doc.hiddenReason` composes a capitalised noun mid-sentence
File: src/i18n/en.json:200, af.json:200
Acceptance item: B6 "Hidden: … — Show"
What is wrong: the likely `{audience}` sources are `entity.*` and `businessTypes.*.name`. Both are capitalised labels, so the result is "Hidden: applies to Sole proprietor only" and "Versteek: geld net vir Eenmansaak". Afrikaans also needs the plural or an article ("vir eenmansake"), which a label cannot supply.
Suggested fix: add full sentences per audience (`doc.hiddenFor.pty`, `doc.hiddenFor.sole-prop`, `doc.hiddenFor.businessType` with `{type}` in lower case), or lower-case audience keys.

### minor: m7. English plain-language slips
File: src/i18n/en.json:497, 512, 51, 69
Acceptance item: "plain language for second-language readers, no idioms, no jargon"
What is wrong:
- `about.licence` "No attribution required." is jargon.
- `about.settings.shortcutsHelp` "gets in the way" is an idiom.
- `nav.toolDescriptions.checklist` "Tick things off as you go" is an idiom.
- `nav.breadcrumbLabel` "Breadcrumb" is jargon that screen readers announce.

Suggested fix:
- "You do not need to name the authors."
- "Turn this off if / or ? causes problems, for example when you use speech input."
- "Tick each step when you finish it."
- "You are here".

### minor: m8. Label-length test covers only some tight labels
File: tests/unit/i18n.test.ts:340-393
Acceptance item: "length ratio" test
What is wrong: key selection is a hand list of leaf names plus three groups. Badges and chips, which B5 names as overflow risks ("Afrikaans string overflow on buttons and tiles"), are not checked: `doc.ptyOnly`, `doc.soleProprietorOnly`, `entity.*`, `stage.*`, `businessTypes.*.short`, `search.filters.*`, `checklist.filters.*`, `templates.fillIn`. The list will also drift as keys are added.
Suggested fix: invert the rule so that every string leaf of at most N characters (for example 24) in EN is checked, with an explicit allowlist of exceptions. That also removes the name-based list.

### minor: m9. Afrikaans phrasing: unnatural or calqued strings
File: src/i18n/af.json (rows marked **m9** in the table)
Acceptance item: "natural jy-register Afrikaans"
What is wrong: these strings are understandable but read as translated English. See the table.

### nit: n1. `docs/i18n.md:64` overstates the client bundle cost
The docs say importing `createTranslator` "pulls in both dictionaries". The Vite 8 bundle probe shows it does not: 1 365 B gz, no dictionary strings. The note may push someone into an unnecessary client-only module. Correct the sentence, or add the measured size.

### nit: n2. `businessTypes.effort.low` has no source level
en.json:582. The source effort table (`04 Your kind of business/00-pick-your-business-type.md:22-29`) uses Lowest, Low to medium, Medium, Medium to high and High. `low-medium` is justified. `low` is unused. Keep it only if a later package needs it.

### nit: n3. `alternateUrls` accepts a locale-prefixed route and doubles the prefix
`alternateUrls('af/core/', …)` gives `/af/af/core/`. The docs say to pass a locale-independent route. A dev warning or `routeFromPath` normalisation would make misuse obvious.

### nit: n4. `formatRand` loses digits at 1e21 and above
`formatRand('en', 1e21)` returns `R 999 999 999 999 999 900 000.00`, because the `Math.round(magnitude*100)` fallback loses precision. No realistic invoice reaches this. Either document the limit or throw above `Number.MAX_SAFE_INTEGER / 100`.

### nit: n5. The param test compares the union across plural forms
tests/unit/i18n.test.ts:53-59. If AF `one` dropped `{count}` while `other` kept it, the test would still pass. That is acceptable, because a language may say "Een resultaat", but add a comment saying the behaviour is intentional.

### nit: n6. `pnpm typecheck` is `astro check` only
I confirmed with `tsc --noEmit` that tests type-check and that the `@ts-expect-error` lines are live. If `astro check` does not check `tests/**/*.ts` (its log says "Getting diagnostics for Astro files"), a later change could silently invalidate them. Consider adding `tsc --noEmit` to `gate:fast` (not in WP-12 scope, so this is a note for the orchestrator).

### nit: n7. Inconsistent close verbs in Afrikaans
`nav.menuClose` "Sluit kieslys", `search.close` "Sluit soektog" and `about.shortcuts.escape` "Sluit …" all use "Sluit", while `common.close` and `common.dismiss` use "Maak toe". Pick one. "Maak toe" is the more natural choice for plain-language readers.

### nit: n8. `nav.tools` "Nutsgoed" against "hulpmiddels" elsewhere
`site.noJs` and `nav.sections.paperwork.description` use "hulpmiddels". See the judgement on flagged choices below.

---

## Afrikaans corrections

Every af.json string was read. Rows marked **M4** belong to the major finding. **m9** rows are minor phrasing. Unmarked rows are nits.

| Key | Current | Suggested | Reason |
|---|---|---|---|
| **M4** `site.description` (af.json:5) | …Gewone taal, nagegaande feite, kontrolelyste en sjablone. | …Gewone taal, gekontroleerde feite, kontrolelyste en sjablone. | "nagegaande" is not a standard attributive form of *nagaan*. "gekontroleerde" is correct and plain. |
| **M4** `home.heroLead` (af.json:124) | …Gewone taal, nagegaande feite, en net die stappe wat vir jou geld. | …Gewone taal, gekontroleerde feite, en net die stappe wat vir jou geld. | Same as above. |
| **M4** `wizard.entity.options.sole-prop.label` (af.json:230) | As myself (eenmansaak) | In my eie naam (eenmansaak) | "As myself" is a word-for-word anglicism and not idiomatic. The body text already says "onder jou eie naam". |
| **M4** `wizard.types.help` (af.json:246) | Kies almal wat pas. ’n Kosvragmotor is ’n kosbesigheid en ’n voertuigeienaar. | Kies alles wat pas. ’n Koswa is ’n kosbesigheid en besit ook ’n voertuig. | "almal" refers to people, "alles" to things. "Kosvragmotor" is not in use; "koswa" is the common SA word. "is … ’n voertuigeienaar" says the business *is* a person. |
| **M4** `about.shortcuts.key` (af.json:500) | Sleutel | Toets | A keyboard key is a *toets* in Afrikaans. *Sleutel* is a lock key. |
| **M4** `about.shortcuts.note` (af.json:507) | Enkelsleutel-kortpaaie werk nie terwyl jy in ’n veld tik nie. | Eentoetskortpaaie werk nie terwyl jy in ’n veld tik nie. | Same as above; closed compound. |
| **M4** `about.settings.shortcuts` (af.json:511) | Enkelsleutel-kortpaaie | Eentoetskortpaaie | Same as above. |
| **M4** `about.aiSummary` (af.json:494) | …Geen advokaat, rekenmeester of belastingpraktisyn het dit nagegaan nie… | …Geen regsgeleerde, rekenmeester of belastingpraktisyn het dit nagegaan nie… | "advokaat" means advocate (barrister) only and changes the meaning of EN "lawyer". |
| **M4** `about.settings.lowData` (af.json:513) | Lae data-modus | Laedatamodus | Wrong hyphenation. The compound is written closed (or "Lae-data-modus"). |
| **m9** `nav.toolDescriptions.checklist` (af.json:51) | Merk dinge af soos jy gaan | Merk elke stap af wanneer jy klaar is | "soos jy gaan" is a calque of "as you go". |
| **m9** `checklist.intro` (af.json:304) | Merk af soos jy gaan. Jou merkies word net op hierdie toestel gestoor. | Merk elke stap af wanneer jy klaar is. Jou merkies word net op hierdie toestel gestoor. | Same calque. |
| **m9** `checklist.parts.d` (af.json:312) | Deel D: die vier dinge wat regte moeilikheid gee | Deel D: die vier dinge wat ernstige moeilikheid veroorsaak | "regte moeilikheid" is colloquial and calques "real trouble". Note: this is a heading that must match the AF content heading once the content translation exists. |
| **m9** `checklist.keyToShortWords` (af.json:333) | Sleutel tot die kort woorde | Wat die kort woorde beteken | "Sleutel tot" calques "Key to". Must match the AF content heading. |
| **m9** `checklist.keyShort` (af.json:334) | Kort | Kort woord | "Kort" on its own is an adjective and meaningless as a column header. |
| **m9** `wizard.types.effort` / `businessTypes.effortLabel` (af.json:248, 579) | Opstelwerk: {level} / Opstelwerk | Werk om te begin: {level} / Werk om te begin | "Opstel" also means *essay*, so "Opstelwerk" is ambiguous. |
| **m9** `businessTypes.beauty.description` (af.json:557) | Jy doen hare, naels, skoonheid, masserings, tatoeëermerke of lyfdeurborings. | Jy doen hare, naels, skoonheidsbehandelings, masserings, tatoeëermerke of liggaamsdeurborings. | "doen skoonheid" is awkward. "lyf-" is informal, and "liggaamsdeurboring" is the standard compound. "tatoeëermerke" is correct. |
| **m9** `doc.soleProprietorOnly` (af.json:189) | Net eenmansaak | Net vir eenmansake | The badge needs "vir" and the plural to read naturally. |
| **m9** `doc.ptyOnly` (af.json:190) | Net Pty Ltd | Net vir Pty Ltd | Same as above. |
| **m9** `nav.breadcrumbLabel` (af.json:69) | Broodkrummels | Waar jy is | Literal jargon that Afrikaans screen-reader users will not recognise. |
| **m9** `home.fourThings.heading` (af.json:153) | Vier dinge wat vroeg saak maak | Vier dinge wat van die begin af belangrik is | "saak maak" for "matter" is an anglicism in this construction. |
| **m9** `lang.mtNotice.body` (af.json:107) | …Geen mens het die vertaling al nagegaan nie… | …Niemand het die vertaling nog nagegaan nie… | More natural. "Geen mens … al" is stiff. |
| **m9** `about.shortcuts.escape` (af.json:506) | Sluit ’n dialoog of kieslys | Maak ’n venster of kieslys toe | "dialoog" means a conversation. A UI dialog is a "venster" or "dialoogvenster". |
| **m9** `myPath.markNotDone` (af.json:290) | Merk as nie klaar nie | Haal die merkie af | More natural button text. |
| **m9** `nav.sections.branding.description` (af.json:34) | KI-opdragte om te kopieer en plak vir… | KI-opdragte om te kopieer en te plak vir… | Both infinitives need "te". |
| **m9** `site.tagline` (af.json:4) | Begin en bestuur ’n eenpersoonsaak in Suid-Afrika | Begin en bestuur ’n eenpersoonbesigheid in Suid-Afrika | "eenpersoonsaak" is easily confused with the fixed term "eenmansaak" (sole proprietor). The toolkit also covers a one-person Pty Ltd. |
| `home.trust.free` (af.json:174) | Gratis, sonder om aan te meld | Gratis, jy hoef nie te registreer nie | "aanmeld" also means log in. EN means sign-up. |
| `home.fourThings.records` (af.json:157) | Rekords wat vir vyf jaar gehou word | Rekords wat jy vyf jaar lank hou | Active voice, plainer. |
| `wizard.savedTip` and `templates.savedNotice` (af.json:273, 403) | …Niks word na enige plek gestuur nie. | …Niks word êrens heen gestuur nie. | More idiomatic. |
| `wizard.entity.question` (af.json:226) | Hoe dryf jy handel, of hoe beplan jy om handel te dryf? | Hoe dryf jy handel, of hoe wil jy handel dryf? | Shorter, plain. |
| `home.whereToStart.fiveMinutes.body` (af.json:133) | …en wat om te ignoreer. | …en wat jy kan ignoreer. | Smoother. |
| `common.reset` (af.json:622) | Herstel | Stel terug | "Herstel" primarily means *repair*. "Stel terug" is the usual UI term for reset. |
| `templates.items.privacy-notice.description` (af.json:363) | …watter persoonlike inligting jy hou, en waarom. | …watter persoonlike inligting jy bewaar, en waarom. | "bewaar" is the POPIA-register verb. |
| `about.licence` (af.json:497) | …As jy dit aangee, hou… | …As jy dit aan iemand anders gee, hou… | "aangee" also means *report* or *hand in*. |
| `businessTypes.professional-creative.description` (af.json:572) | …ontwerp, kodering of klasgee. | …ontwerp, programmering of klasgee. | "kodering" usually means *encoding*. |
| `businessTypes.effort.*` (af.json:581-586) | Laag tot middel / Middel / Middel tot hoog | Laag tot matig / Matig / Matig tot hoog | "matig" is the natural word for a medium level. "middel" is a noun. |
| `lang.names.ss` (af.json:95) | Swazi | Swati | "Swazi" is dated. Match EN "Swati" and the current official usage. |

No findings on fixed terms: SARS, CIPC, POPIA, Pty Ltd, eFiling, PAYE, PDF, BTW, eenmansaak, omsetbelasting, kontrolelys, woordelys, sjabloon and soek are all used correctly. `voorlopige belasting` does not occur in the UI. ’n (U+2019) and diacritics (reëls, kliënt, finansiële, lêer, tatoeëermerke) are correct throughout. No placeholder is dropped or renamed. The register is "jy" throughout, and the month names are correct.

### Judgement on the author's flagged choices

| Choice | Verdict |
|---|---|
| roete (path) | Acceptable. "pad" would invite the idiom *jou pad vind*. "roete" is clear. Keep it consistent with the AF content ("Roete 3") once translated. |
| opdrag (AI prompt) | Acceptable and in current use ("KI-opdrag"). Keep. |
| Nutsgoed (Tools menu) | Acceptable. It matches established Afrikaans software localisation for "Tools" and fits the length rule. "Hulpmiddels" is the more everyday word but fails the 1.6x length rule. Keep, and see n8. |
| Kosvragmotor | Not acceptable. Use "koswa" (M4). |
| lyfdeurborings | Understandable but informal. Use "liggaamsdeurborings" (m9). |
| tatoeëermerke | Correct (HAT). Keep. |
| Opstelwerk | Ambiguous (essay). Use "Werk om te begin" (m9). |
| Slaan dit na (Look it up) | Correct imperative and natural. Keep. "Naslaan" is an equally good shorter option. |
| merkies (ticks) | Correct and natural. Keep. |
| Broodkrummels | Too literal for screen readers. Use "Waar jy is" (m9). |
| Masjienvertaling | Correct. Keep. |
| oop plek(ke) (blanks) | Acceptable and plain. "leë plek" is also fine. Keep. |
| Language names (Engels, Zoeloe, Xhosa, Suid-Sotho, Tswana, Noord-Sotho, Tsonga, Swazi, Venda, Suid-Ndebele) | All standard Afrikaans exonyms, except that "Swazi" should be "Swati". Consider also showing the native names (as in `locales.ts`) in the switcher. |
| Product name in English in af.json | Acceptable. The name is a brand, and a translated "Besigheidsgereedskapstel" would be clumsy. |
| Extra effort level `low-medium` | Justified by the source table ("Low to medium"). The unused `low` is n2. |
