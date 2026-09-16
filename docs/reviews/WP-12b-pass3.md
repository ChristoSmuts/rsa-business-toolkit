# WP-12b review, pass 3 (REVIEWER-L)

- Package: WP-12b, i18n follow-up (trust strings for AI disclosure and sources, plus WP-12 pass 3 P1–P3 and pass 4 m1–m5 and nits)
- Branch: `wp/wp12b-i18n-followup`, worktree `C:\_Projects\Local\bt-wt\wp12b`
- HEAD `ed18d52abd58f7ce480b088c6991f080e747095a` = `ed18d52` (confirmed, not moved), base `33bf2a85e3b55ed498796e3a319a0d8a7d78394e` = `33bf2a8`. Worktree clean.
- Commits on the branch: `ff42c75`, `ff3a9b8`, `6eaaa54`, `d3e32de`, `644ef33`, `ed18d52`
- Reviewer: REVIEWER-L, independent of pass 1 (REVIEWER-I) and pass 2 (REVIEWER-K). I drafted my own findings and wrote them to scratch **before** opening `WP-12b-pass1.md` and `WP-12b-pass2.md`.
- Date: 2026-09-16
- Scope: the whole diff `33bf2a8...ed18d52` reviewed fresh, not only the pass-2 fixes.

## Verdict: NOT CLEAN

| Severity | Count |
|---|---|
| blocker | 0 |
| major | 1 |
| minor | 3 |
| nit | 3 |

The package is close. Every command I ran is green, coverage improved on pass 2 to 100% of statements and lines, and the honesty work has genuinely landed: all four notice sequences (EN and AF, AI-checked and human-checked) are coherent, non-contradictory and no longer repetitive. Pass 1's M1 and m1–m5, and pass 2's M1 and m1–m3, are all properly resolved.

The one major is not in the strings a reader sees. It is in `docs/i18n.md`, which now asserts a property of the Afrikaans strings that is **false**, contradicts its own table twenty-five lines earlier, and misdescribes what the enforcing test does. Left as is, the next author who trusts that sentence will "fix" the two status labels and re-open pass 2's m3.

The two Afrikaans minors are regressions introduced by the last round: both changed a correct or attested word to an incorrect or unattested one, on pass-2 advice whose linguistic premise was wrong in each case.

## Commands

Run in the worktree at `ed18d52`, one at a time, in the foreground. **The machine was heavily contended throughout** — another agent was running browser suites, and shell startup alone took several minutes per invocation.

### What I ran and what I did not

I ran and captured: `pnpm lint`, `pnpm typecheck`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, and the coverage run. All exit 0.

**I did not re-run `pnpm build` or `pnpm gate:fast`.** `gate:fast` on this branch is `pnpm lint && pnpm typecheck && tsc --noEmit -p . && pnpm test && pnpm test:content`. I had already captured the first four green on this exact SHA, and `test:content` has no test files on this branch (`vitest --project content --passWithNoTests`, `tests/content/**` does not exist here). Re-running it on a contended machine would have bought a low-information confirmation at high cost. CI runs the full gate on Ubuntu. Passes 1 and 2 both recorded `build` and `gate:fast` exit 0 on earlier SHAs of this branch, and nothing in `ed18d52` touches the build.

`pnpm lint` (exit 0)
```
$ eslint . && prettier --check . && stylelint "src/**/*.{css,astro}" --allow-empty-input
Checking formatting...
All matched files use Prettier code style!
EXIT lint = 0
```

`pnpm typecheck` (exit 0)
```
$ astro check
07:17:50 [types] Generated 109ms
07:17:50 [check] Getting diagnostics for Astro files in C:\_Projects\Local\bt-wt\wp12b...
Result (21 files):
- 0 errors
- 0 warnings
- 0 hints
EXIT typecheck = 0
```

`pnpm exec tsc --noEmit -p .` (exit 0, silent)
```
EXIT tscproject = 0
```
Because `tsc` exits 0, every `@ts-expect-error` in `tests/unit/i18n.test.ts` is still live, including the union and trust-key checks.

`pnpm test` (exit 0)
```
$ vitest run --project unit --project dom --passWithNoTests
 RUN  v5.0.1 C:/_Projects/Local/bt-wt/wp12b
 Test Files  4 passed (4)
      Tests  145 passed (145)
   Start at  07:26:27
   Duration  96.91s (tests 95%, transform 4%, import 1%)
EXIT test = 0
```
145 tests, up from 138 at pass 2 and 133 at pass 1. The seven new ones are the "names the checker" suite (two tests per dictionary locale, so four), the out-of-base `routeFromPath` test, and the extra `paths`/`i18n-routes` cases.

Coverage (`pnpm exec vitest run --project unit --coverage --coverage.include=src/i18n/**/*.ts --coverage.include=src/lib/**/*.ts`, exit 0)
```
 Test Files  4 passed (4)
      Tests  145 passed (145)
   Start at  07:32:32
   Duration  97.03s (tests 95%, transform 4%, import 1%, worker 1%)

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
EXIT coverage = 0
```
Better than pass 2 (99.53% stmts / 99.47% lines / 97.17% branches). Note `paths.ts` moved from 95.83% statements with line 45 uncovered to **100%**, which confirms pass 2's n2 is genuinely closed: the out-of-base `stripBase` branch is now exercised by the new test "keeps a path from outside the base as its own route, by design". The four remaining uncovered branches are benign fallbacks: `index.ts:303` and `i18n-routes.ts:125` are the `?? locale` paths for an unknown code, `index.ts:368` a `mergeWithFallback` branch, `paths.ts:18` the `import.meta.env.BASE_URL ?? '/'` default.

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
All inside owned paths. `src/i18n/locales.ts` is owned but unchanged. The `package.json` change touches only `gate:fast` (verified in the diff hunk). `docs/reviews/backlog.md` removes exactly the three WP-12 P1–P3 rows, leaving a valid empty table.

