# WP-40 integration review pass 3

- **Reviewer:** an independent reviewer agent that did not write this code and did not write passes 1 or 2.
- **Date:** 5 October 2026
- **Commit reviewed:** `abb267c` ("docs(reviews): log the register page's unmarked english titles"), the tip of `claude/lucid-bell-t5acdn`. I reset a clean worktree to it.
- **Base:** `main` at `92f4e80`.
- **Scope:** the whole integration diff, not only the pass 2 fixes.
  - `git diff 92f4e80 abb267c --stat -- src scripts tests content-meta ':!src/data'`: 19 files, +850 / -141.
  - The pass 2 fixes: `f622a8d` and the backlog row in `abb267c`.
  - The navigation titles in `content-meta/docs.meta.json` and the Afrikaans link texts in `611e67a`.
  - The translations themselves are out of scope; they have their own reviews.

## Gate results

I re-ran all of these myself on `abb267c`. My logs are in a private scratch folder.

- `pnpm install --frozen-lockfile --offline`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 177 files, 0 errors.
  - vitest unit+dom: 31 files, **955 passed (955)**.
  - Content drift: "Wrote 0 changed files, removed 0, 81 files in total. Content drift: none."
  - vitest content: **35 passed (35)**.
- `pnpm build`: exit 0, 96 pages.
  - `dist:audit`: "96 HTML file(s), 13357 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 47 Afrikaans page(s) with language of parts correct both ways."
- Playwright `chromium`, `mobile` and `nojs` in one process (`PW_PORT=4591`, 2 workers): 599 tests, **514 passed, 85 skipped, 0 failed** (7.4 min).
  - chromium: 249 passed.
  - mobile: 164 passed, 85 skipped.
  - nojs: 101 passed.
  - I read the full list. It has no failed (`✘`), flaky or retried lines. The new test "register titles the Afrikaans register kept in English are marked English, no others" passes on chromium and mobile.
- `pnpm test:a11y`: exit 0, **192 passed** (96 routes × light and dark).
- WebKit was not run. It is not available in this environment.

## Verdict

**Clean: 0 blocker, 0 major, 2 minor, 2 nit.**

The built site is correct, and every piece of new behaviour that is live in today's build now has a guard that fails when the behaviour is removed. The pass 2 major is fixed: removing the kept-English marking of Act names fails the new e2e test, and removing it from no-link reasons fails `dist:trust`. The two minors are about tests that do not pin parts of the `dist:trust` name rules, and about the contents-block and docref marks, which only `dist:trust` guards. That guard fires as soon as the state is live (I checked by mutation), so neither is a major.

## Pass 2 findings

| Pass 2 | Status | What I checked |
|---|---|---|
| major 1, kept-English marking unguarded | **Fixed** | `pages.spec.ts:455-519` reads both registers and checks every title and Act name in "Sources for this page" on three Afrikaans pages. Kept titles must be `en-ZA`; translated ones must have no `lang`. Both kinds occur (`kept > 0`, `translated > 0`). Mutation B below fails it. |
| minor 1, register page unmarked | **Logged, sound** | The backlog row (`abb267c`) gives the reason: the register page renders from markdown, which has no inline language marker. Most of these titles are names of publications. |
| minor 2, gallery check missed the coverage list | **Fixed** | The query is now `.st-blocks` on the whole page. |
| nit 1, shared `titles` set | **Fixed** | `keptInEnglish` returns a separate `acts` set, and `SourcesForPage` uses `actLang` for Act names. The unit test asserts `kept.acts`. |
| nit 2, "Foodstuffs" as a name | **Fixed** | Act names are no longer split. "Foodstuffs" alone is reported again with the real `namesForCheck()`. The fix has no test (minor 1). |

## What I checked

**Language of parts on `dist/af/`.** I listed every text node that inherits `en*` on all 47 checked Afrikaans pages (everything under `af/` except the design-system reference pages; the content gallery is included), using `textNodesWithLang` from `check-trust.ts`. Outside the gallery, all 86 distinct texts are English:
- "English" in the language switcher;
- the kept register titles, publishers and Act names in the sources sections (for example "Govchain, How to register a company directly with CIPC", "SARS — Tax Invoice Checklist" and "Companies Act 71 of 2008");
- the source notes from `provenance.json` and the four no-link reasons.

Nothing Afrikaans is marked English. The 36 translated register titles carry no `lang`. The gallery marks its forced English fallback, the English register, the "supports" text and its English demo labels as `en-ZA`. Its Afrikaans labels and badges carry no `lang`.

**Mutations.** I made each change locally, rebuilt or re-ran the tests, and reverted it. Nothing was committed. `git status` was clean at the end.

