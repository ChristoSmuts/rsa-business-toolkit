# WP-32 review pass 2 (fillable templates)

- **Reviewer:** an independent reviewer agent, a different instance from pass 1. It did not write this code.
- **Date:** 6 October 2026
- **Commit reviewed:** `731e64c` ("docs(templates): record the JavaScript budget after review pass 1"), the tip of `worktree-agent-a253e59a4d4c5ad19`. I reset a clean worktree to it.
- **Scope:** the whole diff `git diff 61bb68c 731e64c`, not only the fixes: 36 files, +5662 / -297. The pass 1 fixes are in `4ff755b`, `2907470`, `f98ed22` and `731e64c`.

## Verdict

**Clean: 0 blocker, 0 major, 5 minor, 6 nit.**

Every blocker and major from pass 1 is fixed, and I checked each one in the browser and by mutation:

- A huge line is refused with a message, the page keeps saving after a reload, and Clear still works.
- Exactly one sheet prints, with and without JavaScript.
- An empty slot prints as a blank line, never as its sample. The receipt no longer prints "INV-0001" or "R 0.00" for slots left empty.
- `1.500` and `1,500` are refused with their own message, and `1.500,50` is R 1 500.50.
- The customer VAT number shows the template's own condition and counts only above R5,000. The count says "Every item this form checks is filled in", under a note that it does not check the document is correct.
- On a phone, a missing item's link leaves the Preview tab and focuses its field.

What remains is print layout, edge input and one stray badge. None of it puts a wrong amount or a wrong rule on paper.

## Gate results

I ran all of these myself on `731e64c`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 7s").
- `pnpm gate:fast`: exit 0.
  - "All matched files use Prettier code style!"; ESLint and stylelint clean.
  - `astro check`: "Result (232 files)", 0 errors, 0 warnings.
  - vitest unit + dom: "Test Files 50 passed (50)", "Tests 1241 passed (1241)".
  - "af: 36 docs built … Wrote 0 changed files, removed 0, 82 files in total. Content drift: none."
  - vitest content: "Tests 37 passed (37)".
- `pnpm build`: exit 0.
  - "96 page(s) built".
  - "dist:audit: 96 HTML file(s), 14384 URL(s) checked under base /business-toolkit/. No problems."
  - "dist:trust: 72 document page(s), each with its AI notice and sources; 47 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4701`): **598 passed, 87 skipped, 0 failed** (8.1 min). The skips are the desktop-only and clipboard-only tests on `mobile`, as in pass 1.
- `pnpm test:a11y`: **202 passed** (7.4 min).
- Coverage (`vitest run --project unit --project dom --coverage`): `src/lib/templates` 98.97 / 92.35 / 100 / 99.29 (statements, branches, functions, lines). `template-form.ts` is 93.52 / 76.17 / 98.14 / 98.29. Both are above the new floors.
- **JS budget.** I followed every `<script src>` and its imports in `dist/` and gzipped each file at level 9. The tax invoice, receipt and Afrikaans quotation pages each load **13 files, 53.1 KB raw, 20.2 KB gzipped**. That matches `docs/testing.md` (20.3 KB) and is well under the 45 KB budget. `core/register/` is 15.2 KB.
- **WebKit was not run.** It is not available here. It stays on the merge checklist.

## How I used the templates

I served a copy of `dist/` on a second port and drove Chromium as an owner would. I read the output with `page.pdf({ format: 'A4' })` and `pdftotext`. The `@page` 15 mm margins apply: text starts at 42.75 pt.

- **Tax invoice, English and Afrikaans, six lines:**
  - The lines were 3 × `0.35`, a call-out with no quantity at `450`, `7 899.99`, 2.5 × `R385`, 12 × `89,90` and a discount of `-250`.
  - Subtotal R 10 142.34, VAT R 1 521.35 (15% of R 10 142.34 is R 1 521.351) and total R 11 663.69, all right to the cent.
  - The page is one A4 sheet with no site chrome. It shows "6 October 2026" and "6 Oktober 2026", and "BELASTINGFAKTUUR", "BTW @ 15%" and "TOTAAL (BTW ingesluit)" as the Afrikaans template has them.
  - The customer VAT number is listed as missing with the template's own words, and when filled it prints as "Customer VAT number: 4987654321".
  - A reload keeps every value and line.
