# WP-12b review, pass 1 (REVIEWER-I)

- Package: WP-12b, i18n follow-up (trust strings for AI disclosure and sources, plus fixes for WP-12 pass 3 P1–P3 and pass 4 m1–m5 and nits)
- Branch: `wp/wp12b-i18n-followup`, worktree `C:\_Projects\Local\bt-wt\wp12b`, HEAD `ff3a9b8` (confirmed), commits `ff42c75` and `ff3a9b8`, base `33bf2a8`
- Reviewer: REVIEWER-I (independent of the author)
- Date: 2026-09-15
- Scope: the whole diff `33bf2a8...ff3a9b8`. I read every `trust.*` string in EN and AF next to D5, ADR 0006, `site.disclaimer*`, `home.heroVerify` and `lang.mtNotice`.

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 1 |
| minor | 5 |
| nit | 6 |

The code and the gate are in good shape. All commands pass, and the tests pass under `TZ=America/Los_Angeles`. m1–m4 and n2–n6 are fixed and tested. The type-level fix for m3 holds in a scratch `tsc` probe. The trust strings follow D5 closely and are mostly plain and honest.

One Afrikaans pair contradicts the notice it sits under (M1). The Afrikaans AI notice correctly says only the **English** text was checked. The status explanations below it then say the facts "op hierdie bladsy" (on this page) were checked, on a page that the machine-translation notice says no person has checked. That is a two-word fix, but it is exactly the over-claim this package exists to prevent.

The five minors:
- The agent-less "Checked…" wording.
- An unclear "Not confirmed" instruction.
- No hedge on the human-checked sentence.
- A placement conflict with B6.
- A gap in the n1 dot-segment fix (a backslash gets past it).

## Commands (worktree, HEAD `ff3a9b8`)

The machine was loaded. Every command ran in the foreground. Vitest did not time out, so I did not need `--maxWorkers=1`. `git status --short` was empty after the build and after `gate:fast`.

`pnpm lint` (exit 0)
```
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
lint exit=0
```

`pnpm typecheck` (exit 0)
```
$ astro check
Result (21 files):
- 0 errors
- 0 warnings
- 0 hints
typecheck exit=0
```

`pnpm exec tsc --noEmit -p .`
```
tsc exit=0
```
Because tsc exits 0, every `@ts-expect-error` in `tests/unit/i18n.test.ts` is still live, including the new union checks.

`pnpm test` (exit 0)
```
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  4 passed (4)
      Tests  133 passed (133)
   Start at  21:34:15
   Duration  31.36s
test exit=0
```

`pnpm exec vitest run --project unit --coverage --coverage.include=src/i18n/**/*.ts --coverage.include=src/lib/**/*.ts` (exit 0)
```
      Tests  133 passed (133)
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files        |   99.53 |    97.17 |     100 |   99.47 |
 i18n            |     100 |    98.23 |     100 |     100 |
  index.ts       |     100 |    98.19 |     100 |     100 | 301,366
 lib             |   98.52 |    95.31 |     100 |   98.24 |
  i18n-routes.ts |     100 |    96.87 |     100 |     100 | 107
  paths.ts       |   95.83 |    93.75 |     100 |      95 | 43
Statements   : 99.53% ( 213/214 )
Branches     : 97.17% ( 172/177 )
Functions    : 100% ( 53/53 )
Lines        : 99.47% ( 188/189 )
coverage exit=0
```

`pnpm build` (exit 0)
```
[build] ✓ Completed in 2.29s.
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 1 page(s) built in 2.46s
[build] Complete!
build exit=0
```

`pnpm gate:fast` (exit 0; tail shown, and the chain is `&&`, so lint, typecheck and `tsc --noEmit -p .` ran first)
```
- 0 hints
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  4 passed (4)
      Tests  133 passed (133)
$ vitest run --project content --passWithNoTests
No test files found, exiting with code 0
gate:fast exit=0
```

Time zone run. A first attempt with `TZ=America/Los_Angeles pnpm test` in Git Bash was **not valid**: `node -e "new Date().toString()"` in the same shell printed `GMT+0200 (South Africa Standard Time)`, so Git Bash did not pass `TZ` to the native Node process. I re-ran it from PowerShell:
```
$env:TZ = 'America/Los_Angeles'
node sees Tue Sep 15 2026 12:58:24 GMT-0700 (Pacific Daylight Time) America/Los_Angeles
 Test Files  4 passed (4)
      Tests  133 passed (133)
   Start at  12:58:38
exit=0
```

