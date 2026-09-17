# WP-12b review, pass 4 (REVIEWER-N)

- Package: WP-12b, i18n follow-up (trust strings for AI disclosure and sources, plus WP-12 carry-overs)
- Branch: `wp/wp12b-i18n-followup`, worktree `C:\_Projects\Local\bt-wt\wp12b`
- HEAD `20bcb1b` (confirmed with `git rev-parse --short HEAD`), base `33bf2a8`. Worktree clean (`git status --porcelain` empty).
- Latest round: `ed18d52..20bcb1b` (one commit, `fix(i18n): stop claiming checks against official sources, fix af wording and docs`: `docs/i18n.md`, `src/i18n/af.json`, `src/i18n/en.json`, `tests/unit/i18n.test.ts`).
- Scope: the whole diff `33bf2a8...20bcb1b`, with the latest round read line by line.
- Date: 2026-09-17
- Independence: I formed my findings from the code, the strings and the docs before I opened `WP-12b-pass3.md`. I did not write them to a separate scratch file.

## Verdict: CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 0 |
| minor | 3 |
| nit | 6 |

Zero blockers and zero majors, and every probe that pass 3 could not run has now run (see "Probes"). All of pass 3's findings are resolved. No string says any longer that the check was made "against official sources". Every check claim names who checked. Every Afrikaans notice claim says that the English text was checked. The four notice sequences read coherently.

The three minors are small. Two are honesty and docs precision: "A source for every page" is not true on pages that say "This page has no sources of its own", and one sentence in `docs/i18n.md` still calls `trust.fact.checked` "the one" Afrikaans exception. One is a correctness edge in `switchLocaleUrl`: a `%5C` in the query string makes the documented `location.pathname + location.search + location.hash` form throw, but the same address passed as a `URL` object does not.

## Commands

All run in the worktree at `20bcb1b`, in the foreground, one at a time, from PowerShell. The `pnpm lint` tail includes a PowerShell `NativeCommandError` wrapper around pnpm's stderr echo of the script line. The exit code is 0.

`pnpm lint` (exit 0)
```
node.exe : $ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
...
Checking formatting...
All matched files use Prettier code style!
EXIT=0
```

`pnpm typecheck` (exit 0)
```
$ astro check
17:58:45 [types] Generated 77ms
17:58:45 [check] Getting diagnostics for Astro files in C:\_Projects\Local\bt-wt\wp12b...
Result (21 files):
- 0 errors
- 0 warnings
- 0 hints

EXIT=0
```

`pnpm exec tsc --noEmit -p .` (exit 0, silent)
```
EXIT=0
```

`pnpm test` (exit 0, machine zone)
```
$ vitest run --project unit --project dom --passWithNoTests

 RUN  v5.0.1 C:/_Projects/Local/bt-wt/wp12b

 Test Files  4 passed (4)
      Tests  145 passed (145)
   Start at  18:00:11
   Duration  32.51s (tests 87%, transform 10%, import 2%, worker 1%)

EXIT=0
```
No "Timeout starting forks runner", so I did not need `--maxWorkers=1`.

Coverage: `pnpm exec vitest run --project unit --project dom --passWithNoTests --coverage --coverage.include=src/i18n/**/*.ts --coverage.include=src/lib/**/*.ts` (exit 0)
```
 Test Files  4 passed (4)
      Tests  145 passed (145)
   Start at  18:04:02
   Duration  88.29s (tests 94%, transform 4%, import 1%, worker 1%)

 % Coverage report from v8
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |     100 |    97.76 |     100 |     100 |
 i18n            |     100 |    98.23 |     100 |     100 |
  index.ts       |     100 |    98.19 |     100 |     100 | 303,368
 lib             |     100 |    96.96 |     100 |     100 |
  i18n-routes.ts |     100 |    97.22 |     100 |     100 | 125
  paths.ts       |     100 |    96.66 |     100 |     100 | 18
-----------------|---------|----------|---------|---------|-------------------
Statements   : 100% ( 218/218 )
Branches     : 97.76% ( 175/179 )
Functions    : 100% ( 54/54 )
Lines        : 100% ( 194/194 )
EXIT=0
```
This is the same as pass 3, which is expected because the latest round changed only strings and one test expectation.

`pnpm test:content` (the last step of `gate:fast`; exit 0, no test files on this branch)
```
|content|
include: tests/content/**/*.test.ts
exclude:  **/node_modules/**, **/.git/**
EXIT test:content=0
```
Together with the four commands above, this covers every step of `gate:fast` on this branch. I did not run `pnpm build`, because the brief limits this pass to unit-level commands.

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
This is the same file set as pass 3, and every file is inside the package's paths.

### Unit suite under other time zones

Git Bash does not pass `TZ` through, so I ran these from PowerShell and confirmed the zone inside Node first.

