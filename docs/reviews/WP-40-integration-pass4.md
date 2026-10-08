# WP-40 integration review pass 4

- **Reviewer:** an independent reviewer agent that did not write this code and did not write passes 1 to 3.
- **Date:** 5 October 2026
- **Commit reviewed:** `73bef14` ("test(tests): let tsc read the component test's astro imports"), the tip of `claude/lucid-bell-t5acdn`. I reset a clean worktree to it.
- **Base:** `main` at `92f4e80`.
- **Scope:** the whole integration diff, reviewed again from the start, not only the pass 3 fixes.
  - `git diff 92f4e80 73bef14 --stat -- src scripts tests content-meta ':!src/data'`: 21 files, +939 / -141.
  - The pass 3 fixes: `6f1f2b0` and `73bef14`.
  - The navigation titles in `content-meta/docs.meta.json` and the Afrikaans link texts in `611e67a`.
  - The translations themselves are out of scope; they have their own reviews.

## Gate results

I re-ran all of these myself on `73bef14`. My logs are in a private scratch folder.

- `pnpm install --frozen-lockfile --offline`: OK.
- `pnpm gate:fast`: exit 0.
  - Lint, Prettier and stylelint: clean.
  - `astro check`: 179 files, 0 errors, 0 warnings, 0 hints.
  - `tsc --noEmit -p .`: clean.
  - vitest unit+dom: 32 files, **960 passed (960)**.
  - Content drift: "af: 36 docs built, 0 skipped (no source), 0 English fallbacks", "Wrote 0 changed files, removed 0, 81 files in total. Content drift: none."
  - vitest content: **35 passed (35)**.
- `pnpm build`: exit 0, 96 pages.
  - `dist:audit`: "96 HTML file(s), 13357 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 47 Afrikaans page(s) with language of parts correct both ways."
- `pnpm content:fidelity --lang af` (not asked, run for completeness): "Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet."
- Playwright `chromium`, `mobile` and `nojs` in one process (`PW_PORT=4611`), exit 0: 599 tests, **514 passed, 85 skipped, 0 failed** (7.3 min).
  - chromium: 249 passed. mobile: 164 passed, 85 skipped. nojs: 101 passed.
  - I read the full list. It has no failed (`✘`), flaky or retried lines.
- `pnpm test:a11y`: exit 0, **192 passed** (96 routes × light and dark).
- WebKit was not run. It is not available in this environment.

## Verdict

**Clean: 0 blocker, 0 major, 1 minor, 3 nit.**

The built site is correct. Language of parts on the 47 checked Afrikaans pages is right both ways, and I found no new way to make `dist:trust` excuse untranslated English. The pass 3 fixes work: removing any of the marks or name rules they pin now fails a unit test. The one minor is the same kind of gap as pass 3's minor 2, but in the page chrome: the integration rewrote the e2e tests that guarded the fallback-title marks in the pager, the section landing cards and the contents page, and nothing else tests them. `dist:trust` fails loudly as soon as that state is live (mutation G), so nothing can ship wrong. That is why it is minor and not major, as in pass 3.

## Pass 3 findings

| Pass 3 | Status | What I checked |
|---|---|---|
| minor 1, two name rules untested | **Fixed** (`6f1f2b0`) | Mutation D (an Act name gets a "publisher") fails "takes no publisher from an Act name". Mutation E (`'giu'`) fails "matches names case by case". |
| minor 2, contents-block and docref marks untested | **Fixed** (`6f1f2b0`, `73bef14`) | `language-marks.test.ts` renders `Inline` and `ContentsBlock` with Astro's container API against a manifest copy without one `titles.af`. Removing the docref `lang`, the document `lang` or the section `lang` each fails one test. See nit 1 for the `.astro` declaration. |
| nit 1, Act loop had no count guard | **Fixed** | `pages.spec.ts:522` asserts `acts > 0`. |
| nit 2, register glossary drop untested | **Open, accepted in the commit message** | No register text has a term run (I counted: 150 text runs and 21 links, 0 terms, 0 docrefs). See nit 2. |

## What I checked

**Language of parts on `dist/af/`.** I listed every text node on the 47 checked Afrikaans pages with `textNodesWithLang` from `check-trust.ts`.
- Text marked English outside the gallery: 87 distinct texts. All are English: "English" in the language switcher, the kept register titles and publishers, the Act names, the four no-link reasons, and the source notes from `provenance.json`. Nothing Afrikaans is marked English.
- English text that inherits Afrikaans and is excused by `isProtectedText`: 207 distinct texts. All are names, codes, domains, Act names, kept register titles (mostly on `/af/sources/`, which is the logged pass 2 minor 1), dates, sizes or the `SAME_IN_AFRIKAANS` labels. None is an ordinary English phrase.