`git diff --name-only 33bf2a8...HEAD`
```
docs/i18n.md
docs/reviews/backlog.md
package.json
src/i18n/af.json
src/i18n/en.json
src/i18n/index.ts
src/lib/i18n-routes.ts
src/lib/paths.ts
tests/unit/format.test.ts
tests/unit/i18n-routes.test.ts
tests/unit/i18n.test.ts
tests/unit/paths.test.ts
```
All of these are owned paths. `src/i18n/locales.ts` is owned but unchanged. The `package.json` change touches only `gate:fast`.

Scratch work, all in `scratchpad/wp12b-pass1/`. Nothing in the worktree was edited.
- `runtime-probe.ts`, `edge3.ts`: route, date and number edge cases, run with the worktree `tsx`. Output is in `runtime-probe.out` and `edge3.out`.
- `types-probe.ts` + `tsconfig.probe.json`: 18 call shapes for m3, checked with the worktree `tsc`.
- `generic-wt.ts` / `generic-main.ts`: the same generic-wrapper probe against the worktree and against `main`.

## Fix verification

| Id | Status | Evidence |
|---|---|---|
| Pass 3 P1a: "first H2" | Verified | `docs/i18n.md:212` now says "the H2 'Words used in this file' in the documents that have one (it is not always the first H2)". |
| Pass 3 P1b: misaligned rows | Verified | The mirror table (`:207-212`) and the terminology table (`:275-307`) are aligned in the raw markdown. |
| Pass 3 P1c: offset comment | Verified | `index.ts` comment: "Offsets are accepted up to ±14:00 … symmetric on purpose". |
| Pass 3 P2: prompt names and effortLead | Verified | `fillFromProfileNamed`, `undoFillNamed`, `showFullNamed` and `showLessNamed` all take `{n}: {title}`, in EN, AF and `ParamNames`. "Undo filling in prompt {n}: {title}" and "Show less of prompt {n}: {title}". `effortLead`: "This list shows how much setup effort … The levels are only a rough guide." AF mirrors it. One docs sentence overstates this: see n1. |
| Pass 3 P3: "BTW-reël" | Verified | AF `templates.noVatNotice`: "Hierdie faktuur wys nie BTW, ’n BTW-nommer of die woorde “Tax Invoice” nie." The grammar is correct (double *nie*), and "reël" = "rule" can no longer be misread. |
| Backlog rows P1–P3 removed | Verified | `docs/reviews/backlog.md` diff removes exactly those three rows. |
| Pass 4 m1: `//` pathname | Verified | `switchLocaleUrl('//core/register/','af','/')` → `/af/core/register/`, and `('//a/b/af/x/','en','/a/b/')` → `/a/b/x/` (probe and test). `HAS_SCHEME` is the only URL test for `current`. The docs table (`i18n.md:180-189`) documents it. |
| Pass 4 m2: base not normalised | Verified | All five helpers call `basePath(base)`. The probe covers bases `/`, `/business-toolkit`, `/business-toolkit/`, `//business-toolkit//`, `business-toolkit` and `''`, and gives the expected `href`, `localeFromPath`, `routeFromPath`, `alternateUrls` and `switchLocaleUrl` output for each. Remaining edge case: `basePath('//')` (n3). |
| Pass 4 m3: mixed key union | Verified | `types-probe.ts`: all 17 `@ts-expect-error` lines are used, meaning the error fired. Checked: the `hiddenFor` union without `types`, the mixed `nav.next \| site.checkedOn`, a string `count` in a union, a missing `reviewer`, the removed keys, `useTranslations`, `createTranslator` on picked groups, a wrong param name. Every expected-OK line compiles: the union with params, a union with no placeholders, the wide `TranslationKey`. One diagnostic remains: a generic wrapper `<K extends TranslationKey>(key: K) => t('en', key)` fails with TS2345. The same probe against `main` fails the same way, so this is **not a regression**. The `...args: ParamArgs<K>` forwarding form compiles in both. |
| Pass 4 m4: formatNumber default | Verified | `DEFAULT_MAX_FRACTION_DIGITS = 3` is exported and tested. `minimumFractionDigits` raises the maximum. Probe: `1.23456`→`1.235`, `0.0004`→`0`, `-0.0004`→`0`, `0.0005`→`0.001`, `{minimumFractionDigits:4}` on 0.5 → `0.5000`. The docs match. A JSDoc wording error is logged as n2. |
| Pass 4 m5: layer count | Verified (decision) | No key was added. The decision is recorded in `docs/reviews/merge-checklist.md:37` on `main`: "no generic 'layer count' key". |
| Pass 4 n1: dot segments | **Partly verified** | `.`, `..`, `%2e`, `%2E%2e`, `.%2E` and `%2e.` all throw, and `.well`, `...` and `%252e%252e` pass. A backslash still gets through: `core/..\..\x/` gives en `https://example.github.io/x/` and af `https://example.github.io/business-toolkit/x/`. That is the inconsistent set n1 described. See m5. |
| Pass 4 n2: year range | Verified | 1900-01-01 and 9999-12-31 are accepted. `1899-12-31T22:00:00Z`, `1900-01-01T01:00:00+05:00` and `9999-12-31T22:00:00Z` throw "Year outside 1900 to 9999". `0099-02-30` gives the year error rather than "Invalid date", which is fine. `1900-02-29` → Invalid date (correct, not a leap year). |
| Pass 4 n3: empty remove-line names | Verified | `templates.removeLineEmpty` and `templates.privacy.removeListItemEmpty` exist in EN, AF and `ParamNames`, and the docs give the `index + 1` example. |
| Pass 4 n4: two `LOCALES` | Verified | `paths.ts` re-exports `ENABLED_LOCALES`. The test asserts `Object.keys(paths)` has no `LOCALES`. |
| Pass 4 n5: docs | Verified | The Files table lists `paths.test.ts`, and the text says "U+00A0" rather than a raw character. |
| Pass 4 n6: plain text | Verified | `docs/i18n.md:46`. |

