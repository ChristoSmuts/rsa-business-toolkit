# WP-32 review pass 1 (fillable templates)

- **Reviewer:** an independent reviewer agent. It did not write this code.
- **Date:** 5 October 2026
- **Commit reviewed:** `c5157a4` ("test(templates): type the Start next button names"), the tip of `worktree-agent-a253e59a4d4c5ad19`. I reset a clean worktree to it.
- **Scope:** `git diff 61bb68c c5157a4`: 31 files, +4183 / -290, five commits.

## Verdict

**Not clean: 1 blocker, 5 major, 8 minor, 5 nit.**

The package is close. The parser, the totals maths, the drafts, the Afrikaans page and the gates are in good shape, and the printed tax invoice is right to the cent with ten lines, a discount, a zero quantity and decimal commas. The problems are in what reaches paper and in a few edge paths:

- a very large amount crashes the form, and the crash is saved, so the page stays broken after a reload (blocker);
- without JavaScript, a second copy of the template, full of placeholders, prints after the reader's form (major 1);
- an empty slot whose sample looks like data prints as data: "For invoice INV-0001", "Balance still owing R 0.00" (major 2);
- "1.500" or "1.500,50" in an amount field becomes R 1.50 with no warning (major 3);
- the tax invoice calls the customer's VAT number "(optional)" and says "All required items are present" on a R 10 350 invoice without it, where the template says it is required over R5,000 (major 4);
- on a phone, with the Preview tab chosen, the links to missing items do nothing and focus drops to `<body>` (major 5).

## Gate results

I ran all of these myself on `c5157a4`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 6.2s").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!". ESLint and stylelint: clean.
  - `astro check`: "Result (230 files)", 0 errors, 0 warnings.
  - vitest unit + dom: "Test Files 49 passed (49)", "Tests 1206 passed (1206)".
  - Content drift: "af: 36 docs built … Wrote 0 changed files, removed 0, 82 files in total. Content drift: none."
  - vitest content: "Tests 37 passed (37)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14376 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 47 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4671`): **583 passed, 87 skipped, 0 failed** (8.7 min). The skips are the desktop-only and clipboard-only tests on `mobile`, as in earlier packages.
- `pnpm test:a11y`: **202 passed** (9.0 min), every template page in both languages and both themes, plus the two new "interactive states" runs.
- Coverage, `vitest run --project unit --project dom --coverage` limited to the package's files:

  | File | Stmts | Branch | Funcs | Lines |
  | --- | --- | --- | --- | --- |
  | `src/lib/templates/` (all) | 98.71 | 86.99 | 98.75 | 99.11 |
  | `draft.ts` | 100 | 86.36 | 100 | 100 |
  | `format.ts` | 92.30 | 88.88 | 100 | 100 |
  | `ids.ts` | 75 | 100 | 50 | 100 |
  | `placeholders.ts` | 98.97 | 85.99 | 100 | 98.84 |
  | `totals.ts` | 100 | 94.28 | 100 | 100 |
  | `src/scripts/template-form.ts` | 93.37 | 73.57 | 97.91 | 98.34 |

  No floor guards these numbers (minor 4).
- **JS budget.** I followed every `<script src>` and its imports and gzipped each file at level 9: every template page, English and Afrikaans, is **13 files, 52.8 KB raw, 19.8 KB gzipped**, as `docs/testing.md` records. That is well under the 45 KB tool-page budget. `core/register/` is 16.0 KB, so the larger store chunk keeps document pages under 25 KB.
- **WebKit was not run.** It is not available in this environment. It stays on `merge-checklist.md`.

## How I used the templates

I served `dist/` on a second port and drove Chromium as an owner would, then read the print output (print-media screenshots and `page.pdf({ format: 'A4' })`, text from `pdftotext`):

- **Tax invoice, English, ten lines:** washers 3 × R 0.35, a call-out with no quantity, a geyser at `7 899.99`, 2.5 hours at R 385, 12 × `89,90`, a discount of -R 250, a free inspection with quantity 0, `1,234.56`, 8 × R 12.75 and a R 350 disposal line.
  - The PDF shows subtotal R 11 828.90, VAT R 1 774.34 and total R 13 603.24. I checked each line and the sum by hand; VAT is 15% of the subtotal (R 1 774.335) rounded once.
  - Only the sheet prints: no header, footer, AI notice, form, buttons or sources. The date prints as "5 October 2026", and the company line prints as one sentence.
  - It prints on two A4 pages, with the payment details split across them (nit 5).
  - After a reload all ten lines and every value were back.
