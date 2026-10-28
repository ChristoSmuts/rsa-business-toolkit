# lead-dedupe review, pass 1

## Verdict: NOT CLEAN

| Severity | Count |
| --- | --- |
| Blocker | 0 |
| Major | 1 |
| Minor | 6 |
| Nit | 0 |

Scope: `git diff ea15b4a 4aa9580` on branch `lead-dedupe`. That is `cf11ece` (the build records `summarySource`) and `4aa9580` (`Doc.astro` shows a lead only through `docLead`). The reviewer reviewed the diff fresh and changed no code.

## Checks run

- `pnpm build` on both ends: OK. The `dist/` diff is exactly 50 document pages, and they differ only by the removed lead paragraph. The search index is byte-identical.
- `pnpm gate:fast`: passes, 3446 unit and dom tests, no content drift.
- `pnpm content:fidelity --lang af`: 37 docs faithful, 0 findings.
- e2e, in batches over chromium, mobile and nojs: no failures.
- Source probe over all 50 derived summaries: none is a `fallback` case, and no page loses information. Each removed lead is the page's own first paragraph, word for word or cut short, and that paragraph is still on the page.
- Probes of the content test: every break the reviewer tried was caught, including running with `TEMPLATES_FILLABLE=false`. A regression in `Doc.astro` (always rendering the lead) is caught only by the e2e test, not by the content test.
- Screenshots and first-heading measurements at 320×568 and 360×740 match the author's.

## Findings

**M1 (major): seven written leads still repeat their opening text, and the test cannot see it.** `repeats()` only asks whether the paragraph starts with the lead. The leads kept on these pages repeat a sentence from one of their first paragraphs:

- vehicle dealer, English and Afrikaans: the lead is about the second sentence of paragraph 2;
- English "What has changed";
- English "Running a Pty Ltd";
- English beauty and food;
- Afrikaans food.

The vehicle dealer is also the positive control in the new e2e test. Fix (a): compare per sentence after normalising case, punctuation, whitespace and a trailing "…". Fail when any sentence of a shown lead is inside, or shares a run of eight or more words with, one of the page's first three visible paragraphs or notes. Prove it catches the seven before fixing the content. Fix (b): rewrite those summaries, in English and Afrikaans, so each says what the reader gets, who it is for or what to do, with no new facts.

**m1: say which test guards what.** `docs/design-system.md` should say that the content test guards the data and `doc-page.spec.ts` guards the layout.

**m2: ten pages have an English summary but no Afrikaans one.** They lose their lead in Afrikaans only. Their Afrikaans meta description, social preview and hub row are weak: "Laas bygewerk: 13 September 2026", "Druk dit uit. Merk af soos jy gaan.", "Lees eers Registreer: ...". The ten pages are branding prompts, marketing prompts, mood and materials, the four business types, "Running a Pty Ltd", the master checklist and "What has changed". Add Afrikaans summaries with numbers kept byte-identical, and note that the owner's Afrikaans review should cover them.

**m3: the design-system text predates this change.** Change "2. H1 and lead" to say the lead appears only when shown. Mark the first-screen table and the "Afrikaans lead wraps to five lines" sentence as measured before this change, or remeasure them.

**m4: two template summaries repeat the "make a copy" note.** The receipt and privacy-notice summaries repeat the note's first sentences. With `TEMPLATES_FILLABLE=false` the check would fail. Record this near the `formIntro` paragraph, or rewrite both summaries in English and Afrikaans.

**m5: the templates test no longer checks the lead.** `templates.spec.ts` reads the lead through `allTextContents()[0] ?? ''`, which passes whether or not a lead shows. Assert the lead count against `docLead` instead: 0 for invoice and tax invoice now.

**m6: the e2e examples depend on the data.** The test is fine as it is. Add a one-line comment saying that the `summarySource` expectation guards the choice of example routes.

## Fixed in

- `a352036` fix(content): seven English summaries rewritten (M1 b). These are the vehicle dealer, food, beauty, "What has changed" and "Running a Pty Ltd" from M1, plus the receipt and privacy notice from m4. Each now says what the page gives or what to do. No new facts and no new numbers. The vehicle-dealer content test follows.
- `92e2af8` fix(af): Afrikaans summaries for 14 pages (M1 b, m2, m4).
  - Seven are translations of the rewritten English summaries. Four of these replace an Afrikaans summary that repeated the opening text; three are new.
  - Seven are new Afrikaans summaries for pages that had only English ones.
  - Every page with an English summary now has an Afrikaans one: 17 and 17.
  - Numbers are as in English. The commit asks for the owner's Afrikaans review.
- `df753db` test(tests) (M1 a, m1, m3, m4, m5, m6).
  - **Content check.** The check is now per sentence: case and punctuation are ignored, it reads the first three visible paragraphs or notes, and it fails on containment or on an eight-word run. It reads templates in both the form view and the document view, so it holds with `TEMPLATES_FILLABLE` on or off.
  - **Proof.** Run on the data before `a352036`, it listed exactly the seven M1 pages and the receipt and privacy notice in both languages, 11 entries in all.
  - **Templates e2e.** The test asserts the lead against `docLead`.
  - **doc-page e2e.** The examples follow the new data, with a comment saying why.
  - **design-system.md.** Updated for m1, m3 and m4.

- `b116159` fix(content) and `fae5b1b` fix(af): a shorter vehicle-dealer lead. The first full e2e run after `df753db` failed one test: the longer English lead pushed the dealer's first heading to 1,506px at 360×740, past the 1,480px that `doc-page.spec.ts` allows. It is back at 1,477px.
- `f13cc29` fix(content) and `cd1bd91` fix(af): a shorter beauty lead. The English page is back at its old height. In Afrikaans without JavaScript at 360×740, the AI notice's label row had ended at 759px, below the first screen. It now ends at 730px.

Result after the fixes: 40 pages have no lead (20 English, 20 Afrikaans) and 34 keep a written one (17 and 17).

Measured against `ea15b4a` (first heading of the text, with and without JavaScript):

- Pages that lost their lead moved up 127 to 184px at 320×568 and 128 to 157px at 360×740. At 360×740 their AI notice moved up as well, by 128 to 157px.
- The English vehicle dealer and beauty pages did not move.
- English "What has changed" moved down 29px at 360×740 and 58px at 320×568.
- The Afrikaans vehicle dealer moved down 29px at 320×568 and did not move at 360×740. The Afrikaans beauty page moved down 29px at both sizes.
- Afrikaans "What has changed" moved down 86 to 116px. Its old one-line lead was "Laas bygewerk: 13 September 2026"; it now has a written lead.
- On every page measured, the AI notice stays inside the first screen at 320×568 and 360×740. The lowest is Afrikaans beauty without JavaScript at 360×740, whose label row ends at 730px.
