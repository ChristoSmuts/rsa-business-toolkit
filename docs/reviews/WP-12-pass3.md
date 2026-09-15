# WP-12 review, pass 3 (REVIEWER-D)

- Package: WP-12, i18n dictionary and helpers
- Branch: `worktree-agent-a6dc8cdd77877812b`, HEAD `679b58c5b05b55a02d195dd9337c564a17a62f05` (commits `7485d31`, `ed92a7a`, `dac907b`, `679b58c`), base `51e9c01`
- Reviewer: REVIEWER-D (independent of the author, REVIEWER-A and REVIEWER-C)
- Date: 2026-09-15
- Scope: the whole diff `51e9c01...679b58c`, not only the pass-2 fixes. Every af.json string was read again.

## Verdict: CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 0 |
| nit | 3 |

All gates pass. They also pass under `TZ=America/New_York` and `TZ=Pacific/Kiritimati`. I checked all 14 pass-2 findings (NM1, N1–N13) against the code, the tests, a probe or a scratch run. None is still open. NM1 is proven in a scratch copy: after steps 1–2 of "Add a language", `zu` typechecks and all 136 tests pass. After step 4, only the four "pin" tests fail, and `docs/i18n.md` names all four. `t()`, plurals, fallback, the formatters and the route helpers held up on a fresh read and on edge-case probes. The dictionary covers Part B. The Afrikaans follows the fixed terms and the decisions made since pass 2 (`’n`, Hoofkontrolelys, no English in brackets in UI labels). What is left is three optional nits.

## Commands run (in the author worktree, clean tree, HEAD `679b58c`)

The machine was heavily loaded. Each gate ran once in the foreground, and none timed out or needed `--maxWorkers=1`.

`pnpm lint` (exit 0)
```
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
```

`pnpm typecheck` (exit 0)
```
$ astro check
Result (21 files):
- 0 errors
- 0 warnings
- 0 hints
```

`pnpm exec tsc --noEmit -p .`
```
tsc exit=0
```
tsc exits 0, so every `@ts-expect-error` in `tests/unit/i18n.test.ts` is still live.

`pnpm test` (exit 0)
```
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  4 passed (4)
      Tests  121 passed (121)
   Start at  17:59:36
   Duration  51.48s (tests 86%, transform 11%, import 3%)
```

`pnpm exec vitest run --project unit --coverage --coverage.include=src/i18n/**/*.ts --coverage.include=src/lib/**/*.ts` (exit 0)
```
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files        |   99.48 |    96.93 |     100 |   99.41 |
 i18n            |     100 |    98.05 |     100 |     100 |
  index.ts       |     100 |    98.01 |     100 |     100 | 276,341
 lib             |   98.36 |       95 |     100 |   98.03 |
  i18n-routes.ts |     100 |    96.42 |     100 |     100 | 94
  paths.ts       |   95.83 |    93.75 |     100 |      95 | 35
Statements   : 99.48% ( 194/195 )
Branches     : 96.93% ( 158/163 )
Functions    : 100% ( 51/51 )
Lines        : 99.41% ( 171/172 )
```

`pnpm build` (exit 0)
```
[build] ✓ Completed in 748ms.
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 1 page(s) built in 1.01s
[build] Complete!
```

Time zone runs (`vitest run --project unit`; the "Start at" clock shows that each zone was applied):
```
TZ=America/New_York   Test Files 4 passed (4)  Tests 121 passed (121)  Start at 18:07:12  exit=0
TZ=Pacific/Kiritimati Test Files 4 passed (4)  Tests 121 passed (121)  Start at 18:07:56  exit=0
```

Ownership: `git diff --name-only 51e9c01...HEAD` lists:
- `astro.config.ts`
- `docs/i18n.md`
- `src/i18n/{af.json,en.json,index.ts,locales.ts}`
- `src/lib/{i18n-routes.ts,paths.ts}`
- `tests/unit/{format,i18n-routes,i18n,paths}.test.ts`