### Not executed

The correctness probes and the TZ-varied run **were not executed**. I wrote three probe scripts and a probe tsconfig, and two separate runner attempts (Git Bash and PowerShell) both stalled in shell startup for many minutes without producing a single line. Rather than spend more budget rediscovering the same stall, I stopped. The scripts are left ready to run in one command in `scratchpad/wp12b-pass3/`:

- `probe-names-checker.mjs` — transcribes the test's `CLAIM`/`AGENT`/`NOT_A_CLAIM`/sentence-split logic verbatim and runs it against mutated dictionaries; step 0 self-validates the transcription by requiring zero offenders on the unmutated files.
- `probe-runtime.mjs` — `assertSafePath` across both helpers, `basePath`, `href`, `routeFromPath`, `formatDate`, `formatNumber`, plurals.
- `probe-types.ts` + `tsconfig.probe.json` — 21 deliberately wrong call shapes that must fail `tsc`, plus 12 that must compile.
- `finish.sh` — runs all of the above plus the git checks and the PowerShell TZ run in one invocation.

The next reviewer should run these before granting a clean pass. **This is a real gap in this pass** and I am not claiming otherwise: brief items 4 and 5 are unverified by execution. My analysis of the test below is from reading the source, not from running it, and is labelled as such.

## Honesty audit

### What a reader sees

**EN, AI-checked page with page sources** (label, body, status, explanation, link — the order `docs/i18n.md` rule 2 now makes binding):

> **About this page** · Written by AI (Claude, Anthropic). An AI checked it against the sources below on 13 September 2026. No person has checked it yet. Rules change: check the official source before you act. Not legal, tax or financial advice. · **AI-checked** · An AI compared the facts on this page with the sources. An AI can miss mistakes. · *How this was made*

**EN, human-checked page with page sources:**

> **About this page** · Written by AI (Claude, Anthropic). A. Person checked it against the sources below on 1 March 2027. Rules change: check the official source before you act. Not legal, tax or financial advice. · **Checked by A. Person** · A. Person checked the facts on this page against the sources. Mistakes are still possible, and rules can change after that date. · *How this was made*

**AF, AI-checked page, with the machine-translation notice directly under it:**

> **Oor hierdie bladsy** · Deur KI geskryf (Claude, Anthropic). ’n KI het die Engelse teks op 13 September 2026 teen die bronne hieronder nagegaan. Geen mens het dit nog nagegaan nie. Reëls verander: kontroleer die amptelike bron voordat jy iets doen. Dit is nie regs-, belasting- of finansiële advies nie. · **KI-nagegaan** · ’n KI het die feite in die Engelse teks met die bronne vergelyk. ’n KI kan foute oorsien. · *Hoe dit gemaak is*
> **Masjienvertaling** · ’n KI het hierdie bladsy uit Engels vertaal. Geen mens het die vertaling nog nagegaan nie. As iets nie duidelik is nie, lees die Engelse weergawe.

**AF, human-checked page, with the machine-translation notice directly under it:**

> **Oor hierdie bladsy** · Deur KI geskryf (Claude, Anthropic). A. Person het die Engelse teks op 1 Maart 2027 teen die bronne hieronder nagegaan. Reëls verander: kontroleer die amptelike bron voordat jy iets doen. Dit is nie regs-, belasting- of finansiële advies nie. · **Deur A. Person nagegaan** · A. Person het die feite in die Engelse teks teen die bronne nagegaan. Foute is steeds moontlik, en reëls kan ná daardie datum verander. · *Hoe dit gemaak is*
> **Masjienvertaling** · ’n KI het hierdie bladsy uit Engels vertaal. Geen mens het die vertaling nog nagegaan nie. As iets nie duidelik is nie, lees die Engelse weergawe.

**Coherent, non-contradictory, not repetitive? Yes, all four.** The hard case is the last: a named person checked the English, and the MT notice still says no person has checked the translation. Both are true at once and the wording keeps them apart cleanly. In the AF AI-checked case "Geen mens het dit nog nagegaan nie" attaches unambiguously to "die Engelse teks", and the MT notice makes the separate statement about the translation. I could not construct a page state in which the four strings contradict one another.

On repetition specifically: pass 2's m3 fix worked. The Afrikaans header now states the English-text qualifier **twice** (notice body, then explanation) rather than three times, and the status label carries no date. That is the right number: the body carries agent + date + qualifier, and the explanation carries what the check actually was. Dropping it from the explanation as well would re-open pass 1's M1.

### Does every string name who checked?

Yes, in every string a reader sees. `trust.aiNotice.body` says "An AI checked it"; `trust.fact.checked` is "AI-checked {date}"; `trust.templateRulesChecked` and `trust.unverified.body` both start with "An AI". Nothing reads as a human check. The human-checked variants name the reviewer and are documented as reserved for a named human expert (ADR 0006 point 5).

### The three justifications the last round relied on

