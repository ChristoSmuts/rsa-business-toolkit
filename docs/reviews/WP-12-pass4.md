# WP-12 review, pass 4 (REVIEWER-E)

- Package: WP-12, i18n dictionary and helpers
- Branch: `worktree-agent-a6dc8cdd77877812b`, HEAD `679b58c` (commits `7485d31`, `ed92a7a`, `dac907b`, `679b58c`), base `51e9c01`
- Reviewer: REVIEWER-E (independent of the author and of REVIEWER-A, -C and -D)
- Date: 2026-09-15
- Scope: the whole diff `51e9c01...679b58c`. I did my own review and drafted all findings before I read passes 1–3. I read them only for the regression check at the end.

## Verdict: CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 5 |
| nit | 6 |

All gates pass. They also pass under `TZ=Asia/Kolkata` and under `LANG=af_ZA.UTF-8` / `LC_ALL=af_ZA.UTF-8`. `t()`, plurals, fallback, `pick` / `createTranslator`, the three formatters and the route helpers behave correctly for documented usage. My own edge-case probes found only unusual inputs that give odd results (m1, m2, m4, n1, n2). The type system also has one real gap (m3). The dictionaries cover Part B, apart from one unclear plan item (m5). The Afrikaans follows every fixed term and decision. No helper returns HTML. None of the minors blocks merge. Each can be fixed or moved to `backlog.md`.

## Commands run (in the author worktree, HEAD `679b58c`, clean tree)

The machine was heavily loaded. Every gate ran once in the foreground. Nothing timed out, so I did not need `--maxWorkers=1`. `git status --short` was empty before and after.

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
EXIT tsc 0
```

`pnpm test` (exit 0)
```
$ vitest run --project unit --project dom --passWithNoTests
 Test Files  4 passed (4)
      Tests  121 passed (121)
   Start at  19:16:29
   Duration  24.51s (tests 77%, transform 17%, import 5%, worker 1%)
```

`pnpm exec vitest run --project unit --coverage --coverage.include=src/i18n/**/*.ts --coverage.include=src/lib/**/*.ts` (exit 0)
```
 Test Files  4 passed (4)
      Tests  121 passed (121)
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
[build] ✓ Completed in 2.25s.
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 1 page(s) built in 2.52s
[build] Complete!
```
`dist/index.html` has `<html lang="en-ZA">`. `dist/` contains `sitemap-index.xml` and `sitemap-0.xml`.

Host locale and time zone independence (Git Bash, `pnpm test`):
```
=== TZ=Asia/Kolkata
 Test Files  4 passed (4)
      Tests  121 passed (121)
   Start at  19:30:13
=== LANG/LC_ALL=af_ZA.UTF-8
 Test Files  4 passed (4)
      Tests  121 passed (121)
   Start at  19:31:05
```

Ownership: `git diff --name-only 51e9c01...HEAD` lists `astro.config.ts`, `docs/i18n.md`, `src/i18n/{af.json,en.json,index.ts,locales.ts}`, `src/lib/{i18n-routes.ts,paths.ts}` and `tests/unit/{format,i18n-routes,i18n,paths}.test.ts`. All are owned paths. The `astro.config.ts` diff changes only `i18n.defaultLocale`, `i18n.locales` and the sitemap `i18n` block. The `paths.ts` diff only replaces the local locale list with an import from `locales.ts`.

Scratch work, all under `scratchpad/wp12-pass4/`. I never edited the worktree, never copied it and never ran `pnpm install`.
- `runtime-probe.ts`: about 60 edge cases for the route helpers, formatters and `t`, run with the worktree `tsx`.
- `types-probe.ts` with `tsconfig.probe.json`: 13 real call-site shapes, type-checked with the worktree `tsc`.
- `client-probe.ts` with `vite.probe.config.mjs`: a client entry that imports only `createTranslator`, built with the worktree Vite 8 (lib mode, minified). The result is 3 613 B raw and 1 240 B gzip. It contains no dictionary strings ("Skip to main content", "Gaan na die hoofinhoud" and "Januarie" are all absent). This confirms the bundle claim in `docs/i18n.md`.

## Independent review

### Correctness: verified, no finding
- **`t()` basics:** `$&`, `$1` and `$$` inside a value are inserted literally. A value that contains `{b}` is not expanded again. `{constructor}` and `__proto__.x` are not resolved through the prototype. `count` -1 gives "-1 result", which is correct under CLDR. `count` 1.5 in af gives "1.5 resultate".
- **Fallback:** a missing or wrong-shaped af leaf falls back to English (mocked test). `pick` keeps the numeric month order 1–12.
- **`formatRand`:** 0.005 → `R 0.01`, 0.015 → `R 0.02`, 1.255 → `R 1.26`, 8.345 → `R 8.35`, 10.075 → `R 10.08`, 0.285 → `R 0.29`, -0.005 → `-R 0.01`, -0.0049 → `R 0.00`, 5e-324 → `R 0.00`. `±MAX_RAND_AMOUNT` is exact, and the next representable value up throws. Both spaces are U+00A0 (checked with `od -c` in `index.ts:402`).
- **`formatDate`:** only UTC getters are used. Offsets are bounded at ±14:00. A 10-digit fraction, `+02` without minutes, lower-case `t`, a space separator and an expanded year all throw.
- **`switchLocaleUrl`:** keeps the query and hash, and collapses inner `//`. `%61f` is not decoded into `af`, which is the safe choice. A `.pdf` path gets no trailing slash.
- **Output safety:** `alternateUrls('javascript:alert(1)')` throws.
- **`localeStaticPaths`:** gives `undefined` for `en`, as C1 requires.

