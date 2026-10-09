# WP-50a review, pass 1

Tree: `a449848` (13 commits on `204a2a2`). Reviewer: fresh, independent. No code was changed for this review.

## Verdict: not clean

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 4 |
| Minor | 5 |

Two of the majors are regressions against `204a2a2`: the wizard's lost tap (M1) and the broken two-column tables (M2). M3 is item 5's fix not holding for long headings. M4 is item 4's fix not reaching the lead.

## Checks run

All logs are in the session scratchpad as `wp50a-review1-*.log`.

`pnpm gate:fast` (`wp50a-review1-gatefast.log`), exit 0:

```
Checking formatting...
All matched files use Prettier code style!
Result (315 files):
- 0 errors
- 0 warnings
- 0 hints
 Test Files  77 passed (77)
      Tests  3248 passed (3248)
 Test Files  1 passed (1)
      Tests  38 passed (38)
EXIT 0
```

(The happy-dom `NotSupportedError ... JavaScript file loading is disabled` stack traces in that log are stderr from `tests/dom/theme-init.test.ts`, and that test passes.)

`pnpm build` (`wp50a-review1-build.log`), exit 0:

```
[build] 198 page(s) built in 3.96s
dist:audit: 198 HTML file(s), 26715 URL(s) checked under base /business-toolkit/. No problems.
dist:trust: 72 document page(s), each with its AI notice and sources; 98 Afrikaans page(s) with language of parts correct both ways.
dist:budget: heaviest document page /af/templates/invoice/: 24.5 KB without a profile, 24.5 KB with one (budget 25.0 KB, 0.5 KB left).
dist:budget: heaviest other page /af/search/: 34.7 KB without a profile, 34.7 KB with one (budget 45.0 KB, 10.3 KB left).
dist:budget: 198 page(s) within budget.
EXIT 0
```

e2e, chromium + mobile + nojs, `PW_PORT=4921` (`wp50a-review1-e2e.log`): `Running 1218 tests using 2 workers` … `93 skipped` / `1125 passed (9.4m)`, `EXIT 0`. The log has no `✘` lines and no flaky tests.

`pnpm test:a11y`, `PW_PORT=4922` (`wp50a-review1-a11y.log`): `416 passed (6.4m)`, `EXIT 0`, no `✘` lines.

Commit messages: `pnpm exec commitlint --from 204a2a2 --to a449848` gives `✔ found 0 problems, 0 warnings` for all 13 commits. Every commit uses a CLAUDE.md scope and ends with both trailers.

Lint and format: both clean, as part of `gate:fast` (`eslint`, `prettier --check`, `stylelint`).

`pnpm content:fidelity --lang af`: `36 docs faithful, 0 findings`.

## Probes

The probes ran against the built `dist/`, served under `/business-toolkit/` on port 4930, in Playwright Chromium. They ran only after e2e and a11y had finished. The scripts are `wp50a-r1/probe*.mjs` in the scratchpad.

## Major

### M1. The wizard can start past an unanswered question, and then "See my path" does nothing

`src/scripts/wizard.ts:97-111` (start step), `:149` (`if (!answers) return;`), `:190` (stage validity ignores step 1).

If the reader has scrolled before the script arrives, `connectedCallback()` starts on the step in view. It does not check whether the questions above it are answered. On that later step, Next and "See my path" are enabled as soon as that step's own question has an answer. `finish()` then gets `answers() === null` and returns. Nothing navigates, nothing is said, and focus stays on the button. This is the "tap lost silently" failure that item 2 set out to remove, and at `204a2a2` it could not happen, because the wizard always started on step 1.

Reproduced at 360×740 with no saved profile (`wp50a-review1-probe-wizard.log`):

1. Hold the `/_astro/*.js` modules.
2. Open `find-my-path/` and scroll so question 3 (or 2) is in view. Answer nothing above it.
3. Release the modules. Answer the question in view and tap "See my path".