The brief asked me to judge the strings pass 2 deliberately left, on the grounds that they are filters, per-entry labels, or descriptions of what the check was made against.

1. **Filters** (`sources.officialOnly` "Official sources only", `checklist.filters.*`) — **holds**. A filter names a subset; it makes no universal claim about the corpus.
2. **Per-entry labels** (`trust.sources.officialLabel`, `trust.sources.externalLink` vs `externalLinkOther`, `a11y.officialSource`) — **holds**. These render per entry, only where the entry is official, and this package added `externalLinkOther` precisely so a non-official link is not announced as official. One residual risk for the page package, not a finding here: `home.threeNumbers.officialSource` / `officialSourceFor` are hard-wired to "Official source" on the home stat cards, so if a stat's source is ever not official the label will be wrong. `trust.fact.source` is the neutral variant to use there.
3. **"What the check was made against"** (`trust.aiNotice.bodyNoPageSources` and the wider "against official sources" family) — **holds only narrowly, and I am raising it as m3.** Pass 1 raised this as m1; pass 2 accepted the author's justification. Having read both, I land between them. The sentence is defensible as a description of the *standard* the check aimed at: ADR 0006 point 4 says reviewers check each fact "against an official source", and the register document subordinates secondary sources explicitly ("treated as a pointer to the official source, not as authority"). But two facts cut the other way. ADR 0006's own Context records that only "about a third of the source register entries are official sources", and the accuracy-review phase that would make the claim true **has not run** — `merge-checklist.md` still lists "Start the accuracy review phase (build plan P4a)" as pending under WP-10. So on a page that lists no sources of its own, the reader is told the check was against official sources, with nothing on the page to check and a register that is two-thirds not official. Concrete replacement wording is in m3.

### `trust.fact.checked`, and the documented exception

The Afrikaans `trust.fact.checked` is "KI-nagegaan op {date}" with no "Engelse teks". The author documented this at `docs/i18n.md` as the one deliberate carve-out and excluded it from the enforcing test. **I accept it**, for the reasons pass 2 gave: it labels a figure, `content:fidelity` keeps digits byte-identical between the trees, it names the agent so it cannot read as a human check, and the notice carrying the qualifier sits directly above. Documenting a carve-out and excluding it explicitly from the test is the right way to record a deliberate decision.

The related wrinkle pass 2 logged as n5 — that on a human-checked page the inline chip still reads "AI-checked" — is correct behaviour and correctly documented (`docs/i18n.md` now carries the sentence about the chip not changing on a human-checked page). Worth one line in the page-package brief so the two are kept visually distinct.

### Would a reader understand it, and know what to do?

Yes, provided the placement rule is honoured, and this package now makes it binding rather than optional: `docs/i18n.md` rule 2 puts the status and its explanation inside the notice, directly after the body, "Never move them elsewhere". "AI-checked" alone is a two-word chip a lay reader could take as a quality seal; what rescues it is `aiCheckedMeans` sitting immediately after it, always visible, never a tooltip. What to do next is stated in plain words twice: "check the official source before you act", and for an unverifiable fact "ask the office that is responsible for it, for example SARS or CIPC".

Tone is calm and plain throughout. No exclamation marks, no jargon, short sentences.

## Afrikaans quality

Register is consistently "jy". `’n` is always U+2019 (the text-rule test forbids straight quotes, so this cannot regress). Diacritics are correct throughout: reëls, finansiële, lêer, ná, kliënt, Tshivenḓa. Fixed terms all hold: **KI**, KI-nagegaan, nagegaan, **BTW** (never "VAT" in prose; a test enforces it), eenmansaak/eenmansake, kontrolelys, Hoofkontrolelys, sjabloon/sjablone, bron/bronne, amptelike, bronneregister, nie bevestig nie, woordelys, opdrag, merkie, toestel, regsgeleerde, Nutsgoed. Double negation is correct in every string I read.

### Specifically checked, and **not** defects

- **"hulle" versus "dit"** (changed last round on pass-2 advice). `site.disclaimerLong` and `home.heroVerify` now use "hulle", whose antecedent is a plural list ("die fooie, drempels, vormnommers en wetlike reëls" / "die feite"). That is correct and matches the English "them". `trust.aiNotice.body*` use "dit", whose antecedent is the singular "die Engelse teks". Also correct. The distinction is applied consistently in both directions — this is a genuine improvement, and pass 2 flagged it with appropriately low confidence.
- **The two status labels.** "KI-nagegaan" and "Deur {reviewer} nagegaan" are correct Afrikaans, parallel in shape, and match the terminology table ("AI-checked → KI-nagegaan"). Both label-length exceptions were correctly deleted, and the "has no stale exceptions" test would have caught it if they had not been. I recomputed: EN 10 / AF 11 and EN 21 / AF 24, neither now trips the 1.6× and +5 rule.
- **Privacy "item" versus invoice "reël".** The privacy list now uses "item" while invoice lines keep "reël". This is a deliberate disambiguation ("reëls" also renders *rules* elsewhere in the same dictionary, as in "Reëls verander" and "wetlike reëls") and it reads better in Afrikaans. Defensible.
- **Label lengths** of every string the last round changed: `site.footerLabel` EN 11 / AF 15, `templates.privacy.addListItem` EN 10 / AF 15, both pass. `home.trust.checked` EN is 33 characters so it is not a label and is not checked; its Afrikaans shortening to "Engelse teks op {date} deur KI nagegaan" is a real improvement on the 57-character version pass 2 measured.

