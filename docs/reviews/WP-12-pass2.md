# WP-12 review, pass 2 (REVIEWER-C)

- Package: WP-12, i18n dictionary and helpers
- Branch: `worktree-agent-a6dc8cdd77877812b`, final commit `dac907b` (commits `7485d31`, `ed92a7a`, `dac907b`), base `51e9c01`
- Reviewer: REVIEWER-C (independent of the author and of REVIEWER-A, who did pass 1)
- Date: 2026-09-15
- Scope: the whole diff `51e9c01...dac907b`, not only the fixes

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 1 |
| minor | 5 |
| nit | 8 |

I checked every pass-1 finding against the code, the tests or a probe, and did not rely on the fix report (table below). 19 of the 21 are verified as fixed. n6 is outside WP-12 scope and stays with the orchestrator. m4 is only partly fixed. The type change and the parity loop work, but following "Add a language" in a scratch copy still fails `pnpm test` after steps 1–2, which the docs say pass cleanly. The cause is the new label-length test from the m8 fix (major NM1). All gates pass on the branch as it stands. They also pass under `TZ=America/New_York` and `TZ=Pacific/Kiritimati`. `formatDate` and the route helpers held up under about 90 edge-case probes. A scratch copy proves that the `ParamNames` staleness test fails when a placeholder is added, and that the documented regeneration fixes it. Besides NM1, the findings left are minor or nit: a few UI labels that no longer match the English source headings, a few repeated PromptBlock buttons without a named variant, one missing "form cleared" announcement, and some Afrikaans and English polish.

## Commands run (in the author worktree, HEAD `dac907b`, clean tree)

`git -C <worktree> status --short --ignored` lists only ignored build output (`.astro/`, `coverage/`, `dist/`, `node_modules/`). HEAD is `dac907b1c0aba325ab2c747a0c31ab4f22c660af`.

`pnpm lint`
```
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
```

`pnpm typecheck`
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
Because tsc exits 0, every `@ts-expect-error` in `tests/unit/i18n.test.ts` is live: an unused directive would be an error. That covers the 13 directives at lines 512, 514, 522, 539, 546, 548, 554, 556, 558, 567, 569, 633 and 636. Ten of them are parameter checks: the fix report's "7" undercounts.

`pnpm test`
```
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  4 passed (4)
      Tests  117 passed (117)
   Duration  32.00s (tests 89%, transform 8%, import 2%)
```

`pnpm exec vitest run --project unit --coverage --coverage.include=src/i18n/**/*.ts --coverage.include=src/lib/**/*.ts`
```
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files        |   99.46 |    96.77 |     100 |   99.39 |
 i18n            |     100 |    98.01 |     100 |     100 |
  index.ts       |     100 |    97.97 |     100 |     100 | 271,336
 lib             |   98.21 |    94.44 |     100 |   97.91 |
  i18n-routes.ts |     100 |    95.45 |     100 |     100 | 88
  paths.ts       |   95.83 |    93.75 |     100 |      95 | 35
Statements   : 99.46% ( 186/187 )
Branches     : 96.77% ( 150/155 )
Lines        : 99.39% ( 165/166 )
```

`pnpm build`
```
[build] ✓ Completed in 1.47s.
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 1 page(s) built in 1.64s
[build] Complete!
```

Time zone runs (`vitest run --project unit` with `TZ` set; the "Start at" clock confirms the zone was applied):
```
TZ=America/New_York   Test Files 4 passed (4)  Tests 117 passed (117)  Start at 10:40:16  exit=0
TZ=Pacific/Kiritimati Test Files 4 passed (4)  Tests 117 passed (117)  Start at 04:41:56  exit=0
```
Nothing was flaky. Each gate ran once and passed.

Ownership: `git diff --name-only 51e9c01...HEAD` lists `astro.config.ts`, `docs/i18n.md`, `src/i18n/{af.json,en.json,index.ts,locales.ts}`, `src/lib/{i18n-routes.ts,paths.ts}` and `tests/unit/{format,i18n-routes,i18n,paths}.test.ts`. All of them are owned paths. The `astro.config.ts` diff changes only `i18n.defaultLocale`, `i18n.locales` and the sitemap `i18n` block. The `paths.ts` diff only replaces the local locale list with an import from `locales.ts`. `package.json` is unchanged.