**`dist:trust` against untranslated English.** With the real `namesForCheck()` (224 names, all proper names when I listed them):
- **Reported:** "Google Drive folder", "WhatsApp Business account", "Small Claims Court case", "Information Regulator complaint form", "VAT 420 Guide for Motor Dealers" (the part of a kept title after its publisher), "Company annual returns", "Letter of Good Standing from CIPC", "Markdown files", "Status in Drive", "Was it", "Dividend Tax", "Pty Ltd or CC".
- **Excused:** "Drive.", "SARS eFiling", "Certificate of Acceptability (COA)", "Govchain, Company annual returns", "The Citizen, The Beancounter", "Google Fonts / Inkscape / Canva". These are names only, which is by design.
- The check still relies on the English twin having the same text node, so English left in an Afrikaans page from an older English version is not reported. That is the design, and `content:fidelity` covers staleness.

**Mutations.** I made each change locally, ran the tests named, and reverted it. Nothing was committed. `git status` was clean at the end.

| Mutation | Result |
|---|---|
| Docref `<a>` loses `lang={docrefLang(run)}` (`Inline.astro:90`) | `language-marks.test.ts` "marks the English title of a document that has no Afrikaans title" fails. |
| Contents-block document `<a>` loses `lang` (`ContentsBlock.astro:59`) | "marks only the document and section that fall back to English" fails. |
| Contents-block section `<a>` loses `lang` (`ContentsBlock.astro:49`) | The same test fails. |
| D: `registerNames` always splits a publisher | "takes no publisher from an Act name" fails. |
| E: `namePattern` flags `'giu'` | "matches names case by case …" fails. |
| `isProtectedText` keeps only the names-first order | "treats dates in months spelt alike …" fails. |
| `isProtectedText` keeps only the patterns-first order | All 28 `check-trust` tests pass and `dist:trust` passes on the build. See nit 3. |
| `runCli` skips all of `af/design-system/`, the gallery too | All tests pass; `dist:trust` reports 46 pages instead of 47 and passes. See nit 3. |
| G: the pager spans (`Doc.astro:260,269`), the landing card `titleLang` (`SectionLanding.astro:61`), the sidebar label (`SectionSidebar.astro:66`) and the breadcrumb `lang` (`nav.ts:162`) lose their marks | All 960 unit and dom tests pass, and the e2e tests cannot see it (see minor 1). With `titles.af` also deleted for `core/running-a-pty-ltd` in `src/data/manifest.json` and a rebuild, `dist:trust` fails on 7 pages with "English text marked as Afrikaans: "Running a Pty Ltd"". With the marks restored and the title still deleted, `dist:trust` passes. |
| T: the component test imports `NoSuchBlock.astro` | `tsc` and `astro check` both pass. Without `astro-modules.d.ts`, `astro check` reports ts(2307). See nit 1. |

**Other code.** I read `ContentsBlock`, `Inline`, `SourcesForPage`, `Doc.astro`, `[...route].astro`, `content.astro`, `context.ts`, `manifest.ts`, `render.ts`, `check-trust.ts`, `TERMS-af.json` and every changed test.
- `[...route].astro` now loads the register only for document pages. Before, it loaded it for section pages too, but only `Doc` received it, so nothing is lost.
- `sourcesLang` follows `contentLang`, so an Afrikaans page in English fallback uses the English register, and a translated page uses the English register until `lookup/sources` is translated.
- `keptInEnglish` compares by id, keeps Acts in their own set, and is empty for an English register. The unit test fails if the empty case is removed, because `keptInEnglish(english, english)` would mark every entry.
- The gallery's source-note demo uses its own context with the Afrikaans `start/how-to-use`, and marks only the English note.
- CLAUDE.md rules in the added lines: no hard-coded UI strings, no `href="/…"` literals, no literal colours, no `localStorage`, no `innerHTML`, no new dependency, no runtime third-party request.
- Performance: `keptInEnglish` runs once per page at build time over 105 entries and 14 Acts. Nothing is added to the client.

**Navigation titles and link texts.** I read the 36 Afrikaans titles in `docs.meta.json`. They read as natural Afrikaans and keep the meaning of the English. `611e67a` brings "Watter sjabloon om wanneer te gebruik" and "Stemming en materiale (gebruik ná Opdrag 4)" into line with their link texts.

## Findings

### minor 1: the fallback-title marks in the page chrome lost their tests in this diff
File: `tests/e2e/pages.spec.ts:439-455`, `:525-537`; `tests/e2e/content.spec.ts:421-426`. The marks: `src/layouts/Doc.astro:260,269` (pager), `src/components/pages/SectionLanding.astro:61` (cards), `src/pages/[...locale]/contents.astro:94` (contents page), `src/components/navigation/SectionSidebar.astro:66` (sidebar), `src/lib/nav.ts:162` (breadcrumb).
Acceptance item: D4 "missing required test"; B5 `lang` on fallback text.

