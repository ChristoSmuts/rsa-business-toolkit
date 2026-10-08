# WP-40 integration review pass 2

- **Reviewer:** an independent reviewer agent that did not write this code and did not write pass 1.
- **Date:** 5 October 2026
- **Commit reviewed:** `ab8ee5b` ("docs(reviews): log the wp-40 integration minors left open"), the tip of `claude/lucid-bell-t5acdn`. I reset a clean worktree to it.
- **Base:** `main` at `92f4e80`.
- **Scope:** the whole integration diff, not only the fixes.
  - `git diff 92f4e80 ab8ee5b --stat -- src scripts tests content-meta ':!src/data'`: 19 files, +775 / -142.
  - The pass 1 fixes: `84b4884`, `a7e1738`, `611e67a`, and the backlog rows in `ab8ee5b`.
  - From `src/data` and the Afrikaans markdown, only the changes that came from the integration: the navigation titles in `content-meta/docs.meta.json` and the link texts in `611e67a`.

## Gate results

I re-ran all of these myself on `ab8ee5b`. I wrote my logs to a private folder, because another worktree was writing a log with the same name in the shared scratchpad.

- `pnpm install --frozen-lockfile --offline`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 177 files, 0 errors, 0 warnings, 0 hints.
  - vitest unit+dom: 31 files, **955 passed (955)**.
  - Content drift: "Wrote 0 changed files, removed 0, 81 files in total. Content drift: none."
  - vitest content: **35 passed (35)**.
- `pnpm build`: exit 0, 96 pages.
  - `dist:audit`: "96 HTML file(s), 13357 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 47 Afrikaans page(s) with language of parts correct both ways." There are 47 pages now, not 46, because the content gallery is checked too.
- Playwright `chromium`, `mobile` and `nojs` in one process (`PW_PORT=4561`, 2 workers): 597 tests, **512 passed, 85 skipped, 0 failed** (8.3 min).
  - chromium: 248 passed.
  - mobile: 163 passed, 85 skipped.
  - nojs: 101 passed.
  - I read the full list. It has no failed (`✘`), flaky or retried lines.
- `pnpm test:a11y`: exit 0, **192 passed** (96 routes × light and dark).
- WebKit was not run. It is not available in this environment.

## Verdict

**Not clean: 0 blocker, 1 major, 2 minor, 2 nit.**

The built site is correct. On every Afrikaans page outside the design system, every `lang="en-ZA"` text is English, and nothing Afrikaans is marked English (details below). The pass 1 findings are fixed or logged with sound reasons.

The major is about the guard, not the output. The fix for pass 1 minor 3 marks the register titles and Act names that the Afrikaans register keeps in English. I removed that marking locally, and every gate stayed green: unit, dom, e2e and `dist:trust`. `dist:trust` cannot catch this by design, because its new allowlist is exactly the set of titles the translation kept.

## Pass 1 findings

