# WP-40 batch 4: af review, pass 2

- Date: 2 October 2026
- Commit reviewed: `b303d65` (local tip of `claude/lucid-bell-t5acdn`, which includes the pass 1 fixes); fixes from this pass in `c47434b`
- Reviewer role: af-reviewer (WP-42), second independent reviewer
- Documents: `branding/already-have-your-name`, `branding/branding-prompts`, `branding/mood-and-materials`, `branding/brand-applications-and-polish`, `branding/marketing-prompts`
- **Verdict: not clean.** One major finding (fixed in this pass). No blockers. The two-pass count restarts: the next pass must review the whole batch again.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 1 | 1 |
| minor | 0 | 0 |
| nit | 6 | 6 |

## Fidelity check

Before fixes, at `b303d65`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below, at `c47434b`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

The three changed documents also each printed `Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.` with `--doc branding/<id>`.

`src/data/**` was not regenerated or edited. The committed `src/data/af` for these documents lags the markdown by the pass 1 and pass 2 wording fixes; the orchestrator should run `pnpm content:build --lang af` when integrating.

## How I reviewed

I read every Afrikaans block against its English block, line by line (every block has the same line count as English, so the files pair line for line), for meaning, quantifiers and scope ("each", "every", "any", "only", "at least"), modal verbs, every prompt as an instruction pasted into an AI tool, the batch's coined terms, the "jy" register and AWS spelling.

What I confirmed:
- No fact, figure, legal rule or deadline is changed. Section 32 of the Companies Act (name and registration number on all documents, including emails and the website), the CIPC company name versus trade mark distinction, "you do not need to register a trade mark in year one", R146 of 2012, the research citations (Elliot and Maier 2014, Singh 2006, Labrecque and Milne 2012), the UV and vinyl lifetimes (5 to 10, 1 to 5, 3 to 5 years; 50 to 70%), 3mm bleed, 300 and 72 DPI, 700 characters, 500 KB, 12 posts a month, the deductible expense and every rand amount match.
- The pass 1 major is correctly fixed in all three places: "’n moedertaalspreker van elke taal wat jou kliënte praat" means one native speaker per language.
- Quantifiers I checked one by one: "at least two/one" (`minstens`), "each/every" (`elke`, `elkeen`), "only" (`net`, `eers wanneer`), "most" (`die meeste`), "all" (`al`, `almal`), "at most/maximum" (`hoogstens`). Apart from F1 nothing shifts scope.
- Every prompt keeps its numbered structure, its placeholders (count and case), its "Number them 1 to 5 … weakest … stop" ending, and asks for the same output. The `example` and `listing` fences are unchanged.
- The settled items stay as they are: link text, `eenvoudige taal`, and the coined terms pass 1 accepted.

## Findings

### F1 major (fixed): "Telling a customer I am running late" became "A customer says I am late"
- Document: `branding/marketing-prompts`, "Prompt 3: WhatsApp messages you send every week", situation 6
- English: "6. Telling a customer I am running late"
- Afrikaans: "6. ’n Kliënt sê dat ek laat is"
- What is wrong: `sê` takes the person told with `vir`. Without it, `’n Kliënt` is the subject, so the line reads as a finite sentence, "A customer says that I am late", like situation 1 ("Iemand vra …"). Pasted as is, the AI writes a reply to a customer who complains about lateness, instead of the message the owner sends to warn a customer. The prompt asks for a different message.
- Fix: "6. Vir ’n kliënt sê dat ek laat is"

### N1 nit (fixed): "Opvolg op" is a calque of "follow up on"
- Document: `branding/marketing-prompts`, Prompt 3, situation 3
- English: "3. Following up on a quote after 3 days with no reply"
- Afrikaans: "3. Opvolg op ’n kwotasie ná 3 dae sonder antwoord"
- Fix: "3. ’n Kwotasie opvolg ná 3 dae sonder antwoord" (same pattern as situations 2, 4 and 5)

### N2 nit (fixed): "Jy moet." as a bare ellipsis
- Document: `branding/branding-prompts`, "Before you commit to a name"
- English: "The AI cannot do any of these. You must."
- Afrikaans: "Die KI kan nie een van hierdie dinge doen nie. Jy moet."
- What is wrong: the same kind of calqued ellipsis as pass 1's F2 ("Jy doen nie."). It is understandable but reads clipped.
- Fix: "Jy moet dit doen."

### N3 nit (fixed): "Sê vir elke rigting" means "tell each direction"
- Document: `branding/branding-prompts`, Prompt 5
- English: "For each direction tell me:"
- Afrikaans: "Sê vir elke rigting:"
- Fix: "Sê vir my by elke rigting:" (as "Sê vir my by elkeen:" elsewhere in the batch)

### N4 nit (fixed): "op die vloer" for "on the floor"
- Document: `branding/branding-prompts`, worked example, Prompt 0 answer 9 (`snippet` fence)
- English: "a local tyre shop where the owner is always on the floor"
- Afrikaans: "waar die eienaar altyd op die vloer is"
- What is wrong: "on the floor" means on the shop floor, working with the staff; `op die vloer` first reads as physically on the ground.
- Fix: "waar die eienaar altyd op die werkvloer is"

### N5 nit (fixed): "groot stadshandelaar" for "big-city dealership"
- Document: `branding/branding-prompts`, worked example, Prompt 0 answer 10 (`snippet` fence)
- English: "anything that looks like a big-city dealership"
- Afrikaans: "enigiets wat soos ’n groot stadshandelaar lyk"
- What is wrong: `groot` attaches to `stadshandelaar` ("a big city trader") and loses that it is a car dealership; the brief two blocks down says `motorhandelaar`.
- Fix: "enigiets wat soos ’n motorhandelaar in ’n groot stad lyk"

### N6 nit (fixed): "Knyp jou oë toe" shuts the eyes
- Document: `branding/brand-applications-and-polish`, Part 4, "The squint test"
- English: "Squint at it until it blurs."
- Afrikaans: "Knyp jou oë toe totdat dit vervaag."
- What is wrong: `toeknyp` is to shut the eyes tight, after which you see nothing; squinting is looking through half-closed eyes.
- Fix: "Knyp jou oë half toe totdat dit vervaag."

## Pass 1 items I looked at again

- N28 (`duime` for "likes"), not fixed in pass 1: I agree it is a style preference and leave it.
- N29 and the notes' section 3 items (`05-branding-prompts.md` in Marketing Prompt 1, "Prompt 10" in the `listing` fence, "once in English" in Marketing Prompt 3): faithful to the English; English-source questions for the content owner, not translation findings.
- Pass 1's 40 fixes read correctly in context; none introduced a new problem.
