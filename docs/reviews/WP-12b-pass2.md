# WP-12b review, pass 2 (REVIEWER-K)

- Package: WP-12b, i18n follow-up (trust strings for AI disclosure and sources, plus WP-12 pass 3 P1–P3 and pass 4 m1–m5 and nits)
- Branch: `wp/wp12b-i18n-followup`, worktree `C:\_Projects\Local\bt-wt\wp12b`
- HEAD `644ef336fbdf00ca2e1571c8d13b806d6aacded5` = `644ef33` (confirmed, not moved), commits `ff42c75`, `ff3a9b8`, `6eaaa54`, `d3e32de`, `644ef33`, base `33bf2a8`. Worktree clean.
- Reviewer: REVIEWER-K, independent of pass 1 (REVIEWER-I). I drafted my own findings before reading `WP-12b-pass1.md`.
- Date: 2026-09-16
- Scope: the whole diff `33bf2a8...644ef33`, reviewed fresh, not only the pass-1 fixes.

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 1 |
| minor | 3 |
| nit | 5 |

Every command passes and coverage is high. The package does what it set out to do: the AI notice, status and explanation now name the checker in both languages, the Afrikaans strings no longer claim the translation was checked, and a test pins that. All of pass 1's M1, m1–m5 and n1–n6 are genuinely resolved (table below), and nothing I checked regressed.

The one major is not in the new `trust` group. It is three older strings in the same owned files that tell the reader every fact has an **official** link, when ADR 0006 records that only about a third of the register is official, and when this very package added `trust.sources.externalLinkOther` because some sources are not official. It predates the branch, but it sits one line under a string this package rewrote for exactly this reason, and D5 forbids it.

## Commands

Run in the worktree at `644ef33`, one at a time in the foreground. The machine was heavily loaded; several commands passed the harness 10-minute cap and finished in the background. Vitest never hit a fork-pool timeout, so no `--maxWorkers=1` re-run was needed.

`pnpm lint` (exit 0)
```
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
=== LINT EXIT: 0 ===
```

`pnpm typecheck` (exit 0)
```
$ astro check
03:29:05 [check] Getting diagnostics for Astro files in C:\_Projects\Local\bt-wt\wp12b...
Result (21 files):
- 0 errors
- 0 warnings
- 0 hints
typecheck exit=0
```

`pnpm exec tsc --noEmit -p .` (exit 0)
```
tsc exit=0
```
Because `tsc` exits 0, every `@ts-expect-error` in `tests/unit/i18n.test.ts` is still live.

`pnpm test` (exit 0)
```
 RUN  v5.0.1 C:/_Projects/Local/bt-wt/wp12b
 Test Files  4 passed (4)
      Tests  138 passed (138)
   Start at  04:04:54
   Duration  97.76s (tests 95%, transform 4%, import 1%)
test exit=0
```
138 tests, up from 133 at pass 1. The five new ones are the trust rendering test, the Afrikaans "Engelse teks" test, and the "names the checker" test.

Coverage (`pnpm exec vitest run --project unit --coverage --coverage.include=src/i18n/**/*.ts --coverage.include=src/lib/**/*.ts`, exit 0)
```
      Tests  138 passed (138)
   Duration  97.01s
 % Coverage report from v8
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   99.53 |    97.17 |     100 |   99.47 |
 i18n            |     100 |    98.23 |     100 |     100 |
  index.ts       |     100 |    98.19 |     100 |     100 | 303,368
 lib             |   98.57 |    95.31 |     100 |   98.33 |
  i18n-routes.ts |     100 |    97.05 |     100 |     100 | 117
  paths.ts       |   95.65 |    93.33 |     100 |      95 | 45
-----------------|---------|----------|---------|---------|-------------------
Statements   : 99.53% ( 215/216 )
Branches     : 97.17% ( 172/177 )
Functions    : 100% ( 53/53 )
Lines        : 99.47% ( 191/192 )
coverage exit=0
```
Well above the ≥90% bar for `src/lib/**` in C5. `index.ts:303` and `i18n-routes.ts:117` are the `?? locale` fallbacks for an unknown code; `index.ts:368` is a `mergeWithFallback` branch; `paths.ts:45` is the out-of-base branch in `stripBase` (see n2).

`pnpm build` (exit 0)
```
04:21:13 [build] ✓ Completed in 10.34s.
04:21:13 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
04:21:13 [build] 1 page(s) built in 10.48s
04:21:13 [build] Complete!
build exit=0
```

`pnpm gate:fast` (exit 0; the chain is `&&`, so lint, typecheck, `tsc --noEmit -p .` and the unit/dom suite all ran and passed before `test:content`)
```
 RUN  v5.0.1 C:/_Projects/Local/bt-wt/wp12b
No test files found, exiting with code 0
projects: content
|content|
include: tests/content/**/*.test.ts
exclude:  **/node_modules/**, **/.git/**
gate:fast exit=0
```

