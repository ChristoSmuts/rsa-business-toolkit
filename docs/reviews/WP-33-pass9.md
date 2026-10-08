# WP-33 review pass 9 (whole package)

- **Reviewer:** an independent reviewer agent. It did not write this code and did not do passes 1 to 8.
- **Date:** 6 October 2026
- **Commit reviewed:** `bc01b0b` ("docs(search): state when pages about the guide lead or rank lower, for review pass 8"), the tip of `worktree-agent-a0761a64fd64c33f9`. I reset a clean worktree to it.
- **Scope:** `git diff d2f685b bc01b0b`, the whole package: 49 files, +8973 / -69. The pass 8 fixes are `95b7a4b` (code and tests) and `bc01b0b` (docs).

## Verdict

**Not clean: 0 blockers, 1 major, 1 minor, 1 nit.**

The two-pass count stays at zero. The pass 8 fix makes the pages about the guide findable by their titles again, but the rule it uses ("an entry whose own heading holds every word leads") is far too wide. "What has changed" has many headings that are editing notes for the Google Drive copy ("2. "02 Register - what you actually need" — paste under the heading "Choosing the name""). Those headings hold the most common single words a reader types (`register`, `name`, `branding`, `business`, `start here`), so for those words a Drive-paste note is now the first option and Enter opens it. At `f1110b0` (pass 8) and at `961e037` (pass 7) the same queries opened the right topic.

The pass 8 rows themselves are fixed: `how this was made`, `what has changed`, `AI generated`, `corrections`, `hoe dit gemaak is`, `wat het verander`, `KI gegenereer` and `regstellings` open their page first. The pass 7 rows still hold (`PAYE deadline`, `EMP201 deadline`, `UIF deadline`, `ITR14 deadline`, `EMP201 sperdatum`, `ITR14 sperdatum` open the glossary entry first). The pass 8 nit (the all-words count) is fixed: `matchedAll` now counts `allWords` (`src/lib/search-client.ts:404`).

## Gate results

I re-ran all of these myself on `bc01b0b`. The logs are in my scratchpad, not in the repository.

- `pnpm install --frozen-lockfile --offline`: OK ("Done in 5.6s using pnpm v11.22.0").
- `pnpm gate:fast`: exit 0.
  - Prettier: "All matched files use Prettier code style!"
  - `astro check`: "0 errors", "0 warnings".
  - Vitest unit and dom: "Test Files 35 passed (35)", "Tests 1219 passed (1219)".
  - Content drift: "Content drift: none."
  - Vitest content: "Test Files 1 passed (1)", "Tests 34 passed (34)".
- `pnpm build`: exit 0, "96 page(s) built".
  - `dist:audit`: "96 HTML file(s), 14944 URL(s) checked under base /business-toolkit/. No problems."
  - `dist:trust`: "72 document page(s), each with its AI notice and sources; 46 Afrikaans page(s) with language of parts correct both ways."
  - `dist:budget`: "largest document page 7.9 KB gzip (branding/already-have-your-name/index.html), budget 25.0 KB; largest tool page 18.5 KB gzip (search/index.html), budget 45.0 KB."
  - `dist:budget`: "loaded on demand (dynamic import(); today only the search dialog): 12.4 KB gzip (shared chunks counted once)."
  - `dist:budget`: "index af.faed23efc0.json: 800.9 KB raw, 181.9 KB gzip" and "index en.873ecd57d1.json: 738.0 KB raw, 165.2 KB gzip". These match `docs/testing.md`.
- Playwright `chromium`, `mobile` and `nojs`, default reporters, `PW_PORT=4751`: **555 passed, 85 skipped, 0 failed** (6.7 min, exit 0). The failure list is empty.
- `pnpm test:a11y` (same environment): **196 passed** (7.3 min, exit 0).
- **WebKit was not run.** It is not installed in this environment.
- **Rules.** The lines changed since pass 8 add no `href="/` literal, no `localStorage`, no `innerHTML` and no literal colour. Only `src/lib/search-client.ts`, `src/lib/search/options.ts`, `scripts/search/entries.ts`, tests and docs changed since `f1110b0`; the keyboard code is the code pass 8 traced.

## My own checks