Scratch work (all under `…/scratchpad/wp12-pass2/`; the worktree was never edited):
- `probe.mts`: `formatDate`, `switchLocaleUrl` and `alternateUrls` probes, run with the worktree `tsx` under the default zone (SAST), Kiritimati (UTC+14) and New York. The three outputs are identical line for line (`Compare-Object` gives 0 differences).
- `proj/`: a copy of the i18n files and `i18n.test.ts`, with a junction to the worktree `node_modules`. Used for the staleness proof.
- `projzu/`: a second copy. Used to follow "Add a language" in `docs/i18n.md`.
- `mutate.mjs`: edits only the scratch copies (it refuses any path without `scratchpad`).

Key count: 657 leaf keys in both `en.json` and `af.json` (668 strings when plural forms are counted one by one). The key sets are identical, and no key is missing or extra. This confirms the fix report. Removed since `ed92a7a`: `doc.hiddenReason` and `businessTypes.effort.low`.

## Pass-1 findings: verification

| Id | Status | Evidence |
|---|---|---|
| M1 Part B coverage | Verified | New groups exist: `section`, `businessTypesHub`, `keyboardHelp`, `contents`, `validation`, `storage`, `designSystem`. So do `doc.related.*`, `doc.readCoreFirstTitle`, `doc.checklistComplete`/`…Named`, `search.instructions`, `search.shortcutHintCtrlK`, `search.groupLabel`/`resultPath`/`resultKind`, `about.shortcuts.keys.{ctrlK,altLeft,altRight}`, `about.shortcuts.modifierNote` and `sources.legislation.*`. Every pass-1 bullet has keys. My own B1–B6 walk found two small leftovers, logged as new findings N2 and N3 (minor). |
| M2 Template fields and seven items | Verified | `templates.fields.*` has 56 labels and hints, covering business, customer, document, payment, receipt, acceptance and POPIA fields. `templates.required.taxInvoice.{words,supplier,recipient,numberAndDate,description,quantity,values}` matches `03-tax-invoice-vat-registered.md:51-57` item for item. `thresholds.{none,abridged,full}`, `issueWithin` and `secondHand` match lines 5 and 63. The amounts and the 21 days are parameters. |
| M3 Ambiguous repeated controls | Verified | `glossary.copyLinkTo`, `doc.copyLinkTo`, `sources.copyLinkTo`, `doc.showHiddenNamed`, `doc.showNamed`/`hideNamed`, `templates.openNamed`, `myPath.readStep`, `myPath.markDoneNamed`/`markNotDoneNamed`, `prompts.copyNamed`/`copiedNamed`/`showFullNamed`, `common.closeNamed`/`dismissNamed` and `site.updatedDismiss` all exist in EN and AF and are documented in `docs/i18n.md` "Accessible names". Three toolbar buttons are still unnamed: see N2. |
| M4 Afrikaans errors | Verified | All nine M4 rows were adopted verbatim: `gekontroleerde` (×2), `In my eie naam`, `Kies alles wat pas … koswa … besit ook ’n voertuig`, `Toets`, `Eentoetskortpaaie` (×2), `regsgeleerde`, `Laedatamodus`. |
| m1 Typed params | Verified | `ParamNames` generated block (`index.ts:60-167`), `ParamsFor`/`ParamArgs`. tsc exits 0 with the live `@ts-expect-error` lines. Scratch proof: see "Generated ParamNames" below. |
| m2 Strict `formatDate` | Verified | `2026-02-30T10:00:00Z` and `2026-02-29T10:00:00Z` throw `Invalid date`. Full probe results are below. |
| m3 `switchLocaleUrl` full URLs | Verified | `https://x.test/business-toolkit/core/?a=b#h` → `/business-toolkit/af/core/?a=b#h`. `//x.test/…` is handled. `core/`, `?q=1` and `#top` throw `RangeError`. |
| m4 Add a language | **Not verified (partly fixed)** | `DICTIONARIES` is `Partial<Record<LocaleCode, DictTree>>` (`index.ts:192`), so registering `zu` while it is disabled typechecks. `DICTIONARY_LOCALES` filters on `uiDictionary` (`i18n.test.ts:79`), and the scratch run confirms `zu` gets the parity, param, plural, digit and text-rule tests. The documented end state is still not reached: after steps 1–2, `pnpm test` fails `zu label length > has no stale exceptions`. See NM1. |
| m5 Hard-coded figures | Verified | `templates.vat` is `VAT ({rate}%)`, `home.threeNumbers.heading` uses `{year}`, and `findMyPathHint`, `wizard.intro`, `fiveMinutes.title`, `ptyGrowingDisabled` and `turnoverTaxZero` are parameterised. The new test "English strings take figures from {param} values" allows only `checklist.parts.a2`. |
| m6 `doc.hiddenReason` | Verified | Replaced by full sentences in `doc.hiddenFor.{sole-prop,pty,businessTypes}`. AF uses "net vir ’n eenmansaak". |
| m7 English plain-language slips | Verified | `about.licence`, `about.settings.shortcutsHelp`, `nav.toolDescriptions.checklist` and `nav.breadcrumbLabel` all use the suggested wording (old→new diff checked). |
| m8 Length test | Verified | Every EN leaf of at most 24 characters is checked (`i18n.test.ts:389`). A test guards the count (>200) and a test flags stale exceptions. There are three exceptions with reasons, but the docs still say two: see N7. |
| m9 Afrikaans phrasing | Verified | All 16 m9 rows and all 13 unmarked pass-1 rows were adopted, except `home.trust.free`. The author rewrote the EN source instead ("Free, and you do not need an account" / "Gratis, en jy het nie ’n rekening nodig nie"). That resolves the log-in ambiguity the row was about. |
| n1 Bundle note | Verified | `docs/i18n.md` now says the dictionaries are tree-shaken and gives the probe size. |
| n2 `effort.low` | Verified | The key is removed from EN and AF. |
| n3 Doubled prefix | Verified | Probe: `alternateUrls('af/', …, '/')` and `('af', …, '/business-toolkit/')` give `/` and `/af/` with no doubling. The docs and a test cover it. |
| n4 `formatRand` precision | Verified | `MAX_RAND_AMOUNT` is `Number.MAX_SAFE_INTEGER / 100`, and larger amounts throw (`format.test.ts` "throws above the amount where cents stop being exact"). |
| n5 Plural param union | Verified | The comment on `paramNames()` (`i18n.test.ts:56-60`) explains the union on purpose. |
| n6 `tsc` in `gate:fast` | Deferred (not WP-12) | `package.json` is not an owned path and is unchanged. The orchestrator will handle it. I confirmed tsc passes today. |
| n7 Close verbs | Verified | `nav.menuClose`, `search.close`, `about.shortcuts.escape`, `keyboardHelp.close` and `common.close*` all use "Maak … toe". |
| n8 Nutsgoed or hulpmiddels | Verified (judgement) | The UI concept "Tools" is "nutsgoed" everywhere (`nav.tools`, `site.noJs`). `nav.sections.paperwork.description` keeps "gratis hulpmiddels" for the source doc *free tools* (external software). That is a different concept, and the split is acceptable. |