SAST day boundary (probe, all correct):
- `2026-09-13T21:59:59Z` → 13
- `2026-09-13T22:00:00Z` → 14
- `2026-09-13T23:59:59+02:00` → 13
- `2026-09-14T01:59:00+04:00` → 13
- `2026-09-13T12:00:00-14:00` → 14
- `2028-02-29T22:00:00Z` → 1 Maart 2028
- `2026-12-31T22:00:00Z` → 1 Januarie 2027

Author's declared choices:
- **`doc.sourcesForPage` / `doc.verifiedOn` moved to `trust.*`:** agreed. No other branch uses them (see Breakage).
- **`LOCALES` removed from `paths.ts`:** agreed. No other branch imports it.
- **`//` handled differently in `alternateUrls` and `switchLocaleUrl`:** agreed. A route is data, and `//x` there is more likely a URL mistake. `current` comes from `location`, where `//` is a real pathname. Both behaviours are documented.
- **Extra keys `bodyNoPageSources` and `externalLinkOther`:** agreed. Both make the page more honest ("the sources below" would be false, and a non-official link should not be announced as official).
- **"Not confirmed" instead of "Unverified":** agreed. It is plainer. The body sentence still needs work (m2).
- **AF "Die Engelse teks … nagegaan":** agreed, and it is the right call. The status sentences were not brought in line with it (M1).
- **`astro/client` reference in `index.ts` and `paths.ts`:** agreed. The `main` probe shows why: without it, `tsc` reports `Property 'env' does not exist on type 'ImportMeta'` whenever `.astro/types.d.ts` has not been generated.

## Trust wording audit

### What a reader sees

EN content page (notice, status, explanation):
> **About this page.** Written by AI (Claude, Anthropic). Checked against the sources below on 13 September 2026. Rules change: check the official source before you act. Not legal, tax or financial advice. *How this was made*
> AI-checked on 13 September 2026. An AI compared the facts on this page with the sources. No person has checked the facts yet.