- **Real queries.** I built both indexes in memory the way `tests/unit/search/index.test.ts` does and ran queries through `runSearchCounted`, with `typing` set as the dialog sets it. I rebuilt the dialog's visible list from the result (`groupResults`, at most 3 per section): that list is what the reader sees and what Enter opens. To compare, I ran the same script on `f1110b0` and `961e037` (sources exported with `git archive` to my scratchpad).
- **Ordinary queries are still right** in both languages: `VAT`, `tax`, `company`, `pty`, `invoice`, `logo`, `signage`, `register company`, `register for VAT`, `company name`, `trading name`, `brand colours`, `google drive`, `BTW`, `maatskappy`, `handelsmerk`, `handelsnaam`, `registreer maatskappy`, `begin hier`.
- **Keyboard.** Nothing in `src/scripts/` changed since pass 8, which traced Enter (list on screen, within the debounce, while the index or the results code loads, after either failed to load), arrows then Enter on a stale list, Escape, the close button and the backdrop with an Enter waiting, and re-opening. The dom tests for these all pass, and the e2e keyboard tests pass in chromium and mobile. What changed is what the first option is, which is the major.
- **Mutations.** In a scratch copy of `bc01b0b` (never in the worktree), I changed `src/lib/search-client.ts` and ran `tests/unit/search` and `tests/dom/search.test.ts` (268 tests). Baseline: all pass.

  | Change | Result |
  | --- | --- |
  | An entry asked for by its heading never leads (`named` empty) | killed (7 tests) |
  | Results never carry `allWords` | killed (27) |
  | An entry asked for by its heading keeps its natural score among the all-words results instead of being moved to the front | 1 test fails (`hoe dit gemaak is`) |
  | A demoted entry keeps its full score, not a quarter | **survives** (minor below) |

## Findings

### major: common single words open the changelog's Drive-paste notes first

File: `src/lib/search-client.ts:375-389` (`named`: every about-the-guide entry whose `title` field holds every query word, by the query's own prefix and fuzzy rules, is put in front of all other all-words results, whatever its score); `docs/design-system.md:418-426`
Acceptance item: build plan A7 (search finds what the reader asks for); the brief's step 3 (Enter opens the first option); the task for this pass (single common words in those pages' headings must not push them above the topic the reader meant).

What is wrong: the rule is "the heading holds every word", not "the reader asked for this heading". For a one-word query, any heading on `start/how-this-was-made` or `start/what-has-changed` that contains the word (or a word it prefix- or fuzzy-matches) leads. "What has changed" is mostly a list of editing notes for the Drive copy of the guide, and its headings name other pages: "02 Register - what you actually need", "Choosing the name", "01 Branding prompts", "00 START HERE", "Branding and marketing", "you are the business", "mood and materials", "shortcut path for people whose name is already decided". So the most common words a reader types now open those notes. Dialog list, first option (what Enter opens):

| Query | At `bc01b0b` | At `f1110b0` (same at `961e037` for the first eight rows) |
| --- | --- | --- |
| `register` (en) | changelog "2. "02 Register - what you actually need" — paste under the heading "Choosing the name"" | "Do I need to register a company?" |
| `regist` (en, typing) | the same Drive-paste note | glossary "Registered name" |
| `registreer` (af, fuzzy reaches "Register") | the same Drive-paste note | "Moet ek ’n maatskappy registreer?" |
| `name` (en), `nam` (typing) | the same note, or "Change 1: shortcut path…" | glossary "Trading name" |
| `naam` (af) | "Verandering 1: kortpad vir mense wie se naam reeds besluit is" | glossary "Geregistreerde naam" |
| `branding` (en) | "1. "01 Branding prompts" — paste at the very top, under the title", and the "00 START HERE" note second | "How do I avoid branding that looks AI-made?" |
| `business` (typing) (en) / `besigheid` (af) | "Change 4: you are the business, plus three corrections" | "Can I put the car in the business name?" / "Kan ek die motor in die besigheid se naam sit?" |
| `start here` (en) | "4. "00 START HERE" — add a row to the Branding and marketing table" | "Start here" |
| `brand` (en, typing) | the "01 Branding prompts" note | "Is my branding any good?" |
| `register` (af) | the same Drive-paste note | "Register (selfstandige naamwoord)" (vehicle dealer) |
| `branding` (af) | three Drive-paste notes in a row | glossary "Handelsnaam (trading name)" |
| `choosing the name` (en) | the Drive-paste note, then "Changed: signposts…"; the real "Choosing the name" is 3rd | "Choosing the name" (`core/register/`) |
| `check` (en) | "How to check anything in this toolkit", then the note "5. "02 AI disclosure and how this was checked" — paste into the corrections log…" | "Other things to check" (vehicles) |
| `change` (en) | three "Change N:" changelog headings | food "Person in charge" |
| `materials` (en) / `materiale` (af) | "Change 2: mood and materials step" | "Prompt B: materials and finishes" / "Opdrag B: materiale en afwerkings" |