All of them are owned paths. `dac907b..HEAD` touches only `docs/i18n.md`, both JSON files, `index.ts`, `i18n-routes.ts` and four test files. `git status --short` in the worktree is empty after my review.

Key count (a node flatten script, `scratchpad/wp12-pass3/flat.mjs`): 662 leaf keys in both `en.json` and `af.json`, and 673 strings when each plural form counts separately. No key is missing or extra. This confirms the author's figure.

Scratch work (all under `scratchpad/wp12-pass3/`, and nothing in the worktree was edited):
- `probe.mts`: route and date edge cases, run with the worktree `tsx`.
- `side.txt`: every EN and AF string side by side.
- `zu/`: `git archive HEAD` extracted, with a junction to the worktree `node_modules`, used for the zu trial.

An incident to report honestly: the first `pnpm exec` in `zu/` started pnpm's dependency check, which runs `pnpm install`. pnpm then refused with `ERR_PNPM_UNSAFE_MODULES_DIR`, so it did not remove the junction target. I then called `tsc` and `vitest` straight from `node_modules`. I confirmed afterwards that the worktree `node_modules/.pnpm` is intact and that `git status` is clean.

## Pass-2 findings: verification

| Id | Status | Evidence |
|---|---|---|
| NM1 Label-length exceptions and zu trial | Verified | `LABEL_LENGTH_EXCEPTIONS` is keyed by locale (`i18n.test.ts:392-400`), and `describe.each` reads `LABEL_LENGTH_EXCEPTIONS[code] ?? {}`. The planned-locale examples use `LOCALES.find((entry) => !entry.enabled)` (`i18n.test.ts:156`, `paths.test.ts:15`, `i18n-routes.test.ts:9`). **Scratch trial** in `zu/`: (1) I copied `en.json` to `zu.json`, set `uiDictionary: true`, and added `import zu` and `{ en, af, zu }` to `index.ts`. `tsc --noEmit` exit 0, **Tests 136 passed (136)**. (2) Step 4: `enabled: true`, `status: 'partial'`. tsc exit 0, **4 failed / 132 passed**. The four are `localeStaticPaths > emits undefined…`, `enables only English and Afrikaans…`, `builds the sitemap locale map…` and `paths > comes from src/i18n/locales.ts`, which are exactly the tests `docs/i18n.md` step 4 names. `drives astro.config.ts` still passes. This matches the author's report. |
| N1 EN headings match source | Verified | `checklist.title`, `keyToShortWords` and `parts.a`–`d` are byte-identical to `05 Look it up/02-master-checklist.md` lines 1, 5, 34, 87, 118, 170 and 194 (compared by script). The new section "Strings that mirror content headings" is present. One inaccuracy in that section is logged as nit P1. |
| N2 PromptBlock named variants | Verified | `prompts.fillFromProfileNamed`, `undoFillNamed` and `showLessNamed` are in EN, AF, `ParamNames` and the docs pairs list. Wording nit: P2. |
| N3 Templates done messages | Verified | `templates.clearDone` "The form was cleared." / "Die vorm is skoongemaak." `templates.startNextDone` "Invoice {number} started." / "Faktuur {number} is begin." `ParamNames` has `'templates.startNextDone': 'number'`. |
| N4 Four Afrikaans fixes | Verified | `recipient`, `tradingAsLine` "Reg.nr.", `markNotDoneNamed` "van … af" and `copyFailed` "druk lank daarop" all match the pass-2 table. |
| N5 "Setup effort" and unclear EN | Verified | `grep -i "setup work"` finds nothing. `doc.effort`, `wizard.types.effort`, `businessTypes.effortLabel`, `businessTypesHub.effortHeading`/`effortMeter`/`effortLead` all say "setup effort". `ifYouLead`, `numberHint`, `validForDays` and `receiptWarning` were rewritten, and the AF strings were changed to match. One small leftover is folded into P2. |
| N6 Escape in instructions | Verified | `search.instructions` ends "Press Escape to close search." / "Druk Escape om die soektog toe te maak." |
| N7 Exceptions count in docs | Verified | `docs/i18n.md:166` now says "Exceptions are listed per locale in `LABEL_LENGTH_EXCEPTIONS`…" and gives no number. |
| N8 ParamNames failure message | Verified | `entries()` splits the collapsed block per key (`i18n.test.ts:445`), so `toEqual` shows a per-key diff. The message and `index.ts:57-58` both include `-t ParamNames` and the `prettier --write` step. |
| N9 Meaningless inputs | Verified (one part accepted as is) | Probe results: `+14:01` and `-23:59` throw `Invalid time zone offset`, and a test covers them. `switchLocaleUrl('/business-toolkit//af//core/','en')` gives `/business-toolkit/core/`. `mailto:` and `data:` throw `Expected an http or https URL`. `alternateUrls('https://…')`, `'//x.test/…'` and `'mailto:x@y'` throw. `alternateUrls('en/core/')` still gives `/en/core/` and `/af/en/core/`, and the same happens for `switchLocaleUrl('/business-toolkit/en/core/','af')`. Neither input is documented usage, because English URLs never carry `en/`. The output stays same-origin under `base`. Accepted. |
| N10 `validation.required` | Verified | "{field}: fill this in." / "{field}: vul dit in." Probe: "Business name: fill this in." |
| N11 Words-used term | Verified | The terminology table has the row "Words used in this file (heading) → Woorde in hierdie lêer", and the mirror table lists `doc.wordsUsed`. |
| N12 Afrikaans polish | Verified (10 of 11 applied, 1 justified) | Applied: `issueWithin`, `ifYouLead`, `startWithLead`, `notFound.suggestion`, `settingsUnavailable`, `designSystem.pass`, `fourThings.sars`, `printName` ("Naam (drukletters)", equally good), `validForDays`, `numberHint`. Not applied: `nav.menuOpen` "Maak kieslys oop" (16 characters against "Open menu", 9) would fail the length rule (16 > 14.4, and 7 characters longer). "Wys kieslys" is correct, natural Afrikaans. Keeping it is justified. |
| N13 "item" in checklist | Verified | `nav.toolDescriptions.checklist` is "Tick each item when you finish it" / "Merk elke item af wanneer jy klaar is", which is consistent with `checklist.intro` and `home.whereToStart.checklist.body`. |