## Probe results

### Generated `ParamNames`

- **How it is generated:** the test `ParamNames in index.ts` builds the expected block from `en.json`. With `I18N_UPDATE_TYPES=1` it rewrites the text between the `@generated-start` and `@generated-end` markers in `src/i18n/index.ts`. It compares with whitespace collapsed, so Prettier reflow never makes the block stale.
- **Documented:** `docs/i18n.md:60-61` (with `-t ParamNames` and a Prettier step), `index.ts:57`, and the failure message at `i18n.test.ts:463`. `cross-env` is already a dev dependency. The command is reproducible.
- **Proof in `proj/` (scratch copy):**
  1. Unmodified copy: `Tests 1 passed | 61 skipped`.
  2. Add `{section}` to `nav.next` in en.json and af.json: `FAIL … ParamNames in index.ts > lists the {param} names of every English key`, `AssertionError: Out of date. Run: pnpm exec cross-env I18N_UPDATE_TYPES=1 vitest run …`, `Tests 1 failed`.
  3. Regenerate with `I18N_UPDATE_TYPES=1`: passes, and `index.ts:70` becomes `'nav.next': 'section' | 'title';`.
  4. Rerun without the flag: `Tests 1 passed`.
  5. tsc on the copy now reports the stale call site: `tests/unit/i18n.test.ts(477,32): error TS2345 … Property 'section' is missing`. The other two tsc errors in the copy (`import.meta.env`) come from the missing `.astro/types.d.ts` in the scratch copy, not from the package.
- **Ergonomics:** normal calls read the same as before, for example `tr('nav.next', { title })`. Dynamic keys built from typed unions work, because `ParamArgs` distributes over the union. A key typed as the wide `TranslationKey` accepts any `Params`. That is the expected escape hatch, and the parity test covers it at runtime. The one rough edge is the failure message: see N8.

### `formatDate` (identical output under SAST, UTC+14 and UTC−5)

