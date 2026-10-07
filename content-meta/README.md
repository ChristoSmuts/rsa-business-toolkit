# content-meta

Hand-kept data that sits next to the markdown in `docs/` and is read by the build. This file
documents `search-best-bets.json`.

## `search-best-bets.json`: search best bets

Search ranks most queries well, but a few common owner phrasings need one obvious page that ranking
alone does not always put first (review WP-33 pass 13). `register my business`, for example, used
to open a vehicle dealer section, and `tax` opened the "Dividends tax" glossary entry. A best bet
pins the page for that phrasing.

```json
{
  "bets": [
    {
      "doc": "core/tax-and-sars",
      "anchor": "vat-probably-not-yet",
      "en": ["register for vat", "vat registration"],
      "af": ["registreer vir btw", "btw registrasie"]
    }
  ]
}
```

- `doc` is a document id from `src/data/manifest.json`. `anchor` is optional: a heading id of that
  page, or a glossary entry id when `doc` is `lookup/glossary`. Without it, the page's first entry
  opens.
- `en` and `af` list the phrases, as owners type them, in each language. Both are required: every
  target must exist in both languages.
- A phrase is read as a query is: lowercase, without accents, and without stop words. So
  `register a business`, `register my business` and `how do I register my business` are one
  phrase. Two phrases of a language that read the same are an error.

**When it matches.** The query's words must be the phrase's words, nothing more and nothing less:
`tax` is a best bet, `tax threshold` is not. While the last word is still being typed, it may be the
beginning of the phrase's last word, from four letters (`register my busi`), unless it is already a
whole word of the guide (`besigheid` does not begin `besigheidslisensie`). A typed beginning yields
to a query that names a page by its title. There is no typo matching here: a misspelt phrase falls
back to the ranking.

**Rules for adding a phrase.**

- Only a phrasing owners actually use, and only when the guide has one obvious page for it.
- Under about 40 phrases per language. The build fails over 40 (`MAX_BEST_BETS`).
- Prefer fixing the ranking. A best bet is for the few phrasings that matter most and that ranking
  gets wrong.

**Checks.**

- `pnpm search:build` (part of `pnpm build`) resolves every target in every language and fails
  when a page or heading is missing, so renaming one fails the build until this file is updated
  (`scripts/search/best-bets.ts`).
- `tests/unit/search/index.test.ts` turns every phrase into a test row: each one, finished and
  typed, opens its target first, in both languages. `tests/unit/search/best-bets.test.ts` checks the
  validation and the matching.