AF content page (AI notice, status, then the MT notice directly under):
> **Oor hierdie bladsy.** Deur KI geskryf (Claude, Anthropic). Die Engelse teks is op 13 September 2026 teen die bronne hieronder nagegaan. Reëls verander: kontroleer die amptelike bron voordat jy iets doen. Dit is nie regs-, belasting- of finansiële advies nie. *Hoe dit gemaak is*
> KI-nagegaan op 13 September 2026. ’n KI het die feite **op hierdie bladsy** met die bronne vergelyk. Geen mens het die feite nog nagegaan nie.
> **Masjienvertaling.** ’n KI het hierdie bladsy uit Engels vertaal. **Niemand** het die vertaling nog nagegaan nie. As iets nie duidelik is nie, lees die Engelse weergawe.

### Honesty

- **"Checked against the sources below on {date}":** this is the D5 text word for word, so the author was right to use it. On its own, though, it has no agent. A lay reader will assume a person checked. The notice is honest only when the status line and `aiCheckedMeans` sit next to it. `docs/i18n.md` lets the status go "in the notice or the article header", so a page package can split them. See m1.
- **"AI-checked":** read alone, a lay reader could take it as a quality seal. With `aiCheckedMeans` always visible right after it (the docs require this), it is clear enough. Keep it.
- **`aiCheckedMeans`:** clear that no person checked. "yet" suggests a human check is planned, but ADR 0006 only *recommends* one, and only for core documents (n4).
- **`humanChecked` / `humanCheckedMeans`:** the docs restrict these to a named human expert (ADR 0006 point 5), which is correct. "An expert checked the facts…" has no hedge. Next to an expert's name, it reads as "this page is right". D5 says nothing may imply more certainty than the source. Add "Mistakes are still possible" (m3). The AF version has the M1 problem too.
- **`bodyNoPageSources`:** "Checked against official sources" sits on pages that list no sources, including the sources register, where about two-thirds of the entries are not official (ADR 0006 context). Folded into m1.
- **`externalLinkOther`:** good, and honest.
- **`checklistReminder`:** "not proof that you follow the law" is accurate and matches D5 ("reminder lists, not proof of compliance"). It is not alarming. A more concrete wording is optional (n5).
- **`templateRulesChecked`:** accurate. "The rules for what this template must show" puts the rules in the template rather than in the law. The rewording is optional (n5).

### Plainness
Sentences are short and there is no jargon. The exceptions:
- `unverified.body` is one 21-word sentence with "so", and it sends the reader to "the official source" right after saying no official source confirmed the fact. The reader does not know what to do (m2).
- "What this source supports" is slightly abstract, but it matches the content label `Supports:` / `Ondersteun:` (A6), so keep it.

### Consistency with `lang.mtNotice` and `site.disclaimer*`
- EN: no contradiction. `disclaimerShort` ("Written by AI. Checked against official sources. Not legal, tax or financial advice.") agrees with the notice.
- AF: the notice body and the MT notice agree. `aiCheckedMeans` and `humanCheckedMeans` contradict both (M1). `site.disclaimerShort` ("Deur KI geskryf. Teen amptelike bronne nagegaan.") in the footer of every AF page has the same over-claim. It predates this package, but the file is owned (optional row in the table).
- Repetition on an AF page: the date appears twice, "nagegaan" four times, "KI" four times, and "no person checked" twice in different words ("Geen mens" and "Niemand"). It is not a contradiction, but it is heavy. Aligning the wording helps (n4, n6).

### Afrikaans
- Register "jy" throughout. `’n` is always U+2019 (the tests enforce it). Diacritics are correct (finansiële, reëls).
- Fixed terms are correct: KI, KI-nagegaan, nagegaan, bron/bronne, amptelike, bronneregister, kontrolelys, sjabloon, nie bevestig nie.
- Grammar is correct in every string, including the double *nie*, "’n Kenner" at sentence start, and "is op {date} … nagegaan".
- Polish:
  - "het nie eie bronne nie" → "het geen eie bronne nie".
  - "so kontroleer dit" (anglicism) → split the sentence.
- Meaning parity with EN holds, apart from the intended "Die Engelse teks" and:
  - `seeHowMade`: EN "toolkit", AF "gids". The rest of the site says "guide".
  - `fact.sourceNamed`: "figure/syfer" is used for deadlines too.

### Correction table