- **Afrikaans:** the English draft opens on `/af/templates/tax-invoice/`. The sheet says "BELASTINGFAKTUUR", "BTW-registrasienommer", "Subtotaal (BTW uitgesluit)", "BTW @ 15%" and "TOTAAL (BTW ingesluit)", exactly as the Afrikaans template does. The date prints as "5 Oktober 2026", and amounts print as `R 1.21`, the same bytes as in English. A list typed on the Afrikaans quotation opens on the English one as typed, which is expected.
- **Receipt, quotation, invoice and privacy notice**, with and without JavaScript, each printed to PDF (majors 1 and 2, minors 1, 8 and 9).
- **Drafts:**
  - Start next moved INV-0099 to INV-0100 and QUO-9999 to QUO-10000. It kept the business and bank details, emptied the customer and lines, and announced the new number.
  - Clear asks first. "Keep what I typed" has focus, and confirming removes `st.template.invoice.v1`. Focus returns to Clear, and after Start next it stays on its button, which is sensible.
  - A corrupt draft (`{"values":{"businessName":5},"lines":"x"}`) is dropped, and the form opens empty without an error.
  - When `setItem` throws `QuotaExceededError`, the form and preview still work and the "cannot be saved" warning shows.
- **Without JavaScript:** pressing Enter in a field does not submit (no submit button; every `Button` is `type="button"`), so nothing typed ends up in a URL.
- **Security:**
  - The meta CSP is unchanged (`script-src 'self'`), and the probes saw no request off the preview origin.
  - The script writes reader text only through `textContent` and `createElement('li')`, never `innerHTML`.
  - `localStorage` is reached only through `persistentValue`, under `st.template.<slug>.v1`.

## Findings

### blocker 1: A very large amount crashes the form, and the saved draft keeps the page broken

File: `src/scripts/template-form.ts:329`, `:360`, `:365`, `:376`, `:534` (every `formatRand` call), `:154` (`#apply` before the listeners are attached); `src/i18n/index.ts:483-487`

Acceptance item: Build 2 ("line items with computed Subtotal, VAT 15% and Total, formatted with `formatRand`") and Build 3 (Clear); correctness lens, no silent data loss.

What is wrong:
- `formatRand` throws `RangeError` above `MAX_RAND_AMOUNT` (about R 90 trillion). `totals.ts` has no upper bound, and `render()` calls `formatRand` with no guard.
- One line of 1 000 000 000 × R 100 000 (a held-down zero on a phone keyboard is enough) throws in the `input` handler. `#save()` has already run, so the draft holds the line. The totals stay at the last value they showed ("TOTAL R 0.00" in my run), and every later keystroke throws again.
- After a reload, `connectedCallback` throws inside `#apply()` → `render()`, before the `input`, `click` and store listeners are attached:
  - nothing typed is saved any more (I typed a business name; the draft still held only the big line);
  - Print, Start next and Clear do nothing (the Clear dialog did not open);
  - the totals and preview are stale.
- The only way out is "Clear all my data" on `/about/`, which also removes the reader's checklist ticks and every other draft.

Why it matters: the reader loses the page, and what they type afterwards, from one typo. They cannot recover it on the page itself.

How to reproduce: on `/templates/quotation/`, type a description, quantity `1000000000` and unit price `100000`. The console shows "RangeError: Amount too large to show exact cents". Reload, type in any field, and look at `st.template.quotation.v1`, then press Clear.

Suggested fix:
- Treat an amount whose line total or grand total is above `MAX_RAND_AMOUNT` as invalid, with the same message and `aria-invalid` as "not a number". Do this in `lineResult`/`totalsOf`, or behind a safe formatter in the element, so `render()` can never throw.
- Add a dom test that restores such a draft and still saves the next keystroke and clears.

### major 1: Without JavaScript, a second copy of the template, full of placeholders, prints after the form