## Whole-diff review

### Correctness
- **`t()` and fallback:**
  - `translateFrom` uses the locale's leaf only when its shape matches English. Otherwise it falls back to English and warns in dev. Unknown and group keys return the key.
  - `Object.hasOwn` guards inherited names (`toString`).
  - Plural objects are leaves, so `search.results.one` is not a key.
  - A missing or non-numeric `count` falls back to `other` with a warning.
  - `interpolate` uses a replacer function, so `$&` and `{b}` inside values are inserted literally.
- **`pick` and `createTranslator`:** `mergeWithFallback` drops extra locale keys and repairs shape mismatches. For English, `pick` merges English with itself, which is harmless.
- **`formatDate`:**
  - The strict regex rejects hour 24, lower-case `z`, a missing zone and more than 9 fraction digits.
  - A `calendarDate` round trip catches `2026-02-30`, and it runs for timestamps too.
  - The new offset bound is correct.
  - Only UTC getters are used, so the result does not depend on `TZ`, which the two TZ runs confirm.
- **`formatRand` and `formatNumber`:**
  - Rounding shifts through the exponent string, so `1.005` gives `1.01`.
  - NBSP is used, and `-0` is normalised.
  - `MAX_RAND_AMOUNT` guards the precision limit.
- **Routes:**
  - `localeStaticPaths` gives `undefined` for `en`.
  - `alternateUrls` removes a locale prefix, drops the query and hash, ignores the site path, and adds `x-default` only when English is present.
  - `switchLocaleUrl` accepts a path, a full http(s) URL or a `URL`, collapses `//`, and keeps the query and hash.
  - Every output starts with `base`.