| Input | Result |
|---|---|
| `2026-09-13T23:59:59+02:00` / `2026-09-14T00:00:00+02:00` | 13 September / 14 September 2026 |
| `2026-09-13T21:59:59Z` / `…T22:00:00Z` | 13 / 14 September 2026 |
| `2026-09-13T20:00:00-04:00` | 14 September 2026 |
| `2026-12-31T20:00:00-12:00` | 1 January 2027 |
| `2026-09-13T21:59:00-00:00`, `2026-09-13T12:00-0930` | 13 September 2026 |
| `2027-01-01T01:00:00+14:00`, `2026-09-14T00:30:00+05:30` | 31 December 2026, 13 September 2026 |
| `…21:59:59.999Z`, `…21:59:59.999999999Z` | 13 September 2026 (the fraction is truncated, never rounded up across midnight) |
| `…59.9999999999Z` (10 digits), `…59,5Z`, `…21:59.5Z` | `RangeError` |
| `2024-02-29`, `2000-02-29` | 29 February 2024, 29 February 2000 |
| `2024-02-29T23:00:00Z` | 1 March 2024 |
| `2026-02-29`, `2026-02-29T10:00:00Z`, `2100-02-29` | `RangeError: Invalid date` |
| `2026-12-31T21:59:59Z` / `…22:00:00Z` (af) | 31 December 2026 / 1 Januarie 2027 |
| `2027-01-01T00:00:00+04:00` | 31 December 2026 |
| `0099-12-31` | `RangeError` (the `Date.UTC` two-digit-year trap is caught) |
| `2026-09-13Z`, `2026-09-13T`, space separator, `+02` without minutes, lower-case `t`, trailing newline, full-width digits | `RangeError` |
| `+14:01`, `+23:59` | Accepted (see N9) |

### `switchLocaleUrl` and `alternateUrls` (base `/` and `/business-toolkit/`)

All of these are correct, and English output never has an `/en/` prefix:
- `/` ↔ `/af/`, and `/af` → `/`.
- `/africa/` → af `/af/africa/`, en `/africa/`. `/af/africa/?q=1#x` → `/africa/?q=1#x`. `/afrikaans` → `/af/afrikaans/`.
- `%23` in the query survives.
- Full URLs, `HTTP://`, `//host/…` and `URL` objects keep the query and hash.
- `//x.test` with no path → the locale home.
- Relative input (`core/`, `?q=1`, `#top`) throws.
- `alternateUrls('')`, `'/'`, `'af'`, `'af/'`, `'africa/'` and `'/africa/?q=1#x'` all give one prefix per locale, plus `x-default` pointing to English. A path on `site` is ignored.
- Security: the output always starts with `base`. `javascript:alert(1)` becomes the harmless same-origin path `/af/alert(1)/`.

Odd but harmless inputs are listed in N9.

### Tests

The new tests check behaviour, not implementation:
- key parity over every `uiDictionary` locale;
- a figure rule;
- a length rule with a stale-exception guard;
- the generated-type staleness check;
- strict date and URL error paths;
- `@ts-expect-error` type checks.

They are deterministic. Dates use only UTC getters and the SAST offset is fixed, and both TZ runs pass. `drives astro.config.ts` has a 30 s timeout (`i18n.test.ts:172`). That is generous but justified by the Vite load time: it took about 5–10 s locally while other jobs ran. The plural-category test reads `Intl.PluralRules`. All 11 SA locales report `one,other` in Node 24, so the rule in `docs/i18n.md` that plural categories must match English cannot conflict with a planned language today.

---

## New findings

