import type { InlineRun, PlaceholderRun, PlaceholderStyle } from '../../src/lib/content/schema';

export type BracketToken =
  { type: 'text'; v: string } | { type: 'placeholder'; v: string; nested: boolean };

/**
 * Depth-aware `[SQUARE BRACKET]` scanner. `[If a company: … [REGISTERED NAME] … [NUMBER]]` is one
 * placeholder with `nested: true`. Brackets never span a line; unbalanced or empty brackets stay text.
 */
export function scanBrackets(text: string): BracketToken[] {
  const tokens: BracketToken[] = [];
  let buffer = '';
  let depth = 0;
  let start = -1;
  let nested = false;

  const pushText = (value: string): void => {
    buffer += value;
  };
  const flushText = (): void => {
    if (buffer !== '') tokens.push({ type: 'text', v: buffer });
    buffer = '';
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (ch === '\n') {
      if (depth > 0) pushText(text.slice(start, i));
      depth = 0;
      start = -1;
      pushText(ch);
      continue;
    }
    if (depth === 0) {
      if (ch === '[') {
        depth = 1;
        start = i;
        nested = false;
      } else {
        pushText(ch);
      }
      continue;
    }
    if (ch === '[') {
      depth += 1;
      nested = true;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        const inner = text.slice(start + 1, i);
        if (inner.trim() === '') {
          pushText(text.slice(start, i + 1));
        } else {
          flushText();
          tokens.push({ type: 'placeholder', v: inner, nested });
        }
        start = -1;
      }
    }
  }
  if (depth > 0) pushText(text.slice(start));
  flushText();
  return tokens;
}

export interface PlaceholderMarkers {
  /** Bracketed text that is prose, not a field: `[SQUARE BRACKETS]`. Upper case. */
  placeholderLiterals: readonly string[];
  /** Upper-case placeholder text → profile field key, e.g. `YOUR BUSINESS NAME` → `businessName`. */
  placeholderIdentity: Readonly<Record<string, string>>;
}

function normalise(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function isLiteralBracket(value: string, markers: PlaceholderMarkers): boolean {
  return markers.placeholderLiterals.includes(normalise(value).toUpperCase());
}

/**
 * Five styles: `identity` (a profile field such as the business name), `format` (`[DD Month YYYY]`,
 * `[X]`), `field` (a slot to fill), `choice` (`[EFT / Cash / Card]`), `instruction`
 * (`[Be specific]`, and every nested placeholder).
 */
export function classifyPlaceholder(
  value: string,
  nested: boolean,
  markers: PlaceholderMarkers,
): { style: PlaceholderStyle; key?: string } {
  const text = normalise(value);
  if (nested) return { style: 'instruction' };
  const key = markers.placeholderIdentity[text.toUpperCase()];
  if (key) return { style: 'identity', key };
  if (/^X$/.test(text) || /\b(?:DD|MM|YYYY)\b/.test(text)) return { style: 'format' };
  if (!/\p{Ll}/u.test(text)) return { style: 'field' };
  if (/\s\/\s/.test(text)) return { style: 'choice' };
  if (
    /[.:]$/.test(text) ||
    text.includes(',') ||
    text.split(' ').length >= 4 ||
    /^(?:Add|Be|Delete|Describe|Exactly|If|List|Optional|Paste|Say|State)\b/.test(text)
  ) {
    return { style: 'instruction' };
  }
  return { style: 'field' };
}

/** `upper` when the placeholder has no lower-case letters. Compared per position by the fidelity check. */
export function placeholderCase(value: string): 'upper' | 'mixed' {
  return /\p{Ll}/u.test(value) ? 'mixed' : 'upper';
}

function makePlaceholder(
  value: string,
  nested: boolean,
  markers: PlaceholderMarkers,
): PlaceholderRun {
  const { style, key } = classifyPlaceholder(value, nested, markers);
  const run: PlaceholderRun = { t: 'placeholder', v: value, style };
  if (nested) run.nested = true;
  if (key) run.key = key;
  return run;
}

/** Converts bracketed text inside text/strong/em runs into placeholder runs. */
export function applyPlaceholders(
  runs: readonly InlineRun[],
  markers: PlaceholderMarkers,
): InlineRun[] {
  const out: InlineRun[] = [];
  for (const run of runs) {
    if (run.t === 'text') {
      for (const token of scanBrackets(run.v)) {
        if (token.type === 'text') out.push({ t: 'text', v: token.v });
        else if (isLiteralBracket(token.v, markers)) out.push({ t: 'text', v: `[${token.v}]` });
        else out.push(makePlaceholder(token.v, token.nested, markers));
      }
    } else if (run.t === 'strong' || run.t === 'em') {
      out.push({ t: run.t, c: applyPlaceholders(run.c, markers) });
    } else {
      out.push(run);
    }
  }
  return out;
}

/** Placeholders inside a fenced prompt or template preview, in order. */
export function extractFencePlaceholders(
  text: string,
  markers: PlaceholderMarkers,
): PlaceholderRun[] {
  return scanBrackets(text)
    .filter(
      (token): token is Extract<BracketToken, { type: 'placeholder' }> =>
        token.type === 'placeholder',
    )
    .filter((token) => !isLiteralBracket(token.v, markers))
    .map((token) => makePlaceholder(token.v, token.nested, markers));
}

/** 10 or more underscores become a signature line. */
export function applySiglines(runs: readonly InlineRun[]): InlineRun[] {
  const out: InlineRun[] = [];
  for (const run of runs) {
    if (run.t === 'text' && /_{10,}/.test(run.v)) {
      run.v.split(/(_{10,})/).forEach((part) => {
        if (/^_{10,}$/.test(part)) out.push({ t: 'sigline' });
        else if (part !== '') out.push({ t: 'text', v: part });
      });
    } else if (run.t === 'strong' || run.t === 'em') {
      out.push({ t: run.t, c: applySiglines(run.c) });
    } else {
      out.push(run);
    }
  }
  return out;
}
