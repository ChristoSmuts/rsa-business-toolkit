/**
 * The search acceptance set (`tests/search/acceptance-queries.json`): owner queries, in both
 * languages, each with the page or section that must open first or be in the first three. Every
 * row runs twice, as a finished query (the search page, Enter) and as one still being typed (the
 * dialog). See `docs/testing.md` ("Search acceptance set") and ADR 0003.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { serialiseIndex } from '../../../scripts/search/build';
import { resolveBestBets } from '../../../scripts/search/best-bets';
import { buildEntries } from '../../../scripts/search/entries';
import { loadIndexInput } from '../../../scripts/search/load';
import type { Locale } from '../../../src/i18n/locales';
import {
  loadIndex,
  runSearch,
  type LoadedIndex,
  type SearchResult,
} from '../../../src/lib/search-client';
import type { SearchEntry } from '../../../src/lib/search/types';

const BASE = '/business-toolkit/';

/** One owner query and where it must lead. */
interface AcceptanceRow {
  readonly lang: Locale;
  readonly query: string;
  /** The page (`core/register`); with `anchor`, one section of it. */
  readonly doc: string;
  /** The section's English heading slug; left out, any entry on the page counts. */
  readonly anchor?: string;
  /** `first`: the first result; `top3`: one of the first three. */
  readonly need: 'first' | 'top3';
  /** Places that must never be the first result: `doc` (any entry on it) or `doc#anchor`. */
  readonly notFirst?: readonly string[];
  /** The review that raised the query, when one did. */
  readonly from?: string;
}

interface AcceptanceFile {
  readonly rows: readonly AcceptanceRow[];
}

const FILE = join(process.cwd(), 'tests', 'search', 'acceptance-queries.json');
const ROWS = (JSON.parse(readFileSync(FILE, 'utf8')) as AcceptanceFile).rows;

/** `true` when a result is the place `doc` or `doc#anchor` names (`anchor` absent: any entry). */
function isPlace(result: SearchResult, doc: string, anchor: string | undefined): boolean {
  return result.doc === doc && (anchor === undefined || result.anchor === anchor);
}

function place(spec: string): [string, string | undefined] {
  const [doc = '', anchor] = spec.split('#');
  return [doc, anchor];
}

function label(result: SearchResult | undefined): string {
  return result === undefined
    ? '(none)'
    : `${result.doc}${result.anchor ? `#${result.anchor}` : ''}`;
}

const built: Partial<Record<Locale, { index: LoadedIndex; entries: SearchEntry[] }>> = {};

beforeAll(() => {
  for (const lang of ['en', 'af'] as const) {
    const input = loadIndexInput(lang);
    const entries = buildEntries(input);
    const sections = input.manifest.sections.map((section) => section.id);
    const { json } = serialiseIndex(lang, sections, entries, resolveBestBets(lang, entries));
    built[lang] = { index: loadIndex(JSON.parse(json), lang), entries };
  }
});

function loaded(lang: Locale): { index: LoadedIndex; entries: SearchEntry[] } {
  const value = built[lang];
  if (value === undefined) throw new Error(`no index for ${lang}`);
  return value;
}

describe('search acceptance set: the file', () => {
  it('holds about 150 to 200 rows per language, each query once per language', () => {
    for (const lang of ['en', 'af'] as const) {
      const rows = ROWS.filter((row) => row.lang === lang);
      expect(rows.length).toBeGreaterThanOrEqual(150);
      expect(rows.length).toBeLessThanOrEqual(220);
      const queries = rows.map((row) => row.query.toLowerCase());
      expect(new Set(queries).size).toBe(queries.length);
    }
  });

  it('names only pages and sections that exist', () => {
    for (const row of ROWS) {
      const { entries } = loaded(row.lang);
      const specs = [row.anchor ? `${row.doc}#${row.anchor}` : row.doc, ...(row.notFirst ?? [])];
      for (const spec of specs) {
        const [doc, anchor] = place(spec);
        const exists = entries.some(
          (entry) => entry.doc === doc && (anchor === undefined || entry.anchor === anchor),
        );
        expect(exists, `${row.lang} "${row.query}": ${spec}`).toBe(true);
      }
    }
  });
});

describe.each(['en', 'af'] as const)('search acceptance set: %s', (lang) => {
  const rows = ROWS.filter((row) => row.lang === lang);
  describe.each([
    ['finished', false],
    ['typed', true],
  ] as const)('%s', (_name, typing) => {
    it.each(rows.map((row) => [row.query, row] as const))('"%s"', (_query, row) => {
      const results = runSearch(loaded(lang).index, row.query, lang, { limit: 3, typing }, BASE);
      const shown = results.map(label).join(' | ');
      const wanted = row.need === 'first' ? results.slice(0, 1) : results;
      const hit = wanted.some((result) => isPlace(result, row.doc, row.anchor));
      const target = row.anchor ? `${row.doc}#${row.anchor}` : row.doc;
      expect(hit, `${row.need} should be ${target}; got ${shown}`).toBe(true);
      for (const spec of row.notFirst ?? []) {
        const [doc, anchor] = place(spec);
        const first = results[0];
        expect(
          first !== undefined && isPlace(first, doc, anchor),
          `first must not be ${spec}; got ${shown}`,
        ).toBe(false);
      }
    });
  });
});