| Key | Current EN / AF | Suggested | Reason |
|---|---|---|---|
| `trust.status.aiCheckedMeans` (AF) **M1** | ’n KI het die feite op hierdie bladsy met die bronne vergelyk. Geen mens het die feite nog nagegaan nie. | ’n KI het die feite in die Engelse teks met die bronne vergelyk. Geen mens het die feite nog nagegaan nie. | On an AF page, "op hierdie bladsy" claims the translation was checked. That contradicts the AF notice body and `lang.mtNotice`. |
| `trust.status.humanCheckedMeans` (AF) **M1, m3** | ’n Kenner het die feite op hierdie bladsy teen die bronne nagegaan. | ’n Kenner het die feite in die Engelse teks teen die bronne nagegaan. Foute is steeds moontlik. | Same contradiction, plus no hedge. |
| `trust.status.humanCheckedMeans` (EN) **m3** | An expert checked the facts on this page against the sources. | An expert checked the facts on this page against the sources. Mistakes are still possible. | An expert check must not read as a guarantee (D5). |
| `trust.unverified.body` (EN) **m2** | This could not be confirmed in an official source, so check it with the official source before you act. | This could not be confirmed in an official source. Before you act, ask the office in charge of it, for example SARS or CIPC. | Tells the reader what to do. Removes the loop back to "the official source". Two short sentences. |
| `trust.unverified.body` (AF) **m2** | Dit kon nie in ’n amptelike bron bevestig word nie, so kontroleer dit by die amptelike bron voordat jy iets doen. | Dit kon nie in ’n amptelike bron bevestig word nie. Vra die kantoor wat daarvoor verantwoordelik is, byvoorbeeld SARS of CIPC, voordat jy iets doen. | Same reason. "so" as a conjunction is an anglicism. |
| `trust.aiNotice.bodyNoPageSources` (EN) **m1** | Written by AI (Claude, Anthropic). Checked against official sources on {date}. Rules change: … | Written by AI (Claude, Anthropic). Facts were checked against the sources in the sources register on {date}. Rules change: … | The register is not all official, and this page lists none. Say what the check was against. |
| `trust.aiNotice.bodyNoPageSources` (AF) **m1** | … Die Engelse teks is op {date} teen amptelike bronne nagegaan. … | … Die feite in die Engelse teks is op {date} teen die bronne in die bronneregister nagegaan. … | Parity with the EN suggestion. |
| `trust.aiNotice.body` (EN/AF) **m1** | Written by AI (Claude, Anthropic). Checked against the sources below on {date}. … | Keep the D5 text, **and** require in `docs/i18n.md` that the status and its "…Means" sentence are rendered inside the notice, directly after the body. Only if the owner agrees to change D5: "Written by AI (Claude, Anthropic). An AI checked it against the sources below on {date}. …" (that would need a separate body for human-checked pages). | Without the status next to it, "Checked" with no agent reads as a human check. |
| `trust.status.aiCheckedMeans` (EN) **n4** (optional) | … No person has checked the facts yet. | … No person has checked the facts. | "yet" promises a human review that ADR 0006 only recommends. Keep "yet" if a review is actually scheduled. |
| `lang.mtNotice.body` (AF) **n4** | … Niemand het die vertaling nog nagegaan nie. … | … Geen mens het die vertaling nog nagegaan nie. … | Same wording as `aiCheckedMeans`, directly above. EN already uses "No person" in both. "Geen mens" is also more precise, because an AI did the work. |
| `trust.sources.seeHowMade` (EN) **n4** | See how this toolkit was made | See how this guide was made | Parity with AF "gids" and with `site.disclaimerLong` "this guide". |
| `trust.fact.sourceNamed` (EN/AF) **n4** | Source for this figure: {title} / Bron vir hierdie syfer: {title} | Source for this fact: {title} / Bron vir hierdie feit: {title} | D5 callouts include deadlines, which are dates, not figures. |
| `trust.sources.noPageSources` (AF) **n4** | Hierdie bladsy het nie eie bronne nie. | Hierdie bladsy het geen eie bronne nie. | More natural. |
| `trust.checklistReminder` (EN/AF) **n5** (optional) | This checklist is a reminder list. It is not proof that you follow the law. / Hierdie kontrolelys is ’n herinneringslys. Dit is nie ’n bewys dat jy die wet nakom nie. | This checklist helps you remember what to do. Ticking every item does not prove that you follow the law. / Hierdie kontrolelys help jou onthou wat om te doen. As jy elke item afmerk, bewys dit nie dat jy die wet nakom nie. | Concrete, and avoids the noun stack "reminder list". The current text is acceptable. |
| `trust.templateRulesChecked` (EN/AF) **n5** (optional) | The rules for what this template must show were checked on {date}. / Die reëls oor wat hierdie sjabloon moet wys, is op {date} nagegaan. | The legal rules for what this document must show were checked on {date}. / Die wetlike reëls oor wat hierdie dokument moet wys, is op {date} nagegaan. | The rules come from the law and apply to the issued document. "wetlike reëls" matches `site.disclaimerLong`. |
| `site.disclaimerShort` (AF) (optional, predates this package) | Deur KI geskryf. Teen amptelike bronne nagegaan. Nie regs-, … | Deur KI geskryf. Die Engelse teks is teen amptelike bronne nagegaan. Nie regs-, … | Same reason as M1, in the footer of every AF page. |