```
PS> $env:TZ='Pacific/Kiritimati'; node -e "...getTimezoneOffset()..."
Pacific/Kiritimati -840 Pacific/Kiritimati Mon Sep 14 2026 02:00:00 GMT+1400 (Line Islands Time)
 Test Files  4 passed (4)
      Tests  145 passed (145)
   Start at  06:26:12
   Duration  23.87s
EXIT=0

PS> $env:TZ='Pacific/Pago_Pago'; node -e "..."
Pacific/Pago_Pago 660
 Test Files  4 passed (4)
      Tests  145 passed (145)
   Start at  05:27:52
   Duration  33.77s
EXIT test=0
```
I also ran the runtime probe under both zones and diffed it against the run in the machine's zone. There were 0 differing lines out of 296 for UTC+14 and 0 for UTC-11.

## Probes

All the scripts and logs are in `scratchpad/wp12b-pass4/`. Each script imports the worktree modules directly through `tsx`: `probe-runtime.ts` → `probe-runtime.log` (plus `-pago.log`, `-kiri.log`), `probe-query.ts`, `probe-types-fail.ts` with `tsconfig.probe.json` → `probe-types.log`.

### `alternateUrls` (base `/business-toolkit/`, site `https://example.org/`, locales `['en','af','zu','xx']`)

| Input | Result |
|---|---|
| `core\register/`, `\core/register/` | RangeError (backslash) |
| `core/%5cregister/`, `core/%5Cregister/` | RangeError (backslash) |
| `core/<TAB>register/`, `core/.<TAB>./x/`, `core/<CR><LF>x/`, `core/<LF>x/` | RangeError (tab or line break) |
| `core/./x/`, `core/../x/`, `./core/`, `../core/` | RangeError (dot segment) |
| `core/%2e/x/`, `core/%2E%2E/x/`, `core/.%2e/x/`, `core/%2e./x/` | RangeError (dot segment) |
| `//evil.test/core/`, `///evil.test/core/` | RangeError (not site-relative) |
| `https://evil.test/core/`, `HTTPS://…`, `mailto:x@y.z`, `javascript:alert(1)` | RangeError (not site-relative) |
| `core/register/#a\b` | RangeError (backslash in the hash) |
| `core/register/`, `/core/register/`, `af/core/register/` | en-ZA `…/business-toolkit/core/register/`, af-ZA `…/business-toolkit/af/core/register/`, x-default = en. `zu` and `xx` are ignored |
| `core/register/?q=1#popia` | Query and hash dropped |
| `core//register/` | Collapsed to `core/register/` |
| `''`, `/`, `af`, `af/` | The site root in each locale, with no doubled prefix |
| `core/.well/`, `core/...//x/`, `core/%252e%252e/x/`, `core/..%2fx/`, `core/%2fx/` | Accepted unchanged. None of these is a dot segment for WHATWG URL, so this is correct |
| `site` given as a `URL` with a path (`https://example.org/some/path/`) | The path is ignored: `https://example.org/business-toolkit/af/core/` |
| Only `['af']` available | No x-default |

### `switchLocaleUrl` (both targets, base `/business-toolkit/`)

| `current` | Result |
|---|---|
| `/business-toolkit/core/register/#popia` → af | `/business-toolkit/af/core/register/#popia` |
| `/business-toolkit/af/core/register/?x=1#popia` → en | `/business-toolkit/core/register/?x=1#popia` |
| Path strings with `\`, `%5c`, `%5C`, TAB, CR, LF | RangeError (backslash, tab or line break) |
| `/business-toolkit/./core/`, `/business-toolkit/af/../../evil/`, `/business-toolkit/%2e%2e/evil/`, `/business-toolkit/%2E/evil/` | RangeError (dot segment) |
| `//core/register/` | `/business-toolkit/core/register/` (read as a path, as documented) |
| `//evil.test/business-toolkit/core/` | `/business-toolkit/evil.test/business-toolkit/core/` (a path, stays on the site; documented) |
| `https://example.org/business-toolkit/af/core/?q=1#h`, `HTTP://…` | Host ignored, query and hash kept |
| `https://…/a/../core/`, `https://…/a/%2e%2e/core/` (strings) | Normalised by `new URL` first, so accepted as `/business-toolkit/core/` (documented) |
| `https://…/business-toolkit\core/`, `https://…/co<TAB>re/` (strings) | RangeError |
| `https://…/core/?q=%5c`, `?q=a\b`, `#a%5Cb` (strings) | **RangeError, although the backslash is only in the query or hash.** See m3 |
| `mailto:`, `javascript:` | RangeError (not http or https) |
| `core/register/`, `''` | RangeError (relative) |
| `/other/x` | `/business-toolkit/other/x/` (out of base, documented) |
| `/business-toolkit`, `/business-toolkit/af` | `/business-toolkit/` and `/business-toolkit/af/` |
| `URL` objects: `…/af/core/#popia`, `…/business-toolkit\af\core/`, `…/a/../core/`, `…/co<TAB>re/` | Already normalised by the `URL` parser, so accepted and correct |
| `URL` `…/business-toolkit/%2e%2e/core/` | Parser resolves to `/core/`, giving `/business-toolkit/core/` (out-of-base rule) |
| `URL` `…/business-toolkit/%5c/core/` | RangeError |
| `URL` `ftp:`, `file:` | RangeError (not http or https) |

