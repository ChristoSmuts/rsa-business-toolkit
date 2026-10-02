# WP-40 batch 2: af review, pass 2

- Date: 2 October 2026
- Commit reviewed: `b303d65` (local tip of `claude/lucid-bell-t5acdn`, with the pass 1 fixes in it)
- Reviewer role: af-reviewer (WP-42), second independent pass
- Documents: `core/running-a-pty-ltd`, `core/paying-yourself`, `core/adding-new-lines`, `core/working-from-home-and-safety`
- **Verdict: clean.** No blocker or major findings. 1 minor (fixed) and 2 nits (not fixed).

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 1 | 1 |
| nit | 2 | 0 |

With pass 1, this makes two consecutive clean passes over the whole batch.

## Fidelity check

Before the fix, at `b303d65`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fix:

```
$ pnpm content:fidelity --lang af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.

$ pnpm content:fidelity --lang af --doc core/adding-new-lines
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.
```

The fix changes Afrikaans markdown only. `src/data/af` was not regenerated; the orchestrator's `pnpm content:build --lang af` at integration picks it up.

## How I reviewed

I put each English line next to its Afrikaans line (the four file pairs have identical line counts) and read the whole batch sentence by sentence, not only the pass 1 fixes. I read the tax, dividend, loan-account and directors' duties paragraphs twice: `paying-yourself` options 1 to 3, "UIF: sources disagree", "A discrepancy worth knowing about", "Fixing a debit loan account"; `running-a-pty-ltd` financial statements and PIS, "What happens if you stop filing", "When the company does not protect you" (ss22, 76, 77, 218(2), s4 test), COIDA, "What happens if you are not there"; `adding-new-lines` turnover tax and SBC.

Facts, figures, obligations and deadlines all match English: R175, R100 to R3,000 and R150 to R4,000, R1 miljoen / R25 miljoen, 30 business days, 1 July 2024, PIS 100 / 349 / 350, 10%, R99,000, 0%, 20%, 27%, 7.75% from 1 December 2025, 1 March 2017, Paragraph 11C, s7B, s64E(4), s32, s80, s80(1), seven days, 30 days, R100,000 surety cap, around R200, 800,000 companies in January 2025, 12 to 18 months, 12 months after year end, the 7th, R300,000, R500,000, R50,000 / R3,000 November 2024, under ten seconds, 86% / 74% / R1.888 miljard, end of 2020, a quarter of floor area, one or two non-resident employees, R10 to R200 lines. Modal verbs are right throughout: "must" `moet`, permission "may" `mag`, possibility "may" `kan` / `dalk`, "should" `behoort`, "barred from" `mag nie`.

Terms agree with `TERMS-af.json` and the glossary (`leningsrekening in krediet / in debiet`, `geagte dividend`, `amptelike rentekoers`, `solvensie- en likiditeitstoets`, `eienaarbestuurd`, `Public Interest Score (openbare-belangtelling)`, `Financial Accountability Supplement`, `akte van oprigting (MOI)`, `beheerliggaam (body corporate)`, `vergunningsgebruik`, `liggingsmerker (geotag)`, `weerspieël / verreken`, `oorbetalingswendelary`, `openbare aanspreeklikheid`, `kleinsakekorporasie`), except the one finding below. Link text translates the English link text, as settled across the corpus.

I checked the pass 1 fixes in place (F1 to F24); each reads correctly and none changed a fact.

## Findings

### F1 minor (fixed): "handles" not rendered with the settled term
- Document: `core/adding-new-lines`, "Registered name and trading names", paragraph after the example ("Each trading name should have …"), and "Checklist before you add a line", item 5
- English: "Each trading name should have its own domain, social handles and, if it matters, its own trade mark search." / "Decided the trading name, and checked domain, handles and trade marks"
- Afrikaans: "Elke handelsnaam behoort sy eie domein en sosiale-media-name te hê, …" / "… en die domein, sosiale-media-name en handelsmerke nagegaan"
- What is wrong: `TERMS-af.json` settles "handle (social media)" as `gebruikersnaam` (batch 3 review), and every other document uses `gebruikersname` (`core/register`, `branding/already-have-your-name`, `branding/branding-prompts`, `start/how-this-was-made`, `start/what-has-changed`). Meaning was intact; terminology was not.
- Fix: "Elke handelsnaam behoort sy eie domein en gebruikersname op sosiale media te hê, …" and "… en die domein, gebruikersname en handelsmerke nagegaan".

### F2 nit (not fixed): a house that "optree"
- Document: `core/working-from-home-and-safety`, "The short version", paragraph 1
- English: "… as long as the house still looks and behaves like a house."
- Afrikaans: "… solank die huis steeds soos ’n huis lyk en optree."
- What is wrong: `optree` for a building is a little literal. It mirrors the English figure of speech and is understood; a smoother option would be "soos ’n huis lyk en gebruik word", but that narrows the meaning slightly.
- Fix: none required.

### F3 nit (not fixed): "tax bracket" as `belastingkategorie`
- Document: `core/paying-yourself`, "Which to use", paragraph 3
- English: "… your lifestyle needs, tax bracket, and long-term business goals."
- Afrikaans: "… jou lewenstylbehoeftes, jou belastingkategorie en jou langtermyndoelwitte vir die besigheid."
- What is wrong: nothing of substance. `belastingkategorie` is clear; `belastingskaal` is an alternative. The term does not occur elsewhere in the corpus, so there is nothing to be consistent with.
- Fix: none required.