---

## Findings

### major: M1. Afrikaans status explanations say the facts "on this page" were checked, which contradicts the AF notice and the MT notice
File: src/i18n/af.json (`trust.status.aiCheckedMeans`, `trust.status.humanCheckedMeans`)
Acceptance item: D5 "Nothing implies more certainty than the source"; the package's own design in `docs/i18n.md:238`, where the AF notice says only the English text was checked, so it does not contradict the MT notice
What is wrong: on an AF page the notice says "Die Engelse teks is op {date} … nagegaan", and the MT notice directly under it says no one has checked the translation. The status sentence between them says "’n KI het die feite op hierdie bladsy met die bronne vergelyk", which claims the Afrikaans text was checked. `humanCheckedMeans` makes the same claim for an expert. The author fixed the body and missed these two strings, which a page package must show right next to it.
How to reproduce: `node -e "const a=require('C:/_Projects/Local/bt-wt/wp12b/src/i18n/af.json');console.log(a.trust.aiNotice.body, '|', a.trust.status.aiCheckedMeans, '|', a.lang.mtNotice.body)"`
Suggested fix: use "in die Engelse teks" in both strings (see the correction table). If the owner wants "op hierdie bladsy" kept, the justification would have to be that the fidelity check makes numbers, dates and form codes byte-identical. It does not check meaning, so I do not recommend it.

### minor: m1. "Checked…" never says who checked, and the docs let the status line sit apart from the notice
File: src/i18n/en.json and af.json (`trust.aiNotice.body`, `bodyNoPageSources`, `trust.fact.checked`); docs/i18n.md:226
Acceptance item: D5 and ADR 0006 point 5 (AI review is not human verification)
What is wrong:
- The notice, the fact label ("Checked {date}") and the no-sources body all say "Checked" with no agent. Only `trust.status.*` names the AI.
- The docs allow the status "in the notice or the article header". A page package can therefore render a notice that reads as a human check.
- `bodyNoPageSources` also says "official sources" on pages that list none, including the register, most of whose entries are not official.

How to reproduce: read `docs/i18n.md:220-227` and the rendered EN block quoted above without its second line.
Suggested fix:
- Keep the D5 wording, and require in `docs/i18n.md` that `trust.status.*` and its `…Means` sentence render inside the notice, directly after the body. The `trust.fact.checked` callouts should stay near a visible AI statement.
- Reword `bodyNoPageSources` as in the correction table.
- Any change to the D5 sentence itself needs the owner.

### minor: m2. `trust.unverified.body` does not tell the reader what to do
File: src/i18n/en.json, af.json (`trust.unverified.body`)
Acceptance item: plain language; D5 "Facts that cannot be verified are flagged on the page"
What is wrong: "This could not be confirmed in an official source, so check it with the official source before you act." The first half says no official source confirms the fact, and the second half sends the reader to "the official source". A second-language reader is left with no action. The AF version uses "so" as a conjunction, which is an anglicism.
How to reproduce: read the string.
Suggested fix: see the correction table ("ask the office in charge of it, for example SARS or CIPC").