| Mutation | Result |
|---|---|
| A: `registerNames` ignores the `kept` check (every English title becomes a name) | Unit test "takes as names only the register titles the translation kept unchanged" fails. |
| B: `actLang` ignores `keptInEnglish.acts` | `pages.spec.ts:455` fails: "af/core/register/: Companies Act 71 of 2008, expected en-ZA, received null". |
| C: `reasonLang` ignores `keptInEnglish.reasons` | `dist:trust` fails on 9 pages ("English text marked as Afrikaans: An Act that municipalities apply …", "A journal article cited by …"). |
| D: `registerNames` always splits off a "publisher", Act names too (pass 2 nit 2 reverted) | All 26 `check-trust` unit tests pass. See minor 1. |
| E: `namePattern` matches case-insensitively (`'giu'`) | All 26 `check-trust` unit tests pass. See minor 1. |
| F: `titles.af` deleted for `core/running-a-pty-ltd` and for the `business-types` section in `src/data/manifest.json`, and the `lang` marks removed from `ContentsBlock` and the docref runs in `Inline` | `dist:trust` fails with "English text marked as Afrikaans: Running a Pty Ltd" on the start-here contents block and on pages whose docrefs name it. With the marks restored, the docs and docrefs pass. See minor 2. Unit, dom and e2e tests cannot see this state. |

The gallery's fallback assertions: if the gallery stopped forcing English, the `h1` and table-of-contents `en-ZA` checks fail. If `dataLang` were dropped from the register titles, `span[lang]` would count 0, so `toBeGreaterThan(0)` fails. If the "supports" text lost its mark, `dist:trust` would report it, because it now scans the gallery and those are English sentences.

**`dist:trust` against realistic untranslated English.** I tried these with the real `namesForCheck()` (224 names):
- **Reported:** "Tax Invoice Checklist", "Guide to Provisional Tax", "Company annual returns", "Deemed Remuneration", "Public Interest Score", "Consumer Protection in e-Commerce", "Foodstuffs", "letter of good standing", "See Govchain" and "Note: SARS". These are parts of kept titles, or a name in a sentence.
- **Excused:** whole kept titles and publishers ("SARS — Guide to Provisional Tax", "Food Focus", "The Citizen"); the `keepVerbatim` terms ("Small Claims Court", "Information Regulator", "Certificate of Acceptability"); and the all-caps and `SAME_IN_AFRIKAANS` residues ("NOTE", "TIP", "Was", "Drive").

All the excused cases are either by design, with the e2e test from `f622a8d` now guarding the kept titles, or already in the backlog (pass 1 minor 5). Every name that only `registerNames` and `OTHER_NAMES` supply is a publisher, an organisation, a publication or an Act. I found no new way to fool the check.

**Other code.** I read `ContentsBlock`, `Inline`, `manifest.ts`, `context.ts`, `render.ts`, `Doc.astro`, `[...route].astro`, `content.astro`, `SourcesForPage.astro`, `check-trust.ts` and the changed tests.
- `docrefLang` and `ContentsBlock` compute the title and its `lang` from the same fallback chain, so a mark appears exactly when the English title is shown.
- `[...route].astro` loads the English register only for document pages whose register is not English.
- `createContentContext` returns empty `keptInEnglish` sets for an English register.
- No hard-coded UI strings, no `href="/…"` literals, no literal colours, no `localStorage` and no `innerHTML` in the added lines.
- Performance: `keptInEnglish` is computed once per page over 105 entries and 14 Acts. That cost is negligible at build time and adds nothing to the client.
- Security: no new runtime code, no third-party requests.

**Navigation titles and link texts.** The 36 Afrikaans document titles in `docs.meta.json` read as natural Afrikaans and do not shorten the English misleadingly. `611e67a` brought the two titles and their link texts into line. I re-ran the comparison: the text of all 218 in-text document links in `src/data/af/docs/*.json` equals its target's `titles.af`.

## Findings

### minor 1: two of the `dist:trust` name rules have no test that fails when they are removed
File: `scripts/dist/check-trust.ts:286` (publisher split skipped for Acts), `:346-358` (`namePattern`, case-sensitive); `tests/unit/check-trust.test.ts:223-283`
Acceptance item: D4 "missing required test" (the pass 1 major 1 and pass 2 nit 2 fixes)

**What is wrong:**
- Mutation D, which splits Act names into a "publisher" again, leaves all 26 unit tests green. The test's only Act, "Second-Hand Goods Act 6 of 2009", has no ` — ` or `, ` to split at.
- Mutation E, which makes names match case-insensitively, also leaves all 26 green. Pass 1 asked for case-sensitive matching as part of major 1, and the test title says "matched case by case". But none of its negative strings differs from a name only by case.