### Correction table

| Key | Current AF | Suggested | Reason | Confidence |
|---|---|---|---|---|
| `site.footerLabel` **m1** | Webwerfvoetstuk | Webwerfvoetskrif (revert) or Werfvoetreël | "Voetstuk" is a *pedestal or base*. The Afrikaans computing glossary (Ubuntu WAITT) gives **footer = "voetreël, voetskrif"** and lists no "voetstuk". Pass 2's premise, that "voetskrif" is only a footnote, was too strong: it is attested for *footer*. This is the accessible name of the footer landmark, so a screen-reader user hears the wrong word. | Medium |
| `wizard.types.help` **m2** | Kies almal wat pas. | Kies alles wat pas. (revert) or Kies al die soorte wat pas. | **"almal" refers to people; "alles" refers to things.** The referent here is "soorte besigheid", so the pre-change "alles" was correct. Pass 2's premise, that "alles" is a mass noun unsuitable for a countable referent, inverts the actual distinction. As an imperative with no antecedent in the same sentence, "Kies almal wat pas" reads as "choose everyone who fits". | High |
| `templates.privacy.listHint` **n3** | Voeg items by of haal items uit sodat dit waar is vir jou besigheid. | Voeg items by of verwyder items sodat dit waar is vir jou besigheid. | The buttons beneath say "Verwyder item". "Haal ... uit" introduces a third verb for the same action in the same block. | Low |
| `templates.amountDue` (pre-existing, not this package) | Verskuldig | Bedrag verskuldig | EN "Amount due" is a noun phrase; the Afrikaans is a bare adjective. Predates the branch; listed for the backlog only. | Low |

## Findings

### major: M1. `docs/i18n.md` states a property of the Afrikaans strings that is false, contradicts its own table, and misdescribes the test

File: `docs/i18n.md` (the "AI disclosure and sources (`trust`)" section, the paragraph beginning "Every Afrikaans")
Acceptance item: "`docs/i18n.md` accurately describes the trust group"; build plan D5; pass 2's m3, which this package implemented

What is wrong: the document says

> Every Afrikaans `trust.aiNotice.body*`, `trust.status.*` and `trust.status.*Means` string says "Engelse teks". None of them say that the facts "op hierdie bladsy" were checked, because that would claim the translation was checked. A test in `tests/unit/i18n.test.ts` enforces this.

`trust.status.*` includes `trust.status.aiChecked` and `trust.status.humanChecked`. Neither says "Engelse teks" — they are "KI-nagegaan" and "Deur {reviewer} nagegaan". So the sentence is false as written. Worse, it contradicts the table row twenty-five lines earlier in the same document, which says of exactly those two keys: "No date, and in Afrikaans no *Engelse teks*: the notice body right before it and the explanation right after it both carry the date and the qualifier, and stating it three times in one header reads as anxious rather than careful."

It also misdescribes the test. `tests/unit/i18n.test.ts` asserts `toContain('Engelse teks')` over exactly six strings — the four `aiNotice.body*` and the two `status.*Means` — and then asserts the **opposite** for the two labels:

```ts
expect(t('af', 'trust.status.aiChecked')).toBe('KI-nagegaan');
expect(t('af', 'trust.status.humanChecked', { reviewer })).toBe('Deur A. Person nagegaan');
```

Why this is major rather than minor: the sentence is new in this round, it is the summary a future author will read, and acting on it re-opens pass 2's m3 (the over-correction finding) and invalidates the two `LABEL_LENGTH_EXCEPTIONS` entries this round correctly deleted. A documentation line that instructs a future author to undo a reviewed fix is a maintainability defect, and the ownership rule puts `docs/i18n.md` squarely in this package.

How to reproduce: read the two passages in `docs/i18n.md` side by side, then `node -e "const a=require('C:/_Projects/Local/bt-wt/wp12b/src/i18n/af.json');console.log(a.trust.status.aiChecked,'|',a.trust.status.humanChecked)"`.

Suggested fix: replace `trust.status.*` with `trust.status.*Means` in that sentence, so it reads "Every Afrikaans `trust.aiNotice.body*` and `trust.status.*Means` string says *Engelse teks*", and add one clause: "The two short status labels deliberately do not, because the body directly above them and the explanation directly below them both carry it."

### minor: m1. Afrikaans footer landmark name changed to an unattested word

File: `src/i18n/af.json` (`site.footerLabel`)
Acceptance item: Afrikaans terminology; accessible names

What is wrong: the last round changed "Webwerfvoetskrif" to "Webwerfvoetstuk" on pass 2's n3 advice. "Voetstuk" in Afrikaans is a *pedestal or base*, as of a statue or column. The Afrikaans computing glossary maintained by the Ubuntu Afrikaans translators gives **footer = "voetreël, voetskrif"** (and "loopvoet"), and does not list "voetstuk" at all. Pass 2's reasoning — that "voetskrif" is a footnote rather than a page footer — is true of general usage but too strong for computing usage, where "voetskrif" is attested for *footer*. The change therefore replaced an attested term with an unattested one. Because this string is the accessible name of the footer landmark, a screen-reader user navigating by landmark hears it.

