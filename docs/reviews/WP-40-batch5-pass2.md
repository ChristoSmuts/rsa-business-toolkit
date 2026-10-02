# WP-40 batch 5: af review, pass 2

- Date: 2 October 2026
- Commit reviewed: `b303d65` (local tip of `claude/lucid-bell-t5acdn`, which includes the pass 1 fixes and the orchestrator's term settlement `a0d3464`)
- Fixes commit: `5cc21f7` (`fix(af): apply batch 5 review pass 2 fixes`), on top of `b303d65`
- Reviewer role: af-reviewer (WP-42), second and independent reviewer
- Documents: `business-types/vehicle-dealer`, `food`, `beauty`, `retail-online`, `services-trades`, `professional-creative` (not the hub)
- **Verdict: clean.** No blocker and no major findings. 3 minor and 9 nit findings; all 3 minors and 7 nits are fixed in this pass.

| Severity | Found | Fixed |
| --- | --- | --- |
| blocker | 0 | 0 |
| major | 0 | 0 |
| minor | 3 | 3 |
| nit | 9 | 7 |

Pass 1 was not clean, so this is the first of the two consecutive clean passes the batch needs. Under the 17 September amendment in `docs/reviews/README.md`, fixing minors and nits in a clean pass does not restart the count. The next pass verifies these fixes.

## Fidelity check

Before the fixes, at `b303d65`:

```
$ pnpm content:fidelity --lang af
$ tsx scripts/build-content.ts --fidelity-only --lang af
Checking af markdown in .../docs/rsa-business-toolkit-af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

After the fixes, each document on its own (`--doc business-types/<id>`) and then all of them:

```
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (vehicle-dealer)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (food)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (beauty)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (retail-online)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (services-trades)
Fidelity af: 1 docs faithful, 0 findings, 0 docs not translated yet.   (professional-creative)

$ pnpm content:fidelity --lang af
Fidelity af: 36 docs faithful, 0 findings, 0 docs not translated yet.
```

I did not regenerate `src/data`. The committed `src/data/af` for the vehicle-dealer, beauty and services-trades documents is now behind the markdown, so the orchestrator must run `pnpm content:build --lang af` when merging.

## How I reviewed

I read every document afresh, not only the pass 1 fixes. Each Afrikaans file has the same line count as its English source, so I read the two interleaved line by line and compared each sentence. I checked:

- meaning: anything added, lost, or made more or less certain, with every fact, figure, rand amount, deadline, licence rule and obligation;
- job and trade names (where pass 1's major was): the services-trades list (loodgieters, elektrisiëns, bouers, verwers, werktuigkundiges, tuiniers, skoonmakers, nutsmanne, koeriers, installeerders), the professional-creative list, the regulated professions, the beauty services and the Second-Hand Goods Act dealer categories;
- modal verbs (`mag`, `moet`, `kan`, `kan dalk`, `hoef nie`, `behoort`);
- terms against `TERMS-af.json` (including the settled IE, veltoets, kosvragmotor and vervaldatum), the glossary, the hub and the rest of the corpus;
- register (`jy`), AWS spelling and anglicisms.

Every fact matches English, including: SAPS 601 (free) and SAPS 604; the 30-day notice; five-year record keeping; the R100 second-hand threshold; the R102, R762 and R168 trade-number fees; CPA s56 (six months, one repair, three-month repeat), s2(10), s56(2), s56(4) and s5; the R30,000 Small Claims Court limit (Gazette 55038, Notice 7717, 20 July and 1 August 2026) and the R20,000 it replaced; R200,000 and R400,000 court limits; the R175,000 refund ruling; 15/115 notional input tax and the R115,000, R15,000, R120,000, R20,000, R3,000 and R15,650 example; the R2.3 million threshold and 21 business days; R600,000 turnover-tax band at 1% (R1,550 on R155,000); s22 trading stock; the 60-day roadworthy and 21-day RLV rules; COA, R638, R146 and the 14-day grace period; ECTA s43(2), s43(3), s44, s42(2) and s46 (14, seven and 30 days); the 20% professional-services exclusion; 3,500 kg; 500 KB; 40 reviews against 4,000 followers.

The link text "Voertuie vir jou besigheid" translates the English link text "Vehicles for your business", as settled for the corpus. I did not change it.

## Findings

### F1 minor (fixed): "Plektoets" still in the beauty words table
- Document: `business-types/beauty`, "Words used in this file", row "Patch test"
- English: "| Patch test | A small skin test before a chemical treatment. Record it. |"
- Afrikaans: "| Plektoets (patch test) | ’n Klein toets op die vel …"
- What is wrong: pass 1 (F9) changed the two body uses to `veltoets` but missed the words-table headword. `plektoets` is not an Afrikaans word, `TERMS-af.json` now fixes `veltoets`, and the same document and the master checklist use `veltoets`. A reader meets one word in the table and another in the text.
- Fix: "| Veltoets (patch test) | …"

### F2 minor (fixed): "Vehicle signage" became "Tekens op jou voertuig"
- Document: `business-types/services-trades`, "Vehicles" paragraph 3 and "Branding and marketing notes" item 5
- English: "Vehicle signage is usually the cheapest advertising …" / "5. Vehicle signage"
- Afrikaans: "Tekens op jou voertuig is gewoonlik …" / "5. Tekens op jou voertuig"
- What is wrong: `tekens` means signs in the sense of symbols or indications, so it does not say lettering or branding on the vehicle. The branding documents (`03-brand-applications-and-polish`) translate the same English "Vehicle signage" as `Voertuigbelettering`.
- Fix: "Voertuigbelettering is gewoonlik …" / "5. Voertuigbelettering"

### F3 minor (fixed): "signage" became "tekens" in the beauty document
- Document: `business-types/beauty`, "Working from home", paragraph 2
- English: "with limits on client numbers, parking and signage"
- Afrikaans: "met beperkings op die getal kliënte, parkering en tekens"
- What is wrong: the same problem as F2. The rest of the corpus uses `uithangbord(e)` for signage on premises.
- Fix: "… parkering en uithangborde"

### F4 nit (fixed): "kleptoppakking" is not the usual word
- Document: `business-types/vehicle-dealer`, "The one defence that works", defect schedule example
- English: "4. Oil weep at the rocker cover gasket."
- Afrikaans: "4. Olie syfer by die kleptoppakking uit."
- Fix: "klepdekselpakking" (rocker cover = `klepdeksel`).

### F5 nit (fixed): "ernstige onderneming" reads as "serious enterprise"
- Document: `business-types/vehicle-dealer`, "If you extend credit yourself", paragraph 3
- English: "Registering as a credit provider is a serious undertaking with ongoing reporting duties."
- Afrikaans: "… is ’n ernstige onderneming met deurlopende verslagdoeningspligte."
- What is wrong: in this corpus `onderneming` means an enterprise or business (TERMS: `tuisonderneming`, the VAT "enterprise"). The English means a commitment.
- Fix: "… is ’n ernstige verbintenis met …"

### F6 nit (fixed): "letter of authority" without the English on first use
- Document: `business-types/vehicle-dealer`, "Imported vehicles", paragraph 1
- English: "a letter of authority from the SABS"
- Afrikaans: "’n magtigingsbrief van die SABS"
- What is wrong: `TERMS-af.json` asks for the English in brackets on first use. This is the first use in the document.
- Fix: "’n magtigingsbrief (letter of authority) van die SABS"

### F7 nit (fixed): "servicing" became "diens"
- Document: `business-types/vehicle-dealer`, "Growing beyond vehicles", paragraph 1
- English: "tyres, servicing, parts, detailing"
- Afrikaans: "bande, diens, onderdele, motorversorging (detailing)"
- What is wrong: `diens` on its own is "service" in general. Vehicle servicing is `diensbeurte`.
- Fix: "bande, diensbeurte, onderdele, …"

### F8 nit (fixed): "die meeste onderverseker" reads as "most underinsured"
- Document: `business-types/vehicle-dealer`, "Insurance", paragraph 1
- English: "This is where small dealers are most often underinsured."
- Afrikaans: "Dit is waar klein handelaars die meeste onderverseker is."
- Fix: "… die dikwelste onderverseker is." (frequency, as in English).

### F9 nit (fixed): "die vel breek" and the people-for-services list
- Document: `business-types/beauty`, intro and "Tattoo and piercing studios"
- English: "This covers hairdressing, barbering, nails, …" / "because they break the skin"
- Afrikaans: "Dit dek haarkappers, barbiers, naels, …" / "omdat hulle die vel breek"
- What is wrong: the English lists services; the Afrikaans starts with people and then switches to services. "Die vel breek" is a calque; Afrikaans says the needle pierces the skin.
- Fix: "Dit dek haarkappery, barbierswerk, naels, …" / "omdat hulle die vel deurboor"

### F10 nit (not fixed): "kan hy" for the National Commissioner
- Document: `business-types/vehicle-dealer`, "How to register", paragraph 6
- English: "the National Commissioner may issue …"
- Afrikaans: "Nadat die Nasionale Kommissaris die aansoek oorweeg het, kan hy …"
- What is wrong: English is neutral; `hy` assumes a man. The corpus uses generic `hy` throughout (for a buyer, a consumer), so I left it for consistency.

### F11 nit (not fixed): "uitstelperiode" for "grace period"
- Document: `business-types/food`, "Everything else you may need", paragraph 4
- English: "you can apply for a 14-day grace period"
- Afrikaans: "’n uitstelperiode van 14 dae"
- What is wrong: `grasietydperk` is the more usual legal word. `uitstelperiode` is understood and the 14 days are right, so I left it.

### F12 nit (not fixed, recorded only): pass 1 nits still open
- Pass 1 F20 ("Hooggeregshof"), F21 ("op lêer hou"), F22 ("’n klein kleinhandelaar") and F23 ("eerste installasie" for "first fix") are still as pass 1 left them. I agree with pass 1's reasons and add nothing new.

## Checks on pass 1's fixes

All pass 1 fixes are in place except the words-table headword in F9 (see F1 above): "nutsmanne" (F1), the photo-age clause (F2), "Wanneer jy ’n voertuig verkoop" (F3), "kennisgewing" (F4), "hoe lank vooraf hulle jou laat weet het" (F5), "is in jou saldo (reflected)" (F6), "waarsonder" (F7), "gelande" (F8), "IE (IP)" and "IE" (F10), "opslag" (F13), the Small Claims Court sentence (F14), "gedeelte" (F15), "waarop" and "wanneer" (F16), "bedryfsorganisasie" (F17), "voorraad wat jy het" (F18) and the relative clause (F19). F11 was reverted by the orchestrator, as settled for the corpus.
