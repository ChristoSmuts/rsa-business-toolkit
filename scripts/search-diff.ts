/**
 * `pnpm search:diff <ref>`: the search regression diff (review WP-33 pass 17). Runs a fixed query
 * corpus against the search code and search data of `<ref>` (exported with `git archive`) and of
 * the working tree, and lists every query whose first result changed, finished and typed, in both
 * languages.
 *
 * The corpus: every acceptance row (`tests/search/acceptance-queries.json`), every page title, H1
 * and section heading, every glossary term, and every query quoted (in backticks) in
 * `docs/reviews/WP-33-pass*.md`, each in both languages, and generated phrasings that use a law,
 * source or naming word in other senses ("<noun> law", "regulations for <noun>", "official
 * <noun>", "come up with a <noun>"; `PHRASINGS`) over the guide's main nouns (review WP-33 pass
 * 18: a word-list rule slipped past a corpus without them), and every phrase that has ever been a
 * best bet or a page keyword, read from the git history of their files (pass 19).
 *
 * Each change is classified when it can be: `better` or `worse` when the query is an acceptance
 * row (its target first or not) or a title (that entry first or not), `same-target` when both
 * results satisfy the row, and `?` otherwise, for a person to judge. Not a test: a tool for the
 * author and the reviewer.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

type Lang = 'en' | 'af';
interface HistoryFile {
  readonly bets?: readonly { readonly en?: readonly string[]; readonly af?: readonly string[] }[];
  readonly pages?: readonly { readonly en?: readonly string[]; readonly af?: readonly string[] }[];
}
interface Row {
  readonly lang: Lang;
  readonly query: string;
  readonly doc: string;
  readonly anchor?: string;
  readonly need: 'first' | 'top3';
}
interface First {
  readonly doc: string;
  readonly anchor: string | undefined;
  readonly title: string;
}
type Runner = (lang: Lang, query: string, typing: boolean) => First | undefined;

const ROOT = path.resolve(import.meta.dirname, '..');

/** The guide's main nouns, per language, for the generated phrasings. */
const NOUNS: Readonly<Record<Lang, readonly string[]>> = {
  en: [
    'tax',
    'vat',
    'business',
    'company',
    'food',
    'vehicle',
    'employment',
    'consumer',
    'health',
    'licence',
    'name',
    'invoice',
    'privacy',
    'bank',
    'home',
    'labour',
    'credit',
    'safety',
    'trading',
    'alcohol',
    'beauty',
    'online',
    'import',
    'uif',
    'sars',
    'cipc',
    'records',
    'signage',
    'logo',
    'brand',
  ],
  af: [
    'belasting',
    'btw',
    'besigheid',
    'maatskappy',
    'kos',
    'voertuig',
    'werk',
    'verbruiker',
    'gesondheid',
    'lisensie',
    'naam',
    'faktuur',
    'privaatheid',
    'bank',
    'huis',
    'krediet',
    'veiligheid',
    'handel',
    'alkohol',
    'skoonheid',
    'aanlyn',
    'invoer',
    'uif',
    'sars',
    'cipc',
    'rekords',
    'uithangbord',
    'logo',
    'handelsmerk',
  ],
};

/** Phrasings that put a law, source or naming word next to a noun, per language. */
const PHRASINGS: Readonly<Record<Lang, readonly ((noun: string) => string)[]>> = {
  en: [
    (n) => `${n} law`,
    (n) => `${n} act`,
    (n) => `${n} regulations`,
    (n) => `regulations for ${n}`,
    (n) => `official ${n}`,
    (n) => `come up with a ${n}`,
    (n) => `${n} source`,
    (n) => `what the law says about ${n}`,
  ],
  af: [
    (n) => `${n} wet`,
    (n) => `${n}wet`,
    (n) => `regulasies vir ${n}`,
    (n) => `amptelike ${n}`,
    (n) => `kom aan 'n ${n}`,
    (n) => `${n} bron`,
    (n) => `wat die wet oor ${n} sê`,
  ],
};
const LANGS: readonly Lang[] = ['en', 'af'];

