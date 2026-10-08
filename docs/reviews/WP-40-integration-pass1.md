# WP-40 integration review pass 1

- **Reviewer:** an independent reviewer agent that did not write this code.
- **Date:** 2 October 2026
- **Commit reviewed:** `d2f685b` ("test(tests): check the translated afrikaans pages, keep the fallback in the gallery"), the local tip of `claude/lucid-bell-t5acdn`. I reset a clean worktree to it.
- **Base:** `main` at `92f4e80`.
- **Scope:** only the code, test and metadata changes that integrated the Afrikaans translation. The translations have their own reviews (`WP-40-batch*-pass*.md`) and are not reviewed here.
  - `git diff 92f4e80 d2f685b --stat -- src scripts tests content-meta ':!src/data'`: 16 files, +554 / -126.
  - Commits: `00db708`, `b329107`, `da11c91`, `bbc11b1`, `40b96f5`, `2fe99c1`, `7a8810a`, `4f4161b`, `a0d3464`, `8247dbe`, `d2f685b`.

## Gate results

I re-ran all of these myself on `d2f685b`.

- `pnpm install --frozen-lockfile --offline`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 176 files, 0 errors, 0 warnings, 0 hints.
  - vitest unit+dom: 30 files, **948 passed (948)**.
  - Content drift: "Wrote 0 changed files, removed 0, 81 files in total. Content drift: none."
  - vitest content: **34 passed (34)**.
- `pnpm build`: exit 0, 96 pages.
  - `dist:audit`: "96 HTML file(s), 13357 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` in one process (`PW_PORT=4561`, 2 workers): 597 tests, **512 passed, 85 skipped, 0 failed** (4.3 min).
  - chromium: 248 passed.
  - mobile: 163 passed, 85 skipped.
  - nojs: 101 passed.
  - I read the full list: there are no failed or flaky lines. The rewritten tests in `pages.spec.ts` and `content.spec.ts` pass in all three projects.
- `pnpm test:a11y`: exit 0, **192 passed** (96 routes × light and dark).
- WebKit was not run. It is not available in this environment.

## Verdict

**Not clean: 0 blocker, 2 major, 5 minor, 3 nit.**

What I saw on the built site is correct. On every Afrikaans page outside the design system, the only `lang="en-ZA"` marks are the language switcher, the `hreflang` links, the source notes and the "no link" reasons. All four are English, and nothing Afrikaans is marked English. The two majors are about what guards that state. `dist:trust` now excuses English phrases that are plainly translatable, so it would not catch the regressions it exists for. And no test covers the new "partly translated" code paths any more.

## What I checked

**Built Afrikaans pages** (`dist/af/`, base `/business-toolkit/`):
- Every `lang="en…"` on the 46 Afrikaans pages outside `af/design-system/`, by text. They are:
  - the language switcher and the `hreflang` links;
  - `sourceNote.reason` on the start, how-to-use, how-this-was-made, what-has-changed, marketing-prompts and register pages;
  - `noUrlReason` on the pages that cite those entries.
- I checked all of these against the data. `src/data/af/sources.json` carries the English `noUrlReason` strings, and the source notes are English. So marking them is right today.
- Sources sections on `af/core/tax-and-sars/` and `af/start/start-here/`: the entries come from the Afrikaans register (`sourcesLang` = `af`) and are unmarked, which is correct. `af/sources/` marks only its English note.
- Breadcrumbs, pager, cards and the contents block: all titles are Afrikaans and unmarked. This matches the rewritten e2e tests.
- `af/design-system/content/`: the forced fallback renders correctly in most places:
  - the blocks, `h1` and table of contents carry `en-ZA`;
  - the register titles and "supports" text carry `en-ZA`;
  - the labels around them are Afrikaans;
  - the source-note demo uses the Afrikaans `start/how-to-use` and marks only its English note.
  - One exception is the table caption; see minor 1.

**`sourcesLang` paths.**
- `[...route].astro` now loads the register only for documents. The section landings never used it, so no page lost its sources.
- A missing register still throws the clear error in `SourcesForPage`, which now names `sourcesLang`.
- `index.astro` (the home figures) still picks the register with `docContentLang`. It renders no register text, so it needs no `lang`.
- Neither `src/data/en/sources.json` nor `src/data/af/sources.json` has docref or term runs in its "supports" text. So `registerContext` keeping the page's glossary has no effect today.

**`dist:trust` probes.** I ran `isProtectedText` and `langProblems` with `namesForCheck()` against my own strings, and over the whole `dist/af/` tree with three name sets:
- no names: 160 findings;
- `PROTECTED_NAMES` only: 125 findings;
- the full set: 0 findings outside the design system.
- 122 findings are cleared only by `registerNames` and `OTHER_NAMES`. They are mostly publisher and article names, which is the intended use. The over-reach is in major 1.