How to reproduce: `node -e "console.log(require('C:/_Projects/Local/bt-wt/wp12b/src/i18n/af.json').site.footerLabel)"`.
Suggested fix: revert to "Webwerfvoetskrif", or use "Werfvoetreël". Both stay inside the label-length rule (EN "Site footer" is 11 characters; 15 and 12 respectively, against a 17.6 ceiling).

### minor: m2. "Kies almal wat pas" uses the people word for a list of business types

File: `src/i18n/af.json` (`wizard.types.help`)
Acceptance item: Afrikaans grammar and register

What is wrong: the last round changed "Kies alles wat pas" to "Kies almal wat pas" on pass 2's n3 advice, which asserted that "alles is a mass noun" unsuitable for a countable referent. That inverts the actual Afrikaans distinction: **"almal" refers to people ("everyone"), "alles" refers to things ("everything")**. The referent here is "soorte besigheid" — kinds of business, not persons. As an imperative whose antecedent sits in the preceding question rather than the same sentence, "Kies almal wat pas" reads to a first-language speaker as "choose everyone who fits". The English is "Choose all that fit."

How to reproduce: `node -e "console.log(require('C:/_Projects/Local/bt-wt/wp12b/src/i18n/af.json').wizard.types.help)"`.
Suggested fix: revert to "Kies alles wat pas.", or use the unambiguous "Kies al die soorte wat pas." Both satisfy the text rules and the length rule.

### minor: m3. The "against official sources" family overstates what was checked, while the accuracy review is still pending

File: `src/i18n/en.json` and `src/i18n/af.json` — `trust.aiNotice.bodyNoPageSources`, `site.checkedOn`, `site.disclaimerShort`, `site.disclaimerLong`, `home.heroVerify`, `about.aiSummary`
Acceptance item: build plan D5, "Nothing implies more certainty than the source"; ADR 0006 Context and point 4

What is wrong: six strings tell the reader the facts were checked "against official sources" / "teen amptelike bronne". ADR 0006's own Context records that "About a third of the source register entries are official sources", and its point 4 accuracy review — the phase that would make a per-fact official-source check true — **has not run**; `merge-checklist.md` still lists it as pending work under WP-10. `trust.aiNotice.bodyNoPageSources` is the sharpest case, because it renders on pages that list no sources at all, including the sources register itself, so the reader has nothing on the page against which to test the claim. Pass 1 raised this as m1 and proposed register-based wording; pass 2 accepted the author's counter-argument that the sentence describes what the check was made against rather than what the page lists. That argument has force, but it does not survive the combination of a two-thirds-unofficial register and an unstarted review phase.

This is minor, not major, because the strings name the agent, carry a date, and tell the reader to check the official source before acting — so no reader is led to believe a person verified anything.

How to reproduce:
```
node -e "const e=require('C:/_Projects/Local/bt-wt/wp12b/src/i18n/en.json');console.log(e.trust.aiNotice.bodyNoPageSources,'|',e.site.checkedOn,'|',e.site.disclaimerShort)"
```

Suggested fix — exact replacement text for each key. All keep the same `{param}` names, add no digits outside placeholders, and keep "Engelse teks" in every Afrikaans string so the existing test still passes.

| Key | Proposed EN | Proposed AF |
|---|---|---|
| `trust.aiNotice.bodyNoPageSources` | Written by AI (Claude, Anthropic). An AI checked it on {date} against the sources in the sources register, where official sources are marked. No person has checked it yet. Rules change: check the official source before you act. Not legal, tax or financial advice. | Deur KI geskryf (Claude, Anthropic). ’n KI het die Engelse teks op {date} nagegaan teen die bronne in die bronneregister, waar amptelike bronne gemerk is. Geen mens het dit nog nagegaan nie. Reëls verander: kontroleer die amptelike bron voordat jy iets doen. Dit is nie regs-, belasting- of finansiële advies nie. |
| `site.checkedOn` | An AI checked the facts against the sources in the sources register on {date}. | ’n KI het die feite in die Engelse teks op {date} teen die bronne in die bronneregister nagegaan. |
| `site.disclaimerShort` | Written by AI, and checked by AI against the sources in the sources register. Not legal, tax or financial advice. | Deur KI geskryf. ’n KI het die Engelse teks teen die bronne in die bronneregister nagegaan. Nie regs-, belasting- of finansiële advies nie. |
| `site.disclaimerLong` | An AI assistant (Claude, made by Anthropic) wrote this guide. An AI checked the fees, thresholds, form numbers and legal rules against the South African sources in the sources register, where official ones are marked. No person has checked them. AI can still be wrong, and rules change often. Before you pay, sign or file something, open the official link and check the number yourself. This is general information. It is not legal, tax or financial advice. | ’n KI-assistent (Claude, gemaak deur Anthropic) het hierdie gids geskryf. ’n KI het die fooie, drempels, vormnommers en wetlike reëls in die Engelse teks nagegaan teen die Suid-Afrikaanse bronne in die bronneregister, waar amptelike bronne gemerk is. Geen mens het hulle nagegaan nie. KI kan steeds foute maak, en reëls verander dikwels. Maak die amptelike skakel oop en kontroleer die getal self voordat jy iets betaal, teken of indien. Dit is algemene inligting. Dit is nie regs-, belasting- of finansiële advies nie. |
| `home.heroVerify` | Written by AI. An AI checked the facts against the sources in the sources register on {date}. No person has checked them yet. Check the official link before you pay or sign. | Deur KI geskryf. ’n KI het die feite in die Engelse teks op {date} teen die bronne in die bronneregister nagegaan. Geen mens het hulle nog nagegaan nie. Kontroleer die amptelike skakel voordat jy betaal of teken. |
| `about.aiSummary` | An AI assistant (Claude, made by Anthropic) wrote this guide. It checked fees, thresholds, form numbers and legal rules against the South African sources in the sources register, where official ones are marked. No lawyer, accountant or tax practitioner reviewed it. Check the official link before you act. | ’n KI-assistent (Claude, gemaak deur Anthropic) het hierdie gids geskryf. Dit het die fooie, drempels, vormnommers en wetlike reëls in die Engelse teks nagegaan teen die Suid-Afrikaanse bronne in die bronneregister, waar amptelike bronne gemerk is. Geen regsgeleerde, rekenmeester of belastingpraktisyn het dit nagegaan nie. Kontroleer die amptelike skakel voordat jy iets doen. |