```
scrolled to step 2 -> {"current":"2","entityChecked":false}
finish button: See my path aria-disabled= null
url changed: false .../find-my-path/
messages: []
scrolled to step 1 -> {"current":"1","entityChecked":false}
finish button: See my path aria-disabled= null
url changed: false .../find-my-path/
messages: []
```

The new e2e test (`wizard.spec.ts`, "a reader already at question 2 stays on it") always answers question 1 first, so it misses this.

**Fix:** never start past the first unanswered step: `start = Math.min(start, firstInvalidStep)`. Also, if any earlier step is unanswered, `#advance()` / `finish()` should move to that step and focus its answers, and the hint should say so. Add an e2e test: scroll to question 3 with nothing answered, release the modules, and check that the wizard opens on question 1, or that "See my path" leads there.

### M2. Two-column tables squeeze their second column and break words every two or three letters

`src/components/ui/TableScroll.astro:106-112` (`hyphens: auto` on all cells; `overflow-wrap: anywhere` on every cell but the first).

`overflow-wrap: anywhere` lowers a cell's min-content width to about one character. The first column keeps its full min-content, so the automatic table layout gives most of the width to the first column and squeezes the rest. The second column ends up 49 to 89px wide at 320px, and its words break mid-word.

On the business-types hub, the table every reader uses to pick their page, the links read "Vehicl/e dealer", "Beaut/y and perso/nal care", and in Afrikaans "Vo/ert/uig/ha/nd/ela/ar" and "Ko/sb/esi/gh/eid". Its "Open" header reads "Ma/ak/oo/p". At `204a2a2` the same table was 576px wide and scrolled sideways: awkward, but readable.

Reproduced at 320×568 over every two-column table in both languages (`wp50a-review1-probe-tables2.log`, `-tables3.log`, screenshots `wp50a-r1/table-*.png`):

```
two-column tables: 14; overflowing: 0; with a word split across lines: 10
business-types/: split words: Vehicle | business | Beauty | personal | Services | Professional | creative
af/business-types/: split words: Maak | oop | Voertuighandelaar | Kosbesigheid | Skoonheid | ...
af/start/how-to-use/: split words: Registreer: | Belasting | Belasting | besigheidstipe | ...
af/branding/branding-prompts/: split words: moet | CIPC | CIPC | handelsmerkdatabasis | ...
af/business-types/ {"cells":[239,49], ...}
```

Tables with three or more columns are not affected: none of the 24 got narrower (`-tables.log`). The new test only checks the first column of the key table, so it misses this.

**Fix:**

- Use `overflow-wrap: break-word` instead of `anywhere`. It breaks a word only when the word would overflow, and it does not lower min-content.
- Or keep `anywhere` and give the cells a floor, such as `min-inline-size: 7em`.
- Extend the test to check every column of every two-column table at 320px, in both languages, for split words.

### M3. A "Now reading" pill of three or more lines covers the heading the reader just jumped to

`src/components/navigation/TableOfContents.astro:98` (scroll padding of `--st-target + 1lh + --st-space-2`), `:173-205` (pill box).

The scroll padding leaves room for about two lines. At 320px the pill's text is only about 256px wide, and the label shares the first line. So any heading of more than about 54 characters gives a pill of three lines (95px) or more. That pill ends below where the heading lands (about 94px), and it covers the heading's top line and focus outline. The longest Afrikaans heading gives a pill of five lines (146px), which covers two lines of the heading. While reading, the same pill hides 17 to 26% of a 568px screen. At `204a2a2` the pill was always one line and never covered the heading. The new test checks that the pill is not clipped, but not that the heading is clear of it.

Reproduced at 320×568 by following contents links (`wp50a-review1-probe-pill.log`, `-pill2.log`, screenshots `wp50a-r1/pill-af-320*.png`):

```
en/: 73 headings; pill line counts {"1":14,"2":53,"3":6}; pill covers heading text: 6
af/: 73 headings; pill line counts {"1":12,"2":52,"3":9}; pill covers heading text: 9
135ch af/start/what-has-changed/#5-02-ai-disclosure-... pillH=146 pillBottom=154 headTop=94 overlap=true
58ch af/core/tax-and-sars/#route-4-small-business-corporation-rates-companies-only pillH=95 pillBottom=103 headTop=94 overlap=true
```

