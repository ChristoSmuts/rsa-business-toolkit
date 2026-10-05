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

## Implementation notes (WP-33, 2026-10-02)

- **Where the file name lives.** `pnpm search:build` (`scripts/build-search-index.ts`, run by `pnpm build` before `astro build`) writes `public/search/<lang>.<hash>.json` and records the names in the gitignored `src/generated/search-index.json`, which pages read at build time (`src/lib/search/files.ts`). The plan put the hash in `manifest.json`, but that file belongs to `content:build` and is drift-checked, so a later step cannot write to it.
- **Shared options.** A serialised MiniSearch index does not carry its functions, so the tokenizer, `processTerm`, prefix and fuzzy rules live in one module (`src/lib/search/options.ts`) that the build and the browser both import. The tokenizer keeps form codes whole (`VAT264`, `14.3`, `R120,000`) and adds a joined alias for a code written with a space (`SAPS 601` → `saps601`); `processTerm` folds case and diacritics and drops a short English and Afrikaans stop-word list.
- **Ranking.** BM25 `b` is 0.3 instead of MiniSearch's 0.7, and checklist items weigh 1 instead of A7's 1.5. With the defaults, one-line checklist items that only name `VAT264` pushed the section that explains the form out of the top three, which A7's own test forbids. A "Words used" term that the glossary also defines is left out, and a term opens the first section of its page that uses it. Two entries that open the same place are shown once.
- **Queries (review WP-33 pass 1).** The index-time alias alone made a spaced code stricter: `VAT 264` needed `vat`, `264` and `vat264` all at once. A query is now built as a MiniSearch query tree: letters followed by a number (any case) and hyphenated words become "both words, or the joined form". The index also joins hyphenated words (`e-filing` → `efiling`). The `OR` fallback leaves out lone numbers and single letters, and a query is cut to 12 words.
- **Queries (review WP-33 pass 2).** Searching "both words, or the joined form" added the scores of the two branches (the sources register outranked the section that explains `VAT264`) and fuzzy-matched the joined form (`page2` matched every "page"). Now each pair is resolved against the index first (`resolvePairs`): the joined form alone, exactly, when the index holds it; both words otherwise. A stop word before a number pairs only in capitals.
- **Size.** 165.3 KB gzip in English (945 entries) and 181.9 KB in Afrikaans (951 entries, all translated), well under the budget; no sharding.