| Pass 1 | Status | What I checked |
|---|---|---|
| major 1, `registerNames` over-reach | **Fixed** | Names now come only from titles the Afrikaans register keeps exactly (matched by id), plus the part before ` — ` or the first `, `. Matching is case-sensitive. With the real `namesForCheck()` (225 names, 124 of them protected), all of these are still reported: "Frequently Asked Questions", "Company registration", "Tax calendar" and "NOT VAT registered". The split fragments and the link texts from the "supports" prose are gone. Unit tests now pin the negative side. See nit 2 for one leftover fragment. |
| major 2, no tests for the partly translated paths | **Partly fixed** | `partly-translated.test.ts` covers `docTitleLang`, `docrefLang`, the `sourcesLang` default and `keptInEnglish`. The gallery e2e test checks that the English register is marked. But the new `keptInEnglish` path in `SourcesForPage` has no guard at all. See major 1. |
| minor 1, gallery caption | **Fixed** | `fallbackCaption` uses `contentLang`. With the fix reverted, `dist:trust` now fails on the gallery (three "Afrikaans text marked as English" captions). The e2e check meant to catch it does not. See minor 2. |
| minor 2, navigation titles | **Fixed** | I compared all 218 in-text document links in `src/data/af/docs/*.json` with `titles.af` in the manifest. Every link text equals its target's navigation title, for all 36 documents. "Tuiswerk en veilige ontmoetings" is gone. |
| minor 3, kept-English register titles | **Fixed in output** | On the built pages, all 69 kept titles and all Act names in "Sources for this page" carry `en-ZA`. The 36 translated titles carry no mark. See major 1 for the missing guard and minor 1 for two places it does not reach. |
| minor 4, `noteLang` by rule | **Logged, sound** | The backlog row is accurate. `provenance.json` is English only. `dist:trust` reports a translated note as "Afrikaans text marked as English". No-link reasons are now compared with the data (`reasons`). |
| minor 5, residue rule | **Logged, sound** | "THE END", "FREE", "Was" and "Drive" alone are still excused, as the row says. A sentence with ordinary words is reported, and `check-trust.test.ts:257-283` pins "THE END is near". The all-caps rule predates WP-40. |
| nit 1, `vorige` pattern | **Fixed** | The noun must end in `drempel`, `limiet` or `grens`. The negative case is tested. |
| nit 2, title wording | **Fixed / kept with reason** | "Stemming en materiale (gebruik ná Opdrag 4)" now matches its five links. "Het jy reeds jou naam? (kortpad)" stays because its eight links say the same, which is a fair reason. |
| nit 3, glossary in `registerContext` | **Fixed** | The glossary is dropped when `sourcesLang` differs from `contentLang`. |

## What I checked

**Language of parts on `dist/af/`.** I listed every text node that inherits `en*` on all Afrikaans pages outside `af/design-system/`, using `textNodesWithLang` from `check-trust.ts`. All of them are English:
- the language switcher ("English");
- the five source notes and the register's note;
- the four no-link reasons (`businesses-act-71-of-1991`, `sars--budget-2026-faq` and the two journal articles). All four are byte-identical to English in `src/data/af/sources.json`;
- the 69 kept register titles and the 14 Act names.

Breadcrumbs, the pager, cards, the contents page and every docref carry no `lang`, and their titles are Afrikaans. The 36 translated titles ("SARS — Belastingkalender" and the others) carry no `lang`. On `af/sources/`, only the note is marked.

**`keptInEnglish`** (`src/lib/content/render.ts:229-248`, `SourcesForPage.astro:82-87`):
- Entries and Acts are matched by id, so the order of the two registers does not matter.
- A reason is marked only when it is byte-identical to the English one.
- On an English page, `sourcesLang === DEFAULT_LOCALE`, so the sets are empty and `dataLang` is `undefined`. Nothing is marked. I confirmed this on the built English pages.
- On an Afrikaans page with the English register (the gallery), the sets are empty and `dataLang` is `en-ZA`. So every title, reason and "supports" text is marked, and the labels and badges are not.
- `[...route].astro` loads the English register only for documents whose register is not English.

**The new tests, by mutation.** I made these changes locally and reverted them. None was committed.
- **Mutation A:** `titleLang` ignores `keptInEnglish` (in `SourcesForPage.astro:85`, `… && false`). Result: unit+dom 955 passed; e2e `content.spec.ts` and `pages.spec.ts` on chromium, 115 passed; `dist:trust` reported nothing for the real pages. See major 1.
- **Mutation B:** gallery `fallbackCaption` back to `locale`. Result: `dist:trust` failed with the three captions. The e2e gallery test passed. See minor 2.
- **By reading:** if `dataLang` is dropped from the gallery's register titles, the gallery e2e test fails, because it asserts `count() > 0` of `span[lang]` and that each one is `en-ZA`. If `reasonLang` is dropped, `dist:trust` would report it, because a reason is a sentence and not on the name list.

