import type { TranslationTerms } from './config';
import { EN_FACT_MARKERS, extractFacts, normaliseApostrophes } from './facts';

interface CompiledTerm {
  term: string;
  re: RegExp;
}

const cache = new WeakMap<readonly string[], CompiledTerm[]>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compile(terms: readonly string[]): CompiledTerm[] {
  const cached = cache.get(terms);
  if (cached) return cached;
  const compiled = [...new Set(terms)].map((term) => {
    let pattern = term.trim().split(/\s+/).map(escapeRegExp).join('\\s+');
    const first = term.trim().charAt(0);
    // `eFiling` and `voetstoots` may start a sentence; `SARS` never changes case.
    if (first !== first.toUpperCase())
      pattern = `[${first}${first.toUpperCase()}]${pattern.slice(1)}`;
    return { term, re: new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'gu') };
  });
  cache.set(terms, compiled);
  return compiled;
}

/** How often each protected term occurs in the text, counted as a whole word. */
export function countProtectedTerms(text: string, terms: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const normalised = normaliseApostrophes(text);
  for (const { term, re } of compile(terms)) {
    const count = [...normalised.matchAll(re)].length;
    if (count > 0) counts.set(term, count);
  }
  return counts;
}

/**
 * The terms a translation must keep character for character: `keepVerbatim` (Act names, SARS, CIPC,
 * eFiling …), the English of official names flagged `keepVerbatim` in `terms` (Information Regulator …),
 * and the `formCodes` that the form-code fact rule does not already check (QUO-0001 …).
 */
export function protectedTerms(terms: TranslationTerms | undefined): string[] {
  if (!terms) return [];
  const officialNames = terms.terms.filter((term) => term.keepVerbatim).map((term) => term.en);
  const extraCodes = terms.formCodes.filter(
    (code) => extractFacts(code, EN_FACT_MARKERS).codes.length === 0,
  );
  return [...new Set([...terms.keepVerbatim, ...officialNames, ...extraCodes])];
}