### major: NM1. "Add a language" steps 1–2 fail `pnpm test`: the length-test exceptions only work for Afrikaans
File: tests/unit/i18n.test.ts:389-431 (`describe.each(TRANSLATED)('$code label length')`, shared `EXCEPTIONS`); docs/i18n.md "Add a language" ("Steps 1 and 2 go in one commit, and typecheck and test cleanly while `enabled` is still `false`")
Acceptance item: "adding language #3 is really as documented" (pass-1 m4)
What is wrong: `EXCEPTIONS` is a single list, applied to every translated dictionary. The reasons in it are about Afrikaans only ("“Stel terug” is the usual Afrikaans word"). "has no stale exceptions" fails for any locale where an exempted key is not too long. So a new `uiDictionary: true` locale fails the gate as soon as it is registered, which is the exact state the docs call clean. A locale that needs its own exceptions cannot add them either, because the list is shared. This came in with the m8 fix, and m4 exists to prevent exactly this.
How to reproduce: in a scratch copy (`scratchpad/wp12-pass2/projzu`), copy `en.json` to `zu.json`, set `uiDictionary: true` for `zu` in `locales.ts`, and add `zu` to `DICTIONARIES` as in docs step 2. Then run `vitest run --project unit`:
```
 FAIL  |unit| tests/unit/i18n.test.ts > zu label length > has no stale exceptions
AssertionError: expected [ 'common.reset', …(2) ] to deeply equal []
+   "common.reset",
+   "businessTypes.retail-online.short",
+   "templates.items.privacy-notice.name",
 Test Files  1 failed | 3 passed (4)
      Tests  1 failed | 131 passed (132)
```
All other `zu` checks pass: parity, placeholders, plural categories, digits, text rules and the length rule itself. tsc is clean apart from the two `import.meta.env` errors, which come from the scratch copy's missing `.astro/types.d.ts` and do not occur in the worktree.
Suggested fix: key the exceptions by locale, for example `const EXCEPTIONS: Partial<Record<LocaleCode, Record<string, string>>> = { af: { … } }`, and read `EXCEPTIONS[code] ?? {}` inside the `describe.each`. Keep the stale check per locale. Add a test, or rerun this scratch walk, to prove that a copied `en.json` registered as a new dictionary passes. Secondary (nit-level, can be done at the same time): at step 4, three tests fail because they use `zu` as their "planned locale" example: `paths.test.ts` "does not treat a planned locale prefix as a locale", `i18n.test.ts` "checks and looks up codes", and `i18n-routes.test.ts` "ignores unknown, planned and duplicate codes". The docs only mention "tests that pin the enabled list to ['en', 'af']". Derive the planned example from `LOCALES.find(l => !l.enabled)`, or name these tests in the docs.

### minor: N1. Some English UI labels no longer match the English source headings
File: src/i18n/en.json:375, 400 (`checklist.parts.d`, `checklist.keyToShortWords`); source `docs/rsa-business-toolkit/05 Look it up/02-master-checklist.md:5, 194`
Acceptance item: CLAUDE.md "Markdown in `docs/` is the source of truth". A6 "Heading ids are EN slugs".
What is wrong: the fix for pass-1 m9 changed the **English** strings to "Part D: the four things that cause serious trouble" and "What the short words mean". The source headings are still "Part D: the four things that cause real trouble" and "Key to the short words". On `/checklist/` the `<details>` summary (UI key) will differ from the heading text in search results, the contents page and the anchors (`#part-d-the-four-things-that-cause-real-trouble`). Pass-1 m9 asked only for an Afrikaans change and noted that the AF string must match the AF content heading.
How to reproduce: `grep -n "Part D\|Key to" "docs/rsa-business-toolkit/05 Look it up/02-master-checklist.md"`, then compare with `en.json:375,400`.
Suggested fix: restore the EN strings to the source headings, or let the checklist page render these headings from content and remove the keys. Record in `docs/i18n.md` that UI labels which mirror a content heading must match it byte for byte. If "real trouble" is too idiomatic, change the markdown in a content package.

### minor: N2. PromptBlock toolbar still has repeated unnamed buttons
File: src/i18n/en.json:611, 612, 620 (`prompts.fillFromProfile`, `prompts.undoFill`, `prompts.showLess`)
Acceptance item: "a11y strings are meaningful for screen readers; labels are not ambiguous out of context" (pass-1 M3)
What is wrong: B4 PromptBlock has a toolbar and a 14-line clamp disclosure on every prompt, which means about 10 per branding doc. "Copy prompt" and "Show full prompt" now have `…Named` variants, but "Fill from my profile", "Undo" and "Show less" do not. A screen-reader list of buttons still gives about 10 identical "Undo" and "Show less" entries.
How to reproduce: `grep -n "Named" src/i18n/en.json | grep prompts`
Suggested fix: add `prompts.fillFromProfileNamed` ("Fill prompt {n} from my profile"), `prompts.undoFillNamed` ("Undo the fill in prompt {n}") and `prompts.showLessNamed` ("Show less of prompt {n}: {title}"). Mirror them in af.json and add them to the `docs/i18n.md` pairs list.

### minor: N3. No announcement after "Clear form" on templates
File: src/i18n/en.json:571-575 (`templates.clear`, `templates.clearConfirm`)
Acceptance item: B5 "live regions for copy/totals/reset/result counts"; B3.5 "Clear (confirm)"
What is wrong: every other destructive reset has a done message for the polite live region: `checklist.resetDone`, `myPath.resetDone` and `about.settings.clearDone`. The template form has a confirm dialog but no "Form cleared" string, so the templates package would have to hard-code it or add a key outside WP-12. This was the only surface I found missing in my independent B1–B6 walk. Everything else in B1 routes, B2 navigation, B3.1–B3.9 flows, the B4 component inventory, B5 and every B6 page spec has keys.
How to reproduce: `grep -n "clearDone\|resetDone" src/i18n/en.json` has no `templates.*` match.
Suggested fix: add `templates.clearDone`: "The form is cleared." / "Die vorm is skoongemaak." If the orchestrator wants it, also add `templates.startNextDone`: "Invoice {number} started." / "Faktuur {number} is begin.".