**`dist:trust` probes.** I used the real `namesForCheck()`.
- Publisher fragments: all are publisher or site names except "Foodstuffs" (nit 2).
- The four lower-case protected names (`bona vacantia`, `voetstoots`, `eFiling`, `eNaTIS`) also match with a capital first letter. None of those capitalised forms is an English word.
- I could not build untranslated English that is excused, other than these cases:
  - text identical to a kept title (major 1, minor 1);
  - the all-caps and `SAME_IN_AFRIKAANS` residues that minor 5 logged;
  - "Foodstuffs".
- The unit tests pin the negative side only with a synthetic name list, `registerNames` plus `OTHER_NAMES`. They do not use `PROTECTED_NAMES` or the real register. That is acceptable, because the real list is data. I checked the real list by hand above.

**Other code** (`ContentsBlock`, `Inline`, `manifest.ts`, `context.ts`, `Doc.astro`, `[...route].astro`, `content.astro`, `pages.test.ts`, `validate.test.ts`, `TERMS-af.json`):
- I found no hard-coded UI strings, no `href="/…"` literals and no literal colours.
- `ContentsBlock` and `Inline` add a `lang` only when the title fell back to English.

## Findings

### major 1: nothing guards the kept-English marking of register titles and Act names, and `dist:trust` excuses its removal by design
File: `src/components/trust/SourcesForPage.astro:84-85,122,131,162`; `scripts/dist/check-trust.ts:275-289` (`registerNames`); `tests/unit/site/partly-translated.test.ts:65-83`
Acceptance item: D4 "missing required test"; B5 / WCAG 3.1.2 (the behaviour pass 1 minor 3 asked for)

**What is wrong:**
- `84b4884` added the behaviour: on an Afrikaans page, the 69 register titles and 14 Act names the translation kept in English get `lang="en-ZA"`.
- The unit test checks only the pure function `keptInEnglish`. No dom or e2e test renders an Afrikaans page's sources section and looks at those marks. The gallery tests only the "English register" path (`dataLang`), where `keptInEnglish` is empty.
- `a7e1738` makes `dist:trust`'s name list exactly "the register titles the Afrikaans translation kept unchanged". So when one of these titles inherits `af-ZA`, `isProtectedText` removes the whole title as a name, and nothing is reported.
- Mutation A showed this: with `titleLang` ignoring `keptInEnglish`, every gate stayed green, including `dist:trust`. Then "Govchain, How to register a company directly with CIPC" renders unmarked on `af/core/register/`.

**Why it matters:**
- Pass 1 raised the major because the partly translated paths had no guard. The fix added one more such path, which is the only one live in today's build, and left it unguarded.
- `dist:trust` is the gate that would normally read this, and it is blind here by construction.
- A refactor of `SourcesForPage` (for example, a shared `lang` helper) can silently undo minor 3.

**How to reproduce:** in `SourcesForPage.astro:85`, change the condition to `context.keptInEnglish.titles.has(id) && false`. Then run `pnpm build` and `pnpm test`. Both pass, and `dist:trust` lists only unrelated pages.

**Suggested fix (either one):**
- An e2e or dom assertion on a real Afrikaans page. For example, on `af/core/register/`:
  - the "Govchain, How to register a company directly with CIPC" title and the "Companies Act 71 of 2008" name carry `lang="en-ZA"`;
  - a translated title (for example "BizPortal (CIPC) — Maatskappyregistrasie") does not.
- Or make `dist:trust` check the kept titles' `lang` both ways: a kept title must inherit `en`, and a translated one must not.

### minor 1: kept-English and partly English titles are still unmarked on the register page and inside translated titles
File: `docs/rsa-business-toolkit-af/.../lookup/sources` (rendered at `dist/af/sources/index.html`); `src/data/af/sources.json` (for example `rlv-form…`, `elliot-a-j…`, `labrecque-l-i…`)
Acceptance item: B5 / WCAG 3.1.2

