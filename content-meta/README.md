# content-meta

Hand-kept data that sits next to the markdown in `docs/` and is read by the build. This file
documents the two search files: `search-keywords.json` and `search-best-bets.json`.

## `search-keywords.json`: page keywords

Owner words that a page's own titles lack, per language (review WP-33 pass 14). They are indexed
with the page's first entry, in its heading field, so the ranking finds the page however the owner
phrases the rest: "Register: what you actually need" also holds `register business` and `start
business`, Tax and SARS also holds `tax return` and `income tax`.

```json
{
  "pages": [{ "doc": "core/register", "en": ["register business"], "af": ["registreer besigheid"] }]
}
```

- Few, and only where the guide's own titles lack the owner's word. At most six per page and
  language.
- A separate file from the best bets, because the two do different jobs: a keyword is ranking input
  that helps every query that uses the word, a best bet pins one phrasing to one target.
- `pnpm search:build` fails when a page is not in the manifest or is listed twice.
- `besigheidsnaam` / `business name` on "Already have your name" (pass 15) and `car dealer` /
  `motorhandelaar` on Vehicle dealer are examples: the owner's word, not the guide's.

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

**When it matches.** Every word of the phrase must be a word of the query, in any order, and
every other word of the query must be a filler word (`filler`, per language: `my`, `own`, `new`,
`small`, `need`, `want`, `must`; `eie`, `nuwe`, `klein`, `nodig`, `wil`, `kry`). So `register my own business`, `how do I
register my small business` and `registreer 'n nuwe besigheid` all match `register business` /
`registreer besigheid`, but `tax threshold` does not match `tax`: "threshold" is not filler. A
hyphenated word reads as its words, so `BTW-registrasie` is the phrase `btw registrasie`. While the
last word is still being typed, it may be the beginning of a phrase word, from four letters
(`register my busi`), unless it is already a whole word of the guide (`besig`), or it also begins
another word of the guide (`maatskap` begins "maatskappy" as well as `maatskappybelasting`). A typed
beginning yields to a query that names a page by its title. There is no typo matching here: a
misspelt phrase falls back to the ranking.

**Rules for adding a phrase.**

- Only a phrasing owners actually use, and only when the guide has one obvious page for it. A
  phrase the guide uses for more than one thing points at the entry that tells them apart:
  `annual return` opens the glossary entry ("A yearly filing with CIPC … Not a tax return"), not
  the CIPC duty, because the guide also calls the ITR12 and ITR14 "annual returns".
- Keep the filler list to words that never say which page is meant. Since review WP-33 pass 15 the
  ranking drops them too (`docs/design-system.md`, "Filler words, whole words and questions"), so a
  filler word changes every search, not only the best bets.
- Under about 60 phrases per language. The build fails over 60 (`MAX_BEST_BETS`; it was 40 until
  pass 15, when the acceptance set brought closing, bank account, VAT and tax number phrasings).
- Prefer fixing the ranking. A best bet is for the few phrasings that matter most and that ranking
  gets wrong.

**Checks.**

- `pnpm search:build` (part of `pnpm build`) resolves every target in every language and fails
  when a page or heading is missing, so renaming one fails the build until this file is updated
  (`scripts/search/best-bets.ts`).
- `tests/unit/search/index.test.ts` turns every phrase into a test row: each one, finished and
  typed, opens its target first, in both languages. `tests/unit/search/best-bets.test.ts` checks the
  validation and the matching.
- The acceptance set (`tests/search/acceptance-queries.json`, `docs/testing.md`) is where a missed
  owner phrasing goes first, as a row. Add a best bet or a keyword only when a row fails and the
  ranking cannot be fixed in general.