### minor: N4. Afrikaans: four strings need a fix (rows marked **minor** in the table)
File: src/i18n/af.json:353, 463, 554, 610
Acceptance item: "natural jy-register Afrikaans"
What is wrong:
- `templates.required.taxInvoice.recipient` calls the customer "hy" and "sy". The customer is often a company, which Afrikaans calls "dit". EN is neutral ("their").
- `templates.fields.tradingAsLine` prints the English abbreviation "Reg. No." on an Afrikaans invoice.
- `myPath.markNotDoneNamed` "Haal die merkie **by** {title} af" uses the wrong preposition.
- `prompts.copyFailed` "druk en hou" is a calque of "press and hold".
How to reproduce: read the listed lines.
Suggested fix: see the correction table.

### minor: N5. English: inconsistent "setup effort" and "setup work", plus a few unclear strings
File: src/i18n/en.json:212, 226, 306, 837 (effort terms); 206, 211, 472, 477, 568
Acceptance item: "plain language for second-language readers, no idioms"; consistent terminology
What is wrong:
- One concept has two names. `wizard.types.effort` and `businessTypes.effortLabel` say "Setup effort". `doc.effort` and `businessTypesHub.effortMeter` say "Setup work". Afrikaans already uses one term, "Werk om te begin".
- `businessTypesHub.ifYouLead` "Find yourself in the list" and `businessTypesHub.effortLead` "A rough guide" are mild idioms.
- `templates.fields.numberHint` "Number in order with no gaps" can be read as a noun or a verb.
- `templates.fields.validForDays` "Quote valid for how many days" is not a natural label.
- `templates.receiptWarning` ends in a fragment ("Not when it is pending.").
How to reproduce: read the listed lines.
Suggested fix:
- Use "Setup work" everywhere.
- `ifYouLead`: "Look for the row that describes you, then open that page."
- `effortLead`: "This shows about how much work you do before you can legally trade."
- `numberHint`: "Use numbers in order with no gaps, for example {example}."
- `validForDays`: "Number of days the quote is valid"
- `receiptWarning`: "Only send a receipt when the money is in your account balance. Do not send it while the payment is still pending."
- Mirror the changes in af.json where the meaning changes.

### nit: N6. `search.instructions` does not mention Escape
en.json:634. For screen-reader users, the dialog instructions should also say how to leave: "… Press Enter to open a result. Press Escape to close search." / "… Druk Escape om die soektog toe te maak." The rest of the instruction is clear and uses the right key names.

### nit: N7. `docs/i18n.md:166` says the length test has two exceptions; the test has three
`tests/unit/i18n.test.ts` also exempts `templates.items.privacy-notice.name`. Update the sentence, or say "the exceptions are listed in the test".

### nit: N8. The `ParamNames` failure message is hard to act on
`i18n.test.ts:454-464` compares two whitespace-collapsed single-line strings. The failure prints about 5 KB of text with no visible diff (see the scratch output above). Compare arrays of lines instead, for example `expect(currentLines).toEqual(expectedLines)`, so Vitest shows only the changed key. `index.ts:57` and the failure message also leave out the `prettier --write` step that `docs/i18n.md:61` includes.

### nit: N9. Accepted but meaningless inputs in the formatters and route helpers
- `formatDate` accepts offsets up to `±23:59` (`+14:01` gives 12 September). Real offsets stop at `±14:00`.
- `switchLocaleUrl('/business-toolkit//af//core/', 'en', base)` returns `/business-toolkit/af/core/`, so the locale does not change. At base `/` it gives `/core/`.
- `switchLocaleUrl('mailto:…')` returns `/af/someone@example.com`.
- `alternateUrls('https://x.test/core/', …)` returns `…/https:/x.test/core/`, and `alternateUrls('en/core/')` keeps `en/`.

None of these is reachable through documented usage, and all outputs stay same-origin under `base`. Optionally reject non-`http(s)` schemes, collapse `//` in `switchLocaleUrl` before locale detection, and warn in dev when `route` is absolute.