Of the 40 longest Afrikaans headings, 35 are partly covered.

**Fix** (any of these, without truncating, per rule 8):

- Hide the pill while its own section's heading is in view. Right after a jump, the heading already says where the reader is.
- Or set `--st-toc-pill-space` from the pill's measured height (a `ResizeObserver`), so the heading always lands below the pill.
- Or move the label to its own small line and cap the pill's font size.

Then add a test that the target heading's top is below the pill's bottom, for the longest heading in each language.

### M4. Three template form pages still tell the reader to "make a copy … export to PDF", right under the H1

`src/layouts/Doc.astro:184` (`doc.summary` as the lead), `:158` (meta description); `scripts/content/meta.ts` (`deriveSummary`).

`formIntro()` replaces the italic note above the form, but the lead is the same note again. These pages have no curated summary, so `deriveSummary()` takes the note as the summary. Below 768px the lead now comes straight after the AI notice, so the first thing the reader reads under the notice is the instruction item 4 was meant to remove. The form line further down then says something different. Item 4 is fixed only for the invoice, whose summary comes from another paragraph.

Reproduced with `grep '<p class="st-lead' dist/{,af/}templates/*/index.html`:

```
quotation:  How to use this: make a copy, rename it to the quote number, replace everything in [SQUARE BRACKETS], then export to PDF and send the PDF. ...
af/quotation:  Hoe om dit te gebruik: maak ’n afskrif, hernoem dit na die kwotasienommer, vervang alles in [VIERKANTIGE HAKIES], voer dit dan na PDF uit en stuur die PDF.
receipt:  Send this when money arrives. ... Make a copy, replace the [SQUARE BRACKETS], export to PDF.
af/receipt:  Stuur dit wanneer geld inkom. ... Maak ’n afskrif, vervang die [VIERKANTIGE HAKIES], voer dit na PDF uit.
privacy-notice:  Put this on your website, ... Make a copy, replace the [SQUARE BRACKETS], delete any line that is not true for your business.
```

The meta and `og:description` carry the same text.

**Fix:** on a fillable template's form page, use the template's `description` or `formHowTo` string as the lead, not `doc.summary`. Alternatively, give these templates curated summaries in `content-meta/docs.meta.json` that don't describe copying a file, and an Afrikaans equivalent. Extend `templates.spec.ts` to fail on "[SQUARE BRACKETS]" or "make a copy" anywhere on a form page outside the document view, the lead included.

## Minor

### m1. The "Words used in this file" contents link opens onto a closed disclosure

`src/layouts/Doc.astro:262`, `src/scripts/theme-init.js:37-43`.

The contents lists hold 76 links to `#words-used-in-this-file`. On a phone, and on desktop without JavaScript, following one lands on the closed `<details>`, a single summary line. The reader has to tap again. The browser doesn't open a `<details>` that is itself the fragment target.

Reproduced (`wp50a-review1-probe-terms.log`):

```
320px js=true: open on load false; ... open after following the link false
1280px js=false: open on load false; ... open after following the link false
```

**Fix:** in the contents script, open the disclosure when the hash names it (on `hashchange` and on load).

I judge the rest of this change acceptable. Closed in the HTML and opened from 1024px before first paint keeps the 15-term list off phones with and without JavaScript. That is the bigger win. No-JS desktop readers lose only the default-open state, and still reach the list with one click.

### m2. Before the dialog script arrives, the search status line is rewritten on every keystroke

`src/scripts/search-boot.ts:112`.

`show()` sets `status.textContent` to "Loading search…" on every input. That is 16 mutations of a polite live region for 16 typed characters (`wp50a-review1-probe-search2.log`), and some screen readers announce each one again.

**Fix:** write the text only when it differs, as in `if (status.textContent !== text) status.textContent = text;`.

The fix itself works. With the modules held, the status line says `Loading search…` and `commonHidden: true`. After release it shows results (`-probe-search.log`).

### m3. The Afrikaans business-types hub's new summary is a fragment about "that file"

