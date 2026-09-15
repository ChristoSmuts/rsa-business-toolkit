# 0004: Machine-translated Afrikaans with an automated fidelity gate

- Status: accepted
- Date: 2026-09-15

## Context

The owner asked for all toolkit content in Afrikaans in the first release, translated by AI agents. The content covers tax, company law and licensing. A wrong number, form code or link in a translation could cost a reader money.

## Decision

- Afrikaans source lives in `docs/rsa-business-toolkit-af/` as markdown with the same paths as the English source. The same parser generates JSON for both languages.
- Heading ids and block ids come from the English structure and are shared by every language.
- A fidelity check fails the build when an Afrikaans document differs from English in structure, numbers, rand amounts, percentages, dates, form codes, links, placeholders or untranslated code blocks. Numbers stay byte-identical to English, for example `R2.3 miljoen`.
- Every Afrikaans document is marked `machine-unreviewed` and every Afrikaans content page shows a notice with a link to the English version. A human reviewer can change the status to `reviewed` per document.

## Consequences

- The check catches factual drift, but not meaning or tone. A bilingual reviewer agent reads each document, and a human review is still recommended before relying on the Afrikaans text.
- When English content changes, the matching Afrikaans blocks become stale and the build fails until they are updated or the build is run with an explicit stale flag.