async function runnerFor(root: string): Promise<Runner> {
  const entriesMod = (await import(path.join(root, 'scripts/search/entries.ts'))) as {
    buildEntries: (input: unknown) => { kind: string; title: string }[];
  };
  const buildMod = (await import(path.join(root, 'scripts/search/build.ts'))) as {
    serialiseIndex: (lang: Lang, s: string[], e: unknown, b?: unknown) => { json: string };
  };
  const betsMod = (await import(path.join(root, 'scripts/search/best-bets.ts'))) as {
    resolveBestBets: (lang: Lang, e: unknown) => unknown;
  };
  const loadMod = (await import(path.join(root, 'scripts/search/load.ts'))) as {
    loadIndexInput: (lang: Lang) => unknown;
  };
  const client = (await import(path.join(root, 'src/lib/search-client.ts'))) as {
    loadIndex: (json: unknown, lang: Lang) => unknown;
    runSearch: (
      index: unknown,
      query: string,
      lang: Lang,
      options: { limit: number; typing: boolean },
      base: string,
    ) => First[];
  };
  const indexes = new Map<Lang, unknown>();
  for (const lang of LANGS) {
    const entries = entriesMod.buildEntries(loadMod.loadIndexInput(lang));
    const { json } = buildMod.serialiseIndex(
      lang,
      [],
      entries,
      betsMod.resolveBestBets(lang, entries),
    );
    indexes.set(lang, client.loadIndex(JSON.parse(json), lang));
  }
  return (lang, query, typing) => {
    const hit = client.runSearch(indexes.get(lang), query, lang, { limit: 1, typing }, '/')[0];
    return hit === undefined ? undefined : { doc: hit.doc, anchor: hit.anchor, title: hit.title };
  };
}