- **Quotation, invoice, receipt, privacy notice:** I filled each in English and Afrikaans, with and without JavaScript, and printed each to PDF.
  - The company line prints as one sentence.
  - The lists print one item per line.
  - "Deposit of 50% before work starts." has no stray space.
  - The receipt's empty "For invoice" and "Balance still owing" print as blank lines.
  - Every item the receipt's template lists is on the sheet.
- **Numbers as owners type them:** I ran 25 amount inputs and 9 quantities through `readCents` and `readNumber`.
  - `R1,500.00`, `R1 500,00`, `R 1.500,00`, `1,500,000.00`, `2,50`, `.50` and `R-250` read correctly.
  - `1,500`, `12,000`, `R250.000` and `0.335` are refused, each with a message.
  - Nothing is read as a different amount.
- **Drafts:**
  - After a reload, a huge line keeps its description and loses only the price, and typing still saves.
  - A corrupt draft (`businessName: 5`, `lines: "x"`, not JSON, `[]`) keeps what is valid and opens without an error.
  - When `setItem` throws, and when reading `localStorage` throws, the preview still works and the warning shows.
  - Start next moved INV-0099 to INV-0100. It kept the business and bank details, emptied the customer and the lines, moved the reference with the number, announced the new number, and left focus on its button.
  - The draft opens on the Afrikaans page. There, Clear focuses "Hou wat ek getik het". Confirming removes `st.template.tax-invoice.v1` and returns focus to Clear.
- **Phone (390 px):** on the Preview tab, the first missing link is 113 × 44 px. It switches to Fill in and focuses `st-tf-businessName`. No control in the tool is under 44 px.
- **Security:** no `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `set:html` in the diff. Reader text goes through `textContent` and `createElement('li')`, and the textarea default through `set:text`. `localStorage` is reached only through `persistentValue`. No literal colours, and no `href="/…"` literals.
- **Mutations:** each one below made at least one test fail. I reverted each, and none is committed.
  - Removing the ambiguous-number check: 4 tests fail (unit and dom).
  - Counting the conditional item at any total: 2 dom tests fail.
  - Writing the sample into an empty slot: 1 dom test fails.
  - Not switching tabs in `goTo`: the major 5 dom test fails.
  - Not moving `data-print-sheet` to the preview: 1 dom test fails.
  - Removing the line-amount limit: 2 tests fail, including "never throws on a huge line".

## Findings

### minor 1: Short quotations print on two pages with the signature block split, and the "tables never split" fix has no effect

File: `src/components/templates/TemplateSheet.astro:235-239`, `docs/design-system.md` (Fillable templates, Preview row: "Short tables never split across two pages")

Acceptance item: Build 2 (a live A4 preview), Build 3 (print); pass 1 nit 5.

What is wrong:
- A quotation with one line prints on two A4 pages, with only "Date:", the last signature line, on page 2. With two lines, the whole "Acceptance" block moves to page 2.
- An empty quotation fits on one page, so in practice every real quotation is two sheets.
- `break-inside: avoid` on `.st-tsheet__details` does not hold. A ten-line tax invoice still prints "Reference INV-0001" alone on page 2, exactly as pass 1 nit 5 reported, and the docs now say it cannot happen.
- A ten-line invoice splits "Payment is due by … ." across the page break. The privacy notice prints "Last updated:" alone on page 2.

Why it matters: the customer signs across two sheets, and the design system claims a behaviour that the PDF does not show. Nothing on the page is wrong, so this is not a major.

How to reproduce: on `/templates/quotation/`, type a business name and one line, then `page.pdf({ format: 'A4' })`. `pdfinfo` reports 2 pages, and page 2 holds "Date:".

Suggested fix:
- Keep the last heading with its block (for example, wrap each section of the sheet and give it `break-inside: avoid`). Tables inside a grid item do not get it from Chromium today.
- Tighten the print spacing so a three-line quotation fits on one page.
- Add a page-count check to the PDF test for the quotation, not only for the tax invoice.

### minor 2: A field longer than 5 000 characters is saved, then dropped without a word on the next load

File: `src/lib/templates/draft.ts:49-51` and `:68-71`; `src/components/templates/TemplateField.astro:100-111` (no `maxlength`)

Acceptance item: Tests and correctness ("reloading (draft kept)"); no silent data loss.

What is wrong:
- `textSchema` drops any value over `MAX_VALUE_LENGTH` (5 000) when the draft is read. The controls have no `maxlength`, and `persistentValue.set` does not validate, so the long value is saved.
- I typed 60 items (5 329 characters) into "What is included" on the quotation and reloaded. The field came back empty. The next keystroke saves the draft without it, so it is gone for good.

Why it matters: it is rare, because 5 000 characters is a long scope list. But when it happens, the reader loses the whole field with no warning, in the one section the template says prevents disputes.

How to reproduce: fill `#st-tf-what-is-included-1` on `/templates/quotation/` with more than 5 000 characters, then reload.

