# WP-40 batch 4: af review, pass 3

- Date: 2 October 2026
- Commit reviewed: `8247dbe` (local tip of `claude/lucid-bell-t5acdn`, which includes the pass 1 and pass 2 fixes); fixes from this pass in `4bbac15`
- Reviewer role: af-reviewer (WP-42), third independent reviewer
- Documents: `branding/already-have-your-name`, `branding/branding-prompts`, `branding/mood-and-materials`, `branding/brand-applications-and-polish`, `branding/marketing-prompts`
- **Verdict: clean.** No blocker and no major findings. Three nits, all fixed. This is the first of the two consecutive clean passes the batch needs; under the 17 September 2026 amendment the nit fixes do not restart the count and are verified by the next review.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 0 | 0 |
| nit | 3 | 3 |

## Fidelity check

Before fixes, at `8247dbe`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below, at `4bbac15`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

`pnpm content:fidelity --lang af --doc branding/branding-prompts` also printed `Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.`

`src/data/**` was not regenerated or edited. The committed `src/data/af` for these documents lags the markdown by the pass 1, 2 and 3 wording fixes; the orchestrator should run `pnpm content:build --lang af` when integrating.

## How I reviewed

Every Afrikaans file has the same line count as its English file, so I paired them line by line (129, 790, 163, 307 and 207 lines) and read every pair. For each sentence, and for every line inside a prompt, I identified the subject, verb and object in the English and checked the Afrikaans has the same ones: who tells whom, who asks, who receives, who sends, and the scope words each, every, any, all, only, at least, at most and most. Then I checked meaning, figures, legal rules, placeholders, numbered structure, the "jy" register and natural Afrikaans.

What I confirmed:
- Roles in the prompts. Every prompt line keeps its actor: the owner pastes, the AI writes, lists, numbers and stops; "ask me which is closest", "tell me which is weakest", "Do not tell me it is safe … let me check", "I will check them" and "I will check real competitors myself" keep the owner as the checker. Marketing Prompt 3 now has all eight situations as things the owner does (`’n Kwotasie stuur`, `’n Kwotasie opvolg`, `’n Bespreking bevestig`, `’n Kliënt … herinner`, `Vir ’n kliënt sê dat ek laat is`, `Beleefd vir betaling vra`, `Vir ’n Google-resensie vra`), with only situation 1 as a customer action, as in English. Prompt 9's message ("I am delayed by two days on their order"), the "says no to a job I do not want" line, the worked-example brief (the owner inspects, the buyer receives the fault list and takes the clipboard) and the photocopy, phone-call and three-second tests keep the right person in each role.
- The pass 1 and pass 2 majors are correctly fixed: `’n moedertaalspreker van elke taal wat jou kliënte praat` in all three places (one native speaker per language), and `6. Vir ’n kliënt sê dat ek laat is`.
- Scope words: "at least" (`minstens`, 12 places), "maximum" (`hoogstens`), "each/every" (`elke`, `elkeen`, `by elkeen`), "any" (`enige`), "only" (`net`, `eers wanneer`, `net vir die swakste element`), "most" (`die meeste`), "all" (`al`, `almal`) all keep their scope, apart from N1 below.
- No fact, figure, legal rule or deadline is changed. Section 32 of the Companies Act (registered name and registration number on all documents, including emails and the website), the CIPC company name versus trade mark distinction, "you do not need to register a trade mark in year one", R146 of 2012, the research citations, the UV and vinyl figures (Zone 3; ten and three years; 50 to 70%; 5 to 10, 1 to 5, 3 to 5, two to three years), 3mm bleed, 300 and 72 DPI, 2000px, 1000 x 1000, 512 x 512, 700 characters, 500 KB, 12 posts and 3 a week, 60 and 40 words, R250,000, 14 years and the brand-guide headings match.
- Every prompt keeps its numbered structure, its placeholders (count and case) and its closing instruction ("Number them 1 to 5 … weakest … stop", "After the 5 options, stop", "Stop after the list"). The `example` (`MOKOENA MOTORS`) and `listing` (`07 Brand/`) fences are unchanged.
- The settled items stay as they are: link text translates the English link text, `eenvoudige taal` for "simple English", and the coined branding terms the earlier passes accepted.

## Findings

### N1 nit (fixed): "only" moved from the step to the verb
- Document: `branding/branding-prompts`, "If the AI runs ahead"
- English: "Stop. Go back to step [X] only. Give me 5 options for that step and nothing else."
- Afrikaans: "Stop. Gaan net terug na stap [X]. Gee my 5 opsies vir daardie stap en niks anders nie."
- What is wrong: `Gaan net terug` reads as "just go back", so "only" limits nothing. The next sentence restores the restriction, so the AI would still behave, but the scope word should sit on the step.
- Fix: "Stop. Gaan terug na stap [X], en net daarheen. Gee my 5 opsies vir daardie stap en" (line break kept)

### N2 nit (fixed): "after hearing it once" addressed to the AI
- Document: `branding/branding-prompts`, Prompt 3 rules
- English: "- Easy to spell after hearing it once"
- Afrikaans: "- Maklik om te spel nadat jy dit een keer gehoor het"
- What is wrong: inside a prompt, `jy` is the AI. English is impersonal (anyone who hears the name), and the rule is about customers.
- Fix: "- Maklik om te spel nadat ’n mens dit een keer gehoor het"

### N3 nit (fixed): "kyk by isiXhosa"
- Document: `branding/branding-prompts`, worked example, "What good name options look like", option 4
- English: "Sounds like: nothing problematic in English; check isiXhosa."
- Afrikaans: "Klink soos: niks problematies in Engels nie; kyk by isiXhosa."
- What is wrong: `kyk by` takes a person or a place, not a language; it reads as a calque.
- Fix: "… niks problematies in Engels nie; gaan isiXhosa na."

## Earlier items I looked at again

- Pass 1 N28 (`duime` for "likes"): a style preference; left as is.
- Pass 1 N29 and the notes' section 3 items (`05-branding-prompts.md` in Marketing Prompt 1, "Prompt 10" in the `listing` fence, "once in English" in Marketing Prompt 3): faithful to the English; English-source questions for the content owner, not translation findings.
- `vinnige antwoorde (quick replies)` in `branding/marketing-prompts` set-up list versus `(Quick Replies)` later: the English has the same case difference ("Quick replies" in the list, "Quick Replies" as the feature name), so not a finding.
- `handelsmerk` for both "brand" and "trade mark" (as `TERMS-af.json` sets it): in the trade mark passages of `branding/already-have-your-name` and the `branding/branding-prompts` table, the context (`registreer`, `handelsmerkdatabasis`, `as handelsmerk`) makes the legal sense clear each time.