/** The corpus, per language, with the acceptance rows and titles that classify a change. */
async function corpus(): Promise<{
  queries: Map<Lang, Set<string>>;
  rows: Map<string, Row>;
  titles: Map<string, Set<string>>;
}> {
  const queries = new Map<Lang, Set<string>>(LANGS.map((lang) => [lang, new Set<string>()]));
  const rows = new Map<string, Row>();
  const titles = new Map<string, Set<string>>();
  const file = JSON.parse(
    readFileSync(path.join(ROOT, 'tests/search/acceptance-queries.json'), 'utf8'),
  ) as { rows: Row[] };
  for (const row of file.rows) {
    queries.get(row.lang)?.add(row.query);
    rows.set(`${row.lang}\t${row.query}`, row);
  }
  const { buildEntries } = await import('./search/entries');
  const { loadIndexInput } = await import('./search/load');
  for (const lang of LANGS) {
    const input = loadIndexInput(lang);
    for (const doc of input.docs) queries.get(lang)?.add(doc.title);
    for (const entry of input.glossary?.data.entries ?? []) {
      queries.get(lang)?.add(entry.term.replace(/\s*\([^)]*\)/g, ''));
    }
    for (const entry of buildEntries(input)) {
      if (entry.kind !== 'section') continue;
      queries.get(lang)?.add(entry.title);
      const key = `${lang}\t${entry.title.toLowerCase()}`;
      const set = titles.get(key) ?? new Set<string>();
      set.add(`${entry.doc}#${entry.anchor ?? ''}`);
      titles.set(key, set);
    }
  }
  for (const lang of LANGS) {
    for (const noun of NOUNS[lang]) {
      for (const phrase of PHRASINGS[lang]) queries.get(lang)?.add(phrase(noun));
    }
  }
  // Every phrase that has ever been a best bet or a page keyword, from the files' git history, so
  // a removed bet shows up as a change (review WP-33 pass 19, major 1).
  for (const [file, lists] of [
    ['content-meta/search-best-bets.json', (json: HistoryFile) => json.bets ?? []],
    ['content-meta/search-keywords.json', (json: HistoryFile) => json.pages ?? []],
  ] as const) {
    const commits = execFileSync('git', ['log', '--format=%H', '--', file], { cwd: ROOT })
      .toString()
      .split('\n')
      .filter((line) => line !== '');
    for (const commit of commits) {
      const text = execFileSync('git', ['show', `${commit}:${file}`], { cwd: ROOT }).toString();
      for (const item of lists(JSON.parse(text) as HistoryFile)) {
        for (const lang of LANGS)
          for (const phrase of item[lang] ?? []) queries.get(lang)?.add(phrase);
      }
    }
  }
  const reviews = path.join(ROOT, 'docs/reviews');
  for (const name of readdirSync(reviews).filter((n) => /^WP-33-pass\d+\.md$/.test(n))) {
    const text = readFileSync(path.join(reviews, name), 'utf8');
    for (const [, quoted = ''] of text.matchAll(/`([^`\n]{2,60})`/g)) {
      if (!/^[\p{L}\p{N}' ’.%-]+$/u.test(quoted.replace(/ /g, ''))) continue;
      if (/\.(?:ts|md|json|log)$|^-|--/.test(quoted)) continue;
      for (const lang of LANGS) queries.get(lang)?.add(quoted);
    }
  }
  return { queries, rows, titles };
}

const place = (first: First | undefined): string =>
  first === undefined ? '(none)' : `${first.doc}${first.anchor ? `#${first.anchor}` : ''}`;

function satisfies(row: Row, first: First | undefined): boolean {
  return (
    first !== undefined &&
    first.doc === row.doc &&
    (row.anchor === undefined || first.anchor === row.anchor)
  );
}

async function main(): Promise<void> {
  const ref = process.argv[2];
  if (ref === undefined) throw new Error('usage: pnpm search:diff <git ref>');
  const tmp = mkdtempSync(path.join(tmpdir(), 'search-diff-'));
  try {
    const archive = execFileSync('git', ['archive', ref, 'src', 'scripts', 'content-meta'], {
      cwd: ROOT,
      maxBuffer: 1 << 30,
    });
    execFileSync('tar', ['-x', '-C', tmp], { input: archive });
    symlinkSync(path.join(ROOT, 'node_modules'), path.join(tmp, 'node_modules'));
    const before = await runnerFor(tmp);
    const after = await runnerFor(ROOT);
    const { queries, rows, titles } = await corpus();
    const counts: Record<string, number> = { better: 0, worse: 0, 'same-target': 0, '?': 0 };
    let total = 0;
    const lines: string[] = [];
    for (const lang of LANGS) {
      for (const query of queries.get(lang) ?? []) {
        for (const typing of [false, true]) {
          total++;
          const old = before(lang, query, typing);
          const now = after(lang, query, typing);
          if (place(old) === place(now)) continue;
          const row = rows.get(`${lang}\t${query}`);
          const titled = titles.get(`${lang}\t${query.toLowerCase()}`);
          let kind = '?';
          if (row !== undefined) {
            const was = satisfies(row, old);
            const is = satisfies(row, now);
            kind = was === is ? (is ? 'same-target' : '?') : is ? 'better' : 'worse';
          } else if (titled !== undefined) {
            const was = titled.has(`${old?.doc}#${old?.anchor ?? ''}`);
            const is = titled.has(`${now?.doc}#${now?.anchor ?? ''}`);
            if (was !== is) kind = is ? 'better' : 'worse';
          }
          counts[kind] = (counts[kind] ?? 0) + 1;
          lines.push(
            `${kind}\t${lang}\t${typing ? 'typed' : 'finished'}\t${query}\t${place(old)}\t->\t${place(now)}`,
          );
        }
      }
    }
    for (const line of lines.sort()) console.log(line);
    console.log(
      `search:diff ${ref}: ${String(total)} searches, ${String(lines.length)} changed first results: ${Object.entries(
        counts,
      )
        .map(([kind, count]) => `${String(count)} ${kind}`)
        .join(', ')}.`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

await main();