## Findings

### major 1: `registerNames` turns translatable English phrases into "proper names", so `dist:trust` no longer catches untranslated English
File: `scripts/dist/check-trust.ts:286-302` (`registerNames`), `:295` (split at ` — `, `, `, ` / `), `:299` (link text from "supports"), `:360` (case-insensitive match), `:426`
Acceptance item: B5 / WCAG 3.1.2 language of parts; the purpose of `dist:trust` (reviews WP-20 passes 6 to 9)

**What is wrong:**
- The allowlist is built from every English register title, every part of a title split at ` — `, `, ` and ` / `, and every link text inside the English "supports" prose. It is matched case-insensitively anywhere in a text node.
- That makes many ordinary English phrases into "names". These are 363 names in total, for example:
  - "Frequently Asked Questions", "Company registration", "Tax calendar" and "Turnover Tax";
  - "Register a motor vehicle", "How to register a company directly with CIPC" and "What is the new threshold for VAT registration?";
  - "Financial statements and independent reviews", "Death of a sole director and shareholder" and "UIF and the self-employed";
  - "Standard Operating Procedure", "media statement", "who may sue" and "including";
  - two halves of a sentence from a "supports" text: "Cast versus calendered lifespans (cast roughly 5 to 10 years outdoors" and "calendered roughly 1 to 5) are consistent across several independent trade sources".
- 36 of the 105 English register titles are translated in `src/data/af/sources.json`, for example:
  - "SARS — Tax calendar" → "SARS — Belastingkalender";
  - "BizPortal (CIPC) — Company registration" → "BizPortal (CIPC) — Maatskappyregistrasie".
- So the translators did not treat these titles as names. The commit message says they are "proper names, which WCAG 3.1.2 does not ask to be marked". That holds for publishers (Werksmans Attorneys, Govchain) but not for these titles.

**Why it matters:** `dist:trust` is the only gate that reads language of parts across the whole Afrikaans site. It now passes the regressions it was built to catch:
- a translated register title or heading that falls back to English, unmarked, on an Afrikaans page;
- a `SourcesForPage` change that drops `lang={dataLang}`, the exact path this package added for an Afrikaans page carrying the English register. The English register titles are all on the allowlist.
- My probes, with the real `namesForCheck()`:
  - these are all excused: "Frequently Asked Questions", "Company registration", "Tax calendar", "What is the new threshold for VAT registration?", "Company annual returns, including UIF and the self-employed." and "Turnover Tax: who may sue, including SARS.";
  - `langProblems` returns `[]` for an `af-ZA` page whose twin has, unmarked, an `<h2>Frequently Asked Questions</h2>`, a link "SARS — What is the new threshold for VAT registration?" and the sentence above.
- The unit tests would not catch this. They check only that names are found ("BRNC certificate guide" is asserted as a name) and one negative, "Govchain se gids". No test asserts that a translated title in English, or generic words from a split title, are still reported.

**How to reproduce:** `pnpm exec tsx` a script that imports `isProtectedText` and `namesForCheck` from `scripts/dist/check-trust.ts`, then prints `isProtectedText('Frequently Asked Questions', namesForCheck())`. It prints `true`.

**Suggested fix:**
- Take only the publisher or site part of a register title (the part before ` — ` or the first `, `) and the link texts that are organisation names.
- Better: take only the titles that the Afrikaans register keeps unchanged. Those are the 69 where `af.title === en.title`, which is data the translators already decided.
- Drop the split fragments and the "supports" link texts that are prose.
- Match case-sensitively.
- Add unit tests that "SARS — Tax calendar", "Frequently Asked Questions" and "Company registration" are still reported as English inheriting Afrikaans.

### major 2: no test now covers an English title or register inside an Afrikaans page
File: `tests/e2e/pages.spec.ts:437-466`, `tests/e2e/content.spec.ts:409-449`, and no unit tests for `src/lib/content/manifest.ts:58-70,126-138` (`docTitleLang`, `docrefLang`), `src/lib/content/context.ts:27-58` (`sourcesLang`) or `src/components/trust/SourcesForPage.astro:67-73`
Acceptance item: D4 "missing required test"; B5 `lang` on fallback text

**What is wrong:**
- Before `d2f685b`, two e2e tests covered `docTitleLang` on real pages:
  - the pager's English title `span[lang=en-ZA]`;
  - card titles and contents entries marked `en-ZA`.
- They now assert the opposite (`toHaveCount(0)`, `not.toHaveAttribute('lang')`), which is right for today's data. But nothing replaced them.
- Since `7a8810a` every document has an Afrikaans navigation title. So `docTitleLang` and `docrefLang` never return `en-ZA` anywhere in the build, the gallery included.
- Since `lookup/sources` is translated, no page renders "translated document, English register". That is the case `sourcesLang` was added for in `00db708`.
- The gallery forces the content fallback, but its test does not assert the `lang` of the sources section or the source note. The gallery is also excluded from `dist:trust` (`af/design-system/` is skipped).
- `grep -rn "docTitleLang\|docrefLang\|sourcesLang\|createContentContext" tests` finds nothing.