### Types: verified
- These compile: `nav.sections.${section}.name`, `date.months.${month}`, a key union with the same parameters, a plain `string` prop and a number for a string placeholder.
- These are rejected: an extra parameter, `count: number | undefined`, a disabled locale (`zu`), and a missing `title` through `createTranslator`.
- The generated `ParamNames` block is safe to maintain. The test compares it per key and fails with the exact regeneration command.
- Two call-site shapes still compile without required parameters. The wide `TranslationKey` is a known escape hatch. The mixed union is a real gap (m3).

### Part B coverage: verified
I walked B1–B6 again: top bar, drawer, sidebar, TOC and pill, breadcrumbs and pager, the nine B3 flows, the B4 inventory, the B5 live regions and validation summary, and every B6 page spec. All of them have keys, except "layer count" in B3.4 (m5).

### Plain English: verified
The strings are short, with no exclamation marks and no idioms that would block a second-language reader. Terminology is consistent: "setup effort", "item" for checklist entries, "device".

### Afrikaans: verified
I read every af.json string next to English.
- **Fixed terms:** eenmansaak/eenmansake, BTW in prose only ("VAT" appears only inside the quoted literal “VAT Invoice”), omsetbelasting, kontrolelys, Hoofkontrolelys (`checklist.title`, and in lower case in two descriptions), woordelys, sjabloon/sjablone, roete, opdrag, Nutsgoed, toets (never *sleutel*; *sleutelbord* is correct) and regsgeleerde. "voorlopige belasting" is not needed in the UI.
- **’n:** always U+2019. A script found no U+2018, acute or backtick variants and no capital `’N`.
- **Brackets:** no English term appears in brackets in a UI label. The bracketed contents are Afrikaans, a fixed name that is also bracketed in English ("(Pty Ltd)"), or quoted legal literals.
- **General:** the register is "jy" throughout, and diacritics are correct. The only wording I would change is already out of scope, or pass 2 settled it (see the regression check).

### Accessibility names: verified
Repeated controls have `…Named` or `…To` variants. Live-region strings exist. One small gap is n3.

### Tests: verified
The tests check behaviour and are deterministic. Both host-locale runs passed.

### Maintainability: verified
`docs/i18n.md` matches the code, except for m4 and n5.

### Security: verified
- No helper returns HTML. `t()` output is plain text, and Astro `{…}` escapes it. The HTML probe (`<img src=x onerror=…>`) comes back unchanged as text, to be escaped by the renderer.
- `docs/i18n.md` never uses or suggests `set:html` or `innerHTML`.
- `pick()` output goes into a `data-` attribute through Astro, which escapes it.
- The no-straight-quotes rule adds a second guard.
- Suggestion for later: n6.

---

## Findings

### minor: m1. `switchLocaleUrl` reads a pathname that starts with `//` as a host
File: src/lib/i18n-routes.ts:50, 61 (and the JSDoc at :100-110)
Acceptance item: general quality (correctness of the documented `location.pathname + location.search + location.hash` input)
What is wrong: `ABSOLUTE_URL` treats any string that starts with `//` as protocol-relative, so the first path segment becomes the host and is lost. A browser can report `location.pathname` as `//core/register/` for `https://host//core/register/`. The JSDoc and `docs/i18n.md` say that `current` may be the pathname and that repeated slashes are collapsed. For this input, neither is true.
How to reproduce (`runtime-probe.ts`):
- `switchLocaleUrl('//core/register/', 'af', '/')` → `"/af/register/"`. `core` is lost.
- `switchLocaleUrl('//a/b/af/x/', 'en', '/a/b/')` → `"/a/b/b/af/x/"`.