`src/data/af/docs/business-types__pick-your-business-type.json:578`.

The lead and meta description are now "Vind jouself in die tabel en maak dan daardie lêer oop." ("Find yourself in the table and then open that file"). Out of context, it refers to a table the reader hasn't seen yet and uses the markdown's word "file" (WP-50 flows audit, low). The English summary is a real summary. The other six regenerated Afrikaans summaries read well.

**Fix:** curated Afrikaans summaries for the business-type pages, from the same source as the English `content-meta/docs.meta.json` entries. Or skip paragraphs that point at "the table" when deriving.

### m4. The 320px header's switch between 3 and 4 rows is deferred, but only `docs/testing.md` records it

At 320px the top bar is 217px tall before the web fonts arrive and 165px after (`wp50a-review1-probe-banner.log`, `doc 320 fonts blocked: header 217px` / `fonts loaded: header 165px`). The author measured the shift at about 0.13.

Deferring it is acceptable:

- it is not new;
- it belongs to the header redesign (audit ranked item 2);
- even with four rows the AI notice still starts by about 505px, inside the first screen.

But WP-50's Phase 1 plan and `docs/design-system.md` don't mention it, so it can be lost.

**Fix:** add it, with the 0.1 target, to the Phase 1 header work in `docs/work-packages/WP-50-design-revamp.md`.

### m5. The budget figure in the Stoep skill is stale

`.claude/skills/stoep-design/SKILL.md` rule 6 says the heaviest document page is at 23.7 KB. It is now 24.5 KB of 25 KB: 24.2 KB at `204a2a2`, so +0.3 KB from this package (`wp50a-author-build-base.log` against `wp50a-review1-build.log`). The skill is the first thing a revamp author reads, and 0.5 KB of headroom changes what "CSS first" means.

**Fix:** update the figure, or point to `docs/testing.md` for the live number.

## Claims checked and accepted

1. **AI notice on the first screen.** Measured on all 72 document pages at 320×568 with JavaScript, with and without a profile. The worst case is `branding/mood-and-materials/` at 453px, which leaves 115px of the notice on screen. The lead was never above the notice.
   - **DOM order.** The lead, the read time and the effort meter come before the notice in the source and after it on screen. None of them holds a link or control, so the focus order matches the visual order (2.4.3 passes). The meaning doesn't depend on that order (1.3.2 passes).
   - **ADR 0006.** A screen reader still reaches the notice inside the page header, right after the H1 and the lead, so it is still "near the top".
2. **`data-enhance` / `data-ready`.** Correct for the wizard's form and the template tabs, preview and print sheet. The complex `:not()` in `utilities.css` is fine in every supported browser. The "starts on the step in view" part has the gap in M1.
3. **Search loading.** Works (see m2).
4. **Form how-to line.** Correct where the note was. The lead still has the note (M4).
5. **Pill wraps.** No truncation, but long headings get covered (M3).
6. **Language banner.** CLS 0.000 at 320, 360 and 412px, with and without the offer.
7. **Motion.** No animation on load on documents, My path or the checklist. The ring gets `data-animate` after its first draw, a tick runs a single `stroke-dashoffset` transition of 200ms, and `scroll-behavior` is `auto`.
8. **Checkbox and table width.** The checkbox fix holds. The `:where(:has())` fallback is sound: `:where()` is forgiving, so where `:has()` is missing the rule just doesn't match, and every table then fits the column. The two-column wrapping that comes with it has the problem in M2, which also applies to every table in browsers without `:has()`.
9. **Prompt names.** `dist/branding/branding-prompts/` says "Copied: Prompt 0: the business brief" through "Copied: Prompt 7: colours and type", and the Afrikaans page matches.
10. **`deriveSummary()`.** The seven Afrikaans summaries no longer hold `01-core/`, and fidelity is clean. See m3 for one weak result.
11. **Venda letters.** Measured in the browser: ḓ ṱ ṋ ṅ fall back in both Fraunces and Instrument Sans, while ô and ë are in both. The docs and the page are now accurate.