**Why it matters:**
- A6 says translation status changes one document at a time, and a stale English source sends a document back to fallback. Then these paths are live again with no guard.
- Major 1 means `dist:trust` would not catch it either.
- The new code is untested in every state it was written for:
  - a docref to an untranslated document;
  - a contents entry for a section without an Afrikaans title;
  - an Afrikaans page with the English register (`dataLang`);
  - `noteLang`.

**Suggested fix:**
- Unit-test `docTitleLang` and `docrefLang` with a manifest copy that has no `titles.af`, as `withLangs` does in `pages.test.ts`.
- Unit-test `createContentContext` defaulting `sourcesLang` to `contentLang`.
- In `content.spec.ts`, assert on the Afrikaans gallery that:
  - `#dsc-sources` entry titles and "supports" spans carry `lang="en-ZA"`;
  - the labels ("Wat hierdie bron ondersteun", the badges) do not;
  - the source-note demo marks only the note.
- Consider a dom test that renders `SourcesForPage` with `locale: 'af'`, `contentLang: 'af'` and `sourcesLang: 'en'`. That is the only way to keep the "translated page, English register" state under test now.

### minor 1: the gallery's table caption puts an Afrikaans title inside English-marked blocks, and the test meant to catch it looks only for two fixed strings
File: `src/pages/[...locale]/design-system/content.astro:223`, `tests/e2e/content.spec.ts:431-436`
Acceptance item: B5 language of parts (gallery as the fallback reference)

**What is wrong:** the coverage items pass `fallbackCaption={docTitle(manifest, item.docId, locale)}` into `<Blocks>`, whose wrapper is `lang="en-ZA"`. Since `7a8810a` added Afrikaans titles, `dist/af/design-system/content/index.html` has "Table: Watter sjabloon wanneer. Scroll sideways to see all of it." inside English blocks. It is read with an English voice. `langProblems` reports it (and two more for "Het jy reeds jou naam? (kortpad)" and "Handelsmerkopdragte"), but `runCli` skips `af/design-system/`. The e2e check "Inside the English blocks, no label or title is Afrikaans" searches only for `Kern: geld vir almal|Rol sywaarts`, so it passes.

**Why it matters:** the gallery is now the only place the fallback is shown and tested (`d2f685b`), so its own `lang` mistakes are not caught. Real pages pass `doc.title` in the content's language and are not affected.

**Suggested fix:** pass `docTitle(manifest, item.docId, contentLang)`. Make the e2e check use the Afrikaans titles of the documents shown, or run `langProblems` over the gallery's `.st-blocks`.

### minor 2: two Afrikaans navigation titles differ from the link texts the documents use for the same page
File: `content-meta/docs.meta.json:309` and `:422`
Acceptance item: general quality; WCAG 3.2.4 consistent identification

**What is wrong:**
- `7a8810a` says each title uses "batch 0's link text where it chose one". Two do not:
  - `paperwork/which-template-to-use-when` is "Watter sjabloon wanneer" in menus, the pager, cards and breadcrumbs. The 15 in-text links on 12 built pages say "Watter sjabloon om wanneer te gebruik". The short form also reads as clipped Afrikaans; it has no verb.
  - `core/working-from-home-and-safety` is "Van die huis af werk en veilig ontmoet". Five in-text links still say "Tuiswerk en veilige ontmoetings". That is the "homework" reading the title deliberately avoids (batch 0 pass 1, F16).
- In English the navigation title and the link text are identical for every document. So this inconsistency exists only in Afrikaans.

**Why it matters:** a reader sees two names for one page, and the "Tuiswerk" links keep the ambiguity the commit set out to remove.

**Suggested fix:**
- Use "Watter sjabloon om wanneer te gebruik" as the title.
- Change the five link texts in the Afrikaans markdown to the new title. This is an `af` content fix, not a code fix.

### minor 3: English register titles that stay English are read with an Afrikaans voice
File: `src/components/trust/SourcesForPage.astro:68-71,108,117`
Acceptance item: B5 / WCAG 3.1.2

**What is wrong:** when the Afrikaans register exists, `dataLang` is `undefined` for every entry. 69 of the 105 titles are kept in English, and many are English sentences or phrases, not names. Examples:
- "Govchain, How to register a company directly with CIPC";
- "SARS — Comprehensive Guide to Dividends Tax";
- "Smartbook, cost to register a company";
- "The Tax Faculty, Dividends interest on loan".

They render without `lang` on Afrikaans pages, so a screen reader reads them with Afrikaans pronunciation.

