# content-meta

Hand-kept data that sits next to the markdown in `docs/` and is read by the build. This file
documents the two search files: `search-keywords.json` and `search-best-bets.json`.

## `search-act-names.json`: Act names

The Acts of the sources register come from its own data (`src/data/<lang>/sources.json`, `acts`):
each is found by its name without number and year (`Companies Act`). This file adds the short
names, short forms and Afrikaans titles owners type (`popia act`, `food act`, `ohsa`, `nca`, `bee
act`; `maatskappywet`, `wet op verbruikersbeskerming`, `wet op beskerming van persoonlike
inligting`), per Act id. A generated test (`tests/unit/search/index.test.ts`) asks every name and
alias, finished and typed, and expects the Legislation entry first. English names hold in Afrikaans too, because the
Afrikaans register keeps the English Act names. A query that is exactly one of these names, its
words in order, optionally followed by `act`/`wet`, the Act's number and year, opens the register's "Legislation this toolkit relies
on" (`scripts/search/acts.ts`). `pnpm search:build` fails on a name for an Act the register does not
list, or on two Acts that share a name. A law word alone (`law`, `act`, `wet`) is never an Act name. An alias
must not be a word owners type for something else: bare `popia` stays an ordinary query, which
opens the glossary's POPIA entry (an acceptance row).

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
- `besigheidsnaam` / `business name` on "Already have your name" (pass 15), `car dealer` /
  `motorhandelaar` on Vehicle dealer, `photographer` / `fotograaf` on Professional and creative work
  and `hairdresser` / `haarkapper` on Beauty are examples: the owner's word, not the guide's.

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
`small`, `need`, `want`, `must`, `looking`, `find`, `show`, `send`, `give`; `eie`, `nuwe`, `klein`,
`nodig`, `wil`, `kry`, `hê`, `soek`, `asseblief`). A phrase word said twice counts once (`my own
name as business name` matches `business name`). A query that a quick answer asks word for word
(`what must my invoice show`) is answered by the quick answer, not by a best bet. So `register my own business`, `how do I
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
  filler word changes every search, not only the best bets. Since pass 19 the law words (`law`,
  `regulations`, `by-laws`, `wet`, `regulasies`, `verordeninge`, …) are filler, so `tax law` ranks as
  `tax`; an Act name is still read whole. `se` is not filler: it changed too many Afrikaans results.
- Every bet and every keyword page has phrases in both languages; the schema refuses one with
  either list missing or empty, so `pnpm build` fails. Give each phrasing its counterpart in the
  other language unless the guide lacks the page (pass 17: the Afrikaans naming phrasings).
- Under about 120 phrases per language. The build fails over 120 (`MAX_BEST_BETS`; it was 40 until
  pass 15, 60 until pass 16 and 80 until pass 19, as the acceptance set brought closing, bank
  account, VAT, naming, vehicle, records, law-word and Act phrasings). A phrase taken out of the
  bets becomes an acceptance row in both languages, and `pnpm search:diff` keeps every phrase that
  was ever a bet in its corpus. Phrase words are matched in any order, so `name business` and
  `business name` are one phrase: list it once.
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