File: `src/styles/print.css:135-143` (this package's change), `src/components/templates/TemplateTool.astro:319-322`, `tests/e2e/nojs.spec.ts:186-210`

Acceptance item: Build 4 ("Without JavaScript the page shows the form fields as a printable sheet, so printing still works"); cross-package edit to `print.css`.

What is wrong:
- The new print rule makes every ancestor of a `[data-print-sheet]` element `display: block !important`.
- `.st-tool__preview` is the ancestor of the preview sheet, so the rule overrides `html:not(.js) .st-tool__preview { display: none }`, which is not `!important`.
- Without JavaScript, both sheets print: first the reader's form, then the preview, which no script ever filled.
- The no-JS receipt printed the form and then "RECEIPT / [YOUR BUSINESS NAME] / [Phone] | [Email] … Amount received R 0.00 … For invoice INV-0001 … Balance still owing R 0.00".
- Page counts without JavaScript: quotation 4, tax invoice 3, invoice 3, privacy notice 3, receipt 2.

Why it matters:
- The fallback's printout ends with a document that looks finished but contradicts what the reader wrote (R 0.00 received, another invoice number).
- The no-JS test passes because it never checks that the preview is hidden under print media.

How to reproduce: open `/templates/receipt/` with JavaScript off, type a business name, then `emulateMedia({ media: 'print' })` or print to PDF.

Suggested fix:
- Make the no-JS hide win in print, for example `html:not(.js) .st-tool__preview { display: none !important }` inside `@media print`. Or put `data-print-sheet` on the preview only when the script runs.
- Add `.st-tool__preview` and `.st-tsheet` to the "hidden" list in the no-JS print test.

### major 2: An empty slot whose sample looks like real data prints as that data

File: `src/components/templates/SheetRuns.astro:253-256`, `src/scripts/template-form.ts:283`, `src/components/templates/TemplateSheet.astro:223-226`

Acceptance item: correctness of what prints (Build 2, live A4 preview that prints); D5 ("nothing implies more certainty than the source").

What is wrong:
- An empty slot shows the template's sample text and, in print, loses its highlight on purpose.
- That is harmless for bracketed placeholders ("[Customer name]" is visibly unfilled). But the parser also turns samples written as plain values into fields (`R 0.00`, `INV-0001`), and those print as values.
- On the receipt, "For invoice", "Amount received" and "Balance still owing" left empty printed as "For invoice INV-0001" and "Balance still owing R 0.00". The first points at an invoice that may be someone else's; the second tells the customer nothing is owed.
- The same happens with any number field the reader empties: the slot prints `INV-0001`.

Why it matters: these pages are handed to customers. A blank on paper can be filled by hand; a wrong value looks deliberate. The required-items count does list the field, but printing never blocks, by design.

How to reproduce: on `/templates/receipt/`, fill everything except "For invoice" and "Balance still owing", then print.

Suggested fix: in print, show an empty slot whose sample is a value (`money`, a document number other than the document's own default, `4XXXXXXXXX`) as a blank write-in line, or as the bracketed label ("[For invoice]"). Keep the sample on screen. Add an e2e print check for the receipt.

### major 3: "1.500" or "1.500,50" in an amount silently becomes R 1.50

File: `src/lib/templates/totals.ts:29-38`

Acceptance item: Build 2 (totals right to the cent; `formatRand`) and correctness of what prints; i18n lens (both languages).

What is wrong:
- `parseNumber` treats any dot as the decimal point when the text has one. So `1.500,50` becomes 1.5005, and `parseCents` gives 150 cents. `1.500` (fifteen hundred, written with a dot between the thousands, as many Afrikaans writers and anyone used to European formats do) becomes R 1.50.
- No error is shown: the value counts as a valid number.
- My receipt with "Amount received" `1.500,50` printed "Amount received R 1.50".
- More than two decimals in an amount (`0.335`) are also accepted and rounded silently (nit 3).

Why it matters: the printed amount is wrong by a factor of 1000, with no warning, on the document's most important line.

How to reproduce: `parseCents('1.500,50')` gives `150`, and `parseCents('1.500')` gives `150`. Or type either into the receipt's "Amount received" and look at the preview.

Suggested fix: for money and unit prices, reject what is ambiguous:
- a dot followed by exactly three digits and no other decimal part;
- both a dot and a comma, with the dot first;
- more than two decimals.
Mark each as "not a number" with an example. Or accept `1.500,50` as the comma-decimal form, but never read it as 1.5005. Add these inputs to `totals.test.ts`.

### major 4: The tax invoice calls the customer's VAT number optional and says "All required items are present" without it

File: `src/lib/templates/placeholders.ts:26-28` and `:458` (`required: !instruction`), `src/components/templates/TemplateField.astro:81`, `src/scripts/template-form.ts:403-406`

Acceptance item: D5 ("Nothing implies more certainty than the source"; templates state their rules from the markdown) and Build 2 (soft validation).

What is wrong:
- The tax-invoice template words this slot as "[Customer VAT number, if they are a vendor — required on invoices over R5,000]". Its own list says a full tax invoice must show "their VAT number if they are registered", and its notice says "If one required item is missing, the whole invoice can be disallowed".
- The form labels the field "Customer VAT number **(optional)**". It is left out of the count, so a R 10 350 tax invoice with no customer VAT number shows "All required items are present." I reproduced this.
- The company line on the quotation ("— this is required by law") gets the same "(optional)" label. Its hint carries the condition, so that case is less sharp.

Why it matters:
- "(optional)" and "All required items are present" are the tool's own words, and they say more than the template does. A VAT-registered customer whose input tax is disallowed is exactly the harm the template warns about.
- The plan asks that checklists read as reminders, not proof of compliance. "All required items are present" is a compliance claim.

How to reproduce: fill every required field of `/templates/tax-invoice/` with one R 9 000 line, and leave "Customer VAT number" empty.

Suggested fix:
- Label a conditional slot with its condition ("only if …", from the template's own words), not "(optional)".
- On the tax invoice, count the customer VAT number once the subtotal passes the template's threshold, or show the template's condition next to the count.
- Reword `templates.allPresent` so it does not claim completeness, for example "Every item this form checks is filled in."

### major 5: On a phone, with the Preview tab chosen, the links to missing items do nothing and focus drops to the page

File: `src/components/templates/TemplateTool.astro:196-204` and `:301-306`, `src/scripts/template-form.ts:85-98`

Acceptance item: Build 2 (soft validation with a link to each missing item; mobile Fill in / Preview tabs); accessibility lens (focus management).

What is wrong:
- The required items sit under both panes. On a narrow screen, with the Preview tab chosen, the form pane is `display: none`.
- Activating "Business name" in the list goes to `#st-tf-businessName`, an input that is not rendered. Nothing scrolls, the tab does not change, and `document.activeElement` becomes `<body>`. I measured this at 390px.

Why it matters:
- Checking the preview and then fixing what is missing is the natural phone flow, and phones are this site's main audience.
- A keyboard or screen-reader user is thrown to the top of the document with no feedback.
- The e2e test for the links runs only on the "Fill in" pane.

How to reproduce: at 390px on `/templates/tax-invoice/`, choose Preview, then activate the first link under "Required items".

Suggested fix: handle clicks on `[data-required-item] a` in `<st-template-form>`. Select the "form" view, then focus the target field. Add a dom test and an e2e test on the `mobile` project.

### minor 1: The sheet prints a stray space before punctuation after a slot

File: `src/components/templates/SheetRuns.astro:255-259` (built output: `…data-sample="[X]">[X]</span> % before work starts`)

Acceptance item: correctness of what prints.

What is wrong: the built HTML has a space between a field's `</span>` and the text run after it. The printed quotation reads:
- "Deposit of 50 % before work starts.";
- "Balance due [on completion / within X days of invoice] .";
- "available at [link] .".

The `.prettierignore` entry was meant to prevent this, but the space comes from the generated markup, not from formatting.

Suggested fix: find where the whitespace enters (the `Inline` call or the map's line breaks), and add a unit or e2e check that the sheet text has no " ." or " %".

### minor 2: A line whose quantity or price is not a number still prints, while the total leaves it out

File: `src/scripts/template-form.ts:346-366` and `:389-392`, `src/lib/templates/totals.ts:73-75`

Acceptance item: correctness of what prints (totals).

What is wrong:
- With a quantity of "2 hrs" on a R 400 line, the form marks the field. But the preview, and the printout, show "Labour 2 hrs R 400.00" with an empty amount, and the totals leave the line out (R 9 000 + VAT, not R 9 800 + VAT).
- The required-items count still says everything is present, because one other line is valid.
- On paper, the total no longer matches the lines shown.

Suggested fix: while any used line is invalid, show it in the required-items area ("Line 2: the quantity is not a number"), or print the totals as blank write-in lines, as the no-JS form does.

### minor 3: "VAT rounded once on the subtotal" is not guarded

File: `tests/unit/templates/totals.test.ts:90-106`, `tests/dom/template-form.test.ts:186`, `tests/e2e/templates.spec.ts:54`

Acceptance item: Tests ("the totals maths (rounding to cents, VAT on a line total)").

What is wrong:
- I changed `totalsOf` to sum the VAT of each line, each rounded, instead of rounding the subtotal's VAT once. All 82 template unit and dom tests still pass, and the e2e figures (R 1.05 and R 450) give the same VAT either way.
- Two lines of R 0.03 tell the methods apart: rounded once, the VAT is R 0.01; per line, it is R 0.00.

Suggested fix: add such a case to `totals.test.ts`, and use lines whose per-line rounding differs in the e2e test.

### minor 4: No coverage floor for the templates code, and branch coverage is under the 90% target

File: `vitest.config.ts:70-79`

Acceptance item: C5 (`test`: coverage ≥90% on `src/lib/**`); general quality.

What is wrong: `src/lib/templates/**` is at 86.99% branches, and `placeholders.ts` at 85.99%. No threshold covers them, unlike the store and the content pipeline. `template-form.ts` (73.57% branches) is outside every coverage `include`.

Suggested fix: add floors just under the measurement for `src/lib/templates/**`, as WP-30 did. Raise branch coverage of `placeholders.ts` and `draft.ts` (lines 77, 110 and 131 are untested branches), or record the gap in `backlog.md`.

### minor 5: The privacy notice's fixed lines cannot be removed, though the template says to delete any line that is not true

File: `src/lib/templates/placeholders.ts:708-721` (a paragraph with no slot becomes fixed text)

Acceptance item: D5 faithfulness; Build 2 (a form grouped like the template).

What is wrong:
- The template tells the reader to "delete any line that is not true for your business". Only the four lists are editable.
- The other paragraphs always print, for example "We keep records for five years, as tax law requires" and the whole Marketing section. A business that sends no marketing cannot take that section out.

Why it matters: a privacy notice that states practices the business does not follow is the opposite of what the template asks.

Suggested fix: let each fixed paragraph of the privacy notice be switched off ("Leave this out"), saved in the draft. Or record the limit in the backlog and say so in a hint on the page.

### minor 6: The "Date" link in the required items is 36px wide

File: `src/components/templates/TemplateTool.astro:197-203`

Acceptance item: B5 (44px targets, AAA target size adopted).

What is wrong: at 390px, the "Date" link on the quotation measured 36 × 44 px. Each required-item link is the only thing on its line but shrinks to its text.

Suggested fix: make the links `display: block` or give them `min-inline-size: var(--st-target)`.

### minor 7: The customer's VAT number prints with no label

File: `src/lib/templates/placeholders.ts:440-441` (an instruction slot in running text), `src/components/templates/TemplateSheet.astro:52-66`

Acceptance item: correctness of what prints.

What is wrong: the tax invoice prints the customer's VAT number as a bare ten-digit line under their address ("4 Oak Street, Polokwane / 4987654321"). The template's slot is all instruction, so nothing labels the value on paper. A reader of the invoice, or SARS, has to guess what the number is.

Suggested fix: print a short label for this slot, from the template's own words ("Customer VAT number:"), in both languages.

### minor 8: The no-JS printout shows the date pattern "mm/dd/yyyy" and the focus ring

File: `src/components/templates/TemplateTool.astro:387-395`

Acceptance item: Build 4 (no-JS printable sheet).

What is wrong:
- An empty `type="date"` input prints Chromium's "mm/dd/yyyy" and a calendar icon. That is a US order on a South African document, where the reader writes the date by hand.
- The field that had focus prints with the accent focus border.

Suggested fix: in print, hide the date input's pattern when it is empty (for example `:placeholder-shown`, or a `color: transparent` rule on its datetime parts) and remove the focus outline.

### nit 1: Each line amount is its own live region

File: `src/components/templates/TemplateLines.astro:233-238`

`<output>` has an implicit `status` role. So each keystroke in a price announces the line amount, and the `aria-live` totals then announce again. Consider `role="none"`/`aria-live="off"` on the line outputs, and let the totals region speak.

### nit 2: `templates.vat` is no longer used

File: `src/i18n/en.json`, `src/i18n/af.json`, `src/i18n/index.ts:139`

The VAT label now comes from the template ("VAT @ 15%"). `templates.vat` is referenced only by `tests/unit/i18n.test.ts:531`. Remove it with the other keys, or use it.

### nit 3: A unit price is rounded to cents before it is multiplied

File: `src/lib/templates/totals.ts:67-77`

3 × R 0.335 gives R 1.02 (R 0.34 × 3), not R 1.01 (R 1.005 rounded once). The design-system table says "Line = quantity × unit price, rounded". Either multiply before rounding, or reject more than two decimals in a price (see major 3).

### nit 4: Start next increments the last group of digits, which may be a year

File: `src/lib/templates/totals.ts:105-111`

`REC-0001/26` becomes `REC-0001/27`. The templates write `INV-0001`, so this is an edge case. A sentence in the Start next hint, or incrementing the first long group of digits, would cover it.

### nit 5: The payment-details table can split across two pages

File: `src/components/templates/TemplateSheet.astro:67-83`

A ten-line tax invoice prints on two A4 pages, with "Branch code" and "Reference" alone on page 2. `break-inside: avoid` on the short details tables would keep them together.

## Cross-package edits

- **`scripts/dist/check-trust.ts`:** `Bank` in `SAME_IN_AFRIKAANS` and `Reg. No.` in `OTHER_NAMES`. Both are the Afrikaans templates' own words, and the check still passes on 47 Afrikaans pages. Safe.
- **`src/styles/print.css`:** the fix for the sheet being squeezed into 272px is right for the JavaScript path: the sheet printed at full width. But because of the same rule, the unfilled preview prints without JavaScript (major 1).
- **`.prettierignore`:** justified by the same reason as `Inline.astro`. It did not remove the stray spaces (minor 1).
- **Removed `templates.*` keys:**
  - `astro check` and the dictionary parity tests pass, so nothing still calls a removed key.
  - The required-content strings that duplicated the tax-invoice rules are gone, and the rules now come from the markdown. That is better for D5, and closing WP-12 P3 in `backlog.md` follows from it.
  - `templates.vat` is left behind (nit 2).
- **`src/layouts/Doc.astro`:** template documents keep the breadcrumb, AI notice, translation notice, "An AI checked the legal rules … on 13 September 2026", sources and pager. `pages.spec.ts` "D5 trust pieces" passes on every template page.

## What I checked and found right

- **Totals.** The arithmetic is in whole cents with no float drift. Rounding is half away from zero. An empty quantity counts as 1, a zero quantity gives R 0.00, and negative lines work as discounts. `1 500,50`, `1,500.50` and `89,90` parse. `formatRand` gives the same `R 1 234.56` in both languages.
- **Parser.** Field names come from block ids, so a draft typed in one language opens in the other, as the e2e test and my probe show. Labels and hints are the template's words, and the rules shown come from the markdown before and after the template.
- **Drafts.** Each template has its own key. Only values that differ from the defaults are saved, and a first visit writes nothing. A value typed before the module connects is kept. Changes from another tab and from "Clear all my data" are applied. The schema rejects corrupt drafts.
- **Mutations.**
  - With `#save()` removed from the input handler, the dom test fails.
  - When Clear no longer waits for the dialog, the dom test fails.
  - The JavaScript print e2e test asserts that the form is hidden under print media.
- **Accessibility.**
  - Fieldsets and legends follow the template's groups, and every input has a label. Errors are linked through `aria-describedby` and `aria-invalid`.
  - The tab roles are only added while the tabs are on screen, and arrow keys, Home and End work.
  - The clear dialog focuses Cancel and returns focus.
  - Under `prefers-reduced-motion` nothing in the tool animates.
  - axe is clean on every template page.
- **Afrikaans tax-invoice wording.** It matches the Afrikaans template exactly. Whether "Belastingfaktuur" satisfies the Afrikaans text of section 20(4) is still open in `WP-40-owner-items.md`. The page prints what the template says, which is the right behaviour until the owner decides.
- **Profile hook.** `src/lib/templates/profile.ts` is clearly named and returns `null`, `prefill()` is tested, and `backlog.md` has the row the brief asks for.