At the default base `/business-toolkit/`, the result is correct by accident, because `business-toolkit` is removed as the host. The test at `i18n-routes.test.ts:147` fixes the protocol-relative reading on purpose.

Suggested fix: pick one reading and document it. Either:
- treat only `scheme:` strings as URLs, and collapse a leading `//` like any other repeated slash; or
- keep the protocol-relative reading, and say in the JSDoc and `docs/i18n.md` to pass `location.href` or `new URL(location.href)` rather than `location.pathname`.

### minor: m2. The route helpers do not normalise the `base` argument
File: src/lib/i18n-routes.ts:79-89, 113-120
Acceptance item: general quality (robust public API)
What is wrong: `alternateUrls` and `switchLocaleUrl` take `base` as a public parameter and join it to the path as it is. A base without a trailing slash produces broken URLs. `basePath()` already exists to normalise it.
How to reproduce:
- `switchLocaleUrl('/business-toolkit/core/', 'af', '/business-toolkit')` → `"/business-toolkitaf/core/"`.
- `alternateUrls('core/', ['en','af'], site, '/business-toolkit')` → `https://example.github.io/business-toolkitcore/` and similar.

Suggested fix: run `base = basePath(base)` at the top of both functions, and add a test for a base without a trailing slash. `href()` in `paths.ts` has the same assumption, but it is not part of this diff.

### minor: m3. A key union that mixes keys with and without placeholders skips the parameter check
File: src/i18n/index.ts:182 (`ParamArgs`); docs/i18n.md:45
Acceptance item: "typed dot-path keys" and typed parameters (general quality)
What is wrong: `ParamArgs` distributes over a key union, so the argument type is a union of tuples and the shortest one wins. `` t(locale, `doc.hiddenFor.${reason}`) `` with `reason: 'sole-prop' | 'businessTypes'` compiles with no params. In production it prints "Hidden: this part is only for these kinds of business: {types}." and only warns in dev. The docs recommend building dynamic keys from typed unions and do not mention this gap. The dictionary already contains such a group (`doc.hiddenFor`).
How to reproduce: `types-probe.ts:37-40`. `tsc -p tsconfig.probe.json` reports `TS2578: Unused '@ts-expect-error' directive` at line 40, which means the call compiled.
Suggested fix: make the check non-distributive, so a union that contains any key with placeholders needs all of those names. For example `[K] extends [Exclude<K, keyof ParamNames>] ? [params?: Params] : [params: ParamsFor<Extract<K, keyof ParamNames>>]`, with the union case typed as an intersection. Alternatively, add a caveat in `docs/i18n.md` and a `@ts-expect-error` test that pins the chosen behaviour.

### minor: m4. `formatNumber` rounds to three decimals by default; the docs say there are no fixed decimals
File: src/i18n/index.ts:414-425; docs/i18n.md:136
Acceptance item: "docs/i18n.md is accurate against the code"
What is wrong: `Intl.NumberFormat` uses `maximumFractionDigits: 3` when no option is passed. `formatNumber('en', 0.0001)` returns `"0"`, and `formatNumber('en', 1.23456)` returns `"1.235"`. The docs say "no fixed decimals unless you pass `minimumFractionDigits` or `maximumFractionDigits`", which suggests the digits are kept. A caller that formats a small rate or ratio would lose it silently.
How to reproduce: `runtime-probe.ts`, section "formatNumber".
Suggested fix: document the default ("at most three decimals unless you pass `maximumFractionDigits`") and add a test for it. Or choose a different default on purpose.

### minor: m5. B3.4 "layer count in header" has no dictionary key
File: src/i18n/en.json:219-271 (`doc`), and af.json
Acceptance item: "complete nested UI dictionary for every surface in Part B" (B3.4)
What is wrong: B3.4 asks for "read time and layer count in header" on long documents. `doc.readTime` exists, but nothing exists for a layer count. The plan does not define "layer". The only content use is "the three registration layers" in the vehicle-dealer document. A page package would have to invent a key or leave the item out.
How to reproduce: `grep -in "layer" src/i18n/en.json` finds nothing. `grep -n "layer count" docs/build-plan.md` → line 163.
Suggested fix: the orchestrator decides what "layer count" means. If it is a header metric, add a plural key such as `doc.layerCount` (`{count} layer` / `{count} layers`, AF `{count} laag` / `{count} lae`). If it is not wanted, record that B3.4 drops it.

### nit: n1. `alternateUrls` with dot segments gives an inconsistent set of alternates
File: src/lib/i18n-routes.ts:89
`alternateUrls('../core/', ['en','af'], site, base)` gives `https://example.github.io/core/` for `en` and `x-default`, but `.../business-toolkit/core/` for `af`, because `new URL` resolves `..` against the base only when there is no prefix. This is not documented usage, but a route read from data could contain it. Reject `.` and `..` segments, or resolve them before `routeFromPath`.

