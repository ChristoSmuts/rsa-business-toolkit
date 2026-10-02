# WP-40 batch 4: af review, pass 4

- Date: 2 October 2026
- Commit reviewed: `ad63934` (local tip of `claude/lucid-bell-t5acdn`, which includes the pass 1, 2 and 3 fixes and the regenerated `src/data`); fixes from this pass in `9ff8ce4`
- Reviewer role: af-reviewer (WP-42), fourth independent reviewer
- Documents: `branding/already-have-your-name`, `branding/branding-prompts`, `branding/mood-and-materials`, `branding/brand-applications-and-polish`, `branding/marketing-prompts`
- **Verdict: clean.** No blocker and no major findings. Two nits, both fixed. With pass 3 this is the second consecutive clean pass the batch needs; under the 17 September 2026 amendment the nit fixes do not restart the count and are verified by the next review (the integrated review of `main` is enough).

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 0 | 0 |
| nit | 2 | 2 |

## Fidelity check

Before fixes, at `ad63934`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below, at `9ff8ce4`:

```
$ pnpm content:fidelity --lang af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
$ pnpm content:fidelity --lang af --doc branding/branding-prompts
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.
```

`src/data/**` was not regenerated or edited. The committed `src/data/af/branding/branding-prompts` lags the markdown by the two nit fixes below; the orchestrator should run `pnpm content:build --lang af` when integrating.

## How I reviewed

I paired every English and Afrikaans file line by line (each pair has the same line count: 129, 790, 163, 307 and 207) and read every pair afresh, not only the earlier fixes. For each sentence, and for every line inside a prompt, I identified subject, verb and object in the English and checked the Afrikaans keeps them: who tells whom, who asks, who checks, who receives, who sends, and the scope words each, every, any, all, only, at least, at most and most. Then I checked meaning, figures, legal rules, placeholders, numbered structure, the "jy" register and natural Afrikaans.

What I confirmed:
- Roles in the prompts. The owner pastes and checks; the AI writes, lists, numbers, names its weakest option and stops. "I will check real competitors myself", "List what sounds close and let me check", "I will check them", "I will check the exact contrast ratios myself", "ask me which is closest and what I would change" and "Wait for my answer" keep the owner as the checker. Marketing Prompt 3 has situation 1 as the customer's action and situations 2 to 8 as the owner's (`Vir ’n kliënt sê dat ek laat is` is correct). Prompt 9's "I am delayed by two days on their order", "says no to a job I do not want", Prompt 6's "You will add the name yourself in Path A", Prompt B's "I do not want to be sold the better version", the worked-example brief (the owner inspects and lists faults; the buyer receives the list and takes the clipboard) and the quality tests (show someone, say it to someone, photocopy the copy) all keep the right person in each role.
- The pass 1 and pass 2 majors stay fixed: `’n moedertaalspreker van elke taal wat jou kliënte praat` in all three places, and situation 6 in Marketing Prompt 3.
- Scope words: "at least" (`minstens`), "maximum"/"at most" (`hoogstens`), "each/every" (`elke`, `elkeen`, `by elkeen`), "any" (`enige`), "only" (`net`, `eers wanneer`, `net vir die swakste element`, `en net daarheen`), "most" (`die meeste`), "all" (`al`, `almal`) keep their scope.
- No fact, figure, legal rule or deadline is changed: section 32 of the Companies Act (registered name and registration number on all documents, including emails and the website), the CIPC company name versus trade mark distinction, "you do not need to register a trade mark in year one", R146 of 2012 food labelling, the research citations (Elliot and Maier 2014, Singh 2006, Labrecque and Milne 2012, 62 to 90%), the UV and vinyl figures (Zone 3, ten and three years, 50 to 70%, 5 to 10, 1 to 5, 3 to 5, two to three years), 3mm bleed, 300 and 72 DPI, 2000px, 1000 x 1000, 512 x 512, 700 characters, 500 KB, 12 posts and 3 a week, 60, 40, 20 and 6 words, 200 words, R250,000, 14 years and the five-metre and three-second tests.
- Every prompt keeps its numbered structure, its placeholders (count and case) and its closing instruction. The `example` (`MOKOENA MOTORS`) and `listing` (`07 Brand/`) fences are byte-identical to English.
- The settled items stay as they are: link text translates the English link text, `eenvoudige taal` for "simple English", and the coined branding terms the earlier passes accepted.

## Findings

### N1 nit (fixed): "Sê vir elke paar … watter pare jy BEDOEL om leesbaar te wees"
- Document: `branding/branding-prompts`, Prompt 7 rules, last item
- English: "- For each text-on-background pair, state which pairs you INTEND to be / readable."
- Afrikaans: "- Sê vir elke paar van teks op agtergrond watter pare jy BEDOEL om / leesbaar te wees."
- What is wrong: `Sê vir elke paar` reads as "tell each pair" (the same pattern pass 2 fixed in Prompt 5 as N3), and `jy bedoel om leesbaar te wees` is the English "intend X to be" calqued, so the `om`-clause takes `jy` (the AI) as its subject. The AI would still understand, so not a role reversal, but the line reads badly.
- Fix: "- Sê by elke paar van teks op agtergrond of jy BEDOEL dat dit / leesbaar moet wees." (line break kept)

### N2 nit (fixed): "kyk by iemand wat isiXhosa praat"
- Document: `branding/branding-prompts`, worked example, "What good name options look like", option 1
- English: "Sounds like: nothing problematic known, check with an isiXhosa speaker."
- Afrikaans: "Klink soos: niks bekend wat problematies is nie, kyk by iemand wat isiXhosa praat."
- What is wrong: `kyk by iemand` means "look in at someone's place", a calque of "check with"; pass 3 fixed the same verb in option 4 (`kyk by isiXhosa`).
- Fix: "… niks bekend wat problematies is nie, vra iemand wat isiXhosa praat."

## Earlier items I looked at again

- Pass 1 N28 (`duime` for "likes"): a style preference; left as is.
- Pass 1 N29 and the notes' section 3 items (`05-branding-prompts.md` in Marketing Prompt 1, "Prompt 10" in the `listing` fence, "once in English" in Marketing Prompt 3): faithful to the English; English-source questions for the content owner, not translation findings.
- Marketing Prompt 5, "most often stop … from buying" → `die meeste daarvan weerhou` (pass 1 F14): it shifts "most often" towards "most strongly" slightly, but both name the top 10 sales blockers and the AI produces the same list. Not a finding.
- `branding/mood-and-materials`, "Your brand will probably change something in year two" → `Jou handelsmerk sal waarskynlik in die tweede jaar iets verander`: keeps the English subject (the brand changes something), which is odd in English too. Faithful.
