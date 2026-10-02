# WP-40 batch 3: af review, pass 2

- Date: 2 October 2026
- Commit reviewed: `b303d65` (local tip of `claude/lucid-bell-t5acdn`, which contains the batch 3 pass 1 fixes `1c162aa`)
- Fixes: `0382417` (`fix(af): apply batch 3 review pass 2 fixes`), on top of `b303d65`
- Reviewer role: af-reviewer (WP-42), second independent reviewer
- Documents: `core/you-are-the-business`, `start/how-to-use`, `start/how-this-was-made`, `start/what-has-changed`
- **Verdict: clean.** No blocker or major findings. 8 nit findings, all fixed in this pass. With pass 1, this is the second consecutive clean pass over the whole batch.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 0 | 0 |
| nit | 8 | 8 |

## Fidelity check

Before fixes, at `b303d65`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

`src/data` was not regenerated. The orchestrator's `pnpm content:build --lang af` picks up the fixed markdown.

## How I reviewed

I read every block of the four documents against its English partner, sentence by sentence, not only the 16 pass 1 fixes. I checked meaning (added, lost, more or less certain), every modal verb, `TERMS-af.json` (including the entries the batch reviews settled: `vervaldatum`, `gebruikersnaam` for handles), the batch 0 glossary, consistency with the other batches' H1s and link texts, the `jy` register, AWS spelling and natural word order. Facts, numbers, rand amounts, dates, form codes, section references, URLs and link targets are all correct.

**AI disclosure (`start/how-this-was-made`).** I checked again every sentence that says who wrote, checked or did not check something, and how certain it is: the sentence naming the AI assistant that wrote the guide, the company that made it and the date; "No lawyer, accountant, or registered tax practitioner reviewed it before publication"; "You should know that" (`behoort`); "The prompts … were written by the AI. They were not tested against every AI tool, so results will vary"; "Anything after that was found by web search …, not recalled"; "Two factual errors were found and fixed"; "The error came from relying on …" (passive kept: `omdat daar op … staatgemaak is`); "Four claims were weakened because they could not be verified …"; "No further factual errors were found. Five gaps were found and filled"; "The zip was verified to be byte-identical"; "Six weaknesses were found and fixed"; "Every safety and payment claim was checked against …"; "One unverifiable price … was removed"; "The user noticed"; "A Core entry document has been created in Drive"; "All three are corrected and sourced"; "Two of the six problems came from well-ranked … articles". Each matches the English exactly in actor and certainty. F5 below rewords one clause of the eleventh pass; it adds no actor (the English "removing it" names none, and `omdat dit verwyder is` names none) and keeps "apparently" as `het dit gelyk asof`.

**Settled corpus rules.** Link text translates the English link text (`Kern: begin hier`, `Begin hier`, `Tuiswerk en veilige ontmoetings`, `Het jy reeds jou naam? (kortpad)`, `Stemming en materiale (gebruik ná Opdrag 4)`, `Nuwe besigheidslyne byvoeg`), the same strings as every other batch. `alledaagse taal` in `how-to-use` (the language of the page the reader sees) and `alledaagse Engels` in `how-this-was-made`, fourth pass (a record of what was done to the English source) follow the "taal"/"Engels" rule. No change.

**Pass 1 fixes.** All 16 are present and correct: `kan ’n mens redeneer dat`, `niemand noem nie`, `besering op diens`, `invorderingstappe` (both places), `gebruikersname` (both places), `Die naam kies`, `inligting oor voordelige eienaarskap`, `diensbeurte`, `stellige bewering`, `die enigste direkteur` (all places), `jouself`, `beskeie fooi`, the word order of "in die land", `die geld in jou saldo is`, `Die heel doeltreffendste`.

## Findings

### F1 nit (fixed): missing verb in an elliptical sentence
- Document: `core/you-are-the-business`, intro list, item 2
- English: "One structure has a free court. The other does not."
- Afrikaans: "Een struktuur het ’n gratis hof. Die ander een nie."
- What is wrong: Afrikaans needs the verb in the short answer; without it the sentence reads as a fragment.
- Fix: "Die ander een het nie."

### F2 nit (fixed): hypothetical became factual
- Document: `core/you-are-the-business`, "Checklist", **Protection**, item 4
- English: "Have a cash buffer in a separate account, sized in months I could not work"
- Afrikaans: "… bereken in maande wat ek nie kan werk nie"
- What is wrong: `nie kan werk nie` reads "months I cannot work", a present fact. The same idea in "What both structures still need" is rendered `nie sou kan werk nie`.
- Fix: "… bereken in maande wat ek nie sou kan werk nie"