Suggested fix: put `maxlength={MAX_VALUE_LENGTH}` on every text control and textarea, so the limit is visible while typing. Or truncate rather than drop in `draftSchema`. Add a dom test that saves and restores a value at the limit.

### minor 3: A value the form refuses still counts as filled in, and prints blank

File: `src/scripts/template-form.ts:491-496` (`#renderRequired`), `:627-632` (`display`)

Acceptance item: Build 2 (soft validation, "6 of 7 required items present").

What is wrong:
- An item counts as present when its text is not empty, whether or not the form can read it.
- On the receipt I typed `R1,500` in "Amount received", which is a very common way to write an amount here. The field shows the "could be read as two different amounts" message, which is right. But the count says "Every item this form checks is filled in.", the preview shows the highlighted sample, and the PDF prints "Amount received" with a blank line.
- On the quotation, `30 days` in "valid for … days" and `50%` in "Deposit of …%" behave the same way: "This quote is valid for days." and "Deposit of % before work starts."

Why it matters: the field's own message is visible, so the owner is told. But the count, which is the summary they check before printing, says the opposite about the receipt's most important line. On a phone with the Preview tab chosen, the count is what they see.

How to reproduce: fill every field of `/templates/receipt/` except the two invoice fields, with "Amount received" `R1,500`. Then read `[data-required-count]` and print.

Suggested fix: count a `money` or `number` field as present only when `readCents` or `readNumber` returns `ok`. Then the missing list links to it, just as an unreadable line keeps "lines" missing today. Add a dom test.

### minor 4: The printed privacy notice carries the site's "Official" badge inside a sentence

File: `src/components/templates/SheetRuns.astro:35` (other runs go through `Inline`), `src/components/content/Inline.astro:87` (`isOfficial` adds `<Badge variant="official">`)

Acceptance item: Build 3 ("a sheet-only print stylesheet"); correctness of what prints.

What is wrong:
- The regulator link in "Your rights" goes through `Inline`, which adds the site's "Official" badge after every official link.
- The badge prints on the notice the business publishes or sends: "…complain to the Information Regulator at inforegulator.org.za (https://inforegulator.org.za/) Official ." In Afrikaans it lands in the middle of the sentence: "…by inforegulator.org.za (https://inforegulator.org.za/) Amptelik kla."
- The same happens without JavaScript, because the form prints the same runs.

Why it matters: it is site chrome on a customer-facing document, and in Afrikaans it breaks the sentence. It appears on every privacy notice printed in either language.

How to reproduce: print `/templates/privacy-notice/` or `/af/templates/privacy-notice/` to PDF and read the "Your rights" paragraph.

Suggested fix: render links in the sheet without the badge (an `Inline` option, or a `link` branch in `SheetRuns`), or hide `.st-tsheet .st-badge` and `.st-tform .st-badge` in print. Add "Official" and "Amptelik" to the printed-text check.

### minor 5: Leaving out a section's only paragraph leaves its heading printed over nothing

File: `src/scripts/template-form.ts:355-358` (only the paragraph gets `data-omitted`), `src/components/templates/TemplateSheet.astro:47-52`

Acceptance item: pass 1 minor 5 ("Leave this out"); correctness of what prints.

What is wrong: on the privacy notice, ticking "Leave this out of the document" under "Marketing" removes the paragraph, but the heading "Marketing" ("Bemarking") still prints, followed directly by "Your rights". "How long we keep it" behaves the same way. The same happens without JavaScript.

Why it matters: the template asks the reader to "delete any line that is not true for your business". A business that sends no marketing gets an empty "Marketing" section on its notice, which a customer may read as a missing part.

How to reproduce: on `/templates/privacy-notice/`, tick the box under "Marketing" and print.

Suggested fix: when every paragraph between two headings is left out, hide the heading too, in the preview and in the no-JS form (`:has()` works for both). Add the case to the e2e print check.

### nit 1: A discount cannot be typed as "-R250", and the iPhone keypad has no minus key

File: `src/lib/templates/totals.ts:69-75`, `src/components/templates/TemplateLines.astro:77`, `:99` (`inputmode="decimal"`)