**Why it matters:**
- Both rules narrow what `dist:trust` excuses. Under mutation E, "letter of good standing" or "the citizen" in a sentence-less node would be excused as a name. Under mutation D, "Foodstuffs" would be excused again.
- A refactor of `registerNames` or `namePattern` could undo either rule silently. The risk is small, because the residue must still be names only. That is why this is minor.

**Suggested fix:** in `check-trust.test.ts`:
- add an Act with a comma ("Foodstuffs, Cosmetics and Disinfectants Act 54 of 1972") to the "takes as names only" test, and assert that "Foodstuffs" is not a name;
- assert `isProtectedText('letter of good standing', names)` is `false` where `names` includes "Letter of Good Standing".

### minor 2: the contents-block and docref marks are guarded only by `dist:trust`, and only once a title falls back
File: `src/components/content/ContentsBlock.astro:49,53,59,63`; `src/components/content/Inline.astro:89-90`; `tests/unit/site/partly-translated.test.ts:20-34`
Acceptance item: D4 "missing required test"; B5 `lang` on fallback text

**What is wrong:**
- `partly-translated.test.ts` tests the pure functions `docTitleLang` and `docrefLang`. Nothing tests that `ContentsBlock` and `Inline` put their result on the element.
- Every document and section has an Afrikaans title today, so no built page renders these marks. If they are removed from both components, unit, dom, e2e and `dist:trust` all stay green on today's data.
- Mutation F shows the guard that does exist. Once a title really falls back, `dist:trust` reports the unmarked English title ("Running a Pty Ltd") on the contents block and on every page with a docref to it.

**Why it matters:**
- The state becomes live when a new English document is added before its translation (A6). At that point the build fails, loudly, at the author of that change, not at the one who removed the mark. So nothing ships wrong, which is why this is minor and not a repeat of pass 2's major. In pass 2, `dist:trust` excused the regression by design; here it catches it.
- The gallery, which exists to show the fallback state, does not show this one. Its content is forced to English, so `docTitleLang(…, 'en')` is always `undefined`.

**Suggested fix (either one):**
- Give the gallery one item that renders a `toc` block and a docref with `contentLang: 'af'` and a manifest copy without one `titles.af`, and assert the `en-ZA` marks in `content.spec.ts`.
- Or log this in the backlog with the `dist:trust` guard as the reason.

### nit 1: the Act-name loop in the new e2e test has no count guard
File: `tests/e2e/pages.spec.ts:513-515`

The titles loop asserts `kept > 0` and `translated > 0`, but the Act loop asserts nothing about how many Acts it saw. If the `.st-source ul .st-source__name` selector stopped matching (a markup change), the loop would pass with zero Acts. Today it matches: mutation B failed on "Companies Act 71 of 2008". Add `expect(acts).toBeGreaterThan(0)` across the three routes.

### nit 2: `registerContext` dropping the glossary is untested
File: `src/components/trust/SourcesForPage.astro:76-80`

The pass 1 nit 3 fix drops the glossary when `sourcesLang` differs from `contentLang`. No register text has a term run today, so no test can see it. A one-line comment already explains it. A test needs a register fixture with a term run, so this can wait until such a register exists.

## Outside the diff (not counted)

Mutation F also showed something older than WP-40. `NavMenu.astro:52` renders a section's English title with no `lang` when the section has no Afrikaans title. With `titles.af` removed for `business-types`, `dist:trust` reported "Your kind of business" on all 47 pages. Every section had an Afrikaans title before WP-40 (`main` at `92f4e80`), and `dist:trust` catches it, so nothing ships wrong. If sections can be added one language at a time, the menu would need `docrefLang` too. The owner may want a backlog row for this.

## Things I checked and found correct

- `keptInEnglish` matches by id, marks a reason only when it is byte-identical to the English one, and keeps Acts in their own set.
- `dataLang` compares `sourcesLang` with the page locale, so an Afrikaans page with the English register marks the entries and an English page marks nothing.
- `sourcesLang` defaults to `contentLang`, and a page in English fallback uses the English register.
- The gallery's source-note demo uses the Afrikaans `start/how-to-use` with its own context and marks only the English note.
- `runCli` now scans `af/design-system/content/` and still skips the other design-system reference pages.
- `pages.test.ts` builds its own manifest state with `withLangs`, so it does not depend on translation progress.
- The `validate.test.ts` pattern for "ou/vorige …drempel van" and its negative cases are correct.
- `TERMS-af.json`: "bona vacantia" is in `keepVerbatim`, and "Businesses Act licence" matches the English glossary.