`git status --porcelain` after the build and the gate (empty, as required by E1)
```
[]
```

Time-zone run. Pass 1 recorded that Git Bash silently fails to pass `TZ` to the native Node process, so I ran it from PowerShell and confirmed the zone inside Node itself before trusting the result:
```
node sees Tue Sep 15 2026 19:39:36 GMT-0700 (Pacific Daylight Time) | America/Los_Angeles
Test Files  4 passed (4)
Tests  138 passed (138)
Duration  96.87s (tests 95%, transform 4%, import 1%)
TZ test exit=0
```
Same 138 passing tests as under SAST, so the date handling is genuinely offset-independent rather than accidentally agreeing with the host zone.

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
All inside owned paths. `src/i18n/locales.ts` is owned but unchanged. The `package.json` change touches only `gate:fast` (verified in the diff). `docs/reviews/backlog.md` removes exactly the three P1–P3 rows, and all three are genuinely fixed (table below).

Scratch work, all in `scratchpad/wp12b-pass2/`; nothing in the worktree was edited or committed.
- `probe-runtime.mts` — routes, dates, numbers and `t()` edge cases, run with the worktree `tsx`. 0 expectation failures.
- `probe-types.ts` — 20 call shapes checked with the worktree `tsc`.

## Honesty audit

### What a reader sees

**EN, AI-checked page with page sources** (label, body, status, explanation, link — the order `docs/i18n.md` now fixes):

> **About this page** · Written by AI (Claude, Anthropic). An AI checked it against the sources below on 13 September 2026. No person has checked it yet. Rules change: check the official source before you act. Not legal, tax or financial advice. · **AI-checked** · An AI compared the facts on this page with the sources. An AI can miss mistakes. · *How this was made*

**EN, human-checked page:**

> **About this page** · Written by AI (Claude, Anthropic). A. Person checked it against the sources below on 1 March 2027. Rules change: check the official source before you act. Not legal, tax or financial advice. · **Checked by A. Person** · A. Person checked the facts on this page against the sources. Mistakes are still possible, and rules can change after that date. · *How this was made*

**AF, AI-checked page, with the machine-translation notice directly under it:**

> **Oor hierdie bladsy** · Deur KI geskryf (Claude, Anthropic). ’n KI het die Engelse teks op 13 September 2026 teen die bronne hieronder nagegaan. Geen mens het dit nog nagegaan nie. Reëls verander: kontroleer die amptelike bron voordat jy iets doen. Dit is nie regs-, belasting- of finansiële advies nie. · **KI-nagegaan (Engelse teks)** · ’n KI het die feite in die Engelse teks met die bronne vergelyk. ’n KI kan foute oorsien. · *Hoe dit gemaak is*
> **Masjienvertaling** · ’n KI het hierdie bladsy uit Engels vertaal. Geen mens het die vertaling nog nagegaan nie. As iets nie duidelik is nie, lees die Engelse weergawe.

**AF, human-checked page, with the machine-translation notice directly under it:**

> **Oor hierdie bladsy** · Deur KI geskryf (Claude, Anthropic). A. Person het die Engelse teks op 1 Maart 2027 teen die bronne hieronder nagegaan. Reëls verander: kontroleer die amptelike bron voordat jy iets doen. Dit is nie regs-, belasting- of finansiële advies nie. · **Engelse teks deur A. Person nagegaan** · A. Person het die feite in die Engelse teks teen die bronne nagegaan. Foute is steeds moontlik, en reëls kan ná daardie datum verander. · *Hoe dit gemaak is*
> **Masjienvertaling** · ’n KI het hierdie bladsy uit Engels vertaal. Geen mens het die vertaling nog nagegaan nie. As iets nie duidelik is nie, lees die Engelse weergawe.

**Are the sequences coherent and non-contradictory?** Yes, all four. The hard case is the fourth: a named person checked the English, and the MT notice still says no person has checked the translation. Those are both true at once and the wording keeps them apart cleanly. The AF AI-checked case is likewise consistent — "Geen mens het dit nog nagegaan nie" attaches to "die Engelse teks", and the MT notice makes the separate statement about the translation. I could not construct a page state where the four strings contradict each other.

### Does every string name who checked?

Yes, in the new `trust` group and in the older strings the test covers. `trust.aiNotice.body` now says "An AI checked it"; `trust.fact.checked` is "AI-checked {date}"; `trust.templateRulesChecked` and `trust.unverified.body` both start with "An AI". Nothing reads as a human check. The human-checked variants name the reviewer and are documented as reserved for a named human expert (ADR 0006 point 5).

One class of string still over-claims, but about **sources** rather than about who checked: see M1.

### Does every Afrikaans string agree with the machine-translation notice?

Every `trust.aiNotice.body*`, `trust.status.*` and `trust.status.*Means` string says "Engelse teks", and a test asserts it and also asserts the absence of "op hierdie bladsy". `site.*`, `home.heroLead`, `home.heroVerify`, `home.trust.checked` and `about.aiSummary` were all reworded to say it too. This is the pass-1 M1 fix and it holds.

