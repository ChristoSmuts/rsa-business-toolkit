# WP-40 batch 0: af review, pass 2

- Date: 2 October 2026
- Commit reviewed: `2fe99c1` (tip of `claude/lucid-bell-t5acdn`; batch 0 files last changed in `9dd20d9`, `fix(af): apply batch 0 review pass 1 fixes`)
- Reviewer role: af-reviewer (WP-42), second independent pass
- Documents: `lookup/glossary`, `start/start-here`, `core/start-here`, `business-types/pick-your-business-type`, `paperwork/templates/` quotation, invoice, tax-invoice, receipt, privacy-notice
- **Verdict: clean.** No blocker or major findings. 1 minor and 4 nit findings; 4 of them are fixed in this pass. With pass 1, this is the second consecutive clean pass over the whole batch.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 1 | 1 |
| nit | 4 | 3 |

## Fidelity check

Before fixes, at `2fe99c1`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes below (commit `de6d8cf`):

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

## How I reviewed

I read all nine documents again from the start, not only the pass 1 fixes. I compared each Afrikaans block with its English partner sentence by sentence (the glossary line by line; both files have 264 lines and every entry lines up). I checked meaning, modal verbs, every term against `TERMS-af.json`, register, spelling, the required-content lines and legal wording of the templates, and the text of every link against the Afrikaans H1 of its target and against the link text the other batches use for the same target.

Facts, figures, obligations and deadlines are all correct: R2.3 miljoen, R120,000, R600,000, R50 / R5,000, 21 dae, 15%, 1.15 and 15/115, 20%, 7.75%, R99,000, R30,000 / R20,000, R10 / R50 miljoen, 3,500 kg, vyf jaar, the 7de, 1 Maart 2017, 1 Desember 2025, 1 Augustus 2026. The seven required items of a full tax invoice match the English one for one. The POPIA notice says the same as the English in every line, including the five-year retention, the "do not sell" promise, the three sharing parties, the STOP keyword and the right to complain to the Information Regulator. All pass 1 fixes are in place and correct.

Link text is consistent across the whole translation: every target is linked with exactly one Afrikaans text in all 36 documents (for example `Tuiswerk en veilige ontmoetings`, `Watter sjabloon om wanneer te gebruik`, `Voertuie vir jou besigheid`). Where the English link text equals the English H1, the Afrikaans link text equals the Afrikaans H1 (`Handelsmerkopdragte`, `Belasting en SARS`, `Registreer: wat jy regtig nodig het`, `Bestuur van ’n Pty Ltd`, `Betaal jouself uit ’n Pty Ltd`, `Jy is die besigheid`, `Wat jy nodig het om dinge te verkoop`, `Handelsmerktoepassings en afronding`, `Gratis gereedskap`, `Kies jou besigheidstipe`, `Woordelys`, `Hoofkontrolelys`, `Bronne- en verifikasieregister`, `Hoe om hierdie gereedskapstel te gebruik`). Where the English link text differs from the English H1 (for example "Vehicle dealer" against "Business type: buying and selling vehicles"), the Afrikaans follows the English link text, which is correct.

## The two open items

- **Invoice "Betaaldatum".** Already resolved. Pass 1 (F9) changed it to `Vervaldatum`, and the file at `2fe99c1` says `| Vervaldatum | [DD Maand JJJJ] |`. Batch 6 uses `Vervaldatum` in the table and the template preview of `which-template-to-use-when`. No change needed.
- **`start/start-here`, "Written in simple English …" kept as "eenvoudige Engels".** Keep it. The sentence says how the toolkit was written, and that is a fact about the source: the toolkit was written in simple English. Batch 3 drew the same line: `start/how-to-use` says `in alledaagse taal` because that sentence describes the plain-words lines the reader sees on the Afrikaans page, while `start/how-this-was-made` keeps `alledaagse Engels` because it is a record of what was done to the English source. Changing `Engels` here would change a fact, and the page's machine-translation notice tells the reader that this is a translation. Recorded as N4, not fixed.

## Findings