### nit: N10. `validation.required` puts a capitalised label mid-sentence
en.json:592. "Fill in {field}." with `templates.fields.businessName` gives "Fill in Business name." and "Vul Besigheidsnaam in.". This is readable, but it is the same class of problem as pass-1 m6. Consider "{field}: fill this in." / "{field}: vul dit in.", or have the component lower-case the label.

### nit: N11. Record the Afrikaans "Words used" heading as a fixed term
A6 says the AF content has a fixed "Words used" heading. `doc.wordsUsed` is "Woorde in hierdie lêer", and the AF content tree does not exist yet. Add the pair to the `docs/i18n.md` terminology table, and later to `TERMS-af.json`, so translation agents use the same heading.

### nit: N12. A few Afrikaans strings could read more naturally
See the eleven unmarked rows in the correction table. None of them is an error.

### nit: N13. EN "step" and "item" for checklist entries
`nav.toolDescriptions.checklist` says "Tick each step…", while `checklist.intro` and `home.whereToStart.checklist.body` say "Tick each item…". The master checklist calls them items, and My path calls them steps. Use "item" in the checklist tool description.
---

## Afrikaans review

I read all 668 af.json strings, including every new template, validation, storage, hub, keyboard-help and design-system string, next to English (`side.txt` in the scratchpad).

- **Checks that passed:**
  - The register is "jy" throughout.
  - Diacritics are correct (reëls, kliënt, lêer, tatoeëermerke, finansiële, êrens).
  - ’n uses U+2019.
  - Every placeholder is kept.
  - "Tax Invoice", "VAT Invoice" and "Invoice" stay as quoted literals.
  - VAT is BTW in prose (`BTW-registrasienommer`, `BTW ({rate}%)`).
- **Fixed terms used consistently:** eenmansaak (plural eenmansake), omsetbelasting, kontrolelys, woordelys, sjabloon, soek (noun: soektog), roete, opdrag, Nutsgoed, toets and regsgeleerde. "Voorlopige belasting" still does not occur in the UI.
- **New legal terms:** lewering (supply), uitreikingsdatum, reeksnommer, inligtingsbeampte, verkorte belastingfaktuur and takkode are the correct terms.

### Correction table

| Key | Current | Suggested | Reason |
|---|---|---|---|
| **minor** `templates.required.taxInvoice.recipient` (af.json:554) | Die kliënt se naam en adres, en sy BTW-nommer as hy geregistreer is | Die kliënt se naam en adres, en die kliënt se BTW-nommer as die kliënt vir BTW geregistreer is | The customer is often a company ("dit"). EN is neutral. Avoid the generic "hy" on a legal checklist. |
| **minor** `templates.fields.tradingAsLine` (af.json:463) | ’n Handelsnaam van {company}, Reg. No. {number} | ’n Handelsnaam van {company}, Reg.nr. {number} | "No." is the English abbreviation. Afrikaans writes "nr.". This line is printed on the invoice. |
| **minor** `myPath.markNotDoneNamed` (af.json:353) | Haal die merkie by {title} af | Haal die merkie van {title} af | "af" takes "van". "by … af" is not idiomatic. |
| **minor** `prompts.copyFailed` (af.json:610) | …Kopieer dit met jou sleutelbord, of druk en hou dit op ’n foon. | …Kopieer dit met jou sleutelbord, of druk lank daarop op ’n foon. | "druk en hou" calques "press and hold". "druk lank daarop" is the usual phone instruction. |
| `templates.required.issueWithin` (af.json:565) | Reik die belastingfaktuur uit binne {days} dae na die verkoping. | Reik die belastingfaktuur binne {days} dae na die verkoping uit. | The separable particle "uit" sits more naturally at the end. The current order is understandable but anglicised. |
| `businessTypesHub.ifYouLead` (af.json:206) | Soek jouself in die lys en maak dan daardie bladsy oop. | Kyk watter ry by jou pas, en maak dan daardie bladsy oop. | "Soek jouself" is a calque and sounds odd. It also matches the N5 EN rewrite. |
| `section.startWithLead` (af.json:194) | Volgens jou antwoorde begin jy met hierdie bladsy. | Begin met hierdie bladsy. Dit pas by jou antwoorde. | EN is an instruction. The AF statement ("you start with") drifts slightly and is less direct. |
| `nav.menuOpen` (af.json:69) | Wys kieslys | Maak kieslys oop | Pairs with `nav.menuClose` "Maak kieslys toe". Both fit the length rule. |
| `notFound.suggestion` (af.json:784) | Het jy dalk hierna gesoek: {title} | Soek jy dalk: {title} | "hierna gesoek:" followed by a colon is stiff. The shorter form is plain. |
| `storage.settingsUnavailable` (af.json:602) | …Hulle gaan terug na die verstek wanneer jy die bladsy toemaak. | …Hulle gaan terug na die verstekinstellings wanneer jy die bladsy toemaak. | "verstek" on its own is legal jargon (default judgment). The UI noun is "verstekinstellings". |
| `designSystem.pass` (af.json:777) | Slaag | Geslaag | A status badge needs the past participle, like "Misluk" / "Geslaag". |
| `home.fourThings.sars` (af.json:160) | Indiening by SARS, selfs as jy niks verdien nie | Opgawes by SARS indien, selfs as jy niks verdien nie | "Indiening by SARS" leaves out what is filed. "Opgawes" makes it concrete. |
| `templates.fields.printName` (af.json:504) | Naam (drukskrif) | Naam (in drukletters) | This is the more common wording on Afrikaans forms. |
| `templates.fields.validForDays` (af.json:477) | Vir hoeveel dae die kwotasie geldig is | Aantal dae wat die kwotasie geldig is | A label, not a dependent clause. It matches the N5 EN rewrite. |
| `templates.fields.numberHint` (af.json:472) | Nommer in volgorde sonder gapings, byvoorbeeld {example}. | Gebruik nommers in volgorde sonder gapings, byvoorbeeld {example}. | Same noun/verb ambiguity as EN (N5). |