### F3 nit (fixed): misspelt compound "regsin"
- Document: `start/how-to-use`, "How the legal parts are written", paragraph 3
- English: "If the legal sentence confuses you, skip it and read the plain line."
- Afrikaans: "As die regsin jou verwar, slaan dit oor …"
- What is wrong: the compound of `regs-` and `sin` is `regssin` under AWS; `regsin` reads as `reg` + `sin`. Either form makes the reader stop on a line that tells them how to read easily.
- Fix: "As die sin in regstaal jou verwar, slaan dit oor …"

### F4 nit (fixed): "gelyk" for "at once"
- Document: `start/how-to-use`, "If the AI runs ahead"
- English: "Some AI tools will answer three steps at once."
- Afrikaans: "Sommige KI-programme sal drie stappe gelyk beantwoord."
- What is wrong: the standard word for "at the same time" is `tegelyk`; `gelyk` is "equal" or "level" first.
- Fix: "drie stappe tegelyk beantwoord"

### F5 nit (fixed): "het die vouer gelaat asof" is an English construction
- Document: `start/how-this-was-made`, "Corrections log", "Eleventh pass"
- English: "… and removing it left the folder apparently missing its first file and without the orientation document every other folder has."
- Afrikaans: "… en om dit te verwyder het die vouer gelaat asof sy eerste lêer ontbreek, en sonder die oriënteringsdokument wat elke ander vouer het."
- What is wrong: `iets laat asof` copies "left it looking"; the infinitive subject `om dit te verwyder het` is also heavy.
- Fix: "… en omdat dit verwyder is, het dit gelyk asof die vouer sy eerste lêer kort, en was die vouer sonder die oriënteringsdokument wat elke ander vouer het." No actor added; "apparently" kept.

### F6 nit (fixed): tense and "gelaat as" in Change 3
- Document: `start/what-has-changed`, "Change 3", **Reason**
- English: "… because [Core: start here](…) had been folded into the root START HERE when Drive was built. The result looked like a missing file, and it left Core as the only folder without its own entry document."
- Afrikaans: "… want [Kern: begin hier](…) is by die hoof-START HERE ingevou toe Drive gebou is. … en dit het Core gelaat as die enigste vouer sonder sy eie intreedokument."
- What is wrong: "had been folded" is a pluperfect passive (`was … ingevou`); `iets laat as` is the same calque as F5.
- Fix: "… was by die hoof-START HERE ingevou toe Drive gebou is. … en daardeur was Core die enigste vouer sonder sy eie intreedokument."

### F7 nit (fixed): "which ones" as singular
- Document: `start/what-has-changed`, "Change 3", "Added", paragraph 1
- English: "… which ones apply to which readers …"
- Afrikaans: "… watter een op watter lesers van toepassing is …"
- Fix: "… watter dokumente op watter lesers van toepassing is …"

### F8 nit (fixed): "would" became "will"
- Document: `start/what-has-changed`, "How to keep the two copies in sync", paragraph 3
- English: "That creates a new file with a new ID, and every link in the toolkit would still point at the old one."
- Afrikaans: "… en elke skakel in die gereedskapstel sal steeds na die ou een wys."
- Fix: "… sou steeds na die ou een wys."

## Considered and left as they are

- `Werkloosheidversekeringsfonds` (UIF gloss in the word table): matches the batch 0 glossary entry, so the two stay consistent. If an official source shows `Werkloosheidsversekeringsfonds`, change both together.
- `die wet` in lower case for "the Act": that is the majority form across the corpus.
- `Vra ’n deposito` for "Take a deposit": the natural Afrikaans; the checklist's `Deposito ontvang` covers the "taken" sense.
- `gee die handelsmerk ’n naam` for "name the trading brand" (`how-to-use`, Path 4, item 8): `handelsmerk` already carries "trade", and the contrast with the company is kept.
- `Gaan terug na net stap [X]` in the prompt fence: a little stiff, but unambiguous, and the next sentence repeats "for that step and nothing else".
- `ronde` for the refine "round" and `’n laaste ronde vir akkuraatheid` next to `rondte` for verification passes: different English words; both forms are AWS.
- Sentences that start with a fronted phrase and a comma before an imperative (`Vir ’n klein verandering, wysig …`): common in Afrikaans instructional text; not changed.
- Uneven line lengths in snippets 4 and 5: as pass 1, acceptable.

## Notes for the orchestrator

- `01 Core - applies to everyone/06-running-a-pty-ltd.md` (batch 2) glosses Return of Earnings as `(opgawe van verdienste)`; batch 3 uses `(verdiensteopgawe)` in three places. Pick one and consider adding it to `TERMS-af.json`. I did not touch batch 2's file.
- Pass 1's notes still stand: batch 0 `start/start-here` "eenvoudige Engels" → "eenvoudige taal" for the first `Engels`; consider `sole proprietor (the person)` → `eenmansaak-eienaar` in `TERMS-af.json`; the English "a.co.za" typo in `02-how-this-was-made.md` is for the content owner.