### Completeness against Part B
I walked through B1–B6 again: routes, top bar and drawer, sidebar ticks, TOC and pill, pager, the nine B3 flows, the B4 inventory (Toast, EmptyState, Stepper, SearchDialog, KeyboardHelp, MT notice, TemplateForm, PromptBlock), B5 live regions and validation summary, and every B6 page spec. Each surface has keys. Pass 2's two gaps, the PromptBlock names and the templates clear announcement, are now filled. I found no new gap.

### English
The strings are plain and short, and terminology is consistent after N5. Only the small wording issues in P2 remain.

### Afrikaans
I read all 673 strings (`side.txt`), including the 45 changed in pass 3.
- **Fixed terms:**
  - eenmansaak/eenmansake, BTW (prose only; the test enforces it), omsetbelasting, kontrolelys, woordelys, sjabloon/sjablone, roete, opdrag, Nutsgoed, toets and regsgeleerde are used consistently.
  - Hoofkontrolelys appears in `checklist.title` and in lower case in `nav.sections.lookup.description` and `home.whereToStart.checklist.body`.
  - "voorlopige belasting" is still not needed in the UI.
- **Decisions since pass 2:**
  - **`’n`:** the U+2019 form is used everywhere. A grep for `'n`, `‘n` or a bare `n` article finds nothing, and the text-rule test forbids U+0027.
  - **"Hoofkontrolelys":** used, as above. It is never written "Meesterkontrolelys".
  - **Brackets:** no English term appears in brackets in a UI label. All 14 bracketed AF strings contain Afrikaans ("(eenmansaak)", "(drukletters)", "(verkorte)", "(BTW ingesluit)"), a fixed name that is also bracketed in EN ("(Pty Ltd)", "(Claude, …)"), or a placeholder. The glossary "English in brackets" rule applies to content, as intended.
- **General:** the register is "jy" throughout. Diacritics are correct. Placeholders and digits are identical (the tests pass). Pass-3 changes read naturally. "Verklaring van die kort woorde" is a good heading for "Key to the short words". "Opgawes by SARS indien" and "Moenie dit stuur terwyl die betaling nog hangende is nie" are correct. One optional ambiguity is logged as P3.

### Accessibility naming
Every repeated control in the B4 inventory now has a named variant, and the docs list the pairs. Live-region strings exist for copy, totals, reset, clear, start-next and result counts. `nav.breadcrumbLabel` "You are here" / "Waar jy is" is fine for a landmark.

### Tests
The tests check behaviour and are deterministic: they use only UTC getters, fixed SAST, and fixed inputs. They cover key parity for every `uiDictionary` locale, per-locale length exceptions with a stale guard, the figure rule, `ParamNames` staleness, `@ts-expect-error` type checks, strict error paths and the new offset, scheme and double-slash cases. Coverage of `src/i18n` and `src/lib` is 99.4% of lines. The uncovered lines are defensive branches.

### Maintainability
- `LOCALES` is the one source of truth. The zu trial shows that adding a language needs only the documented edits.
- Per-locale exceptions and the planned-locale helper remove the Afrikaans-only assumptions from pass 2.
- `docs/i18n.md` is accurate apart from P1.

---

## New findings

### nit: P1. `docs/i18n.md` mirror table: "first H2" is not always true, and two table rows are misaligned
File: docs/i18n.md:177 (and :64 / :242 alignment); src/i18n/index.ts:464
Acceptance item: general quality (docs)
What is wrong:
- The table says `doc.wordsUsed` is "the first H2 in the documents that have one". In `03 Paperwork and templates/02-free-tools.md`, the first H2 is "Which office software to use", and "Words used in this file" comes later. It is correct in the other 18 documents.
- `docs/` is in `.prettierignore`, so the rows at lines 177 and 242 stay unaligned in the raw markdown. They still render correctly.
- The comment at `index.ts:464` says real offsets run "from -12:00 to +14:00", but the check accepts ±14:00 on both sides. The tested behaviour, "up to ±14:00", is fine. Only the comment is off.