**Judgement on the `trust.fact.checked` exception.** The author left AF as "KI-nagegaan op {date}" without "Engelse teks", arguing it is a short inline label beside the notice. **I accept it.** Three reasons: it labels a *figure*, and `content:fidelity` keeps digits, rand amounts and dates byte-identical between the English and Afrikaans trees, so the claim is true in either language without the qualifier; it names the agent ("KI-"), so it cannot read as a human check, which is the D5 requirement; and it appears on a page whose notice carries the qualifier a few centimetres above. Adding "Engelse teks" to a chip that sits beside a number would be disproportionate and would crowd the figure it labels. The exception is documented at `docs/i18n.md:235` and deliberately excluded from the enforcing test, which is the right way to record a deliberate carve-out. One wrinkle, recorded as n5 below, not as an objection.

### Would a reader understand "AI-checked", and what to do next?

Yes, provided the placement rule is honoured, and the package now makes that rule binding rather than optional. "AI-checked" alone is a two-word chip that a lay reader could read as a quality seal; what rescues it is `aiCheckedMeans` ("An AI compared the facts on this page with the sources. An AI can miss mistakes."), which `docs/i18n.md` rule 2 and the revised D5 both require to sit inside the notice, directly after the status, always visible, never in a tooltip. What to do next is stated twice in plain words: "check the official source before you act", and for an unverifiable fact, "ask the office that is responsible for it, for example SARS or CIPC". That is concrete and actionable.

### Over-correction, repetition and alarm

Not alarming in tone — the sentences are short, calm and free of jargon and exclamation marks. But the density is high in one place, and that is a real risk for a first-time reader. See m3.

## Afrikaans quality

Register is consistently "jy". `’n` is always U+2019 (the text-rule test forbids straight quotes, so this cannot regress). Diacritics are correct throughout: reëls, finansiële, lêer, ná, Tshivenḓa. The fixed terms all hold: **KI**, KI-nagegaan, nagegaan, **BTW** (never "VAT" in prose; a test enforces it), **eenmansaak/eenmansake**, **kontrolelys**, **Hoofkontrolelys** (`checklist.title`), **sjabloon/sjablone**, **bron/bronne**, **amptelike**, bronneregister, nie bevestig nie, woordelys, opdrag, merkie, toestel, regsgeleerde, Nutsgoed. Double negation is correct in every string I read, including the tricky `templates.noVatNotice` rewrite.

Two things I checked and decided are **not** defects. "Geen mens" rather than "Niemand" in the notices is a deliberate pass-1 change (n4) and is the more precise choice here, because an AI did do a check and "niemand" could be read as "nothing checked it". And `nav.menuOpen` "Wys kieslys" for "Open menu" breaks the symmetry with "Maak kieslys toe", but "Maak kieslys oop" would fail the label-length rule, so the short verb is a reasonable compromise.

### Correction table

| Key | Current AF | Suggested | Reason |
|---|---|---|---|
| `home.trust.sources` **M1** | ’n Amptelike skakel vir elke feit | ’n Bron vir elke feit, en die amptelike bronne is gemerk | Only about a third of the register is official (ADR 0006). EN below. |
| `nav.toolDescriptions.sources` **M1** | Amptelike skakels vir elke feit | Die bron agter elke feit | Same. |
| `sources.intro` **M1** | Die amptelike skakels agter die feite in hierdie gids. | Die bronne agter die feite in hierdie gids. Amptelike bronne is gemerk. | Same, and it matches the Amptelik/Ander legend on that very page. |
| `trust.status.aiChecked` **m3** | KI-nagegaan (Engelse teks) | KI-nagegaan | The body directly above and `aiCheckedMeans` directly below both say "Engelse teks". The label is the one of the three carrying no unique information. Also removes a label-length exception. |
| `trust.status.humanChecked` **m3, n4** | Engelse teks deur {reviewer} nagegaan | Deur {reviewer} nagegaan | Same reason, and it makes the two status labels parallel in shape instead of using two different patterns for one slot. Also removes the second label-length exception. |
| `site.footerLabel` **n3** | Webwerfvoetskrif | Webwerfvoetstuk | "Voetskrif" is a footnote, not a page footer. This is the accessible name of the footer landmark, so a screen-reader user hears the wrong word. Length still passes the label rule. |
| `wizard.types.help` **n3** | Kies alles wat pas. | Kies almal wat pas. | The referent is countable ("soorte besigheid"); "alles" is a mass noun. |
| `templates.privacy.listHint` / `addListItem` / `removeListItem` / `removeListItemEmpty` **n3** | Voeg reëls by of haal reëls uit … / Voeg ’n reël by / Verwyder reël: {text} / Verwyder leë reël {n} | Voeg items by of haal items uit … / Voeg ’n item by / Verwyder item: {text} / Verwyder leë item {n} | In the same dictionary "reëls" also renders *rules* ("Reëls verander", "wetlike reëls"). In a privacy-notice list "Voeg ’n reël by" can be read as "add a rule". WP-12 pass 3 P3 already fixed the sibling "BTW-reël" ambiguity. All four stay within the label-length rule. |
| `a11y.newTab` **n3** | (maak in ’n nuwe oortjie oop) | (gaan in ’n nuwe oortjie oop) | EN is declarative ("opens in a new tab"); the AF reads as an instruction to the user. |
| `site.disclaimerLong`, `home.heroVerify` **n3** | Geen mens het dit (nog) nagegaan nie. | Geen mens het hulle (nog) nagegaan nie. | "dit" stands for a plural list ("die fooie, drempels, vormnommers en wetlike reëls" / "die feite"); EN says "them". Stylistic, low confidence — Afrikaans tolerates a collective "dit". |