No Afrikaans change is needed for `storage.unavailable` ("laat nie die gids toe … nie"). Putting "nie" before a definite object is standard Afrikaans, so I checked it and left it off the list.

### Judgement on the three pass-1 suggestions the author did not adopt

| Suggestion | Verdict |
|---|---|
| `home.trust.free` "Gratis, jy hoef nie te registreer nie" | **Acceptable as done.** The author changed EN to "Free, and you do not need an account", and AF to "Gratis, en jy het nie ’n rekening nodig nie". This removes the "aanmeld" (log in) ambiguity the suggestion targeted, stays close to EN, and is natural. Keep it. |
| "item" versus "stap" in `checklist.intro` and `home.whereToStart.checklist.body` | **Acceptable.** The EN source says "item" in both, and "item" is standard Afrikaans (HAT). "stap" would drift from EN. The one real inconsistency is in English (`nav.toolDescriptions.checklist` says "step"; see N13). If EN changes to "item", change AF to "Merk elke item af wanneer jy klaar is". |
| `doc.wordsUsed` "Woorde in hierdie lêer" instead of the literal "Woorde wat in hierdie lêer gebruik word" | **Acceptable, and better.** The heading is short, natural and loses no meaning. It passes the length rule, while the literal form (40 characters against 23) would fail it. The one condition is that the AF content heading must use exactly the same words (N11). |

---

## Maintainability: "Add a language" followed in a scratch copy

I used `scratchpad/wp12-pass2/projzu`: a copy of `src/i18n/*`, `src/lib/{paths,i18n-routes}.ts`, the four unit test files, `package.json`, `tsconfig.json` and `astro.config.ts`, with a minimal Vitest config and a junction to the worktree `node_modules`. `mutate.mjs` applied each doc step literally.

| Step (docs/i18n.md) | Result |
|---|---|
| 1–2: copy `en.json` to `zu.json`, set `uiDictionary: true`, import it and add it to `DICTIONARIES` | Typechecks. The only tsc errors are the two scratch-only `import.meta.env` errors. **Tests: 1 failed, 131 passed.** The failure is "zu label length > has no stale exceptions" (NM1). Every other `zu` dictionary check runs and passes, which confirms m4's parity fix. |
| 3: content mirror tree | Not exercised (content pipeline, not WP-12). |
| 4: `enabled: true`, `status: 'partial'` | Typechecks (same two scratch-only errors). `Locale` now includes `zu`. **Tests: 9 failed, 123 passed.** Six failures are the expected "update the tests that pin the enabled list" (`localeStaticPaths`, `sitemapLocales`, `enables only English and Afrikaans`, `paths` "comes from src/i18n/locales.ts" and similar). Three fail only because they use `zu` as the planned example (see the NM1 secondary note). The stale-exception failure remains. |
| 5: sitemap | `sitemapLocales()` reads `LOCALES` and picks `zu` up automatically. The failing pin test shows the map changed as documented. |

The rest of the flow matches the docs. `astro.config.ts`, `paths.ts`, `localeStaticPaths` and `alternateUrls` all derive from `LOCALES`, so no other file needs editing. Once NM1 is fixed, steps 1–2 give a clean gate.