**What is wrong:**
- `af/sources/` is the register itself. It renders the same kept titles from the Afrikaans markdown with no `lang`. For example, "Govchain, How to register a company directly with CIPC" and "SARS — Guide to Provisional Tax" are unmarked there, but marked `en-ZA` in the "Sources for this page" sections. The register page has 2 `lang="en` marks in total.
- Some translated titles keep a long English part that can never be marked, because the title is compared whole:
  - "RLV-vorm — Application for Registration and Licensing of Motor Vehicle";
  - the two journal article titles ("Color Psychology: …", "Exciting Red and Competent Blue: …").
- `dist:trust` excuses the first case through `registerNames`. It skips the second case because the text differs from English.

**Why it matters:**
- The same title is read with an English voice on one page and an Afrikaans voice on the register page.
- If whole English article titles need marking, as pass 1 minor 3 concluded, the canonical list and the mixed titles need it too.
- This is minor, as in pass 1: the proper-name exception of 3.1.2 arguably covers titles of works, and nothing Afrikaans is marked English.

**Suggested fix:**
- Let the Afrikaans markdown carry a language span for kept titles, or let the pipeline mark register-page titles from the same `keptInEnglish` comparison.
- For mixed titles, use a per-entry `titleLangParts` field or inline `lang` runs.
- Or log this in the backlog with that reason.

### minor 2: the gallery e2e check for Afrikaans titles inside English blocks never looks at the coverage list
File: `tests/e2e/content.spec.ts:432-445`; `src/pages/[...locale]/design-system/content.astro:147,204,206-226`
Acceptance item: D4 (a test that does not test what it says)

**What is wrong:**
- The check scans `article .st-blocks`. But the coverage items, the only place `fallbackCaption={docTitle(…)}` is used, sit in `<section aria-labelledby="dsc-coverage">` after `</article>`.
- With pass 1 minor 1 reverted (mutation B), the e2e test passed, although the page had "Table: Watter sjabloon om wanneer te gebruik" inside `lang="en-ZA"` blocks.
- The commit message says the test "looks for every Afrikaans title inside its English blocks".

**Why it matters:**
- `dist:trust` now scans the gallery and caught mutation B, so the state is guarded. That is why this is minor.
- But the e2e assertion gives false confidence, and it is the check a developer runs locally without a full build.

**Suggested fix:** query `main .st-blocks`, or `article .st-blocks, .dsc-coverage .st-blocks`.

### nit 1: entry ids and Act ids share one `titles` set
File: `src/lib/content/render.ts:240,246`

`keptInEnglish` puts entry ids and Act ids in the same `titles` set. `businesses-act-71-of-1991` is both an entry id and an Act id. Today both are kept, so nothing renders wrong. If a translator ever translates that entry's title, the entry would still be marked `en-ZA` because the Act's name is kept. `dist:trust` would then report "Afrikaans text marked as English", so the failure would be loud. Use separate `titles` and `acts` sets, or prefix the Act ids.

### nit 2: the publisher split turns "Foodstuffs" into a name
File: `scripts/dist/check-trust.ts:284-285`

The split at the first `, ` also runs on Act names. So "Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972" adds "Foodstuffs", an ordinary English word, to the name list. An unmarked "Foodstuffs" on its own in an Afrikaans page would be excused. Skip the publisher split for `acts`. The full Act name is already a name.

## Things I checked and found correct

- `docTitleLang` and `docrefLang` share `fallbackTitleLang`. A missing English title returns `undefined`, not `en-ZA`.
- `[...route].astro` loads the register only for documents. A missing register still throws the error naming `sourcesLang`.
- The gallery's note demo uses the Afrikaans `start/how-to-use` with its own context and marks only the English note.
- `pages.test.ts` builds its own manifest state with `withLangs`, so it does not depend on translation progress.
- The `TERMS-af.json` additions match the batch reviews they cite. "bona vacantia" is in `keepVerbatim`.
- The new navigation titles read as natural Afrikaans, and none shortens the English in a misleading way.