### minor: m3. `humanCheckedMeans` has no hedge, so an expert check reads as a guarantee
File: src/i18n/en.json, af.json (`trust.status.humanCheckedMeans`)
Acceptance item: D5 "Nothing implies more certainty than the source"
What is wrong: "An expert checked the facts on this page against the sources." It sits next to "Checked by {reviewer}", with no reminder that mistakes and rule changes are still possible. The notice body does say "Rules change", but that is about rules changing, not about the check being wrong.
How to reproduce: read the string.
Suggested fix: add "Mistakes are still possible." / "Foute is steeds moontlik." (see the table).

### minor: m4. The documented placement of the AI and MT notices conflicts with B6
File: docs/i18n.md:222, 238
Acceptance item: "docs/i18n.md accurately describes the trust group placement and order"
What is wrong:
- The docs place the AI notice "under the H1 and the article header, before the first block", and say the MT notice "follows directly under it".
- B6 (Document) puts the MT banner **inside** the article header ("… verified date, MT banner on AF"). A page package that follows both documents renders the MT banner before the AI notice, which is the reverse of the documented order.
- The docs do not say that the MT banner moves.

How to reproduce: compare `docs/build-plan.md:187` with `docs/i18n.md:222` and `:238`.
Suggested fix: say explicitly that on AF pages the MT notice moves out of the article header to directly below the AI notice. Alternatively, put the AI notice inside the header, before the MT banner. Either way, record the deviation from B6 in `merge-checklist.md` for the page packages.

### minor: m5. The dot-segment check misses backslashes, so pass 4 n1 is still reproducible
File: src/lib/i18n-routes.ts:103 (`path.split('/')`)
Acceptance item: pass 4 n1 as claimed fixed; the JSDoc "Throws RangeError when route … has a `.` or `..` segment"
What is wrong: `new URL` treats `\` as `/` for http(s), and it strips tabs and newlines. The check splits only on `/`, so these routes are resolved instead of rejected:
- `alternateUrls('core/..\\..\\x/', ['en','af'], site, '/business-toolkit/')` gives en `https://example.github.io/x/` and af `https://example.github.io/business-toolkit/x/`. Different pages, and the en one is outside the base. This is the inconsistent set n1 described.
- `core/.\t./x/` is also resolved.

Windows-built routes (for example from `path.join`) can contain backslashes, and this project is built on Windows.
How to reproduce: `scratchpad/wp12b-pass1/edge3.ts`, and `runtime-probe.ts` for the tab case.
Suggested fix: split on `/[\\/]/` and strip `[\t\n\r]` before the test, or reject any route that contains `\` or a control character. Add both cases to the existing test.

### nit: n1. `docs/i18n.md` says every `prompts.…Named` key takes `{n}` and `{title}`
File: docs/i18n.md:83
`prompts.copiedNamed` is "Prompt {n} copied" and takes only `{n}` (see `ParamNames`). Say "every `prompts.…Named` button name", or list the four keys.

### nit: n2. The `formatNumber` JSDoc says rounding works "on the stored binary value"
File: src/i18n/index.ts (JSDoc above `formatNumber`)
Probe: `1.0005` is stored as `1.000499999999999944…` but formats as `1.001`, and `1.2345` (stored `1.23449999…`) formats as `1.235`. ICU rounds the shortest decimal representation, not the binary value. `docs/i18n.md` does not make the claim. Drop "on the stored binary value", or say "on the number as written".

### nit: n3. `basePath('//')` returns `//`, and a backslash path can leave the site
File: src/lib/paths.ts (`basePath`, `href`)
- `basePath('//')` and `basePath('///')` return `//`. Then `href('af','core/','//')` is `//af/core/`, a protocol-relative URL to host `af`, and `alternateUrls` returns `https://af/core/`.
- With base `/`, `switchLocaleUrl('/\\evil.test/','en','/')` and `href('en','\\evil.test/','/')` return `/\evil.test/`, which a browser resolves to `https://evil.test/`.