**What is wrong:**
- On `main`, `pages.spec.ts` asserted `lang="en-ZA"` on the pager's next title, the first landing card title, the first contents-page document and its heading links on Afrikaans pages, and `content.spec.ts` did the same for the gallery's breadcrumb.
- The integration had to change these tests, because every document now has an Afrikaans title. They now assert that the marks are absent. That is right for today's data, but it leaves the marking itself with no test.
- `partly-translated.test.ts` tests only the pure `docTitleLang` and `docrefLang` functions. Pass 3's minor 2 fix added component tests for `Inline` and `ContentsBlock` only.
- Mutation G removed the marks from the pager, the landing cards, the sidebar and the breadcrumb. All unit, dom and e2e tests still pass.

**Why it matters:**
- The state comes back when an English document is added before its translation (A6). Then a screen reader reads the English title in the menu, pager or card with an Afrikaans voice.
- `dist:trust` catches it as soon as the state is live. Mutation G with one `titles.af` deleted fails the build on 7 pages, and with the marks in place it passes. So nothing ships wrong, and the failure lands on whoever adds the document, not on whoever removed the mark. This is the same reasoning pass 3 used for its minor 2.

**How to reproduce:** in `Doc.astro`, change `<span lang={pager.next.lang}>` to `<span>`, then run `pnpm test` and the chromium e2e project. Both pass.

**Suggested fix (either one):**
- Extend `language-marks.test.ts` with the container API: render `SectionSidebar`, `SectionLanding` and `Breadcrumb` (or `documentCrumbs` and the pager data from `nav.ts`) against the manifest copy without one `titles.af`, and assert `lang="en-ZA"` on exactly that title.
- Or log it in the backlog with the `dist:trust` guard as the reason.

### nit 1: the `*.astro` module declaration hides a missing component in every `.ts` file
File: `tests/unit/components/astro-modules.d.ts:5-9`

The declaration is ambient and global, because `tsconfig.json` includes `**/*`. It is needed: `tsc -p .` uses `"types": ["node"]`, so it cannot read `.astro` files. It is sound for the files that exist, because `astro check` still resolves a real `.astro` import to the real component. But it also matches paths that do not exist. Mutation T, an import of `NoSuchBlock.astro`, passes both `tsc` and `astro check`; without the declaration `astro check` reports ts(2307). Vitest would still fail at import time, and no file under `src/` imports a `.astro` file from `.ts`, so the cost today is small. The props are also untyped, because the test's `render` helper takes `Record<string, unknown>`. A narrower fix: leave `tests/unit/components/` out of `tsc -p .` (for example with a separate `tsconfig` for the `tsc` step) and let `astro check` type it, since it already does.

### nit 2: the register island's language switch is not observable or tested
File: `src/components/trust/SourcesForPage.astro:77-81`

Pass 3 nit 2 noted that `registerContext` drops the glossary. It also sets `contentLang` to `sourcesLang`, which decides the language of the hidden "external link" label on the 21 links in register text. No built page has `sourcesLang` different from `contentLang` for a page with entries (the gallery's note demo has none), so neither part can be seen or tested today. If the swap were removed, `dist:trust` would report the Afrikaans label inside the English span once the state is live. This can wait until a page renders the English register under Afrikaans content. A backlog row would stop it being forgotten.

### nit 3: two `dist:trust` scope rules have no test
File: `scripts/dist/check-trust.ts:374`, `:471-473`

- `isProtectedText` tries the names-first order as well as the patterns-first order. Removing it leaves every test and the build green. That only makes the check stricter, so the risk is a false failure later, not a missed one.
- `runCli` now scans the Afrikaans content gallery. Going back to skipping all of `af/design-system/` leaves everything green; `dist:trust` just says 46 pages instead of 47. A unit test that runs `runCli` on a two-page fixture, or an assertion on the count, would pin it.

## Things I checked and found correct

- `docTitleLang` and `docrefLang` share one fallback chain, so a mark appears exactly when the English title is shown.
- `dataLang` compares `sourcesLang` with the page locale. An English page marks nothing.
- The no-link reasons are marked from the data and guarded by `dist:trust` (pass 3 mutation C).
- The gallery's e2e test checks the forced English fallback, the English register marks, and that no Afrikaans title appears anywhere in `.st-blocks`.
- `pages.test.ts` builds its own `langs` state, so it does not depend on translation progress.
- The `validate.test.ts` pattern for "ou/vorige …drempel van" and its negative cases are correct.
- `TERMS-af.json` changes feed `PROTECTED_NAMES`, and every name in it is a proper name, form code or kept legal term.
