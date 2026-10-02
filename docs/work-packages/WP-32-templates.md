# WP-32: fillable templates

Status: brief. Starts once WP-30 (the store) is merged. Can run alongside WP-31.

Read first: `CLAUDE.md`, `docs/build-plan.md` B1, B3 flow 5, B6 (templates) and C2, the store's API as WP-30 documented it, the five template documents under `docs/rsa-business-toolkit/03 Paperwork and templates/templates-to-fill-in/`, `docs/i18n.md`, `docs/testing.md`.

## What already exists

- `/templates/` (`src/pages/[...locale]/templates/index.astro`) lists the five templates and links to their documents. `TEMPLATES_FILLABLE` is `false`, so every description says the template is to read and copy.
- The template documents render their previews with placeholders and signature lines marked.
- Strings: `templates.*` (groups, fields, hints, actions) and `storage.templatesUnavailable` in both dictionaries.
- WP-30's store, with its typed persistent JSON helper for `st.template.<id>.v1`.

## Build

1. `src/lib/templates/placeholders.ts`: a pure parser from a template's preview to its fields (label, group, required or not, kind), tested on all five templates. The required-content rules shown to the reader come from the markdown, not from code.
2. `/templates/{quotation,invoice,tax-invoice,receipt,privacy-notice}/` per B3 flow 5 and B6: the notice that drafts are saved on this device only, a form grouped like the template, a live A4 preview, and soft validation ("6 of 7 required items present") that never blocks printing. Line items have computed Subtotal, VAT 15% (tax invoice only) and Total, formatted with `formatRand`, in an `aria-live` region. Desktop shows form and preview side by side; mobile has Fill in / Preview tabs. Every page shows the AI notice, the date the template's rules were checked, and sources, like its document.
3. Actions: Print / Save as PDF (`window.print()` with a sheet-only print stylesheet), Clear (confirm), and Start next (increments the number).
4. Without JavaScript the page shows the form fields as a printable sheet, so printing still works.
5. The profile from WP-31 pre-fills business fields when it exists. If WP-31 has not merged, leave a clearly named hook and a backlog row.
6. Flip `TEMPLATES_FILLABLE` and make every place that reads it right.

## Tests

Unit tests for the parser and the totals maths (rounding to cents, VAT on a line total), dom tests for the form binding, e2e for filling, reloading (draft kept), clearing, starting the next number, and printing (`page.pdf()` or print-media screenshot checks that only the sheet prints). `pnpm test:a11y` on each template page in both locales.

## Definition of done

As WP-30: `gate:fast`, `build`, chromium, mobile and nojs e2e, `test:a11y`, JS budget (45 KB gz on tool pages) recorded, docs updated, two consecutive clean review passes, the second by a different reviewer instance.