**Why it matters:** the proper-name exception of 3.1.2 covers the publishers, but whole English article titles are the case H58 recommends marking. Today this passes only because of major 1.

**Suggested fix:**
- Mark a title `lang="en-ZA"` when the Afrikaans entry's title equals the English entry's title. Both registers are available at build time.
- Or let the translation record a per-entry title language.

### minor 4: `noteLang` hard-codes English rather than reading the data's language
File: `src/components/trust/SourcesForPage.astro:67`, `:136`, `:171`
Acceptance item: general quality (maintainability)

**What is wrong:** the source note and `noUrlReason` are marked `en-ZA` on every non-English page, because `content-meta/` is English today. This is correct now. The comment records the backlog item. But nothing ties the mark to the data: translating `provenance.json` or a `noUrlReason` later would leave Afrikaans text marked English. `dist:trust` would report that ("Afrikaans text marked as English"), so the failure would be loud, not silent. That is why this is minor.

**Suggested fix:** carry a `lang` on `SourceNote` and on `noUrlReason` (the pipeline knows which file each came from), or compare with the English register's string, as minor 3 does.

### minor 5: `SAME_IN_AFRIKAANS` and the token rule widen the excuse beyond what the tests pin
File: `scripts/dist/check-trust.ts:326-340`, `:381-395`
Acceptance item: general quality

**What is wrong:**
- `isNeutralResidue` accepts any token of two to four letters with two capitals, and every `LANGUAGE_NEUTRAL` token, which includes any all-caps word of two to five letters.
- So "THE END" is excused, and a residue like "FREE" or "NOT" after names are removed passes.
- `SAME_IN_AFRIKAANS` adds "Was" and "Drive" as whole residues. These are reasonable in their table contexts but are not limited to them.
- No unit test pins the negative side of the residue rule beyond four strings.

**Why it matters:** each rule is small, but together with major 1 they widen what passes the check.

**Suggested fix:**
- Limit the capitals rule to tokens that appear in `TERMS-af.json` or the register.
- Add negatives ("THE END", "FREE", "NOT VAT registered") to `check-trust.test.ts`.

### nit 1: the new Afrikaans "marked old" pattern also accepts "vorige" with any word between
File: `tests/content/validate.test.ts:336`
Acceptance item: general quality

**What is wrong:** `\b(?:ou|vorige)\s+[\p{L}-]+\s+van\s+FIG` is right for "die ou BTW-drempel van R1 miljoen". It also passes "Jou vorige omset van R1 miljoen beteken jy moet vir BTW registreer", which states the stale figure as a rule.

**Why it matters:** low risk. The English twin of that sentence fails the English rule, and the fidelity check forces the same figures in each block. So a stale Afrikaans figure needs a stale English one. The test adds only an "ou" case.

**Suggested fix:** restrict the noun to `drempel|limiet|grens` compounds, or add a "vorige" negative test.

### nit 2: navigation title wording
File: `content-meta/docs.meta.json:335`, `:374`
- "Het jy reeds jou naam? (kortpad)" puts a parenthesis after a question mark in menus and breadcrumbs. "Reeds ’n naam? (kortpad)" or the English pattern "Jy het reeds jou naam (kortpad)" reads better.
- "Stemming en materiale (ná opdrag 4)" lower-cases "opdrag". The document and its five link texts say "Opdrag 4", and the link text is "(gebruik ná Opdrag 4)".

### nit 3: `registerContext` keeps the page's glossary
File: `src/components/trust/SourcesForPage.astro:73`
The register island switches `contentLang` to `sourcesLang` but keeps the Afrikaans glossary. Neither register has term runs today, so nothing renders wrong. A comment, or `glossary: undefined` when the languages differ, would stop a future term run from showing an Afrikaans definition inside English text.

## Things I checked and found correct

- `docrefLang` and `ContentsBlock` mark only when the title fell back. The `<span lang>` wrapper on a link-less docref and section renders no attribute when `lang` is `undefined`.
- `sourcesLang` follows the page's content language: English on a fallback page and English while `lookup/sources` is untranslated. `dataLang` compares it with the page locale, not with `contentLang`, which is the right comparison.
- The rewritten `pages.test.ts` builds its own manifest state with `withLangs`, so it no longer depends on translation progress.
- `TERMS-af.json`: the new terms match the batch reviews they cite. "Businesses Act licence" now matches the English glossary. "bona vacantia" is in `keepVerbatim`, so `PROTECTED_NAMES` excuses it correctly.
- Every other Afrikaans navigation title matches its in-text link text exactly and is natural Afrikaans. None shortens the English in a misleading way. "Kern: begin hier" keeps the English "Core:" prefix, so it is told apart from the site-wide "Begin hier".
- No hard-coded UI strings, no `href="/…"` literals and no literal colours in the changed components.