### nit: n2. `formatDate` accepts years 0100–0999 without zero padding, and can print year 10000
File: src/i18n/index.ts:477-489, 491-516
`0099-01-01` throws "Invalid date", because `Date.UTC` maps years 0–99 to 1900+. `0100-03-01` gives "1 Maart 100", and `9999-12-31T23:00:00Z` gives "1 Januarie 10000". None of these is a realistic input. A range check (for example 1900–9999) would make the behaviour consistent and match the existing `0026-01-01` test.

### nit: n3. "Remove line" names are empty for a new blank line
File: src/i18n/en.json:524, 535 (`templates.privacy.removeListItem`, `templates.removeLine`), and af.json
The name comes from the user's text. On a freshly added line it is "Remove line: " (af "Verwyder reël: "), and several such buttons can sit on one form. Document in `docs/i18n.md` that components pass `templates.line.placeholder` ("Item or service") when the text is empty, or add a numbered variant, for example "Remove line {n}".

### nit: n4. Two exports are called `LOCALES` with different shapes
File: src/i18n/locales.ts:32 (`LocaleMeta[]`, all 11 languages); src/lib/paths.ts:6 (`Locale[]`, enabled codes only)
`tests/unit/paths.test.ts` already has to import one of them as `ALL_LOCALES`. An auto-import in a page could easily pick the wrong one. Consider renaming the `paths.ts` export to `ENABLED_LOCALES`, or re-exporting that name, and deprecating `LOCALES` there.

### nit: n5. Two small inaccuracies in `docs/i18n.md`
File: docs/i18n.md:5-19, 135
- The "Files" table lists three of the four owned test files. `tests/unit/paths.test.ts`, which now tests the locale list, is missing.
- "Tests compare with ` `." puts a raw U+00A0 inside backticks, so it renders as an empty code span. Write "U+00A0" instead.

### nit: n6. Say in the docs that `t()` output is plain text
File: docs/i18n.md "Using strings"
Nothing in the package returns HTML or suggests `set:html`, and values are inserted without escaping. That is correct for text rendering, but only while every caller renders the result as text. Add one sentence: "`t()` returns plain text. Render it with `{…}` or `textContent`, never with `set:html` or `innerHTML`, because parameter values are not escaped." This makes the rule explicit for the components and interactive packages.

---

## Regression check against earlier passes

I read passes 1–3 after drafting the findings above.

- **No regression.** Every item that passes 1–3 marked as fixed still holds at `679b58c`:
  - key parity and the `uiDictionary` loop;
  - per-locale label-length exceptions and planned-locale examples (pass 2 NM1);
  - typed parameters and `ParamNames` staleness (pass 1 m1, pass 2 N8);
  - strict `formatDate` and the offset bound (m2, N9);
  - full-URL and scheme handling in `switchLocaleUrl` (m3, N9);
  - `MAX_RAND_AMOUNT` (n4);
  - figure parameters (m5);
  - PromptBlock named variants, `templates.clearDone` and `startNextDone` (N2, N3);
  - EN headings that mirror the source (N1);
  - every Afrikaans correction from the pass-1, pass-2 and pass-3 tables that was adopted (spot-checked: "gekontroleerde", "In my eie naam", "koswa", "Toets", "Eentoetskortpaaie", "regsgeleerde", "Laedatamodus", "Reg.nr.", "druk lank daarop", "Haal die merkie van {title} af", "Verklaring van die kort woorde").
- **The bundle claim still holds:** 1 240 B gzip against pass 1's 1 365 B, with no dictionary strings.
- **Still open from pass 3 (not a regression, not changed at HEAD):**
  - P1: the comment at `index.ts:464` still says "-12:00 to +14:00" while the code accepts ±14:00.
  - P1: the `docs/i18n.md` table rows are still unaligned.
  - P2 and P3 (optional wording) are unchanged.
- **Related to earlier findings but not a repeat:** m1 differs from pass 2 N9. N9 covered inner `//`, which is fixed. m1 covers a leading `//` in a pathname. m3 refines pass 2's note that a wide `TranslationKey` is an accepted escape hatch. The mixed union is a narrower case that typed call sites will hit.
- **Choices I agree with:**
  - "gratis hulpmiddels" for external free tools next to "Nutsgoed" for the Tools menu (pass 2 n8 judgement).
  - "Wys kieslys" (pass 3, length rule).
  - "Maak ’n venster of kieslys toe" (pass 1).
  - "Verskuldig" for "Amount due". "Bedrag verskuldig" would fail the length rule.