English side of M1:

| Key | Current EN | Suggested EN |
|---|---|---|
| `home.trust.sources` | An official link for every fact | A source for every fact, and official ones are marked |
| `nav.toolDescriptions.sources` | Official links for every fact | The source behind every fact |
| `sources.intro` | The official links behind the facts in this guide. | The sources behind the facts in this guide. Official sources are marked. |

All six replacements keep the text rules: no digits outside placeholders, no straight quotes, no `!`, no `...`, no braces.

## Findings

### major: M1. Three strings promise an official link for every fact, when about a third of the register is official

File: `src/i18n/en.json` and `src/i18n/af.json` — `home.trust.sources`, `nav.toolDescriptions.sources`, `sources.intro`
Acceptance item: build plan D5, "Nothing implies more certainty than the source. No *guaranteed*, *always* or *official* language unless the source is official and says so."

What is wrong: the home page trust strip tells the reader "An official link for every fact"; the Tools menu says "Official links for every fact"; the sources page opens with "The official links behind the facts in this guide." ADR 0006 records in its own Context that "About a third of the source register entries are official sources." The dictionaries contradict these three strings directly: `sources.unofficial` is "Other" with the description "A useful website that is not from government or a regulator", and **this package added** `trust.sources.externalLinkOther` — "Opens a website that is not official" — precisely so a non-official link is not announced as official. A reader is told on the home page that every fact has an official link and then finds a legend on the sources page explaining that some are not.

These three strings predate the branch (they are unchanged context in `33bf2a8...644ef33`). I am raising them anyway because they are in owned files, because `home.trust.sources` is the line immediately below `home.trust.checked`, which this package rewrote from "Facts checked on {date}" to "An AI checked the facts on {date}" for exactly this class of over-claim, and because the package's whole purpose is the wording readers see about provenance. Fixing the line above and leaving the line below is an incomplete fix.

How to reproduce:
```
node -e "const e=require('C:/_Projects/Local/bt-wt/wp12b/src/i18n/en.json');console.log(e.home.trust.sources,'|',e.nav.toolDescriptions.sources,'|',e.sources.intro,'|',e.sources.unofficialDescription,'|',e.trust.sources.externalLinkOther)"
```
Suggested fix: the six replacements in the correction table. They keep the promise that every fact has a source, and move "official" to where it is true — the per-entry label that the pipeline already sets.

### minor: m1. `switchLocaleUrl` accepts the route shapes `alternateUrls` now rejects

File: `src/lib/i18n-routes.ts:143-152`
Acceptance item: general quality; the pass-4 n1 / pass-1 m5 hardening, and the `current` contract in `docs/i18n.md:178-189`

