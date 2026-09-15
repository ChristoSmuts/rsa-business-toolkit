# 0003: MiniSearch for client-side search

- Status: accepted
- Date: 2026-09-15

## Context

Search must work on GitHub Pages with no server, in English and Afrikaans now and in all eleven official languages later. Results must deep-link to a heading and be filterable by section, entity type and business type. Glossary terms, checklist items and common questions should appear as their own result types.

## Options considered

- **Pagefind.** Indexes built HTML, strong for plain page search. It offers stemming only for languages it supports and does prefix matching, not fuzzy matching. Typed results such as tasks and glossary entries would need workarounds.
- **MiniSearch.** Indexes structured JSON that we already generate. Supports prefix and fuzzy matching, field boosts and filters, and can be tested in Vitest without building the site.

## Decision

Use MiniSearch 7. Build one serialised index per language at build time from `src/data/<lang>/`, with a content hash in the filename. Load it only when the reader first opens search.

## Consequences

- None of the South African languages other than English has a stemmer in either tool. Prefix plus fuzzy matching is the practical approach for all of them.
- Each index has a size budget of 400 KB gzipped, enforced by a test. If a language exceeds it, the index is split by section.
- No WebAssembly is needed, so the CSP does not need `wasm-unsafe-eval`.