Less common words show the same: `fix`, `entry`, `shortcut`, `path 3`, `drive`, `plak`, `tabel`, `titel`, `added`.

Who hits it and how often: every reader, in both languages. `register`/`registreer`, `name`/`naam`, `branding` and `business`/`besigheid` are among the first words a one-person business owner types in a guide whose core section is "Register" and whose second section is "Branding and marketing". In the live dialog the word is "being typed", so the prefix reaches these headings from the third letter (`nam`, `regist`, `brand`). The first option is a note telling the guide's maintainer what to paste into a Drive file, which answers nothing; Enter opens it. The changelog notes also show the old file names ("02 Register - what you actually need"), so the reader may think that is the page they wanted.

How to reproduce: `runSearchCounted(en.index, 'register', 'en', {}, BASE).results[0].href` is `…/start/what-has-changed/#2-02-register---what-you-actually-need--paste-under-the-heading-choosing-the-name`.

Suggested fix: do not force a lead; let an about-the-guide entry that the query names in its heading keep its natural score among the all-words results, and keep the demotion for the others. I tried exactly that in a scratch copy (`const all = every.filter((hit) => !demoted(hit))`): `register`, `registreer`, `name`, `naam`, `branding`, `business`, `besigheid`, `start here` open their topic again; `how this was made`, `what has changed`, `AI generated`, `KI gegenereer`, `wat het verander`, `corrections`, `regstellings`, `PAYE deadline` and `EMP201 deadline` keep their pass 7 and 8 answers. Only `hoe dit gemaak is` then opens "Hoe vermy ek ’n handelsmerk wat lyk asof KI dit gemaak het?" first, so that case needs something extra (for example: lead only when the query covers most of the heading's words, not only when the heading covers the query's). Another option is to treat the "What you need to paste into Drive" part of the changelog as maintainer notes that never lead.

Acceptance:

- Add real-index rows for single common words, in both languages: `register`, `registreer`, `name`, `naam`, `branding`, `business`, `besigheid`, `start here`, `check`, and typing `regist`, `nam`, `brand`. None opens a section of `start/what-has-changed` or `start/how-this-was-made` first, and none has one of them in the dialog's first three options.
- The pass 8 rows (`how this was made`, `hoe dit gemaak is`, `what has changed`, `wat het verander`, `AI generated`, `KI gegenereer`, `corrections`, `regstellings`) and the pass 7 rows still hold.
- `docs/design-system.md` states the rule as built.

### minor: no test fails when the quarter weight is removed

File: `src/lib/search-client.ts:384-385` (`weighed`); `src/lib/search/options.ts:57`; `tests/unit/search/index.test.ts:638-650`
Acceptance item: brief "Tests"; `docs/testing.md` (each documented rule has a test).

What is wrong: `DOC_WEIGHT` (a quarter) is documented in `docs/design-system.md` as the rule for an about-the-guide entry named only in passing, but with `score: hit.score` in place of `score: hit.score * docWeight(hit)` all 268 search tests pass. The pass 7 test checks only that the corrections log comes after `glossary/#emp201` and is not in the first two places, which the any-word ordering already gives. If the weight is lost in a later change, the corrections log can climb back over topic entries in the any-word part of the list, unseen. Add a row where the weight decides the order (an any-word topic result that must stay above a demoted about-the-guide entry).

### nit: the "match every word" count no longer matches the leading block

File: `src/lib/search-client.ts:404`; `docs/design-system.md` ("Counts are true totals")
Acceptance item: general quality.

The count now includes demoted about-the-guide entries, which are listed among the any-word results. For `EMP201 deadline` the dialog says "(1 match every word)", but the first result (`glossary/#emp201`) matches only some words; the one that matches every word is the corrections log further down. That is what pass 8's nit asked for, and the string does not promise they lead, so this is only a note: if the fix for the major changes where these entries rank, check the count and the order still read sensibly together.