How to reproduce:
- For each doc that has a `## Words used in this file`, compare it with `grep -m1 "^## "` on the same file.
- Probe: `formatDate('en','2026-09-13T10:00:00-14:00')` returns `14 September 2026` without throwing.

Suggested fix:
- Say "the H2 'Words used in this file' in the documents that have one".
- Realign the two rows.
- Reword the comment to "±14:00".

### nit: P2. Wording of the new PromptBlock names and one N5 rewrite
File: src/i18n/en.json:614, 616, 625 (`prompts.fillFromProfileNamed`, `undoFillNamed`, `showLessNamed`); en.json:211 (`businessTypesHub.effortLead`)
Acceptance item: "plain language for second-language readers"; "a11y strings are meaningful"
What is wrong:
- The new names mix identifiers. `copyNamed` uses `{n}: {title}`, `fillFromProfileNamed` and `undoFillNamed` use only `{n}`, and `showFullNamed` and `showLessNamed` use only `{title}`. Each name is unique on the page, so this is not an accessibility failure. It is only inconsistent.
- "Undo the fill in prompt {n}" uses "fill" as a noun.
- "Show less of prompt: {title}" is awkward.
- In `effortLead`, "This shows about how much setup effort…" can be read as "shows (about) how much", a small trap for second-language readers.

Suggested fix (optional):
- "Fill prompt {n} from my profile: {title}"
- "Undo filling in prompt {n}: {title}"
- "Show less of prompt {n}: {title}"
- "This shows roughly how much setup effort…"

Mirror the changes in AF (for example "Ontdoen die invulling in opdrag {n}: {title}", "Wys minder van opdrag {n}: {title}"), and regenerate `ParamNames`.

### nit: P3. Afrikaans `templates.noVatNotice`: "BTW-reël" can read as "VAT rule"
File: src/i18n/af.json (`templates.noVatNotice`)
Acceptance item: "natural jy-register Afrikaans"
What is wrong: "reël" means both "line" and "rule". "Hierdie faktuur het geen BTW-reël…" can therefore first read as "this invoice has no VAT rule". On a legal-requirements notice, that is an avoidable ambiguity. Elsewhere in templates, "reël" clearly means a line item, because the context is "Voeg reël by".
Suggested fix: see the table below.

## Afrikaans correction table

| Key | Current | Suggested | Reason |
|---|---|---|---|
| `templates.noVatNotice` | Jy is nie vir BTW geregistreer nie. Hierdie faktuur het geen BTW-reël, geen BTW-nommer en nie die woorde “Tax Invoice” nie. | Jy is nie vir BTW geregistreer nie. Hierdie faktuur wys geen BTW, geen BTW-nommer en nie die woorde “Tax Invoice” nie. | Removes the "reël" = rule reading (P3). Digits and the quoted literal are unchanged. |
| `prompts.undoFillNamed` (only if P2 is taken up) | Ontdoen die invulling in opdrag {n} | Ontdoen die invulling in opdrag {n}: {title} | Keeps AF in step with the EN change. |
| `prompts.showLessNamed` (only if P2 is taken up) | Wys minder van die opdrag: {title} | Wys minder van opdrag {n}: {title} | Same as above. |

No other Afrikaans change is needed. Pass-2 wording that I checked again and accept:
- "Wys kieslys": length rule.
- "Naam (drukletters)".
- "Faktuur {number} is begin.": grammatical, and the passive of *begin* is *begin*.
- "Verklaring van die kort woorde".
- "Deel D: die vier dinge wat ernstige moeilikheid veroorsaak": it keeps the EN meaning, and the AF content heading must use these words once that tree exists.