Once ADR 0006's accuracy review has run and every fact genuinely has an official source, these can go back to the stronger wording.

### nit: n1. "A source for every fact" is still a universal per-fact claim

File: `src/i18n/en.json`, `src/i18n/af.json` (`home.trust.sources`, `nav.toolDescriptions.sources`)
The last round fixed the worse version ("An official link for every fact") and the current text is much better. But "A source for every fact, and official ones are marked" and "The source behind every fact" still promise per-*fact* coverage, whereas D5's build gate is per-*page* ("the build fails if a guide, template, checklist or business-type page has no mapped sources") and the per-fact inventory is ADR 0006 point 4, not yet run. Consider "A source for every page, and official ones are marked" until the fact inventory exists.

### nit: n2. The worktree's own D5 is the pre-revision text, while `docs/i18n.md` cites the revised one

File: `docs/build-plan.md` (not owned by this package) versus `docs/i18n.md`
`docs/i18n.md` says its placement rules "follow D5 in `docs/build-plan.md` (revised after WP-12b review pass 1)". The copy of `docs/build-plan.md` in this worktree is still the **old** D5: it has "Checked against the sources below on {date}" with no agent, no "No person has checked it yet", and no placement rule for the status or the MT notice. `main` has the revised D5. Because this branch does not touch `docs/build-plan.md`, the merge takes main's revised version and the inconsistency resolves itself — so this is not a merge hazard. It is only a trap for anyone reading D5 inside this worktree, where the plan and the shipped strings disagree. No action needed beyond awareness; rebasing on current `main` would clear it.

### nit: n3. Afrikaans polish in the privacy list hint

File: `src/i18n/af.json` (`templates.privacy.listHint`)
"Voeg items by of haal items uit" uses a third verb for an action the buttons call "Verwyder item". See the correction table.

## Verification of passes 1 and 2

### Pass 1 (REVIEWER-I)

| Id | Pass-1 finding | Status at `ed18d52` | Evidence |
|---|---|---|---|
| M1 | AF status explanations claimed the facts "op hierdie bladsy" were checked | **Fixed** | `trust.status.aiCheckedMeans` = "’n KI het die feite **in die Engelse teks** met die bronne vergelyk. ’n KI kan foute oorsien."; `humanCheckedMeans` likewise. A test asserts every AF `aiNotice.body*` and `status.*Means` contains "Engelse teks" **and** `not.toContain('op hierdie bladsy')`. |
| m1 | "Checked…" named no agent; docs let the status sit apart from the notice | **Fixed** | EN body is now "An AI checked it against the sources below on {date}"; `trust.fact.checked` is "AI-checked {date}". Placement is binding: `docs/i18n.md` rule 2, "Never move them elsewhere", and D5 in `main` was revised to match. The `bodyNoPageSources` half I re-raise as m3, on new grounds (the accuracy review is still unstarted). |
| m2 | `trust.unverified.body` gave no action | **Fixed** | "An AI could not confirm this in an official source. Before you act, ask the office that is responsible for it, for example SARS or CIPC." AF mirrors it; the "so" anglicism is gone. |
| m3 | `humanCheckedMeans` had no hedge | **Fixed** | "Mistakes are still possible, and rules can change after that date." / "Foute is steeds moontlik, en reëls kan ná daardie datum verander." Both now name `{reviewer}` rather than a generic "An expert". |
| m4 | Documented placement conflicted with B6 | **Fixed** | `docs/i18n.md` rule 3 puts the MT notice directly under the AI notice **in the same article header**, and explains that B6 already lists the MT banner in that header. |
| m5 | Dot-segment check missed backslashes, tabs, newlines | **Fixed** | `UNSAFE_ROUTE_CHAR = /[\\\t\n\r]|%5c/i` with its own `RangeError`, inside the shared `assertSafePath`. Tests cover `core/..\..\x/`, `core\register/`, `\core/`, `core/%5c../x/`, `core/%5C/x/`, and the tab, LF and CR variants, plus `.`, `..`, `%2e%2e`, `.%2E`. `core/.well/` and `core/%5b/` still accepted. **Read-verified, not probe-verified this pass.** |
| n1 | Docs claimed every `prompts.…Named` takes `{n}` and `{title}` | **Fixed** | The doc names the five button keys and calls out `copiedNamed` as taking only `{n}`. |
| n2 | `formatNumber` JSDoc said rounding works on the stored binary value | **Fixed** | Now "Rounding is half away from zero on the number as written". |
| n3 | `basePath('//')`; backslash path could leave the site | **Fixed** | `basePath` strips `[/\\]+` at both ends; `href` strips leading `[/\\]+`. Tests cover `basePath('//')`, `('///')`, `('\\business-toolkit\\')`, `href('en','\\evil.test/','/')`. |
| n4 | Small wording mismatches in `trust` | **Fixed** | `seeHowMade` "See how this guide was made"; `fact.sourceNamed` "Source for this fact"; the "yet" moved into the body; AF `noPageSources` "geen eie bronne"; AF `mtNotice.body` uses "Geen mens". |
| n5 | Optional rewording of the checklist and template reminders | **Applied** | Both took the suggested wording; `templateRulesChecked` gained its agent. |
| n6 | Repetition on an AF page | **Applied** | Status labels carry no date. Residual density was pass 2's m3, now also fixed. |
| P1–P3 | WP-12 backlog rows | **Verified** | `docs/i18n.md` says "it is not always the first H2"; the offset comment says "±14:00 … symmetric on purpose"; tables aligned; the four prompt keys take `{n}: {title}`; `effortLead` reworded; `templates.noVatNotice` no longer contains "BTW-reël". `backlog.md` removes exactly those three rows. |