What is wrong: commit `6eaaa54` hardened `alternateUrls` with `UNSAFE_ROUTE_CHAR` (`\`, `%5c`, tab, CR, LF) and a dot-segment check, and that fix is solid — every hostile route in my probe throws. `switchLocaleUrl` received no equivalent guard, so the two sibling helpers in one file now have opposite contracts against the same threat, and nothing says so. Probe output:
```
switchLocaleUrl("/business-toolkit/core\..\..\evil/",'af') => "/business-toolkit/af/core\..\..\evil/"
switchLocaleUrl("/business-toolkit/af/../../evil/",'af')   => "/business-toolkit/af/../../evil/"
switchLocaleUrl("/business-toolkit/af/%2e%2e/evil/",'af')  => "/business-toolkit/af/%2e%2e/evil/"
switchLocaleUrl("/business-toolkit/core/<TAB>../evil/",'af') => tab preserved
```
A browser resolves the first to `/business-toolkit/evil/`: the language switcher would carry the reader to a different page from the one they are reading. This is minor rather than major because it is not reachable through the documented input — a real `location.pathname` is already normalised, and so is a `URL` — but `docs/i18n.md` lists the accepted forms for `current` without saying that anything else is passed through unchecked, and a page package could reasonably hand it a server-built path.

How to reproduce: `scratchpad/wp12b-pass2/probe-runtime.mts`, section 8.
Suggested fix: reuse `UNSAFE_ROUTE_CHAR` and the dot-segment check inside `switchLocaleUrl`, or state in the JSDoc and in `docs/i18n.md` that `current` must already be a normalised pathname, and add the cases to `tests/unit/i18n-routes.test.ts`.

### minor: m2. The "names the checker" test is a fixed allowlist, so a new over-claiming string cannot fail it

File: `tests/unit/i18n.test.ts:639-669`
Acceptance item: D5, every string that mentions checking must name who checked

What is wrong: the test is called "names the checker in every string outside trust that mentions checking", but it iterates a hard-coded list of eight keys. Nothing scans the dictionary. A new string — say `site.verifiedBy` = "Checked against official sources on {date}" — would ship without failing anything, which is the exact regression D5 exists to prevent. The name of the test promises a property the test does not enforce, which is worse than a narrower name, because a later author will trust it.

It is also weak on the keys it does cover. `expect(text).toMatch(/An AI|AI-checked|by AI|It checked/)` matches anywhere in the string, so "The facts were checked on {date}. Written by AI." passes while the checking verb still has no agent. The Afrikaans half only requires `toContain('Engelse teks')` anywhere in the string. Both halves can be satisfied trivially.

How to reproduce: add a key to `en.json`/`af.json` whose value mentions checking without an agent, regenerate `ParamNames`, run `pnpm exec vitest run --project unit tests/unit/i18n.test.ts`. It passes.
Suggested fix: derive the set instead of listing it — scan every English leaf for `/\bcheck(ed|s)?\b/i` and every Afrikaans leaf for `/nagegaan|bevestig/i`, subtract `trust.*` (already covered by the sibling test) and an explicit, commented allowlist of reader-instruction strings (`site.howThisWasMade`, `about.aiLink`, `search.suggestions`, `validation.advisory`, and `site.disclaimerLong`'s "check the number yourself"). Then assert the agent, not just its presence somewhere in the text.

### minor: m3. Over-correction: the Afrikaans article header states the English-text qualifier three times, inside five English mentions

File: `src/i18n/af.json` (`trust.status.aiChecked`, `trust.status.humanChecked`); `docs/i18n.md:240-253`
Acceptance item: D5 tone ("short and plain"); `docs/i18n.md` "short sentences, plain words … Readers may use English as a second language"

What is wrong: on an Afrikaans content page the header now reads "Engelse teks" three times inside one notice — in `aiNotice.body`, again in the `status` label, and again in `aiCheckedMeans` — and the machine-translation notice directly beneath adds "uit Engels vertaal" and "lees die Engelse weergawe". Five mentions of the English text in one block, before the reader reaches a word of content. The individual strings are calm, but stacked they read as anxious, and the qualifier that matters most (in the body, with the date) is diluted by two restatements.

Which single placement carries the message best: **the notice body**. It is the full sentence, it names the agent, it carries the date, and it is the string D5 specifies. `aiCheckedMeans` must also keep it — that is the pass-1 M1 fix, and removing it there would re-open M1.

Recommendation, which keeps every honesty guarantee intact: drop the qualifier **only from the two short status labels**, which sit between two strings that both state it.
- `trust.status.aiChecked`: "KI-nagegaan (Engelse teks)" → "KI-nagegaan"
- `trust.status.humanChecked`: "Engelse teks deur {reviewer} nagegaan" → "Deur {reviewer} nagegaan"

After this the notice still says an AI wrote the page, that an AI checked the **English text** on a date, and that no person has checked it; the explanation still says the check was on the English text; and the machine-translation notice still says the translation is unreviewed. Nothing an honest reader needs is lost.

Two consequential edits the fix requires, both of which the suite will force:
1. `tests/unit/i18n.test.ts:616-637` must narrow its assertion to `trust.aiNotice.body*` and `trust.status.*Means`, exempting the two label keys.
2. Both `trust.status.*` entries in `LABEL_LENGTH_EXCEPTIONS` become stale: "KI-nagegaan" is 11 against EN 10, and "Deur {reviewer} nagegaan" is 24 against EN 21, so neither trips the rule any more. The existing "has no stale exceptions" test will fail until they are deleted, which is a good self-check.

Secondary, smaller: on the home page the same claim appears three times — `home.heroVerify` in the hero, `home.trust.checked` in the trust strip, `site.disclaimerShort` in the footer. B6 puts all three regions on that page deliberately, so I am not asking for one to be removed; the trust strip exists to restate trust signals. But the Afrikaans `home.trust.checked` is now 57 characters against 33 in English and towers over its sibling bullets ("Gratis, en jy het nie ’n rekening nodig nie"). Shortening it to "Engelse teks op {date} deur KI nagegaan" keeps the agent, the date and the qualifier, and restores the balance of the card.

### nit: n1. `basePath` normalises slashes but not backslashes

File: `src/lib/paths.ts:16-19`
Probe: `basePath('\business-toolkit\')` → `/\business-toolkit\/`. A URL beginning `/\` is treated by browsers like `//`, so `href` would then emit a protocol-relative link to another host. Pass 1's n3 fixed the `//` half (`basePath('//')` now correctly returns `/`) and the `href` path-argument half (leading `[/\\]+` are stripped), but the base argument keeps the hole. Not realistic — the base comes from `BASE_PATH` and astro config, never from user input — which is why this is a nit and not more. One-line fix: strip `[\\/]` rather than `/` in `basePath`.

### nit: n2. `stripBase` silently treats an out-of-base path as a route, and that branch is the only uncovered line in `src/lib`

File: `src/lib/paths.ts:45`
`routeFromPath('/other/x', '/business-toolkit/')` returns `other/x` — a path from outside the base is accepted and reinterpreted as a site route rather than rejected. The behaviour is neither documented nor tested, and `paths.ts:45` is the one uncovered line in the coverage run. Either document it as deliberate or throw, and add the case to `tests/unit/paths.test.ts`.

### nit: n3. Afrikaans polish

File: `src/i18n/af.json`
Six entries in the correction table above, marked n3: `site.footerLabel` ("voetskrif" is a footnote, and this is a landmark's accessible name), `wizard.types.help` ("alles" for a countable plural), the four `templates.privacy` list strings ("reël" collides with *rules* elsewhere in the same dictionary), `a11y.newTab` (imperative where English is declarative), and the plural-antecedent "dit" in `site.disclaimerLong` and `home.heroVerify`. None of these are in the new `trust` group; all predate the branch except where noted.

### nit: n4. The two verification status labels use two different shapes

File: `src/i18n/af.json` (`trust.status.aiChecked`, `trust.status.humanChecked`)
"KI-nagegaan (Engelse teks)" is a compound plus a parenthetical; "Engelse teks deur {reviewer} nagegaan" is a full passive clause. They fill the same slot in the same component and should be parallel. The m3 fix makes them parallel as a side effect ("KI-nagegaan" / "Deur {reviewer} nagegaan"). If m3 is not taken, use "Engelse teks deur KI nagegaan", which is exactly the same length as the current string.

### nit: n5. On a human-checked page the inline fact chip still reads "AI-checked"

File: `src/i18n/en.json`, `af.json` (`trust.fact.checked`); `docs/i18n.md:235`
This is deliberate and documented — the chip records the AI check of that one figure, so it does not change when the page notice names a human reviewer. It is the honest behaviour. It is worth one sentence in the page-package brief all the same, because a reader who sees "Checked by A. Person" in the header and "AI-checked 12 March 2026" beside a number a screen later may read the second as contradicting the first. A page package could address it by keeping the two visually distinct.

## Pass-1 verification

| Id | Pass-1 finding | Status | Evidence |
|---|---|---|---|
| M1 | AF status explanations said the facts "op hierdie bladsy" were checked | **Fixed** | `af.json` `trust.status.aiCheckedMeans` = "’n KI het die feite **in die Engelse teks** met die bronne vergelyk. ’n KI kan foute oorsien."; `humanCheckedMeans` likewise. A new test (`i18n.test.ts:616-637`) asserts every AF `aiNotice.body*` and `status.*` contains "Engelse teks" **and** `not.toContain('op hierdie bladsy')`. |
| m1 | "Checked…" named no agent; docs let the status sit apart from the notice | **Fixed, differently** | EN body now "An AI checked it against the sources below on {date}"; `trust.fact.checked` now "AI-checked {date}". Placement is now binding: `docs/i18n.md:245` rule 2 puts the status and explanation inside the notice, "Never move them elsewhere", and D5 was revised to match. `bodyNoPageSources` still says "against official sources" rather than pass 1's suggested "sources register" wording; that is now a documented choice (`docs/i18n.md:224`) and it is defensible — it describes what the check was made against, not what the page lists. Not re-raised. |
| m2 | `trust.unverified.body` gave the reader no action | **Fixed** | EN: "An AI could not confirm this in an official source. Before you act, ask the office that is responsible for it, for example SARS or CIPC." AF mirrors it, and the "so" anglicism is gone. |
| m3 | `humanCheckedMeans` had no hedge | **Fixed** | "Mistakes are still possible, and rules can change after that date." / "Foute is steeds moontlik, en reëls kan ná daardie datum verander." The strings also now name `{reviewer}` instead of a generic "An expert", which is closer to D5. |
| m4 | Documented placement conflicted with B6 | **Fixed** | `docs/i18n.md:246` rule 3 now says the MT notice sits directly under the AI notice **in the same article header**, and explains that B6 already lists the MT banner in that header. D5 was revised in `main` to say the same. |
| m5 | Dot-segment check missed backslashes, tabs and newlines | **Fixed** | `UNSAFE_ROUTE_CHAR = /[\\\t\n\r]|%5c/i` with its own `RangeError`. My probe throws on all of `core\register/`, `core/..\..\x/`, `\core/`, `core/%5c../x/`, `core/%5C/x/`, `core/%5c%2e%2e/x/`, and the tab, LF and CR variants, plus `.`, `..`, `%2e%2e`, `%2E%2E`, `.%2E`, `%2e`. `core/.well/`, `core/..well/` and `core/%2ewell/` are still accepted, correctly. Tests cover the same set. |
| n1 | Docs claimed every `prompts.…Named` takes `{n}` and `{title}` | **Fixed** | `docs/i18n.md:83` names the five button keys and calls out `copiedNamed` as taking only `{n}`. |
| n2 | `formatNumber` JSDoc said rounding works on the stored binary value | **Fixed** | Now "Rounding is half away from zero on the number as written". |
| n3 | `basePath('//')` returned `//`; backslash path could leave the site | **Mostly fixed** | `basePath('//')`, `('///')` and `('')` all return `/`; `href('en','\evil.test/','/')` → `/evil.test/`. The base-argument backslash case remains — see n1 above. |
| n4 | Small wording mismatches in `trust` | **Fixed** | `seeHowMade` now "See how this guide was made"; `fact.sourceNamed` now "Source for this fact"; the "yet" in `aiCheckedMeans` is gone (moved to the body); AF `noPageSources` now "geen eie bronne"; AF `mtNotice.body` now uses "Geen mens", matching the notices. |
| n5 | Optional rewording of the checklist and template reminders | **Applied** | Both took the suggested wording, and `templateRulesChecked` gained its agent: "An AI checked the legal rules for what this document must show on {date}." |
| n6 | Repetition on an AF page; suggested a date-less status key | **Applied** | The status labels carry no date (`docs/i18n.md:228`: "No date: the notice body right before it has the date"). Residual density is m3 above. |
| — | Pass-1 note: no test pinned the AF "Engelse teks" wording | **Added** | `i18n.test.ts:616-637`. |
| P1–P3 | Backlog rows removed | **Verified** | P1: `docs/i18n.md:212` now says "it is not always the first H2"; the offset comment says "±14:00 … symmetric on purpose"; tables aligned. P2: the four prompt keys all take `{n}: {title}`; `effortLead` reworded with "The levels are only a rough guide." P3: `templates.noVatNotice` no longer contains "BTW-reël". The `backlog.md` diff removes exactly those three rows and nothing else. |

## Correctness probes

`probe-types.ts`, run with the worktree `tsc`: 19 of 20 deliberately wrong calls error. Missing keys, plural sub-forms, group keys, a missing param, a wrong param name, an extra param, a string `count`, a missing `{date}` on `trust.aiNotice.body`, a half-filled `bodyHumanChecked`, a missing `{reviewer}`, an unknown locale `zu`, the `doc.hiddenFor` union without `{types}`, `useTranslations`, `createTranslator` outside its picked groups, and `date.format` with one of three params all fail to compile, as they should. Every expected-OK call compiles.

The one that does **not** error is `t('en', 'trust.status.aiChecked', { reviewer: 'A. Person' })` — an extra parameter on a key with no placeholders. This is documented behaviour (`docs/i18n.md:67`: "Keys without placeholders accept an optional params object"), so it is not a defect; I note it only because the typing is otherwise strict enough that a reader might assume the opposite. (A `signDisplay` error on `index.ts:461` appeared in this probe only because I compiled it standalone with a default lib; the project's own `tsc --noEmit -p .` is clean.)

`probe-runtime.mts`: 0 expectation failures. Highlights beyond the findings above — `formatDate` handles the SAST boundary exactly (`22:00:00Z` rolls to the 14th, `21:59:59Z` does not), rejects `+2026-09-13`, a lower-case `t` or `z`, 10 fractional digits, `+14:01`, `2026-02-29`, and both year-range escapes (`9999-12-31T22:00:00Z`, `1900-01-01T00:30:00+05:00`); `formatNumber(1e21)` prints in full rather than in exponential form; `formatRand` throws just above `MAX_RAND_AMOUNT` and accepts the boundary; parameter values containing `{title}` are not re-read, and a `__proto__` key in the params object does not pollute (`Object.hasOwn` guard). `alternateUrls` and `switchLocaleUrl` behave identically across bases `/`, `/business-toolkit`, `/business-toolkit/`, `//business-toolkit//` and `''`.

## Tests

Behavioural and deterministic. Fixed inputs, UTC getters only, no clock or locale dependence in assertions, and expected strings built from `\u00a0` rather than pasted. The `@ts-expect-error` lines are live because `tsc --noEmit -p .` exits 0, and that check is now inside `gate:fast`.

**Label-length exceptions** — all five have a real reason and all five are genuinely required (I recomputed each against the 1.6× and ≥5-character rule):

| Key | EN / AF lengths | Trips the rule? | Reason sound? |
|---|---|---|---|
| `common.reset` | 5 / 10 | yes (10 > 8, +5) | Yes. "Stel terug" is the ordinary term. |
| `businessTypes.retail-online.short` | 6 / 11 | yes (11 > 9.6, +5) | Yes. No shorter Afrikaans word for retail. |
| `templates.items.privacy-notice.name` | 14 / 24 | yes (24 > 22.4, +10) | Yes. Standard POPIA term. |
| `trust.status.aiChecked` | 10 / 26 | yes (26 > 16, +16) | Yes as written — but the reason ("must say the English text was checked") is exactly what m3 argues is redundant in this slot. Taking m3 removes the exception. |
| `trust.status.humanChecked` | 21 / 37 | yes (37 > 33.6, +16) | Same. |

The "has no stale exceptions" test means none of these can silently outlive its reason, which is the right guard.

## Docs

`docs/i18n.md` matches the code. The trust table covers every key in the group; the placement and order rules (`:240-253`) state the notice position, the internal order label → body → status → explanation → link, and the Afrikaans notice-then-MT order, all consistent with the revised D5 and with B6. The documented `trust.fact.checked` exception (`:235`) matches both the strings and the test that deliberately excludes it. The `current` contract table for `switchLocaleUrl` is accurate for the forms it lists — m1 is that it does not say what happens to forms it does not list. The formatter section now matches the implementation, including the 1900–9999 range, the ±14:00 offset limit and the three-decimal default.

## Merge safety

Worktrees and branches at review time: `main` `44de8ef`, `content/af-glossary` `864f2f7`, `wp/wp12b-i18n-followup` `644ef33`, `worktree-agent-a2273231b664d89f3` `8710091` (design system), `worktree-agent-a57043a283a0c3c96` `2db7941` (content pipeline, locked), `worktree-agent-adc6b347a89c34014` `a7d71d1` (e2e/CI). Note `main` has moved since pass 1 (`017d007` → `44de8ef`); `git diff 33bf2a8 44de8ef` touches only `docs/**`, nothing this package owns.

Searched every branch tree with `git grep` over `src`, `tests` and `scripts` (not the working copies — a plain ripgrep silently skips `.claude/`, which hides three of the six worktrees).

| Branch | Uses `doc.sourcesForPage` / `doc.verifiedOn`? | Imports `LOCALES` from `lib/paths`? | merge-tree against `644ef33` |
|---|---|---|---|
| `main` `44de8ef` | Base copies in `src/i18n/*` only, no consumer | No | Clean |
| design system `8710091` | No | No — it defines its own pre-WP-12 `src/lib/paths.ts` `LOCALES`, and imports only `href` | Clean |
| content pipeline `2db7941` | Base copies only, unmodified | No | **CONFLICT: `package.json`** |
| e2e/CI `a7d71d1` | No | No — same pre-WP-12 `paths.ts` | **CONFLICT: `astro.config.ts`** (`package.json` auto-merges) |
| af-glossary `864f2f7` | No | No — same pre-WP-12 `paths.ts` | **CONFLICT: `package.json`** |

No branch consumes the removed keys or the removed `paths.ts` `LOCALES` export, so this package breaks nothing. Two notes for the orchestrator: the `astro.config.ts` conflict with `a7d71d1` is **not** caused by WP-12b — this branch does not touch that file; `a7d71d1` predates WP-12 and still carries the pre-WP-12 `src/lib/paths.ts` and `astro.config.ts`, so it will conflict with `main` whether or not WP-12b lands. And the design-system branch is the one whose merge-checklist item depends on this package, for the D5 notice and sources demos on `/design-system/` using the `trust.*` strings.

### The `gate:fast` line

This branch (`644ef33`), exact:
```
"gate:fast": "pnpm lint && pnpm typecheck && tsc --noEmit -p . && pnpm test && pnpm test:content",
```
For comparison, committed on the other branches:
```
44de8ef (main)   "pnpm lint && pnpm typecheck && pnpm test && pnpm test:content"
8710091 (design) "pnpm lint && pnpm typecheck && pnpm test && pnpm test:content"
a7d71d1 (e2e)    "pnpm lint && pnpm typecheck && pnpm test && pnpm test:content"
2db7941 (content pipeline) "pnpm lint && pnpm typecheck && pnpm test && pnpm content:drift && pnpm test:content"
864f2f7 (af-glossary)      "pnpm lint && pnpm typecheck && pnpm test && pnpm content:drift && pnpm test:content"
```
The combined line, keeping both additions in the order the merge checklist records:
```
"gate:fast": "pnpm lint && pnpm typecheck && tsc --noEmit -p . && pnpm test && pnpm content:drift && pnpm test:content",
```
This matches what `WP-12b-pass1.md` proposed and what `merge-checklist.md:37` already commits the orchestrator to.