`R-250` and `- 250` are read, but `-R250` is "not a number". The example in the message (`1 500.50`) does not show how to write a negative amount. `inputmode="decimal"` on iOS shows a keypad with no minus key, so a discount line cannot be typed on an iPhone at all. The templates show no discount, so this is polish. Consider accepting `-R` and using `inputmode="text"` (or `numeric` with a pattern) for the unit price.

### nit 2: A quantity like "1.500" gets the generic message

File: `src/lib/templates/messages.ts:27-30`

For a quantity, an ambiguous `1.500` shows "We cannot read this number. Write it like 2." The value is a number; the problem is the dot. The amount fields already have the clearer `templates.ambiguous` wording. A quantity version would help.

### nit 3: The invoice's "Payment is due by" is free text and its late-payment terms say "(optional)"

File: `src/lib/templates/placeholders.ts:480-494` (an instruction in running text is not required and has no condition)

The "Due date" above is a date picker that prints "6 October 2026". "Payment is due by [date]" is a text field, so the two can differ in format on the same invoice. "State your late payment terms here (optional)" is the only "(optional)" left in the five forms, though the template words it as an instruction. Neither is carried by Start next, although both are usually the same on every invoice.

### nit 4: Without JavaScript, the invoice's "Reference" prints blank

File: `src/lib/templates/placeholders.ts:670-682` (`follows`, default `''`)

The reference follows the invoice number only through the script. On the no-JS printout, "Reference" is an empty line, directly above "Please use the invoice number as your payment reference." The no-JS form is a fallback (see the backlog row), so this is polish. A `placeholder` with the number, or the number as the default, would print it.

### nit 5: When a line cannot be read, the totals go blank without saying why to a screen reader

File: `src/components/templates/TemplateLines.astro:141-159`

The `aria-live` totals region updates to empty values, and the explanation `[data-totals-blocked]` is outside it. A screen-reader user hears "Totals" with no amounts and no reason. Moving the message inside the live region, or announcing it, would close the gap.

### nit 6: The new coverage floors are not run by any gate

File: `vitest.config.ts:84-85`

The floors only apply when someone runs `vitest --coverage`, and neither `gate:fast`, `gate` nor CI does that. This is the project's existing pattern (WP-30's floors are the same), so it is not this package's to fix. But pass 1 minor 4 is closed only on paper until a gate runs coverage.

## Pass 1 findings, rechecked

| Pass 1 | Status at `731e64c` |
| --- | --- |
| blocker 1 (huge amount) | Fixed. Limits in `totals.ts`, `safeRand`, and `dropOutOfRange` on load. Checked in the browser and by mutation. |
| major 1 (no-JS second sheet) | Fixed. `data-print-sheet` moves to the preview on connect. The no-JS PDFs hold the form only. |
| major 2 (samples print as data) | Fixed. Empty slots have no text, and print draws a blank line. |
| major 3 (`1.500` read as 1.50) | Fixed. Refused with its own message. See nit 2 for quantities. |
| major 4 (VAT number "optional", "All required items are present") | Fixed. The template's condition is shown, the item counts above R5,000, and the wording is new. See minor 3 for a related gap in the count. |
| major 5 (phone links) | Fixed. Checked at 390 px. |
| minor 1 (stray space) | Fixed. |
| minor 2 (unreadable line prints) | Fixed. Totals go blank and the form says why. |
| minor 3 (VAT rounding not guarded) | Fixed. Two lines of R 0.03 are tested. |
| minor 4 (coverage floor) | Floors added. See nit 6. |
| minor 5 (privacy lines fixed) | Fixed with "Leave this out". See minor 5 for the heading. |
| minor 6 (36 px link) | Fixed: 113 × 44. |
| minor 7 (VAT number unlabelled) | Fixed: "Customer VAT number: …". |
| minor 8 (date pattern, focus ring on no-JS print) | Fixed. |
| nit 1 (`<output>` live regions) | Fixed. |
| nit 2 (`templates.vat`) | Removed. |
| nit 3 (price rounded before multiplying) | Fixed: more than two decimals are refused. |
| nit 4 (Start next increments a year) | Fixed for `REC-0001/26`. |
| nit 5 (payment details split) | **Not fixed.** See minor 1. |

## Cross-package edits

They are as pass 1 described. `print.css` now makes ancestors plain blocks without bringing back the no-JS second sheet. `Doc.astro` keeps the AI notice, the checked date and the sources on all ten template pages (dist:trust), and drops the contents list only for fillable templates. The backlog rows for the profile hook, the no-JS slot layout, the early buttons and `MAX_LINES` are reasoned and still accurate.