### Pass 2 (REVIEWER-K)

| Id | Pass-2 finding | Status at `ed18d52` | Evidence |
|---|---|---|---|
| M1 | Three strings promised an official link for every fact | **Fixed** | All six replacements applied exactly as proposed: `home.trust.sources` → "A source for every fact, and official ones are marked" / "’n Bron vir elke feit, en die amptelike bronne is gemerk"; `nav.toolDescriptions.sources` → "The source behind every fact" / "Die bron agter elke feit"; `sources.intro` → "The sources behind the facts in this guide. Official sources are marked." / "Die bronne agter die feite in hierdie gids. Amptelike bronne is gemerk." `nav.sections.lookup.description` was also corrected to drop "official", which pass 2 did not ask for and is a good catch by the author. Residual universal-per-fact phrasing logged as n1. |
| m1 | `switchLocaleUrl` accepted shapes `alternateUrls` rejected | **Fixed** | Both helpers now call one shared `assertSafePath(raw, path, what)`. `switchLocaleUrl` passes the raw string for a string input and the normalised path for a `URL`. Tests assert both throw on the same sets with the same two messages. **Read-verified, not probe-verified.** |
| m2 | The "names the checker" test was a hard-coded eight-key allowlist | **Fixed** | Replaced by `describe.each(DICTIONARY_LOCALES)('$code names the checker')`, which derives the set from the dictionary, requires the agent in the **same sentence** as the claim (`text.split(/(?<=\.)\s+/)`), and guards non-triviality with `expect(claims.length).toBeGreaterThan(8)`. See the analysis note below. |
| m3 | AF header stated the English-text qualifier three times | **Fixed** | `trust.status.aiChecked` → "KI-nagegaan"; `trust.status.humanChecked` → "Deur {reviewer} nagegaan"; both `LABEL_LENGTH_EXCEPTIONS` entries deleted; the test narrowed to the four body strings and two `*Means` strings and now pins the two labels explicitly. `home.trust.checked` shortened to "Engelse teks op {date} deur KI nagegaan". **The summary sentence in `docs/i18n.md` was not updated to match — that is M1 above.** |
| n1 | `basePath` did not strip backslashes | **Fixed** | `raw.replace(/^[/\\]+|[/\\]+$/g, '')`, with tests. |
| n2 | `stripBase` out-of-base branch undocumented, untested, uncovered | **Fixed** | JSDoc on `routeFromPath` explains the deliberate behaviour, `docs/i18n.md` records it, a test covers it, and coverage confirms `paths.ts` is now 100% of statements. |
| n3 | Afrikaans polish, six entries | **Applied, two of them wrongly** | `a11y.newTab` → "(gaan in ’n nuwe oortjie oop)" good; "dit" → "hulle" good; privacy "reël" → "item" good. `site.footerLabel` and `wizard.types.help` were changed on faulty premises — m1 and m2 above. |
| n4 | The two status labels used different shapes | **Fixed** | Now parallel, as a side effect of m3. |
| n5 | Inline chip reads "AI-checked" on a human-checked page | **Documented** | `docs/i18n.md` carries the sentence. Correct behaviour. |

Nothing I checked regressed, other than the two Afrikaans strings in m1 and m2, which regressed *because of* pass-2 advice.

### Note on the derived "names the checker" test (read-verified only)

I could not execute my probe, so this is analysis of the source, offered for the next reviewer to confirm:

- The derivation is a real improvement over the pass-2 allowlist: the claim set comes from the dictionary, so a new agent-less string cannot ship silently.
- The same-sentence requirement is implemented by `text.split(/(?<=\.)\s+/)`, which should correctly reject an agent sitting in a neighbouring sentence. A string containing no full stop is a single sentence, so an agent anywhere in it satisfies the check — acceptable for short labels, worth knowing.
- The two allowlisted keys are genuinely words rather than claims: `common.confirm` is EN "Confirm" / AF "Bevestig", a button; `trust.unverified.label` is EN "Not confirmed" / AF "Nie bevestig nie", a negative status label. Neither English value even matches the English CLAIM pattern `/\bchecked\b/i`, so both entries are load-bearing only for Afrikaans, where `bevestig` matches. The carve-out is correctly minimal.
- **Weakness worth a future look:** the English CLAIM pattern is only `/\bchecked\b/i`. A claim phrased with *verified*, *confirmed*, *reviewed* or *compared* is invisible to it — including `trust.status.aiCheckedMeans`, "An AI compared the facts on this page with the sources", which happens to name its agent but would not be caught if it did not. The AGENT pattern also accepts a bare `\bIt\b` / `\bDit\b`. And the non-triviality guard is a fixed `> 8` against roughly seventeen actual English claim keys, so it would still pass if half the trust group were deleted. None of this is a defect in the current dictionary; it is headroom for the next change. `probe-names-checker.mjs` sections 6 to 8 are written to demonstrate each of these.

