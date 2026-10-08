# WP-32 review pass 3 (fillable templates)

- **Reviewer:** an independent reviewer agent. It is a different instance from passes 1 and 2, and it did not write this code.
- **Date:** 6 October 2026
- **Commit reviewed:** `b2b8f23` ("docs(templates): record the review pass 2 fixes and the remaining nits"), the tip of `worktree-agent-a253e59a4d4c5ad19`. I reset a clean worktree to it.
- **Scope:** the whole diff `git diff 61bb68c b2b8f23`: 37 files, +6149 / -297. The pass 2 fixes are in `cfb397c` (print sections, the heading rule, the badge) and `72f9779` (`maxlength`, readable numbers, `-R` amounts, the quantity message, required instructions, the totals' reason in the live region). I gave those extra attention.

## Verdict

**Clean: 0 blocker, 0 major, 1 minor, 5 nit.**

Pass 2 was clean, and this pass is clean too, so WP-32 has two consecutive clean passes. The second was by a different reviewer instance.

I checked every pass 2 fix in the browser and by mutation:

- A realistic quotation prints on one A4 sheet in both languages.
- Each printed section is one block that does not split.
- No "Official" or "Amptelik" badge prints.
- Leaving out "Marketing" also leaves out its heading, with and without JavaScript.
- `maxlength` is 5 000 on every text control, and an over-long draft value is cut to the limit, not dropped.
- An amount the form refuses is not counted as filled in.
- `-R250` is read as a discount.

The remaining findings are edge cases in print layout, plus test and wording gaps. None of them puts a wrong amount, a sample value or a wrong rule on a document.

## Gate results

I ran all of these myself on `b2b8f23`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 10.2s").
- `pnpm gate:fast`: exit 0.
  - "All matched files use Prettier code style!"; ESLint and stylelint clean.
  - `astro check`: "Result (232 files)", 0 errors, 0 warnings.
  - vitest unit + dom: "Test Files 50 passed (50)", "Tests 1246 passed (1246)".
  - "Content drift: none."
  - vitest content: "Tests 37 passed (37)".
- `pnpm build`: exit 0.
  - "96 page(s) built".
  - "dist:audit: 96 HTML file(s), 14386 URL(s) checked under base /business-toolkit/. No problems."
  - "dist:trust: 72 document page(s), each with its AI notice and sources; 47 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` (`PW_PORT=4721`): **608 passed, 88 skipped, 0 failed** (10.0 min). Nothing was flaky. The skips are the desktop-only, clipboard-only and `page.pdf` tests on `mobile`.
- `pnpm test:a11y`: **202 passed** (7.4 min).
  - My first run reported 7 failures, all `ENOENT` on trace files under `test-results/`. They happened because I started a second Playwright run in the same worktree, which emptied that folder.
  - I reran on its own, and all 202 passed. The failures were my doing, not the package's.
- **JS budget.** I followed every `<script src>` and its imports in `dist/`, and gzipped each file at level 9.
  - Quotation, invoice and tax invoice (English), and receipt and privacy notice (Afrikaans): each page loads **13 files, 52.8 KB raw, 20.2 KB gzipped**.
  - That is within the 20.3 KB that `docs/testing.md` records, and well under the 45 KB budget.
- **WebKit was not run.** It is not available here. It stays on the merge checklist.

## How I used the templates

I served a copy of `dist/` on a second port and drove Chromium as an owner would. I read the output with `page.pdf({ format: 'A4' })`, `pdftotext` and `pdftoppm`.

### All five templates, English and Afrikaans, with JavaScript

The data:

- Business details, including a registered company name and number.
- A customer, and dates from the picker.
- Five lines:
  - "Replace 150 L geyser…" 1 × `7 899.99`
  - "Labour, hours" 2.5 × `R385`
  - "Copper fittings" 12 × `89,90`
  - a call-out with no quantity at `450`
  - a discount 1 × `-R250`
- The quotation's lists, timing, deposit `50`, `30` days and a terms link.
- The invoice's bank details and late-payment terms.
- The receipt: `R5 000,50` received and a balance of `-R100`.
- The privacy notice, with "Marketing" left out.

What I read on the PDFs:

- Every page is **one A4 sheet**. Nothing of the site prints: no header, footer, AI notice, form, buttons, tabs, sources or badge.
- Every value I typed is on the sheet, and no sample text prints.
- Line amounts are R 7 899.99, R 962.50, R 1 078.80, R 450.00 and -R 250.00.
- The subtotal is R 10 141.29, VAT is R 1 521.19 (15% of R 10 141.29 is R 1 521.1935), and the total is R 11 662.48. All are right to the cent, in both languages.
- Afrikaans prints "BELASTINGFAKTUUR", "BTW @ 15%", "TOTAAL (BTW ingesluit)", "6 Oktober 2026" and the same amount bytes as English.
- The receipt prints "R 5 000.50" and "-R 100.00".
- The Marketing section and its heading are gone, and "Your rights" follows directly.
- The completeness line reads "Every item this form checks is filled in." / "Elke item wat hierdie vorm nagaan, is ingevul." on all ten pages.

### Phone

On a Pixel 7 profile, with the Fill in tab selected, a ten-line tax invoice prints the sheet, not the form, on one page.

### Without JavaScript

I filled the same data in all ten pages and printed each one.

- One copy of the form prints, with every value I typed, the template text and no preview.
- Page counts are 2 to 4. The fallback is a form layout, and the backlog records that.
- Leaving out "Marketing" drops its group.

### Long content

- A quotation with ten lines and a 70-item "What is included" list prints all 70 items and all 10 lines.
  - With JavaScript it takes 3 pages, and each section starts with its heading.
  - Without JavaScript, see nit 2.

### Numbers as owners type them

| Input | Result |
| --- | --- |
| `-R250`, `R -250`, `- R 250` | -R 250.00 |
| `-1 500,50` | -R 1 500.50 |
| `-R1,500.00` | -R 1 500.00 |
| `-.5` | -R 0.50 |
| `R-0` | R 0.00 |
| `−250` (Unicode minus), `R−250`, `(250)`, `250-` | Refused and marked. The totals go blank. None is read as a different amount. |
| Quantity `-2` × `100` | -R 200.00 |

On the receipt:

- `R1,500` and `1500.` are not counted as filled in. "Amount received" is listed as missing, and the slot prints blank.
- `-R1500`, `R 1 500` and `R1.500,00` count, and print as rand.

### Drafts

- **A long paste:** pasting 6 001 characters into a list keeps the first 5 000 (see nit 3).
- **Corrupt drafts:** I tried five:
  - `businessName: 5`, with a line `"x"` among good lines
  - text that is not JSON
  - `[]`
  - a 7 000-character value
  - `values: null, lines: {}`
  - Each opens without an error. The good entries are kept, the 7 000-character value is cut to 5 000, and typing then saves across a reload.
  - A saved price of `9e99` is shown as typed, marked as not a number, and the totals go blank.
- **Storage blocked:** when `setItem` throws, and when reading `localStorage` throws (Afrikaans tax invoice), the totals still work (R 100.00, R 115.00) and the warning shows.
- **Start next** moved INV-0099 to INV-0100. It kept the business name and bank account, emptied the customer, and made the reference follow the new number. The draft opened on the Afrikaans page with INV-0100.
- **Clear:** there, Clear focused "Hou wat ek getik het". Confirming removed `st.template.invoice.v1`, and the number went back to INV-0001.

### Other checks

- **Security:** the diff has no `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `set:html`. Reader text goes through `textContent` and `createElement('li')`. `localStorage` is reached only through `persistentValue`. The diff has no literal colours and no `href="/…"` literals.
- **Ownership:** the files outside the package are the cross-package edits that the backlog records (`print.css`, `Doc.astro`, `check-trust.ts`, `routes.ts`, the templates index, `.prettierignore`, `vitest.config.ts`). Nothing new was added.
- **D5:** every template page, English and Afrikaans, has the AI notice, "An AI checked the legal rules for what this document must show on 13 September 2026", and "Sources for this page" (dist:trust and the HTML).

### Mutations

I reverted each one, and none is committed.

| Mutation | Result |
| --- | --- |
| Count any non-empty money value as readable | 1 dom test fails |
| Drop `-R` (old `^R` regex) | 2 unit tests fail |
| Drop over-long draft values instead of cutting them | 1 unit test fails |
| `required: !instruction` (old rule) | 1 unit test fails |
| Remove the sheet's empty-section `:has()` rule | the e2e "left out" test fails |
| `break-inside: auto` on sections | the e2e "keeps together" test fails |
| Remove the no-JS group `:has()` rule | the nojs heading test fails |
| Remove the badge rules | the e2e Official and Amptelik tests and the nojs print test fail |
| Remove `maxlength` from the quotation | the e2e draft-limit test fails |
| Count any non-empty **number** value as readable | **no test fails** (nit 4) |

I ran the CSS and `maxlength` mutations against an edited copy of `dist/` with `PW_REUSE_SERVER=1`.

## Findings

### minor 1: Leaving out a section's paragraph and emptying its list still prints the heading over nothing

File: `src/components/templates/TemplateSheet.astro:268` and `:317` (the empty-section rule counts any child that is not a heading or left out), `src/components/templates/TemplateTool.astro:448-453` (the no-JS rule needs every child to be a text item)

Acceptance item: Build 2 and 3 (what prints); pass 2 minor 5.

What is wrong:

- "Who we share it with" on the privacy notice has a paragraph that can be left out ("We do not sell your information. We share it only with:") and a list field.
- If the owner ticks "Leave this out" and empties the list, the section still holds an empty `<ul>`. The `:has(> :not(h3, [data-omitted]))` test then still matches, so "Who we share it with" prints with nothing under it, followed by "Marketing".
- Without JavaScript the same happens: the group has a field, so the no-JS rule does not apply.

Why it matters: this is the case pass 2 minor 5 described ("an empty section … a customer may read as a missing part"), reached through a list instead of a paragraph. It is rare, because almost every business shares data with at least its bank, and nothing wrong is printed. So it is minor.

How to reproduce: on `/templates/privacy-notice/`, tick the box under "Who we share it with", clear the "Who we share it with" text box, and print. The PDF has "Who we share it with" directly above "Marketing".

Suggested fix:

- Treat an empty list as empty in the sheet rule, for example `:not(:has(> :not(h3, [data-omitted], ul:empty, ol:empty)))`. The script already writes no `<li>` when a list without a sample is empty.
- Or mark the list `data-omitted` when it is empty.
- For no-JS, accept that a group with a field always prints, and note it in the backlog row for the no-JS form.

### nit 1: The printed English privacy notice has a space before the full stop after the regulator link

File: `src/components/templates/TemplateSheet.astro:273` (the badge is hidden, but the whitespace before it stays), `src/components/templates/SheetRuns.astro:35`

Every English privacy notice prints "…complain to the Information Regulator at inforegulator.org.za (https://inforegulator.org.za/) ." The space comes from the whitespace between `</a>` and the hidden `<span class="st-badge">`. In Afrikaans the sentence goes on ("… kla."), so it does not show. This is cosmetic. Rendering the link without the badge in `SheetRuns`, as pass 2 suggested first, would remove both the badge and the space.

### nit 2: Without JavaScript, a group taller than a page prints its legend alone on an otherwise blank page

File: `src/components/templates/TemplateTool.astro:409-414` (`break-inside: avoid` on `.st-tgroup`)

A quotation with a 70-item "What is included" list, printed without JavaScript, has 8 pages:

- Page 4 holds only the legend "What is included".
- The list starts on page 5.

With `break-inside: auto` the same form has 7 pages and no lone legend. Every item still prints, so nothing is lost. A list that long is rare, and so is printing without JavaScript. `docs/design-system.md` says "Without JavaScript each group of the form keeps together the same way". It could add that a group taller than a page still breaks, as it already says for the sheet.

### nit 3: A paste over 5 000 characters is cut without a word

File: `src/components/templates/TemplateField.astro:85-87`, `tests/e2e/templates.spec.ts:386` ("…says so while typing")

`maxlength` stops typing at 5 000, but a paste of 6 001 characters keeps the first 5 000 with no message or counter. The end of the paste is gone, and the reader is not told. The test's name and the commit say the control "says so", but it does not say anything visible. This is very rare at 5 000 characters. A short hint such as "Up to 5 000 characters", or a message when `value.length === MAX_VALUE_LENGTH`, would make the claim true.

### nit 4: No test covers a refused number (not amount) being counted as missing

File: `src/scripts/template-form.ts:641` (`readable` for `kind === 'number'`), `tests/dom/template-form.test.ts:545`

Making `readable` return `true` for `number` fields fails no test. This covers the quotation's "Deposit of …%" and "valid for … days", where `50%` or `30 days` is refused and prints blank. The dom test covers only the receipt's money field. One more assertion would guard the other half of pass 2 minor 3.

### nit 5: Start next clears the late-payment terms, which are now required, and resets "Leave this out"

File: `src/lib/templates/placeholders.ts:499` (`carry: false` for paragraph slots), `src/scripts/template-form.ts:304-317`

Two things happen after Start next on the invoice:

- "Payment is due by …" and "State your late payment terms here" are empty. The terms are the same on every invoice, and since `72f9779` they are counted as required, so each new invoice starts with that item missing.
- A ticked "Leave this out" box (for example "Please use the invoice number as your payment reference.") is cleared, so the line prints again on the next invoice unless the owner ticks it again.

Nothing wrong prints, because the line is true. Pass 2 nit 3 named the carry-over part. Carrying the terms and the omit boxes would match how owners reuse an invoice.

## Pass 2 findings, rechecked

| Pass 2 | Status at `b2b8f23` |
| --- | --- |
| minor 1 (quotation on two sheets, tables split) | Fixed. A five-line realistic quotation is one sheet in both languages. Sections are `block` + `break-inside: avoid`. Checked by PDF and by mutation. See nit 2 for no-JS. |
| minor 2 (long field dropped on load) | Fixed: `maxlength` and a cut instead of a drop. Checked by reload and corrupt draft. See nit 3. |
| minor 3 (refused amount counted) | Fixed for amounts. See nit 4 for the test on numbers. |
| minor 4 (Official badge prints) | Fixed with and without JavaScript, in both languages. See nit 1 for the space left behind. |
| minor 5 (heading over a left-out paragraph) | Fixed for paragraphs, in the preview and without JavaScript. See minor 1 for an emptied list. |
| nit 1 (`-R250`, iPhone keypad) | `-R250` fixed. The keypad is in the backlog with a reason. |
| nit 2 (quantity message) | Fixed: "Write fifteen hundred as 1500, or one and a half as 1.5." / "Skryf eenduisend vyfhonderd as 1500, of een en ’n half as 1.5." |
| nit 3 ("(optional)", not carried) | "(optional)" is gone: the terms are required. Carry-over is not done; see nit 5. |
| nit 4 (no-JS reference blank) | In the backlog with a reason that holds. |
| nit 5 (totals' reason outside the live region) | Fixed: `[data-totals-blocked]` is inside `[data-totals]`. |
| nit 6 (coverage floors not gated) | In the backlog with a reason that holds. |
