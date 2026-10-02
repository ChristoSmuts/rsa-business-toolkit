# WP-40: the Afrikaans translation of the guide

Status: brief, ready to start. Batch 0 goes first because it settles the terms the other batches use.

Read first, every translator: `CLAUDE.md`, `scripts/translate/STYLE-GUIDE-af.md` (all of it), `scripts/translate/TERMS-af.json`, `docs/build-plan.md` A6 and the P4 line of D3.

## The rules in short

The style guide and `TERMS-af.json` are the rules; this list is a reminder.

- One Afrikaans file per English file, same relative path and file name, under `docs/rsa-business-toolkit-af/`.
- Same blocks in the same order. Numbers, rand amounts, percentages, dates' digits, form codes, URLs, link targets and placeholder counts stay byte-identical.
- Loop `pnpm content:fidelity --lang af --doc <id>` until it prints 0 findings, for every document in your batch.
- Natural, plain Afrikaans for a small-business owner, "jy" register. No added facts, no dropped facts, no softening or hardening of what English says.
- Do not touch English markdown, `src/data/**`, `TERMS-af.json` or the style guide. If a term is missing from `TERMS-af.json` or a rule seems wrong, write it in your notes file and pick one rendering consistently; the orchestrator decides.
- Notes for the human reviewer go in `docs/reviews/WP-40-batch<N>-notes.md`, not in `TRANSLATION-NOTES.md`, so batches running in parallel do not edit one file.

## Batches

Word counts are the English source.

| Batch | Documents | Words |
| --- | --- | --- |
| 0 | `lookup/glossary`, `start/start-here`, `core/start-here`, `business-types/pick-your-business-type`, the five `paperwork/templates/*` | about 6,000 |
| 1 | `core/register`, `core/tax-and-sars`, `core/what-you-need-to-sell-things`, `core/vehicles` | 9,100 |
| 2 | `core/running-a-pty-ltd`, `core/paying-yourself`, `core/adding-new-lines`, `core/working-from-home-and-safety` | 10,600 |
| 3 | `core/you-are-the-business`, `start/how-to-use`, `start/how-this-was-made`, `start/what-has-changed` | 9,200 |
| 4 | the five `branding/*` documents | 12,100 |
| 5 | the six `business-types/*` type documents (not the hub) | 11,800 |
| 6 | `paperwork/which-template-to-use-when`, `paperwork/free-tools`, `lookup/checklist`, `lookup/sources` | 9,700 |

Batch 0's glossary becomes the reference: later batches read `docs/rsa-business-toolkit-af/05 Look it up/01-glossary.md` and use its renderings.

## Done for a batch

- Every document in the batch has 0 fidelity findings.
- `pnpm content:build --lang af` succeeds with the batch's files present, and `pnpm content:check` passes.
- The notes file lists every judgement call a reviewer should look at.
- Commit with scope `af`, one commit per batch: `feat(af): translate batch <N> (<short list>)`.

After translation, a different agent reviews each batch against the English (WP-42: meaning, terminology consistency with the glossary, no added or lost facts, register), writing `docs/reviews/WP-40-batch<N>-pass<n>.md`. The af-reviewer may fix the Afrikaans file under review. Two consecutive clean passes per batch, as in D4.

## Integration

The orchestrator merges the batches, runs `pnpm content:build --lang af` so `src/data/af/**` is regenerated (never hand-edited), then the full build, `dist:trust` (its language-of-parts check may need protected names on its allow-list) and the e2e suites for `/af/`.