### P2-1 minor (fixed): "Stuur net ’n kwitansie" can read as "just send a receipt"
- Document: `paperwork/templates/receipt`, closing blockquote
- English: "Only send a receipt once the money is in your account balance."
- Afrikaans: "Stuur net ’n kwitansie sodra die geld in jou rekeningsaldo is."
- What is wrong: `net` straight after the verb is often read as "just" ("just send a receipt as soon as the money is in"). That loses the restriction, which is the point of the warning. The next sentence ("Nie "hangend" …") makes the meaning clear again, so this is minor.
- Fix: "Stuur ’n kwitansie eers wanneer die geld in jou rekeningsaldo is."

### P2-2 nit (fixed): "vra" is softer than "tell us to stop"
- Document: `paperwork/templates/privacy-notice`, "Marketing"
- English: "You can tell us to stop at any time by replying STOP or emailing us."
- Afrikaans: "Jy kan ons enige tyd vra om op te hou deur STOP te antwoord of vir ons ’n e-pos te stuur."
- What is wrong: the customer tells the business to stop; `vra` (ask) makes it a request. This is customer-facing wording in a legal notice, so it should match.
- Fix: "Jy kan enige tyd vir ons sê om op te hou deur STOP te antwoord of vir ons ’n e-pos te stuur."

### P2-3 nit (fixed): heavy relative clause with a stray comma
- Document: `paperwork/templates/quotation`, intro (italic how-to line)
- English: "Never send the editable file to a customer."
- Afrikaans: "Moet nooit die lêer wat geredigeer kan word, vir ’n kliënt stuur nie."
- Fix: "Moet nooit die redigeerbare lêer vir ’n kliënt stuur nie."

### P2-4 nit (fixed): "Dit is die meeste klein besighede" is a calque
- Document: `paperwork/templates/invoice`, intro paragraph
- English: "That is most small businesses."
- Afrikaans: "Dit is die meeste klein besighede."
- What is wrong: it copies the English shape; in Afrikaans it reads as "this is (equals) most small businesses".
- Fix: "Dit geld vir die meeste klein besighede."

### N4 nit (not fixed): "eenvoudige Engels" on the Afrikaans start page
- Document: `start/start-here`, intro paragraph 2
- English: "Written in simple English for readers who do not speak English as a first language, and for people who have never run a business before."
- Afrikaans: "Geskryf in eenvoudige Engels vir lesers wat nie Engels as eerste taal praat nie, en vir mense wat nog nooit ’n besigheid bestuur het nie."
- What is wrong: nothing in the translation; on the Afrikaans page the line describes the English source, which can read oddly. See "The two open items".
- Fix: none. If the owner wants an Afrikaans-specific line, it is a content decision for the English source or a UI note, not a translation fix.

## Checked and accepted (no finding)

- Tax invoice item 1 and the non-VAT warning, `"Belastingfaktuur" ("Tax Invoice"), "BTW-faktuur" ("VAT Invoice") of "Faktuur" ("Invoice")`: I agree with pass 1. It follows the quoted-wording rule and keeps the English words a SARS auditor looks for. The orchestrator should still confirm the Afrikaans words against the gazetted Afrikaans text of section 20(4) before release, as pass 1 said.
- Pass 1 F15 (`gereedskapstel`) and F16 (`tuiswerk`): still open for the orchestrator, and the whole translation now uses them consistently (`Tuiswerk en veilige ontmoetings` in five places across batches 0, 3 and 5). Changing either is a TERMS decision that must move every batch together.
- `Businesses Act-lisensie` in the glossary: correct for the current English. `TERMS-af.json` still lists `Business Act licence` → `Business Act-lisensie` and should be updated by the orchestrator.
- `oorbetaal` in the dividends-tax entry ("wat die maatskappy terughou en oorbetaal"): the standard tax-Afrikaans verb for "pay over"; with "terughou" in front it cannot be read as "overpay".

## Outside batch 0 (for the orchestrator, not fixed here)

`paperwork/which-template-to-use-when` (batch 6) repeats two template sentences that pass 1 fixed in batch 0, but in the old wording:

- "Die meeste geskille gaan oor werk wat die kliënt aangeneem het by die prys ingesluit is." (pass 1 F8: "… oor werk waarvan die kliënt aangeneem het dat dit by die prys ingesluit is.")
- In the privacy-notice preview: "Besonderhede van wat jy gekoop het of oor navraag gedoen het" (pass 1 F12: "… of waaroor jy navraag gedoen het").

The batch 6 reviewer should align these with the batch 0 templates. I did not edit that file.
