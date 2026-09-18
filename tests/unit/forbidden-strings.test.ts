/**
 * Forbidden strings in hand-written source (plan A/C6, D5).
 *
 * The content pipeline's own forbidden-string check scans the generated JSON under
 * `src/data/**`, which is the right place for text that comes from the markdown. It cannot see
 * a number that a person typed into a page, a layout or a component — and review pass 4 found
 * exactly that: the D5 demo on `/design-system/` stated the superseded R1 million VAT threshold
 * and wore an "AI-checked" badge while doing it. The toolkit's own content warns readers about
 * that number ("If a website tells you the VAT threshold is R1 million, that site is out of
 * date", docs/rsa-business-toolkit/README.md), so shipping it on the page every page package is
 * told to copy is worse than shipping it anywhere else.
 *
 * Add a pattern here whenever a fact goes stale. Keep each one narrow: it must match the wrong
 * claim, and a demo never needs to restate a superseded number to talk about it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SCANNED = ['src/pages', 'src/layouts', 'src/components'];
const EXTENSIONS = ['.astro', '.ts', '.js', '.md', '.json', '.css'];

interface Rule {
  /** What is wrong, in the failure message. */
  readonly what: string;
  /** The correct fact and where it comes from. */
  readonly instead: string;
  readonly pattern: RegExp;
}

/*
 * Rand amounts are written with a no-break space on these pages (`R 1 000 000`), so every
 * amount pattern accepts any spacing, including none. `NEAR` keeps the claim and its number in
 * one sentence but allows a newline and any markup between them, because that is how the copy
 * is actually written: `for VAT once your turnover passes\n<strong>R 1 000 000</strong>`.
 * Markup is removed before matching (see `stripMarkup`) rather than skipped over in the
 * pattern \u2014 a pattern that refuses to cross `<` or `>` silently misses the wrapped case, which
 * is how the R1 million demo would have slipped through this test as well.
 */
const GAP = String.raw`[\s\u00a0,.]?`;
const RAND_1M = String.raw`R\s*1${GAP}000${GAP}000|R\s*1\s*million`;
const RAND_50K = String.raw`R\s*50${GAP}000|R\s*50\s*thousand`;
const NEAR = String.raw`[^.]{0,120}?`;

const RULES: readonly Rule[] = [
  {
    what: 'the superseded R1 million compulsory VAT registration threshold',
    instead:
      'R2.3 million from 1 April 2026 — see docs/rsa-business-toolkit/05 Look it up/03-sources-and-verification-register.md',
    pattern: new RegExp(`(?:VAT${NEAR}(?:${RAND_1M})|(?:${RAND_1M})${NEAR}VAT)`, 'gi'),
  },
  {
    what: 'the superseded R50 000 voluntary VAT registration threshold',
    instead: 'R120 000 from 1 April 2026 — same register',
    pattern: new RegExp(
      `(?:voluntar\\w*${NEAR}(?:${RAND_50K})|(?:${RAND_50K})${NEAR}voluntar\\w*)`,
      'gi',
    ),
  },
  {
    what: 'an unfinished marker',
    instead: 'finished copy',
    pattern: /\bTODO\b|\bTBC\b|\{\{/g,
  },
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) yield full;
  }
}

function files(): string[] {
  const out: string[] = [];
  for (const base of SCANNED) {
    let stats;
    try {
      stats = statSync(join(ROOT, base));
    } catch {
      continue; // A folder another package owns and has not added yet.
    }
    if (stats.isDirectory()) out.push(...walk(join(ROOT, base)));
  }
  return out;
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

/**
 * Drop every tag — do not replace it with a space — so a claim reads the way a reader sees it
 * however it is marked up, and keep an index back into the original text so a hit can still
 * name its line. Newlines inside a tag are kept, only so the line numbers stay right.
 *
 * Dropping is deliberate: inline markup creates no word boundary, so
 * `R 1<strong>&nbsp;000</strong>` renders as one amount and must match as one. Pushing a space
 * instead would invent a separator the reader never sees, and would break the patterns below
 * wherever the copy already has one: `R 1 000 <em>000</em>` would become `R 1 000  000`, two
 * separators where `GAP` allows at most one.
 *
 * The cost, for the next rule added here: a tag boundary cannot be relied on as a word
 * boundary. A pattern built on `\b` or on a required separator will silently miss the claim
 * that markup splits, which is the failure mode this function exists to close. Write amounts
 * and phrases with the optional `GAP` idiom, and cover the split case in the mutation
 * self-test at the bottom of this file.
 */
function stripMarkup(text: string): { text: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  let inTag = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? '';
    if (char === '<') inTag = true;
    if (inTag) {
      if (char === '>') inTag = false;
      if (char === '\n') {
        out.push('\n');
        map.push(i);
      }
      continue;
    }
    out.push(char);
    map.push(i);
  }
  return { text: out.join(''), map };
}

/** Every hit of `rule` in the scanned files, as `path:line: matched text`. */
function hits(scanned: string[], rule: Rule): string[] {
  const found: string[] = [];
  for (const file of scanned) {
    const raw = readFileSync(file, 'utf8');
    const { text, map } = stripMarkup(raw);
    for (const match of text.matchAll(rule.pattern)) {
      const at = map[match.index ?? 0] ?? 0;
      found.push(
        `${relative(ROOT, file)}:${lineOf(raw, at)}: ${match[0].replace(/\s+/g, ' ').slice(0, 90)}`,
      );
    }
  }
  return found;
}

describe('forbidden strings in hand-written source', () => {
  const scanned = files();

  it('scans the pages, layouts and components that ship copy', () => {
    expect(scanned.length).toBeGreaterThan(0);
    expect(scanned.some((file) => file.endsWith(`pages${sep}design-system.astro`))).toBe(true);
  });

  for (const rule of RULES) {
    it(`never states ${rule.what}`, () => {
      expect(hits(scanned, rule), `Use ${rule.instead}.`).toEqual([]);
    });
  }

  it('catches the stale threshold when it is written back in (mutation self-test)', () => {
    const rule = RULES[0];
    if (!rule) throw new Error('no VAT rule');
    const wrong = 'You must register for VAT once your turnover passes R 1 000 000 in 12 months.';
    const right = 'You must register for VAT once your turnover passes R 2 300 000 in 12 months.';
    const matches = (text: string): boolean => new RegExp(rule.pattern.source, 'i').test(text);
    expect(matches(wrong)).toBe(true);
    // The claim as it was actually written: wrapped across lines, the amount inside markup, and
    // an attribute in between whose dots would otherwise end the sentence the pattern looks in.
    const asAuthored =
      '          You must register for VAT once your turnover passes\n' +
      '          <a href="https://www.sars.gov.za/">R 1 000 000</a> in any 12 months.\n';
    expect(matches(asAuthored)).toBe(false);
    expect(matches(stripMarkup(asAuthored).text)).toBe(true);
    // Markup that splits the amount itself. Dropping the tags rejoins it; pushing a space in
    // their place would leave two separators where the copy already has one, and `GAP` allows
    // at most one. See `stripMarkup`.
    const split = 'VAT applies once turnover passes R 1<strong> 000</strong> 000 a year.';
    expect(matches(stripMarkup(split).text)).toBe(true);
    // The pages write rand amounts with no-break spaces, so the pattern has to see through them.
    expect(matches('VAT registration starts at R 1 000 000 of turnover.')).toBe(true);
    expect(matches('If a site says the VAT threshold is R1 million, it is out of date.')).toBe(
      true,
    );
    expect(matches(right)).toBe(false);
  });
});