`probe-query.ts` (a GET search for `C:\`, as produced by `URLSearchParams`):
```
OK    URL object (https://example.org/business-toolkit/search/?q=C%3A%5C) => /business-toolkit/af/search/?q=C%3A%5C
THROW location.href string (https://example.org/business-toolkit/search/?q=C%3A%5C) => Expected a path without backslashes, tabs or line breaks: …
THROW pathname+search+hash (/business-toolkit/search/?q=C%3A%5C) => Expected a path without backslashes, tabs or line breaks: …
```

### `basePath`, `href`, `routeFromPath`

| Call | Result |
|---|---|
| `basePath('')`, `'/'`, `'//'`, `'///'`, `'\'`, `'\\'`, `'/\/'` | `/` |
| `basePath('business-toolkit')`, `'/business-toolkit'`, `'business-toolkit/'`, `'\business-toolkit\'`, `'/\business-toolkit\/'` | `/business-toolkit/` |
| `basePath('a\b')`, `'/a\b/'` | `/a\b/`: an inner backslash is kept (nit n4) |
| `basePath('\\evil.test\x')` | `/evil.test\x/`: same-origin path, not a host |
| `basePath('/a//b/')`, `'/x/./'`, `'/x/../'`, `' /x/ '` | Passed through unchanged (config input; nit n4) |
| `href(en, '//evil.test/', '/')`, `'\\evil.test/'`, `'/\evil.test/'`, `'\/evil.test/'` | `/evil.test/`: never protocol-relative |
| `href(en, 'core/register')`, `'core#a'`, `'a//b///c'` | `…/core/register/`, `…/core/#a`, `…/a/b/c/` |
| `href(en, 'robots.txt', '/')`, `'core/v1.2'` | No trailing slash added after a file extension |
| `href(en, 'core/?q=1')` | `/business-toolkit/core/?q=1/`: the query is corrupted (nit n4) |
| `href(en, 'x', '\evil.test')` | `/evil.test/x/` |
| `routeFromPath('/business-toolkit/af')` | `['', 'af']` |
| `routeFromPath('/business-toolkitX/core/')` | `['business-toolkitX/core/', 'en']`: out of base, keeps its own path (documented) |
| `routeFromPath('/af/core/')` | `['core/', 'af']` |
| `routeFromPath('//business-toolkit/core/')` | `['business-toolkit/core/', 'en']`. `switchLocaleUrl` collapses `//` before calling it, so this is not reachable through the helper |
| `routeFromPath('/business-toolkit/zu/core/')`, `'/en/…'`, `'/afrikaans/…'` | Locale `en`; the segment stays in the route (a disabled or unknown code is not a prefix) |

### `formatDate`

| Input | Result |
|---|---|
| `2024-02-29`, `2000-02-29` | 29 February 2024, 29 February 2000 |
| `2023-02-29`, `1900-02-29`, `2100-02-29` | RangeError: Invalid date |
| `1900-01-01`, `9999-12-31` | 1 January 1900, 31 December 9999 |
| `1899-12-31`, `0000-01-01`, `0100-03-01` | RangeError: Year outside 1900 to 9999 |
| `10000-01-01` | RangeError: shape |
| `2026-09-13T21:59:59Z`, `…21:59:59.999999999Z` | 13 September 2026 |
| `2026-09-13T22:00:00Z`, `…22:00:00.000000001Z` | 14 September 2026 (SAST midnight) |
| `2026-09-14T00:00:00+02:00` / `2026-09-13T23:59:59+02:00` / `2026-09-13T23:59+0200` | 14 / 13 / 13 September |
| `…T10:00:00+14:00`, `+1400` | 12 September 2026 (20:00Z on the 12th is 22:00 SAST) |
| `…T10:00:00-14:00` | 14 September 2026 |
| `+14:01`, `-14:01`, `+15:00`, `+23:59` | RangeError: Invalid time zone offset |
| `+24:00`, `+14`, `T24:00:00Z`, `T23:59:60Z`, lower-case `z`, no zone, `10:00:00.Z`, leading or trailing space, `2026-9-13` | RangeError: shape |
| `1900-01-01T00:00:00+14:00` (SAST day is 31 Dec 1899) | RangeError: Year outside |
| `1899-12-31T23:00:00Z` | RangeError: Year outside (input year) |
| `9999-12-31T21:59:59Z` / `9999-12-31T22:00:00Z` | 31 December 9999 / RangeError (year 10000 in SAST) |
| `2024-02-28T22:00:00Z` / `2023-02-28T22:00:00Z` | 29 February 2024 / 1 March 2023 |
| `2026-12-31T22:00:00Z` | 1 January 2027 |
| `af`, `2024-02-29T22:30:00Z` | 1 Maart 2024 |

Every result matches the JSDoc and `docs/i18n.md`. Identical under UTC+14 and UTC-11.

### `formatNumber`, `formatRand`, plurals

| Call | Result |
|---|---|
| `formatNumber(0)`, `(-0)`, `(0.0004)`, `(-0.0004)`, `(1e-7)`, `(5e-324)` | `0` (never `-0`) |
| `(0.0005)` / `(-0.0005)` / `(0.0006)` | `0.001` / `-0.001` / `0.001` (half away from zero) |
| `(1.0005)`, `(1.23456)`, `(0.1+0.2)` | `1.001`, `1.235`, `0.3` |
| `(1234.5)`, `(-1234.5)`, `(2300000)`, `(1e21)`, `(MAX_SAFE_INTEGER)` | U+00A0 grouping throughout, `.` decimal, `-` sign |
| `(5e-7, {max:7})`, `(0.00012, {max:5})` | `0.0000005`, `0.00012` |
| `(1.5, {min:4})` | `1.5000` (min raises max, as documented) |
| `(1.5, {max:0})`, `(2.5, {max:0})`, `(-2.5, {max:0})` | `2`, `3`, `-3` |
| `(1.5, {min:4, max:2})`, `({max:101})`, `({min:-1})` | Intl's raw RangeError ("maximumFractionDigits value is out of range."), not documented (nit n5) |
| `NaN`, `Infinity` | RangeError: Not a finite number |
| `formatRand(-0.004)` / `(-0.005)` / `(1.005)` / `(1.015)` / `(2.675)` | `R 0.00` / `-R 0.01` / `R 1.01` / `R 1.02` / `R 2.68` |
| `formatRand(MAX_RAND_AMOUNT)`, `(-MAX_RAND_AMOUNT)` | `R 90 071 992 547 409.90`, `-R …` |
| `formatRand(MAX_RAND_AMOUNT + 1)`, `(1e21)`, `(NaN)` | RangeError |
| `t(en/af, 'search.results', {count})` for 0, 1, 1.5, 2, -1 | 0 results / 0 resultate, 1 result / 1 resultaat, 1.5 results, 2 results, -1 result / -1 resultaat |
| count `NaN`, `1e21` | `NaN results`, `1e+21 results` (`String()`, as documented) |
| Untyped escape: plural with no count, count `'1'`, unknown key, `constructor`, `nav.__proto__`, missing param | `{count} results`, `1 results`, the key, the key, the key, `Next: {title}`. No prototype lookups leak |

### Per-key parameter typing (`probe-types-fail.ts`, `tsc -p tsconfig.probe.json`)

24 deliberately wrong calls, one per line, and 12 correct calls. `tsc` exit 2, with **exactly 24 errors, one on each of the 24 wrong lines and none on the correct lines**. The wrong calls cover:

- a missing params object (`nav.next`, `search.results`, `trust.aiNotice.body`, `trust.status.humanChecked`);
- a wrong param name, an extra param, a string `count`, and `count` on a key without placeholders (`common.yes`);
- half of a two-param trust key (`bodyHumanChecked` with only `date` and with only `reviewer`), and `date.format` without `year`;
- an unknown key, `search.results.one`, and the disabled locale `zu`;
- `useTranslations` with a missing param or a string `count`;
- `createTranslator` over `pick(['search','trust'])` with a key outside those groups, a plural with no params, and `trust.fact.checked` with `{}`;
- a key union that needs `{ types }`, and a mixed union that needs both `{ title }` and `{ date }`;
- `undefined`, `null` and `boolean` values.

The correct calls include the wide `TranslationKey` escape hatch and the full union params.

Pass 3's gap is closed: every runtime and type probe it asked for has run.

## Honesty audit

### Strings that claim a check, name sources or talk about accuracy

I dumped every EN and AF leaf that mentions checking, verifying, sources, official, accuracy, review, advice, confirm, AI, written or translation (`scratchpad/wp12b-pass4/dump.mjs`) and read each pair.

**"against official sources" is gone.** No English string says that a check was made against official sources, and no Afrikaans string says "teen amptelike bronne". The remaining uses of "official" are these:

- per-entry labels and link text (`trust.sources.officialLabel`, `externalLink`, and `externalLinkOther` for sources that are not official);
- a filter (`sources.officialOnly`);
- the legend (`sources.official*`);
- "where official sources are marked" / "waar amptelike bronne gemerk is", which describes the register rather than the check;
- the imperative "check the official source" / "kontroleer die amptelike bron" (D5 wording);
- `trust.unverified.body` "An AI could not confirm this in an official source". That is a negative statement, shown only after the accuracy review flags a fact.

`home.threeNumbers.officialSource` is still hard-wired to "Official source". Pass 3 already recorded that for the page package.

**Every check claim names who checked.**

| Key | EN agent | AF agent and "Engelse teks" |
|---|---|---|
| `site.description` | "AI-checked facts" | "feite wat ’n KI in die Engelse teks nagegaan het" ✔ |
| `site.disclaimerShort` | "checked by AI" | "’n KI het die Engelse teks … nagegaan" ✔ |
| `site.disclaimerLong` | "An AI checked … No person has checked them." | "’n KI het … in die Engelse teks nagegaan … Geen mens …" ✔ |
| `site.checkedOn` | "An AI checked" | "’n KI het die feite in die Engelse teks …" ✔ |
| `home.heroLead`, `home.heroVerify` | "AI-checked facts"; "An AI checked … No person has checked them yet." | Both "Engelse teks" ✔ |
| `home.trust.checked` | "An AI checked the facts on {date}" | "Engelse teks op {date} deur KI nagegaan" ✔ |
| `trust.aiNotice.body`, `bodyNoPageSources` | "An AI checked it …" | "’n KI het die Engelse teks …" ✔ |
| `trust.aiNotice.bodyHumanChecked*` | "{reviewer} checked it …" | "{reviewer} het die Engelse teks …" ✔ |
| `trust.status.aiChecked`, `humanChecked` | "AI-checked", "Checked by {reviewer}" | "KI-nagegaan", "Deur {reviewer} nagegaan" (no qualifier by design, pinned by the test) |
| `trust.status.aiCheckedMeans`, `humanCheckedMeans` | "An AI compared …", "{reviewer} checked …" | "… in die Engelse teks …" ✔ |
| `trust.fact.checked` | "AI-checked {date}" | "KI-nagegaan op {date}" (documented carve-out, accepted by pass 3) |
| `trust.templateRulesChecked` | "An AI checked the legal rules …" | "’n KI het die wetlike reëls … nagegaan". No "Engelse teks", but it claims a check of legal rules, not of text, so this is honest. It is not listed as an exception in the docs (m2) |
| `trust.unverified.body` | "An AI could not confirm …" | "’n KI kon dit nie … bevestig nie" |
| `about.aiSummary` | "It checked …" (pronoun; nit n3) | "Dit het … in die Engelse teks nagegaan" ✔ |
| `lang.mtNotice.body` | "An AI translated … No person has checked the translation yet." | "’n KI het … vertaal. Geen mens het die vertaling nog nagegaan nie." |

### Notice sequences as a reader meets them

The order is label · body · status · explanation · link (`docs/i18n.md` rule 2). On Afrikaans pages the MT notice sits directly under it (rule 3).

**EN, AI-checked page with page sources:**

> **About this page** · Written by AI (Claude, Anthropic). An AI checked it against the sources below on 13 September 2026. No person has checked it yet. Rules change: check the official source before you act. Not legal, tax or financial advice. · **AI-checked** · An AI compared the facts on this page with the sources. An AI can miss mistakes. · *How this was made*

**EN, human-checked page with page sources:**

> **About this page** · Written by AI (Claude, Anthropic). A. Person checked it against the sources below on 1 March 2027. Rules change: check the official source before you act. Not legal, tax or financial advice. · **Checked by A. Person** · A. Person checked the facts on this page against the sources. Mistakes are still possible, and rules can change after that date. · *How this was made*

**AF, AI-checked page, with the machine-translation notice:**

> **Oor hierdie bladsy** · Deur KI geskryf (Claude, Anthropic). ’n KI het die Engelse teks op 13 September 2026 teen die bronne hieronder nagegaan. Geen mens het dit nog nagegaan nie. Reëls verander: kontroleer die amptelike bron voordat jy iets doen. Dit is nie regs-, belasting- of finansiële advies nie. · **KI-nagegaan** · ’n KI het die feite in die Engelse teks met die bronne vergelyk. ’n KI kan foute oorsien. · *Hoe dit gemaak is*
> **Masjienvertaling** · ’n KI het hierdie bladsy uit Engels vertaal. Geen mens het die vertaling nog nagegaan nie. As iets nie duidelik is nie, lees die Engelse weergawe.

**AF, human-checked page, with the machine-translation notice:**

> **Oor hierdie bladsy** · Deur KI geskryf (Claude, Anthropic). A. Person het die Engelse teks op 1 Maart 2027 teen die bronne hieronder nagegaan. Reëls verander: kontroleer die amptelike bron voordat jy iets doen. Dit is nie regs-, belasting- of finansiële advies nie. · **Deur A. Person nagegaan** · A. Person het die feite in die Engelse teks teen die bronne nagegaan. Foute is steeds moontlik, en reëls kan ná daardie datum verander. · *Hoe dit gemaak is*
> **Masjienvertaling** · ’n KI het hierdie bladsy uit Engels vertaal. Geen mens het die vertaling nog nagegaan nie. As iets nie duidelik is nie, lees die Engelse weergawe.

**Variant for pages without page sources (EN and AF, AI-checked body):**

> Written by AI (Claude, Anthropic). An AI checked it on 13 September 2026 against the sources in the sources register, where official sources are marked. No person has checked it yet. …
> Deur KI geskryf (Claude, Anthropic). ’n KI het die Engelse teks op 13 September 2026 nagegaan teen die bronne in die bronneregister, waar amptelike bronne gemerk is. Geen mens het dit nog nagegaan nie. …

On these pages the source note follows: "This page has no sources of its own. See the full sources register."

**Judgement.**

- **Coherent: yes, in all six.** In the AF human-checked case a named person checked the English, while the MT notice says no person has checked the translation. Both statements are true, and the wording keeps them apart. In the AF AI-checked body, "Geen mens het dit nog nagegaan nie" takes "die Engelse teks" as its antecedent, which is correct. The page-without-sources variant no longer claims a check against official sources. It points at a register that the reader can open, which is honest while ADR 0006's accuracy review has not run.
- **Contradictions: none inside a notice.** Across the page there is one small tension, in m1: the home trust bullet says "A source for every page", while pages without page sources say "This page has no sources of its own".
- **Repetition:** the EN AI-checked sequence names the AI five times in about 60 words ("Written by AI", "An AI checked", "AI-checked", "An AI compared", "An AI can miss"). That is dense, but each mention is doing work that D5 requires (author, checker, status in words, explanation, limitation), so I do not raise it. The AF header states "Engelse teks" twice, not three times, which is right. The only wording I would tidy is "sources in the sources register, where official sources are marked": "sources" three times in one clause (nit n2).
- **Observation for the page package, not a finding:** `site.disclaimerLong` ("No person has checked them") and `home.heroVerify` are site-wide statements with no human-checked variant. They are true today. The first time a page gets a named human reviewer, check that neither string renders on that page next to "Checked by {reviewer}".

## Afrikaans

### Latest-round changes

| Key | Now | Judgement |
|---|---|---|
| `site.footerLabel` | Webwerfvoetskrif | **Correct.** "Voetskrif" is the attested computing term for *footer*: it sits in the "kopskrif / voetskrif" (header / footer) pair used in Afrikaans word-processor localisation, and the Ubuntu Afrikaans glossary pass 3 cited gives "voetreël, voetskrif". "Voetstuk" (pedestal) is gone. 16 characters against EN 11, inside the label rule |
| `wizard.types.help` | Kies alles wat pas. | **Correct.** "Alles wat pas" is the natural form of "choose all that apply" for options. Without an antecedent in the same sentence, "almal" reads as people |
| `templates.privacy.listHint` | Voeg items by of verwyder items sodat dit waar is vir jou besigheid. | **Correct**, and it now matches the buttons "Voeg ’n item by" / "Verwyder item". "sodat dit waar is vir" follows the English "true for" closely; see the table below (nit n6) |
| `site.disclaimerShort`, `site.checkedOn`, `home.heroVerify` | "teen die bronne in die bronneregister nagegaan" | **Correct.** The PP sits before the verb-final participle, as in the rest of the dictionary |
| `site.disclaimerLong`, `about.aiSummary`, `trust.aiNotice.bodyNoPageSources`, `bodyHumanCheckedNoPageSources` | "… nagegaan teen die (Suid-Afrikaanse) bronne in die bronneregister, waar amptelike bronne gemerk is." | **Acceptable.** Moving the long PP after the participle (*uitskuiwing*) is normal Afrikaans when a relative clause follows. Without it, the "waar" clause would split the verb frame badly. "waar" as a relative for a register is idiomatic; "waarin" is a little more precise but not needed |
| `nav.toolDescriptions.sources`, `home.trust.sources` | "Die bronne agter elke bladsy", "’n Bron vir elke bladsy, en die amptelike bronne is gemerk" | Grammatically correct. The claim itself is m1 |

### Correction table

| Key | Current AF | Suggested | Reason | Confidence |
|---|---|---|---|---|
| `templates.privacy.listHint` (n6) | … sodat dit waar is vir jou besigheid. | … sodat dit by jou besigheid pas. | "waar wees vir" copies English "true for". "by … pas" is the usual Afrikaans for "fits / applies to" | Low |
| `trust.status.aiCheckedMeans` (n6, earlier round) | ’n KI kan foute oorsien. | ’n KI sien nie altyd foute raak nie. | "oorsien" is attested for *overlook*, but the same spelling also means *oversee* (supervise). The suggested wording cannot be read either way and stays plain | Low |
| `home.trust.sources` (m1) | ’n Bron vir elke bladsy, en die amptelike bronne is gemerk | Elke gids, sjabloon en kontrolelys noem sy bronne, en amptelike bronne is gemerk | Follows the EN fix in m1 | Medium |
| `nav.toolDescriptions.sources` (m1) | Die bronne agter elke bladsy | Die bronne agter die feite | Follows the EN fix in m1 and matches `sources.intro` | Medium |
| `trust.aiNotice.bodyNoPageSources` and 5 siblings (n2) | … teen die bronne in die bronneregister, waar amptelike bronne gemerk is | … teen die bronneregister, waarin die amptelike bronne gemerk is | Says "bronne" twice instead of three times | Low |

## Findings

### minor: m1. "A source for every page" is not true on pages that say they have no sources of their own

File: `src/i18n/en.json` and `src/i18n/af.json`: `home.trust.sources`, `nav.toolDescriptions.sources`
Acceptance item: build plan D5, "Nothing implies more certainty than the source" and "Pages with no page-specific sources (start pages, the sources register itself) show `doc.sourceNote`"

What is wrong: the latest round changed "A source for every fact" to "A source for every page, and official ones are marked" (AF "’n Bron vir elke bladsy …"), and changed the tool description to "The sources behind each page". Pass 3 n1 proposed this wording. But D5 says outright that some pages have no page sources, and this package's own `trust.sources.noPageSources` renders "This page has no sources of its own." on them. So a trust bullet under "Why you can use this guide" makes a universal claim that the site contradicts on the start pages and on the sources register. The harm is small, because those pages carry few facts, which is why this is minor. But this package exists to get these claims exactly right.

How to reproduce:
```
node -e "const e=require('C:/_Projects/Local/bt-wt/wp12b/src/i18n/en.json');console.log(e.home.trust.sources,'|',e.nav.toolDescriptions.sources,'|',e.trust.sources.noPageSources)"
```
Suggested fix: match the D5 build gate, which is what is actually guaranteed. `home.trust.sources`: "Every guide, template and checklist lists its sources, and official ones are marked" / "Elke gids, sjabloon en kontrolelys noem sy bronne, en amptelike bronne is gemerk". The terminology test needs "sjablo" and "kontrolelys" when EN has "template" and "checklist", and both are present. `nav.toolDescriptions.sources`: "The sources behind the facts" / "Die bronne agter die feite", which matches `sources.intro`.

### minor: m2. `docs/i18n.md` still calls `trust.fact.checked` "the one" Afrikaans check string without "Engelse teks"

File: `docs/i18n.md`, trust table row for `trust.fact.checked` (line 239)
Acceptance item: "`docs/i18n.md` accurately describes the trust group"

What is wrong: the row says `trust.fact.checked` "is the one Afrikaans check string that does not say 'Engelse teks'". That is false in three places:
- the status labels `trust.status.aiChecked` ("KI-nagegaan") and `trust.status.humanChecked` ("Deur {reviewer} nagegaan") deliberately lack it, as the row seven lines earlier (232) and the paragraph at line 257 both say;
- `trust.templateRulesChecked` ("’n KI het die wetlike reëls … op {date} nagegaan") lacks it;
- `trust.unverified.body` ("’n KI kon dit nie … bevestig nie") lacks it.

The table therefore contradicts itself on the status labels. This is the same kind of defect as pass 3's M1. Pass 3 fixed the paragraph but missed this row. I rate it minor, not major: the paragraph now says "Do not add it back", and the test pins both labels exactly, so a future author cannot silently reopen pass 2's m3.

How to reproduce: read `docs/i18n.md` lines 232, 239 and 257 side by side, then
```
node -e "const a=require('C:/_Projects/Local/bt-wt/wp12b/src/i18n/af.json').trust;console.log(a.status.aiChecked,'|',a.templateRulesChecked,'|',a.unverified.body)"
```
Suggested fix: replace "It is the one Afrikaans check string that does not say 'Engelse teks'" with: "Like the two status labels, it does not say 'Engelse teks': it labels a figure, and `content:fidelity` keeps figures byte-identical between the trees. `trust.templateRulesChecked` does not say it either, because it claims a check of the legal rules, not of the text."

### minor: m3. `switchLocaleUrl` throws on a `%5C` in the query or hash of a string, but accepts the same address as a `URL`

File: `src/lib/i18n-routes.ts:163` (`assertSafePath(typeof current === 'string' ? current : path, path, 'a path')`), and `docs/i18n.md` line 191
Acceptance item: general quality (correctness); the docs claim that the forms of `current` are equivalent ways to pass the page address

What is wrong: for a string `current`, the backslash, tab and line-break test runs over the whole raw string, including query and hash. For a `URL`, it runs over `pathname` only. The rationale in the JSDoc and docs is that `new URL` would resolve `\` in the *path* differently per locale, which does not apply to a query or hash. The build plan has a full-page search at `/search/?q=`. A GET search for `C:\` produces `?q=C%3A%5C`, and then the documented input form `location.pathname + location.search + location.hash`, and `location.href`, both throw, while `new URL(location.href)` returns `/business-toolkit/af/search/?q=C%3A%5C`. If the client script uses either string form to keep the query on a language switch, it throws on that page. The rejection is documented ("anywhere in a string `current`"), so this is not a hidden change, but the two input forms are not equivalent and the rule covers more than its reason.

How to reproduce: `scratchpad/wp12b-pass4/probe-query.ts` (output in "Probes" above).
Suggested fix: in `switchLocaleUrl`, run `UNSAFE_ROUTE_CHAR` only on the raw *path part*: for a string, the part before the first `?` or `#`; for a full URL string, the text up to the first `?` or `#` (the path can only be affected there). Then add the three `probe-query.ts` cases as tests. Alternatively, keep the behaviour and state in `docs/i18n.md` that a string `current` with `%5c` in the query or hash throws, and that `new URL(location.href)` is the safe form.

### nit: n1. No regression test for the "against official sources" wording that pass 3 m3 removed

File: `tests/unit/i18n.test.ts`
The "names the checker" suite checks that each claim has an agent, not what the claim was made against. Re-adding "An AI checked it against official sources on {date}" would pass every test. A one-line guard over every dictionary would pin the fix until ADR 0006's accuracy review runs: `expect(text).not.toMatch(/against official sources|teen amptelike bronne/i)`.

### nit: n2. "the sources in the sources register, where official sources are marked"

File: `src/i18n/en.json` and `af.json`: `trust.aiNotice.bodyNoPageSources`, `bodyHumanCheckedNoPageSources`, `site.disclaimerLong`, `about.aiSummary` (and `disclaimerShort`, `checkedOn`, `heroVerify` for the first two "sources")
"Sources" appears three times in one clause. Possible fix: "against the sources register, which marks the official ones" / "teen die bronneregister, waarin die amptelike bronne gemerk is". This keeps the meaning and the honesty.

### nit: n3. `about.aiSummary` names the checker only through a pronoun

File: `src/i18n/en.json` / `af.json`: `about.aiSummary`
"An AI assistant (Claude, made by Anthropic) wrote this guide. It checked …" / "… het hierdie gids geskryf. Dit het … nagegaan". The nearest noun is "this guide" / "hierdie gids", so the pronoun can briefly read as the guide. The names-checker test accepts a bare `It` / `Dit` as an agent. Using "The AI checked …" / "Die KI het … nagegaan" would name the agent directly, as every other claim does.

### nit: n4. `href()` corrupts a query string, and `basePath()` keeps inner backslashes

File: `src/lib/paths.ts:33-42`, `:18-21`
`href('en', 'core/?q=1', '/business-toolkit/')` gives `/business-toolkit/core/?q=1/`: the trailing-slash rule runs on text that includes the query. The base `33bf2a8` has the same logic, so this is not a regression, but the build plan's `/search/?q=` route makes it reachable if a page ever builds that link with `href`. `basePath('a\b')` gives `/a\b/` (a browser reads it as `/a/b/`), and `basePath(' /x/ ')` gives `/ /x/ /`. The base is config, so the risk is low. Split `?` like `#` in `href`, or document that `path` must not contain a query.

### nit: n5. `formatNumber` passes Intl's own RangeError through for impossible fraction options

File: `src/i18n/index.ts:450-466`
`{ minimumFractionDigits: 4, maximumFractionDigits: 2 }`, `{ maximumFractionDigits: 101 }` and `{ minimumFractionDigits: -1 }` throw "maximumFractionDigits value is out of range." from `Intl.NumberFormat`. The throw is correct behaviour, but the JSDoc and docs mention only non-finite input. One sentence would cover it.

### nit: n6. Two optional Afrikaans polish items

File: `src/i18n/af.json`: `templates.privacy.listHint`, `trust.status.aiCheckedMeans`
See the correction table: "sodat dit by jou besigheid pas" and "’n KI sien nie altyd foute raak nie". Low confidence. Neither is wrong as written.

## Verification of pass 3

| Id | Pass-3 finding | Status at `20bcb1b` | Evidence |
|---|---|---|---|
| M1 | `docs/i18n.md` said every AF `trust.status.*` string says "Engelse teks", contradicting its table and the test | **Fixed** | Line 257 now reads "Every Afrikaans `trust.aiNotice.body*` and `trust.status.*Means` string says 'Engelse teks'", then explains that the two labels deliberately do not, with "Do not add it back". Line 259 describes the test exactly: `toContain('Engelse teks')` over the four bodies and two `*Means`, and exact values for the two labels. That matches `tests/unit/i18n.test.ts:646-670` as I read it. The one leftover sentence, at line 239, is m2 |
| m1 | `site.footerLabel` "Webwerfvoetstuk" | **Fixed** | "Webwerfvoetskrif" |
| m2 | `wizard.types.help` "Kies almal wat pas" | **Fixed** | "Kies alles wat pas." |
| m3 | The "against official sources" family | **Fixed** | All six strings changed to pass 3's proposed EN and AF text, word for word. The author also applied it to `trust.aiNotice.bodyHumanCheckedNoPageSources`, which pass 3 did not list. `site.checkedOn`'s test expectation was updated (`i18n.test.ts:522`). A grep over both dictionaries finds no remaining "against official sources" / "teen amptelike bronne". No regression guard (n1) |
| n1 | "A source for every fact" | **Applied**, but the new wording overclaims in another way | See m1 |
| n2 | Worktree D5 is the pre-revision text | **Unchanged, as expected** | `docs/build-plan.md:285` in the worktree still has the old D5. It is not owned by this package, and the merge takes `main`'s revised D5 |
| n3 | "haal items uit" in `templates.privacy.listHint` | **Fixed** | "Voeg items by of verwyder items …" |
| Next-pass item 2 | Run the probes and the TZ run | **Done** | See "Probes": runtime and type probes, plus UTC+14 and UTC-11 test runs, each with the zone confirmed inside Node |
| Next-pass item 3 | `pnpm build` and `gate:fast` | **Partly** | I ran every `gate:fast` step (lint, typecheck, `tsc --noEmit -p .`, test, test:content), all exit 0, and the worktree stayed clean. I did not run `pnpm build`: the brief limits this pass to unit-level commands, and the latest round changes only JSON strings, docs and one test expectation |
| Next-pass item 4 | Merge-safety `git grep` on committed tips | **Not done** | Not in this pass's brief. The latest round renamed and removed no keys, so pass 3's conclusions still hold |

Pass 3's read-only notes on the names-checker test (English CLAIM matches only `checked`, AGENT accepts a bare `It`/`Dit`, the `> 8` floor) are still accurate. n1 and n3 above are the two concrete cases where these limits matter today.