Neither input is realistic: the base comes from config, and `location.pathname` never contains `\`. Both functions predate this package, but the docs now promise normalisation. Return `/` when the stripped base is empty, and strip or reject leading `\` in `href`.

### nit: n4. Small wording mismatches in the trust group
File: src/i18n/en.json, af.json
- `trust.sources.seeHowMade`: EN "toolkit", AF "gids", elsewhere "guide".
- `trust.fact.sourceNamed`: "figure/syfer" is also used for deadlines.
- `trust.status.aiCheckedMeans`: "yet" suggests a planned human review.
- AF `noPageSources`: "nie eie" → "geen eie".
- AF "Geen mens" (`aiCheckedMeans`) against "Niemand" (`lang.mtNotice.body`) for the same idea, one line apart.

See the correction table.

### nit: n5. Optional rewording of the checklist and template reminders
File: src/i18n/en.json, af.json (`trust.checklistReminder`, `trust.templateRulesChecked`)
Both are accurate. The suggested versions in the table are more concrete and place the rules in the law rather than in the template.

### nit: n6. Repetition on an Afrikaans page
File: docs/i18n.md:238
With the notice, the status and the MT notice stacked, the date appears twice, "nagegaan" four times and "KI" four times. Once M1 and n4 are fixed, nothing contradicts. Consider documenting that page packages show the status as a short label (without repeating the date) when it sits inside the notice. That would need a date-less status key, and the orchestrator can decide on it later.

---

## Breakage search (read-only)

Search: `sourcesForPage`, `verifiedOn`, `LOCALES` imported from `lib/paths`, and `paths.LOCALES`, excluding `node_modules`.

| Location | Branch / HEAD | Hits | Breaks on merge? |
|---|---|---|---|
| `C:\_Projects\Local\business-toolkit` (main) | `017d007` (`src` is identical to base `33bf2a8`; only `docs/reviews/WP-11-pass2.md` and `merge-checklist.md` changed) | Only the base copies of the files this package changes: `src/i18n/{en,af}.json`, `index.ts`, `src/lib/paths.ts`, `tests/unit/paths.test.ts` | No. `git merge-tree main wp/wp12b-i18n-followup` is clean. |
| `.claude/worktrees/agent-a2273231b664d89f3` (design system) | `8710091` | None. It imports only `href` from `lib/paths` (`Base.astro`, `index.astro`, `design-system.astro`), and the signature is unchanged. | No. merge-tree is clean. |
| `.claude/worktrees/agent-a57043a283a0c3c96` (content pipeline) | `afa541c` | Base copies only, in `src/i18n/*`, `index.ts` and `tests/unit/paths.test.ts`. The branch does not modify them. | **package.json conflict**: `gate:fast` (this branch adds `pnpm content:drift`). |
| `.claude/worktrees/agent-adc6b347a89c34014` (e2e/CI) | `bb370a1` | None. `scripts/dist/audit-links.ts:515` only mentions `href()` in a message. | No. merge-tree is clean. |
| `C:\_Projects\Local\bt-wt\af-glossary` | `864f2f7` | None | **package.json conflict**: `gate:fast` (also adds `pnpm content:drift`). |
| `C:\_Projects\Local\bt-wt\wp12b` | `ff3a9b8` | Only the historical mention in `docs/i18n.md:218` | n/a |

No branch uses the removed keys or the removed `paths.ts` `LOCALES` export. The only merge risk is a text conflict on the `gate:fast` line with the content-pipeline and af-glossary branches. The combined line should be:
`pnpm lint && pnpm typecheck && tsc --noEmit -p . && pnpm test && pnpm content:drift && pnpm test:content`

## Tests and docs

- **Tests are behavioural and deterministic:**
  - fixed inputs and UTC getters only;
  - pass under `TZ=America/Los_Angeles`, verified from Node itself;
  - `@ts-expect-error` lines are live under `tsc -p .`;
  - the union test spies on `console.warn` and expects exactly one call, which matches the loop.
- **Missing test (not raised as a finding):** nothing pins the AF notice's "Engelse teks" wording, or checks that the AF status sentences agree with it. Once M1 is fixed, a short test that `af.trust.status.aiCheckedMeans` contains "Engelse teks" would stop it regressing.
- **Docs:**
  - The trust table covers every key.
  - The order (AI notice first, MT notice directly under) is stated at `docs/i18n.md:238`, but conflicts with B6 (m4).
  - The other docs claims hold, except n1 and n2.