## Merge safety

Confirmed by reading the worktrees on disk. **Caveat: these are working copies, not committed tips** — my `git grep` over the tips did not execute, so the next reviewer should confirm. Pass 2 used committed tips and reached the same conclusions.

The exact `gate:fast` line on this branch:
```
"gate:fast": "pnpm lint && pnpm typecheck && tsc --noEmit -p . && pnpm test && pnpm test:content",
```

Per branch:

| Worktree / branch | `gate:fast` | Conflicts with this branch? |
|---|---|---|
| `wp/wp12b-i18n-followup` (this) | `lint && typecheck && tsc --noEmit -p . && test && test:content` | — |
| design system (`agent-a2273231b664d89f3`) | `lint && typecheck && test && test:content` | No |
| e2e/CI (`agent-adc6b347a89c34014`) | `lint && typecheck && test && test:content` | No (but it carries its own `build`/`dist:audit`/`lhci` scripts and a pre-WP-12 `astro.config.ts`, which conflicts with `main` independently of this package) |
| content pipeline (`agent-a57043a283a0c3c96`) | `lint && typecheck && test && content:drift && test:content` | **Yes — `package.json`** |
| af-glossary (`bt-wt/af-glossary`) | `lint && typecheck && test && content:drift && test:content` | **Yes — `package.json`** |

The combined line, as `merge-checklist.md` already commits the orchestrator to:
```
"gate:fast": "pnpm lint && pnpm typecheck && tsc --noEmit -p . && pnpm test && pnpm content:drift && pnpm test:content",
```

Removed and renamed keys: no branch consumes them. `doc.sourcesForPage` and `doc.verifiedOn` appear only as unmodified base copies in the content-pipeline worktree's `src/i18n/{en,af}.json` and one `ParamNames` line in its `src/i18n/index.ts`; a search restricted to `.astro`/`.ts`/`.js` files across all worktrees returns that single type line and nothing else. The design-system, e2e/CI and af-glossary worktrees each carry their own **pre-WP-12** `src/lib/paths.ts` with a separate `export const LOCALES = ['en','af'] as const`, so none of them imports the export this package renamed to `ENABLED_LOCALES`.

## Tests and docs

Tests are behavioural and deterministic: fixed inputs, UTC getters only, no clock or host-locale dependence, and expected strings built from `\u00a0` rather than pasted. The `@ts-expect-error` lines are live because `tsc --noEmit -p .` exits 0, and that check is now inside `gate:fast`.

**The TZ-varied run did not execute this pass.** Passes 1 and 2 both ran it under `America/Los_Angeles` from PowerShell — Git Bash silently fails to pass `TZ` to the native Node process, which pass 1 caught and documented — and both got identical results to the SAST run. Reading `formatDate`, the implementation uses only `Date.UTC` and `getUTC*` with an explicit `SAST_OFFSET_MINUTES`, so it has no host-zone dependency by construction. The next reviewer should still run it.

`docs/i18n.md` otherwise matches the code: the trust table covers every key in the group, the placement and order rules are consistent with the revised D5 and B6, the documented `trust.fact.checked` exception matches both the strings and the test that excludes it, the `current` contract table for `switchLocaleUrl` matches the shared guard, and the formatter section matches the implementation including the 1900–9999 range, the ±14:00 offset limit and the three-decimal default. The single defect is M1.

## Reviewer's note on a withdrawn finding

In my own pre-read draft I recorded a candidate finding that `gate:fast` on this branch drops the content-drift check (`pnpm content:build && git diff --exit-code -- src/data`) that build plan E1 lists and that `CLAUDE.md` describes. **I withdrew it after checking `package.json`.** This branch has no `content:*` scripts at all — `content:build`, `content:check`, `content:drift` and `content:fidelity` arrive with WP-10, and they exist in the content-pipeline and af-glossary worktrees but not here. `gate:fast` cannot call a script that does not exist, and the `CLAUDE.md` line describes the post-WP-10 end state. The drift check enters `gate:fast` through the combined line above, which is already recorded in `merge-checklist.md`. Recorded here so the next reviewer does not spend time re-deriving it.

## What the next pass must do before granting CLEAN

1. Fix M1, m1, m2, and apply the m3 wording.
2. **Execute the probes I could not run**, from `scratchpad/wp12b-pass3/`: `probe-names-checker.mjs`, `probe-runtime.mjs`, `probe-types.ts` with `tsconfig.probe.json`, and the TZ-varied test run from PowerShell with the zone confirmed inside Node. `finish.sh` runs the lot in one invocation.
3. Re-run `pnpm build` and `pnpm gate:fast` on a quieter machine, and confirm `git status --porcelain` is empty afterwards.
4. Confirm the merge-safety table against committed tips with `git grep`, rather than working copies.
