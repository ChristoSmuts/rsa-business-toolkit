# 0006: AI disclosure on every page and an accuracy review against official sources

- Status: accepted
- Date: 2026-09-15

## Context

The toolkit was written by an AI assistant and checked by an AI against sources. Build reviews found real errors in the English source. They included a wrong definition of FSP, the wrong name for the Businesses Act, and a sole-proprietor line that could be read as "no tax registration needed". About a third of the source register entries are official sources. Much of the content is tax, company and licensing guidance, where a wrong number or deadline can cost a reader money.

A polished web app makes content look more authoritative than a folder of markdown files. The owner decided that readers must always see that the content is AI-generated, see the sources for each page, and that facts must be checked against official sources before release.

## Decision

1. **Correct errors at the source.** Content found to be wrong is corrected in the English markdown, the source of truth, with a commit that cites the evidence. Generated JSON and translations are regenerated from it, never patched by hand.
2. **Show an AI notice on every page.** Each content page shows a short notice near the top that names who checked it: written by AI, an AI checked it against the listed sources on a date, no person has checked it yet, rules change, check the official source, not advice. Once a named human expert has reviewed the page, that reviewer's name replaces the AI-checked sentence. The verification status and its one-sentence explanation sit directly next to the notice, in words rather than colour alone. On Afrikaans pages the notice says the English text was checked, and the machine-translation notice sits directly under it. The exact wording is in build plan D5. (Revised 2026-09-15 after WP-12b review pass 1.)
3. **List sources on every page.** The content pipeline maps source register entries and Acts to each document. Each page renders them in a "Sources for this page" section. The build fails if a guide, template, checklist or business-type page has no mapped sources and no explicit note.
4. **Run an accuracy review phase before release.** An inventory of every fact is generated from the content. Reviewers check each fact against an official source and record a status, the URL, the supporting quote and the date. Incorrect or outdated facts are fixed at the source. Facts that cannot be verified are flagged on the page.
5. **Reserve "human verified" for a named human expert.** AI review raises confidence but is not human verification. A human expert review is recommended before public launch for the core tax, company and vehicle-dealer documents.

## Consequences

- Every page is more honest about its origin and limits.
- The content pipeline gains a per-document source map and a fact inventory, both maintained with tests.
- Release depends on the accuracy review finishing, which adds time and work.
- Afrikaans translations of corrected documents must be refreshed. The fidelity check detects stale blocks automatically.
